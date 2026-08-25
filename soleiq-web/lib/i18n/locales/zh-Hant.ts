import type { Dictionary } from './en';

/**
 * Chinese, Traditional script (zh-Hant).
 *
 * Not a character-by-character conversion of zh-Hans: Taiwan and Hong Kong
 * clinical writing uses 篩檢 rather than 篩查, 周邊動脈疾病 rather than
 * 外周動脈疾病, and 資料 rather than 數據 for data of this kind.
 */
const zhHant: Dictionary = {
  brand: {
    name: 'SoleIQ',
    health: 'Health',
    slogan: '及早發現，終身守護',
  },

  nav: {
    website: '官網',
    websiteAria: '前往 soleiqhealth.com',
    home: '首頁',
    dashboard: '我的面板',
    clinical: 'SoleIQ 臨床版',
    signOut: '登出',
    signedInAs: '已登入：{email}',
    yourAccount: '您的帳戶',
    noMembership: '未連結醫院',
    feedback: '意見回饋',
    adminConsole: '管理主控台',
    doctorDashboard: '醫師面板',
    footHealth: '我的足部健康',
  },

  language: {
    label: '語言',
    change: '切換語言',
    loading: '正在載入語言…',
  },

  flow: {
    back: '返回',
    backHint: '返回（←）',
    continue: '繼續',
    skip: '略過',
    step: '第 {current} 步，共 {total} 步',
    encouragementStart: '開始吧',
    encouragementUnderway: '已經上路了',
    encouragementGood: '進展順利',
    encouragementAlmost: '就快完成了',
    encouragementDone: '全部完成，做得很好！',
    disclaimer: 'SoleIQ 是健康監測工具，無法取代專業醫療診斷。',
  },

  welcome: {
    intro: '人工智慧輔助的糖尿病足篩檢——為基層醫療與足科門診提供臨床決策支援。',
    start: '開始看診',
    duration: '每位病人約 4 分鐘。供臨床使用。',
  },

  auth: {
    welcome: '歡迎',
    chooseSubtitle: '請告訴我們您的身分，以便為您準備合適的介面。',
    iAmPatient: '我是病人',
    iAmPatientBody: '依指引拍照檢查雙腳，把結果集中保存在一處。',
    iAmDoctor: '我是醫師或照顧者',
    iAmDoctorBody: '追蹤您的病人的足部檢查、照片時間軸與 AI 摘要。',
    sendingReset: '正在寄送連結…',
    resetSent: '若 {email} 已註冊，重設連結正在寄出——也請查看垃圾郵件。請在本裝置上開啟；連結一小時後失效。',
    signIn: '登入',
    createAccount: '建立帳戶',
    titlePatient: '登入 SoleIQ',
    titleDoctor: '醫師／照顧者登入',
    subtitlePatient: '您的足部檢查會儲存在帳戶中，下次仍可查看。',
    subtitleDoctor: '您的面板會顯示指派給您的病人。',
    email: '電子郵件',
    password: '密碼',
    showPassword: '顯示密碼',
    hidePassword: '隱藏密碼',
    passwordHint: '超過 6 個字元，並且至少包含一個數字或符號。',
    passwordOk: '密碼符合要求。',
    forgot: '忘記密碼？',
    working: '處理中…',
    signedIn: '登入成功',
    redirecting: '正在帶您前往面板…',
    resend: '重新寄送確認信',
    resendSent: '確認信已寄出——請查看收件匣（以及垃圾郵件）。',
    accountCreated: '帳戶已建立——我們寄出了一封確認信。請開啟信中的連結，然後在此登入。',
    emailConfirmed: '電子郵件已確認——請在下方登入。',
    staffNote:
      '醫師與管理員權限僅能透過有時效的醫院邀請取得。新醫師在醫院查核前維持未啟用狀態。',
    patientNote:
      '新帳戶無法自行選擇工作人員角色。醫院權限透過邀請或連結病歷的流程新增。',
    errorEmailFirst: '請先填寫您的電子郵件。',
    errorForgotEmailFirst: '請先填寫電子郵件，再點選「忘記密碼」。',
    errorSignInFailed: '登入失敗。',
    errorUnconfirmed: '您的電子郵件尚未確認。請開啟我們寄出的確認連結，或在下方重新寄送。',
    errorStaffInviteOnly: '工作人員帳戶由醫院邀請建立。請向醫院管理員索取邀請。',
    errorSendFailed: '郵件服務目前無法寄送——請幾分鐘後再試。',
    errorRateLimited: '短時間內要求的郵件過多。請稍候再試。',
    errorRecoveryFailed: '找回請求失敗。',
    errorResendFailed: '無法重新寄送郵件。',
  },

  reset: {
    title: '設定新密碼',
    subtitle: '請選擇一組此帳戶未曾使用過的密碼。',
    newPassword: '新密碼',
    confirmPassword: '確認新密碼',
    mismatch: '兩次輸入的密碼不一致。',
    submit: '更新密碼',
    submitting: '更新中…',
    done: '密碼已更新',
    doneBody: '現在可以用新密碼登入了。',
    expired: '此連結已失效',
    expiredBody: '密碼連結只能使用一次，且一小時後失效。重新申請一組，稍後即可收到。',
    requestNew: '寄送新連結',
    backToSignIn: '返回登入',
    sameBrowser: '此連結必須在申請它的同一個瀏覽器中開啟。請重新申請一封郵件，並在本裝置上開啟。',
    openFromEmail: '請開啟郵件中的重設連結來設定新密碼，或在登入頁重新申請一個。',
    samePassword: '這已經是您目前的密碼了，請換一個。',
    checking: '正在驗證您的連結…',
  },

  screens: {
    consentEyebrow: '第 1 步',
    consentTitle: '病人知情同意',
    consentSubtitle: '繼續之前，請與病人確認其同意以下每一項。',

    returningEyebrow: '歡迎回來',
    returningTitle: '核對您的回答',
    returningSubtitle:
      '我們保留了您上次檢查的所有內容。有變動的請更新，其餘會自動沿用。照片每次都重新拍攝。',

    intakeEyebrow: '病人登錄',
    nameTitle: '病人姓名',
    nameSubtitle: '以及病人的居住地，用於轉診建議。',

    demographicsTitle: '病人人口學資料',
    demographicsSubtitle: '用於調整族群先驗，並稽核模型的公平性。',

    historyEyebrow: '健康史',
    conditionsTitle: '既往疾病',
    conditionsSubtitle: '請選擇所有適用項目。點選 (?) 查看任一疾病的臨床說明。',

    vascularEyebrow: '血管篩檢',
    vascularTitle: '周邊動脈疾病',
    vascularSubtitle:
      '周邊動脈疾病與傷口癒合延遲及截肢風險獨立相關，因此我們與神經病變分開篩檢。',

    diabetesTitle: '糖尿病細節',
    diabetesSubtitle: '類型與確診年份。',

    glucoseTitle: '血糖指標',
    glucoseSubtitle: '糖化血色素，以及最近一次血糖機讀數。兩項皆為選填。',

    footHistoryTitle: '足部病史',
    footHistorySubtitle: '既往潰瘍、截肢或近期手術。',

    lifestyleTitle: '健康與生活型態',
    lifestyleSubtitle: '足部麻木情形，以及幾個生活型態問題。',

    sizingEyebrow: '尺寸',
    sizingTitle: '您的鞋子尺寸',

    painEyebrow: '症狀',
    painTitle: '疼痛評估',
    painSubtitle: '請詢問病人：現在足部會痛嗎？',

    captureEyebrow: '拍攝',
    captureTitle: '開始足部檢查',
    captureSubtitle:
      '拍攝或上傳四張彩色照片：每隻腳的腳背與腳底。檢查前可以重拍任何一張。',

    perfusionEyebrow: '選填',
    perfusionTitle: '足部血液循環',
    perfusionSubtitle:
      '以相機檢查每隻腳的血流。可以略過——足部照片檢查並不依賴它。',
    perfusionPulse: '脈搏訊號',
    perfusionRefill: '微血管再充填',

    leftFoot: '左腳',
    rightFoot: '右腳',

    nextStepsEyebrow: '檢查完成',
    nextStepsTitle: '儲存這次檢查',
    nextStepsSubtitle: '存進您的私人紀錄，方便您與照護團隊追蹤隨時間的變化。',

    productsEyebrow: '治療選項',
    productsTitle: '輔助產品',

    timelineEyebrow: '照片紀錄',
    timelineTitle: '您的足部檢查',
    timelineLoading: '正在載入已儲存的檢查…',
    timelineCount: '已儲存 {count} 次檢查。',
    timelineCountOne: '已儲存 1 次檢查。',
  },

  common: {
    yes: '是',
    no: '否',
    save: '儲存',
    cancel: '取消',
    close: '關閉',
    retry: '重試',
    loading: '載入中…',
    required: '必填',
    optional: '選填',
    done: '完成',
    somethingWentWrong: '發生問題了。',
  },
};

export default zhHant;
