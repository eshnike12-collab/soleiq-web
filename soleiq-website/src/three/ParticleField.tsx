import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PARTICLE_FRAG, PARTICLE_VERT } from './shaders'
import { SCENES, sceneAt } from './scenes'
import { applyMotion, motionTrack, type MotionTrack } from './targets'
import { bestFrame, insetForPush, narrativeBox, narrativeSideBox, pushStrength } from './framing'
import type { Capabilities } from './capabilities'
import { makeRng, partAnchors, sampleCloud, type BuiltTarget } from './sampleTargets'

/**
 * Colour management off, deliberately.
 *
 * three converts every `new THREE.Color('#rrggbb')` from sRGB into its linear
 * working space, and for its own materials it converts back on output. These
 * are raw ShaderMaterials writing gl_FragColor directly, so nothing converts
 * back — the linear values land in an sRGB framebuffer and every colour renders
 * far darker than the hex says. That is what turned the purple into indigo and
 * the dark blue ground into black.
 *
 * There are no textures, no lights and no physical shading anywhere in this
 * scene, so there is nothing for a linear pipeline to buy us. Switching it off
 * makes each hex in scenes.ts mean exactly what it says on screen.
 */
THREE.ColorManagement.enabled = false

interface Props {
  targets: Record<string, BuiltTarget>
  count: number
  caps: Capabilities
  /** Narrative progress 0..1, written by the scroll driver, read every frame. */
  progressRef: MutableRefObject<number>
  /**
   * Screen positions for the scene labels, written here and read by the DOM
   * layer. Projection needs the camera and the group transform, both of which
   * only exist inside the canvas.
   */
  labelsRef: MutableRefObject<LabelScreenPos[]>
  /**
   * Where each scene's copy sits inside the panel, in pixels. The framing keeps
   * the art clear of it. Empty until measured, which simply leaves the declared
   * bottom of the safe box in force.
   */
  copyRectRef: MutableRefObject<{ tops: number[]; rights: number[] }>
  /** True while the panel is being looked at: the shape gathers, or comes apart. */
  forming: boolean
  /** False once the panel is far enough away that the canvas has stopped. */
  rendering: boolean
  /**
   * The narrative copy for the active language, keyed by scene id.
   *
   * The labels floating over the cloud are words, so they belong to the
   * dictionary like every other word; the scene declares which key it wants
   * and this resolves it. Passed in rather than read here because this module
   * is inside the canvas and has no business knowing about React context.
   */
  sceneCopy: Record<string, Record<string, string>>
  /** Whether the pointer is over this panel, and the frame it arrived on. */
  pointer: {
    inside: MutableRefObject<boolean>
    justEntered: MutableRefObject<boolean>
  }
}

export interface LabelScreenPos {
  text: string
  /** Viewport pixels. */
  x: number
  y: number
  opacity: number
}

/**
 * Interleaves a shape's tone and AI-accent channels into the vec2 the shader
 * reads. Allocated per transition — five times over the whole sequence — not
 * per frame.
 */
function packShade(target: BuiltTarget, count: number): Float32Array {
  const out = new Float32Array(count * 2)
  for (let i = 0; i < count; i++) {
    out[i * 2] = target.tones[i] ?? 0.5
    out[i * 2 + 1] = target.ai[i] ?? 0
  }
  return out
}

const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** How much of the morph timeline the per-particle stagger occupies. */
const SPREAD = 0.55

/**
 * How far the cloud ever turns, in radians.
 *
 * The framing solver needs these: a shape that turns swings its own depth into
 * its silhouette and carries its flanks toward the lens, and both of those are
 * on screen for real. Fitting the resting shape and ignoring them is exactly
 * how the art ended up over the navbar.
 */
const PARALLAX_YAW = 0.07
const PARALLAX_PITCH = 0.05
/** The opening scene turns through a wider arc than the rest. */
const swingOf = (index: number) => (index === 0 ? 0.2 : 0.05)

/**
 * The scene background, drawn as a full-screen quad inside the canvas.
 *
 * It used to be a CSS gradient on the sticky container, rewritten whenever the
 * colour changed. Once every morph started lifting the background to the flash
 * colour, that became a full-viewport repaint on almost every frame, and the
 * compositor halved the page to a flat 30fps. Two uniforms cost nothing.
 *
 * Positions are written straight to clip space, so the camera never touches it.
 */
const BG_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`

const BG_FRAG = /* glsl */ `
precision mediump float;
varying vec2 vUv;
uniform vec3 uTop;
uniform vec3 uBottom;
void main() {
  gl_FragColor = vec4(mix(uBottom, uTop, vUv.y), 1.0);
}
`

export default function ParticleField({
  targets,
  count,
  caps,
  progressRef,
  labelsRef,
  copyRectRef,
  forming,
  rendering,
  sceneCopy,
  pointer,
}: Props) {
  const points = useRef<THREE.Points>(null)
  const group = useRef<THREE.Group>(null)
  const { camera } = useThree()

  /**
   * What moves inside each scene while it is held.
   *
   * Resolved once, off the built targets. Each track carries only the moving
   * part's own particles, so this is kilobytes rather than the tens of
   * megabytes a set of full keyframes at this particle count would be.
   */
  const motions = useMemo(() => {
    const out: Record<string, MotionTrack | null> = {}
    for (const scene of SCENES) {
      if (scene.target in out) continue
      const base = targets[scene.target]
      out[scene.target] = base ? motionTrack(scene.target, base) : null
    }
    return out
  }, [targets])

  const sceneIndexRef = useRef(-1)
  /** False until the framing has been solved once, so the first frame snaps. */
  const framedRef = useRef(false)
  const mouseWorld = useRef(new THREE.Vector3(0, 0, 0))
  /** Anchors for the current scene's labels, in shape space. */
  const anchorsRef = useRef<{ text: string; dx: number; dy: number; at: THREE.Vector3 }[]>([])

  /* ── Geometry: allocated once, never reallocated ───────────────────────── */
  const geometry = useMemo(() => {
    const rng = makeRng(5)
    const geo = new THREE.BufferGeometry()

    const first = targets[SCENES[0].target]
    const second = targets[SCENES[1].target] ?? first

    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(first.positions), 3))
    geo.setAttribute('positionA', new THREE.BufferAttribute(new Float32Array(first.positions), 3))
    geo.setAttribute('positionB', new THREE.BufferAttribute(new Float32Array(second.positions), 3))
    geo.setAttribute('aShadeA', new THREE.BufferAttribute(packShade(first, count), 2))
    geo.setAttribute('aShadeB', new THREE.BufferAttribute(packShade(second, count), 2))
    geo.setAttribute(
      'aScatter',
      new THREE.BufferAttribute(sampleCloud(count, 3.6, rng), 3)
    )

    const random = new Float32Array(count)
    const size = new Float32Array(count)
    const delay = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      random[i] = rng()
      // Most particles small, a few noticeably larger — reads as depth, not noise.
      // Narrow size spread: a few larger points for depth, most of them small
      // and uniform, which is what makes the silhouette legible.
      size[i] = 0.5 + Math.pow(rng(), 4) * 1.5
      delay[i] = rng() * (1 - SPREAD)
    }
    geo.setAttribute('aRandom', new THREE.BufferAttribute(random, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    geo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1))

    // Culling this cloud is never right — it always fills the frame.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 24)
    return geo
  }, [targets, count])

  /* ── Material ──────────────────────────────────────────────────────────── */
  const material = useMemo(() => {
    const s0 = SCENES[0]
    return new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: s0.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      defines: caps.simpleNoise ? { SIMPLE_NOISE: '' } : {},
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uSpread: { value: SPREAD },
        uTurbulence: { value: s0.turbulence },
        uNoiseScale: { value: 0.5 },
        uDrift: { value: 0.006 },
        uSize: { value: caps.tier === 'high' ? 6.5 : 9 },
        uPixelRatio: { value: Math.min(caps.dprCap, window.devicePixelRatio || 1) },
        uMouse: { value: new THREE.Vector3(0, 0, 999) },
        // Both rewritten every frame from the solved framing — see below.
        uMouseRadius: { value: 0.8 },
        uMouseStrength: { value: 0 },
        uDissolve: { value: 1 },
        uFlight: { value: 0 },
        uWave: { value: 0 },
        uColorDeep: { value: new THREE.Color(s0.colors.deep ?? s0.colors.core) },
        uColorCore: { value: new THREE.Color(s0.colors.core) },
        uColorHi: { value: new THREE.Color(s0.colors.hi) },
        uColorHot: { value: new THREE.Color(s0.colors.hot) },
        uColorAi: { value: new THREE.Color(s0.colors.ai ?? '#8b5cf6') },
        uOpacity: { value: 0 },
        uAdditive: { value: s0.additive ? 1 : 0 },
      },
    })
  }, [caps])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  /* Back to the scatter once the canvas stops.
   *
   * The cloud comes apart on its own while the panel is still nearby and being
   * rendered, but a fast scroll gets the loop stopped part-way through that —
   * so the state is also set outright here, which is the only version that
   * holds however it was left. */
  useEffect(() => {
    if (rendering) return
    material.uniforms.uDissolve.value = 1
    material.uniforms.uOpacity.value = 0
    labelsRef.current.length = 0
  }, [rendering, material, labelsRef])

  /* ── Reusable scratch objects — nothing is allocated per frame ─────────── */
  const scratch = useMemo(
    () => ({
      colDeep: new THREE.Color(),
      colCore: new THREE.Color(),
      colHi: new THREE.Color(),
      colHot: new THREE.Color(),
      colAi: new THREE.Color(),
      bgTop: new THREE.Color(),
      bgBot: new THREE.Color(),
      // Day/night stays inside the blue family — the cycle is carried by how
      // lit the sky is, not by swinging the palette warm.
      dayCore: new THREE.Color('#9a5ee6'),
      dayHi: new THREE.Color('#d7b4ff'),
      dayTop: new THREE.Color('#101e63'),
      dayBot: new THREE.Color('#08103c'),
      // The transition colour: every morph lifts to this and settles back.
      flashCore: new THREE.Color('#5bd6ff'),
      flashHi: new THREE.Color('#c2f8ff'),
      flashTop: new THREE.Color('#0d1a5c'),
      flashBot: new THREE.Color('#050c30'),
      v: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      target: new THREE.Vector3(),
      sceneColors: SCENES.map((s) => ({
        deep: new THREE.Color(s.colors.deep ?? s.colors.core),
        core: new THREE.Color(s.colors.core),
        hi: new THREE.Color(s.colors.hi),
        hot: new THREE.Color(s.colors.hot),
        ai: new THREE.Color(s.colors.ai ?? '#8b5cf6'),
        bgTop: new THREE.Color(s.bg[0]),
        bgBot: new THREE.Color(s.bg[1]),
      })),
    }),
    []
  )

  const bgMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: BG_VERT,
        fragmentShader: BG_FRAG,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(SCENES[0].bg[0]) },
          uBottom: { value: new THREE.Color(SCENES[0].bg[1]) },
        },
      }),
    []
  )

  useEffect(() => () => bgMaterial.dispose(), [bgMaterial])

  useFrame((state, delta) => {
    const u = material.uniforms
    const dt = Math.min(delta, 1 / 20)
    u.uTime.value += dt

    const p = progressRef.current
    const { index, local, morph } = sceneAt(p)
    const scene = SCENES[index]
    const next = SCENES[Math.min(SCENES.length - 1, index + 1)]

    /* Scene change: swap the morph pair. One upload per transition, five total. */
    const sceneChanged = index !== sceneIndexRef.current
    if (sceneChanged) {
      const a = targets[scene.target]
      const b = targets[next.target] ?? a
      const attrA = geometry.getAttribute('positionA') as THREE.BufferAttribute
      const attrB = geometry.getAttribute('positionB') as THREE.BufferAttribute
      attrA.copyArray(a.positions)
      attrB.copyArray(b.positions)
      attrA.clearUpdateRanges()
      attrA.needsUpdate = true
      attrB.needsUpdate = true

      const shadeA = geometry.getAttribute('aShadeA') as THREE.BufferAttribute
      const shadeB = geometry.getAttribute('aShadeB') as THREE.BufferAttribute
      shadeA.copyArray(packShade(a, count))
      shadeB.copyArray(packShade(b, count))
      shadeA.needsUpdate = true
      shadeB.needsUpdate = true

      const anchors = partAnchors(a)
      anchorsRef.current = (scene.labels ?? [])
        .filter((l) => anchors[l.part])
        .map((l) => ({
          text: sceneCopy[scene.id]?.[l.textKey] ?? '',
          dx: l.dx ?? 0,
          dy: l.dy ?? 0,
          at: new THREE.Vector3(...anchors[l.part]),
        }))
      sceneIndexRef.current = index
    }

    /* ── In-scene motion ──────────────────────────────────────────────────
     *
     * The one part of the scene that moves, walked through its keyframes and
     * written straight into positionA. Only while the shape is held: once the
     * morph starts, positionA is what the cloud is leaving, and something that
     * kept moving underneath a departing shape would drag it sideways.
     *
     * A sub-range upload, so a moving marker costs its own particles and not
     * the whole cloud's worth of bus traffic every frame. */
    const track = motions[scene.target]
    if (track && morph <= 0.001) {
      const attrA = geometry.getAttribute('positionA') as THREE.BufferAttribute
      const shadeA = geometry.getAttribute('aShadeA') as THREE.BufferAttribute
      const moved = applyMotion(
        track,
        attrA.array as Float32Array,
        u.uTime.value,
        track.period,
        shadeA.array as Float32Array
      )
      if (moved.shade.length) {
        if (!sceneChanged) {
          shadeA.clearUpdateRanges()
          for (const r of moved.shade) shadeA.addUpdateRange(r.from, r.span)
        }
        shadeA.needsUpdate = true
      }

      /* Never narrow the upload on the frame the scene changed.
       *
       * three uploads the whole buffer only while `updateRanges` is empty; name
       * even one range and that is all that reaches the GPU, and the renderer
       * clears the list afterwards so the full copy never gets a second chance.
       * Adding the marker's range on top of the scene swap therefore sent the
       * marker and nothing else — every scene after the first drew the previous
       * scene's shape with one correct dot moving over it. */
      if (!sceneChanged) {
        attrA.clearUpdateRanges()
        for (const r of moved.pos) attrA.addUpdateRange(r.from, r.span)
      }
      attrA.needsUpdate = true
    }

    // The closing logo runs a wave of brand colour through the mark.
    u.uWave.value = lerp(u.uWave.value, scene.id === 'close' ? 1 : 0, 1 - Math.pow(0.02, dt))

    u.uProgress.value = smoother(morph)
    // Whiteness of the transition: nothing while the shape is held, peaking as
    // the cloud crosses to the next one. This is the flash.
    u.uFlight.value = Math.sin(Math.PI * Math.min(1, Math.max(0, morph)))
    u.uTurbulence.value = scene.turbulence
    u.uDrift.value = 0.004 + 0.009 * (1 - Math.abs(morph * 2 - 1))

    /* Gather out of the scatter when the panel is being looked at, and come
       apart again when it is not — the opening shape used to assemble itself
       300px before anyone could see it, so the first scene was always already
       built by the time you arrived at it. */
    const gather = forming ? 1.6 : -1.9
    u.uDissolve.value = Math.min(1, Math.max(0, u.uDissolve.value - dt * gather))
    u.uOpacity.value = Math.min(1, Math.max(0, u.uOpacity.value + dt * (forming ? 0.9 : -1.5)))

    /* Colour and background, blended across the scene boundary. */
    const cs = scratch.sceneColors[index]
    const cn = scratch.sceneColors[Math.min(SCENES.length - 1, index + 1)]
    const blend = smoother(morph)

    scratch.colDeep.copy(cs.deep).lerp(cn.deep, blend)
    scratch.colCore.copy(cs.core).lerp(cn.core, blend)
    scratch.colHi.copy(cs.hi).lerp(cn.hi, blend)
    scratch.colHot.copy(cs.hot).lerp(cn.hot, blend)
    scratch.colAi.copy(cs.ai).lerp(cn.ai, blend)
    scratch.bgTop.copy(cs.bgTop).lerp(cn.bgTop, blend)
    scratch.bgBot.copy(cs.bgBot).lerp(cn.bgBot, blend)

    /* Scene 5: a repeating day → night cycle, carried by how lit the sky is. */
    if (scene.dayNight) {
      const cycles = 2.5
      // 0 = night, 1 = day.
      const day = 0.5 + 0.5 * Math.sin(local * Math.PI * 2 * cycles - Math.PI / 2)
      scratch.bgTop.lerp(scratch.dayTop, day * 0.8)
      scratch.bgBot.lerp(scratch.dayBot, day * 0.75)
      scratch.colDeep.lerp(scratch.dayCore, day * 0.5)
      scratch.colCore.lerp(scratch.dayCore, day * 0.65)
      scratch.colHi.lerp(scratch.dayHi, day * 0.6)
    }

    /* Every change lifts to the bright blue at the peak of the morph and
       settles back into the scene's darker state as the shape forms. Applied
       last so it reads the same on every transition, including scene five's. */
    const flight = u.uFlight.value
    if (flight > 0.001) {
      scratch.colDeep.lerp(scratch.flashCore, flight * 0.7)
      scratch.colCore.lerp(scratch.flashCore, flight * 0.85)
      scratch.colHi.lerp(scratch.flashHi, flight * 0.8)
      scratch.bgTop.lerp(scratch.flashTop, flight * 0.4)
      scratch.bgBot.lerp(scratch.flashBot, flight * 0.34)
    }

    u.uColorDeep.value.copy(scratch.colDeep)
    u.uColorCore.value.copy(scratch.colCore)
    u.uColorHi.value.copy(scratch.colHi)
    u.uColorHot.value.copy(scratch.colHot)
    u.uColorAi.value.copy(scratch.colAi)
    bgMaterial.uniforms.uTop.value.copy(scratch.bgTop)
    bgMaterial.uniforms.uBottom.value.copy(scratch.bgBot)

    /* ── Framing ──────────────────────────────────────────────────────────
     *
     * Solved every frame from the shape's own extent, the safe box for this
     * panel, and the live aspect — then damped, so it is a continuous move
     * across the scene rather than a jump at the boundary. Nothing here is a
     * tuned constant, which is why it now frames correctly at window shapes it
     * was never looked at in. */
    // Framing follows the *shape*, so it moves on the morph and not on the
    // scene's own progress. Keyed to `local` it began travelling toward the
    // next scene's camera the moment this one had formed — by the time the
    // copy was readable the picture had shrunk to a fraction of the size it
    // had been solved for, which is the whole reason these looked small.
    const e = smoother(morph)
    const wide = state.size.width >= 1024
    const view = {
      aspect: state.size.width / Math.max(1, state.size.height),
      fov: (camera as THREE.PerspectiveCamera).fov,
    }
    const pitch = caps.coarsePointer ? 0 : PARALLAX_PITCH
    const yaw = caps.coarsePointer ? 0 : PARALLAX_YAW
    const copy = copyRectRef.current

    const placeFor = (sc: (typeof SCENES)[number], i: number) => {
      const above = narrativeBox(state.size.width, state.size.height, copy.tops[i], sc.tallBand)
      const beside = narrativeSideBox(state.size.width, state.size.height, copy.rights[i])
      return bestFrame(
        sc.target,
        targets[sc.target]?.positions,
        [
          insetForPush(above, view.aspect),
          sc.aboveOnly || !beside ? null : insetForPush(beside, view.aspect),
        ],
        view,
        {
          xFraction: wide ? sc.x : 0.5,
          fill: sc.fill,
          yaw: yaw + swingOf(i),
          pitch,
        }
      )
    }

    const nextIndex = Math.min(SCENES.length - 1, index + 1)
    const fitA = placeFor(scene, index)
    const fitB = placeFor(next, nextIndex)

    const cz = lerp(fitA.distance, fitB.distance, e)
    // Damped after the first frame, snapped on it: there is nothing to ease
    // away from before anything has been drawn.
    const k = framedRef.current ? 1 - Math.pow(0.001, dt) : 1
    camera.position.set(
      lerp(camera.position.x, 0, k),
      lerp(camera.position.y, 0, k),
      lerp(camera.position.z, cz, k)
    )
    camera.lookAt(0, 0, 0)

    // The cursor's dent, sized from where the camera actually is, so it stays
    // the same size on screen whether the composition is filling the column or
    // sitting small above the copy.
    if (!caps.coarsePointer) {
      const halfH = Math.tan((view.fov * Math.PI) / 360) * camera.position.z
      u.uMouseRadius.value = halfH * 0.5
      u.uMouseStrength.value = pointer.inside.current ? pushStrength(halfH) : 0
    }

    /* Parallax. The cursor's repulsion point is resolved further down, after
       every transform that moves the cloud has been applied this frame. */
    if (!caps.coarsePointer && group.current) {
      const k = 1 - Math.pow(0.002, dt)
      group.current.rotation.y = lerp(group.current.rotation.y, state.pointer.x * 0.13, k)
      group.current.rotation.x = lerp(group.current.rotation.x, -state.pointer.y * 0.09, k)
    }

    /* The opening scene turns, but only through a shallow arc. A full spin
       shows the foot edge-on, where a silhouette is not a silhouette. */
    if (points.current) {
      points.current.rotation.y =
        Math.sin(u.uTime.value * 0.28) * swingOf(index) * (1 - morph * 0.7)
    }

    /* Placement, from the same solve as the distance above. */
    if (group.current) {
      const ox = lerp(fitA.x, fitB.x, e)
      const oy = lerp(fitA.y, fitB.y, e)
      const kp = framedRef.current ? 1 - Math.pow(0.01, dt) : 1
      group.current.position.x = lerp(group.current.position.x, ox, kp)
      group.current.position.y = lerp(group.current.position.y, oy, kp)
      framedRef.current = true
    }

    /* Cursor repulsion.
     *
     * The shader compares uMouse against each particle's *local* position, but
     * the pointer is a screen coordinate. Unproject it onto the z = 0 plane in
     * world space, then bring it back through the group offset, the parallax
     * rotation and the cloud's own swing — otherwise the dent in the cloud sits
     * wherever those transforms happen to have pushed it, which is exactly the
     * offset you see as the particles deforming beside the cursor rather than
     * under it. World matrices are refreshed first because R3F updates them
     * after this callback, not before.
     */
    if (!caps.coarsePointer && points.current) {
      scratch.v.set(state.pointer.x, state.pointer.y, 0.5).unproject(camera)
      scratch.dir.copy(scratch.v).sub(camera.position).normalize()
      const dist = -camera.position.z / (scratch.dir.z || -1)
      scratch.target.copy(camera.position).addScaledVector(scratch.dir, dist)

      points.current.updateWorldMatrix(true, false)
      points.current.worldToLocal(scratch.target)

      // Snapped on the first real move, so the dent appears where the pointer
      // is rather than sweeping in from the middle of the canvas.
      if (pointer.justEntered.current) {
        mouseWorld.current.copy(scratch.target)
        pointer.justEntered.current = false
      } else {
        mouseWorld.current.lerp(scratch.target, 1 - Math.pow(0.0015, dt))
      }
      u.uMouse.value.copy(mouseWorld.current)
    }

    /* Labels: project each anchor to the viewport. They belong to the settled
       shape, so they fade out as soon as it starts to come apart — a label
       floating over a cloud in flight points at nothing. */
    // Labels belong to the settled shape, so they wait for it to gather as
    // well as for the morph to finish. A label over a cloud that has not
    // formed yet is pointing at nothing.
    const settled = Math.min(1, Math.max(0, (1 - u.uDissolve.value - 0.35) / 0.4))
    const hold = (1 - smoother(Math.min(1, morph / 0.35))) * settled
    const out = labelsRef.current
    out.length = 0
    if (hold > 0.01 && group.current) {
      group.current.updateWorldMatrix(true, false)
      for (const anchor of anchorsRef.current) {
        scratch.v.copy(anchor.at)
        group.current.localToWorld(scratch.v)
        scratch.v.project(camera)
        // Behind the camera, or off-screen: skip rather than pin to an edge.
        if (scratch.v.z > 1) continue
        out.push({
          text: anchor.text,
          x: (scratch.v.x * 0.5 + 0.5) * state.size.width + anchor.dx,
          y: (-scratch.v.y * 0.5 + 0.5) * state.size.height + anchor.dy,
          opacity: hold,
        })
      }
    }
  })

  return (
    <>
      <mesh material={bgMaterial} renderOrder={-1} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <group ref={group}>
        <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
      </group>
    </>
  )
}
