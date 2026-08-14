// 未来致远 · SVG 图标库（24x24 stroke 风格，currentColor）
const paths = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1H9z"/><path d="M8.5 10h7M8.5 14h5"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H14a3.5 3.5 0 0 0 0-7H10a3.5 3.5 0 0 1 0-7h5.5"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 0-2 2z"/><path d="M4 5v16"/><path d="M8 7h8M8 11h8"/>',
  chat: '<path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z"/><path d="M8.5 10.5h7M8.5 14h4"/>',
  crown: '<path d="m3 8 3.5 3L12 5l5.5 6L21 8l-1.5 9h-15z"/><path d="M5.5 21h13"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="m9 15 2 2 4-4"/>',
  medal: '<circle cx="12" cy="9" r="5.5"/><path d="m9 13.5-2 7 5-3 5 3-2-7"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  arrow: '<path d="M4 12h16m0 0-6-6m6 6-6 6"/>',
  spark: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><circle cx="12" cy="15.5" r="1.4"/>',
  check: '<path d="m4.5 12.5 5 5L19.5 6.5"/>',
  star: '<path d="m12 3 2.7 5.8 6.3.8-4.6 4.4 1.2 6.2L12 17.2 6.4 20.2l1.2-6.2L3 9.6l6.3-.8z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  gamepad: '<rect x="4" y="7" width="16" height="10" rx="3"/><path d="M7.5 10v4M5.5 12h4"/><circle cx="15.5" cy="11" r=".6"/><circle cx="17.5" cy="13" r=".6"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.8-3.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  heart: '<path d="M12 20s-7-4.6-9.2-9C1.4 8.3 3 5 6.2 5c2 0 3.5 1.2 4.3 2.6h3C14.3 6.2 15.8 5 17.8 5 21 5 22.6 8.3 21.2 11c-2.2 4.4-9.2 9-9.2 9z"/>',
  flame: '<path d="M12 3c1 3-1 4.5-1 7a3 3 0 0 0 6 0c2.5 2 4 4.5 4 7a9 9 0 1 1-18 0c0-4 2-7 4-9 .5 1.5 2 2 3 1 .5-2 .5-4 2-6z"/>',
  briefcase: '<rect x="3.5" y="7.5" width="17" height="13" rx="2.5"/><path d="M9 7.5V6a2.5 2.5 0 0 1 2.5-2.5h1A2.5 2.5 0 0 1 15 6v1.5"/><path d="M3.5 13h17"/>',
  graduation: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5"/><path d="M22 9v5"/>',
  camera: '<path d="M4 8h3l2-2.5h6L17 8h3a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 20 20.5H4A1.5 1.5 0 0 1 2.5 19V9.5A1.5 1.5 0 0 1 4 8z"/><circle cx="12" cy="14" r="4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  rocket: '<path d="M12 15c-1.5-3-3-5.5-5.5-7C9 5 12.5 4 14 4.5c1 .3 2 .8 3 1.6 1.2 1 2 2.2 2.6 3.7C20.6 12.5 19 15 16 16c-1.5.5-3 1-4-1z"/><path d="M12 15c-2 .5-4 .3-5.5-1.5"/><circle cx="14.5" cy="8.5" r="1.5"/><path d="M8 19c-2 1-3.5 1.5-4.5 2 .5-1 1-2.5 2-4.5"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 3v4h-4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/><path d="m3 17 9 5 9-5"/>'
};

export function icon(name, size = 20, stroke = 1.8) {
  const d = paths[name] || paths.spark;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}

export const ICONS = Object.keys(paths);
