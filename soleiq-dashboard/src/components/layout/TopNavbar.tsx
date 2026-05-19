import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Sun, Moon, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import { useDashboard } from '../../context/DashboardContext';

function SoleIQLogo({ size = 36 }: { size?: number }) {
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

const STATIC_ALERTS = [
  {
    severity: 'Watch',
    title: 'Temperature Asymmetry: 2.1°C',
    timestamp: 'Today 7:42 AM',
  },
  {
    severity: 'Info',
    title: 'PBM Session Due Tonight',
    timestamp: 'Today 6:00 AM',
  },
];

export default function TopNavbar() {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useUser();
  const { setActiveSection } = useDashboard();
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        zIndex: 50,
        background: 'rgba(13, 43, 62, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--clr-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
      }}
    >
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <SoleIQLogo size={34} />
          <span
            className="font-syne"
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--clr-accent)',
              letterSpacing: '0.08em',
            }}
          >
            SOLEIQ
          </span>
        </div>
        <span
          style={{
            width: '1px',
            height: '20px',
            background: 'var(--clr-border)',
            display: 'block',
          }}
        />
        <a
          href="http://localhost:5173"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.8rem',
            color: 'var(--clr-text-muted)',
            textDecoration: 'none',
            padding: '0.3rem 0.7rem',
            borderRadius: '8px',
            border: '1px solid var(--clr-border)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--clr-accent)';
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--clr-accent)';
            (e.currentTarget as HTMLAnchorElement).style.background = 'var(--clr-glow)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--clr-text-muted)';
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--clr-border)';
            (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
          }}
        >
          <ArrowLeft size={13} />
          Back to SoleIQ.com
        </a>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Notification bell */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setNotifOpen((o) => !o)}
            style={{
              background: 'transparent',
              border: '1px solid var(--clr-border)',
              borderRadius: '8px',
              padding: '0.45rem',
              cursor: 'pointer',
              color: 'var(--clr-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Bell size={18} />
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#D97706',
                color: '#fff',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                fontSize: '0.65rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              2
            </span>
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '320px',
                  background: 'var(--clr-surface)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: '14px',
                  padding: '1rem',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
                  zIndex: 100,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                  }}
                >
                  <span
                    className="font-syne"
                    style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--clr-text)' }}
                  >
                    Notifications
                  </span>
                  <button
                    onClick={() => setNotifOpen(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--clr-text-muted)',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>

                {STATIC_ALERTS.map((alert, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '10px',
                      background: 'var(--clr-surface-2)',
                      marginBottom: i < STATIC_ALERTS.length - 1 ? '0.5rem' : '0.75rem',
                      border: '1px solid var(--clr-border)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.25rem',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '20px',
                          background:
                            alert.severity === 'Watch'
                              ? 'rgba(255,179,71,0.15)'
                              : 'rgba(78,205,196,0.15)',
                          color: alert.severity === 'Watch' ? 'var(--clr-warning)' : 'var(--clr-accent)',
                        }}
                      >
                        {alert.severity === 'Watch' ? '⚠️' : 'ℹ️'} {alert.severity}
                      </span>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: 'var(--clr-text)',
                        }}
                      >
                        {alert.title}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--clr-text-muted)',
                        lineHeight: 1.4,
                      }}
                    >
                      {alert.timestamp}
                    </p>
                  </div>
                ))}

                <button
                  onClick={() => {
                    setActiveSection('alerts');
                    setNotifOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'transparent',
                    border: '1px solid var(--clr-border)',
                    borderRadius: '8px',
                    color: 'var(--clr-accent)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--clr-glow)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  View all alerts →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme toggle */}
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            background: 'transparent',
            border: '1px solid var(--clr-border)',
            borderRadius: '8px',
            padding: '0.45rem',
            cursor: 'pointer',
            color: 'var(--clr-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </motion.button>

        {/* Avatar */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(78, 205, 196, 0.2)',
            border: '1px solid var(--clr-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--clr-accent)',
            cursor: 'pointer',
            fontFamily: 'Syne, sans-serif',
          }}
        >
          {user.avatarInitials}
        </div>
      </div>
    </header>
  );
}
