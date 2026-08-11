/**
 * Ulcer detection and measurement from a foot photo.
 *
 * Two entry points, meant to be used together:
 *
 * - `measureUlcerInRegion` takes a box the vision model already flagged and
 *   turns it into millimetres, tissue composition and periwound redness. The
 *   model is far better at *is this an ulcer*; deterministic pixels are better
 *   at *how big is it and is it bigger than last time*, and only the second
 *   question has an answer you can put on a chart.
 * - `findUlcerCandidates` scans a whole foot with no prior box, so the check
 *   still runs when the vision service is unavailable.
 *
 * Nothing here diagnoses. It measures, and it says how much to trust the
 * measurement.
 */

import type { CaptureView, FootSide } from "@/lib/types";
import {
  type Mask,
  type SkinReference,
  abnormalSkinMask,
  connectedComponents,
  emptyMask,
  footMask,
  maskFromIndices,
  ringBetween,
  skinReference,
  dilate,
} from "./segment";
import { type PixelScale, scaleFromFoot } from "./scale";
import {
  ERYTHEMA_CONCERN_SIGMA,
  type WoundMeasurement,
  measureWound,
} from "./measure";

export * from "./measure";
export * from "./scale";
export * from "./segment";

export interface UlcerRegion {
  /** Normalised box, matching the vision model's `finding.region`. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UlcerAnalysis {
  side: FootSide;
  view: CaptureView;
  measurement: WoundMeasurement;
  /** Fraction of the searched area that segmented as abnormal, 0–1. */
  coverage: number;
  /** Plain-language notes about the measurement's limits. */
  notes: string[];
}

export interface MeasureOptions {
  side: FootSide;
  view: CaptureView;
  /** From the shoe-size answer; without it, results stay in % of foot area. */
  footLengthMm?: number;
  /** Ignore candidates smaller than this share of the foot (sensor speckle). */
  minAreaFootFraction?: number;
}

const DEFAULT_MIN_AREA_FRACTION = 0.0004;

/** Build a mask from a normalised box, clipped to the image. */
function maskFromRegion(
  region: UlcerRegion,
  width: number,
  height: number,
  padding = 0.25
): Mask {
  const mask = emptyMask(width, height);
  const padX = region.w * padding;
  const padY = region.h * padding;
  const x0 = Math.max(0, Math.floor((region.x - padX) * width));
  const x1 = Math.min(width - 1, Math.ceil((region.x + region.w + padX) * width));
  const y0 = Math.max(0, Math.floor((region.y - padY) * height));
  const y1 = Math.min(height - 1, Math.ceil((region.y + region.h + padY) * height));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      mask.data[y * width + x] = 1;
      mask.count++;
    }
  }
  return mask;
}

function intersect(a: Mask, b: Mask): Mask {
  const out = emptyMask(a.width, a.height);
  for (let i = 0; i < a.data.length; i++) {
    if (a.data[i] && b.data[i]) {
      out.data[i] = 1;
      out.count++;
    }
  }
  return out;
}

/**
 * Reference skin: everything on the foot outside the searched area, so the
 * wound cannot contaminate the definition of "normal" it is compared against.
 */
function referenceForSearch(
  pixels: Uint8ClampedArray,
  foot: Mask,
  searchArea: Mask
): SkinReference | null {
  let grown = searchArea;
  for (let step = 0; step < 4; step++) grown = dilate(grown);
  const outside = ringBetween(foot, grown);
  return skinReference(pixels, outside.count > 200 ? outside : foot);
}

function notesFor(
  measurement: WoundMeasurement,
  scale: PixelScale | null,
  footLengthMm?: number
): string[] {
  const notes: string[] = [];
  if (!footLengthMm) {
    notes.push(
      "No shoe size was recorded, so the size is given as a share of the foot rather than in millimetres."
    );
  } else if (!scale?.reliable) {
    notes.push(
      scale?.reason ??
        "The foot outline could not be measured reliably, so millimetre sizes are approximate."
    );
  } else {
    notes.push(
      "Millimetres are scaled from your recorded foot length, so treat them as approximate; change between visits is the more reliable number."
    );
  }
  if (measurement.periwoundErythemaSigma >= ERYTHEMA_CONCERN_SIGMA) {
    notes.push(
      "The skin immediately around this area is redder than the rest of the foot. Spreading redness around a wound can mean infection and should be looked at promptly."
    );
  }
  if (measurement.tissue.escharPct >= 20) {
    notes.push(
      "A substantial part of this area is dark tissue. Dark or black tissue on a diabetic foot needs professional assessment."
    );
  }
  return notes;
}

/**
 * Measure a wound inside a region the vision model flagged.
 * Returns null when nothing in the region separates from the surrounding skin.
 */
export function measureUlcerInRegion(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  region: UlcerRegion,
  options: MeasureOptions
): UlcerAnalysis | null {
  const foot = footMask(pixels, width, height);
  if (!foot) return null;

  const searchArea = intersect(maskFromRegion(region, width, height), foot);
  if (searchArea.count < 30) return null;

  const reference = referenceForSearch(pixels, foot, searchArea);
  if (!reference) return null;

  const abnormal = abnormalSkinMask(pixels, searchArea, reference);
  if (abnormal.count === 0) return null;
  const components = connectedComponents(abnormal);
  if (components.length === 0) return null;
  const wound = maskFromIndices(components[0], width, height);

  const minArea =
    foot.count * (options.minAreaFootFraction ?? DEFAULT_MIN_AREA_FRACTION);
  if (wound.count < minArea) return null;

  const scale = scaleFromFoot(foot, options.footLengthMm);
  const measurement = measureWound(pixels, wound, foot, reference, scale);
  if (!measurement) return null;

  return {
    side: options.side,
    view: options.view,
    measurement,
    coverage: Math.round((wound.count / searchArea.count) * 1000) / 1000,
    notes: notesFor(measurement, scale, options.footLengthMm),
  };
}

/**
 * Scan a whole foot for candidate ulcers with no prior box — the fallback when
 * the vision model could not be reached. Returns the largest candidates first.
 */
export function findUlcerCandidates(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  options: MeasureOptions & { maxCandidates?: number }
): UlcerAnalysis[] {
  const foot = footMask(pixels, width, height);
  if (!foot) return [];
  const reference = skinReference(pixels, foot);
  if (!reference) return [];

  const abnormal = abnormalSkinMask(pixels, foot, reference);
  if (abnormal.count === 0) return [];

  const minArea =
    foot.count * (options.minAreaFootFraction ?? DEFAULT_MIN_AREA_FRACTION);
  const scale = scaleFromFoot(foot, options.footLengthMm);

  return connectedComponents(abnormal)
    .filter((component) => component.length >= minArea)
    .slice(0, options.maxCandidates ?? 3)
    .map((component) => {
      const wound = maskFromIndices(component, width, height);
      const measurement = measureWound(pixels, wound, foot, reference, scale);
      if (!measurement) return null;
      return {
        side: options.side,
        view: options.view,
        measurement,
        coverage: Math.round((wound.count / foot.count) * 1000) / 1000,
        notes: [
          ...notesFor(measurement, scale, options.footLengthMm),
          "Found by colour difference alone, without the image model — treat it as something to look at, not as a finding.",
        ],
      };
    })
    .filter((analysis): analysis is UlcerAnalysis => analysis !== null);
}

/** Load an image data URL into raw pixels. Browser only. */
export async function pixelsFromDataUrl(
  dataUrl: string,
  maxSize = 512
): Promise<{ pixels: Uint8ClampedArray; width: number; height: number } | null> {
  if (typeof document === "undefined") return null;
  const image = new Image();
  image.decoding = "async";
  const loaded = new Promise<boolean>((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
  });
  image.src = dataUrl;
  if (!(await loaded)) return null;

  const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, width, height);
  return { pixels: context.getImageData(0, 0, width, height).data, width, height };
}
