// 首页（轮播版）逻辑
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, timeAgo, toast, badgeToast } from './ui.js';
import { avatarHtml, countUp } from './charts.js';

const user = await bootstrap('index');

// ---------- 统计数字滚动 ----------
try {
  const s = await api.get('/api/stats');
  const nums = [[s.careers, '+'], [s.majors, ''], [s.scripts, ''], [s.mentors, '']];
  const els = document.querySelectorAll('#heroStats .hs-num');
  els.forEach((el, i) => countUp(el, nums[i][0], { suffix: nums[i][1], duration: 1200 }));
} catch (e) { /* ignore */ }

// ---------- 首页个性化（3 分钟价值兑现） ----------
async function renderPersonalStrip() {
  const box = document.getElementById('personalStrip');
  if (!user || !box) return;
  try {
    const [pl, latest] = await Promise.all([
      api.get('/api/planner').catch(() => null),
      api.get('/api/assessments/latest').catch(() => null)
    ]);
    if (pl && pl.hasAssessment && latest && latest.assessment) {
      const res = latest.assessment.result;
      const top = (pl.recommendations && pl.recommendations[0]) ? pl.recommendations[0].career.name : '查看完整推荐';
      box.innerHTML = `
        <div class="card" style="padding:20px 26px;margin-bottom:16px;background:linear-gradient(120deg,#fff1e6,#ece9fd);border:0;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap">
          <div class="flex" style="gap:14px">
            <span style="font-size:34px">🧭</span>
            <div>
              <b style="color:var(--deep);font-size:16px">欢迎回来，${esc(user.nickname)} · 你的职业画像已就绪</b>
              <div class="flex mt-8" style="gap:6px;flex-wrap:wrap">
                ${(res.interestTop || []).slice(0, 3).map(v => '<span class="tag orange" style="font-size:12px">' + esc(v.key) + ' ' + v.score + '</span>').join('')}
                <span class="tag blue">推荐：${esc(top)}</span>
              </div>
            </div>
          </div>
          <div class="flex" style="gap:10px;flex-wrap:wrap">
            <a class="btn btn-primary btn-sm" href="planner.html">查看完整推荐 →</a>
            <a class="btn btn-ghost btn-sm" href="assessment.html">重新测评</a>
          </div>
        </div>`;
    } else {
      box.innerHTML = `
        <div class="card" style="padding:20px 26px;margin-bottom:16px;background:linear-gradient(120deg,#e6f4f9,#fff);border:0;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap">
          <div class="flex" style="gap:14px">
            <span style="font-size:34px">🎯</span>
            <div><b style="color:var(--deep);font-size:16px">5 分钟认识自己，让 AI 为你指路</b>
            <p class="muted" style="font-size:13px;margin-top:4px">兴趣 · 性格 · 能力 · 价值观四维测评，生成你的专属职业画像</p></div>
          </div>
          <a class="btn btn-primary btn-shine" href="assessment.html">🚀 开始测评</a>
        </div>`;
    }
  } catch (e) { /* ignore */ }
}
renderPersonalStrip();
// 继续我的成长：未完成事项聚合
async function renderContinue() {
  if (!user) return;
  try {
    const [goals, capsules] = await Promise.all([
      api.get('/api/goals').catch(() => null),
      api.get('/api/capsules').catch(() => null)
    ]);
    const items = [];
    const goalsList = goals ? goals.goals : [];
    const capList = capsules ? capsules.capsules : [];
    for (const g of goalsList) {
      if (g.progress < 100 && g.milestones.length) items.push({ ic: '🎯', text: '目标「' + g.title + '」完成 ' + g.progress + '%，继续推进', href: 'memoir.html#goalBox' });
    }
    for (const cap of capList) {
      if (!cap.sealed) items.push({ ic: '💌', text: '时光胶囊「' + cap.title + '」可以开启了', href: 'capsules.html' });
    }
    if (items.length) {
      const box = document.createElement('div');
      box.id = 'continueBox';
      box.className = 'card mb-16';
      box.style.padding = '16px 22px';
      box.innerHTML = '<b style="color:var(--deep);font-size:14px">🚀 继续我的成长</b>' + items.slice(0, 3).map(it => '<a class="flex mt-8" style="gap:8px;color:var(--text-2);font-size:13px;text-decoration:none" href="' + it.href + '"><span>' + it.ic + '</span>' + it.text + '</a>').join('');
      const strip = document.getElementById('personalStrip');
      if (strip) strip.appendChild(box);
    }
  } catch (e) { /* ignore */ }
}
renderContinue();

// ---------- 签到 ----------
if (user) {
  const wrap = document.getElementById('checkinWrap');
  wrap.style.display = '';
  async function renderCheckin() {
    try {
      const r = await api.get('/api/checkin/status');
      document.getElementById('streakNum').textContent = r.streak;
      const days = [];
      const done = new Set(r.last30);
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        days.push({ key, label: '周' + '日一二三四五六'[d.getDay()], done: done.has(key), today: i === 0 });
      }
      document.getElementById('checkinStrip').innerHTML = days.map(d => `
        <div class="checkin-dot ${d.done ? 'done' : ''} ${d.today ? 'today' : ''}">
          ${d.done ? '✓' : (d.today ? '今' : '')}
          <span>${d.label}</span>
        </div>`).join('');
      document.getElementById('checkinBtn').textContent = r.today ? '✅ 今日已签到' : '✅ 今日签到';
      document.getElementById('checkinBtn').disabled = r.today;
    } catch (e) { /* ignore */ }
  }
  document.getElementById('checkinBtn').addEventListener('click', async () => {
    const r = await api.post('/api/checkin');
    toast('签到成功，连续 ' + r.streak + ' 天！', 'success');
    if (r.badges && r.badges.length) badgeToast(r.badges);
    renderCheckin();
  });
  renderCheckin();
}

// ---------- 为你推荐 / 热门职业 ----------
async function renderJobs() {
  const box = document.getElementById('hotJobs');
  try {
    let items = [];
    let personal = false;
    if (api.token) {
      try {
        const pl = await api.get('/api/planner');
        if (pl.hasAssessment && pl.recommendations && pl.recommendations.length) {
          items = pl.recommendations.slice(0, 4).map(r => ({
            id: r.career.id, name: r.career.name, category: r.career.category,
            summary: r.career.summary, salary: r.career.salary, education: '—',
            radar: r.career.radar, hot: false, demand: r.match, match: r.match
          }));
          personal = true;
          document.getElementById('forYouTip').textContent = '已融合你的四维测评画像，AI 精选 4 条高匹配路径';
        }
      } catch (e) { /* fallback */ }
    }
    if (!items.length) {
      const r = await api.get('/api/careers?hot=1&limit=8');
      items = r.items;
      document.getElementById('forYouTip').textContent = '收入 / 压力 / 前景 / 门槛，四维雷达一眼看懂';
    }
    box.innerHTML = items.slice(0, 4).map(j => `
      <div class="card job-card" onclick="location.href='career.html?id=${j.id}'" style="cursor:pointer">
        <div class="jc-top">
          <div class="flex" style="gap:10px;align-items:center;min-width:0">
            <span class="jc-tile" style="background:var(--grad-brand)">${esc(j.name.slice(0, 1))}</span>
            <div style="min-width:0">
              <div class="jc-name">${esc(j.name)}</div>
              <div style="font-size:11px;color:var(--text-3);font-weight:600">${esc(j.category)}</div>
            </div>
          </div>
          ${j.hot ? '<span class="hot-tag">🔥 热门</span>' : (j.match ? `<span class="tag green">匹配 ${j.match}%</span>` : '')}
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
  } catch (e) { box.innerHTML = '<div class="empty">加载失败</div>'; }
}
renderJobs();

// ---------- 人生剧本（2个） ----------
try {
  const r = await api.get('/api/scripts');
  document.getElementById('scriptList').innerHTML = r.items.slice(0, 2).map(s => `
    <div class="card script-card" onclick="location.href='scripts.html?open=${s.id}'" style="cursor:pointer;padding:18px">
      <div class="sc-av" style="background:${s.color};width:46px;height:46px;font-size:20px;border-radius:14px">🎬</div>
      <div>
        <h4 style="font-size:15px">${esc(s.title)}</h4>
        <div class="sc-sub" style="font-size:12px">${esc(s.subtitle)}</div>
      </div>
    </div>`).join('');
} catch (e) {}

// ---------- 社区（2个） ----------
try {
  const r = await api.get('/api/community?group=all');
  document.getElementById('postList').innerHTML = r.posts.slice(0, 2).map(p => `
    <div class="card post-card" onclick="location.href='community.html?post=${p.id}'" style="cursor:pointer;padding:18px">
      <div class="post-head">
        ${avatarHtml(p.user.nickname)}
        <div><b style="font-size:13.5px">${esc(p.user.nickname)}</b><div class="ph-time">${timeAgo(p.created_at)}</div></div>
      </div>
      <h4 style="font-size:15px">${esc(p.title)}</h4>
      <p style="font-size:13px;margin-bottom:8px">${esc(p.content.slice(0, 60))}…</p>
      <div class="post-foot"><span style="font-size:12.5px;color:var(--text-3)">👍 ${p.likes} · 💬 讨论</span></div>
    </div>`).join('');
} catch (e) {}

// ---------- 同路人声音（3个） ----------
try {
  const r = await api.get('/api/scripts');
  const picks = [r.items[0], r.items[2], r.items[5]].filter(Boolean);
  document.getElementById('voiceList').innerHTML = picks.map((s, i) => `
    <div class="card voice-card" style="padding:18px 20px">
      <div class="vc-quote" style="font-size:30px">"</div>
      <p style="font-size:13px;min-height:0;margin-bottom:10px">${esc(s.insights[0])}</p>
      <div class="vc-by">
        ${avatarHtml(s.subtitle.slice(0, 6))}
        <div><b style="font-size:13px">${esc(s.title.split('：')[0])}</b><span style="font-size:11px">${esc(s.subtitle)}</span></div>
      </div>
    </div>`).join('');
} catch (e) {}

// ---------- 产品轮播 ----------
const track = document.getElementById('carTrack');
const slides = [...track.querySelectorAll('.carousel-slide')];
const dotsBox = document.getElementById('carDots');
const titleBox = document.getElementById('carouselTitle');
const n = slides.length;
let cur = 0;

function renderDots() {
  dotsBox.innerHTML = slides.map((_, i) => `<button class="car-dot ${i === cur ? 'on' : ''}" data-i="${i}" aria-label="第${i + 1}页"></button>`).join('');
  dotsBox.querySelectorAll('.car-dot').forEach(d => d.addEventListener('click', () => go(parseInt(d.dataset.i, 10))));
}
function go(i) {
  cur = (i + n) % n;
  track.style.transform = `translateX(-${cur * 100}%)`;
  titleBox.textContent = slides[cur].dataset.title;
  renderDots();
}
document.getElementById('carPrev').addEventListener('click', () => go(cur - 1));
document.getElementById('carNext').addEventListener('click', () => go(cur + 1));
const carousel = document.getElementById('productCarousel');
// 键盘左右切换（轮播获得焦点时）
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') go(cur + 1);
  else if (e.key === 'ArrowLeft') go(cur - 1);
});
// 触摸滑动（简单版）
let startX = null;
carousel.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
carousel.addEventListener('touchend', e => {
  if (startX === null) return;
  const dx = e.changedTouches[0].clientX - startX;
  if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1));
  startX = null;
}, { passive: true });

go(0);

// ---------- Hero 插画 · 人生节点交互 ----------
document.querySelectorAll('.node-hot').forEach(btn => {
  const g = document.querySelector('.milestone[data-node="' + btn.dataset.node + '"]');
  const lit = (on) => { if (g) g.classList.toggle('lit', on); };
  btn.addEventListener('mouseenter', () => lit(true));
  btn.addEventListener('mouseleave', () => lit(false));
  btn.addEventListener('focus', () => lit(true));
  btn.addEventListener('blur', () => lit(false));
  btn.addEventListener('click', () => { if (btn.dataset.href) location.href = btn.dataset.href; });
});
