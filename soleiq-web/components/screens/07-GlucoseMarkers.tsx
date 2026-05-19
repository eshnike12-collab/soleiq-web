"use client";

import { useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import {
  GLUCOSE_RANGES,
  type GlucoseCategory,
  type GlucoseSeverity,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { A1cReferenceChart } from "./A1cReferenceChart";

const SEVERITY_STYLES: Record<
  GlucoseSeverity,
  { card: string; pill: string; iconCls: string; Icon: typeof AlertTriangle }
> = {
  emergency: {
    card: "border-risk-high/40 bg-risk-high/10 text-risk-high",
    pill: "bg-risk-high text-white",
    iconCls: "text-risk-high",
    Icon: AlertTriangle,
  },
  warning: {
    card: "border-amber-200 bg-amber-50 text-amber-900",
    pill: "bg-amber-100 text-amber-900",
    iconCls: "text-amber-700",
    Icon: AlertTriangle,
  },
  normal: {
    card: "border-teal-100 bg-teal-50 text-teal-900",
    pill: "bg-teal-100 text-teal-900",
    iconCls: "text-teal-700",
    Icon: Info,
  },
};

export function GlucoseMarkers() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const update = useSoleiqStore((s) => s.updateProfile);
  const profile = useSoleiqStore((s) => s.profile);
  const [hba1c, setHba1c] = useState("");
  const [glucoseCategory, setGlucoseCategory] = useState<GlucoseCategory | "">(
    ""
  );
  const [vals, setVals] = useState<string[]>(Array(10).fill(""));
  const [showGlucose, setShowGlucose] = useState(false);
  const [showA1cHelp, setShowA1cHelp] = useState(false);

  const set = (i: number, v: string) => {
    const next = [...vals];
    next[i] = v.replace(/[^\d.]/g, "");
    setVals(next);
  };

  const hba1cNum = Number(hba1c);
  const hba1cEntered = hba1c.trim().length > 0;
  const hba1cValid =
    hba1cEntered && Number.isFinite(hba1cNum) && hba1cNum >= 4 && hba1cNum <= 14;
  const hba1cOk = !hba1cEntered || hba1cValid;
  const categoryPicked = !!glucoseCategory;
  // Must provide at least one marker (or use Skip).
  const canContinue = (hba1cValid || categoryPicked) && hba1cOk;

  const selectedRange = GLUCOSE_RANGES.find((r) => r.value === glucoseCategory);

  const submit = () => {
    const nums = vals.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    update({
      diabetes: {
        ...(profile.diabetes ?? {
          type: "not_sure",
          yearDiagnosed: new Date().getFullYear(),
        }),
        hba1c: hba1c ? hba1cNum : undefined,
        glucose10d: nums.length ? nums : undefined,
        glucoseCategory: glucoseCategory || undefined,
      },
    });
    goNext();
  };

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="Health history"
        title="Glucose markers"
        subtitle="HbA1c plus the most recent glucose meter reading. Both optional."
      />
      <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1 pb-2">
        <div>
          <label className="field-label">Most recent HbA1c (%)</label>
          <Input
            inputMode="decimal"
            value={hba1c}
            onChange={(e) => setHba1c(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="e.g. 7.2"
          />
          {!hba1cOk && (
            <p className="mt-1 text-xs text-risk-medium">
              Enter a value between 4.0 and 14.0.
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowA1cHelp((v) => !v)}
            className="mt-1.5 text-xs font-medium text-brand"
          >
            {showA1cHelp ? "Hide" : "Help me choose"} — A1C ↔ average glucose
          </button>
          {showA1cHelp && (
            <A1cReferenceChart
              currentA1c={hba1c ? hba1cNum : undefined}
              ethnicity={profile.ethnicity}
            />
          )}
        </div>

        <div>
          <label className="field-label">Latest glucose meter reading</label>
          <Select
            value={glucoseCategory}
            onChange={(e) =>
              setGlucoseCategory(e.target.value as GlucoseCategory | "")
            }
          >
            <option value="">Select range…</option>
            {GLUCOSE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.range} — {r.label}
              </option>
            ))}
          </Select>
          {selectedRange && <ClinicalCard range={selectedRange} />}
        </div>

        <button
          onClick={() => setShowGlucose((v) => !v)}
          className="text-sm font-medium text-brand"
        >
          {showGlucose ? "Hide" : "Add"} last 10-day glucose readings
        </button>

        {showGlucose && (
          <div className="grid grid-cols-2 gap-2">
            {vals.map((v, i) => (
              <div key={i}>
                <p className="mb-1 text-[11px] text-warmGray-600">Day {i + 1}</p>
                <Input
                  value={v}
                  inputMode="decimal"
                  onChange={(e) => set(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2 pt-3">
        {!canContinue && (hba1cEntered || categoryPicked) === false && (
          <p className="text-center text-[11px] text-warmGray-600">
            Enter an HbA1c value or pick a glucose meter range — either one (or
            both) is required.
          </p>
        )}
        <Button fullWidth disabled={!canContinue} onClick={submit}>
          Continue
        </Button>
        <Button variant="ghost" fullWidth onClick={goNext}>
          Skip — none available
        </Button>
      </div>
    </div>
  );
}

function ClinicalCard({
  range,
}: {
  range: (typeof GLUCOSE_RANGES)[number];
}) {
  const styles = SEVERITY_STYLES[range.severity];
  const Icon = styles.Icon;
  return (
    <div
      className={cn(
        "mt-2 rounded-2xl border p-3 text-sm leading-snug",
        styles.card
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4 shrink-0", styles.iconCls)} />
        <span className="font-semibold">{range.label}</span>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
            styles.pill
          )}
        >
          {range.severity === "emergency"
            ? "Emergency"
            : range.severity === "warning"
            ? "Action"
            : "Normal"}
        </span>
      </div>
      <p className="mt-1 text-[12px]">{range.meaning}</p>
      <p className="mt-1 text-[11px] opacity-80">{range.range}</p>
    </div>
  );
}
