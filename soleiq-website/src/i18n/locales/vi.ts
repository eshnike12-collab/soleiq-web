import type { Dictionary } from './en'

/** Vietnamese (vi). "Sàng lọc" for screening — the term Vietnamese health
 *  material uses — and never "chẩn đoán", which this product does not claim. */
const vi: Dictionary = {
  meta: {
    title: 'SoleIQ — sàng lọc bàn chân đái tháo đường có AI hỗ trợ',
    description:
      'Sàng lọc bàn chân đái tháo đường có AI hỗ trợ từ bốn ảnh chụp có hướng dẫn bằng điện thoại. Là công cụ sàng lọc và hỗ trợ quyết định, không phải thiết bị chẩn đoán.',
  },

  a11y: { skipToContent: 'Chuyển tới nội dung' },

  language: { label: 'Ngôn ngữ', change: 'Đổi ngôn ngữ', loading: 'Đang tải…' },

  nav: {
    howItWorks: 'Cách hoạt động',
    research: 'Nghiên cứu',
    about: 'Giới thiệu',
    contact: 'Liên hệ',
    inPractice: 'Trong thực tế',
    app: 'Ứng dụng',
    dashboard: 'Bảng điều khiển',
    openApp: 'Mở ứng dụng SoleIQ',
    openDashboard: 'Mở bảng điều khiển SoleIQ của bạn',
    backToTop: 'SoleIQ Health, về đầu trang',
    openMenu: 'Mở menu',
    closeMenu: 'Đóng menu',
    primary: 'Điều hướng chính',
    primaryMobile: 'Điều hướng chính, di động',
    disclaimerShort:
      'Sàng lọc và hỗ trợ quyết định cho bàn chân đái tháo đường. Không phải thiết bị chẩn đoán.',
  },

  hero: {
    slogan: 'Phát hiện sớm, bảo vệ trọn đời',
    body: 'Nền tảng y tế công cộng có AI, nhận ra sự xấu đi sớm hơn, cải thiện phối hợp chăm sóc, tiếp cận những người bệnh đái tháo đường ít được phục vụ, và giảm những ca cắt cụt có thể phòng tránh cùng chi phí y tế.',
    startScreening: 'Bắt đầu sàng lọc',
    openDashboard: 'Mở bảng điều khiển',
    scrollCue: 'Xem cách hoạt động',
  },

  features: {
    heading: 'SoleIQ làm gì',
    capture: {
      kicker: 'Chụp có hướng dẫn',
      headline: 'Phần khó là chụp được một tấm ảnh dùng được. Ứng dụng lo phần đó.',
      body: 'Khung hình, độ rung và ánh sáng đều được kiểm tra ngay trên máy trước khi bất cứ thứ gì được tải lên. Nếu một trong bốn ảnh không dùng được, bạn chỉ chụp lại đúng tấm đó.',
      label: 'Ứng dụng',
      visualLabel:
        'Hình ảnh bằng hạt của việc chụp có hướng dẫn: một chiếc điện thoại giơ trên bàn chân, bốn tấm ảnh hiện lên màn hình.',
    },
    report: {
      kicker: 'Báo cáo lâm sàng',
      headline: 'Bác sĩ của bạn mở một hồ sơ, không phải một tấm ảnh.',
      body: 'Các phát hiện được đánh dấu trên chính ảnh của bạn, toàn bộ phần khai thác bệnh sử phía sau (tiền sử, HbA1c, tình trạng mạch máu, bệnh thần kinh, bản đồ đau), và một trợ lý chỉ giới hạn trong đúng một người bệnh đó.',
      careTeam: 'Nhóm chăm sóc của bạn',
      patientRecord: 'Hồ sơ người bệnh',
      visualLabel:
        'Hình ảnh bằng hạt của báo cáo lâm sàng: một bảng điều khiển nhận hồ sơ, với các phát hiện đánh dấu trên ảnh người bệnh.',
    },
    timeline: {
      kicker: 'Dòng thời gian dùng chung',
      headline: 'Một lần sàng lọc là một điểm. Một chuỗi là một hướng đi.',
      body: 'Mỗi lần kiểm tra được lưu thành một bộ ảnh và mức đánh giá có ghi ngày, nên một thay đổi quá chậm để nhận ra từng ngày sẽ hiện rõ khi đặt cạnh nhau.',
      riskOverTime: 'Nguy cơ theo thời gian',
      visualLabel:
        'Hình ảnh bằng hạt của dòng thời gian dùng chung: các lần sàng lọc ghi ngày dọc theo một trục, với một điểm đánh dấu chạy dọc đường cong nguy cơ đi xuống rồi quay lại.',
    },
  },

  narrative: {
    problem: {
      kicker: 'Vấn đề',
      headline: 'Nó bắt đầu bằng thứ bạn không thể cảm thấy.',
      body: 'Bệnh thần kinh do đái tháo đường lấy đi chính tín hiệu lẽ ra khiến bạn nhìn xuống bàn chân mình. Áp lực, một vết phồng, một vết nứt da: không thứ nào đau, nên không thứ nào khiến bạn phải kiểm tra. Phát hiện sớm, loét bàn chân thường kiểm soát được. Phát hiện muộn thì thường là không.',
    },
    capture: {
      kicker: 'Chụp ảnh',
      headline: 'Bốn ảnh có hướng dẫn. Khoảng 4 phút.',
      body: 'Cả hai bàn chân, mặt trên và lòng bàn chân, bằng chiếc điện thoại bạn đã có. Ứng dụng canh khung từng tấm và giữ bạn ổn định trong lúc chụp. Không phụ kiện, không giá đỡ, không lịch hẹn.',
      app: 'Ứng dụng',
    },
    analysis: {
      kicker: 'Phân tích',
      headline: 'Kiểm tra trên điện thoại của bạn, rồi đọc cùng bệnh sử của bạn.',
      body: 'Việc kiểm tra chất lượng và chuẩn hoá ánh sáng chạy ngay trên máy trước khi bất cứ thứ gì được tải lên. Sau đó một mô hình thị giác đọc cả bốn ảnh cùng phần khai thác của bạn (tiền sử đái tháo đường, HbA1c, các câu hỏi về bệnh động mạch ngoại biên và mạch máu, bệnh thần kinh, tiền sử bàn chân, bản đồ đau) và trả về một trong bốn mức sàng lọc.',
      aiAnalysis: 'Phân tích bằng AI',
      riskLevel: 'Mức nguy cơ',
    },
    handover: {
      kicker: 'Bàn giao',
      headline: 'Bác sĩ của bạn nhận trọn hồ sơ.',
      body: 'Từng mục khai thác, các phát hiện đánh dấu trên chính ảnh của bạn, và toàn bộ bệnh sử, cùng một trợ lý chỉ giới hạn trong hồ sơ đó. Bạn quyết định gửi cho ai.',
      careTeam: 'Nhóm chăm sóc của bạn',
      patientRecord: 'Hồ sơ người bệnh',
    },
    overTime: {
      kicker: 'Theo thời gian',
      headline: 'Một hồ sơ dày lên, và một nguy cơ có thể giảm xuống.',
      body: 'Mỗi lần sàng lọc được lưu thành một bộ ảnh và mức đánh giá có ghi ngày. Một thay đổi quá chậm để nhận ra từng ngày sẽ hiện rõ trên dòng thời gian — và hướng nó đang đi cũng vậy.',
      note: 'Chỉ mang tính minh hoạ. Không phải dữ liệu người bệnh.',
      riskOverTime: 'Nguy cơ theo thời gian',
    },
    close: {
      headline: 'SoleIQ',
      body: 'Sàng lọc và hỗ trợ quyết định cho bàn chân đái tháo đường. Không phải thiết bị chẩn đoán.',
    },
    loading: 'Đang chuẩn bị chuỗi cảnh',
    loadingLong: 'Đang tải chuỗi cảnh cuộn của SoleIQ.',
  },

  journeys: {
    eyebrow: 'Trong thực tế',
    heading: 'Cùng đôi bàn chân ấy, hai bối cảnh, và điều gì thay đổi khi việc kiểm tra diễn ra tại nhà.',
    lede: 'Đây là những lối đi mà SoleIQ được thiết kế xoay quanh. Chúng mô tả cách sản phẩm được dùng, không phải lời khẳng định về kết quả.',
    chooseSetting: 'Chọn bối cảnh',
    withoutTitle: 'Không có SoleIQ',
    withTitle: 'Có SoleIQ',
    changesHeading: 'Điều thực sự thay đổi',
    cadence: 'Nhịp kiểm tra',
    rural: {
      label: 'Nông thôn',
      person:
        'Một người nông dân mắc đái tháo đường típ 2, cảm giác ở cả hai bàn chân đều giảm. Phòng khám bàn chân gần nhất là một chuyến đi, không phải một quãng đường.',
      without: [
        'Áp lực dồn dưới phần trước bàn chân. Vì bệnh thần kinh, không cảm thấy gì cả.',
        'Không có gì khiến phải nhìn xuống. Bàn chân không nằm trong nếp sinh hoạt hằng ngày.',
        'Chỉ phát hiện khi chiếc tất dính vào, hoặc khi người khác nhìn thấy.',
        'Đi khám nghĩa là tiền xe, chi phí, và mất một ngày công.',
        'Lần khám diễn ra sau khi vết thương đã không thể bỏ qua.',
        'Việc chăm sóc bắt đầu đúng ở điểm mà chăm sóc khó nhất.',
      ],
      with: [
        'Sàng lọc tại nhà: bốn tấm ảnh, người thân chụp giúp nếu cần.',
        'Chất lượng ảnh được kiểm tra trên điện thoại trước khi tải lên.',
        'Mức sàng lọc trả về, kèm các phát hiện đánh dấu ngay trên ảnh.',
        'Hồ sơ được gửi trước tới phòng khám hoặc nhân viên y tế lưu động.',
        'Chuyến đi được thực hiện một lần, có chủ đích, với bệnh sử đã sẵn trong tay.',
        'Giữa các lần khám, dòng thời gian vẫn tiếp tục theo dõi.',
      ],
      cadenceWithout: 'Được nhìn khi tình cờ có ai đó để ý',
      cadenceWith: 'Được kiểm tra theo lịch, ngay tại nhà',
      visualLabel: 'Hình ảnh bằng hạt của một ngôi nhà giữa hàng cây, với lá rơi trong không trung.',
    },
    urban: {
      label: 'Thành thị',
      person:
        'Một người mắc đái tháo đường típ 2 đi làm hằng ngày, có vết chai cứ tái đi tái lại. Vẫn có lịch hẹn khám bàn chân — rồi sẽ đến lượt.',
      without: [
        'Vết chai dày lên và vùng da quanh đổi màu. Rất dễ bỏ qua.',
        'Đặt lịch khám bàn chân nghĩa là xếp vào hàng chờ.',
        'Lịch hẹn đến, hoặc bị dời, hoặc bị lỡ.',
        'Trong phòng khám, bác sĩ thấy bàn chân của hôm nay và không có gì trước đó.',
        'Lời dặn được đưa ra; việc theo dõi phụ thuộc vào việc còn nhớ trước đó trông ra sao.',
        'Thay đổi kế tiếp không được đo lại cho tới lần hẹn sau.',
      ],
      with: [
        'Sàng lọc tại nhà mất vài phút, trước giờ đi làm.',
        'Các phát hiện được đánh dấu trên chính ảnh của người bệnh.',
        'Mức đánh giá cho biết đây là kiểm tra lại sau một tuần hay cần đặt hẹn ngay.',
        'Suất khám dành cho những người mà mức đánh giá nói rằng họ cần.',
        'Bác sĩ mở một chuỗi ảnh có ghi ngày thay vì một trang trắng.',
        'Việc theo dõi được đo bằng hình ảnh, không phải bằng trí nhớ.',
      ],
      cadenceWithout: 'Được kiểm tra vào các lần hẹn',
      cadenceWith: 'Được kiểm tra cả giữa những lần hẹn',
      visualLabel:
        'Hình ảnh bằng hạt của đường chân trời thành phố dưới bầu trời chuyển từ ngày sang đêm.',
    },
    comparison: [
      {
        q: 'Ai nhận ra trước tiên',
        without: 'Người tình cờ nhìn thấy — mà với bệnh thần kinh thì thường là không ai cả.',
        with: 'Một lần kiểm tra định kỳ, không phụ thuộc vào việc có cảm thấy hay không.',
      },
      {
        q: 'Bác sĩ nhìn thấy gì',
        without: 'Bàn chân đúng như hôm nay.',
        with: 'Một chuỗi có ghi ngày, nhờ đó thấy được hướng đi.',
      },
      {
        q: 'Điều gì dẫn tới một lần khám',
        without: 'Một vết thương đã trở nên rõ ràng.',
        with: 'Một mức sàng lọc, kèm theo lý do.',
      },
      {
        q: 'Một chuyến đi tốn những gì',
        without: 'Vẫn ngần ấy, dù hoá ra có cần thiết hay không.',
        with: 'Vẫn ngần ấy, nhưng đi vì một lý do bạn chỉ ra được.',
      },
    ],
  },

  progression: {
    eyebrow: 'Tiến triển',
    heading: 'Toàn bộ chặng đường, và phần mà một chiếc máy ảnh với tới được.',
    lede: 'Loét bàn chân đái tháo đường không xuất hiện đột ngột; nó tiến triển. Chọn bất kỳ độ nào để xem điều gì là đúng với bàn chân ở thời điểm đó, và một tấm ảnh có thể cùng không thể xác định được gì ở đó.',
    gradesLabel: 'Phân độ Wagner',
    grade: 'Độ',
    gradesRange: 'Độ {from}–{to}',
    whatPhotoShows: 'Ảnh cho thấy gì',
    whatSoleIQDoes: 'SoleIQ làm gì',
    trajectory: 'Diễn tiến điển hình trong trường hợp xấu nhất',
    play: 'Chạy phần trình bày',
    pause: 'Tạm dừng',
    windows: {
      soleiq: { title: 'Nơi SoleIQ phát huy tác dụng', line: 'Bắt được nó trước khi da kịp rách.' },
      standard: {
        title: 'Nơi việc chăm sóc thường mới bắt đầu',
        line: 'Đến lúc đau hoặc có mùi thì tổn thương đã xảy ra rồi.',
      },
    },
    caveat:
      'Wagner phân độ mức nặng tại một thời điểm; đó không phải một trình tự thời gian đã được kiểm chứng. Các khoảng thời gian ở trên mô tả diễn tiến xấu nhất ở một bàn chân không được điều trị hoặc kiểm soát kém. Nhiều người đến khám khi đã ở độ 2 hoặc 3, và với việc giảm tải áp lực, tưới máu và kiểm soát nhiễm khuẩn tốt, khoảng 60 đến 80 phần trăm ổ loét lành trong 12 đến 20 tuần mà không hề tiến triển thêm. Ở bàn chân thiếu máu, cùng trình tự ấy có thể rút lại còn vài ngày. SoleIQ là công cụ hỗ trợ theo dõi và phân loại, không phải thiết bị chẩn đoán, và nó không phân độ vết thương.',
    stages: [
      {
        name: 'Chưa có tổn thương hở',
        plain: 'Da còn nguyên, bàn chân có nguy cơ',
        what: 'Da chưa rách. Bên dưới có thể đang hình thành vết chai, biến dạng hoặc một điểm chịu áp lực — và với bệnh thần kinh, không điều nào trong số đó được cảm thấy.',
        camera:
          'Đây chính là lúc một tấm ảnh hữu ích nhất, bởi chẳng có gì để cảm thấy và cũng chẳng ai đang tìm gì. Thứ nó ghi lại là một mốc so sánh: vết chai, màu sắc, hình dạng — kèm ngày tháng.',
        soleiq:
          'Đây là độ mà SoleIQ được tạo ra để phục vụ. Sàng lọc đều đặn xác lập bàn chân này bình thường trông ra sao, để một thay đổi có cái mà so.',
        whenLabel: 'Mốc so sánh',
        whenDetail: 'da còn nguyên, bàn chân có nguy cơ',
        toNext: 'Sự kiện khởi phát — vài ngày đến vài tuần',
      },
      {
        name: 'Loét nông',
        plain: 'Da đã rách',
        what: 'Mất da toàn bộ bề dày nhưng chưa tới gân, bao khớp hay xương. Thường không đau, và đó chính là lý do nó không được báo.',
        camera:
          'Nhìn thấy được. Chỗ da rách, bờ của nó và vùng đỏ xung quanh đều là dấu hiệu bề mặt, mà dấu hiệu bề mặt lại chính là thứ máy ảnh đọc tốt.',
        soleiq:
          'Sàng lọc ở độ này trả về một mức nói rằng hãy đi khám, với phát hiện được đánh dấu trên chính ảnh của người bệnh và những tuần trước đó đặt bên cạnh.',
        whenLabel: 'Tháng 0',
        whenDetail: 'loét khởi phát, đồng hồ bắt đầu chạy',
        toNext: 'Khoảng 2 đến 8 tuần',
      },
      {
        name: 'Loét sâu',
        plain: 'Tới gân hoặc xương',
        what: 'Ổ loét lan tới gân, bao khớp hoặc xương, chưa có áp xe hay viêm xương tuỷ.',
        camera:
          'Miệng loét nhìn thấy được; độ sâu thì không. Không tấm ảnh nào cho biết vết thương đi sâu tới đâu, và đây là độ mà giới hạn ấy bắt đầu có ý nghĩa.',
        soleiq:
          'Được đánh dấu khẩn và bàn giao kèm bệnh sử. Độ sâu là kết quả thăm dò do người có chuyên môn thực hiện — việc của ứng dụng là bảo đảm có ai đó đang cầm que thăm.',
        whenLabel: 'Tháng 0,5 đến 2',
        whenDetail: 'tính từ lần da rách đầu tiên',
        toNext: 'Khoảng 1 đến 3 tháng',
      },
      {
        name: 'Viêm xương hoặc áp xe',
        plain: 'Nhiễm khuẩn đã tới xương',
        what: 'Nhiễm khuẩn sâu: áp xe, viêm xương tuỷ, hoặc viêm gân nhiễm khuẩn. Đây là lúc câu hỏi chuyển từ chữa lành vết thương sang giữ lại bàn chân.',
        camera:
          'Vượt quá tầm một chiếc máy ảnh. Việc xương bị ảnh hưởng được xác định bằng thăm dò, chẩn đoán hình ảnh và xét nghiệm máu — không phải bằng cách nhìn da.',
        soleiq:
          'Đến đây thì không còn gì là chuyện sàng lọc nữa. Giá trị mà SoleIQ có thể thêm vào ở độ này đã tiêu hết từ nhiều tháng trước, ở độ 0 và 1.',
        whenLabel: 'Tháng 2 đến 5',
        whenDetail: 'xương bị ảnh hưởng, que thăm chạm xương',
        toNext: 'Khoảng 1 đến 3 tháng',
      },
      {
        name: 'Hoại tử một phần',
        plain: 'Mô chết, chi bị đe doạ',
        what: 'Hoại tử khu trú — thường ở phần trước bàn chân hoặc các ngón. Các quyết định tái thông mạch và phẫu thuật được đưa ra dưới sức ép thời gian.',
        camera: 'Vượt quá tầm máy ảnh, và vượt quá phạm vi sàng lọc. Đây là chăm sóc nội trú.',
        soleiq:
          'Ngoài phạm vi. Được đưa vào đây vì chặng đường phải được cho thấy trọn vẹn thì mới đáng tin.',
        whenLabel: 'Tháng 4 đến 9',
        whenDetail: 'mô chết, chi bị đe doạ',
        toNext: 'Vài ngày đến vài tuần',
      },
      {
        name: 'Hoại tử lan rộng',
        plain: 'Toàn bộ bàn chân',
        what: 'Hoại tử toàn bộ bàn chân. Thuộc phạm vi cắt cụt lớn.',
        camera: 'Vượt quá tầm một chiếc máy ảnh.',
        soleiq: 'Ngoài phạm vi — và đây chính là kết cục mà hai độ đầu tiên tồn tại để ngăn ngừa.',
        whenLabel: 'Tháng 6 đến 18',
        whenDetail: 'thuộc phạm vi cắt cụt lớn',
        toNext: null as string | null,
      },
    ],
  },

  research: {
    eyebrow: 'Nghiên cứu',
    heading: 'Công việc phía sau việc sàng lọc, và phần tài liệu mà nó đứng trong đó.',
    lede: 'Bài báo của chúng tôi ở bên dưới. Dưới nữa là phần tìm kiếm trực tiếp trong tài liệu đã công bố, để riêng và ghi rõ, để hai thứ không bao giờ bị lẫn.',
    advisors:
      'SoleIQ đã nhận được tư vấn từ hơn 50 nhà nghiên cứu, bác sĩ và phẫu thuật viên làm việc trong lĩnh vực trí tuệ nhân tạo, kỹ thuật y sinh và y học lâm sàng trên cả nước.',
    searchHeading: 'Tìm trong tài liệu',
    searchPlaceholder: 'diabetic foot ulcer, offloading, neuropathy screening',
    searchHint:
      'Tìm một chủ đề, chẳng hạn diabetic foot ulcer, offloading hoặc neuropathy screening, và các bản ghi phù hợp sẽ hiện ở đây.',
    searching: 'Đang tìm trong Europe PMC',
    searchError: 'Đã có lỗi khi chạy tìm kiếm đó.',
    noResults: 'Không có bản ghi nào khớp với “{query}”. Hãy thử một từ rộng hơn.',
    resultsFor: '{count} kết quả cho {query}',
    openAccess: 'Truy cập mở',
    readFullText: 'Đọc toàn văn',
    abstract: 'Tóm tắt',
    readFullAbstract: 'Đọc toàn bộ tóm tắt',
    showLess: 'Thu gọn',
    correspondingAuthor: 'Tác giả liên hệ',
    topics: 'Chủ đề',
    status: { published: 'Đã xuất bản', preprint: 'Bản tiền ấn phẩm' },
  },

  about: {
    eyebrow: 'Giới thiệu',
    heading:
      'Phần lớn ổ loét bàn chân đái tháo đường được phát hiện muộn. Không phải vì chúng bị giấu, mà vì chẳng ai đang nhìn.',
    paragraphs: [
      'Bệnh thần kinh do đái tháo đường lấy đi chính tín hiệu lẽ ra khiến một người nhìn xuống bàn chân mình. Áp lực, một vết phồng, một vết nứt da: không thứ nào đau, nên không thứ nào khiến phải kiểm tra. Đến khi bàn chân được khám, câu hỏi thường đã không còn là “cái này có phải chuyện gì không?” mà thành “giữ lại được bao nhiêu?”',
      'Khám bàn chân trên lâm sàng giải quyết được điều này, và đó không phải nút thắt mà chúng tôi có thể gỡ. Lịch hẹn thì ít, đi lại thì tốn kém, và khoảng cách giữa các lần khám lại chính là nơi vấn đề hình thành.',
      'SoleIQ khép lại khoảng cách đó bằng thứ mà mọi người bệnh đều đã có: một chiếc máy ảnh điện thoại và vài phút. Bốn tấm ảnh, đọc cùng bệnh sử vốn quyết định nguy cơ, cho ra một mức sàng lọc mà người ta có thể hành động theo, và một hồ sơ mà bác sĩ tin đủ để làm việc trên đó.',
      'Chúng tôi thận trọng với những gì mình tuyên bố. SoleIQ sàng lọc; nó không chẩn đoán. Nó được làm ra để đưa người ta đến với chăm sóc sớm hơn và với thông tin tốt hơn, chứ không phải để giữ họ tránh xa.',
      'Chính giới hạn ấy định hình sản phẩm. Mô hình không bao giờ nhìn thấy tấm ảnh mà điện thoại đã đánh giá là không dùng được. Các phát hiện được hiển thị trên chính ảnh của người bệnh, để người ta thấy được hệ thống đã thấy gì. Mỗi lần sàng lọc đều ở lại trong dòng thời gian, vì một khung hình đơn lẻ là tín hiệu yếu hơn một chuỗi. Và hồ sơ thuộc về người bệnh, người quyết định bác sĩ nào được xem.',
    ],
    team: 'Đội ngũ',
    roles: { founder: 'Nhà sáng lập kiêm CEO, SoleIQ Health' },
    bios: {
      eshaan:
        'Dẫn dắt nền tảng từ đầu đến cuối: mô hình sàng lọc, sản phẩm, và chương trình nghiên cứu phía sau. Đã công bố về phòng ngừa bàn chân đái tháo đường có AI dẫn hướng cùng TS.BS. David G. Armstrong.',
    },
    onLinkedIn: '{name} trên LinkedIn',
  },

  blog: {
    eyebrow: 'Bài viết',
    heading: 'Ghi chép của những người đang xây dựng nó.',
    defaultCategory: 'Ghi chép',
    readingTime: 'đọc {minutes} phút',
    minutesShort: '{minutes} phút',
    readMore: 'Đọc',
    closeArticle: 'Đóng bài viết',
    originalLanguage: 'Bài viết được hiển thị bằng ngôn ngữ đã viết.',
  },

  contact: {
    eyebrow: 'Liên hệ',
    heading: 'Hãy liên hệ với chúng tôi.',
    body: 'Hợp tác lâm sàng, cộng tác nghiên cứu, báo chí, hoặc một câu hỏi về sản phẩm. Nội dung này đến thẳng chỗ chúng tôi.',
    orEmail: 'Hoặc gửi email tới',
    noMedicalDetails:
      'Vui lòng không gửi thông tin y tế hay hình ảnh qua biểu mẫu này. Đây không phải kênh lâm sàng và không được theo dõi cho các trường hợp khẩn.',
    name: 'Họ tên',
    email: 'Email',
    message: 'Nội dung',
    send: 'Gửi tin nhắn',
    sending: 'Đang gửi…',
    sent: 'Đã gửi tin nhắn.',
    sentBody: 'Cảm ơn bạn. Chúng tôi sẽ trả lời tới {email}.',
    sendAnother: 'Gửi tin khác',
    errors: {
      name: 'Vui lòng cho chúng tôi biết tên bạn.',
      email: 'Vui lòng nhập một địa chỉ email.',
      emailInvalid: 'Địa chỉ email này có vẻ chưa đúng.',
      message: 'Vui lòng viết nội dung.',
      failed: 'Không gửi được. Vui lòng gửi email cho chúng tôi.',
    },
  },

  footer: {
    heading: 'Chân trang',
    tagline: 'Sàng lọc bàn chân đái tháo đường có AI hỗ trợ từ bốn ảnh chụp có hướng dẫn bằng điện thoại.',
    openApp: 'Mở ứng dụng',
    dashboard: 'Bảng điều khiển',
    emailUs: 'Gửi email cho chúng tôi',
    privacy: 'Quyền riêng tư',
    terms: 'Điều khoản',
    nav: 'Chân trang',
    onNetwork: 'SoleIQ Health trên {network}',
    disclaimer:
      'SoleIQ là công cụ sàng lọc và hỗ trợ quyết định. Đây không phải thiết bị chẩn đoán, không đưa ra lời khuyên y tế, và không thay thế đánh giá của người có chuyên môn. Nếu bạn có vết thương, nhiễm khuẩn, đau đột ngột, hoặc thay đổi màu sắc hay nhiệt độ ở một bàn chân, hãy đi khám ngay.',
    copyright: '© {year} SoleIQ Health',
  },

  screens: {
    leftFootSole: 'Bàn chân trái, lòng bàn chân',
    fitFootInFrame: 'Đặt bàn chân vừa trong khung',
    photoQuality: 'Chất lượng ảnh',
    wholeFootInFrame: 'Cả bàn chân trong khung',
    sharpEnough: 'Đủ nét để phân tích',
    lightingNormalised: 'Đã chuẩn hoá ánh sáng',
    retakeTooDark: 'Chụp lại chân phải, quá tối',
    analysing: 'Đang phân tích',
    inputs: 'Dữ liệu đầu vào',
    diabetesHistory: 'Tiền sử đái tháo đường',
    vascularAnswers: 'Câu trả lời về mạch máu',
    neuropathy: 'Bệnh thần kinh',
    painMap: 'Bản đồ đau',
    screeningLevel: 'Mức sàng lọc',
    watch: 'Theo dõi',
    resultBody:
      'Có hai vùng cần để mắt tới. Kiểm tra lại sau 7 ngày, và đặt hẹn khám nếu một trong hai thay đổi.',
    shareRecord: 'Chia sẻ hồ sơ của bạn',
    podiatryClinic: 'Phòng khám bàn chân của bạn',
    fullHistory: 'Toàn bộ bệnh sử, từng tấm ảnh, từng mức sàng lọc.',
    sendRecord: 'Gửi hồ sơ',
    clinicianView: 'Chế độ xem của bác sĩ',
    clinicalReport: 'Báo cáo lâm sàng',
    photoComparison: 'So sánh ảnh',
    perPatientAssistant: 'Trợ lý theo từng người bệnh',
    yourTimeline: 'Dòng thời gian của bạn',
    today: 'Hôm nay',
    levels: { clear: 'Không có phát hiện', watch: 'Theo dõi', soon: 'Sớm', urgent: 'Khẩn' },
  },
}

export default vi
