import { useId, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * The same condition, two settings, and what a home screening actually changes
 * about the path a person takes. Everything here is a description of the
 * pathway, not a measured claim — no durations or rates are asserted.
 */

type Setting = 'rural' | 'urban'

interface Journey {
  label: string
  person: string
  without: { title: string; steps: string[] }
  with: { title: string; steps: string[] }
  /** Qualitative monitoring cadence, drawn as a rail. */
  cadence: { without: string; with: string }
}

const JOURNEYS: Record<Setting, Journey> = {
  rural: {
    label: 'Rural',
    person:
      'A farmer with type 2 diabetes and reduced sensation in both feet. The nearest foot clinic is a journey, not a trip.',
    without: {
      title: 'Without SoleIQ',
      steps: [
        'Pressure builds under the forefoot. Neuropathy means nothing is felt.',
        'Nothing prompts a look. The feet are not part of the daily routine.',
        'It is found when a sock sticks, or when someone else notices.',
        'Going to the clinic means transport, cost, and a lost day of work.',
        'The visit happens once the wound is impossible to ignore.',
        'Care begins at the point where care is hardest.',
      ],
    },
    with: {
      title: 'With SoleIQ',
      steps: [
        'A screening at home: four photos, taken by a family member if needed.',
        'Photos are checked for quality on the phone before anything uploads.',
        'A screening level comes back with the findings marked on the photos.',
        'The record is shared ahead to the clinic or the visiting health worker.',
        'The journey is made once, deliberately, with a history already in hand.',
        'Between visits, the timeline keeps watching.',
      ],
    },
    cadence: {
      without: 'Checked when someone happens to look',
      with: 'Checked on a schedule, at home',
    },
  },
  urban: {
    label: 'Urban',
    person:
      'A commuter with type 2 diabetes and a callus that keeps coming back. A podiatry appointment is available, eventually.',
    without: {
      title: 'Without SoleIQ',
      steps: [
        'A callus thickens and the skin around it changes colour. Easy to dismiss.',
        'Booking a podiatry appointment means joining a queue.',
        'The appointment arrives, or is rescheduled, or is missed.',
        'In the room, the clinician sees today’s foot and nothing before it.',
        'Advice is given; follow-up depends on remembering how it looked.',
        'The next change goes unmeasured until the next appointment.',
      ],
    },
    with: {
      title: 'With SoleIQ',
      steps: [
        'A screening at home takes a few minutes, before work.',
        'Findings are marked on the patient’s own photographs.',
        'The level says whether this is recheck-in-a-week or book-now.',
        'Appointment slots go to the people whose level says they need one.',
        'The clinician opens a dated photo series instead of a blank slate.',
        'Follow-up is measured against images, not against recall.',
      ],
    },
    cadence: {
      without: 'Checked at appointments',
      with: 'Checked between appointments too',
    },
  },
}

const CHANGES = [
  {
    q: 'Who notices first',
    without: 'Whoever happens to look, which with neuropathy is often nobody.',
    with: 'A routine check that does not depend on being able to feel it.',
  },
  {
    q: 'What the clinician sees',
    without: 'The foot as it is today.',
    with: 'A dated series, so the direction of travel is visible.',
  },
  {
    q: 'What triggers a visit',
    without: 'A wound that has become obvious.',
    with: 'A screening level, with the reason attached.',
  },
  {
    q: 'What a journey costs',
    without: 'The same, whether or not it turns out to be needed.',
    with: 'The same, but made for a reason you can point at.',
  },
]

const EASE = [0.22, 0.61, 0.36, 1] as const

export default function Journeys() {
  const [setting, setSetting] = useState<Setting>('rural')
  const reduce = useReducedMotion()
  const baseId = useId()
  const journey = JOURNEYS[setting]

  return (
    <section
      id="journeys"
      className="section-pad"
      style={{ background: 'var(--clr-surface)' }}
      aria-labelledby="journeys-heading"
    >
      <div className="shell">
        <p className="eyebrow">In practice</p>
        <h2 id="journeys-heading" className="h-section mt-5 max-w-3xl">
          The same feet, two settings, and what changes when the check happens at
          home.
        </h2>
        <p className="lede mt-6 max-w-prose">
          These are the pathways SoleIQ is designed around. They describe how the
          product is used. They are not outcome claims.
        </p>

        {/* Setting switch */}
        <div
          role="tablist"
          aria-label="Choose a setting"
          className="mt-10 inline-flex rounded-lg p-1"
          style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)' }}
        >
          {(Object.keys(JOURNEYS) as Setting[]).map((key) => {
            const selected = key === setting
            return (
              <button
                key={key}
                type="button"
                role="tab"
                id={`${baseId}-tab-${key}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${key}`}
                onClick={() => setSetting(key)}
                className="tap inline-flex items-center rounded-md px-5 py-2 text-sm font-medium transition-colors"
                style={{
                  background: selected ? 'var(--clr-accent)' : 'transparent',
                  color: selected ? '#fff' : 'var(--clr-text-muted)',
                }}
              >
                {JOURNEYS[key].label}
              </button>
            )
          })}
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-panel-${setting}`}
          aria-labelledby={`${baseId}-tab-${setting}`}
          tabIndex={-1}
        >
          <motion.div
            key={setting}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <p className="mt-8 max-w-prose text-[1.0625rem] leading-relaxed text-clr-text">
              {journey.person}
            </p>

            <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-16">
              <Lane
                title={journey.without.title}
                steps={journey.without.steps}
                cadence={journey.cadence.without}
                tone="neutral"
              />
              <Lane
                title={journey.with.title}
                steps={journey.with.steps}
                cadence={journey.cadence.with}
                tone="accent"
              />
            </div>
          </motion.div>
        </div>

        {/* What changes */}
        <div className="mt-20 md:mt-28">
          <h3 className="h-sub">What actually changes</h3>
          <div
            className="mt-8 hidden gap-8 border-t border-clr-border pt-4 md:grid md:grid-cols-[14rem_1fr_1fr]"
            aria-hidden="true"
          >
            <span />
            <span className="eyebrow">Without SoleIQ</span>
            <span className="eyebrow">With SoleIQ</span>
          </div>
          <dl className="mt-8 border-t border-clr-border md:mt-0 md:border-t-0">
            {CHANGES.map((row) => (
              <div
                key={row.q}
                className="grid gap-2 border-b border-clr-border py-6 md:grid-cols-[14rem_1fr_1fr] md:gap-8"
              >
                <dt className="font-display text-[1.0625rem] font-medium tracking-tight text-clr-text">
                  {row.q}
                </dt>
                <dd className="text-[0.9375rem] leading-relaxed text-clr-muted">
                  <span className="eyebrow block md:sr-only">Without</span>
                  {row.without}
                </dd>
                <dd
                  className="text-[0.9375rem] leading-relaxed"
                  style={{ color: 'var(--clr-accent-2)' }}
                >
                  <span className="eyebrow block md:sr-only">With SoleIQ</span>
                  {row.with}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}

function Lane({
  title,
  steps,
  cadence,
  tone,
}: {
  title: string
  steps: string[]
  cadence: string
  tone: 'neutral' | 'accent'
}) {
  const color = tone === 'accent' ? 'var(--clr-accent-2)' : 'var(--clr-text-muted)'
  return (
    <div>
      <h3
        className="font-display text-lg font-medium tracking-tight"
        style={{ color: tone === 'accent' ? 'var(--clr-accent-2)' : 'var(--clr-text)' }}
      >
        {title}
      </h3>

      <CadenceRail tone={tone} label={cadence} />

      <ol className="mt-8">
        {steps.map((step, i) => (
          <li
            key={step}
            className="flex gap-4 py-3.5"
            style={{ borderTop: i === 0 ? 'none' : '1px solid var(--clr-border)' }}
          >
            <span
              className="mt-0.5 shrink-0 font-display text-sm tabular-nums"
              style={{ color }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="text-[0.9375rem] leading-relaxed text-clr-text">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/**
 * A qualitative picture of how often the feet get looked at. Ticks are evenly
 * spaced in the SoleIQ lane and sparse in the other — no time axis is implied,
 * and no interval is claimed.
 */
function CadenceRail({ tone, label }: { tone: 'neutral' | 'accent'; label: string }) {
  const accent = tone === 'accent'
  const ticks = accent
    ? [4, 12, 20, 28, 36, 44, 52, 60, 68, 76, 84, 92]
    : [6, 58, 94]
  const color = accent ? 'var(--clr-accent-2)' : 'var(--clr-border-strong)'

  return (
    <div className="mt-5">
      <svg viewBox="0 0 100 12" className="h-3 w-full" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="6" x2="100" y2="6" stroke="var(--clr-border)" strokeWidth="0.5" />
        {ticks.map((x) => (
          <line
            key={x}
            x1={x}
            y1="1.5"
            x2={x}
            y2="10.5"
            stroke={color}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <p className="mt-2.5 text-xs text-clr-muted">{label}</p>
    </div>
  )
}
