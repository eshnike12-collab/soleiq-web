/**
 * When a report change is worth reacting to, and how fast to poll when
 * Realtime is not available.
 *
 * Pure, and separate from the hook, so the decisions can be tested without a
 * socket or a DOM. These rules decide whether a patient's result appears, so
 * they are worth pinning.
 */

/** The columns the stream reads. Nothing clinical — status and identity only. */
export interface ReportStreamRow {
  id: string;
  status: string | null;
  screening_session_id?: string | null;
  organization_patient_id?: string | null;
  finalized_at?: string | null;
  created_at?: string | null;
}

/** The statuses a patient or clinician can actually open and read. */
export const VISIBLE_STATUSES = new Set([
  "preliminary",
  "clinician_reviewed",
  "released",
]);

/**
 * A report has stopped moving.
 *
 * `released` is the end state for the product rule in force: results are
 * visible as soon as analysis finishes, without waiting for clinician review.
 * `superseded` also settles — a newer version has taken over and this row
 * will not change again.
 */
export function isSettled(row: ReportStreamRow): boolean {
  return row.status === "released" || row.status === "superseded";
}

/**
 * Poll interval, in milliseconds, given how long we have been waiting.
 *
 * 5s for the first minute, then 15s. A result normally lands within the
 * route's own 45s analysis deadline, so the first minute is where almost
 * every resolution happens and is worth paying for; after that the wait is
 * exceptional and a slower cadence is kinder to both the browser and the
 * database.
 */
export const FAST_POLL_MS = 5_000;
export const SLOW_POLL_MS = 15_000;
export const BACKOFF_AFTER_MS = 60_000;

export function pollIntervalFor(elapsedMs: number): number {
  return elapsedMs < BACKOFF_AFTER_MS ? FAST_POLL_MS : SLOW_POLL_MS;
}

/**
 * Should the stream keep working?
 *
 * Stops once the watched report settles. With no specific report to watch —
 * a dashboard listing many — there is nothing to settle on, so it keeps
 * running while mounted.
 */
export function shouldKeepPolling(
  watched: ReportStreamRow | null,
  watchReportId?: string
): boolean {
  if (!watchReportId) return true;
  if (!watched) return true;
  return !isSettled(watched);
}

/**
 * Is this change worth telling the page about?
 *
 * Filters two kinds of noise: a row that is not readable anyway, and a
 * watched-report stream being woken by a different report. It deliberately
 * does NOT re-check ownership — RLS already decided which rows reach this
 * client, and a second filter here would be a copy of that rule, free to
 * drift from it and able to hide rows the database said were allowed.
 */
export function isRelevantChange(
  row: ReportStreamRow,
  watchReportId?: string
): boolean {
  if (watchReportId) return row.id === watchReportId;
  return row.status === null || VISIBLE_STATUSES.has(row.status);
}
