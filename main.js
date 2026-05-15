// ========== MAIN МОДУЛЬ: ИНИЦИАЛИЗАЦИЯ · ALPHA 0.01 + PRELOAD ==========
import { initializeState, validateState, startGameSystems, showSkeleton, forceCleanupAllOverlays, terminateEvent, exitMeteorStormEarly, injectUI, playerState } from './core.js?v=001';

// Тихая инициализация Telegram
const tg = window.Telegram?.WebApp;
if (tg) {
    try {
        tg.ready();
        tg.expand();
        try {
            tg.setHeaderColor('#000000');
        } catch(e) {
            // nothing
        }
        try {
            tg.setBackgroundColor('#000000');
        } catch(e) {
            // nothing
        }
    } catch(e) {
        console.warn('[StarForge] Telegram init delayed');
    }
}

// ---------- ПРЕЛОАДЕР ----------
const preloader = document.getElementById('preloader');
const preloaderBar = document.getElementById('preloaderBar');
const preloaderPercent = document.getElementById('preloaderPercent');
const preloaderText = document.getElementById('preloaderText');

function updatePreloader(percent, text) {
    if (preloaderBar) {
        preloaderBar.style.width = percent + '%';
    }
    if (preloaderPercent) {
        preloaderPercent.textContent = percent + '%';
    }
    if (preloaderText) {
        preloaderText.textContent = text;
    }
}

function hidePreloader() {
    if (preloader) {
        preloader.classList.add('hidden');
        setTimeout(function() {
            if (preloader) {
                preloader.style.display = 'none';
            }
        }, 500);
    }
}

// ---------- ПРИВЯЗКА ГЛОБАЛЬНЫХ СОБЫТИЙ ----------
function bindGlobalEvents(ui) {
    // Витрина
    const showcaseCloseBtn = document.getElementById('showcaseClose');
    const showcaseOverlayEl = document.getElementById('showcaseOverlay');

    if (showcaseCloseBtn) {
        showcaseCloseBtn.addEventListener('click', function() {
            ui.closeShowcase();
        });
    }

    if (showcaseOverlayEl) {
        showcaseOverlayEl.addEventListener('click', function(e) {
            if (e.target === showcaseOverlayEl) {
                ui.closeShowcase();
            }
        });
    }

    // Модалки
    document.addEventListener('closeModal', function() {
        ui.closeModal();
    });

    const modalOverlayEl = document.getElementById('modalOverlay');
    if (modalOverlayEl) {
        modalOverlayEl.addEventListener('click', function(e) {
            if (e.target === modalOverlayEl) {
                ui.closeModal();
            }
        });
    }

    // Метеоритный Шторм — выход
    const stormExitBtn = document.getElementById('meteorStormExitBtn');
    if (stormExitBtn) {
        stormExitBtn.addEventListener('click', function() {
            exitMeteorStormEarly();
        });
    }

    // Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            forceCleanupAllOverlays();
            ui.closeModal();
            ui.closeShowcase();
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
        const self = this;
        const paths = new Set();

        import('./config.js?v=001').then(function(module) {
            const CONFIG_ITEMS = module.CONFIG_ITEMS;
            const CONFIG_GEODES = module.CONFIG_GEODES;
            const CONFIG_EXPEDITIONS = module.CONFIG_EXPEDITIONS;

            Object.values(CONFIG_ITEMS).forEach(function(item) {
                if (item.imagePath) {
                    paths.add(item.imagePath);
                }
            });

            Object.values(CONFIG_GEODES).forEach(function(geode) {
                if (geode.stages) {
                    geode.stages.forEach(function(stage) {
                        if (stage.imagePath) {
                            paths.add(stage.imagePath);
                        }
                    });
                }
            });

            Object.values(CONFIG_EXPEDITIONS).forEach(function(exp) {
                if (exp.imagePath) {
                    paths.add(exp.imagePath);
                }
            });

            self.paths = Array.from(paths);
            self.totalAssets = self.paths.length;
        }).catch(function() {
            self.totalAssets = 0;
        });
    }

    updateProgress() {
        this.loadedCount = this.loadedCount + 1;
        if (this.totalAssets > 0) {
            const percent = Math.floor((this.loadedCount / this.totalAssets) * 100);
            updatePreloader(percent, 'Загрузка ресурсов...');
        }
    }

    async loadAsset(src, retryCount) {
        if (retryCount === undefined) {
            retryCount = 0;
        }

        const self = this;

        return new Promise(function(resolve) {
            const img = new Image();

            img.onload = function() {
                self.updateProgress();
                resolve({
                    src: src,
                    success: true
                });
            };

            img.onerror = function() {
                if (retryCount < self.maxRetries) {
                    console.warn('[StarForge] Retry ' + (retryCount + 1) + '/' + self.maxRetries + ' for: ' + src);
                    setTimeout(function() {
                        self.loadAsset(src, retryCount + 1).then(resolve);
                    }, 500 * (retryCount + 1));
                } else {
                    console.error('[StarForge] Failed to load after ' + self.maxRetries + ' retries: ' + src);
                    self.updateProgress();
                    resolve({
                        src: src,
                        success: false
                    });
                }
            };

            img.src = src;
        });
    }

    async start() {
        updatePreloader(5, 'Сбор ресурсов...');
        this.collectPaths();

        await new Promise(function(resolve) {
            setTimeout(resolve, 100);
        });

        if (this.totalAssets === 0) {
            updatePreloader(100, 'Пропуск загрузки...');
            await new Promise(function(resolve) {
                setTimeout(resolve, 300);
            });
            return;
        }

        updatePreloader(10, 'Загрузка ресурсов...');

        const self = this;
        const loadPromises = this.paths.map(function(src) {
            return self.loadAsset(src);
        });
        const results = await Promise.all(loadPromises);

        const cacheContainer = document.createElement('div');
        cacheContainer.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;';
        cacheContainer.id = 'assetCache';

        const existingCache = document.getElementById('assetCache');
        if (existingCache) {
            existingCache.remove();
        }

        results.forEach(function(result) {
            if (result.success) {
                const img = document.createElement('img');
                img.src = result.src;
                img.alt = '';
                cacheContainer.appendChild(img);
            }
        });

        document.body.appendChild(cacheContainer);

        setTimeout(function() {
            if (cacheContainer.isConnected) {
                cacheContainer.remove();
            }
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

    // 1. Загружаем UI и инжектим функции в core
    import('./ui.js?v=001').then(function(ui) {
        // Инжектим UI функции в core
        injectUI({
            showToast: ui.showToast,
            getGeodeStageImage: ui.getGeodeStageImage,
            updateProfileUI: ui.updateProfileUI,
            updateCollectionProgress: ui.updateCollectionProgress,
            renderCurrentTab: ui.renderCurrentTab,
            renderExpeditionsTab: ui.renderExpeditionsTab,
            renderImageToElement: ui.renderImageToElement,
            showRewardPopup: ui.showRewardPopup,
            renderMeteorStormUI: ui.renderMeteorStormUI,
            showMeteorStormResult: ui.showMeteorStormResult,
            updateMeteorStormUI: ui.updateMeteorStormUI
        });

        // 2. Привязываем глобальные события
        bindGlobalEvents(ui);

        // 3. Запускаем игровые системы (ивенты, таймеры)
        startGameSystems();

        // 4. Привязываем табы
        document.querySelectorAll('.tab-item').forEach(function(t) {
            t.addEventListener('click', function() {
                ui.setActiveTab(t.dataset.tab);
            });
        });

        updatePreloader(100, 'Готово!');

        // 5. Скрываем прелоадер и запускаем UI
        setTimeout(function() {
            hidePreloader();

            console.log('[StarForge] UI RENDER START');
            ui.setActiveTab('expeditions');

            console.log('[StarForge] ========== ИГРА ЗАПУЩЕНА ==========');
            if (playerState) {
                console.log('[StarForge] Player state:', {
                    level: playerState.player.level,
                    xp: playerState.player.xp,
                    expeditions: JSON.parse(JSON.stringify(playerState.expeditions))
                });
            }
        }, 300);
    });
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
    if (!valid) {
        return;
    }

    // ФАЗА 3: Render
    phase3_Render();
}

// ========== ЗАПУСК ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        boot();
    });
} else {
    boot();
}

// ========== ОБРАБОТКА ОШИБОК ==========
window.addEventListener('error', function(e) {
    console.error('[StarForge] Global error:', e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('[StarForge] Unhandled rejection:', e.reason);
});

// ========== ОТЛАДКА ==========
window.__starforge = {
    version: '0.01',
    getState: function() {
        return playerState;
    },
    forceCleanup: forceCleanupAllOverlays,
    boot: boot
};

console.log('[StarForge] Main module loaded. Waiting for boot...');
