/**
 * The Wagner grades, and how a foot moves between them.
 *
 * Every claim on this page is either the Wagner definition itself or a stated
 * range with its uncertainty attached. The one thing that must never appear
 * here is a number implying SoleIQ has measured a timeline it has not — see
 * `PROGRESSION_CAVEAT`, which is rendered with the section and is not optional.
 */

export type Window = 'soleiq' | 'standard'

export interface Stage {
  grade: number
  /** The Wagner label. */
  name: string
  /** Plain-language version, for the card. */
  plain: string
  /** What is physically true of the foot at this grade. */
  what: string
  /** What a photograph can and cannot establish here. */
  camera: string
  /** What SoleIQ does at this point. */
  soleiq: string
  /** Which half of the story this grade belongs to. */
  window: Window
  /** Timeline cell. */
  when: { label: string; detail: string }
  /** Time to the next grade, untreated. */
  toNext: string | null
  /** Severity tone, mapped to the site's level colours. */
  tone: 'clear' | 'watch' | 'soon' | 'urgent'
}

export const STAGES: Stage[] = [
  {
    grade: 0,
    name: 'No open lesion',
    plain: 'Intact skin, at-risk foot',
    what: 'The skin is unbroken. There may be callus, deformity or a pressure point building underneath — and with neuropathy, none of it is felt.',
    camera:
      'A photograph is at its most useful here, because there is nothing to feel and nothing anyone is looking for. What it captures is a baseline: the callus, the colour, the shape, dated.',
    soleiq:
      'This is the grade SoleIQ is built for. Regular screening establishes what this foot normally looks like, so a change has something to be a change from.',
    window: 'soleiq',
    when: { label: 'Baseline', detail: 'intact skin, at-risk foot' },
    toNext: 'Trigger event — days to weeks',
    tone: 'clear',
  },
  {
    grade: 1,
    name: 'Superficial ulcer',
    plain: 'The skin has broken',
    what: 'Full-thickness skin loss that has not reached tendon, capsule or bone. Often painless, which is exactly why it goes unreported.',
    camera:
      'Visible. A break in the skin, its margins and the redness around it are all surface features, and surface features are what a camera reads well.',
    soleiq:
      'A screening at this grade returns a level that says get this looked at, with the finding marked on the patient’s own photograph and the previous weeks alongside it.',
    window: 'soleiq',
    when: { label: 'Month 0', detail: 'ulcer onset, the clock starts' },
    toNext: 'About 2 to 8 weeks',
    tone: 'watch',
  },
  {
    grade: 2,
    name: 'Deep ulcer',
    plain: 'Down to tendon or bone',
    what: 'The ulcer extends to tendon, joint capsule or bone, without abscess or osteomyelitis.',
    camera:
      'The opening is visible; the depth is not. No photograph can tell you how far a wound goes, and this is the grade where that limit starts to matter.',
    soleiq:
      'Flagged as urgent and handed over with the history attached. Depth is a probe finding, made by a clinician — the app’s job is to make sure someone is holding the probe.',
    window: 'soleiq',
    when: { label: 'Month 0.5 to 2', detail: 'from the first break in skin' },
    toNext: 'About 1 to 3 months',
    tone: 'soon',
  },
  {
    grade: 3,
    name: 'Osteitis or abscess',
    plain: 'Infection has reached bone',
    what: 'Deep infection: abscess, osteomyelitis, or infective tendonitis. This is the point where the question changes from healing the wound to saving the foot.',
    camera:
      'Beyond a camera. Bone involvement is established by probing, imaging and blood work — not by looking at skin.',
    soleiq:
      'Nothing here is a screening problem any more. The value SoleIQ can add to this grade was spent months earlier, at grade 0 and 1.',
    window: 'standard',
    when: { label: 'Month 2 to 5', detail: 'bone involvement, probe to bone' },
    toNext: 'About 1 to 3 months',
    tone: 'urgent',
  },
  {
    grade: 4,
    name: 'Partial gangrene',
    plain: 'Tissue death, limb threat',
    what: 'Localised gangrene — commonly the forefoot or toes. Revascularisation and surgical decisions are being made under time pressure.',
    camera: 'Beyond a camera, and beyond screening. This is inpatient care.',
    soleiq: 'Out of scope. Included here because the path has to be shown whole to be believed.',
    window: 'standard',
    when: { label: 'Month 4 to 9', detail: 'tissue death, limb threat' },
    toNext: 'Days to weeks',
    tone: 'urgent',
  },
  {
    grade: 5,
    name: 'Extensive gangrene',
    plain: 'The whole foot',
    what: 'Gangrene of the whole foot. Major amputation territory.',
    camera: 'Beyond a camera.',
    soleiq: 'Out of scope — and the outcome the first two grades exist to prevent.',
    window: 'standard',
    when: { label: 'Month 6 to 18', detail: 'major amputation territory' },
    toNext: null,
    tone: 'urgent',
  },
]

export const WINDOWS: Record<Window, { title: string; line: string }> = {
  soleiq: {
    title: 'Where SoleIQ works',
    line: 'Catch it before the skin ever breaks.',
  },
  standard: {
    title: 'Where care usually starts',
    line: 'By the time it hurts or smells, the damage is done.',
  },
}

/**
 * Rendered with the section, always. The timeline above is a worst case, not a
 * forecast, and saying so is the difference between a useful illustration and
 * a frightening one.
 */
export const PROGRESSION_CAVEAT =
  'Wagner grades severity at a point in time; it is not a validated timed sequence. The ranges above describe a worst-case trajectory in an untreated or poorly controlled foot. Many people present already at grade 2 or 3, and with good offloading, perfusion and infection control, roughly 60 to 80 percent of ulcers heal in 12 to 20 weeks without ever progressing. In an ischaemic foot the same sequence can collapse into days. SoleIQ is a monitoring and triage aid, not a diagnostic device, and it does not grade wounds.'
