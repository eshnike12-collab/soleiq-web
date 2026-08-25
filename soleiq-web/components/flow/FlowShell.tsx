"use client";

import { ReactNode } from "react";
import { AppTopBar } from "@/components/chrome/AppTopBar";

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
  // No background of its own: the page ground is on <html>, and painting over
  // it here would hide the cursor grid drawn behind the content. The cream
  // either side of the card is that ground showing through.
  return (
    <div className="flex h-screen w-full flex-col supports-[height:100dvh]:h-[100dvh]">
      {/* The top bar is a flex row of its own rather than an overlay, so the
          flow below still gets a bounded box to size itself against — the
          camera stage depends on that. */}
      <AppTopBar />
      {/* Transparent too, so the ruled ground reads straight through the flow.
          The border still marks the column on wide screens. */}
      <div className="relative mx-auto min-h-0 w-full max-w-2xl flex-1 overflow-hidden md:border-x md:border-slate-200">
        {children}
      </div>
    </div>
  );
}
