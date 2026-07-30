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
    <div className="min-h-screen bg-[#f4f6f8] px-5 py-8">
      <main className="mx-auto max-w-3xl">
        <Link href="/features" className="text-sm font-semibold text-brand">
          ← Features
        </Link>

        <h1 className="mt-4 text-2xl font-semibold text-slate-950">Research</h1>
        <p className="mt-1 text-sm text-slate-500">
          Learn about your condition from published medical research.
        </p>

        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
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
            className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-950 placeholder:text-slate-400 outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
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
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 hover:border-brand hover:text-brand"
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
                className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6"
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
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
            <p className="font-semibold text-slate-950">Something went wrong</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
            <button
              type="button"
              onClick={() => void runSearch(lastQuery)}
              className="mt-4 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        )}

        {status === "done" && items.length === 0 && (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
            <p className="font-semibold text-slate-950">No results found</p>
            <p className="mt-1 text-sm text-slate-500">
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
                className="rounded-3xl border border-slate-200 bg-white p-6"
              >
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-slate-950 hover:text-brand"
                >
                  {item.title}
                </a>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>
                    {item.source}
                    {item.year ? ` · ${item.year}` : ""}
                  </span>
                  {item.freeFullText && (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                      Free full text
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  {item.summary}
                </p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-semibold text-brand"
                >
                  Read the full article →
                </a>
              </article>
            ))}
          </div>
        )}

        <p className="mt-8 text-xs text-slate-500">
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
