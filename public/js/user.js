// 用户公开主页
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, fmtDateTime, toast, requireAuth } from './ui.js';
import { avatarHtml } from './charts.js';

const me = await bootstrap('explore');
const params = new URLSearchParams(location.search);
const uid = parseInt(params.get('u'), 10);
if (!uid) { location.href = 'community.html'; }

const TYPE_EMOJI = { 学习: '📚', 实习: '💼', 获奖: '🏆', 跳槽: '🔄', 创业: '🚀', 旅行: '✈️', 其他: '📌' };
let profile = null;

const r = await api.get('/api/users/' + uid + '/profile');
profile = r.profile;
const hero = document.getElementById('profileHero');
hero.innerHTML = `
  <div style="position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap">
    <div class="flex" style="gap:16px">
      ${avatarHtml(profile.nickname, 'xl')}
      <div>
        <b style="font-size:22px;font-weight:900">${esc(profile.nickname)}</b>
        ${profile.target ? `<div class="mt-8" style="font-size:13.5px;color:rgba(255,255,255,.75)">🎯 ${esc(profile.target)}</div>` : ''}
        <p style="font-size:13px;color:rgba(255,255,255,.6);margin-top:4px">${esc(profile.city || '未填城市')} · ${esc(profile.education || '未填身份')} · 加入于 ${fmtDateTime(profile.created_at).slice(0, 10)}</p>
        ${profile.bio ? `<p style="font-size:13.5px;color:rgba(255,255,255,.8);margin-top:8px">${esc(profile.bio)}</p>` : ''}
      </div>
    </div>
    <div style="text-align:right">
      <div class="flex" style="gap:22px;justify-content:flex-end;margin-bottom:12px">
        <div><b style="font-size:22px">${profile.eventCount}</b><div style="font-size:12px;color:rgba(255,255,255,.6)">足迹</div></div>
        <div><b style="font-size:22px">${profile.followerCount}</b><div style="font-size:12px;color:rgba(255,255,255,.6)">粉丝</div></div>
        <div><b style="font-size:22px">${profile.followingCount}</b><div style="font-size:12px;color:rgba(255,255,255,.6)">关注</div></div>
        <div><b style="font-size:22px">${profile.badges.length}</b><div style="font-size:12px;color:rgba(255,255,255,.6)">徽章</div></div>
      </div>
      <div id="profileActions" class="flex" style="gap:8px;justify-content:flex-end"></div>
    </div>
  </div>`;

const actions = document.getElementById('profileActions');
if (!r.isSelf) {
  actions.innerHTML = `
    <button class="btn btn-primary btn-sm" id="pfFollow">${r.isFollowing ? '✓ 已关注' : '＋ 关注'}</button>
    <a class="btn btn-ghost btn-sm" style="text-decoration:none" href="messages.html?to=${profile.id}">✉️ 私信</a>`;
  const followBtn = document.getElementById('pfFollow');
  followBtn.addEventListener('click', async () => {
    const u = requireAuth(); if (!u) return;
    const isF = followBtn.textContent.includes('已关注');
    const rr = isF ? await api.del('/api/users/' + profile.id + '/follow') : await api.post('/api/users/' + profile.id + '/follow');
    followBtn.textContent = rr.followed ? '✓ 已关注' : '＋ 关注';
    toast(rr.followed ? '已关注 ' + profile.nickname : '已取消关注', 'success');
  });
} else {
  actions.innerHTML = '<a class="btn btn-ghost btn-sm" style="text-decoration:none" href="my.html">编辑我的资料 →</a>';
}

document.getElementById('pEvents').innerHTML = profile.events.length
  ? profile.events.map(e => `<div class="flex" style="gap:10px;padding:8px 0;border-bottom:1px dashed var(--line);align-items:flex-start">
      <span style="font-size:20px">${TYPE_EMOJI[e.type] || '📌'}</span>
      <div style="min-width:0"><b style="font-size:13.5px;color:var(--deep)">${esc(e.title)}</b><p class="muted" style="font-size:12px">${esc(e.date)}</p></div></div>`).join('')
  : '<div class="empty" style="padding:20px"><div class="ic">🌱</div><h4>还没有足迹</h4></div>';

document.getElementById('pPosts').innerHTML = profile.posts.length
  ? profile.posts.map(p => `<div class="muted" style="font-size:13px;padding:9px 0;border-bottom:1px dashed var(--line)">
      <b style="color:var(--deep)">${esc(p.title)}</b>
      <div style="font-size:12px;color:var(--text-3);margin-top:2px">${esc(p.group_type)} · ${fmtDateTime(p.created_at).slice(0, 10)}</div></div>`).join('')
  : '<div class="empty" style="padding:20px"><div class="ic">💬</div><h4>还没有发帖</h4></div>';

document.getElementById('pBadges').innerHTML = profile.badges.length
  ? `<div class="flex" style="gap:8px;flex-wrap:wrap">${profile.badges.map(b => `<span class="tag gold">${b.icon} ${esc(b.name)}</span>`).join('')}</div>`
  : '<p class="muted">还没有解锁徽章</p>';
