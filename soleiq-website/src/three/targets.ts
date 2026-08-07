import * as THREE from 'three'
import type { TargetKey } from './scenes'
import {
  compose,
  makeRng,
  maskFromDraw,
  maskFromImage,
  maskFromText,
  normalize,
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
  opts: { w: number; h: number; position: [number, number, number]; corner?: number }
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
    out[i * 3] = x + ox + (rng() - 0.5) * 0.008
    out[i * 3 + 1] = y + oy + (rng() - 0.5) * 0.008
    out[i * 3 + 2] = oz + (rng() - 0.5) * 0.01
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

function buildFoot(count: number): BuiltTarget {
  const rng = makeRng(11)
  return normalize(
    compose(count, [
      { weight: 0.94, tone: 0.72, build: (n) => footVolume(n, rng, { width: 2.0, depth: 0.34 }) },
      // A faint ground haze so the foot reads as sitting in space, not floating.
      {
        weight: 0.06,
        tone: 0.1,
        build: (n) =>
          sampleLattice(n, {
            rng,
            width: 3.4,
            height: 0.02,
            cols: 1,
            rows: 1,
            lineOnly: false,
            offset: [0, -1.35, 0],
          }),
      },
    ]),
    1.75
  )
}

function buildCapture(count: number): BuiltTarget {
  const rng = makeRng(23)
  // The phone is held above the foot; the four captures land inside its screen
  // as a 2 x 2 set — right top, right sole, left top, left sole.
  const PHONE_Y = 0.78
  return normalize(
    compose(count, [
      // The foot below, pushed back so the phone reads as being over it.
      {
        weight: 0.3,
        tone: 0.34,
        build: (n) => footVolume(n, rng, { width: 1.2, depth: 0.2, offset: [0, -1.2, -0.35] }),
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
      // The four capture frames, on the screen.
      ...[
        [-0.28, PHONE_Y + 0.42],
        [0.28, PHONE_Y + 0.42],
        [-0.28, PHONE_Y - 0.38],
        [0.28, PHONE_Y - 0.38],
      ].map(([x, y]) => ({
        weight: 0.055,
        tone: 0.97,
        ai: 0.95,
        build: (n: number) =>
          frameOutline(n, rng, { w: 0.44, h: 0.6, corner: 0.14, position: [x, y, 0.79] }),
      })),
      // The scanning sweep crossing the foot.
      {
        weight: 0.13,
        tone: 0.88,
        ai: 1,
        build: (n) =>
          sampleCurve(
            (t) => [(t - 0.5) * 1.7, -0.95, -0.35 + Math.sin(t * Math.PI) * 0.2],
            n,
            { rng, radius: 0.022 }
          ),
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
    1.8
  )
}

function buildAnalysis(count: number): BuiltTarget {
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
      ...[
        [0.42, 0.86, 0.16],
        [-0.05, -0.92, 0.13],
        [0.5, -0.2, 0.1],
      ].map(([x, y, r]) => ({
        weight: 0.06,
        tone: 1,
        toneJitter: 0.02,
        ai: 1,
        build: (n: number) => blob(n, rng, [x, y, 0.32], r),
      })),
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
    1.7
  )
}

function buildClinician(count: number): BuiltTarget {
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
      // The data current streaming from phone to dashboard.
      {
        weight: 0.18,
        tone: 0.9,
        ai: 1,
        build: (n) =>
          sampleCurve(
            (t) => {
              const u = t
              const x = 1.95 - 2.5 * u
              const y = -0.35 + 1.4 * Math.pow(u, 1.6)
              const z = 0.35 + Math.sin(u * Math.PI) * 0.55
              return [x, y, z]
            },
            n,
            { rng, radius: 0.16 }
          ),
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
    1.95
  )
}

function buildTimeline(count: number): BuiltTarget {
  const rng = makeRng(71)
  const STOPS = 6
  const SPAN = 4.2
  // A risk score coming down over the series — illustrative, and labelled as such.
  const level = (i: number) => 0.95 - 0.135 * i - 0.02 * Math.sin(i * 2.1)

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
      // A foot snapshot at each stop, each one a little further along.
      ...Array.from({ length: STOPS }, (_, i) => ({
        weight: 0.075,
        tone: 0.4,
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
    2.1
  )
}

async function buildLogo(count: number): Promise<BuiltTarget> {
  const rng = makeRng(97)
  const word = maskFromText('SoleIQ', {
    size: 900,
    font: '600 190px "Inter Tight", Inter, system-ui, sans-serif',
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
        weight: 0.32,
        // Top of the ramp, which on the logo scene is white.
        tone: 1,
        toneJitter: 0.03,
        ai: 0,
        build: (n) =>
          sampleMask(word, n, { rng, width: 2.4, depth: 0.05, offset: [0, -1.0, 0] }),
      },
    ]),
    1.6
  )
}

/* ── Public API ───────────────────────────────────────────────────────────── */

const BUILDERS: Record<TargetKey, (count: number) => BuiltTarget | Promise<BuiltTarget>> = {
  foot: buildFoot,
  capture: buildCapture,
  analysis: buildAnalysis,
  clinician: buildClinician,
  timeline: buildTimeline,
  logo: buildLogo,
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
