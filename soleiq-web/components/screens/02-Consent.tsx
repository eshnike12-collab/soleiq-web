"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScreenHeader } from "@/components/flow/ScreenContainer";

export function Consent() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [c, setC] = useState(false);
  const ready = a && b && c;
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="Step 1"
        title="Patient consent"
        subtitle="Confirm with the patient that they agree to each of the following before continuing."
      />
      <div className="-mx-1 flex-1 overflow-y-auto px-1 pb-2">
        <div className="rounded-3xl bg-surface-sunken p-3">
          <div className="mb-2.5 flex items-center gap-2 px-1 pt-1">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary-soft">
              <ShieldCheck className="h-[18px] w-[18px] text-secondary" />
            </span>
            <p className="text-[13px] font-bold text-ink-soft">
              The patient agrees to each of these
            </p>
          </div>
          <div className="space-y-2.5">
            <Checkbox
              checked={a}
              onChange={setA}
              label="Patient consents to providing health and demographic information."
            />
            <Checkbox
              checked={b}
              onChange={setB}
              label="Patient consents to photo and 3D scan capture of their feet."
            />
            <Checkbox
              checked={c}
              onChange={setC}
              label="Patient understands AI analysis is decision support, not a diagnosis."
            />
          </div>
        </div>
      </div>
      <div className="shrink-0 pt-3">
        <Button fullWidth disabled={!ready} onClick={goNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
