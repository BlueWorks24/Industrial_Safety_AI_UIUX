// 근로자 앱 처음 설치 · 공지 · 의견 · 설정 · 외국어 시험 — 사용: node worker_flow.js <캡처 폴더>
const { chromium } = require('playwright');
const OUT = process.argv[2];
const B = 'http://127.0.0.1:8765/';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errs = [];
  let n = 0;
  const mk = async (locale) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, locale });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message));
    return p;
  };
  const shot = async (p, name) => { await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/w${String(++n).padStart(2, '0')}_${name}.png`, fullPage: true }); };
  const ready = (p) => p.waitForFunction(() => typeof DB !== 'undefined' && DB.s && document.querySelector('#app').innerHTML.length > 0);
  const act = (p, sel) => p.locator(sel).first().click();
  const ctl = (p, c, extra = '') => p.evaluate(({ c, extra }) => { toggleCtl(true); document.querySelector(`#ctl [data-c="${c}"]${extra}`).click(); document.getElementById('ctl')?.remove(); }, { c, extra });

  // 한국어 근로자 — 처음 설치
  const K = await mk('ko-KR');
  await K.goto(B + 'worker.html'); await ready(K);
  await K.evaluate(async () => { await DB.reset(); });
  await shot(K, 'ko_welcome');
  await act(K, '[data-act="scan"]'); await shot(K, 'ko_scan');
  await act(K, '[data-code="DS-OLD"]'); await shot(K, 'ko_err_expired');
  await act(K, '[data-go=""]');
  await act(K, '[data-act="scan"]'); await act(K, '[data-code="DS-KIM"]'); await shot(K, 'ko_invite');
  await act(K, '[data-act="accept"]'); await shot(K, 'ko_notif');
  await act(K, '[data-act="notifLater"]'); await shot(K, 'ko_home_notifoff');
  await act(K, '[data-act="notifOn"]'); await shot(K, 'ko_home');
  await act(K, '[data-go="notice"]'); await shot(K, 'ko_notices');
  await act(K, '[data-go="notice/n1"]'); await shot(K, 'ko_notice');
  await act(K, '[data-act="readN"]'); await shot(K, 'ko_notice_read');
  await K.goto(B + 'worker.html#/voice'); await ready(K);
  await act(K, '[data-act="vSend"]');
  await K.fill('#vText', 'B동 통로에 기름이 자주 흘러 있어요');
  await act(K, '[data-act="vPhoto"]'); await shot(K, 'ko_voice');
  await act(K, '[data-act="vSend"]'); await shot(K, 'ko_voice_confirm');
  await act(K, '[data-act="vConfirm"]'); await shot(K, 'ko_voice_mine');
  await ctl(K, 'vread'); await ctl(K, 'vreply'); await shot(K, 'ko_voice_replied');
  await K.goto(B + 'worker.html#/settings'); await ready(K); await shot(K, 'ko_settings');
  await K.goto(B + 'worker.html#/me'); await ready(K); await shot(K, 'ko_me');

  // 베트남어 근로자 — 초대 언어로 열림
  const V = await mk('en-US');
  await V.goto(B + 'worker.html#/join/DS-NGUYEN'); await ready(V); await shot(V, 'vi_invite_en');
  await act(V, '[data-act="accept"]'); await shot(V, 'vi_notif');
  await act(V, '[data-act="notifOn"]'); await shot(V, 'vi_home');
  await ctl(V, 'raise', '[data-k="press2"]'); await shot(V, 'vi_alarm');
  await act(V, '[data-act="ack"]'); await shot(V, 'vi_done');
  await V.waitForTimeout(5200);
  await act(V, '[data-act="closeDone"]');
  await ctl(V, 'tick', '[data-m="5"]'); await shot(V, 'vi_remind');
  await act(V, '[data-act="snooze"]');
  await V.goto(B + 'worker.html#/notice/n1'); await ready(V); await shot(V, 'vi_notice');
  await act(V, '[data-act="orig"]'); await shot(V, 'vi_notice_orig');
  await act(V, '[data-act="badTr"]');
  await V.goto(B + 'worker.html#/voice/mine'); await ready(V); await shot(V, 'vi_voice_mine');
  // 한국어 근로자 화면에 Nguyen의 조치가 보이는가
  await K.goto(B + 'worker.html#/'); await ready(K); await shot(K, 'ko_sees_other');
  await K.goto(B + 'worker.html#/me'); await ready(K);
  await act(K, '[data-act="askLogout"]'); await shot(K, 'ko_logout_q');
  await act(K, '[data-act="logout"]'); await shot(K, 'ko_after_logout');
  console.log('ERRORS', JSON.stringify(errs));
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
