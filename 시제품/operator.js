// 운영자 웹 — 시안 M1 현황판 · M2 공장. 담당 공장 전체를 본다. (지킴이 배정·체크리스트·통계는 다음 차례)
const OPER = (() => {
  let ME = '이운영';
  const UI = { menu: false, lastPath: null, dlg: null };
  const TABS = [['', '현황판'], ['factories', '공장'], ['soon/assign', '지킴이 배정'], ['soon/checklist', '체크리스트'], ['soon/stats', '통계']];
  const alarmsOf = (s, fid) => s.alarms.filter((a) => alarmFid(a) === fid);

  const PAGE = {
    '': ['담당 공장 현황판', '지금 손쓸 곳과 공장별 상태를 확인하세요. 산업안전지킴이 운영센터 화면이에요.'],
    factories: ['공장', '담당 공장의 지금 상태, 지킴이 점검, 센서 이상 기록을 봐요. 기록은 운영자도 고칠 수 없어요.'],
  };
  function frame(active, body, split, after) {
    const [title, desc] = PAGE[active] || [(TABS.find(([p]) => p === active) || ['', '준비 중'])[1], '시제품 다음 차례에 만들어요.'];
    return webFrame({ brand: '산업안전 운영', org: '산업안전지킴이 운영센터', who: `${ME} · 운영자`,
      tabs: TABS, active, title, desc, body, split, menu: UI.menu, after });
  }

  function summary(s, fid) {
    const live = alarmsOf(s, fid).filter(SIM.live);
    const items = [];
    s.inspections.filter((i) => i.fid === fid && APPROVED(i)).forEach((ins) => ins.items.filter(TRACKED).forEach((it) => items.push({ ins, it, st: itemState(it) })));
    const n = (k) => items.filter((e) => e.st === k).length;
    const last = s.inspections.find((i) => i.fid === fid && APPROVED(i));
    return { fid, f: FACTORIES[fid], live, esc: live.filter((a) => a.escalated), open: live.filter((a) => a.status !== 'watch'),
      todo: n('todo'), back: n('back'), claimed: n('claimed'), fixed: n('fixed'), last, visit: s.visits[fid], items };
  }

  // 살펴볼 곳 — 운영자가 손을 써야 할 것만 위로 (시안 M1-가)
  function watchList(s, sums) {
    const out = [];
    sums.forEach((x) => {
      x.esc.forEach((a) => out.push({ lv: 0, fid: x.fid, t: `${x.f.name} · ${SIM.title(a)}`, d: `미루기 ${a.snoozes}번 다 씀 · 아직 이상 · ${hm(a.start)}부터`, tag: '위로 올라온 경보' }));
      x.open.filter((a) => !a.escalated && s.clock - a.start >= 5).forEach((a) => out.push({ lv: 1, fid: x.fid, t: `${x.f.name} · ${SIM.title(a)}`, d: `${a.status === 'open' ? '조치 안 됨' : '다시 알림 중'} · ${s.clock - a.start}분째`, tag: '오래 걸리는 경보' }));
      (s.faults || []).filter((f) => f.fid === x.fid && f.status === 'open').forEach((f) => out.push({ lv: 0, fid: x.fid, t: `${x.f.name} · ${SENSORS[f.key].title} 고장 신고`, d: `${f.at} ${f.by} · "${f.reason}" · 확인하고 수리 중으로 돌려 주세요`, tag: '고장 신고' }));
      SITE_SENSORS(x.fid).filter((k) => SIM.sensor(s, k).state === 'unknown').forEach((k) => out.push({ lv: 1, fid: x.fid, t: `${x.f.name} · ${SENSORS[k].title} 값 모름`, d: `${SIM.sensor(s, k).since}부터 값이 안 와요 · 그동안 경보가 못 울려요`, tag: '값 끊김' }));
      if (x.claimed && !x.visit) out.push({ lv: 2, fid: x.fid, t: `${x.f.name} · 재점검 ${x.claimed}개`, d: '방문 날짜를 아직 안 정했어요 · 담당 김지킴', tag: '날짜 안 정함' });
    });
    return out.sort((a, b) => a.lv - b.lv);
  }

  function board(s) {
    const sums = Object.keys(FACTORIES).map((fid) => summary(s, fid));
    const wl = watchList(s, sums);
    const liveN = sums.reduce((a, x) => a + x.live.length, 0);
    const openN = sums.reduce((a, x) => a + x.open.length, 0);
    const escN = sums.reduce((a, x) => a + x.esc.length, 0);
    const reqN = sums.reduce((a, x) => a + x.items.length, 0);
    const fixN = sums.reduce((a, x) => a + x.fixed, 0);
    const doneThisMonth = sums.filter((x) => x.last && x.last.date.startsWith('9/')).length;
    const claimed = sums.reduce((a, x) => a + x.claimed, 0);
    const noDate = sums.filter((x) => x.claimed && !x.visit).length;
    return frame('', `
      <div class="kgrid">
        ${kcard({ t: '점검실적 · 9월', v: pct(doneThisMonth, sums.length), unit: '%', rows: [['계획', sums.length + '곳'], ['실적', doneThisMonth + '곳']], go: 'factories' })}
        ${kcard({ t: '개선지도', v: pct(fixN, reqN), unit: reqN ? '%' : '', rows: [['요청', reqN + '건'], ['고쳐짐 확인', fixN + '건']], go: 'factories' })}
        ${kcard({ t: '진행 중 경보', v: liveN, unit: '건', tone: liveN ? 'kalarm' : '', rows: [['조치 안 됨', openN + '건'], ['위로 올라옴', escN + '건']] })}
        ${kcard({ t: '재점검 기다림', v: claimed, unit: '개', rows: [['날짜 안 정한 공장', noDate + '곳']] })}
      </div>
      <div class="kcard"><div class="kt">살펴볼 곳 ${wl.length}건</div>
        ${wl.map((w) => `<button class="wrow${w.lv === 0 ? ' hot' : ''}" data-go="factory/${w.fid}"><span class="tagp">${w.tag}</span><b>${esc(w.t)}</b><span class="small">${esc(w.d)}</span><span class="go">보기 ›</span></button>`).join('')
          || '<div class="small">지금 손쓸 곳이 없어요.</div>'}
      </div>
`, true, `<div class="kt plain">공장별 상태 <span class="small">· 센서 사이트 ${sums.filter((x) => HAS_SENSORS(x.fid)).length}곳</span></div>
      ${factoryTable(sums, s)}
      <div class="proto">시제품 · 가상 데이터</div>`);
  }

  function sensorSum(s, fid) {
    const ks = SITE_SENSORS(fid);
    if (!ks.length) return '<span class="small">없음 · 점검만</span>';
    const n = (st) => ks.filter((k) => SIM.sensor(s, k).state === st).length;
    return `${ks.length}대${n('repair') ? ` <span class="pill gray">수리 중 ${n('repair')}</span>` : ''}${n('unknown') ? ` <span class="pill amber">모름 ${n('unknown')}</span>` : ''}`;
  }
  function factoryTable(sums, s) {
    return `<div class="tscroll"><table><tr><th>공장</th><th>지역 · 업종</th><th>센서</th><th>지금</th><th>고칠 것</th><th>재점검</th><th>다음 방문</th><th></th></tr>
      ${sums.map((x) => `<tr class="click" data-go="factory/${x.fid}"><td><b>${x.f.name}</b></td><td>${x.f.area} · ${x.f.type}</td>
        <td>${sensorSum(s, x.fid)}</td>
        <td>${x.live.length ? `<span class="pill red">경보 ${x.live.length}건</span>` : HAS_SENSORS(x.fid) ? '<span class="pill green">이상 없음</span>' : '<span class="small">—</span>'}</td>
        <td>${x.todo + x.back ? `${x.todo + x.back}개${x.back ? ` <span class="pill amber">되돌아옴 ${x.back}</span>` : ''}` : '—'}</td>
        <td>${x.claimed ? `기다림 ${x.claimed}` : '—'}</td>
        <td>${x.visit ? '📅 ' + x.visit : '<span class="small">안 정함</span>'}</td><td class="go">보기 ›</td></tr>`).join('')}
    </table></div>`;
  }

  function factories(s) {
    const sums = Object.keys(FACTORIES).map((fid) => summary(s, fid));
    return frame('factories', `<div class="rowx"><span class="kt plain">담당 공장 ${sums.length}곳</span><button class="more" data-act="soon">＋ 공장 등록</button></div>${factoryTable(sums, s)}`);
  }

  const WORD = { todo: '아직 안 고침', claimed: '재점검 기다림', fixed: '고쳐짐 확인', back: '안 고쳐짐 → 공장주에게' };
  function factory(s, fid) {
    const x = summary(s, fid);
    const al = alarmsOf(s, fid);
    return frame('factories', `
      <div class="rowx"><span class="h1"><button class="link" data-go="factories">← 공장 목록</button> ${x.f.name}</span><span class="small">${x.f.area} · ${x.f.type} · 근로자 ${x.f.workers}명 · 담당 지킴이 김지킴</span></div>
      <div class="kgrid">
        <div class="kcard ${x.live.length ? 'kalarm' : ''}"><div class="kt">지금 ${x.live.length ? `경보 ${x.live.length}건` : '이상 없음'}</div>
          ${x.live.map((a) => `<div class="small ink">⚠ ${esc(SIM.title(a))} · ${a.status === 'open' ? '조치 안 됨' : a.status === 'remind' ? '다시 알림 중' : '조치됨, 지켜보는 중'}${a.escalated ? ' · <b>미루기 다 씀</b>' : ''}</div>`).join('') || (HAS_SENSORS(fid) ? '<div class="small">센서 모두 감시 중</div>' : '<div class="small">센서 없음</div>')}
          ${x.live.length ? '<div class="small">센서 고장이면 공장주 신고를 받아 "수리 중"으로 돌려요 (다음 차례)</div>' : ''}</div>
        ${HAS_SENSORS(fid) ? sensorAdmin(s, fid) : '<div class="kcard"><div class="kt">센서</div><div class="small">센서를 달지 않은 곳이에요 · 지킴이 점검만 해요</div></div>'}
        <div class="kcard"><div class="kt">지킴이 점검</div>
          <div class="small">마지막 점검: ${x.last ? x.last.date : '없음'} · 다음 방문: ${x.visit || '안 정함'}</div>
          ${x.items.map((e) => `<div class="small">· ${esc(e.it.text)} — <b class="ink">${WORD[e.st]}</b></div>`).join('') || '<div class="small">문제 항목 없음</div>'}</div>
      </div>
      <div class="kt plain">센서 이상 기록</div>
      ${al.length ? `<div class="tscroll"><table><tr><th>시작</th><th>무엇이</th><th>조치 완료</th><th>끝남</th></tr>
        ${al.map((a) => { const k = a.acks[0]; return `<tr><td>${a.day} ${hm(a.start)}</td><td><b>${esc(SIM.title(a))}</b></td><td>${k ? `${esc(k.by)} · ${k.at - a.start}분 뒤` : '—'}</td><td>${SIM.live(a) ? '<b>진행 중</b>' : SIM.endWord(a)}</td></tr>`; }).join('')}
      </table></div>` : '<div class="kcard"><div class="small">최근 3개월 기록 없음</div></div>'}
      <div class="small">🔒 기록은 운영자도 고칠 수 없어요.</div>`);
  }

  const STW = { watch: ['감시 중', 'green'], repair: ['수리 중', 'gray'], unknown: ['값 모름', 'amber'] };
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
    }).join('')}</div>`;
  }
  function opDlg(s) {
    const k = UI.dlg.k, f = (s.faults || []).find((x) => x.key === k && x.status === 'open');
    const live = s.alarms.filter((a) => a.key === k && SIM.live(a));
    const recent = s.alarms.filter((a) => a.key === k).slice(0, 3);
    return `<div class="ov" data-act="opClose"></div><div class="dlg wide">
      <div class="mid" style="font-size:20px">${FACTORIES[SENSORS[k].fid].name} · ${SENSORS[k].title} 센서 고장 신고</div>
      ${f ? `<div class="q" style="box-shadow:inset 0 0 0 1px var(--line)"><div class="t">${f.at} ${esc(f.by)} · "${esc(f.reason)}"</div><div class="small">${esc(f.memo || '메모 없음')}${f.photo ? ' · 📷 사진 1장' : ''}</div></div>` : ''}
      <div class="small">최근 경보: ${recent.map((a) => `${a.day} ${hm(a.start)} ${SIM.endWord(a)}`).join(' · ') || '없음'}</div>
      ${SENSORS[k].kind === 'state' ? '<div class="warn"><b>켜짐·꺼짐 센서</b>라 값이 멈춰 있는 것만으로는 고장이라 할 수 없어요 — 물이 계속 닿아 있어도 똑같이 보여요. 공장주 사진과 함께 판단하세요.</div>' : ''}
      <div class="small ink">센서는 멀쩡하고 <b>작업 때문</b>이라면 수리 중으로 돌리지 말고 공장주에게 <b>작업 예정 알리기</b>를 안내하세요.</div>
      <div class="warn">수리 중으로 돌리면<br>· 열린 경보 ${live.length}건이 <b>닫혀요</b> (기록: "수리로 닫힘")<br>· <b>되돌릴 때까지 이 센서는 경보가 울리지 않아요</b><br>· 공장주와 근로자 ${(s.workers || []).filter((w) => (w.fid || 'daesung') === SENSORS[k].fid).length}명 화면에 "수리 중"이 떠요</div>
      <input class="input" id="opNote" placeholder="수리 메모 (안 써도 돼요) · 예: 설치 담당 방문 9/18">
      <div class="row" style="justify-content:flex-end;flex-wrap:wrap"><button class="btn ghost inl" data-act="opReject" data-k="${k}">센서 정상 · 신고 닫기</button><button class="btn inl" data-act="opClose">돌리지 않기</button><button class="btn ghost inl danger" data-act="opRepair" data-k="${k}">수리 중으로 돌리기</button></div>
    </div>`;
  }

  function soon(s, w) {
    const name = { assign: '지킴이 배정 (시안 M3)', checklist: '기본 체크리스트 (시안 M4)', stats: '통계 · AI 품질 (시안 M5)' }[w] || '준비 중';
    return frame('soon/' + w, `<div class="kcard"><div class="kt">${name}</div><div class="small">시제품 다음 차례에 만들어요. 모양은 HTML 시안을 보세요.</div></div>`);
  }

  function render() {
    const s = DB.s, p = R.path();
    if (UI.lastPath !== location.hash) { UI.menu = false; UI.dlg = null; UI.lastPath = location.hash; }
    let html;
    if (p[0] === 'factories') html = factories(s);
    else if (p[0] === 'factory' && FACTORIES[p[1]]) html = factory(s, p[1]);
    else if (p[0] === 'soon') html = soon(s, p[1]);
    else html = board(s);
    if (UI.dlg) html += opDlg(s);
    $('#app').innerHTML = html;
  }
  const ACTS = {
    logout: () => webLogout(),
    ctl() { toggleCtl(); },
    menu() { UI.menu = !UI.menu; render(); },
    soon() { toast('공장 등록은 시제품 다음 차례에 만들어요 (시안 M2-나)'); },
    opFault({ k }) { UI.dlg = { k }; render(); },
    opClose() { UI.dlg = null; render(); },
    opRepair({ k }) { const note = ($('#opNote') || {}).value || ''; UI.dlg = null; DB.act((s) => SIM.repair(s, k, ME, note)); toast('수리 중으로 돌렸어요 · 열린 경보를 닫았어요'); },
    opReject({ k }) { UI.dlg = null; DB.act((s) => { (s.faults || []).filter((f) => f.key === k && f.status === 'open').forEach((f) => { f.status = 'rejected'; }); DB.log(`${ME} ${SENSORS[k].title} 고장 신고 닫음 (센서 정상)`); }); toast('신고를 닫았어요 · 경보는 계속 울려요'); },
    opRestore({ k }) { DB.act((s) => SIM.restore(s, k, ME)); toast('감시로 되돌렸어요'); },
  };
  return { render, ACTS, setMe(n) { ME = n; } };
})();
