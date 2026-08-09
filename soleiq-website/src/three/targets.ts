import * as THREE from 'three'
import type { TargetKey } from './scenes'
import {
  compose,
  makeRng,
  maskFromDraw,
  maskFromImage,
  maskFromText,
  normalize,
  applyTransform,
  sampleCurve,
  sampleLattice,
  sampleCloud,
  sampleMask,
  sampleMesh,
  type BuiltTarget,
  type Mask,
  type Target,
} from './sampleTargets'

/**
 * Builds one Float32Array per scene, all with exactly the same particle count so
 * index i is the same particle throughout the story.
 *
 * Everything is drawn rather than loaded, except the logo, which is sampled from
 * the real SoleIQ artwork by luminance (it is light line-work on a dark field,
 * so there is no alpha channel to sample).
 */

/* ── Foot silhouette, shared by scenes 1, 2, 3 and 5 ──────────────────────── */

const SOLE_PATH =
  'M 30 70 C 30 50 92 50 92 76 C 92 96 80 106 76 122 C 72 140 80 152 78 162 ' +
  'C 76 180 64 188 52 188 C 38 188 28 178 28 162 C 28 146 36 138 36 120 ' +
  'C 36 100 30 90 30 70 Z'

const TOES = [
  { cx: 84, cy: 42, rx: 10, ry: 13, rot: -14 },
  { cx: 66, cy: 32, rx: 8, ry: 10.5, rot: -8 },
  { cx: 51, cy: 30, rx: 7, ry: 9.5, rot: 0 },
  { cx: 38, cy: 33, rx: 6.5, ry: 8.5, rot: 8 },
  { cx: 27, cy: 41, rx: 6, ry: 7.5, rot: 16 },
]

function drawFoot(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save()
  ctx.scale(scale, scale)
  ctx.fill(new Path2D(SOLE_PATH))
  for (const t of TOES) {
    ctx.beginPath()
    ctx.ellipse(t.cx, t.cy, t.rx, t.ry, (t.rot * Math.PI) / 180, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

let footMaskCache: Mask | null = null
function footMask(): Mask {
  if (!footMaskCache) {
    const S = 4 // 120 x 200 viewBox at 4x
    footMaskCache = maskFromDraw(120 * S, 200 * S, (ctx) => drawFoot(ctx, S))
  }
  return footMaskCache
}

/** A solid foot: silhouette in x/y, thickness field driving z. */
function footVolume(
  n: number,
  rng: () => number,
  opts: { width?: number; depth?: number; offset?: [number, number, number] } = {}
): Target {
  return sampleMask(footMask(), n, {
    rng,
    width: opts.width ?? 1.9,
    // Shallow on purpose: a foot is a shell with an arch, not a block. Too much
    // depth and the shape reads as a slab the moment the cloud turns.
    depth: opts.depth ?? 0.3,
    offset: opts.offset,
  })
}

/* ── Clinician silhouette, for the handover scene ─────────────────────────── */

// Head, shoulders and a coat. Drawn rather than modelled, for the same reason
// the foot is: a silhouette sampled to points reads as a person at a glance,
// where a low-poly body reads as a mannequin.
const TORSO_PATH =
  'M 60 64 C 41 64 26 79 22 106 L 17 172 L 103 172 L 98 106 C 94 79 79 64 60 64 Z'

function drawClinician(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save()
  ctx.scale(scale, scale)
  ctx.beginPath()
  ctx.arc(60, 36, 20, 0, Math.PI * 2)
  ctx.fill()
  ctx.fill(new Path2D(TORSO_PATH))
  ctx.restore()
}

let clinicianMaskCache: Mask | null = null
function clinicianMask(): Mask {
  if (!clinicianMaskCache) {
    const S = 4
    clinicianMaskCache = maskFromDraw(120 * S, 190 * S, (ctx) => drawClinician(ctx, S))
  }
  return clinicianMaskCache
}

function figureVolume(
  n: number,
  rng: () => number,
  opts: { width?: number; depth?: number; offset?: [number, number, number] } = {}
): Target {
  return sampleMask(clinicianMask(), n, {
    rng,
    width: opts.width ?? 1.1,
    depth: opts.depth ?? 0.24,
    offset: opts.offset,
  })
}

/* ── Primitive geometry helpers ───────────────────────────────────────────── */

function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

function slab(
  n: number,
  rng: () => number,
  opts: {
    w: number
    h: number
    d: number
    r?: number
    position?: [number, number, number]
    rotation?: [number, number, number]
  }
): Target {
  const geo = new THREE.ExtrudeGeometry(roundedRectShape(opts.w, opts.h, opts.r ?? 0.06), {
    depth: opts.d,
    bevelEnabled: false,
    curveSegments: 12,
  })
  geo.translate(0, 0, -opts.d / 2)

  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(...(opts.rotation ?? [0, 0, 0]))
  )
  m.compose(
    new THREE.Vector3(...(opts.position ?? [0, 0, 0])),
    q,
    new THREE.Vector3(1, 1, 1)
  )
  return sampleMesh(geo, n, { rng, matrix: m, jitter: 0.006 })
}

/** Outline of a rectangle, as points on its four edges. */
function frameOutline(
  n: number,
  rng: () => number,
  opts: {
    w: number
    h: number
    position: [number, number, number]
    corner?: number
    /** Half-width of the drawn edge. The default is a hairline. */
    stroke?: number
  }
): Target {
  const [ox, oy, oz] = opts.position
  const out = new Float32Array(n * 3)
  const { w, h } = opts
  const corner = opts.corner ?? 0
  const perim = 2 * (w + h)

  for (let i = 0; i < n; i++) {
    let t = rng() * perim
    let x: number
    let y: number
    if (corner > 0 && rng() > 0.55) {
      // Bias points toward the corner ticks so the frame reads as a viewfinder.
      const cx = rng() < 0.5 ? -w / 2 : w / 2
      const cy = rng() < 0.5 ? -h / 2 : h / 2
      const along = rng() * corner
      if (rng() < 0.5) {
        x = cx + (cx < 0 ? along : -along)
        y = cy
      } else {
        x = cx
        y = cy + (cy < 0 ? along : -along)
      }
    } else if (t < w) {
      x = t - w / 2
      y = -h / 2
    } else if ((t -= w) < h) {
      x = w / 2
      y = t - h / 2
    } else if ((t -= h) < w) {
      x = w / 2 - t
      y = h / 2
    } else {
      t -= w
      x = -w / 2
      y = h / 2 - t
    }
    const stroke = opts.stroke ?? 0.008
    out[i * 3] = x + ox + (rng() - 0.5) * stroke
    out[i * 3 + 1] = y + oy + (rng() - 0.5) * stroke
    out[i * 3 + 2] = oz + (rng() - 0.5) * Math.max(0.01, stroke * 0.5)
  }
  return out
}

/** A tight cluster — a finding marker, a tick, a data node. */
function blob(
  n: number,
  rng: () => number,
  center: [number, number, number],
  radius: number
): Target {
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const u = rng() * 2 - 1
    const th = rng() * Math.PI * 2
    const r = radius * Math.cbrt(rng())
    const s = Math.sqrt(1 - u * u)
    out[i * 3] = center[0] + r * s * Math.cos(th)
    out[i * 3 + 1] = center[1] + r * s * Math.sin(th)
    out[i * 3 + 2] = center[2] + r * u
  }
  return out
}

/** Repeated rows — a report, a list of intake fields. */
function rows(
  n: number,
  rng: () => number,
  opts: {
    count: number
    width: number
    gap: number
    position: [number, number, number]
    /** Vary row length so the block reads as a report, not a rectangle. */
    jitterWidth?: boolean
  }
): Target {
  const [ox, oy, oz] = opts.position
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const row = (rng() * opts.count) | 0
    const w = opts.width * (opts.jitterWidth ? 0.45 + 0.55 * ((row * 37) % 10) / 10 : 1)
    out[i * 3] = ox - opts.width / 2 + rng() * w
    out[i * 3 + 1] = oy - (row - (opts.count - 1) / 2) * opts.gap + (rng() - 0.5) * 0.012
    out[i * 3 + 2] = oz + (rng() - 0.5) * 0.012
  }
  return out
}

/* ── Scene targets ────────────────────────────────────────────────────────── */

/**
 * The lesion on the sole: a crack with a blister swelling around it.
 *
 * `spin` turns the whole patch about its own centre. Walked through a loop it
 * churns the white points over each other without the patch itself going
 * anywhere, which is the only way to say "something is happening here" on a
 * shape that is otherwise held still — a foot that pulsed or grew would be
 * claiming a measurement the scene has not made.
 *
 * Its own rng, seeded here rather than threaded in, so the same keyframe can
 * be rebuilt on its own at runtime and land on the same points.
 */
// On the ball of the foot, just proud of the surface — the scene turns through
// a shallow arc, and a patch floating clear of the sole separates as it does.
const LESION_AT: [number, number, number] = [0.24, 0.2, 0.19]
function lesion(n: number, spin: number): Target {
  const rng = makeRng(1101)
  const out = new Float32Array(n * 3)
  const cos = Math.cos(spin)
  const sin = Math.sin(spin)
  for (let i = 0; i < n; i++) {
    let x: number
    let y: number
    if (i % 5 < 2) {
      // The fissure: a short ragged split through the middle of the patch.
      const t = rng() * 2 - 1
      x = t * 0.115
      y = Math.sin(t * 4.1) * 0.022 + (rng() - 0.5) * 0.016
    } else {
      // The blister around it: a ring, denser at the rim than the centre.
      const th = rng() * Math.PI * 2
      const r = 0.055 + 0.062 * Math.sqrt(rng())
      x = Math.cos(th) * r
      y = Math.sin(th) * r * 0.82
    }
    out[i * 3] = LESION_AT[0] + x * cos - y * sin
    out[i * 3 + 1] = LESION_AT[1] + x * sin + y * cos
    out[i * 3 + 2] = LESION_AT[2] + (rng() - 0.5) * 0.03
  }
  return out
}

/**
 * `spin` is where the lesion has turned to, 0 to 1 over a full revolution.
 */
function buildFoot(count: number, spin = 0): BuiltTarget {
  const rng = makeRng(11)
  return normalize(
    compose(count, [
      { weight: 0.97, tone: 0.72, build: (n) => footVolume(n, rng, { width: 2.0, depth: 0.34 }) },
      // The one thing on this foot that a person with neuropathy would not
      // feel. It moves, so it is kept out of the normalise measurement.
      {
        weight: 0.03,
        tone: 1,
        toneJitter: 0.05,
        ai: 0,
        label: 'lesion',
        build: (n) => lesion(n, spin * Math.PI * 2),
      },
    ]),
    1.75,
    { ignore: 'lesion' }
  )
}

/** Where the four capture frames sit on the phone screen. */
const SHOT_AT: [number, number][] = [
  [-0.28, 1.2],
  [0.28, 1.2],
  [-0.28, 0.4],
  [0.28, 0.4],
]

/**
 * The white outline laid over whichever frame is being taken.
 *
 * Its own rng so a keyframe can be rebuilt standalone at runtime — the shared
 * one has been advanced by every part before it, and that state is not
 * something anything outside this function can reproduce.
 */
function captureFlash(n: number, shot: number): Target {
  const rng = makeRng(2301)
  const [fx, fy] = SHOT_AT[((shot % 4) + 4) % 4]
  // Thick and a size larger than the frame beneath it. The lit frame used to
  // be redrawn bolder in place, which meant its particles jumped every time
  // the light moved on. All of that boldness lives here now, in the one part
  // that is supposed to be travelling.
  return frameOutline(n, rng, {
    w: 0.5,
    h: 0.675,
    corner: 0.2,
    stroke: 0.05,
    position: [fx, fy, 0.84],
  })
}

/**
 * `shot` is which of the four captures is being taken right now, 0 to 3.
 *
 * Only the lit frame's colour changes between keyframes — every particle stays
 * exactly where it is, and the highlight travels by the tone and accent being
 * interpolated rather than by anything moving.
 */
function buildCapture(count: number, shot = 0): BuiltTarget {
  const rng = makeRng(23)
  // The phone is held above the foot; the four captures land inside its screen
  // as a 2 x 2 set — right top, right sole, left top, left sole.
  const PHONE_Y = 0.78
  return normalize(
    compose(count, [
      // The foot below, still behind the phone but not by as much.
      //
      // It was losing on three counts at once: low on the tone ramp, thinly
      // populated, and far enough back that the depth fade took nearly half
      // its brightness. All three are eased — it stays behind the phone, it
      // just is not swallowed by the dark any more.
      {
        weight: 0.44,
        tone: 0.74,
        toneJitter: 0.14,
        build: (n) => footVolume(n, rng, { width: 1.3, depth: 0.18, offset: [0, -1.2, 0.02] }),
      },
      // The phone.
      {
        // Dark body, so the lit screen on it reads as a screen.
        weight: 0.26,
        tone: 0.32,
        ai: 0,
        label: 'phone',
        build: (n) =>
          slab(n, rng, {
            w: 1.24,
            h: 2.12,
            d: 0.1,
            r: 0.15,
            position: [0, PHONE_Y, 0.7],
            rotation: [-0.16, 0, 0],
          }),
      },
      // The four capture frames, on the screen: right foot top, right sole,
      // left top, left sole, in the order the app asks for them. They never
      // change. Which one is being taken is said entirely by the white
      // outline that travels between them.
      ...SHOT_AT.map(([x, y]) => ({
        weight: 0.055,
        tone: 0.86,
        toneJitter: 0.1,
        ai: 0.95,
        build: (n: number) =>
          frameOutline(n, rng, {
            w: 0.44,
            h: 0.6,
            corner: 0.14,
            stroke: 0.008,
            position: [x, y, 0.79] as [number, number, number],
          }),
      })),
      // The flash on whichever frame is being taken.
      //
      // Brightness under additive blending is density, and the four frames
      // cannot lend each other particles — their shares are what tie a
      // particle to a frame. So this is a part of its own, a constant size
      // that simply moves to the lit frame, laying a tight bright core over
      // the softer edge already there. It moves, so it is kept out of the
      // normalise measurement; otherwise the whole picture would shuffle
      // after it every time the light changed frames.
      {
        weight: 0.1,
        tone: 1,
        toneJitter: 0,
        ai: 0,
        label: 'flash',
        build: (n) => captureFlash(n, shot),
      },
      // The beam from the phone down to the foot.
      {
        weight: 0.09,
        tone: 0.72,
        ai: 1,
        build: (n) =>
          sampleCurve(
            (t) => [
              (rng() - 0.5) * (0.25 + t * 0.9),
              PHONE_Y - 0.95 - t * 1.05,
              0.6 - t * 0.9,
            ],
            n,
            { rng, radius: 0.03 }
          ),
      },
    ]),
    1.8,
    { ignore: 'flash' }
  )
}

/**
 * The three finding sites, all of them on the foot.
 *
 * The third used to sit at x 0.5, which at that height is about seven tenths
 * of a foot-width clear of the silhouette — the sole only reaches x 0.24 at
 * the arch. It is now on the first metatarsal head, which is both inside the
 * shape and the site these actually turn up on.
 */
const FINDINGS: [number, number, number][] = [
  [0.42, 0.86, 0.16], // hallux
  [-0.05, -0.92, 0.13], // heel
  [0.21, 0.16, 0.1], // first metatarsal head
]

/** The dot that travels the findings, lighting each one as it arrives. */
function findingPulse(n: number, at: number): Target {
  const rng = makeRng(3701)
  const [x, y, r] = FINDINGS[((at % FINDINGS.length) + FINDINGS.length) % FINDINGS.length]
  return blob(n, rng, [x, y, 0.4], r * 0.62)
}

function buildAnalysis(count: number, at = 0): BuiltTarget {
  const rng = makeRng(37)
  const mask = footMask()

  // Height of the foot surface at a world-space point, so the grid can lie on it.
  const sampleThickness = (x: number, y: number): number => {
    const px = Math.round((x / 1.6 + 0.5) * mask.width)
    const py = Math.round((0.5 - y / (1.6 * (mask.height / mask.width))) * mask.height)
    if (px < 0 || py < 0 || px >= mask.width || py >= mask.height) return 0
    return mask.thickness[py * mask.width + px]
  }

  return normalize(
    compose(count, [
      // The foot itself, quietly present.
      { weight: 0.3, tone: 0.66, build: (n) => footVolume(n, rng, { width: 1.6, depth: 0.22 }) },
      // The analysis mesh, conforming to the surface.
      {
        // The model's read of the surface — the most purple thing on screen.
        weight: 0.34,
        tone: 0.78,
        ai: 1,
        label: 'mesh',
        build: (n) =>
          sampleLattice(n, {
            rng,
            width: 1.75,
            height: 2.9,
            cols: 14,
            rows: 24,
            warp: (x, y) => 0.62 * sampleThickness(x, y) + 0.02,
          }),
      },
      // Finding markers, at plausible high-pressure sites.
      ...FINDINGS.map(([x, y, r]) => ({
        weight: 0.06,
        tone: 1,
        toneJitter: 0.02,
        ai: 1,
        build: (n: number) => blob(n, rng, [x, y, 0.32], r),
      })),
      // The read travelling between them. A separate part of fixed size that
      // simply moves, for the same reason the capture flash is one: a marker
      // cannot brighten by taking particles from its neighbours without those
      // particles jumping across the foot to get there.
      {
        weight: 0.05,
        tone: 1,
        toneJitter: 0,
        ai: 0,
        label: 'pulse',
        build: (n: number) => findingPulse(n, at),
      },
      // The screening level resolving as a bar with four segments.
      {
        weight: 0.18,
        tone: 0.58,
        ai: 1,
        label: 'level',
        build: (n) =>
          sampleLattice(n, {
            rng,
            width: 1.5,
            height: 0.11,
            cols: 4,
            rows: 1,
            lineOnly: false,
            offset: [0, -1.55, 0.35],
          }),
      },
    ]),
    1.7,
    { ignore: 'pulse' }
  )
}

/** The path the record takes from the phone to the dashboard. */
const STREAM = (u: number): [number, number, number] => [
  1.95 - 2.5 * u,
  -0.35 + 1.4 * Math.pow(u, 1.6),
  0.35 + Math.sin(u * Math.PI) * 0.55,
]

/** The courier on the current. Its own rng, so it can be rebuilt standalone. */
function streamPacket(n: number, flow: number): Target {
  const rng = makeRng(5301)
  const [x, y, z] = STREAM(Math.min(1, Math.max(0, flow)))
  return blob(n, rng, [x, y, z], 0.1)
}

/**
 * `flow` is where the travelling packet has got to along the current, 0 to 1.
 *
 * Only the packet moves. Every other part is built from the same seed in the
 * same order across keyframes, so the laptop, the record, the current itself
 * and the two clinicians land on identical coordinates and stay put.
 */
function buildClinician(count: number, flow = 0): BuiltTarget {
  const rng = makeRng(53)
  return normalize(
    compose(count, [
      // Laptop screen.
      {
        weight: 0.13,
        tone: 0.38,
        ai: 0,
        build: (n) =>
          slab(n, rng, {
            w: 2.9,
            h: 1.85,
            d: 0.07,
            r: 0.07,
            position: [-0.25, 0.6, 0],
            rotation: [-0.12, 0, 0],
          }),
      },
      // Laptop base.
      {
        weight: 0.07,
        tone: 0.6,
        build: (n) =>
          slab(n, rng, {
            w: 2.9,
            h: 1.25,
            d: 0.06,
            r: 0.06,
            position: [-0.25, -0.5, 0.5],
            rotation: [-1.42, 0, 0],
          }),
      },
      // The record itself: rows of intake fields and findings.
      {
        weight: 0.2,
        tone: 0.82,
        ai: 1,
        label: 'record',
        build: (n) =>
          rows(n, rng, {
            count: 9,
            width: 2.3,
            gap: 0.17,
            position: [-0.25, 0.62, 0.06],
            jitterWidth: true,
          }),
      },
      // The patient's photo, findings mapped onto it, inside the report.
      {
        weight: 0.11,
        tone: 0.64,
        build: (n) =>
          footVolume(n, rng, { width: 0.62, depth: 0.16, offset: [0.78, 0.62, 0.08] }),
      },
      // A companion phone.
      {
        weight: 0.08,
        tone: 0.6,
        ai: 0,
        build: (n) =>
          slab(n, rng, {
            w: 0.72,
            h: 1.45,
            d: 0.09,
            r: 0.12,
            position: [1.95, -0.35, 0.35],
            rotation: [-0.1, -0.35, 0.06],
          }),
      },
      // The data current streaming from phone to dashboard. It stays where it
      // is; what moves along it is the courier below.
      {
        weight: 0.16,
        tone: 0.9,
        ai: 1,
        build: (n) => sampleCurve((t) => STREAM(t), n, { rng, radius: 0.16 }),
      },
      // One packet, carried along the current and back again. White rather
      // than the current's blue, so it reads as a thing travelling the line
      // instead of a brighter piece of the line.
      {
        weight: 0.035,
        tone: 1,
        toneJitter: 0,
        ai: 0,
        label: 'packet',
        build: (n) => streamPacket(n, flow),
      },
      // The two clinicians it lands with. The scene is called "handover", and a
      // handover with nobody in it is just a laptop.
      {
        weight: 0.17,
        tone: 0.66,
        label: 'doctors',
        build: (n) =>
          figureVolume(n, rng, { width: 1.2, offset: [-2.1, -0.1, -0.25] }),
      },
      {
        weight: 0.12,
        tone: 0.5,
        build: (n) =>
          figureVolume(n, rng, { width: 1.0, offset: [-2.95, -0.3, -0.55] }),
      },
    ]),
    1.95,
    { ignore: 'packet' }
  )
}

/* The series the timeline plots. Module scope so the marker can be rebuilt on
   its own at runtime and still land on the curve. */
const STOPS = 6
const SPAN = 4.2
/** A risk score coming down over the series — illustrative, and labelled as such. */
const level = (i: number) => 0.95 - 0.135 * i - 0.02 * Math.sin(i * 2.1)

/** Height of the curve at `at`, 0 to 1 across the series. */
function curveY(at: number): number {
  const k = Math.min(1, Math.max(0, at)) * (STOPS - 1)
  const i = Math.min(STOPS - 2, Math.floor(k))
  const f = k - i
  return 0.55 + (level(i) * (1 - f) + level(i + 1) * f) * 0.95
}

/** The reading walking the curve. Its own rng, so it can be rebuilt alone. */
function curveMarker(n: number, at: number): Target {
  const rng = makeRng(7101)
  const t = Math.min(1, Math.max(0, at))
  return blob(n, rng, [(t - 0.5) * SPAN, curveY(t), 0.05], 0.1)
}

/**
 * `at` is which screening the marker is sitting on, 0 to 1 across the series.
 *
 * Only the marker moves between keyframes: every other part is built from the
 * same seed in the same order, so its particles land on identical coordinates
 * each time and the morph leaves them exactly where they are.
 */
function buildTimeline(count: number, at = 0): BuiltTarget {
  const rng = makeRng(71)

  return normalize(
    compose(count, [
      // The axis.
      {
        weight: 0.05,
        tone: 0.58,
        build: (n) =>
          sampleCurve((t) => [(t - 0.5) * SPAN, -1.15, 0], n, { rng, radius: 0.018 }),
      },
      // Ticks under each screening.
      {
        weight: 0.05,
        tone: 0.34,
        build: (n) => {
          const out = new Float32Array(n * 3)
          for (let i = 0; i < n; i++) {
            const k = (rng() * STOPS) | 0
            const x = (k / (STOPS - 1) - 0.5) * SPAN
            out[i * 3] = x + (rng() - 0.5) * 0.012
            out[i * 3 + 1] = -1.15 + (rng() - 0.5) * 0.14
            out[i * 3 + 2] = (rng() - 0.5) * 0.012
          }
          return out
        },
      },
      // A foot snapshot at each stop, each one a little further along. They
      // are identical in every keyframe — the lit one is lit by the overlay
      // below, not by being redrawn.
      ...Array.from({ length: STOPS }, (_, i) => ({
        weight: 0.075,
        tone: 0.4,
        toneJitter: 0.08,
        ai: 0,
        // Labelled so the marker's own keyframe can brighten this foot in
        // place. Brightness is not movement, and it is the only way to say
        // "this screening" without a second thing crossing the frame.
        label: `stop${i}`,
        build: (n: number) =>
          footVolume(n, rng, {
            width: 0.5,
            depth: 0.16,
            offset: [(i / (STOPS - 1) - 0.5) * SPAN, -0.55, 0],
          }),
      })),
      // The descending curve, drawn through the level at each stop.
      {
        weight: 0.3,
        tone: 0.92,
        ai: 0.95,
        label: 'curve',
        build: (n) =>
          sampleCurve(
            (t) => {
              const x = (t - 0.5) * SPAN
              const k = t * (STOPS - 1)
              const i = Math.min(STOPS - 2, Math.floor(k))
              const f = k - i
              const y = 0.55 + (level(i) * (1 - f) + level(i + 1) * f) * 0.95
              return [x, y, 0]
            },
            n,
            { rng, radius: 0.045 }
          ),
      },
      // Nodes on the curve at each screening.
      {
        weight: 0.1,
        tone: 1,
        toneJitter: 0.03,
        ai: 1,
        build: (n) => {
          const per = Math.max(1, Math.floor(n / STOPS))
          const out = new Float32Array(n * 3)
          for (let i = 0; i < n; i++) {
            const k = Math.min(STOPS - 1, (i / per) | 0)
            const b = blob(
              1,
              rng,
              [(k / (STOPS - 1) - 0.5) * SPAN, 0.55 + level(k) * 0.95, 0],
              0.075
            )
            out[i * 3] = b[0]
            out[i * 3 + 1] = b[1]
            out[i * 3 + 2] = b[2]
          }
          return out
        },
      },
      // The marker, walking the curve from the first screening to the last.
      {
        weight: 0.05,
        tone: 1,
        toneJitter: 0,
        ai: 0,
        label: 'marker',
        build: (n) => curveMarker(n, at),
      },
      // A faint horizon, which the day/night cycle lights.
      {
        weight: 0.05,
        tone: 0.12,
        build: (n) =>
          sampleLattice(n, {
            rng,
            width: SPAN * 1.35,
            height: 0.015,
            cols: 1,
            rows: 1,
            lineOnly: false,
            offset: [0, -1.65, -0.6],
          }),
      },
    ]),
    2.1,
    { ignore: 'marker' }
  )
}

async function buildLogo(count: number): Promise<BuiltTarget> {
  const rng = makeRng(97)
  const word = maskFromText('SoleIQ', {
    size: 900,
    font: '600 190px "Inter Tight", Inter, system-ui, sans-serif',
  })
  // Rasterised as its own line rather than as part of "SoleIQ Health".
  // A word a third of the height, sampled from the same raster as the big one,
  // arrives with a third of the pixels to place particles on and comes out as
  // mush. Its own mask gets its own resolution.
  const sub = maskFromText('Health', {
    size: 900,
    font: '500 190px "Inter Tight", Inter, system-ui, sans-serif',
    letterSpacing: '18px',
  })

  // The artwork is light line-work on a dark navy field, so it is sampled by
  // luminance rather than alpha. If it cannot be loaded the wordmark alone still
  // makes a legible final scene — a missing asset must not cost us the ending.
  let mark: Mask | null = null
  try {
    mark = await maskFromImage('/soleiq-mark.png', {
      size: 420,
      mode: 'luminance',
      threshold: 0.5,
    })
  } catch (err) {
    console.warn('[soleiq] logo mark unavailable, falling back to the wordmark:', err)
  }

  if (!mark) {
    return normalize(
      compose(count, [
        {
          weight: 1,
          tone: 0.75,
          ai: 0.2,
          build: (n) => sampleMask(word, n, { rng, width: 2.6, depth: 0.06 }),
        },
      ]),
      1.5
    )
  }

  return normalize(
    compose(count, [
      {
        weight: 0.68,
        // Below the white end of the ramp, so the colour wave shows on the mark.
        tone: 0.45,
        toneJitter: 0.5,
        ai: 0.28,
        build: (n) =>
          sampleMask(mark, n, { rng, width: 2.1, depth: 0.13, offset: [0, 0.55, 0] }),
      },
      {
        weight: 0.29,
        // Top of the ramp, which on the logo scene is white.
        tone: 1,
        toneJitter: 0.03,
        ai: 0,
        build: (n) =>
          sampleMask(word, n, { rng, width: 2.4, depth: 0.05, offset: [0, -1.0, 0] }),
      },
      {
        // "Health", set under the wordmark on the centre line.
        //
        // Stacked rather than alongside: the composition is already a vertical
        // one, and a small word set beside a large one leaves the whole thing
        // hanging off to one side. Kept at the white end of the ramp with the
        // wordmark, so the colour wave runs through the mark alone.
        weight: 0.07,
        tone: 0.98,
        toneJitter: 0.03,
        ai: 0,
        build: (n) =>
          sampleMask(sub, n, { rng, width: 0.98, depth: 0.04, offset: [0, -1.62, 0] }),
      },
    ]),
    1.6
  )
}


/* ── Section compositions ─────────────────────────────────────────────────── */
/*
 * These three are not part of the scroll narrative. They sit beside the copy in
 * the "In practice" and "Research" sections, each one a picture of the thing
 * that section is about. Two of them animate, and both do it through the morph
 * the shader already has: a target pair and a progress value, looped. Nothing
 * new was added to the vertex shader for this.
 */

/** A cottage: pitched roof, chimney, door, one lit window. */
function cottage(n: number, rng: () => number, at: [number, number]): Target {
  const [cx, cy] = at
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const r = rng()
    let x: number
    let y: number
    if (r < 0.34) {
      // Walls, as an outline so the house reads as drawn rather than solid.
      const t = rng() * 4
      const w = 0.62
      const h = 0.46
      if (t < 1) { x = -w / 2 + (t % 1) * w; y = -h / 2 }
      else if (t < 2) { x = -w / 2 + (t % 1) * w; y = h / 2 }
      else if (t < 3) { x = -w / 2; y = -h / 2 + (t % 1) * h }
      else { x = w / 2; y = -h / 2 + (t % 1) * h }
    } else if (r < 0.6) {
      // Roof: two slopes meeting at a ridge.
      const t = rng()
      const side = rng() < 0.5 ? -1 : 1
      x = side * (0.38 - t * 0.38)
      y = 0.23 + t * 0.3
    } else if (r < 0.68) {
      // Chimney.
      x = 0.2 + (rng() - 0.5) * 0.07
      y = 0.4 + rng() * 0.16
    } else if (r < 0.82) {
      // Door.
      const t = rng() * 3
      if (t < 1) { x = -0.1; y = -0.23 + (t % 1) * 0.24 }
      else if (t < 2) { x = 0.02; y = -0.23 + (t % 1) * 0.24 }
      else { x = -0.1 + (t % 1) * 0.12; y = 0.01 }
    } else {
      // Window, filled — the one lit thing in the picture.
      x = 0.12 + (rng() - 0.5) * 0.16
      y = -0.02 + (rng() - 0.5) * 0.16
    }
    out[i * 3] = cx + x
    out[i * 3 + 1] = cy + y
    out[i * 3 + 2] = (rng() - 0.5) * 0.05
  }
  return out
}

/** A bare tree beside the house: trunk and a few boughs. */
function tree(n: number, rng: () => number, at: [number, number], scale = 1): Target {
  const [cx, cy] = at
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const r = rng()
    let x: number
    let y: number
    if (r < 0.34) {
      x = (rng() - 0.5) * 0.03
      y = -0.28 + rng() * 0.42
    } else {
      // Boughs fanning from the top of the trunk.
      const branch = Math.floor(rng() * 5)
      const angle = -0.9 + branch * 0.45
      const t = rng()
      x = Math.sin(angle) * t * 0.3
      y = 0.14 + Math.cos(angle) * t * 0.32
    }
    out[i * 3] = cx + x * scale
    out[i * 3 + 1] = cy + y * scale
    out[i * 3 + 2] = (rng() - 0.5) * 0.06
  }
  return out
}

/**
 * Falling flecks, on a fixed lattice of columns and rows.
 *
 * `drop` slides every fleck down by a fraction of one row gap, and never more
 * than one gap across the whole loop. That keeps the motion a slow steady
 * descent with nothing jumping: a linear morph cannot express a fleck that
 * leaves the bottom and reappears at the top, so it is never asked to.
 */
function flecks(n: number, rng: () => number, drop: number): Target {
  const COLS = 13
  const ROWS = 6
  const TOP = 0.66
  const GAP = 0.2
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const c = (rng() * COLS) | 0
    const r = (rng() * ROWS) | 0
    // A little per-column offset so the lattice never reads as a grid.
    const skew = ((c * 37) % 10) / 10
    out[i * 3] = -0.92 + (c / (COLS - 1)) * 1.84 + (rng() - 0.5) * 0.07
    out[i * 3 + 1] = TOP - ((r + skew + drop) % ROWS) * GAP + (rng() - 0.5) * 0.02
    out[i * 3 + 2] = (rng() - 0.5) * 0.1
  }
  return out
}

/** The rural setting: a cottage, two trees, ground, and flecks coming down. */
/** The snow, on its own clock. */
function villageFlecks(n: number, drop: number): Target {
  return flecks(n, makeRng(9101), drop)
}

function buildVillage(count: number, drop = 0): BuiltTarget {
  const rng = makeRng(311)
  return normalize(
    compose(count, [
      { weight: 0.36, tone: 0.66, toneJitter: 0.18, build: (n) => cottage(n, rng, [0.12, -0.05]) },
      { weight: 0.16, tone: 0.44, build: (n) => tree(n, rng, [-0.66, -0.06], 1.05) },
      { weight: 0.12, tone: 0.4, build: (n) => tree(n, rng, [0.78, -0.14], 0.78) },
      {
        weight: 0.16,
        tone: 0.3,
        build: (n) =>
          sampleCurve((t) => [(t - 0.5) * 2.1, -0.44 + Math.sin(t * 7) * 0.012, 0], n, {
            rng,
            radius: 0.014,
          }),
      },
      // A fifth of what it was: the house is the subject, not the weather.
      { weight: 0.2, tone: 0.92, ai: 0.45, label: 'flecks', build: (n) => villageFlecks(n, drop) },
    ]),
    1.25,
    { ignore: 'flecks' }
  )
}

/** A skyline of towers with lit windows. */
function skyline(n: number, rng: () => number): Target {
  const towers = [
    [-0.86, 0.44, 0.2],
    [-0.58, 0.62, 0.22],
    [-0.3, 0.34, 0.24],
    [0.0, 0.78, 0.22],
    [0.28, 0.5, 0.2],
    [0.56, 0.66, 0.24],
    [0.86, 0.38, 0.2],
  ]
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const t = towers[(rng() * towers.length) | 0]
    const [cx, h, w] = t
    const base = -0.44
    let x: number
    let y: number
    if (rng() < 0.45) {
      const e = rng() * 3
      if (e < 1) { x = cx - w / 2; y = base + (e % 1) * h }
      else if (e < 2) { x = cx + w / 2; y = base + (e % 1) * h }
      else { x = cx - w / 2 + (e % 1) * w; y = base + h }
    } else {
      const cols = 3
      const rowsN = Math.max(2, Math.round(h / 0.1))
      const c = (rng() * cols) | 0
      const r = (rng() * rowsN) | 0
      x = cx - w / 2 + (w / cols) * (c + 0.5) + (rng() - 0.5) * 0.028
      y = base + (h / rowsN) * (r + 0.5) + (rng() - 0.5) * 0.028
    }
    out[i * 3] = x
    out[i * 3 + 1] = y
    out[i * 3 + 2] = (rng() - 0.5) * 0.07
  }
  return out
}

/**
 * The sky: scattered stars, and the disc that crosses it.
 *
 * `t` is 0 at one horizon and 1 at the other, and the disc travels a real arc
 * between them rather than the straight line a two-frame morph would give —
 * the arc is sampled here, and the loop steps along it a keyframe at a time.
 */
function sky(n: number, rng: () => number, t: number): Target {
  const out = new Float32Array(n * 3)
  const disc = Math.floor(n * 0.42)
  const angle = Math.PI * (1 - t)
  const cx = Math.cos(angle) * 0.78
  const cy = -0.34 + Math.sin(angle) * 0.92
  for (let i = 0; i < n; i++) {
    if (i < disc) {
      const a = rng() * Math.PI * 2
      const r = 0.15 * Math.sqrt(rng())
      out[i * 3] = cx + Math.cos(a) * r
      out[i * 3 + 1] = cy + Math.sin(a) * r
      out[i * 3 + 2] = (rng() - 0.5) * 0.05
    } else {
      // Spread over the whole field rather than a band, and held inside the
      // frame so none of them sit on the panel's edge.
      out[i * 3] = -0.84 + rng() * 1.68
      out[i * 3 + 1] = -0.3 + rng() * 1.18
      out[i * 3 + 2] = (rng() - 0.5) * 0.18
    }
  }
  return out
}

/** The urban setting: a skyline under a sky that keeps its own hours. */
/** The disc and its stars, on their own clock. */
function citySky(n: number, t: number): Target {
  return sky(n, makeRng(9201), t)
}

function buildCity(count: number, t = 0): BuiltTarget {
  const rng = makeRng(733)
  return normalize(
    compose(count, [
      { weight: 0.62, tone: 0.6, toneJitter: 0.3, build: (n) => skyline(n, rng) },
      // Far fewer than before, and the disc is most of what is left.
      { weight: 0.2, tone: 0.95, ai: 0.5, label: 'sky', build: (n) => citySky(n, t) },
      {
        weight: 0.18,
        tone: 0.28,
        build: (n) =>
          sampleCurve((tt) => [(tt - 0.5) * 2.2, -0.46, 0], n, { rng, radius: 0.013 }),
      },
    ]),
    1.25,
    { ignore: 'sky' }
  )
}

/**
 * A sheet of paper filling with written lines.
 *
 * `written` is how far down the page the ink has reached, 0 to 1. A line that
 * has not been reached yet is collapsed at its own left margin rather than
 * parked somewhere else on the sheet, so every particle only ever travels
 * along its own line — the page writes itself without anything flying across
 * it. There is no pen: the ink arriving is the whole of it.
 */
const SHEET_W = 1.02
const SHEET_H = 1.32
const LINES = 12

/** The writing, on its own clock. */
function paperInk(n: number, written: number): Target {
  const rng = makeRng(9301)
  const top = SHEET_H / 2 - 0.14
  const gap = (SHEET_H - 0.28) / (LINES - 1)
  const left = -SHEET_W / 2 + 0.1
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const line = (rng() * LINES) | 0
    const y = top - line * gap
    // Each line starts as the writing reaches it and finishes a fifth of the
    // way later, so the page fills top to bottom.
    const startsAt = line / LINES
    const grown = Math.min(1, Math.max(0, (written - startsAt) / 0.2))
    const full = line % 4 === 3 ? 0.56 : 0.8
    const span = SHEET_W * full * grown
    out[i * 3] = left + rng() * span
    out[i * 3 + 1] = y + (rng() - 0.5) * 0.01
    out[i * 3 + 2] = (rng() - 0.5) * 0.008
  }
  return out
}

function buildPaper(count: number, written = 0): BuiltTarget {
  const rng = makeRng(419)

  return normalize(
    compose(count, [
      {
        weight: 0.24,
        tone: 0.5,
        build: (n) =>
          frameOutline(n, rng, { w: SHEET_W, h: SHEET_H, position: [0, 0, 0], corner: 0.02 }),
      },
      {
        weight: 0.76,
        tone: 0.95,
        toneJitter: 0.05,
        label: 'ink',
        build: (n) => paperInk(n, written),
      },
    ]),
    1.25,
    { ignore: 'ink' }
  )
}

/* ── Public API ───────────────────────────────────────────────────────────── */

/**
 * The narrative builds the first keyframe of each scene, not a separate still.
 *
 * `glow` off for the two scenes that have one: in the section panels the whole
 * composition is rebuilt per keyframe, so a foot or a frame can brighten as the
 * marker reaches it. In the narrative only the moving part is rebuilt — a glow
 * would light whichever stop keyframe zero happened to name and then stay
 * there while the marker walked away from it.
 */
const BUILDERS: Record<TargetKey, (count: number) => BuiltTarget | Promise<BuiltTarget>> = {
  foot: (n) => buildFoot(n, 0),
  capture: (n) => buildCapture(n, 0),
  analysis: (n) => buildAnalysis(n, 0),
  clinician: (n) => buildClinician(n, 0),
  timeline: (n) => buildTimeline(n, 0),
  logo: buildLogo,
  village: (n) => buildVillage(n),
  city: (n) => buildCity(n),
  paper: (n) => buildPaper(n),
}

/**
 * The held build of one composition — the frame everything else moves against.
 *
 * The section panels and the scroll narrative both start here, so a panel and
 * the scene it echoes are literally the same picture.
 */
export function buildStill(key: TargetKey, count: number): BuiltTarget | null {
  const make = BUILDERS[key]
  const built = make ? make(count) : null
  return built instanceof Promise ? null : built
}

/* ── In-scene motion ──────────────────────────────────────────────────────── */

/**
 * What moves inside a narrative scene while it is being held.
 *
 * The section panels animate by rebuilding the whole composition once per
 * keyframe. The narrative cannot: it runs at up to a hundred and twenty
 * thousand points, and twenty full re-samples is a loading screen nobody sits
 * through, plus tens of megabytes to keep them in.
 *
 * So only the part that moves is rebuilt. Every builder here is standalone —
 * its own seeded rng, no dependence on how far the composition's shared rng
 * had been advanced — which is what lets a keyframe be reproduced outside the
 * function that first made it.
 */
export interface SceneMotion {
  /** How many keyframes describe one pass. */
  frames: number
  /** Seconds for that pass. */
  period: number
  /**
   * `cycle` returns to the first keyframe; `pingPong` walks back through them.
   * Anything travelling a path that does not close wants pingPong — otherwise
   * the last frame cuts the chord home.
   */
  loop: 'cycle' | 'pingPong'
  /**
   * The labelled parts that move, and their raw pre-normalise positions at
   * keyframe `i`. More than one where a composition has two things to say at
   * once — the timeline's reading and the screening it is standing over.
   */
  parts: { part: string; build: (n: number, i: number) => Target }[]
  /**
   * Parts that brighten rather than move: one per keyframe, lit when its
   * keyframe comes round. A tone change is not motion, so it costs nothing
   * against the rule these compositions are built on — that the only thing
   * travelling across the picture is the one thing meant to be.
   */
  glow?: { parts: string[]; lit: [number, number]; dim: [number, number] }
}

const SCENE_MOTION: Partial<Record<TargetKey, SceneMotion>> = {
  // The lesion turns on its own centre. Eight keyframes for a revolution: the
  // morph between two of them cuts the chord, and at forty-five degrees that
  // pulls the rim in by under eight percent, which reads as churn rather than
  // as the patch breathing.
  foot: {
    frames: 8,
    period: 9,
    loop: 'cycle',
    parts: [{ part: 'lesion', build: (n, i) => lesion(n, (i / 8) * Math.PI * 2) }],
  },
  // One keyframe per photograph. Cycles, because the fourth shot is followed
  // by the first again — that is the sequence, not a there-and-back.
  capture: {
    frames: 4,
    period: 6.4,
    loop: 'cycle',
    parts: [{ part: 'flash', build: (n, i) => captureFlash(n, i) }],
  },
  // Three findings, and the read runs back down them rather than jumping from
  // the last to the first across the whole foot.
  analysis: {
    frames: 3,
    period: 5.4,
    loop: 'pingPong',
    parts: [{ part: 'pulse', build: (n, i) => findingPulse(n, i) }],
  },
  // The current bends, so the packet needs enough keyframes to follow it
  // rather than cutting across. There and back: it is a round trip.
  clinician: {
    frames: 5,
    period: 5.6,
    loop: 'pingPong',
    parts: [{ part: 'packet', build: (n, i) => streamPacket(n, i / 4) }],
  },
  // One keyframe per screening, so the marker walks the curve's own segments.
  // The lit foot travels with it, as a second moving part rather than as six
  // feet taking turns to change colour.
  timeline: {
    frames: STOPS,
    period: 7.5,
    loop: 'pingPong',
    parts: [{ part: 'marker', build: (n, i) => curveMarker(n, i / (STOPS - 1)) }],
    // Keyframe i lights stop i. Nothing moves to do it.
    glow: {
      parts: Array.from({ length: STOPS }, (_, i) => `stop${i}`),
      lit: [0.92, 0.2],
      dim: [0.4, 0],
    },
  },
  // One row gap of descent across the whole loop, and no more.
  village: {
    frames: 2,
    period: 7,
    loop: 'pingPong',
    parts: [{ part: 'flecks', build: (n, i) => villageFlecks(n, i) }],
  },
  // Horizon to zenith to horizon: three keyframes, so the disc travels an arc
  // rather than the straight chord two would give it.
  city: {
    frames: 3,
    period: 11,
    loop: 'pingPong',
    parts: [{ part: 'sky', build: (n, i) => citySky(n, i / 2) }],
  },
  // Written down the page and then unwritten back up it.
  paper: {
    frames: 2,
    period: 7,
    loop: 'pingPong',
    parts: [{ part: 'ink', build: (n, i) => paperInk(n, i) }],
  },
}

/** A scene's motion, resolved against a built target. */
export interface MotionTrack {
  period: number
  loop: 'cycle' | 'pingPong'
  /** One entry per moving part: where it sits, and where it goes. */
  parts: {
    /** Index of the first particle that moves, and how many of them. */
    start: number
    count: number
    /** Positions for those particles, one array per keyframe, normalised. */
    frames: Float32Array[]
  }[]
  /** Ranges that brighten in turn, one per keyframe, and the two shades. */
  glow?: { ranges: { start: number; count: number }[]; lit: [number, number]; dim: [number, number] }
}

/**
 * Resolves the motion for one composition, or null if it has none.
 *
 * Cheap by construction: it samples each moving part's own particle count per
 * keyframe, never the whole cloud. A full keyframe of a scene costs a complete
 * re-sample, and at a hundred and twenty thousand points a set of them is both
 * a loading screen nobody waits through and tens of megabytes to hold.
 *
 * It is also the only way to animate one thing without moving everything else.
 * Morphing between two whole keyframes runs every particle through the
 * shader's travel term, so a marker crossing the frame made the laptop, the
 * feet and the axis all boil along with it — even though their two positions
 * were identical.
 */
export function motionTrack(key: TargetKey, base: BuiltTarget): MotionTrack | null {
  const spec = SCENE_MOTION[key]
  if (!spec) return null

  const parts: MotionTrack['parts'] = []
  for (const moving of spec.parts) {
    const part = base.parts.find((p) => p.label === moving.part)
    if (!part || part.count === 0) continue
    const frames: Float32Array[] = []
    for (let i = 0; i < spec.frames; i++) {
      frames.push(applyTransform(moving.build(part.count, i), base.transform))
    }
    parts.push({ start: part.start, count: part.count, frames })
  }
  if (!parts.length) return null

  let glow: MotionTrack['glow']
  if (spec.glow) {
    const ranges = spec.glow.parts
      .map((label) => base.parts.find((p) => p.label === label))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({ start: p.start, count: p.count }))
    if (ranges.length) glow = { ranges, lit: spec.glow.lit, dim: spec.glow.dim }
  }

  return { period: spec.period, loop: spec.loop, parts, glow }
}

const smoothstep5 = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

/**
 * Walks a track to `seconds` and writes the result into a positions array.
 *
 * Returns the ranges it touched, so the caller can upload those and leave the
 * rest of the buffer alone. `period` overrides the track's own, for callers
 * that set their own pace.
 */
export function applyMotion(
  track: MotionTrack,
  arr: Float32Array,
  seconds: number,
  period = track.period,
  /** Tone/AI pairs, written only where the track declares a glow. */
  shades?: Float32Array
): { pos: { from: number; span: number }[]; shade: { from: number; span: number }[] } {
  const n = track.parts[0].frames.length
  // pingPong walks 0..n-1 and back down to 1, so the return trip retraces the
  // keyframes instead of cutting the chord home.
  const steps = track.loop === 'pingPong' ? Math.max(1, (n - 1) * 2) : n
  const phase = ((((seconds / Math.max(0.05, period)) % 1) + 1) % 1) * steps
  const step = Math.floor(phase) % steps
  const f = smoothstep5(phase - Math.floor(phase))
  const pick = (k: number) => (track.loop === 'pingPong' && k >= n ? steps - k : k % n)
  const ai = pick(step)
  const bi = pick((step + 1) % steps)

  const pos: { from: number; span: number }[] = []
  for (const moving of track.parts) {
    const a = moving.frames[ai]
    const b = moving.frames[bi]
    const from = moving.start * 3
    const span = moving.count * 3
    for (let k = 0; k < span; k++) arr[from + k] = a[k] + (b[k] - a[k]) * f
    pos.push({ from, span })
  }

  /* The lit part crossfades from the outgoing keyframe's to the incoming
     one's, so the brightness travels the row at the same rate the marker
     does — without a single particle changing places to do it. */
  const shade: { from: number; span: number }[] = []
  if (track.glow && shades) {
    const { ranges, lit, dim } = track.glow
    for (let r = 0; r < ranges.length; r++) {
      const mix = (r === ai ? 1 - f : 0) + (r === bi ? f : 0)
      const tone = dim[0] + (lit[0] - dim[0]) * mix
      const accent = dim[1] + (lit[1] - dim[1]) * mix
      const from = ranges[r].start * 2
      const span = ranges[r].count * 2
      for (let k = 0; k < span; k += 2) {
        shades[from + k] = tone
        shades[from + k + 1] = accent
      }
      shade.push({ from, span })
    }
  }
  return { pos, shade }
}

/**
 * Builds every target, yielding to the event loop between each so the loader
 * stays responsive. Resolves only when the whole story is ready to render —
 * the canvas is never shown half-sampled.
 */
export async function buildAllTargets(
  keys: TargetKey[],
  count: number,
  onProgress?: (done: number, total: number) => void
): Promise<Record<string, BuiltTarget>> {
  const out: Record<string, BuiltTarget> = {}
  let lastGood: BuiltTarget | null = null

  for (let i = 0; i < keys.length; i++) {
    // Yield first so the loader can paint between builds.
    await new Promise((r) => setTimeout(r, 0))
    try {
      out[keys[i]] = await BUILDERS[keys[i]](count)
      lastGood = out[keys[i]]
    } catch (err) {
      // One bad target must never strand the loader. Reuse the previous shape,
      // or a loose cloud if this is the first one, and carry on.
      console.warn(`[soleiq] target "${keys[i]}" failed to build:`, err)
      out[keys[i]] = lastGood
        ? {
            positions: new Float32Array(lastGood.positions),
            tones: new Float32Array(lastGood.tones),
            ai: new Float32Array(lastGood.ai),
            // The stand-in borrows the shape but not its labels: pointing a
            // label at a part that is not there is worse than no label.
            parts: [],
          }
        : {
            positions: sampleCloud(count, 2),
            tones: new Float32Array(count).fill(0.5),
            ai: new Float32Array(count),
            parts: [],
          }
    }
    onProgress?.(i + 1, keys.length)
  }
  return out
}
