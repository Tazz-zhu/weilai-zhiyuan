// 未来致远 · 种子数据：演示账号 + 社区内容
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import * as D from './db.js';
import { scoreAssessment } from './engine.js';

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
  const test = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return test.length === expected.length && timingSafeEqual(test, expected);
}

export function seedIfEmpty() {
  const count = D.db.prepare('SELECT COUNT(*) as n FROM users').get().n;
  if (count > 0) return { seeded: false, reason: '已有用户数据，跳过种子' };

  const t = D.now();

  // 管理员账号
  const adminPw = hashPassword('admin123');
  const admin = D.createUser({
    username: 'admin', password_hash: adminPw.hash, salt: adminPw.salt,
    nickname: '系统管理员', created_at: t
  });
  D.db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(admin.id);
  D.updateUser(admin.id, { bio: '后台管理员账号', city: '系统', education: '管理', target: '平台运营', avatar: 'shield' });

  // 演示会员账号
  const demoPw = hashPassword('demo123');
  const demo = D.createUser({
    username: 'demo', password_hash: demoPw.hash, salt: demoPw.salt,
    nickname: '致远同学', created_at: t
  });
  D.updateUser(demo.id, {
    bio: '刚高考完的准大一新生，正在探索"我想成为谁"。',
    education: '高中', city: '杭州', target: 'AI产品经理',
    avatar: 'sun'
  });
  D.setMemberUntil(demo.id, t + 365 * 86400000);
  // demo 的测评（偏 E+I，逻辑+组织，成长+地位）
  const demoAnswers = { i1: 1, i2: 3, i3: 3, i4: 2, i5: 1, i6: 0, i7: 0, i8: 3, p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, a1: 0, a2: 1, a3: 1, a4: 0, a5: 2, a6: 0, v1: 1, v2: 3, v3: 1, v4: 2, v5: 0, v6: 1 };
  D.saveAssessment(demo.id, demoAnswers, scoreAssessment(demoAnswers));

  // 演示成长账号（新晴）
  const xqPw = hashPassword('xinqing123');
  const xq = D.createUser({
    username: 'xinqing', password_hash: xqPw.hash, salt: xqPw.salt,
    nickname: '新晴', created_at: t
  });
  D.updateUser(xq.id, {
    bio: '大二在读，心理学爱好者，正在记录自己的成长。',
    education: '大学', city: '成都', target: '心理咨询师',
    avatar: 'leaf'
  });

  // 社区用户
  const mk = (u, pw, nick) => {
    const { salt, hash } = hashPassword(pw);
    return D.createUser({ username: u, password_hash: hash, salt, nickname: nick, created_at: t });
  };
  const u2 = mk('linxiaoman', '123456', '林小满');
  const u3 = mk('azhe', '123456', '阿哲');
  const u4 = mk('susu', '123456', '苏苏');
  for (const u of [u2, u3, u4]) D.updateUser(u.id, { avatar: u.id === u2.id ? 'star' : u.id === u3.id ? 'wave' : 'moon' });

  // 新晴的时光轴
  const evts = [
    ['2024-09-10', '学习', '进入大学', '报到心理学系，认识了一群有趣的同学。'],
    ['2024-10-15', '学习', '加入心理协会', '开始接触心理咨询的基础知识，特别着迷。'],
    ['2024-12-20', '获奖', '期末绩点专业前10%', '第一学期就拿了好成绩，给自己点个赞。'],
    ['2025-03-08', '实习', '心理热线志愿者', '第一次接热线，紧张到手心出汗，但帮到人很幸福。'],
    ['2025-06-01', '旅行', '一个人去了大理', '在洱海边想清楚了很多事，决定走心理咨询这条路。'],
    ['2025-09-15', '学习', '开始系统学习咨询技术', '报名了长程培训，正式踏上专业之路。'],
    ['2025-12-31', '获奖', '年度志愿服务之星', '一年接了200+小时热线，被评上服务之星。'],
    ['2026-03-20', '实习', '心理咨询机构见习', '跟着督导师做见习，第一次参与真实个案讨论。'],
    ['2026-05-10', '学习', '通过基础培训考核', '完成了120学时系统培训，离目标又近一步。'],
    ['2026-07-01', '创业', '发起校园心理互助小组', '和同学一起做校园心理互助，报名超预期。']
  ];
  for (const [date, type, title, desc] of evts) D.addTimelineEvent(xq.id, { date, type, title, description: desc });

  // 新晴的时光胶囊
  D.addCapsule(xq.id, { title: '写给毕业时的自己', content: '嗨，四年后的新晴：\n\n希望你已经拿到心理咨询相关的offer，正在做自己热爱的事。记得大二那个焦虑的夜晚吗？你已经走出来了，而且走得很好。\n\n永远保持好奇，永远温柔。', open_date: '2028-06-30' });
  D.addCapsule(xq.id, { title: '写给25岁的自己', content: '25岁的新晴：\n\n如果很累，就休息一下，你已经很棒了。记得去大理看一次海，像20岁那样。', open_date: '2031-01-01' });
  D.addCapsule(xq.id, { title: '给大一新生的自己', content: '嘿，我是大二的你。别慌，第一学期就算有点迷茫也很正常。去加入心理协会吧，你会遇到一群很棒的人。', open_date: '2025-06-01' });
  D.openCapsule(3, xq.id);

  // 新晴的测评
  const sample = { i1: 3, i2: 3, i3: 1, i4: 0, i5: 1, i6: 3, i7: 3, i8: 1, p1: 1, p2: 1, p3: 1, p4: 1, p5: 0, p6: 0, a1: 1, a2: 2, a3: 2, a4: 2, a5: 0, a6: 2, v1: 3, v2: 1, v3: 1, v4: 2, v5: 1, v6: 0 };
  D.saveAssessment(xq.id, sample, scoreAssessment(sample));

  // 徽章
  for (const bid of ['welcome', 'profile', 'explorer', 'recorder5', 'capsule1', 'capsule2', 'poster']) D.earnBadge(xq.id, bid);
  for (const bid of ['welcome', 'profile', 'member', 'explorer']) D.earnBadge(demo.id, bid);

  // 社区帖子
  const posts = [
    { user: u2.id, group: '升学规划', title: '新高考选科，物理还是历史？学长学姐帮帮我', content: '高一快结束了要选科，物理成绩中等偏上，但听说物理组竞争激烈；我挺喜欢历史和地理的，但又担心文科出路窄。有没有过来人聊聊？' },
    { user: u3.id, group: '职业探索', title: '实习三个月，我决定不做程序员了', content: '在互联网公司实习了三个月，代码写得还行，但发现自己更喜欢和人打交道、帮人解决问题。现在想转向产品或者咨询方向，会不会太晚？' },
    { user: u4.id, group: '考研留学', title: '双非一本，考研985到底值不值？', content: '纠结了很久：直接就业怕学历吃亏，考研又怕考不上白白浪费一年。想听听上岸的学长学姐的真实感受。' },
    { user: xq.id, group: '生涯困惑', title: '被"心理咨询不好就业"劝退过，但我还是想试试', content: '家里人都说心理学找不到工作，但我做热线志愿者的这半年，真真切切感受到自己在被需要。我想用四年时间证明：热爱+专业=值得。' },
    { user: u2.id, group: '职场成长', title: '25岁，想从银行辞职去做自己喜欢的事，求建议', content: '在银行干了两年，稳定但真的很不开心。想转去做内容/教育相关，存款能撑一年，大家觉得我该裸辞还是骑驴找马？' },
    { user: u3.id, group: '学习打卡', title: '30天读完《斯坦福大学人生设计课》Day 7', content: '第7天：重新定义了"重力问题"——有些问题不是用来解决的，是用来绕开的。做完了"人生罗盘"练习，发现自己的心流时刻都在"帮别人想清楚事情"上。' },
    { user: u4.id, group: '职业探索', title: '盘点一下：新兴职业里哪些是真的风口？', content: '整理了最近在看的职业方向：AI训练师、碳排放管理师、低空经济、银发经济……想听听大家对这些"新职业"怎么看，有没有已经在做的？' }
  ];
  for (const p of posts) D.addPost(p.user, { group_type: p.group, title: p.title, content: p.content });

  // 评论与点赞
  D.addComment(1, u3.id, '同为物理生，我选的时候也很纠结。后来选了物理，现在学自动化，其实选科不等于定终身，大学还能转。');
  D.addComment(1, u4.id, '建议先做霍兰德测评看看兴趣，再结合成绩做决定，别只看"出路窄不窄"。');
  D.addComment(2, xq.id, '一点都不晚！我认识好几个产品经理都是程序员转的，你的代码背景反而是优势。');
  D.addComment(2, u2.id, '能写代码又爱和人打交道，这简直是产品经理的完美组合。');
  D.toggleLike(1, xq.id); D.toggleLike(1, u3.id);
  D.toggleLike(2, u2.id); D.toggleLike(2, xq.id);
  D.toggleLike(3, u3.id);
  D.toggleLike(4, u2.id); D.toggleLike(4, u4.id);

  // 职业圈子种子帖子（career_id 关联职业）
  const circlePosts = [
    ['c001', u2.id, '产品经理', '产品新人求教：B端和C端产品，第一份工作怎么选？', '刚拿了两家offer：一家做B端SaaS，一家做C端工具。都说B端稳C端成长快，有没有过来人聊聊真实感受？'],
    ['c070', u3.id, '律师', '实习律师第一年：案源到底怎么来？', '实习期快结束了，师傅说"案源是律师的生命线"。想问问独立执业的同行，第一年是怎么熬过来的？'],
    ['c029', xq.id, '心理咨询师', '新手咨询师：督导频率多少合适？', '刚接个案三个月，每周一次督导。但费用真的不低，想问同行们督导频率和费用是怎么平衡的？'],
    ['c003', u4.id, '后端开发', '2026 年了，后端技术栈学什么好？', '马上毕业，主语言Java，要不要转Go？微服务、云原生、AI应用，感觉什么都想学，求过来人指点优先级。'],
    ['c035', u2.id, '中学教师', '编制教师和私立学校到底怎么选？', '同时拿到编制内中学和私立双语学校的offer，编制稳但收入低，私立收入高但压力大，纠结中。'],
    ['c027', u3.id, '临床医生', '规培第三年，想说说心里话', '值班第N个通宵，看着同期同学的收入，偶尔会怀疑当初的选择。但病人一句"谢谢医生"又觉得值了。'],
    ['c022', u4.id, '保险精算师', '精算师考试路线求指教', '准精算师考了三门，后面越来越难。有没有考过的前辈分享下备考节奏和资料？'],
    ['c042', xq.id, '新媒体运营', '小红书账号起号避坑指南（纯分享）', '做了三个账号，总结：垂直>追热点，真诚>套路。附我踩过的五个坑，欢迎交流。'],
    ['c054', u3.id, '芯片设计', '双非本，想转芯片验证来得及吗？', '目前在做嵌入式，想转数字验证。自学了SystemVerilog和UVM，但没有流片经验，企业会要吗？'],
    ['c094', u4.id, '碳排放管理师', '碳管理师证书到底值不值得考？', '市面上证书五花八门，考了就能上岗吗？还是应该先积累双碳项目经验？'],
    ['c037', xq.id, '生涯规划师', '生涯规划师从业两年，回答大家的问题', '从兼职做到全职，服务了300+客户。关于入行门槛、获客、证书，知无不言。'],
    ['c089', u2.id, '宠物医生', '宠物医院上班的日常：劝退还是真香？', '在小动物医院干了两年，说说真实的一天：累是真的，治愈也是真的。'],
    ['c140', u3.id, '养老护理师', '养老行业新人，讲讲真实感受', '入行半年，很多人问我"年纪轻轻为什么做养老"。我想说：这个行业比想象中更需要年轻人。'],
    ['c016', u4.id, 'AI产品经理', 'AI产品经理需要会写代码吗？', '会Prompt、懂模型能力边界，但不会写代码。面试被问"你懂技术吗"，想听听大家的看法。'],
    ['c136', xq.id, '宠物美容师', '宠物美容师入行三个月体验', '从零培训到独立接单，聊聊天价洗护、难缠客户和那些治愈瞬间。']
  ];
  for (const [cid, uid, name, title, content] of circlePosts) {
    const pid = D.addPost(uid, { group_type: '职业圈子', title, content, career_id: cid });
    // 给部分帖子加互动
    if (pid % 3 === 0) {
      D.toggleLike(pid, pid % 2 === 0 ? xq.id : u4.id);
      D.addComment(pid, pid % 2 === 0 ? u4.id : u2.id, '蹲一个后续，谢谢楼主分享！');
    }
  }

  return { seeded: true, users: 5 };
}
