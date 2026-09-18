// 공장주·운영자 웹 입구 — 로그인하고, 계정의 역할에 따라 공장주 화면(O) 또는 운영자 화면(M)을 연다.
async function webLogout() {
  try { await fetch('api/logout', { method: 'POST' }); } catch (e) {}
  location.hash = '#/'; location.reload();
}

function loginScreen(msg, noServer) {
  $('#app').innerHTML = `<div class="util"><div class="in"><a class="ulink" href="index.html">처음 화면</a></div></div>
    <header class="wtop"><div class="in"><span class="brand"><i class="mark"></i><span><b>산업안전 서비스</b><small>산업안전지킴이</small></span></span></div></header>
    <div class="crumb"><div class="in"><span class="home" style="font-size:22px">⌂</span><span>로그인</span></div></div>
    <div class="login">
    <div class="lcard">
      <h1>공장주 · 운영자 로그인</h1>
      ${noServer ? `<div class="warn">로그인은 시제품 서버로 열어야 해요.<br><code>./serve.sh</code>로 연 주소에서 다시 열어 주세요.</div>` : `
      <form id="lf" autocomplete="on">
        <label class="lbl" for="lid">아이디</label>
        <input class="input" id="lid" name="username" autocomplete="username" autocapitalize="off" required>
        <label class="lbl" for="lpw">비밀번호</label>
        <input class="input" id="lpw" name="password" type="password" autocomplete="current-password" required>
        ${msg ? `<div class="err" role="alert">${esc(msg)}</div>` : ''}
        <button class="btn" type="submit">로그인</button>
      </form>
      <div class="hint"><b>시험용 계정</b> (비밀번호 모두 1234)<br>
        <button type="button" class="link" data-fill="daesung">daesung</button> 공장주 · 대성정밀<br>
        <button type="button" class="link" data-fill="hanbit">hanbit</button> 공장주 · 한빛화학<br>
        <button type="button" class="link" data-fill="admin">admin</button> 운영자 · 산업안전지킴이 운영센터</div>`}
    </div></div>`;
  const f = $('#lf');
  if (!f) return;
  document.querySelectorAll('[data-fill]').forEach((b) => b.onclick = () => { $('#lid').value = b.dataset.fill; $('#lpw').value = '1234'; $('#lpw').focus(); });
  f.onsubmit = async (e) => {
    e.preventDefault();
    const r = await fetch('api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: $('#lid').value, pw: $('#lpw').value }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); loginScreen(j.error || '로그인하지 못했어요'); $('#lid').value = ''; return; }
    location.hash = '#/'; location.reload();
  };
}

(async () => {
  await DB.ready;
  if (!DB.remote) { loginScreen('', true); return; }
  const r = await fetch('api/me');
  if (!r.ok) { loginScreen(''); return; }
  const me = await r.json();
  document.title = me.role === 'operator' ? '운영자 웹 시제품' : '공장주 웹 시제품';
  if (me.role === 'operator') {
    OPER.setMe(me.name);
    wire(OPER.ACTS, OPER.render);
  } else {
    ME = me.name; FID = me.factory;
    UI.openInsp = null;
    wire(OWNER.ACTS, OWNER.render);
  }
})();
