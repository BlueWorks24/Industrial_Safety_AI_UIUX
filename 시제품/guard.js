// 지킴이 앱 — 시안 G1~G7. 로그인한 사람은 김지킴(전기 조)이다.
const ME = '김지킴';
const UI = { sheet: null, aiTimer: null, only: false, fold: {} };
const SRC = { base: '기본', prev: '지난번 문제', ai: 'AI 제안', self: '직접 추가' };

function tasks(s) {
  const t = [];
  ['daesung', 'dongbang'].forEach((fid) => {
    const q = recheckQueue(s, fid);
    const waiting = s.outbox.guard.some((m) => m.data.kind === 're' && m.data.fid === fid);
    if (q.length && !waiting) t.push({ fid, kind: 're', n: q.length, q });
  });
  ['hanbit', 'taegwang'].forEach((fid) => {
    const done = s.inspections.some((i) => i.fid === fid) || s.outbox.guard.some((m) => m.data.fid === fid);
    if (!done) t.push({ fid, kind: 'first' });
  });
  return t;
}
// 앱 머리글 + 위치 띠 — 웹과 같은 결
const bar = () => appBar('안전지킴이', '산업안전지킴이', `<button class="me" data-go="soon/me">${ME} ›</button>`);
const head = (title, go = '', end = '') => `<div class="apptop">${band(title, go, end)}${bar()}</div>`;
const unsentN = (s) => s.outbox.guard.length;

/* ---------- G1 홈 ---------- */
function todayPlan(s, t) {
  const today = t.filter((x) => (s.visits[x.fid] || '').startsWith('오늘'));
  return `<div class="sect"><h2>오늘 일정</h2>${today.length ? today.map((x) => `<button class="frow" data-go="pre/${x.fid}">
      <span class="fic">${I('pin', 18)}</span><span class="ftx"><b>${FACTORIES[x.fid].name} ${x.kind === 're' ? `재점검 ${x.n}개` : '첫 점검'}</b><small>${FACTORIES[x.fid].area}</small></span>
      <span class="fd">${s.visits[x.fid].replace('오늘 ', '')}</span></button>`).join('') : '<p class="note">오늘 잡힌 방문이 없어요.</p>'}</div>`;
}
function home(s) {
  const t = tasks(s);
  const noDate = t.filter((x) => !s.visits[x.fid]).length;
  return `${sbar(s.net.guard ? '지킴이' : '📶 전파 없음')}<div class="scr"><div class="bd">
    <div class="apptop"><div class="head"><span class="hm" style="display:inline-flex;align-items:center;justify-content:center">⌂</span><span class="crumb">홈</span><span class="end small">전기 조</span></div>${bar()}</div>
    <div class="today"><div><b>9월 17일 목요일</b><span>전기 조 · 담당 12곳</span></div>
      ${s.net.guard ? '' : `<span class="live off"><i></i>전파 없음</span>`}</div>
    ${unsentN(s) ? `<div class="warnbar"><span class="ic">${I('clock', 22)}</span><div><div class="mid">아직 안 올라간 점검 ${unsentN(s)}건</div><div class="small">전파가 잡히면 저절로 올라가요</div></div></div>` : ''}
    ${kcard({ t: '할 일', v: t.length, unit: '곳', go: 'todo', more: '내 할 일 보기',
      rows: [['재점검', t.filter((x) => x.kind === 're').length + '곳'], ['새로 갈 곳', t.filter((x) => x.kind === 'first').length + '곳'], ['날짜 안 정함', noDate + '곳']] })}
    ${todayPlan(s, t)}
    <div class="tiles">
      <button class="tile" data-go="todo"><span class="ic">${I('clipboard', 24)}</span><b>내 할 일<span class="cnt">${t.length}곳</span></b></button>
      <button class="tile" data-go="start"><span class="ic">${I('camera', 24)}</span><b>점검 시작</b></button>
      <button class="tile" data-go="records"><span class="ic">${I('folder', 24)}</span><b>내 점검 기록</b></button>
      <button class="tile" data-go="soon/factories"><span class="ic">${I('factory', 24)}</span><b>담당 공장</b></button>
    </div>
    <div class="proto">시제품 · 가상 데이터</div>
  </div></div>`;
}

/* ---------- G2 내 할 일 ---------- */
function todo(s) {
  const t = tasks(s);
  const card = (x) => {
    const f = FACTORIES[x.fid], v = s.visits[x.fid];
    const sub = x.kind === 're'
      ? `${f.area} · 공장주가 "고쳤어요" 누름 · ${x.q.map((e) => e.it.log[e.it.log.length - 1].at).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`
      : `${f.area} · ${f.type} · ${f.workers}명`;
    return `<div class="task${x.kind === 're' ? ' re' : ''}">
      <button class="q" style="border:none;padding:0" data-go="pre/${x.fid}"><div class="nm"><b>${f.name}</b><span class="ans">${x.kind === 're' ? `재점검 ${x.n}개` : '첫 점검'} ›</span></div>
      <div class="small">${sub}</div></button>
      ${v ? `<div class="row"><span class="small ink" style="font-weight:700;flex:1;display:flex;align-items:center;gap:6px">${I('calendar', 17)} ${v} 방문</span><button class="btn ghost sm" style="flex:0 0 84px" data-act="date" data-fid="${x.fid}">바꾸기</button></div>`
          : `<button class="btn ghost sm" data-act="date" data-fid="${x.fid}">${I('calendar', 18)} 날짜 정하기</button>`}
    </div>`;
  };
  const re = t.filter((x) => x.kind === 're'), fr = t.filter((x) => x.kind === 'first');
  return `${sbar('지킴이')}<div class="scr"><div class="bd">
    ${head('내 할 일', '', `<span class="small">${t.length}곳</span>`)}${pageIntro('내 할 일')}
    ${re.length ? `<div class="lbl">재점검이 위에</div>${re.map(card).join('')}` : ''}
    ${fr.length ? `<div class="lbl">새로 갈 곳 · 9월 배정</div>${fr.map(card).join('')}` : ''}
    ${t.length ? '' : '<div class="stat"><div class="mid">할 일이 없어요</div></div>'}
  </div></div>${UI.sheet && UI.sheet.type === 'date' ? dateSheet(s) : ''}`;
}
function dateSheet(s) {
  const sh = UI.sheet, f = FACTORIES[sh.fid];
  const days = ['9/21(월)', '9/22(화)', '9/23(수)', '9/24(목)', '9/25(금)'];
  const tms = ['오전', '오후'];
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="mid">${f.name} 방문 날짜</div>
    <div class="lbl">날짜</div>
    <div class="seg">${days.map((d) => `<button class="${sh.day === d ? 'on' : ''}" data-act="pickDay" data-v="${d}">${d}</button>`).join('')}</div>
    <div class="lbl">시간</div>
    <div class="seg">${tms.map((d) => `<button class="${sh.tm === d ? 'on' : ''}" data-act="pickTm" data-v="${d}">${d}</button>`).join('')}</div>
    <div class="small">공장주에게도 보여요<span class="hyp">가설</span></div>
    <div class="row"><button class="btn ghost cxl" data-act="closeSheet">취소</button><button class="btn" data-act="saveDate" ${sh.day ? '' : 'disabled'}>저장</button></div>
  </div>`;
}

/* ---------- G2-나 방문 전 ---------- */
function pre(s, fid) {
  const f = FACTORIES[fid], q = recheckQueue(s, fid);
  const hist = s.alarms.filter((a) => !SIM.live(a) && alarmFid(a) === fid).slice(0, 2);
  return `${sbar(f.name)}<div class="scr"><div class="bd">
    ${head(f.name, 'todo', `<span class="small">${f.area} · ${f.type}</span>`)}
    ${hist.length ? `<div><div class="lbl">이 공장 센서 이상 기록 · 최근 ${hist.length}건</div>
      ${hist.map((a) => `<div class="q past" style="margin-top:6px"><div class="t">${a.day} ${esc(SIM.title(a))}</div><div class="small">${SIM.endWord(a)}${a.acks[0] ? ` · 조치 완료 ${a.acks[0].at - a.start}분 뒤` : ''}</div></div>`).join('')}</div>` : ''}
    ${q.length ? `<div><div class="lbl">오늘 다시 볼 항목 ${q.length}개</div>
      ${q.map((e) => `<div class="q" style="margin-top:6px"><div class="t">${esc(e.it.text)}</div><div class="small">${e.ins.date} 문제 있음 → ${e.it.log[e.it.log.length - 1].at} 공장주 "고쳤어요"</div></div>`).join('')}</div>`
      : ''}
  </div><div class="ft">
    ${q.length ? `<button class="btn" data-go="re/${fid}">재점검 시작</button>` : `<button class="btn" data-act="newDraft" data-fid="${fid}">점검 시작</button>`}
  </div></div>`;
}

/* ---------- G3 점검 시작 ---------- */
function start(s) {
  const t = tasks(s);
  return `${sbar('지킴이')}<div class="scr"><div class="bd">
    ${head('점검 시작')}${pageIntro('점검 시작')}
    <div class="lbl">어느 공장인가요?</div>
    ${t.map((x) => `<button class="q${x.kind === 're' ? ' now' : ''}" data-go="pre/${x.fid}"><div class="rowx"><span class="t">${FACTORIES[x.fid].name}</span><span class="ans">${x.kind === 're' ? '재점검 ›' : '첫 점검 ›'}</span></div>
      <div class="small">${s.visits[x.fid] ? I('calendar', 14) + ' ' + s.visits[x.fid] : '날짜 안 정함'}</div></button>`).join('')}
    <input class="input" placeholder="🔍 다른 담당 공장 찾기" disabled>
  </div></div>`;
}

/* ---------- G4 사진 · AI ---------- */
function photo(s) {
  const d = s.draft, f = FACTORIES[d.fid];
  return `${sbar(f.name)}<div class="scr"><div class="bd">
    ${head('점검 중 · ' + f.name, 'pick')}
    <div class="mid">공장 안을 찍어 주세요</div>
    <div class="small">분전반·전선·콘센트 같은 곳 · <b class="ink">찍힌 것만 봐요</b></div>
    <div class="thumbs">${Array.from({ length: d.photos }, (_, i) => `<div class="thumb">사진 ${i + 1}</div>`).join('')}
      <button class="thumb" style="border:2px dashed var(--ink);background:#fff;font-size:22px" data-act="addPhoto">＋</button></div>
    <div class="small">${d.photos}장 찍음 · 최대 10장</div>
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
  const base = BASE_ITEMS[f.type] || BASE_ITEMS['금속가공'];
  const nSel = d.ai.filter((x) => x.sel).length;
  const total = base.length + nSel + d.self.length;
  const asked = d.aiState === 'done';
  const answered = d.items.some((x) => x.answer);
  return `${sbar(f.name)}<div class="scr"><div class="bd" style="gap:8px">
    ${head('점검 중 · ' + f.name, 'pre/' + d.fid)}
    <div class="grp">업종별 기본 체크리스트<span class="must">고르지 않아도 전부 점검</span></div>
    ${base.map((t) => `<div class="item"><div class="bul">✓</div><div><div class="t">${esc(t)}</div><div class="why">${f.type} × 전기 기본 항목</div></div></div>`).join('')}
    <div class="grp">AI 제안 · 원할 때만<span class="must">${asked ? `${d.ai.length}개 중 ${nSel}개 고름` : '아직 안 받음'}</span></div>
    ${asked ? `
    <div class="small"><b class="ink">사진 속 것만 봐요</b> · 틀릴 수 있어요</div>
    ${d.ai.length === 0 ? `<div class="small">사진에서 찾은 것 없음 — 위험이 없다는 뜻은 아니에요.</div>` : ''}
    ${d.ai.map((x, i) => { const g = AI_SUGGEST[x.idx]; return `<div class="item${x.sel ? ' sel' : ''}">
      <button class="chk" data-act="toggleAI" data-i="${i}" aria-label="고르기">${x.sel ? '✓' : ''}</button>
      <div style="flex:1"><div class="t">${esc(g.text)}</div>
      <button class="link small" style="padding:0;min-height:36px" data-act="why" data-i="${i}">사진: ${g.seen} · 비슷한 사고: ${esc(g.cases[0].t)} ›</button></div></div>`; }).join('')}
    <button class="add" data-act="goPhoto">＋ 사진 더 찍어 다시 받기</button>` : `
    <button class="add" data-act="goPhoto">${I('camera', 16)} 사진 찍어 AI 제안 받기</button>`}
    ${d.self.length ? `<div class="grp">직접 추가<span class="must">${d.self.length}개</span></div>` : ''}
    ${d.self.map((t) => `<div class="item sel"><div class="bul">${I('plus', 14)}</div><div><div class="t">${esc(t)}</div><div class="why">직접 추가</div></div></div>`).join('')}
    <button class="add" data-act="addSelf">＋ 항목 직접 추가</button>
  </div><div class="ft"><button class="btn" data-act="startAnswer">${answered ? `이어서 점검하기 · ${total}개` : `${total}개로 점검 시작`}</button></div></div>
  ${UI.sheet && UI.sheet.type === 'why' ? whySheet(s) : ''}${UI.sheet && UI.sheet.type === 'self' ? selfSheet() : ''}`;
}
function whySheet(s) {
  const x = s.draft.ai[UI.sheet.i], g = AI_SUGGEST[x.idx], sp = g.spot;
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="mid">${esc(g.text)}</div>
    <div class="lbl">AI가 본 자리 · 사진 ${x.photo}</div>
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
function checkList(s) {
  const d = s.draft, f = FACTORIES[d.fid];
  const n = (v) => d.items.filter((x) => x.answer === v).length;
  const nOk = n('ok'), nBad = n('bad'), nNa = n('na');
  const done = nOk + nBad + nNa, left = d.items.length - done;
  const bad = d.items.filter((x) => x.answer === 'bad');
  const only = UI.only && left;
  // 머리글 아래에 진행 막대와 상태별 수를 같이 붙여 스크롤해도 위에 남게 한다
  const top = `<div class="apptop">${band('점검 중 · ' + f.name, 'pick')}${bar()}
    <div class="progtop"><div class="rowx"><span class="t">${esc(f.name)}</span><span class="small">${d.items.length}개 중 ${done}개 답함</span></div>
    <div class="prog">${['ok', 'bad', 'na'].map((v) => `<i class="${v}" style="width:${(n(v) / d.items.length) * 100}%"></i>`).join('')}</div>
    <div class="tally"><span class="ok">✓ ${ANS.ok} ${nOk}</span><span class="bad">⚠ ${ANS.bad} ${nBad}</span>${nNa ? `<span class="na">— ${ANS.na} ${nNa}</span>` : ''}${left ? `<span>안 본 것 ${left}</span>` : ''}</div></div></div>`;
  let rows = '', lastSrc = null;
  d.items.forEach((x, i) => {
    if (x.src !== lastSrc) {  // 묶음 머리글 — 눌러서 접고 편다
      lastSrc = x.src;
      const g = d.items.filter((y) => y.src === x.src), rest = g.filter((y) => !y.answer).length;
      rows += `<button class="grp gh" data-act="fold" data-k="${x.src}">${UI.fold[x.src] ? '▸' : '▾'} ${GRP[x.src] || SRC[x.src]}<span class="must">${g.length}개</span>${rest ? `<span class="rest">안 본 것 ${rest}</span>` : '<span class="small">다 답함</span>'}</button>`;
    }
    if (UI.fold[x.src] || (only && x.answer)) return;
    const st = x.answer || '';
    const mark = [x.memo ? '메모: ' + esc(x.memo) : '', x.shot ? '사진 1장' : ''].filter(Boolean).join(' · ');
    rows += `<div class="crow ${st}">
      <div class="ctop"><span class="cnum">${i + 1}</span><div class="t">${esc(x.text)}</div></div>
      <div class="cans">
        <button class="${st === 'ok' ? 'on ok' : ''}" data-act="ans" data-n="${i}" data-v="ok">${ANS.ok}</button>
        <button class="${st === 'bad' ? 'on bad' : ''}" data-act="ansBad" data-n="${i}">${ANS.bad}</button>
        <button class="${st === 'na' ? 'on na' : ''}" data-act="ans" data-n="${i}" data-v="na">${ANS.na}</button>
      </div>
      ${st === 'bad' && mark ? `<div class="cmemo">${mark}</div>` : ''}
    </div>`;
  });
  return `${sbar(f.name)}<div class="scr"><div class="bd" style="gap:8px">${top}
    ${left ? `<div class="seg"><button class="${UI.only ? '' : 'on'}" data-act="only" data-v="0">전체 ${d.items.length}</button><button class="${UI.only ? 'on' : ''}" data-act="only" data-v="1">안 본 것 ${left}</button></div>` : ''}
    ${rows}
    ${bad.length ? `<div class="grp">문제로 찍은 항목<span class="must">${bad.length}개</span></div>
      <div class="q">${bad.map((x) => `<div class="small">· ${esc(x.text)}</div>`).join('')}</div>` : ''}
    ${left ? '' : `<div class="warnbar"><span class="ic">${I('lock', 22)}</span><div class="small ink">내고 나면 고칠 수 없어요.<br>공장주와 운영자가 바로 봐요.</div></div>`}
  </div><div class="ft">
    ${left ? `<button class="btn ghost" data-act="only" data-v="1">안 본 항목 ${left}개 보기</button>` : `<button class="btn" data-act="submitFirst">점검 결과 내기</button>`}
  </div></div>${UI.sheet && UI.sheet.type === 'bad' ? badSheet(s) : ''}`;
}
function badSheet(s) {
  const it = s.draft.items[UI.sheet.n];
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="mid">${esc(it.text)}</div>
    <div class="ans">문제 있음</div>
    <div class="lbl">지금 모습 (안 찍어도 돼요)</div>
    <div class="row"><div class="thumb">${UI.sheet.photo ? '📷 1장' : '없음'}</div><button class="btn ghost sm" data-act="sheetPhoto">＋ 사진 찍기</button></div>
    <div class="lbl">메모 (안 써도 돼요)</div>
    <textarea class="input" id="memoIn" placeholder="예: 바닥에 늘어진 전선 피복이 벗겨짐">${esc(it.memo || '')}</textarea>
    <div class="row"><button class="btn ghost cxl" data-act="closeSheet">취소</button><button class="btn" data-act="saveBad">저장</button></div>
  </div>`;
}
/* ---------- G6 재점검 ---------- */
function reList(s, fid) {
  const d = s.draft && s.draft.kind === 're' && s.draft.fid === fid ? s.draft : null;
  if (!d) { DB.act((s) => { s.draft = { kind: 're', fid, res: {} }; }); return ''; }
  const q = recheckQueue(s, fid), f = FACTORIES[fid];
  const n = q.filter((e) => d.res[e.it.id]).length;
  return `${sbar(f.name)}<div class="scr"><div class="bd">
    ${head('재점검 · ' + f.name, 'pre/' + fid, '<span class="small">(저장됨)</span>')}
    <div class="ai">공장주가 고쳤다고 한 항목 ${q.length}개 · ${n}개 봄</div>
    ${q.map((e) => { const r = d.res[e.it.id], fx = e.it.log[e.it.log.length - 1]; return `<div class="task${r ? '' : ' re'}">
      <div class="t mid">${esc(e.it.text)}</div>
      <div class="small">${e.ins.date} 문제 있음${e.it.memo ? ' · ' + esc(e.it.memo) : ''}</div>
      <div class="small ink">${fx.at} 공장주 "고쳤어요"${fx.note ? ` · "${esc(fx.note)}"` : ' · 설명 없음'}</div>
      ${r ? `<div class="row"><span class="ans" style="flex:1">${r.result === 'fixed' ? '✓ 고쳐짐' : '✕ 안 고쳐짐'}${r.reason ? ' · ' + r.reason : ''}</span><button class="btn ghost sm" style="flex:0 0 84px" data-act="reClear" data-id="${e.it.id}">바꾸기</button></div>`
        : `<div class="row"><button class="btn ghost" data-act="reFixed" data-id="${e.it.id}">고쳐짐</button><button class="btn ghost" data-act="reNot" data-id="${e.it.id}">안 고쳐짐</button></div>`}
    </div>`; }).join('')}
  </div><div class="ft"><button class="btn" data-go="resum/${fid}" ${n === q.length ? '' : 'disabled'}>다 봤어요 (${n}/${q.length})</button></div></div>
  ${UI.sheet && UI.sheet.type === 'not' ? notSheet(s, q) : ''}`;
}
function notSheet(s, q) {
  const e = q.find((x) => x.it.id === UI.sheet.id);
  const reasons = ['큰 공사가 필요해요', '부품·업체를 기다려요', '이유를 몰라요'];
  return `<div class="ov" data-act="closeSheet"></div><div class="sheet"><div class="grip"></div>
    <div class="mid">${esc(e.it.text)}</div>
    <div class="ans">안 고쳐짐</div>
    <div class="lbl">공장주에게 들은 사정 (안 골라도 돼요 · 다시 누르면 풀려요)</div>
    ${reasons.map((r) => `<button class="pick${UI.sheet.reason === r ? ' on' : ''}" data-act="pickReason" data-v="${r}">${r}</button>`).join('')}
    <div class="lbl">지금 모습 (안 찍어도 돼요)</div>
    <div class="row"><div class="thumb">${UI.sheet.photo ? '📷 1장' : '없음'}</div><button class="btn ghost sm" data-act="sheetPhoto">＋ 사진 찍기</button></div>
    <div class="row"><button class="btn ghost cxl" data-act="closeSheet">취소</button><button class="btn" data-act="saveNot">저장</button></div>
  </div>`;
}
function reSum(s, fid) {
  const d = s.draft, q = recheckQueue(s, fid), f = FACTORIES[fid];
  const not = q.filter((e) => d.res[e.it.id] && d.res[e.it.id].result === 'not');
  return `${sbar(f.name)}<div class="scr"><div class="bd">
    ${head('재점검 · ' + f.name, 're/' + fid)}
    <div class="donemark">${I('check', 40)}</div>
    <div class="center big">${q.length}개 다 봤어요</div>
    <div class="center small">고쳐짐 ${q.length - not.length} · 안 고쳐짐 ${not.length}</div>
    ${not.length ? `<div class="q"><div class="t">안 고쳐진 항목은 공장주에게 다시 가요</div>${not.map((e) => `<div class="small">· ${esc(e.it.text)}</div>`).join('')}</div>` : ''}
    <div class="warnbar"><span class="ic">${I('lock', 22)}</span><div class="small ink">내고 나면 고칠 수 없어요.<br>공장주와 운영자가 바로 봐요.</div></div>
  </div><div class="ft"><button class="btn ghost" data-go="re/${fid}">← 답 고치기</button><button class="btn" data-act="submitRe" data-fid="${fid}">재점검 결과 내기</button></div></div>`;
}

/* ---------- 낸 뒤 ---------- */
function sent(s) {
  const wait = unsentN(s);
  return `${sbar(s.net.guard ? '지킴이' : '📶 전파 없음')}<div class="scr"><div class="bd">
    <div class="donemark" style="${wait ? 'border-style:dashed' : ''}">${wait ? I('clock', 38) : I('check', 40)}</div>
    <div class="center big">${wait ? '휴대폰에 저장됐어요' : '올라갔어요'}</div>
    <div class="center small ink">${wait ? '전파가 없어요. <b>연결되면 저절로 올라가요.</b><br>앱을 지우거나 로그아웃하지 마세요.' : '공장주와 운영자가 지금 볼 수 있어요.'}</div>
  </div><div class="ft"><button class="btn" data-go="">홈으로</button></div></div>`;
}

function records(s) {
  const mine = s.inspections.filter((i) => i.by === ME);
  return `${sbar('지킴이')}<div class="scr"><div class="bd">
    ${head('내 점검 기록')}${pageIntro('내 점검 기록')}
    ${mine.map((i) => { const bad = i.items.filter((x) => x.answer === 'bad'); return `<div class="q"><div class="rowx"><span class="t">${FACTORIES[i.fid].name}</span><span class="small">${i.date}</span></div>
      <div class="small">${i.items.length}항목 · 문제 ${bad.length}개${bad.length ? ' · ' + bad.map((x) => ({ todo: '고침 기다림', claimed: '재점검 기다림', fixed: '고쳐짐', back: '다시 공장주에게' }[itemState(x)])).join(', ') : ''}</div></div>`; }).join('')}
    ${s.outbox.guard.map((m) => `<div class="q now"><div class="t">${FACTORIES[m.data.fid].name} · 9/17</div><div class="small">${I('clock', 14)} 휴대폰에 저장됨 · 아직 안 올라감</div></div>`).join('')}
  </div></div>`;
}
function soon(s, w) {
  return `${sbar('지킴이')}<div class="scr"><div class="bd">${head({ me: '내 정보 (시안 G1-나)', factories: '담당 공장 (시안 G8)' }[w] || '준비 중')}
    <div class="stat"><div><div class="mid">시제품 다음 차례에 만들어요</div><div class="small">모양은 HTML 시안을 보세요.</div></div></div></div></div>`;
}

/* ---------- 그리기 ---------- */
function render() {
  const s = DB.s, p = R.path();
  const d = s.draft;
  let html;
  const needFirst = ['photo', 'ai', 'pick', 'list', 'ans', 'sum'].includes(p[0]);
  if (needFirst && !(d && d.kind === 'first')) { R.go(''); return; }
  if (p[0] === 'todo') html = todo(s);
  else if (p[0] === 'pre') html = pre(s, p[1]);
  else if (p[0] === 'start') html = start(s);
  else if (p[0] === 'photo') html = photo(s);
  else if (p[0] === 'ai') html = aiWait(s);
  else if (p[0] === 'pick') html = pickScreen(s);
  else if (p[0] === 'list') html = checkList(s);
  else if (p[0] === 'ans' || p[0] === 'sum') { R.go('list'); return; }
  else if (p[0] === 're') { html = reList(s, p[1]); if (!html) return; }
  else if (p[0] === 'resum') html = reSum(s, p[1]);
  else if (p[0] === 'sent') html = sent(s);
  else if (p[0] === 'records') html = records(s);
  else if (p[0] === 'soon') html = soon(s, p[1]);
  else html = home(s);
  const keep = document.activeElement && document.activeElement.id;
  const val = keep && document.activeElement.value;
  $('#app').innerHTML = html;
  if (location.hash !== lastHash) { const sc = $('#app .scr'); if (sc) sc.classList.add('enter'); lastHash = location.hash; }
  if (keep && $('#' + keep)) { $('#' + keep).value = val; $('#' + keep).focus(); }
}
let lastHash = null;
function sheet(v) { UI.sheet = v; render(); }

const ACTS = {
  closeSheet() { sheet(null); },
  date({ fid }) {
    const v = DB.s.visits[fid];
    const day = v && v.includes('(') ? v.split(' ')[0] : null;
    sheet({ type: 'date', fid, day, tm: v && /1[2-9]:|오후/.test(v) ? '오후' : '오전' });
  },
  pickDay({ v }) { UI.sheet.day = v; render(); },
  pickTm({ v }) { UI.sheet.tm = v; render(); },
  saveDate() { const sh = UI.sheet; DB.act((s) => { s.visits[sh.fid] = `${sh.day} ${sh.tm}`; }); UI.sheet = null; toast('방문 날짜를 저장했어요'); render(); },
  newDraft({ fid }) { DB.act((s) => { s.draft = { kind: 'first', fid, photos: 0, ai: [], self: [], items: [], aiState: null }; }); R.go('pick'); },
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
      const d = s.draft, f = FACTORIES[d.fid];
      const base = (BASE_ITEMS[f.type] || BASE_ITEMS['금속가공']).map((t, i) => ({ id: 'n' + i, text: t, src: 'base' }));
      const ai = d.ai.filter((x) => x.sel).map((x) => ({ id: 'a' + x.idx, text: AI_SUGGEST[x.idx].text, src: 'ai', photo: x.photo }));
      const self = d.self.map((t, i) => ({ id: 's' + i, text: t, src: 'self' }));
      const old = Object.fromEntries(d.items.map((x) => [x.id, x]));
      d.items = [...base, ...ai, ...self].map((x) => Object.assign(x, old[x.id] ? { answer: old[x.id].answer, memo: old[x.id].memo } : { answer: null }));
    });
    R.go('list');
  },
  ans({ n, v }) { n = +n; DB.act((s) => { const it = s.draft.items[n]; it.answer = v; it.memo = ''; it.shot = false; }); },
  ansBad({ n }) { sheet({ type: 'bad', n: +n, photo: !!DB.s.draft.items[+n].shot }); },
  fold({ k }) { UI.fold[k] = !UI.fold[k]; render(); },
  only({ v }) { UI.only = v === '1'; render(); },
  sheetPhoto() { UI.sheet.photo = true; render(); },
  saveBad() {
    const n = UI.sheet.n, memo = $('#memoIn').value.trim(), ph = UI.sheet.photo;
    UI.sheet = null;
    DB.act((s) => { const it = s.draft.items[n]; it.answer = 'bad'; it.memo = memo; it.shot = ph; });
  },
  submitFirst() {
    const d = DB.s.draft;
    const data = { kind: 'first', fid: d.fid, items: d.items.map((x) => ({ id: x.id, text: x.text, src: x.src, answer: x.answer, memo: x.memo || '', log: [] })) };
    DB.act((s) => {
      if (s.net.guard) applyInspection(s, data); else s.outbox.guard.push({ type: 'inspection', data });
      DB.log(`지킴이 첫 점검 냄 · ${FACTORIES[d.fid].name}`);
      s.draft = null;
    });
    R.go('sent');
  },
  reFixed({ id }) { DB.act((s) => { s.draft.res[id] = { result: 'fixed' }; }); },
  reNot({ id }) { sheet({ type: 'not', id, reason: null, photo: false }); },
  pickReason({ v }) { UI.sheet.reason = UI.sheet.reason === v ? null : v; render(); },
  saveNot() { const sh = UI.sheet; UI.sheet = null; DB.act((s) => { s.draft.res[sh.id] = { result: 'not', reason: sh.reason, photo: sh.photo }; }); },
  reClear({ id }) { DB.act((s) => { delete s.draft.res[id]; }); },
  submitRe({ fid }) {
    const q = recheckQueue(DB.s, fid), d = DB.s.draft;
    const data = { kind: 're', fid, results: q.map((e) => ({ insId: e.ins.id, itemId: e.it.id, result: d.res[e.it.id].result === 'fixed' ? 'fixed' : 'not', reason: d.res[e.it.id].reason, photo: d.res[e.it.id].photo })) };
    DB.act((s) => {
      if (s.net.guard) applyInspection(s, data); else s.outbox.guard.push({ type: 'inspection', data });
      s.visits[fid] = null; s.draft = null;
      DB.log(`지킴이 재점검 냄 · ${FACTORIES[fid].name}`);
    });
    R.go('sent');
  },
};
wire(ACTS, render);
