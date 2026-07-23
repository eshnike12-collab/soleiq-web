export interface PreparedPhoto {
  dataUrl: string;
  quality: {
    passed: boolean;
    brightness: number;
    sharpness: number;
    width: number;
    height: number;
    issues: string[];
  };
}

const MAX_EDGE = 1400;
const HEIC_NAME = /\.(heic|heif)$/i;
const SUPPORTED_NAME = /\.(jpe?g|png|webp|heic|heif)$/i;

export async function prepareFootPhoto(file: File): Promise<PreparedPhoto> {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    HEIC_NAME.test(file.name);
  if (!isHeic && !file.type.startsWith("image/") && !SUPPORTED_NAME.test(file.name)) {
    throw new Error("Choose a JPEG, PNG, WebP, HEIC, or HEIF image.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("This image is larger than 15 MB. Choose a smaller photo.");
  }

  const browserImage = isHeic ? await convertHeicToJpeg(file) : file;
  const image = await loadImage(browserImage);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("The browser could not read this image.");
  context.drawImage(image, 0, 0, width, height);

  // Lighting normalization BEFORE analysis: hard shadows and color casts are
  // the main source of "dark spot" false positives downstream. Two passes —
  // the second flattens whatever gradient survives the first's clamps — so
  // lighting is corrected in software instead of bouncing the photo back to
  // the patient. Best-effort: a failure must never block the capture flow.
  try {
    normalizeLighting(context, width, height);
    normalizeLighting(context, width, height);
  } catch {
    /* keep the unnormalized image */
  }

  const sample = document.createElement("canvas");
  sample.width = 120;
  sample.height = 120;
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  if (!sampleContext) throw new Error("The browser could not check this image.");
  sampleContext.drawImage(canvas, 0, 0, sample.width, sample.height);
  const pixels = sampleContext.getImageData(0, 0, sample.width, sample.height);
  const gray = new Float32Array(sample.width * sample.height);
  let brightness = 0;
  for (let i = 0; i < gray.length; i++) {
    const value =
      pixels.data[i * 4] * 0.299 +
      pixels.data[i * 4 + 1] * 0.587 +
      pixels.data[i * 4 + 2] * 0.114;
    gray[i] = value;
    brightness += value;
  }
  brightness /= gray.length;

  let lapSum = 0;
  let lapSquareSum = 0;
  let count = 0;
  for (let y = 1; y < sample.height - 1; y++) {
    for (let x = 1; x < sample.width - 1; x++) {
      const i = y * sample.width + x;
      const lap =
        -4 * gray[i] +
        gray[i - 1] +
        gray[i + 1] +
        gray[i - sample.width] +
        gray[i + sample.width];
      lapSum += lap;
      lapSquareSum += lap * lap;
      count++;
    }
  }
  const mean = lapSum / count;
  const sharpness = lapSquareSum / count - mean * mean;
  const issues: string[] = [];

  if (image.width < 600 || image.height < 600) {
    issues.push("The photo is too small. Use the original camera photo.");
  }
  if (brightness < 45) {
    issues.push("The photo is too dark. Move to brighter, even lighting.");
  } else if (brightness > 225) {
    issues.push("The photo is overexposed. Turn off flash and avoid glare.");
  }
  if (sharpness < 35) {
    issues.push("The photo looks blurry. Hold the phone steady and tap to focus.");
  }
  // Uneven lighting is NOT a blocker: it gets corrected in software by the
  // two normalization passes above, and the analysis prompt is told to treat
  // residual shading as lighting, not lesions. The only lighting reasons to
  // reject a photo are the absolute too-dark / overexposed limits above.

  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.84),
    quality: {
      passed: issues.length === 0,
      brightness,
      sharpness,
      width: image.width,
      height: image.height,
      issues,
    },
  };
}

// ---------------------------------------------------------------------------
// Lighting normalization — gray-world white balance + CLAHE-style local
// luminance flattening. Runs on the full-resolution prepared canvas so the
// image the model sees has hard shadows and color casts damped down.
// ---------------------------------------------------------------------------

const WB_GAIN_MIN = 0.8;
const WB_GAIN_MAX = 1.25;
/** Tile grid for the local luminance map. */
const TILE_GRID = 8;
/** Clamp on the per-pixel shadow-lift factor: enough to flatten a shadow,
 *  not enough to erase true dark discoloration (which is small and keeps
 *  its local contrast after a smooth, tile-scale correction). Applied in
 *  two passes, so the effective range is roughly the square of this. */
const LIFT_MIN = 0.65;
const LIFT_MAX = 1.9;

export function normalizeLighting(
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  const pixelCount = width * height;

  // ---- 1. Gray-world white balance ---------------------------------------
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  for (let i = 0; i < data.length; i += 4) {
    sumR += data[i];
    sumG += data[i + 1];
    sumB += data[i + 2];
  }
  const meanR = sumR / pixelCount;
  const meanG = sumG / pixelCount;
  const meanB = sumB / pixelCount;
  const gray = (meanR + meanG + meanB) / 3;
  const clampGain = (value: number) =>
    Math.min(WB_GAIN_MAX, Math.max(WB_GAIN_MIN, value));
  const gainR = clampGain(gray / (meanR || 1));
  const gainG = clampGain(gray / (meanG || 1));
  const gainB = clampGain(gray / (meanB || 1));

  // ---- 2. Local luminance map (tile means, bilinearly interpolated) ------
  const tileW = Math.max(1, Math.ceil(width / TILE_GRID));
  const tileH = Math.max(1, Math.ceil(height / TILE_GRID));
  const tileSum = new Float64Array(TILE_GRID * TILE_GRID);
  const tileCount = new Float64Array(TILE_GRID * TILE_GRID);
  let lumaSum = 0;
  for (let y = 0; y < height; y++) {
    const ty = Math.min(TILE_GRID - 1, Math.floor(y / tileH));
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const tile = ty * TILE_GRID + Math.min(TILE_GRID - 1, Math.floor(x / tileW));
      tileSum[tile] += luma;
      tileCount[tile] += 1;
      lumaSum += luma;
    }
  }
  const globalMean = lumaSum / pixelCount || 1;
  const tileMean = new Float64Array(TILE_GRID * TILE_GRID);
  for (let t = 0; t < tileMean.length; t++) {
    tileMean[t] = tileCount[t] > 0 ? tileSum[t] / tileCount[t] : globalMean;
  }

  const localMeanAt = (x: number, y: number): number => {
    // Bilinear interpolation between tile centers → smooth correction map
    // with no visible tile seams.
    const fx = Math.min(TILE_GRID - 1, Math.max(0, x / tileW - 0.5));
    const fy = Math.min(TILE_GRID - 1, Math.max(0, y / tileH - 0.5));
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(TILE_GRID - 1, x0 + 1);
    const y1 = Math.min(TILE_GRID - 1, y0 + 1);
    const dx = fx - x0;
    const dy = fy - y0;
    const top = tileMean[y0 * TILE_GRID + x0] * (1 - dx) + tileMean[y0 * TILE_GRID + x1] * dx;
    const bottom = tileMean[y1 * TILE_GRID + x0] * (1 - dx) + tileMean[y1 * TILE_GRID + x1] * dx;
    return top * (1 - dy) + bottom * dy;
  };

  // ---- 3. Apply white balance + shadow lift ------------------------------
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const local = localMeanAt(x, y) || globalMean;
      const lift = Math.min(LIFT_MAX, Math.max(LIFT_MIN, globalMean / local));
      data[i] = Math.min(255, data[i] * gainR * lift);
      data[i + 1] = Math.min(255, data[i + 1] * gainG * lift);
      data[i + 2] = Math.min(255, data[i + 2] * gainB * lift);
    }
  }
  context.putImageData(imageData, 0, 0);
}

/**
 * 0 = perfectly even, higher = stronger directional lighting. Ratio of the
 * spread of center-region tile means to the global mean, so a shadowed half
 * of the frame scores high while normal foot/background contrast doesn't.
 */
export function measureLightingUnevenness(
  gray: Float32Array,
  width: number,
  height: number
): number {
  const GRID = 6;
  const tileW = Math.max(1, Math.floor(width / GRID));
  const tileH = Math.max(1, Math.floor(height / GRID));
  const means: number[] = [];
  // Center 4×4 of the 6×6 grid — ignore the outer ring where background
  // and floor dominate.
  for (let ty = 1; ty < GRID - 1; ty++) {
    for (let tx = 1; tx < GRID - 1; tx++) {
      let sum = 0;
      let count = 0;
      for (let y = ty * tileH; y < Math.min(height, (ty + 1) * tileH); y++) {
        for (let x = tx * tileW; x < Math.min(width, (tx + 1) * tileW); x++) {
          sum += gray[y * width + x];
          count++;
        }
      }
      if (count > 0) means.push(sum / count);
    }
  }
  if (means.length === 0) return 0;
  const globalMean = means.reduce((a, b) => a + b, 0) / means.length;
  if (globalMean <= 1) return 0;
  const sorted = [...means].sort((a, b) => a - b);
  const darkest = sorted.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const brightest = sorted.slice(-3).reduce((a, b) => a + b, 0) / 3;
  return (brightest - darkest) / globalMean;
}

async function convertHeicToJpeg(file: File): Promise<Blob> {
  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    return Array.isArray(converted) ? converted[0] : converted;
  } catch {
    throw new Error(
      "This HEIC photo could not be converted. Try exporting it as JPEG and upload it again."
    );
  }
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be opened."));
    };
    image.src = url;
  });
}
