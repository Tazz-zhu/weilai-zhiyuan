/* 我的模拟人生路 v2 · 对话生成：模板引擎（默认） + 可选大模型增强 */
window.JDialogue = (() => {
  'use strict';

  let llmEnabled = false;
  let llmModel = '';

  async function checkLlm() {
    try {
      const res = await fetch('/api/llm/config', { cache: 'no-store' });
      const d = await res.json();
      llmEnabled = !!d.enabled;
      llmModel = d.model || '';
      return { enabled: llmEnabled, model: llmModel };
    } catch (e) { llmEnabled = false; return { enabled: false }; }
  }

  function charDesc(s, key) {
    const ch = s.cast[key];
    if (!ch) return null;
    const career = JEngine.careerOf(s);
    const rm = JEngine.roadmapOf(s);
    const mem = (s.memories[key] || []).slice(-4).join('\n');
    const stage = JEngine.stageOf(s);
    const allowed = (ch.topics || []).filter(t => t !== 'greet').join('、');
    return {
      ch,
      system: [
        '你是「我的模拟人生路」中的角色「' + ch.name + '」，' + (ch.role || '角色') + '。',
        '人设：' + (ch.persona || '普通人'),
        '当前人生阶段：' + (stage ? stage.name : '未知'),
        '主角：' + s.prot.name + '（' + s.prot.gender + '，家庭：' + s.prot.family + '）',
        '主角的职业意向：' + (career ? career.name : '未定'),
        (career ? '你可以聊的职业信息：' + career.name + ' —— ' + career.summary + '。真实日常：' + career.day.slice(0, 120) + '。职业真相：' + career.truth.slice(0, 120) : ''),
        (rm ? '职业路线提示：' + rm.hsFocus.slice(0, 120) : ''),
        '【重要】你只能聊这些话题：' + (allowed || '打招呼') + '。如果对方问的话题不在范围内，请礼貌地表示不擅长并引导回这些话题。',
        (mem ? '你记得的最近对话：' + mem : ''),
        '请用中文回答，口语化、符合人设，2-4 句话，不要说教。',
        '【动作】回复开头可带一个（动作）描述来表演情绪，例如：（翻了个白眼）（低头笑了笑）（托腮想了想）（叹了口气）（眼睛一亮）。动作要贴合人设与当前情绪，不要每次都用同一个。'
      ].join('\n')
    };
  }

  async function ask(s, key, userText) {
    const info = charDesc(s, key);
    if (!info) return JEngine.replyFor(s, key, userText);
    if (!llmEnabled) return JEngine.replyFor(s, key, userText);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          system: info.system,
          messages: [{ role: 'user', content: userText }],
          maxTokens: 160
        })
      });
      clearTimeout(timer);
      const d = await res.json();
      if (d && d.text) {
        JStore.addMemory(s, key, userText.slice(0, 60));
        JStore.addIntimacy(s, key, 1);
        JStore.save(s);
        return { text: d.text, llm: true, allowed: info.ch.topics };
      }
      return JEngine.replyFor(s, key, userText);
    } catch (e) {
      return JEngine.replyFor(s, key, userText);
    }
  }

  return { checkLlm, ask, charDesc };
})();
