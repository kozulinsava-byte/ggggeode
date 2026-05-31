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

// ---------- ASSET MANAGER (ТИХИЙ РЕЖИМ: БЕЗ КОНСОЛИ, БЕЗ ЗАДЕРЖЕК) ----------
class AssetManager {
  constructor() {
    this.totalAssets = 0;
    this.loadedCount = 0;
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
    } catch(e) {}
    
    return [...paths];
  }

  async loadAsset(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  }

  async start() {
    const paths = await this.collectPaths();
    this.totalAssets = paths.length;
    
    if (this.totalAssets === 0) return;
    
    // Загружаем все параллельно, молча
    paths.forEach(src => this.loadAsset(src));
  }
}

// ========== BOOT SEQUENCE (ФИКС: БЕЗ ЗАДЕРЖЕК, ПРЕЛОАДЕР СРАЗУ) ==========
async function boot() {
  console.log('[Boot] ========== ЗАГРУЗКА ИГРЫ ==========');
  
  updatePreloader(0, 'Инициализация...');
  showSkeleton();
  
  // 🩹 Ассеты — тихий фон, без await, без задержек
  const assetManager = new AssetManager();
  assetManager.start().catch(() => {});
  
  // 🩹 Инициализация состояния НЕМЕДЛЕННО
  console.log('[Boot] Инициализация состояния...');
  updatePreloader(50, 'Загрузка данных...');
  const success = await initializeState();
  
  if (!success) {
    updatePreloader(100, 'Ошибка загрузки данных!');
    console.error('[Boot] ОШИБКА: не удалось инициализировать состояние');
    return;
  }
  
  // 🩹 Запуск систем
  console.log('[Boot] Запуск таймеров...');
  updatePreloader(70, 'Запуск систем...');
  startGlobalTimer();
  
  // 🩹 Запуск UI
  console.log('[Boot] Запуск интерфейса...');
  updatePreloader(90, 'Запуск интерфейса...');
  
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

// 🩹 Запускаем boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    updatePreloader(0, 'Старт...');
    boot();
  });
} else {
  updatePreloader(0, 'Старт...');
  boot();
}
