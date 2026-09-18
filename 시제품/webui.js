// 공장주·운영자 웹 공통 틀 (2026-09-17, 화성산업진흥원 산업안전지킴이 시스템의 모양을 참고)
// 맨 위 계정 줄 → 흰 머리글(로고·글자 메뉴) → 짙은 청록 띠(지금 위치) → 큰 제목 + 설명 → 내용

const isTabOn = (p, active) => (p.startsWith('soon') ? p === active : p.split('/')[0] === active);

function webFrame({ brand, org, who, tabs, active, title, desc, body, split, menu, after = '' }) {
  const cur = (tabs.find(([p]) => isTabOn(p, active)) || tabs[0])[1];
  const intro = `<section class="intro${split ? '' : ' wide'}"><h1>${title}</h1><p>${desc}</p></section>`;
  return `<div class="util"><div class="in">
      <span>${who}</span><i class="sep"></i><span>${hm(DB.s.clock)} 기준</span><i class="sep"></i>
      <button class="ulink" data-act="logout">로그아웃</button><i class="sep"></i>
      <button class="ulink" data-act="ctl" title="진행자용 시연 조작판">⚙ 조작판</button></div></div>
    <header class="wtop${menu ? ' open' : ''}"><div class="in">
      <span class="brand"><i class="mark"></i><span><b>${brand}</b><small>${org}</small></span></span>
      <button class="menubtn" data-act="menu">☰ 메뉴</button>
      <nav class="wtabs">${tabs.map(([p, n]) => `<button class="${isTabOn(p, active) ? 'on' : ''}" data-go="${p}">${n}</button>`).join('')}</nav>
    </div></header>
    <div class="crumb"><div class="in"><button class="home" data-go="" aria-label="처음 화면">⌂</button><span>${cur}</span></div></div>
    <main class="wbody"><div class="in">
      ${split ? `<div class="hero2">${intro}<div class="hmain">${body}</div></div>${after}` : intro + body + after}
    </div></main>`;
}
// 숫자 칸 kcard · pct는 common.js에 있다 (앱과 함께 쓴다)
