import { z } from "zod";
import type { PhotoScreeningResult } from "./types";

export const PhotoScreeningSchema = z.object({
  capture_quality: z.object({
    usable: z.boolean(),
    retake: z.array(
      z.object({
        image: z.string(),
        reason: z.string(),
      })
    ),
  }),
  overall: z.object({
    headline: z.string(),
    level: z.enum(["clear", "watch", "see_someone_soon", "urgent"]),
  }),
  findings: z.array(
    z.object({
      foot: z.enum(["left", "right"]),
      surface: z.enum(["top", "sole"]),
      what_we_saw: z.string(),
      location_plain: z.string(),
      concern: z.enum(["low", "medium", "high"]),
      why_it_matters: z.string(),
      deeper_explanation: z.string(),
      lighting_artifact_possible: z.boolean(),
      region: z
        .object({
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
          w: z.number().min(0).max(1),
          h: z.number().min(0).max(1),
        })
        .nullable(),
    })
  ),
  looks_good: z.array(z.string()),
  personal_notes: z.array(z.string()),
  what_to_do: z.array(z.string()),
  when_to_get_help: z.array(z.string()),
  limits: z.string(),
  not_a_diagnosis: z.literal(true),
});

const URGENT_SIGNS =
  /spreading redness|drainage|pus|dark tissue|black tissue|deep wound|open wound|red streak/i;

export function enforceScreeningSafety(
  result: PhotoScreeningResult,
  symptoms?: { pain?: boolean; numbness?: string }
): PhotoScreeningResult {
  const discouragesCare = /\b(fine|nothing to worry|no need (to|for)|do not seek|don't seek)\b/i;
  const safeHeadline = discouragesCare.test(result.overall.headline)
    ? result.overall.level === "clear"
      ? "Keep checking your feet and follow your care team's advice."
      : result.overall.level === "watch"
        ? "Watch the visible area and get help if it changes or worries you."
        : result.overall.level === "see_someone_soon"
          ? "Arrange a professional foot check soon."
          : "Get prompt professional care for the visible foot concern."
    : result.overall.headline;
  const limits = /cannot|can't/i.test(result.limits)
    ? result.limits
    : "A photo cannot show problems beneath the skin or detect deep or early inflammation, so a clear-looking photo does not rule out a developing problem.";
  const symptomHelp = [
    ...(symptoms?.pain
      ? ["Because you reported pain, contact your care team if it is new, worsening, or concerning."]
      : []),
    ...(symptoms?.numbness && !/neither|not reported/i.test(symptoms.numbness)
      ? ["Because numbness can hide an injury, inspect both feet daily and follow your care team's advice."]
      : []),
  ];
  const safeResult: PhotoScreeningResult = {
    ...result,
    overall: { ...result.overall, headline: safeHeadline },
    what_to_do: result.what_to_do.filter((item) => !discouragesCare.test(item)),
    when_to_get_help: [
      ...result.when_to_get_help.filter((item) => !discouragesCare.test(item)),
      ...symptomHelp,
    ],
    limits,
    not_a_diagnosis: true,
  };
  const urgentFinding = result.findings.some((finding) =>
    URGENT_SIGNS.test(
      `${finding.what_we_saw} ${finding.why_it_matters} ${finding.location_plain}`
    )
  );

  if (!urgentFinding && result.overall.level !== "urgent") return safeResult;

  const urgentHelp =
    "Get prompt medical care for spreading redness, drainage or pus, dark or black tissue, red streaks, or a deep or open wound.";
  return {
    ...safeResult,
    overall: {
      level: "urgent",
      headline: "Get prompt professional care for the visible foot concern.",
    },
    what_to_do: [
      "Contact a medical professional or urgent-care service now.",
      ...safeResult.what_to_do.filter(
        (step) => !/wait|monitor at home|no care/i.test(step)
      ),
    ],
    when_to_get_help: safeResult.when_to_get_help.some((item) =>
      URGENT_SIGNS.test(item)
    )
      ? safeResult.when_to_get_help
      : [urgentHelp, ...safeResult.when_to_get_help],
    not_a_diagnosis: true,
  };
}

export const PHOTO_SCREENING_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "capture_quality",
    "overall",
    "findings",
    "looks_good",
    "personal_notes",
    "what_to_do",
    "when_to_get_help",
    "limits",
    "not_a_diagnosis",
  ],
  properties: {
    capture_quality: {
      type: "object",
      additionalProperties: false,
      required: ["usable", "retake"],
      properties: {
        usable: { type: "boolean" },
        retake: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["image", "reason"],
            properties: {
              image: { type: "string" },
              reason: { type: "string" },
            },
          },
        },
      },
    },
    overall: {
      type: "object",
      additionalProperties: false,
      required: ["headline", "level"],
      properties: {
        headline: { type: "string" },
        level: {
          type: "string",
          enum: ["clear", "watch", "see_someone_soon", "urgent"],
        },
      },
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "foot",
          "surface",
          "what_we_saw",
          "location_plain",
          "concern",
          "why_it_matters",
          "deeper_explanation",
          "lighting_artifact_possible",
          "region",
        ],
        properties: {
          foot: { type: "string", enum: ["left", "right"] },
          surface: { type: "string", enum: ["top", "sole"] },
          what_we_saw: { type: "string" },
          location_plain: { type: "string" },
          concern: { type: "string", enum: ["low", "medium", "high"] },
          why_it_matters: { type: "string" },
          deeper_explanation: { type: "string" },
          lighting_artifact_possible: { type: "boolean" },
          region: {
            anyOf: [
              {
                type: "object",
                additionalProperties: false,
                required: ["x", "y", "w", "h"],
                properties: {
                  // Structured outputs rejects minimum/maximum on numbers;
                  // the 0..1 range is enforced by PhotoScreeningSchema (zod).
                  x: { type: "number" },
                  y: { type: "number" },
                  w: { type: "number" },
                  h: { type: "number" },
                },
              },
              { type: "null" },
            ],
          },
        },
      },
    },
    looks_good: { type: "array", items: { type: "string" } },
    personal_notes: { type: "array", items: { type: "string" } },
    what_to_do: { type: "array", items: { type: "string" } },
    when_to_get_help: { type: "array", items: { type: "string" } },
    limits: { type: "string" },
    not_a_diagnosis: { type: "boolean", enum: [true] },
  },
} as const;
