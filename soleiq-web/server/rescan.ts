import "server-only";

import { requireAuth } from "./auth";
import { infrastructureClient } from "./storage";
import {
  RESCAN_INTERVAL_DAYS,
  type RescanSchedule,
  DAY_MS,
} from "@/lib/rescan";

/**
 * Database side of the weekly check reminder. The rules live in lib/rescan.ts;
 * this file only reads and writes rows.
 *
 * Two clients, on purpose:
 *
 *   Patient-facing reads and writes (ensure, snooze, pause) go through the
 *   caller's own session, so RLS is what enforces "your own row" rather than
 *   a `where user_id = ...` I have to remember to write correctly every time.
 *
 *   Completing a check and sending reminders go through the service role,
 *   because both run where no patient session exists — the analysis worker
 *   and the cron job.
 */

export interface RescanScheduleRow {
  user_id: string;
  interval_days: number;
  due_at: string;
  last_scan_at: string | null;
  snoozed_until: string | null;
  paused: boolean;
  streak_count: number;
  longest_streak: number;
  last_email_at: string | null;
  emails_this_cycle: number;
}

const COLUMNS =
  "user_id, interval_days, due_at, last_scan_at, snoozed_until, paused, streak_count, longest_streak, last_email_at, emails_this_cycle";

/** Postgres timestamptz → epoch ms, or null. */
function ms(value: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function toSchedule(row: RescanScheduleRow): RescanSchedule {
  return {
    intervalDays: row.interval_days ?? RESCAN_INTERVAL_DAYS,
    dueAt: ms(row.due_at) ?? Date.now(),
    lastScanAt: ms(row.last_scan_at),
    snoozedUntil: ms(row.snoozed_until),
    paused: Boolean(row.paused),
    streakCount: row.streak_count ?? 0,
    longestStreak: row.longest_streak ?? 0,
    lastEmailAt: ms(row.last_email_at),
    emailsThisCycle: row.emails_this_cycle ?? 0,
  };
}

/**
 * The signed-in patient's schedule, created if this is their first sign-in.
 *
 * This is the "signing in starts the seven-day timer" step. It runs on every
 * load of the patient home screen rather than only on the login event, which
 * makes it self-healing: a patient whose row was never created (signed up
 * before this shipped, or a failed write) gets one the next time they open the
 * app, instead of silently never being reminded.
 *
 * Returns null rather than throwing when the table has not been migrated yet,
 * so an environment without the migration shows a home screen with no
 * reminder rather than an error page.
 */
export async function ensureMySchedule(): Promise<RescanSchedule | null> {
  // Deliberately OUTSIDE the try: an expired or missing session must surface
  // as 401, not be flattened into "no schedule". Swallowing it here made an
  // unauthenticated GET answer 200 with `available: false`, which reads as
  // "this feature is not installed" — the wrong diagnosis for both the caller
  // and anybody reading the logs later.
  const { supabase } = await requireAuth();
  try {
    const { data, error } = await supabase.rpc("ensure_rescan_schedule");
    if (error) {
      // 42883 undefined_function / 42P01 undefined_table / PGRST202 no such
      // RPC — this environment has not applied the migration yet. A real
      // state, and not one worth an error page over.
      if (error.code === "42883" || error.code === "42P01" || error.code === "PGRST202") {
        return null;
      }
      console.warn("[rescan] ensure failed:", error.message);
      return null;
    }
    const row = (Array.isArray(data) ? data[0] : data) as RescanScheduleRow | null;
    return row ? toSchedule(row) : null;
  } catch (cause) {
    console.warn(
      "[rescan] ensure threw:",
      cause instanceof Error ? cause.message : "unknown error"
    );
    return null;
  }
}

/** Hide the reminder for `days`, at the patient's request. */
export async function snoozeMySchedule(days: number): Promise<RescanSchedule | null> {
  const bounded = Math.min(Math.max(Math.round(days), 1), 30);
  const { supabase, user } = await requireAuth();
  const { data, error } = await supabase
    .from("rescan_schedules")
    .update({ snoozed_until: new Date(Date.now() + bounded * DAY_MS).toISOString() })
    .eq("user_id", user.id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSchedule(data as RescanScheduleRow) : null;
}

/** Turn reminders off, or back on. */
export async function setMySchedulePaused(
  paused: boolean
): Promise<RescanSchedule | null> {
  const { supabase, user } = await requireAuth();
  const { data, error } = await supabase
    .from("rescan_schedules")
    .update({ paused, ...(paused ? {} : { snoozed_until: null }) })
    .eq("user_id", user.id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSchedule(data as RescanScheduleRow) : null;
}

/**
 * Roll a patient's cycle forward because a check finished.
 *
 * Called from the analysis worker with the service-role client. Never throws:
 * a reminder-calendar write must not be able to fail a released report.
 */
export async function recordScanCompleted(
  userId: string,
  scanAt: Date = new Date()
): Promise<void> {
  if (!userId) return;
  try {
    const infra = infrastructureClient();
    const { error } = await infra.rpc("record_rescan_completed", {
      p_user_id: userId,
      p_scan_at: scanAt.toISOString(),
    });
    if (error && error.code !== "42883" && error.code !== "PGRST202") {
      console.warn("[rescan] record failed:", error.message);
    }
  } catch (cause) {
    console.warn(
      "[rescan] record threw:",
      cause instanceof Error ? cause.message : "unknown error"
    );
  }
}

/**
 * The account behind a screening session, or null when the patient record has
 * never been linked to a login (hospital-entered patients often have not).
 */
export async function linkedUserForSession(
  sessionId: string
): Promise<string | null> {
  try {
    const infra = infrastructureClient();
    const { data, error } = await infra
      .from("screening_sessions")
      .select(
        "organization_patients!inner(patients!inner(linked_user_id))"
      )
      .eq("id", sessionId)
      .maybeSingle();
    if (error || !data) return null;
    const linked = (data as any)?.organization_patients?.patients?.linked_user_id;
    return typeof linked === "string" && linked ? linked : null;
  } catch {
    return null;
  }
}

export interface ReminderCandidate {
  schedule: RescanSchedule;
  userId: string;
  email: string;
  name: string | null;
}

/**
 * Patients whose check is due, with the address to write to.
 *
 * Filtered in SQL down to rows that could plausibly need an email; the final
 * decision — pacing, per-cycle cap — is `shouldSendReminderEmail`, so the
 * rule that governs whether a real person is emailed has exactly one
 * definition and it is the tested one.
 */
export async function dueReminderCandidates(
  now: Date,
  limit = 200
): Promise<ReminderCandidate[]> {
  const infra = infrastructureClient();
  const { data, error } = await infra
    .from("rescan_schedules")
    .select(COLUMNS)
    .eq("paused", false)
    .lte("due_at", now.toISOString())
    .order("due_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as RescanScheduleRow[];
  if (rows.length === 0) return [];

  const { data: profiles, error: profileError } = await infra
    .from("profiles")
    .select("id, email, full_name")
    .in(
      "id",
      rows.map((row) => row.user_id)
    );
  if (profileError) throw new Error(profileError.message);

  const byId = new Map(
    (profiles ?? []).map((profile: any) => [profile.id as string, profile])
  );
  const candidates: ReminderCandidate[] = [];
  for (const row of rows) {
    const profile = byId.get(row.user_id);
    const email = typeof profile?.email === "string" ? profile.email.trim() : "";
    if (!email) continue;
    candidates.push({
      schedule: toSchedule(row),
      userId: row.user_id,
      email,
      name: profile?.full_name ?? null,
    });
  }
  return candidates;
}

/** Record that a reminder went out, so pacing and the per-cycle cap work. */
export async function markReminderSent(
  userId: string,
  emailsThisCycle: number,
  at: Date = new Date()
): Promise<void> {
  try {
    const infra = infrastructureClient();
    await infra
      .from("rescan_schedules")
      .update({
        last_email_at: at.toISOString(),
        emails_this_cycle: emailsThisCycle + 1,
      })
      .eq("user_id", userId);
  } catch (cause) {
    console.warn(
      "[rescan] mark sent threw:",
      cause instanceof Error ? cause.message : "unknown error"
    );
  }
}
