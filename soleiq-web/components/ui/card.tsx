"use client";

import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-warmGray-50 bg-white p-4 shadow-[0_1px_2px_rgba(28,28,28,0.04)]",
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
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-warmGray-600">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
