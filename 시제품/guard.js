// 지킴이 앱 — 시안 G1~G9. 로그인한 사람은 김지킴(전기 1조 조원)이다.
// 2026-09-22 기존 웹 방식: 조·권역, 34문항 판, 운영자 제출 검사(승인·반려), 주간 보고.
const ME = '김지킴';
const UI = { sheet: null, aiTimer: null, only: false, fold: {}, area: null, areas: [], pin: null, sort: 'near', calM: 9, calD: null, fq: '', fst: 'all' };
const SRC = { base: '기본', prev: '지난번 미흡 항목', ai: 'AI 제안', self: '직접 추가' };

function tasks(s) {
  const t = [];
  // 반려된 점검이 맨 위 — 고쳐서 다시 내야 한다 (2026-09-22). 다시 낸 것이 아직 안 올라갔으면 빼 둔다
  s.inspections.filter((i) => i.st === 'back' && TEAM.members.includes(i.by)
    && !s.outbox.guard.some((m) => m.data.redo === i.id)).forEach((ins) => t.push({ fid: ins.fid, kind: 'back', ins }));
  // 가야 할 곳 (2026-09-22 — 재점검을 따로 두지 않는다): 공장주가 "고쳤어요"를 누른 미흡이 있는 곳, 아직 점검 안 한 배정 공장.
  // 어느 쪽이든 할 일은 "점검" 하나이고, 지난번 미흡(prev개)이 있으면 그 점검 체크리스트에 따로 붙는다
  ['daesung', 'dongbang', 'hanbit', 'taegwang'].forEach((fid) => {
    if (t.some((x) => x.fid === fid) || s.outbox.guard.some((m) => m.data.fid === fid)) return;
    if (recheckQueue(s, fid).length || !s.inspections.some((i) => i.fid === fid)) t.push({ fid, kind: 'visit', prev: openIssues(s, fid).length });
  });
  return t;
}
// 앱 머리글 + 위치 띠 — 웹과 같은 결
const bar = () => appBar('안전지킴이', '산업안전지킴이', `<button class="me" data-go="soon/me">${ME} ›</button>`);
const head = (title, go = '', end = '') => `<div class="apptop">${band(title, go, end)}${bar()}</div>`;
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
// 반려된 점검은 어느 탭에서든 맨 위 (가장 먼저 처리할 일이 아래로 묻히지 않게)
function sortTasks(s, t, mode = 'near') {
  const backFirst = (a, b) => (b.kind === 'back') - (a.kind === 'back');
  const near = (a, b) => kmTo(FACTORIES[a.fid].ll) - kmTo(FACTORIES[b.fid].ll);
  const date = (a, b) => { const x = whenKey(s.visits[a.fid]), y = whenKey(s.visits[b.fid]); return x === y ? 0 : x < y ? -1 : 1; };
  return [...t].sort((a, b) => backFirst(a, b) || (mode === 'date' ? date(a, b) || near(a, b) : near(a, b)));
}
// 임시 사진 — 공장 건물 그림 (실제 사진이 들어갈 자리)
const PHOTO = { daesung: ['#cfdbea', '#7f94b3'], hanbit: ['#d6e5d3', '#7e9d79'], dongbang: ['#eadfce', '#a88f6c'], taegwang: ['#dcd9ec', '#8b84b5'],
  saehan: ['#d3e3ec', '#6f97ad'], ujin: ['#ece0e6', '#b0879a'], seongwon: ['#e4e4dc', '#9a9a7c'], donghwa: ['#dfe7f2', '#8a9fc0'], hangyeol: ['#e3eadf', '#8fa482'], mirae: ['#efe6d8', '#b59a73'] };
function facPhoto(fid) {
  const [sky, wall] = PHOTO[fid] || ['#dde3ea', '#98a3b3'];
  return `<svg class="fph" viewBox="0 0 120 88" role="img" aria-label="공장 사진 (임시)"><rect width="120" height="88" fill="${sky}"/>
    <rect x="96" y="12" width="7" height="24" fill="#6b7280"/><path d="M8 72V42l18-11v11l18-11v11l18-11v41z" fill="${wall}"/>
    <rect x="62" y="32" width="46" height="40" fill="${wall}" opacity=".8"/>
    ${[70, 82, 94].map((x) => `<rect x="${x}" y="40" width="8" height="8" fill="#fff" opacity=".75"/>`).join('')}
    <rect x="18" y="56" width="16" height="16" fill="#fff" opacity=".55"/><rect x="0" y="72" width="120" height="16" fill="#b9bfc8"/></svg>`;
}
// 공장 카드 — 사진 · 이름 + 상태 · 위치 · 거리 · 방문일 · 그 상태에 맞는 단추 하나
function fcard(s, x) {
  const f = FACTORIES[x.fid], v = s.visits[x.fid];
  const go = `${I('chevron', 16)}`;
  const btn = x.kind === 'back' ? `<button class="fbtn" data-act="redo" data-id="${x.ins.id}">고쳐서 다시 내기 ${go}</button>`
    : !v ? `<button class="fbtn line" data-act="date" data-fid="${x.fid}">방문일 정하기 ${go}</button>`
    // 방문일이 있으면 "일정 변경"을 점검 시작 옆에 나란히 — 날짜 줄 끝의 글자 링크는 단추로 안 보였다 (2026-09-22 사용자 지시)
    : `<div class="fbtns"><button class="fbtn" data-act="newDraft" data-fid="${x.fid}">점검 시작 ${go}</button>
      <button class="fbtn line fsub" data-act="date" data-fid="${x.fid}">${I('calendar', 15)} 일정 변경</button></div>`;
  const when = x.kind === 'back' ? `<div class="fwhen">${x.ins.back.at} 운영자 반려</div><div class="fwhen note">${esc(x.ins.back.note)}</div>`
    : v ? `<div class="fwhen${v.startsWith('오늘') ? ' now' : ''}">${I('calendar', 14)} ${v} 방문</div>`
    : '<div class="fwhen none">방문일 안 정함</div>';
  return `<div class="fcard">
    <button class="fphw" data-go="pre/${x.fid}" aria-label="${f.name} 자세히">${facPhoto(x.fid)}</button>
    <div class="fbody">
      <div class="fnm"><button class="fname" data-go="pre/${x.fid}">${f.name}</button>${x.kind === 'back' ? '<span class="ftag t-back">반려</span>' : ''}</div>
      <div class="floc">화성시 ${f.dong}</div>
      <div class="fmeta">${kmTo(f.ll).toFixed(1)}km</div>
      ${when}${btn}
    </div></div>`;
}
function home(s) {
  locate();
  const all = tasks(s), nToday = all.filter((x) => (s.visits[x.fid] || '').startsWith('오늘')).length;
  const t = sortTasks(s, all.filter((x) => inAreas(x.fid) && matchQ(x.fid)), UI.sort);
  const nAll = Object.keys(FACTORIES).filter((fid) => TEAM.areas.includes(FACTORIES[fid].area)).length;
  return `${sbar(s.net.guard ? '지킴이' : '📶 전파 없음')}<div class="scr"><div class="bd">
    <div class="apptop"><div class="head"><span class="hm" style="display:inline-flex;align-items:center;justify-content:center">⌂</span><span class="crumb">홈</span><span class="end small">${TEAM.name}</span></div>${bar()}</div>
    <div class="ghello"><span class="gav">${I('user', 30)}</span><div>
      <span class="ghdate">9월 17일 목요일</span><b>안녕하세요, ${ME}님</b>
      <button class="ghtoday${nToday ? '' : ' none'}" data-act="calToday">${I('calendar', 14)} ${nToday ? `오늘 방문 ${nToday}곳` : '오늘 방문 없음'} ${I('chevron', 14)}</button></div>
      ${s.net.guard ? '' : `<span class="live off"><i></i>전파 없음</span>`}</div>
    ${unsentN(s) ? `<div class="warnbar"><span class="ic">${I('clock', 22)}</span><div><div class="mid">아직 안 올라간 점검 ${unsentN(s)}건</div><div class="small">전파가 잡히면 저절로 올라가요</div></div></div>` : ''}
    ${recentVisit(s)}
    ${findBox()}
    ${areaChips((a) => all.filter((x) => FACTORIES[x.fid].area === a).length)}
    <div class="gtabs" role="tablist">${SORTS.map(([k, w]) => `<button class="gtab${UI.sort === k ? ' on' : ''}" role="tab" aria-selected="${UI.sort === k}" data-act="sort" data-v="${k}">${w}</button>`).join('')}</div>
    ${t.map((x) => fcard(s, x)).join('') || `<div class="stat"><div class="mid">${UI.areas.length || UI.fq.trim() ? '조건에 맞는 할 일이 없어요' : '할 일이 없어요'}</div></div>`}
    <button class="hall" data-go="factories">${I('factory', 18)} 공장 전체보기<em>${nAll}곳</em>${I('chevron', 18)}</button>
    <div class="proto">가상 데이터와 임시 사진으로 만든 시제품이에요</div>
  </div></div>${UI.sheet && UI.sheet.type === 'date' ? dateSheet(s) : ''}`;
}

// 최근 방문한 곳 — 참고 앱의 "최근방문매장" 자리. 내가 마지막으로 점검한 곳과 그 점검의 상태 (2026-09-22)
function recentVisit(s) {
  const ins = s.inspections.find((i) => i.by === ME);
  if (!ins) return `<div class="gvisit"><div class="gvt">최근 방문한 곳</div><div class="gvsub">아직 점검한 곳이 없어요</div>${homeActs(s)}</div>`;
  const f = FACTORIES[ins.fid], [m, d] = ins.date.split('/').map(Number);
  // 점검한 날은 제목 줄 오른쪽에 — "언제 갔던 곳"이 먼저 읽히게 (2026-09-22 사용자: 승인 표시·문제 수 빼고 날짜 자리 옮김)
  return `<div class="gvisit"><div class="gvt">최근 방문한 곳<span class="gvdate">${I('calendar', 15)} ${m}월 ${d}일 (${WD[new Date(TODAY.y, m - 1, d).getDay()]})</span></div>
    <div class="gvrow"><div class="gvtx">
      <div class="gvkm">${I('pin', 15)} ${kmTo(f.ll).toFixed(1)}km</div>
      <b>${f.name}</b><div class="gvsub">화성시 ${f.dong}</div>
      <button class="fbtn gvbtn" data-go="pre/${ins.fid}">공장 보기 ${I('chevron', 16)}</button></div>
      <button class="gvph" data-go="pre/${ins.fid}" aria-label="${f.name}">${facPhoto(ins.fid)}</button></div>${homeActs(s)}</div>`;
}
// 파란 칸 아래쪽의 작은 단추 둘 — 보고서 쓰기 · 점검 결과 보기 (가로로 나란히)
function homeActs(s) {
  const done = (s.weekly || {})[WEEK.key];
  const mine = s.inspections.filter((i) => i.by === ME), n = (st) => mine.filter((i) => (i.st || 'ok') === st).length;
  const badge = n('back') ? `<em class="warn">반려 ${n('back')}</em>` : n('wait') ? `<em>대기 ${n('wait')}</em>` : '';
  return `<div class="gacts">
    <button class="gact" data-go="weekly">${I('list', 17)}${done ? '주간 보고 냄' : '주간 보고 쓰기'}</button>
    <button class="gact" data-go="records">${I('folder', 17)}점검 결과 보기${badge}</button></div>`;
}

/* ---------- G10 캘린더 (2026-09-22 사용자 요청) ----------
   따로 예약 목록을 두지 않고 방문일(s.visits)에서 바로 그린다 — 홈이든 여기든 날짜를 정하면 그 칸에 저절로 올라간다.
   반려는 방문이 아니라서 달력에 올리지 않는다. 이야기 속 오늘은 2026-09-17(목). */
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
  const y = TODAY.y, m = UI.calM, t = tasks(s).filter((x) => x.kind !== 'back');
  const byDay = {};
  t.forEach((x) => { const v = visitDay(s.visits[x.fid]); if (v && v.m === m) (byDay[v.d] = byDay[v.d] || []).push(x); });
  Object.values(byDay).forEach((l) => l.sort((a, b) => whenKey(s.visits[a.fid]) - whenKey(s.visits[b.fid])));
  const first = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate();
  const sel = UI.calD || (m === TODAY.m ? TODAY.d : 1);
  const cells = [...Array(first).fill(''), ...Array.from({ length: days }, (_, i) => i + 1)].map((d, i) => {
    if (!d) return '<span class="cday blank"></span>';
    const l = byDay[d] || [], dow = i % 7;
    return `<button class="cday${dow === 0 ? ' sun' : dow === 6 ? ' sat' : ''}${m === TODAY.m && d === TODAY.d ? ' today' : ''}${d === sel ? ' sel' : ''}" data-act="calDay" data-v="${d}" aria-label="${m}월 ${d}일${l.length ? ` 점검 ${l.length}곳` : ''}">
      <span class="cn">${d}</span><span class="cdots">${l.slice(0, 3).map((x) => `<i class="k-${x.prev ? 'prev' : 'visit'}"></i>`).join('')}${l.length > 3 ? `<em>+${l.length - 3}</em>` : ''}</span></button>`;
  }).join('');
  const day = byDay[sel] || [], dow = new Date(y, m - 1, sel).getDay();
  const undated = t.filter((x) => !s.visits[x.fid]);
  return `${sbar('지킴이')}<div class="scr"><div class="bd">
    ${head('캘린더', '', `<span class="small">${TEAM.name}</span>`)}
    <div class="calh"><button class="cmv" data-act="calM" data-v="-1" aria-label="이전 달">${I('back', 20)}</button><b>${y}년 ${m}월</b>
      <button class="cmv nx" data-act="calM" data-v="1" aria-label="다음 달">${I('back', 20)}</button></div>
    <div class="cgrid">${WD.map((w, i) => `<span class="cwd${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}">${w}</span>`).join('')}${cells}</div>
    <div class="gleg"><span><i class="k-prev"></i>미흡 확인 있음</span><span><i class="k-visit"></i>점검</span></div>
    <div class="cdh">${m}월 ${sel}일 ${WD[dow]}요일${m === TODAY.m && sel === TODAY.d ? tg('오늘', 'now') : ''}<em>${day.length}곳</em></div>
    ${day.map((x) => fcard(s, x)).join('') || '<div class="cnone">이 날 잡힌 점검이 없어요</div>'}
    ${undated.length ? `<div class="cdh">날짜 안 정한 곳<em>${undated.length}곳</em></div>
      <div class="cund">${undated.map((x) => `<div class="cundr"><span><b>${FACTORIES[x.fid].name}</b><small>화성시 ${FACTORIES[x.fid].dong}</small>${x.prev ? tg(`미흡 ${x.prev}`, 'warn') : ''}</span>
        <button class="fbtn line" data-act="date" data-fid="${x.fid}">날짜 정하기</button></div>`).join('')}</div>` : ''}
  </div></div>${UI.sheet && UI.sheet.type === 'date' ? dateSheet(s) : ''}`;
}

/* ---------- G8 공장 (하단바, 2026-09-22 사용자 요청) ----------
   우리 조 권역의 공장 전부 — 할 일이 없는 곳(점검 끝난 곳, 이번에 배정 안 된 곳)도 나온다. 홈은 "할 일"만.
   찾기 · 권역 · 할 일 있음/없음으로 거르고, 가까운 순. 누르면 회사 창. */
const mdNum = (d) => { const m = String(d || '').match(/(\d+)\/(\d+)/); return m ? +m[1] * 100 + +m[2] : 0; };
const lastIns = (s, fid) => s.inspections.filter((i) => i.fid === fid).sort((a, b) => mdNum(b.date) - mdNum(a.date))[0];
function facRow(s, fid, tk) {
  const f = FACTORIES[fid], li = lastIns(s, fid);
  const now = tk.map((x) => (x.kind === 'back' ? tg('반려', 'warn') : tg('점검 예정', 'now') + (x.prev ? tg(`미흡 ${x.prev}`, 'warn') : ''))).join('');
  return `<button class="fcard fall" data-go="pre/${fid}">
    <span class="fphw">${facPhoto(fid)}</span>
    <span class="fbody"><span class="fname">${f.name}</span><span class="floc">화성시 ${f.dong}</span><span class="fmeta">${kmTo(f.ll).toFixed(1)}km</span>
      <span class="fwhen${li ? '' : ' none'}">${li ? `마지막 점검 ${li.date} ${tg(ST_WORD[li.st || 'ok'], 's-' + (li.st || 'ok'))}` : '점검 기록 없음'}</span>
      ${now ? `<span class="fwhen">${now}</span>` : ''}</span>
    <span class="gchev">${I('chevron', 18)}</span></button>`;
}
function factoriesScreen(s) {
  locate();
  const t = tasks(s), tk = (fid) => t.filter((x) => x.fid === fid);
  const team = Object.keys(FACTORIES).filter((fid) => TEAM.areas.includes(FACTORIES[fid].area)), inTeam = team.filter(inAreas);
  const nTodo = inTeam.filter((f) => tk(f).length).length;
  const q = UI.fq.trim();
  const list = inTeam.filter((f) => (UI.fst === 'todo' ? tk(f).length : UI.fst === 'none' ? !tk(f).length : true))
    .filter(matchQ)
    .sort((a, b) => kmTo(FACTORIES[a].ll) - kmTo(FACTORIES[b].ll));
  return `${sbar('지킴이')}<div class="scr"><div class="bd">
    ${head('공장 전체보기', '', `<span class="small">${TEAM.name}</span>`)}
    ${findBox()}
    ${areaChips((a) => team.filter((f) => FACTORIES[f].area === a).length)}
    <div class="fst">${[['all', `전체 ${inTeam.length}`], ['todo', `할 일 있음 ${nTodo}`], ['none', `할 일 없음 ${inTeam.length - nTodo}`]].map(([k, w]) => `<button class="${UI.fst === k ? 'on' : ''}" data-act="fst" data-v="${k}">${w}</button>`).join('')}</div>
    ${list.map((fid) => facRow(s, fid, tk(fid))).join('') || `<div class="cnone">${q ? `"${esc(q)}"에 맞는 공장이 없어요` : '공장이 없어요'}</div>`}
  </div></div>`;
}
// 찾기 칸과 권역 칩 — 홈과 공장 전체보기가 같이 쓴다 (2026-09-22 사용자 지시: 공장 탭을 없애고 찾기·권역을 홈으로).
// 권역은 누를 때마다 켜고 끄는 토글이고 여러 개 켤 수 있다. 하나도 안 켜면 전체
const inAreas = (fid) => !UI.areas.length || UI.areas.includes(FACTORIES[fid].area);
const matchQ = (fid) => { const q = UI.fq.trim(); return !q || FACTORIES[fid].name.includes(q) || FACTORIES[fid].dong.includes(q); };
const findBox = () => `<input class="input hfind" id="fq" type="search" placeholder="공장 이름이나 동으로 찾기" value="${esc(UI.fq)}" autocomplete="off">`;
const areaChips = (n) => `<div class="htgs" role="group" aria-label="권역">${TEAM.areas.map((a) => { const on = UI.areas.includes(a);
  return `<button class="htg${on ? ' on' : ''}" data-act="areaT" data-v="${a}" aria-pressed="${on}">${on ? I('check', 14) : ''}${a}<em>${n(a)}</em></button>`; }).join('')}</div>`;
// 찾기 칸 — 한글을 조합하는 동안에는 다시 그리지 않는다 (그리면 글자가 끊긴다)
document.addEventListener('input', (e) => { if (e.target.id === 'fq' && !e.isComposing) { UI.fq = e.target.value; render(); } });
document.addEventListener('compositionend', (e) => { if (e.target.id === 'fq') { UI.fq = e.target.value; render(); } });

/* ---------- 지도 (하단바) — 예전 내 할 일의 지도 보기를 옮겼다 ---------- */
function mapScreen(s) {
  const list = sortTasks(s, tasks(s)).filter((x) => !UI.area || FACTORIES[x.fid].area === UI.area);
  return `${sbar('지킴이')}<div class="scr"><div class="bd">
    ${head('지도', '', `<span class="small">${list.length}곳</span>`)}
    <div class="seg">${['전체', ...TEAM.areas].map((a) => `<button class="${(UI.area || '전체') === a ? 'on' : ''}" data-act="area" data-v="${a}">${a}</button>`).join('')}</div>
    ${taskMap(s, list, (x) => fcard(s, x))}
  </div></div>${UI.sheet && UI.sheet.type === 'date' ? dateSheet(s) : ''}`;
}
// 하단바 — 첫 단계 화면에만 붙는다 (점검 도중에는 없음)
const NAV = [['', '홈', 'home'], ['cal', '캘린더', 'calendar'], ['map', '지도', 'pin'], ['weekly', '주간 보고', 'list'], ['soon/me', '내 정보', 'user']];  // 공장 탭은 빼고 홈의 "공장 전체보기"로 (2026-09-22)
const gnav = (on) => `<nav class="gnav" aria-label="메뉴">${NAV.map(([go, w, ic]) => `<button class="${on === go ? 'on' : ''}" data-go="${go}"${on === go ? ' aria-current="page"' : ''}>${I(ic, 22)}<span>${w}</span></button>`).join('')}</nav>`;
/* ---------- G2-가 내 할 일 · 지도 (2026-09-22) ----------
   권역 테두리는 geo.js(화성시 읍·면·동 경계)로 직접 그린다. 네이버 지도 키가 오면 그 위에 지도를 깐다 — 키가 없거나
   신호가 약해도 테두리와 핀은 보이게 하려는 것이다. 핀은 할 일 종류마다 모양과 말이 다르다(색만으로 가르지 않는다). */
const KIND = { back: '반려', prev: '미흡', visit: '점검' };
const pinKind = (x) => (x.kind === 'back' ? 'back' : x.prev ? 'prev' : 'visit');
const MAPK = Math.cos(37.15 * Math.PI / 180), MAP_AR = 11 / 10;  // 경도 줄임 · 지도 칸 가로:세로
const mxy = ([x, y]) => [x * MAPK * 1000, -y * 1000];
const ringArea = (r) => Math.abs(r.reduce((a, c, i) => { const n = r[(i + 1) % r.length]; return a + c[0] * n[1] - n[0] * c[1]; }, 0)) / 2;
// 범위를 잡을 때는 큰 땅덩이만 본다 — 섬 몇 개 때문에 지도가 작아지지 않게
const mainPolys = (d) => { const big = Math.max(...d.polys.map((p) => ringArea(p[0]))); return d.polys.filter((p) => ringArea(p[0]) >= big * 0.2); };
function bboxOf(names) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  HWASEONG.filter((h) => names.includes(h.name)).forEach((h) => mainPolys(h).forEach((p) => p[0].forEach((c) => {
    const [x, y] = mxy(c); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); })));
  return { x0, y0, x1, y1 };
}
function taskMap(s, list, cardOf) {
  const mine = (nm) => TEAM.areas.find((a) => TEAM.dongs[a].includes(nm));
  const focus = UI.area ? TEAM.dongs[UI.area] : TEAM.areas.flatMap((a) => TEAM.dongs[a]);
  // 보여 줄 범위 — 고른 권역(없으면 우리 조 권역 전체)에 맞추고 지도 칸 비율로 늘린다
  const { x0, y0, x1, y1 } = bboxOf(focus);
  let w = (x1 - x0) * 1.12, h = (y1 - y0) * 1.18;
  if (w / h > MAP_AR) h = w / MAP_AR; else w = h * MAP_AR;
  const vx = (x0 + x1) / 2 - w / 2, vy = (y0 + y1) / 2 - h / 2;
  const pct = (ll) => { const [x, y] = mxy(ll); return [((x - vx) / w) * 100, ((y - vy) / h) * 100]; };
  const path = (polys) => polys.map((p) => p.map((r) => 'M' + r.map((c) => mxy(c).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z').join('')).join('');
  // 우리 권역은 맨 나중에 그려 이웃 동의 회색 선에 덮이지 않게 한다
  const shapes = [...HWASEONG].sort((a, b) => !!mine(a.name) - !!mine(b.name)).map((d) => {
    const a = mine(d.name), on = a && (!UI.area || UI.area === a);
    return `<path d="${path(d.polys)}" class="${a ? (on ? 'mine on' : 'mine') : ''}"${a ? ` data-act="area" data-v="${a}"` : ''}><title>${d.gu} ${d.name}</title></path>`;
  }).join('');
  // 권역 이름 — 권역 가장자리 안쪽에서 핀을 피해 자리를 고른다 (위 → 아래 → 왼쪽 → 오른쪽)
  const pinBox = list.map((x) => { const [l, t] = pct(FACTORIES[x.fid].ll); return [l - 8, t - 14, l + 8, t + 1]; });
  const labels = TEAM.areas.map((a) => {
    const b = bboxOf(TEAM.dongs[a]);
    const L = ((b.x0 - vx) / w) * 100, Rt = ((b.x1 - vx) / w) * 100, T = ((b.y0 - vy) / h) * 100, B = ((b.y1 - vy) / h) * 100;
    const cx = (L + Rt) / 2, cy = (T + B) / 2;
    const spot = [[cx, T + 6], [cx, B - 5], [L + 7, cy], [Rt - 7, cy]].find(([l, t]) => l > 5 && l < 95 && t > 4 && t < 96
      && !pinBox.some(([a0, b0, a1, b1]) => l + 6 > a0 && l - 6 < a1 && t + 3.5 > b0 && t - 3.5 < b1));
    return spot ? `<span class="glab" style="left:${spot[0]}%;top:${spot[1]}%">${a}</span>` : '';
  }).join('');
  const pins = list.map((x) => { const [l, t] = pct(FACTORIES[x.fid].ll); return pinHtml(s, x, `left:${l}%;top:${t}%`); }).join('');
  const sel = list.find((x) => x.fid === UI.pin);
  const tail = `<div class="gleg"><span><i class="k-back"></i>반려</span><span><i class="k-prev"></i>미흡 확인 있음</span><span><i class="k-visit"></i>점검</span><span><i class="today"></i>오늘 방문</span></div>
    ${sel ? cardOf(sel) : `<div class="small">${list.length ? '핀을 누르면 그 공장이 아래에 나와요' : `${UI.area ? UI.area + '에는 ' : ''}할 일이 없어요`}</div>`}
    <div class="small gsrc">경계 자료: 통계청 SGIS, vuski/admdongkor (CC BY 4.0)</div>`;
  nvLoad();
  if (NV.st === 'ready') { UI.nvArgs = { list, focus }; return `<div class="gmap nv" id="nvSlot"></div>${tail}`; }
  return `${NV.st === 'fail' ? '<div class="small">네이버 지도를 불러오지 못해 그림 지도로 보여요</div>' : ''}<div class="gmap"><svg viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${shapes}</svg>${labels}${pins}</div>
    ${tail}`;
}
// 핀 하나 — 그림 지도에서는 자리(style)를 받아 버튼으로, 네이버 지도에서는 마커 속 내용으로 쓴다
function pinHtml(s, x, style) {
  const k = pinKind(x), f = FACTORIES[x.fid], cls = `gpin k-${k}${(s.visits[x.fid] || '').startsWith('오늘') ? ' today' : ''}${UI.pin === x.fid ? ' sel' : ''}`;
  const inner = `<i>${KIND[k]}</i><b>${f.name}</b>`;
  return style ? `<button class="${cls}" style="${style}" data-act="pin" data-fid="${x.fid}" aria-label="${f.name} ${KIND[k]}">${inner}</button>`
    : `<div class="nvpin"><span class="${cls}">${inner}</span></div>`;
}

/* ---------- 네이버 지도 (2026-09-22) — mapkey.js에 Client ID가 있으면 그림 지도 대신 깐다 ----------
   못 불러오거나(신호 없음) 인증이 막히면 그림 지도로 남는다. 지도 한 벌을 계속 다시 쓴다 —
   화면을 새로 그릴 때마다 지도를 새로 만들면 깜박이고 사용량이 는다. */
const NV = { st: 'none', el: null, map: null, marks: [], fit: null };  // st: none · loading · ready · fail
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
  HWASEONG.filter((h) => names.includes(h.name)).forEach((h) => mainPolys(h).forEach((p) => p[0].forEach(([x, y]) => {
    w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); })));
  return { w, s, e, n };
}
function nvMount() {
  const slot = $('#nvSlot'); if (!slot || !UI.nvArgs) return;
  const N = naver.maps, { list, focus } = UI.nvArgs;
  const area = (nm) => TEAM.areas.find((a) => TEAM.dongs[a].includes(nm)) || '';
  if (!NV.map) {
    NV.el = document.createElement('div'); NV.el.className = 'nvmap'; slot.appendChild(NV.el);
    NV.map = new N.Map(NV.el, { mapDataControl: false, scaleControl: false, zoomControl: true,
      zoomControlOptions: { position: N.Position.TOP_RIGHT, style: N.ZoomControlStyle.SMALL } });
    NV.map.data.addGeoJson({ type: 'FeatureCollection', features: HWASEONG.map((d) => ({ type: 'Feature',
      properties: { name: d.name, area: area(d.name) }, geometry: { type: 'MultiPolygon', coordinates: d.polys } })) });
    NV.map.data.addListener('click', (e) => { const a = e.feature.getProperty('area'); if (a) ACTS.area({ v: a }); });
  } else { slot.appendChild(NV.el); NV.map.refresh(true); }
  NV.map.data.setStyle((f) => {
    const a = f.getProperty('area'), on = a && (!UI.area || UI.area === a);
    return a ? { fillColor: '#2458d6', fillOpacity: on ? 0.14 : 0.05, strokeColor: '#2458d6', strokeWeight: on ? 3 : 1.5, strokeOpacity: on ? 0.95 : 0.5, clickable: true }
      : { fillOpacity: 0, strokeColor: '#6b7789', strokeWeight: 1, strokeOpacity: 0.45, clickable: false };
  });
  NV.marks.forEach((m) => m.setMap(null));
  NV.marks = list.map((x) => {
    const f = FACTORIES[x.fid];
    const m = new N.Marker({ map: NV.map, position: new N.LatLng(f.ll[1], f.ll[0]), title: f.name, icon: { content: pinHtml(DB.s, x) } });
    N.Event.addListener(m, 'click', () => ACTS.pin({ fid: x.fid }));
    return m;
  });
  const key = UI.area || '전체';  // 권역을 바꿀 때만 범위를 다시 맞춘다 — 핀을 누를 때마다 지도가 튀지 않게
  if (NV.fit !== key) {
    NV.fit = key; const b = bboxLL(focus);
    NV.map.fitBounds(new N.LatLngBounds(new N.LatLng(b.s, b.w), new N.LatLng(b.n, b.e)), { top: 44, right: 20, bottom: 16, left: 20 });
  }
}
// 방문일 정하기 — 달력에서 날짜를 누르고 오전/오후를 고른다 (2026-09-22 사용자 요청: 날짜 다섯 개 단추 → 달력).
// 지난 날은 못 고르고, 다른 공장 방문이 잡힌 날엔 막대가 뜬다. 저장하면 캘린더 탭에 바로 오른다(방문일에서 그리므로).
function dateSheet(s) {
  const sh = UI.sheet, f = FACTORIES[sh.fid], y = TODAY.y, m = sh.m;
  const first = new Date(y, m - 1, 1).getDay(), days = new Date(y, m, 0).getDate();
  const booked = {};
  tasks(s).forEach((x) => { const v = visitDay(s.visits[x.fid]); if (x.fid !== sh.fid && v && v.m === m) booked[v.d] = (booked[v.d] || 0) + 1; });
  const cells = [...Array(first).fill(0), ...Array.from({ length: days }, (_, i) => i + 1)].map((d, i) => {
    if (!d) return '<span class="cday blank"></span>';
    const past = m < TODAY.m || (m === TODAY.m && d < TODAY.d), dow = i % 7;
    return `<button class="cday${dow === 0 ? ' sun' : dow === 6 ? ' sat' : ''}${m === TODAY.m && d === TODAY.d ? ' today' : ''}${sh.pm === m && sh.d === d ? ' sel' : ''}${past ? ' dis' : ''}" data-act="pickD" data-v="${d}"${past ? ' disabled' : ''} aria-label="${m}월 ${d}일${booked[d] ? ` 다른 방문 ${booked[d]}곳` : ''}">
      <span class="cn">${d}</span><span class="cdots">${Array.from({ length: Math.min(3, booked[d] || 0) }, () => '<i class="k-visit"></i>').join('')}</span></button>`;
  }).join('');
  const picked = sh.d ? `${sh.pm}월 ${sh.d}일 (${WD[new Date(y, sh.pm - 1, sh.d).getDay()]})` : '';
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet dsheet"><div class="grip"></div>
    <div class="mid">${f.name} 방문 날짜</div>
    <div class="calh"><button class="cmv" data-act="sheetM" data-v="-1" aria-label="이전 달"${m <= TODAY.m ? ' disabled' : ''}>${I('back', 20)}</button><b>${y}년 ${m}월</b>
      <button class="cmv nx" data-act="sheetM" data-v="1" aria-label="다음 달">${I('back', 20)}</button></div>
    <div class="cgrid">${WD.map((w, i) => `<span class="cwd${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}">${w}</span>`).join('')}${cells}</div>
    <div class="lbl">시간</div>
    <div class="seg">${['오전', '오후'].map((d) => `<button class="${sh.tm === d ? 'on' : ''}" data-act="pickTm" data-v="${d}">${d}</button>`).join('')}</div>
    <div class="dpick${picked ? '' : ' none'}">${picked ? `${I('calendar', 16)} ${picked} ${sh.tm} 방문` : '달력에서 날짜를 골라 주세요'}</div>
    <div class="row"><button class="btn ghost cxl" data-act="closeSheet">취소</button><button class="btn" data-act="saveDate" ${sh.d ? '' : 'disabled'}>저장</button></div>
  </div>`;
}

/* ---------- G2-나 회사 창 (2026-09-20 — 점검 입구를 이 화면 하나로 모았다) ---------- */
// 약도 — 실제 지도가 아니다. 큰길과 공장 자리만 보여 주는 그림이다.
function miniMap(f) {
  return `<div class="map">
    <svg viewBox="0 0 320 150" aria-hidden="true">
      <rect width="320" height="150" fill="#edf1ec"/>
      <path d="M0 104h320" stroke="#d6dde6" stroke-width="20"/>
      <path d="M252 0v150" stroke="#d6dde6" stroke-width="15"/>
      <path d="M0 104h320" stroke="#fff" stroke-width="2" stroke-dasharray="11 11"/>
      <rect x="26" y="30" width="56" height="44" rx="5" fill="#e0e6ee"/>
      <rect x="276" y="26" width="40" height="50" rx="5" fill="#e0e6ee"/>
      <rect x="40" y="120" width="78" height="26" rx="5" fill="#e0e6ee"/>
      <rect x="120" y="28" width="76" height="52" rx="7" fill="#d5e2fb" stroke="#2458d6" stroke-width="2"/>
    </svg>
    <span class="pin">${I('pin', 20)}<b>${esc(f.name)}</b></span>
  </div>`;
}
// 지난번 미흡 항목 한 줄 설명 — 언제 문제였고, 그 뒤 공장주가 무엇을 했나
function prevNote(e) {
  const last = (e.it.log || []).slice(-1)[0];
  const next = last ? (last.t === 'fix' ? `${last.at} 공장주 "고쳤어요"${last.note ? `<br>"${esc(last.note)}"` : ''}` : last.result === 'not' ? `${last.at} 점검에서 안 고쳐짐` : '') : '공장주가 아직 안 고침';
  return `${e.ins.date} 문제 있음${next ? '<br>' + next : ''}`;
}
function pre(s, fid) {
  const f = FACTORIES[fid], q = openIssues(s, fid);
  const hist = s.alarms.filter((a) => !SIM.live(a) && alarmFid(a) === fid).slice(0, 2);
  const going = s.draft && s.draft.kind === 'first' && s.draft.fid === fid;  // 하던 점검이 있으면 지우지 않는다
  return `${sbar(f.name)}<div class="scr"><div class="bd">
    ${head(f.name, '', `<span class="small">${q.length ? `지난번 미흡 ${q.length}개` : '점검'}</span>`)}
    ${miniMap(f)}
    ${kv([['위치', `화성시 ${f.dong}`], ['업종', f.type], ['근로자', `${f.workers}명`], s.visits[fid] && ['방문', s.visits[fid]]])}
    <button class="maplink" data-act="openMap">${I('globe', 17)} 지도 앱으로 열기</button>
    ${q.length ? `<div><div class="lbl">지난번 미흡 항목 ${q.length}개</div><div class="small">이번 점검에 같이 봐요</div>
      ${q.map((e) => `<div class="q" style="margin-top:6px"><div class="t">${esc(e.it.text)}</div><div class="small">${prevNote(e)}</div></div>`).join('')}</div>`
      : ''}
    ${hist.length ? `<div><div class="lbl">최근 센서 이상 기록 ${hist.length}건</div>
      ${hist.map((a) => `<div class="q past" style="margin-top:6px"><div class="t">${a.day} ${esc(SIM.title(a))}</div><div class="small">${SIM.endWord(a)}${a.acks[0] ? `<br>울린 뒤 ${a.acks[0].at - a.start}분 만에 조치` : ''}</div></div>`).join('')}</div>` : ''}
  </div><div class="ft">
    <button class="btn" data-act="newDraft" data-fid="${fid}">${going ? '이어서 점검하기' : '점검 시작'}</button>
    <button class="btn ghost" data-act="aiFirst" data-fid="${fid}">${I('sparkle', 17)} AI 체크리스트 생성</button>
  </div></div>`;
}

/* ---------- G4 사진 · AI ---------- */
function photo(s) {
  const d = s.draft, f = FACTORIES[d.fid];
  return `${sbar(f.name)}<div class="scr"><div class="bd">
    ${head(f.name + ' 점검', 'pick')}
    <div class="mid">공장 안을 찍어 주세요</div>
    <div class="small">분전반, 전선, 콘센트 같은 곳을 찍어요<br><b class="ink">AI는 찍힌 것만 봐요</b></div>
    <div class="thumbs">${Array.from({ length: d.photos }, (_, i) => `<div class="thumb">사진 ${i + 1}</div>`).join('')}
      <button class="thumb" style="border:2px dashed var(--ink);background:#fff;font-size:22px" data-act="addPhoto">＋</button></div>
    <div class="small">${d.photos} / 10장</div>
  </div><div class="ft">
    <button class="btn" data-act="askAI" ${d.photos ? '' : 'disabled'}>AI에게 보내기</button>
    <button class="btn ghost" data-act="toList">기본 체크리스트로 돌아가기</button>
  </div></div>`;
}
function aiWait(s) {
  const d = s.draft;
  if (d.aiState === 'fail') {
    return `${sbar(FACTORIES[d.fid].name)}<div class="scr"><div class="bd">
      <div class="donemark" style="border-style:dashed">${I('alert', 38)}</div>
      <div class="center big">AI가 지금<br>답하지 않아요</div>
      <div class="center small">기본 체크리스트는 그대로 점검할 수 있어요. 찍은 사진은 점검 기록에 붙어요.</div>
    </div><div class="ft"><button class="btn" data-act="toList">기본 체크리스트로 점검하기</button><button class="btn ghost" data-act="askAI">다시 해 보기</button></div></div>`;
  }
  return `${sbar(FACTORIES[d.fid].name)}<div class="scr"><div class="bd">
    <div class="donemark">${I('sparkle', 38)}</div>
    <div class="center big">AI가 사진 ${d.photos}장을<br>보고 있어요</div>
    <div class="center small">보통 20초쯤 걸려요</div>
  </div><div class="ft"><button class="btn ghost" data-act="toList">기다리지 않고 기본 체크리스트로</button></div></div>`;
}
function pickScreen(s) {
  const d = s.draft, f = FACTORIES[d.fid];
  const nBase = CHECKLIST.areas.reduce((n, a) => n + a.items.length, 0);
  const nSel = d.ai.filter((x) => x.sel).length;
  const nPrev = openIssues(s, d.fid).length, total = nPrev + nBase + nSel + d.self.length;
  const asked = d.aiState === 'done';
  const answered = d.items.some((x) => x.answer);
  return `${sbar(f.name)}<div class="scr"><div class="bd" style="gap:8px">
    ${head(f.name + ' 점검', 'pre/' + d.fid)}
    ${nPrev ? `<div class="grp">지난번 미흡 항목<span class="must">${nPrev}개</span></div>
    ${openIssues(s, d.fid).map((e) => `<div class="item"><div class="bul">!</div><div><div class="t">${esc(e.it.text)}</div><div class="why">${prevNote(e)}</div></div></div>`).join('')}` : ''}
    <div class="grp">기본 체크리스트<span class="must">${CHECKLIST.ver}</span><span class="must">${nBase}문항</span></div>
    <div class="small">고르지 않아도 전부 점검해요</div>
    ${CHECKLIST.areas.map((a) => `<div class="item"><div class="bul">✓</div><div><div class="t">${a.no} ${a.name}</div><div class="why">${tg(a.common ? '공통' : '설비별')}${tg(a.items.length + '문항')}${a.common ? '' : '<br>없는 설비는 해당 없음으로'}</div></div></div>`).join('')}
    <div class="grp">AI 제안<span class="must">원할 때만</span><span class="must">${asked ? `${d.ai.length}개 중 ${nSel}개 고름` : '아직 안 받음'}</span></div>
    ${asked ? `
    <div class="small"><b class="ink">사진 속 것만 봐요.</b> 틀릴 수 있어요.</div>
    ${d.ai.length === 0 ? `<div class="small">사진에서 찾은 것 없음 — 위험이 없다는 뜻은 아니에요.</div>` : ''}
    ${d.ai.map((x, i) => { const g = AI_SUGGEST[x.idx]; return `<div class="item${x.sel ? ' sel' : ''}">
      <button class="chk" data-act="toggleAI" data-i="${i}" aria-label="고르기">${x.sel ? '✓' : ''}</button>
      <div style="flex:1"><div class="t">${esc(g.text)}</div>
      <button class="link small" style="padding:0;min-height:36px" data-act="why" data-i="${i}">사진에서 본 것: ${g.seen}<br>비슷한 사고: ${esc(g.cases[0].t)} ›</button></div></div>`; }).join('')}
    <button class="add" data-act="goPhoto">＋ 사진 더 찍어 다시 받기</button>` : `
    <button class="add" data-act="goPhoto">${I('camera', 16)} 사진 찍어 AI 제안 받기</button>`}
    ${d.self.length ? `<div class="grp">직접 추가<span class="must">${d.self.length}개</span></div>` : ''}
    ${d.self.map((t) => `<div class="item sel"><div class="bul">${I('plus', 14)}</div><div><div class="t">${esc(t)}</div><div class="why">직접 추가</div></div></div>`).join('')}
    <button class="add" data-act="addSelf">＋ 항목 직접 추가</button>
  </div><div class="ft"><button class="btn" data-act="startAnswer">${answered ? `${total}개 이어서 점검하기` : `${total}개로 점검 시작`}</button></div></div>
  ${UI.sheet && UI.sheet.type === 'why' ? whySheet(s) : ''}${UI.sheet && UI.sheet.type === 'self' ? selfSheet() : ''}`;
}
function whySheet(s) {
  const x = s.draft.ai[UI.sheet.i], g = AI_SUGGEST[x.idx], sp = g.spot;
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="mid">${esc(g.text)}</div>
    <div class="lbl">AI가 본 자리 (사진 ${x.photo})</div>
    <div class="photo">사진 ${x.photo}<span class="box" style="left:${sp.l}%;top:${sp.t}%;width:${sp.w}%;height:${sp.h}%">${g.seen}</span></div>
    <div class="lbl">비슷한 사고 사례 (설명용 예시)</div>
    ${g.cases.map((c) => `<div class="case"><b>${esc(c.t)}</b><div class="small">같은 점: ${esc(c.same)}</div></div>`).join('')}
    <div class="row"><button class="btn ghost cxl" data-act="closeSheet">닫기</button>
      <button class="btn" data-act="toggleAI" data-i="${UI.sheet.i}" data-close="1">${x.sel ? '고르지 않기' : '이 항목 고르기'}</button></div>
  </div>`;
}
function selfSheet() {
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="mid">항목 직접 추가</div>
    <input class="input" id="selfIn" placeholder="예: 소화기가 제자리에 있나?">
    <div class="row"><button class="btn ghost cxl" data-act="closeSheet">취소</button><button class="btn" data-act="saveSelf">더하기</button></div>
  </div>`;
}

/* ---------- G5 점검 — 목록 한 장에서 줄마다 바로 답하기 (2026-09-18 사용자 결정) ---------- */
const ANS = { ok: '이상 없음', bad: '문제 있음', na: '해당 없음' };
const GRP = { base: '기본 체크리스트', ai: 'AI 제안', self: '직접 추가' };
// 묶음 — 기본 체크리스트는 영역(01~05)마다, 나머지는 출처마다 (2026-09-22)
const AREA = Object.fromEntries(CHECKLIST.areas.map((a) => [a.key, a]));
const gkey = (x) => (x.src === 'base' ? x.area || 'base' : x.src);
const gname = (k) => (AREA[k] ? `${AREA[k].no} ${AREA[k].name}` : GRP[k] || SRC[k]);
function checkList(s) {
  const d = s.draft, f = FACTORIES[d.fid];
  const redo = d.redo && s.inspections.find((i) => i.id === d.redo);
  const n = (v) => d.items.filter((x) => x.answer === v).length;
  const nOk = n('ok'), nBad = n('bad'), nNa = n('na');
  const done = nOk + nBad + nNa, left = d.items.length - done;
  const bad = d.items.filter((x) => x.answer === 'bad');
  const only = UI.only && left;
  // 머리글 아래에 진행 막대와 상태별 수를 같이 붙여 스크롤해도 위에 남게 한다
  const top = `<div class="apptop">${band(f.name + (redo ? ' 고쳐 내기' : ' 점검'), redo ? '' : 'pick')}${bar()}
    <div class="progtop"><div class="rowx"><span class="t">${esc(f.name)} ${tg(CHECKLIST.ver)}</span><span class="small">${d.items.length}개 중 ${done}개 답함</span></div>
    <div class="prog">${['ok', 'bad', 'na'].map((v) => `<i class="${v}" style="width:${(n(v) / d.items.length) * 100}%"></i>`).join('')}</div>
    <div class="tally"><span class="ok">✓ ${ANS.ok} ${nOk}</span><span class="bad">⚠ ${ANS.bad} ${nBad}</span>${nNa ? `<span class="na">— ${ANS.na} ${nNa}</span>` : ''}${left ? `<span>안 본 것 ${left}</span>` : ''}</div></div></div>`;
  let rows = '', last = null;
  d.items.forEach((x, i) => {
    const k = gkey(x);
    if (k !== last) {  // 묶음 머리글 — 눌러서 접고 편다
      last = k;
      const g = d.items.filter((y) => gkey(y) === k), rest = g.filter((y) => !y.answer).length;
      const tag = AREA[k] ? `<span class="must">${AREA[k].common ? '공통' : '설비별'}</span>` : k === 'prev' ? '<span class="must">이상 없음 = 고쳐짐</span>' : '';
      rows += `<button class="grp gh" data-act="fold" data-k="${k}">${UI.fold[k] ? '▸' : '▾'} ${gname(k)}${tag}<span class="must">${g.length}개</span>${rest ? `<span class="rest">안 본 것 ${rest}</span>` : '<span class="small">다 답함</span>'}</button>`;
    }
    if (UI.fold[k] || (only && x.answer)) return;
    const st = x.answer || '';
    const mark = [x.memo ? '메모: ' + esc(x.memo) : '', x.shot ? '사진 1장' : ''].filter(Boolean).join('<br>');
    rows += `<div class="crow ${st}">
      <div class="ctop"><span class="cnum">${i + 1}</span><div class="t">${esc(x.text)}</div></div>${x.note ? `<div class="cmemo">${x.note}</div>` : ''}
      <div class="cans">
        <button class="${st === 'ok' ? 'on ok' : ''}" data-act="ans" data-n="${i}" data-v="ok">${ANS.ok}</button>
        <button class="${st === 'bad' ? 'on bad' : ''}" data-act="ansBad" data-n="${i}">${ANS.bad}</button>
        <button class="${st === 'na' ? 'on na' : ''}" data-act="ans" data-n="${i}" data-v="na">${ANS.na}</button>
      </div>
      ${st === 'bad' && mark ? `<div class="cmemo">${mark}</div>` : ''}
    </div>`;
  });
  const res = d.result || RESULTS[0];
  return `${sbar(f.name)}<div class="scr"><div class="bd" style="gap:8px">${top}
    ${redo && redo.back ? `<div class="warnbar"><span class="ic">${I('alert', 22)}</span><div><div class="mid">${redo.back.at} 운영자가 반려했어요</div><div class="small ink">"${esc(redo.back.note)}"</div></div></div>` : ''}
    ${left ? `<div class="seg"><button class="${UI.only ? '' : 'on'}" data-act="only" data-v="0">전체 ${d.items.length}</button><button class="${UI.only ? 'on' : ''}" data-act="only" data-v="1">안 본 것 ${left}</button></div>` : ''}
    ${rows}
    ${bad.length ? `<div class="grp">문제로 찍은 항목<span class="must">${bad.length}개</span></div>
      <ul class="q gul">${bad.map((x) => `<li>${esc(x.text)}</li>`).join('')}</ul>` : ''}
    ${left ? '' : `<div class="lbl">점검 결과<span class="hyp">가설</span></div>
      <div class="seg">${RESULTS.map((r) => `<button class="${res === r ? 'on' : ''}" data-act="pickResult" data-v="${r}">${r}</button>`).join('')}</div>
      <div class="warnbar"><span class="ic">${I('clock', 22)}</span><div class="small ink">운영자가 검사해요. 반려되면 고쳐서 다시 낼 수 있어요.<br>승인되면 문제 항목이 공장주에게 개선 요청으로 가요.</div></div>`}
  </div><div class="ft">
    ${left ? `<button class="btn ghost" data-act="only" data-v="1">안 본 항목 ${left}개 보기</button>` : `<button class="btn" data-act="submitFirst">${redo ? '고쳐서 다시 내기' : '점검 결과 내기'}</button>`}
  </div></div>${UI.sheet && UI.sheet.type === 'bad' ? badSheet(s) : ''}`;
}
function badSheet(s) {
  const it = s.draft.items[UI.sheet.n];
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="mid">${esc(it.text)}</div>
    <div class="ans">${it.ref ? '아직 안 고쳐짐' : '문제 있음'}</div>
    ${it.ref ? `<div class="lbl">공장주에게 들은 사정 (안 골라도 돼요)</div>
      ${['큰 공사가 필요해요', '부품이나 업체를 기다려요', '이유를 몰라요'].map((r) => `<button class="pick${UI.sheet.reason === r ? ' on' : ''}" data-act="pickReason" data-v="${r}">${r}</button>`).join('')}` : ''}
    <div class="lbl">지금 모습 (안 찍어도 돼요)</div>
    <div class="row"><div class="thumb">${UI.sheet.photo ? '📷 1장' : '없음'}</div><button class="btn ghost sm" data-act="sheetPhoto">＋ 사진 찍기</button></div>
    <div class="lbl">메모 (안 써도 돼요)</div>
    <textarea class="input" id="memoIn" placeholder="예: 바닥에 늘어진 전선 피복이 벗겨짐">${esc(it.memo || '')}</textarea>
    <div class="row"><button class="btn ghost cxl" data-act="closeSheet">취소</button><button class="btn" data-act="saveBad">저장</button></div>
  </div>`;
}
/* G6 재점검 화면은 2026-09-22 걷었다 — 지난번 미흡 항목은 다음 점검의 체크리스트에 붙는다 */
/* ---------- 낸 뒤 ---------- */
function sent(s, kind) {
  const wait = unsentN(s), first = kind === 'first';
  return `${sbar(s.net.guard ? '지킴이' : '📶 전파 없음')}<div class="scr"><div class="bd">
    <div class="donemark" style="${wait ? 'border-style:dashed' : ''}">${wait ? I('clock', 38) : I('check', 40)}</div>
    <div class="center big">${wait ? '휴대폰에 저장됐어요' : '올라갔어요'}</div>
    <div class="center small ink">${wait ? '전파가 없어요. <b>연결되면 저절로 올라가요.</b><br>앱을 지우거나 로그아웃하지 마세요.' : (first ? '운영자가 검사해요. 승인되면 공장주에게 개선 요청이 가요.<br>반려되면 내 할 일 맨 위에 다시 올라와요.' : '공장주와 운영자가 지금 볼 수 있어요.')}</div>
  </div><div class="ft"><button class="btn" data-go="">홈으로</button></div></div>`;
}

const ST_WORD = { wait: '검사 대기', ok: '승인', back: '반려됨' };
function records(s) {
  const mine = s.inspections.filter((i) => i.by === ME);
  return `${sbar('지킴이')}<div class="scr"><div class="bd">
    ${head('내 점검 기록')}${pageIntro('내 점검 기록')}
    ${mine.map((i) => { const bad = i.items.filter((x) => x.answer === 'bad'), st = i.st || 'ok';
      // 문제 항목의 처리 상태를 상태마다 세어 보인다 (항목마다 한 줄씩 쓰면 같은 말이 되풀이된다)
      const word = { todo: '고침 기다림', claimed: '다음 점검 때 확인', fixed: '고쳐짐', back: '다시 공장주에게' };
      const cnt = bad.reduce((m, x) => { const w = word[itemState(x)]; m[w] = (m[w] || 0) + 1; return m; }, {});
      const how = st === 'ok' ? Object.entries(cnt).map(([w, n]) => `${w} ${n}개`).join('<br>')
        : st === 'wait' ? '운영자 검사를 기다려요' : '';
      return `<div class="q${st === 'back' ? ' now' : ''}"><div class="rowx"><span class="t">${FACTORIES[i.fid].name}</span><span class="stt s-${st}">${ST_WORD[st]}</span></div>
      ${kv([['점검일', i.date], ['결과', `${i.result || RESULTS[0]}${i.ver ? ' ' + tg(i.ver) : ''}`], ['항목', `${i.items.length}개`], ['문제', `${bad.length}개`], how && ['처리', how]])}
      ${st === 'back' ? `<div class="small ink">반려 사유: "${esc(i.back.note)}"</div><button class="btn ghost sm" data-act="redo" data-id="${i.id}">고쳐서 다시 내기</button>` : ''}</div>`; }).join('')}
    ${s.outbox.guard.map((m) => `<div class="q now"><div class="rowx"><span class="t">${FACTORIES[m.data.fid].name}</span><span class="small">9/17</span></div><div class="small">${I('clock', 14)} 휴대폰에 저장됨<br>전파가 잡히면 올라가요</div></div>`).join('')}
  </div></div>`;
}
/* ---------- G9 주간 보고 (2026-09-22 — 기존 웹 "주간점검"의 칸을 따른다: 점검조·작성자·점검 기업 수·결과별 수) ---------- */
const WEEK = { key: '9/15', label: '9/15(월) ~ 9/19(금)', days: ['9/15', '9/16', '9/17', '9/18', '9/19'] };
function weekCounts(s) {
  const ins = s.inspections.filter((i) => WEEK.days.includes(i.date) && TEAM.members.includes(i.by));
  const c = Object.fromEntries(RESULTS.map((r) => [r, ins.filter((i) => (i.result || RESULTS[0]) === r).length]));
  return { firms: new Set(ins.map((i) => i.fid)).size, c, ins };
}
function weekly(s) {
  const w = weekCounts(s), done = (s.weekly || {})[WEEK.key];
  const lines = w.ins.map((i) => `<div class="rowx"><span><b>${FACTORIES[i.fid].name}</b> <span class="small">${i.date} ${i.result || RESULTS[0]}</span></span>${tg(ST_WORD[i.st || 'ok'], 's-' + (i.st || 'ok'))}</div>`);
  return `${sbar('지킴이')}<div class="scr"><div class="bd">
    ${head('주간 보고', '', `<span class="small">${TEAM.name}</span>`)}
    <div class="today"><div><b>${WEEK.label}</b></div></div>
    ${kv([['조', TEAM.name], ['조장', TEAM.lead], ['조원', TEAM.members.filter((m) => m !== TEAM.lead).join(', ')], ['작성자', ME]])}
    <div class="lbl">이번 주 실적</div>
    <div class="q"><div class="rowx"><span class="t">점검 기업</span><b>${w.firms}곳</b></div>
      ${RESULTS.map((r) => `<div class="rowx"><span class="small">${r}</span><span class="small ink">${w.c[r]}건</span></div>`).join('')}</div>
    ${lines.length ? `<div class="lbl">이번 주 점검</div><div class="q gstack">${lines.join('')}</div>` : ''}
    ${done ? `<div class="stat"><div class="ck">${I('check', 26)}</div><div><div class="mid">${done.at} ${esc(done.by)} 냄</div><div class="small ink">${done.memo ? '특이 사항: ' + esc(done.memo) : '특이 사항 없음'}</div></div></div>`
      : `<div class="lbl">특이 사항 (안 써도 돼요)</div><textarea class="input" id="wkMemo" placeholder="예: 향남 공장 한 곳이 점검을 거부함"></textarea>`}
    <div class="small">조장이 확인하는지는 아직 몰라요<span class="hyp">가설</span></div>
  </div><div class="ft">${done ? '<button class="btn ghost" data-go="">홈으로</button>' : '<button class="btn" data-act="sendWeekly">주간 보고 내기</button>'}</div></div>`;
}
function soon(s, w) {
  return `${sbar('지킴이')}<div class="scr"><div class="bd">${head({ me: '내 정보 (시안 G1-나)', factories: '우리 권역 (시안 G8)' }[w] || '준비 중')}
    <div class="stat"><div><div class="mid">시제품 다음 차례에 만들어요</div><div class="small">모양은 HTML 시안을 보세요.</div></div></div></div></div>`;
}

/* ---------- 그리기 ---------- */
function render() {
  const s = DB.s, p = R.path();
  const d = s.draft;
  let html;
  const needFirst = ['photo', 'ai', 'pick', 'list', 'ans', 'sum'].includes(p[0]);
  if (needFirst && !(d && d.kind === 'first')) { R.go(''); return; }
  if (p[0] === 'todo') { R.go(''); return; }  // 옛 주소 — 내 할 일은 홈 목록이 되었다 (2026-09-22)
  else if (p[0] === 'map') html = mapScreen(s);
  else if (p[0] === 'cal') html = calScreen(s);
  else if (p[0] === 'factories') html = factoriesScreen(s);
  else if (p[0] === 'pre') html = pre(s, p[1]);
  else if (p[0] === 'start') { R.go(''); return; }  // 옛 주소 — 회사 창으로 합쳐졌다
  else if (p[0] === 'photo') html = photo(s);
  else if (p[0] === 'ai') html = aiWait(s);
  else if (p[0] === 'pick') html = pickScreen(s);
  else if (p[0] === 'list') html = checkList(s);
  else if (p[0] === 'ans' || p[0] === 'sum') { R.go('list'); return; }
  else if (p[0] === 're' || p[0] === 'resum') { R.go('pre/' + p[1]); return; }  // 옛 재점검 주소 — 회사 창으로
  else if (p[0] === 'sent') html = sent(s, p[1]);
  else if (p[0] === 'weekly') html = weekly(s);
  else if (p[0] === 'records') html = records(s);
  else if (p[0] === 'soon') html = soon(s, p[1]);
  else html = home(s);
  const ae = document.activeElement, keep = ae && ae.id, val = keep && ae.value;
  // 입력 중에 다시 그리면 커서가 맨 앞으로 간다 — 자리를 기억해 되살린다 (찾기 칸에서 "정공"이 "공정"이 되던 것)
  const caret = keep && typeof ae.selectionStart === 'number' ? [ae.selectionStart, ae.selectionEnd] : null;
  const top = p.join('/');
  if (['', 'cal', 'map', 'weekly', 'soon/me'].includes(top)) html += gnav(top);  // 공장 전체보기는 홈에서 들어가는 안쪽 화면  // 점검 기록은 홈의 "점검 결과 보기"로 들어가는 안쪽 화면
  $('#app').innerHTML = html;
  if (NV.st === 'ready') nvMount();
  if (location.hash !== lastHash) { const sc = $('#app .scr'); if (sc) sc.classList.add('enter'); lastHash = location.hash; }
  if (keep && $('#' + keep)) { const el = $('#' + keep); el.value = val; el.focus(); if (caret) try { el.setSelectionRange(caret[0], caret[1]); } catch (e) {} }
}
let lastHash = null;
function sheet(v) { UI.sheet = v; render(); }

// 하던 점검이 있으면 그대로 두고, 없을 때만 새로 만든다
function startDraft(fid) {
  DB.act((s) => {
    if (s.draft && s.draft.kind === 'first' && s.draft.fid === fid) return;
    s.draft = { kind: 'first', fid, photos: 0, ai: [], self: [], items: [], aiState: null, result: RESULTS[0] };
  });
}

const ACTS = {
  closeSheet() { sheet(null); },
  date({ fid }) {
    const v = DB.s.visits[fid], d = visitDay(v);  // 이미 잡힌 날이 있으면 그 달·그 날을 골라 둔 채로 연다
    sheet({ type: 'date', fid, m: d ? d.m : TODAY.m, pm: d ? d.m : null, d: d ? d.d : null, tm: v && /1[2-9]:|오후/.test(v) ? '오후' : '오전' });
  },
  pickD({ v }) { UI.sheet.pm = UI.sheet.m; UI.sheet.d = +v; render(); },
  sheetM({ v }) { UI.sheet.m = Math.min(12, Math.max(TODAY.m, UI.sheet.m + +v)); render(); },
  pickTm({ v }) { UI.sheet.tm = v; render(); },
  saveDate() {
    const sh = UI.sheet, isToday = sh.pm === TODAY.m && sh.d === TODAY.d;
    const v = isToday ? `오늘 ${sh.tm}` : `${sh.pm}/${sh.d}(${WD[new Date(TODAY.y, sh.pm - 1, sh.d).getDay()]}) ${sh.tm}`;
    DB.act((s) => { s.visits[sh.fid] = v; });
    const d = visitDay(v);  // 캘린더에서 정했으면 그 날짜로 옮겨 방금 올라간 점검을 보여 준다
    if (d && R.path()[0] === 'cal') { UI.calM = d.m; UI.calD = d.d; }
    UI.sheet = null; toast(`${v} 방문을 캘린더에 올렸어요`); render();
  },
  newDraft({ fid }) { startDraft(fid); R.go('pick'); },
  // 회사 창에서 AI부터 받는다. 기본 체크리스트는 그대로 있고 제안만 먼저 채운다.
  aiFirst({ fid }) { startDraft(fid); R.go('photo'); },
  openMap() { toast('실제 앱은 여기서 지도 앱으로 넘어가요'); },
  goPhoto() { R.go('photo'); },
  addPhoto() { DB.act((s) => { s.draft.photos = Math.min(10, s.draft.photos + 1); }); },
  askAI() {
    DB.act((s) => { s.draft.aiState = 'wait'; });
    R.go('ai');
    clearTimeout(UI.aiTimer);
    UI.aiTimer = setTimeout(() => {
      if (!DB.s.draft || DB.s.draft.aiState !== 'wait') return;
      if (DB.s.aiDown) { DB.act((s) => { s.draft.aiState = 'fail'; }); return; }
      DB.act((s) => {
        const n = Math.min(4, s.draft.photos + 1);
        s.draft.ai = AI_SUGGEST.slice(0, n).map((g, i) => ({ idx: i, sel: false, photo: (i % s.draft.photos) + 1 }));
        s.draft.aiState = 'done';
      });
      R.go('pick');
    }, 2500);
  },
  // AI를 안 받거나 기다리지 않고 기본 체크리스트로 돌아간다 (이미 받아 둔 제안과 고른 것은 그대로)
  toList() {
    clearTimeout(UI.aiTimer);
    DB.act((s) => { if (s.draft.aiState !== 'done') s.draft.aiState = s.draft.ai.length ? 'done' : null; });
    R.go('pick');
  },
  toggleAI({ i, close }) { DB.act((s) => { s.draft.ai[i].sel = !s.draft.ai[i].sel; }); if (close) sheet(null); },
  why({ i }) { sheet({ type: 'why', i: +i }); },
  addSelf() { sheet({ type: 'self' }); setTimeout(() => $('#selfIn') && $('#selfIn').focus(), 50); },
  saveSelf() {
    const v = ($('#selfIn').value || '').trim();
    if (!v) { toast('내용을 적어 주세요'); return; }
    UI.sheet = null; DB.act((s) => s.draft.self.push(v));
  },
  startAnswer() {
    DB.act((s) => {
      const d = s.draft;
      const base = CHECKLIST.areas.flatMap((a) => a.items.map((t, i) => ({ id: `c${a.key}-${i}`, text: t, src: 'base', area: a.key })));
      const ai = d.ai.filter((x) => x.sel).map((x) => ({ id: 'a' + x.idx, text: AI_SUGGEST[x.idx].text, src: 'ai', photo: x.photo }));
      const self = d.self.map((t, i) => ({ id: 's' + i, text: t, src: 'self' }));
      // 지난번 미흡 항목 — 맨 앞 묶음. 원래 항목을 ref로 가리키고, 승인되면 답이 원래 항목에 적힌다 (common.js settlePrev)
      const prev = openIssues(s, d.fid).map((e) => ({ id: `p-${e.ins.id}-${e.it.id}`, text: e.it.text, src: 'prev', ref: { ins: e.ins.id, id: e.it.id }, note: prevNote(e) }));
      const old = Object.fromEntries(d.items.map((x) => [x.id, x]));
      d.items = [...prev, ...base, ...ai, ...self].map((x) => Object.assign(x, old[x.id] ? { answer: old[x.id].answer, memo: old[x.id].memo, reason: old[x.id].reason, shot: old[x.id].shot } : { answer: null }));
    });
    R.go('list');
  },
  ans({ n, v }) { n = +n; DB.act((s) => { const it = s.draft.items[n]; it.answer = v; it.memo = ''; it.shot = false; }); },
  ansBad({ n }) { const it = DB.s.draft.items[+n]; sheet({ type: 'bad', n: +n, photo: !!it.shot, reason: it.reason || null }); },
  fold({ k }) { UI.fold[k] = !UI.fold[k]; render(); },
  area({ v }) { UI.area = v === '전체' ? null : v; UI.pin = null; render(); },
  sort({ v }) { UI.sort = v; render(); },
  calDay({ v }) { UI.calD = +v; render(); },
  calToday() { UI.calM = TODAY.m; UI.calD = TODAY.d; R.go('cal'); },
  fst({ v }) { UI.fst = v; render(); },
  areaT({ v }) { UI.areas = UI.areas.includes(v) ? UI.areas.filter((a) => a !== v) : [...UI.areas, v]; render(); },
  calM({ v }) { UI.calM = Math.min(12, Math.max(1, UI.calM + +v)); UI.calD = null; render(); },
  pin({ fid }) { UI.pin = UI.pin === fid ? null : fid; render(); },
  pickResult({ v }) { DB.act((s) => { s.draft.result = v; }); },
  // 반려된 점검을 연다 — 답은 그대로 두고 고친다 (2026-09-22)
  redo({ id }) {
    DB.act((s) => {
      const ins = s.inspections.find((i) => i.id === id);
      s.draft = { kind: 'first', fid: ins.fid, redo: id, result: ins.result || RESULTS[0], photos: 0, ai: [], self: [], aiState: null,
        items: ins.items.map((x) => Object.assign({}, x)) };
    });
    UI.only = false; R.go('list');
  },
  sendWeekly() {
    const memo = ($('#wkMemo') ? $('#wkMemo').value : '').trim(), w = weekCounts(DB.s);
    DB.act((s) => { s.weekly = s.weekly || {}; s.weekly[WEEK.key] = { by: ME, at: '9/17', memo, firms: w.firms, c: w.c }; DB.log(`${TEAM.name} 주간 보고 냄`); });
    toast('주간 보고를 냈어요');
  },
  only({ v }) { UI.only = v === '1'; render(); },
  sheetPhoto() { UI.sheet.photo = true; render(); },
  saveBad() {
    const n = UI.sheet.n, memo = $('#memoIn').value.trim(), ph = UI.sheet.photo, reason = UI.sheet.reason || '';
    UI.sheet = null;
    DB.act((s) => { const it = s.draft.items[n]; it.answer = 'bad'; it.memo = memo; it.shot = ph; it.reason = reason; });
  },
  submitFirst() {
    const d = DB.s.draft;
    const data = { kind: 'first', fid: d.fid, redo: d.redo || null, by: ME, team: TEAM.name, ver: CHECKLIST.ver, result: d.result || RESULTS[0],
      items: d.items.map((x) => ({ id: x.id, text: x.text, src: x.src, area: x.area, answer: x.answer, memo: x.memo || '', log: [],
        ...(x.ref ? { ref: x.ref, note: x.note, reason: x.reason || '', shot: !!x.shot } : {}) })) };
    DB.act((s) => {
      if (s.net.guard) applyInspection(s, data); else s.outbox.guard.push({ type: 'inspection', data });
      if (!d.redo) s.visits[d.fid] = null;  // 다녀왔으니 방문일을 비운다
      DB.log(`지킴이 ${d.redo ? '반려된 점검 다시 냄' : '점검 냄'} · ${FACTORIES[d.fid].name}`);
      s.draft = null;
    });
    R.go('sent/first');
  },
  pickReason({ v }) { UI.sheet.reason = UI.sheet.reason === v ? null : v; render(); },
};
wire(ACTS, render);
