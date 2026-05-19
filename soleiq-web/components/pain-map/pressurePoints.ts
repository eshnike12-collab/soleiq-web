import type { FootSide } from "@/lib/types";

export interface PressurePoint {
  id: string;
  side: FootSide;
  label: string;
  x: number;
  y: number;
}

const points = (side: FootSide, mirror: boolean): PressurePoint[] => {
  const flip = (x: number) => (mirror ? 1 - x : x);
  return [
    { id: `${side}_heel_central`,   side, label: "Heel — central",   x: flip(0.50), y: 0.88 },
    { id: `${side}_heel_medial`,    side, label: "Heel — medial",    x: flip(0.40), y: 0.86 },
    { id: `${side}_heel_lateral`,   side, label: "Heel — lateral",   x: flip(0.60), y: 0.86 },
    { id: `${side}_mid_medial`,     side, label: "Midfoot — medial", x: flip(0.40), y: 0.66 },
    { id: `${side}_mid_lateral`,    side, label: "Midfoot — lateral",x: flip(0.60), y: 0.66 },
    { id: `${side}_mt1`,            side, label: "1st metatarsal",   x: flip(0.36), y: 0.46 },
    { id: `${side}_mt2`,            side, label: "2nd metatarsal",   x: flip(0.44), y: 0.44 },
    { id: `${side}_mt3`,            side, label: "3rd metatarsal",   x: flip(0.52), y: 0.43 },
    { id: `${side}_mt4`,            side, label: "4th metatarsal",   x: flip(0.60), y: 0.44 },
    { id: `${side}_mt5`,            side, label: "5th metatarsal",   x: flip(0.66), y: 0.46 },
    { id: `${side}_great_toe`,      side, label: "Great toe",        x: flip(0.34), y: 0.22 },
    { id: `${side}_lesser_toes_a`,  side, label: "Lesser toes 2-3",  x: flip(0.46), y: 0.18 },
    { id: `${side}_lesser_toes_b`,  side, label: "Lesser toes 3-4",  x: flip(0.56), y: 0.18 },
    { id: `${side}_lesser_toes_c`,  side, label: "Lesser toes 4-5",  x: flip(0.66), y: 0.20 },
  ];
};

export const PRESSURE_POINTS: PressurePoint[] = [
  ...points("right", false),
  ...points("left", true),
];
