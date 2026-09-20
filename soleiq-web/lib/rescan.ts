/**
 * The weekly foot-check cycle: when the next check is due, how overdue it is,
 * whether to email about it, and the streak that makes coming back worth it.
 *
 * Pure arithmetic over a plain object. No database, no clock of its own —
 * `now` is always passed in — so every rule below is directly testable, which
 * matters because these rules decide whether a real person is emailed.
 *
 * Diabetic foot guidance is a daily self-check and a professional review at an
 * interval set by risk. A weekly photo check is a deliberate middle: often
 * enough that a new ulcer is caught while it is still small, rare enough that
 * people actually keep doing it. Seven days is the default, not a constant —
 * `intervalDays` is per-patient so a care team can tighten it for someone
 * high-risk without a code change.
 */

export const DAY_MS = 86_400_000;

/** Default cycle. A patient's row may override it. */
export const RESCAN_INTERVAL_DAYS = 7;

/**
 * How late a check can be and still continue the streak.
 *
 * A streak that snaps the instant the seventh day ends punishes a bad week and
 * teaches people to stop trying. A full extra week to recover keeps the number
 * meaningful — you did check in, roughly weekly — while still being losable.
 */
export const STREAK_GRACE_DAYS = 7;

/** Days before the due date the reminder starts showing as upcoming. */
export const DUE_SOON_DAYS = 2;

/** Days past due before the reminder escalates from "due" to "overdue". */
export const OVERDUE_AFTER_DAYS = 3;

/** Minimum gap between two reminder emails, so a late week is not a pile-on. */
export const EMAIL_MIN_GAP_DAYS = 3;

/**
 * Reminder emails per cycle before falling silent.
 *
 * After this many unanswered nudges the in-app banner carries on alone. Some
 * people are in hospital, travelling, or simply done with email; continuing to
 * send is how a health reminder becomes spam, and a spam complaint costs the
 * sending domain its reputation for every other patient.
 */
export const MAX_EMAILS_PER_CYCLE = 3;

export interface RescanSchedule {
  intervalDays: number;
  /** Epoch ms the next check is due. */
  dueAt: number;
  /** Epoch ms of the most recent completed check, or null if never. */
  lastScanAt: number | null;
  /** Epoch ms until which the patient asked not to be nudged. */
  snoozedUntil: number | null;
  paused: boolean;
  streakCount: number;
  longestStreak: number;
  /** Epoch ms the last reminder email went out. */
  lastEmailAt: number | null;
  /** Reminder emails sent since the current cycle began. */
  emailsThisCycle: number;
}

export type RescanUrgency =
  /** Turned off by the patient. */
  | "paused"
  /** Temporarily hidden at the patient's request. */
  | "snoozed"
  /** Nothing to do yet. */
  | "on_track"
  /** Due within DUE_SOON_DAYS. */
  | "due_soon"
  /** Due now, or up to OVERDUE_AFTER_DAYS late. */
  | "due"
  /** More than OVERDUE_AFTER_DAYS late. */
  | "overdue";

/** Whole days until the check is due. Negative when it is late. */
export function daysUntilDue(dueAt: number, now: number): number {
  return Math.floor((dueAt - now) / DAY_MS);
}

/** When a check taken at `fromMs` puts the next one. */
export function nextDueAt(fromMs: number, intervalDays = RESCAN_INTERVAL_DAYS): number {
  return fromMs + intervalDays * DAY_MS;
}

export function rescanUrgency(
  schedule: RescanSchedule,
  now: number
): RescanUrgency {
  if (schedule.paused) return "paused";
  if (schedule.snoozedUntil !== null && schedule.snoozedUntil > now) {
    return "snoozed";
  }
  const days = daysUntilDue(schedule.dueAt, now);
  if (days < -OVERDUE_AFTER_DAYS) return "overdue";
  if (days <= 0) return "due";
  if (days <= DUE_SOON_DAYS) return "due_soon";
  return "on_track";
}

/** True when the patient should be shown a reminder at all. */
export function shouldShowReminder(
  schedule: RescanSchedule,
  now: number
): boolean {
  const urgency = rescanUrgency(schedule, now);
  return urgency === "due_soon" || urgency === "due" || urgency === "overdue";
}

/**
 * The streak after a check completes.
 *
 * First ever check starts at one. A check inside the cycle plus its grace
 * period continues the run; anything later starts a fresh one — at one, not
 * zero, because the check they just took does count.
 */
export function streakAfterScan(input: {
  previousStreak: number;
  lastScanAt: number | null;
  dueAt: number;
  scanAt: number;
  graceDays?: number;
}): number {
  const grace = input.graceDays ?? STREAK_GRACE_DAYS;
  if (input.lastScanAt === null) return 1;
  const deadline = input.dueAt + grace * DAY_MS;
  if (input.scanAt <= deadline) return Math.max(1, input.previousStreak) + 1;
  return 1;
}

/**
 * The schedule after a check completes at `scanAt`.
 *
 * READ THIS BEFORE CHANGING IT. In production the equivalent work is done by
 * `record_rescan_completed` in
 * supabase/migrations/202609190011_rescan_reminders.sql, not here — checks
 * complete inside the analysis worker on the service-role client, where no
 * patient session exists, and doing it in one SQL statement keeps the
 * read-modify-write atomic.
 *
 * So this function is the executable specification of that rule rather than
 * the thing that runs, and tests/rescan.test.ts pins it. The two must agree;
 * if you change the streak or due-date behaviour, change both. They currently
 * match line for line: first check starts at 1, a check within the cycle plus
 * one grace week continues the run, anything later restarts at 1, the best
 * streak is kept, and a completed check clears the snooze and the cycle's
 * email allowance.
 */
export function applyScan(
  schedule: RescanSchedule,
  scanAt: number
): RescanSchedule {
  const streakCount = streakAfterScan({
    previousStreak: schedule.streakCount,
    lastScanAt: schedule.lastScanAt,
    dueAt: schedule.dueAt,
    scanAt,
  });
  return {
    ...schedule,
    lastScanAt: scanAt,
    dueAt: nextDueAt(scanAt, schedule.intervalDays),
    streakCount,
    longestStreak: Math.max(schedule.longestStreak, streakCount),
    // A completed check ends the cycle: clear the snooze and let the next
    // cycle send its own reminders.
    snoozedUntil: null,
    lastEmailAt: null,
    emailsThisCycle: 0,
  };
}

/**
 * Whether a reminder email should go out right now.
 *
 * Deliberately conservative — every `false` here is an email a patient does
 * not receive, and an unwanted health email is worse than a missed one.
 */
export function shouldSendReminderEmail(
  schedule: RescanSchedule,
  now: number
): boolean {
  if (schedule.paused) return false;
  if (schedule.snoozedUntil !== null && schedule.snoozedUntil > now) return false;
  if (schedule.emailsThisCycle >= MAX_EMAILS_PER_CYCLE) return false;
  if (daysUntilDue(schedule.dueAt, now) > 0) return false;
  if (
    schedule.lastEmailAt !== null &&
    now - schedule.lastEmailAt < EMAIL_MIN_GAP_DAYS * DAY_MS
  ) {
    return false;
  }
  return true;
}

/**
 * Plain-language "when". Short by design: it sits in a banner and in an email
 * subject line, where a sentence would be truncated.
 */
export function duePhrase(schedule: RescanSchedule, now: number): string {
  const days = daysUntilDue(schedule.dueAt, now);
  if (days > 1) return `due in ${days} days`;
  if (days === 1) return "due tomorrow";
  if (days === 0) return "due today";
  const late = Math.abs(days);
  return late === 1 ? "1 day overdue" : `${late} days overdue`;
}
