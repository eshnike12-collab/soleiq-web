import type { ComponentType } from "react";
import type { PatientProfile } from "./types";

import { Welcome } from "@/components/screens/01-Welcome";
import { Consent } from "@/components/screens/02-Consent";
import { AboutYou } from "@/components/screens/03-AboutYou";
import { Demographics } from "@/components/screens/04-Demographics";
import { MedicalHistory } from "@/components/screens/05-MedicalHistory";
import { VascularPAD } from "@/components/screens/05b-VascularPAD";
import { DiabetesDetails } from "@/components/screens/06-DiabetesDetails";
import { GlucoseMarkers } from "@/components/screens/07-GlucoseMarkers";
import { FootHistory } from "@/components/screens/08-FootHistory";
import { HealthLifestyle } from "@/components/screens/09-HealthLifestyle";
import { ShoeSize } from "@/components/screens/10-ShoeSize";
import { PainAssessment } from "@/components/screens/11-PainAssessment";
import { CapturePrep } from "@/components/screens/12-CapturePrep";
import { RightFoot } from "@/components/screens/13-RightFoot";
import { Right3D } from "@/components/screens/14-Right3D";
import { RightFootComplete } from "@/components/screens/14b-RightFootComplete";
import { LeftFoot } from "@/components/screens/15-LeftFoot";
import { Left3D } from "@/components/screens/16-Left3D";
import { Processing } from "@/components/screens/17-Processing";
import { Results } from "@/components/screens/18-Results";
import { NextSteps } from "@/components/screens/19-NextSteps";
import { ProductRecommendation } from "@/components/screens/20-ProductRecommendation";
import { Timeline } from "@/components/screens/T-Timeline";

export interface ScreenDef {
  id: string;
  component: ComponentType;
  showInProgress?: boolean;
  visibleIf?: (p: Partial<PatientProfile>) => boolean;
}

const hasDiabetes = (p: Partial<PatientProfile>) =>
  !!p.conditions?.includes("diabetes");

export const SCREEN_ORDER: ScreenDef[] = [
  { id: "welcome", component: Welcome },
  { id: "consent", component: Consent },
  { id: "about_you", component: AboutYou, showInProgress: true },
  { id: "demographics", component: Demographics, showInProgress: true },
  { id: "medical_history", component: MedicalHistory, showInProgress: true },
  {
    id: "vascular_pad",
    component: VascularPAD,
    showInProgress: true,
    // Show PAD screen whenever diabetes or PAD is in the conditions list — PAD
    // is a key independent driver of foot risk and we screen for it explicitly.
    visibleIf: (p) =>
      !!p.conditions?.includes("diabetes") ||
      !!p.conditions?.includes("peripheral artery disease"),
  },
  {
    id: "diabetes_details",
    component: DiabetesDetails,
    showInProgress: true,
    visibleIf: hasDiabetes,
  },
  {
    id: "glucose_markers",
    component: GlucoseMarkers,
    showInProgress: true,
    visibleIf: hasDiabetes,
  },
  { id: "foot_history", component: FootHistory, showInProgress: true },
  { id: "health_lifestyle", component: HealthLifestyle, showInProgress: true },
  { id: "shoe_size", component: ShoeSize, showInProgress: true },
  { id: "pain_assessment", component: PainAssessment, showInProgress: true },
  { id: "capture_prep", component: CapturePrep },
  { id: "right_foot", component: RightFoot },
  { id: "right_3d", component: Right3D },
  { id: "right_foot_complete", component: RightFootComplete },
  { id: "left_foot", component: LeftFoot },
  { id: "left_3d", component: Left3D },
  { id: "processing", component: Processing },
  { id: "results", component: Results },
  { id: "next_steps", component: NextSteps },
  { id: "product_recommendation", component: ProductRecommendation },
];

export const TIMELINE_INDEX = 99;
export const TIMELINE_SCREEN: ScreenDef = {
  id: "timeline",
  component: Timeline,
};

export function isVisible(
  index: number,
  profile: Partial<PatientProfile>
): boolean {
  if (index === TIMELINE_INDEX) return true;
  const def = SCREEN_ORDER[index];
  if (!def) return false;
  return def.visibleIf ? def.visibleIf(profile) : true;
}

export function getScreenForIndex(index: number): ScreenDef | undefined {
  if (index === TIMELINE_INDEX) return TIMELINE_SCREEN;
  return SCREEN_ORDER[index];
}

export function questionnaireProgress(
  index: number
): { total: number; current: number } | null {
  const stepsWithProgress = SCREEN_ORDER.map((s, i) => ({ s, i })).filter(
    ({ s }) => s.showInProgress
  );
  const idx = stepsWithProgress.findIndex(({ i }) => i === index);
  if (idx === -1) return null;
  return { total: stepsWithProgress.length, current: idx };
}
