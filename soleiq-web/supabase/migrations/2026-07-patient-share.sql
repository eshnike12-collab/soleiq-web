-- 2026-07-patient-share.sql
-- Patient-initiated "Share with doctor".
--
-- The RBAC migration created doctor_patient_assignments but only admins
-- could write it. This adds:
--   1. A doctor directory: any signed-in user can read profiles of doctors
--      (name/email only matter — needed so a patient can pick their doctor).
--   2. Patients can create an assignment linking THEMSELVES to a doctor
--      (patient_id must be their own uid, doctor_id must be a doctor), and
--      remove their own links. Admin management is unchanged.
--
-- Once the assignment row exists, the existing RLS from the RBAC migration
-- (is_assigned_doctor) already lets that doctor read the patient's
-- patients / visits / captured_images / analysis_results rows and photos —
-- no other policy changes are needed for results to appear.
--
-- Idempotent: safe to re-run. Run in the Supabase SQL editor.

-- ---------- 1. Doctor directory -------------------------------------------

drop policy if exists profiles_doctor_directory on public.profiles;
create policy profiles_doctor_directory on public.profiles
  for select to authenticated
  using (role = 'doctor');

-- ---------- 2. Patient self-service sharing --------------------------------

-- Security definer so the check doesn't depend on the caller's own read
-- access to profiles.
create or replace function public.is_doctor(check_uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles where id = check_uid and role = 'doctor'
  );
$$;

drop policy if exists dpa_patient_share on public.doctor_patient_assignments;
create policy dpa_patient_share on public.doctor_patient_assignments
  for insert to authenticated
  with check (
    patient_id = auth.uid()
    and public.is_doctor(doctor_id)
  );

drop policy if exists dpa_patient_unshare on public.doctor_patient_assignments;
create policy dpa_patient_unshare on public.doctor_patient_assignments
  for delete to authenticated
  using (patient_id = auth.uid());
