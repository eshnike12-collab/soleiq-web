"use client";

import { motion } from "framer-motion";

export function ScanCoverageBar({ value }: { value: number }) {
  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-xs font-medium text-ink-soft">
        <span>Coverage</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <motion.div
          className="h-full rounded-full bg-secondary"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ ease: "easeOut", duration: 0.4 }}
        />
      </div>
    </div>
  );
}
