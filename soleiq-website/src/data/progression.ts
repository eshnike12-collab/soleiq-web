/**
 * The Wagner grades, and how a foot moves between them.
 *
 * Every claim on this page is either the Wagner definition itself or a stated
 * range with its uncertainty attached. The one thing that must never appear
 * here is a number implying SoleIQ has measured a timeline it has not — see
 * `PROGRESSION_CAVEAT`, which is rendered with the section and is not optional.
 */

export type Window = 'soleiq' | 'standard'

/**
 * A grade, reduced to what is not language.
 *
 * Every word describing a grade — its name, the plain-language line, what is
 * true of the foot, what a photograph can establish, the timeline cell — now
 * lives in the dictionaries, keyed by `grade`. What stays here is the part
 * that is the same in every language: which grade it is, which half of the
 * story it belongs to, and what colour severity it carries.
 */
export interface Stage {
  grade: number
  /** Which half of the story this grade belongs to. */
  window: Window
  /** Severity tone, mapped to the site's level colours. */
  tone: 'clear' | 'watch' | 'soon' | 'urgent'
}

export const STAGES: Stage[] = [
  { grade: 0, window: 'soleiq', tone: 'clear' },
  { grade: 1, window: 'soleiq', tone: 'watch' },
  { grade: 2, window: 'soleiq', tone: 'soon' },
  { grade: 3, window: 'standard', tone: 'urgent' },
  { grade: 4, window: 'standard', tone: 'urgent' },
  { grade: 5, window: 'standard', tone: 'urgent' },
]
