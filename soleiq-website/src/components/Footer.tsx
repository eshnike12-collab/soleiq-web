import { Instagram, Linkedin } from 'lucide-react'
import SoleIQLogo from './SoleIQLogo'
import { APP_URL, useAppSession } from '../hooks/useAppSession'
import { SOCIAL } from '../data/social'
import { useT, fill } from '../i18n/I18nProvider'

const SOCIAL_ICON: Record<string, typeof Instagram> = {
  Instagram,
  LinkedIn: Linkedin,
}

const LINKS = [
  { key: 'howItWorks', href: '#how-it-works' },
  { key: 'inPractice', href: '#journeys' },
  { key: 'research', href: '#research' },
  { key: 'about', href: '#about' },
  { key: 'contact', href: '#contact' },
] as const

const CONTACT_EMAIL = 'contact.soleiq@gmail.com'

export default function Footer() {
  const { signedIn } = useAppSession()
  const year = new Date().getFullYear()
  const d = useT()

  return (
    <footer className="border-t border-clr-border" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        {d.footer.heading}
      </h2>
      <div className="shell py-16 md:py-20">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <SoleIQLogo size={32} />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-clr-muted">
              {d.footer.tagline}
            </p>
            <a href={APP_URL} className="btn btn-secondary btn-sm mt-6">
              {signedIn ? d.footer.dashboard : d.footer.openApp}
            </a>

            <ul className="mt-8 flex items-center gap-2">
              {SOCIAL.map(({ label, href }) => {
                const Icon = SOCIAL_ICON[label]
                return (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link"
                      aria-label={fill(d.footer.onNetwork, { network: label })}
                    >
                      {Icon && <Icon size={19} aria-hidden="true" />}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>

          <nav aria-label={d.footer.nav}>
            <ul className="grid grid-cols-2 gap-x-12 gap-y-0 sm:grid-cols-3 sm:gap-y-3 md:grid-cols-2">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="tap inline-flex items-center text-sm text-clr-muted transition-colors hover:text-clr-text"
                  >
                    {d.nav[link.key]}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="tap inline-flex items-center text-sm text-clr-muted transition-colors hover:text-clr-text"
                >
                  {d.footer.emailUs}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-14 border-t border-clr-border pt-8">
          <p className="max-w-3xl text-xs leading-relaxed text-clr-muted">
            {d.footer.disclaimer}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 sm:mt-6">
            <p className="text-xs text-clr-muted">{fill(d.footer.copyright, { year })}</p>
            {/* TODO(soleiq): point these at the real policy pages when they exist. */}
            <a href={`mailto:${CONTACT_EMAIL}`} className="tap inline-flex items-center text-xs text-clr-muted hover:text-clr-text">
              {d.footer.privacy}
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="tap inline-flex items-center text-xs text-clr-muted hover:text-clr-text">
              {d.footer.terms}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
