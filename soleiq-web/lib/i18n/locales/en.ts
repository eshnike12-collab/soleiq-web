/**
 * English — the source dictionary, and the type every other language is
 * checked against.
 *
 * The exported `Dictionary` type is the whole safety story: a translation that
 * misspells a key, drops one, or adds one that nothing reads fails `tsc`
 * rather than rendering the key name to a patient mid-check.
 *
 * Placeholders are `{name}` and are filled by `fill()`. That is the only
 * syntax a translator has to preserve.
 *
 * Scope note: this covers the app's chrome, the sign-in and password flows,
 * and the heading of every screen in the guided check. Body copy inside the
 * individual question screens is not keyed yet — it still renders English —
 * and adding it is mechanical: a key here, a key in each language file, and
 * the literal in the screen swapped for `d.…`.
 */

const en = {
  brand: {
    name: 'SoleIQ',
    health: 'Health',
    slogan: 'Early Detection, Lifelong Protection',
  },

  nav: {
    /** The link back to soleiqhealth.com, sitting where the site's own app button sits. */
    website: 'Website',
    websiteAria: 'Go to soleiqhealth.com',
    home: 'Home',
    dashboard: 'My dashboard',
    clinical: 'SoleIQ Clinical',
    signOut: 'Sign out',
    signedInAs: 'Signed in as {email}',
    yourAccount: 'your account',
    noMembership: 'no hospital membership',
    feedback: 'Feedback',
    adminConsole: 'Admin console',
    doctorDashboard: 'Doctor dashboard',
    footHealth: 'My foot health',
  },

  language: {
    label: 'Language',
    change: 'Change language',
    loading: 'Loading language…',
  },

  flow: {
    back: 'Back',
    backHint: 'Back (←)',
    continue: 'Continue',
    skip: 'Skip',
    step: 'Step {current} of {total}',
    /** Shown beside the progress bar, keyed to how far along the check is. */
    encouragementStart: "Let's get started",
    encouragementUnderway: "You're on your way",
    encouragementGood: 'Great progress',
    encouragementAlmost: 'Almost there',
    encouragementDone: 'All done — great job!',
    disclaimer:
      'SoleIQ is a wellness monitoring tool and is not a substitute for professional medical diagnosis.',
  },

  welcome: {
    intro:
      'AI-assisted diabetic foot screening — clinician decision support for primary care and podiatry visits.',
    start: 'Start patient visit',
    duration: '~4 minutes per patient. For clinical use.',
  },

  auth: {
    welcome: 'Welcome',
    chooseSubtitle: 'Tell us who you are so we can set up the right experience.',
    iAmPatient: 'I\'m a patient',
    iAmPatientBody: 'Check your feet with guided photos and keep your results in one place.',
    iAmDoctor: 'I\'m a doctor or caregiver',
    iAmDoctorBody: 'Follow your patients\' foot checks, photo timelines, and AI summaries.',
    sendingReset: 'Sending reset link…',
    resetSent: 'If an account exists for {email}, a reset link is on its way — check spam too. Open it on this device; the link expires in an hour.',
    signIn: 'Sign in',
    createAccount: 'Create account',
    titlePatient: 'Sign in to SoleIQ',
    titleDoctor: 'Doctor / caregiver sign in',
    subtitlePatient:
      "Your foot checks are saved to your account so they're here next time.",
    subtitleDoctor: 'Your dashboard shows the patients assigned to you.',
    email: 'Email',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    passwordHint: 'More than 6 characters, with at least one number or symbol.',
    passwordOk: 'Password meets the requirements.',
    forgot: 'Forgot password?',
    working: 'Working…',
    signedIn: 'Successfully signed in',
    redirecting: 'Taking you to your dashboard…',
    resend: 'Resend confirmation email',
    resendSent: 'Confirmation email sent — check your inbox (and spam).',
    accountCreated:
      "Account created — we've sent a confirmation email. Open the link in it, then sign in here.",
    emailConfirmed: 'Email confirmed — sign in below.',
    staffNote:
      'Doctor and administrator access comes only from an expiring hospital invitation. New doctors remain inactive until the hospital verifies them.',
    patientNote:
      'New accounts do not choose a staff role. Hospital access is added through an invitation or patient-record linking workflow.',
    errorEmailFirst: 'Enter your email first.',
    errorForgotEmailFirst: 'Enter your email first, then tap Forgot password.',
    errorSignInFailed: 'Sign-in failed.',
    errorUnconfirmed:
      "Your email isn't confirmed yet. Open the confirmation link we sent you — or resend it below.",
    errorStaffInviteOnly:
      'Staff accounts are created from a hospital invitation. Ask your hospital administrator for an invite.',
    errorSendFailed:
      "Our email service couldn't send the message just now — please try again in a few minutes.",
    errorRateLimited:
      'Too many emails were requested in a short time. Wait a bit and try again.',
    errorRecoveryFailed: 'Recovery request failed.',
    errorResendFailed: 'Could not resend the email.',
  },

  reset: {
    title: 'Set a new password',
    subtitle: 'Choose a password you have not used on this account before.',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    mismatch: 'The two passwords do not match.',
    submit: 'Update password',
    submitting: 'Updating…',
    done: 'Password updated',
    doneBody: 'You can sign in with your new password now.',
    expired: 'This link has expired',
    expiredBody:
      'Password links can only be used once, and they stop working after an hour. Request a new one and it will arrive in a moment.',
    requestNew: 'Send a new link',
    backToSignIn: 'Back to sign in',
    sameBrowser: 'This link has to be opened in the same browser that asked for it. Request a new reset email and open it on this device.',
    openFromEmail: 'Open the reset link from your email to set a new password, or request a new one from the sign-in page.',
    samePassword: 'That\'s already your current password — pick a different one.',
    checking: 'Checking your link…',
  },

  /** One entry per screen in the guided check, matching its on-screen header. */
  screens: {
    consentEyebrow: 'Step 1',
    consentTitle: 'Patient consent',
    consentSubtitle:
      'Confirm with the patient that they agree to each of the following before continuing.',

    returningEyebrow: 'Welcome back',
    returningTitle: 'Review your answers',
    returningSubtitle:
      'We saved everything from your last check. Update anything that changed — the rest carries over. New photos are always taken fresh.',

    intakeEyebrow: 'Patient intake',
    nameTitle: 'Patient name',
    nameSubtitle: "And the patient's home location for referral recommendations.",

    demographicsTitle: 'Patient demographics',
    demographicsSubtitle:
      'Used to personalize population priors and audit model fairness.',

    historyEyebrow: 'Health history',
    conditionsTitle: 'Medical conditions',
    conditionsSubtitle:
      'Select all that apply. Tap the (?) for clinical details on any condition.',

    vascularEyebrow: 'Vascular screening',
    vascularTitle: 'Peripheral artery disease',
    vascularSubtitle:
      'PAD is independently linked to delayed wound healing and amputation risk — we screen for it separately from neuropathy.',

    diabetesTitle: 'Diabetes details',
    diabetesSubtitle: 'Type and year of diagnosis.',

    glucoseTitle: 'Glucose markers',
    glucoseSubtitle:
      'HbA1c plus the most recent glucose meter reading. Both optional.',

    footHistoryTitle: 'Foot history',
    footHistorySubtitle: 'Prior ulcers, amputations, or recent surgeries.',

    lifestyleTitle: 'Health & lifestyle',
    lifestyleSubtitle:
      'Numbness in your feet, plus a couple of lifestyle questions.',

    sizingEyebrow: 'Sizing',
    sizingTitle: 'Your shoe size',

    painEyebrow: 'Symptoms',
    painTitle: 'Pain assessment',
    painSubtitle: 'Ask the patient: any pain in their feet right now?',

    captureEyebrow: 'Capture',
    captureTitle: 'Begin foot exam',
    captureSubtitle:
      'Take or upload four color photos: the top and sole of each foot. You can retake any photo before the check.',

    perfusionEyebrow: 'Optional',
    perfusionTitle: 'Foot circulation',
    perfusionSubtitle:
      'Camera checks of blood flow in each foot. Skippable — the foot photo exam does not depend on it.',
    perfusionPulse: 'Pulse signal',
    perfusionRefill: 'Capillary refill',

    leftFoot: 'Left foot',
    rightFoot: 'Right foot',

    nextStepsEyebrow: 'Check complete',
    nextStepsTitle: 'Save your check',
    nextStepsSubtitle:
      'Keep it in your private history so you and your care team can track changes over time.',

    productsEyebrow: 'Therapy options',
    productsTitle: 'Adjunctive products',

    timelineEyebrow: 'Photo history',
    timelineTitle: 'Your foot checks',
    timelineLoading: 'Loading your saved checks…',
    timelineCount: '{count} saved checks.',
    timelineCountOne: '1 saved check.',
  },

  common: {
    yes: 'Yes',
    no: 'No',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    retry: 'Try again',
    loading: 'Loading…',
    required: 'Required',
    optional: 'Optional',
    done: 'Done',
    somethingWentWrong: 'Something went wrong.',
  },
};

export type Dictionary = typeof en;

export default en;
