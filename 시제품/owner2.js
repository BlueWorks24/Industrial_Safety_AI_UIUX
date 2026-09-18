// 공장주 웹 2 — 센서 상태·고장 신고(시안 O1-마) · 작업 예정 알리기(O1-사~자) · 안전 공지(O5) · 근로자(O6) · 의견(O7)
// owner.js의 ME · FID · UI · frame을 함께 쓴다.

const LANG_NAME = { ko: '한국어', vi: 'Tiếng Việt', en: 'English', km: 'ភាសាខ្មែរ' };
const ST_WORD = { watch: ['감시 중', 'green'], repair: ['수리 중', 'gray'], unknown: ['값 모름', 'amber'], abn: ['이상', 'red'] };
const roster = (s) => (s.workers || []).filter((w) => (w.fid || 'daesung') === FID);
const fakeTx = (ko, lang) => `(AI 번역 시연 · ${LANG_NAME[lang]}) ${ko}`;
const pillTag = (w, c) => `<span class="pill ${c}">${w}</span>`;

/* ---------- 센서 상태 칸 (지금 현황 안) ---------- */
function sensorCard(s) {
  if (!HAS_SENSORS(FID)) return kcard({ t: '센서', v: '—', rows: [['상태', '설치 전']] });
  const rows = SITE_SENSORS(FID).map((k) => {
    const st = SIM.sensor(s, k);
    const live = s.alarms.find((a) => a.key === k && SIM.live(a));
    const [w, c] = ST_WORD[live && st.state === 'watch' ? 'abn' : st.state];
    const f = (s.faults || []).find((x) => x.key === k && x.status === 'open');
    const memo = SIM.memoOn(s, k);
    let sub = SENSORS[k].where;
    if (st.state === 'repair') sub = `${st.since} 운영자가 수리 중으로 돌림 · 고칠 때까지 경보가 울리지 않아요`;
    if (st.state === 'unknown') sub = `${st.since}부터 값이 안 와요 · 운영자에게 알렸어요 · 그동안 경보가 못 울려요`;
    const rj = (s.faults || []).find((x) => x.key === k && x.status === 'rejected');
    if (rj && live) sub = `운영자가 센서는 정상이라고 봤어요 (${rj.at} 신고) · 진짜 이상일 수 있어요, 현장을 확인해 주세요`;
    if (f) sub = `${f.at} 고장 신고함 · 운영자 확인 기다림 (그동안 경보는 계속 울려요)`;
    if (memo) sub = `작업 예정 알림 적용 중 · ${memo.facts.kind} ${hm(memo.facts.start)}~${hm(memo.facts.end)}`;
    return `<div class="srow2"><span class="sic">${I(iconOf(k), 20)}</span><div class="stx"><b>${SENSORS[k].title}</b><small>${esc(sub)}</small></div>
      ${pillTag(w, c)}${live && st.state === 'watch' && !f ? `<button class="more sm" data-act="fault" data-k="${k}">센서 고장 같아요</button>` : ''}</div>`;
  }).join('');
  return `<div class="kcard"><div class="kt">센서 ${SITE_SENSORS(FID).length}대</div>${rows}
    <div class="rowx"><span class="small">평소와 다른 작업이 있으면 미리 알려 주세요. AI가 그 시간 기준을 맞춰요.</span><button class="more" data-go="now/memo" style="width:auto">작업 예정 알리기</button></div></div>`;
}

function faultDlg(s) {
  const k = UI.dlg.key, reasons = k === 'leak' ? ['바닥은 말라 있어요', '물기가 없는데 계속 울려요'] : ['기계는 멀쩡한데 값만 이상해요', '소리·냄새·열 같은 이상이 없어요'];
  return `<div class="ov" data-act="closeDlg"></div><div class="dlg wide">
    <div class="mid" style="font-size:20px">${SENSORS[k].title} 센서가 고장 같아요</div>
    <div class="small">운영자에게 알려요. 운영자가 확인하고 <b class="ink">"수리 중"</b>으로 돌려야 경보가 닫혀요.</div>
    <div class="lbl">어떤가요? (하나 고르기)</div>
    <div class="wseg">${reasons.map((r) => `<span class="${UI.dlg.reason === r ? 'on' : ''}" data-act="faultReason" data-v="${r}">${r}</span>`).join('')}</div>
    <div class="lbl">메모 (안 써도 돼요)</div>
    <input class="input" id="faultMemo" placeholder="예: 배관 밑 확인함, 물기 없음">
    <div class="row"><span class="thumb">${UI.dlg.photo ? '📷 1장' : '사진 없음'}</span><button class="btn ghost inl" data-act="faultPhoto">${k === 'leak' ? '바닥 사진 올리기' : '사진 올리기'}</button></div>
    <div class="warn">진짜 이상일 수도 있어요. <b>현장을 먼저 확인</b>하고 알려 주세요. 작업 때문에 오른 거라면 고장 신고 대신 <button class="link" data-go="now/memo">작업 예정 알리기 ›</button></div>
    <div class="row" style="justify-content:flex-end"><button class="btn ghost inl" data-act="closeDlg">취소</button><button class="btn inl" data-act="faultSend">운영자에게 알리기</button></div>
  </div>`;
}

/* ---------- 작업 예정 알리기 (엔진 submit_memo를 화면으로) ---------- */
function parseMemo(t, clock) {
  // 이 공장 센서 가운데 이름이 글에 나오면 그것, 없으면 종류 낱말로 찾는다
  const mine = SITE_SENSORS(FID);
  const type = /전기|전력|전류/.test(t) ? 'power' : /가스/.test(t) ? 'gas' : /누수|물 /.test(t) ? 'leak' : /온도|습도/.test(t) ? 'th' : null;
  const key = mine.find((k) => SENSORS[k].type === 'vib' && t.includes(SENSORS[k].title.replace(/^\d+번 /, ''))) || (type && mine.find((k) => SENSORS[k].type === type)) || null;
  const pm = /저녁|오후|밤/.test(t);
  const toH = (h) => (pm && h < 12 ? h + 12 : h);
  let start = null, end = null;
  const m = t.match(/(\d{1,2})\s*시\s*(?:부터|~|-)\s*(\d{1,2})\s*시/) || t.match(/(\d{1,2})\s*[~-]\s*(\d{1,2})\s*시/);
  if (m) { start = toH(+m[1]) * 60; end = toH(+m[2]) * 60; if (end <= start) end += 720; }
  else { const one = t.match(/(\d{1,2})\s*시/); if (one) { start = toH(+one[1]) * 60; end = start + 120; } }
  const noTime = start == null;
  if (noTime) { start = clock; end = clock + 120; }
  const lv = t.match(/(\d+(?:\.\d+)?)\s*(?:부근|정도|까지|쯤|kW)/);
  const km = t.match(/([가-힣]{1,6})\s*작업/);
  return { key, label: key ? SENSORS[key].title + (SENSORS[key].type === 'power' ? ' (공장 전체)' : '') : null, start, end, day: '9/17',
    kind: km ? km[1] : '작업', level: lv ? +lv[1] : null, noTime };
}
function memoStatus(s, m) {
  if (m.status === 'nofacts') return ['알아듣지 못함', 'amber'];
  if (m.status === 'past') return ['끝남', 'gray'];
  if (m.status === 'history') return ['바꾸지 않음', 'gray'];
  if (s.clock >= m.facts.end) return ['끝남', 'gray'];
  if (s.clock >= m.facts.start) return ['적용 중', 'green'];
  return ['예정 · 적용됨', 'blue'];
}
function memoPage(s) {
  const last = UI.memoId && (s.memos || []).find((m) => m.id === UI.memoId);
  let result = '';
  if (UI.memoWait) {
    result = `<div class="kcard"><div class="kt">${I('sparkle', 18)} AI가 읽는 중이에요</div><div class="small">보통 몇 초 걸려요.</div></div>`;
  } else if (UI.memoFail) {
    result = `<div class="kcard kalarm"><div class="kt">AI가 지금 답하지 않아요</div><div class="small ink">기준은 바뀌지 않았어요. 작업 중에 경보가 울릴 수 있어요. 급하면 운영센터(031-000-0000, 가상)에 전화해 주세요.</div>
      <button class="more" data-act="memoSend">다시 보내기</button></div>`;
  } else if (last) {
    const f = last.facts;
    const bad = last.status === 'nofacts';
    result = `<div class="kcard ${bad ? '' : 'todo'}"><div class="kt">${I('sparkle', 18)} AI가 이렇게 알아들었어요 <span class="small">· 틀릴 수 있어요</span>${bad ? '' : ' ' + pillTag('✓ 적용됨', 'green')}</div>
      ${bad ? `<div class="warn">어느 센서 이야기인지 못 알아들었어요. <b>기준은 바뀌지 않았어요.</b> ${SITE_SENSORS(FID).map((k) => `"${SENSORS[k].short}"`).join(', ')}처럼 적어 주세요.</div>` : `
      <div class="facts"><div><span>센서</span><b>${f.label}</b></div><div><span>시간</span><b>오늘 ${hm(f.start)} ~ ${hm(f.end)}</b>${f.noTime ? '<small>시간이 없어 지금부터 2시간으로 봤어요</small>' : ''}</div><div><span>작업 · 오를 수준</span><b>${f.kind}${f.level != null ? ` · ${f.level} 부근` : ' · 수준 없음'}</b></div></div>
      <div class="lbl">그래서 이렇게 바뀌어요</div>
      <ul class="bul2">${f.level != null ? `<li>그 시간 ${SENSORS[f.key].title} 기준을 <b>${f.level} 부근</b>까지 비율로 올려 잡아요</li>` : '<li>숫자가 없어 <b>범위는 올리지 않아요</b> — 수준을 적으면 그만큼 올려 잡아요</li>'}
        <li>시작·끝 무렵 몇 분은 경보를 잠시 보류해요</li><li>작업 중에는 범위 폭을 평소 폭으로 고정해요</li><li><b>사양서 안전 한계는 그대로</b>예요 — 그 선을 넘으면 작업 중이라도 경보가 울려요</li></ul>`}
      <div class="row" style="justify-content:flex-end;flex-wrap:wrap"><button class="more" style="width:auto" data-act="memoRewrite">틀렸어요 · 고쳐 쓰기</button>
      ${bad ? '' : `<button class="more" style="width:auto" data-act="memoCancel">작업 취소 <span class="hyp">엔진 보강 필요</span></button>`}</div></div>`;
  }
  return frame('', `
    <div class="kgrid">
      <div class="kcard"><div class="kt">무슨 작업이 있나요?</div>
        <textarea class="input" id="memoText" placeholder="예: 오늘 저녁 6시부터 10시까지 도장 작업이 있어서 전력이 50 부근까지 오를 예정">${esc(UI.memoText || '')}</textarea>
        <div class="lbl">이렇게 쓰면 잘 알아들어요</div>
        <ul class="bul2"><li><b>언제</b> — 몇 시부터 몇 시까지</li><li><b>무슨 작업</b></li><li><b>어느 기계·센서</b> — ${SITE_SENSORS(FID).map((k) => SENSORS[k].short).join(' · ')}</li><li><b>얼마까지</b> 오를지 — 숫자가 있으면 좋아요</li></ul>
        <button class="btn inl" data-act="memoSend">AI에게 보내기</button>
        <div class="small">보내면 <b class="ink">바로 적용</b>돼요. 공장주와 운영자가 쓸 수 있어요.</div></div>
      ${result || `<div class="kcard"><div class="kt">왜 알려야 하나요?</div><div class="small ink">평소와 다른 작업으로 값이 오르면 AI가 이상으로 보고 근로자에게 경보가 가요. 미리 알려 주면 그 시간 기준을 맞춰 헛경보를 줄여요. 센서를 끄는 "수리 중"과 달리 센서는 계속 지켜봐요.</div></div>`}
    </div>
    <div class="kt plain">보낸 작업 예정</div>
    <div class="tscroll"><table><tr><th>보낸 때</th><th>보낸 글</th><th>AI가 알아들은 것</th><th>결과</th></tr>
      ${(s.memos || []).map((m) => { const [w, c] = memoStatus(s, m); const f = m.facts;
        return `<tr><td>${m.at}</td><td>${esc(m.text)}</td><td>${f && f.label ? `${esc(f.label)} · ${esc(f.kind)}${f.level != null ? ' · ' + f.level : ''}${f.start != null ? `<br><span class="small">${hm(f.start)}~${hm(f.end)}</span>` : ''}` : '—'}</td><td>${pillTag(w, c)}${m.result ? `<br><span class="small">${esc(m.result)}</span>` : ''}</td></tr>`; }).join('')}
    </table></div>`, false, 'memo');
}

/* ---------- 안전 공지 (O5) ---------- */
function noticeList(s) {
  const list = (s.notices || []).filter((n) => n.fid === FID), ro = roster(s);
  return frame('notice', `
    <div class="rowx"><span class="kt plain">올린 공지 ${list.length}건</span><button class="btn inl" data-go="notice/new">${I('plus', 18)} 공지 쓰기</button></div>
    ${list.length ? `<div class="tscroll"><table><tr><th>올린 날</th><th>제목</th><th>위험성평가</th><th>읽음</th><th></th></tr>
      ${list.map((n) => { const rd = Object.keys(n.readBy).length, tr = Object.values(n.readBy).filter((r) => r.lang !== 'ko').length;
        return `<tr class="click" data-go="notice/${n.id}"><td>${n.date}</td><td><b>${esc(n.title.ko)}</b>${(n.badTr || []).length ? ` ${pillTag('번역 이상 ' + n.badTr.length, 'amber')}` : ''}</td><td>${n.ra ? esc(n.ra) : '—'}</td>
        <td><b>${rd}</b> / ${ro.length}명${tr ? `<br><span class="small">번역으로 ${tr}명</span>` : ''}</td><td class="go">보기 ›</td></tr>`; }).join('')}</table></div>`
      : '<div class="kcard"><div class="small">아직 올린 공지가 없어요.</div></div>'}`);
}
function noticeNew(s) {
  const ro = roster(s), byLang = {};
  ro.filter((w) => w.lang !== 'ko').forEach((w) => { byLang[w.lang] = (byLang[w.lang] || 0) + 1; });
  const d = UI.nd || (UI.nd = { title: '', body: '', ra: true });
  return frame('notice', `
    <div class="kgrid"><div class="kcard"><div class="kt">새 공지</div>
      <div class="lbl">제목</div><input class="input" id="ndTitle" value="${esc(d.title)}" placeholder="예: 지게차 다닐 때 통로 비우기">
      <div class="lbl">내용</div><textarea class="input" id="ndBody" style="min-height:150px" placeholder="짧은 문장으로 나눠 쓰면 번역이 덜 틀려요">${esc(d.body)}</textarea>
      <div class="lbl">위험성평가와 연결</div>
      <div class="wseg"><span class="${d.ra ? 'on' : ''}" data-act="ndRa" data-v="1">예 — 9월 위험성평가</span><span class="${d.ra ? '' : 'on'}" data-act="ndRa" data-v="0">아니요</span></div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost inl" data-go="notice">취소</button><button class="btn inl" data-act="ndPost">올리기</button></div></div>
    <div class="kcard"><div class="kt">받는 사람</div>
      ${kcardBody(ro.length + '명', [['한국어', ro.length - Object.values(byLang).reduce((a, b) => a + b, 0) + '명'], ...Object.entries(byLang).map(([l, n]) => [LANG_NAME[l] + ' (AI 번역)', n + '명'])])}
      <div class="warn">${Object.entries(byLang).map(([l, n]) => `${LANG_NAME[l]} ${n}명`).join(' · ')}에게는 <b>AI 번역</b>으로 가요. 짧은 문장이면 덜 틀려요. 번역이 이상하면 근로자가 "번역이 이상해요"를 누를 수 있어요.</div>
      <div class="small">올린 공지는 <b class="ink">고칠 수 없어요</b>. 틀렸으면 새로 올려요.</div></div></div>
    ${UI.dlg && UI.dlg.type === 'ndPost' ? `<div class="ov" data-act="closeDlg"></div><div class="dlg wide"><div class="mid" style="font-size:20px">공지를 올릴까요?</div>
      <div class="q" style="box-shadow:inset 0 0 0 1px var(--line)"><div class="t">${esc(d.title)}</div><div class="small">${esc(d.body).replace(/\n/g, '<br>')}</div></div>
      <div class="warn">근로자 ${ro.length}명에게 바로 알림이 가요. <b>올린 뒤에는 고칠 수 없어요.</b></div>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost inl" data-act="closeDlg">더 고치기</button><button class="btn inl" data-act="ndConfirm">올리기</button></div></div>` : ''}`);
}
function kcardBody(v, rows) {
  return `<div class="kbody"><div class="kv">${v}</div><div class="kside">${rows.map(([k, x]) => `<div><span>${k}</span><em>${x}</em></div>`).join('')}</div></div>`;
}
function noticeOne(s, id) {
  const n = (s.notices || []).find((x) => x.id === id && x.fid === FID);
  if (!n) return noticeList(s);
  const ro = roster(s);
  const read = ro.filter((w) => n.readBy[w.name]), unread = ro.filter((w) => !n.readBy[w.name]);
  return frame('notice', `
    <div class="rowx"><span class="h1"><button class="link" data-go="notice">← 공지 목록</button> ${esc(n.title.ko)}</span><span class="small">${n.date} · ${esc(n.by)}${n.ra ? ' · ' + esc(n.ra) : ''} · ${I('lock', 14)} 고칠 수 없음</span></div>
    <div class="kgrid">
      <div class="kcard"><div class="kt">내용</div><div style="line-height:1.7">${esc(n.body.ko).replace(/\n/g, '<br>')}</div>
        ${(n.badTr || []).length ? `<div class="warn">"번역이 이상해요" ${n.badTr.length}건 — ${n.badTr.map((b) => `${esc(b.by)}(${LANG_NAME[b.lang]})`).join(', ')}. 직접 말로 설명해 주세요.</div>` : ''}</div>
      <div class="kcard"><div class="kt">읽음 ${read.length} / ${ro.length}명</div>
        ${read.map((w) => { const r = n.readBy[w.name]; return `<div class="rrow"><b>${esc(w.name)}</b><span class="small">${r.at} 읽음${r.lang !== 'ko' ? ` · <b class="ink">${LANG_NAME[r.lang]} AI 번역으로 읽음</b>` : ''}</span></div>`; }).join('')}
        <div class="lbl">안 읽은 사람 ${unread.length}명</div>
        ${unread.map((w) => `<div class="rrow"><b>${esc(w.name)}</b><span class="small">${LANG_NAME[w.lang]}${w.notif ? '' : ' · <b style="color:var(--red-d)">앱 알림 꺼짐</b>'}</span></div>`).join('') || '<div class="small">모두 읽었어요.</div>'}
        ${unread.length ? `<button class="more" data-act="nRemind" data-id="${n.id}">안 읽은 ${unread.length}명에게 다시 알리기</button>` : ''}</div>
    </div>`);
}

/* ---------- 근로자 (O6) ---------- */
function workersPage(s) {
  const ro = roster(s), off = ro.filter((w) => !w.notif);
  if (!UI.invites && !UI.invLoading) {
    UI.invLoading = true;
    fetch('api/invites').then((r) => r.json()).then((j) => { UI.invites = Array.isArray(j) ? j : []; UI.invLoading = false; render(); }).catch(() => { UI.invLoading = false; });
  }
  const names = new Set(ro.map((w) => w.name));
  const mine = (UI.invites || []).filter((i) => i.status === 'open' && !['DS-KIM', 'DS-NGUYEN'].includes(i.code) && !names.has(i.name));
  const made = UI.newInv;
  return frame('workers', `
    <div class="rowx"><span class="kt plain">근로자 ${ro.length}명 <span class="small">· 경보와 안전 공지를 받는 사람</span></span><button class="btn inl" data-act="invOpen">${I('plus', 18)} 근로자 초대</button></div>
    ${off.length ? `<div class="warn">${off.map((w) => `<b>${esc(w.name)}</b>`).join(', ')}의 앱 알림이 꺼져 있어요 — 경보가 울리지 않아요. 직접 말해 주세요.</div>` : ''}
    ${UI.invForm ? `<div class="kgrid"><div class="kcard"><div class="kt">근로자 초대</div>
        <div class="lbl">이름</div><input class="input" id="invName" placeholder="예: 김용역">
        <div class="lbl">앱 화면 언어</div><div class="wseg">${['ko', 'vi', 'en'].map((l) => `<span class="${UI.invLang === l ? 'on' : ''}" data-act="invLang" data-v="${l}">${LANG_NAME[l]}</span>`).join('')}</div>
        <div class="lbl">일하는 곳 (안 골라도 돼요)</div><div class="wseg">${['A동', 'A동 2라인', 'B동'].map((a) => `<span class="${UI.invArea === a ? 'on' : ''}" data-act="invArea" data-v="${a}">${a}</span>`).join('')}</div>
        <div class="row" style="justify-content:flex-end"><button class="btn ghost inl" data-act="invClose">닫기</button><button class="btn inl" data-act="invMake">초대 만들기</button></div></div>
      ${made ? `<div class="kcard todo"><div class="kt">${esc(made.name)} 님 초대</div>
        <div class="qrbox">${fakeQR(made.code)}<div><div class="small">근로자 휴대폰으로 이 QR을 찍게 하세요</div><div class="code">${made.code}</div>
        <div class="small">7일 동안 한 번만 쓸 수 있어요</div></div></div>
        <div class="row"><button class="more" data-act="invCopy" data-code="${made.code}">링크 복사</button><a class="more" href="worker.html#/join/${made.code}" target="_blank">근로자 앱에서 열어 보기</a></div></div>`
        : `<div class="kcard"><div class="kt">초대는 어떻게 쓰나요?</div><div class="small ink">초대는 사람마다 하나예요. 사무실에서 QR을 바로 찍게 하거나 링크를 메신저로 보내요. 근로자는 들어올 때 이름과 공장만 확인하고, 처음부터 자기 언어로 봐요.</div></div>`}</div>` : ''}
    <div class="tscroll"><table><tr><th>이름</th><th>언어</th><th>앱 알림</th><th>들어온 날</th><th>일하는 곳</th><th></th></tr>
      ${ro.map((w) => `<tr><td><b>${esc(w.name)}</b></td><td>${LANG_NAME[w.lang] || w.lang}</td><td>${w.notif ? pillTag('켜짐', 'green') : pillTag('꺼짐', 'red')}</td><td>${w.joined}</td><td>${esc(w.area || '—')}</td>
        <td><button class="more sm danger" data-act="wOut" data-n="${esc(w.name)}">빼기</button></td></tr>`).join('')}</table></div>
    <div class="kt plain">초대했지만 아직 안 들어온 사람 ${mine.length}명</div>
    ${mine.length ? `<div class="tscroll"><table>${mine.map((i) => `<tr><td><b>${esc(i.name)}</b></td><td>${LANG_NAME[i.lang]}</td><td>${esc(i.area || '—')}</td><td class="small">${i.code}</td>
      <td><button class="more sm" data-act="invCopy" data-code="${i.code}">링크 복사</button> <button class="more sm" data-act="invCancel" data-code="${i.code}">초대 취소</button></td></tr>`).join('')}</table></div>`
      : '<div class="small">없어요. 안 들어온 사람은 공지 읽음 인원에 넣지 않아요.</div>'}
    ${UI.dlg && UI.dlg.type === 'wOut' ? `<div class="ov" data-act="closeDlg"></div><div class="dlg wide"><div class="mid" style="font-size:20px">${esc(UI.dlg.n)} 님을 명단에서 뺄까요?</div>
      <div class="warn">· 이제 <b>경보와 안전 공지를 받지 않아요</b><br>· 앱에 들어오지 못해요<br>· 남긴 기록(조치 완료·공지 읽음)은 이름 그대로 남아요</div>
      <div class="row" style="justify-content:flex-end"><button class="btn inl" data-act="closeDlg">빼지 않기</button><button class="btn ghost inl danger" data-act="wOutOk">빼기</button></div></div>` : ''}`);
}
function fakeQR(code) {
  let h = 0; for (const c of code) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const cells = [];
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
    const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    let on;
    if (finder) { const fx = x > 13 ? x - 14 : x, fy = y > 13 ? y - 14 : y; on = fx === 0 || fy === 0 || fx === 6 || fy === 6 || (fx > 1 && fx < 5 && fy > 1 && fy < 5); }
    else { h = (h * 1103515245 + 12345) >>> 0; on = (h >> 16) & 1; }
    if (on) cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
  }
  return `<svg class="qr" viewBox="-1 -1 23 23" width="132" height="132"><rect x="-1" y="-1" width="23" height="23" fill="#fff"/>${cells.join('')}</svg>`;
}

/* ---------- 의견 (O7) ---------- */
function voiceList(s) {
  const list = (s.voices || []).filter((v) => v.fid === FID).sort((a, b) => (a.kind === 'danger' ? 0 : 1) - (b.kind === 'danger' ? 0 : 1) || (b.date > a.date ? 1 : -1));
  const KIND = { danger: ['위험해 보여요', 'red'], better: ['바꾸면 좋겠어요', 'blue'], etc: ['기타', 'gray'] };
  return frame('voice', `
    <div class="kt plain">받은 의견 ${list.length}건 <span class="small">· 안 읽음 ${list.filter((v) => !v.readAt).length}</span></div>
    <div class="tscroll"><table><tr><th>받은 날</th><th>종류</th><th>내용</th><th>보낸 사람</th><th>진행</th><th></th></tr>
      ${list.map((v) => `<tr class="click" data-go="voice/${v.id}"><td>${v.date}</td><td>${pillTag(...KIND[v.kind])}</td>
        <td>${esc(v.lang === 'ko' ? v.text : v.koTx || fakeTx(v.text, 'ko'))}${v.photo ? ' 📷' : ''}</td><td>${v.anon ? '<span class="small">이름 뺌</span>' : esc(v.author)}</td>
        <td>${v.done ? pillTag('해결함', 'green') : v.reply ? pillTag('답함', 'blue') : v.readAt ? pillTag('읽음', 'gray') : pillTag('안 읽음', 'amber')}</td><td class="go">보기 ›</td></tr>`).join('')}
    </table></div>
    <div class="small">이름을 뺀 의견은 <b class="ink">보낸 사람과 쓴 언어가 보이지 않아요.</b> 받은 의견은 고치거나 지울 수 없어요.</div>`);
}
function voiceOne(s, id) {
  const v = (s.voices || []).find((x) => x.id === id && x.fid === FID);
  if (!v) return voiceList(s);
  if (!v.readAt) setTimeout(() => DB.act((st) => { const x = st.voices.find((y) => y.id === id); if (x && !x.readAt) { x.readAt = '9/17'; DB.log('대표님 의견 읽음'); } }), 0);
  const foreign = v.lang !== 'ko';
  const shown = foreign ? v.koTx || fakeTx(v.text, 'ko') : v.text;
  return frame('voice', `
    <div class="rowx"><span class="h1"><button class="link" data-go="voice">← 받은 의견</button></span><span class="small">${v.date} · ${v.anon ? '이름 뺌' : esc(v.author)} · ${I('lock', 14)} 고칠 수 없음</span></div>
    <div class="kgrid">
      <div class="kcard"><div class="kt">${{ danger: '위험해 보여요', better: '바꾸면 좋겠어요', etc: '기타' }[v.kind]}</div>
        <div style="font-size:18px;line-height:1.6">${esc(shown)}</div>
        ${foreign ? `<div class="aitag2">${I('sparkle', 14)} AI 번역 · 틀릴 수 있어요${v.anon ? ' · 이름을 뺀 의견이라 원문과 쓴 언어는 보이지 않아요' : ''}</div>${v.anon ? '' : `<div class="small">원문 (${LANG_NAME[v.lang]}): ${esc(v.text)}</div>`}` : ''}
        ${v.photo ? `<div class="ph" style="width:120px;height:80px">📷 사진</div>` : ''}</div>
      <div class="kcard"><div class="kt">답하기</div>
        ${v.reply ? `<div class="rrow"><b>${v.replyAt} 보낸 답</b><span>${esc(v.reply)}</span></div>` : `
        <textarea class="input" id="vReply" placeholder="예: 내일 기름받이 달겠습니다.">${esc(UI.vReply || '')}</textarea>
        ${foreign ? `<div class="small">답은 ${v.anon ? '보낸 사람의 언어로' : LANG_NAME[v.lang] + '로'} AI 번역돼서 가요.</div>` : ''}
        <button class="btn inl" data-act="vReplySend" data-id="${v.id}">답 보내기</button>`}
        <div class="rowx"><span class="small">${v.done ? `${I('checkCircle', 16)} 해결함으로 표시했어요` : '고쳤거나 처리했으면 해결함으로 표시해요.'}</span>
        ${v.done ? '' : `<button class="more" style="width:auto" data-act="vDone" data-id="${v.id}">해결함 표시</button>`}</div>
        <div class="small">답과 해결함 표시도 <b class="ink">보낸 뒤에는 고칠 수 없어요.</b></div></div>
    </div>`);
}

/* ---------- 동작 ---------- */
Object.assign(ACTS, {
  fault({ k }) {
    const key = k || (DB.s.alarms.find((a) => SIM.live(a)) || {}).key;
    if (!key) return;
    UI.dlg = { type: 'fault', key, reason: null, photo: false }; render();
  },
  faultReason({ v }) { UI.dlg.reason = UI.dlg.reason === v ? null : v; render(); },
  faultPhoto() { UI.dlg.photo = !UI.dlg.photo; render(); },
  faultSend() {
    const d = UI.dlg, memo = ($('#faultMemo') || {}).value || '';
    if (!d.reason) { toast('어떤 상태인지 하나 골라 주세요'); return; }
    UI.dlg = null;
    DB.act((s) => { s.faults = s.faults || []; s.faults.unshift({ id: 'f' + Date.now().toString(36), key: d.key, fid: FID, by: ME, at: hm(s.clock), reason: d.reason, memo, photo: d.photo, status: 'open' }); DB.log(`${ME} ${SENSORS[d.key].title} 고장 신고 → 운영자`); });
    toast('운영자에게 알렸어요 · 확인하면 여기에 보여요');
  },
  memoSend() {
    const t = (($('#memoText') || {}).value || UI.memoText || '').trim();
    if (!t) { toast('작업 내용을 적어 주세요'); return; }
    UI.memoText = t; UI.memoWait = true; UI.memoFail = false; render();
    setTimeout(() => {
      UI.memoWait = false;
      if (DB.s.aiDown) { UI.memoFail = true; render(); return; }
      const id = 'm' + Date.now().toString(36);
      DB.act((s) => {
        const f = parseMemo(t, s.clock);
        s.memos = s.memos || [];
        s.memos.unshift({ id, at: '9/17 ' + hm(s.clock), by: ME, text: t, facts: f, status: f.key ? 'applied' : 'nofacts', result: '' });
        DB.log(`${ME} 작업 예정 알림 · ${f.key ? f.label + ' ' + hm(f.start) + '~' + hm(f.end) : '알아듣지 못함'}`);
      });
      UI.memoId = id; UI.memoText = ''; render();
    }, 1400);
  },
  memoRewrite() { const m = DB.s.memos.find((x) => x.id === UI.memoId); UI.memoText = m ? m.text : ''; UI.memoId = null; render(); setTimeout(() => $('#memoText') && $('#memoText').focus(), 30); },
  memoCancel() { toast('작업 취소를 되돌리는 기능은 엔진에 아직 없어요 (보강 필요). 같은 시간에 고쳐 쓰면 앞의 것을 덮어요.'); },
  ndRa({ v }) { UI.nd.ra = v === '1'; render(); },
  ndPost() {
    UI.nd.title = $('#ndTitle').value.trim(); UI.nd.body = $('#ndBody').value.trim();
    if (!UI.nd.title || !UI.nd.body) { toast('제목과 내용을 적어 주세요'); return; }
    UI.dlg = { type: 'ndPost' }; render();
  },
  ndConfirm() {
    const d = UI.nd, id = 'n' + Date.now().toString(36);
    DB.act((s) => {
      s.notices.unshift({ id, fid: FID, date: '9/17', by: ME, ra: d.ra ? '9월 위험성평가' : null,
        title: { ko: d.title, vi: fakeTx(d.title, 'vi'), en: fakeTx(d.title, 'en') },
        body: { ko: d.body, vi: fakeTx(d.body, 'vi'), en: fakeTx(d.body, 'en') }, readBy: {} });
      DB.log(`${ME} 안전 공지 올림 · ${d.title}`);
    });
    UI.dlg = null; UI.nd = null;
    toast('공지를 올렸어요 · 근로자 앱에 새 공지로 떠요');
    R.go('notice/' + id);
  },
  nRemind() { toast('안 읽은 사람에게 다시 알렸어요'); DB.act((s) => DB.log(`${ME} 공지 다시 알림`)); },
  invOpen() { UI.invForm = true; UI.newInv = null; UI.invLang = UI.invLang || 'ko'; render(); setTimeout(() => $('#invName') && $('#invName').focus(), 30); },
  invClose() { UI.invForm = false; UI.newInv = null; render(); },
  invLang({ v }) { const n = $('#invName').value; UI.invLang = v; render(); $('#invName').value = n; },
  invArea({ v }) { const n = $('#invName').value; UI.invArea = UI.invArea === v ? null : v; render(); $('#invName').value = n; },
  async invMake() {
    const name = $('#invName').value.trim();
    if (!name) { toast('이름을 적어 주세요'); return; }
    const r = await fetch('api/invite/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, lang: UI.invLang, area: UI.invArea }) });
    const j = await r.json();
    if (!r.ok) { toast(j.error || '초대를 만들지 못했어요'); return; }
    UI.newInv = j; UI.invites = null; render();
  },
  async invCopy({ code }) {
    const url = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}worker.html#/join/${code}`;
    try { await navigator.clipboard.writeText(url); toast('초대 링크를 복사했어요'); } catch (e) { toast(url); }
  },
  async invCancel({ code }) {
    await fetch('api/invite/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    UI.invites = null; toast('초대를 취소했어요'); render();
  },
  wOut({ n }) { UI.dlg = { type: 'wOut', n }; render(); },
  wOutOk() {
    const n = UI.dlg.n; UI.dlg = null;
    DB.act((s) => { s.workers = s.workers.filter((w) => !(w.name === n && (w.fid || 'daesung') === FID)); DB.log(`${ME} 근로자 뺌 · ${n}`); });
    toast(`${n} 님을 뺐어요`);
  },
  vReplySend({ id }) {
    const t = ($('#vReply').value || '').trim();
    if (!t) { toast('답을 적어 주세요'); return; }
    DB.act((s) => { const v = s.voices.find((x) => x.id === id); v.reply = t; v.replyAt = '9/17'; v.readAt = v.readAt || '9/17';
      v.replyTx = { vi: fakeTx(t, 'vi'), en: fakeTx(t, 'en') }; DB.log(`${ME} 의견에 답함`); });
    UI.vReply = ''; toast('답을 보냈어요 · 근로자 앱에 알림이 가요');
  },
  vDone({ id }) { DB.act((s) => { const v = s.voices.find((x) => x.id === id); v.done = true; v.readAt = v.readAt || '9/17'; DB.log(`${ME} 의견 해결함`); }); },
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'memoText') UI.memoText = e.target.value;
  if (e.target.id === 'vReply') UI.vReply = e.target.value;
  if (e.target.id === 'ndTitle' && UI.nd) UI.nd.title = e.target.value;
  if (e.target.id === 'ndBody' && UI.nd) UI.nd.body = e.target.value;
});
