import { escapeHtml } from "./reportSummary";

/**
 * "Someone shared their SoleIQ results with you."
 *
 * Was plain text only, sent through a raw fetch inside the route. Same words,
 * now with an HTML part and the shared sender, so both emails this app sends
 * look like they come from the same product.
 */

export interface CareCircleInviteData {
  inviterName: string;
  inviteeEmail: string;
  role: "family" | "caregiver" | "clinician";
  appUrl: string;
}

const PRIMARY = "#1F4E79";
const INK = "#262420";
const INK_SOFT = "#5A554C";
const HAIRLINE = "#E4DFD3";

const roleLabel = (role: CareCircleInviteData["role"]) =>
  role === "clinician" ? "a clinician" : `a ${role} member`;

const whatTheySee = (role: CareCircleInviteData["role"]) =>
  role === "clinician"
    ? "You'll see the clinical detail view of their reports."
    : "You'll see their results exactly as they see them.";

export function careCircleInviteSubject(data: CareCircleInviteData): string {
  return `${data.inviterName} shared their SoleIQ foot-check results with you`;
}

export function renderCareCircleInviteText(data: CareCircleInviteData): string {
  return [
    `${data.inviterName} added you to their SoleIQ care circle as ${roleLabel(data.role)}.`,
    "",
    `To see their results, sign in to SoleIQ with this email address (${data.inviteeEmail}):`,
    data.appUrl,
    "",
    whatTheySee(data.role),
    "",
    "If you don't have an account yet, create one with this same email — access connects automatically.",
  ].join("\n");
}

export function renderCareCircleInviteHtml(data: CareCircleInviteData): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(careCircleInviteSubject(data))}</title></head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="padding-bottom:24px;">
          <span style="font-size:18px;font-weight:700;color:${PRIMARY};letter-spacing:-0.01em;">SoleIQ Health</span>
        </td></tr>
        <tr><td style="padding-bottom:12px;">
          <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:700;color:${INK};">
            ${escapeHtml(data.inviterName)} shared their foot-check results with you
          </h1>
        </td></tr>
        <tr><td style="padding-bottom:20px;">
          <p style="margin:0;font-size:15px;line-height:1.6;color:${INK};">
            They added you to their SoleIQ care circle as ${escapeHtml(roleLabel(data.role))}.
            ${escapeHtml(whatTheySee(data.role))}
          </p>
        </td></tr>
        <tr><td style="padding-bottom:20px;">
          <p style="margin:0;font-size:15px;line-height:1.6;color:${INK};">
            Sign in with this email address to see them:
            <strong style="color:${INK};">${escapeHtml(data.inviteeEmail)}</strong>
          </p>
        </td></tr>
        <tr><td style="padding-bottom:28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="background-color:${PRIMARY};border-radius:12px;">
              <a href="${escapeHtml(data.appUrl)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Open SoleIQ</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="border-top:1px solid ${HAIRLINE};padding-top:20px;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:${INK_SOFT};">
            No account yet? Create one with this same email address and access connects automatically.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
