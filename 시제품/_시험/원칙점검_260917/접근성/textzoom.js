const { chromium } = require('playwright');
const OUT = __dirname + '/out';
const B = 'http://127.0.0.1:8774/';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const W = await ctx.newPage(); const G = await ctx.newPage();
  const ready = (p) => p.waitForFunction(() => typeof DB !== 'undefined' && DB.s);
  const ctl = async (p, c, extra = '') => { await p.evaluate(({ c, extra }) => { toggleCtl(true); document.querySelector(`#ctl [data-c="${c}"]${extra}`).click(); document.getElementById('ctl')?.remove(); }, { c, extra }); await p.waitForTimeout(300); };
  const zoom = (p, k) => Promise.resolve().then(() => p.evaluate((k) => {
    // 글자 크기만 k배 (휴대폰 글자 크게 설정 흉내) — 다시 그려도 유지되게 CSS 변수 대신 규칙을 덮음
    const st = document.createElement('style'); st.id = 'tz';
    const sizes = new Map();
    document.querySelectorAll('#app *').forEach((e) => sizes.set(parseFloat(getComputedStyle(e).fontSize), 1));
    document.head.appendChild(st);
    const apply = () => { const els = [...document.querySelectorAll('#app *')].filter((e) => !e.dataset.fz); els.forEach((e) => { e.dataset.fz = parseFloat(getComputedStyle(e).fontSize); }); els.forEach((e) => { e.style.fontSize = (e.dataset.fz * k) + 'px'; }); };
    apply(); new MutationObserver(() => { mo.disconnect(); apply(); mo.observe(document.getElementById('app'), { childList: true, subtree: true }); });
    const mo = new MutationObserver(() => {}); window.__apply = apply;
  }, k));
  const check = (p) => p.evaluate(() => {
    const vw = document.documentElement.clientWidth, vh = innerHeight;
    const ack = document.querySelector('.ft .btn');
    const r = ack && ack.getBoundingClientRect();
    const over = [...document.querySelectorAll('#app *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width && b.right > vw + 1 && e.innerText && e.innerText.trim(); }).slice(0, 5).map((e) => e.innerText.trim().slice(0, 20));
    const clip = [...document.querySelectorAll('#app *')].filter((e) => { const cs = getComputedStyle(e); return (cs.overflow.includes('hidden') || cs.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 1 && e.innerText.trim(); }).slice(0, 5).map((e) => e.innerText.trim().slice(0, 25));
    return { docW: document.documentElement.scrollWidth, vw, docH: document.documentElement.scrollHeight, vh, btn: r && { t: ack.innerText.trim().slice(0, 12), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }, over, clip };
  });
  await W.goto(B + 'worker.html'); await ready(W);
  await W.evaluate(async () => { localStorage.clear(); sessionStorage.clear(); await DB.reset(); localStorage.setItem('lang', 'ko'); });
  await W.goto(B + 'worker.html#/join/DS-KIM'); await ready(W); await W.waitForSelector('[data-act="accept"]'); await W.click('[data-act="accept"]'); await W.waitForTimeout(500); await W.click('[data-act="notifOn"]'); await W.waitForTimeout(300);
  const out = {};
  for (const k of [1.5, 2]) {
    await W.goto(B + 'worker.html#/'); await ready(W); await W.waitForTimeout(500);
    await zoom(W, k); out['home' + k] = await check(W);
    await W.screenshot({ path: `${OUT}/shots/tz${k}_w_home.png`, fullPage: false });
    await ctl(W, 'raise', '[data-k="press2"]'); await W.waitForTimeout(400); await W.evaluate(() => window.__apply());
    out['alarm' + k] = await check(W);
    await W.screenshot({ path: `${OUT}/shots/tz${k}_w_alarm.png`, fullPage: false });
    // 베트남어 경보
    await W.evaluate(() => { setLang('vi'); DB.emit(); }); await W.waitForTimeout(300); await W.evaluate(() => window.__apply());
    out['alarmVi' + k] = await check(W);
    await W.screenshot({ path: `${OUT}/shots/tz${k}_w_alarm_vi.png`, fullPage: false });
    await W.evaluate(() => { setLang('ko'); DB.act((s) => s.alarms.filter(SIM.live).forEach((a) => SIM.normal(s, a.id))); });
  }
  await G.goto(B + 'guard.html#/pre/hanbit'); await ready(G); await G.waitForTimeout(300);
  await G.click('[data-act="newDraft"]'); await G.waitForTimeout(200); await G.click('[data-act="noAI"]').catch(() => {});
  await G.waitForTimeout(300); await G.click('[data-act="startAnswer"]'); await G.waitForTimeout(300);
  await zoom(G, 2); out.gAns2 = await check(G);
  await G.screenshot({ path: `${OUT}/shots/tz2_g_ans.png`, fullPage: false });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
