// 시제품 공통 — 데이터 창고, 경보 규칙, 화면 넘기기, 시연 조작판.
// server.py로 열면 임시 DB(SQLite)에 두고 여러 기기가 함께 쓴다.
// 서버 없이(python -m http.server 등) 열면 이 브라우저 저장소에 둔다.

const KEY = 'uiux-proto';
const clone = (o) => JSON.parse(JSON.stringify(o));

/* ---------- 데이터 창고 ---------- */
const DB = {
  s: null,
  ver: 0,
  remote: false,
  busy: false,
  subs: [],
  on(f) { this.subs.push(f); },
  emit() { this.subs.forEach((f) => f()); },
  log(msg) { this.s.log.unshift(hm(this.s.clock) + ' ' + msg); this.s.log.length = Math.min(this.s.log.length, 40); },
  loadLocal() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    this.s = s && s.v === SEED.v ? s : clone(SEED);
  },
  saveLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch (e) {}
    try { chan && chan.postMessage('x'); } catch (e) {}
  },
  // 바꾸기: 이 기기에서 먼저 바꾸고 서버에 올린다. 그사이 다른 기기가 바꿨으면 최신을 받아 다시 적용한다.
  act(fn) {
    fn(this.s);
    this.emit();
    if (!this.remote) { this.saveLocal(); return; }
    this.push(fn, 0);
  },
  async push(fn, tries, force) {
    this.busy = true;
    try {
      const r = await fetch('api/state', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base: this.ver, state: this.s, force: !!force }) });
      if (r.status === 409 && tries < 4) {
        const j = await r.json();
        this.s = j.state && j.state.v === SEED.v ? j.state : clone(SEED);
        this.ver = j.ver;
        if (fn) fn(this.s);
        this.emit();
        return this.push(fn, tries + 1);
      }
      if (r.ok) this.ver = (await r.json()).ver;
    } catch (e) { toast('서버에 연결되지 않아요'); }
    finally { this.busy = false; }
  },
  reset() { this.s = clone(SEED); this.emit(); if (this.remote) return this.push(null, 0, true); this.saveLocal(); },
  async poll() {
    if (this.busy) return;
    try {
      const r = await fetch('api/state?since=' + this.ver);
      if (r.status !== 200 || this.busy) return;
      const j = await r.json();
      if (this.busy || j.ver <= this.ver || !j.state || j.state.v !== SEED.v) return;
      this.s = j.state; this.ver = j.ver; this.emit();
    } catch (e) {}
  },
};
let chan = null;
try { chan = new BroadcastChannel(KEY); chan.onmessage = () => { if (!DB.remote) { DB.loadLocal(); DB.emit(); } }; } catch (e) {}
addEventListener('storage', (e) => { if (e.key === KEY && !DB.remote) { DB.loadLocal(); DB.emit(); } });
DB.ready = (async () => {
  try {
    const r = await fetch('api/state');
    if (r.ok) {
      const j = await r.json();
      DB.remote = true;
      if (j.state && j.state.v === SEED.v) { DB.s = j.state; DB.ver = j.ver; }
      else { DB.s = clone(SEED); DB.ver = j.ver; await DB.push(null, 0, true); }
      setInterval(() => DB.poll(), 1000);
      return;
    }
  } catch (e) {}
  DB.loadLocal();
})();

/* ---------- 작은 도구 ---------- */
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// 아이폰 홈 화면 앱이면 문서 스크롤을 잠근다 (display-mode 미지원 대비)
try { if (navigator.standalone) document.documentElement.dataset.standalone = '1'; } catch (e) {}
const hm = (m) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const $ = (q) => document.querySelector(q);
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
function buzz(pattern) { try { navigator.vibrate && navigator.vibrate(pattern); } catch (e) {} }
let audioCtx = null;
function beep() {
  try {
    audioCtx = audioCtx || new AudioContext();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = 880; g.gain.value = 0.08;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.35);
  } catch (e) {}
}

/* ---------- 경보 규칙 (방법론 문서 2단계·시안 10차) ---------- */
const SIM = {
  title(a) { return a.title || SENSORS[a.key].title; },
  live(a) { return a.status !== 'ended'; },
  sname(key) { return `${FACTORIES[SENSORS[key].fid].name} ${SENSORS[key].title}`; },
  sensor(s, key) { return (s.sensors && s.sensors[key]) || { state: 'watch' }; },
  // 작업 예정 알림이 지금 이 센서에 걸려 있나 (엔진: 그 시간 기준을 올려 잡음)
  memoOn(s, key) { return (s.memos || []).find((m) => m.status === 'applied' && m.facts.key === key && s.clock >= m.facts.start && s.clock < m.facts.end); },
  raise(s, key) {
    if (s.alarms.some((a) => a.key === key && SIM.live(a))) return null;
    const st = SIM.sensor(s, key).state;
    const nm = SIM.sname(key);
    if (st === 'repair') { DB.log(`${nm} 이상 값 — 수리 중이라 경보 없음`); return null; }
    if (st === 'unknown') { DB.log(`${nm} 값이 안 와서 판단 못 함`); return null; }
    const m = SIM.memoOn(s, key);
    if (m) { DB.log(`${nm} 올라감 — 작업 예정 알림(${m.facts.kind})대로라 경보 없음`); return null; }
    const d = SENSORS[key];
    const a = { id: 'a' + Date.now().toString(36), key, day: '9/17', start: s.clock, status: 'open', abnormal: true,
      ratio: d.ratio || null, acks: [], snoozes: 0, remindAt: null, escalated: false, endedAt: null, endKind: null };
    s.alarms.unshift(a);
    DB.log(`경보 생김 · ${SIM.sname(key)}`);
    return a;
  },
  get(s, id) { return s.alarms.find((a) => a.id === id); },
  // 조치 완료 (처음 누름 또는 다시 조치)
  ack(s, id, by, at) {
    const a = SIM.get(s, id); if (!a || !SIM.live(a)) return;
    a.acks.push({ by, at: at ?? s.clock, re: a.acks.length > 0, prev: a.status, prevRemind: a.remindAt });
    a.status = 'watch';
    a.remindAt = s.clock + REMIND_MIN;
    DB.log(`${by} ${a.acks.length > 1 ? '다시 조치' : '조치 완료'} · ${SIM.title(a)}`);
  },
  undo(s, id, by) {
    const a = SIM.get(s, id); if (!a) return;
    const last = a.acks[a.acks.length - 1];
    if (!last || last.by !== by) return;
    a.acks.pop();
    if (a.status === 'watch') { a.status = last.prev; a.remindAt = last.prevRemind; }
    DB.log(`${by} 조치 완료 취소 · ${SIM.title(a)}`);
  },
  snooze(s, id, by) {
    const a = SIM.get(s, id); if (!a || a.status !== 'remind' || a.snoozes >= SNOOZE_LIMIT) return;
    a.snoozes += 1;
    a.status = 'watch';
    a.remindAt = s.clock + REMIND_MIN;
    if (a.snoozes >= SNOOZE_LIMIT) { a.escalated = true; DB.log(`미루기 다 씀 → 대표님·운영자에게 알림 · ${SIM.title(a)}`); }
    else DB.log(`${by} 5분 뒤 다시 알림 · ${SIM.title(a)}`);
  },
  tick(s, min) {
    s.clock += min;
    s.alarms.forEach((a) => {
      if (a.status === 'watch' && a.abnormal && a.remindAt <= s.clock) {
        a.status = 'remind';
        if (a.ratio) a.ratio = Math.max(1.2, Math.round((a.ratio - 0.2) * 10) / 10);
        DB.log(`아직 이상 → 모두에게 다시 알림 · ${SIM.title(a)}`);
      }
    });
  },
  normal(s, id) {
    const a = SIM.get(s, id); if (!a || !SIM.live(a)) return;
    a.abnormal = false; a.status = 'ended'; a.endedAt = s.clock;
    a.endKind = a.acks.length ? 'ended' : 'noack';
    DB.log(`센서 정상 · ${SIM.title(a)} ${a.endKind === 'noack' ? '(아무도 안 누르고 끝남)' : ''}`);
  },
  // 센서 고장 → 운영자가 수리 중으로 돌림: 열린 경보는 "수리로 닫힘" (시안 10차)
  repair(s, key, by, note) {
    s.sensors[key] = { state: 'repair', since: hm(s.clock), by, note: note || '' };
    s.alarms.filter((a) => a.key === key && SIM.live(a)).forEach((a) => { a.status = 'ended'; a.abnormal = false; a.endedAt = s.clock; a.endKind = 'repair'; });
    (s.faults || []).filter((f) => f.key === key && f.status === 'open').forEach((f) => { f.status = 'repair'; f.doneAt = hm(s.clock); });
    DB.log(`${by} ${SIM.sname(key)} 수리 중으로 돌림`);
  },
  restore(s, key, by) {
    s.sensors[key] = { state: 'watch' };
    (s.faults || []).filter((f) => f.key === key && f.status === 'repair').forEach((f) => { f.status = 'done'; });
    DB.log(`${by} ${SIM.sname(key)} 수리 끝 · 감시로 되돌림`);
  },
  // 값 끊김 → "모름" (근로자에게 경보는 보내지 않고 공장주·운영자에게 알림)
  cut(s, key) {
    const cur = SIM.sensor(s, key).state;
    if (cur === 'unknown') { s.sensors[key] = { state: 'watch' }; DB.log(`${SIM.sname(key)} 값 다시 들어옴`); }
    else if (cur === 'watch') { s.sensors[key] = { state: 'unknown', since: hm(s.clock) }; DB.log(`${SIM.sname(key)} 값 끊김 → 모름 · 공장주·운영자에게 알림`); }
  },
  // 경보가 끝나는 방식 — 화면 말 (시안 14차 대조표)
  endWord(a) {
    if (a.status !== 'ended') return a.acks.length ? '조치됨 · 아직 이상' : '조치 안 됨';
    return a.endKind === 'noack' ? '아무도 안 누르고 끝남' : a.endKind === 'repair' ? '수리로 닫힘' : '끝남';
  },
  lastAck(a) { return a.acks[a.acks.length - 1]; },
};

/* ---------- 점검 항목 상태 (흐름도 B⑥~B⑨) ---------- */
// todo 아직 안 고침 · claimed 고쳤어요 표시함(재점검 기다림) · fixed 고쳐짐 확인 · back 안 고쳐짐으로 돌아옴
function itemState(it) {
  const last = (it.log || [])[(it.log || []).length - 1];
  if (!last) return 'todo';
  if (last.t === 'fix') return 'claimed';
  return last.result === 'fixed' ? 'fixed' : 'back';
}
// 운영자가 승인한 점검만 공장주에게 가고 재점검 목록에 오른다 (2026-09-22, 흐름도 B⑥-1). 상태가 없는 옛 기록은 승인된 것으로 읽는다.
const APPROVED = (ins) => (ins.st || 'ok') === 'ok';
function recheckQueue(s, fid) {
  const out = [];
  s.inspections.filter((i) => i.fid === fid && APPROVED(i)).forEach((ins) =>
    ins.items.filter((it) => it.answer === 'bad' && itemState(it) === 'claimed').forEach((it) => out.push({ ins, it })));
  return out;
}

/* ---------- 화면 넘기기 ---------- */
const R = {
  path() { return (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean); },
  go(p) { location.hash = '#/' + p; },
};

// data-go="경로" 누르면 이동, data-act="이름" 누르면 앱의 ACTS[이름] 실행
function wire(ACTS, render) {
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) { e.preventDefault(); R.go(g.dataset.go); return; }
    const t = e.target.closest('[data-act]');
    if (t && ACTS[t.dataset.act]) { e.preventDefault(); ACTS[t.dataset.act](t.dataset, t); }
  });
  addEventListener('hashchange', () => { render(); scrollTo(0, 0); document.body.scrollTop = 0; });
  DB.ready.then(() => { DB.on(render); render(); });
}

/* ---------- 가짜 상태 표시줄 + 시연 조작판 ---------- */
// 상태 표시줄을 세 번 빨리 누르면 조작판이 열린다 (진행자용, 참가자에게는 안 보임)
// 휴대폰 상단바 흉내 — PC 미리보기에서만 보인다 (실제 폰에서는 휴대폰의 상단바와 겹치므로 숨김).
// 시각은 이야기 속 가상 시각. 인자에 '📵'·'전파 없음'이 있으면 연결 끊김, '📳'이면 진동 표시.
const ICON = {
  signal: '<svg viewBox="0 0 18 12" width="18" height="12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>',
  nosignal: '<svg viewBox="0 0 18 12" width="18" height="12" opacity=".35"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>',
  wifi: '<svg viewBox="0 0 16 12" width="16" height="12"><path d="M8 11.5 5.6 8.9a3.4 3.4 0 0 1 4.8 0z"/><path d="M3.4 6.6a6.5 6.5 0 0 1 9.2 0l-1.3 1.3a4.7 4.7 0 0 0-6.6 0z"/><path d="M1.2 4.4a9.6 9.6 0 0 1 13.6 0l-1.3 1.3a7.8 7.8 0 0 0-11 0z"/></svg>',
  battery: '<svg viewBox="0 0 27 13" width="27" height="13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="17" height="9" rx="2"/><rect x="24.5" y="4.5" width="1.8" height="4" rx="1" opacity=".4"/></svg>',
  vib: '<svg viewBox="0 0 16 12" width="16" height="12"><rect x="5" y="1" width="6" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 3v6M0.8 4.5v3M13.5 3v6M15.2 4.5v3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>',
};
function sbar(state) {
  const off = /📵|전파 없음/.test(state || ''), vib = /📳/.test(state || '');
  const m = DB.s.clock;
  return `<div class="sbar" id="sbar"><span class="clock">${Math.floor(m / 60) % 24}:${String(m % 60).padStart(2, '0')}</span><span class="island"></span>
    <span class="icons">${vib ? ICON.vib : ''}${off ? ICON.nosignal : ICON.signal + ICON.wifi}${ICON.battery}</span></div>`;
}
// 앱 머리글 — 웹 머리글과 같은 결 (방패 표시 + 이름 + 오른쪽 내 이름)
function appBar(title, sub, right = '') {
  return `<div class="appbar"><i class="mark" title="시연 조작판: 세 번 누르기"></i><div class="ttl"><b>${title}</b><small>${sub}</small></div><span class="ar">${right}</span></div>`;
}
// 위치 띠 — 웹의 남색 띠 (← ⌂ › 화면 이름)
function band(title, back, end = '') {
  return `<div class="head">${back != null ? `<button class="back" data-go="${back}" aria-label="뒤로">${I('back', 22)}</button>` : ''}<button class="hm" data-go="" aria-label="홈">${I('home', 19)}</button><span class="crumb">${title}</span><span class="end">${end}</span></div>`;
}
// 숫자 칸 — 굵은 밑줄 제목, 왼쪽 큰 숫자, 오른쪽 작은 숫자들, 아래 자세히보기
function kcard({ t, v, unit = '', rows = [], go, more = '자세히보기', tone = '' }) {
  return `<div class="kcard ${tone}"><div class="kt">${t}</div>
    <div class="kbody"><div class="kv">${v}<small>${unit}</small></div>
      <div class="kside">${rows.map(([k, x]) => `<div><span>${k}</span><em>${x}</em></div>`).join('')}</div></div>
    ${go != null ? `<button class="more" data-go="${go}">${more}</button>` : ''}</div>`;
}
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 + '' : '—');

// 큰 제목 + 한 줄 설명 — 웹의 제목 칸
function pageIntro(h, p) {
  return `<div class="pintro"><h1>${h}</h1>${p ? `<p>${p}</p>` : ''}</div>`;
}
let taps = [];
document.addEventListener('click', (e) => {
  if (!e.target.closest('#sbar, .appbar .mark, .alarm .icon')) return;
  const now = Date.now();
  taps = taps.filter((t) => now - t < 700); taps.push(now);
  if (taps.length >= 3) { taps = []; toggleCtl(); }
});
function toggleCtl(force) {
  let el = $('#ctl');
  if (el && force !== true) { el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'ctl'; el.className = 'ctl'; document.body.appendChild(el); }
  drawCtl();
}
function drawCtl() {
  const el = $('#ctl'); if (!el) return;
  const s = DB.s;
  const live = s.alarms.filter(SIM.live);
  el.innerHTML = `
  <div class="row" style="justify-content:space-between"><b>시연 조작판 · ${hm(s.clock)}</b><button class="cb" data-c="close">닫기</button></div>
  <h3>경보 일으키기</h3>
  ${['daesung', 'hanbit', 'dongbang'].map((f) => `<div class="small" style="margin-top:4px">${FACTORIES[f].name}</div>${SITE_SENSORS(f).map((k) => `<button class="cb" data-c="raise" data-k="${k}">${SENSORS[k].short}</button>`).join('')}`).join('')}
  <h3>시간</h3>
  <button class="cb" data-c="tick" data-m="5">+5분</button><button class="cb" data-c="tick" data-m="1">+1분</button><button class="cb" data-c="tick" data-m="60">+1시간</button><button class="cb" data-c="to18">18:00으로</button>
  <h3>진행 중 경보 ${live.length}건</h3>
  ${live.map((a) => `<div class="al"><b>${esc(FACTORIES[alarmFid(a)].name + ' ' + SIM.title(a))}</b> · ${a.status === 'open' ? '조치 안 됨' : a.status === 'watch' ? '지켜보는 중 → ' + hm(a.remindAt) : '다시 알림 중'} · 미룸 ${a.snoozes}<br>
     <button class="cb" data-c="normal" data-id="${a.id}">센서 정상으로</button>
     <button class="cb" data-c="other" data-id="${a.id}">${OWNER_NAME[alarmFid(a)]}가 조치 완료</button></div>`).join('') || '<div class="small">없음</div>'}
  <h3>운영자 제출 검사 (운영자 웹이 생기기 전 흉내)</h3>
  ${s.inspections.filter((i) => i.st === 'wait').map((i) => `<div class="al"><b>${esc(FACTORIES[i.fid].name)}</b> · ${esc(i.by)} · ${i.sentAt || i.date} 냄<br>
     <button class="cb" data-c="approve" data-id="${i.id}">승인</button>
     <button class="cb" data-c="reject" data-id="${i.id}">반려</button></div>`).join('') || '<div class="small">검사 기다리는 점검 없음</div>'}
  <h3>근로자 의견 (공장주 화면이 생기기 전 흉내)</h3>
  <button class="cb" data-c="vread">최근 의견 · 대표님 읽음</button>
  <button class="cb" data-c="vreply">최근 의견 · 대표님 답</button>
  <button class="cb" data-c="vdone">최근 의견 · 해결함</button>
  <h3>센서 값 끊김 (다시 누르면 들어옴)</h3>
  ${['daesung', 'hanbit', 'dongbang'].map((f) => `<div class="small" style="margin-top:4px">${FACTORIES[f].name}</div>${SITE_SENSORS(f).map((k) => `<button class="cb ${SIM.sensor(s, k).state === 'unknown' ? 'on' : ''}" data-c="cut" data-k="${k}">${SENSORS[k].short}${SIM.sensor(s, k).state === 'repair' ? ' (수리 중)' : ''}</button>`).join('')}`).join('')}
  <h3>상황</h3>
  <button class="cb ${s.net.worker ? '' : 'on'}" data-c="net" data-w="worker">근로자 폰 인터넷 끊김</button>
  <button class="cb ${s.net.guard ? '' : 'on'}" data-c="net" data-w="guard">지킴이 폰 전파 없음</button>
  <button class="cb ${s.aiDown ? 'on' : ''}" data-c="ai">AI 멈춤</button>
  <h3>처음부터</h3>
  <button class="cb" data-c="reset">처음 상태로 (09:10)</button>
  <a class="cb" href="index.html">역할 고르기</a>
  <h3>기록</h3>
  <div class="small" style="max-height:140px;overflow:auto">${s.log.map(esc).join('<br>') || '—'}</div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('#ctl [data-c]'); if (!b) return;
  const c = b.dataset.c;
  if (c === 'close') { $('#ctl').remove(); return; }
  if (c === 'reset') { if (confirm('처음 상태로 되돌릴까요?')) { sessionStorage.clear(); DB.reset(); location.hash = '#/'; } return; }
  DB.act((s) => {
    if (c === 'raise') SIM.raise(s, b.dataset.k);
    if (c === 'tick') SIM.tick(s, +b.dataset.m);
    if (c === 'to18' && s.clock < 18 * 60) SIM.tick(s, 18 * 60 - s.clock);
    if (c === 'cut') SIM.cut(s, b.dataset.k);
    if (c === 'normal') SIM.normal(s, b.dataset.id);
    if (c === 'other') SIM.ack(s, b.dataset.id, OWNER_NAME[alarmFid(SIM.get(s, b.dataset.id))]);
    if (c === 'ai') s.aiDown = !s.aiDown;
    const ins = (c === 'approve' || c === 'reject') && s.inspections.find((i) => i.id === b.dataset.id);
    if (ins && c === 'approve') { ins.st = 'ok'; ins.locked = true; ins.okAt = '9/17'; DB.log(`운영자 점검 승인 · ${FACTORIES[ins.fid].name}`); }
    // 반려 사유는 예시다 — 기존 웹에 사유 칸이 있는지 아직 모른다 (가설)
    if (ins && c === 'reject') { ins.st = 'back'; ins.back = { at: '9/17', note: '문제 항목의 메모가 짧아요. 무엇이 어떻게 문제인지 적어 다시 내 주세요.' }; DB.log(`운영자 점검 반려 · ${FACTORIES[ins.fid].name}`); }
    const v = (s.voices || [])[0];
    if (v && c === 'vread') { v.readAt = '9/17'; DB.log('대표님 의견 읽음'); }
    if (v && c === 'vreply') {
      v.readAt = v.readAt || '9/17'; v.replyAt = '9/17';
      v.reply = '알려 줘서 고마워요. 내일 오전까지 고치겠습니다.';
      v.replyTx = { vi: 'Cảm ơn bạn đã báo. Tôi sẽ sửa trước sáng mai.', en: 'Thanks for telling me. I will fix it by tomorrow morning.' };
      DB.log('대표님 의견 답');
    }
    if (v && c === 'vdone') { v.readAt = v.readAt || '9/17'; v.done = true; DB.log('대표님 의견 해결함'); }
    if (c === 'net') {
      const w = b.dataset.w;
      s.net[w] = !s.net[w];
      if (w === 'worker') s.offlineSince.worker = s.net.worker ? null : s.clock;
      if (s.net[w]) flushOutbox(s, w);
    }
  });
});
DB.on(drawCtl);

// 전파가 돌아오면 못 보낸 것을 보낸다
function flushOutbox(s, who) {
  const box = s.outbox[who]; s.outbox[who] = [];
  box.forEach((m) => {
    if (m.type === 'ack') SIM.ack(s, m.id, m.by, m.at);
    if (m.type === 'inspection') { applyInspection(s, m.data); DB.log('지킴이 점검 올라감'); }
  });
}
// 지킴이 점검·재점검 결과를 서버에 반영 (guard.js가 만든 묶음)
function applyInspection(s, d) {
  if (d.kind === 'first') {
    const again = d.redo && s.inspections.find((i) => i.id === d.redo);
    if (again) {  // 반려된 점검을 고쳐 다시 냈다 — 같은 기록에 덮고, 반려 이력은 남긴다
      Object.assign(again, { items: d.items, result: d.result, st: 'wait', sentAt: '9/17' });
      again.backs = [...(again.backs || []), again.back]; again.back = null;
    } else {
      s.inspections.unshift({ id: 'i' + Date.now().toString(36), fid: d.fid, date: '9/17', by: d.by || '김지킴', team: d.team, ver: d.ver,
        result: d.result, st: 'wait', sentAt: '9/17', locked: false, items: d.items });
    }
  } else {
    d.results.forEach((r) => {
      const ins = s.inspections.find((i) => i.id === r.insId);
      const it = ins && ins.items.find((x) => x.id === r.itemId);
      if (it) it.log.push({ t: 'recheck', at: '9/17', result: r.result, reason: r.reason || '', photo: !!r.photo });
    });
  }
}

// 예전 시제품이 등록한 서비스 워커가 남아 있으면 지운다
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
}
