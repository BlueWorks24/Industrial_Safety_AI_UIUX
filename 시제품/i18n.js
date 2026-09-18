// 근로자 앱 화면 말 — 한국어 · 베트남어 · 영어.
// 경보 문구는 미리 번역해 둔 문구를 쓴다 (2026-09-17 결정). 공지·의견 본문만 "AI 번역"으로 보인다.
// 베트남어·영어는 시제품용 초벌 번역이다 — 원어민 검수 전.

const LANGS = [
  { id: 'ko', name: '한국어' },
  { id: 'vi', name: 'Tiếng Việt' },
  { id: 'en', name: 'English' },
];

const TX = {
  // 머리글 · 제목
  'app.sub': ['안전 경보', 'Cảnh báo an toàn', 'Safety alerts'],
  'home.t': ['홈', 'Trang chủ', 'Home'],
  'i.hist': ['최근 30일 동안 받은 경보와, 누가 조치했는지 보여요.', 'Cảnh báo trong 30 ngày qua và ai đã xử lý.', 'Alerts from the last 30 days and who handled them.'],
  'i.notice': ['대표님이 올린 안전 수칙이에요. 읽고 "읽었어요"를 눌러 주세요.', 'Quy tắc an toàn do giám đốc đăng. Đọc xong hãy nhấn "Tôi đã đọc".', 'Safety rules from your employer. Tap "I have read this" after reading.'],
  'i.voice': ['위험해 보이거나 바꾸면 좋을 것을 대표님께 알려 주세요.', 'Hãy báo cho giám đốc điều có vẻ nguy hiểm hoặc nên thay đổi.', 'Tell your employer about anything unsafe or that should change.'],
  'i.set': ['경보가 어떻게 울릴지, 화면을 어떤 말로 볼지 정해요.', 'Chọn cách cảnh báo kêu và ngôn ngữ hiển thị.', 'Choose how alerts ring and which language to use.'],
  'today.date': ['9월 17일 목요일', 'Thứ Năm, 17/9', 'Thursday, Sep 17'],
  'today.shift': ['주간 근무', 'Ca ngày', 'Day shift'],
  'mon.t': ['센서 감시', 'Giám sát cảm biến', 'Sensor watch'],
  'mon.ok': ['감시 중', 'Theo dõi', 'Watching'],
  'mon.repair': ['수리 중', 'Đang sửa', 'In repair'],
  'mon.unknown': ['모름', 'Không rõ', 'No data'],
  'h.partial': ['일부 센서 값 모름', 'Không rõ một số cảm biến', 'Some sensors: no data'],
  'h.partialSub': ['나머지는 이상 없음 · {t}', 'Còn lại bình thường · {t}', 'Others normal · {t}'],
  'h.unknownNote': ['값이 안 오는 센서는 그동안 경보가 못 울려요. 대표님과 운영자에게 알렸어요.', 'Cảm biến không có số liệu sẽ không thể cảnh báo. Đã báo giám đốc và người vận hành.', 'A sensor with no data cannot alert. Your employer and the operator were told.'],
  'h.repairNote': ['수리 중인 센서는 고칠 때까지 경보가 울리지 않아요.', 'Cảm biến đang sửa sẽ không cảnh báo cho đến khi sửa xong.', 'A sensor in repair will not alert until it is fixed.'],
  'live.on': ['알림 켜짐', 'Thông báo bật', 'Alerts on'],
  'live.v': ['알림 켜짐 · 진동', 'Bật · chỉ rung', 'Alerts on · vibrate'],
  'mon.abn': ['이상', 'Bất thường', 'Abnormal'],
  'mon.acked': ['조치됨', 'Đã xử lý', 'Handled'],
  'mon.note': ['값은 대표님과 운영자가 봐요. 이상이 생기면 이 휴대폰이 울려요.', 'Giám đốc và người vận hành xem số liệu. Có bất thường, điện thoại này sẽ kêu.', 'Your employer and the operator see the readings. If something is wrong, this phone will ring.'],
  'feed.t': ['최근 소식', 'Tin gần đây', 'Recent'],
  'feed.notice': ['안전 공지', 'Thông báo an toàn', 'Safety notice'],
  'feed.alarm': ['{what} 경보 · {who} 조치', 'Cảnh báo {what} · {who} xử lý', '{what} alert · handled by {who}'],
  'feed.alarmNo': ['{what} 경보 · 아무도 안 누름', 'Cảnh báo {what} · không ai xử lý', '{what} alert · nobody handled'],
  'feed.alarmRepair': ['{what} 경보 · 센서 수리로 닫힘', 'Cảnh báo {what} · đóng do sửa cảm biến', '{what} alert · closed for sensor repair'],
  'feed.reply': ['대표님이 내 의견에 답했어요', 'Giám đốc đã trả lời ý kiến của bạn', 'Your employer replied to your feedback'],
  'feed.more': ['받은 경보 모두 보기', 'Xem tất cả cảnh báo', 'See all alerts'],
  // 처음 설치
  'ob.title': ['안전 경보 앱', 'Ứng dụng cảnh báo an toàn', 'Safety Alert'],
  'ob.lang': ['언어를 고르세요', 'Chọn ngôn ngữ', 'Choose your language'],
  'ob.how': ['공장에서 받은 QR을 찍거나\n초대 링크를 누르면 들어와요.', 'Quét mã QR hoặc nhấn vào\nliên kết mời từ nơi làm việc.', 'Scan the QR code or tap\nthe invite link from your workplace.'],
  'ob.scan': ['QR 찍기', 'Quét mã QR', 'Scan QR code'],
  'ob.owner': ['공장주 로그인', 'Chủ nhà máy đăng nhập', 'Factory owner login'],
  'ob.noinvite': ['초대를 못 받았나요? 대표님께 말해 주세요.', 'Chưa có lời mời? Hãy nói với giám đốc.', 'No invite yet? Ask your employer.'],
  'ob.pick': ['시험용 · 어떤 초대를 찍을까요?', 'Thử nghiệm · Quét lời mời nào?', 'Test · Which invite to scan?'],
  'inv.title': ['이 공장에 들어가요', 'Bạn sẽ vào nhà máy này', 'You are joining'],
  'inv.name': ['이름', 'Tên', 'Name'],
  'inv.factory': ['공장', 'Nhà máy', 'Factory'],
  'inv.area': ['일하는 곳', 'Nơi làm việc', 'Workplace'],
  'inv.ok': ['맞아요, 들어가기', 'Đúng, vào ứng dụng', "That's me, join"],
  'inv.wrong': ['제 공장이 아니에요 · 처음으로', 'Không phải nhà máy của tôi · Quay lại', 'Not my workplace · Start over'],
  'inv.fix': ['이름이 틀리면 들어간 뒤 대표님께 말해 주세요.', 'Nếu tên sai, hãy báo giám đốc sau khi vào.', 'If your name is wrong, tell your employer after joining.'],
  'err.used': ['이미 쓴 초대예요', 'Lời mời này đã được dùng', 'This invite was already used'],
  'err.expired': ['기간이 지난 초대예요', 'Lời mời đã hết hạn', 'This invite has expired'],
  'err.none': ['초대를 찾을 수 없어요', 'Không tìm thấy lời mời', 'Invite not found'],
  'err.body': ['대표님께 새 초대를 달라고 말해 주세요.\n초대는 사람마다 하나이고, 7일 안에 한 번만 쓸 수 있어요.', 'Hãy nhờ giám đốc gửi lời mời mới.\nMỗi người một lời mời, chỉ dùng được một lần trong 7 ngày.', 'Ask your employer for a new invite.\nEach invite is for one person and works once within 7 days.'],
  'err.who': ['누구에게 말하나요? → 대표님 (공장주)', 'Nói với ai? → Giám đốc (chủ nhà máy)', 'Who to ask? → Your employer'],
  'err.back': ['처음으로', 'Quay lại', 'Start over'],
  'nt.title': ['경보를 받으려면\n알림을 켜 주세요', 'Hãy bật thông báo\nđể nhận cảnh báo', 'Turn on notifications\nto get alerts'],
  'nt.body': ['위험할 때 소리와 진동으로 바로 알려 드려요.', 'Khi có nguy hiểm, ứng dụng báo ngay bằng âm thanh và rung.', "When there's danger, we alert you right away with sound and vibration."],
  'nt.tip': ['휴대폰이 물으면 "허용"을 눌러 주세요.\n절전 모드 예외도 켜 두면 알림이 늦지 않아요.', 'Khi điện thoại hỏi, hãy chọn "Cho phép".\nTắt tiết kiệm pin cho ứng dụng để không bị trễ.', 'When your phone asks, tap "Allow".\nExclude the app from battery saving so alerts are not delayed.'],
  'nt.on': ['알림 켜기', 'Bật thông báo', 'Turn on notifications'],
  'nt.later': ['나중에 하기', 'Để sau', 'Later'],
  'nt.laterWarn': ['알림이 꺼져 있으면 경보가 울리지 않아요.', 'Nếu tắt thông báo, cảnh báo sẽ không kêu.', "If notifications are off, alerts won't ring."],
  // 홈
  'h.ok': ['지금 이상 없음', 'Hiện không có bất thường', 'All normal now'],
  'h.checked': ['{f} · {t} 확인', '{f} · kiểm tra lúc {t}', '{f} · checked {t}'],
  'h.bell': ['알림 켜짐 · 소리와 진동', 'Thông báo bật · âm thanh và rung', 'Alerts on · sound & vibration'],
  'h.bellV': ['알림 켜짐 · 진동만', 'Thông báo bật · chỉ rung', 'Alerts on · vibration only'],
  'h.off.t': ['알림이 꺼져 있어요', 'Thông báo đang tắt', 'Notifications are off'],
  'h.off.b': ['위험해도 경보가 울리지 않아요.', 'Có nguy hiểm cũng không có cảnh báo.', "Alerts won't ring, even in danger."],
  'h.off.go': ['알림 켜기', 'Bật thông báo', 'Turn on'],
  'h.net.t': ['인터넷에 연결되지 않았어요', 'Không có kết nối Internet', 'No internet connection'],
  'h.net.b': ['지금은 경보가 오지 못할 수 있어요.\n와이파이나 데이터를 확인해 주세요.', 'Hiện có thể không nhận được cảnh báo.\nHãy kiểm tra Wi-Fi hoặc dữ liệu.', 'Alerts may not arrive right now.\nCheck Wi-Fi or mobile data.'],
  'h.last': ['마지막으로 확인한 때', 'Lần kiểm tra cuối', 'Last checked'],
  'h.lastOk': ['{t} · 그때는 이상 없음', '{t} · lúc đó bình thường', '{t} · all normal then'],
  'h.alarms': ['경보 {n}건', '{n} cảnh báo', '{n} alert(s)'],
  'h.still': ['아직 이상', 'Vẫn bất thường', 'Still abnormal'],
  'h.remindAt': ['{t} 다시 알림', 'nhắc lại lúc {t}', 'reminder at {t}'],
  'h.acked': ['조치됨 · {t}에 다시 봐요', 'đã xử lý · kiểm tra lại {t}', 'handled · recheck {t}'],
  'h.see': ['경보 보기', 'Xem cảnh báo', 'View alert'],
  'tile.hist': ['받은 경보', 'Cảnh báo đã nhận', 'My alerts'],
  'tile.notice': ['안전 공지', 'Thông báo an toàn', 'Safety notices'],
  'tile.voice': ['의견 보내기', 'Gửi ý kiến', 'Send feedback'],
  'tile.set': ['알림·언어', 'Thông báo · Ngôn ngữ', 'Alerts · Language'],
  'new': ['안 읽음 {n}', 'Chưa đọc {n}', '{n} unread'],
  // 경보
  'a.abn': ['이상', 'Bất thường', 'Abnormal'],
  'a.justnow': ['방금', 'vừa xong', 'just now'],
  'a.minAgo': ['{n}분 전', '{n} phút trước', '{n} min ago'],
  'a.what': ['무엇이', 'Cái gì', 'What'],
  'a.where': ['어디서', 'Ở đâu', 'Where'],
  'a.how': ['얼마나', 'Mức độ', 'How much'],
  'a.state': ['지금 상태', 'Trạng thái', 'Status'],
  'a.normal': ['정상', 'Bình thường', 'Normal'],
  'a.wet': ['💧 물 닿음', '💧 Có nước', '💧 Water'],
  'a.range': ['정상 범위', 'Mức bình thường', 'Normal range'],
  'a.nowmark': ['지금 ▲', 'Hiện tại ▲', 'Now ▲'],
  'a.ack': ['조치 완료', 'Đã xử lý', 'Handled'],
  'a.reack': ['다시 조치했어요', 'Đã xử lý lại', 'Handled again'],
  'a.snooze': ['5분 뒤 다시 알려 주세요', 'Nhắc lại sau 5 phút', 'Remind me in 5 min'],
  'a.snoozeLeft': ['이번에 미루면 {n}번 남아요 · 모두 함께 세요', 'Hoãn lần này thì còn {n} lần · tính chung cho mọi người', 'After this snooze: {n} left · shared by everyone'],
  'a.after': ['조치 완료 뒤 {n}분', '{n} phút sau khi xử lý', '{n} min after handling'],
  'a.snoozed': ['{n}번 미뤘어요', 'đã hoãn {n} lần', 'snoozed {n}×'],
  'a.escT': ['대표님과 운영자에게도 알렸어요.', 'Đã báo cho giám đốc và người vận hành.', 'Your employer and the operator were notified.'],
  'a.escB': ['다시 살펴보고 조치해 주세요.', 'Hãy kiểm tra lại và xử lý.', 'Please check again and take action.'],
  'a.list': ['경보 {n}건', '{n} cảnh báo', '{n} alerts'],
  'a.listSub': ['최신이 위 · 카드를 누르면 크게 보여요', 'Mới nhất ở trên · nhấn thẻ để mở', 'Newest first · tap a card to open'],
  'a.unhandled': ['조치 안 됨 {n}', 'Chưa xử lý {n}', '{n} not handled'],
  'a.tap': ['누르면 조치 완료 ›', 'Nhấn để xử lý ›', 'Tap to handle ›'],
  'a.x': ['평소보다 {r}배', 'gấp {r} lần', '{r}× usual'],
  'd.sent': ['조치 완료를\n보냈어요', 'Đã gửi\n“Đã xử lý”', '“Handled”\nsent'],
  'd.resent': ['다시 조치를\n보냈어요', 'Đã gửi\n“Đã xử lý lại”', '“Handled again”\nsent'],
  'd.to': ['{t} · 대표님과 운영자에게 전달됐어요', '{t} · đã gửi tới giám đốc và người vận hành', '{t} · sent to your employer and the operator'],
  'd.rule': ['경보는 센서가 정상이 되어야 끝나요.\n{t}에 다시 봐요.', 'Cảnh báo chỉ kết thúc khi cảm biến bình thường.\nKiểm tra lại lúc {t}.', 'The alert ends only when the sensor is normal.\nRechecking at {t}.'],
  'd.wrong': ['잘못 눌렀나요?', 'Nhấn nhầm?', 'Pressed by mistake?'],
  'd.sec': ['초 남음', 'giây', 's left'],
  'd.undo': ['취소', 'Hủy', 'Undo'],
  'd.undone': ['조치 완료를 취소했어요', 'Đã hủy “Đã xử lý”', '“Handled” was undone'],
  'close': ['닫기', 'Đóng', 'Close'],
  'home': ['홈으로', 'Về trang chủ', 'Home'],
  'w.title': ['이상 · 조치됨', 'Bất thường · Đã xử lý', 'Abnormal · Handled'],
  'w.start': ['{t} 시작', 'bắt đầu {t}', 'started {t}'],
  'w.ww': ['무엇이 · 어디서', 'Cái gì · Ở đâu', 'What · Where'],
  'w.by': ['{who} {t} 조치 완료', '{who} đã xử lý lúc {t}', '{who} handled at {t}'],
  'w.reby': ['{who} {t} 다시 조치', '{who} xử lý lại lúc {t}', '{who} handled again at {t}'],
  'w.me': ['내가', 'Tôi', 'I'],
  'w.watch': ['센서가 정상이 되는지 지켜보는 중', 'Đang theo dõi cảm biến', 'Watching the sensor'],
  'w.remind': ['아직 이상이면 {t}에 모두에게 다시 알려요.', 'Nếu vẫn bất thường, sẽ nhắc mọi người lúc {t}.', 'If still abnormal, everyone is reminded at {t}.'],
  'w.snoozedMsg': ['5분 뒤 다시 알려 드려요', 'Sẽ nhắc lại sau 5 phút', "We'll remind you in 5 min"],
  'e.t': ['경보가 끝났어요', 'Cảnh báo đã kết thúc', 'The alert has ended'],
  'e.sub': ['{what} · {t} 센서 정상', '{what} · cảm biến bình thường lúc {t}', '{what} · sensor normal at {t}'],
  'u.t': ['아직 못 보냈어요', 'Chưa gửi được', 'Not sent yet'],
  'u.b': ['인터넷에 연결되지 않았어요.\n휴대폰에 저장했고, 연결되면 자동으로 보내요.', 'Không có Internet.\nĐã lưu trên điện thoại, sẽ tự gửi khi có mạng.', 'No internet.\nSaved on your phone; it will send automatically.'],
  'u.tell': ['급하면 대표님께 말로 알려 주세요.', 'Nếu gấp, hãy nói trực tiếp với giám đốc.', 'If urgent, tell your employer in person.'],
  'u.retry': ['다시 보내기', 'Gửi lại', 'Send again'],
  'u.still': ['아직 인터넷에 연결되지 않았어요', 'Vẫn chưa có Internet', 'Still no internet'],
  // 받은 경보
  'hi.recent': ['최근 30일', '30 ngày qua', 'Last 30 days'],
  'hi.live': ['진행 중', 'Đang diễn ra', 'Ongoing'],
  'hi.by': ['조치 완료 · {who}', 'Đã xử lý · {who}', 'Handled · {who}'],
  'hi.me': ['(나)', '(tôi)', '(me)'],
  'hi.note': ['지난 경보는 볼 수만 있어요. 조치 완료는 더 누를 수 없어요.', 'Chỉ xem được cảnh báo cũ, không thể xử lý thêm.', 'Past alerts are view-only.'],
  'hd.when': ['언제', 'Khi nào', 'When'],
  'hd.how': ['어떻게 끝났는지', 'Kết thúc thế nào', 'How it ended'],
  'hd.now': ['지금 어떤지', 'Tình trạng hiện tại', 'Status now'],
  'hd.who': ['조치한 사람', 'Người xử lý', 'Who handled it'],
  'hd.took': ['{n}분 동안 이어졌어요', 'Kéo dài {n} phút', 'Lasted {n} min'],
  'hd.ack': ['조치 완료', 'Đã xử lý', 'Handled'],
  'hd.re': ['다시 조치했어요', 'Đã xử lý lại', 'Handled again'],
  'hd.none': ['아무도 조치하지 않았어요.', 'Không ai xử lý.', 'Nobody handled it.'],
  'hd.snooz': ['{n}번 미뤄졌어요', 'Đã hoãn {n} lần', 'Snoozed {n} times'],
  'hd.noval': ['센서 값은 대표님과 운영자가 봐요.', 'Giám đốc và người vận hành xem số liệu.', 'Your employer and the operator see the readings.'],
  'end.ended': ['끝남', 'Đã kết thúc', 'Ended'],
  'end.noack': ['아무도 안 누르고 끝남', 'Kết thúc · không ai xử lý', 'Ended · nobody handled'],
  'end.repair': ['수리로 닫힘', 'Đóng do sửa cảm biến', 'Closed for repair'],
  'end.liveAck': ['조치됨 · 아직 이상', 'Đã xử lý · vẫn bất thường', 'Handled · still abnormal'],
  'end.liveNo': ['조치 안 됨', 'Chưa xử lý', 'Not handled'],
  // 안전 공지
  'n.unread': ['안 읽음 {n}', 'Chưa đọc {n}', '{n} unread'],
  'n.all': ['모두 읽었어요', 'Đã đọc hết', 'All read'],
  'n.new': ['안 읽음', 'Chưa đọc', 'Unread'],
  'n.read': ['읽음', 'Đã đọc', 'Read'],
  'n.ai': ['AI 자동 번역 · 틀릴 수 있어요', 'Bản dịch AI · có thể sai', 'AI translation · may be wrong'],
  'n.orig': ['원문 보기 (한국어)', 'Xem bản gốc (tiếng Hàn)', 'Show original (Korean)'],
  'n.trans': ['번역 보기', 'Xem bản dịch', 'Show translation'],
  'n.bad': ['번역이 이상해요', 'Bản dịch có vấn đề', 'Translation looks wrong'],
  'n.badDone': ['대표님께 알렸어요. 궁금하면 직접 물어봐 주세요.', 'Đã báo giám đốc. Nếu chưa rõ, hãy hỏi trực tiếp.', 'Your employer was told. Ask them if unsure.'],
  'n.ack': ['읽었어요', 'Tôi đã đọc', 'I have read this'],
  'n.acked': ['✓ {d} 읽었어요', '✓ Đã đọc {d}', '✓ Read on {d}'],
  'n.ackNote': ['누르면 대표님이 읽은 사람을 봐요.', 'Giám đốc sẽ thấy bạn đã đọc.', 'Your employer will see that you read it.'],
  // 의견
  'v.urgent': ['지금 위험하면 <b>먼저 피하고</b> 말로 알려 주세요.', 'Nếu đang nguy hiểm, <b>hãy tránh xa trước</b> rồi báo bằng lời.', 'If in danger, <b>move away first</b> and tell someone.'],
  'v.mine': ['내가 보낸 의견', 'Ý kiến đã gửi', 'My feedback'],
  'v.kind': ['어떤 의견인가요?', 'Ý kiến về việc gì?', 'What kind?'],
  'v.k.danger': ['위험해 보여요', 'Có vẻ nguy hiểm', 'Looks dangerous'],
  'v.k.better': ['바꾸면 좋겠어요', 'Nên thay đổi', 'Could be better'],
  'v.k.etc': ['기타', 'Khác', 'Other'],
  'v.text': ['내용', 'Nội dung', 'Details'],
  'v.langNote': ['편한 언어로 쓰세요. 대표님께는 AI 번역이 함께 가요.', 'Viết bằng ngôn ngữ bạn quen. Giám đốc nhận kèm bản dịch AI.', 'Write in any language. Your employer also gets an AI translation.'],
  'v.ph': ['예: B동 통로에 기름이 자주 흘러 있어요', 'VD: Lối đi tòa B hay có dầu tràn', 'e.g. Oil often spills in the Bldg B aisle'],
  'v.photo': ['📷 사진 붙이기 (안 해도 돼요)', '📷 Thêm ảnh (không bắt buộc)', '📷 Add photo (optional)'],
  'v.photoOn': ['📷 사진 1장 붙음 · 누르면 빼요', '📷 Đã thêm 1 ảnh · nhấn để bỏ', '📷 1 photo added · tap to remove'],
  'v.name': ['이름', 'Tên', 'Name'],
  'v.show': ['이름 밝히기', 'Ghi tên', 'Show name'],
  'v.hide': ['이름 빼기', 'Ẩn tên', 'Hide name'],
  'v.hideWarn': ['작은 공장에서는 내용이나 <b>쓴 언어</b>로 누군지 짐작될 수 있어요.', 'Ở xưởng nhỏ, người khác có thể đoán ra bạn qua nội dung hoặc <b>ngôn ngữ</b>.', 'In a small workplace, people may guess who you are from the content or <b>language</b>.'],
  'v.send': ['대표님께 보내기', 'Gửi giám đốc', 'Send to employer'],
  'v.need': ['내용을 적어 주세요', 'Hãy viết nội dung', 'Please write something'],
  'v.cf.t': ['대표님께 보낼까요?', 'Gửi cho giám đốc?', 'Send to your employer?'],
  'v.cf.lock': ['보낸 뒤에는 고치거나 지울 수 없어요.', 'Sau khi gửi, không thể sửa hoặc xóa.', "You can't edit or delete it after sending."],
  'v.cf.send': ['보내기', 'Gửi', 'Send'],
  'v.cf.edit': ['더 고치기', 'Sửa tiếp', 'Keep editing'],
  'v.sent': ['보냈어요. 대표님이 읽으면 여기서 보여요.', 'Đã gửi. Khi giám đốc đọc, bạn sẽ thấy ở đây.', "Sent. You'll see here when your employer reads it."],
  'v.st': [['보냄', '대표님이 읽음', '답 옴', '해결함'], ['Đã gửi', 'Giám đốc đã đọc', 'Có trả lời', 'Đã giải quyết'], ['Sent', 'Read', 'Replied', 'Resolved']],
  'v.anon': ['이름 뺌', 'Ẩn tên', 'Name hidden'],
  'v.named': ['이름 밝힘', 'Có tên', 'Name shown'],
  'v.reply': ['대표님 답', 'Giám đốc trả lời', "Employer's reply"],
  'v.none': ['아직 보낸 의견이 없어요', 'Chưa gửi ý kiến nào', 'No feedback sent yet'],
  'v.write': ['＋ 새 의견 쓰기', '＋ Viết ý kiến mới', '＋ Write new feedback'],
  // 알림·언어
  's.alarm': ['경보 알림', 'Thông báo cảnh báo', 'Alert notifications'],
  's.alarmOn': ['🔔 켜짐 · 끌 수 없어요', '🔔 Bật · không thể tắt', '🔔 On · cannot be turned off'],
  's.alarmOff': ['🔕 꺼져 있어요 · 휴대폰 설정에서 켜 주세요', '🔕 Đang tắt · hãy bật trong cài đặt điện thoại', '🔕 Off · turn on in phone settings'],
  's.alarmNote': ['경보를 놓치지 않도록 앱에서는 끌 수 없어요.', 'Để không bỏ lỡ cảnh báo, không thể tắt trong ứng dụng.', "So you never miss an alert, it can't be turned off in the app."],
  's.when': ['경보가 올 때', 'Khi có cảnh báo', 'When an alert comes'],
  's.sv': ['소리 + 진동', 'Âm thanh + rung', 'Sound + vibration'],
  's.v': ['진동만', 'Chỉ rung', 'Vibration only'],
  's.notice': ['공지 알림', 'Thông báo tin an toàn', 'Notice alerts'],
  's.recv': ['받기', 'Nhận', 'On'],
  's.norecv': ['안 받기', 'Không nhận', 'Off'],
  's.lang': ['화면 언어', 'Ngôn ngữ', 'Language'],
  's.langNote': ['경보 문구는 미리 번역해 둔 문구예요. 공지·의견은 AI 번역이에요.', 'Nội dung cảnh báo được dịch sẵn. Thông báo và ý kiến dùng bản dịch AI.', 'Alert texts are pre-translated. Notices and feedback use AI translation.'],
  // 내 정보
  'm.title': ['내 정보', 'Thông tin của tôi', 'My info'],
  'm.role': ['근로자', 'Người lao động', 'Worker'],
  'm.fix': ['이름이 틀리면 대표님께 말해 주세요.\n공장을 그만두면 대표님이 명단에서 빼요.', 'Nếu tên sai, hãy báo giám đốc.\nKhi nghỉ việc, giám đốc sẽ xóa bạn khỏi danh sách.', 'If your name is wrong, tell your employer.\nWhen you leave, your employer removes you.'],
  'm.phone': ['휴대폰을 바꾸면 대표님께 새 초대를 받아요.', 'Đổi điện thoại thì xin giám đốc lời mời mới.', 'New phone? Ask your employer for a new invite.'],
  'm.help': ['도움·문의', 'Trợ giúp', 'Help'],
  'm.helpBoss': ['일·안전 문제', 'Công việc · an toàn', 'Work & safety'],
  'm.helpApp': ['앱이 안 될 때 · 운영센터', 'Ứng dụng lỗi · Trung tâm vận hành', 'App problems · Operations center'],
  'm.hours': ['평일 9~18시', 'Ngày thường 9–18h', 'Weekdays 9–18'],
  'm.boss': ['대표님', 'Giám đốc', 'Employer'],
  'm.logout': ['로그아웃', 'Đăng xuất', 'Log out'],
  'm.logoutQ': ['로그아웃할까요?', 'Đăng xuất?', 'Log out?'],
  'm.logoutB': ['로그아웃하면 경보를 받지 못해요.\n다시 들어오려면 초대가 필요해요.', 'Đăng xuất thì sẽ không nhận được cảnh báo.\nMuốn vào lại cần lời mời.', "You won't get alerts after logging out.\nYou'll need an invite to come back."],
  'm.stay': ['그대로 두기', 'Giữ đăng nhập', 'Stay logged in'],
  'm.ver': ['앱 버전 0.1 · 시제품', 'Phiên bản 0.1 · thử nghiệm', 'Version 0.1 · prototype'],
};

// 경보 문구 — 센서마다 미리 번역 (한국어 문구는 seed.js의 SENSORS)
const SENS_TX = {
  press2: { vi: { title: 'Máy dập số 2', what: 'Rung · Nhiệt độ', where: 'Tòa A, dây chuyền 2', more: (r) => `Rung mạnh gấp ${r} lần bình thường` },
            en: { title: 'Press No. 2', what: 'Vibration · Temperature', where: 'Bldg A, Line 2', more: (r) => `${r}× stronger than usual` } },
  gas: { vi: { title: 'Khí gas', sub: 'Nồng độ khí trong không khí', where: 'Nhà máy', more: (r) => `Cao gấp ${r} lần bình thường` },
         en: { title: 'Gas', sub: 'Gas level in the air', where: 'Our factory', more: (r) => `${r}× higher than usual` } },
  power: { vi: { title: 'Điện', sub: 'Toàn bộ điện vào nhà máy', where: 'Nhà máy', more: (r) => `Nhiều gấp ${r} lần bình thường`, extra: 'Giá trị lệch: dòng điện · sóng hài' },
           en: { title: 'Electricity', sub: 'All power coming into the factory', where: 'Our factory', more: (r) => `${r}× more than usual`, extra: 'Off values: current · harmonics' } },
  th: { vi: { where: 'Cạnh buồng sơn tòa B', more: (r) => `Cao gấp ${r} lần bình thường` }, en: { where: 'Next to the Bldg B paint booth', more: (r) => `${r}× higher than usual` } },
  leak: { vi: { title: 'Rò nước hoặc đứt dây', sub: 'Chỗ đặt dây cảm biến nước 1 m', where: 'Dưới ống nước làm mát' },
          en: { title: 'Water leak or broken wire', sub: 'Where the 1 m leak sensor lies', where: 'Under the cooling pipe' } },
};

// 일하는 곳 이름 — 공장주가 등록한 구역 이름의 번역 (용어집, 원칙 점검 E24)
const AREA_TX = {
  'A동 2라인': { vi: 'Tòa A, dây chuyền 2', en: 'Bldg A, Line 2' },
  'A동': { vi: 'Tòa A', en: 'Bldg A' },
  'B동': { vi: 'Tòa B', en: 'Bldg B' },
};
const AREA = (a) => (a && LANG !== 'ko' && AREA_TX[a] ? AREA_TX[a][LANG] : a || '');
// 공장 이름은 고유명사라 한글 그대로 두고, 다른 언어에서는 로마자를 덧붙인다
const FNAME = (fid) => (LANG === 'ko' ? FACTORIES[fid].name : `${FACTORIES[fid].name} (${FACTORIES[fid].roman})`);

// 센서 이름만 (홈의 감시 줄)
// 센서 종류별 번역 (센서마다 따로 없을 때)
const TYPE_TX = {
  vib: { vi: { what: 'Rung · Nhiệt độ' }, en: { what: 'Vibration · Temperature' } },
  gas: { vi: { title: 'Khí gas', sub: 'Nồng độ khí trong không khí' }, en: { title: 'Gas', sub: 'Gas level in the air' } },
  power: { vi: { title: 'Điện', sub: 'Toàn bộ điện vào nhà máy' }, en: { title: 'Electricity', sub: 'All power coming into the factory' } },
  leak: { vi: { title: 'Rò nước hoặc đứt dây', short: 'Rò nước' }, en: { title: 'Water leak or broken wire', short: 'Leak' } },
  th: { vi: { title: 'Nhiệt độ · Độ ẩm', short: 'Nhiệt·Ẩm', sub: 'Nhiệt độ và độ ẩm nơi làm việc' }, en: { title: 'Temperature · Humidity', short: 'Temp·Hum', sub: 'Workplace temperature and humidity' } },
};
const txOf = (key) => Object.assign({}, (TYPE_TX[SENSORS[key].type] || {})[LANG] || {}, (SENS_TX[key] || {})[LANG] || {});
// 센서 이름 (short = 좁은 칸용)
const SNAME = (key, short) => {
  const d = SENSORS[key];
  if (LANG === 'ko') return short ? d.short || d.title : d.title;
  const t = txOf(key);
  return (short && t.short) || t.title || d.title;
};

let LANG = 'ko';
try { LANG = localStorage.getItem('lang') || ''; } catch (e) {}
if (!LANGS.some((l) => l.id === LANG)) {
  const nav = (navigator.language || 'ko').slice(0, 2);
  LANG = LANGS.some((l) => l.id === nav) ? nav : 'ko';
}
function setLang(id) { LANG = id; try { localStorage.setItem('lang', id); } catch (e) {} document.documentElement.lang = id; }
document.documentElement.lang = LANG;

function T(key, vars) {
  const row = TX[key];
  if (!row) return key;
  let s = row[Math.max(0, LANGS.findIndex((l) => l.id === LANG))];
  if (typeof s !== 'string') return s;
  s = esc(s).replace(/\n/g, '<br>').replace(/&lt;(\/?)b&gt;/g, '<$1b>');
  for (const k in vars || {}) s = s.split('{' + k + '}').join(esc(vars[k]));
  return s;
}
// 경보 문구 한 조각 — 한국어는 seed.js, 다른 언어는 SENS_TX
function ST(a, field) {
  const d = SENSORS[a.key];
  if (LANG !== 'ko') {
    const t = txOf(a.key);
    if (field === 'title' && a.title) return a.title === '컴프레서' ? (LANG === 'vi' ? 'Máy nén khí' : 'Compressor') : a.title;
    if (field === 'more') return t.more ? t.more(a.ratio) : (LANG === 'vi' ? `Cao gấp ${a.ratio} lần bình thường` : `${a.ratio}× higher than usual`);
    if (field === 'title') return t.title || d.title;
    return t[field] || d[field] || '';
  }
  if (field === 'title') return a.title || d.title;
  if (field === 'more') return `평소보다 ${a.ratio}배 ${d.word}`;
  return d[field] || '';
}
