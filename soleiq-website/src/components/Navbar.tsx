import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Menu, X, Sun, Moon, LayoutDashboard } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useCart } from '../context/CartContext'
import SoleIQLogo from './SoleIQLogo'

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Shop', href: '#shop' },
  { label: 'Science', href: '#science' },
  { label: 'Stories', href: '#stories' },
  { label: 'FAQ', href: '#faq' },
  { label: 'About', href: '#about' },
  { label: 'Blog', href: '#blog' },
  { label: 'Contact', href: '#contact' },
]

interface NavbarProps {
  onCartOpen: () => void
}

export default function Navbar({ onCartOpen }: NavbarProps) {
  const { isDark, toggle } = useTheme()
  const { count } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY
      setVisible(current < 80 || current < lastScrollY.current)
      lastScrollY.current = current
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const sections = NAV_LINKS.map(l => l.href.replace('#', ''))
    const observers: IntersectionObserver[] = []

    sections.forEach(id => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id)
        },
        { threshold: 0.3 }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach(o => o.disconnect())
  }, [])

  const handleNavClick = (href: string) => {
    setMobileOpen(false)
    const id = href.replace('#', '')
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <motion.nav
      initial={{ y: 0, opacity: 1 }}
      animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed top-0 left-0 right-0 z-50 glass"
      style={{ borderBottom: '1px solid var(--clr-border)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => handleNavClick('#home')}
            className="flex items-center gap-2 group"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <SoleIQLogo width={36} height={42} id="lgNav" />
            <span
              className="font-syne font-bold text-xl tracking-widest"
              style={{ color: 'var(--clr-accent)', letterSpacing: '0.15em' }}
            >
              SOLEIQ
            </span>
          </button>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map(link => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className={`nav-link ${activeSection === link.href.replace('#', '') ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* My Dashboard button */}
            <motion.a
              href="http://localhost:5200"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="hidden lg:flex items-center gap-2"
              style={{
                padding: '0.45rem 1rem',
                background: 'var(--clr-accent)',
                color: 'var(--clr-bg)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
                fontFamily: 'DM Sans, sans-serif',
                letterSpacing: '0.04em',
                textDecoration: 'none',
                boxShadow: '0 0 16px var(--clr-glow)',
              }}
            >
              <LayoutDashboard size={15} />
              My Dashboard
            </motion.a>
            <motion.button
              onClick={toggle}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg"
              style={{
                background: 'var(--clr-glow)',
                border: '1px solid var(--clr-border)',
                color: 'var(--clr-accent)',
                cursor: 'pointer',
              }}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </motion.button>

            <motion.button
              onClick={onCartOpen}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative p-2 rounded-lg"
              style={{
                background: 'var(--clr-glow)',
                border: '1px solid var(--clr-border)',
                color: 'var(--clr-accent)',
                cursor: 'pointer',
              }}
              aria-label="Open cart"
            >
              <ShoppingCart size={18} />
              {count > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                  style={{ background: 'var(--clr-accent)', color: 'var(--clr-bg)' }}
                >
                  {count}
                </motion.span>
              )}
            </motion.button>

            {/* Mobile hamburger */}
            <motion.button
              onClick={() => setMobileOpen(p => !p)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="lg:hidden p-2 rounded-lg"
              style={{
                background: 'var(--clr-glow)',
                border: '1px solid var(--clr-border)',
                color: 'var(--clr-accent)',
                cursor: 'pointer',
              }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="lg:hidden overflow-hidden"
            style={{ borderTop: '1px solid var(--clr-border)', background: 'var(--clr-surface-2)' }}
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((link, i) => (
                <motion.button
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  onClick={() => handleNavClick(link.href)}
                  className={`text-left py-3 px-4 rounded-lg font-medium transition-colors ${
                    activeSection === link.href.replace('#', '') ? '' : ''
                  }`}
                  style={{
                    background: activeSection === link.href.replace('#', '') ? 'var(--clr-glow)' : 'transparent',
                    color: activeSection === link.href.replace('#', '') ? 'var(--clr-accent)' : 'var(--clr-text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {link.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
