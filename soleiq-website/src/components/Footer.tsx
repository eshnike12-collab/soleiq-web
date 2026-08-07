import SoleIQLogo from './SoleIQLogo'
import { APP_URL, useAppSession } from '../hooks/useAppSession'

const LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'In practice', href: '#journeys' },
  { label: 'Research', href: '#research' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
]

const CONTACT_EMAIL = 'contact.soleiq@gmail.com'

export default function Footer() {
  const { signedIn } = useAppSession()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-clr-border" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Site footer
      </h2>
      <div className="shell py-16 md:py-20">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <SoleIQLogo size={32} />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-clr-muted">
              AI-assisted diabetic foot screening from four guided phone photos.
            </p>
            <a href={APP_URL} className="btn btn-secondary btn-sm mt-6">
              {signedIn ? 'Dashboard' : 'Open the app'}
            </a>
          </div>

          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-12 gap-y-3 sm:grid-cols-3 md:grid-cols-2">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-clr-muted transition-colors hover:text-clr-text"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-sm text-clr-muted transition-colors hover:text-clr-text"
                >
                  Email us
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-14 border-t border-clr-border pt-8">
          <p className="max-w-3xl text-xs leading-relaxed text-clr-muted">
            SoleIQ is a screening and decision-support tool. It is not a
            diagnostic device, it does not provide medical advice, and it is not
            a substitute for assessment by a qualified clinician. If you have a
            wound, an infection, sudden pain, or a change in the colour or
            temperature of a foot, seek medical care immediately.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            <p className="text-xs text-clr-muted">© {year} SoleIQ Health</p>
            {/* TODO(soleiq): point these at the real policy pages when they exist. */}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-xs text-clr-muted hover:text-clr-text">
              Privacy
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-xs text-clr-muted hover:text-clr-text">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
