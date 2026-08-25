import { apiHandler } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireAuth } from "@/server/auth";
import { getPatientReleasedReport } from "@/server/patients";
import { sendReportSummaryForReport } from "@/server/email/sendReportSummary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Re-send the "your results are ready" email for one report.
 *
 * The email normally goes out on its own when a report is released (see
 * releaseSessionReport in server/screenings.ts). This exists for the two cases
 * that need a human: a patient who deleted it, and a developer who wants to
 * see the real thing land in a real inbox without re-running an assessment.
 *
 * Authorisation is delegated, not re-implemented: `getExactReport` already
 * runs under the caller's RLS context and throws for a report they cannot
 * see, so asking for it is the permission check. Anything reachable here is
 * something the caller was already allowed to read.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ reportId: string }> }
) {
  return apiHandler(request, async (meta) => {
    const { user } = await requireAuth();
    const { reportId } = await context.params;

    // Email costs money and lands in someone's inbox; this is not a route to
    // leave unthrottled.
    enforceRateLimit(`report-email:${user.id}`, 5, 60_000);

    // Throws 404 through apiHandler if this is not the caller's own released
    // report.
    await getPatientReleasedReport(reportId, meta.requestId);

    const result = await sendReportSummaryForReport(reportId);
    return {
      sent: result.ok,
      reason: result.ok ? null : result.reason,
      requestId: meta.requestId,
    };
  });
}
