/**
 * The monthly platform report's shape and date arithmetic.
 *
 * Pure — no database, no clock of its own — so the window maths is testable.
 * It matters: an off-by-one at a month boundary silently reports the wrong
 * month, and nothing downstream would notice.
 *
 * WHAT THIS DELIBERATELY DOES NOT CARRY
 *
 * Counts, never people. No patient name, no email address, no date of birth,
 * no photograph, no finding, and no per-patient row of any kind. The report is
 * emailed to an inbox outside the application, and an operational summary does
 * not need identifiable health information to be useful — "41 checks
 * completed" answers the question that "Alex Chen, urgent" would, without
 * putting protected health information in a mailbox.
 *
 * Risk totals are included because a count across the whole platform
 * identifies nobody. A breakdown narrow enough to single somebody out would
 * not be, which is why nothing here is grouped by hospital.
 */

export interface ReportWindow {
  /** Inclusive start, UTC. */
  start: Date;
  /** Exclusive end, UTC. */
  end: Date;
  /** "September 2026" — the month the report is ABOUT. */
  label: string;
}

/**
 * The calendar month before the one `now` falls in.
 *
 * Previous month, not the current one: a report sent on the 1st about the
 * month just ended is complete, where one about the month in progress is a
 * partial count that looks like a drop.
 */
export function previousMonthWindow(now: Date): ReportWindow {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0)
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  );
  return { start, end, label: monthLabel(start) };
}

/** The calendar month `now` is in — used by the admin dashboard's live panel. */
export function currentMonthWindow(now: Date): ReportWindow {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0)
  );
  return { start, end, label: monthLabel(start) };
}

export function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Aggregate totals only. Every field is a count. */
export interface MonthlyReportStats {
  /** Accounts created inside the window. */
  newSignups: number;
  /** Accounts in total, at the moment the report ran. */
  totalUsers: number;
  /** Organizations created inside the window. */
  newOrganizations: number;
  totalOrganizations: number;
  /** Screening sessions started inside the window. */
  checksStarted: number;
  /** Reports released inside the window, and the same split by risk level. */
  reportsReleased: number;
  byRiskLevel: Record<string, number>;
  /** Feedback submitted inside the window, split by its own category. */
  feedbackCount: number;
  feedbackByCategory: Record<string, number>;
  /** Patient enrollments created inside the window. */
  newEnrollments: number;
  /** True when one or more counts could not be read — see `unavailable`. */
  partial: boolean;
  /** Names of the counts that could not be read this run. */
  unavailable: string[];
}

export function emptyStats(): MonthlyReportStats {
  return {
    newSignups: 0,
    totalUsers: 0,
    newOrganizations: 0,
    totalOrganizations: 0,
    checksStarted: 0,
    reportsReleased: 0,
    byRiskLevel: {},
    feedbackCount: 0,
    feedbackByCategory: {},
    newEnrollments: 0,
    partial: false,
    unavailable: [],
  };
}

/**
 * Plain-language change between two counts.
 *
 * Returns null when there is nothing honest to say — no previous figure, or a
 * previous figure of zero, where "+100%" would be arithmetic rather than
 * information.
 */
export function changeLabel(current: number, previous: number | null): string | null {
  if (previous === null || previous === 0) return null;
  const delta = current - previous;
  if (delta === 0) return "no change";
  const pct = Math.round((delta / previous) * 100);
  return `${delta > 0 ? "+" : ""}${delta} (${pct > 0 ? "+" : ""}${pct}%)`;
}

/** The four risk levels, in clinical order, so the email never reorders them. */
export const RISK_ORDER = ["clear", "watch", "see_someone_soon", "urgent"] as const;
