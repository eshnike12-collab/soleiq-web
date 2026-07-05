/**
 * Server-only Supabase clients. This file must never be imported from
 * `use client` code — the service-role key would leak to the browser
 * bundle. That's a hard rule; the whole reason /api/analyze exists is
 * so this key stays server-side.
 *
 * Two client factories:
 *
 *   serverServiceRoleClient()
 *     Bypasses RLS. Used for Storage writes and inserting into `scans`.
 *
 *   serverUserClient(jwt)
 *     Scoped to the browser's Supabase auth JWT (anonymous session).
 *     Used when we need to resolve `auth.uid()` server-side without
 *     trusting a value the browser posted in the form body.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasServerSupabase(): boolean {
  return !!(SUPABASE_URL && SERVICE_ROLE_KEY);
}

let serviceRole: SupabaseClient | null = null;

/**
 * Cached service-role client. Returns null if Supabase isn't configured
 * so callers can degrade gracefully (skip persistence, return AI result
 * alone) instead of throwing.
 */
export function serverServiceRoleClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  if (serviceRole) return serviceRole;
  serviceRole = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return serviceRole;
}

/**
 * A per-request client scoped to the JWT the browser sent. RLS applies.
 * Returns null if we don't have the anon key or no JWT was provided.
 */
export function serverUserClient(jwt: string | null): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !jwt) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Extract the Supabase auth uid from the browser's JWT. Returns null if
 * missing / invalid / expired. We validate against Supabase (not just
 * decode) so a forged JWT can't get a row inserted under someone else's
 * uid.
 */
export async function uidFromJwt(jwt: string | null): Promise<string | null> {
  if (!jwt) return null;
  const c = serverUserClient(jwt);
  if (!c) return null;
  const { data, error } = await c.auth.getUser(jwt);
  if (error || !data.user) return null;
  return data.user.id;
}
