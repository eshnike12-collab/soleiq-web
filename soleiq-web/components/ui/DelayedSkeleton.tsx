"use client";

import { useEffect, useState } from "react";

/** Nothing is shown before this; below it a transition reads as instant. */
const APPEAR_AFTER_MS = 150;

/**
 * A placeholder that only appears if the wait turns out to be real.
 *
 * A loader that appears the moment a transition starts makes a fast app feel
 * slower than showing nothing at all: the eye catches the flash, and a flash
 * reads as a stall. So this renders nothing for the first 150ms and only then
 * draws a shape. Waits shorter than that — which is now most of them — never
 * show anything.
 *
 * It is a skeleton rather than a spinner on purpose. A spinner says "something
 * is happening"; a skeleton says "this is what is arriving, and roughly where
 * it will be", so the layout does not jump when the content lands.
 */
export function DelayedSkeleton({ label }: { label?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), APPEAR_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="flex min-h-screen w-full flex-col"
      // Announced as busy so a screen reader says the page is loading even
      // though there is deliberately nothing to read yet.
      role="status"
      aria-busy="true"
      aria-label={label ?? "Loading"}
    >
      {/* Shaped like the app's own chrome: a top bar, a title, then cards. */}
      <div className="h-14 w-full border-b border-slate-200 bg-surface-raised" />
      <div className="mx-auto w-full max-w-2xl flex-1 px-5 pt-8 sm:px-8">
        <div className="h-3 w-24 rounded-full bg-slate-200" />
        <div className="mt-4 h-7 w-3/5 rounded-lg bg-slate-200" />
        <div className="mt-3 h-4 w-4/5 rounded-md bg-slate-100" />
        <div className="mt-7 space-y-3">
          <div className="h-20 w-full rounded-2xl bg-slate-100" />
          <div className="h-20 w-full rounded-2xl bg-slate-100" />
          <div className="h-20 w-full rounded-2xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
