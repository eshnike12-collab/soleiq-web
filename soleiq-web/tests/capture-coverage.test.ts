import { describe, expect, it } from "vitest";
import {
  REQUIRED_VIEWS,
  checkCoverage,
  unresolvedViews,
} from "@/lib/captureCoverage";

const photo = (side: "left" | "right", view: "top" | "sole") => ({ side, view });
const ALL = [
  photo("left", "top"),
  photo("left", "sole"),
  photo("right", "top"),
  photo("right", "sole"),
];

describe("the skipped-check-was-silently-discarded bug", () => {
  it("accepts a check where one view was skipped", () => {
    // This is the case that used to throw a 409. The client maps 409 to
    // "kept on this device", so the patient saw a success screen and then an
    // unchanged dashboard — the check was never saved and nothing said so.
    const verdict = checkCoverage({
      images: [photo("left", "top"), photo("right", "top"), photo("right", "sole")],
      skippedSlots: [photo("left", "sole")],
    });
    expect(verdict).toEqual({ ok: true });
  });

  it("accepts three skipped views as long as one photo exists", () => {
    expect(
      checkCoverage({
        images: [photo("right", "top")],
        skippedSlots: [
          photo("left", "top"),
          photo("left", "sole"),
          photo("right", "sole"),
        ],
      })
    ).toEqual({ ok: true });
  });

  it("still accepts a complete four-photo check", () => {
    expect(checkCoverage({ images: ALL })).toEqual({ ok: true });
  });
});

describe("what is still refused, and why", () => {
  it("refuses a view that is neither photographed nor skipped", () => {
    const verdict = checkCoverage({
      images: [photo("left", "top"), photo("right", "top")],
    });
    expect(verdict).toEqual({
      ok: false,
      reason: "unresolved",
      views: ["left-sole", "right-sole"],
    });
  });

  it("refuses an all-skipped check — a report about nothing", () => {
    expect(
      checkCoverage({ images: [], skippedSlots: ALL })
    ).toEqual({ ok: false, reason: "no_photos" });
  });

  it("refuses an empty submission", () => {
    expect(checkCoverage({ images: [] })).toEqual({
      ok: false,
      reason: "unresolved",
      views: [...REQUIRED_VIEWS],
    });
  });
});

describe("unresolvedViews", () => {
  it("reports in a stable order, whatever order things arrive in", () => {
    const a = unresolvedViews({ images: [photo("right", "sole")] });
    const b = unresolvedViews({
      images: [photo("right", "sole")],
      skippedSlots: [],
    });
    expect(a).toEqual(["left-top", "left-sole", "right-top"]);
    expect(b).toEqual(a);
  });

  it("treats a duplicated photo as one resolved view, not two", () => {
    const views = unresolvedViews({
      images: [photo("left", "top"), photo("left", "top")],
    });
    expect(views).toEqual(["left-sole", "right-top", "right-sole"]);
  });

  it("tolerates a view that is both photographed and skipped", () => {
    // Belt and braces: resolving twice is still resolved.
    expect(
      unresolvedViews({ images: ALL, skippedSlots: [photo("left", "top")] })
    ).toEqual([]);
  });

  it("returns nothing for a fully resolved mixed check", () => {
    expect(
      unresolvedViews({
        images: [photo("left", "top"), photo("left", "sole")],
        skippedSlots: [photo("right", "top"), photo("right", "sole")],
      })
    ).toEqual([]);
  });
});
