/* 我的模拟人生路 · 手绘美术资源 v2：精细建筑 / 装饰 SVG 生成器 */
(function () {
  'use strict';

  const OUTLINE = '#4a4a5e';
  const CREAM = '#fffdf5';
  const WOOD = '#a9714b';

  function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
  function wobble(seed) { const r = seed % 9; return (r - 4) / 2; }
  function shade(hex, amt) {
    let n;
    try { n = parseInt(String(hex).replace('#', ''), 16); } catch (e) { return hex; }
    if (isNaN(n)) return hex;
    let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ---------- 通用构件 ---------- */
  function windowEl(x, y, w, h, type = 'win') {
    const pane = type === 'shop' ? '' : `
      <line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="${OUTLINE}" stroke-width="2" opacity=".55"/>
      <line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="${OUTLINE}" stroke-width="2" opacity=".55"/>`;
    return `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="var(--win, #cfe3f5)" stroke="${OUTLINE}" stroke-width="2.5"/>
      ${pane}
      <rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 4}" rx="5" fill="none" stroke="${WOOD}" stroke-width="2" opacity=".5"/>`;
  }

  function doorEl(x, y, w, h) {
    return `
      <path d="M${x} ${y + h} L${x} ${y + h * 0.28} Q${x + w / 2} ${y - h * 0.08} ${x + w} ${y + h * 0.28} L${x + w} ${y + h} Z" fill="${WOOD}" stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="${x + w * 0.78}" cy="${y + h * 0.55}" r="2" fill="#ffd76e" stroke="${OUTLINE}" stroke-width="1.5"/>
      <path d="M${x + w * 0.18} ${y + h} h${w * 0.64}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
  }

  function roofShingles(x, y, w, h, color) {
    const lines = [];
    for (let i = 1; i < 5; i++) {
      const yy = y + h * i / 5;
      lines.push(`<path d="M${x} ${yy} L${x + w} ${yy}" stroke="${OUTLINE}" stroke-width="2" opacity=".35"/>`);
    }
    return `<path d="M${x} ${y + h} L${x + w / 2} ${y} L${x + w} ${y + h} Z" fill="${color}" stroke="${OUTLINE}" stroke-width="3.5" stroke-linejoin="round"/>${lines.join('')}`;
  }

  function signEl(x, y, w, h, text, bg) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${bg || '#fff'}" stroke="${OUTLINE}" stroke-width="2.5"/>
      <text x="${x + w / 2}" y="${y + h * 0.68}" font-size="${h * 0.5}" text-anchor="middle" fill="${OUTLINE}" font-weight="bold">${text}</text>`;
  }

  function plantEl(x, y, s = 1) {
    return `
      <path d="M${x} ${y} q-4 -8 0 -14 q6 -2 8 -8 q8 1 10 -6" fill="none" stroke="#6aa84f" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="${x + 6}" cy="${y - 6}" r="${4 * s}" fill="#8fcd78" stroke="${OUTLINE}" stroke-width="2"/>
      <circle cx="${x + 12}" cy="${y - 4}" r="${3.4 * s}" fill="#7fbf6a" stroke="${OUTLINE}" stroke-width="2"/>`;
  }

  function smokeEl(x, y) {
    return `<circle cx="${x}" cy="${y}" r="3" fill="none" stroke="#c9ccd6" stroke-width="2"/><circle cx="${x + 5}" cy="${y - 6}" r="4" fill="none" stroke="#c9ccd6" stroke-width="2"/><circle cx="${x + 11}" cy="${y - 12}" r="5" fill="none" stroke="#c9ccd6" stroke-width="2" opacity=".7"/>`;
  }

  /* ---------- 模板 v3：2.5D 立体建筑（前墙 + 侧墙 + 顶面 + 投影） ---------- */
  const DEPTH = 28;
  let CURRENT_UID = 'b';

  /* 立体窗：外框 + 玻璃 + 窗台 + 投影 */
  function window3D(x, y, w, h, dark = true, seed = 0) {
    const frame = dark ? '#8a7a5a' : '#9a8a6a';
    const offCls = seed > 0 && seed % 2 === 0 ? 'win-off' : '';
    return '<g class="' + offCls + '">' + `
      <rect x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" rx="3" fill="${shade('#f4efe2', -34)}" stroke="${OUTLINE}" stroke-width="2"/>
      <path d="M${x - 3} ${y - 3} L${x + w + 3} ${y - 3} L${x + w - 1} ${y + 1} L${x - 1} ${y + 1} Z" fill="${shade('#f4efe2', 12)}" opacity=".6"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="var(--win, #cfe3f5)" stroke="${frame}" stroke-width="1.8"/>
      <rect x="${x + 1.2}" y="${y + 1.2}" width="${w - 2.4}" height="${(h - 2.4) * 0.42}" fill="#ffffff" opacity=".2"/>
      <rect x="${x + 1.2}" y="${y + h - 1.2 - (h - 2.4) * 0.3}" width="${w - 2.4}" height="${(h - 2.4) * 0.3}" fill="#1a2440" opacity=".1"/>
      <path d="M${x + 2} ${y + h - 2} h${w - 4}" stroke="#fff" stroke-width="1.6" opacity=".5"/>
      <line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="${frame}" stroke-width="1.8"/>
      <line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="${frame}" stroke-width="1.8"/>
      <rect x="${x - 2}" y="${y + h}" width="${w + 4}" height="4" rx="1.5" fill="${shade(frame, -6)}" stroke="${OUTLINE}" stroke-width="1.4"/>
      <path d="M${x - 2} ${y + h + 4} h${w + 4}" stroke="rgba(60,40,20,.28)" stroke-width="2.4"/>` + '</g>';
  }

  /* 立体门：门框 + 门板 + 把手 + 门槛 */
  function door3D(x, y, w, h) {
    return `
      <path d="M${x - 4} ${y - 3} L${x + w + 4} ${y - 3} L${x + w + 2} ${y + h + 3} L${x - 2} ${y + h + 3} Z" fill="${shade('#8a6a4a', -22)}" stroke="${OUTLINE}" stroke-width="2"/>
      <path d="M${x - 4} ${y - 3} h${w + 8}" stroke="${shade('#8a6a4a', 20)}" stroke-width="2" opacity=".5"/>
      <path d="M${x} ${y + h} L${x} ${y + h * 0.3} Q${x + w / 2} ${y - h * 0.08} ${x + w} ${y + h * 0.3} L${x + w} ${y + h} Z" fill="${WOOD}" stroke="${OUTLINE}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M${x + 1} ${y + 2} v${h - 6}" stroke="${shade(WOOD, 26)}" stroke-width="2" opacity=".55"/>
      <circle cx="${x + w * 0.78}" cy="${y + h * 0.52}" r="1.8" fill="#ffd76e" stroke="${OUTLINE}" stroke-width="1.4"/>
      <rect x="${x - 2}" y="${y + h}" width="${w + 4}" height="4.5" rx="1.5" fill="#b8a888" stroke="${OUTLINE}" stroke-width="1.6"/>
      <path d="M${x - 2} ${y + h + 4.5} h${w + 4}" stroke="rgba(60,40,20,.28)" stroke-width="2.4"/>`;
  }

  /* 墙板纹理：住宅横向木板 / 楼宇竖向板 */
  function sidingLines(x, y, w, h, kind) {
    const lines = [];
    if (kind === 'h') {
      for (let yy = y + 14; yy < y + h - 6; yy += 13) lines.push(`<line x1="${x + 3}" y1="${yy}" x2="${x + w - 3}" y2="${yy}" stroke="#4a3b28" stroke-width="1" opacity=".08"/>`);
    } else {
      for (let xx = x + 16; xx < x + w - 4; xx += 24) lines.push(`<line x1="${xx}" y1="${y + 3}" x2="${xx}" y2="${y + h - 3}" stroke="#4a3b28" stroke-width="1" opacity=".06"/>`);
    }
    return lines.join('');
  }

  /* 百叶窗：窗户两侧的护窗板 */
  function shutter3D(x, y, w, h, color) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${color}" stroke="${OUTLINE}" stroke-width="1.6"/>
      <line x1="${x + 1.4}" y1="${y + 5}" x2="${x + w - 1.4}" y2="${y + 5}" stroke="${shade(color, -26)}" stroke-width="1.3"/>
      <line x1="${x + 1.4}" y1="${y + h / 2}" x2="${x + w - 1.4}" y2="${y + h / 2}" stroke="${shade(color, -26)}" stroke-width="1.3"/>
      <line x1="${x + 1.4}" y1="${y + h - 5}" x2="${x + w - 1.4}" y2="${y + h - 5}" stroke="${shade(color, -26)}" stroke-width="1.3"/>`;
  }
  /* 窗台花箱：窗下的一排小花 */
  function windowBox3D(x, y, w, seed) {
    const cols = ['#e88bb0', '#ffd76e', '#ff8a8a', '#b18cff', '#ff8a3a'];
    return `<rect x="${x}" y="${y}" width="${w}" height="7" rx="2" fill="#8a6a4a" stroke="${OUTLINE}" stroke-width="1.5"/>
      <rect x="${x + 1}" y="${y + 2}" width="${w - 2}" height="4" fill="#6a4a30"/>
      ${[0.2, 0.5, 0.8].map((t, i) => `<circle cx="${x + w * t}" cy="${y - 1}" r="2.6" fill="${cols[(seed + i) % cols.length]}" stroke="${OUTLINE}" stroke-width="1"/>`).join('')}`;
  }
  /* 栅栏：住宅前的一排小木栅栏 */
  function fenceRow3D(x, w, y, gateX, gateW = 14) {
    const posts = [];
    let px = x;
    let i = 0;
    while (px < x + w) {
      const inGate = px > gateX - 4 && px < gateX + gateW + 4;
      if (!inGate) posts.push(`<rect x="${px}" y="${y}" width="4" height="14" rx="1.5" fill="#c9a86a" stroke="${OUTLINE}" stroke-width="1.2"/><path d="M${px + 2} ${y + 4} q-3 -3 -5 -1" fill="none" stroke="#8a6a4a" stroke-width="1.4"/>`);
      px += 13; i++;
    }
    return `<g opacity=".95">
      <line x1="${x - 4}" y1="${y + 4}" x2="${x + w + 4}" y2="${y + 4}" stroke="#a9714b" stroke-width="2.4"/>
      <line x1="${x - 4}" y1="${y + 11}" x2="${x + w + 4}" y2="${y + 11}" stroke="#a9714b" stroke-width="2.4"/>
      ${posts.join('')}
    </g>`;
  }


  /* 职业专属徽章：医院十字 / 学校黑板 / 银行金币…… */
  function careerEmblem(b, x, y) {
    const D = '#3a3a4a';
    const badge = (inner) => `<g transform="translate(${x},${y})">${inner}</g>`;
    switch (b.id) {
      case 'hospital': return badge(`<rect x="1" y="1" width="24" height="20" rx="5" fill="#e8593c" stroke="${D}" stroke-width="1.6"/><rect x="9" y="4" width="8" height="14" rx="1.5" fill="#fff"/><rect x="4" y="9" width="18" height="4" rx="1.5" fill="#fff"/>`);
      case 'school': return badge(`<rect x="2" y="3" width="22" height="16" rx="2" fill="#2f5d3a" stroke="${D}" stroke-width="1.6"/><line x1="5" y1="8" x2="14" y2="8" stroke="#fff" stroke-width="1.4"/><line x1="5" y1="12" x2="19" y2="12" stroke="#ffe9a8" stroke-width="1.4"/><line x1="5" y1="16" x2="11" y2="16" stroke="#fff" stroke-width="1.4" opacity=".7"/>`);
      case 'bank': return badge(`<circle cx="13" cy="11" r="8.5" fill="#ffd76e" stroke="${D}" stroke-width="1.6"/><text x="13" y="15" font-size="11" font-weight="bold" text-anchor="middle" fill="#8a5a00">¥</text>`);
      case 'cafe': return badge(`<rect x="4" y="10" width="13" height="9" rx="2" fill="#c9a86a" stroke="${D}" stroke-width="1.6"/><path d="M17 11 h3 a2 2 0 0 1 0 6 h-3" fill="none" stroke="${D}" stroke-width="1.5"/><path d="M8 5 q2 -3 5 -2 M13 4 q2 -2 4 -1" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>`);
      case 'police': return badge(`<path d="M13 2 l8 3 v6 c0 5 -3.5 8 -8 9 c-4.5 -1 -8 -4 -8 -9 v-6 Z" fill="#4d6fa0" stroke="${D}" stroke-width="1.6"/><path d="M13 8 l2 4 l-2 5 l-2 -5 Z" fill="#ffd76e" stroke="${D}" stroke-width="1"/>`);
      case 'gym': return badge(`<line x1="3" y1="11" x2="23" y2="11" stroke="#8a93a6" stroke-width="4" stroke-linecap="round"/><rect x="1" y="6" width="5" height="10" rx="2" fill="#3d3d4d" stroke="${D}" stroke-width="1.2"/><rect x="20" y="6" width="5" height="10" rx="2" fill="#3d3d4d" stroke="${D}" stroke-width="1.2"/>`);
      case 'theater': return badge(`<path d="M5 8 q-2 -6 4 -5 q4 1 3 6 q-3 -1 -4 2 q-2 -1 -3 -3 Z M15 9 q-2 -6 4 -5 q4 1 3 6 q-3 -1 -4 2 q-2 -1 -3 -3 Z" fill="#e88bb0" stroke="${D}" stroke-width="1.2"/><rect x="2" y="16" width="22" height="3" rx="1.5" fill="#8a6a45" stroke="${D}" stroke-width="1"/>`);
      case 'court': return badge(`<line x1="13" y1="6" x2="13" y2="18" stroke="#8a93a6" stroke-width="2.2"/><line x1="5" y1="9" x2="21" y2="9" stroke="#cfd6e4" stroke-width="2.4"/><path d="M5 9 l-2 6 M21 9 l2 6" stroke="#f5b544" stroke-width="2" stroke-linecap="round"/>`);
      case 'media': return badge(`<rect x="3" y="4" width="20" height="15" rx="1.5" fill="#fff" stroke="${D}" stroke-width="1.6"/><line x1="6" y1="9" x2="16" y2="9" stroke="#c0392b" stroke-width="1.4"/><line x1="6" y1="13" x2="20" y2="13" stroke="#4a6a8a" stroke-width="1.4"/><line x1="6" y1="16" x2="12" y2="16" stroke="#8a93a6" stroke-width="1.2"/>`);
      case 'library': return badge(`<path d="M3 6 q7 -4 10 0 v13 q-3 -4 -10 0 Z M23 6 q-7 -4 -10 0 v13 q3 -4 10 0 Z" fill="#e8e0cc" stroke="${D}" stroke-width="1.5"/>`);
      case 'kinder': return badge(`<rect x="3" y="9" width="7" height="8" rx="1.5" fill="#e88bb0" stroke="${D}" stroke-width="1.2"/><rect x="10" y="6" width="7" height="11" rx="1.5" fill="#5c7cfa" stroke="${D}" stroke-width="1.2"/><rect x="17" y="10" width="6" height="7" rx="1.5" fill="#f5b544" stroke="${D}" stroke-width="1.2"/><path d="M4 4 q4 -3 8 0 q4 3 8 0" stroke="#ffd76e" stroke-width="1.6" fill="none"/>`);
      case 'mall': return badge(`<path d="M5 8 h16 l-2 11 h-12 Z" fill="#6cc4a8" stroke="${D}" stroke-width="1.5"/><path d="M9 8 q0 -5 4 -5 q4 0 4 5" fill="none" stroke="${D}" stroke-width="1.4"/>`);
      case 'tech': case 'ai': return badge(`<rect x="4" y="4" width="18" height="14" rx="2" fill="#2b3a55" stroke="${D}" stroke-width="1.6"/><rect x="8" y="8" width="10" height="6" rx="1" fill="#5c7cfa"/><line x1="13" y1="8" x2="13" y2="4" stroke="#8a93a6" stroke-width="1.6"/><line x1="13" y1="18" x2="13" y2="21" stroke="#8a93a6" stroke-width="1.6"/><line x1="4" y1="11" x2="1" y2="11" stroke="#8a93a6" stroke-width="1.6"/>`);
      case 'gov': return badge(`<path d="M4 18 h18 l-2 -12 h-14 Z" fill="#c9b8a0" stroke="${D}" stroke-width="1.5"/><rect x="6" y="6" width="14" height="3" fill="#b8a888" stroke="${D}" stroke-width="1"/>`);
      case 'farm': return badge(`<path d="M13 20 q-8 -10 0 -16 q8 6 0 16 Z" fill="#e8c26a" stroke="#a9714b" stroke-width="1.3"/><path d="M6 16 q-2 -6 2 -10 M20 16 q2 -6 -2 -10" stroke="#c9a86a" stroke-width="1.4" fill="none"/>`);
      default: return badge(`<path d="M13 2 l2.6 5.4 5.9 .8 -4.3 4.1 1 5.9 -5.2 -2.8 -5.2 2.8 1 -5.9 -4.3 -4.1 5.9 -.8 Z" fill="#ffd76e" stroke="${D}" stroke-width="1.3"/>`);
    }
  }
  /* 立体投影 + 草地底座：让建筑“钉”在地上 */
  function groundShadow3D(W, H, fw) {
    const cx = W / 2, gy = H - 6;
    const rx = fw / 2 + 18;
    return `<ellipse cx="${cx + 14}" cy="${gy + 9}" rx="${rx + 4}" ry="11" fill="rgba(40,28,14,.16)"/>
      <ellipse cx="${cx + 9}" cy="${gy + 5}" rx="${rx}" ry="8" fill="rgba(40,28,14,.24)"/>
      <ellipse cx="${cx + 4}" cy="${gy + 2}" rx="${rx - 8}" ry="5.5" fill="rgba(40,28,14,.28)"/>
      <rect x="${cx - rx + 2}" y="${gy + 12}" width="${rx * 2 - 4}" height="8" rx="4" fill="rgba(60,100,62,.4)" opacity=".5"/>`;
  }
  /* 明暗层次：墙顶受光 + 墙根阴影 + 左棱受光 + 侧墙加深 */
  function depthPolish(fx, fy, fw, fh, D) {
    return `<rect x="${fx + 1}" y="${fy + 1}" width="${fw - 2}" height="9" fill="rgba(255,255,255,.28)"/>
      <rect x="${fx + 1}" y="${fy + fh - 15}" width="${fw - 2}" height="14" fill="rgba(45,28,10,.12)"/>
      <line x1="${fx + 1}" y1="${fy + 2}" x2="${fx + 1}" y2="${fy + fh - 2}" stroke="rgba(255,255,255,.5)" stroke-width="2"/>
      <line x1="${fx + fw - 1}" y1="${fy + 2}" x2="${fx + fw - 1}" y2="${fy + fh - 2}" stroke="rgba(40,25,10,.18)" stroke-width="1.6"/>
      <rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="url(#wallShade-${CURRENT_UID})" opacity=".55" pointer-events="none"/>
      <path d="M${fx + fw} ${fy} L${fx + fw + D} ${fy - D} L${fx + fw + D} ${fy + fh - D} L${fx + fw} ${fy + fh} Z" fill="rgba(16,10,26,.16)"/>`;
  }

  /* 顶面（平行四边形，含屋檐） */
  function roofFace(x0, y0, x1, y1, color, eaves = 6) {
    const W = x1 - x0;
    return `
      <path d="M${x0 - eaves} ${y0 - eaves} L${x1 + eaves} ${y0 - eaves} L${x1} ${y1} L${x0} ${y1} Z" fill="${color}" stroke="${OUTLINE}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M${x0 - eaves} ${y0 - eaves} L${x0} ${y1}" stroke="${shade(color, -32)}" stroke-width="2" opacity=".65"/>
      <path d="M${x1 + eaves} ${y0 - eaves} L${x1} ${y1}" stroke="${shade(color, -32)}" stroke-width="2" opacity=".65"/>
      <line x1="${x0 + 2}" y1="${y1 - 1}" x2="${x1 - 2}" y2="${y1 - 1}" stroke="${shade(color, 26)}" stroke-width="2.2" opacity=".95"/>
      <path d="M${x0 - eaves} ${y0 - eaves} L${x1 + eaves} ${y0 - eaves} L${x1 + eaves - 9} ${y0 - eaves + 4} L${x0 - eaves + 9} ${y0 - eaves + 4} Z" fill="rgba(255,255,255,.3)"/>
      <path d="M${x0 - eaves} ${y0 - eaves} L${x1 + eaves} ${y0 - eaves} L${x1} ${y1} L${x0} ${y1} Z" fill="url(#roofShade-${CURRENT_UID})" pointer-events="none"/>
      ${[0.28, 0.5, 0.72].map(t => `<line x1="${x0 - eaves + W * t}" y1="${y0 - eaves}" x2="${x0 + W * t}" y2="${y1}" stroke="${shade(color, -26)}" stroke-width="1.5" opacity=".55"/>`).join('')}`;
  }

  /* ===== 建筑大改版：2.5D 屋顶主导 ===== */
function boxFaces(fx, fy, fw, fh, d, frontC, sideC) {
  const bx = fx + fw;
  return {
    front: `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="${frontC}" stroke="${OUTLINE}" stroke-width="3"/>
      <rect x="${fx + 1}" y="${fy + 1}" width="${fw - 2}" height="7" fill="rgba(255,255,255,.3)"/>
      <rect x="${fx + 1}" y="${fy + fh - 12}" width="${fw - 2}" height="11" fill="rgba(45,28,10,.12)"/>
      <line x1="${fx + 1}" y1="${fy + 2}" x2="${fx + 1}" y2="${fy + fh - 2}" stroke="rgba(255,255,255,.5)" stroke-width="2"/>`,
    side: `<path d="M${bx} ${fy} L${bx + d} ${fy - d} L${bx + d} ${fy + fh - d} L${bx} ${fy + fh} Z" fill="${sideC}" stroke="${OUTLINE}" stroke-width="2.5"/>
      <path d="M${bx} ${fy} L${bx + d} ${fy - d} L${bx + d} ${fy + fh - d} L${bx} ${fy + fh} Z" fill="rgba(16,10,26,.18)"/>`,
    top: `<path d="M${fx} ${fy} L${fx + d} ${fy - d} L${bx + d} ${fy - d} L${bx} ${fy} Z" fill="${shade(frontC, -20)}" stroke="${OUTLINE}" stroke-width="2.4"/>`
  };
}
/* 人字屋顶：四个坡面 + 屋檐厚度 + 屋脊 */
function gableRoof(fx, fy, fw, d, over, peak, color) {
  const fe = fy + 8;          // 前檐 y
  const ry = fe - peak;       // 屋脊 y
  const fl = fx - over, fr = fx + fw + over;
  const bl = fl + d, br = fr + d;
  const rl = fx + 14, rr = fx + fw - 14;
  const back = `<path d="M${rl + d} ${ry - d} L${rr + d} ${ry - d} L${br} ${fe - d} L${bl} ${fe - d} Z" fill="${shade(color, -42)}" stroke="${OUTLINE}" stroke-width="2.2"/>`;
  const right = `<path d="M${fr} ${fe} L${br} ${fe - d} L${rr + d} ${ry - d} L${rr} ${ry} Z" fill="${shade(color, -14)}" stroke="${OUTLINE}" stroke-width="2.2"/>`;
  const left = `<path d="M${fl} ${fe} L${bl} ${fe - d} L${rl + d} ${ry - d} L${rl} ${ry} Z" fill="${shade(color, 12)}" stroke="${OUTLINE}" stroke-width="2.2"/>`;
  const front = `<path d="M${fl} ${fe} L${rl} ${ry} L${rr} ${ry} L${fr} ${fe} Z" fill="${color}" stroke="${OUTLINE}" stroke-width="2.6"/>`;
  const eave = `<path d="M${fl} ${fe} L${fr} ${fe} L${fr} ${fe + 4} L${fl} ${fe + 4} Z" fill="${shade(color, -32)}" stroke="${OUTLINE}" stroke-width="1.6"/>`;
  const ridge = `<line x1="${rl}" y1="${ry}" x2="${rr}" y2="${ry}" stroke="${shade(color, -38)}" stroke-width="3" stroke-linecap="round"/>
    <line x1="${rl + d}" y1="${ry - d}" x2="${rr + d}" y2="${ry - d}" stroke="${shade(color, -48)}" stroke-width="2.2" stroke-linecap="round"/>`;
  return back + right + left + front + eave + ridge;
}
/* 平屋顶：箱体顶 + 女儿墙 + 屋顶设备 */
function flatRoof(fx, fy, fw, d, color) {
  const bx = fx + fw;
  return `<path d="M${fx - 6} ${fy - d - 6} L${bx + 6} ${fy - d - 6} L${bx + 6 + 6} ${fy - d - 12} L${fx - 6 + 6} ${fy - d - 12} Z" fill="${shade(color, 26)}" stroke="${OUTLINE}" stroke-width="2.2"/>
    <rect x="${fx - 6}" y="${fy - d - 6}" width="${fw + 12}" height="7" fill="${shade(color, 10)}" stroke="${OUTLINE}" stroke-width="2"/>
    <path d="M${fx} ${fy - d} L${bx} ${fy - d} L${bx + 6} ${fy - d - 6} L${fx + 6} ${fy - d - 6} Z" fill="${shade(color, -8)}" stroke="${OUTLINE}" stroke-width="2"/>`;
}

function houseTemplate(b, W, H) {
  const seedH = hash(b.id);
  const d = 30, over = 13, peak = 62;
  const fx = 44, fw = W - 88, fy = 126, fh = 36;
  const big = b.w >= 230;
  const frontC = shade('#fffdf5', -6);
  const sideC = shade('#fffdf5', -40);
  const roofC = b.color;
  const shadow = groundShadow3D(W, H, fw);
  const faces = boxFaces(fx, fy, fw, fh, d, frontC, sideC);
  const roof = gableRoof(fx, fy, fw, d, over, peak, roofC);
  // 前墙细节（短墙）：窗 + 门 + 门灯
  const ww = fw * 0.17, wh = 17;
  const winL_x = fx + fw * 0.15, winR_x = fx + fw * 0.68;
  const winL = window3D(winL_x, fy + 10, ww, wh, true, 1);
  const winR = window3D(winR_x, fy + 10, ww, wh, true, 2);
  const drW = fw * 0.13, drH = 26;
  const drX = fx + fw * 0.44, drY = fy + fh - drH + 2;
  const dr = door3D(drX, drY, drW, drH);
  const shutterC = seedH % 2 ? '#f4efe2' : (seedH % 3 === 1 ? '#8fa6c2' : '#7fbf6a');
  const shW = 5;
  const shutL = seedH % 2 === 0 ? shutter3D(winL_x - shW - 2, fy + 11, shW, wh + 3, shutterC) + shutter3D(winL_x + ww + 2, fy + 11, shW, wh + 3, shutterC) : '';
  const shutR = seedH % 2 === 0 ? shutter3D(winR_x - shW - 2, fy + 11, shW, wh + 3, shutterC) + shutter3D(winR_x + ww + 2, fy + 11, shW, wh + 3, shutterC) : '';
  // 门廊：台阶 + 门垫 + 门灯
  const porch = `<rect x="${drX - 6}" y="${drY + drH + 1}" width="${drW + 12}" height="6" rx="2" fill="#b8a888" stroke="${OUTLINE}" stroke-width="1.6"/>
    <rect x="${drX - 2}" y="${drY + drH + 7}" width="${drW + 4}" height="4" rx="1.5" fill="#c97b5a" stroke="${OUTLINE}" stroke-width="1.2"/>
    <circle cx="${drX - 9}" cy="${drY + 6}" r="3" fill="#ffd76e" stroke="${OUTLINE}" stroke-width="1.2"/>
    <rect x="${drX - 10.4}" y="${drY}" width="2.6" height="5" rx="1" fill="#5d4529" stroke="${OUTLINE}" stroke-width="0.8"/>`;
  // 门牌（前坡上）
  const plaque = `<rect x="${W / 2 - 16}" y="${fy - 24}" width="32" height="12" rx="3" fill="#e8c86b" stroke="${OUTLINE}" stroke-width="1.6"/>
    <text x="${W / 2}" y="${fy - 15}" font-size="8" fill="#5a4a2a" text-anchor="middle" font-weight="bold">${(seedH % 30) + 1}</text>`;
  // 烟囱（右坡上）
  const chx = fx + fw * 0.78, chy = fy - 34;
  const chimney = `<path d="M${chx} ${chy} L${chx + d * 0.45} ${chy - d * 0.45} L${chx + 11 + d * 0.45} ${chy - d * 0.45} L${chx + 11} ${chy} Z" fill="${shade('#c9b8a0', 22)}" stroke="${OUTLINE}" stroke-width="2"/>
    <rect x="${chx}" y="${chy}" width="11" height="16" fill="#c9b8a0" stroke="${OUTLINE}" stroke-width="2"/>
    <path d="M${chx + 11} ${chy} L${chx + 11 + d * 0.45} ${chy - d * 0.45} L${chx + 11 + d * 0.45} ${chy + 16 - d * 0.45} L${chx + 11} ${chy + 16} Z" fill="${shade('#c9b8a0', -24)}" stroke="${OUTLINE}" stroke-width="2"/>`;
  return `${shadow}${faces.side}${faces.front}${faces.top}${roof}
    ${winL}${shutL}${winR}${shutR}${dr}${porch}${plaque}${chimney}${smokeEl(chx + 5, chy - 8)}
    ${plantEl(fx + 2, H - 10)}
    ${plantEl(fx + fw - 14, H - 10, 0.8)}
    <rect x="${fx - 12}" y="${H - 15}" width="${fw + 24}" height="9" rx="4.5" fill="#6fae5e" stroke="${OUTLINE}" stroke-width="1.4" opacity=".9"/>`;
}

function towerTemplate(b, W, H) {
  const seed = hash(b.id);
  const d = 30;
  const fx = 44, fw = W - 88, fy = 96, fh = 66;
  const frontC = shade('#fffdf5', -6);
  const sideC = shade('#fffdf5', -40);
  const roofC = b.color;
  const shadow = groundShadow3D(W, H, fw);
  const faces = boxFaces(fx, fy, fw, fh, d, frontC, sideC);
  const roof = flatRoof(fx, fy, fw, d, roofC);
  // 楼层窗（前墙 2 排 + 侧墙小窗）
  const floors = 2;
  const floorH = (fh - 10) / floors;
  let wins = '';
  for (let f = 0; f < floors; f++) {
    const wy = fy + 12 + f * floorH;
    const wh = Math.min(15, floorH * 0.4);
    wins += window3D(fx + fw * 0.15, wy, fw * 0.18, wh, true, f + 1);
    wins += window3D(fx + fw * 0.67, wy, fw * 0.18, wh, true, f + 2);
    if ((seed + f) % 2 === 0) wins += `<rect x="${fx + fw + 4}" y="${wy + 2}" width="7" height="8" rx="1.5" fill="#b8c8d8" stroke="#3a3a4a" stroke-width="1.2" opacity=".7"/>`;
  }
  const drW = fw * 0.14, drH = 24;
  const drX = fx + fw * 0.43, drY = fy + fh - drH + 2;
  const entrance = door3D(drX, drY, drW, drH);
  const entranceStep = `<rect x="${drX - 6}" y="${drY + drH + 1}" width="${drW + 12}" height="6" rx="2" fill="#b8a888" stroke="${OUTLINE}" stroke-width="1.6"/>`;
  const cx0 = drX - 6, cx1 = drX + drW + 6, cyc = drY - 10;
  const canopy = `<path d="M${cx0} ${cyc - 4} L${cx0 + d * 0.4} ${cyc - 4 - d * 0.4} L${cx1 + d * 0.4} ${cyc - 4 - d * 0.4} L${cx1} ${cyc - 4} Z" fill="${shade(roofC, 22)}" stroke="${OUTLINE}" stroke-width="2"/>
    <path d="M${cx0} ${cyc - 4} L${cx1} ${cyc - 4} L${cx1} ${cyc + 5} L${cx0} ${cyc + 5} Z" fill="${shade(roofC, -6)}" stroke="${OUTLINE}" stroke-width="2"/>`;
  const sign = signEl(fx + fw * 0.24, fy + 6, fw * 0.52, 13, b.emoji, b.color);
  // 屋顶设备
  const roofer = seed % 3 === 0
    ? `<path d="M${fx + fw * 0.66} ${fy - d - 6} v-12" stroke="${OUTLINE}" stroke-width="3" stroke-linecap="round"/><path d="M${fx + fw * 0.6} ${fy - d - 18} h${fw * 0.14}" stroke="${OUTLINE}" stroke-width="3.5" stroke-linecap="round"/>`
    : seed % 3 === 1
      ? `<rect x="${fx + fw * 0.62}" y="${fy - d - 14}" width="10" height="10" rx="2" fill="#b8c8e0" stroke="${OUTLINE}" stroke-width="2"/>`
      : `<rect x="${fx + fw * 0.62}" y="${fy - d - 12}" width="12" height="8" rx="3" fill="#9fdcb0" stroke="${OUTLINE}" stroke-width="2"/>`;
  return `${shadow}${faces.side}${faces.front}${faces.top}${roof}${wins}${entrance}${entranceStep}${canopy}${sign}${roofer}
    ${careerEmblem(b, fx + 10, fy + 6)}
    ${plantEl(fx + 2, H - 10)}
    <rect x="${fx - 12}" y="${H - 15}" width="${fw + 24}" height="9" rx="4.5" fill="#6fae5e" stroke="${OUTLINE}" stroke-width="1.4" opacity=".9"/>`;
}

function pavilionTemplate(b, W, H) {
  const d = 30, over = 16, peak = 52;
  const fx = 44, fw = W - 88, fy = 128, fh = 34;
  const frontC = shade('#fffdf5', -6);
  const sideC = shade('#fffdf5', -40);
  const roofC = b.color;
  const shadow = groundShadow3D(W, H, fw);
  const faces = boxFaces(fx, fy, fw, fh, d, frontC, sideC);
  const roof = gableRoof(fx, fy, fw, d, over, peak, roofC);
  const winL = window3D(fx + fw * 0.15, fy + 8, fw * 0.19, 16, true, 1);
  const winR = window3D(fx + fw * 0.66, fy + 8, fw * 0.19, 16, true, 2);
  const drW = fw * 0.14, drH = 24;
  const drX = fx + fw * 0.43, drY = fy + fh - drH + 2;
  const dr = door3D(drX, drY, drW, drH);
  const pillars = `<rect x="${fx + 6}" y="${fy + 4}" width="6" height="${fh - 8}" fill="${shade('#c9a86a', -14)}" stroke="${OUTLINE}" stroke-width="1.8"/>
    <rect x="${fx + fw - 12}" y="${fy + 4}" width="6" height="${fh - 8}" fill="${shade('#c9a86a', -14)}" stroke="${OUTLINE}" stroke-width="1.8"/>`;
  const sign = signEl(fx + fw * 0.5 - 30, fy + 8, 60, 12, b.emoji, '#fff');
  const lantern = (lx) => `<g>
    <line x1="${lx}" y1="${fy + fh - 36}" x2="${lx}" y2="${fy + fh - 24}" stroke="${OUTLINE}" stroke-width="1.6"/>
    <rect x="${lx - 5}" y="${fy + fh - 24}" width="10" height="11" rx="5" fill="#e8590c" stroke="${OUTLINE}" stroke-width="1.3"/>
    <rect x="${lx - 3}" y="${fy + fh - 27}" width="6" height="3" rx="1.5" fill="#ffd76e" stroke="${OUTLINE}" stroke-width="0.8"/>
    <rect x="${lx - 2}" y="${fy + fh - 13}" width="4" height="2.4" rx="1" fill="#ffd76e"/>
  </g>`;
  const ridgeOrnament = `<circle cx="${W / 2}" cy="${fy - 30}" r="5" fill="#ffd76e" stroke="${OUTLINE}" stroke-width="2"/>`;
  return `${shadow}${faces.side}${faces.front}${faces.top}${roof}${winL}${winR}${dr}${pillars}${sign}${ridgeOrnament}${lantern(fx + fw * 0.36)}${lantern(fx + fw * 0.64)}
    ${careerEmblem(b, W / 2 - 13, fy + 6)}
    ${plantEl(fx + 2, H - 10)}
    <rect x="${fx - 12}" y="${H - 15}" width="${fw + 24}" height="9" rx="4.5" fill="#6fae5e" stroke="${OUTLINE}" stroke-width="1.4" opacity=".9"/>`;
}

function buildingSVG(b) {
    const W = 240, H = 180;
    let body = '';
    CURRENT_UID = String(b.id || 'b').replace(/[^a-zA-Z0-9]/g, '') || 'b';
    if (b.type === 'home') body = houseTemplate(b, W, H);
    else if (b.type === 'public') body = pavilionTemplate(b, W, H);
    else body = towerTemplate(b, W, H);
    return `<svg class="building-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset="1" stop-color="#f4efe2"/>
        </linearGradient>
        <linearGradient id="roofShade-${CURRENT_UID}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
          <stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="1" stop-color="#000000" stop-opacity="0.22"/>
        </linearGradient>
        <linearGradient id="wallShade-${CURRENT_UID}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.3"/>
          <stop offset="0.45" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="1" stop-color="#241830" stop-opacity="0.14"/>
        </linearGradient>
      </defs>
      ${body}
    </svg>`;
  }

  /* ---------- 装饰 ---------- */
  function treeSVG(seed, big = false) {
    const s = big ? 1.25 : 1;
    return `<svg class="decor-svg" viewBox="0 0 64 64" width="${44 * s}" height="${44 * s}">
      <rect x="29" y="34" width="6" height="18" rx="3" fill="${WOOD}" stroke="${OUTLINE}" stroke-width="2.5"/>
      <path d="M29 42 q-4 -3 -4 -8" stroke="${OUTLINE}" stroke-width="2" fill="none" opacity=".4"/>
      <circle cx="32" cy="22" r="15" fill="#7fbf6a" stroke="${OUTLINE}" stroke-width="2.5"/>
      <circle cx="19" cy="30" r="10" fill="#8fcd78" stroke="${OUTLINE}" stroke-width="2.5"/>
      <circle cx="45" cy="30" r="10" fill="#8fcd78" stroke="${OUTLINE}" stroke-width="2.5"/>
      <circle cx="27" cy="18" r="7" fill="#9cdc85" stroke="${OUTLINE}" stroke-width="2"/>
      <path d="M20 18 q2 -8 10 -6" stroke="${OUTLINE}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="22" cy="22" r="2" fill="#ff8a8a" opacity=".8"/>
      <circle cx="40" cy="26" r="2" fill="#ff8a8a" opacity=".8"/>
    </svg>`;
  }
  function flowerSVG(seed) {
    const colors = ['#f7a8b8', '#ffd76e', '#b8a8f7', '#a8d8f7', '#f7b88a'];
    const c = colors[seed % colors.length];
    return `<svg class="decor-svg" viewBox="0 0 44 44" width="30" height="30">
      <path d="M20 22 q-2 8 2 16" stroke="#6aa84f" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="11" cy="34" rx="6" ry="3" fill="#6aa84f" stroke="${OUTLINE}" stroke-width="1.5"/>
      ${[0, 60, 120, 180, 240].map(a => `<ellipse cx="22" cy="14" rx="6" ry="8" fill="${c}" stroke="${OUTLINE}" stroke-width="2" transform="rotate(${a} 22 22)"/>`).join('')}
      <circle cx="22" cy="22" r="5" fill="#ffd76e" stroke="${OUTLINE}" stroke-width="2"/>
      <circle cx="20" cy="19" r="1.5" fill="#fff"/>
    </svg>`;
  }
  function rockSVG() {
    return `<svg class="decor-svg" viewBox="0 0 44 32" width="34" height="26">
      <path d="M7 27 Q4 15 15 10 Q26 5 35 12 Q42 18 37 26 Z" fill="#c9c9d4" stroke="${OUTLINE}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M15 13 q4 -5 11 -2" stroke="#e6e6ee" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M20 24 q8 -6 14 -2" stroke="#e6e6ee" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="18" cy="16" rx="3" ry="1.6" fill="#b3b3c2"/>
    </svg>`;
  }
  function pondSVG() {
    return `<svg class="decor-svg" viewBox="0 0 64 42" width="56" height="38">
      <ellipse cx="32" cy="24" rx="29" ry="15" fill="#9fd4e8" stroke="${OUTLINE}" stroke-width="2.5"/>
      <ellipse cx="32" cy="24" rx="22" ry="10" fill="#b5e2f2" opacity=".6"/>
      <path d="M10 20 q7 -5 14 0 q7 5 14 0" stroke="#e6f7ff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M24 31 q7 -4 14 0" stroke="#e6f7ff" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="20" cy="20" rx="3" ry="2" fill="#8ec9a0" opacity=".7"/>
      <path d="M44 16 q3 -6 8 -3" stroke="#6aa84f" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`;
  }
  function mushroomSVG(seed) {
    const cap = seed % 2 ? '#e88bb0' : '#e8a87c';
    return `<svg class="decor-svg" viewBox="0 0 40 40" width="26" height="26">
      <rect x="15" y="22" width="10" height="15" rx="4" fill="#f2ead8" stroke="${OUTLINE}" stroke-width="2.5"/>
      <path d="M6 25 Q20 6 34 25 Q20 31 6 25 Z" fill="${cap}" stroke="${OUTLINE}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M6 25 Q20 31 34 25" stroke="${OUTLINE}" stroke-width="2" fill="none"/>
      <circle cx="15" cy="20" r="2.4" fill="#fff" stroke="${OUTLINE}" stroke-width="1.5"/>
      <circle cx="24" cy="17" r="2" fill="#fff" stroke="${OUTLINE}" stroke-width="1.5"/>
      <circle cx="19" cy="25" r="1.8" fill="#fff" stroke="${OUTLINE}" stroke-width="1.5"/>
    </svg>`;
  }
  function bushSVG(seed) {
    return `<svg class="decor-svg" viewBox="0 0 48 32" width="38" height="26">
      <circle cx="13" cy="21" r="10" fill="#7fbf6a" stroke="${OUTLINE}" stroke-width="2.5"/>
      <circle cx="26" cy="15" r="11" fill="#8fcd78" stroke="${OUTLINE}" stroke-width="2.5"/>
      <circle cx="37" cy="22" r="9" fill="#7fbf6a" stroke="${OUTLINE}" stroke-width="2.5"/>
      <circle cx="24" cy="13" r="5" fill="#9cdc85" stroke="${OUTLINE}" stroke-width="2"/>
      <circle cx="20" cy="18" r="1.6" fill="#ff8a8a" opacity=".8"/>
      <circle cx="33" cy="18" r="1.6" fill="#ff8a8a" opacity=".8"/>
    </svg>`;
  }

  function decorSVG(d) {
    const seed = hash(d.id || String(d.x) + d.y);
    switch (d.e) {
      case '🌳': case '🌲': return treeSVG(seed, true);
      case '🌸': case '🌼': return flowerSVG(seed);
      case '🪨': return rockSVG();
      case '💧': return pondSVG();
      case '🍄': return mushroomSVG(seed);
      case '🌿': return bushSVG(seed);
      default: return `<span class="decor-emoji">${d.e}</span>`;
    }
  }

  /* ============ 地图小物件（手绘 SVG，替代 emoji） ============ */
  function propSVG(kind, arg = '', seed = 0) {
    const D = '#3a3a4a';
    const shadow = `<ellipse cx="28" cy="40" rx="18" ry="4" fill="rgba(40,30,15,.18)"/>`;
    const COL = ['#e88bb0', '#ffd76e', '#5c7cfa', '#12b886', '#f7a8b8', '#b18cff', '#ff8a3a'];
    switch (kind) {
      case 'bench': return `<svg viewBox="0 0 56 44" width="100%" height="100%">${shadow}
        <path d="M6 24 h44 v9 h-44 Z" fill="#a9714b" stroke="${D}" stroke-width="1.8"/>
        <path d="M8 24 l-3 -7 h46 l-3 7 Z" fill="#c9a86a" stroke="${D}" stroke-width="1.6"/>
        <line x1="14" y1="33" x2="12" y2="41" stroke="#5d4529" stroke-width="3"/>
        <line x1="42" y1="33" x2="44" y2="41" stroke="#5d4529" stroke-width="3"/>
        <line x1="28" y1="17" x2="28" y2="24" stroke="${D}" stroke-width="1.6"/></svg>`;
      case 'mail': return `<svg viewBox="0 0 48 48" width="100%" height="100%">${shadow}
        <rect x="20" y="34" width="4" height="11" fill="#5d4529" stroke="${D}" stroke-width="1.3"/>
        <path d="M13 20 h22 v14 h-22 Z" fill="#4d6fa0" stroke="${D}" stroke-width="1.8"/>
        <path d="M13 20 l11 8 l11 -8" fill="none" stroke="#fff" stroke-width="2"/>
        <path d="M31 10 h10 v6 h-10 Z" fill="#e8590c" stroke="${D}" stroke-width="1.3"/>
        <line x1="31" y1="13" x2="39" y2="13" stroke="#fff" stroke-width="1.2"/></svg>`;
      case 'bike': return `<svg viewBox="0 0 56 44" width="100%" height="100%">${shadow}
        <circle cx="16" cy="30" r="10" fill="none" stroke="#3d3d4d" stroke-width="3"/>
        <circle cx="40" cy="30" r="10" fill="none" stroke="#3d3d4d" stroke-width="3"/>
        <path d="M24 30 h8 l6 -12 h8" fill="none" stroke="#8a93a6" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M27 20 h10 l-4 10" fill="none" stroke="#8a93a6" stroke-width="2.2" stroke-linecap="round"/>
        <rect x="30" y="14" width="13" height="7" rx="3" fill="#5c7cfa" stroke="${D}" stroke-width="1.3"/>
        <circle cx="16" cy="30" r="2" fill="#8a93a6"/><circle cx="40" cy="30" r="2" fill="#8a93a6"/></svg>`;
      case 'trash': return `<svg viewBox="0 0 40 46" width="100%" height="100%">${shadow}
        <path d="M12 12 q-2 -6 3 -8 h10 q5 2 3 8 Z" fill="#8a93a6" stroke="${D}" stroke-width="1.6"/>
        <path d="M13 12 h14 l-2 26 h-10 Z" fill="#aab3c2" stroke="${D}" stroke-width="1.6"/>
        <line x1="12" y1="10" x2="28" y2="10" stroke="${D}" stroke-width="1.8"/></svg>`;
      case 'flower': {
        const c = COL[seed % COL.length];
        return `<svg viewBox="0 0 52 40" width="100%" height="100%">${shadow}
          ${[8, 20, 32, 44].map((x, i) => `<path d="M${x} 38 q0 -10 ${i % 2 ? -3 : 3} -14" stroke="#6aa84f" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="${x + (i % 2 ? -3 : 3)}" cy="22" r="5" fill="${COL[(seed + i) % COL.length]}" stroke="${D}" stroke-width="1.3"/><circle cx="${x + (i % 2 ? -3 : 3)}" cy="22" r="1.8" fill="#ffd76e"/>`).join('')}</svg>`;
      }
      case 'stall': return `<svg viewBox="0 0 64 52" width="100%" height="100%">${shadow}
        <path d="M6 18 q26 -10 52 0 l-4 8 q-22 -8 -44 0 Z" fill="#e88bb0" stroke="${D}" stroke-width="1.8"/>
        <path d="M8 18 l-2 8 q2 1 4 0 Z M16 18 l-2 8 M24 18 l-2 8 M32 18 l-2 8 M40 18 l-2 8 M48 18 l-2 8 M56 18 l-2 8" stroke="#fff" stroke-width="2" opacity=".6"/>
        <rect x="10" y="26" width="44" height="16" fill="#a9714b" stroke="${D}" stroke-width="1.8"/>
        <text x="32" y="38" font-size="14" text-anchor="middle" fill="#fff" font-weight="bold">${arg}</text>
        <line x1="16" y1="42" x2="14" y2="50" stroke="#5d4529" stroke-width="3"/>
        <line x1="48" y1="42" x2="50" y2="50" stroke="#5d4529" stroke-width="3"/></svg>`;
      case 'boat': return `<svg viewBox="0 0 60 30" width="100%" height="100%">
        <path d="M8 16 h44 l-7 10 h-30 Z" fill="#a9714b" stroke="${D}" stroke-width="1.8"/>
        <line x1="14" y1="16" x2="10" y2="24" stroke="#5d4529" stroke-width="2.4"/>
        <line x1="46" y1="16" x2="50" y2="24" stroke="#5d4529" stroke-width="2.4"/>
        <path d="M30 12 v10" stroke="#5d4529" stroke-width="2"/></svg>`;
      case 'reed': return `<svg viewBox="0 0 40 34" width="100%" height="100%">
        ${[10, 20, 30].map(x => `<line x1="${x}" y1="30" x2="${x + (x === 20 ? 3 : -2)}" y2="8" stroke="#7a8a4a" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="${x + (x === 20 ? 3 : -2)}" cy="8" rx="3" ry="6" fill="#8a6a45" stroke="${D}" stroke-width="1.2"/>`).join('')}</svg>`;
      case 'sign': return `<svg viewBox="0 0 44 48" width="100%" height="100%">${shadow}
        <rect x="19" y="30" width="4" height="14" fill="#5d4529" stroke="${D}" stroke-width="1.3"/>
        <path d="M8 12 h26 l3 10 h-32 Z" fill="#c9a86a" stroke="${D}" stroke-width="1.8"/>
        <text x="21" y="20" font-size="9" text-anchor="middle" fill="#4a3b28" font-weight="bold">小镇</text></svg>`;
      case 'traffic': return `<svg viewBox="0 0 32 52" width="100%" height="100%">${shadow}
        <rect x="13" y="34" width="4" height="14" fill="#5d4529" stroke="${D}" stroke-width="1.2"/>
        <rect x="8" y="6" width="16" height="30" rx="4" fill="#3d3d4d" stroke="${D}" stroke-width="1.4"/>
        <circle cx="16" cy="14" r="4" fill="#e8590c" stroke="${D}" stroke-width="1"/>
        <circle cx="16" cy="22" r="4" fill="#f5b544" stroke="${D}" stroke-width="1"/>
        <circle cx="16" cy="30" r="4" fill="#12b886" stroke="${D}" stroke-width="1"/></svg>`;
      case 'grass': return `<svg viewBox="0 0 44 26" width="100%" height="100%">
        ${[8, 22, 36].map((x, i) => `<path d="M${x} 24 q${i % 2 ? -5 : 5} -8 0 -16 q${i % 2 ? 4 : -4} 8 2 16" fill="#7fbf6a" stroke="#4a7a3a" stroke-width="1.2"/>`).join('')}</svg>`;
      case 'swing': return `<svg viewBox="0 0 44 40" width="100%" height="100%">${shadow}
        <path d="M10 6 h24" stroke="#5d4529" stroke-width="2.4" stroke-linecap="round"/>
        <line x1="14" y1="6" x2="10" y2="30" stroke="#5d4529" stroke-width="2.4"/>
        <line x1="30" y1="6" x2="34" y2="30" stroke="#5d4529" stroke-width="2.4"/>
        <path d="M8 30 h28 v6 h-28 Z" fill="#a9714b" stroke="${D}" stroke-width="1.6"/></svg>`;
      case 'rack': return `<svg viewBox="0 0 46 38" width="100%" height="100%">${shadow}
        <line x1="6" y1="10" x2="40" y2="10" stroke="#8a93a6" stroke-width="2.4" stroke-linecap="round"/>
        <line x1="10" y1="10" x2="8" y2="34" stroke="#8a93a6" stroke-width="2"/>
        <line x1="36" y1="10" x2="38" y2="34" stroke="#8a93a6" stroke-width="2"/>
        <path d="M12 12 q-2 -6 4 -6 q5 0 4 6 q-2 -3 -8 -3 Z M20 12 q-2 -6 4 -6 q5 0 4 6 q-2 -3 -8 -3 Z M28 12 q-2 -6 4 -6 q5 0 4 6 q-2 -3 -8 -3 Z" fill="#5c7cfa" stroke="${D}" stroke-width="1.2"/></svg>`;
      case 'cloud': return `<svg viewBox="0 0 120 50" width="100%" height="100%">
        <ellipse cx="40" cy="30" rx="28" ry="14" fill="#ffffff" opacity=".5"/>
        <ellipse cx="68" cy="24" rx="26" ry="13" fill="#ffffff" opacity=".42"/>
        <ellipse cx="92" cy="32" rx="22" ry="11" fill="#ffffff" opacity=".36"/></svg>`;
      default: return null;
    }
  }

/* ============ 3D 家具库 v3（娃娃屋透视家具） ============ */
const DARK = '#3a3a4a';
const WOODS = ['#a9714b', '#b98a5c', '#8a6a45', '#c9a86a', '#9d7a52'];
const FABS = ['#7c8fa8', '#8fa6c2', '#a88aa0', '#9aa88a', '#c2a08a'];

function box3D(x, y, w, h, d, color, edge = '#3a3a4a') {
  return `
    <path d="M${x} ${y} L${x + d} ${y - d} L${x + w + d} ${y - d} L${x + w} ${y} Z" fill="${shade(color, 30)}" stroke="${edge}" stroke-width="1.2" stroke-linejoin="round"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" stroke="${edge}" stroke-width="1.2"/>
    <path d="M${x + w} ${y} L${x + w + d} ${y - d} L${x + w + d} ${y + h - d} L${x + w} ${y + h} Z" fill="${shade(color, -30)}" stroke="${edge}" stroke-width="1.2" stroke-linejoin="round"/>`;
}

function legs(x1, y1, x2, y2, color = '#5d4529') {
  return `<line x1="${x1}" y1="${y1}" x2="${x1}" y2="${y2}" stroke="${color}" stroke-width="3.4" stroke-linecap="round"/><line x1="${x2}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="3.4" stroke-linecap="round"/>`;
}
function shadow(x, y, rx, ry = rx * 0.24, op = 0.2) {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="rgba(35,25,12,${op})"/>`;
}
function booksRow(x, y, w, h, seed) {
  const cols = ['#e88bb0', '#5c7cfa', '#12b886', '#f5b544', '#e8590c', '#7048e8', '#15aabf', '#fa5252'];
  let s = '';
  let cx = x + 2;
  let i = 0;
  while (cx < x + w - 3 && i < 14) {
    const bw = 4 + ((seed + i * 3) % 5);
    const bh = h - ((seed + i) % 4);
    s += `<rect x="${cx}" y="${y + h - bh}" width="${bw}" height="${bh}" rx="1" fill="${cols[(seed + i) % cols.length]}" stroke="${DARK}" stroke-width="0.7"/>`;
    cx += bw + 1.2; i++;
  }
  return s;
}
function potPlant(x, y, s = 1, seed = 0) {
  return `${box3D(x, y, 22 * s, 16 * s, 7 * s, '#b0714a')}
    <path d="M${x + 11 * s} ${y - 2 * s} q-9 ${-16 * s} -2 ${-24 * s} q7 ${8 * s} 2 ${24 * s} Z" fill="#7fbf6a" stroke="${DARK}" stroke-width="1.1"/>
    <path d="M${x + 14 * s} ${y - 4 * s} q6 ${-14 * s} 12 ${-20 * s} q2 ${10 * s} -6 ${20 * s} Z" fill="#8fcd78" stroke="${DARK}" stroke-width="1"/>
    <circle cx="${x + 9 * s}" cy="${y - 20 * s}" r="${4.4 * s}" fill="#9cdc85" stroke="${DARK}" stroke-width="1"/>
    <circle cx="${x + 17 * s}" cy="${y - 16 * s}" r="${3.4 * s}" fill="#8fcd78" stroke="${DARK}" stroke-width="1"/>`;
}
function monitor(x, y, w, h, seed = 0) {
  return `${box3D(x + 4, y + h - 6, w - 8, 6, 4, '#4a4a5a')}
    <path d="M${x + w / 2 - 3} ${y + h - 6} L${x + w / 2 - 2} ${y + h + 4} L${x + w / 2 + 2} ${y + h + 4} L${x + w / 2 + 3} ${y + h - 6} Z" fill="#6a7a96" stroke="${DARK}" stroke-width="1"/>
    <rect x="${x + 2}" y="${y}" width="${w - 4}" height="${h - 8}" rx="3" fill="#1c2438" stroke="${DARK}" stroke-width="1.4"/>
    <rect x="${x + 5}" y="${y + 3}" width="${w - 10}" height="${h - 14}" rx="1.5" fill="#3a5b8a"/>
    <path d="M${x + 7} ${y + h - 12} q${(w - 14) * 0.2} -${(h - 16) * 0.45} ${(w - 14) * 0.4} -${(h - 16) * 0.3} q${(w - 14) * 0.15} ${(h - 16) * 0.16} ${(w - 14) * 0.3} -${(h - 16) * 0.2}" fill="none" stroke="#fff" stroke-width="1.8" opacity=".6" stroke-linecap="round"/>
    <rect x="${x + 3}" y="${y - 1}" width="${w - 6}" height="3" rx="1.5" fill="#cfd6e4" opacity=".5"/>`;
}

function tableSVG(seed = 0, wide = false) {
  const W = 100, H = 92;
  const wood = WOODS[seed % WOODS.length];
  const w = wide ? 88 : 64;
  const x = (100 - w) / 2;
  const contact = shadow(50, 84, w / 2 + 6, 6, 0.22);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
    ${box3D(x, 60, w, 12, 14, wood)}
    ${legs(x + 8, 72, x + w - 8, 72, '#5d4529')}
    <path d="M${x + 8} 72 h${w - 16} M${x + 8} 80 h${w - 16}" stroke="#5d4529" stroke-width="2.6" stroke-linecap="round"/>
    <rect x="${x + 8}" y="52" width="10" height="7" rx="2" fill="#fff" stroke="#cfd6e4" stroke-width="1"/>
    <rect x="${x + w - 18}" y="52" width="10" height="7" rx="2" fill="#fff" stroke="#cfd6e4" stroke-width="1"/></svg>`;
}
function benchSVG(seed = 0) {
  const W = 100, H = 92;
  const wood = WOODS[seed % WOODS.length];
  const contact = shadow(50, 84, 34, 6, 0.22);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
    ${box3D(10, 62, 80, 12, 12, wood)}
    <path d="M12 62 l-3 -10 h82 l-3 10 Z" fill="${shade(wood, 22)}" stroke="${DARK}" stroke-width="1.2"/>
    <path d="M14 52 l14 -8 h44 l14 8 Z" fill="${shade(wood, 8)}" stroke="${DARK}" stroke-width="1.2"/>
    ${legs(18, 74, 82, 74, '#5d4529')}
    <line x1="22" y1="74" x2="18" y2="84" stroke="#5d4529" stroke-width="3"/>
    <line x1="78" y1="74" x2="82" y2="84" stroke="#5d4529" stroke-width="3"/></svg>`;
}
function fridgeSVG(seed = 0) {
  const W = 100, H = 92;
  const contact = shadow(50, 84, 26, 6, 0.22);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
    ${box3D(30, 16, 42, 68, 12, '#eef2f8')}
    <line x1="32" y1="50" x2="70" y2="50" stroke="${DARK}" stroke-width="1.3"/>
    <rect x="58" y="30" width="5" height="8" rx="2" fill="#8a93a6"/>
    <rect x="58" y="58" width="5" height="8" rx="2" fill="#8a93a6"/>
    <rect x="34" y="20" width="10" height="8" fill="#9fd0f7" opacity=".5"/>
    <rect x="34" y="54" width="12" height="12" rx="1" fill="#b8e4d8" opacity=".7"/></svg>`;
}
function wardrobeSVG(seed = 0) {
  const W = 100, H = 92;
  const wood = WOODS[seed % WOODS.length];
  const contact = shadow(50, 84, 28, 6, 0.22);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
    ${box3D(26, 18, 48, 66, 12, wood)}
    <line x1="50" y1="18" x2="50" y2="84" stroke="${DARK}" stroke-width="1.3"/>
    <rect x="44" y="42" width="6" height="8" rx="2" fill="#ffd76e" stroke="${DARK}" stroke-width="0.9"/>
    <path d="M32 30 q6 -6 12 0 M32 60 q6 -6 12 0 M56 30 q6 6 12 0 M56 60 q6 6 12 0" stroke="#fff" stroke-width="2.4" fill="none" opacity=".8" stroke-linecap="round"/></svg>`;
}
function nightstandSVG(seed = 0) {
  const W = 100, H = 92;
  const wood = WOODS[seed % WOODS.length];
  const contact = shadow(50, 84, 20, 5, 0.2);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
    ${box3D(34, 50, 34, 34, 10, wood)}
    <rect x="40" y="58" width="22" height="4" rx="2" fill="${shade(wood, -14)}"/>
    <circle cx="51" cy="72" r="2" fill="#ffd76e" stroke="${DARK}" stroke-width="0.9"/>
    <path d="M40 34 h22 v10 h-22 Z" fill="#ffd76e" opacity=".9" stroke="${DARK}" stroke-width="1"/>
    <path d="M46 32 q2 -6 8 -4" stroke="#fff" stroke-width="1.6" fill="none" opacity=".8"/></svg>`;
}
function furnSVG(e, seed = 0, label = '') {
  const W = 100, H = 92;
  const contact = shadow(50, 84, 33, 6, 0.22);
  const wood = WOODS[seed % WOODS.length];
  const fab = FABS[(seed >> 2) % FABS.length];
  const L = String(label || '');
  if (e === '🪑') {
    if (/长椅|沙发座|卡座/.test(L)) return benchSVG(seed);
    if (/桌|台|床/.test(L)) return tableSVG(seed, /会议|餐桌|大桌|讨论/.test(L));
  }
  if (e === '🗄️') {
    if (/冰箱/.test(L)) return fridgeSVG(seed);
    if (/衣柜/.test(L)) return wardrobeSVG(seed);
    if (/床头柜/.test(L)) return nightstandSVG(seed);
  }
  switch (e) {
    case '🖥️': case '⌨️': {
      const desk = wood;
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(8, 64, 84, 14, 13, desk)}
        ${legs(14, 78, 86, 78, '#5d4529')}
        ${monitor(30, 26, 36, 32, seed)}
        <rect x="16" y="80" width="52" height="5" rx="2.5" fill="#6a7a96" stroke="${DARK}" stroke-width="1"/>
        <rect x="72" y="72" width="12" height="10" rx="2" fill="#e8a0a0" stroke="${DARK}" stroke-width="1"/>
        <rect x="22" y="70" width="8" height="6" rx="1" fill="#fff" stroke="#cfd4e0" stroke-width="0.8"/></svg>`;
    }
    case '🛏️': {
      const bed = wood;
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(10, 58, 80, 20, 13, bed)}
        ${box3D(14, 30, 72, 14, 9, shade(bed, -18))}
        <rect x="8" y="48" width="84" height="18" rx="4" fill="#f4efe4" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="14" y="40" width="30" height="12" rx="5" fill="#fff" stroke="#cfd4e0" stroke-width="1"/>
        <rect x="48" y="42" width="38" height="12" rx="4" fill="#e8a87c" stroke="${DARK}" stroke-width="1"/>
        <path d="M52 48 h30 M52 52 h30" stroke="#fff" stroke-width="1.6" opacity=".5"/>
        ${legs(16, 78, 84, 78, '#5d4529')}</svg>`;
    }
    case '🪑': {
      const c = wood;
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(30, 38, 42, 30, 9, shade(c, -16))}
        <path d="M34 38 l-4 -10 h44 l-4 10 Z" fill="${shade(c, -6)}" stroke="${DARK}" stroke-width="1.2"/>
        ${box3D(26, 66, 50, 11, 9, c)}
        ${legs(32, 77, 70, 77, '#5d4529')}
        <rect x="28" y="50" width="44" height="16" rx="3" fill="${shade(c, 18)}" opacity=".25"/></svg>`;
    }
    case '🛋️': {
      const f = fab;
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(8, 62, 84, 18, 13, shade(f, -14))}
        ${box3D(12, 38, 30, 24, 8, f)}
        ${box3D(58, 38, 30, 24, 8, f)}
        ${box3D(40, 44, 20, 22, 10, shade(f, 8))}
        <rect x="16" y="36" width="22" height="8" rx="4" fill="${shade(f, 22)}" stroke="${DARK}" stroke-width="1"/>
        <rect x="62" y="36" width="22" height="8" rx="4" fill="${shade(f, 22)}" stroke="${DARK}" stroke-width="1"/>
        <rect x="44" y="42" width="12" height="7" rx="3" fill="${shade(f, 26)}" stroke="${DARK}" stroke-width="0.9"/>
        ${legs(16, 80, 84, 80, '#5d4529')}</svg>`;
    }
    case '📋': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <rect x="16" y="16" width="68" height="50" rx="3" fill="#f6f8fc" stroke="${DARK}" stroke-width="1.6"/>
        <rect x="12" y="12" width="76" height="58" rx="4" fill="none" stroke="#8a93a6" stroke-width="2.4"/>
        <line x1="22" y1="28" x2="66" y2="28" stroke="#e8a0a0" stroke-width="2.4" stroke-linecap="round"/>
        <line x1="22" y1="36" x2="58" y2="36" stroke="#9fc6ff" stroke-width="2.4" stroke-linecap="round"/>
        <line x1="22" y1="44" x2="62" y2="44" stroke="#12b886" stroke-width="2.4" stroke-linecap="round"/>
        <rect x="22" y="52" width="26" height="8" rx="2" fill="#f5b544" opacity=".7"/>
        ${legs(26, 68, 74, 68, '#5d4529')}
        <line x1="26" y1="66" x2="22" y2="82" stroke="#5d4529" stroke-width="3"/>
        <line x1="74" y1="66" x2="78" y2="82" stroke="#5d4529" stroke-width="3"/></svg>`;
    }
    case '🗄️': {
      const c = seed % 2 ? '#8a93a6' : shade(wood, 6);
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(28, 22, 48, 60, 12, c)}
        <line x1="30" y1="42" x2="74" y2="42" stroke="${DARK}" stroke-width="1.4"/>
        <line x1="30" y1="62" x2="74" y2="62" stroke="${DARK}" stroke-width="1.4"/>
        <rect x="36" y="27" width="32" height="4" rx="2" fill="${shade(c, -18)}"/>
        <rect x="36" y="47" width="32" height="4" rx="2" fill="${shade(c, -18)}"/>
        <rect x="36" y="67" width="32" height="4" rx="2" fill="${shade(c, -18)}"/>
        <rect x="64" y="25" width="5" height="7" rx="2" fill="#ffd76e" stroke="${DARK}" stroke-width="0.9"/>
        <rect x="64" y="45" width="5" height="7" rx="2" fill="#ffd76e" stroke="${DARK}" stroke-width="0.9"/>
        <rect x="64" y="65" width="5" height="7" rx="2" fill="#ffd76e" stroke="${DARK}" stroke-width="0.9"/></svg>`;
    }
    case '📚': {
      const c = wood;
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(12, 18, 76, 64, 12, c)}
        ${[0, 1, 2].map(i => `<line x1="14" y1="${40 + i * 20}" x2="86" y2="${40 + i * 20}" stroke="${DARK}" stroke-width="1.3"/>`).join('')}
        ${booksRow(15, 20, 70, 18, seed)}
        ${booksRow(15, 40, 70, 18, seed + 3)}
        ${booksRow(15, 60, 70, 18, seed + 7)}
        <rect x="18" y="12" width="14" height="6" rx="1.5" fill="#e88bb0" stroke="${DARK}" stroke-width="0.8"/>
        <rect x="34" y="10" width="12" height="8" rx="1.5" fill="#5c7cfa" stroke="${DARK}" stroke-width="0.8"/></svg>`;
    }
    case '🚰': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(30, 36, 40, 46, 12, '#eef2f8')}
        <rect x="38" y="12" width="24" height="24" rx="7" fill="#9fd0f7" stroke="${DARK}" stroke-width="1.4"/>
        <path d="M42 20 q2 -5 7 -3" stroke="#fff" stroke-width="1.8" fill="none" opacity=".8"/>
        <path d="M48 12 q-1 -5 2 -8" stroke="#7fa8cc" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <rect x="28" y="62" width="10" height="6" rx="3" fill="#4a5a7a" stroke="${DARK}" stroke-width="1"/>
        <rect x="62" y="62" width="10" height="6" rx="3" fill="#4a5a7a" stroke="${DARK}" stroke-width="1"/>
        <line x1="50" y1="60" x2="50" y2="74" stroke="${DARK}" stroke-width="1.6"/></svg>`;
    }
    case '🍳': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(6, 60, 88, 20, 12, '#e8e0cc')}
        ${[22, 46, 70].map(i => `<circle cx="${i}" cy="52" r="7" fill="#3d3d4d" stroke="${DARK}" stroke-width="1.1"/><circle cx="${i}" cy="52" r="3.2" fill="#e8590c"/>`).join('')}
        <rect x="12" y="82" width="22" height="7" rx="3" fill="#8fa6c2" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="70" y="82" width="18" height="7" rx="3" fill="#8fa6c2" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M16 52 q-2 -8 4 -10" stroke="#b0b8c6" stroke-width="3" fill="none" stroke-linecap="round"/>
        <rect x="60" y="46" width="18" height="8" rx="4" fill="#4a5a7a" stroke="${DARK}" stroke-width="1"/></svg>`;
    }
    case '📺': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(36, 68, 30, 12, 9, wood)}
        <rect x="38" y="70" width="8" height="10" fill="#5d4529" stroke="${DARK}" stroke-width="1"/>
        <rect x="60" y="70" width="8" height="10" fill="#5d4529" stroke="${DARK}" stroke-width="1"/>
        ${box3D(14, 20, 74, 48, 10, '#1c2438')}
        <rect x="19" y="24" width="64" height="40" rx="2" fill="#274060"/>
        <path d="M20 46 q16 -22 34 -12 q18 10 28 -12 v38 h-62 Z" fill="#fff" opacity=".16"/>
        <rect x="24" y="62" width="48" height="3" rx="1.5" fill="#ff6b6b" opacity=".8"/></svg>`;
    }
    case '🧪': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(6, 64, 88, 16, 12, shade(wood, 4))}
        <path d="M20 30 l6 16 v20 h12 v-20 l6 -16 Z" fill="#b8e4d8" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="16" y="26" width="20" height="7" rx="2" fill="#cfd6e4" stroke="${DARK}" stroke-width="1"/>
        <path d="M52 22 h24 l-5 14 h-14 Z" fill="#e88bb0" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M56 22 l4 10" stroke="#fff" stroke-width="2" opacity=".5"/>
        <rect x="62" y="48" width="12" height="14" rx="2" fill="#f5b544" stroke="${DARK}" stroke-width="1"/>
        <rect x="48" y="70" width="8" height="8" fill="#5c7cfa" stroke="${DARK}" stroke-width="0.9"/></svg>`;
    }
    case '🏋️': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(8, 62, 84, 16, 11, '#5a6a7a')}
        <line x1="18" y1="50" x2="82" y2="50" stroke="#8a93a6" stroke-width="5" stroke-linecap="round"/>
        <rect x="10" y="43" width="12" height="15" rx="2.5" fill="#3d3d4d" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="24" y="45" width="8" height="11" rx="2" fill="#3d3d4d" stroke="${DARK}" stroke-width="1.1"/>
        <rect x="68" y="45" width="8" height="11" rx="2" fill="#3d3d4d" stroke="${DARK}" stroke-width="1.1"/>
        <rect x="78" y="43" width="12" height="15" rx="2.5" fill="#3d3d4d" stroke="${DARK}" stroke-width="1.2"/>
        <line x1="30" y1="36" x2="70" y2="36" stroke="#8a93a6" stroke-width="4" stroke-linecap="round"/>
        <rect x="24" y="30" width="10" height="13" rx="2" fill="#3d3d4d" stroke="${DARK}" stroke-width="1.1"/>
        <rect x="66" y="30" width="10" height="13" rx="2" fill="#3d3d4d" stroke="${DARK}" stroke-width="1.1"/></svg>`;
    }
    case '🎤': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <ellipse cx="50" cy="80" rx="14" ry="4" fill="#4a4a5a" stroke="${DARK}" stroke-width="1"/>
        <line x1="50" y1="80" x2="50" y2="30" stroke="#8a93a6" stroke-width="4" stroke-linecap="round"/>
        <line x1="50" y1="52" x2="34" y2="64" stroke="#8a93a6" stroke-width="3.4" stroke-linecap="round"/>
        <ellipse cx="32" cy="62" rx="6" ry="9" fill="#3a3a4a" stroke="${DARK}" stroke-width="1.3"/>
        <rect x="27" y="54" width="10" height="4" rx="2" fill="#8a93a6"/>
        <path d="M46 24 h8 l-2 8 h-4 Z" fill="#5c7cfa" stroke="${DARK}" stroke-width="1"/></svg>`;
    }
    case '💡': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <ellipse cx="50" cy="82" rx="14" ry="4" fill="#4a4a5a" stroke="${DARK}" stroke-width="1"/>
        <line x1="50" y1="82" x2="50" y2="60" stroke="#8a93a6" stroke-width="3.6" stroke-linecap="round"/>
        <line x1="50" y1="62" x2="32" y2="38" stroke="#8a93a6" stroke-width="3.6" stroke-linecap="round"/>
        <path d="M18 40 h26 l-7 14 h-12 Z" fill="#ffd76e" stroke="${DARK}" stroke-width="1.4"/>
        <ellipse cx="31" cy="48" rx="9" ry="6" fill="#ffe9a8" opacity=".65"/></svg>`;
    }
    case '🪴': return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}${potPlant(38, 60, 1, seed)}</svg>`;
    case '🖨️': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(18, 48, 64, 32, 13, '#f4efe2')}
        <rect x="24" y="28" width="28" height="18" rx="3" fill="#eef2f8" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="28" y="32" width="20" height="10" rx="1.5" fill="#fff" stroke="#cfd6e4" stroke-width="1"/>
        <rect x="54" y="30" width="12" height="16" rx="2" fill="#5c7cfa" stroke="${DARK}" stroke-width="1.1"/>
        <rect x="24" y="66" width="22" height="8" rx="2" fill="#f5b544" opacity=".8"/>
        <circle cx="72" cy="58" r="3" fill="#12b886"/>
        <circle cx="72" cy="70" r="3" fill="#fa5252"/></svg>`;
    }

    case '☕': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(24, 44, 52, 38, 12, '#8a93a6')}
        <rect x="30" y="22" width="40" height="20" rx="4" fill="#eef2f8" stroke="${DARK}" stroke-width="1.3"/>
        <path d="M34 30 q3 -6 9 -4" stroke="#fff" stroke-width="2" fill="none" opacity=".85"/>
        <path d="M40 22 q-1 -6 3 -9" stroke="#b0b8c6" stroke-width="2.6" fill="none" stroke-linecap="round"/>
        <rect x="36" y="74" width="10" height="6" rx="3" fill="#4a5a7a" stroke="${DARK}" stroke-width="1"/>
        <rect x="56" y="74" width="10" height="6" rx="3" fill="#4a5a7a" stroke="${DARK}" stroke-width="1"/>
        <path d="M70 34 q6 -2 6 -8 q0 -5 -6 -6" fill="none" stroke="#8a93a6" stroke-width="2.4"/></svg>`;
    }
    case '📊': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(14, 24, 72, 44, 10, '#1c2438')}
        <rect x="19" y="28" width="62" height="36" rx="2" fill="#22314f"/>
        <rect x="24" y="48" width="9" height="14" fill="#f5b544"/>
        <rect x="36" y="40" width="9" height="22" fill="#5c7cfa"/>
        <rect x="48" y="34" width="9" height="28" fill="#12b886"/>
        <rect x="60" y="44" width="9" height="18" fill="#fa5252"/>
        <path d="M24 56 h50" stroke="#fff" stroke-width="1" opacity=".25"/>
        ${box3D(34, 68, 32, 10, 8, '#4a4a5a')}</svg>`;
    }
    case '💉': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(22, 48, 56, 34, 12, '#f4efe2')}
        <rect x="28" y="38" width="44" height="12" rx="3" fill="#eef2f8" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="34" y="42" width="32" height="5" rx="2.5" fill="#fff" stroke="#cfd6e4" stroke-width="0.9"/>
        <path d="M28 60 h44 M28 72 h44" stroke="#cfd6e4" stroke-width="1.4"/>
        <rect x="64" y="58" width="6" height="14" rx="3" fill="#ff8a8a" stroke="${DARK}" stroke-width="1"/>
        <circle cx="24" cy="70" r="4" fill="#5c7cfa" stroke="${DARK}" stroke-width="1"/></svg>`;
    }
    case '🏥': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(10, 62, 80, 18, 13, '#f4efe2')}
        ${box3D(30, 36, 40, 26, 10, '#9fd0c0')}
        <rect x="36" y="44" width="10" height="12" fill="#fff" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="54" y="44" width="10" height="12" fill="#fff" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="14" y="72" width="30" height="6" rx="3" fill="#fff" stroke="#cfd6e4" stroke-width="1"/>
        <path d="M52 70 h20 v8 h-20 Z" fill="#f5b544" stroke="${DARK}" stroke-width="1"/></svg>`;
    }
    case '🚑': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(12, 56, 76, 22, 12, '#eef2f8')}
        <rect x="18" y="44" width="64" height="14" rx="4" fill="#fff" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="24" y="48" width="52" height="6" rx="3" fill="#f5f7fa" stroke="#cfd6e4" stroke-width="0.9"/>
        <rect x="40" y="36" width="10" height="12" fill="#ff8a8a" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="43" y="39" width="4" height="6" fill="#fff"/>
        <rect x="46" y="36" width="10" height="12" fill="#fff" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="49" y="39" width="4" height="6" fill="#ff8a8a"/>
        <line x1="84" y1="40" x2="84" y2="20" stroke="#8a93a6" stroke-width="2.6"/>
        <path d="M80 22 h8 l-2 6 h-4 Z" fill="#5c7cfa" stroke="${DARK}" stroke-width="1"/></svg>`;
    }
    case '⚖️': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(34, 72, 32, 10, 8, wood)}
        <line x1="50" y1="72" x2="50" y2="30" stroke="#8a93a6" stroke-width="4" stroke-linecap="round"/>
        <path d="M28 34 h44 l-4 6 h-36 Z" fill="#cfd6e4" stroke="${DARK}" stroke-width="1.3"/>
        <path d="M30 40 q-6 10 -2 20 q6 2 10 -4 q-2 -12 2 -18 Z" fill="#f5b544" stroke="${DARK}" stroke-width="1.1"/>
        <path d="M70 40 q6 10 2 20 q-6 2 -10 -4 q2 -12 -2 -18 Z" fill="#f5b544" stroke="${DARK}" stroke-width="1.1"/>
        <rect x="46" y="24" width="8" height="7" rx="2" fill="#ffd76e" stroke="${DARK}" stroke-width="1"/></svg>`;
    }
    case '🏛️': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(8, 62, 84, 18, 13, wood)}
        <rect x="12" y="72" width="20" height="6" rx="2" fill="#fff" stroke="#cfd6e4" stroke-width="1"/>
        <rect x="70" y="72" width="18" height="6" rx="2" fill="#fff" stroke="#cfd6e4" stroke-width="1"/>
        <rect x="34" y="38" width="32" height="24" rx="3" fill="#f4efe2" stroke="${DARK}" stroke-width="1.3"/>
        <path d="M34 44 h32 M34 52 h32" stroke="#cfd6e4" stroke-width="1.2"/>
        <rect x="38" y="30" width="24" height="8" rx="2" fill="#c9a86a" stroke="${DARK}" stroke-width="1"/>
        <path d="M42 32 h16" stroke="#fff" stroke-width="1.4"/></svg>`;
    }
    case '📷': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <line x1="40" y1="82" x2="32" y2="58" stroke="#5d4529" stroke-width="3.2" stroke-linecap="round"/>
        <line x1="60" y1="82" x2="68" y2="58" stroke="#5d4529" stroke-width="3.2" stroke-linecap="round"/>
        <line x1="50" y1="80" x2="50" y2="58" stroke="#5d4529" stroke-width="3" stroke-linecap="round"/>
        ${box3D(28, 34, 44, 24, 10, '#3d3d4d')}
        <rect x="34" y="38" width="14" height="14" rx="2" fill="#22314f" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="52" y="42" width="10" height="9" rx="2" fill="#5c7cfa" stroke="${DARK}" stroke-width="1"/>
        <circle cx="64" cy="46" r="3" fill="#9fd0f7"/></svg>`;
    }
    case '🎙️': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <line x1="22" y1="82" x2="22" y2="40" stroke="#5d4529" stroke-width="3.4" stroke-linecap="round"/>
        <line x1="22" y1="48" x2="66" y2="30" stroke="#5d4529" stroke-width="3" stroke-linecap="round"/>
        <circle cx="70" cy="28" r="7" fill="#3a3a4a" stroke="${DARK}" stroke-width="1.3"/>
        <circle cx="70" cy="28" r="3" fill="#8a93a6"/>
        <rect x="64" y="38" width="12" height="16" rx="2" fill="#5c7cfa" stroke="${DARK}" stroke-width="1"/></svg>`;
    }
    case '📰': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(18, 34, 64, 44, 11, wood)}
        <line x1="20" y1="52" x2="80" y2="52" stroke="${DARK}" stroke-width="1.3"/>
        <rect x="24" y="40" width="18" height="11" rx="1" fill="#fff" stroke="#cfd6e4" stroke-width="1"/>
        <line x1="27" y1="44" x2="39" y2="44" stroke="#9aa4b8" stroke-width="1.2"/>
        <line x1="27" y1="47" x2="37" y2="47" stroke="#9aa4b8" stroke-width="1.2"/>
        <rect x="46" y="40" width="16" height="11" rx="1" fill="#f5f7fa" stroke="#cfd6e4" stroke-width="1"/>
        <line x1="49" y1="44" x2="59" y2="44" stroke="#c9a86a" stroke-width="1.4"/>
        <rect x="24" y="57" width="34" height="10" rx="1" fill="#fbf6ea" stroke="#e0cd9c" stroke-width="1"/>
        <line x1="28" y1="61" x2="54" y2="61" stroke="#c9a86a" stroke-width="1.2"/></svg>`;
    }
    case '🚔': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(16, 54, 68, 22, 12, '#3d5a80')}
        <rect x="20" y="40" width="60" height="14" rx="4" fill="#4d6fa0" stroke="${DARK}" stroke-width="1.3"/>
        <rect x="26" y="44" width="14" height="8" rx="2" fill="#9fd0f7" stroke="${DARK}" stroke-width="1"/>
        <rect x="62" y="44" width="12" height="8" rx="2" fill="#9fd0f7" stroke="${DARK}" stroke-width="1"/>
        <rect x="44" y="36" width="10" height="8" rx="2" fill="#ffd76e" stroke="${DARK}" stroke-width="1.2"/>
        <circle cx="26" cy="78" r="5" fill="#3d3d4d" stroke="${DARK}" stroke-width="1.1"/>
        <circle cx="72" cy="78" r="5" fill="#3d3d4d" stroke="${DARK}" stroke-width="1.1"/></svg>`;
    }
    case '📞': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(26, 58, 48, 22, 10, '#8a93a6')}
        <rect x="32" y="50" width="16" height="10" rx="3" fill="#3d3d4d" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M22 52 q-6 -14 4 -22 q16 -10 30 -2 q10 8 4 22 l-10 -2 q4 -9 -4 -12 q-12 -5 -20 2 q-8 7 -4 14 Z" fill="#4a4a5a" stroke="${DARK}" stroke-width="1.3"/>
        <rect x="44" y="54" width="12" height="7" rx="3" fill="#ffd76e" opacity=".85"/></svg>`;
    }
    case '🫖': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(30, 58, 40, 24, 10, '#c9a86a')}
        <path d="M34 40 q18 -18 38 -4 q-2 14 -14 14 q-8 0 -12 -6 q-4 8 -12 6 q-8 -2 -10 -10 Z" fill="#b98a5c" stroke="${DARK}" stroke-width="1.3"/>
        <path d="M70 42 q10 2 8 12 q-2 8 -10 8" fill="none" stroke="#c9a86a" stroke-width="3.4" stroke-linecap="round"/>
        <path d="M28 46 q-8 4 -6 12" fill="none" stroke="#c9a86a" stroke-width="3.4" stroke-linecap="round"/>
        <ellipse cx="50" cy="38" rx="14" ry="5" fill="#e8c98a" stroke="${DARK}" stroke-width="1"/></svg>`;
    }
    case '🥐': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(12, 52, 76, 26, 12, '#8a6a45')}
        <rect x="16" y="40" width="68" height="14" rx="3" fill="#d8e4f0" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M20 42 q6 -6 14 -2 q8 5 16 -1 q8 -6 16 0 q8 5 14 -1" stroke="#fff" stroke-width="1.4" fill="none" opacity=".7"/>
        <path d="M22 38 q2 -5 8 -3" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/>
        <path d="M30 36 q5 -9 12 -7 q8 3 14 -3 q6 -5 12 0" fill="#e8b26a" stroke="${DARK}" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M34 34 q3 -4 7 -2 M50 30 q3 -4 7 -2 M60 34 q3 -4 7 -2" stroke="#fff" stroke-width="1.6" fill="none" opacity=".8"/></svg>`;
    }
    case '🎸': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <line x1="44" y1="84" x2="52" y2="46" stroke="#5d4529" stroke-width="3" stroke-linecap="round"/>
        <path d="M38 22 q0 -8 8 -6 q6 2 4 10 l4 26 q-10 14 -22 8 q-4 -10 6 -20 Z" fill="#e8a87c" stroke="${DARK}" stroke-width="1.4"/>
        <circle cx="48" cy="36" r="4" fill="#3d3d4d"/>
        <line x1="46" y1="20" x2="48" y2="36" stroke="#c9a86a" stroke-width="2.4"/>
        <line x1="52" y1="18" x2="51" y2="36" stroke="#c9a86a" stroke-width="2.4"/></svg>`;
    }
    case '🌾': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(36, 66, 28, 16, 9, '#c9a86a')}
        ${[0, 1, 2, 3, 4].map(i => `<path d="M44 ${66 - i * 2} q-${14 - i * 2} ${-20 + i * 3} ${-20 + i * 3} ${-30 + i * 3} q${16 - i * 2} ${6 + i * 2} ${24 - i * 2} ${26 - i * 3}" fill="#e8c26a" stroke="#a9714b" stroke-width="1.1" opacity="${0.95 - i * 0.12}"/>`).join('')}
        <path d="M44 66 q14 -22 28 -26 q2 14 -6 26 Z" fill="#e8c26a" stroke="#a9714b" stroke-width="1.1"/></svg>`;
    }
    case '🧺': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <path d="M18 58 q-4 -18 6 -26 h52 q10 8 6 26 Z" fill="#c9a86a" stroke="${DARK}" stroke-width="1.4"/>
        <path d="M24 58 q0 -14 8 -22 M76 58 q0 -14 -8 -22" stroke="#a9714b" stroke-width="2.4" fill="none"/>
        <path d="M26 40 q6 -8 14 -4 M70 40 q-6 -8 -14 -4" stroke="${DARK}" stroke-width="2" fill="none" opacity=".5"/>
        <ellipse cx="50" cy="34" rx="26" ry="7" fill="#b98a5c" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M40 28 q4 -8 10 -6 M60 30 q-2 -8 -8 -7" stroke="#7fbf6a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <ellipse cx="50" cy="56" rx="22" ry="6" fill="#a9714b" opacity=".4"/></svg>`;
    }
    case '🌱': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(12, 56, 76, 22, 11, '#8a6a45')}
        <line x1="14" y1="56" x2="86" y2="56" stroke="${DARK}" stroke-width="1.2"/>
        ${[0, 1, 2].map(i => potPlant(18 + i * 26, 44, 0.72, seed + i)).join('')}
        <path d="M28 34 q2 -6 8 -4 M56 34 q-2 -6 -8 -4" stroke="#7fbf6a" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
    }
    case '🐔': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(16, 48, 68, 30, 11, '#a9714b')}
        <path d="M18 48 l8 -14 h52 l8 14 Z" fill="#c97b5a" stroke="${DARK}" stroke-width="1.3"/>
        <rect x="22" y="60" width="16" height="14" fill="#3d3d4d"/>
        <path d="M50 34 q14 -4 20 -16 q2 12 -6 20 q10 0 16 -6 q-4 10 -16 12 Z" fill="#fff" stroke="${DARK}" stroke-width="1.2"/>
        <circle cx="60" cy="28" r="3" fill="#e8590c"/>
        <path d="M58 30 l-3 4 M60 30 l3 4" stroke="#e8590c" stroke-width="1.4"/></svg>`;
    }
    case '🥬': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(20, 56, 60, 22, 11, '#8a6a45')}
        <path d="M30 58 q-8 -20 10 -26 q16 -4 20 10 q4 -12 18 -10 q16 4 10 26 Z" fill="#7fbf6a" stroke="${DARK}" stroke-width="1.3"/>
        <path d="M38 56 q-4 -12 6 -16 q10 -4 12 6 q2 -10 12 -9 q10 2 6 16 Z" fill="#8fcd78" stroke="${DARK}" stroke-width="1.1"/>
        <path d="M40 52 q2 -6 8 -5 M58 50 q-2 -6 -8 -5" stroke="#fff" stroke-width="1.4" fill="none" opacity=".6"/></svg>`;
    }
    case '🛒': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(14, 20, 72, 60, 12, '#cfd6e4')}
        <line x1="16" y1="40" x2="84" y2="40" stroke="${DARK}" stroke-width="1.4"/>
        <line x1="16" y1="60" x2="84" y2="60" stroke="${DARK}" stroke-width="1.4"/>
        ${[22, 38, 54, 70].map((x, i) => `<rect x="${x}" y="${22 + (i % 2) * 20}" width="10" height="15" rx="2" fill="${['#e88bb0', '#5c7cfa', '#f5b544', '#12b886'][i]}" stroke="${DARK}" stroke-width="1"/>`).join('')}
        <rect x="18" y="44" width="14" height="12" rx="2" fill="#ff8a8a" stroke="${DARK}" stroke-width="1"/>
        <rect x="68" y="44" width="12" height="12" rx="2" fill="#8fa6c2" stroke="${DARK}" stroke-width="1"/></svg>`;
    }
    case '🧥': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <line x1="16" y1="36" x2="84" y2="36" stroke="#8a93a6" stroke-width="3.4" stroke-linecap="round"/>
        <line x1="18" y1="36" x2="14" y2="82" stroke="#8a93a6" stroke-width="2.2"/>
        <line x1="82" y1="36" x2="86" y2="82" stroke="#8a93a6" stroke-width="2.2"/>
        <path d="M28 36 q-4 -14 12 -14 q14 0 12 14 q-4 -6 -12 -6 q-8 0 -12 6 Z" fill="#e88bb0" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M40 36 q-4 -12 12 -12 q12 0 12 12 q-4 -5 -12 -5 q-8 0 -12 5 Z" fill="#5c7cfa" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M34 40 q0 20 12 30 q12 -10 12 -30 q-6 6 -12 6 q-6 0 -12 -6 Z" fill="#f4efe2" stroke="${DARK}" stroke-width="1.3"/></svg>`;
    }
    case '📱': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(34, 68, 32, 10, 8, '#8a93a6')}
        <line x1="50" y1="68" x2="50" y2="54" stroke="#8a93a6" stroke-width="3" stroke-linecap="round"/>
        <path d="M34 54 q-4 -20 6 -28 q12 -6 20 4 q4 16 -4 24 Z" fill="#3d3d4d" stroke="${DARK}" stroke-width="1.3"/>
        <rect x="38" y="30" width="24" height="16" rx="2" fill="#9fd0f7" stroke="${DARK}" stroke-width="1"/>
        <path d="M40 42 q4 -8 8 -6 q6 2 10 -4" stroke="#fff" stroke-width="1.6" fill="none" opacity=".7"/></svg>`;
    }
    case '🧸': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <circle cx="40" cy="56" r="14" fill="#c98a5a" stroke="${DARK}" stroke-width="1.4"/>
        <circle cx="62" cy="50" r="10" fill="#c98a5a" stroke="${DARK}" stroke-width="1.3"/>
        <circle cx="50" cy="32" r="11" fill="#d9a06a" stroke="${DARK}" stroke-width="1.4"/>
        <circle cx="45" cy="29" r="2" fill="#3d3d4d"/><circle cx="56" cy="29" r="2" fill="#3d3d4d"/>
        <path d="M48 35 q3 3 6 0" stroke="#3d3d4d" stroke-width="1.6" fill="none"/>
        <circle cx="52" cy="40" r="3" fill="#e8a0a0"/>
        <ellipse cx="50" cy="58" rx="9" ry="6" fill="#d9a06a" stroke="${DARK}" stroke-width="1.1"/>
        <path d="M38 48 q-10 -2 -8 -12 M38 52 q-10 2 -8 12" stroke="#c98a5a" stroke-width="3.4" stroke-linecap="round"/>
        <path d="M62 44 q10 -2 8 -12 M62 48 q10 2 8 12" stroke="#c98a5a" stroke-width="3.4" stroke-linecap="round"/></svg>`;
    }
    case '🛍️': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(8, 60, 84, 20, 13, wood)}
        ${box3D(24, 46, 52, 16, 10, '#8a93a6')}
        <rect x="30" y="52" width="10" height="8" fill="#22314f" stroke="${DARK}" stroke-width="1"/>
        <rect x="60" y="52" width="10" height="8" fill="#22314f" stroke="${DARK}" stroke-width="1"/>
        <rect x="16" y="70" width="16" height="8" rx="2" fill="#f5b544" stroke="${DARK}" stroke-width="1"/>
        <path d="M20 66 q0 -6 6 -6 M28 66 q0 -6 -6 -6" stroke="#f5b544" stroke-width="2" fill="none"/></svg>`;
    }
    case '🪞': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <line x1="36" y1="82" x2="36" y2="26" stroke="#8a93a6" stroke-width="3" stroke-linecap="round"/>
        <line x1="64" y1="82" x2="64" y2="26" stroke="#8a93a6" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="50" cy="40" rx="20" ry="26" fill="#d8e8f4" stroke="${DARK}" stroke-width="2.6"/>
        <ellipse cx="50" cy="40" rx="16" ry="22" fill="#eaf4fb" opacity=".7"/>
        <path d="M42 32 q6 -8 14 -4 q-4 10 -12 8 Z" fill="#fff" opacity=".8"/>
        <line x1="50" y1="14" x2="50" y2="20" stroke="#c9a86a" stroke-width="3"/></svg>`;
    }
    case '🥤': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(10, 60, 80, 20, 13, '#8fa6c2')}
        <rect x="22" y="44" width="12" height="18" rx="3" fill="#fff" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="26" y="46" width="4" height="14" fill="#f5b544"/>
        <rect x="44" y="42" width="12" height="20" rx="3" fill="#ffd9e8" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="48" y="44" width="4" height="16" fill="#e88bb0"/>
        <rect x="66" y="46" width="12" height="16" rx="3" fill="#b8e4d8" stroke="${DARK}" stroke-width="1.2"/>
        <line x1="28" y1="42" x2="24" y2="34" stroke="#f5b544" stroke-width="2.4"/>
        <line x1="50" y1="40" x2="56" y2="32" stroke="#e88bb0" stroke-width="2.4"/></svg>`;
    }

    case '🏦': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(6, 60, 88, 20, 13, wood)}
        ${box3D(14, 40, 72, 20, 10, '#eef2f8')}
        <path d="M18 40 q32 -12 64 0" fill="none" stroke="#cfd6e4" stroke-width="2.4"/>
        <rect x="20" y="70" width="18" height="7" rx="2" fill="#f5b544" stroke="${DARK}" stroke-width="1"/>
        <rect x="44" y="70" width="18" height="7" rx="2" fill="#f5b544" stroke="${DARK}" stroke-width="1"/>
        <rect x="68" y="70" width="14" height="7" rx="2" fill="#f5b544" stroke="${DARK}" stroke-width="1"/></svg>`;
    }
    case '🏧': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(26, 24, 48, 58, 12, '#8a93a6')}
        <rect x="32" y="30" width="36" height="20" rx="2" fill="#9fd0f7" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M34 46 q8 -10 16 -6 q8 3 14 -6" stroke="#fff" stroke-width="1.8" fill="none" opacity=".8"/>
        <rect x="32" y="56" width="36" height="10" rx="2" fill="#eef2f8" stroke="${DARK}" stroke-width="1"/>
        ${[36, 47, 58].map(x => `<circle cx="${x}" cy="71" r="2.4" fill="#ffd76e" stroke="${DARK}" stroke-width="0.9"/>`).join('')}
        <rect x="40" y="18" width="20" height="6" rx="2" fill="#22314f"/></svg>`;
    }
    case '📈': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(12, 26, 76, 44, 10, '#1c2438')}
        <rect x="17" y="30" width="66" height="36" rx="2" fill="#22314f"/>
        <path d="M20 58 q14 -4 20 -16 q8 -14 20 -10 q10 4 22 -8" fill="none" stroke="#f5b544" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M22 56 h52" stroke="#fff" stroke-width="1" opacity=".2"/>
        ${[30, 42, 54].map(y => `<line x1="28" y1="${y}" x2="32" y2="${y}" stroke="#fff" stroke-width="1.4" opacity=".5"/>`).join('')}
        <rect x="36" y="68" width="28" height="8" rx="2" fill="#4a4a5a" stroke="${DARK}" stroke-width="1"/></svg>`;
    }
    case '🏃': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(14, 66, 72, 12, 10, '#5a6a7a')}
        ${box3D(18, 46, 64, 18, 9, '#3d3d4d')}
        <rect x="26" y="40" width="14" height="8" rx="2" fill="#9fd0f7" stroke="${DARK}" stroke-width="1"/>
        <rect x="18" y="78" width="10" height="8" rx="2" fill="#8a93a6"/>
        <rect x="72" y="78" width="10" height="8" rx="2" fill="#8a93a6"/>
        <line x1="22" y1="40" x2="22" y2="22" stroke="#8a93a6" stroke-width="2.6"/>
        <line x1="34" y1="40" x2="34" y2="22" stroke="#8a93a6" stroke-width="2.6"/>
        <rect x="20" y="18" width="16" height="8" rx="2" fill="#22314f" stroke="${DARK}" stroke-width="1"/></svg>`;
    }
    case '🧘': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <rect x="18" y="58" width="64" height="8" rx="4" fill="#a88aa0" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="18" y="48" width="64" height="12" rx="5" fill="#c2a0ba" stroke="${DARK}" stroke-width="1.1"/>
        <path d="M20 54 q10 -6 18 -2 q8 4 16 -2 q10 -6 20 -1" stroke="#fff" stroke-width="1.6" fill="none" opacity=".5"/>
        <path d="M26 46 q0 -8 5 -10 q8 -2 10 6 q2 -8 10 -8 q8 0 8 10 q-6 -2 -10 2 q-6 6 -12 2 q-6 -4 -11 -2 Z" fill="#e8a0b0" stroke="${DARK}" stroke-width="1.2"/></svg>`;
    }
    case '🚴': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <circle cx="30" cy="58" r="13" fill="none" stroke="#3d3d4d" stroke-width="4"/>
        <circle cx="70" cy="58" r="13" fill="none" stroke="#3d3d4d" stroke-width="4"/>
        <path d="M40 58 h12 l10 -16 h10" fill="none" stroke="#8a93a6" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M44 46 h16 l-6 12" fill="none" stroke="#8a93a6" stroke-width="2.6" stroke-linecap="round"/>
        <rect x="50" y="34" width="22" height="10" rx="3" fill="#22314f" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="54" y="36" width="14" height="6" rx="1.5" fill="#9fd0f7"/></svg>`;
    }
    case '🏀': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <line x1="66" y1="56" x2="66" y2="24" stroke="#8a93a6" stroke-width="3" stroke-linecap="round"/>
        <path d="M52 22 h28 l-4 8 h-20 Z" fill="#eef2f8" stroke="${DARK}" stroke-width="1.3"/>
        <circle cx="40" cy="56" r="15" fill="#e88b3a" stroke="${DARK}" stroke-width="1.5"/>
        <path d="M28 54 q12 -4 24 0 M32 62 q8 -3 16 0" stroke="#8a4a1a" stroke-width="1.8" fill="none"/>
        <line x1="40" y1="41" x2="40" y2="71" stroke="#8a4a1a" stroke-width="1.8"/></svg>`;
    }
    case '🧴': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <line x1="16" y1="42" x2="84" y2="42" stroke="#8a93a6" stroke-width="3.2" stroke-linecap="round"/>
        <rect x="20" y="34" width="22" height="12" rx="3" fill="#fff" stroke="#cfd6e4" stroke-width="1.1"/>
        <rect x="46" y="34" width="18" height="12" rx="3" fill="#b8e4d8" stroke="#cfd6e4" stroke-width="1.1"/>
        <rect x="68" y="34" width="14" height="12" rx="3" fill="#ffd9e8" stroke="#cfd6e4" stroke-width="1.1"/>
        <line x1="22" y1="60" x2="78" y2="60" stroke="#8a93a6" stroke-width="2.4"/></svg>`;
    }
    case '🎭': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(6, 62, 88, 20, 12, wood)}
        <rect x="10" y="34" width="14" height="28" rx="4" fill="#a8353f" stroke="${DARK}" stroke-width="1.3"/>
        <rect x="76" y="34" width="14" height="28" rx="4" fill="#a8353f" stroke="${DARK}" stroke-width="1.3"/>
        <path d="M12 36 q10 -8 18 0 M80 36 q-10 -8 -18 0" stroke="#a8353f" stroke-width="2" fill="none"/>
        <ellipse cx="50" cy="38" rx="20" ry="16" fill="#f2d5a8" stroke="${DARK}" stroke-width="1.3"/>
        <path d="M44 30 h12 l-4 6 h-4 Z M38 42 q10 -10 22 -6 M40 46 h20" stroke="#3d3d4d" stroke-width="1.4" fill="none"/></svg>`;
    }
    case '🎹': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(12, 56, 76, 24, 13, '#3d3d4d')}
        ${box3D(18, 48, 64, 8, 8, '#1c2438')}
        ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${22 + i * 7.6}" y="58" width="4.6" height="18" rx="1" fill="#fff" stroke="#cfd6e4" stroke-width="0.8"/>`).join('')}
        ${[0, 1, 2, 3].map(i => `<rect x="${25 + i * 15.2}" y="58" width="3" height="11" fill="#3d3d4d"/>`).join('')}
        ${legs(18, 80, 82, 80, '#5d4529')}</svg>`;
    }
    case '🖍️': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <line x1="30" y1="82" x2="40" y2="40" stroke="#a9714b" stroke-width="3.4" stroke-linecap="round"/>
        <line x1="52" y1="82" x2="48" y2="40" stroke="#a9714b" stroke-width="3.4" stroke-linecap="round"/>
        <line x1="74" y1="82" x2="56" y2="40" stroke="#a9714b" stroke-width="3.4" stroke-linecap="round"/>
        <rect x="34" y="18" width="28" height="26" rx="2" fill="#fff" stroke="${DARK}" stroke-width="1.5"/>
        <path d="M38 40 l4 -16 h14 l4 16 Z" fill="#ffd9e8" opacity=".9"/>
        <path d="M36 26 q6 -4 10 2 M50 30 q4 -6 10 -2" stroke="#e88bb0" stroke-width="1.8" fill="none"/>
        ${[0, 1, 2].map(i => `<rect x="${60 + i * 9}" y="${62 + (i % 2) * 6}" width="7" height="14" rx="2" fill="${['#e88bb0', '#5c7cfa', '#f5b544'][i]}" stroke="${DARK}" stroke-width="0.9"/>`).join('')}</svg>`;
    }
    case '🎠': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <path d="M24 60 q-14 0 -10 -14 q4 -12 18 -12 h36 q14 0 18 12 q4 14 -10 14 Z" fill="#c98a5a" stroke="${DARK}" stroke-width="1.4"/>
        <path d="M20 48 q6 -12 18 -12 M80 48 q-6 -12 -18 -12" stroke="#c98a5a" stroke-width="3" fill="none" stroke-linecap="round"/>
        <line x1="50" y1="36" x2="50" y2="20" stroke="#8a93a6" stroke-width="3"/>
        <path d="M40 20 q-12 -2 -10 -14 q10 0 14 8 M60 20 q12 -2 10 -14 q-10 0 -14 8" fill="none" stroke="#8a93a6" stroke-width="3" stroke-linecap="round"/>
        <rect x="22" y="64" width="12" height="18" rx="3" fill="#a9714b" stroke="${DARK}" stroke-width="1.2"/></svg>`;
    }
    case '🧩': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${[0, 1, 2].map(i => box3D(20 + i * 22, 56 - (i % 2) * 12 - i * 2, 18, 18, 8, ['#e88bb0', '#5c7cfa', '#f5b544', '#12b886'][i % 4])).join('')}
        <rect x="26" y="40" width="10" height="10" fill="#5c7cfa" stroke="${DARK}" stroke-width="1"/>
        <rect x="40" y="44" width="10" height="10" fill="#f5b544" stroke="${DARK}" stroke-width="1"/></svg>`;
    }
    case '🍎': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(16, 60, 68, 16, 12, wood)}
        ${legs(24, 76, 76, 76, '#5d4529')}
        <circle cx="36" cy="48" r="9" fill="#e8590c" stroke="${DARK}" stroke-width="1.3"/>
        <path d="M36 39 q0 -5 3 -7" stroke="#6aa84f" stroke-width="1.8" fill="none"/>
        <rect x="30" y="34" width="3" height="5" fill="#6aa84f"/>
        <rect x="52" y="44" width="10" height="14" rx="2" fill="#f5b544" stroke="${DARK}" stroke-width="1"/>
        <line x1="56" y1="44" x2="52" y2="36" stroke="#f5b544" stroke-width="2"/></svg>`;
    }
    case '🀄': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(16, 58, 68, 18, 14, '#7c8fa8')}
        ${box3D(22, 50, 56, 8, 10, '#8fa6c2')}
        ${[0, 1, 2].map(i => `<rect x="${28 + i * 17}" y="40" width="9" height="12" rx="2" fill="#f4efe2" stroke="${DARK}" stroke-width="1"/>`).join('')}
        <rect x="32" y="43" width="8" height="6" fill="#e88bb0" opacity=".8"/>
        <rect x="60" y="42" width="8" height="10" rx="2" fill="#f4efe2" stroke="${DARK}" stroke-width="1"/></svg>`;
    }
    case '♟️': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(20, 62, 60, 14, 10, wood)}
        <rect x="26" y="54" width="48" height="9" rx="2" fill="#d9c49c" stroke="${DARK}" stroke-width="1.2"/>
        ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${29 + i * 5.6}" y="${55 + (i % 2) * 3.4}" width="2.6" height="3.4" fill="${i % 2 ? '#3d3d4d' : '#d9c49c'}"/>`).join('')}
        <path d="M34 50 q0 -8 6 -8 q6 0 6 8 M46 50 q0 -8 6 -8 q6 0 6 8" fill="#3d3d4d" stroke="${DARK}" stroke-width="0.9"/></svg>`;
    }
    case '📻': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(24, 44, 52, 34, 12, '#a9714b')}
        <rect x="30" y="30" width="40" height="14" rx="3" fill="#8a6a45" stroke="${DARK}" stroke-width="1.2"/>
        <circle cx="34" cy="52" r="7" fill="#3d3d4d" stroke="${DARK}" stroke-width="1.2"/>
        <circle cx="68" cy="54" r="5" fill="#3d3d4d" stroke="${DARK}" stroke-width="1.1"/>
        <rect x="42" y="50" width="16" height="9" rx="2" fill="#f5b544" opacity=".85"/>
        <line x1="70" y1="28" x2="80" y2="14" stroke="#8a93a6" stroke-width="2.4" stroke-linecap="round"/></svg>`;
    }
    case '🧶': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <path d="M16 60 q-4 -20 8 -28 h52 q12 8 8 28 Z" fill="#c9a86a" stroke="${DARK}" stroke-width="1.4"/>
        <path d="M24 60 q0 -14 8 -22 M76 60 q0 -14 -8 -22" stroke="#a9714b" stroke-width="2.4" fill="none"/>
        <circle cx="38" cy="44" r="9" fill="#e88bb0" stroke="${DARK}" stroke-width="1.2"/>
        <circle cx="58" cy="40" r="8" fill="#5c7cfa" stroke="${DARK}" stroke-width="1.2"/>
        <circle cx="48" cy="54" r="7" fill="#f5b544" stroke="${DARK}" stroke-width="1.1"/>
        <line x1="34" y1="36" x2="62" y2="30" stroke="#e88bb0" stroke-width="2" stroke-dasharray="3 2"/></svg>`;
    }
    case '🌳': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(44, 56, 14, 26, 8, '#8a5a34')}
        <circle cx="50" cy="32" r="22" fill="#7fbf6a" stroke="${DARK}" stroke-width="1.6"/>
        <circle cx="32" cy="44" r="14" fill="#8fcd78" stroke="${DARK}" stroke-width="1.5"/>
        <circle cx="68" cy="44" r="14" fill="#8fcd78" stroke="${DARK}" stroke-width="1.5"/>
        <circle cx="46" cy="24" r="9" fill="#9cdc85" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M38 30 q4 -10 14 -8" stroke="${DARK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <circle cx="34" cy="40" r="2.2" fill="#ff8a8a" opacity=".9"/></svg>`;
    }
    case '⛲': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(18, 66, 64, 14, 12, '#cfd6e4')}
        ${box3D(34, 52, 32, 14, 9, '#eef2f8')}
        <path d="M50 34 q-8 -12 -2 -20 q8 -8 14 2 q6 10 -4 18 Z" fill="#9fd0f7" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M50 34 q-4 -8 2 -12 M50 30 q2 -6 6 -6" stroke="#d8f2ff" stroke-width="2" fill="none" opacity=".9"/>
        <ellipse cx="50" cy="38" rx="10" ry="4" fill="#b5e2f2" opacity=".7"/></svg>`;
    }
    case '🌸': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(12, 66, 76, 14, 10, '#8a6a45')}
        ${[0, 1, 2].map(i => `<circle cx="${26 + i * 24}" cy="${60 - (i % 2) * 6}" r="8" fill="#f7a8b8" stroke="${DARK}" stroke-width="1.2"/><circle cx="${26 + i * 24}" cy="${60 - (i % 2) * 6}" r="3" fill="#ffd76e"/>`).join('')}
        ${[0, 1, 2].map(i => `<path d="M${26 + i * 24} ${62 - (i % 2) * 6} q0 10 0 12" stroke="#6aa84f" stroke-width="2" fill="none"/>`).join('')}</svg>`;
    }
    case '🪁': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <rect x="18" y="64" width="64" height="16" rx="6" fill="#8fcd78" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M30 70 q8 -4 16 -1 q8 3 16 -1 M24 76 q12 -3 24 0 q12 3 24 0" stroke="#6aa84f" stroke-width="1.4" fill="none"/>
        <path d="M58 60 q14 -6 22 -22 q-16 -4 -24 8 q-6 10 2 14 Z" fill="#f5b544" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M66 40 q6 -8 12 -6" stroke="#fff" stroke-width="1.6" fill="none"/></svg>`;
    }
    case '🛝': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <line x1="30" y1="82" x2="30" y2="30" stroke="#e88bb0" stroke-width="5" stroke-linecap="round"/>
        <line x1="52" y1="82" x2="52" y2="30" stroke="#e88bb0" stroke-width="5" stroke-linecap="round"/>
        <line x1="30" y1="34" x2="52" y2="34" stroke="#e88bb0" stroke-width="4.4"/>
        <path d="M34 40 q16 8 22 20 q6 12 16 18 q-8 2 -14 -2 q-10 -10 -16 -22 q-4 -8 -8 -14 Z" fill="#5c7cfa" stroke="${DARK}" stroke-width="1.3"/>
        <rect x="24" y="30" width="34" height="5" rx="2.5" fill="#f5b544" stroke="${DARK}" stroke-width="1"/></svg>`;
    }
    case '🕊️': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${[0, 1, 2].map(i => `<path d="M${28 + i * 22} ${58 + (i % 2) * 8} q-8 -16 6 -20 q14 -4 18 8 q-10 -2 -14 4 q-4 6 -10 8 Z" fill="#fff" stroke="#cfd6e4" stroke-width="1.2"/>`).join('')}
        ${[0, 1].map(i => `<circle cx="${44 + i * 22}" cy="${56 + (i % 2) * 8}" r="1.6" fill="#e88b3a"/>`).join('')}
        <line x1="20" y1="70" x2="80" y2="70" stroke="#c9ccd6" stroke-width="2.4"/></svg>`;
    }
    case '📣': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <line x1="30" y1="82" x2="30" y2="26" stroke="#8a6a45" stroke-width="3.4" stroke-linecap="round"/>
        <line x1="70" y1="82" x2="70" y2="26" stroke="#8a6a45" stroke-width="3.4" stroke-linecap="round"/>
        <rect x="20" y="20" width="60" height="36" rx="3" fill="#8a6a45" stroke="${DARK}" stroke-width="1.5"/>
        <rect x="24" y="24" width="52" height="28" rx="2" fill="#f5f7fa" stroke="#cfd6e4" stroke-width="1"/>
        ${[30, 40].map(y => `<line x1="28" y1="${y}" x2="52" y2="${y}" stroke="#c9a86a" stroke-width="2"/>`).join('')}
        <circle cx="68" cy="34" r="3" fill="#e8590c"/></svg>`;
    }
    case '🎡': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(30, 66, 40, 14, 10, '#8a93a6')}
        <line x1="50" y1="66" x2="50" y2="30" stroke="#8a93a6" stroke-width="3.4"/>
        <circle cx="50" cy="28" r="14" fill="none" stroke="#e88bb0" stroke-width="3"/>
        ${[0, 60, 120, 180, 240, 300].map((a, i) => `<line x1="50" y1="28" x2="${50 + 14 * Math.cos(a * Math.PI / 180)}" y2="${28 + 14 * Math.sin(a * Math.PI / 180)}" stroke="#e88bb0" stroke-width="1.6"/><circle cx="${50 + 14 * Math.cos(a * Math.PI / 180)}" cy="${28 + 14 * Math.sin(a * Math.PI / 180)}" r="3" fill="${['#5c7cfa', '#f5b544', '#12b886', '#e88bb0', '#8fa6c2', '#ff8a8a'][i]}" stroke="${DARK}" stroke-width="0.8"/>`).join('')}</svg>`;
    }
    case '🍦': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(14, 58, 72, 22, 12, '#f4efe2')}
        <path d="M18 58 l-6 -14 h80 l-6 14 Z" fill="#e88bb0" stroke="${DARK}" stroke-width="1.3"/>
        <path d="M30 46 q6 -4 12 -1 q6 3 12 -1 M58 46 q6 -4 12 -1 q6 3 12 -1" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>
        <path d="M30 34 q4 -14 14 -12 q8 2 6 12 q-8 -2 -10 4 q-4 -6 -10 -4 Z" fill="#fff" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M56 36 q4 -12 12 -10 q8 2 6 10 q-6 -2 -8 3 q-4 -5 -10 -3 Z" fill="#f5b544" stroke="${DARK}" stroke-width="1.2"/></svg>`;
    }
    case '🍚': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(14, 58, 72, 22, 12, '#8a93a6')}
        ${box3D(22, 44, 24, 14, 8, '#eef2f8')}
        <path d="M26 34 q0 -12 8 -12 q8 0 8 12 Z" fill="#fff" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M30 36 q2 -4 6 -3" stroke="#e8a0a0" stroke-width="1.6" fill="none"/>
        <rect x="56" y="46" width="22" height="12" rx="2" fill="#f4efe2" stroke="${DARK}" stroke-width="1.2"/>
        <ellipse cx="67" cy="44" rx="8" ry="4" fill="#fff" stroke="#cfd6e4" stroke-width="1"/></svg>`;
    }
    case '🥣': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(16, 62, 68, 18, 12, '#8a93a6')}
        <path d="M22 54 q0 -18 12 -22 h32 q12 4 12 22 Z" fill="#eef2f8" stroke="${DARK}" stroke-width="1.4"/>
        <ellipse cx="50" cy="32" rx="24" ry="8" fill="#f5c26a" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M40 28 q6 -4 10 0 M56 28 q-4 -5 -10 -3" stroke="#e8a0a0" stroke-width="1.6" fill="none" opacity=".8"/>
        <line x1="82" y1="70" x2="90" y2="56" stroke="#8a93a6" stroke-width="3" stroke-linecap="round"/></svg>`;
    }
    case '🧹': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <line x1="62" y1="82" x2="42" y2="30" stroke="#a9714b" stroke-width="4" stroke-linecap="round"/>
        <path d="M38 28 q-10 -8 -4 -16 q8 -6 14 4 q-6 2 -6 8 Z" fill="#e8b26a" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M36 24 l-8 -10 M44 20 l-6 -12" stroke="#c9a86a" stroke-width="2.4" stroke-linecap="round"/>
        <rect x="18" y="56" width="26" height="8" rx="3" fill="#cfd6e4" stroke="${DARK}" stroke-width="1.1"/></svg>`;
    }
    case '🍽️': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(10, 60, 80, 18, 13, wood)}
        ${legs(18, 78, 82, 78, '#5d4529')}
        <ellipse cx="32" cy="52" rx="9" ry="4" fill="#fff" stroke="#cfd6e4" stroke-width="1.1"/>
        <ellipse cx="56" cy="54" rx="9" ry="4" fill="#fff" stroke="#cfd6e4" stroke-width="1.1"/>
        <rect x="68" y="48" width="10" height="7" rx="2" fill="#f5b544" stroke="${DARK}" stroke-width="1"/>
        <line x1="24" y1="44" x2="40" y2="44" stroke="#8a93a6" stroke-width="2"/>
        <line x1="48" y1="46" x2="64" y2="46" stroke="#8a93a6" stroke-width="2"/></svg>`;
    }
    case '🚿': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <rect x="16" y="26" width="68" height="56" rx="4" fill="#eaf4fb" stroke="${DARK}" stroke-width="1.4"/>
        <path d="M20 30 l64 48" stroke="#d8e8f4" stroke-width="2" opacity=".8"/>
        <path d="M20 60 l64 18" stroke="#d8e8f4" stroke-width="2" opacity=".6"/>
        <line x1="50" y1="26" x2="50" y2="16" stroke="#8a93a6" stroke-width="3"/>
        <circle cx="50" cy="14" r="5" fill="#cfd6e4" stroke="${DARK}" stroke-width="1.1"/>
        <path d="M34 20 q16 4 32 0" fill="none" stroke="#cfd6e4" stroke-width="2.4"/>
        <ellipse cx="50" cy="80" rx="24" ry="5" fill="#9fd0f7" opacity=".5"/></svg>`;
    }
    case '🌍': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(38, 70, 24, 10, 8, wood)}
        <line x1="50" y1="70" x2="50" y2="46" stroke="#8a93a6" stroke-width="3" stroke-linecap="round"/>
        <circle cx="50" cy="34" r="17" fill="#9fd0f7" stroke="${DARK}" stroke-width="1.5"/>
        <path d="M36 30 q10 -8 22 0 q-4 8 -14 8 q-8 0 -8 -8 Z M38 42 q12 -6 22 2" fill="#5c9a6a" opacity=".85"/>
        <path d="M50 17 v34 M33 34 h34" stroke="#4a6a8a" stroke-width="1.2" opacity=".6"/></svg>`;
    }
    case '🎨': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <line x1="28" y1="82" x2="40" y2="36" stroke="#a9714b" stroke-width="3.4" stroke-linecap="round"/>
        <line x1="52" y1="82" x2="50" y2="36" stroke="#a9714b" stroke-width="3.4" stroke-linecap="round"/>
        <line x1="76" y1="82" x2="60" y2="36" stroke="#a9714b" stroke-width="3.4" stroke-linecap="round"/>
        <rect x="34" y="16" width="28" height="24" rx="2" fill="#fff" stroke="${DARK}" stroke-width="1.5"/>
        <path d="M38 36 l5 -16 h14 l5 16 Z" fill="#f5b544" opacity=".85"/>
        <path d="M40 24 q5 -5 10 -1 M46 28 q5 -4 10 0" stroke="#e88bb0" stroke-width="1.8" fill="none"/>
        ${[0, 1, 2].map(i => `<rect x="${58 + i * 9}" y="${62 + (i % 2) * 6}" width="7" height="14" rx="2" fill="${['#e88bb0', '#5c7cfa', '#12b886'][i]}" stroke="${DARK}" stroke-width="0.9"/>`).join('')}</svg>`;
    }
    case '📖': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <path d="M16 30 q16 -8 34 0 v40 q-18 -8 -34 0 Z" fill="#e8e0cc" stroke="${DARK}" stroke-width="1.3"/>
        <path d="M50 30 q18 -8 34 0 v40 q-16 -8 -34 0 Z" fill="#f4efe2" stroke="${DARK}" stroke-width="1.3"/>
        <line x1="50" y1="30" x2="50" y2="70" stroke="${DARK}" stroke-width="1.6"/>
        ${[38, 50, 62].map((y, i) => `<line x1="24" y1="${y + i * 4}" x2="44" y2="${y + i * 4 - 6}" stroke="#c9a86a" stroke-width="1.6"/>`).join('')}
        <rect x="54" y="34" width="8" height="11" rx="1" fill="#e8a0a0" opacity=".6"/></svg>`;
    }
    case '🗑️': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <path d="M30 34 q-4 -14 4 -18 h32 q8 4 4 18 Z" fill="#8a93a6" stroke="${DARK}" stroke-width="1.3"/>
        <path d="M32 34 h36 l-4 40 h-28 Z" fill="#aab3c2" stroke="${DARK}" stroke-width="1.3"/>
        <line x1="30" y1="30" x2="70" y2="30" stroke="${DARK}" stroke-width="2"/>
        <path d="M42 24 q2 -4 6 -3 M52 24 q2 -4 6 -3" stroke="#aab3c2" stroke-width="2.4" fill="none"/></svg>`;
    }
    case '📄': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${[0, 1, 2].map(i => `<rect x="${26 + i * 3}" y="${40 + i * 3}" width="42" height="34" rx="2" fill="${i === 2 ? '#fff' : '#f5f7fa'}" stroke="${i === 2 ? '#8a93a6' : '#cfd6e4'}" stroke-width="1.2" transform="rotate(${(i - 1) * 4} ${47 + i * 1.5} 57)"/>`).join('')}
        <line x1="34" y1="52" x2="60" y2="52" stroke="#c9a86a" stroke-width="1.8"/>
        <line x1="34" y1="60" x2="56" y2="60" stroke="#c9a86a" stroke-width="1.8"/></svg>`;
    }
    case '📦': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(24, 48, 52, 30, 11, '#c9a86a')}
        ${box3D(34, 34, 34, 18, 9, '#b98a5c')}
        <path d="M24 48 l26 12 l26 -12 M50 60 v-26" stroke="#8a6a45" stroke-width="2" fill="none"/>
        <path d="M34 34 l16 8 l16 -8 M50 42 v-14" stroke="#8a6a45" stroke-width="1.8" fill="none"/></svg>`;
    }
    case '🎒': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <path d="M30 46 q-6 -14 4 -20 q8 -4 16 0 q10 6 4 20 Z" fill="#e88b3a" stroke="${DARK}" stroke-width="1.3"/>
        <rect x="28" y="44" width="44" height="34" rx="7" fill="#f0a04a" stroke="${DARK}" stroke-width="1.3"/>
        <path d="M38 46 v-8 q6 -6 12 -2 q6 4 6 10" fill="none" stroke="#c97b2a" stroke-width="2.4"/>
        <rect x="36" y="56" width="28" height="6" rx="3" fill="#c97b2a" opacity=".6"/>
        <path d="M30 52 h40" stroke="#c97b2a" stroke-width="2" stroke-dasharray="4 3"/></svg>`;
    }
    case '🕯️': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        <rect x="22" y="54" width="56" height="20" rx="6" fill="#e8dcc0" stroke="${DARK}" stroke-width="1.3"/>
        <rect x="42" y="30" width="16" height="26" rx="4" fill="#f5f2e8" stroke="${DARK}" stroke-width="1.2"/>
        <path d="M50 30 q-5 -10 0 -16 q5 6 0 16 Z" fill="#ffd76e" stroke="${DARK}" stroke-width="1"/>
        <ellipse cx="50" cy="22" rx="4" ry="6" fill="#ffe9a8" opacity=".7"/></svg>`;
    }

    case '🚜': {
      return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%">${contact}
        ${box3D(10, 60, 66, 18, 12, '#c0392b')}
        <rect x="14" y="42" width="30" height="18" rx="4" fill="#e05a4a" stroke="${DARK}" stroke-width="1.3"/>
        <rect x="18" y="32" width="22" height="12" rx="3" fill="#9fd0f7" stroke="${DARK}" stroke-width="1.2"/>
        <rect x="40" y="52" width="34" height="10" rx="4" fill="#3d3d4d" stroke="${DARK}" stroke-width="1.2"/>
        <circle cx="26" cy="80" r="10" fill="#3d3d4d" stroke="${DARK}" stroke-width="1.4"/>
        <circle cx="68" cy="82" r="12" fill="#3d3d4d" stroke="${DARK}" stroke-width="1.4"/>
        <circle cx="26" cy="80" r="4" fill="#8a93a6"/>
        <circle cx="68" cy="82" r="4.6" fill="#8a93a6"/>
        <line x1="76" y1="34" x2="84" y2="18" stroke="#8a93a6" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M78 16 q6 -6 10 0 q-4 4 -10 2 Z" fill="#8a93a6"/></svg>`;
    }
    default: return null;
  }
}


  window.Art = { buildingSVG, decorSVG, furnSVG, box3D, propSVG };
})();













