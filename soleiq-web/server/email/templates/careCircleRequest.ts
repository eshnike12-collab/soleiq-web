import { escapeHtml } from "./reportSummary";

/**
 * "Someone has asked to see your foot checks."
 *
 * Pure functions, same as the other templates: data in, strings out, no
 * network and no env, so the markup is testable without a mail account.
 *
 * WHAT THIS EMAIL CARRIES, AND WHY
 *
 * It names the REQUESTER — their name, stated relationship, and organization
 * where they gave one — because that is the only thing the patient can
 * actually judge. It carries nothing about the patient's own health: no
 * result, no risk level, no photograph. The decision this email asks for is
 * about access, and access can be decided without restating the record.
 *
 * The relationship is the requester's own claim, and is labelled as such. The
 * product cannot verify that someone is a district nurse, and presenting an
 * unverified claim as a fact is how a patient is talked into approving a
 * stranger.
 */

export interface CareCircleRequestData {
  requesterName: string;
  /** The requester's own words. Shown as a claim, never as verified fact. */
  relationship: string;
  organization: string | null;
  /** Absolute link to the approval screen. Built from APP_BASE_URL. */
  reviewUrl: string;
}

const PRIMARY = "#1B64CC";
const INK = "#1F2D3D";
const INK_SOFT = "#546478";
const HAIRLINE = "#E5EBF0";

export function careCircleRequestSubject(): string {
  // Deliberately not "<Name> wants access": a subject line is visible on a
  // lock screen, and the person's name belongs behind the sign-in.
  return "Someone has asked to see your SoleIQ foot checks";
}

export function renderCareCircleRequestText(data: CareCircleRequestData): string {
  const lines = [
    "Someone has asked to see your SoleIQ foot checks.",
    "",
    `Name: ${data.requesterName}`,
    `They say they are: ${data.relationship}`,
  ];
  if (data.organization) lines.push(`Organization: ${data.organization}`);
  lines.push(
    "",
    "These details are what they told us. We have not verified them.",
    "",
    "They cannot see anything until you approve. Review the request:",
    data.reviewUrl,
    "",
    "If you were not expecting this, decline it. You can also ignore this email — nothing is shared unless you approve.",
    "",
    "---",
    "SoleIQ is a wellness monitoring tool and is not a substitute for professional medical diagnosis.",
  );
  return lines.join("\n");
}

export function renderCareCircleRequestHtml(data: CareCircleRequestData): string {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid ${HAIRLINE};color:${INK_SOFT};font-size:14px;">${escapeHtml(
        label
      )}</td>
      <td style="padding:9px 0;border-bottom:1px solid ${HAIRLINE};color:${INK};font-size:15px;font-weight:600;text-align:right;">${escapeHtml(
        value
      )}</td>
    </tr>`;

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    careCircleRequestSubject()
  )}</title></head>
<body style="margin:0;padding:0;background:#F7FBFE;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7FBFE;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid ${HAIRLINE};">
        <tr><td style="background:${PRIMARY};padding:24px 28px;">
          <span style="color:#FFFFFF;font-family:Inter,Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;">SoleIQ</span>
        </td></tr>

        <tr><td style="padding:28px 28px 0 28px;font-family:Inter,Helvetica,Arial,sans-serif;">
          <h1 style="margin:0 0 10px 0;color:${INK};font-size:22px;font-weight:700;line-height:1.3;">
            Someone has asked to see your foot checks
          </h1>
          <p style="margin:0 0 18px 0;color:${INK_SOFT};font-size:15px;line-height:1.6;">
            They cannot see anything at all unless you approve.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${row("Name", data.requesterName)}
            ${row("They say they are", data.relationship)}
            ${data.organization ? row("Organization", data.organization) : ""}
          </table>
          <p style="margin:14px 0 0 0;color:${INK_SOFT};font-size:13px;line-height:1.6;">
            These details are what they told us. We have not verified them.
          </p>
        </td></tr>

        <tr><td style="padding:22px 28px 26px 28px;font-family:Inter,Helvetica,Arial,sans-serif;">
          <a href="${escapeHtml(data.reviewUrl)}"
             style="display:inline-block;background:${PRIMARY};color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;padding:14px 26px;border-radius:12px;">
            Review this request
          </a>
          <p style="margin:18px 0 0 0;color:${INK_SOFT};font-size:13px;line-height:1.6;">
            If you were not expecting this, decline it. You can also ignore
            this email — nothing is shared unless you approve.
          </p>
          <p style="margin:18px 0 0 0;padding-top:18px;border-top:1px solid ${HAIRLINE};color:${INK_SOFT};font-size:12px;line-height:1.6;">
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
