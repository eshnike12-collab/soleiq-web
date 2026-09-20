import { z } from "zod";
import { apiHandler } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import {
  ensureMySchedule,
  setMySchedulePaused,
  snoozeMySchedule,
} from "@/server/rescan";
import {
  duePhrase,
  rescanUrgency,
  shouldShowReminder,
  daysUntilDue,
  type RescanSchedule,
} from "@/lib/rescan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The patient's own reminder schedule.
 *
 * GET is create-or-read: the first call for an account creates the row, which
 * is what "signing in starts the seven-day timer" actually means in practice.
 * Putting it on a GET the home screen already makes means a patient who
 * arrives from a restored session, a bookmark, or an email link is enrolled
 * exactly as reliably as one who typed their password — there is no login
 * event to miss.
 *
 * Idempotent: the create is an `on conflict do nothing` inside the function,
 * so refreshing the page does not restart anybody's timer.
 */

const ActionSchema = z.object({
  action: z.enum(["snooze", "pause", "resume"]),
  /** Only read for `snooze`. Bounded again server-side. */
  days: z.number().int().min(1).max(30).optional(),
});

function present(schedule: RescanSchedule | null) {
  if (!schedule) {
    // No row and no table: an environment without the migration. The home
    // screen renders without a reminder rather than erroring.
    return { available: false as const };
  }
  const now = Date.now();
  return {
    available: true as const,
    urgency: rescanUrgency(schedule, now),
    show: shouldShowReminder(schedule, now),
    dueAt: new Date(schedule.dueAt).toISOString(),
    daysUntilDue: daysUntilDue(schedule.dueAt, now),
    duePhrase: duePhrase(schedule, now),
    lastScanAt: schedule.lastScanAt
      ? new Date(schedule.lastScanAt).toISOString()
      : null,
    firstCheck: schedule.lastScanAt === null,
    streakCount: schedule.streakCount,
    longestStreak: schedule.longestStreak,
    paused: schedule.paused,
    intervalDays: schedule.intervalDays,
  };
}

export async function GET(request: Request) {
  return apiHandler(request, async () => present(await ensureMySchedule()));
}

export async function POST(request: Request) {
  return apiHandler(request, async (meta) => {
    enforceRateLimit(`rescan:${meta.ip ?? "unknown"}`, 20, 60_000);
    const body = ActionSchema.parse(await request.json());
    // Ensure first so a patient whose row does not exist yet can still act on
    // the card instead of getting a silent no-op.
    await ensureMySchedule();
    if (body.action === "snooze") {
      return present(await snoozeMySchedule(body.days ?? 2));
    }
    return present(await setMySchedulePaused(body.action === "pause"));
  });
}
