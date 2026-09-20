/**
 * BASELINE and LATEST badges for foot photos.
 *
 * The labels are DERIVED, never stored, and that is the whole design.
 *
 * The obvious implementation is a `is_latest` column that gets written on the
 * new photo and cleared on the old one. Every bug in that design lives in the
 * clearing half: a failed second write, a retry, a photo deleted out from
 * under it, two uploads racing — and now two photos both claim to be the most
 * recent, which is exactly the kind of quiet wrongness a clinician would act
 * on. Defining LATEST as "the newest capture in its series" makes the stale
 * tag impossible to represent: there is no tag to go stale.
 *
 * It also means the badges are correct for photos taken before this file
 * existed, with no backfill.
 *
 * SERIES, not the whole set. A check is four photos — left/right × top/sole —
 * and they are only comparable to the same view of the same foot. A patient
 * who skips their left sole this week has not made last week's left sole stop
 * being their most recent left sole, so each (side, view) is tracked on its
 * own. A patient's first-ever check is therefore both BASELINE and LATEST,
 * which is true and worth showing.
 */

export interface TimelinePhoto {
  assetId: string;
  side?: string | null;
  view?: string | null;
  /** Epoch milliseconds. Capture time where known, else row creation. */
  capturedAt: number;
}

export interface PhotoLabels {
  /** First photo ever taken of this foot and view. The comparison anchor. */
  baseline: boolean;
  /** Most recent photo of this foot and view. */
  latest: boolean;
}

export const NO_LABELS: PhotoLabels = { baseline: false, latest: false };

/** Groups photos that are meaningfully comparable to each other. */
export function seriesKey(photo: {
  side?: string | null;
  view?: string | null;
}): string {
  return `${photo.side ?? ""}|${photo.view ?? ""}`;
}

/**
 * Orders two photos within a series, oldest first.
 *
 * The assetId tie-break is load-bearing. Four photos of one check are usually
 * written in the same transaction and can share a timestamp to the
 * millisecond; without a deterministic second key, which one is "latest"
 * would depend on the order the database happened to return rows, and the
 * badge would move around between page loads.
 */
function compare(a: TimelinePhoto, b: TimelinePhoto): number {
  if (a.capturedAt !== b.capturedAt) return a.capturedAt - b.capturedAt;
  return a.assetId < b.assetId ? -1 : a.assetId > b.assetId ? 1 : 0;
}

/**
 * Labels for every photo passed in, keyed by assetId.
 *
 * Pass the patient's WHOLE history, not one check — a photo cannot know it is
 * the baseline by looking only at its own check. Photos with an unusable
 * timestamp are dropped rather than sorted as epoch zero, which would make a
 * broken row outrank a real one and steal the BASELINE badge.
 */
export function derivePhotoLabels(
  photos: readonly TimelinePhoto[]
): Map<string, PhotoLabels> {
  const bySeries = new Map<string, TimelinePhoto[]>();
  for (const photo of photos) {
    if (!photo.assetId) continue;
    if (!Number.isFinite(photo.capturedAt)) continue;
    const key = seriesKey(photo);
    const list = bySeries.get(key);
    if (list) list.push(photo);
    else bySeries.set(key, [photo]);
  }

  const labels = new Map<string, PhotoLabels>();
  for (const series of Array.from(bySeries.values())) {
    const ordered = [...series].sort(compare);
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    for (const photo of ordered) {
      labels.set(photo.assetId, {
        baseline: photo.assetId === first.assetId,
        latest: photo.assetId === last.assetId,
      });
    }
  }
  return labels;
}

/** Labels for one photo, or no labels when it was not in the history. */
export function labelsFor(
  labels: Map<string, PhotoLabels>,
  assetId: string | null | undefined
): PhotoLabels {
  if (!assetId) return NO_LABELS;
  return labels.get(assetId) ?? NO_LABELS;
}

/**
 * Timestamp for a photo row, preferring when the shutter fired over when the
 * row was written. Returns NaN when neither parses, which `derivePhotoLabels`
 * drops.
 */
export function photoTimestamp(row: {
  captured_at?: string | null;
  created_at?: string | null;
}): number {
  const raw = row.captured_at ?? row.created_at;
  if (!raw) return Number.NaN;
  return new Date(raw).getTime();
}
