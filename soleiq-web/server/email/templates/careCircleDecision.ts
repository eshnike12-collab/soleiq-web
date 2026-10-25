import { escapeHtml } from "./reportSummary";

/**
 * The outcome of an access request, to whoever asked.
 *
 * Sent either way. A request that is silently declined leaves someone
 * refreshing a screen that will never change, and a decline is not a thing to
 * be embarrassed about delivering — it is the patient's answer.
 *
 * CARRIES NO PATIENT DATA AT ALL. Not the patient's name, not their email,
 * not a result. On the declined path it must not even confirm that a
 * particular person uses SoleIQ — so the copy says what happened to "your
 * request" and names nobody.
 */

export interface CareCircleDecisionData {
  approved: boolean;
  appUrl: string;
}

const PRIMARY = "#1B64CC";
const POSITIVE = "#27694A";
const INK = "#1F2D3D";
const INK_SOFT = "#546478";
const HAIRLINE = "#E5EBF0";

export function careCircleDecisionSubject(approved: boolean): string {
  return approved
    ? "Your SoleIQ access request was approved"
    : "Your SoleIQ access request was not approved";
}

export function renderCareCircleDecisionText(data: CareCircleDecisionData): string {
  const lines = data.approved
    ? [
        "Your access request was approved.",
        "",
        "You can now see that person's foot checks in SoleIQ. They can withdraw this at any time.",
        "",
        `Open SoleIQ: ${data.appUrl}`,
      ]
    : [
        "Your access request was not approved.",
        "",
        "Nothing has been shared with you. If you think this was a mistake, speak to them directly — please do not send another request without asking first.",
      ];
  lines.push(
    "",
    "---",
    "SoleIQ is a wellness monitoring tool and is not a substitute for professional medical diagnosis."
  );
  return lines.join("\n");
}

export function renderCareCircleDecisionHtml(
  data: CareCircleDecisionData
): string {
  const accent = data.approved ? POSITIVE : INK_SOFT;
  const body = data.approved
    ? `You can now see that person's foot checks in SoleIQ. They can withdraw
       this at any time.`
    : `Nothing has been shared with you. If you think this was a mistake,
       speak to them directly — please do not send another request without
       asking first.`;

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    careCircleDecisionSubject(data.approved)
  )}</title></head>
<body style="margin:0;padding:0;background:#F7FBFE;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7FBFE;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid ${HAIRLINE};">
        <tr><td style="background:${PRIMARY};padding:24px 28px;">
          <span style="color:#FFFFFF;font-family:Inter,Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;">SoleIQ</span>
        </td></tr>
        <tr><td style="padding:28px 28px 26px 28px;font-family:Inter,Helvetica,Arial,sans-serif;">
          <h1 style="margin:0 0 12px 0;color:${accent};font-size:22px;font-weight:700;line-height:1.3;">
            ${data.approved ? "Request approved" : "Request not approved"}
          </h1>
          <p style="margin:0;color:${INK};font-size:15px;line-height:1.6;">${body}</p>
          ${
            data.approved
              ? `<p style="margin:22px 0 0 0;">
                   <a href="${escapeHtml(data.appUrl)}"
                      style="display:inline-block;background:${PRIMARY};color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;padding:13px 24px;border-radius:12px;">
                     Open SoleIQ
                   </a>
                 </p>`
              : ""
          }
          <p style="margin:22px 0 0 0;padding-top:18px;border-top:1px solid ${HAIRLINE};color:${INK_SOFT};font-size:12px;line-height:1.6;">
            SoleIQ is a wellness monitoring tool and is not a substitute for
            professional medical diagnosis.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
