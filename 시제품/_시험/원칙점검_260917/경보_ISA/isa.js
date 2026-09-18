const { chromium } = require('playwright');
const OUT = process.argv[2];
const B = 'http://127.0.0.1:8772/';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const octx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const W = await ctx.newPage(); const O = await octx.newPage(); const M = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const shot = async (p, name) => { await p.waitForTimeout(1300); await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); };
  const ctl = async (p, c, extra = '') => { await p.evaluate(({ c, extra }) => { toggleCtl(true); document.querySelector(`#ctl [data-c="${c}"]${extra}`).click(); document.getElementById('ctl')?.remove(); }, { c, extra }); await p.waitForTimeout(300); };
  const ready = (p) => p.waitForFunction(() => typeof DB !== 'undefined' && DB.s);
  const login = async (p, id) => { await p.goto(B + 'web.html'); await p.waitForSelector('#lid'); await p.fill('#lid', id); await p.fill('#lpw', '1234'); await p.click('button[type=submit]'); await p.waitForSelector('.wtop'); };
  const txt = async (p) => (await p.evaluate(() => document.querySelector('#app').innerText)).replace(/\n+/g, ' | ');
  await W.goto(B + 'worker.html'); await ready(W); await W.evaluate(async () => { localStorage.clear(); sessionStorage.clear(); await DB.reset();
    await fetch('api/invite/accept', { method: 'POST', body: JSON.stringify({ code: 'DS-KIM' }) });
    localStorage.setItem('w.notif', 'on'); localStorage.setItem('lang', 'ko'); });
  await W.reload(); await ready(W);
  await login(O, 'daesung'); await login(M, 'admin');
  // S1: 네 경보 동시
  for (const k of ['press2', 'gas', 'power', 'leak']) await ctl(W, 'raise', `[data-k="${k}"]`);
  await shot(W, 's1_w_four'); await shot(O, 's1_o_four'); await shot(M, 's1_m_four');
  console.log('S1 W:', await txt(W));
  // S2: 가스 조치 → 완료 화면에 머문 채 온습도 경보
  await W.goto(B + 'worker.html#/alarm/' + await W.evaluate(() => DB.s.alarms.find((a) => a.key === 'gas').id));
  await W.waitForTimeout(300);
  for (const k of ['press2', 'power', 'leak']) { const id = await W.evaluate((k) => DB.s.alarms.find((a) => a.key === k).id, k); await W.evaluate((id) => DB.act((s) => SIM.ack(s, id, '이현장')), id); }
  await W.goto(B + 'worker.html#/alarm/' + await W.evaluate(() => DB.s.alarms.find((a) => a.key === 'gas').id)); await W.waitForTimeout(300);
  await W.getByText('조치 완료', { exact: true }).first().click();
  await W.waitForTimeout(6000);
  await ctl(W, 'raise', '[data-k="th"]');
  await shot(W, 's2_w_done_newalarm');
  console.log('S2 W:', await txt(W));
  await W.getByText('닫기').first().click(); await W.waitForTimeout(500);
  console.log('S2b W after close:', await txt(W));
  // S3: 온습도 조치 후 값 끊김 + 시간 흐름
  await W.getByText('조치 완료', { exact: true }).first().click(); await W.waitForTimeout(6000); await W.getByText('닫기').first().click();
  await ctl(W, 'cut', '[data-k="th"]');
  await ctl(W, 'tick', '[data-m="5"]');
  await shot(W, 's3_w_unknown_remind'); console.log('S3 W:', await txt(W));
  await shot(O, 's3_o_unknown_remind'); console.log('S3 O:', await txt(O));
  // S4: 오래 방치 — 2시간
  await W.evaluate(() => { location.hash = '#/'; });
  await ctl(W, 'tick', '[data-m="60"]'); await ctl(W, 'tick', '[data-m="60"]');
  await shot(M, 's4_m_long'); console.log('S4 M:', await txt(M));
  await shot(W, 's4_w_long'); console.log('S4 W:', await txt(W));
  // S5: 누수 경보를 보는 중 수리 중으로
  const lid = await W.evaluate(() => DB.s.alarms.find((a) => a.key === 'leak' && SIM.live(a)).id);
  await W.goto(B + 'worker.html#/alarm/' + lid); await W.waitForTimeout(400);
  await M.evaluate(() => DB.act((s) => SIM.repair(s, 'leak', '이운영', ''))); await W.waitForTimeout(1500);
  await shot(W, 's5_w_repair_view'); console.log('S5 W:', await txt(W));
  // S6: 모두 정상 → 공장 화면, 끊김·수리 있음
  for (const k of ['press2', 'gas', 'power', 'th']) { await W.evaluate((k) => DB.act((s) => { const a = s.alarms.find((x) => x.key === k && SIM.live(x)); if (a) SIM.normal(s, a.id); }), k); }
  await W.waitForTimeout(1500);
  await O.goto(B + 'web.html#/'); await shot(O, 's6_o_home'); console.log('S6 O:', await txt(O));
  await M.goto(B + 'web.html#/factory/daesung'); await shot(M, 's6_m_factory'); console.log('S6 M:', await txt(M));
  await W.goto(B + 'worker.html#/'); await shot(W, 's6_w_home'); console.log('S6 W:', await txt(W));
  await O.goto(B + 'web.html#/rec/sensor'); await shot(O, 's6_o_rec');
  // S7: 작업 예정(숫자 없음) 중 전기 경보
  await O.goto(B + 'web.html#/now/memo'); await O.waitForSelector('#memoText');
  await O.fill('#memoText', '10시부터 13시까지 전기 용접 작업'); await O.locator('[data-act="memoSend"]').click(); await O.waitForTimeout(2500);
  await shot(O, 's7_o_memo');
  await ctl(W, 'raise', '[data-k="power"]');
  console.log('S7 alarms live:', await W.evaluate(() => DB.s.alarms.filter(SIM.live).map((a) => a.key)), await W.evaluate(() => DB.s.log.slice(0, 3)));
  await M.goto(B + 'web.html#/factory/daesung'); await shot(M, 's7_m_factory'); console.log('S7 M:', await txt(M));
  await W.goto(B + 'worker.html#/'); await shot(W, 's7_w_home');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
