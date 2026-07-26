export type MatrixRole = "patient" | "doctor" | "admin" | "platform_admin";

export interface AuthorizationPrincipal {
  role: MatrixRole;
  userId: string;
  organizationId?: string;
  membershipStatus?: "active" | "invited" | "suspended" | "ended";
  phiAccess?: boolean;
}

export interface ClinicalResource {
  organizationId: string;
  patientUserId: string;
  released: boolean;
  activeAssignedDoctorUserIds: string[];
  validConsentDoctorUserIds: string[];
}

/**
 * Executable specification mirrored by the SQL authorization functions.
 * PostgreSQL RLS remains the enforcement boundary.
 */
export function canReadClinicalResource(
  principal: AuthorizationPrincipal,
  resource: ClinicalResource
) {
  if (principal.role === "patient") {
    return principal.userId === resource.patientUserId && resource.released;
  }
  if (principal.role === "platform_admin") return false;
  if (
    principal.membershipStatus !== "active" ||
    principal.organizationId !== resource.organizationId
  ) {
    return false;
  }
  if (principal.role === "admin") return principal.phiAccess === true;
  return (
    resource.activeAssignedDoctorUserIds.includes(principal.userId) ||
    resource.validConsentDoctorUserIds.includes(principal.userId)
  );
}

