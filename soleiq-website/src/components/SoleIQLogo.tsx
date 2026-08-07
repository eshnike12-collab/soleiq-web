interface SoleIQLogoProps {
  /** Size of the square mark, in px. */
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
      <img
        src="/soleiq-mark.png"
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.26,
          objectFit: 'cover',
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
