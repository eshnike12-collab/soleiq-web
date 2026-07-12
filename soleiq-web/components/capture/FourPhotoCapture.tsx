"use client";

import { useState } from "react";
import { Camera, Check, ImagePlus, RotateCcw } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { prepareFootPhoto } from "@/lib/photoQuality";
import type { CaptureView, FootSide } from "@/lib/types";
import { Button } from "@/components/ui/button";

const SHOTS: {
  side: FootSide;
  view: Extract<CaptureView, "top" | "sole">;
  title: string;
  hint: string;
}[] = [
  {
    side: "right",
    view: "top",
    title: "Top of right foot",
    hint: "Point straight down. Show every toe, the sides, and the heel.",
  },
  {
    side: "right",
    view: "sole",
    title: "Sole of right foot",
    hint: "Rest the foot on a low surface and hold the phone below it, use a mirror, or ask a helper.",
  },
  {
    side: "left",
    view: "top",
    title: "Top of left foot",
    hint: "Use the same lighting, background, and distance as the right foot.",
  },
  {
    side: "left",
    view: "sole",
    title: "Sole of left foot",
    hint: "Show the entire sole from heel to every toe. Ask a helper if needed.",
  },
];

export function FourPhotoCapture() {
  const visit = useSoleiqStore((state) => state.currentVisit);
  const addImage = useSoleiqStore((state) => state.addImage);
  const goNext = useSoleiqStore((state) => state.goNext);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  if (reviewing) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <header className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
            Review photos
          </p>
          <h1 className="text-xl font-semibold text-warmGray-800">All four views</h1>
          <p className="mt-1 text-xs text-warmGray-600">
            Check that each photo shows the whole foot in focus. Retake anything unclear.
          </p>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pb-2">
          {SHOTS.map((item, shotIndex) => {
            const image = images.find(
              (candidate) => candidate.side === item.side && candidate.view === item.view
            );
            return (
              <div key={`${item.side}-${item.view}`} className="rounded-2xl border border-warmGray-100 p-2">
                <div className="aspect-square overflow-hidden rounded-xl bg-warmGray-50">
                  {image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.dataUrl} alt={item.title} className="h-full w-full object-contain" />
                  )}
                </div>
                <p className="mt-1.5 text-xs font-semibold text-warmGray-800">{item.title}</p>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setIndex(shotIndex);
                  }}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand"
                >
                  <RotateCcw className="h-3 w-3" /> Retake
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
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
            Foot photo
          </p>
          <h1 className="text-xl font-semibold text-warmGray-800">{shot.title}</h1>
          <p className="mt-1 text-xs leading-snug text-warmGray-600">{shot.hint}</p>
        </div>
        <span className="shrink-0 rounded-full bg-warmGray-50 px-2.5 py-1 text-xs text-warmGray-600">
          {index + 1} / {SHOTS.length}
        </span>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-warmGray-100 bg-warmGray-50">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.dataUrl} alt={shot.title} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center text-warmGray-600">
            <ImagePlus className="h-10 w-10 text-warmGray-100" />
            <p className="mt-3 text-sm font-semibold text-warmGray-800">No photo selected</p>
            <p className="mt-1 text-xs">Use even light, no flash, and a plain background. Include the whole foot.</p>
            <p className="mt-2 text-[11px]">Optional: place a coin or card beside the foot for scale.</p>
          </div>
        )}
        {current && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-teal-600 px-2.5 py-1 text-xs font-medium text-white">
            <Check className="h-3.5 w-3.5" /> Quality check passed
          </span>
        )}
      </div>

      {error && (
        <div className="mt-2 rounded-xl border border-risk-high/30 bg-risk-high/5 px-3 py-2 text-xs text-risk-high">
          <p className="font-semibold">Please retake this photo</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl border border-warmGray-100 bg-white text-sm font-semibold text-brand">
          <ImagePlus className="mr-1.5 h-4 w-4" /> Upload photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              void choosePhoto(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl bg-brand text-sm font-semibold text-white">
          <Camera className="mr-1.5 h-4 w-4" /> Take photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              void choosePhoto(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      <div className="pt-2">
        <Button
          fullWidth
          disabled={!current || busy}
          onClick={() => setIndex((value) => value + 1)}
        >
          {index === SHOTS.length - 1 ? "Review all photos" : "Use this photo"}
        </Button>
      </div>
    </div>
  );
}
