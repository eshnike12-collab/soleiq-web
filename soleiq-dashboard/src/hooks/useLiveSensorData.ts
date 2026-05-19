import { useState, useEffect } from 'react'

export interface SensorReading {
  id: number
  timestamp: string
  zone: string
  pressure: number
  temperature: number
  risk: number
}

const BASE_ZONES = [
  { zone: 'Right Met 1', pressure: 82, temperature: 34.2, risk: 82 },
  { zone: 'Left Met 1', pressure: 52, temperature: 32.9, risk: 52 },
  { zone: 'Right Heel', pressure: 35, temperature: 32.2, risk: 35 },
  { zone: 'Left Heel', pressure: 28, temperature: 32.0, risk: 28 },
  { zone: 'Right Met 2', pressure: 71, temperature: 33.8, risk: 71 },
  { zone: 'Left Met 2', pressure: 48, temperature: 32.7, risk: 48 },
]

function jitter(val: number, range: number): number {
  return Math.round((val + (Math.random() - 0.5) * range * 2) * 10) / 10
}

function getTimestamp(): string {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function useLiveSensorData(intervalMs = 4000) {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [counter, setCounter] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      const base = BASE_ZONES[counter % BASE_ZONES.length]
      const reading: SensorReading = {
        id: Date.now(),
        timestamp: getTimestamp(),
        zone: base.zone,
        pressure: jitter(base.pressure, 4),
        temperature: jitter(base.temperature, 0.15),
        risk: jitter(base.risk, 3),
      }
      setReadings(prev => [reading, ...prev].slice(0, 8))
      setCounter(c => c + 1)
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, counter])

  return readings
}
