// 未来致远 · UI 公共组件：布局、弹窗、Toast、会员门控、登录注册
import { api } from './api.js';
import { avatarHtml } from './charts.js';
import { icon } from './icons.js';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function fmtDate(str) {
  if (!str) return '';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
export function fmtDateTime(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return m + '分钟前';
  const h = Math.floor(m / 60);
  if (h < 24) return h + '小时前';
  const d = Math.floor(h / 24);
  if (d < 30) return d + '天前';
  return fmtDateTime(ts).slice(0, 10);
}

// ---------- Toast ----------
export function toast(msg, type = 'info', ms = 3200) {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  const icons = { success: '✅', error: '⚠️', badge: '🏅', info: '💡' };
  t.innerHTML = `<span>${icons[type] || '💡'}</span><div>${esc(msg)}</div>`;
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, ms);
}
export function badgeToast(badges) {
  if (!badges || !badges.length) return;
  const names = badges.map(b => b.name).join('、');
  toast('恭喜解锁徽章：' + names, 'badge', 4500);
}

// ---------- Modal ----------
export function openModal(id) { const m = document.getElementById(id); if (m) m.classList.add('show'); }
export function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('show'); }

// ---------- 会员门控 ----------
// 商业化暂缓：门控直接放行，保留签名便于未来恢复
export function memberGate({ title = '', desc = '', cb, user } = {}) {
  if (cb) cb();
}

// ---------- 按钮 Loading ----------
export function setBtnLoading(btn, loading, idleText) {
  if (!btn) return;
  if (loading) {
    if (!btn.dataset.idle) btn.dataset.idle = btn.textContent;
    btn.dataset.loading = '1';
    btn.innerHTML = '<span class="spinner"></span> ' + (idleText || btn.dataset.idle || '处理中');
    btn.disabled = true;
  } else {
    btn.dataset.loading = '0';
    btn.innerHTML = btn.dataset.idle || '确定';
    btn.disabled = false;
  }
}

export function initPwdToggles() {
  document.querySelectorAll('.pwd-toggle').forEach(btn => btn.addEventListener('click', () => {
    const inp = document.getElementById(btn.dataset.pwd);
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    btn.textContent = show ? '🙈' : '👁️';
  }));
}

// ---------- 登录/注册 ----------
export function openLogin() {
  const m = document.getElementById('loginModal');
  if (!m) return;
  switchTab('login');
  openModal('loginModal');
}
function switchTab(tab) {
  const loginPane = document.getElementById('loginPane');
  const regPane = document.getElementById('regPane');
  const lt = document.getElementById('loginTab');
  const rt = document.getElementById('regTab');
  if (!loginPane) return;
  loginPane.classList.toggle('hidden', tab !== 'login');
  regPane.classList.toggle('hidden', tab !== 'reg');
  lt.classList.toggle('active', tab === 'login');
  rt.classList.toggle('active', tab === 'reg');
}
async function submitLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn'); btn.disabled = true; btn.textContent = '登录中…';
  try {
    const r = await api.post('/api/auth/login', { username: document.getElementById('loginUser').value, password: document.getElementById('loginPass').value });
    api.setToken(r.token); api.setUser(r.user);
    try { await api.post('/api/sim/claim', { guest_id: localStorage.getItem('msrl_guest') || '' }); } catch (e) {}
    closeModal('loginModal');
    toast('欢迎回来，' + r.user.nickname + '！', 'success');
    if (r.badges && r.badges.length) badgeToast(r.badges);
    setTimeout(() => { history.replaceState(null, '', location.pathname); location.reload(); }, 600);
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false; btn.textContent = '登 录';
  }
}
async function submitReg(e) {
  e.preventDefault();
  const btn = document.getElementById('regBtn'); btn.disabled = true; btn.textContent = '注册中…';
  try {
    const r = await api.post('/api/auth/register', {
      username: document.getElementById('regUser').value,
      password: document.getElementById('regPass').value,
      nickname: document.getElementById('regNick').value
    });
    api.setToken(r.token); api.setUser(r.user);
    try { await api.post('/api/sim/claim', { guest_id: localStorage.getItem('msrl_guest') || '' }); } catch (e) {}
    closeModal('loginModal');
    toast('欢迎加入未来致远，' + r.user.nickname + '！', 'success');
    if (r.badges && r.badges.length) badgeToast(r.badges);
    setTimeout(() => { history.replaceState(null, '', location.pathname); location.reload(); }, 600);
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false; btn.textContent = '注 册';
  }
}

// ---------- 布局注入 ----------
const NAV = [
  { href: 'index.html', label: '首页', icon: 'home', match: ['index'] },
  { href: 'explore.html', label: '探索', icon: 'compass', match: ['explore', 'careers', 'career', 'majors', 'scripts', 'assessment', 'planner', 'profile'] },
  { href: 'sim.html', label: '模拟舱', icon: 'gamepad', match: ['sim'] },
  { href: 'memoir.html', label: '回忆录', icon: 'book', match: ['memoir', 'timeline', 'capsules', 'dashboard', 'report'] },
  { href: 'community.html', label: '社区', icon: 'chat', match: ['community', 'mentors'] },
  { href: 'my.html', label: '我的', icon: 'user', match: ['my'] }
];
// 当前页面对应的导航高亮
const pageKey = (location.pathname.split('/').pop() || 'index').split('.')[0];
const activeNav = NAV.find(n => (n.match || []).includes(pageKey)) || NAV[0];
const activeKey = activeNav.href.split('.')[0];

export function injectLayout(active = '') {
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <div class="container nav">
      <a class="brand" href="index.html">
        <span class="brand-logo">🌅</span>
        <span class="brand-name">未来致远<small>你的人生，自己导航</small></span>
      </a>
      <nav class="nav-links">
        ${NAV.map(n => `<a href="${n.href}" class="${n.href.split('.')[0] === activeKey ? 'active' : ''}" style="display:inline-flex;align-items:center;gap:7px">${icon(n.icon, 17, 2)}<span>${n.label}</span></a>`).join('')}
      </nav>
      <div class="nav-right" id="navRight"></div>
    </div>`;
  document.body.prepend(header);

  // 移动端底部 Tab
  const mobTab = document.createElement('nav');
  mobTab.className = 'mob-tabbar';
  mobTab.innerHTML = NAV.map(n => `<a href="${n.href}" class="${n.href.split('.')[0] === activeKey ? 'on' : ''}">${icon(n.icon, 20, 1.9)}<span>${n.label}</span></a>`).join('');
  document.body.appendChild(mobTab);

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="container">
      <div class="f-grid">
        <div>
          <div class="f-brand"><span class="brand-logo">🌅</span>未来致远</div>
          <p style="font-size:13.5px;color:rgba(255,255,255,.6);max-width:280px">职业认知启蒙 · 长期生涯规划陪伴 · 人生努力记录与回忆，三位一体的成长基础设施。</p>
        </div>
        <div>
          <h4>${icon('eye', 15)} 产品</h4>
          <a href="careers.html">职业认知馆</a>
          <a href="sim.html">人生模拟舱</a>
          <a href="planner.html">AI生涯规划师</a>
          <a href="memoir.html">人生回忆录</a>
          <a href="timeline.html">成长时光轴</a>
          <a href="capsules.html">时光胶囊</a>
        </div>
        <div>
          <h4>${icon('rocket', 15)} 成长</h4>
          <a href="assessment.html">四维深度测评</a>
          <a href="sim.html">平行人生模拟</a>
          <a href="memoir.html">人生回忆录</a>
          <a href="timeline.html">成长时光轴</a>
          <a href="report.html">年度报告</a>
        </div>
        <div>
          <h4>${icon('spark', 15)} 关于</h4>
          <a href="scripts.html">人生剧本库</a>
          <a href="majors.html">专业真相馆</a>
          <a href="report.html">年度人生报告</a>
          <a href="dashboard.html">数据看板</a>
          <a href="mentors.html">导师咨询</a>
          <a href="policy.html">隐私政策</a>
        </div>
      </div>
      <div class="f-copy">未来致远 · 分数决定起点，你决定终点 —— 陪你把每一份努力都变成最珍贵的回忆</div>
    </div>`;
  document.body.appendChild(footer);

  // 通用弹窗与容器
  const shell = document.createElement('div');
  shell.innerHTML = `
    <div class="toast-wrap"></div>
    <div class="modal-mask" id="loginModal">
      <div class="modal">
        <div class="modal-head">
          <h3>🌅 未来致远</h3>
          <button class="modal-close" data-close="loginModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="row" style="gap:8px;margin-bottom:18px">
            <button class="tab-btn orange active" id="loginTab">登录</button>
            <button class="tab-btn" id="regTab">注册</button>
          </div>
          <form id="loginPane">
            <div class="field"><label>用户名</label><input class="input" id="loginUser" placeholder="demo" autocomplete="username"></div>
            <div class="field"><label>密码</label><div class="pwd-wrap"><input class="input" id="loginPass" type="password" placeholder="••••••••" autocomplete="current-password"><button type="button" class="pwd-toggle" data-pwd="loginPass" aria-label="显示/隐藏密码">👁️</button></div></div>
            <button class="btn btn-primary btn-block btn-lg" id="loginBtn">登 录</button>
            <p class="form-hint text-center" style="margin-top:12px">演示账号：demo / demo123 · xinqing / xinqing123</p>
          </form>
          <form id="regPane" class="hidden">
            <div class="field"><label>昵称</label><input class="input" id="regNick" placeholder="怎么称呼你？"></div>
            <div class="field"><label>用户名（3-20位字母/数字/下划线）</label><input class="input" id="regUser" placeholder="如 xiaoyuan" autocomplete="username"></div>
            <div class="field"><label>密码（至少6位）</label><div class="pwd-wrap"><input class="input" id="regPass" type="password" placeholder="••••••••" autocomplete="new-password"><button type="button" class="pwd-toggle" data-pwd="regPass" aria-label="显示/隐藏密码">👁️</button></div></div>
            <button class="btn btn-deep btn-block btn-lg" id="regBtn">注 册</button>
          </form>
        </div>
      </div>
    </div>
    <div class="modal-mask" id="gateModal">
      <div class="modal">
        <div class="modal-head">
          <h3>👑 会员专属</h3>
          <button class="modal-close" data-close="gateModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="gate">
            <div class="gt-ic">🔒</div>
            <h4 id="gateTitle">会员专属内容</h4>
            <p id="gateDesc">升级会员，解锁全部能力。</p>
            <button class="btn btn-primary btn-lg" id="gateGoBtn">开通会员 · 29元/月起</button>
            <div id="gateAfter"></div>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(shell);

  // 回到顶部 + 阅读进度条
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.innerHTML = '<i></i>';
  document.body.appendChild(progress);
  const progressBar = progress.querySelector('i');
  const topBtn = document.createElement('button');
  topBtn.id = 'backTop';
  topBtn.className = 'back-top';
  topBtn.innerHTML = '↑';
  topBtn.setAttribute('aria-label', '回到顶部');
  document.body.appendChild(topBtn);
  window.addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
    if (progressBar) progressBar.style.width = p + '%';
    topBtn.classList.toggle('show', window.scrollY > 480);
  }, { passive: true });
  topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // 密码可见切换
  initPwdToggles();

  // 绑定事件
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.close)));
  document.querySelectorAll('.modal-mask').forEach(mask => mask.addEventListener('click', e => { if (e.target === mask) mask.classList.remove('show'); }));
  document.getElementById('loginTab').addEventListener('click', () => switchTab('login'));
  document.getElementById('regTab').addEventListener('click', () => switchTab('reg'));
  document.getElementById('loginPane').addEventListener('submit', submitLogin);
  document.getElementById('regPane').addEventListener('submit', submitReg);
  document.getElementById('gateGoBtn').addEventListener('click', () => closeModal('gateModal'));

  renderNavUser();
}

function renderNavUser() {
  const box = document.getElementById('navRight');
  const user = api.cachedUserFromStorage();
  const navExtras = `
    <div class="nav-search" style="position:relative">
      <input id="navSearchInput" placeholder="🔍 搜索职业 / 圈子 / 帖子…" aria-label="搜索" autocomplete="off">
      <div class="suggest-box hidden" id="suggestBox"></div>
    </div>
    <div class="bell-wrap">
      <button class="bell" id="themeBtn" title="切换深色/浅色模式">🌙</button>
    </div>
    <div class="bell-wrap">
      <a class="bell" href="messages.html" aria-label="私信" title="私信" style="text-decoration:none">💬<span class="bell-badge hidden" id="msgBadge">0</span></a>
    </div>
    <div class="bell-wrap">
      <button class="bell" id="bellBtn" aria-label="通知">🔔<span class="bell-badge hidden" id="bellBadge">0</span></button>
      <div class="notif-panel hidden" id="notifPanel"></div>
    </div>`;
  if (user) {
    box.innerHTML = navExtras + `
      <div class="user-chip" id="userChip" style="cursor:pointer">
        ${avatarHtml(user.nickname)}
        <span class="uname">${esc(user.nickname)}</span>
        <span style="font-size:11px;color:#9ca3af">▾</span>
      </div>`;
    const chip = document.getElementById('userChip');
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = document.createElement('div');
      menu.className = 'user-menu';
      menu.innerHTML = `
        <a href="messages.html">💬 我的私信</a>
        <a href="dashboard.html">📊 人生数据看板</a>
        <a href="assessment.html">🧭 四维测评</a>
        <a href="my.html">🙋 个人中心</a>
        <div class="um-sep"></div>
        <button id="logoutBtn" class="um-danger">🚪 退出登录</button>`;
      document.body.appendChild(menu);
      setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }));
      document.getElementById('logoutBtn').addEventListener('click', () => { api.logout(); location.href = 'index.html'; });
    });
  } else {
    box.innerHTML = navExtras + `
      <button class="btn btn-ghost btn-sm" id="navLoginBtn">登录</button>
      <button class="btn btn-primary btn-sm" id="navRegBtn">免费注册</button>`;
    document.getElementById('navLoginBtn').addEventListener('click', () => { switchTab('login'); openModal('loginModal'); });
    document.getElementById('navRegBtn').addEventListener('click', () => { switchTab('reg'); openModal('loginModal'); });
  }

  // 导航滚动状态
  const siteHeader = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (siteHeader) siteHeader.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
  if (siteHeader) siteHeader.classList.toggle('scrolled', window.scrollY > 10);

  // 搜索清除按钮
  const searchWrap = document.querySelector('.nav-search');
  if (searchWrap) {
    const clearBtn = document.createElement('button');
    clearBtn.textContent = '✕';
    clearBtn.setAttribute('aria-label', '清除搜索');
    clearBtn.style.cssText = 'position:absolute;right:12px;top:50%;transform:translateY(-50%);border:0;background:none;color:var(--text-3);font-size:12px;cursor:pointer;display:none';
    searchWrap.appendChild(clearBtn);
    const si = document.getElementById('navSearchInput');
    const updateClear = () => { clearBtn.style.display = si && si.value ? 'block' : 'none'; };
    if (si) { si.addEventListener('input', updateClear); }
    clearBtn.addEventListener('click', () => { if (si) { si.value = ''; si.focus(); } updateClear(); });
  }

  // 全局搜索
  const searchInput = document.getElementById('navSearchInput');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) location.href = 'search.html?q=' + encodeURIComponent(q);
      }
    });
  }

  // 深色模式
  (function theme() {
    const saved = localStorage.getItem('zy_theme') || 'light';
    document.documentElement.dataset.theme = saved;
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = saved === 'dark' ? '☀️' : '🌙';
    btn && btn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('zy_theme', next);
      btn.textContent = next === 'dark' ? '☀️' : '🌙';
    });
  })();

  // 搜索建议
  const suggestBox = document.getElementById('suggestBox');
  let sugTimer = null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(sugTimer);
      const q = searchInput.value.trim();
      if (!q) { suggestBox.classList.add('hidden'); return; }
      sugTimer = setTimeout(async () => {
        try {
          const r = await api.get('/api/search/suggest?q=' + encodeURIComponent(q));
          const items = [];
          r.careers.slice(0, 4).forEach(c2 => items.push({ label: '👀 ' + c2.name + '（' + c2.category + '）', href: 'career.html?id=' + c2.id }));
          r.tags.forEach(t => items.push({ label: '#️⃣ ' + t, href: 'community.html?tag=' + encodeURIComponent(t) }));
          suggestBox.innerHTML = items.length
            ? items.map(it => '<a class="suggest-item" href="' + it.href + '">' + it.label + '</a>').join('')
            : '<div class="suggest-item muted">按回车全站搜索</div>';
          suggestBox.classList.remove('hidden');
        } catch (e) { /* ignore */ }
      }, 250);
    });
    searchInput.addEventListener('focus', () => { if (suggestBox.innerHTML && suggestBox.innerHTML.trim()) suggestBox.classList.remove('hidden'); });
    searchInput.addEventListener('blur', () => setTimeout(() => suggestBox.classList.add('hidden'), 200));
  }

  // 通知中心
  const bellBtn = document.getElementById('bellBtn');
  const panel = document.getElementById('notifPanel');
  const badge = document.getElementById('bellBadge');
  const curUser = api.cachedUserFromStorage();
  let lastNotifCount = 0;
  async function refreshUnread() {
    if (!api.token) { if (badge) badge.classList.add('hidden'); const mb = document.getElementById('msgBadge'); if (mb) mb.classList.add('hidden'); return; }
    try {
      const r = await api.get('/api/notifications/unread');
      if (badge) { badge.textContent = r.unread; badge.classList.toggle('hidden', !r.unread); }
      if (r.unread > lastNotifCount && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        try { new Notification('未来致远', { body: '你有 ' + r.unread + ' 条新通知' }); } catch (e) {}
      }
      lastNotifCount = r.unread;
    } catch (e) { /* ignore */ }
    try {
      const m = await api.get('/api/messages/unread');
      const mb = document.getElementById('msgBadge');
      if (mb) { mb.textContent = m.unread; mb.classList.toggle('hidden', !m.unread); }
    } catch (e) { /* ignore */ }
  }
  async function openPanel() {
    if (!curUser && !api.token) { toast('请先登录查看通知', 'info'); return; }
    try {
      const r = await api.get('/api/notifications');
      panel.innerHTML = `
        <div class="notif-head"><b>通知</b><div class="flex" style="gap:6px"><button class="btn btn-ghost btn-sm" id="notifBell">🔔 系统提醒</button><button class="btn btn-ghost btn-sm" id="notifReadAll">全部已读</button></div></div>
        <div class="notif-list">
          ${r.notifications.length ? r.notifications.map(n => `
            <a class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}" data-type="${n.type}" data-ref="${n.ref_id || ''}" href="javascript:void(0)">
              <span class="notif-ic">${n.type === 'comment' ? '💬' : n.type === 'like' ? '👍' : n.type === 'capsule' ? '⏳' : n.type === 'badge' ? '🏅' : n.type === 'announce' ? '💡' : n.type === 'message' ? '💬' : n.type === 'checkin' ? '🌱' : '👥'}</span>
              <div><div>${esc(n.actor ? n.actor.nickname + ' ' : '')}${esc(n.content)}</div><small>${timeAgo(n.created_at)}</small></div>
            </a>`).join('') : '<div class="empty" style="padding:26px 10px"><div class="ic">🔔</div><h4>暂无通知</h4></div>'}
        </div>`;
      panel.classList.remove('hidden');
      panel.querySelectorAll('.notif-item').forEach(item => item.addEventListener('click', async () => {
        const type = item.dataset.type; const ref = item.dataset.ref;
        await api.post('/api/notifications/read');
        refreshUnread();
        if (type === 'comment' || type === 'like') location.href = 'community.html?post=' + ref;
        else if (type === 'capsule') location.href = 'capsules.html';
        else if (type === 'message') location.href = 'messages.html?to=' + ref;
        else location.href = 'my.html';
      }));
      document.getElementById('notifBell').addEventListener('click', async () => {
        if (!('Notification' in window)) { toast('当前浏览器不支持系统通知', 'error'); return; }
        const perm = await Notification.requestPermission();
        toast(perm === 'granted' ? '已开启系统提醒' : '未获得权限', perm === 'granted' ? 'success' : 'info');
      });
      document.getElementById('notifReadAll').addEventListener('click', async () => {
        await api.post('/api/notifications/read');
        refreshUnread();
        panel.classList.add('hidden');
        toast('已全部标记为已读', 'success');
      });
    } catch (e) { /* ignore */ }
  }
  if (bellBtn) {
    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (panel.classList.contains('hidden')) openPanel();
      else panel.classList.add('hidden');
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.bell-wrap')) panel.classList.add('hidden'); });
  }
  refreshUnread();
  setInterval(refreshUnread, 60000);
}

export function requireAuth() {
  const user = api.cachedUserFromStorage();
  if (user) return user;
  openLogin();
  toast('请先登录后继续', 'info');
  return null;
}
