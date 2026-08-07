import * as THREE from 'three'
import { PARTICLE_FRAG, PARTICLE_VERT } from './shaders'
import { SCENES } from './scenes'
import { solveFrame, STILL_BOX } from './framing'
import { makeRng, type BuiltTarget } from './sampleTargets'

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

/**
 * Renders one still composed frame per scene and returns them as data URLs.
 *
 * This is the `prefers-reduced-motion` path: the visitor still sees the real
 * particle compositions, but as fixed images in normal document flow — no
 * morphing, no pinning, no animation loop. One WebGL context is created, used
 * for six renders, and destroyed; nothing keeps running afterwards.
 */
export async function renderStills(
  targets: Record<string, BuiltTarget>,
  count: number,
  opts: { width?: number; height?: number } = {}
): Promise<string[] | null> {
  const width = opts.width ?? 1000
  const height = opts.height ?? 700

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      preserveDrawingBuffer: true, // required for toDataURL
    })
  } catch {
    return null
  }

  try {
    renderer.setSize(width, height, false)
    renderer.setPixelRatio(1)

    const rng = makeRng(5)
    const geo = new THREE.BufferGeometry()
    const random = new Float32Array(count)
    const size = new Float32Array(count)
    const delay = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      random[i] = rng()
      size[i] = 0.55 + Math.pow(rng(), 3) * 2.4
      delay[i] = 0
    }
    const zero = new Float32Array(count * 3)
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geo.setAttribute('positionA', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geo.setAttribute('positionB', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    geo.setAttribute('aScatter', new THREE.BufferAttribute(zero, 3))
    geo.setAttribute('aRandom', new THREE.BufferAttribute(random, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    geo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1))
    geo.setAttribute('aShadeA', new THREE.BufferAttribute(new Float32Array(count * 2), 2))
    geo.setAttribute('aShadeB', new THREE.BufferAttribute(new Float32Array(count * 2), 2))
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 24)

    const material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      defines: { SIMPLE_NOISE: '' },
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uSpread: { value: 0.55 },
        uTurbulence: { value: 0 },
        uNoiseScale: { value: 0.55 },
        uDrift: { value: 0.01 },
        uSize: { value: 16 },
        uPixelRatio: { value: 1 },
        uMouse: { value: new THREE.Vector3(0, 0, 999) },
        uMouseRadius: { value: 0 },
        uMouseStrength: { value: 0 },
        uDissolve: { value: 0 },
        uFlight: { value: 0 },
        uWave: { value: 0 },
        uColorDeep: { value: new THREE.Color() },
        uColorCore: { value: new THREE.Color() },
        uColorHi: { value: new THREE.Color() },
        uColorHot: { value: new THREE.Color() },
        uColorAi: { value: new THREE.Color() },
        uOpacity: { value: 0.92 },
        uAdditive: { value: 0 },
      },
    })

    const scene = new THREE.Scene()
    const points = new THREE.Points(geo, material)
    points.frustumCulled = false
    scene.add(points)

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    const attrA = geo.getAttribute('positionA') as THREE.BufferAttribute
    const attrB = geo.getAttribute('positionB') as THREE.BufferAttribute
    const shadeA = geo.getAttribute('aShadeA') as THREE.BufferAttribute
    const shadeB = geo.getAttribute('aShadeB') as THREE.BufferAttribute
    const shade = new Float32Array(count * 2)

    const urls: string[] = []
    for (const s of SCENES) {
      const t = targets[s.target]
      attrA.copyArray(t.positions)
      attrB.copyArray(t.positions)
      attrA.needsUpdate = true
      attrB.needsUpdate = true

      for (let i = 0; i < count; i++) {
        shade[i * 2] = t.tones[i] ?? 0.5
        shade[i * 2 + 1] = t.ai[i] ?? 0
      }
      shadeA.copyArray(shade)
      shadeB.copyArray(shade)
      shadeA.needsUpdate = true
      shadeB.needsUpdate = true

      material.blending = s.additive ? THREE.AdditiveBlending : THREE.NormalBlending
      material.needsUpdate = true
      material.uniforms.uAdditive.value = s.additive ? 1 : 0
      material.uniforms.uColorDeep.value.set(s.colors.deep ?? s.colors.core)
      material.uniforms.uColorCore.value.set(s.colors.core)
      material.uniforms.uColorHi.value.set(s.colors.hi)
      material.uniforms.uColorHot.value.set(s.colors.hot)
      material.uniforms.uColorAi.value.set(s.colors.ai ?? '#8b5cf6')

      // A still sits centred in its own column, with no navbar over it and no
      // copy beside it, so it is framed against the still box rather than the
      // narrative's. Same solver, so a scene reads at the same size either way.
      const fit = solveFrame(
        `still:${s.target}`,
        t.positions,
        STILL_BOX,
        { aspect: width / height, fov: camera.fov },
        { xFraction: 0.5, fill: s.fill }
      )
      points.position.set(fit.x, fit.y, 0)
      camera.position.set(0, 0, fit.distance)
      camera.lookAt(0, 0, 0)

      renderer.setClearColor(0x000000, 0)
      renderer.clear()
      renderer.render(scene, camera)
      urls.push(renderer.domElement.toDataURL('image/png'))
      // Let the main thread breathe between captures.
      await new Promise((r) => setTimeout(r, 0))
    }

    geo.dispose()
    material.dispose()
    return urls
  } catch {
    return null
  } finally {
    renderer.dispose()
    renderer.forceContextLoss()
  }
}
