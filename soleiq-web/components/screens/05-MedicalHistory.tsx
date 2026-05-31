"use client";

import { useState } from "react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import { ConditionHelpButton } from "@/components/conditions/ConditionInfoDialog";

const CONDITIONS = [
  "diabetes",
  "hypertension",
  "high cholesterol",
  "peripheral artery disease",
  "neuropathy",
  "heart disease",
  "kidney disease",
  "history of stroke",
  "rheumatoid arthritis",
  "obesity",
  "smoking-related illness",
];

const NONE = "None of the above";

export function MedicalHistory() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const update = useSoleiqStore((s) => s.updateProfile);
  const [picked, setPicked] = useState<string[]>([]);

  const toggle = (c: string) => {
    if (c === NONE) {
      setPicked(picked.includes(NONE) ? [] : [NONE]);
      return;
    }
    const next = new Set(picked.filter((x) => x !== NONE));
    next.has(c) ? next.delete(c) : next.add(c);
    setPicked(Array.from(next));
  };

  const ready = picked.length > 0;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="Health history"
        title="Medical conditions"
        subtitle="Select all that apply. Tap the (?) for clinical details on any condition."
      />
      <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1 pb-2">
        {CONDITIONS.map((c) => (
          <div key={c} className="flex items-center gap-1">
            <div className="flex-1">
              <Checkbox
                checked={picked.includes(c)}
                onChange={() => toggle(c)}
                label={c.charAt(0).toUpperCase() + c.slice(1)}
              />
            </div>
            <ConditionHelpButton conditionId={c} />
          </div>
        ))}
        <Checkbox
          checked={picked.includes(NONE)}
          onChange={() => toggle(NONE)}
          label={NONE}
        />
      </div>
      <div className="pt-3">
        <Button
          fullWidth
          disabled={!ready}
          onClick={() => {
            update({
              conditions: picked.includes(NONE) ? [] : picked,
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
