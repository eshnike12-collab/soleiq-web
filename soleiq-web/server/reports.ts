import "server-only";

import { z } from "zod";
import { DomainError, notFound } from "./errors";
import { requireAuth } from "./auth";
import { resolveHospital } from "./tenancy";
import { writeAudit } from "./audit";
import { getStoredRecommendation } from "./patients";

export const WorklistQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  risk: z
    .enum(["clear", "watch", "see_someone_soon", "urgent"])
    .optional(),
  unreviewed: z.coerce.boolean().default(false),
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function getDoctorWorklist(
  hospitalSlug: string,
  input: unknown
) {
  const hospital = await resolveHospital(hospitalSlug, ["doctor", "admin"]);
  const query = WorklistQuerySchema.parse(input);
  const { supabase } = await requireAuth();
  const { data, error } = await supabase.rpc("doctor_worklist", {
    worklist_organization_id: hospital.id,
    search_text: query.search || null,
    risk_filter: query.risk || null,
    unreviewed_only: query.unreviewed,
    cursor_started_at: query.cursor || null,
    page_size: query.limit,
  });
  if (error) throw new Error(error.message);
  // The worklist is one row per patient ("latest check"), but a patient can
  // satisfy more than one authorization path (assignment + consent), which
  // duplicates their row. Keep the newest row per enrollment.
  const seen = new Set<string>();
  const rows = (data ?? []).filter((row: any) => {
    if (seen.has(row.organization_patient_id)) return false;
    seen.add(row.organization_patient_id);
    return true;
  });
  return { hospital, rows };
}

export async function getExactReport(
  hospitalSlug: string,
  organizationPatientId: string,
  reportId: string,
  requestId: string
) {
  const hospital = await resolveHospital(hospitalSlug, ["doctor", "admin"]);
  const { supabase } = await requireAuth();
  const { data: report, error } = await supabase
    .from("reports")
    .select(
      "id, organization_id, organization_patient_id, screening_session_id, analysis_run_id, version, status, risk_level, clinical_summary, patient_summary, hospital_name_snapshot, finalized_at, created_at, screening_sessions(started_at, completed_at, facility_id), report_reviews(action, clinical_note, created_at, reviewer_membership_id)"
    )
    .eq("id", reportId)
    .eq("organization_id", hospital.id)
    .eq("organization_patient_id", organizationPatientId)
    .maybeSingle();
  if (error || !report) throw notFound("Report not found.");

  const { data: enrollment } = await supabase
    .from("organization_patients")
    .select(
      "id, mrn, patient_id, patients(full_name, date_of_birth, sex, demographics), facilities!organization_patients_facility_id_organization_id_fkey(name)"
    )
    .eq("id", organizationPatientId)
    .eq("organization_id", hospital.id)
    .maybeSingle();
  if (!enrollment) throw notFound("Patient not found.");

  // RLS grants media reads through the same report-access rules, so an
  // authorized report view can always show its captured photos.
  const { data: mediaAssets } = await supabase
    .from("media_assets")
    .select("id, side, view, captured_at")
    .eq("screening_session_id", report.screening_session_id)
    .eq("asset_type", "photo")
    .order("side")
    .order("view");

  await writeAudit(supabase, {
    organizationId: hospital.id,
    action: "report.viewed",
    resourceType: "report",
    resourceId: report.id,
    patientId: enrollment.patient_id,
    purpose: "treatment",
    requestId,
  });
  return {
    hospital,
    report,
    enrollment,
    mediaAssets: mediaAssets ?? [],
    recommendation: await getStoredRecommendation(supabase, report.id),
  };
}

export const ReportReviewSchema = z.object({
  action: z.enum(["acknowledged", "reviewed", "escalated", "released"]),
  note: z.string().trim().max(4000).optional().default(""),
});

export async function reviewExactReport(
  hospitalSlug: string,
  reportId: string,
  input: z.input<typeof ReportReviewSchema>,
  requestId: string
) {
  await resolveHospital(hospitalSlug, ["doctor", "admin"]);
  const { supabase } = await requireAuth();
  const body = ReportReviewSchema.parse(input);
  const { data, error } = await supabase.rpc("review_report", {
    target_report_id: reportId,
    review_action: body.action,
    review_note: body.note,
    request_id: requestId,
  });
  if (error) {
    if (error.code === "42501") throw notFound("Report not found.");
    throw new Error(error.message);
  }
  return data;
}

export const ReportChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      })
    )
    .min(1)
    .max(30),
});

/**
 * Clinician-facing assistant scoped to one report. The record is assembled
 * under the caller's RLS session, so the assistant only ever sees data this
 * clinician is authorized to read, and every conversation turn is audited.
 */
export async function chatAboutReport(
  hospitalSlug: string,
  reportId: string,
  input: z.input<typeof ReportChatSchema>,
  requestId: string
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new DomainError(
      "DEPENDENCY_ERROR",
      "The clinical assistant is not configured. Add ANTHROPIC_API_KEY on the server.",
      503
    );
  }
  const hospital = await resolveHospital(hospitalSlug, ["doctor", "admin"]);
  const body = ReportChatSchema.parse(input);
  const { supabase } = await requireAuth();

  const { data: report, error } = await supabase
    .from("reports")
    .select(
      "id, organization_patient_id, version, status, risk_level, clinical_summary, hospital_name_snapshot, finalized_at, created_at, screening_sessions(started_at, completed_at), report_reviews(action, clinical_note, created_at)"
    )
    .eq("id", reportId)
    .eq("organization_id", hospital.id)
    .maybeSingle();
  if (error || !report) throw notFound("Report not found.");

  const { data: enrollment } = await supabase
    .from("organization_patients")
    .select(
      "id, mrn, patient_id, patients(full_name, date_of_birth, sex, demographics)"
    )
    .eq("id", report.organization_patient_id)
    .eq("organization_id", hospital.id)
    .maybeSingle();

  const patient = Array.isArray(enrollment?.patients)
    ? enrollment?.patients[0]
    : enrollment?.patients;
  const recordContext = {
    hospital: report.hospital_name_snapshot,
    report: {
      version: report.version,
      status: report.status,
      risk_level: report.risk_level,
      created_at: report.created_at,
      finalized_at: report.finalized_at,
      screening: report.screening_sessions,
      clinical_summary: report.clinical_summary,
      reviews: report.report_reviews,
    },
    patient: patient
      ? {
          full_name: patient.full_name,
          date_of_birth: patient.date_of_birth,
          sex: patient.sex,
          intake: patient.demographics,
        }
      : null,
  };

  const system = [
    "You are SoleIQ's clinical screening assistant for licensed clinicians reviewing a photo-based foot screening report.",
    "Ground every answer strictly in the JSON record below. If the record does not contain the answer, say so plainly — never invent findings, measurements, dates, or history.",
    "The screening is decision support, not a diagnosis; keep that framing when asked for conclusions and recommend in-person examination where appropriate.",
    "Be concise and clinical. Plain sentences and dash bullets only — no code fences, no tables, no markdown headings.",
    "",
    "PATIENT RECORD JSON:",
    JSON.stringify(recordContext),
  ].join("\n");

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model:
        process.env.ANTHROPIC_CHAT_MODEL ??
        process.env.ANTHROPIC_VISION_MODEL ??
        "claude-sonnet-4-6",
      max_tokens: 1500,
      system,
      messages: body.messages,
    }),
  });
  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    throw new DomainError(
      "DEPENDENCY_ERROR",
      "The clinical assistant could not answer. Please try again.",
      502
    );
  }
  const reply = payload?.content?.find(
    (item: { type: string }) => item.type === "text"
  )?.text;
  if (!reply) {
    throw new DomainError(
      "DEPENDENCY_ERROR",
      "The clinical assistant returned no answer.",
      502
    );
  }

  await writeAudit(supabase, {
    organizationId: hospital.id,
    action: "report.assistant_queried",
    resourceType: "report",
    resourceId: report.id,
    patientId: enrollment?.patient_id ?? null,
    purpose: "treatment",
    requestId,
  });
  return { reply };
}

export async function exportExactReport(
  hospitalSlug: string,
  organizationPatientId: string,
  reportId: string,
  requestId: string
) {
  const result = await getExactReport(
    hospitalSlug,
    organizationPatientId,
    reportId,
    requestId
  );
  const { supabase } = await requireAuth();
  await writeAudit(supabase, {
    organizationId: result.hospital.id,
    action: "report.exported",
    resourceType: "report",
    resourceId: result.report.id,
    patientId: result.enrollment.patient_id,
    purpose: "treatment",
    requestId,
    metadata: { format: "json" },
  });
  return result;
}
