import { useState, useMemo, useRef } from 'react'
import { format } from 'date-fns'
import {
  Search, ChevronUp, ChevronDown, Eye, Plus, X,
  Download, UserX, Trash2, AlertTriangle, Check, ExternalLink
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useAdminStore } from '../store/useAdminStore'
import type { User } from '../store/useAdminStore'
import { useThemeStore } from '../store/useThemeStore'
import { subDays, format as dateFmt } from 'date-fns'

// ── helpers ────────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  Free: '#64748B',
  Pro: '#2563EB',
  Enterprise: '#0EA5E9',
}
const STATUS_COLORS: Record<string, string> = {
  Active: '#10B981',
  Inactive: '#64748B',
  Suspended: '#EF4444',
}

function PlanBadge({ plan }: { plan: User['plan'] }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: PLAN_COLORS[plan] + '20', color: PLAN_COLORS[plan],
    }}>{plan}</span>
  )
}

function StatusBadge({ status }: { status: User['status'] }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: STATUS_COLORS[status] + '20', color: STATUS_COLORS[status],
    }}>{status}</span>
  )
}

function Avatar({ initials, size = 36 }: { initials: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--primary)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  )
}

function usageMockData(userId: string) {
  return Array.from({ length: 30 }, (_, i) => ({
    date: dateFmt(subDays(new Date(), 29 - i), 'MMM d'),
    hours: Math.floor(Math.random() * 8 + 1 + (userId.charCodeAt(0) % 4)),
  }))
}

const mockTransactions = [
  { date: '2026-03-01', desc: 'Pro Plan – March', amount: 29, status: 'Paid' },
  { date: '2026-02-01', desc: 'Pro Plan – February', amount: 29, status: 'Paid' },
  { date: '2026-01-01', desc: 'Pro Plan – January', amount: 29, status: 'Paid' },
  { date: '2025-12-01', desc: 'Pro Plan – December', amount: 29, status: 'Paid' },
]

// ── Confirmation Modal ─────────────────────────────────────────────────────────

function ConfirmModal({
  title, message, confirmLabel, danger,
  onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string; danger?: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 28, maxWidth: 420, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <AlertTriangle size={22} color={danger ? '#EF4444' : '#F59E0B'} />
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{title}</span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontWeight: 500,
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: danger ? '#EF4444' : 'var(--primary)', color: '#fff',
            cursor: 'pointer', fontWeight: 600,
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ── Add User Drawer ────────────────────────────────────────────────────────────

function AddUserDrawer({ onClose }: { onClose: () => void }) {
  const addUser = useAdminStore((s) => s.addUser)
  const [form, setForm] = useState({ name: '', email: '', plan: 'Free' as User['plan'], status: 'Active' as User['status'] })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    const initials = form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    addUser({
      id: Date.now().toString(),
      name: form.name.trim(),
      email: form.email.trim(),
      plan: form.plan,
      status: form.status,
      joinDate: new Date().toISOString().split('T')[0],
      usageHours: 0,
      amountSpent: 0,
      lastActive: 'Just now',
      location: 'Unknown',
      avatar: initials,
    })
    onClose()
  }

  const inputStyle = (hasErr: boolean) => ({
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 14,
    border: `1px solid ${hasErr ? '#EF4444' : 'var(--border)'}`,
    background: 'var(--bg)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const,
  })
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, display: 'block' }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: 'var(--card)', borderLeft: '1px solid var(--border)',
        zIndex: 500, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Add New User</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
        </div>
        <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle(!!errors.name)} value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: '' })) }}
              placeholder="e.g. Jane Smith" />
            {errors.name && <span style={{ color: '#EF4444', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.name}</span>}
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle(!!errors.email)} value={form.email}
              onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: '' })) }}
              placeholder="jane@example.com" type="email" />
            {errors.email && <span style={{ color: '#EF4444', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.email}</span>}
          </div>
          <div>
            <label style={labelStyle}>Plan</label>
            <select style={inputStyle(false)} value={form.plan}
              onChange={e => setForm(f => ({ ...f, plan: e.target.value as User['plan'] }))}>
              <option>Free</option><option>Pro</option><option>Enterprise</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle(false)} value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as User['status'] }))}>
              <option>Active</option><option>Inactive</option><option>Suspended</option>
            </select>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontWeight: 500,
          }}>Cancel</button>
          <button onClick={handleSave} style={{
            padding: '9px 20px', borderRadius: 8, border: 'none',
            background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600,
          }}>Add User</button>
        </div>
      </div>
    </>
  )
}

// ── User Detail Drawer ─────────────────────────────────────────────────────────

type DetailTab = 'Overview' | 'Usage' | 'Billing' | 'Messages' | 'Notes'

function UserDetailDrawer({ user, onClose }: { user: User; onClose: () => void }) {
  const { inbox, updateUserStatus } = useAdminStore()
  const { isDark } = useThemeStore()
  const [tab, setTab] = useState<DetailTab>('Overview')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState<null | 'suspend' | 'delete' | 'reset'>(null)

  const usageData = useMemo(() => usageMockData(user.id), [user.id])
  const userMessages = inbox.filter(m => m.email === user.email)
  const chartColor = isDark ? '#2563EB' : '#2563EB'
  const gridColor = isDark ? '#334155' : '#E2E8F0'
  const textColor = isDark ? '#94A3B8' : '#64748B'

  const TABS: DetailTab[] = ['Overview', 'Usage', 'Billing', 'Messages', 'Notes']

  const totalHours = usageData.reduce((s, d) => s + d.hours, 0)
  const avgSession = (totalHours / 30).toFixed(1)
  const peakDay = usageData.reduce((max, d) => d.hours > max.hours ? d : max, usageData[0])

  return (
    <>
      {confirm && (
        <ConfirmModal
          title={confirm === 'suspend' ? 'Suspend Account' : confirm === 'delete' ? 'Delete Account' : 'Reset Password'}
          message={
            confirm === 'suspend' ? `Suspend ${user.name}'s account? They will lose access immediately.`
            : confirm === 'delete' ? `Permanently delete ${user.name}'s account? This cannot be undone.`
            : `Send a password reset email to ${user.email}?`
          }
          confirmLabel={confirm === 'suspend' ? 'Suspend' : confirm === 'delete' ? 'Delete' : 'Send Reset'}
          danger={confirm !== 'reset'}
          onConfirm={() => {
            if (confirm === 'suspend') updateUserStatus(user.id, 'Suspended')
            setConfirm(null)
            if (confirm === 'delete') onClose()
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        background: 'var(--card)', borderLeft: '1px solid var(--border)',
        zIndex: 500, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.18)', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <Avatar initials={user.avatar} size={52} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>{user.name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{user.email}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <PlanBadge plan={user.plan} />
                  <StatusBadge status={user.status} />
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: tab === t ? 'var(--primary)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--muted)',
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {tab === 'Overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Joined', value: format(new Date(user.joinDate), 'MMMM d, yyyy') },
                { label: 'Last Active', value: user.lastActive },
                { label: 'Location', value: user.location },
                { label: 'Plan', value: user.plan },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg)', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                {[
                  { label: 'Usage Hours', value: `${user.usageHours}h` },
                  { label: 'Total Spent', value: `$${user.amountSpent}` },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    background: 'var(--bg)', borderRadius: 10, padding: '14px 16px',
                    border: '1px solid var(--border)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontWeight: 500 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'Usage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Total Hours', value: `${totalHours}h` },
                  { label: 'Avg / Day', value: `${avgSession}h` },
                  { label: 'Peak Day', value: peakDay?.date ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    background: 'var(--bg)', borderRadius: 10, padding: '14px 12px',
                    border: '1px solid var(--border)', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, fontWeight: 500 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 12 }}>Daily Usage – Last 30 Days</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={usageData}>
                    <defs>
                      <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: textColor }} tickLine={false} interval={6} />
                    <YAxis tick={{ fontSize: 10, fill: textColor }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="hours" stroke={chartColor} strokeWidth={2} fill="url(#ug)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tab === 'Billing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Current Plan</span>
                <PlanBadge plan={user.plan} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Next Renewal</span>
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>May 1, 2026</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>Total Spent</span>
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>${user.amountSpent}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginTop: 8 }}>Transaction History</div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)' }}>
                      {['Date', 'Description', 'Amount', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mockTransactions.map((tx, i) => (
                      <tr key={i} style={{ borderBottom: i < mockTransactions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>{tx.date}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text)' }}>{tx.desc}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>${tx.amount}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ background: '#10B98120', color: '#10B981', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10 }}>{tx.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'Messages' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {userMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0', fontSize: 14 }}>No messages from this user</div>
              ) : userMessages.map(msg => (
                <div key={msg.id} style={{ padding: 16, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{msg.subject}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{format(new Date(msg.date), 'MMM d')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <span style={{ background: '#2563EB20', color: '#2563EB', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10 }}>{msg.type}</span>
                    <span style={{ background: 'var(--border)', color: 'var(--muted)', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10 }}>{msg.status}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>{msg.body}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'Notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Admin notes are saved locally per session.</div>
              <textarea
                value={notes[user.id] ?? ''}
                onChange={e => setNotes(n => ({ ...n, [user.id]: e.target.value }))}
                rows={8}
                placeholder="Add internal notes about this user..."
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
                  fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
              <button style={{
                alignSelf: 'flex-start', padding: '8px 20px', borderRadius: 8, border: 'none',
                background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              }}>Save Notes</button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { label: 'Suspend', action: () => setConfirm('suspend'), color: '#F59E0B' },
            { label: 'Reset Password', action: () => setConfirm('reset'), color: '#2563EB' },
            { label: 'Delete Account', action: () => setConfirm('delete'), color: '#EF4444' },
          ].map(({ label, action, color }) => (
            <button key={label} onClick={action} style={{
              padding: '7px 14px', borderRadius: 8, border: `1px solid ${color}40`,
              background: color + '10', color, cursor: 'pointer', fontWeight: 600, fontSize: 12,
            }}>{label}</button>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Sort Icon ──────────────────────────────────────────────────────────────────

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: 'asc' | 'desc' }) {
  if (col !== sortCol) return <ChevronUp size={12} style={{ opacity: 0.3 }} />
  return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
}

// ── Main Users Page ────────────────────────────────────────────────────────────

type SortCol = 'name' | 'plan' | 'status' | 'joinDate' | 'lastActive' | 'amountSpent' | 'usageHours'

export default function Users() {
  const { users, deleteUsers, updateUserStatus } = useAdminStore()

  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<'All' | User['plan']>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | User['status']>('All')
  const [sortCol, setSortCol] = useState<SortCol>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detailUser, setDetailUser] = useState<User | null>(null)
  const [showAddDrawer, setShowAddDrawer] = useState(false)
  const [confirm, setConfirm] = useState<null | 'suspend_bulk' | 'delete_bulk'>(null)
  const PAGE_SIZE = 5

  const filtered = useMemo(() => {
    let list = [...users]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    }
    if (planFilter !== 'All') list = list.filter(u => u.plan === planFilter)
    if (statusFilter !== 'All') list = list.filter(u => u.status === statusFilter)
    list.sort((a, b) => {
      let av: any = a[sortCol], bv: any = b[sortCol]
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [users, search, planFilter, statusFilter, sortCol, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (paginated.every(u => selected.has(u.id))) {
      setSelected(prev => { const n = new Set(prev); paginated.forEach(u => n.delete(u.id)); return n })
    } else {
      setSelected(prev => { const n = new Set(prev); paginated.forEach(u => n.add(u.id)); return n })
    }
  }

  function exportCSV() {
    const rows = users.filter(u => selected.has(u.id))
    const header = 'Name,Email,Plan,Status,Join Date,Usage Hours,Amount Spent'
    const body = rows.map(u => `${u.name},${u.email},${u.plan},${u.status},${u.joinDate},${u.usageHours},${u.amountSpent}`).join('\n')
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'users.csv'; a.click()
  }

  const thStyle = (col: SortCol): React.CSSProperties => ({
    padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600,
    color: 'var(--muted)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border)',
  })

  const tdStyle: React.CSSProperties = {
    padding: '13px 16px', fontSize: 13, color: 'var(--text)', borderBottom: '1px solid var(--border)',
  }

  const selectStyle: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
  }

  return (
    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Confirm modals */}
      {confirm === 'delete_bulk' && (
        <ConfirmModal
          title="Delete Selected Users"
          message={`Permanently delete ${selected.size} user(s)? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => { deleteUsers(Array.from(selected)); setSelected(new Set()); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'suspend_bulk' && (
        <ConfirmModal
          title="Suspend Selected Users"
          message={`Suspend ${selected.size} user(s)? They will lose access immediately.`}
          confirmLabel="Suspend"
          danger
          onConfirm={() => {
            Array.from(selected).forEach(id => updateUserStatus(id, 'Suspended'))
            setSelected(new Set()); setConfirm(null)
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {showAddDrawer && <AddUserDrawer onClose={() => setShowAddDrawer(false)} />}
      {detailUser && <UserDetailDrawer user={detailUser} onClose={() => setDetailUser(null)} />}

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Users</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>{users.length} total users</p>
        </div>
        <button onClick={() => setShowAddDrawer(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 18px', borderRadius: 8, border: 'none',
          background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13,
        }}>
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180, maxWidth: 340 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name or email…"
            style={{
              width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)',
              fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <select style={selectStyle} value={planFilter}
          onChange={e => { setPlanFilter(e.target.value as any); setPage(1) }}>
          <option value="All">All Plans</option>
          <option>Free</option><option>Pro</option><option>Enterprise</option>
        </select>
        <select style={selectStyle} value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as any); setPage(1) }}>
          <option value="All">All Statuses</option>
          <option>Active</option><option>Inactive</option><option>Suspended</option>
        </select>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
          background: '#2563EB10', border: '1px solid #2563EB40', borderRadius: 10,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', marginRight: 4 }}>
            {selected.size} selected
          </span>
          <button onClick={exportCSV} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}><Download size={13} /> Export CSV</button>
          <button onClick={() => setConfirm('suspend_bulk')} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8,
            border: '1px solid #F59E0B40', background: '#F59E0B10', color: '#F59E0B',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}><UserX size={13} /> Suspend Selected</button>
          <button onClick={() => setConfirm('delete_bulk')} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8,
            border: '1px solid #EF444440', background: '#EF444410', color: '#EF4444',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}><Trash2 size={13} /> Delete Selected</button>
          <button onClick={() => setSelected(new Set())} style={{
            marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', display: 'flex', alignItems: 'center',
          }}><X size={16} /></button>
        </div>
      )}

      {/* Table */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead style={{ background: 'var(--bg)' }}>
              <tr>
                <th style={{ ...thStyle('name'), width: 40 }}>
                  <input type="checkbox"
                    checked={paginated.length > 0 && paginated.every(u => selected.has(u.id))}
                    onChange={toggleAll} style={{ cursor: 'pointer' }} />
                </th>
                {(['name', 'plan', 'status', 'joinDate', 'lastActive', 'amountSpent', 'usageHours'] as SortCol[]).map(col => (
                  <th key={col} style={thStyle(col)} onClick={() => toggleSort(col)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {col === 'name' ? 'User' : col === 'joinDate' ? 'Joined' : col === 'lastActive' ? 'Last Active' : col === 'amountSpent' ? 'Spent' : col === 'usageHours' ? 'Hours' : col.charAt(0).toUpperCase() + col.slice(1)}
                      <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
                    </div>
                  </th>
                ))}
                <th style={{ ...thStyle('name'), cursor: 'default' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>No users found</td></tr>
              ) : paginated.map(user => (
                <tr key={user.id}
                  onClick={() => setDetailUser(user)}
                  style={{
                    cursor: 'pointer',
                    background: selected.has(user.id) ? '#2563EB08' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!selected.has(user.id)) (e.currentTarget as HTMLElement).style.background = 'var(--bg)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selected.has(user.id) ? '#2563EB08' : 'transparent' }}
                >
                  <td style={tdStyle} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(user.id)}
                      onChange={() => toggleSelect(user.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar initials={user.avatar} size={32} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{user.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}><PlanBadge plan={user.plan} /></td>
                  <td style={tdStyle}><StatusBadge status={user.status} /></td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{format(new Date(user.joinDate), 'MMM d, yyyy')}</td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{user.lastActive}</td>
                  <td style={tdStyle}>${user.amountSpent}</td>
                  <td style={tdStyle}>{user.usageHours}h</td>
                  <td style={tdStyle} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={() => setDetailUser(user)} title="View details" style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--muted)', display: 'flex', alignItems: 'center', padding: 4,
                      }}><Eye size={16} /></button>
                      <a
                        href={`http://localhost:5200/?userId=${encodeURIComponent(user.id)}&userName=${encodeURIComponent(user.name)}&userEmail=${encodeURIComponent(user.email)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open patient dashboard"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--muted)', display: 'flex', alignItems: 'center', padding: 4,
                          textDecoration: 'none',
                        }}
                      ><ExternalLink size={16} /></a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderTop: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
              padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text)', cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.5 : 1, fontSize: 12,
            }}>Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} style={{
                padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
                background: page === p ? 'var(--primary)' : 'var(--bg)',
                color: page === p ? '#fff' : 'var(--text)', cursor: 'pointer', fontSize: 12, fontWeight: page === p ? 600 : 400,
              }}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{
              padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text)', cursor: page === totalPages ? 'not-allowed' : 'pointer',
              opacity: page === totalPages ? 0.5 : 1, fontSize: 12,
            }}>Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
