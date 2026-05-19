import { motion } from 'framer-motion'
import { Activity, Brain, Zap, AlertTriangle, ArrowRight } from 'lucide-react'

const STEPS = [
  {
    icon: Activity,
    num: '01',
    title: 'Monitor',
    color: '#4ECDC4',
    description: 'Continuous plantar pressure and temperature sensors track foot health 24/7, capturing data points every second.',
  },
  {
    icon: Brain,
    num: '02',
    title: 'Predict',
    color: '#3B82F6',
    description: 'Our AI engine analyzes sensor fusion data to compute real-time risk scores, identifying danger zones before tissue damage occurs.',
  },
  {
    icon: Zap,
    num: '03',
    title: 'Intervene',
    color: '#A8EDEA',
    description: 'Dual-spectrum photobiomodulation (660nm + 850nm) delivers targeted light therapy directly to high-risk tissue zones.',
  },
  {
    icon: AlertTriangle,
    num: '04',
    title: 'Escalate',
    color: '#FFD93D',
    description: 'When risk thresholds are exceeded, the system alerts the patient, caregiver, and clinician with actionable recommendations.',
  },
]

const CIRCUIT_NODES = [
  { label: 'Monitor', x: 200, y: 60, color: '#4ECDC4' },
  { label: 'Predict', x: 340, y: 140, color: '#3B82F6' },
  { label: 'Intervene', x: 340, y: 260, color: '#A8EDEA' },
  { label: 'Track', x: 200, y: 340, color: '#4ECDC4' },
  { label: 'Escalate', x: 60, y: 200, color: '#FFD93D' },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section-pad" style={{ background: 'var(--clr-surface-2)' }}>
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
            Closed-Loop System
          </span>
          <h2 className="section-heading mb-4">How SoleIQ Works</h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--clr-text-muted)' }}>
            A continuous, intelligent loop that never stops protecting you — from first step to final alert.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Desktop horizontal line */}
          <div
            className="hidden lg:block absolute top-16 left-0 right-0 h-px"
            style={{ background: 'var(--clr-border)', top: '60px' }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: i * 0.12 }}
                className="relative"
              >
                {/* Arrow between steps on desktop */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:flex absolute -right-6 top-12 z-10 items-center justify-center">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 + 0.3, duration: 0.4 }}
                    >
                      <ArrowRight size={20} style={{ color: step.color }} />
                    </motion.div>
                  </div>
                )}

                <div
                  className="glass rounded-2xl p-6 h-full"
                  style={{ border: `1px solid ${step.color}30` }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${step.color}20`, border: `1px solid ${step.color}40` }}
                  >
                    <step.icon size={22} style={{ color: step.color }} />
                  </div>
                  <div
                    className="font-syne text-xs font-bold mb-1"
                    style={{ color: step.color, letterSpacing: '0.1em' }}
                  >
                    STEP {step.num}
                  </div>
                  <h3 className="font-syne font-bold text-xl mb-3" style={{ color: 'var(--clr-text)' }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--clr-text-muted)' }}>
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Animated Closed Loop Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
          className="mt-20 glass rounded-3xl p-8 flex flex-col items-center"
        >
          <h3 className="font-syne font-bold text-2xl mb-2 text-center" style={{ color: 'var(--clr-text)' }}>
            The Continuous Protection Loop
          </h3>
          <p className="text-sm text-center mb-8" style={{ color: 'var(--clr-text-muted)' }}>
            Data flows seamlessly through every stage — always learning, always protecting
          </p>

          <div className="w-full max-w-lg">
            <svg viewBox="0 0 400 400" fill="none" className="w-full">
              <defs>
                <marker id="arrowTeal" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                  <path d="M0 0 L8 4 L0 8 Z" fill="#4ECDC4" opacity="0.8" />
                </marker>
                <filter id="nodeGlow">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Circuit path */}
              <path
                d="M200 80 L340 160 L340 260 L200 340 L60 200 Z"
                stroke="var(--clr-border)"
                strokeWidth="1.5"
                fill="none"
                strokeDasharray="6 4"
              />

              {/* Animated travelling dot */}
              <circle r="6" fill="#4ECDC4" opacity="0.9" filter="url(#nodeGlow)">
                <animateMotion
                  path="M200 80 L340 160 L340 260 L200 340 L60 200 Z"
                  dur="6s"
                  repeatCount="indefinite"
                />
              </circle>

              {/* Nodes */}
              {CIRCUIT_NODES.map((node, i) => (
                <g key={node.label}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="28"
                    fill="var(--clr-surface-2)"
                    stroke={node.color}
                    strokeWidth="2"
                    filter="url(#nodeGlow)"
                    opacity="0.9"
                  >
                    <animate
                      attributeName="stroke-opacity"
                      values="0.6;1;0.6"
                      dur={`${2 + i * 0.4}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontFamily="DM Sans, sans-serif"
                    fontWeight="600"
                    fill={node.color}
                  >
                    {node.label}
                  </text>
                </g>
              ))}

              {/* Center text */}
              <circle cx="200" cy="200" r="40" fill="var(--clr-surface)" stroke="var(--clr-border)" strokeWidth="1" />
              <text x="200" y="196" textAnchor="middle" fontSize="11" fontFamily="Syne, sans-serif" fontWeight="700" fill="var(--clr-accent)">
                SoleIQ
              </text>
              <text x="200" y="210" textAnchor="middle" fontSize="9" fontFamily="DM Sans, sans-serif" fill="var(--clr-text-muted)">
                AI Core
              </text>
            </svg>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
