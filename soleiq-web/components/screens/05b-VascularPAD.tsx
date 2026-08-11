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
    () => profile.pad?.status ?? (fromMedHistory ? "diagnosed" : undefined)
  );
  const [claudication, setClaudication] = useState(
    () => profile.pad?.claudication ?? false
  );
  const [restPain, setRestPain] = useState(() => profile.pad?.restPain ?? false);
  const [signs, setSigns] = useState<string[]>(() => profile.pad?.signs ?? []);
  const [abi, setAbi] = useState(() =>
    profile.pad?.abi != null ? String(profile.pad.abi) : ""
  );
  const [abiLeft, setAbiLeft] = useState(() =>
    profile.pad?.abiLeft != null ? String(profile.pad.abiLeft) : ""
  );
  const [abiRight, setAbiRight] = useState(() =>
    profile.pad?.abiRight != null ? String(profile.pad.abiRight) : ""
  );
  const [toeLeft, setToeLeft] = useState(() =>
    profile.pad?.toePressureLeftMmHg != null
      ? String(profile.pad.toePressureLeftMmHg)
      : ""
  );
  const [toeRight, setToeRight] = useState(() =>
    profile.pad?.toePressureRightMmHg != null
      ? String(profile.pad.toePressureRightMmHg)
      : ""
  );
  const parseOptional = (raw: string): number | undefined => {
    const value = Number(raw);
    return raw.trim() && Number.isFinite(value) ? value : undefined;
  };

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
                    "min-h-[48px] rounded-2xl border px-2 text-sm transition-all duration-150 active:scale-[0.98]",
                    active
                      ? "border-primary bg-primary-soft font-bold text-primary"
                      : "border-slate-200 bg-surface-raised font-medium text-ink hover:border-slate-300"
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
            <p className="mt-1 text-[13px] font-medium text-urgent">
              Enter a value between 0.2 and 1.5.
            </p>
          )}
          <p className="mt-1 text-[13px] text-ink-faint">
            Optional. Leave blank if not measured.
          </p>
        </div>

        {/* Per-side pressures. Peripheral arterial disease is frequently
            one-sided, and a single number for "the patient" hides the leg in
            trouble. These are cuff/Doppler measurements — the app never
            estimates them from the camera. */}
        <div>
          <label className="field-label">Per-side ABI, if measured</label>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <span className="mb-1 block text-[13px] text-ink-faint">Left</span>
              <Input
                inputMode="decimal"
                value={abiLeft}
                onChange={(e) => setAbiLeft(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0.90"
              />
            </div>
            <div>
              <span className="mb-1 block text-[13px] text-ink-faint">Right</span>
              <Input
                inputMode="decimal"
                value={abiRight}
                onChange={(e) => setAbiRight(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="0.90"
              />
            </div>
          </div>
          <p className="mt-1 text-[13px] text-ink-faint">
            An ABI above 1.4 usually means calcified arteries and cannot be
            interpreted — record a toe pressure instead.
          </p>
        </div>

        <div>
          <label className="field-label">Toe pressure (mmHg), if measured</label>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <span className="mb-1 block text-[13px] text-ink-faint">Left</span>
              <Input
                inputMode="numeric"
                value={toeLeft}
                onChange={(e) => setToeLeft(e.target.value.replace(/\D/g, ""))}
                placeholder="60"
              />
            </div>
            <div>
              <span className="mb-1 block text-[13px] text-ink-faint">Right</span>
              <Input
                inputMode="numeric"
                value={toeRight}
                onChange={(e) => setToeRight(e.target.value.replace(/\D/g, ""))}
                placeholder="60"
              />
            </div>
          </div>
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
                abiLeft: parseOptional(abiLeft),
                abiRight: parseOptional(abiRight),
                toePressureLeftMmHg: parseOptional(toeLeft),
                toePressureRightMmHg: parseOptional(toeRight),
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
