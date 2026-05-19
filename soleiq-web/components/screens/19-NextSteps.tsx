"use client";

import { useState } from "react";
import { Calendar, Mail, FileDown, Share2, LineChart, ShoppingBag } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { useToastStore } from "@/components/ui/toast";
import { ScreenHeader } from "@/components/flow/ScreenContainer";

export function NextSteps() {
  const completeVisit = useSoleiqStore((s) => s.completeVisit);
  const goTo = useSoleiqStore((s) => s.goTo);
  const goNext = useSoleiqStore((s) => s.goNext);
  const showToast = useToastStore((s) => s.show);
  const [open, setOpen] = useState(false);

  const Row = ({
    icon: Icon,
    title,
    body,
    action,
  }: {
    icon: typeof LineChart;
    title: string;
    body: string;
    action: React.ReactNode;
  }) => (
    <Card className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-brand">
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-warmGray-800">{title}</p>
        <p className="text-xs text-warmGray-600">{body}</p>
      </div>
      {action}
    </Card>
  );

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="After the exam"
        title="Document and refer"
        subtitle="Decision support — finalize the plan based on your clinical judgment."
      />
      <div className="space-y-2.5">
        <Row
          icon={LineChart}
          title="Add to patient timeline"
          body="Record this visit for longitudinal comparison."
          action={
            <Button
              size="sm"
              onClick={() => {
                completeVisit();
                showToast("Saved to your timeline.");
                goTo(99);
              }}
            >
              Save
            </Button>
          }
        />
        <Row
          icon={Share2}
          title="Share or refer"
          body="Send a PDF summary to the patient's referring provider, or schedule a vascular/podiatry consult."
          action={
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              Share
            </Button>
          }
        />
        <Row
          icon={ShoppingBag}
          title="Review adjunctive therapy options"
          body="Risk-tiered, evidence-graded, with PAD-specific cautions."
          action={
            <Button size="sm" variant="outline" onClick={goNext}>
              View
            </Button>
          }
        />
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Share results">
        <div className="space-y-2">
          <Button fullWidth variant="outline" onClick={() => { showToast("Email draft prepared."); setOpen(false); }}>
            <Mail className="mr-2 h-4 w-4" /> Email
          </Button>
          <Button fullWidth variant="outline" onClick={() => { showToast("PDF download started."); setOpen(false); }}>
            <FileDown className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button fullWidth variant="outline" onClick={() => { showToast("Connecting to Zocdoc…"); setOpen(false); }}>
            <Calendar className="mr-2 h-4 w-4" /> Zocdoc
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
