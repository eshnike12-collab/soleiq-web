import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;

/**
 * Infrastructure-only client for private object storage and queue workers.
 * Ordinary clinical reads must use the caller-scoped client in server/auth.
 */
export function infrastructureClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Server storage infrastructure is not configured.");
  }
  if (!serviceClient) {
    serviceClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return serviceClient;
}

