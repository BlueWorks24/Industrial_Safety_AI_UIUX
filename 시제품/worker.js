// 근로자 앱 — 시안 W1~W8. 공장주의 초대로 들어온다 (시제품: 시험용 초대 코드).
// 서버 없이 열면 초대 단계 없이 김근로로 들어간다.
let ACC = null;                                    // 로그인한 근로자 { name, factory, area, lang }
let ME = '김근로';
const UI = { undo: null, timer: null, sheet: null, dlg: null, inv: null, noticeOrig: {},
  amin: new Set(), apick: null, adone: null, aunsent: null, aShown: false,  // 경보 창: 내려 둔 것 · 고른 것 · 보낸 뒤 · 못 보냄
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
// 지킴이 앱과 같은 모양으로 (2026-10-20 사용자 지시) — 머리는 흰 띠 한 줄: ← 공장 이름 › 화면 이름, 오른쪽에 안전 공지(종)와 내 정보(사람).
// 지킴이의 HIPA 표시 자리에 공장 이름 (같은 날 사용자 지시 — 근로자 앱에는 HIPA 표시를 쓰지 않는다). 머리는 좁아 다른 언어에서도 로마자 없이 한글 이름만
// 띠 아래 흰 머리글 줄(방패 + 공장 이름 + 내 이름)은 걷었다. 일하는 곳은 홈 인사 줄에 있다
const topIcons = () => { const n = unreadN(DB.s);
  return `<span class="gtopi"><button class="gti" data-go="notice" aria-label="${plain(T('tile.notice'))}${n ? ` ${plain(T('new', { n }))}` : ''}">${I('bell', 23)}${n ? `<em>${n}</em>` : ''}</button>`
    + `<button class="gti" data-go="me" aria-label="${plain(T('m.title'))}">${I('user', 23)}</button></span>`; };
const head = (title, go = '') => `<div class="apptop"><div class="head"><button class="back" data-go="${go}" aria-label="뒤로">${I('back', 22)}</button>`
  + `<button class="hm wfac" data-go="" aria-label="홈">${esc(FACTORIES[ACC.factory].name)}</button><span class="crumb">${title}</span><span class="end">${topIcons()}</span></div></div>`;
// 여러 정보를 "·"로 한 줄에 잇지 않는다 (지킴이 앱 규칙) — 이름표·값 표, 작은 꼬리표, 가는 세로줄로 나눈 글 조각
const kv = (rows) => `<dl class="gkv">${rows.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
const tg = (t, c = '') => `<span class="gtg${c ? ' ' + c : ''}">${t}</span>`;
const mt = (parts) => `<span class="wmt">${parts.filter(Boolean).map((p) => `<span>${p}</span>`).join('')}</span>`;
function endWord(a) {
  if (a.status !== 'ended') return T(a.acks.length ? 'end.liveAck' : 'end.liveNo');
  return T(a.endKind === 'noack' ? 'end.noack' : a.endKind === 'repair' ? 'end.repair' : 'end.ended');
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
// 지킴이 홈과 같은 틀 (2026-10-20 사용자 지시) — 위쪽 남색 띠(공장 이름 · 공지 · 내 정보, 날짜와 일하는 곳, 인사), 센서 감시 카드(띠는 이 카드 가운데서 끝남),
// 큰 카드 넷(받은 경보 · 안전 공지 · 의견 보내기 · 알림과 언어), 아래 최근 소식. 들어가는 화면과 일은 그대로다
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
  myNotices(s).forEach((n) => items.push({ d: n.date, ic: 'megaphone', t: T('tile.notice'), sub: esc(pick(n.title)), go: 'notice/' + n.id, fresh: !n.readBy[ME] }));
  s.alarms.filter((a) => !SIM.live(a) && alarmFid(a) === ACC.factory).forEach((a) => {
    const k = a.acks[0];
    items.push({ d: a.day, ic: iconOf(a.key), t: T('feed.alarmT', { what: ST(a, 'title') }),
      sub: k ? T('feed.by', { who: k.by === ME ? plain(T('w.me')) : k.by }) : a.endKind === 'repair' ? T('end.repair') : T('feed.nobody'), go: 'history' });
  });
  (s.voices || []).filter((v) => v.author === ME && v.reply).forEach((v) => items.push({ d: v.replyAt, ic: 'message', t: T('feed.reply'), sub: esc(v.text), go: 'voice/mine' }));
  const key = (d) => { const [m, dd] = d.split('/').map(Number); return m * 100 + dd; };
  items.sort((a, b) => key(b.d) - key(a.d));
  return `<div class="hlh"><b>${T('feed.t')}</b></div><div class="wfeed">${items.slice(0, 4).map((x) => `<button class="frow" data-go="${x.go}">
      <span class="fic">${I(x.ic, 20)}</span><span class="ftx"><b>${x.t}${x.fresh ? tg(T('n.new'), 'now') : ''}</b><small>${x.sub}</small></span><span class="fd">${x.d}</span></button>`).join('')}</div>`;
}
// 센서 감시 카드 — 겹칠 때 순서: 알림 꺼짐 · 인터넷 끊김 → 경보 → 일부 모름 → 이상 없음 (시안 W1)
function statusCard(s, vis) {
  const watching = vis.filter((a) => a.status === 'watch'), open = vis.filter((a) => a.status === 'open' || a.status === 'remind');
  const notifOff = pref.get('notif') !== 'on';
  const sens = SITE_SENSORS(ACC.factory).map((k) => SIM.sensor(s, k).state);
  const live = s.net.worker && !notifOff ? `<span class="wlive"><i></i>${T(pref.get('sound', 'sv') === 'v' ? 'live.v' : 'live.on')}</span>` : '';
  const line = (c, ic, t, sub, btn = '') => `<div class="wnow ${c}">${I(ic, 26)}<div><b>${t}</b>${sub ? `<span>${sub}</span>` : ''}</div>${btn}</div>`;
  let now;
  if (!s.net.worker) {
    now = line('off', 'wifiOff', T('h.net.t'), T('h.net.b'))
      + `<div class="wlast">${kv([[T('h.last'), watching.length ? T('h.alarms', { n: watching.length }) : T('h.lastOk', { t: hm(s.offlineSince.worker) })]])}</div>`;
  } else if (open.length) {
    // 조치 안 된 경보 — 전에는 꽉 찬 경보 화면이 홈을 덮어 여기 보일 일이 없었다. 이제 창 뒤 · 막대 위로 홈이 보인다 (2026-10-20)
    now = line('bad', 'alert', `${T('h.alarms', { n: open.length })} ${tg(T('end.liveNo'), 'bad')}`,
      open.map((a) => esc(ST(a, 'title'))).join('<br>'), `<button class="hst red" data-act="aOpen">${T('h.see')}</button>`);
  } else if (watching.length) {
    const a = watching[0];
    now = line('bad', 'alert', `${T('h.alarms', { n: watching.length })} ${tg(T('h.still'), 'bad')}`,
      `${esc(ST(a, 'title'))}<br>${a.snoozes > 0 ? T('h.remindAt', { t: hm(a.remindAt) }) : T('h.acked', { t: hm(a.remindAt) })}`,
      `<button class="hst red" data-go="alarm/${a.id}">${T('h.see')}</button>`);
  } else if (sens.includes('unknown')) {
    // 값이 안 오는 센서가 있으면 "이상 없음"이라고 말하지 않는다 (시안 W1-마)
    now = line('part', 'help', T('h.partial'), `${T('h.partialRest')}<br>${T('h.at', { t: hm(s.clock) })}`);
  } else {
    now = line(notifOff ? 'dim' : 'ok', 'checkCircle', T('h.ok'), T('h.at', { t: hm(s.clock) }));
  }
  return `<div class="htd wst"><div class="htdh"><b>${T('mon.t')}</b>${live}</div>
    ${notifOff ? `<div class="woff">${I('bellOff', 22)}<div><b>${T('h.off.t')}</b><span>${T('h.off.b')}</span></div><button class="hst red" data-act="notifOn">${T('h.off.go')}</button></div>` : ''}
    ${now}
    ${s.net.worker ? monitor(s, vis) : ''}
    ${sens.includes('unknown') && s.net.worker ? `<p class="wwarn">${I('help', 15)}<span>${T('h.unknownNote')}</span></p>` : ''}
    ${sens.includes('repair') && s.net.worker ? `<p class="wwarn">${I('tool', 15)}<span>${T('h.repairNote')}</span></p>` : ''}</div>`;
}
function home(s) {
  const vis = visibleAlarms(s);
  const un = unreadN(s);
  const hist = s.alarms.filter((a) => alarmFid(a) === ACC.factory && (!SIM.live(a) || vis.includes(a))).length;
  const mine = (s.voices || []).filter((x) => x.author === ME && x.fid === ACC.factory).length;
  // 카드 이름 앞 선 아이콘, 아래는 알약 하나 + "보기" (지킴이 홈 카드와 같음)
  const card = (go, ic, w, pill) => `<button class="hkc" data-go="${go}"><b>${I(ic, 22)}${w}</b>
    <span class="hkb">${pill}<span class="hkgo">${T('c.go')}${I('chevron', 15)}</span></span></button>`;
  return `${sbar(s.net.worker ? '' : '📵')}<div class="scr ghome whome"><div class="bd">
    <div class="htop"><button class="hlogo wfac" data-go="" aria-label="홈">${esc(FACTORIES[ACC.factory].name)}</button>
      <span class="htopr"><button class="hbell" data-go="notice" aria-label="${plain(T('tile.notice'))}${un ? ` ${plain(T('new', { n: un }))}` : ''}">${I('bell', 22)}${un ? `<em>${un}</em>` : ''}</button>
      <button class="hbell" data-go="me" aria-label="${plain(T('m.title'))}">${I('user', 22)}</button></span></div>
    <div class="hhi"><small>${T('today.date')} ${ACC.area ? tg(esc(AREA(ACC.area))) : ''}</small><b>${T('h.hi', { n: ME })}</b></div>
    ${statusCard(s, vis)}
    <div class="hkg">
      ${card('history', 'alert', T('tile.hist'), `<span class="hpill">${T('c.n', { n: hist })}</span>`)}
      ${card('notice', 'megaphone', T('tile.notice'), un ? `<span class="hpill n">${T('new', { n: un })}</span>` : `<span class="hpill">${T('c.n', { n: myNotices(s).length })}</span>`)}
      ${card('voice', 'message', T('tile.voice'), `<span class="hpill">${T('c.n', { n: mine })}</span>`)}
      ${card('settings', 'sliders', T('tile.set'), `<span class="hpill">${LANGS.find((l) => l.id === LANG).name}</span>`)}
    </div>
    ${feed(s)}
    <div class="proto">가상 데이터로 만든 시제품이에요</div>
  </div></div>`;
}
// 위쪽 남색 띠는 센서 감시 카드 가운데까지 — 카드 높이가 상태마다 달라 재서 넣는다 (지킴이 홈 homeBand와 같은 방식)
function homeBand() {
  const bd = $('.whome .bd'), c = $('.whome .wst'); if (!bd || !c) return;
  bd.style.setProperty('--hband', `${c.offsetTop + Math.min(c.offsetHeight / 2, 120)}px`);
}
const bandObs = new ResizeObserver(homeBand);
/* ---------- W2·W3 경보 — 아래에서 올라오는 창 (2026-10-20 사용자 결정, 시안 B) ----------
   전에는 조치 안 된 경보가 있으면 화면을 꽉 채운 경보 화면이 떠서 다른 기능을 못 썼다(닫기 없음, 시안 15차 E40).
   이제는 보던 화면 위로 아래 절반을 덮는 창이 올라온다. 끌어 내리거나 "내려 두기"를 누르면 화면 아래 빨간 막대로 줄어
   모든 화면에 남고, 막대에서 바로 조치 완료를 누르거나 막대를 눌러 창을 다시 연다. 조치하기 전에는 사라지지 않는다.
   5분 뒤 다시 알림(아직 이상) · 새 경보가 오면 내려 둔 것과 상관없이 창이 다시 올라온다 (내려 둔 표시가 경보 상태마다 따로라서) */
const aKey = (a) => `${a.id}:${a.status}:${a.acks.length}:${a.snoozes}`;
const aMins = (s, a) => s.clock - (a.status === 'remind' ? a.acks[a.acks.length - 1].at : a.start);
// 얼마나 — 값은 보이지 않고 평소와 견준 말 + 정상 범위 막대 (근로자는 센서 값을 보지 않는다)
function howMuch(a) {
  const d = SENSORS[a.key];
  if (d.kind === 'state') return `<div class="states"><div class="st">${T('a.normal')}</div><div class="st on">${T('a.wet')}</div></div>`;
  const pos = Math.min(95, 50 + (a.ratio - 1) * 22);
  const extra = ST(a, 'extra');
  return `<div class="range"><div class="ok"></div><div class="now" style="left:${pos}%"></div></div>
    <div class="range-l"><span></span><span>${T('a.range')}</span><span></span><span>${T('a.nowmark')}</span></div>
    ${extra ? `<div class="small">${esc(extra)}</div>` : ''}`;
}
function aOne(s, a, many) {
  const remind = a.status === 'remind', esc2 = remind && a.snoozes >= SNOOZE_LIMIT;
  const what = ST(a, 'what') || ST(a, 'sub'), d = SENSORS[a.key];
  const sub = remind ? mt([T('a.after', { n: aMins(s, a) }), a.snoozes && T('a.snoozed', { n: a.snoozes })])
    : mt([hm(a.start), s.clock - a.start < 2 ? T('a.justnow') : T('a.minAgo', { n: s.clock - a.start })]);
  return `<div class="atop"><div class="grip"></div><div class="ah">${I('alert', 30)}<div><b>${T(remind ? 'as.still' : 'as.t', { what: ST(a, 'title') })}</b><small>${sub}</small></div>${langBtn()}</div></div>
    <div class="ain">
      ${many ? `<button class="link aall" data-act="aPick" data-id="">${I('back', 16)}${T('a.list', { n: many })}</button>` : ''}
      ${kv([what && [T('a.what'), esc(what)], [T('a.where'), esc(ST(a, 'where'))], [T(d.kind === 'state' ? 'a.state' : 'a.how'), d.kind === 'state' ? T('a.wet') : esc(ST(a, 'more'))]])}
      ${howMuch(a)}
      ${esc2 ? `<div class="warnbar"><span class="ic">${I('megaphone', 22)}</span><div class="small"><b class="ink">${T('a.escT')}</b><br>${T('a.escB')}</div></div>` : ''}
      <button class="btn red abig" data-act="ack" data-id="${a.id}">${T(remind ? 'a.reack' : 'a.ack')}</button>
      ${remind && !esc2 ? `<button class="btn ghost" data-act="snooze" data-id="${a.id}">${T('a.snooze')}</button><div class="small center">${T('a.snoozeLeft', { n: SNOOZE_LIMIT - a.snoozes - 1 })}</div>` : ''}
      <button class="adown" data-act="aDown">${I('chevronDown', 18)}${T('as.down')}</button>
    </div>`;
}
function aList(s, list) {
  return `<div class="atop"><div class="grip"></div><div class="ah">${I('alert', 30)}<div><b>${T('a.list', { n: list.length })}</b><small>${T('a.unhandled', { n: list.length })}</small></div>${langBtn()}</div></div>
    <div class="ain">${list.map((a) => `<button class="q alarmcard" data-act="aPick" data-id="${a.id}">
      <div class="wct"><b>${T(a.status === 'remind' ? 'as.still' : 'as.t', { what: ST(a, 'title') })}</b>${I('chevron', 18)}</div>
      ${mt([esc(ST(a, 'where')), hm(a.start)])}</button>`).join('')}
      <button class="adown" data-act="aDown">${I('chevronDown', 18)}${T('as.down')}</button></div>`;
}
// 조치 완료를 보낸 뒤 — 같은 창 안에서 (5초 안에 취소할 수 있다)
function aDone(s, a) {
  const u = UI.undo && UI.undo.id === a.id ? UI.undo : null;
  const left = u ? Math.max(0, Math.ceil((u.until - Date.now()) / 1000)) : 0;
  const k = SIM.lastAck(a);
  return `<div class="ain adone"><div class="donemark">${I('check', 36)}</div>
    <div class="center big">${T(k && k.re ? 'd.resent' : 'd.sent')}</div>
    <div class="wsent">${kv([[T('d.at'), hm(k ? k.at : s.clock)], [T('d.toWho'), T('d.who')], [T('d.next'), `${hm(a.remindAt || s.clock)}<small>${T('d.nextSub')}</small>`]])}</div>
    ${left > 0 ? `<div class="wundo"><div class="wundor"><div><b>${T('d.wrong')}</b><small><span id="usec">${left}</span>${LANG === 'ko' ? '' : ' '}${T('d.sec')}</small></div>
      <button class="hst lt" data-act="undo" data-id="${a.id}">${T('d.undo')}</button></div>
      <div class="bar5"><i id="ubar" style="width:${(left / 5) * 100}%"></i></div></div>` : ''}
    <button class="btn ghost" data-act="closeDone">${T('close')}</button></div>`;
}
function aUnsent(s, a) {
  return `<div class="ain adone"><div class="donemark" style="border-style:dashed">${I('clock', 34)}</div>
    <div class="center big">${T('u.t')}</div>
    <div class="center small ink">${T('u.b')}</div>
    <div class="warnbar"><span class="ic">${I('megaphone', 22)}</span><div class="small ink"><b>${T('u.tell')}</b></div></div>
    <button class="btn" data-act="retry">${T('u.retry')}</button>
    <button class="btn ghost" data-act="closeUnsent">${T('close')}</button></div>`;
}
// 아래 막대 — 내려 둔 경보. 막대를 누르면 창이 다시 올라오고, 오른쪽 단추로 바로 조치 완료
function aMini(s, list) {
  const a = list[0], one = list.length === 1;
  return `<div class="amini" data-act="aOpen" role="button" aria-label="${plain(T('h.see'))}">${I('alert', 24)}
    <div><b>${one ? T(a.status === 'remind' ? 'as.still' : 'as.t', { what: ST(a, 'title') }) : T('a.list', { n: list.length })}</b>
    <small>${T('as.min', { n: Math.max(1, aMins(s, a)) })}</small></div>
    ${one ? `<button class="hst" data-act="ack" data-id="${a.id}">${T('a.ack')}</button>` : `<button class="hst" data-act="aOpen">${T('c.go')}</button>`}</div>`;
}
// 보던 화면 위에 얹을 경보 — 창(.asheet) 또는 아래 막대(.amini)
function alarmLayer(s, todo) {
  let inner = '';
  const done = UI.adone && SIM.get(s, UI.adone), uns = UI.aunsent && SIM.get(s, UI.aunsent);
  if (uns && !pendingAck(s, uns.id)) { UI.adone = uns.id; UI.aunsent = null; return alarmLayer(s, todo); }
  if (uns) inner = aUnsent(s, uns);
  else if (done) inner = aDone(s, done);
  else {
    const open = todo.filter((a) => !UI.amin.has(aKey(a)));
    if (!open.length) return todo.length ? aMini(s, todo) : '';
    const pick = open.find((a) => a.id === UI.apick);
    inner = pick || open.length === 1 ? aOne(s, pick || open[0], open.length > 1 && open.length) : aList(s, open);
  }
  // 데이터가 새로 와서 다시 그릴 때는 올라오는 움직임을 빼다 (창이 깜빡이지 않게)
  const keep = UI.aShown ? ' keep' : '';
  UI.aShownNext = true;
  return `<div class="ov${keep}"></div><div class="sheet asheet${keep}" role="alertdialog" aria-label="${plain(T('a.abn'))}">${inner}</div>`;
}
// 끌어 내리기 — 창 위쪽 빨간 부분을 잡고 90px 넘게 내리면 내려 둔다
let AD = null;
document.addEventListener('touchstart', (e) => {
  const t = e.target.closest('.asheet .atop');
  if (!t || e.target.closest('button')) return;
  AD = { y: e.touches[0].clientY, d: 0, el: $('.asheet') };
}, { passive: true });
document.addEventListener('touchmove', (e) => {
  if (!AD) return;
  AD.d = Math.max(0, e.touches[0].clientY - AD.y);
  AD.el.style.transition = 'none';
  AD.el.style.transform = `translate(-50%, ${AD.d}px)`;
}, { passive: true });
function aDragEnd() {
  if (!AD) return;
  const { d, el } = AD; AD = null;
  if (d > 90) { ACTS.aDown(); return; }
  el.style.transition = 'transform .2s'; el.style.transform = '';
  if (UI.aPend) { UI.aPend = false; render(); }
}
document.addEventListener('touchend', aDragEnd);
document.addEventListener('touchcancel', aDragEnd);
function alarmScreen(s, a) {
  // 조치된 경보(지켜보는 중) · 끝난 경보는 전처럼 화면 하나로 — 급한 일이 아니라서 창으로 띄우지 않는다
  const k = SIM.lastAck(a);
  if (a.status === 'watch') return k && k.by !== ME ? othersAcked(s, a) : watchScreen(s, a);
  return `${sbar()}<div class="scr"><div class="bd wmid"><div class="donemark">${I('check', 40)}</div>
    <div class="center big">${T('e.t')}</div><div class="center small">${T('e.sub', { what: ST(a, 'title'), t: hm(a.endedAt) })}</div></div>
    <div class="ft"><button class="btn ghost" data-go="">${T('home')}</button></div></div>`;
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

/* ---------- W4 받은 경보 ---------- */
// 안쪽 화면은 지킴이 할 일 화면과 같은 결 (2026-10-20) — 옅은 회색 바탕 위 흰 카드, 큰 제목(스크롤하면 머리 줄로 줄어듦), 설명 줄은 뺐다
const wscr = (s, title, back, body, ft = '') => `${sbar(s.net.worker ? '' : '📵')}<div class="scr wsub"><div class="bd">${head(title, back)}${body}</div>${ft}</div>`;
function history(s) {
  const rows = s.alarms.filter((a) => alarmFid(a) === ACC.factory && (!SIM.live(a) || visibleAlarms(s).includes(a)));
  return wscr(s, T('tile.hist'), '', `${ltitle(T('tile.hist'))}
    ${rows.map((a) => {
      const k = SIM.lastAck(a);
      return `<button class="q wcard" data-go="hist/${a.id}"><div class="wct"><b>${esc(ST(a, 'title'))}</b>${SIM.live(a) ? tg(T('hi.live'), 'bad') : ''}${I('chevron', 18)}</div>
        ${kv([[T('hd.when'), `${a.day} ${hm(a.start)}`], [T('hd.who'), k ? esc(k.by) + (k.by === ME ? ' ' + T('hi.me') : '') : T('hd.none')], [T('k.end'), endWord(a)]])}</button>`;
    }).join('')}
    <p class="wfoot">${T('hi.note')}</p>`);
}

// W4-나 지난 경보 자세히 — 근로자는 센서 값을 보지 않는다 (무엇이·어디서·언제·어떻게 끝났는지·누가 조치했는지)
function histOne(s, id) {
  const a = s.alarms.find((x) => x.id === id && alarmFid(x) === ACC.factory);
  if (!a) return history(s);
  const what = ST(a, 'what'), mins = a.endedAt != null ? a.endedAt - a.start : null;
  return wscr(s, T('tile.hist'), 'history', `${ltitle(esc(ST(a, 'title')))}
    <div class="q wcard">${kv([[T('a.what'), esc(ST(a, 'title')) + (what ? `<br>${esc(what)}` : '')], [T('a.where'), esc(ST(a, 'where'))],
      [T('hd.when'), `${a.day} ${hm(a.start)}${a.endedAt != null ? ' ~ ' + hm(a.endedAt) : ''}${mins != null ? `<br><small>${T('hd.took', { n: mins })}</small>` : ''}`],
      [T(SIM.live(a) ? 'hd.now' : 'k.end'), endWord(a)]])}</div>
    <div class="lbl">${T('hd.who')}</div>
    ${a.acks.length ? `<div class="q wcard">${a.acks.map((k) => `<div class="wrow"><b>${esc(k.by)}${k.by === ME ? ' ' + plain(T('hi.me')) : ''}</b><span>${T(k.re ? 'hd.re' : 'hd.ack')}</span><em>${hm(k.at)}</em></div>`).join('')}</div>`
      : `<div class="q wcard"><div class="small">${T('hd.none')}</div></div>`}
    ${a.snoozes ? `<p class="wfoot">${T('hd.snooz', { n: a.snoozes })}</p>` : ''}
    ${a.escalated ? `<p class="wfoot">${T('a.escT')}</p>` : ''}
    <p class="wfoot">${T('hd.noval')}</p>`);
}

/* ---------- W5 안전 공지 ---------- */
function notices(s) {
  const list = myNotices(s), un = unreadN(s);
  return wscr(s, T('tile.notice'), '', `${ltitle(T('tile.notice'))}
    <div class="hlh"><b>${un ? T('n.unread', { n: un }) : T('n.all')}</b></div>
    ${list.map((n) => { const r = n.readBy[ME]; return `<button class="q wcard" data-go="notice/${n.id}">
      <div class="wct"><b>${esc(pick(n.title))}</b>${r ? tg(T('n.read')) : tg(T('n.new'), 'now')}${I('chevron', 18)}</div>
      ${mt([n.date, esc(n.by), n.ra && esc(n.ra)])}</button>`; }).join('')}`);
}
function notice(s, id) {
  const n = myNotices(s).find((x) => x.id === id);
  if (!n) return notices(s);
  const r = n.readBy[ME];
  const tr = LANG !== 'ko';
  const orig = tr && UI.noticeOrig[id];
  const body = esc(orig ? n.body.ko : pick(n.body)).replace(/\n/g, '<br>');
  return wscr(s, T('tile.notice'), 'notice', `${ltitle(esc(orig ? n.title.ko : pick(n.title)))}
    ${mt([n.date, esc(n.by), n.ra && esc(n.ra)])}
    ${tr ? `<div class="aitag"><span>${I('sparkle', 15)} ${T('n.ai')}</span><button class="link" data-act="orig" data-id="${id}">${orig ? T('n.trans') : T('n.orig')}</button></div>` : ''}
    <div class="q wcard wbody">${body}</div>
    ${tr ? `<button class="link small" data-act="badTr" data-id="${id}">${I('flag', 15)} ${T('n.bad')}</button>` : ''}`,
  `<div class="ft">${r ? `<div class="wdone">${I('check', 18)}${T('n.acked', { d: r.at })}</div>` : `<button class="btn" data-act="readN" data-id="${id}">${T('n.ack')}</button><div class="small center">${T('n.ackNote')}</div>`}</div>`);
}

/* ---------- W6 의견 보내기 ---------- */
function voiceForm(s) {
  const v = UI.voice;
  const kinds = ['danger', 'better', 'etc'];
  return `${wscr(s, T('tile.voice'), '', `${ltitle(T('tile.voice'))}
    <button class="q wcard" data-go="voice/mine"><div class="wct"><b>${I('send', 18)} ${T('v.mine')}</b>${I('chevron', 18)}</div></button>
    <div class="warnbar"><span class="ic">${I('alert', 22)}</span><div class="small ink">${T('v.urgent')}</div></div>
    <div class="lbl">${T('v.kind')}</div>
    <div class="seg">${kinds.map((k) => `<button class="${v.kind === k ? 'on' : ''}" data-act="vKind" data-v="${k}">${T('v.k.' + k)}</button>`).join('')}</div>
    <div class="lbl">${T('v.text')}</div>
    <div class="small">${T('v.langNote')}</div>
    <textarea class="input" id="vText" placeholder="${plain(T('v.ph'))}">${esc(v.text)}</textarea>
    <button class="hst lt wphoto" data-act="vPhoto">${I('camera', 18)}${T(v.photo ? 'v.photoOn' : 'v.photo')}</button>
    <div class="lbl">${T('v.name')}</div>
    <div class="seg"><button class="${!v.anon ? 'on' : ''}" data-act="vAnon" data-v="0">${T('v.show')}</button><button class="${v.anon ? 'on' : ''}" data-act="vAnon" data-v="1">${T('v.hide')}</button></div>
    ${v.anon ? `<div class="small">${T('v.hideWarn')}</div>` : ''}`,
  `<div class="ft"><button class="btn" data-act="vSend">${T('v.send')}</button></div>`)}
  ${UI.dlg === 'voice' ? `<div class="ov" data-act="closeDlg"></div><div class="dlg">
    <div class="mid" style="font-size:19px">${T('v.cf.t')}</div>
    <div class="q" style="box-shadow:inset 0 0 0 1.5px var(--line)">${mt([T('v.k.' + v.kind), T(v.anon ? 'v.anon' : 'v.named'), v.photo && T('v.ph1')])}<div class="t">${esc(v.text)}</div></div>
    <div class="small ink"><b>${T('v.cf.lock')}</b></div>
    <button class="btn" data-act="vConfirm">${T('v.cf.send')}</button>
    <button class="btn ghost" data-act="closeDlg">${T('v.cf.edit')}</button></div>` : ''}`;
}
function voiceMine(s) {
  const mine = (s.voices || []).filter((x) => x.author === ME && x.fid === ACC.factory);
  const st = T('v.st');
  return wscr(s, T('v.mine'), 'voice', `${ltitle(T('v.mine'))}
    ${mine.map((x) => {
      const step = x.done ? 3 : x.reply ? 2 : x.readAt ? 1 : 0;
      const replyTx = x.reply && LANG !== 'ko' ? (x.replyTx && x.replyTx[LANG]) : null;
      return `<div class="q wcard">
        <div class="wct"><b>${esc(x.text)}</b>${step === 2 ? tg(esc(st[2]), 'now') : ''}</div>
        ${mt([x.date, T('v.k.' + x.kind), T(x.anon ? 'v.anon' : 'v.named')])}
        <div class="steps">${st.map((w, i) => `<span class="${i <= step ? 'on' : ''}">${esc(w)}</span>`).join('')}</div>
        ${x.reply ? `<div class="reply"><div class="wrt"><b>${T('v.reply')}</b><em>${x.replyAt}</em></div>${esc(replyTx || x.reply)}
          ${replyTx ? `<div class="aitag" style="margin-top:6px"><span>${I('sparkle', 15)} ${T('n.ai')}</span></div><div class="small">${T('n.orig')}: ${esc(x.reply)}</div>` : ''}</div>` : ''}
      </div>`;
    }).join('') || `<div class="q wcard"><div class="mid">${T('v.none')}</div></div>`}
    <button class="hst lt wwide" data-go="voice">${T('v.write')}</button>`);
}

/* ---------- W7 알림과 언어 · 내 정보 ---------- */
function settings(s) {
  const on = pref.get('notif') === 'on';
  const sound = pref.get('sound', 'sv'), na = pref.get('nalert', '1');
  return wscr(s, T('tile.set'), '', `${ltitle(T('tile.set'))}
    <div class="lbl">${T('s.alarm')}</div>
    <div class="q wcard"><div class="wrow"><b>${T('s.alarm')}</b><span class="${on ? 'won' : 'woffv'}">${T(on ? 's.on' : 's.off')}</span></div>
      <div class="small">${T(on ? 's.alarmNote' : 's.offNote')}</div>
      ${on ? '' : `<button class="hst red wwide" data-act="notifOn">${T('h.off.go')}</button>`}</div>
    <div class="lbl">${T('s.when')}</div>
    <div class="seg"><button class="${sound === 'sv' ? 'on' : ''}" data-act="sound" data-v="sv">${T('s.sv')}</button><button class="${sound === 'v' ? 'on' : ''}" data-act="sound" data-v="v">${T('s.v')}</button></div>
    <div class="lbl">${T('s.notice')}</div>
    <div class="seg"><button class="${na === '1' ? 'on' : ''}" data-act="nalert" data-v="1">${T('s.recv')}</button><button class="${na === '0' ? 'on' : ''}" data-act="nalert" data-v="0">${T('s.norecv')}</button></div>
    <div class="lbl">${T('s.lang')}</div>
    <div class="q wcard wlist">${LANGS.map((l) => `<button class="wpick${l.id === LANG ? ' on' : ''}" data-act="lang" data-v="${l.id}"><span>${l.name}</span>${l.id === LANG ? I('check', 20) : ''}</button>`).join('')}</div>
    <p class="wfoot">${T('s.langNote')}</p>`);
}
function me(s) {
  return `${wscr(s, T('m.title'), '', `
    <div class="ghello gme"><span class="gav">${I('user', 30)}</span><div><b>${esc(ME)}</b><span class="gmsub">${T('m.role')}</span></div></div>
    <div class="lbl">${T('m.where')}</div>
    <div class="q wcard">${kv([[T('inv.factory'), esc(FNAME(ACC.factory))], ACC.area && [T('inv.area'), esc(AREA(ACC.area))]])}</div>
    <p class="wfoot">${T('m.fix')}</p>
    <p class="wfoot">${T('m.phone')}<span class="hyp">가설</span></p>
    <div class="lbl">${T('tile.set')}</div>
    <div class="q wcard wlist">
      <button class="wpick" data-go="settings"><span>${T('s.lang')}</span><em>${LANGS.find((l) => l.id === LANG).name}</em>${I('chevron', 18)}</button>
      <button class="wpick" data-go="settings"><span>${T('s.alarm')}</span><em>${T(pref.get('notif') === 'on' ? 's.on' : 's.off')}</em>${I('chevron', 18)}</button></div>
    <div class="lbl">${T('m.help')}</div>
    <div class="help">
      <a class="hrow" href="tel:010-0000-0000"><span class="hic">${I('phone', 20)}</span><div><b>${T('m.helpBoss')}</b><div class="small">${T('m.boss')} 박대표<br>010-0000-0000 (가상)</div></div></a>
      <a class="hrow" href="tel:031-000-0000"><span class="hic">${I('tool', 20)}</span><div><b>${T('m.helpApp')}</b><div class="small">${T('m.center')}<br>031-000-0000 (가상)<br>${T('m.hours')}</div></div></a>
    </div>
    <button class="btn ghost gout" data-act="askLogout">${T('m.logout')}</button>
    <div class="small center">${T('m.ver')}</div>`)}
  ${UI.dlg === 'logout' ? `<div class="ov" data-act="closeDlg"></div><div class="dlg">
    <div class="mid" style="font-size:19px">${T('m.logoutQ')}</div>
    <div class="small ink">${T('m.logoutB')}</div>
    <button class="btn" data-act="closeDlg">${T('m.stay')}</button>
    <button class="btn ghost gdanger" data-act="logout">${T('m.logout')}</button></div>` : ''}`;
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
    UI.apick = null;  // 새로 울리면 앞서 고른 경보 대신 지금 울리는 것(여러 건이면 목록)을 보인다
    buzz([400, 150, 400, 150, 400]);
    if (pref.get('sound', 'sv') === 'sv' && pref.get('notif') === 'on') beep();
  }
  lastAttention = sig;

  const todo = att.filter((a) => !pendingAck(s, a.id));
  // 끌어 내리는 중에는 다시 그리지 않는다 (손가락 밑의 창이 바뀌지 않게) — 손을 떼면 그린다
  if (AD) { UI.aPend = true; return; }
  // 경보 주소(홈 "경보 보기" 등)로 오면 내려 둔 창을 다시 올리고 보던 자리(홈)로
  const pa = p[0] === 'alarm' && SIM.get(s, p[1]);
  if (pa && todo.includes(pa)) { UI.amin.delete(aKey(pa)); UI.apick = pa.id; R.go(''); return; }
  if (pa && pendingAck(s, pa.id)) { UI.aunsent = pa.id; R.go(''); return; }
  if (pa) html = alarmScreen(s, pa);
  else if (p[0] === 'hist' && p[1]) html = histOne(s, p[1]);
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
  // 조치 안 된 경보는 어느 화면에서든 위에 얹는다 — 창 또는 아래 막대 (시안 B)
  UI.aShownNext = false;
  html += alarmLayer(s, todo);
  UI.aShown = UI.aShownNext;
  paint(html);
}
let lastHash = null;
function paint(html) {
  const f = document.activeElement && document.activeElement.id;
  $('#app').innerHTML = fmtDates(html);  // 날짜는 지킴이 앱처럼 09.16 꼴 (2026-10-20)
  bandObs.disconnect(); if ($('.whome')) { homeBand(); bandObs.observe($('.whome .bd')); }
  ltCheck();
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
    toast(plain(T('h.bell')));
    R.go(''); render();
  },
  notifLater() { pref.set('notif', 'off'); DB.act((s) => { const w = (s.workers || []).find((x) => x.name === ME); if (w) w.notif = false; }); R.go(''); render(); },
  ack({ id }) {
    if (!DB.s.net.worker) {
      DB.act((s) => s.outbox.worker.push({ type: 'ack', id, by: ME, at: s.clock }));
      UI.aunsent = id; UI.adone = null; render(); return;
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
    UI.adone = id; render();  // 같은 창 안에서 보냈다고 보인다 (2026-10-20, 전에는 조치 완료 화면으로 넘어갔다)
  },
  undo({ id }) {
    clearInterval(UI.timer); UI.undo = null;
    DB.act((s) => SIM.undo(s, id, ME));
    toast(plain(T('d.undone')));
    UI.adone = null; UI.apick = id;
    [...UI.amin].filter((k) => k.startsWith(id + ':')).forEach((k) => UI.amin.delete(k));  // 취소하면 창이 다시 올라온다 (전에 내려 둔 적이 있어도)
    render();
  },
  closeDone() { clearInterval(UI.timer); UI.undo = null; UI.adone = null; render(); },
  closeUnsent() { UI.aunsent = null; render(); },
  // 경보 창 내려 두기 · 다시 열기 · 여러 건 중 고르기 (시안 B)
  aDown() { attention(DB.s).forEach((a) => UI.amin.add(aKey(a))); UI.apick = null; render(); },
  aOpen() { attention(DB.s).forEach((a) => UI.amin.delete(aKey(a))); render(); },
  aPick({ id }) { UI.apick = id || null; render(); },
  snooze({ id }) { DB.act((s) => SIM.snooze(s, id, ME)); toast(plain(T('w.snoozedMsg'))); render(); },
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
