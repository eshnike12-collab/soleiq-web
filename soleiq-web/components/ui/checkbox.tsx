"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex min-h-[44px] w-full items-start gap-3 rounded-2xl border border-slate-200 bg-surface-raised p-3.5 text-left",
        "transition-colors duration-150 active:scale-[0.99] hover:border-slate-300",
        checked && "border-primary bg-primary-soft hover:border-primary",
        className
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
          checked
            ? "border-primary bg-primary text-white"
            : "border-slate-300 bg-surface-raised"
        )}
      >
        {checked ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
      </span>
      <span className="text-[15px] leading-snug text-ink">{label}</span>
    </button>
  );
}
