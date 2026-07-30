import { apiHandler } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireAuth } from "@/server/auth";
import { DomainError, invalid } from "@/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Patient Research feature — searches PubMed for medical literature about a
 * condition and returns plain-language, one-line summaries per paper.
 *
 * Pipeline: esearch (ids) → esummary (metadata) + efetch (abstracts) →
 * one batched Anthropic call for patient-friendly summaries, with a
 * first-sentence-of-abstract fallback so the route succeeds even when the
 * model is unavailable.
 */

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const SUMMARY_MODEL = "claude-haiku-4-5-20251001";
const OVERALL_TIMEOUT_MS = 20_000;

const PUBMED_DOWN_MESSAGE =
  "The medical literature service is temporarily unavailable. Please try again in a few minutes.";

export interface ResearchItem {
  pmid: string;
  title: string;
  source: string;
  year: string;
  summary: string;
  url: string;
  freeFullText: boolean;
}

interface PaperDraft {
  pmid: string;
  title: string;
  source: string;
  year: string;
  pmcid: string | null;
  abstract?: string;
}

// ---------------------------------------------------------------------------
// Module-level cache: normalized query → results. 24h TTL, capped at 100
// entries (oldest evicted first — Map preserves insertion order).
// ---------------------------------------------------------------------------

interface CacheEntry {
  expires: number;
  items: ResearchItem[];
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;
const cache = new Map<string, CacheEntry>();

function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/\s+/g, " ").trim();
}

function cachePut(key: string, items: ResearchItem[]) {
  cache.delete(key); // re-insert so refreshed entries count as newest
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, items });
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function overallSignal(): AbortSignal | undefined {
  try {
    return typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(OVERALL_TIMEOUT_MS)
      : undefined;
  } catch {
    return undefined;
  }
}

/** Strip XML/HTML tags and decode the common entities PubMed emits. */
function cleanText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<any> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new DomainError("DEPENDENCY_ERROR", PUBMED_DOWN_MESSAGE, 502);
  }
  return response.json();
}

/**
 * efetch abstracts as XML; regex extraction (no XML dependency). Missing or
 * unparseable abstracts are fine — we just return what we found.
 */
async function fetchAbstracts(
  idsCsv: string,
  signal?: AbortSignal
): Promise<Map<string, string>> {
  const abstracts = new Map<string, string>();
  try {
    const response = await fetch(
      `${EUTILS}/efetch.fcgi?db=pubmed&retmode=xml&rettype=abstract&id=${idsCsv}`,
      { signal }
    );
    if (!response.ok) return abstracts;
    const xml = await response.text();
    for (const article of xml.split("</PubmedArticle>")) {
      const pmid = article.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1];
      if (!pmid || abstracts.has(pmid)) continue;
      const abstractRe = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g;
      const parts: string[] = [];
      let match: RegExpExecArray | null;
      while ((match = abstractRe.exec(article)) !== null) {
        const text = cleanText(match[1]);
        if (text) parts.push(text);
      }
      const abstract = parts.join(" ").trim();
      if (abstract) abstracts.set(pmid, abstract);
    }
  } catch {
    /* abstracts are optional — summaries fall back gracefully */
  }
  return abstracts;
}

/** First sentence of the abstract (≤160 chars), or a generic fallback. */
function fallbackSummary(abstract: string | undefined, query: string): string {
  if (abstract) {
    const first =
      abstract.match(/^[\s\S]*?[.!?](?=\s|$)/)?.[0]?.trim() || abstract.trim();
    if (first) {
      return first.length > 160 ? `${first.slice(0, 157).trimEnd()}…` : first;
    }
  }
  return `Research article about ${query}.`;
}

/**
 * ONE batched Anthropic call producing a plain-language sentence per paper.
 * Any failure (missing key, network, bad JSON) returns an empty map so the
 * caller falls back to abstract-derived summaries — the route never fails
 * because of this step.
 */
async function summarizePapers(
  papers: PaperDraft[],
  signal?: AbortSignal
): Promise<Map<string, string>> {
  const summaries = new Map<string, string>();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || papers.length === 0) return summaries;

  const payload = papers.map((paper) => ({
    pmid: paper.pmid,
    title: paper.title,
    abstract: paper.abstract ? paper.abstract.slice(0, 1200) : undefined,
  }));

  const prompt = [
    "You help patients with diabetes understand medical research.",
    "Below is a JSON array of research papers ({pmid, title, abstract?}).",
    "For each paper, write ONE sentence (max 25 words) in plain 8th-grade language explaining what the paper found or is about, for a patient with diabetes.",
    'Respond with ONLY a strict JSON array of objects shaped {"pmid": "...", "summary": "..."} — no other text.',
    "",
    JSON.stringify(payload),
  ].join("\n");

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: SUMMARY_MODEL,
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
      signal,
    });
    if (!upstream.ok) return summaries;
    const body = await upstream.json().catch(() => null);
    const text = body?.content?.find(
      (block: any) => block?.type === "text"
    )?.text;
    if (typeof text !== "string") return summaries;

    // Defensive parse: take the first [ ... ] span in the response.
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end <= start) return summaries;
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed)) return summaries;
    for (const entry of parsed) {
      const pmid = entry?.pmid != null ? String(entry.pmid) : "";
      const summary =
        typeof entry?.summary === "string" ? entry.summary.trim() : "";
      if (pmid && summary) summaries.set(pmid, summary);
    }
  } catch {
    /* fall back to abstract-derived summaries */
  }
  return summaries;
}

async function searchPubMed(query: string): Promise<ResearchItem[]> {
  const signal = overallSignal();
  try {
    const esearch = await fetchJson(
      `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=10&sort=relevance&term=${encodeURIComponent(query)}`,
      signal
    );
    const ids: string[] = (esearch?.esearchresult?.idlist ?? []).filter(
      (id: unknown): id is string => typeof id === "string" && /^\d+$/.test(id)
    );
    if (ids.length === 0) return [];

    const idsCsv = ids.join(",");
    const [esummary, abstracts] = await Promise.all([
      fetchJson(`${EUTILS}/esummary.fcgi?db=pubmed&retmode=json&id=${idsCsv}`, signal),
      fetchAbstracts(idsCsv, signal),
    ]);

    const result = esummary?.result ?? {};
    const papers: PaperDraft[] = [];
    for (const id of ids) {
      const doc = result[id];
      if (!doc || typeof doc !== "object") continue;
      const title = cleanText(String(doc.title ?? "")) || "Untitled article";
      const source =
        cleanText(String(doc.source ?? doc.fulljournalname ?? "")) || "PubMed";
      const year = String(doc.pubdate ?? "").match(/\d{4}/)?.[0] ?? "";
      let pmcid: string | null = null;
      if (Array.isArray(doc.articleids)) {
        for (const articleId of doc.articleids) {
          const idType = String(articleId?.idtype ?? "").toLowerCase();
          if (idType !== "pmc" && idType !== "pmcid") continue;
          const pmcMatch = String(articleId?.value ?? "").match(/PMC\d+/i);
          if (pmcMatch) {
            pmcid = pmcMatch[0].toUpperCase();
            break;
          }
        }
      }
      papers.push({ pmid: id, title, source, year, pmcid, abstract: abstracts.get(id) });
    }

    const summaries = await summarizePapers(papers, signal);

    return papers.map((paper) => ({
      pmid: paper.pmid,
      title: paper.title,
      source: paper.source,
      year: paper.year,
      summary: summaries.get(paper.pmid) || fallbackSummary(paper.abstract, query),
      url: paper.pmcid
        ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${paper.pmcid}/`
        : `https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`,
      freeFullText: Boolean(paper.pmcid),
    }));
  } catch (error) {
    if (error instanceof DomainError) throw error;
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new DomainError(
        "DEPENDENCY_ERROR",
        "The literature search took too long. Please try again.",
        502
      );
    }
    throw new DomainError("DEPENDENCY_ERROR", PUBMED_DOWN_MESSAGE, 502);
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const response = await apiHandler(request, async (meta) => {
    enforceRateLimit(`research:${meta.ip ?? "unknown"}`, 20, 60_000);
    await requireAuth();

    const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
    if (q.length < 2 || q.length > 120) {
      throw invalid("Please enter a search between 2 and 120 characters.");
    }

    const key = normalizeQuery(q);
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) {
      return { query: q, items: hit.items, cached: true };
    }
    if (hit) cache.delete(key);

    const items = await searchPubMed(q);
    cachePut(key, items);
    return { query: q, items, cached: false };
  });
  if (response.status === 200) {
    response.headers.set("Cache-Control", "private, max-age=3600");
  }
  return response;
}
