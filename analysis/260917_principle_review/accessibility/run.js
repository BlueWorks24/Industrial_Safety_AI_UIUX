const { chromium } = require('playwright');
const fs = require('fs');
const { AUDIT } = require('./audit_lib.js');
const OUT = __dirname + '/out';
fs.mkdirSync(OUT + '/shots', { recursive: true });
const B = 'http://127.0.0.1:8774/';
const VP = (process.argv[2] || '390x780').split('x').map(Number);
const TAG = process.argv[2] || '390x780';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const W = await ctx.newPage(); const O = await ctx.newPage(); const G = await ctx.newPage(); const M = await (await browser.newContext({ viewport: { width: VP[0], height: VP[1] } })).newPage();
  const res = {};
  const errs = [];
  for (const p of [W, O, G, M]) p.on('pageerror', (e) => errs.push(e.message));
  const audit = async (p, name) => {
    await p.waitForTimeout(500);
    res[name] = await p.evaluate(AUDIT);
    await p.screenshot({ path: `${OUT}/shots/${TAG}_${name}.png`, fullPage: true });
  };
  const ctl = async (p, c, extra = '') => { await p.evaluate(({ c, extra }) => { toggleCtl(true); document.querySelector(`#ctl [data-c="${c}"]${extra}`).click(); document.getElementById('ctl')?.remove(); }, { c, extra }); await p.waitForTimeout(300); };
  const ready = (p) => p.waitForFunction(() => typeof DB !== 'undefined' && DB.s);
  const login = async (p, id) => { await p.goto(B + 'web.html'); await p.waitForSelector('#lid'); await p.fill('#lid', id); await p.fill('#lpw', '1234'); await p.click('button[type=submit]'); await p.waitForSelector('.wtop'); };
  const go = async (p, url) => { await p.goto(B + url); await ready(p); await p.waitForTimeout(400); };

  // 근로자: 처음 화면
  await W.goto(B + 'worker.html'); await ready(W);
  await W.evaluate(async () => { localStorage.clear(); sessionStorage.clear(); await DB.reset(); });
  await W.reload(); await ready(W); await W.waitForTimeout(400);
  await audit(W, 'w_welcome');
  await W.click('[data-act="scan"]'); await audit(W, 'w_scan_sheet');
  await go(W, 'worker.html#/join/DS-KIM'); await W.waitForSelector('[data-act="accept"]'); await audit(W, 'w_join');
  await go(W, 'worker.html#/join/DS-OLD'); await W.waitForTimeout(500); await audit(W, 'w_join_err');
  await go(W, 'worker.html#/join/DS-KIM'); await W.waitForSelector('[data-act="accept"]'); await W.click('[data-act="accept"]'); await W.waitForTimeout(600);
  await audit(W, 'w_notif_ask');
  await W.click('[data-act="notifOn"]'); await W.waitForTimeout(400);
  await audit(W, 'w_home');
  await login(O, 'daesung');
  await go(G, 'guard.html');
  await ctl(W, 'raise', '[data-k="press2"]'); await W.waitForTimeout(400);
  await audit(W, 'w_alarm');
  // 경보 화면에서 언어 버튼 누르기 → 무엇이 뜨나
  await W.click('.alarm .lang'); await W.waitForTimeout(400);
  res.langFromAlarm = await W.evaluate(() => ({ hash: location.hash, alarmShown: !!document.querySelector('.alarm'), settingsShown: !!document.querySelector('[data-act="sound"]') }));
  await go(W, 'worker.html#/');
  await W.click('[data-act="ack"]'); await W.waitForTimeout(300);
  await audit(W, 'w_done_undo');
  res.undoGap = await W.evaluate(() => { const a = document.querySelector('[data-act="undo"]').getBoundingClientRect(), b = document.querySelector('[data-act="closeDone"]').getBoundingClientRect(); return { undo: [a.width, a.height, a.y], close: [b.width, b.height, b.y], gap: b.y - a.bottom }; });
  await W.waitForTimeout(5600);
  res.undoAfter = await W.evaluate(() => !!document.querySelector('[data-act="undo"]'));
  await W.click('[data-act="closeDone"]');
  await ctl(W, 'tick', '[data-m="5"]');
  await audit(W, 'w_remind');
  await ctl(W, 'raise', '[data-k="gas"]');
  await audit(W, 'w_two');
  // 정리: 경보 끝
  await W.evaluate(() => DB.act((s) => s.alarms.filter(SIM.live).forEach((a) => SIM.normal(s, a.id))));
  await go(W, 'worker.html#/history'); await audit(W, 'w_history');
  await go(W, 'worker.html#/notice'); await audit(W, 'w_notices');
  const nid = await W.evaluate(() => DB.s.notices.find((n) => n.fid === 'daesung').id);
  await W.evaluate(() => setLang('vi'));
  await go(W, 'worker.html#/notice/' + nid); await audit(W, 'w_notice_vi');
  res.langVi = await W.evaluate(() => ({ html: document.documentElement.lang, korean: [...document.querySelectorAll('#app *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && /[가-힣]/.test(n.textContent))).slice(0, 6).map((e) => e.textContent.trim().slice(0, 25)), langAttrs: document.querySelectorAll('#app [lang]').length }));
  await W.evaluate(() => setLang('ko'));
  await go(W, 'worker.html#/voice'); await audit(W, 'w_voice');
  await W.click('[data-act="vSend"]'); await W.waitForTimeout(200);
  res.voiceEmpty = await W.evaluate(() => ({ toast: document.querySelector('.toast')?.textContent, toastRole: document.querySelector('.toast')?.getAttribute('role'), focus: document.activeElement.id, invalid: document.querySelector('#vText').getAttribute('aria-invalid') }));
  await W.fill('#vText', '지게차 통로에 짐이 쌓여 있어요'); await W.click('[data-act="vSend"]'); await W.waitForTimeout(300);
  await audit(W, 'w_voice_dlg');
  res.dlgFocus = await W.evaluate(() => ({ active: document.activeElement.tagName + '.' + document.activeElement.className, inDlg: !!document.activeElement.closest('.dlg') }));
  await W.keyboard.press('Escape'); await W.waitForTimeout(200);
  res.dlgEsc = await W.evaluate(() => !!document.querySelector('.dlg'));
  await go(W, 'worker.html#/voice/mine'); await audit(W, 'w_voice_mine');
  await go(W, 'worker.html#/settings'); await audit(W, 'w_settings');
  await go(W, 'worker.html#/me'); await audit(W, 'w_me');
  // 초점 표시: 근로자 홈에서 Tab
  await go(W, 'worker.html#/');
  res.focusW = [];
  for (let i = 0; i < 6; i++) {
    await W.keyboard.press('Tab');
    res.focusW.push(await W.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { t: (e.getAttribute('aria-label') || e.innerText || '').trim().slice(0, 15), outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, shadow: cs.boxShadow.slice(0, 40) }; }));
  }
  // 데이터가 바뀌면 초점이 유지되나
  await W.keyboard.press('Tab');
  const before = await W.evaluate(() => document.activeElement.innerText.trim().slice(0, 15));
  await O.evaluate(() => DB.act((s) => { s.clock += 1; }));
  await W.waitForTimeout(1800);
  res.focusAfterPoll = { before, after: await W.evaluate(() => document.activeElement.tagName + ':' + (document.activeElement.innerText || '').trim().slice(0, 15)) };
  // 움직임 줄이기
  await ctl(W, 'cut', '[data-k="gas"]');
  await ctl(W, 'raise', '[data-k="press2"]');
  await W.evaluate(() => DB.act((s) => { const a = s.alarms.find((x) => SIM.live(x)); SIM.ack(s, a.id, '박대표'); }));
  await go(W, 'worker.html#/'); await W.evaluate(() => { const a = DB.s.alarms.find(SIM.live); sessionStorage.setItem('seen-' + a.id + a.acks.length, '1'); }); await go(W, 'worker.html#/');
  res.motion = await W.evaluate(() => ({ reduce: matchMedia('(prefers-reduced-motion: reduce)').matches, ms: [...document.querySelectorAll('.ms span i')].map((e) => getComputedStyle(e).animationName), live: [...document.querySelectorAll('.live i')].map((e) => getComputedStyle(e).animationName), bar5: getComputedStyle(document.body).animationName }));
  await audit(W, 'w_home_unknown_watch');
  await W.evaluate(() => DB.act((s) => { s.alarms.filter(SIM.live).forEach((a) => SIM.normal(s, a.id)); s.sensors.gas = { state: 'watch' }; }));

  // 지킴이
  await go(G, 'guard.html#/'); await audit(G, 'g_home');
  await go(G, 'guard.html#/todo'); await audit(G, 'g_todo');
  await G.locator('[data-act="date"]').first().click(); await G.waitForTimeout(200); await audit(G, 'g_date_sheet');
  await go(G, 'guard.html#/pre/daesung'); await audit(G, 'g_pre');
  await go(G, 'guard.html#/re/daesung'); await G.waitForTimeout(500); await audit(G, 'g_re');
  await G.locator('[data-act="reNot"]').first().click(); await G.waitForTimeout(200); await audit(G, 'g_not_sheet');
  await G.click('.sheet [data-act="closeSheet"].btn');
  await go(G, 'guard.html#/pre/hanbit'); await G.click('[data-act="newDraft"]'); await G.waitForTimeout(300);
  await G.click('[data-act="addPhoto"]'); await G.click('[data-act="addPhoto"]'); await G.waitForTimeout(300);
  await audit(G, 'g_photo');
  await G.click('[data-act="askAI"]'); await G.waitForTimeout(300); await audit(G, 'g_ai_wait');
  await G.waitForTimeout(2800); await audit(G, 'g_pick');
  await G.locator('[data-act="why"]').first().click(); await G.waitForTimeout(200); await audit(G, 'g_why');
  await G.click('.sheet [data-act="closeSheet"].btn');
  await G.click('[data-act="startAnswer"]'); await G.waitForTimeout(300); await audit(G, 'g_ans');
  res.ansGap = await G.evaluate(() => { const a = document.querySelector('[data-act="ansOk"]').getBoundingClientRect(), b = document.querySelector('[data-act="ansBad"]').getBoundingClientRect(); return { ok: [a.width, a.height], bad: [b.width, b.height], gap: b.y - a.bottom }; });
  await G.click('[data-act="ansBad"]'); await G.waitForTimeout(200); await audit(G, 'g_bad_sheet');
  await G.click('.sheet [data-act="closeSheet"].btn');
  await go(G, 'guard.html#/sum'); await audit(G, 'g_sum');
  await go(G, 'guard.html#/records'); await audit(G, 'g_records');

  // 공장주 웹
  await O.goto(B + 'web.html'); await O.waitForSelector('.wtop');
  await ctl(O, 'raise', '[data-k="press2"]');
  await audit(O, 'o_now_alarm');
  await O.click('[data-act="fault"]'); await O.waitForTimeout(200); await audit(O, 'o_fault_dlg');
  res.faultDlgFocus = await O.evaluate(() => document.activeElement.tagName + '.' + document.activeElement.className);
  await O.click('.dlg [data-act="closeDlg"]');
  await O.goto(B + 'web.html#/rec/insp'); await O.waitForSelector('.wtop'); await O.waitForTimeout(400); await audit(O, 'o_insp');
  const fixBtn = O.locator('[data-act="fix"]').first();
  if (await fixBtn.count()) { await fixBtn.click(); await O.waitForTimeout(200); await audit(O, 'o_fix_dlg'); await O.click('.dlg [data-act="closeDlg"]'); }
  await O.goto(B + 'web.html#/rec/sensor'); await O.waitForTimeout(500); await audit(O, 'o_sensor_rec');
  res.tables = await O.evaluate(() => [...document.querySelectorAll('table')].map((t) => ({ caption: !!t.caption, thead: !!t.tHead, scope: [...t.querySelectorAll('th')].map((h) => h.getAttribute('scope')), emptyTh: [...t.querySelectorAll('th')].filter((h) => !h.textContent.trim()).length })));
  await O.goto(B + 'web.html#/now/memo'); await O.waitForTimeout(500); await audit(O, 'o_memo');
  await O.goto(B + 'web.html#/notice'); await O.waitForTimeout(500); await audit(O, 'o_notice_list');
  await O.goto(B + 'web.html#/notice/new'); await O.waitForTimeout(500); await audit(O, 'o_notice_new');
  await O.goto(B + 'web.html#/workers'); await O.waitForTimeout(500);
  const invB = O.locator('[data-act="invOpen"]'); if (await invB.count()) { await invB.first().click(); await O.waitForTimeout(200); }
  await audit(O, 'o_workers_invite');
  await O.goto(B + 'web.html#/voice'); await O.waitForTimeout(500); await audit(O, 'o_voice_list');
  const vid = await O.evaluate(() => DB.s.voices.find((v) => v.fid === 'daesung').id);
  await O.goto(B + 'web.html#/voice/' + vid); await O.waitForTimeout(500); await audit(O, 'o_voice_one');
  // 키보드로 공지 목록에서 공지 하나를 열 수 있나
  await O.goto(B + 'web.html#/notice'); await O.waitForTimeout(500);
  const tabs = [];
  for (let i = 0; i < 30; i++) { await O.keyboard.press('Tab'); tabs.push(await O.evaluate(() => (document.activeElement.innerText || document.activeElement.getAttribute('aria-label') || document.activeElement.tagName).trim().slice(0, 12))); }
  res.webTabOrder = tabs;
  res.focusWeb = await O.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return cs.outlineStyle + ' ' + cs.outlineWidth; });
  // 로그인 오류
  const L = await ctx.newPage();
  await ctx.clearCookies();
  await L.goto(B + 'web.html'); await L.waitForSelector('#lid'); await L.fill('#lid', 'daesung'); await L.fill('#lpw', '9999'); await L.click('button[type=submit]'); await L.waitForTimeout(600);
  res.loginErr = await L.evaluate(() => ({ msg: document.querySelector('.err')?.textContent, idKept: document.querySelector('#lid').value, pwInvalid: document.querySelector('#lpw').getAttribute('aria-invalid'), described: document.querySelector('#lpw').getAttribute('aria-describedby') }));
  await audit(L, 'o_login_err');

  // 운영자
  await login(M, 'admin');
  await M.waitForTimeout(500); await audit(M, 'm_board');
  await M.goto(B + 'web.html#/factories'); await M.waitForTimeout(500); await audit(M, 'm_factories');
  res.opRowsKeyboard = await M.evaluate(() => [...document.querySelectorAll('tr.click')].map((r) => ({ tab: r.tabIndex, role: r.getAttribute('role'), innerBtn: !!r.querySelector('button,a') })));
  await M.goto(B + 'web.html#/factory/daesung'); await M.waitForTimeout(500); await audit(M, 'm_factory');

  fs.writeFileSync(`${OUT}/res_${TAG}.json`, JSON.stringify({ res, errs }, null, 1));
  console.log('done', TAG, errs.length, 'errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
