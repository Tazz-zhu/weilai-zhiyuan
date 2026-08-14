// 导师库
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, openModal, closeModal, toast, requireAuth } from './ui.js';
import { avatarHtml } from './charts.js';

const user = await bootstrap('community');
let all = [];
const grid = document.getElementById('mentorGrid');

function card(m) {
  return `<div class="card mentor-card">
    <div class="mc-head">
      ${avatarHtml(m.name, '')}
      <div>
        <b>${esc(m.name)}</b>
        <div class="mc-role">${esc(m.role)} · ${esc(m.company)}</div>
        <div class="rating">★ ${m.rating} <span class="text-3" style="font-weight:500">· ${m.price}元/次</span></div>
      </div>
    </div>
    <p>${esc(m.intro)}</p>
    <div class="flex-wrap mb-16" style="display:flex;gap:6px;flex-wrap:wrap">
      ${m.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
    </div>
    <div class="flex-between">
      <span class="tag ${m.available ? 'green' : 'rose'}">${m.available ? '● 可预约' : '○ 排期中'}</span>
      <button class="btn btn-primary btn-sm" onclick="book('${m.id}')" ${m.available ? '' : 'disabled'}>预约咨询</button>
    </div>
  </div>`;
}
async function load() {
  const r = await api.get('/api/mentors');
  all = r.items;
  render();
}
function render() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const list = q ? all.filter(m => (m.name + m.field + m.role + m.tags.join('')).toLowerCase().includes(q)) : all;
  grid.innerHTML = list.map(card).join('');
}
document.getElementById('searchInput').addEventListener('input', render);

window.book = async (id) => {
  const u = requireAuth(); if (!u) return;
  const m = all.find(x => x.id === id);
  if (!m) return;
  document.getElementById('bookBody').innerHTML = `
    <div class="flex" style="gap:12px;margin-bottom:16px">
      ${avatarHtml(m.name, '')}
      <div><b style="font-size:16px">${esc(m.name)}</b><div class="text-2" style="font-size:13px">${esc(m.role)} · ${esc(m.company)}</div></div>
    </div>
    <div class="field"><label>选择预约时间</label>
      <select class="select" id="bookTime">
        <option>本周六 14:00-14:45</option>
        <option>本周日 10:00-10:45</option>
        <option>下周三 20:00-20:45</option>
        <option>其他时间（与导师协商）</option>
      </select>
    </div>
    <div class="field"><label>想咨询的问题（选填）</label><textarea class="textarea" id="bookNote" placeholder="例如：我对XX方向感兴趣，但不确定怎么起步…"></textarea></div>
    <button class="btn btn-primary btn-block btn-lg" id="bookSubmit">确认预约 · ¥${m.price}</button>`;
  openModal('bookModal');
  document.getElementById('bookSubmit').addEventListener('click', async () => {
    const r = await api.post('/api/mentors/' + id + '/book', { time: document.getElementById('bookTime').value });
    closeModal('bookModal');
    toast(r.booking.message, 'success');
  });
};

load();
