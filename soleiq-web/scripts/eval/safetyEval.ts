import { enforceScreeningSafety } from "@/lib/photoScreening";
import { SAFETY_CASES, type SafetyCase } from "./safetyCases";

/**
 * Deterministic eval of the screening safety layer.
 *
 * Run before and after any change to `enforceScreeningSafety`. It needs no
 * API key and no photographs, so there is no excuse for changing that
 * function without a number.
 *
 * FALSE NEGATIVES ARE REPORTED SEPARATELY AND ARE THE METRIC THAT MATTERS.
 * Here a false negative is care-discouraging language, or an urgent sign,
 * that survived enforcement and would reach a patient. A change that makes
 * healthy wording read better and costs one false negative is a bad trade.
 */

export interface Outcome {
  id: string;
  kind: SafetyCase["kind"];
  passed: boolean;
  detail: string;
}

function textOf(result: PhotoScreeningResultLike): string {
  return [
    result.overall.headline,
    ...result.what_to_do,
    ...result.when_to_get_help,
  ].join(" | ");
}

type PhotoScreeningResultLike = ReturnType<typeof enforceScreeningSafety>;

export function runSafetyEval() {
  const outcomes: Outcome[] = [];

  for (const testCase of SAFETY_CASES) {
    const enforced = enforceScreeningSafety(testCase.result);
    const text = textOf(enforced);
    let passed = false;
    let detail = "";

    if (testCase.kind === "must_strip") {
      passed = !text.toLowerCase().includes(testCase.forbidden!.toLowerCase());
      detail = passed ? "removed" : `LEAKED: ${testCase.forbidden}`;
    } else if (testCase.kind === "must_keep") {
      passed = text.toLowerCase().includes(testCase.required!.toLowerCase());
      detail = passed ? "kept" : `STRIPPED: ${testCase.required}`;
    } else {
      passed = enforced.overall.level === "urgent";
      detail = passed
        ? "escalated"
        : `NOT ESCALATED (stayed ${enforced.overall.level})`;
    }

    outcomes.push({ id: testCase.id, kind: testCase.kind, passed, detail });
  }

  // A stripped-but-harmless phrase is a usability cost. A leaked
  // care-discouraging claim, or a missed escalation, is a safety failure.
  const falseNegatives = outcomes.filter(
    (o) => !o.passed && (o.kind === "must_strip" || o.kind === "must_escalate")
  );

  const summary: Record<string, { passed: number; total: number }> = {};
  for (const outcome of outcomes) {
    summary[outcome.kind] ??= { passed: 0, total: 0 };
    summary[outcome.kind].total++;
    if (outcome.passed) summary[outcome.kind].passed++;
  }

  return { outcomes, falseNegatives, summary };
}
