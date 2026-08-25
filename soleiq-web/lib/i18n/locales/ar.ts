import type { Dictionary } from './en';

/**
 * Arabic (ar) — Modern Standard, right to left.
 *
 * "الفحص" for screening, kept apart from "التشخيص" throughout, which is the
 * same line the English copy is careful not to cross. Placeholders such as
 * {email} are Latin script inside Arabic text; the browser's own bidi
 * algorithm places them, so nothing is wrapped in control characters here.
 */
const ar: Dictionary = {
  brand: {
    name: 'SoleIQ',
    health: 'Health',
    slogan: 'اكتشاف مبكر، حماية مدى الحياة',
  },

  nav: {
    website: 'الموقع',
    websiteAria: 'الانتقال إلى soleiqhealth.com',
    home: 'الرئيسية',
    dashboard: 'لوحتي',
    clinical: 'SoleIQ السريري',
    signOut: 'تسجيل الخروج',
    signedInAs: 'مسجّل الدخول باسم {email}',
    yourAccount: 'حسابك',
    noMembership: 'لا يوجد ارتباط بمستشفى',
    feedback: 'ملاحظات',
    adminConsole: 'وحدة تحكم المشرف',
    doctorDashboard: 'لوحة الطبيب',
    footHealth: 'صحة قدميّ',
  },

  language: {
    label: 'اللغة',
    change: 'تغيير اللغة',
    loading: 'جارٍ تحميل اللغة…',
  },

  flow: {
    back: 'رجوع',
    backHint: 'رجوع (←)',
    continue: 'متابعة',
    skip: 'تخطٍّ',
    step: 'الخطوة {current} من {total}',
    encouragementStart: 'لنبدأ',
    encouragementUnderway: 'أنت في الطريق',
    encouragementGood: 'تقدّم جيد',
    encouragementAlmost: 'أوشكت على الانتهاء',
    encouragementDone: 'تم كل شيء — أحسنت!',
    disclaimer:
      'SoleIQ أداة لمتابعة الصحة وليست بديلاً عن التشخيص الطبي المتخصص.',
  },

  welcome: {
    intro:
      'فحص القدم السكرية بمساعدة الذكاء الاصطناعي — دعم للقرار السريري في الرعاية الأولية وعيادات القدم.',
    start: 'بدء زيارة المريض',
    duration: 'نحو 4 دقائق لكل مريض. للاستخدام السريري.',
  },

  auth: {
    welcome: 'أهلاً بك',
    chooseSubtitle: 'أخبرنا من أنت لنهيّئ لك التجربة المناسبة.',
    iAmPatient: 'أنا مريض',
    iAmPatientBody: 'افحص قدميك بصور موجَّهة واحتفظ بنتائجك في مكان واحد.',
    iAmDoctor: 'أنا طبيب أو مقدّم رعاية',
    iAmDoctorBody: 'تابع فحوص أقدام مرضاك، وتسلسل صورهم الزمني، وملخصات الذكاء الاصطناعي.',
    sendingReset: 'جارٍ إرسال الرابط…',
    resetSent: 'إن كان هناك حساب لـ {email}، فرابط إعادة التعيين في طريقه إليك — تفقّد البريد غير المرغوب فيه أيضاً. افتحه على هذا الجهاز؛ تنتهي صلاحية الرابط خلال ساعة.',
    signIn: 'تسجيل الدخول',
    createAccount: 'إنشاء حساب',
    titlePatient: 'تسجيل الدخول إلى SoleIQ',
    titleDoctor: 'دخول الأطباء ومقدّمي الرعاية',
    subtitlePatient: 'تُحفظ فحوص قدميك في حسابك، فتجدها هنا في المرة القادمة.',
    subtitleDoctor: 'تعرض لوحتك المرضى المُسندين إليك.',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    passwordHint: 'أكثر من 6 أحرف، مع رقم أو رمز واحد على الأقل.',
    passwordOk: 'كلمة المرور تستوفي الشروط.',
    forgot: 'هل نسيت كلمة المرور؟',
    working: 'جارٍ التنفيذ…',
    signedIn: 'تم تسجيل الدخول بنجاح',
    redirecting: 'جارٍ نقلك إلى لوحتك…',
    resend: 'إعادة إرسال رسالة التأكيد',
    resendSent: 'أُرسلت رسالة التأكيد — تفقّد بريدك الوارد (والبريد غير المرغوب فيه).',
    accountCreated:
      'أُنشئ الحساب — أرسلنا رسالة تأكيد. افتح الرابط الموجود فيها ثم سجّل الدخول هنا.',
    emailConfirmed: 'تم تأكيد البريد — سجّل الدخول أدناه.',
    staffNote:
      'صلاحيات الأطباء والمشرفين تأتي فقط من دعوة مستشفى محدودة المدة. يبقى الأطباء الجدد غير مفعّلين حتى يتحقق المستشفى منهم.',
    patientNote:
      'الحسابات الجديدة لا تختار دوراً وظيفياً. تُضاف صلاحية المستشفى عبر دعوة أو عبر ربط سجل المريض.',
    errorEmailFirst: 'أدخل بريدك الإلكتروني أولاً.',
    errorForgotEmailFirst:
      'أدخل بريدك الإلكتروني أولاً، ثم اضغط «هل نسيت كلمة المرور؟».',
    errorSignInFailed: 'تعذّر تسجيل الدخول.',
    errorUnconfirmed:
      'لم يُؤكَّد بريدك بعد. افتح رابط التأكيد الذي أرسلناه، أو أعد إرساله من الأسفل.',
    errorStaffInviteOnly:
      'تُنشأ حسابات العاملين من دعوة مستشفى. اطلب دعوة من مشرف المستشفى لديك.',
    errorSendFailed:
      'لم تتمكن خدمة البريد لدينا من إرسال الرسالة الآن — أعد المحاولة بعد بضع دقائق.',
    errorRateLimited:
      'طُلب عدد كبير من الرسائل في وقت قصير. انتظر قليلاً ثم أعد المحاولة.',
    errorRecoveryFailed: 'فشل طلب الاستعادة.',
    errorResendFailed: 'تعذّرت إعادة إرسال الرسالة.',
  },

  reset: {
    title: 'تعيين كلمة مرور جديدة',
    subtitle: 'اختر كلمة مرور لم تستخدمها من قبل في هذا الحساب.',
    newPassword: 'كلمة المرور الجديدة',
    confirmPassword: 'تأكيد كلمة المرور الجديدة',
    mismatch: 'كلمتا المرور غير متطابقتين.',
    submit: 'تحديث كلمة المرور',
    submitting: 'جارٍ التحديث…',
    done: 'تم تحديث كلمة المرور',
    doneBody: 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.',
    expired: 'انتهت صلاحية هذا الرابط',
    expiredBody:
      'روابط كلمة المرور تُستخدم مرة واحدة فقط وتتوقف عن العمل بعد ساعة. اطلب رابطاً جديداً وسيصلك بعد لحظات.',
    requestNew: 'إرسال رابط جديد',
    backToSignIn: 'العودة إلى تسجيل الدخول',
    sameBrowser: 'يجب فتح هذا الرابط في المتصفح نفسه الذي طلبه. اطلب رسالة جديدة وافتحها على هذا الجهاز.',
    openFromEmail: 'افتح رابط إعادة التعيين من بريدك لتعيين كلمة مرور جديدة، أو اطلب رابطاً جديداً من صفحة تسجيل الدخول.',
    samePassword: 'هذه هي كلمة مرورك الحالية بالفعل — اختر كلمة أخرى.',
    checking: 'جارٍ التحقق من الرابط…',
  },

  screens: {
    consentEyebrow: 'الخطوة 1',
    consentTitle: 'موافقة المريض',
    consentSubtitle: 'تأكّد مع المريض من موافقته على كل بند مما يلي قبل المتابعة.',

    returningEyebrow: 'أهلاً بعودتك',
    returningTitle: 'راجع إجاباتك',
    returningSubtitle:
      'حفظنا كل شيء من فحصك السابق. حدّث ما تغيّر فقط، وسيُنقل الباقي كما هو. أما الصور فتُلتقط جديدة في كل مرة.',

    intakeEyebrow: 'استقبال المريض',
    nameTitle: 'اسم المريض',
    nameSubtitle: 'ومكان إقامة المريض، من أجل توصيات الإحالة.',

    demographicsTitle: 'بيانات المريض الديموغرافية',
    demographicsSubtitle:
      'تُستخدم لضبط الافتراضات السكانية ومراجعة إنصاف النموذج.',

    historyEyebrow: 'التاريخ الصحي',
    conditionsTitle: 'الحالات المرضية',
    conditionsSubtitle:
      'اختر كل ما ينطبق. اضغط (?) للاطلاع على التفاصيل السريرية لأي حالة.',

    vascularEyebrow: 'الفحص الوعائي',
    vascularTitle: 'مرض الشرايين الطرفية',
    vascularSubtitle:
      'يرتبط مرض الشرايين الطرفية ارتباطاً مستقلاً بتأخر التئام الجروح وخطر البتر، لذلك نفحصه بمعزل عن الاعتلال العصبي.',

    diabetesTitle: 'تفاصيل السكري',
    diabetesSubtitle: 'النوع وسنة التشخيص.',

    glucoseTitle: 'مؤشرات السكر',
    glucoseSubtitle: 'الهيموغلوبين السكري وآخر قراءة من جهاز قياس السكر. كلاهما اختياري.',

    footHistoryTitle: 'تاريخ القدم',
    footHistorySubtitle: 'قرح سابقة أو بتر أو عمليات جراحية حديثة.',

    lifestyleTitle: 'الصحة ونمط الحياة',
    lifestyleSubtitle: 'خدر في القدمين، مع سؤالين عن نمط الحياة.',

    sizingEyebrow: 'المقاس',
    sizingTitle: 'مقاس حذائك',

    painEyebrow: 'الأعراض',
    painTitle: 'تقييم الألم',
    painSubtitle: 'اسأل المريض: هل تشعر بأي ألم في قدميك الآن؟',

    captureEyebrow: 'التصوير',
    captureTitle: 'بدء فحص القدم',
    captureSubtitle:
      'التقط أو ارفع أربع صور ملوّنة: ظهر كل قدم وباطنها. يمكنك إعادة التقاط أي صورة قبل الفحص.',

    perfusionEyebrow: 'اختياري',
    perfusionTitle: 'الدورة الدموية في القدم',
    perfusionSubtitle:
      'فحوص بالكاميرا لتدفق الدم في كل قدم. يمكن تخطّيها — فحص الصور لا يعتمد عليها.',
    perfusionPulse: 'إشارة النبض',
    perfusionRefill: 'امتلاء الشعيرات الدموية',

    leftFoot: 'القدم اليسرى',
    rightFoot: 'القدم اليمنى',

    nextStepsEyebrow: 'اكتمل الفحص',
    nextStepsTitle: 'احفظ فحصك',
    nextStepsSubtitle:
      'احتفظ به في سجلك الخاص لتتمكن أنت وفريق الرعاية من متابعة التغيّرات مع الوقت.',

    productsEyebrow: 'خيارات العلاج',
    productsTitle: 'منتجات مساعدة',

    timelineEyebrow: 'سجل الصور',
    timelineTitle: 'فحوص قدميك',
    timelineLoading: 'جارٍ تحميل فحوصك المحفوظة…',
    timelineCount: '{count} فحوص محفوظة.',
    timelineCountOne: 'فحص محفوظ واحد.',
  },

  common: {
    yes: 'نعم',
    no: 'لا',
    save: 'حفظ',
    cancel: 'إلغاء',
    close: 'إغلاق',
    retry: 'إعادة المحاولة',
    loading: 'جارٍ التحميل…',
    required: 'مطلوب',
    optional: 'اختياري',
    done: 'تم',
    somethingWentWrong: 'حدث خطأ ما.',
  },
};

export default ar;
