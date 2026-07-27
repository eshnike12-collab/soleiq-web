"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
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
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import { buildPatientSummary } from "@/lib/exportSummary";
import { downloadPatientSummaryPdf } from "@/lib/pdfExport";
import { ShareWithDoctorDialog } from "@/components/share/ShareWithDoctorDialog";

type SaveState = "idle" | "saving" | "saved" | "local" | "failed";

export function NextSteps() {
  const completeVisit = useSoleiqStore((s) => s.completeVisit);
  const goNext = useSoleiqStore((s) => s.goNext);
  const showToast = useToastStore((s) => s.show);
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const [failReason, setFailReason] = useState<string | null>(null);

  const saveAndContinue = async () => {
    if (save === "saving" || save === "saved") return;
    setSave("saving");
    setFailReason(null);
    const outcome = await completeVisit();
    if (outcome.status === "saved" || outcome.status === "local") {
      setSave(outcome.status);
      // Brief success beat so the user sees the confirmation, then home.
      setTimeout(() => router.push("/home"), 1200);
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
      <div className="flex h-full flex-col items-center justify-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
          <CheckCircle2 className="h-9 w-9 text-teal-600" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-warmGray-800">
          {save === "saved" ? "Submitted securely" : "Kept on this device"}
        </h1>
        <p className="mt-1 max-w-[260px] text-sm text-warmGray-600">
          {save === "saved"
            ? "Your hospital screening is queued for analysis and clinician review."
            : "This account is not linked to one hospital patient record, so no hospital record was created."}{" "}
          Taking you to your dashboard…
        </p>
        <button
          type="button"
          onClick={() => router.push("/home")}
          className="mt-5 text-sm font-semibold text-brand"
        >
          Go now
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        eyebrow="Check complete"
        title="Save your check"
        subtitle="Keep it in your private history so you and your care team can track changes over time."
      />

      {save === "failed" && (
        <div className="mb-3 rounded-2xl border border-risk-high/30 bg-risk-high/5 p-3 text-xs text-warmGray-800">
          <p className="flex items-center gap-1.5 font-semibold text-risk-high">
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
          className="mt-2 text-center text-xs font-medium text-warmGray-600"
        >
          Continue to dashboard without saving
        </button>
      )}
      <p className="mt-2 text-center text-[11px] text-warmGray-600">
        Saves your four photos and the result to your account.
      </p>

      {/* Secondary actions */}
      <div className="mt-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-warmGray-600">
          More options
        </p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl border border-warmGray-100 bg-white p-3 text-left"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-brand">
              <Share2 className="h-4 w-4" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-warmGray-800">Share or refer</span>
              <span className="block text-xs text-warmGray-600">
                Manage hospital access or download your personal summary.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={goNext}
            className="flex w-full items-center gap-3 rounded-2xl border border-warmGray-100 bg-white p-3 text-left"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-brand">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-warmGray-800">
                Review foot-care options
              </span>
              <span className="block text-xs text-warmGray-600">
                General options only; follow your care team&apos;s advice.
              </span>
            </span>
          </button>
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
        <p className="mt-3 text-[10px] italic text-warmGray-600">
          SoleIQ sharing uses hospital-scoped assignments or expiring,
          patient-controlled consent. It never places clinical data in a URL.
        </p>
      </Dialog>

      <ShareWithDoctorDialog open={doctorOpen} onClose={() => setDoctorOpen(false)} />
    </div>
  );
}
