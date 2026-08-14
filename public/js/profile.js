// 升学档案 · 高考志愿推荐
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, toast, badgeToast, requireAuth } from './ui.js';


const user = await bootstrap('profile', { auth: true, redirect: 'index.html?login=1' });
if (!user) { /* 已重定向 */ }

const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '南京', '武汉', '成都', '西安', '天津', '苏州', '重庆', '长沙', '青岛', '其他'];
const TYPES = ['综合', '理工', '师范', '财经', '政法', '医学', '外语', '农林'];
const MAJORS = ['计算机', '人工智能', '软件工程', '数据科学', '金融学', '经济学', '会计学', '法学', '临床医学', '口腔医学', '药学', '教育学', '心理学', '机械工程', '电气工程', '自动化', '建筑学', '土木工程', '设计学', '新闻传播', '数学', '物理学', '新能源', '电子信息'];
const GOALS = [
  { v: 'salary', label: '💼 高薪就业' },
  { v: 'stable', label: '🏛️ 稳定编制（考公/教师/医生）' },
  { v: 'research', label: '🔬 继续深造（考研/出国）' },
  { v: 'startup', label: '🚀 创业与自由职业' }
];
const EXPECTS = ['稳定工作', '离家近', '高收入', '尊重我的选择'];

// 通用 chip 渲染
function chipGroup(id, items, opts = {}) {
  const wrap = document.getElementById(id);
  wrap.innerHTML = items.map(it => {
    const v = typeof it === 'string' ? it : it.v;
    const label = typeof it === 'string' ? it : it.label;
    return `<button type="button" class="sel-chip" data-v="${esc(v)}">${esc(label)}</button>`;
  }).join('');
  wrap.querySelectorAll('.sel-chip').forEach(b => b.addEventListener('click', () => {
    b.classList.toggle('on');
    if (opts.single) {
      wrap.querySelectorAll('.sel-chip').forEach(x => { if (x !== b) x.classList.remove('on'); });
    }
  }));
}

chipGroup('cityChips', CITIES);
chipGroup('typeChips', TYPES);
chipGroup('majorChips', MAJORS);
chipGroup('goalChips', GOALS, { single: true });
chipGroup('expectChips', EXPECTS);

// 选科
const mainSubjs = ['物理', '历史'];
document.querySelectorAll('.sel-chip.physics, .sel-chip.sub').forEach(b => {
  b.addEventListener('click', () => {
    if (mainSubjs.includes(b.dataset.subj)) {
      mainSubjs.forEach(s => {
        document.querySelectorAll(`.sel-chip[data-subj="${s}"]`).forEach(x => { if (x !== b) x.classList.remove('on'); });
      });
    }
    b.classList.toggle('on');
  });
});

function readSubjects() {
  const on = [...document.querySelectorAll('.sel-chip.on')].map(b => b.dataset.subj);
  const hasMain = on.some(s => mainSubjs.includes(s));
  return hasMain ? on : [];
}

function collect() {
  return {
    province: document.getElementById('pfProvince').value,
    year: parseInt(document.getElementById('pfYear').value, 10),
    score: parseInt(document.getElementById('pfScore').value, 10) || 0,
    rank: parseInt(document.getElementById('pfRank').value, 10) || 0,
    batch: document.getElementById('pfBatch').value,
    subjects: readSubjects(),
    cityPrefs: [...document.querySelectorAll('#cityChips .on')].map(b => b.dataset.v),
    typePrefs: [...document.querySelectorAll('#typeChips .on')].map(b => b.dataset.v),
    majorIntents: [...document.querySelectorAll('#majorChips .on')].map(b => b.dataset.v),
    careerGoal: (document.querySelector('#goalChips .on') || {}).dataset?.v || '',
    finance: document.getElementById('pfFinance').value,
    stability: document.getElementById('pfStability').value,
    parentJob: document.getElementById('pfParent').value,
    familyExpect: [...document.querySelectorAll('#expectChips .on')].map(b => b.dataset.v)
  };
}

function fillForm(p) {
  if (!p) return;
  if (p.province) document.getElementById('pfProvince').value = p.province;
  if (p.year) document.getElementById('pfYear').value = String(p.year);
  if (p.score) document.getElementById('pfScore').value = p.score;
  if (p.rank) document.getElementById('pfRank').value = p.rank;
  if (p.batch) document.getElementById('pfBatch').value = p.batch;
  (p.subjects || []).forEach(s => document.querySelectorAll(`.sel-chip[data-subj="${s}"]`).forEach(x => x.classList.add('on')));
  setChips('cityChips', p.cityPrefs || []);
  setChips('typeChips', p.typePrefs || []);
  setChips('majorChips', p.majorIntents || []);
  setChips('goalChips', p.careerGoal ? [p.careerGoal] : []);
  if (p.finance) document.getElementById('pfFinance').value = p.finance;
  if (p.stability) document.getElementById('pfStability').value = p.stability;
  if (p.parentJob) document.getElementById('pfParent').value = p.parentJob;
  setChips('expectChips', p.familyExpect || []);
  document.getElementById('saveState').textContent = '已保存';
  document.getElementById('saveState').className = 'tag blue';
}
function setChips(id, vals) {
  document.querySelectorAll(`#${id} .sel-chip`).forEach(b => b.classList.toggle('on', vals.includes(b.dataset.v)));
}

// 保存
document.getElementById('saveProfileBtn').addEventListener('click', async () => {
  const data = collect();
  if (!data.score) { toast('请先填写高考分数', 'error'); return; }
  if (!data.subjects.length) { toast('请选择选科组合（至少含物理或历史）', 'error'); return; }
  try {
    const r = await api.put('/api/profile', data);
    api.setUser(await api.me(true));
    document.getElementById('saveState').textContent = '✓ 已保存';
    document.getElementById('saveState').className = 'tag green';
    toast('升学档案已保存', 'success');
    if (r.badges && r.badges.length) badgeToast(r.badges);
  } catch (e) { toast(e.message, 'error'); }
});

// 推荐
document.getElementById('recommendBtn').addEventListener('click', async () => {
  const data = collect();
  if (!data.score) { toast('请先填写高考分数', 'error'); return; }
  if (!data.subjects.length) { toast('请选择选科组合（至少含物理或历史）', 'error'); return; }
  const btn = document.getElementById('recommendBtn');
  btn.disabled = true; btn.textContent = '⏳ 分析中…';
  try {
    // 确保已保存
    await api.put('/api/profile', data);
    const r = await api.post('/api/recommend/exam');
    document.getElementById('saveState').textContent = '✓ 已保存';
    document.getElementById('saveState').className = 'tag green';
    await renderResult(r);
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '🎯 立即智能推荐';
  }
});

async function renderResult(r) {
  const panel = document.getElementById('resultPanel');
  const bandTable = (key, label, tip, color) => {
    const list = r.bands[key];
    const tierCls = (t) => t === '985' ? 'purple' : t === '211' ? 'blue' : 'orange';
    return `
      <div class="band-table-block" style="border-left:5px solid ${color}">
        <div class="band-table-head" style="background:${color}">
          <b>${label}（${list.length} 所）</b><span>${tip}</span>
        </div>
        <div class="table-wrap">
          <table class="rec-table">
            <thead>
              <tr><th>#</th><th>院校</th><th>层次 / 类型</th><th>城市</th><th>去年参考线</th><th>线差</th><th>录取概率</th><th>推荐理由</th><th>代表专业</th><th>志愿单</th></tr>
            </thead>
            <tbody>
              ${list.map((s, i) => `
                <tr>
                  <td><b>${i + 1}</b></td>
                  <td><b style="font-size:14px;color:var(--deep)">${esc(s.name)}</b></td>
                  <td><span class="tag ${tierCls(s.tier)}">${s.tier}</span> <span class="muted" style="font-size:12px">${esc(s.type)}</span></td>
                  <td>📍 ${esc(s.city)}</td>
                  <td><b>${s.line}</b></td>
                  <td><span class="tag ${key === 'chong' ? 'rose' : key === 'wen' ? 'gold' : 'green'}">${esc(s.gap)}</span></td>
                  <td style="min-width:130px">
                    <div class="flex" style="gap:8px;align-items:center">
                      <div class="bar-track" style="height:8px;width:90px"><div class="bar-fill" style="width:${s.match}%;background:${color}"></div></div>
                      <b style="font-size:13px;color:${color}">${s.match}%</b>
                    </div>
                  </td>
                  <td><div class="reason-mini">${s.reasons.slice(0, 2).map(rs => esc(rs)).join('<br>')}</div></td>
                  <td><div class="majors-mini">${s.majors.slice(0, 3).map(m => `<span class="tag blue">${esc(m)}</span>`).join('')}</div></td>
                  <td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" data-fav="${s.id}" data-name="${esc(s.name)}">＋ 志愿单</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  };

  panel.innerHTML = `
    <div class="card" style="padding:22px 26px;margin-bottom:18px;background:linear-gradient(135deg,#fff7ef,#fff)">
      <div class="flex-between flex-wrap" style="gap:10px">
        <div class="flex" style="gap:12px">
          <div style="font-size:34px">🎓</div>
          <div>
            <b style="color:var(--deep);font-size:17px">${r.summary.score} 分 · ${esc(r.summary.subjects || '未填')} · ${esc(r.summary.lineKey)}</b>
            <p class="muted mt-8">共匹配 ${r.summary.candidateCount} 所可报考院校 · 推荐专业方向</p>
          </div>
        </div>
        <div class="flex" style="gap:6px;flex-wrap:wrap">
          ${r.majors.map(m => `<span class="tag orange">${esc(m)}</span>`).join('')}
        </div>
        <div class="mt-8"><a class="btn btn-ghost btn-sm" id="myListBtn">📋 我的志愿单（对比）</a></div>
        <div class="mt-8"><a class="muted" style="font-size:12.5px" href="careers.html?q=${encodeURIComponent(r.majors[0] || '')}">🔍 去职业库看看这些专业对应的职业 →</a></div>
      </div>
    </div>
    <div class="grid grid-2 mb-16" style="gap:12px">
      ${r.analysis.map(a => `
        <div class="card" style="padding:16px 18px;display:flex;gap:12px;align-items:flex-start">
          <span style="font-size:24px">${a.ic}</span>
          <div><b style="font-size:14px;color:var(--deep)">${esc(a.title)}</b><p style="font-size:12.5px;color:var(--text-2);line-height:1.7;margin-top:3px">${esc(a.text)}</p></div>
        </div>`).join('')}
    </div>
    <div class="band-tables">
      ${bandTable('chong', '🔥 冲 · 可冲刺', '分数线略高于你，值得放手一搏', '#e86a8a')}
      ${bandTable('wen', '⚖️ 稳 · 较稳妥', '与你分数基本匹配，录取概率较大', '#e8a04c')}
      ${bandTable('bao', '🛡️ 保 · 保底', '分数线低于你，作为稳妥兜底', '#2eaa8a')}
    </div>
    <p class="form-hint text-center mt-16">以上推荐基于演示参考线，结合分数/选科/性格/偏好/家庭多因素加权；志愿填报请以各省官方数据为准。</p>`;

  // 志愿单
  const favSet = new Set();
  try { (await api.get('/api/me/fav-schools')).items.forEach(s => favSet.add(s.id)); } catch (e) {}
  document.querySelectorAll('[data-fav]').forEach(b => {
    const sid = b.dataset.fav;
    if (favSet.has(sid)) { b.textContent = '✓ 已加入'; b.classList.add('on'); }
    b.addEventListener('click', async () => {
      const u = requireAuth(); if (!u) return;
      const nowFav = favSet.has(sid);
      const rr = nowFav ? await api.del('/api/schools/' + sid + '/favorite') : await api.post('/api/schools/' + sid + '/favorite');
      if (rr.fav !== undefined) {
        if (rr.fav) favSet.add(sid); else favSet.delete(sid);
        b.textContent = rr.fav ? '✓ 已加入' : '＋ 志愿单';
        b.classList.toggle('on', !!rr.fav);
        toast(rr.fav ? '已加入志愿单：' + b.dataset.name : '已移出志愿单', 'success');
      }
    });
  });
  document.getElementById('myListBtn').addEventListener('click', async () => {
    const list = (await api.get('/api/me/fav-schools')).items || [];
    if (!list.length) { toast('还没有加入院校，点击表格里的"＋志愿单"试试', 'info'); return; }
    panel.insertAdjacentHTML('beforeend', `
      <div class="card mt-16" style="padding:20px" id="myListBox">
        <div class="flex-between mb-16"><h3 style="font-size:16px;color:var(--deep);font-weight:900">📋 我的志愿单 · ${list.length} 所</h3><button class="btn btn-ghost btn-sm" onclick="document.getElementById('myListBox').remove()">关闭</button></div>
        <div class="table-wrap"><table class="rec-table" style="min-width:0">
          <thead><tr><th>#</th><th>院校</th><th>层次</th><th>城市</th><th>去年线</th><th>类型</th></tr></thead>
          <tbody>${list.map((s, i) => '<tr><td>' + (i + 1) + '</td><td><b>' + esc(s.name) + '</b></td><td>' + s.tier + '</td><td>' + esc(s.city) + '</td><td>' + (s.physics || s.history || '-') + '</td><td>' + esc(s.type) + '</td></tr>').join('')}</tbody>
        </table></div>
      </div>`);
    document.getElementById('myListBox').scrollIntoView({ behavior: 'smooth' });
  });
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 回填
(async () => {
  try {
    const r = await api.get('/api/profile');
    if (r.profile) fillForm(r.profile);
  } catch (e) { /* ignore */ }
})();
