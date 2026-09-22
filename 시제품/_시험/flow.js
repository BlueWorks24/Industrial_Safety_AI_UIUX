const { chromium } = require('playwright');
const OUT = process.argv[2];
const B = 'http://127.0.0.1:8765/';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 });
  const errs = [];
  const W = await ctx.newPage(); const O = await ctx.newPage(); const G = await ctx.newPage();
  for (const p of [W, O, G]) { p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); }
  let n = 0;
  const shot = async (p, name) => { await p.waitForTimeout(1300); await p.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}_${name}.png`, fullPage: true }); };
  const ctl = async (p, c, extra = '') => { await p.evaluate(({ c, extra }) => { toggleCtl(true); document.querySelector(`#ctl [data-c="${c}"]${extra}`).click(); document.getElementById('ctl')?.remove(); }, { c, extra }); };
  const click = async (p, text) => { await p.getByText(text, { exact: false }).first().click(); await p.waitForTimeout(150); };

  const ready = (p) => p.waitForFunction(() => typeof DB !== 'undefined' && DB.s);
  const login = async (p, id) => { await p.goto(B + 'web.html'); await p.waitForSelector('#lid'); await p.fill('#lid', id); await p.fill('#lpw', '1234'); await p.click('button[type=submit]'); await p.waitForSelector('.wtop'); };
  await W.goto(B + 'worker.html'); await ready(W); await W.evaluate(async () => { localStorage.clear(); sessionStorage.clear(); await DB.reset();
    await fetch('api/invite/accept', { method: 'POST', body: JSON.stringify({ code: 'DS-KIM' }) });
    localStorage.setItem('w.notif', 'on'); localStorage.setItem('lang', 'ko'); });
  await O.goto(B + 'web.html'); await shot(O, 'o_login');
  await login(O, 'daesung'); await G.goto(B + 'guard.html'); await ready(G);
  await W.reload(); await ready(W); await shot(W, 'w_home');
  // 근로자 경보 흐름
  await ctl(W, 'raise', '[data-k="press2"]'); await shot(W, 'w_alarm');
  await shot(O, 'o_alarm');
  await click(W, '조치 완료'); await shot(W, 'w_done_undo');
  await click(W, '취소'); await shot(W, 'w_after_undo');
  await click(W, '조치 완료'); await W.waitForTimeout(5600); await shot(W, 'w_done_noundo');
  await click(W, '닫기'); await shot(W, 'w_home_watch');
  await ctl(W, 'tick', '[data-m="5"]'); await shot(W, 'w_remind1');
  await click(W, '5분 뒤 다시 알려'); await shot(W, 'w_home_snoozed');
  await ctl(W, 'tick', '[data-m="5"]'); await click(W, '5분 뒤 다시 알려');
  await ctl(W, 'tick', '[data-m="5"]'); await shot(W, 'w_remind_escalated');
  await shot(O, 'o_escalated');
  // 두 경보 겹침
  await ctl(W, 'raise', '[data-k="gas"]'); await shot(W, 'w_two');
  // 공장주가 가스 조치 → 근로자 화면
  await O.getByText('조치 완료', { exact: true }).first().click(); await W.waitForTimeout(300); await shot(W, 'w_after_owner_ack');
  // 인터넷 끊김
  await ctl(W, 'net', '[data-w="worker"]'); await W.goto(B + 'worker.html#/'); await shot(W, 'w_offline');
  await click(W, '다시 조치했어요'); await shot(W, 'w_unsent');
  await ctl(W, 'net', '[data-w="worker"]'); await shot(W, 'w_resent');
  await ctl(W, 'normal', ''); await ctl(W, 'normal', '');
  await W.goto(B + 'worker.html#/history'); await shot(W, 'w_history');

  // 지킴이 — 지난번 미흡이 있는 공장 점검 (재점검을 따로 두지 않고 미흡 항목이 체크리스트에 붙는다, 2026-09-22)
  await G.goto(B + 'guard.html#/'); await shot(G, 'g_home');
  await G.goto(B + 'guard.html#/'); await shot(G, 'g_todo');  // 내 할 일은 홈 목록이 되었다 (2026-09-22)
  await G.locator('[data-act="date"][data-fid="taegwang"]').click(); await click(G, '9/23(수)'); await shot(G, 'g_date');
  await G.locator('[data-act="saveDate"]').click();
  await G.locator('[data-go="pre/daesung"]').first().click(); await shot(G, 'g_pre');
  await G.locator('.ft [data-act="newDraft"]').click(); await shot(G, 'g_re');
  await click(G, '개로 점검 시작');
  // 미흡 두 개 — 첫째는 고쳐짐(이상 없음), 둘째는 아직 안 고쳐짐(문제 있음 + 사정)
  await G.locator('[data-act="ans"][data-n="0"][data-v="ok"]').click();
  await G.locator('[data-act="ansBad"][data-n="1"]').click(); await click(G, '부품·업체를 기다려요'); await shot(G, 'g_not_sheet');
  await G.locator('[data-act="saveBad"]').click(); await shot(G, 'g_re_done');
  const nd = await G.evaluate(() => DB.s.draft.items.length);
  for (let i = 2; i < nd; i++) { await G.locator(`[data-act="ans"][data-n="${i}"][data-v="ok"]`).click(); }
  await shot(G, 'g_resum');
  await click(G, '점검 결과 내기'); await shot(G, 'g_sent');
  await ctl(G, 'approve');  // 운영자 승인 → 원래 미흡 항목에 고쳐짐 / 안 고쳐짐이 적힌다
  // 공장주 고칠 것
  await O.goto(B + 'web.html#/rec/insp'); await O.waitForSelector('.wtop'); await shot(O, 'o_insp_back');
  await click(O, '다시 고쳤어요'); await O.fill('#fixNote', '부품 받아서 벗겨진 전선 교체함'); await shot(O, 'o_fix_dlg');
  await O.locator('[data-act="saveFix"]').click(); await shot(O, 'o_claimed');
  await G.goto(B + 'guard.html#/todo'); await shot(G, 'g_todo_again');
  // 지킴이 첫 점검 (AI 멈춤 → 켜기)
  await G.goto(B + 'guard.html#/pre/hanbit'); await click(G, '점검 시작');
  await shot(G, 'g_base');
  await click(G, '사진 찍어 AI 제안 받기');
  await G.locator('[data-act="addPhoto"]').click(); await G.locator('[data-act="addPhoto"]').click(); await G.locator('[data-act="addPhoto"]').click();
  await shot(G, 'g_photo');
  await ctl(G, 'ai'); await click(G, 'AI에게 보내기'); await G.waitForTimeout(2800); await shot(G, 'g_ai_fail');
  await ctl(G, 'ai'); await click(G, '다시 해 보기'); await shot(G, 'g_ai_wait'); await G.waitForTimeout(2800); await shot(G, 'g_pick');
  await G.locator('[data-act="toggleAI"]').first().click();
  await G.locator('[data-act="why"]').nth(1).click(); await shot(G, 'g_why');
  await G.locator('.sheet [data-act="toggleAI"]').click();
  await click(G, '항목 직접 추가'); await G.fill('#selfIn', '소화기가 제자리에 있나?'); await G.locator('[data-act="saveSelf"]').click();
  await click(G, '개로 점검 시작'); await shot(G, 'g_list');
  const total = await G.evaluate(() => DB.s.draft.items.length);
  // 목록 한 장에서 줄마다 답한다 — 7번째만 문제 있음
  await G.locator('[data-act="ansBad"][data-n="6"]').click(); await G.fill('#memoIn', '바닥에 늘어진 전선 피복이 벗겨짐');
  await shot(G, 'g_bad_sheet'); await G.locator('[data-act="saveBad"]').click(); await G.waitForTimeout(150);
  await shot(G, 'g_list_part');
  for (let i = 0; i < total; i++) {
    if (i === 6) continue;
    await G.locator(`[data-act="ans"][data-n="${i}"][data-v="${i === total - 1 ? 'na' : 'ok'}"]`).click(); await G.waitForTimeout(70);
  }
  await shot(G, 'g_sum');
  await ctl(G, 'net', '[data-w="guard"]');
  await click(G, '점검 결과 내기'); await shot(G, 'g_sent_offline');
  await G.goto(B + 'guard.html#/'); await shot(G, 'g_home_unsent');
  await ctl(G, 'net', '[data-w="guard"]'); await shot(G, 'g_home_uploaded');
  await G.goto(B + 'guard.html#/records'); await shot(G, 'g_records');
  // 운영자 제출 검사 (조작판 흉내) — 반려 → 고쳐서 다시 내기 → 승인 (2026-09-22)
  await ctl(G, 'reject'); await G.goto(B + 'guard.html#/todo'); await shot(G, 'g_todo_back');
  await G.goto(B + 'guard.html#/map'); await G.locator('[data-act="pin"][data-fid="hanbit"]').click(); await shot(G, 'g_todo_map');
  await G.goto(B + 'guard.html#/');
  await click(G, '고쳐서 다시 내기'); await shot(G, 'g_redo');
  await G.locator('.ft [data-act="submitFirst"]').click(); await shot(G, 'g_sent_redo');
  await ctl(G, 'approve'); await G.goto(B + 'guard.html#/records'); await shot(G, 'g_records_ok');
  await G.goto(B + 'guard.html#/weekly'); await shot(G, 'g_weekly');
  await G.locator('[data-act="sendWeekly"]').click(); await shot(G, 'g_weekly_sent');
  await O.goto(B + 'web.html#/'); await O.waitForSelector('.wtop'); await shot(O, 'o_home_end');
  await O.setViewportSize({ width: 1100, height: 800 }); await O.goto(B + 'web.html#/rec/insp'); await O.waitForSelector('.wtop'); await shot(O, 'o_insp_pc');
  // 다른 기기(따로 연 브라우저)로 운영자·다른 공장주 로그인 — 같은 DB를 본다
  const dev2 = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  const M = await dev2.newPage(); M.on('pageerror', (e) => errs.push(e.message));
  await login(M, 'admin'); await shot(M, 'm_board');
  await M.goto(B + 'web.html#/factory/daesung'); await M.waitForSelector('.wtop'); await shot(M, 'm_factory');
  await W.goto(B + 'worker.html#/'); await ready(W);
  await ctl(W, 'raise', '[data-k="leak"]'); await ctl(W, 'tick', '[data-m="5"]');
  await M.goto(B + 'web.html#/'); await M.waitForSelector('.wtop'); await shot(M, 'm_board_alarm');
  const dev3 = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const H = await dev3.newPage(); H.on('pageerror', (e) => errs.push(e.message));
  await H.goto(B + 'web.html'); await H.waitForSelector('#lid'); await H.fill('#lid', 'hanbit'); await H.fill('#lpw', 'x'); await H.click('button[type=submit]'); await H.waitForSelector('.err'); await shot(H, 'h_login_fail');
  await login(H, 'hanbit'); await shot(H, 'h_home');
  await H.click('[data-act="logout"]'); await H.waitForSelector('#lid'); await shot(H, 'h_logout');
  console.log('ERRORS', JSON.stringify(errs));
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
