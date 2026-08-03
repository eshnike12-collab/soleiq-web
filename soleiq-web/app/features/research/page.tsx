"use client";

/**
 * Patient Research tab — search published medical literature (PubMed /
 * PubMed Central) about a condition, with plain-language one-line summaries.
 * Educational only; the disclaimer banner makes that explicit.
 */

import { FormEvent, useCallback, useState } from "react";
import Link from "next/link";
import { Info, Search } from "lucide-react";
import { AuthGate } from "@/components/auth/AuthGate";

interface ResearchItem {
  pmid: string;
  title: string;
  source: string;
  year: string;
  summary: string;
  url: string;
  freeFullText: boolean;
}

type SearchStatus = "idle" | "loading" | "done" | "error";

const TOPIC_CHIPS = [
  "Diabetic foot ulcers",
  "Peripheral neuropathy",
  "Wound care",
  "Foot care for diabetes",
  "Preventing amputation",
];

function sessionCacheKey(query: string): string {
  return `soleiq-research-${query.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

function ResearchContent() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState("");

  const runSearch = useCallback(async (raw: string) => {
    const query = raw.trim();
    if (query.length < 2) return;
    setInput(query);
    setLastQuery(query);
    setStatus("loading");
    setError(null);

    // Client-side cache so back-navigation and repeat searches are instant.
    const cacheKey = sessionCacheKey(query);
    try {
      const cached = window.sessionStorage.getItem(cacheKey);
      if (cached) {
        setItems(JSON.parse(cached) as ResearchItem[]);
        setStatus("done");
        return;
      }
    } catch {
      /* sessionStorage unavailable — fetch instead */
    }

    try {
      const response = await fetch(`/api/research?q=${encodeURIComponent(query)}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error?.message || "We couldn't search right now. Please try again."
        );
      }
      const results = (payload.data?.items ?? []) as ResearchItem[];
      setItems(results);
      setStatus("done");
      try {
        window.sessionStorage.setItem(cacheKey, JSON.stringify(results));
      } catch {
        /* best effort */
      }
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "We couldn't search right now. Please try again."
      );
      setStatus("error");
    }
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runSearch(input);
  };

  return (
    <div className="min-h-screen bg-surface px-5 py-8">
      <main className="mx-auto max-w-3xl">
        <Link href="/features" className="inline-flex min-h-[44px] items-center py-2 text-sm font-semibold text-primary transition-colors hover:text-primary-deep">
          ← Features
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-ink">Research</h1>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
          Learn about your condition from published medical research.
        </p>

        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-warn-soft p-4 text-sm leading-relaxed text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-semibold">
              Educational information only — not medical advice.
            </span>{" "}
            Talk to your care team before acting on anything you read.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Search a condition, e.g. diabetic foot ulcer"
            maxLength={120}
            className="w-full rounded-full border border-slate-200 bg-surface-raised px-5 py-3 text-[15px] text-ink shadow-card placeholder:text-ink-faint outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white shadow-button transition-transform duration-150 active:scale-[0.98] disabled:opacity-60"
          >
            <Search className="h-4 w-4" /> Search
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {TOPIC_CHIPS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => void runSearch(topic)}
              className="min-h-[44px] rounded-full border border-slate-200 bg-surface-raised px-4 py-2.5 text-[13px] font-semibold text-ink-soft transition-colors hover:border-primary hover:text-primary"
            >
              {topic}
            </button>
          ))}
        </div>

        {status === "loading" && (
          <div className="mt-6 space-y-4">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="animate-pulse rounded-3xl border border-slate-200 bg-surface-raised p-6"
              >
                <div className="h-4 w-3/4 rounded bg-slate-200" />
                <div className="mt-3 h-3 w-1/3 rounded bg-slate-100" />
                <div className="mt-4 h-3 w-full rounded bg-slate-100" />
                <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card">
            <p className="font-bold text-ink">Something went wrong</p>
            <p className="mt-1 text-[15px] text-ink-soft">{error}</p>
            <button
              type="button"
              onClick={() => void runSearch(lastQuery)}
              className="mt-4 min-h-[44px] rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-button transition-transform duration-150 active:scale-[0.98]"
            >
              Try again
            </button>
          </div>
        )}

        {status === "done" && items.length === 0 && (
          <div className="mt-6 flex flex-col items-center rounded-3xl border border-slate-200 bg-surface-raised p-6 text-center shadow-card">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
              <Search className="h-6 w-6 text-primary" />
            </span>
            <p className="mt-3 font-bold text-ink">No results found</p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
              We couldn&apos;t find research for &ldquo;{lastQuery}&rdquo;. Try a
              simpler phrase or one of the topics above.
            </p>
          </div>
        )}

        {status === "done" && items.length > 0 && (
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <article
                key={item.pmid}
                className="rounded-3xl border border-slate-200 bg-surface-raised p-6 shadow-card"
              >
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-ink transition-colors hover:text-primary"
                >
                  {item.title}
                </a>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                  <span>
                    {item.source}
                    {item.year ? ` · ${item.year}` : ""}
                  </span>
                  {item.freeFullText && (
                    <span className="rounded-full bg-secondary-soft px-2 py-0.5 text-[10px] font-semibold text-green-700">
                      Free full text
                    </span>
                  )}
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-ink">
                  {item.summary}
                </p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex min-h-[44px] items-center py-2 text-sm font-bold text-primary transition-colors hover:text-primary-deep"
                >
                  Read the full article →
                </a>
              </article>
            ))}
          </div>
        )}

        <p className="mt-8 text-xs text-ink-faint">
          Results from PubMed / PubMed Central, provided by the U.S. National
          Library of Medicine.
        </p>
      </main>
    </div>
  );
}

export default function ResearchPage() {
  return (
    <AuthGate>
      <ResearchContent />
    </AuthGate>
  );
}
