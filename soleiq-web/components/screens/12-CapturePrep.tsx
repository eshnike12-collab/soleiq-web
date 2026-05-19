"use client";

import { Camera, Lightbulb, Ruler } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScreenHeader } from "@/components/flow/ScreenContainer";

export function CapturePrep() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const startVisit = useSoleiqStore((s) => s.startVisit);

  const items = [
    {
      icon: Camera,
      title: "Patient's feet bare",
      body: "Remove socks and any wraps before scanning.",
    },
    {
      icon: Lightbulb,
      title: "Even clinic lighting",
      body: "Avoid harsh overhead shadows; angle lamp if needed.",
    },
    {
      icon: Ruler,
      title: "Hold device ~12 inches away",
      body: "Brace your elbow to keep the frame steady through capture.",
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="Capture"
        title="Begin foot exam"
        subtitle="You'll capture both feet — four 2D views and a 3D scan per side. About 90 seconds per foot."
      />
      <div className="space-y-2.5">
        {items.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-brand">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-warmGray-800">{title}</p>
              <p className="text-xs text-warmGray-600">{body}</p>
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-auto pt-4">
        <Button
          fullWidth
          onClick={() => {
            startVisit();
            goNext();
          }}
        >
          Start with patient's right foot
        </Button>
      </div>
    </div>
  );
}
