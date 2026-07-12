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

/** Idempotent anonymous sign-in. Returns the user's auth.uid() or null. */
export async function ensureAnonAuth(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: existing } = await sb.auth.getUser();
  if (existing.user) return existing.user.id;
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) {
    console.warn("[soleiq] anonymous sign-in failed:", error.message);
    return null;
  }
  return data.user?.id ?? null;
}
