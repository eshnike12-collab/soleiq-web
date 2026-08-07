# Cross-subdomain sign-in detection

**Status: implemented on the website, waiting on one change in the app repo.**
Until that change lands, the navbar button reads **"App"** for everyone. It never
shows a wrong or flickering "Dashboard".

## The problem

- Marketing site: `soleiqhealth.com` (this repo, Vite + supabase-js)
- Patient/clinician app: `app.soleiqhealth.com` (`soleiq-web`, Next.js + `@supabase/ssr`)

`localStorage` is **per-origin**, so the site can never read a session the app
stored there. Cookies are **per-domain** and can be scoped to a parent domain, so
a cookie set with `domain=.soleiqhealth.com` is readable from both hosts.

Note that the app is already on cookies — `@supabase/ssr`'s `createBrowserClient`
writes `sb-<ref>-auth-token` to `document.cookie`, not to `localStorage`. The only
thing missing is the **domain attribute**: right now that cookie is host-only, so
it is scoped to `app.soleiqhealth.com` and invisible to `soleiqhealth.com`.

## What this repo already does

| File | Role |
| --- | --- |
| `src/lib/cookieStorage.ts` | Storage adapter that reads/writes `document.cookie`, scoped to `.soleiqhealth.com` in production and host-only on localhost. Handles `@supabase/ssr`'s `base64-` value prefix and its `.0`/`.1` chunking. |
| `src/lib/authKey.ts` | Derives `sb-<project-ref>-auth-token` from `VITE_SUPABASE_URL` with **no** SDK import, so the first render can read the cookie synchronously. |
| `src/lib/supabase.ts` | `createClient(..., { auth: { storage: cookieStorage, storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false } })`. Lazy-imported so the SDK stays out of the entry chunk. |
| `src/hooks/useAppSession.ts` | Synchronous cookie read on first render → no flicker; then `getSession()` confirms, and `onAuthStateChange` keeps it live. Defaults to signed-out. |

`autoRefreshToken` is off deliberately: the marketing site only observes. Letting
it refresh would race the app's own refresh loop and could rotate a token out
from under an open app tab.

## The one change needed in `soleiq-web`

Not applied here — that repo was explicitly out of scope for this work, and it
currently has uncommitted changes.

```ts
// soleiq-web/utils/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = () =>
  createBrowserClient(supabaseUrl!, supabaseKey!, {
    cookieOptions: {
      domain: ".soleiqhealth.com",   // ← the whole fix
      path: "/",
      sameSite: "lax",
      secure: true,
    },
  });
```

The same `cookieOptions` block must be added to **every** client in that repo that
writes the auth cookie, or a host-only cookie written by one of them will shadow
the shared one:

- `utils/supabase/client.ts` (browser)
- `utils/supabase/server.ts` (route handlers / server actions)
- `utils/supabase/middleware.ts` (the refresh path — this is the one that rewrites
  the cookie on most requests, so missing it here defeats the change)

### Two things to watch

1. **`secure: true` breaks `http://localhost`.** Gate it:
   `secure: process.env.NODE_ENV === "production"`, and drop `domain` in dev
   (a dotted domain is rejected on `localhost`).
2. **Existing sessions keep their host-only cookie.** The browser will hold both
   the old host-only cookie and the new domain-scoped one, and the host-only one
   wins on `app.soleiqhealth.com`. Users get the shared cookie on their next
   sign-in, or after the old one expires. To force it, delete
   `sb-<ref>-auth-token` (and any `.0`/`.1` chunks) for `app.soleiqhealth.com`
   once, on the client, at first load after deploying.

## Verifying it works

1. Sign in at `https://app.soleiqhealth.com`.
2. In DevTools → Application → Cookies, confirm `sb-<ref>-auth-token` has
   **Domain `.soleiqhealth.com`** (with the leading dot), not `app.soleiqhealth.com`.
3. Load `https://soleiqhealth.com`. The top-left button should read **Dashboard**
   on the very first paint.
4. Sign out in the app, reload the site: it should read **App** again.

## If it can't be made to work

Delete `src/hooks/useAppSession.ts`'s cookie logic and hard-code the label to
`"App"`. Nothing else on the site depends on the session — the button target
(`https://app.soleiqhealth.com`) is identical in both states, so the app's own
auth redirect handles the rest.

---

## Related: Europe PMC and CORS

Verified on 6 Aug 2026 — the search endpoint returns:

```
access-control-allow-origin: *
access-control-allow-methods: GET, POST, OPTIONS
```

so `src/lib/europepmc.ts` calls it straight from the browser with no proxy and no
API key. This was confirmed both by response headers and by a live in-browser
search against the built site.

If that ever changes, the fallback is a one-route serverless proxy (this project
already deploys on Vercel, so `api/literature.ts` re-issuing the same request
server-side is enough). PubMed E-utilities and Semantic Scholar are the
alternative sources, in that order.
