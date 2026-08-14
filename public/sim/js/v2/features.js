/* 我的模拟人生路 · 功能逻辑：成就 / 人生点 / 天赋 / 自由活动 / 手机 / 支线 / 分析 / 曲线 / 海报 */
window.JFeatures = (() => {
  'use strict';
  const META_KEY = 'msrl_v2_meta';
  const FD = () => JFeaturesData;

  /* ---------- 全局 meta（跨周目） ---------- */
  function readMeta() {
    try {
      const raw = localStorage.getItem(META_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { points: 0, achievements: [], endings: [], traits: [] };
  }
  function writeMeta(m) { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) {} }

  /* ---------- 成就 ---------- */
  function checkAchievements(s) {
    const m = readMeta();
    const fresh = [];
    (FD().ACHIEVEMENTS || []).forEach(a => {
      if (!m.achievements.includes(a.id) && a.cond(s)) {
        m.achievements.push(a.id);
        fresh.push(a);
      }
    });
    if (fresh.length) writeMeta(m);
    return fresh;
  }

  /* ---------- 人生点（通关结算） ---------- */
  function grantLifePoints(s) {
    const m = readMeta();
    const ach = (m.achievements || []).length;
    const roadmap = (s.roadmapDone || []).length;
    const match = s.ending ? (s.ending.match || 50) : 50;
    const pts = ach * 3 + roadmap * 2 + Math.round(match / 10);
    m.points = (m.points || 0) + pts;
    if (s.ending) {
      const st = endingStyle(s);
      if (st && !m.endings.includes(st.key)) m.endings.push(st.key);
    }
    writeMeta(m);
    return pts;
  }

  /* ---------- 天赋 ---------- */
  function applyTraits(s, traitIds) {
    const all = FD().TRAITS || [];
    (traitIds || []).forEach(id => {
      const t = all.find(x => x.id === id);
      if (t && t.fx) {
        for (const k of Object.keys(t.fx)) s.attrs[k] = JStore.clamp(s.attrs[k] + t.fx[k]);
      }
    });
  }
  function rollTraitCandidates() {
    const all = (FD().TRAITS || []).slice();
    // 洗牌取 2
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, 2);
  }
  function spendPoints(cost) {
    const m = readMeta();
    if ((m.points || 0) < cost) return false;
    m.points -= cost;
    writeMeta(m);
    return true;
  }

  /* ---------- 自由活动 ---------- */
  const FREE_ACTIONS = [
    { key: 'study', icon: '📚', name: '泡图书馆', desc: '安安静静学一下午', fx: { study: 3, mood: -1 }, text: '你在图书馆泡了一下午，刷完了一整套题。' },
    { key: 'club', icon: '🎨', name: '社团活动', desc: '和伙伴们一起做点喜欢的事', fx: { ability: 2, social: 1 }, text: '社团活动让你认识了不少人，也练了手。' },
    { key: 'work', icon: '💼', name: '兼职打工', desc: '赚点生活费，提前体验社会', fx: { money: 6, study: -1 }, text: '你做了半天兼职，拿到工资时手都是酸的。' },
    { key: 'social', icon: '🤝', name: '和朋友聊天', desc: '维系一下重要的关系', fx: { social: 3, mood: 1 }, text: '和朋友聊了很久，很多烦恼都散了。' },
    { key: 'rest', icon: '😴', name: '好好休息', desc: '睡一觉，满血复活', fx: { health: 3, mood: 2 }, text: '你早早上床，睡了个好觉。' },
    { key: 'gym', icon: '⚽', name: '运动锻炼', desc: '跑跑步出出汗，身体是革命的本钱', fx: { health: 3, mood: 1 }, text: '你在操场/健身房出了一身汗，神清气爽。' },
    { key: 'hobby', icon: '🎸', name: '练练特长', desc: '把爱好捡起来，它是你的充电站', fx: { ability: 2, mood: 1 }, text: '你练了一会儿喜欢的特长，时间过得飞快。' },
    { key: 'family', icon: '📞', name: '陪陪家人', desc: '和爸妈聊聊近况，家是永远的港湾', fx: { social: 2, mood: 1 }, text: '和爸妈聊了一会儿，心里踏实多了。' }
  ];
  function doFreeAction(s, key) {
    const a = FREE_ACTIONS.find(x => x.key === key);
    if (!a || (s.freePoints || 0) <= 0) return null;
    s.freePoints -= 1;
    s.freeUsed = (s.freeUsed || 0) + 1;
    const logs = JStore.applyFx(s, a.fx);
    JStore.addMilestone(s, a.text.slice(0, 20));
    JStore.save(s);
    return { logs, text: a.text };
  }

  /* ---------- 朋友圈 ---------- */
  function eraOf(s) {
    const id = JEngine.stageOf(s) ? JEngine.stageOf(s).id : 's1';
    if (['s1', 's2', 's3', 's4'].includes(id)) return 'hs';
    if (['s5', 's6', 's7', 's8', 's8b'].includes(id)) return 'uni';
    return 'work';
  }
  function feedFor(s) {
    const era = eraOf(s);
    return (FD().FEED_POSTS || {})[era] || [];
  }
  function likeFeed(s, idx) {
    s.feedLiked = s.feedLiked || [];
    if (s.feedLiked.includes(idx)) return null;
    s.feedLiked.push(idx);
    const logs = JStore.applyFx(s, { social: 1 });
    JStore.save(s);
    return logs;
  }
  function commentFeed(s, idx, text) {
    s.feedComments = s.feedComments || [];
    if (s.feedComments.includes(idx)) return null;
    s.feedComments.push(idx);
    const logs = JStore.applyFx(s, { mood: 1 });
    JStore.addMilestone(s, '你在朋友圈评论：' + String(text || '').slice(0, 12));
    JStore.save(s);
    return logs;
  }

  /* ---------- 路人支线 ---------- */
  function questFor(folk) {
    const q = (FD().FOLK_QUESTS || []).find(x => x.role === (folk && folk.role));
    return q || null;
  }
  function doFolkQuest(s, folk) {
    const q = questFor(folk);
    if (!q) return null;
    s.flags.folk_quest_done = true;
    const logs = JStore.applyFx(s, q.fx);
    JStore.addMilestone(s, q.title + '：' + q.reward);
    JStore.save(s);
    return { q, logs };
  }

  /* ---------- 家庭影响分析 ---------- */
  function familyAnalysis(s) {
    const fi = s.prot.familyInfo || {};
    const dad = JStore.intimacy(s, 'father');
    const mom = JStore.intimacy(s, 'mother');
    const famEvents = (s.milestones || []).filter(m => /家|爸|妈/.test(m.text)).length;
    const support = Math.round((dad + mom) / 2 / 10);
    const eco = { '工薪家庭': 6, '小康家庭': 8, '富裕家庭': 10 }[fi.economy] || 6;
    let pressure = 0;
    if (fi.vibe === '严格管教') pressure += 4;
    if (fi.expect === '出人头地' || fi.expect === '继承家业') pressure += 3;
    const help = Math.min(10, eco);
    const only = fi.onlyChild === '独生子女';
    const vibeTxt = { '严格管教': '严管出高徒，但也要小心高压', '开明民主': '开明的家庭氛围让你敢于做自己', '放养自由': '放养式家庭给了你自由，也考验自律', '忙碌少陪伴': '爸妈很忙，陪伴少，但爱不少' }[fi.vibe] || '';
    const expectTxt = { '稳定踏实': '家里最看重安稳，而你的人生剧本证明：安稳也可以是奋斗出来的', '出人头地': '家里盼你出人头地——压力是燃料，也可能是负担', '平安快乐': '家里只要你好好的，这本身就很珍贵', '继承家业': '家里的担子曾想交给你，而你用行动回答了', '尊重我的选择': '家里给了你最大的自由，这是很多人求不来的礼物' }[fi.expect] || '';
    const lines = [];
    lines.push(support >= 6 ? '🏠 家庭支持度较高：你经常和爸妈沟通，家庭是你坚实的后盾。' : '🏠 你和爸妈的交流不多，家更像一个安静的港湾。');
    lines.push(pressure >= 4 ? '🎯 家庭压力不小：严格的期望让你走得快，也让你偶尔喘不过气。' : '🎯 家庭压力适中：爸妈给了你空间，让你能按自己的节奏成长。');
    lines.push(help >= 8 ? '💰 家庭资源充足：经济上的支持让你少了很多后顾之忧。' : '💰 家庭资源有限：你更早学会了独立和精打细算。');
    if (vibeTxt) lines.push('🌿 ' + vibeTxt + '。');
    if (expectTxt) lines.push('🎏 ' + expectTxt + '。');
    if (only) lines.push('🌱 独生子女的你，从小就习惯了独自面对很多事。');
    else lines.push('👥 有兄弟姐妹的你，从小学会了分享和担当。');
    if (famEvents >= 2) lines.push('👨‍👩‍👧 这一路，家里和你一起做了不少重要决定。');
    if (s.flags && (s.flags.fam_insist || s.flags.insist_career)) lines.push('⚖️ 你曾在家庭期望和自己的梦想之间挣扎，最终选择了自己——这需要勇气。');
    return { support, pressure, help, lines, dad, mom };
  }

  /* ---------- 多结局 ---------- */
  function endingStyle(s) {
    const styles = FD().ENDING_STYLES || [];
    return styles.find(x => x.test(s)) || styles[styles.length - 1];
  }

  /* ---------- 属性曲线（canvas 折线） ---------- */
  function drawLifeCurve(canvas, s) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const hist = s.attrsHistory || [];
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#faf9f6';
    ctx.fillRect(0, 0, W, H);
    if (hist.length < 2) {
      ctx.fillStyle = '#8a8a96';
      ctx.font = '13px sans-serif';
      ctx.fillText('（属性历史还在积累中，通关后查看完整曲线）', 20, H / 2);
      return;
    }
    const keys = ['study', 'ability', 'social', 'mood'];
    const colors = { study: '#5c7cfa', ability: '#12b886', social: '#7048e8', mood: '#fab005' };
    const pad = 28;
    const max = 100, min = 0;
    const x = i => pad + (W - pad * 2) * (i / (hist.length - 1));
    const y = v => H - pad - (H - pad * 2) * (Math.max(0, Math.min(100, v)) / 100);
    // 网格
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const gy = pad + (H - pad * 2) * (g / 4);
      ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(W - pad, gy); ctx.stroke();
      ctx.fillStyle = '#8a8a96';
      ctx.font = '10px sans-serif';
      ctx.fillText(String(100 - g * 25), 4, gy + 3);
    }
    keys.forEach(k => {
      ctx.strokeStyle = colors[k];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      hist.forEach((h, i) => {
        const px = x(i), py = y(h[k] || 0);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
      // 图例
      const li = keys.indexOf(k);
      ctx.fillStyle = colors[k];
      ctx.fillRect(W - pad - 120 + li * 34, 8, 10, 10);
      ctx.fillStyle = '#555';
      ctx.font = '10px sans-serif';
      ctx.fillText({ study: '学业', ability: '能力', social: '人脉', mood: '心态' }[k], W - pad - 108 + li * 34, 17);
    });
    // 阶段标签
    ctx.fillStyle = '#8a8a96';
    ctx.font = '10px sans-serif';
    ctx.fillText('起点', pad - 14, H - 10);
    ctx.fillText('终点', W - pad - 14, H - 10);
  }

  /* ---------- 分享海报（canvas 人生卡片） ---------- */
  function drawPoster(canvas, s, cb) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const e = s.ending || {};
    const career = JEngine.careerOf(s);
    const st = endingStyle(s);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1b2a5e');
    grad.addColorStop(0.5, '#2a3f85');
    grad.addColorStop(1, '#1a2a5e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // 星星
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`;
      ctx.beginPath();
      ctx.arc(Math.random() * W, Math.random() * H * 0.6, Math.random() * 1.6, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd76e';
    ctx.font = '800 30px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🌇 我的模拟人生路', W / 2, 56);
    ctx.font = '600 22px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText((career ? career.name : '我的职业') + ' · ' + (st ? st.title : '第一份工作'), W / 2, 96);
    // 头像
    const av = new Image();
    const avObj = { id: 'v2_player', name: s.prot.name, gender: s.prot.gender, age: 20, role: 'worker', emoji: '🧑‍🎓', career: null };
    av.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, 178, 52, 0, 7);
      ctx.clip();
      ctx.drawImage(av, W / 2 - 52, 126, 104, 104);
      ctx.restore();
      ctx.strokeStyle = '#ffd76e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(W / 2, 178, 52, 0, 7);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '600 18px sans-serif';
      ctx.fillText(s.prot.name, W / 2, 250);
      // offer
      ctx.fillStyle = '#ffd76e';
      ctx.font = '600 20px sans-serif';
      ctx.fillText(e.offer || '第一份工作', W / 2, 300);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.font = '15px sans-serif';
      ctx.fillText((e.company || '') + ' · ' + (e.salary || ''), W / 2, 328);
      // 匹配度
      ctx.fillStyle = '#fff';
      ctx.font = '600 16px sans-serif';
      ctx.fillText('职业匹配度 ' + (e.match || 50) + '%', W / 2, 372);
      // 成就
      const m = readMeta();
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.font = '13px sans-serif';
      ctx.fillText('已收集徽章 ' + (m.achievements || []).length + ' 枚 · 人生点 ' + (m.points || 0), W / 2, 406);
      ctx.fillText('从高一到第一份工作，欢迎你也来试试', W / 2, 436);
      if (cb) cb();
    };
    av.src = AvatarSvg.avatarDataUri(avObj, 208, 'happy');
  }

  return {
    readMeta, writeMeta, checkAchievements, grantLifePoints,
    applyTraits, rollTraitCandidates, spendPoints,
    FREE_ACTIONS, doFreeAction, feedFor, likeFeed,
    questFor, doFolkQuest, familyAnalysis, endingStyle,
    drawLifeCurve, drawPoster, eraOf
  };
})();
