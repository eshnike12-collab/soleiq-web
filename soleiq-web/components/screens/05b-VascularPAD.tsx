"use client";

import { useState } from "react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import { cn } from "@/lib/utils";

type Status = "diagnosed" | "suspected" | "none" | "unknown";

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "diagnosed", label: "Yes — diagnosed" },
  { value: "suspected", label: "Suspected / under workup" },
  { value: "none", label: "No" },
  { value: "unknown", label: "Not sure" },
];

const PAD_SIGNS = [
  "Cool or cold feet",
  "Pale or bluish skin color",
  "Hair loss on the lower legs",
  "Slow-healing wounds",
  "Weak or absent foot pulses",
  "Skin shiny or thin in appearance",
];

export function VascularPAD() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const update = useSoleiqStore((s) => s.updateProfile);
  const profile = useSoleiqStore((s) => s.profile);
  const fromMedHistory = !!profile.conditions?.includes("peripheral artery disease");

  const [status, setStatus] = useState<Status | undefined>(
    fromMedHistory ? "diagnosed" : undefined
  );
  const [claudication, setClaudication] = useState(false);
  const [restPain, setRestPain] = useState(false);
  const [signs, setSigns] = useState<string[]>([]);
  const [abi, setAbi] = useState("");

  const toggleSign = (s: string) => {
    const next = new Set(signs);
    next.has(s) ? next.delete(s) : next.add(s);
    setSigns(Array.from(next));
  };

  const abiNum = Number(abi);
  const abiOk = !abi || (Number.isFinite(abiNum) && abiNum >= 0.2 && abiNum <= 1.5);
  const ready = !!status && abiOk;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="Vascular screening"
        title="Peripheral artery disease"
        subtitle="PAD is independently linked to delayed wound healing and amputation risk — we screen for it separately from neuropathy."
      />
      <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1 pb-2">
        <div>
          <label className="field-label">PAD diagnosis</label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((o) => {
              const active = status === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => setStatus(o.value)}
                  className={cn(
                    "h-12 rounded-2xl border text-sm font-medium transition-colors",
                    active
                      ? "border-brand bg-blue-50 text-brand"
                      : "border-warmGray-100 bg-white text-warmGray-800"
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="field-label">Symptoms</label>
          <div className="space-y-2">
            <Checkbox
              checked={claudication}
              onChange={setClaudication}
              label="Calf pain when walking that improves with rest (claudication)"
            />
            <Checkbox
              checked={restPain}
              onChange={setRestPain}
              label="Foot or leg pain at rest, especially at night"
            />
          </div>
        </div>

        <div>
          <label className="field-label">Clinical signs (clinician-observable)</label>
          <div className="space-y-2">
            {PAD_SIGNS.map((s) => (
              <Checkbox
                key={s}
                checked={signs.includes(s)}
                onChange={() => toggleSign(s)}
                label={s}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="field-label">
            Ankle-Brachial Index (ABI), if measured
          </label>
          <Input
            inputMode="decimal"
            value={abi}
            onChange={(e) => setAbi(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="e.g. 0.85"
          />
          {!abiOk && (
            <p className="mt-1 text-xs text-risk-medium">
              Enter a value between 0.2 and 1.5.
            </p>
          )}
          <p className="mt-1 text-[11px] text-warmGray-600">
            Optional. Leave blank if not measured.
          </p>
        </div>
      </div>

      <div className="pt-3">
        <Button
          fullWidth
          disabled={!ready}
          onClick={() => {
            update({
              pad: {
                status: status as Status,
                claudication,
                restPain,
                signs,
                abi: abi ? abiNum : undefined,
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
