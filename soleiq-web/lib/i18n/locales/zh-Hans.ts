import type { Dictionary } from './en';

/**
 * Chinese, Simplified script (zh-Hans).
 *
 * "筛查" for screening, never "诊断" — mainland clinical writing keeps those
 * apart and so does this copy. Mainland medical terms throughout: 糖尿病足,
 * 外周动脉疾病, 毛细血管再充盈.
 */
const zhHans: Dictionary = {
  brand: {
    name: 'SoleIQ',
    health: 'Health',
    slogan: '早期发现，终身守护',
  },

  nav: {
    website: '官网',
    websiteAria: '前往 soleiqhealth.com',
    home: '首页',
    dashboard: '我的面板',
    clinical: 'SoleIQ 临床版',
    signOut: '退出登录',
    signedInAs: '已登录：{email}',
    yourAccount: '您的账户',
    noMembership: '未关联医院',
    feedback: '反馈',
    adminConsole: '管理控制台',
    doctorDashboard: '照护者面板',
    footHealth: '我的足部健康',
  },

  language: {
    label: '语言',
    change: '切换语言',
    loading: '正在加载语言…',
  },

  flow: {
    back: '返回',
    backHint: '返回（←）',
    continue: '继续',
    skip: '跳过',
    step: '第 {current} 步，共 {total} 步',
    encouragementStart: '开始吧',
    encouragementUnderway: '已经上路了',
    encouragementGood: '进展顺利',
    encouragementAlmost: '就快完成了',
    encouragementDone: '全部完成，做得很好！',
    disclaimer: 'SoleIQ 是健康监测工具，不能替代专业医学诊断。',
  },

  welcome: {
    intro: '人工智能辅助的糖尿病足筛查——为基层医疗和足病门诊提供临床决策支持。',
    start: '开始就诊',
    duration: '每位患者约 4 分钟。供临床使用。',
  },

  auth: {
    welcome: '欢迎',
    chooseSubtitle: '请告诉我们您的身份，以便为您准备合适的界面。',
    iAmPatient: '我是患者',
    iAmPatientBody: '按引导拍照检查双脚，把结果集中保存在一处。',
    iAmDoctor: '我是照护者',
    iAmDoctorBody: '跟进您的患者的足部检查、照片时间线和 AI 摘要。',
    sendingReset: '正在发送链接…',
    resetSent: '如果 {email} 已注册，重置链接正在发送中——也请查看垃圾邮件。请在本设备上打开；链接一小时后失效。',
    signIn: '登录',
    createAccount: '创建账户',
    titlePatient: '登录 SoleIQ',
    titleDoctor: '照护者登录',
    subtitlePatient: '您的足部检查会保存在账户中，下次仍可查看。',
    subtitleDoctor: '您的面板会显示分配给您的患者。',
    email: '电子邮箱',
    password: '密码',
    showPassword: '显示密码',
    hidePassword: '隐藏密码',
    passwordHint: '超过 6 个字符，并且至少包含一个数字或符号。',
    passwordOk: '密码符合要求。',
    forgot: '忘记密码？',
    working: '处理中…',
    signedIn: '登录成功',
    redirecting: '正在带您前往面板…',
    resend: '重新发送确认邮件',
    resendSent: '确认邮件已发送——请查看收件箱（以及垃圾邮件）。',
    accountCreated: '账户已创建——我们发送了一封确认邮件。请打开其中的链接，然后在此登录。',
    emailConfirmed: '邮箱已确认——请在下方登录。',
    staffNote:
      '照护者和管理员权限只能通过有时限的医院邀请获得。新照护者在医院核实前保持未激活状态。',
    patientNote:
      '新账户不能自行选择工作人员角色。医院权限通过邀请或关联患者病历的流程添加。',
    errorEmailFirst: '请先填写您的邮箱。',
    errorForgotEmailFirst: '请先填写邮箱，然后再点击"忘记密码"。',
    errorSignInFailed: '登录失败。',
    errorUnconfirmed: '您的邮箱尚未确认。请打开我们发送的确认链接，或在下方重新发送。',
    errorStaffInviteOnly: '工作人员账户由医院邀请创建。请向医院管理员索取邀请。',
    errorSendFailed: '邮件服务暂时无法发送——请几分钟后再试。',
    errorRateLimited: '短时间内请求的邮件过多。请稍候再试。',
    errorRecoveryFailed: '找回请求失败。',
    errorResendFailed: '无法重新发送邮件。',
  },

  reset: {
    title: '设置新密码',
    subtitle: '请选择一个此账户未使用过的密码。',
    newPassword: '新密码',
    confirmPassword: '确认新密码',
    mismatch: '两次输入的密码不一致。',
    submit: '更新密码',
    submitting: '更新中…',
    done: '密码已更新',
    doneBody: '现在可以用新密码登录了。',
    expired: '此链接已失效',
    expiredBody: '密码链接只能使用一次，且一小时后失效。重新申请一个，稍后即可收到。',
    requestNew: '发送新链接',
    backToSignIn: '返回登录',
    sameBrowser: '此链接必须在申请它的同一个浏览器中打开。请重新申请一封邮件，并在本设备上打开。',
    openFromEmail: '请打开邮件中的重置链接来设置新密码，或在登录页重新申请一个。',
    samePassword: '这已经是您当前的密码了，请换一个。',
    checking: '正在验证您的链接…',
  },

  screens: {
    consentEyebrow: '第 1 步',
    consentTitle: '患者知情同意',
    consentSubtitle: '继续之前，请与患者确认其同意以下每一项。',

    returningEyebrow: '欢迎回来',
    returningTitle: '核对您的回答',
    returningSubtitle:
      '我们保存了您上次检查的全部内容。有变化的请更新，其余会自动沿用。照片每次都重新拍摄。',

    intakeEyebrow: '患者登记',
    nameTitle: '患者姓名',
    nameSubtitle: '以及患者的居住地，用于转诊建议。',

    demographicsTitle: '患者人口学信息',
    demographicsSubtitle: '用于调整人群先验并审核模型的公平性。',

    claim: {
      eyebrow:
        '您的记录',
      title:
        '接管您的记录',
      intro:
        '有人为您创建了 SoleIQ 足部健康记录，并一直代您管理。邀请邮件中说明了是谁。',
      whatHappens:
        '接管后，这份记录就归您所有。您可以看到完整历史，包括今天之前记录的内容，并由您决定还有谁可以查看。',
      canRemove:
        '对方会留在您的护理圈中继续提供帮助，而您可以随时在「隐私与访问」中移除他们。这个决定完全由您做出。',
      signInPrompt:
        '请使用收到此邀请的邮箱地址登录。该链接仅对该账户有效。',
      signInCta:
        '登录或创建账户',
      claimCta:
        '接管我的记录',
      claiming:
        '正在接管…',
      successTitle:
        '这份记录现在归您所有',
      successBody:
        '其中的全部内容都在您的应用里，包括今天之前记录的内容。',
      successCta:
        '前往我的足部健康',
      expiredTitle:
        '此链接已过期',
      expiredBody:
        '链接在 {days} 天后失效。您可以申请一个新链接。',
      usedTitle:
        '此链接已被使用',
      usedBody:
        '如果记录已归您所有，直接登录即可；否则请申请新链接。',
      mismatchTitle:
        '此链接属于他人',
      mismatchBody:
        '请使用收到邀请的地址登录。如果您在帮助他人，请把链接转给他们——只有本人才能接管自己的记录。',
      linkedTitle:
        '您的账户已有一份记录',
      linkedBody:
        '此账户已关联另一份患者记录。两份病史绝不会自动合并，请联系您的医护团队。',
      unknownTitle:
        '操作未成功',
      unknownBody:
        '无法使用该链接。您可以申请一个新链接。',
      requestNewCta:
        '申请新链接',
      requestNewSent:
        '已记录您的请求。请让为您建立记录的人重新发送链接。',
    },

    historyEyebrow: '健康史',
    conditionsTitle: '既往疾病',
    conditionsSubtitle: '请选择所有适用项。点击 (?) 查看任一疾病的临床说明。',

    medications: {
      title: '用药情况',
      subtitle:
        '有些药物会改变皮肤淤青、出血和愈合的方式，了解这些有助于我们正确解读您的照片。',
      newQuestion: '这是我们现在向所有人询问的新问题。',
      question: '您在服用任何重要药物吗？',
      preferNotToSay: '不愿透露',
      listTitle: '是哪些？',
      listHint: '可以输入任何名称，不必与我们的建议一致。',
      inputPlaceholder: '开始输入药物名称',
      suggestions: '建议',
      added: '已添加',
      empty: '尚未添加。您仍可以继续。',
      notesLabel: '还有什么需要让医护团队知道的',
      notesPlaceholder: '剂量、服用多久、近期的变化',
      privacy: '只有您和您的医护团队能看到这些内容。',
      reviewNone: '没有重要药物',
      reviewHidden: '不愿透露',
      reviewUnanswered: '新问题 — 请回答',
      reviewRequiredCta: '回答一个新问题，然后拍照',
      categories: {
        anticoagulant: '抗凝药',
        antiplatelet: '抗血小板药',
        corticosteroid: '激素类药',
        immunosuppressant: '免疫抑制剂',
        chemotherapy: '化疗药',
        insulin: '胰岛素',
        oral_diabetes: '降糖药片',
        statin: '降脂药（他汀）',
        antihypertensive: '降压药',
        antibiotic: '抗生素',
        other: '其他',
      },
    },

    vascularEyebrow: '血管筛查',
    vascularTitle: '外周动脉疾病',
    vascularSubtitle:
      '外周动脉疾病与伤口愈合延迟和截肢风险独立相关，因此我们将其与神经病变分开筛查。',

    diabetesTitle: '糖尿病详情',
    diabetesSubtitle: '类型与确诊年份。',

    glucoseTitle: '血糖指标',
    glucoseSubtitle: '糖化血红蛋白，以及最近一次血糖仪读数。两项均为选填。',

    footHistoryTitle: '足部病史',
    footHistorySubtitle: '既往溃疡、截肢或近期手术。',

    lifestyleTitle: '健康与生活方式',
    lifestyleSubtitle: '足部麻木情况，以及几个生活方式问题。',

    sizingEyebrow: '尺码',
    sizingTitle: '您的鞋码',

    painEyebrow: '症状',
    painTitle: '疼痛评估',
    painSubtitle: '请询问患者：现在足部有疼痛吗？',

    captureEyebrow: '拍摄',
    captureTitle: '开始足部检查',
    captureSubtitle:
      '拍摄或上传四张彩色照片：每只脚的足背和足底。检查前可以重拍任意一张。',

    perfusionEyebrow: '选填',
    perfusionTitle: '足部血液循环',
    perfusionSubtitle:
      '用摄像头检查每只脚的血流。可以跳过——足部照片检查并不依赖它。',
    perfusionPulse: '脉搏信号',
    perfusionRefill: '毛细血管再充盈',

    leftFoot: '左脚',
    rightFoot: '右脚',

    nextStepsEyebrow: '检查完成',
    nextStepsTitle: '保存本次检查',
    nextStepsSubtitle: '保存到您的私人历史记录，方便您和照护团队追踪随时间的变化。',

    productsEyebrow: '治疗选择',
    productsTitle: '辅助产品',

    timelineEyebrow: '照片历史',
    timelineTitle: '您的足部检查',
    timelineLoading: '正在加载已保存的检查…',
    timelineCount: '已保存 {count} 次检查。',
    timelineCountOne: '已保存 1 次检查。',
  },

  common: {
    yes: '是',
    no: '否',
    continue: '继续',
    add: '添加',
    remove: '移除',
    save: '保存',
    cancel: '取消',
    close: '关闭',
    retry: '重试',
    loading: '加载中…',
    required: '必填',
    optional: '选填',
    done: '完成',
    somethingWentWrong: '出了点问题。',
  },
};

export default zhHans;
