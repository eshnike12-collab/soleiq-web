import { useEffect, useId, useRef, useState } from 'react'
import { ArrowUpRight, Search } from 'lucide-react'
import {
  LiteratureSearchError,
  searchLiterature,
  type LiteratureResult,
} from '../../lib/europepmc'
import { useT, fill } from '../../i18n/I18nProvider'

const DEBOUNCE_MS = 400

/**
 * Live search over Europe PMC.
 *
 * Starts empty on purpose. The whole record is available through this box, but
 * only to someone who asks for it — the section is not a reading list of other
 * people's papers sitting under SoleIQ's name.
 */
export default function LiteratureSearch() {
  const d = useT()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LiteratureResult[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = useState('')
  const inputId = useId()
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      abortRef.current?.abort()
      setResults([])
      setStatus('idle')
      return
    }

    setStatus('loading')
    const timer = window.setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      searchLiterature(trimmed, { signal: controller.signal })
        .then((rows) => {
          if (controller.signal.aborted) return
          setResults(rows)
          setStatus('ready')
        })
        .catch((err: unknown) => {
          if ((err as Error)?.name === 'AbortError') return
          setError(
            err instanceof LiteratureSearchError
              ? err.message
              : d.research.searchError
          )
          setResults([])
          setStatus('error')
        })
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => () => abortRef.current?.abort(), [])

  return (
    <div>
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor={inputId} className="eyebrow">
          {d.research.searchHeading}
        </label>
        <div className="relative mt-3">
          <Search
            size={17}
            aria-hidden="true"
            className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-clr-muted"
          />
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={d.research.searchPlaceholder}
            autoComplete="off"
            className="field py-3.5 ps-11"
            style={{ background: 'var(--clr-bg)' }}
          />
        </div>
      </form>


      <p className="mt-6 text-xs leading-relaxed text-clr-muted">
        Results come from{' '}
        <a
          href="https://europepmc.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Europe PMC
        </a>
        . They are independent publications, not SoleIQ research, and are not
        endorsements of SoleIQ.
      </p>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {status === 'loading' && d.research.searching}
        {status === 'ready' && fill(d.research.resultsFor, { count: results.length, query })}
        {status === 'error' && error}
      </div>

      <div className="mt-8">
        {status === 'loading' && <SkeletonList />}

        {status === 'error' && (
          <div
            className="rounded-xl px-5 py-6"
            style={{ border: '1px solid var(--clr-border-strong)' }}
          >
            <p className="text-[0.9375rem] text-clr-text">{error}</p>
            <button
              type="button"
              onClick={() => setQuery((q) => `${q} `.trim())}
              className="btn btn-secondary btn-sm mt-4"
            >
              Try again
            </button>
          </div>
        )}

        {status === 'idle' && (
          <p className="text-[0.9375rem] text-clr-muted">
            Search a topic, such as diabetic foot ulcer, offloading, or
            neuropathy screening, and the matching records appear here.
          </p>
        )}

        {status === 'ready' && results.length === 0 && (
          <p className="text-[0.9375rem] text-clr-muted">
            {fill(d.research.noResults, { query: query.trim() })}
          </p>
        )}

        {status === 'ready' && results.length > 0 && (
          <ol className="grid gap-4 md:grid-cols-2">
            {results.map((r) => (
              <li key={r.key}>
                <ResultCard result={r} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

function ResultCard({ result }: { result: LiteratureResult }) {
  const d = useT()
  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col rounded-xl p-5 transition-colors"
      style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)' }}
    >
      <p className="flex flex-wrap items-center gap-2 text-xs text-clr-muted">
        <span
          className="rounded px-1.5 py-0.5 text-[0.6875rem] uppercase tracking-widest"
          style={{ background: 'var(--clr-surface-2)' }}
        >
          Europe PMC
        </span>
        {result.year && <span>{result.year}</span>}
        {result.openAccess && (
          <span style={{ color: 'var(--clr-accent-2)' }}>{d.research.openAccess}</span>
        )}
        {typeof result.citedByCount === 'number' && result.citedByCount > 0 && (
          <span>{result.citedByCount} citations</span>
        )}
      </p>

      <h4 className="mt-3 text-[1.0625rem] font-medium leading-snug text-clr-text group-hover:underline">
        {result.title}
      </h4>

      {result.authors && (
        <p className="clamp-2 mt-2 text-[0.8125rem] leading-relaxed text-clr-muted">
          {result.authors}
        </p>
      )}
      {result.journal && (
        <p className="mt-1 text-[0.8125rem] italic text-clr-muted">{result.journal}</p>
      )}
      {result.abstract && (
        <p className="clamp-3 mt-3 text-[0.875rem] leading-relaxed text-clr-muted">
          {result.abstract}
        </p>
      )}

      <span
        className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[0.8125rem] font-medium"
        style={{ color: 'var(--clr-accent-2)' }}
      >
        View the paper
        <ArrowUpRight size={14} aria-hidden="true" />
      </span>
    </a>
  )
}

function SkeletonList() {
  return (
    <ul className="grid gap-4 md:grid-cols-2" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <li
          key={i}
          className="rounded-xl p-5"
          style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)' }}
        >
          <span className="block h-3 w-24 rounded bg-clr-surface-2" />
          <span className="mt-4 block h-4 w-full rounded bg-clr-surface-2" />
          <span className="mt-2 block h-4 w-4/5 rounded bg-clr-surface-2" />
          <span className="mt-5 block h-3 w-2/3 rounded bg-clr-surface-2" />
          <span className="mt-2 block h-3 w-1/2 rounded bg-clr-surface-2" />
        </li>
      ))}
    </ul>
  )
}
