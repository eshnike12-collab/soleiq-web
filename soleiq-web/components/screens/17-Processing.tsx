"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Footprints, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { useSoleiqStore } from "@/lib/store";
import { analyzeFootPhotos, PhotoRetakeError } from "@/lib/analyzeFootPhotos";
import { SCREEN_ORDER } from "@/lib/flow-config";
import { Button } from "@/components/ui/button";
import { CenteredScreen } from "@/components/flow/ScreenContainer";

export function Processing() {
  const visit = useSoleiqStore((state) => state.currentVisit);
  const profile = useSoleiqStore((state) => state.profile);
  const setResult = useSoleiqStore((state) => state.setResult);
  const setProcessing = useSoleiqStore((state) => state.setProcessing);
  const goNext = useSoleiqStore((state) => state.goNext);
  const goTo = useSoleiqStore((state) => state.goTo);
  const [issues, setIssues] = useState<string[]>([]);
  /**
   * Whether the photos are the problem, or the service is.
   *
   * These are completely different failures and they used to render
   * identically: anything that went wrong said "Retake needed", blamed the
   * photos, and offered only "Review and retake photos". When the analysis
   * service itself was unavailable, that sent the patient round a loop of
   * retaking perfectly good photographs, none of which could ever work.
   */
  const [kind, setKind] = useState<"retake" | "service">("retake");
  /* Bumped by "Try again", which is what actually re-runs the effect below.
     Clearing the ref alone did nothing: the effect's dependency list was
     empty, so it never ran a second time. */
  const [attempt, setAttempt] = useState(0);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !visit) return;
    ran.current = true;
    setProcessing(true);
    analyzeFootPhotos(visit, profile)
      .then((result) => {
        setResult(result);
        setProcessing(false);
        goNext();
      })
      .catch((reason) => {
        setProcessing(false);
        if (reason instanceof PhotoRetakeError) {
          setKind("retake");
          setIssues(reason.reasons);
          return;
        }
        setKind("service");
        setIssues([
          reason instanceof Error ? reason.message : "The photo check failed.",
        ]);
      });
    // One request per attempt, including React Strict Mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  if (issues.length > 0) {
    const captureStep = SCREEN_ORDER.findIndex((screen) => screen.id === "right_foot");
    const serviceDown = kind === "service";
    return (
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0">
          <p
            className={`text-[11px] font-bold uppercase tracking-[0.12em] ${
              serviceDown ? "text-warn" : "text-urgent"
            }`}
          >
            {serviceDown ? "Try again shortly" : "Retake needed"}
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold text-ink">
            <AlertTriangle
              className={`h-5 w-5 ${serviceDown ? "text-warn" : "text-urgent"}`}
            />
            {serviceDown
              ? "We could not finish this check"
              : "We cannot check these photos yet"}
          </h1>
          <p className="mt-1 text-[15px] leading-snug text-ink-soft">
            {serviceDown
              ? "Your photos are fine — the service that reads them is unavailable right now. Nothing is wrong with what you took."
              : "A careful result needs clear photos. No screening result was generated."}
          </p>
        </header>
        <div className="-mx-1 mt-4 flex-1 overflow-y-auto px-1 pb-2">
          <div
            className={`rounded-2xl border p-3.5 ${
              serviceDown
                ? "border-amber-200 bg-warn-soft"
                : "border-red-200 bg-urgent-soft"
            }`}
          >
            <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-snug text-ink">
              {issues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          </div>
        </div>
        <div className="shrink-0 space-y-2 pt-3">
          {serviceDown ? (
            <>
              {/* Retrying the SAME photos is the useful action here. Sending
                  someone back to the camera cannot help when the camera was
                  never the problem. */}
              <Button
                fullWidth
                onClick={() => {
                  ran.current = false;
                  setIssues([]);
                  setAttempt((n) => n + 1);
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Try again
              </Button>
              <Button
                fullWidth
                variant="outline"
                onClick={() => goTo(captureStep)}
              >
                Review my photos
              </Button>
            </>
          ) : (
            <Button fullWidth onClick={() => goTo(captureStep)}>
              <RotateCcw className="mr-2 h-4 w-4" /> Review and retake photos
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <CenteredScreen>
      <motion.div
        className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-soft"
        animate={{ scale: [1, 1.06, 1], opacity: [1, 0.85, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Footprints className="h-10 w-10 text-primary" />
      </motion.div>
      <h1 className="mt-6 text-xl font-bold text-ink">Checking all four photos</h1>
      <p className="mt-2 max-w-[300px] text-[15px] leading-relaxed text-ink-soft">
        First we check photo quality, then visible skin and nail concerns. Photos cannot show problems beneath the skin.
      </p>
    </CenteredScreen>
  );
}
