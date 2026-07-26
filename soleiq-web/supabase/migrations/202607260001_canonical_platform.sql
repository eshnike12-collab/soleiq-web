-- SoleIQ canonical hospital-aware platform.
-- Safe on a fresh Supabase project and additive when the legacy schema exists.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Global identity only. Legacy role/organization columns, when present, are
-- backfilled and removed by the authorization migration.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  account_status text not null default 'active'
    check (account_status in ('pending', 'active', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists account_status text default 'active';
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();
update public.profiles set account_status = 'active' where account_status is null;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text,
  legal_name text,
  display_name text,
  slug text not null unique,
  timezone text not null default 'America/New_York',
  status text not null default 'active'
    check (status in ('onboarding', 'active', 'suspended', 'ended')),
  branding jsonb not null default '{}'::jsonb,
  retention_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.organizations add column if not exists name text;
alter table public.organizations add column if not exists legal_name text;
alter table public.organizations add column if not exists display_name text;
alter table public.organizations add column if not exists timezone text default 'America/New_York';
alter table public.organizations add column if not exists status text default 'active';
alter table public.organizations add column if not exists branding jsonb default '{}'::jsonb;
alter table public.organizations add column if not exists retention_policy jsonb default '{}'::jsonb;
alter table public.organizations add column if not exists updated_at timestamptz default now();
update public.organizations
set legal_name = coalesce(legal_name, name, initcap(replace(slug, '-', ' '))),
    display_name = coalesce(display_name, name, initcap(replace(slug, '-', ' '))),
    timezone = coalesce(timezone, 'America/New_York'),
    status = coalesce(status, 'active'),
    branding = coalesce(branding, '{}'::jsonb),
    retention_policy = coalesce(retention_policy, '{}'::jsonb),
    updated_at = coalesce(updated_at, created_at, now());
alter table public.organizations alter column legal_name set not null;
alter table public.organizations alter column display_name set not null;
alter table public.organizations alter column timezone set not null;
alter table public.organizations alter column status set not null;
alter table public.organizations alter column branding set not null;
alter table public.organizations alter column retention_policy set not null;

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  facility_type text not null
    check (facility_type in ('hospital', 'clinic', 'department', 'location', 'virtual')),
  timezone text not null,
  address jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, name)
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'doctor', 'patient')),
  status text not null default 'invited'
    check (status in ('invited', 'active', 'suspended', 'ended')),
  permissions jsonb not null default '{}'::jsonb,
  invited_by uuid references public.organization_memberships(id),
  invited_at timestamptz,
  accepted_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (id, organization_id)
);

create table if not exists public.membership_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid,
  email text,
  role text not null check (role in ('admin', 'doctor', 'patient')),
  permissions jsonb not null default '{}'::jsonb,
  token_hash text not null unique,
  patient_id uuid,
  invited_by uuid not null references public.organization_memberships(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

-- Keep legacy demographic columns when upgrading, while making the UUID row
-- the canonical identity and linked_user_id the optional auth relationship.
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  linked_user_id uuid references public.profiles(id) on delete set null,
  full_name text,
  date_of_birth date,
  sex text,
  phone text,
  demographics jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('pending', 'active', 'inactive', 'deceased', 'merged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.patients add column if not exists linked_user_id uuid references public.profiles(id) on delete set null;
alter table public.patients add column if not exists date_of_birth date;
alter table public.patients add column if not exists phone text;
alter table public.patients add column if not exists demographics jsonb default '{}'::jsonb;
alter table public.patients add column if not exists status text default 'active';
-- Legacy auth_uid was mandatory; canonical identity uses linked_user_id, so
-- new canonical rows (e.g. hospital enrollments) must not require it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'patients'
      and column_name = 'auth_uid' and is_nullable = 'NO'
  ) then
    alter table public.patients alter column auth_uid drop not null;
  end if;
end;
$$;
update public.patients set demographics = '{}'::jsonb where demographics is null;
update public.patients set status = 'active' where status is null;
create unique index if not exists patients_linked_user_unique
  on public.patients(linked_user_id) where linked_user_id is not null;

create table if not exists public.organization_patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid,
  patient_id uuid not null references public.patients(id) on delete restrict,
  mrn text,
  enrollment_status text not null default 'active'
    check (enrollment_status in ('pending', 'active', 'inactive', 'ended')),
  primary_facility_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, patient_id),
  unique (id, organization_id),
  unique (organization_id, mrn),
  foreign key (facility_id, organization_id)
    references public.facilities(id, organization_id),
  foreign key (primary_facility_id, organization_id)
    references public.facilities(id, organization_id)
);

alter table public.membership_invitations
  drop constraint if exists membership_invitations_facility_org_fkey;
alter table public.membership_invitations
  add constraint membership_invitations_facility_org_fkey
  foreign key (facility_id, organization_id)
  references public.facilities(id, organization_id);
alter table public.membership_invitations
  drop constraint if exists membership_invitations_patient_fkey;
alter table public.membership_invitations
  add constraint membership_invitations_patient_fkey
  foreign key (patient_id) references public.patients(id) on delete set null;

create table if not exists public.care_team_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_patient_id uuid not null,
  clinician_membership_id uuid not null,
  relationship text not null
    check (relationship in ('primary', 'consulting', 'covering', 'referred')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'ended')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  assigned_by uuid not null references public.organization_memberships(id),
  reason text,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (organization_patient_id, clinician_membership_id, starts_at),
  foreign key (organization_patient_id, organization_id)
    references public.organization_patients(id, organization_id) on delete cascade,
  foreign key (clinician_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete cascade,
  check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.consent_grants (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  grantee_membership_id uuid not null,
  scope text not null
    check (scope in ('latest_report', 'selected_reports', 'longitudinal_record')),
  selected_report_ids uuid[] not null default '{}',
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_by uuid not null references public.profiles(id),
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  foreign key (grantee_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete cascade,
  check (valid_until is null or valid_until > valid_from)
);

create table if not exists public.screening_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_patient_id uuid not null,
  facility_id uuid,
  initiated_by uuid not null references public.profiles(id),
  status text not null default 'draft'
    check (status in (
      'draft', 'uploading', 'analyzing', 'preliminary',
      'clinician_reviewed', 'completed', 'released', 'failed', 'cancelled'
    )),
  idempotency_key text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, organization_patient_id, idempotency_key),
  foreign key (organization_patient_id, organization_id)
    references public.organization_patients(id, organization_id) on delete cascade,
  foreign key (facility_id, organization_id)
    references public.facilities(id, organization_id)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  screening_session_id uuid not null,
  asset_type text not null check (asset_type in ('photo', 'mesh', 'derived')),
  side text check (side in ('left', 'right')),
  view text check (view in ('top', 'sole', 'heel', 'between_toes', 'other')),
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  capture_quality jsonb,
  checksum text,
  idempotency_key text,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  unique (screening_session_id, idempotency_key),
  foreign key (screening_session_id, organization_id)
    references public.screening_sessions(id, organization_id) on delete cascade
);

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  screening_session_id uuid not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  model_provider text not null,
  model_name text not null,
  model_version text not null,
  prompt_version text not null,
  schema_version text not null,
  safety_rules_version text not null,
  input_asset_ids uuid[] not null default '{}',
  structured_output jsonb,
  idempotency_key text not null,
  started_at timestamptz,
  completed_at timestamptz,
  error_details jsonb,
  created_at timestamptz not null default now(),
  unique (screening_session_id, idempotency_key),
  unique (id, screening_session_id, organization_id),
  foreign key (screening_session_id, organization_id)
    references public.screening_sessions(id, organization_id) on delete cascade
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_patient_id uuid not null,
  screening_session_id uuid not null,
  analysis_run_id uuid not null,
  version integer not null check (version > 0),
  status text not null default 'preliminary'
    check (status in ('preliminary', 'clinician_reviewed', 'released', 'superseded')),
  risk_level text not null
    check (risk_level in ('clear', 'watch', 'see_someone_soon', 'urgent')),
  clinical_summary jsonb not null,
  patient_summary jsonb not null,
  hospital_name_snapshot text not null,
  finalized_at timestamptz,
  superseded_by uuid references public.reports(id),
  created_at timestamptz not null default now(),
  unique (screening_session_id, version),
  unique (analysis_run_id),
  unique (id, organization_id),
  foreign key (organization_patient_id, organization_id)
    references public.organization_patients(id, organization_id) on delete restrict,
  foreign key (analysis_run_id, screening_session_id, organization_id)
    references public.analysis_runs(id, screening_session_id, organization_id) on delete restrict
);

create table if not exists public.report_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid not null,
  reviewer_membership_id uuid not null,
  action text not null
    check (action in ('acknowledged', 'reviewed', 'escalated', 'released')),
  clinical_note text,
  created_at timestamptz not null default now(),
  foreign key (report_id, organization_id)
    references public.reports(id, organization_id) on delete cascade,
  foreign key (reviewer_membership_id, organization_id)
    references public.organization_memberships(id, organization_id) on delete restrict
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_membership_id uuid references public.organization_memberships(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  patient_id uuid references public.patients(id) on delete set null,
  purpose text,
  request_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null check (event_type in (
    'analysis_requested', 'analysis_completed', 'urgent_finding',
    'report_ready', 'report_released', 'assignment_changed', 'consent_revoked'
  )),
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null unique,
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists memberships_user_idx
  on public.organization_memberships(user_id, status);
create index if not exists memberships_org_role_idx
  on public.organization_memberships(organization_id, role, status);
create index if not exists facilities_org_idx
  on public.facilities(organization_id, status);
create index if not exists organization_patients_org_status_idx
  on public.organization_patients(organization_id, enrollment_status, created_at desc);
create index if not exists care_assignments_clinician_active_idx
  on public.care_team_assignments(clinician_membership_id, status, starts_at, ends_at);
create index if not exists care_assignments_patient_active_idx
  on public.care_team_assignments(organization_patient_id, status, starts_at, ends_at);
create index if not exists consent_grants_grantee_idx
  on public.consent_grants(grantee_membership_id, valid_from, valid_until, revoked_at);
create index if not exists screening_sessions_patient_idx
  on public.screening_sessions(organization_patient_id, started_at desc);
create index if not exists reports_patient_idx
  on public.reports(organization_patient_id, created_at desc);
create index if not exists reports_worklist_idx
  on public.reports(organization_id, status, risk_level, created_at desc);
create index if not exists audit_events_org_time_idx
  on public.audit_events(organization_id, occurred_at desc);
create index if not exists outbox_pending_idx
  on public.outbox_events(available_at, created_at) where processed_at is null;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'organizations', 'facilities', 'organization_memberships',
    'patients', 'organization_patients', 'care_team_assignments',
    'screening_sessions'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end;
$$;

-- Signup creates identity only. Roles come exclusively from accepted invites
-- or administrator-created memberships.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, account_status)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    'active'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, email, full_name, account_status)
select u.id, u.email, nullif(u.raw_user_meta_data->>'full_name', ''), 'active'
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  full_name = coalesce(public.profiles.full_name, excluded.full_name);

