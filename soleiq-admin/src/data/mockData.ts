import type { User, InboxMessage, Subscription, Transaction, AuditEntry } from '../types'

const firstNames = ['Sarah','Marcus','Emily','James','Lisa','David','Rachel','Tom','Anna','Kevin','Maria','Chris','Priya','Daniel','Sofia','Ryan','Mei','Jordan','Aisha','Liam','Nina','Carlos','Yuki','Brandon','Fatima','Tyler','Zoe','Ahmed','Claire','Derek']
const lastNames = ['Chen','Williams','Rodriguez','Park','Thompson','Kim','Green','Bradley','Patel','Johnson','Garcia','Lee','Singh','Martinez','Anderson','Taylor','Wang','Brown','Hassan','Davis','Moore','Wilson','Tanaka','Jackson','Ali','White','Evans','Torres','Fischer','Martin']
const locations = ['San Francisco, CA','Chicago, IL','Austin, TX','Seattle, WA','Boston, MA','Los Angeles, CA','New York, NY','Miami, FL','Denver, CO','Atlanta, GA','Portland, OR','Houston, TX','Phoenix, AZ','Minneapolis, MN','Raleigh, NC']
const plans: ('Free'|'Pro'|'Enterprise')[] = ['Free','Free','Free','Pro','Pro','Pro','Pro','Enterprise','Enterprise']
const statuses: ('Active'|'Inactive'|'Suspended')[] = ['Active','Active','Active','Active','Active','Inactive','Inactive','Suspended']

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function dateAgo(days: number): string {
  const d = new Date('2026-04-02')
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

export const mockUsers: User[] = Array.from({ length: 50 }, (_, i) => {
  const fn = pick(firstNames)
  const ln = pick(lastNames)
  const plan = pick(plans)
  const status = pick(statuses)
  return {
    id: String(i + 1),
    name: `${fn} ${ln}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${pick(['clinic','health','rehab','sports','care','med'])}.com`,
    plan,
    status,
    joinDate: dateAgo(rnd(30, 730)),
    usageHours: plan === 'Enterprise' ? rnd(100, 400) : plan === 'Pro' ? rnd(30, 200) : rnd(0, 40),
    amountSpent: plan === 'Enterprise' ? rnd(800, 3600) : plan === 'Pro' ? rnd(100, 600) : 0,
    lastActive: rnd(0,1) ? `${rnd(1,59)}m ago` : rnd(0,1) ? `${rnd(1,23)}h ago` : `${rnd(1,14)}d ago`,
    location: pick(locations),
    avatar: `${fn[0]}${ln[0]}`,
  }
})

const bugSubjects = ['Sensor not syncing','Data not loading','App crashes on export','Login loop issue','Chart not rendering','Bluetooth drops connection','Export fails silently','Dashboard blank after update']
const suggSubjects = ['Bulk patient export','Custom report builder','EMR integration','Mobile app improvements','PDF export of sole map','Multi-user clinic accounts','API access for our team','Dark mode improvements']
const feedSubjects = ['Love the analytics section!','Great product overall','Heatmap is very useful','Dashboard feedback','Excellent support experience','Data visualization is top notch']
const types: ('Bug'|'Suggestion'|'Feedback'|'Support')[] = ['Bug','Bug','Suggestion','Suggestion','Feedback','Support']

export const mockInbox: InboxMessage[] = Array.from({ length: 30 }, (_, i) => {
  const user = mockUsers[i % mockUsers.length]
  const type = pick(types)
  const subjects = type === 'Bug' ? bugSubjects : type === 'Suggestion' ? suggSubjects : feedSubjects
  const statuses: ('Unread'|'Read'|'In Progress'|'Resolved')[] = ['Unread','Unread','Read','In Progress','Resolved']
  const priorities: ('Low'|'Medium'|'High'|'Critical')[] = ['Low','Medium','Medium','High','Critical']
  const d = new Date('2026-04-02')
  d.setDate(d.getDate() - i)
  return {
    id: String(i + 1),
    from: user.name,
    email: user.email,
    subject: pick(subjects),
    body: type === 'Bug'
      ? `Hi, I encountered an issue with ${pick(['the sensor sync','data export','the login flow','chart rendering','bluetooth connectivity'])}. It started happening after the latest update. Steps to reproduce: 1) Open the app, 2) Navigate to the affected section, 3) The issue occurs. Please advise.`
      : type === 'Suggestion'
      ? `It would be very helpful to have ${pick(['a bulk export feature','better filtering options','integration with our EMR system','custom date ranges on all charts','multi-patient comparison view'])}. Our clinic uses this daily and this would save significant time.`
      : `Just wanted to share some feedback about ${pick(['the new dashboard layout','the analytics section','the overall UX','the onboarding experience'])}. ${pick(['Really impressed!','It has been very useful.','Our team loves it.','A few minor things to note.'])}`,
    type,
    status: pick(statuses),
    priority: pick(priorities),
    adminNote: '',
    date: d.toISOString(),
  }
})

export const mockSubscriptions: Subscription[] = mockUsers
  .filter(u => u.plan !== 'Free')
  .slice(0, 20)
  .map((u, i) => ({
    id: `sub_${i + 1}`,
    userId: u.id,
    userName: u.name,
    email: u.email,
    plan: u.plan,
    billingCycle: i % 3 === 0 ? 'Annual' : 'Monthly',
    status: u.status === 'Suspended' ? 'Cancelled' : i % 8 === 0 ? 'Past Due' : i % 10 === 0 ? 'Trial' : 'Active',
    mrr: u.plan === 'Enterprise' ? 200 : 29,
    renewalDate: dateAgo(-rnd(5, 90)),
    paymentLast4: String(rnd(1000, 9999)),
    avatar: u.avatar,
    startDate: u.joinDate,
  }))

export const mockTransactions: Transaction[] = mockSubscriptions.flatMap((sub, si) =>
  Array.from({ length: rnd(2, 6) }, (_, ti) => {
    const d = new Date('2026-04-02')
    d.setMonth(d.getMonth() - ti)
    return {
      id: `txn_${si}_${ti}`,
      subscriptionId: sub.id,
      date: d.toISOString().split('T')[0],
      amount: sub.plan === 'Enterprise' ? (sub.billingCycle === 'Annual' ? 2400 : 200) : (sub.billingCycle === 'Annual' ? 290 : 29),
      description: `${sub.plan} Plan — ${sub.billingCycle} billing`,
      status: ti === 0 && sub.status === 'Past Due' ? 'Failed' : 'Paid',
    }
  })
)

const actionTypes = ['user_suspend','user_delete','plan_change','message_reply','export','login','settings_change','broadcast'] as const
const actionLabels: Record<string, string> = {
  user_suspend: 'Suspended user', user_delete: 'Deleted user', plan_change: 'Updated plan',
  message_reply: 'Replied to message', export: 'Exported data', login: 'Admin login',
  settings_change: 'Changed settings', broadcast: 'Sent broadcast',
}

export const mockAuditLog: AuditEntry[] = Array.from({ length: 20 }, (_, i) => {
  const type = pick([...actionTypes])
  const user = pick(mockUsers)
  const d = new Date('2026-04-02')
  d.setHours(d.getHours() - i * 3)
  return {
    id: String(i + 1),
    admin: 'Super Admin',
    action: actionLabels[type],
    actionType: type,
    target: `${user.name} (${user.email})`,
    details: type === 'plan_change' ? `Changed from Free to ${pick(['Pro','Enterprise'])}` : type === 'export' ? 'All users CSV export' : type === 'broadcast' ? 'Sent to all Pro users' : `Performed on ${user.name}`,
    date: d.toISOString(),
    ip: `192.168.1.${rnd(1, 10)}`,
  }
})
