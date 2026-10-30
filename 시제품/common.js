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
    s = upgrade(s);
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
        const st = upgrade(j.state);
        this.s = st && st.v === SEED.v ? st : clone(SEED);
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
      const st = upgrade(j.state);
      if (this.busy || j.ver <= this.ver || !st || st.v !== SEED.v) return;
      this.s = st; this.ver = j.ver; this.emit();
    } catch (e) {}
  },
};
// 옛 판 데이터 옮기기 — 판을 올리면 켜 둔 서버의 시험 데이터가 통째로 지워져서, 바뀐 것만 고쳐 넣는다 (2026-10-14)
// 7 → 8: 재점검 공장의 불량 항목에 고치기 전 사진(예시)을 붙이고, 운영자 검사 대기였던 점검을 확정으로
// 8 → 9: 오늘 방문을 세 곳으로 (2026-10-19) — 한빛화학 · 태광기계 방문일을 오늘로
function upgrade(s) {
  if (!s) return s;
  if (s.v === 7) {
    s.inspections.forEach((i) => {
      if (/^w/.test(i.id) || i.id === 'i0820') i.items.forEach((it) => { if (it.answer === 'bad' && it.shot === undefined) it.shot = true; });
      if (i.st === 'wait') { i.st = 'ok'; i.locked = true; }
    });
    s.v = 8;
  }
  if (s.v === 8) {
    s.visits = { ...s.visits, hanbit: '오늘 14:00', taegwang: '오늘 16:00' };
    s.v = 9;
  }
  // 기본 체크리스트 글을 종이 체크리스트대로 (2026-10-19). 이미 쌓인 점검 · 하던 점검의 기본 문항 글도 새 글로 바꾸고,
  // 전기안전이 4 → 3문항이 되어 없어진 4번째 문항(a3-3)은 뺀다
  if (s.v === 9) {
    const T = typeof CHECKLIST === 'undefined' ? null : Object.fromEntries(CHECKLIST.areas.map((a) => [a.key, a.items]));
    const fix = (items) => items.filter((it) => {
      const m = it.src === 'base' && T && /(a\d)-(\d+)$/.exec(it.id || ''); if (!m) return true;
      const t = (T[m[1]] || [])[+m[2]]; if (t === undefined) return false;
      it.text = t; return true;
    });
    if (T) { s.inspections.forEach((i) => { i.items = fix(i.items); }); if (s.draft && s.draft.items) s.draft.items = fix(s.draft.items); }
    s.v = 10;
  }
  return s;
}
let chan = null;
try { chan = new BroadcastChannel(KEY); chan.onmessage = () => { if (!DB.remote) { DB.loadLocal(); DB.emit(); } }; } catch (e) {}
addEventListener('storage', (e) => { if (e.key === KEY && !DB.remote) { DB.loadLocal(); DB.emit(); } });
DB.ready = (async () => {
  try {
    const r = await fetch('api/state');
    if (r.ok) {
      const j = await r.json();
      DB.remote = true;
      const was = j.state && j.state.v, st = upgrade(j.state);
      if (st && st.v === SEED.v) { DB.s = st; DB.ver = j.ver; if (was !== SEED.v) await DB.push(null, 0, true); }  // 옮겨 온 판은 서버에도 올린다
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
// 앱(근로자·지킴이)은 세로로만 쓴다 (2026-09-28 사용자 지시). 잠글 수 있는 곳(안드로이드 홈 화면 앱)은 잠그고,
// 잠글 수 없는 브라우저(아이폰 사파리 등)는 폰을 가로로 돌리면 "세로로 돌려 주세요" 가림막을 띄운다 — 웹(공장주·운영자)은 그대로
if (document.querySelector('#app.app')) {
  try { screen.orientation.lock('portrait').catch(() => {}); } catch (e) {}
  const m = document.createElement('div');
  m.className = 'rotmask'; m.setAttribute('aria-live', 'polite');
  m.innerHTML = '<svg viewBox="0 0 48 48" width="56" height="56" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="15" y="6" width="18" height="32" rx="3.5"/><path d="M22 33h4"/><path d="M8 30a16 16 0 0 1 2-14"/><path d="m6 19 4-3 3 4"/></svg><b>휴대폰을 세로로 돌려 주세요</b><span>이 앱은 세로 화면에서만 써요</span>';
  document.body.appendChild(m);
}
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
// 2026-10-26 개선 관리(초안): 불량 · 개선사항이 있는 점검은 지킴이가 개선 관리에서 [공장에 보내기]를 눌러야 공장에 간다(toFac: false → 보낸 날).
// 보내기 전에는 공장 · 운영자 · 지난번 미흡에 안 보인다. toFac이 없는 옛 기록은 보낸 것으로 읽는다
const APPROVED = (ins) => (ins.st || 'ok') === 'ok' && ins.toFac !== false;
const toSend = (ins) => (ins.st || 'ok') === 'ok' && ins.toFac === false;
// 제출할 것 (2026-10-26 사용자 지시) — 판정까지 끝난(또는 개선사항이 없던) 점검은 지킴이가 개선을 위한 조언을 적어 [제출]해야 끝난다(sub: false → {at, by}).
// sub가 없는 옛 기록은 제출한 것으로 읽는다. 운영자 검사(승인 · 반려)는 없다 — 제출하면 바로 확정 (2026-10-14 사용자 지시)
// 개선사항이 없던 점검도 먼저 개선 관리에 오르고(kzWait), 거기서 [저장]해야 제출할 것이 된다 (2026-10-30 사용자 지시 — 전엔 바로 결과 제출)
const toSub = (ins) => ins.sub === false && APPROVED(ins) && !inRecheck(ins) && !ins.kzWait;
// 지난번 미흡 항목 — 다음에 그 공장을 점검할 때 이 항목들이 체크리스트에 붙는다 (2026-09-22).
// 2026-10-13부터는 재점검에서 "안 고쳐짐"으로 남은 항목이 여기로 온다
// 새 점검에 다시 붙은 복사본(ref가 있는 것)은 원래 항목 하나로만 센다 — 같은 문제를 두 번 세지 않게
// 2026-10-26 개선 관리: 체크리스트 불량은 공장에 따로 가지 않는다(noFix) — 지킴이가 현장점검 개선사항(종이 10번)으로 올린다. 옛 기록은 그대로
const TRACKED = (it) => it.answer === 'bad' && !it.ref && !it.noFix;
// 공장에 간 항목 — 현장점검 개선사항(새 기록)과 옛 기록의 체크리스트 불량. 이름은 차례대로 "개선사항 n" — 지킴이 앱 · 공장 웹 같은 이름 (2026-10-26 사용자 지시)
const kzList = (ins) => ins.items.filter((x) => x.src === 'find' || TRACKED(x));
const kzName = (ins, it) => `개선사항 ${kzList(ins).indexOf(it) + 1}`;
function openIssues(s, fid) {
  const out = [];
  s.inspections.filter((i) => i.fid === fid && APPROVED(i)).forEach((ins) =>
    ins.items.filter((it) => TRACKED(it) && itemState(it) !== 'fixed').forEach((it) => out.push({ ins, it })));
  return out;
}
// 그중 공장주가 "고쳤어요"를 누른 것 — 이게 있으면 다시 가 볼 공장이 된다.
// 재점검 중인 점검의 항목은 뺀다 — 그건 2주 안에 사진으로 판정한다 (아래 재점검)
const recheckQueue = (s, fid) => openIssues(s, fid).filter((e) => itemState(e.it) === 'claimed' && !inRecheck(e.ins));

/* ---------- 재점검 (2026-10-13 사용자 결정 — 2026-09-22 "재점검은 따로 없다"를 뒤집음) ----------
   1단계 점검을 낼 때 결과가 저절로 정해진다: 불량 없음 → 점검완료, 불량 있음 → 재점검.
   재점검이면 공장이 2주 안에 고쳐서 사진을 보내고(공장주 "고쳤어요"), 지킴이가 사진을 보고 항목마다 고쳐짐·안 고쳐짐을 정한 뒤
   점검완료 · 패트롤 · 기타 중 하나를 직접 고른다. 둘째 단계는 앱이 미리 골라 주지 않는다 (사람이 보고 판단할 일) */
const RECHECK_DAYS = 14;
const FINAL_RESULTS = ['점검완료', '패트롤', '기타'];
const autoResult = (items) => (items.some((x) => x.answer === 'bad') ? '재점검' : '점검완료');
const inRecheck = (ins) => !!ins && APPROVED(ins) && ins.result === '재점검';
// 날짜는 "9/17" 꼴. 이야기 속 오늘은 9/17 (2026년)
const mdDate = (md) => { const [m, d] = String(md).split('/').map(Number); return new Date(2026, m - 1, d); };
const dateMd = (t) => `${t.getMonth() + 1}/${t.getDate()}`;
const recheckDue = (ins) => { const t = mdDate(ins.date); t.setDate(t.getDate() + RECHECK_DAYS); return dateMd(t); };
const daysLeft = (md) => Math.round((mdDate(md) - mdDate('9/17')) / 86400000);
const dWord = (n) => (n > 0 ? `D-${n}` : n === 0 ? 'D-day' : `${-n}일 지남`);
// 방문 예약(지킴이 요청 → 공장주 승인)은 2026-10-07 사용자 지시로 걷었다 — 실제로는 예약 시스템이 없고, 공장주와 따로 날을 맞추거나 불시에 간다.
// 지킴이가 정해 둔 방문일(s.visits)만 남는다
// 운영자가 점검을 승인할 때 — 붙었던 미흡 항목의 답을 원래 항목에 적는다 (양호·보통 = 고쳐짐, 불량 = 안 고쳐짐 — 2026-10-07 답이 넷이 됨)
const FIXED_ANS = (a) => a === 'ok' || a === 'mid';
function settlePrev(s, ins) {
  ins.items.filter((x) => x.ref && (FIXED_ANS(x.answer) || x.answer === 'bad')).forEach((x) => {
    const o = s.inspections.find((i) => i.id === x.ref.ins), it = o && o.items.find((y) => y.id === x.ref.id);
    if (it) (it.log = it.log || []).push({ t: 'recheck', at: ins.date, result: FIXED_ANS(x.answer) ? 'fixed' : 'not', reason: x.reason || '', photo: !!x.shot });
  });
}

// 운영자 제출 검사 (2026-10-01 운영자 웹으로 옮김). 2026-10-14 사용자 지시로 지킴이 점검은 낼 때 바로 확정되어 이제 검사 기다리는 점검이 생기지 않는다 — 운영자 웹 정리 전까지 남겨 둔다
function approveInsp(s, ins, by) { ins.st = 'ok'; ins.locked = true; ins.okAt = '9/17'; ins.okBy = by; settlePrev(s, ins); DB.log(`${by} 점검 승인 · ${FACTORIES[ins.fid].name}`); }
function rejectInsp(s, ins, by, note) { ins.st = 'back'; ins.back = { at: '9/17', by, note }; DB.log(`${by} 점검 반려 · ${FACTORIES[ins.fid].name}`); }

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
  // 화면 전환 움직임(View Transitions)은 2026-10-19에 넣었다가 같은 날 뺐다 — 아이폰 사파리의 뒤로 넘기기 기본 움직임과 겹쳤다(사용자 제보)
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

// 날짜 표기 — 앱 전체에서 "8/20" → "08.20" (2026-09-22 사용자 지시, 지킴이 앱. 2026-10-20부터 근로자 앱도). 저장된 값은 그대로 두고 그릴 때만 바꾼다.
// 앞뒤가 숫자·글자·/·. 이면 날짜가 아니라고 본다 (주소 "records/..."나 "0 / 10장" 같은 것은 안 건드린다)
const fmtDates = (h) => h.replace(/(?<![\w/.])(\d{1,2})\/(\d{1,2})(?![\w/])/g, (_, m, d) => `${m.padStart(2, '0')}.${d.padStart(2, '0')}`);
// 큰 제목 (2026-10-19 사용자 지시 — 스크롤하면 줄어드는 머리). 처음엔 내용 위에 크게, 스크롤해서 머리 밑으로 들어가면
// 머리 줄의 작은 제목(› 할 일)이 나타난다. 지킴이 앱 할 일 · 점검 결과 · 공장 창, 근로자 앱 안쪽 화면(2026-10-20)
const ltitle = (t) => `<h1 class="ltitle">${t}</h1>`;
function ltCheck() {
  const t = $('.ltitle'), top = $('.apptop'); if (!t || !top) return;
  top.classList.toggle('shrunk', t.getBoundingClientRect().bottom <= top.getBoundingClientRect().bottom + 2);
}
document.addEventListener('scroll', ltCheck, { capture: true, passive: true });
// 큰 제목 + 한 줄 설명 — 웹의 제목 칸
function pageIntro(h, p) {
  return `<div class="pintro"><h1>${h}</h1>${p ? `<p>${p}</p>` : ''}</div>`;
}
let taps = [];
document.addEventListener('click', (e) => {
  // 지킴이 앱은 머리글 방패를 걷어서(2026-10-15) 띠의 화면 이름을 세 번 누른다. 홈은 머리 띠가 없어 맨 위 HIPA 표시를 (2026-10-19)
  if (!e.target.closest('#sbar, .apptop .head .crumb, .htop .hlogo, .alarm .icon')) return;
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
// 2026-10-26 사용자 지시로 둘만 남겼다 — 역할 고르기 · 처음 상태로(시연 때 실제로 쓰는 것이 이 둘뿐, 더 필요한 것은 그때 말하기로).
// 같은 날 지킴이 탭(개선 관리 단계 넘기기 등)으로 한 번 다시 짰다가 걷었고, 9월 센서 경보 시연 조작(경보 일으키기 · 시간 · 센서 끊김 ·
// 근로자 의견 · 전파 끊김 · AI 멈춤)도 같이 걷었다. 폰 폭에 맞춰 아래에서 올라오는 창, 열려 있는 동안 뒤 앱 화면은 스크롤되지 않는다
function drawCtl() {
  const el = $('#ctl'); if (!el) return;
  el.innerHTML = `<div class="chd"><b>시연 조작판</b><button class="cb" data-c="close">닫기</button></div>
  <div class="cbtns"><a class="cb" href="index.html">역할 고르기</a><button class="cb" data-c="reset">처음 상태로</button></div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('#ctl [data-c]'); if (!b) return;
  if (b.dataset.c === 'close') { $('#ctl').remove(); return; }
  if (b.dataset.c === 'reset' && confirm('처음 상태로 되돌릴까요?')) { sessionStorage.clear(); DB.reset(); location.hash = '#/'; }
});

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
    // 낸 점검은 바로 확정된다 (2026-10-14 사용자 지시 — 운영자 제출 검사는 아직 정해진 게 아니라 뺐다. 전에는 st 'wait'로 들어가 운영자가 승인·반려했다)
    // 2026-10-29 사용자 지시: 공장에 보내기(toFac: false → 개선 관리 보낼 것)를 거치지 않는다 — 저장하면 바로 공장에 보이고 시정 중이 된다
    const ins = { id: 'i' + Date.now().toString(36), fid: d.fid, date: '9/17', by: d.by || '김지킴', team: d.team, ver: d.ver,
      result: d.result, st: 'ok', sentAt: '9/17', locked: true, items: d.items, sub: false, ...(d.kzWait ? { kzWait: true } : {}) };
    s.inspections.unshift(ins); settlePrev(s, ins);
  } else if (d.kind === 'recheck') {
    // 재점검 판정 (2026-10-13) — 항목마다 고쳐짐·안 고쳐짐을 원래 항목에 적고, 점검 결과를 지킴이가 고른 것으로 바꾼다
    const ins = s.inspections.find((i) => i.id === d.insId);
    if (!ins || !inRecheck(ins)) return;
    d.results.forEach((r) => {
      const it = ins.items.find((x) => x.id === r.itemId);
      if (it) (it.log = it.log || []).push({ t: 'recheck', at: '9/17', result: r.result, by: d.by, photo: !!r.photo, ...(r.why ? { why: r.why } : {}) });
    });
    // 반려 · 보류가 남아도 판정은 끝나고 결과 제출로 간다 (2026-10-30 사용자 지시 — 같은 날 개선 관리에 남게 했던 것을 되돌림.
    // 그 뒤 공장이 다시 고쳐 보내면 지킴이가 결과 제출의 제출 전 확인 개선내역에서 고친다)
    ins.final = { from: '재점검', at: '9/17', by: d.by, fixed: d.results.filter((r) => r.result === 'fixed').length, total: d.results.length };
    ins.result = d.result;
    ins.sub = false;  // 판정 뒤에는 제출할 것으로 (2026-10-26)
  }
}

// 예전 시제품이 등록한 서비스 워커가 남아 있으면 지운다
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
}

/* ---------- 사진 줄이기 · 올리기 — 지킴이 앱 카메라와 공장 웹 [고쳤어요]가 같이 쓴다 (2026-10-26 guard.js에서 옮김) ---------- */
// 영상의 한 장면이나 카메라 앱에서 받은 사진을 줄인다 — 서버에 올릴 때는 긴 변 1600px, 서버 없이 그림째 둘 때는 800px. x · y · w · h는 잘라 낼 범위
const camShrink = (src, w, h, x = 0, y = 0) => new Promise((ok) => {
  const r = Math.min(1, (DB.remote ? 1600 : 800) / Math.max(w, h)), c = document.createElement('canvas');
  c.width = Math.round(w * r); c.height = Math.round(h * r);
  c.getContext('2d').drawImage(src, x, y, w, h, 0, 0, c.width, c.height);
  c.toBlob((b) => ok({ b, url: URL.createObjectURL(b), w: c.width, h: c.height }), 'image/jpeg', 0.8);
});
async function photoSave(sh) {
  if (!DB.remote) return { src: await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(sh.b); }), w: sh.w, h: sh.h };
  const r = await fetch('api/photo', { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: sh.b });
  if (!r.ok) throw new Error('photo ' + r.status);
  return { src: (await r.json()).src, w: sh.w, h: sh.h };
}
