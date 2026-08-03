import { cn } from "@/lib/utils";

/**
 * The SoleIQ brand mark (foot + pulse trace on deep navy). The artwork ships
 * with its dark background baked in, so it's presented as a rounded
 * app-icon-style tile that reads cleanly on the warm cream surfaces.
 * `size` is the rendered height in pixels; width follows the artwork's
 * natural aspect ratio.
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
      src="/soleiq-logo.png"
      alt="SoleIQ"
      height={size}
      style={{ height: size, width: "auto" }}
      className={cn("rounded-xl shadow-card", className)}
    />
  );
}
