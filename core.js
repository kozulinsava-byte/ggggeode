// ========== CORE МОДУЛЬ: ЛОГИКА ИГРЫ ==========
import { CONFIG_ITEMS, CONFIG_GEODES, CONFIG_EXPEDITIONS, CRAFT_RECIPES, LEVELS, DEFAULT_STATE, EVENTS_CONFIG } from './config.js';

// ========== ЗАГЛУШКИ ДЛЯ UI ФУНКЦИЙ (ИНЖЕКТЯТСЯ ИЗ MAIN.JS) ==========
let _showToast = null;
let _getGeodeStageImage = null;
let _updateProfileUI = null;
let _updateCollectionProgress = null;
let _renderCurrentTab = null;
let _renderExpeditionsTab = null;
let _renderImageToElement = null;
let _showRewardPopup = null;
let _renderMeteorStormUI = null;
let _showMeteorStormResult = null;
let _updateMeteorStormUI = null;

export function injectUI(functions) {
    _showToast = functions.showToast;
    _getGeodeStageImage = functions.getGeodeStageImage;
    _updateProfileUI = functions.updateProfileUI;
    _updateCollectionProgress = functions.updateCollectionProgress;
    _renderCurrentTab = functions.renderCurrentTab;
    _renderExpeditionsTab = functions.renderExpeditionsTab;
    _renderImageToElement = functions.renderImageToElement;
    _showRewardPopup = functions.showRewardPopup;
    _renderMeteorStormUI = functions.renderMeteorStormUI;
    _showMeteorStormResult = functions.showMeteorStormResult;
    _updateMeteorStormUI = functions.updateMeteorStormUI;
    console.log('[Core] UI functions injected successfully');
}

// ========== TELEGRAM ==========
const isTelegram = !!window.Telegram?.WebApp;
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
        console.warn('[StarForge] Telegram init error:', e);
    }
}

// ========== ГЛОБАЛЬНОЕ СОСТОЯНИЕ ИГРОКА ==========
export let playerState = null;
const collectibleSerials = {};
let nextSerial = 1;

let isOpeningGeode = false;

// ========== ГЕТТЕР ДЛЯ UI (РЕШАЕТ ПРОБЛЕМУ NULL ПРИ СТАТИЧЕСКОМ ИМПОРТЕ) ==========
export function getPlayerState() {
    if (!playerState) {
        console.error('[Core] getPlayerState called but playerState is null! Calling initializeState...');
        initializeState();
        validateState();
    }
    return playerState;
}

// ========== ДИСПЕТЧЕР ОВЕРЛЕЕВ ==========
let activeOverlayId = null;
let isOverlayActive = false;

export function setActiveOverlay(overlayId) {
    if (activeOverlayId && activeOverlayId !== overlayId) {
        console.warn('[StarForge] Overlay conflict:', activeOverlayId, '->', overlayId);
        forceCleanupAllOverlays();
    }
    activeOverlayId = overlayId;
    isOverlayActive = true;
}

export function clearActiveOverlay(overlayId) {
    if (activeOverlayId === overlayId) {
        activeOverlayId = null;
        isOverlayActive = false;
    }
}

export function isAnyOverlayActive() {
    return isOverlayActive;
}

export function forceCleanupAllOverlays() {
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
    
    overlays.forEach(function(id) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('active');
        }
    });
    
    terminateEvent();
    
    if (forgeState.smeltInterval) {
        clearInterval(forgeState.smeltInterval);
        forgeState.smeltInterval = null;
    }
    
    forgeState.active = false;
    forgeState.selectedRecipe = null;
    
    if (brawlState.isOpen) {
        brawlState.isOpen = false;
        isOpeningGeode = false;
    }
    
    activeOverlayId = null;
    isOverlayActive = false;
}

export function sendBotNotification(message) {
    console.log('[StarForge Bot Notification]', message);
}

export function showSkeleton() {
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        mainContent.innerHTML = '';
        mainContent.innerHTML = mainContent.innerHTML + `
            <div style="padding:20px;">
                <div style="height:40px; background:rgba(255,255,255,0.05); border-radius:20px; margin-bottom:16px; animation:pulse 1.5s infinite;"></div>
                <div style="height:120px; background:rgba(255,255,255,0.03); border-radius:28px; margin-bottom:16px;"></div>
                <div style="height:120px; background:rgba(255,255,255,0.03); border-radius:28px; margin-bottom:16px;"></div>
                <div style="height:120px; background:rgba(255,255,255,0.03); border-radius:28px;"></div>
            </div>
        `;
    }
}

// ---------- МЕНЕДЖЕР ИВЕНТОВ ----------
export const eventsManager = {
    activeEvent: null,
    eventEndTime: null,
    eventInterval: null,
    eventPhase: 'idle',
    rotationIndex: 0,

    getActiveEvent: function() {
        if (this.activeEvent && this.eventEndTime && Date.now() < this.eventEndTime) {
            return this.activeEvent;
        }
        return null;
    },

    getTimeLeft: function() {
        if (!this.eventEndTime) {
            return '0:00';
        }
        const diff = Math.max(0, this.eventEndTime - Date.now());
        const m = Math.floor(diff / 60000);
        const s = Math.ceil((diff % 60000) / 1000);
        return m + ':' + s.toString().padStart(2, '0');
    },

    startEventCycle: function() {
        if (this.eventInterval) {
            clearInterval(this.eventInterval);
        }
        this.triggerNextEvent();
        this.eventInterval = setInterval(function() {
            eventsManager.triggerNextEvent();
        }, EVENTS_CONFIG.rotationInterval);
    },

    triggerNextEvent: function() {
        const eventList = EVENTS_CONFIG.events;
        const nextEventId = eventList[this.rotationIndex % eventList.length];
        this.rotationIndex = this.rotationIndex + 1;

        if (nextEventId === 'great_smelt') {
            this.triggerGreatSmelt();
        } else if (nextEventId === 'meteor_storm') {
            this.triggerMeteorStorm();
        }
    },

    triggerGreatSmelt: function() {
        this.activeEvent = {
            id: 'great_smelt',
            name: EVENTS_CONFIG.great_smelt.name,
            icon: EVENTS_CONFIG.great_smelt.icon,
            description: EVENTS_CONFIG.great_smelt.description,
            longDescription: EVENTS_CONFIG.great_smelt.longDescription,
            type: 'great_smelt'
        };
        this.eventEndTime = Date.now() + EVENTS_CONFIG.eventDuration;
        this.eventPhase = 'active';

        if (_showToast) {
            _showToast('🔥 Великая Переплавка началась!', '🔥');
        }
        sendBotNotification('🚀 Кузня открыта! 15 минут для переплавки!');
        saveGame();
    },

    triggerMeteorStorm: function() {
        this.activeEvent = {
            id: 'meteor_storm',
            name: EVENTS_CONFIG.meteor_storm.name,
            icon: EVENTS_CONFIG.meteor_storm.icon,
            description: EVENTS_CONFIG.meteor_storm.description,
            longDescription: EVENTS_CONFIG.meteor_storm.longDescription,
            type: 'meteor_storm'
        };
        this.eventEndTime = Date.now() + EVENTS_CONFIG.eventDuration;
        this.eventPhase = 'active';

        if (_showToast) {
            _showToast('☄️ Метеоритный Шторм начинается!', '☄️');
        }
        sendBotNotification('☄️ Метеоритный Шторм! Лови метеориты!');
        saveGame();
    },

    endEvent: function() {
        this.eventPhase = 'ending';
        const eventName = this.activeEvent ? this.activeEvent.name : 'Ивент';
        if (_showToast) {
            _showToast('❄️ ' + eventName + ' завершён!', '❄️');
        }
        sendBotNotification('❄️ ' + eventName + ' завершён.');

        if (meteorStormState.active) {
            forceEndMeteorStorm();
        }

        saveGame();
    }
};

// ---------- ПЛАВИЛЬНЯ (FORGE) ----------
let forgeState = {
    active: false,
    selectedRecipe: null,
    smeltSeconds: 0,
    smeltMaxSeconds: 0,
    smeltInterval: null
};

export function openForge() {
    const event = eventsManager.getActiveEvent();
    if (!event || event.type !== 'great_smelt') {
        if (_showToast) {
            _showToast('Плавильня закрыта! Дождитесь Великой Переплавки.', '❄️');
        }
        return;
    }

    if (forgeState.active) {
        return;
    }

    forgeState.active = true;
    forgeState.selectedRecipe = null;

    setActiveOverlay('forge');

    const overlay = document.getElementById('forgeOverlay');
    const content = document.getElementById('forgeContent');

    renderForgeInterface(content);
    overlay.classList.add('active');
}

function renderForgeInterface(container) {
    const state = getPlayerState();
    const recipes = getCraftableRecipes();

    let html = '';
    html = html + '<div class="forge-title-section">';
    html = html + '<span class="forge-title-icon">🔥</span>';
    html = html + '<span class="forge-title-text">ПЛАВИЛЬНЯ</span>';
    html = html + '</div>';
    html = html + '<div style="font-size:11px; color:var(--text-secondary); margin-bottom:6px;">';
    html = html + 'Выбери рецепт и нажми «Сплавить»';
    html = html + '</div>';
    html = html + '<div class="recipe-grid">';

    if (recipes.length === 0) {
        html = html + '<div class="empty-state" style="grid-column:1/-1;">Нет доступных рецептов</div>';
    } else {
        recipes.forEach(function(recipe) {
            const isActive = forgeState.selectedRecipe && forgeState.selectedRecipe.id === recipe.id;
            let cardClass = '';
            if (isActive) {
                cardClass = 'recipe-card active';
            } else if (recipe.canCraft) {
                cardClass = 'recipe-card';
            } else {
                cardClass = 'recipe-card disabled';
            }

            html = html + '<div class="' + cardClass + '" data-recipe="' + recipe.id + '">';
            html = html + '<div class="recipe-card-icon">' + recipe.icon + '</div>';
            html = html + '<div class="recipe-card-name">' + recipe.name + '</div>';
            html = html + '<div class="recipe-card-ingredients">';

            for (let ingId in recipe.ingredients) {
                const required = recipe.ingredients[ingId];
                const owned = state.ingots[ingId] || 0;
                const hasEnough = owned >= required;
                const ing = CONFIG_ITEMS[ingId];

                html = html + '<div class="recipe-card-ingredient-row">';
                html = html + ing.icon + ' ' + ing.name + ': ';
                html = html + '<span style="color: ' + (hasEnough ? '#50C878' : '#FF4444') + '">';
                html = html + owned + ' / ' + required;
                html = html + '</span>';
                html = html + '</div>';
            }

            html = html + '</div>';
            html = html + '<div class="recipe-card-xp">+' + recipe.xpReward + ' XP · ' + recipe.smeltTime + 'с</div>';
            html = html + '</div>';
        });
    }

    html = html + '</div>';
    html = html + '<div class="forge-action-area">';
    
    let smeltBtnDisabled = '';
    let smeltBtnText = '';
    if (forgeState.selectedRecipe && forgeState.selectedRecipe.canCraft) {
        smeltBtnDisabled = '';
        smeltBtnText = '⚡ СПЛАВИТЬ';
    } else {
        smeltBtnDisabled = 'disabled';
        smeltBtnText = 'ВЫБЕРИТЕ РЕЦЕПТ';
    }
    
    html = html + '<button class="forge-smelt-btn" id="forgeSmeltBtn" ' + smeltBtnDisabled + '>' + smeltBtnText + '</button>';
    html = html + '<button class="forge-exit-btn" id="forgeExitBtn">Выйти из Плавильни</button>';
    html = html + '</div>';

    container.innerHTML = html;

    container.querySelectorAll('.recipe-card:not(.disabled)').forEach(function(el) {
        el.addEventListener('click', function() {
            const recipeId = el.dataset.recipe;
            const recipe = getCraftableRecipes().find(function(r) {
                return r.id === recipeId;
            });
            if (recipe && recipe.canCraft) {
                forgeState.selectedRecipe = recipe;
                renderForgeInterface(container);
            }
        });
    });

    const smeltBtn = container.querySelector('#forgeSmeltBtn');
    if (smeltBtn) {
        smeltBtn.addEventListener('click', function() {
            if (forgeState.selectedRecipe && forgeState.selectedRecipe.canCraft) {
                startSmeltProcess(forgeState.selectedRecipe);
            }
        });
    }

    const exitBtn = container.querySelector('#forgeExitBtn');
    if (exitBtn) {
        exitBtn.addEventListener('click', function() {
            closeForge();
        });
    }
}

function closeForge() {
    const overlay = document.getElementById('forgeOverlay');
    const content = document.getElementById('forgeContent');

    overlay.classList.remove('active');
    content.innerHTML = '';
    forgeState.active = false;
    forgeState.selectedRecipe = null;
    clearActiveOverlay('forge');
}

function startSmeltProcess(recipe) {
    document.getElementById('forgeOverlay').classList.remove('active');
    document.getElementById('forgeContent').innerHTML = '';

    const progressOverlay = document.getElementById('forgeProgressOverlay');
    const progressLabel = document.getElementById('forgeProgressLabel');
    const progressFill = document.getElementById('forgeProgressFill');
    const progressTime = document.getElementById('forgeProgressTime');
    const moltenEl = document.getElementById('forgeMolten');

    forgeState.smeltMaxSeconds = recipe.smeltTime || 15;
    forgeState.smeltSeconds = forgeState.smeltMaxSeconds;

    progressLabel.textContent = 'Плавим ' + recipe.name + '...';
    progressFill.style.width = '0%';
    progressTime.textContent = forgeState.smeltSeconds + 'с';
    moltenEl.style.height = '0%';
    progressOverlay.classList.add('active');

    if (forgeState.smeltInterval) {
        clearInterval(forgeState.smeltInterval);
    }

    forgeState.smeltInterval = setInterval(function() {
        forgeState.smeltSeconds = forgeState.smeltSeconds - 1;

        const elapsed = forgeState.smeltMaxSeconds - forgeState.smeltSeconds;
        const progress = (elapsed / forgeState.smeltMaxSeconds) * 100;

        progressFill.style.width = progress + '%';
        progressTime.textContent = forgeState.smeltSeconds + 'с';
        moltenEl.style.height = progress + '%';

        if (forgeState.smeltSeconds <= 0) {
            finishSmeltProcess(recipe);
        }
    }, 1000);
}

function finishSmeltProcess(recipe) {
    const state = getPlayerState();

    if (forgeState.smeltInterval) {
        clearInterval(forgeState.smeltInterval);
        forgeState.smeltInterval = null;
    }

    document.getElementById('forgeProgressOverlay').classList.remove('active');

    for (let ingId in recipe.ingredients) {
        state.ingots[ingId] = state.ingots[ingId] - recipe.ingredients[ingId];
    }

    state.ingots[recipe.resultIngotId] = (state.ingots[recipe.resultIngotId] || 0) + 1;
    state.minedStats[recipe.resultIngotId] = (state.minedStats[recipe.resultIngotId] || 0) + 1;
    state.player.totalIngots = state.player.totalIngots + 1;

    addXP(recipe.xpReward);
    saveGame();

    const resultItem = CONFIG_ITEMS[recipe.resultIngotId];
    if (_showToast) {
        _showToast('Создано: ' + (resultItem ? resultItem.name : recipe.name) + '! +' + recipe.xpReward + ' XP', recipe.icon);
    }
    sendBotNotification('⚡ Игрок создал ' + (resultItem ? resultItem.name : recipe.name) + ' в Плавильне!');

    forgeState.active = false;
    forgeState.selectedRecipe = null;
    clearActiveOverlay('forge');
    
    if (_renderCurrentTab) {
        _renderCurrentTab();
    }
}

// ---------- СИСТЕМА КРАФТА ----------
export function getCraftableRecipes() {
    const state = getPlayerState();
    const recipes = [];

    for (let recipeId in CRAFT_RECIPES) {
        const recipe = CRAFT_RECIPES[recipeId];
        let canCraft = true;

        for (let ingId in recipe.ingredients) {
            const required = recipe.ingredients[ingId];
            const owned = state.ingots[ingId] || 0;
            if (owned < required) {
                canCraft = false;
                break;
            }
        }

        recipes.push({
            id: recipe.id,
            name: recipe.name,
            icon: recipe.icon,
            description: recipe.description,
            resultIngotId: recipe.resultIngotId,
            ingredients: recipe.ingredients,
            xpReward: recipe.xpReward,
            smeltTime: recipe.smeltTime,
            canCraft: canCraft
        });
    }

    return recipes;
}

export function craftItem(recipeId) {
    const state = getPlayerState();
    const recipe = CRAFT_RECIPES[recipeId];
    if (!recipe) {
        if (_showToast) {
            _showToast('Рецепт не найден!', '⚠️');
        }
        return false;
    }

    const recipes = getCraftableRecipes();
    const found = recipes.find(function(r) {
        return r.id === recipeId;
    });
    
    if (!found || !found.canCraft) {
        if (_showToast) {
            _showToast('Недостаточно ресурсов!', '⚠️');
        }
        return false;
    }

    return craftItemDirect(found);
}

function craftItemDirect(recipe) {
    const state = getPlayerState();

    if (!recipe) {
        return false;
    }

    for (let ingId in recipe.ingredients) {
        state.ingots[ingId] = state.ingots[ingId] - recipe.ingredients[ingId];
    }

    state.ingots[recipe.resultIngotId] = (state.ingots[recipe.resultIngotId] || 0) + 1;
    state.minedStats[recipe.resultIngotId] = (state.minedStats[recipe.resultIngotId] || 0) + 1;
    state.player.totalIngots = state.player.totalIngots + 1;

    addXP(recipe.xpReward);
    saveGame();
    return true;
}

// ---------- DEV ФУНКЦИИ ----------
export function devGiveXP() {
    const state = getPlayerState();
    state.player.xp = state.player.xp + 1000000;
    while (state.player.level < LEVELS.length - 1 && state.player.xp >= LEVELS[state.player.level]) {
        state.player.level = state.player.level + 1;
    }
    if (_updateProfileUI) {
        _updateProfileUI();
    }
    if (_updateCollectionProgress) {
        _updateCollectionProgress();
    }
}

export function devGiveGeodes() {
    const state = getPlayerState();
    Object.keys(CONFIG_GEODES).forEach(function(geodeId) {
        state.geodes[geodeId] = (state.geodes[geodeId] || 0) + 10;
    });
}

export function devUnlockLocations() {
    const state = getPlayerState();
    state.player.level = Math.max(state.player.level, 10);
    if (_updateProfileUI) {
        _updateProfileUI();
    }
}

export function devResetGeodes() {
    const state = getPlayerState();
    Object.keys(CONFIG_GEODES).forEach(function(geodeId) {
        state.geodes[geodeId] = 10;
    });
}

export function getSerialForCollectible(ingotId) {
    if (!collectibleSerials[ingotId]) {
        collectibleSerials[ingotId] = String(nextSerial).padStart(3, '0');
        nextSerial = nextSerial + 1;
    }
    return collectibleSerials[ingotId];
}

export function isLocationCompleted(locId) {
    const state = getPlayerState();
    const special = CONFIG_GEODES['special_' + locId];
    if (!special) {
        return false;
    }
    return special.possibleIngots.every(function(ingId) {
        return state.ingots[ingId] > 0;
    });
}

export function getExpeditionTimeLeft(expId) {
    const state = getPlayerState();
    const exp = state.expeditions[expId];
    if (!exp || !exp.active || !exp.endTime) {
        return null;
    }
    return Math.max(0, exp.endTime - Date.now());
}

export function addXP(amount) {
    const state = getPlayerState();
    state.player.xp = state.player.xp + amount;

    while (state.player.level < LEVELS.length - 1 && state.player.xp >= LEVELS[state.player.level]) {
        state.player.level = state.player.level + 1;
        if (_showToast) {
            _showToast('🎉 Уровень ' + state.player.level + '!', '⬆️');
        }
        sendBotNotification('⭐ Игрок достиг ' + state.player.level + ' уровня!');
    }

    if (_updateProfileUI) {
        _updateProfileUI();
    }
    if (_updateCollectionProgress) {
        _updateCollectionProgress();
    }
    saveGame();
}

export function sellIngot(ingotId) {
    const state = getPlayerState();
    const ingot = CONFIG_ITEMS[ingotId];

    if (ingot.isCollectible) {
        if (_showToast) {
            _showToast('Коллекционные артефакты нельзя сдавать!', '⚠️');
        }
        return;
    }

    if (state.ingots[ingotId] <= 0) {
        if (_showToast) {
            _showToast('Нет слитков для сдачи!', '⚠️');
        }
        return;
    }

    const count = state.ingots[ingotId];
    const xpEarned = ingot.sellValue * count;

    state.ingots[ingotId] = 0;
    addXP(xpEarned);
    saveGame();

    if (_showToast) {
        _showToast('Сдано ' + count + ' ' + ingot.name + '! +' + xpEarned + ' XP', '💰');
    }
    if (_renderCurrentTab) {
        _renderCurrentTab();
    }
}

export function exchangeSpecialGeodeForXP(geodeId) {
    const state = getPlayerState();

    if (state.geodes[geodeId] <= 0) {
        if (_showToast) {
            _showToast('Нет такой жеоды!', '⚠️');
        }
        return;
    }

    const g = CONFIG_GEODES[geodeId];
    if (!g.isSpecial) {
        return;
    }

    const loc = g.location;
    const completed = isLocationCompleted(loc);
    if (!completed) {
        if (_showToast) {
            _showToast('Сначала соберите все артефакты локации!', '⚠️');
        }
        return;
    }

    state.geodes[geodeId] = state.geodes[geodeId] - 1;
    const xpGained = 800;
    addXP(xpGained);
    saveGame();

    if (_showToast) {
        _showToast('Жеода изучена! +' + xpGained + ' XP', '📚');
    }
    if (_renderCurrentTab) {
        _renderCurrentTab();
    }
}

// ---------- МИНИ-ИГРА "АКТИВНАЯ РАЗВЕДКА" ----------
let activeSignalGame = {
    active: false,
    expId: null,
    bonusType: null,
    points: [],
    collected: 0,
    totalPoints: 8,
    timer: 10,
    timerInterval: null,
    timeoutId: null
};

export function startSignalGame(expId, bonusType) {
    if (activeSignalGame.active) {
        cleanupSignalGame();
    }

    activeSignalGame.active = true;
    activeSignalGame.expId = expId;
    activeSignalGame.bonusType = bonusType;
    activeSignalGame.collected = 0;
    activeSignalGame.timer = 10;
    activeSignalGame.points = [];

    setActiveOverlay('signalGame');

    const overlay = document.getElementById('signalGameOverlay');
    const timerEl = document.getElementById('signalTimer');
    const counterEl = document.getElementById('signalCounter');
    const area = document.getElementById('signalGameArea');

    overlay.classList.add('active');
    timerEl.textContent = '10';
    counterEl.textContent = 'Сигналов: 0 / 8';
    area.innerHTML = '';

    for (let i = 0; i < 8; i = i + 1) {
        setTimeout(function() {
            if (!activeSignalGame.active) {
                return;
            }
            createSignalPoint(area);
        }, i * 480);
    }

    activeSignalGame.timerInterval = setInterval(function() {
        if (!activeSignalGame.active) {
            return;
        }
        activeSignalGame.timer = activeSignalGame.timer - 1;
        timerEl.textContent = activeSignalGame.timer;

        if (activeSignalGame.timer <= 0) {
            signalGameFail();
        }
    }, 1000);

    activeSignalGame.timeoutId = setTimeout(function() {
        if (activeSignalGame.active) {
            signalGameFail();
        }
    }, 10000);
}

function createSignalPoint(area) {
    if (!activeSignalGame.active) {
        return;
    }

    const point = document.createElement('div');
    point.className = 'signal-point';

    const x = Math.random() * (area.clientWidth - 60) + 30;
    const y = Math.random() * (area.clientHeight - 60) + 30;

    point.style.left = x + 'px';
    point.style.top = y + 'px';

    point.addEventListener('click', function() {
        if (!activeSignalGame.active) {
            return;
        }
        point.remove();
        activeSignalGame.collected = activeSignalGame.collected + 1;
        document.getElementById('signalCounter').textContent = 'Сигналов: ' + activeSignalGame.collected + ' / 8';

        if (activeSignalGame.collected >= 8) {
            signalGameSuccess();
        }
    });

    area.appendChild(point);
    activeSignalGame.points.push(point);

    setTimeout(function() {
        if (point.parentNode) {
            point.remove();
            activeSignalGame.points = activeSignalGame.points.filter(function(p) {
                return p !== point;
            });
        }
    }, 2500);
}

function signalGameSuccess() {
    if (!activeSignalGame.active) {
        return;
    }

    const expId = activeSignalGame.expId;
    const bonusType = activeSignalGame.bonusType;

    if (bonusType === 'echo') {
        applyEchoBonus(expId);
    } else if (bonusType === 'scan') {
        applyScanBonus(expId);
    }

    cleanupSignalGame();
    document.getElementById('signalGameOverlay').classList.remove('active');
    clearActiveOverlay('signalGame');
    
    if (_showToast) {
        _showToast('✅ Все сигналы пойманы! Бонус применён!', '📡');
    }
}

function signalGameFail() {
    if (!activeSignalGame.active) {
        return;
    }

    const state = getPlayerState();
    const expId = activeSignalGame.expId;

    state.echoCooldowns[expId] = Date.now() + 30000;
    saveGame();

    cleanupSignalGame();
    document.getElementById('signalGameOverlay').classList.remove('active');
    clearActiveOverlay('signalGame');
    
    if (_showToast) {
        _showToast('❌ Сбой системы... Разведка ушла на перезарядку', '📡');
    }
}

function cleanupSignalGame() {
    if (activeSignalGame.timerInterval) {
        clearInterval(activeSignalGame.timerInterval);
        activeSignalGame.timerInterval = null;
    }
    if (activeSignalGame.timeoutId) {
        clearTimeout(activeSignalGame.timeoutId);
        activeSignalGame.timeoutId = null;
    }
    activeSignalGame.points.forEach(function(p) {
        p.remove();
    });
    activeSignalGame.active = false;
    activeSignalGame.expId = null;
    activeSignalGame.bonusType = null;
    activeSignalGame.points = [];
}

function applyEchoBonus(expId) {
    const state = getPlayerState();
    const exp = state.expeditions[expId];
    if (!exp || !exp.active) {
        return;
    }

    const reduction = Math.floor((exp.endTime - Date.now()) * 0.15);
    exp.endTime = exp.endTime - reduction;
    state.expeditionBonuses[expId] = 'echo';

    saveGame();
    if (_showToast) {
        _showToast('Время экспедиции сокращено на ' + Math.floor(reduction / 1000) + 'с!', '📡');
    }
}

function applyScanBonus(expId) {
    const state = getPlayerState();
    const exp = state.expeditions[expId];
    if (!exp || !exp.active) {
        return;
    }

    exp.scanUsed = true;
    exp.specialChanceBoost = 1.2;
    state.expeditionBonuses[expId] = 'scan';

    saveGame();
    if (_showToast) {
        _showToast('Глубинное сканирование активировано! +20% к шансу особой жеоды', '🔬');
    }
}

// ========== ФАЗА 1: PRELOAD — ИНИЦИАЛИЗАЦИЯ СОСТОЯНИЯ ==========
export function initializeState() {
    console.log('[StarForge] ФАЗА 1: PRELOAD — создание состояния');

    playerState = JSON.parse(JSON.stringify(DEFAULT_STATE));
    playerState.echoCooldowns = {};
    playerState.expeditionBonuses = {};

    Object.keys(CONFIG_ITEMS).forEach(function(k) {
        if (playerState.ingots[k] === undefined) {
            playerState.ingots[k] = 0;
        }
        if (playerState.minedStats[k] === undefined) {
            playerState.minedStats[k] = 0;
        }
    });

    try {
        const localData = localStorage.getItem('starforge_v1');
        if (localData) {
            const data = JSON.parse(localData);
            applySaveData(data);
            console.log('[StarForge] Local save loaded successfully');
        } else {
            console.log('[StarForge] No local save found — using DEFAULT_STATE');
        }
    } catch (e) {
        console.warn('[StarForge] Failed to load local save:', e);
    }

    if (isTelegram && tg.CloudStorage && typeof tg.CloudStorage.getItem === 'function') {
        try {
            tg.CloudStorage.getItem('starforge_save', function(error, cloudData) {
                if (!error && cloudData) {
                    try {
                        const data = JSON.parse(cloudData);
                        applySaveData(data);
                        localStorage.setItem('starforge_v1', cloudData);
                        console.log('[StarForge] Cloud save loaded successfully');
                    } catch (e) {
                        console.warn('[StarForge] Failed to parse cloud save:', e);
                    }
                }
            });
        } catch(e) {
            console.warn('[StarForge] Cloud storage error:', e);
        }
    }

    console.log('[StarForge] ФАЗА 1: ЗАВЕРШЕНА');
    console.log('[StarForge] Initial state:', {
        level: playerState.player.level,
        xp: playerState.player.xp,
        geodes: JSON.parse(JSON.stringify(playerState.geodes)),
        expeditions: JSON.parse(JSON.stringify(playerState.expeditions))
    });

    return playerState;
}

// ========== ФАЗА 2: VALIDATION — ПРОВЕРКА ВСЕХ ДАННЫХ ==========
export function validateState() {
    console.log('[StarForge] ФАЗА 2: VALIDATION — проверка состояния');

    if (!playerState) {
        console.error('[StarForge] playerState is null! Re-initializing...');
        initializeState();
        return true;
    }

    const now = Date.now();

    for (let expId in playerState.expeditions) {
        const exp = playerState.expeditions[expId];
        if (!exp) {
            console.log('[StarForge] Fixing missing expedition state for:', expId);
            playerState.expeditions[expId] = {
                active: false,
                endTime: null
            };
            continue;
        }

        if (exp.active && exp.endTime && now >= exp.endTime) {
            console.log('[StarForge] Expedition completed while offline:', expId);
            exp.active = false;
            exp.endTime = null;
            exp.scanUsed = false;
            exp.specialChanceBoost = null;
            delete playerState.expeditionBonuses[expId];

            const drop = getRandomDropFromExpedition(expId);
            playerState.geodes[drop.geodeId] = (playerState.geodes[drop.geodeId] || 0) + 1;

            if (drop.isSpecial) {
                if (!playerState.discoveredSpecialGeodes[expId]) {
                    playerState.discoveredSpecialGeodes[expId] = true;
                }
            }
        } else if (exp.active && exp.endTime && now < exp.endTime) {
            console.log('[StarForge] Expedition in progress:', expId, '- ends in', Math.floor((exp.endTime - now) / 1000), 'seconds');
        }
    }

    for (let geodeId in CONFIG_GEODES) {
        if (playerState.geodes[geodeId] === undefined) {
            console.log('[StarForge] Fixing missing geode:', geodeId);
            playerState.geodes[geodeId] = 0;
        }
    }

    for (let ingotId in CONFIG_ITEMS) {
        if (playerState.ingots[ingotId] === undefined) {
            playerState.ingots[ingotId] = 0;
        }
        if (playerState.minedStats[ingotId] === undefined) {
            playerState.minedStats[ingotId] = 0;
        }
    }

    for (let locId in playerState.collectedArtifacts) {
        if (!Array.isArray(playerState.collectedArtifacts[locId])) {
            console.log('[StarForge] Fixing collectedArtifacts for:', locId);
            playerState.collectedArtifacts[locId] = [];
        }
    }

    for (let locId in playerState.discoveredSpecialGeodes) {
        if (playerState.discoveredSpecialGeodes[locId] === undefined) {
            playerState.discoveredSpecialGeodes[locId] = false;
        }
    }

    if (!playerState.player) {
        console.log('[StarForge] Fixing missing player object');
        playerState.player = {
            level: 1,
            xp: 0,
            totalOpened: 0,
            totalIngots: 0,
            totalArtifacts: 0
        };
    }

    const p = playerState.player;
    if (p.level === undefined || p.level === null) {
        console.log('[StarForge] Fixing player level');
        p.level = 1;
    }
    if (p.xp === undefined || p.xp === null) {
        console.log('[StarForge] Fixing player xp');
        p.xp = 0;
    }
    if (p.totalOpened === undefined || p.totalOpened === null) {
        p.totalOpened = 0;
    }
    if (p.totalIngots === undefined || p.totalIngots === null) {
        p.totalIngots = 0;
    }
    if (p.totalArtifacts === undefined || p.totalArtifacts === null) {
        p.totalArtifacts = 0;
    }

    if (!playerState.echoCooldowns) {
        playerState.echoCooldowns = {};
    }
    if (!playerState.expeditionBonuses) {
        playerState.expeditionBonuses = {};
    }

    console.log('[StarForge] ФАЗА 2: ЗАВЕРШЕНА — состояние валидно');
    console.log('[StarForge] Validated state:', {
        level: p.level,
        xp: p.xp,
        totalOpened: p.totalOpened,
        totalIngots: p.totalIngots,
        totalArtifacts: p.totalArtifacts
    });

    return true;
}

// ========== ФАЗА 3: ЗАПУСК ИГРОВЫХ СИСТЕМ ==========
export function startGameSystems() {
    console.log('[StarForge] ФАЗА 3: RENDER — запуск игровых систем');
    eventsManager.startEventCycle();
    startGlobalTimer();
    console.log('[StarForge] ФАЗА 3: ЗАВЕРШЕНА — все системы запущены');
    return true;
}

// ---------- СИСТЕМА СОХРАНЕНИЙ ----------
export function saveGame() {
    if (!playerState) {
        console.warn('[StarForge] saveGame called but playerState is null');
        return;
    }

    const saveData = JSON.stringify({
        playerState: playerState,
        collectibleSerials: collectibleSerials,
        nextSerial: nextSerial,
        activeEvent: eventsManager.activeEvent,
        eventEndTime: eventsManager.eventEndTime,
        eventPhase: eventsManager.eventPhase,
        rotationIndex: eventsManager.rotationIndex
    });

    try {
        localStorage.setItem('starforge_v1', saveData);
    } catch (e) {
        console.warn('[StarForge] Failed to save to localStorage:', e);
    }

    if (isTelegram && tg.CloudStorage && typeof tg.CloudStorage.setItem === 'function') {
        try {
            tg.CloudStorage.setItem('starforge_save', saveData, function() {});
        } catch(e) {
            console.warn('[StarForge] Failed to save to CloudStorage:', e);
        }
    }
}

function applySaveData(data) {
    if (!data || !data.playerState) {
        console.warn('[StarForge] applySaveData called with invalid data');
        return;
    }

    if (data.playerState) {
        Object.assign(playerState, data.playerState);
        if (!playerState.echoCooldowns) {
            playerState.echoCooldowns = {};
        }
        if (!playerState.expeditionBonuses) {
            playerState.expeditionBonuses = {};
        }
    }

    if (data.collectibleSerials) {
        Object.assign(collectibleSerials, data.collectibleSerials);
    }

    if (data.nextSerial) {
        nextSerial = data.nextSerial;
    }

    if (data.activeEvent) {
        eventsManager.activeEvent = data.activeEvent;
    }
    if (data.eventEndTime) {
        eventsManager.eventEndTime = data.eventEndTime;
    }
    if (data.eventPhase) {
        eventsManager.eventPhase = data.eventPhase;
    }
    if (data.rotationIndex !== undefined) {
        eventsManager.rotationIndex = data.rotationIndex;
    }
}

// ---------- ЭКСПЕДИЦИИ ----------
function getRandomDropFromExpedition(expId) {
    const exp = CONFIG_EXPEDITIONS[expId];
    if (!exp) {
        return {
            geodeId: 'mine',
            isSpecial: false
        };
    }

    const playerExp = playerState.expeditions[expId];
    let specialChance = exp.specialGeodeChance;

    if (playerExp && playerExp.scanUsed && playerExp.specialChanceBoost) {
        specialChance = specialChance * playerExp.specialChanceBoost;
    }

    if (!isLocationCompleted(expId)) {
        const rand = Math.random();
        if (rand < specialChance) {
            return {
                geodeId: exp.specialGeodeId,
                isSpecial: true
            };
        }
    }

    return {
        geodeId: expId,
        isSpecial: false
    };
}

function checkCompletedExpeditions() {
    if (!playerState) {
        return;
    }

    let changed = false;
    const now = Date.now();

    for (let k in playerState.expeditions) {
        const exp = playerState.expeditions[k];
        if (exp && exp.active && exp.endTime && now >= exp.endTime) {
            console.log('[StarForge] Expedition completed:', k);

            exp.active = false;
            exp.endTime = null;
            exp.scanUsed = false;
            exp.specialChanceBoost = null;
            delete playerState.expeditionBonuses[k];

            const drop = getRandomDropFromExpedition(k);
            if (drop.isSpecial) {
                if (!playerState.discoveredSpecialGeodes[k]) {
                    playerState.discoveredSpecialGeodes[k] = true;
                }
                playerState.geodes[drop.geodeId] = (playerState.geodes[drop.geodeId] || 0) + 1;
                if (_showToast) {
                    _showToast('Найдена особая жеода: ' + CONFIG_GEODES[drop.geodeId].name + '!', CONFIG_GEODES[drop.geodeId].icon);
                }
                sendBotNotification('💎 Игрок нашёл особую жеоду: ' + CONFIG_GEODES[drop.geodeId].name + '!');
            } else {
                playerState.geodes[drop.geodeId] = (playerState.geodes[drop.geodeId] || 0) + 1;
                if (_showToast) {
                    _showToast('Экспедиция завершена! +1 ' + CONFIG_GEODES[drop.geodeId].name, CONFIG_GEODES[drop.geodeId].icon);
                }
            }
            changed = true;
        }
    }

    if (changed) {
        saveGame();
        if (_renderCurrentTab) {
            _renderCurrentTab();
        }
    }
}

let globalTimerInterval = null;

export function startGlobalTimer() {
    if (globalTimerInterval) {
        clearInterval(globalTimerInterval);
    }
    globalTimerInterval = setInterval(function() {
        if (!playerState) {
            return;
        }
        checkCompletedExpeditions();
        updateExpeditionTimers();
        updateEventTimer();
    }, 500);
}

function updateExpeditionTimers() {
    if (!playerState) {
        return;
    }

    const now = Date.now();
    for (let k in CONFIG_EXPEDITIONS) {
        const exp = playerState.expeditions[k];
        const el = document.getElementById('timer-' + k);
        if (el && exp && exp.active && exp.endTime) {
            const diff = Math.max(0, exp.endTime - now);
            const m = Math.floor(diff / 60000);
            const s = Math.ceil((diff % 60000) / 1000);
            el.textContent = '⏳ ' + m + ':' + s.toString().padStart(2, '0');
        }
    }
}

function updateEventTimer() {
    const event = eventsManager.getActiveEvent();
    const timerEl = document.getElementById('eventTimer');
    if (timerEl && event) {
        timerEl.textContent = eventsManager.getTimeLeft();
    }

    if (event && eventsManager.eventEndTime && Date.now() >= eventsManager.eventEndTime && eventsManager.eventPhase === 'active') {
        eventsManager.endEvent();
        if (_renderCurrentTab) {
            _renderCurrentTab();
        }
    }
}

export function startExpedition(expId) {
    console.log('[StarForge] ========== startExpedition CALLED ==========');
    console.log('[StarForge] expId:', expId);
    console.log('[StarForge] playerState exists:', !!playerState);

    if (!playerState) {
        console.error('[StarForge] playerState is NULL! Cannot start expedition.');
        return false;
    }

    console.log('[StarForge] playerState.expeditions:', JSON.parse(JSON.stringify(playerState.expeditions)));

    const exp = playerState.expeditions[expId];
    if (!exp) {
        console.error('[StarForge] No expedition state found for:', expId);
        console.error('[StarForge] Available expeditions:', Object.keys(playerState.expeditions));
        return false;
    }

    if (exp.active) {
        console.warn('[StarForge] Expedition', expId, 'is already active');
        if (_showToast) {
            _showToast('Экспедиция уже в пути!', '⏳');
        }
        return false;
    }

    const config = CONFIG_EXPEDITIONS[expId];
    if (!config) {
        console.error('[StarForge] No config found for expedition:', expId);
        return false;
    }

    const now = Date.now();
    exp.active = true;
    exp.endTime = now + config.timer * 1000;
    exp.scanUsed = false;
    exp.specialChanceBoost = null;
    delete playerState.expeditionBonuses[expId];

    console.log('[StarForge] Expedition', expId, 'STARTED');
    console.log('[StarForge] Start time:', new Date(now).toLocaleTimeString());
    console.log('[StarForge] End time:', new Date(exp.endTime).toLocaleTimeString());
    console.log('[StarForge] Duration:', config.timer, 'seconds');

    saveGame();

    if (_renderExpeditionsTab) {
        _renderExpeditionsTab();
    }

    if (_showToast) {
        _showToast('Экспедиция «' + config.name + '» началась! (' + config.timer + 'с)', config.fallbackIcon);
    }

    sendBotNotification('⛏️ Игрок отправился в экспедицию: ' + config.name);

    console.log('[StarForge] ========== startExpedition SUCCESS ==========');

    return true;
}

// ---------- ЧАСТИЦЫ И ТРЯСКА ----------
export function createParticles(x, y) {
    const container = document.getElementById('app');
    if (!container) {
        return;
    }
    const particleCount = 12;

    for (let i = 0; i < particleCount; i = i + 1) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const angle = (i / particleCount) * Math.PI * 2;
        const distance = 40 + Math.random() * 60;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;

        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');

        container.appendChild(particle);

        setTimeout(function() {
            particle.remove();
        }, 800);
    }
}

export function createEliteParticles() {
    const container = document.getElementById('app');
    if (!container) {
        return;
    }
    const particleCount = 16;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < particleCount; i = i + 1) {
        const particle = document.createElement('div');
        particle.className = 'elite-particle';

        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        particle.style.animationDelay = (i * 0.1) + 's';

        container.appendChild(particle);

        setTimeout(function() {
            particle.remove();
        }, 2500);
    }
}

export function triggerScreenShake() {
    const app = document.getElementById('app');
    if (app) {
        app.classList.add('screen-shake');
        setTimeout(function() {
            app.classList.remove('screen-shake');
        }, 120);
    }
}

export function showCollectibleAnimation(ingot) {
    const flash = document.createElement('div');
    flash.className = 'collectible-flash';
    document.body.appendChild(flash);

    createEliteParticles();

    const appear = document.createElement('div');
    appear.className = 'collectible-appear';

    const icon = document.createElement('div');
    icon.className = 'collectible-appear-icon';
    icon.textContent = ingot.icon;
    icon.style.color = ingot.fallbackColor;

    const text = document.createElement('div');
    text.className = 'collectible-appear-text';
    text.textContent = ingot.name;

    appear.appendChild(icon);
    appear.appendChild(text);
    document.body.appendChild(appear);

    setTimeout(function() {
        flash.remove();
        appear.remove();
    }, 2500);

    sendBotNotification('🏆 Игрок получил коллекционный артефакт: ' + ingot.name + ' ' + ingot.icon + '!');
}

// ---------- ЛИДЕРБОРД (ТЕСТОВЫЙ РЕЖИМ) ----------
export async function updateLeaderboard() {
    if (!isTelegram || !tg.initData) {
        if (_showToast) {
            _showToast('Лидерборд доступен только в Telegram', '⚠️');
        }
        return;
    }

    renderTestLeaderboard();
}

function renderTestLeaderboard() {
    const state = getPlayerState();
    const userName = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user.first_name : 'Старатель';
    const testData = [
        { rank: 1, name: '⛏️ Шахтёр_Бог', xp: 15000 },
        { rank: 2, name: '💎 Алмазный_Лорд', xp: 12000 },
        { rank: 3, name: '🌌 Космо_Старатель', xp: 8500 },
        { rank: 4, name: userName, xp: state.player.xp, isPlayer: true },
        { rank: 5, name: '🪨 Геолог_777', xp: 3200 },
        { rank: 6, name: '🔥 Лавовый_Копатель', xp: 2100 },
        { rank: 7, name: '❄️ Ледяной_Бур', xp: 900 },
        { rank: 8, name: '🌟 Звёздный_Путник', xp: 450 },
        { rank: 9, name: '🪐 Астероидный_Волк', xp: 200 },
        { rank: 10, name: '⛏️ Новичок_2026', xp: 50 }
    ];

    testData.sort(function(a, b) {
        return b.xp - a.xp;
    });
    testData.forEach(function(entry, i) {
        entry.rank = i + 1;
    });

    let html = '';
    html = html + '<div class="modal-header">';
    html = html + '<div class="modal-title">🏆 ТОП ИГРОКОВ</div>';
    html = html + '<button class="modal-close" onclick="document.dispatchEvent(new Event(\'closeModal\'))">✕</button>';
    html = html + '</div>';
    html = html + '<div class="modal-content" style="text-align:left; padding:10px;">';

    testData.forEach(function(entry) {
        const isPlayer = entry.isPlayer;
        html = html + '<div style="display:flex; align-items:center; gap:12px; padding:12px; background:' + (isPlayer ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)') + '; border-radius:16px; margin-bottom:8px;">';
        html = html + '<span style="font-size:20px; font-weight:700; width:30px;">' + entry.rank + '</span>';
        html = html + '<span style="flex:1; font-weight:600;">' + entry.name + (isPlayer ? ' 👈' : '') + '</span>';
        html = html + '<span style="color:#FFD700; font-weight:700;">' + entry.xp + ' XP</span>';
        html = html + '</div>';
    });

    html = html + '</div>';

    import('./ui.js').then(function(ui) {
        ui.openModal(html);
    });
}

// ---------- КОНВЕЙЕР (СИНХРОНИЗИРОВАННЫЙ) ----------
const conveyorOverlay = document.getElementById('conveyorOverlay');
const conveyorTrack = document.getElementById('conveyorTrack');
const conveyorTitle = document.getElementById('conveyorTitle');

let conveyorState = {
    geodeId: null,
    isOpen: false,
    resultIngot: null,
    items: [],
    trackItems: [],
    timeoutId: null
};

const ITEM_WIDTH = 96;
const VISIBLE_ITEMS = 3;

function cleanupConveyor() {
    if (conveyorState.timeoutId) {
        clearTimeout(conveyorState.timeoutId);
        conveyorState.timeoutId = null;
    }
    conveyorOverlay.classList.remove('active');
    conveyorState.isOpen = false;
}

export function initRoulette(geodeId) {
    const g = CONFIG_GEODES[geodeId];
    if (!g || g.isSpecial) {
        return;
    }

    const rand = Math.random();
    let cum = 0;
    let droppedId = g.lootTable[0].ingotId;
    for (let e of g.lootTable) {
        cum = cum + e.chance;
        if (rand < cum) {
            droppedId = e.ingotId;
            break;
        }
    }

    const resultIngot = CONFIG_ITEMS[droppedId];
    const items = g.lootTable.map(function(e) {
        return CONFIG_ITEMS[e.ingotId];
    });

    const totalLength = 30;
    const trackItems = [];
    for (let i = 0; i < totalLength; i = i + 1) {
        trackItems.push(items[i % items.length]);
    }

    const targetSlot = 19;
    trackItems[targetSlot] = resultIngot;

    conveyorState.geodeId = geodeId;
    conveyorState.isOpen = true;
    conveyorState.resultIngot = resultIngot;
    conveyorState.items = items;
    conveyorState.trackItems = trackItems;

    setActiveOverlay('conveyor');

    conveyorTrack.innerHTML = '';
    trackItems.forEach(function(item, index) {
        const itemEl = document.createElement('div');
        itemEl.className = 'conveyor-item';
        itemEl.innerHTML = '';
        itemEl.innerHTML = itemEl.innerHTML + '<div class="conveyor-item-icon" id="conv-' + index + '"></div>';
        itemEl.innerHTML = itemEl.innerHTML + '<div class="conveyor-item-name">' + item.name + '</div>';
        conveyorTrack.appendChild(itemEl);
    });

    trackItems.forEach(function(item, index) {
        const el = document.getElementById('conv-' + index);
        if (el && _renderImageToElement) {
            _renderImageToElement(el, item.imagePath, item.icon, item.fallbackColor);
        }
    });

    conveyorTitle.textContent = 'Анализ ' + g.name + '...';
    conveyorOverlay.classList.add('active');

    const stopPosition = -(targetSlot * ITEM_WIDTH) + (VISIBLE_ITEMS * ITEM_WIDTH / 2) - ITEM_WIDTH / 2;

    conveyorTrack.style.transition = 'none';
    conveyorTrack.style.transform = 'translateX(0)';
    conveyorTrack.offsetHeight;

    setTimeout(function() {
        conveyorTrack.style.transition = 'transform 4.5s cubic-bezier(0.2, 0, 0.1, 1)';
        conveyorTrack.style.transform = 'translateX(' + stopPosition + 'px)';
    }, 50);

    conveyorState.timeoutId = setTimeout(function() {
        stopRoulette();
    }, 4550);
}

function stopRoulette() {
    const state = getPlayerState();

    if (!conveyorState.isOpen) {
        return;
    }

    const resultIngot = conveyorState.resultIngot;
    const g = CONFIG_GEODES[conveyorState.geodeId];

    let xpGained = g.xpValue + (resultIngot ? resultIngot.xpValue : 0);
    let isFirstDiscovery = false;

    if (state.minedStats[resultIngot.id] === 0) {
        isFirstDiscovery = true;
        xpGained = Math.floor(xpGained * 3);
        if (_showToast) {
            _showToast('🎉 ПЕРВОЕ ОТКРЫТИЕ! +' + xpGained + ' XP', '🌟');
        }
    }

    state.ingots[resultIngot.id] = (state.ingots[resultIngot.id] || 0) + 1;
    state.minedStats[resultIngot.id] = (state.minedStats[resultIngot.id] || 0) + 1;
    state.player.totalIngots = state.player.totalIngots + 1;

    addXP(xpGained);
    saveGame();

    cleanupConveyor();
    clearActiveOverlay('conveyor');
    isOpeningGeode = false;

    setTimeout(function() {
        if (_showRewardPopup) {
            _showRewardPopup(resultIngot);
        }
        if (_renderCurrentTab) {
            _renderCurrentTab();
        }
    }, 100);
}

// ---------- КУЗНИЦА (BRAWL STARS) — ЭФФЕКТНОЕ ОТКРЫТИЕ ----------
let brawlState = {
    geodeId: null,
    isSpecial: false,
    tapsRemaining: 10,
    isOpen: false
};

const brawlOverlay = document.getElementById('brawlOverlay');
const brawlGeode = document.getElementById('brawlGeode');
const brawlCounter = document.getElementById('brawlCounter');
const brawlResult = document.getElementById('brawlResult');
const brawlResultIcon = document.getElementById('brawlResultIcon');
const brawlResultName = document.getElementById('brawlResultName');
const brawlResultRarity = document.getElementById('brawlResultRarity');
const brawlCloseBtn = document.getElementById('brawlCloseBtn');

export function openBrawlOverlay(geodeId, isSpecial) {
    const state = getPlayerState();

    if (isOpeningGeode) {
        return;
    }

    if (state.geodes[geodeId] <= 0) {
        if (_showToast) {
            _showToast('Нет такой жеоды!', '⚠️');
        }
        return;
    }

    if (isSpecial) {
        const g = CONFIG_GEODES[geodeId];
        const completed = isLocationCompleted(g.location);
        if (completed) {
            if (_showToast) {
                _showToast('Все артефакты собраны! Используйте "Изучить" для обмена на XP.', '📚');
            }
            return;
        }
    }

    isOpeningGeode = true;

    brawlState.geodeId = geodeId;
    brawlState.isSpecial = isSpecial;
    brawlState.tapsRemaining = 10;
    brawlState.isOpen = true;

    setActiveOverlay('brawl');

    brawlCounter.textContent = '10';
    brawlResult.classList.remove('show');
    brawlCloseBtn.style.display = 'none';
    brawlGeode.style.display = 'flex';
    brawlGeode.classList.remove('explode-animation');

    if (isSpecial) {
        brawlGeode.classList.add('special-geode');
    } else {
        brawlGeode.classList.remove('special-geode');
    }

    document.querySelector('.brawl-hint').style.display = 'block';
    brawlCounter.style.display = 'block';

    if (_getGeodeStageImage) {
        const stage = _getGeodeStageImage(geodeId, 10);
        if (_renderImageToElement) {
            _renderImageToElement(brawlGeode, stage.imagePath, stage.fallbackIcon, '#8B7355');
        }
    }
    brawlOverlay.classList.add('active');
}

function closeBrawlOverlay() {
    brawlOverlay.classList.remove('active');
    brawlState.isOpen = false;
    isOpeningGeode = false;
    clearActiveOverlay('brawl');
    if (_renderCurrentTab) {
        _renderCurrentTab();
    }
}

function handleBrawlTap(e) {
    if (!brawlState.isOpen || brawlState.tapsRemaining <= 0) {
        return;
    }

    const rect = brawlGeode.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    createParticles(centerX, centerY);
    triggerScreenShake();

    brawlGeode.classList.add('shake-animation');
    setTimeout(function() {
        brawlGeode.classList.remove('shake-animation');
    }, 300);

    brawlState.tapsRemaining = brawlState.tapsRemaining - 1;
    brawlCounter.textContent = brawlState.tapsRemaining;

    if (_getGeodeStageImage) {
        const stage = _getGeodeStageImage(brawlState.geodeId, brawlState.tapsRemaining);
        if (_renderImageToElement) {
            _renderImageToElement(brawlGeode, stage.imagePath, stage.fallbackIcon, '#8B7355');
        }
    }

    if (brawlState.tapsRemaining <= 0) {
        finishBrawlOpening();
    }
}

function finishBrawlOpening() {
    const state = getPlayerState();
    const geodeId = brawlState.geodeId;
    const isSpecial = brawlState.isSpecial;

    if (state.geodes[geodeId] > 0) {
        state.geodes[geodeId] = state.geodes[geodeId] - 1;
    }
    state.player.totalOpened = state.player.totalOpened + 1;

    let droppedIngot = null;
    let xpGained = 0;

    if (isSpecial) {
        const g = CONFIG_GEODES[geodeId];
        const loc = g.location;
        const available = g.possibleIngots.filter(function(ingId) {
            return !state.collectedArtifacts[loc].includes(ingId);
        });
        const picked = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : g.possibleIngots[0];
        droppedIngot = CONFIG_ITEMS[picked];

        state.ingots[picked] = (state.ingots[picked] || 0) + 1;
        state.minedStats[picked] = (state.minedStats[picked] || 0) + 1;
        if (!state.collectedArtifacts[loc].includes(picked)) {
            state.collectedArtifacts[loc].push(picked);
            state.player.totalArtifacts = state.player.totalArtifacts + 1;
        }
        if (!state.discoveredSpecialGeodes[loc]) {
            state.discoveredSpecialGeodes[loc] = true;
        }
        xpGained = droppedIngot.xpValue;

        addXP(xpGained);
        saveGame();

        const isFirstCollectible = droppedIngot.isCollectible && state.ingots[droppedIngot.id] === 1;
        if (droppedIngot.isCollectible && isFirstCollectible) {
            showCollectibleAnimation(droppedIngot);
        }

        brawlGeode.classList.add('explode-animation');
        brawlGeode.classList.remove('special-geode');
        document.querySelector('.brawl-hint').style.display = 'none';
        brawlCounter.style.display = 'none';

        setTimeout(function() {
            brawlGeode.style.display = 'none';
            if (_renderImageToElement) {
                _renderImageToElement(brawlResultIcon, droppedIngot.imagePath, droppedIngot.icon, droppedIngot.fallbackColor);
            }
            brawlResultName.textContent = droppedIngot.name;
            brawlResultRarity.textContent = droppedIngot.rarity;
            if (droppedIngot.rarityClass === 'collectible') {
                brawlResultRarity.style.color = '#FF64FF';
            } else if (droppedIngot.rarityClass === 'legendary') {
                brawlResultRarity.style.color = '#FFD700';
            } else {
                brawlResultRarity.style.color = '#fff';
            }
            brawlResult.classList.add('show');
            brawlCloseBtn.style.display = 'block';
            isOpeningGeode = false;
            clearActiveOverlay('brawl');
            if (_renderCurrentTab) {
                _renderCurrentTab();
            }
        }, 500);

    } else {
        brawlGeode.classList.add('explode-animation');
        document.querySelector('.brawl-hint').style.display = 'none';
        brawlCounter.style.display = 'none';

        setTimeout(function() {
            brawlOverlay.classList.remove('active');
            brawlState.isOpen = false;
            clearActiveOverlay('brawl');
            initRoulette(geodeId);
        }, 500);
    }
}

// Привязка событий Brawl
setTimeout(function() {
    if (brawlGeode) {
        brawlGeode.addEventListener('click', handleBrawlTap);
    }
    if (brawlCloseBtn) {
        brawlCloseBtn.addEventListener('click', closeBrawlOverlay);
    }
}, 1000);

// ========== МЕТЕОРИТНЫЙ ШТОРМ ==========
export let meteorStormState = {
    active: false,
    timer: 0,
    timerInterval: null,
    spawnInterval: null,
    meteorElements: [],
    captured: {
        legendary: 0,
        rare: 0,
        common: 0
    },
    totalSpawned: 0,
    gameArea: null
};

export function openMeteorStorm() {
    const event = eventsManager.getActiveEvent();
    if (!event || event.type !== 'meteor_storm') {
        if (_showToast) {
            _showToast('Метеоритный шторм сейчас не активен!', '⚠️');
        }
        return;
    }

    if (meteorStormState.active) {
        return;
    }

    terminateEvent();

    meteorStormState.active = true;
    meteorStormState.timer = EVENTS_CONFIG.meteor_storm.stormDuration;
    meteorStormState.captured = {
        legendary: 0,
        rare: 0,
        common: 0
    };
    meteorStormState.totalSpawned = 0;
    meteorStormState.meteorElements = [];

    setActiveOverlay('meteorStorm');

    const overlay = document.getElementById('meteorStormOverlay');
    const gameArea = document.getElementById('meteorStormGameArea');
    meteorStormState.gameArea = gameArea;

    overlay.classList.add('active');

    if (_renderMeteorStormUI) {
        _renderMeteorStormUI();
    }

    meteorStormState.timerInterval = setInterval(function() {
        meteorStormState.timer = meteorStormState.timer - 1;
        if (_updateMeteorStormUI) {
            _updateMeteorStormUI();
        }

        if (meteorStormState.timer <= 0) {
            endMeteorStorm();
        }
    }, 1000);

    meteorStormState.spawnInterval = setInterval(function() {
        if (meteorStormState.active && meteorStormState.meteorElements.length < EVENTS_CONFIG.meteor_storm.maxMeteorsOnScreen) {
            spawnMeteor();
        }
    }, EVENTS_CONFIG.meteor_storm.spawnInterval);

    setTimeout(function() {
        spawnMeteor();
    }, 200);
    setTimeout(function() {
        spawnMeteor();
    }, 400);
    setTimeout(function() {
        spawnMeteor();
    }, 600);
}

function spawnMeteor() {
    if (!meteorStormState.active) {
        return;
    }

    const gameArea = meteorStormState.gameArea;
    if (!gameArea) {
        return;
    }

    const types = EVENTS_CONFIG.meteor_storm.meteorTypes;
    const rand = Math.random();
    let meteorType;
    let typeKey;

    if (rand < types.legendary.spawnWeight) {
        meteorType = types.legendary;
        typeKey = 'legendary';
    } else if (rand < types.legendary.spawnWeight + types.rare.spawnWeight) {
        meteorType = types.rare;
        typeKey = 'rare';
    } else {
        meteorType = types.common;
        typeKey = 'common';
    }

    const areaWidth = gameArea.clientWidth || window.innerWidth;
    const leftPercent = 5 + Math.random() * 90;
    const startX = (leftPercent / 100) * areaWidth;

    const meteor = document.createElement('div');
    meteor.className = 'meteor-storm-meteor';
    meteor.innerHTML = '<span class="meteor-emoji">' + meteorType.emoji + '</span>';
    meteor.style.position = 'absolute';
    meteor.style.left = startX + 'px';
    meteor.style.top = '-60px';
    meteor.style.width = meteorType.size + 'px';
    meteor.style.height = meteorType.size + 'px';
    meteor.style.fontSize = (meteorType.size - 10) + 'px';
    meteor.style.color = meteorType.color;
    meteor.style.textShadow = '0 0 20px ' + meteorType.glowColor + ', 0 0 40px ' + meteorType.glowColor;
    meteor.style.cursor = 'pointer';
    meteor.style.zIndex = '510';
    meteor.style.userSelect = 'none';
    meteor.style.display = 'flex';
    meteor.style.alignItems = 'center';
    meteor.style.justifyContent = 'center';

    meteor.dataset.type = typeKey;
    meteor.dataset.caught = 'false';

    meteor.addEventListener('click', function(e) {
        e.stopPropagation();
        if (meteor.dataset.caught === 'true') {
            return;
        }
        meteor.dataset.caught = 'true';

        meteorStormState.captured[typeKey] = meteorStormState.captured[typeKey] + 1;

        createMeteorFlash(meteor);

        meteor.remove();
        meteorStormState.meteorElements = meteorStormState.meteorElements.filter(function(m) {
            return m !== meteor;
        });

        if (_updateMeteorStormUI) {
            _updateMeteorStormUI();
        }
    });

    gameArea.appendChild(meteor);
    meteorStormState.meteorElements.push(meteor);
    meteorStormState.totalSpawned = meteorStormState.totalSpawned + 1;

    const angle = (Math.random() - 0.5) * 30;
    const deltaX = Math.tan(angle * Math.PI / 180) * (window.innerHeight + 100);
    const duration = meteorType.speed;
    const startTop = -60;
    const endTop = window.innerHeight + 100;
    const endLeft = startX + deltaX;
    const startTime = performance.now();

    function animateMeteor(currentTime) {
        if (!meteor.isConnected) {
            return;
        }

        const elapsed = (currentTime - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);

        const currentTop = startTop + (endTop - startTop) * progress;
        const currentLeft = startX + (endLeft - startX) * progress;

        meteor.style.top = currentTop + 'px';
        meteor.style.left = currentLeft + 'px';
        meteor.style.transform = 'rotate(' + (progress * 720) + 'deg)';

        if (progress < 1 && meteor.dataset.caught === 'false') {
            requestAnimationFrame(animateMeteor);
        } else if (progress >= 1 && meteor.dataset.caught === 'false') {
            meteor.remove();
            meteorStormState.meteorElements = meteorStormState.meteorElements.filter(function(m) {
                return m !== meteor;
            });
        }
    }

    requestAnimationFrame(animateMeteor);

    setTimeout(function() {
        if (meteor.isConnected && meteor.dataset.caught === 'false') {
            meteor.remove();
            meteorStormState.meteorElements = meteorStormState.meteorElements.filter(function(m) {
                return m !== meteor;
            });
        }
    }, (duration + 0.5) * 1000);
}

function createMeteorFlash(meteorEl) {
    const rect = meteorEl.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const flash = document.createElement('div');
    flash.className = 'meteor-flash';
    flash.style.position = 'fixed';
    flash.style.left = (x - 25) + 'px';
    flash.style.top = (y - 25) + 'px';
    flash.style.width = '50px';
    flash.style.height = '50px';
    flash.style.borderRadius = '50%';
    flash.style.background = 'radial-gradient(circle, rgba(255,215,0,0.9) 0%, transparent 70%)';
    flash.style.pointerEvents = 'none';
    flash.style.zIndex = '515';
    flash.style.animation = 'meteorFlashAnim 0.4s ease-out forwards';
    document.body.appendChild(flash);

    setTimeout(function() {
        flash.remove();
    }, 400);
}

function endMeteorStorm() {
    if (!meteorStormState.active) {
        return;
    }

    clearInterval(meteorStormState.timerInterval);
    clearInterval(meteorStormState.spawnInterval);
    meteorStormState.timerInterval = null;
    meteorStormState.spawnInterval = null;

    meteorStormState.meteorElements.forEach(function(m) {
        m.remove();
    });
    meteorStormState.meteorElements = [];

    const cfg = EVENTS_CONFIG.meteor_storm;
    const captured = meteorStormState.captured;

    const legendaryGeodes = Math.floor(captured.legendary / cfg.meteorTypes.legendary.requiredForGeode);
    const rareGeodes = Math.floor(captured.rare / cfg.meteorTypes.rare.requiredForGeode);
    const commonGeodes = Math.floor(captured.common / cfg.meteorTypes.common.requiredForGeode);

    const totalXP = legendaryGeodes * cfg.rewards.legendary.xpBonus +
                    rareGeodes * cfg.rewards.rare.xpBonus +
                    commonGeodes * cfg.rewards.common.xpBonus;

    if (_showMeteorStormResult) {
        _showMeteorStormResult({
            captured: captured,
            legendaryGeodes: legendaryGeodes,
            rareGeodes: rareGeodes,
            commonGeodes: commonGeodes,
            totalXP: totalXP
        });
    }

    meteorStormState.active = false;
}

function forceEndMeteorStorm() {
    clearInterval(meteorStormState.timerInterval);
    clearInterval(meteorStormState.spawnInterval);
    meteorStormState.timerInterval = null;
    meteorStormState.spawnInterval = null;

    meteorStormState.meteorElements.forEach(function(m) {
        m.remove();
    });
    meteorStormState.meteorElements = [];

    meteorStormState.active = false;
}

export function claimMeteorStormRewards() {
    const state = getPlayerState();
    const cfg = EVENTS_CONFIG.meteor_storm;
    const captured = meteorStormState.captured;

    const legendaryGeodes = Math.floor(captured.legendary / cfg.meteorTypes.legendary.requiredForGeode);
    const rareGeodes = Math.floor(captured.rare / cfg.meteorTypes.rare.requiredForGeode);
    const commonGeodes = Math.floor(captured.common / cfg.meteorTypes.common.requiredForGeode);

    if (legendaryGeodes > 0) {
        state.geodes[cfg.rewards.legendary.geodeId] = (state.geodes[cfg.rewards.legendary.geodeId] || 0) + legendaryGeodes;
        sendBotNotification('☄️ Игрок получил ' + legendaryGeodes + 'x ' + CONFIG_GEODES[cfg.rewards.legendary.geodeId].name + ' из Метеоритного Шторма!');
    }
    if (rareGeodes > 0) {
        state.geodes[cfg.rewards.rare.geodeId] = (state.geodes[cfg.rewards.rare.geodeId] || 0) + rareGeodes;
    }
    if (commonGeodes > 0) {
        state.geodes[cfg.rewards.common.geodeId] = (state.geodes[cfg.rewards.common.geodeId] || 0) + commonGeodes;
    }

    const totalXP = legendaryGeodes * cfg.rewards.legendary.xpBonus +
                    rareGeodes * cfg.rewards.rare.xpBonus +
                    commonGeodes * cfg.rewards.common.xpBonus;

    if (totalXP > 0) {
        addXP(totalXP);
    }

    saveGame();

    terminateEvent();

    document.getElementById('meteorStormOverlay').classList.remove('active');
    document.getElementById('meteorStormResultOverlay').classList.remove('active');
    clearActiveOverlay('meteorStorm');

    if (_showToast) {
        _showToast('Шторм завершён! +' + (commonGeodes + rareGeodes + legendaryGeodes) + ' жеод, +' + totalXP + ' XP', '☄️');
    }
    if (_renderCurrentTab) {
        _renderCurrentTab();
    }
}

export function exitMeteorStormEarly() {
    const state = getPlayerState();
    const cfg = EVENTS_CONFIG.meteor_storm;
    const captured = meteorStormState.captured;

    const legendaryGeodes = Math.floor(captured.legendary / cfg.meteorTypes.legendary.requiredForGeode);
    const rareGeodes = Math.floor(captured.rare / cfg.meteorTypes.rare.requiredForGeode);
    const commonGeodes = Math.floor(captured.common / cfg.meteorTypes.common.requiredForGeode);

    if (legendaryGeodes > 0) {
        state.geodes[cfg.rewards.legendary.geodeId] = (state.geodes[cfg.rewards.legendary.geodeId] || 0) + legendaryGeodes;
    }
    if (rareGeodes > 0) {
        state.geodes[cfg.rewards.rare.geodeId] = (state.geodes[cfg.rewards.rare.geodeId] || 0) + rareGeodes;
    }
    if (commonGeodes > 0) {
        state.geodes[cfg.rewards.common.geodeId] = (state.geodes[cfg.rewards.common.geodeId] || 0) + commonGeodes;
    }

    const totalXP = legendaryGeodes * cfg.rewards.legendary.xpBonus +
                    rareGeodes * cfg.rewards.rare.xpBonus +
                    commonGeodes * cfg.rewards.common.xpBonus;

    if (totalXP > 0) {
        addXP(totalXP);
    }

    saveGame();

    terminateEvent();

    document.getElementById('meteorStormOverlay').classList.remove('active');
    document.getElementById('meteorStormResultOverlay').classList.remove('active');
    clearActiveOverlay('meteorStorm');

    if (totalXP > 0 || (legendaryGeodes + rareGeodes + commonGeodes) > 0) {
        if (_showToast) {
            _showToast('Шторм прерван. Получено: +' + (commonGeodes + rareGeodes + legendaryGeodes) + ' жеод, +' + totalXP + ' XP', '☄️');
        }
    } else {
        if (_showToast) {
            _showToast('Шторм прерван. Вы не поймали метеоритов.', '⚠️');
        }
    }

    if (_renderCurrentTab) {
        _renderCurrentTab();
    }
}

// ========== ПРОТОКОЛ ЧИСТОГО ВЫХОДА ==========
export function terminateEvent() {
    if (meteorStormState.timerInterval) {
        clearInterval(meteorStormState.timerInterval);
        meteorStormState.timerInterval = null;
    }
    if (meteorStormState.spawnInterval) {
        clearInterval(meteorStormState.spawnInterval);
        meteorStormState.spawnInterval = null;
    }

    meteorStormState.meteorElements.forEach(function(m) {
        if (m.isConnected) {
            m.remove();
        }
    });
    meteorStormState.meteorElements = [];

    meteorStormState.active = false;
    meteorStormState.timer = 0;
    meteorStormState.captured = {
        legendary: 0,
        rare: 0,
        common: 0
    };
    meteorStormState.gameArea = null;

    const stormOverlay = document.getElementById('meteorStormOverlay');
    if (stormOverlay) {
        stormOverlay.classList.remove('active');
    }

    const resultOverlay = document.getElementById('meteorStormResultOverlay');
    if (resultOverlay) {
        resultOverlay.classList.remove('active');
    }
}
