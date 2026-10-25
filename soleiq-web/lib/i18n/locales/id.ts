import type { Dictionary } from './en';

/**
 * Indonesian (id).
 *
 * "Skrining" is the term Indonesian clinical guidance uses and is kept apart
 * from "diagnosis" throughout. The patient is addressed as Anda.
 */
const id: Dictionary = {
  brand: {
    name: 'SoleIQ',
    health: 'Health',
    slogan: 'Deteksi dini, perlindungan seumur hidup',
  },

  nav: {
    website: 'Situs web',
    websiteAria: 'Buka soleiqhealth.com',
    home: 'Beranda',
    dashboard: 'Dasbor saya',
    clinical: 'SoleIQ Klinis',
    signOut: 'Keluar',
    signedInAs: 'Masuk sebagai {email}',
    yourAccount: 'akun Anda',
    noMembership: 'belum terhubung ke rumah sakit',
    feedback: 'Masukan',
    adminConsole: 'Konsol admin',
    doctorDashboard: 'Dasbor pendamping',
    footHealth: 'Kesehatan kaki saya',
  },

  language: {
    label: 'Bahasa',
    change: 'Ganti bahasa',
    loading: 'Memuat bahasa…',
  },

  flow: {
    back: 'Kembali',
    backHint: 'Kembali (←)',
    continue: 'Lanjutkan',
    skip: 'Lewati',
    step: 'Langkah {current} dari {total}',
    encouragementStart: 'Mari mulai',
    encouragementUnderway: 'Anda sudah berjalan',
    encouragementGood: 'Kemajuan bagus',
    encouragementAlmost: 'Hampir selesai',
    encouragementDone: 'Selesai — bagus sekali!',
    disclaimer:
      'SoleIQ adalah alat pemantauan kesehatan dan bukan pengganti diagnosis medis profesional.',
  },

  welcome: {
    intro:
      'Skrining kaki diabetik berbantuan AI — dukungan keputusan klinis untuk layanan primer dan kunjungan podiatri.',
    start: 'Mulai kunjungan pasien',
    duration: 'Sekitar 4 menit per pasien. Untuk penggunaan klinis.',
  },

  auth: {
    welcome: 'Selamat datang',
    chooseSubtitle: 'Beri tahu kami siapa Anda agar kami menyiapkan tampilan yang tepat.',
    iAmPatient: 'Saya pasien',
    iAmPatientBody: 'Periksa kaki Anda dengan foto berpanduan dan simpan hasilnya di satu tempat.',
    iAmDoctor: 'Saya pendamping',
    iAmDoctorBody: 'Ikuti pemeriksaan kaki pasien Anda, lini masa foto, dan ringkasan AI.',
    sendingReset: 'Mengirim tautan…',
    resetSent: 'Jika ada akun untuk {email}, tautan penyetelan ulang sedang dikirim — periksa juga folder spam. Buka di perangkat ini; tautan kedaluwarsa dalam satu jam.',
    signIn: 'Masuk',
    createAccount: 'Buat akun',
    titlePatient: 'Masuk ke SoleIQ',
    titleDoctor: 'Masuk untuk pendamping',
    subtitlePatient:
      'Pemeriksaan kaki Anda tersimpan di akun, jadi akan tetap ada saat Anda kembali.',
    subtitleDoctor: 'Dasbor Anda menampilkan pasien yang ditugaskan kepada Anda.',
    email: 'Email',
    password: 'Kata sandi',
    showPassword: 'Tampilkan kata sandi',
    hidePassword: 'Sembunyikan kata sandi',
    passwordHint: 'Lebih dari 6 karakter, dengan setidaknya satu angka atau simbol.',
    passwordOk: 'Kata sandi memenuhi syarat.',
    forgot: 'Lupa kata sandi?',
    working: 'Memproses…',
    signedIn: 'Berhasil masuk',
    redirecting: 'Mengantar Anda ke dasbor…',
    resend: 'Kirim ulang email konfirmasi',
    resendSent: 'Email konfirmasi terkirim — periksa kotak masuk (dan spam) Anda.',
    accountCreated:
      'Akun dibuat — kami sudah mengirim email konfirmasi. Buka tautan di dalamnya, lalu masuk di sini.',
    emailConfirmed: 'Email terkonfirmasi — silakan masuk di bawah.',
    staffNote:
      'Akses pendamping dan administrator hanya berasal dari undangan rumah sakit yang akan kedaluwarsa. Pendamping baru tetap nonaktif sampai rumah sakit memverifikasinya.',
    patientNote:
      'Akun baru tidak memilih peran staf. Akses rumah sakit ditambahkan lewat undangan atau proses penautan rekam medis pasien.',
    errorEmailFirst: 'Masukkan email Anda dulu.',
    errorForgotEmailFirst:
      'Masukkan email Anda dulu, lalu ketuk "Lupa kata sandi?".',
    errorSignInFailed: 'Gagal masuk.',
    errorUnconfirmed:
      'Email Anda belum dikonfirmasi. Buka tautan konfirmasi yang kami kirim — atau kirim ulang di bawah.',
    errorStaffInviteOnly:
      'Akun staf dibuat dari undangan rumah sakit. Mintalah undangan kepada administrator rumah sakit Anda.',
    errorSendFailed:
      'Layanan email kami belum bisa mengirim pesan saat ini — coba lagi beberapa menit lagi.',
    errorRateLimited:
      'Terlalu banyak email diminta dalam waktu singkat. Tunggu sebentar lalu coba lagi.',
    errorRecoveryFailed: 'Permintaan pemulihan gagal.',
    errorResendFailed: 'Email tidak bisa dikirim ulang.',
  },

  reset: {
    title: 'Atur kata sandi baru',
    subtitle: 'Pilih kata sandi yang belum pernah Anda pakai di akun ini.',
    newPassword: 'Kata sandi baru',
    confirmPassword: 'Konfirmasi kata sandi baru',
    mismatch: 'Kedua kata sandi tidak sama.',
    submit: 'Perbarui kata sandi',
    submitting: 'Memperbarui…',
    done: 'Kata sandi diperbarui',
    doneBody: 'Sekarang Anda bisa masuk dengan kata sandi baru.',
    expired: 'Tautan ini sudah kedaluwarsa',
    expiredBody:
      'Tautan kata sandi hanya bisa dipakai sekali dan berhenti bekerja setelah satu jam. Minta yang baru dan akan tiba sebentar lagi.',
    requestNew: 'Kirim tautan baru',
    backToSignIn: 'Kembali ke halaman masuk',
    sameBrowser: 'Tautan ini harus dibuka di peramban yang sama dengan yang memintanya. Minta email baru lalu buka di perangkat ini.',
    openFromEmail: 'Buka tautan penyetelan ulang dari email Anda untuk membuat kata sandi baru, atau minta yang baru dari halaman masuk.',
    samePassword: 'Itu sudah menjadi kata sandi Anda saat ini — pilih yang lain.',
    checking: 'Memeriksa tautan Anda…',
  },

  screens: {
    consentEyebrow: 'Langkah 1',
    consentTitle: 'Persetujuan pasien',
    consentSubtitle:
      'Sebelum melanjutkan, pastikan bersama pasien bahwa mereka menyetujui setiap poin berikut.',

    returningEyebrow: 'Selamat datang kembali',
    returningTitle: 'Tinjau jawaban Anda',
    returningSubtitle:
      'Kami menyimpan semuanya dari pemeriksaan terakhir Anda. Perbarui yang berubah saja — sisanya ikut terbawa. Foto selalu diambil baru.',

    intakeEyebrow: 'Pendaftaran pasien',
    nameTitle: 'Nama pasien',
    nameSubtitle: 'Dan tempat tinggal pasien, untuk rekomendasi rujukan.',

    demographicsTitle: 'Data demografi pasien',
    demographicsSubtitle:
      'Digunakan untuk menyesuaikan prior populasi dan mengaudit keadilan model.',

    claim: {
      eyebrow:
        'Catatan Anda',
      title:
        'Ambil kendali atas catatan Anda',
      intro:
        'Seseorang membuat catatan kesehatan kaki SoleIQ untuk Anda dan telah mengelolanya atas nama Anda. Email undangan Anda menyebutkan siapa.',
      whatHappens:
        'Jika Anda mengambil kendali, catatan itu menjadi milik Anda. Anda melihat seluruh riwayat, termasuk yang dicatat sebelum hari ini, dan Anda menentukan siapa lagi yang boleh melihatnya.',
      canRemove:
        'Orang tersebut tetap berada di lingkar perawatan Anda agar bisa terus membantu — dan Anda dapat menghapusnya kapan saja dari Privasi dan akses. Keputusan itu sepenuhnya milik Anda.',
      signInPrompt:
        'Masuk dengan alamat email tempat undangan ini dikirim. Tautan hanya berfungsi untuk akun tersebut.',
      signInCta:
        'Masuk atau buat akun',
      claimCta:
        'Ambil kendali catatan saya',
      claiming:
        'Mengambil kendali…',
      successTitle:
        'Catatan ini kini milik Anda',
      successBody:
        'Semua isinya ada di aplikasi Anda, termasuk yang dicatat sebelum hari ini.',
      successCta:
        'Buka kesehatan kaki saya',
      expiredTitle:
        'Tautan ini sudah kedaluwarsa',
      expiredBody:
        'Tautan berhenti berfungsi setelah {days} hari. Anda dapat meminta yang baru.',
      usedTitle:
        'Tautan ini sudah dipakai',
      usedBody:
        'Jika catatan sudah milik Anda, cukup masuk. Jika tidak, mintalah tautan baru.',
      mismatchTitle:
        'Tautan ini untuk orang lain',
      mismatchBody:
        'Masuk dengan alamat tempat undangan dikirim. Jika Anda membantu seseorang, kirimkan tautannya kepada mereka — hanya mereka yang bisa mengambil kendali catatan mereka sendiri.',
      linkedTitle:
        'Akun Anda sudah memiliki catatan',
      linkedBody:
        'Akun ini sudah tertaut ke catatan pasien lain. Dua riwayat medis tidak pernah digabungkan otomatis — silakan hubungi tim perawatan Anda.',
      unknownTitle:
        'Itu tidak berhasil',
      unknownBody:
        'Tautan tidak dapat digunakan. Anda dapat meminta yang baru.',
      requestNewCta:
        'Minta tautan baru',
      requestNewSent:
        'Permintaan dicatat. Mintalah orang yang membuat catatan Anda untuk mengirim tautan baru.',
    },

    historyEyebrow: 'Riwayat kesehatan',
    conditionsTitle: 'Kondisi medis',
    conditionsSubtitle:
      'Pilih semua yang sesuai. Ketuk (?) untuk detail klinis setiap kondisi.',

    medications: {
      title: 'Obat-obatan',
      subtitle:
        'Beberapa obat mengubah cara kulit membiru, berdarah, dan menyembuh, sehingga mengetahuinya membantu kami membaca foto Anda dengan tepat.',
      newQuestion: 'Ini pertanyaan baru yang kini kami tanyakan kepada semua orang.',
      question: 'Apakah Anda sedang minum obat penting?',
      preferNotToSay: 'Memilih tidak menjawab',
      listTitle: 'Obat yang mana?',
      listHint: 'Tulis nama apa pun. Tidak harus sama dengan saran kami.',
      inputPlaceholder: 'Mulai menulis nama obat',
      suggestions: 'Saran',
      added: 'Ditambahkan',
      empty: 'Belum ada yang ditambahkan. Anda tetap bisa melanjutkan.',
      notesLabel: 'Hal lain yang perlu diketahui tim perawatan Anda',
      notesPlaceholder: 'Dosis, sudah berapa lama, perubahan terbaru',
      privacy: 'Hanya Anda dan tim perawatan Anda yang dapat melihat ini.',
      reviewNone: 'Tidak ada obat penting',
      reviewHidden: 'Memilih tidak menjawab',
      reviewUnanswered: 'Pertanyaan baru — mohon dijawab',
      reviewRequiredCta: 'Jawab satu pertanyaan baru, lalu ambil foto',
      categories: {
        anticoagulant: 'Pengencer darah',
        antiplatelet: 'Antiplatelet',
        corticosteroid: 'Steroid',
        immunosuppressant: 'Penekan kekebalan',
        chemotherapy: 'Kemoterapi',
        insulin: 'Insulin',
        oral_diabetes: 'Tablet diabetes',
        statin: 'Kolesterol (statin)',
        antihypertensive: 'Tekanan darah',
        antibiotic: 'Antibiotik',
        other: 'Lainnya',
      },
    },

    vascularEyebrow: 'Skrining pembuluh darah',
    vascularTitle: 'Penyakit arteri perifer',
    vascularSubtitle:
      'PAD berkaitan secara independen dengan penyembuhan luka yang lambat dan risiko amputasi — karena itu kami menskriningnya terpisah dari neuropati.',

    diabetesTitle: 'Rincian diabetes',
    diabetesSubtitle: 'Tipe dan tahun diagnosis.',

    glucoseTitle: 'Penanda glukosa',
    glucoseSubtitle:
      'HbA1c dan hasil terakhir dari alat ukur glukosa. Keduanya opsional.',

    footHistoryTitle: 'Riwayat kaki',
    footHistorySubtitle: 'Luka sebelumnya, amputasi, atau operasi baru-baru ini.',

    lifestyleTitle: 'Kesehatan & gaya hidup',
    lifestyleSubtitle: 'Kebas di kaki, ditambah beberapa pertanyaan gaya hidup.',

    sizingEyebrow: 'Ukuran',
    sizingTitle: 'Ukuran sepatu Anda',

    painEyebrow: 'Gejala',
    painTitle: 'Penilaian nyeri',
    painSubtitle: 'Tanyakan kepada pasien: apakah kaki terasa nyeri sekarang?',

    captureEyebrow: 'Pengambilan foto',
    captureTitle: 'Mulai pemeriksaan kaki',
    captureSubtitle:
      'Ambil atau unggah empat foto berwarna: punggung dan telapak masing-masing kaki. Foto mana pun bisa diulang sebelum pemeriksaan.',

    perfusionEyebrow: 'Opsional',
    perfusionTitle: 'Sirkulasi kaki',
    perfusionSubtitle:
      'Pemeriksaan aliran darah tiap kaki dengan kamera. Bisa dilewati — pemeriksaan lewat foto tidak bergantung padanya.',
    perfusionPulse: 'Sinyal denyut',
    perfusionRefill: 'Pengisian kapiler',

    leftFoot: 'Kaki kiri',
    rightFoot: 'Kaki kanan',

    nextStepsEyebrow: 'Pemeriksaan selesai',
    nextStepsTitle: 'Simpan pemeriksaan Anda',
    nextStepsSubtitle:
      'Simpan dalam riwayat pribadi Anda agar Anda dan tim perawatan bisa mengikuti perubahannya dari waktu ke waktu.',

    productsEyebrow: 'Pilihan terapi',
    productsTitle: 'Produk pendukung',

    timelineEyebrow: 'Riwayat foto',
    timelineTitle: 'Pemeriksaan kaki Anda',
    timelineLoading: 'Memuat pemeriksaan tersimpan…',
    timelineCount: '{count} pemeriksaan tersimpan.',
    timelineCountOne: '1 pemeriksaan tersimpan.',
  },

  common: {
    yes: 'Ya',
    no: 'Tidak',
    continue: 'Lanjutkan',
    add: 'Tambah',
    remove: 'Hapus',
    save: 'Simpan',
    cancel: 'Batal',
    close: 'Tutup',
    retry: 'Coba lagi',
    loading: 'Memuat…',
    required: 'Wajib',
    optional: 'Opsional',
    done: 'Selesai',
    somethingWentWrong: 'Ada yang tidak beres.',
  },
};

export default id;
