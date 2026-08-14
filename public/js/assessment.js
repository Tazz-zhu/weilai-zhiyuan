// 四维深度测评
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, toast, badgeToast } from './ui.js';
import { donutGauge, barList, hexagonChart } from './charts.js';
import { profileShareImage, showShareModal } from './share-image.js';

const user = await bootstrap('planner');
const DRAFT_KEY = 'zy_assess_draft';
function saveDraft(done = false) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, done, ts: Date.now() })); } catch (e) {}
}
function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { return null; }
}
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }
const quizBox = document.getElementById('quizBox');
const startBox = document.getElementById('startBox');
const resultBox = document.getElementById('resultBox');

let questions = [];
let answers = {};
let idx = 0;

// 维度介绍
const DIM_INFO = [
  { key: 'interest', name: '兴趣', desc: '你喜欢做什么，指向"你想成为谁"', ic: '🎨' },
  { key: 'personality', name: '性格', desc: '你习惯怎么思考、如何与世界相处', ic: '🧩' },
  { key: 'ability', name: '能力', desc: '你擅长什么，决定你的起跑优势', ic: '⚡' },
  { key: 'value', name: '价值观', desc: '你在乎什么，决定你走得远不远', ic: '🧭' }
];

async function init() {
  const r = await api.get('/api/questions');
  questions = r.questions;
  const draft = loadDraft();
  // 已登录且有完成的草稿 → 自动提交
  if (api.token && draft && draft.done && draft.answers && Object.keys(draft.answers).length) {
    toast('检测到未完成的测评，正在为你生成结果…', 'info');
    try {
      const rr = await api.post('/api/assessments', { answers: draft.answers });
      clearDraft();
      startBox.classList.add('hidden');
      showResult(rr);
      return;
    } catch (e) { /* 继续正常流程 */ }
  }
  // 未完成的草稿 → 恢复进度
  if (draft && !draft.done && draft.answers) {
    answers = draft.answers;
    const keys = Object.keys(answers);
    if (keys.length > 0) {
      startBox.classList.add('hidden');
      quizBox.classList.remove('hidden');
      idx = Math.min(keys.length, questions.length - 1);
      renderDim();
      renderQ();
      return;
    }
  }
  document.getElementById('dimIntro').innerHTML = DIM_INFO.map(d => `
    <div class="card" style="padding:18px;text-align:left">
      <div style="font-size:24px">${d.ic}</div>
      <b style="color:var(--deep);font-size:15px">${d.name}</b>
      <p class="muted" style="margin-top:4px">${d.desc}</p>
    </div>`).join('');
  document.getElementById('startBtn').addEventListener('click', () => {
    startBox.classList.add('hidden');
    quizBox.classList.remove('hidden');
    renderDim();
    renderQ();
  });
}
init();

function currentDim() {
  const q = questions[idx];
  return DIM_INFO.find(d => d.key === q.dimension) || DIM_INFO[0];
}
function renderDim() {
  const bar = document.getElementById('dimBar');
  bar.innerHTML = DIM_INFO.map(d => {
    const count = questions.filter(q => q.dimension === d.key).length;
    const answered = questions.filter(q => q.dimension === d.key).every(q => answers[q.id] !== undefined);
    const active = currentDim().key === d.key;
    return `<div class="qd ${active ? 'on' : ''} ${answered ? '' : ''}">
      <div class="qd-ic">${d.ic}</div><b>${d.name}</b><span>${answered ? '✓ 已完成' : count + ' 题'}</span>
    </div>`;
  }).join('');
}
function renderQ() {
  const q = questions[idx];
  const dim = currentDim();
  const total = questions.length;
  document.getElementById('qProgress').style.width = ((idx + 1) / total * 100) + '%';
  document.getElementById('qCount').textContent = `${idx + 1} / ${total}`;
  document.getElementById('prevBtn').disabled = idx === 0;
  document.getElementById('nextBtn').textContent = idx === total - 1 ? '完成测评 🎉' : '下一题 →';
  document.getElementById('qArea').innerHTML = `
    <div class="tag orange mb-16">${dim.ic} ${dim.name}</div>
    <div class="quiz-q">${esc(q.title)}</div>
    ${q.options.map((o, i) => `
      <button class="quiz-opt ${answers[q.id] === i ? 'sel' : ''}" data-i="${i}">
        <span class="opt-letter">${String.fromCharCode(65 + i)}</span>. ${esc(o.text)}
      </button>`).join('')}`;
  document.querySelectorAll('.quiz-opt').forEach(b => {
    b.addEventListener('click', () => {
      answers[q.id] = parseInt(b.dataset.i, 10);
      saveDraft(false);
      renderQ();
      setTimeout(() => { if (idx < total - 1) { idx++; renderDim(); renderQ(); } else submit(); }, 220);
    });
  });
  renderDim();
}
document.getElementById('prevBtn').addEventListener('click', () => { if (idx > 0) { idx--; renderDim(); renderQ(); } });
document.getElementById('nextBtn').addEventListener('click', () => {
  if (answers[questions[idx].id] === undefined) { toast('请先选择答案再继续', 'info'); return; }
  if (idx < questions.length - 1) { idx++; renderDim(); renderQ(); }
  else submit();
});

async function submit() {
  if (!api.token) {
    saveDraft(true);
    const { openLogin, toast } = await import('./ui.js');
    toast('注册/登录后，你的测评会自动保存并生成结果', 'info', 4000);
    openLogin();
    return;
  }
  document.getElementById('nextBtn').disabled = true;
  document.getElementById('nextBtn').textContent = '分析中…';
  try {
    const r = await api.post('/api/assessments', { answers });
    clearDraft();
    quizBox.classList.add('hidden');
    showResult(r);
  } catch (e) {
    toast(e.message, 'error');
    document.getElementById('nextBtn').disabled = false;
    document.getElementById('nextBtn').textContent = '完成测评 🎉';
  }
}

function showResult(r) {
  const res = r.result;
  const recs = r.recommendations;
  resultBox.classList.remove('hidden');
  resultBox.innerHTML = `
    <div class="result-hero">
      <div class="rh-ic">🌟</div>
      <h2>你的测评画像</h2>
      <p class="text-2">${user ? esc(user.nickname) : '同学'}，这是基于你回答生成的专属画像</p>
      <div class="flex mt-16" style="justify-content:center;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary btn-shine" id="shareProfileBtn">📤 分享我的职业画像</button>
        <button class="btn btn-ghost" id="printReportBtn">🖨️ 打印 / 保存报告</button>
      </div>
    </div>
    <div class="grid grid-2 mt-24">
      <div class="card" style="padding:22px">
        <h3 style="font-size:16px;color:var(--deep);margin-bottom:10px">🧩 性格画像</h3>
        <p style="font-size:14px;color:var(--text-2);line-height:1.8">${esc(res.personalityDesc)}</p>
      </div>
      <div class="card" style="padding:22px">
        <h3 style="font-size:16px;color:var(--deep);margin-bottom:10px">⚡ 能力优势</h3>
        <div id="abilityBars"></div>
      </div>
      <div class="card" style="padding:22px">
        <h3 style="font-size:16px;color:var(--deep);margin-bottom:10px">🎯 兴趣六边形（霍兰德 RIASEC）</h3>
        <div class="chart-box" id="hexBox"></div>
        <div class="flex" style="gap:6px;flex-wrap:wrap;justify-content:center;margin-top:8px">
          ${res.interestTop.slice(0, 3).map(v => `<span class="tag orange" style="font-size:12.5px">${esc(v.key)} · ${v.score}</span>`).join('')}
        </div>
        <p class="muted text-center mt-8">六个维度中最高的方向，就是你的兴趣引力所在</p>
      </div>
      <div class="card" style="padding:22px">
        <h3 style="font-size:16px;color:var(--deep);margin-bottom:10px">🧭 价值观</h3>
        <p style="font-size:15px;font-weight:700;color:var(--primary-strong)">${esc(res.valueDesc)}</p>
        <p class="muted mt-8">价值观决定你走得远不远</p>
      </div>
    </div>

    <div class="section-head mt-32">
      <div>
        <div class="section-title">🛣️ AI 为你推荐的职业路径</div>
        <div class="section-sub">基于兴趣 45% + 能力 30% + 价值观 15% + 市场需求 10% 综合匹配</div>
      </div>
    </div>
    <div id="recList" style="display:flex;flex-direction:column;gap:14px"></div>
    <div class="text-center mt-24">
      <a class="btn btn-deep btn-lg" href="planner.html">🧭 进入规划师，查看完整路径</a>
    </div>
    <div id="growthBox" class="mt-32"></div>`;

  barList(document.getElementById('abilityBars'), res.abilityTop.slice(0, 3).map(a => ({ label: a.key, value: a.score * 22 })));
  if (res.interest) hexagonChart(document.getElementById('hexBox'), res.interest);

  const rankColors = ['#ff8c42', '#4aa3c2', '#7c6cf0', '#4caf9a', '#e86a8a'];
  document.getElementById('recList').innerHTML = recs.map((rec, i) => `
    <div class="card rec-card">
      <div class="rec-rank" style="background:${rankColors[i % 5]}">${i + 1}</div>
      <div class="rec-body">
        <h4>${esc(rec.career.name)} <span class="tag orange" style="font-size:11px">${esc(rec.career.category)}</span></h4>
        <p>${esc(rec.career.summary)}</p>
        <div class="flex" style="gap:12px;flex-wrap:wrap">
          <span class="rec-prob">匹配度 ${rec.match}%</span>
          <span class="tag green">成功概率约 ${rec.probability}%</span>
          <span class="tag">💰 ${esc(rec.career.salary)}</span>
        </div>
      </div>
      <a class="btn btn-soft btn-sm" href="planner.html?career=${rec.career.id}">查看路径 →</a>
    </div>`).join('');

  renderGrowth();
  if (r.badges && r.badges.length) badgeToast(r.badges);
  document.getElementById('printReportBtn').addEventListener('click', () => window.print());
  document.getElementById('shareProfileBtn').addEventListener('click', () => {
    const canvas = profileShareImage({
      nickname: user ? user.nickname : '同学',
      date: new Date().toLocaleDateString('zh-CN'),
      interestTop: res.interestTop,
      personalityDesc: res.personalityDesc,
      recs: recs.map(x => ({ name: x.career.name, match: x.match }))
    });
    showShareModal(canvas, '我的职业画像.png');
  });
}

// 测评成长对比
async function renderGrowth() {
  const box = document.getElementById('growthBox');
  if (!box) return;
  try {
    const r = await api.get('/api/assessments/history');
    const list = r.assessments || [];
    if (list.length < 2) return;
    const keys = ['R', 'I', 'A', 'S', 'E', 'C'];
    const names = { R: '实际型', I: '研究型', A: '艺术型', S: '社会型', E: '企业型', C: '事务型' };
    box.innerHTML = `
      <div class="card" style="padding:24px">
        <h3 style="font-size:18px;color:var(--deep);font-weight:900;margin-bottom:6px">📈 我的测评成长对比</h3>
        <p class="muted mb-16" style="font-size:13px">你共测评 ${list.length} 次，看看兴趣倾向的变化</p>
        <div class="table-wrap"><table class="rec-table" style="min-width:0">
          <thead><tr><th>维度</th>${list.map(x => '<th>' + new Date(x.created_at).toLocaleDateString('zh-CN') + '</th>').join('')}</tr></thead>
          <tbody>
            ${keys.map(k => `
              <tr><td><b>${k} · ${names[k]}</b></td>
              ${list.map(x => `<td><b style="color:var(--primary-strong)">${x.result.interest[k] || 0}</b></td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table></div>
        <p class="muted mt-8" style="font-size:12px">兴趣不是一成不变的——每一次重新认识自己，都是成长。</p>
      </div>`;
  } catch (e) { /* ignore */ }
}
