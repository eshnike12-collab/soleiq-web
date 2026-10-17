/**
 * The platform report's shape and date arithmetic.
 *
 * Drives the DAILY operator email and the admin dashboard's range selector.
 * (It began as a monthly report; the windows are now day, week, month, year
 * and all-time, and the file was renamed to match.)
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

/** One day in milliseconds. Declared here so this module has no imports. */
export const DAY_MS = 86_400_000;

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

/**
 * The calendar day before the one `now` falls in, in UTC.
 *
 * Yesterday, not today: a report sent at 07:00 about the day just ended is
 * complete, where one about the day in progress is a partial count that looks
 * like a collapse. Same reasoning as the month window above.
 */
export function previousDayWindow(now: Date): ReportWindow {
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );
  const start = new Date(end.getTime() - DAY_MS);
  return { start, end, label: dayLabel(start) };
}

/** The UTC day `now` falls in. The dashboard's "so far today". */
export function currentDayWindow(now: Date): ReportWindow {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  );
  return { start, end: new Date(start.getTime() + DAY_MS), label: dayLabel(start) };
}

export function dayLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Ranges the dashboard offers. */
export type StatsRange = "1d" | "7d" | "30d" | "365d" | "all";

export const RANGE_LABEL: Record<StatsRange, string> = {
  "1d": "1 day",
  "7d": "1 week",
  "30d": "1 month",
  "365d": "1 year",
  all: "All time",
};

/** How many buckets each range is drawn with, and how wide a bucket is. */
export const RANGE_BUCKETS: Record<StatsRange, { days: number; bucketDays: number }> = {
  // A day drawn as 24 hourly buckets; the others as days or weeks, so a line
  // never has more points than a chart can legibly carry.
  "1d": { days: 1, bucketDays: 1 / 24 },
  "7d": { days: 7, bucketDays: 1 },
  "30d": { days: 30, bucketDays: 1 },
  "365d": { days: 365, bucketDays: 7 },
  all: { days: 0, bucketDays: 7 },
};

/**
 * The window a dashboard range covers, ending now.
 *
 * `all` has no fixed start — the caller supplies the earliest timestamp it
 * can find, so "all time" means the real beginning of the data rather than an
 * arbitrary cut-off that quietly hides the first weeks.
 */
export function rangeWindow(
  range: StatsRange,
  now: Date,
  earliest?: Date | null
): ReportWindow {
  const end = now;
  if (range === "all") {
    const start = earliest ?? new Date(end.getTime() - 365 * DAY_MS);
    return { start, end, label: RANGE_LABEL.all };
  }
  const { days } = RANGE_BUCKETS[range];
  return {
    start: new Date(end.getTime() - days * DAY_MS),
    end,
    label: RANGE_LABEL[range],
  };
}

export function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Aggregate totals only. Every field is a count. */
export interface PlatformReportStats {
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

export function emptyStats(): PlatformReportStats {
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
