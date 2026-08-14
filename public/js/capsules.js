// 时光胶囊
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, openModal, closeModal, toast, fmtDate, badgeToast } from './ui.js';

const user = await bootstrap('timeline', { auth: true, redirect: 'index.html?login=1' });
const grid = document.getElementById('capsuleGrid');

function daysTo(dateStr) {
  return Math.max(0, Math.ceil((new Date(dateStr) - new Date()) / 86400000));
}
async function load() {
  const r = await api.get('/api/capsules');
  const caps = r.capsules;
  if (!caps.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="ic">⏳</div><h4>还没有时光胶囊</h4><p>给未来的自己写封信，让时间见证你的成长。</p></div>`;
    return;
  }
  grid.innerHTML = caps.map(c => {
    const sealed = c.sealed;
    return `<div class="card capsule-card ${sealed ? 'sealed' : 'openable'}">
      <div class="cc-ic">${sealed ? '📦' : '💌'}</div>
      <h4>${esc(c.title)}</h4>
      <div class="cc-date">开启时间：${esc(fmtDate(c.open_date))} ${sealed ? '· 还剩 ' + daysTo(c.open_date) + ' 天' : ''}</div>
      <div><span class="cc-state">${sealed ? '🔒 未到开启时间' : '✨ 可以开启'}</span></div>
      <button class="btn ${sealed ? 'btn-ghost' : 'btn-primary'} btn-sm mt-16" ${sealed ? 'disabled' : ''} onclick="openCapsule(${c.id})">${sealed ? '等待开启' : '开启胶囊'}</button>
    </div>`;
  }).join('');
}

// 新建胶囊
document.getElementById('newCapsuleBtn').addEventListener('click', () => {
  document.getElementById('capsuleBody').innerHTML = `
    <div class="field"><label>胶囊标题</label><input class="input" id="cpTitle" placeholder="如：写给毕业时的自己"></div>
    <div class="field"><label>内容（写给未来的话）</label><textarea class="textarea" id="cpContent" style="min-height:160px" placeholder="嗨，未来的我：\n希望那时的你……"></textarea></div>
    <div class="field"><label>开启时间</label><input class="input" id="cpDate" type="date"></div>
    <button class="btn btn-primary btn-block btn-lg" id="cpSubmit">封存这颗胶囊 🔒</button>
    <p class="form-hint text-center mt-8">封存后，不到开启时间无法查看内容——让时间替你保管这份约定。</p>`;
  openModal('capsuleModal');
  document.getElementById('cpSubmit').addEventListener('click', async () => {
    const title = document.getElementById('cpTitle').value.trim();
    const content = document.getElementById('cpContent').value.trim();
    const open_date = document.getElementById('cpDate').value;
    if (!title || !content || !open_date) { toast('请完整填写', 'error'); return; }
    try {
      const r = await api.post('/api/capsules', { title, content, open_date });
      closeModal('capsuleModal');
      toast('胶囊已封存，未来见！', 'success');
      if (r.badges && r.badges.length) badgeToast(r.badges);
      load();
    } catch (e) { toast(e.message, 'error'); }
  });
});

window.openCapsule = async (id) => {
  const r = await api.get('/api/capsules/' + id);
  const c = r.capsule;
  if (c.sealed) { toast('还没到开启时间哦', 'info'); return; }
  if (c.content === null && c.status !== 'opened') {
    await api.post('/api/capsules/' + id + '/open');
    const r2 = await api.get('/api/capsules/' + id);
    showOpened(r2.capsule);
  } else {
    showOpened(c);
  }
};
function showOpened(c) {
  document.getElementById('openBody').innerHTML = `
    <div class="text-center mb-16" style="font-size:40px">💌</div>
    <h3 style="text-align:center;color:var(--deep);margin-bottom:14px">${esc(c.title)}</h3>
    <div class="card" style="padding:22px;background:var(--primary-soft);border:0;white-space:pre-wrap;font-size:14.5px;line-height:1.9;color:var(--text)">${esc(c.content)}</div>
    <p class="muted text-center mt-16">—— 来自 ${esc(fmtDate(c.open_date))} 的约定 · 已由未来的你开启</p>`;
  openModal('openModal');
}

if (user) load();
