import "server-only";

import { notFound } from "./errors";
import { requireAuth, type MembershipRole } from "./auth";

export interface HospitalContext {
  id: string;
  slug: string;
  legalName: string;
  displayName: string;
  timezone: string;
  branding: Record<string, unknown>;
  membership: {
    id: string;
    role: MembershipRole;
    permissions: Record<string, boolean>;
  };
}

/** Resolves hospital and membership together; inaccessible hospitals are 404. */
export async function resolveHospital(
  slug: string,
  allowedRoles?: MembershipRole[]
): Promise<HospitalContext> {
  const { supabase, user } = await requireAuth();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, slug, legal_name, display_name, timezone, branding")
    .eq("slug", slug)
    .maybeSingle();
  if (!organization) throw notFound("Hospital not found.");

  let query = supabase
    .from("organization_memberships")
    .select("id, role, status, permissions")
    .eq("organization_id", organization.id)
    .eq("user_id", user.id)
    .eq("status", "active");
  if (allowedRoles?.length) query = query.in("role", allowedRoles);
  const { data: membership } = await query.maybeSingle();
  if (!membership) throw notFound("Hospital not found.");

  return {
    id: organization.id,
    slug: organization.slug,
    legalName: organization.legal_name,
    displayName: organization.display_name,
    timezone: organization.timezone,
    branding: organization.branding ?? {},
    membership: {
      id: membership.id,
      role: membership.role as MembershipRole,
      permissions: (membership.permissions ?? {}) as Record<string, boolean>,
    },
  };
}

