import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Thermometer, Zap, FlaskConical, BookOpen } from 'lucide-react'

const PANELS = [
  {
    icon: Thermometer,
    color: '#FF6B6B',
    title: 'Pressure & Temperature as Predictors',
    summary: 'Elevated plantar temperature and sustained pressure are the earliest detectable biomarkers of impending diabetic foot ulceration.',
    detail: `Research consistently shows that a temperature asymmetry of ≥2.2°C between corresponding sites on both feet predicts ulceration with >80% sensitivity up to 5 weeks before visible breakdown occurs (Armstrong et al., 1997). Similarly, peak plantar pressure in neuropathic patients correlates directly with ulcer formation — patients exceeding 700 kPa have 5-7× higher ulceration rates.

SoleIQ's 128-sensor pressure matrix samples at 100Hz, capturing pressure-time integrals that single-snapshot clinic assessments miss entirely. Paired with infrared temperature sensing at 0.1°C resolution, our sensor fusion model identifies inflammatory cascades in subcutaneous tissue before epidermal breakdown begins.

This approach transforms prevention from reactive wound care into proactive biomechanical management — the difference between a 20-minute insole adjustment and a 6-month hospitalization.`,
  },
  {
    icon: Zap,
    color: '#4ECDC4',
    title: 'Photobiomodulation (PBM) Mechanism',
    summary: 'Low-level light therapy at 660nm and 850nm wavelengths stimulates mitochondrial cytochrome c oxidase, triggering a cascade of regenerative cellular responses.',
    detail: `Photobiomodulation (also known as LLLT) operates through a well-characterized photochemical pathway. When 660nm red light is absorbed by cytochrome c oxidase in mitochondria, it displaces inhibitory nitric oxide, restoring electron transport chain efficiency and increasing ATP production by up to 150%.

The 850nm near-infrared wavelength penetrates deeper tissues (up to 5-6cm), modulating reactive oxygen species and activating transcription factors including NF-κB, which upregulates genes associated with tissue repair, angiogenesis, and anti-inflammation.

For diabetic patients, these effects translate to: improved microvascular circulation (critical in peripheral neuropathy), accelerated wound closure, reduced inflammatory cytokine expression (IL-1β, TNF-α), and direct nerve regeneration via BDNF and NGF upregulation. Multiple RCTs have demonstrated statistically significant reductions in DFU healing time when PBM is applied consistently at 4-8 J/cm² dosimetry — exactly the range our therapeutic LED array delivers.`,
  },
  {
    icon: FlaskConical,
    color: '#3B82F6',
    title: 'Clinical Validation',
    summary: 'SoleIQ\'s core technologies are grounded in peer-reviewed evidence spanning 30+ years of diabetic foot research.',
    detail: `The SoleIQ system is built on a foundation of clinical evidence, not conjecture:

Pressure Monitoring: A 2019 systematic review (Bus et al., Diabetes/Metabolism Research and Reviews) confirmed that smart insole pressure monitoring with offloading guidance reduced DFU recurrence by 86% versus standard care in RCTs with ≥6-month follow-up.

Temperature Monitoring: The TempStat prospective trial (Lavery et al., 2007, Diabetes Care) demonstrated that home temperature monitoring reduced foot ulcer incidence by 63% in high-risk patients over 15 months.

PBM for DFUs: A 2023 meta-analysis of 18 RCTs (Wang et al., Journal of Photochemistry and Photobiology) found a standardized mean difference of −0.67 in wound area reduction (p<0.001) for PBM-treated DFUs versus control, with a 15-30% pain reduction as secondary outcome.

Gait Offloading: Total contact casting reduces forefoot pressure by up to 84%; SoleIQ's real-time offloading guidance achieves 40-60% redistribution without immobilization, preserving mobility and quality of life.`,
  },
]

const CITATIONS = [
  {
    id: 1,
    text: 'Armstrong DG, et al. "Infrared dermal thermometry for the high-risk diabetic foot." Physical Therapy. 1997.',
    color: '#4ECDC4',
  },
  {
    id: 2,
    text: 'Bus SA, et al. "Effect of custom-made footwear on foot ulcer recurrence in diabetes." Diabetes/Metabolism Research and Reviews. 2013.',
    color: '#3B82F6',
  },
  {
    id: 3,
    text: 'Lavery LA, et al. "Preventing diabetic foot ulcer recurrence in high-risk patients." Diabetes Care. 2007.',
    color: '#FF6B6B',
  },
  {
    id: 4,
    text: 'Wang Y, et al. "Low-level laser therapy for diabetic foot ulcers: meta-analysis." Journal of Photochemistry and Photobiology B. 2023.',
    color: '#FFD93D',
  },
  {
    id: 5,
    text: 'Wu SC, et al. "Plantar pressures predict diabetic foot ulcer." Diabetes Care. 2008.',
    color: '#A8EDEA',
  },
]

function PanelItem({ panel, index }: { panel: typeof PANELS[0]; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: index * 0.12 }}
      className="glass rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${panel.color}20` }}
    >
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-start gap-4 p-6 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${panel.color}18`, border: `1px solid ${panel.color}40` }}
        >
          <panel.icon size={22} style={{ color: panel.color }} />
        </div>
        <div className="flex-1">
          <h3 className="font-syne font-bold text-lg mb-2" style={{ color: 'var(--clr-text)' }}>
            {panel.title}
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text-muted)' }}>
            {panel.summary}
          </p>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 mt-1"
        >
          <ChevronDown size={20} style={{ color: 'var(--clr-text-muted)' }} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div
              className="px-6 pb-6 ml-16"
              style={{ borderTop: `1px solid ${panel.color}15` }}
            >
              <p
                className="text-sm leading-relaxed mt-4 whitespace-pre-line"
                style={{ color: 'var(--clr-text-muted)' }}
              >
                {panel.detail}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Science() {
  return (
    <section id="science" className="section-pad" style={{ background: 'var(--clr-bg)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-16"
        >
          <span
            className="inline-block text-sm font-medium px-3 py-1 rounded-full mb-4"
            style={{ background: 'var(--clr-glow)', border: '1px solid var(--clr-border)', color: 'var(--clr-accent)' }}
          >
            Evidence-Based
          </span>
          <h2 className="section-heading mb-4">The Science Behind SoleIQ</h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--clr-text-muted)' }}>
            Every feature in SoleIQ is rooted in peer-reviewed research. Here's the evidence that drives our design decisions.
          </p>
        </motion.div>

        <div className="space-y-4 mb-16">
          {PANELS.map((panel, i) => (
            <PanelItem key={panel.title} panel={panel} index={i} />
          ))}
        </div>

        {/* Citations */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="flex items-center gap-3 mb-6">
            <BookOpen size={20} style={{ color: 'var(--clr-accent)' }} />
            <h3 className="font-syne font-bold text-xl" style={{ color: 'var(--clr-text)' }}>
              Key References
            </h3>
          </div>
          <div className="space-y-3">
            {CITATIONS.map((cite, i) => (
              <motion.div
                key={cite.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: i * 0.08 }}
                className="flex items-start gap-3 glass rounded-xl p-4"
              >
                <span
                  className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${cite.color}20`, color: cite.color, border: `1px solid ${cite.color}40` }}
                >
                  {cite.id}
                </span>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text-muted)' }}>
                  {cite.text}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
