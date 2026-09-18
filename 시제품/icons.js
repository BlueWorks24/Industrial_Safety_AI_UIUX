// 선 아이콘 — 이모지 대신 한 가지 굵기(1.8)로 그린 SVG. I('이름', 크기)
const ICONS = {
  alert: '<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.2"/><circle cx="12" cy="17" r=".4" fill="currentColor"/>',
  megaphone: '<path d="M3.5 10.5v3a1 1 0 0 0 1 1h2l8 4.5V5L6.5 9.5h-2a1 1 0 0 0-1 1z"/><path d="M18.5 9a4 4 0 0 1 0 6"/><path d="M7 14.5 8.5 20h2.2l-1-5"/>',
  message: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  bellOff: '<path d="M6 16.5V11a6 6 0 0 1 9.6-4.8M18 11v5.5l1.5 2H8"/><path d="M10 20.5a2 2 0 0 0 4 0"/><path d="M3.5 3.5l17 17"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8L16.2 9.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.8v.5"/><circle cx="12" cy="17" r=".4" fill="currentColor"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  wifiOff: '<path d="M3.5 3.5l17 17"/><path d="M8.5 16a5 5 0 0 1 5.8-.8M5.3 12.6a9.5 9.5 0 0 1 4-2.2M14.5 10.4a9.5 9.5 0 0 1 4.2 2.2M2.5 9.3a14 14 0 0 1 3.6-2.4M11 6.1a14 14 0 0 1 10.5 3.2"/><circle cx="12" cy="19.2" r=".5" fill="currentColor"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
  tool: '<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3z" transform="rotate(0)"/><path d="M14.5 6.5 17 4l3 3-2.5 2.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  home: '<path d="M4 11 12 4.5l8 6.5"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  camera: '<path d="M4 8h3.5l1.5-2.5h6L16.5 8H20v11H4z"/><circle cx="12" cy="13.2" r="3.3"/>',
  clipboard: '<rect x="5" y="4.5" width="14" height="16" rx="2"/><path d="M9 4.5V3h6v1.5"/><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
  folder: '<path d="M3.5 6.5a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z"/><path d="M8 13h8"/>',
  factory: '<path d="M3 20V10l5 3V10l5 3V10l5 3V4h3v16z"/><path d="M7 16.5h2M12 16.5h2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".5" fill="currentColor"/>',
  sparkle: '<path d="M12 3.5c.6 3.8 2.3 5.6 6 6.3-3.7.7-5.4 2.5-6 6.3-.6-3.8-2.3-5.6-6-6.3 3.7-.7 5.4-2.5 6-6.3z"/><path d="M18.5 15.5c.2 1.4.8 2 2 2.3-1.2.3-1.8.9-2 2.3-.2-1.4-.8-2-2-2.3 1.2-.3 1.8-.9 2-2.3z"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4.5h11l-2 3.5 2 3.5H5"/>',
  send: '<path d="M20.5 3.5 3.5 10.5l7 2.5 2.5 7z"/><path d="m10.5 13 5-5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  bolt: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
  gas: '<path d="M12 3c3.5 3.4 5.5 6.4 5.5 9.5a5.5 5.5 0 0 1-11 0C6.5 9.4 8.5 6.4 12 3z"/><path d="M12 12.5c1.4 1.3 2 2.3 2 3.3a2 2 0 0 1-4 0c0-1 .6-2 2-3.3z"/>',
  drop: '<path d="M12 3.5c3.2 4 5 7 5 9.5a5 5 0 0 1-10 0c0-2.5 1.8-5.5 5-9.5z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.7M12 18.5v2.7M2.8 12h2.7M18.5 12h2.7M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M5.5 18.5l1.9-1.9M16.6 7.4l1.9-1.9"/>',
  signal: '<path d="M5 18v-2M9.5 18v-5M14 18v-8M18.5 18V6"/>',
  pin: '<path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 0 0-13 0c0 5 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  thermo: '<path d="M10 4.5a2 2 0 0 1 4 0v9.3a4 4 0 1 1-4 0z"/><path d="M12 10v6.5"/><circle cx="12" cy="17.2" r="1.3" fill="currentColor"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.8" cy="6.5" r=".6" fill="currentColor"/><circle cx="4.8" cy="12" r=".6" fill="currentColor"/><circle cx="4.8" cy="17.5" r=".6" fill="currentColor"/>',
};
function I(name, size = 20, cls = '') {
  return `<svg class="i ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
// 센서 종류별 아이콘 — iconOf(센서 키)
const TYPE_ICON = { vib: 'gear', gas: 'gas', power: 'bolt', leak: 'drop', th: 'thermo' };
const iconOf = (k) => TYPE_ICON[(SENSORS[k] || {}).type] || 'alert';
