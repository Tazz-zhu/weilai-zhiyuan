// 管理后台
import { api } from './api.js';
import { esc, toast, fmtDateTime, timeAgo, initPwdToggles } from './ui.js';
import { trendLine, barList } from './charts.js';

const loginBox = document.getElementById('adminLogin');
const app = document.getElementById('adminApp');

initPwdToggles();

async function init() {
  let user = null;
  try { user = await api.me(true); } catch (e) {}
  if (user && user.role === 'admin') { showApp(user); return; }
  // 未登录/非管理员 → 显示登录
  if (api.token && user) toast('当前账号无管理员权限', 'error');
  loginBox.classList.remove('hidden');
  app.classList.add('hidden');
}
init();

document.getElementById('admLoginBtn').addEventListener('click', async () => {
  const btn = document.getElementById('admLoginBtn');
  btn.disabled = true; btn.textContent = '登录中…';
  try {
    const r = await api.post('/api/auth/login', {
      username: document.getElementById('admUser').value.trim(),
      password: document.getElementById('admPass').value
    });
    api.setToken(r.token); api.setUser(r.user);
    if (r.user.role !== 'admin') { toast('该账号无管理员权限', 'error'); api.logout(); return; }
    showApp(r.user);
  } catch (e) { toast(e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = '登 录'; }
});

document.getElementById('admLogoutBtn').addEventListener('click', () => { api.logout(); location.reload(); });

function showApp(user) {
  loginBox.classList.add('hidden');
  app.classList.remove('hidden');
  document.getElementById('admWho').textContent = user.nickname + '（' + user.username + '）';
  loadView('dashboard');
}

// ---------- 视图切换 ----------
document.querySelectorAll('.admin-nav-item').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.admin-nav-item').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  loadView(b.dataset.view);
}));
const VIEW_TITLES = { dashboard: '📊 仪表盘', users: '👥 用户管理', posts: '💬 帖子管理', comments: '✉️ 评论管理', reports: '🚩 举报管理', content: '📝 内容管理' };

async function loadView(view) {
  document.getElementById('viewTitle').textContent = VIEW_TITLES[view];
  const box = document.getElementById('viewContent');
  box.innerHTML = '<div class="skeleton" style="height:300px;border-radius:16px"></div>';
  if (view === 'dashboard') await renderDashboard(box);
  else if (view === 'users') renderUsers(box);
  else if (view === 'posts') renderPosts(box);
  else if (view === 'comments') renderComments(box);
  else if (view === 'reports') renderReports(box);
  else renderContent(box);
}

// ---------- 仪表盘 ----------
async function renderDashboard(box) {
  const r = await api.get('/api/admin/stats');
  const s = r.stats;
  const cards = [
    ['👥', '用户总数', s.users], ['🆕', '今日新增', s.users_today],
    ['💬', '帖子', s.posts], ['✉️', '评论', s.comments],
    ['🧭', '测评', s.assessments], ['📖', '成长记录', s.events],
    ['⏳', '时光胶囊', s.capsules], ['📅', '签到人数', s.checkin_users],
    ['🏅', '徽章', s.badges], ['👍', '点赞', s.likes],
    ['🏛️', '圈子帖子', s.career_posts], ['🎓', '职业/专业', r.careers + ' / ' + r.majors]
  ];
  box.innerHTML = `
    <div class="grid grid-4" style="gap:14px">
      ${cards.map(([ic, label, num]) => `
        <div class="card stat-card">
          <div class="sc-ic">${ic}</div>
          <div class="sc-num">${num}</div>
          <div class="sc-label">${label}</div>
        </div>`).join('')}
    </div>
    <div class="grid grid-2 mt-16" style="gap:16px">
      <div class="card" style="padding:22px"><h3 style="font-size:15px;color:var(--deep);margin-bottom:12px">📈 近14天注册趋势</h3><div id="admUserTrend"></div></div>
      <div class="card" style="padding:22px"><h3 style="font-size:15px;color:var(--deep);margin-bottom:12px">💬 近14天发帖趋势</h3><div id="admPostTrend"></div></div>
    </div>
    <div class="card mt-16" style="padding:22px">
      <h3 style="font-size:15px;color:var(--deep);margin-bottom:12px">🧩 内容结构</h3>
      <div id="admMix"></div>
    </div>`;
  trendLine(document.getElementById('admUserTrend'), s.user_trend.map(d => ({ label: d.day.slice(5), count: d.n })), { color: '#4aa3c2', height: 150, width: 340 });
  trendLine(document.getElementById('admPostTrend'), s.post_trend.map(d => ({ label: d.day.slice(5), count: d.n })), { color: '#ff8c42', height: 150, width: 340 });
  const mix = [
    { label: '帖子', value: Math.round(s.posts / Math.max(1, s.posts + s.comments + s.assessments + s.events) * 100) },
    { label: '评论', value: Math.round(s.comments / Math.max(1, s.posts + s.comments + s.assessments + s.events) * 100) },
    { label: '测评', value: Math.round(s.assessments / Math.max(1, s.posts + s.comments + s.assessments + s.events) * 100) },
    { label: '成长记录', value: Math.round(s.events / Math.max(1, s.posts + s.comments + s.assessments + s.events) * 100) }
  ];
  barList(document.getElementById('admMix'), mix, { color: '#7c6cf0' });

  // 运营指标
  try {
    const mm = (await api.get('/api/admin/metrics')).metrics;
    const cr = (await api.get('/api/community/careers')).items;
    const f = mm.funnel;
    const funnelMax = Math.max(1, f.registered);
    const hotCircles = [...cr].sort((a, b) => b.post_count - a.post_count).slice(0, 8).filter(x => x.post_count > 0);
    const ops = document.createElement('div');
    ops.innerHTML = `
      <div class="section-head mt-32"><div><div class="section-title" style="font-size:20px">📈 运营指标</div><div class="section-sub" style="margin-bottom:0">漏斗 · 活跃 · 留存 · 热度</div></div></div>
      <div class="grid grid-3" style="gap:14px">
        <div class="card stat-card"><div class="sc-ic">☀️</div><div class="sc-num">${mm.dau}</div><div class="sc-label">今日活跃 DAU</div></div>
        <div class="card stat-card"><div class="sc-ic">📅</div><div class="sc-num">${mm.wau}</div><div class="sc-label">7日活跃 WAU</div></div>
        <div class="card stat-card"><div class="sc-ic">🌙</div><div class="sc-num">${mm.mau}</div><div class="sc-label">30日活跃 MAU</div></div>
      </div>
      <div class="grid grid-2 mt-16" style="gap:16px">
        <div class="card" style="padding:20px">
          <h3 style="font-size:15px;color:var(--deep);margin-bottom:14px">🎯 核心行为漏斗（独立用户）</h3>
          ${[
            ['注册用户', f.registered],
            ['完成测评', f.assessed],
            ['记录足迹', f.recorded],
            ['社区发帖', f.posted],
            ['参与签到', f.checked]
          ].map(([label, v]) => `
            <div class="bar-row"><span class="bar-label">${label}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${Math.round(v / funnelMax * 100)}%;background:#4aa3c2"></div></div>
              <span class="bar-val">${v}</span></div>`).join('')}
        </div>
        <div>
          <div class="card" style="padding:20px;margin-bottom:16px">
            <h3 style="font-size:15px;color:var(--deep);margin-bottom:10px">🔄 留存率（按注册后活跃）</h3>
            <div class="grid grid-3" style="gap:10px">
              <div class="text-center"><div style="font-size:26px;font-weight:900;color:var(--primary-strong)">${mm.retention.day1}%</div><div class="muted" style="font-size:12px">次日</div></div>
              <div class="text-center"><div style="font-size:26px;font-weight:900;color:var(--accent-strong)">${mm.retention.day3}%</div><div class="muted" style="font-size:12px">3日</div></div>
              <div class="text-center"><div style="font-size:26px;font-weight:900;color:var(--teal)">${mm.retention.day7}%</div><div class="muted" style="font-size:12px">7日</div></div>
            </div>
            <p class="muted mt-8" style="font-size:11.5px">样本 ${mm.retention.n} 人（注册满对应天数）</p>
          </div>
          <div class="card" style="padding:20px">
            <h3 style="font-size:15px;color:var(--deep);margin-bottom:10px">🏛️ 热门圈子 Top8</h3>
            ${hotCircles.length ? hotCircles.map((x, i) => `
              <div class="flex-between" style="padding:6px 0;border-bottom:1px dashed var(--line);font-size:13.5px">
                <span class="text-2">${i + 1}. ${esc(x.name)}</span><b style="color:var(--purple)">${x.post_count} 帖</b>
              </div>`).join('') : '<p class="muted">还没有圈子帖子</p>'}
          </div>
        </div>
      </div>`;
    box.appendChild(ops);
    // 公告发送
    const ann = document.createElement('div');
    ann.innerHTML = `
      <div class="card mt-16" style="padding:20px">
        <h3 style="font-size:15px;color:var(--deep);margin-bottom:10px">📣 发送全员公告 / 站内信</h3>
        <div class="flex" style="gap:10px;flex-wrap:wrap">
          <input class="input" id="annContent" placeholder="例如：新版本上线，职业圈子支持发图片和视频啦！" style="flex:1;min-width:240px">
          <button class="btn btn-primary" id="annSend">发送给所有用户</button>
        </div>
        <p class="muted mt-8" style="font-size:12px">发送后所有用户的通知中心会收到一条公告</p>
      </div>`;
    box.appendChild(ann);
    document.getElementById('annSend').addEventListener('click', async () => {
      const content = document.getElementById('annContent').value.trim();
      if (!content) { toast('请输入公告内容', 'error'); return; }
      const r = await api.post('/api/admin/announce', { content });
      document.getElementById('annContent').value = '';
      toast('公告已发送给 ' + r.sent + ' 位用户', 'success');
    });
  } catch (e) { /* ignore */ }
}

// ---------- 用户管理 ----------
function renderUsers(box) {
  let q = '', page = 1;
  box.innerHTML = `
    <div class="flex mb-16" style="gap:10px">
      <input class="input" id="admUserQ" placeholder="🔍 搜索用户名 / 昵称 / 城市…" style="max-width:320px">
      <button class="btn btn-deep btn-sm" id="admUserSearch">搜索</button>
      <span class="muted" id="admUserTotal"></span>
    </div>
    <div class="card" style="padding:0;overflow:auto"><table class="adm-table" id="admUserTable"></table></div>
    <div class="flex mt-16" style="gap:10px">
      <button class="btn btn-ghost btn-sm" id="admUserPrev">← 上一页</button>
      <span class="muted" id="admUserPage"></span>
      <button class="btn btn-ghost btn-sm" id="admUserNext">下一页 →</button>
    </div>`;
  const load = async () => {
    const r = await api.get('/api/admin/users?q=' + encodeURIComponent(q) + '&page=' + page + '&limit=15');
    document.getElementById('admUserTotal').textContent = '共 ' + r.total + ' 位用户';
    document.getElementById('admUserPage').textContent = '第 ' + page + ' 页';
    document.getElementById('admUserPrev').disabled = page <= 1;
    document.getElementById('admUserNext').disabled = page * 15 >= r.total;
    document.getElementById('admUserTable').innerHTML = `
      <thead><tr><th>ID</th><th>用户</th><th>角色</th><th>状态</th><th>帖子</th><th>记录</th><th>测评</th><th>注册时间</th><th>最近活跃</th><th>操作</th></tr></thead>
      <tbody>
        ${r.items.map(u => `
          <tr>
            <td>${u.id}</td>
            <td><b>${esc(u.nickname)}</b><div class="muted" style="font-size:11px">@${esc(u.username)} · ${esc(u.city || '—')}</div></td>
            <td>${u.role === 'admin' ? '<span class="pill" style="background:var(--purple-soft);color:#5b4bd8">管理员</span>' : '<span class="pill" style="background:var(--bg);color:var(--text-2)">用户</span>'}</td>
            <td>${u.disabled ? '<span class="pill" style="background:var(--rose-soft);color:#cf4266">已禁用</span>' : '<span class="pill" style="background:var(--teal-soft);color:#1e8f72">正常</span>'}</td>
            <td>${u.post_count}</td><td>${u.event_count}</td><td>${u.assessment_count}</td>
            <td>${fmtDateTime(u.created_at).slice(0, 10)}</td>
            <td>${u.last_active ? timeAgo(u.last_active) : '—'}</td>
            <td style="white-space:nowrap">
              ${u.role !== 'admin' ? `
                <button class="btn btn-ghost btn-sm" data-act="detail" data-id="${u.id}">详情</button>
              <button class="btn btn-ghost btn-sm" data-act="${u.disabled ? 'enable' : 'disable'}" data-id="${u.id}" data-name="${esc(u.nickname)}">${u.disabled ? '启用' : '禁用'}</button>
                <button class="btn btn-sm" style="background:var(--rose-soft);color:#cf4266" data-act="del" data-id="${u.id}" data-name="${esc(u.nickname)}">删除</button>` : '<span class="muted">—</span>'}
            </td>
          </tr>`).join('')}
      </tbody>`;
    document.querySelectorAll('#admUserTable [data-act]').forEach(b => b.addEventListener('click', async () => {
      const act = b.dataset.act; const id = b.dataset.id; const name = b.dataset.name;
      if (act === 'detail') { openUserDetail(id); return; }
      if (act === 'del') {
        if (!confirm('确定删除用户「' + name + '」？其帖子、评论、记录、胶囊等数据将一并删除。')) return;
        await api.del('/api/admin/users/' + id);
        toast('已删除用户 ' + name, 'success');
      } else {
        await fetch('/api/admin/users/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + api.token }, body: JSON.stringify({ disabled: act === 'disable' }) });
        toast(act === 'disable' ? '已禁用 ' + name : '已启用 ' + name, 'success');
      }
      load();
    }));
  };
  document.getElementById('admUserSearch').addEventListener('click', () => { q = document.getElementById('admUserQ').value.trim(); page = 1; load(); });
  document.getElementById('admUserPrev').addEventListener('click', () => { if (page > 1) { page--; load(); } });
  document.getElementById('admUserNext').addEventListener('click', () => { page++; load(); });
  load();
}

// ---------- 帖子管理 ----------
function renderPosts(box) {
  let q = '', page = 1;
  box.innerHTML = `
    <div class="flex mb-16" style="gap:10px">
      <input class="input" id="admPostQ" placeholder="🔍 搜索标题 / 内容 / 作者…" style="max-width:320px">
      <button class="btn btn-deep btn-sm" id="admPostSearch">搜索</button>
      <span class="muted" id="admPostTotal"></span>
    </div>
    <div class="card" style="padding:0;overflow:auto"><table class="adm-table" id="admPostTable"></table></div>
    <div class="flex mt-16" style="gap:10px">
      <button class="btn btn-ghost btn-sm" id="admPostPrev">← 上一页</button>
      <span class="muted" id="admPostPage"></span>
      <button class="btn btn-ghost btn-sm" id="admPostNext">下一页 →</button>
    </div>`;
  const load = async () => {
    const r = await api.get('/api/admin/posts?q=' + encodeURIComponent(q) + '&page=' + page + '&limit=15');
    document.getElementById('admPostTotal').textContent = '共 ' + r.total + ' 帖';
    document.getElementById('admPostPage').textContent = '第 ' + page + ' 页';
    document.getElementById('admPostPrev').disabled = page <= 1;
    document.getElementById('admPostNext').disabled = page * 15 >= r.total;
    document.getElementById('admPostTable').innerHTML = `
      <thead><tr><th>ID</th><th>标题</th><th>作者</th><th>所属</th><th>👍</th><th>💬</th><th>时间</th><th>操作</th></tr></thead>
      <tbody>
        ${r.items.map(p => `
          <tr>
            <td>${p.id}</td>
            <td style="max-width:280px"><b>${esc(p.title)}</b><div class="muted" style="font-size:11px">${esc(p.content.slice(0, 40))}…</div></td>
            <td>${esc(p.nickname || '已注销')}<div class="muted" style="font-size:11px">@${esc(p.username || '—')}</div></td>
            <td>${p.career_id ? '<span class="pill" style="background:var(--purple-soft);color:#5b4bd8">圈子</span>' : '<span class="pill" style="background:var(--bg);color:var(--text-2)">' + esc(p.group_type) + '</span>'}</td>
            <td>${p.like_count}</td><td>${p.comment_count}</td>
            <td>${fmtDateTime(p.created_at).slice(0, 10)}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm" style="background:${p.essence ? 'var(--gold-soft)' : 'var(--bg)'};color:${p.essence ? '#b97a1f' : '#667085'}" data-id="${p.id}" data-e="${p.essence ? 0 : 1}">${p.essence ? '⭐ 取消精华' : '⭐ 设精华'}</button>
              <button class="btn btn-sm" style="background:var(--rose-soft);color:#cf4266" data-id="${p.id}" data-t="${esc(p.title)}" data-del="1">删除</button>
            </td>
          </tr>`).join('')}
      </tbody>`;
    document.querySelectorAll('#admPostTable [data-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('确定删除帖子「' + b.dataset.t + '」？其评论与点赞将一并删除。')) return;
      await api.del('/api/admin/posts/' + b.dataset.id);
      toast('帖子已删除', 'success');
      load();
    }));
    document.querySelectorAll('#admPostTable [data-e]').forEach(b => b.addEventListener('click', async () => {
      await api.post('/api/admin/posts/' + b.dataset.id + '/essence', { essence: b.dataset.e === '1' });
      toast(b.dataset.e === '1' ? '已设为精华' : '已取消精华', 'success');
      load();
    }));
  };
  document.getElementById('admPostSearch').addEventListener('click', () => { q = document.getElementById('admPostQ').value.trim(); page = 1; load(); });
  document.getElementById('admPostPrev').addEventListener('click', () => { if (page > 1) { page--; load(); } });
  document.getElementById('admPostNext').addEventListener('click', () => { page++; load(); });
  load();
}

// ---------- 评论管理 ----------
function renderComments(box) {
  let q = '', page = 1;
  box.innerHTML = `
    <div class="flex mb-16" style="gap:10px">
      <input class="input" id="admCommentQ" placeholder="🔍 搜索评论内容 / 作者…" style="max-width:320px">
      <button class="btn btn-deep btn-sm" id="admCommentSearch">搜索</button>
      <span class="muted" id="admCommentTotal"></span>
    </div>
    <div class="card" style="padding:0;overflow:auto"><table class="adm-table" id="admCommentTable"></table></div>
    <div class="flex mt-16" style="gap:10px">
      <button class="btn btn-ghost btn-sm" id="admCommentPrev">← 上一页</button>
      <span class="muted" id="admCommentPage"></span>
      <button class="btn btn-ghost btn-sm" id="admCommentNext">下一页 →</button>
    </div>`;
  const load = async () => {
    const r = await api.get('/api/admin/comments?q=' + encodeURIComponent(q) + '&page=' + page + '&limit=15');
    document.getElementById('admCommentTotal').textContent = '共 ' + r.total + ' 条';
    document.getElementById('admCommentPage').textContent = '第 ' + page + ' 页';
    document.getElementById('admCommentPrev').disabled = page <= 1;
    document.getElementById('admCommentNext').disabled = page * 15 >= r.total;
    document.getElementById('admCommentTable').innerHTML = `
      <thead><tr><th>ID</th><th>评论内容</th><th>作者</th><th>所属帖子</th><th>时间</th><th>操作</th></tr></thead>
      <tbody>
        ${r.items.map(c => `
          <tr>
            <td>${c.id}</td>
            <td style="max-width:300px">${esc(c.content)}</td>
            <td>${esc(c.nickname || '已注销')}<div class="muted" style="font-size:11px">@${esc(c.username || '—')}</div></td>
            <td style="max-width:220px" class="muted">${esc((c.post_title || '').slice(0, 30))}</td>
            <td>${fmtDateTime(c.created_at).slice(0, 10)}</td>
            <td><button class="btn btn-sm" style="background:var(--rose-soft);color:#cf4266" data-id="${c.id}">删除</button></td>
          </tr>`).join('')}
      </tbody>`;
    document.querySelectorAll('#admCommentTable [data-id]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('确定删除这条评论？')) return;
      await api.del('/api/admin/comments/' + b.dataset.id);
      toast('评论已删除', 'success');
      load();
    }));
  };
  document.getElementById('admCommentSearch').addEventListener('click', () => { q = document.getElementById('admCommentQ').value.trim(); page = 1; load(); });
  document.getElementById('admCommentPrev').addEventListener('click', () => { if (page > 1) { page--; load(); } });
  document.getElementById('admCommentNext').addEventListener('click', () => { page++; load(); });
  load();
}

// ---------- 举报管理 ----------
function renderReports(box) {
  let status = 'all';
  box.innerHTML = `
    <div class="flex mb-16" style="gap:8px;flex-wrap:wrap">
      <button class="tab-btn ${status === 'all' ? 'active' : ''}" data-s="all">全部</button>
      <button class="tab-btn" data-s="pending">待处理</button>
      <button class="tab-btn" data-s="resolved">已处理</button>
      <span class="muted" id="admReportTotal"></span>
    </div>
    <div class="card" style="padding:0;overflow:auto"><table class="adm-table" id="admReportTable"></table></div>`;
  const load = async () => {
    const r = await api.get('/api/admin/reports?status=' + status);
    document.getElementById('admReportTotal').textContent = '共 ' + r.total + ' 条';
    document.getElementById('admReportTable').innerHTML = `
      <thead><tr><th>ID</th><th>被举报内容</th><th>类型</th><th>举报人</th><th>原因</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
      <tbody>
        ${r.items.map(x => `
          <tr>
            <td>${x.id}</td>
            <td style="max-width:280px">${esc(x.post_title ? '帖子：' + x.post_title : '评论：' + (x.comment_content || '').slice(0, 30))}</td>
            <td>${x.post_id ? '<span class="pill" style="background:var(--purple-soft);color:#5b4bd8">帖子</span>' : '<span class="pill" style="background:var(--bg);color:var(--text-2)">评论</span>'}</td>
            <td>${esc(x.nickname || '已注销')}</td>
            <td class="muted">${esc(x.reason)}</td>
            <td>${x.status === 'pending' ? '<span class="pill" style="background:var(--gold-soft);color:#b97a1f">待处理</span>' : '<span class="pill" style="background:var(--teal-soft);color:#1e8f72">已处理</span>'}</td>
            <td>${fmtDateTime(x.created_at).slice(0, 10)}</td>
            <td style="white-space:nowrap">
              ${x.status === 'pending' ? `
                <button class="btn btn-ghost btn-sm" data-id="${x.id}" data-act="resolved">标记已处理</button>
                ${x.post_id ? '<button class="btn btn-sm" style="background:var(--rose-soft);color:#cf4266" data-id="' + x.post_id + '" data-act="delpost">删除原帖</button>' : ''}` : '<span class="muted">—</span>'}
            </td>
          </tr>`).join('')}
      </tbody>`;
    document.querySelectorAll('#admReportTable [data-act]').forEach(b => b.addEventListener('click', async () => {
      if (b.dataset.act === 'resolved') {
        await fetch('/api/admin/reports/' + b.dataset.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + api.token }, body: JSON.stringify({ status: 'resolved' }) });
        toast('已标记处理', 'success');
      } else if (b.dataset.act === 'delpost') {
        if (!confirm('确定删除该帖子？')) return;
        await api.del('/api/admin/posts/' + b.dataset.id);
        toast('帖子已删除', 'success');
      }
      load();
    }));
  };
  box.querySelectorAll('[data-s]').forEach(btn => btn.addEventListener('click', () => {
    box.querySelectorAll('[data-s]').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    status = btn.dataset.s;
    load();
  }));
  load();
}

// ---------- 内容管理 ----------
const CONTENT_TYPES = {
  career: { label: '👀 职业', cols: ['name', 'category'], fields: ['name', 'summary', 'salary', 'demand', 'aiRisk', 'radarIncome'] },
  major: { label: '🎓 专业', cols: ['name', 'category'], fields: ['name', 'truth', 'recommend'] },
  script: { label: '🎬 剧本', cols: ['title'], fields: ['title', 'subtitle'] },
  mentor: { label: '🧑‍🏫 导师', cols: ['name', 'field'], fields: ['name', 'intro', 'price', 'available'] }
};
function renderContent(box) {
  let type = 'career';
  box.innerHTML = `
    <div class="tab-bar" id="contentTypeBar">
      ${Object.entries(CONTENT_TYPES).map(([k, v]) => `<button class="tab-btn ${k === type ? 'active' : ''}" data-t="${k}">${v.label}</button>`).join('')}
    </div>
    <div class="flex mb-16" style="gap:10px">
      <input class="input" id="contentQ" placeholder="🔍 搜索内容…" style="max-width:300px">
      <button class="btn btn-deep btn-sm" id="contentSearch">搜索</button>
      <span class="muted" id="contentTotal"></span>
    </div>
    <div class="card" style="padding:0;overflow:auto"><table class="adm-table" id="contentTable"></table></div>
    <div id="contentEditor" class="hidden" style="margin-top:16px"></div>`;
  box.querySelectorAll('#contentTypeBar .tab-btn').forEach(b => b.addEventListener('click', () => {
    box.querySelectorAll('#contentTypeBar .tab-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    type = b.dataset.t;
    loadList('');
  }));
  document.getElementById('contentSearch').addEventListener('click', () => loadList(document.getElementById('contentQ').value.trim()));
  const loadList = async (q) => {
    const r = await api.get('/api/admin/content?type=' + type + '&q=' + encodeURIComponent(q));
    document.getElementById('contentTotal').textContent = '共 ' + r.total + ' 条';
    document.getElementById('contentTable').innerHTML = `
      <thead><tr><th>ID</th>${CONTENT_TYPES[type].cols.map(c => '<th>' + c + '</th>').join('')}<th>状态</th><th>操作</th></tr></thead>
      <tbody>
        ${r.items.map(x => `
          <tr>
            <td>${x.id}</td>
            ${CONTENT_TYPES[type].cols.map(col => `<td>${esc(String(x[col] || '').slice(0, 30))}</td>`).join('')}
            <td>${x.status === 'off' ? '<span class="pill" style="background:var(--rose-soft);color:#cf4266">已下架</span>' : '<span class="pill" style="background:var(--teal-soft);color:#1e8f72">展示中</span>'}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-ghost btn-sm" data-id="${x.id}" data-act="edit">编辑</button>
              <button class="btn btn-sm" style="background:${x.status === 'off' ? 'var(--teal-soft)' : 'var(--bg)'};color:${x.status === 'off' ? '#1e8f72' : '#667085'}" data-id="${x.id}" data-act="toggle">${x.status === 'off' ? '上架' : '下架'}</button>
            </td>
          </tr>`).join('')}
      </tbody>`;
    document.querySelectorAll('#contentTable [data-act]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.act === 'edit') openEditor(type, b.dataset.id, r.items.find(x => x.id === b.dataset.id));
      else toggleStatus(type, b.dataset.id, b.textContent.includes('下架') ? 'off' : 'on', loadList);
    }));
  };
  loadList('');
}
function openEditor(type, id, item) {
  const ed = document.getElementById('contentEditor');
  const fields = CONTENT_TYPES[type].fields;
  ed.classList.remove('hidden');
  ed.innerHTML = `
    <div class="card" style="padding:22px">
      <div class="flex-between mb-16"><h3 style="font-size:16px;color:var(--deep)">✏️ 编辑 ${CONTENT_TYPES[type].label} · ${esc(item.name || item.title)}</h3><button class="btn btn-ghost btn-sm" id="editorClose">关闭</button></div>
      <div class="grid grid-2" style="gap:14px">
        ${fields.map(f => `<div class="field"><label>${f}</label><input class="input" id="f_${f}" value="${esc(item[f] !== undefined ? item[f] : '')}"></div>`).join('')}
      </div>
      <button class="btn btn-primary" id="editorSave">保存修改</button>
    </div>`;
  ed.querySelector('#editorClose').addEventListener('click', () => { ed.classList.add('hidden'); ed.innerHTML = ''; });
  ed.querySelector('#editorSave').addEventListener('click', async () => {
    const data = {};
    fields.forEach(f => {
      const el = document.getElementById('f_' + f);
      if (!el) return;
      const v = el.value.trim();
      if (f === 'demand' || f === 'aiRisk' || f === 'recommend' || f === 'price' || f === 'radarIncome') data[f] = parseFloat(v) || 0;
      else if (f === 'available') data[f] = v === 'true' || v === '1';
      else data[f] = v;
    });
    await api.put('/api/admin/content/' + type + '/' + id, { data, status: 'on' });
    toast('已保存并展示', 'success');
    ed.classList.add('hidden'); ed.innerHTML = '';
    document.getElementById('contentSearch').click();
  });
}
async function toggleStatus(type, id, status, reload) {
  await api.put('/api/admin/content/' + type + '/' + id, { data: {}, status });
  toast(status === 'off' ? '已下架' : '已上架', 'success');
  reload('');
}

// ---------- 用户详情 ----------
async function openUserDetail(id) {
  const r = await api.get('/api/admin/users/' + id);
  const u = r.user;
  const mask = document.createElement('div');
  mask.className = 'modal-mask show';
  mask.innerHTML = `
    <div class="modal wide" style="max-height:86vh;overflow:auto">
      <div class="modal-head"><h3>👤 用户详情 · ${esc(u.nickname)}</h3><button class="modal-close">✕</button></div>
      <div class="modal-body">
        <div class="grid grid-3" style="gap:10px;margin-bottom:14px">
          <div class="card stat-card"><div class="sc-ic">📝</div><div class="sc-num">${u.posts.length}</div><div class="sc-label">帖子</div></div>
          <div class="card stat-card"><div class="sc-ic">✉️</div><div class="sc-num">${u.comments.length}</div><div class="sc-label">评论</div></div>
          <div class="card stat-card"><div class="sc-ic">📖</div><div class="sc-num">${u.events.length}</div><div class="sc-label">足迹</div></div>
          <div class="card stat-card"><div class="sc-ic">🧭</div><div class="sc-num">${u.assessments_n}</div><div class="sc-label">测评</div></div>
          <div class="card stat-card"><div class="sc-ic">📅</div><div class="sc-num">${u.checkins_n}</div><div class="sc-label">签到</div></div>
          <div class="card stat-card"><div class="sc-ic">⏳</div><div class="sc-num">${u.capsules_n}</div><div class="sc-label">胶囊</div></div>
          <div class="card stat-card"><div class="sc-ic">💬</div><div class="sc-num">${u.messages_n}</div><div class="sc-label">私信</div></div>
          <div class="card stat-card"><div class="sc-ic">🤝</div><div class="sc-num">${u.invites_n}</div><div class="sc-label">邀请</div></div>
          <div class="card stat-card"><div class="sc-ic">🏅</div><div class="sc-num">${u.badges.length}</div><div class="sc-label">徽章</div></div>
        </div>
        <p class="muted mb-16" style="font-size:12.5px">@${esc(u.username)} · ${esc(u.city || '未填城市')} · ${esc(u.education || '未填身份')} · 注册于 ${fmtDateTime(u.created_at).slice(0, 10)}</p>
        ${u.posts.length ? '<b style="color:var(--deep)">最近帖子</b>' + u.posts.map(p => '<div class="muted" style="font-size:12.5px;padding:4px 0;border-bottom:1px dashed var(--line)">' + esc(p.title) + ' <span style="color:var(--text-3)">' + fmtDateTime(p.created_at).slice(0, 10) + '</span></div>').join('') : ''}
        ${u.events.length ? '<b style="color:var(--deep);margin-top:10px;display:block">最近足迹</b>' + u.events.map(ev => '<div class="muted" style="font-size:12.5px;padding:4px 0;border-bottom:1px dashed var(--line)">[' + esc(ev.type) + '] ' + esc(ev.title) + ' <span style="color:var(--text-3)">' + esc(ev.date) + '</span></div>').join('') : ''}
      </div>
    </div>`;
  document.body.appendChild(mask);
  mask.addEventListener('click', e => { if (e.target === mask || e.target.classList.contains('modal-close')) mask.remove(); });
}
