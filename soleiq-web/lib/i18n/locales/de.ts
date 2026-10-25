import type { Dictionary } from './en';

/**
 * German (de).
 *
 * "Screening" is the established loanword in German diabetology and is kept;
 * "Früherkennung" is used where the sense is genuinely early detection rather
 * than the procedure. The patient is addressed with Sie.
 */
const de: Dictionary = {
  brand: {
    name: 'SoleIQ',
    health: 'Health',
    slogan: 'Früherkennung, lebenslanger Schutz',
  },

  nav: {
    website: 'Website',
    websiteAria: 'Zu soleiqhealth.com wechseln',
    home: 'Start',
    dashboard: 'Mein Dashboard',
    clinical: 'SoleIQ Klinik',
    signOut: 'Abmelden',
    signedInAs: 'Angemeldet als {email}',
    yourAccount: 'Ihr Konto',
    noMembership: 'keine Klinikzugehörigkeit',
    feedback: 'Rückmeldung',
    adminConsole: 'Administrationskonsole',
    doctorDashboard: 'Pflege-Dashboard',
    footHealth: 'Meine Fußgesundheit',
  },

  language: {
    label: 'Sprache',
    change: 'Sprache wechseln',
    loading: 'Sprache wird geladen…',
  },

  flow: {
    back: 'Zurück',
    backHint: 'Zurück (←)',
    continue: 'Weiter',
    skip: 'Überspringen',
    step: 'Schritt {current} von {total}',
    encouragementStart: 'Los geht’s',
    encouragementUnderway: 'Sie sind auf dem Weg',
    encouragementGood: 'Gut vorangekommen',
    encouragementAlmost: 'Fast geschafft',
    encouragementDone: 'Fertig — gut gemacht!',
    disclaimer:
      'SoleIQ ist ein Werkzeug zur Gesundheitsbeobachtung und ersetzt keine ärztliche Diagnose.',
  },

  welcome: {
    intro:
      'KI-gestütztes Screening des diabetischen Fußes — klinische Entscheidungsunterstützung für Hausarztpraxis und Podologie.',
    start: 'Patientenbesuch starten',
    duration: 'Ca. 4 Minuten pro Patient. Für den klinischen Einsatz.',
  },

  auth: {
    welcome: 'Willkommen',
    chooseSubtitle: 'Sagen Sie uns, wer Sie sind, damit wir das Richtige einrichten.',
    iAmPatient: 'Ich bin Patientin oder Patient',
    iAmPatientBody: 'Prüfen Sie Ihre Füße mit geführten Fotos und behalten Sie Ihre Ergebnisse an einem Ort.',
    iAmDoctor: 'Ich bin Pflegeperson',
    iAmDoctorBody: 'Verfolgen Sie die Fußkontrollen Ihrer Patienten, die Fotoverläufe und die KI-Zusammenfassungen.',
    sendingReset: 'Link wird gesendet…',
    resetSent: 'Falls ein Konto für {email} besteht, ist ein Link zum Zurücksetzen unterwegs — sehen Sie auch im Spam nach. Öffnen Sie ihn auf diesem Gerät; der Link verfällt in einer Stunde.',
    signIn: 'Anmelden',
    createAccount: 'Konto erstellen',
    titlePatient: 'Bei SoleIQ anmelden',
    titleDoctor: 'Anmeldung für Pflegende',
    subtitlePatient:
      'Ihre Fußkontrollen werden in Ihrem Konto gespeichert und sind beim nächsten Mal wieder da.',
    subtitleDoctor: 'Ihr Dashboard zeigt die Ihnen zugewiesenen Patientinnen und Patienten.',
    email: 'E-Mail-Adresse',
    password: 'Passwort',
    showPassword: 'Passwort anzeigen',
    hidePassword: 'Passwort verbergen',
    passwordHint: 'Mehr als 6 Zeichen, mit mindestens einer Ziffer oder einem Sonderzeichen.',
    passwordOk: 'Das Passwort erfüllt die Anforderungen.',
    forgot: 'Passwort vergessen?',
    working: 'Wird bearbeitet…',
    signedIn: 'Erfolgreich angemeldet',
    redirecting: 'Sie werden zu Ihrem Dashboard weitergeleitet…',
    resend: 'Bestätigungs-E-Mail erneut senden',
    resendSent:
      'Bestätigungs-E-Mail gesendet — sehen Sie in Ihrem Posteingang nach (auch im Spam).',
    accountCreated:
      'Konto erstellt — wir haben Ihnen eine Bestätigungs-E-Mail geschickt. Öffnen Sie den Link darin und melden Sie sich dann hier an.',
    emailConfirmed: 'E-Mail bestätigt — melden Sie sich unten an.',
    staffNote:
      'Zugang für Pflegende und Administration gibt es ausschließlich über eine befristete Einladung des Krankenhauses. Neue Pflegepersonen bleiben inaktiv, bis das Krankenhaus sie bestätigt.',
    patientNote:
      'Neue Konten wählen keine Personalrolle. Klinikzugang wird über eine Einladung oder die Verknüpfung mit der Patientenakte ergänzt.',
    errorEmailFirst: 'Geben Sie zuerst Ihre E-Mail-Adresse ein.',
    errorForgotEmailFirst:
      'Geben Sie zuerst Ihre E-Mail-Adresse ein und tippen Sie dann auf „Passwort vergessen?".',
    errorSignInFailed: 'Anmeldung fehlgeschlagen.',
    errorUnconfirmed:
      'Ihre E-Mail-Adresse ist noch nicht bestätigt. Öffnen Sie den Bestätigungslink, den wir Ihnen geschickt haben — oder lassen Sie ihn unten erneut senden.',
    errorStaffInviteOnly:
      'Personalkonten entstehen aus einer Klinikeinladung. Bitten Sie Ihre Klinikadministration um eine Einladung.',
    errorSendFailed:
      'Unser E-Mail-Dienst konnte die Nachricht gerade nicht versenden — versuchen Sie es in einigen Minuten erneut.',
    errorRateLimited:
      'In kurzer Zeit wurden zu viele E-Mails angefordert. Warten Sie einen Moment und versuchen Sie es erneut.',
    errorRecoveryFailed: 'Die Anfrage zur Wiederherstellung ist fehlgeschlagen.',
    errorResendFailed: 'Die E-Mail konnte nicht erneut gesendet werden.',
  },

  reset: {
    title: 'Neues Passwort festlegen',
    subtitle: 'Wählen Sie ein Passwort, das Sie für dieses Konto noch nicht verwendet haben.',
    newPassword: 'Neues Passwort',
    confirmPassword: 'Neues Passwort bestätigen',
    mismatch: 'Die beiden Passwörter stimmen nicht überein.',
    submit: 'Passwort aktualisieren',
    submitting: 'Wird aktualisiert…',
    done: 'Passwort aktualisiert',
    doneBody: 'Sie können sich jetzt mit Ihrem neuen Passwort anmelden.',
    expired: 'Dieser Link ist abgelaufen',
    expiredBody:
      'Passwort-Links lassen sich nur einmal verwenden und verfallen nach einer Stunde. Fordern Sie einen neuen an, er kommt gleich an.',
    requestNew: 'Neuen Link senden',
    backToSignIn: 'Zurück zur Anmeldung',
    sameBrowser: 'Dieser Link muss in demselben Browser geöffnet werden, der ihn angefordert hat. Fordern Sie eine neue E-Mail an und öffnen Sie sie auf diesem Gerät.',
    openFromEmail: 'Öffnen Sie den Link aus Ihrer E-Mail, um ein neues Passwort zu setzen, oder fordern Sie auf der Anmeldeseite einen neuen an.',
    samePassword: 'Das ist bereits Ihr aktuelles Passwort — wählen Sie ein anderes.',
    checking: 'Ihr Link wird geprüft…',
  },

  screens: {
    consentEyebrow: 'Schritt 1',
    consentTitle: 'Einwilligung des Patienten',
    consentSubtitle:
      'Bestätigen Sie mit der Patientin oder dem Patienten die Zustimmung zu jedem der folgenden Punkte, bevor Sie fortfahren.',

    returningEyebrow: 'Willkommen zurück',
    returningTitle: 'Antworten prüfen',
    returningSubtitle:
      'Wir haben alles aus Ihrer letzten Kontrolle gespeichert. Aktualisieren Sie, was sich geändert hat — der Rest wird übernommen. Fotos werden immer neu aufgenommen.',

    intakeEyebrow: 'Patientenaufnahme',
    nameTitle: 'Name der Patientin / des Patienten',
    nameSubtitle: 'Und der Wohnort, für Empfehlungen zur Überweisung.',

    demographicsTitle: 'Demografische Angaben',
    demographicsSubtitle:
      'Werden verwendet, um Populationspriors anzupassen und die Fairness des Modells zu prüfen.',

    claim: {
      eyebrow:
        'Ihre Akte',
      title:
        'Übernehmen Sie Ihre Akte',
      intro:
        'Jemand hat für Sie eine SoleIQ-Fußgesundheitsakte angelegt und sie in Ihrem Namen geführt. In Ihrer Einladungs-E-Mail steht, wer.',
      whatHappens:
        'Wenn Sie die Akte übernehmen, gehört sie Ihnen. Sie sehen den vollständigen Verlauf, auch alles, was vor heute erfasst wurde, und Sie entscheiden, wer sie noch einsehen darf.',
      canRemove:
        'Diese Person bleibt in Ihrem Behandlungskreis und kann weiter helfen — und Sie können sie jederzeit unter Datenschutz und Zugriff entfernen. Diese Entscheidung liegt allein bei Ihnen.',
      signInPrompt:
        'Melden Sie sich mit der E-Mail-Adresse an, an die diese Einladung geschickt wurde. Der Link funktioniert nur mit diesem Konto.',
      signInCta:
        'Anmelden oder Konto erstellen',
      claimCta:
        'Meine Akte übernehmen',
      claiming:
        'Wird übernommen…',
      successTitle:
        'Diese Akte gehört jetzt Ihnen',
      successBody:
        'Alles darin ist in Ihrer App, auch was vor heute erfasst wurde.',
      successCta:
        'Zu meiner Fußgesundheit',
      expiredTitle:
        'Dieser Link ist abgelaufen',
      expiredBody:
        'Links funktionieren nach {days} Tagen nicht mehr. Sie können einen neuen anfordern.',
      usedTitle:
        'Dieser Link wurde schon verwendet',
      usedBody:
        'Wenn die Akte bereits Ihnen gehört, melden Sie sich einfach an. Andernfalls fordern Sie einen neuen Link an.',
      mismatchTitle:
        'Dieser Link ist für jemand anderen',
      mismatchBody:
        'Melden Sie sich mit der Adresse an, an die die Einladung ging. Wenn Sie jemandem helfen, geben Sie ihm den Link — nur diese Person kann ihre eigene Akte übernehmen.',
      linkedTitle:
        'Ihr Konto hat bereits eine Akte',
      linkedBody:
        'Dieses Konto ist schon mit einer anderen Patientenakte verknüpft. Zwei Krankengeschichten werden niemals automatisch zusammengeführt — bitte wenden Sie sich an Ihr Behandlungsteam.',
      unknownTitle:
        'Das hat nicht funktioniert',
      unknownBody:
        'Der Link konnte nicht verwendet werden. Sie können einen neuen anfordern.',
      requestNewCta:
        'Neuen Link anfordern',
      requestNewSent:
        'Anfrage notiert. Bitten Sie die Person, die Ihre Akte angelegt hat, einen neuen Link zu senden.',
    },

    historyEyebrow: 'Krankengeschichte',
    conditionsTitle: 'Erkrankungen',
    conditionsSubtitle:
      'Wählen Sie alles Zutreffende aus. Tippen Sie auf (?) für klinische Details zu einer Erkrankung.',

    medications: {
      title: 'Medikamente',
      subtitle:
        'Manche Medikamente verändern, wie die Haut blaue Flecken bekommt, blutet und heilt. Wenn wir sie kennen, können wir Ihre Fotos richtig einschätzen.',
      newQuestion: 'Das ist eine neue Frage, die wir jetzt allen stellen.',
      question: 'Nehmen Sie wichtige Medikamente ein?',
      preferNotToSay: 'Möchte ich nicht angeben',
      listTitle: 'Welche?',
      listHint: 'Geben Sie einen beliebigen Namen ein. Er muss nicht zu unseren Vorschlägen passen.',
      inputPlaceholder: 'Medikamentennamen eingeben',
      suggestions: 'Vorschläge',
      added: 'Hinzugefügt',
      empty: 'Noch keine hinzugefügt. Sie können trotzdem weitermachen.',
      notesLabel: 'Sonst noch etwas, das Ihr Behandlungsteam wissen sollte',
      notesPlaceholder: 'Dosierung, seit wann, kürzliche Änderungen',
      privacy: 'Nur Sie und Ihr Behandlungsteam können das sehen.',
      reviewNone: 'Keine wichtigen Medikamente',
      reviewHidden: 'Möchte nicht angeben',
      reviewUnanswered: 'Neue Frage — bitte beantworten',
      reviewRequiredCta: 'Eine neue Frage beantworten, dann Fotos aufnehmen',
      categories: {
        anticoagulant: 'Blutverdünner',
        antiplatelet: 'Thrombozytenhemmer',
        corticosteroid: 'Kortison',
        immunosuppressant: 'Immunsuppressivum',
        chemotherapy: 'Chemotherapie',
        insulin: 'Insulin',
        oral_diabetes: 'Diabetes-Tablette',
        statin: 'Cholesterin (Statin)',
        antihypertensive: 'Blutdruck',
        antibiotic: 'Antibiotikum',
        other: 'Andere',
      },
    },

    vascularEyebrow: 'Gefäß-Screening',
    vascularTitle: 'Periphere arterielle Verschlusskrankheit',
    vascularSubtitle:
      'Die pAVK ist unabhängig mit verzögerter Wundheilung und Amputationsrisiko verbunden — wir screenen sie getrennt von der Neuropathie.',

    diabetesTitle: 'Angaben zum Diabetes',
    diabetesSubtitle: 'Typ und Jahr der Diagnose.',

    glucoseTitle: 'Glukosewerte',
    glucoseSubtitle:
      'HbA1c und der letzte Wert des Blutzuckermessgeräts. Beides ist optional.',

    footHistoryTitle: 'Fußanamnese',
    footHistorySubtitle: 'Frühere Ulzera, Amputationen oder kürzliche Operationen.',

    lifestyleTitle: 'Gesundheit und Lebensstil',
    lifestyleSubtitle:
      'Taubheitsgefühl in den Füßen sowie ein paar Fragen zum Lebensstil.',

    sizingEyebrow: 'Größe',
    sizingTitle: 'Ihre Schuhgröße',

    painEyebrow: 'Symptome',
    painTitle: 'Schmerzerhebung',
    painSubtitle: 'Fragen Sie die Patientin oder den Patienten: Schmerzen die Füße gerade?',

    captureEyebrow: 'Aufnahme',
    captureTitle: 'Fußuntersuchung beginnen',
    captureSubtitle:
      'Nehmen Sie vier Farbfotos auf oder laden Sie sie hoch: Rist und Sohle jedes Fußes. Sie können jedes Foto vor der Auswertung wiederholen.',

    perfusionEyebrow: 'Optional',
    perfusionTitle: 'Durchblutung des Fußes',
    perfusionSubtitle:
      'Kamerabasierte Prüfungen der Durchblutung jedes Fußes. Überspringbar — die Fotountersuchung hängt nicht davon ab.',
    perfusionPulse: 'Pulssignal',
    perfusionRefill: 'Kapillare Wiederfüllung',

    leftFoot: 'Linker Fuß',
    rightFoot: 'Rechter Fuß',

    nextStepsEyebrow: 'Kontrolle abgeschlossen',
    nextStepsTitle: 'Kontrolle speichern',
    nextStepsSubtitle:
      'Bewahren Sie sie in Ihrem privaten Verlauf auf, damit Sie und Ihr Behandlungsteam Veränderungen über die Zeit verfolgen können.',

    productsEyebrow: 'Therapieoptionen',
    productsTitle: 'Ergänzende Produkte',

    timelineEyebrow: 'Fotoverlauf',
    timelineTitle: 'Ihre Fußkontrollen',
    timelineLoading: 'Ihre gespeicherten Kontrollen werden geladen…',
    timelineCount: '{count} gespeicherte Kontrollen.',
    timelineCountOne: '1 gespeicherte Kontrolle.',
  },

  common: {
    yes: 'Ja',
    no: 'Nein',
    continue: 'Weiter',
    add: 'Hinzufügen',
    remove: 'Entfernen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    close: 'Schließen',
    retry: 'Erneut versuchen',
    loading: 'Wird geladen…',
    required: 'Erforderlich',
    optional: 'Optional',
    done: 'Fertig',
    somethingWentWrong: 'Etwas ist schiefgelaufen.',
  },
};

export default de;
