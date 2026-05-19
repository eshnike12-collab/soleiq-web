"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function QualityIndicator({
  label,
  passed,
}: {
  label: string;
  passed: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors duration-200",
        passed ? "bg-teal-50 text-teal-800" : "bg-warmGray-100 text-warmGray-600"
      )}
    >
      <span
        className={cn(
          "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full transition-colors duration-200",
          passed ? "bg-teal-600 text-white" : "bg-warmGray-100"
        )}
      >
        {passed ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
      </span>
      {label}
    </div>
  );
}
