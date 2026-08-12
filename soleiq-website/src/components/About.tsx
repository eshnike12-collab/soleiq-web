import { motion, useReducedMotion } from 'framer-motion'
import { Linkedin } from 'lucide-react'
import { PROFILE_LINKS } from '../data/social'
import { useT, fill } from '../i18n/I18nProvider'

/**
 * The team.
 *
 * TODO(soleiq): add anyone else who should be listed here — name, role, and one
 * honest line each. Nobody goes on this page who isn't real.
 */
/* Names and photographs are facts, not copy. The role and the line each
   person is described by are translated; who they are is not. */
const TEAM = [
  { name: 'Eshaan Naik', roleKey: 'founder', bioKey: 'eshaan', photo: '/eshaan-naik.png' },
] as const

export default function About() {
  const reduce = useReducedMotion()
  const d = useT()
  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
      }

  return (
    <section id="about" className="section-pad" aria-labelledby="about-heading">
      <div className="shell">
        <motion.div {...reveal} transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}>
          <p className="eyebrow">{d.about.eyebrow}</p>
          <h2 id="about-heading" className="h-section mt-5 max-w-3xl">
            {d.about.heading}
          </h2>
        </motion.div>

        <motion.div
          {...reveal}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 0.61, 0.36, 1] }}
          className="mt-12 grid gap-10 md:grid-cols-2 md:gap-16"
        >
          <div className="space-y-5 text-[1.0625rem] leading-relaxed text-clr-muted">
            {d.about.paragraphs.slice(0, 3).map((text) => (
              <p key={text.slice(0, 24)}>{text}</p>
            ))}
          </div>

          <div className="space-y-5 text-[1.0625rem] leading-relaxed text-clr-muted">
            {d.about.paragraphs.slice(3).map((text) => (
              <p key={text.slice(0, 24)}>{text}</p>
            ))}
          </div>
        </motion.div>

        <div className="mt-20 md:mt-28">
          <h3 className="h-sub">{d.about.team}</h3>
          <ul className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((member) => (
              <li key={member.name}>
                {member.photo && (
                  <div className="portrait">
                    <img
                      src={member.photo}
                      alt={`${member.name}, ${d.about.roles[member.roleKey]}`}
                      width={641}
                      height={800}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}
                <p className="mt-6 font-display text-[1.125rem] font-medium tracking-tight text-clr-text">
                  {member.name}
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--clr-accent-2)' }}>
                  {d.about.roles[member.roleKey]}
                </p>
                <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-clr-muted">
                  {d.about.bios[member.bioKey]}
                </p>
                {PROFILE_LINKS[member.name] && (
                  <a
                    href={PROFILE_LINKS[member.name]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tap mt-4 inline-flex items-center gap-2 text-[0.9375rem] font-medium text-clr-muted transition-colors hover:text-clr-accent"
                    aria-label={fill(d.about.onLinkedIn, { name: member.name })}
                  >
                    <Linkedin size={17} aria-hidden="true" />
                    LinkedIn
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
