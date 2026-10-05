import "server-only";

import { infrastructureClient } from "./storage";
import {
  RISK_ORDER,
  emptyStats,
  type MonthlyReportStats,
  type ReportWindow,
} from "@/lib/monthlyReport";

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

export async function gatherMonthlyStats(
  window: ReportWindow
): Promise<MonthlyReportStats> {
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
