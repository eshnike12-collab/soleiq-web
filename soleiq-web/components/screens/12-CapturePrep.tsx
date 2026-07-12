"use client";

import { useState } from "react";
import { Camera, Lightbulb, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import { Checkbox } from "@/components/ui/checkbox";

export function CapturePrep() {
  const goNext = useSoleiqStore((s) => s.goNext);
  const startVisit = useSoleiqStore((s) => s.startVisit);
  const [consented, setConsented] = useState(false);

  const items = [
    {
      icon: Camera,
      title: "Patient's feet bare",
      body: "Remove socks and any wraps. Clean and dry both feet first.",
    },
    {
      icon: Lightbulb,
      title: "Bright, even lighting",
      body: "Use a plain background. Avoid flash, glare, and strong shadows.",
    },
    {
      icon: ImageIcon,
      title: "Show the whole foot",
      body: "Keep every toe and the heel in frame. Hold still and focus before taking the photo.",
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="Capture"
        title="Begin foot exam"
        subtitle="Take or upload four color photos: the top and sole of each foot. You can retake any photo before the check."
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
      <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
        <div className="mb-2 flex items-start gap-2 text-xs text-warmGray-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p>
            Foot photos are sensitive health information. They are stored in a
            private Supabase bucket for your history and can be deleted from
            the timeline. Photos are sent only to the configured analysis API.
          </p>
        </div>
        <Checkbox
          checked={consented}
          onChange={setConsented}
          label="I consent to storing and analyzing these foot photos."
        />
      </div>
      <div className="mt-auto pt-4">
        <Button
          fullWidth
          disabled={!consented}
          onClick={() => {
            startVisit();
            goNext();
          }}
        >
          Start four-photo check
        </Button>
      </div>
    </div>
  );
}
