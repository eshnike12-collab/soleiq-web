"use client";

import { getSupabase } from "./supabase";

let cached: string | null = null;
let resolved = false;

/** The id of the default 'soleiq' org. Cached for the session. */
export async function getDefaultOrgId(): Promise<string | null> {
  if (resolved) return cached;
  const sb = getSupabase();
  if (!sb) {
    resolved = true;
    return null;
  }
  const { data, error } = await sb
    .from("organizations")
    .select("id")
    .eq("slug", "soleiq")
    .maybeSingle();
  if (error) {
    console.warn("[soleiq] getDefaultOrgId failed:", error.message);
    resolved = true;
    return null;
  }
  cached = data?.id ?? null;
  resolved = true;
  return cached;
}
