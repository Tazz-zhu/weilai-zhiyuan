// 专业真相馆
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, openModal } from './ui.js';
import { donutGauge, barList } from './charts.js';

await bootstrap('careers');
let all = [];
const grid = document.getElementById('majorGrid');
const emptyBox = document.getElementById('emptyBox');

function majorCard(m) {
  const color = m.recommend >= 8 ? 'green' : m.recommend >= 6 ? 'gold' : 'rose';
  return `<div class="card job-card" onclick="showMajor('${m.id}')" style="cursor:pointer">
    <div class="jc-top"><div class="jc-name">${esc(m.name)}</div><span class="tag ${color}">推荐 ${m.recommend}/10</span></div>
    <div class="jc-sum">${esc(m.truth.slice(0, 60))}…</div>
    <div class="jc-foot"><span class="tag orange">${esc(m.category)}</span><span style="font-size:13px;color:var(--text-3)">查看真相 →</span></div>
  </div>`;
}

async function load() {
  const r = await api.get('/api/majors');
  all = r.items;
  render();
}
function render() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const active = document.querySelector('#catBar .tab-btn.active')?.dataset.cat || '';
  let list = all;
  if (active) list = list.filter(m => m.category === active);
  if (q) list = list.filter(m => (m.name + m.truth + m.jobs.join('')).toLowerCase().includes(q));
  grid.innerHTML = list.map(majorCard).join('');
  emptyBox.classList.toggle('hidden', list.length > 0);
}

document.getElementById('searchInput').addEventListener('input', render);
document.getElementById('catBar').addEventListener('click', e => {
  const b = e.target.closest('.tab-btn'); if (!b) return;
  document.querySelectorAll('#catBar .tab-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  render();
});

window.showMajor = async (id) => {
  const r = await api.get('/api/majors/' + id);
  const m = r.major;
  document.getElementById('majorBody').innerHTML = `
    <div class="flex-between flex-wrap mb-16">
      <div>
        <h2 style="font-size:24px;font-weight:900;color:var(--deep)">${esc(m.name)}</h2>
        <span class="tag orange mt-8">${esc(m.category)}</span>
      </div>
      <div class="gauge-wrap">
        <div id="recGauge"></div>
        <div class="gauge-label">学长学姐推荐指数</div>
      </div>
    </div>
    <div class="card" style="padding:18px;background:var(--primary-soft);border:0;margin-bottom:16px">
      <b style="color:var(--primary-strong)">💬 真心话：</b>
      <p style="font-size:14px;color:var(--text);margin-top:6px">${esc(m.truth)}</p>
    </div>
    <div class="card" style="padding:18px;margin-bottom:16px">
      <b style="color:var(--deep)">🧭 跨专业就业地图：这个专业的人最后都去做了什么</b>
      <p style="font-size:14px;color:var(--text-2);margin-top:8px">${esc(m.employ)}</p>
    </div>
    <div class="grid grid-2" style="gap:16px;margin-bottom:16px">
      <div class="card" style="padding:18px">
        <b style="color:var(--deep)">📚 主要课程</b>
        <div class="flex-wrap mt-8" style="display:flex;gap:6px;flex-wrap:wrap">
          ${m.courses.map(c => `<span class="tag blue">${esc(c)}</span>`).join('')}
        </div>
      </div>
      <div class="card" style="padding:18px">
        <b style="color:var(--deep)">💼 典型去向</b>
        <div class="flex-wrap mt-8" style="display:flex;gap:6px;flex-wrap:wrap">
          ${m.jobs.map(j => `<span class="tag green">${esc(j)}</span>`).join('')}
        </div>
      </div>
    </div>
    <div class="card" style="padding:18px;background:var(--bg);border:0">
      <b style="color:var(--deep)">🧩 适合人群</b>
      <p style="font-size:14px;color:var(--text-2);margin-top:6px">${esc(m.fit)}</p>
      <div class="text-center mt-16"><a class="btn btn-soft btn-sm" href="careers.html?q=${encodeURIComponent(m.jobs[0] || m.name)}" target="_blank">🔍 去职业库看看「${esc(m.jobs[0] || m.name)}」→</a></div>
    </div>`;
  donutGauge(document.getElementById('recGauge'), { value: m.recommend, max: 10, label: '推荐指数', color: '#4aa3c2', suffix: '' });
  openModal('majorModal');
};

load();
