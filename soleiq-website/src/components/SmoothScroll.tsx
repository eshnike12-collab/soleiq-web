import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenisInstance: Lenis | null = null

/** Lets anchor links keep working while Lenis owns the scroll position. */
export function scrollToAnchor(hash: string) {
  const el = document.querySelector(hash)
  if (!el) return false
  if (lenisInstance) {
    lenisInstance.scrollTo(el as HTMLElement, { offset: -88 })
  } else {
    el.scrollIntoView({ behavior: 'auto', block: 'start' })
  }
  return true
}

/**
 * Smooth scroll, wired to GSAP's ticker so ScrollTrigger reads the same clock.
 *
 * Deliberately not mounted when the visitor prefers reduced motion: the native
 * scroll is exactly what they asked for.
 */
export default function SmoothScroll({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // Touch devices keep their native scroll — hijacking it there costs more
      // than it gives, and it is the easiest way to trap someone.
      syncTouch: false,
    })
    lenisInstance = lenis
    document.documentElement.classList.add('lenis')

    lenis.on('scroll', ScrollTrigger.update)

    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    const onAnchorClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement)?.closest?.('a[href^="#"]') as
        | HTMLAnchorElement
        | null
      if (!link) return
      const hash = link.getAttribute('href')
      if (!hash || hash === '#') return
      if (scrollToAnchor(hash)) {
        e.preventDefault()
        history.replaceState(null, '', hash)
      }
    }
    document.addEventListener('click', onAnchorClick)

    return () => {
      document.removeEventListener('click', onAnchorClick)
      gsap.ticker.remove(raf)
      lenis.destroy()
      lenisInstance = null
      document.documentElement.classList.remove('lenis')
    }
  }, [enabled])

  return null
}
