import { useId, useState } from 'react'
import { useT } from '../i18n/I18nProvider'
import { motion, useReducedMotion } from 'framer-motion'
import SectionParticles from './visuals/SectionParticles'

/**
 * The same condition, two settings, and what a home screening actually changes
 * about the path a person takes. Everything here is a description of the
 * pathway, not a measured claim — no durations or rates are asserted.
 */

/* Which settings exist, and in what order. Every word for them lives in the
   dictionary; this is only the shape of the section. */
const SETTINGS = ['rural', 'urban'] as const
type Setting = (typeof SETTINGS)[number]

const EASE = [0.22, 0.61, 0.36, 1] as const

export default function Journeys() {
  const [setting, setSetting] = useState<Setting>('rural')
  const reduce = useReducedMotion()
  const baseId = useId()
  const d = useT()
  const journey = d.journeys[setting]

  return (
    <section
      id="journeys"
      className="section-pad"
      aria-labelledby="journeys-heading"
    >
      <div className="shell">
        {/* The intro and the setting's own picture, side by side: the copy has
            never needed the full width here, and the space beside it was the
            emptiest on the page. */}
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_26rem] lg:gap-16">
          <div>
            <p className="eyebrow">{d.journeys.eyebrow}</p>
            <h2 id="journeys-heading" className="h-section mt-5 max-w-3xl">
              {d.journeys.heading}
            </h2>
            <p className="lede mt-6 max-w-prose">
              {d.journeys.lede}
            </p>
          </div>

          <div className="hidden lg:block">
            <SectionParticles
              key={setting}
              target={setting === 'rural' ? 'village' : 'city'}
              loop="pingPong"
              period={setting === 'rural' ? 7 : 11}
              label={journey.visualLabel}
              fallback={<div />}
            />
          </div>
        </div>

        {/* Setting switch */}
        <div
          role="tablist"
          aria-label={d.journeys.chooseSetting}
          className="mt-10 inline-flex rounded-lg p-1"
          style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)' }}
        >
          {SETTINGS.map((key) => {
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
                {d.journeys[key].label}
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
                title={d.journeys.withoutTitle}
                steps={journey.without}
                cadence={journey.cadenceWithout}
                cadenceLabel={d.journeys.cadence}
                tone="neutral"
              />
              <Lane
                title={d.journeys.withTitle}
                steps={journey.with}
                cadence={journey.cadenceWith}
                cadenceLabel={d.journeys.cadence}
                tone="accent"
              />
            </div>
          </motion.div>
        </div>

        {/* What changes */}
        <div className="mt-20 md:mt-28">
          <h3 className="h-sub">{d.journeys.changesHeading}</h3>
          <div
            className="mt-8 hidden gap-8 border-t border-clr-border pt-4 md:grid md:grid-cols-[14rem_1fr_1fr]"
            aria-hidden="true"
          >
            <span />
            <span className="eyebrow">{d.journeys.withoutTitle}</span>
            <span className="eyebrow">{d.journeys.withTitle}</span>
          </div>
          <dl className="mt-8 border-t border-clr-border md:mt-0 md:border-t-0">
            {d.journeys.comparison.map((row) => (
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
  cadenceLabel,
  tone,
}: {
  title: string
  steps: readonly string[]
  cadence: string
  cadenceLabel: string
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

      <CadenceRail tone={tone} label={cadence} caption={cadenceLabel} />

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
function CadenceRail({
  tone,
  label,
  caption,
}: {
  tone: 'neutral' | 'accent'
  label: string
  /** The word for what the rail measures — screen-reader only. */
  caption: string
}) {
  const accent = tone === 'accent'
  const ticks = accent
    ? [4, 12, 20, 28, 36, 44, 52, 60, 68, 76, 84, 92]
    : [6, 58, 94]
  const color = accent ? 'var(--clr-accent-2)' : 'var(--clr-border-strong)'

  return (
    <div className="mt-5">
      <svg viewBox="0 0 100 12" className="h-3 w-full" preserveAspectRatio="none" role="img" aria-label={`${caption}: ${label}`}>
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
