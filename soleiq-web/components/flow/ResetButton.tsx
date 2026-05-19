"use client";

import { RotateCcw } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";

export function ResetButton() {
  const reset = useSoleiqStore((s) => s.reset);
  return (
    <button
      onClick={reset}
      className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-warmGray-50 text-warmGray-600 hover:bg-warmGray-100"
      aria-label="Reset demo"
      title="Reset demo"
    >
      <RotateCcw className="h-4 w-4" />
    </button>
  );
}
