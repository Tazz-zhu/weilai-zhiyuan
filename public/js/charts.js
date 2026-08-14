// 未来致远 · 轻量 SVG 图表库（零依赖）

const SVGNS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
}

// ---------- 四维雷达图 ----------
export function radarChart(container, { labels = ['收入', '压力', '前景', '门槛'], values = [70, 60, 80, 50], color = '#ff8c42', max = 100, size = 240, labelsEn = null }) {
  if (!container) return;
  container.innerHTML = '';
  const cx = size / 2, cy = size / 2, R = size * 0.34;
  const svg = el('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size });
  container.appendChild(svg);

  const n = labels.length;
  const pt = (i, r) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };

  // 网格
  for (let ring = 1; ring <= 4; ring++) {
    const r = (R / 4) * ring;
    const pts = Array.from({ length: n }, (_, i) => pt(i, r).join(',')).join(' ');
    el('polygon', { points: pts, fill: 'none', stroke: '#eee5da', 'stroke-width': 1 }, svg);
  }
  // 轴线
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(i, R);
    el('line', { x1: cx, y1: cy, x2: x, y2: y, stroke: '#eee5da', 'stroke-width': 1 }, svg);
  }
  // 数值多边形（渐变填充）
  const norm = values.map(v => Math.max(0, Math.min(max, v)) / max);
  const dataPts = norm.map((v, i) => pt(i, R * v).join(',')).join(' ');
  const defs = el('defs', {}, svg);
  const lg = el('linearGradient', { id: 'radarGrad', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
  el('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '.5' }, lg);
  el('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '.06' }, lg);
  el('polygon', { points: dataPts, fill: 'url(#radarGrad)', stroke: color, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, svg);
  // 顶点发光
  norm.forEach((v, i) => {
    const [x, y] = pt(i, R * v);
    el('circle', { cx: x, cy: y, r: 7, fill: color, 'fill-opacity': '.18' }, svg);
    el('circle', { cx: x, cy: y, r: 3.5, fill: '#fff', stroke: color, 'stroke-width': 2 }, svg);
  });
  // 标签
  labels.forEach((lb, i) => {
    const [x, y] = pt(i, R + 24);
    el('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': 12, fill: '#6b7280', 'font-weight': 600 }, svg).textContent = lb;
    const [x2, y2] = pt(i, R - 14);
    el('text', { x: x2, y: y2, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': 11, fill: '#2b2f3a', 'font-weight': 800 }, svg).textContent = values[i];
  });
}

// ---------- 环形仪表盘 ----------
export function donutGauge(container, { value, max = 100, label = '', color = '#ff8c42', size = 120, suffix = '' }) {
  if (!container) return;
  container.innerHTML = '';
  const pct = Math.max(0, Math.min(1, value / max));
  const svg = el('svg', { viewBox: '0 0 120 120', width: size, height: size });
  container.appendChild(svg);
  const r = 46, cx = 60, cy = 60, circ = 2 * Math.PI * r;
  el('circle', { cx, cy, r, fill: 'none', stroke: '#f0ece6', 'stroke-width': 11 }, svg);
  const defs = el('defs', {}, svg);
  const lg = el('linearGradient', { id: 'gaugeGrad', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#ffd28a' }, lg);
  el('stop', { offset: '100%', 'stop-color': color }, lg);
  const arc = el('circle', { cx, cy, r, fill: 'none', stroke: 'url(#gaugeGrad)', 'stroke-width': 11, 'stroke-linecap': 'round',
    'stroke-dasharray': `${circ * pct} ${circ}`, transform: `rotate(-90 ${cx} ${cy})` }, svg);
  el('circle', { cx, cy, r, fill: 'none', stroke: color, 'stroke-width': 3, 'stroke-opacity': '.18', 'stroke-dasharray': `${circ * pct} ${circ}`, transform: `rotate(-90 ${cx} ${cy})` }, svg);
  arc.style.transition = 'stroke-dasharray .9s ease';
  const t = el('text', { x: cx, y: cy - 2, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 900, fill: '#2b2f3a' }, svg);
  t.textContent = Math.round(value) + suffix;
  el('text', { x: cx, y: cy + 18, 'text-anchor': 'middle', 'font-size': 10, fill: '#9ca3af' }, svg).textContent = label;
}

// ---------- 横向条形列表 ----------
export function barList(container, items, { color = '#ff8c42', unit = '' } = {}) {
  if (!container) return;
  container.innerHTML = '';
  for (const it of items) {
    const row = document.createElement('div');
    row.className = 'bar-row';
    const lb = document.createElement('span'); lb.className = 'bar-label'; lb.textContent = it.label;
    const track = document.createElement('div'); track.className = 'bar-track';
    const fill = document.createElement('div'); fill.className = 'bar-fill';
    fill.style.width = '0%';
    fill.style.background = it.color || color;
    track.appendChild(fill);
    const val = document.createElement('span'); val.className = 'bar-val'; val.textContent = (it.value ?? 0) + unit;
    row.append(lb, track, val);
    container.appendChild(row);
    requestAnimationFrame(() => { fill.style.width = Math.max(0, Math.min(100, it.value)) + '%'; });
  }
}

// ---------- 月度柱状图（年度报告） ----------
export function monthBars(container, months, { color = '#ff8c42', height = 140 } = {}) {
  if (!container) return;
  container.innerHTML = '';
  const max = Math.max(1, ...months.map(m => m.count));
  const svg = el('svg', { viewBox: '0 0 340 150', width: '100%', style: 'max-width:520px' });
  container.appendChild(svg);
  const bw = 18, gap = (340 - 12 * bw) / 13, base = 128;
  months.forEach((m, i) => {
    const h = (m.count / max) * 92;
    const x = gap + i * (bw + gap);
    const defs = el('defs', {}, svg);
    const lg = el('linearGradient', { id: 'barGrad' + i, x1: '0', y1: '1', x2: '0', y2: '0' }, defs);
    el('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '.55' }, lg);
    el('stop', { offset: '100%', 'stop-color': '#ffd28a' }, lg);
    const bar = el('rect', { x, y: base - h, width: bw, height: Math.max(h, m.count > 0 ? 3 : 1), rx: 4, fill: m.count > 0 ? 'url(#barGrad' + i + ')' : '#eee5da' }, svg);
    bar.style.transition = 'height .6s ease';
    el('text', { x: x + bw / 2, y: base + 14, 'text-anchor': 'middle', 'font-size': 9, fill: '#9ca3af' }, svg).textContent = m.month + '月';
    if (m.count > 0) el('text', { x: x + bw / 2, y: base - h - 5, 'text-anchor': 'middle', 'font-size': 9, fill: '#6b7280', 'font-weight': 700 }, svg).textContent = m.count;
  });
}

// ---------- 彩色头像 ----------
const AVATAR_COLORS = ['#7c6cf0', '#4aa3c2', '#e8a04c', '#e86a8a', '#5aa86b', '#c270d8', '#6a9fd8', '#d8962c', '#4caf9a', '#ff8c42'];
export function avatarColor(seed) {
  let h = 0;
  const s = String(seed || 'x');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
export function avatarHtml(name, size = '') {
  const color = avatarColor(name);
  const ch = (name || '?').slice(0, 1);
  return `<span class="avatar ${size}" style="background:${color}">${ch}</span>`;
}

// ---------- 霍兰德六边形 ----------
export function hexagonChart(container, scores, { size = 250, labels = { R: '实际型', I: '研究型', A: '艺术型', S: '社会型', E: '企业型', C: '事务型' } } = {}) {
  if (!container) return;
  container.innerHTML = '';
  const n = 6;
  const cx = size / 2, cy = size / 2, R = size * 0.33;
  const svg = el('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size });
  container.appendChild(svg);
  const pt = (i, r) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  for (let ring = 1; ring <= 4; ring++) {
    const r = (R / 4) * ring;
    const pts = Array.from({ length: n }, (_, i) => pt(i, r).join(',')).join(' ');
    el('polygon', { points: pts, fill: 'none', stroke: '#eee5da', 'stroke-width': 1 }, svg);
  }
  const order = ['R', 'I', 'A', 'S', 'E', 'C'];
  const max = Math.max(1, ...order.map(k => scores[k] || 0));
  const dataPts = order.map((k, i) => pt(i, R * ((scores[k] || 0) / max)).join(',')).join(' ');
  el('polygon', { points: dataPts, fill: 'url(#hexGrad)', 'fill-opacity': 0.25, stroke: '#7c6cf0', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, svg);
  // gradient def
  const defs = el('defs', {}, svg);
  const lg = el('linearGradient', { id: 'hexGrad', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#7c6cf0' }, lg);
  el('stop', { offset: '100%', 'stop-color': '#4aa3c2' }, lg);
  order.forEach((k, i) => {
    const [x, y] = pt(i, R * ((scores[k] || 0) / max));
    el('circle', { cx: x, cy: y, r: 3.5, fill: '#fff', stroke: '#7c6cf0', 'stroke-width': 2 }, svg);
    const [lx, ly] = pt(i, R + 22);
    el('text', { x: lx, y: ly, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': 11.5, fill: '#6b7280', 'font-weight': 700 }, svg).textContent = labels[k];
    const [sx, sy] = pt(i, R - 13);
    el('text', { x: sx, y: sy, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': 11, fill: '#2b2f3a', 'font-weight': 900 }, svg).textContent = scores[k] || 0;
  });
}

// ---------- 趋势面积图（近6个月） ----------
export function trendLine(container, data, { color = '#ff8c42', height = 150, width = 320 } = {}) {
  if (!container) return;
  container.innerHTML = '';
  const max = Math.max(1, ...data.map(d => d.count));
  const pad = 16;
  const innerW = width - pad * 2, innerH = height - 26;
  const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', style: 'max-width:' + width + 'px' });
  container.appendChild(svg);
  const n = data.length;
  const X = (i) => pad + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const Y = (v) => 10 + innerH - (v / max) * innerH;
  // 网格线
  for (let g = 0; g <= 3; g++) {
    const y = 10 + (innerH * g) / 3;
    el('line', { x1: pad, y1: y, x2: width - pad, y2: y, stroke: '#f0ece6', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, svg);
  }
  // 面积
  const pts = data.map((d, i) => X(i) + ',' + Y(d.count));
  const area = pad + ',' + (10 + innerH) + ' ' + pts.join(' ') + ' ' + (width - pad) + ',' + (10 + innerH);
  el('polygon', { points: area, fill: color, 'fill-opacity': 0.12 }, svg);
  // 折线
  const line = el('polyline', { points: pts.join(' '), fill: 'none', stroke: color, 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
  line.style.transition = 'opacity .6s';
  // 点与标签
  data.forEach((d, i) => {
    const x = X(i), y = Y(d.count);
    el('circle', { cx: x, cy: y, r: 3.6, fill: '#fff', stroke: color, 'stroke-width': 2.2 }, svg);
    el('text', { x, y: 10 + innerH + 14, 'text-anchor': 'middle', 'font-size': 10, fill: '#9ca3af' }, svg).textContent = d.label;
    if (d.count > 0) el('text', { x, y: y - 7, 'text-anchor': 'middle', 'font-size': 10, fill: '#6b7280', 'font-weight': 800 }, svg).textContent = d.count;
  });
}

// ---------- 薪资区间条 ----------
export function salaryRangeBar(container, range, { min = 0, max = 100, color = '#4caf9a' } = {}) {
  if (!container) return;
  container.innerHTML = '';
  const lo = Math.max(min, range.min), hi = Math.min(max, range.max);
  const track = document.createElement('div');
  track.className = 'bar-track';
  track.style.cssText = 'position:relative;height:14px;border-radius:100px;background:linear-gradient(90deg,#f0ece6,#e8e2d8);overflow:visible;flex:none';
  const bar = document.createElement('div');
  bar.style.cssText = `position:absolute;top:0;left:${((lo - min) / (max - min)) * 100}%;width:${Math.max(4, ((hi - lo) / (max - min)) * 100)}%;height:14px;border-radius:100px;background:linear-gradient(90deg,${color},#7ee0c0);box-shadow:0 2px 8px rgba(76,175,154,.4)`;
  track.appendChild(bar);
  const loMark = document.createElement('span');
  loMark.style.cssText = 'position:absolute;left:' + ((lo - min) / (max - min)) * 100 + '%;top:18px;transform:translateX(-50%);font-size:11px;font-weight:800;color:' + color;
  loMark.textContent = range.min + 'K';
  const hiMark = document.createElement('span');
  hiMark.style.cssText = 'position:absolute;left:' + ((hi - min) / (max - min)) * 100 + '%;top:18px;transform:translateX(-50%);font-size:11px;font-weight:800;color:' + color;
  hiMark.textContent = range.max + 'K';
  container.appendChild(track);
  container.appendChild(loMark);
  container.appendChild(hiMark);
}

// ---------- 概率环（中心大数字） ----------
export function probRing(container, { value, label = '成功率', size = 96, color = '#ff8c42' } = {}) {
  if (!container) return;
  container.innerHTML = '';
  const pct = Math.max(0, Math.min(1, value / 100));
  const svg = el('svg', { viewBox: '0 0 96 96', width: size, height: size });
  container.appendChild(svg);
  const r = 38, cx = 48, cy = 48, circ = 2 * Math.PI * r;
  el('circle', { cx, cy, r, fill: 'none', stroke: '#f0ece6', 'stroke-width': 8 }, svg);
  const defs = el('defs', {}, svg);
  const lg = el('linearGradient', { id: 'probGrad', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#ffd28a' }, lg);
  el('stop', { offset: '100%', 'stop-color': color }, lg);
  el('circle', { cx, cy, r, fill: 'none', stroke: 'url(#probGrad)', 'stroke-width': 8, 'stroke-linecap': 'round',
    'stroke-dasharray': `${circ * pct} ${circ}`, transform: `rotate(-90 ${cx} ${cy})` }, svg);
  el('text', { x: cx, y: cy - 1, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 900, fill: '#2b2f3a' }, svg).textContent = Math.round(value) + '%';
  el('text', { x: cx, y: cy + 15, 'text-anchor': 'middle', 'font-size': 8, fill: '#9ca3af' }, svg).textContent = label;
}

// ---------- 数字滚动动画 ----------
export function countUp(el, target, { duration = 1000, suffix = '' } = {}) {
  if (!el) return;
  const start = performance.now();
  const from = 0;
  function tick(t) {
    const p = Math.min(1, (t - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (target - from) * eased) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
