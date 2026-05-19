import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

let cached: SupabaseClient | null | undefined

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached
  if (!URL || !KEY) {
    cached = null
    return null
  }
  cached = createClient(URL, KEY, {
    auth: { persistSession: false },
  })
  return cached
}

export function isSupabaseConfigured(): boolean {
  return !!(URL && KEY)
}
