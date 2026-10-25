"use client";

import { MotionConfig } from "framer-motion";
import { ReactNode } from "react";

/**
 * Honours the reader's "reduce motion" setting for every framer-motion
 * animation in the app, rather than each component remembering to ask.
 *
 * `reducedMotion="user"` makes transform and layout animations resolve
 * instantly when the OS asks for less motion, while leaving opacity alone, so
 * a cross-fade still reads as a change of screen without anything sliding.
 * Screens that care about the duration too (ScreenContainer) also check
 * useReducedMotion directly.
 */
export function MotionPrefs({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
