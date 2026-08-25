/**
 * The twenty languages the app is published in.
 *
 * This list is the same one soleiqhealth.com uses, deliberately and to the
 * letter — same codes, same order, same script split for Chinese. The two
 * properties are one product to the person using them, and a language offered
 * on the marketing site that turns out to be missing once you sign in is worse
 * than not offering it at all.
 *
 * It is the world's most-spoken languages by total speakers (Ethnologue,
 * L1 + L2), resolved into locales software can actually be published in.
 * Three entries on that list do not survive that resolution:
 *
 *   Mandarin is a spoken variety, and a screen has no spoken form. What
 *   written Chinese really splits on is script, so it becomes two locales,
 *   zh-Hans and zh-Hant. Both are Mandarin.
 *
 *   Cantonese (Yue) is 20th by speakers, but formal written Cantonese is
 *   standard written Chinese — which zh-Hant already is.
 *
 *   Nigerian Pidgin is 14th by speakers and has no standardised orthography.
 *   Publishing clinical copy in it would mean inventing spellings.
 *
 * Those slots go to Vietnamese and Korean instead.
 */

/**
 * Text direction is `ltr` for every language, including Arabic and Urdu.
 *
 * Deliberate, and matched to soleiqhealth.com. The convention for those two is
 * to mirror the whole page; this product was asked for the opposite — one
 * layout everywhere, the brand and the chrome in the same place in all twenty
 * languages, only the words changing.
 *
 * Arabic and Urdu still read right to left within a line. That is intrinsic to
 * the characters; `dir` arranges boxes, it does not shape script.
 */
export const LOCALES = [
  { code: 'en', name: 'English', native: 'English', html: 'en', dir: 'ltr' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)', native: '简体中文', html: 'zh-Hans', dir: 'ltr' },
  { code: 'zh-Hant', name: 'Chinese (Traditional)', native: '繁體中文', html: 'zh-Hant', dir: 'ltr' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', html: 'hi', dir: 'ltr' },
  { code: 'es', name: 'Spanish', native: 'Español', html: 'es', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', native: 'العربية', html: 'ar', dir: 'ltr' },
  { code: 'fr', name: 'French', native: 'Français', html: 'fr', dir: 'ltr' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', html: 'bn', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', native: 'Português', html: 'pt-BR', dir: 'ltr' },
  { code: 'ru', name: 'Russian', native: 'Русский', html: 'ru', dir: 'ltr' },
  { code: 'ur', name: 'Urdu', native: 'اردو', html: 'ur', dir: 'ltr' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', html: 'id', dir: 'ltr' },
  { code: 'de', name: 'German', native: 'Deutsch', html: 'de', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', native: '日本語', html: 'ja', dir: 'ltr' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', html: 'mr', dir: 'ltr' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', html: 'te', dir: 'ltr' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', html: 'tr', dir: 'ltr' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', html: 'ta', dir: 'ltr' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', html: 'vi', dir: 'ltr' },
  { code: 'ko', name: 'Korean', native: '한국어', html: 'ko', dir: 'ltr' },
] as const;

export type Locale = (typeof LOCALES)[number]['code'];
export type Direction = 'ltr' | 'rtl';

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_CODES = LOCALES.map((l) => l.code) as readonly Locale[];

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALE_CODES as readonly string[]).includes(value);
}

export function localeMeta(code: Locale) {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}

/**
 * Where the choice is remembered, and the query parameter that overrides it.
 *
 * Both strings match the marketing site's. `localStorage` is per-origin, so
 * the key alone does not carry a choice from soleiqhealth.com to
 * app.soleiqhealth.com — the query parameter is what does that, and the links
 * between the two properties append it. Matching the key is still what makes
 * the two behave identically once you are on either one.
 */
export const STORAGE_KEY = 'soleiq.locale';
export const QUERY_KEY = 'lang';

/**
 * Best match for a browser language tag.
 *
 * Region is dropped (`es-MX` → `es`, `pt-PT` → `pt`), and Chinese is resolved
 * by script rather than by region: `zh-TW`, `zh-HK` and `zh-MO` are
 * Traditional, everything else Simplified. `zh-Hant-*` is honoured directly
 * where a browser sends it.
 */
export function matchLocale(tag: string): Locale | null {
  const t = tag.toLowerCase();
  if (t.startsWith('zh')) {
    if (t.includes('hant') || /(^|-)(tw|hk|mo)(-|$)/.test(t)) return 'zh-Hant';
    return 'zh-Hans';
  }
  const base = t.split('-')[0];
  return (LOCALE_CODES as readonly string[]).includes(base) ? (base as Locale) : null;
}

/** The user's language: an explicit choice first, then the browser. */
export function detectLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  const fromQuery = new URLSearchParams(window.location.search).get(QUERY_KEY);
  if (fromQuery) {
    const m = matchLocale(fromQuery);
    if (m) return m;
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    /* Private mode, or storage disabled. The browser's own list still works. */
  }

  for (const tag of navigator.languages ?? [navigator.language]) {
    const m = matchLocale(tag);
    if (m) return m;
  }
  return DEFAULT_LOCALE;
}

/** The marketing site, which the app's top bar links back to. */
export const WEBSITE_URL = 'https://soleiqhealth.com';

/**
 * A cross-property URL carrying the reader's language with it.
 *
 * Used for the link back to soleiqhealth.com. Without it, someone who chose
 * Bengali in the app would arrive at the marketing site in whatever their
 * browser asks for, which is often not the language they just picked.
 */
export function withLocale(url: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return url;
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}${QUERY_KEY}=${encodeURIComponent(locale)}`;
}
