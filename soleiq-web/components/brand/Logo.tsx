"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/I18nProvider";

/**
 * The English slogan, for anything that needs it outside React — share cards,
 * PDF exports. On screen the lockup takes it from the dictionary instead.
 */
export const BRAND_SLOGAN = "Early Detection, Lifelong Protection";

/**
 * The SoleIQ brand mark alone — foot and pulse trace, no wordmark, because the
 * name is always typeset beside it and never baked into the image.
 *
 * The same transparent artwork soleiqhealth.com uses, with no tile behind it,
 * so it sits on the cream page and on a white card equally well.
 *
 * `size` is the height in pixels; the width follows the artwork. The mark is
 * taller than it is wide, so the old rounded-tile treatment cropped it — hence
 * no tile, no rounding, no shadow.
 */
export function BrandLogo({
  size = 44,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/soleiq-mark-transparent.png"
      alt="SoleIQ"
      height={size}
      style={{
        height: size,
        width: "auto",
        objectFit: "contain",
        display: "block",
        flexShrink: 0,
      }}
      className={className}
    />
  );
}

/**
 * The top-bar lockup, identical to the one on soleiqhealth.com.
 *
 * Mark, then "SoleIQ", then "Health" beside it smaller and lighter. Every
 * proportion is derived from `size` exactly as the site derives it — 0.66 for
 * the name, 0.42 for the suffix, a 0.3em gap between them on a shared
 * baseline — so at the same size the two lockups are the same object rather
 * than two takes on it. The colours are the site's brand navy and its muted
 * grey, not the app's warm ink, for the same reason.
 */
export function BrandNavLockup({ size = 38 }: { size?: number }) {
  return (
    /* `text-rendering: auto`, against the app's global `optimizeLegibility`.
       That setting turns on kerning and optional ligatures, which changes
       glyph advance widths — it was making this wordmark about 5px wider than
       the identical markup on soleiqhealth.com, and pushing the button beside
       it out of alignment. Scoped to the lockup so the rest of the app keeps
       the typography it was designed with. */
    /* `dir="ltr"`, even in Arabic and Urdu — a lockup is a fixed piece of
       artwork, not a sentence. Left to the page's direction it reversed: the
       mark jumped to the right of the words and "Health" landed before
       "SoleIQ". The cluster still moves to the right of an RTL bar, which is
       correct; what must not flip is the inside of it. */
    <span
      dir="ltr"
      className="inline-flex items-center gap-2.5"
      style={{ textRendering: "auto" }}
    >
      <BrandLogo size={size} />
      <span className="inline-flex items-baseline gap-[0.3em] whitespace-nowrap">
        <span
          className="font-display font-semibold tracking-tightest text-brand-ink"
          style={{ fontSize: size * 0.66, lineHeight: 1 }}
        >
          SoleIQ
        </span>
        <span
          className="font-display font-medium tracking-tight text-brand-muted"
          style={{ fontSize: size * 0.42, lineHeight: 1 }}
        >
          Health
        </span>
      </span>
    </span>
  );
}

/**
 * Full brand lockup: mark on the left, "SoleIQ" to its right with the
 * slogan in small text underneath. `large` is the hero variant (Welcome).
 */
export function BrandLockup({
  large,
  className,
}: {
  large?: boolean;
  className?: string;
}) {
  const d = useT();
  return (
    /* `dir="ltr"` keeps the mark to the left of the words, as above. The
       slogan below is translated, so it gets its direction back — see there. */
    <div dir="ltr" className={cn("flex items-center", large ? "gap-4" : "gap-3", className)}>
      <BrandLogo size={large ? 96 : 56} />
      <div className="min-w-0 text-start">
        <span
          className={cn(
            "block font-bold tracking-tight text-primary",
            large ? "text-3xl text-ink" : "text-lg"
          )}
        >
          {d.brand.name}
        </span>
        {/* `dir="auto"`, not inherited. The lockup around this is pinned to
            LTR so the mark stays left of the name, but the slogan is a real
            sentence in the reader's language — pinned with it, Arabic and Urdu
            would read in reverse. `auto` takes the direction from the first
            strong character, which is right in every one of the twenty. */}
        <span
          dir="auto"
          className={cn(
            "block font-semibold leading-snug text-ink-soft",
            large ? "mt-1 text-[13px]" : "text-[11px]"
          )}
        >
          {d.brand.slogan}
        </span>
      </div>
    </div>
  );
}
