// ===== 默认配置（仅首次使用）=====
const DEFAULT_GIFTS = [
  { id: 1, name: '能量金币', emoji: '🪙', rarity: 'common', probability: 40 },
  { id: 2, name: '光之水晶', emoji: '💎', rarity: 'common', probability: 25 },
  { id: 3, name: '怪兽卡片', emoji: '🃏', rarity: 'rare', probability: 15 },
  { id: 4, name: '等离子火花', emoji: '⚡', rarity: 'rare', probability: 10 },
  { id: 5, name: '奥特勋章', emoji: '🏅', rarity: 'epic', probability: 6 },
  { id: 6, name: '变身器碎片', emoji: '🌟', rarity: 'epic', probability: 3 },
  { id: 7, name: 'M78星云宝石', emoji: '🔮', rarity: 'legendary', probability: 1 },
];

const DEFAULT_POINTS = 100;
const DEFAULT_DRAW_COST = 10;
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
  drawCost: DEFAULT_DRAW_COST,
  dailyReward: DEFAULT_DAILY_REWARD,
  gifts: JSON.parse(JSON.stringify(DEFAULT_GIFTS)),
  history: [],
  isDrawing: false,
  lastDailyDate: null,
};

// ===== DOM 缓存 =====
const $ = (sel) => document.querySelector(sel);

const dom = {
  pointsValue: $('#pointsValue'),
  drawCost: $('#drawCost'),
  drawBtn: $('#drawBtn'),
  blindBox: $('#blindBox'),
  auraRing: $('#auraRing'),
  boxGlow: $('.box-glow'),
  colorTimer: $('#colorTimer'),
  machineContainer: $('#machineContainer'),
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

// ===== 数据读写（通过服务端）=====
function loadState() {
  const pts = getPoints();
  gameState.points = (pts !== null && pts >= 0) ? pts : DEFAULT_POINTS;

  const bb = getBlindBox();
  if (bb) {
    gameState.drawCost = bb.drawCost ?? DEFAULT_DRAW_COST;
    gameState.dailyReward = bb.dailyReward ?? DEFAULT_DAILY_REWARD;
    gameState.gifts = bb.gifts?.length ? bb.gifts : JSON.parse(JSON.stringify(DEFAULT_GIFTS));
    gameState.history = bb.history ?? [];
    gameState.lastDailyDate = bb.lastDailyDate ?? null;
  }
}

function saveState() {
  setPoints(gameState.points);
  saveBlindBox({
    drawCost: gameState.drawCost,
    dailyReward: gameState.dailyReward,
    gifts: gameState.gifts,
    history: gameState.history.slice(-50),
    lastDailyDate: gameState.lastDailyDate,
  });
}

// ===== 更新 UI =====
function updatePoints() {
  dom.pointsValue.textContent = gameState.points;
  dom.pointsValue.classList.remove('bump');
  void dom.pointsValue.offsetWidth;
  dom.pointsValue.classList.add('bump');
}

function updateDrawButton() {
  dom.drawCost.textContent = gameState.drawCost;
  dom.drawBtn.disabled = gameState.points < gameState.drawCost || gameState.isDrawing;
}

function updatePrizeGrid() {
  dom.prizeGrid.innerHTML = gameState.gifts.map(g => `
    <div class="prize-card" data-rarity="${g.rarity}">
      <span class="prize-emoji">${g.emoji}</span>
      <span class="prize-name">${g.name}</span>
      <span class="prize-rarity-badge ${g.rarity}">${RARITY_CONFIG[g.rarity].label}</span>
      <span class="prize-prob">概率 ${g.probability}%</span>
    </div>
  `).join('');
}

function updateAllUI() {
  updatePoints();
  updateDrawButton();
  updatePrizeGrid();
}

// ===== 概率抽奖算法 =====
function drawGift() {
  const totalProb = gameState.gifts.reduce((sum, g) => sum + g.probability, 0);
  let rand = Math.random() * totalProb;
  for (const gift of gameState.gifts) {
    rand -= gift.probability;
    if (rand <= 0) return gift;
  }
  return gameState.gifts[gameState.gifts.length - 1];
}

// ===== 特效系统 =====
function spawnParticles(x, y, count, color) {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const distance = 80 + Math.random() * 140;
    p.style.cssText = `
      left: ${x}px; top: ${y}px;
      width: ${4 + Math.random() * 8}px;
      height: ${4 + Math.random() * 8}px;
      background: ${color};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      --dx: ${Math.cos(angle) * distance}px;
      --dy: ${Math.sin(angle) * distance}px;
      box-shadow: 0 0 6px ${color};
    `;
    fragment.appendChild(p);
  }
  dom.effectsLayer.appendChild(fragment);
  setTimeout(() => {
    dom.effectsLayer.querySelectorAll('.particle').forEach(el => el.remove());
  }, 1500);
}

function spawnConfetti(count) {
  const colors = ['#FFD700', '#E0001D', '#3B82F6', '#A855F7', '#00E5FF', '#FF6B6B', '#51CF66'];
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.cssText = `
      left: ${Math.random() * 100}vw;
      top: -20px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-delay: ${Math.random() * 0.6}s;
      animation-duration: ${2 + Math.random() * 2}s;
      width: ${6 + Math.random() * 12}px;
      height: ${6 + Math.random() * 12}px;
      transform: rotate(${Math.random() * 360}deg);
    `;
    fragment.appendChild(c);
  }
  dom.effectsLayer.appendChild(fragment);
  setTimeout(() => {
    dom.effectsLayer.querySelectorAll('.confetti').forEach(el => el.remove());
  }, 4000);
}

function screenShake() {
  document.body.classList.add('screen-shake');
  setTimeout(() => document.body.classList.remove('screen-shake'), 500);
}

// ===== 抽奖流程 =====
async function performDraw() {
  if (gameState.isDrawing) return;
  if (gameState.points < gameState.drawCost) return;

  gameState.isDrawing = true;
  gameState.points -= gameState.drawCost;
  updatePoints();
  updateDrawButton();
  saveState();

  // 盲盒震动
  dom.blindBox.classList.add('shaking');
  dom.auraRing.classList.add('active');
  dom.colorTimer.style.animationDuration = '0.3s';
  dom.colorTimer.style.background = '#ff4444';
  dom.colorTimer.style.boxShadow = '0 0 20px #ff4444';

  const gift = drawGift();
  const rarity = RARITY_CONFIG[gift.rarity];

  await sleep(1200);

  // 开盒闪光
  dom.blindBox.classList.remove('shaking');
  dom.blindBox.classList.add('opening');
  dom.boxGlow.classList.add('flash');

  const boxRect = dom.blindBox.getBoundingClientRect();
  const cx = boxRect.left + boxRect.width / 2;
  const cy = boxRect.top + boxRect.height / 2;

  spawnParticles(cx, cy, 16, rarity.color);

  if (gift.rarity === 'epic') {
    spawnConfetti(40);
  }

  if (gift.rarity === 'legendary') {
    spawnConfetti(80);
    screenShake();
    setTimeout(() => spawnParticles(cx, cy, 30, '#FFD700'), 200);
    setTimeout(() => spawnParticles(cx, cy, 20, '#E0001D'), 400);
    setTimeout(() => spawnParticles(cx, cy, 20, '#00E5FF'), 600);
  }

  await sleep(500);
  showResult(gift);

  // 记录历史
  gameState.history.unshift({ ...gift, time: new Date().toISOString() });
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
  updateDrawButton();
}

function showResult(gift) {
  const rarity = RARITY_CONFIG[gift.rarity];
  dom.resultRarity.textContent = rarity.label;
  dom.resultRarity.style.color = rarity.color;
  dom.resultEmoji.textContent = gift.emoji;
  dom.resultName.textContent = gift.name;
  dom.resultName.style.color = rarity.color;
  dom.resultStars.textContent = rarity.stars;

  dom.resultCard.className = 'result-card';
  if (gift.rarity === 'rare') dom.resultCard.classList.add('rare-glow');
  if (gift.rarity === 'epic') dom.resultCard.classList.add('epic-glow');
  if (gift.rarity === 'legendary') dom.resultCard.classList.add('legendary-glow');

  dom.resultOverlay.classList.add('show');
}

function hideResult() {
  dom.resultOverlay.classList.remove('show');
}

// ===== 历史记录 =====
function updateHistoryUI() {
  if (gameState.history.length === 0) {
    dom.historyList.innerHTML = '<p class="empty-hint">还没有抽奖记录，快来试试手气吧！</p>';
  } else {
    dom.historyList.innerHTML = gameState.history.map(h => {
      const rarity = RARITY_CONFIG[h.rarity];
      const time = new Date(h.time);
      const timeStr = `${time.getMonth() + 1}/${time.getDate()} ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
      return `
        <div class="history-item ${h.rarity}">
          <span class="history-item-emoji">${h.emoji}</span>
          <div class="history-item-info">
            <div class="history-item-name">${h.name}</div>
            <div class="history-item-rarity">${rarity.label} ${rarity.stars}</div>
          </div>
          <span class="history-item-time">${timeStr}</span>
        </div>
      `;
    }).join('');
  }

  const total = gameState.history.length;
  const legendary = gameState.history.filter(h => h.rarity === 'legendary').length;
  const epic = gameState.history.filter(h => h.rarity === 'epic').length;
  dom.historyStats.innerHTML = `
    <div class="stat-item">总抽奖次数 <span>${total}</span></div>
    <div class="stat-item">传说获得 <span>${legendary}</span></div>
    <div class="stat-item">史诗获得 <span>${epic}</span></div>
    <div class="stat-item">总消耗积分 <span>${total * gameState.drawCost}</span></div>
  `;
}

// ===== 设置面板 =====
function renderGiftSettings() {
  const list = $('#giftSettingsList');
  list.innerHTML = gameState.gifts.map((g, i) => `
    <div class="gift-setting-item">
      <input class="gift-emoji-input" value="${g.emoji}" data-index="${i}" data-field="emoji" maxlength="4">
      <input class="gift-name-input" value="${g.name}" data-index="${i}" data-field="name" placeholder="奖品名称">
      <select data-index="${i}" data-field="rarity">
        ${Object.entries(RARITY_CONFIG).map(([k, v]) =>
          `<option value="${k}" ${g.rarity === k ? 'selected' : ''}>${v.label}</option>`
        ).join('')}
      </select>
      <input class="gift-prob-input" type="number" value="${g.probability}" data-index="${i}" data-field="probability" min="0" max="100" placeholder="概率%">
      <button class="btn-remove-gift" data-index="${i}">✕</button>
    </div>
  `).join('');

  updateProbChart();
}

function updateProbChart() {
  const chart = $('#probChart');
  chart.innerHTML = gameState.gifts.map(g => {
    const totalProb = gameState.gifts.reduce((s, g2) => s + g2.probability, 0);
    const pct = totalProb > 0 ? (g.probability / totalProb * 100) : 0;
    return `<div class="prob-bar" style="flex:${pct || 0.001}; background:${RARITY_CONFIG[g.rarity].color};">${pct.toFixed(0)}%</div>`;
  }).join('');
}

function bindGiftSettingsEvents() {
  const list = $('#giftSettingsList');

  list.addEventListener('input', (e) => {
    const idx = parseInt(e.target.dataset.index);
    const field = e.target.dataset.field;
    if (isNaN(idx)) return;
    if (field === 'probability') {
      gameState.gifts[idx][field] = parseInt(e.target.value) || 0;
    } else {
      gameState.gifts[idx][field] = e.target.value;
    }
    updateProbChart();
  });

  list.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove-gift')) {
      const idx = parseInt(e.target.dataset.index);
      if (isNaN(idx)) return;
      if (gameState.gifts.length <= 2) {
        alert('至少保留2个奖品');
        return;
      }
      gameState.gifts.splice(idx, 1);
      renderGiftSettings();
    }
  });
}

// ===== 背景粒子系统 =====
function initBackgroundParticles() {
  const canvas = dom.bgCanvas;
  const ctx = canvas.getContext('2d');
  let particles = [];
  const maxParticles = 50;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < maxParticles; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.3 + 0.05,
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
      ctx.fill();

      for (const p2 of particles) {
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255,255,255,${0.03 * (1 - dist / 100)})`;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animate);
  }
  animate();
}

// ===== 工具函数 =====
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== 事件绑定 =====
function bindEvents() {
  // 抽奖
  dom.drawBtn.addEventListener('click', performDraw);

  // 结果关闭
  dom.resultClose.addEventListener('click', hideResult);
  dom.resultOverlay.addEventListener('click', (e) => {
    if (e.target === dom.resultOverlay) hideResult();
  });

  // 历史侧边栏
  $('#btnHistory').addEventListener('click', () => {
    updateHistoryUI();
    dom.historySidebar.classList.add('open');
  });
  $('#btnHistoryClose').addEventListener('click', () => {
    dom.historySidebar.classList.remove('open');
  });

  // 跳转任务页
  $('#btnGoTracker').addEventListener('click', () => {
    window.location.href = 'kids-points-tracker.html';
  });

  // 设置
  $('#btnSettings').addEventListener('click', () => {
    $('#setPoints').value = gameState.points;
    $('#setDrawCost').value = gameState.drawCost;
    $('#setDailyReward').value = gameState.dailyReward;
    renderGiftSettings();
    bindGiftSettingsEvents();
    dom.settingsOverlay.classList.add('show');
  });
  $('#btnSettingsClose').addEventListener('click', () => {
    dom.settingsOverlay.classList.remove('show');
  });
  dom.settingsOverlay.addEventListener('click', (e) => {
    if (e.target === dom.settingsOverlay) dom.settingsOverlay.classList.remove('show');
  });

  // 保存设置
  $('#btnSaveSettings').addEventListener('click', () => {
    gameState.points = parseInt($('#setPoints').value) || 0;
    gameState.drawCost = parseInt($('#setDrawCost').value) || 1;
    gameState.dailyReward = parseInt($('#setDailyReward').value) || 0;
    saveState();
    updateAllUI();
    renderGiftSettings();
    bindGiftSettingsEvents();
    dom.settingsOverlay.classList.remove('show');
  });

  // 恢复默认
  $('#btnResetDefault').addEventListener('click', () => {
    if (!confirm('确定要恢复默认设置吗？奖品池和抽奖记录将被重置，积分保持不变。')) return;
    gameState.drawCost = DEFAULT_DRAW_COST;
    gameState.dailyReward = DEFAULT_DAILY_REWARD;
    gameState.gifts = JSON.parse(JSON.stringify(DEFAULT_GIFTS));
    gameState.history = [];
    saveState();
    updateAllUI();
    renderGiftSettings();
    bindGiftSettingsEvents();
  });

  // 添加奖品
  $('#btnAddGift').addEventListener('click', () => {
    const newId = Math.max(0, ...gameState.gifts.map(g => g.id)) + 1;
    gameState.gifts.push({ id: newId, name: '新奖品', emoji: '🎁', rarity: 'common', probability: 5 });
    renderGiftSettings();
    bindGiftSettingsEvents();
  });

  // 每日签到
  $('#btnDaily').addEventListener('click', () => {
    const today = new Date().toDateString();
    if (gameState.lastDailyDate === today) {
      alert('今天已经签到过了，明天再来吧！');
      return;
    }
    gameState.lastDailyDate = today;
    gameState.points += gameState.dailyReward;
    $('#dailyRewardAmount').textContent = gameState.dailyReward;
    dom.dailyOverlay.classList.add('show');
    updateAllUI();
    saveState();
  });
  $('#dailyClose').addEventListener('click', () => {
    dom.dailyOverlay.classList.remove('show');
  });
  dom.dailyOverlay.addEventListener('click', (e) => {
    if (e.target === dom.dailyOverlay) dom.dailyOverlay.classList.remove('show');
  });

  // 全量导出
  $('#btnExportAll').addEventListener('click', () => {
    const data = getFullExportData();
    if (!data) { alert('数据未加载'); return; }
    data.exportTime = new Date().toISOString();
    data.version = '2.0';
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const date = new Date();
    const dateStr = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `全量备份_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // 全量导入
  $('#btnImportAll').addEventListener('click', () => {
    $('#importAllFile').click();
  });
  $('#importAllFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(ev) {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.blindBox && !data.tracker) {
          alert('❌ 无效的备份文件格式！');
          return;
        }
        const confirmMsg = `确定要恢复全量备份吗？\n\n` +
          `📅 备份时间: ${data.exportTime ? new Date(data.exportTime).toLocaleString('zh-CN') : '未知'}\n` +
          `⭐ 可用积分: ${data.sharedPoints ?? '未知'}\n\n` +
          `⚠️ 这将覆盖当前所有数据！`;
        if (!confirm(confirmMsg)) { e.target.value = ''; return; }

        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Server error');
        alert('✅ 数据恢复成功！页面将刷新。');
        location.reload();
      } catch (err) {
        alert('❌ 恢复失败: ' + err.message);
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  // 更新备份时间
  $('#lastBackupTimeBlind').textContent = '数据已存储在服务器';

  // 键盘关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideResult();
      dom.historySidebar.classList.remove('open');
      dom.settingsOverlay.classList.remove('show');
      dom.dailyOverlay.classList.remove('show');
    }
  });

  // 页面关闭前确保数据已保存
  window.addEventListener('beforeunload', () => {
    saveAppDataNow();
  });
}

// ===== 初始化 =====
async function init() {
  try {
    await loadAppData();
    $('#syncStatus').textContent = '🟢 已连接';
  } catch (e) {
    console.error('服务器连接失败:', e.message);
    $('#syncStatus').textContent = '🔴 未连接';
    alert('⚠️ 无法连接到服务器，请确认服务器已启动。\n\n' + e.message);
    return;
  }

  loadState();
  initBackgroundParticles();
  updateAllUI();
  bindEvents();
}

init();
