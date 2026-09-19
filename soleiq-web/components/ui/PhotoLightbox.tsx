"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Full-screen viewer for capture photographs.
 *
 * These are the evidence. A clinician deciding whether a heel crack has broken
 * the skin, or whether redness is erythema or a shadow, cannot do it from a
 * thumbnail — and the previous behaviour, opening the raw URL in a new tab,
 * dropped them onto a bare image with no way back and no zoom control.
 *
 * Zoom is a deliberate two-state toggle rather than continuous pinch: "fit the
 * screen" and "actual pixels" are the two things anyone actually wants, and a
 * continuous zoom on a trackpad is easy to get lost in. At actual size the
 * image scrolls in both directions.
 *
 * No image processing happens here. What is displayed is the stored
 * photograph — see photoQuality.ts for why the lighting-corrected copy is
 * kept separate and never shown.
 */

export interface LightboxPhoto {
  url: string;
  label: string;
}

export function PhotoLightbox({
  photos,
  index,
  onClose,
  onIndexChange,
}: {
  photos: LightboxPhoto[];
  /** Which photo is open. `null` closes the viewer. */
  index: number | null;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = index !== null && photos[index] !== undefined;

  // Reset zoom whenever a different photo opens — carrying a zoom across
  // photos lands you in the corner of the next one with no idea where.
  useEffect(() => {
    setZoomed(false);
  }, [index]);

  useEffect(() => {
    if (!open) return;
    // Focus the close button so Esc and Tab have somewhere sensible to start,
    // and a screen reader announces the dialog rather than the page behind it.
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && index !== null) {
        onIndexChange((index + 1) % photos.length);
      }
      if (event.key === "ArrowLeft" && index !== null) {
        onIndexChange((index - 1 + photos.length) % photos.length);
      }
    };
    document.addEventListener("keydown", onKey);

    // Lock the page behind the overlay. Without this the body scrolls under
    // the viewer on a trackpad and you return to a different scroll position.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, index, photos.length, onClose, onIndexChange]);

  const step = useCallback(
    (delta: number) => {
      if (index === null) return;
      onIndexChange((index + delta + photos.length) % photos.length);
    },
    [index, photos.length, onIndexChange]
  );

  if (!open || index === null) return null;
  const photo = photos[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${photo.label}, photo ${index + 1} of ${photos.length}`}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      // Click the backdrop to close, but not a click that lands on the image.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{photo.label}</p>
          <p className="text-xs text-white/60">
            {index + 1} of {photos.length}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setZoomed((z) => !z)}
            aria-label={zoomed ? "Fit to screen" : "View actual size"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close photo"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className={`flex min-h-0 flex-1 items-center justify-center ${
          zoomed ? "overflow-auto" : "overflow-hidden px-4 pb-4"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.label}
          onClick={() => setZoomed((z) => !z)}
          className={
            zoomed
              ? "max-w-none cursor-zoom-out"
              : "max-h-full max-w-full cursor-zoom-in object-contain"
          }
        />
      </div>

      {photos.length > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-2 pb-4">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous photo"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next photo"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
