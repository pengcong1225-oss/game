// ===== 默认配置（多档盲盒）=====
const DEFAULT_TIERS = [
  {
    name: '普通盲盒', cost: 10,
    gifts: [
      { id: 1, name: '能量金币', emoji: '🪙', rarity: 'common', probability: 35 },
      { id: 2, name: '光之水晶', emoji: '💎', rarity: 'common', probability: 25 },
      { id: 3, name: '怪兽卡片', emoji: '🃏', rarity: 'rare', probability: 20 },
      { id: 4, name: '等离子火花', emoji: '⚡', rarity: 'rare', probability: 10 },
      { id: 5, name: '奥特勋章', emoji: '🏅', rarity: 'epic', probability: 7 },
      { id: 6, name: '变身器碎片', emoji: '🌟', rarity: 'epic', probability: 2 },
      { id: 7, name: 'M78星云宝石', emoji: '🔮', rarity: 'legendary', probability: 1 },
    ]
  },
  {
    name: '高级盲盒', cost: 30,
    gifts: [
      { id: 1, name: '能量金币', emoji: '🪙', rarity: 'common', probability: 10 },
      { id: 2, name: '光之水晶', emoji: '💎', rarity: 'common', probability: 10 },
      { id: 3, name: '怪兽卡片', emoji: '🃏', rarity: 'rare', probability: 20 },
      { id: 4, name: '等离子火花', emoji: '⚡', rarity: 'rare', probability: 15 },
      { id: 5, name: '奥特勋章', emoji: '🏅', rarity: 'epic', probability: 20 },
      { id: 6, name: '变身器碎片', emoji: '🌟', rarity: 'epic', probability: 15 },
      { id: 7, name: 'M78星云宝石', emoji: '🔮', rarity: 'legendary', probability: 10 },
    ]
  }
];

const DEFAULT_POINTS = 100;
const DEFAULT_DAILY_REWARD = 1;

const RARITY_CONFIG = {
  common: { label: '普通', color: '#9CA3AF', stars: '⭐' },
  rare: { label: '稀有', color: '#3B82F6', stars: '⭐⭐' },
  epic: { label: '史诗', color: '#A855F7', stars: '⭐⭐⭐' },
  legendary: { label: '传说', color: '#FFD700', stars: '🌟🌟🌟🌟🌟' },
};

// ===== 游戏状态 =====
let gameState = {
  points: DEFAULT_POINTS,
  dailyReward: DEFAULT_DAILY_REWARD,
  drawTiers: JSON.parse(JSON.stringify(DEFAULT_TIERS)),
  activeTier: 0,
  history: [],
  isDrawing: false,
  lastDailyDate: null,
};

// ===== DOM =====
const $ = (sel) => document.querySelector(sel);

const dom = {
  pointsValue: $('#pointsValue'),
  drawButtons: $('#drawButtons'),
  blindBox: $('#blindBox'),
  auraRing: $('#auraRing'),
  boxGlow: $('.box-glow'),
  colorTimer: $('#colorTimer'),
  prizeGrid: $('#prizeGrid'),
  resultOverlay: $('#resultOverlay'),
  resultCard: $('#resultCard'),
  resultRarity: $('#resultRarity'),
  resultEmoji: $('#resultEmoji'),
  resultName: $('#resultName'),
  resultStars: $('#resultStars'),
  resultClose: $('#resultClose'),
  effectsLayer: $('#effectsLayer'),
  historySidebar: $('#historySidebar'),
  historyList: $('#historyList'),
  historyStats: $('#historyStats'),
  settingsOverlay: $('#settingsOverlay'),
  dailyOverlay: $('#dailyOverlay'),
  dailyRewardAmount: $('#dailyRewardAmount'),
  bgCanvas: $('#bgCanvas'),
};

// ===== 数据读写 =====
function loadState() {
  const pts = getPoints();
  gameState.points = (pts !== null && pts >= 0) ? pts : DEFAULT_POINTS;

  const bb = getBlindBox();
  if (bb) {
    gameState.dailyReward = bb.dailyReward ?? DEFAULT_DAILY_REWARD;
    gameState.history = bb.history ?? [];
    gameState.lastDailyDate = bb.lastDailyDate ?? null;

    if (bb.drawTiers?.length) {
      gameState.drawTiers = bb.drawTiers;
    } else if (bb.gifts?.length) {
      gameState.drawTiers = [{ name: '盲盒', cost: bb.drawCost || 10, gifts: bb.gifts }];
    } else {
      gameState.drawTiers = JSON.parse(JSON.stringify(DEFAULT_TIERS));
    }
  }
}

function saveState() {
  setPoints(gameState.points);
  saveBlindBox({
    dailyReward: gameState.dailyReward,
    drawTiers: gameState.drawTiers,
    history: gameState.history.slice(-50),
    lastDailyDate: gameState.lastDailyDate,
  });
}

// ===== UI 更新 =====
function updatePoints() {
  dom.pointsValue.textContent = gameState.points;
  dom.pointsValue.classList.remove('bump');
  void dom.pointsValue.offsetWidth;
  dom.pointsValue.classList.add('bump');
}

function updateDrawButtons() {
  dom.drawButtons.innerHTML = gameState.drawTiers.map((tier, i) => {
    const can = gameState.points >= tier.cost;
    return `<button class="draw-btn tier-btn" ${!can || gameState.isDrawing ? 'disabled' : ''} data-tier="${i}">
      <span class="draw-btn-text">🎁 ${tier.name} · <strong>${tier.cost}</strong> 积分</span>
      <span class="draw-btn-sub">${getTierRarityPreview(tier)}</span>
    </button>`;
  }).join('');
  dom.drawButtons.querySelectorAll('.tier-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ti = parseInt(btn.dataset.tier);
      if (!isNaN(ti)) performDraw(ti);
    });
  });
}

function getTierRarityPreview(tier) {
  const r = { common: 0, rare: 0, epic: 0, legendary: 0 };
  tier.gifts.forEach(g => { r[g.rarity] += g.probability; });
  const t = Object.values(r).reduce((s, v) => s + v, 0) || 1;
  return `传说 ${(r.legendary / t * 100).toFixed(0)}% · 史诗 ${(r.epic / t * 100).toFixed(0)}%`;
}

function updatePrizeGrid() {
  const tier = gameState.drawTiers[gameState.activeTier] || gameState.drawTiers[0];
  if (!tier) return;
  // 动态标题
  const title = $('#sectionTitle');
  if (title) title.innerHTML = `<span class="title-deco">★</span> ${tier.name} · 奖品池 <span class="title-deco">★</span>`;
  dom.prizeGrid.innerHTML = tier.gifts.map(g => `
    <div class="prize-card" data-rarity="${g.rarity}">
      ${g.image
        ? `<img src="${g.image}" class="prize-img" alt="${g.name}">`
        : `<span class="prize-emoji">${g.emoji}</span>`}
      <span class="prize-name">${g.name}</span>
      <span class="prize-rarity-badge ${g.rarity}">${RARITY_CONFIG[g.rarity].label}</span>
      <span class="prize-prob">概率 ${g.probability}%</span>
    </div>`).join('');
}

function updateTierTabs() {
  const tabs = $('#tierTabs');
  if (!tabs) return;
  tabs.innerHTML = gameState.drawTiers.map((tier, i) => `
    <span class="tier-tab ${i === gameState.activeTier ? 'active' : ''}" data-tier="${i}">${tier.name} · ${tier.cost}分</span>
  `).join('');
  tabs.querySelectorAll('.tier-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      gameState.activeTier = parseInt(tab.dataset.tier);
      updateTierTabs();
      updatePrizeGrid();
    });
  });
}

function updateAllUI() {
  updatePoints();
  updateDrawButtons();
  updateTierTabs();
  updatePrizeGrid();
}

// ===== 概率抽奖 =====
function drawGift(tierIndex) {
  const tier = gameState.drawTiers[tierIndex];
  if (!tier) return null;
  const totalProb = tier.gifts.reduce((s, g) => s + g.probability, 0);
  let rand = Math.random() * totalProb;
  for (const gift of tier.gifts) {
    rand -= gift.probability;
    if (rand <= 0) return gift;
  }
  return tier.gifts[tier.gifts.length - 1];
}

// ===== 酷炫特效 =====
function spawnParticles(x, y, count, color) {
  const f = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const d = 80 + Math.random() * 140;
    p.style.cssText = `left:${x}px;top:${y}px;width:${4+Math.random()*8}px;height:${4+Math.random()*8}px;background:${color};border-radius:${Math.random()>.5?'50%':'2px'};--dx:${Math.cos(a)*d}px;--dy:${Math.sin(a)*d}px;box-shadow:0 0 6px ${color};`;
    f.appendChild(p);
  }
  dom.effectsLayer.appendChild(f);
  setTimeout(() => { dom.effectsLayer.querySelectorAll('.particle').forEach(el => el.remove()); }, 1500);
}

function spawnConfetti(count) {
  const colors = ['#FFD700', '#E0001D', '#3B82F6', '#A855F7', '#00E5FF', '#FF6B6B', '#51CF66'];
  const f = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.cssText = `left:${Math.random()*100}vw;top:-20px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>.5?'50%':'2px'};animation-delay:${Math.random()*.6}s;animation-duration:${2+Math.random()*2}s;width:${6+Math.random()*12}px;height:${6+Math.random()*12}px;transform:rotate(${Math.random()*360}deg);`;
    f.appendChild(c);
  }
  dom.effectsLayer.appendChild(f);
  setTimeout(() => { dom.effectsLayer.querySelectorAll('.confetti').forEach(el => el.remove()); }, 4000);
}

function screenShake() {
  document.body.classList.add('screen-shake');
  setTimeout(() => document.body.classList.remove('screen-shake'), 500);
}

function screenFlash(color) {
  const el = document.createElement('div');
  el.className = 'screen-flash';
  if (color) el.style.background = color;
  dom.effectsLayer.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

function spawnLightBeams(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const beam = document.createElement('div');
    beam.className = 'light-beam';
    const angle = (360 / count) * i + (Math.random() - 0.5) * 10;
    const len = 120 + Math.random() * 160;
    beam.style.cssText = `left:${x}px;top:${y}px;height:${len}px;background:linear-gradient(to top,${color},transparent);box-shadow:0 0 12px ${color},0 0 30px ${color};transform:rotate(${angle}deg) translateY(20px);animation-delay:${Math.random()*.2}s;`;
    dom.effectsLayer.appendChild(beam);
    setTimeout(() => beam.remove(), 1000);
  }
}

function spawnRisingStars(x, y, count, emojis) {
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'float-star';
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 60;
    star.style.cssText = `left:${x+Math.cos(angle)*dist}px;top:${y+Math.random()*40}px;font-size:${16+Math.random()*28}px;animation-delay:${Math.random()*.5}s;animation-duration:${1.5+Math.random()*1.5}s;`;
    star.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    dom.effectsLayer.appendChild(star);
    setTimeout(() => star.remove(), 2500);
  }
}

function spawnRingPulse(x, y, color) {
  for (let i = 0; i < 3; i++) {
    const ring = document.createElement('div');
    ring.className = 'ring-pulse';
    ring.style.cssText = `left:${x}px;top:${y}px;border:3px solid ${color};box-shadow:0 0 20px ${color},inset 0 0 20px ${color}44;animation-delay:${i*.15}s;`;
    dom.effectsLayer.appendChild(ring);
    setTimeout(() => ring.remove(), 1200);
  }
}

function spawnSparkles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'sparkle';
    const a = Math.random() * Math.PI * 2;
    const d = 40 + Math.random() * 120;
    s.style.cssText = `left:${x}px;top:${y}px;background:${color};box-shadow:0 0 6px ${color},0 0 12px ${color};--sx:${Math.cos(a)*d}px;--sy:${Math.sin(a)*d-40}px;animation-delay:${Math.random()*.3}s;animation-duration:${.8+Math.random()*1.2}s;width:${2+Math.random()*5}px;height:${2+Math.random()*5}px;`;
    dom.effectsLayer.appendChild(s);
    setTimeout(() => s.remove(), 1600);
  }
}

// ===== 抽奖流程 =====
async function performDraw(tierIndex) {
  if (gameState.isDrawing) return;
  const tier = gameState.drawTiers[tierIndex];
  if (!tier) return;
  if (gameState.points < tier.cost) return;

  gameState.isDrawing = true;
  gameState.activeTier = tierIndex;
  gameState.points -= tier.cost;
  updatePoints();
  updateDrawButtons();

  // 蓄力：震动 + 光环加速 + 能量计时器变红
  dom.blindBox.classList.add('shaking');
  dom.auraRing.classList.add('active');
  dom.colorTimer.style.animationDuration = '0.2s';
  dom.colorTimer.style.background = '#ff4444';
  dom.colorTimer.style.boxShadow = '0 0 30px #ff4444, 0 0 60px #ff0000';

  const gift = drawGift(tierIndex);
  if (!gift) { gameState.isDrawing = false; return; }
  const rarity = RARITY_CONFIG[gift.rarity];

  await sleep(1200);

  // 开盒爆发
  dom.blindBox.classList.remove('shaking');
  dom.blindBox.classList.add('opening');
  dom.boxGlow.classList.add('flash');
  dom.auraRing.classList.remove('active');

  const br = dom.blindBox.getBoundingClientRect();
  const cx = br.left + br.width / 2;
  const cy = br.top + br.height / 2;

  // 通用：光柱 + 脉冲 + 粒子 + 闪光粒子
  spawnLightBeams(cx, cy, 8, rarity.color);
  spawnRingPulse(cx, cy, rarity.color);
  spawnParticles(cx, cy, 24, rarity.color);
  spawnSparkles(cx, cy, 20, rarity.color);

  if (gift.rarity === 'rare') {
    spawnRisingStars(cx, cy, 8, ['⭐', '✨', '💫']);
  }

  if (gift.rarity === 'epic') {
    spawnConfetti(50);
    spawnRisingStars(cx, cy, 16, ['⭐', '✨', '💫', '🌟', '💎']);
    spawnRingPulse(cx, cy, '#FFD700');
  }

  if (gift.rarity === 'legendary') {
    screenFlash('radial-gradient(circle, rgba(255,215,0,0.4), transparent)');
    screenShake();
    spawnConfetti(100);
    spawnRisingStars(cx, cy, 30, ['⭐', '✨', '💫', '🌟', '💎', '👑', '🔥', '💥']);
    setTimeout(() => { spawnLightBeams(cx, cy, 12, '#FFD700'); spawnRingPulse(cx, cy, '#FFD700'); spawnSparkles(cx, cy, 30, '#FFD700'); }, 300);
    setTimeout(() => { spawnParticles(cx, cy, 40, '#E0001D'); spawnSparkles(cx, cy, 25, '#E0001D'); }, 500);
    setTimeout(() => { spawnParticles(cx, cy, 30, '#00E5FF'); spawnRisingStars(cx, cy, 15, ['💎', '👑', '🔥']); }, 700);
  }

  await sleep(500);
  showResult(gift);

  // 结果卡上再撒点粒子
  const rc = dom.resultCard.getBoundingClientRect();
  spawnSparkles(rc.left + rc.width / 2, rc.top + rc.height / 2, 10, rarity.color);

  gameState.history.unshift({ ...gift, tier: tierIndex, time: new Date().toISOString() });
  if (gameState.history.length > 50) gameState.history.length = 50;
  saveState();

  await sleep(300);
  dom.blindBox.classList.remove('opening');
  dom.boxGlow.classList.remove('flash');
  dom.auraRing.classList.remove('active');
  dom.colorTimer.style.animationDuration = '1.5s';
  dom.colorTimer.style.background = '';
  dom.colorTimer.style.boxShadow = '';

  gameState.isDrawing = false;
  updateDrawButtons();
}

function showResult(gift) {
  const r = RARITY_CONFIG[gift.rarity];
  dom.resultRarity.textContent = r.label;
  dom.resultRarity.style.color = r.color;
  if (gift.image) {
    dom.resultEmoji.innerHTML = `<img src="${gift.image}" style="width:96px;height:96px;object-fit:contain;border-radius:16px;">`;
  } else {
    dom.resultEmoji.textContent = gift.emoji;
  }
  dom.resultName.textContent = gift.name;
  dom.resultName.style.color = r.color;
  dom.resultStars.textContent = r.stars;
  dom.resultCard.className = 'result-card';
  if (gift.rarity === 'rare') dom.resultCard.classList.add('rare-glow');
  if (gift.rarity === 'epic') dom.resultCard.classList.add('epic-glow');
  if (gift.rarity === 'legendary') dom.resultCard.classList.add('legendary-glow');
  dom.resultOverlay.classList.add('show');
}

function hideResult() { dom.resultOverlay.classList.remove('show'); }

// ===== 历史记录 =====
function updateHistoryUI() {
  if (gameState.history.length === 0) {
    dom.historyList.innerHTML = '<p class="empty-hint">还没有抽奖记录，快来试试手气吧！</p>';
  } else {
    dom.historyList.innerHTML = gameState.history.map(h => {
      const r = RARITY_CONFIG[h.rarity];
      const t = new Date(h.time);
      const ts = `${t.getMonth()+1}/${t.getDate()} ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
      return `<div class="history-item ${h.rarity}"><span class="history-item-emoji">${h.emoji}</span><div class="history-item-info"><div class="history-item-name">${h.name}</div><div class="history-item-rarity">${r.label} ${r.stars}</div></div><span class="history-item-time">${ts}</span></div>`;
    }).join('');
  }
  const total = gameState.history.length;
  const legendary = gameState.history.filter(h => h.rarity === 'legendary').length;
  const epic = gameState.history.filter(h => h.rarity === 'epic').length;
  dom.historyStats.innerHTML = `<div class="stat-item">总抽奖次数 <span>${total}</span></div><div class="stat-item">传说获得 <span>${legendary}</span></div><div class="stat-item">史诗获得 <span>${epic}</span></div><div class="stat-item">总消耗积分 <span>${gameState.history.reduce((s, h) => s + (gameState.drawTiers[h.tier]?.cost || 10), 0)}</span></div>`;
}

// ===== 设置 =====
function renderTierSettings() {
  const list = $('#giftSettingsList');
  list.innerHTML = gameState.drawTiers.map((tier, ti) => `
    <div class="tier-settings-group">
      <div class="tier-settings-header">
        <input value="${tier.name}" data-tier="${ti}" data-field="name" class="tier-name-input" placeholder="档位名称">
        <span class="tier-cost-label">消耗</span>
        <input type="number" value="${tier.cost}" data-tier="${ti}" data-field="cost" class="tier-cost-input" min="1">
        <span class="tier-cost-label">积分</span>
        <button class="btn-remove-tier" data-tier="${ti}">✕</button>
      </div>
      <div class="tier-gift-list">
        ${tier.gifts.map((g, gi) => `
          <div class="gift-setting-item">
            ${g.image
              ? `<img src="${g.image}" class="img-thumb picker-btn" data-tier="${ti}" data-index="${gi}" title="点击更换图标">`
              : `<button class="emoji-btn picker-btn" data-tier="${ti}" data-index="${gi}" title="点击选择图标">${g.emoji}</button>`}
            <input class="gift-name-input" value="${g.name}" data-tier="${ti}" data-index="${gi}" data-field="name" placeholder="奖品名称">
            <select data-tier="${ti}" data-index="${gi}" data-field="rarity">
              ${Object.entries(RARITY_CONFIG).map(([k,v]) => `<option value="${k}" ${g.rarity===k?'selected':''}>${v.label}</option>`).join('')}
            </select>
            <input class="gift-prob-input" type="number" value="${g.probability}" data-tier="${ti}" data-index="${gi}" data-field="probability" min="0" max="100" placeholder="概率%">
            <button class="btn-remove-gift" data-tier="${ti}" data-index="${gi}">✕</button>
          </div>`).join('')}
      </div>
      <button class="btn-add-gift-small" data-tier="${ti}">+ 添加奖品到此档</button>
    </div>`).join('');

  updateProbChart();

  list.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', () => {
      const ti = parseInt(el.dataset.tier), gi = parseInt(el.dataset.index), field = el.dataset.field;
      if (isNaN(ti)) return;
      if (!isNaN(gi)) {
        // 奖品级字段
        gameState.drawTiers[ti].gifts[gi][field] = field === 'probability' ? (parseInt(el.value) || 0) : el.value;
      } else {
        // 档位级字段
        if (field === 'cost') gameState.drawTiers[ti].cost = parseInt(el.value) || 1;
        else if (field === 'name') gameState.drawTiers[ti].name = el.value;
      }
      updateProbChart();
    });
  });

  list.querySelectorAll('.btn-remove-gift').forEach(btn => {
    btn.addEventListener('click', () => {
      const ti = parseInt(btn.dataset.tier), gi = parseInt(btn.dataset.index);
      if (isNaN(ti) || isNaN(gi)) return;
      if (gameState.drawTiers[ti].gifts.length <= 2) { alert('每档至少保留2个奖品'); return; }
      gameState.drawTiers[ti].gifts.splice(gi, 1);
      renderTierSettings();
    });
  });

  list.querySelectorAll('.btn-remove-tier').forEach(btn => {
    btn.addEventListener('click', () => {
      const ti = parseInt(btn.dataset.tier);
      if (isNaN(ti)) return;
      if (gameState.drawTiers.length <= 1) { alert('至少保留1个档位'); return; }
      gameState.drawTiers.splice(ti, 1);
      renderTierSettings();
    });
  });

  list.querySelectorAll('.btn-add-gift-small').forEach(btn => {
    btn.addEventListener('click', () => {
      const ti = parseInt(btn.dataset.tier);
      if (isNaN(ti)) return;
      const newId = Math.max(0, ...gameState.drawTiers[ti].gifts.map(g => g.id)) + 1;
      gameState.drawTiers[ti].gifts.push({ id: newId, name: '新奖品', emoji: '🎁', rarity: 'common', probability: 5 });
      renderTierSettings();
    });
  });

  // Emoji 选择器（仅绑定每轮新建的 .picker-btn）
  bindPickerButtons(list);
}

// ===== Emoji 选择器 =====
const EMOJI_CATEGORIES = {
  faces: ['😀','😂','🤩','😎','🥳','😍','🤗','😇','🤔','😏','😤','🥺','😱','🤯','😴','💀','👻','🤖','👽','🎃','😺','💩','👶','🧒'],
  objects: ['🎁','💎','🪙','🔮','⚡','🌟','🏅','🃏','🎮','📱','💻','⌚','🚗','🚀','🏠','🎒','📚','✏️','🎨','🎵','🔬','⚽','🏆','🎹'],
  symbols: ['❤️','💛','💚','💙','💜','🖤','💯','✨','🔥','💥','🌈','❄️','💧','🎵','✅','❌','💫','⭐','🟢','🔴','🟡','🔵','🟣','⚪'],
  nature: ['🌸','🌺','🌻','🌹','🍀','🌲','🌊','☀️','🌙','⛅','🌈','⭐','🌍','🔥','💧','🍎','🍕','🎂','🍦','☕','🍺','🥇','🎯','💪'],
};

let pickerTarget = null;
let pickerActiveCat = 'faces';
let pickerInitialized = false;

function initEmojiPickerOnce() {
  if (pickerInitialized) return;
  pickerInitialized = true;

  const picker = $('#emojiPicker');
  const grid = $('#emojiGrid');

  // 分类切换
  picker.querySelectorAll('.emoji-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      picker.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      pickerActiveCat = tab.dataset.cat;
      const isCustom = pickerActiveCat === 'custom';
      grid.style.display = isCustom ? 'none' : 'grid';
      $('#emojiCustom').style.display = isCustom ? 'flex' : 'none';
      renderEmojiGrid(grid, pickerActiveCat);
    });
  });

  // 图片上传（只绑定一次）
  $('#btnUploadImage').addEventListener('click', () => $('#imageFileInput').click());
  $('#imageFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const canvas = $('#imagePreviewCanvas');
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(120 / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.style.display = 'block';
        $('#btnUseImage').style.display = 'inline-block';
        $('#btnUseImage').dataset.url = canvas.toDataURL('image/jpeg', 0.7);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  $('#btnUseImage').addEventListener('click', () => {
    const url = $('#btnUseImage').dataset.url;
    if (url && pickerTarget) {
      const gift = gameState.drawTiers[pickerTarget.tier].gifts[pickerTarget.index];
      gift.image = url;
      renderTierSettings();
      hidePicker();
    }
  });

  $('#imageUrlInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && pickerTarget) {
      const url = e.target.value.trim();
      if (url) {
        const gift = gameState.drawTiers[pickerTarget.tier].gifts[pickerTarget.index];
        gift.image = url;
        renderTierSettings();
        hidePicker();
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target) && !e.target.closest('.picker-btn')) {
      hidePicker();
    }
  });
}

function bindPickerButtons(list) {
  list.querySelectorAll('.picker-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ti = parseInt(btn.dataset.tier), gi = parseInt(btn.dataset.index);
      if (isNaN(ti) || isNaN(gi)) return;
      pickerTarget = { tier: ti, index: gi };
      const picker = $('#emojiPicker');
      const rect = btn.getBoundingClientRect();
      picker.style.display = 'block';
      picker.style.left = Math.min(rect.left, window.innerWidth - 340) + 'px';
      picker.style.top = (rect.bottom + 4 > window.innerHeight - 300 ? rect.top - 310 : rect.bottom + 4) + 'px';
      pickerActiveCat = pickerActiveCat || 'faces';
      renderEmojiGrid($('#emojiGrid'), pickerActiveCat);
      $('#emojiCustom').style.display = pickerActiveCat === 'custom' ? 'flex' : 'none';
      $('#imageUrlInput').value = '';
      $('#imagePreviewCanvas').style.display = 'none';
      $('#btnUseImage').style.display = 'none';
    });
  });
}

function renderEmojiGrid(grid, cat) {
  if (cat === 'custom') return;
  const emojis = EMOJI_CATEGORIES[cat] || EMOJI_CATEGORIES.faces;
  grid.innerHTML = emojis.map(e => `<span data-emoji="${e}">${e}</span>`).join('');
  grid.querySelectorAll('span').forEach(span => {
    span.addEventListener('click', () => {
      if (pickerTarget) {
        const gift = gameState.drawTiers[pickerTarget.tier].gifts[pickerTarget.index];
        gift.emoji = span.dataset.emoji;
        gift.image = null;
        renderTierSettings();
      }
      hidePicker();
    });
  });
}

function hidePicker() {
  $('#emojiPicker').style.display = 'none';
  pickerTarget = null;
}

function updateProbChart() {
  const chart = $('#probChart');
  chart.innerHTML = gameState.drawTiers.map((tier, ti) => {
    const total = tier.gifts.reduce((s, g) => s + g.probability, 0) || 1;
    return `<div style="margin-bottom:6px;"><strong>${tier.name}</strong> (${tier.cost}分)<div class="prob-chart-bars" style="display:flex;height:22px;border-radius:6px;overflow:hidden;margin-top:2px;">${tier.gifts.map(g => { const pct = g.probability / total * 100; return `<div style="flex:${pct||.001};background:${RARITY_CONFIG[g.rarity].color};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff">${pct.toFixed(0)}%</div>`; }).join('')}</div></div>`;
  }).join('');
}

// ===== 背景粒子 =====
function initBackgroundParticles() {
  const canvas = dom.bgCanvas, ctx = canvas.getContext('2d');
  let particles = [];
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  for (let i = 0; i < 50; i++) {
    particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 2 + 0.5, speedX: (Math.random() - 0.5) * 0.3, speedY: (Math.random() - 0.5) * 0.3, opacity: Math.random() * 0.3 + 0.05 });
  }
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.speedX; p.y += p.speedY;
      if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.opacity})`; ctx.fill();
      for (const p2 of particles) {
        const dx = p.x - p2.x, dy = p.y - p2.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.strokeStyle = `rgba(255,255,255,${0.03*(1-dist/100)})`; ctx.stroke(); }
      }
    }
    requestAnimationFrame(animate);
  }
  animate();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== 事件 =====
function bindEvents() {
  dom.resultClose.addEventListener('click', hideResult);
  dom.resultOverlay.addEventListener('click', e => { if (e.target === dom.resultOverlay) hideResult(); });

  $('#btnHistory').addEventListener('click', () => { updateHistoryUI(); dom.historySidebar.classList.add('open'); });
  $('#btnHistoryClose').addEventListener('click', () => { dom.historySidebar.classList.remove('open'); });
  $('#btnGoTracker').addEventListener('click', () => { window.location.href = 'kids-points-tracker.html'; });

  $('#btnSettings').addEventListener('click', () => {
    initEmojiPickerOnce();
    $('#setDailyReward').value = gameState.dailyReward;
    renderTierSettings();
    dom.settingsOverlay.classList.add('show');
  });
  $('#btnSettingsClose').addEventListener('click', () => { dom.settingsOverlay.classList.remove('show'); });
  dom.settingsOverlay.addEventListener('click', e => { if (e.target === dom.settingsOverlay) dom.settingsOverlay.classList.remove('show'); });

  $('#btnSaveSettings').addEventListener('click', () => {
    gameState.dailyReward = parseInt($('#setDailyReward').value) || 0;
    saveState(); updateAllUI(); dom.settingsOverlay.classList.remove('show');
  });

  $('#btnResetDefault').addEventListener('click', () => {
    if (!confirm('确定要恢复默认设置吗？奖品池和抽奖记录将被重置，积分保持不变。')) return;
    gameState.dailyReward = DEFAULT_DAILY_REWARD;
    gameState.drawTiers = JSON.parse(JSON.stringify(DEFAULT_TIERS));
    gameState.history = [];
    saveState(); updateAllUI(); renderTierSettings(); dom.settingsOverlay.classList.remove('show');
  });

  $('#btnAddTier').addEventListener('click', () => {
    gameState.drawTiers.push({ name: '新档位', cost: 20, gifts: [
      { id: 1, name: '普通礼物', emoji: '🎁', rarity: 'common', probability: 50 },
      { id: 2, name: '稀有礼物', emoji: '✨', rarity: 'rare', probability: 50 },
    ]});
    renderTierSettings();
  });

  $('#btnDaily').addEventListener('click', () => {
    const today = new Date().toDateString();
    if (gameState.lastDailyDate === today) { alert('今天已经签到过了，明天再来吧！'); return; }
    gameState.lastDailyDate = today;
    gameState.points += gameState.dailyReward;
    $('#dailyRewardAmount').textContent = gameState.dailyReward;
    dom.dailyOverlay.classList.add('show');
    updateAllUI(); saveState();
  });
  $('#dailyClose').addEventListener('click', () => { dom.dailyOverlay.classList.remove('show'); });
  dom.dailyOverlay.addEventListener('click', e => { if (e.target === dom.dailyOverlay) dom.dailyOverlay.classList.remove('show'); });

  $('#btnExportAll').addEventListener('click', () => {
    const data = getFullExportData();
    if (!data) { alert('数据未加载'); return; }
    data.exportTime = new Date().toISOString(); data.version = '2.0';
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const d = new Date();
    const a = document.createElement('a');
    a.href = url; a.download = `全量备份_${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  });

  $('#btnImportAll').addEventListener('click', () => { $('#importAllFile').click(); });
  $('#importAllFile').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(ev) {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.blindBox && !data.tracker) { alert('无效的备份文件格式！'); return; }
        if (!confirm(`确定恢复备份？\n积分: ${data.sharedPoints ?? '未知'}\n将覆盖所有数据！`)) { e.target.value = ''; return; }
        const res = await fetch('/family/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error('Server error');
        alert('恢复成功！页面将刷新。'); location.reload();
      } catch (err) { alert('恢复失败: ' + err.message); }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { hideResult(); dom.historySidebar.classList.remove('open'); dom.settingsOverlay.classList.remove('show'); dom.dailyOverlay.classList.remove('show'); }
  });

  window.addEventListener('beforeunload', () => { saveAppDataNow(); });
}

async function init() {
  try {
    await loadAppData();
    $('#syncStatus').textContent = '🟢 已连接';
  } catch (e) {
    $('#syncStatus').textContent = '🔴 未连接';
    alert('无法连接到服务器，请确认服务器已启动。\n\n' + e.message);
    return;
  }
  loadState();
  initBackgroundParticles();
  updateAllUI();
  bindEvents();
}

init();
