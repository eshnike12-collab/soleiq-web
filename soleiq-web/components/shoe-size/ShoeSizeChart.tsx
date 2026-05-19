"use client";

import { useState } from "react";
import { useSoleiqStore } from "@/lib/store";
import {
  chartTitleFor,
  getSizesForSex,
  sizeToMm,
} from "@/lib/shoeSizeLookup";
import { cn } from "@/lib/utils";

export function ShoeSizeChart() {
  const profile = useSoleiqStore((s) => s.profile);
  const updateProfile = useSoleiqStore((s) => s.updateProfile);
  const sex = profile.sex; // may be undefined when deep-linked
  const sizes = getSizesForSex(sex);
  const chartTitle = chartTitleFor(sex);
  const [showHelp, setShowHelp] = useState(false);

  const select = (size: number) => {
    const sexForLookup = sex ?? "male";
    updateProfile({
      shoeSizeUS: size,
      footLengthMm: sizeToMm(size, sexForLookup),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-warmGray-600">
        <span className="text-sm">{sex === "female" ? "♀" : "♂"}</span>
        {chartTitle}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {sizes.map((s) => {
          const active = profile.shoeSizeUS === s;
          return (
            <button
              key={s}
              onClick={() => select(s)}
              className={cn(
                "h-12 rounded-xl border text-sm font-medium",
                active
                  ? "border-brand bg-brand text-white"
                  : "border-warmGray-100 bg-white text-warmGray-800"
              )}
            >
              {s}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setShowHelp((v) => !v)}
        className="text-sm font-medium text-brand"
      >
        {showHelp ? "Hide chart" : "Help me choose"}
      </button>

      {showHelp && (
        <div className="rounded-xl border border-warmGray-100 bg-white p-3 text-xs text-warmGray-800">
          <p className="mb-1 font-medium">{chartTitle} — foot length (mm)</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
            {sizes.map((s) => {
              const mm = sizeToMm(s, sex ?? "male");
              const active = profile.shoeSizeUS === s;
              return (
                <li
                  key={s}
                  className={cn(
                    "flex justify-between rounded px-1",
                    active && "bg-blue-50 font-semibold text-brand"
                  )}
                >
                  <span>US {s}</span>
                  <span>{mm} mm</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[10px] italic text-warmGray-600">
            US Men's and Women's use different mm at the same number — Women's
            7 ≈ Men's 5.5. Always size by length, not by number.
          </p>
        </div>
      )}
    </div>
  );
}
