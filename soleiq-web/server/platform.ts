import "server-only";

import { z } from "zod";
import { forbidden } from "./errors";
import { requireAuth } from "./auth";
import { gatherMonthlyStats } from "./monthlyReport";
import { currentMonthWindow, previousMonthWindow } from "@/lib/monthlyReport";

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

/** Care-team feedback inbox (RLS: platform admin only). Returns [] when the
 *  feedback migration hasn't been applied yet rather than crashing the
 *  console. */
export async function listPlatformFeedback() {
  const { supabase } = await requirePlatformAdmin();
  const { data, error } = await supabase
    .from("feedback")
    .select("id, role, category, message, contact_email, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return [];
  return data ?? [];
}

/**
 * The figures behind the monthly operator report, for the dashboard.
 *
 * ORDER MATTERS HERE. `requirePlatformAdmin()` runs FIRST and throws for
 * anyone else; only then does `gatherMonthlyStats` touch the service-role
 * client. That client bypasses RLS, so it must never be reachable by a caller
 * who has not already been checked — the authorization is this line, not
 * anything inside the gatherer.
 *
 * Returns the month in progress and the month just closed: the first is what
 * is happening now, the second is what the email reported, so the dashboard
 * and the inbox can be reconciled.
 *
 * Aggregate counts only — see lib/monthlyReport.ts.
 */
export async function getPlatformMonthlyStats() {
  await requirePlatformAdmin();
  const now = new Date();
  const current = currentMonthWindow(now);
  const previous = previousMonthWindow(now);
  const [currentStats, previousStats] = await Promise.all([
    gatherMonthlyStats(current),
    gatherMonthlyStats(previous),
  ]);
  return { current, currentStats, previous, previousStats };
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
