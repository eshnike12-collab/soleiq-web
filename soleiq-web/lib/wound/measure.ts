/**
 * Measurements taken from a segmented wound: size in millimetres, what the
 * tissue in it looks like, and how inflamed the skin around it is.
 *
 * These are descriptive measurements, not a grade. Wagner and University of
 * Texas grading depend on probing depth and on knowing whether bone is
 * involved, neither of which a photograph can establish, so nothing here
 * produces one.
 */

import {
  type Mask,
  type SkinReference,
  chromaticityAt,
  dilate,
  ringBetween,
} from "./segment";
import { type PixelScale, maskExtent } from "./scale";

export type TissueClass = "granulation" | "slough" | "eschar" | "indeterminate";

export interface TissueComposition {
  granulationPct: number;
  sloughPct: number;
  escharPct: number;
  indeterminatePct: number;
}

export interface WoundMeasurement {
  /** Area in mm², absent when no reliable scale was available. */
  areaMm2: number | null;
  /** Area as a fraction of the visible foot — always available. */
  areaFootPct: number;
  areaPx: number;
  /** Longest dimension across the wound, mm. */
  maxLengthMm: number | null;
  /** Widest dimension perpendicular to that, mm. */
  maxWidthMm: number | null;
  tissue: TissueComposition;
  /**
   * How much redder the skin immediately around the wound is than this foot's
   * normal skin, in robust standard deviations. Spreading redness around an
   * ulcer is the classic sign of infection.
   */
  periwoundErythemaSigma: number;
  /** Centre of the wound in normalised image coordinates. */
  centre: { x: number; y: number };
  scaleReliable: boolean;
  scaleNote?: string;
}

/** Periwound redness at or above this is worth naming out loud. */
export const ERYTHEMA_CONCERN_SIGMA = 2;

/**
 * Which tissue a wound pixel looks like.
 *
 * Redness is tested before darkness, and that order is load-bearing. Healthy
 * red granulation is much darker than pale skin, so a darkness-first rule
 * labels it necrotic — which is not a cosmetic mislabel: eschar on a diabetic
 * foot means dead tissue and an urgent referral, and reporting it where a
 * wound is actually granulating well would be an alarming, wrong answer.
 * Necrotic tissue is dark *and* not red-shifted; granulation is red-shifted
 * whatever its brightness.
 */
function classifyTissue(
  pixels: Uint8ClampedArray,
  index: number,
  reference: SkinReference
): TissueClass {
  const { r, g, luma } = chromaticityAt(pixels, index);
  const rednessSigma = (r - reference.rMean) / reference.rStd;
  const rednessShift = r - reference.rMean;
  const greenSigma = (g - reference.gMean) / reference.gStd;
  const darknessSigma = (reference.lumaMean - luma) / reference.lumaStd;
  const lumaDrop = reference.lumaMean - luma;

  if (rednessSigma > 2 && rednessShift > 0.05) return "granulation";
  if (darknessSigma > 3 && lumaDrop > 25) return "eschar";
  // Slough is yellow-white: green lifted relative to this foot's skin, and no
  // more red than the skin around it.
  if (greenSigma > 1.5 && rednessSigma < 1) return "slough";
  return "indeterminate";
}

export function measureWound(
  pixels: Uint8ClampedArray,
  wound: Mask,
  foot: Mask,
  reference: SkinReference,
  scale: PixelScale | null
): WoundMeasurement | null {
  if (wound.count === 0) return null;
  const extent = maskExtent(wound);
  if (!extent) return null;

  // --- Tissue composition ---------------------------------------------------
  const counts: Record<TissueClass, number> = {
    granulation: 0,
    slough: 0,
    eschar: 0,
    indeterminate: 0,
  };
  for (let i = 0; i < wound.data.length; i++) {
    if (!wound.data[i]) continue;
    counts[classifyTissue(pixels, i, reference)]++;
  }
  const pct = (value: number) => Math.round((value / wound.count) * 1000) / 10;

  // --- Periwound erythema ---------------------------------------------------
  // A ring roughly 3 pixels wide just outside the wound, kept inside the foot.
  let grown = wound;
  for (let step = 0; step < 3; step++) grown = dilate(grown);
  const ringAll = ringBetween(grown, wound);
  const ring: Mask = {
    data: new Uint8Array(ringAll.data.length),
    width: ringAll.width,
    height: ringAll.height,
    count: 0,
  };
  for (let i = 0; i < ringAll.data.length; i++) {
    if (ringAll.data[i] && foot.data[i]) {
      ring.data[i] = 1;
      ring.count++;
    }
  }
  let erythemaSigma = 0;
  if (ring.count > 10) {
    let total = 0;
    for (let i = 0; i < ring.data.length; i++) {
      if (!ring.data[i]) continue;
      total += chromaticityAt(pixels, i).r;
    }
    const ringRedness = total / ring.count;
    erythemaSigma = (ringRedness - reference.rMean) / reference.rStd;
  }

  const areaMm2 =
    scale && scale.mmPerPixel > 0
      ? Math.round(wound.count * scale.mmPerPixel * scale.mmPerPixel * 10) / 10
      : null;

  return {
    areaMm2,
    areaFootPct: foot.count > 0 ? Math.round((wound.count / foot.count) * 1000) / 10 : 0,
    areaPx: wound.count,
    maxLengthMm: scale ? Math.round(extent.majorAxisPx * scale.mmPerPixel * 10) / 10 : null,
    maxWidthMm: scale ? Math.round(extent.minorAxisPx * scale.mmPerPixel * 10) / 10 : null,
    tissue: {
      granulationPct: pct(counts.granulation),
      sloughPct: pct(counts.slough),
      escharPct: pct(counts.eschar),
      indeterminatePct: pct(counts.indeterminate),
    },
    periwoundErythemaSigma: Math.round(erythemaSigma * 100) / 100,
    centre: {
      x: Math.round((extent.centroidX / wound.width) * 1000) / 1000,
      y: Math.round((extent.centroidY / wound.height) * 1000) / 1000,
    },
    scaleReliable: scale?.reliable ?? false,
    scaleNote: scale?.reason,
  };
}

export interface WoundChange {
  /** Negative means the wound got smaller. */
  areaChangePct: number;
  daysBetween: number;
  /**
   * The ≥50%-area-reduction-by-four-weeks rule of thumb, which is the standard
   * early predictor of whether a diabetic foot ulcer is on track to heal.
   */
  onHealingTrajectory: boolean | null;
  summary: string;
}

/**
 * Compare two measurements of the same wound. Prefers mm² and falls back to
 * the foot-area fraction, so a comparison is still possible when one visit had
 * no reliable scale.
 */
export function compareWound(
  current: WoundMeasurement,
  prior: WoundMeasurement,
  daysBetween: number
): WoundChange | null {
  const currentArea = current.areaMm2 ?? current.areaFootPct;
  const priorArea = prior.areaMm2 ?? prior.areaFootPct;
  const bothInMm = current.areaMm2 !== null && prior.areaMm2 !== null;
  const bothInPct = current.areaMm2 === null && prior.areaMm2 === null;
  if (!bothInMm && !bothInPct) return null;
  if (priorArea <= 0) return null;

  const areaChangePct = Math.round(((currentArea - priorArea) / priorArea) * 1000) / 10;
  // The four-week rule only means anything near four weeks.
  const onHealingTrajectory =
    daysBetween >= 21 && daysBetween <= 42 ? areaChangePct <= -50 : null;

  const direction =
    areaChangePct <= -10 ? "smaller" : areaChangePct >= 10 ? "larger" : "about the same size";
  return {
    areaChangePct,
    daysBetween,
    onHealingTrajectory,
    summary:
      direction === "about the same size"
        ? `The area is about the same as ${daysBetween} days ago (${areaChangePct > 0 ? "+" : ""}${areaChangePct}%).`
        : `The area is ${Math.abs(areaChangePct)}% ${direction} than ${daysBetween} days ago.`,
  };
}
