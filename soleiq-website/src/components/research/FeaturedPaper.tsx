import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { sortedPapers, STATUS_LABEL } from '../../data/research'

/**
 * SoleIQ's own paper — the one thing in this section that is always on screen.
 *
 * The abstract opens to its first two sentences and expands from there. A full
 * journal abstract is ~350 words; printed whole it swamps everything under it,
 * and collapsed entirely it reads as though there is nothing to show.
 */
export default function FeaturedPaper() {
  const paper = sortedPapers()[0]
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()

  if (!paper) {
    return (
      <p className="mt-10 max-w-prose text-[0.9375rem] text-clr-muted">
        No SoleIQ paper listed yet.
      </p>
    )
  }

  const link = paper.url ?? (paper.doi ? `https://doi.org/${paper.doi}` : null)
  const panelId = `abstract-${paper.id}`

  return (
    <article
      id={`paper-${paper.id}`}
      className="mt-12 border-t pt-10"
      style={{ borderColor: 'var(--clr-accent)' }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 text-[0.75rem] font-medium uppercase tracking-widest text-white"
          style={{ background: 'var(--clr-accent)' }}
        >
          SoleIQ
        </span>
        <span className="text-xs text-clr-muted">
          {STATUS_LABEL[paper.status]}
          {paper.year ? ` · ${paper.year}` : ''}
        </span>
      </div>

      <h3 className="mt-4 max-w-3xl font-display text-[1.5rem] font-medium leading-snug tracking-tight text-clr-text sm:text-[1.875rem]">
        {paper.title}
      </h3>
      <p className="mt-3 text-sm text-clr-muted">
        <em className="not-italic">{paper.venue}</em>
        {paper.citation ? ` · ${paper.citation}` : ''}
      </p>

      {/* Authors, as they are credited on the paper itself. */}
      <ul className="mt-8 flex flex-wrap gap-x-12 gap-y-6">
        {paper.authors.map((author) => (
          <li key={author.name} className="flex items-center gap-4">
            {author.photo && (
              <img
                src={author.photo}
                alt=""
                aria-hidden="true"
                width={220}
                height={220}
                loading="lazy"
                decoding="async"
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
            )}
            <span className="min-w-0">
              <span className="block font-display text-[1.0625rem] font-medium tracking-tight text-clr-text">
                {author.name}
              </span>
              <span
                className="block text-[0.75rem] font-medium uppercase tracking-widest"
                style={{ color: 'var(--clr-accent-2)' }}
              >
                {author.credit}
              </span>
              {author.title && (
                <span className="mt-1 block max-w-xs text-[0.8125rem] leading-snug text-clr-muted">
                  {author.title}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_16rem] md:gap-12">
        <div>
          <p className="eyebrow">Abstract</p>
          <p className="mt-3 max-w-prose text-[1.0625rem] leading-relaxed text-clr-text">
            {paper.abstractLede}
          </p>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                id={panelId}
                initial={reduce ? false : { height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={reduce ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
                className="overflow-hidden"
              >
                <p className="mt-4 max-w-prose text-[1.0625rem] leading-relaxed text-clr-text">
                  {paper.abstractRest}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            className="tap mt-4 inline-flex items-center gap-1.5 text-[0.9375rem] font-medium"
            style={{ color: 'var(--clr-accent-2)' }}
          >
            {open ? 'Show less' : 'Read the full abstract'}
            <ChevronDown
              size={16}
              aria-hidden="true"
              className="transition-transform duration-200"
              style={{ transform: open ? 'rotate(180deg)' : 'none' }}
            />
          </button>

          <div className="mt-8">
            {link ? (
              <>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  Read the full text
                  <ArrowUpRight size={15} aria-hidden="true" />
                </a>
                <p className="mt-3 text-xs text-clr-muted">
                  Opens the published issue (PDF) at the first page of the article.
                </p>
              </>
            ) : (
              <p className="text-sm text-clr-muted">
                A link will be added when the issue is online.
              </p>
            )}
          </div>
        </div>

        <dl className="text-sm">
          {paper.tags.length > 0 && (
            <>
              <dt className="eyebrow">Topics</dt>
              <dd className="mt-2.5 flex flex-wrap gap-1.5">
                {paper.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full px-2.5 py-1 text-xs"
                    style={{
                      background: 'var(--clr-surface)',
                      color: 'var(--clr-text-muted)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </dd>
            </>
          )}
          {paper.doi && (
            <>
              <dt className="eyebrow mt-6">DOI</dt>
              <dd className="mt-2 break-words text-clr-muted">{paper.doi}</dd>
            </>
          )}

          <dt className="eyebrow mt-6">Corresponding author</dt>
          <dd className="mt-2">
            <a
              href="mailto:eshnike12@gmail.com"
              className="text-clr-muted underline underline-offset-2 hover:text-clr-text"
            >
              eshnike12@gmail.com
            </a>
          </dd>
        </dl>
      </div>
    </article>
  )
}
