import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, ChevronDown, Check, AlertCircle } from 'lucide-react'
import { useCart } from '../context/CartContext'

const PRODUCTS = [
  {
    id: 'smart-insole',
    name: 'SoleIQ Smart Insole',
    tagline: 'Complete DFU Prevention System',
    price: 349,
    emoji: '👟',
    category: 'flagship',
    gradient: 'linear-gradient(135deg, #0F3548 0%, #1A4A5C 100%)',
    accentColor: '#4ECDC4',
    specs: [
      '128-sensor pressure matrix',
      'IR temperature sensing (0.1°C resolution)',
      '660nm + 850nm dual PBM array',
      'BLE 5.0 + 7-day battery life',
      'IP67 waterproof rating',
      'AI risk scoring on-device',
    ],
    description: 'The flagship SoleIQ insole — a complete closed-loop diabetic foot care system that monitors, predicts, and intervenes in real time.',
  },
  {
    id: 'offloading-insole',
    name: 'SoleIQ Offloading Insole',
    tagline: 'Pressure Relief & Gait Guidance',
    price: 89,
    emoji: '🦶',
    category: 'offloading',
    gradient: 'linear-gradient(135deg, #0A3040 0%, #163A50 100%)',
    accentColor: '#3B82F6',
    specs: [
      'Anatomical foam offloading zones',
      'Embedded haptic feedback motors',
      '32-point pressure monitoring',
      'Companion app gait coaching',
      'Machine-washable textile top layer',
      'Sizes EU 36–48',
    ],
    description: 'Engineered foam and haptic-guided gait coaching to redistribute dangerous pressure away from vulnerable foot zones.',
  },
  {
    id: 'pbm-slipper',
    name: 'SoleIQ PBM Slipper',
    tagline: 'Therapeutic Recovery Footwear',
    price: 279,
    emoji: '🩴',
    category: 'therapy',
    gradient: 'linear-gradient(135deg, #0D2B3E 0%, #1A4A5C 100%)',
    accentColor: '#A8EDEA',
    specs: [
      '96 therapeutic LED array',
      '20-min timed therapy sessions',
      'USB-C rechargeable',
      'Soft orthopedic foam liner',
      'Temperature-regulated emission',
      'One-size-fits-most (adjustable)',
    ],
    description: 'Slip-on therapeutic slipper delivering clinical-grade PBM therapy during rest, driving circulation and pain reduction.',
  },
  {
    id: 'therapy-pods',
    name: 'SoleIQ Therapy Pods',
    tagline: 'Targeted Hot-Spot Treatment',
    price: 199,
    emoji: '⚡',
    category: 'therapy',
    gradient: 'linear-gradient(135deg, #071F2E 0%, #0F3548 100%)',
    accentColor: '#FFD93D',
    specs: [
      'Self-adhesive silicone pods',
      'Dual 660nm/850nm LEDs per pod',
      'Wireless charging case included',
      'App-controlled intensity levels',
      'Reusable up to 500 sessions',
      'Compatible with Smart Insole',
    ],
    description: 'Precision adhesive therapy pods that attach directly to identified pressure hotspots for focused, high-intensity PBM treatment.',
  },
]

const CATEGORIES = [
  { id: 'all', label: 'All Products' },
  { id: 'flagship', label: 'Flagship' },
  { id: 'offloading', label: 'Offloading' },
  { id: 'therapy', label: 'Therapy' },
]

function ProductCard({ product }: { product: typeof PRODUCTS[0] }) {
  const { addItem, items } = useCart()
  const [expanded, setExpanded] = useState(false)
  const [added, setAdded] = useState(false)

  const inCart = items.some(i => i.id === product.id)

  const handleAdd = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      emoji: product.emoji,
      tagline: product.tagline,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ y: -6 }}
      className="glass rounded-2xl overflow-hidden flex flex-col"
      style={{ border: `1px solid ${product.accentColor}25` }}
    >
      {/* Illustration */}
      <div
        className="relative h-44 flex items-center justify-center overflow-hidden"
        style={{ background: product.gradient }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${product.accentColor}18 0%, transparent 70%)`,
          }}
        />
        <div
          className="text-7xl"
          style={{ filter: `drop-shadow(0 0 20px ${product.accentColor}60)` }}
        >
          {product.emoji}
        </div>
        <div
          className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full"
          style={{
            background: `${product.accentColor}20`,
            border: `1px solid ${product.accentColor}50`,
            color: product.accentColor,
          }}
        >
          ${product.price}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-syne font-bold text-lg mb-1" style={{ color: 'var(--clr-text)' }}>
          {product.name}
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--clr-text-muted)' }}>
          {product.tagline}
        </p>

        {/* Specs */}
        <ul className="space-y-1.5 mb-4 flex-1">
          {product.specs.map(spec => (
            <li key={spec} className="flex items-start gap-2 text-sm" style={{ color: 'var(--clr-text-muted)' }}>
              <Check size={13} className="mt-0.5 shrink-0" style={{ color: product.accentColor }} />
              {spec}
            </li>
          ))}
        </ul>

        {/* Add to Cart */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleAdd}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all mb-3"
          style={{
            background: added
              ? 'rgba(34,197,94,0.2)'
              : `${product.accentColor}20`,
            border: `1.5px solid ${added ? '#4ADE80' : product.accentColor}`,
            color: added ? '#4ADE80' : product.accentColor,
            cursor: 'pointer',
          }}
        >
          {added ? (
            <>
              <Check size={16} /> Added to Cart
            </>
          ) : (
            <>
              <ShoppingCart size={16} />
              {inCart ? 'Add Another' : 'Add to Cart'}
            </>
          )}
        </motion.button>

        {/* Learn More Accordion */}
        <button
          onClick={() => setExpanded(p => !p)}
          className="flex items-center justify-center gap-1 text-xs font-medium w-full"
          style={{ color: 'var(--clr-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Learn More
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} />
          </motion.span>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden"
            >
              <p
                className="text-sm leading-relaxed pt-3"
                style={{ color: 'var(--clr-text-muted)' }}
              >
                {product.description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default function Shop() {
  const [activeCategory, setActiveCategory] = useState('all')

  const filtered = activeCategory === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === activeCategory)

  return (
    <section id="shop" className="section-pad" style={{ background: 'var(--clr-surface-2)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-12"
        >
          <span
            className="inline-block text-sm font-medium px-3 py-1 rounded-full mb-4"
            style={{ background: 'var(--clr-glow)', border: '1px solid var(--clr-border)', color: 'var(--clr-accent)' }}
          >
            Shop
          </span>
          <h2 className="section-heading mb-4">Choose Your Protection</h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--clr-text-muted)' }}>
            From comprehensive prevention to targeted therapy — find the SoleIQ system that fits your needs.
          </p>
        </motion.div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {CATEGORIES.map(cat => (
            <motion.button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: activeCategory === cat.id ? 'var(--clr-accent)' : 'var(--clr-glow)',
                color: activeCategory === cat.id ? 'var(--clr-bg)' : 'var(--clr-text-muted)',
                border: `1px solid ${activeCategory === cat.id ? 'var(--clr-accent)' : 'var(--clr-border)'}`,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {cat.label}
            </motion.button>
          ))}
        </div>

        {/* Products Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </AnimatePresence>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center text-sm mt-8"
          style={{ color: 'var(--clr-text-muted)' }}
        >
          Free shipping on orders over $150
        </motion.p>
      </div>
    </section>
  )
}
