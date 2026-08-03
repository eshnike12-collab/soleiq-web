"use client";

import { cn } from "@/lib/utils";

export function RadioGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex min-h-[48px] w-full items-center gap-3 rounded-2xl border bg-surface-raised p-3.5 text-left",
              "transition-colors duration-150 active:scale-[0.99]",
              selected
                ? "border-primary bg-primary-soft"
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <span
              className={cn(
                "h-6 w-6 shrink-0 rounded-full border-2 transition-colors",
                selected ? "border-primary" : "border-slate-300"
              )}
            >
              {selected ? (
                <span className="block h-full w-full rounded-full border-[6px] border-primary" />
              ) : null}
            </span>
            <span className="text-[15px] leading-snug text-ink">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
