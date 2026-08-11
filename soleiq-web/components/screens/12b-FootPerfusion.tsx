"use client";

/**
 * Optional foot-perfusion check.
 *
 * Three things get measured here, and one thing deliberately does not:
 *
 *  - Pulsatile signal in each foot, compared side to side (lib/perfusion).
 *  - Capillary refill after a toe press.
 *  - Ankle/toe pressures, if a clinician measured them with a cuff — entered,
 *    never estimated.
 *
 * There is no camera-derived blood pressure, because no validated method
 * exists to produce one. In a diabetic foot a falsely normal pressure is the
 * most dangerous number the app could print, so it prints none.
 */

import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Droplets,
  Gauge,
  Info,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import {
  FootTraceCapture,
  type FootTraceResult,
  type TraceMode,
} from "@/components/capture/FootTraceCapture";
import {
  CONCERN_LABEL,
  type CapillaryRefillResult,
  type PerfusionSignal,
  assessFootPerfusion,
  compareFeet,
  measureCapillaryRefill,
  measurePerfusionSignal,
} from "@/lib/perfusion";
import { adaptToSubject } from "@/lib/vitals";
import type { FootSide } from "@/lib/types";

const PULSE_SECONDS = 20;
const REFILL_SECONDS = 12;

type Step =
  | { kind: "intro" }
  | { kind: "capturing"; mode: TraceMode; side: FootSide }
  | { kind: "unavailable"; message: string };

const CONCERN_STYLE: Record<string, string> = {
  unknown: "bg-surface-sunken text-ink-soft",
  reassuring: "bg-secondary-soft text-secondary",
  monitor: "bg-warn-soft text-warn",
  urgent: "bg-urgent-soft text-urgent",
};

export function FootPerfusion() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const profile = useSoleiqStore((s) => s.profile);
  const setPerfusion = useSoleiqStore((s) => s.setPerfusion);
  const vitalsProfile = useSoleiqStore((s) => s.vitalsProfile);
  const setVitalsProfile = useSoleiqStore((s) => s.setVitalsProfile);

  const [step, setStep] = useState<Step>({ kind: "intro" });
  const [signals, setSignals] = useState<Partial<Record<FootSide, PerfusionSignal>>>({});
  const [refills, setRefills] = useState<
    { side: FootSide; result: CapillaryRefillResult }[]
  >([]);
  const [note, setNote] = useState<string | null>(null);

  // Pressures the clinician already entered on the vascular screen.
  const measuredPressures = (["left", "right"] as FootSide[])
    .map((side) => {
      const pad = profile.pad;
      if (!pad) return null;
      const abi = side === "left" ? pad.abiLeft ?? pad.abi : pad.abiRight ?? pad.abi;
      const toe = side === "left" ? pad.toePressureLeftMmHg : pad.toePressureRightMmHg;
      if (abi === undefined && toe === undefined) return null;
      return { side, abi, toePressureMmHg: toe };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const bilateral = compareFeet(signals.left ?? null, signals.right ?? null);
  const assessment = assessFootPerfusion({
    pressures: measuredPressures,
    bilateral,
    refill: refills,
    woundPresent: (profile.priorEvents ?? []).some((event) => event.type === "ulcer"),
    now: Date.now(),
  });

  const handleComplete = (side: FootSide, outcome: FootTraceResult) => {
    setNote(null);
    if (outcome.mode === "pulse") {
      // First usable foot clip doubles as the MetaPhys calibration: the
      // adaptation is fitted once and reused for every later measurement,
      // which is what makes the perfusion index comparable across visits.
      let personalisation = vitalsProfile;
      if (!personalisation && outcome.traces) {
        personalisation = adaptToSubject(outcome.traces, {
          sampleRateHz: outcome.sampleRateHz,
          now: Date.now(),
        });
        if (personalisation) setVitalsProfile(personalisation);
      }
      const signal = outcome.traces
        ? measurePerfusionSignal(
            outcome.traces,
            outcome.sampleRateHz,
            personalisation?.params
          )
        : null;
      if (!signal) {
        setNote("That clip was too short or too unsteady to read. Try again, holding the foot still.");
      } else {
        setSignals((current) => ({ ...current, [side]: signal }));
        if (!signal.pulsatile) {
          setNote(
            "No clear pulse signal came through on that foot. That is often lighting or movement rather than circulation — try again in brighter, even light before reading anything into it."
          );
        }
      }
    } else {
      const refill = measureCapillaryRefill(outcome.samples);
      if (!refill.ok) {
        setNote(refill.reason);
      } else {
        const { ok: _ok, ...result } = refill;
        setRefills((current) => [
          ...current.filter((entry) => entry.side !== side),
          { side, result },
        ]);
      }
    }
    setStep({ kind: "intro" });
  };

  const saveAndContinue = () => {
    setPerfusion(assessment.empty ? null : assessment);
    goNext();
  };

  if (step.kind === "capturing") {
    return (
      <div className="flex h-full flex-col">
        <ScreenHeader
          eyebrow={step.side === "left" ? "Left foot" : "Right foot"}
          title={step.mode === "pulse" ? "Pulse signal" : "Capillary refill"}
        />
        <div className="min-h-0 flex-1">
          <FootTraceCapture
            mode={step.mode}
            seconds={step.mode === "pulse" ? PULSE_SECONDS : REFILL_SECONDS}
            onComplete={(outcome) => handleComplete(step.side, outcome)}
            onCancel={() => setStep({ kind: "intro" })}
            onUnavailable={(message) => setStep({ kind: "unavailable", message })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="Optional"
        title="Foot circulation"
        subtitle="Camera checks of blood flow in each foot. Skippable — the foot photo exam does not depend on it."
      />

      <div className="-mx-1 flex-1 space-y-3 overflow-y-auto px-1 pb-2">
        {step.kind === "unavailable" && (
          <div className="rounded-2xl bg-urgent-soft p-3.5 text-sm leading-snug text-ink">
            {step.message}
          </div>
        )}
        {note && (
          <div className="rounded-2xl bg-warn-soft p-3.5 text-sm leading-snug text-ink">
            {note}
          </div>
        )}

        {/* Pulse signal, per foot */}
        {(["left", "right"] as FootSide[]).map((side) => {
          const signal = signals[side];
          return (
            <Card key={side} className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary-soft text-secondary">
                <Activity className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-ink">
                  {side === "left" ? "Left" : "Right"} foot pulse signal
                </p>
                {signal ? (
                  <p className="mt-0.5 text-[15px] leading-snug text-ink-soft">
                    {signal.pulsatile
                      ? `Pulse seen at ${Math.round(signal.pulseRateBpm)} bpm · strength ${signal.perfusionIndexPct.toFixed(2)}%`
                      : "No clear pulse signal in that clip."}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[15px] leading-snug text-ink-soft">
                    {PULSE_SECONDS} seconds, foot held still.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setStep({ kind: "capturing", mode: "pulse", side })}
                className="min-h-[44px] shrink-0 rounded-xl border border-slate-200 bg-surface-raised px-3.5 text-[13px] font-bold text-primary"
              >
                {signal ? "Redo" : "Measure"}
              </button>
            </Card>
          );
        })}

        {/* Capillary refill */}
        <Card className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary-soft text-secondary">
            <Timer className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-ink">Capillary refill</p>
            {refills.length > 0 ? (
              <p className="mt-0.5 text-[15px] leading-snug text-ink-soft">
                {refills
                  .map(
                    (entry) =>
                      `${entry.side === "left" ? "Left" : "Right"}: ${entry.result.refillSeconds.toFixed(1)}s (${entry.result.category})`
                  )
                  .join(" · ")}
              </p>
            ) : (
              <p className="mt-0.5 text-[15px] leading-snug text-ink-soft">
                Press a toe until it pales, then let go while filming.
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            {(["left", "right"] as FootSide[]).map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => setStep({ kind: "capturing", mode: "refill", side })}
                className="min-h-[36px] rounded-xl border border-slate-200 bg-surface-raised px-3 text-[13px] font-bold text-primary"
              >
                {side === "left" ? "L" : "R"}
              </button>
            ))}
          </div>
        </Card>

        {/* Measured pressures, entered from a real device */}
        <Card className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Gauge className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-ink">Ankle / toe pressures</p>
            <p className="mt-0.5 text-[15px] leading-snug text-ink-soft">
              {measuredPressures.length > 0
                ? `${measuredPressures.length} recorded on the vascular screen.`
                : "None recorded. These come from a cuff and Doppler — a camera cannot measure them."}
            </p>
          </div>
        </Card>

        {/* Combined assessment */}
        {!assessment.empty && (
          <Card>
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-primary" />
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                Circulation summary
              </p>
              <span
                className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-bold ${CONCERN_STYLE[assessment.concern]}`}
              >
                {CONCERN_LABEL[assessment.concern]}
              </span>
            </div>
            <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-ink-soft">
              {assessment.reasons.map((reason) => (
                <li key={reason} className="flex gap-2">
                  <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            {assessment.actions.length > 0 && (
              <div className="mt-2 rounded-xl bg-surface-sunken p-2.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                  What to do
                </p>
                <ul className="mt-1 space-y-1 text-[13px] leading-snug text-ink">
                  {assessment.actions.map((action) => (
                    <li key={action}>• {action}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        <div className="rounded-2xl border border-blue-100 bg-primary-soft p-3.5">
          <div className="flex items-start gap-2 text-sm leading-snug text-ink-soft">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              No video is recorded — the camera image is reduced to colour
              averages on this device and discarded when the reading ends.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-2xl bg-surface-sunken p-3 text-[13px] leading-snug text-ink-soft">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
          <p>
            These camera checks cannot measure blood pressure and cannot rule
            out narrowed arteries. An ankle-brachial index measured with a cuff
            is the test that can.
          </p>
        </div>
      </div>

      <div className="shrink-0 space-y-2 pt-3">
        <Button fullWidth onClick={saveAndContinue}>
          Continue to foot photos <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={goNext}
          className="min-h-[44px] w-full text-center text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          Skip the circulation check
        </button>
      </div>
    </div>
  );
}
