import { useState, useMemo } from 'react'
import { DollarSign, Users, AlertCircle, TrendingUp, Download, X } from 'lucide-react'
import { mockSubscriptions, mockTransactions } from '../data/mockData'
import type { Subscription } from '../types'
import { formatCurrency, formatDate } from '../utils/formatters'
import { useThemeStore } from '../store/useThemeStore'

const PLAN_COLORS = { Free: '#64748B', Pro: '#2563EB', Enterprise: '#0EA5E9' }
const STATUS_COLORS = { Active: '#10B981', 'Past Due': '#F59E0B', Cancelled: '#EF4444', Trial: '#8B5CF6' }

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: color + '20', color }}>
      {label}
    </span>
  )
}

function KpiCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
      </div>
    </div>
  )
}

export default function Subscriptions() {
  const { isDark } = useThemeStore()
  const [planFilter, setPlanFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState<Subscription | null>(null)

  const subs = useMemo(() => mockSubscriptions.filter(s =>
    (planFilter === 'All' || s.plan === planFilter) &&
    (statusFilter === 'All' || s.status === statusFilter)
  ), [planFilter, statusFilter])

  const totalMRR = mockSubscriptions.filter(s => s.status === 'Active').reduce((a, s) => a + s.mrr, 0)
  const pastDue = mockSubscriptions.filter(s => s.status === 'Past Due').length
  const trial = mockSubscriptions.filter(s => s.status === 'Trial').length

  const userTxns = selected ? mockTransactions.filter(t => t.subscriptionId === selected.id) : []

  const exportCSV = () => {
    const rows = [['Name','Email','Plan','Status','MRR','Renewal','Payment'], ...subs.map(s => [s.userName, s.email, s.plan, s.status, s.mrr, s.renewalDate, `****${s.paymentLast4}`])]
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'billing_report.csv'; a.click()
  }

  const selectStyle = {
    padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)',
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    color: 'var(--text)', fontSize: 13, cursor: 'pointer', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Subscriptions & Billing</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>{mockSubscriptions.length} total subscriptions</p>
        </div>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Download size={15} /> Export Billing Report
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KpiCard icon={DollarSign} label="Total MRR" value={formatCurrency(totalMRR)} sub="Monthly recurring revenue" color="#2563EB" />
        <KpiCard icon={TrendingUp} label="Total ARR" value={formatCurrency(totalMRR * 12)} sub="Annual recurring revenue" color="#10B981" />
        <KpiCard icon={Users} label="Trial Users" value={trial} sub="Currently in trial period" color="#8B5CF6" />
        <KpiCard icon={AlertCircle} label="Past Due" value={pastDue} sub="Require attention" color="#EF4444" />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} style={selectStyle}>
          <option value="All">All Plans</option>
          <option value="Pro">Pro</option>
          <option value="Enterprise">Enterprise</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Past Due">Past Due</option>
          <option value="Trial">Trial</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              {['User','Plan','MRR','Billing Cycle','Status','Renewal Date','Payment'].map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--muted)', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>No subscriptions match the current filters.</td></tr>
            ) : subs.map((s, i) => (
              <tr key={s.id} onClick={() => setSelected(s)} style={{ cursor: 'pointer', borderBottom: i < subs.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{s.avatar}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.userName}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}><Badge label={s.plan} color={PLAN_COLORS[s.plan]} /></td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{formatCurrency(s.mrr)}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{s.billingCycle}</td>
                <td style={{ padding: '12px 16px' }}><Badge label={s.status} color={STATUS_COLORS[s.status]} /></td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{formatDate(s.renewalDate)}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)', fontFamily: 'monospace' }}>****{s.paymentLast4}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setSelected(null)}>
          <div style={{ background: 'var(--card)', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '80vh', overflow: 'auto', padding: 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{selected.userName}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{selected.email}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Plan', value: selected.plan },
                { label: 'Status', value: selected.status },
                { label: 'MRR', value: formatCurrency(selected.mrr) },
                { label: 'Billing Cycle', value: selected.billingCycle },
                { label: 'Start Date', value: formatDate(selected.startDate) },
                { label: 'Renewal Date', value: formatDate(selected.renewalDate) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Transaction History</div>
            {userTxns.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13, padding: '16px 0' }}>No transactions found.</div>
            ) : userTxns.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.description}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{formatDate(t.date)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{formatCurrency(t.amount)}</span>
                  <Badge label={t.status} color={t.status === 'Paid' ? '#10B981' : t.status === 'Failed' ? '#EF4444' : '#F59E0B'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
