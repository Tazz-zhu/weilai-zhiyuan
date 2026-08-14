/* 人生模拟舱 · 存档与状态管理（SQLite 多存档 + localStorage 缓存 + 游客/登录双身份） */
window.JStore = (() => {
  'use strict';
  const ATTR_DEFS = [
    { key: 'study',  label: '学业', icon: '📚', color: '#5c7cfa', desc: '成绩 / 绩点' },
    { key: 'ability',label: '能力', icon: '🧩', color: '#12b886', desc: '技能 / 证书 / 作品' },
    { key: 'social', label: '人脉', icon: '🤝', color: '#7048e8', desc: '关系网 / 亲密度' },
    { key: 'mood',   label: '心态', icon: '😊', color: '#fab005', desc: '幸福 / 抗压' },
    { key: 'health', label: '健康', icon: '❤️', color: '#e8590c', desc: '身体状态' },
    { key: 'money',  label: '财富', icon: '💰', color: '#f5a623', desc: '生活费 / 收入' }
  ];

  const GUEST_KEY = 'msrl_guest';
  let currentRunId = null;

  function guestId() {
    let g = null;
    try { g = localStorage.getItem(GUEST_KEY); } catch (e) {}
    if (!g) {
      g = 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem(GUEST_KEY, g); } catch (e) {}
    }
    return g;
  }

  function token() { try { return localStorage.getItem('zy_token') || null; } catch (e) { return null; } }

  async function req(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const tk = token();
    if (tk) headers['Authorization'] = 'Bearer ' + tk;
    else headers['X-Guest-Id'] = guestId();
    let res;
    try {
      res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch (e) { throw new Error('网络连接失败'); }
    let json = null;
    try { json = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error((json && json.error) || '请求失败 (' + res.status + ')');
    return json;
  }

  function cacheKey(id) { return 'msrl_v2_save_' + id; }
  function cacheWrite(id, s) { try { localStorage.setItem(cacheKey(id), JSON.stringify(s)); } catch (e) {} }
  function cacheRead(id) {
    try { return JSON.parse(localStorage.getItem(cacheKey(id)) || 'null'); } catch (e) { return null; }
  }

  function freshState() {
    return {
      version: 1,
      createdAt: Date.now(),
      prot: { name: '', gender: '男', family: '', province: '广东', holland: [], personality: '', traits: [] },
      careerId: null,
      stageIndex: 0,
      stepIndex: 0,
      stageDone: [],
      flags: {},
      attrs: { study: 50, ability: 40, social: 45, mood: 55, health: 70, money: 40 },
      milestones: [],
      gaokao: { score: 0, line: null, tier: '', volChoice: '', uniName: '', majorName: '' },
      cast: {},
      castOrder: [],
      intimacy: {},
      memories: {},
      loverKey: null,
      roadmapDone: [],
      ending: null,
      freePoints: 3,
      extraEvents: {},
      attrsHistory: [],
      feedLiked: [],
      feedComments: [],
      freeUsed: 0,
      pickupTotal: 0,
      choices: [],
      stageClock: { day: 1, slot: 0 },
      lastSaved: 0
    };
  }

  function setRunId(id) { currentRunId = id; }
  function runId() { return currentRunId; }

  async function createRun({ name, careerId, state, meta, status }) {
    const r = await req('POST', '/api/sim/runs', { name, career_id: careerId, state, meta, status });
    currentRunId = r.id;
    cacheWrite(currentRunId, state);
    return r.run || { id: r.id };
  }

  async function load(runId) {
    if (!runId) return null;
    currentRunId = runId;
    try {
      const r = await req('GET', '/api/sim/runs/' + runId);
      const st = r.run && r.run.state;
      if (st && st.prot && st.careerId) { cacheWrite(runId, st); return st; }
    } catch (e) { /* 离线回退到缓存 */ }
    const cached = cacheRead(runId);
    if (cached && cached.prot && cached.careerId) return cached;
    return null;
  }

  async function save(s) {
    if (!currentRunId || !s) return;
    s.lastSaved = Date.now();
    cacheWrite(currentRunId, s);
    try {
      await req('PUT', '/api/sim/runs/' + currentRunId, { state: s });
    } catch (e) { /* 离线时仅保留本地 */ }
  }

  function reset() {
    if (currentRunId) { try { localStorage.removeItem(cacheKey(currentRunId)); } catch (e) {} }
    currentRunId = null;
  }

  async function listRuns() {
    try {
      const r = await req('GET', '/api/sim/runs');
      return r.runs || [];
    } catch (e) { return []; }
  }

  async function deleteRun(id) {
    try { await req('DELETE', '/api/sim/runs/' + id); } catch (e) {}
    try { localStorage.removeItem(cacheKey(id)); } catch (e) {}
  }

  async function claimGuestRuns() {
    const tk = token();
    if (!tk) return 0;
    try {
      const r = await req('POST', '/api/sim/claim', { guest_id: guestId() });
      return r.claimed || 0;
    } catch (e) { return 0; }
  }

  async function settleStage(s, stage, opts) {
    if (!currentRunId || !s) return { badges: [] };
    try {
      const r = await req('POST', '/api/sim/runs/' + currentRunId + '/settle', { stage, final: !!(opts && opts.final) });
      return r;
    } catch (e) { return { badges: [] }; }
  }

  function clamp(v) { return Math.max(0, Math.min(100, Math.round(v))); }
  function applyFx(s, fx) {
    if (!fx) return [];
    const logs = [];
    for (const k of Object.keys(fx)) {
      if (s.attrs[k] === undefined) continue;
      const before = s.attrs[k];
      s.attrs[k] = clamp(before + fx[k]);
      const delta = s.attrs[k] - before;
      if (delta !== 0) logs.push({ key: k, delta });
    }
    return logs;
  }
  function addMilestone(s, text) {
    const stage = JContent.STAGES[s.stageIndex];
    const item = { stage: stage ? stage.id : '', text };
    s.milestones.push(item);
    if (s.milestones.length > 60) s.milestones.splice(0, s.milestones.length - 60);
  }
  function addMemory(s, key, text) {
    const arr = s.memories[key] = s.memories[key] || [];
    arr.push(text);
    if (arr.length > 20) arr.splice(0, arr.length - 20);
  }
  function intimacy(s, key) { if (!key) return 0; return Math.round(s.intimacy[key] || 0); }
  function addIntimacy(s, key, delta) {
    if (!key) return 0;
    const v = clamp((s.intimacy[key] || 0) + delta);
    s.intimacy[key] = v;
    return v;
  }
  function charByKey(s, key) { return s.cast[key] || null; }

  return {
    KEY: 'msrl_v2_save_v1', ATTR_DEFS, freshState, load, save, reset, clamp,
    applyFx, addMilestone, addMemory, intimacy, addIntimacy, charByKey,
    setRunId, runId, createRun, listRuns, deleteRun, claimGuestRuns, settleStage,
    guestId, token, cacheRead
  };
})();
