/* 我的模拟人生路 · 功能数据（扩充版）：成就 / 天赋 / 随机事件 / 支线 / 朋友圈 / 好感剧情 / 多结局 */
window.JFeaturesData = (() => {
  'use strict';

  /* ---------- 成就（30 枚） ---------- */
  const ACHIEVEMENTS = [
    { id: 'ach_start', icon: '🎒', name: '新的开始', desc: '完成高一入学阶段', cond: s => (s.stageDone || []).includes('s1') },
    { id: 'ach_subject', icon: '🧭', name: '选科达人', desc: '按目标职业路线完成选科', cond: s => !!(s.flags || {}).roadmap_subjects },
    { id: 'ach_competition', icon: '🏅', name: '竞赛之星', desc: '大二参加专业竞赛/考证/科研', cond: s => !!((s.flags || {}).competition || (s.flags || {}).certificate || (s.flags || {}).research) },
    { id: 'ach_scholar', icon: '🎓', name: '奖学金候选人', desc: '学业达到 80 以上', cond: s => (s.attrs || {}).study >= 80 },
    { id: 'ach_intern', icon: '💼', name: '实习小将', desc: '完成一次实习', cond: s => (s.roadmapDone || []).includes('完成实习') },
    { id: 'ach_love', icon: '💛', name: '心动时刻', desc: '在大学谈了一场恋爱', cond: s => !!(s.flags || {}).love_yes },
    { id: 'ach_grad', icon: '🎉', name: '上岸', desc: '考研/保研成功', cond: s => !!(s.flags || {}).gradPass },
    { id: 'ach_phd', icon: '🔬', name: '学术之巅', desc: '走上读博之路', cond: s => !!(s.flags || {}).path_phd },
    { id: 'ach_offer', icon: '📮', name: '第一份工作', desc: '拿到人生第一份 offer', cond: s => !!s.ending },
    { id: 'ach_social', icon: '🤝', name: '人脉王', desc: '人脉达到 80 以上', cond: s => (s.attrs || {}).social >= 80 },
    { id: 'ach_balance', icon: '🌿', name: '劳逸结合', desc: '健康与心态同时达到 70', cond: s => (s.attrs || {}).health >= 70 && (s.attrs || {}).mood >= 70 },
    { id: 'ach_family', icon: '🏠', name: '家的港湾', desc: '和爸爸妈妈都聊过 3 次以上', cond: s => JStore.intimacy(s, 'father') >= 30 && JStore.intimacy(s, 'mother') >= 30 },
    { id: 'ach_kind', icon: '💝', name: '热心肠', desc: '帮助了一位路人 NPC', cond: s => !!(s.flags || {}).folk_quest_done },
    { id: 'ach_full', icon: '🌟', name: '完整人生', desc: '走完高中到第一份工作的全程', cond: s => !!s.ending && (s.stageDone || []).length >= 7 },
    { id: 'ach_win', icon: '🏆', name: '一战成名', desc: '竞赛获奖且能力达到 70', cond: s => !!(s.flags || {}).competition && (s.attrs || {}).ability >= 70 },
    { id: 'ach_persist', icon: '💪', name: '自律者', desc: '高三晚自习坚持先做完题', cond: s => !!(s.flags || {}).self_discipline },
    { id: 'ach_summer', icon: '🏖️', name: '暑假弯道超车', desc: '高三前的暑假按计划刷题', cond: s => !!(s.flags || {}).summer_study },
    { id: 'ach_brave', icon: '🗣️', name: '勇敢表达', desc: '高考前把压力说给妈妈听', cond: s => !!(s.flags || {}).gaokao_say },
    { id: 'ach_insist', icon: '🧭', name: '坚持自我', desc: '在家庭分歧中坚持自己的路', cond: s => !!(s.flags || {}).fam_insist || !!(s.flags || {}).insist_career },
    { id: 'ach_save', icon: '💰', name: '理财能手', desc: '选择省吃俭用或兼职自立', cond: s => !!(s.flags || {}).save_money || !!(s.flags || {}).parttime },
    { id: 'ach_adjust', icon: '🌀', name: '逆风翻盘', desc: '考研失利后调剂上岸或二战成功', cond: s => !!(s.flags || {}).grad_adjust || !!(s.flags || {}).gradRetry },
    { id: 'ach_collector', icon: '📦', name: '拾荒者', desc: '拾取过 8 个地图小物件', cond: s => (s.pickupTotal || 0) >= 8 },
    { id: 'ach_phone', icon: '📱', name: '网络达人', desc: '点赞或评论朋友圈 3 次', cond: s => ((s.feedLiked || []).length + (s.feedComments || []).length) >= 3 },
    { id: 'ach_free', icon: '⏰', name: '时间管理大师', desc: '使用自由活动 6 次', cond: s => (s.freeUsed || 0) >= 6 },
    { id: 'ach_uni', icon: '🎓', name: '大学霸', desc: '学业达到 85 以上', cond: s => (s.attrs || {}).study >= 85 },
    { id: 'ach_friend', icon: '👬', name: '挚友', desc: '和同桌或室友的好感达到 70', cond: s => JStore.intimacy(s, 'deskmate') >= 70 || JStore.intimacy(s, 'roommate') >= 70 },
    { id: 'ach_lover2', icon: '💍', name: '细水长流', desc: '恋爱并一起走到毕业季', cond: s => !!(s.flags || {}).love_yes && (s.stageDone || []).includes('s8') },
    { id: 'ach_dream', icon: '🌠', name: '梦想成真', desc: '职业匹配度达到 90 以上', cond: s => !!(s.ending && s.ending.match >= 90) },
    { id: 'ach_underdog', icon: '🚀', name: '逆袭之路', desc: '从普通开局（学业<55）一路拿到 offer', cond: s => !!s.ending && (s.attrsHistory || [])[0] && (s.attrsHistory || [])[0].study < 55 },
    { id: 'ach_multi', icon: '♾️', name: '人生玩家', desc: '解锁 3 个以上结局', cond: () => (JFeatures.readMeta().endings || []).length >= 3 }
  ];

  /* ---------- 天赋（12 个） ---------- */
  const TRAITS = [
    { id: 't_memory', icon: '🧠', name: '过目不忘', desc: '学业初始 +6，学习更轻松', fx: { study: 6 } },
    { id: 't_social', icon: '🗣️', name: '自来熟', desc: '人脉初始 +8，容易交到朋友', fx: { social: 8 } },
    { id: 't_body', icon: '💪', name: '铁打的身体', desc: '健康初始 +10，扛得住熬夜', fx: { health: 10 } },
    { id: 't_lucky', icon: '🍀', name: '锦鲤体质', desc: '更容易遇到好事，坏事减半', fx: { mood: 4 } },
    { id: 't_rich', icon: '💰', name: '含着金汤匙', desc: '财富初始 +15', fx: { money: 15 } },
    { id: 't_mind', icon: '🧘', name: '内心强大', desc: '心态初始 +8，压力事件减半', fx: { mood: 8 } },
    { id: 't_talent', icon: '✨', name: '天赋异禀', desc: '能力初始 +8', fx: { ability: 8 } },
    { id: 't_night', icon: '🌙', name: '夜猫子', desc: '深夜学习不掉心态（学业+2 心态+3）', fx: { study: 2, mood: 3 } },
    { id: 't_exam', icon: '🎯', name: '考试锦鲤', desc: '高考与考研成绩小幅加成', fx: { study: 3 } },
    { id: 't_speech', icon: '🎤', name: '能说会道', desc: '表达力强（人脉+4 能力+2）', fx: { social: 4, ability: 2 } },
    { id: 't_athlete', icon: '⚽', name: '运动健将', desc: '健康 +8，心态 +2', fx: { health: 8, mood: 2 } },
    { id: 't_money', icon: '🧮', name: '精打细算', desc: '财富 +8，更会过日子', fx: { money: 8 } }
  ];  /* ---------- 随机人生事件（26 个：厄运 / 幸运 / 中性） ---------- */
  const RANDOM_EVENTS = [
    // ===== 厄运 =====
    { id: 're_wallet', era: ['hs', 'uni'], good: 0,
      step: { type: 'choice', title: '路边的钱包', time: '中午', desc: '放学路上，你在地上捡到一个钱包，里面有一沓现金和一张学生证。', options: [
        { text: '送到失物招领处', fx: { mood: 2, social: 1 }, note: '失主找到你道谢，你心里特别踏实。', next: null },
        { text: '悄悄收下', fx: { money: 6, mood: -3 }, note: '钱到手了，但你一整天都心神不宁。', next: null }
      ], milestone: '一场关于良心的选择' } },
    { id: 're_cold', era: ['hs', 'uni', 'work'], good: 0,
      step: { type: 'text', title: '感冒了', time: '上午', desc: '换季降温，你昨晚没盖好被子，今天头重脚轻。硬撑着上完课，你觉得整个人都是飘的。', fx: { health: -3, mood: -2 }, milestone: '感冒的滋味' } },
    { id: 're_sleep', era: ['hs', 'uni'], good: 0,
      step: { type: 'text', title: '失眠的一夜', time: '晚上', desc: '白天想得太多，晚上翻来覆去睡不着。第二天顶着黑眼圈，效率低得可怕。', fx: { mood: -2, health: -1 }, milestone: '失眠之夜' } },
    { id: 're_rain', era: ['hs', 'uni', 'work'], good: 0,
      step: { type: 'text', title: '淋雨', time: '下午', desc: '出门没带伞，一场大雨把你淋了个透。回家打了三个喷嚏，你默默给自己倒了杯热水。', fx: { health: -2, mood: -1 }, milestone: '忘带伞的一天' } },
    { id: 're_phone', era: ['uni', 'work'], good: 0,
      step: { type: 'text', title: '手机丢了', time: '上午', desc: '手机不翼而飞。你翻遍书包和口袋，最后在教室/工位角落找到它——屏幕碎了，还欠了一堆未读消息。', fx: { mood: -3, social: -1 }, milestone: '手机劫难' } },
    { id: 're_examfail', era: ['hs', 'uni'], good: 0,
      step: { type: 'choice', title: '考砸了', time: '上午', desc: '这次重要考试你发挥失常，成绩比预期低了一大截。你盯着卷子，心里堵得慌。', options: [
        { text: '找老师复盘，把错题吃透', fx: { study: 1, mood: -1 }, note: '老师帮你分析了问题，你决定下次扳回来。', next: null },
        { text: '先缓缓，别给自己太大压力', fx: { mood: 2, study: -1 }, note: '你给自己放了个小假，但心里还是有点虚。', next: null }
      ], milestone: '考试失利' } },
    { id: 're_blame', era: ['hs', 'uni', 'work'], good: 0,
      step: { type: 'choice', title: '被冤枉了', time: '下午', desc: '一件不是你干的事，锅却扣到了你头上。大家看着你，等你给个说法。', options: [
        { text: '冷静解释，拿出证据', fx: { social: 2, mood: -1 }, note: '你讲清楚了来龙去脉，误会解开了。', next: null },
        { text: '懒得解释，清者自清', fx: { mood: -3, social: -1 }, note: '你选择沉默，但心里还是委屈。', next: null }
      ], milestone: '被误解的时刻' } },
    { id: 're_bike', era: ['hs', 'uni'], good: 0,
      step: { type: 'text', title: '自行车坏了', time: '早上', desc: '出门发现自行车链子掉了，修了半天。赶到时已经迟到，老师在门口看了你一眼。', fx: { health: -1, mood: -1 }, milestone: '倒霉的早晨' } },
    { id: 're_stolen', era: ['uni', 'work'], good: 0,
      step: { type: 'text', title: '钱包被偷', time: '中午', desc: '人挤人的食堂/地铁里，你摸了一下口袋——钱包没了。你站在原地愣了三秒。', fx: { money: -5, mood: -3 }, milestone: '破财' } },
    { id: 're_hang', era: ['uni'], good: 0,
      step: { type: 'choice', title: '挂科危机', time: '上午', desc: '期中成绩出来，有一门课亮起了红灯。再不补上，期末可能真会挂。', options: [
        { text: '突击补救，每天泡图书馆', fx: { study: 2, health: -1 }, note: '你拼了一周，总算把漏洞补上了大半。', next: null },
        { text: '先这样吧，下学期再努力', fx: { study: -2, mood: -1 }, note: '你心存侥幸，但心里清楚这不是好选择。', next: null }
      ], milestone: '挂科危机' } },
    { id: 're_crit', era: ['uni', 'work'], good: 0,
      step: { type: 'text', title: '被当众批评', time: '下午', desc: '汇报/展示时，你的方案被当面指出一堆问题。台下安静得能听见针掉。', fx: { mood: -3 }, milestone: '当众受挫' } },
    { id: 're_rumor', era: ['hs', 'uni'], good: 0,
      step: { type: 'choice', title: '被传谣言', time: '中午', desc: '不知道从哪开始，关于你的一个离谱传言传开了。朋友欲言又止地看着你。', options: [
        { text: '当面澄清，把话说开', fx: { social: 2, mood: -1 }, note: '你解释清楚后，大部分人都表示理解。', next: null },
        { text: '清者自清，时间会证明', fx: { mood: -2, social: -1 }, note: '谣言慢慢淡了，但过程很难熬。', next: null }
      ], milestone: '谣言风波' } },
    { id: 're_layoff', era: ['work'], good: 0,
      step: { type: 'text', title: '裁员传闻', time: '上午', desc: '茶水间里都在传公司要裁员。你瞟了一眼工位，第一次觉得"稳定"是个很贵的词。', fx: { mood: -3 }, milestone: '裁员风声' } },
    { id: 're_badreview', era: ['work'], good: 0,
      step: { type: 'text', title: '方案被否', time: '下午', desc: '你熬了三个晚上做的方案，被上级一句话打回：「方向不对，重做。」', fx: { ability: -1, mood: -2 }, milestone: '方案被否' } },
    { id: 're_fight', era: ['hs', 'uni'], good: 0,
      step: { type: 'choice', title: '和朋友吵架', time: '晚上', desc: '因为一件小事，你和好朋友闹翻了。晚上躺在床上，你翻来覆去。', options: [
        { text: '先低头，主动和好', fx: { social: 2, mood: 1 }, note: '你发了一条消息，对方秒回：「我也错了。」', next: null },
        { text: '等对方先开口', fx: { social: -2, mood: -2 }, note: '你们冷战了几天，谁都不肯先低头。', next: null }
      ], milestone: '友情的裂痕' } },
    { id: 're_late', era: ['hs', 'uni', 'work'], good: 0,
      step: { type: 'text', title: '睡过头了', time: '早上', desc: '闹钟响了但你按掉了继续睡，醒来已经晚了。一路狂奔，还是迟到了。', fx: { mood: -1 }, milestone: '睡过头的一天' } },
    // ===== 幸运 =====
    { id: 're_mentor', era: ['uni', 'work'], good: 1,
      step: { type: 'text', title: '贵人指点', time: '下午', desc: '一位前辈看了你的作品/报告，主动给了你三条中肯的建议。你听完醍醐灌顶：「原来还能这么做！」', fx: { ability: 3 }, milestone: '遇到贵人' } },
    { id: 're_jackpot', era: ['uni', 'work'], good: 1,
      step: { type: 'text', title: '小幸运', time: '中午', desc: '路过彩票站，你随手买了一张，居然中了小奖。不多，但够你开心一整天。', fx: { money: 8, mood: 2 }, milestone: '意外之财' } },
    { id: 're_friend', era: ['hs', 'uni'], good: 1,
      step: { type: 'text', title: '食堂偶遇', time: '中午', desc: '打饭时偶遇老同学，聊起各自近况，笑得前仰后合。原来有些人，一见面就能回到从前。', fx: { social: 2, mood: 1 }, milestone: '他乡遇故知' } },
    { id: 're_praise', era: ['hs', 'uni', 'work'], good: 1,
      step: { type: 'text', title: '被表扬了', time: '上午', desc: '你的表现被老师/上司当众表扬：「做得不错，继续保持。」那一刻，你觉得所有的努力都值了。', fx: { mood: 3, study: 1 }, milestone: '被看见的瞬间' } },
    { id: 're_gift', era: ['hs', 'uni'], good: 1,
      step: { type: 'text', title: '匿名小礼物', time: '下午', desc: '课桌/工位抽屉里多了一个小纸条和一包零食，署名是"一个默默关注你的人"。你四处张望，没找到是谁。', fx: { mood: 2 }, milestone: '神秘的小温暖' } },
    { id: 're_meal', era: ['hs', 'uni'], good: 1,
      step: { type: 'text', title: '被请客', time: '中午', desc: '朋友非拉着你请你吃饭：「上次你帮我那么大忙，这顿必须我请！」', fx: { social: 2, money: 2 }, milestone: '蹭到一顿饭' } },
    { id: 're_idea', era: ['uni', 'work'], good: 1,
      step: { type: 'text', title: '灵感爆发', time: '晚上', desc: '洗澡时，一个困扰你很久的问题突然有了思路。你擦干手赶紧记下来，生怕它跑掉。', fx: { ability: 3, mood: 1 }, milestone: '灵光乍现' } },
    { id: 're_lottery', era: ['uni', 'work'], good: 1,
      step: { type: 'text', title: '抽奖中奖', time: '中午', desc: '商场/公司活动抽奖，你居然中了个三等奖——一台小风扇。虽然不算贵重，但白捡的就是香。', fx: { money: 10, mood: 2 }, milestone: '白捡的奖品' } },
    { id: 're_tutor', era: ['hs', 'uni'], good: 1,
      step: { type: 'text', title: '老师单独指导', time: '下午', desc: '下课后，老师把你单独留下，给你讲了一道难题的巧解。你豁然开朗，突然觉得这门课也没那么难。', fx: { study: 3 }, milestone: '开小灶' } },
    { id: 're_network', era: ['work'], good: 1,
      step: { type: 'text', title: '认识厉害的人', time: '下午', desc: '一次偶然的交流，你认识了一位行业里很厉害的前辈。对方记住了你的名字，还说「有问题可以找我」。', fx: { social: 3, ability: 1 }, milestone: '人脉+1' } },
    { id: 're_free', era: ['work'], good: 1,
      step: { type: 'text', title: '咖啡免单', time: '上午', desc: '你常去的咖啡店搞活动，你是今天的第 100 位顾客——免单！你美滋滋地端着超大杯回工位。', fx: { mood: 2 }, milestone: '今天的幸运顾客' } },
    { id: 're_encourage', era: ['hs', 'uni', 'work'], good: 1,
      step: { type: 'text', title: '收到鼓励短信', time: '晚上', desc: '手机震动，是一条没署名的短信：「最近辛苦了，别给自己太大压力。你已经很棒了。」你盯着屏幕看了很久。', fx: { mood: 3 }, milestone: '深夜的温暖' } }
  ];  /* ---------- 路人支线（10 个） ---------- */
  const FOLK_QUESTS = [
    { role: '食堂阿姨', icon: '🍗', title: '帮阿姨搬货', desc: '阿姨新进了一批食材，正发愁搬不动。你撸起袖子帮了一把，阿姨直夸你：「好孩子！」', fx: { social: 2, ability: 1 }, reward: '阿姨给你加了个大鸡腿' },
    { role: '图书管理员', icon: '📚', title: '帮忙整理书架', desc: '管理员正把新书搬上架，你顺手帮忙归类。', fx: { ability: 1, social: 1 }, reward: '管理员帮你留了一本热门书' },
    { role: '园丁爷爷', icon: '🌿', title: '给园丁送水', desc: '大热天，园丁爷爷还在修剪花草。你递上一瓶水，他笑着摆摆手又继续忙活。', fx: { mood: 2 }, reward: '爷爷送了你一朵开得最好的花' },
    { role: '园丁阿姨', icon: '🌷', title: '帮阿姨浇花', desc: '园区花坛需要浇水，你拿起水管忙了一下午。', fx: { ability: 1, mood: 1 }, reward: '阿姨教了你一招养花的秘诀' },
    { role: '保安大叔', icon: '🛡️', title: '陪大叔聊会儿天', desc: '大叔值夜班无聊，你陪他聊了会儿家常，他讲起年轻时的故事，眼睛亮亮的。', fx: { mood: 2, social: 1 }, reward: '大叔说以后有事尽管找他' },
    { role: '快递小哥', icon: '📦', title: '帮小哥搬快件', desc: '双十一的快递堆成山，你帮小哥搬了一趟，他感动得给你留了个联系方式。', fx: { ability: 1, money: 2 }, reward: '小哥请你喝了瓶水' },
    { role: '咖啡师', icon: '☕', title: '学拉花', desc: '咖啡师教你拉了个爱心，虽然歪了，但你说这是史上最可爱的爱心。', fx: { ability: 2, mood: 1 }, reward: '咖啡师给你免了单' },
    { role: '前台小姐姐', icon: '📇', title: '帮前台取文件', desc: '前台正忙着接待，你顺手帮她把楼上送来的文件取了下来。', fx: { social: 1, ability: 1 }, reward: '前台偷偷给你塞了块巧克力' },
    { role: '自习同学', icon: '📖', title: '讲一道题', desc: '自习的同学卡在一道题上，你过去看了一眼，三下五除二讲明白了。', fx: { study: 2, social: 1 }, reward: '对方请你喝了瓶饮料' },
    { role: '夜跑同学', icon: '🏃', title: '陪跑一圈', desc: '夜跑同学喊你一起：「一个人跑没意思，来！」你跟着跑了一圈，居然没掉队。', fx: { health: 2, mood: 1 }, reward: '约好了明天继续' }
  ];

  /* ---------- 朋友圈动态（每阶段 6-7 条） ---------- */
  const FEED_POSTS = {
    hs: [
      { author: '同桌', text: '开学第一天，我的新同桌居然…居然比我先到教室。👍', likes: 12 },
      { author: '学霸同学', text: '错题本 +1，今天的我依然在卷。😎', likes: 34 },
      { author: '晨跑同学', text: '坚持晨跑第 7 天，操场打卡！', likes: 21 },
      { author: '班主任', text: '转发：高中三年最重要的三件事。', likes: 88 },
      { author: '隔壁班同学', text: '下周篮球赛，缺一个中锋，有人来吗？', likes: 45 },
      { author: '园丁爷爷', text: '花园的桂花开了，香得很，路过别错过。🍂', likes: 66 },
      { author: '食堂阿姨', text: '明天中午有红烧肉，限量！先到先得！', likes: 130 }
    ],
    uni: [
      { author: '室友', text: '食堂二楼的麻辣香锅 yyds，连吃三天了。🔥', likes: 45 },
      { author: '社团招新同学', text: '摄影社招新最后一天，错过再等一年！', likes: 30 },
      { author: '导师', text: '实验室暑期招新，欢迎对科研感兴趣的同学。', likes: 66 },
      { author: '夜跑同学', text: '今晚操场有流星雨，有人一起吗？🌠', likes: 102 },
      { author: '快递小哥', text: '驿站爆仓预警！请错峰取件，谢谢配合。📦', likes: 78 },
      { author: '自习同学', text: '图书馆四楼窗边位，风景一绝，早到才有。', likes: 54 },
      { author: '图书管理员', text: '新到了一批科幻小说，借阅请趁早。', likes: 40 }
    ],
    work: [
      { author: '加班的程序员', text: '凌晨三点的办公室，谁懂。☕', likes: 156 },
      { author: '前台小姐姐', text: '下午茶 time！今天的提拉米苏绝了。', likes: 89 },
      { author: '咖啡师', text: '新品「美式冰摇」上线，打工人续命神器。', likes: 74 },
      { author: '园丁阿姨', text: '园区桂花开了，路过别忘闻一闻。🍂', likes: 120 },
      { author: '保洁阿姨', text: '茶水间新放了绿植，看着就舒服。', likes: 63 },
      { author: '加班的程序员', text: '需求又改了，今晚估计要通宵。谁来救我。😭', likes: 201 },
      { author: '外卖小哥', text: '午高峰接单中，别催，马上到！', likes: 98 }
    ]
  };

  /* ---------- 好感度专属剧情（8 个） ---------- */
  const SIDE_STORIES = [
    { id: 'ss_deskmate', stage: 's3', target: 'deskmate', need: 60,
      step: { type: 'text', title: '同桌的生日', time: '下午', desc: '你无意中得知今天是{deskmate}的生日，但她/他谁也没告诉。放学后你买了一块小蛋糕，突然出现在她/他面前：「生日快乐！」她/他愣住了，然后笑得很用力。', fx: { social: 3, mood: 2 }, milestone: '你记住了同桌的生日' } },
    { id: 'ss_roommate', stage: 's6', target: 'roommate', need: 60,
      step: { type: 'text', title: '室友的秘密', time: '晚上', desc: '关灯后，{roommate}突然跟你说：「其实我大一差点退学……」你安静地听着，没有插嘴。讲完后她/他如释重负：「谢谢你没笑话我。」', fx: { social: 3, mood: 1 }, milestone: '室友向你敞开了心扉' } },
    { id: 'ss_mentor', stage: 's7', target: 'mentor', need: 60,
      step: { type: 'text', title: '导师的往事', time: '下午', desc: '午休时，{mentor}难得聊起自己：「我当年第一份工作也搞砸过，比你惨多了。」你第一次觉得，这位严厉的前辈也有柔软的一面。', fx: { social: 3, ability: 1 }, milestone: '导师讲起了自己的故事' } },
    { id: 'ss_lover', stage: 's7', target: 'lover', need: 30,
      step: { type: 'choice', title: '和恋人的纪念日', time: '晚上', desc: '你和{lover}在一起一周年了。她/他约你去那家第一次约会的餐厅，桌上放着一个礼物盒。', options: [
        { text: '准备了一份惊喜回赠', fx: { mood: 3, social: 2 }, note: '你偷偷攒钱买了他/她念叨很久的东西，她/他眼睛一下子亮了。', next: null },
        { text: '忙忘了，有些不好意思', fx: { mood: -2 }, note: '你临时补了一个小礼物，但她/他嘴上说着没事，眼神还是暗了一下。', next: null }
      ], milestone: '恋爱一周年' } },
    { id: 'ss_lover2', stage: 's8', target: 'lover', need: 60,
      step: { type: 'choice', title: '毕业季的十字路口', time: '晚上', desc: '毕业在即，{lover}和你聊起以后：「工作定了吗？我们……还在一起吗？」窗外的风有点凉。', options: [
        { text: '「不管去哪，我们都要在一起。」', fx: { mood: 3, social: 2 }, note: '她/他笑了，握紧你的手：「那就说好了。」', next: null },
        { text: '「先各自努力，看缘分吧。」', fx: { mood: -2 }, note: '她/他沉默了一会儿，说「好」。气氛有些微妙。', next: null }
      ], milestone: '毕业季的选择' } },
    { id: 'ss_father', stage: 's3', target: 'father', need: 50,
      step: { type: 'text', title: '爸爸的往事', time: '晚上', desc: '晚饭后，{father}难得讲起自己年轻时候：「爸当年也想过出去闯，后来你爷爷奶奶身体不好，就留下了。」他顿了顿：「所以你想走的路，爸不拦你。」', fx: { mood: 2, social: 2 }, milestone: '爸爸的往事' } },
    { id: 'ss_mother', stage: 's5', target: 'mother', need: 50,
      step: { type: 'text', title: '妈妈的视频教学', time: '晚上', desc: '视频里，{mother}手把手教你做你最爱吃的菜：「油热了先放葱……对，就是这样！」你手忙脚乱，但出锅时居然有模有样。', fx: { mood: 2, ability: 1 }, milestone: '妈妈教你做饭' } },
    { id: 'ss_teacher', stage: 's2', target: 'teacher', need: 50,
      step: { type: 'text', title: '班主任的选择', time: '下午', desc: '放学后，{teacher}难得和你聊起自己：「我当年也纠结过选文还是选理。后来我明白了，没有绝对正确的选择，只有选了之后全力以赴。」', fx: { study: 1, mood: 2 }, milestone: '老师当年的选择' } }
  ];

  /* ---------- 多结局（12 个） ---------- */
  const ENDING_STYLES = [
    { key: 'gov', test: s => s.careerId === 'c072', title: '上岸人生', desc: '你考上了体制内，过上了爸妈眼中的「稳定人生」。但你知道，这份稳定背后是沉甸甸的公共责任。' },
    { key: 'teacher', test: s => s.careerId === 'c035', title: '三尺讲台', desc: '你成了小时候最想成为的人。站上讲台的第一天，你在心里说：我会像我的老师一样，点燃火种。' },
    { key: 'doctor', test: s => s.careerId === 'c027', title: '白衣执甲', desc: '漫长的培养期终于有了回响。穿上白大褂的那一刻，你想起那个在职业博览会门口驻足的自己。' },
    { key: 'product', test: s => s.careerId === 'c001', title: '产品掌舵', desc: '你开始理解用户、定义产品、协调各方。PRD 改了十八版，但你离"把想法变成现实"越来越近。' },
    { key: 'dev', test: s => s.careerId === 'c003', title: '代码筑梦', desc: '第一行生产代码合入主分支的那一刻，你成了这庞大系统的一部分。以后，你负责让它稳定运行。' },
    { key: 'algo', test: s => s.careerId === 'c005', title: '算法之光', desc: '你在模型训练日志里看到了希望的曲线。调参调到怀疑人生的日子，终于有了回报。' },
    { key: 'psych', test: s => s.careerId === 'c029', title: '心灵摆渡', desc: '第一个来访者走出咨询室时回头对你笑了笑。你突然明白，这份职业的意义不在收入，而在被信任。' },
    { key: 'lawyer', test: s => s.careerId === 'c070', title: '律政新秀', desc: '你写下的第一份法律文书，帮助当事人争取到了应得的权益。正义感，落在了纸上。' },
    { key: 'perfect', test: s => s.ending && s.ending.tier === 'big' && (s.ending.match || 0) >= 90, title: '完美开局', desc: '最好的平台、最高的匹配度。你的人生仿佛开了加速，但你知道，越是顺风越要稳。' },
    { key: 'comeback', test: s => s.ending && s.ending.tier === 'small' && ((s.flags || {}).grad_adjust || (s.flags || {}).gaokaoRetry || (s.flags || {}).gradFailedJob), title: '逆风翻盘', desc: '你跌倒过、被否定过，但你还是站了起来。起点不高，不代表终点不远。' },
    { key: 'big_grad', test: s => s.ending && s.ending.tier === 'big' && (s.flags.gradPass || s.stageDone.includes('s9')), title: '天之骄子', desc: '名校背景加上头部平台，你的职业开局让很多人羡慕。但你知道，这条路才刚刚开始。' },
    { key: 'big', test: s => s.ending && s.ending.tier === 'big', title: '大厂新星', desc: '你从校园直接杀进了头部。工牌挂上的那一刻，你觉得高中的所有努力都有了名字。' },
    { key: 'mid', test: s => s.ending && s.ending.tier === 'mid', title: '稳步向前', desc: '起点不算耀眼，但你的每一步都走得踏实。你相信，路是走出来的。' },
    { key: 'small', test: s => s.ending, title: '白手起家', desc: '你从基层做起，第一份工作不算光鲜，但你知道故事才刚刚开始。' }
  ];

  return { ACHIEVEMENTS, TRAITS, RANDOM_EVENTS, FOLK_QUESTS, FEED_POSTS, SIDE_STORIES, ENDING_STYLES };
})();
