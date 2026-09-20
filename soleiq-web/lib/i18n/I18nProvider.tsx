"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { withTimeout } from "@/lib/withTimeout";
import {
  DEFAULT_LOCALE,
  QUERY_KEY,
  STORAGE_KEY,
  detectLocale,
  localeMeta,
  type Direction,
  type Locale,
} from "./config";

/**
 * Deadline for fetching a locale bundle.
 *
 * Long enough for a small chunk over slow 3G, short enough that nobody
 * concludes the app is broken and force-quits it. On expiry the app renders in
 * English with a visible notice — never a spinner that outlives the user's
 * patience.
 */
const LOCALE_LOAD_TIMEOUT_MS = 8000;

/**
 * One retry before giving up, after a short pause.
 *
 * The failures seen in practice are transient — a dropped connection mid
 * chunk, a proxy hiccup, a radio handover — and for those a second attempt
 * simply works. Webpack drops a failed chunk from its cache, so the retry is
 * a real network request rather than a replay of the same rejected promise.
 *
 * One retry, not three: past the first, the cause is almost always a chunk
 * that is genuinely not there any more (a deployment replaced the hashed
 * filename while this tab was open), and no number of retries will conjure
 * it back. That case needs a reload, which is what the switcher offers.
 */
const LOCALE_RETRY_DELAY_MS = 600;

import en from "./locales/en";
import type { Dictionary } from "./locales/en";

/**
 * The whole i18n runtime: one active locale, one dictionary, one hook.
 *
 * The same design as soleiqhealth.com's, ported rather than reinvented, so the
 * two properties behave identically and a string moved from one to the other
 * needs no rewriting. Written rather than installed, for three reasons. The
 * dictionaries are typed against English, so a missing or misspelled key is a
 * build error rather than a key name rendered on a live screen. Nothing but
 * the active language is downloaded. And there is no second templating syntax
 * on top of the one this codebase already uses.
 *
 * This is a client component and sits directly under <body>, so server
 * components still render on the server and arrive here as `children`.
 * Anything that needs the dictionary has to be a client component itself.
 *
 * English is bundled so the first paint is never empty and never a flash of
 * key names; every other language is fetched on demand.
 */

const LOADERS: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  en: async () => ({ default: en }),
  es: () => import("./locales/es"),
  fr: () => import("./locales/fr"),
  de: () => import("./locales/de"),
  hi: () => import("./locales/hi"),
  "zh-Hans": () => import("./locales/zh-Hans"),
  "zh-Hant": () => import("./locales/zh-Hant"),
  bn: () => import("./locales/bn"),
  pt: () => import("./locales/pt"),
  ru: () => import("./locales/ru"),
  id: () => import("./locales/id"),
  ja: () => import("./locales/ja"),
  mr: () => import("./locales/mr"),
  te: () => import("./locales/te"),
  tr: () => import("./locales/tr"),
  ta: () => import("./locales/ta"),
  vi: () => import("./locales/vi"),
  ko: () => import("./locales/ko"),
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * True for the error a browser raises when a code-split chunk cannot be
 * fetched. Distinguished from an ordinary failure because it usually means
 * this tab is running against a deployment that no longer exists, and the fix
 * is a reload rather than a retry.
 */
function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const name = (error as { name?: string }).name ?? "";
  const message = (error as { message?: string }).message ?? "";
  return (
    name === "ChunkLoadError" ||
    /loading chunk|failed to fetch dynamically imported module|importing a module script failed/i.test(
      message
    )
  );
}

interface I18nValue {
  locale: Locale;
  /** `ltr` for every published language. See `config.ts`. */
  dir: Direction;
  setLocale: (next: Locale) => void;
  /** The active dictionary. English until another language has loaded. */
  d: Dictionary;
  /** True while a language is being fetched, so the switcher can say so. */
  loading: boolean;
  /** Locale-aware formatters, so numbers and dates follow the language too. */
  formatNumber: (value: number, opts?: Intl.NumberFormatOptions) => string;
  formatDate: (
    value: Date | string | number,
    opts?: Intl.DateTimeFormatOptions
  ) => string;
  formatList: (items: string[]) => string;
  /** The locale that failed to load, if English is a fallback. */
  localeLoadError: string | null;
  /**
   * True when the failure looks like a stale deployment — this tab is asking
   * for a chunk filename that no longer exists on the server. Retrying cannot
   * fix it; reloading can.
   */
  localeLoadNeedsReload: boolean;
  /** Try the failed language again. */
  retryLocale: () => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [d, setD] = useState<Dictionary>(en);
  /** The locale that failed, so the UI can name it. */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needsReload, setNeedsReload] = useState(false);
  const [loading, setLoading] = useState(false);
  /* Bumping this re-runs the fetch effect for the same locale. */
  const [attempt, setAttempt] = useState(0);

  /* The user's language is only known on the client, so the first render is
     English and the real choice is applied immediately after it. Running this
     during render instead would mismatch the server-rendered HTML. */
  useEffect(() => {
    const found = detectLocale();
    if (found !== DEFAULT_LOCALE) setLocaleState(found);
  }, []);

  /* Fetch whichever language is active. A late reply for a language that is no
     longer selected is dropped rather than applied. */
  useEffect(() => {
    let alive = true;
    if (locale === DEFAULT_LOCALE) {
      setD(en);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setNeedsReload(false);
    /* The deadline is the fix for the hang, not the catch block.
       A failed chunk request rejects and was always handled; a chunk request
       that neither completes nor fails leaves this promise pending forever,
       so `.catch` and `.finally` never run and the spinner never clears.
       Eight seconds is long enough for a slow 3G fetch of a small bundle and
       short enough that nobody concludes the app is broken. */
    /* Two attempts, then English. The timeout is what makes this terminate
       at all: a chunk request that neither completes nor fails leaves the
       promise pending forever, so without a deadline `.catch` never runs and
       the spinner outlives the user's patience. */
    const load = async () => {
      let lastError: unknown = null;
      for (let tries = 0; tries < 2; tries += 1) {
        if (tries > 0) await wait(LOCALE_RETRY_DELAY_MS);
        try {
          return await withTimeout(
            LOADERS[locale](),
            LOCALE_LOAD_TIMEOUT_MS,
            `locale ${locale}`
          );
        } catch (err) {
          lastError = err;
          /* A chunk that is not on the server will not appear on a retry. */
          if (isChunkLoadError(err)) break;
        }
      }
      throw lastError;
    };

    load()
      .then((mod) => {
        if (alive) setD(mod.default);
      })
      .catch((err) => {
        /* A language that will not load falls back to English rather than to a
           blank screen. The switcher stays on the chosen language so it can be
           tried again, and the notice says what happened — a silent fallback
           to English looks like the switcher simply not working. */
        if (!alive) return;
        console.warn("[i18n] falling back to English:", err);
        setD(en);
        setLoadError(locale);
        setNeedsReload(isChunkLoadError(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [locale, attempt]);

  /* `lang` on the root element is what tells a screen reader which voice to
     use and a browser which hyphenation and font stack to apply. Keeping the
     query parameter in step makes a translated screen shareable as a link, and
     is also how the choice travels between soleiqhealth.com and this app —
     localStorage cannot cross the two origins, a link can. */
  useEffect(() => {
    const meta = localeMeta(locale);
    document.documentElement.lang = meta.html;
    /* `dir` on the root is what would flip the whole document — text
       alignment, the order of flex and grid tracks, scrollbar side. Every
       published language is `ltr`, so this writes the same value each time; it
       is still read from the locale rather than hard-coded, so adding a
       right-to-left language is a change in one file. */
    document.documentElement.dir = meta.dir;

    const url = new URL(window.location.href);
    if (locale === DEFAULT_LOCALE) url.searchParams.delete(QUERY_KEY);
    else url.searchParams.set(QUERY_KEY, locale);
    window.history.replaceState(null, "", url.toString());
  }, [locale]);

  const retryLocale = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Not being able to remember the choice is not a reason to refuse it. */
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const tag = localeMeta(locale).html;
    return {
      locale,
      dir: localeMeta(locale).dir,
      setLocale,
      d,
      loading,
      /* Non-null when the chosen language could not be loaded and English is
         being shown instead. Consumers render a dismissible notice: a silent
         fallback looks like the switcher is simply broken. */
      localeLoadError: loadError,
      localeLoadNeedsReload: needsReload,
      retryLocale,
      formatNumber: (v, opts) => new Intl.NumberFormat(tag, opts).format(v),
      formatDate: (v, opts) =>
        new Intl.DateTimeFormat(
          tag,
          opts ?? { year: "numeric", month: "short", day: "numeric" }
        ).format(typeof v === "string" || typeof v === "number" ? new Date(v) : v),
      /* `Intl.ListFormat` is missing on older Safari, so it is looked up
         rather than called. */
      formatList: (items) => {
        const LF = (
          Intl as unknown as {
            ListFormat?: new (
              l: string,
              o: object
            ) => { format(i: string[]): string };
          }
        ).ListFormat;
        return LF
          ? new LF(tag, { style: "long", type: "conjunction" }).format(items)
          : items.join(", ");
      },
    };
  }, [locale, setLocale, d, loading, loadError, needsReload, retryLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** The active dictionary on its own — the common case. */
export function useT(): Dictionary {
  return useI18n().d;
}

/**
 * Fills `{name}` placeholders in a phrase.
 *
 * Kept deliberately small: the only thing a translator ever has to preserve is
 * the brace and the name inside it.
 */
export function fill(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole
  );
}
