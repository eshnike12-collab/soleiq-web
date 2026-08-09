import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PARTICLE_FRAG, PARTICLE_VERT } from '../../three/shaders'
import { applyMotion, buildStill, motionTrack } from '../../three/targets'
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
   * thin curve it lands across the very thing it is pointing at, and on a
   * screen it lands across what is being shown on it.
   */
  dx?: number
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
  const [base, setBase] = useState<BuiltTarget | null>(null)
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

  /* One build, held still. What moves is resolved off it as a set of small
     per-part keyframes — see `motionTrack`. */
  useEffect(() => {
    if (!near || base) return
    let alive = true
    Promise.resolve()
      .then(() => buildStill(target, count))
      .then((b) => {
        if (alive && b) setBase(b)
      })
      .catch(() => {
        /* Leaves the panel empty rather than breaking the section. */
      })
    return () => {
      alive = false
    }
  }, [near, base, target, count])

  /* Written straight to a fixed pool of elements, never re-rendered. */
  useEffect(() => {
    if (!enabled || !base) return
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
  }, [enabled, base])

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
      {base && (
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
            target={target}
            base={base}
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
  target,
  base,
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
  target: TargetKey
  base: BuiltTarget
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
   * The one part of this composition that moves.
   *
   * These panels used to animate by morphing between whole keyframes of the
   * scene. Even where two keyframes were identical for a particle, the morph
   * still ran it through the shader's turbulence term, so a marker crossing
   * the frame made the laptop, the feet and the axis boil along with it. Now
   * the composition is built once and held, and only the moving part's own
   * particles are rewritten — which is exactly what the scroll narrative does.
   */
  const track = useMemo(() => motionTrack(target, base), [target, base])

  /* One pass through the keyframes, at the pace the section asked for. The
     prop is seconds per step; a full pass is however many steps the walk has. */
  const fullPeriod = useMemo(() => {
    const n = track?.parts[0].frames.length ?? 2
    const steps = loop === 'pingPong' ? Math.max(1, (n - 1) * 2) : n
    return period * steps
  }, [track, loop, period])

  const geometry = useMemo(() => {
    const rng = makeRng(41)
    const geo = new THREE.BufferGeometry()
    const shade = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      shade[i * 2] = base.tones[i] ?? 0.5
      shade[i * 2 + 1] = base.ai[i] ?? 0
    }

    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(base.positions), 3))
    // Both ends of the morph are the same shape: nothing in this panel morphs
    // any more, so `uProgress` stays at zero and positionA is what is drawn.
    geo.setAttribute('positionA', new THREE.BufferAttribute(new Float32Array(base.positions), 3))
    geo.setAttribute('positionB', new THREE.BufferAttribute(new Float32Array(base.positions), 3))
    geo.setAttribute('aShadeA', new THREE.BufferAttribute(shade, 2))
    geo.setAttribute('aShadeB', new THREE.BufferAttribute(new Float32Array(shade), 2))
    geo.setAttribute('aScatter', new THREE.BufferAttribute(sampleCloud(count, 3.2, rng), 3))

    const random = new Float32Array(count)
    const size = new Float32Array(count)
    const delay = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      random[i] = rng()
      size[i] = 0.5 + Math.pow(rng(), 4) * 1.5
      // Staggered, so the panel fills in rather than all at once.
      delay[i] = rng() * 0.45
    }
    geo.setAttribute('aRandom', new THREE.BufferAttribute(random, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    geo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1))
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 24)
    return geo
  }, [base, count])

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
          // No morph, so no burst. The idle drift is all the motion the held
          // shape is entitled to.
          uTurbulence: { value: 0 },
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

  /* Anchors come from the held shape: the labelled parts do not move. */
  const anchors = useMemo(() => {
    const found = partAnchors(base)
    return labels
      .filter((l) => found[l.part])
      .map((l) => ({ text: l.text, dx: l.dx ?? 0, dy: l.dy ?? 0, at: new THREE.Vector3(...found[l.part]) }))
  }, [base, labels])

  useFrame((state, delta) => {
    const u = material.uniforms
    const dt = Math.min(delta, 1 / 20)
    u.uTime.value += dt

    const rate = forming ? 1.1 : -1.4
    u.uDissolve.value = Math.min(1, Math.max(0, u.uDissolve.value - dt * rate))
    u.uOpacity.value = Math.min(1, Math.max(0, u.uOpacity.value + dt * (forming ? 1.2 : -1.6)))

    // Only start the walk once the shape has gathered, so the first thing
    // anyone sees is the shape and not the middle of its animation.
    if (u.uDissolve.value < 0.2) clock.current += dt

    if (track) {
      const attrA = geometry.getAttribute('positionA') as THREE.BufferAttribute
      const shadeA = geometry.getAttribute('aShadeA') as THREE.BufferAttribute
      const moved = applyMotion(
        track,
        attrA.array as Float32Array,
        clock.current,
        fullPeriod,
        shadeA.array as Float32Array
      )
      attrA.clearUpdateRanges()
      for (const r of moved.pos) attrA.addUpdateRange(r.from, r.span)
      attrA.needsUpdate = true
      if (moved.shade.length) {
        shadeA.clearUpdateRanges()
        for (const r of moved.shade) shadeA.addUpdateRange(r.from, r.span)
        shadeA.needsUpdate = true
      }
    }

    if (points.current) {
      const view = {
        aspect: state.size.width / Math.max(1, state.size.height),
        fov: (camera as THREE.PerspectiveCamera).fov,
      }
      const fit = solveFrame(
        cacheKey,
        base.positions,
        insetForPush(FEATURE_BOX, view.aspect),
        view,
        { xFraction: 0.5, yaw: 0.12 }
      )
      points.current.position.set(fit.x, fit.y, 0)
      camera.position.set(0, 0, fit.distance)
      camera.lookAt(0, 0, 0)
      u.uMouseRadius.value = fit.halfH * 0.5
      u.uMouseStrength.value = pointer.inside.current ? pushStrength(fit.halfH) : 0

      // Barely a sway. These compositions have one thing that is supposed to
      // be moving, and a turning picture competes with it.
      points.current.rotation.y = Math.sin(u.uTime.value * 0.14) * 0.04

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
            x: (scratch.v.x * 0.5 + 0.5) * state.size.width + anchor.dx,
            y: (-scratch.v.y * 0.5 + 0.5) * state.size.height + anchor.dy,
            opacity: Math.min(1, (settled - 0.35) / 0.4),
          })
        }
      }
    }
  })

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}
