import { useEffect, useState } from 'react'
import { SCENES } from '../three/scenes'
import { buildAllTargets } from '../three/targets'
import { renderStills } from '../three/renderStills'
import type { Capabilities } from '../three/capabilities'
import SceneArt from './visuals/SceneArt'
import { useT } from '../i18n/I18nProvider'

const ALT: Record<string, string> = {
  foot: 'A particle rendering of a foot, seen from the sole.',
  capture: 'A particle rendering of a phone above a foot, with four capture frames.',
  analysis: 'A particle rendering of an analysis mesh over a foot, with three findings marked.',
  clinician: 'A particle rendering of a clinician dashboard receiving a patient record.',
  timeline: 'A particle rendering of a timeline of screenings with a descending risk curve.',
  logo: 'A particle rendering of the SoleIQ logo.',
}

/**
 * The no-motion path.
 *
 * When the visitor prefers reduced motion we still render the real scenes — but
 * once each, as still frames, in normal document flow. Nothing is pinned,
 * nothing morphs, and no animation loop survives the capture. When there is no
 * WebGL at all, the same sections fall back to flat SVG art, so the story is
 * fully readable either way.
 */
export default function NarrativeStatic({ caps }: { caps: Capabilities }) {
  const d = useT()
  const [stills, setStills] = useState<string[] | null>(null)

  useEffect(() => {
    if (!caps.webgl) return
    let alive = true
    // A lighter cloud: these are single frames, not a live system.
    const count = Math.min(caps.particleCount || 30_000, 30_000)
    buildAllTargets(
      SCENES.map((s) => s.target),
      count
    )
      .then((targets) => renderStills(targets, count, { width: 1000, height: 700 }))
      .then((urls) => alive && urls && setStills(urls))
      .catch(() => {
        /* Falls through to the SVG art below. */
      })
    return () => {
      alive = false
    }
  }, [caps])

  return (
    <section id="narrative" aria-label="How SoleIQ works">
      {SCENES.map((scene, i) => {
        const dark = isDark(scene.bg[1])
        return (
          <div
            key={scene.id}
            className="py-20 md:py-28"
            style={{
              background: `linear-gradient(180deg, ${scene.bg[0]}, ${scene.bg[1]})`,
              color: dark ? '#ffffff' : 'var(--clr-text)',
            }}
          >
            <div className="shell grid items-center gap-12 md:grid-cols-2 md:gap-16">
              <div className="max-w-xl">
                {'kicker' in d.narrative[scene.id] && (
                  <p
                    className="eyebrow"
                    style={{ color: dark ? 'rgba(255,255,255,0.65)' : undefined }}
                  >
                    {(d.narrative[scene.id] as { kicker: string }).kicker}
                  </p>
                )}
                <h2
                  className="mt-4 text-[clamp(1.6rem,3.4vw,2.4rem)] font-medium tracking-tightest"
                  style={{ color: 'inherit' }}
                >
                  {d.narrative[scene.id].headline}
                </h2>
                <p
                  className="mt-5 text-[1.0625rem] leading-relaxed"
                  style={{ color: dark ? 'rgba(255,255,255,0.78)' : 'var(--clr-text-muted)' }}
                >
                  {d.narrative[scene.id].body}
                </p>
                {'note' in d.narrative[scene.id] && (
                  <p
                    className="mt-3 text-xs"
                    style={{ color: dark ? 'rgba(255,255,255,0.5)' : 'var(--clr-muted)' }}
                  >
                    {(d.narrative[scene.id] as { note: string }).note}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center">
                {stills?.[i] ? (
                  <img
                    src={stills[i]}
                    alt={ALT[scene.id] ?? ''}
                    loading="lazy"
                    decoding="async"
                    className="h-auto w-full max-w-[520px]"
                  />
                ) : (
                  <SceneArt scene={scene.id} dark={dark} />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </section>
  )
}

function isDark(hex: string): boolean {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45
}
