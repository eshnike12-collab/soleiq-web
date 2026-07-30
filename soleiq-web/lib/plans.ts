/**
 * Config-driven membership plans. The UI reads limits from here only —
 * add a tier (or later swap this for a `plans` table) without touching
 * screen code. Limits here are product rules, not security boundaries;
 * data access itself stays enforced by RLS.
 */

export interface PlanTier {
  id: string;
  name: string;
  priceLabel: string;
  /** Plan usage window in days. */
  durationDays: number;
  /** Family + caregiver slots (clinician invites don't count). */
  maxCaregivers: number;
  /** Checks allowed per day; null = weekly cadence guidance only. */
  dailyChecks: number | null;
  /** History retention in days; null = full retention. */
  historyRetentionDays: number | null;
  highlights: string[];
}

export const PLANS: Record<string, PlanTier> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceLabel: "Included",
    durationDays: 30,
    maxCaregivers: 2,
    dailyChecks: null,
    historyRetentionDays: 90,
    highlights: [
      "Full four-photo foot checks with AI screening",
      "Results shared instantly with your care team",
      "Up to 2 caregivers or family members",
      "1 month of usage",
    ],
  },
};

/** Everyone is on Starter today; tiers above land here as they ship. */
export const CURRENT_PLAN_ID = "starter";

export function getCurrentPlan(): PlanTier {
  return PLANS[CURRENT_PLAN_ID];
}

/** Future-plan benefits surfaced in the "Coming soon" section. */
export const COMING_SOON_BENEFITS: { title: string; detail: string }[] = [
  {
    title: "Daily checks",
    detail: "Run a full screening every day with trend alerts between visits.",
  },
  {
    title: "More caregivers",
    detail: "Invite more than 2 family members and caregivers to your circle.",
  },
  {
    title: "Extended history",
    detail: "Keep your complete check history beyond 90 days, for long-term progression tracking.",
  },
];
