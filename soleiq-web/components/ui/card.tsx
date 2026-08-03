"use client";

import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-100 bg-surface-raised p-4 shadow-card",
        className
      )}
      {...rest}
    />
  );
}

export function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      {title && (
        <h2 className="text-[13px] font-bold text-ink-soft">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
