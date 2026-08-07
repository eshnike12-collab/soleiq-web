import FootOutline from './FootOutline'

/**
 * Flat line art, one composition per scene.
 *
 * This is the last fallback: no WebGL at all. It has to be legible, cheap, and
 * say the same thing the particle scene says.
 */
export default function SceneArt({ scene, dark }: { scene: string; dark: boolean }) {
  const stroke = dark ? 'rgba(255,255,255,0.7)' : 'var(--clr-accent)'
  const faint = dark ? 'rgba(255,255,255,0.28)' : 'rgba(11,42,60,0.22)'
  const accent = dark ? '#4ecdc4' : 'var(--clr-accent-2)'

  const common = 'h-auto w-full max-w-[420px]'

  switch (scene) {
    case 'foot':
      return <FootOutline className={common} strokeWidth={1.6} />

    case 'capture':
      return (
        <svg viewBox="0 0 320 260" className={common} fill="none" aria-hidden="true">
          <rect x="118" y="8" width="84" height="150" rx="14" stroke={stroke} strokeWidth="1.6" />
          <rect x="126" y="20" width="68" height="126" rx="6" stroke={faint} strokeWidth="1" />
          {[
            [18, 180],
            [96, 180],
            [174, 180],
            [252, 180],
          ].map(([x, y]) => (
            <g key={x} stroke={accent} strokeWidth="1.4">
              <path d={`M${x} ${y + 14} v-14 h14`} />
              <path d={`M${x + 50} ${y} h14 v14`} />
              <path d={`M${x + 64} ${y + 46} v14 h-14`} />
              <path d={`M${x + 14} ${y + 60} h-14 v-14`} />
            </g>
          ))}
          <path d="M20 166 H300" stroke={faint} strokeWidth="1" strokeDasharray="4 6" />
        </svg>
      )

    case 'analysis':
      return (
        <svg viewBox="0 0 240 300" className={common} fill="none" aria-hidden="true">
          <g stroke={faint} strokeWidth="0.8">
            {Array.from({ length: 11 }, (_, i) => (
              <line key={`v${i}`} x1={40 + i * 16} y1="20" x2={40 + i * 16} y2="280" />
            ))}
            {Array.from({ length: 15 }, (_, i) => (
              <line key={`h${i}`} x1="40" y1={20 + i * 18.5} x2="200" y2={20 + i * 18.5} />
            ))}
          </g>
          <svg x="60" y="20" width="120" height="200" viewBox="0 0 120 200" overflow="visible">
            <FootOutline strokeWidth={1.6} />
          </svg>
          {[
            [152, 76],
            [110, 232],
            [158, 160],
          ].map(([cx, cy]) => (
            <g key={`${cx}-${cy}`}>
              <circle cx={cx} cy={cy} r="14" fill={accent} opacity="0.14" />
              <circle cx={cx} cy={cy} r="14" stroke={accent} strokeWidth="1.4" />
              <circle cx={cx} cy={cy} r="2.4" fill={accent} />
            </g>
          ))}
          <g>
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                x={44 + i * 39}
                y="286"
                width="34"
                height="6"
                rx="3"
                fill={i === 1 ? accent : faint}
              />
            ))}
          </g>
        </svg>
      )

    case 'clinician':
      return (
        <svg viewBox="0 0 340 240" className={common} fill="none" aria-hidden="true">
          <rect x="18" y="18" width="230" height="148" rx="8" stroke={stroke} strokeWidth="1.6" />
          <path d="M8 190 H258 L246 166 H20 Z" stroke={stroke} strokeWidth="1.6" />
          {Array.from({ length: 7 }, (_, i) => (
            <rect
              key={i}
              x="34"
              y={38 + i * 17}
              width={i % 3 === 0 ? 108 : 138}
              height="5"
              rx="2.5"
              fill={faint}
            />
          ))}
          <rect x="176" y="34" width="56" height="92" rx="5" stroke={faint} strokeWidth="1" />
          <circle cx="204" cy="62" r="8" stroke={accent} strokeWidth="1.3" />
          <circle cx="196" cy="104" r="7" stroke={accent} strokeWidth="1.3" />
          <rect x="278" y="60" width="48" height="94" rx="9" stroke={stroke} strokeWidth="1.4" />
          <path
            d="M276 110 C 250 110 248 78 214 78"
            stroke={accent}
            strokeWidth="1.2"
            strokeDasharray="3 5"
          />
        </svg>
      )

    case 'timeline':
      return (
        <svg viewBox="0 0 360 200" className={common} fill="none" aria-hidden="true">
          <line x1="20" y1="170" x2="340" y2="170" stroke={faint} strokeWidth="1" />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const x = 30 + i * 60
            const y = 40 + i * 17
            return (
              <g key={i}>
                <line x1={x} y1="166" x2={x} y2="174" stroke={faint} strokeWidth="1" />
                <rect
                  x={x - 12}
                  y="128"
                  width="24"
                  height="30"
                  rx="4"
                  stroke={faint}
                  strokeWidth="0.9"
                />
                <circle cx={x} cy={y} r="3.4" fill={accent} />
              </g>
            )
          })}
          <path
            d="M30 40 C 90 57 150 74 210 91 S 330 125 330 125"
            stroke={accent}
            strokeWidth="1.6"
          />
          <text x="20" y="24" fontSize="9" fill={faint}>
            risk
          </text>
        </svg>
      )

    case 'logo':
    default:
      return (
        <img
          src="/soleiq-mark.png"
          alt="The SoleIQ mark"
          width={168}
          height={168}
          loading="lazy"
          decoding="async"
          style={{ borderRadius: 40 }}
        />
      )
  }
}
