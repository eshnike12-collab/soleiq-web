import "server-only";

import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { forbidden, unauthorized } from "./errors";

export type MembershipRole = "admin" | "doctor" | "patient";

export interface MembershipContext {
  id: string;
  organization_id: string;
  user_id: string;
  role: MembershipRole;
  status: "invited" | "active" | "suspended" | "ended";
  permissions: Record<string, boolean>;
}

export interface AuthContext {
  supabase: SupabaseClient;
  user: User;
}

export async function requireAuth(): Promise<AuthContext> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  ) {
    throw unauthorized("Authentication is not configured.");
  }
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw unauthorized();
  return { supabase, user: data.user };
}

export async function requireMembership(
  organizationId: string,
  roles?: MembershipRole[]
): Promise<AuthContext & { membership: MembershipContext }> {
  const context = await requireAuth();
  let query = context.supabase
    .from("organization_memberships")
    .select("id, organization_id, user_id, role, status, permissions")
    .eq("organization_id", organizationId)
    .eq("user_id", context.user.id)
    .eq("status", "active");
  if (roles?.length) query = query.in("role", roles);
  const { data, error } = await query.maybeSingle();
  if (error || !data) throw forbidden("No active membership for this hospital.");
  return {
    ...context,
    membership: data as MembershipContext,
  };
}
