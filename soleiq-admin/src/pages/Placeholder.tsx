export default function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--muted)' }}>This section is coming soon.</div>
    </div>
  )
}
