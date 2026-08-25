/**
 * The twenty languages this site is published in.
 *
 * The list is the world's most-spoken languages by total speakers (Ethnologue,
 * L1 + L2), resolved into locales a website can actually be published in.
 * Three entries on that list do not survive that resolution, and it is worth
 * saying which and why:
 *
 *   Mandarin is a spoken variety, and a page has no spoken form. What written
 *   Chinese really splits on is script, so it becomes two locales, zh-Hans and
 *   zh-Hant. Both are Mandarin.
 *
 *   Cantonese (Yue) is 20th by speakers, but formal written Cantonese is
 *   standard written Chinese — which zh-Hant already is. A separate locale
 *   would be the same text under a different name.
 *
 *   Nigerian Pidgin is 14th by speakers and has no standardised orthography.
 *   Publishing clinical copy in it would mean inventing spellings.
 *
 * Those three slots go to the next languages down the list instead:
 * Vietnamese and Korean. Say the word if you would rather have Cantonese or
 * Pidgin and I will swap them in.
 */

/**
 * Text direction is `ltr` for every language, including Arabic and Urdu.
 *
 * That is a deliberate product decision, not an oversight. The typographic
 * convention for those two is to mirror the whole page — logo to the right,
 * navigation to the left — and this site did that for a while. It was asked
 * for the opposite: one layout everywhere, so the brand and the furniture sit
 * in the same place in all twenty languages and only the words change.
 *
 * Arabic and Urdu still *read* right to left. That is intrinsic to the
 * characters and the browser handles it per line whatever this says; `dir`
 * governs the arrangement of boxes, not the shaping of script.
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
] as const

export type Locale = (typeof LOCALES)[number]['code']
export type Direction = 'ltr' | 'rtl'

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_CODES = LOCALES.map((l) => l.code) as readonly Locale[]

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALE_CODES as readonly string[]).includes(value)
}

export function localeMeta(code: Locale) {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0]
}

/** Where the choice is remembered, and the query parameter that overrides it. */
export const STORAGE_KEY = 'soleiq.locale'
export const QUERY_KEY = 'lang'

/**
 * Best match for a browser language tag.
 *
 * Region is dropped (`es-MX` → `es`, `pt-PT` → `pt`), and Chinese is resolved
 * by script rather than by region: `zh-TW`, `zh-HK` and `zh-MO` are
 * Traditional, everything else Simplified. `zh-Hant-*` is honoured directly
 * where a browser sends it.
 */
export function matchLocale(tag: string): Locale | null {
  const t = tag.toLowerCase()
  if (t.startsWith('zh')) {
    if (t.includes('hant') || /(^|-)(tw|hk|mo)(-|$)/.test(t)) return 'zh-Hant'
    return 'zh-Hans'
  }
  const base = t.split('-')[0]
  return (LOCALE_CODES as readonly string[]).includes(base) ? (base as Locale) : null
}

/** The visitor's language: an explicit choice first, then the browser. */
export function detectLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE

  const fromQuery = new URLSearchParams(window.location.search).get(QUERY_KEY)
  if (fromQuery) {
    const m = matchLocale(fromQuery)
    if (m) return m
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (isLocale(saved)) return saved
  } catch {
    /* Private mode, or storage disabled. The browser's own list still works. */
  }

  for (const tag of navigator.languages ?? [navigator.language]) {
    const m = matchLocale(tag)
    if (m) return m
  }
  return DEFAULT_LOCALE
}
