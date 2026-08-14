// 未来致远 · 端到端冒烟测试（Playwright）
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
  results.push({ name, pass: !!cond, extra });
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (extra ? ' - ' + extra : ''));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e).slice(0, 300)));
page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text().slice(0, 200)); });

async function shot(name) {
  await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true });
}

// 1. 首页
await page.goto(BASE + '/index.html');
await page.waitForTimeout(1200);
ok('home-load', await page.locator('h1').first().isVisible());
ok('home-stats', (await page.locator('#heroStats .hs-num').first().textContent()) !== '...');
ok('home-hotjobs', await page.locator('#hotJobs .job-card').count() >= 4);
ok('home-scripts', await page.locator('#scriptList .script-card').count() >= 2);
ok('home-posts', await page.locator('#postList .post-card').count() >= 2);
ok('home-gaokao', await page.locator('.gaokao-banner').count() === 1);
await shot('01-home');

// 1.5 P0：游客测评不丢数据
await page.goto(BASE + '/assessment.html');
await page.waitForTimeout(1200);
await page.click('#startBtn');
await page.waitForTimeout(300);
for (let i = 0; i < 26; i++) { await page.locator('.quiz-opt').first().click(); await page.waitForTimeout(40); }
await page.waitForTimeout(1300);
const guestModal = await page.locator('#loginModal.show').count();
const draftSaved = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('zy_assess_draft') || 'null'); return !!(d && d.done === true && d.answers && Object.keys(d.answers).length >= 20); });
ok('guest-assess-modal', guestModal === 1);
ok('guest-assess-draft', draftSaved === true);
await page.click('#regTab');
await page.waitForTimeout(200);
const gname = 'guest_' + Date.now().toString().slice(-6);
await page.fill('#regNick', '游客体验');
await page.fill('#regUser', gname);
await page.fill('#regPass', 'test123456');
await page.click('#regBtn');
await page.waitForTimeout(2600);
ok('guest-assess-result', await page.locator('text=你的测评画像').count() === 1);
ok('guest-assess-cleared', await page.evaluate(() => !localStorage.getItem('zy_assess_draft')));
// 登出，回到未登录状态
await page.evaluate(() => { localStorage.removeItem('zy_token'); localStorage.removeItem('zy_user'); });
await page.goto(BASE + '/index.html');
await page.waitForTimeout(900);

// 2. 注册
await page.click('#navRegBtn');
await page.waitForTimeout(300);
const uname = 'e2e_' + Date.now().toString().slice(-6);
await page.fill('#regNick', 'E2E测试员');
await page.fill('#regUser', uname);
await page.fill('#regPass', 'test123456');
await page.click('#regBtn');
await page.waitForTimeout(1200);
ok('register-login', await page.locator('#userChip').isVisible());
const token = await page.evaluate(() => localStorage.getItem('zy_token'));
ok('got-token', !!token);
await page.goto(BASE + '/index.html');
await page.waitForTimeout(1200);
ok('nav-bell', await page.locator('#bellBtn').count() === 1);
await page.click('#themeBtn');
await page.waitForTimeout(300);
ok('dark-mode', await page.evaluate(() => document.documentElement.dataset.theme === 'dark'));
await page.click('#themeBtn');
ok('pwa-manifest', await page.evaluate(() => !!document.querySelector('link[rel="manifest"]')));
ok('nav-search', await page.locator('#navSearchInput').count() === 1);
await page.fill('#navSearchInput', '律师');
await page.waitForTimeout(700);
ok('search-suggest', await page.locator('.suggest-item').count() >= 1);
await page.fill('#navSearchInput', '');
await page.keyboard.press('Escape');
ok('nav-msg-btn', await page.locator('#msgBadge').count() === 1);
ok('home-personal-strip', await page.locator('#personalStrip .card').count() >= 1);
await shot('02-after-register');

// 3. 职业认知馆
await page.goto(BASE + '/careers.html');
await page.waitForTimeout(1000);
ok('careers-industry', await page.locator('.industry-card').count() >= 20);
await page.locator('.industry-card', { hasText: '金融与经济' }).click();
await page.waitForTimeout(1000);
ok('careers-filter', await page.locator('#jobGrid .job-card').count() > 0);
await page.goto(BASE + '/careers.html?q=律师');
await page.waitForTimeout(1200);
ok('careers-search', await page.locator('#jobGrid .job-card').count() >= 1);
await page.goto(BASE + '/explore.html');
await page.waitForTimeout(1200);
ok('explore-entries', await page.locator('#exploreEntries .module-card').count() === 3);
ok('circle-plaza', await page.locator('#plaza .circle-card').count() >= 1);
await page.goto(BASE + '/search.html?q=' + encodeURIComponent('产品经理'));
await page.waitForTimeout(1400);
ok('global-search', await page.locator('.search-result-row').count() >= 3);
await page.goto(BASE + '/search.html');
await page.waitForTimeout(1200);
ok('search-history', await page.locator('.search-result-row').count() >= 1);
await shot('03-careers');

// 4. 职业详情（免费锁定）
await page.goto(BASE + '/career.html?id=c001');
await page.waitForTimeout(1000);
ok('career-detail', await page.locator('h1').first().isVisible());
ok('career-fav-btn', await page.locator('#favBtn').count() === 1);
await page.click('#favBtn');
await page.waitForTimeout(600);
ok('career-fav-toggle', (await page.locator('#favBtn').textContent()).includes('已收藏'));
ok('career-radar', await page.locator('#radarBox svg').count() === 1);
ok('career-circle-btn', await page.locator('a[href*="community.html?career="]').count() >= 1);
ok('career-free-full', await page.locator('text=一天的vlog').count() === 1 && await page.locator('text=会员专属 · 职业一天').count() === 0);
await shot('04-career-detail-free');

// 5. 测评
await page.goto(BASE + '/assessment.html');
await page.waitForTimeout(800);
await page.click('#startBtn');
await page.waitForTimeout(300);
for (let i = 0; i < 26; i++) {
  await page.locator('.quiz-opt').first().click();
  await page.waitForTimeout(90);
}
await page.waitForTimeout(2500);
ok('assessment-result', await page.locator('text=你的测评画像').count() === 1);
ok('assessment-recs', await page.locator('#recList .rec-card').count() >= 3);
ok('assessment-print', await page.locator('#printReportBtn').count() === 1);
ok('assessment-hexagon', await page.locator('#hexBox svg').count() === 1);
await shot('05-assessment-result');

// 6. 规划师
await page.goto(BASE + '/planner.html');
await page.waitForTimeout(1200);
ok('planner-recs', await page.locator('.rec-card').count() >= 1);
await shot('06-planner');

const firstPath = page.locator('button[id^="pathBtn-"]').first();
if (await firstPath.count()) {
  await firstPath.click();
  await page.waitForTimeout(1500);
  ok('path-stages', await page.locator('.stage-card').count() >= 1);
  const mile = page.locator('.mile-check').first();
  if (await mile.count()) {
    await mile.click();
    await page.waitForTimeout(300);
    ok('mile-check', await mile.evaluate(el => el.classList.contains('on')));
  }
  await shot('07-path-detail');
}

// 7. 时光轴
await page.goto(BASE + '/timeline.html');
await page.waitForTimeout(1000);
await page.click('#addEventBtn');
await page.waitForTimeout(300);
await page.fill('#evTitle', 'E2E测试：完成端到端测试');
await page.fill('#evDesc', '这是自动化测试自动添加的记录');
await page.click('#evSubmit');
await page.waitForTimeout(1000);
ok('timeline-add', await page.locator('.tl-item', { hasText: 'E2E测试' }).count() === 1);
await page.click('#addEventBtn');
await page.waitForTimeout(500);
ok('goal-select', await page.locator('#evGoal').count() === 1);
await page.click('[data-close="eventModal"]');
await shot('08-timeline');

// 8.5 人生回忆录主页
await page.goto(BASE + '/memoir.html');
await page.waitForTimeout(1800);
ok('memoir-hero', await page.locator('text=的人生回忆录').count() === 1);
ok('memoir-cards', await page.locator('#memoirCards .module-card').count() === 3);
ok('memoir-heatmap', await page.locator('.heat-cell').count() === 12);
ok('growth-tree', await page.locator('text=我的成长树').count() === 1);
ok('weekly-card', await page.locator('#weeklyBox .card').count() >= 1 && await page.locator('#weeklyShareBtn').count() === 1);
ok('milestone-card', await page.locator('#milestoneBox .card').count() >= 3);
ok('goals-ui', await page.locator('#addGoalBtn').count() === 1 && await page.locator('#goalBox').count() === 1);
await page.goto(BASE + '/my.html');
await page.waitForTimeout(1600);
ok('my-tasks', await page.locator('#taskList .task-row').count() === 5);
ok('my-posts', await page.locator('#myPosts').count() === 1);
ok('invite-link', (await page.locator('#inviteLink').inputValue()).includes('invite='));
ok('achievement-btn', await page.locator('#achShareBtn').count() === 1);

// 8.6 私信聊天
const demoId = await page.evaluate(async (base) => {
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'demo', password: 'demo123' }) });
  const j = await r.json();
  return j.user.id;
}, BASE);
await page.goto(BASE + '/messages.html?to=' + demoId);
await page.waitForTimeout(1700);
ok('chat-page', await page.locator('#chatWindow').isVisible());
ok('msg-img-btn', await page.locator('#msgImgBtn').count() === 1 && await page.locator('#readAllMsg').count() === 1);
await page.fill('#chatMsgInput', 'E2E 测试私信');
await page.click('#chatSendBtn');
await page.waitForTimeout(1000);
ok('chat-send', await page.locator('.msg-row').count() >= 1);
await shot('08c-chat');
await shot('08b-memoir');

// 8. 时光胶囊
await page.goto(BASE + '/capsules.html');
await page.waitForTimeout(800);
await page.click('#newCapsuleBtn');
await page.waitForTimeout(300);
await page.fill('#cpTitle', 'E2E时光胶囊');
await page.fill('#cpContent', '给未来的E2E测试员：测试通过啦！');
await page.fill('#cpDate', '2035-01-01');
await page.click('#cpSubmit');
await page.waitForTimeout(1000);
ok('capsule-create', await page.locator('.capsule-card', { hasText: 'E2E时光胶囊' }).count() === 1);
await shot('09-capsules');

// 9. 社区
await page.goto(BASE + '/community.html');
await page.waitForTimeout(1000);
ok('community-posts', await page.locator('.post-card').count() >= 3);
ok('post-fav-btn', await page.locator('[data-favpost]').count() > 0);
ok('topic-card', await page.locator('#topicCard').isVisible());
ok('follow-btns', await page.locator('.follow-btn').count() > 0);
// 发带话题的帖子
await page.click('#newPostBtn');
await page.waitForTimeout(600);
await page.fill('#cpTitle', 'E2E 话题帖 #E2E话题');
await page.fill('#cpContent', '这是一条带话题的测试动态');
await page.click('#cpSubmit');
await page.waitForTimeout(1200);
ok('tag-post', await page.locator('.tag-link.chip', { hasText: '#E2E话题' }).count() >= 1);
await page.goto(BASE + '/community.html?tag=' + encodeURIComponent('E2E话题'));
await page.waitForTimeout(1500);
ok('tag-page', await page.locator('.post-card').count() >= 1);
await page.evaluate(async (base) => {
  const token = localStorage.getItem('zy_token');
  await fetch(base + '/api/community', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ group_type: '职业探索', title: 'E2E求助帖', content: '需要大家的帮助', post_type: 'ask' }) });
}, BASE);
await page.goto(BASE + '/community.html?type=ask');
await page.waitForTimeout(1500);
ok('type-filter', await page.locator('.post-card').count() >= 1);
await page.click('#newPostBtn');
await page.waitForTimeout(600);
ok('media-picker', await page.locator('#pickMediaBtn').count() === 1 && await page.locator('#cpMedia').count() === 1);
await page.click('[data-close="composeModal"]');
await page.waitForTimeout(400);
await page.goto(BASE + '/community.html');
await page.waitForTimeout(1200);
await page.waitForTimeout(300);
await page.locator('.post-card').first().click();
await page.waitForTimeout(800);
await page.fill('#commentInput', 'E2E自动测试评论');
await page.click('#commentBtn');
await page.waitForTimeout(1000);
ok('comment-add', await page.locator('#commentList', { hasText: 'E2E自动测试评论' }).count() === 1);
ok('report-btn', await page.locator('#reportPostBtn').count() === 1);
ok('post-share-btn', await page.locator('#sharePostBtn').count() === 1);
await page.goto(BASE + '/user.html?u=3');
await page.waitForTimeout(1500);
ok('user-profile', await page.locator('#profileHero b').count() >= 1 && await page.locator('#pEvents').count() === 1);
await shot('10-community');

// 10.5 职业圈子（行业 → 职业 → 圈子帖子流）
await page.goto(BASE + '/community.html');
await page.waitForTimeout(1000);
await page.locator('#modeBar [data-mode="circles"]').click();
await page.waitForTimeout(1200);
ok('circles-industry', await page.locator('.circle-industry').count() >= 20);
await page.locator('.circle-industry', { hasText: '政法与公共服务' }).click();
await page.waitForTimeout(1000);
await page.locator('.circle-card', { hasText: '律师' }).click();
await page.waitForTimeout(1200);
ok('circle-detail', await page.locator('#circleDetail .post-card').count() >= 1);
ok('circle-career-tag', await page.locator('#circleDetail .post-card .tag.purple', { hasText: '律师 圈子' }).count() >= 1);
await page.locator('#circlePosts [data-comments]').first().click();
await page.waitForTimeout(1300);
ok('inline-comments', await page.evaluate(() => document.querySelectorAll('#circlePosts .inline-comments').length === 1));
await page.locator('#circleSortBar [data-sort="new"]').click();
await page.waitForTimeout(900);
ok('circle-sort', await page.locator('#circlePosts .post-card').count() >= 1);
await shot('10b-community-circle');

// 签到（API）
const checkinRes = await page.evaluate(async () => {
  const r = await fetch('/api/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('zy_token') } });
  return r.json();
});
ok('checkin-api', checkinRes.streak >= 1 && checkinRes.today === true);
// 11. 职业详情（商业化暂缓，全量开放）
await page.goto(BASE + '/career.html?id=c001');
await page.waitForTimeout(1000);
ok('career-full-content', (await page.locator('text=会员专属 · 职业一天').count()) === 0 && (await page.locator('text=一天的vlog').count()) === 1);
ok('career-salarybar', await page.locator('#salaryBarBox .bar-track').count() === 1);
ok('career-rings', await page.locator('#demandRing svg').count() === 1 && await page.locator('#aiRing svg').count() === 1);
await shot('12-career-member');

// 12. 会员完整路径
await page.goto(BASE + '/planner.html');
await page.waitForTimeout(1200);
await page.locator('button[id^="pathBtn-"]').first().click();
await page.waitForTimeout(1500);
ok('path-planBC-member', await page.locator('text=Plan B').count() === 1 && await page.locator('text=Plan C').count() === 1);
await shot('13-path-member');

// 13. 升学档案 + 志愿推荐
await page.goto(BASE + '/profile.html');
await page.waitForTimeout(1200);
await page.fill('#pfScore', '598');
await page.locator('.sel-chip[data-subj="物理"]').click();
await page.locator('.sel-chip[data-subj="化学"]').click();
await page.locator('#cityChips .sel-chip', { hasText: '杭州' }).click();
await page.locator('#majorChips .sel-chip', { hasText: '计算机' }).click();
await page.click('#recommendBtn');
await page.waitForTimeout(2200);
ok('profile-recommend-bands', await page.locator('.band-table-block').count() === 3);
ok('profile-recommend-rows', await page.locator('.rec-table tbody tr').count() >= 6);
ok('volunteer-list-btn', await page.locator('[data-fav]').count() > 0);
ok('profile-recommend-analysis', await page.locator('.card', { hasText: '分数定位' }).count() === 1);
await shot('13-profile-recommend');

// 14. 仪表盘
await page.goto(BASE + '/dashboard.html');
await page.waitForTimeout(1200);
ok('dashboard-charts', await page.locator('svg').count() >= 3);
ok('growth-index', await page.locator('#gIndex svg').count() === 1);
ok('dashboard-badges', await page.locator('.badge-card').count() >= 5);
ok('badge-progress', await page.locator('.badge-card div[style*="height:4px"]').count() >= 1);
ok('dashboard-trend', await page.locator('#trendBox svg').count() === 1);
ok('dashboard-checkin', await page.locator('#dCheckin .checkin-dot').count() === 7);
await shot('14-dashboard');

// 14. 年度报告
await page.goto(BASE + '/report.html');
await page.waitForTimeout(1500);
ok('report-render', await page.locator('.report-cover').count() === 1);
await page.click('#shareReportBtn');
await page.waitForTimeout(800);
ok('report-share', await page.locator('#sharePreview').count() === 1);
await page.click('#shareClose');
await page.goto(BASE + '/policy.html');
await page.waitForTimeout(1200);
ok('policy-page', await page.locator('text=隐私政策').count() >= 1);

await shot('15-report');

// 15.5 管理后台
await page.goto(BASE + '/admin.html');
await page.waitForTimeout(1000);
await page.fill('#admUser', 'admin');
await page.fill('#admPass', 'admin123');
await page.click('#admLoginBtn');
await page.waitForTimeout(1600);
ok('admin-dashboard', await page.locator('.stat-card').count() >= 10);
ok('admin-ops', await page.locator('text=运营指标').count() === 1);
ok('admin-announce', await page.locator('#annSend').count() === 1);
ok('admin-nav', await page.locator('.admin-nav-item').count() === 6);
await page.locator('.admin-nav-item', { hasText: '用户管理' }).click();
await page.waitForTimeout(1200);
ok('admin-users', await page.locator('#admUserTable tbody tr').count() > 0);
await page.locator('#admUserTable [data-act="detail"]').first().click();
await page.waitForTimeout(1000);
ok('admin-user-detail', await page.evaluate(() => { const m = document.querySelector('.modal-mask.show'); return !!(m && m.textContent.includes('用户详情') && m.textContent.includes('帖子')); }));
await page.locator('.modal-mask.show .modal-close').click();
await page.locator('.admin-nav-item', { hasText: '帖子管理' }).click();
await page.waitForTimeout(1200);
ok('admin-posts', await page.locator('#admPostTable tbody tr').count() > 0);
ok('admin-essence', await page.locator('#admPostTable [data-e]').count() > 0);
await page.locator('.admin-nav-item', { hasText: '举报管理' }).click();
await page.waitForTimeout(1000);
ok('admin-reports', await page.locator('#admReportTable').count() === 1);
await page.locator('.admin-nav-item', { hasText: '内容管理' }).click();
await page.waitForTimeout(2200);
ok('admin-content', await page.locator('#contentTable tbody tr').count() > 0);
await shot('16-admin-dashboard');

// 15.6 移动端底部导航
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + '/index.html');
await page.waitForTimeout(1200);
ok('mobile-tabbar', await page.locator('.mob-tabbar').isVisible() && await page.locator('.mob-tabbar a').count() === 6);

// 汇总
const fails = results.filter(r => !r.pass);
console.log('\n===== SUMMARY =====');
console.log('PASS: ' + (results.length - fails.length) + ' / ' + results.length);
console.log('JS errors: ' + pageErrors.length);
if (pageErrors.length) console.log('JS errors detail: ' + pageErrors.join(' | ').slice(0, 1500));
if (fails.length) fails.forEach(f => console.log('  FAIL: ' + f.name + (f.extra ? ' - ' + f.extra : '')));
await browser.close();
process.exit(fails.length > 0 || pageErrors.length > 0 ? 1 : 0);
