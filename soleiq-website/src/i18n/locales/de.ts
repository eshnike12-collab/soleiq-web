import type { Dictionary } from './en'

/**
 * German (de).
 *
 * "Screening" is the term German diabetology actually uses for this, so it
 * stays; "Früherkennung" is used where the sense is the act rather than the
 * procedure. German runs roughly a third longer than English, which is the
 * language the navigation and the buttons were checked against for wrapping.
 */
const de: Dictionary = {
  meta: {
    title: 'SoleIQ — KI-gestütztes Screening des diabetischen Fußes',
    description:
      'KI-gestütztes Screening des diabetischen Fußes aus vier geführten Handyfotos. Screening und Entscheidungsunterstützung, kein Diagnosegerät.',
  },

  a11y: {
    skipToContent: 'Zum Inhalt springen',
  },

  language: {
    label: 'Sprache',
    change: 'Sprache wechseln',
    loading: 'Wird geladen…',
  },

  nav: {
    howItWorks: 'So funktioniert es',
    research: 'Forschung',
    about: 'Über uns',
    contact: 'Kontakt',
    inPractice: 'In der Praxis',
    app: 'App',
    dashboard: 'Dashboard',
    openApp: 'Die SoleIQ-App öffnen',
    openDashboard: 'Ihr SoleIQ-Dashboard öffnen',
    backToTop: 'SoleIQ Health, zurück nach oben',
    openMenu: 'Menü öffnen',
    closeMenu: 'Menü schließen',
    primary: 'Hauptnavigation',
    primaryMobile: 'Hauptnavigation, mobil',
    disclaimerShort:
      'Screening und Entscheidungsunterstützung für den diabetischen Fuß. Kein Diagnosegerät.',
  },

  hero: {
    slogan: 'Früh erkennen, lebenslang schützen',
    body: 'KI-gestützte Public-Health-Plattform, die Verschlechterungen früher erkennt, die Versorgung besser koordiniert, unterversorgte Menschen mit Diabetes erreicht und vermeidbare Amputationen sowie Gesundheitskosten senkt.',
    startScreening: 'Screening starten',
    openDashboard: 'Ihr Dashboard öffnen',
    scrollCue: 'So funktioniert es',
  },

  features: {
    heading: 'Was SoleIQ leistet',
    capture: {
      kicker: 'Geführte Aufnahme',
      headline: 'Das Schwierige ist ein brauchbares Foto. Das übernimmt die App.',
      body: 'Bildausschnitt, Verwacklung und Licht werden auf dem Gerät geprüft, bevor irgendetwas hochgeladen wird. Ist eines der vier Fotos unbrauchbar, wiederholen Sie nur dieses.',
      label: 'App',
      visualLabel:
        'Partikeldarstellung der geführten Aufnahme: ein Handy über einem Fuß, während die vier Fotos auf dem Display erscheinen.',
    },
    report: {
      kicker: 'Klinischer Bericht',
      headline: 'Ihre Ärztin oder Ihr Arzt öffnet eine Akte, kein Foto.',
      body: 'Befunde auf Ihren eigenen Bildern markiert, die vollständige Anamnese dahinter (Vorgeschichte, HbA1c, Gefäßstatus, Neuropathie, Schmerzkarte) und ein Assistent, der auf genau diese eine Person beschränkt ist.',
      careTeam: 'Ihr Behandlungsteam',
      patientRecord: 'Patientenakte',
      visualLabel:
        'Partikeldarstellung des klinischen Berichts: ein Dashboard, das die Akte empfängt, mit den Befunden auf dem Patientenfoto markiert.',
    },
    timeline: {
      kicker: 'Gemeinsamer Verlauf',
      headline: 'Ein Screening ist ein Datenpunkt. Eine Reihe ist eine Richtung.',
      body: 'Jede Kontrolle bleibt als datierter Satz aus Fotos und Stufen erhalten. Eine Veränderung, die von Tag zu Tag zu langsam ist, wird im Nebeneinander offensichtlich.',
      riskOverTime: 'Risiko im Verlauf',
      visualLabel:
        'Partikeldarstellung des gemeinsamen Verlaufs: datierte Screenings entlang einer Achse, mit einer Markierung, die die fallende Risikokurve hinab- und zurückwandert.',
    },
  },

  narrative: {
    problem: {
      kicker: 'Das Problem',
      headline: 'Es beginnt mit etwas, das man nicht spüren kann.',
      body: 'Die diabetische Neuropathie nimmt das Signal weg, das Sie normalerweise auf Ihren Fuß schauen ließe. Druck, eine Blase, ein Riss in der Haut: nichts davon tut weh, also gibt nichts den Anstoß nachzusehen. Früh entdeckt ist ein Fußgeschwür meist beherrschbar. Spät entdeckt oft nicht.',
    },
    capture: {
      kicker: 'Aufnahme',
      headline: 'Vier geführte Fotos. ≈4 Minuten.',
      body: 'Beide Füße, Rist und Sohle, mit dem Handy, das Sie ohnehin haben. Die App richtet jede Aufnahme aus und hält Sie dabei ruhig. Kein Zubehör, keine Halterung, kein Termin.',
      app: 'App',
    },
    analysis: {
      kicker: 'Auswertung',
      headline: 'Auf dem Handy geprüft, dann vor Ihrer Vorgeschichte gelesen.',
      body: 'Qualitätsprüfung und Lichtnormalisierung laufen auf dem Gerät, bevor irgendetwas hochgeladen wird. Ein Bildmodell liest anschließend alle vier Aufnahmen zusammen mit Ihrer Anamnese (Diabetesvorgeschichte, HbA1c, pAVK- und Gefäßfragen, Neuropathie, Fußanamnese, Schmerzkarte) und gibt eine von vier Screening-Stufen zurück.',
      aiAnalysis: 'KI-Auswertung',
      riskLevel: 'Risikostufe',
    },
    handover: {
      kicker: 'Übergabe',
      headline: 'Ihre Behandelnden erhalten die vollständige Akte.',
      body: 'Jedes Anamnesefeld, die Befunde auf Ihren eigenen Fotos markiert und die komplette Vorgeschichte, mit einem Assistenten, der auf diese Akte beschränkt ist. Sie entscheiden, wer sie bekommt.',
      careTeam: 'Ihr Behandlungsteam',
      patientRecord: 'Patientenakte',
    },
    overTime: {
      kicker: 'Im Verlauf',
      headline: 'Eine Akte, die wächst, und ein Risiko, das sinken kann.',
      body: 'Jedes Screening bleibt als datierter Satz aus Fotos und Stufen erhalten. Eine Veränderung, die von Tag zu Tag zu langsam ist, wird über einen Verlauf hinweg offensichtlich — und ihre Richtung ebenso.',
      note: 'Beispielhaft. Keine Patientendaten.',
      riskOverTime: 'Risiko im Verlauf',
    },
    close: {
      headline: 'SoleIQ',
      body: 'Screening und Entscheidungsunterstützung für den diabetischen Fuß. Kein Diagnosegerät.',
    },
    loading: 'Sequenz wird vorbereitet',
    loadingLong: 'Die SoleIQ-Scroll-Sequenz wird geladen.',
  },

  journeys: {
    eyebrow: 'In der Praxis',
    heading: 'Dieselben Füße, zwei Umfelder — und was sich ändert, wenn die Kontrolle zu Hause stattfindet.',
    lede: 'Das sind die Abläufe, für die SoleIQ gebaut ist. Sie beschreiben, wie das Produkt genutzt wird. Es sind keine Aussagen über Ergebnisse.',
    chooseSetting: 'Umfeld wählen',
    withoutTitle: 'Ohne SoleIQ',
    withTitle: 'Mit SoleIQ',
    changesHeading: 'Was sich tatsächlich ändert',
    cadence: 'Rhythmus',
    rural: {
      label: 'Ländlich',
      person:
        'Ein Landwirt mit Typ-2-Diabetes und vermindertem Gefühl in beiden Füßen. Die nächste Fußambulanz ist eine Reise, kein Weg.',
      without: [
        'Unter dem Vorfuß baut sich Druck auf. Durch die Neuropathie spürt er nichts.',
        'Nichts gibt Anlass hinzusehen. Die Füße gehören nicht zum Tagesablauf.',
        'Entdeckt wird es, wenn eine Socke klebt oder jemand anderes es bemerkt.',
        'Der Weg in die Ambulanz heißt Fahrt, Kosten und ein verlorener Arbeitstag.',
        'Der Besuch findet statt, wenn die Wunde nicht mehr zu übersehen ist.',
        'Die Versorgung beginnt dort, wo Versorgen am schwersten ist.',
      ],
      with: [
        'Ein Screening zu Hause: vier Fotos, notfalls von einem Angehörigen gemacht.',
        'Die Fotos werden auf dem Handy geprüft, bevor irgendetwas hochgeladen wird.',
        'Zurück kommt eine Stufe, mit den Befunden auf den Fotos markiert.',
        'Die Akte geht vorab an die Ambulanz oder an die aufsuchende Fachkraft.',
        'Die Reise wird einmal gemacht, bewusst, mit einer Vorgeschichte in der Hand.',
        'Zwischen den Besuchen schaut der Verlauf weiter hin.',
      ],
      cadenceWithout: 'Angesehen, wenn zufällig jemand hinsieht',
      cadenceWith: 'Nach festem Rhythmus angesehen, zu Hause',
      visualLabel:
        'Partikeldarstellung eines Hauses zwischen Bäumen, mit Blättern in der Luft.',
    },
    urban: {
      label: 'Städtisch',
      person:
        'Eine pendelnde Person mit Typ-2-Diabetes und einer Schwiele, die immer wiederkommt. Ein Podologietermin ist verfügbar — irgendwann.',
      without: [
        'Eine Schwiele verdickt sich, die Haut ringsum verfärbt sich. Leicht abzutun.',
        'Einen Podologietermin zu buchen heißt, sich in eine Warteliste einzureihen.',
        'Der Termin kommt, oder wird verschoben, oder wird verpasst.',
        'Im Behandlungszimmer sieht die Fachkraft den Fuß von heute und nichts davor.',
        'Es gibt Ratschläge; die Nachkontrolle hängt an der Erinnerung ans Aussehen.',
        'Die nächste Veränderung bleibt bis zum nächsten Termin ungemessen.',
      ],
      with: [
        'Ein Screening zu Hause dauert ein paar Minuten, vor der Arbeit.',
        'Die Befunde werden auf den eigenen Fotos der Person markiert.',
        'Die Stufe sagt, ob das in einer Woche nachkontrolliert oder jetzt gebucht wird.',
        'Termine gehen an die Menschen, deren Stufe sagt, dass sie einen brauchen.',
        'Die Fachkraft öffnet eine datierte Fotoreihe statt eines leeren Blatts.',
        'Die Nachkontrolle misst sich an Bildern, nicht an der Erinnerung.',
      ],
      cadenceWithout: 'Bei Terminen angesehen',
      cadenceWith: 'Auch zwischen den Terminen angesehen',
      visualLabel:
        'Partikeldarstellung einer Stadtsilhouette unter einem Himmel, der von Tag zu Nacht wechselt.',
    },
    comparison: [
      {
        q: 'Wer es zuerst bemerkt',
        without: 'Wer zufällig hinsieht — bei Neuropathie oft niemand.',
        with: 'Eine Routinekontrolle, die nicht davon abhängt, es spüren zu können.',
      },
      {
        q: 'Was die Fachkraft sieht',
        without: 'Den Fuß, wie er heute ist.',
        with: 'Eine datierte Reihe, an der die Richtung ablesbar ist.',
      },
      {
        q: 'Was einen Besuch auslöst',
        without: 'Eine Wunde, die offensichtlich geworden ist.',
        with: 'Eine Screening-Stufe, mit dem Grund dabei.',
      },
      {
        q: 'Was ein Weg kostet',
        without: 'Dasselbe, ob er sich als nötig herausstellt oder nicht.',
        with: 'Dasselbe, aber aus einem Grund, den man benennen kann.',
      },
    ],
  },

  progression: {
    eyebrow: 'Verlauf',
    heading: 'Der ganze Weg — und der Teil davon, den eine Kamera erreicht.',
    lede: 'Ein diabetisches Fußgeschwür kommt nicht, es entwickelt sich. Wählen Sie einen Grad, um zu sehen, was an diesem Punkt für den Fuß gilt und was ein Foto dort belegen kann und was nicht.',
    gradesLabel: 'Wagner-Grade',
    grade: 'Grad',
    gradesRange: 'Grad {from}–{to}',
    whatPhotoShows: 'Was ein Foto zeigt',
    whatSoleIQDoes: 'Was SoleIQ tut',
    trajectory: 'Typischer Verlauf im ungünstigsten Fall',
    play: 'Durchlauf starten',
    pause: 'Durchlauf pausieren',
    windows: {
      soleiq: {
        title: 'Wo SoleIQ wirkt',
        line: 'Erkennen, bevor die Haut überhaupt aufbricht.',
      },
      standard: {
        title: 'Wo Versorgung meist beginnt',
        line: 'Wenn es wehtut oder riecht, ist der Schaden da.',
      },
    },
    caveat:
      'Wagner stuft den Schweregrad zu einem Zeitpunkt ein; es ist keine validierte zeitliche Abfolge. Die Zeitspannen oben beschreiben einen ungünstigsten Verlauf an einem unbehandelten oder schlecht eingestellten Fuß. Viele Menschen stellen sich bereits mit Grad 2 oder 3 vor, und bei guter Druckentlastung, Durchblutung und Infektkontrolle heilen etwa 60 bis 80 Prozent der Geschwüre in 12 bis 20 Wochen ab, ohne je fortzuschreiten. An einem ischämischen Fuß kann dieselbe Abfolge auf Tage zusammenschrumpfen. SoleIQ ist eine Hilfe zur Verlaufskontrolle und Ersteinschätzung, kein Diagnosegerät, und stuft keine Wunden ein.',
    stages: [
      {
        name: 'Keine offene Läsion',
        plain: 'Intakte Haut, Risikofuß',
        what: 'Die Haut ist unversehrt. Darunter können sich Schwiele, Fehlstellung oder eine Druckstelle aufbauen — und bei Neuropathie wird nichts davon gespürt.',
        camera:
          'Hier ist ein Foto am nützlichsten, weil es nichts zu spüren gibt und niemand nach etwas sucht. Was es festhält, ist ein Ausgangswert: Schwiele, Farbe, Form, mit Datum.',
        soleiq:
          'Für diesen Grad ist SoleIQ gebaut. Regelmäßiges Screening hält fest, wie dieser Fuß normalerweise aussieht, damit eine Veränderung etwas hat, wovon sie abweicht.',
        whenLabel: 'Ausgangswert',
        whenDetail: 'intakte Haut, Risikofuß',
        toNext: 'Auslösendes Ereignis — Tage bis Wochen',
      },
      {
        name: 'Oberflächliches Ulkus',
        plain: 'Die Haut ist aufgebrochen',
        what: 'Hautverlust über die volle Dicke, ohne Sehne, Kapsel oder Knochen erreicht zu haben. Häufig schmerzlos — genau deshalb wird es nicht gemeldet.',
        camera:
          'Sichtbar. Ein Aufbruch der Haut, seine Ränder und die Rötung ringsum sind Oberflächenmerkmale, und Oberflächenmerkmale liest eine Kamera gut.',
        soleiq:
          'Ein Screening bei diesem Grad liefert eine Stufe, die sagt: lassen Sie das ansehen — mit dem Befund auf dem eigenen Foto markiert und den Vorwochen daneben.',
        whenLabel: 'Monat 0',
        whenDetail: 'Beginn des Ulkus, die Uhr läuft',
        toNext: 'Etwa 2 bis 8 Wochen',
      },
      {
        name: 'Tiefes Ulkus',
        plain: 'Bis auf Sehne oder Knochen',
        what: 'Das Ulkus reicht bis an Sehne, Gelenkkapsel oder Knochen, ohne Abszess oder Osteomyelitis.',
        camera:
          'Die Öffnung ist sichtbar, die Tiefe nicht. Kein Foto sagt, wie weit eine Wunde reicht — und das ist der Grad, ab dem diese Grenze zählt.',
        soleiq:
          'Wird als dringend gekennzeichnet und mit der Vorgeschichte übergeben. Tiefe ist ein Sondierungsbefund, erhoben von einer Fachkraft; die Aufgabe der App ist es, dafür zu sorgen, dass jemand die Sonde hält.',
        whenLabel: 'Monat 0,5 bis 2',
        whenDetail: 'ab dem ersten Aufbruch der Haut',
        toNext: 'Etwa 1 bis 3 Monate',
      },
      {
        name: 'Osteitis oder Abszess',
        plain: 'Die Infektion hat den Knochen erreicht',
        what: 'Tiefe Infektion: Abszess, Osteomyelitis oder infektiöse Tendinitis. Hier wechselt die Frage vom Heilen der Wunde zum Erhalt des Fußes.',
        camera:
          'Jenseits einer Kamera. Knochenbeteiligung wird durch Sondieren, Bildgebung und Labor festgestellt — nicht durch das Ansehen von Haut.',
        soleiq:
          'Hier ist nichts mehr ein Screening-Problem. Der Nutzen, den SoleIQ bei diesem Grad hätte stiften können, lag Monate früher, bei Grad 0 und 1.',
        whenLabel: 'Monat 2 bis 5',
        whenDetail: 'Knochenbeteiligung, Sondierung bis auf den Knochen',
        toNext: 'Etwa 1 bis 3 Monate',
      },
      {
        name: 'Teilweise Gangrän',
        plain: 'Gewebetod, Bedrohung der Extremität',
        what: 'Örtlich begrenzte Gangrän — meist Vorfuß oder Zehen. Entscheidungen zu Revaskularisierung und Operation fallen unter Zeitdruck.',
        camera:
          'Jenseits einer Kamera und jenseits von Screening. Das ist stationäre Versorgung.',
        soleiq:
          'Außerhalb des Anwendungsbereichs. Hier aufgeführt, weil der Weg ganz gezeigt werden muss, um geglaubt zu werden.',
        whenLabel: 'Monat 4 bis 9',
        whenDetail: 'Gewebetod, Bedrohung der Extremität',
        toNext: 'Tage bis Wochen',
      },
      {
        name: 'Ausgedehnte Gangrän',
        plain: 'Der ganze Fuß',
        what: 'Gangrän des ganzen Fußes. Bereich der Majoramputation.',
        camera: 'Jenseits einer Kamera.',
        soleiq:
          'Außerhalb des Anwendungsbereichs — und das Ergebnis, das die ersten beiden Grade verhindern sollen.',
        whenLabel: 'Monat 6 bis 18',
        whenDetail: 'Bereich der Majoramputation',
        toNext: null as string | null,
      },
    ],
  },

  research: {
    eyebrow: 'Forschung',
    heading: 'Die Arbeit hinter dem Screening — und die Literatur, in der sie steht.',
    lede: 'Unsere eigene Arbeit steht unten. Darunter eine Live-Suche über die publizierte Literatur, getrennt gehalten und klar gekennzeichnet, damit beides nie verwechselt wird.',
    advisors: 'SoleIQ wird von mehr als 50 Forschenden, Ärztinnen und Ärzten sowie Chirurginnen und Chirurgen beraten, die landesweit in künstlicher Intelligenz, Biomedizintechnik und klinischer Medizin arbeiten.',
    searchHeading: 'Literatur durchsuchen',
    searchPlaceholder: 'diabetisches Fußulkus, Druckentlastung, Neuropathie-Screening',
    searchHint:
      'Suchen Sie ein Thema, etwa diabetisches Fußulkus, Druckentlastung oder Neuropathie-Screening, und die passenden Nachweise erscheinen hier.',
    searching: 'Suche in Europe PMC',
    searchError: 'Bei dieser Suche ist etwas schiefgegangen.',
    noResults: 'Keine Nachweise für „{query}“. Versuchen Sie einen weiteren Begriff.',
    resultsFor: '{count} Treffer für {query}',
    openAccess: 'Open Access',
    readFullText: 'Volltext lesen',
    abstract: 'Zusammenfassung',
    readFullAbstract: 'Ganze Zusammenfassung lesen',
    showLess: 'Weniger anzeigen',
    correspondingAuthor: 'Korrespondenzautor',
    topics: 'Themen',
    status: {
      published: 'Veröffentlicht',
      preprint: 'Preprint',
    },
  },

  about: {
    eyebrow: 'Über uns',
    heading:
      'Die meisten diabetischen Fußgeschwüre werden spät gefunden. Nicht weil sie verborgen sind, sondern weil niemand hingesehen hat.',
    paragraphs: [
      'Die diabetische Neuropathie nimmt das Signal weg, das jemanden normalerweise auf den eigenen Fuß schauen ließe. Druck, eine Blase, ein Riss in der Haut: nichts davon tut weh, also gibt nichts den Anstoß nachzusehen. Wenn der Fuß schließlich untersucht wird, lautet die Frage meist nicht mehr „ist das etwas?“, sondern „wie viel davon lässt sich retten?“',
      'Eine klinische Fußuntersuchung löst das — und sie ist nicht der Engpass, den wir beheben können. Termine sind knapp, Anfahrten sind teuer, und genau im Abstand zwischen den Besuchen entsteht das Problem.',
      'SoleIQ schließt diesen Abstand mit dem, was jede Patientin und jeder Patient bereits hat: einer Handykamera und ein paar Minuten. Vier Fotos, gelesen zusammen mit der Vorgeschichte, die das Risiko bestimmt, ergeben eine Screening-Stufe, auf die man reagieren kann, und eine Akte, der eine Fachkraft genug traut, um damit zu arbeiten.',
      'Wir sind vorsichtig mit dem, was wir behaupten. SoleIQ screent; es diagnostiziert nicht. Es ist gebaut, um Menschen früher und besser informiert in die Versorgung zu bringen, nicht um sie davon fernzuhalten.',
      'Diese Beschränkung formt das Produkt. Das Modell sieht nie ein Foto, das das Handy als unbrauchbar eingestuft hat. Befunde werden auf den eigenen Bildern gezeigt, damit man sieht, was das System gesehen hat. Jedes Screening bleibt in einem Verlauf, weil ein einzelnes Bild ein schwächeres Signal ist als eine Reihe. Und die Akte gehört der Patientin oder dem Patienten, die entscheiden, welche Fachkraft sie sieht.',
    ],
    team: 'Team',
    roles: {
      founder: 'Gründer und CEO, SoleIQ Health',
    },
    bios: {
      eshaan:
        'Verantwortet die Plattform von Anfang bis Ende: das Screening-Modell, das Produkt und das Forschungsprogramm dahinter. Publiziert zu KI-gestützter Prävention am diabetischen Fuß gemeinsam mit Dr. David G. Armstrong.',
    },
    onLinkedIn: '{name} auf LinkedIn',
  },

  blog: {
    eyebrow: 'Texte',
    heading: 'Notizen von denen, die es bauen.',
    defaultCategory: 'Notizen',
    readingTime: '{minutes} Min.',
    minutesShort: '{minutes} Min.',
    readMore: 'Lesen',
    closeArticle: 'Beitrag schließen',
    originalLanguage: 'Beiträge erscheinen in der Sprache, in der sie geschrieben wurden.',
  },

  contact: {
    eyebrow: 'Kontakt',
    heading: 'Melden Sie sich.',
    body: 'Klinische Partnerschaften, Forschungskooperationen, Presse oder eine Frage zum Produkt. Das erreicht uns direkt.',
    orEmail: 'Oder schreiben Sie an',
    noMedicalDetails:
      'Bitte senden Sie über dieses Formular keine medizinischen Angaben oder Bilder. Es ist kein klinischer Kanal und wird nicht auf dringende Fälle überwacht.',
    name: 'Name',
    email: 'E-Mail',
    message: 'Nachricht',
    send: 'Nachricht senden',
    sending: 'Wird gesendet…',
    sent: 'Nachricht gesendet.',
    sentBody: 'Danke. Wir antworten an {email}.',
    sendAnother: 'Noch eine senden',
    errors: {
      name: 'Bitte nennen Sie uns Ihren Namen.',
      email: 'Bitte geben Sie eine E-Mail-Adresse an.',
      emailInvalid: 'Diese E-Mail-Adresse sieht nicht richtig aus.',
      message: 'Bitte schreiben Sie eine Nachricht.',
      failed: 'Das ließ sich nicht senden. Schreiben Sie uns bitte per E-Mail.',
    },
  },

  footer: {
    heading: 'Fußbereich',
    tagline:
      'KI-gestütztes Screening des diabetischen Fußes aus vier geführten Handyfotos.',
    openApp: 'App öffnen',
    dashboard: 'Dashboard',
    emailUs: 'Schreiben Sie uns',
    privacy: 'Datenschutz',
    terms: 'Nutzungsbedingungen',
    nav: 'Fußbereich',
    onNetwork: 'SoleIQ Health auf {network}',
    disclaimer:
      'SoleIQ ist ein Werkzeug für Screening und Entscheidungsunterstützung. Es ist kein Diagnosegerät, es gibt keine medizinische Beratung und es ersetzt nicht die Beurteilung durch eine qualifizierte Fachkraft. Bei einer Wunde, einer Infektion, plötzlichen Schmerzen oder einer Veränderung von Farbe oder Temperatur eines Fußes suchen Sie bitte sofort ärztliche Hilfe.',
    copyright: '© {year} SoleIQ Health',
  },

  screens: {
    leftFootSole: 'Linker Fuß, Sohle',
    fitFootInFrame: 'Fuß in den Rahmen bringen',
    photoQuality: 'Fotoqualität',
    wholeFootInFrame: 'Ganzer Fuß im Bild',
    sharpEnough: 'Scharf genug zur Auswertung',
    lightingNormalised: 'Licht normalisiert',
    retakeTooDark: 'Rechten Fuß wiederholen, zu dunkel',
    analysing: 'Wird ausgewertet',
    inputs: 'Eingaben',
    diabetesHistory: 'Diabetesvorgeschichte',
    vascularAnswers: 'Gefäßfragen',
    neuropathy: 'Neuropathie',
    painMap: 'Schmerzkarte',
    screeningLevel: 'Screening-Stufe',
    watch: 'Beobachten',
    resultBody:
      'Zwei Stellen im Auge behalten. In 7 Tagen erneut prüfen und einen Termin buchen, wenn sich eine verändert.',
    shareRecord: 'Akte teilen',
    podiatryClinic: 'Ihre podologische Praxis',
    fullHistory: 'Vollständige Vorgeschichte, jedes Foto, jede Screening-Stufe.',
    sendRecord: 'Akte senden',
    clinicianView: 'Ansicht für Fachkräfte',
    clinicalReport: 'Klinischer Bericht',
    photoComparison: 'Fotovergleich',
    perPatientAssistant: 'Assistent je Patient',
    yourTimeline: 'Ihr Verlauf',
    today: 'Heute',
    levels: {
      clear: 'Unauffällig',
      watch: 'Beobachten',
      soon: 'Bald',
      urgent: 'Dringend',
    },
  },
}

export default de
