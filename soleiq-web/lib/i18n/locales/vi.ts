import type { Dictionary } from './en';

/**
 * Vietnamese (vi).
 *
 * "Sàng lọc" for screening, kept apart from "chẩn đoán" throughout. The
 * patient is addressed as bạn, which is the register Vietnamese health apps
 * use with adults without presuming an age relationship.
 */
const vi: Dictionary = {
  brand: {
    name: 'SoleIQ',
    health: 'Health',
    slogan: 'Phát hiện sớm, bảo vệ trọn đời',
  },

  nav: {
    website: 'Trang web',
    websiteAria: 'Đi tới soleiqhealth.com',
    home: 'Trang chính',
    dashboard: 'Bảng của tôi',
    clinical: 'SoleIQ Lâm sàng',
    signOut: 'Đăng xuất',
    signedInAs: 'Đang đăng nhập bằng {email}',
    yourAccount: 'tài khoản của bạn',
    noMembership: 'chưa liên kết bệnh viện',
    feedback: 'Góp ý',
    adminConsole: 'Bảng quản trị',
    doctorDashboard: 'Bảng của bác sĩ',
    footHealth: 'Sức khỏe bàn chân của tôi',
  },

  language: {
    label: 'Ngôn ngữ',
    change: 'Đổi ngôn ngữ',
    loading: 'Đang tải ngôn ngữ…',
  },

  flow: {
    back: 'Quay lại',
    backHint: 'Quay lại (←)',
    continue: 'Tiếp tục',
    skip: 'Bỏ qua',
    step: 'Bước {current} / {total}',
    encouragementStart: 'Bắt đầu nào',
    encouragementUnderway: 'Bạn đang đi đúng hướng',
    encouragementGood: 'Tiến triển tốt',
    encouragementAlmost: 'Sắp xong rồi',
    encouragementDone: 'Xong hết — làm tốt lắm!',
    disclaimer:
      'SoleIQ là công cụ theo dõi sức khỏe và không thay thế chẩn đoán y khoa chuyên môn.',
  },

  welcome: {
    intro:
      'Sàng lọc bàn chân đái tháo đường có hỗ trợ của AI — hỗ trợ quyết định lâm sàng cho chăm sóc ban đầu và khám bàn chân.',
    start: 'Bắt đầu khám bệnh nhân',
    duration: 'Khoảng 4 phút mỗi bệnh nhân. Dùng trong lâm sàng.',
  },

  auth: {
    welcome: 'Chào mừng',
    chooseSubtitle: 'Hãy cho chúng tôi biết bạn là ai để chuẩn bị đúng phần dành cho bạn.',
    iAmPatient: 'Tôi là bệnh nhân',
    iAmPatientBody: 'Kiểm tra bàn chân bằng ảnh có hướng dẫn và lưu kết quả ở một nơi.',
    iAmDoctor: 'Tôi là bác sĩ hoặc người chăm sóc',
    iAmDoctorBody: 'Theo dõi các lần kiểm tra bàn chân của bệnh nhân, dòng thời gian ảnh và bản tóm tắt bằng AI.',
    sendingReset: 'Đang gửi liên kết…',
    resetSent: 'Nếu có tài khoản cho {email}, liên kết đặt lại đang được gửi — hãy xem cả thư rác. Mở nó trên thiết bị này; liên kết hết hạn sau một giờ.',
    signIn: 'Đăng nhập',
    createAccount: 'Tạo tài khoản',
    titlePatient: 'Đăng nhập SoleIQ',
    titleDoctor: 'Đăng nhập cho bác sĩ / người chăm sóc',
    subtitlePatient:
      'Các lần kiểm tra bàn chân được lưu vào tài khoản, nên lần sau bạn vẫn thấy chúng ở đây.',
    subtitleDoctor: 'Bảng của bạn hiển thị những bệnh nhân được phân công cho bạn.',
    email: 'Email',
    password: 'Mật khẩu',
    showPassword: 'Hiện mật khẩu',
    hidePassword: 'Ẩn mật khẩu',
    passwordHint: 'Hơn 6 ký tự, có ít nhất một chữ số hoặc ký hiệu.',
    passwordOk: 'Mật khẩu đạt yêu cầu.',
    forgot: 'Quên mật khẩu?',
    working: 'Đang xử lý…',
    signedIn: 'Đăng nhập thành công',
    redirecting: 'Đang đưa bạn tới bảng điều khiển…',
    resend: 'Gửi lại email xác nhận',
    resendSent: 'Đã gửi email xác nhận — hãy xem hộp thư đến (và cả thư rác).',
    accountCreated:
      'Đã tạo tài khoản — chúng tôi đã gửi email xác nhận. Mở liên kết trong đó rồi đăng nhập tại đây.',
    emailConfirmed: 'Email đã được xác nhận — hãy đăng nhập bên dưới.',
    staffNote:
      'Quyền của bác sĩ và quản trị viên chỉ đến từ lời mời có thời hạn của bệnh viện. Bác sĩ mới vẫn ở trạng thái chưa kích hoạt cho đến khi bệnh viện xác minh.',
    patientNote:
      'Tài khoản mới không tự chọn vai trò nhân viên. Quyền truy cập bệnh viện được thêm qua lời mời hoặc quy trình liên kết hồ sơ bệnh nhân.',
    errorEmailFirst: 'Hãy nhập email của bạn trước.',
    errorForgotEmailFirst:
      'Hãy nhập email trước, rồi chạm vào "Quên mật khẩu?".',
    errorSignInFailed: 'Không đăng nhập được.',
    errorUnconfirmed:
      'Email của bạn chưa được xác nhận. Hãy mở liên kết xác nhận chúng tôi đã gửi — hoặc gửi lại bên dưới.',
    errorStaffInviteOnly:
      'Tài khoản nhân viên được tạo từ lời mời của bệnh viện. Hãy xin lời mời từ quản trị viên bệnh viện của bạn.',
    errorSendFailed:
      'Dịch vụ email của chúng tôi hiện chưa gửi được — hãy thử lại sau vài phút.',
    errorRateLimited:
      'Quá nhiều email được yêu cầu trong thời gian ngắn. Hãy đợi một lát rồi thử lại.',
    errorRecoveryFailed: 'Yêu cầu khôi phục không thành công.',
    errorResendFailed: 'Không gửi lại được email.',
  },

  reset: {
    title: 'Đặt mật khẩu mới',
    subtitle: 'Hãy chọn mật khẩu bạn chưa từng dùng cho tài khoản này.',
    newPassword: 'Mật khẩu mới',
    confirmPassword: 'Xác nhận mật khẩu mới',
    mismatch: 'Hai mật khẩu không khớp nhau.',
    submit: 'Cập nhật mật khẩu',
    submitting: 'Đang cập nhật…',
    done: 'Đã cập nhật mật khẩu',
    doneBody: 'Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.',
    expired: 'Liên kết này đã hết hạn',
    expiredBody:
      'Liên kết mật khẩu chỉ dùng được một lần và ngừng hoạt động sau một giờ. Hãy yêu cầu liên kết mới, nó sẽ tới ngay.',
    requestNew: 'Gửi liên kết mới',
    backToSignIn: 'Quay lại đăng nhập',
    sameBrowser: 'Liên kết này phải được mở trong chính trình duyệt đã yêu cầu nó. Hãy yêu cầu email mới và mở trên thiết bị này.',
    openFromEmail: 'Hãy mở liên kết đặt lại trong email để tạo mật khẩu mới, hoặc yêu cầu liên kết mới từ trang đăng nhập.',
    samePassword: 'Đó đã là mật khẩu hiện tại của bạn — hãy chọn mật khẩu khác.',
    checking: 'Đang kiểm tra liên kết của bạn…',
  },

  screens: {
    consentEyebrow: 'Bước 1',
    consentTitle: 'Sự đồng ý của bệnh nhân',
    consentSubtitle:
      'Trước khi tiếp tục, hãy xác nhận với bệnh nhân rằng họ đồng ý với từng mục dưới đây.',

    returningEyebrow: 'Chào bạn trở lại',
    returningTitle: 'Xem lại câu trả lời',
    returningSubtitle:
      'Chúng tôi đã lưu mọi thứ từ lần kiểm tra trước. Chỉ cần cập nhật những gì đã thay đổi — phần còn lại được giữ nguyên. Ảnh thì lần nào cũng chụp mới.',

    intakeEyebrow: 'Tiếp nhận bệnh nhân',
    nameTitle: 'Tên bệnh nhân',
    nameSubtitle: 'Và nơi ở của bệnh nhân, để đưa ra gợi ý chuyển tuyến.',

    demographicsTitle: 'Thông tin nhân khẩu của bệnh nhân',
    demographicsSubtitle:
      'Dùng để điều chỉnh giả định theo quần thể và kiểm tra tính công bằng của mô hình.',

    historyEyebrow: 'Tiền sử sức khỏe',
    conditionsTitle: 'Bệnh lý',
    conditionsSubtitle:
      'Chọn tất cả những mục phù hợp. Chạm vào (?) để xem chi tiết lâm sàng của từng bệnh.',

    vascularEyebrow: 'Sàng lọc mạch máu',
    vascularTitle: 'Bệnh động mạch ngoại biên',
    vascularSubtitle:
      'Bệnh động mạch ngoại biên liên quan độc lập tới việc vết thương lâu lành và nguy cơ cắt cụt — nên chúng tôi sàng lọc riêng, tách khỏi bệnh thần kinh.',

    diabetesTitle: 'Chi tiết đái tháo đường',
    diabetesSubtitle: 'Loại và năm chẩn đoán.',

    glucoseTitle: 'Chỉ số đường huyết',
    glucoseSubtitle: 'HbA1c và kết quả đo đường huyết gần nhất. Cả hai đều không bắt buộc.',

    footHistoryTitle: 'Tiền sử bàn chân',
    footHistorySubtitle: 'Loét trước đây, cắt cụt, hoặc phẫu thuật gần đây.',

    lifestyleTitle: 'Sức khỏe & lối sống',
    lifestyleSubtitle: 'Tê bì ở bàn chân, cùng vài câu hỏi về lối sống.',

    sizingEyebrow: 'Cỡ',
    sizingTitle: 'Cỡ giày của bạn',

    painEyebrow: 'Triệu chứng',
    painTitle: 'Đánh giá đau',
    painSubtitle: 'Hãy hỏi bệnh nhân: hiện giờ bàn chân có đau không?',

    captureEyebrow: 'Chụp ảnh',
    captureTitle: 'Bắt đầu khám bàn chân',
    captureSubtitle:
      'Chụp hoặc tải lên bốn ảnh màu: mu và lòng của mỗi bàn chân. Bạn có thể chụp lại bất kỳ ảnh nào trước khi kiểm tra.',

    perfusionEyebrow: 'Không bắt buộc',
    perfusionTitle: 'Tuần hoàn bàn chân',
    perfusionSubtitle:
      'Dùng camera kiểm tra lưu lượng máu ở từng bàn chân. Có thể bỏ qua — việc khám bằng ảnh không phụ thuộc vào phần này.',
    perfusionPulse: 'Tín hiệu mạch',
    perfusionRefill: 'Đổ đầy mao mạch',

    leftFoot: 'Bàn chân trái',
    rightFoot: 'Bàn chân phải',

    nextStepsEyebrow: 'Đã kiểm tra xong',
    nextStepsTitle: 'Lưu lần kiểm tra',
    nextStepsSubtitle:
      'Giữ nó trong hồ sơ riêng của bạn để bạn và nhóm chăm sóc theo dõi được thay đổi theo thời gian.',

    productsEyebrow: 'Lựa chọn điều trị',
    productsTitle: 'Sản phẩm hỗ trợ',

    timelineEyebrow: 'Lịch sử ảnh',
    timelineTitle: 'Các lần kiểm tra bàn chân',
    timelineLoading: 'Đang tải các lần kiểm tra đã lưu…',
    timelineCount: '{count} lần kiểm tra đã lưu.',
    timelineCountOne: '1 lần kiểm tra đã lưu.',
  },

  common: {
    yes: 'Có',
    no: 'Không',
    save: 'Lưu',
    cancel: 'Hủy',
    close: 'Đóng',
    retry: 'Thử lại',
    loading: 'Đang tải…',
    required: 'Bắt buộc',
    optional: 'Không bắt buộc',
    done: 'Xong',
    somethingWentWrong: 'Đã xảy ra sự cố.',
  },
};

export default vi;
