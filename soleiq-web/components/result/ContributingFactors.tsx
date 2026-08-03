"use client";

export function ContributingFactors({ factors }: { factors: string[] }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-surface-raised p-4 shadow-card">
      <h3 className="mb-2.5 text-[15px] font-bold text-ink">
        Top contributing factors
      </h3>
      <ol className="list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-soft">
        {factors.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ol>
    </div>
  );
}
