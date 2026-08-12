import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import SoleIQLogo from './SoleIQLogo'
import { APP_URL, useAppSession } from '../hooks/useAppSession'
import LanguageSwitcher from './LanguageSwitcher'
import { useT } from '../i18n/I18nProvider'

/* Hrefs are structure and stay put; the words come from the dictionary. */
const NAV_LINKS = [
  { key: 'howItWorks', href: '#how-it-works' },
  { key: 'research', href: '#research' },
  { key: 'about', href: '#about' },
  { key: 'contact', href: '#contact' },
] as const

export default function Navbar() {
  const { signedIn } = useAppSession()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const d = useT()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile sheet on Escape, and don't let the page scroll behind it.
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const appLabel = signedIn ? d.nav.dashboard : d.nav.app

  return (
    <>
      <header
        className="site-nav fixed inset-x-0 top-0 z-50 backdrop-blur-md"
        data-scrolled={scrolled ? 'true' : 'false'}
      >
        <div className="shell flex h-[4.75rem] items-center gap-3">
          {/* Left cluster: the lockup and the app entry point, deliberately on
              the left. Both are flex items on one `items-center` row, and both
              are given the same height, so they sit on a single optical line
              rather than one riding below the other. */}
          <div className="flex min-w-0 shrink items-center gap-3 sm:gap-5">
            <a
              href="#top"
              className="tap flex h-10 min-w-0 items-center rounded"
              aria-label={d.nav.backToTop}
            >
              <SoleIQLogo size={38} />
            </a>

            <a
              href={APP_URL}
              className="btn btn-primary btn-sm h-10 shrink-0"
              aria-label={signedIn ? d.nav.openDashboard : d.nav.openApp}
            >
              {appLabel}
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>

          <nav className="ms-auto hidden md:block" aria-label={d.nav.primary}>
            <ul className="flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[0.9375rem] text-clr-muted transition-colors hover:text-clr-text"
                  >
                    {d.nav[link.key]}
                  </a>
                </li>
              ))}
              <li>
                <LanguageSwitcher />
              </li>
            </ul>
          </nav>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="ms-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-clr-text md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={d.nav.openMenu}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/*
        Deliberately a sibling of the header, not a child of it.

        The header carries `backdrop-blur`, and an element with a backdrop
        filter becomes the containing block for its `position: fixed`
        descendants. Nested inside it, this sheet's `inset-0` resolved against
        the 76px-tall bar instead of the viewport: it was drawn 76px high, its
        background covered only that strip, and every link below spilled out
        over the page with nothing behind it.
      */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="mobile-sheet md:hidden"
          >
            <div className="shell flex h-[4.75rem] shrink-0 items-center">
              <SoleIQLogo size={38} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="-me-2 ms-auto inline-flex h-11 w-11 items-center justify-center rounded-lg text-clr-text"
                aria-label={d.nav.closeMenu}
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>

            {/* Scrolls on its own if a short screen cannot hold the list. */}
            <nav
              className="shell flex min-h-0 flex-1 flex-col overflow-y-auto pb-8 pt-4"
              aria-label={d.nav.primaryMobile}
            >
              <ul className="flex flex-col">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-between gap-4 border-b border-clr-border py-5 font-display text-[1.625rem] tracking-tight text-clr-text"
                    >
                      {d.nav[link.key]}
                      <ArrowUpRight
                        size={18}
                        className="shrink-0 text-clr-muted"
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                ))}
              </ul>

              <a
                href={APP_URL}
                onClick={() => setMobileOpen(false)}
                className="btn btn-primary mt-8 w-full"
              >
                {appLabel}
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>

              <div className="mt-6">
                <LanguageSwitcher variant="sheet" />
              </div>

              <p className="mt-6 text-sm leading-relaxed text-clr-muted">
                {d.nav.disclaimerShort}
              </p>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
