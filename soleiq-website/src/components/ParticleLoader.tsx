import { useEffect, useRef } from 'react'
import { useT } from '../i18n/I18nProvider'

/**
 * The loader is a small particle cluster forming — the same idea as the thing
 * it is loading, at 1/1000th the scale. Deliberately not a spinner.
 *
 * 2D canvas, ~180 points, no WebGL: it has to work before we know whether
 * WebGL does.
 */
export default function ParticleLoader({ progress }: { progress: number }) {
  const d = useT()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progressRef = useRef(progress)
  progressRef.current = progress

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const size = 120
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const N = 180
    const pts = Array.from({ length: N }, (_, i) => {
      const a = (i / N) * Math.PI * 2
      const r = 34 + (i % 7) * 1.1
      return {
        // where it starts: scattered
        sx: size / 2 + (Math.random() - 0.5) * 110,
        sy: size / 2 + (Math.random() - 0.5) * 110,
        // where it ends: a ring
        tx: size / 2 + Math.cos(a) * r,
        ty: size / 2 + Math.sin(a) * r,
        delay: Math.random() * 0.45,
        size: 0.7 + Math.random() * 1.1,
      }
    })

    let raf = 0
    let t0 = 0
    const draw = (time: number) => {
      if (!t0) t0 = time
      const elapsed = (time - t0) / 1000
      ctx.clearRect(0, 0, size, size)

      // Form on load progress, with a slow idle rotation so it never looks stuck.
      const p = progressRef.current
      const spin = elapsed * 0.35

      for (const pt of pts) {
        const k = Math.max(0, Math.min(1, (p - pt.delay) / 0.55))
        const e = k * k * (3 - 2 * k)
        const cx = size / 2
        const cy = size / 2
        const tx = cx + (pt.tx - cx) * Math.cos(spin) - (pt.ty - cy) * Math.sin(spin)
        const ty = cy + (pt.tx - cx) * Math.sin(spin) + (pt.ty - cy) * Math.cos(spin)
        const x = pt.sx + (tx - pt.sx) * e
        const y = pt.sy + (ty - pt.sy) * e
        ctx.globalAlpha = 0.25 + 0.6 * e
        ctx.fillStyle = e > 0.8 ? '#1e7a70' : '#0b2a3c'
        ctx.beginPath()
        ctx.arc(x, y, pt.size, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-clr-bg"
      role="status"
      aria-live="polite"
    >
      <canvas
        ref={canvasRef}
        style={{ width: 120, height: 120 }}
        aria-hidden="true"
      />
      <p className="mt-6 text-xs uppercase tracking-[0.16em] text-clr-muted">
        {d.narrative.loading}
      </p>
      <span className="sr-only">{d.narrative.loadingLong}</span>
    </div>
  )
}
