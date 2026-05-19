import { motion } from 'framer-motion'
import { useCountUp } from '../hooks/useCountUp'
import { useInView } from '../hooks/useInView'

const STATS = [
  { value: 537, suffix: 'M', label: 'People with diabetes worldwide', prefix: '' },
  { value: 1, suffix: '', label: 'DFU develops every 20 seconds', prefix: 'Every' },
  { value: 6, suffix: 'B+', label: 'Annual DFU treatment costs (USD)', prefix: '$' },
  { value: 65, suffix: '%', label: 'DFU patients don\'t survive 5 years post-amputation', prefix: '' },
]

function StatCard({ stat, inView, delay }: { stat: typeof STATS[0]; inView: boolean; delay: number }) {
  const count = useCountUp(stat.value, 2200, inView)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay }}
      className="glass rounded-2xl p-6 text-center"
    >
      <div className="stat-num text-4xl mb-2">
        {stat.prefix && <span className="text-2xl mr-1">{stat.prefix}</span>}
        {count}{stat.suffix}
      </div>
      <p className="text-sm leading-snug" style={{ color: 'var(--clr-text-muted)' }}>
        {stat.label}
      </p>
    </motion.div>
  )
}

export default function About() {
  const { ref, inView } = useInView(0.2)

  return (
    <section id="about" className="section-pad" style={{ background: 'var(--clr-surface-2)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Story */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <span
              className="inline-block text-sm font-medium px-3 py-1 rounded-full mb-6"
              style={{ background: 'var(--clr-glow)', border: '1px solid var(--clr-border)', color: 'var(--clr-accent)' }}
            >
              Our Story
            </span>
            <h2 className="section-heading mb-6">
              Built to End a{' '}
              <span className="text-gradient">Preventable Crisis</span>
            </h2>
            <div className="space-y-4 text-base leading-relaxed" style={{ color: 'var(--clr-text-muted)' }}>
              <p>
                SoleIQ was born from a simple, devastating observation: the vast majority of diabetic foot amputations are preventable. And yet, every 20 seconds, somewhere in the world, a person with diabetes loses a limb.
              </p>
              <p>
                Our founding team — engineers, clinicians, and patient advocates — spent years working at the intersection of wearable technology and chronic disease management. We kept asking the same question: why do we wait until a wound forms before we act?
              </p>
              <p>
                The answer wasn't better wound care. It was earlier detection, smarter intervention, and technology that worked for patients in their real lives — not just in clinical settings. So we built SoleIQ.
              </p>
              <p>
                Every algorithm, every sensor, every phototherapy parameter was designed around one goal: catching the earliest possible signal of tissue stress and intervening before damage becomes irreversible.
              </p>
            </div>
            <div
              className="mt-8 p-4 rounded-xl"
              style={{ background: 'var(--clr-glow)', border: '1px solid var(--clr-border)' }}
            >
              <p
                className="font-syne font-semibold text-lg text-center"
                style={{ color: 'var(--clr-accent)' }}
              >
                "Backed by peer-reviewed science. Built for the home."
              </p>
            </div>
          </motion.div>

          {/* Right: Stats */}
          <div ref={ref} className="grid grid-cols-2 gap-4">
            {STATS.map((stat, i) => (
              <StatCard key={stat.label} stat={stat} inView={inView} delay={i * 0.12} />
            ))}
          </div>
        </div>

        {/* Mission Statement */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
          className="mt-20 glass rounded-3xl p-10 text-center"
        >
          <h3 className="font-syne font-bold text-2xl mb-4" style={{ color: 'var(--clr-text)' }}>
            Our Mission
          </h3>
          <p className="text-lg max-w-3xl mx-auto leading-relaxed" style={{ color: 'var(--clr-text-muted)' }}>
            To make diabetic foot amputations as rare as the technology that prevents them is common — by placing clinical-grade, AI-powered prevention directly in the hands of every patient who needs it, wherever they are.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mt-8">
            {['FDA Registered', 'CE Marked', 'IEC 60601-1', 'HIPAA Compliant', 'ISO 13485'].map(badge => (
              <span
                key={badge}
                className="text-sm font-medium px-4 py-1.5 rounded-full"
                style={{
                  background: 'var(--clr-glow)',
                  border: '1px solid var(--clr-border)',
                  color: 'var(--clr-accent)',
                }}
              >
                {badge}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
