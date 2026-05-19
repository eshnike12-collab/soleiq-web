import { useState, useMemo } from 'react'
import { Search, Download, Shield, Trash2, UserX, CreditCard, MessageSquare, LogIn, Settings, Radio } from 'lucide-react'
import { mockAuditLog } from '../data/mockData'
import { formatDateTime } from '../utils/formatters'
import { useThemeStore } from '../store/useThemeStore'
import type { AuditEntry } from '../types'

const ACTION_ICONS: Record<AuditEntry['actionType'], any> = {
  user_suspend: UserX, user_delete: Trash2, plan_change: CreditCard,
  message_reply: MessageSquare, export: Download, login: LogIn,
  settings_change: Settings, broadcast: Radio,
}
const ACTION_COLORS: Record<AuditEntry['actionType'], string> = {
  user_suspend: '#F59E0B', user_delete: '#EF4444', plan_change: '#2563EB',
  message_reply: '#10B981', export: '#0EA5E9', login: '#64748B',
  settings_change: '#8B5CF6', broadcast: '#F59E0B',
}

export default function AuditLog() {
  const { isDark } = useThemeStore()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('All')

  const filtered = useMemo(() => {
    const now = new Date('2026-04-02')
    return mockAuditLog.filter(e => {
      const matchSearch = !search || e.action.toLowerCase().includes(search.toLowerCase()) || e.target.toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === 'All' || e.actionType === typeFilter
      let matchDate = true
      if (dateFilter === '24h') matchDate = (now.getTime() - new Date(e.date).getTime()) < 86400000
      if (dateFilter === '7d') matchDate = (now.getTime() - new Date(e.date).getTime()) < 604800000
      return matchSearch && matchType && matchDate
    })
  }, [search, typeFilter, dateFilter])

  const exportCSV = () => {
    const rows = [['Time','Admin','Action','Target','Details','IP'], ...filtered.map(e => [formatDateTime(e.date), e.admin, e.action, e.target, e.details, e.ip])]
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'audit_log.csv'; a.click()
  }

  const inputStyle = {
    padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)',
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    color: 'var(--text)', fontSize: 13, outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Audit Log</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>All administrative actions recorded</p>
        </div>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...inputStyle as any, flex: 1, minWidth: 200 }}>
          <Search size={14} color="var(--muted)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actions or targets..." style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', width: '100%' }} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...inputStyle as any, cursor: 'pointer' }}>
          <option value="All">All Actions</option>
          <option value="user_suspend">Suspend User</option>
          <option value="user_delete">Delete User</option>
          <option value="plan_change">Plan Change</option>
          <option value="message_reply">Message Reply</option>
          <option value="export">Export</option>
          <option value="login">Login</option>
          <option value="settings_change">Settings Change</option>
          <option value="broadcast">Broadcast</option>
        </select>
        <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ ...inputStyle as any, cursor: 'pointer' }}>
          <option value="All">All Time</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 days</option>
        </select>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
            <Shield size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div>No audit entries match your filters.</div>
          </div>
        ) : filtered.map((entry, i) => {
          const Icon = ACTION_ICONS[entry.actionType]
          const color = ACTION_COLORS[entry.actionType]
          return (
            <div key={entry.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <Icon size={16} color={color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{entry.action}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>by {entry.admin}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{entry.target}</span>
                  {entry.details && <span> — {entry.details}</span>}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{formatDateTime(entry.date)}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>{entry.ip}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
