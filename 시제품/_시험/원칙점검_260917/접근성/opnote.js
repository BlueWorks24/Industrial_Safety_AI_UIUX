const { chromium } = require('playwright');
const B = 'http://127.0.0.1:8774/';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux/chrome', args: ['--no-sandbox'] });
  const c1 = await browser.newContext({ viewport: { width: 390, height: 780 }, reducedMotion: 'reduce' });
  const c2 = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const M = await c1.newPage(); const O = await c2.newPage();
  const login = async (p, id) => { await p.goto(B + 'web.html'); await p.waitForSelector('#lid'); await p.fill('#lid', id); await p.fill('#lpw', '1234'); await p.click('button[type=submit]'); await p.waitForSelector('.wtop'); };
  await login(M, 'admin'); await login(O, 'daesung');
  await O.evaluate(() => DB.act((s) => { s.faults = s.faults || []; s.faults.unshift({ id: 'fx', key: 'press2', fid: 'daesung', by: '박대표', at: '09:10', reason: '기계는 멀쩡한데 값만 이상해요', memo: '', photo: false, status: 'open' }); }));
  await M.goto(B + 'web.html#/factory/daesung'); await M.waitForTimeout(1500);
  await M.click('[data-act="opFault"]'); await M.waitForTimeout(200);
  await M.click('#opNote'); await M.keyboard.type('설치 담당 방문 9/18');
  const before = await M.evaluate(() => document.querySelector('#opNote').value);
  await O.evaluate(() => DB.act((s) => { s.clock += 1; }));
  await M.waitForTimeout(2000);
  const after = await M.evaluate(() => ({ v: document.querySelector('#opNote') && document.querySelector('#opNote').value, focus: document.activeElement.tagName }));
  console.log('opNote', before, '->', JSON.stringify(after));
  // 경보 아이콘 움직임 (움직임 줄이기)
  const W = await c1.newPage();
  await W.goto(B + 'worker.html#/join/DS-KIM'); await W.waitForSelector('[data-act="accept"]'); await W.click('[data-act="accept"]'); await W.waitForTimeout(500); await W.click('[data-act="notifOn"]'); await W.waitForTimeout(300);
  await W.evaluate(() => { toggleCtl(true); document.querySelector('#ctl [data-c="raise"][data-k="gas"]').click(); document.getElementById('ctl').remove(); });
  await W.waitForTimeout(500);
  console.log('alarm icon anim (reduce):', await W.evaluate(() => getComputedStyle(document.querySelector('.alarm .icon')).animationName));
  const W2 = await c2.newPage(); await W2.goto(B + 'worker.html'); await W2.waitForTimeout(800);
  console.log('toast/sheet anim reduce check:', await W.evaluate(() => { toast('x'); return getComputedStyle(document.querySelector('.toast')).animationName; }));
  await browser.close();
})();
