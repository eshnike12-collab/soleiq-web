import { describe, expect, it } from "vitest";
import { enforceScreeningSafety, PhotoScreeningSchema } from "@/lib/photoScreening";

const base = PhotoScreeningSchema.parse({
  capture_quality: { usable: true, retake: [] },
  overall: { headline: "Monitor the area.", level: "watch" },
  findings: [],
  looks_good: [],
  personal_notes: [],
  what_to_do: ["Check again tomorrow."],
  when_to_get_help: [],
  limits: "Photos cannot show problems beneath the skin.",
  not_a_diagnosis: true,
});

describe("deterministic screening safety", () => {
  it("escalates visible urgent signs and preserves the diagnosis boundary", () => {
    const safe = enforceScreeningSafety({
      ...base,
      findings: [
        {
          foot: "left",
          surface: "sole",
          what_we_saw: "Open wound with drainage",
          location_plain: "under the forefoot",
          concern: "high",
          why_it_matters: "Needs prompt assessment",
          deeper_explanation: "Visible surface concern",
          lighting_artifact_possible: false,
          region: null,
        },
      ],
    });
    expect(safe.overall.level).toBe("urgent");
    expect(safe.what_to_do[0]).toMatch(/prompt|contact/i);
    expect(safe.not_a_diagnosis).toBe(true);
  });

  it("adds symptom-specific caution for numbness", () => {
    const safe = enforceScreeningSafety(base, { numbness: "both" });
    expect(safe.when_to_get_help.join(" ")).toMatch(/numbness/i);
  });
});



/* ───────────────────────────────────────────────────────────────────────────
   A healthy result must survive enforcement intact
   ─────────────────────────────────────────────────────────────────────────── */

describe("healthy results are no longer gutted", () => {
  const healthy = () =>
    ({
      overall: {
        level: "clear" as const,
        headline: "Both feet look healthy in these photos.",
      },
      capture_quality: { usable: true, retake: [] },
      findings: [],
      looks_good: ["The skin on both soles looks intact with even colour."],
      maintenance_tips: [
        "Look at the top and sole of both feet every day.",
        "Moisturise your feet daily, but not between the toes.",
      ],
      personal_notes: [],
      what_to_do: ["Moisturise the fine, dry skin on your heels daily."],
      when_to_get_help: ["If a fine crack opens into a sore, contact your team."],
      limits: "A photo cannot show problems beneath the skin.",
      not_a_diagnosis: true as const,
    }) as never;

  it("keeps a positive headline instead of rewriting it", () => {
    const out = enforceScreeningSafety(healthy());
    expect(out.overall.headline).toBe("Both feet look healthy in these photos.");
  });

  it("no longer strips ordinary advice containing the word fine", () => {
    // The old regex matched the bare word "fine" anywhere and deleted this.
    const out = enforceScreeningSafety(healthy());
    expect(out.what_to_do).toContain(
      "Moisturise the fine, dry skin on your heels daily."
    );
    expect(out.when_to_get_help).toContain(
      "If a fine crack opens into a sore, contact your team."
    );
  });

  it("keeps maintenance tips at level clear", () => {
    expect(enforceScreeningSafety(healthy()).maintenance_tips).toHaveLength(2);
  });

  it("still states that a photo does not rule a problem out", () => {
    // Non-negotiable on the healthy screen.
    const out = enforceScreeningSafety(healthy());
    expect(out.limits).toMatch(/cannot|can't/i);
    expect(out.not_a_diagnosis).toBe(true);
  });
});

describe("the healthy path is not a loophole", () => {
  const clearWithUrgentSign = () =>
    ({
      overall: { level: "clear" as const, headline: "Both feet look healthy." },
      capture_quality: { usable: true, retake: [] },
      findings: [
        {
          foot: "left" as const,
          surface: "sole" as const,
          what_we_saw: "an open wound with spreading redness",
          why_it_matters: "",
          location_plain: "",
          deeper_explanation: "",
          region: null,
          concern: "high" as const,
        },
      ],
      looks_good: ["Nail colour looks even."],
      maintenance_tips: ["Look at both feet every day."],
      personal_notes: [],
      what_to_do: [],
      when_to_get_help: [],
      limits: "A photo cannot show problems beneath the skin.",
      not_a_diagnosis: true as const,
    }) as never;

  it("escalates to urgent even when the model said clear", () => {
    expect(enforceScreeningSafety(clearWithUrgentSign()).overall.level).toBe(
      "urgent"
    );
  });

  it("drops maintenance tips when it escalates", () => {
    // "Keep moisturising" attached to an urgent finding buries the urgent part.
    expect(
      enforceScreeningSafety(clearWithUrgentSign()).maintenance_tips
    ).toEqual([]);
  });

  it("still blocks care-discouraging claims at level clear", () => {
    const result = enforceScreeningSafety({
      overall: { level: "clear", headline: "Both feet look healthy." },
      capture_quality: { usable: true, retake: [] },
      findings: [],
      looks_good: [],
      maintenance_tips: [],
      personal_notes: [],
      what_to_do: [
        "This rules out any infection.",
        "Your feet are perfectly healthy.",
      ],
      when_to_get_help: [],
      limits: "A photo cannot show problems beneath the skin.",
      not_a_diagnosis: true,
    } as never);
    expect(result.what_to_do.join(" ")).not.toMatch(/rules out|perfectly healthy/i);
  });
});

describe("maintenance tips are clear-only", () => {
  it.each(["watch", "see_someone_soon", "urgent"] as const)(
    "empties them at level %s",
    (level) => {
      const result = enforceScreeningSafety({
        overall: { level, headline: "Something was seen." },
        capture_quality: { usable: true, retake: [] },
        findings: [],
        looks_good: [],
        maintenance_tips: ["Look at both feet every day."],
        personal_notes: [],
        what_to_do: [],
        when_to_get_help: [],
        limits: "A photo cannot show problems beneath the skin.",
        not_a_diagnosis: true,
      } as never);
      expect(result.maintenance_tips).toEqual([]);
    }
  );
});
