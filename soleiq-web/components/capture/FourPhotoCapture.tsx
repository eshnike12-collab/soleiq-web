"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Check, ImagePlus, Loader2, RotateCcw } from "lucide-react";
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

/** Human-friendly slot label, e.g. "Right foot · top". Display only. */
const slotLabel = (side: FootSide, view: "top" | "sole") =>
  `${side === "right" ? "Right" : "Left"} foot · ${view === "top" ? "top" : "sole"}`;

export function FourPhotoCapture() {
  const visit = useSoleiqStore((state) => state.currentVisit);
  const addImage = useSoleiqStore((state) => state.addImage);
  const goNext = useSoleiqStore((state) => state.goNext);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const lastSource = useRef<"camera" | "upload">("camera");
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const reviewing = index === SHOTS.length;
  const shot = SHOTS[Math.min(index, SHOTS.length - 1)];
  const images = visit?.images ?? [];
  const current = images.find(
    (image) => image.side === shot.side && image.view === shot.view
  );
  const complete = SHOTS.every(({ side, view }) =>
    images.some(
      (image) =>
        image.side === side && image.view === view && image.quality?.passed
    )
  );

  const choosePhoto = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const prepared = await prepareFootPhoto(file);
      if (!prepared.quality.passed) {
        setError(prepared.quality.issues.join(" "));
        return;
      }
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
        <header className="mb-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
            Review photos
          </p>
          <h1 className="text-xl font-bold text-ink">All four views</h1>
          <p className="mt-1 text-[15px] leading-snug text-ink-soft">
            Check that each photo shows the whole foot in focus. Retake anything unclear.
          </p>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2.5 overflow-y-auto pb-2">
          {SHOTS.map((item, shotIndex) => {
            const image = images.find(
              (candidate) => candidate.side === item.side && candidate.view === item.view
            );
            return (
              <div
                key={`${item.side}-${item.view}`}
                className="rounded-2xl border border-slate-200 bg-surface-raised p-2 shadow-card"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-sunken">
                  {image && (
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
                  )}
                </div>
                <p className="mt-1.5 text-xs font-bold text-ink">
                  {slotLabel(item.side, item.view)}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setIndex(shotIndex);
                  }}
                  className="mt-1.5 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-surface-sunken text-sm font-bold text-primary"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Retake
                </button>
              </div>
            );
          })}
        </div>
        <div className="pt-3">
          <Button fullWidth disabled={!complete} onClick={goNext}>
            Analyze these photos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-2.5 flex items-start justify-between gap-3">
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
      <div className="mb-2.5 grid grid-cols-4 gap-1.5">
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

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-surface-sunken">
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

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-surface-raised text-sm font-bold text-primary shadow-card">
          <ImagePlus className="mr-1.5 h-4 w-4" /> Upload photo
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*,.heic,.heif"
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
      <div className="pt-2">
        <Button
          fullWidth
          disabled={!current || busy || cameraOpen}
          onClick={() => setIndex((value) => value + 1)}
        >
          {index === SHOTS.length - 1 ? "Review all photos" : "Use this photo"}
        </Button>
      </div>
    </div>
  );
}
