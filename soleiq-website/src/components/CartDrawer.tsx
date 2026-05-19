import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useState } from 'react'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQty, total, clearCart } = useCart()
  const [checkoutDone, setCheckoutDone] = useState(false)

  const handleCheckout = () => {
    setCheckoutDone(true)
    setTimeout(() => {
      clearCart()
      setCheckoutDone(false)
      onClose()
    }, 2500)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(7,31,46,0.7)', backdropFilter: 'blur(4px)' }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col"
            style={{
              background: 'var(--clr-surface-2)',
              borderLeft: '1px solid var(--clr-border)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--clr-border)' }}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag size={20} style={{ color: 'var(--clr-accent)' }} />
                <h2 className="font-syne font-bold text-lg" style={{ color: 'var(--clr-text)' }}>
                  Your Cart
                </h2>
                {items.length > 0 && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--clr-accent)', color: 'var(--clr-bg)' }}
                  >
                    {items.reduce((s, i) => s + i.qty, 0)}
                  </span>
                )}
              </div>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  background: 'var(--clr-glow)',
                  border: '1px solid var(--clr-border)',
                  color: 'var(--clr-text-muted)',
                  padding: '6px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {checkoutDone ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center gap-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid #4ADE80' }}
                  >
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <motion.path
                        d="M8 20 L17 29 L32 12"
                        stroke="#4ADE80"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      />
                    </svg>
                  </motion.div>
                  <h3 className="font-syne font-bold text-xl" style={{ color: 'var(--clr-text)' }}>
                    Order Placed!
                  </h3>
                  <p className="text-center text-sm" style={{ color: 'var(--clr-text-muted)' }}>
                    Thank you for your order. You'll receive a confirmation email shortly.
                  </p>
                </motion.div>
              ) : items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--clr-glow)', border: '1px solid var(--clr-border)' }}
                  >
                    <ShoppingBag size={32} style={{ color: 'var(--clr-text-muted)' }} />
                  </div>
                  <h3 className="font-syne font-semibold text-lg" style={{ color: 'var(--clr-text)' }}>
                    Your cart is empty
                  </h3>
                  <p className="text-sm text-center" style={{ color: 'var(--clr-text-muted)' }}>
                    Add SoleIQ products to start protecting your foot health.
                  </p>
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="btn-secondary flex items-center gap-2 mt-2"
                  >
                    Continue Shopping <ArrowRight size={15} />
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {items.map(item => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 30, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                        className="glass rounded-xl p-4 flex items-start gap-4"
                      >
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ background: 'var(--clr-glow)', border: '1px solid var(--clr-border)' }}
                        >
                          {item.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--clr-text)' }}>
                            {item.name}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>
                            {item.tagline}
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2">
                              <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.85 }}
                                onClick={() => updateQty(item.id, item.qty - 1)}
                                className="w-7 h-7 rounded-md flex items-center justify-center"
                                style={{
                                  background: 'var(--clr-glow)',
                                  border: '1px solid var(--clr-border)',
                                  color: 'var(--clr-accent)',
                                  cursor: 'pointer',
                                }}
                              >
                                <Minus size={13} />
                              </motion.button>
                              <span className="w-5 text-center text-sm font-semibold" style={{ color: 'var(--clr-text)' }}>
                                {item.qty}
                              </span>
                              <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.85 }}
                                onClick={() => updateQty(item.id, item.qty + 1)}
                                className="w-7 h-7 rounded-md flex items-center justify-center"
                                style={{
                                  background: 'var(--clr-glow)',
                                  border: '1px solid var(--clr-border)',
                                  color: 'var(--clr-accent)',
                                  cursor: 'pointer',
                                }}
                              >
                                <Plus size={13} />
                              </motion.button>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-syne font-bold" style={{ color: 'var(--clr-accent)' }}>
                                ${(item.price * item.qty).toFixed(2)}
                              </span>
                              <motion.button
                                whileHover={{ scale: 1.15, color: '#FF6B6B' }}
                                whileTap={{ scale: 0.85 }}
                                onClick={() => removeItem(item.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--clr-text-muted)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                }}
                              >
                                <Trash2 size={15} />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {!checkoutDone && items.length > 0 && (
              <div
                className="px-6 py-5"
                style={{ borderTop: '1px solid var(--clr-border)' }}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium" style={{ color: 'var(--clr-text-muted)' }}>Subtotal</span>
                  <span className="font-syne font-bold text-xl" style={{ color: 'var(--clr-text)' }}>
                    ${total.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs mb-4" style={{ color: 'var(--clr-text-muted)' }}>
                  Shipping and taxes calculated at checkout.
                </p>
                <motion.button
                  onClick={handleCheckout}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-primary w-full flex items-center justify-center gap-2 mb-3"
                >
                  Proceed to Checkout <ArrowRight size={16} />
                </motion.button>
                <button
                  onClick={onClose}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--clr-text-muted)',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
