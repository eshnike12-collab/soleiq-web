"use client";

import { useState } from "react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import { cn } from "@/lib/utils";
import type { Numbness } from "@/lib/types";

const NUMBNESS: { value: Numbness; label: string }[] = [
  { value: "neither", label: "Neither" },
  { value: "right", label: "Right only" },
  { value: "left", label: "Left only" },
  { value: "both", label: "Both feet" },
];

export function HealthLifestyle() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const update = useSoleiqStore((s) => s.updateProfile);
  const [numbness, setNumbness] = useState<Numbness | undefined>();
  const [alcohol, setAlcohol] = useState(false);
  const [smoking, setSmoking] = useState(false);

  const ready = !!numbness;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="Health history"
        title="Health & lifestyle"
        subtitle="Numbness in your feet, plus a couple of lifestyle questions."
      />
      <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1 pb-2">
        <div>
          <label className="field-label">Numbness or tingling</label>
          <div className="grid grid-cols-2 gap-2.5">
            {NUMBNESS.map((n) => (
              <button
                key={n.value}
                onClick={() => setNumbness(n.value)}
                className={cn(
                  "h-14 rounded-2xl border text-sm font-medium transition-colors",
                  numbness === n.value
                    ? "border-brand bg-blue-50 text-brand"
                    : "border-warmGray-100 bg-white text-warmGray-800"
                )}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="field-label">Lifestyle</label>
          <div className="space-y-2">
            <Switch checked={alcohol} onChange={setAlcohol} label="Do you drink alcohol?" />
            <Switch checked={smoking} onChange={setSmoking} label="Do you smoke?" />
          </div>
        </div>
      </div>
      <div className="pt-3">
        <Button
          fullWidth
          disabled={!ready}
          onClick={() => {
            update({ numbness: numbness as Numbness, alcohol, smoking });
            goNext();
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
