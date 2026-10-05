import type { Config } from "tailwindcss";
// Imported rather than require()d: on Node 22+ this config is loaded as ESM,
// where `require` is undefined and the whole CSS build throws.
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * SoleIQ design tokens.
 *
 * The visual system is a medical light blue: white and very light blue
 * surfaces, cool grey-blue neutrals, and restrained pastel accents. Green
 * reads reassuring, amber asks for attention, coral is reserved for genuine
 * urgency — never a neon red.
 *
 * Semantic tokens (primary/secondary/surface/ink/success/warn/urgent) read
 * from CSS variables declared in globals.css, so a future dark theme is a
 * variable swap — no component changes.
 *
 * The stock Tailwind scales below (slate, blue, teal, amber, red, …) are
 * REMAPPED on purpose: the whole app already speaks those names, so
 * re-pointing them restyles every screen at once and keeps one palette
 * instead of two. Changing a scale here changes every screen that uses it —
 * which is the point, and the reason not to add one-off hex anywhere else.
 *
 * Each scale's dark end is chosen to pass WCAG AA as text on white; the light
 * end is chosen to sit under dark text. See the contrast table in globals.css.
 */

const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      letterSpacing: {
        // Matches the marketing site, so "SoleIQ" sets identically on both.
        tightest: "-0.035em",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Only the brand lockup uses this — see app/layout.tsx.
        display: ["'Inter Tight'", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // ---- Semantic tokens (CSS-variable driven) ----------------------
        primary: {
          DEFAULT: v("--c-primary"),
          soft: v("--c-primary-soft"),
          deep: v("--c-primary-deep"),
        },
        secondary: {
          DEFAULT: v("--c-secondary"),
          soft: v("--c-secondary-soft"),
        },
        surface: {
          DEFAULT: v("--c-surface"),
          raised: v("--c-surface-raised"),
          sunken: v("--c-surface-sunken"),
        },
        ink: {
          DEFAULT: v("--c-ink"),
          soft: v("--c-ink-soft"),
          faint: v("--c-ink-faint"),
        },
        success: { DEFAULT: v("--c-success"), soft: v("--c-success-soft") },
        warn: { DEFAULT: v("--c-warn"), soft: v("--c-warn-soft") },
        urgent: { DEFAULT: v("--c-urgent"), soft: v("--c-urgent-soft") },

        // ---- Brand aliases ----------------------------------------------
        brand: v("--c-primary"),
        // The marketing site's values, for the shared top bar only.
        "brand-ink": v("--c-brand-ink"),
        "brand-muted": v("--c-brand-muted"),
        accent: v("--c-urgent"),
        risk: {
          low: "#337A62",
          medium: "#BC8F26",
          high: "#BE5F4E",
        },

        // ---- Cool neutral family (page chrome, borders, muted text) ----
        // Blue-tinted greys so neutrals sit in the same family as the brand
        // rather than reading as a separate warm palette beside it.
        slate: {
          50: "#F7FBFE",
          100: "#F0F5FA",
          200: "#E5EBF0", // the app's hairline
          300: "#CBD6E2",
          400: "#9AA8B8",
          500: "#7A8899",
          600: "#64748B",
          700: "#546478",
          800: "#3A4857",
          900: "#1F2D3D",
          950: "#141E29",
        },
        warmGray: {
          50: "#F7FBFE",
          100: "#F0F5FA",
          600: "#64748B",
          800: "#3A4857",
        },

        // ---- Medical blue (primary) -------------------------------------
        // 400/500 are the identity hues #4A90E2 and #2F80ED. They are fills
        // and tints only: both fail AA as text, so anything carrying words
        // uses 600 or darker.
        blue: {
          50: "#F5FAFF",
          100: "#EAF5FF",
          200: "#CFE4F9",
          300: "#9CC5F0",
          400: "#4A90E2",
          500: "#2F80ED",
          600: "#1B64CC",
          700: "#14539E",
          800: "#10427D",
          900: "#0C3362",
        },
        sky: {
          100: "#EAF5FF",
          600: "#1B64CC",
        },

        // ---- Medical green (health-positive) ----------------------------
        teal: {
          50: "#EAF8F1",
          100: "#DDF5E7",
          200: "#BCE7D0",
          400: "#4FAF78",
          600: "#27694A",
          700: "#20573D",
          800: "#1A4731",
          900: "#143726",
          950: "#0C2218",
        },
        emerald: {
          50: "#EAF8F1",
          100: "#DDF5E7",
          600: "#2F7D52",
          700: "#27694A",
          800: "#20573D",
          900: "#1A4731",
        },
        green: {
          50: "#EAF8F1",
          700: "#27694A",
        },

        // ---- Amber (attention / watch) ----------------------------------
        amber: {
          50: "#FFF8DF",
          100: "#FBEFC4",
          200: "#F2DD9B",
          400: "#D9A520",
          500: "#B8860B",
          600: "#8A6209",
          700: "#6F4E07",
          800: "#573E06",
          900: "#443004",
          950: "#2A1E03",
        },
        orange: {
          50: "#FFF1E8",
          100: "#FDE2CF",
          300: "#F3B98C",
          600: "#A85A2A",
          700: "#8A4921",
          900: "#542C13",
        },

        // ---- Coral (urgent — clinical, never neon) ----------------------
        red: {
          50: "#FFF1E8",
          100: "#FBDED6",
          200: "#F3C2B6",
          500: "#D4604C",
          600: "#B8402F",
          700: "#9A3627",
          800: "#7B2B1F",
          900: "#5E2118",
          950: "#3A1410",
        },
        rose: {
          100: "#FBDED6",
          600: "#B8402F",
        },

        // ---- Soft lavender / blush (supporting tiles) -------------------
        indigo: {
          50: "#F7F4FD",
          100: "#F1EDFA",
          600: "#5B52A3",
          700: "#4A4287",
        },
        violet: {
          100: "#F1EDFA",
          600: "#6B5CA5",
        },
        pink: {
          100: "#FBE7EC",
        },
      },

      boxShadow: {
        // Cool-tinted and deliberately quiet — the page ground already
        // separates a white card, so the shadow only has to confirm it. Three
        // voices, no more: resting, raised, and the primary action.
        card: "0 1px 2px rgba(31, 45, 61, 0.04), 0 4px 16px -6px rgba(31, 45, 61, 0.07)",
        lifted:
          "0 2px 4px rgba(31, 45, 61, 0.05), 0 12px 28px -10px rgba(31, 45, 61, 0.13)",
        button: "0 6px 16px -8px rgba(27, 100, 204, 0.5)",
      },
      borderRadius: {
        phone: "40px",
      },
      // Type scale anchors used by the shared presentation components. Kept
      // here so the hierarchy is stated once rather than re-derived per screen.
      fontSize: {
        "page-title": ["1.75rem", { lineHeight: "1.2", letterSpacing: "-0.015em" }],
        "section-title": ["1.3125rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        "card-title": ["1.0625rem", { lineHeight: "1.35" }],
      },
      transitionTimingFunction: {
        screen: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
