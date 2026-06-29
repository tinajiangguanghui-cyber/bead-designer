// 珠子数据配置 - 5种材质 × 多种形状颜色
export const BEAD_MATERIALS = {
  crystal: { name: '水晶', roughness: 0.15, metalness: 0.05, opacity: 0.85, transmission: 0.4, ior: 1.5 },
  jade:     { name: '玉石', roughness: 0.3, metalness: 0.0, opacity: 1.0, transmission: 0.05, ior: 1.3 },
  wood:     { name: '木质', roughness: 0.7, metalness: 0.0, opacity: 1.0, transmission: 0.0, ior: 1.0 },
  metal:    { name: '金属', roughness: 0.25, metalness: 0.9, opacity: 1.0, transmission: 0.0, ior: 2.0 },
  ceramic:  { name: '陶瓷', roughness: 0.5, metalness: 0.0, opacity: 1.0, transmission: 0.0, ior: 1.2 }
};

export const BEAD_COLORS = {
  red:      { name: '红', hex: '#c0392b' },
  orange:   { name: '橙', hex: '#e67e22' },
  yellow:   { name: '黄', hex: '#f1c40f' },
  green:    { name: '绿', hex: '#27ae60' },
  blue:     { name: '蓝', hex: '#2980b9' },
  purple:   { name: '紫', hex: '#8e44ad' },
  white:    { name: '白', hex: '#ecf0f1' },
  black:    { name: '黑', hex: '#2c3e50' },
  pink:     { name: '粉', hex: '#e8a0bf' },
  brown:    { name: '棕', hex: '#8b5e3c' },
  teal:     { name: '青', hex: '#1abc9c' },
  gold:     { name: '金', hex: '#f0c040' },
  silver:   { name: '银', hex: '#c0c0c0' },
  rosegold: { name: '玫瑰金', hex: '#e8b4b8' }
};

// 珠子数据库 - MVP 60种
export const BEAD_LIBRARY = buildBeadLibrary();

function buildBeadLibrary() {
  const beads = [];
  let id = 0;

  // 水晶圆珠 - 6种颜色
  ['pink','purple','white','yellow','brown','blue'].forEach(c => {
    beads.push({ id: id++, name: `${BEAD_COLORS[c].name}晶圆珠`, material: 'crystal', shape: 'round', color: c, sizes: [6,8,10,12], defaultSize: 8 });
  });

  // 水晶桶珠
  ['pink','purple'].forEach(c => {
    beads.push({ id: id++, name: `${BEAD_COLORS[c].name}晶桶珠`, material: 'crystal', shape: 'barrel', color: c, sizes: [8,10,12], defaultSize: 10 });
  });

  // 水晶算盘珠
  ['white','pink'].forEach(c => {
    beads.push({ id: id++, name: `${BEAD_COLORS[c].name}晶算盘珠`, material: 'crystal', shape: 'abacus', color: c, sizes: [8,10], defaultSize: 8 });
  });

  // 玉石圆珠 - 4种
  [{c:'green',n:'翡翠绿'},{c:'white',n:'和田白'},{c:'red',n:'玛瑙红'},{c:'blue',n:'青金石'}].forEach(x => {
    beads.push({ id: id++, name: `${x.n}圆珠`, material: 'jade', shape: 'round', color: x.c, sizes: [6,8,10,12], defaultSize: 8 });
  });

  // 玉石桶珠
  [{c:'green',n:'翡翠绿'},{c:'red',n:'玛瑙红'}].forEach(x => {
    beads.push({ id: id++, name: `${x.n}桶珠`, material: 'jade', shape: 'barrel', color: x.c, sizes: [8,10,12], defaultSize: 10 });
  });

  // 玉石算盘珠
  beads.push({ id: id++, name: '翡翠绿算盘珠', material: 'jade', shape: 'abacus', color: 'green', sizes: [8,10], defaultSize: 8 });

  // 玉石雕刻件
  [{c:'green',n:'貔貅'},{c:'white',n:'平安扣'}].forEach(x => {
    beads.push({ id: id++, name: `${x.n}雕刻`, material: 'jade', shape: 'carving', color: x.c, sizes: [10,12,14], defaultSize: 12 });
  });

  // 木质圆珠
  ['brown','black','brown'].forEach((c,i) => {
    const names = ['檀木','菩提','崖柏'];
    beads.push({ id: id++, name: `${names[i]}圆珠`, material: 'wood', shape: 'round', color: c, sizes: [8,10,12], defaultSize: 10 });
  });

  // 木质桶珠
  beads.push({ id: id++, name: '檀木桶珠', material: 'wood', shape: 'barrel', color: 'brown', sizes: [10,12], defaultSize: 10 });

  // 木质雕刻件
  beads.push({ id: id++, name: '莲花雕刻', material: 'wood', shape: 'carving', color: 'brown', sizes: [10,12,14], defaultSize: 12 });

  // 金属圆珠
  [{c:'silver',n:'银'},{c:'gold',n:'金'},{c:'rosegold',n:'玫瑰金'}].forEach(x => {
    beads.push({ id: id++, name: `${x.n}圆珠`, material: 'metal', shape: 'round', color: x.c, sizes: [4,6,8,10], defaultSize: 6 });
  });

  // 金属隔片
  [{c:'silver',n:'银'},{c:'gold',n:'金'}].forEach(x => {
    beads.push({ id: id++, name: `${x.n}隔片`, material: 'metal', shape: 'spacer', color: x.c, sizes: [4,6], defaultSize: 4 });
  });

  // 金属雕刻件
  [{c:'silver',n:'银'},{c:'gold',n:'金'}].forEach(x => {
    beads.push({ id: id++, name: `${x.n}心形`, material: 'metal', shape: 'carving', color: x.c, sizes: [8,10], defaultSize: 8 });
  });

  // 陶瓷圆珠
  [{c:'white',n:'白瓷'},{c:'blue',n:'青花'},{c:'teal',n:'彩釉'}].forEach(x => {
    beads.push({ id: id++, name: `${x.n}圆珠`, material: 'ceramic', shape: 'round', color: x.c, sizes: [8,10,12], defaultSize: 10 });
  });

  // 陶瓷桶珠
  beads.push({ id: id++, name: '青花桶珠', material: 'ceramic', shape: 'barrel', color: 'blue', sizes: [10,12], defaultSize: 10 });

  // 陶瓷算盘珠
  beads.push({ id: id++, name: '青花算盘珠', material: 'ceramic', shape: 'abacus', color: 'blue', sizes: [8,10], defaultSize: 8 });

  return beads;
}

// 饰品类型模板
export const TEMPLATES = [
  { id: 'bracelet_single', name: '手串·单圈', icon: '💫', category: '手串', ropeType: 'circle', ropeCount: 1, defaultLength: 160, desc: '单圈手串' },
  { id: 'bracelet_double', name: '手串·双圈', icon: '💫', category: '手串', ropeType: 'circle', ropeCount: 2, defaultLength: 320, desc: '双圈手串' },
  { id: 'bracelet_triple', name: '手串·三圈', icon: '💫', category: '手串', ropeType: 'circle', ropeCount: 3, defaultLength: 480, desc: '三圈手串' },
  { id: 'necklace_short', name: '项链·短链', icon: '✨', category: '项链', ropeType: 'uShape', ropeCount: 1, defaultLength: 400, desc: '短款项链' },
  { id: 'necklace_long', name: '项链·长链', icon: '✨', category: '项链', ropeType: 'uShape', ropeCount: 1, defaultLength: 600, desc: '长款项链' },
  { id: 'earring', name: '耳环', icon: '💎', category: '耳环', ropeType: 'straight', ropeCount: 1, defaultLength: 50, desc: '垂坠耳环' },
  { id: 'phone_chain', name: '手机链', icon: '📱', category: '手机链', ropeType: 'straight_hook', ropeCount: 1, defaultLength: 150, desc: '手机挂链' },
];
