/* 人生模拟舱 · 应用入口（融入未来致远平台：多存档 / 测评画像 / 平台返回） */
(async function () {
  'use strict';

  let LIB = null;
  let state = null;

  async function bootstrap() {
    const q = new URLSearchParams(location.search);
    const runId = q.get('run') || null;
    const isNew = q.get('new') === '1';

    // 加载职业/专业/学校/省控线数据（统一数据源 /api/library）
    try {
      const res = await fetch('/api/library');
      LIB = await res.json();
    } catch (e) {
      console.error('加载图鉴数据失败', e);
      LIB = { careers: [], majors: [], schools: [], provinceLines: [] };
    }
    JEngine.setLib(LIB);

    // 登录用户 → 自动认领游客存档（如尚未认领）
    try { await JStore.claimGuestRuns(); } catch (e) {}

    // 测评画像：从未来致远平台拉取，用于初始化角色
    if (isNew || q.get('profile') === '1') {
      try {
        const tk = JStore.token();
        if (tk) {
          const r = await fetch('/api/assessments/latest', { headers: { 'Authorization': 'Bearer ' + tk } });
          const d = await r.json();
          if (d && d.assessment && d.assessment.result) JUI.setProfileSeed(d.assessment.result);
        }
      } catch (e) {}
    }

    if (runId) {
      state = await JStore.load(runId);
      JStore.setRunId(runId);
    } else if (isNew) {
      state = null;
    } else {
      // 无参数：尝试继续最近一个存档
      const runs = await JStore.listRuns();
      if (runs.length) {
        state = await JStore.load(runs[0].id);
      }
    }

    JUI.init(state, LIB);

    // 顶栏按钮
    $('btnLibrary').addEventListener('click', () => JUI.openLibrary());
    $('btnHelp').addEventListener('click', () => JUI.openHelp());
    $('btnRestart').addEventListener('click', () => JUI.restart());
    const bp = $('btnBackPlatform');
    if (bp) bp.addEventListener('click', async () => {
      if (state) await JStore.save(state);
      location.href = '/sim.html';
    });
    const chip = $('careerChip');
    if (chip) chip.addEventListener('click', () => changeCareer());
  }

  function $(id) { return document.getElementById(id); }

  function changeCareer() {
    if (!state) return;
    const deep = LIB.careers.filter(c => JContent.DEEP_CAREER_IDS.includes(c.id));
    const list = deep.map(c => {
      const rm = JContent.ROADMAPS[c.id] || {};
      const auto = JContent.AUTO_CAREER_IDS && JContent.AUTO_CAREER_IDS.includes(c.id);
      const active = state.careerId === c.id ? ' class="active"' : '';
      return '<div class="career-opt" data-id="' + c.id + '"' + active + '>' +
        '<div class="co-name">' + c.name + ' ' + (active ? '<span class="badge">当前</span>' : '<span class="badge">' + (auto ? 'AI 生成路线' : '深度路线') + '</span>') + '</div>' +
        '<div class="co-tag">' + c.category + ' · ' + c.salary + '</div>' +
        '<div class="co-sum">' + c.summary + '</div>' +
        '<div class="co-road">🗺️ ' + (rm.tagline || '') + '</div>' +
      '</div>';
    }).join('');
    JUI.openModal(`
      <h2>🎯 更换职业意向</h2>
      <p class="modal-sub">换职业会立即更新路线图，也会改变之后遇到的行业前辈和实习导师。选择后继续当前人生。</p>
      <div class="career-grid">${list}</div>`);
    document.querySelectorAll('#modalRoot .career-opt').forEach(el => el.addEventListener('click', () => {
      const id = el.dataset.id;
      if (id !== state.careerId) {
        state.careerId = id;
        const cc = JContent.CAREER_CAST[id] || {};
        const patch = (key, cfg) => {
          const ch = state.cast[key];
          if (ch && cfg) { ch.role = cfg.label || ch.role; ch.persona = cfg.persona || ch.persona; ch.gender = cfg.gender || ch.gender; ch.careerId = id; }
        };
        patch('guide', cc.guide);
        patch('senior', cc.senior);
        patch('mentor', cc.mentor);
        JStore.addMilestone(state, '职业意向更换为：' + ((LIB.careers.find(c => c.id === id) || {}).name));
        JStore.save(state);
      }
      JUI.closeModal();
      JUI.renderAll();
    }));
  }

  window.addEventListener('DOMContentLoaded', bootstrap);
})();
