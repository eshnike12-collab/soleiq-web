/**
 * The patient's "your results are ready" email.
 *
 * Pure functions: data in, strings out. No network, no env, no Resend import —
 * which is what makes the markup unit-testable without a mail account or a
 * DOM (see tests/email-report-summary.test.ts).
 *
 * Design constraints that shaped the markup:
 *
 * - Tables and inline styles, not flexbox and classes. Outlook renders with
 *   Word's engine and drops <style> blocks; a modern layout collapses to a
 *   single unstyled column there.
 * - 600px max width, everything stacking naturally below it, so it reads on a
 *   phone without pinching.
 * - Colours are lifted from the app's own tokens in globals.css rather than
 *   picked: primary #1F4E79 is `--c-primary: 31 78 121`, the risk colours are
 *   `--c-secondary` / `--c-warn` / `--c-urgent`.
 *
 * WHAT THIS EMAIL DELIBERATELY DOES NOT DO
 *
 * It does not carry findings, photographs, or anything a reader could use to
 * act clinically, and it never states a diagnosis. Email is not a private
 * channel — it sits on shared devices and in unlocked previews — so the detail
 * stays behind the sign-in and this is only a prompt to go and look.
 */

export interface ReportMetric {
  label: string;
  value: string;
}

export interface ReportSummaryEmailData {
  patientName: string;
  patientEmail: string;
  reportId: string;
  /** ISO date or anything `Date` accepts. Rendered in the reader's words. */
  assessmentDate: string | number | Date;
  /** Short human phrase, e.g. "Assessment complete". */
  overallStatus: string;
  riskLevel: "clear" | "watch" | "see_someone_soon" | "urgent" | string;
  summaryText: string;
  metrics: ReportMetric[];
  /** Absolute link to the full report. Built by the caller from APP_BASE_URL. */
  reportUrl: string;
}

const PRIMARY = "#1F4E79";
const INK = "#262420";
const INK_SOFT = "#5A554C";
const HAIRLINE = "#E4DFD3";

/** Risk tone, from the app's own palette. Unknown levels get a neutral chip. */
const RISK_TONE: Record<string, { bg: string; fg: string; label: string }> = {
  clear: { bg: "#ECF5F0", fg: "#337A62", label: "Clear" },
  watch: { bg: "#FBF4E3", fg: "#96701A", label: "Watch" },
  see_someone_soon: { bg: "#FBF4E3", fg: "#A9503F", label: "See someone soon" },
  urgent: { bg: "#FAEEEA", fg: "#A94F3F", label: "Urgent" },
};

/**
 * Escape text before it goes anywhere near the markup.
 *
 * Names and summary text come from patients and from a language model. An
 * apostrophe or an angle bracket would break the layout at best; unescaped
 * markup in an email body is an injection vector at worst.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatAssessmentDate(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function riskTone(level: string) {
  return (
    RISK_TONE[level] ?? {
      bg: "#F1EDE3",
      fg: INK_SOFT,
      label: level.replace(/_/g, " "),
    }
  );
}

export function reportSummarySubject(data: ReportSummaryEmailData): string {
  return `Your SoleIQ foot check from ${formatAssessmentDate(data.assessmentDate)} is ready`;
}

export function renderReportSummaryText(data: ReportSummaryEmailData): string {
  const lines = [
    `Hello ${data.patientName},`,
    "",
    `Your SoleIQ foot check from ${formatAssessmentDate(data.assessmentDate)} has finished.`,
    "",
    `Status: ${data.overallStatus}`,
    `Risk level: ${riskTone(data.riskLevel).label}`,
    "",
    data.summaryText,
  ];
  if (data.metrics.length > 0) {
    lines.push("");
    for (const m of data.metrics) lines.push(`${m.label}: ${m.value}`);
  }
  lines.push(
    "",
    "See your full results here:",
    data.reportUrl,
    "",
    "SoleIQ is decision support, not a diagnosis. Always combine it with a",
    "clinical examination. If something feels urgent, contact your care team.",
    "",
    `Sent to ${data.patientEmail} because you completed a SoleIQ foot check.`
  );
  return lines.join("\n");
}

export function renderReportSummaryHtml(data: ReportSummaryEmailData): string {
  const tone = riskTone(data.riskLevel);
  const date = formatAssessmentDate(data.assessmentDate);

  const metricRows = data.metrics
    .map(
      (m) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid ${HAIRLINE};font-size:14px;color:${INK_SOFT};">${escapeHtml(m.label)}</td>
                <td style="padding:10px 0;border-bottom:1px solid ${HAIRLINE};font-size:14px;color:${INK};font-weight:600;text-align:right;">${escapeHtml(m.value)}</td>
              </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(reportSummarySubject(data))}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <!-- Preview text: what shows in the inbox list next to the subject. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(data.overallStatus)} — open SoleIQ to see your full results.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

          <tr>
            <td style="padding-bottom:24px;">
              <span style="font-size:18px;font-weight:700;color:${PRIMARY};letter-spacing:-0.01em;">SoleIQ Health</span>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:8px;">
              <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:700;color:${INK};">Your foot check is ready</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0;font-size:15px;line-height:1.5;color:${INK_SOFT};">
                ${escapeHtml(data.patientName)} &middot; ${escapeHtml(date)}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:${tone.bg};border-radius:999px;padding:6px 14px;">
                    <span style="font-size:13px;font-weight:700;color:${tone.fg};">${escapeHtml(tone.label)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:20px;">
              <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${INK};font-weight:600;">${escapeHtml(data.overallStatus)}</p>
              <p style="margin:0;font-size:15px;line-height:1.6;color:${INK};">${escapeHtml(data.summaryText)}</p>
            </td>
          </tr>

          ${
            data.metrics.length > 0
              ? `<tr>
            <td style="padding-bottom:24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${HAIRLINE};">${metricRows}
              </table>
            </td>
          </tr>`
              : ""
          }

          <tr>
            <td style="padding-bottom:28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:${PRIMARY};border-radius:12px;">
                    <a href="${escapeHtml(data.reportUrl)}"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">
                      See my full results
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="border-top:1px solid ${HAIRLINE};padding-top:20px;">
              <p style="margin:0 0 10px;font-size:12px;line-height:1.5;color:${INK_SOFT};">
                SoleIQ is decision support &mdash; not a diagnosis. Always combine it with a
                clinical examination. If something feels urgent, contact your care team.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:${INK_SOFT};">
                Sent to ${escapeHtml(data.patientEmail)} because you completed a SoleIQ foot check.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
