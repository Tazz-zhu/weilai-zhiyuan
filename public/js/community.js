// 同路人社区 v2：全部讨论 + 职业圈子（行业 → 职业 两级）
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, openModal, closeModal, toast, timeAgo, requireAuth, badgeToast, setBtnLoading } from './ui.js';
import { avatarHtml } from './charts.js';

const user = await bootstrap('community');
const list = document.getElementById('postList');
const CAT_ICONS = {
  '互联网科技': '💻', '人工智能与前沿': '🤖', '金融与经济': '💹', '医疗健康': '🏥',
  '教育科研': '📚', '文化创意与传媒': '🎬', '工程与制造': '🏭', '商业与运营': '📊',
  '政法与公共服务': '⚖️', '艺术与体育': '🎨', '生活服务与新消费': '☕', '新兴前沿职业': '🚀',
  '农业与食品': '🌾', '能源与环保': '⚡', '交通与物流': '🚄', '旅游与酒店': '🏨',
  '体育与健康': '🏃', '美妆与时尚': '💄', '宠物与生活': '🐾', '大健康与养老': '💚',
  '军警与公共服务': '🛡️', '新兴数字职业': '🛰️', '教育与培训': '🧑‍🏫'
};

let currentGroup = 'all';
let currentType = '';
let mode = 'all';
let followingSet = new Set();
if (api.token) {
  api.get('/api/me/following').then(f => { followingSet = new Set((f.following || []).map(u => u.id)); }).catch(() => {});
}
let allCircles = [];       // /api/community/careers items
let currentCircle = null;  // 当前圈子 career id
let circleSort = 'mix';

// ---------- 全部讨论 ----------
async function loadPosts(careerId = null) {
  if (currentGroup === 'following') {
    const u = requireAuth(); if (!u) { currentGroup = 'all'; document.querySelector('#groupBar .tab-btn.active').classList.remove('active'); return; }
    const r = await api.get('/api/me/feed');
    list.innerHTML = r.posts.length ? r.posts.map(p => ({ ...p, career_name: null })).map(postCard).join('')
      : '<div class="card empty"><div class="ic">❤️</div><h4>关注的人还没有发帖</h4><p>去社区逛逛，关注几个同路人吧</p><a class="btn btn-primary btn-sm mt-8" href="community.html">去逛逛</a></div>';
    bindCommentButtons();
    return;
  }
  const isHot = currentGroup === 'hot';
  const q = careerId ? `career=${careerId}` : `group=${isHot ? 'all' : currentGroup}${isHot ? '&hot=1' : ''}${currentType ? '&type=' + currentType : ''}`;
  const r = await api.get('/api/community?' + q);
  list.innerHTML = r.posts.map(p => postCard(p)).join('');
  bindCommentButtons();
  bindPostManage();
}
function mediaHtml(media, allowLightbox = false) {
  if (!media || !media.length) return '';
  const images = media.filter(m => m && m.type && m.type.startsWith('image'));
  const videos = media.filter(m => m && m.type && m.type.startsWith('video'));
  let html = '';
  if (videos.length) html += videos.map(v => '<video class="post-media-video" src="' + esc(v.url) + '" controls preload="metadata"></video>').join('');
  if (images.length) html += '<div class="post-media-grid ' + (images.length === 1 ? 'one' : '') + '">' + images.map(im => '<img class="post-media-img" src="' + esc(im.url) + '" loading="lazy" alt="动态图片"' + (allowLightbox ? ' onclick="event.stopPropagation();showLightbox(this.src)"' : '') + '>').join('') + '</div>';
  return html;
}
function contentWithTags(text) {
  let t = esc(text);
  t = t.replace(/#([\u4e00-\u9fa5A-Za-z0-9_]{1,20})/g, '<a class="tag-link" href="community.html?tag=$1" onclick="event.stopPropagation()">#$1</a>');
  return t;
}

window.showLightbox = (src) => {
  const mask = document.createElement('div');
  mask.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(10,15,30,.88);display:flex;align-items:center;justify-content:center;cursor:zoom-out';
  mask.innerHTML = '<img src="' + src + '" style="max-width:92vw;max-height:92vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.5)">';
  mask.addEventListener('click', () => mask.remove());
  document.body.appendChild(mask);
};

function postCard(p) {
  return `<div class="card post-card" onclick="showPost(${p.id})" style="cursor:pointer">
    <div class="post-head">
      <a href="user.html?u=${p.user.id}" onclick="event.stopPropagation()" style="text-decoration:none">${avatarHtml(p.user.nickname)}</a>
      <div><a href="user.html?u=${p.user.id}" onclick="event.stopPropagation()" style="text-decoration:none;color:var(--deep)"><b>${esc(p.user.nickname)}</b></a><div class="ph-time">${timeAgo(p.created_at)}</div></div>
      ${user && p.user.id !== user.id ? `<button class="follow-btn ${followingSet.has(p.user.id) ? 'on' : ''}" data-uid="${p.user.id}" data-name="${esc(p.user.nickname)}" onclick="event.stopPropagation();toggleFollow(this)">${followingSet.has(p.user.id) ? '✓ 已关注' : '＋ 关注'}</button>` : ''}
      <a class="follow-btn" href="messages.html?to=${p.user.id}" onclick="event.stopPropagation()" style="text-decoration:none">✉️ 私信</a>
      <span style="margin-left:auto;display:flex;gap:6px">
        ${(p.tags || []).includes('平行人生') && p.career_id ? `<a class="btn btn-primary btn-sm" href="sim.html?career=${p.career_id}" onclick="event.stopPropagation()" style="padding:3px 10px;font-size:12px">🎮 体验这条平行人生</a>` : ''}
        ${p.career_name ? `<span class="tag purple" style="font-size:11px">🏛️ ${esc(p.career_name)} 圈子</span>` : ''}
        <span class="post-group">${esc(p.group_type)}</span>
      </span>
    </div>
    <h4>${esc(p.title)} ${p.essence ? '<span class="tag gold">⭐ 精华</span>' : ''} ${p.post_type === 'ask' ? '<span class="tag rose">求助</span>' : p.post_type === 'checkin' ? '<span class="tag green">打卡</span>' : '<span class="tag blue">分享</span>'}</h4>
    <p>${contentWithTags(p.content)}</p>
    ${(p.tags || []).length ? `<div class="flex mt-8" style="gap:6px;flex-wrap:wrap">${p.tags.map(t => `<a class="tag-link chip" href="community.html?tag=${encodeURIComponent(t)}" onclick="event.stopPropagation()">#${esc(t)}</a>`).join('')}</div>` : ''}
    ${mediaHtml(p.media)}
    <div class="post-inline hidden" data-pid="${p.id}"></div>
    <div class="post-foot">
      <button class="${p.likedByMe ? 'liked' : ''}" data-like="${p.id}" onclick="event.stopPropagation();likePost(${p.id}, this)">👍 <span>${p.likes}</span></button>
      <button data-comments="${p.id}">💬 讨论</button>
      <button data-favpost="${p.id}" class="${p.favByMe ? 'liked' : ''}">⭐ <span>${p.favByMe ? '已收藏' : '收藏'}</span></button>
      ${p.mine ? `<button data-editpost="${p.id}">✏️ 编辑</button><button data-delpost="${p.id}">🗑️</button>` : ''}
    </div>
  </div>`;
}
document.getElementById('groupBar').addEventListener('click', e => {
  const b = e.target.closest('.tab-btn'); if (!b) return;
  document.querySelectorAll('#groupBar .tab-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  if (b.dataset.t) { currentGroup = 'all'; currentType = b.dataset.t; }
  else currentType = '';
  loadPosts();
});

window.toggleFollow = async (btn) => {
  const u = requireAuth(); if (!u) return;
  const uid = parseInt(btn.dataset.uid, 10);
  const isF = followingSet.has(uid);
  const r = isF ? await api.del('/api/users/' + uid + '/follow') : await api.post('/api/users/' + uid + '/follow');
  if (r.followed !== undefined) {
    if (r.followed) followingSet.add(uid); else followingSet.delete(uid);
    btn.classList.toggle('on', !!r.followed);
    btn.textContent = r.followed ? '✓ 已关注' : '＋ 关注';
    toast(r.followed ? '已关注 ' + btn.dataset.name : '已取消关注', 'success');
  }
};

// 内联评论展开
async function toggleComments(pid, btn) {
  const card = btn.closest('.post-card');
  const box = card ? card.querySelector('.post-inline') : document.querySelector('.post-inline[data-pid="' + pid + '"]');
  if (!box) return;
  if (!box.classList.contains('hidden')) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  const r = await api.get('/api/community/' + pid);
  box.classList.remove('hidden');
  box.innerHTML = `
    <div class="inline-comments">
      <div class="ic-list">
        ${r.comments.map(c => `
          <div class="flex" style="gap:8px;padding:7px 0;border-bottom:1px dashed var(--line);align-items:flex-start">
            ${avatarHtml(c.user.nickname)}
            <div style="min-width:0"><b style="font-size:12.5px">${esc(c.user.nickname)}</b>
            <p style="font-size:12.5px;color:var(--text-2)">${esc(c.content)}</p></div>
undefined
          </div>`).join('') || '<p class="muted" style="font-size:12.5px">还没有评论，来抢沙发～</p>'}
      </div>
      <div class="flex mt-8" style="gap:8px">
        <input class="input" style="font-size:13px;padding:8px 12px" placeholder="友善评论…" data-cinput="${pid}">
        <button class="btn btn-primary btn-sm" data-csend="${pid}">评论</button>
      </div>
    </div>`;
  box.querySelectorAll('[data-delcomment]').forEach(db => db.addEventListener('click', async () => {
    await api.del('/api/comments/' + db.dataset.delcomment);
    await toggleComments(pid, btn);
  }));
  box.querySelector('[data-csend="' + pid + '"]').addEventListener('click', async () => {
    const u = requireAuth(); if (!u) return;
    const input = box.querySelector('[data-cinput="' + pid + '"]');
    const content = input.value.trim();
    if (!content) { toast('评论不能为空', 'error'); return; }
    await api.post('/api/community/' + pid + '/comments', { content });
    input.value = '';
    await toggleComments(pid, btn);
  });
}
function bindPostManage(scope) {
  (scope || document).querySelectorAll('[data-favpost]').forEach(b => {
    if (b.dataset.bound) return; b.dataset.bound = '1';
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      const u = requireAuth(); if (!u) return;
      const pid = parseInt(b.dataset.favpost, 10);
      const isF = b.classList.contains('liked');
      const r = isF ? await api.del('/api/community/' + pid + '/favorite') : await api.post('/api/community/' + pid + '/favorite');
      b.classList.toggle('liked', !!r.fav);
      b.classList.remove('star-pop'); void b.offsetWidth; b.classList.add('star-pop');
      b.querySelector('span').textContent = r.fav ? '已收藏' : '收藏';
      toast(r.fav ? '已收藏帖子' : '已取消收藏', 'success');
    });
  });
  (scope || document).querySelectorAll('[data-editpost]').forEach(b => {
    if (b.dataset.bound) return; b.dataset.bound = '1';
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pid = parseInt(b.dataset.editpost, 10);
      const r = await api.get('/api/community/' + pid);
      const p = r.post;
      document.getElementById('cpTitle').value = p.title;
      document.getElementById('cpContent').value = p.content;
      mediaList = p.media || [];
      renderMediaPreview();
      openCompose(p.career_id);
      window.__editingPost = pid;
      toast('编辑模式：改好后点发布', 'info', 2500);
    });
  });
  (scope || document).querySelectorAll('[data-delpost]').forEach(b => {
    if (b.dataset.bound) return; b.dataset.bound = '1';
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('确定删除这条帖子？')) return;
      await api.del('/api/community/' + b.dataset.delpost);
      toast('帖子已删除', 'success');
      loadPosts();
    });
  });
}
function bindCommentButtons(scope) {
  (scope || document).querySelectorAll('[data-comments]').forEach(b => {
    if (b.dataset.bound) return;
    b.dataset.bound = '1';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleComments(parseInt(b.dataset.comments, 10), b);
    });
  });
}

window.likePost = async (id, btn) => {
  const u = requireAuth(); if (!u) return;
  const r = await api.post('/api/community/' + id + '/like');
  btn.classList.toggle('liked', r.liked);
  btn.classList.remove('like-pop'); void btn.offsetWidth; btn.classList.add('like-pop');
  const span = btn.querySelector('span');
  span.textContent = (parseInt(span.textContent, 10) + (r.liked ? 1 : -1));
};

// ---------- 职业圈子 ----------
async function loadCircles() {
  const r = await api.get('/api/community/careers');
  allCircles = r.items;
  renderIndustries();
}
function renderIndustries() {
  showView('industry');
  const byCat = {};
  for (const c of allCircles) (byCat[c.category] = byCat[c.category] || []).push(c);
  const cats = Object.keys(byCat);
  document.getElementById('industryGrid').innerHTML = cats.map((cat, i) => {
    const list = byCat[cat];
    const withPosts = list.filter(c => c.post_count > 0).length;
    return `<div class="card circle-industry fade-up d${(i % 4) + 1}" data-cat="${esc(cat)}">
      <div class="ci-ic">${CAT_ICONS[cat] || '💼'}</div>
      <b>${esc(cat)}</b>
      <span class="muted" style="font-size:12px">${list.length} 个职业圈子 · ${withPosts} 个有讨论</span>
      <span class="mc-arrow">→</span>
    </div>`;
  }).join('');
  document.querySelectorAll('.circle-industry').forEach(card => {
    card.addEventListener('click', () => renderCareers(card.dataset.cat));
  });
}
function renderCareers(cat) {
  showView('career', cat);
  const list = allCircles.filter(c => c.category === cat);
  document.getElementById('careerGrid').innerHTML = list.map(c => `
    <div class="card circle-card" onclick="openCircle('${c.id}')">
      <div class="flex-between">
        <b style="color:var(--deep);font-size:15.5px">${esc(c.name)}</b>
        ${c.hot ? '<span class="hot-tag">🔥</span>' : ''}
      </div>
      <p style="font-size:12.5px;color:var(--text-2);min-height:38px;margin:8px 0">${esc(c.summary.slice(0, 46))}…</p>
      <div class="flex-between">
        <span class="tag ${c.post_count > 0 ? 'purple' : ''}">${c.post_count > 0 ? '💬 ' + c.post_count + ' 帖' : '🈳 暂无帖子，来抢沙发'}</span>
        <span class="muted" style="font-size:11.5px">${c.last_active ? '活跃于 ' + timeAgo(c.last_active) : ''}</span>
      </div>
      <button class="btn btn-primary btn-sm btn-block mt-16">进入圈子 →</button>
    </div>`).join('');
}
async function openCircle(cid) {
  const c = allCircles.find(x => x.id === cid);
  if (!c) return;
  currentCircle = c;
  showView('detail', c.category);
  document.getElementById('bcCareer').textContent = c.name;
  document.getElementById('subTitle').textContent = c.category + ' · ' + c.name + ' 圈子';
  const r = await api.get('/api/community?career=' + cid + '&sort=' + circleSort);
  document.getElementById('circleDetail').innerHTML = `
    <div class="card" style="padding:24px;margin-bottom:18px;background:linear-gradient(135deg,#fff,#f8fbff)">
      <div class="flex-between flex-wrap" style="gap:14px">
        <div class="flex" style="gap:14px">
          <span class="jc-tile" style="background:var(--grad-brand)">${esc(c.name.slice(0, 1))}</span>
          <div>
            <h3 style="font-size:19px;color:var(--deep);font-weight:900">${esc(c.name)} 圈子</h3>
            <p style="font-size:13px;color:var(--text-2);margin-top:4px">${esc(c.summary)}</p>
            <div class="flex mt-8" style="gap:8px;flex-wrap:wrap">
              <span class="tag orange">${esc(c.category)}</span>
              <span class="tag purple">💬 ${c.post_count} 帖</span>
              <span class="tag green">💰 ${c.radar.income}/100 收入</span>
              <span class="tag blue">📈 ${c.radar.prospect}/100 前景</span>
            </div>
          </div>
        </div>
        <button class="btn btn-primary btn-shine" id="circlePostBtn">✍️ 发到「${esc(c.name)}」圈子</button>
      </div>
    </div>
    <div class="flex mb-16" style="gap:8px" id="circleSortBar">
      ${['mix', 'new', 'hot', 'essence'].map(s => `<button class="tab-btn ${circleSort === s ? 'active' : ''}" data-sort="${s}">${s === 'mix' ? '综合' : s === 'new' ? '最新' : s === 'hot' ? '热门' : '精华'}</button>`).join('')}
    </div>
    <div style="display:flex;flex-direction:column;gap:16px" id="circlePosts">
      ${r.posts.length ? r.posts.map(postCard).join('') : `<div class="card empty"><div class="ic">🈳</div><h4>这个圈子还没有帖子</h4><p>成为第一个发帖的人吧！</p></div>`}
    </div>`;
  bindCommentButtons(document.getElementById('circlePosts'));
  bindPostManage(document.getElementById('circlePosts'));
  document.getElementById('circlePostBtn').addEventListener('click', () => openCompose(cid));
  document.querySelectorAll('#circleSortBar [data-sort]').forEach(btn => btn.addEventListener('click', async () => {
    circleSort = btn.dataset.sort;
    document.querySelectorAll('#circleSortBar [data-sort]').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    const rr = await api.get('/api/community?career=' + cid + '&sort=' + circleSort);
    document.getElementById('circlePosts').innerHTML = rr.posts.length ? rr.posts.map(postCard).join('') : '<div class="card empty"><div class="ic">🈳</div><h4>这个排序下还没有帖子</h4></div>';
    bindCommentButtons(document.getElementById('circlePosts'));
    bindPostManage(document.getElementById('circlePosts'));
  }));
}
window.openCircle = openCircle;
function showView(view, cat = '') {
  const bc = document.getElementById('circleBreadcrumb');
  const ig = document.getElementById('industryGrid');
  const cg = document.getElementById('careerGrid');
  const cd = document.getElementById('circleDetail');
  ig.classList.toggle('hidden', view !== 'industry');
  cg.classList.toggle('hidden', view !== 'career');
  cd.classList.toggle('hidden', view !== 'detail');
  bc.classList.toggle('hidden', view === 'industry');
  document.getElementById('bcSep2').style.display = view === 'detail' ? '' : 'none';
  document.getElementById('bcCareer').textContent = view === 'detail' ? (currentCircle ? currentCircle.name : '') : '';
  document.getElementById('bcIndustry').textContent = cat || '';
  document.getElementById('subTitle').textContent = view === 'industry'
    ? '先选行业，再进入职业圈子看大家聊什么'
    : (view === 'career' ? cat + ' · 选择你想逛的圈子' : '');
}
document.getElementById('circleBackBtn').addEventListener('click', () => {
  if (currentCircle) { currentCircle = null; renderCareers(document.getElementById('bcIndustry').textContent); }
  else renderIndustries();
});
document.getElementById('bcIndustries').addEventListener('click', () => { currentCircle = null; renderIndustries(); });

// ---------- 今日话题 ----------
(async () => {
  try {
    const r = await api.get('/api/topic/today');
    document.getElementById('topicText').textContent = '今日话题：' + r.topic.text;
    document.getElementById('topicHint').textContent = r.topic.hint;
    document.getElementById('topicCard').classList.remove('hidden');
    document.getElementById('topicJoin').addEventListener('click', () => {
      openCompose();
      document.getElementById('cpTitle').value = '【今日话题】' + r.topic.text;
    });
  } catch (e) { /* ignore */ }
})();

// ---------- 模式切换 ----------
document.getElementById('modeBar').addEventListener('click', e => {
  const b = e.target.closest('.tab-btn'); if (!b) return;
  document.querySelectorAll('#modeBar .tab-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  mode = b.dataset.mode;
  document.getElementById('allMode').classList.toggle('hidden', mode !== 'all');
  document.getElementById('circlesMode').classList.toggle('hidden', mode !== 'circles');
  if (mode === 'circles' && !allCircles.length) loadCircles();
});

// ---------- 发帖 ----------
async function fillComposeTarget() {
  const sel = document.getElementById('cpTarget');
  const optGroup = sel.querySelector('optgroup');
  // 构建职业圈子选项（按行业分组）
  if (!allCircles.length) {
    const r = await api.get('/api/community/careers');
    allCircles = r.items;
  }
  const byCat = {};
  for (const c of allCircles) (byCat[c.category] = byCat[c.category] || []).push(c);
  optGroup.innerHTML = Object.keys(byCat).map(cat => `
    <option value="" disabled>── ${esc(cat)} ──</option>
    ${byCat[cat].map(c => `<option value="${c.id}">${esc(c.name)} 圈子（${c.post_count}帖）</option>`).join('')}
  `).join('');
}
let mediaList = [];
async function uploadFiles(files) {
  for (const file of files) {
    if (mediaList.length >= 9) { toast('最多 9 个媒体', 'error'); break; }
    const isVideo = file.type.startsWith('video/');
    const max = isVideo ? 30 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > max) { toast((isVideo ? '视频' : '图片') + '超过大小限制', 'error'); continue; }
    const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
    const base64 = dataUrl.split(',')[1];
    toast('上传中：' + file.name, 'info', 1500);
    try {
      const r = await api.post('/api/upload', { name: file.name, type: file.type, data: base64 });
      mediaList.push({ url: r.url, type: r.type });
      renderMediaPreview();
    } catch (e) { toast(e.message, 'error'); }
  }
}
function renderMediaPreview() {
  const box = document.getElementById('mediaPreview');
  box.innerHTML = mediaList.map((m, i) => m.type.startsWith('video/')
    ? '<div class="mp-item"><video src="' + m.url + '" muted></video><button data-i="' + i + '" class="mp-del">✕</button></div>'
    : '<div class="mp-item"><img src="' + m.url + '" alt=""><button data-i="' + i + '" class="mp-del">✕</button></div>').join('');
  box.querySelectorAll('.mp-del').forEach(b => b.addEventListener('click', () => { mediaList.splice(parseInt(b.dataset.i, 10), 1); renderMediaPreview(); }));
}
function openCompose(careerId = null) {
  const u = requireAuth(); if (!u) return;
  mediaList = [];
  document.querySelectorAll('#composeModal [data-tp]').forEach(x => x.classList.toggle('on', x.dataset.tp === 'share'));
  document.getElementById('cpTitle').value = '';
  document.getElementById('cpContent').value = '';
  renderMediaPreview();
  fillComposeTarget().then(() => {
    document.getElementById('cpTarget').value = careerId || 'general';
    toggleGroupWrap();
  });
  openModal('composeModal');
}
function toggleGroupWrap() {
  const v = document.getElementById('cpTarget').value;
  document.getElementById('cpGroupWrap').style.display = v === 'general' ? '' : 'none';
}
document.getElementById('newPostBtn').addEventListener('click', () => openCompose());
document.querySelectorAll('#composeModal [data-tp]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#composeModal [data-tp]').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
}));
document.getElementById('pickMediaBtn').addEventListener('click', () => document.getElementById('cpMedia').click());
document.getElementById('cpMedia').addEventListener('change', (e) => { uploadFiles([...e.target.files]); e.target.value = ''; });
document.getElementById('cpTarget').addEventListener('change', toggleGroupWrap);
document.getElementById('cpSubmit').addEventListener('click', async () => {
  setBtnLoading(document.getElementById('cpSubmit'), true);
  const target = document.getElementById('cpTarget').value;
  const title = document.getElementById('cpTitle').value.trim();
  const content = document.getElementById('cpContent').value.trim();
  if (!title || !content) { toast('请填写标题和内容', 'error'); return; }
  const postType = document.querySelector('#composeModal [data-tp].on')?.dataset.tp || 'share';
  const payload = { title, content, media: mediaList, post_type: postType };
  if (window.__editingPost) { payload.id = window.__editingPost; }
  if (target === 'general') {
    payload.group_type = document.getElementById('cpGroup').value;
  } else {
    payload.career_id = target;
    payload.group_type = '职业圈子';
  }
  try {
    let r;
    if (window.__editingPost) { r = await api.patch('/api/community/' + window.__editingPost, payload); window.__editingPost = null; }
    else r = await api.post('/api/community', payload);
    closeModal('composeModal');
    toast('发布成功', 'success');
    setBtnLoading(document.getElementById('cpSubmit'), false);
    if (r.badges && r.badges.length) badgeToast(r.badges);
    if (mode === 'circles' && currentCircle) openCircle(currentCircle.id);
    else loadPosts();
    if (mode === 'circles') loadCircles();
  } catch (e) { toast(e.message, 'error'); }
});

// ---------- 帖子详情 ----------
window.showPost = async (id) => {
  const r = await api.get('/api/community/' + id);
  const p = r.post;
  document.getElementById('postBody').innerHTML = `
    <div class="post-head">
      ${avatarHtml(p.user.nickname)}
      <div><b>${esc(p.user.nickname)}</b><div class="ph-time">${timeAgo(p.created_at)}</div></div>
      <span style="margin-left:auto;display:flex;gap:6px">
        ${p.career_name ? `<span class="tag purple">🏛️ ${esc(p.career_name)} 圈子</span>` : ''}
        <span class="post-group">${esc(p.group_type)}</span>
      </span>
    </div>
    <h3 style="font-size:19px;color:var(--deep);margin:10px 0 8px">${esc(p.title)}</h3>
    <p style="font-size:14.5px;color:var(--text-2);white-space:pre-wrap">${contentWithTags(p.content)}</p>
    ${(p.tags || []).length ? `<div class="flex mt-8" style="gap:6px;flex-wrap:wrap">${p.tags.map(t => `<a class="tag-link chip" href="community.html?tag=${encodeURIComponent(t)}">#${esc(t)}</a>`).join('')}</div>` : ''}
    ${mediaHtml(p.media, true)}
    <div class="divider"></div>
    <div class="text-center mb-16" style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-sm ${p.favByMe ? 'liked' : ''}" id="favPostBtn">${p.favByMe ? '⭐ 已收藏' : '☆ 收藏'}</button>
      <button class="btn btn-ghost btn-sm" id="sharePostBtn">📤 分享</button>
      <button class="btn btn-ghost btn-sm" id="reportPostBtn">🚩 举报该内容</button>
      ${p.mine ? '<button class="btn btn-sm" id="delPostBtn" style="background:var(--rose-soft);color:#cf4266">删除</button>' : ''}
    </div>
    <b style="color:var(--deep)">💬 讨论 (${r.comments.length})</b>
    <div id="commentList" style="margin:12px 0">
      ${r.comments.map(c => `
        <div class="flex" style="gap:10px;padding:10px 0;border-bottom:1px dashed var(--line)">
          ${avatarHtml(c.user.nickname)}
          <div><b style="font-size:13.5px">${esc(c.user.nickname)}</b>
          <p style="font-size:13.5px;color:var(--text-2)">${esc(c.content)}</p></div>
        </div>`).join('') || '<p class="muted">还没有评论，来抢沙发～</p>'}
    </div>
    <div class="flex" style="gap:10px">
      <input class="input" id="commentInput" placeholder="友善评论，温暖同行…">
      <button class="btn btn-primary" id="commentBtn">评论</button>
    </div>`;
  openModal('postModal');
  document.getElementById('favPostBtn').addEventListener('click', async () => {
    const u = requireAuth(); if (!u) return;
    const isF = document.getElementById('favPostBtn').classList.contains('liked');
    const r = isF ? await api.del('/api/community/' + id + '/favorite') : await api.post('/api/community/' + id + '/favorite');
    document.getElementById('favPostBtn').classList.toggle('liked', !!r.fav);
    document.getElementById('favPostBtn').textContent = r.fav ? '⭐ 已收藏' : '☆ 收藏';
  });
  document.getElementById('sharePostBtn').addEventListener('click', async () => {
    const txt = '【' + p.title + '】\n' + p.content.slice(0, 60) + '…\n—— 来自「未来致远」，你的人生自己导航：' + location.origin + '/community.html?post=' + p.id;
    try { await navigator.clipboard.writeText(txt); toast('分享文案已复制！', 'success'); }
    catch (e) { toast('复制失败', 'error'); }
  });
  const delBtn = document.getElementById('delPostBtn');
  if (delBtn) delBtn.addEventListener('click', async () => {
    if (!confirm('确定删除这条帖子？')) return;
    await api.del('/api/community/' + id);
    closeModal('postModal');
    toast('帖子已删除', 'success');
    loadPosts();
  });
  document.getElementById('reportPostBtn').addEventListener('click', async () => {
    if (!confirm('举报该帖子？我们会在后台审核处理。')) return;
    await api.post('/api/reports', { post_id: id, reason: '内容违规' });
    toast('举报已提交，感谢你的反馈', 'success');
  });
  document.getElementById('commentBtn').addEventListener('click', async () => {
    const u = requireAuth(); if (!u) return;
    const content = document.getElementById('commentInput').value.trim();
    if (!content) { toast('评论不能为空', 'error'); return; }
    await api.post('/api/community/' + id + '/comments', { content });
    toast('评论成功', 'success');
    showPost(id);
  });
};

// ---------- 启动 ----------
loadPosts();
// 支持 ?career= 直达圈子
const params = new URLSearchParams(location.search);
if (params.get('tag')) {
  (async () => {
    const r = await api.get('/api/community?tag=' + encodeURIComponent(params.get('tag')));
    list.innerHTML = r.posts.map(postCard).join('');
    document.getElementById('subTitle').textContent = '话题 #' + params.get('tag') + ' · 共 ' + r.posts.length + ' 帖';
    bindCommentButtons();
  })();
} else if (params.get('type')) {
  currentType = params.get('type');
  const t = document.querySelector('#groupBar [data-t="' + currentType + '"]');
  if (t) { document.querySelectorAll('#groupBar .tab-btn').forEach(x => x.classList.remove('active')); t.classList.add('active'); }
  loadPosts();
} else if (params.get('feed') === 'following') {
  const tab = document.querySelector('#groupBar [data-g="following"]');
  if (tab) {
    document.querySelectorAll('#groupBar .tab-btn').forEach(x => x.classList.remove('active'));
    tab.classList.add('active');
    currentGroup = 'following';
    loadPosts();
  }
} else if (params.get('career')) {
  document.querySelector('#modeBar [data-mode="circles"]').click();
  loadCircles().then(() => {
    const cid = params.get('career');
    openCircle(cid);
  });
} else if (params.get('post')) {
  showPost(parseInt(params.get('post'), 10));
}
