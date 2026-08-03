"use client";

import { motion } from "framer-motion";

/** Encouraging step copy keyed to how far along the check is. */
function encouragement(pct: number): string {
  if (pct >= 100) return "All done — great job!";
  if (pct >= 75) return "Almost there";
  if (pct >= 45) return "Great progress";
  if (pct >= 15) return "You're on your way";
  return "Let's get started";
}

export function ProgressDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  const pct = total > 1 ? (current / (total - 1)) * 100 : 0;
  const complete = pct >= 100;
  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs font-bold text-ink-soft">
          Step {current + 1} of {total}
        </span>
        <span
          className={
            complete
              ? "text-xs font-bold text-secondary"
              : "text-xs font-semibold text-ink-faint"
          }
        >
          {encouragement(pct)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 170, damping: 26 }}
          className={
            complete
              ? "h-full rounded-full bg-secondary"
              : "h-full rounded-full bg-primary"
          }
        />
      </div>
      {complete && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0.6 }}
          animate={{ opacity: [0, 1, 0], scaleX: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="mt-0.5 h-0.5 rounded-full bg-secondary/50"
        />
      )}
    </div>
  );
}
