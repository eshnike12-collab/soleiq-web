"use client";

import { useState } from "react";
import { PhotoLightbox, type LightboxPhoto } from "@/components/ui/PhotoLightbox";

/**
 * The patient's own photos from a check, with a full-screen viewer.
 *
 * These used to be plain links that opened the raw image URL in a new tab —
 * which left the patient on a bare image with no caption, no way back, and
 * nothing telling them which foot they were looking at. Same viewer as the
 * clinician sees, so a patient and their care team are looking at the same
 * thing when they talk about it.
 */
export function PatientPhotoGallery({
  photos,
}: {
  photos: { url: string; side?: string | null; view?: string | null }[];
}) {
  const [index, setIndex] = useState<number | null>(null);

  const items: LightboxPhoto[] = photos.map((p) => ({
    url: p.url,
    label: [p.side, p.view].filter(Boolean).join(" · ") || "Foot photo",
  }));

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((photo, i) => (
          <button
            key={photo.url}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`View ${photo.label} full screen`}
            className="relative block cursor-zoom-in overflow-hidden rounded-2xl bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <div className="aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.label}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="absolute inset-x-0 bottom-0 bg-black/50 px-1.5 py-1 text-center text-[10px] font-semibold uppercase text-white">
              {photo.label}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Tap a photo to see it full screen.
      </p>
      <PhotoLightbox
        photos={items}
        index={index}
        onClose={() => setIndex(null)}
        onIndexChange={setIndex}
      />
    </>
  );
}
