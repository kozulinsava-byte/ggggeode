// ========== MAIN МОДУЛЬ: ЖЁСТКИЙ ПОРЯДОК ЗАГРУЗКИ · ФАЗА 1 → 2 → 3 ==========
import { initializeState, validateState, startGameSystems, showSkeleton, forceCleanupAllOverlays, terminateEvent, playerState } from './core.js?v=002';
import { setActiveTab, closeShowcase, closeModal } from './ui.js?v=002';

// ========== TELEGRAM (ТИХАЯ ИНИЦИАЛИЗАЦИЯ) ==========
const tg = window.Telegram?.WebApp;
if (tg) {
  try {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor('#000000'); } catch(e) {}
    try { tg.setBackgroundColor('#000000'); } catch(e) {}
    console.log('[StarForge] Telegram WebApp ready');
  } catch(e) {
    console.warn('[StarForge] Telegram init delayed');
  }
}

// ========== ГЛОБАЛЬНЫЕ СОБЫТИЯ (ПОСЛЕ ЗАГРУЗКИ DOM) ==========
function bindGlobalEvents() {
  console.log('[StarForge] Binding global events...');
  
  // Витрина
  const showcaseCloseBtn = document.getElementById('showcaseClose');
  const showcaseOverlayEl = document.getElementById('showcaseOverlay');
  if (showcaseCloseBtn) showcaseCloseBtn.addEventListener('click', closeShowcase);
  if (showcaseOverlayEl) {
    showcaseOverlayEl.addEventListener('click', (e) => {
      if (e.target === showcaseOverlayEl) closeShowcase();
    });
  }
  
  // Модалки
  document.addEventListener('closeModal', closeModal);
  const modalOverlayEl = document.getElementById('modalOverlay');
  if (modalOverlayEl) {
    modalOverlayEl.addEventListener('click', (e) => {
      if (e.target === modalOverlayEl) closeModal();
    });
  }
  
  // Метеоритный Шторм (заглушка)
  const stormExitBtn = document.getElementById('meteorStormExitBtn');
  if (stormExitBtn) {
    stormExitBtn.addEventListener('click', () => {
      import('./core.js').then(core => core.exitMeteorStormEarly());
    });
  }
  
  // Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      console.log('[StarForge] Escape — force cleanup');
      forceCleanupAllOverlays();
      closeModal();
      closeShowcase();
      terminateEvent();
    }
  });
  
  console.log('[StarForge] Global events bound');
}

// ========== ПРЕЛОАДЕР ==========
const preloader = document.getElementById('preloader');
const preloaderBar = document.getElementById('preloaderBar');
const preloaderPercent = document.getElementById('preloaderPercent');
const preloaderText = document.getElementById('preloaderText');

function updatePreloader(percent, text) {
  if (preloaderBar) preloaderBar.style.width = percent + '%';
  if (preloaderPercent) preloaderPercent.textContent = percent + '%';
  if (preloaderText) preloaderText.textContent = text;
}

function hidePreloader() {
  if (preloader) {
    preloader.classList.add('hidden');
    setTimeout(() => {
      if (preloader) preloader.style.display = 'none';
    }, 500);
  }
}

// ========== ASSET MANAGER ==========
class AssetManager {
  constructor() {
    this.totalAssets = 0;
    this.loadedCount = 0;
    this.maxRetries = 3;
    this.paths = [];
  }

  collectPaths() {
    const paths = new Set();
    
    import('./config.js?v=002').then(({ CONFIG_ITEMS, CONFIG_GEODES, CONFIG_EXPEDITIONS }) => {
      Object.values(CONFIG_ITEMS).forEach(item => {
        if (item.imagePath) paths.add(item.imagePath);
      });
      
      Object.values(CONFIG_GEODES).forEach(geode => {
        if (geode.stages) {
          geode.stages.forEach(stage => {
            if (stage.imagePath) paths.add(stage.imagePath);
          });
        }
      });
      
      Object.values(CONFIG_EXPEDITIONS).forEach(exp => {
        if (exp.imagePath) paths.add(exp.imagePath);
      });
      
      this.paths = [...paths];
      this.totalAssets = this.paths.length;
      console.log('[StarForge] Asset paths collected:', this.totalAssets);
    }).catch(err => {
      console.error('[StarForge] Failed to collect asset paths:', err);
      this.totalAssets = 0;
    });
  }

  updateProgress() {
    this.loadedCount++;
    if (this.totalAssets > 0) {
      const percent = Math.floor((this.loadedCount / this.totalAssets) * 100);
      updatePreloader(percent, 'Загрузка ресурсов...');
    }
  }

  async loadAsset(src, retryCount = 0) {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        this.updateProgress();
        resolve({ src, success: true });
      };
      
      img.onerror = () => {
        if (retryCount < this.maxRetries) {
          console.warn(`[StarForge] Retry ${retryCount + 1}/${this.maxRetries}: ${src}`);
          setTimeout(() => {
            this.loadAsset(src, retryCount + 1).then(resolve);
          }, 500 * (retryCount + 1));
        } else {
          console.error(`[StarForge] Failed: ${src}`);
          this.updateProgress();
          resolve({ src, success: false });
        }
      };
      
      img.src = src;
    });
  }

  async start() {
    updatePreloader(0, 'Сбор ресурсов...');
    this.collectPaths();
    
    // Ждём сбор путей
    await new Promise(r => setTimeout(r, 100));
    
    if (this.totalAssets === 0) {
      updatePreloader(100, 'Пропуск загрузки...');
      await new Promise(r => setTimeout(r, 300));
      return;
    }
    
    updatePreloader(5, 'Загрузка ресурсов...');
    
    const loadPromises = this.paths.map(src => this.loadAsset(src));
    const results = await Promise.all(loadPromises);
    
    // Кешируем
    const cacheContainer = document.createElement('div');
    cacheContainer.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;';
    cacheContainer.id = 'assetCache';
    
    const existingCache = document.getElementById('assetCache');
    if (existingCache) existingCache.remove();
    
    results.forEach(({ src, success }) => {
      if (success) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        cacheContainer.appendChild(img);
      }
    });
    
    document.body.appendChild(cacheContainer);
    
    setTimeout(() => {
      if (cacheContainer.isConnected) cacheContainer.remove();
    }, 3000);
  }
}

// ========== ФАЗА 1: PRELOAD ==========
async function phase1_Preload() {
  console.log('[StarForge] ========== ФАЗА 1: PRELOAD ==========');
  updatePreloader(10, 'Инициализация состояния...');
  
  // 1. Инициализируем состояние (создаётся ОДИН раз)
  initializeState();
  
  updatePreloader(20, 'Загрузка ресурсов...');
  
  // 2. Загружаем ассеты
  const assetManager = new AssetManager();
  await assetManager.start();
  
  updatePreloader(90, 'Валидация...');
  
  console.log('[StarForge] ФАЗА 1: ЗАВЕРШЕНА');
}

// ========== ФАЗА 2: VALIDATION ==========
function phase2_Validation() {
  console.log('[StarForge] ========== ФАЗА 2: VALIDATION ==========');
  updatePreloader(95, 'Проверка данных...');
  
  // Проверяем и исправляем состояние
  const valid = validateState();
  
  if (!valid) {
    console.error('[StarForge] State validation FAILED');
    updatePreloader(100, 'Ошибка данных. Обновите страницу.');
    return false;
  }
  
  updatePreloader(98, 'Запуск систем...');
  
  console.log('[StarForge] ФАЗА 2: ЗАВЕРШЕНА');
  return true;
}

// ========== ФАЗА 3: RENDER ==========
function phase3_Render() {
  console.log('[StarForge] ========== ФАЗА 3: RENDER ==========');
  updatePreloader(99, 'Запуск...');
  
  // 1. Привязываем глобальные события
  bindGlobalEvents();
  
  // 2. Запускаем игровые системы (ивенты, таймеры)
  startGameSystems();
  
  // 3. Привязываем табы
  document.querySelectorAll('.tab-item').forEach((t) => {
    t.addEventListener('click', () => setActiveTab(t.dataset.tab));
  });
  
  updatePreloader(100, 'Готово!');
  
  // 4. Скрываем прелоадер
  setTimeout(() => {
    hidePreloader();
    
    // 5. ЗАПУСКАЕМ UI — только теперь!
    console.log('[StarForge] UI RENDER START');
    setActiveTab('expeditions');
    
    console.log('[StarForge] ========== ИГРА ЗАПУЩЕНА ==========');
    console.log('[StarForge] Player state ready:', {
      level: playerState?.player?.level,
      xp: playerState?.player?.xp,
      expeditions: { ...playerState?.expeditions }
    });
  }, 300);
}

// ========== ТОЧКА ВХОДА ==========
async function boot() {
  console.log('[StarForge] ========== BOOT SEQUENCE START ==========');
  
  // Показываем скелетон
  showSkeleton();
  
  // ФАЗА 1
  await phase1_Preload();
  
  // ФАЗА 2
  const valid = phase2_Validation();
  if (!valid) return;
  
  // ФАЗА 3
  phase3_Render();
}

// ========== ЗАПУСК ==========
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// ========== ОБРАБОТКА ОШИБОК ==========
window.addEventListener('error', (e) => {
  console.error('[StarForge] Global error:', e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[StarForge] Unhandled rejection:', e.reason);
});

// ========== ОТЛАДКА ==========
window.__starforge = {
  version: '0.02',
  getState: () => playerState,
  forceCleanup: forceCleanupAllOverlays,
  boot: boot
};

console.log('[StarForge] Main module loaded. Waiting for boot sequence...');
