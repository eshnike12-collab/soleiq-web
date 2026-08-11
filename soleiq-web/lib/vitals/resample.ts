/**
 * Uniform resampling of a captured RGB trace.
 *
 * MetaPhys assumes a fixed 30 fps: the filter design, the 360-frame window and
 * the spectral grid in `postprocess.ts` are all expressed in samples, so a
 * frame rate that wanders — which is what a phone camera actually delivers
 * under auto-exposure — shows up directly as an error in beats per minute.
 * Capture therefore records a timestamp per frame and the trace is placed on a
 * uniform grid before anything else touches it.
 */

import type { RgbTraces } from "./pos";

export interface TimedSample {
  /** Milliseconds, monotonic (performance.now or a video frame timestamp). */
  t: number;
  r: number;
  g: number;
  b: number;
}

export interface ResampledTraces {
  traces: RgbTraces;
  sampleRateHz: number;
  /** Frame rate actually delivered by the camera, for capture diagnostics. */
  measuredFps: number;
  durationSeconds: number;
}

/** Linear interpolation of one channel onto `grid`. */
function interpolate(
  times: number[],
  values: number[],
  grid: Float64Array
): Float64Array {
  const out = new Float64Array(grid.length);
  let cursor = 0;
  for (let i = 0; i < grid.length; i++) {
    const t = grid[i];
    while (cursor < times.length - 2 && times[cursor + 1] < t) cursor++;
    const t0 = times[cursor];
    const t1 = times[cursor + 1];
    const span = t1 - t0;
    if (span <= 0) {
      out[i] = values[cursor];
      continue;
    }
    const alpha = Math.min(Math.max((t - t0) / span, 0), 1);
    out[i] = values[cursor] * (1 - alpha) + values[cursor + 1] * alpha;
  }
  return out;
}

/**
 * Place irregularly-timed samples on a uniform `targetHz` grid. Returns null
 * when there is not enough of a clip to resample.
 */
export function resampleTraces(
  samples: TimedSample[],
  targetHz: number
): ResampledTraces | null {
  if (samples.length < 4) return null;
  const ordered = [...samples].sort((a, b) => a.t - b.t);
  const start = ordered[0].t;
  const end = ordered[ordered.length - 1].t;
  const durationSeconds = (end - start) / 1000;
  if (durationSeconds <= 0) return null;

  const times = ordered.map((s) => s.t - start);
  const count = Math.floor(durationSeconds * targetHz);
  if (count < 2) return null;

  const grid = new Float64Array(count);
  for (let i = 0; i < count; i++) grid[i] = (i * 1000) / targetHz;

  return {
    traces: {
      r: interpolate(times, ordered.map((s) => s.r), grid),
      g: interpolate(times, ordered.map((s) => s.g), grid),
      b: interpolate(times, ordered.map((s) => s.b), grid),
    },
    sampleRateHz: targetHz,
    measuredFps: (ordered.length - 1) / durationSeconds,
    durationSeconds,
  };
}
