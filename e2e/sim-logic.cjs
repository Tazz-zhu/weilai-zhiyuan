// v2 全流程自动化测试：模拟浏览器全局，跑通人生模拟直到拿到 offer
const fs = require('node:fs');
const path = require('node:path');

const store = {};
global.window = global;
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};

const files = ['content.js', 'features-data.js', 'store.js', 'engine.js', 'features.js', 'dialogue.js'];
for (const f of files) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'sim', 'js', 'v2', f), 'utf8');
  eval(code);
}

async function main() {
  const res = await fetch('http://localhost:4173/api/library');
  const lib = await res.json();
  JEngine.setLib(lib);

  // 个性化剧本：不同初始信息 → 不同事件
  function stepsFor(state, stageId) {
    state.stageIndex = JContent.STAGES.findIndex(x => x.id === stageId);
    return JEngine.stageSteps(state).map(x => x.id);
  }
  const sA = JEngine.newGame({ name: 'A', gender: '男', family: '普通家庭', province: '广东', holland: ['I'], careerId: 'c003',
    familyInfo: { economy: '工薪家庭', fatherJob: '工人', motherJob: '全职妈妈', vibe: '严格管教', expect: '出人头地', onlyChild: '独生子女', middleSchool: '学霸型' } });
  const sB = JEngine.newGame({ name: 'B', gender: '女', family: '普通家庭', province: '广东', holland: ['S'], careerId: 'c070',
    familyInfo: { economy: '富裕家庭', fatherJob: '经商', motherJob: '全职妈妈', vibe: '忙碌少陪伴', expect: '继承家业', onlyChild: '有兄弟姐妹', middleSchool: '特长型' } });
  const check = {
    A_s1_ms_top: stepsFor(sA, 's1').includes('pe_ms_top'),
    A_s2_proud: stepsFor(sA, 's2').includes('pe_fam_proud'),
    A_s4_pressure: stepsFor(sA, 's4').includes('pe_gaokao_pressure'),
    A_s5_only: stepsFor(sA, 's5').includes('pe_uni_only'),
    A_s5_money: stepsFor(sA, 's5').includes('pe_uni_money'),
    A_s6_question: stepsFor(sA, 's6').includes('pe_so2_question'),
    A_s8_money: stepsFor(sA, 's8').includes('pe_s8_money'),
    B_s1_talent: stepsFor(sB, 's1').includes('pe_ms_talent'),
    B_s2_inherit: stepsFor(sB, 's2').includes('pe_fam_inherit'),
    B_s4_tutor: stepsFor(sB, 's4').includes('pe_gaokao_tutor'),
    B_s5_sibling: stepsFor(sB, 's5').includes('pe_uni_sibling'),
    B_s6_mom: stepsFor(sB, 's6').includes('pe_so2_mom'),
    B_s8_net: stepsFor(sB, 's8').includes('pe_s8_net')
  };
  const bad = Object.entries(check).filter(([k, v]) => !v).map(([k]) => k);
  console.log('个性化剧本断言:', bad.length ? 'FAIL ' + bad.join(',') : '全部通过 (' + Object.keys(check).length + ' 项)');

  // 验证流程真的走过个性化事件
  function runTo(state, targetStageId) {
    const visited = [];
    let guard = 0;
    const targetIdx = JContent.STAGES.findIndex(x => x.id === targetStageId);
    while (guard++ < 300) {
      const stage = JEngine.stageOf(state);
      if (!stage) break;
      if (JContent.STAGES.findIndex(x => x.id === stage.id) > targetIdx) break;
      const step = JEngine.stepOf(state);
      if (!step) { if (!JEngine.advanceStage(state)) break; continue; }
      visited.push(step.id);
      if (step.type === 'text') JEngine.gotoNext(state, step.next);
      else if (step.type === 'choice') { const opt = step.options[0]; JEngine.choose(state, step, opt); JEngine.gotoNext(state, opt.next); }
      else if (step.type === 'dialogue') { JEngine.trackRoadmap(state, step, {}); JStore.applyFx(state, step.fx || {}); if (step.milestone) JStore.addMilestone(state, JEngine.fillTemplate(state, step.milestone)); JEngine.gotoNext(state, step.next); }
      else if (step.type === 'event') { const card = JEngine.handleEvent(state, step); if (card.ending) break; if (card.options && card.options.length) { const opt = card.options[0]; JStore.applyFx(state, opt.fx || {}); if (opt.tag) state.flags[opt.tag] = true; JEngine.gotoNext(state, step.next); } else { JEngine.gotoNext(state, card.next); } }
    }
    return visited;
  }
  const sA2 = JEngine.newGame({ name: 'A2', gender: '男', family: '普通家庭', province: '广东', holland: ['I'], careerId: 'c003',
    familyInfo: { economy: '工薪家庭', fatherJob: '工人', motherJob: '全职妈妈', vibe: '严格管教', expect: '出人头地', onlyChild: '独生子女', middleSchool: '学霸型' } });
  const sB2 = JEngine.newGame({ name: 'B2', gender: '女', family: '普通家庭', province: '广东', holland: ['S'], careerId: 'c070',
    familyInfo: { economy: '富裕家庭', fatherJob: '经商', motherJob: '全职妈妈', vibe: '忙碌少陪伴', expect: '继承家业', onlyChild: '有兄弟姐妹', middleSchool: '特长型' } });
  const visitedA = runTo(sA2, 's3');
  const visitedB = runTo(sB2, 's5');
  const walked = {
    A_walked_ms_top: visitedA.includes('pe_ms_top'),
    A_walked_fam_proud: visitedA.includes('pe_fam_proud'),
    B_walked_ms_talent: visitedB.includes('pe_ms_talent'),
    B_walked_fam_inherit: visitedB.includes('pe_fam_inherit'),
    B_walked_gaokao_tutor: visitedB.includes('pe_gaokao_tutor')
  };
  const badWalk = Object.entries(walked).filter(([k, v]) => !v).map(([k]) => k);
  console.log('流程实际走过个性化事件:', badWalk.length ? 'FAIL ' + badWalk.join(',') : '全部通过 (' + Object.keys(walked).length + ' 项)');

  // 内容扩充断言
  const rich = {
    ach_count: JFeaturesData.ACHIEVEMENTS.length >= 28,
    trait_count: JFeaturesData.TRAITS.length >= 12,
    random_count: JFeaturesData.RANDOM_EVENTS.length >= 20,
    bad_luck: JFeaturesData.RANDOM_EVENTS.filter(e => e.good === 0).length >= 12,
    quest_count: JFeaturesData.FOLK_QUESTS.length >= 9,
    feed_count: Object.values(JFeaturesData.FEED_POSTS).every(arr => arr.length >= 6),
    side_count: JFeaturesData.SIDE_STORIES.length >= 7,
    ending_count: JFeaturesData.ENDING_STYLES.length >= 12
  };
  const badRich = Object.entries(rich).filter(([k, v]) => !v).map(([k]) => k);
  console.log('内容扩充断言:', badRich.length ? 'FAIL ' + badRich.join(',') : '全部通过 (' + Object.keys(rich).length + ' 项)');

  const cases = [
    { id: 'c001', grad: false },
    { id: 'c003', grad: false },
    { id: 'c027', grad: true },
    { id: 'c005', grad: true },
    { id: 'c072', grad: false }
  ];

  for (const tc of cases) {
    const s = JEngine.newGame({ name: '测试', gender: '男', family: '普通家庭', province: '广东', holland: ['I', 'R'], careerId: tc.id });
    let guard = 0;
    const pathLog = [];
    while (!s.ending && guard++ < 300) {
      const stage = JEngine.stageOf(s);
      const step = JEngine.stepOf(s);
      if (!step) {
        const ok = JEngine.advanceStage(s);
        if (!ok) { pathLog.push('NO-NEXT'); break; }
        continue;
      }
      pathLog.push(stage.id + ':' + step.id);
      if (step.type === 'text') {
        JEngine.gotoNext(s, step.next);
      } else if (step.type === 'choice') {
        let opt = step.options[0];
        if (step.id === 's7_5') opt = step.options.find(o => o.tag === (tc.grad ? 'path_grad' : 'path_job')) || step.options[0];
        if (step.id === 's2_5') opt = step.options.find(o => o.tag === 'roadmap_subjects') || step.options[0];
        if (step.id === 's3_1') opt = step.options.find(o => o.tag === 'join_club') || step.options[0];
        if (step.id === 's6_1') opt = step.options.find(o => o.tag === 'competition') || step.options[0];
        if (step.id === 's7_4') opt = step.options.find(o => o.tag === 'intern_active') || step.options[0];
        if (step.id === 's9_4') opt = step.options.find(o => o.tag === 'path_phd') || step.options[0];
        JEngine.choose(s, step, opt);
        JEngine.gotoNext(s, opt.next);
      } else if (step.type === 'dialogue') {
        JEngine.trackRoadmap(s, step, {});
        JStore.applyFx(s, step.fx || {});
        if (step.milestone) JStore.addMilestone(s, JEngine.fillTemplate(s, step.milestone));
        JEngine.gotoNext(s, step.next);
      } else if (step.type === 'event') {
        const card = JEngine.handleEvent(s, step);
        if (card.ending) break;
        if (card.optionHandler === 'volunteer') {
          const opt = card.options[0];
          s.gaokao.majorFit = opt.majorFit || 0; s.gaokao.uniTier = opt.uniTier || 'mid';
          s.gaokao.uniName = opt.text.replace(/·.*/, '').trim() + ' · ' + opt.text.split('· ').pop().trim();
          s.gaokao.admissionText = opt.note;
          if ((opt.majorFit || 0) >= 1) JEngine.roadmapDone(s, '进入目标专业');
          JEngine.gotoNext(s, step.next);
        } else if (card.optionHandler === 'love') {
          const opt = card.options[0]; JStore.applyFx(s, opt.fx || {}); if (opt.tag) s.flags[opt.tag] = true; JEngine.gotoNext(s, opt.next);
        } else if (card.optionHandler === 'interview') {
          const opt = card.options[0]; JStore.applyFx(s, opt.fx || {}); if (opt.tag) s.flags[opt.tag] = true; JEngine.gotoNext(s, opt.next);
        } else if (card.optionHandler === 'grad_result') {
          if (s.flags.gradPass) { JEngine.gotoNext(s, step.next); }
          else {
            const opt = card.options.find(o => o.next === 'adjust') || card.options[0];
            JStore.applyFx(s, opt.fx || {}); if (opt.tag) s.flags[opt.tag] = true;
            s.flags.gradPass = true;
            JEngine.gotoNext(s, step.next);
          }
        } else if (card.optionHandler === 'offer') { break; }
        else if (card.options && card.options.length) {
          const opt = card.options[0]; JStore.applyFx(s, opt.fx || {}); if (opt.tag) s.flags[opt.tag] = true; JEngine.gotoNext(s, opt.next);
        } else {
          JEngine.gotoNext(s, card.next);
        }
      }
      JStore.save(s);
    }
    console.log('\n===== ' + tc.id + ' (grad=' + tc.grad + ') =====');
    console.log('stages:', s.stageDone.join(','));
    console.log('ending:', s.ending ? s.ending.offer + ' @ ' + s.ending.company + ' ' + s.ending.salary + ' | match=' + s.ending.match : 'NONE');
    console.log('roadmap:', s.roadmapDone.length + ' -> ' + s.roadmapDone.join(' | '));
    console.log('attrs:', JSON.stringify(s.attrs));
    if (!s.ending) { console.log('!!! NO ENDING, tail:', pathLog.slice(-10).join(' > ')); process.exitCode = 1; }
  }

  // ===== 融合 P3：AI 扩展职业断言 =====
  const autoOk = {
    auto_count: JContent.AUTO_CAREER_IDS && JContent.AUTO_CAREER_IDS.length >= 20,
    deep_total: JContent.DEEP_CAREER_IDS.length >= 28,
    auto_roadmap: (() => { const rm = JEngine.roadmapOf({ careerId: 'c012' }); return !!(rm && rm.tagline && rm.job && rm.job.firstJob && rm.advanced && rm.college && rm.college[1]); })(),
    auto_cast: (() => { const sX = JEngine.newGame({ name: 'X', gender: '男', family: '普通家庭', province: '广东', holland: ['I'], careerId: 'c012' }); return !!(sX.cast.guide && sX.cast.senior && sX.cast.mentor); })()
  };
  const badAuto = Object.entries(autoOk).filter(([k, v]) => !v).map(([k]) => k);
  console.log('AI 扩展职业断言:', badAuto.length ? 'FAIL ' + badAuto.join(',') : '全部通过 (' + Object.keys(autoOk).length + ' 项)');
  if (badAuto.length) process.exitCode = 1;

  // ===== 融合 P3：AI 路线职业完整跑通（c012）=====
  {
    const s = JEngine.newGame({ name: 'AI跑测', gender: '男', family: '普通家庭', province: '广东', holland: ['I', 'R'], careerId: 'c012' });
    let guard = 0;
    while (!s.ending && guard++ < 300) {
      const stage = JEngine.stageOf(s);
      const step = JEngine.stepOf(s);
      if (!step) { const ok = JEngine.advanceStage(s); if (!ok) break; continue; }
      if (step.type === 'text') JEngine.gotoNext(s, step.next);
      else if (step.type === 'choice') { const opt = step.options[0]; JEngine.choose(s, step, opt); JEngine.gotoNext(s, opt.next); }
      else if (step.type === 'dialogue') { JEngine.trackRoadmap(s, step, {}); JStore.applyFx(s, step.fx || {}); if (step.milestone) JStore.addMilestone(s, JEngine.fillTemplate(s, step.milestone)); JEngine.gotoNext(s, step.next); }
      else if (step.type === 'event') {
        const card = JEngine.handleEvent(s, step);
        if (card.ending) break;
        if (card.optionHandler === 'volunteer') { const opt = card.options[0]; s.gaokao.majorFit = opt.majorFit || 0; s.gaokao.uniTier = opt.uniTier || 'mid'; s.gaokao.uniName = opt.text.replace(/·.*/, '').trim() + ' · ' + opt.text.split('· ').pop().trim(); s.gaokao.admissionText = opt.note; if ((opt.majorFit || 0) >= 1) JEngine.roadmapDone(s, '进入目标专业'); JEngine.gotoNext(s, step.next); }
        else if (card.optionHandler === 'love' || card.optionHandler === 'interview') { const opt = card.options[0]; JStore.applyFx(s, opt.fx || {}); if (opt.tag) s.flags[opt.tag] = true; JEngine.gotoNext(s, opt.next); }
        else if (card.optionHandler === 'grad_result') { if (s.flags.gradPass) JEngine.gotoNext(s, step.next); else { const opt = card.options[0]; JStore.applyFx(s, opt.fx || {}); if (opt.tag) s.flags[opt.tag] = true; s.flags.gradPass = true; JEngine.gotoNext(s, step.next); } }
        else if (card.optionHandler === 'offer') break;
        else if (card.options && card.options.length) { const opt = card.options[0]; JStore.applyFx(s, opt.fx || {}); if (opt.tag) s.flags[opt.tag] = true; JEngine.gotoNext(s, opt.next); }
        else JEngine.gotoNext(s, card.next);
      }
      JStore.save(s);
    }
    console.log('===== c012 (AI 路线) =====');
    console.log('stages:', s.stageDone.join(','));
    console.log('ending:', s.ending ? s.ending.offer + ' @ ' + s.ending.company + ' ' + s.ending.salary + ' | match=' + s.ending.match : 'NONE');
    if (!s.ending) { console.log('!!! AI 路线 NO ENDING'); process.exitCode = 1; }
  }

}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
