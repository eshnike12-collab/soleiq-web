import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PARTICLE_FRAG, PARTICLE_VERT } from '../../three/shaders'
import { buildPhased } from '../../three/targets'
import {
  solveFrame,
  insetForPush,
  pushStrength,
  FEATURE_BOX,
  INITIAL_CAMERA,
} from '../../three/framing'
import { detectCapabilities } from '../../three/capabilities'
import { makeRng, sampleCloud, type BuiltTarget } from '../../three/sampleTargets'
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
 *   `cycle`     — runs to the end and starts over. The reset is the point, for
 *                 a page that fills with writing and is then a blank page again.
 *   `pingPong`  — runs there and back. For anything whose motion has to reverse
 *                 to make sense: a sun that sets has to rise.
 */

const PALETTE = {
  deep: '#7c46c4',
  core: '#a45fe8',
  hi: '#cf9dff',
  hot: '#ffffff',
  ai: '#26f7fd',
}

interface Props {
  target: TargetKey
  /** How the loop turns over. */
  loop: 'cycle' | 'pingPong'
  /** Seconds for one pass between the two keyframes. */
  period: number
  /** Described for screen readers; the canvas itself is decorative. */
  label: string
  /** Shown instead when there is no WebGL, or motion is not wanted. */
  fallback: ReactNode
}

export default function SectionParticles({ target, loop, period, label, fallback }: Props) {
  const caps = useMemo(detectCapabilities, [])
  const hostRef = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const [visible, setVisible] = useState(false)
  const [pair, setPair] = useState<[BuiltTarget, BuiltTarget] | null>(null)

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
    if (!near || pair) return
    let alive = true
    Promise.resolve()
      .then(() => [buildPhased(target, count, 0), buildPhased(target, count, 1)] as const)
      .then((p) => alive && p[0] && p[1] && setPair([p[0], p[1]]))
      .catch(() => {
        /* Leaves the panel empty rather than breaking the section. */
      })
    return () => {
      alive = false
    }
  }, [near, pair, target, count])

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
      {pair && (
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
            pair={pair}
            count={count}
            pointSize={caps.tier === 'high' ? 4 : 5.5}
            simpleNoise={caps.simpleNoise}
            forming={visible}
            rendering={near}
            loop={loop}
            period={period}
          />
        </Canvas>
      )}
    </div>
  )
}

function Loop({
  cacheKey,
  pair,
  count,
  pointSize,
  simpleNoise,
  forming,
  rendering,
  loop,
  period,
}: {
  cacheKey: string
  pair: [BuiltTarget, BuiltTarget]
  count: number
  pointSize: number
  simpleNoise: boolean
  forming: boolean
  rendering: boolean
  loop: 'cycle' | 'pingPong'
  period: number
}) {
  const points = useRef<THREE.Points>(null)
  const { camera } = useThree()
  const clock = useRef(0)
  const mouse = useRef(new THREE.Vector3(0, 0, 999))
  const pointerSeen = useRef(false)
  const snapPointer = useRef(false)

  useEffect(() => {
    const seen = () => {
      pointerSeen.current = true
      snapPointer.current = true
    }
    window.addEventListener('pointermove', seen, { once: true, passive: true })
    return () => window.removeEventListener('pointermove', seen)
  }, [])

  const geometry = useMemo(() => {
    const rng = makeRng(41)
    const geo = new THREE.BufferGeometry()
    const [a, b] = pair

    const shade = (t: BuiltTarget) => {
      const out = new Float32Array(count * 2)
      for (let i = 0; i < count; i++) {
        out[i * 2] = t.tones[i] ?? 0.5
        out[i * 2 + 1] = t.ai[i] ?? 0
      }
      return out
    }

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
  }, [pair, count])

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

    if (loop === 'cycle') {
      const t = clock.current % 1
      u.uProgress.value = smoother(t)
      // A hair of turbulence at the wrap, so the reset reads as the page being
      // taken away rather than the ink jumping back up it.
      u.uFlight.value = t > 0.94 ? (t - 0.94) / 0.06 : 0
    } else {
      const t = clock.current % 2
      u.uProgress.value = smoother(t < 1 ? t : 2 - t)
      u.uFlight.value = 0
    }

    if (points.current) {
      const view = {
        aspect: state.size.width / Math.max(1, state.size.height),
        fov: (camera as THREE.PerspectiveCamera).fov,
      }
      const fit = solveFrame(
        cacheKey,
        pair[0].positions,
        insetForPush(FEATURE_BOX, view.aspect),
        view,
        { xFraction: 0.5, yaw: 0.12 }
      )
      points.current.position.set(fit.x, fit.y, 0)
      camera.position.set(0, 0, fit.distance)
      camera.lookAt(0, 0, 0)
      u.uMouseRadius.value = fit.halfH * 0.5
      u.uMouseStrength.value = pointerSeen.current ? pushStrength(fit.halfH) : 0

      points.current.rotation.y = Math.sin(u.uTime.value * 0.18) * 0.12

      scratch.v.set(state.pointer.x, state.pointer.y, 0.5).unproject(camera)
      scratch.dir.copy(scratch.v).sub(camera.position).normalize()
      const dist = -camera.position.z / (scratch.dir.z || -1)
      scratch.target.copy(camera.position).addScaledVector(scratch.dir, dist)
      points.current.updateWorldMatrix(true, false)
      points.current.worldToLocal(scratch.target)
      if (snapPointer.current) {
        mouse.current.copy(scratch.target)
        snapPointer.current = false
      } else {
        mouse.current.lerp(scratch.target, 1 - Math.pow(0.002, dt))
      }
      u.uMouse.value.copy(mouse.current)
    }
  })

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}
