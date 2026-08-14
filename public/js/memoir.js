// 人生回忆录 · 主页（核心卖点聚合）
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, openModal, closeModal, toast, fmtDate, badgeToast, setBtnLoading } from './ui.js';
import { avatarHtml, donutGauge } from './charts.js';
import { weeklyShareImage, showShareModal } from './share-image.js';

const user = await bootstrap('memoir', { auth: true, redirect: 'index.html?login=1' });
if (!user) { /* 已重定向 */ }

const TYPE_EMOJI = { 学习: '📚', 实习: '💼', 获奖: '🏆', 跳槽: '🔄', 创业: '🚀', 旅行: '✈️', 其他: '📌' };

async function load() {
  const [dashR, tlR, capR, reportR] = await Promise.all([
    api.get('/api/dashboard').catch(() => null),
    api.get('/api/timeline').catch(() => null),
    api.get('/api/capsules').catch(() => null),
    api.get('/api/report/' + new Date().getFullYear()).catch(() => null)
  ]);
  const d = dashR ? dashR.dashboard : null;
  const events = tlR ? tlR.events : [];
  const capsules = capR ? capR.capsules : [];
  const report = reportR ? reportR.report : null;

  // 人生天数：从最早记录（或注册）到今天
  let startTs = (user && user.created_at) ? new Date(user.created_at).getTime() : Date.now();
  if (events.length) {
    const first = new Date(Math.min(...events.map(e => new Date(e.date).getTime())));
    startTs = Math.min(startTs, first.getTime());
  }
  const lifeDays = Math.max(1, Math.round((Date.now() - startTs) / 86400000));

  // 即将开启的胶囊（未开启 & 未来）
  const upcoming = capsules.filter(c => c.sealed).sort((a, b) => a.open_date.localeCompare(b.open_date));

  // 封面
  const hero = document.getElementById('memoirHero');
  hero.innerHTML = `
    <div style="position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap">
      <div class="flex" style="gap:18px">
        ${avatarHtml(user.nickname, 'xl')}
        <div>
          <div class="flex" style="gap:10px;flex-wrap:wrap">
            <b style="font-size:26px;font-weight:900">${esc(user.nickname)} 的人生回忆录</b>
            ${d ? `<span class="tag" style="background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.2)">${d.levelIcon} Lv.${d.level} · ${esc(d.levelName)}</span>` : ''}
          </div>
          <p style="color:rgba(255,255,255,.75);font-size:14.5px;margin-top:8px">
            ${user.target ? '🎯 目标：' + esc(user.target) : '🌱 正在探索自己的方向'} · ${user.city ? '📍 ' + esc(user.city) : ''}
          </p>
          <p style="color:rgba(255,255,255,.5);font-size:13px;margin-top:4px">"每一份努力，都值得被记录、被看见、被珍藏"</p>
        </div>
      </div>
      <div style="display:flex;gap:30px;flex-wrap:wrap;text-align:center">
        <div><div style="font-size:34px;font-weight:900;background:linear-gradient(120deg,#fff,#ffd9b0);-webkit-background-clip:text;background-clip:text;color:transparent">${lifeDays}</div><div style="font-size:12.5px;color:rgba(255,255,255,.6)">人生已走过（天）</div></div>
        <div><div style="font-size:34px;font-weight:900;background:linear-gradient(120deg,#fff,#ffd9b0);-webkit-background-clip:text;background-clip:text;color:transparent">${events.length}</div><div style="font-size:12.5px;color:rgba(255,255,255,.6)">份足迹</div></div>
        <div><div style="font-size:34px;font-weight:900;background:linear-gradient(120deg,#fff,#ffd9b0);-webkit-background-clip:text;background-clip:text;color:transparent">${capsules.length}</div><div style="font-size:12.5px;color:rgba(255,255,255,.6)">颗时光胶囊</div></div>
        <div><div style="font-size:34px;font-weight:900;background:linear-gradient(120deg,#fff,#ffd9b0);-webkit-background-clip:text;background-clip:text;color:transparent">${dashR && dashR.badges ? dashR.badges.length : 0}</div><div style="font-size:12.5px;color:rgba(255,255,255,.6)">枚人生徽章</div></div>
      </div>
    </div>`;

  // 三个核心入口卡
  const cards = [
    { href: 'timeline.html', ic: '📖', color: 'var(--primary-soft)', text: 'var(--primary-strong)', title: '成长时光轴', desc: '把每一步都记下来，让努力看得见', data: events.length + ' 份足迹' },
    { href: 'capsules.html', ic: '⏳', color: 'var(--purple-soft)', text: '#5b4bd8', title: '时光胶囊', desc: '写给未来的自己，让时间见证约定', data: upcoming.length ? '下一颗还有 ' + daysTo(upcoming[0].open_date) + ' 天开启' : capsules.length + ' 颗胶囊' },
    { href: 'report.html', ic: '📊', color: 'var(--teal-soft)', text: '#1e8f72', title: '年度人生报告', desc: 'AI 为你生成专属年度人生白皮书', data: report ? report.score + ' 分成长评分' : '今年还没记录' }
  ];
  document.getElementById('memoirCards').innerHTML = cards.map(c => `
    <div class="card module-card" onclick="location.href='${c.href}'">
      <div class="mc-ic" style="background:${c.color};color:${c.text}">${c.ic}</div>
      <h3>${c.title}</h3>
      <p>${c.desc}</p>
      <div class="mc-tags"><span style="background:${c.color};color:${c.text}">${c.data}</span></div>
      <span class="mc-arrow">→</span>
    </div>`).join('');

  // 最近足迹
  const recent = [...events].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 4);
  document.getElementById('recentFootprints').innerHTML = recent.length ? recent.map(e => `
    <div class="flex" style="gap:12px;padding:10px 0;border-bottom:1px dashed var(--line);align-items:flex-start">
      <span style="font-size:24px">${TYPE_EMOJI[e.type] || '📌'}</span>
      <div style="flex:1;min-width:0">
        <div class="flex" style="gap:8px;flex-wrap:wrap"><b style="font-size:14.5px;color:var(--deep)">${esc(e.title)}</b><span class="muted" style="font-size:11.5px">${esc(fmtDate(e.date))}</span></div>
        ${e.description ? `<p style="font-size:12.5px;color:var(--text-2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.description)}</p>` : ''}
      </div>
      <span class="tag" style="font-size:11px">${esc(e.type)}</span>
    </div>`).join('') : `<div class="empty" style="padding:30px 10px"><div class="ic">🌱</div><h4>还没有足迹</h4><p>点下方按钮，记录第一件人生大事。</p></div>`;

  // 即将开启的胶囊
  document.getElementById('capsulePreview').innerHTML = upcoming.length ? upcoming.slice(0, 3).map(c => `
    <div class="flex" style="gap:12px;padding:11px 0;border-bottom:1px dashed var(--line);align-items:center">
      <span style="font-size:26px">📦</span>
      <div style="flex:1;min-width:0">
        <b style="font-size:14px;color:var(--deep)">${esc(c.title)}</b>
        <p class="muted" style="font-size:12px;margin-top:2px">${esc(fmtDate(c.open_date))} 开启 · 还剩 ${daysTo(c.open_date)} 天</p>
      </div>
      <span class="tag gold" style="font-size:11px">${daysTo(c.open_date)} 天</span>
    </div>`).join('') : `
    <div class="empty" style="padding:24px 10px"><div class="ic">⏳</div><h4>还没有时光胶囊</h4><p>给未来的自己写封信吧。</p></div>
    <div class="text-center mt-8"><a class="btn btn-primary btn-sm" href="capsules.html">💌 埋下一颗胶囊</a></div>`;

  // 成长里程碑
  const total = events.length;
  const streak = dashR && dashR.event_streak ? dashR.event_streak : 0;
  const milestones = [10, 50, 100, 200];
  let nextMile = milestones.find(m => total < m) || null;
  const mileProgress = nextMile ? Math.min(100, Math.round(total / nextMile * 100)) : 100;
  document.getElementById('milestoneBox').innerHTML = `
    <div class="grid grid-3" style="gap:14px">
      <div class="card" style="padding:16px;text-align:center;background:var(--primary-soft);border:0">
        <div style="font-size:28px;font-weight:900;color:var(--primary-strong)">${streak} 天</div>
        <div class="muted" style="font-size:12.5px">连续记录</div>
      </div>
      <div class="card" style="padding:16px;text-align:center;background:var(--accent-soft);border:0">
        <div style="font-size:28px;font-weight:900;color:var(--accent-strong)">${total} 条</div>
        <div class="muted" style="font-size:12.5px">累计足迹</div>
      </div>
      <div class="card" style="padding:16px;text-align:center;background:var(--teal-soft);border:0">
        <div style="font-size:28px;font-weight:900;color:var(--teal)">${nextMile ? nextMile - total + ' 条' : '🏆 达成'}</div>
        <div class="muted" style="font-size:12.5px">距下一里程碑</div>
      </div>
    </div>
    ${nextMile ? `
      <div class="mt-16">
        <div class="flex-between mb-8"><span class="muted" style="font-size:12.5px">足迹里程碑 ${total} / ${nextMile}</span><b style="font-size:13px;color:var(--deep)">${mileProgress}%</b></div>
        <div style="height:10px;background:var(--bg);border-radius:100px;overflow:hidden"><div style="height:100%;width:${mileProgress}%;background:linear-gradient(90deg,#ff8c42,#ffb45e);border-radius:100px;transition:width 1s"></div></div>
        <p class="muted mt-8" style="font-size:12px">继续记录，${nextMile - total} 条后解锁「${nextMile} 条足迹」里程碑 ✨</p>
      </div>` : '<p class="muted text-center mt-16" style="font-size:13px">🏆 已达成全部足迹里程碑，太棒了！</p>'}
  `;

  // 我的人生目标
  let goals = [];
  try { goals = (await api.get('/api/goals')).goals || []; } catch (e) {}
  document.getElementById('goalBox').innerHTML = goals.length ? goals.map(g => `
    <div class="card" style="padding:18px 20px;margin-bottom:14px;border-left:4px solid var(--primary)">
      <div class="flex-between flex-wrap" style="gap:10px">
        <div><b style="font-size:15.5px;color:var(--deep)">${esc(g.title)}</b>
        ${g.deadline ? '<span class="tag gold" style="font-size:11px">截止 ' + esc(g.deadline) + '</span>' : ''}
        ${g.eventCount ? '<span class="tag blue" style="font-size:11px">📖 ' + g.eventCount + ' 条足迹</span>' : ''}
        ${g.desc ? '<p class="muted" style="font-size:12.5px;margin-top:4px">' + esc(g.desc) + '</p>' : ''}</div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:900;color:var(--primary-strong)">${g.progress}%</div>
          <div style="width:140px;height:8px;background:var(--bg);border-radius:100px;overflow:hidden;margin-top:4px"><div style="height:100%;width:${g.progress}%;background:linear-gradient(90deg,#ff8c42,#ffb45e)"></div></div>
        </div>
      </div>
      ${g.milestones.length ? '<div class="mt-8" style="border-top:1px dashed var(--line);padding-top:8px">' + g.milestones.map((m, i) => `
        <div class="mile-row" style="padding:6px 0">
          <span class="mile-check ${m.done ? 'on' : ''}" data-g="${g.id}" data-i="${i}" data-done="${m.done ? 1 : 0}">${m.done ? '✓' : ''}</span>
          <span class="mile-text" style="${m.done ? 'text-decoration:line-through;color:var(--text-3)' : ''}">${esc(m.text)}</span>
        </div>`).join('') + '</div>' : ''}
      <div class="text-right mt-8"><button class="tl-del" data-delg="${g.id}" style="opacity:.6">删除目标</button></div>
    </div>`).join('')
    : '<div class="empty" style="padding:26px"><div class="ic">🎯</div><h4>还没有人生目标</h4><p>把想达成的事变成看得见的进度，一步步实现它。</p><button class="btn btn-primary btn-sm mt-8" id="emptyGoalBtn">设定第一个目标</button></div>';
  const egb = document.getElementById('emptyGoalBtn');
  if (egb) egb.addEventListener('click', openGoalModal);
  document.querySelectorAll('[data-delg]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('删除这个目标？')) return;
    await api.del('/api/goals/' + b.dataset.delg);
    toast('目标已删除', 'success');
    load();
  }));
  document.querySelectorAll('.mile-check[data-g]').forEach(chk => chk.addEventListener('click', async () => {
    const done = chk.dataset.done === '1';
    await api.patch('/api/goals/' + chk.dataset.g + '/milestone', { idx: parseInt(chk.dataset.i, 10), done: !done });
    load();
  }));

  // 本周成长小结
  let weekly = null;
  try { weekly = (await api.get('/api/report/weekly')).report; } catch (e) {}
  if (weekly) {
    const wTop = Object.entries(weekly.byType).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('weeklyBox').innerHTML = `
      <div class="grid grid-4" style="gap:12px">
        <div class="card" style="padding:14px;text-align:center;background:var(--primary-soft);border:0"><div style="font-size:24px;font-weight:900;color:var(--primary-strong)">${weekly.total}</div><div class="muted" style="font-size:12px">本周足迹</div></div>
        <div class="card" style="padding:14px;text-align:center;background:var(--teal-soft);border:0"><div style="font-size:24px;font-weight:900;color:var(--teal)">${weekly.checkins}</div><div class="muted" style="font-size:12px">打卡</div></div>
        <div class="card" style="padding:14px;text-align:center;background:var(--accent-soft);border:0"><div style="font-size:24px;font-weight:900;color:var(--accent-strong)">${weekly.posts}</div><div class="muted" style="font-size:12px">发帖</div></div>
        <div class="card" style="padding:14px;text-align:center;background:var(--gold-soft);border:0"><div style="font-size:24px;font-weight:900;color:#b97a1f">${weekly.badgesNew.length}</div><div class="muted" style="font-size:12px">新徽章</div></div>
      </div>
      <p class="muted mt-16" style="font-size:13px">${wTop ? '本周关键词：#' + esc(wTop[0]) + ' × ' + wTop[1] : '本周在积蓄力量，从记录开始 ✨'}</p>`;
    document.getElementById('weeklyShareBtn').addEventListener('click', () => {
      const canvas = weeklyShareImage(weekly, user);
      showShareModal(canvas, '本周成长小结.png');
    });
  } else {
    document.getElementById('weeklyBox').innerHTML = '<div class="empty" style="padding:20px"><div class="ic">📅</div><h4>本周还没有记录</h4><p>点下方按钮，记录第一件事，下周就有小结啦。</p></div>';
  }

  // 成长树
  const leafCount = Math.min(20, Math.floor(total / 5));
  const treeBox = document.getElementById('milestoneBox');
  if (treeBox) {
    const spots = [[70,60],[96,70],[120,90],[140,118],[160,118],[182,94],[208,68],[100,30],[128,42],[172,40],[198,26],[78,36],[222,50]];
    const leaves = Array.from({ length: leafCount }, (_, i) => {
      const s = spots[i % spots.length];
      return '<ellipse cx="' + s[0] + '" cy="' + s[1] + '" rx="10" ry="5" fill="#4caf9a" opacity=".85" transform="rotate(' + ((i * 37) % 60 - 30) + ' ' + s[0] + ' ' + s[1] + ')"/>';
    }).join('');
    const treeHtml = '<div class="card mt-16" style="padding:20px;background:linear-gradient(180deg,#f3fbf6,#fff)">' +
      '<div class="flex-between flex-wrap" style="gap:12px"><div><b style="color:var(--deep);font-size:15px">🌳 我的成长树</b>' +
      '<p class="muted" style="font-size:12.5px;margin-top:4px">每 5 条足迹，长出一片叶子 —— 现在有 ' + leafCount + ' 片叶子，共 ' + total + ' 条足迹</p></div>' +
      '<div style="font-size:13px;font-weight:800;color:#2e8a78">' + (leafCount >= 20 ? '🌲 参天大树！' : '下一片叶子还需 ' + (5 - (total % 5)) + ' 条足迹') + '</div></div>' +
      '<svg viewBox="0 0 300 180" style="width:100%;max-width:360px;display:block;margin:10px auto 0">' +
      '<path d="M150 170 C 148 120 152 90 150 60" stroke="#8a6d3b" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M150 130 C 120 120 96 96 78 72" stroke="#8a6d3b" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M150 110 C 180 100 200 78 214 56" stroke="#8a6d3b" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M150 80 C 130 66 112 52 100 34" stroke="#8a6d3b" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M150 72 C 170 58 184 46 196 30" stroke="#8a6d3b" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      leaves +
      (leafCount === 0 ? '<text x="150" y="150" text-anchor="middle" font-size="12" fill="#98a2b3">种下第一颗种子，从记录开始 🌱</text>' : '') +
      '</svg></div>';
    treeBox.insertAdjacentHTML('beforeend', treeHtml);
  }

  // 足迹热力图（近12个月）
  const heat = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
    const count = events.filter(e => String(e.date).slice(0, 7) === key).length;
    heat.push({ label: dt.getMonth() + 1 + '月', count });
  }
  const maxH = Math.max(1, ...heat.map(h => h.count));
  document.getElementById('heatmap').innerHTML = `
    <div class="heatmap-row">
      ${heat.map(h => `
        <div class="heat-cell" title="${h.label} · ${h.count} 条足迹">
          <div class="heat-bar" style="height:${Math.max(6, Math.round(h.count / maxH * 100))}%"></div>
          <span>${h.label}</span>
        </div>`).join('')}
    </div>
    <div class="flex mt-8" style="gap:8px;justify-content:flex-end;font-size:11.5px;color:var(--text-3)">
      <span>少</span>
      ${[0.25, 0.5, 0.75, 1].map(p => `<span style="width:12px;height:12px;border-radius:3px;display:inline-block;background:${heatColor(p)}"></span>`).join('')}
      <span>多</span>
    </div>`;
}

function daysTo(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.max(0, Math.ceil(diff / 86400000));
}
function heatColor(p) {
  const c = [255, 140, 66];
  const light = [255, 241, 230];
  return `rgb(${Math.round(light[0] + (c[0] - light[0]) * p)},${Math.round(light[1] + (c[1] - light[1]) * p)},${Math.round(light[2] + (c[2] - light[2]) * p)})`;
}

// 目标设定
function openGoalModal() {
  document.getElementById('gTitle').value = '';
  document.getElementById('gDesc').value = '';
  document.getElementById('gDeadline').value = '';
  document.getElementById('gMiles').value = '';
  openModal('goalModal');
}
document.getElementById('addGoalBtn').addEventListener('click', openGoalModal);
document.getElementById('gSubmit').addEventListener('click', async () => {
  setBtnLoading(document.getElementById('gSubmit'), true);
  const title = document.getElementById('gTitle').value.trim();
  if (!title) { toast('请填写目标名称', 'error'); return; }
  const milestones = document.getElementById('gMiles').value.split('\\n').map(s => s.trim()).filter(Boolean).map(text => ({ text, done: false }));
  try {
    await api.post('/api/goals', { title, desc: document.getElementById('gDesc').value.trim(), deadline: document.getElementById('gDeadline').value, milestones });
    closeModal('goalModal');
    setBtnLoading(document.getElementById('gSubmit'), false);
    toast('目标已创建，加油！', 'success');
    load();
  } catch (e) { toast(e.message, 'error'); setBtnLoading(document.getElementById('gSubmit'), false); }
});

// 快速记录
document.getElementById('quickAddBtn').addEventListener('click', () => {
  const d = new Date();
  document.getElementById('qDate').value = d.toISOString().slice(0, 10);
  document.getElementById('qTitle').value = '';
  document.getElementById('qDesc').value = '';
  openModal('quickModal');
});
document.getElementById('qSubmit').addEventListener('click', async () => {
  const title = document.getElementById('qTitle').value.trim();
  const date = document.getElementById('qDate').value;
  const type = document.getElementById('qType').value;
  const description = document.getElementById('qDesc').value.trim();
  if (!title || !date) { toast('请填写事件名称和日期', 'error'); return; }
  try {
    const r = await api.post('/api/timeline', { title, date, type, description });
    closeModal('quickModal');
    toast('已记录，未来会感谢现在的你！', 'success');
    if (r.badges && r.badges.length) badgeToast(r.badges);
    load();
  } catch (e) { toast(e.message, 'error'); }
});

load();
