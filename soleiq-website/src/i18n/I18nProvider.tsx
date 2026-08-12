import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_LOCALE,
  LOCALES,
  QUERY_KEY,
  STORAGE_KEY,
  detectLocale,
  localeMeta,
  type Direction,
  type Locale,
} from './config'
import en from './locales/en'
import type { Dictionary } from './locales/en'

/**
 * The whole i18n runtime: one active locale, one dictionary, one hook.
 *
 * Written rather than installed, for three reasons. The dictionaries are typed
 * against English, so a missing or misspelled key is a build error rather than
 * a string that quietly renders as its own key on a live page. Nothing but the
 * active language is downloaded. And there is no second templating syntax to
 * learn on top of the one this codebase already uses — a phrase is a string, a
 * list of phrases is an array of strings.
 *
 * English is bundled so the first paint is never empty and never a flash of
 * key names; every other language is fetched on demand.
 */

const LOADERS: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  en: async () => ({ default: en }),
  es: () => import('./locales/es'),
  fr: () => import('./locales/fr'),
  de: () => import('./locales/de'),
  hi: () => import('./locales/hi'),
  'zh-Hans': () => import('./locales/zh-Hans'),
  'zh-Hant': () => import('./locales/zh-Hant'),
  ar: () => import('./locales/ar'),
  bn: () => import('./locales/bn'),
  pt: () => import('./locales/pt'),
  ru: () => import('./locales/ru'),
  ur: () => import('./locales/ur'),
  id: () => import('./locales/id'),
  ja: () => import('./locales/ja'),
  mr: () => import('./locales/mr'),
  te: () => import('./locales/te'),
  tr: () => import('./locales/tr'),
  ta: () => import('./locales/ta'),
  vi: () => import('./locales/vi'),
  ko: () => import('./locales/ko'),
}

interface I18nValue {
  locale: Locale
  /** `rtl` for Arabic and Urdu, `ltr` for the rest. */
  dir: Direction
  setLocale: (next: Locale) => void
  /** The active dictionary. English until another language has loaded. */
  d: Dictionary
  /** True while a language is being fetched, so the switcher can say so. */
  loading: boolean
  /** Locale-aware formatters, so numbers and dates follow the language too. */
  formatNumber: (value: number, opts?: Intl.NumberFormatOptions) => string
  formatDate: (value: Date | string | number, opts?: Intl.DateTimeFormatOptions) => string
  formatList: (items: string[]) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
  const [d, setD] = useState<Dictionary>(en)
  const [loading, setLoading] = useState(false)

  /* The visitor's language is only known on the client, so the first render is
     English and the real choice is applied immediately after it. */
  useEffect(() => {
    const found = detectLocale()
    if (found !== DEFAULT_LOCALE) setLocaleState(found)
  }, [])

  /* Fetch whichever language is active. A late reply for a language that is no
     longer selected is dropped rather than applied. */
  useEffect(() => {
    let alive = true
    if (locale === DEFAULT_LOCALE) {
      setD(en)
      setLoading(false)
      return
    }
    setLoading(true)
    LOADERS[locale]()
      .then((mod) => {
        if (alive) setD(mod.default)
      })
      .catch(() => {
        /* A language that will not load falls back to English rather than to a
           blank page. The switcher stays on the chosen language so the reader
           can try again. */
        if (alive) setD(en)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [locale])

  /* `lang` on the root element is what tells a screen reader which voice to
     use and a browser which hyphenation and font stack to apply. Keeping the
     query parameter in step makes a translated page shareable as a link. */
  useEffect(() => {
    const meta = localeMeta(locale)
    document.documentElement.lang = meta.html
    /* Arabic and Urdu are read right to left. `dir` on the root is what flips
       the whole document — text alignment, the order of flex and grid tracks,
       scrollbar side — and it is also what makes the logical CSS below mean
       the right thing. Set here rather than in the markup because it changes
       with the language. */
    document.documentElement.dir = meta.dir

    const url = new URL(window.location.href)
    if (locale === DEFAULT_LOCALE) url.searchParams.delete(QUERY_KEY)
    else url.searchParams.set(QUERY_KEY, locale)
    window.history.replaceState(null, '', url.toString())

    /* Alternates, so a crawler can find the other languages of a page that has
       only one URL. Rewritten in place rather than appended to. */
    document.querySelectorAll('link[data-i18n-alt]').forEach((el) => el.remove())
    const head = document.head
    for (const l of LOCALES) {
      const link = document.createElement('link')
      link.rel = 'alternate'
      link.hreflang = l.html
      const u = new URL(window.location.href)
      if (l.code === DEFAULT_LOCALE) u.searchParams.delete(QUERY_KEY)
      else u.searchParams.set(QUERY_KEY, l.code)
      link.href = u.toString()
      link.setAttribute('data-i18n-alt', '')
      head.appendChild(link)
    }
    const x = document.createElement('link')
    x.rel = 'alternate'
    x.hreflang = 'x-default'
    const xu = new URL(window.location.href)
    xu.searchParams.delete(QUERY_KEY)
    x.href = xu.toString()
    x.setAttribute('data-i18n-alt', '')
    head.appendChild(x)
  }, [locale])

  /* The page title and description are the two pieces of copy that live
     outside React, so they are written here rather than rendered. */
  useEffect(() => {
    document.title = d.meta.title
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', d.meta.description)
  }, [d])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* Not being able to remember the choice is not a reason to refuse it. */
    }
  }, [])

  const value = useMemo<I18nValue>(() => {
    const tag = localeMeta(locale).html
    return {
      locale,
      dir: localeMeta(locale).dir,
      setLocale,
      d,
      loading,
      formatNumber: (v, opts) => new Intl.NumberFormat(tag, opts).format(v),
      formatDate: (v, opts) =>
        new Intl.DateTimeFormat(tag, opts ?? { year: 'numeric', month: 'short', day: 'numeric' })
          .format(typeof v === 'string' || typeof v === 'number' ? new Date(v) : v),
      /* `Intl.ListFormat` is newer than this project's TS lib target, and it is
         missing on older Safari, so it is looked up rather than called. */
      formatList: (items) => {
        const LF = (Intl as unknown as { ListFormat?: new (l: string, o: object) => { format(i: string[]): string } })
          .ListFormat
        return LF
          ? new LF(tag, { style: 'long', type: 'conjunction' }).format(items)
          : items.join(', ')
      },
    }
  }, [locale, setLocale, d, loading])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

/** The active dictionary on its own — the common case. */
export function useT(): Dictionary {
  return useI18n().d
}

/**
 * Fills `{name}` placeholders in a phrase.
 *
 * Kept deliberately small: the only thing a translator ever has to preserve is
 * the brace and the name inside it.
 */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole
  )
}
