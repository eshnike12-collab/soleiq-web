-- Canonical authorization, RLS, private storage, and transactional workflows.

-- Remove demo policies before replacing legacy helpers.
drop policy if exists profiles_self_read on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_admin_update on public.profiles;
drop policy if exists profiles_doctor_directory on public.profiles;
drop policy if exists organizations_read on public.organizations;
drop policy if exists organizations_admin_write on public.organizations;
drop policy if exists patients_own on public.patients;
drop policy if exists patients_access on public.patients;
drop policy if exists patients_select on public.patients;
drop policy if exists patients_write on public.patients;
do $$
begin
  if to_regclass('public.visits') is not null then
    execute 'drop policy if exists visits_own on public.visits';
    execute 'drop policy if exists visits_access on public.visits';
    execute 'drop policy if exists visits_select on public.visits';
    execute 'drop policy if exists visits_write on public.visits';
  end if;
  if to_regclass('public.captured_images') is not null then
    execute 'drop policy if exists captured_images_own on public.captured_images';
    execute 'drop policy if exists captured_images_access on public.captured_images';
    execute 'drop policy if exists captured_images_select on public.captured_images';
    execute 'drop policy if exists captured_images_write on public.captured_images';
  end if;
  if to_regclass('public.foot_meshes') is not null then
    execute 'drop policy if exists foot_meshes_own on public.foot_meshes';
    execute 'drop policy if exists foot_meshes_access on public.foot_meshes';
    execute 'drop policy if exists foot_meshes_select on public.foot_meshes';
    execute 'drop policy if exists foot_meshes_write on public.foot_meshes';
  end if;
  if to_regclass('public.analysis_results') is not null then
    execute 'drop policy if exists analysis_results_own on public.analysis_results';
    execute 'drop policy if exists analysis_results_access on public.analysis_results';
    execute 'drop policy if exists analysis_results_select on public.analysis_results';
    execute 'drop policy if exists analysis_results_write on public.analysis_results';
  end if;
  if to_regclass('public.doctor_patient_assignments') is not null then
    execute 'drop policy if exists dpa_select on public.doctor_patient_assignments';
    execute 'drop policy if exists dpa_admin_write on public.doctor_patient_assignments';
    execute 'drop policy if exists dpa_patient_share on public.doctor_patient_assignments';
    execute 'drop policy if exists dpa_patient_unshare on public.doctor_patient_assignments';
  end if;
  if to_regclass('public.blog_posts') is not null then
    execute 'drop policy if exists blog_posts_admin_read on public.blog_posts';
    execute 'drop policy if exists blog_posts_admin_write on public.blog_posts';
  end if;
end;
$$;

drop policy if exists foot_photos_insert_own on storage.objects;
drop policy if exists foot_photos_select_own on storage.objects;
drop policy if exists foot_photos_delete_own on storage.objects;
drop policy if exists "foot-photos_own_insert" on storage.objects;
drop policy if exists "foot-photos_read" on storage.objects;
drop policy if exists "foot-photos_own_delete" on storage.objects;
drop policy if exists "foot-scans_own_read" on storage.objects;
drop policy if exists "foot-scans_own_insert" on storage.objects;
drop policy if exists "foot-scans_own_update" on storage.objects;
drop policy if exists "foot-scans_own_delete" on storage.objects;

drop function if exists public.has_role(text);
drop function if exists public.current_user_role();
drop function if exists public.current_org_id();
drop function if exists public.is_assigned_doctor(uuid);
drop function if exists public.is_doctor(uuid);
drop function if exists public.promote_to_super_admin(text);

-- Profiles no longer hold a global role or organization. The dynamic block is
-- safe on both legacy and fresh schemas.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    alter table public.profiles drop column role cascade;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'organization_id'
  ) then
    alter table public.profiles drop column organization_id cascade;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'organizations' and column_name = 'name'
  ) then
    alter table public.organizations drop column name;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'patients' and column_name = 'organization_id'
  ) then
    alter table public.patients drop column organization_id;
  end if;
end;
$$;

alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check
  check (account_status in ('pending', 'active', 'suspended', 'closed'));
alter table public.profiles alter column account_status set not null;
alter table public.patients drop constraint if exists patients_status_check;
alter table public.patients add constraint patients_status_check
  check (status in ('pending', 'active', 'inactive', 'deceased', 'merged'));
alter table public.patients alter column status set not null;

-- Narrow SECURITY DEFINER helpers avoid recursive RLS policy evaluation.
create or replace function public.has_active_membership(
  check_organization_id uuid,
  allowed_roles text[] default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.profiles p on p.id = m.user_id
    where m.organization_id = check_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and p.account_status = 'active'
      and (allowed_roles is null or m.role = any(allowed_roles))
  );
$$;

create or replace function public.active_membership_id(
  check_organization_id uuid,
  allowed_roles text[] default null
)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.id
  from public.organization_memberships m
  join public.profiles p on p.id = m.user_id
  where m.organization_id = check_organization_id
    and m.user_id = auth.uid()
    and m.status = 'active'
    and p.account_status = 'active'
    and (allowed_roles is null or m.role = any(allowed_roles))
  limit 1;
$$;

create or replace function public.membership_has_permission(
  check_organization_id uuid,
  permission_name text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.profiles p on p.id = m.user_id
    where m.organization_id = check_organization_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
      and m.status = 'active'
      and p.account_status = 'active'
      and coalesce((m.permissions ->> permission_name)::boolean, false)
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_memberships m
    join public.profiles p on p.id = m.user_id
    where m.user_id = auth.uid()
      and m.role = 'admin'
      and m.status = 'active'
      and p.account_status = 'active'
      and coalesce((m.permissions ->> 'platform_admin')::boolean, false)
  );
$$;

create or replace function public.can_admin_organization(check_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_platform_admin()
    or (
      public.has_active_membership(check_organization_id, array['admin'])
      and public.membership_has_permission(check_organization_id, 'hospital_admin')
    );
$$;

create or replace function public.can_admin_phi(check_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_active_membership(check_organization_id, array['admin'])
    and public.membership_has_permission(check_organization_id, 'phi_access');
$$;

create or replace function public.owns_patient(check_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.patients p
    where p.id = check_patient_id
      and p.linked_user_id = auth.uid()
      and p.status in ('pending', 'active')
  );
$$;

create or replace function public.owns_organization_patient(
  check_organization_patient_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_patients op
    join public.patients p on p.id = op.patient_id
    join public.organization_memberships m
      on m.organization_id = op.organization_id
     and m.user_id = auth.uid()
     and m.role = 'patient'
     and m.status = 'active'
    where op.id = check_organization_patient_id
      and op.enrollment_status = 'active'
      and p.linked_user_id = auth.uid()
      and p.status in ('pending', 'active')
  );
$$;

create or replace function public.has_active_care_assignment(
  check_organization_patient_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.care_team_assignments a
    join public.organization_memberships m
      on m.id = a.clinician_membership_id
     and m.organization_id = a.organization_id
    join public.profiles p on p.id = m.user_id
    join public.organization_patients op
      on op.id = a.organization_patient_id
     and op.organization_id = a.organization_id
    where a.organization_patient_id = check_organization_patient_id
      and m.user_id = auth.uid()
      and m.role = 'doctor'
      and m.status = 'active'
      and p.account_status = 'active'
      and op.enrollment_status = 'active'
      and a.status = 'active'
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
      and a.ended_at is null
  );
$$;

create or replace function public.has_valid_consent(
  check_organization_patient_id uuid,
  check_report_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_patients op
    join public.consent_grants cg
      on cg.patient_id = op.patient_id
     and cg.organization_id = op.organization_id
    join public.organization_memberships m
      on m.id = cg.grantee_membership_id
     and m.organization_id = cg.organization_id
    join public.profiles p on p.id = m.user_id
    where op.id = check_organization_patient_id
      and m.user_id = auth.uid()
      and m.role = 'doctor'
      and m.status = 'active'
      and p.account_status = 'active'
      and cg.revoked_at is null
      and cg.valid_from <= now()
      and (cg.valid_until is null or cg.valid_until > now())
      and (
        cg.scope = 'longitudinal_record'
        or (
          cg.scope = 'selected_reports'
          and check_report_id is not null
          and check_report_id = any(cg.selected_report_ids)
        )
        or (
          cg.scope = 'latest_report'
          and check_report_id is not null
          and check_report_id = (
            select r.id
            from public.reports r
            where r.organization_patient_id = op.id
              and r.status <> 'superseded'
            order by r.created_at desc
            limit 1
          )
        )
      )
  );
$$;

create or replace function public.can_access_organization_patient(
  check_organization_patient_id uuid,
  check_report_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    public.owns_organization_patient(check_organization_patient_id)
    or public.has_active_care_assignment(check_organization_patient_id)
    or public.has_valid_consent(check_organization_patient_id, check_report_id)
    or exists (
      select 1
      from public.organization_patients op
      where op.id = check_organization_patient_id
        and public.can_admin_phi(op.organization_id)
    );
$$;

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
          r.status = 'released'
          and public.owns_organization_patient(r.organization_patient_id)
        )
        or public.has_active_care_assignment(r.organization_patient_id)
        or public.has_valid_consent(r.organization_patient_id, r.id)
        or public.can_admin_phi(r.organization_id)
      )
  );
$$;

create or replace function public.can_review_report(check_report_id uuid)
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
        public.has_active_care_assignment(r.organization_patient_id)
        or public.has_valid_consent(r.organization_patient_id, r.id)
        or public.can_admin_phi(r.organization_id)
      )
  );
$$;

create or replace function public.can_read_media(check_media_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.media_assets ma
    join public.screening_sessions ss on ss.id = ma.screening_session_id
    where ma.id = check_media_id
      and (
        public.has_active_care_assignment(ss.organization_patient_id)
        or public.can_admin_phi(ss.organization_id)
        or exists (
          select 1 from public.reports r
          where r.screening_session_id = ss.id
            and public.can_read_report(r.id)
        )
      )
  );
$$;

create or replace function public.can_read_storage_object(
  check_bucket text,
  check_path text
)
returns boolean
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  select exists (
    select 1
    from public.media_assets ma
    where ma.storage_bucket = check_bucket
      and ma.storage_path = check_path
      and public.can_read_media(ma.id)
  );
$$;

create or replace function public.can_read_profile(check_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select check_profile_id = auth.uid()
    or exists (
      select 1
      from public.organization_memberships target
      where target.user_id = check_profile_id
        and public.can_admin_organization(target.organization_id)
    )
    or exists (
      select 1
      from public.patients p
      join public.organization_patients op on op.patient_id = p.id
      where p.linked_user_id = check_profile_id
        and public.can_access_organization_patient(op.id)
    )
    or exists (
      select 1
      from public.organization_memberships clinician
      join public.care_team_assignments a
        on a.clinician_membership_id = clinician.id
      where clinician.user_id = check_profile_id
        and public.owns_organization_patient(a.organization_patient_id)
        and a.status = 'active'
        and a.starts_at <= now()
        and (a.ends_at is null or a.ends_at > now())
    );
$$;

revoke all on function public.has_active_membership(uuid, text[]) from public;
revoke all on function public.active_membership_id(uuid, text[]) from public;
revoke all on function public.membership_has_permission(uuid, text) from public;
revoke all on function public.is_platform_admin() from public;
revoke all on function public.can_admin_organization(uuid) from public;
revoke all on function public.can_admin_phi(uuid) from public;
revoke all on function public.owns_patient(uuid) from public;
revoke all on function public.owns_organization_patient(uuid) from public;
revoke all on function public.has_active_care_assignment(uuid) from public;
revoke all on function public.has_valid_consent(uuid, uuid) from public;
revoke all on function public.can_access_organization_patient(uuid, uuid) from public;
revoke all on function public.can_read_report(uuid) from public;
revoke all on function public.can_review_report(uuid) from public;
revoke all on function public.can_read_media(uuid) from public;
revoke all on function public.can_read_storage_object(text, text) from public;
revoke all on function public.can_read_profile(uuid) from public;
grant execute on function public.has_active_membership(uuid, text[]) to authenticated;
grant execute on function public.active_membership_id(uuid, text[]) to authenticated;
grant execute on function public.membership_has_permission(uuid, text) to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.can_admin_organization(uuid) to authenticated;
grant execute on function public.can_admin_phi(uuid) to authenticated;
grant execute on function public.owns_patient(uuid) to authenticated;
grant execute on function public.owns_organization_patient(uuid) to authenticated;
grant execute on function public.has_active_care_assignment(uuid) to authenticated;
grant execute on function public.has_valid_consent(uuid, uuid) to authenticated;
grant execute on function public.can_access_organization_patient(uuid, uuid) to authenticated;
grant execute on function public.can_read_report(uuid) to authenticated;
grant execute on function public.can_review_report(uuid) to authenticated;
grant execute on function public.can_read_media(uuid) to authenticated;
grant execute on function public.can_read_storage_object(text, text) to authenticated;
grant execute on function public.can_read_profile(uuid) to authenticated;

-- Protected profile fields cannot be changed by the account holder.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_platform_admin() then
    new.id := old.id;
    new.email := old.email;
    new.account_status := old.account_status;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Report content is immutable. Lifecycle fields may advance.
create or replace function public.protect_report_content()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.organization_id <> old.organization_id
    or new.organization_patient_id <> old.organization_patient_id
    or new.screening_session_id <> old.screening_session_id
    or new.analysis_run_id <> old.analysis_run_id
    or new.version <> old.version
    or new.risk_level <> old.risk_level
    or new.clinical_summary <> old.clinical_summary
    or new.patient_summary <> old.patient_summary
    or new.hospital_name_snapshot <> old.hospital_name_snapshot
    or new.created_at <> old.created_at
  then
    raise exception 'report content is immutable';
  end if;
  return new;
end;
$$;
drop trigger if exists reports_protect_content on public.reports;
create trigger reports_protect_content
  before update on public.reports
  for each row execute function public.protect_report_content();

create or replace function public.audit_events_append_only()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'audit events are append-only';
end;
$$;
drop trigger if exists audit_events_no_update on public.audit_events;
create trigger audit_events_no_update
  before update or delete on public.audit_events
  for each row execute function public.audit_events_append_only();

-- Canonical table RLS.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'organizations', 'facilities', 'organization_memberships',
    'membership_invitations', 'patients', 'organization_patients',
    'care_team_assignments', 'consent_grants', 'screening_sessions',
    'media_assets', 'analysis_runs', 'reports', 'report_reviews',
    'audit_events', 'outbox_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end;
$$;

drop policy if exists profiles_read_authorized on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists organizations_read_members on public.organizations;
drop policy if exists organizations_platform_insert on public.organizations;
drop policy if exists organizations_platform_update on public.organizations;
drop policy if exists facilities_read_members on public.facilities;
drop policy if exists facilities_admin_write on public.facilities;
drop policy if exists memberships_read_authorized on public.organization_memberships;
drop policy if exists memberships_admin_insert on public.organization_memberships;
drop policy if exists memberships_admin_update on public.organization_memberships;
drop policy if exists invitations_admin_read on public.membership_invitations;
drop policy if exists invitations_admin_write on public.membership_invitations;
drop policy if exists patients_read_authorized on public.patients;
drop policy if exists patients_insert_self on public.patients;
drop policy if exists patients_update_self_or_phi on public.patients;
drop policy if exists organization_patients_read_authorized on public.organization_patients;
drop policy if exists organization_patients_admin_insert on public.organization_patients;
drop policy if exists organization_patients_admin_update on public.organization_patients;
drop policy if exists care_assignments_read_authorized on public.care_team_assignments;
drop policy if exists care_assignments_admin_insert on public.care_team_assignments;
drop policy if exists care_assignments_admin_update on public.care_team_assignments;
drop policy if exists consent_read_authorized on public.consent_grants;
drop policy if exists consent_patient_insert on public.consent_grants;
drop policy if exists consent_patient_update on public.consent_grants;
drop policy if exists sessions_read_authorized on public.screening_sessions;
drop policy if exists sessions_patient_insert on public.screening_sessions;
drop policy if exists sessions_patient_update on public.screening_sessions;
drop policy if exists media_read_authorized on public.media_assets;
drop policy if exists media_patient_insert on public.media_assets;
drop policy if exists analysis_read_authorized on public.analysis_runs;
drop policy if exists reports_read_authorized on public.reports;
drop policy if exists reports_review_update on public.reports;
drop policy if exists report_reviews_read_authorized on public.report_reviews;
drop policy if exists report_reviews_clinician_insert on public.report_reviews;
drop policy if exists audit_admin_read on public.audit_events;
drop policy if exists outbox_admin_read on public.outbox_events;

create policy profiles_read_authorized on public.profiles
  for select to authenticated
  using (public.can_read_profile(id));
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy organizations_read_members on public.organizations
  for select to authenticated
  using (public.has_active_membership(id) or public.is_platform_admin());
create policy organizations_platform_insert on public.organizations
  for insert to authenticated
  with check (public.is_platform_admin());
create policy organizations_platform_update on public.organizations
  for update to authenticated
  using (public.is_platform_admin() or public.can_admin_organization(id))
  with check (public.is_platform_admin() or public.can_admin_organization(id));

create policy facilities_read_members on public.facilities
  for select to authenticated
  using (public.has_active_membership(organization_id));
create policy facilities_admin_write on public.facilities
  for all to authenticated
  using (public.can_admin_organization(organization_id))
  with check (public.can_admin_organization(organization_id));

create policy memberships_read_authorized on public.organization_memberships
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.can_admin_organization(organization_id)
    or exists (
      select 1
      from public.care_team_assignments a
      where a.clinician_membership_id = organization_memberships.id
        and public.owns_organization_patient(a.organization_patient_id)
    )
    or exists (
      select 1
      from public.consent_grants cg
      where cg.grantee_membership_id = organization_memberships.id
        and public.owns_patient(cg.patient_id)
    )
  );
create policy memberships_admin_insert on public.organization_memberships
  for insert to authenticated
  with check (public.can_admin_organization(organization_id));
create policy memberships_admin_update on public.organization_memberships
  for update to authenticated
  using (public.can_admin_organization(organization_id))
  with check (public.can_admin_organization(organization_id));

create policy invitations_admin_read on public.membership_invitations
  for select to authenticated
  using (public.can_admin_organization(organization_id));
create policy invitations_admin_write on public.membership_invitations
  for all to authenticated
  using (public.can_admin_organization(organization_id))
  with check (public.can_admin_organization(organization_id));

create policy patients_read_authorized on public.patients
  for select to authenticated
  using (
    linked_user_id = auth.uid()
    or exists (
      select 1
      from public.organization_patients op
      where op.patient_id = patients.id
        and public.can_access_organization_patient(op.id)
    )
  );
create policy patients_insert_self on public.patients
  for insert to authenticated
  with check (linked_user_id = auth.uid());
create policy patients_update_self_or_phi on public.patients
  for update to authenticated
  using (
    linked_user_id = auth.uid()
    or exists (
      select 1 from public.organization_patients op
      where op.patient_id = patients.id and public.can_admin_phi(op.organization_id)
    )
  )
  with check (
    linked_user_id = auth.uid()
    or exists (
      select 1 from public.organization_patients op
      where op.patient_id = patients.id and public.can_admin_phi(op.organization_id)
    )
  );

create policy organization_patients_read_authorized on public.organization_patients
  for select to authenticated
  using (public.can_access_organization_patient(id));
create policy organization_patients_admin_insert on public.organization_patients
  for insert to authenticated
  with check (public.can_admin_organization(organization_id));
create policy organization_patients_admin_update on public.organization_patients
  for update to authenticated
  using (public.can_admin_organization(organization_id))
  with check (public.can_admin_organization(organization_id));

create policy care_assignments_read_authorized on public.care_team_assignments
  for select to authenticated
  using (
    public.can_admin_organization(organization_id)
    or clinician_membership_id = public.active_membership_id(organization_id, array['doctor'])
    or public.owns_organization_patient(organization_patient_id)
  );
create policy care_assignments_admin_insert on public.care_team_assignments
  for insert to authenticated
  with check (
    public.can_admin_organization(organization_id)
    and assigned_by = public.active_membership_id(organization_id, array['admin'])
  );
create policy care_assignments_admin_update on public.care_team_assignments
  for update to authenticated
  using (public.can_admin_organization(organization_id))
  with check (public.can_admin_organization(organization_id));

create policy consent_read_authorized on public.consent_grants
  for select to authenticated
  using (
    public.owns_patient(patient_id)
    or grantee_membership_id = public.active_membership_id(organization_id, array['doctor'])
  );
create policy consent_patient_insert on public.consent_grants
  for insert to authenticated
  with check (
    public.owns_patient(patient_id)
    and created_by = auth.uid()
    and valid_from >= now() - interval '5 minutes'
  );
create policy consent_patient_update on public.consent_grants
  for update to authenticated
  using (public.owns_patient(patient_id))
  with check (public.owns_patient(patient_id) and created_by = auth.uid());

create policy sessions_read_authorized on public.screening_sessions
  for select to authenticated
  using (public.can_access_organization_patient(organization_patient_id));
create policy sessions_patient_insert on public.screening_sessions
  for insert to authenticated
  with check (
    initiated_by = auth.uid()
    and public.owns_organization_patient(organization_patient_id)
  );
create policy sessions_patient_update on public.screening_sessions
  for update to authenticated
  using (
    initiated_by = auth.uid()
    and public.owns_organization_patient(organization_patient_id)
    and status in ('draft', 'uploading', 'failed')
  )
  with check (
    initiated_by = auth.uid()
    and public.owns_organization_patient(organization_patient_id)
    and status in ('draft', 'uploading', 'analyzing', 'failed', 'cancelled')
  );

create policy media_read_authorized on public.media_assets
  for select to authenticated
  using (public.can_read_media(id));
create policy media_patient_insert on public.media_assets
  for insert to authenticated
  with check (
    exists (
      select 1 from public.screening_sessions ss
      where ss.id = screening_session_id
        and ss.organization_id = media_assets.organization_id
        and ss.initiated_by = auth.uid()
        and public.owns_organization_patient(ss.organization_patient_id)
        and ss.status in ('draft', 'uploading')
    )
  );

create policy analysis_read_authorized on public.analysis_runs
  for select to authenticated
  using (
    exists (
      select 1 from public.screening_sessions ss
      where ss.id = analysis_runs.screening_session_id
        and public.can_access_organization_patient(ss.organization_patient_id)
    )
  );

create policy reports_read_authorized on public.reports
  for select to authenticated
  using (public.can_read_report(id));
create policy reports_review_update on public.reports
  for update to authenticated
  using (public.can_review_report(id))
  with check (public.can_review_report(id));

create policy report_reviews_read_authorized on public.report_reviews
  for select to authenticated
  using (public.can_read_report(report_id));
create policy report_reviews_clinician_insert on public.report_reviews
  for insert to authenticated
  with check (
    public.can_review_report(report_id)
    and reviewer_membership_id = public.active_membership_id(
      organization_id, array['doctor', 'admin']
    )
  );

create policy audit_admin_read on public.audit_events
  for select to authenticated
  using (organization_id is not null and public.can_admin_organization(organization_id));

create policy outbox_admin_read on public.outbox_events
  for select to authenticated
  using (public.can_admin_organization(organization_id));

-- Private storage reads require a canonical media record and current access.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clinical-media',
  'clinical-media',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists clinical_media_authorized_read on storage.objects;
create policy clinical_media_authorized_read on storage.objects
  for select to authenticated
  using (
    bucket_id in ('clinical-media', 'foot-photos', 'foot-scans')
    and public.can_read_storage_object(bucket_id, name)
  );

-- Audit writer derives the actor; callers cannot forge it.
create or replace function public.write_audit_event(
  event_organization_id uuid,
  event_action text,
  event_resource_type text,
  event_resource_id uuid,
  event_patient_id uuid,
  event_purpose text,
  event_request_id text,
  event_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  event_id uuid;
  membership_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if event_organization_id is not null
    and not public.has_active_membership(event_organization_id)
    and not public.is_platform_admin()
  then
    raise exception 'organization access denied' using errcode = '42501';
  end if;

  membership_id := public.active_membership_id(event_organization_id);
  insert into public.audit_events (
    organization_id, actor_user_id, actor_membership_id, action,
    resource_type, resource_id, patient_id, purpose, request_id, metadata
  ) values (
    event_organization_id, auth.uid(), membership_id, event_action,
    event_resource_type, event_resource_id, event_patient_id, event_purpose,
    event_request_id, coalesce(event_metadata, '{}'::jsonb)
  )
  returning id into event_id;
  return event_id;
end;
$$;
revoke all on function public.write_audit_event(
  uuid, text, text, uuid, uuid, text, text, jsonb
) from public;
grant execute on function public.write_audit_event(
  uuid, text, text, uuid, uuid, text, text, jsonb
) to authenticated;

-- Platform onboarding is atomic: the organization and the caller's non-PHI
-- hospital-admin membership are created together so the first staff invitation
-- can be issued without a service-role escape hatch.
create or replace function public.provision_organization(
  organization_slug text,
  organization_legal_name text,
  organization_display_name text,
  organization_timezone text
)
returns table(
  id uuid,
  slug text,
  display_name text,
  status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_organization public.organizations%rowtype;
  new_membership_id uuid;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'platform administration required' using errcode = '42501';
  end if;
  if organization_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid organization slug' using errcode = '22023';
  end if;

  insert into public.organizations (
    slug, legal_name, display_name, timezone, status
  ) values (
    organization_slug,
    trim(organization_legal_name),
    trim(organization_display_name),
    trim(organization_timezone),
    'onboarding'
  )
  returning * into new_organization;

  insert into public.organization_memberships (
    organization_id, user_id, role, status, permissions,
    invited_at, accepted_at
  ) values (
    new_organization.id,
    auth.uid(),
    'admin',
    'active',
    jsonb_build_object(
      'hospital_admin', true,
      'phi_access', false,
      'platform_admin', false
    ),
    now(),
    now()
  )
  returning organization_memberships.id into new_membership_id;

  insert into public.audit_events (
    organization_id, actor_user_id, actor_membership_id, action,
    resource_type, resource_id, purpose, metadata
  ) values (
    new_organization.id,
    auth.uid(),
    new_membership_id,
    'organization.provisioned',
    'organization',
    new_organization.id,
    'platform onboarding',
    jsonb_build_object('initial_admin_phi_access', false)
  );

  return query
  select
    new_organization.id,
    new_organization.slug,
    new_organization.display_name,
    new_organization.status;
end;
$$;
revoke all on function public.provision_organization(text, text, text, text)
  from public;
grant execute on function public.provision_organization(text, text, text, text)
  to authenticated;

-- Admin creates an opaque, expiring invitation. Only the hash is persisted.
create or replace function public.create_membership_invitation(
  invite_organization_id uuid,
  invite_email text,
  invite_role text,
  invite_permissions jsonb,
  invite_facility_id uuid default null,
  invite_patient_id uuid default null,
  invite_expires_at timestamptz default now() + interval '72 hours'
)
returns table(invitation_id uuid, invitation_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  raw_token text := encode(gen_random_bytes(32), 'hex');
  new_id uuid;
  actor_membership uuid;
begin
  if invite_role not in ('admin', 'doctor', 'patient') then
    raise exception 'invalid role';
  end if;
  if not public.can_admin_organization(invite_organization_id) then
    raise exception 'organization administration denied' using errcode = '42501';
  end if;
  actor_membership := public.active_membership_id(invite_organization_id, array['admin']);
  if actor_membership is null and public.is_platform_admin() then
    select m.id into actor_membership
    from public.organization_memberships m
    where m.user_id = auth.uid()
      and m.role = 'admin'
      and m.status = 'active'
      and coalesce((m.permissions ->> 'platform_admin')::boolean, false)
    order by m.created_at
    limit 1;
  end if;
  if actor_membership is null then
    raise exception 'active administrator membership required' using errcode = '42501';
  end if;
  if invite_expires_at <= now() or invite_expires_at > now() + interval '30 days' then
    raise exception 'invalid invitation expiry';
  end if;
  insert into public.membership_invitations (
    organization_id, facility_id, email, role, permissions, token_hash,
    patient_id, invited_by, expires_at
  ) values (
    invite_organization_id, invite_facility_id, nullif(lower(trim(invite_email)), ''),
    invite_role, coalesce(invite_permissions, '{}'::jsonb),
    encode(digest(raw_token, 'sha256'), 'hex'), invite_patient_id,
    actor_membership, invite_expires_at
  )
  returning id into new_id;
  return query select new_id, raw_token, invite_expires_at;
end;
$$;
revoke all on function public.create_membership_invitation(
  uuid, text, text, jsonb, uuid, uuid, timestamptz
) from public;
grant execute on function public.create_membership_invitation(
  uuid, text, text, jsonb, uuid, uuid, timestamptz
) to authenticated;

-- Invitation role is authoritative. Doctor access remains inactive until a
-- hospital administrator verifies and activates the membership.
drop function if exists public.accept_membership_invitation(text);
create or replace function public.accept_membership_invitation(raw_token text)
returns table(
  membership_id uuid,
  organization_slug text,
  membership_role text,
  membership_status text
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  invite public.membership_invitations%rowtype;
  auth_email text;
  new_membership_id uuid;
  new_status text;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select * into invite
  from public.membership_invitations i
  where i.token_hash = encode(digest(raw_token, 'sha256'), 'hex')
  for update;

  if invite.id is null
    or invite.accepted_at is not null
    or invite.revoked_at is not null
    or invite.expires_at <= now()
  then
    raise exception 'invitation is invalid or expired' using errcode = '22023';
  end if;

  select lower(email) into auth_email from auth.users where id = auth.uid();
  if invite.email is not null and invite.email <> auth_email then
    raise exception 'invitation email does not match signed-in account'
      using errcode = '42501';
  end if;

  new_status := case when invite.role = 'doctor' then 'invited' else 'active' end;
  insert into public.organization_memberships (
    organization_id, user_id, role, status, permissions, invited_by,
    invited_at, accepted_at
  ) values (
    invite.organization_id, auth.uid(), invite.role, new_status,
    invite.permissions, invite.invited_by, invite.created_at, now()
  )
  on conflict (organization_id, user_id) do update
  set accepted_at = now(),
      invited_at = excluded.invited_at,
      invited_by = excluded.invited_by
  where public.organization_memberships.status = 'invited'
    and public.organization_memberships.role = invite.role
  returning id into new_membership_id;

  if new_membership_id is null then
    raise exception 'an incompatible membership already exists';
  end if;

  if invite.role = 'patient' and invite.patient_id is not null then
    update public.patients
    set linked_user_id = auth.uid(), updated_at = now()
    where id = invite.patient_id
      and linked_user_id is null;
    if not found then
      raise exception 'patient record is already linked';
    end if;
    insert into public.organization_patients (
      organization_id, facility_id, primary_facility_id, patient_id,
      enrollment_status
    ) values (
      invite.organization_id, invite.facility_id, invite.facility_id,
      invite.patient_id, 'active'
    )
    on conflict (organization_id, patient_id) do update
      set enrollment_status = 'active', updated_at = now();
  end if;

  update public.membership_invitations
  set accepted_at = now(), accepted_by = auth.uid()
  where id = invite.id;

  return query
  select new_membership_id, o.slug, invite.role, new_status
  from public.organizations o where o.id = invite.organization_id;
end;
$$;
revoke all on function public.accept_membership_invitation(text) from public;
grant execute on function public.accept_membership_invitation(text) to authenticated;

-- Report review/release is an atomic, audited state transition.
create or replace function public.review_report(
  target_report_id uuid,
  review_action text,
  review_note text,
  request_id text
)
returns public.reports
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.reports%rowtype;
  reviewer uuid;
  patient_uuid uuid;
  next_status text;
begin
  select * into target from public.reports where id = target_report_id for update;
  if target.id is null or not public.can_review_report(target.id) then
    raise exception 'report not found or access denied' using errcode = '42501';
  end if;
  if review_action not in ('acknowledged', 'reviewed', 'escalated', 'released') then
    raise exception 'invalid review action';
  end if;
  reviewer := public.active_membership_id(target.organization_id, array['doctor', 'admin']);
  if reviewer is null then
    raise exception 'active clinical membership required' using errcode = '42501';
  end if;

  next_status := case
    when review_action = 'released' then 'released'
    when target.status = 'preliminary' then 'clinician_reviewed'
    else target.status
  end;
  update public.reports
  set status = next_status,
      finalized_at = case when review_action = 'released' then now() else finalized_at end
  where id = target.id
  returning * into target;

  update public.screening_sessions
  set status = case
      when review_action = 'released' then 'released'
      when status = 'preliminary' then 'clinician_reviewed'
      else status
    end,
    completed_at = case
      when review_action = 'released' then coalesce(completed_at, now())
      else completed_at
    end,
    updated_at = now()
  where id = target.screening_session_id;

  insert into public.report_reviews (
    organization_id, report_id, reviewer_membership_id, action, clinical_note
  ) values (
    target.organization_id, target.id, reviewer, review_action, nullif(review_note, '')
  );

  select op.patient_id into patient_uuid
  from public.organization_patients op
  where op.id = target.organization_patient_id;

  perform public.write_audit_event(
    target.organization_id,
    'report.' || review_action,
    'report',
    target.id,
    patient_uuid,
    'treatment',
    request_id,
    '{}'::jsonb
  );

  if review_action = 'released' then
    insert into public.outbox_events (
      organization_id, event_type, aggregate_type, aggregate_id,
      idempotency_key, payload
    ) values (
      target.organization_id, 'report_released', 'report', target.id,
      'report-released:' || target.id::text || ':' || target.version::text,
      jsonb_build_object('report_id', target.id)
    ) on conflict (idempotency_key) do nothing;
  end if;
  return target;
end;
$$;
revoke all on function public.review_report(uuid, text, text, text) from public;
grant execute on function public.review_report(uuid, text, text, text) to authenticated;

-- Cursor-paginated doctor worklist. It never exposes patients outside current
-- assignment/consent authorization.
create or replace function public.doctor_worklist(
  worklist_organization_id uuid,
  search_text text default null,
  risk_filter text default null,
  unreviewed_only boolean default false,
  cursor_started_at timestamptz default null,
  page_size integer default 25
)
returns table (
  organization_patient_id uuid,
  patient_name text,
  mrn_display text,
  facility_name text,
  relationship text,
  latest_report_id uuid,
  latest_screening_at timestamptz,
  latest_risk_level text,
  previous_risk_level text,
  urgent boolean,
  unreviewed boolean,
  last_reviewed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_active_membership(
    worklist_organization_id, array['doctor', 'admin']
  ) then
    raise exception 'hospital access denied' using errcode = '42501';
  end if;
  return query
  with authorized as (
    select distinct
      op.id,
      op.mrn,
      op.facility_id,
      p.full_name,
      coalesce(a.relationship, 'consented') as care_relationship
    from public.organization_patients op
    join public.patients p on p.id = op.patient_id
    left join public.care_team_assignments a
      on a.organization_patient_id = op.id
     and a.clinician_membership_id = public.active_membership_id(
       worklist_organization_id, array['doctor']
     )
     and a.status = 'active'
     and a.starts_at <= now()
     and (a.ends_at is null or a.ends_at > now())
    where op.organization_id = worklist_organization_id
      and op.enrollment_status = 'active'
      and public.can_access_organization_patient(op.id)
      and (
        search_text is null
        or p.full_name ilike '%' || search_text || '%'
        or op.mrn ilike '%' || search_text || '%'
      )
  ),
  ranked_reports as (
    select
      r.*,
      row_number() over (
        partition by r.organization_patient_id order by r.created_at desc
      ) report_rank
    from public.reports r
    join authorized a on a.id = r.organization_patient_id
    where r.status <> 'superseded'
  )
  select
    a.id,
    coalesce(a.full_name, 'Patient'),
    case
      when a.mrn is null then '—'
      when length(a.mrn) <= 4 then a.mrn
      else repeat('•', greatest(length(a.mrn) - 4, 0)) || right(a.mrn, 4)
    end,
    f.name,
    a.care_relationship,
    latest.id,
    ss.started_at,
    latest.risk_level,
    previous.risk_level,
    latest.risk_level = 'urgent',
    not exists (
      select 1 from public.report_reviews rr
      where rr.report_id = latest.id
        and rr.reviewer_membership_id = public.active_membership_id(
          worklist_organization_id, array['doctor', 'admin']
        )
    ),
    (
      select max(rr.created_at) from public.report_reviews rr
      where rr.report_id = latest.id
    )
  from authorized a
  left join ranked_reports latest
    on latest.organization_patient_id = a.id and latest.report_rank = 1
  left join ranked_reports previous
    on previous.organization_patient_id = a.id and previous.report_rank = 2
  left join public.screening_sessions ss on ss.id = latest.screening_session_id
  left join public.facilities f on f.id = a.facility_id
  where (risk_filter is null or latest.risk_level = risk_filter)
    and (
      not unreviewed_only
      or not exists (
        select 1 from public.report_reviews rr
        where rr.report_id = latest.id
          and rr.reviewer_membership_id = public.active_membership_id(
            worklist_organization_id, array['doctor', 'admin']
          )
      )
    )
    and (cursor_started_at is null or ss.started_at < cursor_started_at)
  order by (latest.risk_level = 'urgent') desc, ss.started_at desc nulls last, a.id
  limit least(greatest(page_size, 1), 100);
end;
$$;
revoke all on function public.doctor_worklist(
  uuid, text, text, boolean, timestamptz, integer
) from public;
grant execute on function public.doctor_worklist(
  uuid, text, text, boolean, timestamptz, integer
) to authenticated;

-- Operational patient roster masks identifiers unless the administrator has
-- explicit PHI permission.
create or replace function public.admin_patient_roster(
  roster_organization_id uuid,
  search_text text default null,
  cursor_created_at timestamptz default null,
  page_size integer default 25
)
returns table (
  organization_patient_id uuid,
  patient_display text,
  mrn_display text,
  facility_name text,
  enrollment_status text,
  created_at timestamptz,
  phi_visible boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  show_phi boolean;
begin
  if not public.can_admin_organization(roster_organization_id) then
    raise exception 'hospital administration denied' using errcode = '42501';
  end if;
  show_phi := public.can_admin_phi(roster_organization_id);
  return query
  select
    op.id,
    case
      when show_phi then coalesce(p.full_name, 'Patient')
      else 'Patient ' || right(op.id::text, 4)
    end,
    case
      when op.mrn is null then '—'
      when show_phi then op.mrn
      when length(op.mrn) <= 4 then repeat('•', length(op.mrn))
      else repeat('•', greatest(length(op.mrn) - 4, 0)) || right(op.mrn, 4)
    end,
    f.name,
    op.enrollment_status,
    op.created_at,
    show_phi
  from public.organization_patients op
  join public.patients p on p.id = op.patient_id
  left join public.facilities f on f.id = op.facility_id
  where op.organization_id = roster_organization_id
    and (cursor_created_at is null or op.created_at < cursor_created_at)
    and (
      search_text is null
      or (
        show_phi
        and (p.full_name ilike '%' || search_text || '%' or op.mrn ilike '%' || search_text || '%')
      )
    )
  order by op.created_at desc, op.id
  limit least(greatest(page_size, 1), 100);
end;
$$;
revoke all on function public.admin_patient_roster(
  uuid, text, timestamptz, integer
) from public;
grant execute on function public.admin_patient_roster(
  uuid, text, timestamptz, integer
) to authenticated;

-- Enrollment is transactional and requires explicit PHI permission because
-- it handles direct patient identifiers.
create or replace function public.enroll_patient(
  enrollment_organization_id uuid,
  enrollment_facility_id uuid,
  patient_full_name text,
  patient_date_of_birth date,
  patient_sex text,
  patient_mrn text,
  request_id text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_patient_id uuid;
  new_enrollment_id uuid;
begin
  if not public.can_admin_organization(enrollment_organization_id)
    or not public.can_admin_phi(enrollment_organization_id)
  then
    raise exception 'PHI enrollment permission required' using errcode = '42501';
  end if;
  if nullif(trim(patient_full_name), '') is null
    or nullif(trim(patient_mrn), '') is null
  then
    raise exception 'name and hospital identifier are required';
  end if;
  insert into public.patients (
    full_name, date_of_birth, sex, status
  ) values (
    trim(patient_full_name), patient_date_of_birth,
    nullif(trim(patient_sex), ''), 'pending'
  ) returning id into new_patient_id;

  insert into public.organization_patients (
    organization_id, facility_id, primary_facility_id, patient_id,
    mrn, enrollment_status
  ) values (
    enrollment_organization_id, enrollment_facility_id,
    enrollment_facility_id, new_patient_id, trim(patient_mrn), 'pending'
  ) returning id into new_enrollment_id;

  perform public.write_audit_event(
    enrollment_organization_id, 'patient.enrolled', 'organization_patient',
    new_enrollment_id, new_patient_id, 'healthcare_operations', request_id,
    '{}'::jsonb
  );
  return new_enrollment_id;
end;
$$;
revoke all on function public.enroll_patient(
  uuid, uuid, text, date, text, text, text
) from public;
grant execute on function public.enroll_patient(
  uuid, uuid, text, date, text, text, text
) to authenticated;

-- Patient-created session transitions to the durable analysis outbox only
-- after all four canonical photos are registered.
create or replace function public.enqueue_screening_analysis(
  target_session_id uuid,
  request_id text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.screening_sessions%rowtype;
  event_id uuid;
  photo_count integer;
begin
  select * into target
  from public.screening_sessions ss
  where ss.id = target_session_id
  for update;
  if target.id is null
    or target.initiated_by <> auth.uid()
    or not public.owns_organization_patient(target.organization_patient_id)
  then
    raise exception 'screening not found or access denied' using errcode = '42501';
  end if;
  if target.status not in ('draft', 'uploading', 'failed') then
    raise exception 'screening cannot be enqueued from status %', target.status;
  end if;
  select count(*) into photo_count
  from public.media_assets ma
  where ma.screening_session_id = target.id
    and ma.asset_type = 'photo'
    and (ma.side, ma.view) in (
      ('left', 'top'), ('left', 'sole'), ('right', 'top'), ('right', 'sole')
    );
  if photo_count <> 4 then
    raise exception 'four canonical photos are required';
  end if;
  update public.screening_sessions
  set status = 'analyzing', failure_reason = null, updated_at = now()
  where id = target.id;
  insert into public.outbox_events (
    organization_id, event_type, aggregate_type, aggregate_id,
    idempotency_key, payload
  ) values (
    target.organization_id, 'analysis_requested', 'screening_session',
    target.id, 'analysis-requested:' || target.id::text,
    jsonb_build_object('screening_session_id', target.id)
  )
  on conflict (idempotency_key) do update
    set available_at = now(), last_error = null
    where public.outbox_events.processed_at is null
  returning id into event_id;
  perform public.write_audit_event(
    target.organization_id, 'screening.analysis_requested',
    'screening_session', target.id, null, 'treatment', request_id, '{}'::jsonb
  );
  return event_id;
end;
$$;
revoke all on function public.enqueue_screening_analysis(uuid, text) from public;
grant execute on function public.enqueue_screening_analysis(uuid, text) to authenticated;

-- Worker-only atomic persistence. The service role is used for queue/worker
-- infrastructure, never for ordinary clinical reads.
create or replace function public.complete_screening_analysis(
  target_session_id uuid,
  provider_name text,
  analysis_model_name text,
  analysis_model_version text,
  analysis_prompt_version text,
  analysis_schema_version text,
  analysis_safety_version text,
  analysis_output jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.screening_sessions%rowtype;
  run_id uuid;
  report_id uuid;
  report_version integer;
  result_level text;
  hospital_name text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'worker authorization required' using errcode = '42501';
  end if;
  select * into target
  from public.screening_sessions ss
  where ss.id = target_session_id
  for update;
  if target.id is null then raise exception 'screening session not found'; end if;

  select ar.id into run_id
  from public.analysis_runs ar
  where ar.screening_session_id = target.id
    and ar.idempotency_key = 'primary-analysis-v1';
  if run_id is not null then
    select r.id into report_id from public.reports r where r.analysis_run_id = run_id;
    return report_id;
  end if;
  if target.status <> 'analyzing' then
    raise exception 'screening is not analyzing';
  end if;

  result_level := coalesce(analysis_output #>> '{overall,level}', '');
  if result_level not in ('clear', 'watch', 'see_someone_soon', 'urgent') then
    raise exception 'analysis output has invalid risk level';
  end if;
  select o.display_name into hospital_name
  from public.organizations o where o.id = target.organization_id;

  insert into public.analysis_runs (
    organization_id, screening_session_id, status, model_provider,
    model_name, model_version, prompt_version, schema_version,
    safety_rules_version, input_asset_ids, structured_output,
    idempotency_key, started_at, completed_at
  ) values (
    target.organization_id, target.id, 'succeeded', provider_name,
    analysis_model_name, analysis_model_version, analysis_prompt_version,
    analysis_schema_version, analysis_safety_version,
    (
      select array_agg(ma.id order by ma.created_at)
      from public.media_assets ma
      where ma.screening_session_id = target.id and ma.asset_type = 'photo'
    ),
    analysis_output, 'primary-analysis-v1', now(), now()
  ) returning id into run_id;

  select coalesce(max(r.version), 0) + 1 into report_version
  from public.reports r where r.screening_session_id = target.id;
  insert into public.reports (
    organization_id, organization_patient_id, screening_session_id,
    analysis_run_id, version, status, risk_level, clinical_summary,
    patient_summary, hospital_name_snapshot
  ) values (
    target.organization_id, target.organization_patient_id, target.id,
    run_id, report_version, 'preliminary', result_level,
    analysis_output,
    jsonb_build_object(
      'overall', analysis_output->'overall',
      'findings', analysis_output->'findings',
      'looks_good', analysis_output->'looks_good',
      'what_to_do', analysis_output->'what_to_do',
      'when_to_get_help', analysis_output->'when_to_get_help',
      'limits', analysis_output->'limits',
      'not_a_diagnosis', true
    ),
    hospital_name
  ) returning id into report_id;

  update public.screening_sessions
  set status = 'preliminary', updated_at = now()
  where id = target.id;

  insert into public.outbox_events (
    organization_id, event_type, aggregate_type, aggregate_id,
    idempotency_key, payload
  ) values (
    target.organization_id, 'analysis_completed', 'screening_session',
    target.id, 'analysis-completed:' || run_id::text,
    jsonb_build_object('analysis_run_id', run_id, 'report_id', report_id)
  ) on conflict (idempotency_key) do nothing;

  if result_level = 'urgent' then
    insert into public.outbox_events (
      organization_id, event_type, aggregate_type, aggregate_id,
      idempotency_key, payload
    ) values (
      target.organization_id, 'urgent_finding', 'report', report_id,
      'urgent-finding:' || report_id::text,
      jsonb_build_object('report_id', report_id)
    ) on conflict (idempotency_key) do nothing;
  end if;
  return report_id;
end;
$$;
revoke all on function public.complete_screening_analysis(
  uuid, text, text, text, text, text, text, jsonb
) from public;
grant execute on function public.complete_screening_analysis(
  uuid, text, text, text, text, text, text, jsonb
) to service_role;

-- Blog publishing is platform administration, not a global profile role.
do $$
begin
  if to_regclass('public.blog_posts') is not null then
    execute 'drop policy if exists blog_posts_platform_admin_read on public.blog_posts';
    execute 'drop policy if exists blog_posts_platform_admin_write on public.blog_posts';
    execute 'create policy blog_posts_platform_admin_read on public.blog_posts
      for select to authenticated using (public.is_platform_admin())';
    execute 'create policy blog_posts_platform_admin_write on public.blog_posts
      for all to authenticated using (public.is_platform_admin())
      with check (public.is_platform_admin())';
  end if;
end;
$$;
