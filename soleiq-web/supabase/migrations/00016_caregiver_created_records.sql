-- Caregiver-created patient records, and the handover that makes them the
-- patient's own.
--
-- The shape of this migration follows one rule: ownership flips at the moment
-- of claim. Before it, a caregiver operates a record with no linked user.
-- After it, the patient owns the record and the caregiver is an ordinary
-- member of their care circle — revocable like any other.
--
-- Nothing here widens an RLS policy. A caregiver reaches an unclaimed record
-- through the grant created in create_caregiver_patient_record, which
-- has_care_circle_access() already honours, and through the existing
-- patients_care_circle_read / org_patients_care_circle_read policies. The
-- functions below are SECURITY DEFINER only where a caller legitimately has
-- to write a row that no policy could let them write — creating a grant for a
-- patient who has no owner yet, and flipping ownership during a claim — and
-- each one re-checks the caller's authority itself.

-- ---------- 1. A third way a grant can come about ---------------------------
-- 'caregiver_created' records that this grant exists because the caregiver
-- made the record, not because either party invited the other. It is what the
-- UI reads to say "created this record", and what the audit trail needs to
-- explain why a caregiver had access before the patient existed as a user.
alter table public.patient_access_grants
  drop constraint if exists patient_access_grants_direction_check;
alter table public.patient_access_grants
  add constraint patient_access_grants_direction_check
  check (direction in (
    'patient_invited',
    'caregiver_requested',
    'caregiver_created'
  ));

-- ---------- 2. Claim invitations --------------------------------------------
-- Separate from patient_access_grants on purpose. A care-circle grant answers
-- "who may look at this record"; a claim invitation answers "who owns it".
-- Overloading one row with both would make the ownership handover hard to
-- audit and easy to confuse with an access invite.
create table if not exists public.patient_claim_invitations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  organization_patient_id uuid references public.organization_patients(id) on delete set null,
  -- The address that must be signed in as to claim. Lower-cased on write so
  -- the comparison against auth.users never depends on how it was typed.
  invited_email text not null,
  -- sha256 of the single-use token; the token itself is emailed and never
  -- stored, so a database dump is not a set of working claim links. Nulled on
  -- claim and on cancellation, which is what makes both irreversible.
  token_hash text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  claimed_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  sent_count integer not null default 1
);

create unique index if not exists patient_claim_invitations_token_idx
  on public.patient_claim_invitations (token_hash)
  where token_hash is not null;

-- At most one invitation outstanding per record, so "resend" and "cancel" have
-- an unambiguous target and two live tokens can never exist at once.
create unique index if not exists patient_claim_invitations_one_open_idx
  on public.patient_claim_invitations (patient_id)
  where claimed_at is null and cancelled_at is null;

create index if not exists patient_claim_invitations_patient_idx
  on public.patient_claim_invitations (patient_id);

alter table public.patient_claim_invitations enable row level security;

-- Readable by the care circle (so the caregiver can see "invitation sent, not
-- yet claimed") and by the patient once they own the record. token_hash is a
-- column of this table, so the policy deliberately grants no write path --
-- every mutation goes through the functions below.
drop policy if exists claim_invites_read on public.patient_claim_invitations;
create policy claim_invites_read on public.patient_claim_invitations
  for select to authenticated
  using (
    public.has_care_circle_access(patient_id)
    or public.owns_patient(patient_id)
  );

-- ---------- 3. Create a record on someone's behalf --------------------------
-- SECURITY DEFINER because the grant this inserts cannot pass
-- patient_access_grants' INSERT policy: that policy requires
-- owns_patient(patient_id), and an unclaimed record has no owner to be. The
-- authority actually required -- an active membership of the organization the
-- record is enrolled into -- is checked here instead.
create or replace function public.create_caregiver_patient_record(
  p_organization_id uuid,
  p_full_name text,
  p_date_of_birth date,
  p_contact_email text,
  p_request_id text
)
returns table(patient_id uuid, organization_patient_id uuid, grant_id uuid)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  caller_email text;
  new_patient_id uuid;
  new_enrollment_id uuid;
  new_grant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if nullif(trim(p_full_name), '') is null then
    raise exception 'a name is required' using errcode = '22023';
  end if;

  -- Caregivers and admins of this organization, and nobody else.
  if not exists (
    select 1 from public.organization_memberships m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('doctor', 'admin')
  ) then
    raise exception 'active membership of this organization required'
      using errcode = '42501';
  end if;

  select lower(email) into caller_email from auth.users where id = auth.uid();
  if caller_email is null then
    raise exception 'caller has no email address' using errcode = '42501';
  end if;

  -- linked_user_id stays null: that single fact is what "unclaimed" means
  -- everywhere in the app, so there is one source of truth for it rather than
  -- a status column that could disagree.
  insert into public.patients (full_name, date_of_birth, status, demographics)
  values (
    trim(p_full_name),
    p_date_of_birth,
    'active',
    case
      when nullif(trim(p_contact_email), '') is null then '{}'::jsonb
      -- Kept so the invite step can offer it without the caregiver retyping
      -- it. Not an identity: the address that may claim the record is the one
      -- recorded on the invitation itself.
      else jsonb_build_object('claim_contact_email', lower(trim(p_contact_email)))
    end
  )
  returning id into new_patient_id;

  insert into public.organization_patients (
    organization_id, patient_id, enrollment_status
  ) values (
    p_organization_id, new_patient_id, 'active'
  )
  returning id into new_enrollment_id;

  -- The creating caregiver's own access. Active immediately -- there is nobody
  -- to approve it yet -- and an ordinary 'caregiver' grant, which is precisely
  -- why the patient can revoke it after claiming without any special case.
  insert into public.patient_access_grants (
    patient_id, granted_by, invitee_email, invitee_user_id,
    role, status, direction
  ) values (
    new_patient_id, auth.uid(), caller_email, auth.uid(),
    'caregiver', 'active', 'caregiver_created'
  )
  returning id into new_grant_id;

  perform public.write_audit_event(
    p_organization_id, 'patient.record_created_by_caregiver',
    'patient', new_patient_id, new_patient_id,
    'healthcare_operations', p_request_id,
    jsonb_build_object('enrollment_id', new_enrollment_id, 'unclaimed', true)
  );

  return query select new_patient_id, new_enrollment_id, new_grant_id;
end;
$$;

-- ---------- 4. Invite the patient to take control ---------------------------
create or replace function public.invite_patient_to_claim(
  p_patient_id uuid,
  p_email text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_request_id text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  target public.patients%rowtype;
  org_patient record;
  new_invite_id uuid;
  normalized_email text := lower(trim(p_email));
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if normalized_email is null or normalized_email = '' then
    raise exception 'an email address is required' using errcode = '22023';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid token hash' using errcode = '22023';
  end if;

  select * into target from public.patients where id = p_patient_id for update;
  if target.id is null then
    raise exception 'record not found' using errcode = '22023';
  end if;
  -- A claimed record has an owner; inviting someone to "take control" of it
  -- would be an attempt to transfer it away from them.
  if target.linked_user_id is not null then
    raise exception 'record already claimed' using errcode = '22023';
  end if;
  if not public.has_care_circle_access(p_patient_id) then
    raise exception 'care-circle access required' using errcode = '42501';
  end if;

  select op.id, op.organization_id into org_patient
  from public.organization_patients op
  where op.patient_id = p_patient_id
  limit 1;

  -- Supersede anything outstanding. The old token_hash goes to null in the
  -- same statement, so a resend invalidates the previous link rather than
  -- leaving two that both work.
  update public.patient_claim_invitations
  set cancelled_at = now(), token_hash = null
  where patient_id = p_patient_id
    and claimed_at is null
    and cancelled_at is null;

  insert into public.patient_claim_invitations (
    patient_id, organization_patient_id, invited_email,
    token_hash, created_by, expires_at
  ) values (
    p_patient_id, org_patient.id, normalized_email,
    p_token_hash, auth.uid(), p_expires_at
  )
  returning id into new_invite_id;

  -- Guarded for the same reason as in claim_patient_record: a care-circle
  -- caregiver need not be a member of the enrolling organization, and
  -- write_audit_event rejects an organization the caller has no membership of.
  perform public.write_audit_event(
    case
      when public.has_active_membership(org_patient.organization_id)
      then org_patient.organization_id
      else null
    end,
    'patient.claim_invited',
    'patient_claim_invitation', new_invite_id, p_patient_id,
    'healthcare_operations', p_request_id,
    -- The address is the subject of this event, so it is recorded. The token
    -- is not, in any form.
    jsonb_build_object('invited_email', normalized_email,
                       'expires_at', p_expires_at,
                       'organization_id', org_patient.organization_id)
  );

  return new_invite_id;
end;
$$;

-- ---------- 5. Cancel an outstanding invitation -----------------------------
create or replace function public.cancel_patient_claim_invitation(
  p_invitation_id uuid,
  p_request_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  invite public.patient_claim_invitations%rowtype;
  org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into invite from public.patient_claim_invitations
  where id = p_invitation_id for update;
  if invite.id is null then
    raise exception 'invitation not found' using errcode = '22023';
  end if;
  if not public.has_care_circle_access(invite.patient_id)
    and not public.owns_patient(invite.patient_id)
  then
    raise exception 'not authorized for this record' using errcode = '42501';
  end if;
  if invite.claimed_at is not null then
    raise exception 'invitation already claimed' using errcode = '22023';
  end if;

  -- Nulling the hash is the cancellation: there is then nothing for a
  -- presented token to match, so the emailed link is inert even though the
  -- row survives for the audit trail.
  update public.patient_claim_invitations
  set cancelled_at = now(), token_hash = null
  where id = p_invitation_id;

  select op.organization_id into org_id
  from public.organization_patients op
  where op.patient_id = invite.patient_id
  limit 1;

  -- Cancellation is open to the patient as well as the care circle, and the
  -- patient has no organization membership — so the same guard applies.
  perform public.write_audit_event(
    case when public.has_active_membership(org_id) then org_id else null end,
    'patient.claim_cancelled',
    'patient_claim_invitation', p_invitation_id, invite.patient_id,
    'healthcare_operations', p_request_id,
    jsonb_build_object('invited_email', invite.invited_email,
                       'organization_id', org_id)
  );

  return true;
end;
$$;

-- ---------- 6. The claim ----------------------------------------------------
-- One function, one transaction. Every step of the handover -- linking the
-- user, activating the enrollment, confirming the caregiver's grant, closing
-- the invitation -- either all happens or none of it does, so a half-claimed
-- record cannot exist.
create or replace function public.claim_patient_record(raw_token text)
returns table(patient_id uuid, organization_patient_id uuid)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  invite public.patient_claim_invitations%rowtype;
  target public.patients%rowtype;
  auth_email text;
  existing_patient uuid;
  org_id uuid;
  enrollment_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if raw_token is null or raw_token !~ '^[a-fA-F0-9]{64}$' then
    raise exception 'claim link is invalid or expired' using errcode = '22023';
  end if;

  select * into invite
  from public.patient_claim_invitations
  where token_hash = encode(digest(lower(raw_token), 'sha256'), 'hex')
  for update;

  -- Cancelled and claimed invitations have no token_hash at all, so they
  -- cannot be found here; the remaining checks are belt and braces and the
  -- expiry test, which is the one that actually fires in normal use.
  if invite.id is null
    or invite.claimed_at is not null
    or invite.cancelled_at is not null
    or invite.expires_at <= now()
  then
    raise exception 'claim link is invalid or expired' using errcode = '22023';
  end if;

  -- The session must BE the invited person. This is what stops a caregiver
  -- following the link themselves and claiming the record on the patient's
  -- behalf -- which would defeat the entire point of the handover.
  select lower(email) into auth_email from auth.users where id = auth.uid();
  if auth_email is null or auth_email <> invite.invited_email then
    raise exception 'signed-in account does not match the invited email'
      using errcode = '42501';
  end if;

  select * into target from public.patients where id = invite.patient_id for update;
  if target.id is null then
    raise exception 'record not found' using errcode = '22023';
  end if;
  if target.linked_user_id is not null then
    if target.linked_user_id = auth.uid() then
      -- Already theirs. Close the invitation and report success rather than
      -- failing: re-following a link you already used is not an error.
      update public.patient_claim_invitations
      set claimed_at = now(), claimed_by = auth.uid(), token_hash = null
      where id = invite.id;
      select op.id into enrollment_id from public.organization_patients op
      where op.patient_id = target.id limit 1;
      return query select target.id, enrollment_id;
      return;
    end if;
    raise exception 'record already claimed' using errcode = '22023';
  end if;

  -- One person, one patient record. Merging two sets of medical history is
  -- not something to do automatically from an email link, so this stops and
  -- says so instead. The partial unique index on patients.linked_user_id is
  -- the database-level guarantee behind this check.
  select p.id into existing_patient
  from public.patients p
  where p.linked_user_id = auth.uid()
  limit 1;
  if existing_patient is not null then
    raise exception 'this account is already linked to another patient record'
      using errcode = '23505';
  end if;

  update public.patients
  set linked_user_id = auth.uid(),
      status = 'active',
      updated_at = now()
  where id = target.id;

  -- Every enrollment for this record, not just one: a patient may be enrolled
  -- in more than one organization, and all of them become active on claim.
  -- The ids are read separately afterwards because UPDATE ... RETURNING INTO
  -- raises if the statement touched more than one row.
  update public.organization_patients
  set enrollment_status = 'active', updated_at = now()
  where patient_id = target.id;

  select op.id, op.organization_id into enrollment_id, org_id
  from public.organization_patients op
  where op.patient_id = target.id
    -- Prefer the enrollment the invitation was issued against, so the record
    -- the caregiver was looking at is the one reported back.
    and (invite.organization_patient_id is null
         or op.id = invite.organization_patient_id)
  order by op.created_at
  limit 1;

  -- The creating caregiver keeps the access they already had, now bound to
  -- their user id as well as their email so a later email change cannot
  -- silently detach it. Status is untouched: it is already 'active', and
  -- re-activating a grant the patient had revoked would be wrong.
  update public.patient_access_grants
  set invitee_user_id = coalesce(invitee_user_id, granted_by),
      updated_at = now()
  where patient_id = target.id
    and direction = 'caregiver_created'
    and status = 'active';

  update public.patient_claim_invitations
  set claimed_at = now(), claimed_by = auth.uid(), token_hash = null
  where id = invite.id;

  -- The organization id is passed only when the caller is actually a member
  -- of it. write_audit_event refuses a non-null organization the caller has no
  -- active membership of -- and the caller here is the PATIENT, who has none.
  -- Passing it unguarded would raise inside this transaction and roll the
  -- whole claim back, so the org travels in the metadata instead.
  perform public.write_audit_event(
    case when public.has_active_membership(org_id) then org_id else null end,
    'patient.record_claimed',
    'patient', target.id, target.id,
    'patient_request', 'claim-' || invite.id::text,
    jsonb_build_object(
      'invitation_id', invite.id,
      'claimed_by', auth.uid(),
      'organization_id', org_id
    )
  );

  return query select target.id, enrollment_id;
end;
$$;

-- ---------- 7. Privileges ---------------------------------------------------
-- Supabase's default privileges grant EXECUTE on new functions to anon,
-- authenticated and service_role, so revoking from `public` alone would leave
-- anon able to call these. Each role is revoked explicitly.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.create_caregiver_patient_record(uuid, text, date, text, text)',
    'public.invite_patient_to_claim(uuid, text, text, timestamptz, text)',
    'public.cancel_patient_claim_invitation(uuid, text)',
    'public.claim_patient_record(text)'
  ]
  loop
    execute format('revoke all on function %s from public', fn);
    execute format('revoke all on function %s from anon', fn);
    execute format('revoke all on function %s from authenticated', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end
$$;
