// 2번 묶음 — 역할을 넘나드는 흐름 시험. 사용: node cross_flow.js <캡처 폴더>
const { chromium } = require('playwright');
const OUT = process.argv[2];
const B = 'http://127.0.0.1:8765/';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errs = [];
  let n = 0;
  const dev = async (w, h) => { const c = await browser.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage();
    p.on('pageerror', (e) => errs.push(e.message)); return p; };
  const shot = async (p, name, full = true) => { await p.waitForTimeout(1300); await p.screenshot({ path: `${OUT}/c${String(++n).padStart(2, '0')}_${name}.png`, fullPage: full }); };
  const ready = (p) => p.waitForFunction(() => typeof DB !== 'undefined' && DB.s && document.querySelector('#app').innerHTML.length > 0);
  const login = async (p, id) => { await p.goto(B + 'web.html'); await p.waitForSelector('#lid'); await p.fill('#lid', id); await p.fill('#lpw', '1234'); await p.click('button[type=submit]'); await p.waitForSelector('.wbody'); };
  const ctl = (p, c, extra = '') => p.evaluate(({ c, extra }) => { toggleCtl(true); document.querySelector(`#ctl [data-c="${c}"]${extra}`).click(); document.getElementById('ctl')?.remove(); }, { c, extra });
  const go = async (p, hash) => { await p.evaluate((h) => { location.hash = h; }, hash); await p.waitForTimeout(400); };

  // 근로자 (한국어) — 처음 상태로
  const W = await dev(390, 844);
  await W.goto(B + 'worker.html'); await ready(W);
  await W.evaluate(async () => { localStorage.clear(); await DB.reset(); await fetch('api/invite/accept', { method: 'POST', body: JSON.stringify({ code: 'DS-KIM' }) }); localStorage.setItem('w.notif', 'on'); localStorage.setItem('lang', 'ko'); });
  await W.reload(); await ready(W);
  const O = await dev(1280, 900); await login(O, 'daesung');
  const M = await dev(1280, 900); await login(M, 'admin');

  // ① 센서 고장 신고 → 수리 중
  await ctl(W, 'raise', '[data-k="leak"]');
  await O.waitForTimeout(1500); await shot(O, 'owner_alarm');
  await O.click('.acard2 [data-act="fault"]'); await O.click('[data-act="faultReason"] >> nth=0'); await O.fill('#faultMemo', '배관 밑 확인함, 물기 없음'); await O.click('[data-act="faultPhoto"]');
  await shot(O, 'owner_fault_dlg', false);
  await O.click('[data-act="faultSend"]'); await shot(O, 'owner_fault_sent');
  await M.waitForTimeout(1500); await shot(M, 'op_board_fault');
  await go(M, '#/factory/daesung'); await M.click('[data-act="opFault"]'); await shot(M, 'op_fault_dlg', false);
  await M.fill('#opNote', '설치 담당 방문 9/18'); await M.click('[data-act="opRepair"]'); await shot(M, 'op_repaired');
  await W.waitForTimeout(1500); await shot(W, 'worker_repair');
  await O.waitForTimeout(500); await shot(O, 'owner_repair');

  // ② 값 끊김 → 모름
  await ctl(W, 'cut', '[data-k="gas"]'); await shot(W, 'worker_unknown');
  await go(M, '#/'); await shot(M, 'op_board_unknown');

  // ③ 작업 예정 알리기
  await go(O, '#/now/memo');
  await O.fill('#memoText', '오늘 저녁 6시부터 10시까지 도장 작업이 있어서 전력이 50 부근까지 오를 예정');
  await O.click('[data-act="memoSend"]'); await O.waitForTimeout(2000); await shot(O, 'owner_memo');
  await O.fill('#memoText', '내일 청소해요'); await O.click('[data-act="memoSend"]'); await O.waitForTimeout(2000); await shot(O, 'owner_memo_nofacts');
  await ctl(W, 'to18'); await ctl(W, 'raise', '[data-k="power"]'); await W.waitForTimeout(800);
  const logTop = await W.evaluate(() => DB.s.log[0]);
  console.log('MEMO LOG', logTop);

  // ④ 안전 공지 쓰기 → 근로자(베트남어) 읽음 → 공장주 읽은 사람
  await go(O, '#/notice/new');
  await O.fill('#ndTitle', '지게차 다닐 때 통로 비우기');
  await O.fill('#ndBody', '지게차가 지나갈 때는 통로에 물건을 두지 마세요.\n경고음이 들리면 벽 쪽으로 비켜 서세요.');
  await shot(O, 'owner_notice_new');
  await O.click('[data-act="ndPost"]'); await O.click('[data-act="ndConfirm"]'); await shot(O, 'owner_notice_one');
  const V = await dev(390, 844);
  await V.goto(B + 'worker.html#/join/DS-NGUYEN'); await ready(V); await V.click('[data-act="accept"]'); await V.click('[data-act="notifOn"]');
  await V.waitForTimeout(800); await shot(V, 'vi_home_newnotice');
  await go(V, '#/notice'); await V.click('.q.now'); await shot(V, 'vi_notice_new'); await V.click('[data-act="readN"]');
  await O.waitForTimeout(1500); await shot(O, 'owner_notice_read');
  await go(O, '#/notice'); await shot(O, 'owner_notice_list');

  // ⑤ 근로자 초대 → 새 근로자가 그 코드로 들어옴
  await go(O, '#/workers'); await O.click('[data-act="invOpen"]'); await O.fill('#invName', '김용역'); await O.click('[data-act="invArea"][data-v="B동"]');
  await O.click('[data-act="invMake"]'); await O.waitForTimeout(800); await shot(O, 'owner_invite');
  const code = await O.evaluate(() => document.querySelector('.code').textContent);
  const Y = await dev(390, 844);
  await Y.goto(B + 'worker.html#/join/' + code); await ready(Y); await shot(Y, 'new_worker_invite');
  await Y.click('[data-act="accept"]'); await Y.click('[data-act="notifLater"]'); await shot(Y, 'new_worker_home');
  const Z = await dev(390, 844);
  await Z.goto(B + 'worker.html#/join/' + code); await ready(Z); await shot(Z, 'used_invite');
  await O.waitForTimeout(1500); await go(O, '#/'); await go(O, '#/workers'); await shot(O, 'owner_workers');

  // ⑥ 의견 → 공장주 답 → 근로자
  await go(O, '#/voice'); await shot(O, 'owner_voice_list');
  await go(O, '#/voice/v2'); await O.fill('#vReply', '알려 줘서 고마워요. 오늘 기름받이를 달게요.'); await shot(O, 'owner_voice_one');
  await O.click('[data-act="vReplySend"]'); await O.click('[data-act="vDone"]'); await shot(O, 'owner_voice_done');
  await go(V, '#/voice/mine'); await V.waitForTimeout(1500); await shot(V, 'vi_voice_reply');
  await go(V, '#/'); await shot(V, 'vi_home_feed');

  await W.evaluate(async () => { await DB.reset(); });
  console.log('ERRORS', JSON.stringify(errs));
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
