import { cn } from "@/lib/utils";

export const BRAND_SLOGAN = "Early Detection, Lifelong Protection";

/**
 * The SoleIQ brand mark alone (foot + pulse trace, no wordmark — the name
 * is always typeset beside it, never baked into the image). Rendered as a
 * rounded app-icon-style tile; `size` is the height in pixels.
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
      src="/soleiq-mark.png"
      alt="SoleIQ"
      height={size}
      style={{ height: size, width: "auto" }}
      className={cn("rounded-xl shadow-card", className)}
    />
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
  return (
    <div className={cn("flex items-center", large ? "gap-4" : "gap-3", className)}>
      <BrandLogo
        size={large ? 96 : 56}
        className={large ? "rounded-3xl shadow-lifted" : undefined}
      />
      <div className="min-w-0 text-left">
        <span
          className={cn(
            "block font-bold tracking-tight text-primary",
            large ? "text-3xl text-ink" : "text-lg"
          )}
        >
          SoleIQ
        </span>
        <span
          className={cn(
            "block font-semibold leading-snug text-ink-soft",
            large ? "mt-1 text-[13px]" : "text-[11px]"
          )}
        >
          {BRAND_SLOGAN}
        </span>
      </div>
    </div>
  );
}
