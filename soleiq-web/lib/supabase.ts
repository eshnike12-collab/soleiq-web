"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null | undefined;

/** Returns the Supabase client, or null if not configured. */
export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  if (!URL || !KEY) {
    console.info("[soleiq] Supabase not configured — running offline-only.");
    cached = null;
    return cached;
  }
  cached = createClient(URL, KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return !!(URL && KEY);
}

/**
 * Returns the signed-in user's auth.uid(), or null when logged out.
 *
 * This used to create an anonymous session on demand — that's why data
 * "reset": every fresh browser session became a new anonymous user and
 * orphaned its rows. The app is now gated behind real Supabase Auth
 * (AuthGate → /login), so this only reports the existing session and never
 * mints anonymous users.
 */
export async function ensureAnonAuth(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: existing } = await sb.auth.getUser();
  return existing.user?.id ?? null;
}
