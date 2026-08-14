// 全局搜索页
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, timeAgo } from './ui.js';

await bootstrap('explore');
const box = document.getElementById('resultBox');
const input = document.getElementById('searchInput');
const params = new URLSearchParams(location.search);
const q0 = params.get('q') || '';
if (q0) { input.value = q0; run(q0); } else renderHistory();

function row(html, href) {
  return `<div class="search-result-row" onclick="location.href='${href}'">${html}<span style="color:var(--text-3)">→</span></div>`;
}
function group(title, items, render) {
  if (!items.length) return '';
  return `<div class="search-group-title">${title} <span class="muted" style="font-weight:500">${items.length}</span></div>` + items.map(render).join('');
}

function saveHistory(q) {
  try {
    let h = JSON.parse(localStorage.getItem('zy_search_hist') || '[]');
    h = [q, ...h.filter(x => x !== q)].slice(0, 6);
    localStorage.setItem('zy_search_hist', JSON.stringify(h));
  } catch (e) {}
}
function renderHistory() {
  let h = [];
  try { h = JSON.parse(localStorage.getItem('zy_search_hist') || '[]'); } catch (e) {}
  if (!h.length) return;
  box.innerHTML = '<div class="search-group-title">🕘 最近搜索</div>' + h.map(x => '<button class="search-result-row" data-q="' + String(x).replace(/"/g, '&quot;') + '"><b>' + esc(x) + '</b><span style="color:var(--text-3)">→</span></button>').join('');
  box.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { input.value = b.dataset.q; run(b.dataset.q); }));
}
async function run(q) {
  if (!q.trim()) { renderHistory(); return; }
  saveHistory(q);
  box.innerHTML = '<div class="skeleton" style="height:200px;border-radius:16px"></div>';
  const r = await api.get('/api/search?q=' + encodeURIComponent(q));
  if (!r.careers.length && !r.majors.length && !r.scripts.length && !r.circles.length && !r.posts.length) {
    box.innerHTML = `<div class="card empty"><div class="ic">🫥</div><h4>没有找到「${esc(q)}」相关内容</h4><p>换个关键词试试，或去社区问问同路人</p><a class="btn btn-primary btn-sm mt-8" href="community.html">去社区提问</a></div>`;
    return;
  }
  box.innerHTML = group('👀 职业', r.careers, c => row(`<div><b>${esc(c.name)}</b> <span class="tag orange">${esc(c.category)}</span><div class="muted">${esc(c.summary.slice(0, 46))}…</div></div>`, 'career.html?id=' + c.id))
    + group('🎓 专业', r.majors, m => row(`<div><b>${esc(m.name)}</b> <span class="tag">${esc(m.category)}</span></div>`, 'majors.html'))
    + group('🏛️ 职业圈子', r.circles, c => row(`<div><b>${esc(c.name)} 圈子</b> <span class="tag purple">${c.post_count} 帖</span><div class="muted">${esc(c.category)}</div></div>`, 'community.html?career=' + c.id))
    + group('💬 帖子', r.posts, p => row(`<div><b>${esc(p.title)}</b> ${p.career_name ? `<span class="tag purple">${esc(p.career_name)} 圈子</span>` : `<span class="tag">${esc(p.group_type)}</span>`}<div class="muted">${timeAgo(p.created_at)}</div></div>`, 'community.html?post=' + p.id))
    + group('🎬 人生剧本', r.scripts, s => row(`<div><b>${esc(s.title)}</b><div class="muted">${esc(s.subtitle)}</div></div>`, 'scripts.html?open=' + s.id));
}
document.getElementById('searchBtn').addEventListener('click', () => run(input.value));
input.addEventListener('keydown', e => { if (e.key === 'Enter') run(input.value); });
