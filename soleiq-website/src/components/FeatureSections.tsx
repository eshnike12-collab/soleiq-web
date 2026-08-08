import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  PhoneFrame,
  ScreenCapture,
  ScreenShare,
  ScreenTimeline,
} from './visuals/ProductScreens'
import FeatureParticles, { type PartLabel } from './visuals/FeatureParticles'
import type { TargetKey } from '../three/scenes'

/**
 * Four quiet sections after the narrative. One idea each: a headline, one
 * sentence, one visual. Nothing here restates the scroll sequence — it lands
 * the specifics the sequence only gestures at.
 */

interface Feature {
  id: string
  kicker: string
  headline: string
  body: string
  /** The particle composition for this topic. Framing is solved, not declared. */
  target: TargetKey
  /** Named parts, labelled exactly as the narrative labels them. */
  labels: PartLabel[]
  /** Flat fallback, used when there is no WebGL or motion is not wanted. */
  visual: ReactNode
  visualLabel: string
  flip?: boolean
}

const FEATURES: Feature[] = [
  {
    id: 'capture',
    kicker: 'Guided capture',
    headline: 'The hard part is taking a usable photograph. So the app does it.',
    body: 'Framing, steadiness, and lighting are checked on the device before anything is uploaded. If one of the four is unusable, you retake only that one.',
    target: 'capture',
    labels: [{ part: 'phone', text: 'App' }],
    visual: <ScreenCapture />,
    visualLabel:
      'A particle rendering of guided capture: a phone held above a foot, with the four photographs landing on its screen.',
  },
  {
    id: 'report',
    kicker: 'Clinical report',
    headline: 'Your clinician opens a record, not a photograph.',
    body: 'Findings mapped onto your own images, the full intake behind them (history, HbA1c, vascular, neuropathy, pain map), and an assistant scoped to that one patient.',
    target: 'clinician',
    labels: [
      { part: 'doctors', text: 'Your care team' },
      { part: 'record', text: 'Patient record' },
    ],
    visual: <ScreenShare />,
    visualLabel:
      'A particle rendering of the clinical report: a dashboard receiving the record, with the findings mapped onto the patient photograph.',
    flip: true,
  },
  {
    id: 'timeline',
    kicker: 'Shared timeline',
    headline: 'One screening is a data point. A series is a direction.',
    body: 'Every check is kept as a dated set of photos and levels, so a change too slow to notice day to day is obvious side by side.',
    target: 'timeline',
    labels: [{ part: 'curve', text: 'Risk over time' }],
    visual: <ScreenTimeline />,
    visualLabel:
      'A particle rendering of the shared timeline: dated screenings along an axis, with the risk curve descending across them.',
  },
]

const EASE = [0.22, 0.61, 0.36, 1] as const

export default function FeatureSections() {
  const reduce = useReducedMotion()
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
          What SoleIQ does
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
              <FeatureParticles
                target={f.target}
                labels={f.labels}
                label={f.visualLabel}
                fallback={<PhoneFrame label={f.visualLabel}>{f.visual}</PhoneFrame>}
              />
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
