import { infrastructureClient } from "@/server/storage";
import { appBaseUrl, sendEmail, type EmailResult } from "./client";
import {
  renderReportSummaryHtml,
  renderReportSummaryText,
  reportSummarySubject,
  type ReportMetric,
  type ReportSummaryEmailData,
} from "./templates/reportSummary";

/**
 * Sends the "your results are ready" email for one released report.
 *
 * Runs on the service-role client on purpose: this fires from the analysis
 * worker after a report is released, where there is no signed-in user whose
 * RLS context could authorise the lookup. It reads exactly the four things the
 * email needs and nothing else.
 *
 * Never throws — see the failure policy in ./client.ts. The report is already
 * released and visible in the app before this is called; a mail outage must
 * not turn that into a failed assessment.
 */

/** reports → organization_patients → patients → profiles(email, full_name). */
const REPORT_SELECT = `
  id,
  risk_level,
  status,
  patient_summary,
  finalized_at,
  created_at,
  hospital_name_snapshot,
  organization_patients!inner(
    patients!inner(
      full_name,
      profiles:linked_user_id ( full_name, email )
    )
  )
`;

interface ReportRow {
  id: string;
  risk_level: string | null;
  status: string | null;
  patient_summary: { overall?: { headline?: string; body?: string } } | null;
  finalized_at: string | null;
  created_at: string | null;
  hospital_name_snapshot: string | null;
  organization_patients: {
    patients: {
      full_name: string | null;
      profiles: { full_name: string | null; email: string | null } | null;
    } | null;
  } | null;
}

/** Where the patient reads the full report. Matches the app's own route. */
export function reportUrl(reportId: string): string {
  return `${appBaseUrl()}/records/${reportId}`;
}

/**
 * Non-clinical facts only.
 *
 * The email deliberately carries no findings — see the note at the top of the
 * template. These say enough to identify which check this is without putting
 * results in an inbox that may sit unlocked on a shared device.
 */
function metricsFor(row: ReportRow): ReportMetric[] {
  const metrics: ReportMetric[] = [];
  if (row.hospital_name_snapshot) {
    metrics.push({ label: "Care team", value: row.hospital_name_snapshot });
  }
  metrics.push({ label: "Report reference", value: row.id.slice(0, 8) });
  return metrics;
}

export async function sendReportSummaryEmail(
  data: ReportSummaryEmailData
): Promise<EmailResult> {
  return sendEmail({
    to: data.patientEmail,
    subject: reportSummarySubject(data),
    html: renderReportSummaryHtml(data),
    text: renderReportSummaryText(data),
  });
}

/**
 * Look up the released report for a screening session and email the patient.
 *
 * Returns a result rather than throwing so the caller can log it. Skips
 * quietly when there is no linked account to email — a hospital-entered
 * patient who has never signed in has no address, and that is normal.
 */
export async function sendReportSummaryForSession(
  sessionId: string
): Promise<EmailResult> {
  return sendFor("screening_session_id", sessionId);
}

/** Same email, addressed by report id — used by the re-send route. */
export async function sendReportSummaryForReport(
  reportId: string
): Promise<EmailResult> {
  return sendFor("id", reportId);
}

async function sendFor(
  column: "screening_session_id" | "id",
  value: string
): Promise<EmailResult> {
  let row: ReportRow | null = null;
  try {
    const infra = infrastructureClient();
    const { data, error } = await infra
      .from("reports")
      .select(REPORT_SELECT)
      .eq(column, value)
      .eq("status", "released")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[email] report lookup failed:", error.message);
      return { ok: false, reason: "send_failed", detail: error.message };
    }
    row = data as unknown as ReportRow | null;
  } catch (cause) {
    console.error(
      "[email] report lookup threw:",
      cause instanceof Error ? cause.message : "unknown error"
    );
    return { ok: false, reason: "send_failed" };
  }

  if (!row) return { ok: false, reason: "send_failed", detail: "no released report" };

  const patient = row.organization_patients?.patients ?? null;
  const email = patient?.profiles?.email?.trim();
  if (!email) {
    // Expected for patients who have never linked an account.
    console.info("[email] no linked address for report", row.id, "— not sending");
    return { ok: false, reason: "send_failed", detail: "no linked email" };
  }

  const summary = row.patient_summary?.overall ?? {};
  return sendReportSummaryEmail({
    patientName: patient?.profiles?.full_name || patient?.full_name || "there",
    patientEmail: email,
    reportId: row.id,
    assessmentDate: row.finalized_at ?? row.created_at ?? new Date().toISOString(),
    overallStatus: summary.headline || "Your foot check is complete.",
    riskLevel: row.risk_level ?? "watch",
    summaryText:
      summary.body ||
      "Open SoleIQ to see what the check found and what to do next.",
    metrics: metricsFor(row),
    reportUrl: reportUrl(row.id),
  });
}
