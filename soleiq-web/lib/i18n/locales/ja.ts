import type { Dictionary } from './en';

/**
 * Japanese (ja).
 *
 * Written in です・ます throughout — this is a clinical tool a patient may
 * hold, and plain form would read as curt. 「スクリーニング」 rather than
 * 「診断」 everywhere, which is the same distinction the English copy makes.
 */
const ja: Dictionary = {
  brand: {
    name: 'SoleIQ',
    health: 'Health',
    slogan: '早期発見、生涯にわたる予防',
  },

  nav: {
    website: 'ウェブサイト',
    websiteAria: 'soleiqhealth.com を開く',
    home: 'ホーム',
    dashboard: 'マイダッシュボード',
    clinical: 'SoleIQ クリニカル',
    signOut: 'ログアウト',
    signedInAs: '{email} でログイン中',
    yourAccount: 'お客様のアカウント',
    noMembership: '医療機関との連携なし',
    feedback: 'ご意見',
    adminConsole: '管理コンソール',
    doctorDashboard: '医師ダッシュボード',
    footHealth: '足の健康',
  },

  language: {
    label: '言語',
    change: '言語を変更',
    loading: '言語を読み込んでいます…',
  },

  flow: {
    back: '戻る',
    backHint: '戻る（←）',
    continue: '次へ',
    skip: 'スキップ',
    step: 'ステップ {current} / {total}',
    encouragementStart: 'はじめましょう',
    encouragementUnderway: '順調に進んでいます',
    encouragementGood: 'いい調子です',
    encouragementAlmost: 'もう少しです',
    encouragementDone: '完了しました。お疲れさまでした。',
    disclaimer:
      'SoleIQ は健康状態を見守るためのツールであり、専門的な医学的診断に代わるものではありません。',
  },

  welcome: {
    intro:
      'AI 支援による糖尿病足スクリーニング — プライマリケアと足病外来のための臨床意思決定支援です。',
    start: '診察を開始',
    duration: '患者お一人あたり約 4 分。臨床用途です。',
  },

  auth: {
    welcome: 'ようこそ',
    chooseSubtitle: 'どちらの立場かをお知らせください。それに合わせて画面をご用意します。',
    iAmPatient: '患者です',
    iAmPatientBody: '案内に沿って写真を撮り、足の状態を確認して、結果をひとつにまとめて残せます。',
    iAmDoctor: '医師または介護者です',
    iAmDoctorBody: '担当する患者さんの足のチェック、写真の記録、AI による要約をたどれます。',
    sendingReset: 'リンクを送信しています…',
    resetSent: '{email} のアカウントがあれば、再設定用のリンクをお送りしています。迷惑メールもご確認ください。このデバイスで開いてください。リンクは 1 時間で失効します。',
    signIn: 'ログイン',
    createAccount: 'アカウントを作成',
    titlePatient: 'SoleIQ にログイン',
    titleDoctor: '医師・介護者向けログイン',
    subtitlePatient:
      '足のチェック結果はアカウントに保存されるため、次回もそのままご覧いただけます。',
    subtitleDoctor: 'ダッシュボードには担当の患者さんが表示されます。',
    email: 'メールアドレス',
    password: 'パスワード',
    showPassword: 'パスワードを表示',
    hidePassword: 'パスワードを隠す',
    passwordHint: '6 文字を超え、数字か記号を 1 つ以上含めてください。',
    passwordOk: 'パスワードは条件を満たしています。',
    forgot: 'パスワードをお忘れですか？',
    working: '処理中…',
    signedIn: 'ログインしました',
    redirecting: 'ダッシュボードへ移動しています…',
    resend: '確認メールを再送',
    resendSent: '確認メールを送信しました。受信トレイ（と迷惑メール）をご確認ください。',
    accountCreated:
      'アカウントを作成しました。確認メールをお送りしましたので、リンクを開いてからここでログインしてください。',
    emailConfirmed: 'メールアドレスを確認しました。下からログインしてください。',
    staffNote:
      '医師と管理者のアクセスは、有効期限のある医療機関からの招待によってのみ付与されます。新しい医師は医療機関の確認が済むまで無効のままです。',
    patientNote:
      '新規アカウントでスタッフの役割を選ぶことはできません。医療機関へのアクセスは、招待または診療記録の連携によって追加されます。',
    errorEmailFirst: '先にメールアドレスを入力してください。',
    errorForgotEmailFirst:
      '先にメールアドレスを入力してから「パスワードをお忘れですか？」を選んでください。',
    errorSignInFailed: 'ログインできませんでした。',
    errorUnconfirmed:
      'メールアドレスがまだ確認されていません。お送りした確認リンクを開くか、下から再送してください。',
    errorStaffInviteOnly:
      'スタッフのアカウントは医療機関からの招待で作成されます。管理者に招待をご依頼ください。',
    errorSendFailed:
      'ただ今メールを送信できませんでした。数分ほどおいてからもう一度お試しください。',
    errorRateLimited:
      '短時間に多くのメールが要求されました。しばらく待ってからお試しください。',
    errorRecoveryFailed: '再設定の申請に失敗しました。',
    errorResendFailed: 'メールを再送できませんでした。',
  },

  reset: {
    title: '新しいパスワードを設定',
    subtitle: 'このアカウントでこれまで使っていないパスワードを選んでください。',
    newPassword: '新しいパスワード',
    confirmPassword: '新しいパスワード（確認）',
    mismatch: '2 つのパスワードが一致しません。',
    submit: 'パスワードを更新',
    submitting: '更新しています…',
    done: 'パスワードを更新しました',
    doneBody: '新しいパスワードでログインできます。',
    expired: 'このリンクは期限切れです',
    expiredBody:
      'パスワードのリンクは一度しか使えず、1 時間で無効になります。新しいものを申請すれば、すぐに届きます。',
    requestNew: '新しいリンクを送る',
    backToSignIn: 'ログインに戻る',
    sameBrowser: 'このリンクは、申請したときと同じブラウザーで開く必要があります。新しいメールを申請し、この端末で開いてください。',
    openFromEmail: '新しいパスワードを設定するには、メールの再設定リンクを開いてください。ログイン画面から申請し直すこともできます。',
    samePassword: 'それは今お使いのパスワードです。別のものを選んでください。',
    checking: 'リンクを確認しています…',
  },

  screens: {
    consentEyebrow: 'ステップ 1',
    consentTitle: '患者さんの同意',
    consentSubtitle: '続ける前に、以下の各項目に同意いただけるか患者さんにご確認ください。',

    returningEyebrow: 'おかえりなさい',
    returningTitle: '回答の確認',
    returningSubtitle:
      '前回のチェック内容をすべて保存しています。変わったところだけ更新してください。残りはそのまま引き継がれます。写真は毎回新しく撮影します。',

    intakeEyebrow: '患者情報',
    nameTitle: '患者さんのお名前',
    nameSubtitle: '紹介先の提案のため、お住まいの地域もお伺いします。',

    demographicsTitle: '患者さんの背景情報',
    demographicsSubtitle:
      '集団事前分布の調整と、モデルの公平性の監査に使用します。',

    historyEyebrow: '既往歴',
    conditionsTitle: '既往疾患',
    conditionsSubtitle:
      '当てはまるものをすべて選んでください。(?) を押すと各疾患の臨床的な説明が表示されます。',

    vascularEyebrow: '血管スクリーニング',
    vascularTitle: '末梢動脈疾患',
    vascularSubtitle:
      '末梢動脈疾患は創傷治癒の遅れと切断リスクに独立して関連するため、神経障害とは分けてスクリーニングします。',

    diabetesTitle: '糖尿病について',
    diabetesSubtitle: '型と診断された年。',

    glucoseTitle: '血糖の指標',
    glucoseSubtitle: 'HbA1c と、直近の血糖測定値。どちらも任意です。',

    footHistoryTitle: '足の既往',
    footHistorySubtitle: '過去の潰瘍、切断、最近の手術。',

    lifestyleTitle: '健康と生活習慣',
    lifestyleSubtitle: '足のしびれと、生活習慣についていくつかの質問です。',

    sizingEyebrow: 'サイズ',
    sizingTitle: '靴のサイズ',

    painEyebrow: '症状',
    painTitle: '痛みの評価',
    painSubtitle: '患者さんにお尋ねください：今、足に痛みはありますか。',

    captureEyebrow: '撮影',
    captureTitle: '足の診察を開始',
    captureSubtitle:
      'カラー写真を 4 枚撮影またはアップロードしてください。両足の甲と裏です。チェック前ならどの写真も撮り直せます。',

    perfusionEyebrow: '任意',
    perfusionTitle: '足の血行',
    perfusionSubtitle:
      'カメラで両足の血流を確認します。スキップできます。写真による診察はこれに依存しません。',
    perfusionPulse: '脈波の信号',
    perfusionRefill: '毛細血管再充満',

    leftFoot: '左足',
    rightFoot: '右足',

    nextStepsEyebrow: 'チェック完了',
    nextStepsTitle: 'チェックを保存',
    nextStepsSubtitle:
      'ご自身の記録に残しておくと、ご本人と医療チームが時間の経過による変化を追えます。',

    productsEyebrow: '治療の選択肢',
    productsTitle: '補助的な製品',

    timelineEyebrow: '写真の記録',
    timelineTitle: '足のチェック履歴',
    timelineLoading: '保存されたチェックを読み込んでいます…',
    timelineCount: '保存されたチェック {count} 件。',
    timelineCountOne: '保存されたチェック 1 件。',
  },

  common: {
    yes: 'はい',
    no: 'いいえ',
    save: '保存',
    cancel: 'キャンセル',
    close: '閉じる',
    retry: 'もう一度試す',
    loading: '読み込み中…',
    required: '必須',
    optional: '任意',
    done: '完了',
    somethingWentWrong: '問題が発生しました。',
  },
};

export default ja;
