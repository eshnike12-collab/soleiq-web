import { useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Clock, TrendingUp, DollarSign, Users, Zap, BarChart2, Activity, UserPlus
} from 'lucide-react'
import { useAdminStore } from '../store/useAdminStore'
import { useThemeStore } from '../store/useThemeStore'

// ── Types ──────────────────────────────────────────────────────────────────────
type DateRange = '7d' | '30d' | '90d'

// ── Helpers ────────────────────────────────────────────────────────────────────

function seed(n: number) {
  // Deterministic-ish mock: use position-based variation
  return (Math.sin(n * 9301 + 49297) / 233280 + 1) * 0.5
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color: string
}) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>{subtitle}</p>}
    </div>
  )
}

// ── Funnel Bar ─────────────────────────────────────────────────────────────────
function FunnelBar({ label, count, maxCount, color }: { label: string; count: number; maxCount: number; color: string }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
  const convPct = maxCount > 0 ? ((count / maxCount) * 100).toFixed(1) : '0.0'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ fontSize: 12, color: 'var(--muted)', width: 80, textAlign: 'right', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 6, height: 28, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color,
          display: 'flex', alignItems: 'center', paddingLeft: 10, transition: 'width 0.4s ease',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
            {count.toLocaleString()}
          </span>
        </div>
      </div>
      <span style={{ fontSize: 12, color: 'var(--muted)', width: 44, textAlign: 'right', flexShrink: 0 }}>{convPct}%</span>
    </div>
  )
}

// ── Main Analytics Page ────────────────────────────────────────────────────────
export default function Analytics() {
  const { users } = useAdminStore()
  const { isDark } = useThemeStore()
  const [range, setRange] = useState<DateRange>('30d')

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const gridColor = isDark ? '#334155' : '#E2E8F0'
  const textColor = isDark ? '#94A3B8' : '#64748B'

  // ── Usage data ───────────────────────────────────────────────────────────────
  const usageData = useMemo(() => Array.from({ length: days }, (_, i) => ({
    date: format(subDays(new Date(), days - 1 - i), days > 30 ? 'MMM d' : 'MMM d'),
    hours: Math.round(seed(i) * 120 + 40),
  })), [days])

  const totalUsageHours = users.reduce((s, u) => s + u.usageHours, 0)
  const avgUsageAll = users.length > 0 ? (totalUsageHours / users.length).toFixed(1) : '0'
  const topUser = [...users].sort((a, b) => b.usageHours - a.usageHours)[0]

  const peakHourData = useMemo(() => Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}:00`,
    sessions: Math.round(seed(h * 3) * 80 + (h >= 8 && h <= 18 ? 40 : 5)),
  })), [])
  const peakHour = peakHourData.reduce((max, d) => d.sessions > max.sessions ? d : max, peakHourData[0])

  const sessionBySegment = [
    { segment: 'Free', minutes: 18 },
    { segment: 'Pro', minutes: 31 },
    { segment: 'Enterprise', minutes: 47 },
  ]

  // ── Revenue data ─────────────────────────────────────────────────────────────
  const MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
  const revenueTimeData = useMemo(() => {
    let cumulative = 0
    return MONTHS.map((m, i) => {
      cumulative += Math.round(seed(i + 10) * 4000 + 3500)
      return { month: m, cumulative }
    })
  }, [])

  const mrrData = MONTHS.map((m, i) => ({
    month: m,
    newMRR: Math.round(seed(i + 20) * 300 + 150),
    churnedMRR: Math.round(seed(i + 30) * 80 + 20),
  }))

  // ── Growth data ───────────────────────────────────────────────────────────────
  const signupData = useMemo(() => Array.from({ length: days }, (_, i) => ({
    date: format(subDays(new Date(), days - 1 - i), 'MMM d'),
    signups: Math.round(seed(i + 50) * 12 + 2),
  })), [days])

  const funnelData = [
    { label: 'Visitors', count: 1240, color: '#2563EB' },
    { label: 'Sign-ups', count: 312, color: '#0EA5E9' },
    { label: 'Activated', count: 198, color: '#10B981' },
    { label: 'Paid', count: 8, color: '#F59E0B' },
  ]

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: 'none',
    background: active ? 'var(--primary)' : 'var(--bg)',
    color: active ? '#fff' : 'var(--muted)',
    transition: 'all 0.15s',
  })

  const tickInterval = days === 7 ? 0 : days === 30 ? 4 : 14

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Page header + date range */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Analytics</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>Platform-wide metrics and trends</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 24, padding: 4 }}>
          {(['7d', '30d', '90d'] as DateRange[]).map(r => (
            <button key={r} style={pillStyle(range === r)} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>
      </div>

      {/* ── Section 1: Usage Analytics ─────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Usage Analytics" subtitle="How users are engaging with the platform" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <KpiCard icon={Clock} label="Avg Usage / User (All Time)" value={`${avgUsageAll}h`} color="#2563EB" />
          <KpiCard icon={Activity} label="Avg Usage / User (This Month)" value={`${(parseFloat(avgUsageAll) * 0.73).toFixed(1)}h`} color="#0EA5E9" />
          <KpiCard icon={Zap} label="Top Power User" value={topUser?.name ?? '—'} sub={`${topUser?.usageHours ?? 0}h total`} color="#F59E0B" />
          <KpiCard icon={BarChart2} label="Most Active Hour" value={peakHour?.hour ?? '—'} sub={`~${peakHour?.sessions} sessions`} color="#10B981" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Usage area chart */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Platform Usage Hours / Day</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={usageData}>
                <defs>
                  <linearGradient id="usage_grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: textColor }} tickLine={false} interval={tickInterval} />
                <YAxis tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="hours" stroke="#2563EB" strokeWidth={2} fill="url(#usage_grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Session by segment bar chart */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Avg Session Duration by Plan (minutes)</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sessionBySegment} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="segment" tick={{ fontSize: 12, fill: textColor }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} unit="m" />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v} min`, 'Avg Session']} />
                <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                  {sessionBySegment.map((entry, i) => (
                    <rect key={i} fill={['#64748B', '#2563EB', '#0EA5E9'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── Section 2: Revenue Analytics ───────────────────────────────────────── */}
      <section>
        <SectionHeader title="Revenue Analytics" subtitle="Subscription revenue breakdown and trends" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <KpiCard icon={DollarSign} label="MRR" value="$1,240" sub="+8% vs last month" color="#10B981" />
          <KpiCard icon={TrendingUp} label="ARR" value="$14,880" sub="Annualized run rate" color="#2563EB" />
          <KpiCard icon={Users} label="ARPU" value="$186" sub="Avg revenue per user" color="#0EA5E9" />
          <KpiCard icon={Activity} label="Churn Rate" value="2.1%" sub="-0.3% vs last month" color="#F59E0B" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Cumulative revenue */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Cumulative Revenue – Last 6 Months</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueTimeData}>
                <defs>
                  <linearGradient id="rev_grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: textColor }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [`$${Number(v).toLocaleString()}`, 'Cumulative']} />
                <Area type="monotone" dataKey="cumulative" stroke="#10B981" strokeWidth={2} fill="url(#rev_grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* New MRR vs Churned MRR */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>New MRR vs Churned MRR by Month</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mrrData} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: textColor }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [`$${v}`, '']} />
                <Legend wrapperStyle={{ fontSize: 11, color: textColor }} />
                <Bar dataKey="newMRR" name="New MRR" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="churnedMRR" name="Churned MRR" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── Section 3: User Growth ──────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="User Growth" subtitle="Sign-up trends and conversion funnel" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Sign-up line chart */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>New Sign-ups / Day</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={signupData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: textColor }} tickLine={false} interval={tickInterval} />
                <YAxis tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="signups" stroke="#0EA5E9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Funnel */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>Conversion Funnel</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {funnelData.map((item, i) => (
                <FunnelBar
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  maxCount={funnelData[0].count}
                  color={item.color}
                />
              ))}
            </div>
            <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, fontSize: 12, color: 'var(--muted)' }}>
              Overall conversion: <strong style={{ color: 'var(--text)' }}>
                {((funnelData[3].count / funnelData[0].count) * 100).toFixed(2)}%
              </strong> of visitors become paid users
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
