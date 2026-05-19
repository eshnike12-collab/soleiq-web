"use client";

import { CheckCircle2, Camera, Box } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScreenHeader } from "@/components/flow/ScreenContainer";

export function RightFootComplete() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const visit = useSoleiqStore((s) => s.currentVisit);

  const rightImages =
    visit?.images.filter((i) => i.side === "right").length ?? 0;
  const rightMesh = visit?.meshes.find((m) => m.side === "right");
  const meshOk = !!rightMesh?.heightmap?.silhouettePx;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="Halfway there"
        title="Right foot complete"
        subtitle="Confirm the right-foot capture looks complete before starting the left."
      />

      <div className="space-y-2.5">
        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
            <Camera className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-warmGray-800">
              2D captures
            </p>
            <p className="text-xs text-warmGray-600">
              Top, sole, heel, between toes
            </p>
          </div>
          <span className="text-sm font-semibold text-teal-800">
            {rightImages} / 4
          </span>
        </Card>

        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
            <Box className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-warmGray-800">
              3D foot mesh
            </p>
            <p className="text-xs text-warmGray-600">
              {meshOk
                ? "Reconstructed from camera input"
                : "Captured (low-confidence — consider rescanning)"}
            </p>
          </div>
          <CheckCircle2
            className={`h-5 w-5 ${
              meshOk ? "text-teal-600" : "text-amber-600"
            }`}
          />
        </Card>

        <Card className="bg-blue-50/60">
          <p className="text-sm font-medium text-warmGray-800">
            Before continuing
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-warmGray-600">
            <li>Have the patient rest the right foot.</li>
            <li>Reposition for a clear view of the left foot.</li>
            <li>Adjust lighting if shadows have shifted.</li>
          </ul>
        </Card>
      </div>

      <div className="mt-auto pt-4">
        <Button fullWidth size="lg" onClick={goNext}>
          Start left foot scan
        </Button>
      </div>
    </div>
  );
}
