import { useMemo } from 'react'
import { format, subDays } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Users, TrendingUp, DollarSign, Clock, MessageSquare, UserPlus } from 'lucide-react'
import { useAdminStore } from '../store/useAdminStore'
import { useThemeStore } from '../store/useThemeStore'

const PLAN_COLORS = ['#64748B', '#2563EB', '#0EA5E9']

function KpiCard({ icon: Icon, label, value, change, color }: {
  icon: any, label: string, value: string, change?: string, color: string
}) {
  const isPositive = change?.startsWith('+')
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
        {change && (
          <div style={{ fontSize: 12, color: isPositive ? 'var(--success)' : 'var(--danger)', marginTop: 4, fontWeight: 500 }}>
            {change} vs last month
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { users, inbox } = useAdminStore()
  const { isDark } = useThemeStore()

  const dauData = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(new Date(), 29 - i), 'MMM d'),
    users: Math.floor(Math.random() * 40 + 20),
  })), [])

  const revenueData = [
    { month: 'Nov', revenue: 3200 },
    { month: 'Dec', revenue: 4100 },
    { month: 'Jan', revenue: 3800 },
    { month: 'Feb', revenue: 4600 },
    { month: 'Mar', revenue: 5200 },
    { month: 'Apr', revenue: 4900 },
  ]

  const planData = [
    { name: 'Free', value: users.filter(u => u.plan === 'Free').length },
    { name: 'Pro', value: users.filter(u => u.plan === 'Pro').length },
    { name: 'Enterprise', value: users.filter(u => u.plan === 'Enterprise').length },
  ]

  const recentActivity = [
    { text: 'Sarah Chen submitted a bug report', time: '2m ago', dot: '#EF4444' },
    { text: 'Marcus Williams viewed analytics', time: '15m ago', dot: '#2563EB' },
    { text: 'Emily Rodriguez upgraded to Pro', time: '1h ago', dot: '#10B981' },
    { text: 'James Park signed up', time: '2h ago', dot: '#0EA5E9' },
    { text: 'Lisa Thompson sent feedback', time: '3h ago', dot: '#F59E0B' },
    { text: 'David Kim exported patient data', time: '4h ago', dot: '#2563EB' },
    { text: 'Rachel Green created account', time: '5h ago', dot: '#0EA5E9' },
    { text: 'Tom Bradley subscription renewed', time: '6h ago', dot: '#10B981' },
    { text: 'Sarah Chen updated profile', time: '8h ago', dot: '#2563EB' },
    { text: 'Marcus Williams added 3 patients', time: '10h ago', dot: '#2563EB' },
  ]

  const topUsers = [...users].sort((a, b) => b.usageHours - a.usageHours).slice(0, 5)
  const unread = inbox.filter(m => m.status === 'Unread').length
  const gridColor = isDark ? '#334155' : '#E2E8F0'
  const tooltipStyle = { background: isDark ? '#1E293B' : '#fff', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Overview</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>Welcome back, Super Admin</p>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <KpiCard icon={Users} label="Total Users" value={users.length.toString()} change="+12%" color="#2563EB" />
        <KpiCard icon={TrendingUp} label="Active Users Today" value="34" change="+8%" color="#10B981" />
        <KpiCard icon={DollarSign} label="Total Revenue" value="$4,744" change="+18%" color="#0EA5E9" />
        <KpiCard icon={Clock} label="Avg Session Duration" value="24m" change="+3%" color="#F59E0B" />
        <KpiCard icon={MessageSquare} label="Open Inbox Items" value={unread.toString()} color="#EF4444" />
        <KpiCard icon={UserPlus} label="New Sign-ups This Week" value="3" change="+2%" color="#8B5CF6" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* DAU Line Chart */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Daily Active Users (30 days)</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dauData}>
              <defs>
                <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} interval={6} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="users" stroke="#2563EB" fill="url(#dauGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Bar Chart */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Revenue by Month</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`$${v}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut + Activity row */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        {/* Donut */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>User Plan Breakdown</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={planData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                {planData.map((_, i) => <Cell key={i} fill={PLAN_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Feed */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Recent Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentActivity.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{item.text}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Users Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Top 5 Users by Usage</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['User', 'Plan', 'Usage Hours', 'Amount Spent', 'Last Active'].map((h) => (
                <th key={h} style={{ textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--muted)', padding: '0 0 12px', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topUsers.map((u, i) => (
              <tr key={u.id}>
                <td style={{ padding: '12px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>{u.avatar}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                    background: u.plan === 'Enterprise' ? '#0EA5E920' : u.plan === 'Pro' ? '#2563EB20' : '#64748B20',
                    color: u.plan === 'Enterprise' ? '#0EA5E9' : u.plan === 'Pro' ? '#2563EB' : '#64748B',
                  }}>{u.plan}</span>
                </td>
                <td style={{ padding: '12px 0', fontSize: 13, color: 'var(--text)', fontWeight: 500, borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>{u.usageHours}h</td>
                <td style={{ padding: '12px 0', fontSize: 13, color: 'var(--text)', fontWeight: 500, borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>${u.amountSpent}</td>
                <td style={{ padding: '12px 0', fontSize: 13, color: 'var(--muted)', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>{u.lastActive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
