import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { APP_URL, useAppSession } from '../hooks/useAppSession'
import HeroFlow from './visuals/HeroFlow'

/**
 * First screen: name, slogan, one paragraph of what the platform is.
 * White and spacious — the particle sequence starts immediately below it, so
 * the hero's whole job is to say who this is and give one way in.
 */
export default function Hero() {
  const { signedIn } = useAppSession()
  const reduce = useReducedMotion()

  const rise = reduce
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } }

  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col justify-center pb-24 pt-32 md:pb-32"
    >
      {/* Ambient flow in the empty half of the first screen. */}
      <HeroFlow />

      {/* Carries the white hero down into the dark sequence, so the two read as
          one page rather than as a cut between them. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38vh]"
        style={{ background: 'linear-gradient(180deg, rgba(11,18,80,0) 0%, #0b1250 100%)' }}
      />

      <div className="relative z-10 shell">
        <motion.h1
          {...rise}
          transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
          className="h-display"
        >
          SoleIQ Health
        </motion.h1>

        <motion.p
          {...rise}
          transition={{ duration: 0.6, delay: 0.07, ease: [0.22, 0.61, 0.36, 1] }}
          className="mt-5 font-display text-[clamp(1.375rem,3vw,2.125rem)] font-medium tracking-tight text-clr-accent-2"
        >
          Early Detection, Lifelong Protection
        </motion.p>

        <motion.p
          {...rise}
          transition={{ duration: 0.6, delay: 0.13, ease: [0.22, 0.61, 0.36, 1] }}
          className="mt-8 max-w-prose text-[0.9375rem] leading-relaxed text-clr-muted md:text-base"
        >
          AI-enabled public-health platform that identifies deterioration
          earlier, improves care coordination, reaches underserved diabetic
          populations, and reduces preventable amputations and healthcare costs.
        </motion.p>

        <motion.div
          {...rise}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
          className="mt-12 flex flex-wrap items-center gap-4"
        >
          {/* No `data-cursor-label` here: this one leaves the site, so the
              cursor already shows the arrow, and a word beside it just
              collided with it. The scroll cue below keeps its label — that is
              an in-page anchor and gets no arrow. */}
          <a href={APP_URL} className="btn btn-primary">
            {signedIn ? 'Open your dashboard' : 'Start a screening'}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </motion.div>
      </div>

      <motion.div
        {...rise}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="relative z-10 shell mt-16 md:mt-24"
      >
        <a href="#narrative" className="scroll-cue tap" data-cursor-label="Scroll">
          <span className="scroll-cue-arrow" aria-hidden="true">
            <ArrowDown size={22} strokeWidth={2} />
          </span>
          See how it works
        </a>
      </motion.div>
    </section>
  )
}
