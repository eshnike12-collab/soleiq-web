import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: 'Is SoleIQ FDA approved?',
    a: 'SoleIQ is FDA-registered as a Class II medical device (510(k) pathway) for adjunctive monitoring and therapy. It is also CE-marked for the European market and complies with IEC 60601-1 safety standards. It is intended for adjunctive use alongside professional medical care — not as a replacement for physician diagnosis.',
  },
  {
    q: 'Who is SoleIQ designed for?',
    a: 'SoleIQ is designed for individuals with diabetes (Type 1 or 2) who are at elevated risk of diabetic foot ulcers — particularly those with peripheral neuropathy, a history of DFUs, or poor glycemic control. It is also used by podiatrists, endocrinologists, and diabetes care teams as a remote monitoring adjunct.',
  },
  {
    q: 'How does the pressure sensor work?',
    a: 'The Smart Insole contains 128 capacitive pressure sensors distributed across the plantar surface. Each sensor measures local force (in Newtons) 100 times per second. The on-device AI computes pressure-time integrals, identifies hotspots, and compares real-time maps against your personalized baseline — alerting you to dangerous deviations before tissue damage can occur.',
  },
  {
    q: 'Is photobiomodulation (PBM) therapy safe?',
    a: 'Yes. PBM using 660nm and 850nm LEDs at therapeutic energy densities (4-8 J/cm²) has been studied extensively and found to be safe with no serious adverse events in thousands of clinical trials. SoleIQ includes built-in thermal monitoring, optical power limits, and automatic shutoff to ensure safe operation. Contraindications include active malignancy over treated tissue and pregnancy.',
  },
  {
    q: 'How long does the battery last?',
    a: 'The Smart Insole battery lasts up to 7 days under typical use (12-16 hours/day active monitoring, with PBM therapy at 2×20 min/day). Charging takes approximately 90 minutes via wireless charging mat. The PBM Slipper charges via USB-C in under 2 hours.',
  },
  {
    q: 'Does SoleIQ connect to my doctor\'s system?',
    a: 'Yes. The SoleIQ app generates encrypted PDF/CSV reports that can be shared directly with your care team via email or compatible EHR platforms. We are actively developing direct integrations with Epic and Cerner. Clinical dashboard licenses are available for practices and hospital systems.',
  },
  {
    q: 'What shoe sizes are available?',
    a: 'SoleIQ insoles are available in EU 36 through EU 48 (approximately US Men\'s 4-14 / Women\'s 5.5-15.5). Each insole ships with a cutting guide and instructional video for precise trimming. Wide-width and extra-depth variants are available for patients with existing orthotics or foot deformities.',
  },
  {
    q: 'Is SoleIQ covered by insurance or HSA/FSA?',
    a: 'SoleIQ products are HSA and FSA eligible in the United States. Insurance coverage varies by provider and plan. We provide detailed medical necessity documentation and billing codes to support reimbursement claims. Contact our clinical team for assistance with your specific insurance situation.',
  },
  {
    q: 'Can I use SoleIQ if I already have a wound or active ulcer?',
    a: 'The PBM Slipper and Therapy Pods are designed to support healing of active wounds when used under clinician supervision. The pressure-monitoring Smart Insole should be used with caution over open wounds — consult your podiatrist or wound care specialist before use. SoleIQ does not replace wound care protocols.',
  },
  {
    q: 'What is your return policy?',
    a: 'We offer a 30-day no-questions-asked return policy on all products. Due to hygiene considerations, insoles that have been used inside shoes cannot be returned for resale, but we will provide a full refund regardless. Contact support@soleiq.com for return instructions.',
  },
]

function FAQItem({ item, index, openIndex, onToggle }: {
  item: typeof FAQS[0]
  index: number
  openIndex: number | null
  onToggle: (i: number) => void
}) {
  const isOpen = openIndex === index

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay: index * 0.05 }}
      className="glass rounded-xl overflow-hidden"
      style={{ border: isOpen ? '1px solid var(--clr-border)' : '1px solid rgba(78,205,196,0.1)' }}
    >
      <button
        onClick={() => onToggle(index)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
      >
        <span className="font-semibold pr-4" style={{ color: 'var(--clr-text)' }}>
          {item.q}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="flex-shrink-0"
        >
          <ChevronDown size={18} style={{ color: 'var(--clr-accent)' }} />
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p
              className="px-5 pb-4 text-sm leading-relaxed"
              style={{ color: 'var(--clr-text-muted)', borderTop: '1px solid rgba(78,205,196,0.08)' }}
            >
              <span className="block pt-4">{item.a}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const handleToggle = (i: number) => {
    setOpenIndex(prev => (prev === i ? null : i))
  }

  return (
    <section id="faq" className="section-pad" style={{ background: 'var(--clr-bg)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-14"
        >
          <span
            className="inline-block text-sm font-medium px-3 py-1 rounded-full mb-4"
            style={{ background: 'var(--clr-glow)', border: '1px solid var(--clr-border)', color: 'var(--clr-accent)' }}
          >
            FAQ
          </span>
          <h2 className="section-heading mb-4">Frequently Asked Questions</h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--clr-text-muted)' }}>
            Everything you need to know about SoleIQ products and technology.
          </p>
        </motion.div>

        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <FAQItem
              key={item.q}
              item={item}
              index={i}
              openIndex={openIndex}
              onToggle={handleToggle}
            />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm mt-10"
          style={{ color: 'var(--clr-text-muted)' }}
        >
          Still have questions?{' '}
          <button
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            className="font-medium"
            style={{ color: 'var(--clr-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Contact our team
          </button>
        </motion.p>
      </div>
    </section>
  )
}
