import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, CheckCircle } from 'lucide-react'
import emailjs from '@emailjs/browser'

// ─── EmailJS config ───────────────────────────────────────────────────────────
// 1. Go to https://www.emailjs.com and sign up (free)
// 2. Add Email Service → connect contact.soleiq@gmail.com → copy Service ID below
// 3. Create Email Template (use variables: {{from_name}}, {{from_email}}, {{phone}},
//    {{role}}, {{interests}}, {{message}}) → copy Template ID below
// 4. Go to Account → API Keys → copy your Public Key below
const EMAILJS_SERVICE_ID  = 'service_nlais2p'
const EMAILJS_TEMPLATE_ID = 'template_wopmjym'
const EMAILJS_PUBLIC_KEY  = 'yxYlWctA4GYoV0Znz'
// ─────────────────────────────────────────────────────────────────────────────

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  message: string
  interests: string[]
}

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  message?: string
}

const ROLES = [
  'Patient',
  'Caregiver / Family Member',
  'Podiatrist / Foot Specialist',
  'Endocrinologist',
  'Diabetes Nurse Educator',
  'Hospital / Health System',
  'Researcher',
  'Other',
]

const INTERESTS = [
  'Smart Insole',
  'PBM Slipper',
  'Clinical Partnership',
  'Research Collaboration',
  'Press / Media',
  'Investor Relations',
]

const INFO_CARDS = [
  {
    icon: Mail,
    label: 'Email',
    value: 'contact.soleiq@gmail.com',
    sub: 'We respond within 24 hours',
    color: '#4ECDC4',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+1 (919) 884-0345',
    sub: 'Mon–Fri, 9am–6pm EST',
    color: '#3B82F6',
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Cary, NC',
    sub: 'United States',
    color: '#A8EDEA',
  },
]

export default function Contact() {
  const [form, setForm] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    message: '',
    interests: [],
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.firstName.trim()) e.firstName = 'First name is required'
    if (!form.lastName.trim()) e.lastName = 'Last name is required'
    if (!form.email.trim()) {
      e.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Please enter a valid email address'
    }
    if (!form.message.trim()) e.message = 'Please include a message'
    else if (form.message.trim().length < 20) e.message = 'Message must be at least 20 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name:  `${form.firstName} ${form.lastName}`,
          from_email: form.email,
          phone:      form.phone || 'Not provided',
          role:       form.role  || 'Not specified',
          interests:  form.interests.length ? form.interests.join(', ') : 'None selected',
          message:    form.message,
          to_email:   'contact.soleiq@gmail.com',
        },
        EMAILJS_PUBLIC_KEY
      )
      setSuccess(true)
    } catch (err) {
      console.error('EmailJS error:', err)
      alert('Failed to send message. Please email us directly at contact.soleiq@gmail.com')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setSuccess(false)
    setForm({ firstName: '', lastName: '', email: '', phone: '', role: '', message: '', interests: [] })
    setErrors({})
  }

  const toggleInterest = (interest: string) => {
    setForm(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }))
  }

  const inputStyle = (hasError?: string) => ({
    background: 'var(--clr-surface)',
    border: `1px solid ${hasError ? '#FF6B6B' : 'var(--clr-border)'}`,
    color: 'var(--clr-text)',
    borderRadius: '0.625rem',
    padding: '0.75rem 1rem',
    width: '100%',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '0.9375rem',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  })

  return (
    <section id="contact" className="section-pad" style={{ background: 'var(--clr-bg)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
            Contact Us
          </span>
          <h2 className="section-heading mb-4">Get in Touch</h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--clr-text-muted)' }}>
            Questions about SoleIQ? Interested in clinical partnerships? Our team is here to help.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-10">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            className="lg:col-span-3 glass rounded-3xl p-8"
          >
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center py-12 gap-5 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(78,205,196,0.15)', border: '2px solid var(--clr-accent)' }}
                >
                  <CheckCircle size={40} style={{ color: 'var(--clr-accent)' }} />
                </motion.div>
                <h3 className="font-syne font-bold text-2xl" style={{ color: 'var(--clr-text)' }}>
                  Message Sent!
                </h3>
                <p style={{ color: 'var(--clr-text-muted)' }}>
                  Thank you for reaching out. A member of our team will be in touch within 24 hours.
                </p>
                <button
                  onClick={handleReset}
                  className="btn-secondary mt-2"
                >
                  Send Another Message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--clr-text-muted)' }}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                      placeholder="Jane"
                      style={inputStyle(errors.firstName)}
                    />
                    {errors.firstName && (
                      <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--clr-text-muted)' }}>
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                      placeholder="Smith"
                      style={inputStyle(errors.lastName)}
                    />
                    {errors.lastName && (
                      <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--clr-text-muted)' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="jane@example.com"
                      style={inputStyle(errors.email)}
                    />
                    {errors.email && (
                      <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>{errors.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--clr-text-muted)' }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                      style={inputStyle()}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--clr-text-muted)' }}>
                    Your Role
                  </label>
                  <select
                    value={form.role}
                    onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    style={{ ...inputStyle(), appearance: 'none' }}
                  >
                    <option value="">Select your role...</option>
                    {ROLES.map(r => (
                      <option key={r} value={r} style={{ background: 'var(--clr-surface)', color: 'var(--clr-text)' }}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--clr-text-muted)' }}>
                    Interested In
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map(interest => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className="text-sm px-3 py-1.5 rounded-full transition-all"
                        style={{
                          background: form.interests.includes(interest) ? 'var(--clr-accent)' : 'var(--clr-glow)',
                          color: form.interests.includes(interest) ? 'var(--clr-bg)' : 'var(--clr-text-muted)',
                          border: `1px solid ${form.interests.includes(interest) ? 'var(--clr-accent)' : 'var(--clr-border)'}`,
                          cursor: 'pointer',
                          fontFamily: 'DM Sans, sans-serif',
                        }}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--clr-text-muted)' }}>
                    Message *
                  </label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Tell us how we can help..."
                    rows={4}
                    style={{ ...inputStyle(errors.message), resize: 'vertical' }}
                  />
                  {errors.message && (
                    <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>{errors.message}</p>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: submitting ? 1 : 1.02 }}
                  whileTap={{ scale: submitting ? 1 : 0.97 }}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  style={{ opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                        <path d="M12 2 A10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Message'
                  )}
                </motion.button>
              </form>
            )}
          </motion.div>

          {/* Info cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
            className="lg:col-span-2 flex flex-col gap-4 justify-start pt-1"
          >
            {INFO_CARDS.map(card => (
              <div key={card.label} className="glass rounded-2xl p-5 flex items-start gap-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${card.color}20`, border: `1px solid ${card.color}40` }}
                >
                  <card.icon size={20} style={{ color: card.color }} />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--clr-text)' }}>
                    {card.label}
                  </p>
                  <p className="text-sm font-medium" style={{ color: card.color }}>
                    {card.value}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>
                    {card.sub}
                  </p>
                </div>
              </div>
            ))}

            <div
              className="glass rounded-2xl p-5 mt-2"
              style={{ border: '1px solid rgba(78,205,196,0.15)' }}
            >
              <p
                className="text-xs leading-relaxed"
                style={{ color: 'var(--clr-text-muted)' }}
              >
                <strong style={{ color: 'var(--clr-text)' }}>Privacy Notice:</strong> Information submitted through this form is used solely to respond to your inquiry. We do not sell or share personal data. View our{' '}
                <a href="#" style={{ color: 'var(--clr-accent)' }}>Privacy Policy</a>.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
