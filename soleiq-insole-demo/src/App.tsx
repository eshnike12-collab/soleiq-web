import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts'

// ─── Sensor Layout (from H21 source code) ────────────────────────────────────
// Each foot has 16 pressure sensors at specific anatomical positions.
// The positions below are normalized 0–1 coordinates on a foot outline.

interface SensorDef {
  id: string
  label: string
  x: number  // 0 = left edge, 1 = right edge of foot
  y: number  // 0 = top (toes), 1 = bottom (heel)
  zone: 'toes' | 'forefoot' | 'midfoot' | 'heel'
}

const LEFT_SENSORS: SensorDef[] = [
  { id: 'L1',  label: 'Big Toe',         x: 0.25, y: 0.06, zone: 'toes' },
  { id: 'L2',  label: 'Toe 2-3',         x: 0.60, y: 0.02, zone: 'toes' },
  { id: 'L3',  label: 'Toe 4-5',         x: 0.80, y: 0.08, zone: 'toes' },
  { id: 'L4',  label: 'Met Head 1',      x: 0.15, y: 0.18, zone: 'forefoot' },
  { id: 'L5',  label: 'Met Head 2',      x: 0.40, y: 0.15, zone: 'forefoot' },
  { id: 'L6',  label: 'Met Head 3',      x: 0.65, y: 0.17, zone: 'forefoot' },
  { id: 'L7',  label: 'Met Head 4',      x: 0.15, y: 0.30, zone: 'forefoot' },
  { id: 'L8',  label: 'Met Head 5',      x: 0.45, y: 0.28, zone: 'forefoot' },
  { id: 'L9',  label: 'Lateral Mid',     x: 0.75, y: 0.32, zone: 'midfoot' },
  { id: 'L10', label: 'Medial Arch',     x: 0.20, y: 0.52, zone: 'midfoot' },
  { id: 'L11', label: 'Central Arch',    x: 0.45, y: 0.52, zone: 'midfoot' },
  { id: 'L12', label: 'Lateral Arch',    x: 0.70, y: 0.52, zone: 'midfoot' },
  { id: 'L13', label: 'Medial Heel',     x: 0.25, y: 0.72, zone: 'heel' },
  { id: 'L14', label: 'Central Heel',    x: 0.48, y: 0.72, zone: 'heel' },
  { id: 'L15', label: 'Lateral Heel',    x: 0.70, y: 0.72, zone: 'heel' },
  { id: 'L16', label: 'Heel Center',     x: 0.38, y: 0.88, zone: 'heel' },
]

const RIGHT_SENSORS: SensorDef[] = LEFT_SENSORS.map(s => ({
  ...s,
  id: s.id.replace('L', 'R'),
  x: 1 - s.x, // mirror horizontally
}))

// ─── Mock Data Generator ─────────────────────────────────────────────────────
// Simulates realistic pressure data matching the H21 BLE protocol output.
// Real data: hex frames between 55aa…ddcc, decoded to decimal, minus 200, /50.
// Output range roughly 0–15 per sensor.

function generateSensorValues(): number[] {
  return Array.from({ length: 16 }, (_, i) => {
    // Simulate walking: forefoot and heel get higher pressure
    const zone = i < 3 ? 'toes' : i < 9 ? 'forefoot' : i < 12 ? 'midfoot' : 'heel'
    const base = zone === 'toes' ? 3 : zone === 'forefoot' ? 7 : zone === 'midfoot' ? 2 : 6
    const variation = Math.random() * 5 - 2
    return Math.max(0, Math.round((base + variation + Math.sin(Date.now() / 800 + i) * 3) * 10) / 10)
  })
}

// ─── Pressure → Color ────────────────────────────────────────────────────────

function pressureColor(value: number, max: number = 12): string {
  const t = Math.min(value / max, 1)
  if (t < 0.33) {
    const p = t / 0.33
    const r = Math.round(16 + p * (245 - 16))
    const g = Math.round(185 + p * (158 - 185))
    const b = Math.round(129 + p * (11 - 129))
    return `rgb(${r},${g},${b})`
  }
  const p = (t - 0.33) / 0.67
  const r = Math.round(245 + p * (239 - 245))
  const g = Math.round(158 - p * 158)
  const b = Math.round(11 + p * (68 - 11))
  return `rgb(${r},${g},${b})`
}

// ─── Foot SVG Component ──────────────────────────────────────────────────────

function FootPressureMap({
  sensors,
  values,
  mirror,
  label,
}: {
  sensors: SensorDef[]
  values: number[]
  mirror: boolean
  label: string
}) {
  const W = 160
  const H = 280
  const padX = 20
  const padY = 20

  // Foot outline path
  const footPath = mirror
    ? 'M130,260 C150,200 145,160 140,120 C135,80 145,50 130,30 C120,18 110,12 95,8 C80,5 65,5 55,8 C45,11 35,18 28,30 C15,55 18,85 20,120 C22,160 15,200 30,260 C50,280 110,280 130,260Z'
    : 'M30,260 C10,200 15,160 20,120 C25,80 15,50 30,30 C40,18 50,12 65,8 C80,5 95,5 105,8 C115,11 125,18 132,30 C145,55 142,85 140,120 C138,160 145,200 130,260 C110,280 50,280 30,260Z'

  return (
    <div className="foot-wrapper">
      <div className="foot-label">{label}</div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Foot outline */}
        <path
          d={footPath}
          fill="rgba(78, 205, 196, 0.04)"
          stroke="rgba(78, 205, 196, 0.2)"
          strokeWidth="1.5"
        />
        {/* Sensor dots */}
        {sensors.map((s, i) => {
          const cx = padX + s.x * (W - padX * 2)
          const cy = padY + s.y * (H - padY * 2)
          const val = values[i] ?? 0
          const r = 8 + val * 0.8
          return (
            <g key={s.id}>
              {/* Glow */}
              <circle
                cx={cx} cy={cy} r={r + 4}
                fill={pressureColor(val)}
                opacity={0.15}
              />
              {/* Main dot */}
              <circle
                cx={cx} cy={cy} r={r}
                fill={pressureColor(val)}
                opacity={0.85}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="0.5"
              />
              {/* Value label */}
              <text
                x={cx} y={cy + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize="8"
                fontWeight="700"
              >
                {val.toFixed(0)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────────────────

interface HistoryPoint {
  time: string
  leftAvg: number
  rightAvg: number
  leftMax: number
  rightMax: number
}

export default function App() {
  const [leftVals, setLeftVals] = useState<number[]>(() => generateSensorValues())
  const [rightVals, setRightVals] = useState<number[]>(() => generateSensorValues())
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(true)
  const [steps, setSteps] = useState(0)

  const tick = useCallback(() => {
    const lv = generateSensorValues()
    const rv = generateSensorValues()
    setLeftVals(lv)
    setRightVals(rv)
    setElapsed(e => e + 1)
    setSteps(s => s + Math.floor(Math.random() * 3))

    const lAvg = lv.reduce((a, b) => a + b, 0) / lv.length
    const rAvg = rv.reduce((a, b) => a + b, 0) / rv.length

    setHistory(prev => {
      const next = [
        ...prev,
        {
          time: new Date().toLocaleTimeString('en-US', { hour12: false }),
          leftAvg: Math.round(lAvg * 10) / 10,
          rightAvg: Math.round(rAvg * 10) / 10,
          leftMax: Math.max(...lv),
          rightMax: Math.max(...rv),
        },
      ]
      return next.slice(-60) // keep last 60 data points
    })
  }, [])

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [isRunning, tick])

  const leftAvg = (leftVals.reduce((a, b) => a + b, 0) / leftVals.length).toFixed(1)
  const rightAvg = (rightVals.reduce((a, b) => a + b, 0) / rightVals.length).toFixed(1)
  const leftMax = Math.max(...leftVals).toFixed(1)
  const rightMax = Math.max(...rightVals).toFixed(1)
  const asymmetry = Math.abs(Number(leftAvg) - Number(rightAvg)).toFixed(1)
  const cadence = Math.round(98 + Math.sin(elapsed / 10) * 12)
  const mins = Math.floor(elapsed / 120)
  const secs = Math.floor((elapsed % 120) / 2)

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          <img src="/soleiq-logo.png" alt="SoleIQ" />
          <div>
            <h1>SoleIQ Insole Demo</h1>
            <span>H21 Smart Insole Sensor Visualization</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => setIsRunning(r => !r)}
            style={{
              padding: '8px 20px',
              borderRadius: 999,
              border: 'none',
              background: isRunning ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
              color: isRunning ? '#ef4444' : '#10b981',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {isRunning ? 'Stop' : 'Start'} Simulation
          </button>
          <div className="status-badge status-connected">
            <div className="status-dot" />
            2 Insoles Connected
          </div>
        </div>
      </header>

      {/* ── Stats Row ── */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Session Time</div>
          <div className="stat-value">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
          <div className="stat-sub">Active session</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Steps</div>
          <div className="stat-value">{steps.toLocaleString()}</div>
          <div className="stat-sub">Cadence: {cadence} steps/min</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Left Avg Pressure</div>
          <div className="stat-value" style={{ color: '#4ecdc4' }}>
            {leftAvg}<span className="stat-unit">units</span>
          </div>
          <div className="stat-sub">Peak: {leftMax}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Right Avg Pressure</div>
          <div className="stat-value" style={{ color: '#8b7ff5' }}>
            {rightAvg}<span className="stat-unit">units</span>
          </div>
          <div className="stat-sub">Peak: {rightMax}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">L/R Asymmetry</div>
          <div className="stat-value" style={{ color: Number(asymmetry) > 3 ? '#ef4444' : '#10b981' }}>
            {asymmetry}<span className="stat-unit">delta</span>
          </div>
          <div className="stat-sub">{Number(asymmetry) > 3 ? 'Elevated' : 'Normal'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Data Rate</div>
          <div className="stat-value">30<span className="stat-unit">Hz</span></div>
          <div className="stat-sub">BLE @ 0000EE02</div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="main-grid">
        {/* Pressure Maps */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-title">Live Plantar Pressure Map</div>
          <div className="feet-container">
            <FootPressureMap sensors={LEFT_SENSORS} values={leftVals} mirror={false} label="Left Foot" />
            <FootPressureMap sensors={RIGHT_SENSORS} values={rightVals} mirror={true} label="Right Foot" />
          </div>
          <div className="legend">
            <span>Low</span>
            <div className="legend-bar" />
            <span>High</span>
          </div>
        </div>

        {/* Pressure History Chart */}
        <div className="card chart-section">
          <div className="card-title">Pressure Over Time (Average)</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="gradL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ecdc4" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#4ecdc4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b7ff5" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b7ff5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#253343" />
              <XAxis dataKey="time" tick={{ fill: '#7b8fa3', fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fill: '#7b8fa3', fontSize: 10 }} tickLine={false} domain={[0, 12]} />
              <Tooltip
                contentStyle={{ background: '#1a2533', border: '1px solid #253343', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#7b8fa3' }}
              />
              <Area type="monotone" dataKey="leftAvg" stroke="#4ecdc4" fill="url(#gradL)" strokeWidth={2} name="Left Avg" dot={false} />
              <Area type="monotone" dataKey="rightAvg" stroke="#8b7ff5" fill="url(#gradR)" strokeWidth={2} name="Right Avg" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Peak Pressure Chart */}
        <div className="card chart-section">
          <div className="card-title">Peak Pressure Over Time</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#253343" />
              <XAxis dataKey="time" tick={{ fill: '#7b8fa3', fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fill: '#7b8fa3', fontSize: 10 }} tickLine={false} domain={[0, 15]} />
              <Tooltip
                contentStyle={{ background: '#1a2533', border: '1px solid #253343', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#7b8fa3' }}
              />
              <Line type="monotone" dataKey="leftMax" stroke="#4ecdc4" strokeWidth={1.5} name="Left Peak" dot={false} />
              <Line type="monotone" dataKey="rightMax" stroke="#8b7ff5" strokeWidth={1.5} name="Right Peak" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sensor Readings Table */}
        <div className="card">
          <div className="card-title">Individual Sensor Readings</div>
          <div className="sensor-grid">
            <div>
              <div className="sensor-col-title">Left Foot</div>
              {LEFT_SENSORS.map((s, i) => (
                <div className="sensor-item" key={s.id}>
                  <span className="sensor-name">{s.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="sensor-val" style={{ color: pressureColor(leftVals[i]) }}>
                      {leftVals[i]?.toFixed(1)}
                    </span>
                    <div className="sensor-bar-wrap">
                      <div
                        className="sensor-bar"
                        style={{
                          width: `${Math.min((leftVals[i] / 12) * 100, 100)}%`,
                          background: pressureColor(leftVals[i]),
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div className="sensor-col-title" style={{ color: '#8b7ff5' }}>Right Foot</div>
              {RIGHT_SENSORS.map((s, i) => (
                <div className="sensor-item" key={s.id}>
                  <span className="sensor-name">{s.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="sensor-val" style={{ color: pressureColor(rightVals[i]) }}>
                      {rightVals[i]?.toFixed(1)}
                    </span>
                    <div className="sensor-bar-wrap">
                      <div
                        className="sensor-bar"
                        style={{
                          width: `${Math.min((rightVals[i] / 12) * 100, 100)}%`,
                          background: pressureColor(rightVals[i]),
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Device Info + Alerts */}
        <div className="card">
          <div className="card-title">Device Information</div>
          <div className="device-info">
            <div>
              <div className="device-row">
                <span className="device-key">Device Name</span>
                <span className="device-val">B2U-321B</span>
              </div>
              <div className="device-row">
                <span className="device-key">Protocol</span>
                <span className="device-val">BLE 5.0</span>
              </div>
              <div className="device-row">
                <span className="device-key">Service UUID</span>
                <span className="device-val" style={{ fontSize: 10 }}>0000EE00-…</span>
              </div>
              <div className="device-row">
                <span className="device-key">Char UUID</span>
                <span className="device-val" style={{ fontSize: 10 }}>0000EE02-…</span>
              </div>
              <div className="device-row">
                <span className="device-key">Frame Format</span>
                <span className="device-val">55AA…DDCC</span>
              </div>
            </div>
            <div>
              <div className="device-row">
                <span className="device-key">Sensors/Foot</span>
                <span className="device-val">16</span>
              </div>
              <div className="device-row">
                <span className="device-key">Total Sensors</span>
                <span className="device-val">32</span>
              </div>
              <div className="device-row">
                <span className="device-key">Sample Rate</span>
                <span className="device-val">~30 Hz</span>
              </div>
              <div className="device-row">
                <span className="device-key">Resolution</span>
                <span className="device-val">16-bit</span>
              </div>
              <div className="device-row">
                <span className="device-key">Firmware</span>
                <span className="device-val">v2.1.4</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div className="card-title">Clinical Alerts</div>
            <div className="alert-list">
              <div className={`alert-item ${Number(asymmetry) > 3 ? 'alert-watch' : 'alert-ok'}`}>
                <span className="alert-icon">{Number(asymmetry) > 3 ? '!' : '+'}</span>
                <div>
                  <div className="alert-title">
                    Pressure Asymmetry: {asymmetry} units
                  </div>
                  <div className="alert-detail">
                    {Number(asymmetry) > 3
                      ? 'Left/right pressure difference exceeds threshold. Monitor gait pattern.'
                      : 'Bilateral pressure distribution within normal range.'}
                  </div>
                </div>
              </div>
              <div className={`alert-item ${Number(leftMax) > 11 ? 'alert-watch' : 'alert-ok'}`}>
                <span className="alert-icon">{Number(leftMax) > 11 ? '!' : '+'}</span>
                <div>
                  <div className="alert-title">
                    Peak Pressure: {Math.max(Number(leftMax), Number(rightMax))} units
                  </div>
                  <div className="alert-detail">
                    {Number(leftMax) > 11 || Number(rightMax) > 11
                      ? 'Forefoot peak pressure elevated. Consider offloading assessment.'
                      : 'Peak pressure levels within safe parameters.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
