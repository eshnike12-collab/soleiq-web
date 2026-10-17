/**
 * Which of the four views a submitted check still has nothing for.
 *
 * Pure, and extracted from server/screenings.ts so the rule can be tested
 * directly. It is worth testing because getting it wrong is silent from the
 * patient's side: the save is refused with a 409, the client maps 409 to
 * "kept on this device", and the patient sees a success screen followed by a
 * dashboard with nothing new on it. Nothing anywhere says the check was
 * rejected.
 *
 * THE RULE: every view must be RESOLVED — photographed or deliberately
 * skipped — and at least one must be a real photograph. Identical to the gate
 * the capture screen applies before it lets anyone submit, which is the point:
 * when the two disagreed, the screen let people through and the server threw
 * them away.
 */

export type ViewSide = "left" | "right";
export type ViewName = "top" | "sole";

export const REQUIRED_VIEWS = [
  "left-top",
  "left-sole",
  "right-top",
  "right-sole",
] as const;

export type RequiredView = (typeof REQUIRED_VIEWS)[number];

export interface CoverageInput {
  images: { side: ViewSide; view: ViewName }[];
  skippedSlots?: { side: ViewSide; view: ViewName }[];
}

/** Views with neither a photo nor a skip, in a stable order. */
export function unresolvedViews(input: CoverageInput): RequiredView[] {
  const unresolved = new Set<string>(REQUIRED_VIEWS);
  for (const image of input.images) {
    unresolved.delete(`${image.side}-${image.view}`);
  }
  for (const slot of input.skippedSlots ?? []) {
    unresolved.delete(`${slot.side}-${slot.view}`);
  }
  // Filtered from the canonical list rather than spread from the Set, so the
  // order is the one above regardless of insertion order.
  return REQUIRED_VIEWS.filter((view) => unresolved.has(view));
}

export type CoverageVerdict =
  | { ok: true }
  | { ok: false; reason: "unresolved"; views: RequiredView[] }
  | { ok: false; reason: "no_photos" };

export function checkCoverage(input: CoverageInput): CoverageVerdict {
  const views = unresolvedViews(input);
  if (views.length > 0) return { ok: false, reason: "unresolved", views };
  // Skipping all four would produce a report about nothing.
  if (input.images.length === 0) return { ok: false, reason: "no_photos" };
  return { ok: true };
}
