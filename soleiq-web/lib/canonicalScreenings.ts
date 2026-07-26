"use client";

import type { PatientProfile, Visit } from "./types";

export async function saveCanonicalScreening(
  profile: Partial<PatientProfile>,
  visit: Visit
): Promise<
  | { saved: true; sessionId: string; status: string }
  | { saved: false; localOnly: true; reason: string }
> {
  const response = await fetch("/api/screenings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      idempotencyKey: visit.id,
      startedAt: visit.startedAt,
      images: visit.images
        .filter((image) => image.view === "top" || image.view === "sole")
        .map((image) => ({
          side: image.side,
          view: image.view,
          dataUrl: image.dataUrl,
          capturedAt: image.capturedAt,
          quality: image.quality ?? null,
        })),
      patientContext: profile,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (response.status === 409) {
    return {
      saved: false,
      localOnly: true,
      reason:
        payload?.error?.message ??
        "This check is available locally but is not linked to a hospital record.",
    };
  }
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error?.message ?? "The screening could not be saved.");
  }
  return {
    saved: true,
    sessionId: payload.data.sessionId,
    status: payload.data.status,
  };
}

