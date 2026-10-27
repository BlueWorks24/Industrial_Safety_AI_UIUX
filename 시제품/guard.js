// 지킴이 앱 — 시안 G1~G9. 아이디·비밀번호로 로그인한다 (2026-09-23, 시험 계정 guard1 김지킴·guard2 이조장, 둘 다 전기 1조).
// 2026-09-22 기존 웹 방식: 조·권역, 34문항 판, 주간 보고. 운영자 제출 검사(승인·반려)는 2026-10-14 사용자 지시로 뺐다 — 아직 정해진 게 아니다.
let ACC = null;      // 로그인한 지킴이 { login, name, org }
let ME = '김지킴';
const UI = { hq: '', sheet: null, fT: {}, fact: null, fv: null, meet: 1, cell: null, ftx: null, ftxWait: false, ptsOpen: {}, only: false, ckTab: 'prev', gu: null, areas: [], pin: null, sort: 'near', calM: 9, calD: null, fq: '', fst: 'all', ckOpen: {}, ftab: {}, preBack: {}, notiSeen: new Set(), notiNew: new Set(), wk: { area: null, note: {}, focus: {} } };
const SRC = { base: '기본', prev: '지난번 미흡 항목', ai: 'AI 제안', self: '직접 추가', find: '현장점검 개선사항' };  // find: 10-26 개선 관리 초안

function tasks(s) {
  const t = [];
  // 개선 관리 · 보낼 것 (2026-10-26 초안) — 우리 조가 낸 점검 중 지적이 있는데 아직 공장에 안 보낸 것. 맨 앞
  s.inspections.filter((i) => toSend(i) && TEAM.members.includes(i.by) && !t.some((x) => x.fid === i.fid))
    .forEach((ins) => t.push({ fid: ins.fid, kind: 'send', ins }));
  // 재점검 (2026-10-13) — 우리 조가 낸 점검 중 불량이 있어 재점검이 된 것. 공장주가 보낸 사진을 보고 판정한다. 기한이 급한 것부터
  s.inspections.filter((i) => inRecheck(i) && TEAM.members.includes(i.by) && !t.some((x) => x.fid === i.fid)
    && !s.outbox.guard.some((m) => m.data.insId === i.id)).sort((a, b) => mdNum(a.date) - mdNum(b.date))
    .forEach((ins) => t.push({ fid: ins.fid, kind: 'recheck', ins }));
  // 가야 할 곳: 지난번 미흡을 공장주가 "고쳤어요"로 알린 곳, 아직 점검 안 한 배정 공장.
  // 어느 쪽이든 할 일은 "점검" 하나이고, 지난번 미흡(prev개)이 있으면 그 점검 체크리스트에 따로 붙는다
  ['daesung', 'dongbang', 'hanbit', 'taegwang', ...regList(s).map((r) => r.id).filter((fid) => FACTORIES[fid] && TEAM.areas.includes(FACTORIES[fid].area))].forEach((fid) => {  // 새로 등록한 우리 조 기업도 (2026-10-26)
    if (t.some((x) => x.fid === fid) || s.outbox.guard.some((m) => m.data.fid === fid)) return;
    if (recheckQueue(s, fid).length || !s.inspections.some((i) => i.fid === fid)) t.push({ fid, kind: 'visit', prev: openIssues(s, fid).length });
  });
  return t;
}
// 앱 머리 — 남색 위치 띠 한 줄 (2026-10-15 사용자 지시 — 띠 아래 흰 머리글 줄(방패 + 앱 이름 + 내 정보)을 걷음.
// 두 줄이 110px을 늘 차지해 체크리스트 문항이 덜 보였다). 내 정보 단추는 띠 오른쪽으로 옮기고, 조 이름은 홈 인사말 옆으로 옮겼다.
// 이름만으로는 내 정보로 가는 단추인지 알기 어려워 사람 아이콘을 붙였다 (2026-10-13 사용자 지시 — 하단바에서 내 정보를 뺌)
// 2026-10-15 오후 사용자 지시 — 띠 왼쪽 ⌂ 대신 화성산업진흥원(HIPA) 표시(누르면 홈), 오른쪽은 찾기·알림 아이콘. 내 정보는 하단바 맨 오른쪽으로
// (HIPA 표시는 진흥원 누리집 favicon.svg에서 영문 글자 부분만 잘라 씀 — hipa-logo.svg)
// 큰 제목 ltitle · ltCheck는 common.js에 있다 (2026-10-20 — 근로자 앱도 쓴다). 할 일 · 점검 결과 · 공장 창 · 전체 공장에
const topIcons = () => { const n = notiUnseen(DB.s);
  return `<span class="gtopi"><button class="gti" data-act="search" aria-label="공장 찾기">${I('search', 23)}</button>`
    + `<button class="gti" data-act="noti" aria-label="알림${n ? ` 새 소식 ${n}개` : ''}">${I('bell', 23)}${n ? `<em>${n}</em>` : ''}</button></span>`; };
// 점검 중 머리 오른쪽은 찾기 · 알림 대신 [임시저장] (2026-10-27 사용자 지시 — 시안 A, 단추 5, 누른 뒤 바).
// 적는 대로 이미 저장되니 단추는 "저장됐다"를 보여 주는 일 — 누르면 그 자리에서 초록 ✓ 저장됨(낸 뒤 그림을 작게)으로 2초, 다시 돌아온다
const tmpBtn = () => `<button class="gtmp" data-act="tmpSave">${I('save', 17)}임시저장</button>`;
const gband = (title, back, end) => `<div class="head">${back != null ? `<button class="back" data-go="${back}" aria-label="뒤로">${I('back', 22)}</button>` : ''}`
  + `<button class="hm hipa" data-go="" aria-label="홈"><img src="hipa-logo.svg" alt="HIPA"></button><span class="crumb">${title}</span><span class="end">${end}</span></div>`;
const head = (title, go = '', end = topIcons()) => `<div class="apptop">${gband(title, go, end)}</div>`;
const unsentN = (s) => s.outbox.guard.length;
// 여러 정보를 "·"로 한 줄에 잇지 않는다 (2026-09-22 사용자 지시) — 이름표·값 두 칸 표와 작은 꼬리표로 나눠 보인다
const kv = (rows) => `<dl class="gkv">${rows.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
const tg = (t, c = '') => `<span class="gtg${c ? ' ' + c : ''}">${t}</span>`;

/* ---------- G1 홈 = 공장 목록 (2026-09-22, 사용자가 준 세차장 예약 앱 구성을 참고) ----------
   머리글 아래 프로필과 인삿말 → 정렬 탭(급한 순·거리순·방문일순) → 공장 카드(사진·이름·위치·거리·단추) → 아래에 하단바.
   예전의 "내 할 일" 화면과 2×2 메뉴는 이 목록과 하단바로 합쳐졌다. 사진은 임시 그림이다. */
// 거리 기준 — 폰의 지금 위치. 못 받으면(https가 아님·거절·8초 안에 못 잡음) 화성산업진흥원(봉담) 근처의 대략 좌표 (2026-09-22 사용자 결정).
// 위치는 이 폰 안에서 거리만 재는 데 쓰고 서버로 보내지 않는다.
const ORIGIN = { name: '진흥원(봉담)', ll: [126.955, 37.214] };
const HERE = { st: 'none', ll: null };  // none · asking · ok · fail
function locate() {
  if (HERE.st !== 'none') return;
  if (!navigator.geolocation || !window.isSecureContext) { HERE.st = 'fail'; return; }
  HERE.st = 'asking';
  navigator.geolocation.getCurrentPosition(
    (p) => { HERE.st = 'ok'; HERE.ll = [p.coords.longitude, p.coords.latitude]; render(); },
    () => { HERE.st = 'fail'; render(); },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
}
function kmTo([x, y]) {
  const R = 6371, rad = Math.PI / 180, [x0, y0] = HERE.st === 'ok' ? HERE.ll : ORIGIN.ll;
  const a = Math.sin(((y - y0) * rad) / 2) ** 2 + Math.cos(y0 * rad) * Math.cos(y * rad) * Math.sin(((x - x0) * rad) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
// 탭 둘 — 거리순 · 일정순 (2026-09-22 사용자 결정). 셋째 탭("재점검" → "미흡 있음")은 뺐다:
// 재점검을 따로 두지 않아 미흡은 점검 때 저절로 붙고, 미흡이 남은 곳은 공장 탭과 회사 창에서 보인다
const SORTS = [['near', '거리순'], ['date', '일정순']];
// 방문 일정을 셀 수 있게 — 오늘(이야기 속 9/17)부터, 같은 날이면 시간 순, 날짜 안 정함은 맨 뒤
function whenKey(v) {
  if (!v) return Infinity;
  const m = v.match(/(\d+)\/(\d+)/), day = v.startsWith('오늘') ? 917 : m ? +m[1] * 100 + +m[2] : 99999;
  const hm = v.match(/(\d+):(\d+)/), min = hm ? +hm[1] * 60 + +hm[2] : /오후/.test(v) ? 13 * 60 : 9 * 60;
  return day * 10000 + min;
}
// 재점검은 어느 탭에서든 맨 위 — 기한이 있어서 (2026-10-13). 반려 할 일은 2026-10-14에 운영자 검사와 함께 뺐다
function sortTasks(s, t, mode = 'near') {
  const rank = (x) => (x.kind === 'send' ? -1 : x.kind === 'recheck' ? 0 : 1);
  const backFirst = (a, b) => rank(a) - rank(b) || (a.kind === 'recheck' && b.kind === 'recheck' ? mdNum(a.ins.date) - mdNum(b.ins.date) : 0);
  const near = (a, b) => kmTo(FACTORIES[a.fid].ll) - kmTo(FACTORIES[b.fid].ll);
  const date = (a, b) => { const x = whenKey(s.visits[a.fid]), y = whenKey(s.visits[b.fid]); return x === y ? 0 : x < y ? -1 : 1; };
  return [...t].sort((a, b) => backFirst(a, b) || (mode === 'date' ? date(a, b) || near(a, b) : near(a, b)));
}
// 공장 자리 지도 — 공장이 있는 읍·면·동 테두리 + 핀 (2026-09-23 사용자 결정: 공장 사진은 찍어 모으기 어려워 첫 단계에서 못 한다 → 지도로).
// 카드마다 네이버 지도를 부르면 목록이 느려지고 사용량이 늘어서, 가진 경계 자료(geo.js)로 직접 그린다. 공장마다 한 번 그려 둔다
const MINI = {};
function facMini(fid, AR = 4 / 3) {  // AR: 칸 가로:세로
  const key = fid + AR;
  if (MINI[key]) return MINI[key];
  const f = FACTORIES[fid], d = HWASEONG.find((h) => h.name === f.dong);
  const [px, py] = mxy(f.ll);
  let x0 = px - 2500, x1 = px + 2500, y0 = py - 2000, y1 = py + 2000;  // 동을 못 찾으면 공장 둘레 몇 km
  if (d) ({ x0, y0, x1, y1 } = bboxOf([d.name]));
  let w = (x1 - x0) * 1.15, h = (y1 - y0) * 1.15;
  if (w / h > AR) h = w / AR; else w = h * AR;
  const vx = (x0 + x1) / 2 - w / 2, vy = (y0 + y1) / 2 - h / 2;
  const path = (polys) => polys.map((p) => p.map((r) => 'M' + r.map((c) => mxy(c).map((v) => v.toFixed(0)).join(',')).join('L') + 'Z').join('')).join('');
  // 둘레의 동은 화면에 걸치는 것만 그린다
  const near = HWASEONG.filter((h2) => h2 !== d && h2.polys.some((p) => p[0].some((c) => { const [x, y] = mxy(c); return x > vx && x < vx + w && y > vy && y < vy + h; })));
  const r = Math.min(w, h) * 0.065;
  return (MINI[key] = `<svg class="fph fmini" viewBox="${vx.toFixed(0)} ${vy.toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${f.name} 위치 지도">
    <rect x="${vx}" y="${vy}" width="${w}" height="${h}" class="fmbg"/>${near.map((h2) => `<path d="${path(h2.polys)}"/>`).join('')}
    ${d ? `<path class="own" d="${path(d.polys)}"/>` : ''}
    <circle cx="${px}" cy="${py}" r="${r}" class="ring"/><circle cx="${px}" cy="${py}" r="${r}" class="ring r2"/><circle cx="${px}" cy="${py}" r="${r}" class="dot"/></svg>`);
}
// 공장 카드 — 위치 지도 · 이름 + 상태 · 위치 · 거리 · 방문일 · 그 상태에 맞는 단추 하나
function fcard(s, x) {
  const f = FACTORIES[x.fid], v = s.visits[x.fid];
  const go = `${I('chevron', 16)}`;
  const going = s.draft && s.draft.kind === 'first' && s.draft.fid === x.fid;
  // 예약을 걷었다 (2026-10-07 사용자 지시) — 공장주와 따로 날을 맞추거나 불시에 가므로 점검 시작은 늘 열려 있다.
  // 방문일은 지킴이가 스스로 적어 두는 것(캘린더·일정순에 쓰임)이라 옆에 작은 단추로 둔다
  const btn = x.kind === 'recheck' ? `<button class="fbtn" data-go="send/${x.ins.id}">개선 관리 ${go}</button>`
    : `<div class="fbtns"><button class="fbtn" data-act="newDraft" data-fid="${x.fid}">${going ? '이어서 점검' : '점검 시작'} ${go}</button>
      <button class="fbtn line fsub" data-act="date" data-fid="${x.fid}">${I('calendar', 15)} ${v ? '일정 변경' : '방문일 정하기'}</button></div>`;
  // 카드 안 정보 (2026-10-14 사용자: 이름 옆 "재점검" 알약이 AI스럽고, 할 일마다 정보가 제각각이라 한눈에 안 들어온다)
  // → 알약을 걷고 공장 탭과 같은 이름표·값 줄로. 어느 할 일이든 같은 차례: 마지막 점검 → 기한·방문 → 사진·미흡
  // ("할 일" 줄은 같은 날 뺐다 — 목록의 재점검 · 점검 소제목이 말해 준다)
  const kv = (k, val, c = '') => `<div class="fkv"><em>${k}</em><b${c ? ` class="${c}"` : ''}>${val}</b></div>`;
  const li = x.ins || lastIns(s, x.fid);
  let rows;
  if (x.kind === 'recheck') {
    const due = recheckDue(x.ins), n = daysLeft(due), bad = x.ins.items.filter(TRACKED), got = bad.filter((it) => rckFix(it)).length;
    rows = kv('마지막 점검', x.ins.date) + kv('시정 기한', `${due}까지 ${dWord(n)}`, n < 0 ? 'warn' : '') + kv('고친 사진', `${bad.length}개 중 ${got}개 받음`);
  } else {
    rows = (li ? kv('마지막 점검', li.date) : '<div class="fkv none">점검 기록 없음</div>')
      + kv('방문', v || '정하지 않음', v ? 'now' : 'soft') + (x.prev ? kv('지난번 미흡', `${x.prev}건`, 'warn') : '');
  }
  return `<div class="fcard">
    <button class="fphw" data-go="pre/${x.fid}" aria-label="${f.name} 자세히">${facMini(x.fid)}</button>
    <div class="fbody">
      <div class="fnm"><button class="fname" data-go="pre/${x.fid}">${f.name}</button></div>
      <div class="floc">화성시 ${f.dong}</div>
      <div class="fmeta">${kmTo(f.ll).toFixed(1)}km</div>
      ${rows}${btn}
    </div></div>`;
}
// 홈 (2026-10-19 사용자 지시 — 홈 한 화면에서 모든 업무로 이어지되 세로로 길지 않게. 레퍼런스 앱 배치를 보고 고른 "카드가 입구" 안).
// 홈에는 찾기 · 오늘 방문(AI 요약) · 큰 카드 넷(점검하기 · 판정하기 · 시정 현황 · 점검 결과)만 둔다.
// 2026-10-19 사용자 지시로 넷을 다시 추림 — 방문일 잡기는 빼고(예약이 없어 메모일 뿐, 공장 창 · 캘린더에서 정한다), 시정은 판정과 겹치지 않게 사진이 아직 안 온 곳만.
// 같은 날 넷째 칸 센서 경보 → 점검 결과(홈에서 일부터 결과까지 다 가게, 하단바에도 있지만 길이 둘이어도 된다). 센서 이상은 AI 요약 · 공장 창 기록 탭 · 알림에 남는다
// 카드를 누르면 할 일 화면(#/todo)이 그 탭으로 열린다. 할 일 카드 목록 · 권역 · 거리순 · 일정순은 그 화면으로, 최근 점검한 곳은 공장 탭 맨 위로 옮겼다.
// 맨 위는 머리 띠 대신 HIPA 표시(왼쪽) + 둥근 알림 단추(오른쪽)
// 판정 · 시정 탭을 재점검 하나로 합치고 안을 "판정 필요 · 시정 중"으로 나눴다 (2026-10-19 사용자 지시). 센서 경보 탭은 같은 날 뺌.
// 2026-10-26 사용자 지시로 재점검 탭을 "개선 관리"로 바꾸고(초안) 맨 앞에 "보낼 것"(지적을 정리해 공장에 보내기 전)을 더했다
// 같은 날 저녁 사용자 지시로 개선완료 → 제출할 것 (판정 뒤 개선을 위한 조언을 적어 제출하는 마지막 단계. 끝난 점검은 홈 점검 결과에서 본다)
const RSUB = [['send', '보낼 것'], ['fix', '시정 중'], ['judge', '판정 필요'], ['sub', '제출할 것']];
const TD = [['all', '전체'], ['visit', '점검'], ['rck', '개선 관리']];
// 공장이 고칠 것 — 보낼 때 개선완료(현장에서 바로 고침)로 둔 것은 뺀다 (2026-10-26)
const toFix = (ins) => ins.items.filter(TRACKED).filter((it) => itemState(it) !== 'fixed' || rckFix(it));
const rckGot = (ins) => toFix(ins).filter((it) => rckFix(it)).length;
// 시정 기한이 지난 재점검 — 사진이 안 와도 판정한다(안 고친 것은 미개선으로 두고 제출, 2026-10-26 사용자 지시)
const overdue = (ins) => daysLeft(recheckDue(ins)) < 0;
const toJudge = (ins) => rckGot(ins) > 0 || overdue(ins);
// 할 일을 넷으로 — 판정: 재점검 중 고친 사진이 한 장이라도 온 곳과 기한이 지난 곳. 시정: 나머지 재점검(기한을 지켜볼 곳, 판정과 안 겹침)
function todoJobs(s, t = tasks(s)) {
  const re = t.filter((x) => x.kind === 'recheck'), send = t.filter((x) => x.kind === 'send');
  // 제출할 것 — 우리 조가 낸 점검 중 판정이 끝났거나 개선사항이 없어 조언을 적어 제출할 것 (2026-10-26 사용자 지시, 그 전엔 개선완료 목록)
  const sub = s.inspections.filter((i) => TEAM.members.includes(i.by) && toSub(i) && TEAM.areas.includes(FACTORIES[i.fid].area))
    .sort((a, b) => mdNum(b.date) - mdNum(a.date)).map((ins) => ({ fid: ins.fid, kind: 'sub', ins }));
  return { all: t, visit: t.filter((x) => x.kind === 'visit'), rck: [...send, ...re, ...sub], send, judge: re.filter((x) => toJudge(x.ins)), fix: re.filter((x) => !toJudge(x.ins)), sub };
}
// 이번 주(9/14 월 ~ 이야기 속 오늘 9/17) 우리 조가 낸 점검 수 — 홈 점검 결과 카드
const weekDone = (s) => s.inspections.filter((i) => TEAM.members.includes(i.by) && mdNum(i.date) >= 914 && mdNum(i.date) <= 917).length;
// 홈 찾기 — 공장 탭으로 넘기지 않고 홈 자리에서 바로 결과를 보인다 (2026-10-19 사용자 지시).
// 글자를 넣으면 오늘 방문 · 카드 넷 자리를 결과 목록이 차지하고, 지우면 돌아온다. 우리 조 공장 전체에서 이름으로 찾는다(권역 · 기간 거르기는 안 탄다)
function homeFind(s) {
  const q = UI.hq.trim(), t = tasks(s);
  const list = Object.keys(FACTORIES).filter((fid) => TEAM.areas.includes(FACTORIES[fid].area) && FACTORIES[fid].name.includes(q))
    .sort((a, b) => FACTORIES[a].name.indexOf(q) - FACTORIES[b].name.indexOf(q) || kmTo(FACTORIES[a].ll) - kmTo(FACTORIES[b].ll));
  return `<div class="hlh"><b>찾은 공장</b><em>${list.length}곳</em></div>
    <div class="hlist">${list.map((fid) => facRow(s, fid, t.filter((x) => x.fid === fid))).join('') || `<div class="cnone">"${esc(q)}"에 맞는 공장이 없어요</div>`}</div>`;
}
function home(s) {
  locate();
  const J = todoJobs(s), n = notiUnseen(s);
  const today = J.visit.filter((x) => (s.visits[x.fid] || '').startsWith('오늘')).sort((a, b) => whenKey(s.visits[a.fid]) - whenKey(s.visits[b.fid]));
  // 카드 아래 한 줄 안내(오늘 10:00 대성정밀 등)는 걷었다 (2026-10-19 사용자 지시) — 이름과 곳 수만
  // 카드 이름 옆 아이콘 (2026-10-19 사용자 지시) — 바탕 네모 없이 선 아이콘만
  const HKI = { visit: 'clipboard', rck: 'checkCircle', firms: 'factory', result: 'list' };
  // 점검 결과 칸은 할 일이 아니라 점검 결과 탭으로 간다 — 숫자도 곳 수가 아니라 이번 주 낸 점검 수
  const card = ([k, w]) => `<button class="hkc" ${k === 'result' ? 'data-go="factories"' : k === 'firms' ? 'data-go="firms"' : 'data-act="todo"'} data-v="${k}"><b>${I(HKI[k], 22)}${w}</b>
    <span class="hkb"><span class="hpill">${k === 'result' ? `이번 주 ${weekDone(s)}건` : k === 'firms' ? `${firmAll(s).length}곳` : `${J[k].length}곳`}</span><span class="hkgo">보기${I('chevron', 15)}</span></span></button>`;
  const going = (fid) => s.draft && s.draft.kind === 'first' && s.draft.fid === fid;
  // 오늘 방문 한 곳 — 시간 · 공장 · 점검 시작(글자 단추 — 동그란 재생 단추가 AI스럽다, 2026-10-19 사용자), 길찾기 · 전화(2026-10-19 사용자 지시), AI 요약 두 줄.
  // 길찾기는 네이버 지도 모바일 길찾기 주소(가설 — 실제 서비스에서는 앱 연결), 좌표는 시제품의 가짜 좌표
  const trow = (x) => { const f = FACTORIES[x.fid], tel = firmOf(s, x.fid).tel;
    const route = `https://m.map.naver.com/route.nhn?menu=route&pathType=0&showMap=true&ename=${encodeURIComponent(f.name)}&ex=${f.ll[0]}&ey=${f.ll[1]}`;
    return `<div class="hts"><div class="htr"><button class="htrb" data-go="pre/${x.fid}"><span class="htm">${visitDay(s.visits[x.fid]).tm}</span>
      <span class="htn"><b>${f.name}</b><small>화성시 ${f.dong}</small></span></button>
      <button class="hst" data-act="newDraft" data-fid="${x.fid}" aria-label="${f.name} ${going(x.fid) ? '이어서 점검' : '점검 시작'}">${going(x.fid) ? '이어서 점검' : '점검 시작'}</button></div>
      <div class="htac"><a href="${route}" target="_blank" rel="noopener">${I('pin', 17)}길찾기</a><a href="tel:${tel}" aria-label="${f.name}에 전화 ${tel}">${I('phone', 17)}전화</a></div>
      <button class="hai" data-act="brief" data-fid="${x.fid}" aria-label="${f.name} AI 요약 자세히">${I('sparkle', 15)}<span><em>AI 요약</em>${esc(aiBrief(s, x.fid))}</span>${I('chevron', 14)}</button></div>`; };
  // 두 곳 이상이면 옆으로 넘겨 본다 (2026-10-19 사용자 지시) — 손가락으로 밀면 한 곳씩 멈춘다(scroll-snap), 아래 점이 따라간다
  const slides = today.length > 1 ? `<div class="htsl" data-n="${today.length}">${today.map(trow).join('')}</div>
      <div class="htdots" aria-hidden="true">${today.map((_, j) => `<i class="${j === (UI.tdi || 0) ? 'on' : ''}"></i>`).join('')}</div>` : today.map(trow).join('');
  return `${sbar(s.net.guard ? '지킴이' : '📶 전파 없음')}<div class="scr ghome"><div class="bd">
    <div class="htop"><button class="hlogo" data-go="" aria-label="홈"><img src="hipa-logo.svg" alt="HIPA"></button>
      <button class="hbell" data-act="noti" aria-label="알림${n ? ` 새 소식 ${n}개` : ''}">${I('bell', 22)}${n ? `<em>${n}</em>` : ''}</button></div>
    <div class="ptr" aria-hidden="true"><i></i></div>
    <div class="hhi"><small>9월 17일 목요일 ${tg(TEAM.name)}${s.net.guard ? '' : `<span class="live off"><i></i>전파 없음</span>`}</small><b>안녕하세요, ${ME}님</b></div>
    <label class="hsrch">${I('search', 20)}<input id="hq" type="search" placeholder="공장 이름으로 찾기" value="${esc(UI.hq)}" autocomplete="off" enterkeyhint="search">
      <button class="hqx" data-act="hqClear" aria-label="찾기 지우기">${I('close', 16)}</button></label>
    <div id="hmain" class="hmain">${UI.hq.trim() ? homeFind(s) : `${unsentN(s) ? `<div class="warnbar"><span class="ic">${I('clock', 22)}</span><div><div class="mid">아직 안 올라간 점검 ${unsentN(s)}건</div><div class="small">전파가 잡히면 저절로 올라가요</div></div></div>` : ''}
    <div class="htd"><div class="htdh"><b>오늘 방문</b>${today.length ? `<span class="htdn">${today.length}곳</span>` : ''}<button class="hcal" data-act="calToday">${I('calendar', 15)}캘린더 ${I('chevron', 14)}</button></div>
      ${slides || '<div class="hnone">오늘 잡힌 방문이 없어요</div>'}</div>
    <div class="hkg">${[['visit', '점검하기'], ['rck', '개선 관리'], ['firms', '기업등록'], ['result', '점검 결과']].map(card).join('')}</div>
    <div class="proto">가상 데이터로 만든 시제품이에요</div>`}</div>
  </div></div>${UI.sheet && UI.sheet.type === 'brief' ? briefSheet(s) : ''}`;
}
const hpill = (t, c = '') => `<span class="hpill${c ? ' ' + c : ''}">${t}</span>`;
// 할 일 카드 — 이름 · 지도를 누르면 공장 창, 아래 단추는 그 일(점검 시작 · 판정하기 · 공장에 다시 알리기).
// 단추는 홈처럼 글자로 (2026-10-19 사용자: 홈과 비슷하게 — 동그란 재생 · 화살표 단추가 AI스럽다). 오늘 갈 곳만 남색 채움, 나머지는 옅은 남색
function todoRow(s, x, tab) {
  const f = FACTORIES[x.fid];
  // 카드 — 이름 + 주소 · 거리 한 줄, 아래 이름표 | 값 줄 표 + 그 일의 단추. 작은 지도는 뺐다 (2026-10-26 사용자 지시 — 지도 옆 좁은 칸의 작은 글씨가 한눈에 안 들어왔다).
  // 시정 기한이 있는 카드(시정 중 · 판정 필요)는 이름 줄 오른쪽에 D-n을 크게 (같은 날 사용자 시안 F — 그 전엔 회색 이름표 칸 표 시안 E).
  // 기한 칸은 채움 없는 얇은 테두리 "도장" — 머리 띠 "시정 기한", D-n, ~날짜 (같은 날 사용자 시안 E — 옅은 색 칸에 큰 D-n이 AI스러웠다). 이름을 누르면 공장 창
  const kv = (k, val, c = '') => `<div><em>${k}</em><b${c ? ` class="${c}"` : ''}>${val}</b></div>`;
  // end — 이름 줄 오른쪽에 둘 것(점검 카드의 일정 변경, 2026-10-26 사용자 지시)
  const card = (rows, btns, due, end = '') => { const n = due && daysLeft(due);
    return `<div class="fcard tdc"><div class="fbody"><div class="tdhd"><div><div class="fnm"><button class="fname" data-go="pre/${x.fid}">${f.name}</button></div>
      <div class="tdloc"><span>${I('pin', 16)}화성시 ${f.dong}</span><span>${kmTo(f.ll).toFixed(1)}km</span></div></div>
      ${due ? `<div class="tddue${n < 0 ? ' warn' : ''}"><small>시정 기한</small><b>${dWord(n)}</b><em>~${due}</em></div>` : end}</div><div class="tdgt">${rows}</div>${btns}</div></div>`; };
  const go = I('chevron', 16);
  if (x.kind === 'send') {
    // 보낼 것 — 점검 결과는 냈지만 지적을 아직 공장에 안 보낸 곳 (2026-10-26 개선 관리 초안)
    const fs = x.ins.items.filter((it) => it.src === 'find'), ok = fs.filter((it) => it.st === 'ok').length;
    return card(kv('점검일', `${x.ins.date} ${esc(x.ins.by)}`) + kv('개선사항', `${fs.length}건`) + kv('개선여부', `개선 중 ${fs.length - ok} · 개선완료 ${ok}`),
      `<button class="fbtn tdgo" data-go="send/${x.ins.id}">정리하고 보내기 ${go}</button>`);
  }
  if (x.kind === 'sub') {
    // 제출할 것 — 판정이 끝났거나 개선사항이 없던 점검. 조언을 적어 제출한다 (2026-10-26 사용자 지시)
    const fs = kzList(x.ins), ok = fs.filter((it) => itemState(it) === 'fixed').length;
    return card(kv('점검일', `${x.ins.date} ${esc(x.ins.by)}`) + kv('점검 결과', x.ins.result || RESULTS[0])
      + (fs.length ? kv('개선완료', `${ok}건`) + kv('미개선', `${fs.length - ok}건`, fs.length - ok ? 'warn' : '') : kv('개선사항', '없음', 'soft')),
      `<button class="fbtn tdgo" data-go="sub/${x.ins.id}">조언 쓰고 제출 ${go}</button>`);
  }
  if (x.kind === 'recheck' && toJudge(x.ins)) {
    // 판정 — 사진은 카드에 넣지 않는다(같은 날 사용자 지시). 판정하기를 누르면 재점검 화면에서 사진을 본다
    const bad = toFix(x.ins), got = bad.filter((it) => rckFix(it)), due = recheckDue(x.ins);
    const last = got.map((it) => rckFix(it).at).sort((a, b) => mdNum(b) - mdNum(a))[0];
    return card(kv('점검일', `${x.ins.date} ${esc(x.ins.by)}`)
      + kv('고친 사진', `${bad.length}개 중 ${got.length}개 받음`) + (last ? kv('받은 날', last) : ''),
      `<button class="fbtn tdgo" data-go="send/${x.ins.id}">판정하기 ${go}</button>`, due);
  }
  if (x.kind === 'recheck') {
    // 시정 — 공장이 고친 사진을 올리길 기다리는 곳 (2026-10-19 사용자 지시 시안 A, 지적 항목 목록은 빼고).
    // 공장 알림은 점검을 낸 날 저절로 가고, "공장에 다시 알리기"로 또 보낼 수 있다(가설 — 공장 웹 · 문자로 가는 알림)
    const bad = toFix(x.ins), due = recheckDue(x.ins), tel = firmOf(s, x.fid).tel;
    return card(kv('점검일', `${x.ins.date} ${esc(x.ins.by)}`)
      + kv('지적', `${bad.length}건`) + kv('공장 알림', `${x.ins.nudged || x.ins.date} 보냄`),
      `<div class="fbtns tdsub"><button class="fbtn line fsub" data-act="nudge" data-id="${x.ins.id}">${I('bell', 15)} 다시 알리기</button>
      <a class="fbtn line fsub" href="tel:${tel}" aria-label="${f.name}에 전화 ${tel}">${I('phone', 15)} 전화</a></div>
      <button class="fbtn tdgo" data-go="send/${x.ins.id}">개선사항 보기 ${go}</button>`, due);
  }
  // 점검 — 방문 · 지난 점검(날짜와 결과) · 지난번 미흡 · 센서 이상 · 업종과 인원
  const v = s.visits[x.fid], going = s.draft && s.draft.kind === 'first' && s.draft.fid === x.fid;
  const li = facLast(s, x.fid), st = facSt(s, x.fid), hist = s.alarms.filter((a) => alarmFid(a) === x.fid);
  const rows = kv('방문', v || '정하지 않음', v ? 'now' : 'soft')
    + kv('지난 점검', li ? `${li.date} ${(FAC_ST.find(([k]) => k === st) || [, ''])[1]}` : '처음 가는 곳', li ? '' : 'soft')
    + (x.prev ? kv('지난번 미흡', `${x.prev}건`, 'warn') : '')
    + (hist.length ? kv('센서 이상', `최근 ${hist.length}건`) : '')
    + kv('업종', `${esc(f.type)} ${f.workers}명`);
  // 일정 변경은 이름 줄 오른쪽 위, 점검 시작 · 이어서 점검은 아래 카드 폭 긴 단추 (2026-10-26 사용자 지시 — 둘이 나란히 아래에 있었다).
  // 개선 관리 카드도 같은 날 같은 꼴 — 주 단추는 맨 아래 긴 단추, 시정 중의 다시 알리기 · 전화는 그 위 반반
  return card(rows, `<button class="fbtn tdgo" data-act="newDraft" data-fid="${x.fid}">${going ? '이어서 점검' : '점검 시작'} ${go}</button>`, null,
    `<button class="fbtn line fsub tdsch" data-act="date" data-fid="${x.fid}">${I('calendar', 15)} ${v ? '일정 변경' : '방문일 정하기'}</button>`);
}
// 기업등록 (2026-10-26 사용자 지시 — 홈 카드 "전체 공장"을 기존 화성 웹의 기업등록으로 바꿈). 이름 · 칸 · 꼭 적을 칸(*)은 기존 웹 그대로.
// 목록은 화성시 전체 = 우리 조 공장(FACTORIES) + 다른 조 구역 가상 기업(FIRM_DB) + 새로 등록한 기업(s.op.facs — 운영자 웹 공장 등록과 같은 자리라 거기서도 "새로 등록"으로 보인다).
// 새로 등록한 기업이 우리 조 구역이면 바로 공장이 된다(점검하기 목록 · 공장 창). 점검거부는 운영자 웹 규칙대로 목록에만 남는다
const regList = (s) => (s.op || {}).facs || [];
const TEAM_DONGS = TEAM.areas.flatMap((a) => TEAM.dongs[a]);
const dongLL = (dong) => { const d = HWASEONG.find((h) => h.name === dong); if (!d) return [126.95, 37.15];
  const pts = mainPolys(d)[0][0]; return [0, 1].map((k) => pts.reduce((t, c) => t + c[k], 0) / pts.length); };  // 핀은 그 읍·면·동 가운데 (가짜 좌표)
function syncReg(s) {
  regList(s).forEach((r) => { if (FACTORIES[r.id] || r.why === '점검거부') return;
    FACTORIES[r.id] = { name: r.name, area: TEAM.areas.find((a) => TEAM.dongs[a].includes(r.dong)) || r.dong, dong: r.dong, ll: dongLL(r.dong), type: r.type || '기타', workers: r.workers ?? 0, roman: r.name };
    FIRM[r.id] = { ...r }; });
}
const firmAll = (s) => { const reg = regList(s);
  return [...Object.keys(FACTORIES).filter((fid) => FIRM[fid]).map((fid) => { const f = FACTORIES[fid], rg = reg.find((r) => r.id === fid), x = firmOf(s, fid);
      return { ...x, workers: rg ? rg.workers : x.workers, id: fid, name: f.name, dong: f.dong, type: f.type, last: (facLast(s, fid) || {}).date || '', isNew: !!rg }; }),
    ...FIRM_DB, ...reg.filter((r) => !FACTORIES[r.id]).map((r) => ({ ...r, isNew: true }))]
    .map((x, i) => [x, i]).sort(([a, i], [b, j]) => (b.regDate || '2026.09.17').localeCompare(a.regDate || '2026.09.17') || j - i).map(([x]) => x);  // 최근 등록 먼저 (기존 웹 번호 큰 순)
};
const FG_KEYS = [['all', '전체'], ['name', '기업명'], ['ceo', '대표자명'], ['biz', '사업자번호'], ['code', '기업코드']];
const FG_OPT = { own: ['소유', '임차', '기타'], kind: ['소공인', '소기업', '중소기업', '기타'], why: ['현장등록', '점검신청', '점검거부', '기업DB', '기타'] };
const fgF0 = () => ({ own: [], kind: [], why: [], dong: '', from: '', to: '' });
const fgN = (f) => ['own', 'kind', 'why'].filter((k) => f[k].length).length + (f.dong ? 1 : 0) + (f.from || f.to ? 1 : 0);
function fgMatch(x, f = UI.fgf || fgF0()) {
  const q = (UI.fgq || '').trim().replace(/-/g, '').toLowerCase(), keys = UI.fgk && UI.fgk !== 'all' ? [UI.fgk] : ['name', 'ceo', 'biz', 'code'];
  if (q && !keys.some((k) => String(x[k] || '').replace(/-/g, '').toLowerCase().includes(q))) return false;
  if ((UI.fgs || 'team') === 'team' && !TEAM_DONGS.includes(x.dong)) return false;
  if (['own', 'kind', 'why'].some((k) => f[k].length && !f[k].includes(x[k]))) return false;
  if (f.dong && x.dong !== f.dong) return false;
  if (f.from || f.to) { if (!x.last) return false; const d = isoOf(x.last); if ((f.from && d < f.from) || (f.to && d > f.to)) return false; }  // 점검일자 = 최종점검일
  return true;
}
// 목록 — 위 찾기 칸(검색항목 + 검색어), 범위(우리 조 · 화성시 전체)와 검색조건 창, 기업등록 목록. 쪽 번호 대신 더 보기(10곳씩).
// 목록은 기존 웹처럼 세 칸 표 — 기업명 · 행정구역 · 최종점검 (2026-10-26 사용자 시안 D — 카드 하나에 정보가 너무 많았다). 줄을 누르면 기업 보기
function firmsScreen(s) {
  const all = firmAll(s), list = all.filter((x) => fgMatch(x)), shown = UI.fgMore || 10, n = fgN(UI.fgf || fgF0()), sc = UI.fgs || 'team';
  const row = (x) => `<tr data-go="firm/${x.id}"><td>${esc(x.name)}${x.isNew ? '<span class="fgnw">새로</span>' : ''}</td><td>${x.dong}</td><td${x.last ? '' : ' class="none"'}>${x.last || '없음'}</td></tr>`;
  return `${sbar('지킴이')}<div class="scr gtodo"><div class="bd">
    ${head('기업등록', '')}
    ${ltitle('기업등록')}
    <div class="hfrow fgfind"><select class="input" id="fgk" aria-label="검색항목">${FG_KEYS.map(([k, w]) => `<option value="${k}"${(UI.fgk || 'all') === k ? ' selected' : ''}>${w}</option>`).join('')}</select>
      <input class="input" id="fgq" type="search" placeholder="검색어 입력" value="${esc(UI.fgq || '')}" autocomplete="off" enterkeyhint="search"></div>
    <div class="tdtool"><button class="harea${n ? ' on' : ''}" data-act="fgfOpen">검색조건${n ? ` ${n}` : ''} ${I('chevron', 14)}</button>
      <div class="hsort" role="group" aria-label="범위">${[['team', '우리 조'], ['all', '화성시 전체']].map(([k, w]) => `<button class="${sc === k ? 'on' : ''}" aria-pressed="${sc === k}" data-act="fgScope" data-v="${k}">${w}</button>`).join('')}</div></div>
    <div id="fgres"><div class="hlh"><b>기업등록 목록</b><em>${list.length}곳</em><button class="fgnew" data-go="firms/new">${I('plus', 17)}기업등록</button></div>
    <div class="hlist">${list.length ? `<table class="fgt"><thead><tr><th>기업명</th><th>행정구역</th><th>최종점검</th></tr></thead><tbody>${list.slice(0, shown).map(row).join('')}</tbody></table>`
      : `<div class="cnone">${(UI.fgq || '').trim() || n ? '조건에 맞는 기업 없음' : '등록된 기업 없음'}</div>`}
      ${list.length > shown ? `<button class="more" data-act="fgMore">더 보기 <span class="small">${list.length - shown}곳 남음</span></button>` : ''}</div></div>
  </div></div>${UI.sheet && UI.sheet.type === 'fgf' ? fgfSheet(s) : ''}`;
}
// 검색조건 창 — 기존 웹 검색조건 입력 칸 그대로(소유형태 · 기업종류 · 행정구역 · 등록사유 · 점검일자). 고르는 동안 아래 단추에 맞는 곳 수
function fgfSheet(s) {
  const f = UI.sheet.v, n = firmAll(s).filter((x) => fgMatch(x, f)).length;
  const multi = (k, t) => `<div class="lbl">${t}</div><div class="fseg">${FG_OPT[k].map((o) => `<button class="${f[k].includes(o) ? 'on' : ''}" aria-pressed="${f[k].includes(o)}" data-act="fgfTg" data-k="${k}" data-v="${o}">${o}</button>`).join('')}</div>`;
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet fsheet"><div class="grip"></div><div class="mid">검색조건</div>
    ${multi('own', '소유형태')}${multi('kind', '기업종류')}
    <div class="lbl">행정구역</div><select class="input" id="fgfDong">${dongOpts(f.dong, '전체')}</select>
    ${multi('why', '등록사유')}
    <div class="lbl">점검일자 <span class="small">최종점검일</span></div>
    <div class="gper"><input class="input" id="fgfFrom" type="date" value="${f.from}" aria-label="시작일"><span>~</span><input class="input" id="fgfTo" type="date" value="${f.to}" aria-label="끝일"></div>
    <div class="row sstick"><button class="btn ghost cxl" data-act="fgfReset">초기화</button><button class="btn" data-act="fgfApply">${n}곳 보기</button></div></div>`;
}
const dongOpts = (cur, none) => `<option value="">${none}</option>` + GU_ORDER.map((g) => `<optgroup label="${g}">${guDongs(g).map((d) => `<option${d === cur ? ' selected' : ''}>${d}</option>`).join('')}</optgroup>`).join('');
// 기업 보기 — 등록 칸 그대로 한 장 표(사전 확인 표와 같은 모양). 우리 조 공장이면 공장 창으로 가는 단추
function firmView(s, id) {
  const x = firmAll(s).find((y) => y.id === id);
  if (!x) { R.go('firms'); return ''; }
  const ours = FACTORIES[id] && TEAM.areas.includes(FACTORIES[id].area);
  const soft = '<span class="gfte">비어 있음</span>', v = (y, unit = '') => (y || y === 0 ? esc(y) + unit : soft);
  const r = (k, val, end = '') => `<div class="gftr"><span><em>${k}</em></span><b>${val}</b>${end}</div>`;
  const link = (href, ic, label, y) => (y ? `<a href="${href}${y}" aria-label="${label} ${esc(y)}">${I(ic, 18)}</a>` : '');
  const inj = x.injuries ? Object.entries(x.injuries).filter(([, n]) => n !== '').map(([y, n]) => `${y}년 ${esc(n)}건`).join('<br>') : x.injury != null ? `2025년 ${x.injury}건` : '';
  return `${sbar('지킴이')}<div class="scr"><div class="bd">
    ${head(esc(x.name), 'firms')}
    ${ltitle(esc(x.name))}
    <div class="gftb"><div class="gfth"><b>1. 기업정보</b>${x.isNew ? tg('새로 등록', 'now') : ''}</div>
      ${r('기업코드', v(x.code))}${r('기업명', esc(x.name))}${r('사업자등록번호', v(x.biz))}${r('대표자명', v(x.ceo))}
      ${r('회사 전화번호', v(x.tel), link('tel:', 'phone', '회사 전화', x.tel))}${r('회사 팩스번호', v(x.fax))}${r('회사 주대표 메일', v(x.mail), link('mailto:', 'send', '대표 메일', x.mail))}
      ${r('사업장 주소', `${x.zip ? `<small>${esc(x.zip)}</small>` : ''}경기도 화성시 ${x.dong} ${esc(x.addr || '')}`)}${r('행정구역', `화성시 ${x.dong}`)}
      ${r('업종코드', x.ksic ? `${x.ksic[0]}<small>${x.ksic[1]}</small>` : soft)}${r('주 생산용품', v(x.product))}
      ${r('상시 근로자수', v(x.workers, '명'))}${r('외국인 근로자수', v(x.foreign, '명'))}${r('소유형태', v(x.own))}${r('기업종류', v(x.kind))}
      ${r('안전담당자 성명', v(x.mgr))}${r('안전담당자 전화번호', v(x.mgrTel), link('tel:', 'phone', '담당자 전화', x.mgrTel))}${r('안전담당자 이메일', v(x.mgrMail))}
      ${r('재해건수 이력', inj || soft)}${r('등록사유', v(x.why))}${r('기업등록일자', v(x.regDate))}${r('최종점검일자', x.last ? x.last : soft)}</div>
    ${ours ? `<button class="btn ghost" data-act="facInfo" data-fid="${id}">${I('factory', 20)}공장 창 보기</button>` : `<div class="cnone">${x.why === '점검거부' ? '점검거부 기업' : '다른 조 구역'}<br>점검 목록에 없음</div>`}
  </div></div>`;
}
// 기업등록 — 기존 웹 등록 칸과 차례 그대로(1. 기업정보 한 묶음). 칸에 적는 값은 UI.fgr에 두어 다시 그려도 남는다(DB는 등록하기 때만)
const fgR0 = () => ({ name: '', biz: '', ceo: '', tel: '', fax: '', mail: '', zip: '', road: '', addr2: '', dong: '', ksic: '', product: '', workers: '', foreign: '',
  own: '', kind: '', mgr: '', mgrTel: '', mgrMail: '', inj: { 2024: '', 2025: '', 2026: '', 2027: '', 2028: '' }, why: '현장등록', regDate: isoOf(`${TODAY.m}/${TODAY.d}`) });
const FG_YEARS = [2024, 2025, 2026, 2027, 2028];
function firmNew(s) {
  const d = (UI.fgr ||= fgR0());
  const req = (t) => `${t}<i class="gftm">*</i>`;
  const inp = (k, label, type = '', im = '') => `<label class="fgfld"><span>${label}</span><input class="input" id="fg-${k}" data-fg="${k}" value="${esc(d[k])}" placeholder="${label.replace(/<[^>]+>/g, '')}"${type ? ` type="${type}"` : ''}${im ? ` inputmode="${im}"` : ''} autocomplete="off"></label>`;
  const seg = (k, label) => `<div class="fgfld"><span>${label}</span><div class="fseg">${FG_OPT[k].map((o) => `<button class="${d[k] === o ? 'on' : ''}" aria-pressed="${d[k] === o}" data-act="fgrSet" data-k="${k}" data-v="${o}">${o}</button>`).join('')}</div></div>`;
  return `${sbar('지킴이')}<div class="scr"><div class="bd">
    ${head('기업등록', 'firms')}
    ${ltitle('기업등록')}
    <div class="fgform"><div class="gfth"><b>1. 기업정보</b><span class="fgreq"><i class="gftm">*</i>꼭 적을 칸</span></div>
      ${inp('name', req('기업명'))}${inp('biz', req('사업자등록번호'), '', 'numeric')}${inp('ceo', '대표자명')}
      ${inp('tel', '회사 전화번호', 'tel')}${inp('fax', '회사 팩스번호', 'tel')}${inp('mail', '회사 주대표 메일', 'email')}
      <div class="fgfld"><span>사업장 주소</span>
        <div class="fgaddr"><input class="input" value="${esc(d.zip)}" placeholder="사업장 주소" readonly data-act="fgAddr"><button class="btn" data-act="fgAddr">찾아보기</button></div>
        <input class="input" value="${d.road ? `경기도 화성시 ${d.dong} ${esc(d.road)}` : ''}" placeholder="주소" readonly data-act="fgAddr">
        <input class="input" id="fg-addr2" data-fg="addr2" value="${esc(d.addr2)}" placeholder="상세주소" autocomplete="off"></div>
      <label class="fgfld"><span>${req('행정구역')}</span><select class="input" id="fg-dong" data-fg="dong">${dongOpts(d.dong, '선택')}</select></label>
      <label class="fgfld"><span>업종코드</span><select class="input" id="fg-ksic" data-fg="ksic"><option value="">선택</option>${KSIC_LIST.map(([c, w]) => `<option value="${c}"${d.ksic === c ? ' selected' : ''}>${c} ${w}</option>`).join('')}</select></label>
      ${inp('product', '주 생산용품')}${inp('workers', '상시 근로자수', '', 'numeric')}${inp('foreign', '외국인 근로자수', '', 'numeric')}
      ${seg('own', '소유형태')}${seg('kind', '기업종류')}
      ${inp('mgr', '안전담당자 성명')}${inp('mgrTel', '안전담당자 전화번호', 'tel')}${inp('mgrMail', '안전담당자 이메일', 'email')}
      <div class="fgfld"><span>재해건수 이력</span><div class="fginj">${FG_YEARS.map((y) => `<label><input class="input" id="fg-inj${y}" data-fg="inj.${y}" value="${esc(d.inj[y])}" placeholder="${y}년" inputmode="numeric" autocomplete="off"></label>`).join('')}</div></div>
      ${seg('why', req('등록사유'))}
      <label class="fgfld"><span>${req('기업등록일자')}</span><input class="input" id="fg-regDate" data-fg="regDate" type="date" value="${d.regDate}"></label>
    </div>
  </div><div class="ft"><div class="row"><button class="btn ghost cxl" data-go="firms">목록으로</button><button class="btn" data-act="fgrSave">등록하기</button></div></div></div>
  ${UI.sheet && UI.sheet.type === 'fgAddr' ? fgAddrSheet() : ''}`;
}
// 주소 찾기 — 기존 웹 찾아보기(우편번호 찾기) 자리. 시제품은 읍·면·동마다 가상 도로명 셋에서 찾는다. 고르면 행정구역도 채운다
const FG_ADDRS = HWASEONG.flatMap((h, i) => ['산업로', '공단길', '중앙로'].map((r, j) => ({ zip: String(18200 + i * 7 + j * 2), dong: h.name,
  road: `${h.name.replace(/\d?(동|읍|면)$/, '')}${r} ${[12, 47, 103][j]}` })));
const fgAddrRes = () => { const q = (UI.sheet.q || '').trim();
  if (!q) return '<div class="cnone">읍·면·동 또는 도로명으로 찾기</div>';
  const l = FG_ADDRS.map((a, i) => [a, i]).filter(([a]) => `${a.dong} ${a.road}`.includes(q)).slice(0, 12);
  return l.map(([a, i]) => `<button class="arow" data-act="fgAddrPick" data-v="${i}"><b>경기도 화성시 ${a.dong} ${a.road}</b><span class="small">${a.zip}</span></button>`).join('') || '<div class="cnone">맞는 주소 없음</div>'; };
function fgAddrSheet() {
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet fsheet"><div class="grip"></div><div class="mid">주소 찾기 <span class="small">가상 주소</span></div>
    <input class="input" id="fgaq" type="search" placeholder="예: 향남, 우정공단길" value="${esc(UI.sheet.q || '')}" autocomplete="off" enterkeyhint="search">
    <div id="fgares" class="fgares">${fgAddrRes()}</div></div>`;
}
document.addEventListener('input', (e) => {
  const t = e.target, k = t.dataset && t.dataset.fg;
  if (k && UI.fgr) { if (k.startsWith('inj.')) UI.fgr.inj[k.slice(4)] = t.value; else UI.fgr[k] = t.value; }
  if (t.id === 'fgq') { UI.fgq = t.value; UI.fgMore = 10; render(); }
  if (t.id === 'fgaq' && UI.sheet) { UI.sheet.q = t.value; $('#fgares').innerHTML = fgAddrRes(); }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'fgk') { UI.fgk = t.value; UI.fgMore = 10; render(); }
  if (UI.sheet && UI.sheet.type === 'fgf' && ({ fgfDong: 'dong', fgfFrom: 'from', fgfTo: 'to' })[t.id]) { UI.sheet.v[{ fgfDong: 'dong', fgfFrom: 'from', fgfTo: 'to' }[t.id]] = t.value; render(); }
});
// 할 일 화면 (2026-10-19) — 홈 카드로 들어온다. 위 탭으로 전체 · 점검 · 판정 · 방문일 · 시정을 바꿔 보고, 권역 · 거리순 · 일정순은 여기서
function todoScreen(s) {
  locate();
  if (UI.td === 'judge' || UI.td === 'fix') UI.td = 'rck';  // 옛 탭 이름
  const J = todoJobs(s, tasks(s).filter((x) => inAreas(x.fid))), tab = TD.some(([k]) => k === UI.td) ? UI.td : 'all';
  const l = sortTasks(s, J[tab], UI.sort);
  // 개선 관리 탭 안은 위아래 묶음 대신 거리순 · 일정순 같은 고르기 칸으로 보낼 것 · 판정 필요 · 시정 중을 바꿔 본다 (2026-10-19 사용자 지시, 보낼 것은 10-26)
  const rsub = RSUB.some(([k]) => k === UI.rsub) ? UI.rsub : J.send.length ? 'send' : 'judge';
  // 위 탭 줄(전체 · 점검 · 개선 관리)은 걷었다 (2026-10-26 사용자 지시) — 홈 카드(점검하기 · 개선 관리)로 들어온 탭 그대로 본다
  const sort = `<div class="hsort" role="group" aria-label="정렬">${SORTS.map(([k, w]) => `<button class="${UI.sort === k ? 'on' : ''}" aria-pressed="${UI.sort === k}" data-act="sort" data-v="${k}">${w}</button>`).join('')}</div>`;
  const grp = (w, g) => (g.length ? `<div class="hgrp">${w} ${g.length}곳</div>${g.map((x) => todoRow(s, x, tab)).join('')}` : '');
  return `${sbar('지킴이')}<div class="scr gtodo"><div class="bd">
    ${head('할 일', '')}
    ${ltitle('할 일')}
    <div class="tdtool"><button class="harea${UI.areas.length ? ' on' : ''}" data-act="areaOpen" data-v="home">${areaWord()} ${I('chevron', 14)}</button>${sort}</div>
    ${tab === 'rck' ? `<div class="hsort rsub" role="group" aria-label="개선 관리 나누기">${RSUB.map(([k, w]) => `<button class="${rsub === k ? 'on' : ''}" aria-pressed="${rsub === k}" data-act="rsub" data-v="${k}">${w} <em>${J[k].length}</em></button>`).join('')}</div>` : ''}
    <div class="hlist">${tab === 'visit' ? l.map((x) => todoRow(s, x, tab)).join('')
      : tab === 'rck' ? l.filter((x) => J[rsub].includes(x)).map((x) => todoRow(s, x, tab)).join('') || `<div class="stat"><div class="mid">${RSUB.find(([k]) => k === rsub)[1]} 없음</div></div>`
      : grp('보낼 것', l.filter((x) => x.kind === 'send')) + grp('판정 필요', l.filter((x) => x.kind === 'recheck' && toJudge(x.ins))) + grp('시정 중', l.filter((x) => x.kind === 'recheck' && !toJudge(x.ins)))
        + grp('점검', l.filter((x) => x.kind === 'visit'))}
      ${l.length ? '' : `<div class="stat"><div class="mid">${UI.areas.length ? '조건에 맞는 할 일이 없어요' : '할 일이 없어요'}</div></div>`}</div>
  </div></div>${UI.sheet && UI.sheet.type === 'date' ? dateSheet(s) : ''}${UI.sheet && UI.sheet.type === 'area' ? areaSheet(s) : ''}`;
}

// 오늘 방문할 공장 한 줄 요약 (2026-09-28 사용자 지시) — 실제 서비스에서는 AI가 지난 점검·미흡·센서 기록을 읽고 쓴다.
// 시제품은 같은 재료로 규칙대로 지어 보인다 (가설: 요약에 들어갈 재료는 이 셋이면 된다)
function aiBrief(s, fid) {
  const q = openIssues(s, fid), hist = s.alarms.filter((a) => !SIM.live(a) && alarmFid(a) === fid), li = lastIns(s, fid);
  // 미흡 항목은 첫 것만 짧게 따온다 (한 줄 요약이라 두 줄 안팎으로)
  const cut = (t) => { t = t.replace(/\?$/, ''); return t.length > 14 ? t.slice(0, 13) + '…' : t; };
  const iss = q.length && `미흡 ${q.length}건("${cut(q[0].it.text)}"${q.length > 1 ? ` 외 ${q.length - 1}건` : ''})`;
  const sen = hist.length && `센서 이상 ${hist.length}건(${SIM.title(hist[0])})`;
  if (iss && sen) return `지난번 ${iss}과 최근 ${sen}을 자세히 보세요.`;
  if (iss) return `지난번(${q[0].ins.date}) ${iss}을 다시 확인하세요.`;
  if (sen) return `최근 ${sen}이 있었어요. 그 설비 둘레를 자세히 보세요.`;
  return li ? `특이사항 없어요. 지난 점검(${li.date})에서 문제가 없었어요.` : '처음 가는 곳이에요. 기본 체크리스트대로 보면 돼요.';
}
// AI 요약 자세히 (2026-09-28 사용자 지시) — 요약 칸을 누르면 뜨는 창. 요약 문장 → 먼저 볼 것 → 근거 세 줄 → 공장 보기.
// 미흡 흐름·센서 기록 전체는 공장 창에 있으니 여기는 개수와 날짜만 (같은 날 사용자: 너무 자세하다)
function briefSheet(s) {
  const fid = UI.sheet.fid, f = FACTORIES[fid], v = visitDay(s.visits[fid]);
  const q = openIssues(s, fid), hist = s.alarms.filter((a) => !SIM.live(a) && alarmFid(a) === fid), li = lastIns(s, fid);
  const look = [...q.map((e) => e.it.text), ...(hist.length ? [`${SIM.title(hist[0])} 둘레`] : [])];
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet gbrief" role="dialog" aria-label="${f.name} AI 요약"><div class="grip"></div>
    <div class="gbh"><span class="gbi">${I('sparkle', 18)}</span><div><b>${f.name} AI 요약</b><small>${v ? `오늘 ${v.tm} 방문` : ''}</small></div></div>
    <div class="gbs">${esc(aiBrief(s, fid))}</div>
    ${look.length ? `<div class="lbl">먼저 볼 것</div><ol class="gbl">${look.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>` : ''}
    ${kv([['지난번 미흡', q.length ? `${q.length}건` : '없음'], ['센서 이상', hist.length ? `${hist.length}건 (최근 ${hist[0].day})` : '없음'],
      ['지난 점검', li ? `${li.date} ${li.result || RESULTS[0]}` : '없음']])}
    <div class="small">지난 기록으로 AI가 쓴 요약이라 틀릴 수 있어요.</div>
    <div class="row"><button class="btn ghost cxl" data-act="closeSheet">닫기</button><button class="btn" data-go="pre/${fid}">공장 보기</button></div>
  </div>`;
}
// 2026-10-19부터 공장 탭 맨 위에 있다(홈을 짧게 하려고 옮김).
// 최근 점검한 곳 — 하나가 아니라 좌우 화살표로 차례로 넘겨 본다 (2026-10-15 사용자 지시). 최근 것부터, 공장마다 마지막 점검 하나씩.
// 우리 조가 점검한 곳을 다 넣는다 — 조가 같이 다니고 점검은 조원 한 사람 이름으로 올라가서, 나만 세면 한두 곳뿐이다 (가설)
function recentList(s) {
  const seen = new Set();
  return s.inspections.filter((i) => TEAM.members.includes(i.by)).sort((a, b) => mdNum(b.date) - mdNum(a.date))
    .filter((i) => !seen.has(i.fid) && seen.add(i.fid));
}
// 2026-10-19부터 안 씀 — 점검 결과 탭(옛 공장 탭) 목록이 점검일 최신순이라 같은 일을 한다. 되돌릴 수 있게 남겨 둠
function recentVisit(s) {
  const list = recentList(s);
  if (!list.length) return `<div class="gvisit"><div class="gvt">최근 점검한 곳</div><div class="gvsub">아직 점검한 곳이 없어요</div></div>`;
  UI.rv = Math.min(UI.rv || 0, list.length - 1);
  const k = UI.rv, ins = list[k], n = list.length;
  const f = FACTORIES[ins.fid], [m, d] = ins.date.split('/').map(Number);
  const nav = (dir, on) => `<button class="gvnav ${dir < 0 ? 'l' : 'r'}" data-act="rv" data-v="${dir}"${on ? '' : ' hidden'} aria-label="${dir < 0 ? '더 최근 점검한 곳' : '그 전에 점검한 곳'}">${I('chevron', 22)}</button>`;
  // 점검한 날은 제목 줄 오른쪽에 — "언제 갔던 곳"이 먼저 읽히게 (2026-09-22 사용자: 승인 표시·문제 수 빼고 날짜 자리 옮김)
  const sl = UI.rvDir > 0 ? ' gvin-r' : UI.rvDir < 0 ? ' gvin-l' : '';
  return `<div class="gvisit${sl}"><div class="gvt">최근 점검한 곳<span class="gvdate">${I('calendar', 15)} ${m}월 ${d}일 (${WD[new Date(TODAY.y, m - 1, d).getDay()]})</span></div>
    <div class="gvrow">${nav(-1, k > 0)}<div class="gvtx">
      <div class="gvkm">${I('pin', 15)} ${kmTo(f.ll).toFixed(1)}km</div>
      <b>${f.name}</b><div class="gvsub">화성시 ${f.dong}</div>
      <button class="fbtn gvbtn" data-go="pre/${ins.fid}">공장 보기 ${I('chevron', 16)}</button></div>
      <button class="gvph" data-go="pre/${ins.fid}" aria-label="${f.name}">${facMini(ins.fid)}</button>${nav(1, k < n - 1)}</div>
    ${n > 1 ? `<div class="gvdots" aria-label="${n}곳 중 ${k + 1}번째">${list.map((_, j) => `<i class="${j === k ? 'on' : ''}"></i>`).join('')}</div>` : ''}${homeActs(s, ins.fid)}</div>`;
}
// 오늘 방문 넘기기 — 넘긴 자리를 기억하고 아래 점을 바꾼다 (다시 그리지 않는다)
document.addEventListener('scroll', (e) => {
  const sl = e.target;
  if (!sl.classList || !sl.classList.contains('htsl')) return;
  const k = Math.round(sl.scrollLeft / sl.clientWidth);
  if (k === (UI.tdi || 0)) return;
  UI.tdi = k;
  sl.parentNode.querySelectorAll('.htdots i').forEach((d, j) => d.classList.toggle('on', j === k));
}, true);
// 손가락으로 밀어도 넘어간다 — 왼쪽으로 밀면 그 전 곳, 오른쪽으로 밀면 더 최근 곳
let gvX = null;
document.addEventListener('touchstart', (e) => { gvX = e.target.closest('.gvrow') ? e.touches[0].clientX : null; }, { passive: true });
document.addEventListener('touchend', (e) => {
  if (gvX == null) return;
  const dx = e.changedTouches[0].clientX - gvX; gvX = null;
  const b = Math.abs(dx) >= 50 && document.querySelector(`.gvnav.${dx < 0 ? 'r' : 'l'}`);
  if (b && !b.hidden) b.click();
});
// 파란 칸 아래쪽의 작은 단추 둘 — 그 공장에 전화 걸기 · 그 공장 점검 결과 보기 (가로로 나란히)
// 2026-10-01 사용자: 이 칸의 단추는 그 공장에 관한 것만 — 주간 보고 쓰기를 빼고(하단바에 있다) '전화 걸기'로 (처음엔 '공장에 전화'였다가 같은 날 사용자가 바꿈). 최근 점검한 곳이 없으면 단추도 없다
function homeActs(s, fid) {
  // 점검 결과 보기는 지금 보이는 그 공장의 기록만 연다 (2026-09-22 사용자 지시)
  return `<div class="gacts">
    <a class="gact" href="tel:${firmOf(s, fid).tel}" aria-label="${FACTORIES[fid].name}에 전화 ${firmOf(s, fid).tel}">${I('phone', 17)}전화 걸기</a>
    <button class="gact" data-go="records/${fid}">${I('folder', 17)}점검 결과 보기</button></div>`;
}

/* ---------- 알림 (2026-10-15 사용자 지시 — 머리 오른쪽 종 아이콘) ----------
   따로 쌓아 두는 알림함은 없고, 지금 상태에서 지킴이가 알아야 할 것을 뽑아 보인다(시제품). 누르면 그 일을 하는 화면으로 간다.
   ① 공장주가 고친 사진을 보냄 ② 시정 기한이 지났거나 사흘 안 ③ 오늘 방문. 빨강은 경보에만 쓰므로 기한 지남은 주황 */
function notis(s) {
  const l = [];
  s.inspections.filter((i) => inRecheck(i) && TEAM.members.includes(i.by) && !s.outbox.guard.some((m) => m.data.insId === i.id)).forEach((ins) => {
    const f = FACTORIES[ins.fid], fx = toFix(ins).map(rckFix).filter(Boolean);  // 개선 관리 (2026-10-26) — 공장이 고칠 것 중 사진이 온 것, 누르면 판정 화면
    if (fx.length) { const last = fx.sort((a, b) => mdNum(b.at) - mdNum(a.at))[0];
      l.push({ id: `fix-${ins.id}-${fx.length}`, ic: 'camera', t: `${f.name}에서 고친 사진을 보냈어요`, sub: `개선사항 ${toFix(ins).length}개 중 ${fx.length}개`, at: last.at, tm: last.tm, go: `send/${ins.id}` }); }
    const due = recheckDue(ins), n = daysLeft(due);
    if (n <= 3) l.push({ id: `due-${ins.id}`, ic: 'clock', tone: n < 0 ? 'warn' : '', t: n < 0 ? `${f.name} 시정 기한이 ${-n}일 지났어요` : `${f.name} 시정 기한이 ${dWord(n)}예요`, sub: `${due}까지`, at: n < 0 ? due : '9/17', go: `send/${ins.id}` });
  });
  Object.entries(s.visits).filter(([, v]) => String(v).startsWith('오늘')).forEach(([fid, v]) =>
    l.push({ id: `visit-${fid}-${v}`, ic: 'calendar', t: `오늘 ${FACTORIES[fid].name} 방문이 있어요`, sub: v.replace('오늘', '').trim() || '시간 안 정함', at: '9/17', go: `pre/${fid}` }));
  return l.sort((a, b) => mdNum(b.at) - mdNum(a.at));
}
const notiUnseen = (s) => (s ? notis(s).filter((x) => !UI.notiSeen.has(x.id)).length : 0);
function notiScreen(s) {
  const l = notis(s);
  return `${sbar('지킴이')}<div class="scr"><div class="bd">
    ${head('알림', '')}
    ${l.length ? `<div class="gnoti">${l.map((x) => `<button class="gnr${UI.notiNew.has(x.id) ? ' new' : ''}${x.tone ? ' ' + x.tone : ''}" data-go="${x.go}">
      <span class="gnic">${I(x.ic, 20)}</span><span class="gnt"><b>${x.t}</b><small>${x.sub}</small></span><span class="gnat">${x.at}${x.tm ? `<br>${x.tm}` : ''}</span></button>`).join('')}</div>`
      : `<div class="cnone">새 알림이 없어요</div>`}
  </div></div>`;
}

/* ---------- G10 캘린더 (2026-09-22 사용자 요청) ----------
   방문일(s.visits)에서 바로 그린다 — 지킴이가 방문일을 정하면 그 칸에 저절로 올라간다 (2026-10-07 예약·공장주 승인을 걷음). 불시 방문은 달력에 없다.
   이야기 속 오늘은 2026-09-17(목). */
const TODAY = { y: 2026, m: 9, d: 17 };
const WD = ['일', '월', '화', '수', '목', '금', '토'];
// "오늘 10:00" · "9/18(금) 14:00" · "9/23(수) 오전" → { m, d, tm }
function visitDay(v) {
  if (!v) return null;
  if (v.startsWith('오늘')) return { m: TODAY.m, d: TODAY.d, tm: v.replace('오늘', '').trim() };
  const g = v.match(/(\d+)\/(\d+)(?:\([^)]*\))?\s*(.*)/);
  return g ? { m: +g[1], d: +g[2], tm: g[3] } : null;
}
function calScreen(s) {
  const y = TODAY.y, m = UI.calM, t = tasks(s);
  const byDay = {};
  t.forEach((x) => { const v = visitDay(s.visits[x.fid]); if (v && v.m === m) (byDay[v.d] = byDay[v.d] || []).push(x); });
  Object.values(byDay).forEach((l) => l.sort((a, b) => whenKey(s.visits[a.fid]) - whenKey(s.visits[b.fid])));
  const first = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate();
  const sel = UI.calD || (m === TODAY.m ? TODAY.d : 1);
  const cells = [...Array(first).fill(''), ...Array.from({ length: days }, (_, i) => i + 1)].map((d, i) => {
    if (!d) return '<span class="cday blank"></span>';
    const l = byDay[d] || [], dow = i % 7;
    return `<button class="cday${dow === 0 ? ' sun' : dow === 6 ? ' sat' : ''}${m === TODAY.m && d === TODAY.d ? ' ctoday' : ''}${d === sel ? ' sel' : ''}" data-act="calDay" data-v="${d}" aria-label="${m}월 ${d}일${l.length ? ` 점검 ${l.length}곳` : ''}">
      <span class="cn">${d}</span><span class="cdots">${l.slice(0, 3).map(() => '<i class="k-visit"></i>').join('')}${l.length > 3 ? `<em>+${l.length - 3}</em>` : ''}</span></button>`;
  }).join('');
  const day = byDay[sel] || [], dow = new Date(y, m - 1, sel).getDay();
  return `${sbar('지킴이')}<div class="scr"><div class="bd">
    ${head('캘린더', '')}
    <div class="calh"><button class="cmv" data-act="calM" data-v="-1" aria-label="이전 달">${I('back', 20)}</button><b>${y}년 ${m}월</b>
      <button class="cmv nx" data-act="calM" data-v="1" aria-label="다음 달">${I('back', 20)}</button></div>
    <div class="cgrid">${WD.map((w, i) => `<span class="cwd${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}">${w}</span>`).join('')}${cells}</div>
    <div class="cdh">${m}월 ${sel}일 ${WD[dow]}요일${m === TODAY.m && sel === TODAY.d ? tg('오늘', 'now') : ''}<em>${day.length}곳</em></div>
    ${day.map((x) => fcard(s, x)).join('') || '<div class="cnone">이 날 잡힌 점검이 없어요</div>'}
  </div></div>${UI.sheet && UI.sheet.type === 'date' ? dateSheet(s) : ''}`;
}

/* ---------- G8 공장 (하단바, 2026-09-22 사용자 요청) ----------
   우리 조 권역의 공장 전부 — 할 일이 없는 곳(점검 끝난 곳, 이번에 배정 안 된 곳)도 나온다. 홈은 "할 일"만.
   찾기 · 권역 · 할 일 있음/없음으로 거르고, 가까운 순. 누르면 회사 창. */
const mdNum = (d) => { const m = String(d || '').match(/(\d+)\/(\d+)/); return m ? +m[1] * 100 + +m[2] : 0; };
const lastIns = (s, fid) => s.inspections.filter((i) => i.fid === fid).sort((a, b) => mdNum(b.date) - mdNum(a.date))[0];
// 점검 예정 — 공장 줄의 "점검 예정" 꼬리표와 같은 기준: 할 일에 점검으로 올라 있거나 방문일이 잡힌 곳 (2026-09-28, 지도 핀도 이걸 쓴다)
const isDue = (s, fid) => !!s.visits[fid] || tasks(s).some((x) => x.fid === fid && x.kind === 'visit');
// 공장 상태 (2026-10-13 사용자 결정) — 우리 조가 한 마지막 점검의 결과. 점검한 적이 없으면 아직 안 감. 한 공장은 한 칸에만 든다
const FAC_ST = [['rck', '재점검'], ['done', '점검완료'], ['patrol', '패트롤'], ['etc', '기타'], ['never', '아직 안 감']];
const facLast = (s, fid) => facInsp(s, fid).sort((a, b) => mdNum(b.date) - mdNum(a.date))[0];
function facSt(s, fid) {
  const li = facLast(s, fid);
  return li ? (FAC_ST.find(([, w]) => w === (li.result || RESULTS[0])) || ['done'])[0] : 'never';
}
// 재점검 기한이 급한 순
const rckKey = (s, fid) => { const li = facLast(s, fid); return inRecheck(li) ? daysLeft(recheckDue(li)) : 999; };
// 공장 줄 (2026-10-14 사용자: 꼬리표 알약이 AI스럽다 → 이름 옆 색 글자도 AI스럽다) — 알약·색 글자를 걷고 이름표·값 줄로.
// 마지막 점검 → 점검 결과 → 시정 기한 · 방문 · 미흡을 한 줄씩. 색은 값에만, 늦은 것(주황)과 방문(파랑)에만 쓴다
// res: 점검 결과 탭에서 부를 때 — 방문(할 일) 줄을 빼고, 누르면 공장 창이 기록 탭으로 열린다 (2026-10-19)
function facRow(s, fid, tk, res = false) {
  const f = FACTORIES[fid], li = facLast(s, fid), st = facSt(s, fid);
  const q = openIssues(s, fid).length, v = s.visits[fid];
  const kv = (k, val, c = '') => `<span class="fkv"><em>${k}</em><b${c ? ` class="${c}"` : ''}>${val}</b></span>`;
  // 재점검 중인 곳의 미흡은 시정 기한과 같은 것이라 뺀다
  const rows = [li ? kv('마지막 점검', li.date) : '<span class="fkv none">점검 기록 없음</span>',
    st === 'never' ? '' : kv('점검 결과', FAC_ST.find(([k]) => k === st)[1]),
    inRecheck(li) ? kv('시정 기한', dWord(daysLeft(recheckDue(li))), daysLeft(recheckDue(li)) < 0 ? 'warn' : '') : '',
    res ? '' : v ? kv('방문', v, 'now') : tk.some((x) => x.kind === 'visit') ? kv('방문', '예정', 'now') : '',
    q && st !== 'rck' ? kv('미흡', `${q}건`, 'warn') : ''].join('');
  return `<button class="fcard fall" ${res ? `data-act="facLog" data-fid="${fid}"` : `data-go="pre/${fid}"`}>
    <span class="fphw">${facMini(fid)}</span>
    <span class="fbody"><span class="fname">${f.name}</span>
      <span class="floc">화성시 ${f.dong}</span><span class="fmeta">${kmTo(f.ll).toFixed(1)}km</span>
      ${rows}</span>
    <span class="gchev">${I('chevron', 18)}</span></button>`;
}
// 점검 기간으로 거르기 (2026-10-13 사용자 지시) — 마지막 점검일이 그 기간에 든 공장만. 숫자 칸도 그 공장들로 다시 센다.
// 기간을 고르면 점검 기록이 없는 공장(아직 안 감)은 빠진다. 이야기 속 오늘은 9/17
// 2026-10-14 사용자 지시: 이번 주·이번 달·지난달 → 오늘까지 거슬러 세는 1주일 · 1개월 · 3개월(전체와 함께 가로 한 줄), 직접 고르기는 아래
const perBack = (days, months) => { const t = mdDate('9/17'); if (months) t.setMonth(t.getMonth() - months); else t.setDate(t.getDate() - days); return dateMd(t); };
const PERS = [['week', '1주일', perBack(7), '9/17'], ['month', '1개월', perBack(0, 1), '9/17'], ['m3', '3개월', perBack(0, 3), '9/17']];
const perWord = () => (!UI.per ? '전체' : UI.per.k === 'self' ? `${UI.per.from} ~ ${UI.per.to}` : PERS.find(([k]) => k === UI.per.k)[1]);
const inPer = (s, fid) => { if (!UI.per) return true; const li = facLast(s, fid); return !!li && mdNum(li.date) >= mdNum(UI.per.from) && mdNum(li.date) <= mdNum(UI.per.to); };
const isoOf = (md) => { const [m, d] = md.split('/'); return `2026-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; };
const mdOf = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${m}/${d}`; };
function perSheet() {
  const sh = UI.sheet, cur = sh.k;
  const opt = (k, w) => `<button class="${cur === k ? 'on' : ''}" data-act="perPick" data-v="${k}" aria-pressed="${cur === k}">${w}</button>`;
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="mid">점검 기간 <span class="small">마지막 점검일 기준</span></div>
    <div class="gperseg">${opt('all', '전체')}${PERS.map(([k, w]) => opt(k, w)).join('')}</div>
    <button class="arow${cur === 'self' ? ' on' : ''}" data-act="perPick" data-v="self" aria-pressed="${cur === 'self'}"><span class="achk">${cur === 'self' ? I('check', 16) : ''}</span><b>직접 고르기</b></button>
    <div class="gper"><input class="input" id="perFrom" type="date" min="2026-01-01" max="2026-12-31" value="${isoOf(sh.from)}" aria-label="시작일">
      <span>~</span><input class="input" id="perTo" type="date" min="2026-01-01" max="2026-12-31" value="${isoOf(sh.to)}" aria-label="끝일"></div>
    <div class="row"><button class="btn ghost cxl" data-act="closeSheet">취소</button><button class="btn" data-act="perApply">적용하기</button></div>
  </div>`;
}
// 상태 숫자 칸 넷 (2026-10-13 사용자 지시 — 칩이 작아 잘 안 보여서, 홈에 잠깐 있던 숫자 칸 모양으로 크게).
// 누르면 그 상태만, 다시 누르면 전체. 기한 지난 재점검 표시는 없다 (2026-10-14 사용자 — 숫자 주황 → 주황 점 → 뺌. 기한은 공장 줄 "시정 기한"으로 본다)
function facStCells(s, inTeam, n) {
  return `<div class="gfstr">${FAC_ST.filter(([k]) => k !== 'never').map(([k, w]) => { const on = UI.fst === k;
    return `<button class="k-${k}${on ? ' on' : ''}${n(k) ? '' : ' zero'}" data-act="fst" data-v="${k}" aria-pressed="${on}"><b>${n(k)}</b><span>${w}</span></button>`; }).join('')}</div>`;
}
function factoriesScreen(s) {
  locate();
  const t = tasks(s), tk = (fid) => t.filter((x) => x.fid === fid);
  const team = Object.keys(FACTORIES).filter((fid) => TEAM.areas.includes(FACTORIES[fid].area)), inTeam = team.filter(inAreas).filter((f) => inPer(s, f));
  // 점검 상태로 나눈다 — 2026-10-13부터 공장 상태(마지막 점검 결과) 기준. 전에는 점검 예정 · 미흡 남음 · 아직 안 감이라 한 공장이 여러 칸에 들었다
  const pick = UI.fst === 'all' || !FAC_ST.some(([k]) => k === UI.fst) ? () => true : (f) => facSt(s, f) === UI.fst;
  const q = UI.fq.trim();
  const near = (a, b) => kmTo(FACTORIES[a].ll) - kmTo(FACTORIES[b].ll);
  // 점검일 최신순, 점검 기록이 없는 곳은 맨 아래 (2026-10-19 — 최근 점검한 곳 띠를 걷고 목록이 그 일을 한다)
  const lastKey = (f) => { const li = facLast(s, f); return li ? mdNum(li.date) : -1; };
  const list = inTeam.filter(pick)
    .filter(matchQ)
    .sort((a, b) => lastKey(b) - lastKey(a) || near(a, b));
  const n = (k) => (k === 'all' ? inTeam.length : inTeam.filter((f) => facSt(s, f) === k).length);
  return `${sbar('지킴이')}<div class="scr"><div class="bd">
    ${head('점검 결과', '')}
    ${ltitle('점검 결과')}
    ${findRow('fac')}
    <button class="hper${UI.per ? ' on' : ''}" data-act="perOpen">${I('calendar', 16)}<span>점검 기간</span><b>${perWord()}</b>${I('chevron', 14)}</button>
    <div class="hlh"><b>우리 조 공장</b><em>${inTeam.length}곳</em><span class="hlhs">점검일 최신순</span></div>
    ${facStCells(s, inTeam, n)}
    <div class="fst">${[['all', '전체'], ...(UI.per ? [] : [FAC_ST.find(([k]) => k === 'never')])].map(([k, w]) => `<button class="${UI.fst === k ? 'on' : ''}" data-act="fst" data-v="${k}">${w}<em>${n(k)}</em></button>`).join('')}</div>
    <div id="fres" class="hlist">${list.map((fid) => facRow(s, fid, tk(fid), true)).join('') || `<div class="cnone">${q ? `"${esc(q)}"에 맞는 공장이 없어요` : '공장이 없어요'}</div>`}</div>
  </div></div>${UI.sheet && UI.sheet.type === 'area' ? areaSheet(s) : ''}${UI.sheet && UI.sheet.type === 'per' ? perSheet() : ''}`;
}
// 찾기 칸과 권역 칩 — 홈과 공장 전체보기가 같이 쓴다 (2026-09-22 사용자 지시: 공장 탭을 없애고 찾기·권역을 홈으로).
// 권역은 누를 때마다 켜고 끄는 토글이고 여러 개 켤 수 있다. 하나도 안 켜면 전체
const inAreas = (fid) => !UI.areas.length || UI.areas.includes(FACTORIES[fid].area);
// 공장 이름으로만 찾는다 — 동까지 보면 "동"만 쳐도 동탄2동의 대성정밀이 걸린다. 지역은 권역 단추로 (2026-09-22 사용자 지시)
const matchQ = (fid) => { const q = UI.fq.trim(); return !q || FACTORIES[fid].name.includes(q); };
// 찾기 칸 + 권역 단추 한 줄 — 권역은 칩을 늘어놓지 않고 단추 하나로, 누르면 화성시를 구별로 묶은 창에서 고른다 (2026-09-22 사용자 결정)
const areaName = (a) => { const d = TEAM.dongs[a]; return d.length === 1 ? d[0] : d.every((x) => new RegExp(`^${a}\\d+동$`).test(x)) ? `${a} 1~${d.length}동` : `${a} 일대`; };
const areaWord = () => (!UI.areas.length ? '권역 전체' : UI.areas.length === 1 ? areaName(UI.areas[0]) : `${areaName(UI.areas[0])} 외 ${UI.areas.length - 1}`);
const findRow = (kind) => `<div class="hfrow"><input class="input" id="fq" type="search" placeholder="공장 이름으로 찾기" value="${esc(UI.fq)}" autocomplete="off">
  <button class="harea${UI.areas.length ? ' on' : ''}" data-act="areaOpen" data-v="${kind}">${areaWord()} ${I('chevron', 14)}</button></div>`;
// 권역 고르기 창 — 화성시 구 → 우리 조 읍·면·동. 줄마다 할 일 수(홈) 또는 공장 수(공장 전체보기). 적용해야 목록이 바뀐다
const GU_ORDER = ['만세구', '효행구', '병점구', '동탄구'];
// 구 색 — 화성시 일반구 구획도의 색을 따르되 지도 위에선 옅게 칠한다 (2026-09-28 사용자 지시)
const GU_COLOR = { 만세구: '#2e9d6b', 효행구: '#3d82c4', 병점구: '#e0853a', 동탄구: '#c2b236' };
const guOf = (dong) => (HWASEONG.find((h) => h.name === dong) || {}).gu;
const guDongs = (g) => HWASEONG.filter((h) => h.gu === g).map((h) => h.name);
function areaSheet(s) {
  const sh = UI.sheet, gu = (a) => (HWASEONG.find((h) => h.name === TEAM.dongs[a][0]) || {}).gu || '';
  const n = sh.v === 'home' ? (a) => `할 일 ${tasks(s).filter((x) => FACTORIES[x.fid].area === a).length}`
    : (a) => `공장 ${Object.keys(FACTORIES).filter((f) => FACTORIES[f].area === a).length}`;
  const groups = GU_ORDER.map((g) => [g, TEAM.areas.filter((a) => gu(a) === g)]).filter(([, l]) => l.length);
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="mid">권역 고르기 <span class="small">화성시 ${TEAM.name}</span></div>
    ${groups.map(([g, l]) => `<div class="asg">${g}</div>${l.map((a) => { const on = sh.pick.includes(a);
      return `<button class="arow${on ? ' on' : ''}" data-act="areaPick" data-v="${a}" aria-pressed="${on}"><span class="achk">${on ? I('check', 16) : ''}</span><b>${areaName(a)}</b><em>${n(a)}</em></button>`; }).join('')}`).join('')}
    <div class="row"><button class="btn ghost cxl" data-act="areaClear">모두 풀기</button><button class="btn" data-act="areaApply">${sh.pick.length ? `${sh.pick.length}곳 적용하기` : '전체 보기'}</button></div>
  </div>`;
}
// 찾기 칸 — 글자마다 결과를 고치되 칸 자체는 다시 만들지 않는다 (render가 #fres만 바꾼다).
// 칸을 새로 만들면 한글 조합이 끊겨 "동방"이 "동ㅏㅇ"·"ㄷㅗㅇㅂㅏㅇ"으로 들어갔다 (2026-09-22 사용자 제보)
document.addEventListener('input', (e) => { if (e.target.id === 'fq') { UI.fq = e.target.value; render(); } if (e.target.id === 'hq') { UI.hq = e.target.value; render(); } });
// 홈 찾기에서 검색(엔터)을 누르면 자판만 내린다 — 결과는 이미 나와 있다
document.addEventListener('keydown', (e) => { if (e.target.id === 'hq' && e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });

/* ---------- 지도 (하단바) — 예전 내 할 일의 지도 보기를 옮겼다 ---------- */
function mapScreen(s) {
  // 지도에 찍는 공장 — 우리 조 권역의 공장 전부, 구를 고르면 그 구 것만 (2026-09-28 사용자 지시)
  const list = Object.keys(FACTORIES).filter((fid) => TEAM.areas.includes(FACTORIES[fid].area) && (!UI.gu || guOf(FACTORIES[fid].dong) === UI.gu));
  const t = tasks(s);
  // 위쪽 고르기는 우리 조 권역 대신 화성시 구 4곳 (2026-09-28 사용자 지시) — 칸마다 지도와 같은 색 점
  return `${sbar('지킴이')}<div class="scr"><div class="bd">
    ${head('지도', '')}
    <div class="gusel">${[null, ...GU_ORDER].map((g) => `<button class="${UI.gu === g ? 'on' : ''}" data-act="gu" data-v="${g || ''}" aria-pressed="${UI.gu === g}"${g ? ` style="--gc:${GU_COLOR[g]}"` : ''}><i${g ? '' : ' class="all"'}></i>${g || '전체'}</button>`).join('')}</div>
    ${taskMap(s, list, (fid) => facRow(s, fid, t.filter((x) => x.fid === fid)))}
  </div></div>${UI.mapFull ? UI.mapFullHtml : ''}${UI.sheet && UI.sheet.type === 'date' ? dateSheet(s) : ''}`;
}
// 하단바 — 첫 단계 화면에만 붙는다 (점검 도중에는 없음)
// 2026-10-13 사용자 결정 — 공장 탭을 다시 두고(상태별로 나눠 보기) 내 정보는 뺀다. 내 정보는 머리글의 사람 아이콘 + 이름으로 들어간다.
// (2026-09-22에는 공장 탭을 빼고 홈의 "공장 전체보기"로 합쳤었다)
// 2026-10-15 사용자 지시 — 주간 보고 탭을 빼고 내 정보를 맨 오른쪽에 (주간 보고 화면 #/weekly는 남겨 둠, 들어가는 길만 없다)
// 공장 탭 → 점검 결과 탭 (2026-10-19 사용자 결정 — 홈은 공장을 대상으로 일하는 곳, 이 탭은 그 결과를 보는 곳).
// 최근 점검한 곳 띠 · 카드의 방문 줄을 걷고 점검일 최신순, 카드를 누르면 공장 창이 기록 탭으로 열린다. 공장 창 아래 점검 시작 · 방문일 단추는 그대로
const NAV = [['', '홈', 'home'], ['factories', '점검 결과', 'list'], ['map', '지도', 'pin'], ['cal', '캘린더', 'calendar'], ['me', '내 정보', 'user']];
const gnav = (on) => `<nav class="gnav" aria-label="메뉴">${NAV.map(([go, w, ic]) => `<button class="${on === go ? 'on' : ''}" data-go="${go}"${on === go ? ' aria-current="page"' : ''}>${I(ic, 22)}<span>${w}</span></button>`).join('')}</nav>`;
/* ---------- G2-가 내 할 일 · 지도 (2026-09-22) ----------
   권역 테두리는 geo.js(화성시 읍·면·동 경계)로 직접 그린다. 네이버 지도 키가 오면 그 위에 지도를 깐다 — 키가 없거나
   신호가 약해도 테두리와 핀은 보이게 하려는 것이다. 핀은 할 일 종류마다 모양과 말이 다르다(색만으로 가르지 않는다). */
const MAPK = Math.cos(37.15 * Math.PI / 180), MAP_AR = 11 / 10;  // 경도 줄임 · 지도 칸 가로:세로
const mxy = ([x, y]) => [x * MAPK * 1000, -y * 1000];
const ringArea = (r) => Math.abs(r.reduce((a, c, i) => { const n = r[(i + 1) % r.length]; return a + c[0] * n[1] - n[0] * c[1]; }, 0)) / 2;
// 범위를 잡을 때는 큰 땅덩이만 본다 — 섬 몇 개 때문에 지도가 작아지지 않게
const mainPolys = (d) => { const big = Math.max(...d.polys.map((p) => ringArea(p[0]))); return d.polys.filter((p) => ringArea(p[0]) >= big * 0.2); };
function bboxOf(names) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  HWASEONG.filter((h) => !names || names.includes(h.name)).forEach((h) => mainPolys(h).forEach((p) => p[0].forEach((c) => {
    const [x, y] = mxy(c); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); })));
  return { x0, y0, x1, y1 };
}
function taskMap(s, list, cardOf) {
  const focus = UI.gu ? guDongs(UI.gu) : null;
  // 보여 줄 범위 — 고른 구에 맞추고 지도 칸 비율로 늘린다. 전체는 화성시에 꽉 차게 한 단계 당겨 본다 (2026-09-28 사용자 지시)
  const { x0, y0, x1, y1 } = bboxOf(focus), zin = focus ? 1 : 0.85;
  let w = (x1 - x0) * (focus ? 1.05 : 1.12 * zin), h = (y1 - y0) * (focus ? 1.08 : 1.18 * zin);  // 고른 구는 칸에 거의 가득 (2026-09-28)
  if (w / h > MAP_AR) h = w / MAP_AR; else w = h * MAP_AR;
  const vx = (x0 + x1) / 2 - w / 2, vy = (y0 + y1) / 2 - h / 2;
  const pct = (ll) => { const [x, y] = mxy(ll); return [((x - vx) / w) * 100, ((y - vy) / h) * 100]; };
  const path = (polys) => polys.map((p) => p.map((r) => 'M' + r.map((c) => mxy(c).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z').join('')).join('');
  // 멀리서는 구 4곳만 색으로, 가까이(구를 고르면) 그 구를 읍·면·동 경계로 나눠 보인다 (2026-09-28 사용자 지시).
  // 읍·면·동 이름은 달지 않는다 — 네이버 지도에 이미 있고 공장 핀과 겹친다 (2026-09-28 사용자 지시).
  // 그림 지도는 손으로 확대할 수 없으니 구를 고른 것을 "가까이"로 본다. 네이버 지도는 확대 단계로 가른다(nvPaint)
  const lab = (ll, cls, t) => { const [l, tp] = pct(ll); return l > 4 && l < 96 && tp > 3 && tp < 97 ? `<span class="glab ${cls}" style="left:${l}%;top:${tp}%">${t}</span>` : ''; };
  // 구를 고르면 그 구만 남기고 나머지 구와 화성시 바깥 선은 그리지 않는다 (2026-09-28 사용자 지시)
  const shapes = UI.gu
    ? HWASEONG_GU.gu.filter((g) => g.name === UI.gu).map((g) => `<path d="${path(g.polys)}" class="gu open"/>`).join('')
      + HWASEONG.filter((d) => d.gu === UI.gu).map((d) => `<path d="${path(d.polys)}" class="dong" style="fill:${GU_COLOR[d.gu]}"><title>${d.gu} ${d.name}</title></path>`).join('')
    : HWASEONG_GU.gu.map((g) => `<path d="${path(g.polys)}" class="gu" style="fill:${GU_COLOR[g.name]}" data-act="gu" data-v="${g.name}"><title>${g.name}</title></path>`).join('')
      + `<path d="${path(HWASEONG_GU.city)}" class="city"/>`;
  const labels = UI.gu ? '' : HWASEONG_GU.gu.map((g) => lab(g.label, 'gulab', g.name)).join('');
  // 공장 핀 — 점검 예정(isDue — 아래 공장 줄의 "점검 예정" 꼬리표와 같은 기준)은 파란 핀과 이름으로 크게,
  // 나머지는 작은 회색 점. 점검 예정 핀을 나중에 그려 위에 오게 한다. 누르면 아래에 그 공장 줄이 나온다 (2026-09-28 사용자 지시)
  const order = [...list].sort((a, b) => isDue(s, a) - isDue(s, b));
  const pins = order.map((fid) => { const [l, t] = pct(FACTORIES[fid].ll); return pinHtml(s, fid, `left:${l}%;top:${t}%`); }).join('');
  const sel = list.includes(UI.pin) ? UI.pin : null;
  const tail = `<div class="gleg"><span><i class="due"></i>점검 예정</span><span><i class="etc"></i>다른 공장</span></div>
    ${sel ? cardOf(sel) : `<div class="small">${list.length ? '핀을 누르면 그 공장이 아래에 나와요' : '이 구에는 우리 조 공장이 없어요'}</div>`}
    <div class="small gsrc">경계 자료: 통계청 SGIS, vuski/admdongkor (CC BY 4.0)</div>`;
  nvLoad();
  const nv = NV.st === 'ready', full = `<button class="gfbtn" data-act="mapFull" aria-label="지도 전체화면">${I('expand', 20)}</button>`;
  if (nv) UI.nvArgs = { list, focus };
  const drawn = `<svg viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${shapes}</svg>${labels}${pins}`;
  // 전체화면이면 지도는 화면 틀 밖(mapScreen이 붙이는 칸)으로 가고 여기는 자리만 남는다. 고른 공장 카드는 전체화면 아래에 뜬다
  if (UI.mapFull) {
    UI.mapFullHtml = `<div class="gffull" role="dialog" aria-label="지도">${nv ? '<div class="gfslot gmap nv" id="nvSlot"></div>' : `<div class="gfslot gfdrawn"><div class="gmap">${drawn}</div></div>`}
      <button class="gfbtn gfclose" data-act="mapClose">${I('close', 20)} 닫기</button>
      ${sel ? `<div class="gfcard">${cardOf(sel)}</div>` : ''}</div>`;
    return `<div class="gmap gfhold"></div>${tail}`;
  }
  if (nv) return `<div class="gmap nv" id="nvSlot">${full}</div>${tail}`;
  return `${NV.st === 'fail' ? '<div class="small">네이버 지도를 불러오지 못해 그림 지도로 보여요</div>' : ''}<div class="gmap">${drawn}${full}</div>
    ${tail}`;
}
// 핀 하나 — 그림 지도에서는 자리(style)를 받아 버튼으로, 네이버 지도에서는 마커 속 내용으로 쓴다.
// 점검 예정은 물방울 핀(끝이 공장 자리) + 아래 이름, 나머지는 가운데가 공장 자리인 작은 점
const PIN_SVG = '<svg viewBox="0 0 24 32" width="28" height="37" aria-hidden="true"><path d="M12 .8C5.8.8.8 5.8.8 12c0 8.6 11.2 19.2 11.2 19.2S23.2 20.6 23.2 12C23.2 5.8 18.2.8 12 .8z"/><circle cx="12" cy="12" r="4.6"/></svg>';
function pinHtml(s, fid, style) {
  const f = FACTORIES[fid], due = isDue(s, fid), cls = `gpin2 ${due ? 'due' : 'etc'}${UI.pin === fid ? ' sel' : ''}`;
  const inner = due ? `${PIN_SVG}<b>${f.name}</b>` : '<i></i>';
  return style ? `<button class="${cls}" style="${style}" data-act="pin" data-fid="${fid}" aria-label="${f.name}${due ? ' 점검 예정' : ''}">${inner}</button>`
    : `<div class="nvmk"><span class="${cls}">${inner}</span></div>`;
}

/* ---------- 네이버 지도 (2026-09-22) — mapkey.js에 Client ID가 있으면 그림 지도 대신 깐다 ----------
   못 불러오거나(신호 없음) 인증이 막히면 그림 지도로 남는다. 지도 한 벌을 계속 다시 쓴다 —
   화면을 새로 그릴 때마다 지도를 새로 만들면 깜박이고 사용량이 는다. */
const NV = { st: 'none', el: null, map: null, marks: [], labs: [], fit: null, zAll: 0 };  // st: none · loading · ready · fail
function nvLoad() {
  if (!window.NAVER_MAP_KEY || NV.st !== 'none') return;
  NV.st = 'loading';
  window.navermap_authFailure = () => { NV.st = 'fail'; render(); };
  const sc = document.createElement('script');
  sc.src = 'https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=' + encodeURIComponent(window.NAVER_MAP_KEY);
  sc.onload = () => { if (NV.st === 'loading') NV.st = window.naver && naver.maps ? 'ready' : 'fail'; render(); };
  sc.onerror = () => { NV.st = 'fail'; render(); };
  document.head.appendChild(sc);
}
function bboxLL(names) {
  let w = 1e9, s = 1e9, e = -1e9, n = -1e9;
  HWASEONG.filter((h) => !names || names.includes(h.name)).forEach((h) => mainPolys(h).forEach((p) => p[0].forEach(([x, y]) => {
    w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); })));
  return { w, s, e, n };
}
function nvMount() {
  const slot = $('#nvSlot'); if (!slot || !UI.nvArgs) return;
  const N = naver.maps, { list, focus } = UI.nvArgs;
  if (!NV.map) {
    NV.el = document.createElement('div'); NV.el.className = 'nvmap'; slot.appendChild(NV.el);
    NV.map = new N.Map(NV.el, { mapDataControl: false, scaleControl: false, zoomControl: true,
      zoomControlOptions: { position: N.Position.TOP_RIGHT, style: N.ZoomControlStyle.SMALL } });
    // 구 4곳 → 읍·면·동 29곳 → 화성시 바깥 테두리 차례로 얹고, 무엇을 보일지는 nvPaint가 확대 단계를 보고 정한다
    const feat = (props, polys) => ({ type: 'Feature', properties: props, geometry: { type: 'MultiPolygon', coordinates: polys } });
    NV.map.data.addGeoJson({ type: 'FeatureCollection', features: [
      ...HWASEONG_GU.gu.map((g) => feat({ kind: 'gu', gu: g.name }, g.polys)),
      ...HWASEONG.map((d) => feat({ kind: 'dong', gu: d.gu, name: d.name }, d.polys)),
      feat({ kind: 'city' }, HWASEONG_GU.city)] });
    // 구·읍·면·동을 누르면 그 구를 고른다
    NV.map.data.addListener('click', (e) => { const g = e.feature.getProperty('gu'); if (g && g !== UI.gu) ACTS.gu({ v: g }); });
    const mk = (ll, cls, t, gu) => Object.assign(new N.Marker({ map: NV.map, position: new N.LatLng(ll[1], ll[0]), clickable: false, zIndex: 1,
      icon: { content: `<div class="nvlab"><span class="glab ${cls}">${t}</span></div>` } }), { gu });
    NV.labs = HWASEONG_GU.gu.map((g) => mk(g.label, 'gulab', g.name, g.name));
    N.Event.addListener(NV.map, 'zoom_changed', nvPaint);
  } else {
    slot.appendChild(NV.el);
    NV.map.setSize(new N.Size(slot.clientWidth, slot.clientHeight)); NV.map.refresh(true);
    if (NV.full !== !!UI.mapFull) NV.fit = null;  // 전체화면을 열고 닫으면 크기가 바뀌니 범위를 다시 맞춘다
  }
  NV.full = !!UI.mapFull;
  NV.marks.forEach((m) => m.setMap(null));
  NV.marks = list.map((fid) => {
    const f = FACTORIES[fid], due = isDue(DB.s, fid);
    const m = new N.Marker({ map: NV.map, position: new N.LatLng(f.ll[1], f.ll[0]), title: f.name, zIndex: due ? 20 : 10, icon: { content: pinHtml(DB.s, fid) } });
    N.Event.addListener(m, 'click', () => ACTS.pin({ fid }));
    return m;
  });
  const key = UI.gu || '전체';  // 구를 바꿀 때만 범위를 다시 맞춘다 — 다시 그릴 때마다 지도가 튀지 않게
  if (NV.fit !== key) {
    NV.fit = key; const b = bboxLL(focus);
    NV.map.fitBounds(new N.LatLngBounds(new N.LatLng(b.s, b.w), new N.LatLng(b.n, b.e)), focus ? { top: 12, right: 12, bottom: 12, left: 12 } : { top: 44, right: 20, bottom: 16, left: 20 });
    if (!focus) { NV.map.setZoom(NV.map.getZoom() + 1, false); NV.zAll = NV.map.getZoom(); }  // 전체는 한 단계 당겨 화성시가 칸에 꽉 차게 (2026-09-28 사용자 지시)
    else {
      // 고른 구는 칸에 거의 가득 차게 (2026-09-28 사용자 지시) — 네이버 지도는 한 단계에 두 배라, 당겨도 넘치는 게 조금이면 한 단계 더 당긴다
      const v = NV.map.getBounds(), ne = v.getNE(), sw = v.getSW();
      const fill = Math.max((b.e - b.w) / (ne.lng() - sw.lng()), (b.n - b.s) / (ne.lat() - sw.lat()));
      if (fill * 2 <= 1.12) NV.map.setZoom(NV.map.getZoom() + 1, false);
    }
  }
  nvPaint();
}
// 네이버 지도 칠하기 — 전체 기본 크기에서는 구만, 거기서 한 단계라도 당기면 읍·면·동으로 나눠 보인다.
// 구를 고르면 그 구만 크기와 상관없이 읍·면·동으로 보이고, 나머지 구와 화성시 바깥 선은 감춘다 (2026-09-28 사용자 지시)
const GU_FILL = 0.18;  // 색은 옅게 (2026-09-28 사용자 지시 — 0.3에서 더 옅게)
function nvPaint() {
  if (!NV.map) return;
  const near = NV.map.getZoom() > (NV.zAll || 11), sel = UI.gu;
  const shown = (g) => !sel || sel === g;
  const split = (g) => near || sel === g;  // 이 구를 읍·면·동으로 나눠 보이나
  // 스타일은 매번 모든 값을 다 적는다 — 빠진 값은 네이버 지도가 앞의 것을 그대로 둬서,
  // 구를 골랐다가 전체로 돌아오면 숨겼던 구 테두리가 안 돌아왔다 (2026-09-28 사용자 제보)
  const st = (o) => ({ visible: true, fillColor: '#ffffff', fillOpacity: 0, strokeColor: '#ffffff', strokeWeight: 1, strokeOpacity: 1, clickable: false, zIndex: 0, ...o });
  NV.map.data.setStyle((f) => {
    const k = f.getProperty('kind'), g = f.getProperty('gu');
    if (k === 'city') return st({ visible: !sel, strokeColor: '#8190a8', strokeWeight: 2, strokeOpacity: 0.55 });
    if (k === 'gu') return !shown(g) ? st({ visible: false })
      : sel ? st({ strokeColor: '#8190a8', strokeWeight: 2, strokeOpacity: 0.55, zIndex: 2 })  // 고른 구의 바깥 선 — 화성시 바깥 선과 같은 결
      : split(g) ? st({ strokeWeight: 3.5, strokeOpacity: 0.95, zIndex: 2 })
      : st({ fillColor: GU_COLOR[g], fillOpacity: GU_FILL, strokeWeight: 2, strokeOpacity: 0.95, clickable: true, zIndex: 1 });
    return st({ visible: shown(g) && split(g), fillColor: GU_COLOR[g], fillOpacity: GU_FILL, strokeWeight: 1.2, strokeOpacity: 0.9, clickable: true, zIndex: 1 });
  });
  NV.labs.forEach((m) => m.setVisible(!sel));  // 구 이름은 전체일 때만
}
// 방문일 정하기 — 달력에서 날짜를 누르고 시·분 바퀴를 굴려 시간을 고른다 (2026-09-22 사용자 요청: 날짜 다섯 개 단추 → 달력, 오전/오후 → 시·분 따로 스크롤).
// 지난 날은 못 고르고, 다른 공장 방문이 잡힌 날엔 막대가 뜬다. 저장하면 바로 캘린더에 오른다 (2026-10-07 공장주 예약 승인을 걷음).
const P2 = (n) => String(n).padStart(2, '0');
const WHEEL = { h: Array.from({ length: 24 }, (_, i) => P2(i)), m: Array.from({ length: 12 }, (_, i) => P2(i * 5)) };  // 분은 5분 단위
const WH = 44;  // 바퀴 한 칸 높이(px) — CSS .wcol b 와 같게
function wheelCol(k, cur) {
  return `<div class="wcol" data-k="${k}">${WHEEL[k].map((v, i) => `<b class="${v === cur ? 'on' : ''}" data-act="wheel" data-i="${i}">${v}</b>`).join('')}</div>`;
}
// 다시 그리면 바퀴가 맨 위로 돌아간다 — 고른 값 자리로 되돌려 놓는다
function syncWheels() {
  if (!UI.sheet || UI.sheet.type !== 'date') return;
  const [h, m] = UI.sheet.tm.split(':');
  document.querySelectorAll('.wcol').forEach((c) => { c.scrollTop = WHEEL[c.dataset.k].indexOf(c.dataset.k === 'h' ? h : m) * WH; });
}
// 굴리기를 멈추면 가운데 칸을 값으로 — 다시 그리지 않고 요약 줄만 고친다 (그리면 굴리던 바퀴가 튄다)
document.addEventListener('scroll', (e) => {
  const c = e.target;
  if (!c.classList || !c.classList.contains('wcol') || !UI.sheet) return;
  clearTimeout(c._t);  // 바퀴마다 따로 기다린다 — 시를 굴리고 곧바로 분을 굴려도 둘 다 남게
  c._t = setTimeout(() => {
    const i = Math.max(0, Math.min(WHEEL[c.dataset.k].length - 1, Math.round(c.scrollTop / WH)));
    const [h, m] = UI.sheet.tm.split(':');
    UI.sheet.tm = c.dataset.k === 'h' ? `${WHEEL.h[i]}:${m}` : `${h}:${WHEEL.m[i]}`;
    c.querySelectorAll('b').forEach((b, j) => b.classList.toggle('on', j === i));
    const tt = document.querySelector('.dpick .tt'); if (tt) tt.textContent = UI.sheet.tm;
  }, 120);
}, true);
// 저장된 방문 글에서 시각을 꺼낸다 — 예전 오전/오후 글은 10:00/13:00, 분은 5분 단위로 맞춘다
function tmOf(v) {
  const g = v && v.match(/(\d+):(\d+)/);
  if (!g) return v && /오후/.test(v) ? '13:00' : '10:00';
  return `${P2(+g[1])}:${P2(Math.min(55, Math.round(+g[2] / 5) * 5))}`;
}
function dateSheet(s) {
  const sh = UI.sheet, f = FACTORIES[sh.fid], y = TODAY.y, m = sh.m;
  const first = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate();
  const booked = {};
  tasks(s).forEach((x) => { const v = visitDay(s.visits[x.fid]); if (x.fid !== sh.fid && v && v.m === m) booked[v.d] = (booked[v.d] || 0) + 1; });
  const cells = [...Array(first).fill(0), ...Array.from({ length: days }, (_, i) => i + 1)].map((d, i) => {
    if (!d) return '<span class="cday blank"></span>';
    const past = m < TODAY.m || (m === TODAY.m && d < TODAY.d), dow = i % 7;
    return `<button class="cday${dow === 0 ? ' sun' : dow === 6 ? ' sat' : ''}${m === TODAY.m && d === TODAY.d ? ' ctoday' : ''}${sh.pm === m && sh.d === d ? ' sel' : ''}${past ? ' dis' : ''}" data-act="pickD" data-v="${d}"${past ? ' disabled' : ''} aria-label="${m}월 ${d}일${booked[d] ? ` 다른 방문 ${booked[d]}곳` : ''}">
      <span class="cn">${d}</span><span class="cdots">${Array.from({ length: Math.min(3, booked[d] || 0) }, () => '<i class="k-visit"></i>').join('')}</span></button>`;
  }).join('');
  const picked = sh.d ? `${sh.pm}월 ${sh.d}일 (${WD[new Date(y, sh.pm - 1, sh.d).getDay()]})` : '';
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet dsheet"><div class="grip"></div>
    <div class="mid">${f.name} 방문일</div>
    <div class="calh"><button class="cmv" data-act="sheetM" data-v="-1" aria-label="이전 달"${m <= TODAY.m ? ' disabled' : ''}>${I('back', 20)}</button><b>${y}년 ${m}월</b>
      <button class="cmv nx" data-act="sheetM" data-v="1" aria-label="다음 달">${I('back', 20)}</button></div>
    <div class="cgrid">${WD.map((w, i) => `<span class="cwd${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}">${w}</span>`).join('')}${cells}</div>
    <div class="lbl">시간</div>
    <div class="twheel">${wheelCol('h', sh.tm.slice(0, 2))}<span class="wsep">:</span>${wheelCol('m', sh.tm.slice(3))}</div>
    <div class="dpick${picked ? '' : ' none'}">${picked ? `${I('calendar', 16)} ${picked} <span class="tt">${sh.tm}</span> 방문` : '달력에서 날짜를 골라 주세요'}</div>
    ${s.visits[sh.fid] ? `<button class="add" data-act="clearDate">잡아 둔 방문일 지우기</button>` : ''}
    <div class="row"><button class="btn ghost cxl" data-act="closeSheet">취소</button><button class="btn" data-act="saveDate" ${sh.d ? '' : 'disabled'}>저장</button></div>
  </div>`;
}

/* ---------- G2-나 회사 창 (2026-09-20 — 점검 입구를 이 화면 하나로 모았다) ---------- */
// 약도 — 실제 지도가 아니다. 큰길과 공장 자리만 보여 주는 그림이다.
// 공장 창 지도 — 네이버 지도가 되면 공장 자리에 핀 하나, 안 되면(키 없음·전파 없음) 카드와 같은 그림 지도 (2026-09-23)
// 전체화면 (2026-09-23 사용자 요청 — 폰에서 작다): 지도 칸 왼쪽 위 단추로 열고, 화면 전체를 덮은 지도 왼쪽 위 닫기로 닫는다.
// 전체화면 지도는 화면 틀(.scr) 밖에 붙인다 — 틀이 들어올 때 움직임(transform)이 있어 그 안에서는 화면 전체를 못 덮는다
function miniMap(fid) {
  nvLoad();
  const nv = NV.st === 'ready';
  if (nv) UI.nvFac = fid;
  if (UI.mapFull) return `<div class="gfmap gfhold">${facMini(fid, 2)}</div>`;  // 지도는 전체화면 쪽에 가 있다
  return `<div class="gfmap"${nv ? ' id="nvFac"' : ''}>${nv ? '' : facMini(fid, 2)}
    <button class="gfbtn" data-act="mapFull" aria-label="지도 전체화면">${I('expand', 20)}</button></div>`;
}
function mapFullView(fid) {
  if (!UI.mapFull) return '';
  const f = FACTORIES[fid], nv = NV.st === 'ready';
  return `<div class="gffull" role="dialog" aria-label="${esc(f.name)} 지도"><div class="gfslot"${nv ? ' id="nvFac"' : ''}>${nv ? '' : facMini(fid, Math.min(innerWidth, 420) / innerHeight)}</div>
    <button class="gfbtn gfclose" data-act="mapClose">${I('close', 20)} 닫기</button>
    <div class="gfname">${I('pin', 16)} ${esc(f.name)}<small>화성시 ${esc(f.dong)}</small></div></div>`;
}
// 공장 창 지도는 아래 지도 탭과 따로 한 벌을 두고 공장만 바꿔 다시 쓴다
const NVF = { el: null, map: null, mark: null };
function nvFacMount() {
  const slot = $('#nvFac'); if (!slot || !UI.nvFac) return;
  const N = naver.maps, f = FACTORIES[UI.nvFac], at = new N.LatLng(f.ll[1], f.ll[0]);
  const icon = { content: `<div class="nvpin"><span class="gfpin">${I('pin', 22)}<b>${esc(f.name)}</b></span></div>` };
  if (!NVF.map) {
    NVF.el = document.createElement('div'); NVF.el.className = 'nvmap'; slot.appendChild(NVF.el);
    NVF.map = new N.Map(NVF.el, { center: at, zoom: 15, mapDataControl: false, scaleControl: false, zoomControl: true,
      zoomControlOptions: { position: N.Position.TOP_RIGHT, style: N.ZoomControlStyle.SMALL } });
    NVF.mark = new N.Marker({ map: NVF.map, position: at, icon });
  } else {
    slot.appendChild(NVF.el);
    NVF.map.setSize(new N.Size(slot.clientWidth, slot.clientHeight)); NVF.map.refresh(true);
    if (NVF.fid !== UI.nvFac) { NVF.map.setCenter(at); NVF.map.setZoom(15); NVF.mark.setPosition(at); NVF.mark.setIcon(icon); }
    else if (NVF.full !== !!UI.mapFull) NVF.map.setCenter(at);  // 크기가 바뀌면 공장이 가운데 오게
  }
  NVF.fid = UI.nvFac; NVF.full = !!UI.mapFull;
}
// 지난번 미흡 항목 한 줄 설명 — 언제 문제였고, 그 뒤 공장주가 무엇을 했나
// 미흡 항목이 지나온 일 — 날짜(·시간) 순 세로 줄. 점검에서 발견 → 공장주 고쳤어요(메모) / 점검에서 안 고쳐짐 → 이번 점검에서 확인 (2026-09-22 사용자 지시)
function prevTimeline(e) {
  const row = (when, what, sub = '', cls = '') => `<li class="${cls}"><span class="gtlw">${when}</span><span class="gtlx"><b>${what}</b>${sub ? `<small>${sub}</small>` : ''}</span></li>`;
  const at = (l) => `${l.at}${l.tm ? `<i>${l.tm}</i>` : ''}`;
  const rows = [row(e.ins.date, '점검에서 불량 발견', esc(e.ins.by))];
  (e.it.log || []).forEach((l) => rows.push(l.t === 'fix'
    ? row(at(l), '공장주가 고쳤다고 알림', l.note ? `"${esc(l.note)}"` : '', 'fix')
    : row(at(l), l.result === 'fixed' ? '점검에서 고쳐짐 확인' : '점검에서 안 고쳐짐', l.reason ? esc(l.reason) : '', l.result === 'fixed' ? 'fix' : 'bad')));
  if (!(e.it.log || []).length) rows.push(row('', '공장주가 아직 안 고침', '', 'none'));
  rows.push(row('이번 점검', '고쳐졌는지 확인', '', 'next'));
  return `<ol class="gtl">${rows.join('')}</ol>`;
}
function prevNote(e) {
  const last = (e.it.log || []).slice(-1)[0];
  const next = last ? (last.t === 'fix' ? `${last.at} 공장주 "고쳤어요"${last.note ? `<br>"${esc(last.note)}"` : ''}` : last.result === 'not' ? `${last.at} 점검에서 안 고쳐짐` : '') : '공장주가 아직 안 고침';
  return `${e.ins.date} 불량${next ? '<br>' + next : ''}`;
}
// 공장 창의 점검 이력 — 최근 3건을 한 줄씩, 누르면 이 공장 점검 결과 화면 (2026-09-22 사용자 지시)
function insHist(s, fid, all) {
  const list = facInsp(s, fid);
  if (!list.length) return `<div><div class="lbl">점검 이력</div><div class="cnone">아직 점검한 적이 없어요</div></div>`;
  return `<div><div class="lbl">점검 이력 ${list.length}건</div>
    <div class="ghist">${(all ? list : list.slice(0, 3)).map((i) => { const b = i.items.filter((x) => x.answer === 'bad').length;
      return `<button class="ghr" data-go="records/${fid}/pre"><span class="ghd">${i.date}</span><span class="ghn"><b>${i.result || RESULTS[0]}</b><small>${i.by}</small></span>${b ? tg(`불량 ${b}`, 'warn') : ''}</button>`; }).join('')}
      <button class="ghall" data-go="records/${fid}/pre">점검 결과 전체 보기 ${I('chevron', 16)}</button></div></div>`;
}
// 기업 정보 — 기존 화성 웹의 기업정보 항목을 묶어 보인다 (2026-09-23 사용자 요청).
// 회사 → 연락처 → 위치 → 업종과 인원. 전화·메일은 눌러서 바로 걸고 쓰게, 주소 아래에 지도 앱 단추
// 기업 정보 — 지킴이가 현장에서 고친 값(s.firm)을 원래 값(FIRM) 위에 덮어 보인다 (2026-10-14 사용자: 사전미팅에서 확인하고 고칠 수 있게)
const firmOf = (s, fid) => ({ ...(FIRM[fid] || {}), workers: FACTORIES[fid].workers, ...((s.firm || {})[fid] || {}) });
// 고칠 수 있는 칸 — 기업명 · 행정구역 · 업종은 공장을 가리키는 값이라 지킴이 앱에서는 고치지 않는다(운영자 웹 공장 등록에서)
const FIRM_EDIT = {
  co: ['회사', [['ceo', '대표자'], ['biz', '사업자번호'], ['kind', '기업 종류', ['소공인', '소기업', '중소기업', '기타']], ['own', '소유 형태', ['소유', '임차', '기타']]]],
  tel: ['연락처', [['tel', '회사 전화', 'tel'], ['fax', '팩스', 'tel'], ['mail', '대표 메일', 'email']]],
  loc: ['위치', [['addr', '사업장 주소 (도로명 뒤)']]],
  work: ['업종과 인원', [['product', '주생산품'], ['workers', '상시 근로자 (명)', 'number'], ['foreign', '외국인 근로자 (명)', 'number']]],
  // 사전 확인 표에서 바로 고치는 칸 — 종이 체크리스트(공식판) 번호 칸 이름 그대로 (2026-10-23). 기업명 · 행정구역 · 업종코드 · 기업등록일자는 여기서도 안 고친다
  p1: ['1. 기업정보', [['biz', '사업자번호'], ['ceo', '대표자명'], ['tel', '회사 전화번호', 'tel'], ['fax', '회사 팩스번호', 'tel'], ['mail', '회사 주대표메일', 'email'],
    ['product', '주 생산용품'], ['workers', '상시 근로자수 (명)', 'number'], ['foreign', '외국인 근로자 수 (명)', 'number'], ['own', '소유형태', ['소유', '임차', '기타']],
    ['kind', '기업종류', ['소공인', '소기업', '중소기업', '기타']], ['addr', '사업장주소 (도로명 뒤)'], ['etc', '기타정보']]],
  p2: ['2. 관리정보', [['injury', '전년도 재해건수 (건)', 'number'], ['why', '등록사유', ['현장등록', '점검신청', '점검거부', '기업DB', '기타']]]],
  p3: ['3. 담당자 정보', [['mgr', '안전담당자'], ['mgrTel', '담당자 전화번호', 'tel'], ['mgrMail', '담당자 이메일', 'email'], ['mgrPhone', '담당자 휴대폰', 'tel']]],
};
function firmInfo(s, fid) {
  const f = FACTORIES[fid], x = firmOf(s, fid), ed = ((s.firm || {})[fid] || {}).edits || {};
  const who = (k) => (ed[k] ? `<div class="gfiwho">${ed[k].at} ${esc(ed[k].by)} 수정</div>` : '');
  const box = (k, title, body) => `<div class="gfi"><div class="gfih"><span>${title}</span>${k ? `<button class="gfied" data-act="firmEdit" data-fid="${fid}" data-v="${k}">수정</button>` : ''}</div>${body}${k ? who(k) : ''}</div>`;
  // 전화 · 메일 줄 (2026-10-14 사용자: 파란 바탕이 깔끔하지 않다) — 위 이름표·값 표와 같은 줄에, 오른쪽 작은 동그라미 아이콘만 누를 것임을 알린다
  const tap = (href, ic, label, v) => `<a class="gfia" href="${href}" aria-label="${label} ${esc(v)}"><span class="gfil">${label}</span><b>${esc(v)}</b><span class="hic">${I(ic, 16)}</span></a>`;
  return `${box('co', '회사', kv([['기업명', esc(f.name)], ['대표자', esc(x.ceo || '-')], ['사업자번호', esc(x.biz || '-')], ['기업 종류', esc(x.kind || '-')], ['소유 형태', esc(x.own || '-')]]))}
    ${box('tel', '연락처', `${tap('tel:' + x.tel, 'phone', '회사 전화', x.tel)}<div class="gfia off"><span class="gfil">팩스</span><b>${esc(x.fax)}</b></div>${tap('mailto:' + x.mail, 'send', '대표 메일', x.mail)}`)}
    ${box('loc', '위치', `${kv([['행정구역', `화성시 ${f.dong}`], ['사업장 주소', `경기도 화성시 ${f.dong} ${esc(x.addr || '')}`]])}
      <button class="maplink" data-act="openMap">${I('globe', 17)} 지도 앱으로 열기</button>`)}
    ${box('work', '업종과 인원', kv([['업종', `${esc(f.type)}<br><small class="gfis">${x.ksic ? `${x.ksic[0]} ${x.ksic[1]}` : ''}</small>`], ['주생산품', esc(x.product || '-')],
      ['상시 근로자', `${esc(x.workers)}명`], ['외국인 근로자', `${esc(x.foreign ?? '-')}명`]]))}`;
}
// 사전 확인 표 — 종이 체크리스트(공식판 앞면) 1~5번 칸 그대로: 칸 이름 · 차례 · 꼭 적을 칸(*)까지 (2026-10-23 사용자 지시, v2 말고 공식판).
// 모양은 같은 날 디자인안 다섯 가운데 안 1(한 장 표) — 번호 줄(옅은 남색), 이름표 칸 회색 바탕, 전화 · 메일 · 지도는 오른쪽 칸, 빈 칸은 "비어 있음".
// 고치기는 같은 날 바로 고치기 디자인안 다섯 가운데 안 A — 고칠 수 있는 칸에 옅은 연필, 누르면 그 줄이 입력칸(오른쪽 ✓ · 엔터로 저장),
// 고르는 칸은 줄 아래로 단추가 펼쳐져 누르면 바로 저장. 번호 줄의 수정 단추는 뺐다(수정 → 칸 다시 찾기를 없애려고).
// 공장 창 기업 정보 탭은 카드 넷 그대로. 4 점검정보 · 5 점검조 정보는 앱이 아는 값이라 고치지 않는다
const CELL = Object.fromEntries(['p1', 'p2', 'p3'].flatMap((g) => FIRM_EDIT[g][1].map(([k, label, kind]) => [k, { g, label, kind }])));
function paperTable(s, fid, secs) {
  const f = FACTORIES[fid], x = firmOf(s, fid), ed = ((s.firm || {})[fid] || {}).edits || {}, cur = UI.cell && UI.cell.k;
  const soft = (t) => `<span class="gfte">${t}</span>`, v = (y, unit = '') => (y || y === 0 ? esc(y) + unit : soft('비어 있음'));
  const req = (t) => `${t}<i class="gftm">*</i>`;
  const h = (t, k) => `<div class="gfth"><b>${t}</b>${k && ed[k] ? `<span class="gfiwho">${ed[k].at} ${esc(ed[k].by)} 수정</span>` : ''}</div>`;
  const r = (k, val, end = '') => `<div class="gftr"><span><em>${k}</em></span><b>${val}</b>${end}</div>`;
  // 고칠 수 있는 줄 — 주소는 앞(경기도 화성시 동)을 두고 뒤만 고친다
  const e = (label, k, unit = '', end = '', shown = v(x[k], unit), pre = '') => {
    const kind = CELL[k].kind, opts = Array.isArray(kind) && kind;
    if (cur === k && !opts) {
      const type = kind ? ` type="${kind === 'number' ? 'text' : kind}" inputmode="${kind === 'number' ? 'numeric' : kind}"` : '';
      return `<div class="gftr ed"><span><em>${label}</em></span><b>${pre ? `<small>${pre}</small>` : ''}<span class="gfin"><input id="cellIn" value="${esc(UI.cell.v)}"${type} enterkeyhint="done" autocomplete="off" aria-label="${CELL[k].label}">${unit ? `<i>${unit}</i>` : ''}</span></b><button class="gftok" data-act="cellSave" aria-label="저장">${I('check', 20)}</button></div>`;
    }
    const row = `<div class="gftr${cur === k ? ' op' : ''}"><span><em>${label}</em></span><b class="gftv" data-act="cellEdit" data-k="${k}" role="button" tabindex="0"><span>${shown}</span>${I('pen', 16)}</b>${end}</div>`;
    return cur === k ? row + `<div class="gfopt">${opts.map((o) => `<button class="${x[k] === o ? 'on' : ''}" data-act="cellPick" data-v="${o}" aria-pressed="${x[k] === o}">${o}</button>`).join('')}</div>` : row;
  };
  const link = (href, ic, label, y) => (y ? `<a href="${href}${y}" aria-label="${label} ${esc(y)}">${I(ic, 18)}</a>` : '');
  const crew = TEAM.members.filter((n) => n !== TEAM.lead);
  const SEC = {
    1: () => h('1. 기업정보', 'p1') + r(req('기업명'), esc(f.name)) + e(req('사업자번호'), 'biz') + e('대표자명', 'ceo') + r(req('행정구역'), `화성시 ${f.dong}`)
      + e('회사 전화번호', 'tel', '', link('tel:', 'phone', '회사 전화', x.tel)) + e('회사 팩스번호', 'fax') + e('회사 주대표메일', 'mail', '', link('mailto:', 'send', '대표 메일', x.mail))
      + r('업종코드', x.ksic ? `${x.ksic[0]}<small>${x.ksic[1]}</small>` : soft('비어 있음')) + e('주 생산용품', 'product') + e('상시 근로자수', 'workers', '명') + e('외국인 근로자&nbsp;수', 'foreign', '명')
      + e('소유형태', 'own') + e('기업종류', 'kind') + e('사업장주소', 'addr', '', `<button data-act="openMap" aria-label="지도 앱으로 열기">${I('globe', 18)}</button>`, `경기도 화성시 ${f.dong} ${esc(x.addr || '')}`, `경기도 화성시 ${f.dong}`) + e('기타정보', 'etc'),
    2: () => h('2. 관리정보', 'p2') + e('전년도 재해건수', 'injury', '건') + e(req('등록사유'), 'why') + r(req('기업등록일자'), v(x.regDate)),
    3: () => h('3. 담당자 정보', 'p3') + e('안전담당자', 'mgr') + e('담당자 전화번호', 'mgrTel', '', link('tel:', 'phone', '담당자 전화', x.mgrTel))
      + e('담당자 이메일', 'mgrMail', '', link('mailto:', 'send', '담당자 이메일', x.mgrMail)) + e('담당자 휴대폰', 'mgrPhone', '', link('tel:', 'phone', '담당자 휴대폰', x.mgrPhone)),
    4: () => { const dn = UI.subIns && kzIns(s, UI.subIns);  // 제출 전 확인 — 마친 점검의 번호 · 날 · 결과 (2026-10-26 저녁)
      return h('4. 점검정보') + r('점검코드', dn ? esc(insNo(s, dn)) : soft('점검 결과 낼 때 부여')) + r('기업코드', v(x.code)) + r(req('방문(예정)일'), dn ? dn.date : `${TODAY.m}/${TODAY.d}`)
        + r(req('점검결과'), dn ? esc(dn.result || RESULTS[0]) : soft('점검 결과 낼 때 결정')); },
    5: () => h('5. 점검조 정보') + r('조장', esc(TEAM.lead)) + [0, 1, 2].map((i) => r(`조원${i + 1}`, v(crew[i]))).join(''),
  };
  return `<div class="gftb">${secs.map((n) => SEC[n]()).join('')}</div>`;
}
// 고치기 창 — 기업 정보 칸 하나. 고르는 칸(기업 종류 · 소유 형태)은 큰 단추로. 글자를 칠 때는 다시 그리지 않는다
function firmSheet(s) {
  const sh = UI.sheet, fields = FIRM_EDIT[sh.k][1], title = FIRM_EDIT[sh.k][0];
  const field = ([k, label, kind]) => Array.isArray(kind)
    ? `<div class="lbl">${label}</div><div class="fseg">${kind.map((o) => `<button class="${sh.vals[k] === o ? 'on' : ''}" data-act="firmSeg" data-k="${k}" data-v="${o}" aria-pressed="${sh.vals[k] === o}">${o}</button>`).join('')}</div>`
    : `<label class="fform"><span class="lbl">${label}</span><input class="input" data-fv="${k}" value="${esc(sh.vals[k] ?? '')}"${kind ? ` type="${kind === 'number' ? 'text' : kind}" inputmode="${kind === 'number' ? 'numeric' : kind}"` : ''} autocomplete="off"></label>`;
  const body = `${fields.map(field).join('')}
      <div class="row sstick"><button class="btn ghost cxl" data-act="closeSheet">취소</button><button class="btn" data-act="firmSave">저장하기</button></div>`;  // 칸이 많은 묶음(1. 기업정보 12칸)도 저장 단추가 보이게 아래에 붙인다
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet fsheet"><div class="grip"></div><div class="mid">${title} 수정</div>${body}</div>`;
}
// 공장 창 탭 (2026-09-23 사용자 결정) — 기업 정보가 늘어 센서 기록·점검 이력이 너무 아래로 밀려서 나눴다.
// 처음 여는 탭은 기업 정보, 차례도 기업 정보 → 점검 준비 → 기록 (같은 날 사용자 지시로 바꿈)
const FTABS = [['info', '기업 정보'], ['prep', '점검 준비'], ['log', '기록']];
// 공장 창과 AI 요약 창이 같이 쓰는 칸 — 센서 이상 기록, 지난번 미흡 항목
const senBlock = (hist) => `<div class="gpv"><div class="gpvh sen">${I('bell', 18)}<b>센서 이상 기록</b><em>${hist.length}건</em></div>
  <div class="rlist">${hist.map((a) => `<div class="vrow"><span class="gsw">${a.day}<i>${hm(a.start)}</i></span><div class="rtx"><div class="t">${esc(SIM.title(a))}</div>
    <small>${a.acks[0] ? `울린 뒤 ${a.acks[0].at - a.start}분 만에 조치` : SIM.endWord(a)}</small></div></div>`).join('')}</div></div>`;
const prevBlock = (q) => `<div class="gpv"><div class="gpvh">${I('alert', 18)}<b>지난번 미흡 항목</b><em>${q.length}개</em></div>
  ${q.map((e) => `<div class="q gpvq"><div class="t">${esc(e.it.text)}</div>${prevTimeline(e)}</div>`).join('')}</div>`;
function pre(s, fid) {
  const f = FACTORIES[fid], q = openIssues(s, fid);
  const hist = s.alarms.filter((a) => !SIM.live(a) && alarmFid(a) === fid);
  const going = s.draft && s.draft.kind === 'first' && s.draft.fid === fid;  // 하던 점검이 있으면 지우지 않는다
  // 아래 단추 둘 — 방문일 | 점검 시작. 점검 시작은 늘 열려 있다 (2026-10-07 사용자 지시로 예약·공장주 승인을 걷음 — 불시에 가기도 한다)
  const tab = UI.ftab[fid] || 'info';  // 공장마다 마지막에 본 탭을 기억한다 (점검 결과를 보고 돌아와도 기록 탭 그대로)
  return `${sbar(f.name)}<div class="scr"><div class="bd">
    ${head(f.name, UI.preBack[fid] || '')}
    ${ltitle(f.name)}
    ${miniMap(fid)}
    <div class="gtabs gftabs" role="tablist">${FTABS.map(([k, w]) => { const n = k === 'prep' ? q.length : k === 'log' ? hist.length + facInsp(s, fid).length : 0;
      return `<button class="gtab${tab === k ? ' on' : ''}" role="tab" aria-selected="${tab === k}" data-act="ftab" data-fid="${fid}" data-v="${k}">${w}${n ? `<em class="${k === 'prep' ? 'warn' : ''}">${n}</em>` : ''}</button>`; }).join('')}</div>
    ${tab === 'info' ? firmInfo(s, fid) : tab === 'log' ? `
    ${hist.length ? senBlock(hist) : `<div><div class="lbl">센서 이상 기록</div><div class="cnone">센서 이상 기록이 없어요</div></div>`}
    ${insHist(s, fid, true)}` : `
    ${kv([['방문', s.visits[fid] || '안 정함']])}
    ${q.length ? prevBlock(q) : `<div><div class="lbl">지난번 미흡 항목</div><div class="cnone">고칠 게 남은 항목이 없어요</div></div>`}`}
  </div><div class="ft">
    <div class="gft2"><button class="btn ghost" data-act="date" data-fid="${fid}">${s.visits[fid] ? '일정 변경' : '방문일 정하기'}</button>
    <button class="btn" data-act="newDraft" data-fid="${fid}">${going ? '이어서 점검하기' : '점검 시작'}</button></div>
  </div></div>${UI.sheet && UI.sheet.type === 'date' ? dateSheet(s) : ''}${UI.sheet && UI.sheet.type === 'firm' ? firmSheet(s) : ''}`;
}

/* ---------- 사진 번호 ----------
   체크리스트 화면 아래 카메라로 찍으면 사진 속 설비의 점검 포인트(주안점)를 내던 사진 AI(G4, 2026-10-14~)는 2026-10-23 사용자 지시로 걷었다 —
   카메라 단추 · AI 띠 · 점검 포인트 창 · 문항 아래 사진 점검 포인트. 지난번 미흡을 바탕으로 한 주안점은 분야별 안전점검 맨 위(focusPts). */
// 사진은 번호로 기억한다 — 현장점검 개선사항 사진(pics)이 이 번호를 쓴다
const shotsOf = (d) => d.shots || Array.from({ length: d.photos || 0 }, (_, i) => i + 1);  // 예전 초안은 장수만 있다
// 찍은 사진 (2026-10-14 사용자: AI 제안 옆에 무슨 사진에서 나온 것인지 보이게) — 시제품은 카메라 대신 시험용 AI 생성 사진 다섯 장(photos/)을
// 찍은 차례대로 돌려 쓴다 (2026-10-22 사용자 지시 — 전에는 번호마다 그린 현장 그림이었다).
// w · h: 사진 크기(크게 보기 칸을 사진 비율대로),
// risks: 현장점검 개선사항에서 AI가 추천하는 위험요인 — 사진에 보이는 만큼만, 없으면 빈 칸 (같은 날 사용자 지시 — 셋을 맞추지 않는다).
// 진짜 AI를 부르지 않는다. 사진을 보고 정해 둔 흉내다
const PHOTOS = [
  { src: 'photos/1_exit_door.png', w: 416, h: 486, risks: ['화재', '무너짐'] },
  { src: 'photos/2_extinguisher.png', w: 423, h: 489, risks: [] },
  { src: 'photos/3_wet_floor.png', w: 419, h: 489, risks: ['넘어짐'] },
  { src: 'photos/4_panel_open.png', w: 626, h: 431, risks: ['전류 접촉', '화재'] },
  { src: 'photos/5_rack.png', w: 646, h: 432, risks: ['떨어짐(낙하)', '무너짐'] },
];
const photoOf = (k) => PHOTOS[(k - 1) % PHOTOS.length];
const photoBox = (k) => `aspect-ratio:${photoOf(k).w}/${photoOf(k).h}`;  // 크게 보기 칸을 사진 비율대로
// 지적 사진은 한 건에 여러 장일 수 있다 (2026-10-22 사용자 지시 — 5장까지). pics = 사진마다 붙인 번호, 첫 장이 대표 사진. 예전 기록은 shot: true만 있어 한 장으로 본다.
// 시제품은 진짜 사진이 없어 같은 그림을 다르게 잘라(viewBox) 여러 장처럼 보인다 — 0번이 처음 그림 그대로
const PIC_VIEW = ['0 0 80 60', '16 10 48 36', '0 0 56 42', '24 18 56 42', '10 4 60 45'];
const picsOf = (it) => it.pics || (it.shot ? [0] : []);
const shotArt = (k) => `<img class="gshart" src="${photoOf(k).src}" alt="" decoding="async">`;
// 현장점검 개선사항의 사진 — 앱 카메라로 찍은 진짜 사진(d.real)이면 그것, 아니면 시험 사진
const realOf = (d, k) => (d.real || {})[k];
const findArt = (d, k) => (realOf(d, k) ? `<img class="gshart" src="${realOf(d, k).src}" alt="" decoding="async">` : shotArt(k));
const findBox = (d, k) => (realOf(d, k) ? `aspect-ratio:${realOf(d, k).w}/${realOf(d, k).h}` : photoBox(k));
// 작은 사진 칸 — 누르면 크게 본다
const shotThumb = (k) => `<button class="gsth" data-act="shotView" data-k="${k}" aria-label="사진 ${k} 크게 보기">${shotArt(k)}<em>사진 ${k}</em></button>`;
// 사진 크게 보기 — 예전 초안의 AI 제안 문항에 붙은 사진 (2026-10-23 사진 AI를 걷으며 점검 포인트 상자는 뺐다)
function shotViewer() {
  const v = UI.shot;
  return `<div class="rphv" role="dialog" aria-label="사진 ${v.k} 크게 보기">
    <div class="rphvh"><b class="gshvt">사진 ${v.k}</b><button class="rphvx" data-act="shotClose" aria-label="닫기">${I('close', 22)}</button></div>
    <div class="rphvb"><div class="gshvb" style="${photoBox(v.k)}">${shotArt(v.k)}</div></div></div>`;
}
// 크게 보기에서 여러 장 넘기기 — 양옆 단추와 아래 점. 옆으로 밀어도 넘어간다 (아래 pointerup)
const picNav = (i, n, act) => (n < 2 ? '' : `<button class="gpvb prev" data-act="${act}" data-v="-1"${i ? '' : ' disabled'} aria-label="앞 사진">${I('chevron', 22)}</button><button class="gpvb next" data-act="${act}" data-v="1"${i < n - 1 ? '' : ' disabled'} aria-label="다음 사진">${I('chevron', 22)}</button>`);
const picDots = (i, n) => (n < 2 ? '' : `<div class="gpvd" aria-label="${n}장 중 ${i + 1}번째">${Array.from({ length: n }, (_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div>`);
/* ---------- G5-0 사전 확인 — 점검 시작을 누르면 먼저 (2026-10-23 사용자 지시) ----------
   기업 정보 → 유해위험기구 보유현황 → 위험물질/유해화학물질 취급여부 → 01 산업안전 일반 4문항을 차례로 보고 지적사항으로 넘어간다.
   전에는 기업 정보가 공장 창의 탭에만 있어 놓칠 수 있었다. 등록된 값이 있으면 그대로 띄우고, 비어 있어도 넘어갈 수 있다
   (사전미팅에서 안 적고 사무실 웹에서 이어 적기도 한다 — 웹은 나중에).
   보유현황과 취급여부는 공장의 값이라 기업 정보처럼 s.firm에 둔다. null = 아직 안 적음, [] = 없음.
   보유현황 칸 이름은 종이 6번 글 그대로(같은 날 공식판 기준으로 — 「레이져컷팅기」 철자, 기타장비는 이름을 적는다), 문항은 9번 05의 (유해위험기구) 문항과 차례대로 잇는다.
   둘 다 16칸이고, 05의 「압력용기」 두 문항은 한 칸이 맡는다.
   없는 기구의 05 문항은 해당 없음으로 넣고 체크리스트에서 감춘다(auto) — 그래서 체크리스트 탭의 장비 고르기 화면은 걷었다(같은 날 사용자 지시, 중복) */
const KIT_NAMES = ['지게차', '이동식 및 천장크레인', '용접기', '리프트', '사다리', '컨베이어', '산업용로봇', '사출성형기', '선반·밀링·CNC 절삭장비',
  '레이져컷팅기', '프레스', '압력용기', '분쇄기·파쇄기·전단기', '배합기·밀링·혼합기', '롤러기', '기타장비'];
const KIT = (() => { const m = new Map();
  CHECKLIST.areas.find((a) => a.key === 'a5').items.forEach((t, i) => { const g = /^\(유해위험기구\)「(.+?)」/.exec(t);
    if (g) m.set(g[1], [...(m.get(g[1]) || []), `ca5-${i}`]); });
  return [...m.values()].map((ids, i) => ({ name: KIT_NAMES[i], ids })); })();
const KIT_IDS = KIT.flatMap((k) => k.ids);
const CHEM = ['유해화학물질 제조', '유해화학물질 취급', '기준량이하 제조/취급', '해당없음'];
// 단계 — 종이 1번 / 2~5번 / 6번 / 7번 / 9번 01 (1~5번을 한 화면에 두면 30줄이라 둘로 나눔)
const MEET = [['기업정보', '기업정보'], ['관리 · 담당자 · 점검 정보', '관리 · 점검 정보'], ['유해위험기구 보유현황', '보유현황'], ['위험물질/유해화학물질 취급여부', '위험물질'], ['01 산업안전 일반', '산업안전 일반']];
// 지금 고치는 점검 — 점검 중이면 초안, 제출 전 확인(#/sub)이면 마친 그 점검 (2026-10-26 저녁 — 점검 화면을 제출 전 확인에서 그대로 쓴다)
const ckDoc = (s = DB.s) => (UI.subIns && kzIns(s, UI.subIns)) || s.draft;
// 보유현황에 없는 기구의 05 문항 — 답이 없으면 해당 없음으로 넣고 감춘다. 다시 고르면 비운다. 지킴이가 손으로 답한 것은 그대로
function syncKit(s) {
  const d = ckDoc(s), kit = firmOf(s, d.fid).kit, own = kit && KIT.filter((k) => kit.includes(k.name)).flatMap((k) => k.ids);
  d.items.forEach((x) => {
    if (!KIT_IDS.includes(x.id)) return;
    const off = own && !own.includes(x.id);
    if (off && (!x.answer || x.auto)) { x.answer = 'na'; x.auto = true; }
    else if (!off && x.auto) { x.answer = null; delete x.auto; }
  });
}
function setFirm(k, v) {
  const fid = ckDoc().fid;
  DB.act((s) => { s.firm = s.firm || {}; s.firm[fid] = { ...(s.firm[fid] || {}), [k]: v }; if (k === 'kit') syncKit(s); });
}
// 여러 개 고르기 (2026-10-26 사용자 시안 F) — 맨 위에 고른 것 모아 보기(× 로 빼기), 아래 한 줄 목록 + 네모 체크, 맨 아래 따로 "없음" 칸.
// 사전점검 3/5 보유현황 · 체크리스트 [보유 기구 고르기] 창 · 사전점검 4/5 위험물질(같은 날 사용자 지시로 같은 모양)이 같이 쓴다. 그 전엔 두 칸 회색 칸에 고르면 보라
// o: { all 고를 것, sel 고른 것, act, unit "고른 기구 n종", none [이름, 골랐나, act], mid 목록과 없음 칸 사이에 넣을 것 }
function checkPicker(o) {
  const chk = (on) => `<span class="kpchk">${on ? I('check', 15) : ''}</span>`;
  const row = (on, act, v) => `<button class="kprow${on ? ' on' : ''}" data-act="${act}" data-v="${v}" aria-pressed="${on}">${chk(on)}<span>${esc(v)}</span></button>`;
  const [noneW, noneOn, noneAct] = o.none;
  const sum = o.sel.length ? `<b>${o.unit(o.sel.length)}</b><div class="kpchips">${o.sel.map((n) => `<button data-act="${o.act}" data-v="${n}" aria-label="${n} 빼기">${esc(n)}${I('close', 14)}</button>`).join('')}</div>`
    : `<b>${noneOn ? noneW : '고른 것 없음'}</b>`;
  return `<section class="kpsec"><div class="kpsum">${sum}</div>
    <div class="kplist">${o.all.map((n) => row(o.sel.includes(n), o.act, n)).join('')}</div>${o.mid || ''}
    <div class="kplist kpnone">${row(noneOn, noneAct, noneW)}</div></section>`;
}
const kitPicker = (x) => { const kit = x.kit || [];
  return checkPicker({ all: KIT.map((k) => k.name), sel: kit, act: 'kitTg', unit: (n) => `고른 기구 ${n}종`, none: ['가진 기구 없음', !!x.kit && !x.kit.length, 'kitNone'],
    mid: kit.includes('기타장비') ? `<div class="kpetc">${x.kitEtc ? `<button class="gftx has" data-act="kitEtcOpen"><b>기타장비 (   )</b><span>${esc(x.kitEtc)}</span></button>`
      : `<button class="gftx" data-act="kitEtcOpen">${I('plus', 15)}기타장비 이름</button>`}</div>` : '' }); };
// 위험요인 고르기 — 보유 기구 고르기와 같은 꼴: 위에 고른 것(눌러 빼기), 아래 네모 줄 (2026-10-27 사용자 지시)
// 창 높이를 넘으면 줄 목록(.kpscr)만 스크롤 — 위 칩 · 아래 단추는 그대로 (2026-10-27 사용자 지시)
// 추천(recs)을 주면 추천 · 고른 것만 먼저, 나머지는 접는다 — 개선 관리 지도유형은 안 주고 다 편다. 누를 때 창을 다시 그리지 않는다(riskTg)
const riskSum = (sel) => sel.length ? `<b>고른 위험요인 ${sel.length}개</b><div class="kpchips">${sel.map((r) => `<button data-act="riskTg" data-v="${r}" aria-label="${r} 빼기">${r}${I('close', 14)}</button>`).join('')}</div>` : '<b>고른 것 없음</b>';
function riskPicker(sel, recs) {
  const row = (r) => { const on = sel.includes(r);
    return `<button class="kprow${on ? ' on' : ''}" data-act="riskTg" data-v="${r}" aria-pressed="${on}"><span class="kpchk">${on ? I('check', 15) : ''}</span><span>${r}</span>${recs && recs.includes(r) ? '<em class="gfrec">AI 추천</em>' : ''}</button>`; };
  const top = recs ? RISKS.filter((r) => recs.includes(r) || sel.includes(r)) : [], more = RISKS.filter((r) => !top.includes(r));
  return `<section class="kpsec"><div class="kpsum">${riskSum(sel)}</div>
    <div class="kpscr">${top.length ? `<div class="kplist">${top.map(row).join('')}</div><div class="kplist srmore" hidden>${more.map(row).join('')}</div>` : `<div class="kplist">${RISKS.map(row).join('')}</div>`}</div></section>
    ${top.length ? `<button class="srmbtn" data-act="riskMore" aria-expanded="false"><span>나머지 ${more.length}개 더 보기</span>${I('chevron', 16)}</button>` : ''}`;
}
// 위험물질 — 넷째 칸 "해당없음"은 다른 것과 같이 못 고르니 맨 아래 따로 (chemTg)
const chemPicker = (x) => { const chem = (x.chem || []).filter((c) => c !== CHEM[3]);
  return checkPicker({ all: CHEM.slice(0, 3), sel: chem, act: 'chemTg', unit: (n) => `고른 항목 ${n}개`, none: [CHEM[3], (x.chem || []).includes(CHEM[3]), 'chemTg'] }); };
// 종이 6번 "기타장비 (   )" 괄호 칸 — 이름을 적는다
const kitEtcSheet = (x) => `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="mid">기타장비 이름</div>
    <input class="input" id="kitEtcIn" value="${esc(x.kitEtc || '')}" placeholder="예: 호이스트, 건조로" autocomplete="off">
    <div class="row"><button class="btn ghost cxl" data-act="closeSheet">취소</button><button class="btn" data-act="kitEtcSave">저장</button></div>
  </div>`;
function meetScreen(s, st) {
  const d = s.draft, f = FACTORIES[d.fid], x = firmOf(s, d.fid), kit = x.kit || [], chem = x.chem || [];
  const body = st === 1 ? paperTable(s, d.fid, [1]) : st === 2 ? paperTable(s, d.fid, [2, 3, 4, 5])
    : st === 3 ? kitPicker(x)
    : st === 4 ? chemPicker(x)
    : `<div class="clist">${d.items.map((y, i) => [y, i]).filter(([y]) => y.area === 'a1').map(([y, i], j) => ckRow(d, y, i, j + 1)).join('')}</div>`;
  const last = st === MEET.length;
  return `${sbar(f.name)}<div class="scr"><div class="bd geqbd">
    ${head(f.name + ' 점검', UI.startBack ?? 'pre/' + d.fid, tmpBtn())}
    ${insTabs(d, 'meet')}
    <div class="cph"><span class="cpn">${st} / ${MEET.length}</span><b>${MEET[st - 1][0]}</b></div>
    ${body}
  </div><div class="ft"><div class="gft2">${st > 1 ? `<button class="btn ghost" data-act="meetGo" data-v="${st - 1}">${I('back', 18)} 이전</button>` : ''}
    <button class="btn cnext" data-act="${last ? 'meetEnd' : 'meetGo'}" data-v="${st + 1}"><span class="cnl">다음: ${last ? '현장점검' : MEET[st][1]}</span>${I('chevron', 18)}</button></div></div></div>
  ${UI.sheet && UI.sheet.type === 'kitEtc' ? kitEtcSheet(x) : ''}${UI.sheet && UI.sheet.type === 'bad' ? badSheet(s) : ''}`;
}
// 사전 확인 표 바로 고치기 — 값이 그대로면 적지 않는다(누가 고쳤는지 줄이 괜히 붙지 않게). 바꿀 값을 먼저 정해 두고 넣는다(DB.push가 다시 적용해도 같게)
function cellPut(k, val) {
  const fid = ckDoc().fid, g = CELL[k].g, at = `${TODAY.m}/${TODAY.d}`;
  if (val === String(firmOf(DB.s, fid)[k] ?? '')) { render(); return; }
  DB.act((s) => { s.firm = s.firm || {}; const c = s.firm[fid] || {};
    s.firm[fid] = { ...c, [k]: val, edits: { ...(c.edits || {}), [g]: { at, by: ME } } };
    DB.log(`지킴이 기업 정보 고침 · ${FACTORIES[fid].name} ${FIRM_EDIT[g][0]}`); });
}
// 열린 칸을 닫는다 — 적던 글은 저장한다(✓ · 엔터 · 다른 곳 누르기 모두)
function cellClose() { const c = UI.cell; UI.cell = null; if (c && !Array.isArray(CELL[c.k].kind)) cellPut(c.k, String(c.v).trim()); else render(); }
document.addEventListener('click', (e) => { if (UI.cell && !e.target.closest('.gftr.ed, .gftr.op, .gfopt')) cellClose(); }, true);  // 다음 · 이전 · 다른 칸을 눌러도 적던 값이 날아가지 않게, 그 단추가 하는 일보다 먼저
document.addEventListener('input', (e) => { if (e.target.id === 'cellIn' && UI.cell) UI.cell.v = e.target.value; });
document.addEventListener('keydown', (e) => {
  if (e.target.id !== 'cellIn') return;
  if (e.key === 'Enter') { e.preventDefault(); cellClose(); } else if (e.key === 'Escape') { UI.cell = null; render(); }
});
// 기업 정보 고치기 창에 적던 글을 담아 둔다, 사진 넘기기
document.addEventListener('input', (e) => { const k = e.target.dataset && e.target.dataset.fv; if (k && UI.sheet && UI.sheet.vals) UI.sheet.vals[k] = e.target.value; });
let swX = null;
document.addEventListener('pointerdown', (e) => { swX = e.target.closest('[data-swipe]') ? e.clientX : null; });
document.addEventListener('pointerup', (e) => {
  if (swX == null) return; const dx = e.clientX - swX; swX = null;
  if (Math.abs(dx) < 40) return; const v = dx < 0 ? 1 : -1;  // 왼쪽으로 밀면 다음 사진
  if (UI.fv) ACTS.fvStep({ v });
});
// 기본 체크리스트 고르기 — 점검 포인트는 둘: 사진 찍어(점검하면서) · 보유현황에서 고른 기구(2026-10-23 — 전에는 여기서 장비를 골랐다)
function pickScreen(s) {
  const d = s.draft, f = FACTORIES[d.fid];
  const nBase = CHECKLIST.areas.reduce((n, a) => n + a.items.length, 0);
  const nAi = d.items.filter((x) => x.src === 'ai').length;  // AI는 항목을 만들지 않는다 (2026-10-20) — 그 전 초안에 넣어 둔 것만
  // 보유현황에 없는 기구 문항은 체크리스트에서 감추므로 세지 않는다
  const kit = firmOf(s, d.fid).kit, nOff = kit ? KIT.filter((k) => !kit.includes(k.name)).flatMap((k) => k.ids).length : 0;
  const nPrev = openIssues(s, d.fid).length, total = nBase - nOff + nAi + d.self.length;  // 지난번 미흡은 문항이 아니라 주안점 (2026-10-23)
  const answered = d.items.some((x) => x.answer && !x.auto);
  return `${sbar(f.name)}<div class="scr"><div class="bd" style="gap:8px">
    ${head(f.name + ' 점검', UI.startBack ?? 'pre/' + d.fid, tmpBtn())}
    ${insTabs(d, 'ck')}
    ${nPrev ? `<div class="grp">지난번 미흡 항목 — 이번 주안점으로<span class="must">${nPrev}개</span></div>
    ${openIssues(s, d.fid).map((e) => `<div class="item"><div class="bul">!</div><div><div class="t">${esc(e.it.text)}</div><div class="why">${prevNote(e)}</div></div></div>`).join('')}` : ''}
    <div class="grp">기본 체크리스트<span class="must">${CHECKLIST.ver}</span><span class="must">${nBase}문항</span></div>
    ${CHECKLIST.areas.map(ckArea).join('')}
    ${d.self.length ? `<div class="grp">직접 추가<span class="must">${d.self.length}개</span></div>` : ''}
    ${d.self.map((t) => `<div class="item sel"><div class="bul">${I('plus', 14)}</div><div><div class="t">${esc(t)}</div><div class="why">직접 추가</div></div></div>`).join('')}
    <button class="add" data-act="addSelf">＋ 항목 직접 추가</button>
  </div><div class="ft"><button class="btn" data-act="startAnswer">${answered ? `${total}개 이어서 점검하기` : `${total}개로 점검 시작`}</button></div></div>
  ${UI.sheet && UI.sheet.type === 'self' ? selfSheet() : ''}`;
}
// 기본 체크리스트 영역 — 누르면 아래로 펼쳐져 문항을 미리 본다 (2026-09-23 사용자 지시). 보기만 하고 답은 점검하면서 단다
function ckArea(a) {
  const open = !!UI.ckOpen[a.key];
  return `<div class="item gck${open ? ' open' : ''}">
    <button class="gckh" data-act="ckTg" data-k="${a.key}" aria-expanded="${open}"><span class="bul">✓</span>
      <span class="gckt"><span class="t">${a.no} ${a.name}</span><span class="why">${tg(a.common ? '공통' : '설비별')}${tg(a.items.length + '문항')}${a.common ? '' : '<br>없는 설비는 해당 없음으로'}</span></span>
      <span class="gtdar${open ? ' on' : ''}">${I('chevron', 18)}</span></button>
    <div class="gckl"${open ? '' : ' inert'}><div><ol>${a.items.map((q) => `<li>${esc(q)}</li>`).join('')}</ol></div></div></div>`;
}
function selfSheet() {
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="mid">항목 직접 추가</div>
    <input class="input" id="selfIn" placeholder="예: 소화기가 제자리에 있나?">
    <div class="row"><button class="btn ghost cxl" data-act="closeSheet">취소</button><button class="btn" data-act="saveSelf">더하기</button></div>
  </div>`;
}

/* ---------- G5-가 현장점검 개선사항 — 점검 첫 화면 (2026-10-22 사용자 지시, 써 보고 정하는 시험판) ----------
   점검의 중심은 지적사항(종이 10번 현장점검 개선사항)이다. 체크리스트(종이 9번)는 지적사항을 바탕으로 채우는 두 번째 탭으로 내려간다.
   한 건씩 줄을 더하고(+), 그 줄에서 찍은 사진은 그 건에 바로 들어간다(5장까지, 첫 장이 대표 사진). 지난 줄을 눌러 다시 찍거나 사진첩에서 더할 수도 있다.
   지적사항이면 AI가 대표 사진을 보고 위험요인을 추천하고(보이는 만큼만, 없으면 없다고), 지킴이가 빼거나 더한다. 잘된 사항도 같은 줄로 남긴다(위험요인 없음).
   같은 날 처음엔 사진을 몰아 찍고 점검 뒤에 건으로 묶는 판이었다 — 사용자 지시로 한 건씩 찍는 판으로 바꿈.
   공장에 보내기와 재점검은 아직 잇지 않았다 — 점검 결과는 지금처럼 체크리스트 마무리에서 낸다.
   2026-10-23 사용자 지시 — 아래 사진첩 · 찍기 · 개선사항 추가 단추와 목록 아래 + 개선사항 · + 잘된 사항을 걷었다.
   새 건은 빈 화면 카드 · 목록 아래 점선 칸의 카메라 단추로 더한다(누르면 새 개선사항에 사진 한 장) */
const FIND_MAX = 5;
const FIND_WORD = { bad: '개선사항', good: '잘된 사항' };  // 2026-10-23 사용자 지시로 지적사항 → 개선사항 (종이 10번 현장점검 개선사항)
const FIND_TEXT = { bad: '개선 전 내용', good: '내용' };  // 같은 날 사용자 지시 — 지적한 줄의 내용은 종이 10번 개선 전 내용
const findsOf = (d) => d.finds || [];
const findOf = (d, id) => findsOf(d).find((x) => x.id === id);
// 갈래 — 지킴이가 위험요인을 다 지운 개선사항은 잘된 사항으로 본다(위험요인을 다시 더하면 개선사항으로) (2026-10-23 사용자 지시).
// AI가 찾은 것이 없을 뿐인 줄(지킴이가 손대지 않음)은 개선사항 그대로 — 진짜 사진은 AI 흉내 답이 늘 없어서
const kindOf = (f) => (f.kind === 'good' || (f.own && f.risks && !f.risks.length) ? 'good' : 'bad');
const findNo = (d, f) => findsOf(d).filter((x) => kindOf(x) === kindOf(f)).indexOf(f) + 1;
const findWord = (d, f) => `${FIND_WORD[kindOf(f)]} ${findNo(d, f)}`;
// 현장점검 개선사항을 점검 결과의 지적 항목으로 (2026-10-26 개선 관리 초안 — 전에는 점검 결과 내기에서 버려졌다).
// 개선 전 내용은 memo로, 사진은 찍은 것 그대로(photos — 앱 카메라 사진이면 그 주소, 아니면 시험 사진). 잘된 사항은 보내지 않는다
const findItems = (d) => findsOf(d).filter((f) => kindOf(f) === 'bad').map((f) => ({ id: 'find-' + f.id, text: findWord(d, f), src: 'find', answer: 'bad',
  memo: f.text || '', post: '', st: 'ing', after: [], eval: '', log: [], risks: f.risks || [], shot: f.pics.length > 0, pics: f.pics.map((_, j) => j),
  photos: f.pics.map((k) => realOf(d, k) || { src: photoOf(k).src, w: photoOf(k).w, h: photoOf(k).h }) }));
// 지금 펼친 줄 — 고른 적이 없으면 맨 아래 줄
const factOf = (d) => findOf(d, UI.fact) || findsOf(d)[findsOf(d).length - 1] || null;
// 대표 사진(첫 장)이 바뀌면 AI가 다시 본다. 잘된 사항은 보지 않는다. 지킴이가 손댄 위험요인은 그대로 둔다
function repCheck(f) {
  const rep = f.kind === 'bad' ? f.pics[0] : undefined;
  if ((f.ai && f.ai.rep) === rep) return;
  f.ai = rep ? { st: 'wait', rep } : null;
  if (!f.own) f.risks = null;
}
// 점검 안의 탭 — 사전점검 → 현장점검(종이 10번 현장점검 개선사항) → 분야별 안전점검(종이 9번 체크리스트) 차례
// (2026-10-23 사전 확인을 앞에 더함. 같은 날 사용자 지시로 이름을 사전 확인 · 지적사항 · 체크리스트에서 바꿈)
// 현장점검 옆 개선사항 수는 같은 날 사용자 지시로 뺐다
const insTabs = (d, on) => `<div class="gtabs gins" role="tablist">${[['meet', '사전점검'], ['fix', '현장점검'], ['ck', '분야별 안전점검']].map(([k, w]) =>
  `<button class="gtab${on === k ? ' on' : ''}" role="tab" aria-selected="${on === k}" data-act="insTab" data-v="${k}">${w}</button>`).join('')}</div>`;
// AI 추천 기다리기 — 시제품은 2~4초 흉내, 전파가 없으면 잡힐 때까지 기다린다
function findPump() {
  const d = DB.s.draft;
  if (!d || d.kind !== 'first' || !DB.s.net.guard) return;
  findsOf(d).filter((f) => f.ai && f.ai.st === 'wait' && !UI.fT[f.id]).forEach((f) => {
    UI.fT[f.id] = setTimeout(() => { delete UI.fT[f.id]; findDone(f.id); }, 2500 + (f.ai.rep % 3) * 700);
  });
}
function findDone(id) {
  const f0 = DB.s.draft && findOf(DB.s.draft, id);
  if (!f0 || !f0.ai || f0.ai.st !== 'wait' || !DB.s.net.guard) return;
  const recs = realOf(DB.s.draft, f0.ai.rep) ? [] : photoOf(f0.ai.rep).risks, sh = UI.sheet;  // 시제품은 대표 사진마다 정해 둔 것 (PHOTOS risks, 없을 수도 있다). 진짜 사진은 흉내 답이 없다
  // 그 건의 위험요인 창이 열려 있고 아직 안 만졌으면 창에도 넣는다
  if (!DB.s.aiDown && sh && sh.type === 'frisk' && sh.id === id && !sh.touched && !f0.own) sh.risks = [...recs];
  DB.act((s) => {
    const f = findOf(s.draft, id);
    if (s.aiDown) { f.ai.st = 'fail'; return; }
    f.ai.st = 'done'; f.ai.recs = recs;
    if (!f.own) f.risks = [...recs];
  });
}
// 접힌 줄의 둘째 줄 — 지적사항은 위험요인(없으면 내용), 잘된 사항은 내용
const findSub = (x) => (kindOf(x) === 'bad' && x.ai && x.ai.st === 'wait' && !x.own ? '<span class="gfai"><i class="gspin"></i>AI 분석 중</span>'
  : kindOf(x) === 'bad' && (x.risks || []).length ? x.risks.map((r) => `<span class="gfmini"><i>${RISKS.indexOf(r) + 1}</i>${r}</span>`).join('')
  : x.text ? `<span class="gfrtx">${esc(x.text)}</span>` : kindOf(x) === 'bad' && x.risks ? '<span class="gfrtx">위험요인 없음</span>' : '');
// 펼친 줄 — 사진(대표는 크게), 위험요인(지적사항만), 내용. 찍기와 사진첩은 아래 단추로 이 줄에 넣는다
// (같은 날 사용자 지시로 걷은 것 — 줄 안의 찍기 · 사진첩 칸, 지적사항 | 잘된 사항 바꾸기, 왼쪽 색 띠와 아이콘 동그라미, 알약 칩. 종류는 더할 때 고른다)
function findOpen(d, x) {
  const n = x.pics.length, ai = x.ai, word = findWord(d, x), recs = ai && ai.st === 'done' ? ai.recs : [];
  // 사진 — 대표 사진만 크게, 나머지 장수는 오른쪽 아래 "+4"로. 누르면 크게 보며 넘긴다
  // (같은 날 사용자 지시로 걷은 것 — 대표 옆 · 아래에 늘어놓기, 대표 뒤에 겹쳐 쌓기)
  const pics = n ? `<button class="gfrep" data-act="fvOpen" data-id="${x.id}" data-i="0" aria-label="${word} 사진 ${n}장 크게 보기">${findArt(d, x.pics[0])}<em>대표</em>${n > 1 ? `<b>${I('image', 15)}+${n - 1}</b>` : ''}</button>`
    : `<div class="gfp0">${I('camera', 28)}<span>사진 없음</span></div>`;
  // 이 줄에 사진 더 찍기 (2026-10-23 사용자 지시 — 아래 카메라를 걷어 줄마다 단추). 5장이면 회색, 누르면 까닭을 알린다
  const more = `<button class="gfpmore${n >= FIND_MAX ? ' full' : ''}" data-act="fcam" data-id="${x.id}">${I('camera', 18)}사진 추가</button>`;
  const aiTag = ai && ai.st === 'wait' && !x.own ? '<span class="gfai"><i class="gspin"></i>AI가 대표 사진을 보는 중</span>'
    : ai && ai.st === 'fail' ? `<button class="gfai fail" data-act="fRetry" data-id="${x.id}">${I('alert', 15)}AI 다시</button>`
    : recs.length && !x.own ? tg('AI 추천')
    : ai && ai.st === 'done' && !x.own ? '<span class="gfai">AI가 찾은 위험요인 없음</span>' : '';
  const risk = x.kind !== 'bad' ? '' : `<div class="gfrk"><div class="gfrkh"><b>위험요인</b>${aiTag}</div>
    <div class="gfchips">${(x.risks || []).map((r) => `<span class="gfchip"><i>${RISKS.indexOf(r) + 1}</i>${r}<button data-act="fRiskDel" data-id="${x.id}" data-v="${r}" aria-label="${r} 빼기">${I('close', 15)}</button></span>`).join('')}
      <button class="gfchip gfplus" data-act="fRiskOpen" data-id="${x.id}">${I('plus', 15)}추가</button></div></div>`;
  return `<section class="gfr on" id="fr-${x.id}">
    <div class="gfrh"><b>${word}</b><span class="gfrn">사진 ${n} / ${FIND_MAX}</span><button class="gfrx" data-act="fDelAsk" data-id="${x.id}" aria-label="${word} 지우기">${I('trash', 20)}</button></div>
    ${pics}
    ${more}
    ${risk}
    <div class="gfrk"><div class="gfrkh"><b>${FIND_TEXT[kindOf(x)]}</b></div>
      <textarea class="gftxa" id="fxIn" data-tx="find:${x.id}" placeholder="여기에 ${FIND_TEXT[kindOf(x)]} 입력">${esc(txVal('find:' + x.id, x.text))}</textarea></div>
  </section>`;
}
// 바로 적는 칸 — 현장점검 개선 전 내용(find:줄 id) · 분야별 안전점검 평가 내용(item:문항 id) (2026-10-23 사용자 지시 — + 단추 → 아래 창 대신).
// 적는 대로 UI.ftx에 담고, 칸 밖을 누르거나 다른 칸으로 옮기거나 다른 화면으로 가면 저장한다.
// 적는 동안에는 다시 그리지 않는다 — AI 결과가 그사이 오면 한글 조합이 깨진다. 미룬 것은 칸 밖을 누를 때 그린다
const txVal = (k, v0) => (UI.ftx && UI.ftx.k === k ? UI.ftx.v : v0 || '');
function ftxSave() {
  const t = UI.ftx; UI.ftx = null; UI.ftxWait = false;
  if (!t) { render(); return; }
  const [type, id] = t.k.split(':'), v = t.v.trim(), key = type === 'find' ? 'text' : 'eval';
  if (type === 'advtx' || type === 'advver') {  // 제출할 것 — 개선을 위한 조언 · 판 번호 (2026-10-26 저녁)
    const k2 = type === 'advtx' ? 'text' : 'ver', o2 = kzIns(DB.s, id);
    if (!o2 || v === advOf(o2)[k2]) { render(); return; }
    DB.act((s) => { const g = kzIns(s, id); if (g) g.adv = { ...advOf(g), [k2]: v }; }); return;
  }
  if (type === 'kzpre' || type === 'kzpost') {  // 개선 관리 — 낸 점검의 개선사항 (2026-10-26)
    const k2 = type === 'kzpre' ? 'memo' : 'post', o2 = kzItem(DB.s, id);
    if (!o2 || v === (o2[k2] || '')) { render(); return; }
    DB.act((s) => { const g = kzItem(s, id); if (g) g[k2] = v; }); return;
  }
  const pick = (d) => (type === 'find' ? findOf(d, id) : d.items.find((x) => x.id === id));
  const o = ckDoc() && pick(ckDoc());
  if (!o || v === (o[key] || '')) { render(); return; }
  DB.act((s) => { const g = pick(ckDoc(s)); if (g) g[key] = v; });
}
document.addEventListener('input', (e) => { const k = e.target.dataset && e.target.dataset.tx; if (!k) return; if (UI.ftx && UI.ftx.k !== k) ftxSave(); UI.ftx = { k, v: e.target.value };
  if (k.startsWith('advver:') && $('#advCode')) $('#advCode').textContent = advCode({ ...advOf(kzIns(DB.s, k.slice(7))), ver: e.target.value }); });  // 조언 앞 코드도 같이
// 그 단추가 하는 일보다 먼저 저장한다 (사전 확인 표 칸과 같은 방식). 적던 칸 안을 누르면 그대로
document.addEventListener('click', (e) => { if (!UI.ftx && !UI.ftxWait) return; const t = e.target.closest('[data-tx]'); if (!t || !UI.ftx || t.dataset.tx !== UI.ftx.k) ftxSave(); }, true);  // 판 번호 칸(.input)도 (2026-10-26 저녁)
addEventListener('hashchange', () => { if (UI.ftx) ftxSave(); });
// 맨 아래 [다음: 분야별 안전점검] — 사전점검 [다음]과 같은 단추 (2026-10-27 사용자 지시)
function fixScreen(s) {
  const d = s.draft, f = FACTORIES[d.fid], fs = findsOf(d), on = factOf(d);
  const bad = fs.filter((x) => kindOf(x) === 'bad'), good = fs.filter((x) => kindOf(x) === 'good'), nRisk = bad.reduce((a, x) => a + (x.risks || []).length, 0);
  const sum = `<div class="gfsum">${[['개선사항', bad.length], ['잘된 사항', fs.length - bad.length], ['위험요인', nRisk]].map(([w, n]) => `<div><span>${w}</span><b>${n}</b></div>`).join('')}</div>`;
  const row = (x) => (x === on ? findOpen(d, x) : `<button class="gfr" id="fr-${x.id}" data-act="fOn" data-id="${x.id}">
      <span class="gfrt">${x.pics.length ? findArt(d, x.pics[0]) : I('camera', 22)}</span>
      <span class="gfrb"><b>${findWord(d, x)}</b><span class="gfrs">${findSub(x)}</span></span>
      <span class="gfrc">${I('camera', 14)}${x.pics.length}</span></button>`);
  // 잘된 사항(위험요인을 다 지운 줄)은 점선 칸 아래에 따로 모은다 (같은 날 사용자 지시)
  // 새 건 더하기 — 처음엔 흰 카드, 줄이 생기면 그 아래 점선 칸. 카메라는 단추 모양, 칸 전체를 눌러도 된다.
  // 점선 칸은 카메라 아래 "개선사항 n 찍기" 한 줄(같은 날 사용자 지시 — 위 [사진 추가]와 달리 새 건이 생긴다는 것을 번호로)
  const shot = (more) => `<button class="gfempty${more ? ' more' : ''}" data-act="fcam"><span class="gfei">${I('camera', 34)}</span><b>${more ? `${FIND_WORD.bad} ${bad.length + 1} 찍기` : '개선할 곳을 찾으면<br>한 건씩 더해 주세요'}</b></button>`;
  return `${sbar(f.name)}<div class="scr"><div class="bd" style="gap:10px">
    ${head(f.name + ' 점검', UI.startBack ?? 'pre/' + d.fid, tmpBtn())}
    ${insTabs(d, 'fix')}
    ${fs.length ? `${sum}${bad.length ? `<div class="gfrs0">${bad.map(row).join('')}</div>` : ''}${shot(true)}
      ${good.length ? `<div class="gfsec">잘된 사항</div><div class="gfrs0">${good.map(row).join('')}</div>` : ''}` : shot(false)}
  </div><div class="ft"><button class="btn cnext" data-act="insTab" data-v="ck"><span class="cnl">다음: 분야별 안전점검</span>${I('chevron', 18)}</button></div></div>${UI.sheet && UI.sheet.type === 'frisk' ? fRiskSheet(s) : ''}${UI.sheet && UI.sheet.type === 'fdel' ? fDelSheet(s) : ''}${UI.fv ? findViewer(s) : ''}`;
}
// 위험요인 고르기 — AI가 추천한 것과 고른 것을 먼저, 나머지는 접어 둔다 (불량 창과 같은 모양)
function fRiskSheet(s) {
  const d = s.draft, sh = UI.sheet, f = findOf(d, sh.id);
  if (!f) return '';
  const recs = f.ai && f.ai.st === 'done' ? f.ai.recs : [];
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="srh"><b>${findWord(d, f)} 위험요인</b></div>
    ${riskPicker(sh.risks, recs)}
    <div class="row sstick"><button class="btn ghost cxl" data-act="closeSheet">취소</button><button class="btn" data-act="fRiskSave">저장</button></div>
  </div>`;
}
function fDelSheet(s) {
  const d = s.draft, f = findOf(d, UI.sheet.id);
  if (!f) return '';
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="mid">${findWord(d, f)} 지우기</div>
    ${f.pics.length ? `<div class="small">사진 ${f.pics.length}장도 같이 지워져요</div>` : ''}
    <div class="row"><button class="btn ghost cxl" data-act="closeSheet">취소</button><button class="btn red" data-act="fDel">지우기</button></div>
  </div>`;
}
// 한 건의 사진 크게 보기 — 넘겨 보며 대표 사진을 바꾸거나 뺀다
function findViewer(s) {
  const d = s.draft, f = findOf(d, UI.fv.id);
  if (!f || !f.pics.length) return '';
  const n = f.pics.length, i = Math.min(UI.fv.i, n - 1);
  return `<div class="rphv" role="dialog" aria-label="${FIND_WORD[kindOf(f)]} 사진 크게 보기">
    <div class="rphvh"><b class="gshvt">${findWord(d, f)}</b><button class="rphvx" data-act="fvClose" aria-label="닫기">${I('close', 22)}</button></div>
    <div class="rphvb" data-swipe="${f.id}">${picNav(i, n, 'fvStep')}<div class="gshvb" style="${findBox(d, f.pics[i])}">${findArt(d, f.pics[i])}</div></div>
    <div class="rphvf">${picDots(i, n)}<span>${i ? `사진 ${i + 1}` : '대표 사진'}${n > 1 ? ` (${i + 1} / ${n})` : ''}</span>
      <div class="gft2 gfva"><button class="btn ghost" data-act="fvRep"${i ? '' : ' disabled'}>${I('check', 18)}대표 사진으로</button><button class="btn ghost" data-act="fvDrop">${I('trash', 18)}사진 빼기</button></div></div></div>`;
}
// 새 줄 — 펼치고 그 줄로 화면을 옮긴다
// 켜 둔 서버에서는 바꾸기가 부딪히면(빠르게 연달아 누르면 요청 차례가 뒤바뀐다) 같은 바꾸기를 한 번 더 적용한다(DB.push).
// 그래서 줄 번호 · 사진 번호를 먼저 정해 두고, 이미 있으면 다시 넣지 않는다 — 한 건에 사진 6장이 들어간 일이 있었다 (2026-10-22 사용자 화면)
function newFind(kind) {
  const num = (DB.s.draft.findN || 0) + 1, id = 'f' + num;
  UI.fact = id;
  DB.act((s) => { const d = s.draft; if (findOf(d, id)) return;
    d.findN = Math.max(d.findN || 0, num); d.finds = [...findsOf(d), { id, kind, pics: [], risks: null, text: '', ai: null }]; });
  scrollFind(id);
  return id;
}
const nextShots = (d, n) => { const top = Math.max(d.shotN || 0, ...shotsOf(d), 0); return Array.from({ length: n }, (_, i) => top + i + 1); };
function putShots(fid, ks, real) {
  DB.act((s) => {
    const d = s.draft, g = findOf(d, fid); if (!g) return;
    if (real) d.real = { ...(d.real || {}), ...real };  // 앱 카메라로 찍은 진짜 사진 — 사진 번호 → 주소 · 크기
    ks.forEach((k) => {
      if (!shotsOf(d).includes(k)) { d.shots = [...shotsOf(d), k]; d.photos = d.shots.length; }
      d.shotN = Math.max(d.shotN || 0, k);
      if (!g.pics.includes(k) && g.pics.length < FIND_MAX) g.pics.push(k);
    });
    repCheck(g);
  });
}
// 위험요인을 다 지우면 잘된 사항으로, 다시 더하면 개선사항으로 — 옮겨 간 줄을 펼친 채 그리로 화면을 옮기고 알린다
function kindMove(id, fn) {
  const was = kindOf(findOf(DB.s.draft, id));
  UI.fact = id; fn();
  const f = findOf(DB.s.draft, id);
  if (f && kindOf(f) !== was) { toast(kindOf(f) === 'good' ? '위험요인이 없어 잘된 사항으로 옮겼어요' : '개선사항으로 옮겼어요'); scrollFind(id); }
}
const scrollFind = (id) => { const el = document.getElementById('fr-' + id); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); };

/* ---------- 앱 안 카메라 (2026-10-23 사용자 지시) ----------
   [사진 추가] · 새 개선사항 카메라를 누르면 앱 안에서 한 장 찍는다. 셔터를 누르면 찍은 사진이 멈춰 보이고 [다시 찍기] / [사진 사용] — 사용하면 들어가고 앱으로 돌아온다
   (기본 카메라 앱과 같은 차례, 2026-10-23 사용자 지시. 그 전에는 이어 찍다 [완료]였다).
   새 개선사항은 사진을 사용할 때 생긴다 — 그냥 닫으면 빈 줄이 남지 않게.
   브라우저 규칙상 https · localhost에서만 켜진다. http 주소(같은 와이파이)면 폰의 기본 카메라 앱으로 찍고, 돌아오면 바로 들어간다(카메라 앱에 확인이 있다).
   카메라를 못 켜면(권한 거절 · 카메라 없음) 그 자리에서 기본 카메라 앱이나 시험 사진(photos/)을 고른다.
   화면은 #app 밖에 따로 둔다 — 다시 그릴 때마다 카메라 영상이 끊기지 않게.
   모양은 C안(같은 날 사용자 지시): 영상은 머리 바로 아래 3:4 칸을 채우고, 찍을 때 그 칸 비율대로 가운데를 잘라 보이는 범위 그대로 남긴다.
   영상 위에 안내("사진 n") · 플래시 · 확대(1× 2×), 아래 칸에 장수 점과 셔터. 플래시 · 확대는 폰이 되는 것만 보인다.
   사진은 줄여(JPEG) 서버에 올리고(api/photo) 점검에는 주소만 둔다(d.real). 서버 없이 열면 그림째 둔다.
   진짜 사진은 AI 흉내 답이 없어 "AI가 찾은 위험요인 없음"이 된다 — 지킴이가 직접 더한다 */
const CAM = { open: false, st: '', fid: null, made: false, title: '', base: 0, shot: null, stream: null, torch: false, flash: false, zoom: null, zm: 1, q: Promise.resolve() };
const camIn = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', hidden: true });
camIn.setAttribute('capture', 'environment');  // 폰에서는 고르기 창 없이 카메라 앱이 바로 열린다
camIn.addEventListener('change', () => { const f = camIn.files[0]; camIn.value = ''; if (f) camLoad(f); });
document.body.appendChild(camIn);
function camOpen(fid) {
  const d = DB.s.draft, f = fid && findOf(d, fid);
  Object.assign(CAM, { fid, made: false, title: f ? findWord(d, f) : `${FIND_WORD.bad} ${findsOf(d).filter((x) => kindOf(x) === 'bad').length + 1}`, base: f ? f.pics.length : 0, shot: null });
  if (!window.isSecureContext || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { camIn.click(); return; }  // 누른 그 순간에 열어야 폰이 막지 않는다
  CAM.open = true; camStart();
}
// 개선 관리 개선 전 · 개선 후 추가는 사진첩에서 고른다 (2026-10-27 사용자 지시 — 전엔 앱 카메라). 여러 장 한 번에, 남은 칸(5장까지)만큼 차례로 줄여 올린다
// 고르기 칸은 누를 때마다 새로 만든다 — 하나를 다시 쓰면 안드로이드 크롬에서 뒤로 가기로 닫은 뒤 다시 안 열렸다(같은 날 사용자 제보). 남은 옛 칸은 버린다
function galOpen(k) {
  document.querySelectorAll('.galin').forEach((e) => e.remove());
  const el = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', multiple: true, hidden: true, className: 'galin' });
  el.addEventListener('change', () => { const files = [...el.files]; el.remove(); galPut(k, files); });
  el.addEventListener('cancel', () => el.remove());
  document.body.appendChild(el); el.click();
}
function galPut(k, files) {
  const it = kzItem(DB.s, k.it); if (!it || !files.length) return;
  const room = FIND_MAX - ((k.side === 'after' ? it.after : it.photos) || []).length;
  if (files.length > room) toast(`사진은 ${FIND_MAX}장까지예요. ${room}장만 넣어요`);
  files.slice(0, room).forEach((f) => { CAM.q = CAM.q.then(() => new Promise((ok, no) => { const img = new Image(), url = URL.createObjectURL(f);
      img.onload = () => { URL.revokeObjectURL(url); camShrink(img, img.naturalWidth, img.naturalHeight).then(ok); };
      img.onerror = () => { URL.revokeObjectURL(url); no(); }; img.src = url; }))
    .then(photoSave).then((p) => kzPut(k, p)).catch(() => toast('사진을 넣지 못했어요')); });
}
function camStart() {
  CAM.st = 'start'; camPaint();
  navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
    .then((s) => {
      if (!CAM.open) { s.getTracks().forEach((t) => t.stop()); return; }
      CAM.stream = s; const v = $('#camv video'), tr = s.getVideoTracks()[0], cap = tr && tr.getCapabilities ? tr.getCapabilities() : {};
      Object.assign(CAM, { torch: !!cap.torch, flash: false, zoom: cap.zoom && cap.zoom.max >= 2 ? cap.zoom : null, zm: 1 });
      v.onloadedmetadata = () => { v.play().catch(() => {}); if (CAM.st === 'start') { CAM.st = 'live'; camPaint(); } };  // 영상 크기가 잡힌 뒤에 셔터를 켠다
      v.srcObject = s;
    })
    .catch(() => { if (CAM.open) { CAM.st = 'off'; camPaint(); } });
}
function camStop() { if (CAM.stream) { CAM.stream.getTracks().forEach((t) => t.stop()); CAM.stream = null; } }
function camClose() {
  camStop(); CAM.open = false; CAM.st = '';
  if (CAM.shot) { URL.revokeObjectURL(CAM.shot.url); CAM.shot = null; }
  const fid = CAM.fid;
  if (CAM.made) CAM.q = CAM.q.then(() => {  // 이번에 만든 개선사항에 사진이 못 들어갔으면(올리기 실패) 지운다
    const d = DB.s.draft, f = d && findOf(d, fid);
    if (f && !f.pics.length) { if (UI.fact === fid) UI.fact = null; DB.act((s) => { s.draft.finds = findsOf(s.draft).filter((x) => x.id !== fid); }); }
  });
  camPaint();
}
// 한 장 넣기 — 올리기는 차례대로, 사진 번호는 올린 뒤에 정한다(둘이 겹치지 않게)
function camPut(sh) {
  if (!CAM.fid) { CAM.fid = newFind('bad'); CAM.made = true; }
  const fid = CAM.fid;
  CAM.q = CAM.q.then(() => photoSave(sh)).then((p) => {
    const d = DB.s.draft; if (!d || !findOf(d, fid)) return;
    const k = nextShots(d, 1)[0]; putShots(fid, [k], { [k]: p });
  }).catch(() => toast('사진을 올리지 못했어요'));
}
function camLoad(file) {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => { URL.revokeObjectURL(url); camShrink(img, img.naturalWidth, img.naturalHeight).then((sh) => { camPut(sh); camClose(); }); };
  img.onerror = () => { URL.revokeObjectURL(url); toast('사진을 열지 못했어요'); };
  img.src = url;
}
function camPaint() {
  let el = $('#camv');
  if (!CAM.open) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div'); el.id = 'camv'; el.className = 'gcv'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '사진 찍기');
    el.innerHTML = '<div class="gcvh"></div><div class="gcvb"><video playsinline muted autoplay></video><img alt=""><p></p><div class="gcvo"></div><div class="gcvz"></div></div><div class="gcvl"><div class="gcvd"></div><div class="gcvf"></div></div>';
    document.body.appendChild(el);
  }
  const st = CAM.st, n = CAM.base;
  el.dataset.st = st;
  el.querySelector('.gcvh').innerHTML = `<button class="gcvx" data-act="camClose" aria-label="닫기">${I('close', 24)}</button><b>${CAM.title}</b><span>${st === 'last' ? '방금 찍은 사진' : `사진 ${n} / ${FIND_MAX}`}</span>`;
  if (st === 'last') el.querySelector('.gcvb img').src = CAM.shot.url;
  el.querySelector('.gcvo').innerHTML = `<span class="gcvhint">${I('camera', 15)}사진 ${n + 1}</span>`
    + (CAM.torch ? `<button class="gcvlt${CAM.flash ? ' on' : ''}" data-act="camFlash" aria-label="플래시" aria-pressed="${CAM.flash}">${I('bolt', 22)}</button>` : '');
  el.querySelector('.gcvz').innerHTML = CAM.zoom ? `<span class="gcvzm">${[1, 2].map((z) => `<button class="${CAM.zm === z ? 'on' : ''}" data-act="camZoom" data-v="${z}" aria-pressed="${CAM.zm === z}">${z}×</button>`).join('')}</span>` : '';
  el.querySelector('.gcvd').innerHTML = Array.from({ length: FIND_MAX }, (_, i) => `<i${i < n ? ' class="on"' : ''}></i>`).join('');
  el.querySelector('.gcvb p').innerHTML = st === 'start' ? '카메라 켜는 중' : st === 'off' ? '카메라를 켤 수 없어요<small>카메라 권한을 확인하거나 아래에서 골라 주세요</small>' : '';
  el.querySelector('.gcvf').innerHTML = st === 'last' ? '<button class="gcvbt" data-act="camRetake">다시 찍기</button><button class="gcvbt ok" data-act="camUse">사진 사용</button>'
    : st === 'off' ? `<button class="gcvbt" data-act="camFile">${I('camera', 20)}카메라 앱으로</button><button class="gcvbt" data-act="camTest">${I('image', 20)}시험 사진</button>`
    : `<span></span><button class="gcvsh" data-act="camSnap" aria-label="찍기"${st === 'live' ? '' : ' disabled'}></button><span></span>`;
}
addEventListener('hashchange', () => { if (CAM.open) camClose(); });  // 폰의 뒤로 가기
// 다른 앱에 다녀오면 카메라가 꺼져 있을 수 있다 — 다시 켠다
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && CAM.open && CAM.stream && CAM.stream.getVideoTracks().every((t) => t.readyState === 'ended')) { camStop(); if (CAM.st === 'live') camStart(); }
});

/* ---------- G5 점검 — 목록 한 장에서 줄마다 바로 답하기 (2026-09-18 사용자 결정). 답 순서는 2026-10-07부터 양호 | 보통 | 불량 | 해당 없음 ---------- */
// 답은 넷 — 양호 | 보통 | 불량 | 해당 없음 (2026-10-07 사용자 지시. 전에는 이상 없음 · 문제 있음 · 해당 없음 셋).
// 저장 값은 ok · mid · bad · na — 옛 기록의 ok(이상 없음)는 양호로, bad(문제 있음)는 불량으로 읽는다. 공장주에게 개선 요청이 가는 것은 불량뿐
const ANS = { ok: '양호', mid: '보통', bad: '불량', na: '해당 없음' };
const ANS_ORDER = ['ok', 'mid', 'bad', 'na'];
const ansCls = (v) => (v === 'mid' ? 'amid' : v);  // .mid는 이미 제목 글씨 규칙이라 겹치지 않게
const GRP = { base: '기본 체크리스트', ai: 'AI 제안', self: '직접 추가' };
// 묶음 — 기본 체크리스트는 영역(01~05)마다, AI 장비 체크리스트는 장비마다(2026-10-07), 나머지는 출처마다 (2026-09-22)
const AREA = Object.fromEntries(CHECKLIST.areas.map((a) => [a.key, a]));
const gkey = (x) => (x.src === 'base' ? x.area || 'base' : x.src === 'ai' && x.eq ? 'eq:' + x.eq : x.src);
// 묶음 이름은 종이 체크리스트처럼 "(공통)화학안전" (2026-10-23 사용자 지시 — 전에는 "04 화학안전")
const gname = (k) => (AREA[k] ? `${AREA[k].common ? '(공통)' : ''}${AREA[k].name}` : k.startsWith('eq:') ? k.slice(3) : GRP[k] || SRC[k]);
// 문항 아래 점검 포인트 — 모든 문항 (2026-10-23 사용자 지시, 개수는 안 적는다). 기구 문항은 그 기구들의 것(EQ — 선반 · 밀링 · CNC처럼 한 문항에 여럿이면 기구 이름으로 나눈다,
// 05의 둘째 「압력용기」는 첫째와 같다), 나머지 문항과 기타장비·시설은 CK_PTS. 전에는 보유현황에서 고른 기구 문항에만 붙었다(2026-10-20 사진 AI 것은 걷음)
const ptsFor = (id) => (CK_PTS[id] ? [{ points: CK_PTS[id] }] : Object.values(EQ).filter((g) => g.item === (id === 'ca5-18' ? 'ca5-15' : id)));
// 아코디언 — 머리를 누르면 펼쳐지며 내려온다. 다시 그리지 않고 칸만 바꿔 움직임이 이어지게, 펼친 것은 UI.ptsOpen에 기억 (같은 날 사용자 지시)
function ptsRow(x) {
  const l = x.src === 'base' ? ptsFor(x.id) : [];
  if (!l.length) return '';
  const open = !!UI.ptsOpen[x.id];
  return `<div class="cacc${open ? ' open' : ''}"><button class="cacch" data-act="ptsTg" data-k="${x.id}" aria-expanded="${open}"><span>점검 포인트</span>${I('chevronDown', 18)}</button>
    <div class="caccb"><div><div class="caccin">${l.map((g) => `${l.length > 1 ? `<b>${esc(g.name)}</b>` : ''}<ol class="gpts">${g.points.map((p) => `<li><b>${esc(p.t)}</b><span>${esc(p.d)}</span></li>`).join('')}</ol>`).join('')}</div></div></div></div>`;
}
// 한 줄 = 문항 + 답 넷(양호 | 보통 | 불량 | 해당 없음) + 평가 내용 (2026-10-07 사용자 지시).
// 불량은 예전처럼 사진과 위험요인을 적는 창이 뜬다. 평가 내용(잘한 점 같은 것)은 어느 답이든 적을 수 있다 — 2026-10-23 사용자 지시로 + 단추 → 창 대신
// 현장점검 개선 전 내용과 같은 바로 적는 칸. 사전 확인의 01 산업안전 일반도 이 줄을 쓴다 (2026-10-23, 번호는 1~4)
function ckRow(d, x, i, no = i + 1) {
  const st = x.answer || '';
  // 고른 위험요인은 알약 대신 평가 내용처럼 제목 + 글 한 줄 (2026-10-26 사용자 지시 — AI스럽지 않게)
  const rk = st === 'bad' && (x.risks || []).length ? `<div class="crisk"><b>위험요인</b><span>${x.risks.map(esc).join(', ')}</span></div>` : '';
  const mark = st === 'bad' ? [x.memo ? '위험요인 내용: ' + esc(x.memo) : '', x.shot && !x.photo ? `사진 ${picsOf(x).length}장` : ''].filter(Boolean).join('<br>') : '';
  return `<div class="crow ${ansCls(st)}">
    <div class="ctop"><span class="cnum">${no}</span><div class="t">${esc(x.text)}</div>${x.photo ? shotThumb(x.photo) : ''}</div>${x.note ? `<div class="cmemo">${x.note}</div>` : ''}
    ${ptsRow(x)}
    <div class="cans c4">${ANS_ORDER.map((v) => `<button class="${st === v ? 'on ' + ansCls(v) : ''}" data-act="${v === 'bad' ? 'ansBad' : 'ans'}" data-n="${i}" data-v="${v}" aria-pressed="${st === v}">${ANS[v]}</button>`).join('')}</div>
    ${rk}${mark ? `<div class="cmemo">${mark}</div>` : ''}
    <div class="ceva"><b>평가 내용</b><textarea class="gftxa sm" id="ev-${x.id}" data-tx="item:${x.id}" placeholder="여기에 평가 내용 입력">${esc(txVal('item:' + x.id, x.eval))}</textarea></div>
  </div>`;
}
// 지난번 미흡을 바탕으로 이번에 중점적으로 볼 것(주안점) — AI가 정리한다(가짜: 미흡 문항 글과 적어 둔 위험요인 내용에서 낱말로 고른다).
// 지난번 미흡을 체크리스트 문항으로 따로 만들지 않는다 (2026-10-23 사용자 지시 — 전에는 맨 앞 "지난번 미흡" 묶음)
const FOCUS = [
  [/전선|피복/, '전선 · 피복', '벗겨졌던 전선을 바꿨는지, 바닥을 지나는 전선이 보호관에 들어 있는지 확인'],
  [/용접|케이블|물기/, '용접 케이블 · 바닥 물기', '케이블이 물기나 통로 위를 지나지 않는지, 피복 손상과 접지 확인'],
  [/교육/, '안전 교육 기록', '교육 일지와 참석 서명을 보고, 근로자에게 누전 때 대처 요령을 직접 물어보기'],
  [/위기 대응|비상 계획/, '전기사고 비상 계획', '비상 연락망과 대응 절차가 문서로 있는지, 근로자가 아는지 확인'],
  [/소방 시설|화재감지/, '소방 시설 관리', '소화기 압력과 월간 점검표, 화재감지기 작동 기록, 소화전 앞 적재 확인'],
  [/화재 예방/, '화재 예방', '가연물 정리, 흡연 구역, 용접 작업 때 불티 관리 확인'],
  [/비상대피|비상구/, '비상구 · 대피로', '비상구 앞 적재, 유도등 점등, 대피로 표시 확인'],
  [/경영방침|목표/, '안전보건 경영방침', '경영방침과 올해 목표를 문서로 세우고 게시했는지 확인'],
  [/배관|누수|펌프|승강기/, '배관 · 펌프 · 승강기', '부식 · 누수 자리를 고쳤는지, 펌프와 승강기 점검 기록 확인'],
  [/위험물질|저장|MSDS|화학/, '유해물질 저장', '저장 용기 표시와 방류턱, MSDS 비치와 근로자 교육 확인'],
];
function focusPts(s, fid) {
  const out = [];
  openIssues(s, fid).forEach((e) => {
    const m = FOCUS.find(([re]) => re.test(e.it.text + ' ' + (e.it.memo || '')));
    const t = m ? m[1] : e.it.text.replace(/\?$/, ''), was = `${e.ins.date} 불량${e.it.memo ? ` · ${e.it.memo}` : ''}`;
    const o = out.find((x) => x.t === t);
    if (o) o.was.push(was); else out.push({ t, d: m ? m[2] : '지난번 지적을 고쳤는지, 같은 문제가 다른 곳에 없는지 확인', was: [was] });
  });
  return out;
}
// 분야별 안전점검 — 안에서 탭 둘: 지난번 미흡 항목(AI 주안점) | 체크리스트 (2026-10-23 사용자 지시). 처음엔 지난번 미흡 항목, 점검하는 동안은 보던 탭 그대로.
// 지난번 미흡이 없으면 없다고 쓴다 — 점검 기록이 없으면 첫 점검이라고.
// 체크리스트는 묶음을 쪽으로 나누지 않고 한 쪽에 차례로, 아래로 내려 본다. 맨 아래 마무리에서 결과를 낸다 (같은 날 사용자 지시 — 전에는 묶음마다 한 쪽, 위 칩으로 넘김).
// 01 (공통)산업안전 일반은 사전점검에서 답하므로 여기서 뺀다
// 체크리스트에 보일 문항 — 점검 중 초안과 제출 전 확인(마친 점검)이 같이 쓴다 (2026-10-26 저녁 checkList에서 뗌)
// 보유현황에 없는 기구 문항(auto, 해당 없음으로 들어감)은 세지도 보이지도 않는다 (2026-10-23). 예전 초안에 남은 지난번 미흡 문항(prev)도 보이지 않는다.
// 보유현황을 아직 안 적었으면(null) 기구 문항을 다 감춘다 — 고른 기구 것만 뜬다 (같은 날 사용자 지시, 전에는 다 보였다). 손으로 답한 것은 보인다.
// 마친 점검은 현장점검 개선사항 줄 · 지난번 미흡 복사본도 감추고, 옛 기록(auto 표시 없음)은 고르지 않은 기구의 해당 없음을 감춘다
function ckShown(s, d) {
  const fx = firmOf(s, d.fid), noKit = !fx.kit, done = d !== s.draft;
  const own = fx.kit && KIT.filter((k) => fx.kit.includes(k.name)).flatMap((k) => k.ids);
  return (x) => !x.auto && x.area !== 'a1' && x.src !== 'prev' && !(noKit && KIT_IDS.includes(x.id) && !x.answer)
    && !(done && (x.src === 'find' || x.ref || (own && KIT_IDS.includes(x.id) && !own.includes(x.id) && x.answer === 'na')));
}
// 체크리스트 몸통 — 묶음 줄 + 보유 기구 머리 (점검 중 · 제출 전 확인이 같이 쓴다, 2026-10-26 저녁 checkList에서 뗌)
function ckSecs(s, d, shown) {
  const fx = firmOf(s, d.fid), noKit = !fx.kit, vis = d.items.filter(shown);
  const groups = [...new Set(vis.map(gkey))].map((k) => {
    const l = d.items.map((x, i) => [x, i]).filter(([x]) => gkey(x) === k && shown(x));
    return { k, l };
  });
  // 묶음 제목("(공통)소방안전")은 달지 않는다, 번호만 이어 간다 (2026-10-26 사용자 지시 — 전에는 작은 제목). 마무리의 안 본 것 줄은 묶음 이름 그대로.
  // 05에는 보유 기구와 [수정] — 고른 기구 문항만 뜬다. 자리는 05 일반 넷((작업환경) … (가스분야)) 다음, (유해위험기구) 문항 바로 위,
  // 시안 B 구분 머리 — 카드 없이 "유해위험기구 보유 n종 · 수정 ›"에 남색 밑줄, 기구 이름은 늘어놓지 않는다(창에서 봄).
  // 안 골랐으면 "보유 기구 선택 전" · 회색 밑줄 아래 남색 [보유 기구 고르기] (2026-10-26 사용자 지시 — 그 전엔 남색 테두리 카드에 이름 나열, 안 골랐으면 노란 카드)
  const kitLine = `<div class="ckkit${noKit ? ' none' : ''}"><div class="ckkh"><b>유해위험기구</b><span>${noKit ? '보유 기구 선택 전' : fx.kit.length ? `보유 ${fx.kit.length}종` : '보유 기구 없음'}</span>
    ${noKit ? '' : `<button class="cklnk" data-act="kitOpen">수정${I('chevron', 16)}</button>`}</div>
    ${noKit ? `<button class="btn" data-act="kitOpen">${I('wrench', 20)}보유 기구 고르기</button>` : ''}</div>`;
  // 상자는 묶음마다 나누지 않고 보유 기구 카드 위아래 둘로만 — 위는 02~05 일반 넷, 아래는 (유해위험기구)와 그 뒤 (2026-10-26 사용자 지시).
  let no = 0;
  const a5 = groups.findIndex((g) => g.k === 'a5');
  const row = ([x, i]) => ckRow(d, x, i, ++no);
  const all = groups.flatMap((g, n) => g.l.map((e) => [e, a5 >= 0 && (n > a5 || (g.k === 'a5' && KIT_IDS.includes(e[0].id)))]));  // [줄, 아래 상자]
  const box = (l) => (l.length ? `<div class="clist">${l.map(row).join('')}</div>` : '');
  return `<div class="cksec">${box(all.filter(([, b]) => !b).map(([e]) => e))}${a5 >= 0 ? kitLine : ''}${box(all.filter(([, b]) => b).map(([e]) => e))}</div>`;
}
function checkList(s) {
  const d = s.draft, f = FACTORIES[d.fid];
  const fx = firmOf(s, d.fid), shown = ckShown(s, d);
  const vis = d.items.filter(shown);
  const n = (v) => vis.filter((x) => x.answer === v).length;
  const done = ANS_ORDER.reduce((a, v) => a + n(v), 0);
  // 머리글 아래에 진행 막대와 상태별 수를 같이 붙여 스크롤해도 위에 남게 한다
  const top = `<div class="apptop">${gband(f.name + ' 점검', 'pick', tmpBtn())}
    <div class="progtop"><div class="rowx"><span class="t">${esc(f.name)} ${tg(CHECKLIST.ver)}</span><span class="small">${n('bad') ? `<b class="pbad">불량 ${n('bad')}</b>` : ''}<b>${done}</b> / ${vis.length} 답함</span></div>
    <div class="prog">${ANS_ORDER.map((v) => `<i class="${ansCls(v)}" style="width:${(n(v) / vis.length) * 100}%"></i>`).join('')}</div></div></div>`;
  const tab = UI.ckTab === 'list' ? 'list' : 'prev';
  const sub = `<div class="cksub" role="tablist">${[['prev', '지난번 미흡 항목'], ['list', '체크리스트']].map(([k, w]) =>
    `<button class="${tab === k ? 'on' : ''}" role="tab" aria-selected="${tab === k}" data-act="ckTab" data-v="${k}">${w}</button>`).join('')}</div>`;
  if (tab === 'prev') {
    const fp = focusPts(s, d.fid), nIss = openIssues(s, d.fid).length, past = s.inspections.filter((i) => i.fid === d.fid).sort((a, b) => mdNum(b.date) - mdNum(a.date))[0];  // 가장 최근 점검
    const focus = fp.length ? `<div class="gfoc"><div class="gfoch"><b>이번 점검 주안점</b>${tg('AI 정리')}<span>지난번 미흡 ${nIss}건 바탕</span></div>
      <ol class="gpts">${fp.map((p) => `<li><b>${esc(p.t)}</b><span>${esc(p.d)}</span><em>${p.was.map(esc).join('<br>')}</em></li>`).join('')}</ol></div>`
      : `<div class="cknone">${I('checkCircle', 30)}<b>지난번 미흡 항목 없음</b><span>${past ? `지난 점검(${past.date})에서 고칠 것이 없었거나 모두 고쳐짐` : '첫 점검이라 지난 점검 기록 없음'}</span></div>`;
    return `${sbar(f.name)}<div class="scr"><div class="bd" style="gap:8px">${top}
    ${insTabs(d, 'ck')}
    ${sub}
    ${focus}
  </div></div>`;
  }
  const secs = ckSecs(s, d, shown);
  // 마무리 — 점검 결과 · 시정 기한과 [점검 마치기]만 (2026-10-26 사용자 지시 — 안 본 것 · 불량 항목 목록 · 안내 상자는 뺐다.
  // 같은 날 저녁 [점검 결과 내기] → [점검 마치기]: 진짜 제출은 개선 관리 맨 끝 "제출할 것"에서, 그 전까지 체크리스트는 제출 전 확인(#/sub)에서 고친다
  // 안 본 수는 맨 위 진행 막대에, 불량 항목은 나중에 다른 탭에서). 다 안 봐도 낼 수 있다 (2026-10-14 사용자 지시)
  // 점검 결과는 고르지 않는다 — 불량이 있으면 재점검, 없으면 점검완료 (2026-10-13 사용자 결정)
  const res = findItems(d).length ? '재점검' : '점검완료';  // 현장점검 개선사항으로만 정한다 (10-26 개선 관리)
  const end = `<div class="ckend">${kv([['점검 결과', `<b>${res}</b>`], res === '재점검' && ['시정 기한', `${recheckDue({ date: '9/17' })}까지 (2주)`]])}
    <button class="btn" data-act="submitFirst">점검 마치기</button></div>`;
  return `${sbar(f.name)}<div class="scr"><div class="bd" style="gap:8px">${top}
    ${insTabs(d, 'ck')}
    ${sub}
    ${secs}
    ${end}
  </div></div>${UI.sheet && UI.sheet.type === 'bad' ? badSheet(s) : ''}${UI.sheet && UI.sheet.type === 'kit' ? kitSheet(fx) : ''}${UI.sheet && UI.sheet.type === 'kitEtc' ? kitEtcSheet(fx) : ''}${UI.shot ? shotViewer() : ''}`;
}
// 체크리스트에서 보유 기구 다시 보고 고치기 (같은 날 사용자 지시) — 사전점검 보유현황과 같은 칸. 고치면 뒤의 05 문항이 바로 바뀐다
const kitSheet = (x) => `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="srh"><b>유해위험기구 보유현황</b><span>고른 기구 문항만 뜸</span></div>
    ${kitPicker(x)}
    <div class="row sstick"><button class="btn" data-act="closeSheet">닫기</button></div></div>`;
// 불량 창을 다시 그리기 전에 적던 글을 담아 둔다 (사진 찍기·사정 고르기가 창을 다시 그린다)
// 점검 기간 창의 날짜 칸 값을 담아 둔다 (다시 그리면 칸이 새로 만들어진다)
function perMark() {
  const v = UI.sheet.k;
  document.querySelectorAll('.sheet [data-act="perPick"]').forEach((b) => { const on = b.dataset.v === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  const c = $('.sheet .arow .achk'); if (c) c.innerHTML = v === 'self' ? I('check', 16) : '';
}
// 날짜 칸을 만지면 직접 고르기로
document.addEventListener('focusin', (e) => { if ((e.target.id === 'perFrom' || e.target.id === 'perTo') && UI.sheet && UI.sheet.k !== 'self') { UI.sheet.k = 'self'; perMark(); } });
document.addEventListener('change', (e) => { if (e.target.id === 'perFrom' || e.target.id === 'perTo') { perKeep(); if (UI.sheet.k !== 'self') { UI.sheet.k = 'self'; perMark(); } } });
function perKeep() { if ($('#perFrom') && $('#perFrom').value) UI.sheet.from = mdOf($('#perFrom').value); if ($('#perTo') && $('#perTo').value) UI.sheet.to = mdOf($('#perTo').value); }
function keepSheetText() { if ($('#memoIn')) UI.sheet.memo = $('#memoIn').value; }
const riskHint = (it) => { const t = it.text + (it.eq ? ' ' + it.eq : ''), o = [];
  RISK_HINT.forEach(([re, rs]) => { if (re.test(t)) rs.forEach((r) => { if (!o.includes(r)) o.push(r); }); });
  return o; };
function badSheet(s) {
  const it = ckDoc(s).items[UI.sheet.n];
  // 이 문항에 맞는 위험요인(과 이미 고른 것)만 먼저, 나머지는 접어 둔다 (2026-10-15 사용자 지시)
  const hint = riskHint(it);
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="mid">${esc(it.text)}</div>
    <div class="ans">${it.ref ? '불량 (아직 안 고쳐짐)' : '불량'}</div>
    ${it.ref ? `<div class="lbl">공장주에게 들은 사정 (안 골라도 돼요)</div>
      ${['큰 공사가 필요해요', '부품이나 업체를 기다려요', '이유를 몰라요'].map((r) => `<button class="pick${UI.sheet.reason === r ? ' on' : ''}" data-act="pickReason" data-v="${r}">${r}</button>`).join('')}` : ''}
    <div class="srh"><b>위험요인</b><span>${UI.sheet.auto && hint.length ? 'AI 추천 미리 선택 · 누르면 해제' : '여러 개 고를 수 있어요'}</span></div>
    ${riskPicker(UI.sheet.risks, hint)}
    <div class="lbl">위험요인 내용 (안 써도 돼요)</div>
    <textarea class="input" id="memoIn" placeholder="예: 바닥에 늘어진 전선 피복이 벗겨짐">${esc(UI.sheet.memo ?? it.memo ?? '')}</textarea>
    <div class="row sstick"><button class="btn ghost cxl" data-act="closeSheet">취소</button><button class="btn" data-act="saveBad">저장</button></div>
  </div>`;
}
/* ---------- G6 재점검 판정 (2026-10-13 사용자 결정) ----------
   점검 2주 안에 공장주가 보낸 사진을 보고 항목마다 고쳐짐 · 안 고쳐짐을 정하고 결과(점검완료 · 패트롤 · 기타)를 고른다.
   2026-10-26부터 판정 화면은 개선 관리 정리 화면과 한 화면이다(sendScreen) — 개선여부 개선완료면 고쳐짐, 나머지는 안 고쳐짐.
   안 고쳐짐으로 남은 항목은 다음 점검의 지난번 미흡으로 붙는다 */
const rckFix = (it) => [...(it.log || [])].reverse().find((l) => l.t === 'fix');  // 공장주가 마지막으로 보낸 "고쳤어요"
// 시제품에는 진짜 사진이 없어 자리 그림으로 대신한다 — 고치기 전은 분전반 앞에 상자가 쌓인 모양, 고친 뒤는 치운 모양(같은 자리)
function phArt(v, p = 0) {  // p: 몇 번째 사진인지 — 같은 그림을 다르게 잘라 보인다(PIC_VIEW)
  const box = v === 'before' ? '<rect x="22" y="44" width="18" height="14" rx="1.5" fill="#c7a77a"/><rect x="38" y="48" width="16" height="10" rx="1.5" fill="#b8956a"/><rect x="28" y="34" width="14" height="11" rx="1.5" fill="#d4b68b"/>'
    : '<path d="M14 58h52" stroke="#e8c33a" stroke-width="2" stroke-dasharray="4 3"/>';
  return `<svg class="rphart" viewBox="${PIC_VIEW[p]}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="80" height="60" fill="#dfe4ea"/><rect y="46" width="80" height="14" fill="#c9cfd8"/>
    <rect x="30" y="10" width="22" height="30" rx="2" fill="#9aa6b6"/><rect x="33" y="13" width="16" height="12" rx="1" fill="#b7c0cc"/><circle cx="41" cy="31" r="2" fill="#e05a4a"/>${box}</svg>`;
}
// 고치기 전 사진 — 현장점검 개선사항에서 온 항목은 찍은 사진(photos), 체크리스트 불량은 자리 그림 (2026-10-26)
const beforeArt = (it, p = 0) => (it.photos && it.photos[p] ? `<img class="rphart rphimg" src="${it.photos[p].src}" alt="" decoding="async">` : phArt('before', p));
/* ---------- 개선 관리 · 공장에 보내기 (2026-10-26 사용자 지시 — 초안) ----------
   점검 결과를 낸 뒤 현장점검 개선사항을 한 화면에서 정리해 [공장에 전송]한다. 보내면 공장 웹 "기록 · 고칠 것"에 뜨고 시정 중이 된다.
   시정 중에도 같은 화면에서 다시 보고 고친다(같은 날 사용자 지시). 공장이 고친 사진을 보내면 판정 필요 — 판정도 같은 화면에서
   개선 후 사진을 보고 개선여부를 정한 뒤 점검 결과를 골라 저장한다(옛 판정 화면 rckScreen을 걷었다) */
const afterArt = (it, p = 0) => `<img class="rphart rphimg" src="${it.after[p].src}" alt="" decoding="async">`;
// 개선여부 — 종이 10번 그대로. 처음은 개선 중 (2026-10-26 사용자 지시)
const KZ_ST = [['ok', '개선완료', 'ok'], ['ing', '개선 중', 'amid'], ['no', '미개선', 'bad'], ['etc', '기타', 'na']];
const kzWord = (it) => KZ_ST.find(([k]) => k === (it.st || 'ing'))[1];
const kzIns = (s, id) => s.inspections.find((i) => i.id === id);
const kzItem = (s, id) => { const ins = kzIns(s, UI.kzIns); return ins && ins.items.find((x) => x.id === id); };
// 정리 화면 — 현장점검 탭과 같은 꼴: 위 요약 칸, 접힌 줄(사진 · 개선여부 · 지도유형), 누른 줄만 남색 머리로 펼친다.
// 펼친 줄은 종이 10번 칸 그대로 — 개선 전 · 개선 후 사진을 좌우로 크게(3:4, 사용자 시안 B), 개선여부, 지도유형(유해위험요인), 개선 전 · 개선 후 내용.
// 현장에서 바로 고친 건은 지킴이가 개선 후 사진을 찍고 개선완료로 둔다. 다 개선완료면 [공장에 전송] 대신 [개선완료로 저장] (2026-10-26 사용자 지시)
// 개선사항 줄 — 위 요약 칸 + 접힌 줄 · 펼친 줄 하나. 정리 · 시정 중 · 판정 화면과 제출 전 확인 개선사항 탭(mode 'sub')이 같이 쓴다 (2026-10-26 저녁 sendScreen에서 뗌)
function kzRows(ins, mode) {
  const fs = kzList(ins);
  const on = fs.find((x) => x.id === UI.kzOn) || (mode === 'judge' && toFix(ins).find((x) => rckFix(x))) || fs[0];
  const nOk = fs.filter((x) => x.st === 'ok').length, allOk = fs.length && nOk === fs.length;
  const cnt = [['개선사항', fs.length], [mode === 'sub' ? '미개선' : '개선 중', fs.length - nOk], ['개선완료', nOk]];
  const sum = `<div class="gfsum">${cnt.map(([w, n]) => `<div><span>${w}</span><b>${n}</b></div>`).join('')}</div>`;
  const mini = miniBar(cnt);
  const thumb = (x) => ((x.photos || []).length ? `<img class="gshart" src="${x.photos[0].src}" alt="" decoding="async">` : I('camera', 22));
  const tile = (x, side) => { const l = side === 'after' ? x.after || [] : x.photos || [], w = side === 'after' ? '개선 후' : '개선 전', fx = rckFix(x);
    if (side === 'before' && !l.length && x.shot) return `<span class="kzpt">${beforeArt(x)}<em class="before">${w}</em></span>`;  // 옛 기록 — 자리 그림
    if (side === 'after' && !l.length && fx && fx.photo) return `<span class="kzpt">${phArt('after')}<em class="after">${w}</em></span>`;  // 공장 [고쳤어요]의 사진(시제품은 자리 그림)
    return l.length ? `<span class="kzpt">${side === 'after' ? afterArt(x) : beforeArt(x)}<em class="${side}">${w}</em>${l.length > 1 ? `<b>${I('image', 14)}+${l.length - 1}</b>` : ''}</span>`
      : `<span class="kzpt wait"><span>${I('camera', 30)}${side === 'before' ? '사진 없음' : x.st === 'ok' ? '개선 후 사진 없음<br>현장에서 고쳤으면 추가' : '개선 후 사진<br>공장이 보내면 여기에'}</span></span>`; };
  const row = (x) => (x !== on ? `<button class="gfr" data-act="kzOn" data-id="${x.id}"><span class="gfrt">${thumb(x)}</span>
      <span class="gfrb"><b>${kzName(ins, x)}</b><span class="gfrs">${mode === 'judge' && rckFix(x) && x.st !== 'ok' ? '<em class="kzw got">사진 옴</em> · ' : ''}<em class="kzw ${x.st || 'ing'}">${kzWord(x)}</em>${(x.risks || []).length ? ` · ${x.risks.map(esc).join(', ')}` : ''}</span></span>
      <span class="gfrc">${I('camera', 14)}${(x.photos || []).length + (x.after || []).length}</span></button>`
    : `<section class="gfr on"><div class="gfrh"><b>${kzName(ins, x)}</b><span class="gfrn">${kzWord(x)}</span></div>
      <div class="kzpair">${tile(x, 'before')}${tile(x, 'after')}</div>
      ${rckFix(x) ? kzFx(x) : ''}
      <div class="kzadd"><button class="gfpmore" data-act="kzGal" data-id="${x.id}" data-v="before">${I('image', 17)}개선 전 추가</button><button class="gfpmore" data-act="kzGal" data-id="${x.id}" data-v="after">${I('image', 17)}개선 후 추가</button></div>
      <div class="gfrk"><div class="gfrkh"><b>개선여부</b></div><div class="cans c4 kzst">${KZ_ST.map(([k, w, c]) => `<button class="${(x.st || 'ing') === k ? 'on ' + c : ''}" data-act="kzSt" data-id="${x.id}" data-v="${k}" aria-pressed="${(x.st || 'ing') === k}">${w}</button>`).join('')}</div></div>
      <div class="gfrk"><div class="gfrkh"><b>지도유형 (유해위험요인)</b></div>
        <div class="gfchips">${(x.risks || []).map((r) => `<span class="gfchip"><i>${RISKS.indexOf(r) + 1}</i>${r}<button data-act="kzRiskDel" data-id="${x.id}" data-v="${r}" aria-label="${r} 빼기">${I('close', 15)}</button></span>`).join('')}
        <button class="gfchip gfplus" data-act="kzRiskOpen" data-id="${x.id}">${I('plus', 15)}추가</button></div></div>
      <div class="gfrk"><div class="gfrkh"><b>개선 전 내용</b></div><textarea class="gftxa" data-tx="kzpre:${x.id}" placeholder="여기에 개선 전 내용 입력">${esc(txVal('kzpre:' + x.id, x.memo))}</textarea></div>
      <div class="gfrk"><div class="gfrkh"><b>개선 후 내용</b></div><textarea class="gftxa" data-tx="kzpost:${x.id}" placeholder="여기에 개선 후 내용 입력">${esc(txVal('kzpost:' + x.id, x.post))}</textarea></div>
    </section>`);
  return `${sum}${mini}<div class="gfrs0">${fs.map(row).join('')}</div>`;
}
// 요약 칸 작은 줄 — 바로 위 요약 칸(.gfsum)이 머리 밑으로 지나가면 머리 바로 아래 작은 한 줄로 같은 수, 머리의 "› 공장 판정"처럼
// (2026-10-27 사용자 지시 — 개선 관리. 같은 날 체크리스트 양호 · 불량 · 해당 없음도). 높이 0이라 자리를 안 차지한다 — 부모 틈 하나는 위 여백으로 되돌린다
const miniBar = (cells) => `<div class="kzmini" aria-hidden="true"><div>${cells.map(([w, n, c]) => `<span${c ? ` class="${c}"` : ''}>${w}<b>${n}</b></span>`).join('')}</div></div>`;
function kzMiniCheck() {
  const m = $('.kzmini'), sum = m && m.previousElementSibling, top = $('.apptop'); if (!m || !sum || !top) return;
  m.style.top = top.offsetHeight + 'px'; m.style.marginTop = -(parseFloat(getComputedStyle(m.parentElement).rowGap) || 0) + 'px';
  m.classList.toggle('on', sum.getBoundingClientRect().bottom <= top.getBoundingClientRect().bottom + 2);
}
document.addEventListener('scroll', kzMiniCheck, { capture: true, passive: true });
function sendScreen(s, id) {
  const ins = kzIns(s, id);
  if (!ins || !(toSend(ins) || inRecheck(ins))) { R.go('todo'); return ''; }
  if (UI.kzIns !== id) { UI.kzIns = id; UI.kzOn = null; UI.kzRes = null; }
  // 화면 셋 — 보낼 것(send) · 시정 중(fix) · 판정 필요(judge). 옛 기록은 체크리스트 불량이 공장에 갔다 — 그것도 같은 줄로 보인다
  const mode = toSend(ins) ? 'send' : toJudge(ins) ? 'judge' : 'fix';  // 기한이 지나면 사진이 없어도 판정 (2026-10-26)
  const f = FACTORIES[ins.fid], fs = kzList(ins);
  const nOk = fs.filter((x) => x.st === 'ok').length, allOk = fs.length && nOk === fs.length;
  return `${sbar(f.name)}<div class="scr"><div class="bd" style="gap:10px">
    ${head(`${f.name} ${{ send: '개선 관리', fix: '시정 중', judge: '판정' }[mode]}`, 'todo')}
    ${ltitle(f.name)}
    <div class="tdgt">${[['점검일', `${ins.date} ${ins.by === ME ? `${ins.by} (나)` : esc(ins.by)}`], mode !== 'send' && ['보낸 날', ins.toFac || ins.date],  // "공장에 보냄" → 보낸 날 (2026-10-26 사용자 지시)
      // 시정 기한 — 알약 대신 글자 (같은 날 사용자: AI스럽다). 남은 날은 남색, 지나면 빨강
      ['시정 기한', mode === 'send' ? (allOk ? '없음 (모두 개선완료)' : '보낸 날부터 2주') : `~${recheckDue(ins)}<span class="kzdl${daysLeft(recheckDue(ins)) < 0 ? ' warn' : ''}">${dWord(daysLeft(recheckDue(ins)))}</span>`]]
      .filter(Boolean).map(([k, v]) => `<div><em>${k}</em><b>${v}</b></div>`).join('')}</div>
    ${kzRows(ins, mode)}
    ${mode === 'judge' ? `<div class="gfrk kzres"><div class="gfrkh"><b>점검 결과</b></div><div class="seg">${FINAL_RESULTS.map((r) => `<button class="${UI.kzRes === r ? 'on' : ''}" data-act="kzRes" data-v="${r}">${r}</button>`).join('')}</div></div>` : ''}
  </div><div class="ft">${mode === 'judge' ? `<button class="btn${UI.kzRes ? '' : ' glocked'}" data-act="kzJudge" data-id="${id}">판정 저장</button>`
    : `<button class="btn" data-act="sendFac" data-id="${id}">${allOk ? '개선완료로 저장' : mode === 'fix' ? '저장' : '공장에 전송'}</button>`}</div></div>
  ${UI.sheet && UI.sheet.type === 'kzrisk' ? kzRiskSheet(s) : ''}`;
}
// 공장주 회신 — 공장이 [고쳤어요]로 보낸 날 · 고친 내용 · 사진 수. 한 줄로 이어 쓰지 않고 접어 두었다가 누르면 표로 펼친다 (2026-10-26 사용자 지시).
// 펼치고 접을 때 아코디언처럼 미끄러진다(같은 날 사용자 지시) — 표는 늘 그려 두고 칸 높이만 바꾼다(.kzfxw), 누를 때는 다시 그리지 않고 칸 class만 바꾼다(ACTS.kzFx)
function kzFx(x) {
  const fx = rckFix(x), open = !!(UI.kzFx || {})[x.id];
  return `<div class="kzfx${open ? ' on' : ''}" data-id="${x.id}"><button class="kzfxh" data-act="kzFx" data-id="${x.id}" aria-expanded="${open}"><b>공장주 회신</b><span>${fx.at} 도착</span>${I('chevron', 16)}</button>
    <div class="kzfxw"><div><div class="kzfxb"><div><em>보낸 날</em><b>${fx.at}${fx.tm ? ` ${fx.tm}` : ''}</b></div><div><em>고친 내용</em><b${fx.note ? '' : ' class="soft"'}>${fx.note ? esc(fx.note) : '적지 않음'}</b></div>
      <div><em>사진</em><b${fx.photo ? '' : ' class="soft"'}>${fx.photo ? `${fx.n || 1}장` : '없음'}</b></div></div></div></div></div>`;
}
// 지도유형 고르기 — 현장점검 위험요인 창과 같은 꼴
function kzRiskSheet(s) {
  const it = kzItem(s, UI.sheet.id); if (!it) return '';
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="srh"><b>${kzName(kzIns(s, UI.kzIns), it)} 지도유형</b><span>여러 개 고를 수 있어요</span></div>
    ${riskPicker(UI.sheet.risks)}
    <div class="row sstick"><button class="btn ghost cxl" data-act="closeSheet">취소</button><button class="btn" data-act="kzRiskSave">저장</button></div>
  </div>`;
}
// 개선 관리 사진 넣기 — 사진첩에서 고른 사진(galOpen)
function kzPut(k, p) {
  DB.act((s) => { const ins = s.inspections.find((i) => i.id === k.ins), it = ins && ins.items.find((x) => x.id === k.it); if (!it) return;
    const key = k.side === 'after' ? 'after' : 'photos';
    it[key] = [...(it[key] || []), p].slice(0, FIND_MAX);
    if (key === 'photos') { it.pics = it.photos.map((_, j) => j); it.shot = true; } });
}
/* ---------- 개선 관리 · 제출할 것 → 제출 전 확인 (2026-10-26 저녁 사용자 지시) ----------
   판정이 끝났거나 개선사항이 없던 점검의 마지막 단계. 기존 웹에서 사무실에 와서 쓰던 개선을 위한 조언(종이 8번 종합평가결과)을 적고 [제출].
   처음엔 한 화면 쭉(시안 A)이었는데 같은 날 사용자 지시로 **점검하기 · 개선 관리 화면을 합친 꼴** — 위 탭 넷
   사전점검 | 분야별 안전점검 | 개선사항 | 제출, 아래 [제출]은 늘 보인다. 앞 셋은 점검 중 · 개선 관리에서 보던 화면 그대로(ckDoc로 이 점검을 고친다),
   현장점검과 개선 관리는 같은 개선사항이라 탭 하나. 조언 앞 코드는 기업 구분(일반 · WOW · BOB) + 판 번호 직접 입력(뜻은 아직 모름).
   운영자 검사는 없다 — 제출하면 바로 확정 */
const ADV_CLS = ['일반', 'WOW', 'BOB'];
const advOf = (ins) => ({ cls: '일반', ver: '', text: '', ...(ins.adv || {}) });  // 기업 구분은 일반이 기본 (내 판단 — 대부분 일반)
const advCode = (a) => [a.cls, a.ver].filter(Boolean).join(' ');
const SUB_TABS = [['meet', '사전점검'], ['ck', '분야별 안전점검'], ['kz', '개선사항'], ['end', '제출']];
// 제출 전 확인 줄 — [맞나, 글, 고치러 갈 탭]
function subCheck(ins) {
  const ck = ins.items.filter((x) => x.src !== 'find' && !x.ref), a = advOf(ins);
  const none = ck.filter((x) => !x.answer).length;
  // 체크리스트 불량 수와 개선사항 수는 맞추지 않는다 — 체크리스트에 없는 개선사항도 있어 둘은 따로다 (2026-10-27 사용자 지시)
  return [[!none, none ? `답 없는 문항 ${none}개` : '답 없는 문항 없음', 'ck'],
    [!!a.text.trim(), a.text.trim() ? '개선을 위한 조언 씀' : '개선을 위한 조언 안 씀', '']];
}
// 개선사항 옛 기록(체크리스트 불량이 공장에 간 것)은 체크리스트에서 답을 못 바꾼다 — 개선사항 탭의 개선여부로
const ckLock = (n) => { const d = ckDoc(); if (!d || d === DB.s.draft) return false; const it = d.items[n];
  if (it && kzList(d).includes(it)) { toast('개선사항 탭에서 개선여부로 정해요'); return true; } return false; };
function subScreen(s, id, tab) {
  const ins = kzIns(s, id);
  if (!ins || !toSub(ins)) { R.go('todo'); return ''; }
  if (UI.kzIns !== id) { UI.kzIns = id; UI.kzOn = null; UI.kzRes = null; }
  tab = SUB_TABS.some(([k]) => k === tab) ? tab : 'meet';
  const f = FACTORIES[ins.fid], x = firmOf(s, ins.fid), fs = kzList(ins), a = advOf(ins), can = !!a.text.trim();
  const tabs = `<div class="gtabs gins sbtabs" role="tablist">${SUB_TABS.map(([k, w]) => `<button class="gtab${tab === k ? ' on' : ''}" role="tab" aria-selected="${tab === k}" data-go="sub/${id}/${k}">${w}</button>`).join('')}</div>`;
  const cph = (t) => `<div class="cph"><b>${t}</b></div>`;
  let body;
  // 사전점검 — 점검 중 다섯 단계(종이 1~7번 · 01)를 한 쪽에 차례로
  if (tab === 'meet') body = paperTable(s, ins.fid, [1, 2, 3, 4, 5]) + cph('6. 유해위험기구 보유현황') + kitPicker(x) + cph('7. 위험물질/유해화학물질 취급여부') + chemPicker(x)
    + cph('01 산업안전 일반') + `<div class="clist">${ins.items.map((y, i) => [y, i]).filter(([y]) => y.area === 'a1').map(([y, i], j) => ckRow(ins, y, i, j + 1)).join('')}</div>`;
  // 분야별 안전점검 — 점검 중 체크리스트 탭과 같은 줄(답 넷 · 평가 내용 · 점검 포인트), 위에 답 수
  else if (tab === 'ck') { const shown = ckShown(s, ins), vis = ins.items.filter(shown), n = (v) => vis.filter((y) => y.answer === v).length;
    body = `<div class="gfsum ivsum">${ANS_ORDER.filter((v) => n(v) || v !== 'mid').map((v) => `<div class="${ansCls(v)}"><span>${ANS[v]}</span><b>${n(v)}</b></div>`).join('')}</div>${miniBar(ANS_ORDER.filter((v) => n(v) || v !== 'mid').map((v) => [ANS[v], n(v), ansCls(v)]))}${ckSecs(s, ins, shown)}`; }
  // 개선사항 — 개선 관리 정리 화면과 같은 줄(개선 전 | 개선 후 사진, 개선여부, 지도유형, 내용)
  else if (tab === 'kz') body = fs.length ? kzRows(ins, 'sub') : `<div class="cknone">${I('checkCircle', 30)}<b>개선사항 없음</b><span>현장점검에서 찍은 개선사항이 없던 점검</span></div>`;
  else {
    const ok = fs.filter((it) => itemState(it) === 'fixed').length;
    const top = [['점검일', `${ins.date} ${ins.by === ME ? `${ins.by} (나)` : esc(ins.by)}`], ['점검 결과', ins.result || RESULTS[0]],
      ...(fs.length ? [['개선완료', `${ok}건`], ['미개선', `${fs.length - ok}건`]] : [['개선사항', '없음']])];
    body = `<div class="tdgt">${top.map(([k, v]) => `<div><em>${k}</em><b>${v}</b></div>`).join('')}</div>
    <section class="sbc"><div class="sbh"><b>개선을 위한 조언</b></div>
      <div class="sbl">기업 구분</div><div class="seg">${ADV_CLS.map((c) => `<button class="${a.cls === c ? 'on' : ''}" data-act="advCls" data-id="${id}" data-v="${c}" aria-pressed="${a.cls === c}">${c}</button>`).join('')}</div>
      <label class="sbver"><span class="sbl">판 번호</span><input class="input" id="advVer" data-tx="advver:${id}" value="${esc(txVal('advver:' + id, a.ver))}" placeholder="예: 26ver01" autocomplete="off"></label>
      <div class="sbl">조언<span class="sbcode" id="advCode">${esc(advCode({ ...a, ver: txVal('advver:' + id, a.ver) }))}</span></div>
      <textarea class="gftxa" id="advTx" data-tx="advtx:${id}" placeholder="여기에 개선을 위한 조언 입력">${esc(txVal('advtx:' + id, a.text))}</textarea></section>
    <section class="sbc"><div class="sbh"><b>제출 전 확인</b></div>
      <div class="sbck">${subCheck(ins).map(([y, w, t]) => (!y && t ? `<button class="n" data-go="sub/${id}/${t}"><i>${I('alert', 15)}</i>${w}${I('chevron', 16)}</button>`
        : `<div class="${y ? 'y' : 'n'}"><i>${I(y ? 'check' : 'alert', 15)}</i>${w}</div>`)).join('')}</div></section>`;
  }
  // 쪽 맨 아래 다음 탭으로 — 끝까지 내려 본 뒤 다시 위로 올라가 탭을 누르지 않게 (같은 날 사용자 지시). 주 단추 [제출]과 헷갈리지 않게 보조 단추
  const ti = SUB_TABS.findIndex(([k]) => k === tab), nx = SUB_TABS[ti + 1];
  const next = nx ? `<button class="btn ghost cnext sbnext" data-go="sub/${id}/${nx[0]}"><span class="cnl">다음: ${nx[1]}</span>${I('chevron', 18)}</button>` : '';
  return `${sbar(f.name)}<div class="scr"><div class="bd" style="gap:10px">
    ${head(`${f.name} 제출 전 확인`, 'todo')}
    ${ltitle(f.name)}
    ${tabs}
    ${body}
    ${next}
  </div><div class="ft"><button class="btn${can ? '' : ' glocked'}" data-act="subGo" data-id="${id}">${can ? '' : I('lock', 17) + ' '}제출</button></div></div>
  ${UI.sheet && UI.sheet.type === 'bad' ? badSheet(s) : ''}${UI.sheet && UI.sheet.type === 'kit' ? kitSheet(x) : ''}${UI.sheet && UI.sheet.type === 'kitEtc' ? kitEtcSheet(x) : ''}${UI.sheet && UI.sheet.type === 'kzrisk' ? kzRiskSheet(s) : ''}${UI.shot ? shotViewer() : ''}`;
}
/* ---------- 낸 뒤 ---------- */
// 낸 뒤 — AI 기다리기처럼 머리글을 달고 가운데로 모은다 (2026-09-28 사용자 지시). 막 냈을 때만 표시가 튀어나오고 체크가 그려진다
function sent(s, kind, fid) {
  const wait = unsentN(s), first = kind === 'first', sub = kind === 'sub', f = FACTORIES[fid], fresh = UI.sentFresh;  // sub — 개선 관리 최종 제출 (2026-10-27 사용자 지시, 같은 낸 뒤 화면)
  const ns = first && !wait && s.inspections.find((i) => i.fid === fid && toSend(i) && TEAM.members.includes(i.by));  // 공장에 보내기 전 (10-26 개선 관리)
  const nb = !ns && !wait && !sub && s.inspections.find((i) => i.fid === fid && toSub(i) && TEAM.members.includes(i.by));  // 제출 전 — 개선사항이 없었거나 판정이 끝남 (같은 날 저녁)
  if (fresh) setTimeout(() => { UI.sentFresh = false; }, 50);
  return `${sbar(s.net.guard ? '지킴이' : '📶 전파 없음')}<div class="scr"><div class="bd">${head(f ? f.name + (sub ? ' 제출' : kind === 'recheck' ? ' 재점검' : ' 점검') : '점검 결과', '')}
    <div class="gaiw gsent${fresh ? ' fresh' : ''}" role="status">
      <div class="gdmark${wait ? ' wait' : ''}"><i></i><span>${wait ? I('clock', 40) : I('check', 44)}</span></div>
      <div class="center big">${wait ? '휴대폰에 저장됐어요' : sub ? '제출했어요' : '올라갔어요'}</div>
      <div class="center small ink">${wait ? '전파가 없어요. <b>연결되면 저절로 올라가요.</b><br>앱을 지우거나 로그아웃하지 마세요.'
        : ns ? `개선사항 ${ns.items.filter(TRACKED).length}건은 아직 공장에 안 감<br>개선 관리에서 정리해 보내 주세요`
        : nb ? '아직 제출 전<br>개선을 위한 조언을 적어 제출해 주세요' : sub ? '점검 확정<br>공장주와 운영자가 지금 볼 수 있어요.' : '공장주와 운영자가 지금 볼 수 있어요.'}</div>
    </div>
  </div><div class="ft">${ns ? `<button class="btn" data-go="send/${ns.id}">개선 관리로</button><button class="btn ghost" data-go="">홈으로</button>`
    : nb ? `<button class="btn" data-go="sub/${nb.id}">조언 쓰고 제출</button><button class="btn ghost" data-go="">홈으로</button>`
    : sub && s.inspections.some((i) => toSub(i) && TEAM.members.includes(i.by)) ? '<button class="btn" data-go="todo">제출할 것으로</button><button class="btn ghost" data-go="">홈으로</button>' : '<button class="btn" data-go="">홈으로</button>'}</div></div>`;
}

// 불량 항목 하나의 재점검 판정 (마지막 것)
const rckWord = (x) => { const l = [...(x.log || [])].reverse().find((y) => y.t === 'recheck'); return l ? `재점검(${l.at}): ${l.result === 'fixed' ? '고쳐짐' : '안 고쳐짐'}` : ''; };
// 점검 기록에 붙는 재점검 줄 (2026-10-13) — 진행 중이면 기한, 끝났으면 판정한 날과 고쳐진 수
const rckRows = (i) => (inRecheck(i) ? [['시정 기한', `${recheckDue(i)}까지 ${tg(dWord(daysLeft(recheckDue(i))), daysLeft(recheckDue(i)) < 0 ? 'warn' : 'now')}`]]
  : i.final ? [['재점검', `${i.final.at} ${i.final.by}<br>고쳐짐 ${i.final.total}개 중 ${i.final.fixed}개`]] : []);
// 점검 기록 카드 하나 — 점검일 · 결과 · 항목 · 문제 · 처리 상태 (공장별 기록에선 점검자를, 전체 기록에선 공장 이름을 제목으로)
function recCard(i, byFac, from = '') {
  const bad = i.items.filter((x) => x.answer === 'bad');
  // 문제 항목의 처리 상태를 상태마다 세어 보인다 (항목마다 한 줄씩 쓰면 같은 말이 되풀이된다)
  const word = { todo: '고침 기다림', claimed: inRecheck(i) ? '재점검 기다림' : '다음 점검 때 확인', fixed: '고쳐짐', back: '다시 공장주에게' };
  const cnt = bad.reduce((m, x) => { const w = word[itemState(x)]; m[w] = (m[w] || 0) + 1; return m; }, {});
  const how = Object.entries(cnt).map(([w, n]) => `${w} ${n}개`).join('<br>');
  const mine = i.by === ME;
  return `<div class="q"><div class="rowx"><span class="t">${byFac ? `${i.date} 점검` : FACTORIES[i.fid].name}</span></div>
    ${kv([!byFac && ['점검일', i.date], byFac && ['점검자', mine ? `${i.by} (나)` : i.by], ['결과', `${i.result || RESULTS[0]}${i.ver ? ' ' + tg(i.ver) : ''}`], ['항목', `${i.items.length}개`], ['불량', `${bad.length}개`], how && ['처리', how], ...rckRows(i)])}
    ${(inRecheck(i) || toSend(i)) && TEAM.members.includes(i.by) ? `<button class="btn ghost sm" data-go="send/${i.id}">개선 관리</button>` : ''}
    <button class="ginsp" data-go="insp/${i.id}${from ? '/' + from : ''}">${I('list', 16)} 점검 내용 보기 ${I('chevron', 16)}</button></div>`;
}
// 낸 점검 다시 보기 — 그때 답한 체크리스트를 그대로, 고칠 수 없게 (2026-09-22 사용자 지시)
// 누를 단추를 두지 않고 답은 꼬리표 하나로 보인다. 묶음은 점검할 때와 같게(영역·출처마다)
function inspView(s, id, from) {
  const i = s.inspections.find((x) => x.id === id);
  if (!i) return records(s);
  const f = FACTORIES[i.fid], n = (v) => i.items.filter((x) => x.answer === v).length;
  // 제출 전이면 고칠 곳(제출 전 확인)으로 가는 줄 (2026-10-26 저녁 — 그 전엔 낸 점검은 고칠 수 없었다)
  const pend = i.sub === false && TEAM.members.includes(i.by);
  // 묶음마다 흰 칸 하나에 줄로 — 왼쪽 색 띠·옅은 바탕 대신 오른쪽 답 글자와 아이콘으로 (2026-09-22 사용자: 색 띠가 너무 AI스럽다)
  const groups = [];
  i.items.forEach((x, k) => {
    const g = gkey(x) || 'base';
    if (!groups.length || groups[groups.length - 1].g !== g) groups.push({ g, l: [] });
    groups[groups.length - 1].l.push([x, k]);
  });
  // 답은 네모 꼬리표 글자만 — 양호 초록 테두리, 불량 빨강 채움, 해당 없음 회색 (2026-10-26 사용자 지시 — 알아보기 쉽게, 아이콘 · 옅은 글자를 뺐다)
  // 현장점검 개선사항은 찍은 사진을 줄 아래 작은 칸으로 보이고 누르면 크게 (같은 날 사용자 지시). 개선 후 사진이 있으면 그 줄도
  const phs = (x, side) => { const l = side === 'after' ? x.after || [] : x.photos || [];
    return l.length ? `<div class="ivph"><span>${side === 'after' ? '개선 후' : '개선 전'}</span><div>${l.map((ph, j) => `<button class="ivp" data-act="ivPh" data-id="${x.id}" data-v="${side}:${j}" aria-label="${side === 'after' ? '개선 후' : '개선 전'} 사진 ${j + 1} 크게"><img src="${ph.src}" alt="" decoding="async"></button>`).join('')}</div></div>` : ''; };
  // 현장점검 개선사항 묶음은 크게 — 제목 · 줄 글씨를 키우고 사진은 줄 폭을 다 쓰는 두 칸 (같은 날 사용자: 너무 작다)
  const rows = groups.map(({ g, l }) => { const big = l.every(([x]) => x.src === 'find') ? ' ivf' : '';
    return `<div class="grp${big}">${gname(g) || '점검 항목'}<span class="must">${l.length}개</span></div>
    <div class="rlist${big}">${l.map(([x, k]) => {
      const a = x.answer || '', real = (x.photos || []).length > 0;
      const sub = [x.ref && x.reason ? `안 고쳐진 사정: ${esc(x.reason)}` : '', (x.risks || []).length ? `위험요인: ${x.risks.map(esc).join(', ')}` : '', x.memo ? `${x.src === 'find' ? '개선 전 내용' : '위험요인 내용'}: ${esc(x.memo)}` : '', x.shot && !real ? `사진 ${picsOf(x).length}장` : '', x.eval ? `평가 내용: ${esc(x.eval)}` : '', rckWord(x)].filter(Boolean).join('<br>');
      const ph = phs(x, 'before') + phs(x, 'after');
      return `<div class="vrow"><span class="rno">${k + 1}</span><div class="rtx"><div class="t">${esc(x.text)}</div>${sub ? `<small>${sub}</small>` : ''}</div><span class="rans ${ansCls(a)}">${ANS[a] || '답 없음'}</span>${ph ? `<div class="ivphs">${ph}</div>` : ''}</div>`;
    }).join('')}</div>`; }).join('');
  // 머리 — 기업 이름 큰 제목 + 할 일 카드와 같은 줄 표 (같은 날 사용자 지시 — 개선 관리 화면과 같게). 시정 기한은 알약 없이 글자
  const due = inRecheck(i) && recheckDue(i), dn = due && daysLeft(due);
  const top = [['점검일', i.date], ['점검자', i.by === ME ? `${i.by} (나)` : esc(i.by)], ['결과', `${i.result || RESULTS[0]}${i.ver ? `<span class="ivver">${i.ver}</span>` : ''}`],
    due && ['시정 기한', `~${due}<span class="kzdl${dn < 0 ? ' warn' : ''}">${dWord(dn)}</span>`], i.final && ['재점검', `${i.final.at} ${esc(i.final.by)}<br>고쳐짐 ${i.final.total}개 중 ${i.final.fixed}개`],
    i.sub && ['제출', `${i.sub.at} ${esc(i.sub.by)}`]].filter(Boolean);
  // 제출한 개선을 위한 조언 — 코드 + 글 (같은 날 저녁)
  const adv = i.sub && i.adv ? `<section class="sbc"><div class="sbh"><b>개선을 위한 조언</b>${advCode(i.adv) ? `<span class="sbcode">${esc(advCode(i.adv))}</span>` : ''}</div><p class="sbtx">${esc(i.adv.text)}</p></section>` : '';
  return `${sbar(f.name)}<div class="scr"><div class="bd" style="gap:8px">
    ${head(`${f.name} 점검 내용`, from === 'sub' ? `sub/${id}` : `records/${i.fid}${from ? '/' + from : ''}`)}
    ${ltitle(f.name)}
    ${pend && toSub(i) ? `<button class="glock ivedit" data-go="sub/${id}">${I('pen', 16)} 제출 전, 제출 전 확인에서 고치기${I('chevron', 16)}</button>`
      : pend ? `<div class="glock">${I('clock', 16)} 제출 전, 판정 뒤 제출 전 확인에서 고침</div>` : `<div class="glock">${I('lock', 16)} 제출한 점검이라 고칠 수 없음</div>`}
    <div class="tdgt">${top.map(([k, v]) => `<div><em>${k}</em><b>${v}</b></div>`).join('')}</div>${adv}
    <div class="gfsum ivsum">${ANS_ORDER.filter((v) => n(v) || v !== 'mid').map((v) => `<div class="${ansCls(v)}"><span>${ANS[v]}</span><b>${n(v)}</b></div>`).join('')}</div>${miniBar(ANS_ORDER.filter((v) => n(v) || v !== 'mid').map((v) => [ANS[v], n(v), ansCls(v)]))}
    ${rows}
  </div></div>${UI.sheet && UI.sheet.type === 'ivph' ? ivPhSheet(i) : ''}`;
}
// 점검 내용 보기 사진 크게 — 누른 사진 한 장, 아래 ‹ › 로 그 줄의 사진을 넘긴다
function ivPhSheet(i) {
  const sh = UI.sheet, x = i.items.find((y) => y.id === sh.id); if (!x) return '';
  const l = sh.side === 'after' ? x.after || [] : x.photos || [], j = Math.min(sh.j, l.length - 1);
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet ivsheet"><div class="grip"></div>
    <div class="srh"><b>${esc(x.text)} ${sh.side === 'after' ? '개선 후' : '개선 전'}</b><span>${j + 1} / ${l.length}</span></div>
    <img src="${l[j].src}" alt="">
    <div class="row">${l.length > 1 ? `<button class="btn ghost" data-act="ivPhStep" data-v="-1"${j ? '' : ' disabled'}>${I('back', 18)} 앞 사진</button><button class="btn ghost" data-act="ivPhStep" data-v="1"${j < l.length - 1 ? '' : ' disabled'}>다음 사진</button>` : '<button class="btn ghost" data-act="closeSheet">닫기</button>'}</div></div>`;
}
// 한 공장의 점검 이력 — 우리 조가 그 공장에서 한 점검 전부, 최근 것부터 (2026-09-22 사용자 지시: 홈 "점검 결과 보기"와 공장 창에서 그 공장 것만)
const facInsp = (s, fid) => s.inspections.filter((i) => i.fid === fid && TEAM.members.includes(i.by));
function records(s, fid, from) {
  if (fid && FACTORIES[fid]) {
    const list = facInsp(s, fid), f = FACTORIES[fid];
    return `${sbar(f.name)}<div class="scr"><div class="bd">
      ${head(`${f.name} 점검 결과`, from === 'pre' ? `pre/${fid}` : '')}
      ${list.map((i) => recCard(i, true, from)).join('') || '<div class="cnone">아직 이 공장 점검 기록이 없어요</div>'}
      ${s.outbox.guard.filter((m) => m.data.fid === fid).map((m) => `<div class="q now"><div class="rowx"><span class="t">9/17 점검</span></div><div class="small">${I('clock', 14)} 휴대폰에 저장됨<br>전파가 잡히면 올라가요</div></div>`).join('')}
    </div></div>`;
  }
  const mine = s.inspections.filter((i) => i.by === ME);
  return `${sbar('지킴이')}<div class="scr"><div class="bd">
    ${head('내 점검 기록')}${pageIntro('내 점검 기록')}
    ${mine.map((i) => recCard(i, false)).join('')}
    ${s.outbox.guard.map((m) => `<div class="q now"><div class="rowx"><span class="t">${FACTORIES[m.data.fid].name}</span><span class="small">9/17</span></div><div class="small">${I('clock', 14)} 휴대폰에 저장됨<br>전파가 잡히면 올라가요</div></div>`).join('')}
  </div></div>`;
}
/* ---------- G9 주간 보고 (2026-09-22 — 기존 웹 "주간점검"의 칸을 따른다: 점검조·작성자·점검 기업 수·결과별 수) ----------
   2026-09-28 사용자 결정으로 칸을 늘렸다: 요약 숫자와 지난주 대비 → 요일별 점검 → 찾은 문제(테마별) → 처리 상태 → 앞으로 예정 → 특이 사항 칩
   2026-10-01 오전 사용자: 한눈에 안 들어온다 → 요약 + 이번 주 점검한 곳 목록 + 특이 사항만 남김.
   2026-10-01 오후 기존 웹 등록 양식을 캡처로 확인하고 그 칸 그대로 다시 그림 (사용자 승인, 260921_기존시스템_분석.md 8절):
   기본정보(점검조·권역·기간·기업수) → 점검기업리스트(결과별 개사 + 기업마다 점검번호·기업명·사업자번호·업종·점검일·결과보고·비고) → 중점점검항목(분야·항목·내용·비고).
   기존 웹은 전부 손으로 적지만 우리는 점검 기록에서 채운다 — 지킴이가 적는 것은 기업별 비고와 중점점검항목뿐.
   권역은 기존처럼 하나만 고르고 권역마다 따로 낸다 `가설`. 기업수는 목록의 기업 수로 채운다 `가설`. 중점점검항목이 이번 주 것인지 다음 주 계획인지는 모른다 `가설` */
// 앱 달력으로 9/17은 목요일이라 이번 주는 9/14(월)~9/18(금) (2026-09-28 바로잡음 — 전엔 9/15(월)로 하루 밀려 있었다).
// key는 저장된 보고를 찾는 이름이라 그대로 둔다. 권역마다 따로 내므로 `9/15 동탄`처럼 권역을 붙여 담는다
const WEEK = { key: '9/15', label: '9/14(월) ~ 9/18(금)', from: 914, to: 918 };
const wkKey = (a) => `${WEEK.key} ${a}`;
function weekCounts(s, area) {
  const ins = s.inspections.filter((i) => mdNum(i.date) >= WEEK.from && mdNum(i.date) <= WEEK.to && TEAM.members.includes(i.by) && FACTORIES[i.fid].area === area)
    .sort((a, b) => mdNum(a.date) - mdNum(b.date));
  const c = Object.fromEntries(RESULTS.map((r) => [r, ins.filter((i) => (i.result || RESULTS[0]) === r).length]));
  return { firms: new Set(ins.map((i) => i.fid)).size, c, ins };
}
// 고른 권역 — 안 골랐으면 점검한 곳이 있고 아직 안 낸 첫 권역
const wkArea = (s) => UI.wk.area || TEAM.areas.find((a) => weekCounts(s, a).ins.length && !(s.weekly || {})[wkKey(a)]) || TEAM.areas[0];
// 점검번호 — 기존 웹 점검코드(R + 날짜 6자리 + 글자 2 + 차례 3) 꼴을 흉내 낸 임시 번호. 가운데 글자 두 개의 뜻은 몰라서 뺐다
const insNo = (s, i) => { const [m, d] = i.date.split('/').map(Number); const k = s.inspections.filter((x) => x.date === i.date).indexOf(i) + 1;
  return `R26${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}${String(k).padStart(3, '0')}`; };
const WK_FIELDS = CHECKLIST.areas.map((a) => a.name);
const wkFocus = (a) => (UI.wk.focus[a] = UI.wk.focus[a] || [{ fld: '', item: '', txt: '', note: '' }]);
function weekly(s) {
  const area = wkArea(s), w = weekCounts(s, area), done = (s.weekly || {})[wkKey(area)];
  const notes = done ? done.notes || {} : UI.wk.note;
  const opts = TEAM.areas.map((a) => { const n = weekCounts(s, a).firms; return `<option value="${a}"${a === area ? ' selected' : ''}>${a} (${(s.weekly || {})[wkKey(a)] ? '냄' : `${n}곳`})</option>`; }).join('');
  const firm = (i) => { const f = FACTORIES[i.fid], note = notes[i.id] || '';
    return `<div class="q wkco"><div class="rowx"><b>${f.name}</b>${tg(i.result || RESULTS[0])}</div>
      <dl class="gkv wksm"><dt>점검일</dt><dd>${i.date}</dd><dt>업종</dt><dd>${esc(f.type)}</dd><dt>사업자번호</dt><dd>${firmOf(s, i.fid).biz}</dd><dt>점검번호</dt><dd>${insNo(s, i)}</dd>${done && note ? `<dt>비고</dt><dd>${esc(note)}</dd>` : ''}</dl>
      ${done ? ''
        : `<input class="input wkin" id="wkn-${i.id}" data-wk="note:${i.id}" value="${esc(note)}" placeholder="비고 (예: 공장주 부재로 다음 주 다시 감)" aria-label="${f.name} 비고">`}</div>`; };
  const focus = done ? done.focus || [] : wkFocus(area);
  const frow = (r, n) => done
    ? `<div class="q wkco"><dl class="gkv wksm"><dt>분야</dt><dd>${esc(r.fld)}</dd><dt>항목</dt><dd>${esc(r.item)}</dd><dt>내용</dt><dd>${esc(r.txt)}</dd>${r.note ? `<dt>비고</dt><dd>${esc(r.note)}</dd>` : ''}</dl></div>`
    : `<div class="q wkco"><div class="rowx"><b>${n + 1}</b><button class="wkdel" data-act="wkDel" data-n="${n}" aria-label="${n + 1}번 지우기">${I('close', 14)}지우기</button></div>
      <div class="wkf"><label for="wkf-${n}-fld">분야</label><select class="input wkin" id="wkf-${n}-fld" data-wk="f:${n}:fld"><option value="">고르기</option>${WK_FIELDS.map((x) => `<option${r.fld === x ? ' selected' : ''}>${x}</option>`).join('')}</select>
        <label for="wkf-${n}-item">항목</label><input class="input wkin" id="wkf-${n}-item" data-wk="f:${n}:item" value="${esc(r.item)}" placeholder="예: 분전반">
        <label for="wkf-${n}-txt">내용</label><input class="input wkin" id="wkf-${n}-txt" data-wk="f:${n}:txt" value="${esc(r.txt)}" placeholder="예: 분전반 앞 적재물">
        <label for="wkf-${n}-note">비고</label><input class="input wkin" id="wkf-${n}-note" data-wk="f:${n}:note" value="${esc(r.note)}"></div></div>`;
  return `${sbar('지킴이')}<div class="scr"><div class="bd">
    ${head('주간 보고', '')}
    <div class="today"><div><b>${WEEK.label}</b></div></div>
    <div class="lbl">기본 정보</div>
    ${kv([['점검조', TEAM.name], ['권역', `<select class="input wksel" id="wkArea" data-wk="area" aria-label="권역">${opts}</select>`], ['기간', WEEK.label], ['기업수', `${w.firms}곳`]])}
    <div class="lbl">점검한 기업</div>
    <div class="wkr">${RESULTS.map((r) => `<div><b>${w.c[r]}</b><span>${r}</span></div>`).join('')}</div>
    ${w.ins.length ? `<div class="gstack">${w.ins.map(firm).join('')}</div>` : '<div class="cnone">이번 주 이 권역에서 점검한 기업이 없어요</div>'}
    <div class="lbl wklh">중점점검항목${done ? '' : `<button class="fbtn line wkadd" data-act="wkAdd">${I('plus', 15)}더하기</button>`}</div>
    ${focus.length ? `<div class="gstack">${focus.map(frow).join('')}</div>` : `<div class="cnone">${done ? '적은 항목이 없어요' : '더하기를 눌러 적어요'}</div>`}
    ${done ? `<div class="stat"><div class="ck">${I('check', 26)}</div><div class="mid">${done.at} ${esc(done.by)} 냄</div></div>` : ''}
  </div><div class="ft">${done ? '<button class="btn ghost" data-go="">홈으로</button>' : `<button class="btn" data-act="sendWeekly">${area} 주간 보고 내기</button>`}</div></div>
  ${UI.sheet && UI.sheet.type === 'wkdel' ? `<div class="ov" data-act="closeSheet"></div><div class="dlg">
    <div class="mid" style="font-size:19px">${UI.sheet.n + 1}번 항목을 지울까요?</div>
    <div class="small ink">적어 둔 분야 · 항목 · 내용도 같이 지워져요.</div>
    <button class="btn" data-act="closeSheet">그대로 두기</button>
    <button class="btn ghost gdanger" data-act="wkDelOk">지우기</button></div>` : ''}`;
}
// 주간 보고 칸은 적는 대로 담아 둔다 — 화면이 다시 그려져도(다른 기기 반영 등) 적던 것이 남게. 권역을 바꾸면 다시 그린다
document.addEventListener('input', (e) => {
  const k = e.target.dataset && e.target.dataset.wk; if (!k) return;
  if (k === 'area') { UI.wk.area = e.target.value; render(); return; }
  const [kind, a, b] = k.split(':');
  if (kind === 'note') UI.wk.note[a] = e.target.value;
  else if (kind === 'f') wkFocus(wkArea(DB.s))[+a][b] = e.target.value;
});

/* ---------- 로그인 (2026-09-23) ----------
   아이디·비밀번호 (사용자가 고름). 로그인 상태 유지는 켜 둔 채로 연다 — 현장에서 날마다 다시 치지 않게 */
const LG = { msg: '', keep: true, busy: false };
function loginScreen() {
  return `${sbar('지킴이')}<div class="scr"><div class="bd glog">
    <div class="glogo"><i class="mark"></i><b>안전지킴이</b><small>산업안전지킴이</small></div>
    <form id="glf" autocomplete="on">
      <label class="lbl" for="lid">아이디</label>
      <input class="input" id="lid" name="username" autocomplete="username" autocapitalize="off" spellcheck="false" required>
      <label class="lbl" for="lpw">비밀번호</label>
      <input class="input" id="lpw" name="password" type="password" autocomplete="current-password" required>
      <label class="gkeep"><input type="checkbox" id="lkeep"${LG.keep ? ' checked' : ''}> 로그인 상태 유지</label>
      ${LG.msg ? `<div class="err" role="alert">${esc(LG.msg)}</div>` : ''}
      <button class="btn" type="submit"${LG.busy ? ' disabled' : ''}>로그인</button>
    </form>
    <button class="glforgot" data-act="forgot">비밀번호를 잊었어요</button>
    <div class="hint"><b>시험용 계정</b> (비밀번호 모두 1234)<br>
      <button type="button" class="link" data-act="fill" data-v="guard1">guard1</button> 김지킴 (조원)<br>
      <button type="button" class="link" data-act="fill" data-v="guard2">guard2</button> 이조장 (조장)</div>
  </div></div>`;
}
function paintLogin() {
  // 입력하던 값은 다시 그려도 남긴다 (틀렸다는 글이 뜰 때 아이디를 또 치지 않게)
  const id = $('#lid') ? $('#lid').value : '';
  $('#app').innerHTML = loginScreen();
  if (id) $('#lid').value = id;
  ($(id ? '#lpw' : '#lid')).focus();
  $('#lkeep').onchange = (e) => { LG.keep = e.target.checked; };
  $('#glf').onsubmit = async (e) => {
    e.preventDefault();
    LG.busy = true;
    try {
      const r = await fetch('api/login?app=guard', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: $('#lid').value, pw: $('#lpw').value, keep: LG.keep }) });
      const j = await r.json().catch(() => ({}));
      LG.busy = false;
      if (!r.ok) { LG.msg = j.error || '로그인하지 못했어요'; paintLogin(); $('#lpw').value = ''; return; }
      LG.msg = ''; setAccount(j); R.go(''); render();
    } catch (err) { LG.busy = false; LG.msg = '서버에 연결되지 않아요'; paintLogin(); }
  };
}
function setAccount(a) { ACC = a; ME = a.name; }

/* ---------- G1-나 내 정보 (2026-09-23) ----------
   사용자가 고른 것: 소속·조·권역, 비밀번호 바꾸기·문의. 소속은 운영자가 정하는 것이라 여기서는 보기만 한다 */
function meScreen(s) {
  const lead = TEAM.lead === ME, n = unsentN(s);
  const nFac = Object.keys(FACTORIES).filter((fid) => TEAM.areas.includes(FACTORIES[fid].area)).length;
  const sh = UI.sheet;
  return `${sbar(s.net.guard ? '지킴이' : '📶 전파 없음')}<div class="scr"><div class="bd">
    ${head('내 정보', '')}
    <div class="ghello gme"><span class="gav">${I('user', 30)}</span><div><b>${esc(ME)}</b><span class="gmsub">산업안전지킴이</span></div>${tg(lead ? '조장' : '조원', 'now')}</div>
    <div class="lbl">소속</div>
    <div class="q">${kv([['분야', TEAM.name.split(' ')[0]], ['조', TEAM.name], ['조장', TEAM.lead + (lead ? ' (나)' : '')],
      ['조원', TEAM.members.filter((m) => m !== TEAM.lead).map((m) => m === ME ? `${m} (나)` : m).join('<br>')],
      ['담당 권역', TEAM.areas.map(areaName).join('<br>')], ['담당 공장', `${nFac}곳`]])}</div>
    <div class="lbl">계정</div>
    <div class="q">${kv([['아이디', esc(ACC ? ACC.login : '-')]])}</div>
    <button class="q" data-act="pwOpen"><div class="rowx"><span class="t">비밀번호 바꾸기</span>${I('chevron', 18)}</div></button>
    <div class="lbl">문의</div>
    <div class="help">
      <a class="hrow" href="tel:031-000-0000"><span class="hic">${I('phone', 20)}</span><div><b>운영센터</b><div class="small">031-000-0000 (가상)<br>평일 9시부터 18시까지</div></div></a>
    </div>
    ${!DB.remote ? ''  // 서버 없이 연 시험판(지킴이 설문, 2026-10-07)은 로그인할 곳이 없다 — 로그아웃하면 다시 못 들어오니 단추를 두지 않는다
      : n ? `<button class="btn glocked gout" data-act="lockedOut">${I('lock', 17)} 로그아웃</button>`
      : `<button class="btn ghost gout" data-act="askOut">로그아웃</button>`}
  </div></div>
  ${sh && sh.type === 'pw' ? pwSheet(sh) : ''}
  ${sh && sh.type === 'out' ? `<div class="ov" data-act="closeSheet"></div><div class="dlg">
    <div class="mid" style="font-size:19px">로그아웃할까요?</div>
    <div class="small ink">다시 들어오려면 아이디와 비밀번호를 쳐야 해요.</div>
    <button class="btn" data-act="closeSheet">그대로 두기</button>
    <button class="btn ghost gdanger" data-act="logout">로그아웃</button></div>` : ''}`;
}
function pwSheet(sh) {
  const f = (id, label, ac) => `<label class="lbl" for="${id}">${label}</label>
    <input class="input" id="${id}" type="password" autocomplete="${ac}">${sh.err && sh.err.field === id ? `<div class="err" role="alert">${esc(sh.err.msg)}</div>` : ''}`;
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="mid">비밀번호 바꾸기</div>
    ${f('pwOld', '지금 비밀번호', 'current-password')}
    ${f('pwNew', '새 비밀번호 (4자 이상)', 'new-password')}
    ${f('pwNew2', '새 비밀번호 한 번 더', 'new-password')}
    <div class="row"><button class="btn ghost cxl" data-act="closeSheet">그만두기</button><button class="btn" data-act="pwSave">바꾸기</button></div>
  </div>`;
}

/* ---------- 그리기 ---------- */
// 날짜 표기 fmtDates는 common.js로 옮겼다 (2026-10-20 — 근로자 앱도 쓴다)
// 홈 당겨서 새로고침 · 위아래 끝 스프링 (2026-10-19 사용자 지시).
// 2026-09-18에 고무줄 스크롤을 막았다(overscroll-behavior:none — 화면 전체가 끌려와 앱 같지 않았다). 그래서 홈에서는 스크롤을 손으로 그린다:
// 손가락을 대는 동안 위아래 움직임을 모두 받아 스크롤 자리와 넘친 만큼(당김)을 함께 정하고, 떼면 그 속도로 미끄러지다 끝에 닿으면 스프링처럼 돌아온다.
// 한 손짓 안에서 당겼다 내렸다 해도 이어진다(2026-10-19 사용자 제보 — 새로고침 뒤 손을 떼지 않고 내리면 끝까지 안 내려갔다).
// 머리 줄(.htop)은 두고 내용과 남색 띠만 움직인다. 맨 위에서 70px 넘게 당기고 놓으면 서버에서 새로 받는다(도는 원은 벌어진 틈 안에만).
// 오늘 방문을 옆으로 넘기는 손짓은 건드리지 않는다
// 새로고침 문턱 70 → 100 (2026-10-19 사용자: 너무 살짝만 당겨도 새로고침된다) — 손가락으로 약 165px 당겨야 한다
const PULL_GO = 100, PULL_HOLD = 56, PULL_TOP = 150, PULL_BOT = 80;
const PULL = { id: null, on: false, busy: false, d: 0, p: 0, v: 0, raf: 0, pts: [], moved: 0 };
const pullScroller = () => (document.documentElement.dataset.standalone || matchMedia('(display-mode: standalone)').matches ? document.body : document.scrollingElement);
const pullMax = () => { const sc = pullScroller(); return Math.max(0, sc.scrollHeight - sc.clientHeight); };
const pullDamp = (x, m) => m * (1 - Math.exp(-x / m));  // 넘칠수록 덜 따라온다
const pullUndamp = (d, m) => -m * Math.log(1 - Math.min(d, m * 0.999) / m);
function pullSet(d) {
  PULL.d = d;
  const bd = $('.ghome .bd'); if (!bd) return;
  bd.style.setProperty('--pull', `${d}px`);
  const p = bd.querySelector('.ptr'); if (!p) return;
  const gap = Math.max(0, d);
  p.style.opacity = gap < 12 ? 0 : Math.min(1, (gap - 12) / (PULL.busy ? 20 : PULL_GO - 12));
  p.style.transform = `translateY(${gap / 2 - 15}px)`;  // 벌어진 틈 가운데
  p.style.setProperty('--rot', `${gap * 3}deg`);
  p.classList.toggle('spin', PULL.busy);
}
// 화면 자리(p) — 0~max는 보통 스크롤, 0보다 작으면 위로 넘침(당김), max보다 크면 아래로 넘침
function pullShow(p) {
  const max = pullMax(), sc = pullScroller();
  PULL.p = p;
  if (p < 0) { sc.scrollTop = 0; pullSet(-p); } else if (p > max) { sc.scrollTop = max; pullSet(max - p); } else { sc.scrollTop = p; pullSet(0); }
}
function pullRun() {
  cancelAnimationFrame(PULL.raf);
  let last = performance.now();
  const step = (now) => {
    const dt = Math.min(32, now - last); last = now;
    const max = pullMax(), lo = PULL.busy ? -PULL_HOLD : 0;
    let p = PULL.p, v = PULL.v;
    const edge = p < lo ? lo : p > max ? max : null;
    if (edge != null || (PULL.busy && p < 0)) {  // 넘친 곳 — 끝으로 끌어당기는 스프링(되튀지 않게 감쇠)
      const to = edge ?? lo; v += (-(1.4e-4) * (p - to) - 0.0236 * v) * dt;
    } else v *= Math.pow(0.9975, dt);  // 미끄러짐 — 점점 느려진다
    p += v * dt;
    if (p < -PULL_TOP) { p = -PULL_TOP; v = 0; }
    PULL.v = v; pullShow(p);
    const rest = Math.abs(v) < 0.02 && (p >= lo - 0.5 && p <= max + 0.5) && !(PULL.busy && Math.abs(p - lo) > 0.5) && !(p < 0 && !PULL.busy);
    if (rest) { PULL.v = 0; pullShow(Math.min(max, Math.max(PULL.busy ? lo : 0, p < 0.5 && p > -0.5 ? 0 : p))); return; }
    PULL.raf = requestAnimationFrame(step);
  };
  PULL.raf = requestAnimationFrame(step);
}
async function pullRefresh() {
  PULL.busy = true; pullSet(PULL.d); pullRun();
  await Promise.all([DB.remote ? DB.poll() : null, new Promise((r) => setTimeout(r, 900))]);
  PULL.busy = false; pullRun();
}
document.addEventListener('touchstart', (e) => {
  PULL.id = null;
  if (!$('.ghome .bd') || UI.sheet || PULL.busy || e.touches.length > 1 || $('#ctl')) return;  // 조작판이 열려 있으면 당기기도 안 한다 — 조작판 위를 끌면 뒤 홈이 움직였다 (2026-10-26)
  const t = e.touches[0];
  cancelAnimationFrame(PULL.raf); PULL.v = 0;
  // 스프링으로 돌아가는 중에 다시 잡으면 그 자리에서 이어 잡는다
  const max = pullMax(), sc = pullScroller();
  const p0 = PULL.d > 0 ? -pullUndamp(PULL.d, PULL_TOP) : PULL.d < 0 ? max + pullUndamp(-PULL.d, PULL_BOT) : sc.scrollTop;
  Object.assign(PULL, { id: t.identifier, on: false, x0: t.clientX, y0: t.clientY, p0, pts: [[performance.now(), t.clientY]], moved: 0,
    side: !!e.target.closest('.htsl') });
}, { passive: true });
document.addEventListener('touchmove', (e) => {
  if (PULL.id == null) return;
  const t = [...e.touches].find((x) => x.identifier === PULL.id); if (!t) return;
  const dx = t.clientX - PULL.x0, dy = t.clientY - PULL.y0;
  if (!PULL.on) {
    // 오늘 방문 넘기기 위에서는 방향이 정해질 때까지 기다린다. 옆이면 놓아준다
    if (PULL.side) { if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; if (Math.abs(dx) > Math.abs(dy)) { PULL.id = null; return; } }
    PULL.on = true;
  }
  if (e.cancelable) e.preventDefault();
  PULL.moved = Math.max(PULL.moved, Math.abs(dy));
  const now = performance.now(); PULL.pts.push([now, t.clientY]); while (PULL.pts.length > 2 && now - PULL.pts[0][0] > 100) PULL.pts.shift();
  const x = PULL.p0 - dy, max = pullMax();
  pullShow(x < 0 ? -pullDamp(-x, PULL_TOP) : x > max ? max + pullDamp(x - max, PULL_BOT) : x);
}, { passive: false });
function pullEnd(e) {
  if (PULL.id == null) return;
  if (e && e.changedTouches && ![...e.changedTouches].some((x) => x.identifier === PULL.id)) return;
  const was = PULL.on; PULL.id = null; PULL.on = false;
  if (!was || !$('.ghome .bd')) return;
  // 끈 손짓 뒤에 따라오는 눌림은 버린다 (끌다 놓은 자리의 단추가 눌리지 않게)
  if (PULL.moved > 8) { const eat = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; document.addEventListener('click', eat, true); setTimeout(() => document.removeEventListener('click', eat, true), 350); }
  const a = PULL.pts[0], b = PULL.pts[PULL.pts.length - 1], dt = b[0] - a[0];
  PULL.v = dt > 0 ? Math.max(-4, Math.min(4, -(b[1] - a[1]) / dt)) : 0;  // 손가락 속도 → 스크롤 속도(반대 방향)
  if (performance.now() - b[0] > 80) PULL.v = 0;  // 멈췄다 뗐으면 미끄러지지 않는다
  if (PULL.d >= PULL_GO && !PULL.busy) { PULL.v = 0; pullRefresh(); return; }
  pullRun();
}
document.addEventListener('touchend', pullEnd);
document.addEventListener('touchcancel', pullEnd);
// 홈 위쪽 남색 띠는 오늘 방문 카드 가운데까지 (2026-10-19). 카드 높이 · 자리를 재서 띠 길이를 넣는다.
// 띠를 카드 안에 그렸더니 화면이 올라오는 움직임 동안 카드를 덮었다 (2026-10-19 사용자 제보 — 열 때 한번에 안 그려짐)
function homeBand() {
  // 찾는 중에는 오늘 방문 카드가 없다 — 찾기 칸 가운데서 끊는다
  const bd = $('.ghome .bd'), td = $('.ghome .htd') || $('.ghome .hsrch'); if (!bd || !td) return;
  bd.style.setProperty('--hband', `${td.offsetTop + td.offsetHeight / 2}px`);
}
const bandObs = new ResizeObserver(homeBand);

function render() {
  if (!ACC) { paintLogin(); return; }
  if (document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('gftxa') && location.hash === lastHash) { UI.ftxWait = true; return; }  // 바로 적는 칸에 적는 중 — ftxSave 참고
  const s = DB.s, p = R.path();
  UI.subIns = p[0] === 'sub' ? p[1] : null;  // 제출 전 확인이면 점검 화면들이 그 점검을 고친다(ckDoc)
  syncReg(s);  // 새로 등록한 기업을 공장 목록에 (2026-10-26 기업등록)
  if (location.hash !== lastHash) { UI.mapFull = false; UI.sheet = null; UI.shot = null; UI.fv = null; UI.cell = null; }  // 다른 화면으로 가면(폰의 뒤로 가기 등) 지도 전체화면과 열린 창을 닫는다
  const d = s.draft;
  let html;
  const needFirst = ['meet', 'fix', 'equip', 'eqai', 'photo', 'ai', 'pick', 'list', 'ans', 'sum'].includes(p[0]);
  if (needFirst && !(d && d.kind === 'first')) { R.go(''); return; }
  if (p[0] === 'todo') html = todoScreen(s);  // 할 일 화면 (2026-10-19 — 홈 카드로 들어온다. 전에는 옛 주소라 홈으로 돌렸다)
  else if (p[0] === 'facs') { R.go('firms'); return; }  // 옛 전체 공장 — 기업등록으로 바뀜 (2026-10-26)
  else if (p[0] === 'firms') html = p[1] === 'new' ? firmNew(s) : firmsScreen(s);  // 기업등록 (2026-10-26 — 홈 카드)
  else if (p[0] === 'firm') html = firmView(s, p[1]);
  else if (p[0] === 'map') html = mapScreen(s);
  else if (p[0] === 'cal') html = calScreen(s);
  else if (p[0] === 'factories') html = factoriesScreen(s);
  else if (p[0] === 'pre') {
    // 공장 창의 ← 는 들어온 목록(홈·지도·캘린더·공장 전체보기 등)으로 돌아간다 (2026-09-28 사용자 제보 — 지도에서 들어가도 홈으로 갔다).
    // 공장 창 안쪽 화면(점검 결과·점검)에서 돌아올 때는 처음 적어 둔 곳을 그대로 쓴다
    const prev = (lastHash || '').replace(/^#\/?/, '').split('/')[0];
    if (location.hash !== lastHash && [...NAV.map(([go]) => go), 'factories', 'todo', 'firms'].includes(prev)) UI.preBack[p[1]] = prev;  // 할 일 화면도 (2026-10-19)
    html = pre(s, p[1]) + mapFullView(p[1]);
  }
  else if (p[0] === 'start') { R.go(''); return; }  // 옛 주소 — 회사 창으로 합쳐졌다
  else if (p[0] === 'photo' || p[0] === 'ai') { R.go(d.items.length ? 'list' : 'pick'); return; }  // 옛 주소 — 사진 몰아 찍기 화면은 2026-10-14에 걷었다
  else if (p[0] === 'meet') html = meetScreen(s, Math.min(Math.max(+p[1] || 1, 1), MEET.length));
  else if (p[0] === 'fix') html = fixScreen(s);
  else if (p[0] === 'equip' || p[0] === 'eqai') { R.go('pick'); return; }  // 옛 주소 — 장비 고르기는 2026-10-23에 사전 확인의 보유현황으로 합쳤다
  else if (p[0] === 'pick') html = pickScreen(s);
  else if (p[0] === 'list') html = checkList(s);
  else if (p[0] === 'ans' || p[0] === 'sum') { R.go('list'); return; }
  else if (p[0] === 're' || p[0] === 'resum') { R.go('pre/' + p[1]); return; }  // 옛 재점검 주소 — 회사 창으로
  else if (p[0] === 'rck') { R.go('send/' + p[1]); return; }  // 옛 판정 화면 — 개선 관리 한 화면으로 합쳤다 (2026-10-26)
  else if (p[0] === 'send') html = sendScreen(s, p[1]);
  else if (p[0] === 'sub') html = subScreen(s, p[1], p[2]);
  else if (p[0] === 'sent') html = sent(s, p[1], p[2]);
  else if (p[0] === 'weekly') html = weekly(s);
  else if (p[0] === 'noti') html = notiScreen(s);
  else if (p[0] === 'records') html = records(s, p[1], p[2]);
  else if (p[0] === 'insp') html = inspView(s, p[1], p[2]);
  else if (p[0] === 'me') html = meScreen(s);
  else if (p[0] === 'soon') { R.go(p[1] === 'me' ? 'me' : ''); return; }  // 옛 주소
  else html = home(s);
  const ae = document.activeElement, keep = ae && ae.id, val = keep && ae.value;
  // 입력 중에 다시 그리면 커서가 맨 앞으로 간다 — 자리를 기억해 되살린다 (찾기 칸에서 "정공"이 "공정"이 되던 것)
  const caret = keep && typeof ae.selectionStart === 'number' ? [ae.selectionStart, ae.selectionEnd] : null;
  const top = p.join('/');
  html = fmtDates(html);
  if (['', 'factories', 'cal', 'map', 'weekly', 'me', 'todo', 'firms'].includes(top)) html += gnav(top === 'todo' || top === 'firms' ? '' : top);  // 할 일 화면은 홈 안쪽이라 홈 칸을 켠다  // 공장은 2026-10-13부터 하단바 탭. 내 정보는 하단바에서 빠졌지만 하단바는 그대로 보인다  // 점검 기록은 홈의 "점검 결과 보기"로 들어가는 안쪽 화면
  // 찾기 칸에 입력 중이면 결과 목록만 갈아 끼운다 — 칸을 건드리지 않아야 한글 조합이 이어진다
  const part = { fq: '#fres', hq: '#hmain', fgq: '#fgres' }[keep];
  if (part && location.hash === lastHash && !UI.sheet && $(part)) {
    const tmp = document.createElement('div'); tmp.innerHTML = html;
    const nr = tmp.querySelector(part); if (nr) { $(part).replaceWith(nr); homeBand(); return; }
  }
  // 열린 창이 그대로인 채 다시 그리면(날짜 고르기 · 달 넘기기 · 권역 고르기 등) 창이 아래에서 다시 올라오며 깜빡이고 맨 위로 튀었다 (2026-10-14 사용자 제보 — 방문일 창).
  // 같은 창이면 올라오는 움직임을 빼고 스크롤 자리를 지킨다. (점검 쪽 칩 줄의 가로 자리 지키기는 2026-10-23 분야별 안전점검을 한 쪽으로 만들며 걷었다)
  const shOld = UI.sheet && $('.sheet') ? { type: UI.sheet.type, y: $('.sheet').scrollTop } : null;
  $('#app').innerHTML = html;
  if ($('.htsl') && UI.tdi) { const sl = $('.htsl'); sl.scrollLeft = Math.min(UI.tdi, +sl.dataset.n - 1) * sl.clientWidth; }  // 오늘 방문 넘김 자리
  bandObs.disconnect(); if ($('.ghome')) { homeBand(); bandObs.observe($('.ghome .bd')); }
  if ($('.ghome .bd') && (PULL.d || PULL.busy)) pullSet(PULL.d);  // 당긴 채 다시 그려도(새 데이터 등) 그 자리 그대로
  if (shOld && UI.sheet && UI.sheet.type === shOld.type && $('.sheet')) {
    document.querySelectorAll('#app .sheet, #app .ov').forEach((el) => el.classList.add('keep'));
    $('.sheet').scrollTop = shOld.y;
  }
  findPump();
  syncWheels();
  if (NV.st === 'ready') { nvMount(); nvFacMount(); }
  if (location.hash !== lastHash) { const sc = $('#app .scr'); if (sc) sc.classList.add('enter'); lastHash = location.hash; }
  if (UI.focusQ && $('#fq')) { UI.focusQ = false; $('#fq').focus(); }
  ltCheck(); kzMiniCheck();
  if (keep && $('#' + keep)) { const el = $('#' + keep); el.value = val; el.focus(); if (caret) try { el.setSelectionRange(caret[0], caret[1]); } catch (e) {} }
}
let lastHash = null;
function sheet(v) { UI.sheet = v; render(); }

// 하던 점검이 있으면 그대로 두고, 없을 때만 새로 만든다
function startDraft(fid) {
  DB.act((s) => {
    if (s.draft && s.draft.kind === 'first' && s.draft.fid === fid) return;
    UI.fact = null; UI.meet = 1; UI.ckTab = 'prev';  // 새 점검은 첫 쪽부터 (하던 점검을 이어 할 때는 보던 쪽 그대로)
    s.draft = { kind: 'first', fid, photos: 0, self: [], items: [], aiq: [] };
  });
}
// 체크리스트 문항 만들기 — 사전 확인 01에 답하려면 문항이 먼저 있어야 해서 점검을 시작할 때 만든다 (2026-10-23, 전에는 체크리스트 고르기 다음에)
// 이미 단 답은 그대로 두고, 보유현황에 없는 기구 문항은 해당 없음으로 감춘다(syncKit)
function fillItems(s) {
  const d = s.draft;
  const base = CHECKLIST.areas.flatMap((a) => a.items.map((t, i) => ({ id: `c${a.key}-${i}`, text: t, src: 'base', area: a.key })));
  // 사진 AI와 장비 AI는 2026-10-20부터 항목을 만들지 않는다(점검 포인트만) — 그 전 초안에 넣어 둔 AI 항목만 그대로 둔다
  // (사진 것은 "AI 제안" 한 쪽, 장비 것은 장비마다 한 쪽 — eq = 장비 이름. 출처 'ai'라 운영자 통계 "AI 제안 쓰임"에 셈한다)
  const ai = d.items.filter((x) => x.src === 'ai').map((x) => ({ id: x.id, text: x.text, src: 'ai', ...(x.photo ? { photo: x.photo } : {}), ...(x.eq ? { eq: x.eq } : {}) }));
  const self = d.self.map((t, i) => ({ id: 's' + i, text: t, src: 'self' }));
  // 지난번 미흡은 문항으로 만들지 않고 분야별 안전점검 맨 위 주안점(AI)으로 본다 (2026-10-23 사용자 지시 — 전에는 맨 앞 "지난번 미흡" 묶음, 승인되면 답이 원래 항목에 적혔다)
  const old = Object.fromEntries(d.items.map((x) => [x.id, x]));
  d.items = [...base, ...ai, ...self].map((x) => Object.assign(x, old[x.id] ? { answer: old[x.id].answer, memo: old[x.id].memo, reason: old[x.id].reason, shot: old[x.id].shot, eval: old[x.id].eval, risks: old[x.id].risks, ...(old[x.id].auto ? { auto: true } : {}), ...(old[x.id].photo ? { photo: old[x.id].photo } : {}), ...(old[x.id].pics ? { pics: old[x.id].pics } : {}) } : { answer: null }));
  syncKit(s);
}
const ensureItems = () => { if (!DB.s.draft.items.length) DB.act(fillItems); };

const ACTS = {
  closeSheet() { sheet(null); },
  // 기업 정보 고치기 (2026-10-14 사용자 지시). 담당자 칸 · 명함 찍기는 2026-10-19 사용자 지시로 걷음
  firmEdit({ fid, v }) {
    const x = firmOf(DB.s, fid); sheet({ type: 'firm', fid, k: v, vals: Object.fromEntries(FIRM_EDIT[v][1].map(([k]) => [k, x[k] ?? ''])) });
  },
  firmSeg({ k, v }) {  // 다시 그리면 창이 새로 올라와 깜빡여서 표시만 바꾼다
    UI.sheet.vals[k] = v;
    document.querySelectorAll(`.fsheet [data-act="firmSeg"][data-k="${k}"]`).forEach((b) => { const on = b.dataset.v === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  },
  firmSave() {
    const { fid, k, vals } = UI.sheet, clean = Object.fromEntries(Object.entries(vals).map(([a, b]) => [a, String(b).trim()]));
    DB.act((s) => { s.firm = s.firm || {}; const cur = s.firm[fid] || {};
      s.firm[fid] = { ...cur, ...clean, edits: { ...(cur.edits || {}), [k]: { at: '9/17', by: ME } } };
      DB.log(`지킴이 기업 정보 고침 · ${FACTORIES[fid].name} ${FIRM_EDIT[k][0]}`); });
    sheet(null); toast('기업 정보를 수정했어요');
  },
  fill({ v }) { $('#lid').value = v; $('#lpw').value = '1234'; $('#lpw').focus(); },
  forgot() { toast('운영센터에 전화하면 새 비밀번호를 알려 줘요 (031-000-0000, 가상)'); },
  pwOpen() { sheet({ type: 'pw', err: null }); setTimeout(() => $('#pwOld') && $('#pwOld').focus(), 50); },
  async pwSave() {
    const v = { pwOld: $('#pwOld').value, pwNew: $('#pwNew').value, pwNew2: $('#pwNew2').value };
    const bad = (field, msg) => { UI.sheet.err = { field, msg }; render(); Object.entries(v).forEach(([k, x]) => { if ($('#' + k)) $('#' + k).value = x; }); $('#' + field).focus(); };
    if (!v.pwOld) return bad('pwOld', '지금 비밀번호를 적어 주세요');
    if (v.pwNew.length < 4) return bad('pwNew', '새 비밀번호는 4자 이상이어야 해요');
    if (v.pwNew !== v.pwNew2) return bad('pwNew2', '새 비밀번호가 서로 달라요');
    if (!DB.remote) { sheet(null); toast('시험판이라 비밀번호는 바뀌지 않아요'); return; }
    const r = await fetch('api/password?app=guard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ old: v.pwOld, new: v.pwNew }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return bad(j.field === 'new' ? 'pwNew' : 'pwOld', j.error || '바꾸지 못했어요');
    sheet(null); toast('비밀번호를 바꿨어요');
  },
  askOut() { sheet({ type: 'out' }); },
  lockedOut() { toast(`아직 안 올라간 점검 ${unsentN(DB.s)}건이 있어요. 전파가 잡혀 올라간 뒤에 로그아웃할 수 있어요`); },
  async logout() {
    UI.sheet = null;
    try { await fetch('api/logout?app=guard', { method: 'POST' }); } catch (e) {}
    ACC = null; ME = '김지킴'; LG.msg = '';
    R.go(''); render();
  },
  date({ fid }) {
    const v = DB.s.visits[fid], d = visitDay(v);  // 잡아 둔 날이 있으면 그 달·그 날을 골라 둔 채로 연다
    sheet({ type: 'date', fid, m: d ? d.m : TODAY.m, pm: d ? d.m : null, d: d ? d.d : null, tm: tmOf(v) });
  },
  pickD({ v }) { UI.sheet.pm = UI.sheet.m; UI.sheet.d = +v; render(); },
  sheetM({ v }) { UI.sheet.m = Math.min(12, Math.max(TODAY.m, UI.sheet.m + +v)); render(); },
  wheel({ i }, el) { el.parentElement.scrollTo({ top: +i * WH, behavior: 'smooth' }); },  // 칸을 누르면 그 칸이 가운데로
  saveDate() {
    const sh = UI.sheet, isToday = sh.pm === TODAY.m && sh.d === TODAY.d;
    const v = isToday ? `오늘 ${sh.tm}` : `${sh.pm}/${sh.d}(${WD[new Date(TODAY.y, sh.pm - 1, sh.d).getDay()]}) ${sh.tm}`;
    // 지킴이가 정한 방문일이 바로 들어간다 — 공장주 승인을 거치지 않는다 (2026-10-07 사용자 지시로 예약을 걷음)
    DB.act((s) => { s.visits[sh.fid] = v; DB.log(`${ME} 방문일 정함 · ${FACTORIES[sh.fid].name} ${v}`); });
    UI.sheet = null; toast(`${fmtDates(v)} 방문을 캘린더에 올렸어요`); render();
  },
  clearDate() {
    const fid = UI.sheet.fid;
    DB.act((s) => { s.visits[fid] = null; DB.log(`${ME} 방문일 지움 · ${FACTORIES[fid].name}`); });
    UI.sheet = null; toast('방문일을 지웠어요'); render();
  },
  // 점검 시작을 누른 화면을 적어 두고 점검 첫 화면의 ← 로 그리 돌아간다 (2026-10-20 사용자 제보 — 홈 → 점검하기 → 점검 시작에서 ← 를 누르면 공장 창 정보 탭이 나왔다)
  // 점검 첫 화면은 사전 확인 (2026-10-23 — 그 전날은 현장점검 개선사항, 전에는 체크리스트 고르기). 사전 확인을 끝낸 점검을 이어 하면 지적사항부터
  newDraft({ fid }) { UI.startBack = R.path().join('/'); startDraft(fid); ensureItems(); R.go(DB.s.draft.meetDone ? 'fix' : 'meet/' + UI.meet); },
  openMap() { toast('실제 앱은 여기서 지도 앱으로 넘어가요'); },
  // 사전 확인 (2026-10-23) — 다 빼면 "안 적음"(null)으로 돌아간다. 바꿀 값을 먼저 정해 두고 넣는다(DB.push가 다시 적용해도 같게)
  kitTg({ v }) { const l = firmOf(DB.s, ckDoc().fid).kit || [], next = KIT.map((k) => k.name).filter((n) => (n === v ? !l.includes(n) : l.includes(n))); setFirm('kit', next.length ? next : null); },
  kitNone() { const l = firmOf(DB.s, ckDoc().fid).kit; setFirm('kit', l && !l.length ? null : []); },
  // 해당없음은 다른 칸과 같이 고르지 않는다
  chemTg({ v }) {
    const l = firmOf(DB.s, ckDoc().fid).chem || [], none = CHEM[3];
    const next = CHEM.filter((c) => (c === v ? !l.includes(c) : l.includes(c) && v !== none && c !== none));
    setFirm('chem', next.length ? next : null);
  },
  kitEtcOpen() { sheet({ type: 'kitEtc' }); setTimeout(() => $('#kitEtcIn') && $('#kitEtcIn').focus(), 50); },
  kitEtcSave() { const v = $('#kitEtcIn').value.trim(); UI.sheet = null; setFirm('kitEtc', v); },
  meetGo({ v }) { ensureItems(); UI.meet = +v; R.go('meet/' + v); },
  meetEnd() { DB.act((s) => { s.draft.meetDone = true; }); R.go('fix'); },
  // 사전 확인 표 바로 고치기 (2026-10-23 사용자 지시, 안 A). 열린 고르는 칸을 다시 누르면 닫는다 — 다른 칸이 열려 있었으면 누르는 순간 이미 닫혔다
  cellEdit({ k }) {
    if (UI.cell) { cellClose(); return; }
    UI.cell = { k, v: String(firmOf(DB.s, ckDoc().fid)[k] ?? '') }; render();
    const el = $('#cellIn'); if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} }
  },
  cellSave() { cellClose(); },
  cellPick({ v }) { const k = UI.cell.k; UI.cell = null; cellPut(k, v); },
  // 현장점검 개선사항 (2026-10-22) — 탭, 줄 더하기, 펼치기, 찍기, 사진첩, 종류, 위험요인, 내용, 지우기, 크게 보기
  insTab({ v }) { if (v === 'meet') { ACTS.meetGo({ v: UI.meet }); return; } R.go(v === 'fix' ? 'fix' : DB.s.draft.items.length ? 'list' : 'pick'); },
  fOn({ id }) { UI.fact = id; render(); scrollFind(id); },
  // 찍기 — 빈 화면 카드 · 목록 아래 점선 칸의 카메라는 새 개선사항을 만들고, 펼친 줄의 사진 추가는 그 줄에 넣는다 (2026-10-23 — 아래 사진첩 · 찍기 · 추가 단추를 걷음)
  fcam({ id }) {
    if (id && findOf(DB.s.draft, id).pics.length >= FIND_MAX) { toast(`한 건에 사진은 ${FIND_MAX}장까지예요`); return; }
    camOpen(id || null);
  },
  // 셔터 — 찍은 사진을 멈춰 보이고 [다시 찍기] / [사진 사용]을 묻는다. 반짝임으로 찍힌 것을 알린다
  camSnap() {
    const v = $('#camv video');
    if (CAM.st !== 'live' || !v || !v.videoWidth || CAM.base >= FIND_MAX) return;
    CAM.st = 'snap';
    const b = $('#camv .gcvb');
    b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
    // 영상은 칸을 채우게(가운데 기준) 보이므로, 칸 비율대로 가운데를 잘라 보이는 범위만 남긴다
    const r = b.clientWidth / b.clientHeight, vw = v.videoWidth, vh = v.videoHeight, sw = Math.min(vw, vh * r), sh = sw / r;
    camShrink(v, sw, sh, (vw - sw) / 2, (vh - sh) / 2).then((p) => { if (!CAM.open) { URL.revokeObjectURL(p.url); return; } CAM.shot = p; CAM.st = 'last'; camPaint(); });
    camPaint();
  },
  // 플래시(손전등) · 확대 — 폰이 되는 것만 단추가 보인다. 안 먹으면 단추를 거둔다
  camFlash() {
    const tr = CAM.stream && CAM.stream.getVideoTracks()[0]; if (!tr) return;
    CAM.flash = !CAM.flash;
    tr.applyConstraints({ advanced: [{ torch: CAM.flash }] }).catch(() => { CAM.flash = false; CAM.torch = false; camPaint(); });
    camPaint();
  },
  camZoom({ v }) {
    const tr = CAM.stream && CAM.stream.getVideoTracks()[0], z = CAM.zoom; if (!tr || !z) return;
    CAM.zm = +v;
    tr.applyConstraints({ advanced: [{ zoom: Math.min(z.max, Math.max(z.min, CAM.zm)) }] }).catch(() => { CAM.zoom = null; CAM.zm = 1; camPaint(); });
    camPaint();
  },
  camRetake() {
    URL.revokeObjectURL(CAM.shot.url); CAM.shot = null;
    if (CAM.stream) { CAM.st = 'live'; camPaint(); } else camStart();  // 보는 사이 다른 앱에 다녀와 카메라가 꺼졌으면 다시 켠다
  },
  camUse() { camPut(CAM.shot); camClose(); },
  camClose() { camClose(); },
  camFile() { camIn.click(); },
  camTest() {
    if (!CAM.fid) CAM.fid = newFind('bad'); putShots(CAM.fid, nextShots(DB.s.draft, 1)); camClose(); },  // 시험 사진 한 장 (PC · 카메라 없는 기기)
  fRiskDel({ id, v }) { kindMove(id, () => DB.act((s) => { const f = findOf(s.draft, id); f.risks = (f.risks || []).filter((r) => r !== v); f.own = true; })); },
  fRiskOpen({ id }) { sheet({ type: 'frisk', id, risks: [...(findOf(DB.s.draft, id).risks || [])], touched: false }); },
  fRiskSave() {
    const sh = UI.sheet; UI.sheet = null;
    kindMove(sh.id, () => DB.act((s) => { const f = findOf(s.draft, sh.id); f.risks = RISKS.filter((r) => sh.risks.includes(r)); f.own = true; }));
  },
  fRetry({ id }) { DB.act((s) => { const f = findOf(s.draft, id); if (f.ai) f.ai.st = 'wait'; }); },
  // 사진이나 내용이 있으면 묻고 지운다. 빈 줄은 바로
  fDelAsk({ id }) { const f = findOf(DB.s.draft, id); if (f.pics.length || f.text) sheet({ type: 'fdel', id }); else { UI.sheet = { id }; ACTS.fDel(); } },
  fDel() {
    const id = UI.sheet.id; UI.sheet = null;
    if (UI.fact === id) UI.fact = null;
    DB.act((s) => { s.draft.finds = findsOf(s.draft).filter((x) => x.id !== id); });
  },
  fvOpen({ id, i }) { UI.fv = { id, i: +i || 0 }; render(); },
  fvStep({ v }) { const f = findOf(DB.s.draft, UI.fv.id); UI.fv.i = Math.max(0, Math.min(f.pics.length - 1, UI.fv.i + +v)); render(); },
  fvClose() { UI.fv = null; render(); },
  fvRep() {
    const { id, i } = UI.fv; UI.fv.i = 0;
    DB.act((s) => { const f = findOf(s.draft, id), k = f.pics[i]; f.pics = [k, ...f.pics.filter((x) => x !== k)]; repCheck(f); });
    toast('대표 사진으로 바꿨어요');
  },
  fvDrop() {
    const { id, i } = UI.fv, n = findOf(DB.s.draft, id).pics.length;
    UI.fv = n > 1 ? { id, i: Math.min(i, n - 2) } : null;
    DB.act((s) => { const f = findOf(s.draft, id); f.pics.splice(i, 1); repCheck(f); });
  },
  shotView({ k, i }) { UI.shot = { k: +k, i }; render(); },
  shotClose() { UI.shot = null; render(); },
  addSelf() { sheet({ type: 'self' }); setTimeout(() => $('#selfIn') && $('#selfIn').focus(), 50); },
  saveSelf() {
    const v = ($('#selfIn').value || '').trim();
    if (!v) { toast('내용을 적어 주세요'); return; }
    UI.sheet = null; DB.act((s) => s.draft.self.push(v));
  },
  startAnswer() {
    DB.act(fillItems);
    R.go('list');
  },
  // 불량이 아닌 답으로 바꾸면 위험요인·사진은 지운다 (불량에만 붙는 것). 평가 내용은 어느 답이든 남는다
  ans({ n, v }) { n = +n; if (ckLock(+n)) return;
    DB.act((s) => { const it = ckDoc(s).items[n]; it.answer = v; it.memo = ''; it.shot = false; delete it.pics; it.risks = []; delete it.noFix; if (it.src !== 'ai') delete it.photo; }); },
  // 처음 불량으로 고를 때는 AI 추천 위험요인을 미리 골라 둔다 — 누르면 빠진다 (2026-10-26 사용자 지시). 이미 불량이면 저장한 그대로
  ansBad({ n }) { if (ckLock(+n)) return; const it = ckDoc().items[+n], auto = it.answer !== 'bad';
    sheet({ type: 'bad', n: +n, reason: it.reason || null, risks: auto ? riskHint(it) : [...(it.risks || [])], auto }); },
  // 위험요인 고르기 (2026-10-07) — 창을 다시 그리면 위로 튀고 올라오는 움직임이 다시 나와서, 누른 칸의 표시만 바꾼다
  // 위 고른 칩을 눌러도 같은 일 — 줄 표시와 위 칩만 고친다 (2026-10-27)
  riskTg({ v }) {
    const l = UI.sheet.risks || [], on = !l.includes(v);  // 지적사항 창은 AI 추천 전이면 비어 있다
    UI.sheet.risks = on ? [...l, v] : l.filter((x) => x !== v); UI.sheet.touched = true;
    const el = $(`.sheet .kprow[data-v="${v}"]`); el.classList.toggle('on', on); el.setAttribute('aria-pressed', on);
    el.querySelector('.kpchk').innerHTML = on ? I('check', 15) : '';
    $('.sheet .kpsum').innerHTML = riskSum(UI.sheet.risks);
  },
  // 나머지 위험요인 펼치기·접기 — 다시 그리지 않고 보이기만 바꾼다(창이 위로 튀지 않게, 적던 글도 그대로)
  riskMore(_, el) {
    const box = $('.sheet .srmore'), open = box.hidden; box.hidden = !open;
    el.setAttribute('aria-expanded', open); el.classList.toggle('open', open);
    el.querySelector('span').textContent = open ? '접기' : `나머지 ${box.children.length}개 더 보기`;
  },
  ckTab({ v }) { UI.ckTab = v; render(); scrollTo(0, 0); },
  // 분야별 안전점검 마무리의 "안 본 것" — 그 묶음으로 내려간다
  gu({ v }) { UI.gu = v || null; UI.pin = null; render(); },
  sort({ v }) { UI.sort = v; render(); },
  todo({ v }) { UI.td = v; R.go('todo'); },
  // 기업등록 (2026-10-26)
  fgScope({ v }) { UI.fgs = v; UI.fgMore = 10; render(); },
  fgMore() { UI.fgMore = (UI.fgMore || 10) + 10; render(); },
  fgfOpen() { const f = UI.fgf || fgF0(); sheet({ type: 'fgf', v: { ...f, own: [...f.own], kind: [...f.kind], why: [...f.why] } }); },
  fgfTg({ k, v }) { const l = UI.sheet.v[k]; UI.sheet.v[k] = l.includes(v) ? l.filter((x) => x !== v) : [...l, v]; render(); },
  fgfReset() { UI.sheet.v = fgF0(); render(); },
  fgfApply() { UI.fgf = UI.sheet.v; UI.fgMore = 10; UI.sheet = null; render(); },
  fgrSet({ k, v }) { UI.fgr[k] = v; render(); },
  fgAddr() { sheet({ type: 'fgAddr', q: '' }); setTimeout(() => { const q = $('#fgaq'); if (q) q.focus(); }, 50); },
  fgAddrPick({ v }) { const a = FG_ADDRS[+v]; Object.assign(UI.fgr, { zip: a.zip, road: a.road, dong: a.dong }); UI.sheet = null; render(); },
  fgrSave() {
    const d = UI.fgr, k = KSIC_LIST.find(([c]) => c === d.ksic), tr = (x) => String(x || '').trim();
    const miss = [['기업명', d.name], ['사업자등록번호', d.biz], ['행정구역', d.dong], ['등록사유', d.why], ['기업등록일자', d.regDate]].filter(([, v]) => !tr(v)).map(([w]) => w);
    if (miss.length) { toast(`꼭 적을 칸이 비었어요: ${miss.join(', ')}`); return; }
    const id = 'n' + Date.now().toString(36), code = `HS${String(firmAll(DB.s).length + 1).padStart(5, '0')}`;
    const rec = { id, code, name: tr(d.name), biz: tr(d.biz), ceo: tr(d.ceo), tel: tr(d.tel), fax: tr(d.fax), mail: tr(d.mail), zip: d.zip, road: d.road, addr2: tr(d.addr2),
      addr: `${d.road} ${tr(d.addr2)}`.trim(), dong: d.dong, ksic: k ? [k[0], k[1]] : null, type: k ? k[2] : '기타', product: tr(d.product),
      workers: tr(d.workers) === '' ? null : +d.workers, foreign: tr(d.foreign) === '' ? null : +d.foreign, own: d.own, kind: d.kind,
      mgr: tr(d.mgr), mgrTel: tr(d.mgrTel), mgrMail: tr(d.mgrMail), injuries: { ...d.inj }, why: d.why, regDate: d.regDate.replace(/-/g, '.'), by: ME, at: `${TODAY.m}/${TODAY.d}` };
    DB.act((s) => { ((s.op ||= {}).facs ||= []).push(rec); DB.log(`${ME} 기업등록 · ${rec.name} (${rec.why})`); });
    UI.fgr = null;
    toast(TEAM_DONGS.includes(rec.dong) && rec.why !== '점검거부' ? '등록했어요. 점검하기 목록에 올렸어요' : '등록했어요');
    R.go('firm/' + id);
  },
  rsub({ v }) { UI.rsub = v; render(); },
  facInfo({ fid }) { UI.ftab[fid] = 'info'; R.go('pre/' + fid); },  // 기업등록 기업 보기 → 공장 창 기업 정보 탭
  // 시정 — 공장에 사진을 올려 달라고 다시 알린다 (2026-10-19, 가설: 공장 웹 · 문자로 감). 시제품은 보낸 날만 남긴다
  nudge({ id }) {
    DB.act((s) => { const ins = s.inspections.find((i) => i.id === id); ins.nudged = '9/17'; DB.log(`지킴이 공장에 시정 사진 다시 알림 · ${FACTORIES[ins.fid].name}`); });
    toast('공장에 다시 알렸어요');
  },
  facLog({ fid }) { UI.ftab[fid] = 'log'; R.go('pre/' + fid); },
  calDay({ v }) { UI.calD = +v; render(); },
  calToday() { UI.calM = TODAY.m; UI.calD = TODAY.d; R.go('cal'); },
  ftab({ fid, v }) { UI.ftab[fid] = v; render(); },
  // 넘길 때 새 공장이 넘긴 쪽에서 밀려 들어온다 (2026-10-15 사용자 지시) — 방향은 이번 한 번 그릴 때만 쓴다
  rv({ v }) { UI.rv = (UI.rv || 0) + +v; UI.rvDir = +v; render(); UI.rvDir = 0; },
  // 머리 찾기 아이콘 — 공장 탭의 이름 찾기 칸으로 가서 바로 입력하게 한다
  hqClear() { UI.hq = ''; render(); const q = $('#hq'); if (q) q.focus(); },
  search() { if (location.hash === '#/factories') { const q = $('#fq'); if (q) q.focus(); } else { UI.focusQ = true; R.go('factories'); } },
  // 알림 아이콘 — 들어갈 때 안 본 것을 "새 소식"으로 표시해 두고 모두 본 것으로 친다
  noti() { const l = notis(DB.s); UI.notiNew = new Set(l.filter((x) => !UI.notiSeen.has(x.id)).map((x) => x.id)); l.forEach((x) => UI.notiSeen.add(x.id)); R.go('noti'); },
  mapFull() { UI.mapFull = true; render(); },
  mapClose() { UI.mapFull = false; render(); },
  ptsTg({ k }, el) { const open = (UI.ptsOpen[k] = !UI.ptsOpen[k]); el.closest('.cacc').classList.toggle('open', open); el.setAttribute('aria-expanded', open); },  // 점검 포인트 아코디언 — 다시 그리지 않는다
  kitOpen() { sheet({ type: 'kit' }); },
  ckTg({ k }, el) {  // 다시 그리면 펼치는 움직임이 안 보여서 칸의 표시만 바꾼다
    UI.ckOpen[k] = !UI.ckOpen[k];
    const c = el.closest('.gck'), on = UI.ckOpen[k];
    c.classList.toggle('open', on); el.setAttribute('aria-expanded', on);
    c.querySelector('.gtdar').classList.toggle('on', on);
    c.querySelector('.gckl').inert = !on;
  },
  // 점검 기간 (2026-10-13) — 고르기만 하고 적용해야 목록이 바뀐다 (권역 창과 같게)
  perOpen() { const p = UI.per || { k: 'all', from: '9/1', to: '9/17' }; sheet({ type: 'per', k: p.k, from: p.from, to: p.to }); },
  // 고를 때 창을 다시 그리지 않고 표시만 바꾼다 — 다시 그리면 창이 깜빡이며 새로 올라왔다 (2026-10-14 사용자 제보). 날짜 칸은 늘 보인다
  perPick({ v }) { perKeep(); UI.sheet.k = v; perMark(); },
  perApply() {
    perKeep();
    const { k, from, to } = UI.sheet;
    if (k === 'self' && mdNum(from) > mdNum(to)) { toast('시작일이 끝일보다 늦어요'); return; }
    const p = PERS.find(([x]) => x === k);
    UI.per = k === 'all' ? null : p ? { k, from: p[2], to: p[3] } : { k, from, to };
    if (UI.per && UI.fst === 'never') UI.fst = 'all';  // 기간을 고르면 아직 안 감은 없다
    sheet(null);
  },
  fst({ v }) { UI.fst = UI.fst === v && v !== 'all' ? 'all' : v; render(); },  // 고른 칸을 다시 누르면 전체
  areaOpen({ v }) { sheet({ type: 'area', v, pick: [...UI.areas] }); },
  areaPick({ v }) { const p = UI.sheet.pick; UI.sheet.pick = p.includes(v) ? p.filter((a) => a !== v) : [...p, v]; render(); },
  areaClear() { UI.sheet.pick = []; render(); },
  areaApply() { UI.areas = [...UI.sheet.pick]; UI.sheet = null; render(); },
  calM({ v }) { UI.calM = Math.min(12, Math.max(1, UI.calM + +v)); UI.calD = null; render(); },
  brief({ fid }) { sheet({ type: 'brief', fid }); },
  pin({ fid }) { UI.pin = UI.pin === fid ? null : fid; render(); },
  // 주간 보고 — 중점점검항목 줄 더하기·지우기, 권역 하나씩 내기 (2026-10-01 기존 웹 양식대로)
  wkAdd() { wkFocus(wkArea(DB.s)).push({ fld: '', item: '', txt: '', note: '' }); render(); },
  // 적은 게 있으면 묻고 지운다 — 작은 지우기를 잘못 눌러 적던 것이 날아가지 않게 (2026-10-15). 빈 칸은 바로 지운다
  wkDel({ n }) { const r = wkFocus(wkArea(DB.s))[+n]; if (r && ['fld', 'item', 'txt', 'note'].some((k) => (r[k] || '').trim())) { sheet({ type: 'wkdel', n: +n }); return; } wkFocus(wkArea(DB.s)).splice(+n, 1); render(); },
  wkDelOk() { wkFocus(wkArea(DB.s)).splice(UI.sheet.n, 1); sheet(null); },
  sendWeekly() {
    const area = wkArea(DB.s), w = weekCounts(DB.s, area);
    const notes = Object.fromEntries(w.ins.map((i) => [i.id, (UI.wk.note[i.id] || '').trim()]).filter(([, v]) => v));
    const focus = wkFocus(area).map((r) => ({ fld: r.fld, item: r.item.trim(), txt: r.txt.trim(), note: r.note.trim() })).filter((r) => r.fld || r.item || r.txt || r.note);
    DB.act((s) => { s.weekly = s.weekly || {}; s.weekly[wkKey(area)] = { by: ME, at: '9/17', area, firms: w.firms, c: w.c, notes, focus }; DB.log(`${TEAM.name} ${area} 주간 보고 냄`); });
    delete UI.wk.focus[area];
    toast(`${area} 주간 보고를 냈어요`);
  },
  // 불량 창에는 사진 칸이 없다 (2026-10-22 사용자 지시 — 점검표는 종이 체크리스트를 대신한다). 예전 초안에 찍어 둔 사진은 그대로 둔다
  saveBad() {
    const n = UI.sheet.n, memo = $('#memoIn').value.trim(), reason = UI.sheet.reason || '';  // 평가 내용은 줄에서 바로 적는다 (2026-10-23)
    const risks = RISKS.filter((r) => UI.sheet.risks.includes(r));  // 목록 차례대로
    UI.sheet = null;
    // 제출 전 확인에서 새로 불량으로 고른 것은 공장에 안 간다(noFix — 점검 마칠 때와 같게)
    DB.act((s) => { const d = ckDoc(s), it = d.items[n]; it.answer = 'bad'; it.memo = memo; it.reason = reason; it.risks = risks; if (d !== s.draft && !it.ref) it.noFix = true; });
  },
  submitFirst() {
    const d = DB.s.draft;
    // 현장점검 개선사항 — 맨 앞에. 결과는 개선사항으로만 정한다: 있으면 재점검(개선 관리에서 정리해 보냄), 없으면 점검완료.
    // 체크리스트 불량은 공장에 따로 안 간다(noFix) — 지킴이가 개선사항으로도 올린다 (2026-10-26 사용자 지시)
    const fi = findItems(d);
    const data = { kind: 'first', fid: d.fid, by: ME, team: TEAM.name, ver: CHECKLIST.ver, result: fi.length ? '재점검' : '점검완료',
      items: [...fi, ...d.items.map((x) => ({ id: x.id, text: x.text, src: x.src, area: x.area, answer: x.answer, memo: x.memo || '', eval: x.eval || '', log: [], ...(x.answer === 'bad' && !x.ref ? { noFix: true } : {}), ...(x.auto ? { auto: true } : {}),
        ...(x.eq ? { eq: x.eq } : {}), ...(x.shot && !x.ref ? { shot: true, pics: picsOf(x) } : {}), ...((x.risks || []).length ? { risks: x.risks } : {}),
        ...(x.ref ? { ref: x.ref, note: x.note, reason: x.reason || '', shot: !!x.shot, ...(x.shot ? { pics: picsOf(x) } : {}) } : {}) }))] };
    DB.act((s) => {
      if (s.net.guard) applyInspection(s, data); else s.outbox.guard.push({ type: 'inspection', data });
      s.visits[d.fid] = null;  // 다녀왔으니 방문일을 비운다
      DB.log(`지킴이 점검 냄 · ${FACTORIES[d.fid].name}`);
      s.draft = null;
    });
    UI.sentFresh = true;
    R.go('sent/first/' + d.fid);
  },
  // 재점검 (2026-10-13) — 같은 답을 다시 누르면 푼다
  // 개선 관리 (2026-10-26) — 정리 화면
  kzOn({ id }) { UI.kzOn = id; render(); },
  ivPh({ id, v }) { const [side, j] = v.split(':'); sheet({ type: 'ivph', id, side, j: +j }); },
  ivPhStep({ v }) { UI.sheet.j += +v; render(); },
  kzFx({ id }) { const open = !(UI.kzFx || {})[id], el = document.querySelector(`.kzfx[data-id="${id}"]`); UI.kzFx = { ...(UI.kzFx || {}), [id]: open };
    if (!el) { render(); return; }
    el.classList.toggle('on', open); el.querySelector('.kzfxh').setAttribute('aria-expanded', open); },
  kzSt({ id, v }) { DB.act((s) => { const it = kzItem(s, id); if (!it) return; it.st = v;
    // 제출 전 확인에서 바꾸면 판정 기록(마지막 재점검 줄 · 고쳐진 수)도 같이 (2026-10-26 저녁)
    const ins = kzIns(s, UI.kzIns); if (!toSub(ins)) return;
    const l = [...(it.log || [])].reverse().find((y) => y.t === 'recheck'); if (l) l.result = v === 'ok' ? 'fixed' : 'not';
    if (ins.final) ins.final.fixed = kzList(ins).filter((y) => itemState(y) === 'fixed').length; }); },
  kzGal({ id, v }) { const it = kzItem(DB.s, id), l = it && ((v === 'after' ? it.after : it.photos) || []);
    if (!it) return; if (l.length >= FIND_MAX) { toast(`사진은 ${FIND_MAX}장까지예요`); return; }
    galOpen({ ins: UI.kzIns, it: id, side: v }); },  // 누른 그 순간에 열어야 폰이 막지 않는다
  kzRiskOpen({ id }) { sheet({ type: 'kzrisk', id, risks: [...(kzItem(DB.s, id).risks || [])] }); },
  kzRiskDel({ id, v }) { DB.act((s) => { const it = kzItem(s, id); if (it) it.risks = (it.risks || []).filter((r) => r !== v); }); },
  kzRiskSave() { const { id, risks } = UI.sheet; UI.sheet = null; DB.act((s) => { const it = kzItem(s, id); if (it) it.risks = RISKS.filter((r) => risks.includes(r)); }); },
  // 공장에 전송 — 개선완료로 둔 건은 고쳐진 것으로 적고 나머지만 공장이 고친다. 다 개선완료면 보내지 않고 개선완료로 끝낸다
  sendFac({ id }) {
    let all = false; const was = toSend(DB.s.inspections.find((i) => i.id === id));  // 보낼 것이면 전송, 시정 중이면 고친 것 저장
    DB.act((s) => { const ins = s.inspections.find((i) => i.id === id); if (!ins) return;
      const fs = ins.items.filter((x) => x.src === 'find'); all = fs.length > 0 && fs.every((x) => x.st === 'ok');
      fs.filter((x) => x.st === 'ok' && itemState(x) !== 'fixed').forEach((x) => x.log.push({ t: 'recheck', at: '9/17', result: 'fixed', by: ME, onSite: true }));
      if (ins.toFac === false) ins.toFac = '9/17';
      if (all) { ins.result = '점검완료'; ins.final = { from: '개선 관리', at: '9/17', by: ME, fixed: fs.length, total: fs.length }; }
      DB.log(`지킴이 ${all ? '개선완료 저장' : '개선 요청 보냄'} · ${FACTORIES[ins.fid].name}`); });
    toast(all ? '개선완료로 저장했어요' : was ? '공장에 보냈어요' : '저장했어요'); UI.td = 'rck'; UI.rsub = all ? 'sub' : 'fix'; UI.kzOn = null; R.go('todo');
  },
  // 판정 — 점검 결과(점검완료 · 패트롤 · 기타)를 고르고 저장. 공장이 고칠 것마다 개선여부 개선완료면 고쳐짐, 나머지는 안 고쳐짐 (2026-10-26)
  kzRes({ v }) { UI.kzRes = UI.kzRes === v ? null : v; render(); },
  kzJudge({ id }) {
    const ins = DB.s.inspections.find((i) => i.id === id), res = UI.kzRes;
    if (!res) { toast('점검 결과를 골라 주세요'); return; }
    const data = { kind: 'recheck', insId: id, fid: ins.fid, by: ME, result: res,
      results: toFix(ins).map((it) => ({ itemId: it.id, result: it.st === 'ok' ? 'fixed' : 'not', photo: !!((it.after || []).length || (rckFix(it) || {}).photo) })) };
    DB.act((s) => {
      const i2 = s.inspections.find((i) => i.id === id);  // 개선완료로 안 둔 것은 판정하면 미개선 (2026-10-26 — 기한이 지나 사진 없이 판정하는 것도)
      toFix(i2).filter((it) => it.st !== 'ok').forEach((it) => { it.st = 'no'; });
      if (s.net.guard) applyInspection(s, data); else s.outbox.guard.push({ type: 'inspection', data });
      DB.log(`지킴이 재점검 판정 · ${FACTORIES[ins.fid].name} ${res}`);
    });
    UI.kzRes = null; UI.kzOn = null; UI.sentFresh = true;
    R.go('sent/recheck/' + ins.fid);
  },
  // 제출할 것 (2026-10-26 저녁) — 기업 구분 고르기, 제출. 조언을 안 적었으면 잠긴 단추 — 누르면 까닭
  advCls({ id, v }) { DB.act((s) => { const g = kzIns(s, id); if (g) g.adv = { ...advOf(g), cls: v }; }); },
  tmpSave(_, el) {
    const b = $('.gtmp') || el; if (!b) return;
    clearTimeout(UI.tmpT);
    b.classList.add('done'); b.innerHTML = `<span class="c">${I('check', 13)}</span>저장됨`;
    UI.tmpT = setTimeout(() => { const x = $('.gtmp.done'); if (x) { x.classList.remove('done'); x.innerHTML = `${I('save', 17)}임시저장`; } }, 2000);
  },
  subGo({ id }) {
    const ins = kzIns(DB.s, id); if (!ins || !toSub(ins)) return;
    if (!advOf(ins).text.trim()) { toast('개선을 위한 조언을 적어 주세요'); if (R.path()[2] !== 'end') R.go(`sub/${id}/end`); return; }
    DB.act((s) => { const g = kzIns(s, id); if (!g) return; g.adv = advOf(g); g.sub = { at: '9/17', by: ME }; DB.log(`지킴이 제출 · ${FACTORIES[g.fid].name}`); });
    UI.td = 'rck'; UI.rsub = 'sub'; UI.sentFresh = true; R.go('sent/sub/' + ins.fid);  // 점검 마치기 · 판정 저장과 같은 낸 뒤 화면 (2026-10-27 사용자 지시 — 전엔 알림 띠만)
  },
  pickReason({ v }) { keepSheetText(); UI.sheet.reason = UI.sheet.reason === v ? null : v; render(); },
};

(async () => {
  await DB.ready;
  if (DB.remote) {
    try { const r = await fetch('api/me?app=guard'); if (r.ok) setAccount(await r.json()); } catch (e) {}
  } else setAccount({ login: 'guard1', name: '김지킴', org: TEAM.name });  // 서버 없이 열면 로그인할 곳이 없어 김지킴으로 들어간다
  wire(ACTS, render);
})();
