// 人生数据看板 v2
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, openModal, closeModal, toast, badgeToast } from './ui.js';
import { donutGauge, barList, avatarHtml, trendLine, countUp } from './charts.js';

const user = await bootstrap('dashboard', { auth: true, redirect: 'index.html?login=1' });
const body = document.getElementById('dashBody');

async function load() {
  const r = await api.get('/api/dashboard');
  const d = r.dashboard;
  const badges = r.badges;
  const member = r.member;
  const ALL_BADGES = [
    { id: 'welcome', name: '初来致远', desc: '注册成为致远用户', icon: '🌟' },
    { id: 'profile', name: '认识自己', desc: '完善个人资料', icon: '🪪' },
    { id: 'explorer', name: '生涯探索者', desc: '完成四维深度测评', icon: '🧭' },
    { id: 'recorder5', name: '足迹新手', desc: '记录5件人生大事', icon: '📝' },
    { id: 'recorder20', name: '坚持记录者', desc: '累计记录20件成长事件', icon: '📖' },
    { id: 'capsule1', name: '时光旅人', desc: '埋下一颗时光胶囊', icon: '⏳' },
    { id: 'capsule2', name: '时空对话者', desc: '打开一颗时光胶囊', icon: '💌' },
    { id: 'poster', name: '同路人', desc: '在社区发布第一篇内容', icon: '💬' },
    { id: 'star', name: '成长之星', desc: '成长速度达到80以上', icon: '⭐' }
  ];
  const earnedIds = new Set(badges.map(b => b.badge_id));
  function badgeProgress(id, dd) {
    const ev = dd.total || 0;
    const map = {
      recorder5: Math.min(1, ev / 5),
      recorder20: Math.min(1, ev / 20),
      explorer: r.assessment ? 1 : 0.1,
      profile: (user.education && user.city) ? 1 : 0.4,
      capsule1: Math.min(1, (dd.capsuleCount || 0) / 1),
      poster: Math.min(1, (dd.postCount || 0) / 1),
      star: Math.min(1, dd.growthSpeed / 80),
      welcome: 1, member: 0, inviter: 0, invited: 0
    };
    return map[id] !== undefined ? map[id] : 0;
  }

  body.innerHTML = `
    <div class="card" style="padding:30px;margin-bottom:20px;background:var(--grad-deep);border:0;color:#fff;position:relative;overflow:hidden">
      <div style="position:absolute;right:-50px;top:-50px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(255,140,66,.4),transparent 65%)"></div>
      <div class="flex-between flex-wrap" style="gap:16px;position:relative;z-index:1">
        <div class="flex" style="gap:18px">
          ${avatarHtml(user.nickname, 'xl')}
          <div>
            <h2 style="font-size:26px;font-weight:900">${esc(user.nickname)} <span class="tag" style="background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.2)">${d.levelIcon} Lv.${d.level} · ${esc(d.levelName)}</span></h2>
            <p style="color:rgba(255,255,255,.75);font-size:14px;margin-top:8px">
              ${user.city ? esc(user.city) : '未填写城市'} · ${user.education || '未填写身份'} ${user.target ? '· 目标：' + esc(user.target) : ''}
            </p>
            <p style="color:rgba(255,255,255,.55);font-size:13px;margin-top:5px">${esc(user.bio || '还没有自我介绍，完善资料解锁"认识自己"徽章')}</p>
          </div>
        </div>
        <div style="text-align:right">
          <div class="flex" style="justify-content:flex-end;align-items:center;gap:12px">
            <div><div id="gIndex" style="display:flex;justify-content:flex-end"></div><div style="font-size:11px;color:rgba(255,255,255,.55);margin-top:2px">综合成长指数</div></div>
            <div style="width:1px;height:56px;background:rgba(255,255,255,.15)"></div>
            <div><div style="font-size:12px;color:rgba(255,255,255,.6)">距下一等级</div></div>
          </div>
          <div style="font-size:28px;font-weight:900">${d.levelProgress}%</div>
          <div style="width:190px;height:7px;background:rgba(255,255,255,.2);border-radius:100px;margin-top:8px;overflow:hidden">
            <div style="height:100%;width:${d.levelProgress}%;background:linear-gradient(90deg,#ff8c42,#ffd28a);border-radius:100px;transition:width 1s"></div>
          </div>
          ${d.nextLevel ? `<div style="font-size:11px;color:rgba(255,255,255,.45);margin-top:5px">下一等级：${esc(d.levelName)} → ${esc(d.nextLevel >= 1000 ? '致远之星' : '…')}</div>` : '<div style="font-size:11px;color:rgba(255,255,255,.45);margin-top:5px">已达最高等级 🎉</div>'}
        </div>
      </div>
    </div>

    <div class="grid grid-4 mb-24" style="gap:16px">
      <div class="card stat-card"><div class="sc-ic">⚡</div><div class="sc-num" id="gSkill"></div><div class="sc-label">技能值</div></div>
      <div class="card stat-card"><div class="sc-ic">🎯</div><div class="sc-num" id="gExp"></div><div class="sc-label">经验值</div></div>
      <div class="card stat-card"><div class="sc-ic">😊</div><div class="sc-num" id="gHappy"></div><div class="sc-label">幸福度</div></div>
      <div class="card stat-card"><div class="sc-ic">🚀</div><div class="sc-num" id="gGrowth"></div><div class="sc-label">成长速度 / 90天</div></div>
    </div>

    <div class="card mb-24" style="padding:20px 26px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;background:linear-gradient(135deg,#fff7ef,#fff)">
      <div class="flex" style="gap:12px">
        <div style="font-size:30px">📅</div>
        <div><b style="color:var(--deep)">连续签到 <span id="dStreak" style="color:var(--primary-strong)">0</span> 天</b>
        <p class="muted mt-8">坚持，是成长最朴素的方式</p></div>
      </div>
      <div class="checkin-strip" id="dCheckin"></div>
      <button class="btn btn-primary btn-sm" id="dCheckinBtn">✅ 签到</button>
    </div>

    <div class="split-grid sg-chart">
      <div>
        <div class="section-head"><div><div class="section-title" style="font-size:20px">📈 近6个月成长足迹</div><div class="section-sub" style="margin-bottom:0">你的努力正在形成趋势</div></div></div>
        <div class="card" style="padding:22px"><div id="trendBox"></div></div>

        <div class="section-head mt-32"><div><div class="section-title" style="font-size:20px">🏅 人生徽章</div><div class="section-sub" style="margin-bottom:0">已解锁 ${badges.length} / ${ALL_BADGES.length}</div></div></div>
        <div class="grid grid-5" style="gap:12px">
          ${ALL_BADGES.map(b => {
            const got = earnedIds.has(b.id);
            return `<div class="card badge-card">
              <div class="bd-ic ${got ? '' : 'locked'}">${b.icon}</div>
              <b>${b.name}</b><span>${b.desc}</span>
              ${!got && badgeProgress(b.id, d) < 1 ? '<div style="height:4px;background:var(--bg);border-radius:100px;margin-top:6px;overflow:hidden"><div style="height:100%;width:' + Math.round(badgeProgress(b.id, d) * 100) + '%;background:linear-gradient(90deg,#ff8c42,#ffb45e)"></div></div>' : ''}
            </div>`;
          }).join('')}
        </div>

        <div class="section-head mt-32"><div><div class="section-title" style="font-size:20px">🧭 我的测评画像</div></div>
          <a class="btn btn-soft btn-sm" href="assessment.html">重新测评</a></div>
        ${r.assessment ? `
          <div class="card" style="padding:22px">
            <p style="font-size:14px;color:var(--text-2);line-height:1.8">${esc(r.assessment.personalityDesc)}</p>
            <div class="divider"></div>
            <div class="grid grid-2">
              <div><div class="muted mb-8">能力优势</div><b style="color:var(--primary-strong)">${esc(r.assessment.abilityDesc)}</b></div>
              <div><div class="muted mb-8">核心价值</div><b style="color:var(--teal)">${esc(r.assessment.valueDesc)}</b></div>
            </div>
          </div>` : `
          <div class="card empty" style="padding:34px"><div class="ic">🧭</div><h4>还没有测评画像</h4><p>完成四维测评，让AI更懂你。</p><a class="btn btn-primary btn-sm mt-8" href="assessment.html">开始测评</a></div>`}
      </div>

      <div>
        <div class="section-head"><div><div class="section-title" style="font-size:20px">👥 同龄人对比</div></div></div>
        <div class="card" style="padding:22px">
          <div id="benchBars"></div>
          <p class="muted mt-8">基于平台成长数据估算，仅供参考，不制造焦虑</p>
        </div>
        <div class="card mt-16" style="padding:22px">
          <h3 style="font-size:16px;color:var(--deep);margin-bottom:12px">📊 记录概览</h3>
          <div id="typeBars"></div>
        </div>
      </div>
    </div>`;

  if (r.growthIndex !== undefined) donutGauge(document.getElementById('gIndex'), { value: r.growthIndex, label: '', color: 'rgba(255,210,138,.95)', size: 64 });
  donutGauge(document.getElementById('gSkill'), { value: Math.min(100, d.skillPoints), label: '技能', color: '#ff8c42' });
  donutGauge(document.getElementById('gExp'), { value: Math.min(100, d.experience / 10), label: '经验', color: '#4aa3c2' });
  donutGauge(document.getElementById('gHappy'), { value: d.happiness, label: '幸福', color: '#2eaa8a' });
  donutGauge(document.getElementById('gGrowth'), { value: d.growthSpeed, label: '成长', color: '#7c6cf0' });
  trendLine(document.getElementById('trendBox'), d.monthly || [], { color: '#ff8c42' });

  const mine = [
    { label: '我的记录', value: Math.min(100, d.total * 5), color: '#ff8c42' },
    { label: '同龄平均', value: Math.min(100, d.benchmark.totalAvg * 5), color: '#9ca3af' }
  ];
  barList(document.getElementById('benchBars'), mine);
  const typeEntries = Object.entries(d.byType).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (typeEntries.length) {
    const max = Math.max(...typeEntries.map(e => e[1]));
    document.getElementById('typeBars').innerHTML = typeEntries.map(([t, n]) => `
      <div class="flex-between" style="font-size:13.5px;padding:5px 0">
        <span style="color:var(--text-2)">${esc(t)}</span>
        <div style="flex:1;margin:0 12px;height:8px;background:var(--bg);border-radius:100px;overflow:hidden">
          <div style="height:100%;width:${Math.round(n / max * 100)}%;background:linear-gradient(90deg,#ff8c42,#ffb45e);border-radius:100px"></div>
        </div>
        <b>${n}</b>
      </div>`).join('');
  } else {
    document.getElementById('typeBars').innerHTML = '<p class="muted">还没有记录，去时光轴留下第一个脚印吧。</p>';
  }

  // 签到
  const ck = r.checkin || { streak: 0, today: false, last30: [] };
  countUp(document.getElementById('dStreak'), ck.streak || 0, { duration: 800 });
  const days = [];
  const done = new Set(ck.last30 || []);
  for (let i = 6; i >= 0; i--) {
    const dd = new Date(); dd.setDate(dd.getDate() - i);
    const key = dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
    days.push({ key, label: '周' + '日一二三四五六'[dd.getDay()], done: done.has(key), today: i === 0 });
  }
  document.getElementById('dCheckin').innerHTML = days.map(x => `<div class="checkin-dot ${x.done ? 'done' : ''} ${x.today ? 'today' : ''}">${x.done ? '✓' : (x.today ? '今' : '')}<span>${x.label}</span></div>`).join('');
  const dBtn = document.getElementById('dCheckinBtn');
  dBtn.disabled = ck.today;
  dBtn.textContent = ck.today ? '✅ 今日已签到' : '✅ 签到';
  dBtn.addEventListener('click', async () => {
    const rr = await api.post('/api/checkin');
    toast('签到成功，连续 ' + rr.streak + ' 天！', 'success');
    if (rr.badges && rr.badges.length) badgeToast(rr.badges);
    load();
  });
}

// 资料编辑
document.getElementById('editProfileBtn').addEventListener('click', () => {
  document.getElementById('pfNick').value = user.nickname || '';
  document.getElementById('pfEdu').value = user.education || '高中';
  document.getElementById('pfCity').value = user.city || '';
  document.getElementById('pfTarget').value = user.target || '';
  document.getElementById('pfBio').value = user.bio || '';
  openModal('profileModal');
});
document.getElementById('pfSubmit').addEventListener('click', async () => {
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
    toast('资料已更新', 'success');
    if (r.badges && r.badges.length) badgeToast(r.badges);
    load();
  } catch (e) { toast(e.message, 'error'); }
});

if (user) load();
