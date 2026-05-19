"use client";

export function ContributingFactors({ factors }: { factors: string[] }) {
  return (
    <div className="rounded-2xl border border-warmGray-100 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-warmGray-800">
        Top contributing factors
      </h3>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-warmGray-800">
        {factors.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ol>
    </div>
  );
}
