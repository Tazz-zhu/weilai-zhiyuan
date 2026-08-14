/* 我的模拟人生路 · 俯视 2.5D 立体建筑生成器 v2（精修版：瓦片屋顶/窗框/门厅招牌/基座/幕墙反光） */
window.Art3D = (() => {
  'use strict';

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function seedOf(id) { let h = 0; for (const c of String(id || 'b')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function side(b) { return clamp(Math.round(Math.min(b.w, b.h) * 0.17), 34, 64); }

  /* 带窗框的窗户 */
  function windows(x0, y0, w, h, cols, rows, cw, ch, glass, seed) {
    let s = '';
    const gapX = Math.max(8, (w - cols * cw) / (cols + 1));
    const gapY = Math.max(8, (h - rows * ch) / (rows + 1));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = x0 + gapX + c * (cw + gapX);
        const y = y0 + gapY + r * (ch + gapY);
        const warm = ((seed + r * 3 + c * 7) % 9 === 0);
        const g = warm ? '#ffd76e' : glass;
        // 窗框
        s += `<rect x="${x - 2}" y="${y - 2}" width="${cw + 4}" height="${ch + 4}" rx="3" fill="rgba(255,255,255,.28)" stroke="rgba(30,30,50,.75)" stroke-width="1.6"/>`;
        s += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="2" fill="${g}" stroke="rgba(30,30,50,.65)" stroke-width="1.2" opacity="${warm ? .95 : .9}"/>`;
        // 窗台
        s += `<rect x="${x - 3}" y="${y + ch}" width="${cw + 6}" height="3" rx="1" fill="rgba(255,255,255,.4)" stroke="rgba(30,30,50,.4)" stroke-width=".8"/>`;
        // 十字格 + 反光
        s += `<line x1="${x + cw / 2}" y1="${y + 2}" x2="${x + cw / 2}" y2="${y + ch - 2}" stroke="rgba(30,30,50,.5)" stroke-width="1"/>`;
        if (!warm) s += `<line x1="${x + 3}" y1="${y + 3}" x2="${x + cw - 3}" y2="${y + ch - 3}" stroke="rgba(255,255,255,.55)" stroke-width="1.6"/>`;
      }
    }
    return s;
  }

  /* 门 + 雨棚 + 招牌 + 台阶 */
  function entrance(b, W, side, seed) {
    const line = 'rgba(30,30,50,.85)';
    const dw = Math.min(52, W * 0.13), dh = Math.min(side * 0.76, side - 8);
    const dx = (W - dw) / 2;
    const ground = W - side; // 顶面底边 y
    const doorY = ground + side - dh;
    let s = '';
    // 门框
    s += `<rect x="${dx - 4}" y="${doorY - 5}" width="${dw + 8}" height="${dh + 5}" rx="3" fill="rgba(0,0,0,.18)"/>`;
    // 门
    s += `<rect x="${dx}" y="${doorY}" width="${dw}" height="${dh}" rx="3" fill="#5d4529" stroke="${line}" stroke-width="2"/>`;
    s += `<rect x="${dx + 5}" y="${doorY + 5}" width="${dw - 10}" height="${Math.min(18, dh * 0.3)}" rx="2" fill="rgba(255,255,255,.22)"/>`;
    s += `<circle cx="${dx + dw - 9}" cy="${doorY + dh / 2}" r="2.6" fill="#ffd76e" stroke="${line}" stroke-width="1"/>`;
    // 门牌
    s += `<rect x="${dx + dw / 2 - 16}" y="${doorY - 16}" width="32" height="12" rx="3" fill="#fffdf5" stroke="${line}" stroke-width="1.2"/>`;
    const name = String(b.name || '').slice(0, 4);
    if (name) s += `<text x="${dx + dw / 2}" y="${doorY - 7}" font-size="7.5" text-anchor="middle" fill="#5a4632" font-family="sans-serif">${name}</text>`;
    // 雨棚
    s += `<path d="M${dx - 8} ${doorY - 18} L${dx + dw + 8} ${doorY - 18} L${dx + dw + 4} ${doorY - 10} L${dx - 4} ${doorY - 10} Z" fill="${shade(b.color || '#7c9ff2', -14)}" stroke="${line}" stroke-width="1.4"/>`;
    // 台阶
    s += `<rect x="${dx - 8}" y="${ground + side - 4}" width="${dw + 16}" height="5" rx="1" fill="rgba(255,255,255,.5)" stroke="${line}" stroke-width="1"/>`;
    return s;
  }

  function roofTop(b, W, H, seed) {
    const c = b.color || '#7c9ff2';
    const line = 'rgba(30,30,50,.85)';
    let base = `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" fill="${c}" stroke="${line}" stroke-width="2.5"/>`;
    const inner = `<rect x="${W * 0.05}" y="${H * 0.05}" width="${W * 0.9}" height="${H * 0.9}" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"/>`;
    // 顶面高光（左上亮）
    base += `<path d="M2 2 L${W - 2} 2 L${W - 2} ${H * 0.4} L2 ${H * 0.4} Z" fill="rgba(255,255,255,.10)"/>`;
    if (b.type === 'home') {
      // 瓦片斜纹
      let tiles = '';
      for (let i = -H; i < W + H; i += 14) tiles += `<line x1="${i}" y1="0" x2="${i + H}" y2="${H}" stroke="rgba(0,0,0,.10)" stroke-width="2"/>`;
      // 屋脊（两条斜线构成坡顶）
      const ridge = `<path d="M2 ${H / 2} L${W - 2} ${H / 2}" stroke="rgba(0,0,0,.28)" stroke-width="3"/>`;
      const ridgeLight = `<path d="M2 ${H / 2 - 3} L${W - 2} ${H / 2 - 3}" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>`;
      const cx = W * 0.2 + seed % 40;
      const chimney = `
        <rect x="${cx}" y="${H * 0.14}" width="28" height="32" fill="${shade(c, 14)}" stroke="${line}" stroke-width="2"/>
        <rect x="${cx}" y="${H * 0.14 - 10}" width="28" height="11" fill="${shade(c, -36)}" stroke="${line}" stroke-width="2"/>
        <rect x="${cx + 8}" y="${H * 0.14 + 8}" width="12" height="10" fill="#ff8a8a" opacity=".35"/>`;
      return base + tiles + inner + ridge + ridgeLight + chimney;
    }
    if (b.type === 'work') {
      // 平屋顶：玻璃天窗网格 + 设备
      let skylights = '';
      for (let gx = W * 0.08; gx < W * 0.5; gx += 26) {
        skylights += `<rect x="${gx}" y="${H * 0.08}" width="16" height="22" fill="#bfe3ff" stroke="${line}" stroke-width="1.4" opacity=".85"/>
          <line x1="${gx + 8}" y1="${H * 0.08 + 2}" x2="${gx + 8}" y2="${H * 0.08 + 20}" stroke="rgba(255,255,255,.7)" stroke-width="1"/>`;
      }
      const eqx = W - 90 - (seed % 30), eqy = 14 + (seed % 24);
      const equip = `
        <rect x="${eqx}" y="${eqy}" width="46" height="28" fill="${shade(c, 16)}" stroke="${line}" stroke-width="2"/>
        <rect x="${eqx + 6}" y="${eqy + 5}" width="9" height="9" fill="#8fd0ff" stroke="rgba(30,30,50,.5)" stroke-width="1"/>
        <rect x="${eqx + 19}" y="${eqy + 5}" width="9" height="9" fill="#8fd0ff" stroke="rgba(30,30,50,.5)" stroke-width="1"/>
        <circle cx="${eqx + 34}" cy="${eqy + 10}" r="4" fill="#ffd76e" stroke="${line}" stroke-width="1"/>
        <rect x="${W * 0.55}" y="${H * 0.16}" width="40" height="24" fill="${shade(c, 20)}" stroke="${line}" stroke-width="2"/>
        <path d="M${W * 0.55 + 40} ${H * 0.16 + 12} l16 0" stroke="${line}" stroke-width="2"/>`;
      return base + skylights + inner + equip;
    }
    // public：穹顶 + 四周立柱 + 绿植
    const rx = Math.min(W, H) * 0.2, ry = Math.min(W, H) * 0.16;
    const dome = `
      <ellipse cx="${W / 2}" cy="${H / 2}" rx="${rx}" ry="${ry}" fill="${shade(c, 24)}" stroke="${line}" stroke-width="2.5"/>
      <ellipse cx="${W / 2}" cy="${H / 2}" rx="${rx * 0.62}" ry="${ry * 0.55}" fill="${shade(c, 10)}" stroke="rgba(30,30,50,.5)" stroke-width="1.5"/>
      <ellipse cx="${W / 2}" cy="${H / 2}" rx="${rx * 0.28}" ry="${ry * 0.24}" fill="${shade(c, -8)}" stroke="rgba(30,30,50,.4)" stroke-width="1"/>
      <circle cx="${W / 2}" cy="${H / 2}" r="4" fill="#ffd76e" stroke="${line}" stroke-width="1.5"/>`;
    // 顶面四角小绿植
    const plants = `
      <circle cx="${W * 0.12}" cy="${H * 0.12}" r="6" fill="#7fbf6a" stroke="${line}" stroke-width="1.4"/>
      <circle cx="${W * 0.88}" cy="${H * 0.12}" r="6" fill="#8fcd78" stroke="${line}" stroke-width="1.4"/>
      <circle cx="${W * 0.12}" cy="${H * 0.88}" r="6" fill="#8fcd78" stroke="${line}" stroke-width="1.4"/>
      <circle cx="${W * 0.88}" cy="${H * 0.88}" r="6" fill="#7fbf6a" stroke="${line}" stroke-width="1.4"/>`;
    return base + inner + dome + plants;
  }

  function frontFace(b, W, side, seed) {
    const c = b.color || '#7c9ff2';
    const line = 'rgba(30,30,50,.85)';
    const fc = shade(c, -30);
    let s = `<rect x="0" y="${W - side}" width="${W}" height="${side}" fill="${fc}" stroke="${line}" stroke-width="2.5"/>`;
    s += `<path d="M0 ${W - side} L${W} ${W - side}" stroke="rgba(255,255,255,.4)" stroke-width="2"/>`;
    // 墙体竖线（面板感）
    const panels = Math.max(2, Math.round(W / 130));
    for (let i = 1; i < panels; i++) {
      const px = W * i / panels;
      s += `<line x1="${px}" y1="${W - side + 4}" x2="${px}" y2="${W - 2}" stroke="rgba(0,0,0,.10)" stroke-width="1"/>`;
    }
    // 基座
    s += `<rect x="0" y="${W - 8}" width="${W}" height="8" fill="${shade(c, -52)}" stroke="${line}" stroke-width="1.4"/>`;
    if (b.type === 'work') {
      // 玻璃幕墙 + 反光条
      for (let x = 8; x < W - 8; x += 26) {
        s += `<rect x="${x}" y="${W - side + 6}" width="15" height="${side - 18}" fill="rgba(190,225,255,.55)" stroke="rgba(30,30,50,.35)" stroke-width="1"/>`;
      }
      s += `<line x1="10" y1="${W - side + 10}" x2="${W - 10}" y2="${W - 10}" stroke="rgba(255,255,255,.5)" stroke-width="2"/>`;
    } else {
      const cols = clamp(Math.round(W / 92), 2, 6);
      s += windows(0, W - side, W, side - 12, cols, side >= 52 ? 2 : 1, 30, 24, '#bfe3ff', seed);
    }
    s += entrance(b, W, side, seed);
    return s;
  }

  function eastFace(b, H, side, seed) {
    const c = b.color || '#7c9ff2';
    const line = 'rgba(30,30,50,.85)';
    const ec = shade(c, -52);
    let s = `<rect x="${H}" y="0" width="${side}" height="${H}" fill="${ec}" stroke="${line}" stroke-width="2.5"/>`;
    s += `<path d="M${H} 0 L${H} ${H}" stroke="rgba(255,255,255,.22)" stroke-width="2"/>`;
    s += `<rect x="${H}" y="${H - 8}" width="${side}" height="8" fill="${shade(c, -62)}" stroke="${line}" stroke-width="1.2"/>`;
    if (side >= 40) {
      const rows = Math.max(1, Math.round(H / 140));
      s += windows(H, 0, side, H - 10, 1, rows, 18, 22, '#a8ccea', seed + 5);
    }
    // 空调外机（work）
    if (b.type === 'work' && side >= 44) {
      const ay = H * 0.72;
      s += `<rect x="${H + 5}" y="${ay}" width="${side - 10}" height="22" fill="#d8dce6" stroke="${line}" stroke-width="1.6"/>
        <line x1="${H + 8}" y1="${ay + 11}" x2="${H + side - 8}" y2="${ay + 11}" stroke="${line}" stroke-width="1.2"/>
        <circle cx="${H + 12}" cy="${ay + 11}" r="3" fill="#9aa0b4"/>`;
    }
    return s;
  }

  /* 俯视 2.5D 建筑：顶面 + 南侧面（向下）+ 东侧面（向右） */
  function building(b) {
    const W0 = b.w, H0 = b.h;
    const sh = side(b);
    const W = W0 + sh, H = H0 + sh;
    const seed = seedOf(b.id);
    // 地面阴影（建筑底部右侧）
    const groundShadow = `<ellipse cx="${W0 + sh * 0.55}" cy="${H0 + sh * 0.9}" rx="${W0 * 0.5}" ry="${sh * 0.55}" fill="rgba(30,25,15,.16)"/>`;
    return `<svg class="building3d-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="roofGrad-${seed}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
          <stop offset="1" stop-color="#000000" stop-opacity="0.08"/>
        </linearGradient>
      </defs>
      ${groundShadow}
      ${frontFace(b, W0, sh, seed)}
      ${eastFace(b, H0, sh, seed)}
      ${roofTop(b, W0, H0, seed)}
      <rect x="0" y="0" width="${W0}" height="${H0}" fill="url(#roofGrad-${seed})"/>
    </svg>`;
  }

  return { building, side, shade };
})();
