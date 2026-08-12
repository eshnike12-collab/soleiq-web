import type { ReactNode } from 'react'
import { Check, ChevronRight, Share2, Sparkles } from 'lucide-react'
import FootOutline from './FootOutline'
import { useT } from '../../i18n/I18nProvider'

/**
 * Six illustrative renderings of the SoleIQ app, one per step of the
 * how-it-works sequence. They are drawings, not screenshots — nothing here
 * claims to be a real patient photo or a real result.
 */

export function PhoneFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <figure className="m-0 flex justify-center">
      <div
        className="relative w-[248px] shrink-0 rounded-[2.25rem] bg-clr-bg p-2 sm:w-[272px]"
        style={{
          border: '1px solid var(--clr-border-strong)',
          boxShadow: '0 24px 48px -28px rgba(11, 42, 60, 0.28)',
        }}
      >
        <div
          className="relative overflow-hidden rounded-[1.75rem] bg-clr-bg"
          style={{ aspectRatio: '9 / 17.5' }}
        >
          <div className="absolute left-1/2 top-2 h-1 w-16 -translate-x-1/2 rounded-full bg-clr-border" />
          <div className="flex h-full flex-col px-4 pb-4 pt-7">{children}</div>
        </div>
      </div>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  )
}

function ScreenTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 font-display text-[0.9375rem] font-medium tracking-tight text-clr-text">
      {children}
    </p>
  )
}

function Chip({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'clear' | 'watch'
}) {
  const style =
    tone === 'clear'
      ? { background: 'var(--clr-accent-2-soft)', color: 'var(--clr-level-clear)' }
      : tone === 'watch'
        ? { background: '#FBF3E2', color: 'var(--clr-level-watch)' }
        : { background: 'var(--clr-surface)', color: 'var(--clr-text-muted)' }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium"
      style={style}
    >
      {children}
    </span>
  )
}

/* 1 — Capture ------------------------------------------------------------- */
export function ScreenCapture() {
  const d = useT()
  return (
    <>
      <ScreenTitle>{d.screens.leftFootSole}</ScreenTitle>
      <div
        className="relative flex-1 overflow-hidden rounded-xl"
        style={{ background: 'var(--clr-surface)' }}
      >
        <FootOutline className="absolute inset-0 h-full w-full p-6" />
        {/* Framing guide */}
        <div
          className="absolute inset-5 rounded-lg"
          style={{ border: '1.5px dashed var(--clr-border-strong)' }}
        />
        <span className="absolute inset-x-0 bottom-3 text-center text-[0.6875rem] text-clr-muted">{d.screens.fitFootInFrame}</span>
      </div>
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 rounded-full"
            style={{
              width: i === 0 ? 18 : 6,
              background: i === 0 ? 'var(--clr-accent)' : 'var(--clr-border-strong)',
            }}
          />
        ))}
      </div>
    </>
  )
}

/* 2 — Quality check -------------------------------------------------------- */
export function ScreenQuality() {
  const d = useT()
  const checks = [
    [d.screens.lightingNormalised, true],
    [d.screens.wholeFootInFrame, true],
    [d.screens.sharpEnough, true],
    [d.screens.retakeTooDark, false],
  ] as const
  return (
    <>
      <ScreenTitle>{d.screens.photoQuality}</ScreenTitle>
      <ul className="flex-1 space-y-2">
        {checks.map(([label, ok]) => (
          <li
            key={label}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.6875rem] leading-snug"
            style={{ background: ok ? 'var(--clr-accent-2-soft)' : '#FBF3E2' }}
          >
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white"
              style={{
                background: ok ? 'var(--clr-level-clear)' : 'var(--clr-level-watch)',
              }}
            >
              {ok ? (
                <Check size={10} strokeWidth={3} aria-hidden="true" />
              ) : (
                <span className="text-[9px] font-bold leading-none">!</span>
              )}
            </span>
            <span style={{ color: ok ? 'var(--clr-level-clear)' : 'var(--clr-level-watch)' }}>
              {label}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.625rem] leading-snug text-clr-muted">
        Runs on your phone before anything is uploaded.
      </p>
    </>
  )
}

/* 3 — Analysis ------------------------------------------------------------- */
export function ScreenAnalysis() {
  const d = useT()
  const inputs = ['4 photos', d.screens.diabetesHistory, 'HbA1c', d.screens.vascularAnswers, d.screens.neuropathy, d.screens.painMap]
  return (
    <>
      <ScreenTitle>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles size={13} aria-hidden="true" />{d.screens.analysing}</span>
      </ScreenTitle>
      <div
        className="relative mb-3 h-[42%] overflow-hidden rounded-xl"
        style={{ background: 'var(--clr-surface)' }}
      >
        <FootOutline grid className="absolute inset-0 h-full w-full p-5" />
      </div>
      <p className="mb-2 text-[0.625rem] font-medium uppercase tracking-widest text-clr-muted">{d.screens.inputs}</p>
      <ul className="flex flex-wrap gap-1.5">
        {inputs.map((i) => (
          <li key={i}>
            <Chip>{i}</Chip>
          </li>
        ))}
      </ul>
    </>
  )
}

/* 4 — Result --------------------------------------------------------------- */
export function ScreenResult() {
  const d = useT()
  return (
    <>
      <div
        className="mb-3 rounded-xl px-3 py-2.5"
        style={{ background: '#FBF3E2' }}
      >
        <p className="text-[0.625rem] uppercase tracking-widest" style={{ color: 'var(--clr-level-watch)' }}>{d.screens.screeningLevel}</p>
        <p
          className="font-display text-lg font-medium tracking-tight"
          style={{ color: 'var(--clr-level-watch)' }}
        >
          Watch
        </p>
      </div>
      <div
        className="relative flex-1 overflow-hidden rounded-xl"
        style={{ background: 'var(--clr-surface)' }}
      >
        <FootOutline
          className="absolute inset-0 h-full w-full p-5"
          markers={[
            { cx: 84, cy: 44, r: 12, tone: 'watch' },
            { cx: 50, cy: 160, r: 10, tone: 'watch' },
          ]}
        />
      </div>
      <p className="mt-3 text-[0.6875rem] leading-snug text-clr-muted">
        Two areas to keep an eye on. Recheck in 7 days, and book a visit if
        either changes.
      </p>
    </>
  )
}

/* 5 — Timeline ------------------------------------------------------------- */
export function ScreenTimeline() {
  const d = useT()
  const entries = [
    { date: 'Today', level: 'Watch', tone: 'watch' as const },
    { date: '3 Jun', level: 'Clear', tone: 'clear' as const },
    { date: '20 May', level: 'Clear', tone: 'clear' as const },
    { date: '6 May', level: 'Watch', tone: 'watch' as const },
  ]
  return (
    <>
      <ScreenTitle>{d.screens.yourTimeline}</ScreenTitle>
      <ul className="flex-1 space-y-2">
        {entries.map((e) => (
          <li
            key={e.date}
            className="flex items-center gap-2.5 rounded-lg p-2"
            style={{ border: '1px solid var(--clr-border)' }}
          >
            <span
              className="h-9 w-9 shrink-0 rounded-md"
              style={{ background: 'var(--clr-surface)' }}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.6875rem] font-medium text-clr-text">{e.date}</span>
              <span className="block text-[0.625rem] text-clr-muted">4 photos</span>
            </span>
            <Chip tone={e.tone}>{e.level}</Chip>
          </li>
        ))}
      </ul>
    </>
  )
}

/* 6 — Share ---------------------------------------------------------------- */
export function ScreenShare() {
  const d = useT()
  return (
    <>
      <ScreenTitle>{d.screens.shareRecord}</ScreenTitle>
      <div
        className="rounded-xl p-3"
        style={{ border: '1px solid var(--clr-border)' }}
      >
        <p className="text-[0.6875rem] font-medium text-clr-text">{d.screens.podiatryClinic}</p>
        <p className="mt-0.5 text-[0.625rem] leading-snug text-clr-muted">{d.screens.fullHistory}</p>
        <span
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.6875rem] font-medium text-white"
          style={{ background: 'var(--clr-accent)' }}
        >
          <Share2 size={11} aria-hidden="true" />{d.screens.sendRecord}</span>
      </div>
      <p className="mb-2 mt-4 text-[0.625rem] font-medium uppercase tracking-widest text-clr-muted">{d.screens.clinicianView}</p>
      <ul className="flex-1 space-y-1.5">
        {[d.screens.clinicalReport, d.screens.photoComparison, d.screens.perPatientAssistant].map((row) => (
          <li
            key={row}
            className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[0.6875rem] text-clr-text"
            style={{ background: 'var(--clr-surface)' }}
          >
            {row}
            <ChevronRight size={12} className="text-clr-muted" aria-hidden="true" />
          </li>
        ))}
      </ul>
    </>
  )
}
