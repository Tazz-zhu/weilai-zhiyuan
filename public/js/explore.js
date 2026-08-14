// 探索聚合页
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc } from './ui.js';

await bootstrap('explore');

const CAT_COLORS = {
  '互联网科技': 'linear-gradient(135deg,#ff9a5a,#f26d1d)', '人工智能与前沿': 'linear-gradient(135deg,#8b7cf5,#5b4bd8)',
  '金融与经济': 'linear-gradient(135deg,#f2c14e,#e8a04c)', '医疗健康': 'linear-gradient(135deg,#4fd1b0,#2eaa8a)',
  '教育科研': 'linear-gradient(135deg,#6fb8e8,#4aa3c2)', '文化创意与传媒': 'linear-gradient(135deg,#f78fb3,#e86a8a)',
  '工程与制造': 'linear-gradient(135deg,#7a8cb8,#4a5b85)', '商业与运营': 'linear-gradient(135deg,#ffb36b,#ff8c42)',
  '政法与公共服务': 'linear-gradient(135deg,#8d99ae,#5b6b83)', '艺术与体育': 'linear-gradient(135deg,#d98ce8,#c270d8)',
  '生活服务与新消费': 'linear-gradient(135deg,#7ed9c0,#4caf9a)', '新兴前沿职业': 'linear-gradient(135deg,#ff8fa3,#f43f5e)',
  '农业与食品': 'linear-gradient(135deg,#8bc34a,#5a9216)', '能源与环保': 'linear-gradient(135deg,#35c4c9,#1e8fa3)',
  '交通与物流': 'linear-gradient(135deg,#5b8def,#2f5fd0)', '旅游与酒店': 'linear-gradient(135deg,#ffb36b,#f5913f)',
  '体育与健康': 'linear-gradient(135deg,#4fc3a1,#1d9e7c)', '美妆与时尚': 'linear-gradient(135deg,#f58fb3,#e04f7d)',
  '宠物与生活': 'linear-gradient(135deg,#a78bfa,#7c5ce0)', '大健康与养老': 'linear-gradient(135deg,#66bb6a,#2e9e50)',
  '军警与公共服务': 'linear-gradient(135deg,#90a4ae,#5c6f7d)', '新兴数字职业': 'linear-gradient(135deg,#4dd0e1,#0097a7)',
  '教育与培训': 'linear-gradient(135deg,#ffb74d,#ef8b1f)'
};

document.getElementById('exploreEntries').innerHTML = [
  { href: 'careers.html', ic: '👀', color: 'var(--primary-soft)', t: 'var(--primary-strong)', title: '职业认知馆', desc: '180+ 职业 · 23 大行业 · 四维雷达 · 一天vlog', tag: '从行业进入，看见真实职业' },
  { href: 'assessment.html', ic: '🧭', color: 'var(--accent-soft)', t: 'var(--accent-strong)', title: '测评与规划', desc: '四维测评 → AI 路径拆解 → Plan B/C', tag: '5 分钟认识自己' },
  { href: 'profile.html', ic: '🎓', color: 'var(--teal-soft)', t: '#1e8f72', title: '高考志愿推荐', desc: '成绩 + 选科 + 性格 + 家庭 → 冲稳保院校表', tag: 'AI 帮你填志愿' }
].map(e => `
  <div class="card module-card" onclick="location.href='${e.href}'">
    <div class="mc-ic" style="background:${e.color};color:${e.t}">${e.ic}</div>
    <h3>${e.title}</h3>
    <p>${e.desc}</p>
    <div class="mc-tags"><span>${e.tag}</span></div>
    <span class="mc-arrow">→</span>
  </div>`).join('');

// 圈子广场
(async () => {
  try {
    const r = await api.get('/api/community/careers');
    const withPosts = r.items.filter(x => x.post_count > 0).sort((a, b) => b.post_count - a.post_count).slice(0, 12);
    if (!withPosts.length) return;
    const sec = document.createElement('section');
    sec.className = 'page';
    sec.style.paddingTop = '0';
    sec.innerHTML = `
      <div class="container">
        <div class="section-head">
          <div><div class="section-title" style="font-size:22px">🏛️ 圈子广场</div><div class="section-sub" style="margin-bottom:0">按热度发现同职业圈子</div></div>
          <a class="btn btn-soft btn-sm" href="community.html">进入社区 →</a>
        </div>
        <div class="grid grid-4" id="plaza">${withPosts.map(x => `
          <div class="card circle-card" onclick="location.href='community.html?career=${x.id}'">
            <div class="flex-between"><b style="font-size:14.5px">${esc(x.name)}</b><span class="tag purple" style="font-size:11px">${x.post_count} 帖</span></div>
            <p style="font-size:12px;color:var(--text-2);margin:6px 0">${esc(x.summary.slice(0, 30))}…</p>
            <button class="btn btn-ghost btn-sm btn-block">去逛逛 →</button>
          </div>`).join('')}</div>
      </div>`;
    document.querySelector('main').appendChild(sec);
  } catch (e) { /* ignore */ }
})();

try {
  const r = await api.get('/api/careers?hot=1&limit=8');
  document.getElementById('hotJobs').innerHTML = r.items.slice(0, 8).map(j => `
    <div class="card job-card" onclick="location.href='career.html?id=${j.id}'" style="cursor:pointer">
      <div class="jc-top">
        <div class="flex" style="gap:10px;align-items:center;min-width:0">
          <span class="jc-tile" style="background:${CAT_COLORS[j.category] || 'var(--grad-brand)'}">${esc(j.name.slice(0, 1))}</span>
          <div style="min-width:0"><div class="jc-name">${esc(j.name)}</div><div style="font-size:11px;color:var(--text-3);font-weight:600">${esc(j.category)}</div></div>
        </div>
        ${j.hot ? '<span class="hot-tag">🔥</span>' : ''}
      </div>
      <div class="jc-sum">${esc(j.summary)}</div>
      <div class="jc-radar-mini">
        <span class="${j.radar.income >= 75 ? 'hi' : ''}">💰${j.radar.income}</span>
        <span class="${j.radar.stress >= 75 ? 'hi' : ''}">🔥${j.radar.stress}</span>
        <span class="${j.radar.prospect >= 75 ? 'ok' : ''}">📈${j.radar.prospect}</span>
        <span class="${j.radar.barrier >= 75 ? 'hi' : ''}">🎓${j.radar.barrier}</span>
      </div>
      <div class="jc-foot"><span class="tag orange">${esc(j.category)}</span><span style="font-size:12.5px;color:var(--text-3)">查看详情 →</span></div>
    </div>`).join('');
} catch (e) { /* ignore */ }
