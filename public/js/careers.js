// 职业认知馆 v2：行业（一级）→ 职业（二级）分级浏览
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc } from './ui.js';

await bootstrap('careers');

const CAT_ICONS = {
  '互联网科技': '💻', '人工智能与前沿': '🤖', '金融与经济': '💹', '医疗健康': '🏥',
  '教育科研': '📚', '文化创意与传媒': '🎬', '工程与制造': '🏭', '商业与运营': '📊',
  '政法与公共服务': '⚖️', '艺术与体育': '🎨', '生活服务与新消费': '☕', '新兴前沿职业': '🚀',
  '农业与食品': '🌾', '能源与环保': '⚡', '交通与物流': '🚄', '旅游与酒店': '🏨',
  '体育与健康': '🏃', '美妆与时尚': '💄', '宠物与生活': '🐾', '大健康与养老': '💚',
  '军警与公共服务': '🛡️', '新兴数字职业': '🛰️', '教育与培训': '🧑‍🏫'
};
const CAT_COLORS = {
  '互联网科技': 'linear-gradient(135deg,#ff9a5a,#f26d1d)',
  '人工智能与前沿': 'linear-gradient(135deg,#8b7cf5,#5b4bd8)',
  '金融与经济': 'linear-gradient(135deg,#f2c14e,#e8a04c)',
  '医疗健康': 'linear-gradient(135deg,#4fd1b0,#2eaa8a)',
  '教育科研': 'linear-gradient(135deg,#6fb8e8,#4aa3c2)',
  '文化创意与传媒': 'linear-gradient(135deg,#f78fb3,#e86a8a)',
  '工程与制造': 'linear-gradient(135deg,#7a8cb8,#4a5b85)',
  '商业与运营': 'linear-gradient(135deg,#ffb36b,#ff8c42)',
  '政法与公共服务': 'linear-gradient(135deg,#8d99ae,#5b6b83)',
  '艺术与体育': 'linear-gradient(135deg,#d98ce8,#c270d8)',
  '生活服务与新消费': 'linear-gradient(135deg,#7ed9c0,#4caf9a)',
  '新兴前沿职业': 'linear-gradient(135deg,#ff8fa3,#f43f5e)',
  '农业与食品': 'linear-gradient(135deg,#8bc34a,#5a9216)',
  '能源与环保': 'linear-gradient(135deg,#35c4c9,#1e8fa3)',
  '交通与物流': 'linear-gradient(135deg,#5b8def,#2f5fd0)',
  '旅游与酒店': 'linear-gradient(135deg,#ffb36b,#f5913f)',
  '体育与健康': 'linear-gradient(135deg,#4fc3a1,#1d9e7c)',
  '美妆与时尚': 'linear-gradient(135deg,#f58fb3,#e04f7d)',
  '宠物与生活': 'linear-gradient(135deg,#a78bfa,#7c5ce0)',
  '大健康与养老': 'linear-gradient(135deg,#66bb6a,#2e9e50)',
  '军警与公共服务': 'linear-gradient(135deg,#90a4ae,#5c6f7d)',
  '新兴数字职业': 'linear-gradient(135deg,#4dd0e1,#0097a7)',
  '教育与培训': 'linear-gradient(135deg,#ffb74d,#ef8b1f)'
};

let allCareers = [];
let state = { view: 'industry', cat: '', q: '', page: 1, total: 0 };
const PER = 24;
const industryGrid = document.getElementById('industryGrid');
const jobGrid = document.getElementById('jobGrid');
const emptyBox = document.getElementById('emptyBox');
const loadMore = document.getElementById('loadMoreBtn');
const breadcrumb = document.getElementById('breadcrumb');

async function loadAll() {
  const r = await api.get('/api/careers?limit=300');
  allCareers = r.items;
  renderIndustry();
}
function renderIndustry() {
  state.view = 'industry';
  state.cat = '';
  state.page = 1;
  jobGrid.classList.add('hidden');
  emptyBox.classList.add('hidden');
  loadMore.style.display = 'none';
  breadcrumb.classList.add('hidden');
  industryGrid.classList.remove('hidden');
  document.getElementById('subTitle').textContent = '先选一个行业，再看这个行业里的真实职业';
  document.title = '职业认知馆 · 未来致远';

  const byCat = {};
  for (const c of allCareers) (byCat[c.category] = byCat[c.category] || []).push(c);
  const cats = Object.keys(byCat);
  industryGrid.innerHTML = cats.map((cat, i) => {
    const list = byCat[cat];
    const hot3 = list.filter(j => j.hot).slice(0, 3);
    const picks = (hot3.length ? hot3 : list).slice(0, 3);
    return `
      <div class="card industry-card fade-up d${(i % 3) + 1}" data-cat="${esc(cat)}">
        <div class="ind-top">
          <span class="ind-ic" style="background:${CAT_COLORS[cat] || 'var(--grad-brand)'}">${CAT_ICONS[cat] || '💼'}</span>
          <div>
            <h3>${esc(cat)}</h3>
            <span class="muted" style="font-size:12.5px">${list.length} 个职业</span>
          </div>
        </div>
        <div class="ind-hot">
          ${picks.map(j => `<span class="tag orange">${esc(j.name)}</span>`).join('')}
        </div>
        <div class="ind-foot"><span>进入行业，看看真实职业 →</span><span class="mc-arrow">→</span></div>
      </div>`;
  }).join('');
  industryGrid.querySelectorAll('.industry-card').forEach(card => {
    card.addEventListener('click', () => showList(card.dataset.cat));
  });
}

function card(j) {
  return `<div class="card job-card" onclick="location.href='career.html?id=${j.id}'" style="cursor:pointer">
    <div class="jc-top">
      <div class="flex" style="gap:10px;align-items:center;min-width:0">
        <span class="jc-tile" style="background:${CAT_COLORS[j.category] || 'var(--grad-brand)'}">${esc(j.name.slice(0, 1))}</span>
        <div style="min-width:0">
          <div class="jc-name">${esc(j.name)}</div>
          <div style="font-size:11px;color:var(--text-3);font-weight:600">${esc(j.category)}</div>
        </div>
      </div>
      ${j.hot ? '<span class="hot-tag">🔥 热门</span>' : ''}
    </div>
    <div class="jc-sum">${esc(j.summary)}</div>
    <div class="jc-meta"><span>🎓 ${esc(j.education)}</span><span>📈 需求 ${j.demand}</span></div>
    <div class="jc-radar-mini">
      <span class="${j.radar.income >= 75 ? 'hi' : ''}">💰${j.radar.income}</span>
      <span class="${j.radar.stress >= 75 ? 'hi' : ''}">🔥${j.radar.stress}</span>
      <span class="${j.radar.prospect >= 75 ? 'ok' : ''}">📈${j.radar.prospect}</span>
      <span class="${j.radar.barrier >= 75 ? 'hi' : ''}">🎓${j.radar.barrier}</span>
    </div>
    <div class="jc-foot">
      <span class="tag orange">${esc(j.category)}</span>
      <span style="font-size:12.5px;color:var(--text-3)">查看详情 →</span>
    </div>
  </div>`;
}

async function showList(cat) {
  state.view = 'list';
  state.cat = cat;
  state.q = '';
  state.page = 1;
  document.getElementById('searchInput').value = '';
  industryGrid.classList.add('hidden');
  breadcrumb.classList.remove('hidden');
  document.getElementById('bcCurrent').textContent = cat;
  document.title = cat + ' · 职业认知馆 · 未来致远';
  document.getElementById('subTitle').textContent = cat + ' · 共 N 个真实职业，四维雷达一眼看懂';
  await loadJobs();
}
async function loadJobs() {
  const params = new URLSearchParams({ limit: PER, page: state.page });
  if (state.cat) params.set('category', state.cat);
  if (state.q) params.set('q', state.q);
  const r = await api.get('/api/careers?' + params.toString());
  state.total = r.total;
  if (state.q) {
    document.getElementById('bcCurrent').textContent = '搜索：“' + state.q + '”';
  }
  document.getElementById('subTitle').textContent = (state.cat || '全部行业') + ' · 共 ' + r.total + ' 个相关职业';
  jobGrid.classList.remove('hidden');
  if (state.page === 1) jobGrid.innerHTML = r.items.map(card).join('');
  else jobGrid.innerHTML += r.items.map(card).join('');
  emptyBox.classList.toggle('hidden', r.items.length > 0);
  loadMore.style.display = jobGrid.children.length < r.total ? 'inline-flex' : 'none';
}

document.getElementById('backBtn').addEventListener('click', renderIndustry);
let debounce;
document.getElementById('searchInput').addEventListener('input', e => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    const q = e.target.value.trim();
    if (!q) { renderIndustry(); return; }
    state.view = 'list'; state.cat = ''; state.q = q; state.page = 1;
    industryGrid.classList.add('hidden');
    breadcrumb.classList.remove('hidden');
    document.getElementById('bcCurrent').textContent = '搜索结果';
    loadJobs();
  }, 300);
});
loadMore.addEventListener('click', () => { state.page++; loadJobs(); });

// 支持 ?cat= / ?q= 直达
const params = new URLSearchParams(location.search);
loadAll().then(() => {
  if (params.get('cat')) showList(params.get('cat'));
  else if (params.get('q')) {
    const q = params.get('q');
    state.view = 'list'; state.cat = ''; state.q = q; state.page = 1;
    industryGrid.classList.add('hidden');
    breadcrumb.classList.remove('hidden');
    document.getElementById('bcCurrent').textContent = '搜索结果';
    document.getElementById('searchInput').value = q;
    loadJobs();
  }
});
