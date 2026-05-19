-- SoleIQ unified platform — phase-1 migration
-- Adds organizations, profiles (with role), and rewrites RLS for role-aware access.
-- Idempotent: safe to re-run.

-- ---------- Organizations -------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.organizations (slug, name)
values ('soleiq', 'SoleIQ')
on conflict (slug) do nothing;

-- ---------- Roles ---------------------------------------------------------

do $$ begin
  create type public.app_role as enum ('super_admin', 'clinic_admin', 'patient');
exception when duplicate_object then null; end $$;

-- ---------- Profiles ------------------------------------------------------
-- One row per auth.users entry. Created automatically on signup.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'patient',
  organization_id uuid references public.organizations(id),
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_org_idx on public.profiles(organization_id);
create index if not exists profiles_role_idx on public.profiles(role);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user signs up.
-- New patients (including anonymous) get role='patient' and the SoleIQ org by default.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  default_org uuid;
begin
  select id into default_org from public.organizations where slug = 'soleiq' limit 1;
  insert into public.profiles (id, role, organization_id, email)
    values (new.id, 'patient', default_org, new.email)
    on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any existing auth users that don't have one yet.
insert into public.profiles (id, role, organization_id, email)
select u.id,
       'patient'::public.app_role,
       (select id from public.organizations where slug = 'soleiq' limit 1),
       u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- ---------- Helper functions for RLS --------------------------------------

create or replace function public.has_role(check_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = check_role
  );
$$;

create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

-- ---------- Add organization_id to patient-data tables --------------------

alter table public.patients
  add column if not exists organization_id uuid references public.organizations(id);

-- Backfill: any pre-existing patient row gets attached to SoleIQ.
update public.patients
set organization_id = (select id from public.organizations where slug = 'soleiq' limit 1)
where organization_id is null;

create index if not exists patients_organization_id_idx on public.patients(organization_id);

-- visits inherit org via patient_id; we don't denormalize org_id onto visits
-- because patients.organization_id is the source of truth.

-- ---------- Rewrite RLS policies -----------------------------------------
-- Old policies were strictly "auth_uid = auth.uid()" — that locks staff out.
-- New policies: patient owns their rows OR staff has role-appropriate access.

alter table public.profiles enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.has_role('super_admin')
    or (public.has_role('clinic_admin') and organization_id = public.current_org_id())
  );

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.has_role('super_admin'))
  with check (id = auth.uid() or public.has_role('super_admin'));

-- Organizations: super_admin all, clinic_admin own, patients own.
alter table public.organizations enable row level security;
drop policy if exists organizations_read on public.organizations;
create policy organizations_read on public.organizations
  for select to authenticated
  using (
    public.has_role('super_admin')
    or id = public.current_org_id()
  );
drop policy if exists organizations_admin_write on public.organizations;
create policy organizations_admin_write on public.organizations
  for all to authenticated
  using (public.has_role('super_admin'))
  with check (public.has_role('super_admin'));

-- Patients: own row, clinic admin in same org, super admin all.
drop policy if exists patients_own on public.patients;
drop policy if exists patients_access on public.patients;
create policy patients_access on public.patients
  for all to authenticated
  using (
    auth_uid = auth.uid()
    or public.has_role('super_admin')
    or (public.has_role('clinic_admin') and organization_id = public.current_org_id())
  )
  with check (
    auth_uid = auth.uid()
    or public.has_role('super_admin')
    or (public.has_role('clinic_admin') and organization_id = public.current_org_id())
  );

-- Visits: scope through the parent patient's auth_uid + org.
drop policy if exists visits_own on public.visits;
drop policy if exists visits_access on public.visits;
create policy visits_access on public.visits
  for all to authenticated
  using (
    auth_uid = auth.uid()
    or public.has_role('super_admin')
    or (
      public.has_role('clinic_admin')
      and exists (
        select 1 from public.patients p
        where p.id = patient_id and p.organization_id = public.current_org_id()
      )
    )
  )
  with check (
    auth_uid = auth.uid()
    or public.has_role('super_admin')
    or (
      public.has_role('clinic_admin')
      and exists (
        select 1 from public.patients p
        where p.id = patient_id and p.organization_id = public.current_org_id()
      )
    )
  );

-- Captured images: scope through parent visit.
drop policy if exists captured_images_own on public.captured_images;
drop policy if exists captured_images_access on public.captured_images;
create policy captured_images_access on public.captured_images
  for all to authenticated
  using (exists (
    select 1 from public.visits v
    left join public.patients p on p.id = v.patient_id
    where v.id = visit_id
      and (
        v.auth_uid = auth.uid()
        or public.has_role('super_admin')
        or (public.has_role('clinic_admin') and p.organization_id = public.current_org_id())
      )
  ))
  with check (exists (
    select 1 from public.visits v
    left join public.patients p on p.id = v.patient_id
    where v.id = visit_id
      and (
        v.auth_uid = auth.uid()
        or public.has_role('super_admin')
        or (public.has_role('clinic_admin') and p.organization_id = public.current_org_id())
      )
  ));

drop policy if exists foot_meshes_own on public.foot_meshes;
drop policy if exists foot_meshes_access on public.foot_meshes;
create policy foot_meshes_access on public.foot_meshes
  for all to authenticated
  using (exists (
    select 1 from public.visits v
    left join public.patients p on p.id = v.patient_id
    where v.id = visit_id
      and (
        v.auth_uid = auth.uid()
        or public.has_role('super_admin')
        or (public.has_role('clinic_admin') and p.organization_id = public.current_org_id())
      )
  ))
  with check (exists (
    select 1 from public.visits v
    left join public.patients p on p.id = v.patient_id
    where v.id = visit_id
      and (
        v.auth_uid = auth.uid()
        or public.has_role('super_admin')
        or (public.has_role('clinic_admin') and p.organization_id = public.current_org_id())
      )
  ));

drop policy if exists analysis_results_own on public.analysis_results;
drop policy if exists analysis_results_access on public.analysis_results;
create policy analysis_results_access on public.analysis_results
  for all to authenticated
  using (exists (
    select 1 from public.visits v
    left join public.patients p on p.id = v.patient_id
    where v.id = visit_id
      and (
        v.auth_uid = auth.uid()
        or public.has_role('super_admin')
        or (public.has_role('clinic_admin') and p.organization_id = public.current_org_id())
      )
  ))
  with check (exists (
    select 1 from public.visits v
    left join public.patients p on p.id = v.patient_id
    where v.id = visit_id
      and (
        v.auth_uid = auth.uid()
        or public.has_role('super_admin')
        or (public.has_role('clinic_admin') and p.organization_id = public.current_org_id())
      )
  ));

-- ---------- Promote a user to super_admin --------------------------------
-- Helper for one-shot bootstrap. Run with the service role:
--   select public.promote_to_super_admin('you@example.com');
create or replace function public.promote_to_super_admin(target_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid;
begin
  select id into uid from auth.users where email = target_email limit 1;
  if uid is null then
    raise exception 'No auth.users row for email %', target_email;
  end if;
  update public.profiles set role = 'super_admin' where id = uid;
  if not found then
    insert into public.profiles (id, role) values (uid, 'super_admin');
  end if;
end $$;
