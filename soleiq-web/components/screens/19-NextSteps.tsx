"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileDown,
  Loader2,
  Share2,
  ShoppingBag,
  Stethoscope,
} from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToastStore } from "@/components/ui/toast";
import { CenteredScreen, ScreenHeader } from "@/components/flow/ScreenContainer";
import { buildPatientSummary } from "@/lib/exportSummary";
import { downloadPatientSummaryPdf } from "@/lib/pdfExport";
import { ShareWithDoctorDialog } from "@/components/share/ShareWithDoctorDialog";
import { useT } from "@/lib/i18n/I18nProvider";

type SaveState = "idle" | "saving" | "saved" | "local" | "failed";

export function NextSteps() {
  const d = useT();
  const completeVisit = useSoleiqStore((s) => s.completeVisit);
  const goNext = useSoleiqStore((s) => s.goNext);
  const showToast = useToastStore((s) => s.show);
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const [failReason, setFailReason] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [analysisPending, setAnalysisPending] = useState(false);

  const saveAndContinue = async () => {
    if (save === "saving" || save === "saved") return;
    setSave("saving");
    setFailReason(null);
    const outcome = await completeVisit();
    if (outcome.status === "saved" || outcome.status === "local") {
      setSave(outcome.status);
      setReportId(outcome.reportId ?? null);
      setAnalysisPending(outcome.analysisPending ?? false);
      // Straight to the finished report when analysis completed inline;
      // otherwise a brief success beat, then home.
      setTimeout(
        () =>
          router.push(
            outcome.status === "saved" && outcome.reportId
              ? `/records/${outcome.reportId}`
              : "/home"
          ),
        1400
      );
    } else {
      setSave("failed");
      setFailReason(outcome.reason ?? null);
    }
  };

  const buildSummary = () => {
    const { currentVisit, profile } = useSoleiqStore.getState();
    return buildPatientSummary(currentVisit, profile);
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
    setShareOpen(false);
  };

  // ----- Success state: full-screen confirmation, then auto-redirect -------
  if (save === "saved" || save === "local") {
    return (
      <CenteredScreen>
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="h-9 w-9 text-success" />
        </span>
        <h1 className="mt-4 text-2xl font-bold text-ink">
          {save === "saved" ? "Submitted securely" : "Kept on this device"}
        </h1>
        <p className="mt-2 max-w-[280px] text-[15px] leading-relaxed text-ink-soft">
          {save === "local"
            ? "This account is not linked to one hospital patient record, so no hospital record was created."
            : analysisPending
              ? "Your photos are stored safely. The reading is still being prepared and will appear in your history shortly."
              : "Your results and photos are available to you and your care team right away; a clinician will also review them."}{" "}
          Taking you to your dashboard…
        </p>
        <button
          type="button"
          onClick={() =>
            router.push(
              save === "saved" && reportId ? `/records/${reportId}` : "/home"
            )
          }
          className="mt-4 inline-flex min-h-[44px] items-center rounded-xl px-4 text-[15px] font-bold text-primary"
        >
          {save === "saved" && reportId ? "View my full report now" : "Go now"}
        </button>
      </CenteredScreen>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow={d.screens.nextStepsEyebrow}
        title={d.screens.nextStepsTitle}
        subtitle={d.screens.nextStepsSubtitle}
      />

      <div className="-mx-1 flex-1 overflow-y-auto px-1 pb-2">
        {save === "failed" && (
          <div className="mb-3 rounded-2xl border border-urgent/25 bg-urgent-soft p-3.5 text-sm leading-relaxed text-ink">
            <p className="flex items-center gap-1.5 font-bold text-urgent">
              <AlertTriangle className="h-4 w-4" /> Couldn&apos;t save to your account
            </p>
            <p className="mt-1">
              {failReason
                ? `Couldn't save: ${failReason}`
                : "The save request failed. Try again in a moment."}{" "}
              Your result stays on this device either way.
            </p>
          </div>
        )}

        {/* Primary action */}
        <Button fullWidth size="lg" disabled={save === "saving"} onClick={saveAndContinue}>
          {save === "saving" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : save === "failed" ? (
            "Try saving again"
          ) : (
            "Save and continue"
          )}
        </Button>
        {save === "failed" && (
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="mt-1 min-h-[44px] text-center text-sm font-semibold text-ink-soft"
          >
            Continue to dashboard without saving
          </button>
        )}
        <p className="mt-2 text-center text-xs text-ink-faint">
          Saves your four photos and the result to your account.
        </p>

        {/* Secondary actions */}
        <div className="mt-6">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
            More options
          </p>
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-surface-raised p-4 text-left shadow-card transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Share2 className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-ink">Share or refer</span>
                <span className="mt-0.5 block text-sm text-ink-faint">
                  Manage hospital access or download your personal summary.
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-ink-faint" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-surface-raised p-4 text-left shadow-card transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <ShoppingBag className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold text-ink">
                  Review foot-care options
                </span>
                <span className="mt-0.5 block text-sm text-ink-faint">
                  General options only; follow your care team&apos;s advice.
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-ink-faint" />
            </button>
          </div>
        </div>
      </div>

      <Dialog open={shareOpen} onClose={() => setShareOpen(false)} title="Share results">
        <div className="space-y-2">
          <Button
            fullWidth
            onClick={() => {
              setShareOpen(false);
              setDoctorOpen(true);
            }}
          >
            <Stethoscope className="mr-2 h-4 w-4" /> Share with my doctor in SoleIQ
          </Button>
          <Button fullWidth variant="outline" onClick={downloadPdf}>
            <FileDown className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          SoleIQ sharing uses hospital-scoped assignments or expiring,
          patient-controlled consent. It never places clinical data in a URL.
        </p>
      </Dialog>

      <ShareWithDoctorDialog open={doctorOpen} onClose={() => setDoctorOpen(false)} />
    </div>
  );
}
