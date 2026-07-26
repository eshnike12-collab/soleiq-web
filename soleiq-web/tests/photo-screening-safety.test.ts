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

