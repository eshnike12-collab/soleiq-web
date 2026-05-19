"use client";

import { motion } from "framer-motion";

export function ProgressDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  const pct = total > 1 ? (current / (total - 1)) * 100 : 0;
  return (
    <div className="mb-5">
      <div className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-warmGray-600">
        <span>Step {current + 1} of {total}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-warmGray-100">
        <motion.div
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="h-full rounded-full bg-brand"
        />
      </div>
    </div>
  );
}
