// ===== 服务端数据层（唯一数据源）=====
const DATA_URL = '/api/data';

let appData = null;      // 内存中的数据
let ready = false;       // 数据是否已加载
let saveTimer = null;    // 防抖保存

// 加载数据（页面启动时调用，必须成功）
async function loadAppData() {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error('服务器返回 ' + res.status);
  appData = await res.json();
  if (!appData || typeof appData.sharedPoints !== 'number') {
    throw new Error('服务器数据格式异常，请检查 data.json');
  }
  ready = true;
  return appData;
}

// 保存数据（防抖，避免频繁请求）
function saveAppData() {
  if (!ready || !appData) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const res = await fetch(DATA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData),
      });
      if (!res.ok) console.error('保存失败: ' + res.status);
    } catch (e) {
      console.error('保存失败:', e.message);
    }
  }, 300);
}

// 立即保存（页面关闭前）
function saveAppDataNow() {
  if (!ready || !appData) return;
  clearTimeout(saveTimer);
  fetch(DATA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appData),
    keepalive: true,
  }).catch(() => {});
}

// ===== 积分 =====
function getPoints() {
  return ready ? appData.sharedPoints : null;
}

function setPoints(val) {
  if (!ready) return;
  appData.sharedPoints = Math.max(0, val);
  saveAppData();
}

function addPoints(amount) {
  if (!ready) return;
  appData.sharedPoints = Math.max(0, appData.sharedPoints + amount);
  saveAppData();
}

function deductPoints(amount) {
  if (!ready) return false;
  if (appData.sharedPoints < amount) return false;
  appData.sharedPoints -= amount;
  saveAppData();
  return true;
}

// ===== 盲盒配置 =====
function getBlindBox() {
  if (!ready) return null;
  if (!appData.blindBox) {
    appData.blindBox = { drawCost: 10, dailyReward: 1, lastDailyDate: null, gifts: [], history: [] };
  }
  return appData.blindBox;
}

function saveBlindBox(cfg) {
  if (!ready) return;
  appData.blindBox = cfg;
  saveAppData();
}

// ===== 任务追踪 =====
function getTracker() {
  if (!ready) return null;
  if (!appData.tracker) {
    appData.tracker = { goals: [], records: [], settings: { targetPoints: 100, rewardText: '神秘奖励' } };
  }
  return appData.tracker;
}

function saveTracker(t) {
  if (!ready) return;
  appData.tracker = t;
  saveAppData();
}

// 完成一个任务（添加积分 + 记录）
function addTaskRecord(goal) {
  if (!ready) return;
  const tracker = getTracker();
  const record = {
    id: Date.now(),
    goalId: goal.id,
    name: goal.name,
    points: goal.points,
    icon: goal.icon,
    time: new Date().toISOString(),
    note: '',
  };
  tracker.records.push(record);
  appData.sharedPoints = Math.max(0, appData.sharedPoints + goal.points);
  saveAppData();
  return record;
}

// ===== 备份 =====
function getFullExportData() {
  if (!ready) return null;
  return JSON.parse(JSON.stringify(appData));
}
