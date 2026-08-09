import { motion, useReducedMotion } from 'framer-motion'
import stage0 from '../../assets/wagner/stage-0.webp'
import stage1 from '../../assets/wagner/stage-1.webp'
import stage2 from '../../assets/wagner/stage-2.webp'
import stage3 from '../../assets/wagner/stage-3.webp'
import stage4 from '../../assets/wagner/stage-4.webp'
import stage5 from '../../assets/wagner/stage-5.webp'

/**
 * One foot from SoleIQ's own Wagner chart.
 *
 * These are cropped straight out of `wagner_scale_soleiq_intervention_window`
 * — the same illustration the rest of this section's copy is written against —
 * so the grades on the page and the grades in the deck are literally the same
 * six drawings. Each crop is trimmed to its own content and made transparent
 * by flooding the white in from the border, so a foot sits on the mint of a
 * selected card as cleanly as on the white of an unselected one.
 *
 * They are drawings, not photographs. That distinction still matters: the only
 * real image this product ever shows is the patient's own.
 */

const STAGE_SRC = [stage0, stage1, stage2, stage3, stage4, stage5]

export interface StageFootProps {
  /** Wagner grade, 0–5. */
  stage: number
  /** Sweeps a scan line over the foot — used for the grades SoleIQ can see. */
  scanning?: boolean
  className?: string
}

export default function StageFoot({ stage, scanning = false, className }: StageFootProps) {
  const reduce = useReducedMotion()
  const src = STAGE_SRC[stage] ?? STAGE_SRC[0]

  return (
    <span className={`relative inline-block ${className ?? ''}`}>
      <img src={src} alt="" aria-hidden="true" className="h-full w-auto select-none" />

      {/* The scan line — only on the grades a photograph can actually see.
          The mask lives on the full-size wrapper, not on the moving bar: sized
          against the bar it would squash the foot into an eighteen-percent-tall
          silhouette instead of clipping to the one behind it. */}
      {scanning && !reduce && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 block overflow-hidden"
          style={{
            WebkitMaskImage: `url(${src})`,
            maskImage: `url(${src})`,
            WebkitMaskSize: 'auto 100%',
            maskSize: 'auto 100%',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
          }}
        >
          <motion.span
            className="absolute inset-x-0 block"
            style={{
              height: '18%',
              background:
                'linear-gradient(180deg, rgba(30,122,112,0) 0%, rgba(30,122,112,0.45) 50%, rgba(30,122,112,0) 100%)',
            }}
            initial={{ top: '-18%' }}
            animate={{ top: '100%' }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
          />
        </span>
      )}
    </span>
  )
}
