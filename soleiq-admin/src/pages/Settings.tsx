import { useState } from 'react'
import { useThemeStore } from '../store/useThemeStore'
import { User, Mail, Lock, Bell, Palette, Users, Plus, Check } from 'lucide-react'

const TABS = [
  { id: 'general', label: 'General', icon: User },
  { id: 'profile', label: 'Admin Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'team', label: 'Team', icon: Users },
]

const teamMembers = [
  { name: 'Super Admin', email: 'admin@soleiq.com', role: 'Super Admin', avatar: 'SA', active: true },
  { name: 'Support Agent', email: 'support@soleiq.com', role: 'Support', avatar: 'SA', active: true },
  { name: 'Read Only User', email: 'readonly@soleiq.com', role: 'Read-Only', avatar: 'RO', active: false },
]

const ACCENT_COLORS = ['#2563EB','#0EA5E9','#10B981','#8B5CF6','#F59E0B','#EF4444','#EC4899','#14B8A6']

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: checked ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: checked ? 21 : 3, transition: 'left 0.2s' }} />
    </button>
  )
}

function InputRow({ label, defaultValue, type = 'text' }: { label: string; defaultValue: string; type?: string }) {
  const { isDark } = useThemeStore()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</label>
      <input defaultValue={defaultValue} type={type} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
    </div>
  )
}

export default function Settings() {
  const { isDark, toggle } = useThemeStore()
  const [activeTab, setActiveTab] = useState('general')
  const [accent, setAccent] = useState('#2563EB')
  const [saved, setSaved] = useState(false)
  const [notifs, setNotifs] = useState({
    newBugReport: true, newSignup: true, paymentFailed: true,
    planUpgrade: false, newFeedback: false, weeklyReport: true,
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const cardStyle = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 16 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>Manage your admin preferences</p>
      </div>

      <div style={{ display: 'flex', gap: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 6, width: 'fit-content' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: activeTab === id ? (isDark ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.1)') : 'transparent', color: activeTab === id ? 'var(--primary)' : 'var(--muted)', transition: 'all 0.15s' }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>Platform Settings</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
            <InputRow label="Platform Name" defaultValue="SoleIQ" />
            <InputRow label="Support Email" defaultValue="contact.soleiq@gmail.com" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Timezone</label>
              <select defaultValue="America/New_York" style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: 'var(--text)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Logo (UI only)</label>
              <div style={{ padding: '20px', border: '2px dashed var(--border)', borderRadius: 8, textAlign: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: 13 }}>Click to upload logo</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>Admin Profile</div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22, fontWeight: 700 }}>SA</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Super Admin</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>admin@soleiq.com</div>
              <button style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>Upload Photo</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
            <InputRow label="Full Name" defaultValue="Super Admin" />
            <InputRow label="Email Address" defaultValue="admin@soleiq.com" type="email" />
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Change Password</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <InputRow label="Current Password" defaultValue="" type="password" />
                <InputRow label="New Password" defaultValue="" type="password" />
                <InputRow label="Confirm New Password" defaultValue="" type="password" />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>Notification Preferences</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { key: 'newBugReport', label: 'New Bug Report', desc: 'When a user submits a bug report' },
              { key: 'newSignup', label: 'New User Sign-up', desc: 'When a new user registers' },
              { key: 'paymentFailed', label: 'Payment Failed', desc: 'When a subscription payment fails' },
              { key: 'planUpgrade', label: 'Plan Upgrade', desc: 'When a user upgrades their plan' },
              { key: 'newFeedback', label: 'New Feedback', desc: 'When a user submits feedback' },
              { key: 'weeklyReport', label: 'Weekly Summary Report', desc: 'Weekly digest of platform activity' },
            ].map(({ key, label, desc }, i, arr) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
                </div>
                <Toggle checked={notifs[key as keyof typeof notifs]} onChange={() => setNotifs(n => ({ ...n, [key]: !n[key as keyof typeof notifs] }))} />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'appearance' && (
        <div style={cardStyle}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>Appearance</div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 12 }}>Theme</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {['Light','Dark'].map(t => (
                <button key={t} onClick={() => { if ((t === 'Dark') !== isDark) toggle() }} style={{ flex: 1, padding: '12px', borderRadius: 8, border: `2px solid ${(t === 'Dark') === isDark ? 'var(--primary)' : 'var(--border)'}`, background: 'transparent', cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 500 }}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 12 }}>Accent Color</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {ACCENT_COLORS.map(c => (
                <button key={c} onClick={() => setAccent(c)} style={{ width: 32, height: 32, borderRadius: 8, background: c, border: accent === c ? '3px solid var(--text)' : '3px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {accent === c && <Check size={14} color="white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Team Members</div>
            <button style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} /> Invite Admin
            </button>
          </div>
          {teamMembers.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: i < teamMembers.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{m.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.email}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: m.role === 'Super Admin' ? '#2563EB20' : m.role === 'Support' ? '#10B98120' : '#64748B20', color: m.role === 'Super Admin' ? '#2563EB' : m.role === 'Support' ? '#10B981' : '#64748B' }}>{m.role}</span>
              <span style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, background: m.active ? '#10B98115' : '#64748B15', color: m.active ? '#10B981' : '#64748B' }}>{m.active ? 'Active' : 'Inactive'}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 8, border: 'none', background: saved ? '#10B981' : 'var(--primary)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
          {saved ? <><Check size={15} /> Saved!</> : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
