"use client";

import { useState } from "react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import { cn } from "@/lib/utils";
import type { DiabetesType } from "@/lib/types";

const TYPES: { value: DiabetesType; label: string }[] = [
  { value: "type_1", label: "Type 1" },
  { value: "type_2", label: "Type 2" },
  { value: "gestational", label: "Gestational" },
  { value: "not_sure", label: "Not sure" },
];

export function DiabetesDetails() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const update = useSoleiqStore((s) => s.updateProfile);
  const profile = useSoleiqStore((s) => s.profile);
  const [type, setType] = useState<DiabetesType | undefined>(
    profile.diabetes?.type
  );
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i);
  const [year, setYear] = useState<string>(
    profile.diabetes?.yearDiagnosed?.toString() ?? ""
  );

  const ready = type && year;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="Health history"
        title="Diabetes details"
        subtitle="Type and year of diagnosis."
      />
      <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1 pb-2">
        <div>
          <label className="field-label">Type</label>
          <div className="grid grid-cols-2 gap-2.5">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={cn(
                  "h-14 rounded-2xl border text-[15px] transition-all duration-150 active:scale-[0.98]",
                  type === t.value
                    ? "border-primary bg-primary-soft font-bold text-primary"
                    : "border-slate-200 bg-surface-raised font-medium text-ink hover:border-slate-300"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="field-label">Year diagnosed</label>
          <Select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">Select year…</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="shrink-0 pt-3">
        <Button
          fullWidth
          disabled={!ready}
          onClick={() => {
            if (!type || !year) return;
            update({
              diabetes: {
                ...(profile.diabetes ?? {}),
                type,
                yearDiagnosed: Number(year),
              },
            });
            goNext();
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
