/**
 * English — the source of truth.
 *
 * Every other language is typed as `Dictionary`, which is `typeof en`. Add a
 * key here and the six other files stop compiling until they have it too; that
 * is the whole reason this is a typed object and not a JSON blob.
 *
 * What is deliberately NOT in here:
 *
 *   Blog posts. They come from the CMS in whichever language they were
 *   written, and inventing a translation for someone's article is not a
 *   framework's job. The furniture around them is translated; the article is
 *   shown as authored.
 *
 *   Paper titles, author names and venues. A citation is a bibliographic
 *   record. Translating "Journal of Wound Care" makes the reference wrong.
 *
 *   The product's own name, and clinical terms of art that are used in English
 *   in the target language's own literature (HbA1c, Wagner).
 */

const en = {
  meta: {
    title: 'SoleIQ — AI-assisted diabetic foot screening',
    description:
      'AI-assisted diabetic foot screening from four guided phone photos. Screening and decision support, not a diagnostic device.',
  },

  a11y: {
    skipToContent: 'Skip to content',
  },

  language: {
    label: 'Language',
    change: 'Change language',
    loading: 'Loading…',
  },

  nav: {
    howItWorks: 'How it works',
    research: 'Research',
    about: 'About',
    contact: 'Contact',
    inPractice: 'In practice',
    app: 'App',
    dashboard: 'Dashboard',
    openApp: 'Open the SoleIQ app',
    openDashboard: 'Open your SoleIQ dashboard',
    backToTop: 'SoleIQ Health, back to top',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    primary: 'Primary',
    primaryMobile: 'Primary, mobile',
    disclaimerShort:
      'Screening and decision support for the diabetic foot. Not a diagnostic device.',
  },

  hero: {
    slogan: 'Early Detection, Lifelong Protection',
    body: 'AI-enabled public-health platform that identifies deterioration earlier, improves care coordination, reaches underserved diabetic populations, and reduces preventable amputations and healthcare costs.',
    startScreening: 'Start a screening',
    openDashboard: 'Open your dashboard',
    scrollCue: 'See how it works',
  },

  features: {
    heading: 'What SoleIQ does',
    capture: {
      kicker: 'Guided capture',
      headline: 'The hard part is taking a usable photograph. So the app does it.',
      body: 'Framing, steadiness, and lighting are checked on the device before anything is uploaded. If one of the four is unusable, you retake only that one.',
      label: 'App',
      visualLabel:
        'A particle rendering of guided capture: a phone held above a foot, with the four photographs landing on its screen.',
    },
    report: {
      kicker: 'Clinical report',
      headline: 'Your clinician opens a record, not a photograph.',
      body: 'Findings mapped onto your own images, the full intake behind them (history, HbA1c, vascular, neuropathy, pain map), and an assistant scoped to that one patient.',
      careTeam: 'Your care team',
      patientRecord: 'Patient record',
      visualLabel:
        'A particle rendering of the clinical report: a dashboard receiving the record, with the findings mapped onto the patient photograph.',
    },
    timeline: {
      kicker: 'Shared timeline',
      headline: 'One screening is a data point. A series is a direction.',
      body: 'Every check is kept as a dated set of photos and levels, so a change too slow to notice day to day is obvious side by side.',
      riskOverTime: 'Risk over time',
      visualLabel:
        'A particle rendering of the shared timeline: dated screenings along an axis, with a marker walking down the descending risk curve and back.',
    },
  },

  narrative: {
    problem: {
      kicker: 'The problem',
      headline: 'It starts as something you cannot feel.',
      body: 'Diabetic neuropathy removes the signal that would normally make you look at your foot. Pressure, a blister, a crack in the skin: none of it hurts, so none of it prompts a check. Found early, a foot ulcer is usually manageable. Found late, it often is not.',
    },
    capture: {
      kicker: 'Capture',
      headline: 'Four guided photos. ≈4 minutes.',
      body: 'Both feet, top and sole, on the phone you already own. The app frames each shot and holds you steady through it. No attachment, no dock, no appointment.',
      app: 'App',
    },
    analysis: {
      kicker: 'Analysis',
      headline: 'Checked on your phone, then read against your history.',
      body: 'Quality checks and lighting normalisation run on the device before anything is uploaded. A vision model then reads all four images together with your intake (diabetes history, HbA1c, PAD and vascular answers, neuropathy, foot history, pain map), and returns one of four screening levels.',
      aiAnalysis: 'AI analysis',
      riskLevel: 'Risk level',
    },
    handover: {
      kicker: 'Handover',
      headline: 'Your clinician receives the whole record.',
      body: 'Every intake field, the findings mapped onto your own photographs, and the complete history, with an assistant scoped to that patient record. You decide who it goes to.',
      careTeam: 'Your care team',
      patientRecord: 'Patient record',
    },
    overTime: {
      kicker: 'Over time',
      headline: 'A record that accumulates, and a risk that can come down.',
      body: 'Every screening is kept as a dated set of photos and levels. A change too slow to notice day to day becomes obvious across a timeline, and so does the direction it is heading.',
      note: 'Illustrative. Not patient data.',
      riskOverTime: 'Risk over time',
    },
    close: {
      headline: 'SoleIQ',
      body: 'Screening and decision support for the diabetic foot. Not a diagnostic device.',
    },
    loading: 'Preparing the sequence',
    loadingLong: 'Loading the SoleIQ scroll sequence.',
  },

  journeys: {
    eyebrow: 'In practice',
    heading: 'The same feet, two settings, and what changes when the check happens at home.',
    lede: 'These are the pathways SoleIQ is designed around. They describe how the product is used. They are not outcome claims.',
    chooseSetting: 'Choose a setting',
    withoutTitle: 'Without SoleIQ',
    withTitle: 'With SoleIQ',
    changesHeading: 'What actually changes',
    cadence: 'Cadence',
    rural: {
      label: 'Rural',
      person:
        'A farmer with type 2 diabetes and reduced sensation in both feet. The nearest foot clinic is a journey, not a trip.',
      without: [
        'Pressure builds under the forefoot. Neuropathy means nothing is felt.',
        'Nothing prompts a look. The feet are not part of the daily routine.',
        'It is found when a sock sticks, or when someone else notices.',
        'Going to the clinic means transport, cost, and a lost day of work.',
        'The visit happens once the wound is impossible to ignore.',
        'Care begins at the point where care is hardest.',
      ],
      with: [
        'A screening at home: four photos, taken by a family member if needed.',
        'Photos are checked for quality on the phone before anything uploads.',
        'A screening level comes back with the findings marked on the photos.',
        'The record is shared ahead to the clinic or the visiting health worker.',
        'The journey is made once, deliberately, with a history already in hand.',
        'Between visits, the timeline keeps watching.',
      ],
      cadenceWithout: 'Checked when someone happens to look',
      cadenceWith: 'Checked on a schedule, at home',
      visualLabel:
        'A particle rendering of a cottage among trees, with leaves in the air.',
    },
    urban: {
      label: 'Urban',
      person:
        'A commuter with type 2 diabetes and a callus that keeps coming back. A podiatry appointment is available, eventually.',
      without: [
        'A callus thickens and the skin around it changes colour. Easy to dismiss.',
        'Booking a podiatry appointment means joining a queue.',
        'The appointment arrives, or is rescheduled, or is missed.',
        'In the room, the clinician sees today’s foot and nothing before it.',
        'Advice is given; follow-up depends on remembering how it looked.',
        'The next change goes unmeasured until the next appointment.',
      ],
      with: [
        'A screening at home takes a few minutes, before work.',
        'Findings are marked on the patient’s own photographs.',
        'The level says whether this is recheck-in-a-week or book-now.',
        'Appointment slots go to the people whose level says they need one.',
        'The clinician opens a dated photo series instead of a blank slate.',
        'Follow-up is measured against images, not against recall.',
      ],
      cadenceWithout: 'Checked at appointments',
      cadenceWith: 'Checked between appointments too',
      visualLabel:
        'A particle rendering of a city skyline under a sky that moves from day to night.',
    },
    comparison: [
      {
        q: 'Who notices first',
        without: 'Whoever happens to look, which with neuropathy is often nobody.',
        with: 'A routine check that does not depend on being able to feel it.',
      },
      {
        q: 'What the clinician sees',
        without: 'The foot as it is today.',
        with: 'A dated series, so the direction of travel is visible.',
      },
      {
        q: 'What triggers a visit',
        without: 'A wound that has become obvious.',
        with: 'A screening level, with the reason attached.',
      },
      {
        q: 'What a journey costs',
        without: 'The same, whether or not it turns out to be needed.',
        with: 'The same, but made for a reason you can point at.',
      },
    ],
  },

  progression: {
    eyebrow: 'Progression',
    heading: 'The whole path, and the part of it a camera can reach.',
    lede: 'A diabetic foot ulcer does not arrive; it progresses. Select any grade to see what is true of the foot at that point, and what a photograph can and cannot establish there.',
    gradesLabel: 'Wagner grades',
    grade: 'Grade',
    gradesRange: 'Grades {from}–{to}',
    whatPhotoShows: 'What a photo shows',
    whatSoleIQDoes: 'What SoleIQ does',
    trajectory: 'Typical worst-case trajectory',
    play: 'Play walkthrough',
    pause: 'Pause walkthrough',
    windows: {
      soleiq: {
        title: 'Where SoleIQ works',
        line: 'Catch it before the skin ever breaks.',
      },
      standard: {
        title: 'Where care usually starts',
        line: 'By the time it hurts or smells, the damage is done.',
      },
    },
    caveat:
      'Wagner grades severity at a point in time; it is not a validated timed sequence. The ranges above describe a worst-case trajectory in an untreated or poorly controlled foot. Many people present already at grade 2 or 3, and with good offloading, perfusion and infection control, roughly 60 to 80 percent of ulcers heal in 12 to 20 weeks without ever progressing. In an ischaemic foot the same sequence can collapse into days. SoleIQ is a monitoring and triage aid, not a diagnostic device, and it does not grade wounds.',
    stages: [
      {
        name: 'No open lesion',
        plain: 'Intact skin, at-risk foot',
        what: 'The skin is unbroken. There may be callus, deformity or a pressure point building underneath — and with neuropathy, none of it is felt.',
        camera:
          'A photograph is at its most useful here, because there is nothing to feel and nothing anyone is looking for. What it captures is a baseline: the callus, the colour, the shape, dated.',
        soleiq:
          'This is the grade SoleIQ is built for. Regular screening establishes what this foot normally looks like, so a change has something to be a change from.',
        whenLabel: 'Baseline',
        whenDetail: 'intact skin, at-risk foot',
        toNext: 'Trigger event — days to weeks',
      },
      {
        name: 'Superficial ulcer',
        plain: 'The skin has broken',
        what: 'Full-thickness skin loss that has not reached tendon, capsule or bone. Often painless, which is exactly why it goes unreported.',
        camera:
          'Visible. A break in the skin, its margins and the redness around it are all surface features, and surface features are what a camera reads well.',
        soleiq:
          'A screening at this grade returns a level that says get this looked at, with the finding marked on the patient’s own photograph and the previous weeks alongside it.',
        whenLabel: 'Month 0',
        whenDetail: 'ulcer onset, the clock starts',
        toNext: 'About 2 to 8 weeks',
      },
      {
        name: 'Deep ulcer',
        plain: 'Down to tendon or bone',
        what: 'The ulcer extends to tendon, joint capsule or bone, without abscess or osteomyelitis.',
        camera:
          'The opening is visible; the depth is not. No photograph can tell you how far a wound goes, and this is the grade where that limit starts to matter.',
        soleiq:
          'Flagged as urgent and handed over with the history attached. Depth is a probe finding, made by a clinician — the app’s job is to make sure someone is holding the probe.',
        whenLabel: 'Month 0.5 to 2',
        whenDetail: 'from the first break in skin',
        toNext: 'About 1 to 3 months',
      },
      {
        name: 'Osteitis or abscess',
        plain: 'Infection has reached bone',
        what: 'Deep infection: abscess, osteomyelitis, or infective tendonitis. This is the point where the question changes from healing the wound to saving the foot.',
        camera:
          'Beyond a camera. Bone involvement is established by probing, imaging and blood work — not by looking at skin.',
        soleiq:
          'Nothing here is a screening problem any more. The value SoleIQ can add to this grade was spent months earlier, at grade 0 and 1.',
        whenLabel: 'Month 2 to 5',
        whenDetail: 'bone involvement, probe to bone',
        toNext: 'About 1 to 3 months',
      },
      {
        name: 'Partial gangrene',
        plain: 'Tissue death, limb threat',
        what: 'Localised gangrene — commonly the forefoot or toes. Revascularisation and surgical decisions are being made under time pressure.',
        camera: 'Beyond a camera, and beyond screening. This is inpatient care.',
        soleiq:
          'Out of scope. Included here because the path has to be shown whole to be believed.',
        whenLabel: 'Month 4 to 9',
        whenDetail: 'tissue death, limb threat',
        toNext: 'Days to weeks',
      },
      {
        name: 'Extensive gangrene',
        plain: 'The whole foot',
        what: 'Gangrene of the whole foot. Major amputation territory.',
        camera: 'Beyond a camera.',
        soleiq: 'Out of scope — and the outcome the first two grades exist to prevent.',
        whenLabel: 'Month 6 to 18',
        whenDetail: 'major amputation territory',
        toNext: null as string | null,
      },
    ],
  },

  research: {
    eyebrow: 'Research',
    heading: 'The work behind the screening, and the literature it sits in.',
    lede: 'Our own paper is below. Under it is a live search over the published record, kept separate and clearly labelled, so the two are never confused.',
    advisors: 'SoleIQ has been advised by more than 50 researchers, physicians, and surgeons working in artificial intelligence, biomedical engineering, and clinical medicine across the country.',
    searchHeading: 'Search the literature',
    searchPlaceholder: 'diabetic foot ulcer, offloading, neuropathy screening',
    searchHint:
      'Search a topic, such as diabetic foot ulcer, offloading, or neuropathy screening, and the matching records appear here.',
    searching: 'Searching Europe PMC',
    searchError: 'Something went wrong running that search.',
    noResults: 'No records matched “{query}”. Try a broader term.',
    resultsFor: '{count} results for {query}',
    openAccess: 'Open access',
    readFullText: 'Read the full text',
    abstract: 'Abstract',
    readFullAbstract: 'Read the full abstract',
    showLess: 'Show less',
    correspondingAuthor: 'Corresponding author',
    topics: 'Topics',
    status: {
      published: 'Published',
      preprint: 'Preprint',
    },
  },

  about: {
    eyebrow: 'About',
    heading:
      'Most diabetic foot ulcers are found late. Not because they are hidden, but because nobody was looking.',
    paragraphs: [
      'Diabetic neuropathy removes the signal that would normally make someone look at their foot. Pressure, a blister, a crack in the skin: none of it hurts, so none of it prompts a check. By the time the foot is examined, the question has usually stopped being “is this something?” and become “how much of this can be saved?”',
      'A clinical foot exam solves this, and it is not the bottleneck we can fix. Appointments are scarce, travel is expensive, and the interval between visits is exactly where the problem develops.',
      'SoleIQ closes that interval with the thing every patient already has: a phone camera, and a few minutes. Four photos, read alongside the history that determines risk, produce a screening level a person can act on, and a record a clinician can trust enough to work from.',
      'We are careful about what we claim. SoleIQ screens; it does not diagnose. It is built to send people to care earlier and with better information, not to keep them away from it.',
      'That constraint shapes the product. The model never sees a photo the phone judged unusable. Findings are shown on the patient’s own images, so a person can see what the system saw. Every screening stays in a timeline, because a single frame is a weaker signal than a series. And the record belongs to the patient, who decides which clinician sees it.',
    ],
    team: 'Team',
    roles: {
      founder: 'Founder & CEO, SoleIQ Health',
    },
    bios: {
      eshaan:
        'Leads the platform end to end: the screening model, the product, and the research programme behind it. Published on AI-guided prevention for the diabetic foot with Dr. David G. Armstrong.',
    },
    onLinkedIn: '{name} on LinkedIn',
  },

  blog: {
    eyebrow: 'Writing',
    heading: 'Notes from the people building it.',
    defaultCategory: 'Notes',
    readingTime: '{minutes} min',
    minutesShort: '{minutes} min',
    readMore: 'Read',
    closeArticle: 'Close article',
    originalLanguage:
      'Articles are shown in the language they were written in.',
  },

  contact: {
    eyebrow: 'Contact',
    heading: 'Get in touch.',
    body: 'Clinical partnerships, research collaboration, press, or a question about the product. This reaches us directly.',
    orEmail: 'Or email',
    noMedicalDetails:
      'Please don’t send medical details or images through this form. It is not a clinical channel, and it is not monitored for urgent problems.',
    name: 'Name',
    email: 'Email',
    message: 'Message',
    send: 'Send message',
    sending: 'Sending…',
    sent: 'Message sent.',
    sentBody: 'Thanks. We’ll reply to {email}.',
    sendAnother: 'Send another',
    errors: {
      name: 'Please tell us your name.',
      email: 'Please add an email address.',
      emailInvalid: 'That email address looks off.',
      message: 'Please include a message.',
      failed: 'That did not send. Please email us instead.',
    },
  },

  footer: {
    heading: 'Site footer',
    tagline: 'AI-assisted diabetic foot screening from four guided phone photos.',
    openApp: 'Open the app',
    dashboard: 'Dashboard',
    emailUs: 'Email us',
    privacy: 'Privacy',
    terms: 'Terms',
    nav: 'Footer',
    onNetwork: 'SoleIQ Health on {network}',
    disclaimer:
      'SoleIQ is a screening and decision-support tool. It is not a diagnostic device, it does not provide medical advice, and it is not a substitute for assessment by a qualified clinician. If you have a wound, an infection, sudden pain, or a change in the colour or temperature of a foot, seek medical care immediately.',
    copyright: '© {year} SoleIQ Health',
  },

  screens: {
    leftFootSole: 'Left foot, sole',
    fitFootInFrame: 'Fit your foot inside the frame',
    photoQuality: 'Photo quality',
    wholeFootInFrame: 'Whole foot in frame',
    sharpEnough: 'Sharp enough to analyse',
    lightingNormalised: 'Lighting normalised',
    retakeTooDark: 'Retake right foot, too dark',
    analysing: 'Analysing',
    inputs: 'Inputs',
    diabetesHistory: 'Diabetes history',
    vascularAnswers: 'Vascular answers',
    neuropathy: 'Neuropathy',
    painMap: 'Pain map',
    screeningLevel: 'Screening level',
    watch: 'Watch',
    resultBody:
      'Two areas to keep an eye on. Recheck in 7 days, and book a visit if either changes.',
    shareRecord: 'Share your record',
    podiatryClinic: 'Your podiatry clinic',
    fullHistory: 'Full history, every photo, every screening level.',
    sendRecord: 'Send record',
    clinicianView: 'Clinician view',
    clinicalReport: 'Clinical report',
    photoComparison: 'Photo comparison',
    perPatientAssistant: 'Per-patient assistant',
    yourTimeline: 'Your timeline',
    today: 'Today',
    levels: {
      clear: 'Clear',
      watch: 'Watch',
      soon: 'Soon',
      urgent: 'Urgent',
    },
  },
}

export type Dictionary = typeof en
export default en
