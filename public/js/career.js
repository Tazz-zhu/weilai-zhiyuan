// 职业详情
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, toast, memberGate, requireAuth } from './ui.js';
import { radarChart, probRing, salaryRangeBar } from './charts.js';
import { mountTrial } from './trial.js';

const user = await bootstrap('careers');
const params = new URLSearchParams(location.search);
const id = params.get('id');
const box = document.getElementById('detailBox');

if (!id) { box.innerHTML = '<div class="empty"><h4>缺少职业ID</h4></div>'; }

let data = null;
try {
  const r = await api.get('/api/careers/' + id);
  data = r;
} catch (e) {
  box.innerHTML = `<div class="empty"><div class="ic">😢</div><h4>${esc(e.message)}</h4></div>`;
}

if (data) {
  const c = data.career;
  const member = data.member;
  const radar = c.radar;
  box.innerHTML = `
    <div class="card" style="padding:32px">
      <div class="flex-between flex-wrap mb-16">
        <div class="flex" style="gap:14px">
          <div class="avatar xl" style="background:linear-gradient(135deg,#ff8c42,#ffb45e);font-size:34px">${esc(c.name.slice(0, 1))}</div>
          <div>
            <h1 style="font-size:30px;font-weight:900;color:var(--deep)">${esc(c.name)}</h1>
            <div class="flex mt-8" style="gap:8px;flex-wrap:wrap">
              <span class="tag orange">${esc(c.category)}</span>
              ${c.hot ? '<span class="hot-tag">🔥 热门</span>' : ''}
              ${(c.tags || []).map(t => `<span class="tag">#${esc(t)}</span>`).join('')}
            </div>
          </div>
        </div>
        <div class="flex" style="gap:10px;flex-wrap:wrap">
          <a class="btn btn-primary" href="planner.html?career=${c.id}">🧭 完整路径拆解</a>
          <a class="btn btn-accent" href="community.html?career=${c.id}">💬 进入${esc(c.name)}圈子</a>
          <a class="btn btn-deep" href="sim.html?career=${c.id}">🎮 体验这条平行人生</a>
          <button class="btn btn-ghost" id="favBtn">☆ 收藏</button>
        </div>
      </div>
      <p style="font-size:15px;color:var(--text-2);max-width:760px;margin-bottom:22px">${esc(c.summary)}</p>

      <div class="grid grid-3" style="gap:14px;margin-bottom:20px">
        <div class="card" style="padding:18px;background:var(--bg);border:0"><b style="color:var(--deep)">🎓 门槛</b><div class="mt-8" style="font-size:15px;font-weight:700;color:var(--text)">${esc(c.education)}</div></div>
        <div class="card" style="padding:18px;background:var(--bg);border:0"><b style="color:var(--deep)">⏳ 经验</b><div class="mt-8" style="font-size:15px;font-weight:700;color:var(--text)">${esc(c.experience)}</div></div>
        <div class="card" style="padding:18px;background:var(--bg);border:0">
          <b style="color:var(--deep)">💰 收入区间</b>
          <div class="mt-8" id="salaryBarBox" style="min-height:38px"></div>
        </div>
      </div>

      <div class="card" style="padding:22px;margin-bottom:26px;background:linear-gradient(135deg,#fff,#f8fbff)">
        <div class="flex-between flex-wrap mb-8" style="gap:10px">
          <b style="color:var(--deep)">📡 岗位透视</b>
          <span class="muted">AI 冲击度 · 市场需求 · 门槛压力</span>
        </div>
        <div class="grid grid-3" style="gap:14px">
          <div class="text-center"><div id="demandRing"></div><div class="gauge-label">市场需求度</div></div>
          <div class="text-center"><div id="aiRing"></div><div class="gauge-label">AI 抗冲击度</div></div>
          <div class="text-center"><div id="barrierRing"></div><div class="gauge-label">入行友好度</div></div>
        </div>
      </div>

      <div class="grid grid-2" style="gap:26px">
        <div>
          <h3 style="font-size:17px;color:var(--deep);margin-bottom:10px">📡 四维雷达</h3>
          <div class="chart-box" id="radarBox"></div>
          <div class="radar-legend" id="radarLegend"></div>
        </div>
        <div>
          <h3 style="font-size:17px;color:var(--deep);margin-bottom:10px">💼 需要的能力</h3>
          <div class="flex-wrap mb-16" style="display:flex;gap:8px;flex-wrap:wrap">
            ${(c.skills || []).map(s => `<span class="tag blue">${esc(s)}</span>`).join('')}
          </div>
          <h3 style="font-size:17px;color:var(--deep);margin-bottom:10px">🧩 适合的性格</h3>
          <div class="flex-wrap mb-16" style="display:flex;gap:8px;flex-wrap:wrap">
            ${(c.traits || []).map(t => `<span class="tag green">${esc(t)}</span>`).join('')}
          </div>
          <h3 style="font-size:17px;color:var(--deep);margin-bottom:10px">🗺️ 典型路径</h3>
          <p style="font-size:13.5px;color:var(--text-2);background:var(--bg);padding:12px 16px;border-radius:12px">${esc(c.path)}</p>
        </div>
      </div>

      <div id="trialMount"></div>

      <div class="divider"></div>

      <div class="grid grid-2" style="gap:26px">
        <div class="card" style="padding:22px;border-left:4px solid var(--accent)">
          <h3 style="font-size:16.5px;color:var(--deep);margin-bottom:8px">🎬 一天的vlog</h3>
          ${c.day
            ? `<p style="font-size:14px;color:var(--text-2);line-height:1.8">${esc(c.day)}</p>`
            : `<div class="gate"><div class="gt-ic">🔒</div><h4>会员专属 · 职业一天</h4><p>开通会员，解锁从业者真实的一天工作记录。</p><button class="btn btn-primary" id="unlockDayBtn">解锁查看</button></div>`}
        </div>
        <div class="card" style="padding:22px;border-left:4px solid var(--gold)">
          <h3 style="font-size:16.5px;color:var(--deep);margin-bottom:8px">💬 过来人的真心话</h3>
          ${c.truth
            ? `<p style="font-size:14px;color:var(--text-2);line-height:1.8">${esc(c.truth)}</p>
               <div style="margin-top:12px;padding:12px 16px;background:var(--gold-soft);border-radius:12px"><b style="font-size:13px;color:#b97a1f">📢 推荐/劝退：</b><span style="font-size:13.5px;color:var(--text-2)">${esc(c.talk)}</span></div>`
            : `<div class="gate"><div class="gt-ic">🔒</div><h4>会员专属 · 真心话</h4><p>开通会员，解锁学长学姐的真实体验与避坑建议。</p><button class="btn btn-primary" id="unlockTruthBtn">解锁查看</button></div>`}
        </div>
      </div>

      <div class="text-center mt-32">
        <a class="btn btn-primary btn-lg" href="planner.html?career=${c.id}">🧭 生成我的【${esc(c.name)}】人生路径</a>
      </div>
    </div>`;

  // 雷达图
  radarChart(document.getElementById('radarBox'), {
    labels: ['收入', '压力', '前景', '门槛'],
    values: [radar.income, radar.stress, radar.prospect, radar.barrier]
  });
  document.getElementById('radarLegend').innerHTML = `
    <div><b>收入</b> ${radar.income}/100</div>
    <div><b>压力</b> ${radar.stress}/100</div>
    <div><b>前景</b> ${radar.prospect}/100</div>
    <div><b>门槛</b> ${radar.barrier}/100</div>`;

  // 岗位透视
  salaryRangeBar(document.getElementById('salaryBarBox'), c.salaryRange || { min: 8, max: 20, text: c.salary }, { min: 0, max: 100 });
  probRing(document.getElementById('demandRing'), { value: c.demand, label: '需求', color: '#2eaa8a', size: 92 });
  probRing(document.getElementById('aiRing'), { value: 100 - (c.aiRisk ?? 50), label: '抗冲击', color: '#7c6cf0', size: 92 });
  probRing(document.getElementById('barrierRing'), { value: 100 - c.radar.barrier, label: '友好', color: '#4aa3c2', size: 92 });

  // 收藏
  const favBtn = document.getElementById('favBtn');
  let favState = !!data.fav;
  favBtn.textContent = favState ? '⭐ 已收藏' : '☆ 收藏';
  favBtn.addEventListener('click', async () => {
    const u = requireAuth(); if (!u) return;
    favState = !favState;
    favBtn.textContent = favState ? '⭐ 已收藏' : '☆ 收藏';
    if (favState) await api.post('/api/careers/' + c.id + '/favorite'); else await api.del('/api/careers/' + c.id + '/favorite');
    toast(favState ? '已收藏「' + c.name + '」，可在我的收藏查看' : '已取消收藏', 'success');
  });
  // 圈子热帖
  try {
    const cr = await api.get('/api/community?career=' + c.id + '&sort=hot&limit=3').catch(() => null);
    if (cr && cr.posts && cr.posts.length) {
      const hotBox = document.createElement('div');
      hotBox.className = 'card mt-16';
      hotBox.style.padding = '18px 22px';
      hotBox.innerHTML = '<h3 style="font-size:15px;color:var(--deep);margin-bottom:10px">🔥 「' + esc(c.name) + '」圈子最近热帖</h3>' +
        cr.posts.map(p => '<a class="muted" style="display:block;font-size:13px;padding:6px 0;border-bottom:1px dashed var(--line)" href="community.html?post=' + p.id + '">' + esc(p.title) + ' <span style="color:var(--text-3)">· 👍' + p.likes + '</span></a>').join('');
      document.querySelector('#detailBox .card').appendChild(hotBox);
    }
  } catch (e) { /* ignore */ }

  // 记录最近浏览
  try {
    let rec = JSON.parse(localStorage.getItem('zy_recent') || '[]');
    rec = [{ label: c.name + '（' + c.category + '）', href: 'career.html?id=' + c.id }, ...rec.filter(x => x.href !== 'career.html?id=' + c.id)].slice(0, 8);
    localStorage.setItem('zy_recent', JSON.stringify(rec));
  } catch (e) {}
  // 分享文案
  const shareBtn = document.createElement('button');
  shareBtn.className = 'btn btn-ghost btn-sm';
  shareBtn.textContent = '📤 分享';
  shareBtn.addEventListener('click', async () => {
    const txt = '【' + c.name + '】' + c.summary + ' —— 来自「未来致远」，你的人生自己导航：' + location.origin + '/career.html?id=' + c.id;
    try { await navigator.clipboard.writeText(txt); toast('分享文案已复制，去粘贴吧！', 'success'); }
    catch (e) { toast('复制失败，请手动复制地址', 'error'); }
  });
  const btnArea = document.querySelector('#detailBox .card .flex-between .flex');
  if (btnArea) btnArea.appendChild(shareBtn);

  // 职业试玩
  mountTrial(document.getElementById('trialMount'), c);

  // 会员门控按钮
  const unlockDay = document.getElementById('unlockDayBtn');
  const unlockTruth = document.getElementById('unlockTruthBtn');
  if (unlockDay) unlockDay.addEventListener('click', () => memberGate({
    title: '解锁「' + c.name + '」职业一天', desc: '会员可查看全部 100+ 职业的一天vlog、真心话与完整路径拆解。', user
  }));
  if (unlockTruth) unlockTruth.addEventListener('click', () => memberGate({
    title: '解锁「' + c.name + '」真心话', desc: '会员可查看全部职业的过来人真实体验与避坑建议。', user
  }));
}
