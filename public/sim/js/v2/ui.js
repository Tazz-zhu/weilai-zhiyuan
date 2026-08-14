/* 我的模拟人生路 v3 · UI：地图场景交互 / 任务引导 / 原神式对话 / 弹窗 */
window.JUI = (() => {
  'use strict';

  let s = null;
  let LIB = null;
  let currentChat = null;
  let llm = { enabled: false, model: '' };
  let tickTimer = null;
  let fakeClock = { h: 8, m: 0 };
  let profileSeed = null;   // 未来致远四维测评画像（兴趣/性格/能力/价值观）
  function setProfileSeed(result) { profileSeed = result || null; }

  const $ = id => document.getElementById(id);

  /* ---------- 初始化 ---------- */
  function init(state, lib) {
    s = state; LIB = lib;
    window.__v2Lib = lib;
    const ba0 = $('btnAchievements');
    if (ba0) ba0.addEventListener('click', () => openAchievements());
    const bf0 = $('btnFeed');
    if (bf0) bf0.addEventListener('click', () => openFeed());
    JDialogue.checkLlm().then(r => { llm = r; renderTopbar(); });
    startTicker();
    if (!s || !s.careerId) { openNewGame(); return; }
    if (s.ending) { openReport(); return; }
    bindScene();
    renderAll();
  }

  function startTicker() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      fakeClock.m += 6;
      if (fakeClock.m >= 60) { fakeClock.m = 0; fakeClock.h = (fakeClock.h + 1) % 24; }
      const el = $('clock');
      if (el) el.textContent = '🕐 ' + String(fakeClock.h).padStart(2, '0') + ':' + String(fakeClock.m).padStart(2, '0');
    }, 3000);
  }

  /* ---------- 场景交互绑定（一次） ---------- */
  function bindScene() {
    JScene.onInteract(key => {
      const step = JEngine.stepOf(s);
      const isObj = step && step.type === 'dialogue' && step.target === key;
      if (isObj) {
        const d = JEngine.prepareStep(s, step);
        openChat(key, { step, auto: d.auto, onDone: () => finishDialogue(step) });
      } else if (key && key.startsWith('folk_')) {
        const fid = key.slice(5);
        if (typeof JScene !== 'undefined' && JScene.questFolkId && JScene.questFolkId() === fid && typeof JFeatures !== 'undefined') {
          openFolkQuest(fid);
        } else {
          openChat(key);
        }
      } else {
        openChat(key);
      }
    });
    JScene.onSpotReach(() => {
      const step = JEngine.stepOf(s);
      if (step && step.type === 'event') {
        const card = JEngine.handleEvent(s, step);
        showEventPopup(step, card);
      }
    });
  }

  /* ---------- 顶栏 & 时间线 ---------- */
  function renderTopbar() {
    const feedBtn = $('btnFeed');
    if (feedBtn && s) {
      const era = (typeof JFeatures !== 'undefined' && JFeatures.eraOf) ? JFeatures.eraOf(s) : 'hs';
      feedBtn.classList.toggle('hidden', era === 'hs');
      if (era !== 'hs' && s.feedUnread === undefined) s.feedUnread = 2;
      const dot = $('feedDot');
      if (dot) dot.classList.toggle('hidden', !(s.feedUnread > 0));
    }
    const badge = $('llmBadge');
    if (badge) badge.textContent = llm.enabled ? '✨ 大模型已接入' : '🧠 模拟大脑';
    const chip = $('careerChip');
    if (chip && s) {
      const c = JEngine.careerOf(s);
      chip.innerHTML = c ? ('🎯 ' + c.name + ' <span class="sub">（可更换）</span>') : '🎯 未选择职业';
    }
    renderTimeline();
  }

  function renderTimeline() {
    const tl = $('timeline');
    if (!tl || !s) return;
    const stages = JContent.STAGES;
    const cur = JEngine.stageOf(s);
    const done = s.stageDone || [];
    tl.innerHTML = stages.map(st => {
      const cls = [];
      if (done.includes(st.id)) cls.push('done');
      if (cur && cur.id === st.id) cls.push('current');
      if (st.id === 's8b' || st.id === 's9') cls.push('branch');
      return `<span class="tl-node ${cls.join(' ')}" title="${st.name}">${st.icon}</span>`;
    }).join('<span class="tl-sep"></span>');
  }

  /* ---------- 主渲染 ---------- */
  function renderAll() {
    try {
      const fresh = (typeof JFeatures !== 'undefined' && JFeatures.checkAchievements) ? JFeatures.checkAchievements(s) : [];
      fresh.forEach(a => toast(a.icon + ' 成就解锁：' + a.name));
    } catch (e) {}
    renderTopbar();
    renderCast();
    renderAttrs();
    renderRoadmap();
    renderQuest();
    renderCenter();
  }

  function renderCast() {
    const box = $('castList');
    if (!box || !s) return;
    const order = s.castOrder || [];
    const items = order.map(key => s.cast[key]).filter(Boolean).filter(ch => ch.appeared !== false);
    box.innerHTML = items.map(ch => {
      const tierBadge = ch.tier === 1 ? '<span class="tier t1">重要</span>' : ch.tier === 2 ? '<span class="tier t2">常驻</span>' : '';
      const int = JStore.intimacy(s, ch.key);
      const avatar = AvatarSvg ? AvatarSvg.avatarDataUri(avatarNpc(ch), 72, 'happy') : '';
      const rel = s.loverKey === ch.key ? '<span class="rel">💛 恋人</span>' : '';
      return `<div class="cast-item" data-key="${ch.key}">
        <img class="avatar" src="${avatar}" alt="">
        <div class="ci-info">
          <div class="ci-name">${ch.name} ${tierBadge} ${rel}</div>
          <div class="ci-role">${ch.role}</div>
          <div class="ci-int"><div class="int-bar"><i style="width:${int}%"></i></div><span>${int}</span></div>
        </div>
      </div>`;
    }).join('') || '<div class="empty">还没有认识的人</div>';
    box.querySelectorAll('.cast-item').forEach(el => {
      el.addEventListener('click', () => openChat(el.dataset.key));
    });
  }

  function avatarNpc(ch) {
    const career = ch.careerId ? LIB.careers.find(c => c.id === ch.careerId) : null;
    return { id: 'v2_' + ch.key, name: ch.name, gender: ch.gender, age: ch.age || 20, role: 'worker', emoji: ch.emoji || '🙂', career };
  }

  function renderAttrs() {
    const box = $('attrsPanel');
    if (!box || !s) return;
    box.innerHTML = '<div class="panel-title">📊 属性</div>' + JStore.ATTR_DEFS.map(a => {
      const v = s.attrs[a.key] || 0;
      return `<div class="attr-row">
        <span class="attr-ico">${a.icon}</span>
        <span class="attr-name">${a.label}</span>
        <div class="attr-track"><i style="width:${v}%"></i></div>
        <span class="attr-val">${v}</span>
      </div>`;
    }).join('');
  }

  function renderRoadmap() {
    const box = $('roadmapPanel');
    if (!box || !s) return;
    const rm = JEngine.roadmapOf(s);
    const stage = JEngine.stageOf(s);
    if (!rm) { box.innerHTML = '<div class="panel-title">🧭 职业路线图</div><div class="empty">选择职业后可见</div>'; return; }
    const stageMap = {
      s1: { label: '高一 · 认识职业', items: ['认识职业引路人', '说出职业方向'] },
      s2: { label: '高一 · 选科', items: ['按目标职业路线选科'] },
      s3: { label: '高二 · 深耕', items: ['参加相关社团/活动', '了解职业真相'] },
      s4: { label: '高三 · 高考', items: ['高考过线', '进入目标专业'] },
      s5: { label: '大一 · 适应', items: ['大一绩点稳'] },
      s6: { label: '大二 · 方向', items: ['大二积累竞赛/证书/科研', '结识行业前辈'] },
      s7: { label: '大三 · 实习', items: ['完成实习', '实习表现受认可'] },
      s8: { label: '大四 · 求职', items: ['拿到第一份工作 offer'] },
      s8b: { label: '大四 · 考研', items: ['考研上岸'] },
      s9: { label: '研究生', items: ['研究生学业推进', '读博深造'] }
    };
    const info = stageMap[stage ? stage.id : ''] || { label: stage ? stage.name : '', items: [] };
    const totalNodes = [];
    Object.values(stageMap).forEach(v => v.items.forEach(i => totalNodes.push(i)));
    const doneCount = totalNodes.filter(i => s.roadmapDone.includes(i)).length;
    const pct = Math.round(doneCount / totalNodes.length * 100);
    box.innerHTML = `
      <div class="panel-title">🧭 职业路线图</div>
      <div class="rm-tagline">${rm.tagline}</div>
      <div class="rm-progress"><div class="rp-track"><i style="width:${pct}%"></i></div><span>${doneCount}/${totalNodes.length}</span></div>
      <div class="rm-stage">
        <div class="rm-stage-label">📍 当前 · ${info.label}</div>
        ${info.items.map(i => {
          const done = s.roadmapDone.includes(i);
          return `<div class="rm-item ${done ? 'done' : ''}">${done ? '✅' : '⬜'} ${i}</div>`;
        }).join('')}
      </div>
      <details class="rm-more"><summary>查看完整路线</summary>
        <div class="rm-full">
          <div class="rm-sec"><b>高中</b>${rm.hsFocus}<br>${rm.hsActions.map(a => '· ' + a).join('<br>')}</div>
          <div class="rm-sec"><b>专业</b>${rm.majors.map(m => '· ' + JEngine.majorName(m)).join('<br>')}<br>${rm.majorNote}</div>
          <div class="rm-sec"><b>大学四年</b>${[1, 2, 3, 4].map(y => '· 大' + '一二三四'[y - 1] + '：' + rm.college[y].join('；')).join('<br>')}</div>
          <div class="rm-sec"><b>深造</b>${rm.advanced.why}</div>
          <div class="rm-sec"><b>求职</b>${rm.job.path}｜第一份工作：${rm.job.firstJob}</div>
        </div>
      </details>`;
  }
  /* ---------- 中央：场景 + 步骤呈现 ---------- */
  function renderCenter() {
    const wrap = $('sceneWrap');
    if (!s || !wrap) return;
    const stage = JEngine.stageOf(s);
    if (!stage) { return; }
    // 场景生命周期
    if (!wrap.dataset.inited) {
      JScene.init(s, wrap);
      wrap.dataset.inited = '1';
      wrap.dataset.map = JScene.sceneOf().id;
      wrap.dataset.stage = stage.id;
    } else {
      const mapId = JScene.sceneOf().id;
      if (wrap.dataset.map !== mapId) {
        wrap.dataset.map = mapId;
        JScene.fitMap();
        JScene.spawnPlayer();
        JScene.sync();
        JScene.showRegionBanner(JScene.sceneOf().name);
      } else if (wrap.dataset.stage !== stage.id) {
        JScene.sync();
      }
      wrap.dataset.stage = stage.id;
    }
    const step = JEngine.stepOf(s);
    if (!step) { openStageSummary(stage); return; }
    presentCurrentStep(step);
  }

  function presentCurrentStep(step) {
    const d = JEngine.prepareStep(s, step);
    if (!d) return;
    if (d.type === 'text' || d.type === 'choice') {
      showStoryPopup(step, d);
      return;
    }
    if (d.type === 'dialogue') {
      const ch = s.cast[step.target];
      JScene.setObjective({ label: '去找 <b>' + (ch ? ch.name : 'TA') + '</b> 聊聊', target: { type: 'npc', key: step.target } });
      renderQuest();
      return;
    }
    if (d.type === 'event') {
      const stage = JEngine.stageOf(s);
      const spots = JContent.STAGE_SPOTS[stage ? stage.id : ''] || {};
      const sp = (spots.events || {})[step.id];
      if (sp) {
        JScene.setObjective({ label: '前往：' + step.title, target: { type: 'spot', x: sp.x, y: sp.y } });
        renderQuest();
      } else {
        const card = JEngine.handleEvent(s, step);
        showEventPopup(step, card);
      }
      return;
    }
  }

  /* ---------- 任务引导 ---------- */
  function renderQuest() {
    const stage = JEngine.stageOf(s);
    const qb = $('questBar');
    if (qb && stage) {
      const step = JEngine.stepOf(s);
      let label = '阶段剧情';
      if (step) {
        const d = JEngine.prepareStep(s, step);
        if (d) {
          if (d.type === 'text') label = '📖 ' + d.title;
          else if (d.type === 'choice') label = '🧭 ' + d.title + '（做出选择）';
          else if (d.type === 'dialogue') label = '💬 去找 ' + (s.cast[step.target] ? s.cast[step.target].name : 'TA') + ' 聊聊';
          else label = '📍 ' + d.title;
        }
      }
      qb.innerHTML = `<span class="q-stage">${stage.icon} ${stage.name}</span><span class="q-obj">${label}</span><button class="btn sm teleport" id="btnTeleport">🚀 前往目标</button><button class="btn sm gold" id="btnFreeAct">🎮 自由活动（${s.freePoints || 0}）</button>`;
      const tp = $('btnTeleport');
      if (tp) tp.addEventListener('click', () => { if (window.JScene) JScene.teleportToObjective(); });
      const fa = $('btnFreeAct');
      if (fa) fa.addEventListener('click', () => openFreeAct());
    }
    // 左侧任务面板
    const qp = $('questPanel');
    if (!qp || !stage) return;
    const cur = JEngine.stepIndex;
    const steps = JEngine.stageSteps(s) || [];
    const rows = steps.map((st, i) => {
      const done = i < cur;
      const active = i === cur;
      let label = st.title;
      if (st.type === 'dialogue') label = '和 ' + (s.cast[st.target] ? s.cast[st.target].name : 'TA') + ' 聊聊';
      else if (st.type === 'event') label = st.title;
      else if (st.type === 'text') label = st.title;
      const cls = done ? 'done' : active ? 'active' : '';
      return `<div class="q-item ${cls}">${done ? '✅' : active ? '🔶' : '⬜'} ${label}</div>`;
    }).join('');
    qp.innerHTML = `<div class="panel-title">🗒️ 任务</div><div class="q-list">${rows || '<div class="empty">暂无</div>'}</div>`;
  }

  /* ---------- 剧情弹窗（text / choice） ---------- */
  function showStoryPopup(step, d) {
    if (d.type === 'choice') {
      openModal(`
        <h2>${d.title}</h2>
        <p class="step-desc">${d.desc}</p>
        <div class="options">${d.options.map((o, i) => `<button class="btn option" data-i="${i}">${o.text}</button>`).join('')}</div>`, { lock: true });
      document.querySelectorAll('#modalRoot .option').forEach(b => b.addEventListener('click', () => onChoice(step, d.options[+b.dataset.i])));
      return;
    }
    openModal(`
      <h2>${d.title}</h2>
      <p class="step-desc">${d.desc}</p>
      <button class="btn primary" id="btnContinue">继续 ➜</button>`, { lock: true });
    $('btnContinue').addEventListener('click', () => { JEngine.gotoNext(s, step.next); JStore.save(s); closeModal(); renderAll(); });
  }

  /* ---------- 事件弹窗 ---------- */
  function showEventPopup(step, card) {
    card = { ...card, desc: JEngine.fillTemplate(s, card.desc), options: (card.options || []).map(o => ({ ...o, text: JEngine.fillTemplate(s, o.text) })) };
    const stats = (card.logs || []).map(l => `<span class="stat ${l.delta > 0 ? 'up' : 'down'}">${JStore.ATTR_DEFS.find(a => a.key === l.key)?.icon || ''}${l.delta > 0 ? '+' : ''}${l.delta}</span>`).join('');
    const opts = (card.options || []).map((o, i) => `<button class="btn option" data-i="${i}">${o.text}</button>`).join('');
    const isFinal = !!card.ending;
    openModal(`, { lock: true })
      <h2>${card.title}</h2>
      <p class="step-desc">${card.desc}</p>
      ${stats ? `<div class="stat-row">${stats}</div>` : ''}
      ${opts ? `<div class="options">${opts}</div>` : (isFinal ? `<button class="btn primary" id="btnReport">📋 查看人生复盘报告</button>` : `<button class="btn primary" id="btnContinue">继续 ➜</button>`)}`);
    if (opts) {
      document.querySelectorAll('#modalRoot .option').forEach(b => b.addEventListener('click', () => onEventOption(step, card, card.options[+b.dataset.i])));
    } else if (isFinal) {
      $('btnReport').addEventListener('click', () => openReport());
    } else {
      $('btnContinue').addEventListener('click', () => { JEngine.gotoNext(s, step.next); JStore.save(s); closeModal(); renderAll(); });
    }
  }

  /* ---------- 选择处理 ---------- */
  function onChoice(step, opt) {
    const logs = JEngine.choose(s, step, opt);
    openModal(`
      <h2>${opt.text}</h2>
      <p class="step-desc">${opt.note || ''}</p>
      <div class="stat-row">${logs.map(l => `<span class="stat ${l.delta > 0 ? 'up' : 'down'}">${JStore.ATTR_DEFS.find(a => a.key === l.key)?.icon || ''}${l.delta > 0 ? '+' : ''}${l.delta}</span>`).join('')}</div>
      <button class="btn primary" id="btnNext">继续 ➜</button>`, { lock: true });
    $('btnNext').addEventListener('click', () => { JEngine.gotoNext(s, opt.next); JStore.save(s); closeModal(); renderAll(); });
  }

  function onEventOption(step, card, opt) {
    const h = card.optionHandler;
    if (h === 'volunteer') return onVolunteer(step, card, opt);
    if (h === 'love') return onLove(step, card, opt);
    if (h === 'interview') return onInterview(step, card, opt);
    if (h === 'grad_result') return onGradResult(step, card, opt);
    if (h === 'offer') { openReport(); return; }
    const logs = JStore.applyFx(s, opt.fx || {});
    if (opt.tag) s.flags[opt.tag] = true;
    if (opt.note) JStore.addMilestone(s, opt.note);
    JStore.save(s);
    showChoiceNote(opt, logs, () => { JEngine.gotoNext(s, opt.next); closeModal(); renderAll(); });
  }

  function onVolunteer(step, card, opt) {
    if (opt.tag === 'vol_retry' || opt.tag === 'vol_retry2') {
      s.flags.gaokaoRetry = true;
      s.gaokao.score += 60;
      JStore.addMilestone(s, '你选择复读一年');
      JStore.save(s);
      const again = JEngine.handleEvent(s, step);
      showEventPopup(step, again);
      return;
    }
    s.gaokao.majorFit = opt.majorFit || 0;
    s.gaokao.uniTier = opt.uniTier || 'mid';
    const majorName = opt.text.split('· ').pop().trim();
    s.gaokao.uniName = opt.text.replace(/·.*/, '').trim() + ' · ' + majorName;
    s.gaokao.admissionText = opt.note;
    if ((opt.majorFit || 0) >= 1) JEngine.roadmapDone(s, '进入目标专业');
    JStore.addMilestone(s, '录取：' + s.gaokao.uniName);
    JStore.save(s);
    showChoiceNote(opt, [], () => { JEngine.gotoNext(s, step.next); closeModal(); renderAll(); });
  }

  function onLove(step, card, opt) {
    const logs = JStore.applyFx(s, opt.fx || {});
    if (opt.tag) s.flags[opt.tag] = true;
    if (opt.note) JStore.addMilestone(s, opt.note);
    if (opt.tag === 'love_yes') {
      JStore.addMilestone(s, '大学恋爱：和' + s.cast.lover.name + '在一起了');
      JStore.addIntimacy(s, 'lover', 20);
    }
    JStore.save(s);
    showChoiceNote(opt, logs, () => { JEngine.gotoNext(s, opt.next); closeModal(); renderAll(); });
  }

  function onInterview(step, card, opt) {
    const logs = JStore.applyFx(s, opt.fx || {});
    if (opt.tag) s.flags[opt.tag] = true;
    if (opt.note) JStore.addMilestone(s, opt.note);
    JStore.save(s);
    showChoiceNote(opt, logs, () => { JEngine.gotoNext(s, opt.next); closeModal(); renderAll(); });
  }

  function onGradResult(step, card, opt) {
    const logs = JStore.applyFx(s, opt.fx || {});
    if (opt.tag) s.flags[opt.tag] = true;
    if (opt.note) JStore.addMilestone(s, opt.note);
    JStore.save(s);
    if (opt.next === 'retry') {
      s.flags.gradRetry = true;
      JStore.save(s);
      const idx = JEngine.stageSteps(s).findIndex(x => x.id === 's8b_2');
      if (idx >= 0) s.stepIndex = idx;
      const again = JEngine.handleEvent(s, st.steps[idx]);
      closeModal();
      showEventPopup(st.steps[idx], again);
      return;
    }
    if (opt.next === 'adjust') {
      s.flags.gradPass = true;
      JStore.addMilestone(s, '调剂到普通院校读研');
      JEngine.roadmapDone(s, '考研上岸');
      JStore.save(s);
      JEngine.gotoNext(s, step.next);
      closeModal(); renderAll();
      return;
    }
    if (opt.next === 'job') {
      s.flags.gradFailedJob = true;
      JStore.save(s);
      const idx = JContent.STAGES.findIndex(x => x.id === 's8');
      s.stageIndex = idx; s.stepIndex = 0; s.stageClock = { day: 1, slot: 0 };
      closeModal(); renderAll();
      return;
    }
  }

  function showChoiceNote(opt, logs, next) {
    openModal(`
      <h2>${opt.text}</h2>
      <p class="step-desc">${opt.note || ''}</p>
      <div class="stat-row">${logs.map(l => `<span class="stat ${l.delta > 0 ? 'up' : 'down'}">${JStore.ATTR_DEFS.find(a => a.key === l.key)?.icon || ''}${l.delta > 0 ? '+' : ''}${l.delta}</span>`).join('')}</div>
      <button class="btn primary" id="btnNext">继续 ➜</button>`, { lock: true });
    $('btnNext').addEventListener('click', next);
  }

  function finishDialogue(step) {
    const logs = JStore.applyFx(s, step.fx || {});
    if (step.milestone) JStore.addMilestone(s, JEngine.fillTemplate(s, step.milestone));
    JEngine.trackRoadmap(s, step, {});
    JStore.save(s);
    if (logs.length) toast(logs.map(l => `${JStore.ATTR_DEFS.find(a => a.key === l.key)?.icon || ''}${l.delta > 0 ? '+' : ''}${l.delta}`).join(' '));
    JEngine.gotoNext(s, step.next);
    JStore.save(s);
    renderAll();
  }

  /* ---------- 原神式剧情对话（底部） ---------- */
  function openChat(key, opts) {
    let ch = s.cast[key];
    if (!ch && key && key.startsWith('folk_')) ch = JScene.folkAsChar(key.slice(5));
    if (!ch) return;
    currentChat = { key, step: opts ? opts.step : null, onDone: opts ? opts.onDone : null, auto: opts ? opts.auto : '' };
    currentChat = { key, step: opts ? opts.step : null, onDone: opts ? opts.onDone : null, auto: opts ? opts.auto : '' };
    const ov = $('chatOverlay');
    ov.classList.remove('hidden');
    const topics = ch.topics || [];
    const chips = topics.map(t => `<button class="chip" data-t="${t}">${JEngine.TOPIC_LABEL[t] || t}</button>`).join('');
    ov.innerHTML = `
      <div class="gs-actor">
        <div class="gs-portrait act-talk" id="gsPortrait"><img src="${AvatarSvg.avatarDataUri(portraitObj(ch), 170, 'happy')}"><div class="gs-mood" id="gsMood"></div></div>
        <div class="gs-name" id="gsName">${ch.name}</div>
        <div class="gs-role" id="gsRole">${ch.role}</div>
      </div>
      <div class="gs-body">
        <div class="gs-action" id="gsAction"></div>
        <div class="gs-line" id="gsLine"></div>
        <div class="gs-topics">${chips}</div>
        <div class="gs-inputrow">
          <input id="chatText" placeholder="想说什么…（Enter 发送）" maxlength="80">
          <button class="btn primary sm" id="btnSend">发送</button>
          <button class="btn sm gold" id="btnEndChat">结束对话 ➜</button>
        </div>
      </div>`;
    const g = parseAction(currentChat.auto || greetingFor(ch));
    showNpcLine(ch, g.action, g.rest);
    ov.querySelectorAll('.chip').forEach(c2 => c2.addEventListener('click', () => sendChat(chipQuestion(ch, c2.dataset.t))));
    const input = $('chatText');
    input.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(input.value); });
    $('btnSend').addEventListener('click', () => sendChat(input.value));
    $('btnEndChat').addEventListener('click', () => closeChat(true));
    input.focus();
  }

  function greetingFor(ch) {
    const pool = (JContent.DIALOGUES[ch.key] || JContent.DIALOGUES.npc).greet || [];
    return JEngine.fillTemplate(s, pool[0] || '嗨，最近怎么样？', ch);
  }

  function chipQuestion(ch, topic) {
    const map = {
      greet: '你好呀，最近怎么样？',
      study: '你觉得我最近的学习状态怎么样？',
      career: '我将来想走' + (JEngine.careerOf(s) ? JEngine.careerOf(s).name : '这个') + '方向，你怎么看？',
      life: '你最近生活怎么样？有什么开心的事吗？',
      emotion: '我最近有点心事，能跟你聊聊吗？',
      truth: '能跟我说说' + (JEngine.careerOf(s) ? JEngine.careerOf(s).name : '这个职业') + '的真实情况吗？',
      work: '你们这行平时工作到底是怎么样的？',
      daily: '能给我讲讲你普通的一天吗？',
      academic: '你觉得做研究/读文献有什么诀窍？'
    };
    return map[topic] || '你觉得呢？';
  }

  function portraitObj(ch) {
    const career = ch.careerId ? LIB.careers.find(c => c.id === ch.careerId) : null;
    return { id: 'v2_' + ch.key, name: ch.name, gender: ch.gender, age: ch.age || 20, role: 'worker', emoji: ch.emoji || '🙂', career };
  }
  function playerPortrait() {
    const stage = JEngine.stageOf(s);
    const age = stage && ['s1','s2','s3','s4'].includes(stage.id) ? 16 : stage && ['s5','s6','s7','s8','s8b'].includes(stage.id) ? 20 : 24;
    return { id: 'v2_player', name: s.prot.name, gender: s.prot.gender, age, role: 'worker', emoji: '🧑‍🎓', career: null };
  }

  /* 解析回复开头的（动作），如（低头笑了笑） */
  function parseAction(text) {
    const t = String(text || '').trim();
    const m = t.match(/^[（([]([^）)]]{1,16})[）)]]/);
    if (m) return { action: m[1], rest: t.slice(m[0].length).trim() };
    const inner = t.match(/[（(]([^（）()]{1,16})[）)]/);
    if (inner) return { action: inner[1], rest: t };
    return { action: '', rest: t };
  }
  const ACTION_CLASSES = [
    [/笑|开心|乐|得意|偷笑|高兴/, 'happy'],
    [/叹|无奈|苦笑|摇头|叹气|郁闷|垂头|委屈/, 'sigh'],
    [/怒|生气|翻白眼|白眼|瞪|哼/, 'angry'],
    [/想|思|犹豫|考虑|琢磨|托腮|沉思/, 'think'],
    [/惊|吓|愣|呆|意外|瞪大/, 'surprise'],
    [/点头|认真|严肃|正色|坚定/, 'nod'],
    [/害羞|脸红|低头|不好意思|腼腆/, 'shy'],
    [/耸肩|摊手|无所谓|摆手/, 'shrug']
  ];
  function actionClass(action) {
    for (const [re, cls] of ACTION_CLASSES) if (re.test(action)) return cls;
    return 'talk';
  }
  function moodForAction(action) {
    if (/叹|哭|委屈|难过|低落/.test(action)) return 'tired';
    return 'happy';
  }
  const ACTS = ['happy', 'sigh', 'angry', 'think', 'surprise', 'nod', 'shy', 'shrug', 'talk'];

  function showNpcLine(ch, action, text) {
    const av = portraitObj(ch);
    const img = document.querySelector('#gsPortrait img');
    if (img) img.src = AvatarSvg.avatarDataUri(av, 170, moodForAction(action));
    const nm = $('gsName'); if (nm) nm.textContent = ch.name;
    const rl = $('gsRole'); if (rl) rl.textContent = ch.role;
    setAction(action || inferAction(text));
    typeLine($('gsLine'), text, 'npc');
  }
  function inferAction(text) {
    const t = String(text || '');
    if (/[叹|哭|委屈|难过|低落|郁闷|烦]/.test(t)) return '叹了口气';
    if (/[怒|气|白眼|哼|怼|吵]/.test(t)) return '翻了个白眼';
    if (/[惊|吓|愣|呆|意外]/.test(t)) return '愣了一下';
    if (/[想|思|犹豫|琢磨|考虑]/.test(t)) return '想了想';
    if (/[笑|乐|开心|得意]/.test(t)) return '笑了笑';
    if (/[点头|认真|严肃]/.test(t)) return '点了点头';
    return '';
  }
  function showPlayerLine(text) {
    const img = document.querySelector('#gsPortrait img');
    if (img) img.src = AvatarSvg.avatarDataUri(playerPortrait(), 170, 'happy');
    const nm = $('gsName'); if (nm) nm.textContent = s.prot.name;
    const rl = $('gsRole'); if (rl) rl.textContent = '你';
    setAction('');
    typeLine($('gsLine'), text, 'me');
  }
  function setAction(action) {
    const p = $('gsPortrait');
    if (!p) return;
    ACTS.forEach(a => p.classList.remove('act-' + a));
    p.classList.add('act-' + (action ? actionClass(action) : 'talk'));
    const aEl = $('gsAction');
    if (aEl) aEl.textContent = action ? '（' + action + '）' : '';
  }
  function typeLine(el, text, cls) {
    if (!el) return;
    el.className = 'gs-line ' + cls;
    el.textContent = '';
    const t = String(text || '');
    let i = 0;
    const step = () => {
      i += 2;
      el.textContent = t.slice(0, i);
      if (i < t.length) setTimeout(step, 13);
      else el.textContent = t;
    };
    step();
  }

  async function sendChat(text) {
    const input = $('chatText');
    const msg = (text || '').trim();
    if (!msg || !currentChat) return;
    const ckey = currentChat.key;
    if (input) input.value = '';
    showPlayerLine(msg);
    const npc = (ckey && ckey.startsWith('folk_')) ? JScene.folkAsChar(ckey.slice(5)) : s.cast[ckey];
    if (npc && npc.folk) {
      const rtext = JScene.folkReply(ckey.slice(5), msg);
      if (!currentChat || currentChat.key !== ckey) return;
      const pa = parseAction(rtext);
      showNpcLine(npc, pa.action, pa.rest || rtext);
      return;
    }
    const r = await JDialogue.ask(s, ckey, msg);
    if (!currentChat || currentChat.key !== ckey) return;
    const pa = parseAction(r.text);
    showNpcLine(npc, pa.action, pa.rest || r.text);
  }

  function closeChat(done) {
    const ov = $('chatOverlay');
    ov.classList.add('hidden');
    const cb = currentChat && currentChat.onDone;
    currentChat = null;
    if (done && cb) cb();
  }

  function toast(text) {
    let t = document.getElementById('fxToast');
    if (!t) { t = document.createElement('div'); t.id = 'fxToast'; document.body.appendChild(t); }
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function escapeHtml(t) { return String(t || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  /* ---------- 弹窗 ---------- */
  function openModal(html, opts) {
    const root = $('modalRoot');
    root.innerHTML = `<div class="modal-mask"><div class="modal">${html}</div></div>`;
    if (!opts || !opts.lock) {
      root.querySelector('.modal-mask').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
    }
  }
  function closeModal() { const root = $('modalRoot'); if (root) root.innerHTML = ''; }

﻿  /* ---------- 新建角色向导（我的信息 + 家庭信息） ---------- */
  function openNewGame() {
    closeChat(false);
    const msOptions = ['学霸型', '普通型', '调皮型', '特长型'].map(o => `<button class="btn option ms-opt" data-v="${o}">${o}</button>`).join('');
    openModal(`
      <h2>🎒 创建你的高中生</h2>
      <p class="modal-sub">先从"你自己"开始——姓名、性别，还有初中时的你。</p>
      <div class="form">
        <label>姓名 <input id="ngName" maxlength="6" placeholder="如：小高"></label>
        <label>性别 <select id="ngGender"><option>男</option><option>女</option></select></label>
        <label>高考省份 <select id="ngProvince">${(LIB.provinceLines || []).map(p => `<option>${p.name}</option>`).join('')}</select></label>
      </div>
      <div class="field-label">初中的我</div>
      <div class="options ms-grid">${msOptions}</div>
      <button class="btn primary" id="btnNg1">下一步：填写家庭信息 ➜</button>`);
    let ms = '普通型';
    document.querySelectorAll('#modalRoot .ms-opt').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('#modalRoot .ms-opt').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      ms = b.dataset.v;
    }));
    $('btnNg1').addEventListener('click', () => {
      if (!$('ngName').value.trim()) { $('ngName').classList.add('err'); return; }
      familyStep($('ngName').value.trim(), $('ngGender').value, $('ngProvince').value, ms);
    });
  }

  function familyStep(name, gender, province, ms) {
    const opts = arr => arr.map(v => `<option>${v}</option>`).join('');
    openModal(`
      <h2>🏠 填写家庭信息</h2>
      <p class="modal-sub">这些信息会决定你的爸妈是什么样的人，也会影响你的人生起点。</p>
      <div class="form">
        <label>家庭经济条件 <select id="hfEconomy">${opts(['工薪家庭', '小康家庭', '富裕家庭'])}</select></label>
        <label>爸爸的职业 <select id="hfFatherJob">${opts(['工人', '个体户', '教师', '医生', '公务员', '经商', '务农', '务工', '普通职员'])}</select></label>
        <label>妈妈的职业 <select id="hfMotherJob">${opts(['全职妈妈', '工人', '教师', '医护', '文员', '个体户', '务农', '普通职员'])}</select></label>
        <label>家庭氛围 <select id="hfVibe">${opts(['开明民主', '严格管教', '放养自由', '忙碌少陪伴'])}</select></label>
        <label>家长期望 <select id="hfExpect">${opts(['稳定踏实', '出人头地', '平安快乐', '继承家业', '尊重我的选择'])}</select></label>
        <label>家中情况 <select id="hfOnly">${opts(['独生子女', '有兄弟姐妹'])}</select></label>
      </div>
      <button class="btn primary" id="btnNg2">下一步：了解自己 ➜</button>`);
    $('btnNg2').addEventListener('click', () => {
      const familyInfo = {
        economy: $('hfEconomy').value,
        fatherJob: $('hfFatherJob').value,
        motherJob: $('hfMotherJob').value,
        vibe: $('hfVibe').value,
        expect: $('hfExpect').value,
        onlyChild: $('hfOnly').value,
        middleSchool: ms
      };
      talentStep(name, gender, province, familyInfo, ms);
    });
  }

  function quizStep(name, gender, province, familyInfo, traits) {
    if (profileSeed) {
      // 已从未来致远载入测评画像：跳过答题，直接用画像初始化角色
      const holland = (profileSeed.interestTop || []).slice(0, 3).map(t => t.key);
      const persona = (profileSeed.personalityTop || []).slice(0, 2).map(t => t.key).join('、') || (profileSeed.abilityTop || []).slice(0, 2).map(t => t.key).join('、');
      toast('🧭 已载入你的四维测评画像，跳过答题');
      careerStep(name, gender, province, familyInfo, holland, traits, persona);
      return;
    }
    const q = JContent.QUIZ;
    let picks = [];
    const renderQ = (i) => {
      const cur = q[i];
      const opts = cur.options.map((o, j) => `<button class="btn option" data-j="${j}">${o.text}</button>`).join('');
      openModal(`
        <h2>🧩 了解自己（${i + 1}/${q.length}）</h2>
        <p class="modal-sub">${cur.q}</p>
        <div class="options">${opts}</div>
        <div class="modal-foot"><span class="muted">凭第一感觉选就好，没有对错</span></div>`);
      document.querySelectorAll('#modalRoot .option').forEach(b => b.addEventListener('click', () => {
        const o = cur.options[+b.dataset.j];
        (o.tags || []).forEach(t => picks.push(t));
        if (i + 1 < q.length) renderQ(i + 1);
        else careerStep(name, gender, province, familyInfo, picks, traits);
      }));
    };
    renderQ(0);
  }

  function careerStep(name, gender, province, familyInfo, holland, traits, persona) {
    const deep = LIB.careers.filter(c => JContent.DEEP_CAREER_IDS.includes(c.id));
    const list = deep.map(c => {
      const auto = JContent.AUTO_CAREER_IDS && JContent.AUTO_CAREER_IDS.includes(c.id);
      const rm = JContent.ROADMAPS[c.id] || {};
      return `<div class="career-opt" data-id="${c.id}">
        <div class="co-name">${c.name} <span class="badge">${auto ? 'AI 生成路线' : '深度路线'}</span></div>
        <div class="co-tag">${c.category} · ${c.salary}</div>
        <div class="co-sum">${c.summary}</div>
        <div class="co-road">🗺️ ${rm.tagline || ''}</div>
      </div>`;
    }).join('');
    openModal(`
      <h2>🎯 选择你的职业意向</h2>
      <p class="modal-sub">选一个你最想体验的职业。选定后，整个高中→大学→求职的路线都会围绕它展开（随时可以在顶栏更换）。${profileSeed ? '<span style="color:#12b886">（已载入你的四维测评画像）</span>' : ''}</p>
      <div class="career-grid">${list}</div>
      <div class="modal-foot"><button class="btn ghost" id="btnLibInWizard">🗺️ 先看看 180 个职业图鉴</button></div>`);
    document.querySelectorAll('#modalRoot .career-opt').forEach(el => el.addEventListener('click', () => {
      startGame({ name, gender, province, familyInfo, holland, traits, careerId: el.dataset.id, personality: persona });
    }));
    const b = $('btnLibInWizard');
    if (b) b.addEventListener('click', () => openLibrary());
  }

  async function startGame(opts) {
    JStore.reset();
    s = JEngine.newGame(opts);
    closeModal();
    bindScene();
    renderAll();
    try {
      const careerName = (LIB.careers.find(c => c.id === s.careerId) || {}).name || '平行人生';
      const run = await JStore.createRun({ name: s.prot.name + '的' + careerName + '人生', careerId: s.careerId, state: s, meta: (typeof JFeatures !== 'undefined' && JFeatures.readMeta) ? JFeatures.readMeta() : {} });
      toast('💾 新存档：' + (run.career_name || careerName));
    } catch (e) {
      toast('⚠️ 存档创建失败（离线仅本地）');
    }
  }

  /* ---------- 阶段总结 ---------- */
  function openStageSummary(stage) {
    const ms = (s.milestones || []).filter(m => m.stage === stage.id).map(m => `<li>${escapeHtml(m.text)}</li>`).join('');
    openModal(`
      <h2>${stage.icon} ${stage.name} · 学年总结</h2>
      <p class="modal-sub">这一阶段，你经历了这些关键节点：</p>
      <ul class="milestones">${ms || '<li>（无重大节点）</li>'}</ul>
      <button class="btn primary" id="btnNextStage">进入下一阶段 ➜</button>`, { lock: true });
    $('btnNextStage').addEventListener('click', () => {
      const ok = JEngine.advanceStage(s);
      JStore.save(s);
      JStore.settleStage(s, stage.id).catch(() => {});
      closeModal();
      renderAll();
      if (!ok && s.ending) openReport();
      else if (!ok) openReport();
    });
  }

  /* ---------- 职业图鉴 ---------- */
  function openLibrary() {
    const cats = [...new Set((LIB.careers || []).map(c => c.category).filter(Boolean))].sort();
    openModal(`
      <h2>🗺️ 职业图鉴（${(LIB.careers || []).length} 个）</h2>
      <div class="lib-search"><input id="libSearch" placeholder="搜索职业 / 关键词…" maxlength="12"><select id="libCat"><option value="">全部分类</option>${cats.map(c => `<option>${c}</option>`).join('')}</select></div>
      <div class="lib-list" id="libList"></div>`);
    renderLibList();
    $('libSearch').addEventListener('input', renderLibList);
    $('libCat').addEventListener('change', renderLibList);
  }

  function renderLibList() {
    const kw = ($('libSearch').value || '').trim();
    const cat = $('libCat').value;
    let list = LIB.careers || [];
    if (cat) list = list.filter(c => c.category === cat);
    if (kw) list = list.filter(c => (c.name + (c.tags || []).join('') + c.summary).includes(kw));
    list = list.slice(0, 60);
    const box = $('libList');
    box.innerHTML = list.map(c => {
      const deep = JContent.DEEP_CAREER_IDS.includes(c.id);
      return `<div class="lib-item" data-id="${c.id}">
        <div class="li-name">${c.name} ${deep ? '<span class="badge">深度路线</span>' : ''}</div>
        <div class="li-meta">${c.category} · ${c.salary || ''} · 热度${'★'.repeat(Math.max(1, Math.min(5, Math.round((c.demand || 60) / 20))))}</div>
      </div>`;
    }).join('') || '<div class="empty">没有找到</div>';
    box.querySelectorAll('.lib-item').forEach(el => el.addEventListener('click', () => openCareerDetail(el.dataset.id)));
  }

  function openCareerDetail(id) {
    const c = LIB.careers.find(x => x.id === id);
    if (!c) return;
    const rm = JContent.ROADMAPS[id];
    const deepHtml = rm ? `
      <div class="cd-road">
        <h4>🗺️ 深度职业路线</h4>
        <p><b>选科：</b>${rm.subjects.join(' + ')}（${rm.subjectNote}）</p>
        <p><b>专业：</b>${rm.majors.map(m => JEngine.majorName(m)).join('、')}</p>
        <p><b>大学四年：</b>${[1, 2, 3, 4].map(y => '大' + '一二三四'[y - 1] + '：' + rm.college[y][0]).join('；')}</p>
        <p><b>深造：</b>${rm.advanced.why}</p>
        <p><b>求职：</b>${rm.job.path}（第一份工作 ${rm.job.firstJob}）</p>
      </div>` : '';
    const radar = c.radar ? [['收入', c.radar.income], ['压力', c.radar.stress], ['前景', c.radar.prospect], ['门槛', c.radar.barrier]].map(([k, v]) => `
      <div class="bar"><div class="bar-top"><span>${k}</span><span>${v}</span></div><div class="track"><div class="fill" style="width:${v}%"></div></div></div>`).join('') : '';
    openModal(`
      <h2>${c.name} ${JContent.DEEP_CAREER_IDS.includes(id) ? '<span class="badge">深度路线</span>' : ''}</h2>
      <p class="cd-cat">${c.category} · ${c.salary || ''} · ${c.education || ''}</p>
      <p class="cd-sum">${c.summary}</p>
      <div class="cd-block"><b>🕐 真实的一天</b><p>${c.day}</p></div>
      <div class="cd-block"><b>💡 职业真相</b><p>${c.truth}</p></div>
      <div class="cd-block"><b>🧩 核心能力</b><p>${(c.skills || []).join('、')}</p></div>
      <div class="cd-block"><b>🪜 晋升路径</b><p>${c.path}</p></div>
      ${radar ? `<div class="cd-block"><b>📊 雷达</b>${radar}</div>` : ''}
      ${deepHtml}
      <button class="btn ghost" id="btnBackLib">⬅ 返回图鉴</button>`);
    $('btnBackLib').addEventListener('click', () => openLibrary());
  }

  /* ---------- 结局报告 ---------- */
  function openReport() {
    if (!s || !s.ending) return;
    const e = s.ending;
    const career = JEngine.careerOf(s);
    const gradPath = s.stageDone.includes('s8b') || s.stageDone.includes('s9') || s.flags.gradPass || s.flags.gradFailedJob;
    const baseNodes = ['认识职业引路人', '说出职业方向', '按目标职业路线选科', '参加相关社团/活动', '了解职业真相', '高考过线', '进入目标专业', '大一绩点稳', '大二积累竞赛/证书/科研', '结识行业前辈', '完成实习', '实习表现受认可', '拿到第一份工作 offer'];
    const totalNodes = gradPath ? baseNodes.concat(['考研上岸', '读博深造']) : baseNodes;
    const done = totalNodes.filter(n => s.roadmapDone.includes(n));
    const match = e.match || JEngine.matchScore(s);
    const keyPeople = (s.castOrder || []).map(k => s.cast[k]).filter(c => c && c.tier === 1 && c.appeared !== false).map(c => {
      const int = JStore.intimacy(s, c.key);
      const rel = s.loverKey === c.key ? '💛 恋人' : (c.role);
      return `<li><b>${c.name}</b>（${rel}，亲密度 ${int}）— ${c.persona.slice(0, 30)}…</li>`;
    }).join('');
    const milestones = s.milestones.slice(-14).map(m => `<li>${escapeHtml(m.text)}</li>`).join('');
    const pts = grantPointsOnce();
    if (!s._settledFinal) {
      s._settledFinal = true;
      JStore.settleStage(s, null, { final: true }).then(r => {
        if (r && r.badges && r.badges.length) {
          const names = r.badges.map(b => b.name || b.badge_id).join('、');
          toast('🏆 未来致远徽章 +' + names);
        }
      }).catch(() => {});
    }
    const fam = (typeof JFeatures !== 'undefined' && JFeatures.familyAnalysis) ? JFeatures.familyAnalysis(s) : { lines: [] };
    const meta = (typeof JFeatures !== 'undefined' && JFeatures.readMeta) ? JFeatures.readMeta() : { achievements: [] };
    const stageOpts = JContent.STAGES.map((st, i) => `<option value="${st.id}">${st.name}</option>`).join('');
    openModal(`
      <div class="report">
        <h2>🎉 ${e.title ? e.title + ' · ' : ''}你拿到了第一份工作</h2>
        <div class="rep-offer">
          <div class="rep-title">${e.offer}</div>
          <div class="rep-company">${e.company} · ${e.salary}</div>
          <div class="rep-career">${career ? career.name : ''}</div>
        </div>
        <div class="rep-match">
          <div class="rm-label">职业匹配度</div>
          <div class="rp-track big"><i style="width:${match}%"></i></div>
          <span>${match}%</span>
        </div>
        <div class="rep-sec"><h4>🧭 路线图达成（${done.length}/${totalNodes.length}）</h4>
          <div class="rep-checks">${totalNodes.map(n => `<span class="${done.includes(n) ? 'ok' : 'no'}">${done.includes(n) ? '✅' : '⬜'}${n}</span>`).join('')}</div>
        </div>
        <div class="rep-sec"><h4>🤝 重要的人</h4><ul class="rep-people">${keyPeople || '<li>你几乎没交到什么朋友。</li>'}</ul></div>
        <div class="rep-sec"><h4>📖 人生大事记</h4><ul class="rep-ms">${milestones || '<li>（无）</li>'}</ul></div>
        <div class="rep-sec"><h4>📈 人生曲线</h4><canvas id="lifeCurve" width="560" height="210"></canvas></div>
        <div class="rep-sec"><h4>🏠 家庭影响分析</h4><p class="fam-lines">${fam.lines.join('<br>')}</p></div>
        <div class="rep-sec"><h4>🎖️ 成就</h4>本局已解锁 <b>${(meta.achievements || []).length}</b> 枚徽章，结算获得 <b class="gold">+${pts}</b> 人生点。</div>
        <div class="rep-sec"><h4>💬 想对十年后的自己说</h4>
          <textarea id="repNote" rows="2" placeholder="写一句复盘…"></textarea>
        </div>
        <div class="rep-sec"><h4>🧭 关键抉择回看</h4>
          <div class="choices-review">${(s.choices || []).slice(-8).reverse().map(ch => `<div class="choice-item"><span class="choice-stage">${JContent.STAGES.find(x => x.id === ch.stage) ? JContent.STAGES.find(x => x.id === ch.stage).short : '?'}</span>${ch.text}${ch.tag ? ` <span class="muted">(${ch.tag})</span>` : ''}</div>`).join('') || '<span class="muted">还没有记录到关键选择</span>'}</div>
          <p class="muted" style="margin-top:6px">每一次选择都让这个故事独一无二。如果重来一次，你会选另一边吗？</p>
        </div>
        <div class="rep-sec"><h4>🕰️ 时光机</h4>
          <p class="muted">选择一个阶段从这里重新开始（属性保留，之后的选择清空）：</p>
          <div class="time-machine"><select id="restartStage">${stageOpts}</select><button class="btn sm" id="btnRestartStage">🔄 从这里重来</button></div>
        </div>
        <div class="rep-actions">
          <button class="btn primary" id="btnPoster">🖼️ 生成人生海报</button>
          <button class="btn primary" id="btnPostCommunity">💬 发布到社区</button>
          <button class="btn primary" id="btnShare">📤 生成分享文字</button>
          <button class="btn ghost" id="btnRestart2">🔄 重新开始一段人生</button>
        </div>
      </div>`);
    $('btnShare').addEventListener('click', shareReport);
    const pc = $('btnPostCommunity');
    if (pc) pc.addEventListener('click', () => publishToCommunity());
    const lc = $('lifeCurve');
    if (lc && typeof JFeatures !== 'undefined') JFeatures.drawLifeCurve(lc, s);
    const bp = $('btnPoster');
    if (bp) bp.addEventListener('click', () => openPoster());
    const brs = $('btnRestartStage');
    if (brs) brs.addEventListener('click', () => restartFromStage($('restartStage').value));
  }

  function shareReport() {
    const e = s.ending;
    const career = JEngine.careerOf(s);
    const match = e.match;
    const doneCount = s.roadmapDone.length;
    const lines = [
      '【我的模拟人生路 · 职业人生】',
      '🎓 从高一到第一份工作',
      '🎯 目标职业：' + (career ? career.name : ''),
      '💼 第一份工作：' + e.offer + ' @ ' + e.company + '（' + e.salary + '）',
      '🧭 职业匹配度：' + match + '%',
      '✅ 路线图节点达成：' + doneCount + ' 个',
      '📖 ' + s.prot.name + ' 的高中到职场人生模拟，欢迎你也来试试！'
    ].join('\n');
    const ta = $('repNote');
    if (ta && ta.value.trim()) lines.splice(4, 0, '💬 复盘：' + ta.value.trim());
    navigator.clipboard.writeText(lines).then(() => {
      const b = $('btnShare');
      if (b) { b.textContent = '✅ 已复制到剪贴板'; setTimeout(() => { b.textContent = '📤 生成分享卡片文字'; }, 2000); }
    }).catch(() => { prompt('复制以下文字：', lines); });
  }

  /* ---------- 发布到社区（未来致远平台） ---------- */
  async function publishToCommunity() {
    const tk = JStore.token();
    if (!tk) { toast('请先登录未来致远账号再发布到社区'); location.href = '/sim.html?login=1'; return; }
    const e = s.ending;
    const career = JEngine.careerOf(s);
    const match = e.match || JEngine.matchScore(s);
    const ta = $('repNote');
    const note = ta && ta.value.trim() ? '\n💬 复盘：' + ta.value.trim() : '';
    const title = '我的平行人生：成为' + (career ? career.name : e.offer) + ' @ ' + e.company;
    const content = '🎮 在人生模拟舱里，我从高一活到第一份工作：\n🎯 目标职业：' + (career ? career.name : '') + '\n💼 offer：' + e.offer + ' @ ' + e.company + '（' + e.salary + '）\n🧭 职业匹配度：' + match + '%\n✅ 路线图达成：' + (s.roadmapDone || []).length + ' 个节点\n📖 平行人生，欢迎你也来体验一次！#平行人生#' + note;
    const btn = $('btnPostCommunity');
    if (btn) { btn.disabled = true; btn.textContent = '发布中…'; }
    try {
      let media = [];
      const canvas = document.createElement('canvas');
      canvas.width = 1200; canvas.height = 480;
      await new Promise(resolve => JFeatures.drawPoster(canvas, s, resolve));
      const dataUrl = canvas.toDataURL('image/png');
      const b64 = dataUrl.split(',')[1] || '';
      const up = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tk }, body: JSON.stringify({ type: 'image/png', data: b64 }) });
      const upj = await up.json();
      if (upj && upj.url) media = [{ url: upj.url, type: 'image/png' }];
      const res = await fetch('/api/community', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tk }, body: JSON.stringify({ title, content, career_id: s.careerId, post_type: 'share' }) });
      const rj = await res.json();
      if (!res.ok) throw new Error(rj.error || '发布失败');
      toast('✅ 已发布到社区圈子');
      if (btn) btn.textContent = '✅ 已发布';
      window.open('/community.html?career=' + s.careerId, '_blank');
    } catch (err) {
      toast('⚠️ ' + err.message);
      if (btn) { btn.disabled = false; btn.textContent = '💬 发布到社区'; }
    }
  }

﻿  /* ---------- 成就与图鉴 ---------- */
  function openAchievements() {
    const m = JFeatures.readMeta();
    const achList = JFeaturesData.ACHIEVEMENTS.map(a => {
      const got = (m.achievements || []).includes(a.id);
      return `<div class="ach ${got ? 'got' : ''}"><span class="ach-ic">${a.icon}</span><div class="ach-tx"><b>${a.name}</b><p>${a.desc}</p></div>${got ? '<span class="ach-ok">✅</span>' : '<span class="ach-no">🔒</span>'}</div>`;
    }).join('');
    const endings = (m.endings || []).map(k => {
      const st = JFeaturesData.ENDING_STYLES.find(x => x.key === k);
      return `<span class="end-chip">🏁 ${st ? st.title : k}</span>`;
    }).join('') || '<span class="muted">还没解锁结局</span>';
    const traits = (m.traits || []).map(id => {
      const t = JFeaturesData.TRAITS.find(x => x.id === id);
      return t ? `<span class="end-chip">${t.icon} ${t.name}</span>` : '';
    }).join('') || '<span class="muted">暂无已购天赋</span>';
    const castChips = (s.castOrder || []).map(k => s.cast[k]).filter(Boolean).filter(ch => ch.appeared !== false).map(ch => `<span class="end-chip">${ch.emoji || '👤'} ${ch.name}</span>`).join('');
    const evCount = (s.milestones || []).length;
    openModal(`
      <h2>🏆 成就与图鉴</h2>
      <div class="meta-line">💎 人生点 <b class="gold">${m.points || 0}</b> ｜ 成就 <b>${(m.achievements || []).length}/${JFeaturesData.ACHIEVEMENTS.length}</b> ｜ 本局事件 <b>${evCount}</b></div>
      <div class="rep-sec"><h4>🎖️ 成就</h4><div class="ach-grid">${achList}</div></div>
      <div class="rep-sec"><h4>👥 人物图鉴（本局遇到）</h4><div class="chip-line">${castChips || '<span class="muted">还没认识什么人</span>'}</div></div>
      <div class="rep-sec"><h4>🏁 结局图鉴</h4><div class="chip-line">${endings}</div></div>
      <div class="rep-sec"><h4>✨ 天赋图鉴</h4><div class="chip-line">${traits}</div></div>
      <button class="btn primary" id="btnAchClose">知道了</button>`);
    $('btnAchClose').addEventListener('click', closeModal);
  }

  /* ---------- 手机（朋友圈 + 联系人） ---------- */
  function openFeed() {
    const posts = JFeatures.feedFor(s);
    const rows = posts.map((p, i) => {
      const liked = (s.feedLiked || []).includes(i);
      const commented = (s.feedComments || []).includes(i);
      return `<div class="feed-item">
        <div class="feed-head"><span class="feed-av">${['🧑‍🎓', '👩‍🎓', '🧑‍💻', '👨‍🏫'][i % 4]}</span><b>${p.author}</b></div>
        <div class="feed-text">${p.text}</div>
        <div class="feed-actions"><button class="btn sm ${liked ? 'liked' : ''}" data-i="${i}" ${liked ? 'disabled' : ''}>${liked ? '✅ 已点赞' : '👍 ' + p.likes}</button><button class="btn sm ${commented ? 'liked' : ''}" data-c="${i}" ${commented ? 'disabled' : ''}>${commented ? '✅ 已评论' : '💬 评论'}</button></div>
      </div>`;
    }).join('');
    const contacts = (s.castOrder || []).map(k => s.cast[k]).filter(ch => ch && ch.appeared !== false && ['father', 'mother', 'deskmate', 'roommate', 'lover', 'mentor'].includes(ch.key)).map(ch => `<button class="chip" data-contact="${ch.key}">${ch.emoji || '👤'} ${ch.name}</button>`).join('');
    openModal(`
      <h2>📱 手机</h2>
      <div class="rep-sec"><h4>👥 联系人（点击发消息）</h4><div class="chip-line">${contacts || '<span class="muted">暂无联系人</span>'}</div></div>
      <div class="rep-sec"><h4>📡 朋友圈</h4><div class="feed-list">${rows}</div></div>
      <button class="btn ghost" id="btnFeedClose">返回</button>`);
    s.feedUnread = 0;
    JStore.save(s);
    const dot = $('feedDot'); if (dot) dot.classList.add('hidden');
    document.querySelectorAll('#modalRoot [data-contact]').forEach(b => b.addEventListener('click', () => { closeModal(); openChat(b.dataset.contact); }));
    document.querySelectorAll('#modalRoot [data-i]').forEach(b => b.addEventListener('click', () => {
      const logs = JFeatures.likeFeed(s, +b.dataset.i);
      if (logs) { b.textContent = '✅ 已点赞'; b.classList.add('liked'); b.disabled = true; JUI.toast('👍 人脉 +1'); }
    }));
    const COMMENTS = ['哈哈哈哈', '太棒了！', '学到了学到了', '支持！', '羡慕了', '同款感受', '前排围观', '你太有才了'];
    document.querySelectorAll('#modalRoot [data-c]').forEach(b => b.addEventListener('click', () => {
      const logs = JFeatures.commentFeed(s, +b.dataset.c, COMMENTS[Math.floor(Math.random() * COMMENTS.length)]);
      if (logs) { b.textContent = '✅ 已评论'; b.classList.add('liked'); b.disabled = true; JUI.toast('💬 心态 +1'); }
    }));
    $('btnFeedClose').addEventListener('click', closeModal);
  }

  /* ---------- 自由活动 ---------- */
  function openFreeAct() {
    const pts = s.freePoints || 0;
    if (pts <= 0) { toast('今天的自由活动已经排满啦，先推剧情吧'); return; }
    const rows = JFeatures.FREE_ACTIONS.map(a => `<button class="btn option" data-k="${a.key}">${a.icon} <b>${a.name}</b> <span class="muted">${a.desc}</span></button>`).join('');
    openModal(`<h2>🎮 自由活动（剩余 ${pts} 次）</h2><p class="modal-sub">把时间花在哪，哪里就成长——这就是经营人生。</p><div class="options">${rows}</div>`);
    document.querySelectorAll('#modalRoot [data-k]').forEach(b => b.addEventListener('click', () => {
      const r = JFeatures.doFreeAction(s, b.dataset.k);
      closeModal();
      if (r) { JUI.toast(r.text); renderAll(); }
    }));
  }

  /* ---------- 路人支线 ---------- */
  function openFolkQuest(folkId) {
    const folk = JScene.folkAsChar(folkId);
    const q = JFeatures.questFor(folk);
    if (!q) { openChat('folk_' + folkId); return; }
    openModal(`
      <h2>❗ 支线 · ${q.title}</h2>
      <p class="step-desc">${q.desc}</p>
      <p class="muted">${folk ? folk.name : 'TA'} 正等着你的帮助。</p>
      <button class="btn primary" id="btnQuestDone">💪 帮助 TA</button>`);
    $('btnQuestDone').addEventListener('click', () => {
      const r = JFeatures.doFolkQuest(s, folk);
      closeModal();
      if (r) {
        JUI.toast(r.q.icon + ' 支线完成：' + r.q.reward);
        const fresh = JFeatures.checkAchievements(s);
        fresh.forEach(a => JUI.toast(a.icon + ' 成就解锁：' + a.name));
        renderAll();
      }
    });
  }

  /* ---------- 人生点结算（通关一次） ---------- */
  function grantPointsOnce() {
    if (!s || s.lifePointsGranted) return 0;
    s.lifePointsGranted = true;
    const pts = JFeatures.grantLifePoints(s);
    JStore.save(s);
    return pts;
  }

  /* ---------- 分享海报 ---------- */
  function openPoster() {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 480;
    JFeatures.drawPoster(canvas, s, () => {
      const dataUrl = canvas.toDataURL('image/png');
      openModal(`
        <h2>🖼️ 你的人生卡片</h2>
        <img src="${dataUrl}" style="width:100%;border-radius:14px;border:1px solid #e8e4dd">
        <div class="rep-actions" style="margin-top:12px">
          <a class="btn primary" href="${dataUrl}" download="我的人生卡片.png">⬇️ 下载图片</a>
          <button class="btn ghost" id="btnPosterClose">关闭</button>
        </div>`);
      $('btnPosterClose').addEventListener('click', closeModal);
    });
  }

  /* ---------- 时光机：从某阶段重来 ---------- */
  function restartFromStage(stageId) {
    const idx = JContent.STAGES.findIndex(x => x.id === stageId);
    if (idx < 0) return;
    if (!confirm('从「' + JContent.STAGES[idx].name + '」重新开始？该阶段之后的选择和进度会清空（属性和天赋保留）。')) return;
    s.stageIndex = idx;
    s.stepIndex = 0;
    s.ending = null;
    s.stageDone = (s.stageDone || []).filter(id => JContent.STAGES.findIndex(x => x.id === id) < idx);
    s.milestones = (s.milestones || []).filter(m => JContent.STAGES.findIndex(x => x.id === m.stage) < idx);
    s.extraEvents = {};
    s.freePoints = 3;
    JStore.save(s);
    closeModal();
    renderAll();
  }

﻿  /* ---------- 开局天赋骰子（支持人生点购买第 3 候选） ---------- */
  function talentStep(name, gender, province, familyInfo, ms, bought) {
    const m = JFeatures.readMeta();
    const cands = JFeatures.rollTraitCandidates();
    if (bought && cands.length) {
      const extra = JFeaturesData.TRAITS.find(t => !cands.some(x => x.id === t.id));
      if (extra) cands.push(extra);
    }
    const canBuy = (m.points || 0) >= 20 && !bought;
    openModal(`
      <h2>🍀 开局天赋</h2>
      <p class="modal-sub">每个人生开局都带着一点「天赋」。选一个（也可以跳过——纯靠努力的人生也很酷）。</p>
      <div class="options">
        ${cands.map((t, i) => `<button class="btn option" data-t="${t.id}">${t.icon} <b>${t.name}</b> <span class="muted">${t.desc}</span></button>`).join('')}
        <button class="btn option" data-t="skip">🚫 不选天赋，纯凭努力</button>
      </div>
      <div class="modal-foot">
        <span class="muted">💎 人生点 ${m.points || 0}${canBuy ? '　<button class="btn sm gold" id="btnBuyTrait">🛒 花 20 点解锁第 3 个候选</button>' : ''}</span>
      </div>`);
    document.querySelectorAll('#modalRoot [data-t]').forEach(b => b.addEventListener('click', () => {
      const traits = b.dataset.t === 'skip' ? [] : [b.dataset.t];
      quizStep(name, gender, province, familyInfo, traits);
    }));
    const buy = $('btnBuyTrait');
    if (buy) buy.addEventListener('click', () => {
      if (JFeatures.spendPoints(20)) talentStep(name, gender, province, familyInfo, ms, true);
      else toast('人生点不够');
    });
  }

  /* ---------- 成就与图鉴 ---------- */
  function openAchievements() {
    const m = JFeatures.readMeta();
    const achList = JFeaturesData.ACHIEVEMENTS.map(a => {
      const got = (m.achievements || []).includes(a.id);
      return `<div class="ach ${got ? 'got' : ''}"><span class="ach-ic">${a.icon}</span><div class="ach-tx"><b>${a.name}</b><p>${a.desc}</p></div>${got ? '<span class="ach-ok">✅</span>' : '<span class="ach-no">🔒</span>'}</div>`;
    }).join('');
    const endings = (m.endings || []).map(k => {
      const st = JFeaturesData.ENDING_STYLES.find(x => x.key === k);
      return `<span class="end-chip">🏁 ${st ? st.title : k}</span>`;
    }).join('') || '<span class="muted">还没解锁结局</span>';
    const traits = (m.traits || []).map(id => {
      const t = JFeaturesData.TRAITS.find(x => x.id === id);
      return t ? `<span class="end-chip">${t.icon} ${t.name}</span>` : '';
    }).join('') || '<span class="muted">暂无已购天赋</span>';
    const castChips = (s.castOrder || []).map(k => s.cast[k]).filter(Boolean).filter(ch => ch.appeared !== false).map(ch => `<span class="end-chip">${ch.emoji || '👤'} ${ch.name}</span>`).join('');
    const evCount = (s.milestones || []).length;
    openModal(`
      <h2>🏆 成就与图鉴</h2>
      <div class="meta-line">💎 人生点 <b class="gold">${m.points || 0}</b> ｜ 成就 <b>${(m.achievements || []).length}/${JFeaturesData.ACHIEVEMENTS.length}</b> ｜ 本局事件 <b>${evCount}</b></div>
      <div class="rep-sec"><h4>🎖️ 成就</h4><div class="ach-grid">${achList}</div></div>
      <div class="rep-sec"><h4>👥 人物图鉴（本局遇到）</h4><div class="chip-line">${castChips || '<span class="muted">还没认识什么人</span>'}</div></div>
      <div class="rep-sec"><h4>🏁 结局图鉴</h4><div class="chip-line">${endings}</div></div>
      <div class="rep-sec"><h4>✨ 天赋图鉴</h4><div class="chip-line">${traits}</div></div>
      <button class="btn primary" id="btnAchClose">知道了</button>`);
    $('btnAchClose').addEventListener('click', closeModal);
  }

  /* ---------- 手机（朋友圈 + 联系人） ---------- */
  function openFeed() {
    const posts = JFeatures.feedFor(s);
    const rows = posts.map((p, i) => {
      const liked = (s.feedLiked || []).includes(i);
      const commented = (s.feedComments || []).includes(i);
      return `<div class="feed-item">
        <div class="feed-head"><span class="feed-av">${['🧑‍🎓', '👩‍🎓', '🧑‍💻', '👨‍🏫'][i % 4]}</span><b>${p.author}</b></div>
        <div class="feed-text">${p.text}</div>
        <div class="feed-actions"><button class="btn sm ${liked ? 'liked' : ''}" data-i="${i}" ${liked ? 'disabled' : ''}>${liked ? '✅ 已点赞' : '👍 ' + p.likes}</button><button class="btn sm ${commented ? 'liked' : ''}" data-c="${i}" ${commented ? 'disabled' : ''}>${commented ? '✅ 已评论' : '💬 评论'}</button></div>
      </div>`;
    }).join('');
    const contacts = (s.castOrder || []).map(k => s.cast[k]).filter(ch => ch && ch.appeared !== false && ['father', 'mother', 'deskmate', 'roommate', 'lover', 'mentor'].includes(ch.key)).map(ch => `<button class="chip" data-contact="${ch.key}">${ch.emoji || '👤'} ${ch.name}</button>`).join('');
    openModal(`
      <h2>📱 手机</h2>
      <div class="rep-sec"><h4>👥 联系人（点击发消息）</h4><div class="chip-line">${contacts || '<span class="muted">暂无联系人</span>'}</div></div>
      <div class="rep-sec"><h4>📡 朋友圈</h4><div class="feed-list">${rows}</div></div>
      <button class="btn ghost" id="btnFeedClose">返回</button>`);
    s.feedUnread = 0;
    JStore.save(s);
    const dot = $('feedDot'); if (dot) dot.classList.add('hidden');
    document.querySelectorAll('#modalRoot [data-contact]').forEach(b => b.addEventListener('click', () => { closeModal(); openChat(b.dataset.contact); }));
    document.querySelectorAll('#modalRoot [data-i]').forEach(b => b.addEventListener('click', () => {
      const logs = JFeatures.likeFeed(s, +b.dataset.i);
      if (logs) { b.textContent = '✅ 已点赞'; b.classList.add('liked'); b.disabled = true; JUI.toast('👍 人脉 +1'); }
    }));
    const COMMENTS = ['哈哈哈哈', '太棒了！', '学到了学到了', '支持！', '羡慕了', '同款感受', '前排围观', '你太有才了'];
    document.querySelectorAll('#modalRoot [data-c]').forEach(b => b.addEventListener('click', () => {
      const logs = JFeatures.commentFeed(s, +b.dataset.c, COMMENTS[Math.floor(Math.random() * COMMENTS.length)]);
      if (logs) { b.textContent = '✅ 已评论'; b.classList.add('liked'); b.disabled = true; JUI.toast('💬 心态 +1'); }
    }));
    $('btnFeedClose').addEventListener('click', closeModal);
  }

  /* ---------- 自由活动 ---------- */
  function openFreeAct() {
    const pts = s.freePoints || 0;
    if (pts <= 0) { toast('今天的自由活动已经排满啦，先推剧情吧'); return; }
    const rows = JFeatures.FREE_ACTIONS.map(a => `<button class="btn option" data-k="${a.key}">${a.icon} <b>${a.name}</b> <span class="muted">${a.desc}</span></button>`).join('');
    openModal(`<h2>🎮 自由活动（剩余 ${pts} 次）</h2><p class="modal-sub">把时间花在哪，哪里就成长——这就是经营人生。</p><div class="options">${rows}</div>`);
    document.querySelectorAll('#modalRoot [data-k]').forEach(b => b.addEventListener('click', () => {
      const r = JFeatures.doFreeAction(s, b.dataset.k);
      closeModal();
      if (r) { JUI.toast(r.text); renderAll(); }
    }));
  }

  /* ---------- 路人支线 ---------- */
  function openFolkQuest(folkId) {
    const folk = JScene.folkAsChar(folkId);
    const q = JFeatures.questFor(folk);
    if (!q) { openChat('folk_' + folkId); return; }
    openModal(`
      <h2>❗ 支线 · ${q.title}</h2>
      <p class="step-desc">${q.desc}</p>
      <p class="muted">${folk ? folk.name : 'TA'} 正等着你的帮助。</p>
      <button class="btn primary" id="btnQuestDone">💪 帮助 TA</button>`);
    $('btnQuestDone').addEventListener('click', () => {
      const r = JFeatures.doFolkQuest(s, folk);
      closeModal();
      if (r) {
        JUI.toast(r.q.icon + ' 支线完成：' + r.q.reward);
        const fresh = JFeatures.checkAchievements(s);
        fresh.forEach(a => JUI.toast(a.icon + ' 成就解锁：' + a.name));
        renderAll();
      }
    });
  }

  /* ---------- 人生点结算（通关一次） ---------- */
  function grantPointsOnce() {
    if (!s || s.lifePointsGranted) return 0;
    s.lifePointsGranted = true;
    const pts = JFeatures.grantLifePoints(s);
    JStore.save(s);
    return pts;
  }

  /* ---------- 分享海报 ---------- */
  function openPoster() {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 480;
    JFeatures.drawPoster(canvas, s, () => {
      const dataUrl = canvas.toDataURL('image/png');
      openModal(`
        <h2>🖼️ 你的人生卡片</h2>
        <img src="${dataUrl}" style="width:100%;border-radius:14px;border:1px solid #e8e4dd">
        <div class="rep-actions" style="margin-top:12px">
          <a class="btn primary" href="${dataUrl}" download="我的人生卡片.png">⬇️ 下载图片</a>
          <button class="btn ghost" id="btnPosterClose">关闭</button>
        </div>`);
      $('btnPosterClose').addEventListener('click', closeModal);
    });
  }

  /* ---------- 时光机：从某阶段重来 ---------- */
  function restartFromStage(stageId) {
    const idx = JContent.STAGES.findIndex(x => x.id === stageId);
    if (idx < 0) return;
    if (!confirm('从「' + JContent.STAGES[idx].name + '」重新开始？该阶段之后的选择和进度会清空（属性和天赋保留）。')) return;
    s.stageIndex = idx;
    s.stepIndex = 0;
    s.ending = null;
    s.stageDone = (s.stageDone || []).filter(id => JContent.STAGES.findIndex(x => x.id === id) < idx);
    s.milestones = (s.milestones || []).filter(m => JContent.STAGES.findIndex(x => x.id === m.stage) < idx);
    s.extraEvents = {};
    s.freePoints = 3;
    JStore.save(s);
    closeModal();
    renderAll();
  }

  /* ---------- 开局天赋骰子 ---------- */
  function talentStep(name, gender, province, familyInfo, ms) {
    const m = JFeatures.readMeta();
    const cands = JFeatures.rollTraitCandidates();
    openModal(`
      <h2>🍀 开局天赋</h2>
      <p class="modal-sub">每个人生开局都带着一点「天赋」。选一个（也可以跳过——纯靠努力的人生也很酷）。</p>
      <div class="options">
        ${cands.map((t, i) => `<button class="btn option" data-t="${t.id}">${t.icon} <b>${t.name}</b> <span class="muted">${t.desc}</span></button>`).join('')}
        <button class="btn option" data-t="skip">🚫 不选天赋，纯凭努力</button>
      </div>
      <div class="modal-foot"><span class="muted">💎 人生点 ${m.points || 0}（通关后可解锁更多开局玩法）</span></div>`);
    document.querySelectorAll('#modalRoot [data-t]').forEach(b => b.addEventListener('click', () => {
      const traits = b.dataset.t === 'skip' ? [] : [b.dataset.t];
      quizStep(name, gender, province, familyInfo, traits);
    }));
  }

  /* ---------- 帮助 ---------- */
  function openHelp() {
    openModal(`
      <h2>❓ 怎么玩</h2>
      <ul class="help-list">
        <li>🎮 <b>移动</b>：WASD / 方向键，或点击地图让角色走过去。</li>
        <li>💬 <b>对话</b>：走到人物旁边按 <b>E</b>，或直接点击人物头像。</li>
        <li>📍 <b>任务指引</b>：金色光圈标记当前目标，跟着走就行。</li>
        <li>🎯 <b>职业路线</b>：右侧路线图实时打卡，走对会亮 ✅。</li>
        <li>🗨️ <b>话题</b>：重要的人聊学习/情感/生活/职业；职场的人只聊工作。</li>
        <li>🔄 一局约 15-30 分钟，可随时重开。</li>
      </ul>
      <button class="btn primary" id="btnHelpClose">知道了</button>`);
    $('btnHelpClose').addEventListener('click', closeModal);
  }

  function restart() {
    if (confirm('开始一段全新的平行人生吗？当前进度会保存为历史存档。')) {
      JStore.reset();
      s = null;
      openNewGame();
    }
  }

  return {
    init, renderAll, renderTopbar, openNewGame, openLibrary, openReport, openHelp, restart,
    openChat, closeModal, openModal, closeChat, toast, setProfileSeed
  };
})();
