"use client";

import { useState } from "react";
import {
  Mail,
  FileDown,
  Share2,
  LineChart,
  ShoppingBag,
  Stethoscope,
} from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { useToastStore } from "@/components/ui/toast";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import {
  buildPatientSummary,
  encodeSummaryToUrl,
  summaryToEmailBody,
} from "@/lib/exportSummary";
import { downloadPatientSummaryPdf } from "@/lib/pdfExport";

export function NextSteps() {
  const completeVisit = useSoleiqStore((s) => s.completeVisit);
  const goTo = useSoleiqStore((s) => s.goTo);
  const goNext = useSoleiqStore((s) => s.goNext);
  const showToast = useToastStore((s) => s.show);
  const [open, setOpen] = useState(false);

  const buildSummary = () => {
    const { currentVisit, profile } = useSoleiqStore.getState();
    return buildPatientSummary(currentVisit, profile);
  };

  const sendEmail = () => {
    const s = buildSummary();
    if (!s) {
      showToast("No analysis available to share yet.");
      return;
    }
    const subject = `SoleIQ — Foot Risk Screening${s.patient.fullName ? ` — ${s.patient.fullName}` : ""}`;
    const clinicalUrl = `${window.location.origin}/clinical?data=${encodeSummaryToUrl(s)}`;
    const body =
      summaryToEmailBody(s) +
      `\n\nFull clinical view:\n${clinicalUrl}\n`;
    // Open the OS mail composer with subject + body pre-filled. User reviews
    // and sends. (mailto cannot auto-send without an SMTP backend.)
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    showToast("Email draft prepared.");
    setOpen(false);
  };

  const downloadPdf = async () => {
    const s = buildSummary();
    if (!s) {
      showToast("No analysis available to share yet.");
      return;
    }
    try {
      await downloadPatientSummaryPdf(s);
      showToast("PDF downloaded.");
    } catch (e) {
      showToast("PDF generation failed.");
      console.error(e);
    }
    setOpen(false);
  };

  const openClinicalView = () => {
    const s = buildSummary();
    if (!s) {
      showToast("No analysis available to share yet.");
      return;
    }
    const url = `${window.location.origin}/clinical?data=${encodeSummaryToUrl(s)}`;
    window.open(url, "_blank", "noopener");
    showToast("Clinical view opened.");
    setOpen(false);
  };

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
          body="Email a summary, download a PDF, or open the doctor's clinical view."
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
          <Button fullWidth variant="outline" onClick={sendEmail}>
            <Mail className="mr-2 h-4 w-4" /> Email — opens your mail client
          </Button>
          <Button fullWidth variant="outline" onClick={downloadPdf}>
            <FileDown className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <Button fullWidth onClick={openClinicalView}>
            <Stethoscope className="mr-2 h-4 w-4" /> Send to your doctor
          </Button>
        </div>
        <p className="mt-3 text-[10px] italic text-warmGray-600">
          The doctor's view opens in a new tab with a shareable link. Copy the
          URL from the address bar to send it to your provider.
        </p>
      </Dialog>
    </div>
  );
}
