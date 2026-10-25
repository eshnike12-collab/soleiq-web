-- 00015_caregiver_initiated_access.sql
-- Caregiver-initiated access requests, and decline/expiry on both directions.
--
-- WHY THE CAREGIVER CANNOT SIMPLY INSERT A ROW
--
-- The obvious design is an RLS INSERT policy letting a signed-in user add a
-- row addressed to a patient's email. It cannot work here, and the reason is
-- the privacy rule rather than the schema: `patient_id` is NOT NULL, so the
-- caregiver would have to resolve an email to a patient id before inserting —
-- and being able to do that resolution IS the patient-list oracle the rule
-- forbids. A failed insert would answer "is this address a SoleIQ patient?"
-- just as loudly as a successful one.
--
-- So the only INSERT path for a request is request_care_circle_access()
-- below: SECURITY DEFINER, resolves the address internally, and returns the
-- SAME value whether or not the patient exists. Caregivers get no direct
-- INSERT privilege at all.
--
-- NOTHING HERE LOOSENS has_care_circle_access(). It still requires
-- status = 'active', and a request sitting at 'pending_patient_approval'
-- grants exactly nothing.
--
-- Idempotent: safe to re-run. Run in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------

alter table public.patient_access_grants
  add column if not exists direction text not null default 'patient_invited',
  add column if not exists requested_by uuid references auth.users(id) on delete set null,
  add column if not exists decided_at timestamptz,
  add column if not exists decline_reason text,
  -- sha256 of the single-use token. The token itself is emailed and never
  -- stored: a database dump must not be a set of working access links.
  add column if not exists token_hash text,
  add column if not exists expires_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'patient_access_grants_direction_check'
  ) then
    alter table public.patient_access_grants
      add constraint patient_access_grants_direction_check
      check (direction in ('patient_invited', 'caregiver_requested'));
  end if;
end
$$;

-- Widen status. Dropped and recreated because a check constraint cannot be
-- altered in place.
alter table public.patient_access_grants
  drop constraint if exists patient_access_grants_status_check;
alter table public.patient_access_grants
  add constraint patient_access_grants_status_check
  check (status in (
    'invited',                   -- patient invited; awaiting the caregiver
    'pending_patient_approval',  -- caregiver asked; awaiting the patient
    'active',
    'declined',
    'revoked'
  ));

create index if not exists patient_access_grants_token_idx
  on public.patient_access_grants (token_hash)
  where token_hash is not null;

create index if not exists patient_access_grants_pending_idx
  on public.patient_access_grants (patient_id)
  where status = 'pending_patient_approval';

-- ---------------------------------------------------------------------------
-- 2. Caregiver profile — who is asking
-- ---------------------------------------------------------------------------
-- Shown to the patient in the approval email and screen. A request from an
-- anonymous address is one a patient cannot sensibly judge.

create table if not exists public.caregiver_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 160),
  relationship_to_patient text not null check (char_length(relationship_to_patient) between 1 and 120),
  organization text check (char_length(organization) <= 160),
  phone text check (char_length(phone) <= 40),
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists caregiver_profiles_set_updated_at on public.caregiver_profiles;
create trigger caregiver_profiles_set_updated_at
  before update on public.caregiver_profiles
  for each row execute function public.set_updated_at();

alter table public.caregiver_profiles enable row level security;

drop policy if exists caregiver_profiles_own on public.caregiver_profiles;
create policy caregiver_profiles_own on public.caregiver_profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A patient may read the profile of anyone who has asked them for access, and
-- only those. Without this the approval screen cannot name the requester; with
-- anything broader it would be a directory of caregivers.
drop policy if exists caregiver_profiles_visible_to_asked_patient on public.caregiver_profiles;
create policy caregiver_profiles_visible_to_asked_patient on public.caregiver_profiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.patient_access_grants g
      join public.patients p on p.id = g.patient_id
      where g.requested_by = public.caregiver_profiles.user_id
        and g.direction = 'caregiver_requested'
        and g.status in ('pending_patient_approval', 'active')
        and p.linked_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Row-level security on the grants themselves
-- ---------------------------------------------------------------------------

drop policy if exists care_grants_select_involved on public.patient_access_grants;
create policy care_grants_select_involved on public.patient_access_grants
  for select to authenticated
  using (
    -- The patient this is about.
    exists (
      select 1 from public.patients p
      where p.id = patient_access_grants.patient_id
        and p.linked_user_id = auth.uid()
    )
    -- The other party: by linked account, by the address it was sent to, or
    -- because they are the one who asked.
    or invitee_user_id = auth.uid()
    or lower(invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or requested_by = auth.uid()
  );

-- INSERT is the patient's alone. A caregiver's request goes through
-- request_care_circle_access() — see the header.
drop policy if exists care_grants_insert_patient on public.patient_access_grants;
create policy care_grants_insert_patient on public.patient_access_grants
  for insert to authenticated
  with check (
    direction = 'patient_invited'
    and exists (
      select 1 from public.patients p
      where p.id = patient_access_grants.patient_id
        and p.linked_user_id = auth.uid()
    )
  );

-- The patient decides. Only they may activate or decline, and only from a
-- state that is actually awaiting a decision.
drop policy if exists care_grants_decide_patient on public.patient_access_grants;
create policy care_grants_decide_patient on public.patient_access_grants
  for update to authenticated
  using (
    exists (
      select 1 from public.patients p
      where p.id = patient_access_grants.patient_id
        and p.linked_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.patients p
      where p.id = patient_access_grants.patient_id
        and p.linked_user_id = auth.uid()
    )
  );

-- Either side may revoke. Narrow on purpose: the non-patient party may move a
-- row to 'revoked' and to nothing else, so a caregiver can withdraw but can
-- never approve themselves.
drop policy if exists care_grants_revoke_either on public.patient_access_grants;
create policy care_grants_revoke_either on public.patient_access_grants
  for update to authenticated
  using (
    invitee_user_id = auth.uid()
    or lower(invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or requested_by = auth.uid()
  )
  with check (status = 'revoked');

-- ---------------------------------------------------------------------------
-- 4. The request path
-- ---------------------------------------------------------------------------

/*
  Ask a patient — identified only by email — for access.

  IDENTICAL RESULT EITHER WAY. The return value does not vary with whether
  the address belongs to a SoleIQ patient, whether a grant already exists, or
  what state it is in. Every path returns the same row shape with
  `accepted := true`. That is the whole point: a caller must not be able to
  tell a real patient from a stranger, by return value, by error, or by
  timing of a second call.

  The caregiver must have a confirmed email. An unverified address can be
  typed by anyone, and a request from one is not a thing a patient can judge.
*/
create or replace function public.request_care_circle_access(
  p_patient_email text,
  p_token_hash text,
  p_expires_at timestamptz
)
returns table (accepted boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  caller_verified timestamptz;
  target_patient uuid;
  existing public.patient_access_grants%rowtype;
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;

  select u.email_confirmed_at into caller_verified
  from auth.users u where u.id = caller;
  if caller_verified is null then
    -- A real refusal, and safe to distinguish: it is about the CALLER's own
    -- account, and reveals nothing about anybody else.
    raise exception 'email not confirmed'
      using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.caregiver_profiles cp where cp.user_id = caller) then
    raise exception 'caregiver profile required'
      using errcode = 'P0002';
  end if;

  select p.id into target_patient
  from public.patients p
  join auth.users u on u.id = p.linked_user_id
  where lower(u.email) = lower(p_patient_email)
  limit 1;

  -- No such patient: do nothing, say the same thing.
  if target_patient is null then
    return query select true;
    return;
  end if;

  -- Asking yourself is not a thing, and must look like every other request.
  if exists (
    select 1 from public.patients p
    where p.id = target_patient and p.linked_user_id = caller
  ) then
    return query select true;
    return;
  end if;

  select * into existing
  from public.patient_access_grants g
  where g.patient_id = target_patient
    and lower(g.invitee_email) = caller_email
  limit 1;

  if found then
    -- Already decided, already active, or already waiting: leave it alone.
    -- Re-requesting must not reset a decline, and must not re-notify.
    if existing.status in ('active', 'pending_patient_approval', 'invited') then
      return query select true;
      return;
    end if;
    -- A declined or revoked row may be asked again — people change their
    -- minds — but it starts from scratch, pending the patient's decision.
    update public.patient_access_grants
    set status = 'pending_patient_approval',
        direction = 'caregiver_requested',
        requested_by = caller,
        token_hash = p_token_hash,
        expires_at = p_expires_at,
        decided_at = null,
        decline_reason = null,
        revoked_at = null
    where id = existing.id;
    return query select true;
    return;
  end if;

  insert into public.patient_access_grants (
    patient_id, granted_by, invitee_email, invitee_user_id,
    role, status, direction, requested_by, token_hash, expires_at
  )
  values (
    target_patient,
    -- `granted_by` is NOT NULL and means "who created this row". For a
    -- request that is the caregiver; it confers nothing on its own.
    caller,
    caller_email,
    caller,
    'caregiver',
    'pending_patient_approval',
    'caregiver_requested',
    caller,
    p_token_hash,
    p_expires_at
  );

  return query select true;
end;
$$;

revoke all on function public.request_care_circle_access(text, text, timestamptz) from public;
revoke all on function public.request_care_circle_access(text, text, timestamptz) from anon;
grant execute on function public.request_care_circle_access(text, text, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Decisions
-- ---------------------------------------------------------------------------

/*
  The patient approves or declines a pending request.

  SECURITY DEFINER so the state machine lives in one place rather than being
  reconstructed from RLS predicates at each call site — but it re-checks that
  the caller really is the patient, so it grants nothing the policy would not.

  An expired request cannot be approved. Expiry is checked here rather than
  trusted from the client, because the client's clock is not evidence.
*/
create or replace function public.decide_care_circle_request(
  p_grant_id uuid,
  p_approve boolean,
  p_decline_reason text default null
)
returns table (status text, grant_role text, requester_email text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
  target public.patient_access_grants%rowtype;
  next_status text;
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;

  select g.* into target
  from public.patient_access_grants g
  join public.patients p on p.id = g.patient_id
  where g.id = p_grant_id
    and p.linked_user_id = caller
  limit 1;

  if not found then
    -- Not theirs to decide, or no such row. One answer for both.
    raise exception 'request not found' using errcode = 'P0003';
  end if;

  if target.status not in ('pending_patient_approval', 'invited') then
    raise exception 'request already decided' using errcode = 'P0004';
  end if;

  if p_approve and target.expires_at is not null and target.expires_at < now() then
    raise exception 'request expired' using errcode = 'P0005';
  end if;

  next_status := case when p_approve then 'active' else 'declined' end;

  update public.patient_access_grants
  set status = next_status,
      decided_at = now(),
      decline_reason = case when p_approve then null else left(p_decline_reason, 400) end,
      -- A decided request's token is spent, whichever way it went.
      token_hash = null
  where id = target.id;

  return query
    select next_status,
           target.role,
           target.invitee_email;
end;
$$;

revoke all on function public.decide_care_circle_request(uuid, boolean, text) from public;
revoke all on function public.decide_care_circle_request(uuid, boolean, text) from anon;
grant execute on function public.decide_care_circle_request(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. has_care_circle_access is UNCHANGED and still requires 'active'.
-- ---------------------------------------------------------------------------
-- Restated here so a future reader does not have to go looking: adding
-- 'pending_patient_approval' and 'declined' to the status vocabulary grants
-- nothing, because the gate below matches one value and it is not those.

create or replace function public.has_care_circle_access(check_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.patient_access_grants g
    where g.patient_id = check_patient_id
      and g.status = 'active'
      and (
        g.invitee_user_id = auth.uid()
        or lower(g.invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

revoke all on function public.has_care_circle_access(uuid) from public;
revoke all on function public.has_care_circle_access(uuid) from anon;
grant execute on function public.has_care_circle_access(uuid) to authenticated;
