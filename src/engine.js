// 未来致远 · 核心引擎：测评评分 / 职业推荐 / 路径拆解 / 仪表盘 / 徽章 / 年度报告

import { careers, careerById, questions, scripts, schools } from './data/index.js';

// ---------- 测评评分 ----------
export function scoreAssessment(answers) {
  const interest = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const personality = { 内向: 0, 外向: 0, 理性: 0, 感性: 0, 冒险: 0, 稳健: 0, 独立: 0, 合作: 0, 计划: 0, 随性: 0, 抗压: 0, 敏感: 0 };
  const ability = { 逻辑数理: 0, 语言表达: 0, 空间创意: 0, 人际协调: 0, 动手操作: 0, 组织执行: 0 };
  const value = { 金钱财富: 0, 成长发展: 0, 稳定安全: 0, 社会意义: 0, 自由创造: 0, 地位影响: 0 };

  for (const q of questions) {
    const ans = answers[q.id];
    if (ans === undefined || ans === null) continue;
    const opt = q.options[ans];
    if (!opt) continue;
    const target = q.dimension === 'interest' ? interest
      : q.dimension === 'personality' ? personality
      : q.dimension === 'ability' ? ability : value;
    for (const [k, v] of Object.entries(opt.scores)) {
      target[k] = (target[k] || 0) + v;
    }
  }

  const top2 = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .filter(([, v]) => v > 0).map(([k, v]) => ({ key: k, score: v }));

  return {
    interest, personality, ability, value,
    interestTop: top2(interest),
    personalityTop: top2(personality),
    abilityTop: top2(ability),
    valueTop: top2(value)
  };
}

// ---------- 职业匹配 ----------
const TRAIT_MAP = {
  逻辑思维: '逻辑数理', 逻辑: '逻辑数理', 严谨: '逻辑数理', 理性: '逻辑数理',
  沟通表达: '人际协调', 表达: '语言表达', 共情: '人际协调', 共情能力: '人际协调',
  审美: '空间创意', 创意: '空间创意', 想象力: '空间创意', 艺术感: '空间创意',
  动手能力: '动手操作', 动手: '动手操作', 执行力: '组织执行', 组织: '组织执行',
  统筹: '组织执行', 全局观: '组织执行', 领导力: '组织执行', 决策力: '组织执行',
  钻研: '逻辑数理', 好奇心: '逻辑数理', 耐心: '逻辑数理', 细致: '逻辑数理',
  亲和: '人际协调', 感染力: '语言表达', 抗压: '组织执行'
};

const VALUE_ADJUST = {
  金钱财富: { income: 1.6, barrier: -0.4, prospect: 0.3 },
  成长发展: { prospect: 1.4, barrier: 0.3, income: 0.3 },
  稳定安全: { stress: -1.6, barrier: 0.6, income: -0.2, demand: 0.4 },
  社会意义: { S: 1.6, income: -0.4 },
  自由创造: { A: 1.6, C: -0.8, stress: -0.3 },
  地位影响: { income: 1.0, barrier: 0.5, prospect: 0.4 }
};

export function recommendCareers(result, { limit = 5 } = {}) {
  const { interest, ability, value } = result;
  const valueKeys = Object.entries(value).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
  const scored = careers.map(c => {
    let hollandScore = 0;
    for (const code of c.holland) hollandScore += interest[code] || 0;
    const hollandMax = Math.max(1, ...Object.values(interest));
    const hollandRatio = hollandScore / (c.holland.length * hollandMax);

    let abilityScore = 0, abilityCount = 0;
    for (const t of c.traits) {
      const mapped = TRAIT_MAP[t];
      if (mapped && ability[mapped] !== undefined) { abilityScore += ability[mapped]; abilityCount++; }
    }
    const abilityMax = Math.max(1, ...Object.values(ability));
    const abilityRatio = abilityCount ? abilityScore / (abilityCount * abilityMax) : 0.4;

    let valueAdjust = 0;
    for (const vk of valueKeys) {
      const adj = VALUE_ADJUST[vk];
      if (!adj) continue;
      if (adj.S) valueAdjust += (interest.S / 6) * adj.S;
      if (adj.A) valueAdjust += (interest.A / 6) * adj.A;
      if (adj.C) valueAdjust -= (interest.C / 6) * Math.abs(adj.C);
      if (adj.income) valueAdjust += (c.radar.income / 100) * adj.income * 0.06;
      if (adj.stress) valueAdjust += (c.radar.stress / 100) * adj.stress * 0.06;
      if (adj.barrier) valueAdjust += (c.radar.barrier / 100) * adj.barrier * 0.06;
      if (adj.prospect) valueAdjust += (c.radar.prospect / 100) * adj.prospect * 0.06;
      if (adj.demand) valueAdjust += (c.demand / 100) * adj.demand * 0.06;
    }

    const demandRatio = c.demand / 100;
    const raw = hollandRatio * 0.45 + abilityRatio * 0.30 + valueAdjust * 0.15 + demandRatio * 0.10;
    const probability = Math.min(95, Math.round(38 + raw * 55));
    return { career: c, hollandRatio, abilityRatio, valueAdjust, raw, probability };
  });
  scored.sort((a, b) => b.raw - a.raw);

  // 保证路径多样性：不同类别至少取1，再取分数最高的补足
  const picked = [];
  const byCat = new Map();
  for (const s of scored) {
    if (!byCat.has(s.career.category)) byCat.set(s.career.category, []);
    byCat.get(s.career.category).push(s);
  }
  const topCat = [...byCat.entries()].sort((a, b) => b[1][0].raw - a[1][0].raw);
  for (const [cat, list] of topCat) {
    if (picked.length >= limit) break;
    if (!picked.some(p => p.career.category === cat)) picked.push(list[0]);
  }
  for (const s of scored) {
    if (picked.length >= limit) break;
    if (!picked.includes(s)) picked.push(s);
  }
  return picked.map(s => ({
    career: { ...s.career, radar: { ...s.career.radar } },
    probability: s.probability,
    match: Math.round(s.raw * 100)
  }));
}

// ---------- 路径拆解 ----------
export function generatePath(career, user = {}) {
  const isStudent = !user.education || ['高中', '初中'].includes(user.education);
  const stages = [];
  if (isStudent) {
    stages.push({
      phase: '大学阶段（准备期）',
      duration: '4年',
      goal: `夯实${career.name}的基础，建立"知识+作品+人脉"三件套。`,
      actions: [
        `主修/辅修相关专业（${career.education}），保持成绩在专业前50%`,
        `系统学习核心技能：${career.skills.slice(0, 3).join('、')}`,
        `大二起每年至少1份相关实习，积累作品/项目`,
        `参加相关社团/竞赛/开源项目，建立同路人圈子`,
        `关注行业动态，每年读3-5本行业经典书籍`
      ],
      milestones: [
        { text: `掌握${career.skills[0]}的基础能力`, check: false },
        { text: '完成1-2个拿得出手的项目/作品', check: false },
        { text: '拥有1段相关实习经历', check: false }
      ],
      skills: career.skills
    });
  }
  stages.push({
    phase: '入职前2年（成长期）',
    duration: '2年',
    goal: `进入${career.category}行业，完成从"学生/新人"到"能独立交付"的转变。`,
    actions: [
      `通过实习/校招/社招进入${career.name}相关岗位`,
      `跟完1-2个完整项目周期，理解业务全流程`,
      `沉淀方法论文档，主动承担更多责任`,
      `建立行业认知：关注头部公司、关键人物、趋势报告`,
      `每半年复盘一次：能力、作品、人脉、下一步`
    ],
    milestones: [
      { text: '独立负责1个模块/任务并稳定交付', check: false },
      { text: '积累1份可展示的成果集', check: false },
      { text: '获得上级/客户的正面评价', check: false }
    ],
    skills: career.skills.slice(0, 4)
  });
  stages.push({
    phase: '第3-5年（进阶期）',
    duration: '3年',
    goal: `成为团队里的"靠谱骨干"，形成自己的专业标签。`,
    actions: [
      `在细分领域深耕，成为团队内公认的${career.skills[1] || '专业'}担当`,
      `开始带新人/带小项目，锻炼管理协调能力`,
      `薪资对标行业75分位，主动争取晋升`,
      `建立行业影响力：输出分享、参加行业活动`,
      `评估是否走"专家"或"管理"两条路线之一`
    ],
    milestones: [
      { text: '晋升到高级岗位或同等水平', check: false },
      { text: '带过至少1个新人/小团队', check: false },
      { text: '形成个人专业方法论', check: false }
    ],
    skills: career.skills
  });
  stages.push({
    phase: '第5-10年（跃迁期）',
    duration: '5年+',
    goal: `从"执行者"走向"定义者"：专家路线（领域权威）或管理路线（带大团队/业务）。`,
    actions: [
      `专家路线：成为细分领域Top10%的专业人士，或著书立说`,
      `管理路线：带10人以上团队，对业务结果负责`,
      `探索第二曲线：内部创业、跨界、独立执业`,
      `培养接班人，建立可传承的体系`,
      `开始规划更长期的职业与人生目标`
    ],
    milestones: [
      { text: '成为领域内有辨识度的专业人士/管理者', check: false },
      { text: '拥有可复制的经验或团队', check: false },
      { text: '实现职业与生活的自洽平衡', check: false }
    ],
    skills: [...career.skills, '团队领导', '战略思考']
  });

  // Plan B / C：同类别中门槛更低或相关的职业
  const others = careers.filter(c => c.id !== career.id && (c.category === career.category || c.holland.some(h => career.holland.includes(h))));
  others.sort((a, b) => (b.radar.prospect - a.radar.prospect));
  const planB = others[0], planC = others[1] || others[0];
  const aiRisk = career.aiRisk;

  return {
    careerId: career.id,
    stages,
    planB: planB ? { id: planB.id, name: planB.name, category: planB.category, summary: planB.summary, probability: Math.round(50 + (planB.radar.prospect - 40) * 0.5), barrier: planB.radar.barrier } : null,
    planC: planC ? { id: planC.id, name: planC.name, category: planC.category, summary: planC.summary, probability: Math.round(45 + (planC.radar.prospect - 40) * 0.5), barrier: planC.radar.barrier } : null,
    riskPoints: [
      { label: 'AI冲击风险', value: aiRisk, note: aiRisk >= 60 ? '较高：需持续学习AI工具，向人机协作进化' : aiRisk >= 40 ? '中等：AI是工具而非威胁，掌握它即是护城河' : '较低：岗位依赖复杂判断与人际互动' },
      { label: '入门门槛', value: career.radar.barrier, note: career.radar.barrier >= 75 ? '较高：需要学历/证书/长期积累' : '适中：通过学习和实习可进入' },
      { label: '工作压力', value: career.radar.stress, note: career.radar.stress >= 75 ? '较大：需要较强抗压能力' : '中等：在可承受范围' }
    ]
  };
}

// ---------- 仪表盘 ----------
const EVENT_POINTS = { 学习: 5, 实习: 8, 获奖: 12, 跳槽: 10, 创业: 15, 旅行: 4, 其他: 3 };

export function computeDashboard(events, user) {
  const total = events.length;
  const byType = {};
  let skillPoints = 0;
  let happiness = 55;
  let lastDate = null;
  const now90 = Date.now() - 90 * 86400000;
  let recent = 0;
  for (const e of events) {
    byType[e.type] = (byType[e.type] || 0) + 1;
    skillPoints += EVENT_POINTS[e.type] || 3;
    const t = new Date(e.date).getTime();
    if (t >= now90) recent++;
    if (!lastDate || t > lastDate) lastDate = t;
  }
  // 幸福度：基础 + 记录丰富度 + 类型多样性 + 会员
  const diversity = Object.keys(byType).length;
  happiness = Math.min(98, Math.round(55 + Math.min(15, total * 1.2) + diversity * 2.5 + (user.member_until > Date.now() ? 3 : 0)));
  const growthSpeed = Math.min(100, Math.round(recent / 90 * 100));
  const experience = Math.min(1000, total * 3 + Math.round(skillPoints / 2));
  const level = Math.floor(experience / 100) + 1;

  const lvInfo = levelInfo(experience);
  return {
    total, byType, skillPoints, happiness, growthSpeed, experience,
    level: lvInfo.level, levelName: lvInfo.name, levelIcon: lvInfo.icon,
    levelProgress: lvInfo.progress, nextLevel: lvInfo.nextMin,
    progressToNext: experience % 100,
    monthly: monthlyTrend(events),
    benchmark: {
      totalAvg: 12, skillAvg: 80, happinessAvg: 62
    }
  };
}

export const BADGE_DEFS = [
  { id: 'welcome', name: '初来致远', desc: '注册成为致远用户', icon: '🌟', cond: () => true },
  { id: 'profile', name: '认识自己', desc: '完善个人资料', icon: '🪪', cond: (u) => u.education && u.city },
  { id: 'explorer', name: '生涯探索者', desc: '完成四维深度测评', icon: '🧭', cond: (u, ctx) => ctx.hasAssessment },
  { id: 'recorder5', name: '足迹新手', desc: '记录5件人生大事', icon: '📝', cond: (u, ctx) => ctx.total >= 5 },
  { id: 'recorder20', name: '坚持记录者', desc: '累计记录20件成长事件', icon: '📖', cond: (u, ctx) => ctx.total >= 20 },
  { id: 'capsule1', name: '时光旅人', desc: '埋下一颗时光胶囊', icon: '⏳', cond: (u, ctx) => ctx.capsuleCount >= 1 },
  { id: 'capsule2', name: '时空对话者', desc: '打开一颗时光胶囊', icon: '💌', cond: (u, ctx) => ctx.capsuleOpened >= 1 },
  { id: 'poster', name: '同路人', desc: '在社区发布第一篇内容', icon: '💬', cond: (u, ctx) => ctx.postCount >= 1 },
  { id: 'member', name: '致远会员', desc: '开通会员，解锁全部能力', icon: '👑', cond: (u) => u.member_until > Date.now() },
  { id: 'star', name: '成长之星', desc: '成长速度达到80以上', icon: '⭐', cond: (u, ctx) => ctx.growthSpeed >= 80 },
  { id: 'inviter', name: '引路人', desc: '邀请一位好友加入未来致远', icon: '🤝', cond: (u, ctx) => (ctx.inviteCount || 0) >= 1 },
  { id: 'invited', name: '同行者', desc: '通过好友邀请加入', icon: '🧑‍🤝‍🧑', cond: (u) => !!u.invited_by },
  { id: 'sim_first', name: '平行人生启程', desc: '在人生模拟舱完成第一段平行人生', icon: '🎮', cond: (u, ctx) => (ctx.simFinished || 0) >= 1 },
  { id: 'sim_gold', name: '高配人生', desc: '某段平行人生的职业匹配度达到85%以上', icon: '🏅', cond: (u, ctx) => (ctx.simMatch || 0) >= 85 },
  { id: 'sim_master', name: '平行人生大师', desc: '累计完成5段不同的平行人生', icon: '👑', cond: (u, ctx) => (ctx.simFinished || 0) >= 5 },
];

export function evaluateBadges(user, ctx) {
  const earned = new Set((ctx.badges || []).map(b => b.badge_id));
  const newly = [];
  for (const def of BADGE_DEFS) {
    if (!earned.has(def.id) && def.cond(user, ctx)) {
      newly.push(def.id);
    }
  }
  return newly;
}

// ---------- 年度报告 ----------
export function generateAnnualReport(events, year, user) {
  const yEvents = events.filter(e => String(e.date).startsWith(String(year)));
  const byType = {};
  for (const e of yEvents) byType[e.type] = (byType[e.type] || 0) + 1;
  const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: 0 }));
  for (const e of yEvents) {
    const m = parseInt(e.date.slice(5, 7), 10);
    if (m >= 1 && m <= 12) months[m - 1].count++;
  }
  const top = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const highlights = [...yEvents].sort((a, b) => b.id - a.id).slice(0, 5);
  const words = [
    yEvents.length === 0 ? '这一年你在积蓄力量，记录从今天开始。'
      : `这一年你留下了 ${yEvents.length} 个脚印，其中「${top[0]?.[0] || '成长'}」占 ${Math.round((top[0]?.[1] || 0) / yEvents.length * 100)}%。`,
    top.length >= 2 ? `你同时点亮了「${top[1][0]}」和「${top[0][0]}」，成长从来不是单一赛道。` : '专注本身，就是最大的复利。',
    '每一步都算数——未来的你会感谢现在认真生活的自己。'
  ];
  const score = Math.min(100, Math.round(yEvents.length * 6 + top.length * 5));
  return {
    year, total: yEvents.length, byType, months, highlights, words, score,
    title: `${year} · ${user.nickname || '我'}的年度人生白皮书`
  };
}

export function makeAvatarSeed(name) {
  const colors = ['#7c6cf0', '#4aa3c2', '#e8a04c', '#e86a8a', '#5aa86b', '#c270d8', '#6a9fd8', '#d8962c', '#4caf9a'];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) % 997;
  return colors[h % colors.length];
}

// ---------- 薪资区间估算（用于图表） ----------
export function salaryRange(career) {
  const s = career.salary || '';
  const m = s.match(/(\d+(?:\.\d+)?)\s*[-~至到]\s*(\d+(?:\.\d+)?)\s*K/);
  if (m) return { min: parseFloat(m[1]), max: parseFloat(m[2]), unit: 'K/月', text: s };
  const inc = career.radar.income;
  let min = 8, max = 20;
  if (inc >= 90) { min = 30; max = 80; }
  else if (inc >= 80) { min = 18; max = 50; }
  else if (inc >= 70) { min = 12; max = 35; }
  else if (inc >= 60) { min = 8; max = 25; }
  else { min = 6; max = 18; }
  return { min, max, unit: 'K/月', text: s, estimated: true };
}

// ---------- 等级体系 ----------
export const LEVELS = [
  { min: 0, name: '探索者', icon: '🌱' },
  { min: 100, name: '起步者', icon: '🌿' },
  { min: 300, name: '行动派', icon: '🔥' },
  { min: 600, name: '坚持者', icon: '💪' },
  { min: 1000, name: '致远之星', icon: '⭐' }
];
export function levelInfo(exp) {
  let lv = LEVELS[0], next = LEVELS[1];
  for (let i = 0; i < LEVELS.length; i++) {
    if (exp >= LEVELS[i].min) { lv = LEVELS[i]; next = LEVELS[i + 1] || null; }
  }
  return {
    level: LEVELS.indexOf(lv) + 1,
    name: lv.name, icon: lv.icon,
    currentMin: lv.min,
    nextMin: next ? next.min : null,
    progress: next ? Math.min(100, Math.round((exp - lv.min) / (next.min - lv.min) * 100)) : 100
  };
}

// ---------- 成长趋势（近6个月月度足迹数） ----------
export function monthlyTrend(events, months = 6) {
  const now = new Date();
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const count = events.filter(e => String(e.date).slice(0, 7) === key).length;
    out.push({ month: d.getMonth() + 1, label: (d.getMonth() + 1) + '月', count });
  }
  return out;
}

// ============================================================
// 高考志愿推荐引擎（分数 / 选科 / 性格 / 偏好 / 家庭 多因素）
// ============================================================
const HOLLAND_MAJORS = {
  R: ['机械工程', '电气工程', '土木工程', '车辆工程', '机器人工程', '智能制造', '建筑学'],
  I: ['数学', '物理学', '计算机科学', '临床医学', '药学', '化学', '数据科学', '电子信息'],
  A: ['设计学', '数字媒体', '汉语言文学', '新闻传播', '动画', '建筑学', '音乐'],
  S: ['教育学', '心理学', '护理学', '社会工作', '学前教育', '临床医学'],
  E: ['金融学', '经济学', '工商管理', '市场营销', '法学', '国际经济与贸易'],
  C: ['会计学', '财务管理', '审计学', '统计学', '财政学', '信息管理']
};
const FAMILY_TYPE = {
  '教师': ['师范', '教育'],
  '医生': ['医学', '医药'],
  '工程师': ['理工', '工科', '综合'],
  '经商': ['财经', '经济', '管理'],
  '公务员': ['政法', '法学', '师范', '财经'],
  '务农': ['农林', '食品', '农学'],
  '军人': ['国防', '航空航天', '政法'],
  '其他': []
};

export function recommendSchools(profile, assessment) {
  const score = Number(profile.score) || 0;
  const subjects = profile.subjects || [];
  const hasPhysics = subjects.includes('物理');
  const hasHistory = subjects.includes('历史');
  const lineKey = hasPhysics ? 'physics' : 'history';

  const candidates = schools.filter(s => {
    const line = s[lineKey];
    if (!line) return false;
    if (s.req === 'physics' && !hasPhysics) return false;
    if (s.req === 'history' && !hasHistory) return false;
    return true;
  });

  const cityPrefs = profile.cityPrefs || [];
  const typePrefs = profile.typePrefs || [];
  const majorIntents = profile.majorIntents || [];

  const scored = candidates.map(s => {
    const line = s[lineKey];
    const diff = score - line;
    let cityW = 0;
    if (cityPrefs.length === 0) cityW = 1;
    else if (cityPrefs.includes(s.city) || cityPrefs.includes(s.province)) cityW = 2;
    let typeW = 0;
    if (typePrefs.length === 0) typeW = 1;
    else if (typePrefs.some(t => s.type.includes(t) || s.tags.includes(t))) typeW = 2;
    let majorW = 0;
    if (majorIntents.some(m => s.majors.some(sm => sm.includes(m) || m.includes(sm)))) majorW = 2;
    let hollandW = 0;
    if (assessment && assessment.interest) {
      const top = Object.entries(assessment.interest).sort((a, b) => b[1] - a[1])[0];
      if (top) {
        const fits = HOLLAND_MAJORS[top[0]] || [];
        if (fits.some(m => s.majors.some(sm => sm.includes(m.slice(0, 2)) || m.includes(sm.slice(0, 2))))) hollandW = 2;
      }
    }
    let famW = 0;
    if (profile.finance === 'low' && s.finance === 'low') famW += 1;
    if (profile.stability === 'yes' && ['师范', '医学', '财经', '政法'].includes(s.type)) famW += 1;
    if (profile.parentJob && FAMILY_TYPE[profile.parentJob]) {
      if (FAMILY_TYPE[profile.parentJob].some(t => s.type.includes(t) || s.tags.includes(t))) famW += 1.5;
    }
    const total = cityW + typeW + majorW + hollandW + famW;
    return { school: s, line, diff, total, cityW, typeW, majorW, hollandW, famW };
  });

  const pickBand = (arr) => {
    const out = [];
    const used = new Set();
    // 先取权重最高的，再按 diff 接近档位中心补足
    const sorted = [...arr].sort((a, b) => b.total - a.total || Math.abs(b.diff) - Math.abs(a.diff));
    for (const x of sorted) {
      if (out.length >= 3) break;
      if (!used.has(x.school.id)) { used.add(x.school.id); out.push(x); }
    }
    return out;
  };

  const chong = pickBand(scored.filter(x => x.diff >= -18 && x.diff <= -5));
  const wen = pickBand(scored.filter(x => x.diff > -5 && x.diff < 5));
  const bao = pickBand(scored.filter(x => x.diff >= 5 && x.diff <= 18));
  // 每档不足 3 所时，用最接近的补足
  const rest = scored.filter(x => !chong.includes(x) && !wen.includes(x) && !bao.includes(x)).sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
  for (const band of [chong, wen, bao]) {
    for (const x of rest) {
      if (band.length >= 3) break;
      if (!chong.includes(x) && !wen.includes(x) && !bao.includes(x)) band.push(x);
    }
  }

  const bandInfo = {
    chong: { name: '冲', desc: '分数线略高于你，值得放手一搏', color: '#e86a8a', match: [55, 70] },
    wen: { name: '稳', desc: '与你分数基本匹配，录取概率较大', color: '#e8a04c', match: [70, 85] },
    bao: { name: '保', desc: '分数线低于你，作为稳妥保底', color: '#2eaa8a', match: [85, 96] }
  };

  const fmt = (band, x) => {
    const info = bandInfo[band];
    const gap = x.diff >= 0 ? '高' + x.diff + '分' : '差' + (-x.diff) + '分';
    const reasons = [];
    if (band === 'chong') reasons.push('分数距去年线 ' + gap + '，属于可冲刺区间');
    else if (band === 'wen') reasons.push('分数与去年线' + (x.diff >= 0 ? '持平略高' : '基本持平') + '，录取概率较大');
    else reasons.push('分数高于去年线 ' + x.diff + ' 分，录取非常稳妥');
    if (x.cityW === 2) reasons.push('位于你意向城市 ' + x.school.city + '，符合地域偏好');
    if (x.typeW === 2) reasons.push('院校类型契合你的偏好');
    if (x.majorW === 2) reasons.push('设有你的意向专业方向');
    if (x.hollandW === 2) reasons.push('强势专业与你的性格测评高度契合');
    if (x.famW >= 1.5) reasons.push('综合家庭情况推荐（学费/稳定性/行业传承）');
    if (reasons.length < 2) reasons.push('综合实力与口碑均衡，值得考虑');
    const match = band === 'chong' ? 58 + Math.min(10, Math.abs(x.diff)) : band === 'wen' ? 74 + Math.min(8, Math.abs(x.diff) * 1.5) : 88 + Math.min(6, Math.abs(x.diff));
    return {
      id: x.school.id, name: x.school.name, city: x.school.city, tier: x.school.tier, type: x.school.type,
      line: x.line, gap: gap, match: Math.min(97, Math.round(match)),
      reasons, majors: x.school.majors.slice(0, 4), features: x.school.features,
      color: info.color
    };
  };

  // 推荐专业方向：性格 top2 + 用户意向 合并
  const majorSet = new Set((profile.majorIntents || []).slice(0, 2));
  if (assessment && assessment.interest) {
    const tops = Object.entries(assessment.interest).sort((a, b) => b[1] - a[1]).slice(0, 2);
    for (const [k] of tops) {
      for (const m of (HOLLAND_MAJORS[k] || []).slice(0, 3)) majorSet.add(m);
    }
  }
  if (majorSet.size < 3) majorSet.add('计算机科学与技术');

  // 画像分析
  const scoreBand = score >= 660 ? '顶尖高校竞争区间（清华/北大/华五级别）'
    : score >= 630 ? '强 985 / 顶尖 211 竞争区间'
    : score >= 600 ? '中坚 985 / 头部 211 竞争区间'
    : score >= 570 ? '中坚 211 / 强势双非竞争区间'
    : score >= 540 ? '省属重点高校竞争区间'
    : '普通一本 / 优质二本竞争区间';
  const subjDesc = hasPhysics ? '物理类：可报考约 70% 的理工农医类专业，专业选择面广' : '历史类：文科、经管、法学、师范类专业优势明显，理工类选择受限';
  const personalityLine = assessment && assessment.interestTop && assessment.interestTop.length
    ? '你的性格测评兴趣代码为 ' + assessment.interestTop.map(v => v.key).slice(0, 2).join('+') + '，适合向' + Array.from(majorSet).slice(0, 2).join('、') + '方向倾斜'
    : '完成四维测评后，志愿推荐将进一步融合你的性格偏好';
  const familyLine = [];
  if (profile.finance === 'low') familyLine.push('家庭预算有限：优先考虑公费师范、学费较低的院校');
  if (profile.stability === 'yes') familyLine.push('家庭期望稳定：师范/医学/政法/财经类更契合');
  if (profile.parentJob && profile.parentJob !== '其他') familyLine.push('父母从事' + profile.parentJob + '行业，可考虑相关院校作为传承方向');

  const analysis = [
    { ic: '🎯', title: '分数定位', text: score + ' 分处于' + scoreBand },
    { ic: '🧩', title: '选科分析', text: subjDesc },
    { ic: '🧭', title: '性格与专业', text: personalityLine },
    ...(familyLine.length ? [{ ic: '🏠', title: '家庭因素', text: familyLine.join('；') }] : [])
  ];

  return {
    bands: {
      chong: chong.map(x => fmt('chong', x)),
      wen: wen.map(x => fmt('wen', x)),
      bao: bao.map(x => fmt('bao', x))
    },
    analysis,
    majors: Array.from(majorSet).slice(0, 5),
    summary: {
      score, subjects: subjects.join('+') || '未填写', lineKey: hasPhysics ? '物理类' : (hasHistory ? '历史类' : '未定'),
      candidateCount: candidates.length
    }
  };
}
