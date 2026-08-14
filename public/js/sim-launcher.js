// 人生模拟舱 · 启动器（存档管理 / 平行人生对比报告 / 社区闭环）
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, toast, openLogin, openModal, closeModal } from './ui.js';

const user = await bootstrap('sim');
const $ = id => document.getElementById(id);

const DEEP_IDS = ['c001', 'c003', 'c005', 'c027', 'c029', 'c035', 'c070', 'c072', 'c002', 'c011', 'c012', 'c016', 'c028', 'c031', 'c037', 'c042', 'c053', 'c054', 'c058', 'c089', 'c094', 'c095', 'c097', 'c099', 'c110', 'c111', 'c119', 'c139', 'c140', 'c176', 'c179', 'c180'];
const HANDBOOK_IDS = new Set(['c001', 'c003', 'c005', 'c027', 'c029', 'c035', 'c070', 'c072']);

let LIB = { careers: [] };
let runs = [];

function guestId() {
  let g = null;
  try { g = localStorage.getItem('msrl_guest'); } catch (e) {}
  if (!g) {
    g = 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    try { localStorage.setItem('msrl_guest', g); } catch (e) {}
  }
  return g;
}

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const tk = api.token || localStorage.getItem('zy_token') || null;
  if (tk) headers['Authorization'] = 'Bearer ' + tk;
  else headers['X-Guest-Id'] = guestId();
  let res;
  try {
    res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch (e) { throw new Error('网络连接失败'); }
  let json = null;
  try { json = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error((json && json.error) || '请求失败');
  return json;
}

function careerName(id) { const c = LIB.careers.find(x => x.id === id); return c ? c.name : '未知职业'; }

function timeAgoText(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return '刚刚';
  if (s < 3600) return Math.floor(s / 60) + ' 分钟前';
  if (s < 86400) return Math.floor(s / 3600) + ' 小时前';
  return Math.floor(s / 86400) + ' 天前';
}

/* ---------- 渲染 ---------- */
function renderGuestBanner() {
  const b = $('guestBanner');
  if (!b) return;
  if (user) { b.style.display = 'none'; return; }
  b.style.display = '';
  const btn = $('btnLogin');
  if (btn) btn.addEventListener('click', () => openLogin());
}

function renderRuns() {
  const box = $('runsBox');
  const cnt = $('runCount');
  if (cnt) cnt.textContent = runs.length + ' 局';
  if (!box) return;
  if (!runs.length) {
    box.innerHTML = '<div class="card empty" style="grid-column:1/-1"><div class="ic">🎮</div><h4>还没有平行人生</h4><p class="muted">点击上方「开始一段新人生」，从高一活到第一份工作。</p></div>';
    return;
  }
  box.innerHTML = runs.map(r => {
    const playing = r.status !== 'finished';
    const stage = r.ending ? (r.ending.offer || '已通关') : (r.stage_label || '开局');
    return `<div class="card" style="padding:18px">
      <div class="flex-between" style="gap:10px;flex-wrap:wrap">
        <div class="flex" style="gap:10px;align-items:center">
          <div class="avatar lg" style="background:linear-gradient(135deg,#6c5ce7,#a29bfe);font-size:20px">${esc((r.career_name || '🎮').slice(0, 1))}</div>
          <div>
            <b style="color:var(--deep)">${esc(r.career_name || '平行人生')}</b>
            <div class="muted" style="font-size:12.5px;margin-top:2px">${playing ? '⏳ ' + esc(r.stage_label || '进行中') : '🏁 ' + esc(stage)} · ${timeAgoText(r.updated_at)}</div>
          </div>
        </div>
        <span class="tag ${playing ? 'blue' : 'green'}">${playing ? '进行中' : '已通关'}</span>
      </div>
      <div class="flex mt-12" style="gap:8px;flex-wrap:wrap">
        ${playing ? `<a class="btn btn-primary btn-sm" href="sim/index.html?run=${r.id}">▶ 继续</a>` : ''}
        ${r.ending ? `<button class="btn btn-soft btn-sm" data-report="${r.id}">📊 平行人生报告</button>` : ''}
        <button class="btn btn-ghost btn-sm" data-del="${r.id}">🗑️ 删除</button>
      </div>
    </div>`;
  }).join('');
  box.querySelectorAll('[data-report]').forEach(b => b.addEventListener('click', () => openReport(parseInt(b.dataset.report, 10))));
  box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('确定删除这局平行人生吗？删除后不可恢复。')) return;
    try { await req('DELETE', '/api/sim/runs/' + b.dataset.del); toast('已删除', 'success'); loadRuns(); }
    catch (e) { toast(e.message, 'error'); }
  }));
}

function renderCareers() {
  const box = $('careerGrid');
  if (!box) return;
  const deep = LIB.careers.filter(c => DEEP_IDS.includes(c.id));
  box.innerHTML = deep.map(c => {
    const auto = !HANDBOOK_IDS.has(c.id);
    return `<div class="card" style="padding:16px;cursor:pointer" data-career="${c.id}">
      <div class="flex-between" style="gap:8px">
        <b style="color:var(--deep)">${esc(c.name)}</b>
        <span class="tag ${auto ? 'orange' : 'purple'}" style="font-size:10.5px">${auto ? 'AI 路线' : '深度精修'}</span>
      </div>
      <p class="muted mt-8" style="font-size:12.5px;min-height:34px">${esc((c.summary || '').slice(0, 42))}…</p>
      <div class="flex-between mt-12">
        <span class="muted" style="font-size:12px">${esc(c.salary || '')}</span>
        <button class="btn btn-primary btn-sm" data-start="${c.id}">🎮 体验</button>
      </div>
    </div>`;
  }).join('');
  box.querySelectorAll('[data-start]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    startRun(b.dataset.start);
  }));
  box.querySelectorAll('[data-career]').forEach(card => card.addEventListener('click', () => startRun(card.dataset.career)));
}

function startRun(careerId) {
  const q = new URLSearchParams();
  q.set('new', '1');
  if (careerId) q.set('career', careerId);
  if (user) q.set('profile', '1');
  location.href = 'sim/index.html?' + q.toString();
}
/* ---------- 平行人生对比报告 ---------- */
async function openReport(runId) {
  try {
    const r = await req('GET', '/api/sim/runs/' + runId);
    const run = r.run;
    if (!run.ending) { toast('这局还没通关，先去把人生走完吧', 'info'); return; }
    let dash = null, assessment = null;
    if (user) {
      try { dash = await api.get('/api/dashboard'); } catch (e) {}
      try { assessment = await api.get('/api/assessments/latest'); } catch (e) {}
    }
    const st = run.state || {};
    const e = run.ending || {};
    const career = LIB.careers.find(x => x.id === run.career_id);
    const realTop = (assessment && assessment.assessment && assessment.assessment.result && assessment.assessment.result.interestTop) || [];
    const realTopStr = realTop.length ? realTop.slice(0, 3).map(t => t.key).join(' · ') : '未测评';
    const person = dash ? `<div class="rep-row"><span>成长指数</span><b>${dash.growthIndex || 0}</b></div>
      <div class="rep-row"><span>人生足迹</span><b>${(dash.dashboard && dash.dashboard.total) || 0} 条</b></div>
      <div class="rep-row"><span>徽章</span><b>${(dash.badges || []).length} 枚</b></div>
      <div class="rep-row"><span>兴趣画像</span><b>${realTopStr}</b></div>` : '<p class="muted">登录后查看「现实的我」数据对照。</p>';
    const parallel = `<div class="rep-row"><span>目标职业</span><b>${esc(career ? career.name : '')}</b></div>
      <div class="rep-row"><span>第一份工作</span><b>${esc(e.offer || '')}</b></div>
      <div class="rep-row"><span>公司</span><b>${esc(e.company || '')}</b></div>
      <div class="rep-row"><span>职业匹配度</span><b>${e.match || 0}%</b></div>
      <div class="rep-row"><span>路线图节点</span><b>${(st.roadmapDone || []).length} 个</b></div>`;
    const reportId = 'simReportModal';
    const existing = $('simReportModal');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'modal-mask';
    div.id = reportId;
    div.innerHTML = `<div class="modal" style="max-width:860px">
      <div class="modal-head"><h3>📊 平行人生对比报告</h3><button class="modal-close" data-close="simReportModal">×</button></div>
      <div class="modal-body">
        <div class="grid grid-2" style="gap:14px">
          <div class="card" style="padding:18px;background:linear-gradient(135deg,#eef6ff,#fff)">
            <h4 style="color:var(--deep)">🧑 现实的我</h4>
            <div style="margin-top:10px">${person}</div>
          </div>
          <div class="card" style="padding:18px;background:linear-gradient(135deg,#f5eeff,#fff)">
            <h4 style="color:#6c5ce7">🎮 平行的我 · ${esc(st.prot && st.prot.name || '')}</h4>
            <div style="margin-top:10px">${parallel}</div>
          </div>
        </div>
        <div class="mt-16" style="text-align:center">
          <canvas id="simPoster" width="900" height="360" style="width:100%;border-radius:14px;box-shadow:0 8px 30px rgba(20,30,80,.18)"></canvas>
        </div>
        <div class="flex mt-16" style="gap:10px;justify-content:center;flex-wrap:wrap">
          <a class="btn btn-primary" id="dlPoster" download="平行人生.png" href="#">⬇️ 下载结局卡</a>
          <button class="btn btn-deep" id="pubPoster">💬 发布到社区</button>
          <button class="btn btn-soft" id="replayBtn">🔄 再体验一次</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(div);
    drawPoster($('simPoster'), { career: career ? career.name : '', offer: e.offer || '', company: e.company || '', salary: e.salary || '', match: e.match || 0, name: st.prot && st.prot.name || '我', done: (st.roadmapDone || []).length });
    setTimeout(() => {
      const dl = $('dlPoster');
      if (dl) dl.href = $('simPoster').toDataURL('image/png');
    }, 60);
    $('simReportModal').querySelector('[data-close]').addEventListener('click', () => closeModal(reportId));
    $('replayBtn').addEventListener('click', () => startRun(run.career_id));
    $('pubPoster').addEventListener('click', () => publishReport(run, reportId));
    openModal(reportId);
  } catch (e) {
    toast(e.message, 'error');
  }
}

function drawPoster(canvas, d) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1b2a5e'); g.addColorStop(0.55, '#2a3f85'); g.addColorStop(1, '#141e4a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + Math.random() * 0.6) + ')';
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H * 0.7, Math.random() * 1.8, 0, 7);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76e';
  ctx.font = '800 34px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('🎮 平行人生 · 未来致远', W / 2, 66);
  ctx.fillStyle = '#fff';
  ctx.font = '700 46px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('我的平行人生：' + d.career, W / 2, 140);
  ctx.fillStyle = '#ffd76e';
  ctx.font = '600 30px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('第一份工作 · ' + d.offer, W / 2, 196);
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.font = '600 20px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(d.company + ' · ' + d.salary, W / 2, 232);
  ctx.fillStyle = '#fff';
  ctx.font = '600 22px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('职业匹配度 ' + d.match + '% · 路线图达成 ' + d.done + ' 个节点', W / 2, 278);
  ctx.fillStyle = 'rgba(255,255,255,.72)';
  ctx.font = '17px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText('—— ' + d.name + ' 的平行人生，欢迎你也来体验一次 ——', W / 2, 322);
}

async function publishReport(run, reportId) {
  if (!user) { toast('请先登录后再发布', 'error'); openLogin(); return; }
  const career = LIB.careers.find(x => x.id === run.career_id);
  const e = run.ending || {};
  const btn = $('pubPoster');
  if (btn) { btn.disabled = true; btn.textContent = '发布中…'; }
  try {
    const canvas = $('simPoster');
    const b64 = canvas.toDataURL('image/png').split(',')[1] || '';
    const up = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.token }, body: JSON.stringify({ type: 'image/png', data: b64 }) });
    const upj = await up.json();
    const media = upj && upj.url ? [{ url: upj.url, type: 'image/png' }] : [];
    const content = '🎮 刚从高一活到第一份工作：\n🎯 ' + (career ? career.name : '') + '\n💼 ' + (e.offer || '') + ' @ ' + (e.company || '') + '（' + (e.salary || '') + '）\n🧭 职业匹配度 ' + (e.match || 0) + '%\n\n#平行人生# 你也可以来体验这条人生线。';
    const rj = await api.post('/api/community', { title: '我的平行人生：成为' + (career ? career.name : '') + ' @ ' + (e.company || ''), content, career_id: run.career_id, post_type: 'share', media });
    toast('✅ 已发布到社区', 'success');
    if (btn) btn.textContent = '✅ 已发布';
  } catch (err) {
    toast(err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = '💬 发布到社区'; }
  }
}

/* ---------- 初始化 ---------- */
async function loadRuns() {
  try { runs = (await req('GET', '/api/sim/runs')).runs || []; }
  catch (e) { runs = []; }
  renderRuns();
}

async function boot() {
  $('btnNewRun').addEventListener('click', () => startRun(null));
  renderGuestBanner();
  try {
    const l = await req('GET', '/api/library');
    LIB = l;
  } catch (e) {}
  renderCareers();
  if (user) {
    try { await req('POST', '/api/sim/claim', { guest_id: guestId() }); } catch (e) {}
  }
  await loadRuns();
  const params = new URLSearchParams(location.search);
  if (params.get('career')) {
    const id = params.get('career');
    const c = LIB.careers.find(x => x.id === id);
    if (c && confirm('即将体验：' + c.name + ' 的平行人生，是否开始？')) startRun(id);
  }
}

boot();