import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Footprints, Clock, Zap, Thermometer, ChevronDown, ChevronUp, AlertTriangle, Info, CheckCircle, Map } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useDashboard } from '../context/DashboardContext';

function getRiskColor(score: number): string {
  if (score >= 75) return 'var(--clr-danger)';
  if (score >= 60) return 'var(--clr-warning)';
  if (score >= 40) return '#F0E000';
  return 'var(--clr-success)';
}

function getRiskColorHex(score: number): string {
  if (score >= 75) return '#FF6B6B';
  if (score >= 60) return '#FFB347';
  if (score >= 40) return '#F0E000';
  return '#4ECDC4';
}

// Animated gauge component
function RiskGauge({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timeout = setTimeout(() => {
      let current = 0;
      const step = score / 60;
      const interval = setInterval(() => {
        current += step;
        if (current >= score) {
          current = score;
          clearInterval(interval);
        }
        setAnimatedScore(Math.round(current));
      }, 16);
      return () => clearInterval(interval);
    }, 300);
    return () => clearTimeout(timeout);
  }, [score]);

  const color = getRiskColorHex(score);

  return (
    <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto' }}>
      {/* Pulsing ring */}
      <div
        className="pulse-ring"
        style={{
          position: 'absolute',
          inset: '-10px',
          borderRadius: '50%',
          border: `2px solid ${color}`,
          opacity: 0.4,
          pointerEvents: 'none',
        }}
      />
      <svg
        width="180"
        height="180"
        viewBox="0 0 180 180"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background track ring */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="rgba(78,205,196,0.15)"
          strokeWidth="10"
        />
        {/* Colored progress arc */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.05s linear, stroke 0.5s ease' }}
          filter={`drop-shadow(0 0 8px ${color}60)`}
        />
      </svg>
      {/* Center text */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          className="font-syne"
          style={{ fontSize: '2.4rem', fontWeight: 800, color, lineHeight: 1 }}
        >
          {animatedScore}
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginTop: '2px' }}>
          / 100
        </span>
      </div>
    </div>
  );
}

// Mini foot heatmap SVG — anatomically correct
function MiniFootHeatmap({
  side,
  zones,
}: {
  side: 'left' | 'right';
  zones: Record<string, number>;
}) {
  const isRight = side === 'right';
  const prefix = isRight ? 'right' : 'left';

  const zoneData = {
    hallux: zones[`${prefix}Hallux`] || 0,
    met1: zones[`${prefix}Met1`] || 0,
    met2: zones[`${prefix}Met2`] || 0,
    met3: zones[`${prefix}Met3`] || 0,
    met4: zones[`${prefix}Met4`] || 0,
    met5: zones[`${prefix}Met5`] || 0,
    arch: zones[`${prefix}Arch`] || 0,
    heel: zones[`${prefix}Heel`] || 0,
  };

  // rightMet1 = 82 => pulsing red glow when on right side
  const met1Pulse = isRight && zoneData.met1 >= 75;

  return (
    <svg
      viewBox="0 0 80 160"
      width="80"
      height="160"
      style={{ transform: isRight ? 'none' : 'scaleX(-1)' }}
    >
      {/* Foot outline — smooth anatomically correct path */}
      <path
        d="M38 148 C24 148 18 133 18 118 L18 78 C18 63 20 52 24 42 C27 34 31 27 36 22 C39 19 43 17 46 17 C49 17 53 19 56 22 C60 27 63 34 65 44 C68 55 68 66 66 78 L64 118 C64 133 56 148 42 148 Z"
        fill="var(--clr-surface)"
        stroke="var(--clr-border)"
        strokeWidth="1.5"
      />

      {/* 5 toe circles at top */}
      {/* Big toe (hallux) */}
      <ellipse cx="33" cy="12" rx="6.5" ry="8.5" fill={getRiskColorHex(zoneData.hallux)} opacity="0.88" />
      {/* 2nd toe */}
      <ellipse cx="43" cy="10" rx="5" ry="7.5" fill={getRiskColorHex(zoneData.met1)} opacity="0.88"
        className={met1Pulse ? 'hotspot-pulse' : ''} />
      {/* 3rd toe */}
      <ellipse cx="51" cy="12" rx="4.5" ry="7" fill={getRiskColorHex(zoneData.met2)} opacity="0.85" />
      {/* 4th toe */}
      <ellipse cx="58" cy="16" rx="4" ry="6" fill={getRiskColorHex(zoneData.met3)} opacity="0.82" />
      {/* 5th toe (pinky) */}
      <ellipse cx="63" cy="22" rx="3.5" ry="5.5" fill={getRiskColorHex(zoneData.met4)} opacity="0.8" />

      {/* Metatarsal zones — ball of foot area */}
      <ellipse cx="34" cy="36" rx="9" ry="7.5" fill={getRiskColorHex(zoneData.hallux)} opacity="0.72" />
      <ellipse cx="43" cy="33" rx="7" ry="7" fill={getRiskColorHex(zoneData.met1)} opacity="0.78"
        className={met1Pulse ? 'hotspot-pulse' : ''} />
      <ellipse cx="51" cy="35" rx="6" ry="7" fill={getRiskColorHex(zoneData.met2)} opacity="0.72" />
      <ellipse cx="57" cy="39" rx="5" ry="6" fill={getRiskColorHex(zoneData.met3)} opacity="0.67" />
      <ellipse cx="61" cy="45" rx="4.5" ry="5.5" fill={getRiskColorHex(zoneData.met4)} opacity="0.62" />

      {/* Arch zone — narrow middle section */}
      <path
        d="M20 80 C20 70 23 66 28 64 L28 100 C23 98 20 93 20 86 Z"
        fill={getRiskColorHex(zoneData.arch)}
        opacity="0.55"
      />

      {/* Heel zone — wider rounded bottom */}
      <ellipse cx="40" cy="134" rx="18" ry="12" fill={getRiskColorHex(zoneData.heel)} opacity="0.78" />

      {/* Label */}
      <text
        x="40"
        y="155"
        textAnchor="middle"
        fontSize="7.5"
        fill="var(--clr-text-muted)"
        fontFamily="DM Sans, sans-serif"
        style={{ transform: isRight ? 'none' : 'scaleX(-1)', transformOrigin: '40px 155px' }}
      >
        {isRight ? 'RIGHT' : 'LEFT'}
      </text>
    </svg>
  );
}

// Recommendation card with AnimatePresence for Why? section
function RecommendationCard({
  severity,
  title,
  body,
  why,
  delay,
}: {
  severity: 'Watch' | 'Info' | 'Action';
  title: string;
  body: string;
  why: string;
  delay: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const colors: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
    Watch: {
      bg: 'rgba(255,179,71,0.1)',
      color: 'var(--clr-warning)',
      icon: <AlertTriangle size={16} />,
    },
    Info: {
      bg: 'rgba(78,205,196,0.1)',
      color: 'var(--clr-accent)',
      icon: <Info size={16} />,
    },
    Action: {
      bg: 'rgba(255,107,107,0.1)',
      color: 'var(--clr-danger)',
      icon: <AlertTriangle size={16} />,
    },
  };

  const cfg = colors[severity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.color}30`,
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
        <span style={{ color: cfg.color, flexShrink: 0, marginTop: '2px' }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: '0.875rem',
              color: 'var(--clr-text)',
              marginBottom: '0.25rem',
            }}
          >
            {title}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--clr-text-muted)', lineHeight: 1.5 }}>
            {body}
          </p>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: cfg.color,
              fontSize: '0.78rem',
              fontWeight: 600,
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: 0,
            }}
          >
            Why? {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="why-content"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <p
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--clr-text-muted)',
                    lineHeight: 1.5,
                    marginTop: '0.5rem',
                    paddingTop: '0.5rem',
                    borderTop: `1px solid ${cfg.color}20`,
                  }}
                >
                  {why}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function Overview() {
  const { user } = useUser();
  const { setActiveSection } = useDashboard();
  const ra = user.riskAssessment;
  const gait = user.plantarData.gaitMetrics;
  const insole = user.devices.smartInsole;
  const pbm = user.therapyProtocol.pbmProtocol;
  const tempAsym = user.plantarData.temperatureAsymmetry;

  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const stepsPercent = Math.min((gait.stepsToday / gait.stepGoal) * 100, 100);
  const wearPercent = Math.min((insole.wearTimeToday / insole.wearTimeGoal) * 100, 100);

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1
          className="font-syne"
          style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--clr-text)', marginBottom: '0.25rem' }}
        >
          {greeting}, {user.firstName} 👋
        </h1>
        <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>{dateStr}</p>
      </div>

      {/* 3-column grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1.2fr)',
          gap: '1.25rem',
          marginBottom: '1.5rem',
        }}
        className="overview-grid"
      >
        {/* COL 1 — Risk Score + Mini Heatmap */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Risk Score Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="glass"
            style={{ padding: '1.5rem', textAlign: 'center' }}
          >
            <h2
              className="font-syne"
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--clr-text-muted)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '1rem',
              }}
            >
              Risk Score
            </h2>
            <RiskGauge score={ra.overallRiskScore} />
            <div style={{ marginTop: '1rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  background: 'rgba(255,179,71,0.15)',
                  color: 'var(--clr-warning)',
                  marginBottom: '0.5rem',
                }}
              >
                {ra.overallRiskLevel}
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                  color: 'var(--clr-success)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '0.375rem',
                }}
              >
                <CheckCircle size={14} />↓ {Math.abs(ra.trendDelta)} pts from last week
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>
                Last updated: Today at 7:42 AM
              </p>
            </div>
          </motion.div>

          {/* Mini foot heatmap */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="glass"
            style={{ padding: '1.25rem' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.875rem',
              }}
            >
              <h2
                className="font-syne"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--clr-text-muted)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Sole Heatmap
              </h2>
              <button
                onClick={() => setActiveSection('solemap')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--clr-accent)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: 0,
                }}
              >
                <Map size={12} /> View Full →
              </button>
            </div>

            {/* Risk legend */}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                marginBottom: '0.875rem',
                flexWrap: 'wrap',
              }}
            >
              {[
                { label: 'High', color: '#FF6B6B' },
                { label: 'Elevated', color: '#FFB347' },
                { label: 'Moderate', color: '#F0E000' },
                { label: 'Low', color: '#4ECDC4' },
              ].map((item) => (
                <span
                  key={item.label}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--clr-text-muted)' }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: item.color,
                      display: 'inline-block',
                    }}
                  />
                  {item.label}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
              <MiniFootHeatmap side="left" zones={ra.zoneRisks} />
              <MiniFootHeatmap side="right" zones={ra.zoneRisks} />
            </div>

            {/* Hotspot alert */}
            <div
              style={{
                marginTop: '0.875rem',
                padding: '0.625rem',
                background: 'rgba(255,107,107,0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(255,107,107,0.2)',
              }}
            >
              <p style={{ fontSize: '0.78rem', color: 'var(--clr-danger)', fontWeight: 600 }}>
                ⚠ Right 1st Metatarsal Head — Risk 82 (High)
              </p>
            </div>
          </motion.div>
        </div>

        {/* COL 2 — 4 stat cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Steps */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="stat-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Steps Today</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span className="font-syne" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--clr-text)' }}>
                    {gait.stepsToday.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>/ {gait.stepGoal.toLocaleString()}</span>
                </div>
              </div>
              <div style={{ background: 'rgba(78,205,196,0.15)', borderRadius: '10px', padding: '0.5rem' }}>
                <Footprints size={18} color="var(--clr-accent)" />
              </div>
            </div>
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${stepsPercent}%` }}
                transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginTop: '0.375rem' }}>
              {Math.round(stepsPercent)}% of daily goal
            </p>
          </motion.div>

          {/* Wear Time */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="stat-card"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Wear Time</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span className="font-syne" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--clr-text)' }}>
                    {insole.wearTimeToday}h
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>/ {insole.wearTimeGoal}h</span>
                </div>
              </div>
              <div style={{ background: 'rgba(59,130,246,0.15)', borderRadius: '10px', padding: '0.5rem' }}>
                <Clock size={18} color="var(--clr-accent-2)" />
              </div>
            </div>
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                style={{ background: 'var(--clr-accent-2)' }}
                initial={{ width: 0 }}
                animate={{ width: `${wearPercent}%` }}
                transition={{ delay: 0.65, duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginTop: '0.375rem' }}>
              {Math.round(wearPercent)}% of wear goal
            </p>
          </motion.div>

          {/* PBM Streak */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="stat-card"
            style={{ background: 'linear-gradient(135deg, var(--clr-surface) 0%, rgba(78,205,196,0.08) 100%)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>PBM Streak</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🔥</span>
                  <span className="font-syne" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--clr-accent)' }}>
                    {pbm.streakDays}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>days</span>
                </div>
              </div>
              <div style={{ background: 'rgba(255,179,71,0.15)', borderRadius: '10px', padding: '0.5rem' }}>
                <Zap size={18} color="var(--clr-warning)" />
              </div>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginTop: '0.5rem' }}>
              Next: {pbm.nextSession}
            </p>
          </motion.div>

          {/* Temp Asymmetry */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="stat-card"
            style={{
              border: `1px solid rgba(255,179,71,0.3)`,
              background: 'rgba(255,179,71,0.05)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Temp Asymmetry</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                  <span className="font-syne" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--clr-warning)' }}>
                    {tempAsym.maxDelta}°C
                  </span>
                </div>
              </div>
              <div style={{ background: 'rgba(255,179,71,0.15)', borderRadius: '10px', padding: '0.5rem' }}>
                <Thermometer size={18} color="var(--clr-warning)" />
              </div>
            </div>
            <div
              style={{
                marginTop: '0.625rem',
                padding: '0.375rem 0.625rem',
                background: 'rgba(255,179,71,0.1)',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--clr-warning)', fontWeight: 600 }}>
                Watch — threshold {tempAsym.alertThreshold}°C
              </span>
            </div>
          </motion.div>
        </div>

        {/* COL 3 — Personalized insights */}
        <div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="glass"
            style={{ padding: '1.25rem', height: '100%' }}
          >
            <h2
              className="font-syne"
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--clr-text)',
                marginBottom: '0.25rem',
              }}
            >
              Your SoleIQ Today
            </h2>
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--clr-text-muted)',
                marginBottom: '1rem',
              }}
            >
              Personalized for {user.firstName}
            </p>

            <RecommendationCard
              severity="Watch"
              title="Temperature Asymmetry Alert"
              body="Your right 1st metatarsal is 2.1°C above contralateral — at the clinical watch threshold. Monitor closely and complete tonight's PBM session."
              why="Temperature differentials above 2°C between contralateral sites are a validated early predictor of diabetic foot ulcers (DFU). Your neuropathy limits sensation-based self-detection, making thermal monitoring critical."
              delay={0.3}
            />

            <RecommendationCard
              severity="Info"
              title="PBM Session Due Tonight"
              body="Keep your 11-day streak alive with a 30-minute combined-spectrum session targeting the right forefoot at 8:00 PM."
              why="Photobiomodulation activates cytochrome c oxidase (CCO) in mitochondria, enhancing ATP synthesis and microcirculation in compromised diabetic tissue. Consistent daily sessions are needed to build cumulative therapeutic effect."
              delay={0.4}
            />

            <RecommendationCard
              severity="Info"
              title="Step Goal on Track"
              body="You've reached 4,218 of your 6,000-step goal. Pace yourself — avoid exceeding 6,000 on high-risk days."
              why="Your offloading protocol limits steps on days with risk scores above 75. Today's score of 68 allows full activity but excessive loading of right metatarsal zones should be avoided given the active temperature asymmetry."
              delay={0.5}
            />
          </motion.div>
        </div>
      </div>

      {/* Quick action bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        {[
          { label: 'Start PBM Session', color: 'var(--clr-accent)', textColor: '#0D2B3E', icon: <Zap size={16} />, border: false, onClick: undefined },
          { label: 'Log Symptom', color: 'transparent', textColor: 'var(--clr-text)', icon: <AlertTriangle size={16} />, border: true, onClick: undefined },
          { label: 'Message Care Team', color: 'transparent', textColor: 'var(--clr-text)', icon: <Info size={16} />, border: true, onClick: undefined },
          { label: 'View Full Sole Map', color: 'transparent', textColor: 'var(--clr-accent)', icon: <Map size={16} />, border: true, onClick: () => setActiveSection('solemap') },
        ].map((btn) => (
          <motion.button
            key={btn.label}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={btn.onClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.125rem',
              background: btn.color,
              color: btn.textColor,
              border: btn.border ? '1px solid var(--clr-border)' : 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif',
              transition: 'all 0.2s',
            }}
          >
            {btn.icon}
            {btn.label}
          </motion.button>
        ))}
      </motion.div>

      <style>{`
        @media (max-width: 1100px) {
          .overview-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 700px) {
          .overview-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </motion.div>
  );
}
