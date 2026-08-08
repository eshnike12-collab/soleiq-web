import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PARTICLE_FRAG, PARTICLE_VERT } from '../../three/shaders'
import { buildAllTargets } from '../../three/targets'
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
 * One topic, one particle composition.
 *
 * This is not the narrative. Nothing is pinned to the scroll, nothing morphs
 * into anything else: the section arrives, the shape forms out of nothing, and
 * it holds. Scroll on and the next topic does the same for itself.
 *
 * It reuses the narrative's shader, targets and part labels at a fraction of
 * the particle count, and does not build or render until the section is in view.
 */

const PALETTE = {
  deep: '#7c46c4',
  core: '#a45fe8',
  hi: '#cf9dff',
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

/** How far the composition turns, and how fast. The framing solver needs the
    amplitude: the turn swings the shape's own depth into its silhouette. */
const SWING = 0.22
const SWING_RATE = 0.22

interface Props {
  target: TargetKey
  /** Named parts of the shape, labelled the same way the narrative labels them. */
  labels?: PartLabel[]
  /** Described for screen readers; the canvas itself is decorative. */
  label: string
  /** Shown instead when there is no WebGL, or motion is not wanted. */
  fallback: ReactNode
}

interface ScreenLabel {
  text: string
  x: number
  y: number
  opacity: number
}

export default function FeatureParticles({
  target,
  labels = [],
  label,
  fallback,
}: Props) {
  const caps = useMemo(detectCapabilities, [])
  const hostRef = useRef<HTMLDivElement>(null)
  const labelElsRef = useRef<(HTMLSpanElement | null)[]>([])
  const labelsRef = useRef<ScreenLabel[]>([])
  const [near, setNear] = useState(false)
  const [visible, setVisible] = useState(false)
  const [built, setBuilt] = useState<BuiltTarget | null>(null)

  const pointer = usePointerInside(hostRef)
  const count = caps.tier === 'high' ? 30_000 : 14_000
  const enabled = caps.webgl && !caps.reducedMotion

  /* Build a little ahead of arrival, but do not form until it is actually seen.
     `near` also decides whether the canvas renders at all: the shape has to
     keep animating for a moment after it leaves the screen, or it freezes
     half-formed and there is nothing to come back to. */
  useEffect(() => {
    if (!enabled) return
    const el = hostRef.current
    if (!el) return
    const build = new IntersectionObserver(([e]) => setNear(e.isIntersecting), {
      rootMargin: '600px',
    })
    const show = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.35,
    })
    build.observe(el)
    show.observe(el)
    return () => {
      build.disconnect()
      show.disconnect()
    }
  }, [enabled])

  useEffect(() => {
    if (!near || built) return
    let alive = true
    // Built once. `near` goes false again when the panel is well off screen,
    // but the sampled shape is worth keeping — it is the formed state that is
    // thrown away, not the geometry.
    buildAllTargets([target], count)
      .then((t) => alive && setBuilt(t[target]))
      .catch(() => {
        /* Leaves the panel empty rather than breaking the section. */
      })
    return () => {
      alive = false
    }
  }, [near, built, target, count])

  /* Labels are written straight to a fixed pool of elements, never re-rendered. */
  useEffect(() => {
    if (!enabled || !built) return
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
  }, [enabled, built])

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
      {built && (
        <Canvas
          className="absolute inset-0"
          frameloop={near ? 'always' : 'never'}
          dpr={Math.min(caps.dprCap, window.devicePixelRatio || 1)}
          legacy
          flat
          gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
          camera={{ fov: 45, position: INITIAL_CAMERA, near: 0.1, far: 100 }}
        >
          <Shape
            cacheKey={`feature:${target}`}
            built={built}
            count={count}
            pointSize={caps.tier === 'high' ? 4 : 5.5}
            rendering={near}
            simpleNoise={caps.simpleNoise}
            forming={visible}
            labels={labels}
            labelsRef={labelsRef}
            pointer={pointer}
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

function Shape({
  cacheKey,
  built,
  count,
  pointSize,
  rendering,
  simpleNoise,
  forming,
  labels,
  labelsRef,
  pointer,
}: {
  /** Identifies this composition in the framing solver's result cache. */
  cacheKey: string
  built: BuiltTarget
  count: number
  /**
   * Deliberately smaller than the narrative's. These panels are a fraction of
   * the size but carry a third of the particles, so at the narrative's point
   * size the sprites overlap into a solid glow under additive blending and the
   * picture reads as a bright smear instead of a drawing.
   */
  pointSize: number
  /** False once the panel is far enough away that the canvas has stopped. */
  rendering: boolean
  simpleNoise: boolean
  forming: boolean
  labels: PartLabel[]
  labelsRef: React.MutableRefObject<ScreenLabel[]>
  pointer: { inside: React.MutableRefObject<boolean>; justEntered: React.MutableRefObject<boolean> }
}) {
  const points = useRef<THREE.Points>(null)
  const { camera } = useThree()
  const mouse = useRef(new THREE.Vector3(0, 0, 999))

  const geometry = useMemo(() => {
    const rng = makeRng(17)
    const geo = new THREE.BufferGeometry()
    const shade = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      shade[i * 2] = built.tones[i] ?? 0.5
      shade[i * 2 + 1] = built.ai[i] ?? 0
    }
    // Both morph slots hold the same shape: there is nothing to morph into.
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(built.positions), 3))
    geo.setAttribute('positionA', new THREE.BufferAttribute(new Float32Array(built.positions), 3))
    geo.setAttribute('positionB', new THREE.BufferAttribute(new Float32Array(built.positions), 3))
    geo.setAttribute('aShadeA', new THREE.BufferAttribute(shade, 2))
    geo.setAttribute('aShadeB', new THREE.BufferAttribute(new Float32Array(shade), 2))
    geo.setAttribute('aScatter', new THREE.BufferAttribute(sampleCloud(count, 3.2, rng), 3))

    const random = new Float32Array(count)
    const size = new Float32Array(count)
    const delay = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      random[i] = rng()
      size[i] = 0.5 + Math.pow(rng(), 4) * 1.5
      delay[i] = 0
    }
    geo.setAttribute('aRandom', new THREE.BufferAttribute(random, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    geo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1))
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 24)
    return geo
  }, [built, count])

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
          uSpread: { value: 0.55 },
          uTurbulence: { value: 0 },
          uNoiseScale: { value: 0.5 },
          uDrift: { value: 0.008 },
          uSize: { value: pointSize },
          uPixelRatio: { value: Math.min(2, window.devicePixelRatio || 1) },
          uMouse: { value: new THREE.Vector3(0, 0, 999) },
          // Both rewritten every frame from the solved framing.
          uMouseRadius: { value: 0.75 },
          uMouseStrength: { value: 0 },
          // Starts fully scattered and invisible. Nothing forms until the
          // section is actually on screen — the picture is for the person
          // looking at it, not for the scroll position.
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

  /* Back to nothing once the canvas stops.
   *
   * Leaving the screen is what resets the picture, so that coming back to it
   * is the same event as arriving the first time: scattered, then forming. The
   * scatter animates while the panel is still nearby, but a fast scroll gets
   * the render loop stopped part-way through it — so the state is also set
   * outright here, which is the only version that holds however it was left. */
  useEffect(() => {
    if (rendering) return
    material.uniforms.uDissolve.value = 1
    material.uniforms.uOpacity.value = 0
    labelsRef.current.length = 0
  }, [rendering, material, labelsRef])

  const anchors = useMemo(() => {
    const found = partAnchors(built)
    return labels
      .filter((l) => found[l.part])
      .map((l) => ({ text: l.text, dy: l.dy ?? 0, at: new THREE.Vector3(...found[l.part]) }))
  }, [built, labels])

  const scratch = useMemo(
    () => ({ v: new THREE.Vector3(), dir: new THREE.Vector3(), target: new THREE.Vector3() }),
    []
  )

  useFrame((state, delta) => {
    const u = material.uniforms
    const dt = Math.min(delta, 1 / 20)
    u.uTime.value += dt

    // Forms over about a second once seen, and holds.
    const rate = forming ? 1.1 : -1.4
    u.uDissolve.value = Math.min(1, Math.max(0, u.uDissolve.value - dt * rate))
    u.uOpacity.value = Math.min(1, Math.max(0, u.uOpacity.value + dt * (forming ? 1.2 : -1.6)))

    if (points.current) {
      // Framed by the same solver the narrative uses, against this panel's own
      // box. Nothing is animating the framing here, so it is simply written —
      // recomputed each frame so a resize is picked up without a listener.
      const view = {
        aspect: state.size.width / Math.max(1, state.size.height),
        fov: (camera as THREE.PerspectiveCamera).fov,
      }
      const fit = solveFrame(
        cacheKey,
        built.positions,
        insetForPush(FEATURE_BOX, view.aspect),
        view,
        { xFraction: 0.5, yaw: SWING }
      )
      points.current.position.set(fit.x, fit.y, 0)
      camera.position.set(0, 0, fit.distance)
      camera.lookAt(0, 0, 0)
      // A constant-sized dent on screen, whatever distance the fit landed on.
      u.uMouseRadius.value = fit.halfH * 0.5
      u.uMouseStrength.value = pointer.inside.current ? pushStrength(fit.halfH) : 0

      // A slow, shallow turn: enough to read as three-dimensional, not enough
      // to show the composition edge-on.
      points.current.rotation.y = Math.sin(u.uTime.value * SWING_RATE) * SWING

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
    }

    /* Labels ride the formed shape, so they fade in with it. */
    const out = labelsRef.current
    out.length = 0
    const settled = 1 - u.uDissolve.value
    if (settled > 0.35 && points.current) {
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
  })

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}
