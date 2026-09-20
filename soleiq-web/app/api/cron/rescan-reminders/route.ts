import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { appBaseUrl, sendEmail } from "@/server/email/client";
import {
  renderRescanReminderHtml,
  renderRescanReminderText,
  rescanReminderSubject,
} from "@/server/email/templates/rescanReminder";
import { dueReminderCandidates, markReminderSent } from "@/server/rescan";
import { shouldSendReminderEmail, daysUntilDue } from "@/lib/rescan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily sweep that emails patients whose weekly check is due.
 *
 * FAIL CLOSED. This endpoint sends mail to many real people at once, so an
 * unauthenticated request must never reach the send loop. With no CRON_SECRET
 * configured it refuses every request including Vercel's own — a silent
 * reminder outage is recoverable, an open mass-mail endpoint is not.
 *
 * Whether any individual person is emailed is decided by
 * `shouldSendReminderEmail`, not here: pacing, the per-cycle cap, pause and
 * snooze all live in lib/rescan.ts where they are unit-tested. This route
 * chooses nobody; it only delivers.
 *
 * The in-app banner does not depend on this job. If the cron never runs, a
 * patient still sees their reminder the next time they open the app — which
 * is why the banner, not the email, is the channel that actually guarantees
 * the reminder arrives.
 */

/** Constant-time compare that also tolerates different lengths. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  return secretMatches(token, expected);
}

async function sweep() {
  const now = new Date();
  const candidates = await dueReminderCandidates(now);

  let considered = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const candidate of candidates) {
    considered += 1;
    if (!shouldSendReminderEmail(candidate.schedule, now.getTime())) {
      skipped += 1;
      continue;
    }

    const data = {
      // First name only, and "there" when we have nothing — a reminder should
      // not be the thing that puts a full legal name in a preview pane.
      patientName: candidate.name?.trim().split(/\s+/)[0] || "there",
      daysOverdue: Math.max(0, -daysUntilDue(candidate.schedule.dueAt, now.getTime())),
      streakCount: candidate.schedule.streakCount,
      longestStreak: candidate.schedule.longestStreak,
      firstCheck: candidate.schedule.lastScanAt === null,
      checkUrl: `${appBaseUrl()}/?utm_source=rescan_reminder`,
      settingsUrl: `${appBaseUrl()}/home`,
    };

    const result = await sendEmail({
      to: candidate.email,
      subject: rescanReminderSubject(data),
      html: renderRescanReminderHtml(data),
      text: renderRescanReminderText(data),
    });

    if (result.ok) {
      // Recorded only on a confirmed send, so a provider outage does not burn
      // this cycle's allowance and leave the patient silently un-nudged.
      await markReminderSent(
        candidate.userId,
        candidate.schedule.emailsThisCycle,
        now
      );
      sent += 1;
    } else if (result.reason === "not_configured") {
      skipped += 1;
    } else {
      failed += 1;
    }
  }

  return { considered, sent, skipped, failed };
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    // No detail: an unauthorized caller learns nothing about whether the
    // secret is set, only that it cannot do this.
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const summary = await sweep();
    // Counts only. Never the addresses.
    console.info("[rescan] reminder sweep:", JSON.stringify(summary));
    return NextResponse.json({ ok: true, ...summary });
  } catch (cause) {
    console.error(
      "[rescan] reminder sweep failed:",
      cause instanceof Error ? cause.message : "unknown error"
    );
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
