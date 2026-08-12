import type { Dictionary } from './en'

/** Indonesian (id). "Skrining" is the term Indonesian health material uses;
 *  "diagnosis" is avoided throughout, as in the English. */
const id: Dictionary = {
  meta: {
    title: 'SoleIQ — skrining kaki diabetik dibantu AI',
    description:
      'Skrining kaki diabetik dibantu AI dari empat foto berpanduan yang diambil dengan ponsel. Alat skrining dan pendukung keputusan, bukan alat diagnosis.',
  },

  a11y: { skipToContent: 'Lompat ke konten' },

  language: { label: 'Bahasa', change: 'Ganti bahasa', loading: 'Memuat…' },

  nav: {
    howItWorks: 'Cara kerjanya',
    research: 'Riset',
    about: 'Tentang',
    contact: 'Kontak',
    inPractice: 'Dalam praktik',
    app: 'Aplikasi',
    dashboard: 'Dasbor',
    openApp: 'Buka aplikasi SoleIQ',
    openDashboard: 'Buka dasbor SoleIQ Anda',
    backToTop: 'SoleIQ Health, kembali ke atas',
    openMenu: 'Buka menu',
    closeMenu: 'Tutup menu',
    primary: 'Utama',
    primaryMobile: 'Utama, ponsel',
    disclaimerShort: 'Skrining dan pendukung keputusan untuk kaki diabetik. Bukan alat diagnosis.',
  },

  hero: {
    slogan: 'Deteksi dini, perlindungan seumur hidup',
    body: 'Platform kesehatan masyarakat berbasis AI yang mengenali perburukan lebih awal, memperbaiki koordinasi perawatan, menjangkau populasi diabetes yang kurang terlayani, serta menekan amputasi yang bisa dicegah dan biaya kesehatan.',
    startScreening: 'Mulai skrining',
    openDashboard: 'Buka dasbor Anda',
    scrollCue: 'Lihat cara kerjanya',
  },

  features: {
    heading: 'Apa yang dilakukan SoleIQ',
    capture: {
      kicker: 'Pengambilan berpanduan',
      headline: 'Bagian sulitnya adalah mendapat foto yang layak pakai. Itu dikerjakan aplikasi.',
      body: 'Bingkai, kestabilan, dan pencahayaan diperiksa di perangkat sebelum apa pun diunggah. Jika satu dari empat tidak layak, Anda cukup mengulang yang itu saja.',
      label: 'Aplikasi',
      visualLabel:
        'Gambaran partikel pengambilan berpanduan: ponsel di atas kaki, dengan empat foto muncul di layarnya.',
    },
    report: {
      kicker: 'Laporan klinis',
      headline: 'Dokter Anda membuka rekam medis, bukan sebuah foto.',
      body: 'Temuan ditandai pada foto Anda sendiri, seluruh anamnesis di baliknya (riwayat, HbA1c, kondisi pembuluh darah, neuropati, peta nyeri), dan asisten yang terbatas pada satu pasien itu saja.',
      careTeam: 'Tim perawatan Anda',
      patientRecord: 'Rekam medis pasien',
      visualLabel:
        'Gambaran partikel laporan klinis: dasbor menerima rekam medis, dengan temuan ditandai pada foto pasien.',
    },
    timeline: {
      kicker: 'Linimasa bersama',
      headline: 'Satu skrining adalah satu titik. Rangkaiannya adalah arah.',
      body: 'Setiap pemeriksaan disimpan sebagai kumpulan foto dan tingkat bertanggal, sehingga perubahan yang terlalu lambat untuk disadari sehari-hari menjadi jelas saat disandingkan.',
      riskOverTime: 'Risiko sepanjang waktu',
      visualLabel:
        'Gambaran partikel linimasa bersama: skrining bertanggal di sepanjang sumbu, dengan penanda menyusuri kurva risiko yang menurun lalu kembali.',
    },
  },

  narrative: {
    problem: {
      kicker: 'Masalahnya',
      headline: 'Awalnya adalah sesuatu yang tidak bisa Anda rasakan.',
      body: 'Neuropati diabetik menghilangkan sinyal yang biasanya membuat Anda melihat kaki sendiri. Tekanan, lepuh, retakan pada kulit: tak satu pun terasa sakit, jadi tak ada yang mendorong untuk memeriksa. Ditemukan dini, ulkus kaki biasanya bisa ditangani. Ditemukan terlambat, sering kali tidak.',
    },
    capture: {
      kicker: 'Pengambilan',
      headline: 'Empat foto berpanduan. ≈4 menit.',
      body: 'Kedua kaki, punggung dan telapak, dengan ponsel yang sudah Anda miliki. Aplikasi mengatur bingkai tiap foto dan menjaga Anda tetap stabil. Tanpa aksesori, tanpa dudukan, tanpa janji temu.',
      app: 'Aplikasi',
    },
    analysis: {
      kicker: 'Analisis',
      headline: 'Diperiksa di ponsel Anda, lalu dibaca bersama riwayat Anda.',
      body: 'Pemeriksaan mutu dan penyeragaman cahaya berjalan di perangkat sebelum apa pun diunggah. Model penglihatan kemudian membaca keempat gambar bersama data anamnesis Anda (riwayat diabetes, HbA1c, jawaban PAD dan pembuluh darah, neuropati, riwayat kaki, peta nyeri), dan mengembalikan satu dari empat tingkat skrining.',
      aiAnalysis: 'Analisis AI',
      riskLevel: 'Tingkat risiko',
    },
    handover: {
      kicker: 'Serah terima',
      headline: 'Dokter Anda menerima rekam medis secara utuh.',
      body: 'Setiap isian anamnesis, temuan yang ditandai pada foto Anda sendiri, dan riwayat lengkap, dengan asisten yang terbatas pada rekam medis itu. Anda yang menentukan kepada siapa dikirim.',
      careTeam: 'Tim perawatan Anda',
      patientRecord: 'Rekam medis pasien',
    },
    overTime: {
      kicker: 'Seiring waktu',
      headline: 'Catatan yang terus bertambah, dan risiko yang bisa turun.',
      body: 'Setiap skrining disimpan sebagai kumpulan foto dan tingkat bertanggal. Perubahan yang terlalu lambat untuk disadari sehari-hari menjadi jelas di sepanjang linimasa — begitu pula arah yang ditujunya.',
      note: 'Ilustrasi. Bukan data pasien.',
      riskOverTime: 'Risiko sepanjang waktu',
    },
    close: {
      headline: 'SoleIQ',
      body: 'Skrining dan pendukung keputusan untuk kaki diabetik. Bukan alat diagnosis.',
    },
    loading: 'Menyiapkan rangkaian',
    loadingLong: 'Memuat rangkaian gulir SoleIQ.',
  },

  journeys: {
    eyebrow: 'Dalam praktik',
    heading: 'Kaki yang sama, dua keadaan, dan apa yang berubah bila pemeriksaan dilakukan di rumah.',
    lede: 'Inilah alur yang menjadi dasar rancangan SoleIQ. Alur ini menggambarkan bagaimana produk dipakai, bukan klaim tentang hasil.',
    chooseSetting: 'Pilih keadaan',
    withoutTitle: 'Tanpa SoleIQ',
    withTitle: 'Dengan SoleIQ',
    changesHeading: 'Apa yang benar-benar berubah',
    cadence: 'Keteraturan',
    rural: {
      label: 'Pedesaan',
      person:
        'Seorang petani dengan diabetes tipe 2 dan rasa yang berkurang di kedua kaki. Klinik kaki terdekat adalah sebuah perjalanan, bukan sekadar pergi.',
      without: [
        'Tekanan menumpuk di bawah telapak depan. Karena neuropati, tak ada yang terasa.',
        'Tak ada yang mendorong untuk melihat. Kaki bukan bagian dari rutinitas harian.',
        'Baru ketahuan saat kaus kaki melekat, atau saat orang lain menyadarinya.',
        'Pergi ke klinik berarti ongkos, biaya, dan sehari kerja yang hilang.',
        'Kunjungan terjadi setelah luka mustahil diabaikan.',
        'Perawatan dimulai justru di titik ketika merawat paling sulit.',
      ],
      with: [
        'Skrining di rumah: empat foto, diambil anggota keluarga bila perlu.',
        'Mutu foto diperiksa di ponsel sebelum apa pun diunggah.',
        'Tingkat skrining kembali dengan temuan yang ditandai pada foto.',
        'Rekam medis dikirim lebih dulu ke klinik atau ke petugas kesehatan keliling.',
        'Perjalanan ditempuh sekali, dengan sengaja, dengan riwayat sudah di tangan.',
        'Di antara kunjungan, linimasa terus mengawasi.',
      ],
      cadenceWithout: 'Diperiksa saat kebetulan ada yang melihat',
      cadenceWith: 'Diperiksa terjadwal, di rumah',
      visualLabel: 'Gambaran partikel sebuah rumah di antara pepohonan, dengan daun berguguran.',
    },
    urban: {
      label: 'Perkotaan',
      person:
        'Seorang pekerja komuter dengan diabetes tipe 2 dan kapalan yang terus kembali. Janji temu podiatri tersedia — pada akhirnya.',
      without: [
        'Kapalan menebal dan kulit di sekitarnya berubah warna. Mudah diabaikan.',
        'Membuat janji podiatri berarti masuk antrean.',
        'Janji temu tiba, atau dijadwal ulang, atau terlewat.',
        'Di ruang periksa, dokter melihat kaki hari ini dan tak ada yang sebelumnya.',
        'Nasihat diberikan; tindak lanjut bergantung pada ingatan akan tampilannya dulu.',
        'Perubahan berikutnya tak terukur sampai janji temu berikutnya.',
      ],
      with: [
        'Skrining di rumah memakan beberapa menit, sebelum berangkat kerja.',
        'Temuan ditandai pada foto milik pasien sendiri.',
        'Tingkatnya menyatakan apakah ini periksa ulang sepekan lagi atau buat janji sekarang.',
        'Kuota janji temu diberikan kepada mereka yang tingkatnya menunjukkan perlu.',
        'Dokter membuka rangkaian foto bertanggal, bukan lembar kosong.',
        'Tindak lanjut diukur terhadap gambar, bukan terhadap ingatan.',
      ],
      cadenceWithout: 'Diperiksa saat janji temu',
      cadenceWith: 'Diperiksa juga di antara janji temu',
      visualLabel:
        'Gambaran partikel siluet kota di bawah langit yang berpindah dari siang ke malam.',
    },
    comparison: [
      {
        q: 'Siapa yang menyadari lebih dulu',
        without: 'Siapa pun yang kebetulan melihat — dengan neuropati, sering kali tak ada.',
        with: 'Pemeriksaan rutin yang tidak bergantung pada bisa merasakannya.',
      },
      {
        q: 'Apa yang dilihat dokter',
        without: 'Kaki sebagaimana adanya hari ini.',
        with: 'Rangkaian bertanggal, sehingga arahnya terlihat.',
      },
      {
        q: 'Apa yang memicu kunjungan',
        without: 'Luka yang sudah kelihatan jelas.',
        with: 'Tingkat skrining, lengkap dengan alasannya.',
      },
      {
        q: 'Berapa biaya satu perjalanan',
        without: 'Sama saja, ternyata perlu atau tidak.',
        with: 'Sama saja, tapi ditempuh dengan alasan yang bisa ditunjuk.',
      },
    ],
  },

  progression: {
    eyebrow: 'Perkembangan',
    heading: 'Seluruh jalannya, dan bagian yang bisa dijangkau kamera.',
    lede: 'Ulkus kaki diabetik tidak datang tiba-tiba; ia berkembang. Pilih derajat mana pun untuk melihat apa yang benar tentang kaki pada titik itu, dan apa yang bisa serta tidak bisa dipastikan oleh sebuah foto.',
    gradesLabel: 'Derajat Wagner',
    grade: 'Derajat',
    gradesRange: 'Derajat {from}–{to}',
    whatPhotoShows: 'Apa yang ditunjukkan foto',
    whatSoleIQDoes: 'Apa yang dilakukan SoleIQ',
    trajectory: 'Perjalanan khas pada kemungkinan terburuk',
    play: 'Putar pemandu',
    pause: 'Jeda pemandu',
    windows: {
      soleiq: { title: 'Tempat SoleIQ bekerja', line: 'Menangkapnya sebelum kulit sempat terbuka.' },
      standard: {
        title: 'Tempat perawatan biasanya dimulai',
        line: 'Saat sudah nyeri atau berbau, kerusakannya sudah terjadi.',
      },
    },
    caveat:
      'Wagner menilai keparahan pada satu titik waktu; ini bukan urutan waktu yang tervalidasi. Rentang di atas menggambarkan perjalanan terburuk pada kaki yang tidak dirawat atau kendalinya buruk. Banyak orang datang sudah pada derajat 2 atau 3, dan dengan pengurangan tekanan, perfusi, serta pengendalian infeksi yang baik, sekitar 60 sampai 80 persen ulkus sembuh dalam 12 sampai 20 minggu tanpa pernah berkembang. Pada kaki iskemik, urutan yang sama bisa memampat menjadi hitungan hari. SoleIQ adalah alat bantu pemantauan dan triase, bukan alat diagnosis, dan tidak memberi derajat pada luka.',
    stages: [
      {
        name: 'Tanpa lesi terbuka',
        plain: 'Kulit utuh, kaki berisiko',
        what: 'Kulit belum terbuka. Mungkin ada kapalan, kelainan bentuk, atau titik tekan yang terbentuk di bawahnya — dan dengan neuropati, tak satu pun terasa.',
        camera:
          'Di sinilah foto paling berguna, karena tidak ada yang bisa dirasakan dan tidak ada yang sedang dicari siapa pun. Yang direkamnya adalah acuan: kapalan, warna, bentuk, dengan tanggal.',
        soleiq:
          'Inilah derajat yang menjadi alasan SoleIQ dibuat. Skrining rutin menetapkan seperti apa kaki ini biasanya, agar sebuah perubahan punya pembanding.',
        whenLabel: 'Acuan',
        whenDetail: 'kulit utuh, kaki berisiko',
        toNext: 'Peristiwa pemicu — hitungan hari sampai minggu',
      },
      {
        name: 'Ulkus dangkal',
        plain: 'Kulit sudah terbuka',
        what: 'Kehilangan kulit setebal penuh yang belum mencapai tendon, kapsul, atau tulang. Sering kali tidak nyeri, dan justru itulah sebabnya tidak dilaporkan.',
        camera:
          'Terlihat. Kulit yang terbuka, tepinya, dan kemerahan di sekelilingnya semuanya ciri permukaan, dan ciri permukaan itulah yang dibaca kamera dengan baik.',
        soleiq:
          'Skrining pada derajat ini mengembalikan tingkat yang menyatakan agar ini diperiksakan, dengan temuan ditandai pada foto milik pasien sendiri dan minggu-minggu sebelumnya di sampingnya.',
        whenLabel: 'Bulan 0',
        whenDetail: 'ulkus mulai, hitungan waktu berjalan',
        toNext: 'Sekitar 2 sampai 8 minggu',
      },
      {
        name: 'Ulkus dalam',
        plain: 'Sampai tendon atau tulang',
        what: 'Ulkus meluas sampai tendon, kapsul sendi, atau tulang, tanpa abses maupun osteomielitis.',
        camera:
          'Bukaannya terlihat; kedalamannya tidak. Tidak ada foto yang bisa memberi tahu seberapa dalam luka itu, dan pada derajat inilah batas tersebut mulai berarti.',
        soleiq:
          'Ditandai mendesak dan diserahkan bersama riwayatnya. Kedalaman adalah temuan penyondean yang dilakukan dokter — tugas aplikasi adalah memastikan ada yang memegang sondenya.',
        whenLabel: 'Bulan 0,5 sampai 2',
        whenDetail: 'sejak kulit pertama kali terbuka',
        toNext: 'Sekitar 1 sampai 3 bulan',
      },
      {
        name: 'Osteitis atau abses',
        plain: 'Infeksi sudah mencapai tulang',
        what: 'Infeksi dalam: abses, osteomielitis, atau tendinitis infeksius. Di sinilah pertanyaannya berubah dari menyembuhkan luka menjadi menyelamatkan kaki.',
        camera:
          'Di luar jangkauan kamera. Keterlibatan tulang ditetapkan lewat penyondean, pencitraan, dan pemeriksaan darah — bukan dengan melihat kulit.',
        soleiq:
          'Tak ada lagi yang menjadi urusan skrining di sini. Nilai yang bisa ditambahkan SoleIQ pada derajat ini sudah terpakai berbulan-bulan sebelumnya, pada derajat 0 dan 1.',
        whenLabel: 'Bulan 2 sampai 5',
        whenDetail: 'keterlibatan tulang, sonde mencapai tulang',
        toNext: 'Sekitar 1 sampai 3 bulan',
      },
      {
        name: 'Gangren sebagian',
        plain: 'Kematian jaringan, tungkai terancam',
        what: 'Gangren setempat — umumnya telapak depan atau jari kaki. Keputusan revaskularisasi dan pembedahan diambil di bawah tekanan waktu.',
        camera: 'Di luar jangkauan kamera, dan di luar skrining. Ini perawatan rawat inap.',
        soleiq:
          'Di luar cakupan. Dicantumkan di sini karena jalannya harus ditunjukkan utuh agar dipercaya.',
        whenLabel: 'Bulan 4 sampai 9',
        whenDetail: 'kematian jaringan, tungkai terancam',
        toNext: 'Hitungan hari sampai minggu',
      },
      {
        name: 'Gangren luas',
        plain: 'Seluruh kaki',
        what: 'Gangren seluruh kaki. Wilayah amputasi mayor.',
        camera: 'Di luar jangkauan kamera.',
        soleiq: 'Di luar cakupan — dan inilah akhir yang hendak dicegah oleh dua derajat pertama.',
        whenLabel: 'Bulan 6 sampai 18',
        whenDetail: 'wilayah amputasi mayor',
        toNext: null as string | null,
      },
    ],
  },

  research: {
    eyebrow: 'Riset',
    heading: 'Kerja di balik skrining, dan literatur tempatnya berpijak.',
    lede: 'Makalah kami sendiri ada di bawah. Di bawahnya, pencarian langsung atas literatur terbitan, dipisahkan dan ditandai jelas, agar keduanya tidak pernah tertukar.',
    advisors:
      'SoleIQ telah menerima masukan dari lebih dari 50 peneliti, dokter, dan ahli bedah yang bekerja di bidang kecerdasan buatan, teknik biomedis, dan kedokteran klinis di seluruh negeri.',
    searchHeading: 'Cari literatur',
    searchPlaceholder: 'diabetic foot ulcer, offloading, neuropathy screening',
    searchHint:
      'Cari sebuah topik, misalnya diabetic foot ulcer, offloading, atau neuropathy screening, dan catatan yang cocok akan muncul di sini.',
    searching: 'Mencari di Europe PMC',
    searchError: 'Ada yang salah saat menjalankan pencarian itu.',
    noResults: 'Tidak ada catatan yang cocok dengan “{query}”. Coba istilah yang lebih luas.',
    resultsFor: '{count} hasil untuk {query}',
    openAccess: 'Akses terbuka',
    readFullText: 'Baca teks lengkap',
    abstract: 'Abstrak',
    readFullAbstract: 'Baca abstrak lengkap',
    showLess: 'Tampilkan lebih sedikit',
    correspondingAuthor: 'Penulis korespondensi',
    topics: 'Topik',
    status: { published: 'Terbit', preprint: 'Pracetak' },
  },

  about: {
    eyebrow: 'Tentang',
    heading:
      'Sebagian besar ulkus kaki diabetik ditemukan terlambat. Bukan karena tersembunyi, melainkan karena tidak ada yang melihat.',
    paragraphs: [
      'Neuropati diabetik menghilangkan sinyal yang biasanya membuat seseorang melihat kakinya sendiri. Tekanan, lepuh, retakan pada kulit: tak satu pun terasa sakit, jadi tak ada yang mendorong untuk memeriksa. Saat kaki akhirnya diperiksa, pertanyaannya biasanya sudah bukan lagi “apakah ini sesuatu?” melainkan “berapa banyak dari ini yang masih bisa diselamatkan?”',
      'Pemeriksaan kaki secara klinis menjawab hal ini, dan itu bukan hambatan yang bisa kami perbaiki. Janji temu langka, perjalanan mahal, dan jeda antar kunjungan justru di situlah masalah berkembang.',
      'SoleIQ menutup jeda itu dengan apa yang sudah dimiliki setiap pasien: kamera ponsel dan beberapa menit. Empat foto, dibaca bersama riwayat yang menentukan risiko, menghasilkan tingkat skrining yang bisa ditindaklanjuti seseorang, dan catatan yang cukup dipercaya dokter untuk dijadikan dasar kerja.',
      'Kami berhati-hati dengan apa yang kami klaim. SoleIQ melakukan skrining; ia tidak mendiagnosis. Ia dibuat untuk membawa orang ke perawatan lebih awal dan dengan informasi lebih baik, bukan untuk menjauhkan mereka darinya.',
      'Batasan itulah yang membentuk produknya. Model tidak pernah melihat foto yang dinilai ponsel tidak layak pakai. Temuan ditampilkan pada gambar milik pasien sendiri, agar orang bisa melihat apa yang dilihat sistem. Setiap skrining tetap berada dalam linimasa, karena satu bingkai adalah sinyal yang lebih lemah daripada satu rangkaian. Dan catatan itu milik pasien, yang menentukan dokter mana yang melihatnya.',
    ],
    team: 'Tim',
    roles: { founder: 'Pendiri & CEO, SoleIQ Health' },
    bios: {
      eshaan:
        'Memimpin platform dari hulu ke hilir: model skrining, produknya, dan program riset di baliknya. Menerbitkan tulisan tentang pencegahan kaki diabetik berpanduan AI bersama Dr. David G. Armstrong.',
    },
    onLinkedIn: '{name} di LinkedIn',
  },

  blog: {
    eyebrow: 'Tulisan',
    heading: 'Catatan dari orang-orang yang membangunnya.',
    defaultCategory: 'Catatan',
    readingTime: 'baca {minutes} menit',
    minutesShort: '{minutes} mnt',
    readMore: 'Baca',
    closeArticle: 'Tutup artikel',
    originalLanguage: 'Artikel ditampilkan dalam bahasa saat ditulis.',
  },

  contact: {
    eyebrow: 'Kontak',
    heading: 'Hubungi kami.',
    body: 'Kemitraan klinis, kolaborasi riset, media, atau pertanyaan tentang produk. Ini sampai langsung kepada kami.',
    orEmail: 'Atau kirim surel ke',
    noMedicalDetails:
      'Mohon jangan mengirim data medis atau gambar lewat formulir ini. Ini bukan saluran klinis dan tidak dipantau untuk keadaan mendesak.',
    name: 'Nama',
    email: 'Surel',
    message: 'Pesan',
    send: 'Kirim pesan',
    sending: 'Mengirim…',
    sent: 'Pesan terkirim.',
    sentBody: 'Terima kasih. Kami akan membalas ke {email}.',
    sendAnother: 'Kirim lagi',
    errors: {
      name: 'Mohon beri tahu nama Anda.',
      email: 'Mohon tambahkan alamat surel.',
      emailInvalid: 'Alamat surel itu tampak keliru.',
      message: 'Mohon sertakan pesan.',
      failed: 'Pengiriman gagal. Silakan hubungi kami lewat surel.',
    },
  },

  footer: {
    heading: 'Kaki halaman',
    tagline: 'Skrining kaki diabetik dibantu AI dari empat foto berpanduan yang diambil dengan ponsel.',
    openApp: 'Buka aplikasi',
    dashboard: 'Dasbor',
    emailUs: 'Kirim surel',
    privacy: 'Privasi',
    terms: 'Ketentuan',
    nav: 'Kaki halaman',
    onNetwork: 'SoleIQ Health di {network}',
    disclaimer:
      'SoleIQ adalah alat skrining dan pendukung keputusan. Ia bukan alat diagnosis, tidak memberikan nasihat medis, dan tidak menggantikan penilaian tenaga kesehatan yang berkualifikasi. Jika Anda memiliki luka, infeksi, nyeri mendadak, atau perubahan warna maupun suhu pada kaki, segera cari pertolongan medis.',
    copyright: '© {year} SoleIQ Health',
  },

  screens: {
    leftFootSole: 'Kaki kiri, telapak',
    fitFootInFrame: 'Pas-kan kaki di dalam bingkai',
    photoQuality: 'Mutu foto',
    wholeFootInFrame: 'Seluruh kaki di dalam bingkai',
    sharpEnough: 'Cukup tajam untuk dianalisis',
    lightingNormalised: 'Pencahayaan diseragamkan',
    retakeTooDark: 'Ulangi kaki kanan, terlalu gelap',
    analysing: 'Menganalisis',
    inputs: 'Masukan',
    diabetesHistory: 'Riwayat diabetes',
    vascularAnswers: 'Jawaban pembuluh darah',
    neuropathy: 'Neuropati',
    painMap: 'Peta nyeri',
    screeningLevel: 'Tingkat skrining',
    watch: 'Pantau',
    resultBody:
      'Dua area yang perlu dipantau. Periksa ulang dalam 7 hari, dan buat janji temu bila salah satunya berubah.',
    shareRecord: 'Bagikan rekam medis Anda',
    podiatryClinic: 'Klinik podiatri Anda',
    fullHistory: 'Riwayat lengkap, setiap foto, setiap tingkat skrining.',
    sendRecord: 'Kirim rekam medis',
    clinicianView: 'Tampilan dokter',
    clinicalReport: 'Laporan klinis',
    photoComparison: 'Perbandingan foto',
    perPatientAssistant: 'Asisten per pasien',
    yourTimeline: 'Linimasa Anda',
    today: 'Hari ini',
    levels: { clear: 'Tanpa temuan', watch: 'Pantau', soon: 'Segera', urgent: 'Mendesak' },
  },
}

export default id
