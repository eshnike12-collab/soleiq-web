import { motion } from 'framer-motion'
import { ArrowRight, Activity } from 'lucide-react'
import { useCountUp } from '../hooks/useCountUp'
import { useInView } from '../hooks/useInView'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: i * 0.12 },
  }),
}

const STATS = [
  { value: 186, suffix: 'M', label: 'DFU Cases Globally', unit: '18.6M' },
  { value: 80, suffix: '%', label: 'Preventable Amputations', unit: '80%' },
  { value: 30, suffix: '%', label: 'Pain Reduction', unit: '15-30%' },
  { value: 86, suffix: '%', label: 'Recurrence Reduction', unit: '86%' },
]

function StatCard({ stat, inView }: { stat: typeof STATS[0]; inView: boolean }) {
  const count = useCountUp(stat.value, 2000, inView)
  return (
    <div className="flex flex-col items-center">
      <span className="stat-num text-3xl md:text-4xl">
        {stat.value === 186 ? (count / 10).toFixed(1) : count}{stat.suffix}
      </span>
      <span className="text-xs mt-1" style={{ color: 'var(--clr-text-muted)' }}>{stat.label}</span>
    </div>
  )
}

export default function Hero() {
  const { ref, inView } = useInView(0.1)

  return (
    <section
      id="home"
      className="relative min-h-screen flex flex-col"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 60% 50%, rgba(78,205,196,0.08) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 20% 80%, rgba(59,130,246,0.06) 0%, transparent 60%), var(--clr-bg)',
      }}
    >
      <div className="relative z-10 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col justify-center pt-24 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
            >
              <motion.div variants={fadeUp} custom={0}>
                <span
                  className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full mb-6"
                  style={{
                    background: 'var(--clr-glow)',
                    border: '1px solid var(--clr-border)',
                    color: 'var(--clr-accent)',
                  }}
                >
                  <Activity size={14} />
                  Clinically Validated Technology
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                custom={1}
                className="section-heading mb-6"
                style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', lineHeight: 1.1 }}
              >
                Prevent Diabetic Foot Ulcers{' '}
                <span className="text-gradient">Before They Begin</span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                custom={2}
                className="text-lg mb-8 leading-relaxed"
                style={{ color: 'var(--clr-text-muted)', maxWidth: '520px' }}
              >
                SoleIQ combines AI-powered pressure mapping, photobiomodulation therapy, and real-time temperature sensing in a smart insole — giving patients and clinicians the power to prevent amputations before they happen.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-4">
                <button
                  className="btn-primary flex items-center gap-2"
                  onClick={() => document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Shop Now <ArrowRight size={16} />
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  How It Works
                </button>
              </motion.div>
            </motion.div>
          </div>

          {/* Right: Foot SVG + Data Cards */}
          <div className="relative flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
              className="relative"
            >
              {/* Foot SVG with heatmap */}
              <svg
                width="280"
                height="380"
                viewBox="0 0 280 380"
                fill="none"
                className="float"
                style={{ filter: 'drop-shadow(0 0 40px rgba(78,205,196,0.25))' }}
              >
                <defs>
                  <linearGradient id="footGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1A4A5C" />
                    <stop offset="100%" stopColor="#0F3548" />
                  </linearGradient>
                  <radialGradient id="hotspot1" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="hotspot2" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FFD93D" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#FFD93D" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="hotspot3" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#4ECDC4" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#4ECDC4" stopOpacity="0" />
                  </radialGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Foot outline */}
                <path
                  d="M140 20 C120 20 95 30 85 60 C75 90 80 130 75 160 C68 200 55 230 50 260 C44 295 48 330 70 350 C90 368 120 372 140 370 C165 368 195 360 210 340 C225 318 220 285 215 260 C208 230 200 200 200 160 C200 130 205 90 195 60 C185 30 165 20 140 20Z"
                  fill="url(#footGrad)"
                  stroke="var(--clr-accent)"
                  strokeWidth="1.5"
                  strokeOpacity="0.6"
                />

                {/* Toes */}
                <ellipse cx="95" cy="28" rx="12" ry="16" fill="url(#footGrad)" stroke="var(--clr-accent)" strokeWidth="1" strokeOpacity="0.5" />
                <ellipse cx="115" cy="20" rx="11" ry="15" fill="url(#footGrad)" stroke="var(--clr-accent)" strokeWidth="1" strokeOpacity="0.5" />
                <ellipse cx="138" cy="18" rx="11" ry="15" fill="url(#footGrad)" stroke="var(--clr-accent)" strokeWidth="1" strokeOpacity="0.5" />
                <ellipse cx="160" cy="20" rx="10" ry="14" fill="url(#footGrad)" stroke="var(--clr-accent)" strokeWidth="1" strokeOpacity="0.5" />
                <ellipse cx="180" cy="28" rx="9" ry="13" fill="url(#footGrad)" stroke="var(--clr-accent)" strokeWidth="1" strokeOpacity="0.5" />

                {/* Pressure heatmap overlays */}
                <ellipse cx="115" cy="310" rx="35" ry="28" fill="url(#hotspot1)" opacity="0.85" />
                <ellipse cx="165" cy="295" rx="28" ry="22" fill="url(#hotspot2)" opacity="0.75" />
                <ellipse cx="135" cy="180" rx="25" ry="20" fill="url(#hotspot3)" opacity="0.6" />

                {/* Sensor dots */}
                <g filter="url(#glow)">
                  <circle cx="115" cy="310" r="6" fill="#FF6B6B" opacity="0.9">
                    <animate attributeName="r" values="5;9;5" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0.5;0.9" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="165" cy="295" r="5" fill="#FFD93D" opacity="0.9">
                    <animate attributeName="r" values="4;8;4" dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0.5;0.9" dur="2.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="135" cy="180" r="5" fill="#4ECDC4" opacity="0.9">
                    <animate attributeName="r" values="4;7;4" dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0.5;0.9" dur="3s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="140" cy="90" r="4" fill="#4ECDC4" opacity="0.7">
                    <animate attributeName="r" values="3;6;3" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="100" cy="220" r="4" fill="#A8EDEA" opacity="0.6">
                    <animate attributeName="r" values="3;5;3" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                </g>

                {/* Circuit lines on insole */}
                <path d="M100 150 Q140 145 180 150" stroke="var(--clr-accent)" strokeWidth="0.8" strokeOpacity="0.3" strokeDasharray="4 4" />
                <path d="M95 220 Q140 215 185 220" stroke="var(--clr-accent)" strokeWidth="0.8" strokeOpacity="0.3" strokeDasharray="4 4" />
                <path d="M90 280 Q140 275 190 280" stroke="var(--clr-accent)" strokeWidth="0.8" strokeOpacity="0.3" strokeDasharray="4 4" />
              </svg>

              {/* Floating Data Cards */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.6 }}
                className="absolute glass rounded-xl px-4 py-3"
                style={{
                  top: '10%',
                  left: '-30%',
                  minWidth: '160px',
                  animation: 'float 3.5s ease-in-out infinite',
                  animationDelay: '0.5s',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--clr-text-muted)' }}>Risk Score</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-syne font-bold text-lg" style={{ color: 'var(--clr-text)' }}>LOW</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(34,197,94,0.15)', color: '#4ADE80', border: '1px solid rgba(34,197,94,0.3)' }}
                  >
                    ✓ Safe
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.8 }}
                className="absolute glass rounded-xl px-4 py-3"
                style={{
                  top: '40%',
                  right: '-35%',
                  minWidth: '170px',
                  animation: 'float 4s ease-in-out infinite',
                  animationDelay: '1s',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full blink" style={{ background: '#FF6B6B' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--clr-text-muted)' }}>Plantar Temp</span>
                </div>
                <div className="font-syne font-bold text-lg" style={{ color: 'var(--clr-text)' }}>32.1°C</div>
                <div className="text-xs mt-1" style={{ color: '#4ADE80' }}>Within range</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 1.0 }}
                className="absolute glass rounded-xl px-4 py-3"
                style={{
                  bottom: '5%',
                  left: '-25%',
                  minWidth: '175px',
                  animation: 'float 3.2s ease-in-out infinite',
                  animationDelay: '0.2s',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: '#FF6B6B' }} />
                  <span className="w-2 h-2 rounded-full blink" style={{ background: '#FF6B6B', marginLeft: '-6px' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--clr-text-muted)' }}>PBM Session</span>
                </div>
                <div className="font-syne font-bold" style={{ color: 'var(--clr-text)' }}>Active</div>
                <div className="text-xs mt-1" style={{ color: 'var(--clr-accent)' }}>14 min remaining</div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Stats Bar */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
          className="mt-16 glass rounded-2xl p-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x-0 md:divide-x"
            style={{ borderColor: 'var(--clr-border)' }}
          >
            {STATS.map(stat => (
              <StatCard key={stat.label} stat={stat} inView={inView} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
