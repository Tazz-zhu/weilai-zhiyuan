// 未来致远 · 深度测评题库（兴趣/性格/能力/价值观 四维）

export const questions = [
  // ============ 一、兴趣维度（RIASEC） ============
  { id: 'i1', dimension: 'interest', title: '如果给你一个完全自由的周末，你更愿意？', options: [
    { text: '动手组装/修理一件东西，或做手工', scores: { R: 3 } },
    { text: '看科普纪录片，研究一个感兴趣的问题', scores: { I: 3 } },
    { text: '画画、写东西、拍照、做音乐', scores: { A: 3 } },
    { text: '约朋友一起做公益或照顾他人', scores: { S: 3 } }
  ]},
  { id: 'i2', dimension: 'interest', title: '团队做项目时，你最想承担哪个角色？', options: [
    { text: '负责动手实现/执行的骨干', scores: { R: 2, C: 1 } },
    { text: '负责研究资料、分析问题的"智库"', scores: { I: 3 } },
    { text: '负责创意、设计、包装的"点子王"', scores: { A: 3 } },
    { text: '负责统筹协调、带节奏的"队长"', scores: { E: 3 } }
  ]},
  { id: 'i3', dimension: 'interest', title: '以下哪类书籍/内容最能吸引你？', options: [
    { text: '工具书、技术教程、手工DIY教程', scores: { R: 2, I: 1 } },
    { text: '科学、历史、哲学类深度内容', scores: { I: 3 } },
    { text: '小说、电影、艺术、音乐相关内容', scores: { A: 3 } },
    { text: '人物传记、商业故事、成功案例', scores: { E: 2, S: 1 } }
  ]},
  { id: 'i4', dimension: 'interest', title: '在"帮助别人"这件事上，你的态度是？', options: [
    { text: '非常乐意，当老师/医生/志愿者很有意义', scores: { S: 3 } },
    { text: '愿意帮忙，但更喜欢解决"事"而非"人"', scores: { I: 1, R: 1 } },
    { text: '如果帮我建立人脉和影响力，我很愿意', scores: { E: 3 } },
    { text: '不太擅长，我更享受独处专注做事', scores: { R: 1, I: 2 } }
  ]},
  { id: 'i5', dimension: 'interest', title: '你希望自己未来的工作状态更接近？', options: [
    { text: '按部就班、规则清晰、结果可预期', scores: { C: 3 } },
    { text: '探索未知、解决问题、不断有新发现', scores: { I: 3 } },
    { text: '自由创作、表达自我、每天不一样', scores: { A: 3 } },
    { text: '与人打交道、谈判说服、推动事情发生', scores: { E: 3 } }
  ]},
  { id: 'i6', dimension: 'interest', title: '别人通常怎么评价你？', options: [
    { text: '"动手能力强，心灵手巧"', scores: { R: 3 } },
    { text: '"爱思考，总能提出好问题"', scores: { I: 3 } },
    { text: '"有想法，审美和创意在线"', scores: { A: 3 } },
    { text: '"热心肠，特别会照顾人"', scores: { S: 3 } },
    { text: '"有主见，有领导范儿"', scores: { E: 3 } }
  ]},
  { id: 'i7', dimension: 'interest', title: '如果必须选一门选修课，你会选？', options: [
    { text: '金工实习/电子制作', scores: { R: 3 } },
    { text: '数学建模/科研训练', scores: { I: 3 } },
    { text: '摄影/戏剧/音乐鉴赏', scores: { A: 3 } },
    { text: '心理/社会学/教育实践', scores: { S: 3 } },
    { text: '创业管理/商业谈判', scores: { E: 3 } }
  ]},
  { id: 'i8', dimension: 'interest', title: '关于"井井有条"，你的真实感受是？', options: [
    { text: '喜欢，表格和清单让我安心', scores: { C: 3 } },
    { text: '一般，我更看重灵活和探索', scores: { I: 1, A: 1 } },
    { text: '无感，我更喜欢跟着感觉走', scores: { A: 2 } },
    { text: '我擅长管理秩序，但不止于秩序', scores: { E: 2, C: 1 } }
  ]},
  // ============ 二、性格维度 ============
  { id: 'p1', dimension: 'personality', title: '聚会结束后，你的状态通常是？', options: [
    { text: '电量耗尽，需要独处充电', scores: { 内向: 2 } },
    { text: '意犹未尽，想继续和大家待着', scores: { 外向: 2 } },
    { text: '看情况，和熟人就high，和生人就累', scores: { 内向: 1, 外向: 1 } }
  ]},
  { id: 'p2', dimension: 'personality', title: '做重要决定时，你更依赖？', options: [
    { text: '数据和逻辑分析', scores: { 理性: 2 } },
    { text: '内心感受和直觉', scores: { 感性: 2 } },
    { text: '先听大家意见，再综合判断', scores: { 理性: 1, 感性: 1 } }
  ]},
  { id: 'p3', dimension: 'personality', title: '面对一个全新且不确定的机会，你通常？', options: [
    { text: '兴奋，跃跃欲试先冲再说', scores: { 冒险: 2 } },
    { text: '谨慎，先评估风险再决定', scores: { 稳健: 2 } },
    { text: '会心动，但要拉着信任的人一起评估', scores: { 冒险: 1, 稳健: 1 } }
  ]},
  { id: 'p4', dimension: 'personality', title: '工作中你更喜欢？', options: [
    { text: '独立负责一块，自己说了算', scores: { 独立: 2 } },
    { text: '团队协作，一起把事做成', scores: { 合作: 2 } },
    { text: '看任务性质，复杂任务爱合作，简单任务爱独立', scores: { 独立: 1, 合作: 1 } }
  ]},
  { id: 'p5', dimension: 'personality', title: '你的做事风格更接近？', options: [
    { text: '先做详细计划，再一步步执行', scores: { 计划: 2 } },
    { text: '边做边调整，随机应变', scores: { 随性: 2 } },
    { text: '有大框架，细节灵活处理', scores: { 计划: 1, 随性: 1 } }
  ]},
  { id: 'p6', dimension: 'personality', title: '遇到挫折时，你通常会？', options: [
    { text: '很快振作，总结经验再战', scores: { 抗压: 2 } },
    { text: '需要一段消化时间，但最终能走出来', scores: { 敏感: 1, 抗压: 1 } },
    { text: '比较容易受影响，需要他人支持', scores: { 敏感: 2 } }
  ]},
  // ============ 三、能力维度 ============
  { id: 'a1', dimension: 'ability', title: '下面哪项能力你最有自信？', options: [
    { text: '数学推理、逻辑分析', scores: { 逻辑数理: 2 } },
    { text: '写作、演讲、表达', scores: { 语言表达: 2 } },
    { text: '绘画、设计、空间想象', scores: { 空间创意: 2 } },
    { text: '组织活动、协调人际关系', scores: { 人际协调: 2 } }
  ]},
  { id: 'a2', dimension: 'ability', title: '组装一个复杂的新家具时，你？', options: [
    { text: '不看说明书，凭感觉就能装好', scores: { 动手操作: 2 } },
    { text: '认真看说明书，一步步来', scores: { 逻辑数理: 1, 动手操作: 1 } },
    { text: '有点头疼，更愿意找人帮忙', scores: { 人际协调: 1 } }
  ]},
  { id: 'a3', dimension: 'ability', title: '老师/领导布置一个"没有标准答案"的任务，你？', options: [
    { text: '擅长，能想出新奇的方案', scores: { 空间创意: 2 } },
    { text: '擅长，能快速梳理框架并推进', scores: { 组织执行: 2 } },
    { text: '擅长，能组织大家一起完成', scores: { 人际协调: 2 } },
    { text: '有点慌，习惯有明确指引', scores: { 逻辑数理: 1 } }
  ]},
  { id: 'a4', dimension: 'ability', title: '看到复杂的数据/图表时，你？', options: [
    { text: '很快能看懂趋势和异常', scores: { 逻辑数理: 2 } },
    { text: '需要慢慢看，但能看懂', scores: { 逻辑数理: 1 } },
    { text: '头大，更喜欢文字和故事', scores: { 语言表达: 2 } }
  ]},
  { id: 'a5', dimension: 'ability', title: '在一群陌生人中，你？', options: [
    { text: '能主动破冰，很快和大家熟络', scores: { 人际协调: 2 } },
    { text: '能应对，但需要一点时间', scores: { 人际协调: 1, 语言表达: 1 } },
    { text: '比较被动，喜欢待在熟悉的人身边', scores: { 动手操作: 1 } }
  ]},
  { id: 'a6', dimension: 'ability', title: '同时有好几件事要做，你？', options: [
    { text: '能排出优先级，高效完成', scores: { 组织执行: 2 } },
    { text: '会手忙脚乱，需要列清单', scores: { 组织执行: 1 } },
    { text: '专注做一件，做完再做下一件', scores: { 逻辑数理: 1, 动手操作: 1 } }
  ]},
  // ============ 四、价值观维度 ============
  { id: 'v1', dimension: 'value', title: '选工作时，你最先看中？', options: [
    { text: '薪资和回报', scores: { 金钱财富: 2 } },
    { text: '成长空间和学习机会', scores: { 成长发展: 2 } },
    { text: '稳定和安全', scores: { 稳定安全: 2 } },
    { text: '做的事情是否有意义', scores: { 社会意义: 2 } }
  ]},
  { id: 'v2', dimension: 'value', title: '你理想中的"成功"更接近？', options: [
    { text: '财务自由，想买就买', scores: { 金钱财富: 2 } },
    { text: '成为行业专家，被人认可', scores: { 地位影响: 2 } },
    { text: '影响和帮助很多人', scores: { 社会意义: 2 } },
    { text: '自由安排生活，做喜欢的事', scores: { 自由创造: 2 } }
  ]},
  { id: 'v3', dimension: 'value', title: '如果一份工作钱多但很枯燥，你会？', options: [
    { text: '接受，钱到位就行', scores: { 金钱财富: 2 } },
    { text: '拒绝，成长和兴趣更重要', scores: { 成长发展: 2 } },
    { text: '拒绝，我需要自由和创造', scores: { 自由创造: 2 } },
    { text: '会纠结，最后可能接受', scores: { 金钱财富: 1, 稳定安全: 1 } }
  ]},
  { id: 'v4', dimension: 'value', title: '关于"稳定"，你的看法是？', options: [
    { text: '稳定很重要，最好旱涝保收', scores: { 稳定安全: 2 } },
    { text: '稳定会让我觉得没意思', scores: { 自由创造: 1, 成长发展: 1 } },
    { text: '可以接受适度风险换更大回报', scores: { 金钱财富: 1, 地位影响: 1 } }
  ]},
  { id: 'v5', dimension: 'value', title: '你更希望别人怎么记住你？', options: [
    { text: '一个专业靠谱的人', scores: { 地位影响: 2 } },
    { text: '一个善良温暖的人', scores: { 社会意义: 2 } },
    { text: '一个自由洒脱的人', scores: { 自由创造: 2 } },
    { text: '一个不断成长的人', scores: { 成长发展: 2 } }
  ]},
  { id: 'v6', dimension: 'value', title: '看到身边人"年纪轻轻就躺平"，你？', options: [
    { text: '理解，每个人选择不同', scores: { 自由创造: 1, 稳定安全: 1 } },
    { text: '不理解，人生应该往上走', scores: { 成长发展: 2 } },
    { text: '羡慕但不行动，各有各的难', scores: { 稳定安全: 1 } },
    { text: '会有点焦虑，怕被落下', scores: { 地位影响: 1, 金钱财富: 1 } }
  ]}
];
