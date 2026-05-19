"use client";

import { useSoleiqStore } from "@/lib/store";
import { ShoeSizeChart } from "@/components/shoe-size/ShoeSizeChart";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/flow/ScreenContainer";

export function ShoeSize() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const profile = useSoleiqStore((s) => s.profile);
  const ready = !!profile.shoeSizeUS;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="Sizing"
        title="Your shoe size"
        subtitle={
          profile.footLengthMm
            ? `≈ ${profile.footLengthMm} mm foot length`
            : "Tap your usual US size."
        }
      />
      <div className="-mx-1 flex-1 overflow-y-auto px-1 pb-2">
        <ShoeSizeChart />
      </div>
      <div className="pt-3">
        <Button fullWidth disabled={!ready} onClick={goNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
