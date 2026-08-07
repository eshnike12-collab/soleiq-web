import FeaturedPaper from './research/FeaturedPaper'
import LiteratureSearch from './research/LiteratureSearch'

/**
 * Research.
 *
 * One SoleIQ paper, always on the page. Everything else in the field is behind
 * the search box — the literature is there in full when someone goes looking
 * for it, rather than a wall of other people's work sitting under our name.
 */
export default function Research() {
  return (
    <section id="research" aria-labelledby="research-heading">
      <div className="shell section-pad pb-16 md:pb-20">
        <p className="eyebrow">Research</p>
        <h2 id="research-heading" className="h-section mt-5 max-w-3xl">
          The work behind the screening, and the literature it sits in.
        </h2>
        <p className="lede mt-6 max-w-prose">
          Our own paper is below. Under it is a live search over the published
          record, kept separate and clearly labelled, so the two are never
          confused.
        </p>

        <p className="mt-10 max-w-2xl border-l-2 pl-5 text-[1.0625rem] leading-relaxed text-clr-text"
           style={{ borderColor: 'var(--clr-accent-2)' }}>
          SoleIQ has been advised by more than 50 researchers, physicians, and
          surgeons working in artificial intelligence, biomedical engineering,
          and clinical medicine across the country.
        </p>

        <FeaturedPaper />
      </div>

      {/* Third-party literature — tinted band, its own heading and provenance. */}
      <div style={{ background: 'var(--clr-surface)' }}>
        <div className="shell py-20 md:py-28">
          <h3 className="h-sub">Search the literature</h3>
          <p className="mt-4 max-w-prose text-[0.9375rem] leading-relaxed text-clr-muted">
            The published record on diabetic foot disease, screening, and
            machine learning in medicine. Nothing is listed until you search for
            it.
          </p>
          <div className="mt-10">
            <LiteratureSearch />
          </div>
        </div>
      </div>
    </section>
  )
}
