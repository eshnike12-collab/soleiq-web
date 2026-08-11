/**
 * Capillary refill time (CRT) from video.
 *
 * The bedside test — press the pulp of the toe until it blanches, release, and
 * time the return of colour — is one of the few perfusion measurements a
 * camera can genuinely make better than a clinician with a wristwatch, because
 * the camera can see the exact instant of release and the exact moment colour
 * plateaus, and it does not round to the nearest second.
 *
 * Prolonged refill in the foot points at impaired perfusion, but it is not
 * specific: a cold room slows refill in a perfectly healthy foot, which is why
 * the result carries that caveat rather than a diagnosis.
 */

export interface TimedColorSample {
  /** Milliseconds, monotonic. */
  t: number;
  r: number;
  g: number;
  b: number;
}

export type CapillaryRefillCategory = "normal" | "borderline" | "prolonged";

export interface CapillaryRefillResult {
  /** Time from release to 90% of the recovered colour, in seconds. */
  refillSeconds: number;
  /** Time constant of the exponential recovery, in seconds. */
  tau63Seconds: number;
  /** How far the skin actually blanched, as a fraction of baseline redness. */
  blanchDepth: number;
  category: CapillaryRefillCategory;
  /** Milliseconds from the start of the clip to the release instant. */
  releaseAtMs: number;
  sampleCount: number;
}

export interface CapillaryRefillFailure {
  ok: false;
  /** Why no CRT could be measured — shown to the user, so keep it actionable. */
  reason: string;
}

export type CapillaryRefillOutcome =
  | ({ ok: true } & CapillaryRefillResult)
  | CapillaryRefillFailure;

/**
 * Foot CRT is slower than fingertip CRT, and the commonly quoted "under two
 * seconds" is a fingertip number. IWGDF-style foot assessment treats a few
 * seconds as acceptable and markedly prolonged refill as a perfusion warning.
 */
export const NORMAL_REFILL_SECONDS = 3;
export const PROLONGED_REFILL_SECONDS = 5;

/** The blanch must be this much of baseline redness to count as a real press. */
const MIN_BLANCH_DEPTH = 0.04;

function categorise(seconds: number): CapillaryRefillCategory {
  if (seconds <= NORMAL_REFILL_SECONDS) return "normal";
  if (seconds <= PROLONGED_REFILL_SECONDS) return "borderline";
  return "prolonged";
}

/** Redness fraction — falls when the skin is compressed and blood leaves. */
function rednessOf(sample: TimedColorSample): number {
  const total = sample.r + sample.g + sample.b;
  return total > 1e-6 ? sample.r / total : 0;
}

function movingAverage(values: number[], window: number): number[] {
  if (window <= 1) return [...values];
  const out = new Array<number>(values.length);
  let acc = 0;
  const half = Math.floor(window / 2);
  for (let i = 0; i < values.length; i++) {
    let total = 0;
    let count = 0;
    for (let k = Math.max(0, i - half); k <= Math.min(values.length - 1, i + half); k++) {
      total += values[k];
      count++;
    }
    acc = total / count;
    out[i] = acc;
  }
  return out;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Measure CRT from a press-and-release clip.
 *
 * The clip should contain: some seconds of pressure (skin blanched), the
 * release, and enough afterwards for colour to plateau. The release instant is
 * found as the deepest blanch; the recovered baseline is the plateau the
 * colour settles at afterwards, not the pre-press level — the finger lifting
 * away changes the shot, and the plateau is what "refilled" actually means.
 */
export function measureCapillaryRefill(
  samples: TimedColorSample[],
  options: { minPlateauSeconds?: number } = {}
): CapillaryRefillOutcome {
  const minPlateau = options.minPlateauSeconds ?? 1;
  if (samples.length < 20) {
    return { ok: false, reason: "The clip was too short to time a refill." };
  }
  const ordered = [...samples].sort((a, b) => a.t - b.t);
  const t0 = ordered[0].t;
  const times = ordered.map((s) => (s.t - t0) / 1000);
  const redness = movingAverage(ordered.map(rednessOf), 5);
  const duration = times[times.length - 1];

  const searchFrom = Math.floor(redness.length * 0.05);
  const searchTo = Math.floor(redness.length * 0.85);
  let minIndex = searchFrom;
  for (let i = searchFrom; i < searchTo; i++) {
    if (redness[i] < redness[minIndex]) minIndex = i;
  }
  const blanched = redness[minIndex];

  // Recovered colour: the plateau over the final stretch of the clip.
  const plateauFrom = times.findIndex((t) => t >= duration - minPlateau);
  if (plateauFrom < 0 || plateauFrom <= minIndex) {
    return {
      ok: false,
      reason: "Keep filming for a second or two after letting go, so the colour can settle.",
    };
  }
  const baseline = median(redness.slice(plateauFrom));
  const span = baseline - blanched;
  const blanchDepth = baseline > 1e-6 ? span / baseline : 0;
  if (blanchDepth < MIN_BLANCH_DEPTH) {
    return {
      ok: false,
      reason:
        "The skin never went pale enough to time. Press firmly for about five seconds, then let go while filming.",
    };
  }

  // The colour has to have actually stopped changing. A clip that ends while
  // refill is still under way looks exactly like a fast refill to a plateau
  // that never happened — the slower the foot, the more likely that mistake,
  // which is precisely backwards from what a perfusion test needs.
  const tailSlopePerSecond =
    (redness[redness.length - 1] - redness[plateauFrom]) /
    Math.max(times[times.length - 1] - times[plateauFrom], 1e-6);
  if (tailSlopePerSecond > 0.15 * span) {
    return {
      ok: false,
      reason:
        "Colour was still returning when the clip ended — keep filming for a few more seconds after letting go.",
    };
  }

  // Release instant: the END of the blanched plateau, not its deepest point.
  // While the finger is held down the trace sits flat at the blanched level,
  // so the minimum lands wherever noise put it — often seconds before the
  // release — and every refill time measured from it is that much too long.
  const releaseCeiling = blanched + 0.1 * span;
  let releaseIndex = minIndex;
  for (let i = minIndex; i < redness.length; i++) {
    if (redness[i] <= releaseCeiling) releaseIndex = i;
    else break;
  }

  // Time to 90% of the recovery.
  const target = blanched + 0.9 * (baseline - blanched);
  let refillIndex = -1;
  for (let i = releaseIndex; i < redness.length; i++) {
    if (redness[i] >= target) {
      refillIndex = i;
      break;
    }
  }
  if (refillIndex < 0) {
    return {
      ok: false,
      reason: "Colour had not finished returning by the end of the clip — film for longer.",
    };
  }
  const refillSeconds = times[refillIndex] - times[releaseIndex];

  // Time constant, from the same recovery: the first crossing of 63%.
  const tauTarget = blanched + 0.632 * (baseline - blanched);
  let tauIndex = refillIndex;
  for (let i = releaseIndex; i <= refillIndex; i++) {
    if (redness[i] >= tauTarget) {
      tauIndex = i;
      break;
    }
  }

  return {
    ok: true,
    refillSeconds: Math.round(refillSeconds * 100) / 100,
    tau63Seconds: Math.round((times[tauIndex] - times[releaseIndex]) * 100) / 100,
    blanchDepth: Math.round(blanchDepth * 1000) / 1000,
    category: categorise(refillSeconds),
    releaseAtMs: Math.round(times[releaseIndex] * 1000),
    sampleCount: ordered.length,
  };
}
