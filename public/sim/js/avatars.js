/* 我的模拟人生路 · 原神风卡片小人 v5：元素之眼 / 分层发型 / 神之眼 / 元素光晕 */
(function () {
  'use strict';

  function hashSeed(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
  function rng(seed) { let s = seed || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function pickFrom(r, arr) { return arr[Math.floor(r() * arr.length)]; }

  const SKINS = ['#f5d0a9', '#f2c094', '#e8b088', '#d9a06e', '#c68642'];
  const HAIR_COLORS = ['#3a2a1a', '#4a3728', '#5c3d2e', '#1c1c1c', '#6b4a2f', '#8a5a33', '#a3673a', '#b8b8c0', '#d9c7a0', '#2f2f2f'];
  const TOP_COLORS = ['#5c7cfa', '#12b886', '#fab005', '#e8590c', '#e64980', '#7048e8', '#1098ad', '#c92a2a', '#5f3dc4', '#2b8a3e', '#f76707', '#4263eb'];
  const PANTS = ['#3a4a6a', '#4a4a5a', '#5a6a4a', '#6a4a4a', '#3a5a5a', '#5a4a6a'];
  const PROPS = {
    '医疗健康': '🩺', '大健康与养老': '💊', '教育科研': '📖', '教育与培训': '✏️',
    '政法与公共服务': '📋', '军警与公共服务': '🚨', '互联网科技': '⌨️', '人工智能与前沿': '🔬',
    '金融与经济': '📈', '商业与运营': '📊', '文化创意与传媒': '✍️', '工程与制造': '🔧',
    '生活服务与新消费': '☕', '农业与食品': '🌾', '艺术与体育': '🎨', '美妆与时尚': '💄',
    '宠物与生活': '🦴', '交通与物流': '🗺️', '旅游与酒店': '🧳', '体育与健康': '🏀',
    '能源与环保': '🌱', '新兴前沿职业': '🔭', '新兴数字职业': '⌨️'
  };
  const ELEMENT_COLORS = {
    pyro: '#ff7a45', hydro: '#5ab0ff', anemo: '#7fe8a8', electro: '#b18cff',
    dendro: '#9be06b', cryo: '#7fe0e8', geo: '#f5c86b', star: '#f5d06b'
  };
  function elementColorOf(cat) {
    try { const e = TownData.elementOf(cat); return ELEMENT_COLORS[e.key] || '#f5d06b'; } catch (e2) { return '#f5d06b'; }
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ---------- 原神式分层发型 ---------- */
  function chibiHair(style, cx, headY, r, hairC) {
    const top = headY - r;
    const shine = shade(hairC, 42);
    const base = `fill="${hairC}"`;
    const fringe = `fill="${hairC}"`;
    // 通用：脑后发块 + 刘海
    const back = `<path d="M${cx - r} ${top + 3} Q${cx} ${top - 4} ${cx + r} ${top + 3} L${cx + r} ${headY + r * 0.34} Q${cx} ${headY + r * 0.46} ${cx - r} ${headY + r * 0.34} Z" ${base}/>`;
    const shineLine = `<path d="M${cx - r * 0.75} ${top + 2} Q${cx - r * 0.1} ${top - 2} ${cx + r * 0.7} ${top + 2}" fill="none" stroke="${shine}" stroke-width="2.6" opacity=".85" stroke-linecap="round"/>`;
    switch (style) {
      case 'bald': return '';
      case 'bun':
        return back + `<circle cx="${cx}" cy="${top - 5}" r="${r * 0.34}" ${base}/><circle cx="${cx}" cy="${top - 5}" r="${r * 0.1}" fill="${shine}"/>` + shineLine +
          `<path d="M${cx - r * 0.9} ${top + 1} q${r * 0.3} -${r * 0.5} ${r * 0.7} -${r * 0.3} q-${r * 0.2} ${r * 0.25} -${r * 0.15} ${r * 0.55} q-${r * 0.25} -${r * 0.05} -${r * 0.55} -${r * 0.25} Z" ${fringe}/>`;
      case 'ponytail':
        return back + `<path d="M${cx - r} ${top + 4} Q${cx - r - 3} ${headY + r * 0.75} ${cx - r + 3} ${headY + r * 1.25}" fill="none" stroke="${hairC}" stroke-width="7" stroke-linecap="round"/>` + shineLine +
          `<path d="M${cx - r * 0.9} ${top + 1} q${r * 0.3} -${r * 0.5} ${r * 0.7} -${r * 0.3} q-${r * 0.2} ${r * 0.25} -${r * 0.15} ${r * 0.55} q-${r * 0.25} -${r * 0.05} -${r * 0.55} -${r * 0.25} Z" ${fringe}/>`;
      case 'long':
        return `<path d="M${cx - r} ${top + 4} Q${cx - r - 3} ${headY + r * 1.25} ${cx - r + 3} ${headY + r * 1.45} L${cx + r - 3} ${headY + r * 1.45} Q${cx + r + 3} ${headY + r * 1.25} ${cx + r} ${top + 4} Q${cx} ${top - 4} ${cx - r} ${top + 4} Z" ${base}/>` + shineLine +
          `<path d="M${cx - r * 0.9} ${top + 1} q${r * 0.3} -${r * 0.5} ${r * 0.7} -${r * 0.3} q-${r * 0.2} ${r * 0.25} -${r * 0.15} ${r * 0.55} q-${r * 0.25} -${r * 0.05} -${r * 0.55} -${r * 0.25} Z" ${fringe}/>`;
      case 'curly':
        return `<path d="M${cx - r} ${top + 4} Q${cx - r - 3} ${top - 1} ${cx - r + 2} ${top - 4} Q${cx} ${top - 9} ${cx + r - 2} ${top - 3} Q${cx + r + 3} ${top - 1} ${cx + r} ${top + 4} L${cx + r} ${headY + r * 0.3} Q${cx} ${headY + r * 0.42} ${cx - r} ${headY + r * 0.3} Z" ${base}/>
          <circle cx="${cx - r + 4}" cy="${top}" r="3.6" ${base}/><circle cx="${cx + r - 4}" cy="${top}" r="3.6" ${base}/><circle cx="${cx}" cy="${top - 4}" r="3.8" ${base}/>` + shineLine;
      case 'kid':
        return back + `<path d="M${cx - r * 0.9} ${top + 1} q${r * 0.3} -${r * 0.5} ${r * 0.7} -${r * 0.3} q-${r * 0.2} ${r * 0.25} -${r * 0.15} ${r * 0.55} q-${r * 0.25} -${r * 0.05} -${r * 0.55} -${r * 0.25} Z" ${fringe}/>` + shineLine;
      case 'short':
      default:
        return back + shineLine +
          `<path d="M${cx - r * 0.9} ${top + 1} q${r * 0.3} -${r * 0.5} ${r * 0.7} -${r * 0.3} q-${r * 0.2} ${r * 0.25} -${r * 0.15} ${r * 0.55} q-${r * 0.25} -${r * 0.05} -${r * 0.55} -${r * 0.25} Z" ${fringe}/>`;
    }
  }

  /* ---------- 原神式元素之眼 ---------- */
  function drawEyes(mood, cx, headY, r, eyeC, female) {
    const ex = 7.6, ey = headY - 1;
    if (mood === 'sleep') {
      return `<path d="M${cx - 10.5} ${ey} q2 -2.5 4.5 0" fill="none" stroke="#3a3a4a" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M${cx + 6} ${ey} q2 -2.5 4.5 0" fill="none" stroke="#3a3a4a" stroke-width="1.8" stroke-linecap="round"/>
        <text x="${cx + 16}" y="${headY - r - 1}" font-size="9" opacity=".85">💤</text>`;
    }
    if (mood === 'happy') {
      return `<path d="M${cx - 10} ${ey + 2} q2 -3.5 4.5 -1" fill="none" stroke="#2b2b33" stroke-width="1.9" stroke-linecap="round"/>
        <path d="M${cx + 5.5} ${ey + 2} q2 -3.5 4.5 -1" fill="none" stroke="#2b2b33" stroke-width="1.9" stroke-linecap="round"/>`;
    }
    if (mood === 'tired') {
      return `<path d="M${cx - 10.5} ${ey} h4.5" stroke="#2b2b33" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M${cx + 6} ${ey} h4.5" stroke="#2b2b33" stroke-width="1.7" stroke-linecap="round"/>`;
    }
    const eye = (sx, flip) => `
      <ellipse cx="${sx}" cy="${ey}" rx="3.8" ry="4.6" fill="#ffffff" stroke="#3a3a4a" stroke-width="1.2"/>
      <circle cx="${sx}" cy="${ey + 0.6}" r="2.9" fill="${eyeC}"/>
      <circle cx="${sx}" cy="${ey + 0.6}" r="1.3" fill="#181820"/>
      <circle cx="${sx - 1}" cy="${ey - 0.8}" r="1" fill="#fff"/>
      <circle cx="${sx + 1.2}" cy="${ey + 1.6}" r="0.55" fill="#fff"/>
      ${female ? `<path d="M${sx - 4.2} ${ey - 4.4} q0 -1.8 1.6 -2.2 q1.8 -0.2 2.4 0.8" fill="none" stroke="#2b2b33" stroke-width="1.1" stroke-linecap="round"/>` : ''}`;
    return eye(cx - ex) + eye(cx + ex);
  }

  /* ---------- 头饰（沿用但适配新头部） ---------- */
  function chibiHeadwear(npc, cx, top, r) {
    const cat = (npc.career && npc.career.category) || '';
    const role = npc.role;
    const O = '#4a4a5e';
    if (role === 'kinderkid' || role === 'baby') return `<path d="M${cx - r * 0.75} ${top + 1} q${r * 0.75} -${r * 0.55} ${r * 1.5} 0 l-${r * 0.15} ${r * 0.3} h-${r * 1.2} Z" fill="#ffb3c1" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>`;
    if (role === 'retiree') return `<path d="M${cx - r * 0.85} ${top + 2} q${r * 0.85} -${r * 0.4} ${r * 1.7} 0 q-${r * 0.25} ${r * 0.35} -${r * 1.7} 0 Z" fill="#b8a8e8" stroke="${O}" stroke-width="2"/>`;
    if (cat.includes('生活服务') || cat.includes('新消费') || cat.includes('咖啡')) return `<ellipse cx="${cx}" cy="${top - 2}" rx="${r * 0.75}" ry="${r * 0.22}" fill="#fff" stroke="${O}" stroke-width="2"/><path d="M${cx - r * 0.6} ${top - 1} q0 ${r * 0.4} ${r * 1.2} 0 Z" fill="#fff" stroke="${O}" stroke-width="2"/>`;
    if (cat.includes('农业') || cat.includes('食品')) return `<ellipse cx="${cx}" cy="${top}" rx="${r * 0.95}" ry="${r * 0.22}" fill="#e8c86b" stroke="${O}" stroke-width="2"/><path d="M${cx - r * 0.95} ${top} q0 ${r * 0.45} ${r * 1.9} 0 Z" fill="#f2d98a" stroke="${O}" stroke-width="2"/>`;
    if (cat.includes('政法') || cat.includes('军警') || cat.includes('公共服务')) return `<path d="M${cx - r * 0.7} ${top + 1} L${cx - r * 0.8} ${top - r * 0.35} L${cx + r * 0.8} ${top - r * 0.35} L${cx + r * 0.7} ${top + 1} Z" fill="#3a4a6a" stroke="${O}" stroke-width="2" stroke-linejoin="round"/><circle cx="${cx}" cy="${top - r * 0.2}" r="1.8" fill="#ffd76e"/>`;
    if (cat.includes('医疗') || cat.includes('健康')) return `<path d="M${cx - r * 0.7} ${top + 1} L${cx - r * 0.7} ${top - r * 0.3} L${cx + r * 0.7} ${top - r * 0.3} L${cx + r * 0.7} ${top + 1} Z" fill="#fff" stroke="${O}" stroke-width="2"/><rect x="${cx - r * 0.1}" y="${top - r * 0.45}" width="${r * 0.2}" height="${r * 0.3}" fill="#e74c3c" rx="1"/>`;
    if (cat.includes('文化') || cat.includes('艺术') || cat.includes('音乐') || cat.includes('演艺')) return `<rect x="${cx - r * 0.95}" y="${top - r * 0.42}" width="${r * 1.9}" height="${r * 0.24}" rx="3" fill="#e88bb0" stroke="${O}" stroke-width="2"/><rect x="${cx - r * 1.05}" y="${top - r * 0.18}" width="${r * 2.1}" height="${r * 0.2}" rx="3" fill="#e88bb0" stroke="${O}" stroke-width="1.5"/>`;
    if (cat.includes('工程') || cat.includes('制造')) return `<path d="M${cx - r * 0.85} ${top + 1} L${cx - r * 0.65} ${top - r * 0.4} L${cx + r * 0.65} ${top - r * 0.4} L${cx + r * 0.85} ${top + 1} Z" fill="#ffd76e" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>`;
    return '';
  }

  /* ---------- 服装：滚边 / 衣领 / 神之眼 ---------- */
  function chibiOutfit(npc, cx, top, r, topC, female, eyeC) {
    const cat = (npc.career && npc.career.category) || '';
    const sh = top + r * 0.25;
    const dark = shade(topC, -46);
    const trim = `<path d="M${cx - r * 0.7} ${sh + r * 1.2} L${cx + r * 0.7} ${sh + r * 1.2}" stroke="${dark}" stroke-width="1.6"/>`;
    const collar = `<path d="M${cx - r * 0.45} ${sh} L${cx} ${sh + r * 0.45} L${cx + r * 0.45} ${sh}" fill="none" stroke="${dark}" stroke-width="1.7"/>`;
    if (cat.includes('政法') || cat.includes('军警')) {
      return `<path d="M${cx - r * 0.5} ${sh} L${cx} ${sh + r * 0.4} L${cx + r * 0.5} ${sh}" fill="none" stroke="#3a3a4a" stroke-width="2.4"/><path d="M${cx - r * 0.5} ${sh + r * 0.4} h${r}" stroke="#3a3a4a" stroke-width="2"/>` + thisVision(cx, sh, eyeC, r);
    }
    if (cat.includes('医疗')) {
      return `<path d="M${cx - r * 1.05} ${sh - r * 0.1} L${cx + r * 1.05} ${sh - r * 0.1} L${cx + r * 0.85} ${sh + r * 1.2} L${cx - r * 0.85} ${sh + r * 1.2} Z" fill="#ffffff" stroke="#cfd4e0" stroke-width="1.6"/><path d="M${cx - r * 0.25} ${sh} l0 ${r * 0.9}" stroke="#cfd4e0" stroke-width="1.6"/>` + thisVision(cx, sh, eyeC, r);
    }
    if (cat.includes('农业') || cat.includes('生活服务') || cat.includes('新消费') || cat.includes('咖啡')) {
      return `<path d="M${cx - r * 0.8} ${sh} L${cx + r * 0.8} ${sh} L${cx + r * 0.6} ${sh + r * 1.2} L${cx - r * 0.6} ${sh + r * 1.2} Z" fill="#f2ead8" stroke="#d8cbb0" stroke-width="1.6"/><path d="M${cx - r * 0.2} ${sh} v${r * 0.8}" stroke="#d8cbb0" stroke-width="2"/>` + thisVision(cx, sh, eyeC, r);
    }
    if (cat.includes('金融') || cat.includes('商业') || cat.includes('运营')) {
      return `<path d="M${cx} ${sh} L${cx - r * 0.3} ${sh + r * 0.7} L${cx + r * 0.3} ${sh + r * 0.7} Z" fill="#3a5bd9"/><path d="M${cx - r * 0.5} ${sh} L${cx + r * 0.5} ${sh}" stroke="#3a3a4a" stroke-width="2"/>` + thisVision(cx, sh, eyeC, r);
    }
    if (cat.includes('文化') || cat.includes('艺术') || cat.includes('演艺') || cat.includes('媒体')) {
      return `<path d="M${cx - r * 0.9} ${sh + r * 0.3} q${r * 0.3} ${r * 0.55} ${r * 0.6} 0" fill="none" stroke="#e88bb0" stroke-width="4" stroke-linecap="round"/><path d="M${cx + r * 0.9} ${sh + r * 0.3} q-${r * 0.3} ${r * 0.55} -${r * 0.6} 0" fill="none" stroke="#e88bb0" stroke-width="4" stroke-linecap="round"/>` + thisVision(cx, sh, eyeC, r);
    }
    // 默认：衣领 + 滚边 + 裙子/神之眼
    return collar + trim + thisVision(cx, sh, eyeC, r);
  }
  function thisVision(cx, sh, eyeC, r) {
    const vx = cx + r * 0.78;
    // 神之眼：胸口右侧的菱形元素宝石
    return `<path class="vision" d="M${vx} ${sh - 2} L${vx + 4.6} ${sh + 2.6} L${vx} ${sh + 7.2} L${vx - 4.6} ${sh + 2.6} Z" fill="${eyeC}" stroke="#ffffff" stroke-width="1" stroke-linecap="round"/>`;
  }

  function avatarSvg(npc, size = 96, mood = '') {
    const seed = hashSeed(npc.id || 'x');
    const r = rng(seed);
    const skin = pickFrom(r, SKINS);
    const hairC = npc.age >= 55 ? '#c8c8c8' : pickFrom(r, HAIR_COLORS);
    const topC = pickFrom(r, TOP_COLORS);
    const pantsC = pickFrom(r, PANTS);
    const female = npc.gender === '女';
    const eyeC = elementColorOf(npc.career ? npc.career.category : '');
    let style = 'short';
    if (npc.role === 'baby') style = 'kid';
    else if (npc.age >= 60) style = female ? 'bun' : 'bald';
    else if (npc.age < 16) style = 'kid';
    else if (female) style = ['long', 'ponytail', 'curly', 'short'][seed % 4];
    else style = seed % 3 === 0 ? 'curly' : 'short';
    const glasses = npc.age >= 55 || npc.id === 'n13' || npc.id === 'n12' || (seed % 5 === 0);
    const w = size, h = size;
    const cx = w / 2;
    const headY = 29, headR = 21;
    const top = headY - headR;
    const hair = chibiHair(style, cx, headY, headR, hairC);
    const browY = headY - headR * 0.24;
    const browTilt = seed % 3 === 0 ? -1.6 : (seed % 3 === 1 ? 1.6 : 0);
    const mouth = mood === 'sleep'
      ? `<path d="M${cx - 4} ${headY + 7} q2 2 4 0" fill="none" stroke="#b06a4a" stroke-width="1.6" stroke-linecap="round"/>`
      : mood === 'happy'
        ? `<path d="M${cx - 5.5} ${headY + 6} Q${cx} ${headY + 10.5} ${cx + 5.5} ${headY + 6} Z" fill="#e8796f" stroke="#b06a4a" stroke-width="1"/>`
        : mood === 'tired'
          ? `<path d="M${cx - 4} ${headY + 6.5} q2 1.6 4 0" fill="none" stroke="#b06a4a" stroke-width="1.6" stroke-linecap="round"/>`
          : seed % 4 === 0
            ? `<path d="M${cx - headR * 0.18} ${headY + headR * 0.4} Q${cx} ${headY + headR * 0.55} ${cx + headR * 0.18} ${headY + headR * 0.4} Z" fill="#e8796f" stroke="#b06a4a" stroke-width="1.2"/>`
            : `<path d="M${cx - headR * 0.18} ${headY + headR * 0.34} Q${cx} ${headY + headR * 0.5} ${cx + headR * 0.18} ${headY + headR * 0.34}" fill="none" stroke="#b06a4a" stroke-width="2" stroke-linecap="round"/>`;
    const skirt = female ? `<path d="M${cx - 13} 64 L${cx - 16} 81 L${cx + 16} 81 L${cx + 13} 64 Q${cx} 61 ${cx - 13} 64 Z" fill="${shade(topC, -10)}" stroke="#3a3a4a" stroke-width="1.6"/>` : '';
    const figScale = size / 98;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
      <defs>
        <radialGradient id="face" cx="0.42" cy="0.35" r="0.85">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/>
          <stop offset="1" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="head3d" cx="0.36" cy="0.3" r="0.95">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.4"/>
          <stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="1" stop-color="#241638" stop-opacity="0.26"/>
        </radialGradient>
        <linearGradient id="body3d" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
          <stop offset="0.32" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="0.72" stop-color="#1a1230" stop-opacity="0.14"/>
          <stop offset="1" stop-color="#120a26" stop-opacity="0.32"/>
        </linearGradient>
      </defs>
      <g transform="translate(${cx},${size}) scale(${figScale}) translate(${-cx},-97)">
      <ellipse class="aura" cx="${cx}" cy="60" rx="31" ry="36" fill="${eyeC}" opacity=".14"/>
      <ellipse cx="${cx}" cy="92" rx="26" ry="4" fill="rgba(60,40,20,.22)"/>
      <ellipse cx="${cx}" cy="92" rx="14" ry="2.4" fill="rgba(30,18,8,.3)"/>
      <g class="leg-l"><rect x="${cx - 9}" y="80" width="8" height="11" rx="3" fill="${pantsC}" stroke="#3a3a4a" stroke-width="1.4"/><ellipse cx="${cx - 5}" cy="92.5" rx="5.5" ry="3" fill="#5a3a2a" stroke="#3a3a4a" stroke-width="1.2"/></g>
      <g class="leg-r"><rect x="${cx + 1}" y="80" width="8" height="11" rx="3" fill="${pantsC}" stroke="#3a3a4a" stroke-width="1.4"/><ellipse cx="${cx + 5}" cy="92.5" rx="5.5" ry="3" fill="#5a3a2a" stroke="#3a3a4a" stroke-width="1.2"/></g>
      <path d="M${cx - 15} 52 Q${cx - 17} 65 ${cx - 13} 80 L${cx + 13} 80 Q${cx + 17} 65 ${cx + 15} 52 Q${cx} 48 ${cx - 15} 52 Z" fill="${topC}" stroke="#3a3a4a" stroke-width="2"/>
      ${skirt}
      ${chibiOutfit(npc, cx, 52, headR, topC, female, eyeC)}
      <g class="arm-l"><path d="M${cx - 14} 54 Q${cx - 22} 62 ${cx - 19} 72" fill="none" stroke="${skin}" stroke-width="5.5" stroke-linecap="round"/></g>
      <g class="arm-r"><path d="M${cx + 14} 54 Q${cx + 22} 62 ${cx + 19} 72" fill="none" stroke="${skin}" stroke-width="5.5" stroke-linecap="round"/></g>
      ${PROPS[npc.career ? npc.career.category : ''] ? `<text class="prop" x="${cx + 21}" y="70" font-size="11">${PROPS[npc.career.category]}</text>` : ''}
      <circle cx="${cx}" cy="${headY}" r="${headR}" fill="${skin}"/>
      <circle cx="${cx}" cy="${headY}" r="${headR}" fill="url(#face)"/>
      ${hair}
      ${chibiHeadwear(npc, cx, top, headR)}
      ${drawEyes(mood, cx, headY, headR, eyeC, female)}
      <path d="M${cx - 11} ${browY} q3 ${browTilt} 6 0" stroke="#5c432e" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M${cx + 5} ${browY} q3 ${browTilt} 6 0" stroke="#5c432e" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M${cx} ${headY + 3} q1.4 1.6 0 2.6" stroke="#c98a6b" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      ${glasses ? `<circle cx="${cx - 7.5}" cy="${headY - 1}" r="4.2" fill="none" stroke="#5b5b70" stroke-width="1.5"/><circle cx="${cx + 7.5}" cy="${headY - 1}" r="4.2" fill="none" stroke="#5b5b70" stroke-width="1.5"/><path d="M${cx - 3.3} ${headY - 1} L${cx + 3.3} ${headY - 1}" stroke="#5b5b70" stroke-width="1.5"/>` : ''}
      <circle cx="${cx - 12}" cy="${headY + 6}" r="2.2" fill="#f7a8b8" opacity=".6"/>
      <circle cx="${cx + 12}" cy="${headY + 6}" r="2.2" fill="#f7a8b8" opacity=".6"/>
      ${mouth}
      <!-- 3D 体积光：左亮右暗 + 颈部投影 -->
      <circle cx="${cx}" cy="${headY}" r="${headR}" fill="url(#head3d)" pointer-events="none"/>
      <ellipse cx="${cx}" cy="${headY + headR * 0.62}" rx="${headR * 0.72}" ry="${headR * 0.22}" fill="rgba(40,22,10,.18)"/>
      <path d="M${cx - 16} 50 Q${cx - 18} 66 ${cx - 14} 82 L${cx + 14} 82 Q${cx + 18} 66 ${cx + 16} 50 Z" fill="url(#body3d)" opacity=".5" pointer-events="none"/>
      <path d="M${cx - 9} 80 h8 v12 h-8 Z M${cx + 1} 80 h8 v12 h-8 Z" fill="url(#body3d)" opacity=".55" pointer-events="none"/>
      </g>
    </svg>`;
  }

  function avatarDataUri(npc, size, mood) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(avatarSvg(npc, size, mood));
  }

  window.AvatarSvg = { avatarSvg, avatarDataUri, hashSeed };
})();

