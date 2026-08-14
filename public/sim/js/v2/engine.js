/* 我的模拟人生路 v2 · 人生引擎：阶段推进 / 角色生成 / 事件 / 升学 / 求职 */
window.JEngine = (() => {
  'use strict';
  const C = () => JContent;

  // 角色话题边界（“不同关系聊不同内容”）
  const TOPICS_BY_TYPE = {
    deskmate: ['greet', 'study', 'career', 'life', 'emotion', 'truth'],
    teacher:  ['greet', 'study', 'career', 'life', 'emotion'],
    guide:    ['greet', 'study', 'career', 'truth', 'life', 'emotion'],
    roommate: ['greet', 'study', 'life', 'emotion', 'career'],
    prof:     ['greet', 'study', 'academic', 'career', 'life'],
    mentor:   ['greet', 'work', 'daily', 'career'],          // 职场人只聊工作
    senior:   ['greet', 'work', 'daily', 'career'],          // 职场前辈只聊工作
    hr:       ['greet', 'work', 'career'],
    gradProf: ['greet', 'academic', 'career', 'life'],
    lover:    ['greet', 'life', 'emotion', 'study', 'career'],
    npc:      ['greet']
  };
  const TOPIC_LABEL = {
    greet: '打招呼', study: '学习', career: '职业', life: '生活',
    emotion: '情感', truth: '职业真相', work: '工作', daily: '日常',
    academic: '学业研究'
  };

  let LIB = { careers: [], majors: [], schools: [], provinceLines: [] }; // 由 app 注入

  function setLib(lib) { LIB = lib || LIB; }
  function careerOf(s) { return LIB.careers.find(c => c.id === s.careerId) || null; }
  function roadmapOf(s) {
    const id = s.careerId;
    if (C().ROADMAPS[id]) return C().ROADMAPS[id];
    const career = careerOf(s);
    return career ? autoRoadmap(career) : null;
  }
  function majorName(id) { const m = LIB.majors.find(x => x.id === id); return m ? m.name : '相关专业'; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function chance(p) { return Math.random() < p; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ---------- AI 模板路线与角色（扩展职业自动生成） ---------- */
  function pickMajors(career) {
    const pool = LIB.majors || [];
    const kws = [career.name.slice(0, 2), ...(career.tags || []).slice(0, 3)].filter(k => k && k.length >= 2);
    const scored = pool.map(m => {
      const hay = [m.name, m.category, (m.jobs || []).join(' '), m.fit || '', m.truth || ''].join(' ');
      let score = 0;
      for (const kw of kws) if (hay.includes(kw)) score += 1;
      return { m, score };
    }).sort((a, b) => b.score - a.score);
    const top = scored.filter(x => x.score > 0).slice(0, 3).map(x => x.m.id);
    return top.length ? top : pool.slice(0, 3).map(m => m.id);
  }
  function autoRoadmap(career) {
    const need = /硕士|博士|研究生/.test(career.education || '') ? 'must' : 'no';
    const subs = career.category === '医疗健康' || career.category === '大健康与养老' ? ['物理', '化学', '生物'] : ['物理', '化学'];
    const majors = pickMajors(career);
    const firstMajor = majors.length ? majorName(majors[0]) : '相关专业';
    const path = career.path || (career.name + ' → 资深' + career.name);
    const firstJob = String(career.salary || '').split('（')[0].trim() || '初级岗位';
    const skills = (career.skills || []).slice(0, 3).join('、');
    return {
      tagline: (career.summary || '').slice(0, 26) + '…',
      subjects: subs,
      subjectNote: '首选物理（' + career.name + ' 方向通常需要理科基础），数学打牢是硬通货。',
      hsFocus: '把数学和' + subs[1] + '学扎实；多了解' + career.name + '的真实日常，培养' + ((career.skills || [])[0] || '核心') + '意识。',
      hsActions: ['了解' + career.name + '的入行路径', '加入相关社团/兴趣小组', '保持主科成绩在前 50%'],
      majors,
      majorNote: '最对口专业：' + firstMajor + '；大学重点是积累项目/实习/作品，让简历有东西。',
      college: {
        1: ['把基础课学扎实，绩点是硬通货', '加入相关社团，认识高年级学长学姐', '读 2 本' + career.name + '相关的入门书'],
        2: ['深入学习核心技能：' + skills, '参加相关竞赛/项目，攒一个作品', '约行业前辈做一次访谈'],
        3: ['找一份' + career.name + '相关实习', '把实习经历写成可展示的成果', '确定毕业去向：就业 or 考研'],
        4: ['秋招投递' + career.name + '相关岗位', '打磨简历 + 准备面试', '拿到 offer：' + firstJob]
      },
      advanced: {
        need,
        why: need === 'must' ? career.name + '方向普遍要求深造，建议按硕士标准准备。' : career.name + '以本科就业为主，读研非必需；实习和作品比学历更关键。',
        postgrad: '若想进头部平台/核心岗位，读研是加分项。',
        phd: '研究型方向（科研/高校）再读博，企业岗硕士足够。'
      },
      job: { path, firstJob, prep: ['相关实习/项目经历', '对应证书或作品', '面试准备'] },
      keyPeople: [
        { stage: 's1', role: '职业引路人', label: career.category + '前辈', desc: '在职业博览会向你介绍了' + career.name + '的日常' },
        { stage: 's2', role: '引路学长', label: '你选的学长/学姐', desc: '告诉你高中该为' + career.name + '准备什么' },
        { stage: 's6', role: '行业前辈', label: career.name + '前辈', desc: '讲真实的一天和职业真相' },
        { stage: 's7', role: '实习导师', label: '你的实习导师', desc: '实习时带你做第一个任务' }
      ]
    };
  }
  function autoCareerCast(career) {
    if (!career) return {};
    const cat = career.category || '职场';
    const skill = (career.skills || [])[0] || '专业';
    return {
      guide: { gender: '男', label: cat + '学长', persona: '职业博览会上的' + cat + '前辈，热情，讲起' + career.name + '就停不下来。' },
      senior: { gender: '女', label: cat + '前辈', persona: '在' + career.name + '行业做了几年，说话直接，愿意讲真话。' },
      mentor: { gender: '男', label: '实习导师', persona: '你的实习带教，最常说「先做，再想」「细节决定成败」，教你' + skill + '的实战。' }
    };
  }


  /* ---------- 模板填充 ---------- */
  function fillTemplate(s, str, char) {
    const career = careerOf(s);
    const rm = roadmapOf(s);
    const prot = s.prot;
    let out = String(str || '');
    const g = s.gaokao || {};
    out = out.replace(/\{prot\}/g, prot.name || '你');
    out = out.replace(/\{career\}/g, career ? career.name : '这个职业');
    out = out.replace(/\{day\}/g, career ? career.day : '');
    out = out.replace(/\{truth\}/g, career ? career.truth : '');
    out = out.replace(/\{salary\}/g, career ? career.salary : '');
    out = out.replace(/\{skills\}/g, career ? (career.skills || []).slice(0, 3).join('、') : '');
    out = out.replace(/\{firstJob\}/g, rm ? rm.job.firstJob : '');
    out = out.replace(/\{subjects\}/g, rm ? rm.subjects.join(' + ') : '');
    out = out.replace(/\{subjectHint\}/g, rm ? rm.subjectNote : '');
    out = out.replace(/\{hint\}/g, rm ? (rm.hsFocus + ' 高中阶段：' + rm.hsActions.join('；')) : '');
    out = out.replace(/\{phdHint\}/g, rm ? rm.advanced.phd : '');
    out = out.replace(/\{admission\}/g, g.admissionText || '你被大学录取了');
    out = out.replace(/\{college\}/g, g.uniName || '大学');
    out = out.replace(/\{rank\}/g, s.flags.lastRank || '第 400 名左右');
    out = out.replace(/\{randName\}/g, pick([].concat(C().NAME_POOL.female, C().NAME_POOL.male)));
    let want = '爸妈支持你的选择。';
    const fi = prot.familyInfo;
    if (fi && C().FAMILY_LINES && C().FAMILY_LINES.wantText) {
      want = C().FAMILY_LINES.wantText[fi.expect] || want;
    } else {
      const famCfg = C().FAMILY_CAST[prot.family] || C().FAMILY_CAST['普通家庭'] || {};
      want = famCfg.want || want;
    }
    out = out.replace(/\{want\}/g, want);
    out = out.replace(/\{family\}/g, prot.family || '普通家庭');
    // 角色名
    const keyToPlaceholder = { teacher: 'teacher', deskmate: 'deskmate', guide: 'guide', roommate: 'roommate', prof: 'prof', senior: 'senior', mentor: 'mentor', hr: 'hr', gradProf: 'gradProf', lover: 'lover' };
    for (const k of Object.keys(keyToPlaceholder)) {
      const ch = s.cast[k];
      if (ch) out = out.replace(new RegExp('\\{' + keyToPlaceholder[k] + '\\}', 'g'), ch.name);
    }
    if (char) out = out.replace(/\{name\}/g, char.name);
    return out;
  }

  /* ---------- 父母人设组装 ---------- */
  function buildParents(s) {
    const L = C().FAMILY_LINES || {};
    const fi = s.prot.familyInfo || defaultFamily(s.prot.family || '普通家庭');
    const fJob = L.fatherJob ? L.fatherJob[fi.fatherJob] || '' : '';
    const mJob = L.motherJob ? L.motherJob[fi.motherJob] || '' : '';
    const vibe = L.vibe ? L.vibe[fi.vibe] || '' : '';
    const fSay = L.fatherSay ? L.fatherSay[fi.expect] || '' : '';
    const mSay = L.motherSay ? L.motherSay[fi.expect] || '' : '';
    return {
      father: (fJob ? fJob + '。' : '') + (vibe ? vibe + '。' : '') + (fSay ? '最常说：「' + fSay + '」' : ''),
      mother: (mJob ? mJob + '。' : '') + (vibe ? vibe + '。' : '') + (mSay ? '最常说：「' + mSay + '」' : '')
    };
  }

  /* ---------- 新游戏 ---------- */
  function newGame(opts) {
    const s = JStore.freshState();
    s.prot.name = opts.name || '小高';
    s.prot.gender = opts.gender || '男';
    const fi = opts.familyInfo || defaultFamily(opts.family || '普通家庭');
    s.prot.familyInfo = fi;
    s.prot.family = fi.economy || '工薪家庭';
    s.prot.province = opts.province || '广东';
    s.prot.holland = opts.holland || [];
    s.careerId = opts.careerId;
    // 家庭与初中影响初始属性
    const ecoFx = { '工薪家庭': { money: 38 }, '小康家庭': { money: 55 }, '富裕家庭': { money: 75, social: 3 } }[fi.economy] || {};
    const vibeFx = {
      '严格管教': { study: 4, mood: -2 },
      '开明民主': { mood: 3 },
      '放养自由': { mood: 2, study: -1 },
      '忙碌少陪伴': { social: -2, mood: -1 }
    }[fi.vibe] || {};
    const onlyFx = fi.onlyChild === '独生子女' ? { money: 5 } : { social: 2 };
    const msFx = {
      '学霸型': { study: 6 }, '普通型': { study: 2 },
      '调皮型': { mood: 3, study: -2 }, '特长型': { ability: 4 }
    }[fi.middleSchool] || {};
    const allFx = { ...ecoFx, ...vibeFx, ...onlyFx, ...msFx };
    for (const k of Object.keys(allFx)) s.attrs[k] = JStore.clamp(s.attrs[k] + allFx[k]);
    s.prot.traits = opts.traits || [];
    if (typeof JFeatures !== 'undefined' && JFeatures.applyTraits) JFeatures.applyTraits(s, s.prot.traits);
    s.freePoints = 3;
    buildCast(s);
    markAppeared(s);
    ensureStageRandom(s);
    JStore.addMilestone(s, '高一入学，人生模拟开始');
    JStore.save(s);
    return s;
  }

  /* ---------- 阶段随机/好感事件 ---------- */
  function ensureStageRandom(s) {
    const st = stageOf(s);
    if (!st) return;
    s.extraEvents = s.extraEvents || {};
    if (s.extraEvents[st.id]) return;
    const picks = [];
    const era = ['s1', 's2', 's3', 's4'].includes(st.id) ? 'hs' : ['s5', 's6', 's7', 's8', 's8b'].includes(st.id) ? 'uni' : 'work';
    const lucky = (s.prot.traits || []).includes('t_lucky');
    const pool = ((typeof JFeaturesData !== 'undefined' && JFeaturesData.RANDOM_EVENTS) || []).filter(e => (e.era || []).includes(era));
    if (pool.length) {
      const good = pool.filter(e => e.good === 1);
      const bad = pool.filter(e => e.good === 0);
      if (Math.random() < (lucky ? 0.72 : 0.55)) {
        const useGood = lucky ? Math.random() < 0.7 : Math.random() < 0.5;
        const src = useGood ? (good.length ? good : pool) : (bad.length ? bad : pool);
        picks.push({ kind: 'random', id: src[Math.floor(Math.random() * src.length)].id });
      }
    }
    ((typeof JFeaturesData !== 'undefined' && JFeaturesData.SIDE_STORIES) || []).forEach(ss => {
      if (ss.stage !== st.id) return;
      const ch = s.cast[ss.target];
      if (!ch || ch.appeared === false) return;
      if (JStore.intimacy(s, ss.target) >= ss.need) picks.push({ kind: 'side', id: ss.id });
    });
    s.extraEvents[st.id] = picks;
  }

  function recordHistory(s) {
    s.attrsHistory = s.attrsHistory || [];
    s.attrsHistory.push({
      stage: JEngine2_stageName(s),
      study: s.attrs.study, ability: s.attrs.ability, social: s.attrs.social,
      mood: s.attrs.mood, health: s.attrs.health, money: s.attrs.money
    });
    if (s.attrsHistory.length > 30) s.attrsHistory.splice(0, s.attrsHistory.length - 30);
  }
  function JEngine2_stageName(s) {
    const st = stageOf(s);
    return st ? st.short || st.name : '结束';
  }

  function defaultFamily(family) {
    const map = {
      '普通家庭': { economy: '工薪家庭', fatherJob: '工人', motherJob: '全职妈妈', vibe: '开明民主', expect: '稳定踏实', onlyChild: '独生子女', middleSchool: '普通型' },
      '小康家庭': { economy: '小康家庭', fatherJob: '个体户', motherJob: '文员', vibe: '开明民主', expect: '稳定踏实', onlyChild: '独生子女', middleSchool: '普通型' },
      '富裕家庭': { economy: '富裕家庭', fatherJob: '经商', motherJob: '全职妈妈', vibe: '忙碌少陪伴', expect: '出人头地', onlyChild: '独生子女', middleSchool: '普通型' },
      '教师家庭': { economy: '工薪家庭', fatherJob: '教师', motherJob: '教师', vibe: '严格管教', expect: '出人头地', onlyChild: '独生子女', middleSchool: '学霸型' },
      '经商家庭': { economy: '小康家庭', fatherJob: '经商', motherJob: '个体户', vibe: '放养自由', expect: '继承家业', onlyChild: '独生子女', middleSchool: '普通型' }
    };
    return map[family] || map['普通家庭'];
  }

  function randName(gender) {
    const pool = gender === '女' ? C().NAME_POOL.female : C().NAME_POOL.male;
    return pick(pool);
  }

  function makeChar(s, key, cfg) {
    const ch = {
      key, name: cfg.name || randName(cfg.gender || pick(['男', '女'])),
      gender: cfg.gender || pick(['男', '女']),
      age: cfg.age || 16,
      role: cfg.role || '同学',
      tier: cfg.tier || 2,
      persona: cfg.persona || '',
      topics: TOPICS_BY_TYPE[key] || TOPICS_BY_TYPE.npc,
      emoji: cfg.emoji || '🙂',
      careerId: cfg.careerId || null,
      intro: cfg.intro || '',
      appeared: !!cfg.appeared
    };
    s.cast[key] = ch;
    if (!s.castOrder.includes(key)) s.castOrder.push(key);
    return ch;
  }

  function buildCast(s) {
    const cc0 = C().CAREER_CAST[s.careerId] || {};
    const career = careerOf(s);
    let cc = Object.keys(cc0).length ? cc0 : autoCareerCast(career);
    // L1 家人（填写的家庭信息决定人设）
    const fam = buildParents(s);
    makeChar(s, 'father', { name: '爸爸', appeared: true, gender: '男', age: 46, role: '爸爸', tier: 1, persona: fam.father, emoji: '👨' });
    makeChar(s, 'mother', { name: '妈妈', appeared: true, gender: '女', age: 44, role: '妈妈', tier: 1, persona: fam.mother, emoji: '👩' });
    // L2 班主任
    makeChar(s, 'teacher', { appeared: true, gender: pick(['女', '男']), age: 36, role: '班主任', tier: 2, persona: '教数学，说话干脆，最常说的三句话是「先学会做人，再学会做题」「身体是革命的本钱」「你们是我带过最差的一届（笑着说的）」', emoji: pick(['👩‍🏫', '👨‍🏫']) });
    // L1 同桌
    makeChar(s, 'deskmate', { appeared: true, gender: pick(['女', '男']), age: 16, role: '同桌', tier: 1, persona: pick(C().PERSONA_POOL.deskmate), emoji: pick(['🧑‍🎓', '👩‍🎓']) });
    // L2 职业引路人（按职业模板）
    if (cc.guide) {
      makeChar(s, 'guide', { appeared: true, gender: cc.guide.gender, age: 20, role: cc.guide.label, tier: 2, persona: cc.guide.persona, careerId: s.careerId, emoji: pick(['🧑‍💼', '👩‍💼']) });
    }
    // L2 专业课老师（大学阶段出现）
    const rm = roadmapOf(s);
    const firstMajor = rm && rm.majors.length ? majorName(rm.majors[0]) : '这个专业';
    makeChar(s, 'prof', { gender: pick(['女', '男']), age: 42, role: '专业课老师', tier: 2, persona: '教《' + firstMajor + '》方向，讲课严谨但很爱提问，口头禅是「这个问题，谁来回答？」', emoji: pick(['👨‍🏫', '👩‍🏫']) });
    // L2 行业前辈（大二出现）
    if (cc.senior) makeChar(s, 'senior', { gender: pick(['女', '男']), age: 30, role: cc.senior.label, tier: 2, persona: cc.senior.persona, careerId: s.careerId, emoji: pick(['🧑‍💼', '👩‍💼']) });
    // L1 实习导师（大三出现）
    if (cc.mentor) makeChar(s, 'mentor', { gender: cc.mentor.gender, age: 34, role: cc.mentor.label, tier: 1, persona: cc.mentor.persona, careerId: s.careerId, emoji: pick(['🧑‍🔧', '👩‍🔧']) });
    // L2 HR（求职出现）
    makeChar(s, 'hr', { gender: pick(['女', '男']), age: 30, role: '面试官', tier: 2, persona: 'HR，笑容专业，问问题却一个比一个尖锐', emoji: '🧑‍💼' });
    // L2 研究生导师（可选）
    makeChar(s, 'gradProf', { gender: pick(['女', '男']), age: 48, role: '研究生导师', tier: 2, persona: '治学严谨，最常说「慢就是快」「先学会读文献」', emoji: pick(['👨‍🔬', '👩‍🔬']) });
    // L1 大学室友（大一出现，稍后生成）
  }

  function buildRoommate(s) {
    if (s.cast.roommate) return s.cast.roommate;
    return makeChar(s, 'roommate', { gender: pick(['女', '男']), age: 19, role: '大学室友', tier: 1, persona: pick(C().PERSONA_POOL.roommate), emoji: pick(['🧑‍🎓', '👩‍🎓']) });
  }

  /* ---------- 角色按阶段出场 ---------- */
  const STAGE_APPEARS = {
    s1: ['teacher', 'deskmate', 'guide'],
    s5: ['roommate', 'prof'],
    s6: ['senior'],
    s7: ['mentor'],
    s8: ['hr'],
    s9: ['gradProf']
  };
  function markAppeared(s) {
    const stage = stageOf(s);
    if (!stage) return;
    const keys = STAGE_APPEARS[stage.id] || [];
    keys.forEach(k => {
      if (k === 'roommate' && !s.cast.roommate) buildRoommate(s);
      const ch = s.cast[k];
      if (ch) ch.appeared = true;
    });
  }

  /* ---------- 阶段与步骤 ---------- */
  function stageOf(s) { return C().STAGES[s.stageIndex] || null; }

  /* 运行时阶段步骤：基础剧本 + 按初始信息插入的个性化事件 */
  function stageSteps(s) {
    const st = stageOf(s);
    if (!st) return [];
    const base = st.steps || [];
    const evs = (C().PERSONAL_EVENTS || []).filter(e => e.when === st.id && e.cond && e.cond(s));
    if (!evs.length) return base;
    let result = base.slice();
    let inserted = 0;
    for (const ev of evs) {
      if (inserted >= 3) break;
      const afterIdx = result.findIndex(x => x.id === ev.after);
      if (afterIdx < 0) continue;
      const anchor0 = result[afterIdx];
      // 选择型步骤本身没有 next，从第一个选项取（所有选项 next 相同）
      const origNext = anchor0.next !== undefined ? anchor0.next : (anchor0.options && anchor0.options[0] ? anchor0.options[0].next : undefined);
      const step = { ...ev.step, id: 'pe_' + ev.id, next: origNext };
      if (step.options) step.options = step.options.map(o => ({ ...o, next: origNext }));
      const updatedAnchor = { ...anchor0, next: 'pe_' + ev.id };
      if (anchor0.options) {
        updatedAnchor.options = anchor0.options.map(o => (o.next === origNext ? { ...o, next: 'pe_' + ev.id } : o));
      }
      result[afterIdx] = updatedAnchor;
      result.splice(afterIdx + 1, 0, step);
      inserted++;
    }
    // 随机事件 / 好感剧情（进入阶段时已选定）
    const extras = (s.extraEvents || {})[st.id] || [];
    for (const ex of extras) {
      const ev = ex.kind === 'random'
        ? ((typeof JFeaturesData !== 'undefined' && JFeaturesData.RANDOM_EVENTS) || []).find(e => e.id === ex.id)
        : ((typeof JFeaturesData !== 'undefined' && JFeaturesData.SIDE_STORIES) || []).find(e => e.id === ex.id);
      if (!ev) continue;
      const anchorIdx = result.length > 2 ? 2 : 0;
      const anchor0 = result[anchorIdx];
      const origNext = anchor0.next !== undefined ? anchor0.next : (anchor0.options && anchor0.options[0] ? anchor0.options[0].next : undefined);
      const step = { ...ev.step, id: ev.id, next: origNext };
      if (step.options) step.options = step.options.map(o => ({ ...o, next: origNext }));
      const updatedAnchor = { ...anchor0, next: step.id };
      if (anchor0.options) updatedAnchor.options = anchor0.options.map(o => (o.next === origNext ? { ...o, next: step.id } : o));
      result[anchorIdx] = updatedAnchor;
      result.splice(anchorIdx + 1, 0, step);
    }
    return result;
  }

  function stepOf(s) {
    const st = stageOf(s);
    if (!st) return null;
    return stageSteps(s)[s.stepIndex] || null;
  }

  // 进入下一个阶段（含分支路由）
  function advanceStage(s) {
    const cur = stageOf(s);
    if (!cur) return false;
    if (!s.stageDone.includes(cur.id)) s.stageDone.push(cur.id);
    let nextId = null;
    if (cur.id === 's7') {
      nextId = s.flags.path_grad ? 's8b' : 's8';
    } else if (cur.id === 's8b') {
      nextId = s.flags.gradPass ? 's9' : null;
    } else if (cur.id === 's9') {
      nextId = null; // 结束后直接进入结局
    } else {
      const idx = C().STAGES.findIndex(x => x.id === cur.id);
      nextId = C().STAGES[idx + 1] ? C().STAGES[idx + 1].id : null;
    }
    if (!nextId) {
      // 全部结束：若还在 s8b 且没上岸 → 转就业；若 s9 结束 → 结局
      if (cur.id === 's8b') { s.flags.gradFailedJob = true; nextId = 's8'; }
    }
    if (nextId) {
      recordHistory(s);
      const idx = C().STAGES.findIndex(x => x.id === nextId);
      if (idx >= 0) { s.stageIndex = idx; s.stepIndex = 0; s.stageClock = { day: 1, slot: 0 }; s.freePoints = 3; }
      markAppeared(s);
      ensureStageRandom(s);
      return true;
    }
    return false;
  }

  // 完成当前步骤 → 前进
  function gotoNext(s, nextId) {
    if (nextId) {
      const steps = stageSteps(s);
      const idx = steps.findIndex(x => x.id === nextId);
      if (idx >= 0) { s.stepIndex = idx; return; }
    }
    // 步骤走完 → 阶段总结由 UI 触发 advanceStage
    s.stepIndex = -1; // 标记阶段结束
  }

  /* ---------- 步骤准备（供 UI 渲染） ---------- */
  function prepareStep(s, step) {
    if (!step) return null;
    const d = {
      id: step.id, title: fillTemplate(s, step.title), time: step.time,
      type: step.type, next: step.next, milestone: step.milestone, fx: step.fx,
      desc: step.desc ? fillTemplate(s, step.desc) : ''
    };
    if (step.type === 'choice') {
      d.options = (step.options || []).map((o, i) => ({
        index: i, text: fillTemplate(s, o.text), fx: o.fx, tag: o.tag,
        note: o.note ? fillTemplate(s, o.note) : '', next: o.next
      }));
    }
    if (step.type === 'dialogue') {
      const ch = s.cast[step.target];
      d.target = step.target;
      d.auto = step.auto ? fillTemplate(s, step.auto, ch) : '';
      d.topic = step.topic;
    }
    return d;
  }

  /* ---------- 选择 ---------- */
  function choose(s, step, opt) {
    const logs = JStore.applyFx(s, opt.fx);
    if (opt.tag) s.flags[opt.tag] = true;
    s.choices = s.choices || [];
    s.choices.push({ stage: stageOf(s) ? stageOf(s).id : '', tag: opt.tag || '', text: String(opt.text || '').slice(0, 30) });
    if (s.choices.length > 30) s.choices.splice(0, s.choices.length - 30);
    // 记录路线图打卡
    trackRoadmap(s, step, opt);
    if (opt.note) JStore.addMilestone(s, opt.note);
    if (step.milestone) { JStore.addMilestone(s, fillTemplate(s, step.milestone)); }
    if (opt.tag === 'roadmap_subjects') roadmapDone(s, '按目标职业路线选科');
    if (opt.tag === 'dream_said') roadmapDone(s, '说出职业方向');
    if (opt.tag === 'join_club' || opt.tag === 'balanced') roadmapDone(s, '参加相关社团/活动');
    if (opt.tag === 'competition' || opt.tag === 'certificate' || opt.tag === 'research') roadmapDone(s, '大二积累竞赛/证书/科研');
    if (opt.tag === 'intern_active' || opt.tag === 'intern_steady') roadmapDone(s, '实习表现受认可');
    JStore.save(s);
    return logs;
  }

  function trackRoadmap(s, step, opt) {
    const map = {
      's1_5': '认识职业引路人',
      's3_5': '了解职业真相',
      's6_3': '结识行业前辈',
      's7_2': '完成实习'
    };
    if (map[step.id]) roadmapDone(s, map[step.id]);
  }

  function roadmapDone(s, label) {
    if (!s.roadmapDone.includes(label)) s.roadmapDone.push(label);
  }

  /* ---------- 事件处理 ---------- */
  function handleEvent(s, step) {
    const fn = EVENTS[step.event];
    if (!fn) return { title: step.title, desc: '（事件占位）', next: step.next, options: [] };
    return fn(s, step);
  }

  const EVENTS = {
    /* 高二：一次机会（社团/竞赛/学习） */
    hs_activity(s, step) {
      if (s.flags.join_club) {
        roadmapDone(s, '参加相关社团/活动');
        return card(s, step, '高二上学期，你在{guide}的社团里第一次完整做完一个和{career}相关的小项目。虽然很粗糙，但你把成果贴在社团墙上，路过的人都会看一眼。', { ability: 3, social: 2 }, '你的兴趣小组作品完成，获得社团年度「最佳新人」');
      }
      if (s.flags.balanced) {
        roadmapDone(s, '参加相关社团/活动');
        return card(s, step, '你给自己定了规矩：社团时间不超过每周 4 小时。结果学期末，你既拿到了进步奖，作品也在社团展上露了脸。', { ability: 2, study: 2 }, '学习与兴趣双线推进');
      }
      if (s.flags.study_only) {
        return card(s, step, '你选择了把时间全部押在学习上。期末你的排名又前进了一截，但路过社团展板时，你还是忍不住多看了两眼。', { study: 3, mood: -1 }, '成绩进步，但心里有点空落落的');
      }
      return card(s, step, '高二的社团季就这么过去了。你发现自己既没有在学习上特别突出，也没有在任何事情上留下痕迹。', { study: -1, mood: -2 }, '平平淡淡的一年');
    },

    /* 成绩波动（高二 / 高三模考） */
    grade_wave(s, step) {
      const good = s.attrs.study >= 62 || (s.attrs.mood >= 60 && chance(0.6));
      if (good) {
        return card(s, step, '这次考试你超常发挥，排名前进了几十名。{teacher}在班上点名表扬了你：「看到没，努力是有用的。」你偷偷挺直了背。', { study: 2, mood: 2 }, '成绩进步，信心+1');
      }
      return card(s, step, '这次考砸了。你把卷子折了又折塞进书包，{deskmate}递过来一颗糖：「别灰心，下次一起刷题。」你鼻子有点酸，但心里是暖的。', { study: -2, mood: -1 }, '成绩波动，心态受挫');
    },

    /* 高考 */
    gaokao(s, step) {
      const rm = roadmapOf(s);
      let score = 300 + s.attrs.study * 2.8 + s.attrs.ability * 0.5 + s.attrs.mood * 0.3 + (Math.random() * 80 - 40);
      if ((s.prot.traits || []).includes('t_exam')) score += 12;   // 考试锦鲤
      if (s.flags.roadmap_subjects) score += 15;   // 按路线选科加成
      if (s.flags.summer_balance) score += 5;
      if (s.flags.summer_slack) score -= 20;
      score = Math.round(clamp(score, 200, 750));
      s.gaokao.score = score;
      const line = provinceLine(s);
      s.gaokao.line = line;
      const usePhysics = (s.flags.roadmap_subjects ? true : false) || (s.flags.interest_subjects ? false : true);
      // 简化：以选科决定文理线（默认按物理线）
      const base = line ? (usePhysics ? line.physics : line.history) : 436;
      const special = line ? (usePhysics ? line.specialPhysics : line.specialHistory) : 534;
      let tier = 'low';
      if (score >= special) tier = 'top';
      else if (score >= base) tier = 'mid';
      else tier = 'low';
      s.gaokao.tier = tier;
      s.flags.lastRank = rankText(score);
      const tierName = { top: '超过特招线', mid: '过本科线', low: '未过本科线' }[tier];
      const desc = '六月，你走进考场。两天后放下笔的那一刻，你长出一口气——不管结果如何，你尽力了。\n\n出分那天：**' + score + ' 分**（' + (line ? line.name : '') + '，本科线 ' + base + '，特招线 ' + special + '）。你的成绩' + tierName + '。';
      JStore.addMilestone(s, '高考 ' + score + ' 分，' + tierName);
      if (tier !== 'low') roadmapDone(s, '高考过线');
      return { title: '高考出分', desc: fillTemplate(s, desc), next: step.next, options: [], stats: [{ key: 'study', delta: 0 }], log: [] };
    },

    /* 志愿填报 */
    volunteer(s, step) {
      const rm = roadmapOf(s);
      const g = s.gaokao;
      const targetMajor = rm ? majorName(rm.majors[0]) : '目标专业';
      const altMajor = rm && rm.majors[1] ? majorName(rm.majors[1]) : '相近专业';
      const options = [];
      if (g.tier === 'top') {
        options.push({ text: '双一流/一本 · ' + targetMajor, tag: 'vol_ideal', majorFit: 1, uniTier: 'top', note: '你被理想院校的理想专业录取！' });
        options.push({ text: '普通一本 · ' + targetMajor, tag: 'vol_safe', majorFit: 1, uniTier: 'mid', note: '稳稳上岸，专业完全对口。' });
        options.push({ text: '双一流/一本 · ' + altMajor, tag: 'vol_alt', majorFit: 0.7, uniTier: 'top', note: '你进了好学校，但专业是相近方向。' });
      } else if (g.tier === 'mid') {
        options.push({ text: '普通本科 · ' + targetMajor, tag: 'vol_target', majorFit: 1, uniTier: 'mid', note: '专业对口，学校中规中矩。' });
        options.push({ text: '普通本科 · ' + altMajor, tag: 'vol_alt2', majorFit: 0.7, uniTier: 'mid', note: '学校还行，专业是相近方向。' });
        options.push({ text: '复读一年，明年再战', tag: 'vol_retry', majorFit: 0, uniTier: 'fails', note: '你选择再来一年。' });
      } else {
        options.push({ text: '专科 · ' + (rm ? majorName(rm.majors[0]) : '相关专业'), tag: 'vol_college', majorFit: 0.5, uniTier: 'low', note: '你上了专科，但专业方向还挨着边。' });
        options.push({ text: '复读一年，拼一把本科', tag: 'vol_retry2', majorFit: 0, uniTier: 'fails', note: '你选择复读。' });
      }
      s.flags.volOptions = options;
      return {
        title: '志愿填报', next: null, options, desc: '分数出来了，志愿表摆在面前。你想做的{career}，对应的专业是「' + targetMajor + '」。你看着三个志愿栏，握紧了笔。',
        optionHandler: 'volunteer'
      };
    },

    /* 大一期末 */
    freshman_gpa(s, step) {
      let gain = 2;
      const tier = s.gaokao.uniTier || 'mid';
      if (tier === 'top') gain += 2; else if (tier === 'mid') gain += 1;
      if (s.flags.join_uni_club) gain += 1;
      if (s.flags.uni_study_only) gain += 2;
      const gpa = s.attrs.study + gain;
      const good = gpa >= 60;
      if (good) roadmapDone(s, '大一绩点稳');
      const desc = good
        ? '期末成绩出来，你的绩点排进专业前 30%。{roommate}看着你的成绩单：「可以啊{prot}，请客！」你笑了：大学第一年，稳住了。'
        : '期末成绩一般，你看着绩点排名叹了口气。{roommate}拍拍你：「没事，大一都是适应期，大二咱俩一起卷。」';
      return card(s, step, desc, { study: gain }, good ? '大一绩点稳住了' : '大一成绩平平，需加油');
    },

    /* 恋爱事件（大二） */
    love(s, step) {
      if (s.loverKey || s.attrs.social < 55 || s.attrs.mood < 50) {
        return card(s, step, '这一年你的生活被学习和社团填满。宿舍楼下的情侣一对对走过，你偶尔也会想：也许缘分还在路上。', { mood: 1 }, '感情线暂时安静');
      }
      const lover = makeChar(s, 'lover', { appeared: true, gender: pick(['女', '男']), age: 20, role: '心动的人', tier: 1, persona: pick(['笑起来眼睛弯弯的，总能在人群里一眼看到你', '安静又温柔，和 TA 在一起很安心', '嘴上损你，但每次你有事 TA 都在']), emoji: pick(['💛', '💜', '💙']) });
      s.loverKey = 'lover';
      JStore.addIntimacy(s, 'lover', 20);
      return {
        title: '心动', next: null, desc: '大二下学期，社团庆功宴散场后，{lover}叫住你：「{prot}，我……有句话想跟你说。」夜色里，TA 的脸有点红。',
        options: [
          { text: '「我也是。」——勇敢回应', tag: 'love_yes', fx: { mood: 5, social: 3 }, note: '你们在一起了。那天晚上的风都是甜的。', next: 's6_5' },
          { text: '「我们……还是做朋友吧。」', tag: 'love_no', fx: { mood: -2 }, note: 'TA 笑了笑说「好」，但你们之间多了一层说不清的东西。', next: 's6_5' },
          { text: '「让我想想。」——先不急着回答', tag: 'love_wait', fx: { mood: 1 }, note: '你们约定大四毕业再说。', next: 's6_5' }
        ],
        optionHandler: 'love'
      };
    },

    /* 实习申请（大三） */
    intern_apply(s, step) {
      const rm = roadmapOf(s);
      let ok = s.attrs.ability >= 42 || chance(0.65);
      if ((s.gaokao.uniTier || '') === 'top') ok = true;
      if (ok) {
        const big = s.attrs.ability >= 60 || (s.gaokao.uniTier || '') === 'top';
        s.flags.internBig = big;
        roadmapDone(s, '完成实习');
        return card(s, step, big
          ? '你的简历通过了筛选，拿到了行业内头部公司（大厂/名所/三甲/重点校）的实习 offer。HR 在电话里说：「看了你的项目和经历，我们觉得你很适合。」'
          : '你拿到了一家不错的单位（中小厂/普通律所/县医院/普通中学）的实习 offer。虽然不是最顶级的平台，但足够你近距离看看{career}的真实样子。',
          { mood: 2, ability: 1 }, '实习申请成功');
      }
      return card(s, step, '你投了十几份简历，大部分石沉大海。最后一家小公司给了你机会。你告诉自己：先入门，再谈平台。', { mood: -1, ability: 1 }, '实习申请坎坷但成功');
    },

    /* 简历筛选（秋招） */
    resume(s, step) {
      const tier = resumeScore(s);
      s.flags.resumeTier = tier;
      const map = {
        big: '你的简历很能打：项目、实习、奖项、成绩都齐了。HR 把你的简历放进「重点跟进」文件夹。',
        mid: '你的简历中规中矩：有实习经历，但亮点不够突出。几家公司约你面试，也有几家没有回音。',
        small: '你的简历有点单薄，投出去的多数没有回音。你收到了一两家小公司的面试邀请。'
      };
      return card(s, step, map[tier], {}, '简历投递完成（竞争力：' + { big: '强', mid: '中', small: '弱' }[tier] + '）');
    },

    /* 面试（秋招） */
    interview(s, step) {
      const social = s.attrs.social;
      const mood = s.attrs.mood;
      const options = [
        { text: '坦诚展示真实的自己', fx: { mood: 2 }, tag: 'iv_honest', note: '你讲了自己实习时搞砸又爬起来的故事，面试官反而点了点头。', next: 's8_5' },
        { text: '适当包装，突出亮点', fx: { social: 2 }, tag: 'iv_pack', note: '你把经历讲得很精彩，但心里有点虚。', next: 's8_5' },
        { text: '太紧张了，发挥失常', fx: { mood: -3 }, tag: 'iv_nervous', note: '你说话有点磕巴，走出门时手心全是汗。', next: 's8_5' }
      ];
      return {
        title: '面试', next: null, options,
        desc: '面试官{hr}的问题一个接一个：「你为什么想做{career}？」「讲一件你最有成就感的事。」「如果入职后发现和想象不一样，怎么办？」你深吸一口气。',
        optionHandler: 'interview'
      };
    },

    /* offer（就业结局） */
    offer(s, step) {
      return makeOffer(s, step);
    },

    /* 考研初试复试 */
    grad_exam(s, step) {
      let p = 25 + s.attrs.study * 0.6 + s.attrs.ability * 0.2;
      if ((s.prot.traits || []).includes('t_exam')) p += 12;   // 考试锦鲤
      if (s.flags.grad_balance) p += 12;
      if (s.flags.grad_strict) p += 6;
      if (s.flags.grad_slack) p -= 30;
      if (s.flags.gradRetry) p += 15;
      p = clamp(p, 5, 95);
      s.flags.gradPass = chance(p / 100);
      const pass = s.flags.gradPass;
      JStore.addMilestone(s, pass ? '考研初试复试通过，上岸' : '考研失利');
      if (pass) roadmapDone(s, '考研上岸');
      return card(s, step, pass
        ? '初试出分那天你不敢查，是{roommate}帮你点的。看到分数的那一刻你愣住了——过了！复试那天，你走出考场，春天的风都是暖的。'
        : '初试成绩出来，你差了十几分。你在图书馆坐了一下午，手机里是{deskmate}发来的「没事吧？」的消息。',
        pass ? { study: 2, mood: 3 } : { mood: -4 }, pass ? '考研上岸' : '考研失利');
    },

    /* 考研结果 → 分支 */
    grad_result(s, step) {
      if (s.flags.gradPass) {
        return card(s, step, '你收到了录取通知。{gradProf}在电话里说：「欢迎加入实验室。」你挂掉电话，在宿舍楼下喊了一嗓子。', { mood: 3 }, '研究生录取');
      }
      const opts = [
        { text: '调剂到普通院校读研', tag: 'grad_adjust', fx: { mood: 1 }, note: '你接受了调剂。', next: 'adjust' },
        { text: '放弃读研，直接就业', tag: 'grad_to_job', fx: { mood: 2 }, note: '你收拾心情，转战秋招。', next: 'job' }
      ];
      if (!s.flags.gradRetry) {
        opts.unshift({ text: '二战：再拼一年', tag: 'grad_retry', fx: { mood: -2 }, note: '你决定再来一年。', next: 'retry' });
      }
      return {
        title: '下一步怎么走', next: null, desc: '考研失利后，摆在面前有几条路。你想起{mentor}说过：「人生不是单行道，拐个弯也能到。」',
        options: opts,
        optionHandler: 'grad_result'
      };
    },

    /* 研二：论文与求职 */
    grad_year(s, step) {
      const lab = s.flags.grad_lab;
      roadmapDone(s, '研究生学业推进');
      return card(s, step, lab
        ? '研二你扎在实验室，第一篇论文被拒了两次，第三版终于被接收。{gradProf}难得夸了你：「可以，像个做研究的样子了。」'
        : '研二你在实习和论文之间来回跑。论文写得磕磕绊绊，但实习让你提前看清了职场。你开始明白：学历是敲门砖，能力才是通行证。',
        { ability: 3, study: 2 }, '研究生阶段稳步推进');
    },

    /* 读博 */
    phd(s, step) {
      roadmapDone(s, '读博深造');
      return card(s, step, '你选择了读博。接下来几年，你将在文献、实验、论文里打转。偶尔深夜从实验室出来，你会想起高中那个在职业博览会门口驻足的自己——这条路，你走下来了。', { study: 2, ability: 3, mood: -2 }, '博士生涯开始');
    },

    /* 研究生求职 */
    grad_jobhunt(s, step) {
      return makeOffer(s, step, true);
    }
  };

  /* ---------- 求职 / offer 计算 ---------- */
  function resumeScore(s) {
    const rm = roadmapOf(s);
    let score = s.attrs.ability * 0.7 + s.attrs.study * 0.3;
    if (s.flags.intern_active) score += 12;
    else if (s.flags.intern_steady) score += 8;
    else if (s.flags.intern_slack) score -= 8;
    score += (s.gaokao.majorFit || 0) * 20;
    const ut = s.gaokao.uniTier || 'mid';
    score += ut === 'top' ? 15 : ut === 'mid' ? 8 : ut === 'low' ? 2 : 0;
    if (s.flags.gradPass || s.flags.path_phd || s.stageDone.includes('s9')) score += 15;
    if (rm && rm.advanced.need === 'must' && !s.stageDone.includes('s9') && !s.flags.gradPass) score -= 20;
    if (s.flags.iv_nervous) score -= 10;
    if (s.flags.iv_pack) score += 3;
    if (score >= 62) return 'big';
    if (score >= 42) return 'mid';
    return 'small';
  }

  const COMPANY_TIERS = {
    c001: { big: '头部互联网大厂', mid: '中型互联网公司', small: '创业公司/成长型团队' },
    c003: { big: '头部互联网大厂', mid: '中型互联网/软件公司', small: '创业公司/外包团队' },
    c005: { big: '大厂 AI 部门/独角兽', mid: '中型科技公司 AI 岗', small: '小型算法团队' },
    c027: { big: '三甲医院', mid: '市级医院', small: '基层医院/诊所' },
    c029: { big: '知名咨询机构/高校心理中心', mid: '专业咨询机构', small: '小型工作室' },
    c035: { big: '重点中学', mid: '普通中学', small: '培训机构' },
    c070: { big: '红圈所/知名律所', mid: '中型律所', small: '小型律所/公司法务' },
    c072: { big: '省级机关/经济发达地区', mid: '市直机关', small: '基层单位' }
  };
  function makeOffer(s, step, grad) {
    const career = careerOf(s);
    const rm = roadmapOf(s);
    const tier = grad ? resumeScore(s) : (s.flags.resumeTier || resumeScore(s));
    const co = (COMPANY_TIERS[s.careerId] || { big: '头部企业', mid: '中型企业', small: '中小企业' })[tier];
    const tierMap = {
      big: { name: co, mult: 1.25, color: '#12b886' },
      mid: { name: co, mult: 1.0, color: '#5c7cfa' },
      small: { name: co, mult: 0.8, color: '#fab005' }
    }[tier];
    const sal = career ? parseInt(String(career.salary).match(/\d+/)?.[0] || '10', 10) : 10;
    const salaryK = Math.round(sal * tierMap.mult);
    const jobTitle = grad ? (rm ? rm.job.path.split('→')[0].trim() : '初级岗位') : (rm ? rm.job.firstJob : '入职');
    const st = (typeof JFeatures !== 'undefined' && JFeatures.endingStyle) ? JFeatures.endingStyle(s) : null;
    const ending = {
      offer: (rm ? rm.job.firstJob : '初级岗位'),
      company: tierMap.name,
      tier, salary: salaryK + 'K/月 起',
      grad: !!grad,
      match: matchScore(s),
      title: st ? st.title : '',
      styleKey: st ? st.key : ''
    };
    s.ending = ending;
    roadmapDone(s, '拿到第一份工作 offer');
    JStore.addMilestone(s, '拿到第一份工作 offer：' + ending.offer + ' @ ' + ending.company);
    JStore.save(s);
    const desc = '手机震了一下，你收到一条邮件提醒。点开：**录用通知**。\n\n岗位：{career} 方向 · ' + ending.offer + '\n单位：' + ending.company + '\n薪资：' + ending.salary + '\n\n你盯着屏幕看了很久，然后给{deskmate}、{roommate}、{mentor}分别发了消息。你的高中到大学这一段人生，在此刻画上了一个句号——而新的故事，才刚刚开始。';
    return { title: '🎉 第一份工作 offer', desc: fillTemplate(s, desc), next: null, options: [], ending, optionHandler: 'offer' };
  }

  /* ---------- 职业匹配度 ---------- */
  function matchScore(s) {
    const career = careerOf(s);
    if (!career) return 50;
    const holland = s.prot.holland || [];
    const ch = career.holland || [];
    let hit = 0;
    for (const h of holland) if (ch.includes(h)) hit++;
    let score = 40 + hit * 15;
    const rm = roadmapOf(s);
    if (s.flags.roadmap_subjects) score += 8;
    if (s.flags.join_club) score += 5;
    if (s.flags.competition || s.flags.certificate || s.flags.research) score += 5;
    if (s.flags.intern_active) score += 5;
    if (s.gaokao.majorFit >= 1) score += 6;
    return clamp(Math.round(score), 10, 98);
  }

  /* ---------- 工具 ---------- */
  function card(s, step, desc, fx, log) {
    const logs = JStore.applyFx(s, fx);
    if (log) JStore.addMilestone(s, fillTemplate(s, log));
    return { title: fillTemplate(s, step.title), desc: fillTemplate(s, desc), next: step.next, options: [], logs, fx };
  }

  function provinceLine(s) {
    return (LIB.provinceLines || []).find(p => p.name === s.prot.province) || null;
  }

  function rankText(score) {
    if (score >= 620) return '全校前 5%';
    if (score >= 560) return '全校前 15%';
    if (score >= 500) return '全校前 35%';
    if (score >= 450) return '全校前 60%';
    return '全校后 40%';
  }

  /* ---------- 对话：话题边界 + 模板生成 ---------- */
  function replyFor(s, charKey, userText) {
    const ch = s.cast[charKey];
    if (!ch) return { text: '……', allowed: [] };
    const intent = intentOf(userText);
    const allowed = ch.topics;
    const pool = C().DIALOGUES[charKey] || C().DIALOGUES.npc;
    let key = intent && allowed.includes(intent) ? intent : null;
    if (intent === 'truth' && charKey !== 'guide' && charKey !== 'mentor' && charKey !== 'senior') key = null;
    let text;
    if (key && pool[key] && pool[key].length) {
      text = pick(pool[key]);
    } else if (pool.greet && /^(你好|您好|hi|hello|嗨|在吗|早上好|下午好|晚上好)/i.test(userText)) {
      text = pick(pool.greet);
    } else {
      const def = pool.deflect || [C().DEFLECT_LINE];
      text = pick(def);
    }
    text = fillTemplate(s, text, ch);
    JStore.addMemory(s, charKey, userText.slice(0, 60));
    JStore.addIntimacy(s, charKey, 1);
    JStore.save(s);
    return { text, allowed };
  }

  // 意图识别（简化版）
  function intentOf(msg) {
    const rules = [
      ['salary', /工资|薪资|钱|收入|赚|待遇|月薪|年薪|多少/],
      ['stress', /累|辛苦|加班|压力|忙不忙|熬夜|996/],
      ['entry', /入行|门槛|怎么进|怎么入|学历|专业|学什么|要学|转行|考证|实习|0基础|零基础|难不难/],
      ['fit', /适合|性格|什么样的人|谁.*适合|我行吗|我能做|适不适合/],
      ['truth', /真相|后悔|缺点|劝退|不好|坑|另一面|真实/],
      ['daily', /每天|一天|日常|做什么|工作内容|一天到晚|流程|干什么/],
      ['ai', /AI|人工智能|替代|失业|未来|前景|会不会|淘汰/],
      ['advice', /建议|高考|志愿|选专业|大学生|高中生|毕业生|迷茫|怎么办/],
      ['family', /家庭|条件|家里|没钱|普通家庭|资源|人脉/],
      ['life', /生活|平衡|幸福|值得|有意义|周末|休息/],
      ['emotion', /喜欢|爱|心动|恋爱|对象|表白|暗恋|想家|难过|开心|心情|烦恼|焦虑/],
      ['study', /作业|考试|学习|成绩|老师|上课|数学|语文|英语|学校|上学|绩点|复习/],
      ['work', /工作|职场|上班|同事|老板|公司|职业|行业/],
      ['academic', /论文|研究|课题|文献|实验|导师|科研/],
      ['play', /玩|游戏|动画|足球|画画|朋友|同学/],
      ['health', /身体|健康|锻炼|养生|血压|注意/],
      ['greet', /^你好|^您好|^hi|^hello|^嗨|在吗|早上好|下午好|晚上好|^hey/i],
      ['bye', /再见|拜拜|走了|下次|886|bye/i]
    ];
    for (const [key, re] of rules) if (re.test(msg)) return key;
    return null;
  }

  return {
    setLib, careerOf, roadmapOf, majorName, pick, chance, clamp,
    TOPICS_BY_TYPE, TOPIC_LABEL,
    newGame, buildCast, buildRoommate, markAppeared,
    stageOf, stepOf, stageSteps, prepareStep, choose, gotoNext, advanceStage,
    handleEvent, fillTemplate, replyFor, intentOf,
    resumeScore, matchScore, makeOffer, roadmapDone, trackRoadmap,
    provinceLine
  };
})();







