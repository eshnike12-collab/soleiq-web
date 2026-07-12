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
      className="relative flex h-full min-h-0 w-full flex-col px-6 pt-7"
    >
      <div className="flex min-h-0 flex-1 flex-col [&>*]:min-h-0">
        {children}
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
    <header className="mb-5">
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
