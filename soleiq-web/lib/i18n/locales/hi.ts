import type { Dictionary } from './en';

/**
 * Hindi (hi).
 *
 * Clinical Hindi as it is actually spoken in an Indian clinic: everyday Hindi
 * carrying the English terms a patient will already have heard from their
 * doctor (डायबिटीज़, न्यूरोपैथी, HbA1c) rather than Sanskritised coinages
 * nobody uses. "स्क्रीनिंग" is kept apart from "निदान" throughout.
 */
const hi: Dictionary = {
  brand: {
    name: 'SoleIQ',
    health: 'Health',
    slogan: 'शुरुआती पहचान, जीवन भर सुरक्षा',
  },

  nav: {
    website: 'वेबसाइट',
    websiteAria: 'soleiqhealth.com पर जाएँ',
    home: 'होम',
    dashboard: 'मेरा डैशबोर्ड',
    clinical: 'SoleIQ क्लिनिकल',
    signOut: 'साइन आउट',
    signedInAs: '{email} के रूप में साइन इन',
    yourAccount: 'आपका खाता',
    noMembership: 'किसी अस्पताल से नहीं जुड़ा',
    feedback: 'प्रतिक्रिया',
    adminConsole: 'एडमिन कंसोल',
    doctorDashboard: 'डॉक्टर डैशबोर्ड',
    footHealth: 'मेरे पैरों की सेहत',
  },

  language: {
    label: 'भाषा',
    change: 'भाषा बदलें',
    loading: 'भाषा लोड हो रही है…',
  },

  flow: {
    back: 'पीछे',
    backHint: 'पीछे (←)',
    continue: 'आगे बढ़ें',
    skip: 'छोड़ें',
    step: 'चरण {current} / {total}',
    encouragementStart: 'चलिए शुरू करते हैं',
    encouragementUnderway: 'आप आगे बढ़ रहे हैं',
    encouragementGood: 'अच्छी प्रगति',
    encouragementAlmost: 'बस थोड़ा और',
    encouragementDone: 'सब पूरा — बहुत बढ़िया!',
    disclaimer:
      'SoleIQ सेहत पर नज़र रखने का एक साधन है और यह पेशेवर चिकित्सकीय निदान का विकल्प नहीं है।',
  },

  welcome: {
    intro:
      'AI-सहायित डायबिटिक फुट स्क्रीनिंग — प्राथमिक चिकित्सा और पोडियाट्री विज़िट के लिए क्लिनिकल निर्णय में सहायता।',
    start: 'मरीज़ की जाँच शुरू करें',
    duration: 'हर मरीज़ के लिए लगभग 4 मिनट। क्लिनिकल उपयोग हेतु।',
  },

  auth: {
    welcome: 'स्वागत है',
    chooseSubtitle: 'हमें बताइए कि आप कौन हैं, ताकि हम सही अनुभव तैयार कर सकें।',
    iAmPatient: 'मैं मरीज़ हूँ',
    iAmPatientBody: 'निर्देशों के साथ तस्वीरें लेकर अपने पैरों की जाँच करें और नतीजे एक ही जगह रखें।',
    iAmDoctor: 'मैं डॉक्टर या देखभालकर्ता हूँ',
    iAmDoctorBody: 'अपने मरीज़ों की पैरों की जाँच, तस्वीरों की समयरेखा और AI सारांश देखते रहें।',
    sendingReset: 'लिंक भेजा जा रहा है…',
    resetSent: 'अगर {email} का कोई खाता है, तो रीसेट लिंक भेजा जा रहा है — स्पैम भी देखें। इसे इसी डिवाइस पर खोलें; लिंक एक घंटे में खत्म हो जाता है।',
    signIn: 'साइन इन',
    createAccount: 'खाता बनाएँ',
    titlePatient: 'SoleIQ में साइन इन करें',
    titleDoctor: 'डॉक्टर / देखभालकर्ता साइन इन',
    subtitlePatient:
      'आपके पैरों की जाँचें आपके खाते में सहेजी जाती हैं, इसलिए अगली बार भी यहीं मिलेंगी।',
    subtitleDoctor: 'आपके डैशबोर्ड पर वे मरीज़ दिखते हैं जो आपको सौंपे गए हैं।',
    email: 'ईमेल',
    password: 'पासवर्ड',
    showPassword: 'पासवर्ड दिखाएँ',
    hidePassword: 'पासवर्ड छिपाएँ',
    passwordHint: '6 से ज़्यादा अक्षर, और कम से कम एक अंक या चिह्न।',
    passwordOk: 'पासवर्ड शर्तें पूरी करता है।',
    forgot: 'पासवर्ड भूल गए?',
    working: 'हो रहा है…',
    signedIn: 'सफलतापूर्वक साइन इन हुए',
    redirecting: 'आपको डैशबोर्ड पर ले जा रहे हैं…',
    resend: 'पुष्टि वाला ईमेल दोबारा भेजें',
    resendSent: 'पुष्टि वाला ईमेल भेज दिया — अपना इनबॉक्स (और स्पैम) देखें।',
    accountCreated:
      'खाता बन गया — हमने पुष्टि वाला ईमेल भेजा है। उसमें दिया लिंक खोलें, फिर यहाँ साइन इन करें।',
    emailConfirmed: 'ईमेल की पुष्टि हो गई — नीचे साइन इन करें।',
    staffNote:
      'डॉक्टर और एडमिन की पहुँच केवल अस्पताल के समय-सीमित निमंत्रण से मिलती है। नए डॉक्टर तब तक निष्क्रिय रहते हैं जब तक अस्पताल उनकी पुष्टि न कर दे।',
    patientNote:
      'नए खाते स्टाफ़ की भूमिका खुद नहीं चुनते। अस्पताल की पहुँच निमंत्रण या मरीज़ के रिकॉर्ड से जोड़ने की प्रक्रिया से जुड़ती है।',
    errorEmailFirst: 'पहले अपना ईमेल भरें।',
    errorForgotEmailFirst: 'पहले अपना ईमेल भरें, फिर "पासवर्ड भूल गए?" पर टैप करें।',
    errorSignInFailed: 'साइन इन नहीं हो सका।',
    errorUnconfirmed:
      'आपके ईमेल की पुष्टि अभी बाकी है। हमने जो पुष्टि लिंक भेजा है उसे खोलें — या नीचे से दोबारा भेजें।',
    errorStaffInviteOnly:
      'स्टाफ़ के खाते अस्पताल के निमंत्रण से बनते हैं। अपने अस्पताल के एडमिन से निमंत्रण माँगें।',
    errorSendFailed:
      'हमारी ईमेल सेवा अभी संदेश नहीं भेज पाई — कुछ मिनट बाद दोबारा कोशिश करें।',
    errorRateLimited:
      'कम समय में बहुत सारे ईमेल माँगे गए। थोड़ा रुककर दोबारा कोशिश करें।',
    errorRecoveryFailed: 'रिकवरी का अनुरोध विफल रहा।',
    errorResendFailed: 'ईमेल दोबारा नहीं भेजा जा सका।',
  },

  reset: {
    title: 'नया पासवर्ड बनाएँ',
    subtitle: 'ऐसा पासवर्ड चुनें जो आपने इस खाते पर पहले इस्तेमाल न किया हो।',
    newPassword: 'नया पासवर्ड',
    confirmPassword: 'नए पासवर्ड की पुष्टि करें',
    mismatch: 'दोनों पासवर्ड मेल नहीं खाते।',
    submit: 'पासवर्ड अपडेट करें',
    submitting: 'अपडेट हो रहा है…',
    done: 'पासवर्ड अपडेट हो गया',
    doneBody: 'अब आप अपने नए पासवर्ड से साइन इन कर सकते हैं।',
    expired: 'यह लिंक समाप्त हो चुका है',
    expiredBody:
      'पासवर्ड लिंक सिर्फ़ एक बार काम करते हैं और एक घंटे बाद बंद हो जाते हैं। नया माँगें, वह तुरंत पहुँच जाएगा।',
    requestNew: 'नया लिंक भेजें',
    backToSignIn: 'साइन इन पर वापस',
    sameBrowser: 'यह लिंक उसी ब्राउज़र में खोलना ज़रूरी है जिससे माँगा गया था। नया ईमेल मँगाएँ और उसे इसी डिवाइस पर खोलें।',
    openFromEmail: 'नया पासवर्ड बनाने के लिए अपने ईमेल का रीसेट लिंक खोलें, या साइन इन पेज से नया मँगाएँ।',
    samePassword: 'यह तो पहले से ही आपका मौजूदा पासवर्ड है — कोई दूसरा चुनें।',
    checking: 'आपका लिंक जाँचा जा रहा है…',
  },

  screens: {
    consentEyebrow: 'चरण 1',
    consentTitle: 'मरीज़ की सहमति',
    consentSubtitle:
      'आगे बढ़ने से पहले मरीज़ से पुष्टि करें कि वे नीचे दिए हर बिंदु से सहमत हैं।',

    returningEyebrow: 'फिर से स्वागत है',
    returningTitle: 'अपने जवाब देख लें',
    returningSubtitle:
      'हमने आपकी पिछली जाँच की हर बात सहेज रखी है। जो बदला हो बस वही अपडेट करें — बाकी अपने आप आ जाएगा। तस्वीरें हर बार नई ली जाती हैं।',

    intakeEyebrow: 'मरीज़ का पंजीकरण',
    nameTitle: 'मरीज़ का नाम',
    nameSubtitle: 'और रेफ़रल की सलाह के लिए मरीज़ के रहने की जगह।',

    demographicsTitle: 'मरीज़ की जनसांख्यिकी',
    demographicsSubtitle:
      'जनसंख्या-आधारित अनुमान को व्यक्तिगत बनाने और मॉडल की निष्पक्षता जाँचने के लिए।',

    historyEyebrow: 'सेहत का इतिहास',
    conditionsTitle: 'बीमारियाँ',
    conditionsSubtitle:
      'जो भी लागू हो सब चुनें। किसी भी बीमारी की क्लिनिकल जानकारी के लिए (?) दबाएँ।',

    vascularEyebrow: 'रक्तवाहिनी स्क्रीनिंग',
    vascularTitle: 'पेरिफेरल आर्टरी डिज़ीज़',
    vascularSubtitle:
      'PAD का घाव देर से भरने और अंग कटने के जोखिम से स्वतंत्र संबंध है — इसीलिए हम इसकी जाँच न्यूरोपैथी से अलग करते हैं।',

    diabetesTitle: 'डायबिटीज़ का विवरण',
    diabetesSubtitle: 'प्रकार और निदान का वर्ष।',

    glucoseTitle: 'ग्लूकोज़ के संकेतक',
    glucoseSubtitle: 'HbA1c और ग्लूकोज़ मीटर की सबसे हाल की रीडिंग। दोनों वैकल्पिक हैं।',

    footHistoryTitle: 'पैरों का इतिहास',
    footHistorySubtitle: 'पहले के घाव, अंग कटना, या हाल की सर्जरी।',

    lifestyleTitle: 'सेहत और जीवनशैली',
    lifestyleSubtitle: 'पैरों का सुन्न होना, और जीवनशैली के कुछ सवाल।',

    sizingEyebrow: 'नाप',
    sizingTitle: 'आपके जूते का नाप',

    painEyebrow: 'लक्षण',
    painTitle: 'दर्द का आकलन',
    painSubtitle: 'मरीज़ से पूछें: अभी पैरों में कोई दर्द है?',

    captureEyebrow: 'तस्वीर',
    captureTitle: 'पैरों की जाँच शुरू करें',
    captureSubtitle:
      'चार रंगीन तस्वीरें लें या अपलोड करें: दोनों पैरों का ऊपरी हिस्सा और तलवा। जाँच से पहले कोई भी तस्वीर दोबारा ली जा सकती है।',

    perfusionEyebrow: 'वैकल्पिक',
    perfusionTitle: 'पैरों में रक्त संचार',
    perfusionSubtitle:
      'कैमरे से दोनों पैरों में रक्त प्रवाह की जाँच। छोड़ी जा सकती है — तस्वीरों वाली जाँच इस पर निर्भर नहीं है।',
    perfusionPulse: 'नाड़ी का संकेत',
    perfusionRefill: 'केशिका पुनर्भरण',

    leftFoot: 'बायाँ पैर',
    rightFoot: 'दायाँ पैर',

    nextStepsEyebrow: 'जाँच पूरी',
    nextStepsTitle: 'अपनी जाँच सहेजें',
    nextStepsSubtitle:
      'इसे अपने निजी इतिहास में रखें ताकि आप और आपकी देखभाल टीम समय के साथ बदलाव देख सकें।',

    productsEyebrow: 'उपचार के विकल्प',
    productsTitle: 'सहायक उत्पाद',

    timelineEyebrow: 'तस्वीरों का इतिहास',
    timelineTitle: 'आपके पैरों की जाँचें',
    timelineLoading: 'आपकी सहेजी हुई जाँचें लोड हो रही हैं…',
    timelineCount: '{count} सहेजी हुई जाँचें।',
    timelineCountOne: '1 सहेजी हुई जाँच।',
  },

  common: {
    yes: 'हाँ',
    no: 'नहीं',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    close: 'बंद करें',
    retry: 'दोबारा कोशिश करें',
    loading: 'लोड हो रहा है…',
    required: 'ज़रूरी',
    optional: 'वैकल्पिक',
    done: 'हो गया',
    somethingWentWrong: 'कुछ गड़बड़ हो गई।',
  },
};

export default hi;
