"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Check, ImagePlus, Loader2, RotateCcw, SkipForward, X } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { prepareFootPhoto } from "@/lib/photoQuality";
import type { CaptureView, FootSide } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { LiveCamera } from "./LiveCamera";
import { PhotoGuideAnimation } from "./PhotoGuideAnimation";

const SHOTS: {
  side: FootSide;
  view: Extract<CaptureView, "top" | "sole">;
  title: string;
  hint: string;
}[] = [
  {
    side: "right",
    view: "top",
    title: "Right foot — TOP",
    hint: "Toenails facing the camera. Point straight down; show every toe, the sides, and the ankle.",
  },
  {
    side: "right",
    view: "sole",
    title: "Right foot — SOLE",
    hint: "Bottom of the foot facing the camera (no toenails visible). Rest the foot up, use a mirror, or ask a helper.",
  },
  {
    side: "left",
    view: "top",
    title: "Left foot — TOP",
    hint: "Toenails facing the camera. Same lighting, background, and distance as the right foot.",
  },
  {
    side: "left",
    view: "sole",
    title: "Left foot — SOLE",
    hint: "Bottom of the foot facing the camera, heel to every toe. Ask a helper if needed.",
  },
];

/**
 * Reasons a view might not be photographable, offered as one tap each.
 *
 * Presets rather than a free-text box because the common cases are few and
 * typing on a phone with one hand while holding a foot is not realistic. The
 * reason is optional in every case — nobody is blocked from skipping by
 * declining to explain why.
 */
const SKIP_REASONS = [
  "Limb amputated",
  "Can't reach or position it",
  "Bandaged or dressed",
  "Prefer not to",
] as const;

/** Human-friendly slot label, e.g. "Right foot · top". Display only. */
const slotLabel = (side: FootSide, view: "top" | "sole") =>
  `${side === "right" ? "Right" : "Left"} foot · ${view === "top" ? "top" : "sole"}`;

export function FourPhotoCapture() {
  const visit = useSoleiqStore((state) => state.currentVisit);
  const addImage = useSoleiqStore((state) => state.addImage);
  const skipSlot = useSoleiqStore((state) => state.skipSlot);
  const unskipSlot = useSoleiqStore((state) => state.unskipSlot);
  const goNext = useSoleiqStore((state) => state.goNext);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  // Advisories from the quality check. Never block submission.
  const [notes, setNotes] = useState<string[]>([]);
  const lastSource = useRef<"camera" | "upload">("camera");
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const reviewing = index === SHOTS.length;
  const shot = SHOTS[Math.min(index, SHOTS.length - 1)];
  const images = visit?.images ?? [];
  const skipped = visit?.skippedSlots ?? [];
  const current = images.find(
    (image) => image.side === shot.side && image.view === shot.view
  );
  const isSkipped = (side: FootSide, view: "top" | "sole") =>
    skipped.some((slot) => slot.side === side && slot.view === view);
  const skipReason = (side: FootSide, view: "top" | "sole") =>
    skipped.find((slot) => slot.side === side && slot.view === view)?.reason;
  const captured = SHOTS.filter(({ side, view }) =>
    images.some(
      (image) =>
        image.side === side && image.view === view && image.quality?.passed
    )
  );
  // Every slot must be resolved — photographed or deliberately skipped — and
  // at least one has to be a real photo. Skipping all four would produce a
  // report about nothing.
  const complete =
    captured.length > 0 &&
    SHOTS.every(
      ({ side, view }) =>
        isSkipped(side, view) ||
        images.some(
          (image) =>
            image.side === side && image.view === view && image.quality?.passed
        )
    );

  const choosePhoto = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setNotes([]);
    try {
      const prepared = await prepareFootPhoto(file);
      if (!prepared.quality.passed) {
        setError(prepared.quality.issues.join(" "));
        setNotes([]);
        return;
      }
      // Kept, with its caveats attached rather than as a reason to refuse it.
      setNotes(prepared.quality.notes);
      addImage({
        side: shot.side,
        view: shot.view,
        dataUrl: prepared.dataUrl,
        capturedAt: Date.now(),
        quality: prepared.quality,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read this photo.");
    } finally {
      setBusy(false);
    }
  };

  const confirmSkip = (reason?: string) => {
    setError(null);
    setSkipOpen(false);
    setCameraOpen(false);
    skipSlot(shot.side, shot.view, reason);
    setIndex((value) => value + 1);
  };

  const retry = () => {
    setError(null);
    if (lastSource.current === "upload") {
      // A button tap is a user gesture, so programmatically reopening the
      // picker is allowed.
      uploadInputRef.current?.click();
    } else {
      setCameraOpen(true);
    }
  };

  const handleCameraCapture = useCallback((file: File) => {
    lastSource.current = "camera";
    setCameraOpen(false);
    void choosePhoto(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shot.side, shot.view]);

  const handleCameraUnavailable = useCallback((message: string) => {
    setCameraOpen(false);
    setError(message);
  }, []);

  if (reviewing) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <header className="mb-3 shrink-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
            Review photos
          </p>
          <h1 className="text-xl font-bold text-ink">
            {skipped.length > 0
              ? `${captured.length} of ${SHOTS.length} views`
              : "All four views"}
          </h1>
          <p className="mt-1 text-[15px] leading-snug text-ink-soft">
            {skipped.length > 0
              ? "Skipped views are left out of your report entirely — nothing is guessed for them."
              : "Check that each photo shows the whole foot in focus. Retake anything unclear."}
          </p>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2.5 overflow-y-auto pb-2">
          {SHOTS.map((item, shotIndex) => {
            const image = images.find(
              (candidate) => candidate.side === item.side && candidate.view === item.view
            );
            const slotSkipped = isSkipped(item.side, item.view);
            return (
              <div
                key={`${item.side}-${item.view}`}
                className="rounded-2xl border border-slate-200 bg-surface-raised p-2 shadow-card"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-sunken">
                  {image ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="h-full w-full"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.dataUrl} alt={item.title} className="h-full w-full object-contain" />
                      <span className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-white shadow-sm">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    </motion.div>
                  ) : slotSkipped ? (
                    <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
                      <SkipForward className="h-5 w-5 text-ink-faint" />
                      <span className="text-[11px] font-bold text-ink-soft">Skipped</span>
                      {skipReason(item.side, item.view) && (
                        <span className="text-[10px] leading-tight text-ink-faint">
                          {skipReason(item.side, item.view)}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
                <p className="mt-1.5 text-xs font-bold text-ink">
                  {slotLabel(item.side, item.view)}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    if (slotSkipped) unskipSlot(item.side, item.view);
                    setIndex(shotIndex);
                  }}
                  className="mt-1.5 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-surface-sunken text-sm font-bold text-primary"
                >
                  {slotSkipped ? (
                    <>
                      <Camera className="h-3.5 w-3.5" /> Take it
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3.5 w-3.5" /> Retake
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
        <div className="shrink-0 pt-3">
          {captured.length === 0 && (
            <p className="mb-2 text-center text-[13px] font-semibold text-ink-soft">
              At least one photo is needed before anything can be analyzed.
            </p>
          )}
          <Button fullWidth disabled={!complete} onClick={goNext}>
            {captured.length > 0 && captured.length < SHOTS.length
              ? `Analyze ${captured.length} photo${captured.length === 1 ? "" : "s"}`
              : "Analyze these photos"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-2.5 flex shrink-0 items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
            Foot photo
          </p>
          <h1 className="text-xl font-bold text-ink">{shot.title}</h1>
          <p className="mt-1 text-[15px] leading-snug text-ink-soft">{shot.hint}</p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-semibold text-ink-soft">
          {index + 1} / {SHOTS.length}
        </span>
      </header>

      {/* Per-slot progress strip — purely presentational, derived from the
          same images/index state the flow already tracks. */}
      <div className="mb-2.5 grid shrink-0 grid-cols-4 gap-1.5">
        {SHOTS.map((item, slotIndex) => {
          const slotImage = images.find(
            (candidate) => candidate.side === item.side && candidate.view === item.view
          );
          const isActive = slotIndex === index;
          return (
            <div
              key={`slot-${item.side}-${item.view}`}
              className={
                isActive
                  ? "rounded-xl border-2 border-primary bg-surface-raised p-1 shadow-card"
                  : slotImage
                    ? "rounded-xl border border-slate-200 bg-surface-raised p-1"
                    : "rounded-xl border border-dashed border-slate-300 bg-surface-sunken p-1"
              }
            >
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-surface-sunken">
                {slotImage ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="h-full w-full"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slotImage.dataUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute right-0.5 top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-white">
                      <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                    </span>
                  </motion.div>
                ) : isSkipped(item.side, item.view) ? (
                  <SkipForward className="h-4 w-4 text-ink-faint" />
                ) : (
                  <Camera className="h-4 w-4 text-ink-faint" />
                )}
              </div>
              <p
                className={
                  isActive
                    ? "mt-1 text-center text-[10px] font-bold leading-tight text-primary"
                    : "mt-1 text-center text-[10px] font-semibold leading-tight text-ink-faint"
                }
              >
                {slotLabel(item.side, item.view)}
              </p>
            </div>
          );
        })}
      </div>

      {/* min-h keeps the camera/guide stage usable on short screens instead of
          letting flex squeeze it to a sliver; the flow body scrolls if the
          screen then runs past the fold. */}
      <div className="relative min-h-[200px] flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-surface-sunken">
        {cameraOpen ? (
          <LiveCamera
            onCapture={handleCameraCapture}
            onClose={() => setCameraOpen(false)}
            onUnavailable={handleCameraUnavailable}
            guideSide={shot.side}
            guideView={shot.view}
          />
        ) : current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.dataUrl} alt={shot.title} className="h-full w-full object-contain" />
        ) : isSkipped(shot.side, shot.view) ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <SkipForward className="h-7 w-7 text-ink-faint" />
            <p className="text-sm font-bold text-ink">Skipped</p>
            <p className="max-w-xs text-[13px] leading-snug text-ink-soft">
              {skipReason(shot.side, shot.view)
                ? `Reason given: ${skipReason(shot.side, shot.view)}.`
                : "No reason given."}{" "}
              This view won&apos;t appear in your report.
            </p>
            <button
              type="button"
              onClick={() => unskipSlot(shot.side, shot.view)}
              className="mt-1 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-surface-raised px-4 text-sm font-bold text-primary shadow-card"
            >
              Take it after all
            </button>
          </div>
        ) : (
          <PhotoGuideAnimation side={shot.side} view={shot.view} />
        )}
        {!cameraOpen && current && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
            <Check className="h-3.5 w-3.5" strokeWidth={3} /> Quality check passed
          </span>
        )}
        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/75">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="mt-2 text-sm font-semibold text-ink">
              Checking your photo…
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-2xl border border-red-200 bg-urgent-soft px-3 py-2.5">
          <div>
            <p className="text-sm font-bold text-urgent">Please retake this photo</p>
            <p className="mt-0.5 text-sm leading-snug text-ink-soft">{error}</p>
          </div>
          <button
            type="button"
            onClick={retry}
            disabled={busy}
            className="min-h-[44px] shrink-0 rounded-xl bg-urgent px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            Retry
          </button>
        </div>
      )}

      {notes.length > 0 && !error && (
        <div className="mt-2 rounded-2xl border border-amber-200 bg-warn-soft px-3 py-2.5">
          <p className="text-sm font-bold text-ink">Photo accepted</p>
          {notes.map((note) => (
            <p key={note} className="mt-0.5 text-sm leading-snug text-ink-soft">
              {note}
            </p>
          ))}
        </div>
      )}

      <div className="mt-3 grid shrink-0 grid-cols-2 gap-2">
        <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-surface-raised text-sm font-bold text-primary shadow-card">
          <ImagePlus className="mr-1.5 h-4 w-4" /> Upload photo
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp,.gif,.webp"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              lastSource.current = "upload";
              void choosePhoto(event.target.files?.[0]);
              // Reset so picking the same file again still fires onChange.
              event.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          disabled={busy || cameraOpen}
          onClick={() => {
            setError(null);
            setCameraOpen(true);
          }}
          className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-primary text-sm font-bold text-white shadow-button transition active:bg-primary-deep disabled:opacity-60"
        >
          <Camera className="mr-1.5 h-4 w-4" /> Take photo
        </button>
      </div>
      <div className="shrink-0 pt-2">
        <Button
          fullWidth
          disabled={!current || busy || cameraOpen}
          onClick={() => setIndex((value) => value + 1)}
        >
          {index === SHOTS.length - 1 ? "Review all photos" : "Use this photo"}
        </Button>
      </div>

      {/* Skip. Deliberately always available and never disabled: a patient
          with an amputation or a dressing cannot produce this photo at all,
          and a flow that traps them on it is a flow they abandon. */}
      <div className="shrink-0 pt-2">
        {skipOpen ? (
          <div className="rounded-2xl border border-slate-200 bg-surface-raised p-3 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-ink">
                Skip {slotLabel(shot.side, shot.view).toLowerCase()}?
              </p>
              <button
                type="button"
                onClick={() => setSkipOpen(false)}
                aria-label="Close skip options"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-surface-sunken"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
              This view won&apos;t appear in your report. Telling us why is
              optional.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SKIP_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => confirmSkip(reason)}
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-surface-sunken px-3 text-[13px] font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => confirmSkip()}
              className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-surface-sunken text-sm font-bold text-primary"
            >
              Skip without a reason
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setCameraOpen(false);
              setSkipOpen(true);
            }}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl text-sm font-bold text-ink-soft transition-colors hover:text-primary"
          >
            <SkipForward className="h-4 w-4" />
            Can&apos;t take this photo — skip it
          </button>
        )}
      </div>
    </div>
  );
}
