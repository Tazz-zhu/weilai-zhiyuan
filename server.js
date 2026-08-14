// 未来致远 · 服务器（零依赖 Node HTTP Server + SQLite）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as D from './src/db.js';
import { seedIfEmpty, hashPassword, verifyPassword } from './src/seed.js';
import {
  scoreAssessment, recommendCareers, generatePath, computeDashboard,
  evaluateBadges, BADGE_DEFS, generateAnnualReport, salaryRange, levelInfo, recommendSchools
} from './src/engine.js';
import {
  careers, careerById, majors, majorById, scripts, scriptById,
  mentors, mentorById, questions, careerCategories, majorCategories, schools
} from './src/data/index.js';
import { provinceLines } from './src/data/provinceLines.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const PORT = process.env.PORT || 4173;
const SESSION_DAYS = 30;

seedIfEmpty();

// ---------- 工具 ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff2': 'font/woff2', '.map': 'application/json'
};

function sendJSON(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('body too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { resolve({}); } });
    req.on('error', reject);
  });
}
function getToken(req) {
  const h = req.headers['authorization'] || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  return req.headers['x-token'] || null;
}
function authUser(req) {
  const token = getToken(req);
  if (!token) return null;
  const s = D.getSession(token);
  if (!s || s.expires_at < Date.now()) return null;
  const user = D.getUserById(s.user_id);
  if (!user || user.disabled === 1) return null;
  return user;
}
function requireAuth(req, res) {
  const user = authUser(req);
  if (!user) { sendJSON(res, 401, { error: '请先登录' }); return null; }
  return user;
}
function isMember(user) { return !!user && user.member_until > Date.now(); }
function requireAdmin(req, res) {
  const user = authUser(req);
  if (!user || user.role !== 'admin') { sendJSON(res, 403, { error: '无管理员权限' }); return null; }
  return user;
}
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, username: u.username, nickname: u.nickname, avatar: u.avatar,
    bio: u.bio, education: u.education, city: u.city, target: u.target,
    member: isMember(u), member_until: u.member_until, created_at: u.created_at,
    role: u.role, disabled: u.disabled
  };
}

// 徽章结算：返回新获得的徽章
function settleBadges(user, extra = {}) {
  const events = D.listTimeline(user.id);
  const dash = computeDashboard(events, user);
  const ctx = {
    hasAssessment: !!D.getLatestAssessment(user.id),
    total: events.length,
    capsuleCount: D.listCapsules(user.id).length,
    capsuleOpened: D.listCapsules(user.id).filter(c => !c.sealed).length,
    postCount: D.db.prepare('SELECT COUNT(*) as n FROM posts WHERE user_id = ?').get(user.id).n,
    growthSpeed: dash.growthSpeed,
    badges: D.listBadges(user.id),
    inviteCount: D.db.prepare('SELECT COUNT(*) as n FROM users WHERE invited_by = ?').get(user.id).n,
    ...extra
  };
  const newly = evaluateBadges(user, ctx);
  for (const id of newly) {
    D.earnBadge(user.id, id);
    const def = BADGE_DEFS.find(b => b.id === id);
    if (def) D.addNotification({ user_id: user.id, type: 'badge', content: '解锁徽章「' + def.name + '」' });
  }
  return newly.map(id => BADGE_DEFS.find(b => b.id === id));
}

// 商业化暂缓：所有内容全量开放（保留结构便于未来恢复会员）
function maskCareer(c, member) {
  return c;
}

// 连续记录足迹天数
function computeEventStreak(events) {
  const days = new Set(events.map(e => String(e.date).slice(0, 10)));
  if (!days.size) return 0;
  const d = new Date();
  let streak = 0;
  if (!days.has(toDayStr(d))) d.setDate(d.getDate() - 1);
  while (days.has(toDayStr(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}
function toDayStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ---------- 内容 CMS 合并 ----------
let contentEdits = D.allContentEditMap();
function applyEdit(base, key) {
  const e = contentEdits[key];
  if (!e || !base) return base;
  if (e.status === 'off') return null;
  return { ...base, ...(e.data || {}) };
}
function getCareer(id) { return applyEdit(careerById.get(id), 'career:' + id); }
function getMajor(id) { return applyEdit(majorById.get(id), 'major:' + id); }
function getScript(id) { return applyEdit(scriptById.get(id), 'script:' + id); }
function getMentor(id) { return applyEdit(mentorById.get(id), 'mentor:' + id); }
function refreshContentEdits() { contentEdits = D.allContentEditMap(); }
const listCareers = () => careers.map(c => getCareer(c.id)).filter(Boolean);
const listMajors = () => majors.map(m => getMajor(m.id)).filter(Boolean);
const listScripts = () => scripts.map(s => getScript(s.id)).filter(Boolean);
const listMentors = () => mentors.map(m => getMentor(m.id)).filter(Boolean);

// ---------- 大模型（LLM）代理：NPC 对话 / 规划推荐 / 报告寄语共用 ----------
function loadEnvFile() {
  try {
    const p = path.join(__dirname, '.env');
    if (!fs.existsSync(p)) return;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch (e) { /* 忽略 .env 解析错误 */ }
}
loadEnvFile();
const LLM_CONFIG_FILE = path.join(DATA_DIR, 'llm-config.json');
function readLlmConfig() { try { return JSON.parse(fs.readFileSync(LLM_CONFIG_FILE, 'utf8')) || {}; } catch { return {}; } }
function saveLlmConfig(cfg) { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(LLM_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8'); } catch (e) {} }
function currentLlm() {
  const cfg = readLlmConfig();
  const key = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || cfg.key || '';
  const base = process.env.DEEPSEEK_BASE_URL || cfg.baseUrl || 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL || cfg.model || 'deepseek-chat';
  return { key, base, model, enabled: !!key };
}
async function llmChat({ system, messages, maxTokens = 700 }) {
  const { key, base, model } = currentLlm();
  if (!key) return null;
  const url = base.endsWith('/v1') ? base + '/chat/completions' : base + '/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model, temperature: 0.85, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] })
  });
  if (!res.ok) throw new Error('LLM ' + res.status + ' ' + res.statusText);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() || null;
  if (text) {
    const usage = data.usage || {};
    const u = readUsage();
    u.calls += 1; u.tokensIn += usage.prompt_tokens || 0; u.tokensOut += usage.completion_tokens || 0;
    saveUsage(u);
  }
  return text;
}
const LLM_USAGE_FILE = path.join(DATA_DIR, 'llm-usage.json');
function todayKey() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function readUsage() {
  try {
    const u = JSON.parse(fs.readFileSync(LLM_USAGE_FILE, 'utf8'));
    if (u.date !== todayKey()) return { date: todayKey(), calls: 0, tokensIn: 0, tokensOut: 0, cost: 0 };
    return u;
  } catch { return { date: todayKey(), calls: 0, tokensIn: 0, tokensOut: 0, cost: 0 }; }
}
function saveUsage(u) { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(LLM_USAGE_FILE, JSON.stringify(u, null, 2), 'utf8'); } catch (e) {} }
function usageLimits() {
  const cfg = readLlmConfig();
  return { dailyCalls: Math.max(1, Number(cfg.dailyCallLimit) || 100), dailyTokens: Math.max(1000, Number(cfg.dailyTokenLimit) || 200000), priceIn: Number(cfg.priceIn) || 2, priceOut: Number(cfg.priceOut) || 8 };
}
const llmCache = new Map();
function llmCacheKey(system, messages) {
  let h = 7; const str = String(system || '') + '|' + JSON.stringify(messages || []).slice(0, 3000);
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return String(h);
}
let llmCallTimes = [];
// ---------- 路由 ----------
const routes = [];
function route(method, pattern, handler) {
  routes.push({ method, pattern, handler });
}

function match(pathname, pattern) {
  const parts = pathname.split('/').filter(Boolean);
  const p = pattern.split('/').filter(Boolean);
  if (parts.length !== p.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(parts[i]);
    else if (p[i] !== parts[i]) return null;
  }
  return params;
}

// ===== 数据底座（统一数据源：认知馆 / 规划师 / 人生模拟舱共用） =====
route('GET', '/api/library', (req, res) => {
  sendJSON(res, 200, { careers, majors, schools, provinceLines });
});
route('GET', '/api/health', (req, res) => {
  sendJSON(res, 200, { ok: true, llm: currentLlm().enabled, model: currentLlm().model, careers: careers.length });
});

// ===== 大模型（LLM）代理 =====
route('GET', '/api/llm/config', (req, res) => {
  const { enabled, model, base } = currentLlm();
  sendJSON(res, 200, { enabled, model, base, hasKey: !!currentLlm().key, source: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY ? 'env' : 'app' });
});
route('GET', '/api/llm/usage', (req, res) => {
  const u = readUsage(); const lim = usageLimits();
  const cost = (u.tokensIn / 1e6) * lim.priceIn + (u.tokensOut / 1e6) * lim.priceOut;
  sendJSON(res, 200, { ...u, cost: Math.round(cost * 10000) / 10000, limits: lim });
});
route('POST', '/api/llm/config', async (req, res) => {
  const body = await readBody(req);
  const cfg = readLlmConfig();
  if (body && typeof body.key === 'string') { const k = body.key.trim(); if (k) cfg.key = k; else delete cfg.key; }
  if (body && typeof body.baseUrl === 'string' && body.baseUrl.trim()) cfg.baseUrl = body.baseUrl.trim();
  if (body && typeof body.model === 'string' && body.model.trim()) cfg.model = body.model.trim();
  if (body && body.dailyCallLimit !== undefined && body.dailyCallLimit !== null && body.dailyCallLimit !== '') cfg.dailyCallLimit = Math.max(1, Number(body.dailyCallLimit) || 100);
  if (body && body.dailyTokenLimit !== undefined && body.dailyTokenLimit !== null && body.dailyTokenLimit !== '') cfg.dailyTokenLimit = Math.max(1000, Number(body.dailyTokenLimit) || 200000);
  if (body && body.priceIn !== undefined && body.priceIn !== null && body.priceIn !== '') cfg.priceIn = Number(body.priceIn) || 2;
  if (body && body.priceOut !== undefined && body.priceOut !== null && body.priceOut !== '') cfg.priceOut = Number(body.priceOut) || 8;
  saveLlmConfig(cfg);
  const { enabled, model } = currentLlm();
  sendJSON(res, 200, { ok: true, enabled, model });
});
route('POST', '/api/llm/chat', async (req, res) => {
  if (!currentLlm().enabled) return sendJSON(res, 501, { error: '未配置大模型 Key，请使用内置模拟大脑', fallback: true });
  try {
    const body = await readBody(req);
    const lim = usageLimits(); const u = readUsage();
    if (u.calls >= lim.dailyCalls) return sendJSON(res, 429, { error: '今日 AI 对话已达上限（' + lim.dailyCalls + ' 次），已自动切回模拟大脑', fallback: true, limited: true });
    const estTokens = Math.ceil((String(body.system || '').length + JSON.stringify(body.messages || []).length) / 2);
    if (u.tokensIn + estTokens > lim.dailyTokens) return sendJSON(res, 429, { error: '今日 AI token 预算已用完，已自动切回模拟大脑', fallback: true, limited: true });
    const now = Date.now();
    llmCallTimes = llmCallTimes.filter(t => now - t < 60000);
    if (llmCallTimes.length >= 12) return sendJSON(res, 429, { error: '请求太快了，请稍等几秒再聊', fallback: true, limited: true });
    const ck = llmCacheKey(body.system, body.messages);
    const cached = llmCache.get(ck);
    if (cached && now - cached.ts < 6 * 3600 * 1000) { llmCallTimes.push(now); return sendJSON(res, 200, { text: cached.text, cached: true }); }
    llmCallTimes.push(now);
    const text = await llmChat({ system: body.system || '', messages: body.messages || [] });
    if (text === null) return sendJSON(res, 501, { error: '大模型无返回', fallback: true });
    llmCache.set(ck, { text, ts: now });
    if (llmCache.size > 300) { const first = llmCache.keys().next().value; llmCache.delete(first); }
    return sendJSON(res, 200, { text });
  } catch (e) { return sendJSON(res, 502, { error: String(e.message || e), fallback: true }); }
});
route('POST', '/api/llm/test', async (req, res) => {
  if (!currentLlm().enabled) return sendJSON(res, 501, { error: '未配置大模型 Key', fallback: true });
  try {
    const text = await llmChat({ system: '你是未来致远的测试助手，请只回复：连接成功。', messages: [{ role: 'user', content: 'ping' }], maxTokens: 20 });
    if (text === null) return sendJSON(res, 501, { error: '大模型无返回', fallback: true });
    return sendJSON(res, 200, { ok: true, text });
  } catch (e) { return sendJSON(res, 502, { error: String(e.message || e), fallback: true }); }
});

// ===== 人生模拟舱（sim_runs）=====
function simIdentity(req, res) {
  const user = authUser(req);
  const guestId = req.headers['x-guest-id'] || null;
  if (!user && !guestId) { sendJSON(res, 401, { error: '请先登录，或提供游客标识' }); return null; }
  return { user, guestId };
}
function canAccessRun(run, ident) {
  if (!run) return false;
  if (ident.user && run.user_id === ident.user.id) return true;
  if (!ident.user && ident.guestId && run.guest_id === ident.guestId && run.user_id === null) return true;
  return false;
}
function stageLabelOf(idx) {
  const names = ['高一 · 开学', '高一下 · 选科', '高二', '高三 · 高考', '大一', '大二', '大三', '大四 · 求职', '大四 · 考研', '研究生'];
  return names[idx] || '';
}
function simSummary(run) {
  const c = run.career_id ? getCareer(run.career_id) : null;
  const st = run.state || {};
  return {
    id: run.id, name: run.name, career_id: run.career_id, career_name: c ? c.name : '',
    career_icon: c ? c.name.slice(0, 1) : '🎮',
    stage_index: run.stage_index, stage_label: stageLabelOf(st.stageIndex),
    status: run.status, ending: run.ending || null,
    settled: run.settled, created_at: run.created_at, updated_at: run.updated_at, finished_at: run.finished_at
  };
}
route('GET', '/api/sim/runs', (req, res) => {
  const ident = simIdentity(req, res); if (!ident) return;
  const runs = ident.user ? D.listSimRuns({ user_id: ident.user.id }) : D.listSimRuns({ guest_id: ident.guestId });
  sendJSON(res, 200, { runs: runs.map(simSummary) });
});
route('POST', '/api/sim/runs', async (req, res) => {
  const ident = simIdentity(req, res); if (!ident) return;
  const body = await readBody(req);
  const state = body.state && typeof body.state === 'object' ? body.state : {};
  const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};
  if (!body.career_id) return sendJSON(res, 400, { error: '缺少职业' });
  const id = D.createSimRun({
    user_id: ident.user ? ident.user.id : null,
    guest_id: ident.user ? null : ident.guestId,
    name: String(body.name || ''), career_id: String(body.career_id),
    state, meta, status: body.status || 'playing'
  });
  const run = D.getSimRun(id);
  sendJSON(res, 200, { ok: true, run: simSummary(run), id });
});
route('GET', '/api/sim/runs/:id', (req, res, params) => {
  const ident = simIdentity(req, res); if (!ident) return;
  const run = D.getSimRun(parseInt(params.id, 10));
  if (!canAccessRun(run, ident)) return sendJSON(res, 404, { error: '存档不存在' });
  sendJSON(res, 200, { run: { ...simSummary(run), state: run.state, meta: run.meta } });
});
route('PUT', '/api/sim/runs/:id', async (req, res, params) => {
  const ident = simIdentity(req, res); if (!ident) return;
  const run = D.getSimRun(parseInt(params.id, 10));
  if (!canAccessRun(run, ident)) return sendJSON(res, 404, { error: '存档不存在' });
  const body = await readBody(req);
  const updated = D.updateSimRun(run.id, {
    state: body.state, meta: body.meta, status: body.status, settled: body.settled
  });
  sendJSON(res, 200, { ok: true, run: simSummary(updated) });
});
route('DELETE', '/api/sim/runs/:id', (req, res, params) => {
  const ident = simIdentity(req, res); if (!ident) return;
  const id = parseInt(params.id, 10);
  const run = D.getSimRun(id);
  if (!canAccessRun(run, ident)) return sendJSON(res, 404, { error: '存档不存在' });
  if (ident.user) D.deleteSimRun(id, ident.user.id);
  else D.deleteGuestSimRun(id, ident.guestId);
  sendJSON(res, 200, { ok: true });
});
route('POST', '/api/sim/claim', async (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const body = await readBody(req);
  const guestId = String(body.guest_id || '');
  if (!guestId) return sendJSON(res, 400, { error: '缺少游客标识' });
  const n = D.claimGuestRuns(guestId, user.id);
  sendJSON(res, 200, { ok: true, claimed: n });
});
route('POST', '/api/sim/runs/:id/settle', async (req, res, params) => {
  const ident = simIdentity(req, res); if (!ident) return;
  const run = D.getSimRun(parseInt(params.id, 10));
  if (!canAccessRun(run, ident)) return sendJSON(res, 404, { error: '存档不存在' });
  if (!ident.user) return sendJSON(res, 200, { ok: true, guest: true, badges: [] });
  const body = await readBody(req);
  const meta = run.meta || {};
  meta.settledStages = meta.settledStages || [];
  const state = run.state || {};
  const career = run.career_id ? getCareer(run.career_id) : null;
  const careerName = career ? career.name : '职业';
  const events = [];
  const stage = body.stage;
  if (stage && !meta.settledStages.includes(stage)) {
    meta.settledStages.push(stage);
    const stageName = stageLabelOf(state.stageIndex);
    const map = { s1: '高一入学', s4: '高考', s7: '大三实习', s8: '秋招求职', s8b: '考研', s9: '研究生深造' };
    const evType = stage === 's4' ? '学习' : stage === 's7' ? '实习' : stage === 's8b' || stage === 's9' ? '获奖' : '其他';
    D.addTimelineEvent(ident.user.id, {
      date: toDayStr(new Date()), type: evType,
      title: '【平行人生】' + careerName + ' · ' + (map[stage] || stageName || '新阶段'),
      description: '在人生模拟舱里，你的平行自我完成了「' + (map[stage] || stageName || '') + '」阶段。'
    });
    events.push(stage);
  }
  let badges = [];
  let finished = false;
  if (body.final && !run.settled) {
    D.updateSimRun(run.id, { status: 'finished', settled: true });
    const e = run.ending || state.ending || {};
    D.addTimelineEvent(ident.user.id, {
      date: toDayStr(new Date()), type: '其他',
      title: '【平行人生】成为' + (e.offer || careerName + '从业者'),
      description: '拿下' + (e.company || '第一份工作') + '的 offer（' + (e.salary || '') + '），职业匹配度 ' + (e.match || 0) + '%。'
    });
    const finishedCount = D.listSimRuns({ user_id: ident.user.id }).filter(r => r.status === 'finished').length;
    badges = settleBadges(ident.user, { simFinished: finishedCount, simMatch: e.match || 0 });
    finished = true;
  }
  D.updateSimRun(run.id, { meta });
  sendJSON(res, 200, { ok: true, events, badges, finished, settledStages: meta.settledStages });
});
// ===== 认证 =====
route('POST', '/api/auth/register', async (req, res) => {
  const body = await readBody(req);
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const nickname = String(body.nickname || '').trim() || username;
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return sendJSON(res, 400, { error: '用户名需为3-20位字母/数字/下划线' });
  if (password.length < 6) return sendJSON(res, 400, { error: '密码至少6位' });
  if (D.getUserByUsername(username)) return sendJSON(res, 409, { error: '用户名已被注册' });
  const { salt, hash } = hashPassword(password);
  const user = D.createUser({ username, password_hash: hash, salt, nickname, created_at: Date.now() });
  // 邀请关系
  let invitee = null;
  if (body.invite) {
    const inviter = D.getUserByUsername(String(body.invite).trim().toLowerCase());
    if (inviter && inviter.id !== user.id) {
      D.db.prepare('UPDATE users SET invited_by = ? WHERE id = ?').run(inviter.id, user.id);
      invitee = inviter;
      D.earnBadge(inviter.id, 'inviter');
      D.earnBadge(user.id, 'invited');
      D.addNotification({ user_id: inviter.id, actor_id: user.id, type: 'announce', content: '你的好友 ' + nickname + ' 通过邀请加入了未来致远' });
    }
  }
  const token = randomBytes(32).toString('hex');
  D.createSession(token, user.id, Date.now() + SESSION_DAYS * 86400000);
  D.earnBadge(user.id, 'welcome');
  const badgeList = [BADGE_DEFS.find(b => b.id === 'welcome')];
  if (invitee) badgeList.push(BADGE_DEFS.find(b => b.id === 'invited'));
  sendJSON(res, 200, { token, user: publicUser(user), badges: badgeList });
});

route('POST', '/api/auth/login', async (req, res) => {
  const body = await readBody(req);
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const user = D.getUserByUsername(username);
  if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
    return sendJSON(res, 401, { error: '用户名或密码错误' });
  }
  const token = randomBytes(32).toString('hex');
  D.createSession(token, user.id, Date.now() + SESSION_DAYS * 86400000);
  const newly = settleBadges(user);
  sendJSON(res, 200, { token, user: publicUser(user), badges: newly });
});

route('POST', '/api/auth/logout', (req, res) => {
  const token = getToken(req);
  if (token) D.deleteSession(token);
  sendJSON(res, 200, { ok: true });
});

route('GET', '/api/me', (req, res) => {
  const user = authUser(req);
  if (!user) return sendJSON(res, 401, { error: '未登录' });
  sendJSON(res, 200, { user: publicUser(user) });
});

route('PUT', '/api/me', async (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const body = await readBody(req);
  const updated = D.updateUser(user.id, body);
  const newly = settleBadges(updated);
  sendJSON(res, 200, { user: publicUser(updated), badges: newly });
});

// ===== 统计/首页 =====
route('GET', '/api/stats', (req, res) => {
  sendJSON(res, 200, {
    careers: careers.length,
    majors: majors.length,
    scripts: scripts.length,
    mentors: mentors.length,
    categories: careerCategories,
    posts: D.db.prepare('SELECT COUNT(*) as n FROM posts').get().n
  });
});

// ===== 职业认知馆 =====
route('GET', '/api/careers', (req, res) => {
  const url = new URL(req.url, 'http://x');
  const category = url.searchParams.get('category') || '';
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const hot = url.searchParams.get('hot') === '1';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '24', 10)));
  let list = listCareers();
  if (category) list = list.filter(c => c.category === category);
  if (q) list = list.filter(c => (c.name + c.tags.join('') + c.summary).toLowerCase().includes(q));
  if (hot) list = list.filter(c => c.hot);
  const total = list.length;
  const items = list.slice((page - 1) * limit, page * limit).map(c => ({
    id: c.id, name: c.name, category: c.category, tags: c.tags, summary: c.summary,
    salary: c.salary, education: c.education, radar: c.radar, hot: c.hot, demand: c.demand,
    salaryRange: salaryRange(c)
  }));
  sendJSON(res, 200, { items, total, page, limit, categories: careerCategories });
});

route('GET', '/api/careers/:id', (req, res, params) => {
  const c = getCareer(params.id);
  if (!c) return sendJSON(res, 404, { error: '职业不存在' });
  const user = authUser(req);
  const member = isMember(user);
  const fav = user ? D.isFavorite(user.id, params.id) : false;
  const favCount = D.favoriteCount(params.id);
  sendJSON(res, 200, { career: { ...maskCareer(c, member), salaryRange: salaryRange(c) }, member, fav, favCount });
});

route('GET', '/api/careers/:id/path', (req, res, params) => {
  const c = getCareer(params.id);
  if (!c) return sendJSON(res, 404, { error: '职业不存在' });
  const user = authUser(req);
  const full = generatePath(c, user || {});
  sendJSON(res, 200, { path: full, member: true });
});

// ===== 专业真相馆 =====
route('GET', '/api/majors', (req, res) => {
  const url = new URL(req.url, 'http://x');
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const cat = url.searchParams.get('category') || '';
  let list = listMajors();
  if (cat) list = list.filter(m => m.category === cat);
  if (q) list = list.filter(m => (m.name + m.truth + m.jobs.join('')).toLowerCase().includes(q));
  sendJSON(res, 200, { items: list, categories: majorCategories });
});
route('GET', '/api/majors/:id', (req, res, params) => {
  const m = getMajor(params.id);
  if (!m) return sendJSON(res, 404, { error: '专业不存在' });
  sendJSON(res, 200, { major: m });
});

// ===== 人生剧本库 =====
route('GET', '/api/scripts', (req, res) => {
  sendJSON(res, 200, { items: listScripts() });
});
route('GET', '/api/scripts/:id', (req, res, params) => {
  const s = getScript(params.id);
  if (!s) return sendJSON(res, 404, { error: '剧本不存在' });
  sendJSON(res, 200, { script: s });
});

// ===== 导师 =====
route('GET', '/api/mentors', (req, res) => {
  const url = new URL(req.url, 'http://x');
  const q = (url.searchParams.get('q') || '').toLowerCase();
  let list = listMentors();
  if (q) list = list.filter(m => (m.name + m.field + m.role + m.tags.join('')).toLowerCase().includes(q));
  sendJSON(res, 200, { items: list });
});
route('GET', '/api/mentors/:id', (req, res, params) => {
  const m = getMentor(params.id);
  if (!m) return sendJSON(res, 404, { error: '导师不存在' });
  sendJSON(res, 200, { mentor: m });
});
route('POST', '/api/mentors/:id/book', async (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  const m = getMentor(params.id);
  if (!m) return sendJSON(res, 404, { error: '导师不存在' });
  const body = await readBody(req);
  sendJSON(res, 200, {
    ok: true,
    booking: { mentor: m.name, time: body.time || '待沟通', message: `已向 ${m.name} 发起咨询预约，平台将尽快确认。` }
  });
});

// ===== 测评与规划 =====
route('GET', '/api/questions', (req, res) => {
  sendJSON(res, 200, { questions, dimensions: [
    { key: 'interest', name: '兴趣', desc: '你喜欢做什么', color: '#7c6cf0' },
    { key: 'personality', name: '性格', desc: '你习惯怎么想', color: '#4aa3c2' },
    { key: 'ability', name: '能力', desc: '你擅长什么', color: '#e8a04c' },
    { key: 'value', name: '价值观', desc: '你在乎什么', color: '#5aa86b' }
  ] });
});

route('POST', '/api/assessments', async (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const body = await readBody(req);
  const answers = body.answers || {};
  const result = scoreAssessment(answers);
  D.saveAssessment(user.id, answers, result);
  const recs = recommendCareers(result, { limit: 5 });
  const newly = settleBadges(user);
  sendJSON(res, 200, {
    result: summarizeResult(result),
    recommendations: recs.map(r => ({
      career: { id: r.career.id, name: r.career.name, category: r.career.category, summary: r.career.summary, salary: r.career.salary, radar: r.career.radar },
      probability: r.probability, match: r.match
    })),
    member: isMember(user), badges: newly
  });
});

function summarizeResult(result) {
  return {
    interestTop: result.interestTop, personalityTop: result.personalityTop,
    abilityTop: result.abilityTop, valueTop: result.valueTop,
    interest: result.interest,
    personalityDesc: describePersonality(result),
    valueDesc: describeValue(result),
    abilityDesc: describeAbility(result)
  };
}
function describePersonality(r) {
  const t = r.personality;
  const picks = [];
  if (t.外向 > t.内向) picks.push('外向开朗，从人群中获得能量');
  else if (t.内向 > t.外向) picks.push('内敛专注，在独处中恢复能量');
  if (t.理性 > t.感性) picks.push('理性务实，习惯用逻辑做决策');
  else if (t.感性 > t.理性) picks.push('感性细腻，重视感受和关系');
  if (t.冒险 > t.稳健) picks.push('敢于冒险，享受不确定性带来的刺激');
  else if (t.稳健 > t.冒险) picks.push('稳健审慎，喜欢掌控可预期的节奏');
  if (t.合作 > t.独立) picks.push('乐于协作，擅长在团队中发挥价值');
  else if (t.独立 > t.合作) picks.push('独立自主，享受自己主导的掌控感');
  if (t.抗压 > t.敏感) picks.push('抗压坚韧，越挫越勇');
  else if (t.敏感 > t.抗压) picks.push('敏感细腻，需要情绪支持与自我关怀');
  return picks.join('；') || '性格画像尚未明确，多做几次测评会有更清晰的发现。';
}
function describeValue(r) {
  const map = { 金钱财富: '物质回报与财富积累', 成长发展: '持续成长与能力跃迁', 稳定安全: '稳定可控与安全感', 社会意义: '创造社会价值、帮助他人', 自由创造: '自由创造与自我表达', 地位影响: '影响力与专业地位' };
  return r.valueTop.slice(0, 2).map(v => map[v.key] || v.key).join(' + ') || '价值观画像待完善';
}
function describeAbility(r) {
  return r.abilityTop.slice(0, 2).map(a => a.key).join('、') || '能力画像待完善';
}

route('GET', '/api/assessments/latest', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const a = D.getLatestAssessment(user.id);
  if (!a) return sendJSON(res, 200, { assessment: null });
  sendJSON(res, 200, { assessment: { id: a.id, created_at: a.created_at, result: summarizeResult(a.result) } });
});

route('GET', '/api/planner', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const a = D.getLatestAssessment(user.id);
  if (!a) return sendJSON(res, 200, { hasAssessment: false });
  const member = true;
  const recs = recommendCareers(a.result, { limit: 5 });
  sendJSON(res, 200, {
    hasAssessment: true, member,
    created_at: a.created_at,
    recommendations: recs.map(r => ({
      career: { id: r.career.id, name: r.career.name, category: r.career.category, summary: r.career.summary, salary: r.career.salary, radar: r.career.radar },
      probability: r.probability, match: r.match
    }))
  });
});

// ===== 时光轴 =====
route('GET', '/api/timeline', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  sendJSON(res, 200, { events: D.listTimeline(user.id) });
});
route('POST', '/api/timeline', async (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const body = await readBody(req);
  const title = String(body.title || '').trim();
  const date = String(body.date || '');
  const type = String(body.type || '其他');
  if (!title || !date) return sendJSON(res, 400, { error: '请填写事件名称和日期' });
  D.addTimelineEvent(user.id, { date, type, title, description: String(body.description || ''), goal_id: body.goal_id ? parseInt(body.goal_id, 10) : null });
  const newly = settleBadges(user);
  sendJSON(res, 200, { ok: true, events: D.listTimeline(user.id), badges: newly });
});
route('DELETE', '/api/timeline/:id', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  D.deleteTimelineEvent(parseInt(params.id, 10), user.id);
  sendJSON(res, 200, { ok: true, events: D.listTimeline(user.id) });
});

// ===== 时光胶囊 =====
route('GET', '/api/capsules', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  sendJSON(res, 200, { capsules: D.listCapsules(user.id) });
});
route('POST', '/api/capsules', async (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const body = await readBody(req);
  const title = String(body.title || '').trim();
  const content = String(body.content || '').trim();
  const openDate = String(body.open_date || '');
  if (!title || !content || !openDate) return sendJSON(res, 400, { error: '请完整填写标题、内容与开启时间' });
  D.addCapsule(user.id, { title, content, open_date: openDate });
  const newly = settleBadges(user);
  sendJSON(res, 200, { ok: true, capsules: D.listCapsules(user.id), badges: newly });
});
route('GET', '/api/capsules/:id', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  const c = D.getCapsule(parseInt(params.id, 10), user.id);
  if (!c) return sendJSON(res, 404, { error: '胶囊不存在' });
  sendJSON(res, 200, { capsule: c });
});
route('POST', '/api/capsules/:id/open', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  const c = D.openCapsule(parseInt(params.id, 10), user.id);
  if (!c) return sendJSON(res, 404, { error: '胶囊不存在' });
  const newly = settleBadges(user);
  sendJSON(res, 200, { capsule: c, badges: newly });
});

// ===== 社区 =====
route('GET', '/api/community', (req, res) => {
  const url = new URL(req.url, 'http://x');
  const group = url.searchParams.get('group') || 'all';
  const hot = url.searchParams.get('hot') === '1';
  const career = url.searchParams.get('career');
  const tag = url.searchParams.get('tag');
  const sort = url.searchParams.get('sort') || 'mix';
  const type = url.searchParams.get('type');
  const user = authUser(req);
  const posts = D.listPosts(group, user ? user.id : null, hot, career, tag, sort).filter(p => !type || p.post_type === type).map(p => ({
    ...p, career_name: p.career_id && getCareer(p.career_id) ? getCareer(p.career_id).name : null,
    favByMe: user ? D.isFavPost(user.id, p.id) : false,
    mine: user ? user.id === p.user.id : false
  }));
  sendJSON(res, 200, { posts });
});

// 职业圈子统计：全部职业 + 各圈子帖子数/最后活跃
route('GET', '/api/community/careers', (req, res) => {
  const stats = D.careerPostStats();
  const items = listCareers().map(c => ({
    id: c.id, name: c.name, category: c.category,
    post_count: stats[c.id] ? stats[c.id].post_count : 0,
    last_active: stats[c.id] ? stats[c.id].last_active : null,
    summary: c.summary, radar: c.radar, hot: c.hot
  }));
  sendJSON(res, 200, { items });
});
route('GET', '/api/community/:id', (req, res, params) => {
  const p = D.getPost(parseInt(params.id, 10));
  if (!p) return sendJSON(res, 404, { error: '帖子不存在' });
  const user = authUser(req);
  const post = D.listPosts('all', user ? user.id : null).find(x => x.id === p.id) || p;
  if (post.career_id) post.career_name = getCareer(post.career_id) ? getCareer(post.career_id).name : null;
  sendJSON(res, 200, { post, comments: D.listComments(p.id) });
});
route('POST', '/api/community', async (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const body = await readBody(req);
  const title = String(body.title || '').trim();
  const content = String(body.content || '').trim();
  if (!title || !content) return sendJSON(res, 400, { error: '请填写标题和内容' });
  const media = Array.isArray(body.media) ? body.media.slice(0, 9).filter(m => m && m.url) : [];
  const postType = ['ask', 'share', 'checkin'].includes(body.post_type) ? body.post_type : 'share';
  const postId = D.addPost(user.id, { group_type: String(body.group_type || 'general'), title: D.filterSensitive(title), content: D.filterSensitive(content), career_id: body.career_id ? String(body.career_id) : null, media, post_type: postType });
  // 订阅该职业圈子的用户 → 新帖通知（排除发帖者）
  if (body.career_id) {
    const subs = D.db.prepare('SELECT user_id FROM favorites WHERE career_id = ? AND user_id != ?').all(body.career_id, user.id);
    const careerName = getCareer(body.career_id) ? getCareer(body.career_id).name : '职业';
    for (const s of subs) {
      D.addNotification({ user_id: s.user_id, actor_id: user.id, type: 'announce', ref_id: postId, content: '你订阅的「' + careerName + '」圈子有新帖：「' + D.filterSensitive(title).slice(0, 18) + '」' });
    }
  }
  const newly = settleBadges(user);
  sendJSON(res, 200, { ok: true, badges: newly });
});
route('PATCH', '/api/community/:id', async (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  const body = await readBody(req);
  const title = D.filterSensitive(String(body.title || ''));
  const content = D.filterSensitive(String(body.content || ''));
  if (!title || !content) return sendJSON(res, 400, { error: '标题和内容不能为空' });
  const media = Array.isArray(body.media) ? body.media.slice(0, 9).filter(m => m && m.url) : [];
  const updated = D.updatePost(parseInt(params.id, 10), user.id, { title, content, media });
  if (!updated) return sendJSON(res, 403, { error: '只能编辑自己的帖子' });
  sendJSON(res, 200, { ok: true });
});
route('DELETE', '/api/community/:id', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  const ok = D.deleteMyPost(parseInt(params.id, 10), user.id);
  if (!ok) return sendJSON(res, 403, { error: '只能删除自己的帖子' });
  sendJSON(res, 200, { ok: true });
});
route('DELETE', '/api/comments/:id', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  const ok = D.deleteMyComment(parseInt(params.id, 10), user.id);
  if (!ok) return sendJSON(res, 403, { error: '只能删除自己的评论' });
  sendJSON(res, 200, { ok: true });
});
route('POST', '/api/community/:id/favorite', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  const post = D.getPost(parseInt(params.id, 10));
  if (!post) return sendJSON(res, 404, { error: '帖子不存在' });
  sendJSON(res, 200, D.toggleFavPost(user.id, post.id));
});
route('DELETE', '/api/community/:id/favorite', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  D.toggleFavPost(user.id, parseInt(params.id, 10));
  sendJSON(res, 200, { fav: false });
});
route('GET', '/api/me/fav-posts', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  sendJSON(res, 200, { posts: D.myFavPosts(user.id) });
});

route('POST', '/api/community/:id/like', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  const postId = parseInt(params.id, 10);
  const r = D.toggleLike(postId, user.id);
  if (r.liked) {
    const post = D.getPost(postId);
    if (post && post.user_id !== user.id) {
      D.addNotification({ user_id: post.user_id, actor_id: user.id, type: 'like', ref_id: postId, content: '赞了你的帖子「' + post.title.slice(0, 20) + '」' });
    }
  }
  sendJSON(res, 200, r);
});
route('POST', '/api/community/:id/comments', async (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  const body = await readBody(req);
  const content = String(body.content || '').trim();
  if (!content) return sendJSON(res, 400, { error: '评论不能为空' });
  const postId = parseInt(params.id, 10);
  D.addComment(postId, user.id, D.filterSensitive(content));
  const post = D.getPost(postId);
  if (post && post.user_id !== user.id) {
    D.addNotification({ user_id: post.user_id, actor_id: user.id, type: 'comment', ref_id: postId, content: '评论了你的帖子「' + post.title.slice(0, 20) + '」' });
  }
  sendJSON(res, 200, { ok: true, comments: D.listComments(postId) });
});

// ===== 仪表盘 / 徽章 =====
route('GET', '/api/dashboard', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const events = D.listTimeline(user.id);
  const dash = computeDashboard(events, user);
  const badges = D.listBadges(user.id).map(b => ({ ...BADGE_DEFS.find(d => d.id === b.badge_id), earned_at: b.earned_at })).filter(Boolean);
  const assessment = D.getLatestAssessment(user.id);
  const eventStreak = computeEventStreak(events);
  // 综合成长指数（记录 30% / 签到 20% / 目标 20% / 测评 15% / 社区 15%）
  const goals = D.listGoals(user.id);
  const goalScore = goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0;
  const recScore = Math.min(100, Math.round(dash.total * 4));
  const ck2 = D.computeStreak(user.id);
  const checkinScore = Math.min(100, ck2.streak * 12);
  const assessScore = D.getLatestAssessment(user.id) ? 80 : 10;
  const commScore = Math.min(100, D.db.prepare('SELECT COUNT(*) as n FROM posts WHERE user_id = ?').get(user.id).n * 15 + D.db.prepare('SELECT COUNT(*) as n FROM comments WHERE user_id = ?').get(user.id).n * 8);
  const growthIndex = Math.min(99, Math.round(recScore * 0.3 + checkinScore * 0.2 + goalScore * 0.2 + assessScore * 0.15 + commScore * 0.15));
  sendJSON(res, 200, {
    growthIndex,
    dashboard: dash,
    badges,
    assessment: assessment ? summarizeResult(assessment.result) : null,
    checkin: D.computeStreak(user.id),
    follower_count: D.followerCount(user.id),
    following_count: D.followingList(user.id).length,
    event_streak: eventStreak,
    member: isMember(user)
  });
});
route('POST', '/api/badges/check', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const newly = settleBadges(user);
  sendJSON(res, 200, { badges: newly });
});

// ===== 签到 =====
route('POST', '/api/checkin', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const date = D.toDateStr(new Date());
  D.addCheckin(user.id, date);
  const st = D.computeStreak(user.id);
  const newly = settleBadges(user);
  sendJSON(res, 200, { ok: true, ...st, badges: newly });
});
route('GET', '/api/checkin/status', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  sendJSON(res, 200, { ...D.computeStreak(user.id), last30: D.getCheckins(user.id).slice(0, 30) });
});

// ===== 测评历史 =====
route('GET', '/api/assessments', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  sendJSON(res, 200, { assessments: D.listAssessments(user.id) });
});

// ===== 升学档案 / 志愿推荐 =====
route('GET', '/api/profile', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  sendJSON(res, 200, { profile: D.getProfile(user.id) });
});
route('PUT', '/api/profile', async (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const body = await readBody(req);
  const allowed = ['province', 'year', 'score', 'rank', 'batch', 'subjects', 'cityPrefs', 'typePrefs', 'majorIntents', 'careerGoal', 'finance', 'stability', 'parentJob', 'familyExpect', 'note'];
  const data = {};
  for (const k of allowed) if (body[k] !== undefined) data[k] = body[k];
  const profile = D.saveProfile(user.id, data);
  const newly = settleBadges(user);
  sendJSON(res, 200, { profile, badges: newly });
});
route('POST', '/api/recommend/exam', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const profile = D.getProfile(user.id);
  if (!profile || !profile.score) return sendJSON(res, 400, { error: '请先填写高考分数并保存档案' });
  const assessment = D.getLatestAssessment(user.id);
  const result = recommendSchools(profile, assessment ? assessment.result : null);
  sendJSON(res, 200, result);
});

// ===== 我的内容 / 账号 / 举报 =====
route('GET', '/api/me/posts', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  sendJSON(res, 200, { posts: D.getUserPosts(user.id) });
});
route('PUT', '/api/me/password', async (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const body = await readBody(req);
  if (!verifyPassword(String(body.old || ''), user.salt, user.password_hash)) {
    return sendJSON(res, 400, { error: '当前密码不正确' });
  }
  const np = String(body.new || '');
  if (np.length < 6) return sendJSON(res, 400, { error: '新密码至少 6 位' });
  const { salt, hash } = hashPassword(np);
  D.db.prepare('UPDATE users SET salt = ?, password_hash = ? WHERE id = ?').run(salt, hash, user.id);
  sendJSON(res, 200, { ok: true });
});
route('GET', '/api/me/export', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const data = D.exportUserData(user.id);
  if (!data) return sendJSON(res, 404, { error: '用户不存在' });
  sendJSON(res, 200, data);
});
route('DELETE', '/api/me', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const token = getToken(req);
  D.deleteUserCascade(user.id);
  if (token) D.deleteSession(token);
  sendJSON(res, 200, { ok: true });
});
route('POST', '/api/reports', async (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const body = await readBody(req);
  const post_id = body.post_id ? parseInt(body.post_id, 10) : null;
  const comment_id = body.comment_id ? parseInt(body.comment_id, 10) : null;
  if (!post_id && !comment_id) return sendJSON(res, 400, { error: '缺少举报对象' });
  D.addReport({ post_id, comment_id, user_id: user.id, reason: String(body.reason || '内容违规') });
  sendJSON(res, 200, { ok: true });
});

// ===== 私信 =====
route('GET', '/api/messages/conversations', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  sendJSON(res, 200, { conversations: D.listConversations(user.id) });
});
route('POST', '/api/messages/read-all', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  D.db.prepare('UPDATE messages SET read = 1 WHERE to_user = ? AND read = 0').run(user.id);
  sendJSON(res, 200, { ok: true });
});
route('GET', '/api/messages/unread', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  sendJSON(res, 200, { unread: D.unreadMessageCount(user.id) });
});
route('GET', '/api/messages/:userId', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  const other = parseInt(params.userId, 10);
  if (!D.getUserById(other)) return sendJSON(res, 404, { error: '用户不存在' });
  const messages = D.listMessages(user.id, other);
  sendJSON(res, 200, { messages, other: { id: other, nickname: D.getUserById(other).nickname, avatar: D.getUserById(other).avatar } });
});
route('POST', '/api/messages/:userId', async (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  const other = parseInt(params.userId, 10);
  if (!D.getUserById(other)) return sendJSON(res, 404, { error: '用户不存在' });
  if (other === user.id) return sendJSON(res, 400, { error: '不能给自己发消息' });
  const body = await readBody(req);
  const content = String(body.content || '').trim();
  if (!content) return sendJSON(res, 400, { error: '消息不能为空' });
  const media = Array.isArray(body.media) ? body.media.slice(0, 3).filter(m => m && m.url) : [];
  D.sendMessage(user.id, other, D.filterSensitive(content), media);
  D.addNotification({ user_id: other, actor_id: user.id, type: 'message', ref_id: user.id, content: '给你发来一条私信' });
  sendJSON(res, 200, { ok: true, messages: D.listMessages(user.id, other) });
});

// ===== 文件上传（图片/视频） =====
route('POST', '/api/upload', async (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const body = await readBody(req, 40 * 1024 * 1024);
  const type = String(body.type || '');
  const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' };
  const ext = extMap[type];
  if (!ext) return sendJSON(res, 400, { error: '仅支持图片(jpg/png/gif/webp)或视频(mp4/webm)' });
  const max = type.startsWith('video/') ? 30 * 1024 * 1024 : 5 * 1024 * 1024;
  const buf = Buffer.from(String(body.data || ''), 'base64');
  if (!buf.length || buf.length > max) return sendJSON(res, 400, { error: '文件为空或超过大小限制（图片≤5MB，视频≤30MB）' });
  const d = new Date();
  const sub = String(d.getFullYear()) + String(d.getMonth() + 1).padStart(2, '0');
  const dir = path.join(PUBLIC_DIR, 'uploads', sub);
  fs.mkdirSync(dir, { recursive: true });
  const fname = Date.now() + '-' + randomBytes(6).toString('hex') + '.' + ext;
  fs.writeFileSync(path.join(dir, fname), buf);
  sendJSON(res, 200, { ok: true, url: '/uploads/' + sub + '/' + fname, type });
});

// ===== 人生目标 =====
route('GET', '/api/goals', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  sendJSON(res, 200, { goals: D.listGoals(user.id) });
});
route('POST', '/api/goals', async (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const body = await readBody(req);
  const title = String(body.title || '').trim();
  if (!title) return sendJSON(res, 400, { error: '请填写目标名称' });
  const milestones = Array.isArray(body.milestones) ? body.milestones.slice(0, 12).map(m => typeof m === 'string' ? { text: m, done: false } : { text: String(m.text || ''), done: !!m.done }) : [];
  const id = D.addGoal(user.id, { title, desc: String(body.desc || ''), deadline: String(body.deadline || ''), milestones });
  sendJSON(res, 200, { goal: D.getGoal(id, user.id) });
});
route('PATCH', '/api/goals/:id/milestone', async (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  const body = await readBody(req);
  const goal = D.updateGoalMilestone(parseInt(params.id, 10), user.id, parseInt(body.idx, 10), !!body.done);
  if (!goal) return sendJSON(res, 404, { error: '目标不存在' });
  sendJSON(res, 200, { goal });
});
route('DELETE', '/api/goals/:id', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  D.deleteGoal(parseInt(params.id, 10), user.id);
  sendJSON(res, 200, { ok: true });
});

// ===== 收藏 / 用户主页 / 周报 / 搜索建议 =====
route('POST', '/api/careers/:id/favorite', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  if (!getCareer(params.id)) return sendJSON(res, 404, { error: '职业不存在' });
  sendJSON(res, 200, D.toggleFavorite(user.id, params.id));
});
route('DELETE', '/api/careers/:id/favorite', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  D.toggleFavorite(user.id, params.id);
  sendJSON(res, 200, { fav: false });
});
route('POST', '/api/schools/:id/favorite', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  sendJSON(res, 200, D.toggleFavSchool(user.id, params.id));
});
route('DELETE', '/api/schools/:id/favorite', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  D.toggleFavSchool(user.id, params.id);
  sendJSON(res, 200, { fav: false });
});
route('GET', '/api/me/fav-schools', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const ids = D.myFavSchools(user.id);
  const items = ids.map(id => schools.find(s => s.id === id)).filter(Boolean);
  sendJSON(res, 200, { items });
});

route('GET', '/api/topic/today', (req, res) => {
  const topics = [
    { text: '聊聊你最近一次"选择"是怎么做的？', hint: '选科 / 选专业 / 选城市…' },
    { text: '你理想的一天工作长什么样？', hint: '展开说说，越具体越好' },
    { text: '如果重新选择专业，你会选什么？', hint: '给学弟学妹一点参考' },
    { text: '分享一个让你后悔/庆幸的决定', hint: '真实的经历最动人' },
    { text: '你的第一份实习/兼职，学到了什么？', hint: '哪怕是踩坑经验' },
    { text: '有没有一个职业，你特别想尝试？', hint: '说说为什么' },
    { text: '你怎么看待"35 岁危机"？', hint: '学生/职场人都可以聊聊' },
    { text: '分享一个对你影响最大的老师/学长/学姐', hint: '一句话就够了' },
    { text: '如果明天就能转行，你想做什么？', hint: '不考虑现实条件的那种' },
    { text: '你坚持最久的一件事是什么？', hint: '打卡 / 学习 / 爱好都算' }
  ];
  const idx = Math.floor(Date.now() / 86400000) % topics.length;
  sendJSON(res, 200, { topic: topics[idx], date: new Date().toISOString().slice(0, 10) });
});

route('GET', '/api/me/favorites', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const ids = D.myFavorites(user.id);
  const items = ids.map(id => { const c = getCareer(id); return c ? { id: c.id, name: c.name, category: c.category, summary: c.summary, salary: c.salary, radar: c.radar } : null; }).filter(Boolean);
  sendJSON(res, 200, { items, ids });
});

route('GET', '/api/users/:id/profile', (req, res, params) => {
  const viewer = authUser(req);
  const profile = D.publicProfile(parseInt(params.id, 10));
  if (!profile) return sendJSON(res, 404, { error: '用户不存在' });
  const isSelf = viewer && viewer.id === profile.id;
  sendJSON(res, 200, { profile, isSelf, isFollowing: viewer && !isSelf ? D.isFollowing(viewer.id, profile.id) : false });
});

route('GET', '/api/report/weekly', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  sendJSON(res, 200, { report: D.weeklyReport(user.id), user: { nickname: user.nickname } });
});

route('GET', '/api/search/suggest', (req, res) => {
  const url = new URL(req.url, 'http://x');
  const q = (url.searchParams.get('q') || '').toLowerCase().trim();
  const careersRes = q ? listCareers().filter(c => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)).slice(0, 6).map(c => ({ id: c.id, name: c.name, category: c.category })) : [];
  const tags = ['法考', '考研', '转行', '实习', '秋招', '求职', '考证', '读书', '健身', '理财'];
  const tagsRes = q ? tags.filter(t => t.includes(q) || q.includes(t)).slice(0, 4) : tags.slice(0, 6);
  sendJSON(res, 200, { careers: careersRes, tags: tagsRes });
});

// ===== 通知 / 关注 / 搜索 =====
route('GET', '/api/notifications', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  D.ensureCapsuleNotifications(user.id);
  D.ensureCheckinReminder(user.id);
  sendJSON(res, 200, { notifications: D.listNotifications(user.id), unread: D.unreadCount(user.id) });
});
route('GET', '/api/notifications/unread', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  D.ensureCapsuleNotifications(user.id);
  sendJSON(res, 200, { unread: D.unreadCount(user.id) });
});
route('POST', '/api/notifications/read', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  D.markNotificationsRead(user.id);
  sendJSON(res, 200, { ok: true });
});

route('POST', '/api/users/:id/follow', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  const r = D.toggleFollow(user.id, parseInt(params.id, 10));
  sendJSON(res, 200, r);
});
route('DELETE', '/api/users/:id/follow', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  D.toggleFollow(user.id, parseInt(params.id, 10));
  sendJSON(res, 200, { followed: false });
});
route('GET', '/api/me/following', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  sendJSON(res, 200, { following: D.followingList(user.id) });
});
route('GET', '/api/me/feed', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  sendJSON(res, 200, { posts: D.followingFeed(user.id) });
});

route('GET', '/api/search', (req, res) => {
  const url = new URL(req.url, 'http://x');
  const q = (url.searchParams.get('q') || '').toLowerCase().trim();
  if (!q) return sendJSON(res, 200, { q: '', careers: [], majors: [], scripts: [], posts: [], circles: [] });
  const careersRes = listCareers().filter(c => (c.name + c.summary + c.tags.join('') + c.category).toLowerCase().includes(q)).slice(0, 8).map(c => ({ id: c.id, name: c.name, category: c.category, summary: c.summary }));
  const majorsRes = listMajors().filter(m => (m.name + m.truth + m.jobs.join('')).toLowerCase().includes(q)).slice(0, 6).map(m => ({ id: m.id, name: m.name, category: m.category }));
  const scriptsRes = listScripts().filter(s => (s.title + s.subtitle + s.tags.join('')).toLowerCase().includes(q)).slice(0, 5).map(s => ({ id: s.id, title: s.title, subtitle: s.subtitle }));
  const circleStats = D.careerPostStats();
  const circlesRes = listCareers().filter(c => (c.name + c.category).toLowerCase().includes(q)).slice(0, 8).map(c => ({ id: c.id, name: c.name, category: c.category, post_count: circleStats[c.id] ? circleStats[c.id].post_count : 0 }));
  const postsRes = D.listPosts('all', null).filter(p => (p.title + p.content).toLowerCase().includes(q)).slice(0, 6).map(p => ({ id: p.id, title: p.title, group_type: p.group_type, career_name: p.career_id && getCareer(p.career_id) ? getCareer(p.career_id).name : null, created_at: p.created_at }));
  sendJSON(res, 200, { q, careers: careersRes, majors: majorsRes, scripts: scriptsRes, circles: circlesRes, posts: postsRes });
});

// ===== 后台管理 =====
route('GET', '/api/admin/stats', (req, res) => {
  const admin = requireAdmin(req, res); if (!admin) return;
  const stats = D.adminStats();
  sendJSON(res, 200, { stats, careers: careers.length, majors: majors.length, circles: D.careerPostStats() ? Object.keys(D.careerPostStats()).length : 0 });
});

route('GET', '/api/admin/users', (req, res) => {
  const admin = requireAdmin(req, res); if (!admin) return;
  const url = new URL(req.url, 'http://x');
  const q = url.searchParams.get('q') || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  sendJSON(res, 200, D.adminListUsers(q, page, limit));
});

route('GET', '/api/admin/users/:id', (req, res, params) => {
  const admin = requireAdmin(req, res); if (!admin) return;
  const detail = D.adminUserDetail(parseInt(params.id, 10));
  if (!detail) return sendJSON(res, 404, { error: '用户不存在' });
  sendJSON(res, 200, { user: detail });
});

route('PATCH', '/api/admin/users/:id', async (req, res, params) => {
  const admin = requireAdmin(req, res); if (!admin) return;
  const body = await readBody(req);
  const uid = parseInt(params.id, 10);
  if (uid === admin.id) return sendJSON(res, 400, { error: '不能操作自己的账号' });
  D.setUserDisabled(uid, !!body.disabled);
  sendJSON(res, 200, { ok: true });
});

route('DELETE', '/api/admin/users/:id', (req, res, params) => {
  const admin = requireAdmin(req, res); if (!admin) return;
  const uid = parseInt(params.id, 10);
  if (uid === admin.id) return sendJSON(res, 400, { error: '不能删除自己的账号' });
  D.deleteUserCascade(uid);
  sendJSON(res, 200, { ok: true });
});

route('GET', '/api/admin/posts', (req, res) => {
  const admin = requireAdmin(req, res); if (!admin) return;
  const url = new URL(req.url, 'http://x');
  const q = url.searchParams.get('q') || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  sendJSON(res, 200, D.adminListPosts(q, page, limit));
});

route('DELETE', '/api/admin/posts/:id', (req, res, params) => {
  const admin = requireAdmin(req, res); if (!admin) return;
  D.deletePostCascade(parseInt(params.id, 10));
  sendJSON(res, 200, { ok: true });
});

route('GET', '/api/admin/comments', (req, res) => {
  const admin = requireAdmin(req, res); if (!admin) return;
  const url = new URL(req.url, 'http://x');
  const q = url.searchParams.get('q') || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  sendJSON(res, 200, D.adminListComments(q, page, limit));
});

route('DELETE', '/api/admin/comments/:id', (req, res, params) => {
  const admin = requireAdmin(req, res); if (!admin) return;
  D.deleteComment(parseInt(params.id, 10));
  sendJSON(res, 200, { ok: true });
});

route('GET', '/api/admin/reports', (req, res) => {
  const admin = requireAdmin(req, res); if (!admin) return;
  const url = new URL(req.url, 'http://x');
  const status = url.searchParams.get('status') || 'all';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  sendJSON(res, 200, D.listReports(status, page, 20));
});
route('PATCH', '/api/admin/reports/:id', async (req, res, params) => {
  const admin = requireAdmin(req, res); if (!admin) return;
  const body = await readBody(req);
  D.setReportStatus(parseInt(params.id, 10), body.status || 'resolved');
  sendJSON(res, 200, { ok: true });
});

route('GET', '/api/admin/content', (req, res) => {
  const admin = requireAdmin(req, res); if (!admin) return;
  const url = new URL(req.url, 'http://x');
  const type = url.searchParams.get('type') || 'career';
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const edits = D.allContentEditMap();
  let items;
  if (type === 'career') items = listCareers().map(c => ({ id: c.id, name: c.name, category: c.category, summary: c.summary, salary: c.salary, radar: c.radar, demand: c.demand, aiRisk: c.aiRisk, status: edits['career:' + c.id] ? edits['career:' + c.id].status : 'on' }));
  else if (type === 'major') items = listMajors().map(m => ({ id: m.id, name: m.name, category: m.category, truth: m.truth, recommend: m.recommend, status: edits['major:' + m.id] ? edits['major:' + m.id].status : 'on' }));
  else if (type === 'script') items = listScripts().map(s => ({ id: s.id, title: s.title, subtitle: s.subtitle, tags: s.tags, status: edits['script:' + s.id] ? edits['script:' + s.id].status : 'on' }));
  else items = listMentors().map(m => ({ id: m.id, name: m.name, role: m.role, field: m.field, price: m.price, available: m.available, intro: m.intro, status: edits['mentor:' + m.id] ? edits['mentor:' + m.id].status : 'on' }));
  if (q) items = items.filter(i => JSON.stringify(i).toLowerCase().includes(q));
  sendJSON(res, 200, { items, total: items.length });
});

route('PUT', '/api/admin/content/:type/:id', async (req, res, params) => {
  const admin = requireAdmin(req, res); if (!admin) return;
  const body = await readBody(req);
  const key = params.type + ':' + params.id;
  D.saveContentEdit(key, body.data || {}, body.status || 'on');
  refreshContentEdits();
  sendJSON(res, 200, { ok: true });
});

route('GET', '/api/admin/metrics', (req, res) => {
  const admin = requireAdmin(req, res); if (!admin) return;
  sendJSON(res, 200, { metrics: D.adminMetrics() });
});

route('POST', '/api/admin/announce', async (req, res) => {
  const admin = requireAdmin(req, res); if (!admin) return;
  const body = await readBody(req);
  const content = String(body.content || '').trim();
  if (!content) return sendJSON(res, 400, { error: '公告内容不能为空' });
  const users = D.db.prepare('SELECT id FROM users').all();
  for (const u of users) {
    D.addNotification({ user_id: u.id, actor_id: admin.id, type: 'announce', content });
  }
  sendJSON(res, 200, { ok: true, sent: users.length });
});
route('POST', '/api/admin/posts/:id/essence', async (req, res, params) => {
  const admin = requireAdmin(req, res); if (!admin) return;
  const body = await readBody(req);
  D.setPostEssence(parseInt(params.id, 10), !!body.essence);
  sendJSON(res, 200, { ok: true });
});

// ===== 测评历史 =====
route('GET', '/api/assessments/history', (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const rows = D.db.prepare('SELECT id, result_json, created_at FROM assessments WHERE user_id = ? ORDER BY id ASC').all(user.id);
  const items = rows.map(r => ({ id: r.id, created_at: r.created_at, result: summarizeResult(JSON.parse(r.result_json)) }));
  sendJSON(res, 200, { assessments: items });
});

// ===== 会员 =====
route('POST', '/api/membership/upgrade', async (req, res) => {
  const user = requireAuth(req, res); if (!user) return;
  const body = await readBody(req);
  const plans = {
    monthly: { amount: 29, days: 31 },
    yearly: { amount: 299, days: 366 },
    pro: { amount: 999, days: 366 }
  };
  const plan = plans[body.plan];
  if (!plan) return sendJSON(res, 400, { error: '无效的套餐' });
  const base = Math.max(user.member_until, Date.now());
  const until = base + plan.days * 86400000;
  D.setMemberUntil(user.id, until);
  D.addOrder(user.id, body.plan, plan.amount, until);
  const newly = settleBadges(D.getUserById(user.id));
  sendJSON(res, 200, { ok: true, user: publicUser(D.getUserById(user.id)), badges: newly });
});

// ===== 年度报告 =====
route('GET', '/api/report/:year', (req, res, params) => {
  const user = requireAuth(req, res); if (!user) return;
  const year = parseInt(params.year, 10);
  if (!year) return sendJSON(res, 400, { error: '年份无效' });
  const events = D.listTimeline(user.id);
  const report = generateAnnualReport(events, year, user);
  sendJSON(res, 200, { report, member: true });
});

// ---------- 静态文件 ----------
function serveStatic(req, res, pathname) {
  let filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(PUBLIC_DIR)) { sendJSON(res, 403, { error: 'forbidden' }); return; }
  if (pathname === '/') filePath = path.join(PUBLIC_DIR, 'index.html');
  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    fs.readFile(filePath, (err2, data) => {
      if (err2) { sendJSON(res, 404, { error: 'not found' }); return; }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
}

// ---------- Server ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const pathname = url.pathname;
  try {
    if (pathname.startsWith('/api/')) {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const params = match(pathname, r.pattern);
        if (params) return await r.handler(req, res, params);
      }
      return sendJSON(res, 404, { error: '接口不存在' });
    }
    serveStatic(req, res, pathname);
  } catch (e) {
    console.error('[server error]', e);
    if (!res.headersSent) sendJSON(res, 500, { error: '服务器内部错误' });
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  🌅  未来致远 · 你的人生，自己导航');
  console.log(`  🌐  http://localhost:${PORT}`);
  console.log('  演示账号：demo / demo123（会员）   xinqing / xinqing123（成长账号）');
  console.log('');
});
