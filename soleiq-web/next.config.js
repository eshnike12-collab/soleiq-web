/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  outputFileTracingRoot: __dirname,
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    // 'wasm-unsafe-eval' is required to instantiate a WebAssembly module.
    // onnxruntime-web (Part 2) is WASM; without it the runtime fails to
    // initialise with a CSP violation rather than a load error, which is a
    // needlessly confusing way to find out.
    const scriptSrc = isDev
      ? "'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'"
      : "'self' 'unsafe-inline' 'wasm-unsafe-eval'";

    /**
     * The 3D scan uploads straight from the browser to the reconstruction
     * service, so that origin has to be in `connect-src` or the request is
     * refused before a packet leaves the tab.
     *
     * This was the failure that masked every other 3D-scan bug: setting
     * NEXT_PUBLIC_FOOT_AI_URL and deploying the service still produced an
     * identical "scan failed", because the CSP blocked it either way.
     * Verified in production against both a loopback and an https service:
     *
     *   Connecting to 'https://foot-ai.soleiqhealth.com/scans' violates the
     *   following Content Security Policy directive: "connect-src 'self'
     *   https://*.supabase.co wss://*.supabase.co". The action has been blocked.
     *
     * DERIVED from the same variable the client reads rather than written out
     * again. A second hardcoded copy of the URL is a copy that can drift, and
     * a drifted CSP fails in exactly this way — silently, and looking like a
     * network error rather than a policy one.
     *
     * Only the ORIGIN is taken: `connect-src` matches on origin, and feeding
     * it a full URL with a path silently narrows the rule.
     */
    const footAiOrigin = (() => {
      const raw = (process.env.NEXT_PUBLIC_FOOT_AI_URL || "").trim();
      if (raw) {
        try {
          return new URL(raw).origin;
        } catch {
          // A malformed value must not take the whole header down with it.
          console.warn(
            "[csp] NEXT_PUBLIC_FOOT_AI_URL is not a valid URL; " +
              "3D scan uploads will be blocked by connect-src:",
            raw
          );
          return null;
        }
      }
      // Matches the client's development-only loopback fallback.
      return isDev ? "http://127.0.0.1:8000" : null;
    })();

    const connectSrc = [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      footAiOrigin,
      // Both loopback spellings in development: the browser matches the
      // origin as written, so a service reached as `localhost` is not covered
      // by a `127.0.0.1` entry, and developers use both interchangeably.
      ...(isDev ? ["http://127.0.0.1:8000", "http://localhost:8000"] : []),
    ]
      .filter(Boolean)
      // The env-derived origin can duplicate a loopback entry in development.
      .filter((value, index, all) => all.indexOf(value) === index)
      .join(" ");
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src ${scriptSrc}`,
              // fonts.googleapis.com is NOT speculative — app/layout.tsx has
              // always loaded Inter Tight from it for the brand lockup, and
              // this directive has always blocked it:
              //   Loading the stylesheet 'https://fonts.googleapis.com/...'
              //   violates the following Content Security Policy directive:
              //   "style-src 'self' 'unsafe-inline'". The action has been blocked.
              // The brand font had never rendered for a single user.
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              // The stylesheet above is only half of it: the font files it
              // references are served from gstatic and need their own grant.
              "font-src 'self' data: https://fonts.gstatic.com",
              `connect-src ${connectSrc}`,
              "media-src 'self' blob:",
              // There is no worker-src today, so workers fall back to
              // default-src 'self' and blob: workers are refused outright.
              // onnxruntime-web spawns exactly that kind of worker.
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
              "form-action 'self'",
            ].join("; "),
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

module.exports = nextConfig;
