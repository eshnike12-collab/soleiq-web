"use client";

import { motion } from "framer-motion";
import type { RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLORS: Record<RiskLevel, string> = {
  low: "bg-success-soft text-success",
  medium: "bg-warn-soft text-warn",
  high: "bg-urgent-soft text-urgent",
};
const LABELS: Record<RiskLevel, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
};

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", duration: 0.3 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold",
        COLORS[risk]
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {LABELS[risk]}
    </motion.div>
  );
}
