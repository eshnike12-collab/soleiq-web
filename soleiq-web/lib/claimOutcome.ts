/**
 * What a claim attempt can come back as, and how to read it.
 *
 * Pure and client-safe so the claim page can import it: server/patientClaim.ts
 * is `server-only` and cannot cross the boundary. Keeping the classifier here
 * also means it can be tested without a database.
 */

/** 14 days, per the brief. Mirrored by CLAIM_TTL_DAYS in server/patientClaim. */
export const CLAIM_TTL_DAYS = 14;

/** 32 random bytes rendered as hex, matching server/invitations.ts. */
export const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

/**
 * Each of these sends the reader somewhere different, which is why they are
 * not collapsed into one "invalid link":
 *
 * - `invalid_or_expired`  the link is dead; offer a new one.
 * - `email_mismatch`      the signed-in account is not the invited one. This
 *                         is what a CAREGIVER sees if they follow the link
 *                         themselves, so the copy has to tell them to hand it
 *                         to the patient — not that the link is broken.
 * - `already_claimed`     someone else owns the record now.
 * - `account_already_linked` this account already has its own record; two
 *                         histories are never merged automatically.
 */
export type ClaimFailure =
  | "invalid_or_expired"
  | "email_mismatch"
  | "already_claimed"
  | "account_already_linked"
  | "unknown";

export type ClaimOutcome =
  | { ok: true; patientId: string; organizationPatientId: string | null }
  | { ok: false; reason: ClaimFailure; detail?: string };

/**
 * Map a Postgres error from claim_patient_record onto a failure shape.
 *
 * Matched on the message rather than the SQLSTATE because PostgREST surfaces
 * several of these as the same code, and the distinctions matter to the
 * reader. The codes are still checked as a fallback, so an unrecognised
 * message degrades to the right family instead of to "unknown".
 */
export function classifyClaimError(error: {
  code?: string;
  message?: string;
}): ClaimFailure {
  const message = (error.message ?? "").toLowerCase();
  if (message.includes("does not match the invited email")) return "email_mismatch";
  if (message.includes("already linked to another patient")) {
    return "account_already_linked";
  }
  if (message.includes("already claimed")) return "already_claimed";
  if (message.includes("invalid or expired")) return "invalid_or_expired";
  if (error.code === "23505") return "account_already_linked";
  if (error.code === "42501") return "email_mismatch";
  return "unknown";
}
