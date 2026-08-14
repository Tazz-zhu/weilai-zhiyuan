/* 我的模拟人生路 v3.2 · 场景引擎：大世界镜头 / 原神式交互 / 动作对话支持 */
window.JScene = (() => {
  'use strict';

  const WORLD_K = 2.0; // 世界放大系数（地图变大，镜头跟随探索）

  let s = null;
  let wrapEl = null;
  let mapEl = null;
  let path = null;
  let scene = null;
  let player = { x: 150, y: 700, facing: { x: 0, y: 1 } };
  let playerEl = null;
  let npcEls = {};
  let npcPos = {};
  let anchorEls = {};
  let markerEl = null;
  let promptEl = null;
  let edgeArrowEl = null;
  let minimapCtx = null;
  let nightEl = null;
  let rainEl = null;
  let bannerEl = null;
  let keys = {};
  let waypoints = [];
  let walking = false;
  let objective = null;
  let interactCb = null;
  let spotCb = null;
  let rafId = 0;
  let lastMinimap = 0;
  let inPrompt = false;
  let promptType = null;
  let promptKey = null;
  let displayScale = 0.85;  // 镜头缩放（世界像素 → 屏幕像素）
  let worldTime = 8 * 60;
  let weather = { type: 'sunny', until: 0 };
  let bubbleTimers = {};
  let teleporting = false;
  let folkEls = {};
  let folkPos = {};
  let folkPatrol = {};
  let folkData = {};
  let pickups = [];
  let questFolkId = null;

  const WALK_SPEED = 230;
  const RUN_SPEED = 390;
  const INTERACT_R = 74;
  const MM_R = 72;

  /* ---------- 世界缩放 ---------- */
  function scalePt(p) { return p ? { x: Math.round(p.x * WORLD_K), y: Math.round(p.y * WORLD_K) } : p; }
  function scaleScene(raw) {
    return {
      ...raw,
      w: Math.round(raw.w * WORLD_K),
      h: Math.round(raw.h * WORLD_K),
      spawn: scalePt(raw.spawn),
      buildings: (raw.buildings || []).map(b => ({ ...b, x: Math.round(b.x * WORLD_K), y: Math.round(b.y * WORLD_K), w: Math.round(b.w * WORLD_K), h: Math.round(b.h * WORLD_K) })),
      paths: (raw.paths || []).map(p => ({ ...p, x: Math.round(p.x * WORLD_K), y: Math.round(p.y * WORLD_K), w: Math.round(p.w * WORLD_K), h: Math.round(p.h * WORLD_K) })),
      decor: (raw.decor || []).map(d => ({ ...d, x: Math.round(d.x * WORLD_K), y: Math.round(d.y * WORLD_K) })),
      extra: (raw.extra || []).map(x => {
        const fence = x.kind === 'fence';
        return { ...x, x: Math.round(x.x * WORLD_K), y: Math.round(x.y * WORLD_K), w: fence && x.w ? Math.round(x.w * WORLD_K) : x.w, h: fence && x.h ? Math.round(x.h * WORLD_K) : x.h };
      }),
      anchors: (raw.anchors || []).map(a => ({ ...a, x: Math.round(a.x * WORLD_K), y: Math.round(a.y * WORLD_K) }))
    };
  }

  /* ---------- 初始化 ---------- */
  function init(state, container) {
    s = state;
    wrapEl = container;
    wrapEl.innerHTML = '<div id="sceneMap"></div><div id="dayNightOverlay"></div><div id="rainOverlay"></div><div id="regionBanner" class="hidden"></div><canvas id="sceneMinimap" width="168" height="168"></canvas><div id="minimapName"></div><div id="edgeArrow" class="hidden"></div><div id="interactPrompt" class="hidden"></div><div id="zoomBtns"><button id="zoomIn" title="放大">＋</button><button id="zoomOut" title="缩小">－</button></div>';
    mapEl = document.getElementById('sceneMap');
    minimapCtx = document.getElementById('sceneMinimap').getContext('2d');
    nightEl = document.getElementById('dayNightOverlay');
    rainEl = document.getElementById('rainOverlay');
    bannerEl = document.getElementById('regionBanner');
    edgeArrowEl = document.getElementById('edgeArrow');
    promptEl = document.getElementById('interactPrompt');
    document.getElementById('zoomIn').addEventListener('click', () => setZoom(displayScale * 1.2));
    document.getElementById('zoomOut').addEventListener('click', () => setZoom(displayScale / 1.2));
    bindKeys();
    buildMap();
    placeNpcs();
    spawnPlayer();
    showRegionBanner(scene.name);
    requestAnimationFrame(loop);
  }

  function destroy() {
    if (rafId) cancelAnimationFrame(rafId);
    if (wrapEl) wrapEl.innerHTML = '';
    keys = {};
  }

  /* ---------- 地图构建 ---------- */
  function sceneOf() {
    const spots = JContent.STAGE_SPOTS[JEngine.stageOf(s) ? JEngine.stageOf(s).id : 's1'];
    const mapId = spots ? spots.map : 'hs';
    return JContent.SCENES[mapId] || JContent.SCENES.hs;
  }

  function buildMap() {
    scene = scaleScene(sceneOf());
    mapEl.style.width = scene.w + 'px';
    mapEl.style.height = scene.h + 'px';
    mapEl.style.background = scene.bg;
    mapEl.style.backgroundImage = 'radial-gradient(rgba(110,175,105,.35) 1.6px, transparent 1.6px), radial-gradient(rgba(255,255,255,.14) 1.6px, transparent 1.6px), linear-gradient(180deg, ' + scene.bg + ' 0%, ' + shadeBg(scene.bg, -8) + ' 100%)';
    mapEl.style.backgroundSize = '46px 46px, 72px 72px, 100% 100%';
    let html = '';
    // 远景层（远山与云）
    html += `<div class="map-scenery">${scenerySVG()}</div>`;
    (scene.paths || []).forEach(p => {
      html += `<div class="map-road" style="left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;background:${scene.road};border-top:2px dashed ${scene.roadLine};border-bottom:2px dashed ${scene.roadLine}"></div>`;
    });
    (scene.buildings || []).forEach(b => {
      const side = (window.Art3D && Art3D.side) ? Art3D.side(b) : 0;
      const svg = (window.Art3D && Art3D.building) ? Art3D.building(b) : '';
      const z = Math.round(b.y + b.h + side + 4);
      html += `<div class="map-building b3d" data-id="${b.id}" style="left:${b.x}px;top:${b.y}px;width:${b.w + side}px;height:${b.h + side}px;z-index:${z}">
        ${svg}
        <div class="b-label" style="bottom:${side + 2}px">${b.name}</div>
      </div>`;
    });
    (scene.decor || []).forEach(d => {
      const svg = (window.Art && Art.decorSVG ? Art.decorSVG(d) : `<span>${d.e}</span>`);
      html += `<div class="map-decor" style="left:${d.x}px;top:${d.y}px;z-index:${Math.round(d.y + 22)}">${svg}</div>`;
    });
    (scene.extra || []).forEach((x, i) => {
      html += `<div class="map-extra extra-${x.kind}" style="left:${x.x}px;top:${x.y}px;width:${x.w || 64}px;height:${x.h || 64}px;z-index:${Math.round(x.y + 36)}">${extraSVG(x.kind)}</div>`;
    });
    (scene.anchors || []).forEach(a => {
      html += `<div class="anchor" data-id="${a.id}" title="传送：${a.name}" style="left:${a.x}px;top:${a.y}px;z-index:4000"><div class="a-core"></div><div class="a-ring"></div></div>`;
    });
    html += `<div id="objMarker" class="hidden"></div>`;
    mapEl.innerHTML = html;
    markerEl = document.getElementById('objMarker');
    anchorEls = {};
    mapEl.querySelectorAll('.anchor').forEach(el => {
      anchorEls[el.dataset.id] = el;
      el.addEventListener('click', e => { e.stopPropagation(); openAnchorMenu(); });
    });
    mapEl.addEventListener('click', e => { if (e.target === mapEl || e.target.classList.contains('map-road') || e.target.classList.contains('map-building') || e.target.classList.contains('map-decor') || e.target.classList.contains('map-extra')) clickToMove(e); });
    mapEl.addEventListener('wheel', e => { e.preventDefault(); setZoom(displayScale * (e.deltaY < 0 ? 1.12 : 0.89)); }, { passive: false });
    path = new TownPath({ w: scene.w, h: scene.h }, scene.buildings || []);
    playerEl = document.createElement('div');
    playerEl.className = 'sprite player';
    mapEl.appendChild(playerEl);
    renderSprite(playerEl, playerAvatar(), '你');
    player = { ...(scene.spawn || { x: 150, y: 700 }), facing: { x: 0, y: 1 } };
    placeSprite(playerEl, player);
    spawnPickups();
  }
const PICKUP_KINDS = [
    { e: '📕', fx: { study: 1 }, name: '学习资料' },
    { e: '⭐', fx: { mood: 1 }, name: '幸运星' },
    { e: '🍀', fx: { mood: 2 }, name: '四叶草' },
    { e: '🧾', fx: { money: 2 }, name: '饭卡' },
    { e: '🎧', fx: { mood: 1 }, name: '耳机' },
    { e: '✏️', fx: { study: 1 }, name: '笔记本' },
    { e: '💡', fx: { ability: 1 }, name: '灵感' },
    { e: '🧸', fx: { mood: 1 }, name: '小玩偶' }
  ];
  function spawnPickups() {
    pickups.forEach(p => { if (p.el && p.el.parentNode) p.el.parentNode.removeChild(p.el); });
    pickups = [];
    let tries = 0;
    while (pickups.length < 4 && tries++ < 80) {
      const x = 60 + Math.random() * (scene.w - 120);
      const y = 60 + Math.random() * (scene.h - 120);
      if (!canStand(x, y)) continue;
      const kind = PICKUP_KINDS[Math.floor(Math.random() * PICKUP_KINDS.length)];
      const el = document.createElement('div');
      el.className = 'pickup';
      el.innerHTML = `<span>${kind.e}</span>`;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.zIndex = Math.round(y) + 2;
      mapEl.appendChild(el);
      const item = { x, y, kind, el, taken: false };
      el.addEventListener('click', e => {
        e.stopPropagation();
        if (item.taken) return;
        item.taken = true;
        el.classList.add('taken');
        const logs = JStore.applyFx(s, item.kind.fx);
        s.pickupTotal = (s.pickupTotal || 0) + 1;
        JStore.addMilestone(s, '拾取了' + item.kind.name);
        JStore.save(s);
        if (window.JUI && JUI.toast) JUI.toast(item.kind.e + ' 拾取' + item.kind.name + (logs.length ? ' ' + logs.map(l => (l.delta > 0 ? '+' : '') + l.delta).join(' ') : ''));
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
      });
      pickups.push(item);
    }
  }

  function shadeBg(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function scenerySVG() {
    return `<svg viewBox="0 0 1400 800" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
      <path d="M0 230 Q 200 130 420 210 T 840 200 T 1260 220 L 1400 210 L 1400 0 L 0 0 Z" fill="rgba(110,175,120,.38)"/>
      <path d="M0 270 Q 260 170 560 250 T 1120 240 T 1400 260 L 1400 0 L 0 0 Z" fill="rgba(135,200,140,.26)"/>
      <ellipse cx="210" cy="76" rx="72" ry="24" fill="rgba(255,255,255,.6)"/>
      <ellipse cx="275" cy="66" rx="46" ry="17" fill="rgba(255,255,255,.5)"/>
      <ellipse cx="920" cy="96" rx="82" ry="26" fill="rgba(255,255,255,.55)"/>
      <ellipse cx="1005" cy="85" rx="50" ry="18" fill="rgba(255,255,255,.45)"/>
      <ellipse cx="560" cy="52" rx="42" ry="14" fill="rgba(255,255,255,.45)"/>
      <ellipse cx="1250" cy="58" rx="38" ry="13" fill="rgba(255,255,255,.4)"/>
    </svg>`;
  }

  function extraSVG(kind) {
    const D = '#3a3a4a';
    if (kind === 'streetlight') {
      return `<svg viewBox="0 0 44 72" width="44" height="72">
        <ellipse cx="22" cy="66" rx="14" ry="3" fill="rgba(40,30,15,.18)"/>
        <rect x="19" y="22" width="6" height="46" rx="3" fill="#5b5b70" stroke="${D}" stroke-width="1.6"/>
        <path d="M13 24 q9 -7 18 0 l-2 7 q-7 -4 -14 0 Z" fill="#3d3d52" stroke="${D}" stroke-width="1.6"/>
        <ellipse cx="22" cy="20" rx="9" ry="4" fill="#ffd76e" opacity=".95" stroke="#e8a200" stroke-width="1.4"/>
        <ellipse cx="22" cy="20" rx="14" ry="8" fill="#ffd76e" opacity=".18"/>
      </svg>`;
    }
    if (kind === 'flag') {
      return `<svg viewBox="0 0 56 60" width="56" height="60">
        <ellipse cx="28" cy="55" rx="14" ry="3" fill="rgba(40,30,15,.15)"/>
        <rect x="25" y="6" width="6" height="52" rx="3" fill="#8a7a5a" stroke="${D}" stroke-width="1.6"/>
        <path d="M28 8 L56 20 L28 32 Z" fill="#ff8a8a" stroke="${D}" stroke-width="1.6" stroke-linejoin="round"/>
        <circle cx="40" cy="19" r="3" fill="#fff" opacity=".85"/>
      </svg>`;
    }
    if (kind === 'bench') return (window.Art && Art.propSVG) ? Art.propSVG('bench') : '';
    if (kind === 'fence') {
      let posts = '';
      for (let x = 6; x < 64; x += 14) posts += `<rect x="${x}" y="4" width="5" height="16" rx="2" fill="#a9714b" stroke="${D}" stroke-width="1.4"/>`;
      return `<svg viewBox="0 0 64 22" width="100%" height="100%" preserveAspectRatio="none">
        ${posts}
        <rect x="0" y="10" width="64" height="4" rx="2" fill="#c9a86a" stroke="${D}" stroke-width="1.4"/>
        <rect x="0" y="18" width="64" height="4" rx="2" fill="#c9a86a" stroke="${D}" stroke-width="1.4"/>
      </svg>`;
    }
    return '';
  }

  /* ---------- 镜头（跟随玩家） ---------- */
  function applyCamera() {
    if (!mapEl || !wrapEl) return;
    const r = wrapEl.getBoundingClientRect();
    mapEl.style.transformOrigin = '0 0';
    mapEl.style.transform = `translate(${Math.round(r.width / 2 - player.x * displayScale)}px, ${Math.round(r.height / 2 - player.y * displayScale)}px) scale(${displayScale})`;
  }
  function fitMap() { applyCamera(); }
  function setZoom(z) {
    displayScale = Math.max(0.45, Math.min(1.5, z));
    applyCamera();
  }

  function showRegionBanner(name) {
    if (!bannerEl) return;
    bannerEl.innerHTML = name;
    bannerEl.classList.remove('hidden');
    bannerEl.classList.add('show');
    clearTimeout(bannerEl._t);
    bannerEl._t = setTimeout(() => bannerEl.classList.remove('show'), 2200);
  }

  function playerAvatar() {
    const stage = JEngine.stageOf(s);
    const age = stage && ['s1','s2','s3','s4'].includes(stage.id) ? 16 : stage && ['s5','s6','s7','s8','s8b'].includes(stage.id) ? 20 : 24;
    return { id: 'v2_player', name: s.prot.name, gender: s.prot.gender, age, role: 'worker', emoji: '🧑‍🎓', career: null };
  }
  /* ---------- NPC 布置 ---------- */
  function placeNpcs() {
    Object.keys(npcEls).forEach(k => { if (npcEls[k] && npcEls[k].parentNode) npcEls[k].parentNode.removeChild(npcEls[k]); });
    npcEls = {};
    npcPos = {};
    Object.keys(folkEls).forEach(k => { if (folkEls[k] && folkEls[k].parentNode) folkEls[k].parentNode.removeChild(folkEls[k]); });
    folkEls = {}; folkPos = {}; folkPatrol = {}; folkData = {};
    placeFolk();
    const spots = JContent.STAGE_SPOTS[JEngine.stageOf(s) ? JEngine.stageOf(s).id : 's1'] || {};
    const order = s.castOrder || [];
    order.forEach(key => {
      const ch = s.cast[key];
      if (!ch || ch.appeared === false) return;
      const p = scalePt((spots.npc || {})[key]);
      if (!p) return;
      const el = document.createElement('div');
      const stageId = JEngine.stageOf(s) ? JEngine.stageOf(s).id : 's1';
      const isPhone = (key === 'father' || key === 'mother') && !['s1','s2','s3','s4'].includes(stageId);
      el.className = 'sprite npc' + (ch.tier === 1 ? ' important' : '') + (isPhone ? ' phone' : '');
      el.dataset.key = key;
      const career = ch.careerId ? LIB_career(ch.careerId) : null;
      const av = { id: 'v2_' + key, name: ch.name, gender: ch.gender, age: ch.age || 20, role: 'worker', emoji: ch.emoji || '🙂', career };
      el.innerHTML = `<img src="${AvatarSvg.avatarDataUri(av, 104, 'happy')}">
        <div class="s-name">${ch.name}${isPhone ? ' 📱' : ''}</div>
        ${ch.tier === 1 ? '<div class="s-star">★</div>' : ''}
        ${isPhone ? '<div class="s-phone">📱</div>' : ''}
        ${s.loverKey === key ? '<div class="s-love">💛</div>' : ''}
        <div class="s-icon hidden"></div>
        <div class="s-bubble hidden"></div>`;
      mapEl.appendChild(el);
      npcEls[key] = el;
      npcPos[key] = { x: p.x, y: p.y };
      placeSprite(el, p);
      el.addEventListener('click', e => { e.stopPropagation(); if (interactCb) interactCb(key); });
      startBubble(key, el);
    });
    updateNpcIcons();
  }

  const BUBBLES = ['……', '嗯？', '今天天气不错', '最近有点累', '加油呀！', '嘿嘿', '在想事情…', '你来了？', '好想喝奶茶', '在忙呢'];
  function startBubble(key, el) {
    clearInterval(bubbleTimers[key]);
    bubbleTimers[key] = setInterval(() => {
      if (el.classList.contains('talking')) return;
      if (Math.random() < 0.55) return;
      const b = el.querySelector('.s-bubble');
      if (!b) return;
      b.textContent = BUBBLES[Math.floor(Math.random() * BUBBLES.length)];
      b.classList.remove('hidden');
      b.classList.add('show');
      clearTimeout(b._t);
      b._t = setTimeout(() => { b.classList.remove('show'); b.classList.add('hidden'); }, 2600);
    }, 5000 + Math.random() * 6000);
  }

  function updateNpcIcons() {
    const isNpcTarget = objective && objective.target && objective.target.type === 'npc';
    Object.keys(npcEls).forEach(k => {
      const el = npcEls[k];
      const icon = el.querySelector('.s-icon');
      if (!icon) return;
      if (isNpcTarget && objective.target.key === k) {
        icon.textContent = '❗';
        icon.classList.remove('hidden');
        icon.classList.add('quest');
      } else if (s.cast[k] && (k === 'father' || k === 'mother')) {
        icon.textContent = '📱';
        icon.classList.remove('hidden');
        icon.classList.remove('quest');
      } else if (s.cast[k] && s.cast[k].tier === 1) {
        icon.textContent = '💬';
        icon.classList.remove('hidden');
        icon.classList.remove('quest');
      } else {
        icon.classList.add('hidden');
      }
    });
  }

  /* ---------- 普通 NPC（路人） ---------- */
  const FOLK_CATEGORY = {
    '同学': '教育科研', '学霸同学': '教育科研', '晨跑同学': '教育科研', '夜跑同学': '教育科研', '自习同学': '教育科研', '社团招新同学': '教育科研',
    '食堂阿姨': '生活服务与新消费', '保洁阿姨': '生活服务与新消费', '咖啡师': '生活服务与新消费', '前台小姐姐': '生活服务与新消费',
    '图书管理员': '教育科研', '保安大叔': '政法与公共服务', '快递小哥': '交通与物流', '外卖小哥': '交通与物流',
    '园丁爷爷': '农业与食品', '园丁阿姨': '农业与食品', '加班的程序员': '互联网科技'
  };
  function folkList() {
    return (JContent.FOLK || {})[sceneOf().id] || [];
  }
  function folkAvatar(f) {
    const cat = FOLK_CATEGORY[f.role] || '教育科研';
    return { id: 'folk_' + f.id, name: f.name, gender: f.gender || '男', age: f.age || 25, role: 'worker', emoji: f.emoji || '🙂', career: { category: cat } };
  }
  function folkAsChar(id) {
    const f = folkList().find(x => x.id === id);
    if (!f) return null;
    return {
      key: 'folk_' + f.id, name: f.name, gender: f.gender || '男', age: f.age || 25,
      role: f.role, tier: 3, persona: f.role + '（路人）', topics: ['greet'],
      emoji: f.emoji || '🙂', career: null, appeared: true, folk: true, lines: f.lines || []
    };
  }
  function folkReply(id, msg) {
    const f = folkList().find(x => x.id === id);
    const arr = (f && f.lines) || ['嗨！'];
    if (/职业|工作|做什么|工资|累不累/.test(msg)) return '我哪懂那些呀，我就是个' + (f ? f.role : '路人') + '，你问那边穿正装的老师吧。';
    if (/你好|您好|嗨|hello|hi/.test(msg)) return arr[0];
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function placeFolk() {
    const cfg = folkList();
    const stageId = JEngine.stageOf(s) ? JEngine.stageOf(s).id : 's1';
    let h = 0; for (const ch of stageId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    questFolkId = cfg.length ? cfg[h % cfg.length].id : null;
    cfg.forEach(f => {
      const isQuest = questFolkId === f.id;
      const el = document.createElement('div');
      el.className = 'sprite npc folk' + (isQuest ? ' quest' : '');
      el.dataset.folk = f.id;
      const av = folkAvatar(f);
      el.innerHTML = `<img src="${AvatarSvg.avatarDataUri(av, 96, 'happy')}"><div class="s-name">${f.name}</div>${isQuest ? '<div class="s-quest">❗</div>' : ''}`;
      mapEl.appendChild(el);
      const pos = scalePt({ x: f.x, y: f.y });
      placeSprite(el, pos);
      folkEls[f.id] = el;
      folkPos[f.id] = { ...pos };
      folkData[f.id] = f;
      if (f.patrol && f.patrol.length > 1) {
        folkPatrol[f.id] = { pts: f.patrol.map(p => scalePt(p)), idx: 0, wait: 1 + Math.random() * 2 };
      }
      el.addEventListener('click', e => { e.stopPropagation(); if (interactCb) interactCb('folk_' + f.id); });
      startFolkBubble(f.id, el);
    });
  }
  const FOLK_BUBBLES = ['……', '嗯？', '今天天气不错', '好忙啊', '嘿！', '在忙呢', '你好呀', '别急，慢慢来'];
  function startFolkBubble(id, el) {
    setInterval(() => {
      if (!folkEls[id] || el.classList.contains('talking')) return;
      if (Math.random() < 0.6) return;
      const b = el.querySelector('.s-bubble');
      if (!b) return;
      b.textContent = FOLK_BUBBLES[Math.floor(Math.random() * FOLK_BUBBLES.length)];
      b.classList.remove('hidden');
      b.classList.add('show');
      clearTimeout(b._t);
      b._t = setTimeout(() => { b.classList.remove('show'); b.classList.add('hidden'); }, 2400);
    }, 6000 + Math.random() * 5000);
  }
  function moveFolk(dt) {
    Object.keys(folkPatrol).forEach(id => {
      const pp = folkPatrol[id];
      const el = folkEls[id];
      const cur = folkPos[id];
      if (!el || !cur) return;
      if (pp.wait > 0) { pp.wait -= dt; return; }
      const target = pp.pts[pp.idx];
      const dx = target.x - cur.x, dy = target.y - cur.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) {
        pp.idx = (pp.idx + 1) % pp.pts.length;
        pp.wait = 2 + Math.random() * 3;
      } else {
        const spd = 65 * dt;
        cur.x += dx / d * Math.min(spd, d);
        cur.y += dy / d * Math.min(spd, d);
        el.style.left = cur.x + 'px';
        el.style.top = cur.y + 'px';
        el.style.marginLeft = '-34px';
        el.style.marginTop = '-92px';
        el.style.zIndex = Math.round(cur.y);
        el.style.transform = dx < 0 ? 'scaleX(-1)' : 'scaleX(1)';
      }
    });
  }

  function LIB_career(id) {
    return (window.__v2Lib && window.__v2Lib.careers || []).find(c => c.id === id) || null;
  }

  function placeSprite(el, pos, facing) {
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    el.style.marginLeft = (-34) + 'px';
    el.style.marginTop = (-92) + 'px';
    el.style.zIndex = Math.round(pos.y);
    if (facing && facing.x !== 0) {
      el.style.transform = facing.x < 0 ? 'scaleX(-1)' : 'scaleX(1)';
    }
  }

  function spawnPlayer() {
    const sp = scene.spawn || { x: 150, y: 700 };
    player = { ...sp, facing: { x: 0, y: 1 } };
    placeSprite(playerEl, player);
    walking = false; waypoints = [];
    applyCamera();
  }

  /* ---------- 目标标记 & 边缘箭头 ---------- */
  function setObjective(obj) {
    objective = obj || null;
    if (objective && objective.target && objective.target.type === 'spot') {
      objective.target = { ...objective.target, x: Math.round(objective.target.x * WORLD_K), y: Math.round(objective.target.y * WORLD_K) };
    }
    updateMarker();
    updateNpcIcons();
  }

  function objectivePos() {
    if (!objective || !objective.target) return null;
    const t = objective.target;
    if (t.type === 'npc') return npcPos[t.key] || null;
    if (t.type === 'spot') return { x: t.x, y: t.y };
    return null;
  }

  function updateMarker() {
    if (!markerEl) return;
    const p = objectivePos();
    if (!p) { markerEl.classList.add('hidden'); return; }
    markerEl.classList.remove('hidden');
    markerEl.classList.toggle('spot', objective.target.type === 'spot');
    markerEl.classList.toggle('npc-target', objective.target.type === 'npc');
    markerEl.style.left = p.x + 'px';
    markerEl.style.top = p.y + 'px';
    markerEl.style.marginLeft = '-20px';
    markerEl.style.marginTop = '-88px';
  }

  function updateEdgeArrow() {
    if (!edgeArrowEl) return;
    const p = objectivePos();
    if (!p) { edgeArrowEl.classList.add('hidden'); return; }
    const mr = mapEl.getBoundingClientRect();
    const wr = wrapEl.getBoundingClientRect();
    const scale = mr.width / scene.w;
    const sx = mr.left + p.x * scale;
    const sy = mr.top + p.y * scale;
    const pad = 26;
    const inside = sx > wr.left + pad && sx < wr.right - pad && sy > wr.top + pad && sy < wr.bottom - pad;
    if (inside) { edgeArrowEl.classList.add('hidden'); return; }
    const cx = wr.left + wr.width / 2, cy = wr.top + wr.height / 2;
    const ang = Math.atan2(sy - cy, sx - cx);
    const ex = cx + Math.cos(ang) * (Math.min(wr.width, wr.height) / 2 - 34);
    const ey = cy + Math.sin(ang) * (Math.min(wr.width, wr.height) / 2 - 34);
    edgeArrowEl.style.left = ex + 'px';
    edgeArrowEl.style.top = ey + 'px';
    edgeArrowEl.style.transform = `rotate(${ang + Math.PI / 2}rad)`;
    edgeArrowEl.classList.remove('hidden');
  }

  /* ---------- 交互 ---------- */
  function nearestInteractable() {
    if (!objective || !objective.target) return null;
    const p = objectivePos();
    if (!p) return null;
    if (Math.hypot(player.x - p.x, player.y - p.y) <= INTERACT_R) {
      if (objective.target.type === 'npc') return { type: 'npc', key: objective.target.key };
      return { type: 'spot' };
    }
    return null;
  }

  function showPrompt(p) {
    if (p) {
      promptEl.classList.remove('hidden');
      if (p.type === 'npc') {
        const ch = s.cast[p.key];
        promptEl.innerHTML = `💬 与 <b>${ch ? ch.name : ''}</b> 对话 <span class="key">E</span>`;
      } else {
        promptEl.innerHTML = `🔍 调查 <span class="key">E</span>`;
      }
      inPrompt = true; promptType = p.type; promptKey = p.key || null;
    } else {
      promptEl.classList.add('hidden');
      inPrompt = false; promptType = null; promptKey = null;
    }
  }

  function doInteract() {
    if (!inPrompt) return;
    if (promptType === 'npc' && interactCb) interactCb(promptKey);
    else if (promptType === 'spot' && spotCb) spotCb();
  }

  function teleportToObjective() {
    const p = objectivePos();
    if (!p || !objective) return;
    flashTeleport(() => {
      player = { ...p, facing: { x: 0, y: 1 } };
      placeSprite(playerEl, player);
      walking = false; waypoints = [];
      applyCamera();
      const t = objective.target || {};
      if (t.type === 'npc' && interactCb) interactCb(t.key);
      else if (t.type === 'spot' && spotCb) spotCb();
    });
  }

  function flashTeleport(done) {
    if (teleporting) return;
    teleporting = true;
    let f = document.getElementById('teleFlash');
    if (!f) { f = document.createElement('div'); f.id = 'teleFlash'; wrapEl.appendChild(f); }
    f.classList.add('show');
    setTimeout(() => {
      f.classList.remove('show');
      teleporting = false;
      if (done) done();
    }, 380);
  }

  /* ---------- 锚点传送 ---------- */
  function openAnchorMenu() {
    const list = (scene.anchors || []).map(a => `<button class="btn option anchor-opt" data-id="${a.id}">⚡ ${a.name}</button>`).join('');
    if (!list) return;
    if (window.JUI) {
      JUI.openModal(`<h2>⚡ 传送锚点</h2><p class="modal-sub">选择要传送到的位置</p><div class="options">${list}</div>`);
      document.querySelectorAll('#modalRoot .anchor-opt').forEach(b => b.addEventListener('click', () => {
        const a = (scene.anchors || []).find(x => x.id === b.dataset.id);
        JUI.closeModal();
        if (a) flashTeleport(() => {
          player = { x: a.x, y: a.y, facing: { x: 0, y: 1 } };
          placeSprite(playerEl, player);
          walking = false; waypoints = [];
          applyCamera();
        });
      }));
    }
  }
  /* ---------- 移动 ---------- */
  function bindKeys() {
    window.addEventListener('keydown', e => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === 'e' || e.key === 'E') doInteract();
      if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','shift'].includes(e.key.toLowerCase())) e.preventDefault();
    });
    window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  }

  function keyVec() {
    let dx = 0, dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    if (dx || dy) { const m = Math.hypot(dx, dy); return { x: dx / m, y: dy / m }; }
    return null;
  }

  function canStand(x, y) {
    const cell = path.cellAt(x, y);
    if (!cell) return false;
    if (path.isBlocked(cell.x, cell.y)) return false;
    for (const b of scene.buildings || []) {
      if (x > b.x - 6 && x < b.x + b.w + 6 && y > b.y - 6 && y < b.y + b.h + 6) {
        const px = x - (b.x + b.w / 2), py = y - (b.y + b.h / 2);
        if (Math.abs(px) < b.w / 2 && Math.abs(py) < b.h / 2) return false;
      }
    }
    return x > 12 && y > 12 && x < scene.w - 12 && y < scene.h - 12;
  }

  function moveBy(dx, dy, dt, speed) {
    const step = speed * dt;
    const nx = player.x + dx * step;
    const ny = player.y + dy * step;
    if (canStand(nx, player.y)) player.x = nx;
    if (canStand(player.x, ny)) player.y = ny;
    player.facing = { x: dx, y: dy };
  }

  function clickToMove(e) {
    const rect = mapEl.getBoundingClientRect();
    const scale = rect.width / scene.w;
    const tx = (e.clientX - rect.left) / scale;
    const ty = (e.clientY - rect.top) / scale;
    const p = path.findPath(player.x, player.y, tx, ty);
    if (p) { waypoints = p; walking = true; }
  }

  /* ---------- 主循环 ---------- */
  let lastT = 0;
  let lastWeatherCheck = 0;
  function loop(t) {
    rafId = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    if (!s || !playerEl) return;
    worldTime = (worldTime + dt * 2) % 1440;
    updateDayNight();
    if (t - lastWeatherCheck > 1500) {
      lastWeatherCheck = t;
      updateWeather();
    }
    const kv = keyVec();
    const running = !!(keys['shift']);
    const speed = running ? RUN_SPEED : WALK_SPEED;
    if (kv) {
      walking = false; waypoints = [];
      moveBy(kv.x, kv.y, dt, speed);
      playerEl.classList.add('walking');
      playerEl.classList.toggle('running', running);
    } else if (walking && waypoints.length) {
      const wp = waypoints[0];
      const dx = wp.x - player.x, dy = wp.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) { waypoints.shift(); }
      else {
        const step = Math.min(speed * dt, d);
        const nx = player.x + dx / d * step, ny = player.y + dy / d * step;
        if (canStand(nx, player.y)) player.x = nx;
        if (canStand(player.x, ny)) player.y = ny;
        player.facing = { x: dx / d, y: dy / d };
      }
      playerEl.classList.add('walking');
      if (!waypoints.length) walking = false;
    } else {
      playerEl.classList.remove('walking');
      playerEl.classList.remove('running');
    }
    placeSprite(playerEl, player, player.facing);
    moveFolk(dt);
    applyCamera();
    showPrompt(nearestInteractable());
    updateEdgeArrow();
    if (t - lastMinimap > 160) { lastMinimap = t; drawMinimap(); }
  }

  /* ---------- 昼夜与天气 ---------- */
  function updateDayNight() {
    if (!nightEl) return;
    const m = worldTime;
    let alpha = 0, hue = 0;
    if (m >= 6 * 60 && m < 8 * 60) { alpha = 0.06; hue = 0.06; }
    else if (m >= 8 * 60 && m < 17 * 60) { alpha = 0; }
    else if (m >= 17 * 60 && m < 19 * 60) { alpha = 0.16; hue = 0.18; }
    else if (m >= 19 * 60 && m < 21 * 60) { alpha = 0.32; hue = 0.22; }
    else { alpha = 0.48; hue = 0.26; }
    if (weather.type === 'rain') alpha = Math.min(0.42, alpha + 0.08);
    nightEl.style.background = `linear-gradient(180deg, rgba(18,26,70,${alpha}) 0%, rgba(12,18,52,${alpha * 1.15}) 100%)`;
    nightEl.style.opacity = 1;
    nightEl.style.filter = hue > 0 ? `sepia(${hue})` : 'none';
  }

  function updateWeather() {
    const now = Date.now();
    if (weather.type === 'sunny' && now > weather.until && Math.random() < 0.05) {
      weather = { type: 'rain', until: now + 70000 + Math.random() * 80000 };
    } else if (weather.type === 'rain' && now > weather.until) {
      weather = { type: 'sunny', until: now + 30000 };
    }
    if (rainEl) rainEl.classList.toggle('show', weather.type === 'rain');
  }

  /* ---------- 全景小地图 + 视野框 ---------- */
  function drawMinimap() {
    if (!minimapCtx) return;
    const ctx = minimapCtx;
    const W = 168, H = 168, R = MM_R;
    const cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
    const k = (R * 2) / Math.max(scene.w, scene.h);
    const ox = cx - scene.w * k / 2;
    const oy = cy - scene.h * k / 2;
    ctx.fillStyle = scene.bg;
    ctx.fillRect(0, 0, W, H);
    (scene.paths || []).forEach(p => {
      ctx.fillStyle = '#a8946a';
      ctx.fillRect(ox + p.x * k, oy + p.y * k, p.w * k, p.h * k);
    });
    (scene.buildings || []).forEach(b => {
      ctx.fillStyle = '#5b6b8f';
      ctx.fillRect(ox + b.x * k, oy + b.y * k, b.w * k, b.h * k);
    });
    // 视野框
    const wr = wrapEl.getBoundingClientRect();
    const vw = wr.width / displayScale, vh = wr.height / displayScale;
    ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1;
    ctx.strokeRect(ox + player.x * k - vw * k / 2, oy + player.y * k - vh * k / 2, vw * k, vh * k);
    // NPC
    Object.keys(npcPos).forEach(key => {
      const imp = s.cast[key] && s.cast[key].tier === 1;
      ctx.fillStyle = imp ? '#ffd76e' : '#ffffff';
      ctx.beginPath(); ctx.arc(ox + npcPos[key].x * k, oy + npcPos[key].y * k, imp ? 3 : 2.2, 0, 7); ctx.fill();
    });
    // 目标
    const op = objectivePos();
    if (op) {
      ctx.strokeStyle = '#ffd76e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ox + op.x * k, oy + op.y * k, 6, 0, 7); ctx.stroke();
    }
    // 玩家
    const ang = Math.atan2(player.facing.y, player.facing.x);
    ctx.save();
    ctx.translate(ox + player.x * k, oy + player.y * k); ctx.rotate(ang);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(-4.5, 5); ctx.lineTo(0, 2.5); ctx.lineTo(4.5, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
    // 边框
    ctx.strokeStyle = 'rgba(255,215,110,.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R - 3.5, 0, 7); ctx.stroke();
    const nm = document.getElementById('minimapName');
    if (nm) nm.textContent = scene.name.replace(/^[^\u4e00-\u9fa5]+/, '');
  }

  /* ---------- 工具 ---------- */
  function renderSprite(el, npc, name) {
    const img = AvatarSvg.avatarDataUri(npc, 104, 'happy');
    el.innerHTML = `<img src="${img}"><div class="s-name">${name}</div>`;
  }

  return {
    init, destroy, sync: placeNpcs, fitMap, spawnPlayer, teleportToObjective, showRegionBanner,
    setObjective, onInteract(cb) { interactCb = cb; }, onSpotReach(cb) { spotCb = cb; },
    clickToMove, playerPos: () => ({ ...player }), getNpcPos: key => npcPos[key] || null,
    sceneOf, setZoom, worldK: WORLD_K,
    folkList, folkAsChar, folkReply, questFolkId: () => questFolkId, pickupCount: () => pickups.filter(p => !p.taken).length
  };
})();
