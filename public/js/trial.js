// 职业模拟 · 「模拟你的一天」沉浸式剧情互动
// 以时间线推进一天的工作，每个场景结合该职业的真实数据（day/radar/skills/traits）动态生成
import { esc } from './ui.js';

const DIMS = [
  { key: 'PROF', label: '专业力', icon: '🧠', color: '#4aa3c2' },
  { key: 'COMM', label: '沟通力', icon: '🗣️', color: '#2eaa8a' },
  { key: 'RESI', label: '抗压力', icon: '💪', color: '#7c6cf0' },
  { key: 'PASS', label: '热忱度', icon: '🔥', color: '#e86a8a' }
];

// 从职业"一天vlog"中抽取某时段的一句话，作为场景背景
function pickDayPart(text, keys) {
  if (!text) return '';
  const segs = text.split(/[。；;！？!\n]/).map(s => s.trim()).filter(Boolean);
  return segs.find(s => keys.some(k => s.includes(k))) || segs[0] || '';
}

function buildScenes(c) {
  const morning = pickDayPart(c.day, ['早上', '上午', '早晨', '10点', '9点']) || '处理今天最重要的核心任务';
  const afternoon = pickDayPart(c.day, ['下午', '午后', '中午']) || '和同事/客户对接一个关键事项';
  const skill1 = (c.skills && c.skills[0]) || '专业能力';
  const skill2 = (c.skills && c.skills[1]) || '协作能力';
  const incomeTone = c.radar && c.radar.income >= 75 ? '这份工作收入可观' : '这份工作的收入中规中矩但稳定';
  const stressTone = c.radar && c.radar.stress >= 70 ? '你知道这行压力不小' : '这行节奏相对可控';
  const leader = ['leader', '主管', 'mentor', '带教老师'][c.id ? c.id.length % 4 : 0];

  return [
    {
      time: '08:30', phase: '开工',
      title: `入职第 30 天，你提前 20 分钟到了工位。作为${c.name}，这一天你会怎么开场？`,
      scene: `晨会上 ${leader} 问你这周的计划，你想起昨天记的几条待办。`,
      options: [
        { t: '先花 10 分钟把今天的任务排出优先级再动手', dim: 'PROF', good: true, fb: '资深${c.name}都会先"想清楚再动手"：优先级是效率的第一杠杆。' },
        { t: '先和同事聊聊昨天的进展，同步一下信息', dim: 'COMM', good: true, fb: '信息同步是协作的润滑剂，尤其${skill1}这种活儿，最怕各做各的。' },
        { t: '先刷会儿手机，等 ${leader} 安排再说', dim: 'RESI', good: false, fb: '小心：职场最怕"被动等待"，主动的人才拿得到好机会。' }
      ]
    },
    {
      time: '10:30', phase: '核心任务',
      title: `上午是效率最高的时间。今天摆在你面前的核心任务是：${morning}`,
      scene: `${skill1} 和 ${skill2} 都得用上，${leader} 说这条任务本周必须交付。`,
      options: [
        { t: '先啃最难的环节，趁脑子清醒解决', dim: 'PROF', good: true, fb: '把最难的事放在精力巅峰解决，是${c.name}们的高效心法。' },
        { t: '先和上下游对齐口径，再开始做', dim: 'COMM', good: true, fb: '先对齐再动手，能少返工一半——沟通成本是最便宜的纠错。' },
        { t: '先挑简单的做，难的拖到下午再说', dim: 'RESI', good: false, fb: '拖到最后往往只能草草收尾，硬骨头只会越拖越硬。' }
      ]
    },
    {
      time: '12:30', phase: '午间',
      title: `午饭时间，同事约你一起吃饭，顺便聊起最近的一个项目。`,
      scene: `对方半开玩笑地说："听说这行挺能赚钱？"你想起 ${incomeTone}，${stressTone}。`,
      options: [
        { t: '大方聊聊真实感受，顺便请教对方行业里的门道', dim: 'COMM', good: true, fb: '饭桌上的信息量往往比会议室还大，${c.name}的圈子就是这么聊出来的。' },
        { t: '边吃边回工作消息，快速解决午饭', dim: 'PASS', good: true, fb: '敬业是真敬业，但长期绷着容易烧干——记得给自己留口气。' },
        { t: '吐槽两句"这行也就那样"，吃完各回工位', dim: 'PASS', good: false, fb: '负能量会传染，也会悄悄浇灭你自己对这份职业的热情。' }
      ]
    },
    {
      time: '15:30', phase: '突发状况',
      title: `下午你正在忙，突然来了个突发状况：${afternoon}，但方案/结果被当场质疑。`,
      scene: `对方的语气有点急，周围同事都在看你怎么接。`,
      options: [
        { t: '先稳住情绪，用数据/事实回应质疑', dim: 'RESI', good: true, fb: '${c.name}被质疑是家常便饭，拿事实说话永远比情绪硬刚有效。' },
        { t: '先记下所有质疑点，会后逐条完善再沟通', dim: 'COMM', good: true, fb: '不急着当场辩赢，会后用完整的方案回应，反而更显专业。' },
        { t: '当场反驳，语气越来越冲', dim: 'RESI', good: false, fb: '情绪上头的一分钟，可能要花一周去修复关系。' }
      ]
    },
    {
      time: '17:30', phase: '收尾',
      title: `临近下班，任务还没完全收尾。${leader} 走过来说："今天能搞定吗？"`,
      scene: `你看了眼任务清单：还剩最后一块。今天不加班的概率不大。`,
      options: [
        { t: '把剩余任务拆成小块，做完关键部分再走', dim: 'RESI', good: true, fb: '真正的职业感不是"耗到最晚"，而是"把承诺闭环"。' },
        { t: '主动和 ${leader} 确认优先级，明确明天的时间线', dim: 'COMM', good: true, fb: '会管理预期的人，在${c.name}这条路上走得最远。' },
        { t: '差不多得了，明天再说', dim: 'PASS', good: false, fb: '一次两次没人说，次数多了，别人对你的靠谱值会悄悄打折。' }
      ]
    },
    {
      time: '20:30', phase: '复盘',
      title: `下班回到家，这一天终于结束了。你打开手机，看到行业群里有人分享了新案例。`,
      scene: `回想这一天：${c.day ? c.day.slice(0, 40) + '……' : '有收获也有疲惫'}。`,
      options: [
        { t: '花 20 分钟看看案例，顺手记一条复盘笔记', dim: 'PASS', good: true, fb: '下班后的 20 分钟，是${c.name}们拉开差距的地方。' },
        { t: '和同行朋友聊聊今天的经历，互相打打气', dim: 'COMM', good: true, fb: '同路人的支持，是熬过新手期最管用的能量。' },
        { t: '彻底关机，明天的事明天再说', dim: 'PASS', good: false, fb: '休息当然重要，但完全拒绝输入，成长也会跟着停摆。' }
      ]
    }
  ];
}

export function mountTrial(container, career) {
  const c = career;
  const scenes = buildScenes(c);
  let step = 0;
  const scores = { PROF: 0, COMM: 0, RESI: 0, PASS: 0 };
  let maxGood = 0;
  scenes.forEach(s => s.options.forEach(o => { if (o.good) maxGood++; }));
  const picks = [];

  container.innerHTML = `
    <div class="card trial-card" style="border-left:4px solid var(--primary);margin-bottom:26px;overflow:hidden">
      <div class="trial-cover">
        <div class="trial-cover-glow"></div>
        <div class="flex-between flex-wrap" style="gap:12px;position:relative;z-index:1">
          <div>
            <span class="trial-badge">🎮 职业模拟</span>
            <h3 style="font-size:19px;font-weight:900;color:#fff;margin-top:8px">模拟你的一天 · 作为「${esc(c.name)}」</h3>
            <p style="color:rgba(255,255,255,.72);font-size:13.5px;margin-top:4px">6 个真实场景，从早 8:30 到晚 20:30——看看你会怎么过这一天</p>
          </div>
          <button class="btn btn-primary btn-shine" id="trialStartBtn" style="border-radius:100px">🚀 开始模拟</button>
        </div>
      </div>
      <div id="trialArea" style="padding:0 22px 22px"></div>
    </div>`;

  const area = container.querySelector('#trialArea');
  const startBtn = container.querySelector('#trialStartBtn');

  function renderTimeline() {
    return `<div class="trial-timeline">
      ${scenes.map((s, i) => `<div class="tt-node ${i < step ? 'done' : ''} ${i === step ? 'on' : ''}"><span class="tt-dot">${i < step ? '✓' : ''}</span><span class="tt-time">${s.time}</span><span class="tt-phase">${s.phase}</span></div>`).join('')}
    </div>`;
  }

  function renderQ() {
    const s = scenes[step];
    area.innerHTML = `
      <div class="quiz-progress" style="margin:18px 0 14px"><div class="qp-fill" style="width:${Math.round((step + 1) / scenes.length * 100)}%"></div></div>
      ${renderTimeline()}
      <div class="trial-scene">
        <div class="ts-head"><span class="ts-time">${s.time}</span><span class="ts-phase">${s.phase}</span></div>
        <div class="ts-q">${esc(s.title)}</div>
        <div class="ts-sub">${esc(s.scene)}</div>
        <div class="ts-opts">
          ${s.options.map((o, i) => `<button class="quiz-opt trial-opt" data-i="${i}"><span class="to-ic">${o.good ? '✨' : '⚠️'}</span><span>${esc(o.t)}</span></button>`).join('')}
        </div>
      </div>`;
    area.querySelectorAll('.trial-opt').forEach(b => b.addEventListener('click', () => {
      const o = s.options[parseInt(b.dataset.i, 10)];
      picks.push({ phase: s.time + ' · ' + s.phase, title: s.title, choice: o.t, good: o.good, dim: o.dim });
      if (o.good) scores[o.dim] = (scores[o.dim] || 0) + 1;
      // 高亮已选 + 显示点评
      area.querySelectorAll('.trial-opt').forEach(x => x.disabled = true);
      b.classList.add('picked', o.good ? 'good' : 'bad');
      const fb = document.createElement('div');
      fb.className = 'ts-feedback ' + (o.good ? 'good' : 'bad');
      fb.innerHTML = `<span class="tf-ic">${o.good ? '💬' : '🚨'}</span><div><b>${o.good ? '过来人点评' : '避坑提醒'}</b><p>${esc(o.fb)}</p></div>`;
      b.closest('.ts-opts').after(fb);
      setTimeout(() => { step++; if (step < scenes.length) renderQ(); else renderResult(); }, 1650);
    }));
  }

  function renderResult() {
    const total = Math.round(picks.filter(p => p.good).length / maxGood * 100);
    let verdict, ic, cls;
    if (total >= 85) { verdict = '天生契合！你几乎就是为「' + c.name + '」而生的'; ic = '🏆'; cls = 'green'; }
    else if (total >= 65) { verdict = '很对路！你具备这个职业的关键特质，再补点实战就能站稳'; ic = '💪'; cls = 'blue'; }
    else if (total >= 45) { verdict = '有潜力，但需要认真准备——先多了解真实工作再决定'; ic = '🤔'; cls = 'gold'; }
    else { verdict = '可能不是最优解，看看别的职业，别急着下结论'; ic = '🧭'; cls = 'rose'; }
    // 最佳成绩记录
    let best = null;
    try {
      const key = 'zy_trials';
      const list = JSON.parse(localStorage.getItem(key) || '{}');
      const prev = list[c.id] || {};
      best = Math.max(prev.best || 0, total);
      list[c.id] = { times: (prev.times || 0) + 1, best };
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {}
    const dimRows = DIMS.map(d => {
      const got = scores[d.key] || 0;
      const max = scenes.filter(s => s.options.some(o => o.dim === d.key && o.good)).length || 1;
      const pct = Math.round(got / max * 100);
      return `<div class="tr-dim"><div class="tr-dim-head"><span>${d.icon} ${d.label}</span><b>${pct}%</b></div><div class="tr-dim-bar"><i style="width:${pct}%;background:${d.color}"></i></div></div>`;
    }).join('');
    const goodPicks = picks.filter(p => p.good).slice(-3);
    const badPicks = picks.filter(p => !p.good).slice(-2);
    const review = [
      ...goodPicks.map(p => `<div class="tr-review-item good"><span>✅</span><div><b>${esc(p.phase)}</b><p>${esc(p.choice)}</p></div></div>`),
      ...badPicks.map(p => `<div class="tr-review-item bad"><span>⚠️</span><div><b>${esc(p.phase)}</b><p>${esc(p.choice)}</p></div></div>`)
    ].join('');
    area.innerHTML = `
      <div class="trial-result">
        <div class="tr-hero ${cls}">
          <div class="tr-ic">${ic}</div>
          <div class="tr-score" data-score="${total}">${total}<small>%</small></div>
          <div class="tr-verdict">${esc(verdict)}</div>
          ${best !== null ? `<div class="tr-best">🏅 历史最佳 ${best}% · 已试玩 ${(JSON.parse(localStorage.getItem('zy_trials') || '{}')[c.id] || {}).times || 1} 次</div>` : ''}
        </div>
        <div class="tr-dims">${dimRows}</div>
        <div class="tr-truth">
          <div class="tr-truth-head">💡 这个职业的真相</div>
          <p>${esc(c.truth || '想真正了解这份工作，最好的方式是找一个从业者聊聊。')}</p>
          ${c.talk ? `<div class="tr-talk">${esc(c.talk)}</div>` : ''}
        </div>
        ${review ? `<div class="tr-review"><div class="tr-truth-head">📋 你的选择复盘</div><div class="tr-review-list">${review}</div></div>` : ''}
        <div class="tr-cta">
          <button class="btn btn-ghost btn-sm" id="trialAgainBtn">🔄 再玩一次</button>
          <a class="btn btn-primary btn-sm" href="planner.html?career=${c.id}">🧭 看完整人生路径</a>
          <a class="btn btn-accent btn-sm" href="community.html?career=${c.id}">💬 进「${esc(c.name)}」圈子</a>
        </div>
      </div>`;
    // 分数滚动动画
    const scoreEl = area.querySelector('.tr-score');
    const target = parseInt(scoreEl.dataset.score, 10);
    const start = performance.now();
    function tick(t) {
      const p = Math.min(1, (t - start) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      scoreEl.innerHTML = Math.round(target * eased) + '<small>%</small>';
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    area.querySelector('#trialAgainBtn').addEventListener('click', () => { step = 0; scores.PROF = scores.COMM = scores.RESI = scores.PASS = 0; picks.length = 0; renderQ(); });
  }

  startBtn.addEventListener('click', () => { step = 0; scores.PROF = scores.COMM = scores.RESI = scores.PASS = 0; picks.length = 0; renderQ(); });
}
