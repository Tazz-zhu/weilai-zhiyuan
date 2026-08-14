// AI 生涯规划师
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, toast, memberGate } from './ui.js';
import { barList, probRing } from './charts.js';

const user = await bootstrap('planner', { auth: true, redirect: 'index.html?login=1' });
const body = document.getElementById('plannerBody');
const params = new URLSearchParams(location.search);
const directCareer = params.get('career');

const MILE_KEY = (uid, cid) => 'zy_miles_' + uid + '_' + cid;
function loadMiles(uid, cid) {
  try { return JSON.parse(localStorage.getItem(MILE_KEY(uid, cid)) || '{}'); } catch { return {}; }
}
function saveMiles(uid, cid, miles) { localStorage.setItem(MILE_KEY(uid, cid), JSON.stringify(miles)); }

// ---------- 无测评时的引导 ----------
function noAssessment() {
  body.innerHTML = `
    <div class="card" style="padding:44px;text-align:center">
      <div style="font-size:52px">🧭</div>
      <h2 style="font-size:24px;color:var(--deep);margin:12px 0 8px">还没有你的生涯画像</h2>
      <p class="text-2" style="max-width:460px;margin:0 auto 22px">完成四维深度测评（约5分钟），AI 将基于你的兴趣、性格、能力与价值观推荐 3-5 条最适合的职业路径。</p>
      <div class="flex" style="justify-content:center;gap:14px;flex-wrap:wrap">
        <a class="btn btn-primary btn-lg" href="assessment.html">开始四维测评</a>
        <a class="btn btn-ghost btn-lg" href="careers.html">先逛逛职业库</a>
      </div>
    </div>`;
}

// ---------- 渲染推荐列表 ----------
function renderRecs(recs, member) {
  body.innerHTML = `
    <div class="grid grid-3 mb-24" style="gap:14px">
      <div class="card" style="padding:18px;text-align:center;background:var(--primary-soft);border:0">
        <div style="font-size:26px;font-weight:900;color:var(--primary-strong)">${recs.length}</div>
        <div class="muted">推荐路径</div>
      </div>
      <div class="card" style="padding:18px;text-align:center;background:var(--accent-soft);border:0">
        <div style="font-size:26px;font-weight:900;color:#2f7d97">${recs[0] ? recs[0].match + '%' : '-'}</div>
        <div class="muted">最高匹配度</div>
      </div>
      <div class="card" style="padding:18px;text-align:center;background:var(--teal-soft);border:0">
        <div style="font-size:26px;font-weight:900;color:#2e8a78">${recs[0] ? recs[0].probability + '%' : '-'}</div>
        <div class="muted">首选路径成功率</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      ${recs.map((rec, i) => recCard(rec, i, member)).join('')}
    </div>`;
  recs.forEach((rec, i) => {
    document.getElementById('pathBtn-' + rec.career.id).addEventListener('click', () => loadPath(rec.career.id));
    probRing(document.getElementById('prob-' + rec.career.id), { value: rec.probability, label: '成功率', color: ['#ff8c42', '#4aa3c2', '#7c6cf0', '#2eaa8a', '#e86a8a'][i % 5], size: 92 });
    const bars = document.querySelectorAll('.rec-card .bar-fill');
    requestAnimationFrame(() => { bars.forEach(b => { b.style.width = b.parentElement.parentElement.querySelector('b').textContent; }); });
  });
  if (!member) {
    const gm = document.getElementById('gateMoreBtn');
    if (gm) gm.addEventListener('click', () => memberGate({ title: '解锁全部 5 条推荐路径', desc: '会员可查看完整推荐、概率测算、里程碑与 Plan B/C。', user }));
  }
}

function recCard(rec, i, member) {
  const rankColors = ['#ff8c42', '#4aa3c2', '#7c6cf0', '#4caf9a', '#e86a8a'];
  return `
    <div class="card rec-card">
      <div class="rec-rank" style="background:${rankColors[i % 5]}">${i + 1}</div>
      <div class="rec-body">
        <h4>${esc(rec.career.name)} <span class="tag orange" style="font-size:11px">${esc(rec.career.category)}</span></h4>
        <p>${esc(rec.career.summary)}</p>
        <div class="flex" style="gap:12px;flex-wrap:wrap">
          <span class="tag">💰 ${esc(rec.career.salary)}</span>
          <span class="tag green">成功概率 ${rec.probability}%</span>
        </div>
        <div class="flex" style="gap:10px;align-items:center;margin-top:12px;max-width:320px">
          <span style="font-size:12.5px;color:var(--text-2);font-weight:700;width:52px">匹配度</span>
          <div class="bar-track" style="height:9px"><div class="bar-fill" style="width:0%"></div></div>
          <b style="color:var(--primary-strong);font-size:14px;min-width:40px">${rec.match}%</b>
        </div>
      </div>
      <div class="text-center" style="flex-shrink:0">
        <div id="prob-${rec.career.id}"></div>
        <button class="btn btn-primary btn-sm mt-8" id="pathBtn-${rec.career.id}">拆解路径 →</button>
      </div>
    </div>`;
}

// ---------- 渲染路径详情 ----------
async function renderPath(career, path, member) {
  const uid = user.id;
  const miles = loadMiles(uid, career.id);
  body.innerHTML = `
    <a href="planner.html" class="btn btn-ghost btn-sm mb-16">← 返回推荐列表</a>
    <div class="card" style="padding:28px">
      <div class="flex-between flex-wrap">
        <div class="flex" style="gap:14px">
          <div class="avatar xl" style="background:linear-gradient(135deg,#ff8c42,#ffb45e);font-size:30px">${esc(career.name.slice(0, 1))}</div>
          <div>
            <h1 style="font-size:26px;font-weight:900;color:var(--deep)">${esc(career.name)} · 人生路径拆解</h1>
            <div class="flex mt-8" style="gap:8px;flex-wrap:wrap">
              <span class="tag orange">${esc(career.category)}</span>
              <span class="tag green">成功率约 ${recProb(career)}</span>
            </div>
          </div>
        </div>
        <div class="text-right">
          <a class="btn btn-soft btn-sm" href="career.html?id=${career.id}">查看职业详情</a>
        </div>
      </div>
      <div class="divider"></div>
      ${path.stages.map((st, si) => `
        <div class="card stage-card s${si}" style="padding:22px;margin-bottom:16px">
          <div class="flex-between flex-wrap">
            <div>
              <h4>${esc(st.phase)} <span class="tag" style="margin-left:6px">${esc(st.duration)}</span></h4>
              <div class="phase">目标：${esc(st.goal)}</div>
            </div>
            <div class="flex" style="gap:6px;flex-wrap:wrap">
              ${st.skills.slice(0, 4).map(s => `<span class="tag blue">${esc(s)}</span>`).join('')}
            </div>
          </div>
          <ul>${st.actions.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
          <div style="margin-top:10px;border-top:1px dashed var(--line);padding-top:10px">
            <b style="font-size:13px;color:var(--deep)">🏁 里程碑（可勾选打卡）</b>
            ${st.milestones.map((m, mi) => {
              const key = si + '_' + mi;
              const done = !!miles[key];
              return `<div class="mile-row ${done ? 'done' : ''}">
                <span class="mile-check ${done ? 'on' : ''}" data-k="${key}">${done ? '✓' : ''}</span>
                <span class="mile-text">${esc(m.text)}</span>
              </div>`;
            }).join('')}
          </div>
        </div>`).join('')}

      <div class="grid grid-2 mt-8" style="gap:16px">
        <div class="card" style="padding:20px;border-left:4px solid var(--teal)">
          <h4 style="color:var(--deep)">🛟 Plan B（备选方案）</h4>
          ${path.planB ? `
            <p style="font-size:13.5px;color:var(--text-2);margin:8px 0">${esc(path.planB.summary)}</p>
            <div class="flex" style="gap:8px;flex-wrap:wrap">
              <span class="tag green">成功率约 ${path.planB.probability}%</span>
              <span class="tag">门槛 ${path.planB.barrier}/100</span>
              <a class="tag blue" href="planner.html?career=${path.planB.id}" style="cursor:pointer">查看 →</a>
            </div>` : '<p class="muted">暂无</p>'}
        </div>
        <div class="card" style="padding:20px;border-left:4px solid var(--accent)">
          <h4 style="color:var(--deep)">🛟 Plan C（退路方案）</h4>
          ${path.planC ? `
            <p style="font-size:13.5px;color:var(--text-2);margin:8px 0">${esc(path.planC.summary)}</p>
            <div class="flex" style="gap:8px;flex-wrap:wrap">
              <span class="tag green">成功率约 ${path.planC.probability}%</span>
              <span class="tag">门槛 ${path.planC.barrier}/100</span>
              <a class="tag blue" href="planner.html?career=${path.planC.id}" style="cursor:pointer">查看 →</a>
            </div>` : '<p class="muted">暂无</p>'}
        </div>
      </div>

      <div class="card mt-16" style="padding:20px;background:var(--rose-soft);border:0">
        <h4 style="color:var(--deep);margin-bottom:10px">⚠️ 风险提示</h4>
        <div id="riskBars"></div>
      </div>}

      <div class="text-center mt-24">
        <a class="btn btn-deep btn-lg" href="timeline.html">📖 把第一步记进我的成长时光轴</a>
      </div>
    </div>`;

  // 里程碑打卡
  document.querySelectorAll('.mile-check').forEach(chk => {
    chk.addEventListener('click', () => {
      const key = chk.dataset.k;
      miles[key] = !miles[key];
      saveMiles(uid, career.id, miles);
      const row = chk.closest('.mile-row');
      chk.classList.toggle('on', miles[key]);
      chk.textContent = miles[key] ? '✓' : '';
      row.classList.toggle('done', miles[key]);
      const doneCount = Object.values(miles).filter(Boolean).length;
      toast(doneCount + ' 个里程碑已打卡，继续加油！', 'success');
    });
  });
  // 风险条形
  if (member) {
    barList(document.getElementById('riskBars'), path.riskPoints.map(rp => ({ label: rp.label, value: rp.value })), { color: '#e86a8a' });
  }
}
function recProb(career) { return career.radar ? (career.radar.prospect + 30) + '%' : '85%'; }

// ---------- 加载路径 ----------
async function loadPath(cid) {
  body.innerHTML = '<div class="skeleton" style="height:300px;border-radius:20px"></div>';
  const [c, p] = await Promise.all([api.get('/api/careers/' + cid), api.get('/api/careers/' + cid + '/path')]);
  await renderPath(c.career, p.path, p.member);
}

// ---------- 主流程 ----------
async function main() {
  if (directCareer) {
    await loadPath(directCareer);
    return;
  }
  const pl = await api.get('/api/planner');
  if (!pl.hasAssessment) { noAssessment(); return; }
  if (pl.recommendations && pl.recommendations.length) {
    renderRecs(pl.recommendations, pl.member);
  } else {
    noAssessment();
  }
}
if (user) main();
