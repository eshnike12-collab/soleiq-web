import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import FloatingParticles from '../components/layout/FloatingParticles';

function SoleIQLogo({ size = 56 }: { size?: number }) {
  return (
    <img
      src="/soleiq-logo.png"
      alt="SoleIQ"
      width={size}
      height={size}
      style={{ objectFit: 'contain', display: 'block' }}
    />
  );
}

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--clr-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '1rem',
      }}
    >
      <FloatingParticles />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '420px',
        }}
      >
        <div
          className="glass"
          style={{
            padding: '2.5rem',
            borderRadius: '20px',
          }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            style={{ textAlign: 'center', marginBottom: '1.5rem' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <SoleIQLogo size={60} />
              <span
                className="font-syne"
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--clr-accent)',
                  letterSpacing: '0.15em',
                }}
              >
                SOLEIQ
              </span>
            </div>
          </motion.div>

          {/* Headings */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            style={{ textAlign: 'center', marginBottom: '2rem' }}
          >
            <h1
              className="font-syne"
              style={{
                fontSize: '1.8rem',
                fontWeight: 700,
                color: 'var(--clr-text)',
                marginBottom: '0.375rem',
              }}
            >
              Welcome back
            </h1>
            <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>
              Sign in to your personalized dashboard
            </p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              style={{ marginBottom: '1rem' }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--clr-text-muted)',
                  marginBottom: '0.375rem',
                }}
              >
                Email address
              </label>
              <input
                type="email"
                placeholder="margaret.t@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'var(--clr-surface-2)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: '10px',
                  color: 'var(--clr-text)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--clr-accent)';
                  e.target.style.boxShadow = '0 0 0 3px var(--clr-glow)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--clr-border)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              style={{ marginBottom: '1.5rem' }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--clr-text-muted)',
                  marginBottom: '0.375rem',
                }}
              >
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'var(--clr-surface-2)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: '10px',
                  color: 'var(--clr-text)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.95rem',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--clr-accent)';
                  e.target.style.boxShadow = '0 0 0 3px var(--clr-glow)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--clr-border)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <motion.button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', fontSize: '1rem', padding: '0.875rem' }}
                whileHover={{ scale: 1.02, boxShadow: '0 0 20px var(--clr-glow)' }}
                whileTap={{ scale: 0.98 }}
              >
                Sign In
              </motion.button>
            </motion.div>
          </form>

          {/* Back link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            style={{ textAlign: 'center', marginTop: '1.25rem' }}
          >
            <a
              href="http://localhost:5173"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                color: 'var(--clr-text-muted)',
                fontSize: '0.85rem',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--clr-accent)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--clr-text-muted)')
              }
            >
              <ArrowLeft size={14} />
              Back to SoleIQ.com
            </a>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
