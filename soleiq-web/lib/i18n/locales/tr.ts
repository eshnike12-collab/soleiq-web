import type { Dictionary } from './en';

/**
 * Turkish (tr).
 *
 * "Tarama" for screening, kept apart from "tanı" throughout. The patient is
 * addressed with the plural/polite second person.
 */
const tr: Dictionary = {
  brand: {
    name: 'SoleIQ',
    health: 'Health',
    slogan: 'Erken fark edin, ömür boyu koruyun',
  },

  nav: {
    website: 'Web sitesi',
    websiteAria: "soleiqhealth.com'a git",
    home: 'Ana sayfa',
    dashboard: 'Panelim',
    clinical: 'SoleIQ Klinik',
    signOut: 'Çıkış yap',
    signedInAs: '{email} olarak giriş yapıldı',
    yourAccount: 'hesabınız',
    noMembership: 'hastane bağlantısı yok',
    feedback: 'Geri bildirim',
    adminConsole: 'Yönetici konsolu',
    doctorDashboard: 'Hekim paneli',
    footHealth: 'Ayak sağlığım',
  },

  language: {
    label: 'Dil',
    change: 'Dili değiştir',
    loading: 'Dil yükleniyor…',
  },

  flow: {
    back: 'Geri',
    backHint: 'Geri (←)',
    continue: 'Devam',
    skip: 'Atla',
    step: 'Adım {current} / {total}',
    encouragementStart: 'Hadi başlayalım',
    encouragementUnderway: 'Yola çıktınız',
    encouragementGood: 'Güzel ilerliyor',
    encouragementAlmost: 'Neredeyse bitti',
    encouragementDone: 'Hepsi tamam — çok iyi!',
    disclaimer:
      'SoleIQ bir sağlık izleme aracıdır ve uzman tıbbi tanının yerini tutmaz.',
  },

  welcome: {
    intro:
      'Yapay zekâ destekli diyabetik ayak taraması — birinci basamak ve podiyatri muayeneleri için klinik karar desteği.',
    start: 'Hasta muayenesini başlat',
    duration: 'Hasta başına yaklaşık 4 dakika. Klinik kullanım içindir.',
  },

  auth: {
    welcome: 'Hoş geldiniz',
    chooseSubtitle: 'Doğru deneyimi hazırlayabilmemiz için kim olduğunuzu söyleyin.',
    iAmPatient: 'Ben hastayım',
    iAmPatientBody: 'Yönlendirmeli fotoğraflarla ayaklarınızı kontrol edin, sonuçlarınızı tek yerde tutun.',
    iAmDoctor: 'Ben hekim ya da bakım verenim',
    iAmDoctorBody: 'Hastalarınızın ayak kontrollerini, fotoğraf zaman çizelgelerini ve yapay zekâ özetlerini izleyin.',
    sendingReset: 'Bağlantı gönderiliyor…',
    resetSent: '{email} için bir hesap varsa sıfırlama bağlantısı yolda — gereksiz klasörüne de bakın. Bu cihazda açın; bağlantı bir saatte geçerliliğini yitirir.',
    signIn: 'Giriş yap',
    createAccount: 'Hesap oluştur',
    titlePatient: "SoleIQ'ya giriş yapın",
    titleDoctor: 'Hekim / bakım veren girişi',
    subtitlePatient:
      'Ayak kontrolleriniz hesabınıza kaydedilir, bir sonraki gelişinizde de burada olur.',
    subtitleDoctor: 'Panelinizde size atanan hastalar görünür.',
    email: 'E-posta',
    password: 'Parola',
    showPassword: 'Parolayı göster',
    hidePassword: 'Parolayı gizle',
    passwordHint: '6 karakterden uzun, en az bir rakam veya sembol içermeli.',
    passwordOk: 'Parola koşulları karşılıyor.',
    forgot: 'Parolanızı mı unuttunuz?',
    working: 'İşleniyor…',
    signedIn: 'Giriş başarılı',
    redirecting: 'Panelinize götürüyoruz…',
    resend: 'Doğrulama e-postasını yeniden gönder',
    resendSent:
      'Doğrulama e-postası gönderildi — gelen kutunuza (ve gereksiz klasörüne) bakın.',
    accountCreated:
      'Hesap oluşturuldu — bir doğrulama e-postası gönderdik. İçindeki bağlantıyı açın, sonra buradan giriş yapın.',
    emailConfirmed: 'E-posta doğrulandı — aşağıdan giriş yapın.',
    staffNote:
      'Hekim ve yönetici erişimi yalnızca süresi dolan bir hastane davetiyle verilir. Yeni hekimler hastane doğrulayana kadar pasif kalır.',
    patientNote:
      'Yeni hesaplar personel rolü seçmez. Hastane erişimi davetle ya da hasta kaydı eşleştirmesiyle eklenir.',
    errorEmailFirst: 'Önce e-posta adresinizi girin.',
    errorForgotEmailFirst:
      'Önce e-posta adresinizi girin, sonra "Parolanızı mı unuttunuz?" seçeneğine dokunun.',
    errorSignInFailed: 'Giriş yapılamadı.',
    errorUnconfirmed:
      'E-postanız henüz doğrulanmadı. Gönderdiğimiz doğrulama bağlantısını açın ya da aşağıdan yeniden gönderin.',
    errorStaffInviteOnly:
      'Personel hesapları hastane davetiyle oluşturulur. Hastane yöneticinizden davet isteyin.',
    errorSendFailed:
      'E-posta servisimiz şu anda iletiyi gönderemedi — birkaç dakika sonra tekrar deneyin.',
    errorRateLimited:
      'Kısa sürede çok fazla e-posta istendi. Biraz bekleyip tekrar deneyin.',
    errorRecoveryFailed: 'Kurtarma isteği başarısız oldu.',
    errorResendFailed: 'E-posta yeniden gönderilemedi.',
  },

  reset: {
    title: 'Yeni bir parola belirleyin',
    subtitle: 'Bu hesapta daha önce kullanmadığınız bir parola seçin.',
    newPassword: 'Yeni parola',
    confirmPassword: 'Yeni parolayı doğrulayın',
    mismatch: 'İki parola birbiriyle eşleşmiyor.',
    submit: 'Parolayı güncelle',
    submitting: 'Güncelleniyor…',
    done: 'Parola güncellendi',
    doneBody: 'Artık yeni parolanızla giriş yapabilirsiniz.',
    expired: 'Bu bağlantının süresi doldu',
    expiredBody:
      'Parola bağlantıları yalnızca bir kez kullanılabilir ve bir saat sonra çalışmaz. Yenisini isteyin, hemen ulaşır.',
    requestNew: 'Yeni bağlantı gönder',
    backToSignIn: 'Girişe dön',
    sameBrowser: 'Bu bağlantı, onu isteyen tarayıcıda açılmalıdır. Yeni bir e-posta isteyin ve bu cihazda açın.',
    openFromEmail: 'Yeni parola belirlemek için e-postanızdaki sıfırlama bağlantısını açın ya da giriş sayfasından yenisini isteyin.',
    samePassword: 'Bu zaten şu anki parolanız — başka bir tane seçin.',
    checking: 'Bağlantınız denetleniyor…',
  },

  screens: {
    consentEyebrow: 'Adım 1',
    consentTitle: 'Hasta onamı',
    consentSubtitle:
      'Devam etmeden önce hastayla birlikte aşağıdaki her maddeyi kabul ettiğini doğrulayın.',

    returningEyebrow: 'Tekrar hoş geldiniz',
    returningTitle: 'Yanıtlarınızı gözden geçirin',
    returningSubtitle:
      'Son kontrolünüzdeki her şeyi sakladık. Yalnızca değişenleri güncelleyin — gerisi olduğu gibi aktarılır. Fotoğraflar her seferinde yeniden çekilir.',

    intakeEyebrow: 'Hasta kabulü',
    nameTitle: 'Hastanın adı',
    nameSubtitle: 'Ve sevk önerileri için hastanın yaşadığı yer.',

    demographicsTitle: 'Hasta demografisi',
    demographicsSubtitle:
      'Popülasyon önsellerini kişiselleştirmek ve modelin adilliğini denetlemek için kullanılır.',

    historyEyebrow: 'Sağlık geçmişi',
    conditionsTitle: 'Tıbbi durumlar',
    conditionsSubtitle:
      'Geçerli olan her şeyi seçin. Herhangi bir durumun klinik ayrıntısı için (?) simgesine dokunun.',

    vascularEyebrow: 'Damar taraması',
    vascularTitle: 'Periferik arter hastalığı',
    vascularSubtitle:
      'PAH, yara iyileşmesinin gecikmesi ve ampütasyon riskiyle bağımsız olarak ilişkilidir — bu yüzden nöropatiden ayrı tararız.',

    diabetesTitle: 'Diyabet ayrıntıları',
    diabetesSubtitle: 'Tür ve tanı yılı.',

    glucoseTitle: 'Glukoz göstergeleri',
    glucoseSubtitle: 'HbA1c ve en son şeker ölçüm değeri. İkisi de isteğe bağlı.',

    footHistoryTitle: 'Ayak geçmişi',
    footHistorySubtitle: 'Önceki ülserler, ampütasyonlar ya da yakın zamanlı ameliyatlar.',

    lifestyleTitle: 'Sağlık ve yaşam biçimi',
    lifestyleSubtitle: 'Ayaklarda uyuşma ve yaşam biçimine dair birkaç soru.',

    sizingEyebrow: 'Numara',
    sizingTitle: 'Ayakkabı numaranız',

    painEyebrow: 'Belirtiler',
    painTitle: 'Ağrı değerlendirmesi',
    painSubtitle: 'Hastaya sorun: şu anda ayaklarında ağrı var mı?',

    captureEyebrow: 'Çekim',
    captureTitle: 'Ayak muayenesine başla',
    captureSubtitle:
      'Dört renkli fotoğraf çekin ya da yükleyin: her ayağın sırtı ve tabanı. Kontrolden önce her fotoğrafı yeniden çekebilirsiniz.',

    perfusionEyebrow: 'İsteğe bağlı',
    perfusionTitle: 'Ayak dolaşımı',
    perfusionSubtitle:
      'Her ayaktaki kan akışının kamerayla kontrolü. Atlanabilir — fotoğrafla muayene buna bağlı değildir.',
    perfusionPulse: 'Nabız sinyali',
    perfusionRefill: 'Kapiller dolum',

    leftFoot: 'Sol ayak',
    rightFoot: 'Sağ ayak',

    nextStepsEyebrow: 'Kontrol tamamlandı',
    nextStepsTitle: 'Kontrolünüzü kaydedin',
    nextStepsSubtitle:
      'Kişisel geçmişinizde saklayın ki siz ve bakım ekibiniz zaman içindeki değişimi izleyebilesiniz.',

    productsEyebrow: 'Tedavi seçenekleri',
    productsTitle: 'Destekleyici ürünler',

    timelineEyebrow: 'Fotoğraf geçmişi',
    timelineTitle: 'Ayak kontrolleriniz',
    timelineLoading: 'Kayıtlı kontrolleriniz yükleniyor…',
    timelineCount: '{count} kayıtlı kontrol.',
    timelineCountOne: '1 kayıtlı kontrol.',
  },

  common: {
    yes: 'Evet',
    no: 'Hayır',
    save: 'Kaydet',
    cancel: 'Vazgeç',
    close: 'Kapat',
    retry: 'Yeniden dene',
    loading: 'Yükleniyor…',
    required: 'Zorunlu',
    optional: 'İsteğe bağlı',
    done: 'Bitti',
    somethingWentWrong: 'Bir şeyler ters gitti.',
  },
};

export default tr;
