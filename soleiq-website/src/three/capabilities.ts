/**
 * What this device can actually do.
 *
 * Everything downstream reads from one `detectCapabilities()` call so the
 * particle count, DPR cap, noise cost, and pin distance are decided in exactly
 * one place — and so the no-WebGL path is a real branch rather than a hope.
 */

export type Tier = 'high' | 'medium' | 'low' | 'none'

export interface Capabilities {
  tier: Tier
  webgl: boolean
  particleCount: number
  /** Upper bound on devicePixelRatio — retina at 3x costs 2.25x the fill. */
  dprCap: number
  /** Multiplier on the scroll length of each pinned scene. */
  pinScale: number
  /** Cheaper curl noise (fewer octaves / larger step) on weak GPUs. */
  simpleNoise: boolean
  reducedMotion: boolean
  coarsePointer: boolean
  renderer: string
}

const SOFTWARE_RENDERERS = /swiftshader|llvmpipe|software|microsoft basic render/i

function probeWebGL(): { ok: boolean; renderer: string } {
  if (typeof document === 'undefined') return { ok: false, renderer: 'ssr' }
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ||
      canvas.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return { ok: false, renderer: 'none' }

    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER))

    // Release the probe context immediately; browsers cap concurrent contexts.
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return { ok: true, renderer }
  } catch {
    return { ok: false, renderer: 'error' }
  }
}

let cached: Capabilities | null = null

/** Cached — the WebGL probe creates and discards a context, so run it once. */
export function detectCapabilities(): Capabilities {
  if (cached) return cached
  cached = probeCapabilities()
  return cached
}

function probeCapabilities(): Capabilities {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const coarsePointer =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

  const { ok: webgl, renderer } = probeWebGL()

  if (!webgl) {
    return {
      tier: 'none',
      webgl: false,
      particleCount: 0,
      dprCap: 1,
      pinScale: 1,
      simpleNoise: true,
      reducedMotion,
      coarsePointer,
      renderer,
    }
  }

  const cores = navigator.hardwareConcurrency ?? 4
  const narrow = typeof window !== 'undefined' && window.innerWidth < 900
  const software = SOFTWARE_RENDERERS.test(renderer)

  let tier: Tier = 'high'
  if (software || cores <= 2) tier = 'low'
  else if (narrow || coarsePointer || cores <= 4) tier = 'medium'

  const byTier: Record<Exclude<Tier, 'none'>, Omit<Capabilities, 'tier' | 'webgl' | 'reducedMotion' | 'coarsePointer' | 'renderer'>> = {
    high: { particleCount: 120_000, dprCap: 2, pinScale: 1, simpleNoise: false },
    medium: { particleCount: 40_000, dprCap: 2, pinScale: 0.7, simpleNoise: true },
    low: { particleCount: 18_000, dprCap: 1, pinScale: 0.55, simpleNoise: true },
  }

  return {
    tier,
    webgl: true,
    reducedMotion,
    coarsePointer,
    renderer,
    ...byTier[tier],
  }
}
