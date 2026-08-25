import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import ParticleField, { type LabelScreenPos } from '../three/ParticleField'
import ParticleLoader from './ParticleLoader'
import NarrativeStatic from './NarrativeStatic'
import { detectCapabilities, type Capabilities } from '../three/capabilities'
import { buildAllTargets } from '../three/targets'
import { copyOpacity, SCENE_BOUNDS, SCENES } from '../three/scenes'
import { INITIAL_CAMERA } from '../three/framing'
import { usePointerInside } from '../hooks/usePointerInside'
import type { BuiltTarget } from '../three/sampleTargets'
import { useI18n, useT } from '../i18n/I18nProvider'

gsap.registerPlugin(ScrollTrigger)

/** Scroll length per unit of scene length. Higher means the sequence advances
    more slowly for the same amount of scrolling. */
const VH_PER_UNIT = 155

export default function ParticleNarrative() {
  const d = useT()
  const { dir } = useI18n()
  const rtl = dir === 'rtl'
  const caps = useMemo<Capabilities>(detectCapabilities, [])
  const [targets, setTargets] = useState<Record<string, BuiltTarget> | null>(null)
  const [built, setBuilt] = useState(0)
  const [active, setActive] = useState(true)
  /** Whether the panel is being looked at, rather than merely rendered. */
  const [formed, setFormed] = useState(false)

  const sectionRef = useRef<HTMLElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0)
  const copyRefs = useRef<(HTMLDivElement | null)[]>([])
  const railRefs = useRef<(HTMLSpanElement | null)[]>([])
  const railLabelRefs = useRef<(HTMLSpanElement | null)[]>([])
  const countRef = useRef<HTMLParagraphElement>(null)
  /**
   * Where each scene's copy sits inside the panel, in pixels: the top of its
   * own block, and how far right that block reaches. The framing uses this to
   * keep the art clear of the words — above them or beside them.
   *
   * Both are per scene, and the right edge learned that the hard way: taken as
   * one figure across all six, the closing line — which is deliberately full
   * width — pushed it past the whole panel, and every other scene lost the
   * column beside its copy as a result.
   */
  /* `edges` is the side of each scene's copy that faces the art — its right
     edge reading left to right, its left edge reading right to left. */
  const copyRectRef = useRef<{ tops: number[]; edges: number[] }>({ tops: [], edges: [] })
  // Written by the canvas each frame, applied to the DOM by the ticker below.
  const labelsRef = useRef<LabelScreenPos[]>([])
  const labelElsRef = useRef<(HTMLDivElement | null)[]>([])
  const [dpr, setDpr] = useState(() => Math.min(caps.dprCap, window.devicePixelRatio || 1))

  const pointer = usePointerInside(stickyRef)

  const useCanvas = caps.webgl && !caps.reducedMotion

  /* ── Sample every target before anything is shown ──────────────────────── */
  useEffect(() => {
    if (!caps.webgl) return
    let alive = true
    buildAllTargets(
      SCENES.map((s) => s.target),
      caps.particleCount,
      (done) => alive && setBuilt(done)
    )
      .then((t) => alive && setTargets(t))
      .catch((err) => {
        console.warn('[soleiq] particle targets failed to build:', err)
        if (alive) setTargets({})
      })
    return () => {
      alive = false
    }
  }, [caps])

  /* ── Scroll → progress. CSS sticky does the pinning; ScrollTrigger only
        reports where we are, so the scrollbar keeps its true length and the
        pin can never trap the page. ─────────────────────────────────────── */
  useEffect(() => {
    if (!useCanvas || !targets || !sectionRef.current) return
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progressRef.current = self.progress
      },
    })
    ScrollTrigger.refresh()
    return () => st.kill()
  }, [useCanvas, targets])

  /* ── Copy fades, driven off the same ticker as the scroll ──────────────── */
  useEffect(() => {
    if (!useCanvas || !targets) return
    const lastOpacity: number[] = SCENES.map(() => -1)
    const lastThrough: string[] = SCENES.map(() => '')

    const tick = () => {
      const p = progressRef.current
      SCENES.forEach((_, i) => {
        // The copy fade and the rail are two separate things that happen to be
        // driven by the same ticker. They get their own guards: sharing one
        // meant the rail stopped being written the moment a scene's copy had
        // finished fading, freezing every completed step short of full.
        const o = Math.round(copyOpacity(i, p) * 20) / 20
        if (o !== lastOpacity[i]) {
          lastOpacity[i] = o
          const el = copyRefs.current[i]
          if (el) {
            el.style.opacity = String(o)
            el.style.transform = `translate3d(0, ${(1 - o) * 14}px, 0)`
            el.style.visibility = o < 0.02 ? 'hidden' : 'visible'
          }
        }

        const { start, end } = SCENE_BOUNDS[i]
        const through = Math.min(1, Math.max(0, (p - start) / Math.max(1e-6, end - start)))
        const scale = through.toFixed(3)
        if (scale !== lastThrough[i]) {
          lastThrough[i] = scale
          const rail = railRefs.current[i]
          if (rail) rail.style.transform = `scaleX(${scale})`
          const railLabel = railLabelRefs.current[i]
          if (railLabel) {
            const active = through > 0 && through < 1
            railLabel.dataset.state = active ? 'active' : through >= 1 ? 'done' : 'ahead'
          }
        }
      })

      // Scene labels. A fixed pool of elements is reused, so nothing mounts or
      // unmounts sixty times a second.
      const labels = labelsRef.current
      labelElsRef.current.forEach((el, i) => {
        if (!el) return
        const label = labels[i]
        if (!label) {
          if (el.style.opacity !== '0') el.style.opacity = '0'
          return
        }
        if (el.dataset.text !== label.text) {
          el.dataset.text = label.text
          el.textContent = label.text
        }
        el.style.transform = `translate3d(${Math.round(label.x)}px, ${Math.round(label.y)}px, 0) translate(-50%, -50%)`
        el.style.opacity = String(Math.round(label.opacity * 100) / 100)
      })

      const step = Math.min(SCENES.length, Math.max(1, Math.floor(p * SCENES.length) + 1))
      const text = `${String(step).padStart(2, '0')} / ${String(SCENES.length).padStart(2, '0')}`
      if (countRef.current && countRef.current.textContent !== text) {
        countRef.current.textContent = text
      }
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [useCanvas, targets])

  /* ── Where the copy begins, so the art can be kept above it ────────────── */
  useEffect(() => {
    if (!useCanvas) return
    const measure = () => {
      const panel = stickyRef.current
      if (!panel) return
      const panelRect = panel.getBoundingClientRect()
      const tops: number[] = []
      const edges: number[] = []
      copyRefs.current.forEach((el, i) => {
        // The text block, not the full-width wrapper it is positioned by.
        const block = el?.firstElementChild as HTMLElement | null
        if (!block) return
        // `visibility: hidden` still takes part in layout, so every scene's
        // copy can be measured without any of it being shown.
        const r = block.getBoundingClientRect()
        tops[i] = r.top - panelRect.top
        edges[i] = rtl ? r.left - panelRect.left : r.right - panelRect.left
      })
      copyRectRef.current = { tops, edges }
    }
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    // Web fonts land after first paint and change how the headlines wrap.
    document.fonts?.ready.then(measure).catch(() => {})
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [useCanvas, targets, rtl])

  /* ── Stop rendering when off-screen or backgrounded ────────────────────── */
  useEffect(() => {
    if (!useCanvas) return
    const el = stickyRef.current
    if (!el) return

    let visible = true
    let onScreen = true
    const sync = () => setActive(visible && onScreen)

    // Two jobs, two observers — they need different geometry and conflating
    // them is how the render loop ends up paused when it shouldn't be.
    //
    // 1. Rendering: start a little before the panel arrives, so it is never
    //    blank on the frame it becomes visible.
    const renderIo = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting
        sync()
      },
      { rootMargin: '300px' }
    )
    renderIo.observe(el)

    // 2. Nav tone: only invert once the dark panel actually fills most of the
    //    screen, so the bar never goes dark while the white hero is showing.
    //
    //    Measured from the panel's own rect rather than from an
    //    IntersectionObserver. An observer only reports when a threshold is
    //    crossed, and a reload part-way down the page takes its first reading
    //    before the browser restores the scroll — after which the panel is
    //    already filling the viewport and no threshold is ever crossed again.
    //    That left a white bar sitting on top of the dark sequence.
    let disposed = false
    let queued = false
    const syncTone = () => {
      queued = false
      if (disposed) return
      const r = el.getBoundingClientRect()
      const shown = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0))
      const ratio = r.height > 0 ? shown / r.height : 0
      document.documentElement.dataset.tone = ratio > 0.6 ? 'dark' : 'light'
    }
    const queueTone = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(syncTone)
    }
    syncTone()
    window.addEventListener('scroll', queueTone, { passive: true })
    window.addEventListener('resize', queueTone)

    // 3. Forming: the opening shape is assembled when the panel is actually
    //    being looked at, and comes apart again when it is not. Rendering
    //    starts earlier than this on purpose — the cloud needs frames to
    //    gather and to scatter, and neither reads as anything if it happens
    //    off screen.
    const formIo = new IntersectionObserver(([entry]) => setFormed(entry.isIntersecting), {
      threshold: 0.5,
    })
    formIo.observe(el)

    const onVisibility = () => {
      visible = document.visibilityState === 'visible'
      sync()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      disposed = true
      renderIo.disconnect()
      formIo.disconnect()
      window.removeEventListener('scroll', queueTone)
      window.removeEventListener('resize', queueTone)
      document.removeEventListener('visibilitychange', onVisibility)
      document.documentElement.dataset.tone = 'light'
    }
  }, [useCanvas])

  /* ── Static path: no WebGL, or the visitor asked for less motion ───────── */
  if (!useCanvas) {
    return <NarrativeStatic caps={caps} />
  }

  const totalUnits = SCENES.reduce((s, sc) => s + sc.length, 0)
  const height = `${totalUnits * VH_PER_UNIT * caps.pinScale}vh`

  // Sampling is the only thing worth waiting for. The canvas sits below the
  // hero and starts rendering 300px before it scrolls into view, so there is no
  // blank-canvas moment to cover — and gating on a first-frame callback gives
  // the loader a way to strand the page, which is a far worse failure than a
  // frame of empty sky.
  const loading = !targets

  return (
    <>
      {loading && (
        <ParticleLoader progress={Math.min(0.98, built / SCENES.length)} />
      )}

      <section
        id="narrative"
        ref={sectionRef}
        aria-label="How SoleIQ works, as a scroll sequence"
        // Surfaced so the tier the device actually got is visible in QA rather
        // than having to be inferred from how it looks.
        data-tier={caps.tier}
        data-particles={caps.particleCount}
        className="relative"
        style={{ height }}
      >
        <div
          ref={stickyRef}
          className="sticky top-0 h-[100svh] w-full overflow-hidden"
          style={{ background: `linear-gradient(180deg, ${SCENES[0].bg[0]}, ${SCENES[0].bg[1]})` }}
          data-cursor="canvas"
        >
          {targets && (
            <Canvas
              className="absolute inset-0"
              frameloop={active ? 'always' : 'never'}
              dpr={dpr}
              // `legacy` and `flat` together are what make the palette in
              // scenes.ts mean what it says. R3F otherwise converts every hex
              // into linear space and tone-maps the result with ACES; these are
              // raw ShaderMaterials writing gl_FragColor directly, so nothing
              // converts back. Linear conversion crushes green far harder than
              // blue, which turned every purple into blue and then additive
              // blending saturated it to a flat #0217fa.
              legacy
              flat
              gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
              camera={{ fov: 45, position: INITIAL_CAMERA, near: 0.1, far: 100 }}
            >
              {/* Drops resolution under sustained load, and never raises it
                  again. Climbing back reallocates the drawing buffer, which on
                  a borderline machine causes the very stutter it is reacting
                  to — so this is deliberately one-way. */}
              <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(1, d - 0.5))} />
              <ParticleField
                sceneCopy={d.narrative as unknown as Record<string, Record<string, string>>}
                targets={targets}
                count={caps.particleCount}
                caps={caps}
                progressRef={progressRef}
                labelsRef={labelsRef}
                copyRectRef={copyRectRef}
                rtl={rtl}
                forming={formed}
                rendering={active}
                pointer={pointer}
              />
            </Canvas>
          )}

          {/* Scene labels — positioned from the canvas each frame. */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                ref={(el) => (labelElsRef.current[i] = el)}
                className="scene-label"
                style={{ opacity: 0 }}
              />
            ))}
          </div>

          {/* Scene rail.
              Not decoration: it says which step you are on, what it is called,
              and how far through the sequence you have come. */}
          <nav
            className="scene-rail pointer-events-none absolute start-6 top-1/2 hidden -translate-y-1/2 md:block"
            aria-label="Sequence progress"
          >
            <ol className="flex flex-col gap-4">
              {SCENES.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3">
                  <span className="scene-rail-num tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="scene-rail-track">
                    <span
                      ref={(el) => (railRefs.current[i] = el)}
                      className="scene-rail-fill"
                      style={{ transform: 'scaleX(0)' }}
                    />
                  </span>
                  <span
                    ref={(el) => (railLabelRefs.current[i] = el)}
                    className="scene-rail-label"
                  >
                    {(d.narrative[s.id] as { kicker?: string }).kicker ?? 'SoleIQ'}
                  </span>
                </li>
              ))}
            </ol>
            <p className="scene-rail-count tabular-nums" ref={countRef}>
              01 / {String(SCENES.length).padStart(2, '0')}
            </p>
          </nav>

          {/* Scene copy. All six stay in the DOM, so the whole story is
              available to a screen reader in order. */}
          <div className="pointer-events-none absolute inset-0">
            {/* Colours come from `html[data-tone]`, which the field updates from
                the live background — so the copy stays legible right through
                scene five's day/night cycle, not just at its declared colour. */}
            {SCENES.map((scene, i) => (
              <div
                key={scene.id}
                ref={(el) => (copyRefs.current[i] = el)}
                className="scene-copy shell absolute inset-x-0 bottom-[8vh] md:bottom-[12vh]"
                style={{ opacity: 0, visibility: 'hidden', willChange: 'opacity, transform' }}
              >
                <div className={scene.wideCopy ? 'max-w-none' : 'max-w-xl'}>
                  {'kicker' in d.narrative[scene.id] && (
                    <p className="scene-kicker eyebrow">
                      {(d.narrative[scene.id] as { kicker: string }).kicker}
                    </p>
                  )}
                  {scene.id !== 'close' && (
                    <h2 className="mt-4 text-[clamp(1.6rem,3.4vw,2.6rem)] font-medium tracking-tightest">
                      {d.narrative[scene.id].headline}
                    </h2>
                  )}
                  <p
                    className={
                      scene.wideCopy
                        ? // One line from `md` up, where there is room for it.
                          // Below that no size would fit, so it wraps as normal.
                          'scene-body mt-5 text-[0.9375rem] leading-relaxed md:whitespace-nowrap md:text-[0.9375rem]'
                        : 'scene-body mt-5 text-[1rem] leading-relaxed md:text-[1.0625rem]'
                    }
                  >
                    {d.narrative[scene.id].body}
                  </p>
                  {'note' in d.narrative[scene.id] && (
                    <p className="scene-note mt-3 text-xs">
                      {(d.narrative[scene.id] as { note: string }).note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carries the dark sequence back out into the white page, the mirror
            of the fade the hero uses on the way in. Kept short: at 38vh it
            reached far enough up the panel to wash out the closing line. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[20vh]"
          style={{
            background: `linear-gradient(180deg, ${SCENES[SCENES.length - 1].bg[1]}00 0%, var(--clr-bg) 100%)`,
          }}
        />
      </section>
    </>
  )
}

/** Rough perceptual check so copy contrast follows the background. */

