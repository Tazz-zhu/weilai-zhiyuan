// 未来致远 · 数据层（node:sqlite）
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
const dbPath = join(dataDir, 'zhiyuan.db');

export const db = new DatabaseSync(dbPath);

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT DEFAULT 'sun',
  bio TEXT DEFAULT '',
  education TEXT DEFAULT '',
  city TEXT DEFAULT '',
  target TEXT DEFAULT '',
  member_until INTEGER DEFAULT 0,
  role TEXT DEFAULT 'user',
  disabled INTEGER DEFAULT 0,
  invited_by INTEGER DEFAULT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  answers_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS timeline_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  goal_id INTEGER DEFAULT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS capsules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  open_date TEXT NOT NULL,
  status TEXT DEFAULT 'sealed',
  created_at INTEGER NOT NULL,
  opened_at INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  group_type TEXT DEFAULT 'general',
  career_id TEXT DEFAULT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_json TEXT DEFAULT '[]',
  essence INTEGER DEFAULT 0,
  tags_json TEXT DEFAULT '[]',
  post_type TEXT DEFAULT 'share',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS likes (
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at INTEGER NOT NULL,
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY,
  data_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS fav_posts (
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS fav_schools (
  user_id INTEGER NOT NULL,
  school_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, school_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER NOT NULL,
  career_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, career_id)
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  desc TEXT DEFAULT '',
  deadline TEXT DEFAULT '',
  milestones_json TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user INTEGER NOT NULL,
  to_user INTEGER NOT NULL,
  content TEXT NOT NULL,
  media_json TEXT DEFAULT '[]',
  read INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_msg_pair ON messages(from_user, to_user, id);
CREATE INDEX IF NOT EXISTS idx_msg_to ON messages(to_user, read);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  actor_id INTEGER DEFAULT NULL,
  type TEXT NOT NULL,
  ref_id INTEGER DEFAULT NULL,
  content TEXT DEFAULT '',
  read INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read, id);

CREATE TABLE IF NOT EXISTS follows (
  follower_id INTEGER NOT NULL,
  followee_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (follower_id, followee_id)
);

CREATE TABLE IF NOT EXISTS content_edits (
  key TEXT PRIMARY KEY,
  data_json TEXT DEFAULT '{}',
  status TEXT DEFAULT 'on',
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER DEFAULT NULL,
  comment_id INTEGER DEFAULT NULL,
  user_id INTEGER NOT NULL,
  reason TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS checkins (
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  plan TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'paid',
  created_at INTEGER NOT NULL,
  member_until INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sim_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT NULL,
  guest_id TEXT DEFAULT NULL,
  name TEXT DEFAULT '',
  career_id TEXT DEFAULT '',
  state_json TEXT NOT NULL,
  meta_json TEXT DEFAULT '{}',
  stage_index INTEGER DEFAULT 0,
  status TEXT DEFAULT 'playing',
  ending_json TEXT DEFAULT '{}',
  settled INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  finished_at INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sim_user ON sim_runs(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_sim_guest ON sim_runs(guest_id, updated_at);
`);

// 迁移：旧库补充 career_id 列
try {
  const cols = db.prepare("PRAGMA table_info(posts)").all();
  if (!cols.some(col => col.name === 'career_id')) {
    db.exec("ALTER TABLE posts ADD COLUMN career_id TEXT DEFAULT NULL");
  }
} catch (e) { /* ignore */ }
// 迁移：posts 表补充 media_json / essence
try {
  const pcols = db.prepare("PRAGMA table_info(posts)").all();
  if (!pcols.some(col => col.name === 'media_json')) db.exec("ALTER TABLE posts ADD COLUMN media_json TEXT DEFAULT '[]'");
  if (!pcols.some(col => col.name === 'essence')) db.exec("ALTER TABLE posts ADD COLUMN essence INTEGER DEFAULT 0");
  if (!pcols.some(col => col.name === 'tags_json')) db.exec("ALTER TABLE posts ADD COLUMN tags_json TEXT DEFAULT '[]'");
  if (!pcols.some(col => col.name === 'post_type')) db.exec("ALTER TABLE posts ADD COLUMN post_type TEXT DEFAULT 'share'");
} catch (e) { /* ignore */ }
// 迁移：messages 补充 media_json
try {
  const mcols = db.prepare("PRAGMA table_info(messages)").all();
  if (!mcols.some(col => col.name === 'media_json')) db.exec("ALTER TABLE messages ADD COLUMN media_json TEXT DEFAULT '[]'");
} catch (e) { /* ignore */ }
// 迁移：timeline_events 补充 goal_id
try {
  const tcols = db.prepare("PRAGMA table_info(timeline_events)").all();
  if (!tcols.some(col => col.name === 'goal_id')) db.exec("ALTER TABLE timeline_events ADD COLUMN goal_id INTEGER DEFAULT NULL");
} catch (e) { /* ignore */ }
// 迁移：users 表补充 role / disabled
try {
  const ucols = db.prepare("PRAGMA table_info(users)").all();
  if (!ucols.some(col => col.name === 'role')) db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
  if (!ucols.some(col => col.name === 'disabled')) db.exec("ALTER TABLE users ADD COLUMN disabled INTEGER DEFAULT 0");
  if (!ucols.some(col => col.name === 'invited_by')) db.exec("ALTER TABLE users ADD COLUMN invited_by INTEGER DEFAULT NULL");
} catch (e) { /* ignore */ }

// 工具函数
export function now() { return Date.now(); }

export function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}
export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}
export function updateUser(id, fields) {
  const allowed = ['nickname', 'avatar', 'bio', 'education', 'city', 'target'];
  const entries = Object.entries(fields).filter(([k]) => allowed.includes(k) && fields[k] !== undefined);
  if (!entries.length) return getUserById(id);
  const set = entries.map(([k]) => `${k} = ?`).join(', ');
  const stmt = db.prepare(`UPDATE users SET ${set} WHERE id = ?`);
  stmt.run(...entries.map(([, v]) => v), id);
  return getUserById(id);
}
export function createUser({ username, password_hash, salt, nickname, created_at }) {
  const info = db.prepare(
    'INSERT INTO users (username, password_hash, salt, nickname, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(username, password_hash, salt, nickname, created_at);
  return getUserById(Number(info.lastInsertRowid));
}
export function createSession(token, userId, expiresAt) {
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
}
export function getSession(token) {
  return db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
}
export function deleteSession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}
export function deleteExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now());
}

// 测评
export function saveAssessment(userId, answers, result) {
  const info = db.prepare(
    'INSERT INTO assessments (user_id, answers_json, result_json, created_at) VALUES (?, ?, ?, ?)'
  ).run(userId, JSON.stringify(answers), JSON.stringify(result), now());
  return Number(info.lastInsertRowid);
}
export function getLatestAssessment(userId) {
  const row = db.prepare(
    'SELECT * FROM assessments WHERE user_id = ? ORDER BY id DESC LIMIT 1'
  ).get(userId);
  return row ? { ...row, answers: JSON.parse(row.answers_json), result: JSON.parse(row.result_json) } : null;
}
export function listAssessments(userId) {
  const rows = db.prepare('SELECT id, created_at FROM assessments WHERE user_id = ? ORDER BY id DESC').all(userId);
  return rows.map(r => ({ id: r.id, created_at: r.created_at }));
}

// 时光轴
export function addTimelineEvent(userId, { date, type, title, description, goal_id }) {
  const info = db.prepare(
    'INSERT INTO timeline_events (user_id, date, type, title, description, goal_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(userId, date, type, title, description || '', goal_id || null, now());
  return Number(info.lastInsertRowid);
}
export function listTimeline(userId) {
  return db.prepare('SELECT * FROM timeline_events WHERE user_id = ? ORDER BY date DESC, id DESC').all(userId);
}
export function deleteTimelineEvent(id, userId) {
  return db.prepare('DELETE FROM timeline_events WHERE id = ? AND user_id = ?').run(id, userId);
}

// 时光胶囊
export function addCapsule(userId, { title, content, open_date }) {
  const status = new Date(open_date) <= new Date() ? 'openable' : 'sealed';
  const info = db.prepare(
    'INSERT INTO capsules (user_id, title, content, open_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, title, content, open_date, status, now());
  return Number(info.lastInsertRowid);
}
export function listCapsules(userId) {
  const rows = db.prepare('SELECT * FROM capsules WHERE user_id = ? ORDER BY open_date ASC').all(userId);
  return rows.map(r => {
    const isDue = new Date(r.open_date) <= new Date();
    return {
      id: r.id, title: r.title, open_date: r.open_date,
      status: isDue ? 'openable' : r.status,
      created_at: r.created_at, opened_at: r.opened_at,
      sealed: !isDue
    };
  });
}
export function getCapsule(id, userId) {
  const r = db.prepare('SELECT * FROM capsules WHERE id = ? AND user_id = ?').get(id, userId);
  if (!r) return null;
  const isDue = new Date(r.open_date) <= new Date();
  const unlocked = isDue || r.status === 'opened';
  return {
    id: r.id, title: r.title, open_date: r.open_date, status: isDue ? 'openable' : r.status,
    content: unlocked ? r.content : null, created_at: r.created_at, opened_at: r.opened_at,
    sealed: !unlocked
  };
}
export function openCapsule(id, userId) {
  db.prepare("UPDATE capsules SET status = 'opened', opened_at = ? WHERE id = ? AND user_id = ?").run(now(), id, userId);
  return getCapsule(id, userId);
}

// 社区
export function addPost(userId, { group_type, title, content, career_id, media, essence, post_type }) {
  const info = db.prepare(
    'INSERT INTO posts (user_id, group_type, career_id, title, content, media_json, essence, tags_json, post_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(userId, group_type || 'general', career_id || null, title, content, JSON.stringify(media || []), essence ? 1 : 0, JSON.stringify(parseTags(title + ' ' + content)), post_type || 'share', now());
  return Number(info.lastInsertRowid);
}
export function listPosts(groupType, userId, hot = false, careerId = null, tag = null, sort = 'mix') {
  let rows;
  if (tag) {
    rows = db.prepare("SELECT * FROM posts WHERE tags_json LIKE ? ORDER BY id DESC").all('%' + JSON.stringify(tag).slice(1, -1) + '%');
  } else if (careerId) {
    rows = db.prepare('SELECT * FROM posts WHERE career_id = ? ORDER BY id DESC').all(careerId);
  } else if (groupType && groupType !== 'all') {
    rows = db.prepare('SELECT * FROM posts WHERE group_type = ? ORDER BY id DESC').all(groupType);
  } else {
    rows = db.prepare('SELECT * FROM posts ORDER BY id DESC').all();
  }
  const users = new Map(db.prepare('SELECT id, nickname, avatar FROM users').all().map(u => [u.id, u]));
  const likesCount = db.prepare('SELECT post_id, COUNT(*) as n FROM likes GROUP BY post_id');
  const likeMap = new Map(likesCount.all().map(r => [r.post_id, r.n]));
  const myLikes = userId ? new Set(db.prepare('SELECT post_id FROM likes WHERE user_id = ?').all(userId).map(r => r.post_id)) : new Set();
  const out = rows.map(r => {
    const u = users.get(r.user_id) || { nickname: '未知用户', avatar: 'sun' };
    return {
      id: r.id, group_type: r.group_type, title: r.title, content: r.content, created_at: r.created_at,
      user: u, likes: likeMap.get(r.id) || 0, likedByMe: myLikes.has(r.id),
      career_id: r.career_id, essence: r.essence,
      media: JSON.parse(r.media_json || '[]'),
      tags: JSON.parse(r.tags_json || '[]'),
      post_type: r.post_type || 'share'
    };
  });
  if (sort === 'new') out.sort((a, b) => b.id - a.id);
  else if (sort === 'hot') out.sort((a, b) => b.likes - a.likes);
  else if (sort === 'essence') out.sort((a, b) => (b.essence - a.essence) || (b.id - a.id));
  else if (hot) out.sort((a, b) => b.likes - a.likes);
  else out.sort((a, b) => (b.essence - a.essence) || (b.id - a.id));
  return out;
}
export function getPost(id) {
  return db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
}
export function toggleLike(postId, userId) {
  const existing = db.prepare('SELECT * FROM likes WHERE post_id = ? AND user_id = ?').get(postId, userId);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(postId, userId);
    return { liked: false };
  }
  db.prepare('INSERT INTO likes (post_id, user_id, created_at) VALUES (?, ?, ?)').run(postId, userId, now());
  return { liked: true };
}
export function addComment(postId, userId, content) {
  const info = db.prepare(
    'INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)'
  ).run(postId, userId, content, now());
  return Number(info.lastInsertRowid);
}
export function listComments(postId) {
  const rows = db.prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY id ASC').all(postId);
  const users = new Map(db.prepare('SELECT id, nickname, avatar FROM users').all().map(u => [u.id, u]));
  return rows.map(r => ({
    id: r.id, content: r.content, created_at: r.created_at,
    user: users.get(r.user_id) || { nickname: '未知用户', avatar: 'sun' }
  }));
}

// 徽章 / 订单
export function earnBadge(userId, badgeId) {
  try {
    db.prepare('INSERT INTO badges (user_id, badge_id, earned_at) VALUES (?, ?, ?)').run(userId, badgeId, now());
    return true;
  } catch { return false; }
}
export function listBadges(userId) {
  return db.prepare('SELECT badge_id, earned_at FROM badges WHERE user_id = ?').all(userId);
}
export function addOrder(userId, plan, amount, memberUntil) {
  const info = db.prepare(
    'INSERT INTO orders (user_id, plan, amount, status, created_at, member_until) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, plan, amount, 'paid', now(), memberUntil);
  return Number(info.lastInsertRowid);
}
export function setMemberUntil(userId, ts) {
  db.prepare('UPDATE users SET member_until = ? WHERE id = ?').run(ts, userId);
}
export function isMember(user) {
  return !!user && user.member_until > now();
}

// 签到
export function addCheckin(userId, date) {
  try {
    db.prepare('INSERT OR IGNORE INTO checkins (user_id, date, created_at) VALUES (?, ?, ?)').run(userId, date, now());
  } catch (e) {}
}
export function getCheckins(userId) {
  return db.prepare('SELECT date FROM checkins WHERE user_id = ? ORDER BY date DESC').all(userId).map(r => r.date);
}
export function computeStreak(userId) {
  const dates = new Set(getCheckins(userId));
  let streak = 0;
  const d = new Date();
  // 今天未签到时从昨天开始算（用于展示"连续 N 天"）
  const today = toDateStr(d);
  if (!dates.has(today)) d.setDate(d.getDate() - 1);
  while (dates.has(toDateStr(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return { streak, today: dates.has(today) };
}
export function toDateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// 升学档案
export function getProfile(userId) {
  const r = db.prepare('SELECT data_json, updated_at FROM user_profiles WHERE user_id = ?').get(userId);
  return r ? { ...JSON.parse(r.data_json), updated_at: r.updated_at } : null;
}
export function saveProfile(userId, data) {
  db.prepare('INSERT INTO user_profiles (user_id, data_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at')
    .run(userId, JSON.stringify(data), now());
  return getProfile(userId);
}

// 职业圈子统计
export function careerPostStats() {
  const rows = db.prepare("SELECT career_id, COUNT(*) as n, MAX(created_at) as last FROM posts WHERE career_id IS NOT NULL GROUP BY career_id").all();
  const map = {};
  for (const r of rows) map[r.career_id] = { post_count: r.n, last_active: r.last };
  return map;
}

// ---------- 后台管理 ----------
export function adminStats() {
  const one = (sql) => db.prepare(sql).get().n;
  const today = toDateStr(new Date());
  const trend = (table, col = 'created_at') => db.prepare(
    "SELECT date((" + col + ")/1000, 'unixepoch', 'localtime') as day, COUNT(*) as n FROM " + table + " WHERE " + col + " >= ? GROUP BY day ORDER BY day"
  ).all(Date.now() - 14 * 86400000);
  return {
    users: one('SELECT COUNT(*) as n FROM users'),
    users_today: one("SELECT COUNT(*) as n FROM users WHERE date(created_at/1000, 'unixepoch', 'localtime') = '" + today + "'"),
    admins: one("SELECT COUNT(*) as n FROM users WHERE role = 'admin'"),
    disabled: one('SELECT COUNT(*) as n FROM users WHERE disabled = 1'),
    posts: one('SELECT COUNT(*) as n FROM posts'),
    comments: one('SELECT COUNT(*) as n FROM comments'),
    assessments: one('SELECT COUNT(*) as n FROM assessments'),
    events: one('SELECT COUNT(*) as n FROM timeline_events'),
    capsules: one('SELECT COUNT(*) as n FROM capsules'),
    checkin_users: one('SELECT COUNT(DISTINCT user_id) as n FROM checkins'),
    checkin_total: one('SELECT COUNT(*) as n FROM checkins'),
    badges: one('SELECT COUNT(*) as n FROM badges'),
    likes: one('SELECT COUNT(*) as n FROM likes'),
    career_posts: one('SELECT COUNT(*) as n FROM posts WHERE career_id IS NOT NULL'),
    user_trend: trend('users'),
    post_trend: trend('posts')
  };
}

export function adminListUsers(q = '', page = 1, limit = 20) {
  const like = '%' + q + '%';
  const where = q ? 'WHERE username LIKE ? OR nickname LIKE ? OR city LIKE ?' : '';
  const params = q ? [like, like, like] : [];
  const total = db.prepare('SELECT COUNT(*) as n FROM users ' + where).get(...params).n;
  const rows = db.prepare('SELECT * FROM users ' + where + ' ORDER BY id DESC LIMIT ? OFFSET ?').all(...params, limit, (page - 1) * limit);
  const stats = rows.map(u => {
    const p = db.prepare('SELECT COUNT(*) as n FROM posts WHERE user_id = ?').get(u.id).n;
    const e = db.prepare('SELECT COUNT(*) as n FROM timeline_events WHERE user_id = ?').get(u.id).n;
    const a = db.prepare('SELECT COUNT(*) as n FROM assessments WHERE user_id = ?').get(u.id).n;
    const last = db.prepare("SELECT MAX(created_at) as m FROM (SELECT created_at FROM posts WHERE user_id = ? UNION ALL SELECT created_at FROM comments WHERE user_id = ? UNION ALL SELECT created_at FROM timeline_events WHERE user_id = ?)").get(u.id, u.id, u.id).m;
    return { ...u, post_count: p, event_count: e, assessment_count: a, last_active: last };
  });
  return { total, items: stats };
}
export function setUserDisabled(id, disabled) {
  db.prepare('UPDATE users SET disabled = ? WHERE id = ?').run(disabled ? 1 : 0, id);
}
export function deleteUserCascade(id) {
  const tables = ['sessions', 'posts', 'comments', 'likes', 'timeline_events', 'capsules', 'assessments', 'badges', 'checkins', 'orders', 'user_profiles'];
  for (const t of tables) {
    const col = t === 'posts' || t === 'comments' || t === 'likes' ? 'user_id' : 'user_id';
    db.prepare('DELETE FROM ' + t + ' WHERE user_id = ?').run(id);
  }
  // posts 的评论与点赞级联
  db.prepare('DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)').run(id);
  db.prepare('DELETE FROM likes WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}
export function adminListPosts(q = '', page = 1, limit = 20) {
  const like = '%' + q + '%';
  const where = q ? 'WHERE p.title LIKE ? OR p.content LIKE ? OR u.nickname LIKE ?' : '';
  const params = q ? [like, like, like] : [];
  const total = db.prepare('SELECT COUNT(*) as n FROM posts p LEFT JOIN users u ON u.id = p.user_id ' + where).get(...params).n;
  const rows = db.prepare(
    'SELECT p.*, u.nickname, u.username, (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count, (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as like_count FROM posts p LEFT JOIN users u ON u.id = p.user_id ' + where + ' ORDER BY p.id DESC LIMIT ? OFFSET ?'
  ).all(...params, limit, (page - 1) * limit);
  return { total, items: rows };
}
export function adminListComments(q = '', page = 1, limit = 20) {
  const like = '%' + q + '%';
  const where = q ? 'WHERE c.content LIKE ? OR u.nickname LIKE ?' : '';
  const params = q ? [like, like] : [];
  const total = db.prepare('SELECT COUNT(*) as n FROM comments c LEFT JOIN users u ON u.id = c.user_id ' + where).get(...params).n;
  const rows = db.prepare(
    'SELECT c.*, u.nickname, u.username, p.title as post_title FROM comments c LEFT JOIN users u ON u.id = c.user_id LEFT JOIN posts p ON p.id = c.post_id ' + where + ' ORDER BY c.id DESC LIMIT ? OFFSET ?'
  ).all(...params, limit, (page - 1) * limit);
  return { total, items: rows };
}
export function deleteComment(id) {
  db.prepare('DELETE FROM comments WHERE id = ?').run(id);
}
export function deletePostCascade(id) {
  db.prepare('DELETE FROM comments WHERE post_id = ?').run(id);
  db.prepare('DELETE FROM likes WHERE post_id = ?').run(id);
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
}

// ---------- 我的内容 / 账号 ----------
export function getUserPosts(userId) {
  const rows = db.prepare('SELECT * FROM posts WHERE user_id = ? ORDER BY id DESC').all(userId);
  return rows.map(r => ({
    id: r.id, title: r.title, content: r.content, group_type: r.group_type, career_id: r.career_id, created_at: r.created_at
  }));
}

// ---------- 举报 / 敏感词 ----------
export function addReport({ post_id, comment_id, user_id, reason }) {
  const info = db.prepare(
    'INSERT INTO reports (post_id, comment_id, user_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(post_id || null, comment_id || null, user_id, reason || '', 'pending', now());
  return Number(info.lastInsertRowid);
}
export function listReports(status = 'all', page = 1, limit = 20) {
  const where = status === 'all' ? '' : 'WHERE r.status = ?';
  const params = status === 'all' ? [] : [status];
  const total = db.prepare('SELECT COUNT(*) as n FROM reports r ' + where).get(...params).n;
  const rows = db.prepare(
    "SELECT r.*, u.nickname, u.username, p.title as post_title, c.content as comment_content FROM reports r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN posts p ON p.id = r.post_id LEFT JOIN comments c ON c.id = r.comment_id " + where + " ORDER BY r.id DESC LIMIT ? OFFSET ?"
  ).all(...params, limit, (page - 1) * limit);
  return { total, items: rows };
}
export function setReportStatus(id, status) {
  db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, id);
}

export const SENSITIVE_WORDS = ['傻逼', '煞笔', '他妈', '去死', '废物', '白痴', '脑残', '垃圾滚', '操你', '滚蛋', '贱人', '狗屎', '妈的', '草泥马', 'fuck', 'shit', 'bitch'];
export function filterSensitive(text) {
  let t = String(text || '');
  for (const w of SENSITIVE_WORDS) {
    t = t.split(w).join('*'.repeat(w.length));
  }
  return t;
}

// ---------- 导出用户数据 ----------
export function exportUserData(userId) {
  const u = getUserById(userId);
  if (!u) return null;
  return {
    user: { username: u.username, nickname: u.nickname, bio: u.bio, education: u.education, city: u.city, target: u.target, created_at: u.created_at },
    profile: getProfile(userId),
    assessments: db.prepare('SELECT id, created_at FROM assessments WHERE user_id = ? ORDER BY id').all(userId),
    timeline: listTimeline(userId),
    capsules: db.prepare('SELECT id, title, content, open_date, status, created_at, opened_at FROM capsules WHERE user_id = ? ORDER BY id').all(userId),
    posts: getUserPosts(userId),
    comments: db.prepare('SELECT id, post_id, content, created_at FROM comments WHERE user_id = ? ORDER BY id').all(userId),
    badges: listBadges(userId),
    checkins: getCheckins(userId)
  };
}

// ---------- 通知 ----------
export function addNotification({ user_id, actor_id, type, ref_id, content }) {
  if (!user_id) return;
  db.prepare('INSERT INTO notifications (user_id, actor_id, type, ref_id, content, read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)')
    .run(user_id, actor_id || null, type, ref_id || null, content || '', now());
}
export function listNotifications(userId, limit = 20) {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(userId, limit);
  const users = new Map(db.prepare('SELECT id, nickname, avatar FROM users').all().map(u => [u.id, u]));
  return rows.map(r => ({ ...r, actor: r.actor_id ? users.get(r.actor_id) || null : null }));
}
export function unreadCount(userId) {
  return db.prepare('SELECT COUNT(*) as n FROM notifications WHERE user_id = ? AND read = 0').get(userId).n;
}
export function markNotificationsRead(userId) {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
}
export function ensureCapsuleNotifications(userId) {
  // 已到期未开启的胶囊 → 生成通知（每条胶囊最多一条）
  const caps = db.prepare("SELECT * FROM capsules WHERE user_id = ? AND open_date <= date('now') AND status != 'opened'").all(userId);
  for (const cap of caps) {
    const exists = db.prepare("SELECT COUNT(*) as n FROM notifications WHERE user_id = ? AND type = 'capsule' AND ref_id = ? AND content LIKE ?").get(userId, cap.id, '%' + cap.title + '%').n;
    if (!exists) addNotification({ user_id: userId, type: 'capsule', ref_id: cap.id, content: '你的时光胶囊「' + cap.title + '」可以开启啦' });
  }
}

// ---------- 关注 ----------
export function isFollowing(followerId, followeeId) {
  return !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?').get(followerId, followeeId);
}
export function toggleFollow(followerId, followeeId) {
  if (followerId === followeeId) return { followed: false, self: true };
  if (isFollowing(followerId, followeeId)) {
    db.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').run(followerId, followeeId);
    return { followed: false };
  }
  db.prepare('INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)').run(followerId, followeeId, now());
  addNotification({ user_id: followeeId, actor_id: followerId, type: 'follow', ref_id: followerId, content: '关注了你' });
  return { followed: true };
}
export function followingList(userId) {
  const rows = db.prepare('SELECT followee_id as id FROM follows WHERE follower_id = ? ORDER BY created_at DESC').all(userId);
  const users = new Map(db.prepare('SELECT id, nickname, avatar, city, target FROM users').all().map(u => [u.id, u]));
  return rows.map(r => users.get(r.id)).filter(Boolean);
}
export function followerCount(userId) {
  return db.prepare('SELECT COUNT(*) as n FROM follows WHERE followee_id = ?').get(userId).n;
}
export function followingFeed(userId, limit = 30) {
  const ids = db.prepare('SELECT followee_id as id FROM follows WHERE follower_id = ?').all(userId).map(r => r.id);
  if (!ids.length) return [];
  const ph = ids.map(() => '?').join(',');
  const rows = db.prepare('SELECT * FROM posts WHERE user_id IN (' + ph + ') ORDER BY id DESC LIMIT ?').all(...ids, limit);
  const users = new Map(db.prepare('SELECT id, nickname, avatar FROM users').all().map(u => [u.id, u]));
  return rows.map(r => ({ ...r, user: users.get(r.user_id) || { nickname: '未知', avatar: 'sun' } }));
}

// ---------- 内容 CMS ----------
export function getContentEdits(key) {
  return db.prepare('SELECT * FROM content_edits WHERE key = ?').get(key);
}
export function saveContentEdit(key, data, status) {
  db.prepare('INSERT INTO content_edits (key, data_json, status, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET data_json = excluded.data_json, status = excluded.status, updated_at = excluded.updated_at')
    .run(key, JSON.stringify(data || {}), status || 'on', now());
  return getContentEdits(key);
}
export function listContentEdits() {
  return db.prepare('SELECT key, status, updated_at FROM content_edits').all();
}
export function allContentEditMap() {
  const map = {};
  for (const r of db.prepare('SELECT key, data_json, status FROM content_edits').all()) {
    map[r.key] = { data: JSON.parse(r.data_json || '{}'), status: r.status };
  }
  return map;
}

// ---------- 运营指标 ----------
export function adminMetrics() {
  const distinct = (sql) => db.prepare(sql).get().n;
  const activeSince = (days) => {
    const t = Date.now() - days * 86400000;
    const sql = "SELECT COUNT(DISTINCT user_id) as n FROM (SELECT user_id FROM posts WHERE created_at >= ? UNION SELECT user_id FROM comments WHERE created_at >= ? UNION SELECT user_id FROM likes WHERE created_at >= ? UNION SELECT user_id FROM timeline_events WHERE created_at >= ? UNION SELECT user_id FROM assessments WHERE created_at >= ? UNION SELECT user_id FROM checkins WHERE created_at >= ?)";
    return db.prepare(sql).get(t, t, t, t, t, t).n;
  };
  const funnel = {
    registered: distinct('SELECT COUNT(*) as n FROM users'),
    assessed: distinct('SELECT COUNT(DISTINCT user_id) as n FROM assessments'),
    recorded: distinct('SELECT COUNT(DISTINCT user_id) as n FROM timeline_events'),
    posted: distinct('SELECT COUNT(DISTINCT user_id) as n FROM posts'),
    checked: distinct('SELECT COUNT(DISTINCT user_id) as n FROM checkins'),
    followed: distinct('SELECT COUNT(DISTINCT follower_id) as n FROM follows')
  };
  // 留存近似：注册后第 N 天有活跃行为的用户占比（按注册天数分组）
  const ret = { day1: 0, day3: 0, day7: 0, n: 0 };
  const users = db.prepare('SELECT id, created_at FROM users').all();
  const activeDays = new Map();
  const addActive = (table, col) => {
    for (const r of db.prepare('SELECT user_id, ' + col + ' as ts FROM ' + table).all()) {
      if (!activeDays.has(r.user_id)) activeDays.set(r.user_id, new Set());
      activeDays.get(r.user_id).add(Math.floor(r.ts / 86400000));
    }
  };
  addActive('posts', 'created_at'); addActive('comments', 'created_at'); addActive('likes', 'created_at');
  addActive('timeline_events', 'created_at'); addActive('assessments', 'created_at'); addActive('checkins', 'created_at');
  const todayDay = Math.floor(Date.now() / 86400000);
  for (const u of users) {
    const regDay = Math.floor(u.created_at / 86400000);
    const days = activeDays.get(u.id);
    if (!days) continue;
    const has = (offset) => days.has(regDay + offset);
    if (todayDay - regDay >= 2) { ret.n++; if (has(1)) ret.day1++; }
    if (todayDay - regDay >= 4) { if (has(3)) ret.day3++; }
    if (todayDay - regDay >= 8) { if (has(7)) ret.day7++; }
  }
  return {
    funnel,
    dau: activeSince(1), wau: activeSince(7), mau: activeSince(30),
    retention: ret.n ? { day1: Math.round(ret.day1 / ret.n * 100), day3: Math.round(ret.day3 / ret.n * 100), day7: Math.round(ret.day7 / ret.n * 100), n: ret.n } : { day1: 0, day3: 0, day7: 0, n: 0 },
    follows: db.prepare('SELECT COUNT(*) as n FROM follows').get().n
  };
}

// ---------- 私信 ----------
export function sendMessage(fromUser, toUser, content, media) {
  const info = db.prepare('INSERT INTO messages (from_user, to_user, content, media_json, read, created_at) VALUES (?, ?, ?, ?, 0, ?)')
    .run(fromUser, toUser, content, JSON.stringify(media || []), now());
  return Number(info.lastInsertRowid);
}
export function listConversations(userId) {
  const rows = db.prepare(
    "SELECT m.*, u.nickname, u.avatar FROM messages m JOIN users u ON u.id = CASE WHEN m.from_user = ? THEN m.to_user ELSE m.from_user END WHERE m.from_user = ? OR m.to_user = ? ORDER BY m.id DESC"
  ).all(userId, userId, userId);
  const map = new Map();
  for (const r of rows) {
    const otherId = r.from_user === userId ? r.to_user : r.from_user;
    if (!map.has(otherId)) {
      const unread = db.prepare('SELECT COUNT(*) as n FROM messages WHERE from_user = ? AND to_user = ? AND read = 0').get(otherId, userId).n;
      map.set(otherId, { user_id: otherId, nickname: r.nickname, avatar: r.avatar, last_message: r.content, last_time: r.created_at, unread });
    }
  }
  return [...map.values()].sort((a, b) => b.last_time - a.last_time);
}
export function listMessages(userId, otherId, limit = 100) {
  const rows = db.prepare(
    'SELECT * FROM messages WHERE (from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?) ORDER BY id DESC LIMIT ?'
  ).all(userId, otherId, otherId, userId, limit).reverse().map(r => ({ ...r, media: JSON.parse(r.media_json || '[]') }));
  // 标记对方发来的为已读
  db.prepare('UPDATE messages SET read = 1 WHERE from_user = ? AND to_user = ? AND read = 0').run(otherId, userId);
  return rows;
}
export function unreadMessageCount(userId) {
  return db.prepare('SELECT COUNT(*) as n FROM messages WHERE to_user = ? AND read = 0').get(userId).n;
}

export function setPostEssence(id, essence) {
  db.prepare('UPDATE posts SET essence = ? WHERE id = ?').run(essence ? 1 : 0, id);
}

// ---------- 人生目标 ----------
export function addGoal(userId, { title, desc, deadline, milestones }) {
  const info = db.prepare('INSERT INTO goals (user_id, title, desc, deadline, milestones_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, title, desc || '', deadline || '', JSON.stringify(milestones || []), now());
  return Number(info.lastInsertRowid);
}
export function listGoals(userId) {
  return db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY id DESC').all(userId).map(g => ({
    ...g, milestones: JSON.parse(g.milestones_json || '[]'),
    progress: goalProgress(g),
    eventCount: db.prepare('SELECT COUNT(*) as n FROM timeline_events WHERE goal_id = ?').get(g.id).n
  }));
}
function goalProgress(g) {
  const ms = JSON.parse(g.milestones_json || '[]');
  if (!ms.length) return 0;
  return Math.round(ms.filter(m => m.done).length / ms.length * 100);
}
export function getGoal(id, userId) {
  const g = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(id, userId);
  if (!g) return null;
  const eventCount = db.prepare('SELECT COUNT(*) as n FROM timeline_events WHERE goal_id = ?').get(id).n;
  return { ...g, milestones: JSON.parse(g.milestones_json || '[]'), progress: goalProgress(g), eventCount };
}
export function updateGoalMilestone(id, userId, idx, done) {
  const g = getGoal(id, userId);
  if (!g) return null;
  g.milestones[idx] = { ...g.milestones[idx], done: !!done };
  db.prepare('UPDATE goals SET milestones_json = ? WHERE id = ?').run(JSON.stringify(g.milestones), id);
  return getGoal(id, userId);
}
export function deleteGoal(id, userId) {
  db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(id, userId);
}

export function parseTags(text) {
  const re = /#[\u4e00-\u9fa5A-Za-z0-9_]{1,20}/g;
  const tags = [];
  const m = String(text || '').match(re);
  if (m) for (const t of m) { const clean = t.slice(1); if (clean && !tags.includes(clean)) tags.push(clean); }
  return tags.slice(0, 6);
}

export function adminUserDetail(userId) {
  const u = getUserById(userId);
  if (!u) return null;
  const posts = db.prepare('SELECT id, title, content, career_id, created_at, essence FROM posts WHERE user_id = ? ORDER BY id DESC LIMIT 10').all(userId);
  const comments = db.prepare('SELECT id, content, created_at FROM comments WHERE user_id = ? ORDER BY id DESC LIMIT 10').all(userId);
  const events = db.prepare('SELECT date, type, title, description FROM timeline_events WHERE user_id = ? ORDER BY id DESC LIMIT 15').all(userId);
  const assessments = db.prepare('SELECT COUNT(*) as n FROM assessments WHERE user_id = ?').get(userId).n;
  const checkins = db.prepare('SELECT COUNT(*) as n FROM checkins WHERE user_id = ?').get(userId).n;
  const capsules = db.prepare('SELECT COUNT(*) as n FROM capsules WHERE user_id = ?').get(userId).n;
  const messages = db.prepare('SELECT COUNT(*) as n FROM messages WHERE from_user = ? OR to_user = ?').get(userId, userId).n;
  const invites = db.prepare('SELECT COUNT(*) as n FROM users WHERE invited_by = ?').get(userId).n;
  const badges = listBadges(userId);
  return { ...u, posts, comments, events, assessments_n: assessments, checkins_n: checkins, capsules_n: capsules, messages_n: messages, invites_n: invites, badges };
}

// ---------- 收藏 / 圈子订阅 ----------
export function toggleFavorite(userId, careerId) {
  const exists = db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND career_id = ?').get(userId, careerId);
  if (exists) { db.prepare('DELETE FROM favorites WHERE user_id = ? AND career_id = ?').run(userId, careerId); return { fav: false }; }
  db.prepare('INSERT INTO favorites (user_id, career_id, created_at) VALUES (?, ?, ?)').run(userId, careerId, now());
  return { fav: true };
}
export function isFavorite(userId, careerId) {
  return !!db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND career_id = ?').get(userId, careerId);
}
export function myFavorites(userId) {
  return db.prepare('SELECT career_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC').all(userId).map(r => r.career_id);
}
export function favoriteCount(careerId) {
  return db.prepare('SELECT COUNT(*) as n FROM favorites WHERE career_id = ?').get(careerId).n;
}

// ---------- 用户公开主页 ----------
export function publicProfile(userId) {
  const u = getUserById(userId);
  if (!u) return null;
  const events = db.prepare('SELECT date, type, title, description FROM timeline_events WHERE user_id = ? ORDER BY id DESC LIMIT 8').all(userId);
  const posts = db.prepare('SELECT id, title, content, group_type, career_id, post_type, created_at FROM posts WHERE user_id = ? ORDER BY id DESC LIMIT 8').all(userId);
  const badges = listBadges(userId);
  const followerCount = db.prepare('SELECT COUNT(*) as n FROM follows WHERE followee_id = ?').get(userId).n;
  const followingCount = db.prepare('SELECT COUNT(*) as n FROM follows WHERE follower_id = ?').get(userId).n;
  const eventCount = db.prepare('SELECT COUNT(*) as n FROM timeline_events WHERE user_id = ?').get(userId).n;
  return {
    id: u.id, username: u.username, nickname: u.nickname, avatar: u.avatar,
    bio: u.bio, city: u.city, education: u.education, target: u.target, created_at: u.created_at,
    events, posts, badges, followerCount, followingCount, eventCount
  };
}

// ---------- 成长周报 ----------
export function weeklyReport(userId) {
  const since = now() - 7 * 86400000;
  const events = db.prepare('SELECT * FROM timeline_events WHERE user_id = ? AND created_at >= ? ORDER BY id DESC').all(userId, since);
  const byType = {};
  for (const e of events) byType[e.type] = (byType[e.type] || 0) + 1;
  const badgesNew = db.prepare('SELECT badge_id FROM badges WHERE user_id = ? AND earned_at >= ?').all(userId, since).map(r => r.badge_id);
  const capsules = db.prepare('SELECT COUNT(*) as n FROM capsules WHERE user_id = ? AND created_at >= ?').get(userId, since).n;
  const posts = db.prepare('SELECT COUNT(*) as n FROM posts WHERE user_id = ? AND created_at >= ?').get(userId, since).n;
  const checkins = db.prepare('SELECT COUNT(*) as n FROM checkins WHERE user_id = ? AND created_at >= ?').get(userId, since).n;
  return {
    events, byType, badgesNew, capsules, posts, checkins,
    total: events.length,
    top: Object.entries(byType).sort((a, b) => b[1] - a[1])[0] ? Object.entries(byType).sort((a, b) => b[1] - a[1])[0][0] : null
  };
}

// ---------- 断签提醒 ----------
export function ensureCheckinReminder(userId) {
  const last = db.prepare('SELECT MAX(created_at) as m FROM checkins WHERE user_id = ?').get(userId).m;
  if (!last) return;
  const days = Math.floor((now() - last) / 86400000);
  if (days >= 2) {
    const exists = db.prepare("SELECT COUNT(*) as n FROM notifications WHERE user_id = ? AND type = 'checkin' AND content LIKE ?").get(userId, '%' + days + '%').n;
    if (!exists) addNotification({ user_id: userId, type: 'checkin', content: '已经 ' + days + ' 天没签到了，回来打个卡吧 🌱' });
  }
}

// ---------- 志愿单（院校收藏） ----------
export function toggleFavSchool(userId, schoolId) {
  const exists = db.prepare('SELECT 1 FROM fav_schools WHERE user_id = ? AND school_id = ?').get(userId, schoolId);
  if (exists) { db.prepare('DELETE FROM fav_schools WHERE user_id = ? AND school_id = ?').run(userId, schoolId); return { fav: false }; }
  db.prepare('INSERT INTO fav_schools (user_id, school_id, created_at) VALUES (?, ?, ?)').run(userId, schoolId, now());
  return { fav: true };
}
export function myFavSchools(userId) {
  return db.prepare('SELECT school_id FROM fav_schools WHERE user_id = ? ORDER BY created_at DESC').all(userId).map(r => r.school_id);
}

// ---------- 帖子/评论自助管理 ----------
export function updatePost(id, userId, { title, content, media }) {
  const p = db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?').get(id, userId);
  if (!p) return null;
  db.prepare('UPDATE posts SET title = ?, content = ?, media_json = ?, tags_json = ? WHERE id = ?')
    .run(title, content, JSON.stringify(media || []), JSON.stringify(parseTags(title + ' ' + content)), id);
  return db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
}
export function deleteMyPost(id, userId) {
  const p = db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?').get(id, userId);
  if (!p) return false;
  deletePostCascade(id);
  return true;
}
export function deleteMyComment(id, userId) {
  const c = db.prepare('SELECT * FROM comments WHERE id = ? AND user_id = ?').get(id, userId);
  if (!c) return false;
  db.prepare('DELETE FROM comments WHERE id = ?').run(id);
  return true;
}

// ---------- 帖子收藏 ----------
export function toggleFavPost(userId, postId) {
  const exists = db.prepare('SELECT 1 FROM fav_posts WHERE user_id = ? AND post_id = ?').get(userId, postId);
  if (exists) { db.prepare('DELETE FROM fav_posts WHERE user_id = ? AND post_id = ?').run(userId, postId); return { fav: false }; }
  db.prepare('INSERT INTO fav_posts (user_id, post_id, created_at) VALUES (?, ?, ?)').run(userId, postId, now());
  return { fav: true };
}
export function isFavPost(userId, postId) {
  return !!db.prepare('SELECT 1 FROM fav_posts WHERE user_id = ? AND post_id = ?').get(userId, postId);
}
export function myFavPosts(userId) {
  const rows = db.prepare('SELECT p.* FROM fav_posts f JOIN posts p ON p.id = f.post_id WHERE f.user_id = ? ORDER BY f.created_at DESC').all(userId);
  const users = new Map(db.prepare('SELECT id, nickname, avatar FROM users').all().map(u => [u.id, u]));
  return rows.map(r => ({ ...r, user: users.get(r.user_id) || { nickname: '未知', avatar: 'sun' }, media: JSON.parse(r.media_json || '[]'), tags: JSON.parse(r.tags_json || '[]') }));
}
// ===== 人生模拟舱（sim_runs）=====
export function createSimRun({ user_id, guest_id, name, career_id, state, meta, status }) {
  const st = state || {};
  const ending = st.ending || {};
  const finStatus = st.ending ? 'finished' : (status || 'playing');
  const info = db.prepare(
    'INSERT INTO sim_runs (user_id, guest_id, name, career_id, state_json, meta_json, stage_index, status, ending_json, created_at, updated_at, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(user_id || null, guest_id || null, String(name || ''), String(career_id || ''), JSON.stringify(st), JSON.stringify(meta || {}), st.stageIndex || 0, finStatus, JSON.stringify(ending), now(), now(), st.ending ? now() : 0);
  return Number(info.lastInsertRowid);
}
function simRow(r) {
  if (!r) return null;
  return {
    id: r.id, user_id: r.user_id, guest_id: r.guest_id, name: r.name,
    career_id: r.career_id, state: JSON.parse(r.state_json || '{}'),
    meta: JSON.parse(r.meta_json || '{}'), stage_index: r.stage_index,
    status: r.status, ending: JSON.parse(r.ending_json || '{}'),
    settled: !!r.settled, created_at: r.created_at, updated_at: r.updated_at, finished_at: r.finished_at
  };
}
export function getSimRun(id) {
  return simRow(db.prepare('SELECT * FROM sim_runs WHERE id = ?').get(id));
}
export function listSimRuns({ user_id, guest_id } = {}) {
  if (user_id) return db.prepare('SELECT * FROM sim_runs WHERE user_id = ? ORDER BY updated_at DESC').all(user_id).map(simRow);
  if (guest_id) return db.prepare('SELECT * FROM sim_runs WHERE guest_id = ? AND user_id IS NULL ORDER BY updated_at DESC').all(guest_id).map(simRow);
  return [];
}
export function updateSimRun(id, { state, meta, status, settled }) {
  const cur = db.prepare('SELECT * FROM sim_runs WHERE id = ?').get(id);
  if (!cur) return null;
  const next = {
    state: state !== undefined ? state : JSON.parse(cur.state_json || '{}'),
    meta: meta !== undefined ? meta : JSON.parse(cur.meta_json || '{}'),
    status: status || cur.status,
    settled: settled !== undefined ? settled : !!cur.settled
  };
  const ending = next.state.ending || {};
  db.prepare('UPDATE sim_runs SET state_json = ?, meta_json = ?, stage_index = ?, status = ?, ending_json = ?, settled = ?, updated_at = ?, finished_at = ? WHERE id = ?')
    .run(JSON.stringify(next.state), JSON.stringify(next.meta), next.state.stageIndex || 0, next.status, JSON.stringify(ending), next.settled ? 1 : 0, now(), next.state.ending ? (cur.finished_at || now()) : cur.finished_at, id);
  return simRow(db.prepare('SELECT * FROM sim_runs WHERE id = ?').get(id));
}
export function deleteSimRun(id, userId) {
  return db.prepare('DELETE FROM sim_runs WHERE id = ? AND (user_id = ? OR (user_id IS NULL AND guest_id IS NOT NULL))').run(id, userId || -1);
}
export function deleteGuestSimRun(id, guestId) {
  return db.prepare('DELETE FROM sim_runs WHERE id = ? AND guest_id = ? AND user_id IS NULL').run(id, guestId);
}
export function claimGuestRuns(guestId, userId) {
  const info = db.prepare('UPDATE sim_runs SET user_id = ?, guest_id = NULL WHERE guest_id = ? AND user_id IS NULL').run(userId, guestId);
  return Number(info.changes || 0);
}

