// 공장주 웹 — 시안 O1·O2·O3. 로그인한 공장주의 공장만 보인다. PC와 휴대폰 둘 다 맞춘다.
// 시제품의 센서 경보는 대성정밀에만 있다 (가상 데이터).
// 로그인한 공장주 계정에 따라 web.js가 정한다
let ME = '박대표';
let FID = 'daesung';
const UI = { dlg: null, openInsp: 'i0828', showOk: false, menu: false };

const TABS = [['', '지금 현황'], ['rec/insp', '기록·고칠 것'], ['soon/proof', '점검 증빙'], ['notice', '안전 공지'], ['workers', '근로자'], ['voice', '의견']];
const PAGE = {
  '': ['우리 공장 지금 현황', '센서 경보와 고칠 것을 한눈에 확인하세요.'],
  rec: ['기록 · 고칠 것', '지킴이 점검 결과를 보고, 고친 항목은 "고쳤어요"로 알려 주세요. 기록은 고칠 수 없어요.'],
  memo: ['작업 예정 알리기', '평소와 다른 작업이 있으면 적어 주세요. AI가 읽고 그 시간 경보 기준을 맞춰요.'],
  notice: ['안전 공지', '위험성평가 결과와 안전 수칙을 근로자에게 알려요. 외국인 근로자에게는 AI 번역으로 가요.'],
  workers: ['근로자', '경보와 안전 공지를 받는 사람이에요. 새로 온 사람은 초대하고, 그만둔 사람은 빼요.'],
  voice: ['받은 의견', '근로자가 보낸 위험 신고와 제안이에요. 읽고 답하면 근로자 앱에 알림이 가요.'],
};
function frame(active, body, split, key = active) {
  const [title, desc] = PAGE[key] || [(TABS.find(([p]) => p === active) || ['', '준비 중'])[1], '시제품 다음 차례에 만들어요.'];
  return webFrame({ brand: `${FACTORIES[FID].name} 안전 현황`, org: '산업안전지킴이', who: `${ME} 대표 · ${FACTORIES[FID].name}`,
    tabs: TABS, active, title, desc, body, split, menu: UI.menu });
}
const myAlarms = (s) => s.alarms.filter((a) => alarmFid(a) === FID);
// 2026-10-13 재점검 — 공장주가 고친 사진을 보내면 지킴이가 2주 안에 보고 고쳐짐·안 고쳐짐을 정한다. 안 고쳐진 것은 다음 점검 때 다시 본다
// 2026-10-26 지킴이 앱 개선 관리처럼 짧게 — 카드 머리 오른쪽 상태 칸
const STATE_WORD = { todo: '고칠 것', claimed: '지킴이 확인 기다림', fixed: '고쳐짐', back: '다시 고칠 것' };

function myItems(s) {
  const out = [];
  s.inspections.filter((i) => i.fid === FID && APPROVED(i)).forEach((ins) => ins.items.filter(TRACKED).forEach((it) => out.push({ ins, it, st: itemState(it) })));
  return out;
}

/* ---------- O1 지금 현황 ---------- */
function now(s) {
  const all = myAlarms(s), live = all.filter(SIM.live);
  const items = myItems(s);
  const cnt = (k) => items.filter((e) => e.st === k).length;
  const open = live.filter((a) => a.status !== 'watch').length;
  const last = s.inspections.find((i) => i.fid === FID && APPROVED(i));
  const verdict = live.length
    ? `<div class="verdict bad"><span class="ic">⚠</span><div><div class="v">경보 ${live.length}건</div><div class="small">${open ? `조치 안 됨 ${open}건 · ` : ''}근로자 앱으로도 같은 경보가 가요</div></div></div>`
    : `<div class="verdict"><span class="ic">✓</span><div><div class="v">지금 이상 없음</div><div class="small">센서 ${SITE_SENSORS(FID).length}대 감시 중 · ${hm(s.clock)} 확인</div></div></div>`;
  const alarmCards = live.map((a) => {
    const k = SIM.lastAck(a);
    const st = a.status === 'open' ? '<b>조치 안 됨</b>' : a.status === 'remind' ? `<b>아직 이상 · 다시 알림 중</b>${a.snoozes ? ` · ${a.snoozes}번 미뤄짐` : ''}` : `${esc(k.by)} ${hm(k.at)} ${k.re ? '다시 조치' : '조치 완료'} · 지켜보는 중`;
    return `<div class="acard2"><div class="kt">⚠ ${esc(SIM.title(a))}</div>
      <div class="small">${SENSORS[a.key].where} · ${hm(a.start)}부터${a.ratio ? ` · 평소보다 ${a.ratio}배` : ''}</div>
      <div class="small ink">${st}</div>
      ${a.escalated ? `<div class="warn">📣 근로자가 미루기를 ${a.snoozes}번 다 썼어요. 현장을 직접 확인해 주세요.</div>` : ''}
      <div class="row">${a.status !== 'watch' ? `<button class="btn sm red" data-act="ack" data-id="${a.id}">${a.acks.length ? '다시 조치했어요' : '조치 완료'}</button>` : ''}
      ${(s.faults || []).some((f) => f.key === a.key && f.status === 'open') ? '<span class="pill gray">고장 신고함 · 운영자 확인 기다림</span>' : `<button class="more" data-act="fault" data-k="${a.key}">센서 고장 같아요</button>`}</div></div>`;
  }).join('');
  const bad = items.length, fixed = cnt('fixed');
  const ended = all.filter((a) => !SIM.live(a));
  return frame('', `
    ${verdict}
    ${alarmCards ? `<div class="kgrid">${alarmCards}</div>` : ''}
    <div class="kgrid">
      ${kcard({ t: '고칠 것', v: cnt('back') + cnt('todo'), unit: '개', tone: cnt('back') + cnt('todo') ? 'todo' : '',
        rows: [['재점검에서 안 고쳐짐', cnt('back')], ['아직 안 고침', cnt('todo')], ['재점검 기다림', cnt('claimed')]], go: 'rec/insp', more: '고칠 것 보러 가기' })}
      ${kcard({ t: '개선', v: pct(fixed, bad), unit: bad ? '%' : '', rows: [['요청', bad + '건'], ['고쳐짐 확인', fixed + '건']], go: 'rec/insp' })}
      ${kcard({ t: '지킴이 방문', v: s.visits[FID] ? s.visits[FID].replace(/\(.\)/, '').split(' ')[0] : '—', unit: '',
        rows: [['시간', s.visits[FID] ? s.visits[FID].split(' ').slice(1).join(' ') : '정해지지 않음'], ['지난 점검', last ? last.date : '없음'], ['담당', '김지킴']] })}
      ${kcard({ t: '센서 이상 기록', v: ended.length, unit: '건', rows: [['조치 완료', ended.filter((a) => a.endKind !== 'noack').length + '건'], ['아무도 안 누름', ended.filter((a) => a.endKind === 'noack').length + '건'], ['기간', '최근 3개월']], go: 'rec/sensor' })}
    </div>
    ${sensorCard(s)}
    <div class="proto">시제품 · 가상 데이터</div>`, true);
}

// 지킴이 방문 예약 요청 칸(승인·거절)은 2026-10-07 사용자 지시로 걷었다 — 실제로는 예약 시스템이 없고 불시에 가기도 한다

/* ---------- O2 센서 이상 기록 ---------- */
function subTabs(on) {
  return `<nav class="wtabs sub"><button class="${on === 'sensor' ? 'on' : ''}" data-go="rec/sensor">센서 이상 기록</button><button class="${on === 'insp' ? 'on' : ''}" data-go="rec/insp">지킴이 점검 · 고칠 것</button></nav>`;
}
function sensorRec(s) {
  return frame('rec', `${subTabs('sensor')}
    <div class="tscroll"><table class="dense"><tr><th>시작</th><th>무엇이</th><th>조치 완료</th><th>끝남</th></tr>
    ${myAlarms(s).map((a) => { const k = a.acks[0]; return `<tr><td>${a.day} ${hm(a.start)}</td><td><b>${esc(SIM.title(a))}</b></td>
      <td>${k ? `${esc(k.by)} · ${k.at - a.start}분 뒤` : '—'}</td><td>${SIM.live(a) ? '<b>진행 중</b>' : `${SIM.endWord(a)}${a.endedAt != null ? ' · ' + (a.endedAt - a.start) + '분' : ''}`}</td></tr>`; }).join('')}
    </table></div>
    <div class="small">🔒 기록은 고칠 수 없어요.</div>`);
}

/* ---------- O3 지킴이 점검 · 고칠 것 ---------- */
function inspRec(s) {
  const list = s.inspections.filter((i) => i.fid === FID && APPROVED(i));  // 공장주는 승인된 점검만 본다 (2026-09-22)
  const ins = list.find((i) => i.id === UI.openInsp) || list[0];
  if (!ins) return frame('rec', `${subTabs('insp')}<div class="kcard"><div class="kt">아직 지킴이 점검 기록이 없어요</div><div class="small">지킴이가 점검 결과를 내면 여기에 보여요.</div></div>`);
  const order = { back: 0, todo: 1, claimed: 2, fixed: 3 };
  const bad = ins.items.filter(TRACKED).sort((a, b) => order[itemState(a)] - order[itemState(b)]);
  // 답은 양호 · 보통 · 불량 · 해당 없음 (2026-10-07). 개선 요청은 불량만 — 양호·보통은 펼쳐 보기에 묶는다
  const ok = ins.items.filter((x) => x.answer === 'ok' && !x.ref), mid = ins.items.filter((x) => x.answer === 'mid' && !x.ref), na = ins.items.filter((x) => x.answer === 'na' && !x.ref);
  // 이 점검에서 다시 본 지난번 미흡 — 원래 항목(옛 점검 기록)을 찾아 그 상태와 단추를 여기서도 보인다
  const refs = ins.items.filter((x) => x.ref).map((x) => { const o = s.inspections.find((i) => i.id === x.ref.ins); const it = o && o.items.find((y) => y.id === x.ref.id); return it && { o, it }; }).filter(Boolean);
  // 항목 카드 — 지킴이 앱 개선 관리와 같은 꼴 (2026-10-26 사용자 지시): "개선사항 n" + 상태, 개선 전 | 개선 후 사진을 좌우로 크게,
  // 지도유형(유해위험요인) 번호 칸, 개선 전 내용, 주고받은 기록, [고쳤어요]. 개선 후 칸이 비어 있으면 눌러서 바로 올린다
  const itemHtml = (it, from = ins) => {
    const st = itemState(it), can = st === 'todo' || st === 'back', fx = [...(it.log || [])].reverse().find((l) => l.t === 'fix');
    const tile = (l, w, cls) => `<span class="ofxp"><img src="${l[0].src}" alt="${w} 사진"><em class="${cls}">${w}</em>${l.length > 1 ? `<b>${I('image', 14)}+${l.length - 1}</b>` : ''}</span>`;
    const before = (it.photos || []).length ? tile(it.photos, '개선 전', 'before') : `<span class="ofxp none">${I(it.shot ? 'image' : 'camera', 30)}${it.shot ? '지킴이 사진' : '사진 없음'}</span>`;
    const after = (it.after || []).length ? tile(it.after, '개선 후', 'after')
      : can ? `<button class="ofxp none add" data-act="fix" data-ins="${from.id}" data-id="${it.id}">${I('camera', 30)}고친 뒤 사진<br>올리기</button>`
      : `<span class="ofxp none">${I('camera', 30)}${fx && fx.photo ? '고친 뒤 사진 보냄' : '고친 뒤 사진 없음'}</span>`;
    const hist = (it.log || []).map((l) => l.t === 'fix'
      ? `<li><b>${l.at}</b>고쳤어요${l.n ? ` · 사진 ${l.n}장` : ''}${l.note ? ` · "${esc(l.note)}"` : ''}</li>`
      : `<li><b>${l.at}</b>지킴이 확인 · <em class="${l.result === 'fixed' ? 'ok' : 'no'}">${l.result === 'fixed' ? '고쳐짐' : '안 고쳐짐'}</em>${l.reason ? ` · 사정: ${esc(l.reason)}` : ''}</li>`).join('');
    const action = can ? `<button class="btn inl" data-act="fix" data-ins="${from.id}" data-id="${it.id}">${st === 'back' ? '다시 고쳤어요' : '고쳤어요'}</button>`
      : st === 'claimed' ? `<button class="btn ghost inl" data-act="unfix" data-ins="${from.id}" data-id="${it.id}">표시 취소</button>` : '';
    return `<div class="ofx st-${st}">
      <div class="ofxh"><b>${kzName(from, it)}</b>${from === ins ? '' : `<span class="ofxd">${from.date} 점검</span>`}<span class="ofxs">${STATE_WORD[st]}</span></div>
      <div class="ofxb"><div class="ofxpair">${before}${after}</div>
        <div class="ofxi">
          ${(it.risks || []).length ? `<div class="ofxk"><span>지도유형 (유해위험요인)</span><div class="ofxchips">${it.risks.map((r) => `<span class="ofxchip"><i>${RISKS.indexOf(r) + 1}</i>${esc(r)}</span>`).join('')}</div></div>` : ''}
          <div class="ofxk"><span>개선 전 내용</span><p>${esc(it.memo || '없음')}</p></div>
          ${it.eval ? `<div class="ofxk"><span>평가 내용</span><p>${esc(it.eval)}</p></div>` : ''}
          ${hist ? `<ul class="ofxlog">${hist}</ul>` : ''}
          ${action ? `<div class="ofxa">${action}</div>` : ''}
        </div></div></div>`;
  };
  return frame('rec', `${subTabs('insp')}
    <div class="split">
      <div class="list">${list.map((i) => { const b = i.items.filter(TRACKED); return `<button class="q ${i.id === ins.id ? 'now' : ''}" data-act="openInsp" data-id="${i.id}">
        <div class="t">${i.date} 지킴이 점검</div><div class="small">개선사항 ${b.length}개${b.length ? ' · 고칠 것 ' + b.filter((x) => ['todo', 'back'].includes(itemState(x))).length : ''}${i.items.some((x) => x.ref) ? ` · 지난번 미흡 확인 ${i.items.filter((x) => x.ref).length}` : ''}</div></button>`; }).join('')}</div>
      <div class="detail">
        <div class="rowx"><span style="font-size:22px;font-weight:850">${ins.date} 지킴이 점검</span><span class="small">🔒 점검 결과는 고칠 수 없음</span></div>
        ${inRecheck(ins) ? `<div class="small"><b class="ink">재점검 · ${recheckDue(ins)}까지</b> 고친 뒤 "고쳤어요"로 사진을 보내 주세요. 지킴이가 보고 판정해요.</div>`
          : ins.final ? `<div class="small">재점검 ${ins.final.at} · 결과 <b class="ink">${ins.result}</b> · 고쳐짐 ${ins.final.total}개 중 ${ins.final.fixed}개</div>` : ''}
        ${refs.length ? `<div class="lbl">지난번 미흡 확인 ${refs.length}개</div>${refs.map(({ o, it }) => itemHtml(it, o)).join('')}` : ''}
        <div class="lbl">${refs.length ? '새로 찾은 개선사항' : '개선사항'} ${bad.length}개</div>
        ${bad.map((it) => itemHtml(it)).join('') || '<div class="small">개선사항 없음</div>'}
        <button class="add" data-act="toggleOk">양호 ${ok.length}개${mid.length ? ` · 보통 ${mid.length}개` : ''}${na.length ? ` · 해당 없음 ${na.length}개` : ''} ${UI.showOk ? '▾ 접기' : '▸ 펼치기'}</button>
        ${UI.showOk ? ok.map((x) => `<div class="small">· ${esc(x.text)} — 양호${x.eval ? ` (${esc(x.eval)})` : ''}</div>`).join('')
          + mid.map((x) => `<div class="small">· ${esc(x.text)} — 보통${x.eval ? ` (${esc(x.eval)})` : ''}</div>`).join('')
          + na.map((x) => `<div class="small">· ${esc(x.text)} — 해당 없음 (이 공장에 없는 것)</div>`).join('') : ''}
      </div>
    </div>${UI.dlg ? fixDlg(s) : ''}`);
}
// 고쳤어요 — 고친 뒤 사진을 진짜로 올린다(5장까지, 서버 api/photo). 보내면 지킴이 앱 개선 관리의 개선 후 칸에 저절로 들어가고 알림이 간다 (2026-10-26)
const FIX_MAX = 5;
function fixDlg(s) {
  const ins = s.inspections.find((i) => i.id === UI.dlg.ins), it = ins.items.find((x) => x.id === UI.dlg.id);
  const again = itemState(it) === 'back', last = it.log[it.log.length - 1], ph = UI.dlg.photos;
  return `<div class="ov" data-act="closeDlg"></div><div class="dlg wide">
    <div class="mid" style="font-size:20px">${kzName(ins, it)} ${again ? '다시 고쳤어요' : '고쳤어요'}</div>
    <div class="small">${ins.date} 지킴이 점검${again ? ` → ${last.at} 지킴이 확인에서 안 고쳐짐${last.reason ? ` (${esc(last.reason)})` : ''}` : ''}</div>
    <div class="lbl">고친 뒤 사진</div>
    <div class="ofxup">${ph.map((p, j) => `<span class="ofxut"><img src="${p.src}" alt=""><button data-act="dlgDrop" data-v="${j}" aria-label="사진 빼기">${I('close', 16)}</button></span>`).join('')}
      ${UI.dlg.busy ? `<span class="ofxut wait">올리는 중</span>` : ''}
      ${ph.length + (UI.dlg.busy || 0) < FIX_MAX ? `<button class="ofxut add" data-act="dlgPhoto">${I('camera', 26)}사진 올리기</button>` : ''}</div>
    <div class="lbl">어떻게 고쳤나요? (안 써도 돼요)</div>
    <input class="input" id="fixNote" placeholder="예: 부품 받아서 벗겨진 전선 교체함">
    <div class="warn">보내면 지킴이 앱에 사진과 함께 알림이 가요. 지킴이 확인 전까지는 취소할 수 있어요.</div>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost inl" data-act="closeDlg">취소</button><button class="btn inl" data-act="saveFix"${UI.dlg.busy ? ' disabled' : ''}>고쳤어요 보내기</button></div>
  </div>`;
}
// 사진 고르기 창 — 폰이면 카메라 · 사진첩, PC면 파일
const fixIn = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', multiple: true, hidden: true });
fixIn.addEventListener('change', () => {
  const fs = [...fixIn.files].slice(0, FIX_MAX - UI.dlg.photos.length); fixIn.value = '';
  fs.forEach((file) => {
    const img = new Image(), url = URL.createObjectURL(file), d = UI.dlg;
    d.busy = (d.busy || 0) + 1; render();
    const done = () => { d.busy--; URL.revokeObjectURL(url); if (UI.dlg === d) render(); };
    img.onload = () => camShrink(img, img.naturalWidth, img.naturalHeight).then(photoSave).then((p) => { d.photos.push(p); done(); })
      .catch(() => { toast('사진을 올리지 못했어요'); done(); });
    img.onerror = () => { toast('사진을 열지 못했어요'); done(); };
    img.src = url;
  });
});
document.body.appendChild(fixIn);

function soon(s, w) {
  const tab = { proof: '점검 증빙 (시안 O4)', notice: '안전 공지 (시안 O5)', workers: '근로자 (시안 O6)', voice: '의견 (시안 O7)' }[w];
  return frame('soon/' + w, `<div class="kcard"><div class="kt">${tab || '준비 중'}</div><div class="small">시제품 다음 차례에 만들어요. 모양은 HTML 시안을 보세요.</div></div>`);
}

function render() {
  const s = DB.s, p = R.path();
  let html;
  if (UI.lastPath !== location.hash) { UI.menu = false; UI.dlg = null; UI.lastPath = location.hash; UI.invites = null; }
  if (p[0] === 'rec' && p[1] === 'sensor') html = sensorRec(s);
  else if (p[0] === 'rec') html = inspRec(s);
  else if (p[0] === 'soon') html = soon(s, p[1]);
  else if (p[0] === 'now' && p[1] === 'memo') html = memoPage(s);
  else if (p[0] === 'notice' && p[1] === 'new') html = noticeNew(s);
  else if (p[0] === 'notice' && p[1]) html = noticeOne(s, p[1]);
  else if (p[0] === 'notice') html = noticeList(s);
  else if (p[0] === 'workers') html = workersPage(s);
  else if (p[0] === 'voice' && p[1]) html = voiceOne(s, p[1]);
  else if (p[0] === 'voice') html = voiceList(s);
  else html = now(s);
  if (UI.dlg && UI.dlg.type === 'fault') html += faultDlg(s);
  // 다시 그려도 쓰던 글자와 커서를 지킨다 (데이터가 1초마다 새로 올 수 있음)
  const ae = document.activeElement, keepId = ae && ae.id, keepVal = keepId && 'value' in ae ? ae.value : null;
  const vals = {}; document.querySelectorAll('#app input[id], #app textarea[id]').forEach((el) => { vals[el.id] = el.value; });
  $('#app').innerHTML = html;
  Object.entries(vals).forEach(([k, v]) => { const el = $('#' + k); if (el && !el.value) el.value = v; });
  if (keepId && $('#' + keepId)) { const el = $('#' + keepId); if (keepVal != null) el.value = keepVal; el.focus(); }
}

const ACTS = {
  logout: () => webLogout(),
  ctl() { toggleCtl(); },
  menu() { UI.menu = !UI.menu; render(); },
  ack({ id }) { DB.act((s) => SIM.ack(s, id, ME)); toast('조치 완료를 보냈어요 · 근로자 화면에도 보여요'); },
  fault() { toast('센서 고장 신고는 시제품 다음 차례에 만들어요 (시안 O1-마)'); },
  openInsp({ id }) { UI.openInsp = id; render(); },
  toggleOk() { UI.showOk = !UI.showOk; render(); },
  fix({ ins, id }) { UI.dlg = { ins, id, photos: [], busy: 0 }; render(); },
  dlgPhoto() { fixIn.click(); },
  dlgDrop({ v }) { UI.dlg.photos.splice(+v, 1); render(); },
  closeDlg() { UI.dlg = null; render(); },
  saveFix() {
    if (!UI.dlg || UI.dlg.type || UI.dlg.busy) return;
    const d = UI.dlg, note = $('#fixNote').value.trim();
    UI.dlg = null;
    DB.act((s) => {
      const it = s.inspections.find((i) => i.id === d.ins).items.find((x) => x.id === d.id);
      if (d.photos.length) it.after = [...(it.after || []), ...d.photos];  // 지킴이 앱 개선 후 칸 (2026-10-26)
      it.log.push({ t: 'fix', at: '9/17', tm: hm(s.clock), note, photo: d.photos.length > 0, n: d.photos.length });
      if (!s.visits[FID]) s.visits[FID] = null;
      DB.log(`박대표 고쳤어요 · ${it.text}`);
    });
    toast('지킴이에게 보냈어요');
  },
  unfix({ ins, id }) {
    DB.act((s) => {
      const it = s.inspections.find((i) => i.id === ins).items.find((x) => x.id === id);
      if (itemState(it) === 'claimed') { const l = it.log.pop(); if (l.n) it.after = (it.after || []).slice(0, -l.n); }  // 그때 올린 사진도 뺀다
      DB.log(`박대표 고쳤어요 표시 취소 · ${it.text}`);
    });
    toast('취소했어요 · 지킴이 판정 목록에서 빠졌어요');
  },
};

const OWNER = { render, ACTS };
