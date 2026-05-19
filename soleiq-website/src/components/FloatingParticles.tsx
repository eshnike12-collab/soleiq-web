import { useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'

interface Particle {
  x: number
  y: number
  radius: number
  speedY: number
  drift: number
  driftOffset: number
  opacity: number
  opacityDir: number
  color: string
}

export default function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { isDark } = useTheme()
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const colors = ['rgba(78,205,196,', 'rgba(59,130,246,', 'rgba(168,237,234,']

    const createParticle = (yOverride?: number): Particle => ({
      x: Math.random() * window.innerWidth,
      y: yOverride !== undefined ? yOverride : Math.random() * window.innerHeight,
      radius: 2 + Math.random() * 2,
      speedY: 0.3 + Math.random() * 0.5,
      drift: 0.3 + Math.random() * 0.5,
      driftOffset: Math.random() * Math.PI * 2,
      opacity: 0.1 + Math.random() * 0.4,
      opacityDir: Math.random() > 0.5 ? 1 : -1,
      color: colors[Math.floor(Math.random() * colors.length)],
    })

    particlesRef.current = Array.from({ length: 50 }, () => createParticle())

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const baseOpacity = isDark ? 1 : 0.35

      particlesRef.current.forEach(p => {
        p.y -= p.speedY
        p.driftOffset += 0.01
        const xDrift = Math.sin(p.driftOffset) * p.drift
        p.x += xDrift * 0.4

        p.opacity += p.opacityDir * 0.003
        if (p.opacity > 0.5) p.opacityDir = -1
        if (p.opacity < 0.05) p.opacityDir = 1

        if (p.y < -10) {
          Object.assign(p, createParticle(window.innerHeight + 10))
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `${p.color}${(p.opacity * baseOpacity).toFixed(3)})`
        ctx.fill()
      })

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [isDark])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
