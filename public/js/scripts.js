// 人生剧本库
import { bootstrap } from './common.js';
import { api } from './api.js';
import { esc, openModal } from './ui.js';

await bootstrap('careers');
const grid = document.getElementById('scriptGrid');
const r = await api.get('/api/scripts');

grid.innerHTML = r.items.map(s => `
  <div class="card script-card" onclick="showScript('${s.id}')" style="cursor:pointer">
    <div class="sc-av" style="background:${s.color}">🎬</div>
    <div>
      <h4>${esc(s.title)}</h4>
      <div class="sc-sub">${esc(s.subtitle)}</div>
      <p>${esc(s.insights[0])}</p>
      <div class="flex-wrap mt-8" style="display:flex;gap:6px;flex-wrap:wrap">
        ${s.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
      </div>
    </div>
  </div>`).join('');

window.showScript = async (id) => {
  const rr = await api.get('/api/scripts/' + id);
  const s = rr.script;
  document.getElementById('scriptBody').innerHTML = `
    <div class="flex" style="gap:14px;margin-bottom:14px">
      <div class="sc-av" style="background:${s.color};width:60px;height:60px;font-size:26px">🎬</div>
      <div>
        <h2 style="font-size:22px;font-weight:900;color:var(--deep)">${esc(s.title)}</h2>
        <div style="color:var(--text-2);font-size:14px">${esc(s.subtitle)}</div>
        <div class="flex-wrap mt-8" style="display:flex;gap:6px;flex-wrap:wrap">
          ${s.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
        </div>
      </div>
    </div>
    <div class="divider"></div>
    ${s.timeline.map((st, i) => `
      <div class="stage-line">
        <div class="sl-dot" style="background:${s.color}">${i + 1}</div>
        <div><div class="sl-stage">${esc(st.stage)}</div><div class="sl-text">${esc(st.text)}</div></div>
      </div>`).join('')}
    <div class="divider"></div>
    <div class="card" style="padding:18px;background:var(--purple-soft);border:0">
      <b style="color:#5b4bd8">🌓 平行人生：${esc(s.parallel.title)}</b>
      <p style="font-size:14px;color:var(--text);margin-top:8px">${esc(s.parallel.text)}</p>
    </div>
    <div class="mt-16">
      <b style="color:var(--deep)">💡 给你的启发</b>
      <ul style="margin-top:8px;list-style:none">
        ${s.insights.map(i => `<li style="font-size:14px;color:var(--text-2);padding:5px 0 5px 22px;position:relative">${esc(i)}<span style="position:absolute;left:2px;color:var(--primary)">✦</span></li>`).join('')}
      </ul>
    </div>`;
  openModal('scriptModal');
};

// 支持从首页 ?open=id 直达
const params = new URLSearchParams(location.search);
if (params.get('open')) window.showScript(params.get('open'));
