export type Plan = 'Free' | 'Pro' | 'Enterprise'
export type UserStatus = 'Active' | 'Inactive' | 'Suspended'
export type MessageType = 'Bug' | 'Suggestion' | 'Feedback' | 'Support'
export type MessageStatus = 'Unread' | 'Read' | 'In Progress' | 'Resolved' | 'Archived'
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical'
export type BillingStatus = 'Active' | 'Past Due' | 'Cancelled' | 'Trial'
export type BillingCycle = 'Monthly' | 'Annual'

export interface User {
  id: string
  name: string
  email: string
  plan: Plan
  status: UserStatus
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
  type: MessageType
  status: MessageStatus
  priority: Priority
  adminNote: string
  date: string
}

export interface Subscription {
  id: string
  userId: string
  userName: string
  email: string
  plan: Plan
  billingCycle: BillingCycle
  status: BillingStatus
  mrr: number
  renewalDate: string
  paymentLast4: string
  avatar: string
  startDate: string
}

export interface Transaction {
  id: string
  subscriptionId: string
  date: string
  amount: number
  description: string
  status: 'Paid' | 'Failed' | 'Refunded'
}

export interface AuditEntry {
  id: string
  admin: string
  action: string
  actionType: 'user_suspend' | 'user_delete' | 'plan_change' | 'message_reply' | 'export' | 'login' | 'settings_change' | 'broadcast'
  target: string
  details: string
  date: string
  ip: string
}
