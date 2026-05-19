import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, BarChart2, Inbox,
  CreditCard, Shield, Settings, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useAdminStore } from '../../store/useAdminStore'
import { useThemeStore } from '../../store/useThemeStore'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/inbox', icon: Inbox, label: 'Inbox' },
  { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions' },
  { to: '/audit', icon: Shield, label: 'Audit Log' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, inbox } = useAdminStore()
  const { isDark } = useThemeStore()
  const unread = inbox.filter((m) => m.status === 'Unread').length

  return (
    <aside
      style={{
        width: sidebarCollapsed ? 64 : 240,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s ease',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 40,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
        <img
          src="/soleiq-logo.png"
          alt="SoleIQ"
          width={32}
          height={32}
          style={{ borderRadius: 8, objectFit: 'contain', flexShrink: 0 }}
        />
        {!sidebarCollapsed && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>SoleIQ</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>Super Admin</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 10px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: 13.5,
              color: isActive ? 'var(--primary)' : 'var(--muted)',
              background: isActive ? (isDark ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)') : 'transparent',
              whiteSpace: 'nowrap',
              position: 'relative',
            })}
          >
            <div style={{ flexShrink: 0, position: 'relative' }}>
              <Icon size={18} />
              {label === 'Inbox' && unread > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 14, height: 14, borderRadius: '50%',
                  background: 'var(--danger)', color: 'white',
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {unread}
                </span>
              )}
            </div>
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={toggleSidebar}
          style={{
            width: '100%', padding: '8px 10px',
            display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            gap: 8, borderRadius: 8, border: 'none',
            background: 'transparent', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 13, fontWeight: 500,
          }}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  )
}
