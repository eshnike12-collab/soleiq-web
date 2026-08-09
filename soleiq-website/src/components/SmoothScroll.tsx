import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * A phone's toolbar collapsing as you scroll fires a resize, and ScrollTrigger
 * answers a resize by refreshing — which restores the scroll position it had
 * recorded before the bar moved. Scrolling down therefore kept snapping the
 * page back up, and kept on doing it because the bar re-appears the moment it
 * does. GSAP ships this flag for exactly that: ignore height-only resizes on
 * touch devices, keep honouring real ones like an orientation change.
 */
ScrollTrigger.config({ ignoreMobileResize: true })

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

    /* Not mounted at all on a touch device.
     *
     * `syncTouch: false` was meant to leave the native scroll alone there, but
     * it only stops Lenis driving the scroll *during* a touch — the instance
     * still runs, and a flick hands over to the browser's own momentum while
     * Lenis is still holding the position from where your finger left. When the
     * touch ends it animates to that stale target, which on a real phone is the
     * page hauling itself back up the moment you let go. There is nothing to
     * sync on a surface that already scrolls smoothly. */
    if (window.matchMedia('(pointer: coarse)').matches) return

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
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
