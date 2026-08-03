"use client";

/**
 * Returning-patient review hub. Shown right after consent when saved
 * answers exist (profile.hasSavedIntake): every section of the intake is
 * summarized with an Edit button, so the patient only re-answers what
 * changed. Editing one section returns straight here (store.editFromReview),
 * and "Everything is the same" jumps to photo capture — photos are always
 * retaken, never reused.
 */

import { CheckCircle2, Pencil } from "lucide-react";
import { useSoleiqStore } from "@/lib/store";
import { SCREEN_ORDER } from "@/lib/flow-config";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScreenHeader } from "@/components/flow/ScreenContainer";
import { GLUCOSE_RANGES, FOOT_REGION_LABEL, type FootRegion } from "@/lib/types";

const stepIndex = (id: string) =>
  SCREEN_ORDER.findIndex((screen) => screen.id === id);

const titleCase = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function ReturningReview() {
  const profile = useSoleiqStore((s) => s.profile);
  const goTo = useSoleiqStore((s) => s.goTo);
  const goNext = useSoleiqStore((s) => s.goNext);
  const editFromReview = useSoleiqStore((s) => s.editFromReview);
  const ownIndex = stepIndex("returning_review");

  const hasDiabetes = (profile.conditions ?? []).includes("diabetes");
  const hasVascular =
    hasDiabetes || (profile.conditions ?? []).includes("peripheral artery disease");

  const value = (text: string | null | undefined) =>
    text && text.trim().length > 0 ? text : "Not provided";

  const sections: { screenId: string; label: string; summary: string; show?: boolean }[] = [
    {
      screenId: "about_you",
      label: "About you",
      summary: value(
        [profile.fullName, profile.city && `${profile.city}${profile.state ? `, ${profile.state}` : ""}`]
          .filter(Boolean)
          .join(" · ")
      ),
    },
    {
      screenId: "demographics",
      label: "Demographics",
      summary: value(
        [
          profile.age != null ? `Age ${profile.age}` : null,
          profile.sex ? titleCase(profile.sex) : null,
          profile.ethnicity ? titleCase(profile.ethnicity) : null,
        ]
          .filter(Boolean)
          .join(" · ")
      ),
    },
    {
      screenId: "medical_history",
      label: "Medical history",
      summary:
        (profile.conditions ?? []).length > 0
          ? (profile.conditions ?? []).map(titleCase).join(", ")
          : "No conditions reported",
    },
    {
      screenId: "vascular_pad",
      label: "Circulation / PAD",
      show: hasVascular,
      summary: profile.pad
        ? [
            `Status: ${titleCase(profile.pad.status ?? "unknown")}`,
            profile.pad.claudication ? "leg pain walking" : null,
            profile.pad.restPain ? "rest pain" : null,
            profile.pad.abi != null ? `ABI ${profile.pad.abi}` : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : "Not provided",
    },
    {
      screenId: "diabetes_details",
      label: "Diabetes details",
      show: hasDiabetes,
      summary: profile.diabetes
        ? [
            titleCase(profile.diabetes.type ?? ""),
            profile.diabetes.yearDiagnosed ? `since ${profile.diabetes.yearDiagnosed}` : null,
            profile.diabetes.hba1c != null ? `HbA1c ${profile.diabetes.hba1c}%` : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : "Not provided",
    },
    {
      screenId: "glucose_markers",
      label: "Glucose markers",
      show: hasDiabetes,
      summary: profile.diabetes?.glucoseCategory
        ? GLUCOSE_RANGES.find((r) => r.value === profile.diabetes?.glucoseCategory)?.label ??
          titleCase(profile.diabetes.glucoseCategory)
        : "Not provided",
    },
    {
      screenId: "foot_history",
      label: "Foot history",
      summary:
        (profile.priorEvents ?? []).length > 0
          ? (profile.priorEvents ?? [])
              .map(
                (event) =>
                  `${titleCase(event.type)} — ${titleCase(event.side)} (${FOOT_REGION_LABEL[event.region as FootRegion] ?? titleCase(event.region)}${event.year ? `, ${event.year}` : ""})`
              )
              .join("; ")
          : "No prior ulcers or amputations",
    },
    {
      screenId: "health_lifestyle",
      label: "Health & lifestyle",
      summary: [
        profile.numbness && profile.numbness !== "neither"
          ? `Numbness: ${titleCase(profile.numbness)}`
          : "No numbness",
        profile.smoking ? "smokes" : "non-smoker",
        profile.alcohol ? "drinks alcohol" : "no alcohol",
      ].join(" · "),
    },
    {
      screenId: "shoe_size",
      label: "Shoe size",
      summary: profile.shoeSizeUS
        ? `US ${profile.shoeSizeUS}${profile.footLengthMm ? ` (${profile.footLengthMm} mm)` : ""}`
        : "Not provided",
    },
    {
      screenId: "pain_assessment",
      label: "Pain",
      summary: profile.painPresent
        ? `Pain reported${(profile.painPoints ?? []).length ? ` — ${(profile.painPoints ?? []).length} spot${(profile.painPoints ?? []).length === 1 ? "" : "s"} marked` : ""}`
        : "No pain reported",
    },
  ];

  return (
    <div className="-mx-1 flex h-full flex-col overflow-y-auto px-1 pb-2">
      <ScreenHeader
        eyebrow="Welcome back"
        title="Review your answers"
        subtitle="We saved everything from your last check. Update anything that changed — the rest carries over. New photos are always taken fresh."
      />

      <div className="space-y-2">
        {sections
          .filter((section) => section.show !== false)
          .map((section) => {
            const target = stepIndex(section.screenId);
            return (
              <Card key={section.screenId} className="flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-ink">{section.label}</p>
                  <p className="truncate text-[13px] text-ink-soft">{section.summary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => target >= 0 && editFromReview(target, ownIndex)}
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-surface-raised px-3.5 text-[13px] font-bold text-primary transition-all duration-150 hover:border-slate-300 active:scale-[0.97]"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              </Card>
            );
          })}
      </div>

      <div className="mt-auto space-y-2 pt-4">
        <Button
          fullWidth
          size="lg"
          onClick={() => {
            const capture = stepIndex("capture_prep");
            if (capture >= 0) goTo(capture);
          }}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" /> Everything is the same — take new photos
        </Button>
        <button
          type="button"
          onClick={goNext}
          className="min-h-[44px] w-full text-center text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          Walk through every question again instead
        </button>
      </div>
    </div>
  );
}
