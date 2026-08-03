"use client";

import { ReactNode } from "react";

/**
 * Responsive container for the guided check flow — replaces the old
 * simulated phone frame (fixed 390x844 bezel + notch).
 *
 * Phones: full-bleed, full viewport height (dvh so mobile browser chrome
 * doesn't cut off the bottom buttons). Desktop: a normal centered content
 * column on the app's soft background — wider than a phone, no mockup.
 * The fixed viewport height matters: the flow screens size themselves with
 * h-full / flex-1 / mt-auto, and the camera stage needs a bounded box.
 */
export function FlowShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen w-full bg-surface supports-[height:100dvh]:h-[100dvh]">
      <div className="relative mx-auto h-full w-full max-w-2xl overflow-hidden bg-surface-raised md:border-x md:border-slate-200">
        {children}
      </div>
    </div>
  );
}
