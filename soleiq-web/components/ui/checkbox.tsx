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
        "flex w-full items-start gap-3 rounded-xl border border-warmGray-100 bg-white p-3 text-left",
        checked && "border-brand bg-blue-50",
        className
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
          checked ? "border-brand bg-brand text-white" : "border-warmGray-100 bg-white"
        )}
      >
        {checked ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
      <span className="text-sm text-warmGray-800">{label}</span>
    </button>
  );
}
