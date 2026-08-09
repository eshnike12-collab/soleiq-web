import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'

/**
 * Every morph target is a Float32Array of exactly `count * 3` floats, centred
 * on the origin and normalised to a common scale, so particle index i means the
 * same particle in every scene and morphs never jump.
 */
export type Target = Float32Array

/**
 * A finished scene shape: positions, plus a tone per particle.
 *
 * Tone is what turns a cloud into a picture. Every part of a scene declares
 * where it sits on the shade ramp — the phone body darker than its screen, the
 * beam brighter than the foot it lands on — so a formed shape has real tonal
 * structure instead of one flat blue with noise sprinkled through it.
 */
export interface BuiltTarget {
  positions: Float32Array
  /** 0 = deepest shade, 1 = lightest. One per particle. */
  tones: Float32Array
  /**
   * How much of the AI accent this particle carries, 0..1.
   *
   * Purple marks the parts of a scene the model is acting on — the analysis
   * mesh, the findings it lifted, the record it wrote — so the colour is
   * telling you where the machine is, not just decorating the cloud.
   */
  ai: Float32Array
  /** Index ranges of the named parts, for anchoring on-screen labels. */
  parts: { label: string; start: number; count: number }[]
  /**
   * The centre and scale `normalize` applied, if it was applied.
   *
   * Kept so a single moving part can be rebuilt at runtime without rebuilding
   * the composition around it. A keyframe of the whole scene costs a full
   * re-sample — at a hundred and twenty thousand points, twenty of those is a
   * loading screen nobody waits through. Rebuilding just the part that moves
   * costs its own share of that, and this is the transform needed to land it
   * back in the same space as everything holding still.
   */
  transform?: { cx: number; cy: number; cz: number; scale: number }
}

/**
 * Centre of each labelled part, in the shape's own space.
 *
 * Computed from the particles themselves rather than from the coordinates a
 * builder asked for, because `normalize` re-centres and rescales every shape
 * afterwards — a hand-placed label would drift the moment a scene gained a
 * part.
 */
export function partAnchors(built: BuiltTarget): Record<string, [number, number, number]> {
  const out: Record<string, [number, number, number]> = {}
  for (const part of built.parts) {
    let x = 0
    let y = 0
    let z = 0
    for (let i = part.start; i < part.start + part.count; i++) {
      x += built.positions[i * 3]
      y += built.positions[i * 3 + 1]
      z += built.positions[i * 3 + 2]
    }
    const n = Math.max(1, part.count)
    out[part.label] = [x / n, y / n, z / n]
  }
  return out
}

/** Deterministic PRNG — same cloud every reload, so scenes are reproducible. */
export function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/* ── Mesh surfaces ────────────────────────────────────────────────────────── */

export function sampleMesh(
  geometry: THREE.BufferGeometry,
  count: number,
  opts: { rng?: () => number; jitter?: number; matrix?: THREE.Matrix4 } = {}
): Target {
  const rng = opts.rng ?? Math.random
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial())
  const sampler = new MeshSurfaceSampler(mesh).build()

  const out = new Float32Array(count * 3)
  const p = new THREE.Vector3()
  const jitter = opts.jitter ?? 0

  for (let i = 0; i < count; i++) {
    sampler.sample(p)
    if (jitter) {
      p.x += (rng() - 0.5) * jitter
      p.y += (rng() - 0.5) * jitter
      p.z += (rng() - 0.5) * jitter
    }
    if (opts.matrix) p.applyMatrix4(opts.matrix)
    out[i * 3] = p.x
    out[i * 3 + 1] = p.y
    out[i * 3 + 2] = p.z
  }
  geometry.dispose()
  return out
}

/* ── Raster sampling: SVG paths, images, and text ─────────────────────────── */

export interface Mask {
  /** Per-pixel weight in 0..1. */
  weight: Float32Array
  /** Blurred weight, used as a thickness field to give 2D art real volume. */
  thickness: Float32Array
  width: number
  height: number
}

/**
 * Turns any 2D canvas drawing into a sampleable mask.
 *
 * `mode: 'alpha'` for shapes drawn with transparency (SVG paths, text);
 * `mode: 'luminance'` for artwork that is light-on-dark with no alpha channel —
 * which is exactly what the SoleIQ logo PNG is.
 */
export function maskFromCanvas(
  canvas: HTMLCanvasElement,
  opts: { mode?: 'alpha' | 'luminance'; threshold?: number } = {}
): Mask {
  const { mode = 'alpha', threshold = 0.35 } = opts
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const { width, height } = canvas
  const data = ctx.getImageData(0, 0, width, height).data

  const weight = new Float32Array(width * height)
  for (let i = 0, p = 0; i < weight.length; i++, p += 4) {
    let v: number
    if (mode === 'alpha') {
      v = data[p + 3] / 255
    } else {
      const a = data[p + 3] / 255
      v = a * (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255
    }
    weight[i] = v > threshold ? v : 0
  }

  // The thickness field has to be a dome, not a plateau — so the blur radius
  // scales with the artwork, and the result is renormalised to 0..1. A fixed
  // small radius leaves the interior flat and the shape samples as a slab.
  const radius = Math.max(4, Math.round(Math.min(width, height) * 0.09))
  const thickness = blur(weight, width, height, radius)
  let peak = 0
  for (let i = 0; i < thickness.length; i++) if (thickness[i] > peak) peak = thickness[i]
  if (peak > 0) for (let i = 0; i < thickness.length; i++) thickness[i] /= peak

  return { weight, thickness, width, height }
}

/** Separable box blur, run twice — cheap and smooth enough for a depth field. */
function blur(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  let a = src
  let b = new Float32Array(src.length)
  for (let pass = 0; pass < 2; pass++) {
    // horizontal
    for (let y = 0; y < h; y++) {
      const row = y * w
      for (let x = 0; x < w; x++) {
        let sum = 0
        let n = 0
        for (let k = -radius; k <= radius; k++) {
          const xx = x + k
          if (xx < 0 || xx >= w) continue
          sum += a[row + xx]
          n++
        }
        b[row + x] = sum / n
      }
    }
    // vertical
    const c = a === src ? new Float32Array(src.length) : a
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let sum = 0
        let n = 0
        for (let k = -radius; k <= radius; k++) {
          const yy = y + k
          if (yy < 0 || yy >= h) continue
          sum += b[yy * w + x]
          n++
        }
        c[y * w + x] = sum / n
      }
    }
    a = c
    b = new Float32Array(src.length)
  }
  return a
}

/**
 * Samples `count` points from a mask, weighted by pixel value, with sub-pixel
 * jitter so the cloud never looks like a pixel grid. `depth` turns the blurred
 * thickness field into a z extent — a flat silhouette becomes a solid.
 */
export function sampleMask(
  mask: Mask,
  count: number,
  opts: {
    rng?: () => number
    /** World-space width the mask maps onto. Height follows the aspect ratio. */
    width?: number
    depth?: number
    /** Keep points on the surface shell instead of filling the volume. */
    shell?: boolean
    offset?: [number, number, number]
  } = {}
): Target {
  const rng = opts.rng ?? Math.random
  const worldW = opts.width ?? 2
  const depth = opts.depth ?? 0
  const [ox, oy, oz] = opts.offset ?? [0, 0, 0]

  // Collect lit pixels once, then draw uniformly from them.
  const lit: number[] = []
  for (let i = 0; i < mask.weight.length; i++) if (mask.weight[i] > 0) lit.push(i)

  const out = new Float32Array(count * 3)
  if (lit.length === 0) return out

  const scale = worldW / mask.width
  const cx = mask.width / 2
  const cy = mask.height / 2

  for (let i = 0; i < count; i++) {
    const idx = lit[(rng() * lit.length) | 0]
    const px = idx % mask.width
    const py = (idx / mask.width) | 0

    const x = (px + rng() - cx) * scale
    const y = -(py + rng() - cy) * scale // canvas y is down, world y is up

    let z = 0
    if (depth > 0) {
      const t = mask.thickness[idx]
      const half = depth * t
      z = opts.shell ? (rng() < 0.5 ? -half : half) : (rng() * 2 - 1) * half
    }

    out[i * 3] = x + ox
    out[i * 3 + 1] = y + oy
    out[i * 3 + 2] = z + oz
  }
  return out
}

/** Draws an SVG path string into a mask. */
export function maskFromPaths(
  paths: { d: string; fill?: boolean; lineWidth?: number }[],
  opts: { size?: number; viewBox: [number, number] }
): Mask {
  const size = opts.size ?? 512
  const [vw, vh] = opts.viewBox
  const canvas = document.createElement('canvas')
  const aspect = vh / vw
  canvas.width = size
  canvas.height = Math.round(size * aspect)
  const ctx = canvas.getContext('2d')!
  const s = size / vw
  ctx.scale(s, s)
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'

  for (const p of paths) {
    const path = new Path2D(p.d)
    if (p.fill === false) {
      ctx.lineWidth = p.lineWidth ?? 3
      ctx.stroke(path)
    } else {
      ctx.fill(path)
    }
  }
  return maskFromCanvas(canvas, { mode: 'alpha', threshold: 0.3 })
}

/** Draws anything onto an offscreen canvas and returns it as a mask. */
export function maskFromDraw(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): Mask {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  draw(ctx)
  return maskFromCanvas(canvas, { mode: 'alpha', threshold: 0.3 })
}

/** Rasterises text (used for the wordmark and scene labels). */
export function maskFromText(
  text: string,
  opts: { font?: string; size?: number; letterSpacing?: string } = {}
): Mask {
  const size = opts.size ?? 720
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const font = opts.font ?? `600 160px "Inter Tight", Inter, sans-serif`
  // `letterSpacing` is not supported everywhere; where it is not, the text
  // simply renders at its natural tracking.
  const tracking = opts.letterSpacing
  ctx.font = font
  if (tracking) ctx.letterSpacing = tracking
  const metrics = ctx.measureText(text)
  canvas.width = size
  canvas.height = Math.max(
    64,
    Math.round((metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) * 1.6)
  )
  const c2 = canvas.getContext('2d')!
  c2.font = font
  if (tracking) c2.letterSpacing = tracking
  c2.fillStyle = '#fff'
  c2.textAlign = 'center'
  c2.textBaseline = 'middle'
  c2.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width * 0.94)
  return maskFromCanvas(canvas, { mode: 'alpha', threshold: 0.3 })
}

/**
 * Loads an image and turns it into a mask (luminance mode for the logo PNG).
 *
 * Deliberately does not use `img.decode()` or set `crossOrigin`: decode() can
 * sit unresolved forever in some engines, and forcing a CORS-mode request for a
 * same-origin asset only creates ways to fail. Load events plus a hard timeout
 * always settle, which is what the loader depends on.
 */
export async function maskFromImage(
  src: string,
  opts: {
    size?: number
    mode?: 'alpha' | 'luminance'
    threshold?: number
    timeoutMs?: number
  } = {}
): Promise<Mask> {
  const size = opts.size ?? 480
  const img = new Image()

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error(`Timed out loading ${src}`)),
      opts.timeoutMs ?? 6000
    )
    const done = (err?: Error) => {
      window.clearTimeout(timer)
      img.onload = null
      img.onerror = null
      err ? reject(err) : resolve()
    }
    img.onload = () => done()
    img.onerror = () => done(new Error(`Failed to load ${src}`))
    img.src = src
    // A cached image can already be complete before the handler is attached.
    if (img.complete && img.naturalWidth > 0) done()
  })

  const canvas = document.createElement('canvas')
  const aspect = img.naturalHeight / img.naturalWidth
  canvas.width = size
  canvas.height = Math.max(1, Math.round(size * aspect))
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return maskFromCanvas(canvas, {
    mode: opts.mode ?? 'luminance',
    threshold: opts.threshold ?? 0.42,
  })
}

/* ── Parametric helpers ───────────────────────────────────────────────────── */

/** Points along a 3D curve, with optional thickness around it. */
export function sampleCurve(
  fn: (t: number) => [number, number, number],
  count: number,
  opts: { rng?: () => number; radius?: number } = {}
): Target {
  const rng = opts.rng ?? Math.random
  const r = opts.radius ?? 0.01
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const [x, y, z] = fn(rng())
    out[i * 3] = x + (rng() - 0.5) * r
    out[i * 3 + 1] = y + (rng() - 0.5) * r
    out[i * 3 + 2] = z + (rng() - 0.5) * r
  }
  return out
}

/** Points on a rectangular lattice (grid meshes, report rows, capture frames). */
export function sampleLattice(
  count: number,
  opts: {
    rng?: () => number
    width: number
    height: number
    cols: number
    rows: number
    lineOnly?: boolean
    offset?: [number, number, number]
    warp?: (x: number, y: number) => number
  }
): Target {
  const rng = opts.rng ?? Math.random
  const [ox, oy, oz] = opts.offset ?? [0, 0, 0]
  const out = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    let x: number
    let y: number
    if (opts.lineOnly !== false) {
      // Put the point on a grid line rather than anywhere in a cell.
      if (rng() < 0.5) {
        x = (Math.floor(rng() * (opts.cols + 1)) / opts.cols - 0.5) * opts.width
        y = (rng() - 0.5) * opts.height
      } else {
        x = (rng() - 0.5) * opts.width
        y = (Math.floor(rng() * (opts.rows + 1)) / opts.rows - 0.5) * opts.height
      }
    } else {
      x = (rng() - 0.5) * opts.width
      y = (rng() - 0.5) * opts.height
    }
    const z = opts.warp ? opts.warp(x, y) : 0
    out[i * 3] = x + ox
    out[i * 3 + 1] = y + oy
    out[i * 3 + 2] = z + oz
  }
  return out
}

/* ── Composition and normalisation ────────────────────────────────────────── */

/**
 * Builds one target of exactly `count` points from weighted parts. Weights are
 * normalised, and any rounding remainder goes to the last part, so the total is
 * always exact — the 1:1 index mapping between scenes depends on it.
 */
export function compose(
  count: number,
  parts: {
    weight: number
    /** Position on the shade ramp, 0..1. Defaults to mid grey-blue. */
    tone?: number
    /** Per-part tone spread, so a surface is not perfectly flat. */
    toneJitter?: number
    /** Share of the AI accent, 0..1. Left at 0 for anything physical. */
    ai?: number
    /** Names this part so a screen label can be anchored to it. */
    label?: string
    build: (n: number) => Target
  }[]
): BuiltTarget {
  const total = parts.reduce((s, p) => s + p.weight, 0)
  const positions = new Float32Array(count * 3)
  const tones = new Float32Array(count)
  const ai = new Float32Array(count)
  const partRanges: { label: string; start: number; count: number }[] = []
  let written = 0

  parts.forEach((part, i) => {
    const n =
      i === parts.length - 1
        ? count - written
        : Math.max(0, Math.round((part.weight / total) * count))
    if (n <= 0) return
    positions.set(part.build(n), written * 3)
    const tone = part.tone ?? 0.5
    const jitter = part.toneJitter ?? 0.08
    const accent = part.ai ?? 0
    for (let k = 0; k < n; k++) {
      // Deterministic per-index wobble: no RNG needed, and identical every load.
      const wob = (((written + k) * 2654435761) % 1000) / 1000 - 0.5
      tones[written + k] = Math.min(1, Math.max(0, tone + wob * jitter * 2))
      // Only some of a part's particles carry the accent, so purple reads as
      // flecks through the blue rather than as a second flat colour.
      ai[written + k] = accent * (0.78 + 0.22 * (((written + k) * 40503) % 100) / 100)
    }
    if (part.label) partRanges.push({ label: part.label, start: written, count: n })
    written += n
  })

  return { positions, tones, ai, parts: partRanges }
}

/** Centres on the centroid and scales so the shape fits `radius`. */
/**
 * Centres on the centroid and scales so the shape fits `radius`.
 *
 * `ignore` names a part to leave out of that measurement — it is still moved
 * with everything else, it just does not get a say in where the centre is or
 * how big the shape is.
 *
 * That option is what makes an animated composition hold still. Without it,
 * a keyframe with a marker further left has a centroid further left, so
 * normalising slides the entire picture right to compensate: move one dot and
 * the laptop, the record and the clinicians all shuffle after it. Measuring
 * only the parts that never move keeps every keyframe on the same footing.
 */
export function normalize(
  built: BuiltTarget,
  radius = 1,
  opts: { ignore?: string | string[] } = {}
): BuiltTarget {
  const target = built.positions
  const n = target.length / 3

  const names = opts.ignore
    ? Array.isArray(opts.ignore)
      ? opts.ignore
      : [opts.ignore]
    : []
  const skips = built.parts.filter((p) => names.includes(p.label))
  const counts = (fn: (i: number) => void) => {
    for (let i = 0; i < n; i++) {
      if (skips.some((s) => i >= s.start && i < s.start + s.count)) continue
      fn(i)
    }
  }

  let cx = 0
  let cy = 0
  let cz = 0
  let m = 0
  counts((i) => {
    cx += target[i * 3]
    cy += target[i * 3 + 1]
    cz += target[i * 3 + 2]
    m++
  })
  if (m === 0) return built
  cx /= m
  cy /= m
  cz /= m

  let max = 0
  counts((i) => {
    const dx = target[i * 3] - cx
    const dy = target[i * 3 + 1] - cy
    const dz = target[i * 3 + 2] - cz
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (d > max) max = d
  })
  if (max === 0) return built

  // Every particle is transformed, including the ignored part — it is only
  // excluded from deciding the transform, not from being subject to it.
  const s = radius / max
  for (let i = 0; i < n; i++) {
    target[i * 3] = (target[i * 3] - cx) * s
    target[i * 3 + 1] = (target[i * 3 + 1] - cy) * s
    target[i * 3 + 2] = (target[i * 3 + 2] - cz) * s
  }
  built.transform = { cx, cy, cz, scale: s }
  return built
}

/** Applies a recorded normalise transform to raw positions, in place. */
export function applyTransform(
  raw: Float32Array,
  t: BuiltTarget['transform']
): Float32Array {
  if (!t) return raw
  for (let i = 0; i < raw.length; i += 3) {
    raw[i] = (raw[i] - t.cx) * t.scale
    raw[i + 1] = (raw[i + 1] - t.cy) * t.scale
    raw[i + 2] = (raw[i + 2] - t.cz) * t.scale
  }
  return raw
}

/** A loose sphere of noise — the state the cloud loads in from. */
export function sampleCloud(count: number, radius = 3, rng = Math.random): Target {
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const u = rng() * 2 - 1
    const theta = rng() * Math.PI * 2
    const r = radius * Math.cbrt(rng())
    const s = Math.sqrt(1 - u * u)
    out[i * 3] = r * s * Math.cos(theta)
    out[i * 3 + 1] = r * s * Math.sin(theta) * 0.7
    out[i * 3 + 2] = r * u
  }
  return out
}
