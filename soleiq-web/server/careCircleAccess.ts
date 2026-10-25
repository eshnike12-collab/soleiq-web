import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { DomainError, invalid } from "./errors";
import { requireAuth } from "./auth";
import { writeAudit } from "./audit";
import { appBaseUrl, sendEmail } from "./email/client";
import {
  careCircleRequestSubject,
  renderCareCircleRequestHtml,
  renderCareCircleRequestText,
} from "./email/templates/careCircleRequest";
import {
  careCircleDecisionSubject,
  renderCareCircleDecisionHtml,
  renderCareCircleDecisionText,
} from "./email/templates/careCircleDecision";

/**
 * Caregiver-initiated access requests, and the patient's decision on them.
 *
 * THE PRIVACY RULE IS THE HARD PART, AND IT SHAPES EVERYTHING HERE.
 *
 * A caregiver must never learn whether an email address belongs to a SoleIQ
 * patient. So `requestAccess` returns the same value for a real patient, a
 * stranger, an address that already declined them, and their own address. No
 * branch, no distinct error, no different field. If you add a case here, it
 * must return `ACKNOWLEDGED` too — anything else turns this endpoint into a
 * patient-list oracle, which is worse than most bugs because it is silent and
 * the people harmed never find out.
 *
 * The matching lookup lives in `request_care_circle_access` in migration
 * 00015 for the same reason: resolving an address to a patient id in the
 * client would itself be the leak.
 */

/** Matches server/invitations.ts: 64 hex characters. */
const TOKEN_BYTES = 32;
const TOKEN_TTL_DAYS = 14;

export const RequestAccessSchema = z.object({
  patientEmail: z.string().trim().email().max(320),
});

export const DecideRequestSchema = z.object({
  grantId: z.string().uuid(),
  approve: z.boolean(),
  declineReason: z.string().trim().max(400).optional(),
});

export const CaregiverProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  relationshipToPatient: z.string().trim().min(1).max(120),
  organization: z.string().trim().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

/**
 * The single response this endpoint is allowed to give.
 *
 * A constant, not a computed value, so no future edit can accidentally make
 * it depend on what was found.
 */
export const ACKNOWLEDGED = {
  acknowledged: true as const,
  message:
    "If that address belongs to a SoleIQ patient, they have been asked to approve your request.",
};

function newToken(): { token: string; hash: string } {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  return { token, hash: sha256(token) };
}

/** The token is emailed; only this hash is stored. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function tokenExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + TOKEN_TTL_DAYS * 86_400_000);
}

/** Save or update the caller's caregiver profile. */
export async function saveCaregiverProfile(
  input: z.input<typeof CaregiverProfileSchema>
) {
  const body = CaregiverProfileSchema.parse(input);
  const { supabase, user } = await requireAuth();
  const { error } = await supabase.from("caregiver_profiles").upsert(
    {
      user_id: user.id,
      full_name: body.fullName,
      relationship_to_patient: body.relationshipToPatient,
      organization: body.organization || null,
      phone: body.phone || null,
      // Mirrors what Supabase auth already knows, so the approval screen can
      // show it without a second lookup.
      email_verified_at: user.email_confirmed_at ?? null,
    },
    { onConflict: "user_id" }
  );
  if (error) throw new Error(error.message);
  return { saved: true };
}

export async function getCaregiverProfile() {
  const { supabase, user } = await requireAuth();
  const { data } = await supabase
    .from("caregiver_profiles")
    .select("full_name, relationship_to_patient, organization, phone, email_verified_at")
    .eq("user_id", user.id)
    .maybeSingle();
  return data ?? null;
}

/**
 * Ask a patient for access.
 *
 * Always returns ACKNOWLEDGED. See the note at the top of this file.
 */
export async function requestAccess(
  input: z.input<typeof RequestAccessSchema>,
  requestId: string
) {
  const body = RequestAccessSchema.parse(input);
  const { supabase, user } = await requireAuth();

  if (!user.email_confirmed_at) {
    // About the CALLER's own account, so safe to say plainly: it reveals
    // nothing about any other person.
    throw new DomainError(
      "FORBIDDEN",
      "Confirm your email address before requesting access to a patient.",
      403
    );
  }

  const { token, hash } = newToken();
  const expiresAt = tokenExpiry();

  const { error } = await supabase.rpc("request_care_circle_access", {
    p_patient_email: body.patientEmail.toLowerCase(),
    p_token_hash: hash,
    p_expires_at: expiresAt.toISOString(),
  });

  if (error) {
    // P0001/P0002 are about the caller's own readiness and may be reported.
    // Everything else is swallowed: a database error must not become a signal
    // about whether the address exists.
    if (error.message.includes("email not confirmed")) {
      throw new DomainError(
        "FORBIDDEN",
        "Confirm your email address before requesting access to a patient.",
        403
      );
    }
    if (error.message.includes("caregiver profile required")) {
      throw invalid("Add your name and relationship before requesting access.");
    }
    console.error(
      JSON.stringify({
        level: "error",
        event: "care_circle.request_failed",
        requestId,
      })
    );
    return ACKNOWLEDGED;
  }

  // Audited whatever the outcome. The audit row records that THIS caller
  // asked about an address; it is not readable by them and is the record
  // that makes abuse of this endpoint reviewable.
  try {
    await writeAudit(supabase, {
      organizationId: null,
      action: "care_circle.access_requested",
      resourceType: "patient_access_grant",
      purpose: "patient_request",
      requestId,
      metadata: { requested_email_sha256: sha256(body.patientEmail.toLowerCase()) },
    });
  } catch {
    /* An audit failure must not change the response the caller sees. */
  }

  // Email is best-effort and deliberately fired without checking whether a
  // patient was found — `notifyPatientOfRequest` resolves that internally and
  // simply sends nothing when there is nobody to send to.
  await notifyPatientOfRequest(body.patientEmail.toLowerCase(), token, user.id);

  return ACKNOWLEDGED;
}

/**
 * Email the patient that someone has asked for access.
 *
 * Runs under the CALLER's session, so it can only read what the caller may
 * read — which is not the patient's name. The email therefore addresses them
 * generically and names the REQUESTER, who is the thing the patient needs to
 * judge.
 *
 * Never throws: access and refusal both work without email.
 */
async function notifyPatientOfRequest(
  patientEmail: string,
  token: string,
  requesterId: string
) {
  try {
    const { supabase } = await requireAuth();
    const { data: profile } = await supabase
      .from("caregiver_profiles")
      .select("full_name, relationship_to_patient, organization")
      .eq("user_id", requesterId)
      .maybeSingle();

    const result = await sendEmail({
      to: patientEmail,
      subject: careCircleRequestSubject(),
      html: renderCareCircleRequestHtml({
        requesterName: profile?.full_name ?? "Someone",
        relationship: profile?.relationship_to_patient ?? "not stated",
        organization: profile?.organization ?? null,
        reviewUrl: `${appBaseUrl()}/access?request=${token}`,
      }),
      text: renderCareCircleRequestText({
        requesterName: profile?.full_name ?? "Someone",
        relationship: profile?.relationship_to_patient ?? "not stated",
        organization: profile?.organization ?? null,
        reviewUrl: `${appBaseUrl()}/access?request=${token}`,
      }),
    });
    if (!result.ok && result.reason !== "not_configured") {
      console.warn("[care-circle] request email not sent:", result.reason);
    }
  } catch (cause) {
    console.warn(
      "[care-circle] request email threw:",
      cause instanceof Error ? cause.message : "unknown error"
    );
  }
}

/** The patient approves or declines. */
export async function decideRequest(
  input: z.input<typeof DecideRequestSchema>,
  requestId: string
) {
  const body = DecideRequestSchema.parse(input);
  const { supabase } = await requireAuth();

  const { data, error } = await supabase.rpc("decide_care_circle_request", {
    p_grant_id: body.grantId,
    p_approve: body.approve,
    p_decline_reason: body.declineReason ?? null,
  });

  if (error) {
    if (error.message.includes("request expired")) {
      throw invalid(
        "That request has expired. Ask them to send a new one."
      );
    }
    if (error.message.includes("already decided")) {
      throw invalid("That request has already been answered.");
    }
    // "not found" covers both a missing row and one that is not theirs. One
    // message for both, so a grant id cannot be probed.
    throw new DomainError("NOT_FOUND", "Request not found.", 404);
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { status: string; grant_role: string; requester_email: string }
    | null;

  try {
    await writeAudit(supabase, {
      organizationId: null,
      action: body.approve
        ? "care_circle.access_approved"
        : "care_circle.access_declined",
      resourceType: "patient_access_grant",
      resourceId: body.grantId,
      purpose: "patient_request",
      requestId,
    });
  } catch {
    /* Never let an audit failure block a decision the patient has made. */
  }

  if (row?.requester_email) {
    await notifyRequesterOfDecision(row.requester_email, body.approve);
  }
  return { status: row?.status ?? (body.approve ? "active" : "declined") };
}

/** Tell the requester the outcome, either way. Never throws. */
async function notifyRequesterOfDecision(to: string, approved: boolean) {
  try {
    const result = await sendEmail({
      to,
      subject: careCircleDecisionSubject(approved),
      html: renderCareCircleDecisionHtml({ approved, appUrl: appBaseUrl() }),
      text: renderCareCircleDecisionText({ approved, appUrl: appBaseUrl() }),
    });
    if (!result.ok && result.reason !== "not_configured") {
      console.warn("[care-circle] decision email not sent:", result.reason);
    }
  } catch (cause) {
    console.warn(
      "[care-circle] decision email threw:",
      cause instanceof Error ? cause.message : "unknown error"
    );
  }
}
