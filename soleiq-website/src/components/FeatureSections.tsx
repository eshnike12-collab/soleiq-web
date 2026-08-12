import type { ReactNode } from 'react'
import { useT } from '../i18n/I18nProvider'
import { motion, useReducedMotion } from 'framer-motion'
import {
  PhoneFrame,
  ScreenCapture,
  ScreenShare,
  ScreenTimeline,
} from './visuals/ProductScreens'
import FeatureParticles, { type PartLabel } from './visuals/FeatureParticles'
import SectionParticles from './visuals/SectionParticles'
import type { TargetKey } from '../three/scenes'

/**
 * Four quiet sections after the narrative. One idea each: a headline, one
 * sentence, one visual. Nothing here restates the scroll sequence — it lands
 * the specifics the sequence only gestures at.
 */

interface Feature {
  id: 'capture' | 'report' | 'timeline'
  /** The particle composition for this topic. Framing is solved, not declared. */
  target: TargetKey
  /** Named parts, labelled exactly as the narrative labels them. */
  labels: { part: string; textKey: string; dx?: number; dy?: number }[]
  /** Flat fallback, used when there is no WebGL or motion is not wanted. */
  visual: ReactNode
  flip?: boolean
  /** Runs a loop rather than settling. */
  animated?: boolean
  /** How that loop turns over. Ping-pong unless a sequence should repeat. */
  loop?: 'cycle' | 'pingPong'
}

const FEATURES_STRUCTURE: Feature[] = [
  {
    id: 'capture',
    target: 'capture',
    // Moved beside the phone, not above it: the phone is tall and narrow, so
    // there is no room over it, and dead centre it covered the very frames
    // whose turn the animation is showing.
    labels: [{ part: 'phone', textKey: 'label', dx: -150 }],
    animated: true,
    loop: 'cycle',
    visual: <ScreenCapture />,
  },
  {
    id: 'report',
    target: 'clinician',
    labels: [
      { part: 'doctors', textKey: 'careTeam' },
      // Lifted clear of the rows it names, which it was sitting across.
      { part: 'record', textKey: 'patientRecord', dy: -78 },
    ],
    animated: true,
    visual: <ScreenShare />,
    flip: true,
  },
  {
    id: 'timeline',
    target: 'timeline',
    // Lifted off the line: on the curve itself it sat across the reading.
    labels: [{ part: 'curve', textKey: 'riskOverTime', dy: -52 }],
    animated: true,
    visual: <ScreenTimeline />,
  },
]

const EASE = [0.22, 0.61, 0.36, 1] as const

export default function FeatureSections() {
  const reduce = useReducedMotion()
  const d = useT()

  /* Structure and copy, joined at render so a language change re-renders the
     words without rebuilding a single particle composition. */
  const FEATURES = FEATURES_STRUCTURE.map((f) => {
    const copy = d.features[f.id] as Record<string, string>
    return {
      ...f,
      kicker: copy.kicker,
      headline: copy.headline,
      body: copy.body,
      visualLabel: copy.visualLabel,
      labels: f.labels.map((l) => ({ ...l, text: copy[l.textKey] ?? '' })),
    }
  })
  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-90px' },
      }

  return (
    <section id="how-it-works" aria-labelledby="features-heading">
      <div className="shell pt-24 md:pt-32">
        <h2 id="features-heading" className="sr-only">
          {d.features.heading}
        </h2>
      </div>

      {FEATURES.map((f, i) => (
        <div key={f.id} className="shell py-14 md:min-h-[76vh] md:py-16">
          <motion.div
            {...reveal}
            transition={{ duration: 0.55, ease: EASE }}
            className="grid items-start gap-12 md:grid-cols-2 md:gap-20"
          >
            {/* The copy rises; the picture stays put. */}
            <div
              className={`md:pt-[10vh] ${f.flip ? 'md:order-2' : ''}`}
            >
              <p className="eyebrow">{f.kicker}</p>
              <h3 className="h-sub mt-4 max-w-lg text-[clamp(1.5rem,2.7vw,2.1rem)]">
                {f.headline}
              </h3>
              <p className="mt-6 max-w-prose text-[1.0625rem] leading-relaxed text-clr-muted">
                {f.body}
              </p>
            </div>
            <div
              className={`md:sticky md:top-[10vh] ${f.flip ? 'md:order-1' : ''}`}
            >
              {/* The particle composition when the device can run it; the flat
                  screen illustration when it cannot. Only one ever mounts. */}
              {f.animated ? (
                <SectionParticles
                  target={f.target}
                  labels={f.labels}
                  loop={f.loop ?? 'pingPong'}
                  period={f.loop === 'cycle' ? 1.5 : 2.4}
                  label={f.visualLabel}
                  fallback={<PhoneFrame label={f.visualLabel}>{f.visual}</PhoneFrame>}
                />
              ) : (
                <FeatureParticles
                  target={f.target}
                  labels={f.labels}
                  label={f.visualLabel}
                  fallback={<PhoneFrame label={f.visualLabel}>{f.visual}</PhoneFrame>}
                />
              )}
            </div>
          </motion.div>
          {i < FEATURES.length - 1 && <hr className="mt-14 border-clr-border md:mt-16" />}
        </div>
      ))}

      {/* The limits are stated once, in the footer. Saying the same thing twice
          on one page reads as a disclaimer being repeated at you rather than
          told to you. */}
    </section>
  )
}
