// 가짜 서버의 처음 데이터 — "오늘 = 2026-09-17(목) 대성정밀" 이야기 (방법론 문서 시안 14차 D).
// 화면 속 공장·설비·사례는 모두 설명용 예시다.

// 실증 사이트 3곳 × 센서 5개 안팎 (2026-09-17 사용자: "3개 사이트에 5개 센서씩"). 사이트 = 공장 하나.
// type: 센서 종류 (아이콘·번역) · short: 좁은 칸에 쓰는 이름
const SENSORS = {
  // 대성정밀 (금속가공)
  press2: { fid: 'daesung', type: 'vib', title: '2번 프레스', short: '2번 프레스', what: '진동 · 온도', where: 'A동 2라인', kind: 'ratio', ratio: 2.0, word: '커요' },
  gas:    { fid: 'daesung', type: 'gas', title: '가스', short: '가스', sub: '공기 중 가스 농도', where: '우리 공장', kind: 'ratio', ratio: 3.0, word: '높아요' },
  power:  { fid: 'daesung', type: 'power', title: '전기', short: '전기', sub: '공장에 들어오는 전기 전체', where: '우리 공장', kind: 'ratio', ratio: 1.5, word: '많아요', extra: '벗어난 값: 전류 · 고조파' },
  leak:   { fid: 'daesung', type: 'leak', title: '누수 또는 단선', short: '누수', sub: '누수 선 1m가 깔린 자리', where: '냉각수 배관 밑', kind: 'state' },
  th:     { fid: 'daesung', type: 'th', title: '온습도', short: '온습도', sub: '작업장 온도 · 습도', where: 'B동 도장 부스 옆', kind: 'ratio', ratio: 1.6, word: '높아요' },
  // 한빛화학 (화학)
  hb_mixer: { fid: 'hanbit', type: 'vib', title: '1번 교반기', short: '1번 교반기', what: '진동 · 온도', where: '반응동 1층', kind: 'ratio', ratio: 1.8, word: '커요' },
  hb_gas:   { fid: 'hanbit', type: 'gas', title: '가스', short: '가스', sub: '공기 중 가연성 가스 농도', where: '원료 창고', kind: 'ratio', ratio: 2.5, word: '높아요' },
  hb_power: { fid: 'hanbit', type: 'power', title: '전기', short: '전기', sub: '공장에 들어오는 전기 전체', where: '우리 공장', kind: 'ratio', ratio: 1.4, word: '많아요' },
  hb_leak:  { fid: 'hanbit', type: 'leak', title: '누수 또는 단선', short: '누수', sub: '누수 선 1m가 깔린 자리', where: '냉각탑 배관 밑', kind: 'state' },
  hb_th:    { fid: 'hanbit', type: 'th', title: '온습도', short: '온습도', sub: '보관실 온도 · 습도', where: '약품 보관실', kind: 'ratio', ratio: 1.5, word: '높아요' },
  // 동방금속 (금속가공)
  db_comp:  { fid: 'dongbang', type: 'vib', title: '컴프레서', short: '컴프레서', what: '진동 · 온도', where: '기계실', kind: 'ratio', ratio: 1.7, word: '커요' },
  db_gas:   { fid: 'dongbang', type: 'gas', title: '가스', short: '가스', sub: '공기 중 가스 농도', where: '용접 작업장', kind: 'ratio', ratio: 2.2, word: '높아요' },
  db_power: { fid: 'dongbang', type: 'power', title: '전기', short: '전기', sub: '공장에 들어오는 전기 전체', where: '우리 공장', kind: 'ratio', ratio: 1.3, word: '많아요' },
  db_leak:  { fid: 'dongbang', type: 'leak', title: '누수 또는 단선', short: '누수', sub: '누수 선 1m가 깔린 자리', where: '세척조 밑', kind: 'state' },
  db_th:    { fid: 'dongbang', type: 'th', title: '온습도', short: '온습도', sub: '작업장 온도 · 습도', where: '도금 라인', kind: 'ratio', ratio: 1.4, word: '높아요' },
};
const OWNER_NAME = { daesung: '박대표', hanbit: '최대표', dongbang: '정대표', taegwang: '윤대표' };
const SITE_SENSORS = (fid) => Object.keys(SENSORS).filter((k) => SENSORS[k].fid === fid);
const HAS_SENSORS = (fid) => SITE_SENSORS(fid).length > 0;
const alarmFid = (a) => SENSORS[a.key].fid;

const SNOOZE_LIMIT = 2;      // 미루기 한도 — 경보 하나에 2번 (가설)
const REMIND_MIN = 5;        // 조치 완료 뒤 다시 보는 간격 (분)

const FACTORIES = {
  // ll: 지도 핀 자리 [경도, 위도] — 가짜 좌표. 그 읍·면·동 안쪽에 찍었다 (2026-09-22)
  daesung:  { name: '대성정밀', area: '동탄', dong: '동탄2동', ll: [127.07914, 37.18946], type: '금속가공', workers: 8 , roman: 'Daesung Precision' },
  hanbit:   { name: '한빛화학', area: '향남', dong: '향남읍', ll: [126.93302, 37.11831], type: '화학', workers: 18 , roman: 'Hanbit Chemical' },
  dongbang: { name: '동방금속', area: '봉담', dong: '봉담읍', ll: [126.9341, 37.2072], type: '금속가공', workers: 11 , roman: 'Dongbang Metal' },
  taegwang: { name: '태광기계', area: '우정', dong: '우정읍', ll: [126.79918, 37.07409], type: '기계', workers: 9 , roman: 'Taegwang Machinery' },
  // 지킴이 "공장" 목록을 채우려고 더한 가상 공장 (2026-09-22) — 센서 없음, 할 일 없음. 좌표는 그 읍·면·동 안쪽의 가짜
  saehan:   { name: '새한테크', area: '동탄', dong: '동탄5동', ll: [127.1256, 37.21133], type: '전자부품', workers: 23, roman: 'Saehan Tech' },
  ujin:     { name: '우진산업', area: '동탄', dong: '동탄8동', ll: [127.10885, 37.15597], type: '플라스틱', workers: 14, roman: 'Ujin Industry' },
  seongwon: { name: '성원금속', area: '향남', dong: '향남읍', ll: [126.90702, 37.10231], type: '금속가공', workers: 12, roman: 'Seongwon Metal' },
  donghwa:  { name: '동화정공', area: '향남', dong: '향남읍', ll: [126.94502, 37.10431], type: '기계', workers: 7, roman: 'Donghwa Precision' },
  hangyeol: { name: '한결화성', area: '봉담', dong: '봉담읍', ll: [126.9511, 37.1892], type: '화학', workers: 16, roman: 'Hangyeol Chemical' },
  mirae:    { name: '미래이엔지', area: '우정', dong: '우정읍', ll: [126.77718, 37.09209], type: '기계', workers: 10, roman: 'Mirae Eng' },
};

// 기업 정보 — 기존 화성 웹 "기업정보" 칸과 같은 항목 (2026-09-23). 전부 가상 값이다 (저장소가 Public이라 실제 회사 정보를 넣지 않는다)
// 기업 종류는 기존 웹의 소공인·소기업·중소기업, 소유 형태는 소유·임차·기타. 업종코드는 한국표준산업분류(KSIC) 세세분류 꼴
const FIRM = {
  daesung:  { ceo: '박대표', biz: '000-00-00001', ksic: ['25999', '그 외 기타 금속가공제품 제조업'], product: '자동차 부품 가공품', foreign: 2, own: '임차', kind: '소공인', addr: '동탄산업로 12' },
  hanbit:   { ceo: '최대표', biz: '000-00-00002', ksic: ['20499', '그 외 기타 화학제품 제조업'], product: '산업용 세정제', foreign: 6, own: '소유', kind: '소기업', addr: '향남안전로 45' },
  dongbang: { ceo: '정대표', biz: '000-00-00003', ksic: ['25999', '그 외 기타 금속가공제품 제조업'], product: '금속 브래킷', foreign: 3, own: '임차', kind: '소기업', addr: '봉담공단길 7' },
  taegwang: { ceo: '윤대표', biz: '000-00-00004', ksic: ['29199', '그 외 기타 일반 목적용 기계 제조업'], product: '포장 기계', foreign: 1, own: '소유', kind: '소공인', addr: '우정기계로 88' },
  saehan:   { ceo: '한대표', biz: '000-00-00005', ksic: ['26299', '그 외 기타 전자부품 제조업'], product: '전원 기판', foreign: 5, own: '임차', kind: '소기업', addr: '동탄첨단로 30' },
  ujin:     { ceo: '오대표', biz: '000-00-00006', ksic: ['22299', '그 외 기타 플라스틱 제품 제조업'], product: '플라스틱 사출품', foreign: 4, own: '기타', kind: '소기업', addr: '동탄산업로 58' },
  seongwon: { ceo: '서대표', biz: '000-00-00007', ksic: ['25999', '그 외 기타 금속가공제품 제조업'], product: '금속 프레스품', foreign: 3, own: '소유', kind: '소기업', addr: '향남공단로 21' },
  donghwa:  { ceo: '신대표', biz: '000-00-00008', ksic: ['29199', '그 외 기타 일반 목적용 기계 제조업'], product: '정밀 부품 가공기', foreign: 0, own: '임차', kind: '소공인', addr: '향남안전로 102' },
  hangyeol: { ceo: '장대표', biz: '000-00-00009', ksic: ['20499', '그 외 기타 화학제품 제조업'], product: '도료 첨가제', foreign: 5, own: '소유', kind: '소기업', addr: '봉담공단길 33' },
  mirae:    { ceo: '조대표', biz: '000-00-00010', ksic: ['29199', '그 외 기타 일반 목적용 기계 제조업'], product: '컨베이어 설비', foreign: 2, own: '임차', kind: '소기업', addr: '우정기계로 15' },
};
// 전화·팩스·메일도 가상 (031-000-01xx, example.com)
Object.keys(FIRM).forEach((fid, i) => Object.assign(FIRM[fid], {
  tel: `031-000-01${String(i + 1).padStart(2, '0')}`, fax: `031-000-02${String(i + 1).padStart(2, '0')}`, mail: `${fid}@example.com` }));

// 업종 × 분야 기본 체크리스트 (운영자 판) — 지킴이는 자기 조(전기) 칸만 받는다
const BASE_ITEMS = {
  '금속가공': [
    '누전차단기 시험 버튼이 작동하나?',
    '접지선이 기계에 연결돼 있나?',
    '전기 기계 주변에 물기가 없나?',
    '콘센트나 플러그에 탄 자국이 없나?',
    '임시 배선이 통로를 가로지르지 않나?',
    '전기실 출입 표지가 붙어 있나?',
  ],
  '화학': [
    '누전차단기 시험 버튼이 작동하나?',
    '접지선이 설비에 연결돼 있나?',
    '방폭 구역에 일반 전기기기를 두지 않았나?',
    '콘센트나 플러그에 탄 자국이 없나?',
    '임시 배선이 통로를 가로지르지 않나?',
    '분전반 앞이 비어 있나?',
  ],
};

// 기본 체크리스트 — 기존 웹 점검항목의 틀을 따른다 (2026-09-22): 34문항 5영역, 판 번호 26VER01.
// 영역과 문항 수는 기존 웹에서 확인한 것이고, 문항 글은 예시다 (실제 글은 기존 웹 "점검항목관리"에서 확인해야 한다).
const CHECKLIST = {
  ver: '26VER01',
  areas: [
    { key: 'a1', no: '01', name: '산업안전 일반', common: true, items: [
      '안전보건 표지가 잘 보이는 곳에 붙어 있나?',
      '통로와 비상구가 막히지 않았나?',
      '바닥에 걸려 넘어질 물건이나 기름이 없나?',
      '보호구(안전모, 안전화, 장갑)를 갖추고 쓰고 있나?' ] },
    { key: 'a2', no: '02', name: '소방안전', common: true, items: [
      '소화기가 제자리에 있고 압력이 정상인가?',
      '비상 경보와 유도등이 작동하나?',
      '인화성 물질 가까이에서 불꽃 작업을 하지 않나?' ] },
    { key: 'a3', no: '03', name: '전기안전', common: true, items: [
      '누전차단기 시험 버튼이 작동하나?',
      '접지선이 기계나 설비에 연결돼 있나?',
      '분전반 앞이 비어 있고 문이 닫혀 있나?',
      '임시 배선이 통로를 가로지르지 않나?' ] },
    { key: 'a4', no: '04', name: '화학안전', common: true, items: [
      '화학물질 용기에 이름과 경고 표시가 붙어 있나?',
      '물질안전보건자료(MSDS)를 작업장에 두었나?',
      '환기 설비가 켜져 있고 작동하나?' ] },
    { key: 'a5', no: '05', name: '유해위험기구/시설', common: false, items: [
      '프레스 — 방호장치가 작동하나?',
      '전단기 — 날에 손이 닿지 않게 덮개가 있나?',
      '크레인 — 과부하 방지장치와 훅 해지장치가 있나?',
      '리프트 — 권과 방지장치가 작동하나?',
      '고소작업대 — 비상정지 장치가 작동하나?',
      '곤돌라 — 안전검사를 받았나?',
      '압력용기 — 안전밸브가 달려 있나?',
      '보일러 — 압력방출장치가 작동하나?',
      '공기압축기 — 안전밸브와 회전부 덮개가 있나?',
      '롤러기 — 급정지 장치가 작동하나?',
      '사출성형기 — 문을 열면 멈추나?',
      '산업용 로봇 — 방책과 비상정지가 있나?',
      '컨베이어 — 비상정지 장치가 작동하나?',
      '지게차 — 전조등과 후진 경보가 작동하나?',
      '원심기 — 뚜껑을 닫아야 돌아가나?',
      '분쇄기, 파쇄기 — 투입구 덮개가 있나?',
      '혼합기 — 회전부 덮개가 있나?',
      '연삭기 — 숫돌 덮개가 있나?',
      '용접기 — 자동 전격 방지기가 달려 있나?',
      '국소배기장치 — 빨아들이는 힘이 충분한가?' ] },
  ],
};
// 지킴이 조 — 기존 웹처럼 조장 + 조원 3이 읍·면·동 권역을 맡는다 (2026-09-22). 이름은 가상.
const TEAM = { name: '전기 1조', lead: '이조장', members: ['이조장', '김지킴', '박지킴', '최지킴'], areas: ['동탄', '향남', '봉담', '우정'],
  // 권역 이름 → 그 안의 읍·면·동 (지도 테두리용, geo.js의 이름과 같다)
  dongs: { '동탄': ['동탄1동', '동탄2동', '동탄3동', '동탄4동', '동탄5동', '동탄6동', '동탄7동', '동탄8동', '동탄9동'], '향남': ['향남읍'], '봉담': ['봉담읍'], '우정': ['우정읍'] } };
// 점검 결과 종류 — 기존 웹의 "점검결과" 칸. 패트롤·기타가 무엇인지는 아직 모른다 (가설)
const RESULTS = ['점검완료', '재점검', '패트롤', '기타'];

/* ---------- 운영자 웹 (2026-10-01) — 점검조 · 지킴이 명단 · 체크리스트 판 · 공지 · 자료. 모두 가상 ----------
   공장과 점검 기록이 실제로 있는 조는 우리 조(TEAM) 하나뿐이다. 나머지 조는 숫자만 있다 — 공장 목록·점검 기록에는 안 나온다.
   조 이름 앞의 분야는 기존 웹 회원의 "분야"(소방·전기·화학·공통)에서 따왔다. 분야별 조가 권역을 어떻게 나누는지는 모른다 (가설: 권역이 겹치지 않는다).
   firms 맡은 공장 · month 9월에 점검한 공장 · week 이번 주 점검 · res 9월 결과별 건수(점검완료·재점검·패트롤·기타) · fx 개선 요청·고쳐짐 확인 · sent 이번 주 주간 보고 냄 */
const SQUADS = [
  { id: 'e1', name: TEAM.name, lead: TEAM.lead, members: TEAM.members, areas: TEAM.areas.flatMap((a) => TEAM.dongs[a]), since: 2026 },
  { id: 'e2', name: '전기 2조', lead: '정조장', members: ['정조장', '강지킴', '윤지킴'], areas: ['남양읍', '새솔동'], since: 2026, firms: 12, month: 5, week: 4, res: [5, 1, 0, 0], fx: [9, 6], sent: true },
  { id: 'f1', name: '소방 1조', lead: '문조장', members: ['문조장', '서지킴', '남지킴'], areas: ['송산면', '서신면', '마도면'], since: 2026, firms: 11, month: 4, week: 3, res: [3, 0, 1, 0], fx: [7, 3], sent: true },
  { id: 'f2', name: '소방 2조', lead: '하조장', members: ['하조장', '권지킴', '황지킴'], areas: ['팔탄면', '장안면', '양감면'], since: 2026, firms: 9, month: 6, week: 5, res: [5, 0, 0, 1], fx: [11, 8], sent: false },
  { id: 'c1', name: '화학 1조', lead: '송조장', members: ['송조장', '안지킴', '유지킴'], areas: ['매송면', '비봉면'], since: 2025, firms: 10, month: 3, week: 2, res: [2, 1, 0, 0], fx: [6, 2], sent: false },
  { id: 'c2', name: '화학 2조', lead: '홍조장', members: ['홍조장', '전지킴', '고지킴'], areas: ['정남면', '기배동', '진안동'], since: 2026, firms: 13, month: 5, week: 4, res: [4, 0, 1, 0], fx: [8, 5], sent: true },
  { id: 'g1', name: '공통 1조', lead: '노조장', members: ['노조장', '류지킴', '배지킴', '백지킴'], areas: ['병점1동', '병점2동', '반월동', '화산동'], since: 2026, firms: 14, month: 7, week: 6, res: [6, 1, 0, 0], fx: [12, 7], sent: true },
];
// 지킴이 명단 — 기존 웹 회원정보관리의 분야 · 근무여부(근무·휴직·병가·퇴직). 오지킴은 조가 없다 (조 편성에서 넣어 볼 수 있게)
const GUARDS = Object.fromEntries(SQUADS.flatMap((q) => q.members.map((m) => [m, { field: q.name.split(' ')[0], joined: `${q.since}-03`, work: '근무' }])));
Object.assign(GUARDS, { '오지킴': { field: '공통', joined: '2026-09', work: '근무' } });
GUARDS['윤지킴'].work = '휴직';
GUARDS['배지킴'].work = '병가';
const APPLICANTS = [
  { name: '한새봄', field: '소방', at: '9/16', tel: '010-0000-1201' },
  { name: '표가람', field: '전기', at: '9/17', tel: '010-0000-1202' },
];
// 기업 등록사유 — 기존 웹 기업등록의 다섯 가지 (현장등록 · 점검신청 · 점검거부 · 기업DB · 기타)
Object.entries({ daesung: '점검신청', hanbit: '점검신청', dongbang: '기업DB', taegwang: '현장등록', saehan: '기업DB',
  ujin: '기업DB', seongwon: '현장등록', donghwa: '기업DB', hangyeol: '점검신청', mirae: '기업DB' }).forEach(([fid, why]) => { FIRM[fid].why = why; });
// 체크리스트 판 이력 — 지난 판의 문항 수와 바뀐 점은 예시다
const CL_VERS = [
  { ver: CHECKLIST.ver, at: '2026-01-02', n: 34, what: '05 영역을 설비마다 한 문항으로 나눔' },
  { ver: '25VER02', at: '2025-07-01', n: 30, what: '04 화학안전에 MSDS 문항을 더함' },
  { ver: '25VER01', at: '2025-01-02', n: 29, what: '처음 판' },
];
// 월별 점검 건수 (모든 조, 4~8월) — 통계 막대용
const OP_MONTHS = [['4월', 38], ['5월', 44], ['6월', 41], ['7월', 47], ['8월', 45]];
// 주별 개선 요청 · 고쳐짐 확인 (모든 조, 6~8월) — 운영자 홈 개선지도 막대. 9월 주는 지금 숫자에서 나눈다
const OP_FIX_WEEKS = [[6, 11, 8], [6, 14, 10], [6, 9, 7], [6, 13, 9], [7, 16, 11], [7, 12, 9], [7, 15, 12], [7, 10, 8], [7, 13, 9],
  [8, 17, 11], [8, 12, 9], [8, 14, 10], [8, 11, 8]];
// 운영자가 쓴 공지 · 올린 자료 (받는 쪽: 지킴이 · 공장주 · 모두)
const OP_NOTICES = [
  { id: 'on3', to: '공장주', at: '9/22', title: '지킴이 방문 예약은 웹에서 승인해 주세요',
    body: '지킴이가 방문 날짜를 정하면 공장주 웹 첫 화면에 요청이 떠요.\n승인하면 그날 방문하고, 안 되는 날이면 거절해 주세요. 지킴이가 다른 날로 다시 요청해요.' },
  { id: 'on2', to: '지킴이', at: '9/15', title: '추석 연휴(9/24~9/26) 점검 일정',
    body: '연휴 사흘은 점검하지 않아요.\n그 주에 잡힌 방문은 공장주와 다시 날짜를 맞춰 주세요.' },
  { id: 'on1', to: '모두', at: '1/02', title: '2026년 점검항목 새 판(26VER01) 안내',
    body: '올해부터 05 유해위험기구/시설을 설비마다 한 문항으로 나눴어요.\n그 공장에 없는 설비는 "해당 없음"으로 답하면 돼요.' },
];
const OP_FILES = [
  { id: 'fl1', name: '2026 산업안전지킴이 점검 매뉴얼.pdf', to: '지킴이', size: '4.2MB', at: '1/02' },
  { id: 'fl2', name: '위험성평가 양식.hwp', to: '공장주', size: '86KB', at: '3/10' },
  { id: 'fl3', name: '소화기 점검 요령.pdf', to: '모두', size: '1.1MB', at: '5/21' },
  { id: 'fl4', name: '전기안전 자가점검표.xlsx', to: '공장주', size: '42KB', at: '8/04' },
];

// 사진을 올리면 AI가 내놓는 제안 (가짜). 사례는 설명용 예시.
const AI_SUGGEST = [
  { text: '전선 피복이 벗겨진 곳이 없나?', seen: '전선', spot: { l: 18, t: 40, w: 38, h: 22 },
    cases: [ { t: '피복이 벗겨진 이동 전선에 닿아 감전', same: '전선 피복 손상' },
             { t: '바닥에 끌린 전선 피복이 닳아 합선과 화재', same: '바닥에 늘어진 전선' } ] },
  { text: '약품 용기 옆에 전기 히터를 두지 않았나?', seen: '히터, 약품 통', spot: { l: 55, t: 30, w: 30, h: 40 },
    cases: [ { t: '용제 통 옆 히터에서 불이 옮겨붙음', same: '인화성 약품 가까이 열기구' } ] },
  { text: '멀티탭을 여러 개 이어 쓰지 않았나?', seen: '멀티탭', spot: { l: 10, t: 62, w: 34, h: 20 },
    cases: [ { t: '이어 꽂은 멀티탭이 과열돼 화재', same: '멀티탭 이어 쓰기' } ] },
  { text: '배수구 근처 콘센트에 덮개가 있나?', seen: '콘센트, 배수구', spot: { l: 60, t: 58, w: 26, h: 24 },
    cases: [ { t: '물청소 중 덮개 없는 콘센트에 물이 튀어 감전', same: '물 가까운 콘센트' } ] },
  // 2026-09-23 사용자 요청으로 더 많이 제안하게 늘렸다 (사진 장수에 따라 최대 10개)
  { text: '분전반 문이 닫혀 있고 잠겨 있나?', seen: '분전반', spot: { l: 30, t: 20, w: 34, h: 46 },
    cases: [ { t: '열린 분전반 안 충전부에 손이 닿아 감전', same: '열린 분전반 문' } ] },
  { text: '이동식 전선 릴에 과열 흔적이 없나?', seen: '전선 릴', spot: { l: 12, t: 48, w: 30, h: 30 },
    cases: [ { t: '감긴 채로 쓴 전선 릴이 과열돼 불남', same: '감아 둔 채 쓰는 전선 릴' } ] },
  { text: '용접기 접지선이 제대로 물려 있나?', seen: '용접기', spot: { l: 52, t: 44, w: 34, h: 34 },
    cases: [ { t: '접지가 풀린 용접기 외함에 닿아 감전', same: '용접기 접지' } ] },
  { text: '콘센트 주변에 먼지나 기름때가 쌓이지 않았나?', seen: '콘센트, 기름때', spot: { l: 64, t: 60, w: 24, h: 22 },
    cases: [ { t: '먼지 쌓인 플러그 사이로 불꽃이 튀어 화재', same: '더러운 콘센트' } ] },
  { text: '기계 전원 스위치에 이름표가 붙어 있나?', seen: '기계 스위치', spot: { l: 40, t: 26, w: 22, h: 26 },
    cases: [ { t: '표시 없는 스위치를 잘못 켜 정비 중인 사람이 끼임', same: '이름표 없는 전원 스위치' } ] },
  { text: '전기 작업 중에 잠금 장치와 작업 중 표지가 있나?', seen: '분전반, 차단기', spot: { l: 26, t: 30, w: 40, h: 36 },
    cases: [ { t: '작업 중인 줄 모르고 다른 사람이 전원을 올려 감전', same: '작업 중 표지 없음' } ] },
];

function daesungInspection() {
  const base = BASE_ITEMS['금속가공'].map((t, i) => ({ id: 'd' + i, text: t, src: 'base', answer: 'ok' }));
  return {
    id: 'i0828', fid: 'daesung', date: '8/28', by: '김지킴', locked: true, st: 'ok', result: '점검완료',
    items: [
      { id: 'dp', text: '분전반 앞에 물건이 쌓여 있지 않나?', src: 'prev', answer: 'bad', memo: '분전반 앞에 상자 적재',
        log: [ { t: 'fix', at: '9/5', tm: '16:40', note: '상자 창고로 옮김' } ] },
      { id: 'da1', text: '전선 피복이 벗겨진 곳이 없나?', src: 'ai', answer: 'bad', memo: '바닥에 늘어진 전선 피복이 벗겨짐',
        log: [ { t: 'fix', at: '9/5', tm: '16:42', note: '' } ] },
      { id: 'da2', text: '분전반 문이 닫혀 있고 잠겨 있나?', src: 'ai', answer: 'ok' },
      { id: 'da3', text: '이동식 전선 릴에 과열 흔적이 없나?', src: 'ai', answer: 'ok' },
      ...base,
      { id: 'ds1', text: '프레스 비상정지 버튼이 눌리나?', src: 'self', answer: 'ok' },
      { id: 'ds2', text: '소화기가 제자리에 있나?', src: 'self', answer: 'ok' },
    ],
  };
}

const SEED = {
  v: 6,
  clock: 9 * 60 + 10,                 // 가상 시각 09:10 (분)
  net: { worker: true, guard: true },
  offlineSince: { worker: null },
  aiDown: false,
  alarms: [
    { id: 'h1', key: 'press2', day: '9/15', start: 9 * 60 + 12, status: 'ended', abnormal: false, ratio: 2.0,
      acks: [ { by: '김근로', at: 9 * 60 + 15 } ], snoozes: 0, endedAt: 10 * 60 + 3, endKind: 'ended' },
    { id: 'h2', key: 'leak', day: '9/02', start: 10 * 60 + 5, status: 'ended', abnormal: false,
      acks: [ { by: '이현장', at: 10 * 60 + 13 } ], snoozes: 0, endedAt: 10 * 60 + 25, endKind: 'ended' },
    { id: 'h3', key: 'press2', day: '8/28', start: 14 * 60, status: 'ended', abnormal: false, ratio: 1.4, title: '컴프레서',
      acks: [], snoozes: 0, endedAt: 14 * 60 + 9, endKind: 'noack' },
    { id: 'h4', key: 'press2', day: '8/21', start: 11 * 60, status: 'ended', abnormal: false, ratio: 1.3, title: '컴프레서',
      acks: [], snoozes: 0, endedAt: 11 * 60 + 6, endKind: 'noack' },
    { id: 'h5', key: 'hb_gas', day: '9/11', start: 15 * 60 + 20, status: 'ended', abnormal: false, ratio: 2.1,
      acks: [ { by: '최반장', at: 15 * 60 + 24 } ], snoozes: 0, endedAt: 15 * 60 + 41, endKind: 'ended' },
    { id: 'h6', key: 'db_comp', day: '9/08', start: 7 * 60 + 50, status: 'ended', abnormal: false, ratio: 1.6,
      acks: [], snoozes: 0, endedAt: 7 * 60 + 58, endKind: 'noack' },
  ],
  outbox: { worker: [], guard: [] },
  visits: { daesung: '오늘 10:00', hanbit: '9/18(금) 14:00', dongbang: null, taegwang: null },
  inspections: [
    daesungInspection(),
    // 할 일이 없는 공장의 지난 점검 (2026-09-22) — 다른 조원이 한 것이라 "최근 방문한 곳"에는 안 나온다
    ...[['seongwon', '9/03', '박지킴'], ['saehan', '8/25', '최지킴'], ['hangyeol', '9/10', '이조장']].map(([fid, date, by]) => ({
      id: 'i' + fid, fid, date, by, locked: true, st: 'ok', result: '점검완료',
      items: BASE_ITEMS['금속가공'].map((t, i) => ({ id: fid + i, text: t, src: 'base', answer: 'ok' })) })),
    // 이번 주(9/15~) 다른 조원들이 한 점검 (2026-09-28) — 주간 보고를 채워 보이려고. 할 일이 없는 공장이라 홈 목록은 그대로.
    // bad: 문제로 찍은 문항 [영역 키-번호]. 동화정공은 아직 운영자 검사 대기
    // 2026-10-01 사용자 요청으로 3건 더함 — 결과 네 종류가 다 나오고 요일별 막대(월1·화2·수3)가 보이게. 반려는 홈 맨 위 할 일이 되므로 넣지 않는다
    ...[['saehan', '9/14', '최지킴', 'ok', '점검완료', ['a1-2', 'a4-1']],
      ['ujin', '9/15', '박지킴', 'ok', '점검완료', ['a3-0', 'a3-3']], ['seongwon', '9/15', '박지킴', 'wait', '재점검', []],
      ['donghwa', '9/16', '최지킴', 'wait', '점검완료', ['a2-0', 'a3-1', 'a5-2']],
      ['mirae', '9/16', '이조장', 'ok', '패트롤', []], ['hangyeol', '9/16', '이조장', 'ok', '기타', ['a4-0']]].map(([fid, date, by, st, result, bad]) => ({
      id: 'w' + fid, fid, date, by, locked: true, st, result,
      items: CHECKLIST.areas.flatMap((a) => a.items.map((t, i) => ({ id: `${fid}-${a.key}-${i}`, text: t, src: 'base', area: a.key,
        answer: bad.includes(`${a.key}-${i}`) ? 'bad' : 'ok' }))) })),
    { id: 'i0820', fid: 'dongbang', date: '8/20', by: '박지킴', locked: true, st: 'ok', result: '점검완료', items: [
      { id: 'b1', text: '용접기 케이블이 물기 위를 지나지 않나?', src: 'ai', answer: 'bad', memo: '바닥 물기 위 케이블',
        log: [ { t: 'fix', at: '8/30', tm: '14:20', note: '케이블 걸이 설치' } ] },
      ...BASE_ITEMS['금속가공'].map((t, i) => ({ id: 'b' + (i + 2), text: t, src: 'base', answer: 'ok' })),
    ] },
  ],
  // 안전 공지 (시안 W5 · O5) — 본문은 한국어 원문 + AI 번역(가짜). readBy: 이름 → 읽은 날·언어
  notices: [
    { id: 'n1', fid: 'daesung', date: '9/16', by: '박대표', ra: '9월 위험성평가',
      title: { ko: '2번 프레스 금형 바꿀 때 지킬 것', vi: 'Quy tắc khi thay khuôn máy dập số 2', en: 'Rules for changing the die on Press No. 2' },
      body: {
        ko: '금형을 바꿀 때는 반드시 전원을 끄고 잠금장치를 거세요.\n두 사람이 함께 하고, 한 사람은 스위치 옆을 지킵니다.\n끝나면 안전 덮개를 닫았는지 확인한 뒤 전원을 켜세요.',
        vi: 'Khi thay khuôn, nhất định phải tắt nguồn và khóa thiết bị.\nLàm cùng hai người, một người đứng cạnh công tắc.\nXong việc, kiểm tra đã đóng nắp an toàn rồi mới bật nguồn.',
        en: 'When changing the die, always turn off the power and lock it out.\nWork in pairs; one person stays by the switch.\nWhen done, check the safety cover is closed before turning the power on.' },
      readBy: { '이현장': { at: '9/16', lang: 'ko' }, '정반장': { at: '9/16', lang: 'ko' } } },
    { id: 'n2', fid: 'daesung', date: '9/02', by: '박대표', ra: null,
      title: { ko: '더운 날 작업할 때', vi: 'Làm việc khi trời nóng', en: 'Working on hot days' },
      body: {
        ko: '물을 자주 마시고, 한 시간마다 그늘에서 10분 쉬세요.\n어지럽거나 속이 메스꺼우면 바로 작업을 멈추고 말해 주세요.',
        vi: 'Uống nước thường xuyên, mỗi giờ nghỉ 10 phút trong bóng mát.\nNếu chóng mặt hoặc buồn nôn, hãy dừng việc ngay và báo cho người khác.',
        en: 'Drink water often and rest in the shade for 10 minutes every hour.\nIf you feel dizzy or sick, stop work right away and tell someone.' },
      readBy: { '김근로': { at: '9/02', lang: 'ko' }, '이현장': { at: '9/03', lang: 'ko' }, 'Nguyen Van A': { at: '9/03', lang: 'vi' } } },
  ],
  // 근로자 의견 (시안 W6 · O7) — author는 계정 이름. 이름을 빼도 보낸 사람 휴대폰에서는 자기 것으로 보인다
  voices: [
    { id: 'v1', fid: 'daesung', date: '9/03', author: '김근로', anon: false, kind: 'better', lang: 'ko',
      text: '휴게실 선풍기가 고장 났어요', photo: false, readAt: '9/03', reply: '새 선풍기 설치했어요', replyAt: '9/05', done: true },
    { id: 'v2', fid: 'daesung', date: '9/16', author: 'Nguyen Van A', anon: true, kind: 'danger', lang: 'vi',
      text: 'Lối đi tòa B hay có dầu tràn, rất dễ trượt ngã.', koTx: 'B동 통로에 기름이 자주 흘러 있어 미끄러지기 쉬워요.', photo: true, readAt: null, reply: null, replyAt: null, done: false },
  ],
  // 센서 상태 (사이트 3곳 · 센서 키마다) — watch 감시 중 · repair 수리 중(운영자가 돌림) · unknown 값 모름(끊김)
  sensors: Object.fromEntries(Object.keys(SENSORS).map((k) => [k, { state: 'watch' }])),
  faults: [],           // 공장주 센서 고장 신고 (시안 O1-마 → 운영자 M2-마)
  memos: [              // 작업 예정 알리기 (시안 O1-사~자) — AI가 알아들은 내용과 결과
    { id: 'm0', at: '9/12 08:40', by: '박대표', text: '9시부터 12시까지 컴프레서 필터 교체', status: 'past',
      facts: { key: null, label: '컴프레서 진동', start: 540, end: 720, day: '9/12', kind: '정비', level: null }, result: '끝남 · 시작·끝 무렵 보류와 폭 고정만' },
    { id: 'm1', at: '9/10 07:50', by: '박대표', text: '매주 수요일 오전에 2번 프레스 세척해요', status: 'history',
      facts: { key: 'press2', label: '2번 프레스', start: null, end: null, day: '9/10', kind: '세척', level: null }, result: '바꾸지 않음 — 평소에도 있던 일이라 AI 기준에 이미 들어 있어요' },
  ],
  // 근로자 명단 (시안 O6) — 공장주가 초대로 관리. notif: 앱 알림 켜짐 여부
  workers: [
    { name: '김근로', lang: 'ko', notif: true, joined: '2024-03', area: 'A동 2라인' },
    { name: '이현장', lang: 'ko', notif: true, joined: '2022-11', area: 'A동' },
    { name: '정반장', lang: 'ko', notif: true, joined: '2019-05', area: 'A동 2라인' },
    { name: '한용접', lang: 'ko', notif: true, joined: '2025-01', area: 'B동' },
    { name: 'Tran Thi B', lang: 'vi', notif: true, joined: '2025-08', area: 'B동' },
    { name: 'Nguyen Van A', lang: 'vi', notif: true, joined: '2026-09-15', area: 'A동 2라인' },
    { name: 'Sok Dara', lang: 'km', notif: true, joined: '2026-06', area: 'B동' },
    { name: '박신입', lang: 'ko', notif: false, joined: '2026-09-15', area: 'A동' },
  ],
  draft: null,          // 지킴이가 진행 중인 점검
  log: [],
};
