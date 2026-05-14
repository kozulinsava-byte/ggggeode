// ========== MAIN МОДУЛЬ: ИНИЦИАЛИЗАЦИЯ · ALPHA 0.05 · ПОЛНАЯ ПЕРЕКОПКА ==========
import { initializeState, startGlobalTimer, showSkeleton, terminateEvent, exitMeteorStormEarly, clearActiveOverlay, forceCleanupAllOverlays } from './core.js?v=005';
import { setActiveTab, closeShowcase, closeModal } from './ui.js?v=005';

// ========== ИНИЦИАЛИЗАЦИЯ TELEGRAM ==========
const tg = window.Telegram?.WebApp;
if (tg) {
  try {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor('#000000'); } catch(e) {}
    try { tg.setBackgroundColor('#000000'); } catch(e) {}
    console.log('[StarForge] Telegram WebApp initialized');
  } catch(e) {
    console.warn('[StarForge] Telegram init delayed:', e);
  }
}

// ========== ЦЕНТРАЛИЗОВАННАЯ ПРИВЯЗКА ВСЕХ ГЛОБАЛЬНЫХ СОБЫТИЙ ==========
function bindGlobalEvents() {
  console.log('[StarForge] Binding global events...');
  
  // Закрытие витрины
  const showcaseCloseBtn = document.getElementById('showcaseClose');
  const showcaseOverlayEl = document.getElementById('showcaseOverlay');
  if (showcaseCloseBtn) showcaseCloseBtn.addEventListener('click', closeShowcase);
  if (showcaseOverlayEl) {
    showcaseOverlayEl.addEventListener('click', (e) => {
      if (e.target === showcaseOverlayEl) closeShowcase();
    });
  }
  
  // Закрытие модалок
  document.addEventListener('closeModal', closeModal);
  
  const modalOverlayEl = document.getElementById('modalOverlay');
  if (modalOverlayEl) {
    modalOverlayEl.addEventListener('click', (e) => {
      if (e.target === modalOverlayEl) closeModal();
    });
  }
  
  // Кнопка выхода из Метеоритного Шторма
  const stormExitBtn = document.getElementById('meteorStormExitBtn');
  if (stormExitBtn) {
    stormExitBtn.addEventListener('click', () => {
      console.log('[StarForge] Exit meteor storm button clicked');
      exitMeteorStormEarly();
    });
  }
  
  // Закрытие по Escape (десктоп)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      console.log('[StarForge] Escape pressed — closing all overlays');
      forceCleanupAllOverlays();
      closeModal();
      closeShowcase();
      terminateEvent();
    }
  });
  
  // Закрытие шторма по клику на оверлей результатов
  const resultOverlay = document.getElementById('meteorStormResultOverlay');
  if (resultOverlay) {
    resultOverlay.addEventListener('click', (e) => {
      if (e.target === resultOverlay) {
        // Не закрываем — игрок должен нажать "Забрать всё"
      }
    });
  }
  
  console.log('[StarForge] Global events bound successfully');
}

// ========== ПРЕЛОАДЕР ==========
const preloader = document.getElementById('preloader');
const preloaderBar = document.getElementById('preloaderBar');
const preloaderPercent = document.getElementById('preloaderPercent');
const preloaderText = document.getElementById('preloaderText');

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
    
    import('./config.js?v=005').then(({ CONFIG_ITEMS, CONFIG_GEODES, CONFIG_EXPEDITIONS }) => {
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
      console.log(`[StarForge] Collected ${this.totalAssets} asset paths`);
    }).catch(err => {
      console.error('[StarForge] Failed to collect asset paths:', err);
      this.totalAssets = 0;
    });
  }

  updateProgress() {
    this.loadedCount++;
    if (this.totalAssets > 0) {
      const percent = Math.floor((this.loadedCount / this.totalAssets) * 100);
      if (preloaderBar) preloaderBar.style.width = percent + '%';
      if (preloaderPercent) preloaderPercent.textContent = percent + '%';
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
          console.error(`[StarForge] Failed to load after ${this.maxRetries} retries: ${src}`);
          this.updateProgress();
          resolve({ src, success: false });
        }
      };
      
      img.src = src;
    });
  }

  async start() {
    this.collectPaths();
    
    // Ждём сбор путей
    await new Promise(r => setTimeout(r, 100));
    
    if (this.totalAssets === 0) {
      if (preloaderText) preloaderText.textContent = 'Пропуск загрузки...';
      await new Promise(r => setTimeout(r, 300));
      hidePreloader();
      initializeGame();
      return;
    }
    
    if (preloaderText) preloaderText.textContent = 'Загрузка ресурсов...';
    
    const loadPromises = this.paths.map(src => this.loadAsset(src));
    const results = await Promise.all(loadPromises);
    
    // Кешируем изображения
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
    
    if (preloaderText) preloaderText.textContent = 'Запуск...';
    
    setTimeout(() => {
      if (cacheContainer.isConnected) cacheContainer.remove();
    }, 2000);
    
    setTimeout(() => {
      initializeGame();
      hidePreloader();
    }, 100);
  }
}

// ========== ИНИЦИАЛИЗАЦИЯ ИГРЫ ==========
function initializeGame() {
  console.log('[StarForge] Initializing game...');
  
  hidePreloader();
  
  // Привязываем глобальные события
  bindGlobalEvents();
  
  // Инициализируем состояние (загружаем сохранения)
  initializeState();
  
  // Запускаем глобальный таймер
  startGlobalTimer();
  
  // Привязка табов
  document.querySelectorAll('.tab-item').forEach((t) => {
    t.addEventListener('click', () => setActiveTab(t.dataset.tab));
  });
  
  // Стартовая вкладка
  setActiveTab('expeditions');
  
  console.log('[StarForge] Game initialized successfully. Alpha 0.05');
  console.log('[StarForge] Player state:', {
    level: playerState?.player?.level,
    xp: playerState?.player?.xp,
    geodes: { ...playerState?.geodes },
    expeditions: { ...playerState?.expeditions }
  });
}

// ========== ЗАПУСК ==========
showSkeleton();

const assetManager = new AssetManager();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => assetManager.start());
} else {
  assetManager.start();
}

// ========== ГЛОБАЛЬНАЯ ОБРАБОТКА ОШИБОК ==========
window.addEventListener('error', (e) => {
  console.error('[StarForge] Global error:', e.message, 'at', e.filename, ':', e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[StarForge] Unhandled promise rejection:', e.reason);
});

// ========== ЭКСПОРТ ДЛЯ ОТЛАДКИ В КОНСОЛИ ==========
window.__starforge = {
  getState: () => import('./core.js').then(m => m.playerState),
  getEvents: () => import('./core.js').then(m => m.eventsManager),
  forceCleanup: forceCleanupAllOverlays,
  version: '0.05'
};

console.log('%c🚀 Star Forge %cAlpha 0.05 %cготов',
  'color: #FFD700; font-size: 16px;',
  'color: #FFA500; font-size: 14px;',
  'color: #50C878; font-size: 12px;');
console.log('%cВсе системы запущены. Экспедиции работают.', 'color: #aaa;');
