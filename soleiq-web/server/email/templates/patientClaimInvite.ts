import { escapeHtml } from "./reportSummary";

/**
 * "Take control of your SoleIQ record."
 *
 * This email asks someone to take ownership of medical information that
 * already exists about them, created by somebody else. So it answers the four
 * questions a person in that position actually has, in that order, before it
 * asks for anything:
 *
 *   who made this, what is already in it, what claiming it means, and
 *   can I get rid of the person who made it.
 *
 * The last one is answered explicitly rather than left implied, because a
 * record you cannot take full control of is not worth claiming.
 */

export interface PatientClaimInviteData {
  /** The name on the record, which may not be how they refer to themselves. */
  patientName: string;
  caregiverName: string;
  organizationName: string;
  /** Checks already in the record, so "what is in it" is a fact, not a vague. */
  checkCount: number;
  claimUrl: string;
  expiresInDays: number;
  /** The address that must be signed in as — stated, so a mismatch is obvious. */
  invitedEmail: string;
}

const PRIMARY = "#1B64CC";
const INK = "#1F2D3D";
const INK_SOFT = "#546478";
const HAIRLINE = "#CFE4F9";

export function patientClaimInviteSubject(): string {
  return "Take control of your SoleIQ foot-health record";
}

const whatIsInIt = (checkCount: number) =>
  checkCount === 0
    ? "The record has your name and date of birth so far. No foot checks have been done yet."
    : checkCount === 1
      ? "It already holds one foot check — the photos taken and the result."
      : `It already holds ${checkCount} foot checks — the photos taken and the results.`;

/** The four questions, as sentences. Shared by both the text and HTML parts. */
function paragraphs(data: PatientClaimInviteData): string[] {
  const who = data.patientName.trim()
    ? `A SoleIQ foot-health record was created for ${data.patientName.trim()}`
    : "A SoleIQ foot-health record was created for you";
  return [
    `${who} by ${data.caregiverName} at ${data.organizationName}, who has been looking after it on your behalf.`,
    whatIsInIt(data.checkCount),
    "If you take control of it, the record becomes yours. You sign in with your own account, you see the full history including anything already in it, and you decide from then on who else can look at it.",
    `${data.caregiverName} stays in your care circle so they can keep helping — but you can remove them at any time, from Privacy & access in the app. That is your decision alone, and it takes effect immediately.`,
    "If you would rather not take it over, you can ignore this email. Nothing changes and nobody loses access.",
  ];
}

export function renderPatientClaimInviteText(
  data: PatientClaimInviteData
): string {
  return [
    ...paragraphs(data),
    "",
    `Take control of your record:`,
    data.claimUrl,
    "",
    `Sign in with this email address (${data.invitedEmail}) — the link only works for that account, so nobody else can claim the record for you.`,
    `The link stops working in ${data.expiresInDays} days. If it has expired, the page will offer to ask for a new one.`,
    "",
    "SoleIQ is a screening aid and does not provide a diagnosis.",
  ].join("\n");
}

export function renderPatientClaimInviteHtml(
  data: PatientClaimInviteData
): string {
  const body = paragraphs(data)
    .map(
      (text) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${INK_SOFT};">${escapeHtml(
          text
        )}</p>`
    )
    .join("");

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F7FBFE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid ${HAIRLINE};border-radius:16px;padding:28px;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${PRIMARY};">SoleIQ Health</p>
    <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:${INK};">Take control of your foot-health record</h1>
    ${body}
    <p style="margin:24px 0 8px;">
      <a href="${escapeHtml(data.claimUrl)}"
         style="display:inline-block;background:${PRIMARY};color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:12px;">
        Take control of my record
      </a>
    </p>
    <p style="margin:12px 0 0;font-size:13px;line-height:1.6;color:${INK_SOFT};">
      Sign in with <strong style="color:${INK};">${escapeHtml(data.invitedEmail)}</strong>.
      The link only works for that account, so nobody else can claim the record for you.
      It stops working in ${data.expiresInDays} days.
    </p>
    <hr style="border:none;border-top:1px solid ${HAIRLINE};margin:22px 0 14px;" />
    <p style="margin:0;font-size:12px;line-height:1.6;color:${INK_SOFT};">
      SoleIQ is a screening aid and does not provide a diagnosis.
    </p>
  </div>
</body></html>`;
}
