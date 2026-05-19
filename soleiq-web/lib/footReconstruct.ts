/**
 * Browser-only foot mesh reconstruction from live camera input.
 *
 * Pipeline:
 *   1. Capture a video frame to a downsampled canvas.
 *   2. Convert to grayscale + run Otsu thresholding to separate foot (darker)
 *      from background (typically lighter clinic floor / paper / skin).
 *   3. Constrain the foot region to the central ellipse to match the foot-
 *      outline overlay shown to the clinician during capture.
 *   4. Run a two-pass chamfer distance transform — each interior pixel gets
 *      its approximate distance to the nearest silhouette edge.
 *   5. Sample the distance field on a regular grid → that's the foot heightmap.
 *      The center/arch is naturally the tallest because it's farthest from
 *      the edge.
 *
 * Output is camera-driven: a different foot shape gives a different mesh.
 * Quality is limited (single-view, no true depth), but it is honestly derived
 * from real camera input — not procedural.
 */

const CAP_W = 224;
const CAP_H = 288;

export interface FootHeightmap {
  width: number;
  height: number;
  heights: number[]; // row-major, normalized 0..1
  capturedAt: number;
  /** Approximate area in pixels — useful as a confidence proxy. */
  silhouettePx: number;
}

export function emptyHeightmap(grid = 48): FootHeightmap {
  return {
    width: grid,
    height: grid,
    heights: new Array(grid * grid).fill(0),
    capturedAt: 0,
    silhouettePx: 0,
  };
}

/** Captures the current video frame and returns a foot heightmap. */
export function reconstructFromVideo(
  video: HTMLVideoElement,
  grid = 48
): FootHeightmap | null {
  if (!video.videoWidth || !video.videoHeight) return null;

  const canvas = document.createElement("canvas");
  canvas.width = CAP_W;
  canvas.height = CAP_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  // Mirror nothing — preserve actual orientation as seen by camera.
  ctx.drawImage(video, 0, 0, CAP_W, CAP_H);
  const img = ctx.getImageData(0, 0, CAP_W, CAP_H);

  // 1. Grayscale.
  const gray = new Uint8Array(CAP_W * CAP_H);
  for (let i = 0; i < gray.length; i++) {
    const r = img.data[i * 4];
    const g = img.data[i * 4 + 1];
    const b = img.data[i * 4 + 2];
    gray[i] = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
  }

  // 2. Otsu threshold.
  const t = otsu(gray);

  // 3. Binary mask: foot = darker than background. If the image is unusual
  //    we also accept the inverse and pick whichever produced fewer pixels
  //    (the foot is usually the smaller, more compact region).
  const m1 = new Uint8Array(CAP_W * CAP_H);
  const m2 = new Uint8Array(CAP_W * CAP_H);
  let c1 = 0;
  let c2 = 0;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] < t) {
      m1[i] = 1;
      c1++;
    } else {
      m2[i] = 1;
      c2++;
    }
  }
  // Pick the smaller foreground class — that's the foot.
  // Constrain to the central ellipse (same as foot-outline overlay).
  const mask = c1 <= c2 ? m1 : m2;
  const cx = CAP_W / 2;
  const cy = CAP_H / 2;
  const rx = CAP_W * 0.34;
  const ry = CAP_H * 0.42;
  let silhouettePx = 0;
  for (let y = 0; y < CAP_H; y++) {
    for (let x = 0; x < CAP_W; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const idx = y * CAP_W + x;
      if (dx * dx + dy * dy > 1) {
        mask[idx] = 0;
      } else if (mask[idx]) {
        silhouettePx++;
      }
    }
  }
  if (silhouettePx < 200) return null;

  // 4. Two-pass chamfer distance transform.
  const dist = chamferDistance(mask, CAP_W, CAP_H);

  // 5. Sample distance field on a grid.
  const heights = new Array(grid * grid).fill(0);
  let maxH = 0;
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      // Map grid -> image, sample the ellipse-cropped region.
      const ix = Math.floor(((gx + 0.5) / grid) * CAP_W);
      const iy = Math.floor(((gy + 0.5) / grid) * CAP_H);
      const v = dist[iy * CAP_W + ix];
      heights[gy * grid + gx] = v;
      if (v > maxH) maxH = v;
    }
  }

  // 6. Normalize 0..1 and smooth slightly.
  if (maxH > 0) {
    for (let i = 0; i < heights.length; i++) heights[i] /= maxH;
  }
  smoothGrid(heights, grid, grid);

  return {
    width: grid,
    height: grid,
    heights,
    capturedAt: Date.now(),
    silhouettePx,
  };
}

/** Otsu's method on an 8-bit histogram. */
function otsu(gray: Uint8Array): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let max = 0;
  let threshold = 127;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > max) {
      max = between;
      threshold = i;
    }
  }
  return threshold;
}

/** Two-pass 3x3 chamfer with weights (3, 4) ~ (1, √2). */
function chamferDistance(
  mask: Uint8Array,
  w: number,
  h: number
): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? INF : 0;

  // Forward pass.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (d[i] === 0) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) {
        v = Math.min(v, d[i - w] + 3);
        if (x > 0) v = Math.min(v, d[i - w - 1] + 4);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4);
      }
      d[i] = v;
    }
  }
  // Backward pass.
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (d[i] === 0) continue;
      let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + 3);
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + 3);
        if (x > 0) v = Math.min(v, d[i + w - 1] + 4);
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + 4);
      }
      d[i] = v;
    }
  }
  return d;
}

/** 3x3 box smooth on the grid. Two passes for softer arch transitions. */
function smoothGrid(grid: number[], w: number, h: number) {
  const tmp = new Array(grid.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              sum += grid[ny * w + nx];
              count++;
            }
          }
        }
        tmp[y * w + x] = sum / count;
      }
    }
    for (let i = 0; i < grid.length; i++) grid[i] = tmp[i];
  }
}
