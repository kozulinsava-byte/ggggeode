// ========== CORE МОДУЛЬ: ЛОГИКА ИГРЫ · ЖЁСТКИЙ ПОРЯДОК ЗАГРУЗКИ ==========
import { CONFIG_ITEMS, CONFIG_GEODES, CONFIG_EXPEDITIONS, CRAFT_RECIPES, LEVELS, DEFAULT_STATE } from './config.js';

// ========== ФАЗА 0: ГЛОБАЛЬНЫЙ ОБЪЕКТ СОСТОЯНИЯ (СОЗДАЁТСЯ ОДИН РАЗ) ==========
export let playerState = null;
const collectibleSerials = {};
let nextSerial = 1;

// ========== ВСПОМОГАТЕЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
const isTelegram = !!window.Telegram?.WebApp;
const tg = window.Telegram?.WebApp;
let isOpeningGeode = false;

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
    'showcaseOverlay', 'modalOverlay', 'brawlOverlay', 'conveyorOverlay',
    'forgeOverlay', 'forgeProgressOverlay', 'rewardPopupOverlay',
    'signalGameOverlay', 'meteorStormOverlay', 'meteorStormResultOverlay'
  ];
  overlays.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
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

// ========== ФАЗА 1: PRELOAD — СОЗДАНИЕ И ВАЛИДАЦИЯ СОСТОЯНИЯ ==========
export function initializeState() {
  console.log('[StarForge] ФАЗА 1: PRELOAD — создание состояния');
  
  // Создаём состояние ОДИН раз
  playerState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  playerState.echoCooldowns = {};
  playerState.expeditionBonuses = {};
  
  // Загружаем сохранения из localStorage
  try {
    const localData = localStorage.getItem('starforge_v1');
    if (localData) {
      const data = JSON.parse(localData);
      applySaveData(data);
      console.log('[StarForge] Local save loaded');
    } else {
      console.log('[StarForge] No local save — using DEFAULT_STATE');
    }
  } catch (e) {
    console.warn('[StarForge] Failed to load local save:', e);
  }
  
  // Загружаем из Telegram CloudStorage (асинхронно)
  if (isTelegram && tg.CloudStorage && typeof tg.CloudStorage.getItem === 'function') {
    try {
      tg.CloudStorage.getItem('starforge_save', (error, cloudData) => {
        if (!error && cloudData) {
          try {
            const data = JSON.parse(cloudData);
            applySaveData(data);
            localStorage.setItem('starforge_v1', cloudData);
            console.log('[StarForge] Cloud save loaded');
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
  console.log('[StarForge] State:', {
    level: playerState.player.level,
    xp: playerState.player.xp,
    geodes: { ...playerState.geodes },
    expeditions: { ...playerState.expeditions }
  });
  
  return playerState;
}

function applySaveData(data) {
  if (!data || !data.playerState) return;
  
  // Восстанавливаем состояние игрока
  if (data.playerState) {
    Object.assign(playerState, data.playerState);
    if (!playerState.echoCooldowns) playerState.echoCooldowns = {};
    if (!playerState.expeditionBonuses) playerState.expeditionBonuses = {};
  }
  
  // Восстанавливаем коллекционные номера
  if (data.collectibleSerials) {
    Object.assign(collectibleSerials, data.collectibleSerials);
  }
  
  if (data.nextSerial) {
    nextSerial = data.nextSerial;
  }
  
  // Восстанавливаем ивенты
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

// ========== ФАЗА 2: ВАЛИДАЦИЯ — ПРОВЕРКА ВСЕХ ДАННЫХ ==========
export function validateState() {
  console.log('[StarForge] ФАЗА 2: VALIDATION — проверка состояния');
  
  const now = Date.now();
  
  // Проверяем экспедиции
  for (let expId in playerState.expeditions) {
    const exp = playerState.expeditions[expId];
    if (!exp) {
      playerState.expeditions[expId] = { active: false, endTime: null };
      continue;
    }
    
    if (exp.active && exp.endTime) {
      if (now >= exp.endTime) {
        // Экспедиция завершилась пока игра была закрыта
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
      } else {
        console.log('[StarForge] Expedition in progress:', expId, 'Ends in', Math.floor((exp.endTime - now) / 1000), 's');
      }
    }
  }
  
  // Проверяем жеоды
  for (let geodeId in CONFIG_GEODES) {
    if (playerState.geodes[geodeId] === undefined) {
      playerState.geodes[geodeId] = 0;
    }
  }
  
  // Проверяем слитки
  for (let ingotId in CONFIG_ITEMS) {
    if (playerState.ingots[ingotId] === undefined) {
      playerState.ingots[ingotId] = 0;
    }
    if (playerState.minedStats[ingotId] === undefined) {
      playerState.minedStats[ingotId] = 0;
    }
  }
  
  // Проверяем коллекционные артефакты
  for (let locId in playerState.collectedArtifacts) {
    if (!Array.isArray(playerState.collectedArtifacts[locId])) {
      playerState.collectedArtifacts[locId] = [];
    }
  }
  
  // Проверяем открытые специальные жеоды
  for (let locId in playerState.discoveredSpecialGeodes) {
    if (playerState.discoveredSpecialGeodes[locId] === undefined) {
      playerState.discoveredSpecialGeodes[locId] = false;
    }
  }
  
  // Проверяем игрока
  if (!playerState.player) {
    playerState.player = { level: 1, xp: 0, totalOpened: 0, totalIngots: 0, totalArtifacts: 0 };
  }
  if (playerState.player.level === undefined) playerState.player.level = 1;
  if (playerState.player.xp === undefined) playerState.player.xp = 0;
  if (playerState.player.totalOpened === undefined) playerState.player.totalOpened = 0;
  if (playerState.player.totalIngots === undefined) playerState.player.totalIngots = 0;
  if (playerState.player.totalArtifacts === undefined) playerState.player.totalArtifacts = 0;
  
  console.log('[StarForge] ФАЗА 2: ЗАВЕРШЕНА — состояние валидно');
  
  return true;
}

// ========== ФАЗА 3: ЗАПУСК ИГРОВЫХ СИСТЕМ ==========
export function startGameSystems() {
  console.log('[StarForge] ФАЗА 3: RENDER — запуск игровых систем');
  
  // Запускаем цикл ивентов
  eventsManager.startEventCycle();
  
  // Запускаем глобальный таймер
  startGlobalTimer();
  
  console.log('[StarForge] ФАЗА 3: ЗАВЕРШЕНА — все системы запущены');
  
  return true;
}

// ========== МЕНЕДЖЕР ИВЕНТОВ ==========
export const eventsManager = {
  activeEvent: null,
  eventEndTime: null,
  eventInterval: null,
  eventPhase: 'idle',
  rotationIndex: 0,
  
  getActiveEvent() {
    if (this.activeEvent && this.eventEndTime && Date.now() < this.eventEndTime) {
      return this.activeEvent;
    }
    return null;
  },
  
  getTimeLeft() {
    if (!this.eventEndTime) return '0:00';
    const diff = Math.max(0, this.eventEndTime - Date.now());
    const m = Math.floor(diff / 60000);
    const s = Math.ceil((diff % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },
  
  startEventCycle() {
    if (this.eventInterval) clearInterval(this.eventInterval);
    
    // Проверяем, не идёт ли уже ивент
    const now = Date.now();
    if (this.activeEvent && this.eventEndTime && now < this.eventEndTime) {
      console.log('[StarForge] Event already in progress:', this.activeEvent.name);
      this.eventPhase = 'active';
      // Запускаем таймер до следующего ивента после окончания текущего
      const timeUntilEnd = this.eventEndTime - now;
      this.eventInterval = setTimeout(() => {
        this.endEvent();
        this.triggerNextEvent();
        this.eventInterval = setInterval(() => {
          this.triggerNextEvent();
        }, 30 * 60 * 1000);
      }, timeUntilEnd);
      return;
    }
    
    // Если нет активного ивента — запускаем новый
    this.triggerNextEvent();
    this.eventInterval = setInterval(() => {
      this.triggerNextEvent();
    }, 30 * 60 * 1000);
  },
  
  triggerNextEvent() {
    // Простое чередование
    if (!this.activeEvent || this.eventPhase === 'ending' || this.eventPhase === 'idle') {
      this.triggerGreatSmelt();
    } else if (this.activeEvent.type === 'great_smelt') {
      this.triggerMeteorStorm();
    } else {
      this.triggerGreatSmelt();
    }
  },
  
  triggerGreatSmelt() {
    this.activeEvent = {
      id: 'great_smelt',
      name: 'Великая Переплавка',
      icon: '🔥',
      description: 'Древние кузни остывают!',
      longDescription: 'Собери ресурсы и создай крафтовые предметы в Плавильне!',
      type: 'great_smelt'
    };
    this.eventEndTime = Date.now() + 15 * 60 * 1000;
    this.eventPhase = 'active';
    console.log('[StarForge] Event started: Великая Переплавка');
  },
  
  triggerMeteorStorm() {
    this.activeEvent = {
      id: 'meteor_storm',
      name: 'Метеоритный Шторм',
      icon: '☄️',
      description: 'Небо пылает! Лови падающие метеориты!',
      longDescription: 'Метеориты падают с небес! Тапай по ним, чтобы собрать.',
      type: 'meteor_storm'
    };
    this.eventEndTime = Date.now() + 15 * 60 * 1000;
    this.eventPhase = 'active';
    console.log('[StarForge] Event started: Метеоритный Шторм');
  },
  
  endEvent() {
    this.eventPhase = 'ending';
    console.log('[StarForge] Event ended:', this.activeEvent?.name);
  }
};

// ========== ПЛАВИЛЬНЯ (FORGE) ==========
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
    import('./ui.js').then(ui => ui.showToast('Плавильня закрыта!', '❄️'));
    return;
  }
  if (forgeState.active) return;
  forgeState.active = true;
  forgeState.selectedRecipe = null;
  setActiveOverlay('forge');
  
  const overlay = document.getElementById('forgeOverlay');
  const content = document.getElementById('forgeContent');
  renderForgeInterface(content);
  overlay.classList.add('active');
}

function renderForgeInterface(container) {
  const recipes = getCraftableRecipes();
  let html = `
    <div class="forge-title-section"><span class="forge-title-icon">🔥</span><span class="forge-title-text">ПЛАВИЛЬНЯ</span></div>
    <div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px;">Выбери рецепт и нажми «Сплавить»</div>
    <div class="recipe-grid">`;
  
  if (recipes.length === 0) {
    html += '<div class="empty-state" style="grid-column:1/-1;">Нет доступных рецептов</div>';
  } else {
    recipes.forEach((recipe) => {
      const isActive = forgeState.selectedRecipe && forgeState.selectedRecipe.id === recipe.id;
      const cardClass = isActive ? 'recipe-card active' : (recipe.canCraft ? 'recipe-card' : 'recipe-card disabled');
      html += `<div class="${cardClass}" data-recipe="${recipe.id}"><div class="recipe-card-icon">${recipe.icon}</div><div class="recipe-card-name">${recipe.name}</div><div class="recipe-card-ingredients">`;
      for (let ingId in recipe.ingredients) {
        const required = recipe.ingredients[ingId];
        const owned = playerState.ingots[ingId] || 0;
        const ing = CONFIG_ITEMS[ingId];
        html += `<div class="recipe-card-ingredient-row">${ing.icon} ${ing.name}: <span style="color:${owned >= required ? '#50C878' : '#FF4444'}">${owned} / ${required}</span></div>`;
      }
      html += `</div><div class="recipe-card-xp">+${recipe.xpReward} XP · ${recipe.smeltTime}с</div></div>`;
    });
  }
  
  html += `</div><div class="forge-action-area">
    <button class="forge-smelt-btn" id="forgeSmeltBtn" ${forgeState.selectedRecipe?.canCraft ? '' : 'disabled'}>${forgeState.selectedRecipe?.canCraft ? '⚡ СПЛАВИТЬ' : 'ВЫБЕРИТЕ РЕЦЕПТ'}</button>
    <button class="forge-exit-btn" id="forgeExitBtn">Выйти из Плавильни</button></div>`;
  
  container.innerHTML = html;
  
  container.querySelectorAll('.recipe-card:not(.disabled)').forEach((el) => {
    el.addEventListener('click', () => {
      const recipe = getCraftableRecipes().find(r => r.id === el.dataset.recipe);
      if (recipe?.canCraft) { forgeState.selectedRecipe = recipe; renderForgeInterface(container); }
    });
  });
  container.querySelector('#forgeSmeltBtn')?.addEventListener('click', () => {
    if (forgeState.selectedRecipe?.canCraft) startSmeltProcess(forgeState.selectedRecipe);
  });
  container.querySelector('#forgeExitBtn')?.addEventListener('click', closeForge);
}

function closeForge() {
  document.getElementById('forgeOverlay').classList.remove('active');
  document.getElementById('forgeContent').innerHTML = '';
  forgeState.active = false;
  forgeState.selectedRecipe = null;
  clearActiveOverlay('forge');
}

function startSmeltProcess(recipe) {
  document.getElementById('forgeOverlay').classList.remove('active');
  document.getElementById('forgeContent').innerHTML = '';
  
  forgeState.smeltMaxSeconds = recipe.smeltTime || 15;
  forgeState.smeltSeconds = forgeState.smeltMaxSeconds;
  
  document.getElementById('forgeProgressLabel').textContent = `Плавим ${recipe.name}...`;
  document.getElementById('forgeProgressFill').style.width = '0%';
  document.getElementById('forgeProgressTime').textContent = `${forgeState.smeltSeconds}с`;
  document.getElementById('forgeMolten').style.height = '0%';
  document.getElementById('forgeProgressOverlay').classList.add('active');
  
  if (forgeState.smeltInterval) clearInterval(forgeState.smeltInterval);
  
  forgeState.smeltInterval = setInterval(() => {
    forgeState.smeltSeconds--;
    const progress = ((forgeState.smeltMaxSeconds - forgeState.smeltSeconds) / forgeState.smeltMaxSeconds) * 100;
    document.getElementById('forgeProgressFill').style.width = progress + '%';
    document.getElementById('forgeProgressTime').textContent = `${forgeState.smeltSeconds}с`;
    document.getElementById('forgeMolten').style.height = progress + '%';
    if (forgeState.smeltSeconds <= 0) finishSmeltProcess(recipe);
  }, 1000);
}

function finishSmeltProcess(recipe) {
  if (forgeState.smeltInterval) { clearInterval(forgeState.smeltInterval); forgeState.smeltInterval = null; }
  document.getElementById('forgeProgressOverlay').classList.remove('active');
  
  for (let ingId in recipe.ingredients) playerState.ingots[ingId] -= recipe.ingredients[ingId];
  playerState.ingots[recipe.resultIngotId] = (playerState.ingots[recipe.resultIngotId] || 0) + 1;
  playerState.minedStats[recipe.resultIngotId] = (playerState.minedStats[recipe.resultIngotId] || 0) + 1;
  playerState.player.totalIngots++;
  addXP(recipe.xpReward);
  saveGame();
  
  import('./ui.js').then(ui => {
    ui.showToast(`Создано: ${CONFIG_ITEMS[recipe.resultIngotId]?.name || recipe.name}!`, recipe.icon);
    ui.renderCurrentTab();
  });
  
  forgeState.active = false;
  forgeState.selectedRecipe = null;
  clearActiveOverlay('forge');
}

// ---------- СИСТЕМА КРАФТА ----------
export function getCraftableRecipes() {
  const recipes = [];
  for (let recipeId in CRAFT_RECIPES) {
    const recipe = CRAFT_RECIPES[recipeId];
    let canCraft = true;
    for (let ingId in recipe.ingredients) {
      if ((playerState.ingots[ingId] || 0) < recipe.ingredients[ingId]) { canCraft = false; break; }
    }
    recipes.push({ ...recipe, canCraft });
  }
  return recipes;
}

export function craftItem(recipeId) {
  const found = getCraftableRecipes().find(r => r.id === recipeId);
  if (!found?.canCraft) {
    import('./ui.js').then(ui => ui.showToast('Недостаточно ресурсов!', '⚠️'));
    return false;
  }
  return craftItemDirect(found);
}

function craftItemDirect(recipe) {
  if (!recipe) return false;
  for (let ingId in recipe.ingredients) playerState.ingots[ingId] -= recipe.ingredients[ingId];
  playerState.ingots[recipe.resultIngotId] = (playerState.ingots[recipe.resultIngotId] || 0) + 1;
  playerState.minedStats[recipe.resultIngotId] = (playerState.minedStats[recipe.resultIngotId] || 0) + 1;
  playerState.player.totalIngots++;
  addXP(recipe.xpReward);
  saveGame();
  return true;
}

// ---------- DEV ФУНКЦИИ ----------
export function devGiveXP() { playerState.player.xp += 1000000; while (playerState.player.level < LEVELS.length - 1 && playerState.player.xp >= LEVELS[playerState.player.level]) playerState.player.level++; }
export function devGiveGeodes() { Object.keys(CONFIG_GEODES).forEach(id => playerState.geodes[id] = (playerState.geodes[id] || 0) + 10); }
export function devUnlockLocations() { playerState.player.level = Math.max(playerState.player.level, 10); }
export function devResetGeodes() { Object.keys(CONFIG_GEODES).forEach(id => playerState.geodes[id] = 10); }

export function getSerialForCollectible(ingotId) {
  if (!collectibleSerials[ingotId]) collectibleSerials[ingotId] = String(nextSerial++).padStart(3, '0');
  return collectibleSerials[ingotId];
}

export function isLocationCompleted(locId) {
  const special = CONFIG_GEODES[`special_${locId}`];
  return special ? special.possibleIngots.every(id => playerState.ingots[id] > 0) : false;
}

export function getExpeditionTimeLeft(expId) {
  const exp = playerState.expeditions[expId];
  return (exp?.active && exp.endTime) ? Math.max(0, exp.endTime - Date.now()) : null;
}

export function addXP(amount) {
  playerState.player.xp += amount;
  while (playerState.player.level < LEVELS.length - 1 && playerState.player.xp >= LEVELS[playerState.player.level]) {
    playerState.player.level++;
    import('./ui.js').then(ui => ui.showToast(`🎉 Уровень ${playerState.player.level}!`, '⬆️'));
    sendBotNotification(`⭐ Игрок достиг ${playerState.player.level} уровня!`);
  }
  saveGame();
}

export function sellIngot(ingotId) {
  const ingot = CONFIG_ITEMS[ingotId];
  if (ingot.isCollectible) { import('./ui.js').then(ui => ui.showToast('Коллекционные артефакты нельзя сдавать!', '⚠️')); return; }
  if ((playerState.ingots[ingotId] || 0) <= 0) { import('./ui.js').then(ui => ui.showToast('Нет слитков!', '⚠️')); return; }
  const count = playerState.ingots[ingotId];
  playerState.ingots[ingotId] = 0;
  addXP(ingot.sellValue * count);
  saveGame();
  import('./ui.js').then(ui => { ui.showToast(`Сдано ${count} ${ingot.name}!`, '💰'); ui.renderCurrentTab(); });
}

export function exchangeSpecialGeodeForXP(geodeId) {
  if ((playerState.geodes[geodeId] || 0) <= 0) { import('./ui.js').then(ui => ui.showToast('Нет такой жеоды!', '⚠️')); return; }
  const g = CONFIG_GEODES[geodeId];
  if (!g?.isSpecial) return;
  if (!isLocationCompleted(g.location)) { import('./ui.js').then(ui => ui.showToast('Сначала соберите все артефакты!', '⚠️')); return; }
  playerState.geodes[geodeId]--;
  addXP(800);
  saveGame();
  import('./ui.js').then(ui => { ui.showToast('Жеода изучена! +800 XP', '📚'); ui.renderCurrentTab(); });
}

// ---------- СИСТЕМА СОХРАНЕНИЙ ----------
export function saveGame() {
  if (!playerState) return;
  const saveData = JSON.stringify({
    playerState, collectibleSerials, nextSerial,
    activeEvent: eventsManager.activeEvent,
    eventEndTime: eventsManager.eventEndTime,
    eventPhase: eventsManager.eventPhase,
    rotationIndex: eventsManager.rotationIndex
  });
  try { localStorage.setItem('starforge_v1', saveData); } catch(e) {}
  if (isTelegram && tg.CloudStorage?.setItem) {
    try { tg.CloudStorage.setItem('starforge_save', saveData, () => {}); } catch(e) {}
  }
}

// ---------- ЭКСПЕДИЦИИ ----------
function getRandomDropFromExpedition(expId) {
  const exp = CONFIG_EXPEDITIONS[expId];
  if (!exp) return { geodeId: 'mine', isSpecial: false };
  const playerExp = playerState.expeditions[expId];
  let specialChance = exp.specialGeodeChance;
  if (playerExp?.scanUsed && playerExp?.specialChanceBoost) specialChance *= playerExp.specialChanceBoost;
  if (!isLocationCompleted(expId) && Math.random() < specialChance) {
    return { geodeId: exp.specialGeodeId, isSpecial: true };
  }
  return { geodeId: expId, isSpecial: false };
}

function checkCompletedExpeditions() {
  if (!playerState) return;
  let changed = false;
  const now = Date.now();
  for (let k in playerState.expeditions) {
    const exp = playerState.expeditions[k];
    if (exp?.active && exp.endTime && now >= exp.endTime) {
      console.log('[StarForge] Expedition completed:', k);
      exp.active = false;
      exp.endTime = null;
      exp.scanUsed = false;
      exp.specialChanceBoost = null;
      delete playerState.expeditionBonuses[k];
      const drop = getRandomDropFromExpedition(k);
      playerState.geodes[drop.geodeId] = (playerState.geodes[drop.geodeId] || 0) + 1;
      if (drop.isSpecial && !playerState.discoveredSpecialGeodes[k]) {
        playerState.discoveredSpecialGeodes[k] = true;
      }
      changed = true;
    }
  }
  if (changed) {
    saveGame();
    import('./ui.js').then(ui => ui.renderCurrentTab());
  }
}

let globalTimerInterval = null;

export function startGlobalTimer() {
  if (globalTimerInterval) clearInterval(globalTimerInterval);
  globalTimerInterval = setInterval(() => {
    if (!playerState) return;
    checkCompletedExpeditions();
    updateExpeditionTimers();
    updateEventTimer();
  }, 500);
}

function updateExpeditionTimers() {
  if (!playerState) return;
  const now = Date.now();
  for (let k in CONFIG_EXPEDITIONS) {
    const exp = playerState.expeditions[k];
    const el = document.getElementById(`timer-${k}`);
    if (el && exp?.active && exp.endTime) {
      const diff = Math.max(0, exp.endTime - now);
      const m = Math.floor(diff / 60000);
      const s = Math.ceil((diff % 60000) / 1000);
      el.textContent = `⏳ ${m}:${s.toString().padStart(2, '0')}`;
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
    import('./ui.js').then(ui => ui.renderCurrentTab());
  }
}

export function startExpedition(expId) {
  console.log('[StarForge] startExpedition called:', expId);
  console.log('[StarForge] playerState exists:', !!playerState);
  
  if (!playerState) {
    console.error('[StarForge] playerState is null!');
    return false;
  }
  
  const exp = playerState.expeditions[expId];
  if (!exp) {
    console.error('[StarForge] No expedition state for:', expId);
    return false;
  }
  
  if (exp.active) {
    console.warn('[StarForge] Expedition already active:', expId);
    import('./ui.js').then(ui => ui.showToast('Экспедиция уже в пути!', '⏳'));
    return false;
  }
  
  const config = CONFIG_EXPEDITIONS[expId];
  if (!config) {
    console.error('[StarForge] No config for:', expId);
    return false;
  }
  
  exp.active = true;
  exp.endTime = Date.now() + config.timer * 1000;
  exp.scanUsed = false;
  exp.specialChanceBoost = null;
  delete playerState.expeditionBonuses[expId];
  
  console.log('[StarForge] Expedition STARTED:', expId, 'End:', new Date(exp.endTime).toLocaleTimeString());
  
  saveGame();
  
  import('./ui.js').then(ui => {
    ui.showToast(`Экспедиция «${config.name}» началась!`, config.fallbackIcon);
    ui.renderExpeditionsTab();
  });
  
  sendBotNotification(`⛏️ Игрок отправился в экспедицию: ${config.name}`);
  
  return true;
}

// ---------- ЧАСТИЦЫ ----------
function createParticles(x, y) {
  const container = document.getElementById('app');
  if (!container) return;
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = (i / 12) * Math.PI * 2;
    const d = 40 + Math.random() * 60;
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.setProperty('--tx', Math.cos(angle) * d + 'px');
    p.style.setProperty('--ty', Math.sin(angle) * d + 'px');
    container.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

function createEliteParticles() {
  const container = document.getElementById('app');
  if (!container) return;
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('div');
    p.className = 'elite-particle';
    p.style.left = (window.innerWidth / 2) + 'px';
    p.style.top = (window.innerHeight / 2) + 'px';
    p.style.animationDelay = (i * 0.1) + 's';
    container.appendChild(p);
    setTimeout(() => p.remove(), 2500);
  }
}

function triggerScreenShake() {
  const app = document.getElementById('app');
  if (app) { app.classList.add('screen-shake'); setTimeout(() => app.classList.remove('screen-shake'), 120); }
}

function showCollectibleAnimation(ingot) {
  const flash = document.createElement('div');
  flash.className = 'collectible-flash';
  document.body.appendChild(flash);
  createEliteParticles();
  const appear = document.createElement('div');
  appear.className = 'collectible-appear';
  appear.innerHTML = `<div class="collectible-appear-icon" style="color:${ingot.fallbackColor}">${ingot.icon}</div><div class="collectible-appear-text">${ingot.name}</div>`;
  document.body.appendChild(appear);
  setTimeout(() => { flash.remove(); appear.remove(); }, 2500);
  sendBotNotification(`🏆 Коллекционный артефакт: ${ingot.name}!`);
}

// ---------- КОНВЕЙЕР ----------
let conveyorState = { geodeId: null, isOpen: false, resultIngot: null, items: [], trackItems: [], timeoutId: null };
const ITEM_WIDTH = 96;

function cleanupConveyor() {
  if (conveyorState.timeoutId) { clearTimeout(conveyorState.timeoutId); conveyorState.timeoutId = null; }
  document.getElementById('conveyorOverlay').classList.remove('active');
  conveyorState.isOpen = false;
}

export function initRoulette(geodeId) {
  const g = CONFIG_GEODES[geodeId];
  if (!g || g.isSpecial) return;
  
  const rand = Math.random();
  let cum = 0, droppedId = g.lootTable[0].ingotId;
  for (let e of g.lootTable) { cum += e.chance; if (rand < cum) { droppedId = e.ingotId; break; } }
  
  const resultIngot = CONFIG_ITEMS[droppedId];
  const items = g.lootTable.map(e => CONFIG_ITEMS[e.ingotId]);
  const trackItems = Array.from({ length: 30 }, (_, i) => items[i % items.length]);
  trackItems[19] = resultIngot;
  
  conveyorState = { geodeId, isOpen: true, resultIngot, items, trackItems, timeoutId: null };
  setActiveOverlay('conveyor');
  
  const track = document.getElementById('conveyorTrack');
  track.innerHTML = '';
  trackItems.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'conveyor-item';
    el.innerHTML = `<div class="conveyor-item-icon" id="conv-${i}"></div><div class="conveyor-item-name">${item.name}</div>`;
    track.appendChild(el);
  });
  
  import('./ui.js').then(ui => {
    trackItems.forEach((item, i) => ui.renderImageToElement(document.getElementById(`conv-${i}`), item.imagePath, item.icon, item.fallbackColor));
  });
  
  document.getElementById('conveyorTitle').textContent = `Анализ ${g.name}...`;
  document.getElementById('conveyorOverlay').classList.add('active');
  
  track.style.transition = 'none';
  track.style.transform = 'translateX(0)';
  track.offsetHeight;
  
  const stopPos = -(19 * ITEM_WIDTH) + (3 * ITEM_WIDTH / 2) - ITEM_WIDTH / 2;
  setTimeout(() => {
    track.style.transition = 'transform 4.5s cubic-bezier(0.2, 0, 0.1, 1)';
    track.style.transform = `translateX(${stopPos}px)`;
  }, 50);
  
  conveyorState.timeoutId = setTimeout(() => stopRoulette(), 4550);
}

function stopRoulette() {
  if (!conveyorState.isOpen) return;
  const ingot = conveyorState.resultIngot;
  const g = CONFIG_GEODES[conveyorState.geodeId];
  let xp = g.xpValue + (ingot?.xpValue || 0);
  if (playerState.minedStats[ingot.id] === 0) { xp = Math.floor(xp * 3); }
  
  playerState.ingots[ingot.id] = (playerState.ingots[ingot.id] || 0) + 1;
  playerState.minedStats[ingot.id] = (playerState.minedStats[ingot.id] || 0) + 1;
  playerState.player.totalIngots++;
  addXP(xp);
  saveGame();
  cleanupConveyor();
  clearActiveOverlay('conveyor');
  isOpeningGeode = false;
  
  import('./ui.js').then(ui => {
    ui.showRewardPopup(ingot);
    ui.renderCurrentTab();
  });
}

// ---------- КУЗНИЦА (BRAWL) ----------
let brawlState = { geodeId: null, isSpecial: false, tapsRemaining: 10, isOpen: false };

export function openBrawlOverlay(geodeId, isSpecial) {
  if (isOpeningGeode) return;
  if ((playerState.geodes[geodeId] || 0) <= 0) {
    import('./ui.js').then(ui => ui.showToast('Нет такой жеоды!', '⚠️'));
    return;
  }
  if (isSpecial && isLocationCompleted(CONFIG_GEODES[geodeId].location)) {
    import('./ui.js').then(ui => ui.showToast('Все артефакты собраны!', '📚'));
    return;
  }
  
  isOpeningGeode = true;
  brawlState = { geodeId, isSpecial, tapsRemaining: 10, isOpen: true };
  setActiveOverlay('brawl');
  
  const brawlGeode = document.getElementById('brawlGeode');
  document.getElementById('brawlCounter').textContent = '10';
  document.getElementById('brawlResult').classList.remove('show');
  document.getElementById('brawlCloseBtn').style.display = 'none';
  brawlGeode.style.display = 'flex';
  brawlGeode.classList.remove('explode-animation');
  brawlGeode.classList.toggle('special-geode', isSpecial);
  document.querySelector('.brawl-hint').style.display = 'block';
  document.getElementById('brawlCounter').style.display = 'block';
  
  import('./ui.js').then(ui => {
    const stage = ui.getGeodeStageImage(geodeId, 10);
    ui.renderImageToElement(brawlGeode, stage.imagePath, stage.fallbackIcon, '#8B7355');
  });
  document.getElementById('brawlOverlay').classList.add('active');
}

function closeBrawlOverlay() {
  document.getElementById('brawlOverlay').classList.remove('active');
  brawlState.isOpen = false;
  isOpeningGeode = false;
  clearActiveOverlay('brawl');
  import('./ui.js').then(ui => ui.renderCurrentTab());
}

function handleBrawlTap(e) {
  if (!brawlState.isOpen || brawlState.tapsRemaining <= 0) return;
  const rect = document.getElementById('brawlGeode').getBoundingClientRect();
  createParticles(rect.left + rect.width/2, rect.top + rect.height/2);
  triggerScreenShake();
  document.getElementById('brawlGeode').classList.add('shake-animation');
  setTimeout(() => document.getElementById('brawlGeode').classList.remove('shake-animation'), 300);
  
  brawlState.tapsRemaining--;
  document.getElementById('brawlCounter').textContent = brawlState.tapsRemaining;
  import('./ui.js').then(ui => {
    const stage = ui.getGeodeStageImage(brawlState.geodeId, brawlState.tapsRemaining);
    ui.renderImageToElement(document.getElementById('brawlGeode'), stage.imagePath, stage.fallbackIcon, '#8B7355');
  });
  if (brawlState.tapsRemaining <= 0) finishBrawlOpening();
}

function finishBrawlOpening() {
  const { geodeId, isSpecial } = brawlState;
  if (playerState.geodes[geodeId] > 0) playerState.geodes[geodeId]--;
  playerState.player.totalOpened++;
  
  if (isSpecial) {
    const g = CONFIG_GEODES[geodeId];
    const loc = g.location;
    const available = g.possibleIngots.filter(id => !playerState.collectedArtifacts[loc].includes(id));
    const picked = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : g.possibleIngots[0];
    const ingot = CONFIG_ITEMS[picked];
    playerState.ingots[picked] = (playerState.ingots[picked] || 0) + 1;
    playerState.minedStats[picked] = (playerState.minedStats[picked] || 0) + 1;
    if (!playerState.collectedArtifacts[loc].includes(picked)) {
      playerState.collectedArtifacts[loc].push(picked);
      playerState.player.totalArtifacts++;
    }
    if (!playerState.discoveredSpecialGeodes[loc]) playerState.discoveredSpecialGeodes[loc] = true;
    addXP(ingot.xpValue);
    saveGame();
    if (ingot.isCollectible && playerState.ingots[picked] === 1) showCollectibleAnimation(ingot);
    
    document.getElementById('brawlGeode').classList.add('explode-animation');
    document.querySelector('.brawl-hint').style.display = 'none';
    document.getElementById('brawlCounter').style.display = 'none';
    
    setTimeout(() => {
      document.getElementById('brawlGeode').style.display = 'none';
      import('./ui.js').then(ui => {
        ui.renderImageToElement(document.getElementById('brawlResultIcon'), ingot.imagePath, ingot.icon, ingot.fallbackColor);
        document.getElementById('brawlResultName').textContent = ingot.name;
        document.getElementById('brawlResultRarity').textContent = ingot.rarity;
        document.getElementById('brawlResult').classList.add('show');
        document.getElementById('brawlCloseBtn').style.display = 'block';
      });
      isOpeningGeode = false;
      clearActiveOverlay('brawl');
      import('./ui.js').then(ui => ui.renderCurrentTab());
    }, 500);
  } else {
    document.getElementById('brawlGeode').classList.add('explode-animation');
    document.querySelector('.brawl-hint').style.display = 'none';
    document.getElementById('brawlCounter').style.display = 'none';
    setTimeout(() => {
      document.getElementById('brawlOverlay').classList.remove('active');
      brawlState.isOpen = false;
      clearActiveOverlay('brawl');
      initRoulette(geodeId);
    }, 500);
  }
}

// ========== МЕТЕОРИТНЫЙ ШТОРМ (ЗАГЛУШКА) ==========
export let meteorStormState = { active: false, timer: 0, timerInterval: null, spawnInterval: null, meteorElements: [], captured: { legendary: 0, rare: 0, common: 0 } };

export function openMeteorStorm() {
  import('./ui.js').then(ui => ui.showToast('Метеоритный Шторм в разработке!', '☄️'));
}

export function claimMeteorStormRewards() {}
export function exitMeteorStormEarly() {}

export function terminateEvent() {
  if (meteorStormState.timerInterval) { clearInterval(meteorStormState.timerInterval); meteorStormState.timerInterval = null; }
  if (meteorStormState.spawnInterval) { clearInterval(meteorStormState.spawnInterval); meteorStormState.spawnInterval = null; }
  meteorStormState.meteorElements.forEach(m => { if (m.isConnected) m.remove(); });
  meteorStormState.meteorElements = [];
  meteorStormState.active = false;
}

// Привязка событий кузницы после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('brawlGeode')?.addEventListener('click', handleBrawlTap);
  document.getElementById('brawlCloseBtn')?.addEventListener('click', closeBrawlOverlay);
});
