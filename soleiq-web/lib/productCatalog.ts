/**
 * Curated over-the-counter product catalog for the recommendation screen,
 * matched to what the photo screening actually found. Deliberately static —
 * no runtime shopping APIs — so recommendations stay reliable, reviewable,
 * and diabetic-safe.
 *
 * Safety line: NOTHING containing salicylic acid (or other keratolytic
 * "callus remover" acids) belongs in this catalog. Those are contraindicated
 * for people with diabetes and must never be suggested here. Urea-based
 * softening is the diabetic-safe route.
 *
 * URLs are retailer search links (durable) or manufacturer pages — direct
 * listing links go dead too often.
 */

import type { PatientProfile, PhotoScreeningResult } from "./types";

export type ProductCategory =
  | "dryness"
  | "fissures"
  | "callus"
  | "fungal"
  | "pressure"
  | "general";

export interface CatalogProduct {
  id: string;
  name: string;
  category: ProductCategory;
  helpsWith: string;
  /** Plain-language "how this may help you" sentence. */
  howItHelps: string;
  url: string;
  /** Extra caution rendered with the card, e.g. "confirm with a clinician". */
  caution?: string;
}

export const PRODUCT_CATALOG: CatalogProduct[] = [
  // ---- Dry / flaking skin -------------------------------------------------
  {
    id: "eucerin-advanced-repair",
    name: "Eucerin Advanced Repair Foot Cream",
    category: "dryness",
    helpsWith: "Dry, flaky skin",
    howItHelps:
      "A urea-based moisturizer that softens dry, flaking skin and helps the skin hold moisture, lowering the chance of cracks forming.",
    url: "https://www.amazon.com/s?k=eucerin+advanced+repair+foot+cream",
  },
  {
    id: "okeeffes-healthy-feet",
    name: "O'Keeffe's for Healthy Feet",
    category: "dryness",
    helpsWith: "Very dry, rough skin",
    howItHelps:
      "A thick barrier cream for very dry feet; used daily it restores flexibility to rough skin so it is less likely to split.",
    url: "https://www.amazon.com/s?k=o%27keeffe%27s+for+healthy+feet",
  },
  // ---- Cracks / fissures --------------------------------------------------
  {
    id: "flexitol-heel-balm",
    name: "Flexitol Heel Balm (25% urea)",
    category: "fissures",
    helpsWith: "Cracked heels and fissures",
    howItHelps:
      "A high-strength urea balm made for cracked heels — it softens and repairs the hard, split skin so cracks can close instead of deepening.",
    url: "https://www.amazon.com/s?k=flexitol+heel+balm",
  },
  // ---- Callus / thick hard skin (urea-only — never salicylic acid) --------
  {
    id: "urea-40-cream",
    name: "Urea 40% Foot Cream (e.g. PurSources)",
    category: "callus",
    helpsWith: "Thick callus and hardened skin",
    howItHelps:
      "40% urea gently softens thick callus over time without cutting or acids — the diabetic-safe way to reduce hard skin that presses on the tissue underneath.",
    url: "https://www.amazon.com/s?k=urea+40%25+foot+cream",
    caution:
      "Never use acid-based callus removers or blades with diabetes — urea creams like this are the safe option.",
  },
  // ---- Suspected fungal signs ---------------------------------------------
  {
    id: "lotrimin-af",
    name: "Lotrimin AF (clotrimazole 1%)",
    category: "fungal",
    helpsWith: "Athlete's foot / fungal-looking scaling",
    howItHelps:
      "An over-the-counter antifungal cream that treats athlete's-foot-type scaling and itching between the toes.",
    url: "https://www.amazon.com/s?k=lotrimin+af+cream",
    caution:
      "Confirm with a clinician first — fungal-looking skin can be something else, and infections with diabetes deserve a professional look.",
  },
  {
    id: "lamisil-at",
    name: "Lamisil AT (terbinafine 1%)",
    category: "fungal",
    helpsWith: "Athlete's foot / fungal-looking scaling",
    howItHelps:
      "A short-course antifungal cream; terbinafine often clears athlete's foot in about a week of daily use.",
    url: "https://www.amazon.com/s?k=lamisil+at+cream",
    caution:
      "Confirm with a clinician first — fungal-looking skin can be something else, and infections with diabetes deserve a professional look.",
  },
  // ---- Redness / pressure -------------------------------------------------
  {
    id: "diabetic-socks",
    name: "Diabetic socks (non-binding, cushioned)",
    category: "pressure",
    helpsWith: "Pressure spots and circulation comfort",
    howItHelps:
      "Seamless, non-binding socks cushion pressure points and avoid tight bands that mark the skin — a simple daily upgrade for diabetic foot care.",
    url: "https://www.amazon.com/s?k=diabetic+socks+seamless",
  },
  // ---- General diabetic foot care -----------------------------------------
  {
    id: "cerave-sa-free-moisturizer",
    name: "CeraVe Daily Moisturizing Lotion",
    category: "general",
    helpsWith: "Everyday skin maintenance",
    howItHelps:
      "A gentle daily moisturizer keeps foot skin supple so small cracks are less likely to start — apply daily but not between the toes.",
    url: "https://www.amazon.com/s?k=cerave+daily+moisturizing+lotion",
  },
];

export interface ProductSuggestion {
  product: CatalogProduct;
  /** Why this was suggested, referencing the patient's own finding. */
  reason: string;
}

const MATCHERS: { category: ProductCategory; pattern: RegExp }[] = [
  { category: "fissures", pattern: /crack|fissure|split/i },
  { category: "callus", pattern: /callus|hard(ened)? skin|thicken|hyperkerat/i },
  { category: "fungal", pattern: /fungal|athlete|tinea|itch|peeling between|scal(?:ing|y) between/i },
  { category: "dryness", pattern: /\bdry|flak|xerosis|rough skin|scal(?:ing|y)\b/i },
  { category: "pressure", pattern: /redness|red (?:area|patch|spot)|pressure (?:point|area|spot)/i },
];

/**
 * Map the screening findings (+ intake) to catalog entries, each with a
 * sentence tying it back to what the check actually found. Deduped by
 * product; capped so the screen stays scannable.
 */
export function suggestProducts(
  screening: PhotoScreeningResult | null | undefined,
  profile: Partial<PatientProfile>,
  max = 5
): ProductSuggestion[] {
  const suggestions = new Map<string, ProductSuggestion>();

  const add = (category: ProductCategory, reason: string) => {
    for (const product of PRODUCT_CATALOG) {
      if (product.category !== category) continue;
      if (!suggestions.has(product.id)) {
        suggestions.set(product.id, { product, reason });
      }
    }
  };

  for (const finding of screening?.findings ?? []) {
    // Skip lighting-suspect findings — don't sell products for a shadow.
    if (finding.lighting_artifact_possible) continue;
    const text = `${finding.what_we_saw} ${finding.why_it_matters}`;
    const where = `on your ${finding.foot} foot (${finding.location_plain.toLowerCase()})`;
    for (const matcher of MATCHERS) {
      if (matcher.pattern.test(text)) {
        add(
          matcher.category,
          `Your check found ${finding.what_we_saw.toLowerCase().replace(/\.$/, "")} ${where}.`
        );
      }
    }
  }

  // Diabetes without sock suggestion yet → general pressure care.
  const hasDiabetes = (profile.conditions ?? []).includes("diabetes");
  if (hasDiabetes && ![...suggestions.values()].some((s) => s.product.category === "pressure")) {
    add(
      "pressure",
      "With diabetes, cushioned non-binding socks protect pressure points every day — even when your photos look clear."
    );
  }

  // Nothing matched at all → general daily-care basics.
  if (suggestions.size === 0) {
    add(
      "general",
      "No specific product need was flagged in your check — this supports everyday diabetic foot care."
    );
  }

  return [...suggestions.values()].slice(0, max);
}
