import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import SoleIQLogo from './SoleIQLogo'
import { APP_URL, useAppSession } from '../hooks/useAppSession'

const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Research', href: '#research' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
]

export default function Navbar() {
  const { signedIn } = useAppSession()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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

  const appLabel = signedIn ? 'Dashboard' : 'App'

  return (
    <header
      className="site-nav fixed inset-x-0 top-0 z-50 backdrop-blur-md"
      data-scrolled={scrolled ? 'true' : 'false'}
    >
      <div className="shell flex h-[4.75rem] items-center">
        {/* Left cluster: the lockup and the app entry point, deliberately on the
            left. Both are flex items on one `items-center` row, and both are
            given the same height, so they sit on a single optical line rather
            than one riding below the other. */}
        <div className="flex shrink-0 items-center gap-5">
          <a
            href="#top"
            className="flex h-10 items-center rounded"
            aria-label="SoleIQ Health, back to top"
          >
            <SoleIQLogo size={38} />
          </a>

          <a
            href={APP_URL}
            className="btn btn-primary btn-sm h-10 shrink-0"
            aria-label={
              signedIn ? 'Open your SoleIQ dashboard' : 'Open the SoleIQ app'
            }
          >
            {appLabel}
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>

        <nav className="ml-auto hidden md:block" aria-label="Primary">
          <ul className="flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-[0.9375rem] text-clr-muted transition-colors hover:text-clr-text"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg text-clr-text md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label="Open menu"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 top-0 z-50 bg-clr-bg md:hidden"
          >
            <div className="shell flex h-[4.5rem] items-center">
              <SoleIQLogo size={32} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg text-clr-text"
                aria-label="Close menu"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <nav className="shell pt-6" aria-label="Primary, mobile">
              <ul className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="block border-b border-clr-border py-4 font-display text-2xl tracking-tight text-clr-text"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
              <a href={APP_URL} className="btn btn-primary mt-8 w-full">
                {appLabel}
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
