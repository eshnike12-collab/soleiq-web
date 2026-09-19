/**
 * Frozen product recommendation, rendered below check results on the patient's
 * own report and on a report shared with their care circle. The data is what
 * the app generated at the time of the check (stored in
 * report_recommendations) — never re-computed. Server-renderable.
 *
 * The one thing that is not frozen is which Amazon storefront the links point
 * at: `StoreLink` sends an Indian-language reader to amazon.in, whatever was
 * stored at the time. The recommendation is the clinical record; the retailer
 * is just how you get the thing.
 */

import { StoreLink } from "./StoreLink";

interface RecommendedProduct {
  id: string;
  name: string;
  helpsWith: string;
  howItHelps: string;
  url: string;
  caution?: string;
  reason: string;
}

export interface StoredRecommendation {
  products: RecommendedProduct[];
  signals: { patient?: string[]; clinician?: string[] };
  created_at?: string;
}

/**
 * PATIENT-FACING ONLY. There is deliberately no clinician variant.
 *
 * These are over-the-counter creams for a patient to go and buy. On a clinical
 * record they are noise at best — a prescriber does not need a shopping list —
 * and at worst they read as a clinical recommendation the screening never
 * made. The audience prop and its "Products suggested to the patient" heading
 * were removed rather than left switched off, so no future call site can turn
 * it back on by passing the wrong string.
 */
export function RecommendationBlock({
  recommendation,
}: {
  recommendation: StoredRecommendation | null;
}) {
  if (!recommendation || recommendation.products.length === 0) return null;
  const signals = recommendation.signals?.patient ?? [];

  return (
    <section className="mt-6 rounded-3xl border border-slate-100 bg-surface-raised p-5 shadow-card">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
        Products that may help
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-faint">
        Recommended when this check was analyzed
        {recommendation.created_at
          ? ` (${new Date(recommendation.created_at).toLocaleDateString()})`
          : ""}
        . Over-the-counter options only — not a prescription.
      </p>

      <div className="mt-4 space-y-3">
        {recommendation.products.map((product) => (
          <div
            key={product.id}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[15px] font-bold text-ink">{product.name}</h3>
              <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase text-primary">
                {product.helpsWith}
              </span>
            </div>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
              {product.howItHelps}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-faint">{product.reason}</p>
            {product.caution && (
              <p className="mt-2 rounded-xl bg-warn-soft px-3 py-2 text-sm leading-relaxed text-amber-800">
                {product.caution}
              </p>
            )}
            <StoreLink
              url={product.url}
              className="mt-1 inline-flex min-h-[44px] items-center text-sm font-bold text-primary underline decoration-primary/30 underline-offset-4"
            >
              Where to find it →
            </StoreLink>
          </div>
        ))}
      </div>

      {signals.length > 0 && (
        <div className="mt-4 rounded-2xl bg-surface-sunken p-4">
          <h3 className="text-sm font-bold text-ink">
            Why this was recommended
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-ink-soft">
            {signals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        General options only — follow your care team&apos;s advice before
        starting anything new.
      </p>
    </section>
  );
}
