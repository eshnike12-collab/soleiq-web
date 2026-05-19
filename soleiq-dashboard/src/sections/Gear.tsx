import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Footprints, Zap } from 'lucide-react';
import { useUser } from '../context/UserContext';

function AddDeviceModal({ onClose }: { onClose: () => void }) {
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
        style={{ padding: '2rem', width: '100%', maxWidth: '420px', textAlign: 'center' }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔌</div>
        <h2 className="font-syne" style={{ fontSize: '1.25rem', color: 'var(--clr-text)', marginBottom: '0.75rem' }}>
          Connect Therapy Pods
        </h2>
        <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
          To connect Therapy Pods, ensure they are charged and within 3 meters of your device.
        </p>
        <button className="btn-primary" onClick={onClose} style={{ width: '100%' }}>Close</button>
      </motion.div>
    </motion.div>
  );
}

function BatteryBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ flex: 1, height: '10px', borderRadius: '5px', background: 'var(--clr-border)', overflow: 'hidden' }}>
        <motion.div
          style={{ height: '100%', borderRadius: '5px', background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay: 0.3 }}
        />
      </div>
      <span style={{ color: 'var(--clr-text)', fontSize: '0.85rem', fontWeight: 600, flexShrink: 0 }}>{pct}%</span>
    </div>
  );
}

function SignalBars({ strength }: { strength: number }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '2px' }}>
      {[1, 2, 3, 4].map(bar => (
        <div key={bar} style={{
          width: '5px', borderRadius: '2px',
          height: `${bar * 4 + 4}px`,
          background: bar <= strength ? 'var(--clr-accent)' : 'var(--clr-border)',
        }} />
      ))}
    </div>
  );
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_SESSIONS = [true, true, false, true, true, true, false];

export default function Gear() {
  const { user } = useUser();
  const insole = user.devices.smartInsole;
  const pbm = user.devices.pbmSlipper;

  const [diagState, setDiagState] = useState<'idle' | 'running' | 'done'>('idle');
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);

  const handleDiag = () => {
    if (diagState !== 'idle') return;
    setDiagState('running');
    setTimeout(() => setDiagState('done'), 2000);
  };

  const lastSessionStr = pbm.lastSession.replace('T', ' ').replace(':00Z', '');

  const specRowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.45rem 0', borderBottom: '1px solid var(--clr-border)', gap: '0.75rem',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      <div>
        <h1 className="font-syne" style={{ fontSize: '1.75rem', color: 'var(--clr-text)', marginBottom: '0.4rem' }}>
          Your SoleIQ Devices
        </h1>
        <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.95rem' }}>
          3 devices registered · 2 connected
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

        {/* Card 1 — Smart Insole SI-3 */}
        <motion.div
          className="glass"
          style={{ padding: '1.5rem', position: 'relative' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Connected badge */}
          <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
            <span style={{
              background: 'rgba(78,205,196,0.15)', color: 'var(--clr-success)',
              border: '1px solid var(--clr-border)', borderRadius: '20px',
              padding: '0.2rem 0.75rem', fontSize: '0.78rem', fontWeight: 600,
            }}>
              ● Connected
            </span>
          </div>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1.25rem', paddingRight: '90px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
              background: 'rgba(78,205,196,0.15)', border: '1px solid var(--clr-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Footprints size={22} color="var(--clr-accent)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--clr-text)', fontSize: '1rem' }}>{insole.model}</div>
              <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.82rem' }}>Smart Insole</div>
            </div>
          </div>

          {/* Specs */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={specRowStyle}>
              <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.82rem' }}>Firmware</span>
              <span style={{ color: 'var(--clr-text)', fontSize: '0.85rem' }}>v{insole.firmwareVersion} ✓ Up to date</span>
            </div>
            <div style={specRowStyle}>
              <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.82rem' }}>Last Sync</span>
              <span style={{ color: 'var(--clr-text)', fontSize: '0.85rem' }}>Today at 7:42 AM</span>
            </div>
            <div style={specRowStyle}>
              <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.82rem' }}>Wear Today</span>
              <span style={{ color: 'var(--clr-text)', fontSize: '0.85rem' }}>
                {insole.wearTimeToday} hrs / {insole.wearTimeGoal} hr goal
              </span>
            </div>
            <div style={{ ...specRowStyle, borderBottom: 'none' }}>
              <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.82rem' }}>BLE Signal</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--clr-text)', fontSize: '0.82rem' }}>Strong</span>
                <SignalBars strength={4} />
              </div>
            </div>
          </div>

          {/* Battery */}
          <div style={{ background: 'var(--clr-surface-2)', borderRadius: '10px', padding: '0.9rem', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--clr-text)', fontSize: '0.85rem', marginBottom: '0.6rem' }}>
              Battery Status
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.78rem' }}>Left Insole</span>
              </div>
              <BatteryBar pct={insole.batteryLeft} color="var(--clr-accent)" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.78rem' }}>Right Insole</span>
              </div>
              <BatteryBar pct={insole.batteryRight} color="var(--clr-accent)" />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn-ghost"
              onClick={handleDiag}
              style={{ flex: 1 }}
            >
              {diagState === 'idle' && 'Run Diagnostics'}
              {diagState === 'running' && 'Running...'}
              {diagState === 'done' && '✅ All systems nominal'}
            </button>
            <button className="btn-ghost" style={{ flex: 1 }}>Firmware Info</button>
          </div>
        </motion.div>

        {/* Card 2 — PBM Therapy Slipper */}
        <motion.div
          className="glass"
          style={{ padding: '1.5rem', position: 'relative' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
            <span style={{
              background: 'rgba(78,205,196,0.15)', color: 'var(--clr-success)',
              border: '1px solid var(--clr-border)', borderRadius: '20px',
              padding: '0.2rem 0.75rem', fontSize: '0.78rem', fontWeight: 600,
            }}>
              ● Connected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1.25rem', paddingRight: '90px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,179,71,0.15)', border: '1px solid rgba(255,179,71,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={22} color="#FFB347" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--clr-text)', fontSize: '1rem' }}>{pbm.model}</div>
              <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.82rem' }}>Therapy Slipper</div>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={specRowStyle}>
              <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.82rem' }}>Last Session</span>
              <span style={{ color: 'var(--clr-text)', fontSize: '0.85rem' }}>{lastSessionStr}</span>
            </div>
            <div style={specRowStyle}>
              <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.82rem' }}>Sessions This Week</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--clr-text)', fontSize: '0.85rem' }}>
                  {pbm.totalSessionsThisWeek} / 7
                </span>
                <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: 'var(--clr-border)', overflow: 'hidden' }}>
                  <motion.div
                    style={{ height: '100%', borderRadius: '3px', background: '#FFB347' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(pbm.totalSessionsThisWeek / 7) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />
                </div>
              </div>
            </div>
            <div style={{ ...specRowStyle, borderBottom: 'none' }}>
              <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.82rem' }}>All-Time Sessions</span>
              <span style={{ color: 'var(--clr-text)', fontSize: '0.85rem' }}>{pbm.totalSessionsAllTime}</span>
            </div>
          </div>

          {/* Weekly adherence squares */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--clr-text)', fontSize: '0.82rem', marginBottom: '0.5rem' }}>
              This Week
            </div>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {WEEK_DAYS.map((day, i) => (
                <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '6px',
                    background: WEEK_SESSIONS[i] ? 'rgba(255,179,71,0.3)' : 'var(--clr-surface-2)',
                    border: `1px solid ${WEEK_SESSIONS[i] ? '#FFB347' : 'var(--clr-border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem',
                  }}>
                    {WEEK_SESSIONS[i] ? '✓' : '✗'}
                  </div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--clr-text-muted)' }}>{day}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-ghost" style={{ flex: 1, borderColor: '#FFB347', color: '#FFB347' }}>
              ▶ Start Session
            </button>
            <button className="btn-ghost" style={{ flex: 1 }}>Session History</button>
          </div>
        </motion.div>

        {/* Card 3 — PBM Therapy Pods (not connected) */}
        <motion.div
          className="glass"
          style={{ padding: '1.5rem', position: 'relative', opacity: 0.55, filter: 'grayscale(30%)' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 0.55, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
            <span style={{
              background: 'var(--clr-surface-2)', color: 'var(--clr-text-muted)',
              border: '1px solid var(--clr-border)', borderRadius: '20px',
              padding: '0.2rem 0.75rem', fontSize: '0.78rem', fontWeight: 600,
            }}>
              ○ Not Connected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1.25rem', paddingRight: '110px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
              background: 'var(--clr-surface-2)', border: '1px solid var(--clr-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={22} color="var(--clr-text-muted)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--clr-text)', fontSize: '1rem' }}>SoleIQ Therapy Pods</div>
              <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.82rem' }}>Targeted Zone Treatment</div>
            </div>
          </div>

          <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: '1.25rem' }}>
            Connect your Therapy Pods to enable targeted zone treatment with precision placement at specific risk zones.
          </p>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setAddDeviceOpen(true)}
            className="btn-primary"
            style={{ width: '100%', opacity: 1, filter: 'none' }}
          >
            + Add Device
          </motion.button>
        </motion.div>
      </div>

      {/* Shop Link Card */}
      <motion.div
        className="glass"
        style={{
          padding: '1.5rem',
          background: 'linear-gradient(135deg, var(--clr-surface) 0%, rgba(78,205,196,0.08) 100%)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div>
          <div className="font-syne" style={{ fontSize: '1.1rem', color: 'var(--clr-text)', fontWeight: 700, marginBottom: '0.3rem' }}>
            Expand Your SoleIQ Ecosystem
          </div>
          <div style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem' }}>
            Add Therapy Pods, replacement insoles, and accessories
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary"
        >
          Visit SoleIQ Shop →
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {addDeviceOpen && <AddDeviceModal onClose={() => setAddDeviceOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
