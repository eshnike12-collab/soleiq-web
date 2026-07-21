-- 2026-07-auth-rbac.sql
-- Auth + role-based access control migration.
--
-- What this does:
--   1. Migrates profiles.role from the app_role enum to text with roles
--      'admin' | 'doctor' | 'patient' (super_admin→admin, clinic_admin→doctor).
--   2. Seeds exactly one admin by email (ADMIN_EMAIL below); every other
--      signup defaults to 'patient' via the auth.users trigger.
--   3. Adds doctor_patient_assignments (doctor <-> patient links, empty by
--      default) so doctors see only their assigned patients.
--   4. Rewrites RLS on profiles / patients / visits / captured_images /
--      foot_meshes / analysis_results / organizations around the new roles.
--      RLS is the security boundary; the app's route guards are UX only.
--   5. Ensures the columns the current save path writes exist, and the
--      private foot-photos storage bucket + policies.
--
-- Idempotent: safe to re-run. Run in the Supabase SQL editor.
--
-- ADMIN_EMAIL is baked in below (search for 'eshnike12@gmail.com') — change it
-- there if the admin account should be a different address.

-- ---------- 0. Columns the current code writes (add if missing) ------------

alter table public.captured_images add column if not exists storage_path text;
alter table public.captured_images add column if not exists quality jsonb;
alter table public.captured_images alter column data_url drop not null;
alter table public.analysis_results add column if not exists screening_level text;
alter table public.analysis_results add column if not exists screening_result jsonb;

-- ---------- 1. Drop role-dependent policies + helpers ----------------------
-- (They reference has_role(app_role); everything is recreated below.)

drop policy if exists profiles_self_read on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;
drop policy if exists organizations_read on public.organizations;
drop policy if exists organizations_admin_write on public.organizations;
drop policy if exists patients_own on public.patients;
drop policy if exists patients_access on public.patients;
drop policy if exists patients_select on public.patients;
drop policy if exists patients_write on public.patients;
drop policy if exists visits_own on public.visits;
drop policy if exists visits_access on public.visits;
drop policy if exists visits_select on public.visits;
drop policy if exists visits_write on public.visits;
drop policy if exists captured_images_own on public.captured_images;
drop policy if exists captured_images_access on public.captured_images;
drop policy if exists captured_images_select on public.captured_images;
drop policy if exists captured_images_write on public.captured_images;
drop policy if exists foot_meshes_own on public.foot_meshes;
drop policy if exists foot_meshes_access on public.foot_meshes;
drop policy if exists foot_meshes_select on public.foot_meshes;
drop policy if exists foot_meshes_write on public.foot_meshes;
drop policy if exists analysis_results_own on public.analysis_results;
drop policy if exists analysis_results_access on public.analysis_results;
drop policy if exists analysis_results_select on public.analysis_results;
drop policy if exists analysis_results_write on public.analysis_results;
drop policy if exists blog_posts_admin_read on public.blog_posts;
drop policy if exists blog_posts_admin_write on public.blog_posts;

drop function if exists public.has_role(public.app_role);
drop function if exists public.promote_to_super_admin(text);

-- ---------- 2. profiles.role: enum -> text ('admin'|'doctor'|'patient') ----

alter table public.profiles alter column role drop default;
alter table public.profiles alter column role type text using role::text;
update public.profiles set role = 'admin'  where role = 'super_admin';
update public.profiles set role = 'doctor' where role = 'clinic_admin';
alter table public.profiles alter column role set default 'patient';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'doctor', 'patient'));

-- The old enum type is now unused; drop it if nothing else depends on it.
do $$ begin
  drop type public.app_role;
exception when others then null; end $$;

-- ---------- 3. Role helpers (security definer → bypass RLS, no recursion) --

create or replace function public.has_role(check_role text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles where id = auth.uid() and role = check_role
  );
$$;

create or replace function public.current_user_role()
returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------- 4. Doctor <-> patient assignments ------------------------------
-- patient_id / doctor_id are profile ids (= auth.users ids). Empty by default;
-- admins create links from the admin console.

create table if not exists public.doctor_patient_assignments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (doctor_id, patient_id)
);

create index if not exists dpa_doctor_idx on public.doctor_patient_assignments(doctor_id);
create index if not exists dpa_patient_idx on public.doctor_patient_assignments(patient_id);

create or replace function public.is_assigned_doctor(patient_auth_uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_role('doctor') and exists(
    select 1 from public.doctor_patient_assignments a
    where a.doctor_id = auth.uid() and a.patient_id = patient_auth_uid
  );
$$;

alter table public.doctor_patient_assignments enable row level security;

drop policy if exists dpa_select on public.doctor_patient_assignments;
create policy dpa_select on public.doctor_patient_assignments
  for select to authenticated
  using (
    public.has_role('admin') or doctor_id = auth.uid() or patient_id = auth.uid()
  );

drop policy if exists dpa_admin_write on public.doctor_patient_assignments;
create policy dpa_admin_write on public.doctor_patient_assignments
  for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

-- ---------- 5. Signup trigger: admin seed by email, everyone else patient --

create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  default_org uuid;
  assigned_role text;
begin
  select id into default_org from public.organizations where slug = 'soleiq' limit 1;
  assigned_role := case
    when lower(coalesce(new.email, '')) = 'eshnike12@gmail.com' then 'admin'  -- ADMIN_EMAIL
    -- Signup form's "I'm a doctor or caregiver" choice. Doctors see nothing
    -- until an admin assigns patients to them, so self-selection is safe.
    when lower(coalesce(new.raw_user_meta_data->>'requested_role', '')) = 'doctor' then 'doctor'
    else 'patient'
  end;
  insert into public.profiles (id, role, organization_id, email)
    values (new.id, assigned_role, default_org, new.email)
    on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed: if the admin already has an account, promote it now.
update public.profiles p
set role = 'admin'
from auth.users u
where u.id = p.id
  and lower(u.email) = 'eshnike12@gmail.com';  -- ADMIN_EMAIL

-- ---------- 6. RLS: profiles ----------------------------------------------

alter table public.profiles enable row level security;

-- Read: yourself; admins everyone; doctors their assigned patients.
create policy profiles_self_read on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.has_role('admin')
    or public.is_assigned_doctor(id)
  );

-- Update: yourself but you cannot change your own role (new role must equal
-- the stored one — current_user_role() reads the pre-update value); admins
-- can update anyone, including role changes.
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_user_role());

create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

-- ---------- 7. RLS: organizations ------------------------------------------

alter table public.organizations enable row level security;

create policy organizations_read on public.organizations
  for select to authenticated
  using (public.has_role('admin') or id = (
    select organization_id from public.profiles where id = auth.uid()
  ));

create policy organizations_admin_write on public.organizations
  for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

-- ---------- 8. RLS: patient data -------------------------------------------
-- Pattern everywhere: SELECT = owner OR admin OR assigned doctor;
-- writes = owner OR admin. Doctors are read-only on patient data.

alter table public.patients enable row level security;

create policy patients_select on public.patients
  for select to authenticated
  using (
    auth_uid = auth.uid()
    or public.has_role('admin')
    or public.is_assigned_doctor(auth_uid)
  );

create policy patients_write on public.patients
  for all to authenticated
  using (auth_uid = auth.uid() or public.has_role('admin'))
  with check (auth_uid = auth.uid() or public.has_role('admin'));

alter table public.visits enable row level security;

create policy visits_select on public.visits
  for select to authenticated
  using (
    auth_uid = auth.uid()
    or public.has_role('admin')
    or public.is_assigned_doctor(auth_uid)
  );

create policy visits_write on public.visits
  for all to authenticated
  using (auth_uid = auth.uid() or public.has_role('admin'))
  with check (auth_uid = auth.uid() or public.has_role('admin'));

alter table public.captured_images enable row level security;

create policy captured_images_select on public.captured_images
  for select to authenticated
  using (exists (
    select 1 from public.visits v
    where v.id = visit_id
      and (
        v.auth_uid = auth.uid()
        or public.has_role('admin')
        or public.is_assigned_doctor(v.auth_uid)
      )
  ));

create policy captured_images_write on public.captured_images
  for all to authenticated
  using (exists (
    select 1 from public.visits v
    where v.id = visit_id
      and (v.auth_uid = auth.uid() or public.has_role('admin'))
  ))
  with check (exists (
    select 1 from public.visits v
    where v.id = visit_id
      and (v.auth_uid = auth.uid() or public.has_role('admin'))
  ));

alter table public.foot_meshes enable row level security;

create policy foot_meshes_select on public.foot_meshes
  for select to authenticated
  using (exists (
    select 1 from public.visits v
    where v.id = visit_id
      and (
        v.auth_uid = auth.uid()
        or public.has_role('admin')
        or public.is_assigned_doctor(v.auth_uid)
      )
  ));

create policy foot_meshes_write on public.foot_meshes
  for all to authenticated
  using (exists (
    select 1 from public.visits v
    where v.id = visit_id
      and (v.auth_uid = auth.uid() or public.has_role('admin'))
  ))
  with check (exists (
    select 1 from public.visits v
    where v.id = visit_id
      and (v.auth_uid = auth.uid() or public.has_role('admin'))
  ));

alter table public.analysis_results enable row level security;

create policy analysis_results_select on public.analysis_results
  for select to authenticated
  using (exists (
    select 1 from public.visits v
    where v.id = visit_id
      and (
        v.auth_uid = auth.uid()
        or public.has_role('admin')
        or public.is_assigned_doctor(v.auth_uid)
      )
  ));

create policy analysis_results_write on public.analysis_results
  for all to authenticated
  using (exists (
    select 1 from public.visits v
    where v.id = visit_id
      and (v.auth_uid = auth.uid() or public.has_role('admin'))
  ))
  with check (exists (
    select 1 from public.visits v
    where v.id = visit_id
      and (v.auth_uid = auth.uid() or public.has_role('admin'))
  ));

-- ---------- 8b. RLS: blog_posts (policies dropped in step 1) ---------------
-- Public read of published posts is untouched; the admin policies are
-- recreated against the new role name.

create policy blog_posts_admin_read on public.blog_posts
  for select to authenticated
  using (public.has_role('admin'));

create policy blog_posts_admin_write on public.blog_posts
  for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

-- ---------- 9. Storage: private foot-photos bucket -------------------------
-- Path convention: <auth_uid>/<visit_id>/<file>.jpg

insert into storage.buckets (id, name, public)
values ('foot-photos', 'foot-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "foot-photos_own_insert" on storage.objects;
create policy "foot-photos_own_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'foot-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "foot-photos_read" on storage.objects;
create policy "foot-photos_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'foot-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_role('admin')
      or public.is_assigned_doctor(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "foot-photos_own_delete" on storage.objects;
create policy "foot-photos_own_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'foot-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_role('admin')
    )
  );
