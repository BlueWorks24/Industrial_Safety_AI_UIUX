// 운영자 웹 — M 화면. 기존 화성 웹 관리자 메뉴를 운영자가 하는 일로 묶었다 (2026-10-01 사용자 승인):
// 현황판 · 점검(제출 검사 · 점검 기록 · 방문 일정 · 개선 요청 · 주간 보고) · 공장 · 점검조 · 체크리스트 · 통계 · 공지·자료
// 공장과 점검 기록은 우리 조(TEAM) 것만 실제로 있고, 다른 조는 숫자만 있다 (seed.js SQUADS).
// 운영자가 바꾼 것(조 편성 · 지킴이 상태 · 새 공장 · 새 센서 · 새 판 · 공지 · 자료)은 s.op에 모은다. 지킴이 앱·공장주 웹에는 아직 안 이어진다.
const OPER = (() => {
  let ME = '이운영', ON = false;
  const UI = { menu: false, lastPath: null, dlg: null, f: { rec: {}, fac: {}, fix: 'all' }, okOpen: false, cl: null, ver: null, nt: null,
    nf: {}, nn: { to: '지킴이' }, fu: null, view: 'all', zoom: 1, c: null, mv: null, sq: '', sOpen: false, si: -1, q: '', qf: null, enterLater: false, tip: null, bigMap: false, bell: false, sqi: 0, gu: '' };
  const TABS = [['', '홈'], ['insp', '점검'], ['factories', '공장'], ['squads', '점검조'], ['checklist', '체크리스트'], ['stats', '통계'], ['board', '공지·자료']];
  const PAGE = {
    '': ['운영 현황판', '오늘 손쓸 곳과 점검조·센서 사이트 상태를 확인하세요. 산업안전지킴이 운영센터 화면이에요.'],
    insp: ['점검', '지킴이가 낸 점검을 검사하고, 점검 기록 · 방문 일정 · 개선 요청을 봐요.'],
    factories: ['공장', '점검 대상 공장을 찾고 등록해요. 센서 사이트는 센서도 여기서 관리해요. 기록은 운영자도 고칠 수 없어요.'],
    squads: ['점검조', '조를 꾸리고 읍·면·동 권역을 맡겨요. 지킴이 가입과 근무 상태도 여기서 관리해요.'],
    checklist: ['체크리스트', '지킴이가 쓰는 점검 문항의 판이에요. 문항을 고치면 새 판으로 올려요.'],
    stats: ['통계', '9월 점검 실적과 개선지도, 센서 경보, AI 제안이 얼마나 쓰였는지 봐요.'],
    board: ['공지 · 자료', '지킴이와 공장주에게 알리고, 교육 자료와 양식을 올려요.'],
    me: ['내 정보', '운영자 계정 정보예요.'],
  };
  // 모든 탭이 홈과 같은 틀(opShell — 남색 띠 · 흰 머리글 · 가로 메뉴 · 종)을 쓴다 (2026-10-01 사용자 지시). 화면 이름과 설명은 본문 맨 위
  function frame(active, body, { key = active, crumb = null } = {}) {
    const s = DB.s, [title, desc] = PAGE[key], name = crumb || title;
    return opShell(s, todoItems(s), active, name, `<div class="oppage"><h1>${name}</h1>${desc ? `<p>${desc}</p>` : ''}</div>${body}`);
  }

  /* ---------- 작은 도구 ---------- */
  const OPS = (s) => s.op || {};
  const opw = (s, k, d) => { s.op = s.op || {}; return (s.op[k] = s.op[k] || d); };  // 쓸 때만 만든다
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const mdNum = (d) => { const m = String(d || '').match(/(\d+)\/(\d+)/); return m ? +m[1] * 100 + +m[2] : 0; };
  // 앱 달력으로 9/17은 목요일 — 이번 주는 9/14(월)~9/18(금). 지킴이 주간 보고는 `9/15 동탄`처럼 담긴다 (guard.js WEEK)
  const WEEK = { key: '9/15', label: '9/14(월) ~ 9/18(금)', from: 914, to: 918 };
  const inWeek = (i) => mdNum(i.date) >= WEEK.from && mdNum(i.date) <= WEEK.to;
  const stOf = (i) => i.st || 'ok';
  const ST = { wait: ['검사 대기', 'blue'], ok: ['승인', 'green'], back: ['반려', 'amber'] };
  const stPill = (i) => `<span class="pill ${ST[stOf(i)][1]}">${ST[stOf(i)][0]}</span>`;
  const badOf = (i) => i.items.filter((x) => x.answer === 'bad' && !x.ref);
  const waiting = (s) => s.inspections.filter((i) => stOf(i) === 'wait').sort((a, b) => mdNum(a.sentAt || a.date) - mdNum(b.sentAt || b.date));
  // 점검번호 — 기존 웹 점검코드 꼴을 흉내 낸 임시 번호 (지킴이 앱 주간 보고와 같은 규칙)
  const insNo = (s, i) => { const [m, d] = i.date.split('/').map(Number); const k = s.inspections.filter((x) => x.date === i.date).indexOf(i) + 1;
    return `R26${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}${String(k).padStart(3, '0')}`; };
  const AREA = Object.fromEntries(CHECKLIST.areas.map((a) => [a.key, a]));
  const srcTag = (x) => (x.src === 'ai' ? '<span class="aitag2">AI 제안</span>' : x.src === 'self' ? '<span class="pill gray">직접 더함</span>'
    : x.src === 'prev' ? '<span class="pill amber">지난번 미흡</span>' : `<span class="pill gray">${x.area ? `${AREA[x.area].no} ${AREA[x.area].name}` : '기본'}</span>`);
  const kv = (rows) => `<div class="facts opfacts">${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
  const seg = (act, cur, opts, extra = '') => `<div class="wseg">${opts.map((o) => `<span class="${cur === o ? 'on' : ''}" data-act="${act}" data-v="${o}"${extra}>${o}</span>`).join('')}</div>`;
  const sel = (key, val, opts, label) => `<label class="opfi"><span class="lbl">${label}</span><select class="input" data-opf="${key}">${opts.map(([v, t]) => `<option value="${esc(v)}"${v === (val || '') ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  const find = (key, val, ph) => `<label class="opfi grow"><span class="lbl">찾기</span><input class="input" id="opf-${key.replace('.', '-')}" data-opf="${key}" value="${esc(val || '')}" placeholder="${ph}"></label>`;

  // 공장 — 시드 공장 + 운영자가 새로 등록한 공장
  const newFacs = (s) => OPS(s).facs || [];
  const facOf = (s, fid) => FACTORIES[fid] || newFacs(s).find((f) => f.id === fid);
  const firmOf = (s, fid) => FIRM[fid] || newFacs(s).find((f) => f.id === fid);
  const allFids = (s) => [...Object.keys(FACTORIES), ...newFacs(s).map((f) => f.id)];
  const lastInsp = (s, fid) => s.inspections.filter((i) => i.fid === fid).sort((a, b) => mdNum(b.date) - mdNum(a.date))[0];
  function tracked(s, fid) {
    const out = [];
    s.inspections.filter((i) => (!fid || i.fid === fid) && APPROVED(i)).forEach((ins) => ins.items.filter(TRACKED).forEach((it) => out.push({ ins, it, st: itemState(it) })));
    return out;
  }
  // 재점검은 따로 없다 (2026-09-22) — 고쳤는지는 다음 점검 때 지킴이가 확인하고, 운영자가 그 점검을 승인할 때 정해진다
  const WORD = { todo: ['아직 안 고침', 'amber'], claimed: ['공장주가 고쳤다고 함', 'blue'], fixed: ['고쳐짐 확인', 'green'], back: ['점검에서 안 고쳐짐', 'amber'] };

  // 점검조 — 운영자가 바꾼 편성(s.op.squads)을 시드 위에 얹는다
  const squads = (s) => SQUADS.map((q) => Object.assign({}, q, (OPS(s).squads || {})[q.id]));
  const ALL_DONGS = [...new Set(SQUADS.flatMap((q) => q.areas))];
  const sqOfDong = (s, dong) => squads(s).find((q) => q.areas.includes(dong));
  const sqOfGuard = (s, name) => squads(s).find((q) => q.members.includes(name));
  const insTeam = (i) => i.team || (SQUADS.find((q) => q.members.includes(i.by)) || {}).name || '—';  // 점검 당시 조 — 편성을 바꿔도 기록은 그대로
  function sqSet(s, id, fn) {
    const q = squads(s).find((x) => x.id === id), e = { lead: q.lead, members: [...q.members], areas: [...q.areas] };
    fn(e); opw(s, 'squads', {})[id] = e;
  }
  // 조 숫자 — 우리 조는 기록에서 세고, 나머지 조는 시드의 숫자
  function sqStats(s, q) {
    if (q.id !== 'e1') return { firms: q.firms, month: q.month, week: q.week, wait: 0, back: 0, res: q.res, fx: q.fx, sentOk: q.sent, sent: q.sent ? '제출' : '미제출' };
    const mine = s.inspections.filter((i) => TEAM.members.includes(i.by));
    const okMonth = mine.filter((i) => String(i.date).startsWith('9/') && stOf(i) === 'ok');
    const tr = tracked(s), sentN = TEAM.areas.filter((a) => (s.weekly || {})[`${WEEK.key} ${a}`]).length;
    return { firms: allFids(s).filter((fid) => q.areas.includes(facOf(s, fid).dong)).length, month: new Set(okMonth.map((i) => i.fid)).size,
      week: mine.filter(inWeek).length, wait: mine.filter((i) => stOf(i) === 'wait').length, back: mine.filter((i) => stOf(i) === 'back').length,
      res: RESULTS.map((r) => okMonth.filter((i) => (i.result || RESULTS[0]) === r).length), fx: [tr.length, tr.filter((e) => e.st === 'fixed').length],
      sentOk: sentN === TEAM.areas.length, sent: `${sentN}/${TEAM.areas.length} 권역` };
  }
  // 읍·면·동 목록을 짧게 — 동탄1동~동탄9동 → 동탄 1~9동
  function areaText(list) {
    const groups = {}, rest = [];
    list.forEach((d) => { const m = d.match(/^(.+?)(\d+)동$/); if (m) (groups[m[1]] = groups[m[1]] || []).push(+m[2]); else rest.push(d); });
    const g = Object.entries(groups).map(([k, ns]) => {
      if (ns.length === 1) return `${k}${ns[0]}동`;
      const runs = [];
      ns.sort((a, b) => a - b).forEach((n) => { const r = runs[runs.length - 1]; if (r && n === r[1] + 1) r[1] = n; else runs.push([n, n]); });
      return runs.map(([a, b]) => `${k} ${a === b ? a : `${a}~${b}`}동`).join(', ');  // 끊긴 번호는 따로 — `동탄 1~3동, 동탄 5동` (`·`로 잇지 않는다)
    });
    return [...g, ...rest].join(', ') || '<span class="pill amber">없음</span>';
  }
  // 지킴이 명단 — 시드 + 운영자가 바꾼 근무 상태 + 승인한 가입 신청
  const WORK = ['근무', '휴직', '병가', '퇴직'];
  const pendingApps = (s) => APPLICANTS.filter((a) => !(OPS(s).apply || {})[a.name]);
  function guardsAll(s) {
    const g = {}, ch = OPS(s).guards || {};
    Object.entries(GUARDS).forEach(([n, x]) => { g[n] = { ...x, ...(ch[n] || {}) }; });
    APPLICANTS.filter((a) => (OPS(s).apply || {})[a.name] === 'ok').forEach((a) => { g[a.name] = { field: a.field, joined: '2026-09', work: '근무', ...(ch[a.name] || {}) }; });
    return g;
  }

  /* ---------- M1 홈 (2026-10-01 사용자 요청) ----------
     짜임새는 레퍼런스(ArgoLogics) 그대로: 위 머리글 + 메뉴 → 지도(찾기 · 보기 · 크게 · 확대·축소) → 아래 세 줄
     ① 점검 건수 + 작은 칸 넷 ② 점검조(숫자 셋 · 맡은 구역 넘기기 · 조장) ③ 다음 검사 + 개선지도.
     색과 아이콘 놓는 법은 지킴이 앱을 따른다 (같은 날 사용자 지시): 남색 띠 + 안전 줄무늬, 파란 방패, 아이콘 위·이름 아래 메뉴(휴대폰에서는 아래 뜬 막대),
     밝은 지도(작은 지도와 같은 색) · 구 고르기 · 파란 핀, 파란 칸(최근 점검한 곳과 같은 칸) · 남색 단추 · 꼬리표. 빨강은 경보에만. 다른 탭은 아직 옛 틀이다 */
  const sv = (d, n = 20) => `<svg width="${n}" height="${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const OPI = {
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/>',
    chart: '<path d="M4 20V11M10 20V5M16 20v-6M3 20h18"/>',
    tool: '<path d="M14.5 5.5a4 4 0 0 0 4.9 4.9l-9 9a2 2 0 0 1-2.8-2.8l9-9z"/><path d="M14.5 5.5 17 3l4 4-2.5 2.5"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M15.5 5.2a3 3 0 0 1 0 5.6M17.5 14.2a5 5 0 0 1 3 4.8"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    shrink: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    minus: '<path d="M5 12h14"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    right: '<path d="m9 6 6 6-6 6"/>',
    left: '<path d="m15 6-6 6 6 6"/>',
  };
  const chev = (n = 16) => sv(OPI.right, n);
  const TAB_IC = { '': 'home', insp: 'clipboard', factories: 'factory', squads: 'users', checklist: 'list', stats: 'chart', board: 'megaphone' };
  const tabIcon = (p, n) => (OPI[TAB_IC[p]] ? sv(OPI[TAB_IC[p]], n) : I(TAB_IC[p], n));
  // 구 색 — 지킴이 앱 지도와 같다 (guard.js GU_COLOR)
  const GUC = { 만세구: '#2e9d6b', 효행구: '#3d82c4', 병점구: '#e0853a', 동탄구: '#c2b236' };
  // 오늘 할 일 — 급한 것부터: 위로 올라온 경보 · 고장 신고 → 오래 걸리는 경보 · 값 끊김 → 검사 대기 → 가입 신청 (종을 누르면 펼쳐진다)
  // 글은 `·`로 잇지 않는다 (2026-10-01 사용자 지시) — t 어디 · w 무엇 · d 자세한 것은 조각마다 따로 그린다
  function todoItems(s) {
    const out = [];
    s.alarms.filter(SIM.live).forEach((a) => {
      const fid = alarmFid(a), nm = FACTORIES[fid].name;
      if (a.escalated) out.push({ lv: 0, k: 'alarm', fid, ic: 'alert', go: `factory/${fid}`, tag: '위로 올라옴', t: nm, w: SIM.title(a), d: [`${hm(a.start)}부터`, `미루기 ${a.snoozes}번 다 씀`] });
      else if (a.status !== 'watch' && s.clock - a.start >= 5) out.push({ lv: 1, k: 'alarm', fid, ic: 'alert', go: `factory/${fid}`, tag: '경보', t: nm, w: SIM.title(a), d: [`${s.clock - a.start}분째`, a.status === 'open' ? '조치 안 됨' : '다시 알림 중'] });
    });
    (s.faults || []).filter((f) => f.status === 'open').forEach((f) => out.push({ lv: 0, k: 'fault', fid: f.fid, ic: 'tool', go: `factory/${f.fid}`, tag: '고장 신고', t: FACTORIES[f.fid].name, w: SENSORS[f.key].title, d: [`${f.at} ${f.by} 신고`, `"${f.reason}"`] }));
    Object.keys(SENSORS).filter((k) => SIM.sensor(s, k).state === 'unknown').forEach((k) => out.push({ lv: 1, k: 'fault', fid: SENSORS[k].fid, ic: 'signal', go: `factory/${SENSORS[k].fid}`, tag: '값 끊김', t: FACTORIES[SENSORS[k].fid].name, w: SENSORS[k].title, d: [`${SIM.sensor(s, k).since}부터 값이 안 와요`] }));
    waiting(s).forEach((i) => out.push({ lv: 2, k: 'wait', fid: i.fid, ic: 'clipboard', go: `insp/v/${i.id}`, tag: (i.backs || []).length ? '다시 냄' : '검사 대기', t: FACTORIES[i.fid].name, w: i.result || RESULTS[0], d: [i.by, `${i.date} 점검`, `문제 ${badOf(i).length}개`] }));
    const ap = pendingApps(s);
    if (ap.length) out.push({ lv: 3, k: 'apply', ic: 'user', go: 'squads/guards', tag: '지킴이', t: `가입 신청 ${ap.length}명`, w: '', d: ap.map((a) => `${a.name}(${a.field})`) });
    return out.sort((a, b) => a.lv - b.lv);
  }
  const todoIcon = (x, n) => (x.ic === 'tool' ? sv(OPI.tool, n) : I(x.ic, n));

  // 화성시 지도 — 지킴이 앱과 같은 경계 자료(geo.js). 경로는 한 번만 만든다
  const MK = Math.cos(37.15 * Math.PI / 180);
  const mp = ([x, y]) => [x * MK * 1000, -y * 1000];
  const pth = (polys) => polys.map((p) => p.map((r) => 'M' + r.map((c) => mp(c).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z').join('')).join('');
  const rArea = (r) => Math.abs(r.reduce((a, c, i) => { const n = r[(i + 1) % r.length]; return a + c[0] * n[1] - n[0] * c[1]; }, 0)) / 2;
  const boxOf = (bs) => ({ x0: Math.min(...bs.map((b) => b.x0)), y0: Math.min(...bs.map((b) => b.y0)), x1: Math.max(...bs.map((b) => b.x1)), y1: Math.max(...bs.map((b) => b.y1)) });
  let CITY = null;
  function cityGeo() {
    if (CITY) return CITY;
    const box = (pts) => pts.reduce((b, [x, y]) => ({ x0: Math.min(b.x0, x), y0: Math.min(b.y0, y), x1: Math.max(b.x1, x), y1: Math.max(b.y1, y) }), { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });
    const dongs = HWASEONG.map((h) => {
      const big = Math.max(...h.polys.map((p) => rArea(p[0]))), main = h.polys.filter((p) => rArea(p[0]) >= big * 0.2);
      const lr = h.polys.find((p) => rArea(p[0]) === big)[0].map(mp);
      return { name: h.name, gu: h.gu, d: pth(h.polys), b: box(main.flatMap((p) => p[0].map(mp))), c: [sum(lr.map((p) => p[0])) / lr.length, sum(lr.map((p) => p[1])) / lr.length] };
    });
    CITY = { dongs, outline: pth(HWASEONG_GU.city), b: boxOf(dongs.map((x) => x.b)),
      gus: HWASEONG_GU.gu.map((g) => ({ name: g.name, c: mp(g.label), b: boxOf(dongs.filter((d) => d.gu === g.name).map((d) => d.b)) })) };
    return CITY;
  }
  // 지도에 보일 공장 — 레퍼런스의 "Sort by" 자리
  const VIEWS = [['all', '모든 공장'], ['todo', '할 일 있는 곳'], ['site', '센서 사이트'], ['week', '이번 주 점검']];
  const mapH = () => (innerWidth <= 760 ? 320 : 400);
  // 지도 그림 자리 — 위쪽 찾기 칸 · 아래 범례 자리는 비워 두고 그 사이에 맞춘다. heroMap과 찾기 결과 맞추기(fitTo)가 같이 쓴다
  const mapFrame = (dim = {}) => { const W = dim.W || mainW(), H = dim.H || mapH(), phone = innerWidth <= 760, top = dim.top ?? (phone ? 112 : 68), bot = dim.bot ?? (phone ? 12 : 46);
    return { W, H, phone, top, bot, H2: H - top - bot }; };
  /* 지도 공장 찾기 (2026-10-01 사용자 요청) — 치는 대로 연관 검색어(읍·면·동 · 업종 · 공장 이름)가 뜨고, 고르거나 Enter면
     다른 화면으로 가지 않고 지도에 맞는 공장만 남긴 채 그 공장들에 맞춰 확대한다 (전에는 Enter면 공장 탭으로 갔다).
     UI.sq 치는 글자 · UI.sOpen 목록 열림 · UI.si 키보드로 고른 줄 · UI.q 지도에 건 검색어 · UI.qf 지도에 남길 공장 */
  const norm = (x) => String(x || '').replace(/\s/g, '').toLowerCase();
  function searchHits(q) {
    const k = norm(q), F = Object.entries(FACTORIES), uniq = (l) => [...new Set(l)];
    if (!k) return { facs: [], areas: [], types: [] };
    return { areas: uniq(F.map(([, f]) => f.dong)).filter((d) => norm(d).includes(k)), types: uniq(F.map(([, f]) => f.type)).filter((t) => norm(t).includes(k)),
      facs: F.filter(([, f]) => [f.name, f.dong, f.type].some((v) => norm(v).includes(k))).map(([fid]) => fid) };  // 이름 · 읍면동 · 업종 어디든 맞으면 연관 공장
  }
  function suggItems() {
    const { facs, areas, types } = searchHits(UI.sq), cnt = (key, v) => Object.values(FACTORIES).filter((f) => f[key] === v).length;
    return [...areas.map((v) => ({ v, ic: 'pin', sub: `공장 ${cnt('dong', v)}곳` })), ...types.map((v) => ({ v, ic: 'list', sub: `업종, 공장 ${cnt('type', v)}곳` })),
      ...facs.map((fid) => ({ v: FACTORIES[fid].name, fid, ic: 'factory', sub: `화성시 ${FACTORIES[fid].dong}` }))].slice(0, 8);
  }
  const hiQ = (v, q) => { const i = v.indexOf(q); return i < 0 || !q ? esc(v) : `${esc(v.slice(0, i))}<mark>${esc(q)}</mark>${esc(v.slice(i + q.length))}`; };
  function suggBox() {
    if (!UI.sOpen || !norm(UI.sq)) return '';
    const it = suggItems(), q = UI.sq.trim();
    if (!it.length) return `<div class="opsugg"><div class="opsnone"><b>${esc(q)}</b> 검색 결과가 없어요</div></div>`;
    return `<div class="opsugg" role="listbox" aria-label="연관 검색어">${it.map((x, i) => `<button class="opsit${i === UI.si ? ' on' : ''}" role="option" aria-selected="${i === UI.si}" data-act="sPick" data-i="${i}">
      <span class="ic">${I(x.ic, 16)}</span><span class="tx"><b>${hiQ(x.v, q)}</b><small>${x.sub}</small></span></button>`).join('')}</div>`;
  }
  // 목록만 바꿔 끼운다 — 화면 전체를 다시 그리면 한글 조합이 끊긴다
  function refreshSugg() {
    const box = $('.opsbox');
    if (!box) return;
    const old = box.querySelector('.opsugg'), html = suggBox();
    if (old) old.outerHTML = html; else if (html) box.insertAdjacentHTML('beforeend', html);
    const x = box.querySelector('.opsx');
    if (x) x.hidden = !(UI.sq || UI.qf);
  }
  // 찾은 공장들이 다 보이게 확대한다 — 하나면 도시 전체의 4배까지
  function fitTo(fids) {
    const { W, H2 } = mapFrame(), b = cityGeo().b, base = Math.max((b.x1 - b.x0) * 1.1, ((b.y1 - b.y0) * 1.1 * W) / H2);
    const ps = fids.map((f) => mp(FACTORIES[f].ll)), xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const need = Math.max((x1 - x0) * 1.5, ((y1 - y0) * 1.5 * W) / H2, base / 4);
    UI.zoom = Math.min(ZMAX, Math.max(1, base / need)); UI.c = UI.zoom > 1 ? [(x0 + x1) / 2, (y0 + y1) / 2] : null;
  }
  function applySearch(q, fid) {
    q = String(q || '').trim();
    UI.sOpen = false; UI.si = -1; UI.sq = q;
    if (!q) { UI.q = ''; UI.qf = null; UI.zoom = 1; UI.c = null; render(); return; }
    const fids = fid ? [fid] : searchHits(q).facs;
    if (!fids.length) { UI.sOpen = true; refreshSugg(); return; }  // 맞는 공장이 없으면 목록 자리에 알리고 지도는 그대로
    UI.q = q; UI.qf = fids; UI.view = 'all'; UI.gu = ''; fitTo(fids); render();
  }
  function pickEnter() {
    const it = suggItems(), x = UI.sOpen && UI.si >= 0 && it[UI.si];
    if (x) applySearch(x.v, x.fid); else applySearch(UI.sq);
  }
  // 지도에 올릴 공장과 핀 종류 — 그림 지도와 네이버 지도가 같이 쓴다
  function mapPins(s, todo) {
    const has = (fid, k) => todo.some((x) => x.fid === fid && x.k === k);
    const kindOf = (fid) => (has(fid, 'alarm') ? 'alarm' : has(fid, 'fault') ? 'fault' : has(fid, 'wait') ? 'wait' : HAS_SENSORS(fid) ? 'site' : 'plain');
    const att = new Set(todo.filter((x) => x.fid).map((x) => x.fid));
    const show = Object.keys(FACTORIES).filter((fid) => UI.view === 'todo' ? att.has(fid) : UI.view === 'site' ? HAS_SENSORS(fid)
      : UI.view === 'week' ? s.inspections.some((i) => i.fid === fid && inWeek(i)) : true).filter((fid) => !UI.qf || UI.qf.includes(fid));
    return { kindOf, att, show };
  }
  // 화성시 둘레 시·군 (geonear.js) — 흐리게 깔아 화성시가 어디쯤인지 보이게 (2026-10-01 사용자 지시). 경로는 한 번만 만든다
  let NEAR = null;
  const nearGeo = () => NEAR || (NEAR = (typeof HWA_NEAR === 'undefined' ? [] : HWA_NEAR).map((n) => {
    const pts = n.polys.flatMap((p) => p[0].map(mp));
    return { name: n.name, d: pth(n.polys), c: mp(n.label),
      b: { x0: Math.min(...pts.map((q) => q[0])), y0: Math.min(...pts.map((q) => q[1])), x1: Math.max(...pts.map((q) => q[0])), y1: Math.max(...pts.map((q) => q[1])) } };
  }));
  const PIN_D = 'M12 .8C5.8.8.8 5.8.8 12c0 8.6 11.2 19.2 11.2 19.2S23.2 20.6 23.2 12C23.2 5.8 18.2.8 12 .8z';  // 지킴이 앱 핀 (guard.js PIN_SVG)
  /* 현재 위치 (2026-10-01 사용자 요청: 지도에 파랗게 깜빡이게) — 지킴이 앱 거리 기준과 같은 방식(guard.js locate · ORIGIN):
     이 기기 위치, 못 받으면(https · localhost가 아님 · 거절 · 8초 안에 못 잡음) 화성산업진흥원(봉담) 근처 대략 좌표. 위치는 서버로 보내지 않는다 */
  const ORIGIN = { name: '진흥원(봉담)', ll: [126.955, 37.214] };
  const HERE = { st: 'none', ll: null };  // none · asking · ok · fail
  function locate() {
    if (HERE.st !== 'none') return;
    if (!navigator.geolocation || !window.isSecureContext) { HERE.st = 'fail'; return; }
    HERE.st = 'asking';
    navigator.geolocation.getCurrentPosition((p) => { HERE.st = 'ok'; HERE.ll = [p.coords.longitude, p.coords.latitude]; render(); },
      () => { HERE.st = 'fail'; render(); }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
  }
  const hereSvg = (k) => {
    if (HERE.st !== 'ok' && HERE.st !== 'fail') return '';
    const [x, y] = mp(HERE.st === 'ok' ? HERE.ll : ORIGIN.ll);
    return `<g class="ophere" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(1 / k).toFixed(4)})"><title>${HERE.st === 'ok' ? '내 위치' : `내 위치를 못 받아 ${ORIGIN.name}으로 대신`}</title>
      <circle r="10" class="ring"/><circle r="7" class="dot"/></g>`;
  };
  // 핀에 마우스를 올리면 뜨는 공장 정보 (같은 날 사용자 요청) — 지금 상태와 그 까닭 · 위치 · 업종과 근로자 · 최근 점검. 마우스로만(손가락은 누르면 공장으로)
  const KIND_T = { alarm: '경보 중', fault: '센서 확인 필요', wait: '검사 대기', site: '센서 사이트', plain: '점검 대상' };
  function pinInfo(s, todo, fid) {
    const f = FACTORIES[fid], kind = mapPins(s, todo).kindOf(fid), li = lastInsp(s, fid);
    // 머리의 상태와 같은 종류면 앞말(검사 대기:)을 빼고, 다른 종류가 같이 있으면 붙인다
    const why = todo.filter((x) => x.fid === fid).map((x) => (x.k === 'alarm' ? `${x.w}: ${x.d.join(', ')}`
      : x.k === 'wait' ? `${kind === 'wait' ? '' : `${x.tag}: `}${x.d.slice(1).join(', ')}` : `${x.tag}: ${x.w}`));
    if (!why.length && kind === 'site') why.push(`센서 ${SITE_SENSORS(fid).length}대, 경보 없음`);
    return `<div class="h"><i class="k-${kind}"></i><b>${esc(f.name)}</b><span>${KIND_T[kind]}</span></div>${why.length ? `<div class="w">${why.map(esc).join('<br>')}</div>` : ''}
      <dl><dt>위치</dt><dd>화성시 ${f.dong}</dd><dt>업종</dt><dd>${f.type}, 근로자 ${f.workers}명</dd><dt>최근 점검</dt><dd>${li ? `${li.date} ${esc(li.by)}` : '아직 없음'}</dd></dl>`;
  }
  // 칸 자리 — 핀 끝(공장 자리) 위에. 지도 위쪽에 가까우면 아래로, 양 끝이면 안쪽으로 붙인다
  function tipBox(s, todo) {
    const mv = UI.mv, f = UI.tip && FACTORIES[UI.tip];
    if (!f || !mv) return '';
    const [mx, my] = mp(f.ll), x = (mx - mv.vx) * mv.k, y = (my - mv.vy) * mv.k;
    const cls = `${y < 230 ? ' below' : ''}${x < 140 ? ' l' : x > mv.W - 140 ? ' r' : ''}`;
    return `<div class="optip2${cls}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px" role="tooltip">${pinInfo(s, todo, UI.tip)}</div>`;
  }
  function refreshTip() {
    const w = $('.opmapw');
    if (!w) return;
    const old = w.querySelector('.optip2'), html = tipBox(DB.s, todoItems(DB.s));
    if (old) old.outerHTML = html; else if (html) w.insertAdjacentHTML('beforeend', html);
  }
  function heroMap(s, todo, dim = {}) {
    const G = cityGeo(), { W, H, phone, top, bot, H2 } = mapFrame(dim), A = W / H, searching = !!UI.qf;
    const { kindOf, att, show } = mapPins(s, todo);
    const hl = new Set([...att].map((fid) => FACTORIES[fid].dong));
    // 범위 — 구를 고르면 그 구에, 아니면 도시 전체에 맞춘다. UI.zoom은 배수(1 = 다 보임 ~ ZMAX).
    // 확대하면 휠로 옮긴 가운데(UI.c — 구나 도시 밖으로는 못 나감), 없으면 보이는 핀들의 가운데로 당긴다 (구를 골랐으면 구 가운데)
    const gu = UI.gu && G.gus.find((g) => g.name === UI.gu), bx = gu ? gu.b : G.b, z = UI.zoom;
    let cx = (bx.x0 + bx.x1) / 2, cy = (bx.y0 + bx.y1) / 2;
    if (z > 1 && UI.c) { cx = Math.min(bx.x1, Math.max(bx.x0, UI.c[0])); cy = Math.min(bx.y1, Math.max(bx.y0, UI.c[1])); }
    else if (z > 1 && !gu && show.length) { const ps = show.map((f) => mp(FACTORIES[f].ll)); cx = sum(ps.map((p) => p[0])) / ps.length; cy = sum(ps.map((p) => p[1])) / ps.length; }
    const vw = Math.max((bx.x1 - bx.x0) * 1.1, ((bx.y1 - bx.y0) * 1.1 * W) / H2) / z, vh = vw / A, k = W / vw;  // k: 지도 단위 하나가 화면 몇 px인가
    const vx = cx - vw / 2, vy = cy - (top + H2 / 2) / k;
    if (!dim.W) UI.mv = { vx, vy, k, ox: W / 2, oy: top + H2 / 2, W, H };  // 홈 지도의 지금 범위 — 휠 확대가 마우스 자리를 붙잡는 데 쓴다
    const inView = (bb) => !(bb.x1 < vx || bb.x0 > vx + vw || bb.y1 < vy || bb.y0 > vy + vh);
    const fs = (px) => (px / k).toFixed(2);
    const pins = show.map((fid) => ({ fid, kind: kindOf(fid), xy: mp(FACTORIES[fid].ll) })).sort((a, b) => (a.kind === 'plain') - (b.kind === 'plain') || a.xy[1] - b.xy[1]);
    // 이름표는 핀 아래 (지킴이 앱처럼) — 겹치면 오른쪽 · 왼쪽으로. 회색 점(그 밖 공장)은 이름 없이.
    // 찾기 중에는 찾은 공장이 다 이름을 단다 — 그 밖 공장도 회색 핀 + 이름표, 휴대폰도
    const placed = pins.map((p) => ({ x0: p.xy[0] - 14 / k, y0: p.xy[1] - 37 / k, x1: p.xy[0] + 14 / k, y1: p.xy[1] }));
    const hit = (b) => placed.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
    const WHY = { alarm: '경보 중', fault: '센서 고장이나 값 끊김', wait: '검사 대기', site: '센서 사이트', plain: '점검 대상' };
    const pinSvg = pins.map((p) => {
      const [x, y] = p.xy, nm = FACTORIES[p.fid].name;  // 마우스를 올리면 공장 정보 칸이 뜬다(pinInfo) — 브라우저 기본 말풍선(title)은 겹쳐서 뺐다
      const al = `aria-label="${nm} (${WHY[p.kind]})"`;
      if (p.kind === 'plain' && !searching) return `<g class="oppin k-plain" data-go="factory/${p.fid}" ${al} transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(1 / k).toFixed(4)})"><circle r="6.5"/></g>`;
      let lab = '';
      if (!phone || searching) {
        const w = (nm.length * 12.5 + 12) / k, h = 20 / k, g = 4 / k;
        const opts = [[x - w / 2, y + g], [x + 16 / k, y - 32 / k], [x - 16 / k - w, y - 32 / k], [x - w / 2, y - 60 / k], [x - w / 2, y + 28 / k]];
        const o = opts.find(([bx0, by0]) => !hit({ x0: bx0, y0: by0, x1: bx0 + w, y1: by0 + h })) || opts[0];
        placed.push({ x0: o[0], y0: o[1], x1: o[0] + w, y1: o[1] + h });
        const lx = (o[0] - x) * k, ly = (o[1] - y) * k;
        lab = `<rect x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" width="${(w * k).toFixed(1)}" height="20" rx="6" class="lb"/><text x="${(lx + (w * k) / 2).toFixed(1)}" y="${(ly + 14.5).toFixed(1)}">${nm}</text>`;
      }
      return `<g class="oppin k-${p.kind === 'plain' ? 'pp' : p.kind}" data-go="factory/${p.fid}" ${al} transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(1 / k).toFixed(4)})">
        ${p.kind === 'alarm' ? '<circle cy="-24" r="15" class="pulse"/>' : ''}<g transform="translate(-14 -37) scale(1.1667)"><path d="${PIN_D}"/><circle cx="12" cy="12" r="4.6"/></g>${lab}</g>`;
    }).join('');
    // 구를 골랐거나 휠 · 단추로 꽤 키웠으면 동 이름, 아니면 구 이름
    const labels = gu || z >= 2.4
      ? G.dongs.filter((d) => (gu ? d.gu === gu.name : inView(d.b)) && (d.b.x1 - d.b.x0) * k > d.name.length * 13 + 10
        && (d.c[1] - vy) * k > top + 8 && (d.c[1] - vy) * k < H - bot - 4).map((d) => {  // 위 찾기 칸 · 아래 범례 밑에 깔리지 않게
        const w = (d.name.length * 12) / k, h = 14 / k, b = { x0: d.c[0] - w / 2, y0: d.c[1] - h, x1: d.c[0] + w / 2, y1: d.c[1] + h * 0.3 };
        if (hit(b)) return '';
        placed.push(b);
        return `<text x="${d.c[0].toFixed(1)}" y="${d.c[1].toFixed(1)}" class="opdl" font-size="${fs(12)}">${d.name}</text>`;
      }).join('')
      : G.gus.map((g) => {
        const px = phone ? 13 : 16, w = (g.name.length * px * 1.05) / k, h = px / k;
        const dy = [0, 28, -28, 52].map((d) => d / k).find((d) => !hit({ x0: g.c[0] - w / 2, y0: g.c[1] + d - h, x1: g.c[0] + w / 2, y1: g.c[1] + d + h * 0.3 }));
        if (dy == null) return '';
        placed.push({ x0: g.c[0] - w / 2, y0: g.c[1] + dy - h, x1: g.c[0] + w / 2, y1: g.c[1] + dy + h * 0.3 });
        return `<text x="${g.c[0].toFixed(1)}" y="${(g.c[1] + dy).toFixed(1)}" class="opgl" font-size="${fs(px)}" style="fill:${GUC[g.name]}">${g.name}</text>`;
      }).join('');
    const nears = nearGeo().filter((n) => inView(n.b));
    const nearLabs = nears.filter((n) => (n.b.x1 - n.b.x0) * k > n.name.length * 14 + 24 && n.c[0] > vx + 20 / k && n.c[0] < vx + vw - 20 / k && n.c[1] > vy + top / k && n.c[1] < vy + vh - 10 / k).map((n) => {
      const w = (n.name.length * 13) / k, h = 14 / k, bb = { x0: n.c[0] - w / 2, y0: n.c[1] - h, x1: n.c[0] + w / 2, y1: n.c[1] + h * 0.3 };
      if (hit(bb)) return '';
      placed.push(bb);
      return `<text x="${n.c[0].toFixed(1)}" y="${n.c[1].toFixed(1)}" class="opnl" font-size="${fs(13)}">${n.name}</text>`;
    }).join('');
    return `<svg class="opmap${z > 1 ? ' pan' : ''}" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="화성시 공장 지도">
      <rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" class="opsea"/><g class="opnear">${nears.map((n) => `<path d="${n.d}"><title>${n.name}</title></path>`).join('')}</g>
      ${G.dongs.map((d) => `<path d="${d.d}" class="opdg${hl.has(d.name) ? ' att' : ''}${gu ? (d.gu === gu.name ? ' in' : ' out') : ''}" style="--gc:${GUC[d.gu]}"><title>${d.gu} ${d.name}${hl.has(d.name) ? ' (할 일 있음)' : ''}</title></path>`).join('')}
      <path d="${G.outline}" class="opcity"/>${labels}${nearLabs}${hereSvg(k)}${pinSvg}</svg>`;
  }
  /* 네이버 지도 — 크게 보기 창 · 공장 한 곳의 위치 (2026-10-01 사용자 결정: 홈 큰 지도는 그림 지도로 두고, 들여다볼 때 네이버).
     지킴이 앱 nvLoad · nvMount와 같은 방식이다 — 지도 한 벌을 계속 다시 쓰고(다시 그릴 때마다 만들면 깜박이고 사용량이 는다),
     mapkey.js에 Client ID가 없거나 못 불러오거나 인증이 막히면(등록한 주소가 아니면) 그림 지도로 대신한다 */
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
  const nvPin = (kind, nm) => (kind === 'plain' ? '<div class="opnvdot"></div>'
    : `<div class="opnvpin k-${kind}"><svg viewBox="0 0 24 32" width="28" height="37" aria-hidden="true"><path d="${PIN_D}"/><circle cx="12" cy="12" r="4.6"/></svg><b>${nm}</b></div>`);
  function nvMount() {
    const slot = $('#opNv');
    if (!slot || NV.st !== 'ready') return;
    const N = naver.maps, mode = slot.dataset.mode, s = DB.s, todo = todoItems(s);
    if (!NV.map) {
      NV.el = document.createElement('div'); NV.el.className = 'opnvmap'; slot.appendChild(NV.el);
      NV.map = new N.Map(NV.el, { mapDataControl: false, scaleControl: true, zoomControl: true,
        zoomControlOptions: { position: N.Position.TOP_RIGHT, style: N.ZoomControlStyle.SMALL } });
      const feat = (props, polys) => ({ type: 'Feature', properties: props, geometry: { type: 'MultiPolygon', coordinates: polys } });
      NV.map.data.addGeoJson({ type: 'FeatureCollection', features: [...HWASEONG.map((d) => feat({ kind: 'dong', name: d.name }, d.polys)), feat({ kind: 'city' }, HWASEONG_GU.city)] });
      NV.map.setSize(new N.Size(slot.clientWidth, slot.clientHeight));  // 네이버가 칸의 자리 잡기를 바꿔 높이가 0이 될 수 있어 크기를 직접 준다
    } else {
      slot.appendChild(NV.el);
      NV.map.setSize(new N.Size(slot.clientWidth, slot.clientHeight)); NV.map.refresh(true);
    }
    // 동 경계와 손쓸 곳이 있는 동(옅은 파랑) — 그림 지도와 같은 뜻
    const { kindOf, att, show } = mapPins(s, todo), hl = new Set([...att].map((fid) => FACTORIES[fid].dong));
    NV.map.data.setStyle((f) => (f.getProperty('kind') === 'city'
      ? { fillOpacity: 0, strokeColor: '#16284d', strokeWeight: 2.5, strokeOpacity: 0.85, clickable: false }
      : { fillColor: '#2458d6', fillOpacity: hl.has(f.getProperty('name')) ? 0.16 : 0.03, strokeColor: hl.has(f.getProperty('name')) ? '#2458d6' : '#5b6b85',
        strokeWeight: hl.has(f.getProperty('name')) ? 2 : 1, strokeOpacity: 0.7, clickable: false }));
    NV.marks.forEach((m) => m.setMap(null));
    const fids = mode === 'big' ? show : [mode.slice(4)];
    NV.marks = fids.map((fid) => {
      const f = FACTORIES[fid], kind = kindOf(fid);
      const m = new N.Marker({ map: NV.map, position: new N.LatLng(f.ll[1], f.ll[0]), title: f.name, zIndex: kind === 'plain' ? 5 : 10,
        icon: { content: nvPin(kind, f.name), anchor: kind === 'plain' ? new N.Point(8, 8) : new N.Point(14, 37) } });
      if (mode === 'big') N.Event.addListener(m, 'click', () => R.go('factory/' + fid));
      return m;
    });
    if (NV.fit !== mode) {  // 창을 열거나 공장이 바뀔 때만 범위를 맞춘다 — 다시 그릴 때마다 지도가 튀지 않게
      NV.fit = mode;
      if (mode === 'big') {
        const b = cityGeo().b;
        NV.map.fitBounds(new N.LatLngBounds(new N.LatLng(-b.y1 / 1000, b.x0 / (MK * 1000)), new N.LatLng(-b.y0 / 1000, b.x1 / (MK * 1000))), { top: 24, right: 24, bottom: 24, left: 24 });
      } else { const f = FACTORIES[mode.slice(4)]; NV.map.setCenter(new N.LatLng(f.ll[1], f.ll[0])); NV.map.setZoom(15, false); }
    }
  }
  // 크게 보기 창 — 홈 지도의 "크게" 단추. 네이버 지도가 없으면 같은 그림 지도를 크게
  function bigMap(s, todo) {
    const ok = NV.st === 'ready', phone = innerWidth <= 760, W = innerWidth - (phone ? 24 : 80), H = Math.max(280, innerHeight - (phone ? 150 : 180));
    return `<div class="ov" data-act="bigClose"></div><div class="opbigw" role="dialog" aria-modal="true" aria-label="화성시 지도 크게 보기">
      <div class="opbigh"><b>화성시 지도</b><span class="opmut">${ok ? '핀을 누르면 그 공장으로 가요' : NV.st === 'loading' ? '네이버 지도를 불러오는 중이에요' : NV.st === 'fail' ? '네이버 지도를 불러오지 못해 그림 지도로 보여요' : '그림 지도'}</span>
        <label class="opsort"><span>보기</span><select data-oph="view" aria-label="지도에 보일 공장">${VIEWS.map(([v, l]) => `<option value="${v}"${UI.view === v ? ' selected' : ''}>${l}</option>`).join('')}</select>${sv(OPI.down, 16)}</label>
        <button class="opmb" data-act="bigClose" aria-label="닫기">${I('close', 20)}</button></div>
      <div class="opbigm" id="opNv" data-mode="big" style="height:${H}px">${ok ? '' : heroMap(s, todo, { W, H, top: 16, bot: 16 })}</div></div>`;
  }
  // 작은 지도 — 지킴이 앱 공장 카드의 작은 지도와 같은 색 (그 공장의 읍·면·동 + 둘레 + 파란 점)
  function miniMap(fid) {
    const G = cityGeo(), f = FACTORIES[fid], d = G.dongs.find((x) => x.name === f.dong), [px, py] = mp(f.ll);
    const b = d ? d.b : { x0: px - 3, y0: py - 3, x1: px + 3, y1: py + 3 };
    let w = (b.x1 - b.x0) * 1.3, h = (b.y1 - b.y0) * 1.3;
    if (w / h > 1.375) h = w / 1.375; else w = h * 1.375;
    const vx = (b.x0 + b.x1) / 2 - w / 2, vy = (b.y0 + b.y1) / 2 - h / 2;
    const near = G.dongs.filter((x) => x !== d && !(x.b.x1 < vx || x.b.x0 > vx + w || x.b.y1 < vy || x.b.y0 > vy + h));
    return `<svg class="opmini" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${f.name} 위치 지도">
      <rect x="${vx}" y="${vy}" width="${w}" height="${h}" class="bg"/>${near.map((x) => `<path d="${x.d}"/>`).join('')}${d ? `<path class="own" d="${d.d}"/>` : ''}
      <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(w * 0.075).toFixed(2)}" class="halo"/><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(w * 0.035).toFixed(2)}" class="dot"/></svg>`;
  }
  // 조가 맡은 구역 — 도시 전체를 옅게, 그 조의 동만 파랑 (레퍼런스의 트럭 사진 자리). 점검 기록이 아니라 조 편성의 담당 권역이다.
  // 2026-10-01 사용자가 "담당인지 점검한 곳인지" 물어 지도 아래에 파란 네모 + "○조 담당 구역"을 붙였다
  function sqMap(q) {
    const G = cityGeo(), b = G.b, pad = (b.x1 - b.x0) * 0.04;
    return `<svg viewBox="${(b.x0 - pad).toFixed(1)} ${(b.y0 - pad).toFixed(1)} ${(b.x1 - b.x0 + 2 * pad).toFixed(1)} ${(b.y1 - b.y0 + 2 * pad).toFixed(1)}" aria-hidden="true">
      ${G.dongs.map((d) => `<path d="${d.d}"${q.areas.includes(d.name) ? ' class="on"' : ''}/>`).join('')}</svg>`;
  }

  // 그래프 — 일별 점검 건수(평일만)는 월 숫자를 날마다 나눈 가상값 (8월 · 9월)
  function dayCounts(m, total, last) {
    const days = [];
    for (let d = 1; d <= last; d++) { const wd = new Date(2026, m - 1, d).getDay(); if (wd && wd < 6) days.push(d); }
    const wts = days.map((d) => 0.55 + ((Math.sin(d * 12.9898 + m * 78.233) * 43758.5453) % 1 + 1) % 1);
    const tot = sum(wts), out = days.map((d, i) => [`${m}/${d}`, Math.floor((total * wts[i]) / tot)]);
    for (let r = total - sum(out.map((x) => x[1])), i = 0; r > 0; r--, i = (i + 3) % out.length) out[i][1]++;
    return out;
  }
  // 점검 건수 그래프 — 0부터 그린다 (흔들림을 부풀리지 않게). 2026-10-01 사용자 "좀 더 꾸며줘":
  // 8월은 옅게, 아래 숫자(9월 점검)와 이어지는 9월은 파랑 선 + 옅은 채움, 9월 1일에 점선 칸막이. 눈금선 셋(0 · 가운데 · 위)과 숫자.
  // 마우스를 올리면 그날 세로선 · 점 · 건수, 마지막 날(앱 시계의 오늘)은 점을 늘 보인다. 글자는 SVG 밖에 둬서 늘어나지 않게 한다.
  // 같은 날 그래프 규칙에 맞춤: 선 2px, 채움은 10% 옅은 색, 눈금선 · 칸막이는 점선이 아닌 실선(점선은 "목표선"처럼 읽힌다)
  function lineChart(pts) {
    const n = pts.length, top = Math.max(2, Math.ceil(Math.max(...pts.map((p) => p[1])) / 2) * 2);
    const X = (i) => (i * 100) / (n - 1), Y = (v) => 100 - (v / top) * 90;  // 위 10%는 비워 둔다
    const k = Math.max(0, pts.findIndex((p) => p[0].startsWith('9/')));
    const line = (a, b) => pts.slice(a, b + 1).map(([, v], j) => `${X(a + j).toFixed(2)},${Y(v).toFixed(2)}`).join(' ');
    const area = (a, b) => `${X(a).toFixed(2)},100 ${line(a, b)} ${X(b).toFixed(2)},100`;
    const grid = [0, top / 2, top];
    return `<div class="opchart"><div class="opyax">${grid.map((g) => `<span style="top:${Y(g)}%">${g}</span>`).join('')}</div>
      <div class="opplot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${grid.map((g) => `<line class="${g ? 'g' : 'base'}" x1="0" x2="100" y1="${Y(g)}" y2="${Y(g)}"/>`).join('')}
        ${k ? `<polygon class="aug" points="${area(0, k)}"/><polyline class="aug" points="${line(0, k)}"/><line class="cut" x1="${X(k)}" x2="${X(k)}" y1="0" y2="100"/>` : ''}
        <polygon class="sep" points="${area(k, n - 1)}"/><polyline class="sep" points="${line(k, n - 1)}"/></svg>
        ${k ? `<span class="opmon" style="left:${X(k)}%">9월</span>` : ''}
        ${pts.map(([d, v], i) => `<i class="${i < k ? 'a' : ''}${i === n - 1 ? ' last' : ''}${i < 3 ? ' l' : i > n - 4 ? ' r' : ''}" style="left:${X(i).toFixed(2)}%;width:${(100 / (n - 1)).toFixed(2)}%;--y:${Y(v).toFixed(2)}%" data-d="${d}" data-v="${v}건"><b></b></i>`).join('')}</div></div>
      <div class="opax"><span style="left:0">${pts[0][0]}</span>${k ? `<span style="left:${X(k)}%">${pts[k][0]}</span>` : ''}<span style="left:100%">${pts[n - 1][0]}</span></div>`;
  }

  // 틀 — 지킴이 앱처럼 남색 띠(+ 안전 줄무늬) 맨 위, 그 아래 흰 머리글(파란 방패 로고 · 가로 메뉴 · 종 · 조작판 · 내 이름).
  // 메뉴는 보통 웹처럼 아이콘 옆 이름 (2026-10-01 사용자 지시 — 왼쪽 사이드바로 옮겼다가 같은 날 다시 위로). 휴대폰에서는 지킴이 앱처럼 화면 아래 뜬 막대
  const mainW = () => Math.min(innerWidth - (innerWidth <= 760 ? 24 : 40), 1240);
  function opShell(s, todo, active, title, body) {
    const n = todo.length, hot = todo.some((x) => x.k === 'alarm');
    return `<div class="oph"><div class="opband"><div class="opbi"><button class="hm" data-go="" aria-label="홈">${I('home', 19)}</button><span class="sep">›</span><span>${title}</span>
        <span class="end"><span>산업안전지킴이 운영센터</span><span>${hm(s.clock)} 기준</span></span></div></div>
      <header class="optop"><div class="opin">
        <button class="brand opbrand" data-go="" aria-label="산업안전 운영 홈"><i class="mark"></i><span><b>산업안전 운영</b><small>산업안전지킴이 운영센터</small></span></button>
        <nav class="opnav" aria-label="메뉴">${TABS.map(([p, t]) => `<button class="${p === active ? 'on' : ''}" data-go="${p}"${p === active ? ' aria-current="page"' : ''}>${tabIcon(p, 20)}<span>${t}</span></button>`).join('')}</nav>
        <div class="opright">
          <button class="opic${UI.bell ? ' on' : ''}" data-act="bell" aria-label="오늘 할 일 ${n}건" aria-expanded="${UI.bell}">${I('bell', 20)}${n ? `<em class="${hot ? 'hot' : ''}">${n}</em>` : ''}</button>
          <button class="opic" data-act="ctl" aria-label="시연 조작판" title="진행자용 시연 조작판">${I('gear', 20)}</button>
          <button class="opme" data-go="me">${esc(ME)} ${chev(15)}</button></div>
        ${UI.bell ? `<div class="opbell"><div class="opch"><b>오늘 할 일</b><em class="opcnt">${n}건</em><span class="opmut r">${hm(s.clock)} 기준</span></div>
          <div class="oplist">${todo.map((x) => `<button class="oprow" data-go="${x.go}"><span class="opth k-${x.k}">${todoIcon(x, 20)}</span>
            <span class="optx"><span class="optg k-${x.k}">${x.tag}</span><b>${esc(x.t)}${x.w ? `<span>${esc(x.w)}</span>` : ''}</b><small>${x.d.map((p) => `<span>${esc(p)}</span>`).join('')}</small></span></button>`).join('') || '<div class="opnone">지금 할 일이 없어요</div>'}</div></div>` : ''}
      </div></header>
      <main class="ophm">${body}</main></div>`;
  }

  function home(s) {
    const w = waiting(s), qs = squads(s), ts = qs.map((q) => sqStats(s, q)), todo = todoItems(s);
    const plan = sum(ts.map((t) => t.firms)), done = sum(ts.map((t) => t.month)), resN = sum(ts.map((t) => sum(t.res))), weekN = sum(ts.map((t) => t.week));
    const fxReq = sum(ts.map((t) => t.fx[0])), fxOk = sum(ts.map((t) => t.fx[1]));
    const live = s.alarms.filter(SIM.live), faultN = todo.filter((x) => x.k === 'fault').length, ap = pendingApps(s);
    const days = [...dayCounts(8, OP_MONTHS[4][1], 31), ...dayCounts(9, resN, 17)].slice(-22);
    locate();
    const today = Object.entries(s.visits).filter(([, v]) => String(v || '').startsWith('오늘'));
    // 2026-10-01 사용자: AI스러운 것 걷기 — 칸 제목 앞 장식 아이콘 · 상태 알약(지금 확인 · 승인 기다림) · 장식 막대 · `·`로 이은 글을 뺀다.
    // 숫자 칸은 이름 → 숫자 → 자세한 것(사실만) 세 줄로 끊는다
    const head = (t, right = '') => `<div class="opch"><b>${t}</b>${right}</div>`;
    const link = (go, t) => `<button class="oplink" data-go="${go}">${t} ${chev(14)}</button>`;
    const num = (k, v, d) => `<div><span class="k">${k}</span><b>${v}</b>${d ? `<span>${d}</span>` : ''}</div>`;
    // 비율 하나는 미터 — 같은 파랑의 옅은 칸 위에 채운 막대 (그래프 규칙: 비율 하나에 원형 두 조각은 쓰지 않는다)
    const rate = (k, a, b, d) => `<div class="oprate"><span class="k">${k}</span><b>${pct(a, b)}<small>%</small></b>
      <span class="opmeter" role="img" aria-label="${d}"><i style="width:${b ? Math.min(100, (a / b) * 100).toFixed(1) : 0}%"></i></span><span>${d}</span></div>`;
    // 점검실적은 원 그래프 (같은 날 사용자 지시) — 12시에서 시계 방향으로 채우고 가운데에 %, 옆에 이름과 몇 곳 중 몇 곳
    const ring = (k, a, b, d) => { const r = 38, C = 2 * Math.PI * r, f = b ? Math.min(1, a / b) : 0;
      return `<div class="opring"><span class="opringc" role="img" aria-label="${k} ${pct(a, b)}%, ${d}" title="${d}"><svg viewBox="0 0 92 92" aria-hidden="true">
        <circle cx="46" cy="46" r="${r}" class="t"/><circle cx="46" cy="46" r="${r}" class="f" stroke-dasharray="${(C * f).toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 46 46)"/></svg>
        <b>${pct(a, b)}<small>%</small></b></span><span class="opringt"><span class="k">${k}</span><span>${d}</span></span></div>`; };
    // ① 점검 건수 + 작은 칸 넷
    const cVol = `<div class="opc opvol">${head('점검 건수', link('stats', '통계'))}
      ${lineChart(days)}
      <div class="opnums">${num('9월 점검', `${resN}<small>건</small>`, '9월 1일 ~ 17일')}${ring('9월 점검실적', done, plan, `${plan}곳 중 ${done}곳`)}</div></div>`;
    // 아이콘 네모는 같은 날 사용자 지시로 되돌림 ("원래 있던 아이콘 … 좀 더 꾸며줘") — 종류별 색: 검사 대기 파랑 · 경보 빨강 · 고장 주황 · 그 밖 남색
    // 숫자 밑 설명 줄(공장 이름 · 경보 난 센서 · 신청자 · 방문 시각)은 같은 날 사용자 지시로 뺐다 — 이름 · 아이콘 · 숫자만
    const tile = (go, k, ic, t, val, hot) => `<button class="opc optile${hot ? ' hot' : ''}" data-go="${go}"><span class="optt"><i class="opti k-${k}">${ic}</i>${t}</span><b class="opv">${val}</b></button>`;
    const tiles = `<div class="optl">
      ${tile(w[0] ? `insp/v/${w[0].id}` : 'insp', 'wait', I('clipboard', 18), '제출 검사 대기', `${w.length}<small>건</small>`)}
      ${tile('factories/sensor', live.length ? 'alarm' : faultN ? 'fault' : 'ok', I('alert', 18), '센서 경보', `${live.length}<small>건</small>`, live.length)}
      ${tile('squads/guards', 'apply', I('user', 18), '가입 신청', `${ap.length}<small>명</small>`)}
      ${tile('insp/visits', 'visit', I('calendar', 18), '오늘 방문', `${today.length}<small>곳</small>`)}</div>`;
    // ② 점검조 — 조를 넘겨 가며 맡은 구역을 본다
    const i0 = ((UI.sqi % qs.length) + qs.length) % qs.length, q = qs[i0], t = ts[i0], prev = qs[(i0 + qs.length - 1) % qs.length], next = qs[(i0 + 1) % qs.length];
    const sentN = ts.filter((x) => x.sentOk).length, wMax = Math.max(1, ...ts.map((x) => x.week));
    // 2026-10-01 사용자: "9월 실적률"은 점검 건수 칸의 9월 점검실적과 같은 숫자라 뺐다. 숫자는 그래프로 —
    // 조별 이번 주 점검은 막대(지도에 보이는 조만 파랑, 나머지 회색), 줄을 누르면 그 조로 넘어간다. 주간 보고는 줄마다 제출 · 미제출 (같은 날 사용자: 냄 · 안 냄을 다른 말로 — 기존 웹의 "제출")
    const sqRows = qs.map((x, i) => { const u = ts[i];
      return `<button class="opsqr${i === i0 ? ' on' : ''}" data-act="sqPick" data-v="${i}" title="${esc(x.name)} 이번 주 점검 ${u.week}건, 주간 보고 ${u.sentOk ? '제출' : '미제출'}">
        <span class="n">${esc(x.name)}</span><span class="bar"><i style="width:${((u.week / wMax) * 100).toFixed(1)}%"></i></span><span class="v">${u.week}건</span><span class="opsqs${u.sentOk ? '' : ' no'}">${u.sentOk ? '제출' : '미제출'}</span></button>`; }).join('');
    const cSq = `<div class="opc opsq">${head('점검조', `<span class="opmut r">${qs.length}개 조</span>`)}
      <div class="opnums">${num('이번 주 점검', `${weekN}<small>건</small>`, '')}${num('주간 보고 제출', `${sentN}<small>/${qs.length}조</small>`, '')}</div>
      <div class="opsqb"><div class="opsqh" aria-hidden="true"><span>조</span><span>이번 주 점검</span><span></span><span>주간 보고</span></div>${sqRows}</div>
      <div class="opcar"><span class="side l" aria-hidden="true">${sqMap(prev)}</span><button class="main" data-go="squads/${q.id}" aria-label="${esc(q.name)} 담당 구역 지도, 편성 보기">${sqMap(q)}</button><span class="side r" aria-hidden="true">${sqMap(next)}</span>
        <button class="opnavb l" data-act="sqi" data-v="-1" aria-label="앞 조">${sv(OPI.left, 18)}</button><button class="opnavb r" data-act="sqi" data-v="1" aria-label="다음 조">${sv(OPI.right, 18)}</button></div>
      <div class="opcap"><b><i class="opsw" aria-hidden="true"></i>${esc(q.name)} 담당 구역</b><span>${areaText(q.areas).replace(/<[^>]+>/g, '')}</span><span>${t.wait ? `검사 대기 ${t.wait}건` : `이번 주 점검 ${t.week}건`}</span></div>
      <div class="oplead"><i>${I('user', 22)}</i><span><b>${esc(q.lead)}</b><small>${esc(q.name)} 조장</small></span>
        <div class="oplacts"><button class="opsq2" data-act="sqFac" data-id="${q.id}" aria-label="${esc(q.name)} 공장 보기">${I('pin', 16)}공장</button>
        <a class="opsq2" href="tel:010-0000-03${String(i0 + 1).padStart(2, '0')}" aria-label="${esc(q.lead)}에게 전화">${I('phone', 16)}전화</a>
        <button class="opsq2" data-act="sqMsg" data-n="${esc(q.lead)}" aria-label="${esc(q.lead)}에게 문자">${I('message', 16)}문자</button></div></div></div>`;
    // ③ 다음 검사 — 지킴이 앱의 "최근 점검한 곳" 파란 칸과 같은 모양 + 개선지도.
    // 늘 같은 자리에 멈춰 있던 진행 막대(점검 → 제출 → 승인)와 `#` 번호는 빼고, 이름표 · 값 표로 (2026-10-01 사용자: AI스러운 것 걷기)
    const nx = w[0];
    const cNext = nx ? `<div class="opnext"><div class="opnt">다음 검사<span class="opdate">${I('calendar', 15)} ${nx.date} 점검</span></div>
        <div class="opnxr"><div class="opnxt"><b>${FACTORIES[nx.fid].name}</b>
          <dl class="opnkv"><dt>점검번호</dt><dd>${insNo(s, nx)}</dd><dt>지킴이</dt><dd>${esc(nx.by)}</dd><dt>위치</dt><dd>화성시 ${FACTORIES[nx.fid].dong}</dd><dt>문제</dt><dd>${badOf(nx).length}개</dd></dl>
          <button class="opgo" data-go="insp/v/${nx.id}">검사하기 ${chev(16)}</button></div>
          <button class="opmw" data-go="factory/${nx.fid}" aria-label="${FACTORIES[nx.fid].name} 공장 보기">${miniMap(nx.fid)}</button></div>
        <div class="opacts"><a class="opact2" href="tel:010-0000-02${String(qs.findIndex((x) => x.members.includes(nx.by)) + 1).padStart(2, '0')}">${I('phone', 17)}지킴이에게 전화</a>
          <button class="opact2" data-go="insp">${I('clipboard', 17)}검사 대기 ${w.length}건</button></div></div>`
      : `<div class="opnext"><div class="opnt">다음 검사</div><div class="opsub">검사 기다리는 점검이 없어요</div></div>`;
    const sep = [0.4, 0.4, 0.2], sepOk = [0.45, 0.42, 0.13];
    const wk = [...OP_FIX_WEEKS, ...sep.map((f, i) => [9, Math.round(fxReq * f), Math.round(fxOk * sepOk[i])])], mx = Math.max(...wk.map((x) => x[1]));
    const cFix = `<div class="opc opfix">${head('개선지도', '<span class="opmut r">6월 ~ 9월</span>')}
      <div class="opnums">${rate('고쳐짐 확인', fxOk, fxReq, `개선 요청 ${fxReq}건 중 ${fxOk}건`)}</div>
      <div class="opwb">${wk.map(([m, r, o]) => `<span class="${m === 9 ? 'now' : ''}" title="${m}월 개선 요청 ${r}건, 고쳐짐 확인 ${o}건"><i style="height:${Math.round((r / mx) * 100)}%"><b style="height:${r ? Math.round((o / r) * 100) : 0}%"></b></i></span>`).join('')}</div>
      <div class="opwbm"><span>6월</span><span>7월</span><span>8월</span><span class="now">9월</span></div>
      <div class="opleg"><span><i class="a"></i>개선 요청</span><span><i class="b"></i>고쳐짐 확인</span></div></div>`;
    // 범례 핀은 지도 핀과 같은 모양 (2026-10-01 사용자: 돌린 네모가 어색하다)
    const lgPin = (k) => `<svg class="lgpin k-${k}" viewBox="0 0 24 32" width="11" height="15" aria-hidden="true"><path d="${PIN_D}"/><circle cx="12" cy="12" r="4.6"/></svg>`;
    const guSel = `<div class="opgu">${[['', '전체'], ...Object.keys(GUC).map((g) => [g, g])].map(([v, l]) => `<button class="${UI.gu === v ? 'on' : ''}" data-act="gu" data-v="${v}" style="--gc:${GUC[v] || '#2458d6'}" aria-pressed="${UI.gu === v}">${v ? '<i></i>' : ''}${l}</button>`).join('')}</div>`;
    return opShell(s, todo, '', '홈', `
        <section class="opmapw" style="height:${mapH()}px">${heroMap(s, todo)}
          <div class="opmtl"><div class="opsbox"><label class="opsearch">${sv(OPI.search, 18)}<input id="ophq" value="${esc(UI.sq)}" placeholder="공장 이름으로 찾기" aria-label="공장 이름, 읍·면·동, 업종으로 찾기" autocomplete="off" enterkeyhint="search" role="combobox" aria-expanded="${UI.sOpen}">
              ${UI.qf ? `<span class="opsn">${UI.qf.length}곳</span>` : ''}<button class="opsx" data-act="sClear" aria-label="찾기 지우기"${UI.sq || UI.qf ? '' : ' hidden'}>${I('close', 16)}</button></label>${suggBox()}</div>
            <label class="opsort"><span>보기</span><select data-oph="view" aria-label="지도에 보일 공장">${VIEWS.map(([v, l]) => `<option value="${v}"${UI.view === v ? ' selected' : ''}>${l}</option>`).join('')}</select>${sv(OPI.down, 16)}</label></div>
          <div class="opmtr">${guSel}<button class="opmb" data-act="bigOpen" aria-label="지도 크게 보기" title="크게 보기 (네이버 지도)">${sv(OPI.expand, 20)}</button></div>
          <div class="opzoom"><button class="opmb" data-act="zoom" data-v="1" aria-label="확대"${UI.zoom >= ZMAX ? ' disabled' : ''}>${I('plus', 20)}</button><button class="opmb" data-act="zoom" data-v="-1" aria-label="축소"${UI.zoom <= 1 ? ' disabled' : ''}>${sv(OPI.minus, 20)}</button></div>
          <div class="oplegend"><span>${lgPin('alarm')}경보</span><span>${lgPin('wait')}검사 대기</span><span>${lgPin('site')}센서 사이트</span><span><i class="dot"></i>점검 대상</span><span><i class="sq"></i>할 일 있는 동</span><span><i class="me"></i>내 위치</span></div>
          ${tipBox(s, todo)}
        </section>
        <section class="opgrid"><div class="opcol">${cVol}${tiles}</div>${cSq}<div class="opcol">${cNext}${cFix}</div></section>
        <div class="proto">시제품이라 다른 조 숫자, 일별 점검 건수, 6~8월 개선지도는 가상이에요.<br>지도 경계 출처: 통계청 SGIS, vuski/admdongkor (CC BY 4.0)</div>
        ${UI.bigMap ? bigMap(s, todo) : ''}`);
  }

  /* ---------- M2 점검 — 제출 검사 · 점검 기록 · 방문 일정 · 개선 요청 · 주간 보고 ---------- */
  function inspTabs(s, on) {
    const n = waiting(s).length;
    return `<nav class="wtabs sub">${[['insp', `제출 검사${n ? ` <span class="pill blue">${n}</span>` : ''}`], ['insp/all', '점검 기록'], ['insp/visits', '방문 일정'], ['insp/fix', '개선 요청'], ['insp/weekly', '주간 보고']]
      .map(([p, t]) => `<button class="${p === on ? 'on' : ''}" data-go="${p}">${t}</button>`).join('')}</nav>`;
  }
  function inspDetail(s, i, act) {
    const f = FACTORIES[i.fid], st = stOf(i), prev = i.items.filter((x) => x.ref), bad = badOf(i);
    const ok = i.items.filter((x) => x.answer === 'ok' && !x.ref), na = i.items.filter((x) => x.answer === 'na' && !x.ref), none = i.items.filter((x) => !x.answer);
    const noMemo = bad.filter((x) => !x.memo), hist = [...(i.backs || []), ...(i.back ? [i.back] : [])];
    const line = (x, w) => `<div class="small">· ${esc(x.text)} — ${w}</div>`;
    return `
      <div class="rowx"><span class="opttl">${f.name}</span>${stPill(i)}</div>
      ${kv([['점검번호', insNo(s, i)], ['점검일', i.date], ['지킴이', `${insTeam(i)} ${esc(i.by)}`], ['읍·면·동', f.dong], ['업종', f.type], ['결과', i.result || RESULTS[0]], ['판', i.ver || CHECKLIST.ver], ['문항', i.items.length + '개']])}
      ${hist.map((b) => `<div class="warn"><b>${b.at} 반려</b> · ${esc(b.note)}${b === i.back ? '' : ' → 고쳐서 다시 냄'}</div>`).join('')}
      ${prev.length ? `<div class="lbl">지난번 미흡 확인 ${prev.length}개</div>${prev.map((x) => `<div class="item2${x.answer === 'bad' ? ' strong' : ''}"><div class="rowx"><b>${esc(x.text)}</b><span class="state">${x.answer === 'ok' ? '✓ 고쳐짐' : x.answer === 'bad' ? '⚠ 안 고쳐짐' : '답 없음'}</span></div>
        ${x.reason ? `<div class="small">안 고쳐진 사정: ${esc(x.reason)}</div>` : ''}${x.memo ? `<div class="small">메모: ${esc(x.memo)}</div>` : ''}</div>`).join('')}` : ''}
      <div class="lbl">문제 있음 ${bad.length}개</div>
      ${bad.map((x) => `<div class="item2 strong"><div class="rowx"><b>${esc(x.text)}</b>${srcTag(x)}</div>
        <div class="small">${x.memo ? `지킴이 메모: ${esc(x.memo)}` : '<b class="opno">메모 없음</b>'}${x.shot ? ' · 📷 사진 1장' : ''}</div></div>`).join('') || '<div class="small">문제 없음</div>'}
      <button class="add" data-act="okToggle">이상 없음 ${ok.length}개${na.length ? ` · 해당 없음 ${na.length}개` : ''}${none.length ? ` · 답 없음 ${none.length}개` : ''} ${UI.okOpen ? '▾ 접기' : '▸ 펼치기'}</button>
      ${UI.okOpen ? [...none.map((x) => line(x, '<b class="ink">답 없음</b>')), ...ok.map((x) => line(x, '이상 없음')), ...na.map((x) => line(x, '해당 없음'))].join('') : ''}
      ${act && st === 'wait' ? `
        ${noMemo.length || none.length ? `<div class="warn"><b>살펴볼 점</b>${noMemo.length ? `<br>· 문제 항목 ${noMemo.length}개에 메모가 없어요` : ''}${none.length ? `<br>· 답하지 않은 항목이 ${none.length}개 있어요` : ''}</div>` : ''}
        <div class="row opact"><button class="btn ghost inl" data-act="backOpen" data-id="${i.id}">반려</button><button class="btn inl" data-act="okOpenDlg" data-id="${i.id}">승인</button></div>` : ''}
      ${st === 'ok' ? `<div class="small">🔒 ${i.okAt ? `${i.okAt} ${esc(i.okBy || '운영자')} 승인 · ` : ''}승인한 점검은 고칠 수 없어요${bad.length ? ` · 문제 ${bad.length}개는 공장주에게 개선 요청으로 갔어요` : ''}</div>` : ''}
      ${st === 'back' ? '<div class="small">지킴이가 고쳐서 다시 내기를 기다려요</div>' : ''}`;
  }
  function review(s, id) {
    const list = waiting(s), cur = list.find((i) => i.id === id) || list[0];
    if (!cur) return frame('insp', `${inspTabs(s, 'insp')}<div class="kcard"><div class="kt">검사 기다리는 점검이 없어요</div>
      <div class="small">지킴이가 점검을 내면 여기에 올라와요. 처리한 점검은 점검 기록에서 봐요.</div><button class="more" data-go="insp/all">점검 기록 보기</button></div>`);
    return frame('insp', `${inspTabs(s, 'insp')}
      <div class="split"><div class="list"><div class="lbl">오래된 것부터 ${list.length}건</div>
        ${list.map((i) => `<button class="q ${i === cur ? 'now' : ''}" data-go="insp/v/${i.id}"><div class="rowx"><span class="t">${FACTORIES[i.fid].name}</span>${(i.backs || []).length ? '<span class="pill amber">다시 냄</span>' : ''}</div>
          <div class="small">${insTeam(i)} ${esc(i.by)} · ${i.date} 점검<br>${i.result || RESULTS[0]} · 문제 ${badOf(i).length}개</div></button>`).join('')}</div>
      <div class="detail">${inspDetail(s, cur, true)}</div></div>`);
  }
  function inspView(s, id) {
    const i = s.inspections.find((x) => x.id === id);
    if (!i) return recList(s);
    if (stOf(i) === 'wait') return review(s, id);
    return frame('insp', `${inspTabs(s, 'insp/all')}<div><button class="link" data-act="back">← 뒤로</button></div><div class="detail opone">${inspDetail(s, i, false)}</div>`);
  }
  function recList(s) {
    const F = UI.f.rec, sq = squads(s);
    const rows = s.inspections.filter((i) => (!F.sq || insTeam(i) === F.sq) && (!F.st || stOf(i) === F.st) && (!F.res || (i.result || RESULTS[0]) === F.res)
      && (!F.q || FACTORIES[i.fid].name.includes(F.q))).sort((a, b) => mdNum(b.date) - mdNum(a.date));
    const d = s.draft && FACTORIES[s.draft.fid];
    const draft = d && (!F.st || F.st === 'draft') && (!F.sq || F.sq === TEAM.name) && !F.res && (!F.q || d.name.includes(F.q));
    return frame('insp', `${inspTabs(s, 'insp/all')}
      <div class="opf">${sel('rec.sq', F.sq, [['', '모든 조'], ...sq.map((q) => [q.name, q.name])], '점검조')}
        ${sel('rec.st', F.st, [['', '전체'], ['draft', '점검중'], ['wait', '검사 대기'], ['ok', '승인'], ['back', '반려']], '점검과정')}
        ${sel('rec.res', F.res, [['', '전체'], ...RESULTS.map((r) => [r, r])], '점검결과')}${find('rec.q', F.q, '공장 이름')}</div>
      <div class="tscroll"><table><tr><th>점검번호</th><th>점검일</th><th>공장</th><th>읍·면·동</th><th>점검조</th><th>지킴이</th><th>결과</th><th>문제</th><th>과정</th><th></th></tr>
        ${draft ? `<tr><td>—</td><td>9/17</td><td><b>${d.name}</b></td><td>${d.dong}</td><td>${TEAM.name}</td><td>—</td><td>—</td><td>—</td><td><span class="pill gray">점검중</span></td><td></td></tr>` : ''}
        ${rows.map((i) => `<tr class="click" data-go="insp/v/${i.id}"><td>${insNo(s, i)}</td><td>${i.date}</td><td><b>${FACTORIES[i.fid].name}</b></td><td>${FACTORIES[i.fid].dong}</td>
          <td>${insTeam(i)}</td><td>${esc(i.by)}</td><td>${i.result || RESULTS[0]}</td><td>${badOf(i).length}개</td><td>${stPill(i)}</td><td class="go">보기 ›</td></tr>`).join('')}
      </table></div>
      ${rows.length || draft ? '' : '<div class="small">맞는 점검이 없어요.</div>'}
      <div class="proto">시제품 · 점검 기록은 ${TEAM.name} 것만 있어요</div>`);
  }
  // 방문 일정 — 지킴이가 예약하고 공장주가 승인한다 (2026-09-22). 운영자는 보기만 한다 (가설: 기존 웹 "사전조사")
  const visitKey = (v) => (String(v).startsWith('오늘') ? 917 : mdNum(v)) * 10000 + +(String(v).match(/(\d\d):(\d\d)/) || [0, 0, 0]).slice(1).join('');
  function visits(s) {
    const rows = [];
    Object.keys(FACTORIES).forEach((fid) => {
      const v = s.visits[fid], b = bookOf(s, fid);
      if (b) rows.push({ fid, when: b.v, st: b.st === 'wait' ? ['공장주 승인 기다림', 'blue'] : ['공장주가 거절함', 'amber'], by: b.by, note: v ? `지금 잡힌 방문 ${v}` : '' });
      else if (v) rows.push({ fid, when: v, st: ['확정', 'green'], by: '' });
    });
    rows.sort((a, b) => visitKey(a.when) - visitKey(b.when));
    const none = allFids(s).filter((fid) => !s.visits[fid] && !bookOf(s, fid)).length;
    return frame('insp', `${inspTabs(s, 'insp/visits')}
      <div class="small">방문 날짜는 지킴이가 공장주와 맞춰요. 운영자는 보기만 해요. 방문이 안 잡힌 공장 ${none}곳.</div>
      <div class="tscroll"><table><tr><th>방문</th><th>공장</th><th>읍·면·동</th><th>점검조</th><th>상태</th><th>요청한 지킴이</th><th></th></tr>
        ${rows.map((r) => { const f = FACTORIES[r.fid], q = sqOfDong(s, f.dong); return `<tr class="click" data-go="factory/${r.fid}"><td><b>${esc(r.when)}</b></td><td>${f.name}</td><td>${f.dong}</td><td>${q ? q.name : '—'}</td>
          <td><span class="pill ${r.st[1]}">${r.st[0]}</span>${r.note ? `<br><span class="small">${esc(r.note)}</span>` : ''}</td><td>${esc(r.by) || '—'}</td><td class="go">보기 ›</td></tr>`; }).join('')}
      </table></div>`);
  }
  function fixList(s) {
    const all = tracked(s), k = UI.f.fix, cnt = (x) => all.filter((e) => e.st === x).length;
    const rows = all.filter((e) => k === 'all' || e.st === k);
    const news = (e) => { const l = (e.it.log || []).slice(-1)[0]; if (!l) return '—';
      return l.t === 'fix' ? `${l.at} 공장주 "고쳤어요"${l.note ? ` · ${esc(l.note)}` : ''}` : `${l.at} 점검에서 ${l.result === 'fixed' ? '고쳐짐' : '안 고쳐짐'}${l.reason ? ` · ${esc(l.reason)}` : ''}`; };
    const chips = [['all', `전체 ${all.length}`], ['todo', `아직 안 고침 ${cnt('todo')}`], ['claimed', `고쳤다고 함 ${cnt('claimed')}`], ['back', `안 고쳐짐 ${cnt('back')}`], ['fixed', `고쳐짐 확인 ${cnt('fixed')}`]];
    return frame('insp', `${inspTabs(s, 'insp/fix')}
      <div class="wseg">${chips.map(([v, t]) => `<span class="${k === v ? 'on' : ''}" data-act="fixF" data-v="${v}">${t}</span>`).join('')}</div>
      <div class="tscroll"><table><tr><th>공장</th><th>문제 항목</th><th>찾은 날</th><th>지킴이</th><th>상태</th><th>마지막 소식</th><th></th></tr>
        ${rows.map((e) => `<tr class="click" data-go="factory/${e.ins.fid}"><td><b>${FACTORIES[e.ins.fid].name}</b></td><td>${esc(e.it.text)}</td><td>${e.ins.date}</td><td>${esc(e.ins.by)}</td>
          <td><span class="pill ${WORD[e.st][1]}">${WORD[e.st][0]}</span></td><td class="small">${news(e)}</td><td class="go">보기 ›</td></tr>`).join('')}
      </table></div>
      ${rows.length ? '' : '<div class="small">맞는 항목이 없어요.</div>'}
      <div class="small">승인한 점검의 문제 항목이 공장주에게 개선 요청으로 가요. 고쳐졌는지는 다음 점검 때 지킴이가 확인하고, 그 점검을 승인하면 상태가 바뀌어요.</div>
      <div class="proto">시제품 · 개선 요청 목록은 ${TEAM.name} 것만 있어요</div>`);
  }
  // 주간 보고 — 진흥원 답을 받은 뒤 다시 만든다 (2026-10-01 사용자 결정). 지금은 기존 웹 목록 칸 그대로 받은 것만 보인다
  function weeklyList(s) {
    const ours = Object.entries(s.weekly || {}).filter(([k]) => k.startsWith(WEEK.key + ' ')).map(([, w]) => ({ team: TEAM.name, by: w.by, area: w.area, firms: w.firms, c: RESULTS.map((r) => (w.c || {})[r] || 0), at: w.at }));
    const others = squads(s).filter((q) => q.id !== 'e1' && q.sent).map((q) => ({ team: q.name, by: q.lead, area: q.areas[0], firms: q.week, c: [q.week, 0, 0, 0], at: '9/16' }));
    const rows = [...ours, ...others], notSent = squads(s).filter((q) => !sqStats(s, q).sentOk).map((q) => q.name);
    return frame('insp', `${inspTabs(s, 'insp/weekly')}
      <div class="warn">⏸ 주간 보고는 진흥원에 업무 방식을 물은 뒤 다시 만들어요. 지금은 기존 웹 목록 모양으로 받은 것만 보여요.</div>
      <div class="small">${WEEK.label} · 받은 보고 ${rows.length}건${notSent.length ? ` · 미제출 조: ${notSent.join(', ')}` : ''}</div>
      <div class="tscroll"><table><tr><th>번호</th><th>점검조</th><th>작성자</th><th>행정구역</th><th>기업수</th>${RESULTS.map((r) => `<th>${r}</th>`).join('')}<th>등록일</th></tr>
        ${rows.map((r, k) => `<tr><td>${rows.length - k}</td><td><b>${esc(r.team)}</b></td><td>${esc(r.by)}</td><td>${esc(r.area)}</td><td>${r.firms}</td>${r.c.map((n) => `<td>${n}</td>`).join('')}<td>${r.at}</td></tr>`).join('')}
      </table></div>`);
  }

  /* ---------- M3 공장 ---------- */
  function sensorSum(s, fid) {
    const ks = SITE_SENSORS(fid), add = ((OPS(s).sensorsAdd || {})[fid] || []).length;
    if (!ks.length) return add ? `<span class="pill gray">설치 기다림 ${add}</span>` : '<span class="small">점검만</span>';
    const n = (st) => ks.filter((k) => SIM.sensor(s, k).state === st).length;
    return `${ks.length}대${n('repair') ? ` <span class="pill gray">수리 중 ${n('repair')}</span>` : ''}${n('unknown') ? ` <span class="pill amber">모름 ${n('unknown')}</span>` : ''}${add ? ` <span class="pill gray">설치 기다림 ${add}</span>` : ''}`;
  }
  function facList(s) {
    const F = UI.f.fac;
    const rows = allFids(s).filter((fid) => {
      const f = facOf(s, fid), fm = firmOf(s, fid), q = sqOfDong(s, f.dong), sen = HAS_SENSORS(fid);
      return (!F.dong || f.dong === F.dong) && (!F.type || f.type === F.type) && (!F.kind || fm.kind === F.kind) && (!F.sq || (q && q.id === F.sq))
        && (!F.sen || (F.sen === 'yes') === sen) && (!F.q || f.name.includes(F.q));
    });
    const dongs = ALL_DONGS.filter((d) => allFids(s).some((fid) => facOf(s, fid).dong === d)), types = [...new Set(allFids(s).map((fid) => facOf(s, fid).type))];
    return frame('factories', `
      <div class="rowx"><span class="kt plain">공장 ${rows.length}곳</span><button class="btn inl" data-go="factories/new">＋ 공장 등록</button></div>
      <div class="opf">${sel('fac.dong', F.dong, [['', '모든 읍·면·동'], ...dongs.map((d) => [d, d])], '읍·면·동')}${sel('fac.type', F.type, [['', '모든 업종'], ...types.map((t) => [t, t])], '업종')}
        ${sel('fac.kind', F.kind, [['', '전체'], ['소공인', '소공인'], ['소기업', '소기업'], ['중소기업', '중소기업']], '기업 종류')}
        ${sel('fac.sq', F.sq, [['', '모든 조'], ...squads(s).map((q) => [q.id, q.name])], '맡은 조')}
        ${sel('fac.sen', F.sen, [['', '전체'], ['yes', '센서 사이트'], ['no', '점검만']], '센서')}${find('fac.q', F.q, '공장 이름')}</div>
      <div class="tscroll"><table><tr><th>공장</th><th>읍·면·동</th><th>업종</th><th>맡은 조</th><th>마지막 점검</th><th>남은 개선</th><th>센서</th><th>등록사유</th><th></th></tr>
        ${rows.map((fid) => { const f = facOf(s, fid), fm = firmOf(s, fid), q = sqOfDong(s, f.dong), l = lastInsp(s, fid);
          const open = tracked(s, fid).filter((e) => e.st !== 'fixed').length;
          return `<tr class="click" data-go="factory/${fid}"><td><b>${esc(f.name)}</b>${FACTORIES[fid] ? '' : ' <span class="pill blue">새로 등록</span>'}</td><td>${f.dong}</td><td>${esc(f.type)}</td>
            <td>${q ? q.name : '<span class="pill amber">없음</span>'}</td><td>${l ? `${l.date}${stOf(l) === 'ok' ? '' : ' ' + stPill(l)}` : '<span class="small">없음</span>'}</td>
            <td>${open ? `${open}개` : '—'}</td><td>${sensorSum(s, fid)}</td><td>${fm.why || '—'}</td><td class="go">보기 ›</td></tr>`; }).join('')}
      </table></div>
      ${rows.length ? '' : '<div class="small">맞는 공장이 없어요.</div>'}`);
  }
  const TYPES = ['금속가공', '화학', '기계', '전자부품', '플라스틱', '식품', '기타'];
  function facNew(s) {
    const d = UI.nf, q = d.dong && sqOfDong(s, d.dong);
    const inp = (id, label, ph, must) => `<label class="opfld"><span class="lbl">${label}${must ? ' *' : ''}</span><input class="input" id="${id}" placeholder="${ph}"></label>`;
    const nseg = (k, opts) => seg('nfSet', d[k], opts, ` data-k="${k}"`);
    return frame('factories', `
      <div class="rowx"><span class="h1"><button class="link" data-go="factories">← 공장 목록</button> 공장 등록</span><span class="small">* 꼭 적을 칸</span></div>
      <div class="kgrid">
        <div class="kcard"><div class="kt">기업 정보</div>
          ${inp('nfName', '기업명', '예: 대성정밀', 1)}${inp('nfBiz', '사업자번호', '000-00-00000', 1)}${inp('nfCeo', '대표자', '예: 박대표', 1)}
          <label class="opfld"><span class="lbl">업종 *</span><select class="input" id="nfType"><option value="">고르세요</option>${TYPES.map((t) => `<option>${t}</option>`).join('')}</select></label>
          <div class="lbl">기업 종류 *</div>${nseg('kind', ['소공인', '소기업', '중소기업'])}
          <div class="lbl">소유 형태</div>${nseg('own', ['소유', '임차', '기타'])}
          ${inp('nfWorkers', '근로자 수', '예: 12')}</div>
        <div class="kcard"><div class="kt">위치 · 등록사유</div>
          <label class="opfld"><span class="lbl">읍·면·동 *</span><select class="input" data-opnf="dong"><option value="">고르세요</option>${ALL_DONGS.map((x) => `<option${x === d.dong ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
          ${inp('nfAddr', '주소', '예: 동탄산업로 12')}
          <div class="small">맡을 조: <b class="ink">${q ? q.name : d.dong ? '이 읍·면·동을 맡은 조가 없어요' : '읍·면·동을 고르면 정해져요'}</b></div>
          <div class="lbl">등록사유 *</div>${nseg('why', ['현장등록', '점검신청', '점검거부', '기업DB', '기타'])}
          ${d.why === '점검거부' ? '<div class="warn">점검 거부로 등록하면 기록으로만 남겨요. 지킴이 목록에는 올리지 않아요.</div>' : ''}</div>
        <div class="kcard"><div class="kt">공장주 초대</div>
          ${inp('nfTel', '대표 휴대폰', '010-0000-0000', 1)}
          <div class="small">등록하면 이 번호로 초대 문자가 가요. 공장주는 휴대폰 번호로 인증하고 들어와요.</div></div>
      </div>
      <div class="row opact"><button class="btn ghost inl" data-go="factories">취소</button><button class="btn inl" data-act="nfSave">등록하고 초대 보내기</button></div>`);
  }
  const STW = { watch: ['감시 중', 'green'], repair: ['수리 중', 'gray'], unknown: ['값 모름', 'amber'] };
  const SEN_KINDS = [['vib', '진동 · 온도'], ['gas', '가스'], ['power', '전기'], ['leak', '누수'], ['th', '온습도']];
  function addedRows(s, fid) {
    return ((OPS(s).sensorsAdd || {})[fid] || []).map((x) => `<div class="srow2"><span class="sic">${I(TYPE_ICON[x.kind] || 'alert', 20)}</span><div class="stx"><b>${esc(x.name)}</b>
      <small>${esc(x.zone)} · ${x.on === '기계' ? `${esc(x.machine)}에 붙임` : '공간에 둠'} · ${x.limit ? `사양서 한계 ${esc(x.limit)}` : '사양서 한계 없음'}</small></div><span class="pill gray">설치 기다림</span></div>`).join('');
  }
  function sensorAdmin(s, fid) {
    return `<div class="kcard"><div class="kt">센서 ${SITE_SENSORS(fid).length}대</div>${SITE_SENSORS(fid).map((k) => {
      const st = SIM.sensor(s, k), f = (s.faults || []).find((x) => x.key === k && x.status === 'open');
      const live = s.alarms.find((a) => a.key === k && SIM.live(a));
      const [w, c] = live && st.state === 'watch' ? ['경보 중', 'red'] : STW[st.state];
      let sub = SENSORS[k].where, act = '';
      if (f) { sub = `${f.at} ${f.by} 고장 신고 · "${f.reason}"${f.memo ? ' · ' + f.memo : ''}${f.photo ? ' · 📷 사진' : ''}`; act = `<button class="more sm" data-act="opFault" data-k="${k}">신고 확인</button>`; }
      else if (st.state === 'repair') { sub = `${st.since} ${st.by} 수리 중으로 돌림${st.note ? ' · ' + st.note : ''}`; act = `<button class="more sm" data-act="opRestore" data-k="${k}">수리 끝 · 감시로 되돌리기</button>`; }
      else if (st.state === 'unknown') sub = `${st.since}부터 값이 안 와요 · 설치 담당에게 확인`;
      return `<div class="srow2"><span class="sic">${I(iconOf(k), 20)}</span><div class="stx"><b>${SENSORS[k].title}</b><small>${esc(sub)}</small></div><span class="pill ${c}">${w}</span>${act}</div>`;
    }).join('')}${addedRows(s, fid)}<button class="more" data-act="senOpen" data-fid="${fid}">＋ 센서 더하기</button></div>`;
  }
  function factory(s, fid) {
    const f = facOf(s, fid);
    if (!f) return facList(s);
    const fm = firmOf(s, fid), isNew = !FACTORIES[fid], q = sqOfDong(s, f.dong), hasS = HAS_SENSORS(fid);
    const list = s.inspections.filter((i) => i.fid === fid).sort((a, b) => mdNum(b.date) - mdNum(a.date));
    const open = tracked(s, fid).filter((e) => e.st !== 'fixed'), b = bookOf(s, fid), v = s.visits[fid];
    const visit = v || (b ? `${b.v} · ${b.st === 'wait' ? '공장주 승인 기다림' : '공장주가 거절함'}` : '안 잡힘');
    const live = s.alarms.filter((a) => alarmFid(a) === fid && SIM.live(a)), al = s.alarms.filter((a) => alarmFid(a) === fid);
    const info = kv([['대표', esc(fm.ceo)], ['사업자번호', esc(fm.biz)], ['업종', esc(fm.ksic ? `${f.type} (${fm.ksic[0]})` : f.type)], ['기업 종류', fm.kind], ['소유 형태', fm.own || '—'],
      ['근로자', `${f.workers || '—'}명${fm.foreign ? ` (외국인 ${fm.foreign})` : ''}`], ['주소', `화성시 ${f.dong} ${esc(fm.addr || '')}`], ['전화', esc(fm.tel)], ['등록사유', fm.why]]);
    const nowCard = `<div class="kcard ${live.length ? 'kalarm' : ''}"><div class="kt">지금 ${live.length ? `경보 ${live.length}건` : '이상 없음'}</div>
      ${live.map((a) => `<div class="small ink">⚠ ${esc(SIM.title(a))} · ${a.status === 'open' ? '조치 안 됨' : a.status === 'remind' ? '다시 알림 중' : '조치됨, 지켜보는 중'}${a.escalated ? ' · <b>미루기 다 씀</b>' : ''}</div>`).join('') || '<div class="small">센서 모두 감시 중</div>'}
      ${live.length ? '<div class="small">센서 고장이면 공장주 신고를 받아 "수리 중"으로 돌려요</div>' : ''}</div>`;
    return frame('factories', `
      <div class="rowx"><span class="h1"><button class="link" data-go="factories">← 공장 목록</button> ${esc(f.name)}</span>
        <span class="small">화성시 ${f.dong} · ${esc(f.type)} · 맡은 조 ${q ? `<button class="link" data-go="squads/${q.id}">${q.name}</button>` : '<b class="ink">없음</b>'}</span></div>
      <div class="kgrid">
        <div class="kcard"><div class="kt">기업 정보</div>${info}${isNew ? `<div class="small">🔗 ${fm.at} 공장주 초대 보냄 · 아직 가입 안 함</div>` : ''}</div>
        ${f.ll ? `<div class="kcard"><div class="kt">위치</div><div class="opfmap" id="opNv" data-mode="fac:${fid}">${NV.st === 'ready' ? '' : miniMap(fid)}</div>
          <div class="small">화성시 ${f.dong} ${esc(fm.addr || '')}${NV.st === 'fail' ? ' · 네이버 지도를 불러오지 못해 그림 지도로 보여요' : ''}</div></div>` : ''}
        <div class="kcard"><div class="kt">지킴이 점검 ${list.length}건</div>
          <div class="small">다음 방문: <b class="ink">${esc(visit)}</b></div>
          ${list.map((i) => `<button class="rrow oprr" data-go="insp/v/${i.id}"><span><b>${i.date}</b> ${esc(i.by)} · ${i.result || RESULTS[0]}</span><span>문제 ${badOf(i).length}개 ${stPill(i)}</span></button>`).join('')
            || `<div class="small">${fm.why === '점검거부' ? '점검을 거부한 공장이에요 · 기록으로만 남겨요' : '아직 점검 기록이 없어요'}</div>`}</div>
        <div class="kcard"><div class="kt">남은 개선 요청 ${open.length}개</div>
          ${open.map((e) => `<div class="rrow"><span>${esc(e.it.text)}<br><span class="small">${e.ins.date} 점검</span></span><span class="pill ${WORD[e.st][1]}">${WORD[e.st][0]}</span></div>`).join('') || '<div class="small">남은 것 없음</div>'}
          <div class="small">고쳐졌는지는 다음 점검 때 지킴이가 확인해요.</div></div>
        ${hasS ? nowCard + sensorAdmin(s, fid) : `<div class="kcard"><div class="kt">센서</div>${addedRows(s, fid) || '<div class="small">센서를 달지 않은 곳이에요 · 지킴이 점검만 해요</div>'}
          <button class="more" data-act="senOpen" data-fid="${fid}">＋ 센서 달기</button></div>`}
      </div>
      ${hasS ? `<div class="kt plain">센서 이상 기록</div>
      ${al.length ? `<div class="tscroll"><table><tr><th>시작</th><th>무엇이</th><th>조치 완료</th><th>끝남</th></tr>
        ${al.map((a) => { const k = a.acks[0]; return `<tr><td>${a.day} ${hm(a.start)}</td><td><b>${esc(SIM.title(a))}</b></td><td>${k ? `${esc(k.by)} · ${k.at - a.start}분 뒤` : '—'}</td><td>${SIM.live(a) ? '<b>진행 중</b>' : SIM.endWord(a)}</td></tr>`; }).join('')}
      </table></div>` : '<div class="kcard"><div class="small">최근 3개월 기록 없음</div></div>'}
      <div class="small">🔒 기록은 운영자도 고칠 수 없어요.</div>` : ''}
      ${isNew ? '<div class="proto">시제품 · 새로 등록한 공장은 지킴이 앱에 아직 안 이어져요</div>' : ''}`);
  }

  /* ---------- M4 점검조 — 조 목록 · 조 편성 · 지킴이 명단 ---------- */
  function sqTabs(s, on) {
    const n = pendingApps(s).length;
    return `<nav class="wtabs sub"><button class="${on === 'list' ? 'on' : ''}" data-go="squads">조 목록</button><button class="${on === 'guards' ? 'on' : ''}" data-go="squads/guards">지킴이 명단${n ? ` <span class="pill blue">가입 신청 ${n}</span>` : ''}</button></nav>`;
  }
  function sqList(s) {
    const qs = squads(s), loose = ALL_DONGS.filter((d) => !qs.some((q) => q.areas.includes(d)));
    return frame('squads', `${sqTabs(s, 'list')}
      ${loose.length ? `<div class="warn">맡은 조가 없는 읍·면·동 ${loose.length}곳: ${loose.join(', ')} · 이곳 공장은 지킴이 목록에 안 올라요</div>` : ''}
      <div class="tscroll"><table><tr><th>점검조</th><th>조장</th><th>조원</th><th>담당 권역</th><th>공장</th><th>9월 점검</th><th>등록년도</th><th></th></tr>
        ${qs.map((q) => { const t = sqStats(s, q); return `<tr class="click" data-go="squads/${q.id}"><td><b>${esc(q.name)}</b></td><td>${esc(q.lead)}</td><td>${q.members.filter((m) => m !== q.lead).map(esc).join(', ') || '—'}</td>
          <td>${areaText(q.areas)}</td><td>${t.firms}곳</td><td>${t.month}곳</td><td>${q.since}</td><td class="go">편성 ›</td></tr>`; }).join('')}
      </table></div>`);
  }
  function sqEdit(s, id) {
    const q = squads(s).find((x) => x.id === id);
    if (!q) return sqList(s);
    const g = guardsAll(s), t = sqStats(s, q);
    const free = Object.keys(g).filter((n) => !sqOfGuard(s, n) && g[n].work !== '퇴직');
    return frame('squads', `${sqTabs(s, 'list')}
      <div class="rowx"><span class="h1"><button class="link" data-go="squads">← 조 목록</button> ${esc(q.name)}</span><span class="small">${q.since}년 등록 · 공장 ${t.firms}곳 · 9월 점검 ${t.month}곳 · 이번 주 ${t.week}건</span></div>
      <div class="kgrid">
        <div class="kcard"><div class="kt">조원 ${q.members.length}명</div>
          ${q.members.map((m) => `<div class="srow2"><div class="stx"><b>${esc(m)}${m === q.lead ? ' <span class="pill blue">조장</span>' : ''}</b><small>${g[m] ? `${g[m].field} · ${g[m].work}` : ''}</small></div>
            ${m !== q.lead ? `<button class="more sm" data-act="sqLead" data-id="${q.id}" data-m="${esc(m)}">조장으로</button><button class="more sm danger" data-act="sqOut" data-id="${q.id}" data-m="${esc(m)}">빼기</button>` : ''}</div>`).join('')}
          ${free.length ? `<div class="row"><select class="input" id="sqAdd">${free.map((n) => `<option value="${esc(n)}">${esc(n)} (${g[n].field} · ${g[n].work})</option>`).join('')}</select><button class="btn inl" data-act="sqIn" data-id="${q.id}">넣기</button></div>`
            : '<div class="small">넣을 수 있는 지킴이가 없어요 · 모두 조가 있어요</div>'}
          <div class="small">기존 웹처럼 조장 한 명과 조원으로 꾸려요. 조장은 다른 사람을 조장으로 바꾼 뒤에 뺄 수 있어요.</div></div>
        <div class="kcard"><div class="kt">담당 권역 ${q.areas.length}곳</div>
          <div class="wseg opdong">${ALL_DONGS.map((d) => { const o = sqOfDong(s, d); return `<span class="${o && o.id === q.id ? 'on' : ''}" data-act="sqArea" data-id="${q.id}" data-d="${d}">${d}${o && o.id !== q.id ? `<small>${esc(o.name)}</small>` : ''}</span>`; }).join('')}</div>
          <div class="small">누르면 맡기거나 풀어요. 다른 조가 맡은 곳을 누르면 이 조로 옮겨요.</div></div>
      </div>
      ${q.id === 'e1' ? '<div class="proto">시제품 · 조 편성을 바꿔도 지킴이 앱에는 아직 안 이어져요</div>' : ''}`);
  }
  function guardList(s) {
    const g = guardsAll(s), ap = pendingApps(s), rej = APPLICANTS.filter((a) => (OPS(s).apply || {})[a.name] === 'no');
    return frame('squads', `${sqTabs(s, 'guards')}
      ${ap.length ? `<div class="kcard bookreq"><div class="kt">가입 신청 ${ap.length}명</div>
        ${ap.map((a) => `<div class="srow2"><div class="stx"><b>${a.name}</b><small>${a.field} · ${a.at} 신청 · ${a.tel}</small></div><button class="btn ghost inl" data-act="apNo" data-n="${a.name}">반려</button><button class="btn inl" data-act="apOk" data-n="${a.name}">승인</button></div>`).join('')}
        <div class="small">승인하면 조가 없는 지킴이로 올라요. 조 목록에서 조에 넣어 주세요.</div></div>` : ''}
      <div class="tscroll"><table><tr><th>이름</th><th>분야</th><th>점검조</th><th>근무 상태</th><th>가입</th></tr>
        ${Object.entries(g).map(([n, x]) => { const q = sqOfGuard(s, n); return `<tr><td><b>${esc(n)}</b>${q && q.lead === n ? ' <span class="pill blue">조장</span>' : ''}</td><td>${x.field}</td>
          <td>${q ? `<button class="link" data-go="squads/${q.id}">${esc(q.name)}</button>` : '<span class="pill amber">조 없음</span>'}</td>
          <td><select class="input opsm" data-opw="${esc(n)}" aria-label="${esc(n)} 근무 상태">${WORK.map((w) => `<option${w === x.work ? ' selected' : ''}>${w}</option>`).join('')}</select>${x.work === '퇴직' && q ? ' <span class="pill amber">조에서 빼 주세요</span>' : ''}</td><td>${x.joined}</td></tr>`; }).join('')}
      </table></div>
      ${rej.length ? `<div class="small">반려한 가입 신청: ${rej.map((a) => a.name).join(', ')}</div>` : ''}`);
  }

  /* ---------- M5 체크리스트 — 판 목록 · 판 보기 · 새 판 만들기 ---------- */
  const vers = (s) => [...(OPS(s).vers || []).slice().reverse(), ...CL_VERS];  // 새것부터
  const areasOf = (v) => v.areas || (v.ver === CHECKLIST.ver ? CHECKLIST.areas : null);
  const nextVer = (s) => { const n = Math.max(...vers(s).filter((v) => v.ver.startsWith('26')).map((v) => +v.ver.slice(5))); return `26VER${String(n + 1).padStart(2, '0')}`; };
  function clPage(s) {
    const vs = vers(s), v = vs.find((x) => x.ver === UI.ver) || vs[0], areas = areasOf(v);
    const used = s.inspections.filter((i) => (i.ver || CHECKLIST.ver) === v.ver).length;
    return frame('checklist', `
      <div class="rowx"><span class="kt plain">판 ${vs.length}개</span><button class="btn inl" data-go="checklist/new">＋ 새 판 만들기</button></div>
      <div class="split"><div class="list">${vs.map((x, k) => `<button class="q ${x === v ? 'now' : ''}" data-act="verSel" data-v="${x.ver}">
          <div class="rowx"><span class="t">${x.ver}</span>${k === 0 ? '<span class="pill green">지금 씀</span>' : ''}</div><div class="small">${x.at} 올림 · ${x.n}문항<br>${esc(x.what)}</div></button>`).join('')}</div>
        <div class="detail">
          <div class="rowx"><span class="opttl">${v.ver}</span><span class="small">🔒 올린 판은 고칠 수 없어요</span></div>
          ${kv([['올린 날', v.at], ['문항', v.n + '개'], ['이 판으로 한 점검', used + '건'], ['바뀐 점', esc(v.what)]])}
          ${areas ? areas.map((a) => `<div class="kcard"><div class="kt">${a.no} ${a.name} <span class="small">${a.common ? '공통' : '설비별'} · ${a.items.length}문항</span></div>
            <ol class="opol">${a.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></div>`).join('')
            : '<div class="kcard"><div class="small">지난 판의 문항은 시제품에 없어요. 판 번호와 바뀐 점만 남겨 두었어요.</div></div>'}
        </div></div>
      ${(OPS(s).vers || []).length ? '<div class="proto">시제품 · 새로 올린 판은 지킴이 앱에 아직 안 이어져요</div>' : ''}`);
  }
  const clCount = (cl) => { const its = cl.flatMap((a) => a.items);
    return { n: its.filter((x) => !x.del && x.t.trim()).length, fix: its.filter((x) => !x.del && x.o != null && x.t !== x.o).length, add: its.filter((x) => x.o == null && x.t.trim()).length, del: its.filter((x) => x.del).length }; };
  function clNew(s) {
    const cur = vers(s)[0];
    if (!UI.cl) UI.cl = areasOf(cur).map((a) => ({ key: a.key, no: a.no, name: a.name, common: a.common, items: a.items.map((t) => ({ t, o: t })) }));
    const c = clCount(UI.cl), next = nextVer(s);
    return frame('checklist', `
      <div class="rowx"><span class="h1"><button class="link" data-act="clCancel">← 판 목록</button> 새 판 만들기</span><span class="small">${cur.ver}을 바탕으로 · 새 판 번호 <b class="ink">${next}</b></span></div>
      <div class="kcard"><div class="kbody"><div class="kv">${c.n}<small>문항</small></div><div class="kside"><div><span>고침</span><em>${c.fix}</em></div><div><span>새 항목</span><em>${c.add}</em></div><div><span>뺌</span><em>${c.del}</em></div></div></div>
        <div class="small">문항을 고치거나 빼고 더한 뒤 올려요. 올리기 전에는 지킴이에게 안 가요.</div></div>
      ${UI.cl.map((a, ai) => `<div class="kcard"><div class="kt">${a.no} ${a.name} <span class="small">${a.common ? '공통' : '설비별'}</span></div>
        ${a.items.map((x, k) => { const mark = x.del ? ['뺌', 'gray'] : x.o == null ? ['새 항목', 'blue'] : x.t !== x.o ? ['고침', 'amber'] : null;
          return `<div class="opcl${x.del ? ' del' : ''}"><span class="opn">${k + 1}</span><input class="input" id="cl-${ai}-${k}" data-opcl="${ai}:${k}" value="${esc(x.t)}"${x.del ? ' disabled' : ''} aria-label="${a.name} ${k + 1}번 문항">
            ${mark ? `<span class="pill ${mark[1]}">${mark[0]}</span>` : ''}<button class="more sm${x.del ? '' : ' danger'}" data-act="clDel" data-a="${ai}" data-k="${k}">${x.del ? '되살리기' : '빼기'}</button></div>`; }).join('')}
        <button class="add" data-act="clAdd" data-a="${ai}">＋ 이 영역에 문항 더하기</button></div>`).join('')}
      <div class="row opact"><button class="btn ghost inl" data-act="clCancel">그만두기</button><button class="btn inl" data-act="clUp">${next}로 올리기</button></div>`);
  }

  /* ---------- M6 통계 ---------- */
  const AI_SHOWN = 6;  // 사진 한 번에 AI가 보여 준 제안 수 — 기록에 없어서 가정한 값 (가설)
  function stats(s) {
    const qs = squads(s).map((q) => ({ q, t: sqStats(s, q) })), T = qs.map((x) => x.t);
    const plan = sum(T.map((t) => t.firms)), done = sum(T.map((t) => t.month)), res = RESULTS.map((r, k) => sum(T.map((t) => t.res[k]))), resN = sum(res);
    const fxReq = sum(T.map((t) => t.fx[0])), fxOk = sum(T.map((t) => t.fx[1]));
    const months = [...OP_MONTHS, ['9월', resN]], max = Math.max(...months.map((m) => m[1]));
    const items = s.inspections.flatMap((i) => i.items), ai = items.filter((x) => x.src === 'ai'), withAi = s.inspections.filter((i) => i.items.some((x) => x.src === 'ai'));
    return frame('stats', `
      <div class="kgrid">
        ${kcard({ t: '점검실적 · 9월', v: pct(done, plan), unit: '%', rows: [['계획', plan + '곳'], ['실적', done + '곳']] })}
        ${kcard({ t: '9월 점검 결과', v: resN, unit: '건', rows: RESULTS.map((r, k) => [r, res[k] + '건']) })}
        ${kcard({ t: '개선지도', v: pct(fxOk, fxReq), unit: fxReq ? '%' : '', rows: [['요청', fxReq + '건'], ['고쳐짐 확인', fxOk + '건']], go: 'insp/fix' })}
      </div>
      <div class="kcard"><div class="kt">월별 점검 건수 <span class="small">모든 조 · 9월은 17일까지</span></div>
        <div class="opbars">${months.map(([m, n], k) => `<div class="opbar${k === months.length - 1 ? ' now' : ''}"><em>${n}</em><i style="height:${Math.round((n / max) * 140)}px"></i><span>${m}</span></div>`).join('')}</div></div>
      <div class="kt plain">조별 9월</div>
      <div class="tscroll"><table><tr><th>점검조</th><th>공장</th><th>9월 실적</th><th>실적률</th>${RESULTS.map((r) => `<th>${r}</th>`).join('')}<th>개선 요청</th><th>고쳐짐 확인</th></tr>
        ${qs.map(({ q, t }) => `<tr class="click" data-go="squads/${q.id}"><td><b>${esc(q.name)}</b></td><td>${t.firms}곳</td><td>${t.month}곳</td><td>${pct(t.month, t.firms)}%</td>${t.res.map((n) => `<td>${n}</td>`).join('')}<td>${t.fx[0]}</td><td>${t.fx[1]}</td></tr>`).join('')}
      </table></div>
      <div class="kt plain">센서 사이트 <span class="small">· 최근 3개월</span></div>
      <div class="tscroll"><table><tr><th>공장</th><th>경보</th><th>조치까지 평균</th><th>아무도 안 누름</th><th>수리로 닫힘</th><th>고장 신고</th><th>지금 값 모름</th></tr>
        ${Object.keys(FACTORIES).filter(HAS_SENSORS).map((fid) => { const al = s.alarms.filter((a) => alarmFid(a) === fid), ak = al.filter((a) => a.acks.length);
          return `<tr class="click" data-go="factory/${fid}"><td><b>${FACTORIES[fid].name}</b></td><td>${al.length}건</td><td>${ak.length ? Math.round(sum(ak.map((a) => a.acks[0].at - a.start)) / ak.length) + '분' : '—'}</td>
            <td>${al.filter((a) => a.endKind === 'noack').length}건</td><td>${al.filter((a) => a.endKind === 'repair').length}건</td><td>${(s.faults || []).filter((f) => f.fid === fid).length}건</td>
            <td>${SITE_SENSORS(fid).filter((k) => SIM.sensor(s, k).state === 'unknown').length}대</td></tr>`; }).join('')}
      </table></div>
      <div class="kt plain">AI 제안</div>
      <div class="kgrid">
        ${kcard({ t: 'AI 제안 쓰임', v: pct(ai.length, withAi.length * AI_SHOWN), unit: withAi.length ? '%' : '', rows: [['보여 준 제안', withAi.length * AI_SHOWN + '개'], ['지킴이가 더함', ai.length + '개'], ['그중 문제 있음', ai.filter((x) => x.answer === 'bad').length + '개']] })}
        ${kcard({ t: '지킴이가 직접 더한 문항', v: items.filter((x) => x.src === 'self').length, unit: '개', rows: [['AI를 쓴 점검', withAi.length + '건'], ['모든 점검', s.inspections.length + '건']] })}
      </div>
      <div class="small">AI 제안은 지킴이가 원할 때만 써요. 기본 체크리스트가 먼저예요. 더한 제안에서 "문제 있음"이 많이 나올수록 쓸모 있는 제안이에요.</div>
      <div class="proto">시제품 · 다른 조 숫자와 4~8월은 가상이에요. AI·센서 숫자는 ${TEAM.name}과 센서 사이트 3곳 기록에서 셌어요</div>`);
  }

  /* ---------- M7 공지 · 자료 ---------- */
  const notices = (s) => [...(OPS(s).notices || []), ...OP_NOTICES];
  const files = (s) => [...(OPS(s).files || []), ...OP_FILES];
  const TO = ['지킴이', '공장주', '모두'];
  const toCount = (s, to) => { const gN = Object.values(guardsAll(s)).filter((x) => x.work === '근무').length, oN = allFids(s).length;
    return to === '지킴이' ? `지킴이 ${gN}명` : to === '공장주' ? `공장주 ${oN}명` : `지킴이 ${gN}명과 공장주 ${oN}명`; };
  function bdTabs(on) {
    return `<nav class="wtabs sub"><button class="${on === 'n' ? 'on' : ''}" data-go="board">공지</button><button class="${on === 'f' ? 'on' : ''}" data-go="board/files">자료실</button></nav>`;
  }
  function ntList(s) {
    const list = notices(s);
    return frame('board', `${bdTabs('n')}
      <div class="rowx"><span class="kt plain">공지 ${list.length}건</span><button class="btn inl" data-go="board/new">＋ 공지 쓰기</button></div>
      <div class="tscroll"><table><tr><th>번호</th><th>받는 쪽</th><th>제목</th><th>쓴 날</th><th>쓴 사람</th></tr>
        ${list.map((n, k) => `<tr class="click" data-act="ntOpen" data-id="${n.id}"><td>${list.length - k}</td><td><span class="pill ${n.to === '모두' ? 'blue' : 'gray'}">${n.to}</span></td><td><b>${esc(n.title)}</b></td><td>${n.at}</td><td>${esc(n.by || ME)}</td></tr>
          ${UI.nt === n.id ? `<tr class="opbody"><td colspan="5">${esc(n.body).replace(/\n/g, '<br>')}</td></tr>` : ''}`).join('')}
      </table></div>
      ${(OPS(s).notices || []).length ? '<div class="proto">시제품 · 새 공지는 지킴이 앱과 공장주 웹에 아직 안 이어져요</div>' : ''}`);
  }
  function ntNew(s) {
    const d = UI.nn;
    return frame('board', `${bdTabs('n')}
      <div class="kgrid"><div class="kcard"><div class="kt">새 공지</div>
        <div class="lbl">받는 쪽</div>${seg('nnTo', d.to, TO)}
        <div class="lbl">제목</div><input class="input" id="nnTitle" value="${esc(d.title || '')}" placeholder="예: 추석 연휴 점검 일정">
        <div class="lbl">내용</div><textarea class="input" id="nnBody" style="min-height:150px" placeholder="짧은 문장으로 나눠 쓰면 읽기 쉬워요">${esc(d.body || '')}</textarea>
        <div class="row opact"><button class="btn ghost inl" data-go="board">취소</button><button class="btn inl" data-act="nnPost">올리기</button></div></div>
      <div class="kcard"><div class="kt">받는 사람</div><div class="kbody"><div class="kv opkv">${toCount(s, d.to)}</div></div>
        <div class="small">올리면 바로 알림이 가요. 올린 공지는 <b class="ink">고칠 수 없어요</b>. 틀렸으면 새로 올려요.</div>
        <div class="small">공장주가 근로자에게 쓰는 "안전 공지"와는 달라요.</div></div></div>`);
  }
  function fileList(s) {
    const list = files(s), u = UI.fu;
    return frame('board', `${bdTabs('f')}
      <div class="rowx"><span class="kt plain">자료 ${list.length}건</span><button class="btn inl" data-act="fuOpen">${u ? '닫기' : '＋ 자료 올리기'}</button></div>
      ${u ? `<div class="kcard"><div class="kt">자료 올리기</div>
        <div class="row"><label class="btn ghost inl">파일 고르기<input type="file" hidden data-opfu></label><span class="small">${u.name ? `<b class="ink">${esc(u.name)}</b> · ${u.size}` : '고른 파일 없음'}</span></div>
        <div class="lbl">받는 쪽</div>${seg('fuTo', u.to, TO)}
        <div class="row opact"><button class="btn inl" data-act="fuSave">올리기</button></div></div>` : ''}
      <div class="tscroll"><table><tr><th>자료</th><th>받는 쪽</th><th>크기</th><th>올린 날</th><th></th></tr>
        ${list.map((f) => `<tr><td><b>📄 ${esc(f.name)}</b></td><td><span class="pill ${f.to === '모두' ? 'blue' : 'gray'}">${f.to}</span></td><td>${f.size}</td><td>${f.at}</td><td><button class="more sm" data-act="fileGet">내려받기</button></td></tr>`).join('')}
      </table></div>`);
  }
  function me(s) {
    return frame('me', `<div class="kgrid"><div class="kcard"><div class="kt">계정</div>
      ${kv([['이름', esc(ME)], ['역할', '운영자'], ['소속', '산업안전지킴이 운영센터'], ['아이디', 'admin'], ['휴대폰', '010-0000-0100']])}
      <div class="row"><button class="btn ghost inl" data-act="pw">비밀번호 바꾸기</button><button class="btn ghost inl" data-act="logout">로그아웃</button></div></div></div>`, { crumb: '내 정보' });
  }

  /* ---------- 창 ---------- */
  function faultDlg(s) {
    const k = UI.dlg.k, f = (s.faults || []).find((x) => x.key === k && x.status === 'open');
    const live = s.alarms.filter((a) => a.key === k && SIM.live(a));
    const recent = s.alarms.filter((a) => a.key === k).slice(0, 3);
    return `<div class="ov" data-act="close"></div><div class="dlg wide">
      <div class="mid" style="font-size:20px">${FACTORIES[SENSORS[k].fid].name} · ${SENSORS[k].title} 센서 고장 신고</div>
      ${f ? `<div class="q" style="box-shadow:inset 0 0 0 1px var(--line)"><div class="t">${f.at} ${esc(f.by)} · "${esc(f.reason)}"</div><div class="small">${esc(f.memo || '메모 없음')}${f.photo ? ' · 📷 사진 1장' : ''}</div></div>` : ''}
      <div class="small">최근 경보: ${recent.map((a) => `${a.day} ${hm(a.start)} ${SIM.endWord(a)}`).join(' · ') || '없음'}</div>
      ${SENSORS[k].kind === 'state' ? '<div class="warn"><b>켜짐·꺼짐 센서</b>라 값이 멈춰 있는 것만으로는 고장이라 할 수 없어요 — 물이 계속 닿아 있어도 똑같이 보여요. 공장주 사진과 함께 판단하세요.</div>' : ''}
      <div class="small ink">센서는 멀쩡하고 <b>작업 때문</b>이라면 수리 중으로 돌리지 말고 공장주에게 <b>작업 예정 알리기</b>를 안내하세요.</div>
      <div class="warn">수리 중으로 돌리면<br>· 열린 경보 ${live.length}건이 <b>닫혀요</b> (기록: "수리로 닫힘")<br>· <b>되돌릴 때까지 이 센서는 경보가 울리지 않아요</b><br>· 공장주와 근로자 ${(s.workers || []).filter((w) => (w.fid || 'daesung') === SENSORS[k].fid).length}명 화면에 "수리 중"이 떠요</div>
      <input class="input" id="opNote" placeholder="수리 메모 (안 써도 돼요) · 예: 설치 담당 방문 9/18">
      <div class="row" style="justify-content:flex-end;flex-wrap:wrap"><button class="btn ghost inl" data-act="opReject" data-k="${k}">센서 정상 · 신고 닫기</button><button class="btn inl" data-act="close">돌리지 않기</button><button class="btn ghost inl danger" data-act="opRepair" data-k="${k}">수리 중으로 돌리기</button></div>
    </div>`;
  }
  const WHY = ['문제 항목에 메모가 없어요', '사진이 필요해요', '답하지 않은 항목이 있어요', '결과 종류를 다시 골라 주세요'];
  function okDlg(s) {
    const i = s.inspections.find((x) => x.id === UI.dlg.id), prev = i.items.filter((x) => x.ref), n = badOf(i).length;
    return `<div class="ov" data-act="close"></div><div class="dlg wide">
      <div class="mid" style="font-size:20px">${FACTORIES[i.fid].name} 점검을 승인할까요?</div>
      <div class="warn">승인하면<br>· ${n ? `문제 ${n}개가 공장주에게 <b>개선 요청</b>으로 가요` : '문제 항목이 없어 개선 요청은 안 가요'}
        ${prev.length ? `<br>· 지난번 미흡 ${prev.length}개의 결과(고쳐짐 ${prev.filter((x) => x.answer === 'ok').length} · 안 고쳐짐 ${prev.filter((x) => x.answer === 'bad').length})가 정해져요` : ''}
        <br>· 승인한 점검은 지킴이도 운영자도 <b>고칠 수 없어요</b></div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost inl" data-act="close">취소</button><button class="btn inl" data-act="doOk" data-id="${i.id}">승인</button></div></div>`;
  }
  function backDlg(s) {
    const i = s.inspections.find((x) => x.id === UI.dlg.id), why = UI.dlg.why;
    return `<div class="ov" data-act="close"></div><div class="dlg wide">
      <div class="mid" style="font-size:20px">${FACTORIES[i.fid].name} 점검을 반려할까요?</div>
      <div class="small">반려하면 ${esc(i.by)} 지킴이 앱 맨 위에 "반려됨"으로 돌아가요. 고쳐서 다시 내면 여기에 다시 올라와요.</div>
      <div class="lbl">사유 · 여럿 골라도 돼요</div>
      <div class="wseg">${WHY.map((w) => `<span class="${why.includes(w) ? 'on' : ''}" data-act="rjWhy" data-v="${w}">${w}</span>`).join('')}</div>
      <textarea class="input" id="rjNote" placeholder="더 적을 말 (안 써도 돼요) · 예: 2번 항목은 어느 기계인지 적어 주세요"></textarea>
      <div class="row" style="justify-content:flex-end"><button class="btn inl" data-act="close">취소</button><button class="btn ghost inl danger" data-act="doBack" data-id="${i.id}">반려</button></div></div>`;
  }
  function senDlg(s) {
    const d = UI.dlg, f = facOf(s, d.fid);
    return `<div class="ov" data-act="close"></div><div class="dlg wide">
      <div class="mid" style="font-size:20px">${esc(f.name)} · 센서 더하기</div>
      <div class="small">구역 → 기계 → 센서 차례로 적어요. 값이 들어오기 시작하면 감시를 시작해요.</div>
      <label class="opfld"><span class="lbl">구역 *</span><input class="input" id="snZone" placeholder="예: A동 2라인"></label>
      <div class="lbl">붙이는 곳</div>${seg('senSet', d.on, ['기계', '공간'], ' data-k="on"')}
      ${d.on === '기계' ? '<label class="opfld"><span class="lbl">기계 이름 *</span><input class="input" id="snMachine" placeholder="예: 3번 프레스"></label>' : ''}
      <div class="lbl">센서 종류</div><div class="wseg">${SEN_KINDS.map(([k, t]) => `<span class="${d.kind === k ? 'on' : ''}" data-act="senSet" data-k="kind" data-v="${k}">${t}</span>`).join('')}</div>
      <label class="opfld"><span class="lbl">사양서 한계값 · 있을 때만</span><input class="input" id="snLimit" placeholder="예: 진동 7.1 mm/s"></label>
      <div class="small">사양서 값이 없으면 한계선을 긋지 않아요. AI가 평소와 다른지만 봐요.</div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost inl" data-act="close">취소</button><button class="btn inl" data-act="senSave">더하기</button></div></div>`;
  }
  function verDlg(s) {
    const c = clCount(UI.cl), next = nextVer(s), cur = vers(s)[0];
    return `<div class="ov" data-act="close"></div><div class="dlg wide">
      <div class="mid" style="font-size:20px">${next}로 올릴까요?</div>
      <div class="small">고침 ${c.fix} · 새 항목 ${c.add} · 뺌 ${c.del} · 모두 ${c.n}문항</div>
      <div class="warn">올리면<br>· 다음 점검부터 지킴이가 이 판으로 점검해요<br>· 지난 점검은 옛 판(${cur.ver}) 그대로 남아요<br>· 지금 점검 중인 것은 옛 판으로 끝내요<br>· 올린 판은 <b>고칠 수 없어요</b> · 바꾸려면 다시 새 판을 만들어요</div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost inl" data-act="close">더 고치기</button><button class="btn inl" data-act="clConfirm">올리기</button></div></div>`;
  }
  function nnDlg(s) {
    const d = UI.nn;
    return `<div class="ov" data-act="close"></div><div class="dlg wide"><div class="mid" style="font-size:20px">공지를 올릴까요?</div>
      <div class="q" style="box-shadow:inset 0 0 0 1px var(--line)"><div class="t">${esc(d.title)}</div><div class="small">${esc(d.body).replace(/\n/g, '<br>')}</div></div>
      <div class="warn">${toCount(s, d.to)}에게 바로 알림이 가요. <b>올린 뒤에는 고칠 수 없어요.</b></div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost inl" data-act="close">더 고치기</button><button class="btn inl" data-act="nnConfirm">올리기</button></div></div>`;
  }
  const DLG = { fault: faultDlg, ok: okDlg, back: backDlg, sen: senDlg, ver: verDlg, nn: nnDlg };

  /* ---------- 그리기 ---------- */
  function render() {
    if (!ON) return;
    const s = DB.s, p = R.path();
    if (UI.lastPath !== location.hash) {
      UI.menu = false; UI.dlg = null; UI.lastPath = location.hash; UI.okOpen = false; UI.bell = false; UI.bigMap = false; UI.tip = null;
      if (p[0] === 'factories' && p[1] === 'sensor') UI.f.fac = { sen: 'yes' };
    }
    let html;
    if (p[0] === 'insp') html = p[1] === 'v' ? inspView(s, p[2]) : p[1] === 'all' ? recList(s) : p[1] === 'visits' ? visits(s) : p[1] === 'fix' ? fixList(s) : p[1] === 'weekly' ? weeklyList(s) : review(s);
    else if (p[0] === 'factories') html = p[1] === 'new' ? facNew(s) : facList(s);
    else if (p[0] === 'factory') html = factory(s, p[1]);
    else if (p[0] === 'squads') html = p[1] === 'guards' ? guardList(s) : p[1] ? sqEdit(s, p[1]) : sqList(s);
    else if (p[0] === 'checklist') html = p[1] === 'new' ? clNew(s) : clPage(s);
    else if (p[0] === 'stats') html = stats(s);
    else if (p[0] === 'board') html = p[1] === 'new' ? ntNew(s) : p[1] === 'files' ? fileList(s) : ntList(s);
    else if (p[0] === 'me') html = me(s);
    else html = home(s);
    if (UI.dlg && DLG[UI.dlg.type]) html += DLG[UI.dlg.type](s);
    // 다시 그려도 쓰던 글자와 커서를 지킨다 (데이터가 1초마다 새로 올 수 있음)
    const ae = document.activeElement, keepId = ae && ae.id;
    let ss = null, se = null;
    try { ss = ae.selectionStart; se = ae.selectionEnd; } catch (e) {}
    const vals = {};
    document.querySelectorAll('#app input[id], #app textarea[id], #app select[id]').forEach((el) => { vals[el.id] = el.value; });
    $('#app').innerHTML = html;
    Object.entries(vals).forEach(([k, v]) => { const el = document.getElementById(k); if (el && !el.value && v) el.value = v; });
    if (keepId) { const el = document.getElementById(keepId); if (el) { el.focus(); try { if (ss != null) el.setSelectionRange(ss, se); } catch (e) {} } }
    if ($('#opNv')) { nvLoad(); nvMount(); }  // 네이버 지도 자리가 있으면 불러와 얹는다
  }

  // 거르기 칸 · 공장 등록 읍·면·동 · 근무 상태 · 체크리스트 문항 · 자료 파일
  const setF = (key, v) => { const [a, b] = key.split('.'); UI.f[a][b] = v; };
  const fsize = (n) => (n > 1e6 ? (n / 1e6).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1e3)) + 'KB');
  document.addEventListener('change', (e) => {
    if (!ON) return;
    const t = e.target;
    if (t.matches('select[data-opf]')) { setF(t.dataset.opf, t.value); render(); }
    else if (t.matches('[data-opnf]')) { UI.nf[t.dataset.opnf] = t.value; render(); }
    else if (t.matches('[data-oph]')) { UI[t.dataset.oph] = t.value; UI.zoom = 1; UI.c = null; render(); }
    else if (t.matches('[data-opcl]')) render();
    else if (t.matches('[data-opw]')) {
      const n = t.dataset.opw, v = t.value;
      DB.act((s) => { opw(s, 'guards', {})[n] = { work: v }; DB.log(`${ME} ${n} 근무 상태 → ${v}`); });
      toast(`${n} 지킴이를 ${v}(으)로 바꿨어요`);
    } else if (t.matches('[data-opfu]') && t.files[0]) { UI.fu = { ...UI.fu, name: t.files[0].name, size: fsize(t.files[0].size) }; render(); }
  });
  // 한글을 조합하는 동안에는 다시 그리지 않는다 (조합이 끊긴다)
  document.addEventListener('input', (e) => {
    if (!ON) return;
    const t = e.target;
    if (t.matches('input[data-opf]')) { setF(t.dataset.opf, t.value.trim()); if (!e.isComposing) render(); }
    else if (t.matches('[data-opcl]') && UI.cl) { const [a, k] = t.dataset.opcl.split(':').map(Number); UI.cl[a].items[k].t = t.value; }
  });
  // 홈 지도 찾기 칸 — 치는 대로 연관 검색어만 바꿔 끼운다
  document.addEventListener('input', (e) => { if (ON && e.target.id === 'ophq') { UI.sq = e.target.value; UI.sOpen = true; UI.si = -1; refreshSugg(); } });
  document.addEventListener('keyup', (e) => { if (ON && e.target.id === 'ophq' && e.key === 'Enter' && UI.enterLater) { UI.enterLater = false; pickEnter(); } });
  // 칸을 누르면 (글자가 있으면) 다시 열고, 바깥을 누르면 닫는다. 포커스로 열지 않는 것은 다시 그릴 때 포커스가 돌아와 목록이 저절로 열리기 때문
  document.addEventListener('click', (e) => {
    if (!ON) return;
    if (e.target.id === 'ophq') { if (UI.sq.trim() && !UI.sOpen) { UI.sOpen = true; refreshSugg(); } }
    else if (UI.sOpen && !e.target.closest('.opsbox')) { UI.sOpen = false; refreshSugg(); }
  });
  document.addEventListener('compositionend', (e) => { if (ON && e.target.matches('input[data-opf]')) { setF(e.target.dataset.opf, e.target.value.trim()); render(); } });

  // 홈 지도의 공장 찾기 — Enter면 공장 탭으로 가서 이름으로 거른다
  document.addEventListener('keydown', (e) => {
    if (ON && e.target.id === 'ophq') {
      const n = suggItems().length;
      if (e.key === 'Enter') { if (e.isComposing) UI.enterLater = true; else { UI.enterLater = false; pickEnter(); } }  // 한글 조합 중 Enter는 조합이 끝난 뒤(keyup) 건다
      else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && UI.sOpen && n) { e.preventDefault(); UI.si = e.key === 'ArrowDown' ? (UI.si + 1) % n : UI.si <= 0 ? n - 1 : UI.si - 1; refreshSugg(); }
      else if (e.key === 'Escape' && UI.sOpen) { UI.sOpen = false; refreshSugg(); }
    }
    if (ON && e.key === 'Escape' && UI.bigMap) { UI.bigMap = false; render(); }
  });
  // 홈 지도 휠 확대 · 축소 (2026-10-01 사용자 요청) — 마우스가 가리킨 곳을 붙잡고 커지고 작아진다.
  // 마우스가 지도 위에 있으면 휠은 늘 지도만 받는다 — 끝까지 줄이거나 키워도 페이지는 안 움직인다
  // (처음엔 끝에서 페이지로 넘겼는데, 같은 날 사용자가 "지도뿐 아니라 웹 전체가 스크롤된다"고 해서 바꿈).
  // 휠은 빨리 여러 번 오므로 한 화면(requestAnimationFrame)에 모아 지도 그림만 바꿔 끼운다 (화면 전체를 다시 그리지 않음)
  const ZMAX = 8;
  let wq = null, wqRaf = 0;
  function redrawMap() {
    const w = $('.opmapw'), old = w && w.querySelector('svg.opmap');
    if (!old) return;
    old.outerHTML = heroMap(DB.s, todoItems(DB.s));
    refreshTip();
    w.querySelectorAll('[data-act=zoom]').forEach((b) => { b.disabled = +b.dataset.v > 0 ? UI.zoom >= ZMAX : UI.zoom <= 1; });
  }
  function applyWheel() {
    const { f, px, py } = wq, mv = UI.mv, z0 = UI.zoom, z1 = Math.min(ZMAX, Math.max(1, z0 * f));
    wq = null; wqRaf = 0;
    if (z1 === z0) return;
    if (z1 < 1.02) { UI.zoom = 1; UI.c = null; } else {
      const k1 = (mv.k * z1) / z0;  // 마우스 아래 지도 자리(mx, my)가 확대 뒤에도 마우스 아래에 남도록 가운데를 옮긴다
      UI.zoom = z1; UI.c = [mv.vx + px / mv.k - px / k1 + mv.ox / k1, mv.vy + py / mv.k - py / k1 + mv.oy / k1];
    }
    redrawMap();
  }
  document.addEventListener('wheel', (e) => {
    const svg = ON && UI.mv && e.target.closest && e.target.closest('.opmapw') && $('.opmapw svg.opmap');
    if (!svg || e.target.closest('.opsugg')) return;  // 연관 검색어 목록 위에서는 목록이 스크롤된다 (페이지로는 안 넘어감 — overscroll-behavior)
    e.preventDefault();
    const cur = UI.zoom * (wq ? wq.f : 1);
    if ((e.deltaY > 0 && cur <= 1) || (e.deltaY < 0 && cur >= ZMAX) || !e.deltaY) return;
    const r = svg.getBoundingClientRect(), dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    wq = { f: (wq ? wq.f : 1) * Math.exp(-dy * 0.0025), px: ((e.clientX - r.left) * UI.mv.W) / r.width, py: ((e.clientY - r.top) * UI.mv.H) / r.height };
    if (!wqRaf) wqRaf = requestAnimationFrame(applyWheel);
  }, { passive: false });
  // 끌어서 옮기기 (같은 날 사용자 요청) — 키운 뒤에만(다 줄이면 도시 전체가 보여 옮길 데가 없다), 마우스로만
  // (휴대폰은 손가락으로 끌면 페이지가 내려가야 해서 손대지 않는다). 4px 넘게 움직여야 끌기로 보고,
  // 끈 뒤 손을 뗄 때 핀 누름(공장으로 가기)이 따라 나가지 않게 그 한 번의 누름은 버린다. 지도 그림은 다시 그릴 때 바뀌므로 문서에서 듣는다
  let drag = null, dragRaf = 0, eatClick = false;
  document.addEventListener('pointerdown', (e) => {
    if (!ON || e.pointerType !== 'mouse' || e.button !== 0 || UI.zoom <= 1 || !UI.mv || !e.target.closest('svg.opmap')) return;
    const mv = UI.mv;
    drag = { x: e.clientX, y: e.clientY, k: mv.k, c: [mv.vx + mv.ox / mv.k, mv.vy + mv.oy / mv.k], moved: false };
    e.preventDefault();  // 글자 고르기가 시작되지 않게
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) { drag.moved = true; document.body.classList.add('opdrag'); if (UI.tip) { UI.tip = null; refreshTip(); } }
    UI.c = [drag.c[0] - dx / drag.k, drag.c[1] - dy / drag.k];
    if (!dragRaf) dragRaf = requestAnimationFrame(() => { dragRaf = 0; redrawMap(); });
  });
  const dragEnd = () => {
    if (!drag) return;
    if (drag.moved) { eatClick = true; setTimeout(() => { eatClick = false; }, 0); document.body.classList.remove('opdrag'); }
    drag = null;
  };
  // 핀 위에 마우스가 오면 공장 정보, 벗어나면 닫는다 (끄는 동안은 안 띄움)
  document.addEventListener('pointerover', (e) => {
    if (!ON || e.pointerType !== 'mouse' || (drag && drag.moved)) return;
    const g = e.target.closest && e.target.closest('.opmapw .oppin'), fid = g ? g.dataset.go.split('/')[1] : null;
    if (fid !== UI.tip) { UI.tip = fid; refreshTip(); }
  });
  document.addEventListener('pointerup', dragEnd);
  document.addEventListener('pointercancel', dragEnd);
  document.addEventListener('click', (e) => { if (eatClick) { eatClick = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  // 홈 지도는 화면 폭(넓은 화면 · 휴대폰)에 따라 범위를 달리 잡는다 — 폭이 바뀌면 다시 그린다
  let rsz = null;
  addEventListener('resize', () => { if (!ON || R.path()[0]) return; clearTimeout(rsz); rsz = setTimeout(render, 150); });

  const val = (id) => (($('#' + id) || {}).value || '').trim();
  const goNext = () => { const nx = waiting(DB.s)[0]; R.go(nx ? `insp/v/${nx.id}` : 'insp'); };
  const ACTS = {
    logout: () => webLogout(),
    ctl() { toggleCtl(); },
    menu() { UI.menu = !UI.menu; render(); },
    back() { history.back(); },
    close() { UI.dlg = null; render(); },
    pw() { toast('비밀번호 바꾸기는 시제품에서 빼 두었어요'); },
    // 홈
    bell() { UI.bell = !UI.bell; render(); },
    bigOpen() { UI.bigMap = true; UI.bell = false; render(); },
    bigClose() { UI.bigMap = false; render(); },
    zoom({ v }) { UI.zoom = Math.min(ZMAX, UI.zoom * (+v > 0 ? 1.6 : 1 / 1.6)); if (UI.zoom < 1.05) { UI.zoom = 1; UI.c = null; } render(); },
    gu({ v }) { UI.gu = v; UI.zoom = 1; UI.c = null; render(); },
    sqi({ v }) { UI.sqi += +v; render(); },
    sqPick({ v }) { UI.sqi = +v; render(); },
    sPick({ i }) { const x = suggItems()[+i]; if (x) applySearch(x.v, x.fid); },
    sClear() { const el = $('#ophq'); if (el) el.value = ''; applySearch(''); const el2 = $('#ophq'); if (el2) el2.focus(); },  // 칸을 먼저 비운다 — render가 쓰던 글자를 되살리지 않게
    sqFac({ id }) { UI.f.fac = { sq: id }; R.go('factories'); },
    sqMsg({ n }) { toast(`${n}에게 문자 보내기는 시제품에서 빼 두었어요`); },
    // 제출 검사
    okToggle() { UI.okOpen = !UI.okOpen; render(); },
    okOpenDlg({ id }) { UI.dlg = { type: 'ok', id }; render(); },
    backOpen({ id }) {
      const i = DB.s.inspections.find((x) => x.id === id), why = [];
      if (badOf(i).some((x) => !x.memo)) why.push(WHY[0]);
      if (i.items.some((x) => !x.answer)) why.push(WHY[2]);
      UI.dlg = { type: 'back', id, why }; render();
    },
    rjWhy({ v }) { const w = UI.dlg.why; UI.dlg.why = w.includes(v) ? w.filter((x) => x !== v) : [...w, v]; render(); },
    doOk({ id }) {
      const i = DB.s.inspections.find((x) => x.id === id), n = badOf(i).length, nm = FACTORIES[i.fid].name;
      UI.dlg = null;
      DB.act((s) => approveInsp(s, s.inspections.find((x) => x.id === id), ME));
      toast(n ? `승인했어요 · ${nm} 공장주에게 개선 요청 ${n}건이 갔어요` : `${nm} 점검을 승인했어요`);
      goNext();
    },
    doBack({ id }) {
      const note = [...UI.dlg.why, val('rjNote')].filter(Boolean).join(' / ');
      if (!note) { toast('반려 사유를 고르거나 적어 주세요'); return; }
      const i = DB.s.inspections.find((x) => x.id === id);
      UI.dlg = null;
      DB.act((s) => rejectInsp(s, s.inspections.find((x) => x.id === id), ME, note));
      toast(`반려했어요 · ${i.by} 지킴이에게 돌아갔어요`);
      goNext();
    },
    fixF({ v }) { UI.f.fix = v; render(); },
    // 센서
    opFault({ k }) { UI.dlg = { type: 'fault', k }; render(); },
    opRepair({ k }) { const note = val('opNote'); UI.dlg = null; DB.act((s) => SIM.repair(s, k, ME, note)); toast('수리 중으로 돌렸어요 · 열린 경보를 닫았어요'); },
    opReject({ k }) { UI.dlg = null; DB.act((s) => { (s.faults || []).filter((f) => f.key === k && f.status === 'open').forEach((f) => { f.status = 'rejected'; }); DB.log(`${ME} ${SENSORS[k].title} 고장 신고 닫음 (센서 정상)`); }); toast('신고를 닫았어요 · 경보는 계속 울려요'); },
    opRestore({ k }) { DB.act((s) => SIM.restore(s, k, ME)); toast('감시로 되돌렸어요'); },
    senOpen({ fid }) { UI.dlg = { type: 'sen', fid, on: '기계', kind: 'vib' }; render(); },
    senSet({ k, v }) { UI.dlg[k] = v; render(); },
    senSave() {
      const d = UI.dlg, zone = val('snZone'), machine = d.on === '기계' ? val('snMachine') : '';
      if (!zone || (d.on === '기계' && !machine)) { toast(`${!zone ? '구역' : '기계 이름'}을 적어 주세요`); return; }
      const name = machine ? `${machine} ${SEN_KINDS.find(([k]) => k === d.kind)[1]}` : SEN_KINDS.find(([k]) => k === d.kind)[1];
      const x = { zone, on: d.on, machine, kind: d.kind, limit: val('snLimit'), name, at: '9/17' };
      UI.dlg = null;
      DB.act((s) => { const m = opw(s, 'sensorsAdd', {}); (m[d.fid] = m[d.fid] || []).push(x); DB.log(`${ME} 센서 더함 · ${facOf(s, d.fid).name} ${name}`); });
      toast('센서를 더했어요 · 값이 들어오면 감시를 시작해요');
    },
    // 공장 등록
    nfSet({ k, v }) { UI.nf[k] = v; render(); },
    nfSave() {
      const d = UI.nf, f = { name: val('nfName'), biz: val('nfBiz'), ceo: val('nfCeo'), type: val('nfType'), workers: +val('nfWorkers') || null, addr: val('nfAddr'), tel: val('nfTel'),
        kind: d.kind, own: d.own, why: d.why, dong: d.dong };
      const miss = [['기업명', f.name], ['사업자번호', f.biz], ['대표자', f.ceo], ['업종', f.type], ['기업 종류', f.kind], ['읍·면·동', f.dong], ['등록사유', f.why], ['대표 휴대폰', f.tel]].filter(([, v]) => !v).map(([k]) => k);
      if (miss.length) { toast(`꼭 적을 칸이 비었어요: ${miss.join(', ')}`); return; }
      const id = 'n' + Date.now().toString(36);
      DB.act((s) => { opw(s, 'facs', []).push({ id, ...f, at: '9/17' }); DB.log(`${ME} 공장 등록 · ${f.name} (${f.why})`); });
      UI.nf = {};
      toast(`등록했어요 · ${f.ceo}님 휴대폰으로 초대 문자를 보냈어요`);
      R.go('factory/' + id);
    },
    // 점검조
    sqLead({ id, m }) { DB.act((s) => sqSet(s, id, (e) => { e.lead = m; })); toast(`${m} 지킴이를 조장으로 바꿨어요`); },
    sqOut({ id, m }) { DB.act((s) => sqSet(s, id, (e) => { e.members = e.members.filter((x) => x !== m); })); toast(`${m} 지킴이를 조에서 뺐어요`); },
    sqIn({ id }) { const m = val('sqAdd'); if (!m) return; DB.act((s) => sqSet(s, id, (e) => { e.members.push(m); })); toast(`${m} 지킴이를 넣었어요`); },
    sqArea({ id, d }) {
      const o = sqOfDong(DB.s, d);
      DB.act((s) => {
        if (o && o.id === id) { sqSet(s, id, (e) => { e.areas = e.areas.filter((x) => x !== d); }); return; }
        if (o) sqSet(s, o.id, (e) => { e.areas = e.areas.filter((x) => x !== d); });
        sqSet(s, id, (e) => { e.areas.push(d); });
      });
      toast(o && o.id === id ? `${d}을 풀었어요 · 맡은 조가 없어요` : o ? `${d}을 ${o.name}에서 옮겨 왔어요` : `${d}을 맡겼어요`);
    },
    apOk({ n }) { DB.act((s) => { opw(s, 'apply', {})[n] = 'ok'; DB.log(`${ME} 지킴이 가입 승인 · ${n}`); }); toast(`${n}님 가입을 승인했어요 · 조에 넣어 주세요`); },
    apNo({ n }) { DB.act((s) => { opw(s, 'apply', {})[n] = 'no'; DB.log(`${ME} 지킴이 가입 반려 · ${n}`); }); toast(`${n}님 가입 신청을 반려했어요`); },
    // 체크리스트
    verSel({ v }) { UI.ver = v; render(); },
    clDel({ a, k }) { const x = UI.cl[+a].items[+k]; if (x.o == null) UI.cl[+a].items.splice(+k, 1); else x.del = !x.del; render(); },
    clAdd({ a }) { UI.cl[+a].items.push({ t: '', o: null }); render(); const el = $(`#cl-${a}-${UI.cl[+a].items.length - 1}`); if (el) el.focus(); },
    clCancel() { UI.cl = null; R.go('checklist'); },
    clUp() { const c = clCount(UI.cl); if (!c.fix && !c.add && !c.del) { toast('바뀐 것이 없어요'); return; } UI.dlg = { type: 'ver' }; render(); },
    clConfirm() {
      const c = clCount(UI.cl), ver = nextVer(DB.s);
      const areas = UI.cl.map((a) => ({ key: a.key, no: a.no, name: a.name, common: a.common, items: a.items.filter((x) => !x.del && x.t.trim()).map((x) => x.t.trim()) }));
      DB.act((s) => { opw(s, 'vers', []).push({ ver, at: '2026-09-17', n: c.n, what: `고침 ${c.fix} · 새 항목 ${c.add} · 뺌 ${c.del}`, areas }); DB.log(`${ME} 체크리스트 새 판 ${ver} 올림`); });
      UI.cl = null; UI.ver = null; UI.dlg = null;
      toast(`${ver}을 올렸어요 · 다음 점검부터 이 판을 써요`);
      R.go('checklist');
    },
    // 공지 · 자료
    ntOpen({ id }) { UI.nt = UI.nt === id ? null : id; render(); },
    nnTo({ v }) { UI.nn.to = v; render(); },
    nnPost() {
      const title = val('nnTitle'), body = val('nnBody');
      if (!title || !body) { toast(`${!title ? '제목' : '내용'}을 적어 주세요`); return; }
      Object.assign(UI.nn, { title, body }); UI.dlg = { type: 'nn' }; render();
    },
    nnConfirm() {
      const d = UI.nn;
      DB.act((s) => { opw(s, 'notices', []).unshift({ id: 'on' + Date.now().toString(36), to: d.to, at: '9/17', title: d.title, body: d.body, by: ME }); DB.log(`${ME} 공지 올림 · ${d.title}`); });
      UI.nn = { to: '지킴이' }; UI.dlg = null;
      toast('공지를 올렸어요');
      R.go('board');
    },
    fuOpen() { UI.fu = UI.fu ? null : { to: '모두' }; render(); },
    fuTo({ v }) { UI.fu.to = v; render(); },
    fuSave() {
      const u = UI.fu;
      if (!u.name) { toast('파일을 골라 주세요'); return; }
      DB.act((s) => { opw(s, 'files', []).unshift({ id: 'fl' + Date.now().toString(36), name: u.name, to: u.to, size: u.size, at: '9/17' }); DB.log(`${ME} 자료 올림 · ${u.name}`); });
      UI.fu = null; toast('자료를 올렸어요');
    },
    fileGet() { toast('시제품이라 내려받기는 안 돼요'); },
  };
  return { render, ACTS, setMe(n) { ME = n; ON = true; } };
})();
