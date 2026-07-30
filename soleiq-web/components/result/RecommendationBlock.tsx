/**
 * Frozen product recommendation, rendered below check results on BOTH report
 * views. The data is what the app generated at the time of the check (stored
 * in report_recommendations) — never re-computed. The `audience` prop only
 * switches which "why" signals show: plain language for patients, clinical
 * detail for clinicians. Server-renderable.
 */

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

export function RecommendationBlock({
  recommendation,
  audience,
}: {
  recommendation: StoredRecommendation | null;
  audience: "patient" | "clinician";
}) {
  if (!recommendation || recommendation.products.length === 0) return null;
  const signals =
    (audience === "clinician"
      ? recommendation.signals?.clinician
      : recommendation.signals?.patient) ?? [];

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
        {audience === "clinician"
          ? "Products suggested to the patient"
          : "Products that may help"}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Recommended when this check was analyzed
        {recommendation.created_at
          ? ` (${new Date(recommendation.created_at).toLocaleDateString()})`
          : ""}
        . Over-the-counter options only — not a prescription.
      </p>

      <div className="mt-3 space-y-3">
        {recommendation.products.map((product) => (
          <div
            key={product.id}
            className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-950">{product.name}</h3>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-brand">
                {product.helpsWith}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
              {product.howItHelps}
            </p>
            <p className="mt-1.5 text-xs text-slate-500">{product.reason}</p>
            {product.caution && (
              <p className="mt-1.5 text-xs font-medium text-amber-700">
                {product.caution}
              </p>
            )}
            <a
              href={product.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-semibold text-brand"
            >
              Where to find it →
            </a>
          </div>
        ))}
      </div>

      {signals.length > 0 && (
        <div className="mt-4 rounded-2xl bg-slate-100/80 p-4">
          <h3 className="text-xs font-semibold text-slate-900">
            Why this was recommended
          </h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-600">
            {signals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </div>
      )}
      {audience === "patient" && (
        <p className="mt-3 text-[11px] italic text-slate-500">
          General options only — follow your care team&apos;s advice before
          starting anything new.
        </p>
      )}
    </section>
  );
}
