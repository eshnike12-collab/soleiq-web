import "server-only";

import { z } from "zod";
import { forbidden, notFound } from "./errors";
import { requireAuth } from "./auth";
import { resolveHospital } from "./tenancy";
import { writeAudit } from "./audit";

export const AdminListQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function getAdminOverview(
  hospitalSlug: string,
  input: unknown = {}
) {
  const hospital = await resolveHospital(hospitalSlug, ["admin"]);
  if (!hospital.membership.permissions.hospital_admin) throw notFound();
  const { supabase } = await requireAuth();
  const query = AdminListQuerySchema.parse(input);

  const [
    { data: facilities, error: facilityError },
    { data: staff, error: staffError },
    { data: assignments, error: assignmentError },
    { data: audit, error: auditError },
    { data: patients, error: patientError },
  ] = await Promise.all([
    supabase
      .from("facilities")
      .select("id, name, facility_type, timezone, status, address")
      .eq("organization_id", hospital.id)
      .order("name"),
    supabase
      .from("organization_memberships")
      .select(
        "id, user_id, role, status, permissions, invited_at, accepted_at, ended_at, profiles(full_name, email, account_status)"
      )
      .eq("organization_id", hospital.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("care_team_assignments")
      .select(
        "id, organization_patient_id, clinician_membership_id, relationship, status, starts_at, ends_at, reason, created_at, ended_at"
      )
      .eq("organization_id", hospital.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("audit_events")
      .select(
        "id, actor_user_id, actor_membership_id, action, resource_type, resource_id, purpose, occurred_at, request_id"
      )
      .eq("organization_id", hospital.id)
      .order("occurred_at", { ascending: false })
      .limit(50),
    supabase.rpc("admin_patient_roster", {
      roster_organization_id: hospital.id,
      search_text: query.search || null,
      cursor_created_at: query.cursor || null,
      page_size: query.limit,
    }),
  ]);
  const firstError =
    facilityError || staffError || assignmentError || auditError || patientError;
  if (firstError) throw new Error(firstError.message);
  return {
    hospital,
    facilities: facilities ?? [],
    staff: staff ?? [],
    patients: patients ?? [],
    assignments: assignments ?? [],
    audit: audit ?? [],
  };
}

export const InvitationSchema = z.object({
  email: z.string().trim().email().max(320),
  role: z.enum(["admin", "doctor", "patient"]),
  facilityId: z.string().uuid().nullable().optional(),
  patientId: z.string().uuid().nullable().optional(),
  expiresInHours: z.number().int().min(1).max(24 * 30).default(72),
  permissions: z
    .object({
      hospital_admin: z.boolean().optional(),
      phi_access: z.boolean().optional(),
      platform_admin: z.boolean().optional(),
    })
    .default({}),
});

export async function createInvitation(
  hospitalSlug: string,
  input: z.input<typeof InvitationSchema>,
  requestId: string
) {
  const hospital = await resolveHospital(hospitalSlug, ["admin"]);
  const body = InvitationSchema.parse(input);
  if (body.permissions.platform_admin) {
    throw forbidden("Platform administration cannot be granted here.");
  }
  const { supabase } = await requireAuth();
  const expiresAt = new Date(
    Date.now() + body.expiresInHours * 60 * 60 * 1000
  ).toISOString();
  const { data, error } = await supabase.rpc("create_membership_invitation", {
    invite_organization_id: hospital.id,
    invite_email: body.email,
    invite_role: body.role,
    invite_permissions: body.permissions,
    invite_facility_id: body.facilityId ?? null,
    invite_patient_id: body.patientId ?? null,
    invite_expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);
  const invitation = Array.isArray(data) ? data[0] : data;
  await writeAudit(supabase, {
    organizationId: hospital.id,
    action: "membership.invited",
    resourceType: "membership_invitation",
    resourceId: invitation?.invitation_id ?? null,
    purpose: "healthcare_operations",
    requestId,
    metadata: { role: body.role },
  });
  return invitation;
}

export const MembershipUpdateSchema = z.object({
  status: z.enum(["active", "suspended", "ended"]),
  permissions: z
    .record(z.boolean())
    .optional(),
});

export async function updateMembership(
  hospitalSlug: string,
  membershipId: string,
  input: z.input<typeof MembershipUpdateSchema>,
  requestId: string
) {
  const hospital = await resolveHospital(hospitalSlug, ["admin"]);
  const body = MembershipUpdateSchema.parse(input);
  const { supabase } = await requireAuth();
  const patch: Record<string, unknown> = {
    status: body.status,
    ended_at: body.status === "ended" ? new Date().toISOString() : null,
  };
  if (body.permissions) {
    if (body.permissions.platform_admin) {
      throw forbidden("Platform administration cannot be granted here.");
    }
    // MERGE with the stored permissions — replacing wholesale would silently
    // strip flags the caller didn't mention (e.g. platform_admin).
    const { data: existing } = await supabase
      .from("organization_memberships")
      .select("permissions")
      .eq("id", membershipId)
      .eq("organization_id", hospital.id)
      .maybeSingle();
    patch.permissions = {
      ...((existing?.permissions as Record<string, boolean>) ?? {}),
      ...body.permissions,
    };
  }
  const { data, error } = await supabase
    .from("organization_memberships")
    .update(patch)
    .eq("id", membershipId)
    .eq("organization_id", hospital.id)
    .select("id, user_id, role, status, permissions")
    .maybeSingle();
  if (error || !data) throw notFound("Membership not found.");
  await writeAudit(supabase, {
    organizationId: hospital.id,
    action: `membership.${body.status}`,
    resourceType: "organization_membership",
    resourceId: data.id,
    purpose: "healthcare_operations",
    requestId,
    metadata: { role: data.role },
  });
  return data;
}

export const EnrollmentSchema = z.object({
  facilityId: z.string().uuid().nullable().optional(),
  fullName: z.string().trim().min(1).max(160),
  dateOfBirth: z.string().date().nullable().optional(),
  sex: z.string().trim().max(40).nullable().optional(),
  mrn: z.string().trim().min(1).max(80),
});

export async function enrollPatient(
  hospitalSlug: string,
  input: z.input<typeof EnrollmentSchema>,
  requestId: string
) {
  const hospital = await resolveHospital(hospitalSlug, ["admin"]);
  const body = EnrollmentSchema.parse(input);
  const { supabase } = await requireAuth();
  const { data, error } = await supabase.rpc("enroll_patient", {
    enrollment_organization_id: hospital.id,
    enrollment_facility_id: body.facilityId ?? null,
    patient_full_name: body.fullName,
    patient_date_of_birth: body.dateOfBirth ?? null,
    patient_sex: body.sex ?? null,
    patient_mrn: body.mrn,
    request_id: requestId,
  });
  if (error) {
    if (error.code === "42501") throw forbidden(error.message);
    throw new Error(error.message);
  }
  return { organizationPatientId: data };
}

export const AssignmentSchema = z.object({
  organizationPatientId: z.string().uuid(),
  clinicianMembershipId: z.string().uuid(),
  relationship: z.enum(["primary", "consulting", "covering", "referred"]),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  reason: z.string().trim().max(1000).optional(),
});

export async function createCareAssignment(
  hospitalSlug: string,
  input: z.input<typeof AssignmentSchema>,
  requestId: string
) {
  const hospital = await resolveHospital(hospitalSlug, ["admin"]);
  const body = AssignmentSchema.parse(input);
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("care_team_assignments")
    .insert({
      organization_id: hospital.id,
      organization_patient_id: body.organizationPatientId,
      clinician_membership_id: body.clinicianMembershipId,
      relationship: body.relationship,
      status: "active",
      starts_at: body.startsAt ?? new Date().toISOString(),
      ends_at: body.endsAt ?? null,
      assigned_by: hospital.membership.id,
      reason: body.reason || null,
    })
    .select("id, organization_patient_id, clinician_membership_id, status")
    .single();
  if (error) throw new Error(error.message);
  await writeAudit(supabase, {
    organizationId: hospital.id,
    action: "assignment.created",
    resourceType: "care_team_assignment",
    resourceId: data.id,
    purpose: "healthcare_operations",
    requestId,
  });
  return data;
}

export const HospitalSettingsSchema = z.object({
  displayName: z.string().trim().min(2).max(160),
  legalName: z.string().trim().min(2).max(200),
  timezone: z.string().trim().min(3).max(80),
});

export async function updateHospitalSettings(
  hospitalSlug: string,
  input: z.input<typeof HospitalSettingsSchema>,
  requestId: string
) {
  const hospital = await resolveHospital(hospitalSlug, ["admin"]);
  const body = HospitalSettingsSchema.parse(input);
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("organizations")
    .update({
      display_name: body.displayName,
      legal_name: body.legalName,
      timezone: body.timezone,
    })
    .eq("id", hospital.id)
    .select("id, slug, display_name, legal_name, timezone")
    .single();
  if (error) throw new Error(error.message);
  await writeAudit(supabase, {
    organizationId: hospital.id,
    action: "organization.settings_updated",
    resourceType: "organization",
    resourceId: hospital.id,
    purpose: "healthcare_operations",
    requestId,
  });
  return data;
}

export const FacilitySchema = z.object({
  name: z.string().trim().min(2).max(160),
  facilityType: z.enum(["hospital", "clinic", "department", "location", "virtual"]),
  timezone: z.string().trim().min(3).max(80),
  address: z.record(z.unknown()).default({}),
});

export async function createFacility(
  hospitalSlug: string,
  input: z.input<typeof FacilitySchema>,
  requestId: string
) {
  const hospital = await resolveHospital(hospitalSlug, ["admin"]);
  const body = FacilitySchema.parse(input);
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from("facilities")
    .insert({
      organization_id: hospital.id,
      name: body.name,
      facility_type: body.facilityType,
      timezone: body.timezone,
      address: body.address,
      status: "active",
    })
    .select("id, name, facility_type, timezone, status")
    .single();
  if (error) throw new Error(error.message);
  await writeAudit(supabase, {
    organizationId: hospital.id,
    action: "facility.created",
    resourceType: "facility",
    resourceId: data.id,
    purpose: "healthcare_operations",
    requestId,
  });
  return data;
}
