"use client";

import { useState } from "react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import { ETHNICITY_OPTIONS } from "@/lib/mock/ethnicityOptions";
import { cn } from "@/lib/utils";
import type { Sex } from "@/lib/types";

export function Demographics() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const update = useSoleiqStore((s) => s.updateProfile);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex | "">("");
  const [ethnicity, setEthnicity] = useState("");

  const ageNum = Number(age);
  const ageOk = !!age && Number.isFinite(ageNum) && ageNum >= 18 && ageNum <= 120;
  const ready = ageOk && sex && ethnicity;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="Patient intake"
        title="Patient demographics"
        subtitle="Used to personalize population priors and audit model fairness."
      />
      <div className="space-y-3">
        <div>
          <label className="field-label">Age</label>
          <Input
            inputMode="numeric"
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 54"
          />
          {!ageOk && age.length > 0 && (
            <p className="mt-1 text-xs text-risk-medium">
              Enter an age between 18 and 120.
            </p>
          )}
        </div>

        <div>
          <label className="field-label">Biological sex</label>
          <div className="grid grid-cols-2 gap-2.5">
            {(["male", "female"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSex(s)}
                className={cn(
                  "h-14 rounded-2xl border text-sm font-medium capitalize transition-colors",
                  sex === s
                    ? "border-brand bg-blue-50 text-brand"
                    : "border-warmGray-100 bg-white text-warmGray-800"
                )}
              >
                <span className="mr-1.5">{s === "male" ? "♂" : "♀"}</span>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="field-label">Ethnicity</label>
          <Select value={ethnicity} onChange={(e) => setEthnicity(e.target.value)}>
            <option value="">Select…</option>
            {ETHNICITY_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </Select>
        </div>
      </div>
      <div className="mt-auto pt-4">
        <Button
          fullWidth
          disabled={!ready}
          onClick={() => {
            update({ age: ageNum, sex: sex as Sex, ethnicity });
            goNext();
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
