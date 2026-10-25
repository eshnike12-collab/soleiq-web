/**
 * What a repeat submission of the same idempotency key should do.
 *
 * Extracted so the decision can be tested without a database. It matters
 * because the failure mode is silent and expensive in both directions: decide
 * "create new" too readily and one patient's check becomes two reports in
 * their history; decide "return existing" too readily and a half-finished
 * upload is never completed.
 *
 * The database is still the backstop — screening_sessions carries
 * `unique (organization_id, organization_patient_id, idempotency_key)`, so a
 * second row cannot be created even if this were wrong.
 */

/**
 * Sessions past the point of re-uploading: the report already exists, or a
 * clinician owns the row now. A repeat submit hands back what is there.
 */
export const TERMINAL_SESSION_STATUSES = new Set([
  "preliminary",
  "clinician_reviewed",
  "completed",
  "released",
]);

export type ResumeDecision =
  /** Hand back the existing session and its report. Write nothing. */
  | "return_existing"
  /** Everything uploaded; the reading died mid-flight. Finish that one. */
  | "resume_analysis"
  /** A draft or a failed attempt. Re-upload into the same session. */
  | "reuse_session"
  /** No session for this key yet. */
  | "create_new";

export function resumeDecisionFor(
  existing: { status?: string | null } | null | undefined
): ResumeDecision {
  if (!existing) return "create_new";
  const status = existing.status ?? "";
  if (TERMINAL_SESSION_STATUSES.has(status)) return "return_existing";
  if (status === "analyzing") return "resume_analysis";
  // draft, uploading, failed, cancelled — the media may be partial, so the
  // same session is reused and the upload is attempted again.
  return "reuse_session";
}

/** True when a repeat submit must not create a second report. */
export function wouldDuplicate(
  existing: { status?: string | null } | null | undefined
): boolean {
  return resumeDecisionFor(existing) === "return_existing";
}
