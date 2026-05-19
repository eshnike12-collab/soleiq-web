import { create } from 'zustand'

export interface User {
  id: string
  name: string
  email: string
  plan: 'Free' | 'Pro' | 'Enterprise'
  status: 'Active' | 'Inactive' | 'Suspended'
  joinDate: string
  usageHours: number
  amountSpent: number
  lastActive: string
  location: string
  avatar: string
}

export interface InboxMessage {
  id: string
  from: string
  email: string
  subject: string
  body: string
  type: 'Bug' | 'Suggestion' | 'Feedback' | 'Support'
  status: 'Unread' | 'Read' | 'In Progress' | 'Resolved' | 'Archived'
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  adminNote: string
  date: string
}

export interface AuditEntry {
  id: string
  admin: string
  action: string
  target: string
  date: string
  ip: string
}

interface AdminStore {
  users: User[]
  inbox: InboxMessage[]
  auditLog: AuditEntry[]
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  markMessageRead: (id: string) => void
  updateUserStatus: (id: string, status: User['status']) => void
  addUser: (user: User) => void
  deleteUsers: (ids: string[]) => void
  updateUser: (id: string, updates: Partial<User>) => void
  updateMessage: (id: string, updates: Partial<InboxMessage>) => void
  deleteMessage: (id: string) => void
}

const mockUsers: User[] = [
  { id: '1', name: 'Sarah Chen', email: 'sarah.chen@example.com', plan: 'Pro', status: 'Active', joinDate: '2024-01-15', usageHours: 142, amountSpent: 348, lastActive: '2 min ago', location: 'San Francisco, CA', avatar: 'SC' },
  { id: '2', name: 'Marcus Williams', email: 'm.williams@clinic.com', plan: 'Enterprise', status: 'Active', joinDate: '2023-11-08', usageHours: 289, amountSpent: 1200, lastActive: '15 min ago', location: 'Chicago, IL', avatar: 'MW' },
  { id: '3', name: 'Emily Rodriguez', email: 'emily.r@healthcare.org', plan: 'Pro', status: 'Active', joinDate: '2024-02-20', usageHours: 98, amountSpent: 228, lastActive: '1h ago', location: 'Austin, TX', avatar: 'ER' },
  { id: '4', name: 'James Park', email: 'j.park@podiatry.com', plan: 'Free', status: 'Inactive', joinDate: '2024-03-01', usageHours: 12, amountSpent: 0, lastActive: '3 days ago', location: 'Seattle, WA', avatar: 'JP' },
  { id: '5', name: 'Lisa Thompson', email: 'lisa.t@rehab.com', plan: 'Pro', status: 'Active', joinDate: '2023-12-14', usageHours: 201, amountSpent: 468, lastActive: '30 min ago', location: 'Boston, MA', avatar: 'LT' },
  { id: '6', name: 'David Kim', email: 'david.kim@sports.med', plan: 'Enterprise', status: 'Active', joinDate: '2023-10-22', usageHours: 315, amountSpent: 2400, lastActive: '5 min ago', location: 'Los Angeles, CA', avatar: 'DK' },
  { id: '7', name: 'Rachel Green', email: 'r.green@footcare.com', plan: 'Free', status: 'Active', joinDate: '2024-03-18', usageHours: 8, amountSpent: 0, lastActive: '2 days ago', location: 'New York, NY', avatar: 'RG' },
  { id: '8', name: 'Tom Bradley', email: 't.bradley@clinic.net', plan: 'Pro', status: 'Suspended', joinDate: '2024-01-30', usageHours: 45, amountSpent: 108, lastActive: '1 week ago', location: 'Miami, FL', avatar: 'TB' },
]

const mockInbox: InboxMessage[] = [
  { id: '1', from: 'Sarah Chen', email: 'sarah.chen@example.com', subject: 'Sensor data not syncing after iOS update', body: 'Hi, since the latest iOS 17.4 update my sensor data stopped syncing. I have tried reinstalling the app but the issue persists. Please help!', type: 'Bug', status: 'Unread', priority: 'High', adminNote: '', date: '2026-04-02T09:15:00Z' },
  { id: '2', from: 'Marcus Williams', email: 'm.williams@clinic.com', subject: 'Feature request: bulk patient export', body: 'It would be very helpful to export all patient records as a CSV for our EMR integration. Currently we have to do it one by one.', type: 'Suggestion', status: 'Unread', priority: 'Medium', adminNote: '', date: '2026-04-02T08:30:00Z' },
  { id: '3', from: 'Emily Rodriguez', email: 'emily.r@healthcare.org', subject: 'Dashboard UI feedback', body: 'Love the new analytics section! The heatmap is especially useful. One suggestion: add a date range filter to the sole map view.', type: 'Feedback', status: 'Read', priority: 'Low', adminNote: 'Good point — added to backlog.', date: '2026-04-01T14:20:00Z' },
  { id: '4', from: 'James Park', email: 'j.park@podiatry.com', subject: 'Billing question', body: 'I was charged twice this month. Can someone look into this? Transaction IDs: TXN-4421 and TXN-4422.', type: 'Support', status: 'In Progress', priority: 'Critical', adminNote: 'Escalated to billing team.', date: '2026-04-01T11:00:00Z' },
  { id: '5', from: 'Lisa Thompson', email: 'lisa.t@rehab.com', subject: 'Great product!', body: 'Just wanted to say the platform has been a game changer for our rehab clinic. Our patients love seeing their progress over time.', type: 'Feedback', status: 'Read', priority: 'Low', adminNote: '', date: '2026-03-31T16:45:00Z' },
]

const mockAudit: AuditEntry[] = [
  { id: '1', admin: 'Super Admin', action: 'Suspended user', target: 'Tom Bradley (tb@clinic.net)', date: '2026-04-02T10:00:00Z', ip: '192.168.1.1' },
  { id: '2', admin: 'Super Admin', action: 'Sent broadcast message', target: 'All Pro users (5 recipients)', date: '2026-04-01T15:30:00Z', ip: '192.168.1.1' },
  { id: '3', admin: 'Super Admin', action: 'Updated subscription plan', target: 'Marcus Williams → Enterprise', date: '2026-04-01T12:00:00Z', ip: '192.168.1.1' },
  { id: '4', admin: 'Super Admin', action: 'Deleted message', target: 'Inbox #3', date: '2026-03-31T09:15:00Z', ip: '192.168.1.1' },
  { id: '5', admin: 'Super Admin', action: 'Exported user data', target: 'All users CSV export', date: '2026-03-30T14:00:00Z', ip: '192.168.1.1' },
]

export const useAdminStore = create<AdminStore>()((set) => ({
  users: mockUsers,
  inbox: mockInbox,
  auditLog: mockAudit,
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  markMessageRead: (id) => set((s) => ({
    inbox: s.inbox.map((m) => m.id === id ? { ...m, status: 'Read' as const } : m),
  })),
  updateUserStatus: (id, status) => set((s) => ({
    users: s.users.map((u) => u.id === id ? { ...u, status } : u),
  })),
  addUser: (user) => set((s) => ({ users: [...s.users, user] })),
  deleteUsers: (ids) => set((s) => ({ users: s.users.filter((u) => !ids.includes(u.id)) })),
  updateUser: (id, updates) => set((s) => ({
    users: s.users.map((u) => u.id === id ? { ...u, ...updates } : u),
  })),
  updateMessage: (id, updates) => set((s) => ({
    inbox: s.inbox.map((m) => m.id === id ? { ...m, ...updates } : m),
  })),
  deleteMessage: (id) => set((s) => ({ inbox: s.inbox.filter((m) => m.id !== id) })),
}))
