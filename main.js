// ========== MAIN МОДУЛЬ: АСИНХРОННАЯ ИНИЦИАЛИЗАЦИЯ ==========
import { initializeState, startGlobalTimer, showSkeleton } from './core.js';
import { setActiveTab, closeShowcase, closeModal } from './ui.js';

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

// 🩹 ФИКС: Показываем прелоадер НЕМЕДЛЕННО
if (preloader) {
  preloader.style.display = 'flex';
}
if (appElement) {
  appElement.style.display = 'none';
}

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

// ---------- ASSET MANAGER (ФОНОВАЯ ЗАГРУЗКА) ----------
class AssetManager {
  constructor() {
    this.totalAssets = 0;
    this.loadedCount = 0;
    this.maxRetries = 1; // 🩹 Уменьшаем ретраи для скорости
  }

  async collectPaths() {
    const paths = new Set();
    
    try {
      const module = await import('./config.js');
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
          setTimeout(() => {
            this.loadAsset(src, retryCount + 1).then(resolve);
          }, 200); // 🩹 Уменьшаем задержку ретрая
        } else {
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
      return;
    }
    
    updatePreloader(10, 'Загрузка ресурсов...');
    
    const loadPromises = paths.map(src => this.loadAsset(src));
    await Promise.all(loadPromises);
    
    updatePreloader(90, 'Запуск...');
  }
}

// ========== BOOT SEQUENCE (ФИКС: ПРЕЛОАДЕР МГНОВЕННО, АССЕТЫ В ФОНЕ) ==========
async function boot() {
  console.log('[Boot] ========== ЗАГРУЗКА ИГРЫ ==========');
  
  // 🩹 Прелоадер УЖЕ показан в HTML и в top-level коде
  updatePreloader(0, 'Инициализация...');
  showSkeleton();
  
  // 🩹 ШАГ 2: Загружаем ассеты В ФОНЕ, не блокируя запуск
  console.log('[Boot] Загрузка ассетов (фоновый режим)...');
  const assetManager = new AssetManager();
  assetManager.start().catch(e => console.warn('[AssetManager] Фоновая загрузка завершилась с ошибкой:', e));
  
  // 🩹 ШАГ 3: Инициализация состояния НЕМЕДЛЕННО, не ждём ассеты
  console.log('[Boot] Инициализация состояния...');
  updatePreloader(50, 'Загрузка данных...');
  const success = await initializeState();
  
  if (!success) {
    updatePreloader(100, 'Ошибка загрузки данных!');
    console.error('[Boot] ОШИБКА: не удалось инициализировать состояние');
    return;
  }
  
  // 🩹 ШАГ 4: Запуск систем сразу после инициализации
  console.log('[Boot] Запуск таймеров...');
  updatePreloader(70, 'Запуск систем...');
  startGlobalTimer();
  
  // 🩹 ШАГ 5: Запуск UI
  console.log('[Boot] Запуск интерфейса...');
  updatePreloader(90, 'Запуск интерфейса...');
  
  document.querySelectorAll('.tab-item').forEach((t) =>
    t.addEventListener('click', () => setActiveTab(t.dataset.tab))
  );
  
  updatePreloader(100, 'Готово!');
  
  // 🩹 Показываем игру через 200мс, не ждём загрузки ассетов
  setTimeout(() => {
    hidePreloader();
    setActiveTab('expeditions');
    console.log('[Boot] ========== ИГРА ЗАПУЩЕНА ==========');
  }, 200);
}

// 🩹 ФИКС: Запускаем boot СРАЗУ, DOM уже готов
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    updatePreloader(0, 'Старт...');
    boot();
  });
} else {
  updatePreloader(0, 'Старт...');
  boot();
}
