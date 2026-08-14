// 人生模拟舱 · 浏览器冒烟测试（Playwright / 系统 Chromium）
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, 'data', 'shots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

const require = createRequire('C:\\Users\\Tazz1\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright\\package.json');
const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:4173';
const results = [];
function ok(name, cond, extra = '') {
  results.push({ name, pass: !!cond });
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (extra ? ' - ' + extra : ''));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e).slice(0, 300)));

// 1. 启动器
await page.goto(BASE + '/sim.html');
await page.waitForTimeout(1500);
ok('launcher-title', await page.locator('text=人生模拟舱').first().isVisible());
ok('launcher-new-btn', await page.locator('#btnNewRun').isVisible());
ok('launcher-careers', await page.locator('#careerGrid .card').count() >= 28);
ok('launcher-empty-state', await page.locator('#runsBox .empty').count() === 1);
await page.screenshot({ path: path.join(SHOTS, 'sim-01-launcher.png'), fullPage: false });

// 2. 从启动器进入新游戏
await page.click('#btnNewRun');
await page.waitForTimeout(2000);
ok('game-wizard', await page.locator('#modalRoot h2', { hasText: '创建你的高中生' }).count() === 1);
await page.fill('#ngName', '小测');
await page.click('#btnNg1');
await page.waitForTimeout(400);
ok('wizard-family', await page.locator('#modalRoot h2', { hasText: '填写家庭信息' }).count() === 1);
await page.click('#btnNg2');
await page.waitForTimeout(400);
ok('wizard-talent', await page.locator('#modalRoot h2', { hasText: '开局天赋' }).count() === 1);
// 选第一个天赋
await page.locator('#modalRoot [data-t]').first().click();
await page.waitForTimeout(400);
// 未登录无测评画像 → 走 4 题问卷 → 进入职业选择
for (let qi = 0; qi < 6; qi++) {
  const quizOpen = await page.locator('#modalRoot h2', { hasText: '了解自己' }).count();
  if (!quizOpen) break;
  await page.locator('#modalRoot .option').first().click();
  await page.waitForTimeout(250);
}
ok('wizard-career', await page.locator('#modalRoot h2', { hasText: '选择你的职业意向' }).count() === 1);
const careerCards = await page.locator('#modalRoot .career-opt').count();
ok('wizard-career-32', careerCards >= 28, 'cards=' + careerCards);
await page.screenshot({ path: path.join(SHOTS, 'sim-02-wizard-career.png'), fullPage: false });

// 3. 选职业 → 开始游戏
await page.locator('#modalRoot .career-opt').first().click();
await page.waitForTimeout(2500);
ok('game-scene', await page.locator('#sceneWrap').isVisible());
ok('game-topbar', await page.locator('#topbar').isVisible());
ok('game-roadmap', await page.locator('#roadmapPanel').isVisible());
ok('game-created-run', await page.evaluate(() => !!localStorage.getItem('msrl_guest')));
await page.screenshot({ path: path.join(SHOTS, 'sim-03-game.png'), fullPage: false });

// 3.5 第一步剧情弹窗可推进
ok('game-story-modal', await page.locator('#modalRoot .modal h2', { hasText: '开学报到' }).count() === 1);
// 关闭剧情弹窗（回到自由场景），模拟用户手动关掉后返回
await page.evaluate(() => { try { JUI.closeModal(); } catch (e) {} });
await page.waitForTimeout(400);

// 4. 返回平台启动器 → 应能看到存档
await page.evaluate(() => { const b = document.getElementById('btnBackPlatform'); if (b) b.click(); });
await page.waitForTimeout(2500);
await page.waitForTimeout(2000);
ok('launcher-run-exists', await page.locator('#runsBox .card').count() >= 1);
await page.screenshot({ path: path.join(SHOTS, 'sim-04-with-run.png'), fullPage: false });

// 5. 继续该存档
await page.locator('#runsBox a.btn-primary').first().click();
await page.waitForTimeout(2500);
ok('game-resume', await page.locator('#sceneWrap').isVisible() && await page.locator('#topbar').isVisible());

// 6. 通关报告弹窗（通过 API 造一个已通关存档）
const guest = await page.evaluate(() => localStorage.getItem('msrl_guest'));
const state2 = {
  prot: { name: '小测', gender: '男', family: '工薪家庭', province: '广东', holland: ['E', 'S'], personality: '', traits: [] },
  careerId: 'c003', stageIndex: 7, stepIndex: 0, stageDone: ['s1','s2','s3','s4','s5','s6','s7'],
  flags: {}, attrs: { study: 70, ability: 65, social: 60, mood: 70, health: 70, money: 60 },
  milestones: [], cast: {}, castOrder: [], intimacy: {}, memories: {}, loverKey: null,
  roadmapDone: ['拿到第一份工作 offer'], ending: { offer: '初级后端开发', company: '中型互联网公司', salary: '16K/月 起', match: 88, tier: 'mid' },
  freePoints: 0, extraEvents: {}, attrsHistory: []
};
const cr = await page.evaluate(async (st) => {
  const r = await fetch('/api/sim/runs', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Guest-Id': localStorage.getItem('msrl_guest') }, body: JSON.stringify({ name: '通关测试', career_id: 'c003', state: st }) });
  return (await r.json()).id;
}, state2);
await page.goto(BASE + '/sim.html');
await page.waitForTimeout(2000);
await page.locator('[data-report="' + cr + '"]').click();
await page.waitForTimeout(1500);
ok('report-modal', await page.locator('#simReportModal.show').count() === 1);
ok('report-compare', await page.locator('#simReportModal', { hasText: '现实的我' }).count() === 1 && await page.locator('#simReportModal', { hasText: '平行的我' }).count() === 1);
ok('report-poster', await page.locator('#simReportModal canvas#simPoster').count() === 1);
ok('report-publish-btn', await page.locator('#simReportModal #pubPoster').count() === 1);
await page.screenshot({ path: path.join(SHOTS, 'sim-05-report.png'), fullPage: false });
// 清理测试存档
await page.evaluate(async (id) => {
  await fetch('/api/sim/runs/' + id, { method: 'DELETE', headers: { 'X-Guest-Id': localStorage.getItem('msrl_guest') } });
}, cr);

const fails = results.filter(r => !r.pass);
console.log('\n===== SIM SUMMARY =====');
console.log('PASS: ' + (results.length - fails.length) + ' / ' + results.length);
console.log('JS errors: ' + pageErrors.length);
if (pageErrors.length) console.log(pageErrors.join(' | ').slice(0, 1200));
await browser.close();
process.exit(fails.length > 0 || pageErrors.length > 0 ? 1 : 0);