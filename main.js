// ========== MAIN МОДУЛЬ: ИНИЦИАЛИЗАЦИЯ · Alpha 0.01 СТАБИЛИЗАЦИЯ ==========
import { initializeState, startGlobalTimer, showSkeleton, AppDebugger } from './core.js?v=001';
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

function updatePreloader(percent, text) {
  if (preloaderBar) preloaderBar.style.width = percent + '%';
  if (preloaderPercent) preloaderPercent.textContent = percent + '%';
  if (preloaderText) preloaderText.textContent = text;
}

function hidePreloader() {
  AppDebugger.log('Preload', 'Скрытие прелоадера');
  if (preloader) {
    preloader.classList.add('hidden');
    setTimeout(() => { preloader.style.display = 'none'; }, 500);
  }
}

// ---------- ASSET MANAGER (ИСПРАВЛЕН — АСИНХРОННЫЙ СБОР ПУТЕЙ) ----------
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
      
      AppDebugger.log('Assets', 'Пути собраны', { count: paths.size });
    } catch(e) {
      AppDebugger.error('Assets', 'Ошибка сбора путей', e);
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
    AppDebugger.log('Assets', 'Начало загрузки ассетов');
    updatePreloader(5, 'Сбор ресурсов...');
    
    const paths = await this.collectPaths();
    this.totalAssets = paths.length;
    
    if (this.totalAssets === 0) {
      AppDebugger.warn('Assets', 'Нет ассетов для загрузки');
      updatePreloader(100, 'Пропуск загрузки...');
      return;
    }
    
    updatePreloader(10, 'Загрузка ресурсов...');
    AppDebugger.log('Assets', 'Загрузка файлов', { total: this.totalAssets });
    
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
    AppDebugger.log('Assets', 'Загрузка завершена');
    
    setTimeout(() => {
      cacheContainer.remove();
    }, 2000);
  }
}

// ---------- ИНИЦИАЛИЗАЦИЯ ИГРЫ (ИСПРАВЛЕН ПОРЯДОК) ----------
function initializeGame() {
  AppDebugger.log('Init', 'Запуск initializeGame');
  
  // 1. Сначала инициализируем состояние
  initializeState();
  
  // 2. Запускаем глобальный таймер
  startGlobalTimer();
  
  // 3. Привязываем табы
  document.querySelectorAll('.tab-item').forEach((t) =>
    t.addEventListener('click', () => setActiveTab(t.dataset.tab))
  );
  
  // 4. Только теперь рендерим UI
  AppDebugger.log('Init', 'Запуск рендеринга UI');
  setActiveTab('expeditions');
  
  // 5. Скрываем прелоадер
  hidePreloader();
  
  AppDebugger.log('Init', 'Игра полностью загружена');
}

// ---------- ТОЧКА ВХОДА ----------
async function boot() {
  AppDebugger.log('Boot', 'Старт загрузки');
  
  // 1. Показываем скелетон в mainContent
  showSkeleton();
  
  // 2. Загружаем ассеты
  const assetManager = new AssetManager();
  await assetManager.start();
  
  // 3. Инициализируем игру
  initializeGame();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
