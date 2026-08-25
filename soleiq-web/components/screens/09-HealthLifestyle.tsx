"use client";

import { useState } from "react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import { cn } from "@/lib/utils";
import type { Numbness } from "@/lib/types";
import { useT } from "@/lib/i18n/I18nProvider";

const NUMBNESS: { value: Numbness; label: string }[] = [
  { value: "neither", label: "Neither" },
  { value: "right", label: "Right only" },
  { value: "left", label: "Left only" },
  { value: "both", label: "Both feet" },
];

export function HealthLifestyle() {
  const d = useT();
  const goNext = useSoleiqStore((s) => s.goNext);
  const update = useSoleiqStore((s) => s.updateProfile);
  const profile = useSoleiqStore((s) => s.profile);
  const [numbness, setNumbness] = useState<Numbness | undefined>(
    () => profile.numbness
  );
  const [alcohol, setAlcohol] = useState(() => profile.alcohol ?? false);
  const [smoking, setSmoking] = useState(() => profile.smoking ?? false);

  const ready = !!numbness;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow={d.screens.historyEyebrow}
        title={d.screens.lifestyleTitle}
        subtitle={d.screens.lifestyleSubtitle}
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
                  "h-14 rounded-2xl border text-[15px] transition-all duration-150 active:scale-[0.98]",
                  numbness === n.value
                    ? "border-primary bg-primary-soft font-bold text-primary"
                    : "border-slate-200 bg-surface-raised font-medium text-ink hover:border-slate-300"
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
