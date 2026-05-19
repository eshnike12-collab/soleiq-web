"use client";

import { useSoleiqStore } from "@/lib/store";
import { PRESSURE_POINTS } from "./pressurePoints";
import { cn } from "@/lib/utils";

export function PainMap() {
  const profile = useSoleiqStore((s) => s.profile);
  const updateProfile = useSoleiqStore((s) => s.updateProfile);
  const selected = new Set(profile.painPoints ?? []);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    updateProfile({ painPoints: Array.from(next) });
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {(["right", "left"] as const).map((side) => (
        <div key={side} className="relative aspect-[1/2] rounded-2xl bg-warmGray-50 p-2">
          <p className="text-center text-xs uppercase text-warmGray-600">
            {side}
          </p>
          <svg viewBox="0 0 100 200" className="h-full w-full">
            <FootSilhouette mirror={side === "left"} />
            {PRESSURE_POINTS.filter((p) => p.side === side).map((p) => {
              const active = selected.has(p.id);
              return (
                <g
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={p.x * 100}
                    cy={p.y * 200}
                    r={5}
                    className={cn(
                      "transition-colors",
                      active ? "fill-risk-high" : "fill-teal-600"
                    )}
                    opacity={0.85}
                  >
                    {!active && (
                      <animate
                        attributeName="r"
                        values="4;6;4"
                        dur="1.6s"
                        repeatCount="indefinite"
                      />
                    )}
                  </circle>
                </g>
              );
            })}
          </svg>
        </div>
      ))}
    </div>
  );
}

function FootSilhouette({ mirror }: { mirror: boolean }) {
  return (
    <g transform={mirror ? "translate(100,0) scale(-1,1)" : ""}>
      <path
        d="M 50 12
           C 70 12, 78 30, 76 60
           C 76 90, 80 120, 70 160
           C 64 188, 36 188, 30 160
           C 20 120, 24 90, 24 60
           C 22 30, 30 12, 50 12 Z"
        fill="#F1EFE8"
        stroke="#D3D1C7"
        strokeWidth="1"
      />
    </g>
  );
}
