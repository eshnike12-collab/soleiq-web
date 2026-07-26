import "server-only";

import { z } from "zod";
import { notFound } from "./errors";
import { requireAuth } from "./auth";
import { writeAudit } from "./audit";

export async function getPatientAccessSummary(requestId: string) {
  const { supabase, user } = await requireAuth();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name")
    .eq("linked_user_id", user.id)
    .maybeSingle();
  if (!patient) {
    return { patient: null, enrollments: [], assignments: [], consents: [] };
  }
  const { data: enrollments, error: enrollmentError } = await supabase
    .from("organization_patients")
    .select(
      "id, organization_id, enrollment_status, created_at, organizations(display_name, slug, branding), facilities!organization_patients_facility_id_organization_id_fkey(name)"
    )
    .eq("patient_id", patient.id);
  if (enrollmentError) throw new Error(enrollmentError.message);

  const enrollmentIds = (enrollments ?? []).map((row) => row.id);
  const [{ data: assignments }, { data: consents }] = await Promise.all([
    enrollmentIds.length
      ? supabase
          .from("care_team_assignments")
          .select(
            "id, organization_id, organization_patient_id, relationship, status, starts_at, ends_at, clinician_membership_id, organization_memberships!care_team_assignments_clinician_membership_id_organization_fkey(profiles(full_name), status)"
          )
          .in("organization_patient_id", enrollmentIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("consent_grants")
      .select(
        "id, organization_id, grantee_membership_id, scope, valid_from, valid_until, revoked_at, organization_memberships(profiles(full_name), status), organizations(display_name)"
      )
      .eq("patient_id", patient.id)
      .order("created_at", { ascending: false }),
  ]);

  for (const enrollment of enrollments ?? []) {
    await writeAudit(supabase, {
      organizationId: enrollment.organization_id,
      action: "access_summary.viewed",
      resourceType: "patient",
      resourceId: patient.id,
      patientId: patient.id,
      purpose: "patient_request",
      requestId,
    });
  }
  return {
    patient,
    enrollments: enrollments ?? [],
    assignments: assignments ?? [],
    consents: consents ?? [],
  };
}

export const CreateShareTokenSchema = z.object({
  organizationPatientId: z.string().uuid(),
  scope: z.enum(["latest_report", "selected_reports", "longitudinal_record"]),
  selectedReportIds: z.array(z.string().uuid()).max(50).default([]),
  validUntil: z.string().datetime().nullable().optional(),
});

export async function createShareToken(
  input: z.input<typeof CreateShareTokenSchema>
) {
  const { supabase } = await requireAuth();
  const body = CreateShareTokenSchema.parse(input);
  const { data, error } = await supabase.rpc("create_patient_share_token", {
    target_organization_patient_id: body.organizationPatientId,
    share_scope: body.scope,
    share_selected_report_ids: body.selectedReportIds,
    share_valid_until: body.validUntil ?? null,
    share_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

export async function acceptShareToken(token: string) {
  const { supabase } = await requireAuth();
  const parsed = z.string().regex(/^[a-f0-9]{64}$/i).parse(token);
  const { data, error } = await supabase.rpc("accept_patient_share_token", {
    raw_token: parsed,
  });
  if (error) throw new Error(error.message);
  return { consentGrantId: data };
}

export async function revokeConsent(
  consentId: string,
  reason: string,
  requestId: string
) {
  const { supabase } = await requireAuth();
  const { error } = await supabase.rpc("revoke_consent_grant", {
    target_consent_id: z.string().uuid().parse(consentId),
    reason: z.string().trim().max(500).parse(reason),
    request_id: requestId,
  });
  if (error) {
    if (error.code === "42501") throw notFound("Consent grant not found.");
    throw new Error(error.message);
  }
  return { revoked: true };
}

