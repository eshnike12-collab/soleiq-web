import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookieStorage } from './cookieStorage'
import { AUTH_STORAGE_KEY } from './authKey'

// This module pulls in the Supabase SDK, so it is only ever imported lazily
// (see lib/blog.ts and hooks/useAppSession.ts) to keep it out of the entry chunk.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

let cached: SupabaseClient | null | undefined

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    cached = null
    return null
  }
  cached = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      // Read the session from a cookie scoped to `.soleiqhealth.com` so the
      // marketing site can tell whether the visitor is signed in to the app.
      storage: cookieStorage,
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      // The marketing site never signs anyone in or refreshes tokens — it only
      // observes. Refreshing here would race the app's own refresh loop.
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  return cached
}

export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_KEY)
}
