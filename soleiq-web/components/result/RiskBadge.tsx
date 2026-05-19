"use client";

import { motion } from "framer-motion";
import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLORS: Record<RiskLevel, string> = {
  low: "bg-risk-low",
  medium: "bg-risk-medium",
  high: "bg-risk-high",
};
const LABELS: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", duration: 0.4 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-white",
        COLORS[risk]
      )}
    >
      <span className="h-2 w-2 rounded-full bg-white" />
      {LABELS[risk]}
    </motion.div>
  );
}
