-- Backfill the canonical model from the legacy SoleIQ schema.
-- Legacy tables remain for rollback/read-only verification, but new
-- application writes use only the canonical screening model.

-- Convert legacy profile role/organization columns into memberships.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'organization_id'
  ) then
    execute $sql$
      insert into public.organization_memberships (
        organization_id, user_id, role, status, permissions, accepted_at
      )
      select
        p.organization_id,
        p.id,
        case
          when p.role::text in ('super_admin', 'admin') then 'admin'
          when p.role::text in ('clinic_admin', 'doctor') then 'doctor'
          else 'patient'
        end,
        'active',
        case
          when p.role::text = 'super_admin'
            then '{"platform_admin": true, "hospital_admin": true, "phi_access": false}'::jsonb
          when p.role::text = 'admin'
            then '{"hospital_admin": true, "phi_access": false}'::jsonb
          else '{}'::jsonb
        end,
        coalesce(p.created_at, now())
      from public.profiles p
      where p.organization_id is not null
      on conflict (organization_id, user_id) do nothing
    $sql$;
  end if;
end;
$$;

-- Link legacy patient identities to their auth profiles.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'patients' and column_name = 'auth_uid'
  ) then
    -- Legacy data may hold several patient rows per auth_uid; the canonical
    -- model allows one linked patient per user, so link the earliest row only.
    execute $sql$
      update public.patients p
      set linked_user_id = p.auth_uid
      where p.linked_user_id is null
        and exists (select 1 from public.profiles pr where pr.id = p.auth_uid)
        and not exists (
          select 1 from public.patients already
          where already.linked_user_id = p.auth_uid
        )
        and p.id = (
          select earliest.id
          from public.patients earliest
          where earliest.auth_uid = p.auth_uid
          order by earliest.created_at, earliest.id
          limit 1
        )
    $sql$;
  end if;
end;
$$;

-- Create hospital enrollments from legacy patients.organization_id.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'patients' and column_name = 'organization_id'
  ) then
    execute $sql$
      insert into public.organization_patients (
        organization_id, patient_id, enrollment_status, created_at, updated_at
      )
      select p.organization_id, p.id, 'active', p.created_at, p.updated_at
      from public.patients p
      where p.organization_id is not null
      on conflict (organization_id, patient_id) do nothing
    $sql$;
  end if;
end;
$$;

-- Backfill visits as screening sessions.
do $$
begin
  if to_regclass('public.visits') is not null then
    execute $sql$
      insert into public.screening_sessions (
        id, organization_id, organization_patient_id, initiated_by, status,
        idempotency_key, started_at, completed_at, created_at, updated_at
      )
      select
        v.id,
        op.organization_id,
        op.id,
        coalesce(p.linked_user_id, v.auth_uid),
        case when v.completed_at is null then 'draft' else 'completed' end,
        'legacy-visit:' || v.id::text,
        v.started_at,
        v.completed_at,
        v.created_at,
        coalesce(v.completed_at, v.created_at)
      from public.visits v
      join public.patients p on p.id = v.patient_id
      join public.organization_patients op on op.patient_id = p.id
      where coalesce(p.linked_user_id, v.auth_uid) is not null
      on conflict (id) do nothing
    $sql$;
  end if;
end;
$$;

-- Backfill private captured images. Long-lived/data URLs are deliberately not
-- copied into the canonical table.
do $$
begin
  if to_regclass('public.captured_images') is not null then
    execute $sql$
      insert into public.media_assets (
        id, organization_id, screening_session_id, asset_type, side, view,
        storage_bucket, storage_path, mime_type, capture_quality,
        idempotency_key, captured_at, created_at
      )
      select
        ci.id,
        ss.organization_id,
        ss.id,
        'photo',
        ci.side,
        ci.view,
        'foot-photos',
        ci.storage_path,
        'image/jpeg',
        ci.quality,
        'legacy-image:' || ci.id::text,
        ci.captured_at,
        ci.captured_at
      from public.captured_images ci
      join public.screening_sessions ss on ss.id = ci.visit_id
      where ci.storage_path is not null
      on conflict (id) do nothing
    $sql$;
  end if;
end;
$$;

-- Every legacy analysis result becomes a traceable analysis run and report.
do $$
begin
  if to_regclass('public.analysis_results') is not null then
    execute $sql$
      insert into public.analysis_runs (
        id, organization_id, screening_session_id, status,
        model_provider, model_name, model_version, prompt_version,
        schema_version, safety_rules_version, input_asset_ids,
        structured_output, idempotency_key, started_at, completed_at, created_at
      )
      select
        ar.id,
        ss.organization_id,
        ss.id,
        'succeeded',
        'legacy',
        'legacy-photo-screening',
        'unknown',
        'legacy',
        'legacy-v1',
        'legacy',
        coalesce((
          select array_agg(ma.id order by ma.created_at)
          from public.media_assets ma
          where ma.screening_session_id = ss.id
        ), '{}'::uuid[]),
        coalesce(ar.screening_result, jsonb_build_object(
          'risk_level', ar.risk_level,
          'risk_factors', ar.risk_factors,
          'detections', ar.detections,
          'volumetrics', ar.volumetrics,
          'trend', ar.trend
        )),
        'legacy-analysis:' || ar.id::text,
        ar.scored_at,
        ar.scored_at,
        ar.scored_at
      from public.analysis_results ar
      join public.screening_sessions ss on ss.id = ar.visit_id
      on conflict (id) do nothing
    $sql$;

    execute $sql$
      insert into public.reports (
        organization_id, organization_patient_id, screening_session_id,
        analysis_run_id, version, status, risk_level, clinical_summary,
        patient_summary, hospital_name_snapshot, finalized_at, created_at
      )
      select
        ss.organization_id,
        ss.organization_patient_id,
        ss.id,
        run.id,
        1,
        case when ss.completed_at is null then 'preliminary' else 'released' end,
        case
          when coalesce(ar.screening_level, '') in ('clear', 'watch', 'see_someone_soon', 'urgent')
            then ar.screening_level
          when ar.risk_level = 'low' then 'clear'
          when ar.risk_level = 'medium' then 'watch'
          else 'see_someone_soon'
        end,
        coalesce(ar.screening_result, run.structured_output),
        coalesce(ar.screening_result, run.structured_output),
        o.display_name,
        ss.completed_at,
        ar.scored_at
      from public.analysis_results ar
      join public.analysis_runs run on run.id = ar.id
      join public.screening_sessions ss on ss.id = ar.visit_id
      join public.organizations o on o.id = ss.organization_id
      on conflict (analysis_run_id) do nothing
    $sql$;
  end if;
end;
$$;

-- Backfill the separate per-image scans system. Each scan is retained as its
-- own canonical session because the legacy visit_id is free-form text.
do $$
begin
  if to_regclass('public.scans') is not null then
    execute $sql$
      insert into public.screening_sessions (
        id, organization_id, organization_patient_id, initiated_by, status,
        idempotency_key, started_at, completed_at, created_at, updated_at
      )
      select
        s.id,
        op.organization_id,
        op.id,
        s.user_id,
        case when s.ai_result is null then 'failed' else 'completed' end,
        'legacy-scan:' || s.id::text,
        s.created_at,
        case when s.ai_result is null then null else s.created_at end,
        s.created_at,
        s.created_at
      from public.scans s
      join public.patients p on p.id = s.patient_id
      join public.organization_patients op on op.patient_id = p.id
      where not exists (
        select 1 from public.screening_sessions existing where existing.id = s.id
      )
      on conflict (id) do nothing
    $sql$;

    execute $sql$
      insert into public.media_assets (
        id, organization_id, screening_session_id, asset_type, side, view,
        storage_bucket, storage_path, mime_type, capture_quality,
        idempotency_key, captured_at, created_at
      )
      select
        s.id,
        ss.organization_id,
        ss.id,
        'photo',
        s.side,
        s.view,
        s.storage_bucket,
        s.storage_path,
        null,
        s.capture_quality,
        'legacy-scan-asset:' || s.id::text,
        s.created_at,
        s.created_at
      from public.scans s
      join public.screening_sessions ss on ss.id = s.id
      where s.storage_path is not null
      on conflict (id) do nothing
    $sql$;
  end if;
end;
$$;

