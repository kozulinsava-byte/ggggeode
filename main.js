// ========== MAIN МОДУЛЬ: ИНИЦИАЛИЗАЦИЯ · ALPHA 0.01 ==========
import { initializeState, startGlobalTimer, showSkeleton, injectUI } from './core.js?v=001';
import { setActiveTab, closeShowcase, closeModal, showToast, getGeodeStageImage, updateProfileUI, updateCollectionProgress, renderCurrentTab, renderExpeditionsTab, renderImageToElement, showRewardPopup } from './ui.js?v=001';

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

function hidePreloader() {
  if (preloader) {
    preloader.classList.add('hidden');
    setTimeout(() => { preloader.style.display = 'none'; }, 500);
  }
}

// ---------- ASSET MANAGER ----------
class AssetManager {
  constructor() {
    this.totalAssets = 0;
    this.loadedCount = 0;
    this.maxRetries = 3;
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
    });
    
    return [...paths];
  }

  updateProgress() {
    this.loadedCount++;
    const percent = Math.floor((this.loadedCount / this.totalAssets) * 100);
    if (preloaderBar) preloaderBar.style.width = percent + '%';
    if (preloaderPercent) preloaderPercent.textContent = percent + '%';
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
    const paths = this.collectPaths();
    this.totalAssets = paths.length;
    
    if (this.totalAssets === 0) {
      hidePreloader();
      initializeGame();
      return;
    }
    
    if (preloaderText) preloaderText.textContent = 'Загрузка ресурсов...';
    
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
    
    if (preloaderText) preloaderText.textContent = 'Запуск...';
    
    setTimeout(() => {
      cacheContainer.remove();
    }, 2000);
    
    setTimeout(() => {
      initializeGame();
      hidePreloader();
    }, 100);
  }
}

function initializeGame() {
  hidePreloader();
  
  // Инжектим UI функции в core (разрываем циклический импорт)
  injectUI({
    showToast: showToast,
    getGeodeStageImage: getGeodeStageImage,
    updateProfileUI: updateProfileUI,
    updateCollectionProgress: updateCollectionProgress,
    renderCurrentTab: renderCurrentTab,
    renderExpeditionsTab: renderExpeditionsTab,
    renderImageToElement: renderImageToElement,
    showRewardPopup: showRewardPopup
  });
  
  initializeState();
  startGlobalTimer();

  document.querySelectorAll('.tab-item').forEach((t) =>
    t.addEventListener('click', () => setActiveTab(t.dataset.tab))
  );

  setActiveTab('expeditions');
}

showSkeleton();

const assetManager = new AssetManager();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => assetManager.start());
} else {
  assetManager.start();
}
