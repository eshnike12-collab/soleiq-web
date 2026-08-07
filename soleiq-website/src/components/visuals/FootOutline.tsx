/**
 * A plain line drawing of a plantar (sole) view. It stands in for the patient's
 * own photograph in every product visual on this site — we never show a stock
 * or synthetic "clinical photo", because the real screen only ever shows the
 * patient's own image.
 */

export interface FootMarker {
  cx: number
  cy: number
  /** Radius of the highlight ring. */
  r?: number
  tone?: 'watch' | 'urgent' | 'clear'
  label?: string
}

const TONE_COLOR: Record<NonNullable<FootMarker['tone']>, string> = {
  clear: 'var(--clr-level-clear)',
  watch: 'var(--clr-level-watch)',
  urgent: 'var(--clr-level-urgent)',
}

const TOES = [
  { cx: 84, cy: 42, rx: 10, ry: 13, rot: -14 },
  { cx: 66, cy: 32, rx: 8, ry: 10.5, rot: -8 },
  { cx: 51, cy: 30, rx: 7, ry: 9.5, rot: 0 },
  { cx: 38, cy: 33, rx: 6.5, ry: 8.5, rot: 8 },
  { cx: 27, cy: 41, rx: 6, ry: 7.5, rot: 16 },
]

const SOLE_PATH =
  'M 30 70 C 30 50 92 50 92 76 C 92 96 80 106 76 122 C 72 140 80 152 78 162 ' +
  'C 76 180 64 188 52 188 C 38 188 28 178 28 162 C 28 146 36 138 36 120 ' +
  'C 36 100 30 90 30 70 Z'

interface FootOutlineProps {
  markers?: FootMarker[]
  /** Draw the arch/pressure guide lines used on the analysis screen. */
  grid?: boolean
  className?: string
  strokeWidth?: number
}

export default function FootOutline({
  markers = [],
  grid = false,
  className,
  strokeWidth = 2,
}: FootOutlineProps) {
  return (
    <svg
      viewBox="0 0 120 200"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={SOLE_PATH}
        stroke="var(--clr-accent)"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        opacity="0.55"
      />
      {TOES.map((t, i) => (
        <ellipse
          key={i}
          cx={t.cx}
          cy={t.cy}
          rx={t.rx}
          ry={t.ry}
          transform={`rotate(${t.rot} ${t.cx} ${t.cy})`}
          stroke="var(--clr-accent)"
          strokeWidth={strokeWidth}
          opacity="0.55"
        />
      ))}

      {grid && (
        <g stroke="var(--clr-accent)" strokeWidth="1" opacity="0.18">
          <line x1="28" y1="96" x2="92" y2="96" strokeDasharray="3 4" />
          <line x1="30" y1="130" x2="80" y2="130" strokeDasharray="3 4" />
          <line x1="56" y1="52" x2="52" y2="186" strokeDasharray="3 4" />
        </g>
      )}

      {markers.map((m, i) => {
        const color = TONE_COLOR[m.tone ?? 'watch']
        const r = m.r ?? 11
        return (
          <g key={i}>
            <circle cx={m.cx} cy={m.cy} r={r} fill={color} opacity="0.12" />
            <circle cx={m.cx} cy={m.cy} r={r} stroke={color} strokeWidth="1.75" />
            <circle cx={m.cx} cy={m.cy} r="2" fill={color} />
          </g>
        )
      })}
    </svg>
  )
}
