/**
 * Guided orbit-sweep capture — timing, quality gates, and viewpoint diversity.
 *
 * WHAT CHANGED AND WHY
 * --------------------
 * The first version banked any frame that was sharp and had moved a little
 * since the previous banked frame. That is necessary but not sufficient, and
 * the failure it allows is the one that actually bit: a user can hold the
 * camera roughly still, drift a few centimetres, and bank forty frames that
 * are all essentially the same view. Every frame passes. The bar fills.
 * Structure-from-motion then has forty photos and one viewpoint, so there is
 * no parallax to triangulate and reconstruction fails.
 *
 * Two distinct properties are needed, and conflating them is what went wrong
 * the first time round:
 *
 *   LOCAL OVERLAP — neighbouring frames must share most of what they see, or
 *   feature matching breaks. This wants frames to be SIMILAR.
 *
 *   GLOBAL DIVERSITY — the set as a whole must span many viewpoints, or there
 *   is no baseline to triangulate from. This wants frames to be DIFFERENT.
 *
 * They pull in opposite directions, which is why a single similarity threshold
 * cannot express both. An earlier attempt used one, set it at 0.995, and it
 * culled 26% of a real capture at random — removing exactly the tight overlap
 * SfM depends on (39/39 frames registered with them, 2/29 without). Measured
 * adjacent-frame similarity on that capture ranged 0.9780-0.9987, so the
 * threshold sat in the middle of the normal distribution.
 *
 * So they are now measured separately:
 *   - overlap    -> `frameShift`, banded by MIN_SHIFT..MAX_SHIFT (consecutive)
 *   - duplicates -> `noveltyOf`, against a WINDOW of recent accepted frames
 *   - diversity  -> `viewpointSpread`, across the whole accepted set
 *
 * A frame is banked when it overlaps its predecessor AND is not a near-copy of
 * anything recent. The scan succeeds when the accepted set also spans enough
 * distinct viewpoints. That last check is the one the old flow was missing.
 *
 * ON WHAT `viewpointSpread` ACTUALLY MEASURES
 * -------------------------------------------
 * It is an APPEARANCE proxy, not a measured angle. There are no motion
 * sensors in this path, so nothing here knows where the camera was. It counts
 * how many mutually dissimilar clusters the accepted thumbnails fall into.
 * Two genuinely different angles almost always land in different clusters;
 * two frames of the same angle under different lighting can too. It is a
 * useful floor, not a measurement, and nothing should report it as degrees.
 *
 * Thresholds are first estimates from one real capture, not calibrated
 * constants. Every one is overridable, and local-data/soleiq.db holds the
 * evidence to re-tune them.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface SweepConfig {
  /** Countdown before capture starts, in ms. */
  countdownMs: number;
  /** Length of the guided capture, in ms. */
  scanMs: number;
  /** Gap between samples, in ms. Deliberately not every frame — see below. */
  sampleMs: number;
  /** Frames aimed for; the bar is scaled to this. */
  targetFrames: number;
  /** Below this the server will refuse to reconstruct at all. */
  minUsable: number;
  /** Laplacian variance floor at DELTA_W x DELTA_H. */
  sharpnessFloor: number;
  /** Mean-luma band. Outside it, exposure is the actionable problem. */
  lumaMin: number;
  lumaMax: number;
  /** Consecutive-frame displacement band, as a fraction of frame width. */
  minShift: number;
  maxShift: number;
  /** How many recent accepted frames a new frame is checked against. */
  noveltyWindow: number;
  /** Minimum 1 - cosine similarity against every frame in that window. */
  noveltyMin: number;
  /** Cluster radius, in the same 1 - cosine units, for viewpoint counting. */
  viewpointRadius: number;
  /** Distinct clusters required before the scan counts as diverse enough. */
  minViewpoints: number;
}

/**
 * Read a positive number from the Expo public env, or fall back.
 *
 * These are the knobs most likely to need tuning against a real clinic's
 * lighting and pace, so they are changeable without editing code. Anything
 * non-numeric or non-positive falls back rather than producing a zero-length
 * scan or a division by zero.
 */
function envNum(key: string, fallback: number): number {
  const raw = process.env[key];
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * A slow lap, sampled slowly.
 *
 * TIMING, AND WHY IT IS THIS SLOW
 * -------------------------------
 * The first version ran 10 seconds at 400ms. Both numbers were too fast, for
 * different reasons.
 *
 * Duration. Ten seconds is about two seconds per side of the foot. Nobody
 * walks a camera round an object that fast without either cutting the corner
 * or blurring, and the frames that survived came from a narrow arc — which is
 * the low-parallax failure this whole flow exists to prevent. Twenty-five
 * seconds is roughly four seconds per side: an unhurried pace at which the
 * camera can actually be held steady.
 *
 * Sampling interval. This is the one that decides how much *new surface* each
 * kept frame brings. At 400ms a hand at walking pace has moved a few pixels,
 * so consecutive samples overlap almost completely: they pass the sharpness
 * gate, add nothing, and get thrown out by the novelty check anyway. At 700ms
 * each sample has had time to become a genuinely different view of a
 * different part of the foot. Fewer frames, more coverage per frame, less
 * work per second.
 *
 * The server re-extracts its own 40 frames evenly across the finished video,
 * so a longer recording directly widens the angular spacing of what
 * reconstruction actually receives. That is the mechanism by which slowing
 * down improves the model, not merely the user's experience of it.
 */
export const SWEEP_CONFIG: SweepConfig = {
  countdownMs: envNum("EXPO_PUBLIC_SCAN_COUNTDOWN_MS", 3000),
  scanMs: envNum("EXPO_PUBLIC_SCAN_DURATION_MS", 25_000),
  sampleMs: envNum("EXPO_PUBLIC_SCAN_SAMPLE_MS", 700),
  // ~35 samples fit in a 25s lap at 700ms. Not all are banked — duplicates and
  // stationary moments are dropped — so the bar is scaled to what a good lap
  // actually yields rather than to the number of samples taken. It must stay
  // above minUsable or a full bar would still be a scan the server refuses.
  targetFrames: 24,
  minUsable: 20,
  sharpnessFloor: 40,
  lumaMin: 25,
  lumaMax: 230,
  minShift: 0.025,
  maxShift: 0.22,
  noveltyWindow: 5,
  // 0.02 == "more than 98% correlated with something we already kept".
  // Set low on purpose. The failure mode being guarded against is a stack of
  // *identical* views, not merely similar ones, and over-culling here is the
  // documented way this went wrong before.
  noveltyMin: 0.02,
  viewpointRadius: 0.12,
  minViewpoints: 6,
};

/** Analysis resolution. Small: this runs several times a second on a phone. */
export const DELTA_W = 48;
export const DELTA_H = 36;

/**
 * How far the alignment search looks, in analysis pixels.
 *
 * Must exceed maxShift * DELTA_W, or the threshold it guards is unreachable.
 * It did not, and that was a live bug: at SEARCH = 10 displacement was
 * measured accurately to 10px and then jumped straight to the 1.0
 * alignment-failure fallback at 12px, while MAX_SHIFT sat at 0.22 * 48 =
 * 10.6px — inside the gap. Nothing could ever score "slightly too fast", so
 * the too-fast branch only ever fired on total alignment failure, which
 * cannot tell a quick pan from the camera being pointed at a different wall.
 *
 * 14 puts the threshold (10.6px) well inside the measurable range. The search
 * is O(SEARCH^2), so this is ~1.9x the work per comparison — affordable, and
 * more than paid for by sampling at 2.5 Hz instead of 6 Hz.
 */
const SEARCH = 14;

// Back-compat named exports. Several call sites and the test suite import
// these directly; they now read from the config object so there is one source.
export const TARGET_FRAMES = SWEEP_CONFIG.targetFrames;
export const MIN_USABLE = SWEEP_CONFIG.minUsable;
export const MIN_SHIFT = SWEEP_CONFIG.minShift;
export const MAX_SHIFT = SWEEP_CONFIG.maxShift;
export const SHARPNESS_FLOOR = SWEEP_CONFIG.sharpnessFloor;
export const SAMPLE_HZ = 1000 / SWEEP_CONFIG.sampleMs;

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

export type ScanState =
  | "idle"
  | "countdown"
  | "capturing"
  | "processing"
  | "complete"
  | "failed";

// ---------------------------------------------------------------------------
// Guidance
// ---------------------------------------------------------------------------

export type SweepHint =
  | "start"
  | "hold_foot_still"
  | "capture_top"
  | "capture_inner"
  | "capture_heel"
  | "capture_outer"
  | "capture_toes"
  | "new_angle"
  | "slow_down"
  | "increase_light"
  | "too_bright"
  | "good"
  | "done";

export const HINT_TEXT: Record<SweepHint, string> = {
  start: "Hold foot still. Move the camera slowly around it.",
  hold_foot_still: "Hold foot still",
  capture_top: "Capture top",
  capture_inner: "Capture inner side",
  capture_heel: "Capture heel",
  capture_outer: "Capture outer side",
  capture_toes: "Back around to the toes",
  new_angle: "Move to a new angle",
  slow_down: "Slow down",
  increase_light: "Increase lighting",
  too_bright: "Too bright — move out of direct light",
  good: "Good — keep moving around",
  done: "Enough coverage captured",
};

/** Corrective prompts take priority over the schedule; flagged for the UI. */
export const CORRECTIVE_HINTS: ReadonlySet<SweepHint> = new Set<SweepHint>([
  "new_angle",
  "slow_down",
  "increase_light",
  "too_bright",
]);

interface Leg {
  untilPct: number;
  hint: SweepHint;
}

/**
 * Where the user should be pointing, as a fraction of the scan elapsed.
 *
 * One lap: top, round the inside, behind the heel, back up the outside. The
 * heel leg is given the least time because it is the shortest arc; the sides
 * get the most because that is where the shape information is.
 */
const SCHEDULE: Leg[] = [
  { untilPct: 0.2, hint: "capture_top" },
  { untilPct: 0.45, hint: "capture_inner" },
  { untilPct: 0.65, hint: "capture_heel" },
  { untilPct: 0.9, hint: "capture_outer" },
  { untilPct: 1.0, hint: "capture_toes" },
];

export function scheduledHint(elapsedMs: number, cfg = SWEEP_CONFIG): SweepHint {
  const pct = cfg.scanMs > 0 ? elapsedMs / cfg.scanMs : 1;
  for (const leg of SCHEDULE) if (pct <= leg.untilPct) return leg.hint;
  return "capture_toes";
}

// ---------------------------------------------------------------------------
// Descriptors, overlap, novelty
// ---------------------------------------------------------------------------

/**
 * A frame reduced to something comparable: zero mean, unit standard deviation.
 *
 * Normalising kills exposure drift, which would otherwise read as a change of
 * viewpoint — the camera auto-exposing as it swings past a window must not
 * count as a new angle.
 */
export function descriptorOf(gray: Float32Array): Float32Array {
  const out = new Float32Array(gray.length);
  let m = 0;
  for (let i = 0; i < gray.length; i++) m += gray[i];
  m /= gray.length || 1;
  let v = 0;
  for (let i = 0; i < gray.length; i++) v += (gray[i] - m) ** 2;
  const sd = Math.sqrt(v / (gray.length || 1)) || 1;
  for (let i = 0; i < gray.length; i++) out[i] = (gray[i] - m) / sd;
  return out;
}

/** Cosine similarity of two descriptors. 1 == indistinguishable. */
export function descriptorSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na < 1e-9 || nb < 1e-9) return 1;
  return Math.max(-1, Math.min(1, dot / Math.sqrt(na * nb)));
}

/**
 * How new this frame is relative to recent accepted frames. 0 == a copy.
 *
 * Checked against a WINDOW rather than only the immediately preceding frame,
 * which is the point. Rocking a camera back and forth produces a sequence
 * where every frame differs from the one before it but the set only contains
 * two viewpoints; comparing against one predecessor cannot see that, and
 * comparing against the recent few can.
 */
export function noveltyOf(
  current: Float32Array,
  recent: readonly Float32Array[]
): number {
  if (recent.length === 0) return 1;
  let maxSim = -1;
  for (const r of recent) {
    const s = descriptorSimilarity(current, r);
    if (s > maxSim) maxSim = s;
  }
  return 1 - maxSim;
}

/**
 * How far the view moved between two frames, as a fraction of frame width.
 *
 * Estimated by finding the (dx, dy) that best aligns the two images — a small
 * block-matching search on normalised grayscale.
 *
 * An earlier version used mean absolute difference. It was wrong in a way
 * worth recording: MAD *saturates*. On textured content a one-pixel shift and
 * a four-pixel shift both score ~0.56, so it could not distinguish "nudged"
 * from "swung round", which is the entire question being asked.
 *
 * Returns 0..1. No usable alignment returns 1 (treated as "moved too far"),
 * which is the safe direction: drop the frame rather than bank one that will
 * not match.
 */
export function frameShift(
  a: Float32Array,
  b: Float32Array,
  w = DELTA_W,
  h = DELTA_H
): number {
  const na = descriptorOf(a);
  const nb = descriptorOf(b);

  let best = Infinity;
  let bestDx = 0;
  let bestDy = 0;

  for (let dy = -SEARCH; dy <= SEARCH; dy++) {
    for (let dx = -SEARCH; dx <= SEARCH; dx++) {
      let acc = 0;
      let n = 0;
      const y0 = Math.max(0, -dy);
      const y1 = Math.min(h, h - dy);
      const x0 = Math.max(0, -dx);
      const x1 = Math.min(w, w - dx);
      for (let y = y0; y < y1; y += 2) {
        const ra = y * w;
        const rb = (y + dy) * w + dx;
        for (let x = x0; x < x1; x += 2) {
          acc += Math.abs(na[ra + x] - nb[rb + x]);
          n++;
        }
      }
      if (n < 40) continue;
      const score = acc / n;
      if (score < best) {
        best = score;
        bestDx = dx;
        bestDy = dy;
      }
    }
  }

  if (!isFinite(best)) return 1;
  // A best alignment this poor means the scene changed rather than moved.
  if (best > 0.9) return 1;

  return Math.min(1, Math.hypot(bestDx, bestDy) / w);
}

// ---------------------------------------------------------------------------
// Per-frame decision
// ---------------------------------------------------------------------------

/**
 * Consecutive "too fast" rejections before the tracking reference is dropped.
 *
 * WHY THIS EXISTS
 * ---------------
 * The overlap check compares each sample against the last BANKED frame, and
 * that reference only advances when something banks. So once alignment is
 * lost the reference goes stale and can never recover on its own: every
 * subsequent sample scores delta = 1 against it, is rejected as too fast, and
 * therefore never becomes the new reference. Two ways that deadlocks:
 *
 *   Mid-lap. One quick swing past the foot loses alignment. From then on the
 *   user sees "Slow down" forever — even holding perfectly still — and the
 *   rest of the lap banks nothing.
 *
 *   Between laps. On a second pass the camera has almost certainly been
 *   repositioned, so the first sample cannot align with where the last lap
 *   ended, and the entire extra lap banks nothing.
 *
 * After this many consecutive failures the reference is dropped and the next
 * good frame re-anchors, exactly as the first frame of a scan does. Three is
 * ~2 seconds at the default cadence: long enough not to fire on a single
 * mistimed sample, short enough that the user does not notice.
 */
export const REANCHOR_AFTER = 3;

/**
 * Tracking state carried between samples.
 *
 * `reanchor` means "ignore the previous banked frame when deciding the next
 * one", which lets the next good frame become the new reference.
 */
export interface TrackingState {
  /** Consecutive too-fast rejections. */
  lost: number;
  reanchor: boolean;
}

export const FRESH_TRACKING: TrackingState = { lost: 0, reanchor: false };

/**
 * Fold one frame's outcome into the tracking state.
 *
 * Pure, so the deadlock this guards against can actually be tested rather
 * than reasoned about — the component holds this in refs and would otherwise
 * only be exercisable through a live camera.
 */
export function trackingAfter(
  state: TrackingState,
  banked: boolean,
  reason: RejectReason | null
): TrackingState {
  if (banked) return FRESH_TRACKING;
  if (reason !== "too_fast") return { ...state, lost: 0 };
  const lost = state.lost + 1;
  return { lost, reanchor: state.reanchor || lost >= REANCHOR_AFTER };
}

/** The reference to compare against, honouring a pending re-anchor. */
export function referenceFor(
  banked: readonly Float32Array[],
  tracking: TrackingState
): Float32Array | null {
  if (tracking.reanchor || banked.length === 0) return null;
  return banked[banked.length - 1];
}

export type RejectReason =
  | "blurry"
  | "too_dark"
  | "too_bright"
  | "duplicate"
  | "no_baseline"
  | "too_fast";

export interface SweepDecision {
  bank: boolean;
  hint: SweepHint;
  reason: RejectReason | null;
  /** Displacement from the previous banked frame, 0..1. */
  delta: number;
  /** 1 - max similarity against the recent window, 0..2. */
  novelty: number;
  sharpness: number;
  luma: number;
}

export interface FrameContext {
  /** Descriptor of the last banked frame, for the overlap check. */
  previous: Float32Array | null;
  /** Descriptors of the last N banked frames, for the duplicate check. */
  recent: readonly Float32Array[];
  bankedCount: number;
  elapsedMs: number;
}

/**
 * Should this sample be kept, and what should the user be told?
 *
 * Checks are ordered by how actionable the resulting instruction is, not by
 * how cheap they are. Telling someone their frame is blurry when the real
 * problem is that the room is dark sends them to fix the wrong thing.
 */
export function decideFrame(
  current: Float32Array,
  ctx: FrameContext,
  sharpness: number,
  luma: number,
  cfg: SweepConfig = SWEEP_CONFIG
): SweepDecision {
  const base = { delta: 0, novelty: 1, sharpness, luma };

  if (ctx.bankedCount >= cfg.targetFrames) {
    return { ...base, bank: false, hint: "done", reason: null };
  }
  if (luma < cfg.lumaMin) {
    return { ...base, bank: false, hint: "increase_light", reason: "too_dark" };
  }
  if (luma > cfg.lumaMax) {
    return { ...base, bank: false, hint: "too_bright", reason: "too_bright" };
  }
  if (sharpness < cfg.sharpnessFloor) {
    // Blur during a sweep is nearly always speed, so say so.
    return { ...base, bank: false, hint: "slow_down", reason: "blurry" };
  }

  const desc = descriptorOf(current);
  const novelty = noveltyOf(desc, ctx.recent);

  // The first sharp, well-exposed frame establishes the reference.
  if (!ctx.previous) {
    return { ...base, novelty, bank: true, hint: "good", reason: null };
  }

  const delta = frameShift(current, ctx.previous);

  if (delta > cfg.maxShift) {
    // Deliberately not banked: a frame this far from its neighbour is the one
    // that breaks matching. Drop it and ask for a slower sweep.
    return { ...base, delta, novelty, bank: false, hint: "slow_down", reason: "too_fast" };
  }
  if (novelty < cfg.noveltyMin) {
    // Near-copy of something already kept. This is the check the old flow
    // lacked, and the reason forty frames of one angle could fill the bar.
    return { ...base, delta, novelty, bank: false, hint: "new_angle", reason: "duplicate" };
  }
  if (delta < cfg.minShift) {
    return { ...base, delta, novelty, bank: false, hint: "new_angle", reason: "no_baseline" };
  }

  return { ...base, delta, novelty, bank: true, hint: "good", reason: null };
}

// ---------------------------------------------------------------------------
// Scan-level validation
// ---------------------------------------------------------------------------

/**
 * How many mutually dissimilar viewpoints the accepted set covers.
 *
 * Greedy single-pass clustering: a frame joins the first cluster whose
 * representative it resembles, or starts a new one. Order-dependent and
 * approximate, which is fine — the question is "roughly how many sides of
 * this foot were seen", and being off by one does not change the answer.
 *
 * Again: an appearance proxy, not an angle. See the file header.
 */
export function viewpointSpread(
  descriptors: readonly Float32Array[],
  cfg: SweepConfig = SWEEP_CONFIG
): number {
  const reps: Float32Array[] = [];
  for (const d of descriptors) {
    let joined = false;
    for (const r of reps) {
      if (1 - descriptorSimilarity(d, r) < cfg.viewpointRadius) {
        joined = true;
        break;
      }
    }
    if (!joined) reps.push(d);
  }
  return reps.length;
}

export type ScanFailure = "insufficient_frames" | "insufficient_variation";

export interface ScanVerdict {
  ok: boolean;
  failure: ScanFailure | null;
  /** One line, shown to the user as-is. */
  title: string;
  /** What to do differently next time. */
  advice: string;
  acceptedCount: number;
  viewpoints: number;
  /** Frames still short of the floor. 0 when the count is already fine. */
  shortBy: number;
}

export type RejectTally = Partial<Record<RejectReason, number>>;

/**
 * Turn the reject tally into the one instruction most likely to help.
 *
 * Generic advice is worse than none: a scan that lost frames to darkness was
 * previously told to "move more slowly", which fixes nothing and costs the
 * user another lap to find that out. Whatever dominated the rejections is
 * what gets said.
 */
function adviceFor(rejects: RejectTally): string | null {
  const ranked = (Object.entries(rejects) as [RejectReason, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return null;
  const [reason, n] = ranked[0];
  switch (reason) {
    case "too_dark":
      return `${n} frames were too dark — turn on more light or move somewhere brighter.`;
    case "too_bright":
      return `${n} frames were overexposed — move out of direct light.`;
    case "blurry":
      return `${n} frames were blurry — hold the camera steadier and move more smoothly.`;
    case "too_fast":
      return `${n} frames were taken while swinging too fast — slow the lap down.`;
    case "duplicate":
    case "no_baseline":
      return `${n} frames repeated an angle already captured — keep the camera moving around the foot.`;
    default:
      return null;
  }
}

/**
 * Did this scan capture something reconstructable?
 *
 * Frame count alone is not the test — it was the test before, and it passed a
 * scan that could not be reconstructed. Both conditions have to hold.
 */
export interface ValidateOptions {
  /**
   * Descriptors of EVERY sample taken, banked or not.
   *
   * Diversity must be judged on this, never on the banked set. Banking
   * selects for novelty, so measuring novelty across banked frames asks a
   * question whose answer was already decided by the filter — it reports high
   * diversity almost by construction.
   *
   * That is not hypothetical. Measured on three real captures: the banked set
   * reported 13 distinct viewpoints out of 14 frames, while the same video
   * sampled uniformly gave a spread of 1. The scan was nearly static; picking
   * the 14 most-different moments out of a static video makes it look like an
   * orbit. Reconstruction sees the uniform sample, so that is what decides.
   *
   * Defaults to the banked set when omitted, which is only correct for tests
   * that construct descriptors directly.
   */
  samples?: readonly Float32Array[];
  rejects?: RejectTally;
}

export function validateScan(
  descriptors: readonly Float32Array[],
  opts: ValidateOptions = {},
  cfg: SweepConfig = SWEEP_CONFIG
): ScanVerdict {
  const { samples = descriptors, rejects = {} } = opts;
  const acceptedCount = descriptors.length;
  const viewpoints = viewpointSpread(samples, cfg);
  const shortBy = Math.max(0, cfg.minUsable - acceptedCount);

  if (acceptedCount < cfg.minUsable) {
    // Frame count is a reliable client-side fact — it is a count. The
    // viewpoint figure beside it is NOT equally reliable: it is measured on a
    // 48x36 thumbnail of a live camera frame and is sensitive to sensor noise
    // in a way the server's is not. On three real captures this device
    // reported 13 viewpoints where the service, scoring the same recording,
    // reported 1.
    //
    // So this states what was counted and what is still needed, and does not
    // congratulate the user on camera work it cannot vouch for. The
    // authoritative diversity check runs server-side during processing.
    const lead =
      `${acceptedCount} usable frame${acceptedCount === 1 ? "" : "s"} kept so far — ` +
      `${shortBy} more needed before a model can be built.`;
    const why = adviceFor(rejects);
    return {
      ok: false,
      failure: "insufficient_frames",
      title: "Almost there",
      advice: why ? `${lead} ${why}` : lead,
      acceptedCount,
      viewpoints,
      shortBy,
    };
  }
  if (viewpoints < cfg.minViewpoints) {
    return {
      ok: false,
      failure: "insufficient_variation",
      title: "Not enough viewpoint variation",
      advice: `The ${acceptedCount} frames captured cover only about ${viewpoints} angles, so there is no depth to build from. Move camera farther around the foot and rescan.`,
      acceptedCount,
      viewpoints,
      shortBy: 0,
    };
  }
  return {
    ok: true,
    failure: null,
    title: "Scan complete",
    advice: `${acceptedCount} usable frames across roughly ${viewpoints} viewpoints.`,
    acceptedCount,
    viewpoints,
    shortBy: 0,
  };
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

/**
 * 0..1 for the bar.
 *
 * Frames AND viewpoints, weighted equally, because either one alone is a bar
 * that lies. Counting frames only is what let a stationary camera reach 100%.
 */
export function sweepProgress(
  bankedCount: number,
  viewpoints: number,
  cfg: SweepConfig = SWEEP_CONFIG
): number {
  const byFrames = Math.min(1, bankedCount / cfg.targetFrames);
  const byViews = Math.min(1, viewpoints / cfg.minViewpoints);
  return Math.min(1, byFrames * 0.5 + byViews * 0.5);
}

export function canReconstruct(
  bankedCount: number,
  viewpoints: number,
  cfg: SweepConfig = SWEEP_CONFIG
): boolean {
  return bankedCount >= cfg.minUsable && viewpoints >= cfg.minViewpoints;
}
