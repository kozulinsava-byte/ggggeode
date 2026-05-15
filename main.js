// ========== MAIN МОДУЛЬ: ИНИЦИАЛИЗАЦИЯ · ALPHA 0.01 + PRELOAD ==========
import { initializeState, validateState, startGameSystems, showSkeleton, forceCleanupAllOverlays, terminateEvent, exitMeteorStormEarly, playerState } from './core.js?v=001';
import { setActiveTab, closeShowcase, closeModal } from './ui.js?v=001';

// Тихая инициализация Telegram
const tg = window.Telegram?.WebApp;
if (tg) {
  try {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor('#000000'); } catch(e) {}
    try { tg.setBackgroundColor('#000000'); } catch(e) {}
  } catch(e) {
    console.warn('[StarForge] Telegram init delayed');
  }
}

// ---------- ПРЕЛОАДЕР (НЕ ТРОГАЕМ ДО ГОТОВНОСТИ) ----------
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
    setTimeout(() => { preloader.style.display = 'none'; }, 500);
  }
}

// ---------- ПРИВЯЗКА ГЛОБАЛЬНЫХ СОБЫТИЙ ----------
function bindGlobalEvents() {
  // Витрина
  document.getElementById('showcaseClose')?.addEventListener('click', closeShowcase);
  document.getElementById('showcaseOverlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('showcaseOverlay')) closeShowcase();
  });
  
  // Модалки
  document.addEventListener('closeModal', closeModal);
  document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
  
  // Метеоритный Шторм — выход
  document.getElementById('meteorStormExitBtn')?.addEventListener('click', () => {
    exitMeteorStormEarly();
  });
  
  // Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      forceCleanupAllOverlays();
      closeModal();
      closeShowcase();
      terminateEvent();
    }
  });
}

// ---------- ASSET MANAGER ----------
class AssetManager {
  constructor() {
    this.totalAssets = 0;
    this.loadedCount = 0;
    this.maxRetries = 3;
    this.paths = [];
  }

  collectPaths() {
    const paths = new Set();
    
    import('./config.js?v=001').then(({ CONFIG_ITEMS, CONFIG_GEODES, CONFIG_EXPEDITIONS }) => {
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
    }).catch(() => {
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
          console.warn(`[StarForge] Retry ${retryCount + 1}/${this.maxRetries} for: ${src}`);
          setTimeout(() => {
            this.loadAsset(src, retryCount + 1).then(resolve);
          }, 500 * (retryCount + 1));
        } else {
          console.error(`[StarForge] Failed to load: ${src}`);
          this.updateProgress();
          resolve({ src, success: false });
        }
      };
      
      img.src = src;
    });
  }

  async start() {
    updatePreloader(5, 'Сбор ресурсов...');
    this.collectPaths();
    
    await new Promise(r => setTimeout(r, 100));
    
    if (this.totalAssets === 0) {
      updatePreloader(100, 'Пропуск загрузки...');
      await new Promise(r => setTimeout(r, 300));
      return;
    }
    
    updatePreloader(10, 'Загрузка ресурсов...');
    
    const loadPromises = this.paths.map(src => this.loadAsset(src));
    const results = await Promise.all(loadPromises);
    
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
  
  // 1. Создаём состояние и загружаем сохранения
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
  
  // 1. Привязываем события
  bindGlobalEvents();
  
  // 2. Запускаем игровые системы
  startGameSystems();
  
  // 3. Привязываем табы
  document.querySelectorAll('.tab-item').forEach((t) =>
    t.addEventListener('click', () => setActiveTab(t.dataset.tab))
  );
  
  updatePreloader(100, 'Готово!');
  
  // 4. Скрываем прелоадер и запускаем UI
  setTimeout(() => {
    hidePreloader();
    
    console.log('[StarForge] UI RENDER START');
    setActiveTab('expeditions');
    
    console.log('[StarForge] ========== ИГРА ЗАПУЩЕНА ==========');
    console.log('[StarForge] Player state:', {
      level: playerState?.player?.level,
      xp: playerState?.player?.xp,
      expeditions: { ...playerState?.expeditions }
    });
  }, 300);
}

// ========== ТОЧКА ВХОДА ==========
async function boot() {
  console.log('[StarForge] ========== BOOT SEQUENCE START ==========');
  
  // Показываем скелетон в mainContent
  showSkeleton();
  
  // ФАЗА 1: Preload
  await phase1_Preload();
  
  // ФАЗА 2: Validation
  const valid = phase2_Validation();
  if (!valid) return;
  
  // ФАЗА 3: Render
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
  version: '0.01',
  getState: () => playerState,
  forceCleanup: forceCleanupAllOverlays,
  boot: boot
};

console.log('[StarForge] Main module loaded. Waiting for boot...');
