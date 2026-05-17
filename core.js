// ========== CORE МОДУЛЬ: ЛОГИКА ИГРЫ · Alpha 0.01 СТАБИЛИЗАЦИЯ ==========
import { CONFIG_ITEMS, CONFIG_GEODES, CONFIG_EXPEDITIONS, CRAFT_RECIPES, LEVELS, DEFAULT_STATE } from './config.js';
import { showToast, getGeodeStageImage, updateProfileUI, updateCollectionProgress, renderCurrentTab, renderExpeditionsTab, renderImageToElement, showRewardPopup } from './ui.js';

// ========== ВРЕМЕННЫЙ МОДУЛЬ ОТЛАДКИ ==========
const AppDebugger = {
  enabled: true,
  log: function(tag, message, data) {
    if (!this.enabled) return;
    if (data !== undefined) {
      console.log('[Debug:' + tag + '] ' + message, data);
    } else {
      console.log('[Debug:' + tag + '] ' + message);
    }
  },
  warn: function(tag, message, data) {
    if (!this.enabled) return;
    if (data !== undefined) {
      console.warn('[Debug:' + tag + '] ' + message, data);
    } else {
      console.warn('[Debug:' + tag + '] ' + message);
    }
  },
  error: function(tag, message, data) {
    if (!this.enabled) return;
    if (data !== undefined) {
      console.error('[Debug:' + tag + '] ' + message, data);
    } else {
      console.error('[Debug:' + tag + '] ' + message);
    }
  }
};

const isTelegram = !!window.Telegram?.WebApp;
const tg = window.Telegram?.WebApp;

if (tg) {
  try {
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor('#000000'); } catch(e) {}
    try { tg.setBackgroundColor('#000000'); } catch(e) {}
  } catch(e) {
    console.warn('[StarForge] Telegram init error:', e);
  }
}

export let playerState = {
  expeditions: {},
  geodes: {},
  ingots: {},
  discoveredSpecialGeodes: {},
  collectedArtifacts: {},
  minedStats: {},
  player: {},
  echoCooldowns: {},
  expeditionBonuses: {}
};

const collectibleSerials = {};
let nextSerial = 1;

Object.keys(CONFIG_ITEMS).forEach((k) => {
  DEFAULT_STATE.ingots[k] = 0;
  DEFAULT_STATE.minedStats[k] = 0;
});

let isOpeningGeode = false;

export function sendBotNotification(message) {
  console.log('[StarForge Bot Notification]', message);
}

export function showSkeleton() {
  const mainContent = document.getElementById('mainContent');
  if (mainContent) {
    mainContent.innerHTML = `
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
  
  getActiveEvent() {
    if (this.activeEvent && this.eventEndTime && Date.now() < this.eventEndTime) {
      return this.activeEvent;
    }
    return null;
  },
  
  getTimeLeft() {
    if (!this.eventEndTime) return '';
    const diff = Math.max(0, this.eventEndTime - Date.now());
    const m = Math.floor(diff / 60000);
    const s = Math.ceil((diff % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },
  
  startEventCycle() {
    if (this.eventInterval) clearInterval(this.eventInterval);
    this.triggerGreatSmelt();
    this.eventInterval = setInterval(() => {
      this.triggerGreatSmelt();
    }, 30 * 60 * 1000);
  },
  
  triggerGreatSmelt() {
    this.activeEvent = {
      id: 'great_smelt',
      name: '🔥 Великая Переплавка',
      icon: '🔥',
      description: 'Древние кузни остывают!',
      longDescription: 'Собери ресурсы и создай крафтовые предметы в Плавильне!'
    };
    this.eventEndTime = Date.now() + 15 * 60 * 1000;
    this.eventPhase = 'active';
    
    showToast('🔥 Великая Переплавка началась!', '🔥');
    sendBotNotification('🚀 Кузня открыта! 15 минут для переплавки!');
    saveGame();
  },
  
  endEvent() {
    this.eventPhase = 'ending';
    showToast('❄️ Переплавка завершена!', '❄️');
    sendBotNotification('❄️ Кузни остыли.');
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
  if (!event || event.id !== 'great_smelt') {
    showToast('Плавильня закрыта! Дождитесь Великой Переплавки.', '❄️');
    return;
  }
  
  if (forgeState.active) return;
  forgeState.active = true;
  forgeState.selectedRecipe = null;
  
  const overlay = document.getElementById('forgeOverlay');
  const content = document.getElementById('forgeContent');
  
  renderForgeInterface(content);
  overlay.classList.add('active');
}

function renderForgeInterface(container) {
  const recipes = getCraftableRecipes();
  
  let html = `
    <div class="forge-title-section">
      <span class="forge-title-icon">🔥</span>
      <span class="forge-title-text">ПЛАВИЛЬНЯ</span>
    </div>
    <div style="font-size:11px; color:var(--text-secondary); margin-bottom:6px;">
      Выбери рецепт и нажми «Сплавить»
    </div>
    <div class="recipe-grid">
  `;
  
  if (recipes.length === 0) {
    html += '<div class="empty-state" style="grid-column:1/-1;">Нет доступных рецептов</div>';
  } else {
    recipes.forEach((recipe) => {
      const isActive = forgeState.selectedRecipe && forgeState.selectedRecipe.id === recipe.id;
      const cardClass = isActive ? 'recipe-card active' : (recipe.canCraft ? 'recipe-card' : 'recipe-card disabled');
      
      html += `
        <div class="${cardClass}" data-recipe="${recipe.id}">
          <div class="recipe-card-icon">${recipe.icon}</div>
          <div class="recipe-card-name">${recipe.name}</div>
          <div class="recipe-card-ingredients">
      `;
      
      for (let ingId in recipe.ingredients) {
        const required = recipe.ingredients[ingId];
        const owned = playerState.ingots[ingId] || 0;
        const hasEnough = owned >= required;
        const ing = CONFIG_ITEMS[ingId];
        
        html += `
          <div class="recipe-card-ingredient-row">
            ${ing.icon} ${ing.name}: 
            <span style="color: ${hasEnough ? '#50C878' : '#FF4444'}">
              ${owned} / ${required}
            </span>
          </div>
        `;
      }
      
      html += `
          </div>
          <div class="recipe-card-xp">+${recipe.xpReward} XP · ${recipe.smeltTime}с</div>
        </div>
      `;
    });
  }
  
  html += `
    </div>
    <div class="forge-action-area">
      <button class="forge-smelt-btn" id="forgeSmeltBtn" ${forgeState.selectedRecipe && forgeState.selectedRecipe.canCraft ? '' : 'disabled'}>
        ${forgeState.selectedRecipe && forgeState.selectedRecipe.canCraft ? '⚡ СПЛАВИТЬ' : 'ВЫБЕРИТЕ РЕЦЕПТ'}
      </button>
      <button class="forge-exit-btn" id="forgeExitBtn">Выйти из Плавильни</button>
    </div>
  `;
  
  container.innerHTML = html;
  
  container.querySelectorAll('.recipe-card:not(.disabled)').forEach((el) => {
    el.addEventListener('click', () => {
      const recipeId = el.dataset.recipe;
      const recipe = getCraftableRecipes().find(r => r.id === recipeId);
      if (recipe && recipe.canCraft) {
        forgeState.selectedRecipe = recipe;
        renderForgeInterface(container);
      }
    });
  });
  
  const smeltBtn = container.querySelector('#forgeSmeltBtn');
  if (smeltBtn) {
    smeltBtn.addEventListener('click', () => {
      if (forgeState.selectedRecipe && forgeState.selectedRecipe.canCraft) {
        startSmeltProcess(forgeState.selectedRecipe);
      }
    });
  }
  
  const exitBtn = container.querySelector('#forgeExitBtn');
  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
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
  
  progressLabel.textContent = `Плавим ${recipe.name}...`;
  progressFill.style.width = '0%';
  progressTime.textContent = `${forgeState.smeltSeconds}с`;
  moltenEl.style.height = '0%';
  progressOverlay.classList.add('active');
  
  if (forgeState.smeltInterval) clearInterval(forgeState.smeltInterval);
  
  forgeState.smeltInterval = setInterval(() => {
    forgeState.smeltSeconds--;
    
    const elapsed = forgeState.smeltMaxSeconds - forgeState.smeltSeconds;
    const progress = (elapsed / forgeState.smeltMaxSeconds) * 100;
    
    progressFill.style.width = progress + '%';
    progressTime.textContent = `${forgeState.smeltSeconds}с`;
    moltenEl.style.height = progress + '%';
    
    if (forgeState.smeltSeconds <= 0) {
      finishSmeltProcess(recipe);
    }
  }, 1000);
}

function finishSmeltProcess(recipe) {
  if (forgeState.smeltInterval) {
    clearInterval(forgeState.smeltInterval);
    forgeState.smeltInterval = null;
  }
  
  document.getElementById('forgeProgressOverlay').classList.remove('active');
  
  for (let ingId in recipe.ingredients) {
    playerState.ingots[ingId] -= recipe.ingredients[ingId];
  }
  
  playerState.ingots[recipe.resultIngotId] = (playerState.ingots[recipe.resultIngotId] || 0) + 1;
  playerState.minedStats[recipe.resultIngotId] = (playerState.minedStats[recipe.resultIngotId] || 0) + 1;
  playerState.player.totalIngots++;
  
  addXP(recipe.xpReward);
  saveGame();
  
  const resultItem = CONFIG_ITEMS[recipe.resultIngotId];
  showToast(`Создано: ${resultItem?.name || recipe.name}! +${recipe.xpReward} XP`, recipe.icon);
  sendBotNotification(`⚡ Игрок создал ${resultItem?.name || recipe.name} в Плавильне!`);
  
  forgeState.active = false;
  forgeState.selectedRecipe = null;
  renderCurrentTab();
}

// ---------- СИСТЕМА КРАФТА ----------
export function getCraftableRecipes() {
  const recipes = [];
  
  for (let recipeId in CRAFT_RECIPES) {
    const recipe = CRAFT_RECIPES[recipeId];
    let canCraft = true;
    
    for (let ingId in recipe.ingredients) {
      const required = recipe.ingredients[ingId];
      const owned = playerState.ingots[ingId] || 0;
      if (owned < required) {
        canCraft = false;
        break;
      }
    }
    
    recipes.push({ ...recipe, canCraft });
  }
  
  return recipes;
}

export function craftItem(recipeId) {
  const recipe = CRAFT_RECIPES[recipeId];
  if (!recipe) {
    showToast('Рецепт не найден!', '⚠️');
    return false;
  }
  
  const recipes = getCraftableRecipes();
  const found = recipes.find(r => r.id === recipeId);
  if (!found || !found.canCraft) {
    showToast('Недостаточно ресурсов!', '⚠️');
    return false;
  }
  
  return craftItemDirect(found);
}

function craftItemDirect(recipe) {
  if (!recipe) return false;
  
  for (let ingId in recipe.ingredients) {
    playerState.ingots[ingId] -= recipe.ingredients[ingId];
  }
  
  playerState.ingots[recipe.resultIngotId] = (playerState.ingots[recipe.resultIngotId] || 0) + 1;
  playerState.minedStats[recipe.resultIngotId] = (playerState.minedStats[recipe.resultIngotId] || 0) + 1;
  playerState.player.totalIngots++;
  
  addXP(recipe.xpReward);
  saveGame();
  return true;
}

// ---------- DEV ФУНКЦИИ ----------
export function devGiveXP() {
  playerState.player.xp += 1000000;
  while (playerState.player.level < LEVELS.length - 1 && playerState.player.xp >= LEVELS[playerState.player.level]) {
    playerState.player.level++;
  }
  updateProfileUI();
  updateCollectionProgress();
}

export function devGiveGeodes() {
  Object.keys(CONFIG_GEODES).forEach(geodeId => {
    playerState.geodes[geodeId] = (playerState.geodes[geodeId] || 0) + 10;
  });
}

export function devUnlockLocations() {
  playerState.player.level = Math.max(playerState.player.level, 10);
  updateProfileUI();
}

export function devResetGeodes() {
  Object.keys(CONFIG_GEODES).forEach(geodeId => {
    playerState.geodes[geodeId] = 10;
  });
}

export function getSerialForCollectible(ingotId) {
  if (!collectibleSerials[ingotId]) {
    collectibleSerials[ingotId] = String(nextSerial++).padStart(3, '0');
  }
  return collectibleSerials[ingotId];
}

export function isLocationCompleted(locId) {
  const special = CONFIG_GEODES[`special_${locId}`];
  if (!special) return false;
  return special.possibleIngots.every((ingId) => playerState.ingots[ingId] > 0);
}

export function getExpeditionTimeLeft(expId) {
  const exp = playerState.expeditions[expId];
  if (!exp || !exp.active || !exp.endTime) return null;
  return Math.max(0, exp.endTime - Date.now());
}

export function addXP(amount) {
  playerState.player.xp += amount;
  
  while (playerState.player.level < LEVELS.length - 1 && playerState.player.xp >= LEVELS[playerState.player.level]) {
    playerState.player.level++;
    showToast(`🎉 Уровень ${playerState.player.level}!`, '⬆️');
    sendBotNotification(`⭐ Игрок достиг ${playerState.player.level} уровня!`);
  }
  
  updateProfileUI();
  updateCollectionProgress();
  saveGame();
}

export function sellIngot(ingotId) {
  const ingot = CONFIG_ITEMS[ingotId];
  
  if (ingot.isCollectible) {
    showToast('Коллекционные артефакты нельзя сдавать!', '⚠️');
    return;
  }
  
  if (playerState.ingots[ingotId] <= 0) {
    showToast('Нет слитков для сдачи!', '⚠️');
    return;
  }
  
  const count = playerState.ingots[ingotId];
  const xpEarned = ingot.sellValue * count;
  
  playerState.ingots[ingotId] = 0;
  addXP(xpEarned);
  saveGame();
  
  showToast(`Сдано ${count} ${ingot.name}! +${xpEarned} XP`, '💰');
  renderCurrentTab();
}

export function exchangeSpecialGeodeForXP(geodeId) {
  if (playerState.geodes[geodeId] <= 0) {
    showToast('Нет такой жеоды!', '⚠️');
    return;
  }
  
  const g = CONFIG_GEODES[geodeId];
  if (!g.isSpecial) return;
  
  const loc = g.location;
  const completed = isLocationCompleted(loc);
  if (!completed) {
    showToast('Сначала соберите все артефакты локации!', '⚠️');
    return;
  }
  
  playerState.geodes[geodeId]--;
  const xpGained = 800;
  addXP(xpGained);
  saveGame();
  
  showToast(`Жеода изучена! +${xpGained} XP`, '📚');
  renderCurrentTab();
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
  
  const overlay = document.getElementById('signalGameOverlay');
  const timerEl = document.getElementById('signalTimer');
  const counterEl = document.getElementById('signalCounter');
  const area = document.getElementById('signalGameArea');
  
  overlay.classList.add('active');
  timerEl.textContent = '10';
  counterEl.textContent = `Сигналов: 0 / 8`;
  area.innerHTML = '';
  
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      if (!activeSignalGame.active) return;
      createSignalPoint(area);
    }, i * 480);
  }
  
  activeSignalGame.timerInterval = setInterval(() => {
    if (!activeSignalGame.active) return;
    activeSignalGame.timer--;
    timerEl.textContent = activeSignalGame.timer;
    
    if (activeSignalGame.timer <= 0) {
      signalGameFail();
    }
  }, 1000);
  
  activeSignalGame.timeoutId = setTimeout(() => {
    if (activeSignalGame.active) {
      signalGameFail();
    }
  }, 10000);
}

function createSignalPoint(area) {
  if (!activeSignalGame.active) return;
  
  const point = document.createElement('div');
  point.className = 'signal-point';
  
  const x = Math.random() * (area.clientWidth - 60) + 30;
  const y = Math.random() * (area.clientHeight - 60) + 30;
  
  point.style.left = x + 'px';
  point.style.top = y + 'px';
  
  point.addEventListener('click', () => {
    if (!activeSignalGame.active) return;
    point.remove();
    activeSignalGame.collected++;
    document.getElementById('signalCounter').textContent = `Сигналов: ${activeSignalGame.collected} / 8`;
    
    if (activeSignalGame.collected >= 8) {
      signalGameSuccess();
    }
  });
  
  area.appendChild(point);
  activeSignalGame.points.push(point);
  
  setTimeout(() => {
    if (point.parentNode) {
      point.remove();
      activeSignalGame.points = activeSignalGame.points.filter(p => p !== point);
    }
  }, 2500);
}

function signalGameSuccess() {
  if (!activeSignalGame.active) return;
  
  const { expId, bonusType } = activeSignalGame;
  
  if (bonusType === 'echo') {
    applyEchoBonus(expId);
  } else if (bonusType === 'scan') {
    applyScanBonus(expId);
  }
  
  cleanupSignalGame();
  document.getElementById('signalGameOverlay').classList.remove('active');
  showToast('✅ Все сигналы пойманы! Бонус применён!', '📡');
}

function signalGameFail() {
  if (!activeSignalGame.active) return;
  
  const { expId } = activeSignalGame;
  
  playerState.echoCooldowns[expId] = Date.now() + 30000;
  saveGame();
  
  cleanupSignalGame();
  document.getElementById('signalGameOverlay').classList.remove('active');
  showToast('❌ Сбой системы... Разведка ушла на перезарядку', '📡');
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
  activeSignalGame.points.forEach(p => p.remove());
  activeSignalGame.active = false;
  activeSignalGame.expId = null;
  activeSignalGame.bonusType = null;
  activeSignalGame.points = [];
}

function applyEchoBonus(expId) {
  const exp = playerState.expeditions[expId];
  if (!exp || !exp.active) return;
  
  const reduction = Math.floor((exp.endTime - Date.now()) * 0.15);
  exp.endTime -= reduction;
  playerState.expeditionBonuses[expId] = 'echo';
  
  saveGame();
  showToast(`Время экспедиции сокращено на ${Math.floor(reduction / 1000)}с!`, '📡');
}

function applyScanBonus(expId) {
  const exp = playerState.expeditions[expId];
  if (!exp || !exp.active) return;
  
  exp.scanUsed = true;
  exp.specialChanceBoost = 1.2;
  playerState.expeditionBonuses[expId] = 'scan';
  
  saveGame();
  showToast('Глубинное сканирование активировано! +20% к шансу особой жеоды', '🔬');
}

// ---------- СИСТЕМА СОХРАНЕНИЙ ----------
export function saveGame() {
  const saveData = JSON.stringify({
    playerState,
    collectibleSerials,
    nextSerial,
    activeEvent: eventsManager.activeEvent,
    eventEndTime: eventsManager.eventEndTime,
    eventPhase: eventsManager.eventPhase
  });
  
  try {
    localStorage.setItem('starforge_v1', saveData);
  } catch (e) {}
  
  if (isTelegram && tg.CloudStorage && typeof tg.CloudStorage.setItem === 'function') {
    try {
      tg.CloudStorage.setItem('starforge_save', saveData, () => {});
    } catch(e) {}
  }
}

function loadGame() {
  try {
    const localData = localStorage.getItem('starforge_v1');
    if (localData) {
      applySaveData(JSON.parse(localData));
    }
  } catch (e) {}
  
  if (isTelegram && tg.CloudStorage && typeof tg.CloudStorage.getItem === 'function') {
    try {
      tg.CloudStorage.getItem('starforge_save', (error, cloudData) => {
        if (!error && cloudData) {
          try {
            applySaveData(JSON.parse(cloudData));
            localStorage.setItem('starforge_v1', cloudData);
            renderCurrentTab();
          } catch (e) {}
        }
      });
    } catch(e) {}
  }
}

// ========== ИСПРАВЛЕННАЯ applySaveData ==========
function applySaveData(data) {
  if (!data || !data.playerState) {
    AppDebugger.warn('State', 'applySaveData: нет данных');
    return;
  }
  
  const saved = data.playerState;
  
  // Сохраняем эталонные значения из DEFAULT_STATE на случай если сохранение их убьёт
  const defaultExpeditions = JSON.parse(JSON.stringify(DEFAULT_STATE.expeditions));
  const defaultPlayer = JSON.parse(JSON.stringify(DEFAULT_STATE.player));
  const defaultCollectedArtifacts = JSON.parse(JSON.stringify(DEFAULT_STATE.collectedArtifacts));
  const defaultDiscoveredSpecialGeodes = JSON.parse(JSON.stringify(DEFAULT_STATE.discoveredSpecialGeodes));
  
  // Применяем сохранение
  Object.assign(playerState, saved);
  
  // Проверяем expeditions — если сохранение их убило, восстанавливаем
  if (!playerState.expeditions || 
      typeof playerState.expeditions !== 'object' ||
      Object.keys(playerState.expeditions).length === 0 ||
      playerState.expeditions.mine === undefined ||
      playerState.expeditions.jungle === undefined ||
      playerState.expeditions.asteroid === undefined) {
    AppDebugger.warn('State', 'Сохранённые expeditions повреждены — восстановление из DEFAULT_STATE');
    playerState.expeditions = defaultExpeditions;
  }
  
  // Проверяем player — если сохранение убило, восстанавливаем
  if (!playerState.player || 
      typeof playerState.player !== 'object' ||
      playerState.player.level === undefined || 
      playerState.player.level === null ||
      playerState.player.xp === undefined || 
      playerState.player.xp === null) {
    AppDebugger.warn('State', 'Сохранённый player повреждён — восстановление из DEFAULT_STATE');
    playerState.player = defaultPlayer;
  }
  
  // Гарантируем что все числовые поля player на месте
  if (playerState.player.level === undefined || playerState.player.level === null) {
    playerState.player.level = 1;
  }
  if (playerState.player.xp === undefined || playerState.player.xp === null) {
    playerState.player.xp = 0;
  }
  if (playerState.player.totalOpened === undefined || playerState.player.totalOpened === null) {
    playerState.player.totalOpened = 0;
  }
  if (playerState.player.totalIngots === undefined || playerState.player.totalIngots === null) {
    playerState.player.totalIngots = 0;
  }
  if (playerState.player.totalArtifacts === undefined || playerState.player.totalArtifacts === null) {
    playerState.player.totalArtifacts = 0;
  }
  
  // Проверяем collectedArtifacts
  if (!playerState.collectedArtifacts || typeof playerState.collectedArtifacts !== 'object') {
    playerState.collectedArtifacts = defaultCollectedArtifacts;
  } else {
    if (!Array.isArray(playerState.collectedArtifacts.mine)) {
      playerState.collectedArtifacts.mine = [];
    }
    if (!Array.isArray(playerState.collectedArtifacts.jungle)) {
      playerState.collectedArtifacts.jungle = [];
    }
    if (!Array.isArray(playerState.collectedArtifacts.asteroid)) {
      playerState.collectedArtifacts.asteroid = [];
    }
  }
  
  // Проверяем discoveredSpecialGeodes
  if (!playerState.discoveredSpecialGeodes || typeof playerState.discoveredSpecialGeodes !== 'object') {
    playerState.discoveredSpecialGeodes = defaultDiscoveredSpecialGeodes;
  } else {
    if (playerState.discoveredSpecialGeodes.mine === undefined) {
      playerState.discoveredSpecialGeodes.mine = false;
    }
    if (playerState.discoveredSpecialGeodes.jungle === undefined) {
      playerState.discoveredSpecialGeodes.jungle = false;
    }
    if (playerState.discoveredSpecialGeodes.asteroid === undefined) {
      playerState.discoveredSpecialGeodes.asteroid = false;
    }
  }
  
  // Проверяем geodes
  for (let gId in CONFIG_GEODES) {
    if (playerState.geodes[gId] === undefined) {
      playerState.geodes[gId] = DEFAULT_STATE.geodes[gId] !== undefined ? DEFAULT_STATE.geodes[gId] : 0;
    }
  }
  
  // Проверяем ingots и minedStats
  for (let iId in CONFIG_ITEMS) {
    if (playerState.ingots[iId] === undefined) {
      playerState.ingots[iId] = 0;
    }
    if (playerState.minedStats[iId] === undefined) {
      playerState.minedStats[iId] = 0;
    }
  }
  
  if (!playerState.echoCooldowns) {
    playerState.echoCooldowns = {};
  }
  if (!playerState.expeditionBonuses) {
    playerState.expeditionBonuses = {};
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
  
  AppDebugger.log('State', 'Сохранение применено и проверено', {
    level: playerState.player.level,
    xp: playerState.player.xp,
    expeditions: Object.keys(playerState.expeditions)
  });
}

export const saveToLocalStorage = saveGame;

export function initializeState() {
  AppDebugger.log('State', 'Инициализация состояния...');
  
  playerState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  playerState.echoCooldowns = {};
  playerState.expeditionBonuses = {};
  
  AppDebugger.log('State', 'DEFAULT_STATE применён', {
    level: playerState.player.level,
    xp: playerState.player.xp,
    expeditions: Object.keys(playerState.expeditions)
  });
  
  loadGame();
  
  AppDebugger.log('State', 'Сохранения загружены', {
    level: playerState.player.level,
    xp: playerState.player.xp,
    expeditions: Object.keys(playerState.expeditions)
  });
  
  eventsManager.startEventCycle();
  
  AppDebugger.log('State', 'Инициализация завершена');
}

// ---------- ЭКСПЕДИЦИИ ----------
function getRandomDropFromExpedition(expId) {
  const exp = CONFIG_EXPEDITIONS[expId];
  if (!exp) return { geodeId: 'mine', isSpecial: false };
  
  const playerExp = playerState.expeditions[expId];
  let specialChance = exp.specialGeodeChance;
  
  if (playerExp?.scanUsed && playerExp?.specialChanceBoost) {
    specialChance *= playerExp.specialChanceBoost;
  }
  
  if (!isLocationCompleted(expId)) {
    const rand = Math.random();
    if (rand < specialChance) {
      return { geodeId: exp.specialGeodeId, isSpecial: true };
    }
  }
  
  return { geodeId: expId, isSpecial: false };
}

function checkCompletedExpeditions() {
  let changed = false;
  const now = Date.now();
  
  for (let k in playerState.expeditions) {
    const exp = playerState.expeditions[k];
    if (exp && exp.active && exp.endTime && now >= exp.endTime) {
      AppDebugger.log('Expedition', 'Экспедиция завершена', { id: k });
      
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
        showToast(`Найдена особая жеода: ${CONFIG_GEODES[drop.geodeId].name}!`, CONFIG_GEODES[drop.geodeId].icon);
        sendBotNotification(`💎 Игрок нашёл особую жеоду: ${CONFIG_GEODES[drop.geodeId].name}!`);
      } else {
        playerState.geodes[drop.geodeId] = (playerState.geodes[drop.geodeId] || 0) + 1;
        showToast(`Экспедиция завершена! +1 ${CONFIG_GEODES[drop.geodeId].name}`, CONFIG_GEODES[drop.geodeId].icon);
      }
      changed = true;
    }
  }
  
  if (changed) {
    saveGame();
    renderCurrentTab();
  }
}

let globalTimerInterval = null;

export function startGlobalTimer() {
  if (globalTimerInterval) {
    AppDebugger.log('Timer', 'Сброс старого глобального таймера');
    clearInterval(globalTimerInterval);
  }
  globalTimerInterval = setInterval(() => {
    checkCompletedExpeditions();
    updateExpeditionTimers();
    updateEventTimer();
  }, 500);
  AppDebugger.log('Timer', 'Глобальный таймер создан');
}

function updateExpeditionTimers() {
  const now = Date.now();
  for (let k in CONFIG_EXPEDITIONS) {
    const exp = playerState.expeditions[k];
    const el = document.getElementById(`timer-${k}`);
    if (el && exp && exp.active && exp.endTime) {
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
    renderCurrentTab();
  }
}

export function startExpedition(expId) {
  AppDebugger.log('Expedition', 'Вызван startExpedition', { 
    expId: expId, 
    playerStateExists: !!playerState 
  });
  
  if (!playerState) {
    AppDebugger.error('Expedition', 'playerState is NULL');
    return;
  }
  
  AppDebugger.log('Expedition', 'Доступные экспедиции', Object.keys(playerState.expeditions));
  
  const exp = playerState.expeditions[expId];
  if (!exp) {
    AppDebugger.error('Expedition', 'Экспедиция не найдена в playerState', { 
      expId: expId, 
      available: Object.keys(playerState.expeditions) 
    });
    return;
  }
  
  if (exp.active) {
    AppDebugger.warn('Expedition', 'Экспедиция уже активна', { expId: expId });
    return;
  }
  
  exp.active = true;
  exp.endTime = Date.now() + CONFIG_EXPEDITIONS[expId].timer * 1000;
  exp.scanUsed = false;
  exp.specialChanceBoost = null;
  delete playerState.expeditionBonuses[expId];
  
  AppDebugger.log('Expedition', 'Экспедиция запущена', { 
    expId: expId, 
    endTime: new Date(exp.endTime).toLocaleTimeString() 
  });
  
  saveGame();
  renderExpeditionsTab();
  showToast(`Экспедиция началась!`, CONFIG_EXPEDITIONS[expId].fallbackIcon);
  sendBotNotification(`⛏️ Игрок отправился в экспедицию: ${CONFIG_EXPEDITIONS[expId].name}`);
}

// ---------- ЧАСТИЦЫ И ТРЯСКА ----------
function createParticles(x, y) {
  const container = document.getElementById('app');
  const particleCount = 12;
  
  for (let i = 0; i < particleCount; i++) {
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
    
    setTimeout(() => {
      particle.remove();
    }, 800);
  }
}

function createEliteParticles() {
  const container = document.getElementById('app');
  const particleCount = 16;
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'elite-particle';
    
    particle.style.left = centerX + 'px';
    particle.style.top = centerY + 'px';
    particle.style.animationDelay = (i * 0.1) + 's';
    
    container.appendChild(particle);
    
    setTimeout(() => {
      particle.remove();
    }, 2500);
  }
}

function triggerScreenShake() {
  const app = document.getElementById('app');
  app.classList.add('screen-shake');
  setTimeout(() => {
    app.classList.remove('screen-shake');
  }, 120);
}

function showCollectibleAnimation(ingot) {
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
  
  setTimeout(() => {
    flash.remove();
    appear.remove();
  }, 2500);
  
  sendBotNotification(`🏆 Игрок получил коллекционный артефакт: ${ingot.name} ${ingot.icon}!`);
}

// ---------- ЛИДЕРБОРД (ТЕСТОВЫЙ РЕЖИМ) ----------
const LEADERBOARD_URL = 'https://ТВОЙ-ДОМЕН/api/leaderboard';

export async function updateLeaderboard() {
  if (!isTelegram || !tg.initData) {
    showToast('Лидерборд доступен только в Telegram', '⚠️');
    return;
  }
  
  renderTestLeaderboard();
}

function renderTestLeaderboard() {
  const userName = tg?.initDataUnsafe?.user?.first_name || 'Старатель';
  const testData = [
    { rank: 1, name: '⛏️ Шахтёр_Бог', xp: 15000 },
    { rank: 2, name: '💎 Алмазный_Лорд', xp: 12000 },
    { rank: 3, name: '🌌 Космо_Старатель', xp: 8500 },
    { rank: 4, name: userName, xp: playerState.player.xp, isPlayer: true },
    { rank: 5, name: '🪨 Геолог_777', xp: 3200 },
    { rank: 6, name: '🔥 Лавовый_Копатель', xp: 2100 },
    { rank: 7, name: '❄️ Ледяной_Бур', xp: 900 },
    { rank: 8, name: '🌟 Звёздный_Путник', xp: 450 },
    { rank: 9, name: '🪐 Астероидный_Волк', xp: 200 },
    { rank: 10, name: '⛏️ Новичок_2026', xp: 50 }
  ];
  
  testData.sort((a, b) => b.xp - a.xp);
  testData.forEach((entry, i) => entry.rank = i + 1);
  
  let html = `
    <div class="modal-header">
      <div class="modal-title">🏆 ТОП ИГРОКОВ</div>
      <button class="modal-close" onclick="document.dispatchEvent(new Event('closeModal'))">✕</button>
    </div>
    <div class="modal-content" style="text-align:left; padding:10px;">
  `;
  
  testData.forEach((entry) => {
    const isPlayer = entry.isPlayer;
    html += `
      <div style="display:flex; align-items:center; gap:12px; padding:12px; background:${isPlayer ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)'}; border-radius:16px; margin-bottom:8px;">
        <span style="font-size:20px; font-weight:700; width:30px;">${entry.rank}</span>
        <span style="flex:1; font-weight:600;">${entry.name} ${isPlayer ? '👈' : ''}</span>
        <span style="color:#FFD700; font-weight:700;">${entry.xp} XP</span>
      </div>
    `;
  });
  
  html += '</div>';
  
  import('./ui.js').then(ui => ui.openModal(html));
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
  if (!g || g.isSpecial) return;
  
  const rand = Math.random();
  let cum = 0;
  let droppedId = g.lootTable[0].ingotId;
  for (let e of g.lootTable) {
    cum += e.chance;
    if (rand < cum) {
      droppedId = e.ingotId;
      break;
    }
  }
  
  const resultIngot = CONFIG_ITEMS[droppedId];
  const items = g.lootTable.map(e => CONFIG_ITEMS[e.ingotId]);
  
  const totalLength = 30;
  const trackItems = [];
  for (let i = 0; i < totalLength; i++) {
    trackItems.push(items[i % items.length]);
  }
  
  const targetSlot = 19;
  trackItems[targetSlot] = resultIngot;
  
  conveyorState.geodeId = geodeId;
  conveyorState.isOpen = true;
  conveyorState.resultIngot = resultIngot;
  conveyorState.items = items;
  conveyorState.trackItems = trackItems;
  
  conveyorTrack.innerHTML = '';
  trackItems.forEach((item, index) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'conveyor-item';
    itemEl.innerHTML = `
      <div class="conveyor-item-icon" id="conv-${index}"></div>
      <div class="conveyor-item-name">${item.name}</div>
    `;
    conveyorTrack.appendChild(itemEl);
  });
  
  trackItems.forEach((item, index) => {
    const el = document.getElementById(`conv-${index}`);
    if (el) {
      renderImageToElement(el, item.imagePath, item.icon, item.fallbackColor);
    }
  });
  
  conveyorTitle.textContent = `Анализ ${g.name}...`;
  conveyorOverlay.classList.add('active');
  
  const stopPosition = -(targetSlot * ITEM_WIDTH) + (VISIBLE_ITEMS * ITEM_WIDTH / 2) - ITEM_WIDTH / 2;
  
  conveyorTrack.style.transition = 'none';
  conveyorTrack.style.transform = 'translateX(0)';
  conveyorTrack.offsetHeight;
  
  setTimeout(() => {
    conveyorTrack.style.transition = 'transform 4.5s cubic-bezier(0.2, 0, 0.1, 1)';
    conveyorTrack.style.transform = `translateX(${stopPosition}px)`;
  }, 50);
  
  conveyorState.timeoutId = setTimeout(() => {
    stopRoulette();
  }, 4550);
}

function stopRoulette() {
  if (!conveyorState.isOpen) return;
  
  const resultIngot = conveyorState.resultIngot;
  const g = CONFIG_GEODES[conveyorState.geodeId];
  
  let xpGained = g.xpValue + (resultIngot?.xpValue || 0);
  let isFirstDiscovery = false;
  
  if (playerState.minedStats[resultIngot.id] === 0) {
    isFirstDiscovery = true;
    xpGained = Math.floor(xpGained * 3);
    showToast(`🎉 ПЕРВОЕ ОТКРЫТИЕ! +${xpGained} XP`, '🌟');
  }
  
  playerState.ingots[resultIngot.id] = (playerState.ingots[resultIngot.id] || 0) + 1;
  playerState.minedStats[resultIngot.id] = (playerState.minedStats[resultIngot.id] || 0) + 1;
  playerState.player.totalIngots++;
  
  addXP(xpGained);
  saveGame();
  
  cleanupConveyor();
  isOpeningGeode = false;
  
  setTimeout(() => {
    showRewardPopup(resultIngot);
    renderCurrentTab();
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
  if (isOpeningGeode) return;
  
  if (playerState.geodes[geodeId] <= 0) {
    showToast('Нет такой жеоды!', '⚠️');
    return;
  }
  
  if (isSpecial) {
    const g = CONFIG_GEODES[geodeId];
    const completed = isLocationCompleted(g.location);
    if (completed) {
      showToast('Все артефакты собраны! Используйте "Изучить" для обмена на XP.', '📚');
      return;
    }
  }
  
  isOpeningGeode = true;
  
  brawlState.geodeId = geodeId;
  brawlState.isSpecial = isSpecial;
  brawlState.tapsRemaining = 10;
  brawlState.isOpen = true;

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

  const stage = getGeodeStageImage(geodeId, 10);
  renderImageToElement(brawlGeode, stage.imagePath, stage.fallbackIcon, '#8B7355');
  brawlOverlay.classList.add('active');
}

function closeBrawlOverlay() {
  brawlOverlay.classList.remove('active');
  brawlState.isOpen = false;
  isOpeningGeode = false;
  renderCurrentTab();
}

function handleBrawlTap(e) {
  if (!brawlState.isOpen || brawlState.tapsRemaining <= 0) return;
  
  const rect = brawlGeode.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  createParticles(centerX, centerY);
  triggerScreenShake();
  
  brawlGeode.classList.add('shake-animation');
  setTimeout(() => brawlGeode.classList.remove('shake-animation'), 300);
  
  brawlState.tapsRemaining--;
  brawlCounter.textContent = brawlState.tapsRemaining;
  const stage = getGeodeStageImage(brawlState.geodeId, brawlState.tapsRemaining);
  renderImageToElement(brawlGeode, stage.imagePath, stage.fallbackIcon, '#8B7355');
  
  if (brawlState.tapsRemaining <= 0) finishBrawlOpening();
}

function finishBrawlOpening() {
  const geodeId = brawlState.geodeId;
  const isSpecial = brawlState.isSpecial;
  
  if (playerState.geodes[geodeId] > 0) {
    playerState.geodes[geodeId]--;
  }
  playerState.player.totalOpened++;

  let droppedIngot = null;
  let xpGained = 0;

  if (isSpecial) {
    const g = CONFIG_GEODES[geodeId];
    const loc = g.location;
    const available = g.possibleIngots.filter((ingId) => !playerState.collectedArtifacts[loc].includes(ingId));
    const picked = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : g.possibleIngots[0];
    droppedIngot = CONFIG_ITEMS[picked];
    
    playerState.ingots[picked] = (playerState.ingots[picked] || 0) + 1;
    playerState.minedStats[picked] = (playerState.minedStats[picked] || 0) + 1;
    if (!playerState.collectedArtifacts[loc].includes(picked)) {
      playerState.collectedArtifacts[loc].push(picked);
      playerState.player.totalArtifacts++;
    }
    if (!playerState.discoveredSpecialGeodes[loc]) playerState.discoveredSpecialGeodes[loc] = true;
    xpGained = droppedIngot.xpValue;
    
    addXP(xpGained);
    saveGame();
    
    const isFirstCollectible = droppedIngot.isCollectible && playerState.ingots[droppedIngot.id] === 1;
    if (droppedIngot.isCollectible && isFirstCollectible) {
      showCollectibleAnimation(droppedIngot);
    }
    
    brawlGeode.classList.add('explode-animation');
    brawlGeode.classList.remove('special-geode');
    document.querySelector('.brawl-hint').style.display = 'none';
    brawlCounter.style.display = 'none';
    
    setTimeout(() => {
      brawlGeode.style.display = 'none';
      renderImageToElement(brawlResultIcon, droppedIngot.imagePath, droppedIngot.icon, droppedIngot.fallbackColor);
      brawlResultName.textContent = droppedIngot.name;
      brawlResultRarity.textContent = droppedIngot.rarity;
      brawlResultRarity.style.color = droppedIngot.rarityClass === 'collectible' ? '#FF64FF' : 
                                      (droppedIngot.rarityClass === 'legendary' ? '#FFD700' : '#fff');
      brawlResult.classList.add('show');
      brawlCloseBtn.style.display = 'block';
      isOpeningGeode = false;
      renderCurrentTab();
    }, 500);
    
  } else {
    brawlGeode.classList.add('explode-animation');
    document.querySelector('.brawl-hint').style.display = 'none';
    brawlCounter.style.display = 'none';
    
    setTimeout(() => {
      brawlOverlay.classList.remove('active');
      brawlState.isOpen = false;
      initRoulette(geodeId);
    }, 500);
  }
}

brawlGeode.addEventListener('click', handleBrawlTap);
brawlCloseBtn.addEventListener('click', closeBrawlOverlay);
