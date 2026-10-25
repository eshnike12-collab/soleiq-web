import { describe, expect, it } from "vitest";
import {
  COMMON_MEDICATIONS,
  categorizeMedication,
  medicationCategories,
  medicationsNeedAnswer,
  hasNamedMedications,
  suggestMedications,
  toMedicationItem,
} from "@/lib/medications";
import { buildPatientContext } from "@/lib/foot-analysis-prompt";

describe("suggestions", () => {
  it("matches a prefix", () => {
    expect(suggestMedications("warf").map((m) => m.name)).toEqual(["Warfarin"]);
  });

  it("finds the generic from a brand name", () => {
    expect(suggestMedications("eliquis").map((m) => m.name)).toEqual(["Apixaban"]);
    expect(suggestMedications("xarelto").map((m) => m.name)).toEqual(["Rivaroxaban"]);
    expect(suggestMedications("plavix").map((m) => m.name)).toEqual(["Clopidogrel"]);
  });

  it("ranks prefix matches above mid-word matches", () => {
    // "in" opens Insulin and also sits inside Warfarin and Lisinopril.
    const names = suggestMedications("in").map((m) => m.name);
    expect(names[0]).toBe("Insulin");
  });

  it("stays quiet until there is something to go on", () => {
    expect(suggestMedications("")).toEqual([]);
    expect(suggestMedications("w")).toEqual([]);
  });

  it("offers nothing for a name it does not know", () => {
    expect(suggestMedications("tirzepatide")).toEqual([]);
  });

  it("is case and whitespace insensitive", () => {
    expect(suggestMedications("  ELIQ ").map((m) => m.name)).toEqual(["Apixaban"]);
  });
});

describe("categorising", () => {
  it("categorises an exact name and an exact alias", () => {
    expect(categorizeMedication("Warfarin")).toBe("anticoagulant");
    expect(categorizeMedication("coumadin")).toBe("anticoagulant");
    expect(categorizeMedication("prednisolone")).toBe("corticosteroid");
    expect(categorizeMedication("metformin")).toBe("oral_diabetes");
  });

  it("refuses to guess from a partial name", () => {
    // A wrong category is worse than none: it would feed a reading hint to
    // the analysis that the drug does not justify.
    expect(categorizeMedication("warf")).toBeUndefined();
    expect(categorizeMedication("aspirin-like thing")).toBeUndefined();
  });

  it("returns undefined rather than throwing on junk", () => {
    expect(categorizeMedication("")).toBeUndefined();
    expect(categorizeMedication("   ")).toBeUndefined();
  });

  it("every table entry categorises to itself", () => {
    for (const entry of COMMON_MEDICATIONS) {
      expect(categorizeMedication(entry.name), entry.name).toBe(entry.category);
      for (const alias of entry.aliases ?? []) {
        expect(categorizeMedication(alias), alias).toBe(entry.category);
      }
    }
  });
});

describe("free text is always accepted", () => {
  it("keeps an unrecognised name verbatim, with no category", () => {
    const item = toMedicationItem("  Some Herbal Thing  ");
    expect(item).toEqual({ name: "Some Herbal Thing" });
  });

  it("keeps the patient's spelling, not the table's", () => {
    // Typing an alias records what they typed; only the category is borrowed.
    expect(toMedicationItem("eliquis")).toEqual({
      name: "eliquis",
      category: "anticoagulant",
    });
  });
});

describe("re-asking existing patients", () => {
  it("treats a profile with no medications key as never asked", () => {
    expect(medicationsNeedAnswer({})).toBe(true);
    expect(medicationsNeedAnswer({ conditions: ["diabetes"], age: 61 })).toBe(true);
  });

  it("treats an answered 'none' as asked", () => {
    expect(
      medicationsNeedAnswer({ medications: { takesMajorMedication: false, items: [] } })
    ).toBe(false);
  });

  it("treats 'prefer not to say' as asked, not as missing", () => {
    // This is the distinction the whole re-ask rule rests on: declining is an
    // answer, so it must not put the patient through the screen again.
    expect(
      medicationsNeedAnswer({ medications: { takesMajorMedication: null, items: [] } })
    ).toBe(false);
  });

  it("knows when names were given", () => {
    expect(hasNamedMedications({})).toBe(false);
    expect(
      hasNamedMedications({ medications: { takesMajorMedication: true, items: [] } })
    ).toBe(false);
    expect(
      hasNamedMedications({
        medications: { takesMajorMedication: true, items: [{ name: "Warfarin" }] },
      })
    ).toBe(true);
  });
});

describe("categories present", () => {
  it("reports distinct categories in a fixed order, not the order typed", () => {
    const categories = medicationCategories({
      medications: {
        takesMajorMedication: true,
        items: [
          { name: "Atorvastatin", category: "statin" },
          { name: "Warfarin", category: "anticoagulant" },
          { name: "Apixaban", category: "anticoagulant" },
          { name: "Herbal", category: undefined },
        ],
      },
    });
    expect(categories).toEqual(["anticoagulant", "statin"]);
  });

  it("is empty when nothing is categorised", () => {
    expect(
      medicationCategories({
        medications: { takesMajorMedication: true, items: [{ name: "Unknown" }] },
      })
    ).toEqual([]);
  });
});

describe("what the analysis is told", () => {
  const ctx = (medications: unknown) => buildPatientContext({ medications }, {});

  it("names the medicines and their categories", () => {
    const text = ctx({
      takesMajorMedication: true,
      items: [
        { name: "Warfarin", category: "anticoagulant" },
        { name: "Prednisone", category: "corticosteroid" },
      ],
    });
    expect(text).toContain("Medications: Warfarin (anticoagulant); Prednisone (corticosteroid)");
  });

  it("distinguishes none, declined, and taking-but-unnamed", () => {
    expect(ctx({ takesMajorMedication: false, items: [] })).toContain(
      "Medications: none reported"
    );
    expect(ctx({ takesMajorMedication: null, items: [] })).toContain(
      "preferred not to say"
    );
    expect(ctx({ takesMajorMedication: true, items: [] })).toContain(
      "names not given"
    );
  });

  it("says nothing at all when the question was never asked", () => {
    // An unasked question must not reach the model as a negative answer.
    expect(buildPatientContext({}, {})).not.toContain("Medications");
  });

  it("caps the list and the free-text note like every other field", () => {
    const text = ctx({
      takesMajorMedication: true,
      items: Array.from({ length: 30 }, (_, i) => ({ name: `Drug${i}` })),
      notes: "x".repeat(400),
    });
    expect(text).toContain("Drug11");
    expect(text).not.toContain("Drug12"); // 12 kept, the rest dropped
    // Just that line — the context continues with other fields after it.
    const notesLine =
      text.split("\n").find((line) => line.startsWith("Medication notes: ")) ?? "";
    expect(notesLine.replace("Medication notes: ", "").length).toBe(200);
  });

  it("clips a single absurdly long drug name", () => {
    const text = ctx({
      takesMajorMedication: true,
      items: [{ name: "z".repeat(200) }],
    });
    expect(text).not.toContain("z".repeat(41));
  });

  it("survives malformed items rather than throwing", () => {
    expect(() =>
      ctx({ takesMajorMedication: true, items: [null, {}, { name: 7 }] })
    ).not.toThrow();
  });
});
