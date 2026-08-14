// 我的个人中心 + 新手任务 + 账号设置
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, openModal, closeModal, toast, fmtDateTime, badgeToast, setBtnLoading } from './ui.js';
import { avatarHtml, countUp } from './charts.js';
import { achievementShareImage, showShareModal } from './share-image.js';

const user = await bootstrap('my', { auth: true, redirect: 'index.html?login=1' });
if (!user) { /* 已重定向 */ }

async function load() {
  const [dashR, tlR, capR, assR, postsR, profR] = await Promise.all([
    api.get('/api/dashboard').catch(() => null),
    api.get('/api/timeline').catch(() => null),
    api.get('/api/capsules').catch(() => null),
    api.get('/api/assessments').catch(() => null),
    api.get('/api/me/posts').catch(() => null),
    api.get('/api/profile').catch(() => null)
  ]);
  const d = dashR ? dashR.dashboard : null;
  const events = tlR ? tlR.events : [];
  window.__dash = {
    events: events.length,
    badges: dashR && dashR.badges ? dashR.badges : [],
    streak: dashR && dashR.checkin ? dashR.checkin.streak : 0,
    growthIndex: dashR && dashR.growthIndex !== undefined ? dashR.growthIndex : 0
  };
  const capsules = capR ? capR.capsules : [];
  const assessments = assR ? assR.assessments : [];
  const posts = postsR ? postsR.posts : [];
  const profile = profR ? profR.profile : null;

  // 顶部资料卡
  const hero = document.getElementById('myHero');
  hero.innerHTML = `
    <div style="position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap">
      <div class="flex" style="gap:16px">
        ${avatarHtml(user.nickname, 'xl')}
        <div>
          <b style="font-size:22px;font-weight:900">${esc(user.nickname)}</b>
          ${d ? `<span class="tag" style="background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.2)">${d.levelIcon} Lv.${d.level} · ${esc(d.levelName)}</span>` : ''}
          <p style="color:rgba(255,255,255,.7);font-size:13.5px;margin-top:6px">${user.education || '未填写身份'} · ${user.city || '未填写城市'} ${user.target ? '· 🎯 ' + esc(user.target) : ''}</p>
        </div>
      </div>
      <div style="text-align:right;color:rgba(255,255,255,.7)">
        <div style="font-size:13px">加入于 ${fmtDateTime(user.created_at).slice(0, 10)}</div>
        <div class="mt-8" style="font-size:13px">徽章 ${dashR && dashR.badges ? dashR.badges.length : 0} 枚 · 足迹 ${events.length} 条 · 胶囊 ${capsules.length} 颗</div>
      </div>
    </div>`;

  // 新手任务
  const hasProfile = !!(profile && profile.education && profile.city);
  const tasks = [
    { key: 'profile', label: '完善个人资料（身份 / 城市）', done: hasProfile, href: '#', btn: '去完善', act: 'profile' },
    { key: 'assessment', label: '完成一次四维测评', done: assessments.length > 0, href: 'assessment.html', btn: '去测评' },
    { key: 'event', label: '记录第一件人生大事', done: events.length >= 1, href: 'timeline.html', btn: '去记录' },
    { key: 'capsule', label: '埋下一颗时光胶囊', done: capsules.length >= 1, href: 'capsules.html', btn: '去埋' },
    { key: 'post', label: '在社区发布第一篇内容', done: posts.length >= 1, href: 'community.html', btn: '去发帖' }
  ];
  const doneCount = tasks.filter(t => t.done).length;
  document.getElementById('taskProgress').textContent = doneCount + ' / ' + tasks.length;
  document.getElementById('taskList').innerHTML = tasks.map(t => `
    <div class="task-row ${t.done ? 'done' : ''}">
      <span class="task-check">${t.done ? '✓' : t.key === 'profile' ? '✎' : ''}</span>
      <span class="task-label">${esc(t.label)}</span>
      ${t.done ? '<span class="tag green">已完成</span>' : (t.act === 'profile' ? '<button class="btn btn-primary btn-sm" data-act="profile">去完善</button>' : `<a class="btn btn-primary btn-sm" href="${t.href}">${t.btn}</a>`)}
    </div>`).join('');
  document.querySelectorAll('[data-act="profile"]').forEach(b => b.addEventListener('click', () => openProfile()));

  // 我的测评（含画像摘要）
  let latestAssess = null;
  try { latestAssess = (await api.get('/api/assessments/latest')).assessment || null; } catch (e) {}
  const brief = latestAssess && latestAssess.result
    ? `<div class="assess-brief">
        <div class="ab-item"><span class="ab-label">能力优势</span><b>${esc(latestAssess.result.abilityDesc || '—')}</b></div>
        <div class="ab-item"><span class="ab-label">核心价值</span><b>${esc(latestAssess.result.valueDesc || '—')}</b></div>
      </div>
      <div class="mt-8 text-center"><a class="btn btn-soft btn-sm" href="assessment.html">查看完整画像 →</a></div>`
    : '';
  document.getElementById('myAssessments').innerHTML = assessments.length
    ? assessments.slice(0, 3).map(a => `<div class="flex-between" style="padding:7px 0;border-bottom:1px dashed var(--line);font-size:13px"><span class="text-2">第 ${a.id} 次测评</span><span class="muted">${fmtDateTime(a.created_at).slice(0, 10)}</span></div>`).join('') + brief
    : `<div class="empty" style="padding:20px"><div class="ic">🧭</div><h4>还没有测评</h4><p>完成测评，让 AI 更懂你。</p><a class="btn btn-primary btn-sm mt-8" href="assessment.html">开始测评</a></div>`;

  // 我的帖子
  document.getElementById('myPosts').innerHTML = posts.length
    ? posts.slice(0, 5).map(p => `
      <div class="flex-between" style="padding:9px 0;border-bottom:1px dashed var(--line);gap:10px">
        <div style="min-width:0"><b style="font-size:14px;color:var(--deep);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.title)}</b>
        <span class="muted" style="font-size:11.5px">${esc(p.group_type)} · ${fmtDateTime(p.created_at).slice(0, 10)}</span></div>
        <a class="btn btn-ghost btn-sm" href="community.html?post=${p.id}">查看</a>
      </div>`).join('')
    : `<div class="empty" style="padding:20px"><div class="ic">💬</div><h4>还没有发过帖</h4><p>去社区聊聊你的想法。</p><a class="btn btn-primary btn-sm mt-8" href="community.html">去社区</a></div>`;

  // 我的收藏帖 + 最近在看
  let favPosts = [];
  try { favPosts = (await api.get('/api/me/fav-posts')).posts || []; } catch (e) {}
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem('zy_recent') || '[]'); } catch (e) {}
  const fpHtml = favPosts.length
    ? favPosts.slice(0, 5).map(p => '<div class="muted" style="font-size:13px;padding:8px 0;border-bottom:1px dashed var(--line)"><a href="community.html?post=' + p.id + '" style="color:var(--deep);font-weight:600">' + esc(p.title) + '</a></div>').join('')
    : '<div class="empty" style="padding:16px"><div class="ic">⭐</div><h4>还没有收藏的帖子</h4><p>在帖子点 ⭐ 收藏，好帖不迷路。</p></div>';
  const rHtml = recent.length
    ? recent.slice(0, 5).map(x => '<div class="muted" style="font-size:13px;padding:7px 0;border-bottom:1px dashed var(--line)"><a href="' + x.href + '" style="color:var(--text-2)">' + esc(x.label) + '</a></div>').join('')
    : '<p class="muted" style="font-size:12.5px">还没有浏览记录</p>';
  document.getElementById('favPostBox').innerHTML = '<div class="mb-12"><div class="sub-head">⭐ 我的收藏帖</div>' + fpHtml + '</div><div><div class="sub-head">🕘 最近在看</div>' + rHtml + '</div>';

  // 我的收藏 / 圈子
  let favs = [];
  try { favs = (await api.get('/api/me/favorites')).items || []; } catch (e) {}
  const favHtml = favs.length
    ? favs.slice(0, 6).map(c => `
      <div class="flex-between" style="padding:8px 0;border-bottom:1px dashed var(--line)">
        <div style="min-width:0"><b style="font-size:13.5px;color:var(--deep)">${esc(c.name)}</b>
        <p class="muted" style="font-size:11.5px">${esc(c.category)}</p></div>
        <div class="flex" style="gap:6px">
          <a class="btn btn-ghost btn-sm" href="career.html?id=${c.id}">详情</a>
          <a class="btn btn-soft btn-sm" href="community.html?career=${c.id}">圈子</a>
        </div>
      </div>`).join('')
    : '<div class="empty" style="padding:18px"><div class="ic">⭐</div><h4>还没有收藏</h4><p>逛职业库时点 ⭐ 收藏，想看时随时回来。</p><a class="btn btn-primary btn-sm mt-8" href="careers.html">去逛职业库</a></div>';
  document.getElementById('favCircleBox').innerHTML = favHtml;

  // 我的关注
  let following = [];
  try { following = (await api.get('/api/me/following')).following || []; } catch (e) {}
  document.getElementById('myFollowing').innerHTML = following.length
    ? following.slice(0, 6).map(u => `
      <div class="flex" style="gap:10px;padding:8px 0;border-bottom:1px dashed var(--line)">
        ${avatarHtml(u.nickname)}
        <div style="min-width:0"><b style="font-size:13.5px;color:var(--deep)">${esc(u.nickname)}</b>
        <p class="muted" style="font-size:11.5px">${esc(u.target || u.city || '同路人')}</p></div>
        <span style="margin-left:auto" class="muted">✓ 已关注</span>
      </div>`).join('')
    : '<div class="empty" style="padding:18px"><div class="ic">❤️</div><h4>还没有关注任何人</h4><p>去社区逛逛，关注有趣的同路人。</p><a class="btn btn-primary btn-sm mt-8" href="community.html">去社区</a></div>';

  // 我的数据
  const stats = [
    ['📈', '成长评分', d ? d.levelProgress + '%' : '-'],
    ['😊', '幸福度', d ? d.happiness : '-'],
    ['🚀', '成长速度', d ? d.growthSpeed : '-'],
    ['📅', '连续签到', dashR && dashR.checkin ? dashR.checkin.streak + ' 天' : '-']
  ];
  const statTones = ['orange', 'green', 'purple', 'blue'];
  document.getElementById('myStats').innerHTML = stats.map((s, i) => `
    <div class="card stat-mini">
      <div class="sm-ic ${statTones[i] || 'orange'}">${s[0]}</div>
      <div class="sm-body"><b class="stat-val sm-num" data-val="${s[2]}">${s[2]}</b><div class="sm-label">${s[1]}</div></div>
    </div>`).join('') + `<div class="stat-foot"><a class="btn btn-soft btn-sm" href="dashboard.html">查看完整看板 →</a><a class="btn btn-ghost btn-sm" href="messages.html">💬 我的私信 →</a></div>`;
  document.querySelectorAll('#myStats .stat-val').forEach(el => {
    const v = el.dataset.val || '';
    const m = v.match(/^([\d.]+)(.*)$/);
    if (m) countUp(el, parseFloat(m[1]), { suffix: m[2], duration: 700 });
  });
}

// ---------- 成就墙 ----------
document.getElementById('achShareBtn').addEventListener('click', () => {
  load().then(() => {
    const dash = window.__dash || {};
    const canvas = achievementShareImage({
      nickname: user.nickname,
      events: dash.events || 0,
      badges: dash.badges || [],
      streak: dash.streak || 0,
      growthIndex: dash.growthIndex || 0
    });
    showShareModal(canvas, '我的成就墙.png');
  });
});

// ---------- 邀请好友 ----------
(function () {
  const link = location.origin + '/index.html?invite=' + encodeURIComponent((user && user.username) || '');
  const input = document.getElementById('inviteLink');
  if (input) input.value = link;
  const btn = document.getElementById('copyInvite');
  if (btn) btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast('邀请链接已复制，快去发给朋友吧！', 'success');
    } catch (e) {
      input.select();
      document.execCommand('copy');
      toast('邀请链接已复制', 'success');
    }
  });
})();

// ---------- 资料编辑 ----------
function openProfile() {
  document.getElementById('pfNick').value = user.nickname || '';
  document.getElementById('pfEdu').value = user.education || '高中';
  document.getElementById('pfCity').value = user.city || '';
  document.getElementById('pfTarget').value = user.target || '';
  document.getElementById('pfBio').value = user.bio || '';
  openModal('profileModal');
}
document.getElementById('editProfileBtn').addEventListener('click', openProfile);
document.getElementById('pfSubmit').addEventListener('click', async () => {
  setBtnLoading(document.getElementById('pfSubmit'), true);
  const payload = {
    nickname: document.getElementById('pfNick').value.trim(),
    education: document.getElementById('pfEdu').value,
    city: document.getElementById('pfCity').value.trim(),
    target: document.getElementById('pfTarget').value.trim(),
    bio: document.getElementById('pfBio').value.trim()
  };
  if (!payload.nickname) { toast('昵称不能为空', 'error'); return; }
  try {
    const r = await api.put('/api/me', payload);
    api.setUser(r.user);
    closeModal('profileModal');
    setBtnLoading(document.getElementById('pfSubmit'), false);
    toast('资料已更新', 'success');
    if (r.badges && r.badges.length) badgeToast(r.badges);
    load();
  } catch (e) { toast(e.message, 'error'); setBtnLoading(document.getElementById('pfSubmit'), false); }
});

// ---------- 修改密码 ----------
document.getElementById('changePwdBtn').addEventListener('click', () => {
  document.getElementById('pwdOld').value = '';
  document.getElementById('pwdNew').value = '';
  openModal('pwdModal');
});
document.getElementById('pwdSubmit').addEventListener('click', async () => {
  const old = document.getElementById('pwdOld').value;
  const pw = document.getElementById('pwdNew').value;
  if (!old || pw.length < 6) { toast('请填写当前密码，新密码至少 6 位', 'error'); return; }
  try {
    await api.put('/api/me/password', { old, new: pw });
    closeModal('pwdModal');
    toast('密码已修改', 'success');
  } catch (e) { toast(e.message, 'error'); }
});

// ---------- 导出 ----------
document.getElementById('exportBtn').addEventListener('click', async () => {
  toast('正在打包你的数据…', 'info');
  try {
    const data = await api.get('/api/me/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '未来致远-我的数据-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('已导出，可在下载文件夹查看', 'success');
  } catch (e) { toast(e.message, 'error'); }
});

// ---------- 退出 / 注销 ----------
document.getElementById('logoutBtn2').addEventListener('click', () => { api.logout(); location.href = 'index.html'; });
document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
  if (!confirm('确定注销账号？你的所有数据（足迹、胶囊、帖子等）将被永久删除且无法恢复。')) return;
  if (!confirm('再次确认：真的要注销吗？')) return;
  try {
    await api.del('/api/me');
    toast('账号已注销，感谢你的使用', 'success');
    setTimeout(() => location.href = 'index.html', 800);
  } catch (e) { toast(e.message, 'error'); }
});

load();
