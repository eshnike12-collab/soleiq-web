/**
 * Where a composition sits in the frame, solved rather than hand-tuned.
 *
 * Every scene used to declare a camera distance and a world-space offset. Those
 * numbers were picked against one window shape, so on any other one the art
 * drifted — most visibly upward, behind the fixed navbar, which is the bug this
 * replaces. A scene now declares only how far across the frame it wants to sit;
 * the distance and the vertical placement are solved from the shape's own
 * extent, the safe box, and whatever aspect the viewport actually has.
 *
 * The lesson carried over from the hero footprints: fit the *animated* reach,
 * not the resting outline. A shape that turns swings its own depth into its
 * silhouette, and a point that turns toward the camera projects larger. Both
 * are folded in below.
 */

/** Resting extent of a built shape, in its own space. */
export interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  /** Half the depth, measured from the shape's origin. */
  halfD: number
}

export function boundsOf(p: Float32Array): Bounds {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let halfD = 0

  for (let i = 0; i < p.length; i += 3) {
    const x = p[i]
    const y = p[i + 1]
    const z = Math.abs(p[i + 2])
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    if (z > halfD) halfD = z
  }

  if (!Number.isFinite(minX)) return { minX: 0, maxX: 0, minY: 0, maxY: 0, halfD: 0 }
  return { minX, maxX, minY, maxY, halfD }
}

/**
 * The rectangle a composition may occupy, as fractions of the surface it is
 * drawn on: 0 is the top/left edge, 1 the bottom/right.
 */
export interface SafeBox {
  top: number
  bottom: number
  left: number
  right: number
}

export interface Framing {
  /** Camera distance along z. */
  distance: number
  /** Group offset that lands the shape inside the box. */
  x: number
  y: number
  /** Half the visible extent, in world units, at the shape's near face. */
  halfH: number
  halfW: number
}

export interface FrameOptions {
  /** Where the shape's centre wants to sit across the frame. 0.5 is centred. */
  xFraction: number
  /** Share of the box to occupy. 1 fills it; lower leaves the art smaller. */
  fill?: number
  /** Largest yaw the shape reaches, in radians. Parallax plus its own swing. */
  yaw?: number
  /** Largest pitch the shape reaches, in radians. */
  pitch?: number
}

/**
 * The navbar is fixed and the narrative canvas runs underneath it, so the
 * clearance it needs is a pixel distance, not a fraction of whatever height the
 * window happens to be. Matches the `h-[4.75rem]` bar in Navbar.tsx.
 */
export const NAV_PX = 76
/** Clear air between the bar and the top of any composition. */
export const NAV_GAP_PX = 34

/** Clear air between the copy and the bottom of any composition. */
export const COPY_GAP_PX = 28

/**
 * How far the cursor may shove the cloud, as a share of the panel's height.
 *
 * The dent is a world-space displacement, so how big it looks depends entirely
 * on how far back the camera is — the same push that moved the art 30px when
 * it was small moved it 80px once it filled the column, straight up towards
 * the navbar. Driving the push from the framing instead keeps it a constant
 * size on screen, and reserving that much of the box means even a cursor
 * parked on the top edge cannot push the art out of it.
 */
export const CURSOR_PUSH = 0.03

/** Reserves the cursor's dent at every edge of a box. */
export function insetForPush(box: SafeBox, aspect: number): SafeBox {
  const x = CURSOR_PUSH / Math.max(0.2, aspect)
  return {
    top: box.top + CURSOR_PUSH,
    bottom: box.bottom - CURSOR_PUSH,
    left: box.left + x,
    right: box.right - x,
  }
}

/**
 * The world-space push that shows up as `CURSOR_PUSH` of the panel height,
 * given how far back the camera currently is.
 */
export function pushStrength(halfH: number): number {
  return 2 * halfH * CURSOR_PUSH
}

/**
 * Where the narrative is allowed to draw, given the panel it is drawing into.
 *
 * `copyTopPx` is where *this scene's* copy starts, measured from the DOM. The
 * headline is two lines at one width and three at another, and the panel is
 * 12vh taller or shorter as the window changes, so no fraction written here
 * would hold. Passing the measured number in is the only way the art can be
 * guaranteed to sit above the words at every size.
 */
export function narrativeBox(width: number, height: number, copyTopPx?: number): SafeBox {
  const wide = width >= 1024
  const h = Math.max(1, height)
  // Below the bar, and never higher than the fraction the composition was
  // designed around — whichever of the two is further down.
  const top = Math.max(wide ? 0.17 : 0.15, (NAV_PX + NAV_GAP_PX) / h)
  // The scene copy owns the bottom of the panel, and the scene rail the left.
  // Once the copy has been measured that line *is* the limit — the fractions
  // below are only the fallback for before it has been. Taking the smaller of
  // the two instead held every scene up at the fallback and threw away the
  // whole band beneath it, which on the closing scene was most of the panel.
  let bottom =
    copyTopPx !== undefined && Number.isFinite(copyTopPx)
      ? Math.min(0.9, (copyTopPx - COPY_GAP_PX) / h)
      : wide
        ? 0.6
        : 0.5
  bottom = Math.max(top + 0.2, bottom)
  return wide
    ? { top, bottom, left: 0.22, right: 0.97 }
    : { top, bottom, left: 0.04, right: 0.96 }
}

/**
 * The column the copy leaves empty, on a wide panel.
 *
 * The copy is a left-hand block in the lower half, so everything to the right
 * of it is free from under the navbar all the way down. For a tall composition
 * that column holds a far bigger picture than the strip above the copy does —
 * and for a wide one it holds a smaller one, which is why both are solved and
 * the better answer wins. Null when there is no such column: on a narrow panel
 * the copy sits under the art in the same column.
 */
export function narrativeSideBox(
  width: number,
  height: number,
  copyRightPx: number
): SafeBox | null {
  if (width < 1024 || !Number.isFinite(copyRightPx) || copyRightPx <= 0) return null
  const top = Math.max(0.17, (NAV_PX + NAV_GAP_PX) / Math.max(1, height))
  const left = (copyRightPx + COPY_GAP_PX) / Math.max(1, width)
  // Not worth having if the copy runs so wide there is no column left.
  if (left > 0.72) return null
  return { top, bottom: 0.88, left, right: 0.97 }
}

/**
 * Picks the placement that gives the composition the most room.
 *
 * Same field of view either way, so the shorter camera distance is the larger
 * picture — that is the whole comparison.
 */
export function bestFrame(
  key: string,
  positions: Float32Array | undefined,
  boxes: (SafeBox | null | undefined)[],
  view: { aspect: number; fov: number },
  opts: FrameOptions
): Framing {
  let best: Framing | null = null
  for (const box of boxes) {
    if (!box) continue
    // A composition asked to sit at 0.6 across cannot do that in a band that
    // starts at 0.65; centre it in the band rather than pinning it to an edge.
    const inside = opts.xFraction >= box.left && opts.xFraction <= box.right
    const fit = solveFrame(key, positions, box, view, {
      ...opts,
      xFraction: inside ? opts.xFraction : (box.left + box.right) / 2,
    })
    if (!best || fit.distance < best.distance) best = fit
  }
  return best ?? solveFrame(key, positions, { top: 0.1, bottom: 0.9, left: 0.1, right: 0.9 }, view, opts)
}

/**
 * A feature panel is its own bounded box with nothing else in it, so the only
 * margins it needs are the ones that keep the art off its own rounded corners
 * and leave room for the part labels.
 */
export const FEATURE_BOX: SafeBox = { top: 0.09, bottom: 0.91, left: 0.07, right: 0.93 }

/** A still frame sits in normal document flow, clear of the bar entirely. */
export const STILL_BOX: SafeBox = { top: 0.12, bottom: 0.88, left: 0.08, right: 0.92 }

/**
 * What a canvas is handed before it has measured anything. The solver replaces
 * it on the first rendered frame, so this only has to be a plausible starting
 * point rather than a correct one.
 */
export const INITIAL_CAMERA: [number, number, number] = [0, 0, 5]

/**
 * Solves the camera distance and group offset that put `bounds` inside `box`.
 *
 * Everything is solved at the shape's *near* face rather than through its
 * middle: the particle closest to the camera is the one that projects largest,
 * so it is the one that decides whether the composition is inside the box.
 * Points further back land inside it, which is the safe direction to be wrong.
 */
export function frame(
  shape: Bounds | undefined,
  box: SafeBox,
  view: { aspect: number; fov: number },
  opts: FrameOptions
): Framing {
  // A shape that failed to build has no extent to solve against. Framing an
  // empty cloud at a sane distance beats throwing inside the render loop.
  const bounds: Bounds = shape ?? { minX: -1, maxX: 1, minY: -1, maxY: 1, halfD: 0 }
  const fill = Math.min(1, Math.max(0.05, opts.fill ?? 1))
  const yaw = Math.abs(opts.yaw ?? 0)
  const pitch = Math.abs(opts.pitch ?? 0)

  const reachX = Math.max(Math.abs(bounds.minX), Math.abs(bounds.maxX))
  const reachY = Math.max(Math.abs(bounds.minY), Math.abs(bounds.maxY))

  // A turn swings depth into the silhouette. That width is on screen for real,
  // so it is part of what has to fit.
  const minX = bounds.minX - bounds.halfD * Math.sin(yaw)
  const maxX = bounds.maxX + bounds.halfD * Math.sin(yaw)
  const minY = bounds.minY - bounds.halfD * Math.sin(pitch)
  const maxY = bounds.maxY + bounds.halfD * Math.sin(pitch)

  const boxH = Math.max(0.05, box.bottom - box.top) * fill
  const boxW = Math.max(0.05, box.right - box.left) * fill

  const halfH = Math.max(
    (maxY - minY) / (2 * boxH),
    (maxX - minX) / (2 * boxW * Math.max(0.2, view.aspect))
  )
  const halfW = halfH * view.aspect

  // The same turn also carries the shape's flanks toward the camera, and a
  // point nearer the lens projects larger. Stand off by that much again.
  const nearZ = bounds.halfD + reachX * Math.sin(yaw) + reachY * Math.sin(pitch)
  const distance = halfH / Math.tan((view.fov * Math.PI) / 360) + nearZ

  // Frame fraction ↔ world, at that near face:
  //   y = (0.5 - f) * 2 * halfH      x = (f - 0.5) * 2 * halfW
  const y = (0.5 - (box.top + box.bottom) / 2) * 2 * halfH - (minY + maxY) / 2

  const wanted = (opts.xFraction - 0.5) * 2 * halfW - (minX + maxX) / 2
  const lo = (box.left - 0.5) * 2 * halfW - minX
  const hi = (box.right - 0.5) * 2 * halfW - maxX
  const x = lo <= hi ? Math.min(hi, Math.max(lo, wanted)) : (lo + hi) / 2

  return { distance, x, y, halfH, halfW }
}

/* ── Exact fit ────────────────────────────────────────────────────────────── */

/** Every point is projected, at each extreme of the swing, at every iteration.
    A few thousand is far more than enough to find the silhouette of a shape
    whose outline is drawn by tens of thousands. */
const MAX_SAMPLES = 4000

const sampleCache = new WeakMap<Float32Array, Float32Array>()

/**
 * How many directions the silhouette is probed along, in each of the two
 * planes that perspective can mix.
 */
const HULL_DIRS = 24

function candidates(positions: Float32Array): Float32Array {
  const hit = sampleCache.get(positions)
  if (hit) return hit
  const n = positions.length / 3
  const stride = Math.max(1, Math.ceil(n / MAX_SAMPLES))

  // A stride alone misses the true edge of the cloud by about a percent, and a
  // percent of the silhouette is the difference between the framing landing
  // inside its box and just over the line.
  //
  // The particle that decides an edge is the one furthest out along some
  // direction in the x/z or y/z plane: projection divides a coordinate by
  // depth, so it only ever trades one axis against z. Keeping the extreme
  // along a fan of directions in each of those planes keeps every particle
  // that can end up on the outline, at any camera distance or angle of swing.
  const cos = new Float64Array(HULL_DIRS)
  const sin = new Float64Array(HULL_DIRS)
  for (let k = 0; k < HULL_DIRS; k++) {
    const a = (k / HULL_DIRS) * Math.PI * 2
    cos[k] = Math.cos(a)
    sin[k] = Math.sin(a)
  }
  const bestXZ = new Int32Array(HULL_DIRS)
  const bestYZ = new Int32Array(HULL_DIRS)
  const scoreXZ = new Float64Array(HULL_DIRS).fill(-Infinity)
  const scoreYZ = new Float64Array(HULL_DIRS).fill(-Infinity)

  for (let i = 0; i < n; i++) {
    const x = positions[i * 3]
    const y = positions[i * 3 + 1]
    const z = positions[i * 3 + 2]
    for (let k = 0; k < HULL_DIRS; k++) {
      const sxz = x * cos[k] + z * sin[k]
      if (sxz > scoreXZ[k]) {
        scoreXZ[k] = sxz
        bestXZ[k] = i
      }
      const syz = y * cos[k] + z * sin[k]
      if (syz > scoreYZ[k]) {
        scoreYZ[k] = syz
        bestYZ[k] = i
      }
    }
  }

  const out = new Float32Array((Math.ceil(n / stride) + HULL_DIRS * 2) * 3)
  let w = 0
  const push = (i: number) => {
    out[w++] = positions[i * 3]
    out[w++] = positions[i * 3 + 1]
    out[w++] = positions[i * 3 + 2]
  }
  for (let i = 0; i < n; i += stride) push(i)
  for (let k = 0; k < HULL_DIRS; k++) {
    push(bestXZ[k])
    push(bestYZ[k])
  }

  const trimmed = out.subarray(0, w)
  sampleCache.set(positions, trimmed)
  return trimmed
}

/**
 * A sliver held back from the box.
 *
 * The candidate set is a sample, so the cloud is always a shade larger than
 * what was measured. Cheaper to give that shade back than to project every
 * particle.
 */
const SAFETY = 0.99

/** The four corners of the swing: the shape has to fit at all of them. */
const SWING_CORNERS: [number, number][] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

const resultCache = new Map<string, Framing>()
const r3 = (v: number) => Math.round(v * 1000) / 1000

/**
 * Frames a shape by projecting it, rather than by bounding it.
 *
 * `frame` above assumes the widest particle also sits at the near face. Almost
 * none of them do, so it stands off further than it needs to and the art lands
 * well inside its box — a fifth of the available width simply unused. This
 * projects the actual particles and converges on the distance and offset that
 * put the real silhouette against the edges of the box, using `frame` as its
 * starting point.
 *
 * It is iterative and reads thousands of points, so results are cached under
 * `key`. The inputs only change on a resize, never per frame.
 */
export function solveFrame(
  key: string,
  positions: Float32Array | undefined,
  box: SafeBox,
  view: { aspect: number; fov: number },
  opts: FrameOptions
): Framing {
  const bounds = positions ? cachedBounds(positions) : undefined
  const estimate = frame(bounds, box, view, opts)
  if (!positions || positions.length < 3) return estimate

  // The particle count is part of the key: the same scene built at a different
  // tier is a different cloud, and would otherwise read a stale answer.
  const id =
    `${key}:${positions.length}|${r3(box.top)},${r3(box.bottom)},${r3(box.left)},${r3(box.right)}` +
    `|${r3(view.aspect)}|${r3(view.fov)}|${r3(opts.xFraction)}|${r3(opts.fill ?? 1)}` +
    `|${r3(opts.yaw ?? 0)}|${r3(opts.pitch ?? 0)}`
  const hit = resultCache.get(id)
  if (hit) return hit

  const solved = converge(candidates(positions), box, view, opts, estimate)
  // Bounded so a long session of resizes cannot grow it without limit. These
  // are six numbers each; clearing wholesale costs one recompute.
  if (resultCache.size > 96) resultCache.clear()
  resultCache.set(id, solved)
  return solved
}

const boundsCache = new WeakMap<Float32Array, Bounds>()

function cachedBounds(positions: Float32Array): Bounds {
  const hit = boundsCache.get(positions)
  if (hit) return hit
  const b = boundsOf(positions)
  boundsCache.set(positions, b)
  return b
}

function converge(
  pts: Float32Array,
  box: SafeBox,
  view: { aspect: number; fov: number },
  opts: FrameOptions,
  estimate: Framing
): Framing {
  const t = Math.tan((view.fov * Math.PI) / 360)
  const aspect = Math.max(0.2, view.aspect)
  const fill = Math.min(1, Math.max(0.05, opts.fill ?? 1))
  const yaw = opts.yaw ?? 0
  const pitch = opts.pitch ?? 0

  const spanY = Math.max(0.02, (box.bottom - box.top) * fill * SAFETY)
  const spanX = Math.max(0.02, (box.right - box.left) * fill * SAFETY)
  const midY = (box.top + box.bottom) / 2
  const midX = (box.left + box.right) / 2

  let d = estimate.distance
  let ox = estimate.x
  let oy = estimate.y

  /** The shape's projected extents, in frame fractions, at the current values. */
  const extents = () => {
    let loX = Infinity
    let hiX = -Infinity
    let loY = Infinity
    let hiY = -Infinity

    for (const [sy, sp] of SWING_CORNERS) {
      const cy = Math.cos(yaw * sy)
      const sYaw = Math.sin(yaw * sy)
      const cp = Math.cos(pitch * sp)
      const sPitch = Math.sin(pitch * sp)

      for (let i = 0; i < pts.length; i += 3) {
        const x0 = pts[i]
        const y0 = pts[i + 1]
        const z0 = pts[i + 2]
        // Yaw about Y, then pitch about X — the order the group applies them.
        const x1 = x0 * cy + z0 * sYaw
        const z1 = z0 * cy - x0 * sYaw
        const y2 = y0 * cp - z1 * sPitch
        const z2 = y0 * sPitch + z1 * cp

        const dz = Math.max(0.05, d - z2)
        const fx = 0.5 + (x1 + ox) / (2 * t * aspect * dz)
        const fy = 0.5 - (y2 + oy) / (2 * t * dz)
        if (fx < loX) loX = fx
        if (fx > hiX) hiX = fx
        if (fy < loY) loY = fy
        if (fy > hiY) hiY = fy
      }
    }
    return { loX, hiX, loY, hiY }
  }

  /** Puts the shape where the scene asked, then inside the box if that overhangs. */
  const place = (e: ReturnType<typeof extents>) => {
    oy += ((e.loY + e.hiY) / 2 - midY) * 2 * t * d
    const half = (e.hiX - e.loX) / 2
    const want =
      box.left + half <= box.right - half
        ? Math.min(box.right - half, Math.max(box.left + half, opts.xFraction))
        : midX
    ox += (want - (e.loX + e.hiX) / 2) * 2 * t * aspect * d
  }

  for (let iter = 0; iter < 10; iter++) {
    const e = extents()
    const w = e.hiX - e.loX
    const h = e.hiY - e.loY
    if (!(w > 1e-6) || !(h > 1e-6)) return estimate

    // Move to where the tighter of the two axes exactly fills the box.
    d = Math.max(0.3, d / Math.min(spanX / w, spanY / h))
    place(e)
  }

  // The loop measures before it adjusts, so its last answer was never checked.
  // These passes only ever move the camera *back*, which can only shrink the
  // shape — so they converge onto a result that is inside the box rather than
  // a few percent over it.
  for (let iter = 0; iter < 4; iter++) {
    const e = extents()
    const over = Math.max((e.hiX - e.loX) / spanX, (e.hiY - e.loY) / spanY)
    if (!(over > 1.001)) {
      place(e)
      break
    }
    d *= over
    place(e)
  }

  // Translation is converted through a single depth, which is only exact for a
  // flat shape. A couple of nudges take the residual overhang to nothing.
  for (let iter = 0; iter < 3; iter++) {
    const e = extents()
    const downY = box.top - e.loY
    const upY = box.bottom - e.hiY
    const rightX = box.left - e.loX
    const leftX = box.right - e.hiX
    const shiftY = downY > 0 ? downY : upY < 0 ? upY : 0
    const shiftX = rightX > 0 ? rightX : leftX < 0 ? leftX : 0
    if (Math.abs(shiftY) < 1e-4 && Math.abs(shiftX) < 1e-4) break
    oy -= shiftY * 2 * t * d
    ox += shiftX * 2 * t * aspect * d
  }

  if (!Number.isFinite(d) || !Number.isFinite(ox) || !Number.isFinite(oy)) return estimate
  return { distance: d, x: ox, y: oy, halfH: t * d, halfW: t * d * aspect }
}
