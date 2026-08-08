/**
 * The narrative, declared as data.
 *
 * Scene order, scroll length, camera, background, palette, and copy all live
 * here — retiming or reordering the story never touches shader code. The only
 * contract with the engine is that `target` names a builder in targets.ts.
 */

export type TargetKey =
  | 'foot'
  | 'capture'
  | 'analysis'
  | 'clinician'
  | 'timeline'
  | 'logo'
  // Section compositions, outside the scroll narrative.
  | 'village'
  | 'city'
  | 'paper'

export interface Scene {
  id: string
  target: TargetKey
  kicker: string | null
  headline: string
  body: string
  /** Small print under the copy — used where a visual is illustrative. */
  note?: string
  /** Relative scroll length. Scene 5 gets the most, as the payoff. */
  length: number
  /** Fraction of the scene spent holding the formed shape before morphing on. */
  hold: number
  /**
   * How far across the frame the composition sits, 0 to 1, so the copy and the
   * scene rail always have clear space. Applied on wide viewports only; on
   * narrow ones the art is centred above the copy.
   *
   * Size and vertical placement are not declared here. They are solved in
   * framing.ts from the shape's own extent and the safe box, because a fixed
   * camera distance only frames correctly at the one window shape it was
   * chosen against — on any other one it drifted up behind the navbar.
   */
  x: number
  /** Share of the safe box to fill. 1 by default; lower holds a scene back. */
  fill?: number
  /**
   * Frames this scene in the full-width band above the copy, rather than
   * letting it also consider the narrower column beside the copy.
   *
   * A wide composition reads better across the whole width, and scenes that
   * should look alike have to be solved against the same box — otherwise one
   * lands in the column and its neighbour across the page, and they sit at
   * different sizes for no reason a reader can see.
   */
  aboveOnly?: boolean
  /**
   * Starts this scene's band nearer the navbar than the default, which buys it
   * height. Worth it only where the shape is wide and the band above the copy
   * is what limits its size — a tall shape gains nothing and would just crowd
   * the bar.
   */
  tallBand?: boolean
  /**
   * Lets this scene's copy run past the usual reading column, on one line.
   *
   * The column exists so a paragraph is a comfortable width. A single short
   * line is not a paragraph, and breaking it in two makes it look like one.
   */
  wideCopy?: boolean
  /** Background gradient, top then bottom. */
  bg: [string, string]
  /**
   * The purple ramp for anatomy and hardware, plus the accent.
   *
   * `deep` is the shadow end and `hi` the highlight: a formed shape spans all
   * three, which is what lets it read as a picture rather than a monotone
   * cloud. `ai` is the light blue that marks data and everything the model is
   * acting on. `hot` is what a particle becomes while it is in flight.
   */
  colors: {
    deep?: string
    core: string
    hi: string
    hot: string
    ai?: string
  }
  /**
   * Screen labels, anchored to named parts of the shape.
   *
   * Only for things a viewer cannot name on sight. A foot is obvious; that a
   * particular slab is the phone running the app is not.
   */
  labels?: { part: string; text: string; dx?: number; dy?: number }[]
  /** Additive blending only makes sense on the dark scenes. */
  additive: boolean
  /** Peak displacement during this scene's outgoing morph. */
  turbulence: number
  /** Scene 5 cycles its background and colour temperature warm → cool → warm. */
  dayNight?: boolean
}

export const SCENES: Scene[] = [
  {
    id: 'foot',
    target: 'foot',
    kicker: 'The problem',
    headline: 'It starts as something you cannot feel.',
    body: 'Diabetic neuropathy removes the signal that would normally make you look at your foot. Pressure, a blister, a crack in the skin: none of it hurts, so none of it prompts a check. Found early, a foot ulcer is usually manageable. Found late, it often is not.',
    // TODO(soleiq): if you want a sourced prevalence or outcome figure here,
    // send me the citation and I'll add it. Nothing unsourced goes on this page.
    length: 1,
    hold: 0.5,
    x: 0.68,
    bg: ['#0b1250', '#04072a'],
    colors: { deep: '#7c46c4', core: '#a45fe8', hi: '#cf9dff', hot: '#ffffff', ai: '#26f7fd' },
    additive: true,
    turbulence: 0.42,
  },
  {
    id: 'capture',
    target: 'capture',
    kicker: 'Capture',
    headline: 'Four guided photos. ≈4 minutes.',
    body: 'Both feet, top and sole, on the phone you already own. The app frames each shot and holds you steady through it. No attachment, no dock, no appointment.',
    length: 1,
    hold: 0.5,
    x: 0.64,
    bg: ['#0c1455', '#05082e'],
    colors: { deep: '#7c46c4', core: '#a45fe8', hi: '#cf9dff', hot: '#ffffff', ai: '#26f7fd' },
    labels: [{ part: 'phone', text: 'App', dx: -150 }],
    additive: true,
    turbulence: 0.46,
  },
  {
    id: 'analysis',
    target: 'analysis',
    kicker: 'Analysis',
    headline: 'Checked on your phone, then read against your history.',
    body: 'Quality checks and lighting normalisation run on the device before anything is uploaded. A vision model then reads all four images together with your intake (diabetes history, HbA1c, PAD and vascular answers, neuropathy, foot history, pain map), and returns one of four screening levels.',
    length: 1.15,
    hold: 0.5,
    x: 0.65,
    bg: ['#0a1049', '#030626'],
    colors: { deep: '#7c46c4', core: '#a45fe8', hi: '#cf9dff', hot: '#ffffff', ai: '#26f7fd' },
    labels: [
      { part: 'mesh', text: 'AI analysis' },
      { part: 'level', text: 'Risk level' },
    ],
    additive: true,
    turbulence: 0.55,
  },
  {
    id: 'clinician',
    target: 'clinician',
    kicker: 'Handover',
    headline: 'Your clinician receives the whole record.',
    body: 'Every intake field, the findings mapped onto your own photographs, and the complete history, with an assistant scoped to that patient record. You decide who it goes to.',
    length: 1.1,
    hold: 0.5,
    x: 0.6,
    bg: ['#0b1252', '#04072c'],
    colors: { deep: '#7c46c4', core: '#a45fe8', hi: '#cf9dff', hot: '#ffffff', ai: '#26f7fd' },
    labels: [
      { part: 'doctors', text: 'Your care team' },
      { part: 'record', text: 'Patient record', dy: -78 },
    ],
    additive: true,
    turbulence: 0.52,
  },
  {
    id: 'timeline',
    target: 'timeline',
    kicker: 'Over time',
    headline: 'A record that accumulates, and a risk that can come down.',
    body: 'Every screening is kept as a dated set of photos and levels. A change too slow to notice day to day becomes obvious across a timeline, and so does the direction it is heading.',
    note: 'Illustrative. Not patient data.',
    length: 1.9,
    hold: 0.42,
    x: 0.6,
    // Framed like the handover scene before it: same band, same place across
    // the page, so the pair reads as one movement. It takes the taller band
    // because this composition is wide and short, and the height of the band
    // is the only thing holding its size down.
    aboveOnly: true,
    tallBand: true,
    bg: ['#0b1250', '#030625'],
    colors: { deep: '#7c46c4', core: '#a45fe8', hi: '#cf9dff', hot: '#ffffff', ai: '#26f7fd' },
    labels: [{ part: 'curve', text: 'Risk over time', dy: -52 }],
    additive: true,
    turbulence: 0.42,
    dayNight: true,
  },
  {
    id: 'logo',
    target: 'logo',
    kicker: null,
    headline: 'SoleIQ',
    body: 'Screening and decision support for the diabetic foot. Not a diagnostic device.',
    length: 0.9,
    hold: 1,
    x: 0.5,
    aboveOnly: true,
    wideCopy: true,
    bg: ['#090e44', '#020520'],
    colors: { deep: '#7c46c4', core: '#a45fe8', hi: '#ffffff', hot: '#ffffff', ai: '#26f7fd' },
    additive: true,
    turbulence: 0.75,
  },
]

/** Cumulative scene boundaries in 0..1 of the whole narrative. */
export const SCENE_BOUNDS = (() => {
  const total = SCENES.reduce((s, sc) => s + sc.length, 0)
  let acc = 0
  return SCENES.map((sc) => {
    const start = acc / total
    acc += sc.length
    return { start, end: acc / total }
  })
})()

export interface SceneState {
  index: number
  /** 0..1 across the whole scene, including its hold. */
  local: number
  /** 0..1 across just the outgoing morph. 0 while the shape is held. */
  morph: number
}

/** Maps global narrative progress onto a scene, its hold, and its morph. */
export function sceneAt(progress: number): SceneState {
  const p = Math.min(0.999999, Math.max(0, progress))
  let index = SCENE_BOUNDS.findIndex((b) => p < b.end)
  if (index < 0) index = SCENES.length - 1

  const { start, end } = SCENE_BOUNDS[index]
  const local = (p - start) / Math.max(1e-6, end - start)
  const hold = SCENES[index].hold

  const morph = hold >= 1 ? 0 : Math.min(1, Math.max(0, (local - hold) / (1 - hold)))
  return { index, local, morph }
}

/** How visible a scene's DOM copy should be at a given global progress. */
export function copyOpacity(index: number, progress: number): number {
  const { start, end } = SCENE_BOUNDS[index]
  const span = end - start
  const inAt = start + span * 0.06
  const inDone = start + span * 0.2
  const outAt = start + span * (SCENES[index].hold * 0.92)
  const outDone = start + span * (SCENES[index].hold * 0.92 + 0.16)

  if (progress < inAt || progress > outDone) return 0
  if (progress < inDone) return (progress - inAt) / (inDone - inAt)
  if (progress > outAt) return 1 - (progress - outAt) / Math.max(1e-6, outDone - outAt)
  return 1
}
