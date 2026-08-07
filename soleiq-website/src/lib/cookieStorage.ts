/**
 * Cookie-backed storage adapter for supabase-js.
 *
 * Why this exists
 * ---------------
 * The marketing site is served from `soleiqhealth.com`; the patient/clinician
 * app is served from `app.soleiqhealth.com`. `localStorage` is per-origin, so
 * the site can never read a session the app wrote there. A cookie scoped to
 * `.soleiqhealth.com` *is* readable from both, so we point supabase-js at
 * cookies instead.
 *
 * The write format matches `@supabase/ssr`'s browser client (which the app
 * uses), including its `base64-` value prefix and its `.0` / `.1` chunking for
 * values over the ~3.2 KB per-cookie budget — so whichever side writes, the
 * other side can read.
 */

const COOKIE_ROOT_DOMAIN = 'soleiqhealth.com'
const MAX_CHUNK = 3180 // @supabase/ssr's chunk size, minus room for the name
const BASE64_PREFIX = 'base64-'

function isBrowser(): boolean {
  return typeof document !== 'undefined'
}

/**
 * `.soleiqhealth.com` in production (shared with the app subdomain), and no
 * domain attribute at all on localhost / preview hosts, where a dotted domain
 * would simply be rejected by the browser.
 */
function cookieDomain(): string | null {
  if (!isBrowser()) return null
  const host = window.location.hostname
  if (host === COOKIE_ROOT_DOMAIN || host.endsWith('.' + COOKIE_ROOT_DOMAIN)) {
    return '.' + COOKIE_ROOT_DOMAIN
  }
  return null
}

function readAllCookies(): Map<string, string> {
  const jar = new Map<string, string>()
  if (!isBrowser() || !document.cookie) return jar
  for (const part of document.cookie.split('; ')) {
    const eq = part.indexOf('=')
    if (eq < 1) continue
    const name = part.slice(0, eq)
    const value = part.slice(eq + 1)
    try {
      jar.set(decodeURIComponent(name), decodeURIComponent(value))
    } catch {
      jar.set(name, value)
    }
  }
  return jar
}

/** Reassembles `key`, or `key.0` + `key.1` + … if the writer chunked it. */
function readChunked(jar: Map<string, string>, key: string): string | null {
  const whole = jar.get(key)
  if (whole !== undefined) return whole

  const parts: string[] = []
  for (let i = 0; ; i++) {
    const chunk = jar.get(`${key}.${i}`)
    if (chunk === undefined) break
    parts.push(chunk)
  }
  return parts.length ? parts.join('') : null
}

function decodeBase64(value: string): string {
  // Tolerate URL-safe base64 and missing padding.
  const normalised = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalised + '='.repeat((4 - (normalised.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  const domain = cookieDomain()
  const attrs = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    'path=/',
    `max-age=${maxAgeSeconds}`,
    'SameSite=Lax',
  ]
  if (domain) attrs.push(`domain=${domain}`)
  if (window.location.protocol === 'https:') attrs.push('Secure')
  document.cookie = attrs.join('; ')
}

function deleteCookie(name: string) {
  writeCookie(name, '', 0)
  // Also clear any host-only twin so a stale value can't shadow the shared one.
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; SameSite=Lax`
}

/** Number of `key.N` chunks currently present, so stale ones can be removed. */
function chunkCount(jar: Map<string, string>, key: string): number {
  let n = 0
  while (jar.has(`${key}.${n}`)) n++
  return n
}

export const cookieStorage = {
  getItem(key: string): string | null {
    if (!isBrowser()) return null
    const raw = readChunked(readAllCookies(), key)
    if (raw === null || raw === '') return null
    if (!raw.startsWith(BASE64_PREFIX)) return raw
    try {
      return decodeBase64(raw.slice(BASE64_PREFIX.length))
    } catch {
      return null
    }
  },

  setItem(key: string, value: string): void {
    if (!isBrowser()) return
    const jar = readAllCookies()
    const encoded = BASE64_PREFIX + btoa(String.fromCharCode(...new TextEncoder().encode(value)))
    const maxAge = 60 * 60 * 24 * 365

    // Clear the previous representation before writing the new one, so we never
    // leave a whole-cookie and a chunk set fighting each other.
    if (jar.has(key)) deleteCookie(key)
    const stale = chunkCount(jar, key)

    if (encoded.length <= MAX_CHUNK) {
      writeCookie(key, encoded, maxAge)
      for (let i = 0; i < stale; i++) deleteCookie(`${key}.${i}`)
      return
    }

    const chunks: string[] = []
    for (let i = 0; i < encoded.length; i += MAX_CHUNK) {
      chunks.push(encoded.slice(i, i + MAX_CHUNK))
    }
    chunks.forEach((chunk, i) => writeCookie(`${key}.${i}`, chunk, maxAge))
    for (let i = chunks.length; i < stale; i++) deleteCookie(`${key}.${i}`)
  },

  removeItem(key: string): void {
    if (!isBrowser()) return
    const jar = readAllCookies()
    deleteCookie(key)
    const n = chunkCount(jar, key)
    for (let i = 0; i < n; i++) deleteCookie(`${key}.${i}`)
  },
}
