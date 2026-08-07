/**
 * The auth storage key, derived without pulling in `@supabase/supabase-js`.
 *
 * The navbar has to know whether the visitor is signed in during its *first*
 * render (otherwise the button flickers from "App" to "Dashboard"), but the
 * Supabase SDK is ~150 kB and belongs in a lazy chunk. Keeping the key here
 * lets the synchronous cookie read happen with no SDK loaded at all.
 *
 * Both supabase-js and @supabase/ssr default to exactly this key, so the app
 * project writes it without any extra configuration.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined

function projectRef(url: string): string | null {
  try {
    return new URL(url).hostname.split('.')[0] || null
  } catch {
    return null
  }
}

export const AUTH_STORAGE_KEY = (() => {
  const ref = SUPABASE_URL ? projectRef(SUPABASE_URL) : null
  return ref ? `sb-${ref}-auth-token` : 'sb-auth-token'
})()
