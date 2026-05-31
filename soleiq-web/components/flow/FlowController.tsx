"use client";

import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { useSoleiqStore } from "@/lib/store";
import {
  SCREEN_ORDER,
  TIMELINE_INDEX,
  getScreenForIndex,
  isVisible,
  questionnaireProgress,
} from "@/lib/flow-config";
import { ScreenContainer } from "./ScreenContainer";
import { ProgressDots } from "./ProgressDots";
import { ResetButton } from "./ResetButton";
import { BackButton } from "./BackButton";
import { ToastHost } from "@/components/ui/toast";

export function FlowController() {
  const currentStep = useSoleiqStore((s) => s.currentStep);
  const direction = useSoleiqStore((s) => s.direction);
  const profile = useSoleiqStore((s) => s.profile);
  const goTo = useSoleiqStore((s) => s.goTo);
  const goBack = useSoleiqStore((s) => s.goBack);
  const goNext = useSoleiqStore((s) => s.goNext);
  const setStep = useSoleiqStore((s) => s.setStep);
  const updateProfile = useSoleiqStore((s) => s.updateProfile);

  // ?step=<id> shortcut for quick demos — jumps straight to a screen by id and
  // pre-seeds any conditions the target screen requires (e.g. diabetes for the
  // glucose dropdown). Runs once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const stepId = params.get("step");
    if (!stepId) return;
    const idx = SCREEN_ORDER.findIndex((s) => s.id === stepId);
    if (idx === -1) return;
    if (
      stepId === "diabetes_details" ||
      stepId === "glucose_markers" ||
      stepId === "vascular_pad"
    ) {
      updateProfile({ conditions: ["diabetes"] });
    }
    goTo(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global keyboard navigation: ← back, → next. Suppressed when typing into an
  // input/textarea/select/contenteditable so we don't hijack form editing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable
      ) {
        return;
      }
      // Block forward navigation while analysis is running so the user can't
      // accidentally skip past the Results screen.
      const onProcessing =
        SCREEN_ORDER[currentStep]?.id === "processing";
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      } else if (e.key === "ArrowRight" && !onProcessing) {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack, goNext, currentStep]);

  // Skip hidden conditional screens automatically.
  useEffect(() => {
    if (currentStep === TIMELINE_INDEX) return;
    if (currentStep >= SCREEN_ORDER.length) return;
    if (!isVisible(currentStep, profile)) {
      const dir = direction === "back" ? -1 : 1;
      let next = currentStep + dir;
      while (
        next > 0 &&
        next < SCREEN_ORDER.length &&
        !isVisible(next, profile)
      ) {
        next += dir;
      }
      // setStep — internal jump, do NOT push history (would break back-stack).
      setStep(Math.max(0, Math.min(next, SCREEN_ORDER.length - 1)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, profile]);

  const def = getScreenForIndex(currentStep);
  const Screen = def?.component;
  const progress = questionnaireProgress(currentStep);

  return (
    <div className="relative h-full w-full">
      <BackButton />
      <ResetButton />
      <AnimatePresence mode="wait" initial={false}>
        <ScreenContainer key={currentStep} direction={direction}>
          {progress && (
            <div className="-mt-2 mb-2">
              <ProgressDots total={progress.total} current={progress.current} />
            </div>
          )}
          {Screen ? <Screen /> : <FallbackEnd />}
        </ScreenContainer>
      </AnimatePresence>
      <ToastHost />
    </div>
  );
}

function FallbackEnd() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-warmGray-600">End of demo flow.</p>
    </div>
  );
}
