// ===== 服务端数据同步 =====
const API_BASE = window.location.origin;
const DATA_URL = API_BASE + '/api/data';

let serverAvailable = false;
let syncTimer = null;

async function apiGetData() {
  try {
    const res = await fetch(DATA_URL, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error('Server error: ' + res.status);
    serverAvailable = true;
    return await res.json();
  } catch (e) {
    serverAvailable = false;
    console.warn('服务器不可用，使用本地缓存:', e.message);
    return null;
  }
}

async function apiSaveData(data) {
  try {
    const res = await fetch(DATA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error('Server error: ' + res.status);
    serverAvailable = true;
    // 同时存一份到 localStorage 作为离线缓存
    localStorage.setItem('offlineCache', JSON.stringify(data));
    return true;
  } catch (e) {
    serverAvailable = false;
    console.warn('保存到服务器失败，存入本地缓存:', e.message);
    // 服务器挂了也存本地，等恢复后再同步
    localStorage.setItem('offlineCache', JSON.stringify(data));
    return false;
  }
}

// 构建全量数据对象
function buildFullData(sharedPoints, blindBoxData, trackerData) {
  return {
    sharedPoints: sharedPoints,
    blindBox: blindBoxData || {},
    tracker: trackerData || {},
  };
}

// 检查是否有离线缓存需要同步到服务器
async function syncOfflineCache() {
  const cached = localStorage.getItem('offlineCache');
  if (cached) {
    try {
      const data = JSON.parse(cached);
      const success = await apiSaveData(data);
      if (success) {
        console.log('✅ 离线缓存已同步到服务器');
      }
    } catch (e) {
      // ignore
    }
  }
}

// 显示同步状态
function updateSyncIndicator() {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  if (serverAvailable) {
    el.textContent = '🟢 已连接';
    el.style.color = '#2ecc71';
  } else {
    el.textContent = '🔴 离线';
    el.style.color = '#e74c3c';
  }
}

// 初始化同步
async function initApiSync() {
  const data = await apiGetData();
  if (data) {
    // 服务器有数据 → 同步到本地
    if (data.sharedPoints !== undefined) {
      localStorage.setItem('sharedPoints', String(data.sharedPoints));
    }
    if (data.blindBox) {
      localStorage.setItem('ultraman-blindbox', JSON.stringify(data.blindBox));
    }
    if (data.tracker) {
      if (data.tracker.goals) localStorage.setItem('pointsGoals', JSON.stringify(data.tracker.goals));
      if (data.tracker.records) localStorage.setItem('pointsRecords', JSON.stringify(data.tracker.records));
      if (data.tracker.settings) localStorage.setItem('pointsSettings', JSON.stringify(data.tracker.settings));
    }
  } else {
    // 服务器不可用，尝试同步离线缓存
    await syncOfflineCache();
  }
  updateSyncIndicator();
}
