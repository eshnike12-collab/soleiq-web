"use client";

/**
 * Captured screening photos for the exact-report view. Each image is loaded
 * through the authorized media endpoint, which verifies access under RLS and
 * returns a short-lived signed URL, so nothing here is publicly addressable.
 */

import { useEffect, useState } from "react";

interface ReportPhotoAsset {
  id: string;
  side: string | null;
  view: string | null;
}

type PhotoState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error" };

function PhotoTile({ asset }: { asset: ReportPhotoAsset }) {
  const [state, setState] = useState<PhotoState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/media/${asset.id}`);
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) throw new Error();
        if (!cancelled) setState({ status: "ready", url: payload.data.url });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asset.id]);

  const label = [asset.side, asset.view].filter(Boolean).join(" · ") || "photo";
  return (
    <figure className="overflow-hidden rounded-xl border border-slate-100">
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
      <figcaption className="px-3 py-2 text-xs font-semibold capitalize text-slate-600">
        {label}
      </figcaption>
    </figure>
  );
}

export function ReportPhotos({ assets }: { assets: ReportPhotoAsset[] }) {
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
            <PhotoTile key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </section>
  );
}
