import { Bell, Sun, Moon, Search } from 'lucide-react'
import { useThemeStore } from '../../store/useThemeStore'
import { useAdminStore } from '../../store/useAdminStore'
import { useLocation } from 'react-router-dom'

const breadcrumbs: Record<string, string> = {
  '/': 'Dashboard',
  '/users': 'Users',
  '/analytics': 'Analytics',
  '/inbox': 'Inbox',
  '/subscriptions': 'Subscriptions',
  '/audit': 'Audit Log',
  '/settings': 'Settings',
}

export default function Header() {
  const { isDark, toggle } = useThemeStore()
  const { inbox } = useAdminStore()
  const location = useLocation()
  const unread = inbox.filter((m) => m.status === 'Unread').length
  const page = breadcrumbs[location.pathname] || 'Admin'

  return (
    <header style={{
      height: 60,
      background: 'var(--header-bg)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 30,
    }}>
      {/* Breadcrumb */}
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>SoleIQ Admin</span>
        <span style={{ fontSize: 12, color: 'var(--muted)', margin: '0 6px' }}>/</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{page}</span>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        border: '1px solid var(--border)',
        borderRadius: 8, padding: '6px 12px', width: 220,
      }}>
        <Search size={14} color="var(--muted)" />
        <input
          placeholder="Search users, messages..."
          style={{
            background: 'none', border: 'none', outline: 'none',
            fontSize: 13, color: 'var(--text)', width: '100%',
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={toggle}
          style={{
            width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--muted)',
          }}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button style={{
          width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)',
          background: 'transparent', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted)', position: 'relative',
        }}>
          <Bell size={16} />
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: 6, right: 6,
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--danger)',
            }} />
          )}
        </button>

        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          SA
        </div>
      </div>
    </header>
  )
}
