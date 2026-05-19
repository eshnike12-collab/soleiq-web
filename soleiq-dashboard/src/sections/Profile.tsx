import { useState } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
        background: on ? 'var(--clr-accent)' : 'var(--clr-surface-2)',
        position: 'relative', transition: 'background 0.25s ease',
        border: '1px solid var(--clr-border)', flexShrink: 0,
      }}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        style={{
          width: '18px', height: '18px', borderRadius: '50%',
          background: on ? '#0D2B3E' : 'var(--clr-text-muted)',
          position: 'absolute', top: '2px',
          left: on ? '22px' : '2px',
        }}
      />
    </div>
  );
}

export default function Profile() {
  const { user } = useUser();
  const med = user.medicalProfile;
  const sub = user.subscription;
  const insole = user.devices.smartInsole;

  const [notifToggles, setNotifToggles] = useState({
    sessionReminders: true,
    riskAlerts: true,
    weeklySummary: true,
    careTeamMessages: false,
  });
  const [wearGoal, setWearGoal] = useState(insole.wearTimeGoal);
  const [sessionTime, setSessionTime] = useState('20:00');
  const [language, setLanguage] = useState('English');
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof typeof notifToggles) => {
    setNotifToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hba1cPct = (med.hba1c / 10) * 100;
  const targetPct = (7.0 / 10) * 100;

  const infoRows: [string, string][] = [
    ['Full Name', `${user.firstName} ${user.lastName}`],
    ['Age', String(med.age)],
    ['Gender', med.gender],
    ['Diabetes Type', med.diabetesType],
    ['Diagnosed', `${med.diagnosedYear} (${new Date().getFullYear() - med.diagnosedYear} years)`],
    ['Neuropathy Stage', `${med.neuropathyStage} (Stage 2)`],
    ['Vascular Risk', med.vascularRisk],
    ['BMI', String(med.bmi)],
    ['Primary Provider', med.primaryCareProvider],
    ['Last Visit', med.lastClinicVisit],
    ['Next Visit', med.nextClinicVisit],
  ];

  const timeOptions: string[] = [];
  for (let h = 6; h <= 22; h++) {
    timeOptions.push(`${String(h).padStart(2, '0')}:00`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      <div>
        <h1 className="font-syne" style={{ fontSize: '1.75rem', color: 'var(--clr-text)', marginBottom: '0.4rem' }}>
          Your Health Profile
        </h1>
        <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.95rem' }}>
          {user.firstName} {user.lastName} — Member since September 2024
        </p>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: '1.5rem', flexWrap: 'wrap' as const }}>

          {/* Left Column — Medical Profile */}
          <motion.div
            className="glass"
            style={{ borderLeft: '4px solid var(--clr-accent)', padding: '1.5rem' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <h2 className="font-syne" style={{ fontSize: '1.1rem', color: 'var(--clr-text)', marginBottom: '1rem' }}>
              Medical Information
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem 1rem', marginBottom: '1.25rem' }}>
              {infoRows.map(([label, val], i) => (
                <div key={i} style={{ gridColumn: label === 'Primary Provider' || label === 'Escalation Threshold' ? '1 / -1' : 'auto' }}>
                  <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.75rem', marginBottom: '0.1rem' }}>{label}</div>
                  <div style={{ color: 'var(--clr-text)', fontSize: '0.88rem', fontWeight: 500 }}>{val}</div>
                </div>
              ))}
            </div>

            {/* HbA1c gauge */}
            <div style={{ background: 'var(--clr-surface-2)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--clr-text)', fontSize: '0.9rem', fontWeight: 600 }}>HbA1c: {med.hba1c}%</span>
                <span style={{ color: 'var(--clr-success)', fontSize: '0.8rem' }}>Target: &lt;7.0%</span>
              </div>
              <div style={{ position: 'relative', height: '10px', borderRadius: '5px', background: 'var(--clr-border)', marginBottom: '0.4rem' }}>
                {/* Target marker */}
                <div style={{
                  position: 'absolute', top: '-3px', left: `${targetPct}%`, width: '2px', height: '16px',
                  background: '#4ECDC4', borderRadius: '2px',
                }} />
                {/* Current marker */}
                <motion.div
                  style={{
                    position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: '5px',
                    background: '#FFB347',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${hba1cPct}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--clr-success)' }}>Target: &lt;7.0%</span>
                <span style={{ color: '#FFB347' }}>Current: {med.hba1c}% — Above Target</span>
              </div>
            </div>

            {/* Medications */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ color: 'var(--clr-text)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Medications</div>
              {med.medications.map((m, i) => (
                <div key={i} style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', padding: '0.15rem 0' }}>
                  • {m}
                </div>
              ))}
              <div style={{ marginTop: '0.5rem', color: 'var(--clr-text-muted)', fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--clr-text)' }}>Allergies:</span> {med.allergies.join(', ')}
              </div>
            </div>

            {/* Foot History */}
            <div style={{
              background: 'rgba(255,107,107,0.07)', border: '1px solid rgba(255,107,107,0.3)',
              borderRadius: '10px', padding: '1rem',
            }}>
              <div style={{ fontWeight: 700, color: 'var(--clr-danger)', fontSize: '0.9rem', marginBottom: '0.6rem' }}>
                ⚠️ Foot History
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--clr-text-muted)', lineHeight: 1.7 }}>
                <div><span style={{ color: 'var(--clr-text)' }}>Prior DFU:</span> Yes — {med.footHistory.priorDFUSite} (healed)</div>
                <div><span style={{ color: 'var(--clr-text)' }}>Prior Amputations:</span> None</div>
                <div><span style={{ color: 'var(--clr-text)' }}>Calluses:</span> {med.footHistory.calluses}</div>
              </div>
            </div>
          </motion.div>

          {/* Right Column — Preferences */}
          <motion.div
            className="glass"
            style={{ padding: '1.5rem' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h2 className="font-syne" style={{ fontSize: '1.1rem', color: 'var(--clr-text)', marginBottom: '1.1rem' }}>
              My Preferences
            </h2>

            {/* Notification toggles */}
            <div style={{ marginBottom: '1.5rem' }}>
              {([
                ['sessionReminders', 'Session Reminders'],
                ['riskAlerts', 'Risk Alerts'],
                ['weeklySummary', 'Weekly Summary'],
                ['careTeamMessages', 'Care Team Messages'],
              ] as [keyof typeof notifToggles, string][]).map(([key, label]) => (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.6rem 0', borderBottom: '1px solid var(--clr-border)',
                }}>
                  <span style={{ color: 'var(--clr-text)', fontSize: '0.875rem' }}>{label}</span>
                  <Toggle on={notifToggles[key]} onToggle={() => toggle(key)} />
                </div>
              ))}
            </div>

            {/* Wear time goal slider */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--clr-text)', fontSize: '0.875rem', fontWeight: 600 }}>
                  Target Wear Time
                </span>
                <span style={{ color: 'var(--clr-accent)', fontWeight: 700, fontSize: '0.9rem' }}>
                  {wearGoal} hrs/day
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.75rem' }}>6h</span>
                <input
                  type="range" min={6} max={12} step={0.5} value={wearGoal}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWearGoal(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--clr-accent)', cursor: 'pointer' }}
                />
                <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.75rem' }}>12h</span>
              </div>
            </div>

            {/* Preferred session time */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ color: 'var(--clr-text)', fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                Preferred Session Time
              </label>
              <select
                value={sessionTime}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSessionTime(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.875rem' }}
              >
                {timeOptions.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ color: 'var(--clr-text)', fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                Language
              </label>
              <select
                value={language}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLanguage(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.875rem' }}
              >
                {['English', 'Spanish', 'French', 'Portuguese', 'Mandarin'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              className="btn-primary"
              style={{ width: '100%' }}
            >
              {saved ? '✅ Saved!' : 'Save Preferences'}
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Subscription Card */}
      <motion.div
        className="glass"
        style={{
          padding: '1.5rem',
          background: 'linear-gradient(135deg, var(--clr-surface) 0%, rgba(26,74,92,0.6) 100%)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem',
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span className="font-syne" style={{ fontSize: '1.4rem', color: 'var(--clr-text)', fontWeight: 700 }}>
              SoleIQ Pro
            </span>
            <span style={{
              background: 'rgba(78,205,196,0.15)', color: 'var(--clr-success)',
              borderRadius: '20px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 600,
              border: '1px solid var(--clr-border)',
            }}>
              Active
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {sub.devices.map(d => (
              <span key={d} style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem' }}>
                ✓ {d}
              </span>
            ))}
          </div>
          <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.82rem' }}>
            Renewal: September 15, 2026
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-ghost">Manage Subscription</button>
          <button className="btn-ghost">Contact Support</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
