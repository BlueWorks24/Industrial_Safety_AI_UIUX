// 근로자 앱 — 시안 W1~W8. 공장주의 초대로 들어온다 (시제품: 시험용 초대 코드).
// 서버 없이 열면 초대 단계 없이 김근로로 들어간다.
let ACC = null;                                    // 로그인한 근로자 { name, factory, area, lang }
let ME = '김근로';
const UI = { undo: null, timer: null, sheet: null, dlg: null, inv: null, noticeOrig: {},
  amin: new Set(), apick: null, adone: null, aunsent: null, aShown: false,  // 경보 창: 내려 둔 것 · 고른 것 · 보낸 뒤 · 못 보냄
  voice: { kind: 'danger', text: '', photo: false, anon: true },
  selfs: [], selfI: 0, selfDir: 0,  // 자가진단 — 찍은 것 차례로, 보는 장, 넘긴 쪽 (2026-11-11)
  senMore: {} };  // 센서 하나 — 경보 기록을 펼친 센서 (같은 날)

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
  const codes = [['DS-KIM', '김근로 · 대성정밀'], ['HB-JUNG', '정근로 · 한빛화학'], ['DS-NGUYEN', 'Nguyen Van A · 대성정밀 (Tiếng Việt)'], ['DS-USED', '이미 쓴 초대 (오류 화면 보기)'], ['DS-OLD', '기간 지난 초대 (오류 화면 보기)']];
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
// 센서 하나의 지금 상태 — 진짜 센서(온습도 · 전기)는 ThingsBoard, 나머지는 씨앗. 홈 칸 · 센서 목록 · 센서 하나가 같이 쓴다
function senState(s, k, vis) {
  const a = vis.find((x) => x.key === k), ss = SIM.sensor(s, k).state;
  return wtbOf(k) || (ss !== 'watch' ? ss : a ? (a.status === 'watch' ? 'acked' : 'abn') : 'ok');
}
function monitor(s, vis) {
  // 센서 감시 줄 — 값은 보여 주지 않고 상태만 (근로자는 센서 값을 보지 않는다).
  // 칸을 누르면 그 센서 화면, 아래 [전체 보기]는 센서 목록 (2026-11-11 사용자 지시)
  return `<div class="mon">${SITE_SENSORS(ACC.factory).map((k) => { const st = senState(s, k, vis);
    return `<button class="ms ${st}" data-act="senOpen" data-k="${k}">${I(iconOf(k), 20)}<b>${esc(SNAME(k, true))}</b><span><i></i>${T('mon.' + st)}</span></button>`;
  }).join('')}</div><button class="wmall" data-go="sensors">${T('sen.all')}${I('chevron', 15)}</button>`;
}
/* ---------- W10 센서 목록 · 센서 하나 (2026-11-11 사용자 지시 — 더 자세히 볼 수 있게) ----------
   보기만 한다. 처음엔 값 없이 상태, 위치, 재는 것, 마지막 확인 시각, 경보 기록이었고, 같은 날 사용자 지시로 센서 하나는 지킴이 센서 이력 꼴 + 지금 값(아래 sensorScreen).
   진짜 센서(온습도 · 전기)는 ThingsBoard 기록(서버 tb_state의 al — 짧게 끝난 경보도 여기서 본다), 나머지는 씨앗 경보(누르면 받은 경보 상세).
   목록은 이상 · 조치됨 · 모름 · 수리 중 · 감시 중 차례 */
const SEN_TG = { abn: 'bad', acked: 'warn', unknown: 'warn', repair: '', ok: 's-ok' };
const SEN_RANK = { abn: 0, acked: 1, unknown: 2, repair: 3, ok: 4 };
const SX = (k, f) => (LANG !== 'ko' && txOf(k)[f]) || SENSORS[k][f] || '';
const senWhat = (k) => (SX(k, 'what') || SX(k, 'sub')).replace(/ · /g, ', ');
// 값을 받은 시각 — 한국 시간으로 (폰 시간대와 상관없이 경보 기록 시각과 맞춘다)
const hms = (ms) => new Date(ms).toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul', hour12: false });
const mdKey = (d) => { const [m, dd] = d.split('/').map(Number); return m * 100 + dd; };
// 경보 기록 — 최근 것부터. 한 줄: 날짜 · 울린 때 · 조치한 때(분) · 끝난 때와 방식 · 심각도 · (씨앗만) 평소와 견준 말
function senLog(s, k, vis) {
  if (WTB.ok && WTB.st[k]) return (WTB.st[k].al || []).map((x) => ({ ...x, endW: T(x.ack != null ? 'end.ended' : 'end.noack') }));
  return s.alarms.filter((a) => a.key === k && alarmFid(a) === ACC.factory && (!SIM.live(a) || vis.includes(a)))
    .sort((a, b) => mdKey(b.day) - mdKey(a.day) || b.start - a.start)
    .map((a) => ({ day: a.day, start: a.start, end: a.endedAt, live: SIM.live(a), ack: a.acks[0] ? a.acks[0].at : null, sev: alarmSev(a), endW: endWord(a),
      val: SENSORS[k].kind === 'state' ? T('a.wet') : a.ratio ? T('sl.ratio', { r: a.ratio }) : '' }));
}
// 지금 값 이름 — 서버가 주는 한국어 이름을 언어마다
const VAL_TX = { 온도: ['온도', 'Nhiệt độ', 'Temperature'], 습도: ['습도', 'Độ ẩm', 'Humidity'], 전압: ['전압', 'Điện áp', 'Voltage'],
  주파수: ['주파수', 'Tần số', 'Frequency'], 전류: ['전류', 'Dòng điện', 'Current'], 전력: ['전력', 'Công suất', 'Power'] };
const SEV_C = { critical: ' sevc', warn: ' warn', info: '' };
function sensorsScreen(s) {
  const vis = visibleAlarms(s), ks = SITE_SENSORS(ACC.factory).map((k) => ({ k, st: senState(s, k, vis), log: senLog(s, k, vis) }))
    .sort((a, b) => SEN_RANK[a.st] - SEN_RANK[b.st]);
  return wscr(s, T('sen.title'), '', `${ltitle(T('sen.title'))}<div class="wsens">
    <div class="small">${T('sen.n', { n: ks.length })}</div>
    ${ks.map(({ k, st, log }) => `<button class="q wcard" data-act="senOpen" data-k="${k}" data-from="sensors"><div class="wct"><b>${I(iconOf(k), 18)}${esc(SNAME(k))}</b>${tg(T('mon.' + st), SEN_TG[st])}${I('chevron', 18)}</div>
      ${kv([[T('sen.where'), esc(SX(k, 'where'))], [T('sen.recent'), log[0] ? `${log[0].day} ${hm(log[0].start)}` : T('sen.none')]])}</button>`).join('')}</div>`);
}
// 센서 하나 — 지킴이 앱 공장 창 센서 이력의 센서 한 칸과 같은 꼴 (같은 날 사용자 지시 — 처음엔 이름표 표 + 경보 기록 줄이었다):
// 머리(경보 기록 | 경보 n건) → 지금 값 큰 숫자 칸 + "HH:MM:SS 받음"(진짜 센서만) → 위치 · 재는 것 → 타임라인(날짜 | 울림 + 조치 · 끝남 | 심각도, 차례는 아래 tl).
// 지금 값은 근로자도 본다 — 같은 날 사용자 지시("온습도면 온도, 습도를 실시간으로"), 2026-10-20 "근로자는 센서 값을 보지 않는다"에서 이 화면만 바뀜.
// 값은 서버가 ThingsBoard WebSocket으로 받아 이 화면으로 밀어 준다(SSE) — 값 글자만 바꾼다(wtbPaint)
function sensorScreen(s, k) {
  if (!SENSORS[k] || !SITE_SENSORS(ACC.factory).includes(k)) { R.go('sensors'); return ''; }
  const vis = visibleAlarms(s), st = senState(s, k, vis), log = senLog(s, k, vis), tb = WTB.ok && WTB.st[k];
  const num = tb && tb.vals ? `<div class="gsnum">${tb.vals.map(([n, v, u], i) => `<div><span>${esc(VAL_TX[n] ? LX(VAL_TX[n]) : n)}</span><b data-wtbv="${k}:${i}">${esc(v + u)}</b></div>`).join('')}</div>
    <div class="gsat" data-wtbat="${k}">${T('sl.got', { t: hms(tb.ts) })}</div>` : '';
  const steps = (x) => [x.ack != null && T('sl.ackIn', { n: x.ack - x.start }), x.live ? T('sen.live') : x.end != null && `${hm(x.end)} ${x.endW}`].filter(Boolean);
  // 타임라인 — 최근 것이 위 (같은 날 사용자 지시 — 처음엔 지킴이처럼 오래된 것부터라 오늘 기록이 맨 밑이었다).
  // 기록이 늘면 너무 길어져 처음엔 최근 5건만, [이전 기록 n건 더 보기]로 나머지(서버가 주는 최근 30건까지) · [접기] (같은 날 사용자 지시, 센서마다 기억)
  // 날짜는 그날 첫 줄에만 (같은 날 사용자 지시 — 11.09가 줄마다 되풀이되지 않게). 칸 너비는 그대로 둬 시각 줄이 맞는다
  const open = UI.senMore[k], shown = open ? log : log.slice(0, 5);
  const tl = shown.length ? `<ol class="gtl">${shown.map((x, i, l) => `<li${x.live ? ' class="gson"' : ''}><span class="gtlw">${i && l[i - 1].day === x.day ? '' : x.day}</span><span class="gtlx"><b>${T('sen.ring', { t: hm(x.start) })}${x.val ? ` <i>${esc(x.val)}</i>` : ''}</b>${steps(x).map((t) => `<small>${t}</small>`).join('')}</span><span class="gtg${SEV_C[x.sev] || ''}">${T('sev.' + (x.sev || 'info'))}</span></li>`).join('')}</ol>`
    + (log.length > 5 ? `<button class="more gsmore" data-act="senMore" data-k="${k}">${open ? T('sl.fold') : T('sl.more', { n: log.length - 5 })}</button>` : '') : '';
  return wscr(s, esc(SNAME(k)), UI.senFrom || '', `<div class="wsens">
    <div class="ltrow">${ltitle(esc(SNAME(k)))}${tg(T('mon.' + st), SEN_TG[st])}</div>
    <div class="q wcard gsg"><div class="gsr"><div class="gsrh"><b>${T('sen.log')}</b><span class="gtg${log.length ? ' warn' : ''}">${log.length ? T('sl.n', { n: log.length }) : T('sen.none')}</span></div>
      ${num}${kv([[T('sen.where'), esc(SX(k, 'where'))], [T('sen.what'), esc(senWhat(k))]])}${tl}</div></div></div>`);
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
/* ---------- 진짜 센서 상태 (2026-11-11 사용자 지시 — 한빛화학 근로자 센서 감시를 ThingsBoard 값으로) ----------
   온습도 · 전기(server.py TB_LINK)만 진짜이고 나머지 센서는 씨앗 그대로. 서버가 센서마다 마지막으로 받은 때 · 울리는 경보 여부 · 경보 기록 · 지금 값을 준다
   (홈 칸은 상태만 — 사용자가 고른 추천안. 지금 값은 같은 날 사용자 지시로 센서 하나 화면에만). 2분 넘게 값이 안 오면 모름(센서가 1초마다 보내서, 내 판단), 경보가 울리면 이상, 아니면 감시 중.
   경보 창 · 조치 완료는 아직 없다 — 센서 감시 카드에 이상만(같은 날, 내 판단 — 조치 기록이 공장주 · 지킴이 화면과 이어져 있어 상태부터). 홈을 보는 동안만 연결 */
const WTB_FAC = 'hanbit';  // server.py TB_FACTORY와 같다 — 센서 관련 PoC는 한빛화학 기준
const WTB = { es: null, ok: false, st: {}, sig: '', timer: null };
const wtbOf = (k) => { const x = WTB.ok && WTB.st[k]; if (!x) return null; return !x.ts || Date.now() - x.ts > 2 * 60 * 1000 ? 'unknown' : x.abn ? 'abn' : 'ok'; };
// 상태나 경보 기록이 바뀔 때만 다시 그린다. 마지막 확인 시각(센서 하나 화면)은 그 글자만 바꾼다
function wtbPaint() {
  const g = JSON.stringify([WTB.ok, Object.keys(WTB.st).map((k) => [wtbOf(k), (WTB.st[k].al || []).map((x) => `${x.day} ${x.start} ${x.end}`).join()])]);
  if (g !== WTB.sig) { WTB.sig = g; render(); }
  document.querySelectorAll('[data-wtbat]').forEach((el) => { const x = WTB.st[el.dataset.wtbat]; if (x && x.ts) el.textContent = plain(T('sl.got', { t: hms(x.ts) })); });
  document.querySelectorAll('[data-wtbv]').forEach((el) => { const [k, i] = el.dataset.wtbv.split(':'), v = ((WTB.st[k] || {}).vals || [])[i]; if (v) el.textContent = v[1] + v[2]; });
}
function wtbLive(on) {
  if (on && !WTB.es) {
    WTB.es = new EventSource('api/tb/live?app=1');  // 근로자 앱이라고 밝힌다 — 같은 브라우저에 지킴이 로그인이 있어도 근로자 것으로
    WTB.es.onmessage = (ev) => { const j = JSON.parse(ev.data); Object.assign(WTB, { ok: !!j.ok, st: j.st || {} }); wtbPaint(); };
    WTB.timer = setInterval(wtbPaint, 15000);  // 값이 끊기면 아무것도 안 오니 시계로 모름을 본다
  } else if (!on && WTB.es) { WTB.es.close(); WTB.es = null; clearInterval(WTB.timer); Object.assign(WTB, { ok: false, st: {}, sig: '' }); }
}
function statusCard(s, vis) {
  const watching = vis.filter((a) => a.status === 'watch'), open = vis.filter((a) => a.status === 'open' || a.status === 'remind');
  const notifOff = pref.get('notif') !== 'on';
  const sens = SITE_SENSORS(ACC.factory).map((k) => { const tb = wtbOf(k); return tb ? (tb === 'unknown' ? 'unknown' : 'watch') : SIM.sensor(s, k).state; });
  const tbAbn = SITE_SENSORS(ACC.factory).filter((k) => wtbOf(k) === 'abn');
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
  } else if (tbAbn.length) {
    // 진짜 센서 경보 — 경보 창 · 조치 완료 없이 이상만 (2026-11-11)
    now = line('bad', 'alert', T('h.alarms', { n: tbAbn.length }), tbAbn.map((k) => esc(SNAME(k))).join('<br>'));
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
      ${card('self', 'camera', T('tile.self'), `<span class="hpill">${T('self.pill')}</span>`).replace('class="hkc"', 'class="hkc wselfc"')}
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
/* ---------- W9 자가진단 (2026-11-11 사용자 지시 — 지킴이 앱 현장점검처럼 근로자가 사진을 찍으면 무엇을 봐야 하는지 알려 준다) ----------
   작업 시작 전이나 정해진 점검 시간에 쓴다(사용자). 장비나 작업 자리를 한 장 찍으면 AI가 무슨 장비인지 알아보고
   주의 깊게 볼 점 · 흔히 고쳐야 하는 것(장비마다 정해 둔 것) · 이 사진에서 보이는 것(AI)을 보여 준다.
   알려 주기만 한다 — 근로자가 답하거나 고르는 것, 공장주 · 지킴이에게 보내기, 확인받기, 기록은 없다(사용자 결정).
   장비는 지킴이 앱 현장점검과 같은 종이 6번 15가지 + 기타(바닥 · 소화기처럼 장비가 아닌 것 — 이 사진에서 보이는 것만). 이름은 근로자용으로 줄임(내 판단).
   사진은 한 장, 서버에 올리지 않고 이 화면에서만 본다(기록이 없어서 — 내 판단). PC는 [시험 사진].
   찍기는 지킴이 앱처럼 앱 안 카메라(아래 WCAM, 같은 날 사용자 지시 — 처음엔 폰 기본 카메라였다).
   AI는 흉내 — 시험 사진 다섯 장은 모두 기타 + 사진마다 정해 둔 글, 폰으로 찍은 사진은 사진마다 정해진 장비 하나 + 그 장비의 흔한 문제 하나 또는 없음.
   글은 [한국어, 베트남어, 영어] — 베트남어 · 영어는 초벌 번역(원어민 검수 전). 주의 깊게 볼 점은 seed.js EQUIP 점검 포인트를 근로자 말투로 바꿨고,
   흔히 고쳐야 하는 것은 새로 씀(가설) */
const SELF_EQ = [
  { n: ['지게차', 'Xe nâng', 'Forklift'],
    look: [['후진할 때 경보음이 울리고 등이 켜지는지 봐요.', 'Khi lùi xe, còi báo và đèn có hoạt động không.', 'Check the reverse alarm sounds and the lights work.'],
      ['포크에 사람이 타거나 앞이 가리게 짐을 싣지 않아요.', 'Không để người đứng trên càng nâng, không chất hàng che tầm nhìn.', 'Nobody rides on the forks, and loads must not block the view.'],
      ['운전할 때는 안전띠를 매요.', 'Thắt dây an toàn khi lái xe.', 'Wear the seat belt while driving.']],
    fix: [['헤드가드나 짐받이가 없거나 휘어 있음', 'Thiếu hoặc cong khung bảo vệ đầu, tấm chắn hàng', 'Head guard or backrest missing or bent'],
      ['후진 경보음이나 전조등이 고장 남', 'Còi lùi hoặc đèn pha bị hỏng', 'Reverse alarm or headlights broken'],
      ['타이어가 닳거나 기름이 샘', 'Lốp mòn hoặc rò dầu', 'Worn tires or oil leaks']] },
  { n: ['크레인', 'Cần trục', 'Crane'],
    look: [['매단 짐 아래에 들어가지 않아요.', 'Không đứng dưới hàng đang treo.', 'Never stand under a hanging load.'],
      ['훅에 걸쇠(해지장치)가 있는지 봐요.', 'Móc có chốt an toàn không.', 'Check the hook has a safety latch.'],
      ['비상정지 단추가 바로 눌리는지 봐요.', 'Nút dừng khẩn cấp có bấm được ngay không.', 'Check the emergency stop button works.']],
    fix: [['와이어로프 가닥이 끊어지거나 꼬임', 'Cáp bị đứt sợi hoặc bị xoắn', 'Broken strands or kinks in the wire rope'],
      ['훅 걸쇠가 없거나 부러짐', 'Chốt móc bị mất hoặc gãy', 'Hook latch missing or broken'],
      ['과부하 방지장치가 작동하지 않음', 'Thiết bị chống quá tải không hoạt động', 'Overload limiter not working']] },
  { n: ['용접기', 'Máy hàn', 'Welding machine'],
    look: [['둘레에 탈 물건이 없는지 봐요.', 'Xung quanh không có vật dễ cháy.', 'Check nothing flammable is nearby.'],
      ['케이블이 물기 위를 지나지 않는지 봐요.', 'Dây cáp không nằm trên chỗ ướt.', 'Check cables are not lying in water.'],
      ['용접 연기를 빨아들이는 장치를 켜요.', 'Bật máy hút khói hàn.', 'Turn on the fume extractor.']],
    fix: [['케이블 피복이 벗겨짐', 'Vỏ cáp bị bong tróc', 'Damaged cable insulation'],
      ['자동 전격 방지기가 없음', 'Không có thiết bị chống giật tự động', 'No anti-shock device'],
      ['소화기가 가까이 없음', 'Không có bình chữa cháy ở gần', 'No fire extinguisher nearby']] },
  { n: ['리프트', 'Thang nâng hàng', 'Goods lift'],
    look: [['화물용 리프트에는 사람이 타지 않아요.', 'Không đi thang nâng chở hàng.', 'Never ride a goods lift.'],
      ['문을 닫아야 움직이는지 봐요.', 'Thang chỉ chạy khi cửa đã đóng.', 'Check it moves only with the door closed.']],
    fix: [['문이 열린 채로 움직임', 'Thang chạy khi cửa còn mở', 'Moves with the door open'],
      ['승강로 둘레 울타리가 없음', 'Không có rào quanh giếng thang', 'No fence around the shaft'],
      ['탑승 금지 표지가 없음', 'Không có biển cấm người đi', 'No "no riders" sign']] },
  { n: ['사다리', 'Thang', 'Ladder'],
    look: [['펼침 고정장치를 끝까지 걸어요.', 'Khóa thanh giằng cho chắc.', 'Lock the spreader fully.'],
      ['맨 위 발판에는 올라서지 않아요.', 'Không đứng lên bậc trên cùng.', "Don't stand on the top step."]],
    fix: [['발판이나 다리에 금이 가거나 휨', 'Bậc hoặc chân thang bị nứt, cong', 'Cracked or bent steps or legs'],
      ['다리 끝 미끄럼 막이가 닳거나 없음', 'Đế chống trượt bị mòn hoặc mất', 'Worn or missing anti-slip feet']] },
  { n: ['컨베이어', 'Băng tải', 'Conveyor'],
    look: [['비상정지 줄이나 단추에 손이 닿는지 봐요.', 'Dây hoặc nút dừng khẩn cấp có với tới được không.', 'Check you can reach the emergency stop.'],
      ['돌아가는 벨트에 손을 넣지 않아요.', 'Không cho tay vào băng tải đang chạy.', 'Keep your hands off the moving belt.']],
    fix: [['벨트와 풀리가 맞물리는 곳에 덮개가 없음', 'Không có nắp che chỗ băng tải và puli ăn khớp', 'No guard where the belt meets the pulley'],
      ['비상정지가 작동하지 않음', 'Dừng khẩn cấp không hoạt động', "Emergency stop doesn't work"]] },
  { n: ['산업용 로봇', 'Robot công nghiệp', 'Industrial robot'],
    look: [['로봇이 움직이는 범위 안에 들어가지 않아요.', 'Không vào vùng robot hoạt động.', "Stay out of the robot's working area."],
      ['울타리 문을 열면 로봇이 멈추는지 봐요.', 'Mở cửa rào thì robot có dừng không.', 'Check the robot stops when the fence door opens.']],
    fix: [['울타리가 없거나 열려 있음', 'Không có rào hoặc rào bị mở', 'Fence missing or left open'],
      ['조작기(교시 펜던트) 비상정지가 고장 남', 'Nút dừng khẩn cấp trên bộ điều khiển cầm tay bị hỏng', 'Teach pendant emergency stop broken']] },
  { n: ['사출성형기', 'Máy ép phun', 'Injection molding machine'],
    look: [['문을 열면 금형이 멈추는지 봐요.', 'Mở cửa thì khuôn có dừng không.', 'Check the mold stops when the door opens.'],
      ['뜨거운 실린더에 맨손을 대지 않아요.', 'Không chạm tay trần vào xi lanh nóng.', "Don't touch the hot barrel with bare hands."]],
    fix: [['문을 열어도 기계가 움직임', 'Mở cửa máy vẫn chạy', 'Machine runs with the door open'],
      ['유압 호스에서 기름이 샘', 'Ống thủy lực bị rò dầu', 'Hydraulic hose leaking']] },
  { n: ['선반, 밀링, CNC', 'Máy tiện, phay, CNC', 'Lathe, milling, CNC'],
    look: [['돌아가는 공작물에 장갑 낀 손을 대지 않아요.', 'Không đeo găng tay chạm vào phôi đang quay.', "Don't touch spinning parts with gloves on."],
      ['문을 열면 주축이 멈추는지 봐요.', 'Mở cửa thì trục chính có dừng không.', 'Check the spindle stops when the door opens.'],
      ['칩은 손 대신 솔로 치워요.', 'Dọn phoi bằng chổi, không dùng tay.', 'Clear chips with a brush, not your hand.']],
    fix: [['척이나 커터 둘레에 덮개가 없음', 'Không có nắp che mâm cặp hoặc dao cắt', 'No guard around the chuck or cutter'],
      ['척 핸들을 꽂아 둔 채로 둠', 'Để quên tay vặn trên mâm cặp', 'Chuck key left in the chuck']] },
  { n: ['레이저 커팅기', 'Máy cắt laser', 'Laser cutter'],
    look: [['문을 열면 레이저가 꺼지는지 봐요.', 'Mở cửa thì laser có tắt không.', 'Check the laser turns off when the door opens.'],
      ['둘레에 탈 물건이 없는지 봐요.', 'Xung quanh không có vật dễ cháy.', 'Check nothing flammable is nearby.']],
    fix: [['연기를 빨아들이는 장치가 꺼져 있음', 'Máy hút khói không chạy', 'Fume extractor is off'],
      ['소화기가 가까이 없음', 'Không có bình chữa cháy ở gần', 'No fire extinguisher nearby']] },
  { n: ['프레스', 'Máy dập', 'Press'],
    look: [['방호장치(빛 센서, 두 손 단추)가 켜져 있는지 봐요.', 'Thiết bị bảo vệ (cảm biến ánh sáng, nút hai tay) có đang bật không.', 'Check the safety device (light curtain, two-hand button) is on.'],
      ['금형 사이에 손을 넣지 않아요.', 'Không cho tay vào giữa khuôn.', 'Never put your hands between the dies.']],
    fix: [['방호장치를 끄거나 떼어 놓음', 'Thiết bị bảo vệ bị tắt hoặc tháo ra', 'Safety device turned off or removed'],
      ['페달에 덮개가 없음', 'Bàn đạp không có nắp che', 'No cover on the foot pedal'],
      ['금형을 바꿀 때 안전블록을 안 씀', 'Không dùng khối an toàn khi thay khuôn', 'No safety block used when changing dies']] },
  { n: ['압력용기', 'Bình chịu áp lực', 'Pressure vessel'],
    look: [['압력계 바늘이 정상 범위 안에 있는지 봐요.', 'Kim đồng hồ áp suất có nằm trong vùng bình thường không.', 'Check the pressure gauge is in the normal range.'],
      ['새는 소리나 이상한 냄새가 없는지 봐요.', 'Không có tiếng xì hoặc mùi lạ.', 'Check there is no hissing or strange smell.']],
    fix: [['안전밸브 봉인이 뜯겨 있음', 'Niêm phong van an toàn bị bóc', 'Safety valve seal broken'],
      ['몸체에 녹이 슬거나 샘', 'Thân bình bị gỉ hoặc rò', 'Rust or leaks on the body'],
      ['안전검사 기간이 지남', 'Quá hạn kiểm định an toàn', 'Safety inspection overdue']] },
  { n: ['분쇄기, 파쇄기, 전단기', 'Máy nghiền, máy hủy, máy cắt', 'Pulverizer, crusher, shear'],
    look: [['막혔을 때는 전원을 끄고 잠근 뒤에 빼요.', 'Khi bị kẹt, tắt và khóa nguồn rồi mới gỡ.', 'When it jams, switch off and lock the power before clearing it.'],
      ['넣는 곳이나 날 앞에 손을 넣지 않아요.', 'Không cho tay vào miệng nạp hoặc trước lưỡi dao.', 'Keep your hands out of the feed opening and away from the blade.']],
    fix: [['넣는 곳이나 날 앞에 덮개가 없음', 'Không có nắp che miệng nạp hoặc lưỡi dao', 'No guard on the feed opening or blade'],
      ['비상정지가 작동하지 않음', 'Dừng khẩn cấp không hoạt động', "Emergency stop doesn't work"]] },
  { n: ['배합기, 혼합기', 'Máy trộn', 'Mixer'],
    look: [['뚜껑을 열면 날개가 멈추는지 봐요.', 'Mở nắp thì cánh trộn có dừng không.', 'Check the blades stop when the lid opens.'],
      ['청소하러 들어갈 때는 전원을 잠가요.', 'Khóa nguồn trước khi vào vệ sinh.', 'Lock the power before going in to clean.']],
    fix: [['원료 넣는 곳에 덮개나 망이 없음', 'Không có nắp hoặc lưới ở chỗ đổ nguyên liệu', 'No cover or mesh on the feed opening'],
      ['접지선이 빠져 있음', 'Dây tiếp địa bị tuột', 'Ground wire disconnected']] },
  { n: ['롤러기', 'Máy cán', 'Roller machine'],
    look: [['급정지 장치(손, 무릎, 몸으로 누르는 것)를 누르면 바로 서는지 봐요.', 'Bấm thiết bị dừng gấp (bằng tay, đầu gối, thân) thì máy có dừng ngay không.', 'Check the emergency stop bar stops it right away.'],
      ['장갑 낀 손을 롤러 가까이 대지 않아요.', 'Không đưa tay đeo găng lại gần trục cán.', "Keep gloved hands away from the rollers."]],
    fix: [['롤러가 맞물리는 곳에 가드가 없음', 'Không có tấm chắn chỗ hai trục ăn khớp', 'No guard at the roller nip point'],
      ['급정지 장치가 늦게 서거나 고장 남', 'Thiết bị dừng gấp chậm hoặc bị hỏng', 'Emergency stop is slow or broken']] },
  { n: ['기타', 'Khác', 'Other'], look: [], fix: [] },
];
const SELF_ETC = SELF_EQ.length - 1;
// 시험 사진 — 지킴이 앱과 같은 다섯 장(photos/), 모두 기타. find: 이 사진에서 보이는 것 (없으면 null)
const SELF_PHOTOS = [
  { src: 'photos/1_exit_door.png', find: ['비상구 바로 옆에 짐이 높이 쌓여 있어요. 문 앞이 막히지 않게 해요.', 'Hàng xếp cao ngay cạnh cửa thoát hiểm. Đừng để chắn lối cửa.', 'Goods are stacked high right next to the emergency exit. Keep the door clear.'] },
  { src: 'photos/2_extinguisher.png', find: null },
  { src: 'photos/3_wet_floor.png', find: ['통로 바닥에 물이 고여 있어요. 미끄러지지 않게 닦아야 해요.', 'Có nước đọng trên lối đi. Cần lau khô để không bị trượt.', 'Water is pooled on the walkway. Wipe it up so no one slips.'] },
  { src: 'photos/4_panel_open.png', find: ['분전반 문이 열려 있고 전선이 드러나 있어요. 손대지 마세요.', 'Tủ điện đang mở, dây điện lộ ra. Không được chạm vào.', "The electrical panel is open with wires exposed. Don't touch it."] },
  { src: 'photos/5_rack.png', find: ['랙 위쪽에 짐이 높이 쌓여 있어요. 떨어지지 않게 묶였는지 봐요.', 'Hàng xếp cao trên giá. Kiểm tra đã buộc chắc chưa để không rơi.', 'Goods are stacked high on the rack. Check they are tied down so they cannot fall.'] },
];
const LX = (t) => t[Math.max(0, LANGS.findIndex((l) => l.id === LANG))];
// AI 흉내 — 시험 사진은 정해 둔 것, 폰 사진은 파일 이름 · 크기로 정해지는 장비 하나와 그 장비의 흔한 문제 하나(셋 중 하나는 없음)
function selfAi(x) {
  if (x.test) return { eq: SELF_ETC, find: SELF_PHOTOS[x.test - 1].find };
  let h = 7;
  for (const c of x.key) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
  const eq = h % SELF_EQ.length, fx = SELF_EQ[eq].fix;
  return { eq, find: fx.length && (h >>> 4) % 3 ? fx[(h >>> 8) % fx.length] : null };
}
const selfIn = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', hidden: true });
selfIn.setAttribute('capture', 'environment');  // 폰에서는 카메라 앱이 바로 열린다
selfIn.addEventListener('change', () => { const f = selfIn.files[0]; selfIn.value = ''; if (f) selfStart({ src: URL.createObjectURL(f), key: `${f.name}:${f.size}:${f.lastModified}` }); });
document.body.appendChild(selfIn);
// 앱 안 카메라 (2026-11-11 사용자 지시 — 지킴이 앱처럼). 지킴이 카메라(guard.js CAM)와 같은 화면 조각(.gcv)과 차례:
// 셔터 → 찍은 사진을 멈춰 보이고 [다시 찍기] / [사진 사용] → 사용하면 자가진단으로. 한 장이라 장수 점은 없다. 플래시 · 확대는 폰이 되는 것만.
// 브라우저 규칙상 https · localhost에서만 켜진다 — 아니면 전처럼 폰 기본 카메라, 못 켜면(권한 거절 · 카메라 없음) [카메라 앱으로] [시험 사진]
const WCAM = { open: false, st: '', shot: null, stream: null, torch: false, flash: false, zoom: null, zm: 1 };
function wcamOpen() {
  if (!window.isSecureContext || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) { selfIn.click(); return; }  // 누른 그 순간에 열어야 폰이 막지 않는다
  Object.assign(WCAM, { open: true, shot: null }); wcamStart();
}
function wcamStart() {
  WCAM.st = 'start'; wcamPaint();
  navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
    .then((st) => {
      if (!WCAM.open) { st.getTracks().forEach((t) => t.stop()); return; }
      WCAM.stream = st; const v = $('#camv video'), tr = st.getVideoTracks()[0], cap = tr && tr.getCapabilities ? tr.getCapabilities() : {};
      Object.assign(WCAM, { torch: !!cap.torch, flash: false, zoom: cap.zoom && cap.zoom.max >= 2 ? cap.zoom : null, zm: 1 });
      v.onloadedmetadata = () => { v.play().catch(() => {}); if (WCAM.st === 'start') { WCAM.st = 'live'; wcamPaint(); } };  // 영상 크기가 잡힌 뒤에 셔터를 켠다
      v.srcObject = st;
    })
    .catch(() => { if (WCAM.open) { WCAM.st = 'off'; wcamPaint(); } });
}
function wcamStop() { if (WCAM.stream) { WCAM.stream.getTracks().forEach((t) => t.stop()); WCAM.stream = null; } }
function wcamClose(keep) {
  wcamStop(); WCAM.open = false; WCAM.st = '';
  if (WCAM.shot && !keep) URL.revokeObjectURL(WCAM.shot.url);
  WCAM.shot = null; wcamPaint();
}
// 화면은 #app 밖에 따로 둔다 — 다시 그릴 때마다 카메라 영상이 끊기지 않게 (지킴이와 같음)
function wcamPaint() {
  let el = $('#camv');
  if (!WCAM.open) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div'); el.id = 'camv'; el.className = 'gcv'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', plain(T('self.shoot')));
    el.innerHTML = '<div class="gcvh"></div><div class="gcvb"><video playsinline muted autoplay></video><img alt=""><p></p><div class="gcvo"></div><div class="gcvz"></div></div><div class="gcvl"><div class="gcvd"></div><div class="gcvf"></div></div>';
    document.body.appendChild(el);
  }
  const st = WCAM.st;
  el.dataset.st = st;
  el.querySelector('.gcvh').innerHTML = `<button class="gcvx" data-act="wcamClose" aria-label="${plain(T('close'))}">${I('close', 24)}</button><b>${T('tile.self')}</b>`;
  if (st === 'last') el.querySelector('.gcvb img').src = WCAM.shot.url;
  el.querySelector('.gcvo').innerHTML = '<span></span>'
    + (WCAM.torch ? `<button class="gcvlt${WCAM.flash ? ' on' : ''}" data-act="wcamFlash" aria-label="${plain(T('cam.flash'))}" aria-pressed="${WCAM.flash}">${I('bolt', 22)}</button>` : '');
  el.querySelector('.gcvz').innerHTML = WCAM.zoom ? `<span class="gcvzm">${[1, 2].map((z) => `<button class="${WCAM.zm === z ? 'on' : ''}" data-act="wcamZoom" data-v="${z}" aria-pressed="${WCAM.zm === z}">${z}×</button>`).join('')}</span>` : '';
  el.querySelector('.gcvb p').innerHTML = st === 'start' ? T('cam.start') : st === 'off' ? `${T('cam.off')}<small>${T('cam.offSub')}</small>` : '';
  el.querySelector('.gcvf').innerHTML = st === 'last' ? `<button class="gcvbt" data-act="wcamRetake">${T('self.again')}</button><button class="gcvbt ok" data-act="wcamUse">${T('cam.use')}</button>`
    : st === 'off' ? `<button class="gcvbt" data-act="wcamApp">${I('camera', 20)}${T('cam.app')}</button><button class="gcvbt" data-act="wcamTest">${I('image', 20)}${T('self.test')}</button>`
    : `<span></span><button class="gcvsh" data-act="wcamSnap" aria-label="${plain(T('cam.snap'))}"${st === 'live' ? '' : ' disabled'}></button><span></span>`;
}
addEventListener('hashchange', () => { if (WCAM.open) wcamClose(); });  // 폰의 뒤로 가기
// 자가진단 결과를 옆으로 밀어 넘기기 — 왼쪽으로 밀면 다음 장 (지킴이 사진 크게 보기와 같은 방식). 세로로 미는 것은 화면 스크롤
let swX = null, swY = null;
document.addEventListener('pointerdown', (e) => { const on = e.target.closest('[data-swipe]'); swX = on ? e.clientX : null; swY = on ? e.clientY : null; });
document.addEventListener('pointerup', (e) => {
  if (swX == null) return; const dx = e.clientX - swX, dy = e.clientY - swY; swX = null;
  if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
  ACTS.selfStep({ v: dx < 0 ? 1 : -1 });
});
// 다른 앱에 다녀오면 카메라가 꺼져 있을 수 있다 — 다시 켠다
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && WCAM.open && WCAM.stream && WCAM.stream.getVideoTracks().every((t) => t.readyState === 'ended')) { wcamStop(); if (WCAM.st === 'live') wcamStart(); }
});
// 찍은 것은 차례로 쌓아 옆으로 넘겨 본다 (같은 날 사용자 지시 — 처음엔 다시 찍으면 앞 결과가 사라졌다). 새로 찍으면 맨 뒤에 붙고 그 장을 보인다.
// 닫기는 홈으로만 — 다시 들어오면 그대로. 이 폰의 메모리에만 있어 앱을 다시 열면 비워진다(기록 없음 — 내 판단)
function selfStart(x) {
  const me = { ...x, st: 'wait' };
  UI.selfs.push(me); UI.selfI = UI.selfs.length - 1; UI.selfDir = 1;
  R.go('self'); render();
  setTimeout(() => { Object.assign(me, selfAi(me), { st: 'done' }); render(); }, 1800);
}
function selfScreen(s) {
  const all = UI.selfs, n = all.length;
  if (!n) return wscr(s, T('tile.self'), '', `${ltitle(T('tile.self'))}
    <div class="q wcard"><div class="small ink">${T('self.intro')}</div></div>`,
  `<div class="ft"><button class="btn" data-act="selfShoot">${I('camera', 22)} ${T('self.shoot')}</button><button class="btn ghost sm" data-act="selfTest">${T('self.test')}</button></div>`);
  const i = Math.min(UI.selfI, n - 1), x = all[i], dir = UI.selfDir;
  UI.selfDir = 0;  // 넘길 때 한 번만 미끄러지게 (AI가 끝나 다시 그릴 때는 그대로)
  // 넘기기 — 사진 위 양옆 단추(지킴이 사진 크게 보기와 같은 꼴)와 사진 밑 점, 화면을 옆으로 밀어도 넘어간다(data-swipe)
  const nav = n > 1 ? `<button class="gpvb prev" data-act="selfStep" data-v="-1"${i ? '' : ' disabled'} aria-label="${plain(T('self.prev'))}">${I('chevron', 22)}</button><button class="gpvb next" data-act="selfStep" data-v="1"${i < n - 1 ? '' : ' disabled'} aria-label="${plain(T('self.next'))}">${I('chevron', 22)}</button>` : '';
  const ph = `<div class="wsph"><img src="${esc(x.src)}" alt="">${x.st === 'wait' ? `<span class="wsai"><i class="gspin"></i>${T('self.wait')}</span>` : ''}${nav}</div>
    ${n > 1 ? `<div class="wsdots" aria-label="${plain(T('self.nth', { i: i + 1, m: n }))}">${all.map((_, j) => `<i${j === i ? ' class="on"' : ''}></i>`).join('')}</div>` : ''}`;
  const e = x.st === 'wait' ? null : SELF_EQ[x.eq];
  const list = (k, items) => (items.length ? `<section class="q wcard"><div class="wct"><b>${T(k)}</b></div><ul class="wsl">${items.map((t) => `<li>${esc(LX(t))}</li>`).join('')}</ul></section>` : '');
  return wscr(s, T('tile.self'), '', `${ltitle(T('tile.self'))}<div class="wspg${dir ? (dir > 0 ? ' inr' : ' inl') : ''}" data-swipe>${ph}
    ${e ? `<div class="wseq"><b>${esc(LX(e.n))}</b>${x.own ? '' : tg(T('self.aiTag'))}<button class="fbtn line fsub" data-act="selfOther">${T('self.other')}</button></div>
    ${list('self.look', e.look)}${list('self.fix', e.fix)}
    <section class="q wcard"><div class="wct"><b>${T('self.seen')}</b></div>${x.find ? `<p class="wsp">${esc(LX(x.find))}</p>` : `<p class="wsp wsnone">${T('self.none')}</p>`}</section>` : ''}</div>`,
  `<div class="ft"><div class="row"><button class="btn ghost" data-act="selfClose">${T('close')}</button><button class="btn" data-act="selfShoot">${I('camera', 20)} ${T('self.new')}</button></div></div>`)
  + (UI.sheet === 'self' ? `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div><div class="mid">${T('self.pickT')}</div>
    <section class="kpsec"><div class="kpscr"><div class="kplist">${SELF_EQ.map((q, i) => `<button class="kprow${x.eq === i ? ' on' : ''}" data-act="selfPick" data-v="${i}"><span>${esc(LX(q.n))}</span></button>`).join('')}</div></div></section>
    <button class="btn ghost" data-act="closeSheet">${T('close')}</button></div>` : '');
}

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
  else if (p[0] === 'self') html = selfScreen(s);
  else if (p[0] === 'sensors') html = sensorsScreen(s);
  else if (p[0] === 'sensor' && p[1]) html = sensorScreen(s, p[1]);
  else {
    // 다른 사람이 조치한 경보를 처음 보면 한 번 알려 준다 (W2-바)
    const other = visibleAlarms(s).find((a) => a.status === 'watch' && SIM.lastAck(a).by !== ME && !seen(a.id + a.acks.length));
    html = other ? othersAcked(s, other) : home(s);
  }
  wtbLive(ACC.factory === WTB_FAC && (html.includes('whome') || html.includes('wsens')));  // 진짜 센서 상태 연결은 홈(센서 감시 카드) · 센서 목록 · 센서 하나에서만
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
  // 자가진단 (2026-11-11) — 찍기 · 시험 사진(차례로 돌림) · 장비 바꾸기 · 다시 찍기(처음 화면) · 닫기(홈)
  senOpen({ k, from }) { UI.senFrom = from || ''; R.go('sensor/' + k); },  // 센서 하나 — 뒤로 가면 들어온 곳(홈 · 센서 목록)
  senMore({ k }) { UI.senMore[k] = !UI.senMore[k]; render(); },  // 경보 기록 펼치기 · 접기
  selfShoot() { wcamOpen(); },
  // 앱 안 카메라 — 셔터는 보이는 3:4 칸 그대로 가운데를 잘라 남긴다(지킴이와 같음)
  wcamSnap() {
    const v = $('#camv video');
    if (WCAM.st !== 'live' || !v || !v.videoWidth) return;
    WCAM.st = 'snap';
    const b = $('#camv .gcvb');
    b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
    const r = b.clientWidth / b.clientHeight, vw = v.videoWidth, vh = v.videoHeight, sw = Math.min(vw, vh * r), sh = sw / r;
    camShrink(v, sw, sh, (vw - sw) / 2, (vh - sh) / 2).then((p) => { if (!WCAM.open) { URL.revokeObjectURL(p.url); return; } WCAM.shot = p; WCAM.st = 'last'; wcamPaint(); });
    wcamPaint();
  },
  wcamRetake() { URL.revokeObjectURL(WCAM.shot.url); WCAM.shot = null; if (WCAM.stream) { WCAM.st = 'live'; wcamPaint(); } else wcamStart(); },
  wcamUse() { const p = WCAM.shot; wcamClose(true); selfStart({ src: p.url, key: `cam:${p.w}x${p.h}:${p.b.size}` }); },
  wcamClose() { wcamClose(); },
  wcamApp() { wcamClose(); selfIn.click(); },
  wcamTest() { wcamClose(); ACTS.selfTest(); },
  wcamFlash() {
    const tr = WCAM.stream && WCAM.stream.getVideoTracks()[0]; if (!tr) return;
    WCAM.flash = !WCAM.flash;
    tr.applyConstraints({ advanced: [{ torch: WCAM.flash }] }).catch(() => { WCAM.flash = false; WCAM.torch = false; wcamPaint(); });
    wcamPaint();
  },
  wcamZoom({ v }) {
    const tr = WCAM.stream && WCAM.stream.getVideoTracks()[0], z = WCAM.zoom; if (!tr || !z) return;
    WCAM.zm = +v;
    tr.applyConstraints({ advanced: [{ zoom: Math.min(z.max, Math.max(z.min, WCAM.zm)) }] }).catch(() => { WCAM.zoom = null; WCAM.zm = 1; wcamPaint(); });
    wcamPaint();
  },
  selfTest() { UI.selfN = ((UI.selfN || 0) % SELF_PHOTOS.length) + 1; selfStart({ src: SELF_PHOTOS[UI.selfN - 1].src, test: UI.selfN }); },
  selfOther() { UI.sheet = 'self'; render(); },
  selfPick({ v }) { UI.sheet = null; Object.assign(UI.selfs[UI.selfI], { eq: +v, own: true }); render(); },
  selfStep({ v }) { const j = UI.selfI + +v; if (j < 0 || j >= UI.selfs.length) return; UI.selfI = j; UI.selfDir = +v; render(); },
  selfClose() { R.go(''); },
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
