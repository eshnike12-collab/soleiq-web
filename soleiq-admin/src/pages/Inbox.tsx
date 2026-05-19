import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import {
  Search, Mail, Bug, Lightbulb, MessageSquare, HeadphonesIcon,
  CheckCircle, Archive, Trash2, AlertOctagon, X, Clock, MessageCircle
} from 'lucide-react'
import { useAdminStore } from '../store/useAdminStore'
import type { InboxMessage } from '../store/useAdminStore'
import { useThemeStore } from '../store/useThemeStore'

// ── Types ──────────────────────────────────────────────────────────────────────
type FilterPill = 'All' | InboxMessage['type'] | 'Unread'

// ── Badge helpers ──────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<InboxMessage['type'], { color: string; icon: any }> = {
  Bug:        { color: '#EF4444', icon: Bug },
  Suggestion: { color: '#2563EB', icon: Lightbulb },
  Feedback:   { color: '#10B981', icon: MessageSquare },
  Support:    { color: '#F59E0B', icon: HeadphonesIcon },
}

const STATUS_COLORS: Record<InboxMessage['status'], string> = {
  Unread:      '#2563EB',
  Read:        '#64748B',
  'In Progress': '#F59E0B',
  Resolved:    '#10B981',
  Archived:    '#94A3B8',
}

const PRIORITY_COLORS: Record<InboxMessage['priority'], string> = {
  Low:      '#64748B',
  Medium:   '#2563EB',
  High:     '#F59E0B',
  Critical: '#EF4444',
}

function TypeBadge({ type }: { type: InboxMessage['type'] }) {
  const { color } = TYPE_CONFIG[type]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: color + '20', color,
    }}>{type}</span>
  )
}

function StatusBadge({ status }: { status: InboxMessage['status'] }) {
  const color = STATUS_COLORS[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: color + '20', color,
    }}>{status}</span>
  )
}

function PriorityBadge({ priority }: { priority: InboxMessage['priority'] }) {
  const color = PRIORITY_COLORS[priority]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: color + '20', color,
    }}>{priority}</span>
  )
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--primary)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 700, flexShrink: 0,
    }}>{initials}</div>
  )
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '12px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--text)',
      fontWeight: 500,
    }}>
      <CheckCircle size={16} color="#10B981" />
      {message}
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', marginLeft: 4 }}><X size={14} /></button>
    </div>
  )
}

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 28, maxWidth: 400, width: '90%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <AlertOctagon size={20} color="#EF4444" />
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
            background: '#EF4444', color: '#fff', cursor: 'pointer', fontWeight: 600,
          }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── Stat Card (top bar) ────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 120px',
    }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: color ?? 'var(--text)' }}>{value}</span>
    </div>
  )
}

// ── Main Inbox Page ────────────────────────────────────────────────────────────
export default function Inbox() {
  const { inbox, updateMessage, deleteMessage, markMessageRead } = useAdminStore()
  const { isDark } = useThemeStore()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterPill>('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const selectedMsg = inbox.find(m => m.id === selectedId) ?? null

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Stats
  const totalOpen = inbox.filter(m => m.status !== 'Resolved' && m.status !== 'Archived').length
  const bugs = inbox.filter(m => m.type === 'Bug').length
  const suggestions = inbox.filter(m => m.type === 'Suggestion').length
  const resolvedToday = inbox.filter(m => m.status === 'Resolved').length

  const filtered = useMemo(() => {
    let list = [...inbox]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.from.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q)
      )
    }
    if (filter === 'Unread') list = list.filter(m => m.status === 'Unread')
    else if (filter !== 'All') list = list.filter(m => m.type === filter)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [inbox, search, filter])

  function selectMessage(id: string) {
    setSelectedId(id)
    const msg = inbox.find(m => m.id === id)
    if (msg && msg.status === 'Unread') {
      markMessageRead(id)
    }
  }

  function handleDelete() {
    if (!selectedId) return
    deleteMessage(selectedId)
    setSelectedId(null)
    setConfirmDelete(false)
    showToast('Message deleted')
  }

  function handleMarkResolved() {
    if (!selectedId) return
    updateMessage(selectedId, { status: 'Resolved' })
    showToast('Marked as resolved')
  }

  function handleArchive() {
    if (!selectedId) return
    updateMessage(selectedId, { status: 'Archived' })
    showToast('Message archived')
  }

  function handleEscalate() {
    if (!selectedId) return
    updateMessage(selectedId, { priority: 'Critical', status: 'In Progress' })
    showToast('Message escalated to Critical / In Progress')
  }

  const PILLS: FilterPill[] = ['All', 'Unread', 'Bugs' as any, 'Suggestions' as any, 'Feedback' as any, 'Support' as any]
  const PILL_MAP: Record<string, FilterPill> = {
    All: 'All', Unread: 'Unread', Bugs: 'Bug', Suggestions: 'Suggestion', Feedback: 'Feedback', Support: 'Support',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      {confirmDelete && (
        <ConfirmModal
          title="Delete Message"
          message="Permanently delete this message? This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <div style={{ padding: '20px 32px 0', flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px' }}>Inbox</h1>
        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <StatCard label="Total Open" value={totalOpen} color="#2563EB" />
          <StatCard label="Bugs" value={bugs} color="#EF4444" />
          <StatCard label="Suggestions" value={suggestions} color="#2563EB" />
          <StatCard label="Avg Response Time" value="4.2h" />
          <StatCard label="Resolved Today" value={resolvedToday} color="#10B981" />
        </div>
      </div>

      {/* Split pane */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 0, padding: '0 32px 28px' }}>
        {/* ── Left panel ─────────────────────────────────────────────────────── */}
        <div style={{
          width: 360, flexShrink: 0,
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
          display: 'flex', flexDirection: 'column', overflow: 'hidden', marginRight: 16,
        }}>
          {/* Search */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search messages…"
                style={{
                  width: '100%', padding: '7px 10px 7px 28px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Filter pills */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {PILLS.map(pill => {
              const mapped = PILL_MAP[pill]
              const active = filter === mapped
              return (
                <button key={pill} onClick={() => setFilter(mapped)} style={{
                  padding: '4px 10px', borderRadius: 16, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: active ? 'var(--primary)' : 'var(--bg)',
                  color: active ? '#fff' : 'var(--muted)',
                  transition: 'all 0.15s',
                }}>{pill}</button>
              )
            })}
          </div>

          {/* Message list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No messages found</div>
            ) : filtered.map(msg => {
              const isSelected = msg.id === selectedId
              const isUnread = msg.status === 'Unread'
              const typeConf = TYPE_CONFIG[msg.type]
              return (
                <div
                  key={msg.id}
                  onClick={() => selectMessage(msg.id)}
                  style={{
                    padding: '12px 14px', cursor: 'pointer',
                    borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                    borderBottom: '1px solid var(--border)',
                    background: isSelected ? 'var(--primary)10' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Avatar name={msg.from} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: isUnread ? 700 : 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                          {msg.from}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {isUnread && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />}
                          <span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                            {format(new Date(msg.date), 'MMM d')}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: isUnread ? 600 : 400, color: isUnread ? 'var(--text)' : 'var(--muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {msg.subject}
                      </div>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <TypeBadge type={msg.type} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                        {msg.body}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right panel ────────────────────────────────────────────────────── */}
        <div style={{
          flex: 1, background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0,
        }}>
          {!selectedMsg ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--muted)' }}>
              <Mail size={40} strokeWidth={1.5} />
              <span style={{ fontSize: 15, fontWeight: 500 }}>Select a message to read</span>
              <span style={{ fontSize: 13 }}>{filtered.length} message{filtered.length !== 1 ? 's' : ''} in view</span>
            </div>
          ) : (
            <>
              {/* Message header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                  <Avatar name={selectedMsg.from} size={44} />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', cursor: 'pointer', display: 'inline' }}
                      onClick={() => showToast(`User detail: ${selectedMsg.from}`)}
                    >{selectedMsg.from}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{selectedMsg.email}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      <TypeBadge type={selectedMsg.type} />
                      {/* Editable priority */}
                      <select
                        value={selectedMsg.priority}
                        onChange={e => updateMessage(selectedMsg.id, { priority: e.target.value as InboxMessage['priority'] })}
                        style={{
                          padding: '2px 6px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                          background: PRIORITY_COLORS[selectedMsg.priority] + '20',
                          color: PRIORITY_COLORS[selectedMsg.priority],
                          outline: 'none',
                        }}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                      {/* Editable status */}
                      <select
                        value={selectedMsg.status}
                        onChange={e => updateMessage(selectedMsg.id, { status: e.target.value as InboxMessage['status'] })}
                        style={{
                          padding: '2px 6px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                          background: STATUS_COLORS[selectedMsg.status] + '20',
                          color: STATUS_COLORS[selectedMsg.status],
                          outline: 'none',
                        }}
                      >
                        <option value="Unread">Unread</option>
                        <option value="Read">Read</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} />
                    {format(new Date(selectedMsg.date), 'MMM d, yyyy · h:mm a')}
                  </div>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{selectedMsg.subject}</h3>
              </div>

              {/* Message body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{
                  background: 'var(--bg)', borderRadius: 10, padding: '16px 18px',
                  fontSize: 14, color: 'var(--text)', lineHeight: 1.7,
                  border: '1px solid var(--border)',
                }}>
                  {selectedMsg.body}
                </div>

                {/* Admin response */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageCircle size={14} /> Admin Note
                  </div>
                  <textarea
                    value={selectedMsg.adminNote}
                    onChange={e => updateMessage(selectedMsg.id, { adminNote: e.target.value })}
                    rows={4}
                    placeholder="Add an internal note or response…"
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8,
                      border: '1px solid var(--border)', background: 'var(--bg)',
                      color: 'var(--text)', fontSize: 13, resize: 'vertical',
                      outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      onClick={() => { updateMessage(selectedMsg.id, { adminNote: selectedMsg.adminNote }); showToast('Note saved') }}
                      style={{
                        padding: '7px 16px', borderRadius: 8, border: 'none',
                        background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 12,
                      }}
                    >Save Note</button>
                    <button
                      onClick={handleMarkResolved}
                      style={{
                        padding: '7px 16px', borderRadius: 8, border: '1px solid #10B98140',
                        background: '#10B98110', color: '#10B981', cursor: 'pointer', fontWeight: 600, fontSize: 12,
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    ><CheckCircle size={13} /> Mark Resolved</button>
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div style={{
                padding: '14px 24px', borderTop: '1px solid var(--border)',
                display: 'flex', gap: 8, flexWrap: 'wrap',
              }}>
                <button onClick={handleEscalate} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                  border: '1px solid #EF444440', background: '#EF444410', color: '#EF4444',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}><AlertOctagon size={13} /> Escalate</button>
                <button onClick={handleArchive} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--muted)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}><Archive size={13} /> Archive</button>
                <button onClick={() => setConfirmDelete(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                  border: '1px solid #EF444440', background: '#EF444410', color: '#EF4444',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600, marginLeft: 'auto',
                }}><Trash2 size={13} /> Delete</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
