"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { DisclaimerFooter } from "./DisclaimerFooter";

export function ScreenContainer({
  children,
  direction = "forward",
}: {
  children: ReactNode;
  direction?: "forward" | "back";
}) {
  const x = direction === "forward" ? 36 : -36;
  return (
    <motion.section
      initial={{ x, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -x, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-full min-h-0 w-full flex-col"
    >
      {/* The flow shell is a fixed 100dvh box, so whatever a screen renders
          past the fold used to be unreachable — no scrollbar, no touch
          scrolling, Continue button lost. Screens still size themselves to
          fit (h-full / flex-1 / mt-auto); this is the safety net for when
          they can't: short phones, landscape, large accessibility text. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-2 pt-6 sm:px-8 sm:pt-8">
        <div className="flex min-h-0 flex-1 flex-col [&>*]:min-h-0">
          {children}
        </div>
      </div>
      <DisclaimerFooter />
    </motion.section>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  return (
    <header className="mb-5 shrink-0">
      {eyebrow && (
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
          {eyebrow}
        </p>
      )}
      <h1 className="screen-h1">{title}</h1>
      {subtitle && <p className="screen-sub">{subtitle}</p>}
    </header>
  );
}

/**
 * Vertically centred screen (splash, spinner, confirmation).
 *
 * Auto margins instead of justify-center on purpose: when the content is
 * taller than the box the auto margins collapse to 0 and everything stays
 * reachable by scrolling, whereas justify-center pushes the top of the
 * content above the scroll origin where it can never be scrolled back to.
 */
export function CenteredScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="my-auto flex w-full flex-col items-center py-2 text-center">
        {children}
      </div>
    </div>
  );
}
