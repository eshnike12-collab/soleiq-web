import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useThemeStore } from './store/useThemeStore'
import { useEffect } from 'react'
import AdminLayout from './components/layout/AdminLayout'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Analytics from './pages/Analytics'
import Inbox from './pages/Inbox'
import Subscriptions from './pages/Subscriptions'
import AuditLog from './pages/AuditLog'
import Settings from './pages/Settings'

export default function App() {
  const { isDark } = useThemeStore()

  useEffect(() => {
    document.documentElement.className = isDark ? 'dark' : 'light'
  }, [isDark])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
