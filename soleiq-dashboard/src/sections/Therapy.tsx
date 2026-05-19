import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useUser } from '../context/UserContext';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const projectedData = [
  { week: 'Now',   actual: 68,   projected: 68 },
  { week: 'Wk 2',  actual: 66,   projected: 63 },
  { week: 'Wk 4',  actual: null, projected: 58 },
  { week: 'Wk 6',  actual: null, projected: 54 },
  { week: 'Wk 8',  actual: null, projected: 50 },
];

function getRiskLabel(score: number): { emoji: string; color: string; text: string } {
  if (score <= 39) return { emoji: '🟢', color: '#4ECDC4', text: 'Low Risk — 3x/week PBM, 15-minute sessions. No activity restriction. Maintenance mode.' };
  if (score <= 59) return { emoji: '🟡', color: '#F0E000', text: 'Moderate Risk — 5x/week PBM, 20-minute sessions. Limit steps on high-pressure days.' };
  if (score <= 75) return { emoji: '🟠', color: '#FFB347', text: 'Elevated Risk (Current) — Daily 30-min PBM, avoid >5,000 steps. Monitor temperature asymmetry.' };
  if (score <= 89) return { emoji: '🔴', color: '#FF6B6B', text: 'High Risk — Daily 45-min PBM, automatic care team notification, urgent clinic review.' };
  return { emoji: '🚨', color: '#FF2222', text: 'CRITICAL — Immediate escalation to Dr. Reyes. Emergency protocol activated.' };
}

function SessionTimerModal({ onClose }: { onClose: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(1800);
  const [isPaused, setIsPaused] = useState(false);
  const [completed, setCompleted] = useState(false);

  const totalSeconds = 1800;
  const elapsed = totalSeconds - secondsLeft;
  const progress = elapsed / totalSeconds;

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  let phase = '🌡️ Warming up...';
  if (elapsed >= 300 && elapsed < 1500) phase = '💡 Active therapy — 660nm + 850nm';
  if (elapsed >= 1500) phase = '❄️ Cooldown...';

  useEffect(() => {
    if (isPaused || completed) return;
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          setCompleted(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, completed]);

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
        <h2 className="font-syne" style={{ fontSize: '1.5rem', color: 'var(--clr-accent)', marginBottom: '0.5rem' }}>
          PBM Session Active
        </h2>
        {completed ? (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ fontSize: '3rem' }}>✅</div>
            <p style={{ color: 'var(--clr-text)', fontSize: '1.1rem', marginTop: '1rem' }}>
              Session Complete! Great work on your 12-day streak!
            </p>
            <button className="btn-primary" style={{ marginTop: '1.5rem', width: '100%' }} onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{
              fontSize: '3.5rem', fontFamily: 'monospace', color: 'var(--clr-text)',
              fontWeight: 700, margin: '1rem 0',
            }}>
              {timeStr}
            </div>
            <p style={{ color: 'var(--clr-text-muted)', marginBottom: '1.25rem' }}>{phase}</p>
            <div className="progress-bar" style={{ marginBottom: '1.5rem' }}>
              <motion.div
                className="progress-fill"
                style={{ background: 'var(--clr-accent)' }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setIsPaused(p => !p)}>
                {isPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
              <button
                className="btn-ghost"
                style={{ flex: 1, color: 'var(--clr-danger)', borderColor: 'var(--clr-danger)' }}
                onClick={onClose}
              >
                ■ Stop
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function Therapy() {
  const { user } = useUser();
  const protocol = user.therapyProtocol.pbmProtocol;
  const offloading = user.therapyProtocol.offloadingProtocol;

  const [showRationale, setShowRationale] = useState(false);
  const [showOffloadRationale, setShowOffloadRationale] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sliderRisk, setSliderRisk] = useState(68);

  const riskInfo = getRiskLabel(sliderRisk);

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid var(--clr-border)',
    gap: '1rem',
    flexWrap: 'wrap' as const,
  };
  const labelStyle: React.CSSProperties = { color: 'var(--clr-text-muted)', fontSize: '0.875rem', flexShrink: 0 };
  const valueStyle: React.CSSProperties = { color: 'var(--clr-text)', fontSize: '0.9rem', fontWeight: 500, textAlign: 'right' as const };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
    >
      <div>
        <h1 className="font-syne" style={{ fontSize: '1.75rem', color: 'var(--clr-text)', marginBottom: '0.4rem' }}>
          Your Personalized Treatment Protocol
        </h1>
        <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.95rem' }}>
          Generated by SoleIQ AI for Margaret Torres — Type 2 Diabetes | Moderate Neuropathy | Risk Score: 68
        </p>
      </div>

      {/* Panel A: Photobiomodulation Protocol */}
      <motion.div
        className="glass"
        style={{ borderLeft: '4px solid var(--clr-accent)', padding: '1.5rem' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="font-syne" style={{ fontSize: '1.2rem', color: 'var(--clr-text)' }}>
            Red Light Therapy — Your Protocol
          </h2>
          <span style={{
            background: 'rgba(255,179,71,0.15)', color: '#FFB347', border: '1px solid #FFB347',
            borderRadius: '20px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 600,
          }}>
            🔥 {protocol.streakDays}-day streak
          </span>
        </div>

        <div style={{ background: 'var(--clr-surface-2)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <div style={rowStyle}>
            <span style={labelStyle}>Session Duration:</span>
            <span style={valueStyle}>
              {protocol.sessionDuration} minutes{' '}
              <span style={{
                background: 'rgba(78,205,196,0.15)', color: 'var(--clr-accent)',
                borderRadius: '6px', padding: '0.15rem 0.45rem', fontSize: '0.72rem', fontWeight: 700, marginLeft: '0.5rem',
              }}>AI RECOMMENDED</span>
            </span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Frequency:</span>
            <span style={valueStyle}>Daily (7x/week)</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Wavelength Mode:</span>
            <span style={valueStyle}>Combined — 660nm Red + 850nm NIR</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Heat Level:</span>
            <span style={valueStyle}>{protocol.heatLevel}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Primary Target:</span>
            <span style={valueStyle}>
              {protocol.targetZones[0]}{' '}
              <span style={{
                background: 'rgba(255,107,107,0.2)', color: 'var(--clr-danger)',
                borderRadius: '6px', padding: '0.15rem 0.45rem', fontSize: '0.72rem', fontWeight: 700,
              }}>HIGH</span>
            </span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Secondary Target:</span>
            <span style={valueStyle}>{protocol.targetZones[1]}</span>
          </div>
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <span style={labelStyle}>Next Session:</span>
            <span style={valueStyle}>{protocol.nextSession}</span>
          </div>
        </div>

        <button
          onClick={() => setShowRationale(r => !r)}
          style={{
            background: 'none', border: '1px solid var(--clr-border)', borderRadius: '8px',
            color: 'var(--clr-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center',
            gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem', marginBottom: '0.75rem',
          }}
        >
          {showRationale ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Why this protocol?
        </button>

        <AnimatePresence>
          {showRationale && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                background: 'rgba(78,205,196,0.06)', border: '1px solid var(--clr-border)',
                borderRadius: '10px', padding: '1rem', marginBottom: '1rem',
                color: 'var(--clr-text-muted)', fontSize: '0.88rem', lineHeight: 1.7,
              }}>
                Your risk score of 68 with moderate peripheral neuropathy indicates compromised mitochondrial function
                in the right forefoot — the primary target of PBM's cytochrome c oxidase (CCO) mechanism. At 660nm,
                surface inflammation and microcirculation in the 1st metatarsal zone are directly addressed. The 850nm
                NIR component penetrates 5-10mm to stimulate deeper fibroblast activation and nerve tissue recovery —
                critical given your Stage 2 neuropathy. A 30-minute session at medium heat delivers approximately
                2.5 J/cm² — within the optimal therapeutic window (1-4 J/cm²) identified in the 2025 JAAD consensus
                for DFU-risk patients.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <h3 style={{ color: 'var(--clr-text)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Expected Outcomes Timeline
        </h3>
        {[
          { range: 'Week 1-2', text: 'Mild circulation improvement, possible 5-10% pain reduction', pct: 15 },
          { range: 'Week 3-4', text: 'Temperature asymmetry expected to trend toward <1.5°C', pct: 45 },
          { range: 'Week 6-8', text: 'Risk score projected at 50-58 with continued adherence', pct: 75 },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', flexWrap: 'wrap', gap: '0.25rem' }}>
              <span style={{ color: 'var(--clr-accent)', fontSize: '0.82rem', fontWeight: 600 }}>{item.range}</span>
              <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.82rem' }}>{item.text}</span>
            </div>
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${item.pct}%` }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.15 }}
              />
            </div>
          </div>
        ))}

        <h3 style={{ color: 'var(--clr-text)', fontSize: '0.95rem', fontWeight: 600, margin: '1.25rem 0 0.75rem' }}>
          Progress vs Expected
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={projectedData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <XAxis dataKey="week" tick={{ fill: '#7EC8C0', fontSize: 12 }} />
            <YAxis domain={[45, 75]} tick={{ fill: '#7EC8C0', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
                borderRadius: '8px', color: 'var(--clr-text)',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }} />
            <Line
              type="monotone" dataKey="actual" stroke="#4ECDC4" strokeWidth={2}
              dot={{ fill: '#4ECDC4', r: 4 }} name="Actual" connectNulls={false}
            />
            <Line
              type="monotone" dataKey="projected" stroke="#FFB347" strokeWidth={2}
              strokeDasharray="5 5" dot={false} name="Projected"
            />
          </LineChart>
        </ResponsiveContainer>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSessionOpen(true)}
          style={{
            width: '100%', marginTop: '1.25rem', padding: '0.9rem',
            background: 'var(--clr-accent)', color: '#0D2B3E', border: 'none',
            borderRadius: '12px', fontFamily: 'DM Sans, sans-serif', fontWeight: 700,
            fontSize: '1rem', cursor: 'pointer',
            boxShadow: '0 0 20px rgba(78,205,196,0.4)',
          }}
        >
          ▶ Start 30-Min Session Now
        </motion.button>
      </motion.div>

      {/* Panel B: Offloading Protocol */}
      <motion.div
        className="glass"
        style={{ borderLeft: '4px solid var(--clr-accent-2)', padding: '1.5rem' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h2 className="font-syne" style={{ fontSize: '1.2rem', color: 'var(--clr-text)', marginBottom: '1.25rem' }}>
          Smart Insole + Offloading Configuration
        </h2>

        <div style={{ background: 'var(--clr-surface-2)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          {[
            { label: 'Primary Offload Zone:', value: 'Right forefoot (Met 1-2)' },
            { label: 'Insole Config:', value: 'High-density GEL — Right Met 1-2 / Standard cushion — bilateral heels' },
            { label: 'Activity Recommendation:', value: 'Rest if steps > 5,000 today' },
            { label: 'Footwear:', value: 'Extra-depth therapeutic, rocker sole' },
          ].map((item, i, arr) => (
            <div key={i} style={{ ...rowStyle, borderBottom: i < arr.length - 1 ? '1px solid var(--clr-border)' : 'none' }}>
              <span style={labelStyle}>{item.label}</span>
              <span style={valueStyle}>{item.value}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <svg width="100" height="180" viewBox="0 0 100 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <style>{`
              @keyframes flow {
                0% { opacity: 0; transform: translateX(0); }
                50% { opacity: 1; }
                100% { opacity: 0; transform: translateX(8px); }
              }
              .arr1 { animation: flow 2s ease-in-out infinite; animation-delay: 0s; }
              .arr2 { animation: flow 2s ease-in-out infinite; animation-delay: 0.4s; }
              .arr3 { animation: flow 2s ease-in-out infinite; animation-delay: 0.8s; }
              .arr4 { animation: flow 2s ease-in-out infinite; animation-delay: 1.2s; }
            `}</style>
            <defs>
              <marker id="ah" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#3B82F6" />
              </marker>
            </defs>
            <path
              d="M35 160 C20 150 15 130 15 110 C15 85 18 60 20 45 C22 32 28 20 35 18 C40 16 45 18 50 20 C55 22 60 22 65 25 C72 28 78 36 80 48 C82 58 80 68 75 75 C82 82 85 95 83 108 C80 122 72 135 65 148 C60 158 50 166 40 165 Z"
              fill="rgba(26,74,92,0.5)"
              stroke="rgba(78,205,196,0.4)"
              strokeWidth="1.5"
            />
            <ellipse cx="38" cy="38" rx="12" ry="16" fill="rgba(59,130,246,0.3)" stroke="#3B82F6" strokeWidth="1.5" />
            <path className="arr1" d="M55 35 L70 30" stroke="#3B82F6" strokeWidth="1.5" markerEnd="url(#ah)" />
            <path className="arr2" d="M38 58 L38 75" stroke="#3B82F6" strokeWidth="1.5" markerEnd="url(#ah)" />
            <path className="arr3" d="M28 45 L15 50" stroke="#3B82F6" strokeWidth="1.5" markerEnd="url(#ah)" />
            <path className="arr4" d="M48 50 L62 58" stroke="#3B82F6" strokeWidth="1.5" markerEnd="url(#ah)" />
            <text x="50" y="42" fill="#3B82F6" fontSize="7" fontFamily="DM Sans, sans-serif">Met 1-2</text>
          </svg>
        </div>

        <button
          onClick={() => setShowOffloadRationale(r => !r)}
          style={{
            background: 'none', border: '1px solid var(--clr-border)', borderRadius: '8px',
            color: 'var(--clr-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center',
            gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem',
          }}
        >
          {showOffloadRationale ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Why this configuration?
        </button>
        <AnimatePresence>
          {showOffloadRationale && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                background: 'rgba(59,130,246,0.06)', border: '1px solid var(--clr-border)',
                borderRadius: '10px', padding: '1rem', marginTop: '0.75rem',
                color: 'var(--clr-text-muted)', fontSize: '0.88rem', lineHeight: 1.7,
              }}>
                {offloading.rationale}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Panel C: Adaptive Protocol Simulation */}
      <motion.div
        className="glass"
        style={{ padding: '1.5rem' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <h2 className="font-syne" style={{ fontSize: '1.2rem', color: 'var(--clr-text)', marginBottom: '1rem' }}>
          What Changes If Your Risk Changes?
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', flexShrink: 0 }}>0</span>
          <input
            type="range" min={0} max={100} value={sliderRisk}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSliderRisk(Number(e.target.value))}
            style={{ flex: 1, accentColor: riskInfo.color, cursor: 'pointer', height: '6px' }}
          />
          <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', flexShrink: 0 }}>100</span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: riskInfo.color, fontFamily: 'Syne, sans-serif' }}>
            {sliderRisk}
          </div>
          {sliderRisk !== 68 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>
              Current score: 68 → {sliderRisk}
            </div>
          )}
        </div>

        <div style={{
          background: `${riskInfo.color}20`, border: `1px solid ${riskInfo.color}50`,
          borderRadius: '12px', padding: '1rem 1.25rem',
        }}>
          <p style={{ color: 'var(--clr-text)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>{riskInfo.emoji}</span>
            {riskInfo.text}
          </p>
        </div>
      </motion.div>

      {/* Panel D: Clinical Comparison */}
      <motion.div
        className="glass"
        style={{ padding: '1.5rem' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <h2 className="font-syne" style={{ fontSize: '1.2rem', color: 'var(--clr-text)', marginBottom: '1.25rem' }}>
          What the Evidence Shows
        </h2>

        {[
          { icon: '❌', label: 'Without protocol:', text: '65% DFU recurrence rate at 5 years' },
          { icon: '✅', label: 'Smart insole (Abbott 2019):', text: '86% recurrence reduction with adherence' },
          { icon: '✅', label: 'Daily PBM (Borges 2024):', text: 'Significant wound area reduction at 12 weeks' },
          { icon: '🌟', label: 'SoleIQ combined system:', text: 'Monitoring + intervention + escalation' },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex', gap: '1rem', alignItems: 'flex-start',
            padding: '0.75rem 0', borderBottom: i < 3 ? '1px solid var(--clr-border)' : 'none',
          }}>
            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{item.icon}</span>
            <div>
              <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem' }}>{item.label}</span>{' '}
              <span style={{ color: 'var(--clr-text)', fontSize: '0.9rem', fontWeight: 500 }}>{item.text}</span>
            </div>
          </div>
        ))}

        <div style={{
          marginTop: '1.25rem', background: 'rgba(78,205,196,0.1)',
          border: '1px solid var(--clr-border)', borderRadius: '10px', padding: '1rem', textAlign: 'center',
        }}>
          <p style={{ color: 'var(--clr-accent)', fontSize: '0.95rem', fontWeight: 600 }}>
            Your {protocol.streakDays}-day streak puts you in the adherent cohort. Keep going.
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {sessionOpen && <SessionTimerModal onClose={() => setSessionOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
