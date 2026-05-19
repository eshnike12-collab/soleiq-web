import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../context/UserContext';

function MessageModal({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="glass"
        style={{ padding: '2rem', width: '100%', maxWidth: '480px' }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <h2 className="font-syne" style={{ fontSize: '1.25rem', color: 'var(--clr-text)', marginBottom: '1rem' }}>
          Message Dr. James Reyes
        </h2>
        <textarea
          value={message}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
          className="input-field"
          style={{ minHeight: '120px', resize: 'vertical', marginBottom: '1rem' }}
          placeholder="Type your message..."
        />
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <button
            className="btn-primary"
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
            disabled
            title="Feature coming in v2.0"
          >
            Send — Coming in v2.0
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Alerts() {
  const { user } = useUser();
  const careTeam = user.therapyProtocol.careTeam;

  const [alert1Ack, setAlert1Ack] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);

  const milestones = [
    { label: 'Day 1', active: false, past: true },
    { label: 'Day 4\n(now)', active: true, past: false },
    { label: 'Day 7', active: false, past: false },
    { label: 'Auto-escalation', active: false, past: false },
    { label: 'Dr. Review', active: false, past: false },
    { label: 'Intervention', active: false, past: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      <div>
        <h1 className="font-syne" style={{ fontSize: '1.75rem', color: 'var(--clr-text)' }}>
          Alerts &amp; Clinical Oversight
        </h1>
      </div>

      {/* Active Alerts Panel */}
      <motion.div
        className="glass"
        style={{ padding: '1.5rem' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h2 className="font-syne" style={{ fontSize: '1.1rem', color: 'var(--clr-text)', marginBottom: '1rem' }}>
          Active Alerts (2)
        </h2>

        {/* Alert Card 1 — WATCH */}
        <motion.div
          style={{
            borderLeft: '4px solid #FFB347',
            background: 'rgba(255,179,71,0.08)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1rem',
          }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ color: '#FFB347', fontWeight: 700, fontSize: '0.85rem' }}>
              ⚠️ WATCH
            </span>
            <span style={{ color: 'var(--clr-text)', fontWeight: 600, fontSize: '1rem' }}>
              Temperature Asymmetry: 2.1°C
            </span>
          </div>
          <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: '0.85rem' }}>
            Right 1st metatarsal ΔT has been at or above watch threshold (2.0°C) for 4 consecutive days.
            Trigger for automatic escalation: 7 days at ΔT &gt;2.0°C OR ΔT &gt;2.5°C at any reading.
          </p>

          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ color: '#FFB347', fontSize: '0.82rem', fontWeight: 600 }}>Days until auto-escalation: 3</span>
              <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.82rem' }}>4 / 7 days</span>
            </div>
            <div className="progress-bar">
              <motion.div
                style={{ height: '100%', borderRadius: '3px', background: '#FFB347' }}
                initial={{ width: 0 }}
                animate={{ width: '57%' }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-ghost" style={{ borderColor: '#FFB347', color: '#FFB347' }}>
              View on Sole Map
            </button>
            {alert1Ack ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                color: 'var(--clr-success)', fontSize: '0.875rem', fontWeight: 600,
                padding: '0.5rem 1rem',
              }}>
                ✅ Acknowledged
              </span>
            ) : (
              <button className="btn-ghost" onClick={() => setAlert1Ack(true)}>
                I'm Managing This
              </button>
            )}
          </div>
        </motion.div>

        {/* Alert Card 2 — INFO */}
        <motion.div
          style={{
            borderLeft: '4px solid var(--clr-accent)',
            background: 'rgba(78,205,196,0.08)',
            borderRadius: '12px',
            padding: '1.25rem',
          }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--clr-accent)', fontWeight: 700, fontSize: '0.85rem' }}>ℹ️ INFO</span>
            <span style={{ color: 'var(--clr-text)', fontWeight: 600, fontSize: '1rem' }}>
              Tonight's PBM Session Due
            </span>
          </div>
          <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: '0.85rem' }}>
            Your 30-minute session is due tonight. 11-day streak active. Consistent adherence correlates with your
            improving risk trend.
          </p>
          <button className="btn-ghost" style={{ borderColor: 'var(--clr-accent)', color: 'var(--clr-accent)' }}>
            ▶ Start Session
          </button>
        </motion.div>
      </motion.div>

      {/* Care Team Section */}
      <motion.div
        className="glass"
        style={{ padding: '1.5rem' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h2 className="font-syne" style={{ fontSize: '1.1rem', color: 'var(--clr-text)', marginBottom: '1rem' }}>
          Your Care Team
        </h2>

        {/* Provider card */}
        <div style={{
          display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap',
          background: 'var(--clr-surface-2)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem',
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
            background: 'rgba(78,205,196,0.2)', border: '2px solid var(--clr-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '1.1rem', color: 'var(--clr-accent)',
          }}>
            JR
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--clr-text)', fontSize: '1.05rem' }}>
              Dr. James Reyes, DPM
            </div>
            <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Primary Podiatrist
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1rem' }}>
              {[
                ['Last review', careTeam.lastClinicalReview],
                ['Next appointment', 'April 18, 2026 ← 21 days away'],
                ['Escalation threshold', careTeam.nextEscalationTrigger],
              ].map(([label, val], i) => (
                <div key={i} style={{ gridColumn: i === 2 ? '1 / -1' : 'auto' }}>
                  <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.78rem' }}>{label}</div>
                  <div style={{ color: 'var(--clr-text)', fontSize: '0.85rem', fontWeight: 500 }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <span style={{
                background: 'rgba(78,205,196,0.15)', color: 'var(--clr-success)',
                border: '1px solid var(--clr-border)', borderRadius: '20px',
                padding: '0.2rem 0.75rem', fontSize: '0.78rem', fontWeight: 600,
              }}>
                ✅ {careTeam.escalationStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Escalation Timeline */}
        <h3 style={{ color: 'var(--clr-text)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>
          Escalation Timeline
        </h3>
        <div style={{ overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: '480px', position: 'relative' }}>
            {milestones.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {/* Connecting line */}
                {i < milestones.length - 1 && (
                  <div style={{
                    position: 'absolute', top: '10px', left: '50%', width: '100%',
                    height: '2px', background: m.past || m.active ? '#FFB347' : 'var(--clr-border)',
                    zIndex: 0,
                  }} />
                )}
                {/* Dot */}
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', zIndex: 1,
                  background: m.active ? '#FFB347' : m.past ? 'rgba(255,179,71,0.3)' : 'var(--clr-surface-2)',
                  border: `2px solid ${m.active ? '#FFB347' : m.past ? 'rgba(255,179,71,0.5)' : 'var(--clr-border)'}`,
                  boxShadow: m.active ? '0 0 10px rgba(255,179,71,0.5)' : 'none',
                  flexShrink: 0,
                }} />
                {/* Label */}
                <div style={{
                  marginTop: '0.5rem', fontSize: '0.72rem', textAlign: 'center',
                  color: m.active ? '#FFB347' : m.past ? 'var(--clr-text-muted)' : 'var(--clr-border)',
                  whiteSpace: 'pre-line', lineHeight: 1.3,
                }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message button */}
        <button
          className="btn-ghost"
          onClick={() => setMessageOpen(true)}
          style={{ borderColor: 'var(--clr-accent)', color: 'var(--clr-accent)' }}
        >
          ✉️ Message Care Team
        </button>
      </motion.div>

      {/* Alert History Table */}
      <motion.div
        className="glass"
        style={{ padding: '1.5rem' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <h2 className="font-syne" style={{ fontSize: '1.1rem', color: 'var(--clr-text)', marginBottom: '1rem' }}>
          Alert History
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                {['Date', 'Trigger', 'Outcome'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '0.6rem 0.75rem',
                    color: 'var(--clr-text-muted)', fontWeight: 600, fontSize: '0.8rem',
                    borderBottom: '2px solid var(--clr-border)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { date: '2026-02-14', trigger: 'Clinical review (routine)', outcome: 'Reviewed, no escalation' },
                { date: '2026-01-08', trigger: 'ΔT >2.5°C for 8 days', outcome: 'Care team notified, protocol adjusted' },
                { date: '2025-11-20', trigger: 'Risk score >80', outcome: 'Dr. Reyes consultation scheduled' },
              ].map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(78,205,196,0.04)' }}>
                  <td style={{ padding: '0.7rem 0.75rem', color: 'var(--clr-text-muted)', whiteSpace: 'nowrap' }}>{row.date}</td>
                  <td style={{ padding: '0.7rem 0.75rem', color: 'var(--clr-text)' }}>{row.trigger}</td>
                  <td style={{ padding: '0.7rem 0.75rem', color: 'var(--clr-text-muted)' }}>{row.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      <AnimatePresence>
        {messageOpen && <MessageModal onClose={() => setMessageOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
