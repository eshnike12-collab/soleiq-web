import type { Config } from "tailwindcss";
// Imported rather than require()d: on Node 22+ this config is loaded as ESM,
// where `require` is undefined and the whole CSS build throws.
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * SoleIQ design tokens.
 *
 * The visual system is warm cream + deep navy (brand), with a sage-teal
 * secondary for health/positive states, honey amber for "watch", and a
 * muted coral for urgent — never harsh red. Components must use these
 * token names (or the semantic aliases), not raw hex.
 *
 * Semantic tokens (primary/secondary/surface/ink/success/warn/urgent) read
 * from CSS variables declared in globals.css, so a future dark theme is a
 * variable swap — no component changes.
 *
 * The stock Tailwind scales below (slate, blue, teal, amber, red, …) are
 * REMAPPED to warm equivalents on purpose: the whole app already speaks
 * those names, so re-pointing them restyles every screen consistently.
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

        // ---- Warm neutral family (replaces cool slate + warmGray) -------
        slate: {
          50: "#FAF8F2",
          100: "#F1EDE3",
          200: "#E5E0D2",
          300: "#D2CBBA",
          400: "#A89F8F",
          500: "#837B6C",
          600: "#635D51",
          700: "#4C463C",
          800: "#37332B",
          900: "#262420",
          950: "#181713",
        },
        warmGray: {
          50: "#F5F2EA",
          100: "#E5E0D2",
          600: "#635D51",
          800: "#37332B",
        },

        // ---- Navy family (primary tints) --------------------------------
        blue: {
          50: "#EDF3F9",
          100: "#D9E6F2",
          200: "#BCD3E8",
          300: "#93B7D8",
          600: "#24578A",
          800: "#173C5D",
          900: "#122F49",
        },
        sky: {
          100: "#D9E6F2",
          600: "#2E6899",
        },

        // ---- Sage-teal family (secondary / health-positive) -------------
        teal: {
          50: "#ECF5F0",
          100: "#D3E9DE",
          200: "#B0D8C7",
          400: "#62A98E",
          600: "#337A62",
          700: "#2A6551",
          800: "#204E3F",
          900: "#173A2F",
          950: "#0E241D",
        },
        emerald: {
          50: "#ECF5EE",
          100: "#D5E9DA",
          600: "#3A7D53",
          700: "#2F6644",
          800: "#254F36",
          900: "#1B3B28",
        },
        green: {
          50: "#ECF5EE",
          700: "#2F6644",
        },

        // ---- Honey amber (watch states) ---------------------------------
        amber: {
          50: "#FBF4E3",
          100: "#F5E7C5",
          200: "#ECD49A",
          400: "#D3A648",
          500: "#BC8F26",
          600: "#96701A",
          700: "#785913",
          800: "#59430E",
          900: "#45340B",
          950: "#2A1F06",
        },
        orange: {
          50: "#FAF0E6",
          100: "#F4DEC7",
          300: "#E2B183",
          600: "#B06B2A",
          700: "#8F5622",
          900: "#57350F",
        },

        // ---- Muted coral (urgent — never harsh red) ---------------------
        red: {
          50: "#FAEEEA",
          100: "#F4DAD3",
          200: "#EAC0B5",
          500: "#BE5F4E",
          600: "#A94F3F",
          700: "#8B4134",
          800: "#6E332A",
          900: "#522721",
          950: "#331714",
        },
        rose: {
          100: "#F6DBD8",
          600: "#B25358",
        },

        // ---- Softened supporting hues (tiles, clinical accents) ---------
        indigo: {
          50: "#EFF1F8",
          100: "#DDE2F0",
          600: "#4A5899",
          700: "#3C4880",
        },
        violet: {
          100: "#E4DEEE",
          600: "#6D5A96",
        },
        pink: {
          100: "#F4DEE3",
        },
      },
      boxShadow: {
        // Layered, warm-tinted, and soft — the app's only shadow voices.
        card: "0 1px 2px rgba(38, 36, 32, 0.05), 0 6px 20px -6px rgba(38, 36, 32, 0.08)",
        lifted:
          "0 2px 4px rgba(38, 36, 32, 0.05), 0 14px 32px -10px rgba(38, 36, 32, 0.16)",
        button: "0 6px 16px -6px rgba(31, 78, 121, 0.45)",
      },
      borderRadius: {
        phone: "40px",
      },
      transitionTimingFunction: {
        screen: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
