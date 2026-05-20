// ========== MAIN МОДУЛЬ: АСИНХРОННАЯ ИНИЦИАЛИЗАЦИЯ ==========
import { initializeState, startGlobalTimer, showSkeleton } from './core.js?v=001';
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

// Привязка событий
try {
  document.getElementById('showcaseClose')?.addEventListener('click', closeShowcase);
  document.getElementById('showcaseOverlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('showcaseOverlay')) closeShowcase();
  });
  document.addEventListener('closeModal', closeModal);
} catch(e) {}

// ---------- ПРЕЛОАДЕР ----------
const preloader = document.getElementById('preloader');
const preloaderBar = document.getElementById('preloaderBar');
const preloaderPercent = document.getElementById('preloaderPercent');
const preloaderText = document.getElementById('preloaderText');
const appElement = document.getElementById('app');

function updatePreloader(percent, text) {
  if (preloaderBar) preloaderBar.style.width = percent + '%';
  if (preloaderPercent) preloaderPercent.textContent = percent + '%';
  if (preloaderText) preloaderText.textContent = text;
}

function hidePreloader() {
  console.log('[Boot] Скрытие прелоадера, показ #app');
  if (preloader) {
    preloader.classList.add('hidden');
    setTimeout(() => { 
      if (preloader) preloader.style.display = 'none'; 
    }, 500);
  }
  if (appElement) {
    appElement.style.display = 'flex';
  }
}

// ---------- ASSET MANAGER ----------
class AssetManager {
  constructor() {
    this.totalAssets = 0;
    this.loadedCount = 0;
    this.maxRetries = 3;
  }

  async collectPaths() {
    const paths = new Set();
    
    try {
      const module = await import('./config.js?v=001');
      const { CONFIG_ITEMS, CONFIG_GEODES, CONFIG_EXPEDITIONS } = module;
      
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
      
      console.log('[AssetManager] Пути собраны:', paths.size);
    } catch(e) {
      console.warn('[AssetManager] Ошибка сбора путей:', e);
    }
    
    return [...paths];
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
          console.warn(`Retry ${retryCount + 1}/${this.maxRetries} for: ${src}`);
          setTimeout(() => {
            this.loadAsset(src, retryCount + 1).then(resolve);
          }, 500 * (retryCount + 1));
        } else {
          console.error(`Failed to load after ${this.maxRetries} retries: ${src}`);
          this.updateProgress();
          resolve({ src, success: false });
        }
      };
      
      img.src = src;
    });
  }

  async start() {
    updatePreloader(5, 'Сбор ресурсов...');
    
    const paths = await this.collectPaths();
    this.totalAssets = paths.length;
    
    if (this.totalAssets === 0) {
      updatePreloader(100, 'Пропуск загрузки...');
      await new Promise(r => setTimeout(r, 300));
      return;
    }
    
    updatePreloader(10, 'Загрузка ресурсов...');
    
    const loadPromises = paths.map(src => this.loadAsset(src));
    const results = await Promise.all(loadPromises);
    
    const cacheContainer = document.createElement('div');
    cacheContainer.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;';
    
    results.forEach(({ src, success }) => {
      if (success) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        cacheContainer.appendChild(img);
      }
    });
    
    document.body.appendChild(cacheContainer);
    
    updatePreloader(90, 'Запуск...');
    
    setTimeout(() => {
      cacheContainer.remove();
    }, 2000);
  }
}

// ========== BOOT SEQUENCE ==========
async function boot() {
  console.log('[Boot] ========== ЗАГРУЗКА ИГРЫ ==========');
  
  // ШАГ 1: Прелоадер виден, #app скрыт
  if (appElement) {
    appElement.style.display = 'none';
  }
  updatePreloader(0, 'Инициализация...');
  showSkeleton();
  
  // ШАГ 2: Загрузка ассетов
  console.log('[Boot] Загрузка ассетов...');
  const assetManager = new AssetManager();
  await assetManager.start();
  
  // ШАГ 3: Инициализация состояния (асинхронно ждёт localStorage и CloudStorage)
  console.log('[Boot] Инициализация состояния...');
  updatePreloader(92, 'Загрузка данных...');
  const success = await initializeState();
  
  if (!success) {
    updatePreloader(100, 'Ошибка загрузки данных!');
    console.error('[Boot] ОШИБКА: не удалось инициализировать состояние');
    return;
  }
  
  // ШАГ 4: Запуск систем
  console.log('[Boot] Запуск таймеров...');
  updatePreloader(96, 'Запуск систем...');
  startGlobalTimer();
  
  // ШАГ 5: Запуск UI
  console.log('[Boot] Запуск интерфейса...');
  updatePreloader(99, 'Запуск интерфейса...');
  
  document.querySelectorAll('.tab-item').forEach((t) =>
    t.addEventListener('click', () => setActiveTab(t.dataset.tab))
  );
  
  updatePreloader(100, 'Готово!');
  
  setTimeout(() => {
    hidePreloader();
    setActiveTab('expeditions');
    console.log('[Boot] ========== ИГРА ЗАПУЩЕНА ==========');
  }, 200);
}

// Запуск
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
