import "server-only";

import { infrastructureClient } from "./storage";
import {
  RISK_ORDER,
  emptyStats,
  type PlatformReportStats,
  type ReportWindow,
} from "@/lib/platformReport";

/**
 * Gathers the monthly platform report's numbers.
 *
 * Runs on the service-role client because the cron job has no signed-in user
 * whose RLS context could authorise a platform-wide count. That is a large
 * key, so what this file is allowed to read is kept deliberately narrow:
 *
 *   IT ONLY EVER ASKS FOR COUNTS. Every query below is `head: true` with
 *   `count: "exact"`, or selects a single non-identifying column so it can be
 *   tallied. No name, no email, no photograph, no finding, and no per-patient
 *   row is read, let alone emailed. If you extend this, keep that property —
 *   the output goes to an ordinary mailbox outside the application.
 *
 * Never throws. A missing table or a transient failure degrades that one
 * count and is named in `unavailable`, so a partial report says which part is
 * missing instead of quietly reporting zero — a zero that is really an error
 * is worse than an acknowledged gap.
 */

type Infra = ReturnType<typeof infrastructureClient>;

async function countRows(
  infra: Infra,
  table: string,
  build: (q: any) => any,
  label: string,
  missing: string[]
): Promise<number> {
  try {
    const { count, error } = await build(
      infra.from(table).select("*", { count: "exact", head: true })
    );
    if (error) {
      missing.push(label);
      return 0;
    }
    return count ?? 0;
  } catch {
    missing.push(label);
    return 0;
  }
}

export async function gatherPlatformStats(
  window: ReportWindow
): Promise<PlatformReportStats> {
  const stats = emptyStats();
  const missing: string[] = [];

  let infra: Infra;
  try {
    infra = infrastructureClient();
  } catch {
    // No service-role key configured — local development, typically.
    return { ...stats, partial: true, unavailable: ["all (storage not configured)"] };
  }

  const from = window.start.toISOString();
  const to = window.end.toISOString();
  const inWindow = (q: any) => q.gte("created_at", from).lt("created_at", to);

  stats.newSignups = await countRows(infra, "profiles", inWindow, "new signups", missing);
  stats.totalUsers = await countRows(infra, "profiles", (q) => q, "total users", missing);
  stats.newOrganizations = await countRows(infra, "organizations", inWindow, "new organizations", missing);
  stats.totalOrganizations = await countRows(infra, "organizations", (q) => q, "total organizations", missing);
  stats.newEnrollments = await countRows(infra, "organization_patients", inWindow, "new enrollments", missing);
  stats.checksStarted = await countRows(
    infra,
    "screening_sessions",
    (q: any) => q.gte("started_at", from).lt("started_at", to),
    "checks started",
    missing
  );
  stats.reportsReleased = await countRows(
    infra,
    "reports",
    (q: any) => inWindow(q).eq("status", "released"),
    "reports released",
    missing
  );

  // Risk split. One column, no identifiers, tallied in memory.
  try {
    const { data, error } = await infra
      .from("reports")
      .select("risk_level")
      .gte("created_at", from)
      .lt("created_at", to);
    if (error) throw new Error(error.message);
    for (const level of RISK_ORDER) stats.byRiskLevel[level] = 0;
    for (const row of (data ?? []) as { risk_level: string | null }[]) {
      const key = row.risk_level ?? "unknown";
      stats.byRiskLevel[key] = (stats.byRiskLevel[key] ?? 0) + 1;
    }
  } catch {
    missing.push("risk breakdown");
  }

  // Feedback split. `category` is a fixed enum, not free text — the message
  // body is deliberately NOT read here.
  try {
    const { data, error } = await infra
      .from("feedback")
      .select("category")
      .gte("created_at", from)
      .lt("created_at", to);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { category: string | null }[];
    stats.feedbackCount = rows.length;
    for (const row of rows) {
      const key = row.category ?? "other";
      stats.feedbackByCategory[key] = (stats.feedbackByCategory[key] ?? 0) + 1;
    }
  } catch {
    missing.push("feedback");
  }

  stats.unavailable = missing;
  stats.partial = missing.length > 0;
  return stats;
}

/**
 * Where the monthly report is emailed.
 *
 * A constant with an env override, never anything derived from a request —
 * there is no parameter a caller could use to redirect this report. Exported
 * so the dashboard can show the operator where it goes rather than leaving
 * them to guess.
 */
export function platformReportRecipient(): string {
  return process.env.PLATFORM_REPORT_TO?.trim() || "eshnike12@gmail.com";
}

/* ───────────────────────────────────────────────────────────────────────────
   Time series for the admin dashboard's graph.
   ─────────────────────────────────────────────────────────────────────────── */

import {
  DAY_MS,
  RANGE_BUCKETS,
  rangeWindow,
  type StatsRange,
} from "@/lib/platformReport";

export interface SeriesPoint {
  /** Bucket start, ISO. The chart formats it; the server does not guess a zone. */
  t: string;
  /** Accounts created in this bucket. */
  signups: number;
  /** Distinct accounts that opened the app in this bucket. */
  activeUsers: number;
  /** Screening sessions started in this bucket. */
  checks: number;
  /** Reports released in this bucket. */
  reports: number;
}

export interface PlatformSeries {
  points: SeriesPoint[];
  /** Series that could not be read, by name — drawn as absent, not as zero. */
  unavailable: string[];
  /**
   * True when activity has simply not accumulated yet. The table starts empty
   * the day it ships and cannot be backfilled, so an empty line here means
   * "not recorded yet", which the chart must say rather than draw as a flat
   * zero that looks like nobody came.
   */
  activityStartedAt: string | null;
}

/** Rows capped so one query cannot drag the dashboard down on a big window. */
const SERIES_ROW_CAP = 20_000;

async function timestamps(
  infra: Infra,
  table: string,
  column: string,
  from: string,
  to: string,
  label: string,
  missing: string[],
  extra?: (q: any) => any
): Promise<number[]> {
  try {
    let query = infra
      .from(table)
      .select(column)
      .gte(column, from)
      .lt(column, to)
      .limit(SERIES_ROW_CAP);
    if (extra) query = extra(query);
    const { data, error } = await query;
    if (error) {
      missing.push(label);
      return [];
    }
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    return rows
      .map((row) => new Date(String(row[column])).getTime())
      .filter((value) => Number.isFinite(value));
  } catch {
    missing.push(label);
    return [];
  }
}

/** Index of the bucket a timestamp falls in, or -1 when outside the window. */
function bucketOf(ms: number, startMs: number, widthMs: number, count: number): number {
  const index = Math.floor((ms - startMs) / widthMs);
  return index >= 0 && index < count ? index : -1;
}

export async function gatherPlatformSeries(
  range: StatsRange,
  now: Date = new Date()
): Promise<PlatformSeries> {
  const missing: string[] = [];
  let infra: Infra;
  try {
    infra = infrastructureClient();
  } catch {
    return { points: [], unavailable: ["all (storage not configured)"], activityStartedAt: null };
  }

  // "All time" starts at the first account, not at an arbitrary cut-off that
  // would quietly hide the opening weeks.
  let earliest: Date | null = null;
  if (range === "all") {
    try {
      const { data } = await infra
        .from("profiles")
        .select("created_at")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const raw = (data as { created_at?: string } | null)?.created_at;
      if (raw) earliest = new Date(raw);
    } catch {
      /* falls back to the default window inside rangeWindow */
    }
  }

  const window = rangeWindow(range, now, earliest);
  const from = window.start.toISOString();
  const to = window.end.toISOString();
  const startMs = window.start.getTime();
  const spanMs = Math.max(window.end.getTime() - startMs, DAY_MS / 24);

  // Bucket width from the range, but never more than 60 points — a line with
  // one point per day over five years is unreadable and slow to draw.
  const configured = RANGE_BUCKETS[range].bucketDays * DAY_MS;
  const widthMs = Math.max(configured, spanMs / 60);
  const count = Math.max(1, Math.min(60, Math.ceil(spanMs / widthMs)));

  const [signupTimes, checkTimes, reportTimes] = await Promise.all([
    timestamps(infra, "profiles", "created_at", from, to, "sign-ups", missing),
    timestamps(infra, "screening_sessions", "started_at", from, to, "checks", missing),
    timestamps(infra, "reports", "created_at", from, to, "reports", missing, (q) =>
      q.eq("status", "released")
    ),
  ]);

  // Activity is stored as one row per user per UTC day, so distinct users in a
  // bucket is a row count — not a sum of `events`, which would count repeat
  // visits as extra people.
  const activityBuckets = new Array<Set<string>>(count);
  for (let i = 0; i < count; i += 1) activityBuckets[i] = new Set();
  let activityStartedAt: string | null = null;
  try {
    const { data, error } = await infra
      .from("user_activity_daily")
      .select("day, user_id")
      .gte("day", from.slice(0, 10))
      .lte("day", to.slice(0, 10))
      .limit(SERIES_ROW_CAP);
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as { day: string; user_id: string }[]) {
      const ms = new Date(`${row.day}T00:00:00.000Z`).getTime();
      const index = bucketOf(ms, startMs, widthMs, count);
      if (index >= 0) activityBuckets[index].add(row.user_id);
    }
    const { data: first } = await infra
      .from("user_activity_daily")
      .select("day")
      .order("day", { ascending: true })
      .limit(1)
      .maybeSingle();
    const firstDay = (first as { day?: string } | null)?.day;
    if (firstDay) activityStartedAt = firstDay;
  } catch {
    missing.push("active users");
  }

  const tally = (times: number[]) => {
    const counts = new Array<number>(count).fill(0);
    for (const ms of times) {
      const index = bucketOf(ms, startMs, widthMs, count);
      if (index >= 0) counts[index] += 1;
    }
    return counts;
  };

  const signups = tally(signupTimes);
  const checks = tally(checkTimes);
  const reports = tally(reportTimes);

  const points: SeriesPoint[] = [];
  for (let i = 0; i < count; i += 1) {
    points.push({
      t: new Date(startMs + i * widthMs).toISOString(),
      signups: signups[i],
      activeUsers: activityBuckets[i].size,
      checks: checks[i],
      reports: reports[i],
    });
  }

  return { points, unavailable: missing, activityStartedAt };
}
