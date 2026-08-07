import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { detectCapabilities } from '../../three/capabilities'
import { makeRng } from '../../three/sampleTargets'

THREE.ColorManagement.enabled = false

/**
 * The hero's flow.
 *
 * A pair of footprints drawn in particles: two soles and ten toes, each its own
 * closed loop. Every particle sits at its own point on its loop and all of them
 * advance at the same rate, so every outline is complete at every instant,
 * nothing ever comes to rest, and nothing can leave the frame: the whole
 * arrangement is measured and normalised to fit before it is drawn.
 *
 * The two feet lift alternately on a slow cycle, which is as much "walking" as
 * a pair of outlines can carry without turning into a cartoon.
 *
 * Sole outlines are sampled from an SVG path and passed to the shader as a
 * lookup table. Toes are ellipses, so they need no table at all: each particle
 * carries its own centre, radii and rotation and solves its position directly.
 */

/** Points per sole outline. Two soles, so the uniform table is twice this. */
const SOLE_PTS = 80

/**
 * How far past the resting outline the shader can push a particle. These must
 * match the constants in the vertex shader: the fit adds them to the measured
 * shape, which is what makes "always in frame" a guarantee rather than a hope.
 */
const LIFT_Y = 0.085
const LIFT_X = 0.03
const BREATHE = 0.02
const THICK = 0.0175

/** The sole, and the five toes above it, for one foot in a 120 x 200 box. */
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

const VIEW_W = 120

interface Toe {
  cx: number
  cy: number
  rx: number
  ry: number
  rot: number
  foot: number
}

interface Feet {
  /** Both sole outlines, concatenated: foot 0 then foot 1. */
  path: THREE.Vector2[]
  toes: Toe[]
  /** Half extents of everything, so the fit can be solved against the camera. */
  halfW: number
  halfH: number
}

/**
 * Builds the pair.
 *
 * Foot 0 is the reference drawing; foot 1 is its mirror. They are offset from
 * each other in both axes, the way a pair of prints sits when someone has
 * walked, rather than side by side like a diagram.
 */
function buildFeet(): Feet {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  el.setAttribute('d', SOLE_PATH)
  svg.appendChild(el)
  const total = el.getTotalLength()

  // Local space, before fitting: mirror, then stagger.
  const place = (x: number, y: number, foot: number): [number, number] => {
    const mx = foot === 0 ? x : VIEW_W - x
    const dx = foot === 0 ? -66 : 66
    const dy = foot === 0 ? -14 : 14
    return [mx + dx, y + dy]
  }

  const path: THREE.Vector2[] = []
  const toes: Toe[] = []
  const pts: { x: number; y: number }[] = []

  for (let foot = 0; foot < 2; foot++) {
    for (let i = 0; i < SOLE_PTS; i++) {
      const p = el.getPointAtLength((i / SOLE_PTS) * total)
      const [x, y] = place(p.x, p.y, foot)
      pts.push({ x, y })
    }
    for (const t of TOES) {
      const [x, y] = place(t.cx, t.cy, foot)
      toes.push({
        cx: x,
        cy: y,
        rx: t.rx,
        ry: t.ry,
        // Mirroring a shape flips the sense of its rotation.
        rot: ((foot === 0 ? t.rot : -t.rot) * Math.PI) / 180,
        foot,
      })
    }
  }

  // Fit everything, outlines and toes together, so no part can overflow.
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  const grow = (x: number, y: number) => {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  pts.forEach((p) => grow(p.x, p.y))
  toes.forEach((t) => {
    const r = Math.max(t.rx, t.ry)
    grow(t.cx - r, t.cy - r)
    grow(t.cx + r, t.cy + r)
  })

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  // Normalise to a half-height of 1. The real fit is solved against the camera
  // at runtime, because how much is visible depends on the canvas aspect ratio,
  // which a constant baked in here cannot know.
  const halfH0 = (maxY - minY) / 2 || 1
  const scale = 1 / halfH0

  pts.forEach((p) => path.push(new THREE.Vector2((p.x - cx) * scale, -(p.y - cy) * scale)))
  toes.forEach((t) => {
    t.cx = (t.cx - cx) * scale
    t.cy = -(t.cy - cy) * scale
    t.rx *= scale
    t.ry *= scale
  })

  return { path, toes, halfW: ((maxX - minX) / 2) * scale, halfH: 1 }
}

const FLOW_VERT = /* glsl */ `
precision highp float;

#define PATH_N ${SOLE_PTS * 2}

uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uSpeed;
uniform vec2  uPath[PATH_N];

attribute float aIndex;    // where this particle sits around its own loop, 0..1
attribute vec4  aLoop;     // sole: (start, length, 0, 0) - toe: (cx, cy, rx, ry)
attribute vec3  aExtra;    // (kind: 0 sole 1 toe, rotation, which foot)
attribute float aRandom;
attribute float aSize;

varying float vRandom;

/** A point on one sole outline, wrapped inside that outline's own range. */
vec2 soleAt(float t, float start, float len) {
  float f = fract(t) * len;
  float i0 = floor(f);
  float i1 = mod(i0 + 1.0, len);
  int a = int(start + i0);
  int b = int(start + i1);
  return mix(uPath[a], uPath[b], f - i0);
}

void main() {
  // Everyone advances together, so every outline is whole at every instant and
  // no particle is ever stationary.
  float t = fract(aIndex + uTime * uSpeed);

  vec2 p;
  if (aExtra.x < 0.5) {
    p = soleAt(t, aLoop.x, aLoop.y);
  } else {
    // A toe is an ellipse, so it can be solved rather than looked up.
    float a = t * 6.2831853;
    vec2 e = vec2(cos(a) * aLoop.z, sin(a) * aLoop.w);
    float c = cos(aExtra.y);
    float s = sin(aExtra.y);
    p = aLoop.xy + vec2(e.x * c - e.y * s, e.x * s + e.y * c);
  }

  vec3 pos = vec3(p, 0.0);

  // The step. One foot lifts while the other is down, and the whole print goes
  // with it, toes included, because they share the same foot index.
  //
  // Every displacement below is bounded by a constant that the fit also knows
  // about (see LIFT_Y / BREATHE / THICK), so the animated shape can never reach
  // further than the fit allowed for.
  float phase = uTime * 0.75 + aExtra.z * 3.14159265;
  float lift = max(0.0, sin(phase));
  lift *= lift;
  pos.y += lift * 0.085;
  pos.x += lift * 0.03;
  pos.z += lift * 0.05;

  // Alive, but bounded.
  pos.xy *= 1.0 + 0.02 * sin(uTime * 0.5);

  // Thickness, so each outline is a ribbon rather than a wire.
  pos += (vec3(aRandom, fract(aRandom * 7.3), fract(aRandom * 13.1)) - 0.5) * 0.035;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * aSize * uPixelRatio * (1.0 / max(0.4, -mv.z));

  vRandom = aRandom;
}
`

const FLOW_FRAG = /* glsl */ `
precision highp float;

uniform vec3 uColorInk;
uniform vec3 uColorData;
uniform float uOpacity;

varying float vRandom;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float alpha = smoothstep(0.5, 0.08, d);
  if (alpha < 0.01) discard;

  // A minority carries the data colour, so it reads as information moving
  // rather than as particles for their own sake.
  vec3 col = mix(uColorInk, uColorData, step(0.78, vRandom));

  gl_FragColor = vec4(col, alpha * uOpacity * (0.6 + 0.4 * vRandom));
}
`

export default function HeroFlow() {
  const caps = useMemo(detectCapabilities, [])
  const [visible, setVisible] = useState(true)
  const hostRef = useRef<HTMLDivElement>(null)

  const enabled = caps.webgl && !caps.reducedMotion
  const count = caps.tier === 'high' ? 6200 : 2900

  useEffect(() => {
    if (!enabled) return
    const el = hostRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: '100px',
    })
    io.observe(el)
    const onVis = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div
      ref={hostRef}
      // Starts below the fixed navbar and stops short of the bottom, so nothing
      // is hidden behind the bar or runs down into the gradient that carries the
      // hero into the sequence.
      className="pointer-events-none absolute right-0 top-[5.5rem] hidden h-[min(64vh,64%)] w-[46%] lg:block"
      aria-hidden="true"
    >
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={Math.min(caps.dprCap, window.devicePixelRatio || 1)}
        legacy
        flat
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 45, position: [0, 0, 3.7], near: 0.1, far: 100 }}
      >
        <Prints count={count} />
      </Canvas>
    </div>
  )
}

function Prints({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null)
  const feet = useMemo(buildFeet, [])

  const geometry = useMemo(() => {
    const rng = makeRng(29)
    const geo = new THREE.BufferGeometry()

    // Twelve loops: two soles, ten toes. The soles carry most of the line, so
    // they take most of the particles; each toe takes a small fixed share.
    const loops: { kind: number; a: THREE.Vector4; rot: number; foot: number; share: number }[] = []
    for (let foot = 0; foot < 2; foot++) {
      loops.push({
        kind: 0,
        a: new THREE.Vector4(foot * SOLE_PTS, SOLE_PTS, 0, 0),
        rot: 0,
        foot,
        share: 3.4,
      })
    }
    feet.toes.forEach((t) => {
      loops.push({
        kind: 1,
        a: new THREE.Vector4(t.cx, t.cy, t.rx, t.ry),
        rot: t.rot,
        foot: t.foot,
        share: 0.62,
      })
    })

    const totalShare = loops.reduce((s, l) => s + l.share, 0)
    const position = new Float32Array(count * 3) // written by the shader
    const index = new Float32Array(count)
    const loop = new Float32Array(count * 4)
    const extra = new Float32Array(count * 3)
    const random = new Float32Array(count)
    const size = new Float32Array(count)

    let written = 0
    loops.forEach((l, li) => {
      const n =
        li === loops.length - 1
          ? count - written
          : Math.max(0, Math.round((l.share / totalShare) * count))
      for (let i = 0; i < n; i++) {
        const k = written + i
        // Evenly spread around this loop, with a touch of jitter so the spacing
        // is regular without being mechanical.
        index[k] = (i + (rng() - 0.5) * 0.8) / Math.max(1, n)
        loop[k * 4] = l.a.x
        loop[k * 4 + 1] = l.a.y
        loop[k * 4 + 2] = l.a.z
        loop[k * 4 + 3] = l.a.w
        extra[k * 3] = l.kind
        extra[k * 3 + 1] = l.rot
        extra[k * 3 + 2] = l.foot
        random[k] = rng()
        size[k] = 0.55 + Math.pow(rng(), 3) * 1.3
      }
      written += n
    })

    geo.setAttribute('position', new THREE.BufferAttribute(position, 3))
    geo.setAttribute('aIndex', new THREE.BufferAttribute(index, 1))
    geo.setAttribute('aLoop', new THREE.BufferAttribute(loop, 4))
    geo.setAttribute('aExtra', new THREE.BufferAttribute(extra, 3))
    geo.setAttribute('aRandom', new THREE.BufferAttribute(random, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12)
    return geo
  }, [count, feet])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FLOW_VERT,
        fragmentShader: FLOW_FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        // Ink on white, not light on black.
        blending: THREE.NormalBlending,
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: 9 },
          uSpeed: { value: 0.066 },
          uPixelRatio: { value: Math.min(2, window.devicePixelRatio || 1) },
          uPath: { value: feet.path },
          uColorInk: { value: new THREE.Color('#7742c4') },
          uColorData: { value: new THREE.Color('#0e9fb5') },
          uOpacity: { value: 0 },
        },
      }),
    [feet]
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material]
  )

  useFrame((state, delta) => {
    const u = material.uniforms
    const dt = Math.min(delta, 1 / 20)
    u.uTime.value += dt
    u.uOpacity.value = Math.min(0.85, u.uOpacity.value + dt * 0.5)

    // Fit against what is actually visible. Half-height at the shape's depth
    // comes from the field of view; half-width follows the canvas aspect. The
    // margin covers the breath, the step lift and the ribbon's thickness, so
    // nothing can reach an edge at any window size.
    const cam = state.camera as THREE.PerspectiveCamera
    const visibleHalfY = Math.tan((cam.fov * Math.PI) / 360) * Math.abs(cam.position.z)
    const visibleHalfX = visibleHalfY * cam.aspect

    // The reach of the animated shape, not the resting one.
    const reachY = (feet.halfH + LIFT_Y + THICK) * (1 + BREATHE)
    const reachX = (feet.halfW + LIFT_X + THICK) * (1 + BREATHE)

    const fit = Math.min(visibleHalfY / reachY, visibleHalfX / reachX) * 0.9
    if (points.current) points.current.scale.setScalar(fit)
  })

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}
