import { escapeHtml } from "./reportSummary";
import { RISK_ORDER, type MonthlyReportStats } from "@/lib/monthlyReport";

/**
 * The monthly platform report, for the operator only.
 *
 * Pure functions: data in, strings out. No network, no env, no Resend import,
 * so the markup is unit-testable without a mail account.
 *
 * WHAT THIS EMAIL CONTAINS, AND WHAT IT MUST NEVER CONTAIN
 *
 * Counts. Only counts. No patient name, no email address, no photograph, no
 * finding, no per-patient row — see the note at the top of
 * lib/monthlyReport.ts. The recipient is the platform operator, but the
 * mailbox is an ordinary one outside the application, and an operations
 * summary does not need identifiable health information to do its job.
 *
 * tests/monthly-report-email.test.ts pins that property so it cannot regress.
 */

export interface MonthlyReportEmailData {
  /** "September 2026" — the month being reported on. */
  monthLabel: string;
  stats: MonthlyReportStats;
  /** Absolute link to the admin dashboard showing the same figures. */
  dashboardUrl: string;
}

const PRIMARY = "#1B64CC";
const INK = "#1F2D3D";
const INK_SOFT = "#546478";
const HAIRLINE = "#E5EBF0";
const SOFT = "#F7FBFE";

/** Risk levels read as they do everywhere else in the product. */
const RISK_LABEL: Record<string, string> = {
  clear: "Clear",
  watch: "Watch",
  see_someone_soon: "See someone soon",
  urgent: "Urgent",
};

export function monthlyReportSubject(data: MonthlyReportEmailData): string {
  return `SoleIQ platform report — ${data.monthLabel}`;
}

function rows(data: MonthlyReportEmailData): [string, string][] {
  const s = data.stats;
  return [
    ["New sign-ups", String(s.newSignups)],
    ["Total accounts", String(s.totalUsers)],
    ["New patient enrollments", String(s.newEnrollments)],
    ["Foot checks started", String(s.checksStarted)],
    ["Reports released", String(s.reportsReleased)],
    ["New organizations", String(s.newOrganizations)],
    ["Total organizations", String(s.totalOrganizations)],
    ["Feedback received", String(s.feedbackCount)],
  ];
}

export function renderMonthlyReportText(data: MonthlyReportEmailData): string {
  const s = data.stats;
  const lines = [
    `SoleIQ platform report — ${data.monthLabel}`,
    "",
    ...rows(data).map(([k, v]) => `${k}: ${v}`),
    "",
    "Reports by screening level:",
    ...RISK_ORDER.map(
      (level) => `  ${RISK_LABEL[level]}: ${s.byRiskLevel[level] ?? 0}`
    ),
  ];

  const categories = Object.entries(s.feedbackByCategory);
  if (categories.length) {
    lines.push("", "Feedback by category:");
    for (const [category, count] of categories) {
      lines.push(`  ${category}: ${count}`);
    }
  }

  if (s.partial) {
    lines.push(
      "",
      `Incomplete: ${s.unavailable.join(", ")} could not be read this run.`
    );
  }

  lines.push(
    "",
    `Admin dashboard: ${data.dashboardUrl}`,
    "",
    "---",
    "Aggregate counts only. This report contains no patient-identifying or clinical information by design.",
    "Sent to the SoleIQ platform operator."
  );
  return lines.join("\n");
}

export function renderMonthlyReportHtml(data: MonthlyReportEmailData): string {
  const s = data.stats;

  const statRows = rows(data)
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid ${HAIRLINE};color:${INK_SOFT};font-size:15px;">${escapeHtml(
            label
          )}</td>
          <td style="padding:11px 0;border-bottom:1px solid ${HAIRLINE};color:${INK};font-size:17px;font-weight:700;text-align:right;">${escapeHtml(
            value
          )}</td>
        </tr>`
    )
    .join("");

  const riskRows = RISK_ORDER.map(
    (level) => `
        <tr>
          <td style="padding:9px 0;border-bottom:1px solid ${HAIRLINE};color:${INK_SOFT};font-size:15px;">${RISK_LABEL[level]}</td>
          <td style="padding:9px 0;border-bottom:1px solid ${HAIRLINE};color:${INK};font-size:16px;font-weight:700;text-align:right;">${
            s.byRiskLevel[level] ?? 0
          }</td>
        </tr>`
  ).join("");

  const categories = Object.entries(s.feedbackByCategory);
  const feedbackBlock = categories.length
    ? `<h2 style="margin:28px 0 8px 0;color:${INK};font-size:17px;font-weight:700;">Feedback by category</h2>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
         ${categories
           .map(
             ([category, count]) => `
         <tr>
           <td style="padding:9px 0;border-bottom:1px solid ${HAIRLINE};color:${INK_SOFT};font-size:15px;text-transform:capitalize;">${escapeHtml(
               category
             )}</td>
           <td style="padding:9px 0;border-bottom:1px solid ${HAIRLINE};color:${INK};font-size:16px;font-weight:700;text-align:right;">${count}</td>
         </tr>`
           )
           .join("")}
       </table>`
    : "";

  const partialBlock = s.partial
    ? `<p style="margin:22px 0 0 0;padding:12px 14px;background:#FFF8DF;border-radius:10px;color:#8A6209;font-size:14px;line-height:1.5;">
         <strong>Incomplete report.</strong> ${escapeHtml(
           s.unavailable.join(", ")
         )} could not be read this run, so those figures show as zero.
       </p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    monthlyReportSubject(data)
  )}</title></head>
<body style="margin:0;padding:0;background:${SOFT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SOFT};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid ${HAIRLINE};">
        <tr><td style="background:${PRIMARY};padding:24px 28px;">
          <span style="color:#FFFFFF;font-family:Inter,Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;">SoleIQ</span>
          <span style="color:#CFE4F9;font-family:Inter,Helvetica,Arial,sans-serif;font-size:19px;"> Platform</span>
        </td></tr>

        <tr><td style="padding:28px 28px 0 28px;font-family:Inter,Helvetica,Arial,sans-serif;">
          <p style="margin:0 0 4px 0;color:${PRIMARY};font-size:13px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;">Monthly report</p>
          <h1 style="margin:0 0 20px 0;color:${INK};font-size:24px;font-weight:700;">${escapeHtml(
            data.monthLabel
          )}</h1>
        </td></tr>

        <tr><td style="padding:0 28px;font-family:Inter,Helvetica,Arial,sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${statRows}</table>

          <h2 style="margin:28px 0 8px 0;color:${INK};font-size:17px;font-weight:700;">Reports by screening level</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${riskRows}</table>

          ${feedbackBlock}
          ${partialBlock}

          <p style="margin:26px 0 0 0;">
            <a href="${escapeHtml(data.dashboardUrl)}"
               style="display:inline-block;background:${PRIMARY};color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;padding:13px 24px;border-radius:12px;">
              Open admin dashboard
            </a>
          </p>
        </td></tr>

        <tr><td style="padding:24px 28px 26px 28px;font-family:Inter,Helvetica,Arial,sans-serif;">
          <p style="margin:18px 0 0 0;padding-top:18px;border-top:1px solid ${HAIRLINE};color:${INK_SOFT};font-size:12px;line-height:1.6;">
            Aggregate counts only. This report contains no patient-identifying or
            clinical information by design.
          </p>
          <p style="margin:8px 0 0 0;color:${INK_SOFT};font-size:12px;line-height:1.6;">
            Sent to the SoleIQ platform operator.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
