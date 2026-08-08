import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PARTICLE_FRAG, PARTICLE_VERT } from '../../three/shaders'
import { buildPhased, KEYFRAMES } from '../../three/targets'
import {
  solveFrame,
  insetForPush,
  pushStrength,
  FEATURE_BOX,
  INITIAL_CAMERA,
} from '../../three/framing'
import { detectCapabilities } from '../../three/capabilities'
import { usePointerInside } from '../../hooks/usePointerInside'
import { makeRng, partAnchors, sampleCloud, type BuiltTarget } from '../../three/sampleTargets'
import type { TargetKey } from '../../three/scenes'

THREE.ColorManagement.enabled = false

/**
 * A composition that keeps moving, for the sections that are not the narrative.
 *
 * It animates through the morph the shader already has rather than through any
 * new per-particle code: two keyframes of the same shape go into `positionA`
 * and `positionB`, and a looping progress value walks between them.
 *
 * Two ways round the loop:
 *   `pingPong`  — runs there and back, so the return is animated rather than a
 *                 cut. A sun that sets has to rise; a page that has filled with
 *                 writing empties again by unwriting, not by blinking blank.
 *   `cycle`     — runs to the end and starts over, for motion that only ever
 *                 goes one way and whose ends match.
 */

/**
 * White at the top of the ramp, not lilac.
 *
 * These compositions each have one thing that has to read as white — the
 * written line, the marker on the curve — and the narrative's ramp topped out
 * at a light purple, so "tone 1" came out lilac and the marker was just
 * another coloured dot among the nodes.
 */
const PALETTE = {
  deep: '#7c46c4',
  core: '#a45fe8',
  hi: '#ffffff',
  hot: '#ffffff',
  ai: '#26f7fd',
}

export interface PartLabel {
  part: string
  text: string
  /**
   * Nudge, in pixels, from the part's own centre. A label sits on the middle
   * of what it names, which is right for a block and wrong for a line — on a
   * thin curve it lands across the very thing it is pointing at.
   */
  dy?: number
}

interface ScreenLabel {
  text: string
  x: number
  y: number
  opacity: number
}

interface Props {
  target: TargetKey
  /** Named parts of the shape, labelled the way the narrative labels them. */
  labels?: PartLabel[]
  /** How the loop turns over. */
  loop: 'cycle' | 'pingPong'
  /** Seconds for one pass between the two keyframes. */
  period: number
  /** Described for screen readers; the canvas itself is decorative. */
  label: string
  /** Shown instead when there is no WebGL, or motion is not wanted. */
  fallback: ReactNode
}

export default function SectionParticles({
  target,
  labels = [],
  loop,
  period,
  label,
  fallback,
}: Props) {
  const caps = useMemo(detectCapabilities, [])
  const hostRef = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const [visible, setVisible] = useState(false)
  const [frames, setFrames] = useState<BuiltTarget[] | null>(null)
  const labelElsRef = useRef<(HTMLSpanElement | null)[]>([])
  const labelsRef = useRef<ScreenLabel[]>([])

  const pointer = usePointerInside(hostRef)
  const count = caps.tier === 'high' ? 22_000 : 11_000
  const enabled = caps.webgl && !caps.reducedMotion

  useEffect(() => {
    if (!enabled) return
    const el = hostRef.current
    if (!el) return
    const build = new IntersectionObserver(([e]) => setNear(e.isIntersecting), {
      rootMargin: '600px',
    })
    const show = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.3,
    })
    build.observe(el)
    show.observe(el)
    return () => {
      build.disconnect()
      show.disconnect()
    }
  }, [enabled])

  useEffect(() => {
    if (!near || frames) return
    let alive = true
    Promise.resolve()
      .then(() => {
        // One keyframe per stop on the walk. Two for most, three where the
        // motion has to bend rather than run straight between its ends.
        const n = KEYFRAMES[target] ?? 2
        return Array.from({ length: n }, (_, i) => buildPhased(target, count, i / (n - 1)))
      })
      .then((f) => {
        if (alive && f.every(Boolean)) setFrames(f as BuiltTarget[])
      })
      .catch(() => {
        /* Leaves the panel empty rather than breaking the section. */
      })
    return () => {
      alive = false
    }
  }, [near, frames, target, count])

  /* Written straight to a fixed pool of elements, never re-rendered. */
  useEffect(() => {
    if (!enabled || !frames) return
    let raf = 0
    const tick = () => {
      const items = labelsRef.current
      labelElsRef.current.forEach((el, i) => {
        if (!el) return
        const item = items[i]
        if (!item) {
          if (el.style.opacity !== '0') el.style.opacity = '0'
          return
        }
        if (el.textContent !== item.text) el.textContent = item.text
        el.style.transform = `translate3d(${Math.round(item.x)}px, ${Math.round(item.y)}px, 0) translate(-50%, -50%)`
        el.style.opacity = String(Math.round(item.opacity * 100) / 100)
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enabled, frames])

  if (!enabled) return <>{fallback}</>

  return (
    <div
      ref={hostRef}
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        aspectRatio: '5 / 4',
        background: 'linear-gradient(180deg, #0b1250 0%, #04072a 100%)',
      }}
      role="img"
      aria-label={label}
      data-cursor="canvas"
    >
      {frames && (
        <Canvas
          className="absolute inset-0"
          frameloop={near ? 'always' : 'never'}
          dpr={Math.min(caps.dprCap, window.devicePixelRatio || 1)}
          legacy
          flat
          gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
          camera={{ fov: 45, position: INITIAL_CAMERA, near: 0.1, far: 100 }}
        >
          <Loop
            cacheKey={`section:${target}`}
            frames={frames}
            count={count}
            pointSize={caps.tier === 'high' ? 4 : 5.5}
            simpleNoise={caps.simpleNoise}
            forming={visible}
            rendering={near}
            loop={loop}
            period={period}
            pointer={pointer}
            labels={labels}
            labelsRef={labelsRef}
          />
        </Canvas>
      )}

      <div className="pointer-events-none absolute inset-0">
        {labels.map((l, i) => (
          <span
            key={l.part}
            ref={(el) => (labelElsRef.current[i] = el)}
            className="scene-label absolute left-0 top-0"
            style={{ opacity: 0 }}
          />
        ))}
      </div>
    </div>
  )
}

function Loop({
  cacheKey,
  frames,
  count,
  pointSize,
  simpleNoise,
  forming,
  rendering,
  loop,
  period,
  pointer,
  labels,
  labelsRef,
}: {
  cacheKey: string
  frames: BuiltTarget[]
  count: number
  pointSize: number
  simpleNoise: boolean
  forming: boolean
  rendering: boolean
  loop: 'cycle' | 'pingPong'
  period: number
  pointer: { inside: React.MutableRefObject<boolean>; justEntered: React.MutableRefObject<boolean> }
  labels: PartLabel[]
  labelsRef: React.MutableRefObject<ScreenLabel[]>
}) {
  const points = useRef<THREE.Points>(null)
  const { camera } = useThree()
  const clock = useRef(0)
  const mouse = useRef(new THREE.Vector3(0, 0, 999))

  /**
   * The order the keyframes are walked in.
   *
   * `cycle` runs the list once and starts over from the top, which is the hard
   * reset a page of writing wants. `pingPong` runs down the list and back up,
   * which is how a disc gets from one horizon to the other and home again
   * along a real arc: three frames, two segments each way.
   */
  const segments = useMemo(() => {
    const n = frames.length
    const up: [number, number][] = Array.from({ length: n - 1 }, (_, i) => [i, i + 1])
    if (loop === 'cycle') return up
    const down: [number, number][] = Array.from({ length: n - 1 }, (_, i) => [n - 1 - i, n - 2 - i])
    return [...up, ...down]
  }, [frames, loop])

  const segRef = useRef(-1)

  const shadeOf = useMemo(
    () => (t: BuiltTarget) => {
      const out = new Float32Array(count * 2)
      for (let i = 0; i < count; i++) {
        out[i * 2] = t.tones[i] ?? 0.5
        out[i * 2 + 1] = t.ai[i] ?? 0
      }
      return out
    },
    [count]
  )

  const geometry = useMemo(() => {
    const rng = makeRng(41)
    const geo = new THREE.BufferGeometry()
    const a = frames[0]
    const b = frames[Math.min(1, frames.length - 1)]
    const shade = shadeOf

    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(a.positions), 3))
    geo.setAttribute('positionA', new THREE.BufferAttribute(new Float32Array(a.positions), 3))
    geo.setAttribute('positionB', new THREE.BufferAttribute(new Float32Array(b.positions), 3))
    geo.setAttribute('aShadeA', new THREE.BufferAttribute(shade(a), 2))
    geo.setAttribute('aShadeB', new THREE.BufferAttribute(shade(b), 2))
    geo.setAttribute('aScatter', new THREE.BufferAttribute(sampleCloud(count, 3.2, rng), 3))

    const random = new Float32Array(count)
    const size = new Float32Array(count)
    const delay = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      random[i] = rng()
      size[i] = 0.5 + Math.pow(rng(), 4) * 1.5
      // Staggered, so the page fills line by line instead of all at once.
      delay[i] = rng() * 0.45
    }
    geo.setAttribute('aRandom', new THREE.BufferAttribute(random, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    geo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1))
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 24)
    return geo
  }, [frames, count, shadeOf])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PARTICLE_VERT,
        fragmentShader: PARTICLE_FRAG,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        defines: simpleNoise ? { SIMPLE_NOISE: '' } : {},
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uSpread: { value: 0.45 },
          uTurbulence: { value: 0.05 },
          uNoiseScale: { value: 0.5 },
          uDrift: { value: 0.007 },
          uSize: { value: pointSize },
          uPixelRatio: { value: Math.min(2, window.devicePixelRatio || 1) },
          uMouse: { value: new THREE.Vector3(0, 0, 999) },
          uMouseRadius: { value: 0.75 },
          uMouseStrength: { value: 0 },
          uDissolve: { value: 1 },
          uFlight: { value: 0 },
          uWave: { value: 0 },
          uColorDeep: { value: new THREE.Color(PALETTE.deep) },
          uColorCore: { value: new THREE.Color(PALETTE.core) },
          uColorHi: { value: new THREE.Color(PALETTE.hi) },
          uColorHot: { value: new THREE.Color(PALETTE.hot) },
          uColorAi: { value: new THREE.Color(PALETTE.ai) },
          uOpacity: { value: 0 },
          uAdditive: { value: 1 },
        },
      }),
    [simpleNoise, pointSize]
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material]
  )

  /* Back to nothing once the canvas stops, so arriving again is an arrival. */
  useEffect(() => {
    if (rendering) return
    material.uniforms.uDissolve.value = 1
    material.uniforms.uOpacity.value = 0
    clock.current = 0
  }, [rendering, material])

  const scratch = useMemo(
    () => ({ v: new THREE.Vector3(), dir: new THREE.Vector3(), target: new THREE.Vector3() }),
    []
  )

  /* Anchors come from the first keyframe: the labelled parts do not move. */
  const anchors = useMemo(() => {
    const found = partAnchors(frames[0])
    return labels
      .filter((l) => found[l.part])
      .map((l) => ({ text: l.text, dy: l.dy ?? 0, at: new THREE.Vector3(...found[l.part]) }))
  }, [frames, labels])

  const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

  useFrame((state, delta) => {
    const u = material.uniforms
    const dt = Math.min(delta, 1 / 20)
    u.uTime.value += dt

    const rate = forming ? 1.1 : -1.4
    u.uDissolve.value = Math.min(1, Math.max(0, u.uDissolve.value - dt * rate))
    u.uOpacity.value = Math.min(1, Math.max(0, u.uOpacity.value + dt * (forming ? 1.2 : -1.6)))

    // Only run the loop once the shape has actually gathered, so the first
    // thing anyone sees is the shape rather than the middle of its animation.
    if (u.uDissolve.value < 0.2) clock.current += dt / Math.max(0.2, period)

    // Which segment of the walk we are on, and how far along it.
    const total = segments.length
    const pos = ((clock.current % total) + total) % total
    const seg = Math.min(total - 1, Math.floor(pos))
    if (seg !== segRef.current) {
      segRef.current = seg
      const [ai, bi] = segments[seg]
      const attrA = geometry.getAttribute('positionA') as THREE.BufferAttribute
      const attrB = geometry.getAttribute('positionB') as THREE.BufferAttribute
      attrA.copyArray(frames[ai].positions)
      attrB.copyArray(frames[bi].positions)
      attrA.needsUpdate = true
      attrB.needsUpdate = true
      const sA = geometry.getAttribute('aShadeA') as THREE.BufferAttribute
      const sB = geometry.getAttribute('aShadeB') as THREE.BufferAttribute
      sA.copyArray(shadeOf(frames[ai]))
      sB.copyArray(shadeOf(frames[bi]))
      sA.needsUpdate = true
      sB.needsUpdate = true
    }
    u.uProgress.value = smoother(pos - seg)
    u.uFlight.value = 0

    if (points.current) {
      const view = {
        aspect: state.size.width / Math.max(1, state.size.height),
        fov: (camera as THREE.PerspectiveCamera).fov,
      }
      const fit = solveFrame(
        cacheKey,
        frames[0].positions,
        insetForPush(FEATURE_BOX, view.aspect),
        view,
        { xFraction: 0.5, yaw: 0.12 }
      )
      points.current.position.set(fit.x, fit.y, 0)
      camera.position.set(0, 0, fit.distance)
      camera.lookAt(0, 0, 0)
      u.uMouseRadius.value = fit.halfH * 0.5
      u.uMouseStrength.value = pointer.inside.current ? pushStrength(fit.halfH) : 0

      points.current.rotation.y = Math.sin(u.uTime.value * 0.18) * 0.12

      scratch.v.set(state.pointer.x, state.pointer.y, 0.5).unproject(camera)
      scratch.dir.copy(scratch.v).sub(camera.position).normalize()
      const dist = -camera.position.z / (scratch.dir.z || -1)
      scratch.target.copy(camera.position).addScaledVector(scratch.dir, dist)
      points.current.updateWorldMatrix(true, false)
      points.current.worldToLocal(scratch.target)
      if (pointer.justEntered.current) {
        mouse.current.copy(scratch.target)
        pointer.justEntered.current = false
      } else {
        mouse.current.lerp(scratch.target, 1 - Math.pow(0.002, dt))
      }
      u.uMouse.value.copy(mouse.current)

      /* Labels ride the settled shape, so they fade in with it. */
      const out = labelsRef.current
      out.length = 0
      const settled = 1 - u.uDissolve.value
      if (settled > 0.35) {
        points.current.updateWorldMatrix(true, false)
        for (const anchor of anchors) {
          scratch.v.copy(anchor.at)
          points.current.localToWorld(scratch.v)
          scratch.v.project(camera)
          if (scratch.v.z > 1) continue
          out.push({
            text: anchor.text,
            x: (scratch.v.x * 0.5 + 0.5) * state.size.width,
            y: (-scratch.v.y * 0.5 + 0.5) * state.size.height + anchor.dy,
            opacity: Math.min(1, (settled - 0.35) / 0.4),
          })
        }
      }
    }
  })

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}
