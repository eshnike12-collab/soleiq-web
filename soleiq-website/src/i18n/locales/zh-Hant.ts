import type { Dictionary } from './en'

/**
 * Chinese, Traditional script (zh-Hant) — Mandarin, as written in Taiwan,
 * Hong Kong and Macau.
 *
 * Not a character-for-character conversion of the Simplified file. The
 * vocabulary follows Taiwanese medical usage where it differs: 篩檢 rather than
 * 筛查 for screening, 資料 rather than 数据, 應用程式 for the app. Getting the
 * characters right and the words wrong reads as a machine's work.
 */
const zhHant: Dictionary = {
  meta: {
    title: 'SoleIQ — AI 輔助糖尿病足篩檢',
    description:
      '透過四張手機引導拍攝的照片進行 AI 輔助糖尿病足篩檢。用於篩檢與決策支援，並非診斷器材。',
  },

  a11y: {
    skipToContent: '跳至內容',
  },

  language: {
    label: '語言',
    change: '切換語言',
    loading: '載入中…',
  },

  nav: {
    howItWorks: '運作方式',
    research: '研究',
    about: '關於我們',
    contact: '聯絡',
    inPractice: '實際場景',
    app: '應用程式',
    dashboard: '控制台',
    openApp: '開啟 SoleIQ 應用程式',
    openDashboard: '開啟你的 SoleIQ 控制台',
    backToTop: 'SoleIQ Health，回到頂端',
    openMenu: '開啟選單',
    closeMenu: '關閉選單',
    primary: '主要導覽',
    primaryMobile: '主要導覽，行動版',
    disclaimerShort: '針對糖尿病足的篩檢與決策支援。並非診斷器材。',
  },

  hero: {
    slogan: '及早發現，終身守護',
    body: '具備 AI 能力的公共衛生平台：更早發現病況惡化、改善照護協調、觸及醫療資源不足的糖尿病族群，並減少可避免的截肢與醫療支出。',
    startScreening: '開始篩檢',
    openDashboard: '開啟你的控制台',
    scrollCue: '看看它如何運作',
  },

  features: {
    heading: 'SoleIQ 做什麼',
    capture: {
      kicker: '引導式拍攝',
      headline: '困難的是拍出一張可用的照片。這一步交給應用程式。',
      body: '構圖、穩定度與光線都先在裝置上檢查，之後才會上傳。四張裡有一張不可用，你只需要重拍那一張。',
      label: '應用程式',
      visualLabel: '引導式拍攝的粒子呈現：手機舉在腳的上方，四張照片依序落在螢幕上。',
    },
    report: {
      kicker: '臨床報告',
      headline: '你的醫師打開的是一份病歷，不是一張照片。',
      body: '標註在你本人照片上的發現、其背後完整的問診資料（病史、HbA1c、血管狀況、神經病變、疼痛圖），以及一個僅限於這一位病人的助理。',
      careTeam: '你的照護團隊',
      patientRecord: '病人病歷',
      visualLabel: '臨床報告的粒子呈現：控制台接收病歷，發現標註在病人照片上。',
    },
    timeline: {
      kicker: '共享時間軸',
      headline: '一次篩檢是一個資料點。一系列篩檢是一個方向。',
      body: '每次檢查都依日期保存為一組照片與等級，因此日常察覺不到的緩慢變化，並排放在一起就一目了然。',
      riskOverTime: '風險隨時間變化',
      visualLabel:
        '共享時間軸的粒子呈現：依日期排列的篩檢沿軸分布，一個標記沿著下降的風險曲線來回移動。',
    },
  },

  narrative: {
    problem: {
      kicker: '問題所在',
      headline: '它一開始就是你感覺不到的東西。',
      body: '糖尿病神經病變抹去了那個原本會讓你低頭看腳的訊號。壓力、水泡、皮膚裂口：都不痛，所以都不會促使你檢查。發現得早，足部潰瘍通常可控；發現得晚，往往不是。',
    },
    capture: {
      kicker: '拍攝',
      headline: '四張引導拍攝的照片。約 4 分鐘。',
      body: '雙腳的足背與足底，用你已經有的手機完成。應用程式為每一張取景，並在拍攝過程中幫你保持穩定。不需要配件、腳架或預約。',
      app: '應用程式',
    },
    analysis: {
      kicker: '分析',
      headline: '先在手機上檢核，再對照你的病史來讀。',
      body: '品質檢查與光線正規化都在裝置上完成，之後才會上傳。接著由視覺模型把四張照片與你的問診資料（糖尿病病史、HbA1c、PAD 與血管相關回答、神經病變、足部病史、疼痛圖）一併讀取，回傳四個篩檢等級中的一個。',
      aiAnalysis: 'AI 分析',
      riskLevel: '風險等級',
    },
    handover: {
      kicker: '轉交',
      headline: '你的醫師收到的是完整病歷。',
      body: '每一項問診內容、標註在你本人照片上的發現，以及完整病史，並附有一個僅限於該病歷的助理。要送給誰，由你決定。',
      careTeam: '你的照護團隊',
      patientRecord: '病人病歷',
    },
    overTime: {
      kicker: '隨時間',
      headline: '一份不斷累積的紀錄，和一個可以降下來的風險。',
      body: '每次篩檢都依日期保存為一組照片與等級。日常察覺不到的緩慢變化，在時間軸上會變得明顯，它的走向也是。',
      note: '示意用途。並非病人資料。',
      riskOverTime: '風險隨時間變化',
    },
    close: {
      headline: 'SoleIQ',
      body: '針對糖尿病足的篩檢與決策支援。並非診斷器材。',
    },
    loading: '正在準備序列',
    loadingLong: '正在載入 SoleIQ 捲動序列。',
  },

  journeys: {
    eyebrow: '實際場景',
    heading: '同樣的雙腳，兩種場景，以及當檢查發生在家裡時會有什麼不同。',
    lede: '這些是 SoleIQ 所圍繞設計的路徑。它們描述的是產品如何被使用，並不是對結果的承諾。',
    chooseSetting: '選擇場景',
    withoutTitle: '沒有 SoleIQ',
    withTitle: '有了 SoleIQ',
    changesHeading: '真正改變的是什麼',
    cadence: '頻率',
    rural: {
      label: '鄉村',
      person: '一位罹患第 2 型糖尿病的農民，雙腳感覺減退。最近的足部門診是一趟遠行，不是順路。',
      without: [
        '前足下方壓力累積。因為神經病變，什麼都感覺不到。',
        '沒有什麼促使他去看一眼。腳不在每天的作息裡。',
        '直到襪子黏住，或別人先看見，才被發現。',
        '去門診意味著交通、花費，還有少賺一天工錢。',
        '真正就醫，是在傷口已經無法忽視之後。',
        '照護從最難照護的那個點開始。',
      ],
      with: [
        '在家完成篩檢：四張照片，必要時由家人代拍。',
        '照片先在手機上檢查品質，之後才上傳。',
        '篩檢等級回傳，發現已標註在照片上。',
        '病歷提前送到門診或到府的衛生人員手上。',
        '這趟路只走一次，是有準備地走，手上已經有病史。',
        '兩次就醫之間，時間軸仍在盯著。',
      ],
      cadenceWithout: '剛好有人看見時才被檢查',
      cadenceWith: '依固定節奏檢查，在家完成',
      visualLabel: '樹叢間一間小屋的粒子呈現，空中有飄落的葉子。',
    },
    urban: {
      label: '城市',
      person: '一位通勤的第 2 型糖尿病患者，繭反覆出現。足部門診約得到——總有那麼一天。',
      without: [
        '繭變厚，周圍皮膚變色。很容易被忽略過去。',
        '預約足部門診意味著排隊候診。',
        '預約到了，或被改期，或乾脆錯過。',
        '在診間裡，醫師看到的是今天這隻腳，先前的一概沒有。',
        '給了建議；追蹤取決於還記不記得當時的樣子。',
        '下一次變化一直沒有被測量，直到下一次就醫。',
      ],
      with: [
        '在家篩檢只要幾分鐘，上班之前就能做完。',
        '發現標註在病人本人的照片上。',
        '等級會說明這是一週後複查，還是現在就該約。',
        '門診名額留給那些等級顯示確實需要的人。',
        '醫師打開的是一組依日期排列的照片，而不是一張白紙。',
        '追蹤對照的是影像，而不是回憶。',
      ],
      cadenceWithout: '就醫時才被檢查',
      cadenceWith: '兩次就醫之間也在檢查',
      visualLabel: '城市天際線的粒子呈現，天空由白晝轉入夜晚。',
    },
    comparison: [
      {
        q: '誰最先發現',
        without: '剛好看到的人——在神經病變的情況下，常常沒有人。',
        with: '一次例行檢查，不倚賴能不能感覺到。',
      },
      {
        q: '醫師看到什麼',
        without: '今天這隻腳。',
        with: '一組帶日期的紀錄，走向因此看得見。',
      },
      {
        q: '什麼促成一次就醫',
        without: '一處已經明顯的傷口。',
        with: '一個篩檢等級，並附上原因。',
      },
      {
        q: '一趟路的代價',
        without: '一樣多，無論最後是否有必要。',
        with: '一樣多，但走得出理由。',
      },
    ],
  },

  progression: {
    eyebrow: '進展',
    heading: '完整的路徑，以及其中相機構得到的那一段。',
    lede: '糖尿病足潰瘍不是突然出現的，它是逐步進展的。選擇任一分級，看看那一刻腳上發生了什麼，以及照片在那裡能確定什麼、不能確定什麼。',
    gradesLabel: 'Wagner 分級',
    grade: '分級',
    gradesRange: '{from}–{to} 級',
    whatPhotoShows: '照片能看到什麼',
    whatSoleIQDoes: 'SoleIQ 做什麼',
    trajectory: '最壞情況下的典型進程',
    play: '播放導覽',
    pause: '暫停導覽',
    windows: {
      soleiq: {
        title: 'SoleIQ 發揮作用的階段',
        line: '在皮膚破損之前就發現它。',
      },
      standard: {
        title: '通常開始就醫的階段',
        line: '等到會痛或有異味，傷害已經造成。',
      },
    },
    caveat:
      'Wagner 分級衡量的是某一時點的嚴重程度，並不是經過驗證的時間序列。上面的區間描述的是未經治療或控制不佳的足部在最壞情況下的進程。許多人就醫時已經是第 2 級或第 3 級；在良好的減壓、血流灌注與感染控制下，約有 60% 到 80% 的潰瘍會在 12 到 20 週內癒合而不再進展。在缺血足上，同樣的進程可能壓縮到幾天。SoleIQ 是監測與檢傷分級的輔助工具，不是診斷器材，也不對傷口進行分級。',
    stages: [
      {
        name: '無開放性病灶',
        plain: '皮膚完整，屬高風險足',
        what: '皮膚未破。下方可能正在形成繭、變形或受壓點——而在神經病變的情況下，這些都感覺不到。',
        camera:
          '照片在這裡最有用，因為此時沒有什麼可感覺，也沒有人在找什麼。它記錄下來的是一個基準：繭、顏色、形狀，以及日期。',
        soleiq:
          'SoleIQ 正是為這一級而做。定期篩檢確立這隻腳平常是什麼樣子，之後的變化才有可以對照的基準。',
        whenLabel: '基準',
        whenDetail: '皮膚完整，屬高風險足',
        toNext: '觸發事件——數天到數週',
      },
      {
        name: '淺層潰瘍',
        plain: '皮膚已經破損',
        what: '全層皮膚缺損，尚未侵犯肌腱、關節囊或骨頭。往往不痛，而這正是它不被通報的原因。',
        camera:
          '看得見。皮膚的破口、邊緣及周圍的發紅都是表面特徵，而表面特徵正是相機讀得好的部分。',
        soleiq:
          '這一級的篩檢會回傳一個「請去看一下」的等級，發現標註在病人本人的照片上，前幾週的照片並列在旁。',
        whenLabel: '第 0 個月',
        whenDetail: '潰瘍起始，計時開始',
        toNext: '約 2 到 8 週',
      },
      {
        name: '深層潰瘍',
        plain: '深達肌腱或骨頭',
        what: '潰瘍延伸至肌腱、關節囊或骨頭，但無膿瘍或骨髓炎。',
        camera:
          '開口看得見，深度看不見。沒有照片能告訴你傷口有多深，而正是從這一級起，這個限制開始變得重要。',
        soleiq:
          '標記為緊急，並連同病史一併轉交。深度是探查所得，由醫師完成——應用程式的職責是確保有人拿著探針。',
        whenLabel: '第 0.5 到 2 個月',
        whenDetail: '自皮膚首次破損起算',
        toNext: '約 1 到 3 個月',
      },
      {
        name: '骨炎或膿瘍',
        plain: '感染已到達骨頭',
        what: '深部感染：膿瘍、骨髓炎或感染性肌腱炎。問題在這裡從「讓傷口癒合」變成「把腳保住」。',
        camera: '超出相機的範圍。骨頭受侵犯要靠探查、影像與血液檢查確定，不是靠看皮膚。',
        soleiq:
          '到這裡已經不再是篩檢問題。SoleIQ 本可以在這一級貢獻的價值，幾個月前在第 0 級和第 1 級就用掉了。',
        whenLabel: '第 2 到 5 個月',
        whenDetail: '骨頭受侵犯，探針可及骨',
        toNext: '約 1 到 3 個月',
      },
      {
        name: '局部壞疽',
        plain: '組織壞死，肢體受威脅',
        what: '局限性壞疽——常見於前足或腳趾。血流重建與手術決策正在時間壓力下做出。',
        camera: '超出相機，也超出篩檢。這是住院照護。',
        soleiq: '不在適用範圍內。列在這裡，是因為這條路徑要完整呈現才可信。',
        whenLabel: '第 4 到 9 個月',
        whenDetail: '組織壞死，肢體受威脅',
        toNext: '數天到數週',
      },
      {
        name: '廣泛壞疽',
        plain: '整隻腳',
        what: '整隻腳壞疽。屬於大截肢的範圍。',
        camera: '超出相機的範圍。',
        soleiq: '不在適用範圍內——而這正是前兩級存在所要避免的結局。',
        whenLabel: '第 6 到 18 個月',
        whenDetail: '大截肢的範圍',
        toNext: null as string | null,
      },
    ],
  },

  research: {
    eyebrow: '研究',
    heading: '篩檢背後的工作，以及它所處的文獻脈絡。',
    lede: '我們自己的論文在下方。再往下是對已發表文獻的即時檢索，兩者分開放置並明確標示，以免混淆。',
    advisors: 'SoleIQ 已獲得全國 50 多位從事人工智慧、生物醫學工程與臨床醫學的研究者、醫師與外科醫師的建議。',
    searchHeading: '檢索文獻',
    searchPlaceholder: 'diabetic foot ulcer, offloading, neuropathy screening',
    searchHint:
      '檢索一個主題，例如 diabetic foot ulcer、offloading 或 neuropathy screening，符合的文獻會出現在這裡。',
    searching: '正在檢索 Europe PMC',
    searchError: '執行該檢索時出錯了。',
    noResults: '沒有文獻符合「{query}」。試試更寬泛的詞。',
    resultsFor: '{query} 的 {count} 筆結果',
    openAccess: '開放取用',
    readFullText: '閱讀全文',
    abstract: '摘要',
    readFullAbstract: '閱讀完整摘要',
    showLess: '收合',
    correspondingAuthor: '通訊作者',
    topics: '主題',
    status: {
      published: '已發表',
      preprint: '預印本',
    },
  },

  about: {
    eyebrow: '關於我們',
    heading: '多數糖尿病足潰瘍都是被晚發現的。不是因為它藏得深，而是因為沒有人在看。',
    paragraphs: [
      '糖尿病神經病變抹去了那個原本會讓人低頭看腳的訊號。壓力、水泡、皮膚裂口：都不痛，所以都不會促使人去檢查。等到腳被檢查時，問題通常已經不再是「這算不算個事」，而是「這裡面還能保住多少」。',
      '臨床足部檢查能解決這個問題，但那不是我們能修的瓶頸。門診名額緊張，路途昂貴，而兩次就醫之間的間隔，恰恰就是問題發生的地方。',
      'SoleIQ 用每位病人已經擁有的東西來補上這個間隔：一支手機的相機，和幾分鐘時間。四張照片，與決定風險的病史一起讀取，得出一個人可以據此行動的篩檢等級，以及一份醫師信得過、可以據此工作的紀錄。',
      '我們對自己的說法很克制。SoleIQ 做篩檢，不做診斷。它的目的是讓人更早、帶著更好的資訊去就醫，而不是把人擋在就醫之外。',
      '這條約束形塑了產品。手機判定不可用的照片，模型從來不會看到。發現被呈現在病人本人的照片上，這樣人才看得見系統看到了什麼。每一次篩檢都留在時間軸裡，因為單一影像是比一系列更弱的訊號。而這份紀錄屬於病人，由病人決定讓哪位醫師看到。',
    ],
    team: '團隊',
    roles: {
      founder: '創辦人暨執行長，SoleIQ Health',
    },
    bios: {
      eshaan:
        '從頭到尾負責整個平台：篩檢模型、產品，以及背後的研究計畫。與 David G. Armstrong 醫師合作發表關於糖尿病足 AI 引導預防的研究。',
    },
    onLinkedIn: '{name} 的 LinkedIn',
  },

  blog: {
    eyebrow: '文字',
    heading: '來自正在建造它的人的札記。',
    defaultCategory: '札記',
    readingTime: '{minutes} 分鐘',
    minutesShort: '{minutes} 分鐘',
    readMore: '閱讀',
    closeArticle: '關閉文章',
    originalLanguage: '文章以其撰寫時使用的語言顯示。',
  },

  contact: {
    eyebrow: '聯絡',
    heading: '與我們聯絡。',
    body: '臨床合作、研究協作、媒體，或關於產品的問題。這會直接送達我們。',
    orEmail: '或寄信至',
    noMedicalDetails:
      '請不要透過此表單傳送醫療資訊或照片。這不是臨床管道，也不會針對緊急狀況進行監看。',
    name: '姓名',
    email: '電子郵件',
    message: '訊息',
    send: '送出訊息',
    sending: '傳送中…',
    sent: '訊息已送出。',
    sentBody: '謝謝。我們會回覆到 {email}。',
    sendAnother: '再送一則',
    errors: {
      name: '請告訴我們你的姓名。',
      email: '請填寫一個電子郵件地址。',
      emailInvalid: '這個電子郵件地址看起來不太對。',
      message: '請寫下你的訊息。',
      failed: '沒能送出。請改用電子郵件與我們聯絡。',
    },
  },

  footer: {
    heading: '頁尾',
    tagline: '透過四張手機引導拍攝的照片進行 AI 輔助糖尿病足篩檢。',
    openApp: '開啟應用程式',
    dashboard: '控制台',
    emailUs: '寄信給我們',
    privacy: '隱私',
    terms: '條款',
    nav: '頁尾',
    onNetwork: 'SoleIQ Health 的{network}',
    disclaimer:
      'SoleIQ 是一款篩檢與決策支援工具。它不是診斷器材，不提供醫療建議，也不能取代具備資格的醫師的評估。如果你有傷口、感染、突發疼痛，或某隻腳的顏色或溫度發生變化，請立即就醫。',
    copyright: '© {year} SoleIQ Health',
  },

  screens: {
    leftFootSole: '左腳，足底',
    fitFootInFrame: '把腳放進取景框內',
    photoQuality: '照片品質',
    wholeFootInFrame: '整隻腳在畫面內',
    sharpEnough: '清晰度足以分析',
    lightingNormalised: '光線已正規化',
    retakeTooDark: '右腳請重拍，太暗',
    analysing: '分析中',
    inputs: '輸入',
    diabetesHistory: '糖尿病病史',
    vascularAnswers: '血管相關回答',
    neuropathy: '神經病變',
    painMap: '疼痛圖',
    screeningLevel: '篩檢等級',
    watch: '觀察',
    resultBody: '有兩處需要留意。7 天後複查，任一處發生變化就去預約就醫。',
    shareRecord: '分享你的病歷',
    podiatryClinic: '你的足部門診',
    fullHistory: '完整病史、每一張照片、每一個篩檢等級。',
    sendRecord: '傳送病歷',
    clinicianView: '醫師檢視',
    clinicalReport: '臨床報告',
    photoComparison: '照片比對',
    perPatientAssistant: '依病人區分的助理',
    yourTimeline: '你的時間軸',
    today: '今天',
    levels: {
      clear: '無異常',
      watch: '觀察',
      soon: '盡快',
      urgent: '緊急',
    },
  },
}

export default zhHant
