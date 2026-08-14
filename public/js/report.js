// 年度人生报告
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, toast, memberGate } from './ui.js';
import { monthBars } from './charts.js';
import { reportShareImage, showShareModal } from './share-image.js';

const user = await bootstrap('timeline', { auth: true, redirect: 'index.html?login=1' });
const box = document.getElementById('reportBox');
const sel = document.getElementById('yearSel');

// 年份选择：当前年 ± 3
const nowY = new Date().getFullYear();
for (let y = nowY - 3; y <= nowY + 1; y++) {
  const o = document.createElement('option');
  o.value = y; o.textContent = y + ' 年';
  if (y === nowY) o.selected = true;
  sel.appendChild(o);
}

async function load() {
  const year = parseInt(sel.value, 10);
  box.innerHTML = '<div class="skeleton" style="height:320px;border-radius:24px"></div>';
  const r = await api.get('/api/report/' + year);
  if (r.locked) {
    box.innerHTML = `
      <div class="card" style="padding:48px;text-align:center">
        <div style="font-size:50px">📊</div>
        <h2 style="font-size:22px;color:var(--deep);margin:12px 0 8px">年度人生白皮书（会员专属）</h2>
        <p class="text-2" style="max-width:440px;margin:0 auto 20px">你已经记录了 <b>${r.report.total}</b> 条足迹。开通会员，解锁完整年度报告：月度走势、类型分布、高光时刻与 AI 寄语。</p>
        <button class="btn btn-primary btn-lg" id="unlockBtn">开通会员解锁</button>
      </div>`;
    document.getElementById('unlockBtn').addEventListener('click', () => memberGate({
      title: '解锁年度人生白皮书', desc: '会员可查看完整年度报告：月度走势、高光时刻与 AI 寄语。', user
    }));
    return;
  }
  const rep = r.report;
  const top = Object.entries(rep.byType).sort((a, b) => b[1] - a[1]);
  box.innerHTML = `
    <div class="report-cover">
      <div style="font-size:44px;margin-bottom:10px">🌅</div>
      <h2>${esc(rep.title)}</h2>
      <div class="rc-year">${year} · 成长评分 ${rep.score}/100</div>
      <div class="flex mt-16" style="justify-content:center;gap:8px;flex-wrap:wrap;position:relative;z-index:1">
        ${Object.entries(rep.byType).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `<span class="pill" style="background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);color:#ffd28a">#${esc(k)} × ${v}</span>`).join('') || '<span class="pill" style="background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);color:rgba(255,255,255,.7)"># 这一年，从记录开始</span>'}
      </div>
    </div>

    <div class="grid grid-3 mt-16" style="gap:14px">
      <div class="card" style="padding:20px;text-align:center"><div style="font-size:30px;font-weight:900;color:var(--primary-strong)">${rep.total}</div><div class="muted">条足迹</div></div>
      <div class="card" style="padding:20px;text-align:center"><div style="font-size:30px;font-weight:900;color:var(--accent)">${Object.keys(rep.byType).length}</div><div class="muted">种成长类型</div></div>
      <div class="card" style="padding:20px;text-align:center"><div style="font-size:30px;font-weight:900;color:var(--teal)">${rep.score}</div><div class="muted">成长评分</div></div>
    </div>

    <div class="card mt-16" style="padding:26px">
      <h3 style="color:var(--deep);margin-bottom:12px">📅 月度足迹分布</h3>
      <div id="monthChart"></div>
    </div>

    <div class="grid grid-2 mt-16" style="gap:16px">
      <div class="card" style="padding:26px">
        <h3 style="color:var(--deep);margin-bottom:12px">🧩 类型分布</h3>
        <div id="typeChart"></div>
      </div>
      <div class="card" style="padding:26px">
        <h3 style="color:var(--deep);margin-bottom:12px">✨ 年度高光时刻</h3>
        <div id="highlights"></div>
      </div>
    </div>

    <div class="card mt-16" style="padding:28px;background:linear-gradient(135deg,#fff1e6,#e6f4f9);border:0">
      <h3 style="color:var(--deep);margin-bottom:12px">💌 AI 写给你的一封信</h3>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${rep.words.map(w => `<p style="font-size:14.5px;color:var(--text);line-height:1.8">${esc(w)}</p>`).join('')}
      </div>
      <p style="font-size:13px;color:var(--text-3);margin-top:16px">—— 未来致远 · 你的每一步都算数</p>
    </div>

    <div class="text-center mt-24">
      <div class="flex" style="justify-content:center;gap:12px;flex-wrap:wrap">
        <button class="btn btn-primary btn-lg" id="shareReportBtn">🎉 生成朋友圈分享图</button>
        <button class="btn btn-ghost btn-lg" onclick="window.print()">🖨️ 打印报告</button>
      </div>
    </div>`;

  monthBars(document.getElementById('monthChart'), rep.months);
  document.getElementById('shareReportBtn').addEventListener('click', () => {
    const canvas = reportShareImage(rep, user);
    showShareModal(canvas, '年度人生报告-' + year + '.png');
  });
  const maxT = Math.max(1, ...top.map(e => e[1]));
  document.getElementById('typeChart').innerHTML = top.map(([t, n]) => `
    <div class="flex-between" style="font-size:13.5px;padding:5px 0">
      <span style="color:var(--text-2)">${esc(t)}</span>
      <div style="flex:1;margin:0 10px;height:9px;background:#f0ece6;border-radius:100px;overflow:hidden">
        <div style="height:100%;width:${Math.round(n / maxT * 100)}%;background:linear-gradient(90deg,#4aa3c2,#4caf9a);border-radius:100px"></div>
      </div>
      <b>${n}</b>
    </div>`).join('');
  document.getElementById('highlights').innerHTML = rep.highlights.map(h => `
    <div class="flex" style="gap:10px;padding:7px 0;border-bottom:1px dashed var(--line)">
      <span class="tag">${esc(fmtShort(h.date))}</span>
      <span style="font-size:14px;color:var(--text)">${esc(h.title)}</span>
    </div>`).join('') || '<p class="muted">这一年没有高光记录</p>';
}
function fmtShort(d) { return String(d).slice(0, 10); }

document.getElementById('genBtn').addEventListener('click', load);
if (user) load();
