-- 202607260009_immediate_patient_access.sql
-- Patients see their own results (and photos) as soon as analysis completes.
--
-- Previously a patient could only read reports with status = 'released',
-- so nothing appeared until a clinician reviewed and released it. Product
-- decision: results are available to the patient immediately at
-- 'preliminary'; the clinician review still happens and the app labels
-- unreviewed reports "Pending review". Doctors were already able to see
-- every non-superseded report; nothing changes for them.
--
-- can_read_media delegates to can_read_report for the patient path, so
-- photo access follows automatically.
--
-- Idempotent: safe to re-run. Run in the Supabase SQL editor.

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
          and public.owns_organization_patient(r.organization_patient_id)
        )
        or public.has_active_care_assignment(r.organization_patient_id)
        or public.has_valid_consent(r.organization_patient_id, r.id)
        or public.can_admin_phi(r.organization_id)
      )
  );
$$;
