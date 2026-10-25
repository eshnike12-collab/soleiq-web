import "server-only";

import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { requireAuth } from "./auth";
import { resolveHospital } from "./tenancy";
import { writeAudit } from "./audit";
import { conflict, forbidden, invalid, notFound } from "./errors";
import { appBaseUrl, sendEmail } from "./email/client";
import {
  CLAIM_TTL_DAYS,
  TOKEN_PATTERN,
  classifyClaimError,
  type ClaimOutcome,
} from "@/lib/claimOutcome";
import {
  patientClaimInviteSubject,
  renderPatientClaimInviteHtml,
  renderPatientClaimInviteText,
} from "./email/templates/patientClaimInvite";

/**
 * Caregiver-created patient records, and the handover that ends them.
 *
 * The token is generated here rather than in Postgres — unlike
 * create_membership_invitation, which mints its own. Only the sha256 hash
 * crosses into the database, so the usable token never appears as a SQL
 * parameter and cannot turn up in a statement log.
 */

/** Matches server/invitations.ts, so every token in this product looks alike. */
const TOKEN_BYTES = 32; // 32 bytes -> 64 hex characters

function mintToken(): { token: string; hash: string } {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  return { token, hash: sha256(token) };
}

/** Lower-cased before hashing to match claim_patient_record exactly. */
export function sha256(value: string): string {
  return createHash("sha256").update(value.toLowerCase()).digest("hex");
}

export const CreateRecordSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  dateOfBirth: z.string().date().nullable().optional(),
  /** Optional at creation; required to invite. Stored for the invite step. */
  contactEmail: z.string().trim().email().max(254).nullable().optional(),
});

export async function createCaregiverPatientRecord(
  hospitalSlug: string,
  input: z.input<typeof CreateRecordSchema>,
  requestId: string
) {
  // Caregivers as well as admins — this is the caregiver dashboard's action.
  const hospital = await resolveHospital(hospitalSlug, ["doctor", "admin"]);
  const body = CreateRecordSchema.parse(input);
  const { supabase } = await requireAuth();

  const { data, error } = await supabase.rpc("create_caregiver_patient_record", {
    p_organization_id: hospital.id,
    p_full_name: body.fullName,
    p_date_of_birth: body.dateOfBirth ?? null,
    p_contact_email: body.contactEmail ?? null,
    p_request_id: requestId,
  });
  if (error) {
    if (error.code === "42501") throw forbidden(error.message);
    if (error.code === "22023") throw invalid(error.message);
    throw new Error(error.message);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    patientId: row?.patient_id as string,
    organizationPatientId: row?.organization_patient_id as string,
  };
}

export const InviteToClaimSchema = z.object({
  patientId: z.string().uuid(),
  email: z.string().trim().email().max(254),
  /** The caregiver's own name, for the email's "who created this" line. */
  caregiverName: z.string().trim().max(160).optional(),
});

/**
 * Send (or re-send) a claim invitation.
 *
 * The RPC supersedes any outstanding invitation in the same transaction, so a
 * resend invalidates the previous link rather than leaving two live tokens.
 */
export async function invitePatientToClaim(
  hospitalSlug: string,
  input: z.input<typeof InviteToClaimSchema>,
  requestId: string
) {
  const hospital = await resolveHospital(hospitalSlug, ["doctor", "admin"]);
  const body = InviteToClaimSchema.parse(input);
  const { supabase, user } = await requireAuth();

  // Read the record first, so the email can say what is already in it. This
  // read goes through the ordinary care-circle policy; a caregiver with no
  // grant sees nothing and the invite fails below.
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, linked_user_id")
    .eq("id", body.patientId)
    .maybeSingle();
  if (!patient) throw notFound("That record could not be found.");
  if (patient.linked_user_id) {
    throw conflict("That record has already been claimed by its patient.");
  }

  const checkCount = await countChecks(supabase, body.patientId);

  const { token, hash } = mintToken();
  const expiresAt = new Date(
    Date.now() + CLAIM_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  const { data: invitationId, error } = await supabase.rpc(
    "invite_patient_to_claim",
    {
      p_patient_id: body.patientId,
      p_email: body.email,
      p_token_hash: hash,
      p_expires_at: expiresAt.toISOString(),
      p_request_id: requestId,
    }
  );
  if (error) {
    if (error.code === "42501") throw forbidden(error.message);
    if (error.code === "22023") throw invalid(error.message);
    throw new Error(error.message);
  }

  const emailResult = await sendEmail({
    to: body.email,
    subject: patientClaimInviteSubject(),
    text: renderPatientClaimInviteText({
      patientName: patient.full_name ?? "",
      caregiverName: body.caregiverName?.trim() || "Someone",
      organizationName: hospital.displayName,
      checkCount,
      claimUrl: `${appBaseUrl()}/claim/${token}`,
      expiresInDays: CLAIM_TTL_DAYS,
      invitedEmail: body.email,
    }),
    html: renderPatientClaimInviteHtml({
      patientName: patient.full_name ?? "",
      caregiverName: body.caregiverName?.trim() || "Someone",
      organizationName: hospital.displayName,
      checkCount,
      claimUrl: `${appBaseUrl()}/claim/${token}`,
      expiresInDays: CLAIM_TTL_DAYS,
      invitedEmail: body.email,
    }),
  });

  return {
    invitationId: invitationId as string,
    expiresAt: expiresAt.toISOString(),
    emailSent: emailResult.ok,
    /* Surfaced so the caregiver is told the link did not go out, rather than
       being left to assume it did. The invitation itself is still valid and
       can be re-sent once email is configured. */
    emailFailure: emailResult.ok ? null : emailResult.reason,
  };
}

/** How many checks already exist, so the email can say what is in the record. */
async function countChecks(
  supabase: Awaited<ReturnType<typeof requireAuth>>["supabase"],
  patientId: string
): Promise<number> {
  const { count } = await supabase
    .from("organization_patients")
    .select("reports(id)", { count: "exact", head: true })
    .eq("patient_id", patientId);
  return count ?? 0;
}

export const CancelClaimSchema = z.object({
  invitationId: z.string().uuid(),
});

export async function cancelClaimInvitation(
  hospitalSlug: string,
  input: z.input<typeof CancelClaimSchema>,
  requestId: string
) {
  await resolveHospital(hospitalSlug, ["doctor", "admin"]);
  const body = CancelClaimSchema.parse(input);
  const { supabase } = await requireAuth();
  const { error } = await supabase.rpc("cancel_patient_claim_invitation", {
    p_invitation_id: body.invitationId,
    p_request_id: requestId,
  });
  if (error) {
    if (error.code === "42501") throw forbidden(error.message);
    if (error.code === "22023") throw invalid(error.message);
    throw new Error(error.message);
  }
  return { cancelled: true };
}

export const ClaimSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
});

export async function claimPatientRecord(
  input: z.input<typeof ClaimSchema>
): Promise<ClaimOutcome> {
  const body = ClaimSchema.parse(input);
  const { supabase } = await requireAuth();
  const { data, error } = await supabase.rpc("claim_patient_record", {
    raw_token: body.token,
  });
  if (error) return { ok: false, reason: classifyClaimError(error), detail: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.patient_id) return { ok: false, reason: "unknown" };
  return {
    ok: true,
    patientId: row.patient_id as string,
    organizationPatientId: (row.organization_patient_id as string) ?? null,
  };
}

/**
 * Ask the caregiver for a fresh link.
 *
 * Deliberately does NOT reveal whether the record or invitation exists: the
 * page that calls this is reachable by anyone holding a dead link, and
 * confirming that a given address has a record would leak it. The caregiver
 * learns about the request from the audit trail and the record's own screen.
 */
export async function requestNewClaimLink(
  token: string,
  requestId: string
): Promise<{ acknowledged: true }> {
  const { supabase } = await requireAuth();
  // Recorded against no organization: the caller is an unaffiliated user and
  // write_audit_event rejects an organization they are not a member of.
  await writeAudit(supabase, {
    organizationId: null,
    action: "patient.claim_link_resend_requested",
    resourceType: "patient_claim_invitation",
    purpose: "patient_request",
    requestId,
    // The token is not recorded, in any form — only that a dead one was used.
    metadata: { token_shape_valid: TOKEN_PATTERN.test(token.toLowerCase()) },
  });
  return { acknowledged: true };
}

export interface CaregiverRecord {
  patientId: string;
  organizationPatientId: string | null;
  fullName: string | null;
  dateOfBirth: string | null;
  /** The whole point of this listing: false means the patient owns it now. */
  unclaimed: boolean;
  /** True when this caregiver is the one who created the record. */
  createdByMe: boolean;
  contactEmail: string | null;
  reportCount: number;
  invitation: {
    id: string;
    invitedEmail: string;
    expiresAt: string;
    expired: boolean;
  } | null;
}

/**
 * The records this caregiver holds a grant on, in this organization.
 *
 * Separate from doctor_worklist, which is keyed on the latest report and so
 * cannot see a record that has no checks yet — which is exactly the state a
 * freshly created record is in. Everything here is read under the caller's own
 * RLS: patient_access_grants only returns the caller's grants, and
 * patients_care_circle_read only returns patients those grants reach.
 */
export async function listCaregiverRecords(
  hospitalSlug: string
): Promise<{ records: CaregiverRecord[]; caregiverName: string }> {
  const hospital = await resolveHospital(hospitalSlug, ["doctor", "admin"]);
  const { supabase, user } = await requireAuth();

  // The caregiver's OWN name, for the "who created this record" line in the
  // invitation email. Falls back to their email, then to a neutral phrase —
  // the email must never read "Someone created this" when we know better, nor
  // invent a name when we do not.
  const { data: me } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();
  const caregiverName =
    (me?.full_name as string)?.trim() ||
    (me?.email as string)?.trim() ||
    "Your caregiver";

  const { data: grants } = await supabase
    .from("patient_access_grants")
    .select("id, patient_id, direction, granted_by, status")
    .eq("status", "active");
  const mine = (grants ?? []).filter((g) => g.patient_id);
  if (mine.length === 0) return { records: [], caregiverName };

  const patientIds = [...new Set(mine.map((g) => g.patient_id as string))];

  const [{ data: patients }, { data: enrollments }, { data: invitations }] =
    await Promise.all([
      supabase
        .from("patients")
        .select("id, full_name, date_of_birth, linked_user_id, demographics")
        .in("id", patientIds),
      supabase
        .from("organization_patients")
        .select("id, patient_id, organization_id")
        .eq("organization_id", hospital.id)
        .in("patient_id", patientIds),
      supabase
        .from("patient_claim_invitations")
        .select("id, patient_id, invited_email, expires_at, claimed_at, cancelled_at")
        .in("patient_id", patientIds)
        .is("claimed_at", null)
        .is("cancelled_at", null),
    ]);

  const enrollmentFor = new Map(
    (enrollments ?? []).map((e) => [e.patient_id as string, e])
  );
  const inviteFor = new Map(
    (invitations ?? []).map((i) => [i.patient_id as string, i])
  );
  const grantFor = new Map(mine.map((g) => [g.patient_id as string, g]));

  // Counted per enrollment in one query rather than N.
  const enrollmentIds = (enrollments ?? []).map((e) => e.id as string);
  const counts = new Map<string, number>();
  if (enrollmentIds.length > 0) {
    const { data: reports } = await supabase
      .from("reports")
      .select("id, organization_patient_id")
      .in("organization_patient_id", enrollmentIds);
    for (const report of reports ?? []) {
      const key = report.organization_patient_id as string;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const now = Date.now();
  const records = (patients ?? [])
    // Only records enrolled in the organization whose dashboard this is.
    .filter((p) => enrollmentFor.has(p.id as string))
    .map((p) => {
      const enrollment = enrollmentFor.get(p.id as string)!;
      const invite = inviteFor.get(p.id as string);
      const grant = grantFor.get(p.id as string);
      const demographics = (p.demographics ?? {}) as Record<string, unknown>;
      return {
        patientId: p.id as string,
        organizationPatientId: (enrollment.id as string) ?? null,
        fullName: (p.full_name as string) ?? null,
        dateOfBirth: (p.date_of_birth as string) ?? null,
        unclaimed: p.linked_user_id == null,
        createdByMe:
          grant?.direction === "caregiver_created" && grant?.granted_by === user.id,
        contactEmail:
          typeof demographics.claim_contact_email === "string"
            ? demographics.claim_contact_email
            : null,
        reportCount: counts.get(enrollment.id as string) ?? 0,
        invitation: invite
          ? {
              id: invite.id as string,
              invitedEmail: invite.invited_email as string,
              expiresAt: invite.expires_at as string,
              expired: new Date(invite.expires_at as string).getTime() <= now,
            }
          : null,
      };
    })
    // Unclaimed first: they are the ones needing an action.
    .sort((a, b) => Number(b.unclaimed) - Number(a.unclaimed));

  return { records, caregiverName };
}

export const RevokeGrantSchema = z.object({
  grantId: z.string().uuid(),
});

/**
 * The patient removing someone from their care circle — including the
 * caregiver who created the record.
 *
 * It exists as a server action purely so the custody change leaves an audit
 * trail. The UPDATE itself is still made with the patient's own credentials
 * and is still gated by the patient_access_grants UPDATE policy
 * (`owns_patient(patient_id)`), so this grants no authority the patient did
 * not already have — a caregiver calling it for a record they do not own is
 * refused by RLS, not by a check here.
 */
export async function revokeCareCircleGrant(
  input: z.input<typeof RevokeGrantSchema>,
  requestId: string
) {
  const body = RevokeGrantSchema.parse(input);
  const { supabase } = await requireAuth();

  // Read first, so the audit entry can say whose access ended and whether it
  // was the record's creator.
  const { data: grant } = await supabase
    .from("patient_access_grants")
    .select("id, patient_id, invitee_email, role, direction, status")
    .eq("id", body.grantId)
    .maybeSingle();
  if (!grant) throw notFound("That access could not be found.");

  const { error, data: updated } = await supabase
    .from("patient_access_grants")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.grantId)
    .select("id");
  if (error) throw new Error(error.message);
  // RLS silently matches zero rows when the caller does not own the record,
  // so an empty result is a refusal rather than a success.
  if (!updated || updated.length === 0) {
    throw forbidden("Only the patient can remove access to their record.");
  }

  await writeAudit(supabase, {
    // No organization: the patient is not a member of one, and
    // write_audit_event rejects an organization the caller has no membership
    // of — see the same guard inside claim_patient_record.
    organizationId: null,
    action: "care_circle.access_revoked",
    resourceType: "patient_access_grant",
    resourceId: grant.id as string,
    patientId: grant.patient_id as string,
    purpose: "patient_request",
    requestId,
    metadata: {
      invitee_email: grant.invitee_email,
      role: grant.role,
      // Worth recording distinctly: this is the record's creator losing the
      // access they had before the patient existed as a user.
      was_record_creator: grant.direction === "caregiver_created",
    },
  });

  return { revoked: true };
}
