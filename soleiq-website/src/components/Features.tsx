import { motion } from 'framer-motion'
import { Grid3x3, Zap, Brain, Footprints, Bell, ShieldCheck } from 'lucide-react'

const FEATURES = [
  {
    icon: Grid3x3,
    title: 'Smart Pressure Mapping',
    color: '#4ECDC4',
    description:
      'A dense array of capacitive pressure sensors captures plantar load distribution at 100Hz, identifying dangerous hotspots before neuropathy masks the warning signs.',
  },
  {
    icon: Zap,
    title: 'Dual-Spectrum PBM',
    color: '#3B82F6',
    description:
      'Embedded 660nm (red) and 850nm (near-infrared) LEDs deliver targeted photobiomodulation therapy directly to at-risk tissue zones, reducing inflammation and accelerating healing.',
  },
  {
    icon: Brain,
    title: 'AI Risk Engine',
    color: '#A8EDEA',
    description:
      'A lightweight neural network trained on 2.3M foot-health data points runs on-device, computing personalized ulcer-risk scores every 10 seconds without cloud dependency.',
  },
  {
    icon: Footprints,
    title: 'Personalized Offloading',
    color: '#FFD93D',
    description:
      'Real-time gait feedback guides patients to redistribute pressure away from ulcer-prone zones, with haptic cues and step-by-step coaching in the companion app.',
  },
  {
    icon: Bell,
    title: 'Mobile App & Alerts',
    color: '#4ECDC4',
    description:
      'iOS and Android app delivers instant push alerts when risk thresholds are exceeded, provides trend analytics, and shares encrypted reports directly with your care team.',
  },
  {
    icon: ShieldCheck,
    title: 'Clinical-Grade Safety',
    color: '#3B82F6',
    description:
      'FDA-registered, IEC 60601-1 compliant, and CE-marked. Built-in thermal cutoff, optical power limits, and waterproofing (IP67) ensure safe use across all environments.',
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
}

export default function Features() {
  return (
    <section id="features" className="section-pad" style={{ background: 'var(--clr-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            Technology
          </span>
          <h2 className="section-heading mb-4">Everything You Need, Nothing You Don't</h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--clr-text-muted)' }}>
            Six integrated systems working in concert — delivering hospital-grade foot care from the comfort of your home.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {FEATURES.map(feature => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              whileHover={{ y: -8, boxShadow: `0 20px 40px ${feature.color}25` }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="glass rounded-2xl p-6 cursor-default"
              style={{ border: `1px solid ${feature.color}20` }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{
                  background: `${feature.color}18`,
                  border: `1px solid ${feature.color}40`,
                  boxShadow: `0 0 20px ${feature.color}15`,
                }}
              >
                <feature.icon size={22} style={{ color: feature.color }} />
              </div>
              <h3
                className="font-syne font-bold text-lg mb-3"
                style={{ color: 'var(--clr-text)' }}
              >
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text-muted)' }}>
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
