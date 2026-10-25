/**
 * What kind of visible change a finding describes.
 *
 * The old gate was a single regex that let WOUND-like findings through and
 * discarded everything else, so a patient with dryness or callus — the
 * commonest findings by a wide margin, and the ones that precede a wound —
 * got no outline and no measurement at all.
 *
 * Kind matters beyond labelling: these changes do not separate from
 * surrounding skin on the same signal, so each drives a different
 * segmentation mode (see abnormalSkinMask).
 */

export type ChangeKind =
  | "wound"
  | "callus"
  | "redness"
  | "dryness"
  | "maceration"
  | "nail"
  | "swelling";

/**
 * Order is significant: the first match wins.
 *
 * Wound is tested first because an ulcer described as "dry, cracked skin with
 * an open sore at the centre" is a wound, and measuring it as dryness would
 * outline the wrong thing. Nail comes early for the same reason — a
 * discoloured nail is not redness of skin.
 */
const PATTERNS: [ChangeKind, RegExp][] = [
  [
    "wound",
    /wound|ulcer|\bopen\b|sore|blister|erosion|breakdown|dark tissue|black tissue|necro|slough|crater|eschar/i,
  ],
  [
    "nail",
    /nail|toenail|onycho|subungual|fungal nail|thick(ened)? nail|ingrown/i,
  ],
  [
    "maceration",
    /macerat|soggy|soft(ened)? white|between the toes|interdigital|damp|moist/i,
  ],
  [
    "callus",
    /callus|callos|corn\b|hyperkerat|hard(ened)? skin|thick(ened)? skin|pressure spot/i,
  ],
  [
    "dryness",
    /\bdry\b|dryness|flak|scal(e|ing|y)|xerosis|crack|fissure|rough skin|peeling/i,
  ],
  [
    "redness",
    /red(ness)?|erythema|inflamed|inflammation|warm(th)? spot|hot spot|discolou?r/i,
  ],
  ["swelling", /swell|oedema|edema|puffy|enlarged/i],
];

/**
 * Classify a finding's description.
 *
 * Returns null when nothing matches, which the caller treats as "do not
 * measure" — inventing a kind would pick a segmentation mode at random and
 * outline whatever that mode happened to find.
 */
export function classifyChange(text: string): ChangeKind | null {
  if (!text) return null;
  for (const [kind, pattern] of PATTERNS) {
    if (pattern.test(text)) return kind;
  }
  return null;
}

/** How a kind is named to a patient. */
export const CHANGE_LABEL: Record<ChangeKind, string> = {
  wound: "Wound",
  callus: "Callus",
  redness: "Redness",
  dryness: "Dry skin",
  maceration: "Softened skin",
  nail: "Nail change",
  swelling: "Swelling",
};
