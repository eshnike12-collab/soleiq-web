import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'

const REVIEWS = [
  {
    name: 'Margaret H.',
    role: 'Type 2 Diabetic Patient, 14 years',
    quote: "I've had two foot ulcers in the past decade. Since using SoleIQ, I've had zero — and my podiatrist calls my foot health 'remarkable.' The alerts actually work. It caught a hotspot three weeks before I would have noticed anything was wrong.",
    initials: 'MH',
    color: '#4ECDC4',
    stars: 5,
  },
  {
    name: 'Dr. James Okafor',
    role: 'Podiatric Surgeon, 18 years',
    quote: "I prescribe SoleIQ to high-risk patients as part of their offloading protocol. The temperature data synced to my portal has transformed how I monitor between appointments. It's the closest thing to continuous clinical oversight outside a hospital.",
    initials: 'JO',
    color: '#3B82F6',
    stars: 5,
  },
  {
    name: 'Robert C.',
    role: 'T1D Patient & Marathon Runner',
    quote: "Running with diabetes was always a calculated risk. SoleIQ gave me real-time pressure feedback that actually changed my gait. Pain reduced noticeably in month one, and my A1C-related foot complications dropped off entirely.",
    initials: 'RC',
    color: '#A8EDEA',
    stars: 5,
  },
  {
    name: 'Priya S.',
    role: 'Diabetes Nurse Educator',
    quote: "The app is genuinely intuitive — and I say that as someone who has tested dozens of digital health tools. My patients in their 60s and 70s pick it up within a single session. The care team alert system is a game-changer for early intervention.",
    initials: 'PS',
    color: '#FFD93D',
    stars: 5,
  },
  {
    name: 'Thomas M.',
    role: 'Caregiver for diabetic parent',
    quote: "My father has peripheral neuropathy and can't feel when pressure builds up. SoleIQ gives me peace of mind every single day. The overnight temperature monitoring feature alone is worth every cent — we caught an issue at 2am that would have meant the ER.",
    initials: 'TM',
    color: '#FF6B6B',
    stars: 5,
  },
]

export default function Reviews() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)

  const go = useCallback((dir: number) => {
    setDirection(dir)
    setCurrent(prev => (prev + dir + REVIEWS.length) % REVIEWS.length)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => go(1), 5000)
    return () => clearInterval(timer)
  }, [go])

  const review = REVIEWS[current]

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
  }

  return (
    <section id="stories" className="section-pad" style={{ background: 'var(--clr-surface-2)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
            Patient Stories
          </span>
          <h2 className="section-heading mb-4">Real People. Real Results.</h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--clr-text-muted)' }}>
            From patients to clinicians, SoleIQ is changing how the world approaches diabetic foot care.
          </p>
        </motion.div>

        <div className="relative">
          <div className="overflow-hidden rounded-3xl glass" style={{ minHeight: '300px', padding: '3rem' }}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {/* Stars */}
                <div className="flex gap-1 mb-6">
                  {Array.from({ length: review.stars }).map((_, i) => (
                    <Star key={i} size={18} fill={review.color} style={{ color: review.color }} />
                  ))}
                </div>

                {/* Quote */}
                <blockquote
                  className="text-lg leading-relaxed mb-8 font-light"
                  style={{ color: 'var(--clr-text)' }}
                >
                  "{review.quote}"
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-syne font-bold text-sm flex-shrink-0"
                    style={{
                      background: `${review.color}20`,
                      border: `2px solid ${review.color}60`,
                      color: review.color,
                    }}
                  >
                    {review.initials}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--clr-text)' }}>{review.name}</p>
                    <p className="text-sm" style={{ color: 'var(--clr-text-muted)' }}>{review.role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-8">
            <motion.button
              onClick={() => go(-1)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-3 rounded-xl"
              style={{
                background: 'var(--clr-glow)',
                border: '1px solid var(--clr-border)',
                color: 'var(--clr-accent)',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={20} />
            </motion.button>

            {/* Dots */}
            <div className="flex gap-2">
              {REVIEWS.map((_, i) => (
                <motion.button
                  key={i}
                  onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i) }}
                  animate={{ width: i === current ? 24 : 8, opacity: i === current ? 1 : 0.4 }}
                  transition={{ duration: 0.3 }}
                  className="h-2 rounded-full"
                  style={{
                    background: i === current ? 'var(--clr-accent)' : 'var(--clr-border)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>

            <motion.button
              onClick={() => go(1)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-3 rounded-xl"
              style={{
                background: 'var(--clr-glow)',
                border: '1px solid var(--clr-border)',
                color: 'var(--clr-accent)',
                cursor: 'pointer',
              }}
            >
              <ChevronRight size={20} />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  )
}
