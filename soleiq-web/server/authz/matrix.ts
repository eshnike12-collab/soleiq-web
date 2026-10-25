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


/**
 * What a role is CALLED in the interface.
 *
 * The stored value and the label are deliberately different things. The
 * database, the RLS policies, the `/h/[hospitalSlug]/doctor` route and
 * `MatrixRole` all keep "doctor" — renaming any of those would silently break
 * authorization for every clinician account. Only the words on screen change.
 *
 * Centralised so the mapping is stated once. It was previously a string
 * literal at each call site, which is how "Doctor" and "doctor or caregiver"
 * ended up coexisting on adjacent screens.
 */
export function roleLabel(role: MatrixRole | string): string {
  switch (role) {
    case "doctor":
      return "Caregiver";
    case "admin":
      return "Administrator";
    case "platform_admin":
      return "Platform administrator";
    case "patient":
      return "Patient";
    default:
      // An unrecognised role is shown as-is rather than hidden or guessed at.
      return role;
  }
}
