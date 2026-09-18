// 페이지 안에서 돌리는 점검 함수 (page.evaluate로 주입)
module.exports.AUDIT = () => {
  const parse = (c) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const firstGrad = (bi) => {
    if (!bi || bi === 'none') return null;
    const m = bi.match(/rgba?\([^)]+\)/g);
    return m ? m.map(parse) : null;
  };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function bgOf(el) {
    const layers = [];
    let e = el, grad = false;
    while (e && e.nodeType === 1) {
      const cs = getComputedStyle(e);
      const g = firstGrad(cs.backgroundImage);
      if (g && !cs.backgroundImage.startsWith('url')) { grad = true; layers.push(g[0]); if (g[0].a >= 1) break; }
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
      e = e.parentElement;
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
    return { bg, grad };
  }
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0; };
  const path = (el) => { const p = []; let e = el; for (let i = 0; i < 3 && e && e.id !== 'app'; i++) { p.unshift(e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '')); e = e.parentElement; } return p.join('>'); };
  const out = { contrast: [], small: [], targets: [], names: [], labels: [], headings: [], fonts: [] };
  // 글자
  const seenC = new Set();
  document.querySelectorAll('body *').forEach((el) => {
    if (el.closest('#ctl')) return;
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (!txt || !vis(el)) return;
    const cs = getComputedStyle(el);
    let fg = parse(cs.color);
    const { bg, grad } = bgOf(el);
    let op = 1; let e = el; while (e) { op *= +getComputedStyle(e).opacity; e = e.parentElement; }
    fg = over({ ...fg, a: fg.a * op }, bg);
    const r = ratio(fg, bg);
    const fs = parseFloat(cs.fontSize), fw = +cs.fontWeight;
    const large = fs >= 24 || (fs >= 18.66 && fw >= 700);
    const need = large ? 3 : 4.5;
    const key = path(el) + '|' + cs.color + '|' + fs;
    if (r < need && !seenC.has(key)) { seenC.add(key); out.contrast.push({ t: txt.slice(0, 30), r: +r.toFixed(2), fs, fw, fg: cs.color, bg: `rgb(${bg.r | 0},${bg.g | 0},${bg.b | 0})`, grad, el: path(el), disabledOp: op < 1 ? op : undefined }); }
    if (fs < 14) out.small.push({ t: txt.slice(0, 30), fs, el: path(el) });
    out.fonts.push(fs);
  });
  // 누를 곳
  const inter = new Set(document.querySelectorAll('button, a[href], input, textarea, select, [data-go], [data-act], [data-c], [tabindex]'));
  inter.forEach((el) => {
    if (el.closest('#ctl') || !vis(el)) return;
    if (el.classList.contains('ov')) return;
    const r = el.getBoundingClientRect();
    const focusable = el.tabIndex >= 0 && !el.disabled;
    const name = (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ');
    const row = { t: name.slice(0, 28), w: Math.round(r.width), h: Math.round(r.height), tag: el.tagName.toLowerCase(), el: path(el), focusable, x: Math.round(r.x), y: Math.round(r.y) };
    if (r.width < 44 || r.height < 44) out.targets.push(row);
    if (!focusable && !el.disabled) out.names.push({ ...row, issue: '키보드로 못 감(포커스 불가)' });
    if (!name && !el.getAttribute('aria-labelledby')) out.names.push({ ...row, issue: '이름 없음' });
    if (['input', 'textarea', 'select'].includes(el.tagName.toLowerCase())) {
      const lab = (el.labels && el.labels.length) || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
      if (!lab) out.labels.push({ id: el.id, ph: el.getAttribute('placeholder'), el: path(el) });
    }
    const pressed = el.getAttribute('aria-pressed') ?? el.getAttribute('aria-checked') ?? el.getAttribute('aria-selected') ?? el.getAttribute('aria-current');
    if (el.classList.contains('on') || el.classList.contains('sel')) out.names.push({ ...row, issue: '고른 상태가 aria로 없음' + (pressed != null ? '(있음)' : '') });
  });
  document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]').forEach((h) => vis(h) && out.headings.push(h.tagName + ':' + h.innerText.trim().slice(0, 24)));
  out.lang = document.documentElement.lang;
  out.title = document.title;
  out.hscroll = { doc: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth };
  out.live = [...document.querySelectorAll('[aria-live],[role=alert],[role=status]')].map((e) => e.className || e.tagName);
  out.dialogs = [...document.querySelectorAll('.dlg,.sheet')].map((e) => ({ role: e.getAttribute('role'), modal: e.getAttribute('aria-modal'), label: e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') }));
  out.main = !!document.querySelector('main,[role=main]');
  out.skip = !![...document.querySelectorAll('a[href^="#"]')].find((a) => /건너뛰|본문/.test(a.textContent));
  // 잘림(글자 넘침)
  out.clip = [];
  document.querySelectorAll('#app *').forEach((el) => {
    if (!vis(el)) return;
    const cs = getComputedStyle(el);
    if ((cs.overflow.includes('hidden') || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1 && el.innerText.trim()) out.clip.push({ t: el.innerText.trim().slice(0, 30), sw: el.scrollWidth, cw: el.clientWidth, el: path(el) });
    const r = el.getBoundingClientRect();
    if (r.right > document.documentElement.clientWidth + 1 && el.innerText && el.innerText.trim() && !el.closest('.tscroll')) out.clip.push({ t: el.innerText.trim().slice(0, 30), right: Math.round(r.right), el: path(el), issue: '화면 밖' });
  });
  const fs = out.fonts; out.fontMin = Math.min(...fs); delete out.fonts;
  out.clip = out.clip.slice(0, 12);
  return out;
};
