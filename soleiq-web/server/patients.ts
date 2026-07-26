import "server-only";

import { notFound } from "./errors";
import { requireAuth } from "./auth";
import { resolveHospital } from "./tenancy";
import { writeAudit } from "./audit";

export async function getPatientClinicalRecord(
  hospitalSlug: string,
  organizationPatientId: string,
  requestId: string
) {
  const hospital = await resolveHospital(hospitalSlug, ["doctor", "admin"]);
  const { supabase } = await requireAuth();
  const { data: enrollment, error } = await supabase
    .from("organization_patients")
    .select(
      "id, organization_id, patient_id, mrn, enrollment_status, created_at, patients(full_name, date_of_birth, sex, demographics, status), facilities!organization_patients_facility_id_organization_id_fkey(name)"
    )
    .eq("id", organizationPatientId)
    .eq("organization_id", hospital.id)
    .maybeSingle();
  if (error || !enrollment) throw notFound("Patient not found.");
  const { data: reports, error: reportsError } = await supabase
    .from("reports")
    .select(
      "id, version, status, risk_level, hospital_name_snapshot, finalized_at, created_at, screening_sessions(started_at, completed_at)"
    )
    .eq("organization_patient_id", organizationPatientId)
    .eq("organization_id", hospital.id)
    .neq("status", "superseded")
    .order("created_at", { ascending: false })
    .limit(100);
  if (reportsError) throw new Error(reportsError.message);
  await writeAudit(supabase, {
    organizationId: hospital.id,
    action: "patient_record.viewed",
    resourceType: "organization_patient",
    resourceId: enrollment.id,
    patientId: enrollment.patient_id,
    purpose: "treatment",
    requestId,
  });
  return { hospital, enrollment, reports: reports ?? [] };
}

export async function getPatientReleasedReport(
  reportId: string,
  requestId: string
) {
  const { supabase, user } = await requireAuth();
  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("linked_user_id", user.id)
    .maybeSingle();
  if (!patient) throw notFound("Report not found.");
  const { data: report, error } = await supabase
    .from("reports")
    .select(
      "id, organization_id, organization_patient_id, version, status, risk_level, patient_summary, hospital_name_snapshot, finalized_at, created_at, screening_sessions(started_at, completed_at)"
    )
    .eq("id", reportId)
    .eq("status", "released")
    .maybeSingle();
  if (error || !report) throw notFound("Report not found.");
  const { data: enrollment } = await supabase
    .from("organization_patients")
    .select("id, patient_id")
    .eq("id", report.organization_patient_id)
    .eq("patient_id", patient.id)
    .maybeSingle();
  if (!enrollment) throw notFound("Report not found.");
  await writeAudit(supabase, {
    organizationId: report.organization_id,
    action: "report.viewed",
    resourceType: "report",
    resourceId: report.id,
    patientId: patient.id,
    purpose: "patient_request",
    requestId,
  });
  return report;
}

export async function getPatientDashboard() {
  const { supabase, user } = await requireAuth();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id, full_name")
    .eq("linked_user_id", user.id)
    .maybeSingle();
  if (
    patientError?.code === "42703" ||
    patientError?.code === "PGRST204" ||
    patientError?.code === "42P01" ||
    patientError?.code === "PGRST205"
  ) {
    return {
      profile,
      patient: null,
      enrollments: [],
      reports: [],
      configurationError:
        "This SoleIQ environment has not applied the hospital-membership database upgrade.",
    };
  }
  if (patientError) throw new Error(patientError.message);
  if (!patient) {
    return {
      profile,
      patient: null,
      enrollments: [],
      reports: [],
      configurationError: null,
    };
  }
  const { data: enrollments, error: enrollmentError } = await supabase
    .from("organization_patients")
    .select(
      "id, organization_id, enrollment_status, facilities!organization_patients_facility_id_organization_id_fkey(name), organizations(display_name, slug, branding)"
    )
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false });
  if (enrollmentError) throw new Error(enrollmentError.message);
  const enrollmentIds = (enrollments ?? []).map((row) => row.id);
  const { data: reports, error: reportError } = enrollmentIds.length
    ? await supabase
        .from("reports")
        .select(
          "id, organization_patient_id, version, status, risk_level, patient_summary, hospital_name_snapshot, finalized_at, created_at, screening_sessions(started_at)"
        )
        .in("organization_patient_id", enrollmentIds)
        .eq("status", "released")
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [], error: null };
  if (reportError) throw new Error(reportError.message);
  return {
    profile,
    patient,
    enrollments: enrollments ?? [],
    reports: reports ?? [],
    configurationError: null,
  };
}
