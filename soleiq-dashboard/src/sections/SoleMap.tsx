import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useUser } from '../context/UserContext';
import { useLiveSensorData } from '../hooks/useLiveSensorData';

// ---- Color helpers ----
function getRiskColorHex(score: number): string {
  if (score >= 75) return '#FF6B6B';
  if (score >= 60) return '#FFB347';
  if (score >= 40) return '#F0E000';
  return '#4ECDC4';
}

function getPressureColor(value: number): string {
  const normalized = Math.min(Math.max(value, 0), 100) / 100;
  if (normalized >= 0.75) return '#FF6B6B';
  if (normalized >= 0.60) return '#FFB347';
  if (normalized >= 0.40) return '#F0E000';
  return '#4ECDC4';
}

function getTempColor(temp: number): string {
  // 31.5 cool -> 34.2 hot
  const normalized = Math.min(Math.max((temp - 31.5) / (34.2 - 31.5), 0), 1);
  if (normalized >= 0.75) return '#FF6B6B';
  if (normalized >= 0.50) return '#FFB347';
  if (normalized >= 0.25) return '#F0E000';
  return '#4ECDC4';
}

// ---- Zone definitions ----
interface ZoneInfo {
  key: string;
  label: string;
  scoreKey: string;
  pressureIdx: number;
  tempIdx: number;
}

const RIGHT_ZONES: ZoneInfo[] = [
  { key: 'rightHallux',  label: 'Right Hallux',  scoreKey: 'rightHallux', pressureIdx: 0, tempIdx: 0 },
  { key: 'rightMet1',    label: 'Right Met 1',    scoreKey: 'rightMet1',   pressureIdx: 1, tempIdx: 1 },
  { key: 'rightMet2',    label: 'Right Met 2',    scoreKey: 'rightMet2',   pressureIdx: 2, tempIdx: 2 },
  { key: 'rightMet3',    label: 'Right Met 3',    scoreKey: 'rightMet3',   pressureIdx: 3, tempIdx: 3 },
  { key: 'rightMet4',    label: 'Right Met 4',    scoreKey: 'rightMet4',   pressureIdx: 4, tempIdx: 4 },
  { key: 'rightMet5',    label: 'Right Met 5',    scoreKey: 'rightMet5',   pressureIdx: 5, tempIdx: 5 },
  { key: 'rightArch',    label: 'Right Arch',     scoreKey: 'rightArch',   pressureIdx: 6, tempIdx: 6 },
  { key: 'rightHeel',    label: 'Right Heel',     scoreKey: 'rightHeel',   pressureIdx: 7, tempIdx: 7 },
];

const LEFT_ZONES: ZoneInfo[] = [
  { key: 'leftHallux', label: 'Left Hallux', scoreKey: 'leftHallux', pressureIdx: 0, tempIdx: 0 },
  { key: 'leftMet1',   label: 'Left Met 1',  scoreKey: 'leftMet1',   pressureIdx: 1, tempIdx: 1 },
  { key: 'leftMet2',   label: 'Left Met 2',  scoreKey: 'leftMet2',   pressureIdx: 2, tempIdx: 2 },
  { key: 'leftMet3',   label: 'Left Met 3',  scoreKey: 'leftMet3',   pressureIdx: 3, tempIdx: 3 },
  { key: 'leftMet4',   label: 'Left Met 4',  scoreKey: 'leftMet4',   pressureIdx: 4, tempIdx: 4 },
  { key: 'leftMet5',   label: 'Left Met 5',  scoreKey: 'leftMet5',   pressureIdx: 5, tempIdx: 5 },
  { key: 'leftArch',   label: 'Left Arch',   scoreKey: 'leftArch',   pressureIdx: 6, tempIdx: 6 },
  { key: 'leftHeel',   label: 'Left Heel',   scoreKey: 'leftHeel',   pressureIdx: 7, tempIdx: 7 },
];

type ViewMode = 'risk' | 'pressure' | 'temperature';

interface TooltipState {
  x: number;
  y: number;
  zone: string;
  score: number;
  pressure: number;
  temp: number;
}

interface SelectedZone {
  label: string;
  scoreKey: string;
  pressureIdx: number;
  tempIdx: number;
  side: 'right' | 'left';
}

// ---- Foot SVG ----
function FootSVG({
  side,
  zoneRisks,
  pressureMap,
  tempMap,
  viewMode,
  selectedZoneKey,
  onZoneClick,
  onZoneHover,
  onMouseLeave,
}: {
  side: 'right' | 'left';
  zoneRisks: Record<string, number>;
  pressureMap: number[];
  tempMap: number[];
  viewMode: ViewMode;
  selectedZoneKey: string | null;
  onZoneClick: (zone: ZoneInfo, side: 'right' | 'left') => void;
  onZoneHover: (e: React.MouseEvent, zone: ZoneInfo, side: 'right' | 'left') => void;
  onMouseLeave: () => void;
}) {
  const isRight = side === 'right';
  const zones = isRight ? RIGHT_ZONES : LEFT_ZONES;

  function getZoneColor(zone: ZoneInfo): string {
    const score = (zoneRisks as Record<string, number>)[zone.scoreKey] ?? 0;
    if (viewMode === 'risk') return getRiskColorHex(score);
    if (viewMode === 'pressure') return getPressureColor(pressureMap[zone.pressureIdx] ?? 0);
    return getTempColor(tempMap[zone.tempIdx] ?? 32.0);
  }

  function getZoneValue(zone: ZoneInfo): string {
    if (viewMode === 'risk') return String((zoneRisks as Record<string, number>)[zone.scoreKey] ?? 0);
    if (viewMode === 'pressure') return String(pressureMap[zone.pressureIdx] ?? 0);
    return (tempMap[zone.tempIdx] ?? 32.0).toFixed(1);
  }

  function isSelected(zone: ZoneInfo): boolean {
    return selectedZoneKey === zone.key;
  }

  function isPulse(zone: ZoneInfo): boolean {
    // Right Met 1 (score 82) always pulses
    return zone.key === 'rightMet1';
  }

  const hallux = zones[0];
  const met1 = zones[1];
  const met2 = zones[2];
  const met3 = zones[3];
  const met4 = zones[4];
  const met5 = zones[5];
  const arch = zones[6];
  const heel = zones[7];

  return (
    <svg
      viewBox="0 0 200 400"
      width="160"
      height="320"
      style={{ transform: isRight ? 'none' : 'scaleX(-1)', cursor: 'pointer', overflow: 'visible' }}
    >
      {/* Foot outline */}
      <path
        d="M100 380 C65 380 48 355 48 330 L48 210 C48 175 52 150 60 128 C66 112 74 98 84 88 C91 80 100 75 108 75 C116 75 124 80 132 88 C142 100 148 116 152 135 C156 158 156 182 154 210 L152 330 C152 355 136 380 100 380 Z"
        fill="var(--clr-surface-2)"
        stroke="var(--clr-border)"
        strokeWidth="2"
      />

      {/* Big toe (hallux) */}
      <ellipse
        cx="84" cy="56" rx="18" ry="24"
        fill={getZoneColor(hallux)}
        opacity={isSelected(hallux) ? 1 : 0.82}
        stroke={isSelected(hallux) ? '#fff' : 'none'}
        strokeWidth="2"
        className={isPulse(hallux) ? 'hotspot-pulse' : ''}
        onClick={() => onZoneClick(hallux, side)}
        onMouseEnter={(e) => onZoneHover(e, hallux, side)}
        onMouseLeave={onMouseLeave}
        style={{ cursor: 'pointer' }}
      />
      {/* 2nd toe */}
      <ellipse
        cx="110" cy="50" rx="14" ry="21"
        fill={getZoneColor(met1)}
        opacity={isSelected(met1) ? 1 : 0.82}
        stroke={isSelected(met1) ? '#fff' : 'none'}
        strokeWidth="2"
        className={isPulse(met1) ? 'hotspot-pulse' : ''}
        onClick={() => onZoneClick(met1, side)}
        onMouseEnter={(e) => onZoneHover(e, met1, side)}
        onMouseLeave={onMouseLeave}
        style={{ cursor: 'pointer' }}
      />
      {/* 3rd toe */}
      <ellipse
        cx="132" cy="55" rx="12" ry="18"
        fill={getZoneColor(met2)}
        opacity={isSelected(met2) ? 1 : 0.82}
        stroke={isSelected(met2) ? '#fff' : 'none'}
        strokeWidth="2"
        onClick={() => onZoneClick(met2, side)}
        onMouseEnter={(e) => onZoneHover(e, met2, side)}
        onMouseLeave={onMouseLeave}
        style={{ cursor: 'pointer' }}
      />
      {/* 4th toe */}
      <ellipse
        cx="149" cy="66" rx="10" ry="15"
        fill={getZoneColor(met3)}
        opacity={isSelected(met3) ? 1 : 0.82}
        stroke={isSelected(met3) ? '#fff' : 'none'}
        strokeWidth="2"
        onClick={() => onZoneClick(met3, side)}
        onMouseEnter={(e) => onZoneHover(e, met3, side)}
        onMouseLeave={onMouseLeave}
        style={{ cursor: 'pointer' }}
      />
      {/* 5th toe (pinky) */}
      <ellipse
        cx="162" cy="82" rx="9" ry="13"
        fill={getZoneColor(met4)}
        opacity={isSelected(met4) ? 1 : 0.82}
        stroke={isSelected(met4) ? '#fff' : 'none'}
        strokeWidth="2"
        onClick={() => onZoneClick(met4, side)}
        onMouseEnter={(e) => onZoneHover(e, met4, side)}
        onMouseLeave={onMouseLeave}
        style={{ cursor: 'pointer' }}
      />

      {/* Met 1 zone (1st metatarsal head — ball of foot) */}
      <ellipse
        cx="83" cy="118" rx="24" ry="19"
        fill={getZoneColor(hallux)}
        opacity={isSelected(hallux) ? 0.9 : 0.7}
        className={isPulse(hallux) ? 'hotspot-pulse' : ''}
        onClick={() => onZoneClick(hallux, side)}
        onMouseEnter={(e) => onZoneHover(e, hallux, side)}
        onMouseLeave={onMouseLeave}
        style={{ cursor: 'pointer' }}
      />
      {/* Met 2 */}
      <ellipse
        cx="108" cy="112" rx="18" ry="17"
        fill={getZoneColor(met1)}
        opacity={isSelected(met1) ? 0.95 : 0.75}
        className={isPulse(met1) ? 'hotspot-pulse' : ''}
        onClick={() => onZoneClick(met1, side)}
        onMouseEnter={(e) => onZoneHover(e, met1, side)}
        onMouseLeave={onMouseLeave}
        style={{ cursor: 'pointer' }}
      />
      {/* Met 3 */}
      <ellipse
        cx="128" cy="118" rx="15" ry="16"
        fill={getZoneColor(met2)}
        opacity={isSelected(met2) ? 0.9 : 0.7}
        onClick={() => onZoneClick(met2, side)}
        onMouseEnter={(e) => onZoneHover(e, met2, side)}
        onMouseLeave={onMouseLeave}
        style={{ cursor: 'pointer' }}
      />
      {/* Met 4 */}
      <ellipse
        cx="143" cy="126" rx="12" ry="14"
        fill={getZoneColor(met3)}
        opacity={isSelected(met3) ? 0.9 : 0.68}
        onClick={() => onZoneClick(met3, side)}
        onMouseEnter={(e) => onZoneHover(e, met3, side)}
        onMouseLeave={onMouseLeave}
        style={{ cursor: 'pointer' }}
      />
      {/* Met 5 */}
      <ellipse
        cx="153" cy="138" rx="11" ry="13"
        fill={getZoneColor(met5)}
        opacity={isSelected(met5) ? 0.9 : 0.65}
        onClick={() => onZoneClick(met5, side)}
        onMouseEnter={(e) => onZoneHover(e, met5, side)}
        onMouseLeave={onMouseLeave}
        style={{ cursor: 'pointer' }}
      />

      {/* Arch zone */}
      <path
        d="M52 225 C52 200 58 188 68 183 L68 270 C58 265 52 252 52 240 Z"
        fill={getZoneColor(arch)}
        opacity={isSelected(arch) ? 0.85 : 0.55}
        onClick={() => onZoneClick(arch, side)}
        onMouseEnter={(e) => onZoneHover(e, arch, side)}
        onMouseLeave={onMouseLeave}
        style={{ cursor: 'pointer' }}
      />

      {/* Heel */}
      <ellipse
        cx="100" cy="352" rx="44" ry="24"
        fill={getZoneColor(heel)}
        opacity={isSelected(heel) ? 0.95 : 0.78}
        stroke={isSelected(heel) ? '#fff' : 'none'}
        strokeWidth="2"
        onClick={() => onZoneClick(heel, side)}
        onMouseEnter={(e) => onZoneHover(e, heel, side)}
        onMouseLeave={onMouseLeave}
        style={{ cursor: 'pointer' }}
      />

      {/* Zone value labels */}
      <text x="84" y="62" textAnchor="middle" fontSize="9" fill="#0D2B3E" fontWeight="700" style={{ pointerEvents: 'none' }}>
        {getZoneValue(hallux)}
      </text>
      <text x="110" y="56" textAnchor="middle" fontSize="9" fill="#0D2B3E" fontWeight="700" style={{ pointerEvents: 'none' }}>
        {getZoneValue(met1)}
      </text>
      <text x="132" y="60" textAnchor="middle" fontSize="8" fill="#0D2B3E" fontWeight="700" style={{ pointerEvents: 'none' }}>
        {getZoneValue(met2)}
      </text>
      <text x="149" y="70" textAnchor="middle" fontSize="8" fill="#0D2B3E" fontWeight="700" style={{ pointerEvents: 'none' }}>
        {getZoneValue(met3)}
      </text>
      <text x="100" cy="352" textAnchor="middle" fontSize="10" fill="#0D2B3E" fontWeight="700" style={{ pointerEvents: 'none' }}>
        <tspan x="100" y="355">{getZoneValue(heel)}</tspan>
      </text>

      {/* FOOT LABEL */}
      <text
        x="100"
        y="392"
        textAnchor="middle"
        fontSize="11"
        fill="var(--clr-text-muted)"
        fontFamily="DM Sans, sans-serif"
        fontWeight="700"
        letterSpacing="2"
        style={{ transform: isRight ? 'none' : 'scaleX(-1)', transformOrigin: '100px 392px' }}
      >
        {isRight ? 'RIGHT' : 'LEFT'}
      </text>
    </svg>
  );
}

// ---- Bilateral comparison data ----
const BILATERAL_DATA = [
  { zone: 'Hallux', right: 45, left: 38 },
  { zone: 'Met 1',  right: 82, left: 52 },
  { zone: 'Met 2',  right: 71, left: 48 },
  { zone: 'Met 3',  right: 58, left: 44 },
  { zone: 'Arch',   right: 22, left: 18 },
  { zone: 'Heel',   right: 35, left: 28 },
];

// ---- Main component ----
export default function SoleMap() {
  const { user } = useUser();
  const ra = user.riskAssessment;
  const pd = user.plantarData;
  const gait = pd.gaitMetrics;

  const [viewMode, setViewMode] = useState<ViewMode>('risk');
  const [selectedZone, setSelectedZone] = useState<SelectedZone>({
    label: 'Right 1st Metatarsal Head',
    scoreKey: 'rightMet1',
    pressureIdx: 1,
    tempIdx: 1,
    side: 'right',
  });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const liveReadings = useLiveSensorData(3500);

  const handleZoneClick = useCallback((zone: ZoneInfo, side: 'right' | 'left') => {
    setSelectedZone({
      label: zone.label,
      scoreKey: zone.scoreKey,
      pressureIdx: zone.pressureIdx,
      tempIdx: zone.tempIdx,
      side,
    });
  }, []);

  const handleZoneHover = useCallback((e: React.MouseEvent, zone: ZoneInfo, side: 'right' | 'left') => {
    const rect = (e.currentTarget as SVGElement).closest('svg')?.getBoundingClientRect();
    const pressureMap = side === 'right' ? pd.currentPressureMap.rightFoot : pd.currentPressureMap.leftFoot;
    const tempMap = side === 'right' ? pd.currentTemperatureMap.rightFoot : pd.currentTemperatureMap.leftFoot;
    const score = (ra.zoneRisks as Record<string, number>)[zone.scoreKey] ?? 0;
    setTooltip({
      x: e.clientX - (rect?.left ?? 0) + 12,
      y: e.clientY - (rect?.top ?? 0) - 20,
      zone: zone.label,
      score,
      pressure: pressureMap[zone.pressureIdx] ?? 0,
      temp: tempMap[zone.tempIdx] ?? 32.0,
    });
  }, [ra.zoneRisks, pd]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // Selected zone data
  const selPressureMap = selectedZone.side === 'right' ? pd.currentPressureMap.rightFoot : pd.currentPressureMap.leftFoot;
  const selTempMap = selectedZone.side === 'right' ? pd.currentTemperatureMap.rightFoot : pd.currentTemperatureMap.leftFoot;
  const selScore = (ra.zoneRisks as Record<string, number>)[selectedZone.scoreKey] ?? 0;
  const selPressure = selPressureMap[selectedZone.pressureIdx] ?? 0;
  const selTemp = selTempMap[selectedZone.tempIdx] ?? 32.0;
  const selColor = getRiskColorHex(selScore);
  const selRiskLabel = selScore >= 75 ? 'HIGH' : selScore >= 60 ? 'ELEVATED' : selScore >= 40 ? 'MODERATE' : 'LOW';

  // Contralateral delta for selected zone
  const contraIdx = selectedZone.pressureIdx;
  const contraTemp = selectedZone.side === 'right'
    ? pd.currentTemperatureMap.leftFoot[contraIdx] ?? 32.0
    : pd.currentTemperatureMap.rightFoot[contraIdx] ?? 32.0;
  const tempDelta = (selTemp - contraTemp).toFixed(1);
  const isTempAlert = Math.abs(selTemp - contraTemp) >= 1.5;

  const gaitPhase = gait.gaitPhaseBalance;

  // Zone list for right panel
  const ALL_ZONES: Array<{ zone: ZoneInfo; side: 'right' | 'left' }> = [
    ...RIGHT_ZONES.map((z) => ({ zone: z, side: 'right' as const })),
    ...LEFT_ZONES.map((z) => ({ zone: z, side: 'left' as const })),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className="font-syne" style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--clr-text)', marginBottom: '0.25rem' }}>
          Your Sole — Live Mapping
        </h1>
        <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>
          Sensor data updating every 4 seconds
        </p>
      </div>

      {/* View mode toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {([
          { mode: 'risk' as ViewMode, label: 'Risk Score' },
          { mode: 'pressure' as ViewMode, label: 'Pressure' },
          { mode: 'temperature' as ViewMode, label: 'Temperature' },
        ]).map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: `1px solid ${viewMode === mode ? 'var(--clr-accent)' : 'var(--clr-border)'}`,
              background: viewMode === mode ? 'rgba(78,205,196,0.15)' : 'transparent',
              color: viewMode === mode ? 'var(--clr-accent)' : 'var(--clr-text-muted)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              fontFamily: 'DM Sans, sans-serif',
              transition: 'all 0.2s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Two-panel layout */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', alignItems: 'start' }}
        className="solemap-layout"
      >
        {/* LEFT PANEL — Foot SVGs */}
        <div className="glass" style={{ padding: '1.5rem', position: 'relative' }}>
          <h3 className="font-syne" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem', textAlign: 'center' }}>
            Plantar Map
          </h3>

          <div style={{ display: 'flex', gap: '2.5rem', justifyContent: 'center', position: 'relative' }}>
            {/* LEFT foot */}
            <div style={{ position: 'relative' }}>
              <FootSVG
                side="left"
                zoneRisks={ra.zoneRisks}
                pressureMap={pd.currentPressureMap.leftFoot}
                tempMap={pd.currentTemperatureMap.leftFoot}
                viewMode={viewMode}
                selectedZoneKey={selectedZone.side === 'left' ? selectedZone.scoreKey.replace('left', 'left') : null}
                onZoneClick={handleZoneClick}
                onZoneHover={handleZoneHover}
                onMouseLeave={handleMouseLeave}
              />
              {tooltip && (
                <div
                  style={{
                    position: 'absolute',
                    left: tooltip.x,
                    top: tooltip.y,
                    background: 'var(--clr-surface)',
                    border: '1px solid var(--clr-border)',
                    borderRadius: '10px',
                    padding: '0.625rem 0.875rem',
                    pointerEvents: 'none',
                    zIndex: 100,
                    whiteSpace: 'nowrap',
                    fontSize: '0.78rem',
                  }}
                >
                  <p style={{ fontWeight: 700, color: 'var(--clr-text)', marginBottom: '0.25rem' }}>{tooltip.zone}</p>
                  <p style={{ color: getRiskColorHex(tooltip.score) }}>Risk: {tooltip.score}</p>
                  <p style={{ color: 'var(--clr-text-muted)' }}>Pressure: {tooltip.pressure} N/cm²</p>
                  <p style={{ color: 'var(--clr-text-muted)' }}>Temp: {tooltip.temp.toFixed(1)}°C</p>
                </div>
              )}
            </div>

            {/* RIGHT foot */}
            <div style={{ position: 'relative' }}>
              <FootSVG
                side="right"
                zoneRisks={ra.zoneRisks}
                pressureMap={pd.currentPressureMap.rightFoot}
                tempMap={pd.currentTemperatureMap.rightFoot}
                viewMode={viewMode}
                selectedZoneKey={selectedZone.side === 'right' ? selectedZone.scoreKey : null}
                onZoneClick={handleZoneClick}
                onZoneHover={handleZoneHover}
                onMouseLeave={handleMouseLeave}
              />
            </div>
          </div>

          {/* Color legend */}
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { label: viewMode === 'temperature' ? '≤31.5°C' : viewMode === 'pressure' ? '<40' : '<40', color: '#4ECDC4' },
              { label: viewMode === 'temperature' ? '~32°C' : viewMode === 'pressure' ? '40-60' : '40-60', color: '#F0E000' },
              { label: viewMode === 'temperature' ? '~33°C' : viewMode === 'pressure' ? '60-75' : '60-75', color: '#FFB347' },
              { label: viewMode === 'temperature' ? '≥34°C' : viewMode === 'pressure' ? '≥75' : '≥75', color: '#FF6B6B' },
            ].map((item) => (
              <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--clr-text-muted)' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: item.color, display: 'inline-block' }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL — Zone details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Zone selector */}
          <div className="glass" style={{ padding: '1rem' }}>
            <h3 className="font-syne" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
              Select Zone
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {ALL_ZONES.map(({ zone, side }) => {
                const isActive = selectedZone.scoreKey === zone.scoreKey && selectedZone.side === side;
                return (
                  <button
                    key={zone.key}
                    onClick={() => handleZoneClick(zone, side)}
                    style={{
                      padding: '0.3rem 0.625rem',
                      borderRadius: '6px',
                      border: `1px solid ${isActive ? 'var(--clr-accent)' : 'var(--clr-border)'}`,
                      background: isActive ? 'rgba(78,205,196,0.15)' : 'transparent',
                      color: isActive ? 'var(--clr-accent)' : 'var(--clr-text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      fontFamily: 'DM Sans, sans-serif',
                      transition: 'all 0.15s',
                    }}
                  >
                    {zone.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Zone Detail Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedZone.scoreKey + selectedZone.side}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="glass"
              style={{ padding: '1.25rem', borderLeft: `3px solid ${selColor}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 className="font-syne" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--clr-text)', marginBottom: '0.25rem' }}>
                    {selectedZone.label}
                  </h3>
                  <span style={{
                    display: 'inline-block', fontSize: '0.72rem', fontWeight: 700,
                    padding: '0.2rem 0.6rem', borderRadius: '20px',
                    background: `${selColor}20`, color: selColor,
                  }}>
                    {selRiskLabel}
                  </span>
                </div>
                <div className="font-syne" style={{ fontSize: '2rem', fontWeight: 800, color: selColor, lineHeight: 1 }}>
                  {selScore}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                {[
                  { label: 'Peak Pressure', value: `${selPressure} N/cm²`, color: 'var(--clr-text)' },
                  { label: 'Temperature', value: `${selTemp.toFixed(1)}°C`, color: 'var(--clr-text)' },
                  { label: 'ΔT vs Contralateral', value: `${parseFloat(tempDelta) >= 0 ? '+' : ''}${tempDelta}°C ${isTempAlert ? '⚠️' : ''}`, color: isTempAlert ? 'var(--clr-warning)' : 'var(--clr-text)' },
                  { label: 'Status', value: selScore >= 75 ? 'Elevated 4+ days' : 'Monitoring', color: selScore >= 75 ? 'var(--clr-danger)' : 'var(--clr-success)' },
                ].map((item) => (
                  <div key={item.label} style={{ background: 'rgba(78,205,196,0.05)', borderRadius: '8px', padding: '0.625rem' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--clr-text-muted)', marginBottom: '0.25rem' }}>{item.label}</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {selScore >= 75 && (
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(255,107,107,0.08)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,107,107,0.2)',
                  marginBottom: '0.75rem',
                }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', lineHeight: 1.5, fontStyle: 'italic' }}>
                    "This zone has shown sustained pressure-temperature co-elevation for 4 days — a pre-ulcer signature pattern. Continue PBM therapy and offloading protocol."
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Bilateral comparison chart */}
          <div className="glass" style={{ padding: '1.25rem' }}>
            <h3 className="font-syne" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--clr-text)', marginBottom: '0.25rem' }}>
              Bilateral Pressure Comparison
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginBottom: '0.875rem' }}>N/cm² — Left vs Right</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={BILATERAL_DATA} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <XAxis dataKey="zone" tick={{ fill: 'var(--clr-text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--clr-text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: '8px', fontSize: '0.78rem' }}
                  labelStyle={{ color: 'var(--clr-text-muted)' }}
                />
                <Legend wrapperStyle={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)' }} />
                <Bar dataKey="left" name="Left Foot" fill="#4ECDC4" radius={[3, 3, 0, 0]} />
                <Bar dataKey="right" name="Right Foot" fill="#FFB347" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gait Metrics */}
          <div className="glass" style={{ padding: '1.25rem' }}>
            <h3 className="font-syne" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--clr-text)', marginBottom: '0.875rem' }}>
              Gait Metrics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginBottom: '0.375rem' }}>Symmetry Score</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.375rem' }}>
                  <span className="font-syne" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--clr-warning)' }}>{gait.symmetryScore}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>/100</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${gait.symmetryScore}%`, background: 'var(--clr-warning)' }} />
                </div>
              </div>
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginBottom: '0.375rem' }}>Steps Today</p>
                <p className="font-syne" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--clr-text)' }}>
                  {gait.stepsToday.toLocaleString()}
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)' }}>Arch: {gait.archType}</p>
              </div>
            </div>

            <div style={{ marginTop: '0.875rem' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginBottom: '0.375rem' }}>
                Gait Phase Distribution
              </p>
              <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', height: '20px' }}>
                <div style={{ width: `${gaitPhase.heelStrike}%`, background: '#4ECDC4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#0D2B3E' }}>{gaitPhase.heelStrike}%</span>
                </div>
                <div style={{ width: `${gaitPhase.midstance}%`, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#fff' }}>{gaitPhase.midstance}%</span>
                </div>
                <div style={{ width: `${gaitPhase.propulsion}%`, background: '#FFB347', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#0D2B3E' }}>{gaitPhase.propulsion}%</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.375rem' }}>
                {[
                  { label: 'Heel Strike', color: '#4ECDC4' },
                  { label: 'Midstance', color: '#3B82F6' },
                  { label: 'Propulsion', color: '#FFB347' },
                ].map((item) => (
                  <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.68rem', color: 'var(--clr-text-muted)' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.color, display: 'inline-block' }} />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Data Feed */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="glass"
        style={{ padding: '1.25rem', marginTop: '1.5rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ECDC4', display: 'inline-block', animation: 'hotspot-pulse 1.5s ease-in-out infinite' }} />
          <h3 className="font-syne" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--clr-text)' }}>
            Live Sensor Feed
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)' }}>— updating every 3.5s</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <AnimatePresence initial={false}>
            {liveReadings.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="live-feed-entry"
                style={{
                  padding: '0.5rem 0.875rem',
                  background: 'rgba(78,205,196,0.04)',
                  borderRadius: '8px',
                  border: '1px solid var(--clr-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                }}
              >
                <span style={{ color: 'var(--clr-text-muted)', flexShrink: 0 }}>{entry.timestamp}</span>
                <span style={{ color: 'var(--clr-accent)', fontWeight: 600 }}>{entry.zone}</span>
                <span style={{ color: 'var(--clr-text)' }}>{entry.pressure.toFixed(0)} N/cm²</span>
                <span style={{ color: 'var(--clr-text)' }}>{entry.temperature.toFixed(1)}°C</span>
                <span style={{ color: getRiskColorHex(entry.risk), fontWeight: 700, marginLeft: 'auto' }}>
                  Risk: {entry.risk.toFixed(0)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      <style>{`
        @media (max-width: 1000px) {
          .solemap-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </motion.div>
  );
}
