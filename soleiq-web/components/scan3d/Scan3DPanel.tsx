"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { OrbitSweepCapture } from "./OrbitSweepCapture";
import { FOOT_AI_BASE_URL, bankKeyFor } from "@/lib/scan3d/scanClient";
import type { FootSide } from "@/lib/types";

// three/R3F touch `window` on import, and the bundle is large. Loading it
// only in the browser and only once a model exists keeps it off the critical
// path for a patient who is just here to scan.
const Foot3DViewer = dynamic(
  () => import("./Foot3DViewer").then((m) => m.Foot3DViewer),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-square w-full animate-pulse rounded-3xl bg-surface-sunken" />
    ),
  }
);

export function Scan3DPanel({ patientId }: { patientId: string }) {
  const [side, setSide] = useState<FootSide>("right");
  const [scanId, setScanId] = useState<string | null>(null);

  // One bank per foot, so the left foot's frames never pool with the right's.
  const bankId = bankKeyFor(patientId, side);
  const glbUrl = scanId
    ? `${FOOT_AI_BASE_URL}/scans/${scanId}/artifact/model.glb`
    : null;

  const tab = (value: FootSide, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => {
        setSide(value);
        setScanId(null);
      }}
      aria-pressed={side === value}
      className={`min-h-[44px] flex-1 rounded-2xl px-4 py-2 text-sm font-bold transition-colors ${
        side === value
          ? "bg-primary text-white shadow-button"
          : "bg-surface-sunken text-ink-soft hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {tab("left", "Left foot")}
        {tab("right", "Right foot")}
      </div>

      <OrbitSweepCapture
        key={side}
        side={side}
        bankId={bankId}
        onComplete={setScanId}
      />

      {scanId && (
        <section className="rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card">
          <h2 className="font-bold text-ink">Your 3D model</h2>
          <p className="mt-1 text-[15px] text-ink-soft">
            Drag to rotate, scroll to zoom.
          </p>
          <div className="mt-4">
            <Foot3DViewer glbUrl={glbUrl} />
          </div>
        </section>
      )}
    </div>
  );
}
