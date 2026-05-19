import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Legend,
} from 'recharts';
import { useUser } from '../context/UserContext';

// ---- Custom tooltips ----
interface TooltipPayloadItem {
  value: number;
  payload: { event?: string | null; date?: string; delta?: number };
}

function RiskTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          background: 'var(--clr-surface)',
          border: '1px solid var(--clr-border)',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
        }}
      >
        <p style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)', marginBottom: '0.25rem' }}>{label}</p>
        <p style={{ fontSize: '1rem', fontWeight: 700, color: '#4ECDC4' }}>
          Risk Score: {payload[0].value}
        </p>
        {data.event && (
          <p style={{ fontSize: '0.75rem', color: 'var(--clr-warning)', marginTop: '0.25rem' }}>
            ⚡ {data.event}
          </p>
        )}
      </div>
    );
  }
  return null;
}

function TempTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'var(--clr-surface)',
          border: '1px solid var(--clr-border)',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
        }}
      >
        <p style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)', marginBottom: '0.25rem' }}>{label}</p>
        <p style={{ fontSize: '1rem', fontWeight: 700, color: '#FFB347' }}>
          ΔT: {payload[0].value}°C
        </p>
      </div>
    );
  }
  return null;
}

// Custom dot renderer for risk score chart
interface DotProps {
  cx?: number;
  cy?: number;
  payload?: { event?: string | null };
}

function RiskDot(props: DotProps) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined) return null;
  if (payload?.event) {
    return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill="#FFB347" stroke="#fff" strokeWidth={1.5} />;
  }
  return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill="#4ECDC4" stroke="none" />;
}

// Radar data
const RADAR_DATA = [
  { zone: 'Hallux', right: 45, left: 38 },
  { zone: 'Met 1',  right: 82, left: 52 },
  { zone: 'Met 2',  right: 71, left: 48 },
  { zone: 'Met 3',  right: 58, left: 44 },
  { zone: 'Met 4',  right: 41, left: 31 },
  { zone: 'Met 5',  right: 38, left: 29 },
  { zone: 'Arch',   right: 22, left: 18 },
  { zone: 'Heel',   right: 35, left: 28 },
];

export default function Analytics() {
  const { user } = useUser();
  const hist = user.historicalData;

  const riskData = hist.riskScoreTrend.map((d) => ({
    ...d,
    dateShort: d.date.slice(5), // MM-DD
  }));

  const tempData = hist.temperatureAsymmetryTrend.map((d) => ({
    ...d,
    dateShort: d.date.slice(5),
  }));

  const wearData = hist.wearTimeAdherence.map((v, i) => ({
    day: `D${i + 1}`,
    hours: v,
  }));

  const adherenceCount = hist.pbmAdherence.filter(Boolean).length;
  const adherenceRate = Math.round((adherenceCount / hist.pbmAdherence.length) * 100);

  const avgWear = (
    hist.wearTimeAdherence.reduce((a, b) => a + b, 0) / hist.wearTimeAdherence.length
  ).toFixed(1);

  // Current streak: count trailing trues
  let streak = 0;
  for (let i = hist.pbmAdherence.length - 1; i >= 0; i--) {
    if (hist.pbmAdherence[i]) streak++;
    else break;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="font-syne" style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--clr-text)', marginBottom: '0.25rem' }}>
          Your Sole Over Time
        </h1>
        <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>
          30-day trends — risk score, temperature asymmetry, PBM adherence, wear time, and bilateral pressure.
        </p>
      </div>

      {/* Summary stats */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}
        className="analytics-stats"
      >
        {[
          { label: 'Current Risk', value: '68', sub: '↓ 4 pts', color: 'var(--clr-warning)', subColor: 'var(--clr-success)' },
          { label: 'Risk Trend', value: 'Improving', sub: 'Past 30 days', color: 'var(--clr-success)', subColor: 'var(--clr-text-muted)' },
          { label: 'PBM Adherence', value: `${adherenceRate}%`, sub: `${adherenceCount}/${hist.pbmAdherence.length} sessions`, color: 'var(--clr-accent)', subColor: 'var(--clr-text-muted)' },
          { label: 'Avg Wear Time', value: `${avgWear}h`, sub: `Goal: ${user.devices.smartInsole.wearTimeGoal}h/day`, color: 'var(--clr-accent-2)', subColor: 'var(--clr-text-muted)' },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
              {stat.label}
            </p>
            <p className="font-syne" style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>
              {stat.value}
            </p>
            <p style={{ fontSize: '0.75rem', color: stat.subColor, marginTop: '0.25rem' }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* CHART 1: Risk Score Trend (AreaChart) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="glass"
        style={{ padding: '1.5rem', marginBottom: '1.25rem' }}
      >
        <div style={{ marginBottom: '0.875rem' }}>
          <h2 className="font-syne" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--clr-text)', marginBottom: '0.25rem' }}>
            Risk Score Trend — 30 Days
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--clr-success)' }}>
            Trend: ↓ Improving — down 11 points from peak (79 on Feb 26)
          </p>
        </div>
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={riskData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ECDC4" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#4ECDC4" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(78,205,196,0.08)" />
            <XAxis dataKey="dateShort" tick={{ fill: 'var(--clr-text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--clr-border)' }} tickLine={false} />
            <YAxis domain={[55, 85]} tick={{ fill: 'var(--clr-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<RiskTooltip />} />
            <ReferenceLine y={40} stroke="#4ECDC4" strokeDasharray="4 4" label={{ value: 'Low', fill: '#4ECDC4', fontSize: 9, position: 'right' }} />
            <ReferenceLine y={60} stroke="#F0E000" strokeDasharray="4 4" label={{ value: 'Moderate', fill: '#F0E000', fontSize: 9, position: 'right' }} />
            <ReferenceLine y={75} stroke="#FFB347" strokeDasharray="4 4" label={{ value: 'Elevated', fill: '#FFB347', fontSize: 9, position: 'right' }} />
            <ReferenceLine y={90} stroke="#FF6B6B" strokeDasharray="4 4" label={{ value: 'High', fill: '#FF6B6B', fontSize: 9, position: 'right' }} />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#4ECDC4"
              strokeWidth={2.5}
              fill="url(#riskGradient)"
              dot={(props: DotProps) => <RiskDot {...props} />}
              activeDot={{ r: 6, fill: '#4ECDC4', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginTop: '0.5rem' }}>
          ⚡ Amber dots indicate logged events (missed PBM, high activity days). Hover for details.
        </p>
      </motion.div>

      {/* CHART 2: Temperature Asymmetry Trend */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="glass"
        style={{ padding: '1.5rem', marginBottom: '1.25rem' }}
      >
        <div style={{ marginBottom: '0.875rem' }}>
          <h2 className="font-syne" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--clr-text)', marginBottom: '0.25rem' }}>
            Temperature Asymmetry Trend
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>
            Right vs left forefoot temperature differential (°C) — watch threshold 2.0°C
          </p>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={tempData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(78,205,196,0.08)" />
            <XAxis dataKey="dateShort" tick={{ fill: 'var(--clr-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 4]} tick={{ fill: 'var(--clr-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<TempTooltip />} />
            <ReferenceLine y={2.0} stroke="#FFB347" strokeDasharray="4 4" label={{ value: 'Watch Threshold', fill: '#FFB347', fontSize: 9, position: 'insideTopRight' }} />
            <ReferenceLine y={2.5} stroke="#FF6B6B" strokeDasharray="4 4" label={{ value: 'Escalation Threshold', fill: '#FF6B6B', fontSize: 9, position: 'insideTopRight' }} />
            <Line
              type="monotone"
              dataKey="delta"
              stroke="#FFB347"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#FFB347', stroke: '#fff', strokeWidth: 1 }}
              activeDot={{ r: 6, fill: '#FFB347', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Bottom 3-chart row */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}
        className="analytics-charts"
      >
        {/* CHART 3: PBM Adherence Calendar (14-day grid) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="glass"
          style={{ padding: '1.25rem' }}
        >
          <h2 className="font-syne" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--clr-text)', marginBottom: '0.25rem' }}>
            PBM Adherence Calendar
          </h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginBottom: '0.875rem' }}>14-day session log</p>

          {/* 2 rows of 7 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '0.875rem' }}>
            {[0, 1].map((row) => (
              <div key={row} style={{ display: 'flex', gap: '6px' }}>
                {hist.pbmAdherence.slice(row * 7, row * 7 + 7).map((done, colIdx) => {
                  const dayNum = row * 7 + colIdx + 1;
                  return (
                    <div key={dayNum} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <div
                        title={`Day ${dayNum}: ${done ? 'Completed' : 'Missed'}`}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: done ? '#4ECDC4' : 'var(--clr-surface-2)',
                          border: `1px solid ${done ? 'rgba(78,205,196,0.5)' : 'var(--clr-border)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          color: done ? '#0D2B3E' : 'var(--clr-text-muted)',
                          fontWeight: 700,
                          cursor: 'default',
                          boxShadow: done ? '0 0 8px rgba(78,205,196,0.3)' : 'none',
                        }}
                      >
                        {done ? '✓' : '✗'}
                      </div>
                      <span style={{ fontSize: '0.55rem', color: 'var(--clr-text-muted)' }}>{dayNum}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--clr-accent)', marginBottom: '0.25rem' }}>
            {adherenceCount}/{hist.pbmAdherence.length} sessions completed ({adherenceRate}% adherence)
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--clr-warning)', fontWeight: 600 }}>
            🔥 Current streak: {streak} days
          </p>
        </motion.div>

        {/* CHART 4: Wear Time Adherence BarChart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="glass"
          style={{ padding: '1.25rem' }}
        >
          <h2 className="font-syne" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--clr-text)', marginBottom: '0.25rem' }}>
            Daily Wear Time
          </h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginBottom: '0.875rem' }}>Hours / day (8h goal)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={wearData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(78,205,196,0.08)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--clr-text-muted)', fontSize: 8 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: 'var(--clr-text-muted)', fontSize: 8 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: '8px', fontSize: '0.78rem' }}
                labelStyle={{ color: 'var(--clr-text-muted)' }}
                formatter={(value: number) => [`${value}h`, 'Wear Time']}
              />
              <ReferenceLine y={8} stroke="#4ECDC4" strokeDasharray="3 3" label={{ value: '8h Goal', fill: '#4ECDC4', fontSize: 8 }} />
              <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
                {wearData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.hours >= 8 ? '#4ECDC4' : entry.hours >= 6 ? '#FFB347' : '#FF6B6B'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* CHART 5: Bilateral Pressure Radar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="glass"
          style={{ padding: '1.25rem' }}
        >
          <h2 className="font-syne" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--clr-text)', marginBottom: '0.25rem' }}>
            Bilateral Pressure Radar
          </h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginBottom: '0.5rem' }}>Left vs Right foot zones</p>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={RADAR_DATA} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
              <PolarGrid stroke="rgba(78,205,196,0.15)" />
              <PolarAngleAxis dataKey="zone" tick={{ fill: 'var(--clr-text-muted)', fontSize: 9 }} />
              <Radar
                name="Left Foot"
                dataKey="left"
                stroke="#4ECDC4"
                fill="#4ECDC4"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Radar
                name="Right Foot"
                dataKey="right"
                stroke="#FFB347"
                fill="#FFB347"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Legend wrapperStyle={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)' }} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* AI Insight Summary Box */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="glass"
        style={{
          padding: '1.5rem',
          borderLeft: '4px solid var(--clr-accent)',
          marginBottom: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--clr-accent)', background: 'rgba(78,205,196,0.1)', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
            SoleIQ AI Analysis
          </span>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--clr-text)', lineHeight: 1.65, fontStyle: 'italic', marginBottom: '0.875rem' }}>
          "Over the past 30 days, your overall risk has improved from 79 to 68 — a meaningful 14% reduction.
          The primary driver is your PBM adherence (79% over the past 2 weeks), which has consistently reduced
          right forefoot thermal elevation. Temperature asymmetry remains the key watchpoint at 2.1°C — above the 2.0°C threshold."
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--clr-text)', lineHeight: 1.65, fontStyle: 'italic' }}>
          "Continue current protocol. If ΔT remains above 2.0°C by April 5, your care team will review and
          may adjust PBM wavelength configuration or offloading insole prescription. Your gait symmetry score
          of 74/100 also warrants attention — the right forefoot loading bias is contributing to asymmetric wear."
        </p>
      </motion.div>

      <style>{`
        @media (max-width: 900px) {
          .analytics-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .analytics-charts { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 500px) {
          .analytics-stats { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </motion.div>
  );
}
