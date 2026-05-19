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
              "flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left",
              selected ? "border-brand bg-blue-50" : "border-warmGray-100"
            )}
          >
            <span
              className={cn(
                "h-5 w-5 rounded-full border-2",
                selected ? "border-brand" : "border-warmGray-100"
              )}
            >
              {selected ? (
                <span className="block h-full w-full rounded-full border-[5px] border-brand" />
              ) : null}
            </span>
            <span className="text-sm text-warmGray-800">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
