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
      <div className="mb-3 flex gap-1 rounded-xl bg-warmGray-50 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
              active === t.id
                ? "bg-white text-brand shadow-sm"
                : "text-warmGray-600"
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
