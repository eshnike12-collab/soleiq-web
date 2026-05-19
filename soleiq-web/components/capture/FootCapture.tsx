"use client";

import { useState } from "react";
import type { CaptureView, FootSide } from "@/lib/types";
import { CaptureFrame } from "./CaptureFrame";
import { useSoleiqStore } from "@/lib/store";

const VIEWS: CaptureView[] = ["top", "sole", "heel", "between_toes"];

export function FootCapture({ side }: { side: FootSide }) {
  const goNext = useSoleiqStore((s) => s.goNext);
  const [idx, setIdx] = useState(0);

  const onCaptured = () => {
    if (idx < VIEWS.length - 1) {
      setIdx(idx + 1);
    } else {
      goNext();
    }
  };

  return (
    <CaptureFrame
      key={`${side}-${VIEWS[idx]}`}
      side={side}
      view={VIEWS[idx]}
      onCaptured={onCaptured}
      step={{ current: idx + 1, total: VIEWS.length }}
    />
  );
}
