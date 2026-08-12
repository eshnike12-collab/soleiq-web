import type { Dictionary } from './en'

/** Turkish (tr). "Tarama" for screening — the term Turkish diabetes guidance
 *  uses — and never "tanı", which this product does not claim. */
const tr: Dictionary = {
  meta: {
    title: 'SoleIQ — yapay zekâ destekli diyabetik ayak taraması',
    description:
      'Telefonla yönlendirmeli çekilen dört fotoğraftan yapay zekâ destekli diyabetik ayak taraması. Tarama ve karar desteği aracıdır, tanı cihazı değildir.',
  },

  a11y: { skipToContent: 'İçeriğe geç' },

  language: { label: 'Dil', change: 'Dili değiştir', loading: 'Yükleniyor…' },

  nav: {
    howItWorks: 'Nasıl çalışır',
    research: 'Araştırma',
    about: 'Hakkımızda',
    contact: 'İletişim',
    inPractice: 'Uygulamada',
    app: 'Uygulama',
    dashboard: 'Panel',
    openApp: 'SoleIQ uygulamasını aç',
    openDashboard: 'SoleIQ panelinizi açın',
    backToTop: 'SoleIQ Health, başa dön',
    openMenu: 'Menüyü aç',
    closeMenu: 'Menüyü kapat',
    primary: 'Ana gezinme',
    primaryMobile: 'Ana gezinme, mobil',
    disclaimerShort: 'Diyabetik ayak için tarama ve karar desteği. Tanı cihazı değildir.',
  },

  hero: {
    slogan: 'Erken tespit, ömür boyu koruma',
    body: 'Kötüleşmeyi daha erken fark eden, bakım eşgüdümünü iyileştiren, hizmete erişimi kısıtlı diyabetli nüfusa ulaşan ve önlenebilir ampütasyonlarla sağlık maliyetlerini azaltan, yapay zekâ destekli bir halk sağlığı platformu.',
    startScreening: 'Tarama başlat',
    openDashboard: 'Panelinizi açın',
    scrollCue: 'Nasıl çalıştığını görün',
  },

  features: {
    heading: 'SoleIQ ne yapar',
    capture: {
      kicker: 'Yönlendirmeli çekim',
      headline: 'Zor olan, kullanılabilir bir fotoğraf çekmek. Onu uygulama üstleniyor.',
      body: 'Çerçeveleme, sabitlik ve ışık, hiçbir şey yüklenmeden önce cihazda denetlenir. Dört fotoğraftan biri kullanılamazsa yalnızca onu yeniden çekersiniz.',
      label: 'Uygulama',
      visualLabel:
        'Yönlendirmeli çekimin parçacıklarla gösterimi: bir ayağın üzerinde tutulan telefon ve ekranına düşen dört fotoğraf.',
    },
    report: {
      kicker: 'Klinik rapor',
      headline: 'Hekiminiz bir fotoğraf değil, bir kayıt açar.',
      body: 'Kendi görüntüleriniz üzerinde işaretlenmiş bulgular, arkasındaki tüm anamnez (öykü, HbA1c, damar durumu, nöropati, ağrı haritası) ve yalnızca o tek hastayla sınırlı bir asistan.',
      careTeam: 'Bakım ekibiniz',
      patientRecord: 'Hasta kaydı',
      visualLabel:
        'Klinik raporun parçacıklarla gösterimi: kaydı alan bir panel ve hasta fotoğrafı üzerinde işaretlenmiş bulgular.',
    },
    timeline: {
      kicker: 'Ortak zaman çizelgesi',
      headline: 'Bir tarama bir veri noktasıdır. Bir dizi ise bir yöndür.',
      body: 'Her kontrol, tarihli bir fotoğraf ve düzey kümesi olarak saklanır; böylece günden güne fark edilemeyecek kadar yavaş bir değişim, yan yana konduğunda apaçık olur.',
      riskOverTime: 'Zaman içinde risk',
      visualLabel:
        'Ortak zaman çizelgesinin parçacıklarla gösterimi: bir eksen boyunca tarihli taramalar ve inen risk eğrisinde gidip gelen bir işaretçi.',
    },
  },

  narrative: {
    problem: {
      kicker: 'Sorun',
      headline: 'Hissedemediğiniz bir şeyle başlar.',
      body: 'Diyabetik nöropati, normalde ayağınıza bakmanızı sağlayacak sinyali ortadan kaldırır. Basınç, bir su toplaması, deride bir çatlak: hiçbiri acıtmaz, dolayısıyla hiçbiri kontrol etmeye yöneltmez. Erken bulunduğunda ayak ülseri genellikle yönetilebilir. Geç bulunduğunda çoğu zaman değildir.',
    },
    capture: {
      kicker: 'Çekim',
      headline: 'Yönlendirmeli dört fotoğraf. ≈4 dakika.',
      body: 'Her iki ayak, üstten ve tabandan, zaten sahip olduğunuz telefonla. Uygulama her kareyi çerçeveler ve çekim boyunca sizi sabit tutar. Aparat yok, sehpa yok, randevu yok.',
      app: 'Uygulama',
    },
    analysis: {
      kicker: 'Analiz',
      headline: 'Önce telefonunuzda denetlenir, sonra öykünüzle birlikte okunur.',
      body: 'Kalite denetimleri ve ışık normalleştirmesi, hiçbir şey yüklenmeden önce cihazda çalışır. Ardından bir görü modeli dört görüntüyü anamnezinizle (diyabet öyküsü, HbA1c, PAH ve damar yanıtları, nöropati, ayak öyküsü, ağrı haritası) birlikte okur ve dört tarama düzeyinden birini döndürür.',
      aiAnalysis: 'Yapay zekâ analizi',
      riskLevel: 'Risk düzeyi',
    },
    handover: {
      kicker: 'Devir',
      headline: 'Hekiminiz kaydın tamamını alır.',
      body: 'Anamnezin her alanı, kendi fotoğraflarınız üzerinde işaretlenmiş bulgular ve eksiksiz öykü — o kayıtla sınırlı bir asistanla birlikte. Kime gideceğine siz karar verirsiniz.',
      careTeam: 'Bakım ekibiniz',
      patientRecord: 'Hasta kaydı',
    },
    overTime: {
      kicker: 'Zaman içinde',
      headline: 'Biriken bir kayıt ve düşebilen bir risk.',
      body: 'Her tarama, tarihli bir fotoğraf ve düzey kümesi olarak saklanır. Günden güne fark edilemeyecek kadar yavaş bir değişim, bir zaman çizelgesinde belirginleşir; gittiği yön de öyle.',
      note: 'Örnekleme amaçlıdır. Hasta verisi değildir.',
      riskOverTime: 'Zaman içinde risk',
    },
    close: {
      headline: 'SoleIQ',
      body: 'Diyabetik ayak için tarama ve karar desteği. Tanı cihazı değildir.',
    },
    loading: 'Dizi hazırlanıyor',
    loadingLong: 'SoleIQ kaydırma dizisi yükleniyor.',
  },

  journeys: {
    eyebrow: 'Uygulamada',
    heading: 'Aynı ayaklar, iki ortam ve kontrol evde yapıldığında değişenler.',
    lede: 'Bunlar SoleIQ’nun etrafında tasarlandığı akışlardır. Ürünün nasıl kullanıldığını anlatırlar; sonuç iddiası değildirler.',
    chooseSetting: 'Bir ortam seçin',
    withoutTitle: 'SoleIQ olmadan',
    withTitle: 'SoleIQ ile',
    changesHeading: 'Asıl değişen ne',
    cadence: 'Sıklık',
    rural: {
      label: 'Kırsal',
      person:
        'Tip 2 diyabeti olan ve iki ayağında da his azalmış bir çiftçi. En yakın ayak polikliniği bir gidiş değil, bir yolculuktur.',
      without: [
        'Ön ayağın altında basınç birikir. Nöropati yüzünden hiçbir şey hissedilmez.',
        'Bakmayı gerektiren bir şey olmaz. Ayaklar günlük rutinin parçası değildir.',
        'Bir çorap yapıştığında ya da başka biri fark ettiğinde ortaya çıkar.',
        'Polikliniğe gitmek yol, masraf ve kaybedilen bir iş günü demektir.',
        'Ziyaret, yara görmezden gelinemez hâle geldikten sonra olur.',
        'Bakım, bakmanın en zor olduğu noktada başlar.',
      ],
      with: [
        'Evde tarama: dört fotoğraf, gerekirse bir aile ferdi çeker.',
        'Fotoğrafların kalitesi, hiçbir şey yüklenmeden önce telefonda denetlenir.',
        'Bulgular fotoğraflar üzerinde işaretli olarak bir tarama düzeyi döner.',
        'Kayıt, polikliniğe ya da gezici sağlık çalışanına önceden iletilir.',
        'Yolculuk bir kez, bilerek ve öykü elde hazırken yapılır.',
        'Ziyaretler arasında zaman çizelgesi izlemeyi sürdürür.',
      ],
      cadenceWithout: 'Biri denk gelip baktığında kontrol edilir',
      cadenceWith: 'Belirli aralıklarla, evde kontrol edilir',
      visualLabel: 'Ağaçlar arasındaki bir evin parçacıklarla gösterimi, havada düşen yapraklar.',
    },
    urban: {
      label: 'Kentsel',
      person:
        'Tip 2 diyabeti olan, her gün işe gidip gelen ve sürekli tekrarlayan bir nasırı olan biri. Ayak sağlığı randevusu bulunabiliyor — eninde sonunda.',
      without: [
        'Nasır kalınlaşır ve çevresindeki deri renk değiştirir. Geçiştirmesi kolaydır.',
        'Ayak sağlığı randevusu almak, bir sıraya girmek demektir.',
        'Randevu gelir, ya ertelenir ya da kaçırılır.',
        'Odada hekim bugünkü ayağı görür, öncesini değil.',
        'Öneri verilir; izlem, eskiden nasıl göründüğünü hatırlamaya kalır.',
        'Bir sonraki değişim, bir sonraki randevuya kadar ölçülmeden kalır.',
      ],
      with: [
        'Evde tarama birkaç dakika sürer, işe gitmeden önce.',
        'Bulgular hastanın kendi fotoğrafları üzerinde işaretlenir.',
        'Düzey, bunun bir hafta sonra yeniden kontrol mü yoksa hemen randevu mu olduğunu söyler.',
        'Randevu kontenjanları, düzeyi gerektiğini söyleyen kişilere gider.',
        'Hekim boş bir sayfa yerine tarihli bir fotoğraf dizisi açar.',
        'İzlem, hatıraya değil görüntülere göre ölçülür.',
      ],
      cadenceWithout: 'Randevularda kontrol edilir',
      cadenceWith: 'Randevular arasında da kontrol edilir',
      visualLabel:
        'Gündüzden geceye geçen bir gökyüzü altında kent siluetinin parçacıklarla gösterimi.',
    },
    comparison: [
      {
        q: 'İlk kim fark eder',
        without: 'Denk gelip bakan kişi; nöropatide bu çoğu zaman hiç kimsedir.',
        with: 'Hissedebilmeye bağlı olmayan rutin bir kontrol.',
      },
      {
        q: 'Hekim ne görür',
        without: 'Ayağı bugünkü hâliyle.',
        with: 'Tarihli bir dizi; böylece gidiş yönü görünür olur.',
      },
      {
        q: 'Ziyareti ne tetikler',
        without: 'Artık gözle görülür hâle gelmiş bir yara.',
        with: 'Bir tarama düzeyi ve yanında gerekçesi.',
      },
      {
        q: 'Bir yolculuk neye mal olur',
        without: 'Gerekli çıksa da çıkmasa da aynısına.',
        with: 'Aynısına, ama gösterebileceğiniz bir gerekçeyle yapılmış olarak.',
      },
    ],
  },

  progression: {
    eyebrow: 'İlerleme',
    heading: 'Yolun tamamı ve onun bir kameranın erişebildiği kısmı.',
    lede: 'Diyabetik ayak ülseri birden ortaya çıkmaz; ilerler. Herhangi bir evreyi seçerek o noktada ayak için neyin doğru olduğunu ve bir fotoğrafın orada neyi ortaya koyabilip neyi koyamayacağını görün.',
    gradesLabel: 'Wagner evreleri',
    grade: 'Evre',
    gradesRange: 'Evre {from}–{to}',
    whatPhotoShows: 'Fotoğrafın gösterdiği',
    whatSoleIQDoes: 'SoleIQ’nun yaptığı',
    trajectory: 'En kötü durumda tipik seyir',
    play: 'Anlatımı oynat',
    pause: 'Anlatımı duraklat',
    windows: {
      soleiq: { title: 'SoleIQ’nun işe yaradığı yer', line: 'Deri hiç açılmadan önce yakalayın.' },
      standard: {
        title: 'Bakımın genelde başladığı yer',
        line: 'Ağrıdığında ya da koktuğunda, hasar çoktan olmuştur.',
      },
    },
    caveat:
      'Wagner, şiddeti belirli bir andaki hâliyle derecelendirir; doğrulanmış bir zaman dizisi değildir. Yukarıdaki aralıklar, tedavi edilmemiş ya da kötü kontrollü bir ayakta en kötü durum seyrini anlatır. Birçok kişi zaten evre 2 veya 3’te başvurur ve iyi basınç azaltma, dolaşım ve enfeksiyon kontrolüyle ülserlerin yaklaşık yüzde 60 ila 80’i hiç ilerlemeden 12 ila 20 haftada iyileşir. İskemik bir ayakta aynı dizi günlere sıkışabilir. SoleIQ izlem ve önceliklendirme için bir yardımcıdır; tanı cihazı değildir ve yaraları derecelendirmez.',
    stages: [
      {
        name: 'Açık lezyon yok',
        plain: 'Deri bütün, ayak riskli',
        what: 'Deri açılmamış. Altında nasır, şekil bozukluğu ya da bir basınç noktası oluşuyor olabilir — ve nöropatiyle bunların hiçbiri hissedilmez.',
        camera:
          'Bir fotoğraf en çok burada işe yarar, çünkü hissedilecek bir şey yoktur ve kimse bir şey aramıyordur. Kaydettiği şey bir başlangıç ölçüsüdür: nasır, renk, biçim — tarihiyle.',
        soleiq:
          'SoleIQ tam da bu evre için yapıldı. Düzenli tarama, bu ayağın normalde nasıl göründüğünü belirler; böylece bir değişimin kıyaslanacağı bir şey olur.',
        whenLabel: 'Başlangıç ölçüsü',
        whenDetail: 'deri bütün, ayak riskli',
        toNext: 'Tetikleyici olay — günler ile haftalar',
      },
      {
        name: 'Yüzeyel ülser',
        plain: 'Deri açıldı',
        what: 'Tendona, kapsüle veya kemiğe ulaşmamış tam kat deri kaybı. Çoğu zaman ağrısızdır ve bildirilmemesinin nedeni tam olarak budur.',
        camera:
          'Görünür. Derideki açıklık, kenarları ve çevresindeki kızarıklık yüzey özellikleridir; yüzey özellikleri de bir kameranın iyi okuduğu şeydir.',
        soleiq:
          'Bu evredeki bir tarama, “bunu gösterin” diyen bir düzey döndürür; bulgu hastanın kendi fotoğrafı üzerinde işaretli, önceki haftalar da yanındadır.',
        whenLabel: 'Ay 0',
        whenDetail: 'ülserin başlangıcı, saat işlemeye başlar',
        toNext: 'Yaklaşık 2 ila 8 hafta',
      },
      {
        name: 'Derin ülser',
        plain: 'Tendona ya da kemiğe kadar',
        what: 'Ülser; apse veya osteomiyelit olmaksızın tendona, eklem kapsülüne ya da kemiğe uzanır.',
        camera:
          'Açıklık görünür, derinlik görünmez. Hiçbir fotoğraf bir yaranın nereye kadar gittiğini söyleyemez ve bu sınırın önem kazanmaya başladığı evre burasıdır.',
        soleiq:
          'Acil olarak işaretlenir ve öyküsüyle birlikte devredilir. Derinlik, bir hekimin sondayla saptadığı bir bulgudur; uygulamanın işi, sondayı tutan birinin olmasını sağlamaktır.',
        whenLabel: 'Ay 0,5 ila 2',
        whenDetail: 'derinin ilk açılmasından itibaren',
        toNext: 'Yaklaşık 1 ila 3 ay',
      },
      {
        name: 'Osteit ya da apse',
        plain: 'Enfeksiyon kemiğe ulaştı',
        what: 'Derin enfeksiyon: apse, osteomiyelit ya da enfeksiyöz tendinit. Soru burada yarayı iyileştirmekten ayağı kurtarmaya döner.',
        camera:
          'Bir kameranın ötesinde. Kemik tutulumu sonda, görüntüleme ve kan tetkikleriyle saptanır — deriye bakarak değil.',
        soleiq:
          'Burada artık hiçbir şey bir tarama meselesi değil. SoleIQ’nun bu evreye katabileceği değer aylar önce, evre 0 ve 1’de harcanmıştı.',
        whenLabel: 'Ay 2 ila 5',
        whenDetail: 'kemik tutulumu, sonda kemiğe değer',
        toNext: 'Yaklaşık 1 ila 3 ay',
      },
      {
        name: 'Kısmi kangren',
        plain: 'Doku ölümü, uzuv tehdidi',
        what: 'Sınırlı kangren — çoğunlukla ön ayak ya da parmaklar. Damar açma ve cerrahi kararları zaman baskısı altında verilir.',
        camera: 'Bir kameranın ve taramanın ötesinde. Bu, yatarak verilen bir bakımdır.',
        soleiq:
          'Kapsam dışı. Buraya konmasının nedeni, yolun inandırıcı olması için bütün hâlinde gösterilmesi gerektiğidir.',
        whenLabel: 'Ay 4 ila 9',
        whenDetail: 'doku ölümü, uzuv tehdidi',
        toNext: 'Günler ile haftalar',
      },
      {
        name: 'Yaygın kangren',
        plain: 'Ayağın tamamı',
        what: 'Ayağın tamamında kangren. Majör ampütasyon alanı.',
        camera: 'Bir kameranın ötesinde.',
        soleiq: 'Kapsam dışı — ve ilk iki evrenin önlemek için var olduğu sonuç.',
        whenLabel: 'Ay 6 ila 18',
        whenDetail: 'majör ampütasyon alanı',
        toNext: null as string | null,
      },
    ],
  },

  research: {
    eyebrow: 'Araştırma',
    heading: 'Taramanın arkasındaki çalışma ve içinde durduğu literatür.',
    lede: 'Kendi makalemiz aşağıda. Altında ise yayımlanmış literatürde canlı bir arama var; ikisi asla karışmasın diye ayrı tutulmuş ve açıkça etiketlenmiştir.',
    advisors:
      'SoleIQ, ülke genelinde yapay zekâ, biyomedikal mühendislik ve klinik tıp alanlarında çalışan 50’den fazla araştırmacı, hekim ve cerrahın danışmanlığından yararlandı.',
    searchHeading: 'Literatürde ara',
    searchPlaceholder: 'diabetic foot ulcer, offloading, neuropathy screening',
    searchHint:
      'Bir konu arayın — örneğin diabetic foot ulcer, offloading veya neuropathy screening — eşleşen kayıtlar burada görünecek.',
    searching: 'Europe PMC’de aranıyor',
    searchError: 'Bu arama çalıştırılırken bir sorun oldu.',
    noResults: '“{query}” ile eşleşen kayıt yok. Daha geniş bir terim deneyin.',
    resultsFor: '{query} için {count} sonuç',
    openAccess: 'Açık erişim',
    readFullText: 'Tam metni oku',
    abstract: 'Özet',
    readFullAbstract: 'Özetin tamamını oku',
    showLess: 'Daha az göster',
    correspondingAuthor: 'Sorumlu yazar',
    topics: 'Konular',
    status: { published: 'Yayımlandı', preprint: 'Ön baskı' },
  },

  about: {
    eyebrow: 'Hakkımızda',
    heading:
      'Diyabetik ayak ülserlerinin çoğu geç bulunur. Gizli oldukları için değil, kimse bakmadığı için.',
    paragraphs: [
      'Diyabetik nöropati, normalde bir kişinin kendi ayağına bakmasını sağlayacak sinyali ortadan kaldırır. Basınç, bir su toplaması, deride bir çatlak: hiçbiri acıtmaz, dolayısıyla hiçbiri kontrol etmeye yöneltmez. Ayak nihayet muayene edildiğinde soru genellikle “bu bir şey mi?” olmaktan çıkıp “bunun ne kadarı kurtarılabilir?” hâline gelmiştir.',
      'Klinik ayak muayenesi bunu çözer ve bu, bizim düzeltebileceğimiz darboğaz değildir. Randevu kıttır, yol pahalıdır ve ziyaretler arasındaki aralık tam da sorunun geliştiği yerdir.',
      'SoleIQ bu aralığı, her hastanın zaten sahip olduğu şeyle kapatır: bir telefon kamerası ve birkaç dakika. Riski belirleyen öyküyle birlikte okunan dört fotoğraf, kişinin harekete geçebileceği bir tarama düzeyi ve bir hekimin üzerinden çalışacak kadar güvenebileceği bir kayıt üretir.',
      'İddialarımız konusunda dikkatliyiz. SoleIQ tarama yapar; tanı koymaz. İnsanları bakımdan uzak tutmak için değil, bakıma daha erken ve daha iyi bilgiyle ulaştırmak için yapıldı.',
      'Bu kısıt ürünü biçimlendirir. Telefonun kullanılamaz saydığı bir fotoğrafı model asla görmez. Bulgular hastanın kendi görüntüleri üzerinde gösterilir; böylece kişi, sistemin ne gördüğünü görebilir. Her tarama bir zaman çizelgesinde kalır, çünkü tek bir kare bir diziden daha zayıf bir işarettir. Ve kayıt hastaya aittir; onu hangi hekimin göreceğine hasta karar verir.',
    ],
    team: 'Ekip',
    roles: { founder: 'Kurucu ve CEO, SoleIQ Health' },
    bios: {
      eshaan:
        'Platformu baştan sona yürütüyor: tarama modeli, ürün ve arkasındaki araştırma programı. Dr. David G. Armstrong ile birlikte diyabetik ayakta yapay zekâ güdümlü korunma üzerine yayın yaptı.',
    },
    onLinkedIn: 'LinkedIn’de {name}',
  },

  blog: {
    eyebrow: 'Yazılar',
    heading: 'Onu inşa edenlerin notları.',
    defaultCategory: 'Notlar',
    readingTime: '{minutes} dk okuma',
    minutesShort: '{minutes} dk',
    readMore: 'Oku',
    closeArticle: 'Yazıyı kapat',
    originalLanguage: 'Yazılar yazıldıkları dilde gösterilir.',
  },

  contact: {
    eyebrow: 'İletişim',
    heading: 'Bize yazın.',
    body: 'Klinik iş birlikleri, araştırma ortaklıkları, basın ya da ürünle ilgili bir soru. Bu doğrudan bize ulaşır.',
    orEmail: 'Ya da e-posta',
    noMedicalDetails:
      'Lütfen bu form üzerinden tıbbi bilgi veya görüntü göndermeyin. Burası klinik bir kanal değildir ve acil durumlar için izlenmez.',
    name: 'Ad',
    email: 'E-posta',
    message: 'Mesaj',
    send: 'Mesajı gönder',
    sending: 'Gönderiliyor…',
    sent: 'Mesaj gönderildi.',
    sentBody: 'Teşekkürler. {email} adresine yanıt vereceğiz.',
    sendAnother: 'Bir tane daha gönder',
    errors: {
      name: 'Lütfen adınızı yazın.',
      email: 'Lütfen bir e-posta adresi ekleyin.',
      emailInvalid: 'Bu e-posta adresi doğru görünmüyor.',
      message: 'Lütfen bir mesaj yazın.',
      failed: 'Gönderilemedi. Lütfen bize e-posta yazın.',
    },
  },

  footer: {
    heading: 'Site alt bilgisi',
    tagline: 'Telefonla yönlendirmeli çekilen dört fotoğraftan yapay zekâ destekli diyabetik ayak taraması.',
    openApp: 'Uygulamayı aç',
    dashboard: 'Panel',
    emailUs: 'Bize yazın',
    privacy: 'Gizlilik',
    terms: 'Koşullar',
    nav: 'Alt bilgi',
    onNetwork: '{network} üzerinde SoleIQ Health',
    disclaimer:
      'SoleIQ bir tarama ve karar desteği aracıdır. Tanı cihazı değildir, tıbbi tavsiye vermez ve nitelikli bir sağlık çalışanının değerlendirmesinin yerini tutmaz. Yaranız, enfeksiyonunuz, ani ağrınız ya da bir ayağınızın renginde veya sıcaklığında değişiklik varsa hemen tıbbi yardım alın.',
    copyright: '© {year} SoleIQ Health',
  },

  screens: {
    leftFootSole: 'Sol ayak, taban',
    fitFootInFrame: 'Ayağı çerçevenin içine yerleştirin',
    photoQuality: 'Fotoğraf kalitesi',
    wholeFootInFrame: 'Ayağın tamamı çerçevede',
    sharpEnough: 'Analiz için yeterince net',
    lightingNormalised: 'Işık normalleştirildi',
    retakeTooDark: 'Sağ ayağı yeniden çekin, çok karanlık',
    analysing: 'Analiz ediliyor',
    inputs: 'Girdiler',
    diabetesHistory: 'Diyabet öyküsü',
    vascularAnswers: 'Damar yanıtları',
    neuropathy: 'Nöropati',
    painMap: 'Ağrı haritası',
    screeningLevel: 'Tarama düzeyi',
    watch: 'İzle',
    resultBody:
      'İzlenmesi gereken iki bölge var. 7 gün sonra yeniden kontrol edin ve biri değişirse randevu alın.',
    shareRecord: 'Kaydınızı paylaşın',
    podiatryClinic: 'Ayak sağlığı kliniğiniz',
    fullHistory: 'Tam öykü, her fotoğraf, her tarama düzeyi.',
    sendRecord: 'Kaydı gönder',
    clinicianView: 'Hekim görünümü',
    clinicalReport: 'Klinik rapor',
    photoComparison: 'Fotoğraf karşılaştırması',
    perPatientAssistant: 'Hasta başına asistan',
    yourTimeline: 'Zaman çizelgeniz',
    today: 'Bugün',
    levels: { clear: 'Bulgu yok', watch: 'İzle', soon: 'Yakında', urgent: 'Acil' },
  },
}

export default tr
