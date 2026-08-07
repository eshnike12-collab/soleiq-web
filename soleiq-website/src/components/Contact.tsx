import { useId, useState } from 'react'
import emailjs from '@emailjs/browser'

// ─── EmailJS config ───────────────────────────────────────────────────────────
// Unchanged from the previous site — same service, template, and public key.
// The template still receives {{from_name}}, {{from_email}} and {{message}};
// {{phone}}, {{role}} and {{interests}} are simply no longer sent.
const EMAILJS_SERVICE_ID = 'service_nlais2p'
const EMAILJS_TEMPLATE_ID = 'template_wopmjym'
const EMAILJS_PUBLIC_KEY = 'yxYlWctA4GYoV0Znz'
// ─────────────────────────────────────────────────────────────────────────────

const CONTACT_EMAIL = 'contact.soleiq@gmail.com'

interface Errors {
  name?: string
  email?: string
  message?: string
}

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [failed, setFailed] = useState(false)
  const ids = useId()

  const validate = (): boolean => {
    const e: Errors = {}
    if (!name.trim()) e.name = 'Please tell us your name.'
    if (!email.trim()) e.email = 'Please add an email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'That email address looks off.'
    if (!message.trim()) e.message = 'Please include a message.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setFailed(false)
    if (!validate()) return
    setSubmitting(true)
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: name,
          from_email: email,
          message,
          to_email: CONTACT_EMAIL,
        },
        EMAILJS_PUBLIC_KEY
      )
      setSent(true)
    } catch (err) {
      console.error('EmailJS error:', err)
      setFailed(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="contact" className="section-pad" aria-labelledby="contact-heading">
      <div className="shell">
        <div className="grid gap-14 md:grid-cols-[1fr_1.1fr] md:gap-20">
          <div>
            <p className="eyebrow">Contact</p>
            <h2 id="contact-heading" className="h-section mt-5">
              Get in touch.
            </h2>
            <p className="lede mt-6 max-w-prose">
              Clinical partnerships, research collaboration, press, or a
              question about the product. This reaches us directly.
            </p>
            <p className="mt-8 text-[0.9375rem] text-clr-muted">
              Or email{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-clr-text underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
            <p className="mt-6 max-w-prose text-sm leading-relaxed text-clr-muted">
              Please don't send medical details or images through this form. It
              is not a clinical channel, and it is not monitored for urgent
              problems.
            </p>
          </div>

          <div>
            {sent ? (
              <div
                className="rounded-xl px-6 py-10"
                style={{ border: '1px solid var(--clr-border-strong)' }}
                role="status"
              >
                <p className="font-display text-xl font-medium tracking-tight text-clr-text">
                  Message sent.
                </p>
                <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-clr-muted">
                  Thanks. We'll reply to {email}.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm mt-6"
                  onClick={() => {
                    setSent(false)
                    setName('')
                    setEmail('')
                    setMessage('')
                    setErrors({})
                  }}
                >
                  Send another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-6">
                <Field
                  id={`${ids}-name`}
                  label="Name"
                  error={errors.name}
                  value={name}
                  onChange={setName}
                  autoComplete="name"
                />
                <Field
                  id={`${ids}-email`}
                  label="Email"
                  type="email"
                  error={errors.email}
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                />
                <div>
                  <label htmlFor={`${ids}-message`} className="eyebrow">
                    Message
                  </label>
                  <textarea
                    id={`${ids}-message`}
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="field mt-2.5 resize-y"
                    aria-invalid={errors.message ? true : undefined}
                    aria-describedby={errors.message ? `${ids}-message-error` : undefined}
                  />
                  {errors.message && (
                    <p
                      id={`${ids}-message-error`}
                      className="mt-2 text-sm"
                      style={{ color: 'var(--clr-level-urgent)' }}
                    >
                      {errors.message}
                    </p>
                  )}
                </div>

                {failed && (
                  <p className="text-sm" style={{ color: 'var(--clr-level-urgent)' }} role="alert">
                    That didn't send. Please email {CONTACT_EMAIL} directly.
                  </p>
                )}

                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  type?: string
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="field mt-2.5"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm" style={{ color: 'var(--clr-level-urgent)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
