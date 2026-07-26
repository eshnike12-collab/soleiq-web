import "server-only";

import { z } from "zod";
import { forbidden } from "./errors";
import { requireAuth } from "./auth";

async function requirePlatformAdmin() {
  const context = await requireAuth();
  const { data } = await context.supabase.rpc("is_platform_admin");
  if (!data) throw forbidden("Platform administration required.");
  return context;
}

export async function listPlatformOrganizations() {
  const { supabase } = await requirePlatformAdmin();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, slug, legal_name, display_name, timezone, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export const OrganizationOnboardingSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  legalName: z.string().trim().min(2).max(200),
  displayName: z.string().trim().min(2).max(160),
  timezone: z.string().trim().min(3).max(80),
});

export async function createOrganization(
  input: z.input<typeof OrganizationOnboardingSchema>
) {
  const { supabase } = await requirePlatformAdmin();
  const body = OrganizationOnboardingSchema.parse(input);
  const { data, error } = await supabase
    .rpc("provision_organization", {
      organization_slug: body.slug,
      organization_legal_name: body.legalName,
      organization_display_name: body.displayName,
      organization_timezone: body.timezone,
    })
    .single();
  if (error) throw new Error(error.message);
  return data;
}
