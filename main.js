// ========== MAIN МОДУЛЬ: ИНИЦИАЛИЗАЦИЯ · ALPHA 0.04 · ИСПРАВЛЕНО ==========
import { initializeState, startGlobalTimer, showSkeleton, terminateEvent, exitMeteorStormEarly, clearActiveOverlay } from './core.js?v=004';
import { setActiveTab, closeShowcase, closeModal } from './ui.js?v=004';

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

// ---------- ЦЕНТРАЛИЗОВАННАЯ ПРИВЯЗКА ВСЕХ ГЛОБАЛЬНЫХ СОБЫТИЙ ----------
function bindGlobalEvents() {
  // Закрытие витрины
  const showcaseCloseBtn = document.getElementById('showcaseClose');
  const showcaseOverlayEl = document.getElementById('showcaseOverlay');
  
  if (showcaseCloseBtn) {
    showcaseCloseBtn.addEventListener('click', closeShowcase);
  }
  if (showcaseOverlayEl) {
    showcaseOverlayEl.addEventListener('click', (e) => {
      if (e.target === showcaseOverlayEl) closeShowcase();
    });
  }
  
  // Закрытие модалок
  document.addEventListener('closeModal', closeModal);
  
  // Закрытие модалки по клику на оверлей
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
      exitMeteorStormEarly();
    });
  }
  
  // Закрытие по Escape (для десктопа)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Закрываем все оверлеи
      const overlays = [
        'showcaseOverlay',
        'modalOverlay',
        'brawlOverlay',
        'conveyorOverlay',
        'forgeOverlay',
        'forgeProgressOverlay',
        'rewardPopupOverlay',
        'signalGameOverlay',
        'meteorStormOverlay',
        'meteorStormResultOverlay'
      ];
      
      overlays.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.classList.contains('active')) {
          if (id === 'showcaseOverlay') closeShowcase();
          else if (id === 'modalOverlay') closeModal();
          else if (id === 'meteorStormOverlay') exitMeteorStormEarly();
          else {
            el.classList.remove('active');
            clearActiveOverlay(id.replace('Overlay', ''));
          }
        }
      });
      
      terminateEvent();
    }
  });
}

// Привязываем события сразу
bindGlobalEvents();

// ---------- ПРЕЛОАДЕР ----------
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

// ---------- ASSET MANAGER (С УЛУЧШЕННОЙ ОБРАБОТКОЙ ОШИБОК) ----------
class AssetManager {
  constructor() {
    this.totalAssets = 0;
    this.loadedCount = 0;
    this.maxRetries = 3;
    this.paths = [];
  }

  collectPaths() {
    const paths = new Set();
    
    // Статический импорт config для мгновенного доступа
    import('./config.js?v=004').then(({ CONFIG_ITEMS, CONFIG_GEODES, CONFIG_EXPEDITIONS }) => {
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
    
    // Даём время на сбор путей
    await new Promise(r => setTimeout(r, 50));
    
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
    
    // Кешируем успешно загруженные изображения
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
    
    // Убираем кеш-контейнер через 2 секунды
    setTimeout(() => {
      if (cacheContainer.isConnected) cacheContainer.remove();
    }, 2000);
    
    // Запускаем игру
    setTimeout(() => {
      initializeGame();
      hidePreloader();
    }, 100);
  }
}

function initializeGame() {
  hidePreloader();
  initializeState();
  startGlobalTimer();

  // Привязка табов
  document.querySelectorAll('.tab-item').forEach((t) =>
    t.addEventListener('click', () => setActiveTab(t.dataset.tab))
  );

  // Стартовая вкладка
  setActiveTab('expeditions');
  
  console.log('[StarForge] Game initialized successfully. Alpha 0.04');
}

// Показываем скелетон пока грузится
showSkeleton();

// Запускаем ассет-менеджер
const assetManager = new AssetManager();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => assetManager.start());
} else {
  assetManager.start();
}

// Обработка невидимых ошибок
window.addEventListener('error', (e) => {
  console.error('[StarForge] Global error:', e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[StarForge] Unhandled promise rejection:', e.reason);
});
