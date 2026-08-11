interface SoleIQLogoProps {
  /** Height of the mark, in px. Its width follows its own proportions. */
  size?: number
  /** Render the wordmark next to the mark. */
  wordmark?: boolean
  /** Render "Health" alongside "SoleIQ", set smaller and lighter. */
  suffix?: boolean
  className?: string
}

/**
 * The lockup: the square mark, "SoleIQ" set in type, and "Health" beside it at
 * a smaller size and lighter weight.
 *
 * The wordmark is type rather than baked into the image so it stays crisp at
 * nav sizes, and `items-center` on the row is what keeps the mark, the words
 * and anything placed after them sitting on one optical line.
 */
export default function SoleIQLogo({
  size = 34,
  wordmark = true,
  suffix = true,
  className,
}: SoleIQLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      {/* The mark on its own, with no tile behind it.
          Sized by height with the width left to follow: it is taller than it
          is wide, so forcing it into the square the old app-icon tile occupied
          would crop it. `soleiq-mark.png` stays where an opaque square is what
          is wanted — the touch icon, the share card, and the particle logo,
          which samples that artwork by luminance and has no alpha to read. */}
      <img
        src="/soleiq-mark-transparent.png"
        alt=""
        aria-hidden="true"
        height={size}
        style={{
          height: size,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
        }}
      />
      {wordmark && (
        <span className="inline-flex items-baseline gap-[0.3em] whitespace-nowrap">
          <span
            className="font-display font-semibold tracking-tightest text-clr-text"
            style={{ fontSize: size * 0.66, lineHeight: 1 }}
          >
            SoleIQ
          </span>
          {suffix && (
            <span
              className="font-display font-medium tracking-tight text-clr-muted"
              style={{ fontSize: size * 0.42, lineHeight: 1 }}
            >
              Health
            </span>
          )}
        </span>
      )}
    </span>
  )
}
