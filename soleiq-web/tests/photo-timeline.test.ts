import { describe, expect, it } from "vitest";
import {
  derivePhotoLabels,
  labelsFor,
  photoTimestamp,
  seriesKey,
  type TimelinePhoto,
} from "@/lib/photoTimeline";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);

function photo(
  assetId: string,
  side: string,
  view: string,
  dayOffset: number
): TimelinePhoto {
  return { assetId, side, view, capturedAt: T0 + dayOffset * DAY };
}

/** The four photos of one check, all at the same instant. */
function check(prefix: string, dayOffset: number): TimelinePhoto[] {
  return [
    photo(`${prefix}-lt`, "left", "top", dayOffset),
    photo(`${prefix}-ls`, "left", "sole", dayOffset),
    photo(`${prefix}-rt`, "right", "top", dayOffset),
    photo(`${prefix}-rs`, "right", "sole", dayOffset),
  ];
}

describe("derivePhotoLabels", () => {
  it("marks a lone photo as both baseline and latest", () => {
    const labels = derivePhotoLabels([photo("a", "left", "top", 0)]);
    expect(labels.get("a")).toEqual({ baseline: true, latest: true });
  });

  it("keeps baseline on the first check and moves latest to the newest", () => {
    const labels = derivePhotoLabels([...check("w1", 0), ...check("w2", 7)]);
    expect(labels.get("w1-lt")).toEqual({ baseline: true, latest: false });
    expect(labels.get("w2-lt")).toEqual({ baseline: false, latest: true });
  });

  it("gives exactly one latest per series however many checks exist", () => {
    const labels = derivePhotoLabels([
      ...check("w1", 0),
      ...check("w2", 7),
      ...check("w3", 14),
      ...check("w4", 21),
    ]);
    const latest = Array.from(labels.entries()).filter(([, l]) => l.latest);
    const baseline = Array.from(labels.entries()).filter(([, l]) => l.baseline);
    // Four series: left/right x top/sole.
    expect(latest).toHaveLength(4);
    expect(baseline).toHaveLength(4);
    expect(latest.map(([id]) => id).sort()).toEqual([
      "w4-ls",
      "w4-lt",
      "w4-rs",
      "w4-rt",
    ]);
    expect(baseline.map(([id]) => id).sort()).toEqual([
      "w1-ls",
      "w1-lt",
      "w1-rs",
      "w1-rt",
    ]);
  });

  it("is order-independent — shuffled input gives the same answer", () => {
    const photos = [...check("w1", 0), ...check("w2", 7), ...check("w3", 14)];
    const forward = derivePhotoLabels(photos);
    const backward = derivePhotoLabels([...photos].reverse());
    for (const id of Array.from(forward.keys())) {
      expect(backward.get(id)).toEqual(forward.get(id));
    }
  });

  it("breaks an identical-timestamp tie deterministically", () => {
    // Two photos of the same view written in the same transaction.
    const same: TimelinePhoto[] = [
      { assetId: "bbb", side: "left", view: "top", capturedAt: T0 },
      { assetId: "aaa", side: "left", view: "top", capturedAt: T0 },
    ];
    const first = derivePhotoLabels(same);
    const second = derivePhotoLabels([...same].reverse());
    expect(first.get("bbb")?.latest).toBe(true);
    expect(first.get("aaa")?.baseline).toBe(true);
    // Same verdict regardless of row order — the badge does not move between
    // page loads.
    expect(second.get("bbb")?.latest).toBe(true);
    expect(second.get("aaa")?.baseline).toBe(true);
  });

  it("tracks each side/view series separately when a view is skipped", () => {
    // Week 2 skipped the left sole (amputation, dressing, or just missed).
    const labels = derivePhotoLabels([
      ...check("w1", 0),
      photo("w2-lt", "left", "top", 7),
      photo("w2-rt", "right", "top", 7),
      photo("w2-rs", "right", "sole", 7),
    ]);
    // Week 1's left sole is still the most recent left sole in existence.
    expect(labels.get("w1-ls")).toEqual({ baseline: true, latest: true });
    // And the left top has correctly handed LATEST over.
    expect(labels.get("w1-lt")).toEqual({ baseline: true, latest: false });
    expect(labels.get("w2-lt")).toEqual({ baseline: false, latest: true });
  });

  it("does not let a photo with no usable timestamp steal baseline", () => {
    const labels = derivePhotoLabels([
      ...check("w1", 0),
      { assetId: "broken", side: "left", view: "top", capturedAt: Number.NaN },
    ]);
    expect(labels.has("broken")).toBe(false);
    expect(labels.get("w1-lt")?.baseline).toBe(true);
  });

  it("ignores rows with no assetId", () => {
    const labels = derivePhotoLabels([
      { assetId: "", side: "left", view: "top", capturedAt: T0 },
      photo("real", "left", "top", 1),
    ]);
    expect(labels.size).toBe(1);
    expect(labels.get("real")).toEqual({ baseline: true, latest: true });
  });

  it("groups null side/view together rather than crashing", () => {
    const labels = derivePhotoLabels([
      { assetId: "a", side: null, view: null, capturedAt: T0 },
      { assetId: "b", side: null, view: null, capturedAt: T0 + DAY },
    ]);
    expect(labels.get("a")).toEqual({ baseline: true, latest: false });
    expect(labels.get("b")).toEqual({ baseline: false, latest: true });
  });

  it("returns an empty map for no photos", () => {
    expect(derivePhotoLabels([]).size).toBe(0);
  });
});

describe("seriesKey", () => {
  it("separates feet and views", () => {
    expect(seriesKey({ side: "left", view: "top" })).not.toBe(
      seriesKey({ side: "right", view: "top" })
    );
    expect(seriesKey({ side: "left", view: "top" })).not.toBe(
      seriesKey({ side: "left", view: "sole" })
    );
  });
});

describe("labelsFor", () => {
  it("returns no labels for an unknown or missing id", () => {
    const labels = derivePhotoLabels([photo("a", "left", "top", 0)]);
    expect(labelsFor(labels, "nope")).toEqual({ baseline: false, latest: false });
    expect(labelsFor(labels, null)).toEqual({ baseline: false, latest: false });
  });
});

describe("photoTimestamp", () => {
  it("prefers capture time over row creation time", () => {
    const value = photoTimestamp({
      captured_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-06-01T00:00:00.000Z",
    });
    expect(value).toBe(Date.UTC(2026, 0, 1));
  });

  it("falls back to created_at", () => {
    const value = photoTimestamp({
      captured_at: null,
      created_at: "2026-06-01T00:00:00.000Z",
    });
    expect(value).toBe(Date.UTC(2026, 5, 1));
  });

  it("returns NaN when neither is present", () => {
    expect(Number.isNaN(photoTimestamp({}))).toBe(true);
    expect(
      Number.isNaN(photoTimestamp({ captured_at: null, created_at: null }))
    ).toBe(true);
  });
});
