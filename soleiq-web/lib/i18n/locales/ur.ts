import type { Dictionary } from './en';

/**
 * Urdu (ur) — right to left.
 *
 * Pakistani medical Urdu, which keeps a number of English clinical terms in
 * transliteration where the Urdu coinage would not be recognised in a clinic
 * (ذیابیطس, نیوروپیتھی). "اسکریننگ" is kept distinct from "تشخیص", the same
 * line the English copy holds.
 */
const ur: Dictionary = {
  brand: {
    name: 'SoleIQ',
    health: 'Health',
    slogan: 'بروقت تشخیصِ خطر، عمر بھر کا تحفظ',
  },

  nav: {
    website: 'ویب سائٹ',
    websiteAria: 'soleiqhealth.com پر جائیں',
    home: 'ہوم',
    dashboard: 'میرا ڈیش بورڈ',
    clinical: 'SoleIQ کلینیکل',
    signOut: 'سائن آؤٹ',
    signedInAs: '{email} کے طور پر سائن اِن ہیں',
    yourAccount: 'آپ کا اکاؤنٹ',
    noMembership: 'کسی ہسپتال سے منسلک نہیں',
    feedback: 'رائے',
    adminConsole: 'ایڈمن کنسول',
    doctorDashboard: 'ڈاکٹر ڈیش بورڈ',
    footHealth: 'میرے پاؤں کی صحت',
  },

  language: {
    label: 'زبان',
    change: 'زبان تبدیل کریں',
    loading: 'زبان لوڈ ہو رہی ہے…',
  },

  flow: {
    back: 'واپس',
    backHint: 'واپس (←)',
    continue: 'جاری رکھیں',
    skip: 'چھوڑ دیں',
    step: 'مرحلہ {current} از {total}',
    encouragementStart: 'آئیے شروع کرتے ہیں',
    encouragementUnderway: 'آپ آگے بڑھ رہے ہیں',
    encouragementGood: 'اچھی پیش رفت',
    encouragementAlmost: 'بس تھوڑا سا باقی',
    encouragementDone: 'سب مکمل — بہت خوب!',
    disclaimer:
      'SoleIQ صحت کی نگرانی کا ایک ذریعہ ہے اور یہ ماہر طبی تشخیص کا متبادل نہیں۔',
  },

  welcome: {
    intro:
      'مصنوعی ذہانت کی مدد سے ذیابیطسی پاؤں کی اسکریننگ — بنیادی نگہداشت اور پاؤں کے کلینک کے لیے طبی فیصلہ سازی میں معاونت۔',
    start: 'مریض کا معائنہ شروع کریں',
    duration: 'فی مریض تقریباً 4 منٹ۔ طبی استعمال کے لیے۔',
  },

  auth: {
    welcome: 'خوش آمدید',
    chooseSubtitle: 'ہمیں بتائیں کہ آپ کون ہیں تاکہ ہم درست تجربہ تیار کر سکیں۔',
    iAmPatient: 'میں مریض ہوں',
    iAmPatientBody: 'رہنمائی کے ساتھ تصویریں لے کر اپنے پاؤں کی جانچ کریں اور نتائج ایک ہی جگہ رکھیں۔',
    iAmDoctor: 'میں ڈاکٹر یا نگہداشت کنندہ ہوں',
    iAmDoctorBody: 'اپنے مریضوں کے پاؤں کی جانچ، تصویری ٹائم لائن اور اے آئی خلاصے دیکھتے رہیں۔',
    sendingReset: 'لنک بھیجا جا رہا ہے…',
    resetSent: 'اگر {email} کا کوئی اکاؤنٹ موجود ہے تو ری سیٹ لنک بھیجا جا رہا ہے — اسپَیم بھی دیکھیں۔ اسے اسی ڈیوائس پر کھولیں؛ لنک ایک گھنٹے میں ختم ہو جاتا ہے۔',
    signIn: 'سائن اِن',
    createAccount: 'اکاؤنٹ بنائیں',
    titlePatient: 'SoleIQ میں سائن اِن کریں',
    titleDoctor: 'ڈاکٹر / نگہداشت کنندہ سائن اِن',
    subtitlePatient:
      'آپ کے پاؤں کے معائنے آپ کے اکاؤنٹ میں محفوظ رہتے ہیں، اس لیے اگلی بار بھی یہیں ملیں گے۔',
    subtitleDoctor: 'آپ کے ڈیش بورڈ پر وہ مریض نظر آتے ہیں جو آپ کے سپرد ہیں۔',
    email: 'ای میل',
    password: 'پاس ورڈ',
    showPassword: 'پاس ورڈ دکھائیں',
    hidePassword: 'پاس ورڈ چھپائیں',
    passwordHint: '6 حروف سے زیادہ، اور کم از کم ایک ہندسہ یا علامت۔',
    passwordOk: 'پاس ورڈ شرائط پوری کرتا ہے۔',
    forgot: 'پاس ورڈ بھول گئے؟',
    working: 'کارروائی جاری ہے…',
    signedIn: 'کامیابی سے سائن اِن ہو گئے',
    redirecting: 'آپ کو ڈیش بورڈ پر لے جا رہے ہیں…',
    resend: 'تصدیقی ای میل دوبارہ بھیجیں',
    resendSent: 'تصدیقی ای میل بھیج دی گئی — اپنا اِن باکس (اور اسپَیم) دیکھیں۔',
    accountCreated:
      'اکاؤنٹ بن گیا — ہم نے تصدیقی ای میل بھیجی ہے۔ اُس میں دیا گیا لنک کھولیں، پھر یہاں سائن اِن کریں۔',
    emailConfirmed: 'ای میل کی تصدیق ہو گئی — نیچے سائن اِن کریں۔',
    staffNote:
      'ڈاکٹر اور ایڈمن کی رسائی صرف ہسپتال کی مدت محدود دعوت سے ملتی ہے۔ نئے ڈاکٹر اُس وقت تک غیر فعال رہتے ہیں جب تک ہسپتال تصدیق نہ کر لے۔',
    patientNote:
      'نئے اکاؤنٹ عملے کا کردار خود منتخب نہیں کرتے۔ ہسپتال کی رسائی دعوت یا مریض کے ریکارڈ سے منسلک کرنے کے عمل سے شامل ہوتی ہے۔',
    errorEmailFirst: 'پہلے اپنا ای میل درج کریں۔',
    errorForgotEmailFirst:
      'پہلے اپنا ای میل درج کریں، پھر «پاس ورڈ بھول گئے؟» پر ٹیپ کریں۔',
    errorSignInFailed: 'سائن اِن نہیں ہو سکا۔',
    errorUnconfirmed:
      'آپ کے ای میل کی تصدیق ابھی باقی ہے۔ ہمارا بھیجا ہوا تصدیقی لنک کھولیں، یا نیچے سے دوبارہ بھیجیں۔',
    errorStaffInviteOnly:
      'عملے کے اکاؤنٹ ہسپتال کی دعوت سے بنتے ہیں۔ اپنے ہسپتال کے ایڈمن سے دعوت طلب کریں۔',
    errorSendFailed:
      'ہماری ای میل سروس ابھی پیغام نہیں بھیج سکی — چند منٹ بعد دوبارہ کوشش کریں۔',
    errorRateLimited:
      'کم وقت میں بہت زیادہ ای میلز مانگی گئیں۔ تھوڑا انتظار کر کے دوبارہ کوشش کریں۔',
    errorRecoveryFailed: 'بحالی کی درخواست ناکام رہی۔',
    errorResendFailed: 'ای میل دوبارہ نہیں بھیجی جا سکی۔',
  },

  reset: {
    title: 'نیا پاس ورڈ مقرر کریں',
    subtitle: 'ایسا پاس ورڈ چنیں جو آپ نے اس اکاؤنٹ پر پہلے استعمال نہ کیا ہو۔',
    newPassword: 'نیا پاس ورڈ',
    confirmPassword: 'نئے پاس ورڈ کی تصدیق',
    mismatch: 'دونوں پاس ورڈ ایک جیسے نہیں ہیں۔',
    submit: 'پاس ورڈ اپ ڈیٹ کریں',
    submitting: 'اپ ڈیٹ ہو رہا ہے…',
    done: 'پاس ورڈ اپ ڈیٹ ہو گیا',
    doneBody: 'اب آپ اپنے نئے پاس ورڈ سے سائن اِن کر سکتے ہیں۔',
    expired: 'اس لنک کی میعاد ختم ہو چکی ہے',
    expiredBody:
      'پاس ورڈ کے لنک صرف ایک بار استعمال ہوتے ہیں اور ایک گھنٹے بعد کام کرنا چھوڑ دیتے ہیں۔ نیا لنک منگوائیں، وہ لمحوں میں پہنچ جائے گا۔',
    requestNew: 'نیا لنک بھیجیں',
    backToSignIn: 'سائن اِن پر واپس',
    sameBrowser: 'یہ لنک اُسی براؤزر میں کھولنا ضروری ہے جس سے مانگا گیا تھا۔ نئی ای میل منگوائیں اور اسی ڈیوائس پر کھولیں۔',
    openFromEmail: 'نیا پاس ورڈ مقرر کرنے کے لیے اپنی ای میل میں دیا گیا لنک کھولیں، یا سائن اِن صفحے سے نیا منگوائیں۔',
    samePassword: 'یہ تو پہلے ہی آپ کا موجودہ پاس ورڈ ہے — کوئی اور چنیں۔',
    checking: 'آپ کا لنک جانچا جا رہا ہے…',
  },

  screens: {
    consentEyebrow: 'مرحلہ 1',
    consentTitle: 'مریض کی رضامندی',
    consentSubtitle:
      'آگے بڑھنے سے پہلے مریض سے تصدیق کریں کہ وہ درج ذیل ہر نکتے سے متفق ہے۔',

    returningEyebrow: 'خوش آمدید، دوبارہ',
    returningTitle: 'اپنے جوابات دیکھ لیں',
    returningSubtitle:
      'ہم نے آپ کے پچھلے معائنے کی ہر بات محفوظ رکھی ہے۔ جو بدلا ہو صرف وہ اپ ڈیٹ کریں، باقی خودبخود آ جائے گا۔ تصویریں ہر بار نئی لی جاتی ہیں۔',

    intakeEyebrow: 'مریض کا اندراج',
    nameTitle: 'مریض کا نام',
    nameSubtitle: 'اور ریفرل کی تجاویز کے لیے مریض کی رہائش کا مقام۔',

    demographicsTitle: 'مریض کی آبادیاتی تفصیل',
    demographicsSubtitle:
      'آبادی کے مفروضے ذاتی نوعیت کے بنانے اور ماڈل کے انصاف کا جائزہ لینے کے لیے۔',

    historyEyebrow: 'صحت کی تاریخ',
    conditionsTitle: 'طبی کیفیات',
    conditionsSubtitle:
      'جو بھی لاگو ہوں سب منتخب کریں۔ کسی بھی کیفیت کی طبی تفصیل کے لیے (?) دبائیں۔',

    vascularEyebrow: 'شریانی اسکریننگ',
    vascularTitle: 'پیریفرل آرٹری ڈیزیز',
    vascularSubtitle:
      'PAD کا تعلق زخم بھرنے میں تاخیر اور عضو کٹنے کے خطرے سے آزادانہ طور پر ہے — اسی لیے ہم اسے نیوروپیتھی سے الگ جانچتے ہیں۔',

    diabetesTitle: 'ذیابیطس کی تفصیل',
    diabetesSubtitle: 'قسم اور تشخیص کا سال۔',

    glucoseTitle: 'شوگر کے اشاریے',
    glucoseSubtitle: 'HbA1c اور گلوکوز میٹر کی تازہ ترین ریڈنگ۔ دونوں اختیاری ہیں۔',

    footHistoryTitle: 'پاؤں کی تاریخ',
    footHistorySubtitle: 'پہلے کے زخم، عضو کٹنا، یا حالیہ سرجری۔',

    lifestyleTitle: 'صحت اور طرزِ زندگی',
    lifestyleSubtitle: 'پاؤں کا سُن ہونا، اور طرزِ زندگی کے چند سوالات۔',

    sizingEyebrow: 'ناپ',
    sizingTitle: 'آپ کے جوتے کا سائز',

    painEyebrow: 'علامات',
    painTitle: 'درد کی جانچ',
    painSubtitle: 'مریض سے پوچھیں: کیا اس وقت پاؤں میں کوئی درد ہے؟',

    captureEyebrow: 'تصویر کشی',
    captureTitle: 'پاؤں کا معائنہ شروع کریں',
    captureSubtitle:
      'چار رنگین تصویریں لیں یا اپ لوڈ کریں: ہر پاؤں کا اوپری حصہ اور تلوا۔ جانچ سے پہلے کوئی بھی تصویر دوبارہ لی جا سکتی ہے۔',

    perfusionEyebrow: 'اختیاری',
    perfusionTitle: 'پاؤں میں خون کی روانی',
    perfusionSubtitle:
      'کیمرے سے ہر پاؤں میں خون کے بہاؤ کی جانچ۔ چھوڑی جا سکتی ہے — تصویری معائنہ اس پر منحصر نہیں۔',
    perfusionPulse: 'نبض کا اشارہ',
    perfusionRefill: 'کیپلری ری فِل',

    leftFoot: 'بایاں پاؤں',
    rightFoot: 'دایاں پاؤں',

    nextStepsEyebrow: 'جانچ مکمل',
    nextStepsTitle: 'اپنی جانچ محفوظ کریں',
    nextStepsSubtitle:
      'اسے اپنی نجی تاریخ میں رکھیں تاکہ آپ اور آپ کی نگہداشت ٹیم وقت کے ساتھ تبدیلیاں دیکھ سکیں۔',

    productsEyebrow: 'علاج کے اختیارات',
    productsTitle: 'معاون مصنوعات',

    timelineEyebrow: 'تصویری ریکارڈ',
    timelineTitle: 'آپ کے پاؤں کے معائنے',
    timelineLoading: 'آپ کے محفوظ معائنے لوڈ ہو رہے ہیں…',
    timelineCount: '{count} محفوظ معائنے۔',
    timelineCountOne: '1 محفوظ معائنہ۔',
  },

  common: {
    yes: 'ہاں',
    no: 'نہیں',
    save: 'محفوظ کریں',
    cancel: 'منسوخ',
    close: 'بند کریں',
    retry: 'دوبارہ کوشش کریں',
    loading: 'لوڈ ہو رہا ہے…',
    required: 'لازمی',
    optional: 'اختیاری',
    done: 'مکمل',
    somethingWentWrong: 'کچھ گڑبڑ ہو گئی۔',
  },
};

export default ur;
