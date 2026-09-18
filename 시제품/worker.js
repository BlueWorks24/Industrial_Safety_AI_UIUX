// 근로자 앱 — 시안 W1~W8. 공장주의 초대로 들어온다 (시제품: 시험용 초대 코드).
// 서버 없이 열면 초대 단계 없이 김근로로 들어간다.
let ACC = null;                                    // 로그인한 근로자 { name, factory, area, lang }
let ME = '김근로';
const UI = { undo: null, timer: null, sheet: null, dlg: null, inv: null, noticeOrig: {},
  voice: { kind: 'danger', text: '', photo: false, anon: true } };

/* ---------- 이 기기에만 두는 설정 ---------- */
const pref = {
  get(k, d) { try { return localStorage.getItem('w.' + k) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('w.' + k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem('w.' + k); } catch (e) {} },
};
function seen(id) { try { return sessionStorage.getItem('seen-' + id) === '1'; } catch (e) { return false; } }
function markSeen(id) { try { sessionStorage.setItem('seen-' + id, '1'); } catch (e) {} }

function visibleAlarms(s) {
  // 인터넷이 끊긴 뒤 생긴 경보는 이 폰에 오지 못한다
  return s.alarms.filter((a) => SIM.live(a) && alarmFid(a) === ACC.factory && !(!s.net.worker && s.offlineSince.worker != null && a.start >= s.offlineSince.worker));
}
function attention(s) { return visibleAlarms(s).filter((a) => a.status === 'open' || a.status === 'remind'); }
function pendingAck(s, id) { return s.outbox.worker.find((m) => m.id === id); }
const myNotices = (s) => (s.notices || []).filter((n) => n.fid === ACC.factory);
const unreadN = (s) => myNotices(s).filter((n) => !n.readBy[ME]).length;
const pick = (o) => (o && (o[LANG] || o.ko)) || '';
const plain = (h) => h.replace(/<[^>]+>/g, ' ');

/* ---------- 조각 ---------- */
const langBtn = () => `<button class="lang" data-go="settings">${I('globe', 16)} ${LANGS.find((l) => l.id === LANG).name}</button>`;
// 앱 머리글(공장 이름 · 내 이름) + 위치 띠 — 웹과 같은 결
const bar = () => appBar(esc(FNAME(ACC.factory)), T('app.sub'), `<button class="me" data-go="me">${esc(ME)} ›</button>`);
const head = (title, go = '', end = '') => `<div class="apptop">${band(title, go, end)}${bar()}</div>`;
function endWord(a) {
  if (a.status !== 'ended') return T(a.acks.length ? 'end.liveAck' : 'end.liveNo');
  return T(a.endKind === 'noack' ? 'end.noack' : a.endKind === 'repair' ? 'end.repair' : 'end.ended');
}
function howMuch(a) {
  const d = SENSORS[a.key];
  if (d.kind === 'state') {
    return `<div><div class="lbl">${T('a.state')}</div><div class="states"><div class="st">${T('a.normal')}</div><div class="st on">${T('a.wet')}</div></div></div>`;
  }
  const pos = Math.min(95, 50 + (a.ratio - 1) * 22);
  const extra = ST(a, 'extra');
  return `<div><div class="lbl">${T('a.how')}</div>
    <div class="big">${a.status === 'remind' ? T('h.still') + ' · ' : ''}${esc(ST(a, 'more'))}</div>
    <div class="range"><div class="ok"></div><div class="now" style="left:${pos}%"></div></div>
    <div class="range-l"><span></span><span>${T('a.range')}</span><span></span><span>${T('a.nowmark')}</span></div>
    ${extra ? `<div class="small">${esc(extra)}</div>` : ''}</div>`;
}
function whatWhere(a) {
  const what = ST(a, 'what'), sub = ST(a, 'sub');
  return `<div><div class="lbl">${T('a.what')}</div><div class="big">${esc(ST(a, 'title'))}${what ? ' · ' + esc(what) : ''}</div>${sub ? `<div class="small">${esc(sub)}</div>` : ''}</div>
    <div><div class="lbl">${T('a.where')}</div><div class="big">${esc(ST(a, 'where'))}</div></div>`;
}

/* ---------- W8 처음 설치 ---------- */
function welcome() {
  return `${sbar()}<div class="scr"><div class="bd" style="gap:16px">
    <div class="center" style="margin-top:18px"><div class="applogo">⚠</div><div class="big">${T('ob.title')}</div></div>
    <div class="lbl center">${T('ob.lang')}${LANG === 'en' ? '' : ' · Language'}</div>
    <div class="langs">${LANGS.map((l) => `<button class="pick${l.id === LANG ? ' on' : ''}" data-act="lang" data-v="${l.id}">${l.name}</button>`).join('')}</div>
    <div class="q center" style="margin-top:6px"><div class="small ink">${T('ob.how')}</div></div>
  </div><div class="ft">
    <button class="btn" data-act="scan">${I('camera', 22)} ${T('ob.scan')}</button>
    <div class="small center">${T('ob.noinvite')}</div>
    <a class="btn ghost sm" href="web.html">${T('ob.owner')} ›</a>
  </div></div>${UI.sheet === 'scan' ? scanSheet() : ''}`;
}
function scanSheet() {
  const codes = [['DS-KIM', '김근로 · 대성정밀'], ['DS-NGUYEN', 'Nguyen Van A · 대성정밀 (Tiếng Việt)'], ['DS-USED', '이미 쓴 초대 (오류 화면 보기)'], ['DS-OLD', '기간 지난 초대 (오류 화면 보기)']];
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="mid">${T('ob.pick')}</div>
    <div class="small">실제 앱에서는 카메라로 QR을 찍어요. 시제품에서는 아래에서 골라요.</div>
    ${codes.map(([c, n]) => `<button class="q" data-act="pickInvite" data-code="${c}"><div class="t">${n}</div><div class="small">${c}</div></button>`).join('')}
    <button class="btn ghost" data-act="closeSheet">${T('close')}</button>
  </div>`;
}
function joinScreen(code) {
  if (!UI.inv || UI.inv.code !== code) {
    UI.inv = { code };
    fetch('api/invite?code=' + encodeURIComponent(code)).then((r) => r.json()).then((j) => { UI.inv = { code, data: j }; render(); })
      .catch(() => { UI.inv = { code, data: { status: 'none' } }; render(); });
  }
  if (!UI.inv.data) return `${sbar()}<div class="scr"><div class="bd"><div class="donemark">${I('clock', 38)}</div></div></div>`;
  const d = UI.inv.data;
  if (d.status !== 'open') return inviteError(d.status);
  return `${sbar()}<div class="scr"><div class="bd" style="gap:14px">
    <div class="donemark" style="background:var(--brand-l);color:var(--brand)">${I('factory', 38)}</div>
    <div class="center big">${T('inv.title')}</div>
    <div class="stat" style="flex-direction:column;align-items:stretch;gap:12px">
      <div><div class="lbl">${T('inv.factory')}</div><div class="big" style="font-size:24px">${esc(FNAME(d.factory))}</div></div>
      <div><div class="lbl">${T('inv.name')}</div><div class="mid">${esc(d.name)}</div></div>
      <div><div class="lbl">${T('inv.area')}</div><div class="mid">${esc(AREA(d.area) || '—')}</div></div>
    </div>
    <div class="small center">${T('inv.fix')}</div>
  </div><div class="ft">
    <button class="btn" data-act="accept" data-code="${code}">${T('inv.ok')}</button>
    <button class="btn ghost" data-go="">${T('inv.wrong')}</button>
  </div></div>`;
}
function inviteError(status) {
  const key = status === 'used' ? 'err.used' : status === 'expired' ? 'err.expired' : 'err.none';
  return `${sbar()}<div class="scr"><div class="bd" style="gap:14px">
    <div class="donemark" style="border-style:dashed">${I('alert', 38)}</div>
    <div class="center big">${T(key)}</div>
    <div class="q"><div class="small ink">${T('err.body')}</div></div>
    <div class="warnbar"><span class="ic">${I('user', 22)}</span><div class="small ink"><b>${T('err.who')}</b></div></div>
  </div><div class="ft"><button class="btn" data-go="">${T('err.back')}</button></div></div>`;
}
function notifAsk() {
  return `${sbar()}<div class="scr"><div class="bd" style="gap:14px">
    <div class="donemark" style="background:var(--brand-l);color:var(--brand)">${I('bell', 38)}</div>
    <div class="center big">${T('nt.title')}</div>
    <div class="center small ink">${T('nt.body')}</div>
    <div class="warnbar"><span class="ic">${I('info', 22)}</span><div class="small ink">${T('nt.tip')}</div></div>
  </div><div class="ft">
    <button class="btn" data-act="notifOn">${T('nt.on')}</button>
    <button class="btn ghost" data-act="notifLater">${T('nt.later')}</button>
    <div class="small center">${T('nt.laterWarn')}</div>
  </div></div>`;
}

/* ---------- W1 홈 ---------- */
function monitor(s, vis) {
  // 센서 감시 줄 — 값은 보여 주지 않고 상태만 (근로자는 센서 값을 보지 않는다)
  return `<div class="mon">${SITE_SENSORS(ACC.factory).map((k) => {
    const a = vis.find((x) => x.key === k);
    const ss = SIM.sensor(s, k).state;
    const st = ss !== 'watch' ? ss : a ? (a.status === 'watch' ? 'acked' : 'abn') : 'ok';
    return `<div class="ms ${st}">${I(iconOf(k), 20)}<b>${esc(SNAME(k, true))}</b><span><i></i>${T('mon.' + st)}</span></div>`;
  }).join('')}</div>`;
}
function feed(s) {
  const items = [];
  myNotices(s).forEach((n) => items.push({ d: n.date, ic: 'megaphone', t: n.readBy[ME] ? T('tile.notice') : T('feed.notice'), sub: pick(n.title), go: 'notice/' + n.id, fresh: !n.readBy[ME] }));
  s.alarms.filter((a) => !SIM.live(a) && alarmFid(a) === ACC.factory).forEach((a) => {
    const k = a.acks[0];
    items.push({ d: a.day, ic: iconOf(a.key), t: k ? T('feed.alarm', { what: ST(a, 'title'), who: k.by === ME ? plain(T('w.me')) : k.by }) : a.endKind === 'repair' ? T('feed.alarmRepair', { what: ST(a, 'title') }) : T('feed.alarmNo', { what: ST(a, 'title') }), sub: endWord(a), go: 'history' });
  });
  (s.voices || []).filter((v) => v.author === ME && v.reply).forEach((v) => items.push({ d: v.replyAt, ic: 'message', t: T('feed.reply'), sub: v.text, go: 'voice/mine' }));
  const key = (d) => { const [m, dd] = d.split('/').map(Number); return m * 100 + dd; };
  items.sort((a, b) => key(b.d) - key(a.d));
  return `<div class="sect"><h2>${T('feed.t')}</h2>${items.slice(0, 4).map((x) => `<button class="frow" data-go="${x.go}">
      <span class="fic">${I(x.ic, 18)}</span><span class="ftx"><b>${x.t}${x.fresh ? `<span class="cnt">${T('n.new')}</span>` : ''}</b><small>${esc(x.sub)}</small></span><span class="fd">${x.d}</span></button>`).join('')}</div>`;
}
function home(s) {
  const vis = visibleAlarms(s);
  const watching = vis.filter((a) => a.status === 'watch');
  const notifOff = pref.get('notif') !== 'on';
  const fname = FNAME(ACC.factory);
  let top = '';
  // 겹칠 때 순서: 알림 꺼짐 · 인터넷 끊김 → 경보 → 이상 없음 (시안 W1)
  if (notifOff) {
    top += `<div class="warnbar danger"><span class="ic">${I('bellOff', 24)}</span><div style="flex:1"><div class="mid">${T('h.off.t')}</div>
      <div class="small ink">${T('h.off.b')}</div><button class="btn sm red" style="margin-top:8px" data-act="notifOn">${T('h.off.go')}</button></div></div>`;
  }
  if (!s.net.worker) {
    top += `<div class="warnbar"><span class="ic">${I('wifiOff', 24)}</span><div><div class="mid">${T('h.net.t')}</div><div class="small ink">${T('h.net.b')}</div></div></div>
      <div class="hero off"><span class="hk">${I('help', 30)}</span><div><div class="ht">${T('h.last')}</div><div class="hs">${watching.length ? T('h.alarms', { n: watching.length }) : T('h.lastOk', { t: hm(s.offlineSince.worker) })}</div></div></div>`;
  } else if (watching.length) {
    const a = watching[0];
    top += `<div class="hero bad"><span class="hk">${I('alert', 30)}</span><div><div class="ht">${T('h.alarms', { n: watching.length })} · ${T('h.still')}</div>
      <div class="hs">${esc(ST(a, 'title'))} · ${a.snoozes > 0 ? T('h.remindAt', { t: hm(a.remindAt) }) : T('h.acked', { t: hm(a.remindAt) })}</div></div></div>
      <button class="btn red" data-go="alarm/${a.id}">${T('h.see')}</button>`;
  } else if (SITE_SENSORS(ACC.factory).some((k) => SIM.sensor(s, k).state === 'unknown')) {
    // 값이 안 오는 센서가 있으면 "이상 없음"이라고 말하지 않는다 (시안 W1-마)
    top += `<div class="hero part"><span class="hk">${I('help', 30)}</span><div><div class="ht">${T('h.partial')}</div><div class="hs">${T('h.partialSub', { t: hm(s.clock) })}</div></div></div>`;
  } else {
    top += `<div class="hero ${notifOff ? 'off' : 'ok'}"><span class="hk">${I('checkCircle', 30)}</span><div><div class="ht">${T('h.ok')}</div><div class="hs">${T('h.checked', { f: FACTORIES[ACC.factory].name, t: hm(s.clock) })}</div></div></div>`;
  }
  const un = unreadN(s);
  return `${sbar(s.net.worker ? '' : '📵')}<div class="scr"><div class="bd">
    <div class="apptop"><div class="head"><span class="hm">${I('home', 19)}</span><span class="crumb">${T('home.t')}</span><span class="end small">${ACC.area ? esc(AREA(ACC.area)) : ''}</span></div>${bar()}</div>
    <div class="today"><div><b>${T('today.date')}</b><span>${T('today.shift')}${ACC.area ? ' · ' + esc(AREA(ACC.area)) : ''}</span></div>
      ${s.net.worker && !notifOff ? `<span class="live"><i></i>${T(pref.get('sound', 'sv') === 'v' ? 'live.v' : 'live.on')}</span>` : ''}</div>
    ${top}
    ${s.net.worker ? `<div class="sect"><h2>${T('mon.t')}</h2>${monitor(s, vis)}
      ${SITE_SENSORS(ACC.factory).some((k) => SIM.sensor(s, k).state === 'unknown') ? `<p class="note warn2">${I('help', 14)} ${T('h.unknownNote')}</p>` : ''}
      ${SITE_SENSORS(ACC.factory).some((k) => SIM.sensor(s, k).state === 'repair') ? `<p class="note warn2">${I('tool', 14)} ${T('h.repairNote')}</p>` : ''}
      <p class="note">${T('mon.note')}</p></div>` : ''}
    <div class="tiles">
      <button class="tile" data-go="history"><span class="ic">${I('alert', 24)}</span><b>${T('tile.hist')}</b></button>
      <button class="tile" data-go="notice"><span class="ic">${I('megaphone', 24)}</span><b>${T('tile.notice')}${un ? `<span class="cnt">${T('new', { n: un })}</span>` : ''}</b></button>
      <button class="tile" data-go="voice"><span class="ic">${I('message', 24)}</span><b>${T('tile.voice')}</b></button>
      <button class="tile" data-go="settings"><span class="ic">${I('sliders', 24)}</span><b>${T('tile.set')}</b></button>
    </div>
    ${feed(s)}
    <div class="proto">시제품 · 가상 데이터</div>
  </div></div>`;
}

/* ---------- W2·W3 경보 ---------- */
function alarmList(s, list) {
  return `${sbar('📳')}<div class="scr"><div class="bd">
    <div class="head alarmhead"><span class="big">${T('a.list', { n: list.length })}</span><span class="end small">${T('a.unhandled', { n: list.length })}</span></div>
    <div class="small">${T('a.listSub')}</div>
    ${list.map((a) => `<button class="q alarmcard" data-go="alarm/${a.id}">
      <div class="rowx"><span class="mid">${I('alert', 18)} ${a.status === 'remind' ? T('h.still') + ' · ' : ''}${esc(ST(a, 'title'))}</span><span class="small">${hm(a.start)}</span></div>
      <div class="small">${esc(ST(a, 'where'))}${a.ratio ? ' · ' + T('a.x', { r: a.ratio }) : ''} · ${T('a.tap')}</div></button>`).join('')}
  </div></div>`;
}
function alarmScreen(s, a) {
  const k = SIM.lastAck(a);
  if (a.status === 'watch') return k && k.by !== ME ? othersAcked(s, a) : watchScreen(s, a);
  if (a.status === 'ended') {
    return `${sbar()}<div class="scr"><div class="bd"><div class="donemark">${I('check', 40)}</div>
      <div class="center big">${T('e.t')}</div><div class="center small">${T('e.sub', { what: ST(a, 'title'), t: hm(a.endedAt) })}</div></div>
      <div class="ft"><button class="btn ghost" data-go="">${T('home')}</button></div></div>`;
  }
  if (a.status === 'remind') {
    const esc2 = a.snoozes >= SNOOZE_LIMIT;
    return `${sbar('📳')}<div class="scr"><div class="bd" style="gap:14px">
      <div class="alarm"><span class="icon">${I('alert', 28)}</span><div><div class="big">${T('h.still')}</div><div class="small">${T('a.after', { n: s.clock - a.acks[0].at })}${a.snoozes ? ' · ' + T('a.snoozed', { n: a.snoozes }) : ''}</div></div>${langBtn()}</div>
      ${whatWhere(a)}${howMuch(a)}
      ${esc2 ? `<div class="warnbar"><span class="ic">${I('megaphone', 22)}</span><div class="small"><b class="ink">${T('a.escT')}</b><br>${T('a.escB')}</div></div>` : ''}
    </div><div class="ft">
      <button class="btn" data-act="ack" data-id="${a.id}">${T('a.reack')}</button>
      ${esc2 ? '' : `<button class="btn ghost" data-act="snooze" data-id="${a.id}">${T('a.snooze')}</button>
      <div class="small center">${T('a.snoozeLeft', { n: SNOOZE_LIMIT - a.snoozes - 1 })}</div>`}
    </div></div>`;
  }
  return `${sbar('📳')}<div class="scr"><div class="bd" style="gap:16px">
    <div class="alarm"><span class="icon">${I('alert', 28)}</span><div><div class="big">${T('a.abn')}</div><div class="small">${hm(a.start)} · ${s.clock - a.start < 2 ? T('a.justnow') : T('a.minAgo', { n: s.clock - a.start })}</div></div>${langBtn()}</div>
    ${whatWhere(a)}${howMuch(a)}
  </div><div class="ft"><button class="btn" style="min-height:68px;font-size:22px" data-act="ack" data-id="${a.id}">${T('a.ack')}</button></div></div>`;
}
function watchScreen(s, a) {
  const k = SIM.lastAck(a);
  return `${sbar()}<div class="scr"><div class="bd">
    <div class="alarm watch"><span class="icon">${I('alert', 28)}</span><div><div class="big">${T('w.title')}</div><div class="small">${T('w.start', { t: hm(a.start) })}${a.snoozes ? ' · ' + T('a.snoozed', { n: a.snoozes }) : ''}</div></div></div>
    <div><div class="lbl">${T('w.ww')}</div><div class="big">${esc(ST(a, 'title'))}</div><div class="mid">${esc(ST(a, 'where'))}</div></div>
    <div class="stat"><span class="ck">${I('check', 26)}</span><div><div class="mid">${T(k.re ? 'w.reby' : 'w.by', { who: k.by === ME ? plain(T('w.me')) : k.by, t: hm(k.at) })}</div><div class="small">${T('w.watch')}</div></div></div>
    <div class="small">${T('w.remind', { t: hm(a.remindAt) })}</div>
  </div><div class="ft"><button class="btn ghost" data-go="">${T('home')}</button></div></div>`;
}
function othersAcked(s, a) {
  const k = SIM.lastAck(a);
  return `${sbar()}<div class="scr"><div class="bd" style="gap:12px">
    <div class="alarm watch"><span class="icon">${I('alert', 28)}</span><div><div class="big">${T('w.title')}</div><div class="small">${T('w.start', { t: hm(a.start) })}</div></div></div>
    <div><div class="lbl">${T('w.ww')}</div><div class="big">${esc(ST(a, 'title'))}</div><div class="mid">${esc(ST(a, 'where'))}</div></div>
    <div class="stat"><span class="ck">${I('check', 26)}</span><div><div class="mid">${T(k.re ? 'w.reby' : 'w.by', { who: k.by, t: hm(k.at) })}</div><div class="small">${T('w.watch')}</div></div></div>
    <div class="small">${T('w.remind', { t: hm(a.remindAt) })}</div>
  </div><div class="ft"><button class="btn ghost" data-act="seen" data-id="${a.id}">${T('close')}</button></div></div>`;
}
function doneScreen(s, a) {
  const u = UI.undo && UI.undo.id === a.id ? UI.undo : null;
  const left = u ? Math.max(0, Math.ceil((u.until - Date.now()) / 1000)) : 0;
  const k = SIM.lastAck(a);
  return `${sbar()}<div class="scr"><div class="bd">
    <div class="donemark">${I('check', 40)}</div>
    <div class="center big">${T(k && k.re ? 'd.resent' : 'd.sent')}</div>
    <div class="center small">${T('d.to', { t: hm(s.clock) })}</div>
    <div class="center small ink" style="margin-top:6px">${T('d.rule', { t: hm(a.remindAt || s.clock) })}</div>
    ${left > 0 ? `<div class="undo" style="margin-top:auto"><div class="row"><span class="mid">${T('d.wrong')}</span><span class="sec" style="margin-left:auto" id="usec">${left}</span><span class="small">${T('d.sec')}</span></div>
      <div class="bar5"><i id="ubar" style="width:${(left / 5) * 100}%"></i></div>
      <button class="btn ghost" data-act="undo" data-id="${a.id}">${T('d.undo')}</button></div>` : ''}
  </div><div class="ft"><button class="btn ghost" data-act="closeDone">${T('close')}</button></div></div>`;
}
function unsentScreen(s, a) {
  return `${sbar('📵')}<div class="scr"><div class="bd">
    <div class="donemark" style="border-style:dashed">${I('clock', 38)}</div>
    <div class="center big">${T('u.t')}</div>
    <div class="center small ink" style="margin-top:6px">${T('u.b')}</div>
    <div class="warnbar" style="margin-top:12px"><span class="ic">${I('megaphone', 22)}</span><div class="small ink"><b>${T('u.tell')}</b></div></div>
  </div><div class="ft"><button class="btn" data-act="retry">${T('u.retry')}</button><button class="btn ghost" data-go="">${T('home')}</button></div></div>`;
}

/* ---------- W4 받은 경보 ---------- */
function history(s) {
  const rows = s.alarms.filter((a) => alarmFid(a) === ACC.factory && (!SIM.live(a) || visibleAlarms(s).includes(a)));
  return `${sbar()}<div class="scr"><div class="bd" style="gap:8px">
    ${head(T('tile.hist'), '')}${pageIntro(T('tile.hist'), T('i.hist'))}
    ${rows.map((a) => {
      const k = SIM.lastAck(a);
      const who = k ? T('hi.by', { who: k.by === ME ? `${ME} ${plain(T('hi.me'))}` : k.by }) + ' · ' : '';
      return `<button class="q${SIM.live(a) ? ' now' : ''}" data-go="hist/${a.id}"><div class="rowx"><span class="t">${SIM.live(a) ? '● ' + T('hi.live') + ' · ' : ''}${esc(ST(a, 'title'))}</span><span class="small">${a.day} ${hm(a.start)} ${I('chevron', 16)}</span></div>
        <div class="small">${who}<b class="ink">${endWord(a)}</b></div></button>`;
    }).join('')}
    <div class="small" style="margin-top:auto">${T('hi.note')}</div>
  </div></div>`;
}

// W4-나 지난 경보 자세히 — 근로자는 센서 값을 보지 않는다 (무엇이·어디서·언제·어떻게 끝났는지·누가 조치했는지)
function histOne(s, id) {
  const a = s.alarms.find((x) => x.id === id && alarmFid(x) === ACC.factory);
  if (!a) return history(s);
  const what = ST(a, 'what'), mins = a.endedAt != null ? a.endedAt - a.start : null;
  return `${sbar()}<div class="scr"><div class="bd">
    ${head(T('tile.hist'), 'history')}
    <div><div class="lbl">${T('a.what')}</div><div class="big">${esc(ST(a, 'title'))}${what ? ' · ' + esc(what) : ''}</div></div>
    <div><div class="lbl">${T('a.where')}</div><div class="big">${esc(ST(a, 'where'))}</div></div>
    <div><div class="lbl">${T('hd.when')}</div><div class="big">${a.day} ${hm(a.start)}${a.endedAt != null ? ' ~ ' + hm(a.endedAt) : ''}</div>${mins != null ? `<div class="small">${T('hd.took', { n: mins })}</div>` : ''}</div>
    <div><div class="lbl">${T(SIM.live(a) ? 'hd.now' : 'hd.how')}</div><div class="big">${endWord(a)}</div></div>
    <div class="lbl">${T('hd.who')}</div>
    ${a.acks.length ? a.acks.map((k) => `<div class="q"><div class="rowx"><span class="t">${esc(k.by)}${k.by === ME ? ' ' + plain(T('hi.me')) : ''}</span><span class="small">${hm(k.at)}</span></div>
      <div class="small">${T(k.re ? 'hd.re' : 'hd.ack')}</div></div>`).join('')
      : `<div class="q"><div class="small">${T('hd.none')}</div></div>`}
    ${a.snoozes ? `<div class="small">${T('hd.snooz', { n: a.snoozes })}</div>` : ''}
    ${a.escalated ? `<div class="small">${T('a.escT')}</div>` : ''}
    <div class="small" style="margin-top:auto">${T('hd.noval')}</div>
  </div></div>`;
}

/* ---------- W5 안전 공지 ---------- */
function notices(s) {
  const list = myNotices(s), un = unreadN(s);
  return `${sbar()}<div class="scr"><div class="bd">
    ${head(T('tile.notice'))}${pageIntro(T('tile.notice'), T('i.notice'))}
    <div class="lbl">${un ? T('n.unread', { n: un }) : T('n.all')}</div>
    ${list.map((n) => { const r = n.readBy[ME]; return `<button class="q${r ? ' past' : ' now'}" data-go="notice/${n.id}">
      <div class="rowx"><span class="t">${esc(pick(n.title))}</span>${r ? `<span class="small">✓ ${T('n.read')}</span>` : `<span class="cnt">${T('n.new')}</span>`}</div>
      <div class="small">${n.date} · ${esc(n.by)}${n.ra ? ' · ' + esc(n.ra) : ''}</div></button>`; }).join('')}
  </div></div>`;
}
function notice(s, id) {
  const n = myNotices(s).find((x) => x.id === id);
  if (!n) return notices(s);
  const r = n.readBy[ME];
  const tr = LANG !== 'ko';
  const orig = tr && UI.noticeOrig[id];
  const body = esc(orig ? n.body.ko : pick(n.body)).replace(/\n/g, '<br>');
  return `${sbar()}<div class="scr"><div class="bd">
    ${head(T('tile.notice'), 'notice')}
    <div class="big" style="font-size:23px">${esc(orig ? n.title.ko : pick(n.title))}</div>
    <div class="small">${n.date} · ${esc(n.by)}${n.ra ? ' · ' + esc(n.ra) : ''}</div>
    ${tr ? `<div class="aitag"><span>${I('sparkle', 15)} ${T('n.ai')}</span><button class="link" data-act="orig" data-id="${id}">${orig ? T('n.trans') : T('n.orig')}</button></div>` : ''}
    <div class="q" style="font-size:17px;line-height:1.7">${body}</div>
    ${tr ? `<button class="link small" data-act="badTr" data-id="${id}">${I('flag', 15)} ${T('n.bad')}</button>` : ''}
  </div><div class="ft">
    ${r ? `<div class="bell" style="align-self:center">${T('n.acked', { d: r.at })}</div>` : `<button class="btn" data-act="readN" data-id="${id}">${T('n.ack')}</button><div class="small center">${T('n.ackNote')}</div>`}
  </div></div>`;
}

/* ---------- W6 의견 보내기 ---------- */
function voiceForm(s) {
  const v = UI.voice;
  const kinds = ['danger', 'better', 'etc'];
  return `${sbar()}<div class="scr"><div class="bd">
    ${head(T('tile.voice'), '')}${pageIntro(T('tile.voice'), T('i.voice'))}<button class="q" data-go="voice/mine"><div class="rowx"><span class="t" style="display:flex;align-items:center;gap:8px">${I('send', 18)} ${T('v.mine')}</span><span class="small">${I('chevron', 18)}</span></div></button>
    <div class="warnbar"><span class="ic">${I('alert', 22)}</span><div class="small ink">${T('v.urgent')}</div></div>
    <div class="lbl">${T('v.kind')}</div>
    <div class="seg">${kinds.map((k) => `<button class="${v.kind === k ? 'on' : ''}" data-act="vKind" data-v="${k}">${T('v.k.' + k)}</button>`).join('')}</div>
    <div class="lbl">${T('v.text')}</div>
    <div class="small">${T('v.langNote')}</div>
    <textarea class="input" id="vText" placeholder="${plain(T('v.ph'))}">${esc(v.text)}</textarea>
    <button class="btn ghost sm" data-act="vPhoto">${T(v.photo ? 'v.photoOn' : 'v.photo')}</button>
    <div class="lbl">${T('v.name')}</div>
    <div class="seg"><button class="${!v.anon ? 'on' : ''}" data-act="vAnon" data-v="0">${T('v.show')}</button><button class="${v.anon ? 'on' : ''}" data-act="vAnon" data-v="1">${T('v.hide')}</button></div>
    ${v.anon ? `<div class="small">${T('v.hideWarn')}</div>` : ''}
  </div><div class="ft"><button class="btn" data-act="vSend">${T('v.send')}</button></div></div>
  ${UI.dlg === 'voice' ? `<div class="ov" data-act="closeDlg"></div><div class="dlg">
    <div class="mid" style="font-size:19px">${T('v.cf.t')}</div>
    <div class="q" style="box-shadow:inset 0 0 0 1.5px var(--line)"><div class="small">${T('v.k.' + v.kind)} · ${T(v.anon ? 'v.anon' : 'v.named')}${v.photo ? ' · 📷' : ''}</div><div class="t">${esc(v.text)}</div></div>
    <div class="small ink"><b>${T('v.cf.lock')}</b></div>
    <button class="btn" data-act="vConfirm">${T('v.cf.send')}</button>
    <button class="btn ghost" data-act="closeDlg">${T('v.cf.edit')}</button></div>` : ''}`;
}
function voiceMine(s) {
  const mine = (s.voices || []).filter((x) => x.author === ME && x.fid === ACC.factory);
  const st = T('v.st');
  return `${sbar()}<div class="scr"><div class="bd">
    ${head(T('v.mine'), 'voice')}
    ${mine.map((x) => {
      const step = x.done ? 3 : x.reply ? 2 : x.readAt ? 1 : 0;
      const replyTx = x.reply && LANG !== 'ko' ? (x.replyTx && x.replyTx[LANG]) : null;
      return `<div class="q${step === 2 ? ' now' : ''}">
        <div class="rowx"><span class="t">${esc(x.text)}</span>${step === 2 ? `<span class="cnt">${esc(st[2])}</span>` : ''}</div>
        <div class="small">${x.date} · ${T('v.k.' + x.kind)} · ${T(x.anon ? 'v.anon' : 'v.named')}</div>
        <div class="steps">${st.map((w, i) => `<span class="${i <= step ? 'on' : ''}">${esc(w)}</span>`).join('')}</div>
        ${x.reply ? `<div class="reply"><b>${T('v.reply')}</b> · ${x.replyAt}<br>${esc(replyTx || x.reply)}
          ${replyTx ? `<div class="aitag" style="margin-top:6px"><span>${I('sparkle', 15)} ${T('n.ai')}</span></div><div class="small">${T('n.orig')}: ${esc(x.reply)}</div>` : ''}</div>` : ''}
      </div>`;
    }).join('') || `<div class="stat"><div class="mid">${T('v.none')}</div></div>`}
    <button class="add" data-go="voice">${T('v.write')}</button>
  </div></div>`;
}

/* ---------- W7 알림·언어 · 내 정보 ---------- */
function settings(s) {
  const on = pref.get('notif') === 'on';
  const sound = pref.get('sound', 'sv'), na = pref.get('nalert', '1');
  return `${sbar()}<div class="scr"><div class="bd">
    ${head(T('tile.set'))}${pageIntro(T('tile.set'), T('i.set'))}
    <div class="lbl">${T('s.alarm')}</div>
    <div class="bell ${on ? '' : 'off'}">${T(on ? 's.alarmOn' : 's.alarmOff')}</div>
    ${on ? `<div class="small">${T('s.alarmNote')}</div>` : `<button class="btn sm red" data-act="notifOn">${T('h.off.go')}</button>`}
    <div class="lbl">${T('s.when')}</div>
    <div class="seg"><button class="${sound === 'sv' ? 'on' : ''}" data-act="sound" data-v="sv">${T('s.sv')}</button><button class="${sound === 'v' ? 'on' : ''}" data-act="sound" data-v="v">${T('s.v')}</button></div>
    <div class="lbl">${T('s.notice')}</div>
    <div class="seg"><button class="${na === '1' ? 'on' : ''}" data-act="nalert" data-v="1">${T('s.recv')}</button><button class="${na === '0' ? 'on' : ''}" data-act="nalert" data-v="0">${T('s.norecv')}</button></div>
    <div class="lbl">${T('s.lang')}</div>
    ${LANGS.map((l) => `<button class="pick left${l.id === LANG ? ' on' : ''}" data-act="lang" data-v="${l.id}">${l.name}</button>`).join('')}
    <div class="small">${T('s.langNote')}</div>
  </div></div>`;
}
function me(s) {
  return `${sbar()}<div class="scr"><div class="bd">
    ${head(T('m.title'))}${pageIntro(T('m.title'), '')}
    <div class="stat"><span class="ck" style="background:var(--brand-l);color:var(--brand)">${I('user', 26)}</span><div><div class="big" style="font-size:22px">${esc(ME)}</div>
      <div class="small">${esc(FNAME(ACC.factory))} · ${T('m.role')}${ACC.area ? ' · ' + esc(AREA(ACC.area)) : ''}</div></div></div>
    <button class="q" data-go="settings"><div class="rowx"><span class="t">${T('s.lang')}</span><span class="small">${LANGS.find((l) => l.id === LANG).name} ›</span></div></button>
    <button class="q" data-go="settings"><div class="rowx"><span class="t">${T('s.alarm')}</span><span class="small">${pref.get('notif') === 'on' ? I('bell', 16) : I('bellOff', 16)} ›</span></div></button>
    <div class="small">${T('m.fix')}</div>
    <div class="small">${T('m.phone')}<span class="hyp">가설</span></div>
    <div class="lbl">${T('m.help')}</div>
    <div class="help">
      <a class="hrow" href="tel:010-0000-0000"><span class="hic">${I('phone', 20)}</span><div><b>${T('m.helpBoss')} · ${T('m.boss')}</b><div class="small">박대표 · 010-0000-0000 (가상)</div></div></a>
      <a class="hrow" href="tel:031-000-0000"><span class="hic">${I('tool', 20)}</span><div><b>${T('m.helpApp')}</b><div class="small">031-000-0000 (가상) · ${T('m.hours')}</div></div></a>
    </div>
    <button class="btn ghost sm danger" style="margin-top:12px" data-act="askLogout">${T('m.logout')}</button>
    <div class="small center">${T('m.ver')}</div>
  </div></div>
  ${UI.dlg === 'logout' ? `<div class="ov" data-act="closeDlg"></div><div class="dlg">
    <div class="mid" style="font-size:19px">${T('m.logoutQ')}</div>
    <div class="small ink">${T('m.logoutB')}</div>
    <button class="btn" data-act="closeDlg">${T('m.stay')}</button>
    <button class="btn ghost danger" data-act="logout">${T('m.logout')}</button></div>` : ''}`;
}

/* ---------- 그리기 ---------- */
let lastAttention = '';
function render() {
  const s = DB.s, p = R.path();
  let html;
  // 들어오기 전 (W8)
  if (!ACC) return paint(p[0] === 'join' && p[1] ? joinScreen(p[1]) : welcome());
  if (pref.get('notif') == null) return paint(notifAsk());

  const att = attention(s);
  const sig = att.map((a) => a.id + a.status + a.acks.length).join();
  if (sig && sig !== lastAttention) {
    buzz([400, 150, 400, 150, 400]);
    if (pref.get('sound', 'sv') === 'sv' && pref.get('notif') === 'on') beep();
  }
  lastAttention = sig;

  const todo = att.filter((a) => !pendingAck(s, a.id));
  if (p[0] === 'done' && SIM.get(s, p[1])) html = doneScreen(s, SIM.get(s, p[1]));
  else if (p[0] === 'unsent' && SIM.get(s, p[1])) {
    if (!pendingAck(s, p[1])) { R.go('done/' + p[1]); return; }
    html = unsentScreen(s, SIM.get(s, p[1]));
  } else if (todo.length && !(p[0] === 'alarm' && todo.some((a) => a.id === p[1]))) {
    // 조치 안 된 경보가 있으면 경보 화면이 먼저 뜬다 — 닫기·홈 가기 없음 (시안 15차 E40)
    html = todo.length > 1 ? alarmList(s, todo) : alarmScreen(s, todo[0]);
  } else if (p[0] === 'alarm' && SIM.get(s, p[1])) {
    const a = SIM.get(s, p[1]);
    html = pendingAck(s, a.id) ? unsentScreen(s, a) : alarmScreen(s, a);
  } else if (p[0] === 'hist' && p[1]) html = histOne(s, p[1]);
  else if (p[0] === 'history') html = history(s);
  else if (p[0] === 'notice' && p[1]) html = notice(s, p[1]);
  else if (p[0] === 'notice') html = notices(s);
  else if (p[0] === 'voice' && p[1] === 'mine') html = voiceMine(s);
  else if (p[0] === 'voice') html = voiceForm(s);
  else if (p[0] === 'settings') html = settings(s);
  else if (p[0] === 'me') html = me(s);
  else {
    // 다른 사람이 조치한 경보를 처음 보면 한 번 알려 준다 (W2-바)
    const other = visibleAlarms(s).find((a) => a.status === 'watch' && SIM.lastAck(a).by !== ME && !seen(a.id + a.acks.length));
    html = other ? othersAcked(s, other) : home(s);
  }
  paint(html);
}
let lastHash = null;
function paint(html) {
  const f = document.activeElement && document.activeElement.id;
  $('#app').innerHTML = html;
  // 화면이 바뀔 때만 나타나는 움직임 (데이터가 새로 와서 다시 그릴 때는 없음)
  if (location.hash !== lastHash) { const sc = $('#app .scr'); if (sc) sc.classList.add('enter'); lastHash = location.hash; }
  const el = f && $('#' + f);
  if (el) { el.focus(); if (el.setSelectionRange && el.value != null) el.setSelectionRange(el.value.length, el.value.length); }
}

const ACTS = {
  lang({ v }) { setLang(v); pref.set('langChosen', '1'); render(); },
  scan() { UI.sheet = 'scan'; render(); },
  pickInvite({ code }) { UI.sheet = null; R.go('join/' + code); },
  closeSheet() { UI.sheet = null; render(); },
  closeDlg() { UI.dlg = null; render(); },
  async accept({ code }) {
    const r = await fetch('api/invite/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    const j = await r.json();
    if (!r.ok) { UI.inv = { code, data: j }; render(); return; }
    setAccount(j);
    // 명단에 없으면 올린다 (공장주 웹의 근로자 명단과 이어짐)
    DB.act((s) => { s.workers = s.workers || []; if (!s.workers.some((w) => w.name === j.name && (w.fid || 'daesung') === j.factory)) s.workers.push({ name: j.name, fid: j.factory, lang: j.lang || 'ko', notif: false, joined: '2026-09-17', area: j.area || '' }); });
    // 초대에 적힌 언어로 연다 — 첫 화면에서 직접 고른 언어가 있으면 그것을 둔다
    if (j.lang && pref.get('langChosen') !== '1') setLang(j.lang);
    pref.del('notif');
    UI.inv = null;
    R.go('');
    render();
  },
  async notifOn() {
    // 실제 앱이면 휴대폰이 허용 창을 띄운다. 시제품은 브라우저가 막아도 켠 것으로 본다 (시험 편의)
    try { if ('Notification' in window && isSecureContext && Notification.permission === 'default') Notification.requestPermission().catch(() => {}); } catch (e) {}
    pref.set('notif', 'on');
    DB.act((s) => { const w = (s.workers || []).find((x) => x.name === ME); if (w) w.notif = true; });
    toast('🔔 ' + plain(T('h.bell')));
    R.go(''); render();
  },
  notifLater() { pref.set('notif', 'off'); DB.act((s) => { const w = (s.workers || []).find((x) => x.name === ME); if (w) w.notif = false; }); R.go(''); render(); },
  ack({ id }) {
    if (!DB.s.net.worker) {
      DB.act((s) => s.outbox.worker.push({ type: 'ack', id, by: ME, at: s.clock }));
      R.go('unsent/' + id); return;
    }
    DB.act((s) => SIM.ack(s, id, ME));
    UI.undo = { id, until: Date.now() + 5000 };
    clearInterval(UI.timer);
    UI.timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((UI.undo.until - Date.now()) / 1000));
      const el = $('#usec'), bar = $('#ubar');
      if (el) el.textContent = left;
      if (bar) bar.style.width = ((UI.undo.until - Date.now()) / 50) + '%';
      if (Date.now() >= UI.undo.until) { clearInterval(UI.timer); UI.undo = null; render(); }
    }, 200);
    R.go('done/' + id);
  },
  undo({ id }) {
    clearInterval(UI.timer); UI.undo = null;
    DB.act((s) => SIM.undo(s, id, ME));
    toast(plain(T('d.undone')));
    R.go('alarm/' + id);
  },
  closeDone() { clearInterval(UI.timer); UI.undo = null; R.go(''); },
  snooze({ id }) { DB.act((s) => SIM.snooze(s, id, ME)); toast(plain(T('w.snoozedMsg'))); R.go(''); },
  seen({ id }) { const a = SIM.get(DB.s, id); markSeen(id + a.acks.length); R.go(''); render(); },
  retry() { if (!DB.s.net.worker) toast(plain(T('u.still'))); },
  readN({ id }) { DB.act((s) => { const n = s.notices.find((x) => x.id === id); n.readBy[ME] = { at: '9/17', lang: LANG }; DB.log(`${ME} 공지 읽음 · ${n.title.ko}`); }); },
  orig({ id }) { UI.noticeOrig[id] = !UI.noticeOrig[id]; render(); },
  badTr({ id }) {
    DB.act((s) => { const n = s.notices.find((x) => x.id === id); (n.badTr = n.badTr || []).push({ by: ME, lang: LANG }); DB.log(`${ME} 번역이 이상해요 · ${n.title.ko}`); });
    toast(plain(T('n.badDone')));
  },
  vKind({ v }) { UI.voice.kind = v; render(); },
  vPhoto() { UI.voice.photo = !UI.voice.photo; render(); },
  vAnon({ v }) { UI.voice.anon = v === '1'; render(); },
  vSend() {
    if (!UI.voice.text.trim()) { toast(plain(T('v.need'))); if ($('#vText')) $('#vText').focus(); return; }
    UI.dlg = 'voice'; render();
  },
  vConfirm() {
    const v = UI.voice;
    DB.act((s) => {
      s.voices = s.voices || [];
      s.voices.unshift({ id: 'v' + Date.now().toString(36), fid: ACC.factory, date: '9/17', author: ME, anon: v.anon, kind: v.kind, lang: LANG,
        text: v.text.trim(), koTx: LANG === 'ko' ? null : `(AI 번역 시연 · 한국어) ${v.text.trim()}`, photo: v.photo, readAt: null, reply: null, replyAt: null, done: false });
      DB.log(`의견 받음 · ${v.anon ? '이름 뺌' : ME}`);
    });
    UI.voice = { kind: 'danger', text: '', photo: false, anon: true };
    UI.dlg = null;
    toast(plain(T('v.sent')));
    R.go('voice/mine');
  },
  sound({ v }) { pref.set('sound', v); render(); },
  nalert({ v }) { pref.set('nalert', v); render(); },
  askLogout() { UI.dlg = 'logout'; render(); },
  async logout() {
    UI.dlg = null;
    try { await fetch('api/logout?app=1', { method: 'POST' }); } catch (e) {}
    ACC = null; pref.del('notif'); pref.del('langChosen');
    R.go(''); render();
  },
};
document.addEventListener('input', (e) => { if (e.target.id === 'vText') UI.voice.text = e.target.value; });

function setAccount(a) { ACC = a; ME = a.name; }

(async () => {
  await DB.ready;
  if (DB.remote) {
    try { const r = await fetch('api/me?app=1'); if (r.ok) setAccount(await r.json()); } catch (e) {}
  } else {
    setAccount({ name: '김근로', factory: 'daesung', area: 'A동 2라인', lang: 'ko' });
    if (pref.get('notif') == null) pref.set('notif', 'on');
  }
  wire(ACTS, render);
})();
