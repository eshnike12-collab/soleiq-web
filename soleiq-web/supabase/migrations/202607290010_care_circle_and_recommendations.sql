-- 202607290010_care_circle_and_recommendations.sql
-- Care-circle sharing, persisted product recommendations, and visits.
--
-- NEW TABLES ONLY — no existing table is altered. Two existing RLS
-- FUNCTIONS (can_read_report, can_read_media indirectly) are replaced to
-- honor care-circle grants; this also carries the earlier "patients see
-- their own reports immediately" change (0009), so this single file is
-- safe to run even if 0009 was skipped.
--
-- What this adds:
--   1. report_recommendations — the product recommendation generated when a
--      report was created, frozen with the report (historical reports show
--      what was recommended THEN). Written only by the server worker
--      (service role); readable by anyone who can read the report.
--   2. patient_access_grants — the patient's care circle. Patient invites
--      an email with a role (family | caregiver | clinician) and can revoke
--      any time. Invites flip to active automatically when a signed-in user
--      with that email calls claim_care_circle_invites(). Enforced with RLS
--      (has_care_circle_access), not UI hiding.
--   3. care_visits — scheduled/past clinical visits with notes, managed by
--      the patient, visible to their care circle.
--
-- Idempotent: safe to re-run. Run in the Supabase SQL editor.

-- ---------- 1. Persisted product recommendations ---------------------------

create table if not exists public.report_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  screening_session_id uuid references public.screening_sessions(id) on delete set null,
  -- [{id, name, helpsWith, howItHelps, url, caution?, reason}]
  products jsonb not null default '[]'::jsonb,
  -- { patient: [plain-language trigger strings], clinician: [clinical detail strings] }
  signals jsonb not null default '{}'::jsonb,
  catalog_version text not null default 'v1',
  created_at timestamptz not null default now(),
  unique (report_id)
);

alter table public.report_recommendations enable row level security;

-- Read follows the report's own access rules exactly (patient / care circle /
-- assigned clinician / admin). Writes: none for users — only the server's
-- service role inserts, which bypasses RLS by design.
drop policy if exists report_recommendations_read on public.report_recommendations;
create policy report_recommendations_read on public.report_recommendations
  for select to authenticated
  using (public.can_read_report(report_id));

-- ---------- 2. Care circle -------------------------------------------------

create table if not exists public.patient_access_grants (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  granted_by uuid not null references public.profiles(id) on delete cascade,
  invitee_email text not null,
  invitee_user_id uuid references public.profiles(id) on delete set null,
  role text not null check (role in ('family', 'caregiver', 'clinician')),
  status text not null default 'invited' check (status in ('invited', 'active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index if not exists patient_access_grants_unique_invite
  on public.patient_access_grants (patient_id, lower(invitee_email));
create index if not exists patient_access_grants_invitee_idx
  on public.patient_access_grants (invitee_user_id);

-- True when the CALLER is an active member of this patient's care circle
-- (matched by linked user id, or by their login email for freshly claimed
-- invites). SECURITY DEFINER so RLS policies can use it without recursion.
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
grant execute on function public.has_care_circle_access(uuid) to authenticated;

-- Care-circle access to an enrollment's records (reports are keyed by
-- organization_patient_id, grants by patient_id).
create or replace function public.care_circle_can_read_org_patient(check_org_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_patients op
    where op.id = check_org_patient_id
      and public.has_care_circle_access(op.patient_id)
  );
$$;

revoke all on function public.care_circle_can_read_org_patient(uuid) from public;
grant execute on function public.care_circle_can_read_org_patient(uuid) to authenticated;

-- A signed-in invitee claims pending invites for their email: links their
-- user id and activates the grant. Called by the app after login.
create or replace function public.claim_care_circle_invites()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed integer;
begin
  if auth.uid() is null then
    return 0;
  end if;
  update public.patient_access_grants
  set invitee_user_id = auth.uid(),
      status = 'active',
      updated_at = now()
  where status = 'invited'
    and lower(invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''));
  get diagnostics claimed = row_count;
  return claimed;
end;
$$;

revoke all on function public.claim_care_circle_invites() from public;
grant execute on function public.claim_care_circle_invites() to authenticated;

alter table public.patient_access_grants enable row level security;

-- The patient sees + manages their own circle; invitees see grants aimed at
-- them (by user id or login email).
drop policy if exists pag_select on public.patient_access_grants;
create policy pag_select on public.patient_access_grants
  for select to authenticated
  using (
    public.owns_patient(patient_id)
    or invitee_user_id = auth.uid()
    or lower(invitee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists pag_patient_insert on public.patient_access_grants;
create policy pag_patient_insert on public.patient_access_grants
  for insert to authenticated
  with check (public.owns_patient(patient_id) and granted_by = auth.uid());

drop policy if exists pag_patient_update on public.patient_access_grants;
create policy pag_patient_update on public.patient_access_grants
  for update to authenticated
  using (public.owns_patient(patient_id))
  with check (public.owns_patient(patient_id));

drop policy if exists pag_patient_delete on public.patient_access_grants;
create policy pag_patient_delete on public.patient_access_grants
  for delete to authenticated
  using (public.owns_patient(patient_id));

-- ---------- 3. Reports/media honor the care circle -------------------------
-- Replaces can_read_report: (a) patients see their own non-superseded
-- reports immediately (carries migration 0009), (b) active care-circle
-- members read them too. can_read_media already delegates the patient path
-- through can_read_report, so photos follow automatically.

create or replace function public.can_read_report(check_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.reports r
    where r.id = check_report_id
      and (
        (
          r.status <> 'superseded'
          and (
            public.owns_organization_patient(r.organization_patient_id)
            or public.care_circle_can_read_org_patient(r.organization_patient_id)
          )
        )
        or public.has_active_care_assignment(r.organization_patient_id)
        or public.has_valid_consent(r.organization_patient_id, r.id)
        or public.can_admin_phi(r.organization_id)
      )
  );
$$;

-- Care circle can also see the patient's enrollments (needed to list
-- reports) and basic patient identity.
drop policy if exists org_patients_care_circle_read on public.organization_patients;
create policy org_patients_care_circle_read on public.organization_patients
  for select to authenticated
  using (public.has_care_circle_access(patient_id));

drop policy if exists patients_care_circle_read on public.patients;
create policy patients_care_circle_read on public.patients
  for select to authenticated
  using (public.has_care_circle_access(id));

-- ---------- 4. Visits -------------------------------------------------------

create table if not exists public.care_visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  location text,
  notes text check (notes is null or char_length(notes) <= 4000),
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists care_visits_patient_idx on public.care_visits (patient_id, scheduled_at desc);

alter table public.care_visits enable row level security;

drop policy if exists care_visits_select on public.care_visits;
create policy care_visits_select on public.care_visits
  for select to authenticated
  using (public.owns_patient(patient_id) or public.has_care_circle_access(patient_id));

drop policy if exists care_visits_write on public.care_visits;
create policy care_visits_write on public.care_visits
  for all to authenticated
  using (public.owns_patient(patient_id))
  with check (public.owns_patient(patient_id) and created_by = auth.uid());
