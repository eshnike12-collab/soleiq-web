"use client";

/**
 * Captured screening photos for the exact-report view. Each image is loaded
 * through the authorized media endpoint, which verifies access under RLS and
 * returns a short-lived signed URL, so nothing here is publicly addressable.
 */

import { useCallback, useEffect, useState } from "react";
import { PhotoLightbox, type LightboxPhoto } from "@/components/ui/PhotoLightbox";

interface ReportPhotoAsset {
  id: string;
  side: string | null;
  view: string | null;
}

type PhotoState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error" };

function PhotoTile({
  asset,
  onResolved,
  onOpen,
}: {
  asset: ReportPhotoAsset;
  /** Hands the signed URL up so the lightbox can show this photo. */
  onResolved: (id: string, url: string, label: string) => void;
  onOpen: (id: string) => void;
}) {
  const [state, setState] = useState<PhotoState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/media/${asset.id}`);
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) throw new Error();
        if (!cancelled) {
          setState({ status: "ready", url: payload.data.url });
          onResolved(
            asset.id,
            payload.data.url,
            [asset.side, asset.view].filter(Boolean).join(" · ") || "photo"
          );
        }
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asset.id, asset.side, asset.view, onResolved]);

  const label = [asset.side, asset.view].filter(Boolean).join(" · ") || "photo";
  const ready = state.status === "ready";
  return (
    <figure className="overflow-hidden rounded-xl border border-slate-100">
      <button
        type="button"
        disabled={!ready}
        onClick={() => onOpen(asset.id)}
        aria-label={`View ${label} full screen`}
        className="block w-full cursor-zoom-in disabled:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
      >
      <div className="flex aspect-square items-center justify-center bg-slate-50">
        {state.status === "ready" ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL host
          <img
            src={state.url}
            alt={`Foot photo — ${label}`}
            className="h-full w-full object-cover"
          />
        ) : state.status === "loading" ? (
          <span className="text-xs text-slate-400">Loading…</span>
        ) : (
          <span className="px-3 text-center text-xs text-slate-400">
            Photo unavailable
          </span>
        )}
      </div>
      </button>
      <figcaption className="px-3 py-2 text-xs font-semibold capitalize text-slate-600">
        {label}
      </figcaption>
    </figure>
  );
}

/**
 * Gallery plus full-screen viewer.
 *
 * Resolved URLs are collected here rather than in each tile so the lightbox
 * can page between photos without re-fetching a signed link per step.
 */
export function ReportPhotos({
  assets,
  /**
   * `compact` drops the card chrome and tightens the grid so the photos can
   * sit beside the summary rather than under it. The clinician's first screen
   * has to answer "what did the camera see, and what did the model make of
   * it" without scrolling — a full-width square grid pushed the summary off
   * the top of the viewport.
   */
  compact = false,
}: {
  assets: ReportPhotoAsset[];
  compact?: boolean;
}) {
  const [urls, setUrls] = useState<Record<string, LightboxPhoto>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  // Identity-stable so it does not re-trigger each tile's fetch effect.
  const handleResolved = useCallback((id: string, url: string, label: string) => {
    setUrls((prev) => (prev[id] ? prev : { ...prev, [id]: { url, label } }));
  }, []);

  // Ordered to match the grid, so the arrow keys move the way the eye does.
  const ordered = assets.map((a) => urls[a.id]).filter(Boolean) as LightboxPhoto[];
  const openIndex =
    openId === null
      ? null
      : (() => {
          const i = assets.filter((a) => urls[a.id]).findIndex((a) => a.id === openId);
          return i === -1 ? null : i;
        })();

  const lightbox = (
    <PhotoLightbox
      photos={ordered}
      index={openIndex}
      onClose={() => setOpenId(null)}
      onIndexChange={(next) => {
        const visible = assets.filter((a) => urls[a.id]);
        setOpenId(visible[next]?.id ?? null);
      }}
    />
  );
  if (compact) {
    return assets.length === 0 ? (
      <p className="text-sm text-slate-500">
        No photos are linked to this screening.
      </p>
    ) : (
      <>
        <div className="grid grid-cols-2 gap-2.5">
          {assets.map((asset) => (
            <PhotoTile
              key={asset.id}
              asset={asset}
              onResolved={handleResolved}
              onOpen={setOpenId}
            />
          ))}
        </div>
        {lightbox}
      </>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold">Captured photos ({assets.length})</h3>
      {assets.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No photos are linked to this screening. Checks imported from the
          legacy system may not include stored images.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {assets.map((asset) => (
            <PhotoTile
              key={asset.id}
              asset={asset}
              onResolved={handleResolved}
              onOpen={setOpenId}
            />
          ))}
        </div>
      )}
      {lightbox}
    </section>
  );
}
