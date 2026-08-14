// 成长时光轴
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, openModal, closeModal, toast, fmtDate, badgeToast } from './ui.js';
import { countUp } from './charts.js';

const user = await bootstrap('timeline', { auth: true, redirect: 'index.html?login=1' });
const box = document.getElementById('timelineBox');

const TYPE_COLORS = { 学习: '#4aa3c2', 实习: '#4caf9a', 获奖: '#e8a04c', 跳槽: '#7c6cf0', 创业: '#e86a8a', 旅行: '#6a9fd8', 其他: '#9ca3af' };
const TYPE_EMOJI = { 学习: '📚', 实习: '💼', 获奖: '🏆', 跳槽: '🔄', 创业: '🚀', 旅行: '✈️', 其他: '📌' };

async function load() {
  const r = await api.get('/api/timeline');
  // 目标选项
  try {
    const g = await api.get('/api/goals');
    const sel = document.getElementById('evGoal');
    sel.innerHTML = '<option value="">不关联</option>' + g.goals.map(x => '<option value="' + x.id + '">' + esc(x.title) + '</option>').join('');
  } catch (e) {}
  const events = r.events;
  const years = {};
  for (const e of events) { const y = e.date.slice(0, 4); (years[y] = years[y] || []).push(e); }
  const yearsArr = Object.entries(years).sort((a, b) => b[0] - a[0]);
  if (!events.length) {
    box.innerHTML = `<div class="card empty"><div class="ic">🌱</div><h4>你的时光轴还是空的</h4><p>点右上角"记录一件大事"，迈出第一步。</p><div class="empty-action"><button class="btn btn-primary btn-sm" id="emptyAddEvent">📝 记录第一件事</button></div></div>`;
    document.getElementById('emptyAddEvent').addEventListener('click', () => document.getElementById('addEventBtn').click());
    return;
  }
  box.innerHTML = yearsArr.map(([y, list]) => `
    <div class="mb-24">
      <h3 style="font-size:20px;font-weight:900;color:var(--deep);margin-bottom:14px">${y} 年 <span class="muted" style="font-size:13px;font-weight:500">${list.length} 个脚印</span></h3>
      <div class="timeline">
        ${list.map(e => `
          <div class="tl-item type-${e.type}">
            <div><span class="tl-date">${esc(fmtDate(e.date))}</span><span class="tl-type" style="color:${TYPE_COLORS[e.type] || '#9ca3af'};background:${(TYPE_COLORS[e.type] || '#9ca3af')}18">${esc(e.type)}</span></div>
            <div class="tl-title">${TYPE_EMOJI[e.type] || '📌'} ${esc(e.title)} ${e.goal_id ? '<span class="tag gold" style="font-size:11px">🎯 目标</span>' : ''}</div>
            ${e.description ? `<div class="tl-desc">${esc(e.description)}</div>` : ''}
            <button class="tl-del" data-id="${e.id}">删除</button>
          </div>`).join('')}
      </div>
    </div>`).join('');

  box.querySelectorAll('.tl-del').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('确定删除这条记录吗？')) return;
    await api.del('/api/timeline/' + b.dataset.id);
    toast('已删除', 'success');
    load();
  }));

  // 概览
  const byType = {};
  events.forEach(e => byType[e.type] = (byType[e.type] || 0) + 1);
  document.getElementById('miniStats').innerHTML = `
    <div class="num-anim" id="miniCount" style="font-size:30px;font-weight:900;color:var(--primary-strong)">0</div>
    <div class="muted mb-16">条成长记录</div>
    ${Object.entries(byType).map(([t, n]) => `<div class="flex-between" style="font-size:13.5px;padding:4px 0">
      <span style="color:var(--text-2)">${esc(t)}</span><b>${n}</b></div>`).join('')}`;
  countUp(document.getElementById('miniCount'), events.length, { duration: 800 });
}

document.getElementById('addEventBtn').addEventListener('click', () => {
  const d = new Date();
  document.getElementById('evDate').value = d.toISOString().slice(0, 10);
  document.getElementById('evTitle').value = '';
  document.getElementById('evDesc').value = '';
  openModal('eventModal');
});
document.getElementById('evSubmit').addEventListener('click', async () => {
  const title = document.getElementById('evTitle').value.trim();
  const date = document.getElementById('evDate').value;
  const type = document.getElementById('evType').value;
  const description = document.getElementById('evDesc').value.trim();
  if (!title) { toast('请填写事件名称', 'error'); return; }
  if (!date) { toast('请选择日期', 'error'); return; }
  try {
    const goalId = document.getElementById('evGoal').value || null;
    const r = await api.post('/api/timeline', { title, date, type, description, goal_id: goalId });
    closeModal('eventModal');
    toast('已记录，未来会感谢现在的你！', 'success');
    if (r.badges && r.badges.length) badgeToast(r.badges);
    load();
  } catch (e) { toast(e.message, 'error'); }
});

if (user) load();
