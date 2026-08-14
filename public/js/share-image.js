// 未来致远 · 一键生成分享图（零依赖 Canvas 2D）
const FONT = '"Microsoft YaHei", "PingFang SC", sans-serif';

function setup(w = 1080, h = 1440) {
  const canvas = document.createElement('canvas');
  canvas.width = w * 2; canvas.height = h * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  return { canvas, ctx };
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function fillRR(ctx, x, y, w, h, r, color) {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}
function text(ctx, str, x, y, { size = 40, weight = 'bold', color = '#ffffff', align = 'center', alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = weight + ' ' + size + 'px ' + FONT;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
  ctx.restore();
}
function chip(ctx, x, y, label, { bg = 'rgba(255,255,255,.14)', color = '#ffd28a', size = 24 } = {}) {
  ctx.font = size + 'px ' + FONT;
  const w = ctx.measureText(label).width + 40;
  fillRR(ctx, x, y, w, 52, 26, bg);
  text(ctx, label, x + w / 2, y + 27, { size, weight: '600', color, align: 'center' });
  return w;
}
function brand(ctx, x, y) {
  text(ctx, '🌅', x, y, { size: 40 });
  text(ctx, '未来致远', x + 54, y, { size: 40, weight: '900' });
  text(ctx, '你的人生，自己导航', x + 300, y, { size: 22, color: 'rgba(255,255,255,.6)', weight: '600' });
}
function baseBackground(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1a2440');
  g.addColorStop(0.55, '#26345c');
  g.addColorStop(1, '#3d3a63');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // 顶部光晕
  const sun = ctx.createRadialGradient(w - 80, 120, 20, w - 80, 120, 260);
  sun.addColorStop(0, 'rgba(255,140,66,.5)');
  sun.addColorStop(1, 'rgba(255,140,66,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(80, h - 120, 20, 80, h - 120, 240);
  glow.addColorStop(0, 'rgba(74,163,194,.35)');
  glow.addColorStop(1, 'rgba(74,163,194,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  // 点状装饰（克制）
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  for (let i = 0; i < 60; i++) {
    const x = (i * 97 + 31) % w;
    const y = (i * 53 + 17) % h;
    ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
  }
}
function footer(ctx, w, h) {
  text(ctx, '—— 未来致远 · 分数决定起点，你决定终点 ——', w / 2, h - 70, { size: 24, color: 'rgba(255,255,255,.55)', weight: '600' });
  text(ctx, '🌅 你的人生，自己导航', w / 2, h - 34, { size: 20, color: 'rgba(255,255,255,.35)', weight: '600' });
}

// ---------- 年度报告分享图 ----------
export function reportShareImage(report, user) {
  const { canvas, ctx } = setup();
  const w = 1080, h = 1440;
  baseBackground(ctx, w, h);
  brand(ctx, 80, 90);
  // 标题
  text(ctx, report.year + ' · 年度人生白皮书', w / 2, 250, { size: 56, weight: '900' });
  text(ctx, (user && user.nickname ? user.nickname + ' 的' : '我的') + '一年', w / 2, 330, { size: 40, color: '#ffd28a', weight: '900' });
  // 数据卡
  const cards = [
    ['足迹', report.total],
    ['类型', Object.keys(report.byType || {}).length],
    ['评分', report.score]
  ];
  cards.forEach((c, i) => {
    const x = 80 + i * 340;
    fillRR(ctx, x, 430, 300, 170, 20, 'rgba(255,255,255,.1)');
    text(ctx, String(c[1]), x + 150, 505, { size: 66, weight: '900' });
    text(ctx, c[0], x + 150, 570, { size: 24, color: 'rgba(255,255,255,.65)' });
  });
  // 年度关键词
  const top = Object.entries(report.byType || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
  let cx = 80;
  text(ctx, '年度关键词', 80, 690, { size: 26, color: 'rgba(255,255,255,.6)', align: 'left', weight: '600' });
  ctx.font = '24px ' + FONT;
  top.forEach(([k, v]) => {
    const label = '#' + k + ' × ' + v;
    const wid = ctx.measureText(label).width + 40;
    chip(ctx, cx, 730, label, { bg: 'rgba(255,255,255,.12)' });
    cx += wid + 16;
  });
  if (!top.length) chip(ctx, cx, 730, '# 这一年，从记录开始');
  // 高光时刻
  const hs = (report.highlights || []).slice(0, 3);
  text(ctx, '年度高光时刻', 80, 860, { size: 26, color: 'rgba(255,255,255,.6)', align: 'left', weight: '600' });
  hs.forEach((item, i) => {
    const y = 920 + i * 110;
    fillRR(ctx, 80, y, 920, 84, 16, 'rgba(255,255,255,.08)');
    text(ctx, '✦', 110, y + 42, { size: 24, color: '#ffd28a', align: 'left' });
    text(ctx, String(item.title || '').slice(0, 22), 150, y + 42, { size: 26, color: '#fff', align: 'left', weight: '600' });
    text(ctx, String(item.date || '').slice(0, 10), 940, y + 42, { size: 20, color: 'rgba(255,255,255,.5)', align: 'right' });
  });
  if (!hs.length) text(ctx, '新的一年，从记录开始', w / 2, 960, { size: 28, color: 'rgba(255,255,255,.6)' });
  footer(ctx, w, h);
  return canvas;
}

// ---------- 测评画像分享图 ----------
export function profileShareImage(data) {
  const { canvas, ctx } = setup();
  const w = 1080, h = 1440;
  baseBackground(ctx, w, h);
  brand(ctx, 80, 90);
  text(ctx, '我的职业画像', w / 2, 240, { size: 58, weight: '900' });
  text(ctx, (data.nickname || '我') + ' · ' + data.date, w / 2, 320, { size: 32, color: '#ffd28a', weight: '700' });
  // 兴趣代码
  fillRR(ctx, 80, 400, 920, 150, 20, 'rgba(255,255,255,.1)');
  text(ctx, '兴趣代码', 150, 452, { size: 24, color: 'rgba(255,255,255,.6)', align: 'left', weight: '600' });
  const codes = (data.interestTop || []).slice(0, 3);
  let cxx = 150;
  ctx.font = '26px ' + FONT;
  codes.forEach(c => {
    const label = c.key + ' ' + c.score;
    const wid = ctx.measureText(label).width + 40;
    chip(ctx, cxx, 492, label, { bg: 'rgba(255,140,66,.28)', color: '#ffd28a', size: 26 });
    cxx += wid + 14;
  });
  // 性格一句话
  text(ctx, '性格画像', 80, 630, { size: 26, color: 'rgba(255,255,255,.6)', align: 'left', weight: '600' });
  const desc = (data.personalityDesc || '').slice(0, 40);
  text(ctx, desc, 80, 700, { size: 30, color: '#fff', align: 'left', weight: '600' });
  // 推荐职业
  text(ctx, 'AI 为你推荐', 80, 820, { size: 26, color: 'rgba(255,255,255,.6)', align: 'left', weight: '600' });
  (data.recs || []).slice(0, 3).forEach((r, i) => {
    const y = 870 + i * 120;
    fillRR(ctx, 80, y, 920, 92, 18, 'rgba(255,255,255,.1)');
    fillRR(ctx, 80, y, 8, 92, 4, i === 0 ? '#ff8c42' : 'rgba(255,255,255,.3)');
    text(ctx, String(i + 1), 120, y + 46, { size: 26, color: 'rgba(255,255,255,.5)' });
    text(ctx, String(r.name || ''), 170, y + 46, { size: 30, color: '#fff', align: 'left', weight: '800' });
    text(ctx, '匹配 ' + (r.match || r.probability || '') + '%', 940, y + 46, { size: 24, color: '#ffd28a', align: 'right', weight: '700' });
  });
  footer(ctx, w, h);
  return canvas;
}

export function canvasDataURL(canvas) { return canvas.toDataURL('image/png'); }
export function downloadCanvas(canvas, filename) {
  const a = document.createElement('a');
  a.href = canvasDataURL(canvas);
  a.download = filename || 'share.png';
  a.click();
}
// 分享图预览弹层
export function showShareModal(canvas, filename) {
  const mask = document.createElement('div');
  mask.style.cssText = 'position:fixed;inset:0;z-index:400;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px)';
  mask.innerHTML = `
    <div style="background:#fff;border-radius:20px;max-width:440px;width:100%;padding:22px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.3)">
      <b style="font-size:17px;color:#1a2440">🎉 长按图片保存，分享到朋友圈</b>
      <img id="sharePreview" style="width:100%;border-radius:12px;margin:14px 0;border:1px solid #eee" alt="分享图">
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button id="shareDownload" style="background:linear-gradient(120deg,#ff8c42,#f26d1d);color:#fff;border:0;border-radius:12px;padding:10px 22px;font-size:14px;font-weight:700;cursor:pointer">💾 保存到相册/电脑</button>
        <button id="shareClose" style="background:#f0ece6;color:#667085;border:0;border-radius:12px;padding:10px 22px;font-size:14px;font-weight:600;cursor:pointer">关 闭</button>
      </div>
      <p style="font-size:12px;color:#98a2b3;margin-top:10px">手机端：长按图片即可保存</p>
    </div>`;
  document.body.appendChild(mask);
  mask.querySelector('#sharePreview').src = canvasDataURL(canvas);
  mask.querySelector('#shareDownload').addEventListener('click', () => downloadCanvas(canvas, filename));
  mask.querySelector('#shareClose').addEventListener('click', () => mask.remove());
  mask.addEventListener('click', e => { if (e.target === mask) mask.remove(); });
}

// ---------- 成长周报分享图 ----------
export function weeklyShareImage(report, user) {
  const { canvas, ctx } = setup();
  const w = 1080, h = 1200;
  baseBackground(ctx, w, h);
  brand(ctx, 80, 80);
  text(ctx, '本周成长小结', w / 2, 200, { size: 56, weight: '900' });
  text(ctx, (user && user.nickname ? user.nickname + ' 的' : '我的') + '一周', w / 2, 280, { size: 36, color: '#ffd28a', weight: '700' });
  // 数据卡
  const cards = [
    ['足迹', report.total],
    ['打卡', report.checkins],
    ['发帖', report.posts],
    ['胶囊', report.capsules]
  ];
  cards.forEach((c2, i) => {
    const x = 60 + i * 250;
    fillRR(ctx, x, 360, 220, 150, 18, 'rgba(255,255,255,.1)');
    text(ctx, String(c2[1]), x + 110, 440, { size: 60, weight: '900' });
    text(ctx, c2[0], x + 110, 490, { size: 22, color: 'rgba(255,255,255,.6)' });
  });
  // 主要类型
  const top = Object.entries(report.byType || {}).sort((a, b) => b[1] - a[1]).slice(0, 3);
  text(ctx, '本周关键词', 80, 600, { size: 26, color: 'rgba(255,255,255,.6)', align: 'left', weight: '600' });
  let cx = 80;
  ctx.font = '24px ' + FONT;
  top.forEach(([k, v]) => {
    const label = '#' + k + ' × ' + v;
    const wid = ctx.measureText(label).width + 40;
    chip(ctx, cx, 640, label, { bg: 'rgba(255,255,255,.12)' });
    cx += wid + 14;
  });
  if (!top.length) chip(ctx, cx, 640, '# 本周在积蓄力量');
  // 寄语
  const lines = [
    report.total > 0 ? '这一周你留下了 ' + report.total + ' 个脚印，坚持本身就是答案。' : '这一周安静了些，没关系，成长有时是默默扎根。',
    report.checkins > 0 ? '连续打卡 ' + report.checkins + ' 次，习惯正在形成。' : '记得回来打个卡，让坚持看得见。',
    '每一步都算数。'
  ];
  text(ctx, lines[0], 80, 800, { size: 28, color: '#fff', align: 'left', weight: '600' });
  text(ctx, lines[1], 80, 860, { size: 26, color: 'rgba(255,255,255,.8)', align: 'left' });
  text(ctx, lines[2], 80, 930, { size: 28, color: '#ffd28a', align: 'left', weight: '700' });
  footer(ctx, w, h);
  return canvas;
}

// ---------- 成就墙分享图 ----------
export function achievementShareImage(data) {
  const { canvas, ctx } = setup(1080, 1300);
  const w = 1080, h = 1300;
  baseBackground(ctx, w, h);
  brand(ctx, 80, 80);
  text(ctx, '我的成就墙', w / 2, 200, { size: 54, weight: '900' });
  text(ctx, (data.nickname || '我') + ' · 未来致远的成长足迹', w / 2, 275, { size: 30, color: '#ffd28a', weight: '700' });
  // 统计卡
  const cards = [['足迹', data.events], ['徽章', data.badges.length], ['连续打卡', data.streak + '天'], ['成长指数', data.growthIndex]];
  cards.forEach((c2, i) => {
    const x = 60 + i * 250;
    fillRR(ctx, x, 340, 220, 150, 18, 'rgba(255,255,255,.1)');
    text(ctx, String(c2[1]), x + 110, 420, { size: 58, weight: '900' });
    text(ctx, c2[0], x + 110, 470, { size: 22, color: 'rgba(255,255,255,.6)' });
  });
  // 徽章网格
  const badges = data.badges.slice(0, 12);
  text(ctx, '已解锁徽章', 80, 590, { size: 26, color: 'rgba(255,255,255,.6)', align: 'left', weight: '600' });
  badges.forEach((b, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 90 + col * 245, y = 640 + row * 160;
    fillRR(ctx, x, y, 215, 130, 16, 'rgba(255,255,255,.1)');
    text(ctx, b.icon || '🏅', x + 107, y + 48, { size: 40 });
    text(ctx, String(b.name || '').slice(0, 6), x + 107, y + 96, { size: 20, color: 'rgba(255,255,255,.85)' });
  });
  if (!badges.length) text(ctx, '解锁第一枚徽章，点亮你的成就墙', w / 2, 700, { size: 26, color: 'rgba(255,255,255,.6)' });
  footer(ctx, w, h);
  return canvas;
}
