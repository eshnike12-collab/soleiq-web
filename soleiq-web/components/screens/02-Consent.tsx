"use client";

import { useState } from "react";
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
      <div className="mt-auto pt-4">
        <Button fullWidth disabled={!ready} onClick={goNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
