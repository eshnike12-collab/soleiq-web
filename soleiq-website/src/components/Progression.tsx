import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { Camera, Clock, Info, Pause, Play, Stethoscope } from 'lucide-react'
import StageFoot from './visuals/StageFoot'
import {
  PROGRESSION_CAVEAT,
  STAGES,
  WINDOWS,
  type Stage,
} from '../data/progression'

/**
 * How a diabetic foot ulcer progresses, and which part of that path a camera
 * can reach.
 *
 * Interactive because the point of the diagram is a comparison — the two
 * grades where screening changes the outcome against the four where it cannot
 * — and a comparison is easier to feel when you can move between the terms of
 * it yourself. It advances on its own until the first interaction, then stops
 * and stays where it is put.
 */

const TONE: Record<Stage['tone'], { line: string; soft: string }> = {
  clear: { line: 'var(--clr-level-clear)', soft: 'var(--clr-accent-2-soft)' },
  watch: { line: 'var(--clr-level-watch)', soft: '#fbf3e2' },
  soon: { line: 'var(--clr-level-soon)', soft: '#fbeee4' },
  urgent: { line: 'var(--clr-level-urgent)', soft: '#fbeae8' },
}

const AUTOPLAY_MS = 4200

export default function Progression() {
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(true)
  const sectionRef = useRef<HTMLElement>(null)
  // A fraction of the *section*, and this section is taller than a phone. At
  // 0.3 the threshold was more pixels than the viewport has, so on a phone it
  // could never be met and the walkthrough never started.
  const inView = useInView(sectionRef, { amount: 0.15 })
  const reduce = useReducedMotion()

  // Walks itself until someone takes over, and only while it is on screen.
  useEffect(() => {
    if (!playing || !inView || reduce) return
    const timer = window.setInterval(
      () => setActive((i) => (i + 1) % STAGES.length),
      AUTOPLAY_MS
    )
    return () => window.clearInterval(timer)
  }, [playing, inView, reduce])

  const choose = (index: number) => {
    setPlaying(false)
    setActive(index)
  }

  // Left/right arrows move between grades once the strip has focus.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const delta = event.key === 'ArrowRight' ? 1 : -1
    const next = (active + delta + STAGES.length) % STAGES.length
    choose(next)
    document.getElementById(`stage-tab-${next}`)?.focus()
  }

  const stage = STAGES[active]
  const soleiqCount = STAGES.filter((s) => s.window === 'soleiq').length

  return (
    <section
      id="progression"
      ref={sectionRef}
      aria-labelledby="progression-heading"
      // No band of its own. Every other section sits straight on the page
      // ground, which is what lets the cursor grid — drawn behind the content
      // at z-index -1 — stay visible through it.
    >
      <div className="shell section-pad">
        <p className="eyebrow">Progression</p>
        <h2 id="progression-heading" className="h-section mt-5 max-w-3xl">
          The whole path, and the part of it a camera can reach.
        </h2>
        <p className="lede mt-6 max-w-prose">
          A diabetic foot ulcer does not arrive; it progresses. Select any grade
          to see what is true of the foot at that point, and what a photograph
          can and cannot establish there.
        </p>

        {/* ── The two windows ──────────────────────────────────────────────── */}
        <div className="mt-14 grid gap-3 sm:grid-cols-[2fr_3fr]">
          <WindowBanner
            kind="soleiq"
            icon={<Camera size={15} aria-hidden="true" />}
            span={`Grades 0–${soleiqCount - 1}`}
            active={stage.window === 'soleiq'}
          />
          <WindowBanner
            kind="standard"
            icon={<Stethoscope size={15} aria-hidden="true" />}
            span={`Grades ${soleiqCount}–5`}
            active={stage.window === 'standard'}
          />
        </div>

        {/* ── Stage strip ──────────────────────────────────────────────────── */}
        <div
          role="tablist"
          aria-label="Wagner grades"
          onKeyDown={onKeyDown}
          className="mt-4 grid grid-cols-3 gap-3 lg:grid-cols-6"
        >
          {STAGES.map((s, i) => {
            const selected = i === active
            const tone = TONE[s.tone]
            return (
              <button
                key={s.grade}
                id={`stage-tab-${i}`}
                role="tab"
                aria-selected={selected}
                aria-controls="stage-detail"
                tabIndex={selected ? 0 : -1}
                onClick={() => choose(i)}
                className="group relative flex flex-col rounded-xl p-3 text-left transition-[transform,box-shadow] duration-200"
                style={{
                  background: selected ? tone.soft : 'var(--clr-bg)',
                  border: `1px solid ${selected ? tone.line : 'var(--clr-border)'}`,
                  boxShadow: selected ? `0 10px 30px -18px ${tone.line}` : 'none',
                  transform: selected ? 'translateY(-3px)' : 'none',
                }}
              >
                <span className="flex items-center justify-between">
                  <span
                    className="text-[0.6875rem] font-medium uppercase tracking-widest"
                    style={{ color: selected ? tone.line : 'var(--clr-text-muted)' }}
                  >
                    Grade {s.grade}
                  </span>
                  {s.window === 'soleiq' && (
                    <Camera
                      size={13}
                      aria-hidden="true"
                      style={{ color: 'var(--clr-accent-2)' }}
                    />
                  )}
                </span>

                <StageFoot
                  stage={s.grade}
                  scanning={selected && s.window === 'soleiq'}
                  // Bigger than the line drawing these replaced: the wound is
                  // the whole point of the card, and at ninety-six pixels the
                  // grade 1 and grade 2 lesions were the same brown dot.
                  className="mx-auto my-2 h-28 w-auto md:h-32"
                />

                <span className="text-[0.8125rem] font-medium leading-snug text-clr-text">
                  {s.name}
                </span>
                <span className="mt-0.5 text-[0.75rem] leading-snug text-clr-muted">
                  {s.plain}
                </span>

                {/* Selection rail */}
                <motion.span
                  aria-hidden="true"
                  className="mt-3 block h-[3px] rounded-full"
                  style={{ background: tone.line }}
                  initial={false}
                  animate={{ opacity: selected ? 1 : 0.15 }}
                  transition={{ duration: 0.25 }}
                />
              </button>
            )
          })}
        </div>

        {/* ── Detail panel ─────────────────────────────────────────────────── */}
        <div
          id="stage-detail"
          role="tabpanel"
          aria-live="polite"
          className="mt-4 overflow-hidden rounded-xl"
          style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)' }}
        >
          {/* Every grade is rendered, all six stacked into the same grid cell.
              The cell is therefore as tall as the longest of them and never
              changes height, which is the whole point: this panel sits above
              most of the page, and a walkthrough that resized it every four
              seconds shunted everything below it up and down the screen. On a
              phone, where the three columns stack, that was several hundred
              pixels of the page jumping while you were trying to read it.

              `visibility: hidden` rather than unmounting — hidden elements
              still take part in layout, and taking part in layout is exactly
              what is holding the height still. */}
          <div className="grid">
            {STAGES.map((s) => {
              const shown = s.grade === stage.grade
              return (
                <motion.div
                  key={s.grade}
                  aria-hidden={!shown}
                  initial={false}
                  animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 6 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: 0.26, ease: [0.22, 0.61, 0.36, 1] }
                  }
                  className="grid gap-8 p-6 md:grid-cols-3 md:p-8"
                  style={{
                    gridArea: '1 / 1',
                    visibility: shown ? 'visible' : 'hidden',
                    pointerEvents: shown ? 'auto' : 'none',
                  }}
                >
                  <div>
                    <p className="eyebrow" style={{ color: TONE[s.tone].line }}>
                      Grade {s.grade} · {s.name}
                    </p>
                    <p className="mt-3 text-[1.0625rem] leading-relaxed text-clr-text">
                      {s.what}
                    </p>
                  </div>
                  <div>
                    <p className="eyebrow inline-flex items-center gap-1.5">
                      <Camera size={13} aria-hidden="true" /> What a photo shows
                    </p>
                    <p className="mt-3 text-[0.9375rem] leading-relaxed text-clr-muted">
                      {s.camera}
                    </p>
                  </div>
                  <div>
                    <p className="eyebrow inline-flex items-center gap-1.5">
                      <Stethoscope size={13} aria-hidden="true" /> What SoleIQ does
                    </p>
                    <p className="mt-3 text-[0.9375rem] leading-relaxed text-clr-muted">
                      {s.soleiq}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* ── Timeline ─────────────────────────────────────────────────────── */}
        <div className="mt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="h-sub inline-flex items-center gap-2">
              <Clock size={17} aria-hidden="true" style={{ color: 'var(--clr-accent-2)' }} />
              Typical worst-case trajectory
            </h3>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="tap inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
              style={{
                border: '1px solid var(--clr-border-strong)',
                color: 'var(--clr-text-muted)',
              }}
            >
              {playing ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
              {playing ? 'Pause walkthrough' : 'Play walkthrough'}
            </button>
          </div>

          <ol className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {STAGES.map((s, i) => {
              const reached = i <= active
              const tone = TONE[s.tone]
              return (
                <li key={s.grade}>
                  <button
                    type="button"
                    onClick={() => choose(i)}
                    aria-label={`Grade ${s.grade}, ${s.when.label}`}
                    className="flex w-full flex-col rounded-lg p-3 text-left transition-colors"
                    style={{
                      background: i === active ? tone.soft : 'transparent',
                      border: `1px solid ${i === active ? tone.line : 'var(--clr-border)'}`,
                    }}
                  >
                    <span
                      className="text-[0.8125rem] font-medium"
                      style={{ color: reached ? tone.line : 'var(--clr-text-muted)' }}
                    >
                      {s.when.label}
                    </span>
                    <span className="mt-1 text-[0.75rem] leading-snug text-clr-muted">
                      {s.when.detail}
                    </span>
                    {s.toNext && (
                      <span className="mt-2 text-[0.6875rem] uppercase tracking-widest text-clr-muted">
                        → {s.toNext}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ol>

          {/* Progress rail: how far along the path the selected grade sits. */}
          <div
            className="mt-5 h-[3px] w-full overflow-hidden rounded-full"
            style={{ background: 'var(--clr-border)' }}
            aria-hidden="true"
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: TONE[stage.tone].line }}
              initial={false}
              animate={{ width: `${((active + 1) / STAGES.length) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
            />
          </div>
          <p className="mt-3 text-[0.8125rem] text-clr-muted">
            SoleIQ monitors across this entire span — but only the first two
            grades are ones it can see.
          </p>
        </div>

        {/* ── The caveat. Not optional. ────────────────────────────────────── */}
        <p
          className="mt-12 flex max-w-4xl gap-3 rounded-xl p-5 text-[0.8125rem] leading-relaxed text-clr-muted"
          style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)' }}
        >
          <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>{PROGRESSION_CAVEAT}</span>
        </p>
      </div>
    </section>
  )
}

function WindowBanner({
  kind,
  icon,
  span,
  active,
}: {
  kind: 'soleiq' | 'standard'
  icon: React.ReactNode
  span: string
  active: boolean
}) {
  const soleiq = kind === 'soleiq'
  const line = soleiq ? 'var(--clr-accent-2)' : 'var(--clr-level-urgent)'
  const soft = soleiq ? 'var(--clr-accent-2-soft)' : '#fbeae8'
  return (
    <motion.div
      className="relative overflow-hidden rounded-xl px-5 py-4"
      style={{ background: soft, border: `1px solid ${active ? line : 'transparent'}` }}
      initial={false}
      animate={{ opacity: active ? 1 : 0.55 }}
      transition={{ duration: 0.3 }}
    >
      <p
        className="inline-flex items-center gap-2 text-[0.6875rem] font-medium uppercase tracking-widest"
        style={{ color: line }}
      >
        {icon}
        {WINDOWS[kind].title}
        <span className="opacity-60">· {span}</span>
      </p>
      <p className="mt-1.5 text-[0.9375rem] font-medium text-clr-text">
        {WINDOWS[kind].line}
      </p>
    </motion.div>
  )
}
