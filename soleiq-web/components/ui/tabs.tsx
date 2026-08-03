"use client";

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export function Tabs<T extends string>({
  tabs,
  initial,
  render,
}: {
  tabs: { id: T; label: string }[];
  initial: T;
  render: (id: T) => ReactNode;
}) {
  const [active, setActive] = useState<T>(initial);
  return (
    <div>
      <div className="mb-3 flex gap-1 rounded-2xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "min-h-[44px] flex-1 rounded-xl py-2 text-sm font-bold transition-all duration-150",
              active === t.id
                ? "bg-surface-raised text-primary shadow-card"
                : "text-ink-soft hover:text-ink"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{render(active)}</div>
    </div>
  );
}
