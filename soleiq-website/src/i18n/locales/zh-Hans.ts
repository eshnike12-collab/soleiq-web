import type { Dictionary } from './en'

/**
 * Chinese, Simplified script (zh-Hans) — Mandarin, as written in mainland
 * China and Singapore.
 *
 * "筛查" throughout for screening, which is the word Chinese diabetes guidance
 * uses and which does not imply 诊断. Grades and abbreviations that appear in
 * English in Chinese clinical writing (Wagner, HbA1c, PAD) are left in English.
 */
const zhHans: Dictionary = {
  meta: {
    title: 'SoleIQ — AI 辅助糖尿病足筛查',
    description:
      '通过四张手机引导拍摄的照片进行 AI 辅助糖尿病足筛查。用于筛查与决策支持，并非诊断设备。',
  },

  a11y: {
    skipToContent: '跳至内容',
  },

  language: {
    label: '语言',
    change: '切换语言',
    loading: '加载中…',
  },

  nav: {
    howItWorks: '工作方式',
    research: '研究',
    about: '关于我们',
    contact: '联系',
    inPractice: '实际场景',
    app: '应用',
    dashboard: '控制台',
    openApp: '打开 SoleIQ 应用',
    openDashboard: '打开你的 SoleIQ 控制台',
    backToTop: 'SoleIQ Health，返回顶部',
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
    primary: '主导航',
    primaryMobile: '主导航，移动端',
    disclaimerShort: '面向糖尿病足的筛查与决策支持。并非诊断设备。',
  },

  hero: {
    slogan: '早期发现，终身守护',
    body: '具备 AI 能力的公共卫生平台：更早发现病情恶化，改善诊疗协同，触达医疗资源不足的糖尿病人群，减少本可避免的截肢与医疗支出。',
    startScreening: '开始筛查',
    openDashboard: '打开你的控制台',
    scrollCue: '看看它如何运作',
  },

  features: {
    heading: 'SoleIQ 做什么',
    capture: {
      kicker: '引导式拍摄',
      headline: '难的是拍出一张可用的照片。这一步交给应用。',
      body: '构图、稳定度和光线都在设备上完成检查，之后才会上传。四张里有一张不可用，你只需要重拍那一张。',
      label: '应用',
      visualLabel: '引导式拍摄的粒子呈现：手机举在脚的上方，四张照片依次落在屏幕上。',
    },
    report: {
      kicker: '临床报告',
      headline: '你的医生打开的是一份病历，不是一张照片。',
      body: '标注在你本人照片上的发现、其背后完整的问诊信息（病史、HbA1c、血管情况、神经病变、疼痛图），以及一个仅限于这一位患者的助手。',
      careTeam: '你的诊疗团队',
      patientRecord: '患者病历',
      visualLabel: '临床报告的粒子呈现：控制台接收病历，发现被标注在患者照片上。',
    },
    timeline: {
      kicker: '共享时间线',
      headline: '一次筛查是一个数据点。一组筛查是一个方向。',
      body: '每次检查都按日期保存为一组照片和等级，因此日常察觉不到的缓慢变化，并排放在一起就一目了然。',
      riskOverTime: '风险随时间变化',
      visualLabel:
        '共享时间线的粒子呈现：按日期排列的筛查沿轴分布，一个标记沿下降的风险曲线来回移动。',
    },
  },

  narrative: {
    problem: {
      kicker: '问题所在',
      headline: '它一开始就是你感觉不到的东西。',
      body: '糖尿病神经病变抹去了那个原本会让你低头看脚的信号。压力、水疱、皮肤裂口：都不疼，所以都不会促使你检查。发现得早，足部溃疡通常可控；发现得晚，往往不是。',
    },
    capture: {
      kicker: '拍摄',
      headline: '四张引导拍摄的照片。约 4 分钟。',
      body: '双脚的足背与足底，用你已有的手机完成。应用为每一张取景，并在拍摄过程中帮你保持稳定。不需要配件、支架或预约。',
      app: '应用',
    },
    analysis: {
      kicker: '分析',
      headline: '先在手机上核验，再结合你的病史来读。',
      body: '质量检查与光线归一化都在设备上完成，之后才会上传。随后由视觉模型把四张照片与你的问诊信息（糖尿病病史、HbA1c、PAD 与血管相关回答、神经病变、足部病史、疼痛图）一并读取，返回四个筛查等级中的一个。',
      aiAnalysis: 'AI 分析',
      riskLevel: '风险等级',
    },
    handover: {
      kicker: '转交',
      headline: '你的医生收到的是完整病历。',
      body: '每一项问诊内容、标注在你本人照片上的发现，以及完整病史，并配有一个仅限于该病历的助手。发给谁，由你决定。',
      careTeam: '你的诊疗团队',
      patientRecord: '患者病历',
    },
    overTime: {
      kicker: '随时间',
      headline: '一份不断累积的记录，和一个可以降下来的风险。',
      body: '每次筛查都按日期保存为一组照片和等级。日常察觉不到的缓慢变化，在时间线上会变得明显，它的走向也是。',
      note: '示意用途。并非患者数据。',
      riskOverTime: '风险随时间变化',
    },
    close: {
      headline: 'SoleIQ',
      body: '面向糖尿病足的筛查与决策支持。并非诊断设备。',
    },
    loading: '正在准备序列',
    loadingLong: '正在加载 SoleIQ 滚动序列。',
  },

  journeys: {
    eyebrow: '实际场景',
    heading: '同样的双脚，两种场景，以及当检查发生在家里时会有什么不同。',
    lede: '这些是 SoleIQ 所围绕设计的路径。它们描述的是产品如何被使用，并不是对结果的承诺。',
    chooseSetting: '选择场景',
    withoutTitle: '没有 SoleIQ',
    withTitle: '有了 SoleIQ',
    changesHeading: '真正改变的是什么',
    cadence: '频率',
    rural: {
      label: '乡村',
      person: '一位患 2 型糖尿病的农民，双脚感觉减退。最近的足病门诊是一趟远行，不是顺路。',
      without: [
        '前足下方压力累积。因为神经病变，什么都感觉不到。',
        '没有什么促使他去看一眼。脚不在每天的日程里。',
        '直到袜子粘住，或别人先看见，才被发现。',
        '去门诊意味着交通、花费，还有少挣一天工。',
        '真正就诊，是在伤口已经无法忽视之后。',
        '治疗从最难治疗的那个点开始。',
      ],
      with: [
        '在家完成筛查：四张照片，必要时由家人代拍。',
        '照片先在手机上检查质量，之后才上传。',
        '筛查等级返回，发现已标注在照片上。',
        '病历提前发给门诊或上门的健康工作者。',
        '这趟路只走一次，是有准备地走，手里已经有病史。',
        '两次就诊之间，时间线仍在盯着。',
      ],
      cadenceWithout: '碰巧有人看见时才被检查',
      cadenceWith: '按固定节奏检查，在家完成',
      visualLabel: '树丛间一座小屋的粒子呈现，空中有飘落的叶子。',
    },
    urban: {
      label: '城市',
      person: '一位通勤的 2 型糖尿病患者，胼胝反复出现。足病门诊约得上——总有那么一天。',
      without: [
        '胼胝变厚，周围皮肤变色。很容易被忽略过去。',
        '预约足病门诊意味着排队等号。',
        '预约到了，或被改期，或干脆错过。',
        '在诊室里，医生看到的是今天这只脚，此前的一概没有。',
        '给了建议；随访取决于还记不记得当时的样子。',
        '下一次变化一直没有被测量，直到下一次就诊。',
      ],
      with: [
        '在家筛查只要几分钟，上班之前就能做完。',
        '发现被标注在患者本人的照片上。',
        '等级会说明这是一周后复查，还是现在就该约。',
        '号源留给那些等级显示确实需要的人。',
        '医生打开的是一组按日期排列的照片，而不是一张白纸。',
        '随访对照的是影像，而不是回忆。',
      ],
      cadenceWithout: '就诊时才被检查',
      cadenceWith: '两次就诊之间也在检查',
      visualLabel: '城市天际线的粒子呈现，天空由白昼转入夜晚。',
    },
    comparison: [
      {
        q: '谁最先发现',
        without: '碰巧看到的人——在神经病变的情况下，常常没有人。',
        with: '一次常规检查，不依赖于能否感觉到。',
      },
      {
        q: '医生看到什么',
        without: '今天这只脚。',
        with: '一组带日期的记录，走向因此可见。',
      },
      {
        q: '什么促成一次就诊',
        without: '一处已经明显的伤口。',
        with: '一个筛查等级，并附上原因。',
      },
      {
        q: '一趟路的代价',
        without: '一样多，无论最后是否有必要。',
        with: '一样多，但走得出理由。',
      },
    ],
  },

  progression: {
    eyebrow: '进展',
    heading: '完整的路径，以及其中相机能够到的那一段。',
    lede: '糖尿病足溃疡不是突然出现的，它是逐步进展的。选择任一分级，看看那一刻脚上发生了什么，以及照片在那里能确定什么、不能确定什么。',
    gradesLabel: 'Wagner 分级',
    grade: '分级',
    gradesRange: '{from}–{to} 级',
    whatPhotoShows: '照片能看到什么',
    whatSoleIQDoes: 'SoleIQ 做什么',
    trajectory: '最坏情况下的典型进程',
    play: '播放演示',
    pause: '暂停演示',
    windows: {
      soleiq: {
        title: 'SoleIQ 起作用的阶段',
        line: '在皮肤破损之前就发现它。',
      },
      standard: {
        title: '通常开始就医的阶段',
        line: '等到疼痛或有异味，损害已经造成。',
      },
    },
    caveat:
      'Wagner 分级衡量的是某一时点的严重程度，并不是经过验证的时间序列。上面的区间描述的是未经治疗或控制不佳的足部在最坏情况下的进程。许多人就诊时已经是 2 级或 3 级；在良好的减压、血流灌注和感染控制下，约有 60% 到 80% 的溃疡会在 12 到 20 周内愈合而不再进展。在缺血足上，同样的进程可能压缩到几天。SoleIQ 是监测与分诊的辅助工具，不是诊断设备，也不对伤口进行分级。',
    stages: [
      {
        name: '无开放性病灶',
        plain: '皮肤完整，属高危足',
        what: '皮肤未破。下方可能正在形成胼胝、畸形或受压点——而在神经病变的情况下，这些都感觉不到。',
        camera:
          '照片在这里最有用，因为此时没有什么可感觉，也没有人在找什么。它记录下来的是一个基线：胼胝、颜色、形状，以及日期。',
        soleiq:
          'SoleIQ 正是为这一级而做。定期筛查确立这只脚平常是什么样子，之后的变化才有可以对照的基准。',
        whenLabel: '基线',
        whenDetail: '皮肤完整，属高危足',
        toNext: '触发事件——数天到数周',
      },
      {
        name: '浅表溃疡',
        plain: '皮肤已经破损',
        what: '全层皮肤缺损，尚未累及肌腱、关节囊或骨。往往不痛，而这正是它不被上报的原因。',
        camera:
          '可见。皮肤的破口、边缘及周围的发红都是表面特征，而表面特征正是相机读得好的部分。',
        soleiq:
          '这一级的筛查会返回一个「请去看一下」的等级，发现标注在患者本人的照片上，前几周的照片并列在旁。',
        whenLabel: '第 0 个月',
        whenDetail: '溃疡起始，计时开始',
        toNext: '约 2 到 8 周',
      },
      {
        name: '深部溃疡',
        plain: '深至肌腱或骨',
        what: '溃疡延伸至肌腱、关节囊或骨，但无脓肿或骨髓炎。',
        camera:
          '开口可见，深度不可见。没有照片能告诉你伤口有多深，而正是从这一级起，这个限制开始变得重要。',
        soleiq:
          '标记为紧急，并连同病史一并转交。深度是探查所得，由医生完成——应用的职责是确保有人拿着探针。',
        whenLabel: '第 0.5 到 2 个月',
        whenDetail: '自皮肤首次破损起算',
        toNext: '约 1 到 3 个月',
      },
      {
        name: '骨炎或脓肿',
        plain: '感染已到达骨',
        what: '深部感染：脓肿、骨髓炎或感染性肌腱炎。问题在这里从「让伤口愈合」变成「把脚保住」。',
        camera: '超出相机的范围。骨受累要靠探查、影像和血液检查确定，不是靠看皮肤。',
        soleiq:
          '到这里已经不再是筛查问题。SoleIQ 本可以在这一级贡献的价值，几个月前在 0 级和 1 级就用掉了。',
        whenLabel: '第 2 到 5 个月',
        whenDetail: '骨受累，探针可及骨',
        toNext: '约 1 到 3 个月',
      },
      {
        name: '局部坏疽',
        plain: '组织坏死，肢体受威胁',
        what: '局限性坏疽——常见于前足或足趾。血运重建与手术决策正在时间压力下做出。',
        camera: '超出相机，也超出筛查。这是住院诊疗。',
        soleiq: '不在适用范围内。列在这里，是因为这条路径要完整呈现才可信。',
        whenLabel: '第 4 到 9 个月',
        whenDetail: '组织坏死，肢体受威胁',
        toNext: '数天到数周',
      },
      {
        name: '广泛坏疽',
        plain: '整只脚',
        what: '整只脚坏疽。属于大截肢的范畴。',
        camera: '超出相机的范围。',
        soleiq: '不在适用范围内——而这正是前两级存在所要避免的结局。',
        whenLabel: '第 6 到 18 个月',
        whenDetail: '大截肢的范畴',
        toNext: null as string | null,
      },
    ],
  },

  research: {
    eyebrow: '研究',
    heading: '筛查背后的工作，以及它所处的文献脉络。',
    lede: '我们自己的论文在下方。再往下是对已发表文献的实时检索，两者分开放置并明确标示，以免混淆。',
    advisors: 'SoleIQ 已获得全国 50 多位从事人工智能、生物医学工程与临床医学的研究者、医师与外科医师的建议。',
    searchHeading: '检索文献',
    searchPlaceholder: 'diabetic foot ulcer, offloading, neuropathy screening',
    searchHint:
      '检索一个主题，例如 diabetic foot ulcer、offloading 或 neuropathy screening，匹配的文献会出现在这里。',
    searching: '正在检索 Europe PMC',
    searchError: '执行该检索时出错了。',
    noResults: '没有文献匹配“{query}”。试试更宽泛的词。',
    resultsFor: '{query} 的 {count} 条结果',
    openAccess: '开放获取',
    readFullText: '阅读全文',
    abstract: '摘要',
    readFullAbstract: '阅读完整摘要',
    showLess: '收起',
    correspondingAuthor: '通讯作者',
    topics: '主题',
    status: {
      published: '已发表',
      preprint: '预印本',
    },
  },

  about: {
    eyebrow: '关于我们',
    heading: '多数糖尿病足溃疡都是被晚发现的。不是因为它藏得深，而是因为没有人在看。',
    paragraphs: [
      '糖尿病神经病变抹去了那个原本会让人低头看脚的信号。压力、水疱、皮肤裂口：都不疼，所以都不会促使人去检查。等到脚被检查时，问题通常已经不再是「这算不算个事」，而是「这里面还能保住多少」。',
      '临床足部检查能解决这个问题，但那不是我们能修的瓶颈。号源紧张，路途昂贵，而两次就诊之间的间隔，恰恰就是问题发生的地方。',
      'SoleIQ 用每位患者已经拥有的东西来填上这个间隔：一部手机的相机，和几分钟时间。四张照片，与决定风险的病史一起读取，得出一个人可以据此行动的筛查等级，以及一份医生信得过、可以据此工作的记录。',
      '我们对自己的说法很克制。SoleIQ 做筛查，不做诊断。它的目的是让人更早、带着更好的信息去就医，而不是把人挡在就医之外。',
      '这条约束塑造了产品。手机判定不可用的照片，模型从来不会看到。发现被展示在患者本人的照片上，这样人才看得见系统看到了什么。每一次筛查都留在时间线里，因为单帧是比一组更弱的信号。而这份记录属于患者，由患者决定让哪位医生看到。',
    ],
    team: '团队',
    roles: {
      founder: '创始人兼 CEO，SoleIQ Health',
    },
    bios: {
      eshaan:
        '从头到尾负责整个平台：筛查模型、产品，以及背后的研究计划。与 David G. Armstrong 医生合作发表了关于糖尿病足 AI 引导预防的研究。',
    },
    onLinkedIn: '{name} 的 LinkedIn',
  },

  blog: {
    eyebrow: '文字',
    heading: '来自正在建造它的人的札记。',
    defaultCategory: '札记',
    readingTime: '{minutes} 分钟',
    minutesShort: '{minutes} 分钟',
    readMore: '阅读',
    closeArticle: '关闭文章',
    originalLanguage: '文章以其撰写时使用的语言显示。',
  },

  contact: {
    eyebrow: '联系',
    heading: '联系我们。',
    body: '临床合作、研究协作、媒体，或关于产品的问题。这会直接送达我们。',
    orEmail: '或发邮件至',
    noMedicalDetails:
      '请不要通过此表单发送医疗信息或照片。这不是临床渠道，也不会针对紧急情况进行监看。',
    name: '姓名',
    email: '邮箱',
    message: '留言',
    send: '发送留言',
    sending: '正在发送…',
    sent: '留言已发送。',
    sentBody: '谢谢。我们会回复到 {email}。',
    sendAnother: '再发一条',
    errors: {
      name: '请告诉我们你的姓名。',
      email: '请填写一个邮箱地址。',
      emailInvalid: '这个邮箱地址看起来不太对。',
      message: '请写下你的留言。',
      failed: '没能发送出去。请改用邮件联系我们。',
    },
  },

  footer: {
    heading: '页脚',
    tagline: '通过四张手机引导拍摄的照片进行 AI 辅助糖尿病足筛查。',
    openApp: '打开应用',
    dashboard: '控制台',
    emailUs: '给我们发邮件',
    privacy: '隐私',
    terms: '条款',
    nav: '页脚',
    onNetwork: 'SoleIQ Health 的{network}',
    disclaimer:
      'SoleIQ 是一款筛查与决策支持工具。它不是诊断设备，不提供医疗建议，也不能替代具备资质的医生的评估。如果你有伤口、感染、突发疼痛，或某只脚的颜色或温度发生变化，请立即就医。',
    copyright: '© {year} SoleIQ Health',
  },

  screens: {
    leftFootSole: '左脚，足底',
    fitFootInFrame: '把脚放进取景框内',
    photoQuality: '照片质量',
    wholeFootInFrame: '整只脚在画面内',
    sharpEnough: '清晰度足以分析',
    lightingNormalised: '光线已归一化',
    retakeTooDark: '右脚请重拍，太暗',
    analysing: '分析中',
    inputs: '输入',
    diabetesHistory: '糖尿病病史',
    vascularAnswers: '血管相关回答',
    neuropathy: '神经病变',
    painMap: '疼痛图',
    screeningLevel: '筛查等级',
    watch: '观察',
    resultBody: '有两处需要留意。7 天后复查，任一处发生变化就去预约就诊。',
    shareRecord: '分享你的病历',
    podiatryClinic: '你的足病门诊',
    fullHistory: '完整病史、每一张照片、每一个筛查等级。',
    sendRecord: '发送病历',
    clinicianView: '医生视图',
    clinicalReport: '临床报告',
    photoComparison: '照片对比',
    perPatientAssistant: '按患者划分的助手',
    yourTimeline: '你的时间线',
    today: '今天',
    levels: {
      clear: '无异常',
      watch: '观察',
      soon: '尽快',
      urgent: '紧急',
    },
  },
}

export default zhHans
