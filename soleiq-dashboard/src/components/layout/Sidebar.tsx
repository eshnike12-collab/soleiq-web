import { Link } from 'react-router-dom';
import { LayoutDashboard, Map, TrendingUp, Zap, Bell, User, Settings, ArrowLeft } from 'lucide-react';
import { useDashboard, ActiveSection } from '../../context/DashboardContext';
import { useUser } from '../../context/UserContext';

interface NavItem {
  id: ActiveSection;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'solemap', label: 'Sole Map', icon: <Map size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={18} /> },
  { id: 'therapy', label: 'My Therapy', icon: <Zap size={18} /> },
  { id: 'alerts', label: 'Alerts', icon: <Bell size={18} />, badge: 2 },
  { id: 'profile', label: 'My Profile', icon: <User size={18} /> },
  { id: 'gear', label: 'My Gear', icon: <Settings size={18} /> },
];

const MOBILE_TABS: NavItem[] = [
  { id: 'overview', label: 'Home', icon: <LayoutDashboard size={20} /> },
  { id: 'solemap', label: 'Sole Map', icon: <Map size={20} /> },
  { id: 'therapy', label: 'Therapy', icon: <Zap size={20} /> },
  { id: 'alerts', label: 'Alerts', icon: <Bell size={20} /> },
  { id: 'profile', label: 'Profile', icon: <User size={20} /> },
];

export default function Sidebar() {
  const { activeSection, setActiveSection } = useDashboard();
  const { user } = useUser();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        style={{
          position: 'fixed',
          top: '60px',
          left: 0,
          width: '240px',
          height: 'calc(100vh - 60px)',
          background: 'var(--clr-surface-2)',
          borderRight: '1px solid var(--clr-border)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem 0.75rem',
          overflowY: 'auto',
        }}
        className="hidden-mobile"
      >
        {/* User card at top */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.75rem 0.5rem',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--clr-border)',
            paddingBottom: '1rem',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(78, 205, 196, 0.15)',
              border: '2px solid var(--clr-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--clr-accent)',
              fontFamily: 'Syne, sans-serif',
              flexShrink: 0,
            }}
          >
            {user.avatarInitials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--clr-text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.firstName} {user.lastName}
            </div>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                padding: '0.1rem 0.4rem',
                borderRadius: '10px',
                background: 'rgba(78, 205, 196, 0.15)',
                color: 'var(--clr-accent)',
                border: '1px solid var(--clr-border)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              {user.subscription.plan} ✓
            </span>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1 }}>
          <p
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--clr-text-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0 0.5rem',
              marginBottom: '0.5rem',
            }}
          >
            Navigation
          </p>
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  background: isActive ? 'var(--clr-glow)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--clr-accent)' : '3px solid transparent',
                  borderRadius: '0 10px 10px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.625rem 1rem',
                  color: isActive ? 'var(--clr-accent)' : 'var(--clr-text-muted)',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '2px',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--clr-glow)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--clr-text)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--clr-text-muted)';
                  }
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1 }}>
                  {item.icon}
                  <span>{item.label}</span>
                </span>
                {item.badge && (
                  <span
                    style={{
                      background: '#D97706',
                      color: '#fff',
                      borderRadius: '10px',
                      padding: '0.1rem 0.45rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      minWidth: '20px',
                      textAlign: 'center',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom: Back link */}
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--clr-border)' }}>
          <a
            href="http://localhost:5173"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem',
              width: '100%',
              padding: '0.5rem 1rem',
              background: 'transparent',
              color: 'var(--clr-text-muted)',
              border: '1px solid var(--clr-border)',
              borderRadius: '8px',
              fontSize: '0.875rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--clr-accent)';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--clr-accent)';
              (e.currentTarget as HTMLAnchorElement).style.background = 'var(--clr-glow)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--clr-text-muted)';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--clr-border)';
              (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
            }}
          >
            <ArrowLeft size={14} />
            Back to SoleIQ.com
          </a>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <div className="mobile-tab-bar">
        {MOBILE_TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '8px',
              color: activeSection === item.id ? 'var(--clr-accent)' : 'var(--clr-text-muted)',
              fontSize: '0.6rem',
              fontWeight: 600,
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .hidden-mobile { display: flex !important; }
        }
        @media (max-width: 767px) {
          .hidden-mobile { display: none !important; }
        }
      `}</style>
    </>
  );
}
