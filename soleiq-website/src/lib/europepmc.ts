/**
 * Europe PMC literature search.
 *
 * The REST API is free, needs no key, and returns
 * `access-control-allow-origin: *`, so it is called straight from the browser
 * with no proxy. Verified against
 * https://www.ebi.ac.uk/europepmc/webservices/rest/search — see
 * docs/cross-subdomain-session.md for the note on what would change if that
 * ever stops being true.
 */

const ENDPOINT = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search'

export interface LiteratureResult {
  key: string
  title: string
  authors: string
  journal: string
  year: string
  abstract: string
  url: string
  doi: string | null
  openAccess: boolean
  citedByCount: number | null
}

interface RawResult {
  id?: string
  source?: string
  doi?: string
  title?: string
  authorString?: string
  pubYear?: string
  abstractText?: string
  isOpenAccess?: string
  citedByCount?: number
  journalInfo?: { journal?: { title?: string } }
  fullTextUrlList?: { fullTextUrl?: { url?: string; availability?: string }[] }
}

/**
 * Abstracts come back with inline markup (`<h4>Background</h4>` and friends).
 * We strip rather than render it — nothing from this API is ever inserted as
 * HTML.
 */
function toPlainText(input: string): string {
  return input
    .replace(/<\/(h\d|p|div|li)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function articleUrl(r: RawResult): string {
  // Europe PMC's own record page first.
  //
  // The full-text URLs in `fullTextUrlList` point at publisher sites, and a
  // good share of them 404, sit behind an interstitial, or refuse to be opened
  // from another origin — which is why clicking a result so often went nowhere.
  // The canonical record page always resolves, and carries the publisher links
  // itself for anyone who wants them.
  if (r.source && r.id) return `https://europepmc.org/article/${r.source}/${r.id}`
  if (r.doi) return `https://doi.org/${r.doi}`
  const fallback = r.fullTextUrlList?.fullTextUrl?.find((u) => u.url)
  return fallback?.url ?? 'https://europepmc.org/'
}

export class LiteratureSearchError extends Error {}

export async function searchLiterature(
  query: string,
  opts: { signal?: AbortSignal; pageSize?: number } = {}
): Promise<LiteratureResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const params = new URLSearchParams({
    // Restrict to records that actually have an abstract, so cards are never
    // empty, and keep Europe PMC's own relevance ordering.
    query: `${trimmed} AND HAS_ABSTRACT:Y`,
    format: 'json',
    resultType: 'core',
    pageSize: String(opts.pageSize ?? 12),
  })

  let res: Response
  try {
    res = await fetch(`${ENDPOINT}?${params.toString()}`, { signal: opts.signal })
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err
    throw new LiteratureSearchError(
      'Could not reach Europe PMC. Check your connection and try again.'
    )
  }

  if (!res.ok) {
    throw new LiteratureSearchError(
      `Europe PMC returned ${res.status}. Try again in a moment.`
    )
  }

  const json = (await res.json()) as { resultList?: { result?: RawResult[] } }
  const rows = json.resultList?.result ?? []

  return rows.map((r, i) => ({
    key: `${r.source ?? 'x'}-${r.id ?? i}`,
    title: toPlainText(r.title ?? 'Untitled record'),
    authors: toPlainText(r.authorString ?? ''),
    journal: toPlainText(r.journalInfo?.journal?.title ?? ''),
    year: r.pubYear ?? '',
    abstract: toPlainText(r.abstractText ?? ''),
    url: articleUrl(r),
    doi: r.doi ?? null,
    openAccess: r.isOpenAccess === 'Y',
    citedByCount: typeof r.citedByCount === 'number' ? r.citedByCount : null,
  }))
}

/** Seeds the search box so the section is never empty on arrival. */
export const DEFAULT_QUERIES = [
  'diabetic foot ulcer',
  'AI foot screening',
  'peripheral artery disease detection',
  'diabetic peripheral neuropathy screening',
  'deep learning wound assessment',
]
