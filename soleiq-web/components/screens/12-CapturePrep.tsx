"use client";

import { useState } from "react";
import { Camera, Lightbulb, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import { Checkbox } from "@/components/ui/checkbox";
import { useT } from "@/lib/i18n/I18nProvider";

export function CapturePrep() {
  const d = useT();
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
        eyebrow={d.screens.captureEyebrow}
        title={d.screens.captureTitle}
        subtitle={d.screens.captureSubtitle}
      />
      <div className="-mx-1 flex-1 space-y-2.5 overflow-y-auto px-1 pb-2">
        {items.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary-soft text-secondary">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[15px] font-bold text-ink">{title}</p>
              <p className="mt-0.5 text-[15px] leading-snug text-ink-soft">{body}</p>
            </div>
          </Card>
        ))}
        <div className="rounded-2xl border border-blue-100 bg-primary-soft p-3.5">
          <div className="mb-2 flex items-start gap-2 text-sm leading-snug text-ink-soft">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Foot photos are sensitive health information. They are stored in
              a private Supabase bucket for your history and can be deleted
              from the timeline. Photos are sent only to the configured
              analysis API.
            </p>
          </div>
          <Checkbox
            checked={consented}
            onChange={setConsented}
            label="I consent to storing and analyzing these foot photos."
          />
        </div>
      </div>
      <div className="shrink-0 pt-3">
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
