import type { Dictionary } from './en';

/**
 * French (fr).
 *
 * "Dépistage" throughout, never "diagnostic" — the distinction is the same one
 * the English copy is careful about, and French clinical usage keeps it too.
 * The patient is addressed as vous.
 */
const fr: Dictionary = {
  brand: {
    name: 'SoleIQ',
    health: 'Health',
    slogan: 'Détection précoce, protection à vie',
  },

  nav: {
    website: 'Site web',
    websiteAria: 'Aller sur soleiqhealth.com',
    home: 'Accueil',
    dashboard: 'Mon tableau de bord',
    clinical: 'SoleIQ Clinique',
    signOut: 'Se déconnecter',
    signedInAs: 'Connecté en tant que {email}',
    yourAccount: 'votre compte',
    noMembership: 'aucun rattachement hospitalier',
    feedback: 'Commentaires',
    adminConsole: "Console d'administration",
    doctorDashboard: 'Tableau de bord du médecin',
    footHealth: 'La santé de mes pieds',
  },

  language: {
    label: 'Langue',
    change: 'Changer de langue',
    loading: 'Chargement de la langue…',
  },

  flow: {
    back: 'Retour',
    backHint: 'Retour (←)',
    continue: 'Continuer',
    skip: 'Passer',
    step: 'Étape {current} sur {total}',
    encouragementStart: 'Commençons',
    encouragementUnderway: 'Vous êtes lancé',
    encouragementGood: 'Bonne progression',
    encouragementAlmost: 'Presque terminé',
    encouragementDone: 'Terminé — bravo !',
    disclaimer:
      "SoleIQ est un outil de suivi du bien-être et ne remplace pas un diagnostic médical professionnel.",
  },

  welcome: {
    intro:
      "Dépistage du pied diabétique assisté par IA — aide à la décision clinique en médecine générale et en podologie.",
    start: 'Commencer la consultation',
    duration: '~4 minutes par patient. Pour usage clinique.',
  },

  auth: {
    welcome: 'Bienvenue',
    chooseSubtitle: 'Dites-nous qui vous êtes pour que nous préparions la bonne expérience.',
    iAmPatient: 'Je suis patient',
    iAmPatientBody: 'Examinez vos pieds avec des photos guidées et gardez vos résultats au même endroit.',
    iAmDoctor: 'Je suis médecin ou aidant',
    iAmDoctorBody: 'Suivez les examens des pieds de vos patients, leurs chronologies de photos et les synthèses IA.',
    sendingReset: 'Envoi du lien…',
    resetSent: 'Si un compte existe pour {email}, un lien de réinitialisation est en route — vérifiez aussi les indésirables. Ouvrez-le sur cet appareil ; le lien expire dans une heure.',
    signIn: 'Se connecter',
    createAccount: 'Créer un compte',
    titlePatient: 'Connectez-vous à SoleIQ',
    titleDoctor: 'Connexion médecin / aidant',
    subtitlePatient:
      'Vos examens des pieds sont enregistrés dans votre compte, vous les retrouverez la prochaine fois.',
    subtitleDoctor: 'Votre tableau de bord affiche les patients qui vous sont attribués.',
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    passwordHint: 'Plus de 6 caractères, avec au moins un chiffre ou un symbole.',
    passwordOk: 'Le mot de passe respecte les exigences.',
    forgot: 'Mot de passe oublié ?',
    working: 'Traitement…',
    signedIn: 'Connexion réussie',
    redirecting: 'Nous vous conduisons à votre tableau de bord…',
    resend: "Renvoyer l'e-mail de confirmation",
    resendSent:
      'E-mail de confirmation envoyé — vérifiez votre boîte de réception (et les indésirables).',
    accountCreated:
      "Compte créé — nous vous avons envoyé un e-mail de confirmation. Ouvrez le lien qu'il contient, puis connectez-vous ici.",
    emailConfirmed: 'Adresse confirmée — connectez-vous ci-dessous.',
    staffNote:
      "L'accès médecin et administrateur passe uniquement par une invitation hospitalière à durée limitée. Les nouveaux médecins restent inactifs jusqu'à leur vérification par l'hôpital.",
    patientNote:
      "Les nouveaux comptes ne choisissent pas de rôle soignant. L'accès hospitalier est ajouté par invitation ou par rattachement au dossier patient.",
    errorEmailFirst: "Saisissez d'abord votre adresse e-mail.",
    errorForgotEmailFirst:
      "Saisissez d'abord votre adresse e-mail, puis touchez « Mot de passe oublié ? ».",
    errorSignInFailed: 'Échec de la connexion.',
    errorUnconfirmed:
      "Votre adresse n'est pas encore confirmée. Ouvrez le lien de confirmation que nous vous avons envoyé, ou renvoyez-le ci-dessous.",
    errorStaffInviteOnly:
      "Les comptes du personnel sont créés à partir d'une invitation hospitalière. Demandez une invitation à votre administrateur.",
    errorSendFailed:
      "Notre service d'e-mail n'a pas pu envoyer le message pour l'instant — réessayez dans quelques minutes.",
    errorRateLimited:
      "Trop d'e-mails ont été demandés en peu de temps. Patientez un moment et réessayez.",
    errorRecoveryFailed: 'La demande de récupération a échoué.',
    errorResendFailed: "Impossible de renvoyer l'e-mail.",
  },

  reset: {
    title: 'Définissez un nouveau mot de passe',
    subtitle: "Choisissez un mot de passe que vous n'avez pas déjà utilisé sur ce compte.",
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmez le nouveau mot de passe',
    mismatch: 'Les deux mots de passe ne correspondent pas.',
    submit: 'Mettre à jour le mot de passe',
    submitting: 'Mise à jour…',
    done: 'Mot de passe mis à jour',
    doneBody: 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.',
    expired: 'Ce lien a expiré',
    expiredBody:
      "Les liens de mot de passe ne servent qu'une fois et cessent de fonctionner au bout d'une heure. Demandez-en un nouveau, il arrivera dans un instant.",
    requestNew: 'Envoyer un nouveau lien',
    backToSignIn: 'Retour à la connexion',
    sameBrowser: 'Ce lien doit être ouvert dans le navigateur qui l\'a demandé. Demandez un nouvel e-mail et ouvrez-le sur cet appareil.',
    openFromEmail: 'Ouvrez le lien reçu par e-mail pour définir un nouveau mot de passe, ou demandez-en un nouveau depuis la page de connexion.',
    samePassword: 'C\'est déjà votre mot de passe actuel — choisissez-en un autre.',
    checking: 'Vérification de votre lien…',
  },

  screens: {
    consentEyebrow: 'Étape 1',
    consentTitle: 'Consentement du patient',
    consentSubtitle:
      "Confirmez avec le patient qu'il accepte chacun des points suivants avant de continuer.",

    returningEyebrow: 'Bon retour',
    returningTitle: 'Vérifiez vos réponses',
    returningSubtitle:
      "Nous avons conservé tout ce qui datait de votre dernier examen. Mettez à jour ce qui a changé — le reste est repris. Les photos sont toujours reprises à neuf.",

    intakeEyebrow: 'Admission du patient',
    nameTitle: 'Nom du patient',
    nameSubtitle: "Et le domicile du patient, pour les recommandations d'orientation.",

    demographicsTitle: 'Données démographiques du patient',
    demographicsSubtitle:
      "Utilisées pour personnaliser les a priori de population et auditer l'équité du modèle.",

    historyEyebrow: 'Antécédents médicaux',
    conditionsTitle: 'Affections',
    conditionsSubtitle:
      'Sélectionnez tout ce qui correspond. Touchez le (?) pour les détails cliniques de chaque affection.',

    vascularEyebrow: 'Dépistage vasculaire',
    vascularTitle: 'Artériopathie périphérique',
    vascularSubtitle:
      "L'AOMI est liée de façon indépendante au retard de cicatrisation et au risque d'amputation — nous la dépistons séparément de la neuropathie.",

    diabetesTitle: 'Détails du diabète',
    diabetesSubtitle: 'Type et année du diagnostic.',

    glucoseTitle: 'Marqueurs glycémiques',
    glucoseSubtitle:
      'HbA1c et dernière mesure du lecteur de glycémie. Les deux sont facultatifs.',

    footHistoryTitle: 'Antécédents podologiques',
    footHistorySubtitle: 'Ulcères antérieurs, amputations ou chirurgies récentes.',

    lifestyleTitle: 'Santé et mode de vie',
    lifestyleSubtitle:
      'Engourdissement des pieds, ainsi que quelques questions sur votre mode de vie.',

    sizingEyebrow: 'Pointure',
    sizingTitle: 'Votre pointure',

    painEyebrow: 'Symptômes',
    painTitle: 'Évaluation de la douleur',
    painSubtitle: 'Demandez au patient : avez-vous mal aux pieds en ce moment ?',

    captureEyebrow: 'Prise de vue',
    captureTitle: "Commencer l'examen du pied",
    captureSubtitle:
      'Prenez ou importez quatre photos en couleur : le dessus et la plante de chaque pied. Vous pouvez reprendre une photo avant le contrôle.',

    perfusionEyebrow: 'Facultatif',
    perfusionTitle: 'Circulation du pied',
    perfusionSubtitle:
      "Contrôles du flux sanguin de chaque pied à la caméra. Ils peuvent être passés — l'examen photo n'en dépend pas.",
    perfusionPulse: 'Signal de pouls',
    perfusionRefill: 'Recoloration capillaire',

    leftFoot: 'Pied gauche',
    rightFoot: 'Pied droit',

    nextStepsEyebrow: 'Examen terminé',
    nextStepsTitle: 'Enregistrez votre examen',
    nextStepsSubtitle:
      "Conservez-le dans votre historique privé pour que vous et votre équipe soignante puissiez suivre l'évolution.",

    productsEyebrow: 'Options thérapeutiques',
    productsTitle: "Produits d'appoint",

    timelineEyebrow: 'Historique des photos',
    timelineTitle: 'Vos examens des pieds',
    timelineLoading: 'Chargement de vos examens enregistrés…',
    timelineCount: '{count} examens enregistrés.',
    timelineCountOne: '1 examen enregistré.',
  },

  common: {
    yes: 'Oui',
    no: 'Non',
    save: 'Enregistrer',
    cancel: 'Annuler',
    close: 'Fermer',
    retry: 'Réessayer',
    loading: 'Chargement…',
    required: 'Obligatoire',
    optional: 'Facultatif',
    done: 'Terminé',
    somethingWentWrong: "Une erreur s'est produite.",
  },
};

export default fr;
