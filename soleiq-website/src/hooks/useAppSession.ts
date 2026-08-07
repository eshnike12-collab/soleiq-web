import { useEffect, useState } from 'react'
import { AUTH_STORAGE_KEY } from '../lib/authKey'
import { cookieStorage } from '../lib/cookieStorage'

export const APP_URL = 'https://app.soleiqhealth.com'

/**
 * Whether the visitor already has a session on app.soleiqhealth.com.
 *
 * Detection is *synchronous first*: the shared cookie is read during the very
 * first render, with no SDK loaded, so the navbar button never flickers from
 * "App" to "Dashboard". The lazy `getSession()` call that follows only ever
 * confirms or corrects it.
 *
 * We deliberately default to `false` (label: "App"). If the shared cookie is
 * absent — which is the case until the app project scopes its auth cookie to
 * `.soleiqhealth.com`, see docs/cross-subdomain-session.md — the button simply
 * reads "App" for everyone: uninformative rather than wrong.
 */
function readCookieSession(): boolean {
  const raw = cookieStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as { access_token?: string; expires_at?: number }
    if (!parsed?.access_token) return false
    // `expires_at` is in seconds. Treat a token expiring within the next minute
    // as already gone, rather than sending someone into a dead session.
    if (typeof parsed.expires_at === 'number') {
      return parsed.expires_at * 1000 > Date.now() + 60_000
    }
    return true
  } catch {
    return false
  }
}

// Module-level so every component using the hook agrees on first paint.
let initialGuess: boolean | null = null

export function useAppSession(): { signedIn: boolean } {
  const [signedIn, setSignedIn] = useState<boolean>(() => {
    if (initialGuess === null) initialGuess = readCookieSession()
    return initialGuess
  })

  useEffect(() => {
    let alive = true
    let unsubscribe: (() => void) | undefined

    // Only worth loading the SDK if there is a cookie to validate; with no
    // cookie the answer is already "signed out" and the SDK would just confirm it.
    if (!readCookieSession()) return

    import('../lib/supabase')
      .then(({ getSupabase }) => {
        const sb = getSupabase()
        if (!sb || !alive) return

        sb.auth
          .getSession()
          .then(({ data }) => {
            if (!alive) return
            const expiresAt = data.session?.expires_at
            setSignedIn(
              !!data.session &&
                (typeof expiresAt !== 'number' || expiresAt * 1000 > Date.now() + 60_000)
            )
          })
          .catch(() => {
            // Never let a transient auth error downgrade a cookie we already read.
          })

        // Picks up a sign-out that happens in another tab.
        const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
          if (alive) setSignedIn(!!session)
        })
        unsubscribe = () => sub.subscription.unsubscribe()
      })
      .catch(() => {
        /* Offline or blocked: keep whatever the cookie said. */
      })

    return () => {
      alive = false
      unsubscribe?.()
    }
  }, [])

  return { signedIn }
}
