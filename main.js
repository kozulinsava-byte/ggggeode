// ========== MAIN: ЖЁСТКИЙ PRELOAD · v002 ==========
import { initializeState, validateState, startGameSystems, forceCleanupAllOverlays, terminateEvent, playerState } from './core.js?v=002';
import { setActiveTab, closeShowcase, closeModal } from './ui.js?v=002';

const tg = window.Telegram?.WebApp;
if (tg) { try { tg.ready(); tg.expand(); } catch(e) {} }

// ========== PRELOADER (НЕ ТРОГАЕМ DOM ДО ГОТОВНОСТИ) ==========
const preloader = document.getElementById('preloader');
const preloaderBar = document.getElementById('preloaderBar');
const preloaderPercent = document.getElementById('preloaderPercent');
const preloaderText = document.getElementById('preloaderText');

function updatePreloader(pct, txt) {
  if (preloaderBar) preloaderBar.style.width = pct + '%';
  if (preloaderPercent) preloaderPercent.textContent = pct + '%';
  if (preloaderText) preloaderText.textContent = txt;
}

function hidePreloader() {
  if (preloader) { preloader.classList.add('hidden'); setTimeout(() => { if (preloader) preloader.style.display = 'none'; }, 500); }
}

// ========== СОБЫТИЯ ==========
function bindEvents() {
  document.getElementById('showcaseClose')?.addEventListener('click', closeShowcase);
  document.getElementById('showcaseOverlay')?.addEventListener('click', e => { if (e.target === document.getElementById('showcaseOverlay')) closeShowcase(); });
  document.addEventListener('closeModal', closeModal);
  document.getElementById('modalOverlay')?.addEventListener('click', e => { if (e.target === document.getElementById('modalOverlay')) closeModal(); });
  document.getElementById('meteorStormExitBtn')?.addEventListener('click', () => import('./core.js').then(c => c.exitMeteorStormEarly()));
  document.addEventListener('keydown', e => { if (e.key==='Escape') { forceCleanupAllOverlays(); closeModal(); closeShowcase(); terminateEvent(); } });
}

// ========== ASSET MANAGER ==========
class AssetManager {
  constructor() { this.total = 0; this.loaded = 0; this.maxRetries = 3; this.paths = []; }
  
  collectPaths() {
    const paths = new Set();
    import('./config.js?v=002').then(({CONFIG_ITEMS, CONFIG_GEODES, CONFIG_EXPEDITIONS}) => {
      Object.values(CONFIG_ITEMS).forEach(i => { if (i.imagePath) paths.add(i.imagePath); });
      Object.values(CONFIG_GEODES).forEach(g => { if (g.stages) g.stages.forEach(s => { if (s.imagePath) paths.add(s.imagePath); }); });
      Object.values(CONFIG_EXPEDITIONS).forEach(e => { if (e.imagePath) paths.add(e.imagePath); });
      this.paths = [...paths]; this.total = this.paths.length;
    }).catch(() => { this.total = 0; });
  }
  
  updateProgress() { this.loaded++; if (this.total > 0) updatePreloader(Math.floor(this.loaded/this.total*100), 'Загрузка ресурсов...'); }
  
  async loadAsset(src, retry = 0) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => { this.updateProgress(); resolve({src, ok:true}); };
      img.onerror = () => {
        if (retry < this.maxRetries) setTimeout(() => this.loadAsset(src, retry+1).then(resolve), 500*(retry+1));
        else { this.updateProgress(); resolve({src, ok:false}); }
      };
      img.src = src;
    });
  }
  
  async start() {
    updatePreloader(5, 'Сбор ресурсов...');
    this.collectPaths();
    await new Promise(r => setTimeout(r, 100));
    if (this.total === 0) { updatePreloader(100, 'Пропуск...'); await new Promise(r => setTimeout(r, 200)); return; }
    updatePreloader(10, 'Загрузка ресурсов...');
    const results = await Promise.all(this.paths.map(s => this.loadAsset(s)));
    const cache = document.createElement('div');
    cache.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;';
    cache.id = 'assetCache';
    document.getElementById('assetCache')?.remove();
    results.forEach(({src,ok}) => { if (ok) { const img = document.createElement('img'); img.src = src; cache.appendChild(img); } });
    document.body.appendChild(cache);
    setTimeout(() => { if (cache.isConnected) cache.remove(); }, 3000);
  }
}

// ========== ФАЗЫ ==========
async function phase1() {
  console.log('[Main] ФАЗА 1');
  updatePreloader(20, 'Инициализация...');
  initializeState();
  updatePreloader(30, 'Ресурсы...');
  await new AssetManager().start();
  updatePreloader(90, 'Валидация...');
}

function phase2() {
  console.log('[Main] ФАЗА 2');
  updatePreloader(95, 'Проверка данных...');
  validateState();
  updatePreloader(98, 'Системы...');
}

function phase3() {
  console.log('[Main] ФАЗА 3');
  updatePreloader(99, 'Запуск...');
  bindEvents();
  startGameSystems();
  document.querySelectorAll('.tab-item').forEach(t => t.addEventListener('click', () => setActiveTab(t.dataset.tab)));
  updatePreloader(100, 'Готово!');
  setTimeout(() => {
    hidePreloader();
    setActiveTab('expeditions');
    console.log('[Main] ИГРА ЗАПУЩЕНА');
  }, 300);
}

// ========== BOOT ==========
async function boot() {
  console.log('[Main] BOOT');
  await phase1();
  phase2();
  phase3();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

window.addEventListener('error', e => console.error('[Main] Error:', e.message));
window.__starforge = { version:'0.02', getState: () => playerState, forceCleanup: forceCleanupAllOverlays };
