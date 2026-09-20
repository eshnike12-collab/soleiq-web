import { escapeHtml } from "./reportSummary";

/**
 * The "time for your weekly foot check" email.
 *
 * Pure functions, same as reportSummary: data in, strings out, no network and
 * no env, so the markup is unit-testable without a mail account.
 *
 * WHAT THIS EMAIL DELIBERATELY DOES NOT DO
 *
 * It carries no findings, no risk level, no photographs, and no history — not
 * even "your last check found X". A reminder is sent on a timer to an inbox
 * that may sit unlocked on a shared phone, and the recipient has not
 * authenticated to read it. The only clinical fact it discloses is that the
 * person uses a foot-monitoring app, which they already knew.
 *
 * The streak is the one number it does carry, because a streak is not
 * clinical: it counts how often somebody opened an app.
 *
 * TONE
 *
 * Overdue does not mean alarmed. Someone eleven days late may have been in
 * hospital, or unwell, or simply having a hard month, and an email that
 * implies they have failed is an email that makes the app something to avoid.
 * The overdue copy is warmer than the on-time copy, not sterner.
 */

export interface RescanReminderEmailData {
  patientName: string;
  /** Whole days past due. 0 = due today, negative never reaches here. */
  daysOverdue: number;
  /** Consecutive on-time checks before this one lapsed. 0 when none. */
  streakCount: number;
  longestStreak: number;
  /** True when the patient has never completed a check. */
  firstCheck: boolean;
  /** Absolute link that starts a check. Built from APP_BASE_URL. */
  checkUrl: string;
  /** Absolute link to reminder settings, for the unsubscribe line. */
  settingsUrl: string;
}

const PRIMARY = "#1F4E79";
const INK = "#262420";
const INK_SOFT = "#5A554C";
const HAIRLINE = "#E4DFD3";
const STREAK_BG = "#FBF4E3";
const STREAK_FG = "#96701A";

export function rescanReminderSubject(data: RescanReminderEmailData): string {
  if (data.firstCheck) return "Your first SoleIQ foot check is ready";
  if (data.streakCount >= 2) {
    return `Keep your ${data.streakCount}-week streak — foot check due`;
  }
  if (data.daysOverdue >= 4) return "Your foot check is waiting";
  return "Time for your weekly foot check";
}

/** The one-line reason, matched to how late they are. */
function headline(data: RescanReminderEmailData): string {
  if (data.firstCheck) {
    return "Take your first check to set your baseline";
  }
  if (data.daysOverdue >= 4) return "It has been a little while";
  if (data.daysOverdue >= 1) return "Your weekly check is due";
  return "Your weekly check is due today";
}

/**
 * Why it is worth two minutes. Concrete, and different for the first check —
 * a baseline is a genuinely different thing from a repeat.
 */
function reason(data: RescanReminderEmailData): string {
  if (data.firstCheck) {
    return "Your first set of photos becomes your baseline — the reference every later check is compared against. Without it, changes have nothing to be measured from.";
  }
  return "A weekly photo is how small changes get caught while they are still small. It takes about two minutes, and your care team sees the same pictures you do.";
}

export function renderRescanReminderText(data: RescanReminderEmailData): string {
  const lines = [
    `Hello ${data.patientName},`,
    "",
    headline(data) + ".",
    "",
    reason(data),
  ];
  if (!data.firstCheck && data.streakCount >= 2) {
    lines.push("", `You are on a ${data.streakCount}-week run of on-time checks.`);
  }
  lines.push(
    "",
    "Start your check:",
    data.checkUrl,
    "",
    "---",
    "SoleIQ is a wellness monitoring tool and is not a substitute for professional medical diagnosis.",
    `Change or turn off these reminders: ${data.settingsUrl}`
  );
  return lines.join("\n");
}

export function renderRescanReminderHtml(data: RescanReminderEmailData): string {
  const name = escapeHtml(data.patientName);
  const streakChip =
    !data.firstCheck && data.streakCount >= 2
      ? `<tr><td style="padding:0 0 20px 0;">
           <span style="display:inline-block;background:${STREAK_BG};color:${STREAK_FG};font-size:13px;font-weight:700;padding:7px 14px;border-radius:999px;">
             ${data.streakCount}-week streak${
               data.longestStreak > data.streakCount
                 ? ` &middot; best ${data.longestStreak}`
                 : ""
             }
           </span>
         </td></tr>`
      : "";

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    rescanReminderSubject(data)
  )}</title></head>
<body style="margin:0;padding:0;background:#F7F4EC;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F4EC;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;">
        <tr><td style="background:${PRIMARY};padding:24px 28px;">
          <span style="color:#FFFFFF;font-family:Inter,Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;letter-spacing:-0.01em;">SoleIQ</span>
        </td></tr>
        <tr><td style="padding:28px 28px 8px 28px;font-family:Inter,Helvetica,Arial,sans-serif;">
          <p style="margin:0 0 6px 0;color:${INK_SOFT};font-size:15px;">Hello ${name},</p>
          <h1 style="margin:0 0 14px 0;color:${INK};font-size:22px;font-weight:700;line-height:1.3;">${escapeHtml(
            headline(data)
          )}</h1>
        </td></tr>
        <tr><td style="padding:0 28px;font-family:Inter,Helvetica,Arial,sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${streakChip}
            <tr><td style="padding:0 0 22px 0;">
              <p style="margin:0;color:${INK};font-size:15px;line-height:1.6;">${escapeHtml(
                reason(data)
              )}</p>
            </td></tr>
            <tr><td style="padding:0 0 26px 0;">
              <a href="${escapeHtml(data.checkUrl)}"
                 style="display:inline-block;background:${PRIMARY};color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;padding:14px 26px;border-radius:12px;">
                Start my foot check
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 28px 26px 28px;border-top:1px solid ${HAIRLINE};font-family:Inter,Helvetica,Arial,sans-serif;">
          <p style="margin:18px 0 0 0;color:${INK_SOFT};font-size:12px;line-height:1.6;">
            SoleIQ is a wellness monitoring tool and is not a substitute for professional medical diagnosis.
          </p>
          <p style="margin:10px 0 0 0;color:${INK_SOFT};font-size:12px;line-height:1.6;">
            <a href="${escapeHtml(data.settingsUrl)}" style="color:${PRIMARY};">Change or turn off these reminders</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
