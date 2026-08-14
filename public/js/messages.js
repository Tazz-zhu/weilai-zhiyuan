// 私信聊天
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, toast, fmtDateTime } from './ui.js';
import { avatarHtml } from './charts.js';

const user = await bootstrap('messages', { auth: true, redirect: 'index.html?login=1' });
if (!user) { /* 已重定向 */ }

let currentOther = null;
let convs = [];

const convList = document.getElementById('convList');
const chatWindow = document.getElementById('chatWindow');
const chatEmpty = document.getElementById('chatEmpty');
const chatBody = document.getElementById('chatBody');
const chatHead = document.getElementById('chatHead');
const msgInput = document.getElementById('chatMsgInput');
const params = new URLSearchParams(location.search);

async function loadConvs() {
  try {
    const r = await api.get('/api/messages/conversations');
    convs = r.conversations || [];
    convs.sort((a, b) => (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) || b.last_time - a.last_time);
    document.getElementById('chatTotal').textContent = convs.length + ' 个会话';
    convList.innerHTML = convs.length ? convs.map(c => `
      <div class="conv-item ${currentOther === c.user_id ? 'on' : ''}" data-id="${c.user_id}" data-name="${esc(c.nickname)}">
        ${avatarHtml(c.nickname)}
        <div class="conv-main">
          <div class="flex-between"><b>${esc(c.nickname)}</b><span class="muted" style="font-size:11px">${convTime(c.last_time)}</span></div>
          <div class="conv-preview">${esc(c.last_message.slice(0, 24))}${c.last_message.length > 24 ? '…' : ''}</div>
        </div>
        ${c.unread ? `<span class="conv-unread">${c.unread}</span>` : ''}
      </div>`).join('')
      : '<div class="empty" style="padding:30px 10px"><div class="ic">💬</div><h4>还没有会话</h4><p>去社区逛逛，给感兴趣的人发条消息吧</p><a class="btn btn-primary btn-sm mt-8" href="community.html">去社区</a></div>';
    convList.querySelectorAll('.conv-item').forEach(item => item.addEventListener('click', () => {
      openChat(parseInt(item.dataset.id, 10));
      if (window.innerWidth <= 900) { document.getElementById('chatList').classList.add('mobile-hidden'); chatWindow.classList.remove('hidden'); chatEmpty.classList.add('hidden'); }
    }));
  } catch (e) { /* ignore */ }
}
window.showMsgImg = (src) => { const m = document.createElement('div'); m.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(10,15,30,.88);display:flex;align-items:center;justify-content:center;cursor:zoom-out'; m.innerHTML = '<img src="' + src + '" style="max-width:92vw;max-height:92vh;border-radius:12px">'; m.addEventListener('click', () => m.remove()); document.body.appendChild(m); };
function convTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  return (d.getMonth() + 1) + '/' + d.getDate();
}

async function openChat(otherId) {
  currentOther = otherId;
  convList.querySelectorAll('.conv-item').forEach(x => x.classList.toggle('on', parseInt(x.dataset.id, 10) === otherId));
  const r = await api.get('/api/messages/' + otherId);
  chatHead.innerHTML = `<a href="user.html?u=${r.other.id}" style="text-decoration:none;display:flex;align-items:center;gap:10px">${avatarHtml(r.other.nickname)} <b style="font-size:15px;color:var(--deep)">${esc(r.other.nickname)}</b></a>`;
  renderMessages(r.messages);
  chatWindow.classList.remove('hidden');
  chatEmpty.classList.add('hidden');
  scrollBottom();
  loadConvs();
}

function renderMessages(messages) {
  chatBody.innerHTML = messages.length ? messages.map(m => `
    <div class="msg-row ${m.from_user === user.id ? 'me' : 'other'}">
      ${m.from_user !== user.id ? avatarHtml(currentOther ? convs.find(c => c.user_id === currentOther)?.nickname || '友' : '友') : ''}
      <div class="msg-bubble">${(m.media && m.media.length ? m.media.map(x => x.type && x.type.startsWith('image') ? '<img class="msg-img" src="' + esc(x.url) + '" onclick="showMsgImg(this.src)">' : '').join('') : '')}${esc(m.content)}<span class="msg-time">${fmtDateTime(m.created_at).slice(11, 16)} ${m.from_user === user.id && m.read ? '· 已读' : ''}</span></div>
    </div>`).join('')
    : '<div class="empty" style="padding:40px"><div class="ic">👋</div><h4>打个招呼，开启对话吧</h4></div>';
  scrollBottom();
}
function scrollBottom() { chatBody.scrollTop = chatBody.scrollHeight; }

async function send(media) {
  const content = msgInput.value.trim();
  if ((!content && !media) || !currentOther) return;
  msgInput.value = '';
  const r = await api.post('/api/messages/' + currentOther, { content, media });
  renderMessages(r.messages);
  loadConvs();
}
document.getElementById('msgImgBtn').addEventListener('click', () => document.getElementById('msgImgInput').click());
document.getElementById('msgImgInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('仅支持图片', 'error'); return; }
  if (file.size > 5 * 1024 * 1024) { toast('图片 ≤5MB', 'error'); return; }
  const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
  toast('上传中…', 'info', 1200);
  try {
    const r = await api.post('/api/upload', { name: file.name, type: file.type, data: dataUrl.split(',')[1] });
    await send([{ url: r.url, type: r.type }]);
  } catch (err) { toast(err.message, 'error'); }
});
document.getElementById('chatSendBtn').addEventListener('click', send);
msgInput.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

// 轮询：3s 拉当前会话新消息，30s 刷新会话
setInterval(async () => {
  if (!currentOther) return;
  try {
    const r = await api.get('/api/messages/' + currentOther);
    renderMessages(r.messages);
  } catch (e) { /* ignore */ }
}, 3000);
setInterval(loadConvs, 30000);
document.getElementById('readAllMsg').addEventListener('click', async () => {
  await api.post('/api/messages/read-all');
  toast('已全部标记为已读', 'success');
  loadConvs();
  const badge = document.getElementById('msgBadge'); if (badge) badge.classList.add('hidden');
});

// 直达 ?to=uid
(async () => {
  await loadConvs();
  const to = params.get('to');
  if (to) {
    const id = parseInt(to, 10);
    await openChat(id);
    if (window.innerWidth <= 900) { document.getElementById('chatList').classList.add('mobile-hidden'); chatWindow.classList.remove('hidden'); chatEmpty.classList.add('hidden'); }
  }
})();
