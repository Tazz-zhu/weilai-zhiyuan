// 未来小镇 · 2025 年各省高考录取控制线（官方公开数据）
// 来源：各省教育考试院 2025 年 6 月公布，北京日报《全了！31省区市2025高考分数线汇总》汇总
// scale: 总分满分（上海 660、海南 900，其余 750）
// 综合改革省份（北京/天津/山东/浙江等）物理=历史=该批次线
export const provinceLines = [
  { name: '北京', physics: 430, history: 430, specialPhysics: 519, specialHistory: 519, scale: 750, year: 2025 },
  { name: '天津', physics: 476, history: 476, specialPhysics: 476, specialHistory: 476, scale: 750, year: 2025 },
  { name: '上海', physics: 402, history: 402, specialPhysics: 505, specialHistory: 505, scale: 660, year: 2025 },
  { name: '广东', physics: 436, history: 464, specialPhysics: 534, specialHistory: 557, scale: 750, year: 2025 },
  { name: '江苏', physics: 463, history: 482, specialPhysics: 514, specialHistory: 530, scale: 750, year: 2025 },
  { name: '浙江', physics: 490, history: 490, specialPhysics: 592, specialHistory: 592, scale: 750, year: 2025 },
  { name: '四川', physics: 438, history: 467, specialPhysics: 518, specialHistory: 533, scale: 750, year: 2025 },
  { name: '湖北', physics: 426, history: 442, specialPhysics: 516, specialHistory: 536, scale: 750, year: 2025 },
  { name: '陕西', physics: 394, history: 414, specialPhysics: 473, specialHistory: 497, scale: 750, year: 2025 },
  { name: '山东', physics: 441, history: 441, specialPhysics: 521, specialHistory: 521, scale: 750, year: 2025 },
  { name: '河南', physics: 427, history: 471, specialPhysics: 535, specialHistory: 552, scale: 750, year: 2025 },
  { name: '湖南', physics: 405, history: 446, specialPhysics: 476, specialHistory: 503, scale: 750, year: 2025 },
  { name: '福建', physics: 441, history: 450, specialPhysics: 441, specialHistory: 450, scale: 750, year: 2025 },
  { name: '河北', physics: 459, history: 477, specialPhysics: 499, specialHistory: 527, scale: 750, year: 2025 },
  { name: '安徽', physics: 461, history: 477, specialPhysics: 514, specialHistory: 515, scale: 750, year: 2025 },
  { name: '江西', physics: 429, history: 486, specialPhysics: 505, specialHistory: 539, scale: 750, year: 2025 },
  { name: '重庆', physics: 425, history: 438, specialPhysics: 498, specialHistory: 515, scale: 750, year: 2025 },
  { name: '辽宁', physics: 367, history: 437, specialPhysics: 515, specialHistory: 522, scale: 750, year: 2025 },
  { name: '黑龙江', physics: 360, history: 405, specialPhysics: 472, specialHistory: 480, scale: 750, year: 2025 },
  { name: '山西', physics: 419, history: 443, specialPhysics: 507, specialHistory: 534, scale: 750, year: 2025 },
  { name: '吉林', physics: 340, history: 384, specialPhysics: 479, specialHistory: 493, scale: 750, year: 2025 },
  { name: '广西', physics: 370, history: 402, specialPhysics: 495, specialHistory: 518, scale: 750, year: 2025 },
  { name: '贵州', physics: 387, history: 458, specialPhysics: 483, specialHistory: 517, scale: 750, year: 2025 },
  { name: '云南', physics: 430, history: 465, specialPhysics: 495, specialHistory: 535, scale: 750, year: 2025 },
  { name: '甘肃', physics: 374, history: 412, specialPhysics: 475, specialHistory: 500, scale: 750, year: 2025 },
  { name: '内蒙古', physics: 375, history: 418, specialPhysics: 487, specialHistory: 523, scale: 750, year: 2025 },
  { name: '宁夏', physics: 372, history: 404, specialPhysics: 441, specialHistory: 482, scale: 750, year: 2025 },
  { name: '新疆', physics: 421, history: 451, specialPhysics: 421, specialHistory: 451, scale: 750, year: 2025 },
  { name: '青海', physics: 350, history: 405, specialPhysics: 420, specialHistory: 450, scale: 750, year: 2025 },
  { name: '海南', physics: 480, history: 480, specialPhysics: 568, specialHistory: 568, scale: 900, year: 2025 },
  { name: '西藏', physics: 300, history: 338, specialPhysics: 400, specialHistory: 410, scale: 750, year: 2025 },
];

export function provinceLine(name) {
  return provinceLines.find(p => p.name === name) || null;
}
