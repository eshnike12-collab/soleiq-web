/**
 * Segmentation for foot-wound measurement.
 *
 * Everything here is measured *relative to the patient's own surrounding
 * skin*, never against fixed colour thresholds. That is not a stylistic
 * preference: absolute "is it red" rules encode one skin tone as the norm and
 * degrade on every other, and a diabetic foot screening tool that measures
 * ulcers well on pale skin and badly on dark skin is worse than one that
 * measures nothing. A wound is defined here as skin that differs from the rest
 * of *this* foot, which is a comparison melanin cancels out of.
 */

export interface Mask {
  data: Uint8Array;
  width: number;
  height: number;
  count: number;
}

export interface Chromaticity {
  /** R / (R+G+B) — redness independent of overall brightness. */
  r: number;
  /** G / (R+G+B). */
  g: number;
  /** Perceptual luminance, 0–255. */
  luma: number;
}

export interface SkinReference {
  rMean: number;
  rStd: number;
  gMean: number;
  gStd: number;
  lumaMean: number;
  lumaStd: number;
  sampleCount: number;
}

export function emptyMask(width: number, height: number): Mask {
  return { data: new Uint8Array(width * height), width, height, count: 0 };
}

export function chromaticityAt(pixels: Uint8ClampedArray, index: number): Chromaticity {
  const r = pixels[index * 4];
  const g = pixels[index * 4 + 1];
  const b = pixels[index * 4 + 2];
  const total = r + g + b;
  return {
    r: total > 0 ? r / total : 0,
    g: total > 0 ? g / total : 0,
    luma: 0.299 * r + 0.587 * g + 0.114 * b,
  };
}

/**
 * Skin-versus-background mask by chromaticity.
 *
 * Melanin moves luminance far more than it moves the red/green ratio, so a
 * chromaticity window covers the full range of human skin while excluding most
 * floors, towels and trouser legs. Deliberately generous — a background pixel
 * wrongly kept is diluted by the connected-component step below, whereas
 * excluded dark skin would be a systematic failure.
 */
export function skinMask(pixels: Uint8ClampedArray, width: number, height: number): Mask {
  const mask = emptyMask(width, height);
  for (let i = 0; i < width * height; i++) {
    const { r, g, luma } = chromaticityAt(pixels, i);
    const total =
      pixels[i * 4] + pixels[i * 4 + 1] + pixels[i * 4 + 2];
    const plausible =
      total > 60 &&
      luma > 18 &&
      r >= 0.32 &&
      r <= 0.58 &&
      g >= 0.22 &&
      g <= 0.42 &&
      pixels[i * 4] >= pixels[i * 4 + 2];
    if (plausible) {
      mask.data[i] = 1;
      mask.count++;
    }
  }
  return mask;
}

/** Four-connected flood fill; returns every component, largest first. */
export function connectedComponents(mask: Mask): number[][] {
  const seen = new Uint8Array(mask.data.length);
  const components: number[][] = [];
  const stack: number[] = [];
  for (let start = 0; start < mask.data.length; start++) {
    if (!mask.data[start] || seen[start]) continue;
    const component: number[] = [];
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const index = stack.pop()!;
      component.push(index);
      const x = index % mask.width;
      const y = (index / mask.width) | 0;
      if (x > 0) push(index - 1);
      if (x < mask.width - 1) push(index + 1);
      if (y > 0) push(index - mask.width);
      if (y < mask.height - 1) push(index + mask.width);
    }
    components.push(component);
  }
  components.sort((a, b) => b.length - a.length);
  return components;

  function push(next: number) {
    if (mask.data[next] && !seen[next]) {
      seen[next] = 1;
      stack.push(next);
    }
  }
}

export function maskFromIndices(
  indices: number[],
  width: number,
  height: number
): Mask {
  const mask = emptyMask(width, height);
  for (const index of indices) mask.data[index] = 1;
  mask.count = indices.length;
  return mask;
}

/**
 * Fill enclosed holes in a mask, by flooding the outside from the border and
 * keeping whatever the flood could not reach.
 */
export function fillHoles(mask: Mask): Mask {
  const outside = new Uint8Array(mask.data.length);
  const stack: number[] = [];
  const consider = (index: number) => {
    if (!mask.data[index] && !outside[index]) {
      outside[index] = 1;
      stack.push(index);
    }
  };
  for (let x = 0; x < mask.width; x++) {
    consider(x);
    consider((mask.height - 1) * mask.width + x);
  }
  for (let y = 0; y < mask.height; y++) {
    consider(y * mask.width);
    consider(y * mask.width + mask.width - 1);
  }
  while (stack.length) {
    const index = stack.pop()!;
    const x = index % mask.width;
    const y = (index / mask.width) | 0;
    if (x > 0) consider(index - 1);
    if (x < mask.width - 1) consider(index + 1);
    if (y > 0) consider(index - mask.width);
    if (y < mask.height - 1) consider(index + mask.width);
  }

  const out = emptyMask(mask.width, mask.height);
  for (let i = 0; i < mask.data.length; i++) {
    if (mask.data[i] || !outside[i]) {
      out.data[i] = 1;
      out.count++;
    }
  }
  return out;
}

/**
 * The foot's silhouette: the largest connected skin region, with its holes
 * filled.
 *
 * Filling matters more than it looks. An ulcer bed is frequently *not*
 * skin-coloured — that is what makes it an ulcer — so a mask of skin-classified
 * pixels has a hole exactly where the wound is. Searching inside such a mask
 * finds nothing, and measuring the foot's length from it underestimates the
 * silhouette and shrinks every millimetre measured against it.
 */
export function footMask(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): Mask | null {
  const skin = skinMask(pixels, width, height);
  if (skin.count < width * height * 0.05) return null;
  const components = connectedComponents(skin);
  if (components.length === 0) return null;
  return fillHoles(maskFromIndices(components[0], width, height));
}

function neighbours(index: number, width: number, height: number): number[] {
  const x = index % width;
  const y = (index / width) | 0;
  const out: number[] = [];
  if (x > 0) out.push(index - 1);
  if (x < width - 1) out.push(index + 1);
  if (y > 0) out.push(index - width);
  if (y < height - 1) out.push(index + width);
  return out;
}

/** Morphological erosion, one 4-connected step. */
export function erode(mask: Mask): Mask {
  const out = emptyMask(mask.width, mask.height);
  for (let i = 0; i < mask.data.length; i++) {
    if (!mask.data[i]) continue;
    const keep = neighbours(i, mask.width, mask.height).every((n) => mask.data[n]);
    if (keep) {
      out.data[i] = 1;
      out.count++;
    }
  }
  return out;
}

/** Morphological dilation, one 4-connected step. */
export function dilate(mask: Mask): Mask {
  const out = emptyMask(mask.width, mask.height);
  out.data.set(mask.data);
  out.count = mask.count;
  for (let i = 0; i < mask.data.length; i++) {
    if (!mask.data[i]) continue;
    for (const n of neighbours(i, mask.width, mask.height)) {
      if (!out.data[n]) {
        out.data[n] = 1;
        out.count++;
      }
    }
  }
  return out;
}

/** Pixels inside `outer` but not inside `inner` — a ring around a region. */
export function ringBetween(outer: Mask, inner: Mask): Mask {
  const out = emptyMask(outer.width, outer.height);
  for (let i = 0; i < outer.data.length; i++) {
    if (outer.data[i] && !inner.data[i]) {
      out.data[i] = 1;
      out.count++;
    }
  }
  return out;
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Statistics of healthy-looking skin on this foot, used as the reference every
 * later comparison is made against.
 *
 * Robust statistics on purpose: the median and a median-absolute-deviation
 * spread, so the reference is not dragged around by the wound itself if some
 * of it leaks into the sample.
 */
export function skinReference(
  pixels: Uint8ClampedArray,
  region: Mask
): SkinReference | null {
  if (region.count < 25) return null;
  const rs: number[] = [];
  const gs: number[] = [];
  const lumas: number[] = [];
  for (let i = 0; i < region.data.length; i++) {
    if (!region.data[i]) continue;
    const { r, g, luma } = chromaticityAt(pixels, i);
    rs.push(r);
    gs.push(g);
    lumas.push(luma);
  }
  const rMean = medianOf(rs);
  const gMean = medianOf(gs);
  const lumaMean = medianOf(lumas);
  // 1.4826 scales MAD to a standard deviation for normally-distributed data.
  const mad = (values: number[], centre: number) =>
    1.4826 * medianOf(values.map((v) => Math.abs(v - centre)));
  return {
    rMean,
    rStd: Math.max(mad(rs, rMean), 1e-3),
    gMean,
    gStd: Math.max(mad(gs, gMean), 1e-3),
    lumaMean,
    lumaStd: Math.max(mad(lumas, lumaMean), 1),
    sampleCount: rs.length,
  };
}

/** How far one pixel sits from this foot's normal skin, in robust sigmas. */
export function skinDeviation(
  pixels: Uint8ClampedArray,
  index: number,
  reference: SkinReference
): number {
  const { r, g } = chromaticityAt(pixels, index);
  const dr = (r - reference.rMean) / reference.rStd;
  const dg = (g - reference.gMean) / reference.gStd;
  return Math.hypot(dr, dg);
}

/** Distance beyond which skin is treated as abnormal. */
export const WOUND_DEVIATION_SIGMA = 3;
/** Necrotic tissue is defined by darkness rather than hue. */
export const ESCHAR_LUMA_SIGMA = 3;
/**
 * Minimum absolute shift in red chromaticity for a pixel to count as wound
 * bed, on top of the statistical test.
 *
 * The statistical test alone cannot tell a wound from inflamed skin around
 * one: on a foot with an evenly-lit, low-variance skin surface, even mild
 * erythema sits many robust sigmas out and gets swallowed into the wound
 * mask — which both overstates the wound and erases the periwound redness
 * that is the sign of infection. An exposed wound bed shifts red chromaticity
 * far further than erythema does, so requiring both separates them.
 */
export const WOUND_MIN_CHROMA_SHIFT = 0.08;
/** Matching absolute floor for darkness, in luminance levels. */
export const WOUND_MIN_LUMA_DROP = 25;

/**
 * Abnormal-skin mask within a search area: pixels whose colour is far from
 * this foot's own skin, or markedly darker than it — by both a statistical and
 * an absolute margin.
 */
export function abnormalSkinMask(
  pixels: Uint8ClampedArray,
  searchArea: Mask,
  reference: SkinReference,
  sigma: number = WOUND_DEVIATION_SIGMA
): Mask {
  const out = emptyMask(searchArea.width, searchArea.height);
  for (let i = 0; i < searchArea.data.length; i++) {
    if (!searchArea.data[i]) continue;
    const { r, luma } = chromaticityAt(pixels, i);
    const chromaticDeviation = skinDeviation(pixels, i, reference);
    const chromaShift = Math.abs(r - reference.rMean);
    const darknessSigma = (reference.lumaMean - luma) / reference.lumaStd;
    const lumaDrop = reference.lumaMean - luma;

    const discoloured =
      chromaticDeviation > sigma && chromaShift > WOUND_MIN_CHROMA_SHIFT;
    const necrotic =
      darknessSigma > ESCHAR_LUMA_SIGMA && lumaDrop > WOUND_MIN_LUMA_DROP;
    if (discoloured || necrotic) {
      out.data[i] = 1;
      out.count++;
    }
  }
  // Open the mask (erode then dilate) so single-pixel speckle from sensor
  // noise does not become a "wound".
  return dilate(erode(out));
}
