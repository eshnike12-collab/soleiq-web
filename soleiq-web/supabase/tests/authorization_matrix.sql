-- Run after canonical migrations in a disposable/local Supabase database:
--   supabase test db supabase/tests/authorization_matrix.sql
-- The transaction always rolls back.

begin;

create or replace function pg_temp.assert_true(value boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(value, false) then
    raise exception 'authorization assertion failed: %', message;
  end if;
end;
$$;

-- Fixed IDs keep the fixture readable.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'patient-a@test.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'patient-b@test.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'assigned-doctor@test.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'unassigned-doctor@test.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'hospital-b-doctor@test.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'expired-doctor@test.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'suspended-doctor@test.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'consent-doctor@test.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-no-phi@test.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-phi@test.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'platform-admin@test.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.organizations (
  id, legal_name, display_name, slug, timezone, status
) values
  ('a0000000-0000-0000-0000-000000000001', 'Hospital A LLC', 'Hospital A', 'hospital-a', 'America/New_York', 'active'),
  ('b0000000-0000-0000-0000-000000000001', 'Hospital B LLC', 'Hospital B', 'hospital-b', 'America/Chicago', 'active');

insert into public.organization_memberships (
  id, organization_id, user_id, role, status, permissions, accepted_at
) values
  ('41000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'patient', 'active', '{}', now()),
  ('41000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'patient', 'active', '{}', now()),
  ('42000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'doctor', 'active', '{"doctor_verified":true}', now()),
  ('42000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'doctor', 'active', '{"doctor_verified":true}', now()),
  ('42000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'doctor', 'active', '{"doctor_verified":true}', now()),
  ('42000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'doctor', 'active', '{"doctor_verified":true}', now()),
  ('42000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'doctor', 'suspended', '{"doctor_verified":true}', now()),
  ('42000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', 'doctor', 'active', '{"doctor_verified":true}', now()),
  ('43000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'admin', 'active', '{"hospital_admin":true,"phi_access":false}', now()),
  ('43000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'admin', 'active', '{"hospital_admin":true,"phi_access":true}', now()),
  ('43000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'admin', 'active', '{"platform_admin":true,"hospital_admin":true,"phi_access":false}', now());

insert into public.patients (id, linked_user_id, full_name, status) values
  ('51000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Patient A', 'active'),
  ('51000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Patient B', 'active');
insert into public.organization_patients (
  id, organization_id, patient_id, mrn, enrollment_status
) values
  ('52000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'A-0001', 'active'),
  ('52000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', 'B-0002', 'active');

insert into public.care_team_assignments (
  id, organization_id, organization_patient_id, clinician_membership_id,
  relationship, status, starts_at, ends_at, assigned_by, reason
) values
  ('61000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', 'primary', 'active', now() - interval '1 day', null, '43000000-0000-0000-0000-000000000001', 'test'),
  ('61000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000004', 'covering', 'active', now() - interval '2 days', now() - interval '1 day', '43000000-0000-0000-0000-000000000001', 'expired'),
  ('61000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000005', 'consulting', 'active', now() - interval '1 day', null, '43000000-0000-0000-0000-000000000001', 'suspended');

insert into public.consent_grants (
  id, patient_id, organization_id, grantee_membership_id, scope,
  valid_from, created_by, revoked_at, revocation_reason
) values (
  '62000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000006',
  'longitudinal_record',
  now() - interval '1 day',
  '10000000-0000-0000-0000-000000000001',
  now() - interval '1 hour',
  'test revocation'
);

insert into public.screening_sessions (
  id, organization_id, organization_patient_id, initiated_by, status,
  idempotency_key, started_at, completed_at
) values
  ('71000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'released', 'test-a-1', now() - interval '1 day', now() - interval '1 day'),
  ('71000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'preliminary', 'test-a-2', now(), null);
insert into public.media_assets (
  id, organization_id, screening_session_id, asset_type, side, view,
  storage_bucket, storage_path, mime_type, idempotency_key
) values (
  '72000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '71000000-0000-0000-0000-000000000001',
  'photo', 'left', 'sole', 'clinical-media',
  'a0000000-0000-0000-0000-000000000001/52000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000001/left-sole.jpg',
  'image/jpeg', 'test-asset'
);
insert into public.analysis_runs (
  id, organization_id, screening_session_id, status, model_provider,
  model_name, model_version, prompt_version, schema_version,
  safety_rules_version, input_asset_ids, structured_output, idempotency_key
) values
  ('73000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'succeeded', 'test', 'test', '1', '1', '1', '1', array['72000000-0000-0000-0000-000000000001'::uuid], '{}', 'test-run-1'),
  ('73000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000002', 'succeeded', 'test', 'test', '1', '1', '1', '1', '{}', '{}', 'test-run-2');
insert into public.reports (
  id, organization_id, organization_patient_id, screening_session_id,
  analysis_run_id, version, status, risk_level, clinical_summary,
  patient_summary, hospital_name_snapshot, finalized_at
) values
  ('74000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', 1, 'released', 'watch', '{"summary":"clinical"}', '{"summary":"patient"}', 'Hospital A', now()),
  ('74000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000002', '73000000-0000-0000-0000-000000000002', 1, 'preliminary', 'urgent', '{"summary":"clinical"}', '{"summary":"patient"}', 'Hospital A', null);

set local role authenticated;

-- Patient A versus Patient B and released versus preliminary.
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select pg_temp.assert_true(public.can_read_report('74000000-0000-0000-0000-000000000001'), 'patient A reads own released report');
select pg_temp.assert_true(not public.can_read_report('74000000-0000-0000-0000-000000000002'), 'patient A cannot read preliminary report');
select pg_temp.assert_true(public.can_read_storage_object('clinical-media', 'a0000000-0000-0000-0000-000000000001/52000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000001/left-sole.jpg'), 'patient A reads released report media');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select pg_temp.assert_true(not public.can_read_report('74000000-0000-0000-0000-000000000001'), 'patient B cannot read patient A report');
select pg_temp.assert_true(not public.can_read_storage_object('clinical-media', 'a0000000-0000-0000-0000-000000000001/52000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000001/left-sole.jpg'), 'patient B cannot read patient A media');

-- Assigned, unassigned, cross-hospital, expired, revoked, and suspended doctors.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select pg_temp.assert_true(public.can_read_report('74000000-0000-0000-0000-000000000001'), 'assigned doctor reads exact report');
select pg_temp.assert_true(public.can_read_storage_object('clinical-media', 'a0000000-0000-0000-0000-000000000001/52000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000001/left-sole.jpg'), 'assigned doctor reads media');
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select pg_temp.assert_true(not public.can_read_report('74000000-0000-0000-0000-000000000001'), 'unassigned doctor denied');
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
select pg_temp.assert_true(not public.can_read_report('74000000-0000-0000-0000-000000000001'), 'Hospital B doctor denied Hospital A report');
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true);
select pg_temp.assert_true(not public.can_read_report('74000000-0000-0000-0000-000000000001'), 'expired assignment denied');
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000005', true);
select pg_temp.assert_true(not public.can_read_report('74000000-0000-0000-0000-000000000001'), 'suspended membership denied');
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000006', true);
select pg_temp.assert_true(not public.can_read_report('74000000-0000-0000-0000-000000000001'), 'revoked consent denied');

-- Admin and platform permissions are explicit.
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
select pg_temp.assert_true(public.can_admin_organization('a0000000-0000-0000-0000-000000000001'), 'hospital admin can manage Hospital A');
select pg_temp.assert_true(not public.can_read_report('74000000-0000-0000-0000-000000000001'), 'hospital admin without PHI denied report');
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
select pg_temp.assert_true(public.can_read_report('74000000-0000-0000-0000-000000000001'), 'hospital admin with PHI reads report');
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);
select pg_temp.assert_true(public.is_platform_admin(), 'platform administrator recognized');
select pg_temp.assert_true(not public.can_read_report('74000000-0000-0000-0000-000000000001'), 'platform administrator has no implicit PHI');
select pg_temp.assert_true(not public.can_read_storage_object('clinical-media', 'a0000000-0000-0000-0000-000000000001/52000000-0000-0000-0000-000000000001/71000000-0000-0000-0000-000000000001/left-sole.jpg'), 'platform administrator has no implicit media access');

reset role;
rollback;

