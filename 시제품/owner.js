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
const STATE_WORD = { todo: '아직 안 고침', claimed: '고쳤어요 표시함 · 재점검 기다림', fixed: '재점검에서 고쳐짐 확인', back: '재점검에서 안 고쳐짐' };

function myItems(s) {
  const out = [];
  s.inspections.filter((i) => i.fid === FID && APPROVED(i)).forEach((ins) => ins.items.filter((x) => x.answer === 'bad').forEach((it) => out.push({ ins, it, st: itemState(it) })));
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
  const bad = ins.items.filter((x) => x.answer === 'bad').sort((a, b) => order[itemState(a)] - order[itemState(b)]);
  const ok = ins.items.filter((x) => x.answer === 'ok'), na = ins.items.filter((x) => x.answer === 'na');
  const itemHtml = (it) => {
    const st = itemState(it);
    const hist = (it.log || []).map((l) => l.t === 'fix'
      ? `<div class="small">${l.at} 고쳤어요${l.note ? ` · "${esc(l.note)}"` : ''}</div>`
      : `<div class="small">${l.at} 재점검 · <b class="ink">${l.result === 'fixed' ? '고쳐짐' : '안 고쳐짐'}</b>${l.reason ? ` · 사정: ${esc(l.reason)}` : ''}${l.photo ? ' 📷' : ''}</div>`).join('');
    let action = '';
    if (st === 'todo' || st === 'back') action = `<button class="btn inl" data-act="fix" data-ins="${ins.id}" data-id="${it.id}">${st === 'back' ? '다시 고쳤어요' : '고쳤어요'}</button>`;
    if (st === 'claimed') action = `<button class="btn ghost inl" data-act="unfix" data-ins="${ins.id}" data-id="${it.id}">표시 취소</button>`;
    return `<div class="item2 ${st === 'back' || st === 'todo' ? 'strong' : ''}">
      <div class="rowx"><b>${esc(it.text)}</b><span class="ans">문제 있음 <span class="ph">📷</span></span></div>
      <div class="small">지킴이 메모: ${esc(it.memo || '없음')}</div>${hist}
      <div class="rowx" style="margin-top:6px"><span class="state">${st === 'back' ? '⚠ ' : st === 'fixed' || st === 'claimed' ? '✓ ' : ''}${STATE_WORD[st]}</span>${action}</div></div>`;
  };
  return frame('rec', `${subTabs('insp')}
    <div class="split">
      <div class="list">${list.map((i) => { const b = i.items.filter((x) => x.answer === 'bad'); return `<button class="q ${i.id === ins.id ? 'now' : ''}" data-act="openInsp" data-id="${i.id}">
        <div class="t">${i.date} 지킴이 점검</div><div class="small">${i.items.length}항목 · 문제 ${b.length}개${b.length ? ' · 고칠 것 ' + b.filter((x) => ['todo', 'back'].includes(itemState(x))).length : ''}</div></button>`; }).join('')}</div>
      <div class="detail">
        <div class="rowx"><span style="font-size:22px;font-weight:850">${ins.date} 지킴이 점검</span><span class="small">🔒 점검 결과는 고칠 수 없음</span></div>
        <div class="lbl">문제 있음 ${bad.length}개</div>
        ${bad.map(itemHtml).join('') || '<div class="small">문제 없음</div>'}
        <button class="add" data-act="toggleOk">이상 없음 ${ok.length}개${na.length ? ` · 해당 없음 ${na.length}개` : ''} ${UI.showOk ? '▾ 접기' : '▸ 펼치기'}</button>
        ${UI.showOk ? ok.map((x) => `<div class="small">· ${esc(x.text)} — 이상 없음</div>`).join('')
          + na.map((x) => `<div class="small">· ${esc(x.text)} — 해당 없음 (이 공장에 없는 것)</div>`).join('') : ''}
      </div>
    </div>${UI.dlg ? fixDlg(s) : ''}`);
}
function fixDlg(s) {
  const ins = s.inspections.find((i) => i.id === UI.dlg.ins), it = ins.items.find((x) => x.id === UI.dlg.id);
  const again = itemState(it) === 'back';
  const last = it.log[it.log.length - 1];
  return `<div class="ov" data-act="closeDlg"></div><div class="dlg wide">
    <div class="mid" style="font-size:20px">${again ? '다시 고쳤어요' : '고쳤어요'}</div>
    <div class="small">${esc(it.text)} · ${ins.date} 문제 있음${again ? ` → ${last.at} 재점검에서 안 고쳐짐${last.reason ? ` (${esc(last.reason)})` : ''}` : ''}</div>
    <div class="lbl">어떻게 고쳤나요? (안 써도 돼요)</div>
    <input class="input" id="fixNote" placeholder="예: 부품 받아서 벗겨진 전선 교체함">
    <div class="lbl">고친 뒤 사진 (안 올려도 돼요)</div>
    <div class="row"><span class="thumb">${UI.dlg.photo ? '📷 1장' : '없음'}</span><button class="btn ghost inl" data-act="dlgPhoto">사진 올리기</button></div>
    <div class="warn">누르면 지킴이 재점검 목록에 올라요. 재점검 전까지는 취소할 수 있어요.</div>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost inl" data-act="closeDlg">취소</button><button class="btn inl" data-act="saveFix">고쳤어요 표시</button></div>
  </div>`;
}

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
  fix({ ins, id }) { UI.dlg = { ins, id, photo: false }; render(); setTimeout(() => $('#fixNote') && $('#fixNote').focus(), 50); },
  dlgPhoto() { UI.dlg.photo = true; const v = $('#fixNote').value; render(); $('#fixNote').value = v; },
  closeDlg() { UI.dlg = null; render(); },
  saveFix() {
    if (!UI.dlg || UI.dlg.type) return;
    const d = UI.dlg, note = $('#fixNote').value.trim();
    UI.dlg = null;
    DB.act((s) => {
      const it = s.inspections.find((i) => i.id === d.ins).items.find((x) => x.id === d.id);
      it.log.push({ t: 'fix', at: '9/17', note, photo: d.photo });
      if (!s.visits[FID]) s.visits[FID] = null;
      DB.log(`박대표 고쳤어요 · ${it.text}`);
    });
    toast('지킴이 재점검 목록에 올렸어요');
  },
  unfix({ ins, id }) {
    DB.act((s) => {
      const it = s.inspections.find((i) => i.id === ins).items.find((x) => x.id === id);
      if (itemState(it) === 'claimed') it.log.pop();
      DB.log(`박대표 고쳤어요 표시 취소 · ${it.text}`);
    });
    toast('표시를 취소했어요 · 재점검 목록에서 빠졌어요');
  },
};

const OWNER = { render, ACTS };
