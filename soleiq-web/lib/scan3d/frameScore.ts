/**
 * Sharpness scoring, ported verbatim from the mobile capture pipeline.
 *
 * Kept as its own file rather than folded into sweep.ts so the two copies can
 * be diffed against each other. The thresholds in sweep.ts are only meaningful
 * against exactly this measure at exactly DELTA_W x DELTA_H, so a silent
 * divergence here would move every gate without touching a threshold.
 */

/**
 * Variance of the 4-neighbour Laplacian.
 *
 * The same discrete kernel OpenCV's `cv2.Laplacian` applies by default, so
 * the numbers are comparable with the server's and one threshold can serve
 * both. Borders are skipped rather than padded — padding invents edges and
 * inflates the variance of an otherwise flat frame.
 */
export function laplacianVariance(
  gray: Float32Array,
  w: number,
  h: number
): number {
  const vals: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      vals.push(
        gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i]
      );
    }
  }
  if (vals.length === 0) return 0;
  let mean = 0;
  for (const v of vals) mean += v;
  mean /= vals.length;
  let acc = 0;
  for (const v of vals) acc += (v - mean) * (v - mean);
  return acc / vals.length;
}
