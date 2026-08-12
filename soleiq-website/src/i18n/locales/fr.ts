import type { Dictionary } from './en'

/**
 * French (fr).
 *
 * "Dépistage" throughout, never "diagnostic" — the same line the English draws.
 * Typographic spacing before « : ; ? ! » is a non-breaking space, so it is
 * written as one rather than left to the browser.
 */
const fr: Dictionary = {
  meta: {
    title: 'SoleIQ — dépistage du pied diabétique assisté par IA',
    description:
      'Dépistage du pied diabétique assisté par IA à partir de quatre photos guidées prises au téléphone. Outil de dépistage et d’aide à la décision, pas un dispositif de diagnostic.',
  },

  a11y: {
    skipToContent: 'Aller au contenu',
  },

  language: {
    label: 'Langue',
    change: 'Changer de langue',
    loading: 'Chargement…',
  },

  nav: {
    howItWorks: 'Comment ça marche',
    research: 'Recherche',
    about: 'À propos',
    contact: 'Contact',
    inPractice: 'En pratique',
    app: 'App',
    dashboard: 'Tableau de bord',
    openApp: 'Ouvrir l’application SoleIQ',
    openDashboard: 'Ouvrir votre tableau de bord SoleIQ',
    backToTop: 'SoleIQ Health, retour en haut',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    primary: 'Principal',
    primaryMobile: 'Principal, mobile',
    disclaimerShort:
      'Dépistage et aide à la décision pour le pied diabétique. Pas un dispositif de diagnostic.',
  },

  hero: {
    slogan: 'Détection précoce, protection à vie',
    body: 'Plateforme de santé publique dotée d’IA qui repère plus tôt la dégradation, améliore la coordination des soins, atteint les populations diabétiques mal desservies et réduit les amputations évitables et les coûts de santé.',
    startScreening: 'Lancer un dépistage',
    openDashboard: 'Ouvrir votre tableau de bord',
    scrollCue: 'Voir comment ça marche',
  },

  features: {
    heading: 'Ce que fait SoleIQ',
    capture: {
      kicker: 'Prise de vue guidée',
      headline: 'Le difficile, c’est de réussir la photo. L’application s’en charge.',
      body: 'Le cadrage, la stabilité et l’éclairage sont vérifiés sur l’appareil avant tout envoi. Si l’une des quatre est inexploitable, vous ne refaites que celle-là.',
      label: 'App',
      visualLabel:
        'Rendu en particules de la prise de vue guidée : un téléphone tenu au-dessus d’un pied, les quatre photographies apparaissant sur son écran.',
    },
    report: {
      kicker: 'Compte rendu clinique',
      headline: 'Votre soignant ouvre un dossier, pas une photographie.',
      body: 'Les constatations reportées sur vos propres images, tout le questionnaire derrière (antécédents, HbA1c, état vasculaire, neuropathie, carte de la douleur) et un assistant limité à ce seul patient.',
      careTeam: 'Votre équipe soignante',
      patientRecord: 'Dossier du patient',
      visualLabel:
        'Rendu en particules du compte rendu clinique : un tableau de bord recevant le dossier, avec les constatations reportées sur la photographie du patient.',
    },
    timeline: {
      kicker: 'Historique partagé',
      headline: 'Un dépistage est un point. Une série est une direction.',
      body: 'Chaque contrôle est conservé comme un ensemble daté de photos et de niveaux : un changement trop lent pour se remarquer au jour le jour saute aux yeux côte à côte.',
      riskOverTime: 'Risque dans le temps',
      visualLabel:
        'Rendu en particules de l’historique partagé : des dépistages datés le long d’un axe, avec un repère qui descend la courbe de risque et revient.',
    },
  },

  narrative: {
    problem: {
      kicker: 'Le problème',
      headline: 'Cela commence par ce que l’on ne peut pas sentir.',
      body: 'La neuropathie diabétique supprime le signal qui vous ferait normalement regarder votre pied. Une pression, une ampoule, une fissure de la peau : rien de tout cela ne fait mal, donc rien n’incite à vérifier. Prise tôt, une plaie du pied se gère en général. Prise tard, souvent non.',
    },
    capture: {
      kicker: 'Prise de vue',
      headline: 'Quatre photos guidées. ≈4 minutes.',
      body: 'Les deux pieds, dessus et plante, avec le téléphone que vous avez déjà. L’application cadre chaque prise et vous stabilise pendant. Aucun accessoire, aucun support, aucun rendez-vous.',
      app: 'App',
    },
    analysis: {
      kicker: 'Analyse',
      headline: 'Vérifié sur votre téléphone, puis lu au regard de vos antécédents.',
      body: 'Les contrôles de qualité et la normalisation de la lumière s’exécutent sur l’appareil avant tout envoi. Un modèle de vision lit ensuite les quatre images avec votre questionnaire (antécédents de diabète, HbA1c, réponses vasculaires et AOMI, neuropathie, histoire du pied, carte de la douleur) et renvoie l’un des quatre niveaux de dépistage.',
      aiAnalysis: 'Analyse par IA',
      riskLevel: 'Niveau de risque',
    },
    handover: {
      kicker: 'Transmission',
      headline: 'Votre soignant reçoit le dossier entier.',
      body: 'Chaque champ du questionnaire, les constatations reportées sur vos propres photographies et l’historique complet, avec un assistant limité à ce dossier. Vous décidez à qui il est transmis.',
      careTeam: 'Votre équipe soignante',
      patientRecord: 'Dossier du patient',
    },
    overTime: {
      kicker: 'Dans la durée',
      headline: 'Un dossier qui s’accumule, et un risque qui peut baisser.',
      body: 'Chaque dépistage est conservé comme un ensemble daté de photos et de niveaux. Un changement trop lent pour se remarquer au jour le jour devient évident sur un historique, tout comme la direction qu’il prend.',
      note: 'À titre d’illustration. Pas des données de patients.',
      riskOverTime: 'Risque dans le temps',
    },
    close: {
      headline: 'SoleIQ',
      body: 'Dépistage et aide à la décision pour le pied diabétique. Pas un dispositif de diagnostic.',
    },
    loading: 'Préparation de la séquence',
    loadingLong: 'Chargement de la séquence de défilement SoleIQ.',
  },

  journeys: {
    eyebrow: 'En pratique',
    heading: 'Les mêmes pieds, deux contextes, et ce qui change quand le contrôle se fait à la maison.',
    lede: 'Ce sont les parcours autour desquels SoleIQ est conçu. Ils décrivent comment le produit est utilisé. Ce ne sont pas des promesses de résultats.',
    chooseSetting: 'Choisir un contexte',
    withoutTitle: 'Sans SoleIQ',
    withTitle: 'Avec SoleIQ',
    changesHeading: 'Ce qui change vraiment',
    cadence: 'Rythme',
    rural: {
      label: 'Rural',
      person:
        'Un agriculteur atteint de diabète de type 2, avec une sensibilité réduite aux deux pieds. La consultation du pied la plus proche est un voyage, pas un déplacement.',
      without: [
        'La pression s’accumule sous l’avant-pied. Avec la neuropathie, rien ne se sent.',
        'Rien n’incite à regarder. Les pieds ne font pas partie de la routine.',
        'On le découvre quand une chaussette colle, ou quand quelqu’un d’autre le remarque.',
        'Aller à la consultation, c’est le transport, le coût et une journée de travail perdue.',
        'La visite a lieu une fois la plaie impossible à ignorer.',
        'Les soins commencent là où soigner est le plus difficile.',
      ],
      with: [
        'Un dépistage à la maison : quatre photos, prises par un proche si besoin.',
        'Les photos sont vérifiées sur le téléphone avant tout envoi.',
        'Un niveau revient, avec les constatations marquées sur les photos.',
        'Le dossier est transmis à l’avance à la consultation ou à l’agent de santé.',
        'Le trajet se fait une fois, délibérément, avec un historique déjà en main.',
        'Entre les visites, l’historique continue de surveiller.',
      ],
      cadenceWithout: 'Regardé quand quelqu’un y pense',
      cadenceWith: 'Regardé à intervalles réguliers, à domicile',
      visualLabel:
        'Rendu en particules d’une maison parmi les arbres, avec des feuilles dans l’air.',
    },
    urban: {
      label: 'Urbain',
      person:
        'Une personne diabétique de type 2 qui fait la navette et dont une corne revient sans cesse. Un rendez-vous de podologie est possible, à terme.',
      without: [
        'Une corne s’épaissit et la peau autour change de couleur. Facile à écarter.',
        'Prendre rendez-vous en podologie, c’est entrer dans une file d’attente.',
        'Le rendez-vous arrive, ou est reporté, ou est manqué.',
        'En consultation, le soignant voit le pied du jour et rien d’avant.',
        'Des conseils sont donnés ; le suivi dépend du souvenir de son aspect.',
        'Le changement suivant reste non mesuré jusqu’au rendez-vous d’après.',
      ],
      with: [
        'Un dépistage à la maison prend quelques minutes, avant le travail.',
        'Les constatations sont marquées sur les propres photographies du patient.',
        'Le niveau dit si c’est à recontrôler dans une semaine ou à voir tout de suite.',
        'Les créneaux vont aux personnes dont le niveau dit qu’elles en ont besoin.',
        'Le soignant ouvre une série de photos datées plutôt qu’une page blanche.',
        'Le suivi se mesure sur des images, pas sur la mémoire.',
      ],
      cadenceWithout: 'Regardé lors des rendez-vous',
      cadenceWith: 'Regardé aussi entre les rendez-vous',
      visualLabel:
        'Rendu en particules d’une silhouette urbaine sous un ciel qui passe du jour à la nuit.',
    },
    comparison: [
      {
        q: 'Qui s’en aperçoit en premier',
        without: 'Celui qui regarde par hasard, ce qui avec la neuropathie n’est souvent personne.',
        with: 'Un contrôle de routine qui ne dépend pas de pouvoir le sentir.',
      },
      {
        q: 'Ce que voit le soignant',
        without: 'Le pied tel qu’il est aujourd’hui.',
        with: 'Une série datée, où l’évolution se voit.',
      },
      {
        q: 'Ce qui déclenche une visite',
        without: 'Une plaie devenue évidente.',
        with: 'Un niveau de dépistage, avec sa raison jointe.',
      },
      {
        q: 'Ce que coûte un déplacement',
        without: 'La même chose, qu’il se révèle nécessaire ou non.',
        with: 'La même chose, mais fait pour une raison que l’on peut montrer.',
      },
    ],
  },

  progression: {
    eyebrow: 'Évolution',
    heading: 'Le parcours entier, et la partie qu’un appareil photo peut atteindre.',
    lede: 'Une plaie du pied diabétique n’arrive pas : elle évolue. Choisissez un grade pour voir ce qui est vrai du pied à ce stade, et ce qu’une photographie peut ou ne peut pas établir.',
    gradesLabel: 'Grades de Wagner',
    grade: 'Grade',
    gradesRange: 'Grades {from}–{to}',
    whatPhotoShows: 'Ce que montre une photo',
    whatSoleIQDoes: 'Ce que fait SoleIQ',
    trajectory: 'Trajectoire typique du pire des cas',
    play: 'Lancer la présentation',
    pause: 'Mettre en pause',
    windows: {
      soleiq: {
        title: 'Là où SoleIQ agit',
        line: 'Le repérer avant que la peau ne se rompe.',
      },
      standard: {
        title: 'Là où les soins commencent d’habitude',
        line: 'Quand ça fait mal ou que ça sent, le mal est fait.',
      },
    },
    caveat:
      'Wagner classe la gravité à un instant donné ; ce n’est pas une séquence temporelle validée. Les intervalles ci-dessus décrivent une trajectoire du pire des cas sur un pied non traité ou mal équilibré. Beaucoup de personnes se présentent déjà au grade 2 ou 3 et, avec une bonne décharge, une bonne perfusion et un bon contrôle de l’infection, environ 60 à 80 pour cent des plaies cicatrisent en 12 à 20 semaines sans jamais évoluer. Sur un pied ischémique, la même séquence peut se réduire à quelques jours. SoleIQ est une aide au suivi et au tri, pas un dispositif de diagnostic, et il ne classe pas les plaies.',
    stages: [
      {
        name: 'Pas de lésion ouverte',
        plain: 'Peau intacte, pied à risque',
        what: 'La peau n’est pas rompue. Il peut y avoir une corne, une déformation ou un point d’appui qui se construit dessous — et avec la neuropathie, rien de tout cela ne se sent.',
        camera:
          'C’est ici qu’une photographie est la plus utile, parce qu’il n’y a rien à sentir et rien que quiconque cherche. Ce qu’elle capte, c’est une référence : la corne, la couleur, la forme, datées.',
        soleiq:
          'C’est le grade pour lequel SoleIQ a été conçu. Un dépistage régulier établit à quoi ce pied ressemble normalement, pour qu’un changement ait quelque chose par rapport à quoi être un changement.',
        whenLabel: 'Référence',
        whenDetail: 'peau intacte, pied à risque',
        toNext: 'Événement déclencheur — de quelques jours à quelques semaines',
      },
      {
        name: 'Ulcère superficiel',
        plain: 'La peau s’est rompue',
        what: 'Perte cutanée de pleine épaisseur n’atteignant ni tendon, ni capsule, ni os. Souvent indolore, ce qui est précisément pourquoi elle n’est pas signalée.',
        camera:
          'Visible. Une rupture de la peau, ses bords et la rougeur autour sont des éléments de surface, et les éléments de surface sont ce qu’un appareil photo lit bien.',
        soleiq:
          'Un dépistage à ce grade renvoie un niveau qui dit de faire examiner cela, avec la constatation marquée sur la propre photographie du patient et les semaines précédentes à côté.',
        whenLabel: 'Mois 0',
        whenDetail: 'apparition de l’ulcère, le compte commence',
        toNext: 'Environ 2 à 8 semaines',
      },
      {
        name: 'Ulcère profond',
        plain: 'Jusqu’au tendon ou à l’os',
        what: 'L’ulcère s’étend au tendon, à la capsule articulaire ou à l’os, sans abcès ni ostéomyélite.',
        camera:
          'L’ouverture est visible ; la profondeur non. Aucune photographie ne dit jusqu’où va une plaie, et c’est le grade où cette limite commence à compter.',
        soleiq:
          'Signalé comme urgent et transmis avec l’historique joint. La profondeur est une constatation au stylet, faite par un soignant ; le travail de l’application est de s’assurer que quelqu’un tient le stylet.',
        whenLabel: 'Mois 0,5 à 2',
        whenDetail: 'depuis la première rupture de la peau',
        toNext: 'Environ 1 à 3 mois',
      },
      {
        name: 'Ostéite ou abcès',
        plain: 'L’infection a atteint l’os',
        what: 'Infection profonde : abcès, ostéomyélite ou tendinite infectieuse. C’est le point où la question passe de guérir la plaie à sauver le pied.',
        camera:
          'Hors de portée d’un appareil photo. L’atteinte osseuse s’établit au stylet, par imagerie et par bilan sanguin, pas en regardant la peau.',
        soleiq:
          'Plus rien ici n’est un problème de dépistage. La valeur que SoleIQ pouvait apporter à ce grade a été dépensée des mois plus tôt, aux grades 0 et 1.',
        whenLabel: 'Mois 2 à 5',
        whenDetail: 'atteinte osseuse, contact osseux au stylet',
        toNext: 'Environ 1 à 3 mois',
      },
      {
        name: 'Gangrène partielle',
        plain: 'Nécrose, membre menacé',
        what: 'Gangrène localisée — le plus souvent l’avant-pied ou les orteils. Les décisions de revascularisation et de chirurgie se prennent contre la montre.',
        camera:
          'Hors de portée d’un appareil photo, et hors du dépistage. Ce sont des soins hospitaliers.',
        soleiq:
          'Hors périmètre. Inclus ici parce que le parcours doit être montré en entier pour être crédible.',
        whenLabel: 'Mois 4 à 9',
        whenDetail: 'nécrose, membre menacé',
        toNext: 'De quelques jours à quelques semaines',
      },
      {
        name: 'Gangrène étendue',
        plain: 'Tout le pied',
        what: 'Gangrène de tout le pied. Territoire de l’amputation majeure.',
        camera: 'Hors de portée d’un appareil photo.',
        soleiq:
          'Hors périmètre — et l’issue que les deux premiers grades existent pour éviter.',
        whenLabel: 'Mois 6 à 18',
        whenDetail: 'territoire de l’amputation majeure',
        toNext: null as string | null,
      },
    ],
  },

  research: {
    eyebrow: 'Recherche',
    heading: 'Le travail derrière le dépistage, et la littérature dans laquelle il s’inscrit.',
    lede: 'Notre propre article est ci-dessous. En dessous, une recherche en direct dans la littérature publiée, tenue à part et clairement signalée, pour que les deux ne soient jamais confondues.',
    advisors: 'SoleIQ est conseillé par plus de 50 chercheurs, médecins et chirurgiens travaillant en intelligence artificielle, en génie biomédical et en médecine clinique à travers le pays.',
    searchHeading: 'Rechercher dans la littérature',
    searchPlaceholder: 'plaie du pied diabétique, décharge, dépistage de la neuropathie',
    searchHint:
      'Cherchez un sujet, par exemple plaie du pied diabétique, décharge ou dépistage de la neuropathie, et les références correspondantes apparaîtront ici.',
    searching: 'Recherche dans Europe PMC',
    searchError: 'Un problème est survenu pendant cette recherche.',
    noResults: 'Aucune référence pour « {query} ». Essayez un terme plus large.',
    resultsFor: '{count} résultats pour {query}',
    openAccess: 'Accès libre',
    readFullText: 'Lire le texte intégral',
    abstract: 'Résumé',
    readFullAbstract: 'Lire le résumé complet',
    showLess: 'Réduire',
    correspondingAuthor: 'Auteur correspondant',
    topics: 'Thèmes',
    status: {
      published: 'Publié',
      preprint: 'Prépublication',
    },
  },

  about: {
    eyebrow: 'À propos',
    heading:
      'La plupart des plaies du pied diabétique sont trouvées tard. Non parce qu’elles sont cachées, mais parce que personne ne regardait.',
    paragraphs: [
      'La neuropathie diabétique supprime le signal qui pousserait normalement quelqu’un à regarder son pied. Une pression, une ampoule, une fissure de la peau : rien de tout cela ne fait mal, donc rien n’incite à vérifier. Quand le pied est enfin examiné, la question a généralement cessé d’être « est-ce que c’est quelque chose ? » pour devenir « combien peut-on en sauver ? »',
      'Un examen clinique du pied résout cela, et ce n’est pas le goulet d’étranglement que nous pouvons corriger. Les rendez-vous sont rares, se déplacer coûte cher, et l’intervalle entre les visites est exactement là où le problème se développe.',
      'SoleIQ referme cet intervalle avec ce que chaque patient possède déjà : un appareil photo de téléphone et quelques minutes. Quatre photos, lues avec les antécédents qui déterminent le risque, produisent un niveau de dépistage sur lequel une personne peut agir et un dossier auquel un soignant peut se fier pour travailler.',
      'Nous sommes prudents sur ce que nous affirmons. SoleIQ dépiste ; il ne diagnostique pas. Il est fait pour amener les gens aux soins plus tôt et avec de meilleures informations, pas pour les en éloigner.',
      'Cette contrainte façonne le produit. Le modèle ne voit jamais une photo que le téléphone a jugée inexploitable. Les constatations sont montrées sur les propres images du patient, pour qu’une personne voie ce que le système a vu. Chaque dépistage reste dans un historique, parce qu’une image isolée est un signal plus faible qu’une série. Et le dossier appartient au patient, qui décide quel soignant le voit.',
    ],
    team: 'Équipe',
    roles: {
      founder: 'Fondateur et CEO, SoleIQ Health',
    },
    bios: {
      eshaan:
        'Dirige la plateforme de bout en bout : le modèle de dépistage, le produit et le programme de recherche derrière. A publié sur la prévention guidée par IA pour le pied diabétique avec le Dr David G. Armstrong.',
    },
    onLinkedIn: '{name} sur LinkedIn',
  },

  blog: {
    eyebrow: 'Écrits',
    heading: 'Notes de celles et ceux qui le construisent.',
    defaultCategory: 'Notes',
    readingTime: '{minutes} min',
    minutesShort: '{minutes} min',
    readMore: 'Lire',
    closeArticle: 'Fermer l’article',
    originalLanguage: 'Les articles sont affichés dans la langue où ils ont été écrits.',
  },

  contact: {
    eyebrow: 'Contact',
    heading: 'Écrivez-nous.',
    body: 'Partenariats cliniques, collaboration de recherche, presse ou une question sur le produit. Cela nous parvient directement.',
    orEmail: 'Ou écrivez à',
    noMedicalDetails:
      'Merci de ne pas envoyer de données médicales ni d’images par ce formulaire. Ce n’est pas un canal clinique et il n’est pas surveillé pour les urgences.',
    name: 'Nom',
    email: 'E-mail',
    message: 'Message',
    send: 'Envoyer le message',
    sending: 'Envoi…',
    sent: 'Message envoyé.',
    sentBody: 'Merci. Nous répondrons à {email}.',
    sendAnother: 'En envoyer un autre',
    errors: {
      name: 'Merci d’indiquer votre nom.',
      email: 'Merci d’ajouter une adresse e-mail.',
      emailInvalid: 'Cette adresse e-mail semble incorrecte.',
      message: 'Merci d’inclure un message.',
      failed: 'L’envoi a échoué. Écrivez-nous par e-mail.',
    },
  },

  footer: {
    heading: 'Pied de page',
    tagline:
      'Dépistage du pied diabétique assisté par IA à partir de quatre photos guidées prises au téléphone.',
    openApp: 'Ouvrir l’application',
    dashboard: 'Tableau de bord',
    emailUs: 'Nous écrire',
    privacy: 'Confidentialité',
    terms: 'Conditions',
    nav: 'Pied de page',
    onNetwork: 'SoleIQ Health sur {network}',
    disclaimer:
      'SoleIQ est un outil de dépistage et d’aide à la décision. Ce n’est pas un dispositif de diagnostic, il ne donne pas d’avis médical et il ne remplace pas l’évaluation par un professionnel qualifié. Si vous avez une plaie, une infection, une douleur soudaine ou un changement de couleur ou de température d’un pied, consultez immédiatement.',
    copyright: '© {year} SoleIQ Health',
  },

  screens: {
    leftFootSole: 'Pied gauche, plante',
    fitFootInFrame: 'Placez le pied dans le cadre',
    photoQuality: 'Qualité de la photo',
    wholeFootInFrame: 'Pied entier dans le cadre',
    sharpEnough: 'Assez nette pour l’analyse',
    lightingNormalised: 'Éclairage normalisé',
    retakeTooDark: 'Refaire le pied droit, trop sombre',
    analysing: 'Analyse',
    inputs: 'Données',
    diabetesHistory: 'Antécédents de diabète',
    vascularAnswers: 'Réponses vasculaires',
    neuropathy: 'Neuropathie',
    painMap: 'Carte de la douleur',
    screeningLevel: 'Niveau de dépistage',
    watch: 'À surveiller',
    resultBody:
      'Deux zones à surveiller. Recontrôlez dans 7 jours et prenez rendez-vous si l’une d’elles change.',
    shareRecord: 'Partager votre dossier',
    podiatryClinic: 'Votre cabinet de podologie',
    fullHistory: 'Historique complet, chaque photo, chaque niveau de dépistage.',
    sendRecord: 'Envoyer le dossier',
    clinicianView: 'Vue du soignant',
    clinicalReport: 'Compte rendu clinique',
    photoComparison: 'Comparaison des photos',
    perPatientAssistant: 'Assistant par patient',
    yourTimeline: 'Votre historique',
    today: 'Aujourd’hui',
    levels: {
      clear: 'Rien à signaler',
      watch: 'À surveiller',
      soon: 'Bientôt',
      urgent: 'Urgent',
    },
  },
}

export default fr
