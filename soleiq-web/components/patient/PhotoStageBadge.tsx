import { Flag, Sparkles } from "lucide-react";

/**
 * BASELINE / LATEST pills that sit on a foot photo.
 *
 * Both can be true at once and that is not a bug: the very first photo of a
 * foot and view is simultaneously the reference every later one is compared
 * against and the most recent one in existence. Showing both says so.
 *
 * Positioned top-left because the existing side/view caption owns the bottom
 * edge of every thumbnail in the app. `pointer-events-none` so the pills never
 * swallow the click that opens the full-screen viewer.
 */
export function PhotoStageBadge({
  baseline,
  latest,
  className = "",
}: {
  baseline?: boolean;
  latest?: boolean;
  className?: string;
}) {
  if (!baseline && !latest) return null;
  return (
    <span
      className={`pointer-events-none absolute left-1 top-1 z-10 flex flex-col items-start gap-1 ${className}`}
    >
      {baseline && (
        <span className="inline-flex items-center gap-1 rounded-md bg-teal-600/95 px-1.5 py-0.5 text-[9px] font-extrabold uppercase leading-none tracking-wider text-white shadow-sm">
          <Flag className="h-2.5 w-2.5" aria-hidden="true" />
          Baseline
        </span>
      )}
      {latest && (
        <span className="inline-flex items-center gap-1 rounded-md bg-primary/95 px-1.5 py-0.5 text-[9px] font-extrabold uppercase leading-none tracking-wider text-white shadow-sm">
          <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
          Latest
        </span>
      )}
    </span>
  );
}

/**
 * The same two labels as words, for screen readers and for captions where an
 * overlay would not fit. Returns "" when neither applies, so callers can
 * append it to an alt string unconditionally.
 */
export function photoStageLabel({
  baseline,
  latest,
}: {
  baseline?: boolean;
  latest?: boolean;
}): string {
  if (baseline && latest) return "baseline and latest photo";
  if (baseline) return "baseline photo";
  if (latest) return "latest photo";
  return "";
}
