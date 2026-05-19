import { motion } from 'framer-motion'
import { Twitter, Linkedin, Instagram } from 'lucide-react'
import SoleIQLogo from './SoleIQLogo'

const NAV_GROUPS = [
  {
    heading: 'Product',
    links: ['Smart Insole', 'Offloading Insole', 'PBM Slipper', 'Therapy Pods'],
  },
  {
    heading: 'Company',
    links: ['About', 'Science', 'Careers', 'Press'],
  },
  {
    heading: 'Support',
    links: ['FAQ', 'Contact', 'Shipping & Returns', 'Warranty'],
  },
  {
    heading: 'Clinicians',
    links: ['Clinical Dashboard', 'Research Portal', 'Order for Patients', 'Billing Codes'],
  },
]

const SOCIAL = [
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' },
  { icon: Instagram, label: 'Instagram', href: '#' },
]

export default function Footer() {
  const handleScroll = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer style={{ background: '#071F2E', borderTop: '1px solid rgba(78,205,196,0.1)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-14 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <button
              onClick={() => handleScroll('home')}
              className="flex items-center gap-2 mb-4"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <SoleIQLogo width={28} height={33} id="lgFooter" />
              <span
                className="font-syne font-bold text-lg tracking-widest"
                style={{ color: '#4ECDC4', letterSpacing: '0.15em' }}
              >
                SOLEIQ
              </span>
            </button>
            <p
              className="text-sm leading-relaxed mb-5 max-w-xs"
              style={{ color: 'rgba(168,237,234,0.6)' }}
            >
              AI-powered diabetic foot care — preventing ulcers before they begin, through science patients can trust.
            </p>
            <div className="flex gap-3">
              {SOCIAL.map(s => (
                <motion.a
                  key={s.label}
                  href={s.href}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    background: 'rgba(78,205,196,0.08)',
                    border: '1px solid rgba(78,205,196,0.15)',
                    color: 'rgba(168,237,234,0.7)',
                  }}
                >
                  <s.icon size={16} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Nav groups */}
          {NAV_GROUPS.map(group => (
            <div key={group.heading}>
              <h4
                className="font-syne font-semibold text-sm mb-4"
                style={{ color: '#4ECDC4', letterSpacing: '0.05em' }}
              >
                {group.heading}
              </h4>
              <ul className="space-y-2.5">
                {group.links.map(link => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm transition-colors hover:text-white"
                      style={{ color: 'rgba(168,237,234,0.55)', textDecoration: 'none' }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="py-6 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid rgba(78,205,196,0.08)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(126,200,192,0.5)' }}>
            © 2026 SoleIQ Inc. All rights reserved.
          </p>

          <div className="flex flex-wrap gap-5">
            {['Privacy Policy', 'Terms of Service', 'Accessibility', 'Sitemap'].map(item => (
              <a
                key={item}
                href="#"
                className="text-xs transition-colors hover:text-white"
                style={{ color: 'rgba(126,200,192,0.5)', textDecoration: 'none' }}
              >
                {item}
              </a>
            ))}
          </div>
        </div>

        {/* Medical disclaimer */}
        <div
          className="pb-6 text-center"
        >
          <p className="text-xs leading-relaxed max-w-4xl mx-auto" style={{ color: 'rgba(126,200,192,0.38)' }}>
            MEDICAL DISCLAIMER: SoleIQ products are intended for adjunctive use only and are not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or qualified health provider with any questions regarding your condition. Never disregard professional medical advice or delay in seeking it because of information provided by SoleIQ. Individual results may vary.
          </p>
        </div>
      </div>
    </footer>
  )
}
