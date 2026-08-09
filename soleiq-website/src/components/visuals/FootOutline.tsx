/**
 * A plain line drawing of a plantar (sole) view. It stands in for the patient's
 * own photograph in every product visual on this site — we never show a stock
 * or synthetic "clinical photo", because the real screen only ever shows the
 * patient's own image.
 *
 * The geometry is anatomical rather than decorative: the medial border carries
 * a deeper waist than the lateral one, the ball is widest at the first and
 * fifth metatarsal heads, the heel is about two thirds the width of the ball,
 * and the toes fan outward from the ball with the hallux longest. Those are the
 * landmarks a reader uses to recognise a foot, and they are also the landmarks
 * the Wagner grades are described against — the lesion sits on the first
 * metatarsal head because that is where it usually sits.
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

export interface Toe {
  cx: number
  cy: number
  rx: number
  ry: number
  rot: number
}

/**
 * The five toes, hallux first. `rot` fans them outward from the ball the way
 * real toes splay — the hallux tip leans medially, the fifth toe laterally.
 * Every pad's base sits a few units *inside* the sole's top edge, so the toes
 * read as attached to the forefoot rather than floating above it.
 */
export const TOES: Toe[] = [
  { cx: 87, cy: 39, rx: 11, ry: 17, rot: 10 },
  { cx: 68, cy: 36.5, rx: 8.6, ry: 12.5, rot: 4 },
  { cx: 54, cy: 38.5, rx: 7.6, ry: 11.5, rot: -1 },
  { cx: 41.5, cy: 42, rx: 6.8, ry: 10, rot: -7 },
  { cx: 31, cy: 50, rx: 6, ry: 8.5, rot: -15 },
]

/**
 * A toe as a pad rather than an ellipse: rounded at the tip, tapered where it
 * meets the ball. An ellipse reads as a bubble; the taper is most of what makes
 * five shapes in a row read as toes.
 */
export function toePath({ cx, cy, rx, ry }: Toe) {
  return (
    `M ${cx} ${cy - ry} ` +
    `C ${cx + rx * 1.04} ${cy - ry * 0.86} ${cx + rx} ${cy - ry * 0.04} ${cx + rx * 0.84} ${cy + ry * 0.66} ` +
    `C ${cx + rx * 0.7} ${cy + ry * 1.05} ${cx - rx * 0.7} ${cy + ry * 1.05} ${cx - rx * 0.84} ${cy + ry * 0.66} ` +
    `C ${cx - rx} ${cy - ry * 0.04} ${cx - rx * 1.04} ${cy - ry * 0.86} ${cx} ${cy - ry} Z`
  )
}

export const toeTransform = (t: Toe) => `rotate(${t.rot} ${t.cx} ${t.cy})`

/** The sole, drawn clockwise from the medial edge of the ball. */
export const SOLE_PATH =
  'M 92 52 ' +
  'C 97 60 99 70 97 82 ' + // first metatarsal head — the widest point medially
  'C 95 98 81 104 77 121 ' + // the arch, cut in hard on the medial side
  'C 75 138 85 146 84 158 ' +
  'C 83 176 73 188 58 188 ' + // heel
  'C 43 188 33 176 33 158 ' +
  'C 33 146 30 136 31 121 ' + // the lateral border barely waists at all
  'C 31 106 25 97 27 82 ' + // fifth metatarsal head
  'C 28 70 28 62 30 58 ' +
  'C 40 46 75 40 92 52 Z' // the sulcus the toes sit into

/**
 * Interior creases. Faint on purpose: they are what stops the outline reading
 * as a flat blob, and they stop being legible below about forty pixels, at
 * which point they should disappear into the line weight rather than fight it.
 */
export const DETAIL_PATHS = [
  'M 31 78 C 47 68 74 66 91 76', // the crease under the ball
  // The arch, held a few units inside the medial border and stopped at the
  // waist. Run any further and it stops tracking the edge, at which point it
  // reads as a scar down the middle of the foot rather than as an instep.
  'M 91 88 C 87 100 81 108 77 118',
  'M 37 150 C 34 172 44 182 58 182 C 72 182 81 172 78 150', // the heel pad
]

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
      <g
        stroke="var(--clr-accent)"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        opacity="0.55"
      >
        <path d={SOLE_PATH} />
        {TOES.map((t, i) => (
          <path key={i} d={toePath(t)} transform={toeTransform(t)} />
        ))}
      </g>

      <g
        stroke="var(--clr-accent)"
        strokeWidth={strokeWidth * 0.6}
        strokeLinecap="round"
        opacity="0.28"
      >
        {DETAIL_PATHS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {grid && (
        <g stroke="var(--clr-accent)" strokeWidth="1" opacity="0.18">
          <line x1="28" y1="88" x2="96" y2="88" strokeDasharray="3 4" />
          <line x1="32" y1="132" x2="78" y2="132" strokeDasharray="3 4" />
          <line x1="60" y1="46" x2="57" y2="186" strokeDasharray="3 4" />
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
