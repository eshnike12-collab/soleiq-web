import type { Dictionary } from './en';

/**
 * Korean (ko).
 *
 * 해요체 / 합쇼체 mixed the way Korean medical apps actually read: buttons are
 * short noun phrases, sentences addressed to the patient end in -세요/-습니다.
 * 선별검사 for screening, kept apart from 진단 throughout.
 */
const ko: Dictionary = {
  brand: {
    name: 'SoleIQ',
    health: 'Health',
    slogan: '조기 발견, 평생 보호',
  },

  nav: {
    website: '웹사이트',
    websiteAria: 'soleiqhealth.com으로 이동',
    home: '홈',
    dashboard: '내 대시보드',
    clinical: 'SoleIQ 임상용',
    signOut: '로그아웃',
    signedInAs: '{email}(으)로 로그인함',
    yourAccount: '내 계정',
    noMembership: '연결된 병원 없음',
    feedback: '의견 보내기',
    adminConsole: '관리자 콘솔',
    doctorDashboard: '보호자 대시보드',
    footHealth: '내 발 건강',
  },

  language: {
    label: '언어',
    change: '언어 변경',
    loading: '언어를 불러오는 중…',
  },

  flow: {
    back: '뒤로',
    backHint: '뒤로 (←)',
    continue: '계속',
    skip: '건너뛰기',
    step: '{total}단계 중 {current}단계',
    encouragementStart: '시작해 볼까요',
    encouragementUnderway: '잘 진행되고 있어요',
    encouragementGood: '순조롭습니다',
    encouragementAlmost: '거의 다 왔어요',
    encouragementDone: '모두 끝났습니다. 수고하셨어요!',
    disclaimer:
      'SoleIQ는 건강 모니터링 도구이며 전문 의료 진단을 대신하지 않습니다.',
  },

  welcome: {
    intro:
      'AI 기반 당뇨발 선별검사 — 일차진료와 족부 진료를 위한 임상 의사결정 지원입니다.',
    start: '환자 진료 시작',
    duration: '환자 한 명당 약 4분. 임상용입니다.',
  },

  auth: {
    welcome: '환영합니다',
    chooseSubtitle: '어떤 분인지 알려 주시면 그에 맞는 화면을 준비하겠습니다.',
    iAmPatient: '저는 환자입니다',
    iAmPatientBody: '안내에 따라 사진을 찍어 발을 확인하고 결과를 한곳에 모아 두세요.',
    iAmDoctor: '저는 보호자입니다',
    iAmDoctorBody: '담당 환자의 발 검사, 사진 기록, AI 요약을 확인하세요.',
    sendingReset: '링크를 보내는 중…',
    resetSent: '{email}(으)로 등록된 계정이 있으면 재설정 링크가 발송됩니다. 스팸함도 확인해 주세요. 이 기기에서 열어 주세요. 링크는 한 시간 뒤 만료됩니다.',
    signIn: '로그인',
    createAccount: '계정 만들기',
    titlePatient: 'SoleIQ 로그인',
    titleDoctor: '보호자 로그인',
    subtitlePatient: '발 검사 기록이 계정에 저장되어 다음에도 그대로 남아 있습니다.',
    subtitleDoctor: '대시보드에 배정된 환자가 표시됩니다.',
    email: '이메일',
    password: '비밀번호',
    showPassword: '비밀번호 표시',
    hidePassword: '비밀번호 숨기기',
    passwordHint: '6자를 넘고, 숫자나 기호를 하나 이상 포함해야 합니다.',
    passwordOk: '비밀번호가 조건을 충족합니다.',
    forgot: '비밀번호를 잊으셨나요?',
    working: '처리 중…',
    signedIn: '로그인되었습니다',
    redirecting: '대시보드로 이동하는 중…',
    resend: '확인 메일 다시 보내기',
    resendSent: '확인 메일을 보냈습니다. 받은편지함(과 스팸함)을 확인해 주세요.',
    accountCreated:
      '계정을 만들었습니다. 확인 메일을 보냈으니 안의 링크를 열고 여기서 로그인해 주세요.',
    emailConfirmed: '이메일이 확인되었습니다. 아래에서 로그인하세요.',
    staffNote:
      '보호자와 관리자 권한은 만료 기한이 있는 병원 초대를 통해서만 부여됩니다. 새로 등록한 보호자는 병원이 확인할 때까지 비활성 상태입니다.',
    patientNote:
      '새 계정은 의료진 역할을 직접 선택할 수 없습니다. 병원 접근 권한은 초대 또는 환자 기록 연결 절차로 추가됩니다.',
    errorEmailFirst: '이메일을 먼저 입력해 주세요.',
    errorForgotEmailFirst:
      '이메일을 먼저 입력한 다음 "비밀번호를 잊으셨나요?"를 눌러 주세요.',
    errorSignInFailed: '로그인하지 못했습니다.',
    errorUnconfirmed:
      '이메일이 아직 확인되지 않았습니다. 보내 드린 확인 링크를 열거나 아래에서 다시 보내 주세요.',
    errorStaffInviteOnly:
      '의료진 계정은 병원 초대로 만들어집니다. 병원 관리자에게 초대를 요청해 주세요.',
    errorSendFailed:
      '지금은 메일을 보낼 수 없습니다. 몇 분 뒤에 다시 시도해 주세요.',
    errorRateLimited: '짧은 시간에 메일이 너무 많이 요청되었습니다. 잠시 후 다시 시도해 주세요.',
    errorRecoveryFailed: '재설정 요청이 실패했습니다.',
    errorResendFailed: '메일을 다시 보내지 못했습니다.',
  },

  reset: {
    title: '새 비밀번호 설정',
    subtitle: '이 계정에서 이전에 쓰지 않은 비밀번호를 선택해 주세요.',
    newPassword: '새 비밀번호',
    confirmPassword: '새 비밀번호 확인',
    mismatch: '두 비밀번호가 일치하지 않습니다.',
    submit: '비밀번호 변경',
    submitting: '변경하는 중…',
    done: '비밀번호가 변경되었습니다',
    doneBody: '이제 새 비밀번호로 로그인할 수 있습니다.',
    expired: '이 링크는 만료되었습니다',
    expiredBody:
      '비밀번호 링크는 한 번만 쓸 수 있고 한 시간이 지나면 작동하지 않습니다. 새로 요청하면 곧 도착합니다.',
    requestNew: '새 링크 보내기',
    backToSignIn: '로그인으로 돌아가기',
    sameBrowser: '이 링크는 요청한 것과 같은 브라우저에서 열어야 합니다. 메일을 새로 요청해 이 기기에서 열어 주세요.',
    openFromEmail: '새 비밀번호를 설정하려면 메일의 재설정 링크를 열어 주세요. 로그인 화면에서 새로 요청할 수도 있습니다.',
    samePassword: '이미 사용 중인 비밀번호입니다. 다른 것을 선택해 주세요.',
    checking: '링크를 확인하는 중…',
  },

  screens: {
    consentEyebrow: '1단계',
    consentTitle: '환자 동의',
    consentSubtitle: '계속하기 전에 환자가 아래 각 항목에 동의하는지 확인해 주세요.',

    returningEyebrow: '다시 오셨네요',
    returningTitle: '답변 확인',
    returningSubtitle:
      '지난번 검사 내용을 모두 저장해 두었습니다. 달라진 부분만 수정하시면 나머지는 그대로 이어집니다. 사진은 매번 새로 촬영합니다.',

    intakeEyebrow: '환자 접수',
    nameTitle: '환자 이름',
    nameSubtitle: '의뢰 추천을 위해 환자의 거주 지역도 함께 받습니다.',

    demographicsTitle: '환자 인구학적 정보',
    demographicsSubtitle:
      '집단 사전분포를 조정하고 모델의 공정성을 점검하는 데 사용합니다.',

    claim: {
      eyebrow:
        '내 기록',
      title:
        '내 기록의 관리 권한 받기',
      intro:
        '누군가 당신을 위해 SoleIQ 발 건강 기록을 만들고 대신 관리해 왔습니다. 초대 이메일에 누구인지 적혀 있습니다.',
      whatHappens:
        '관리 권한을 받으면 이 기록은 당신의 것이 됩니다. 오늘 이전에 기록된 내용까지 전체 이력을 볼 수 있고, 누가 더 볼 수 있는지도 직접 정합니다.',
      canRemove:
        '그 사람은 계속 도울 수 있도록 케어 서클에 남지만, 개인정보 및 접근에서 언제든 제외할 수 있습니다. 그 결정은 전적으로 당신의 것입니다.',
      signInPrompt:
        '이 초대를 받은 이메일 주소로 로그인하세요. 링크는 해당 계정에서만 작동합니다.',
      signInCta:
        '로그인 또는 계정 만들기',
      claimCta:
        '내 기록의 관리 권한 받기',
      claiming:
        '권한을 받는 중…',
      successTitle:
        '이 기록은 이제 당신의 것입니다',
      successBody:
        '안에 있는 모든 내용이 앱에 있습니다. 오늘 이전에 기록된 것도 포함됩니다.',
      successCta:
        '내 발 건강으로 가기',
      expiredTitle:
        '이 링크는 만료되었습니다',
      expiredBody:
        '링크는 {days}일이 지나면 작동하지 않습니다. 새 링크를 요청할 수 있습니다.',
      usedTitle:
        '이 링크는 이미 사용되었습니다',
      usedBody:
        '기록이 이미 당신의 것이라면 로그인만 하면 됩니다. 그렇지 않으면 새 링크를 요청하세요.',
      mismatchTitle:
        '이 링크는 다른 사람을 위한 것입니다',
      mismatchBody:
        '초대를 받은 주소로 로그인하세요. 누군가를 돕고 있다면 링크를 그 사람에게 전달하세요. 본인만 자신의 기록을 받을 수 있습니다.',
      linkedTitle:
        '계정에 이미 기록이 있습니다',
      linkedBody:
        '이 계정은 이미 다른 환자 기록과 연결되어 있습니다. 두 개의 진료 기록은 자동으로 합쳐지지 않습니다. 의료진에게 문의해 주세요.',
      unknownTitle:
        '처리되지 않았습니다',
      unknownBody:
        '링크를 사용할 수 없었습니다. 새 링크를 요청할 수 있습니다.',
      requestNewCta:
        '새 링크 요청',
      requestNewSent:
        '요청이 기록되었습니다. 기록을 만든 분에게 새 링크를 보내 달라고 요청하세요.',
    },

    historyEyebrow: '건강 이력',
    conditionsTitle: '질환',
    conditionsSubtitle:
      '해당하는 항목을 모두 선택하세요. (?)를 누르면 각 질환의 임상 설명이 나옵니다.',

    medications: {
      title: '복용 약물',
      subtitle:
        '일부 약은 피부에 멍이 드는 방식, 출혈, 상처가 아무는 속도를 바꿉니다. 그래서 알고 있으면 사진을 정확히 판단할 수 있습니다.',
      newQuestion: '이것은 이제 모든 분께 여쭤보는 새로운 질문입니다.',
      question: '복용 중인 주요 약물이 있나요?',
      preferNotToSay: '답하지 않음',
      listTitle: '어떤 약인가요?',
      listHint: '어떤 이름이든 입력하세요. 제안과 일치하지 않아도 됩니다.',
      inputPlaceholder: '약 이름을 입력하세요',
      suggestions: '제안',
      added: '추가됨',
      empty: '아직 추가된 약이 없습니다. 그대로 계속할 수 있습니다.',
      notesLabel: '의료진이 알아야 할 다른 사항',
      notesPlaceholder: '용량, 복용 기간, 최근 변경 사항',
      privacy: '이 내용은 본인과 의료진만 볼 수 있습니다.',
      reviewNone: '주요 약물 없음',
      reviewHidden: '답하지 않음',
      reviewUnanswered: '새 질문 — 답변해 주세요',
      reviewRequiredCta: '새 질문에 답한 뒤 사진을 촬영하세요',
      categories: {
        anticoagulant: '항응고제',
        antiplatelet: '항혈소판제',
        corticosteroid: '스테로이드',
        immunosuppressant: '면역억제제',
        chemotherapy: '항암 치료제',
        insulin: '인슐린',
        oral_diabetes: '당뇨 경구약',
        statin: '콜레스테롤(스타틴)',
        antihypertensive: '혈압약',
        antibiotic: '항생제',
        other: '기타',
      },
    },

    vascularEyebrow: '혈관 선별검사',
    vascularTitle: '말초동맥질환',
    vascularSubtitle:
      '말초동맥질환은 상처 치유 지연 및 절단 위험과 독립적으로 연관되므로 신경병증과 따로 선별합니다.',

    diabetesTitle: '당뇨병 정보',
    diabetesSubtitle: '유형과 진단 연도.',

    glucoseTitle: '혈당 지표',
    glucoseSubtitle: '당화혈색소와 가장 최근의 혈당 측정값. 둘 다 선택 사항입니다.',

    footHistoryTitle: '발 병력',
    footHistorySubtitle: '이전 궤양, 절단 또는 최근 수술.',

    lifestyleTitle: '건강과 생활습관',
    lifestyleSubtitle: '발 저림과 생활습관에 관한 몇 가지 질문입니다.',

    sizingEyebrow: '사이즈',
    sizingTitle: '신발 사이즈',

    painEyebrow: '증상',
    painTitle: '통증 평가',
    painSubtitle: '환자에게 물어보세요: 지금 발에 통증이 있나요?',

    captureEyebrow: '촬영',
    captureTitle: '발 진찰 시작',
    captureSubtitle:
      '컬러 사진 네 장을 촬영하거나 올려 주세요. 양쪽 발의 등과 바닥입니다. 검사 전에는 어떤 사진이든 다시 찍을 수 있습니다.',

    perfusionEyebrow: '선택 사항',
    perfusionTitle: '발 혈액순환',
    perfusionSubtitle:
      '카메라로 양쪽 발의 혈류를 확인합니다. 건너뛰어도 됩니다 — 사진 진찰은 여기에 의존하지 않습니다.',
    perfusionPulse: '맥박 신호',
    perfusionRefill: '모세혈관 재충혈',

    leftFoot: '왼발',
    rightFoot: '오른발',

    nextStepsEyebrow: '검사 완료',
    nextStepsTitle: '검사 저장',
    nextStepsSubtitle:
      '개인 기록에 보관하면 본인과 진료팀이 시간에 따른 변화를 확인할 수 있습니다.',

    productsEyebrow: '치료 옵션',
    productsTitle: '보조 제품',

    timelineEyebrow: '사진 기록',
    timelineTitle: '내 발 검사',
    timelineLoading: '저장된 검사를 불러오는 중…',
    timelineCount: '저장된 검사 {count}건.',
    timelineCountOne: '저장된 검사 1건.',
  },

  common: {
    yes: '예',
    no: '아니요',
    continue: '계속',
    add: '추가',
    remove: '제거',
    save: '저장',
    cancel: '취소',
    close: '닫기',
    retry: '다시 시도',
    loading: '불러오는 중…',
    required: '필수',
    optional: '선택',
    done: '완료',
    somethingWentWrong: '문제가 발생했습니다.',
  },
};

export default ko;
