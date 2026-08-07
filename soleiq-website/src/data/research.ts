/**
 * SoleIQ's own research index.
 *
 * Add a paper by appending an entry to `PAPERS`. Nothing else needs to change —
 * the index, the detail panel, and the deep links all read from here.
 *
 * Keep this file for SoleIQ-authored (or SoleIQ-collaborated) work only. Papers
 * found through the literature search on the same page come from Europe PMC and
 * are rendered separately on purpose.
 */

export type PaperStatus = 'published' | 'preprint' | 'in-preparation' | 'under-review'

export interface PaperAuthor {
  name: string
  /** Billing on the paper — "Author", "Co-author". */
  credit: string
  /** What they do, as printed on the paper. */
  title?: string
  /** Square headshot in /public. Displayed as a circle. */
  photo?: string
}

export interface Paper {
  /** Stable slug — used in the `#paper-<id>` deep link. Don't change it later. */
  id: string
  title: string
  authors: PaperAuthor[]
  /** Journal, conference, or preprint server. */
  venue: string
  /** Volume, issue, pages — whatever the venue uses. */
  citation?: string
  /** Publication year, or null while unpublished. */
  year: number | null
  status: PaperStatus
  /** The opening of the abstract, shown before anyone expands it. */
  abstractLede: string
  /** The remainder. Kept separate so the split is deliberate rather than the
      result of guessing where a sentence ends in text full of decimals. */
  abstractRest: string
  tags: string[]
  /** Link to the PDF, DOI, or landing page. Leave null until there is one. */
  url: string | null
  doi: string | null
  /** Optional cover image in /public. Falls back to a typographic card. */
  cover: string | null
  /** Pins the paper to the top of the index. */
  featured?: boolean
}

export const PAPERS: Paper[] = [
  {
    id: 'ai-guided-pbm-dfu-narrative-review',
    title:
      'Artificial Intelligence Guided Photobiomodulation as a Preventive System for Diabetic Foot Ulcers: A Narrative Review',
    authors: [
      {
        name: 'Eshaan Naik',
        credit: 'Author',
        title: 'Founder & CEO, SoleIQ Health',
        photo: '/author-naik.png',
      },
      {
        name: 'David G. Armstrong, DPM, MD, PhD',
        credit: 'Co-author',
        title: 'Professor of Surgery, Keck School of Medicine, USC · Director, SALSA',
        photo: '/author-armstrong.png',
      },
    ],
    venue: 'Curieux Academic Review',
    citation: 'July Issue, Issue 9, Part 3, pp. 370–387',
    year: 2026,
    status: 'published',
    abstractLede:
      'Diabetic foot ulcers (DFUs) affect approximately 18.6 million people annually, precede 80% of all diabetes-related lower-extremity amputations, and carry a five-year post-amputation mortality exceeding 70%. Because up to 65% of healed DFUs recur within five years and many are preceded by clinically silent tissue stress in patients with peripheral neuropathy, prevention, and the achievement of durable ulcer-free remission, rather than late-stage wound treatment, offers the greatest potential to change outcomes.',
    abstractRest:
      'Two technologies have matured independently and now converge to enable a genuinely preventive paradigm: (1) artificial intelligence (AI) applied to continuous, in-shoe multimodal sensing (plantar pressure, temperature, and gait) that can identify pre-ulcerative tissue stress days to weeks before skin breakdown, and (2) photobiomodulation (PBM), the application of red (620–700 nm) and near-infrared (700–1,100 nm) light that mechanistically reverses the mitochondrial, inflammatory, and microvascular deficits driving tissue vulnerability in diabetes. This narrative review argues that AI-guided, PBM-delivering wearable platforms, exemplified by the SoleIQ research framework described herein, constitute a coherent preventive system: AI detects latent risk, targets therapy to the correct anatomical zone at the correct dose, and closes the loop with continuous outcome monitoring. We synthesize the clinical evidence base for AI-based DFU early risk prediction, the biological rationale and dosimetry for prophylactic PBM, and the engineering and regulatory requirements for closed-loop preventive devices. Optimal prophylactic PBM parameters cluster in the 630–850 nm range at fluences of 1–4 J/cm² delivered three to five times weekly, while published AI risk-prediction models for DFU onset report area-under-curve (AUC) values of 0.80–0.95 on multimodal sensor data. We conclude that the principal obstacle to clinical deployment is no longer scientific or technical, but translational, specifically, the need for prospective trials validating integrated AI + PBM platforms as primary-prevention medical devices.',
    tags: [
      'Artificial intelligence',
      'Machine learning',
      'Photobiomodulation',
      'Diabetic foot ulcer prevention',
      'Remission',
      'Smart insole',
      'Wearable therapeutics',
      'Closed-loop system',
      'Predictive analytics',
    ],
    // The published issue PDF. `#page=369` is the article's first page in this
    // file (verified against the PDF, which runs to 386 pages); the issue's own
    // table of contents numbers the same page 370, hence the citation above.
    url: 'https://www.curieuxreview.com/_files/ugd/60ed3c_a3da999bd3604b01b0d1786152f47447.pdf#page=369',
    // TODO(soleiq): add the DOI here if Curieux issues one.
    doi: null,
    cover: null,
    featured: true,
  },
]

export function sortedPapers(): Paper[] {
  return [...PAPERS].sort((a, b) => {
    if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1
    return (b.year ?? 0) - (a.year ?? 0)
  })
}

export const STATUS_LABEL: Record<PaperStatus, string> = {
  published: 'Published',
  preprint: 'Preprint',
  'under-review': 'Under review',
  'in-preparation': 'In preparation',
}

/** Formats an author list without inventing an "et al." threshold per venue. */
export function formatAuthors(authors: PaperAuthor[]): string {
  const names = authors.map((a) => a.name)
  if (names.length === 0) return ''
  if (names.length <= 4) return names.join(', ')
  return `${names.slice(0, 3).join(', ')}, and ${names.length - 3} others`
}
