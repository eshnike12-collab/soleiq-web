import { Globe } from 'lucide-react'
import { LOCALES, isLocale } from '../i18n/config'
import { useI18n } from '../i18n/I18nProvider'

/**
 * The language control.
 *
 * A native `<select>` on purpose. It is one focusable element, it announces
 * itself correctly to a screen reader without any ARIA of ours, it opens as
 * the platform's own picker on a phone, and it cannot push the navbar around
 * the way a custom dropdown panel would. The visible width is the globe plus a
 * short code, so the bar keeps the proportions it already had.
 *
 * Each option is written in its own language: someone looking for Deutsch is
 * not helped by a list that says "German".
 */
export default function LanguageSwitcher({
  variant = 'bar',
}: {
  /** `bar` sits in the navbar; `sheet` is the full-width row in the mobile menu. */
  variant?: 'bar' | 'sheet'
}) {
  const { locale, setLocale, d, loading } = useI18n()

  const select = (
    <select
      value={locale}
      onChange={(e) => {
        if (isLocale(e.target.value)) setLocale(e.target.value)
        /* Hand focus back to the page. A <select> keeps it after the picker
           closes, which leaves the arrow keys and the wheel talking to the
           control instead of to the document — so you pick a language and
           then cannot scroll. */
        e.currentTarget.blur()
      }}
      aria-label={d.language.change}
      className="lang-select"
      data-variant={variant}
    >
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code} lang={l.html}>
          {l.native}
        </option>
      ))}
    </select>
  )

  if (variant === 'sheet') {
    return (
      <div className="lang-row">
        <span className="inline-flex items-center gap-2 text-clr-muted">
          <Globe size={18} aria-hidden="true" />
          {d.language.label}
        </span>
        {select}
      </div>
    )
  }

  return (
    <span className="lang-wrap" data-loading={loading ? 'true' : 'false'}>
      <Globe size={16} aria-hidden="true" className="lang-icon" />
      {select}
    </span>
  )
}
