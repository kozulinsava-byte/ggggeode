// ========== CORE МОДУЛЬ: ЛОГИКА ИГРЫ · ПОЛНАЯ ПЕРЕКОПКА ==========
import { CONFIG_ITEMS, CONFIG_GEODES, CONFIG_EXPEDITIONS, CRAFT_RECIPES, LEVELS, DEFAULT_STATE, EVENTS_CONFIG } from './config.js';
import { showToast, getGeodeStageImage, updateProfileUI, updateCollectionProgress, renderCurrentTab, renderExpeditionsTab, renderImageToElement, showRewardPopup, renderMeteorStormUI, showMeteorStormResult, updateMeteorStormUI, setActiveTab } from './ui.js';

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
let isOverlayActive = false;
let activeOverlayId = null;

// ========== ЕДИНЫЙ РЕЕСТР ВСЕХ ИНТЕРВАЛОВ И ТАЙМАУТОВ ==========
const allIntervals = new Set();
const allTimeouts = new Set();

function registerInterval(id) {
  allIntervals.add(id);
  return id;
}

function registerTimeout(id) {
  allTimeouts.add(id);
  return id;
}

function clearAllIntervals() {
  console.log(`[StarForge] Clearing ${allIntervals.size} intervals and ${allTimeouts.size} timeouts`);
  allIntervals.forEach(id => clearInterval(id));
  allTimeouts.forEach(id => clearTimeout(id));
  allIntervals.clear();
  allTimeouts.clear();
}

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

// ========== ДИСПЕТЧЕР ОВЕРЛЕЕВ ==========
export function setActiveOverlay(overlayId) {
  if (activeOverlayId && activeOverlayId !== overlayId) {
    console.warn(`[StarForge] Overlay conflict: ${activeOverlayId} -> ${overlayId}. Force cleanup.`);
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

function forceCleanupAllOverlays() {
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
  closeForgeForce();
  if (brawlState) { brawlState.isOpen = false; isOpeningGeode = false; }
  activeOverlayId = null;
  isOverlayActive = false;
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
    if (this.eventInterval) {
      clearInterval(this.eventInterval);
      allIntervals.delete(this.eventInterval);
    }
    this.triggerNextEvent();
    this.eventInterval = registerInterval(setInterval(() => {
      this.triggerNextEvent();
    }, EVENTS_CONFIG.rotationInterval));
  },
  
  triggerNextEvent() {
    const eventList = EVENTS_CONFIG.events;
    const nextEventId = eventList[this.rotationIndex % eventList.length];
    this.rotationIndex++;
    
    if (nextEventId === 'great_smelt') this.triggerGreatSmelt();
    else if (nextEventId === 'meteor_storm') this.triggerMeteorStorm();
  },
  
  triggerGreatSmelt() {
    this.activeEvent = {
      id: 'great_smelt', name: EVENTS_CONFIG.great_smelt.name,
      icon: EVENTS_CONFIG.great_smelt.icon, description: EVENTS_CONFIG.great_smelt.description,
      longDescription: EVENTS_CONFIG.great_smelt.longDescription, type: 'great_smelt'
    };
    this.eventEndTime = Date.now() + EVENTS_CONFIG.eventDuration;
    this.eventPhase = 'active';
    showToast('🔥 Великая Переплавка началась!', '🔥');
    sendBotNotification('🚀 Кузня открыта!');
    saveGame();
    if (!isAnyOverlayActive()) renderCurrentTab();
  },
  
  triggerMeteorStorm() {
    this.activeEvent = {
      id: 'meteor_storm', name: EVENTS_CONFIG.meteor_storm.name,
      icon: EVENTS_CONFIG.meteor_storm.icon, description: EVENTS_CONFIG.meteor_storm.description,
      longDescription: EVENTS_CONFIG.meteor_storm.longDescription, type: 'meteor_storm'
    };
    this.eventEndTime = Date.now() + EVENTS_CONFIG.eventDuration;
    this.eventPhase = 'active';
    showToast('☄️ Метеоритный Шторм начинается!', '☄️');
    sendBotNotification('☄️ Шторм!');
    saveGame();
    if (!isAnyOverlayActive()) renderCurrentTab();
  },
  
  endEvent() {
    this.eventPhase = 'ending';
    showToast(`❄️ ${this.activeEvent?.name || 'Ивент'} завершён!`, '❄️');
    if (meteorStormState.active) forceEndMeteorStorm();
    saveGame();
    if (!isAnyOverlayActive()) renderCurrentTab();
  }
};

// ========== МЕТЕОРИТНЫЙ ШТОРМ ==========
export let meteorStormState = {
  active: false, timer: 0, timerInterval: null, spawnInterval: null,
  meteorElements: [], captured: { legendary: 0, rare: 0, common: 0 },
  totalSpawned: 0, gameArea: null
};

export function openMeteorStorm() {
  const event = eventsManager.getActiveEvent();
  if (!event || event.type !== 'meteor_storm') {
    showToast('Метеоритный шторм сейчас не активен!', '⚠️');
    return;
  }
  if (meteorStormState.active) return;
  
  terminateEvent();
  
  meteorStormState.active = true;
  meteorStormState.timer = EVENTS_CONFIG.meteor_storm.stormDuration;
  meteorStormState.captured = { legendary: 0, rare: 0, common: 0 };
  meteorStormState.totalSpawned = 0;
  meteorStormState.meteorElements = [];
  
  setActiveOverlay('meteorStorm');
  
  const overlay = document.getElementById('meteorStormOverlay');
  const gameArea = document.getElementById('meteorStormGameArea');
  meteorStormState.gameArea = gameArea;
  overlay.classList.add('active');
  renderMeteorStormUI();
  
  meteorStormState.timerInterval = registerInterval(setInterval(() => {
    meteorStormState.timer--;
    updateMeteorStormUI();
    if (meteorStormState.timer <= 0) endMeteorStorm();
  }, 1000));
  
  meteorStormState.spawnInterval = registerInterval(setInterval(() => {
    if (meteorStormState.meteorElements.length < EVENTS_CONFIG.meteor_storm.maxMeteorsOnScreen) {
      spawnMeteor();
    }
  }, EVENTS_CONFIG.meteor_storm.spawnInterval));
  
  registerTimeout(setTimeout(() => spawnMeteor(), 200));
  registerTimeout(setTimeout(() => spawnMeteor(), 400));
  registerTimeout(setTimeout(() => spawnMeteor(), 600));
}

function spawnMeteor() {
  if (!meteorStormState.active || !meteorStormState.gameArea) return;
  
  const types = EVENTS_CONFIG.meteor_storm.meteorTypes;
  const rand = Math.random();
  let meteorType, typeKey;
  
  if (rand < types.legendary.spawnWeight) { meteorType = types.legendary; typeKey = 'legendary'; }
  else if (rand < types.legendary.spawnWeight + types.rare.spawnWeight) { meteorType = types.rare; typeKey = 'rare'; }
  else { meteorType = types.common; typeKey = 'common'; }
  
  const gameArea = meteorStormState.gameArea;
  const areaWidth = gameArea.clientWidth || window.innerWidth;
  const startX = ((5 + Math.random() * 90) / 100) * areaWidth;
  
  const meteor = document.createElement('div');
  meteor.className = 'meteor-storm-meteor';
  meteor.innerHTML = `<span class="meteor-emoji">${meteorType.emoji}</span>`;
  Object.assign(meteor.style, {
    position: 'absolute', left: startX + 'px', top: '-60px',
    width: meteorType.size + 'px', height: meteorType.size + 'px',
    fontSize: (meteorType.size - 10) + 'px', color: meteorType.color,
    textShadow: `0 0 20px ${meteorType.glowColor}, 0 0 40px ${meteorType.glowColor}`,
    cursor: 'pointer', zIndex: '510', userSelect: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  });
  meteor.dataset.type = typeKey;
  meteor.dataset.caught = 'false';
  
  meteor.addEventListener('click', (e) => {
    e.stopPropagation();
    if (meteor.dataset.caught === 'true') return;
    meteor.dataset.caught = 'true';
    meteorStormState.captured[typeKey]++;
    createMeteorFlash(meteor);
    meteor.remove();
    meteorStormState.meteorElements = meteorStormState.meteorElements.filter(m => m !== meteor);
    updateMeteorStormUI();
  });
  
  gameArea.appendChild(meteor);
  meteorStormState.meteorElements.push(meteor);
  meteorStormState.totalSpawned++;
  
  const angle = (Math.random() - 0.5) * 30;
  const deltaX = Math.tan(angle * Math.PI / 180) * (window.innerHeight + 100);
  const duration = meteorType.speed;
  const endLeft = startX + deltaX;
  const startTime = performance.now();
  
  function animateMeteor(currentTime) {
    if (!meteor.isConnected) return;
    const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
    meteor.style.top = (-60 + (window.innerHeight + 160) * progress) + 'px';
    meteor.style.left = (startX + (endLeft - startX) * progress) + 'px';
    meteor.style.transform = `rotate(${progress * 720}deg)`;
    if (progress < 1 && meteor.dataset.caught === 'false') {
      requestAnimationFrame(animateMeteor);
    } else if (progress >= 1 && meteor.dataset.caught === 'false') {
      meteor.remove();
      meteorStormState.meteorElements = meteorStormState.meteorElements.filter(m => m !== meteor);
    }
  }
  requestAnimationFrame(animateMeteor);
}

function createMeteorFlash(el) {
  const r = el.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'meteor-flash';
  Object.assign(f.style, {
    position: 'fixed', left: (r.left + r.width/2 - 25) + 'px', top: (r.top + r.height/2 - 25) + 'px',
    width: '50px', height: '50px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,215,0,0.9) 0%, transparent 70%)',
    pointerEvents: 'none', zIndex: '515', animation: 'meteorFlashAnim 0.4s ease-out forwards'
  });
  document.body.appendChild(f);
  registerTimeout(setTimeout(() => f.remove(), 400));
}

function endMeteorStorm() {
  if (!meteorStormState.active) return;
  clearInterval(meteorStormState.timerInterval);
  clearInterval(meteorStormState.spawnInterval);
  allIntervals.delete(meteorStormState.timerInterval);
  allIntervals.delete(meteorStormState.spawnInterval);
  meteorStormState.timerInterval = null;
  meteorStormState.spawnInterval = null;
  meteorStormState.meteorElements.forEach(m => m.remove());
  meteorStormState.meteorElements = [];
  
  const cfg = EVENTS_CONFIG.meteor_storm;
  const c = meteorStormState.captured;
  const lg = Math.floor(c.legendary / cfg.meteorTypes.legendary.requiredForGeode);
  const rg = Math.floor(c.rare / cfg.meteorTypes.rare.requiredForGeode);
  const cg = Math.floor(c.common / cfg.meteorTypes.common.requiredForGeode);
  
  showMeteorStormResult({ captured: c, legendaryGeodes: lg, rareGeodes: rg, commonGeodes: cg,
    totalXP: lg * cfg.rewards.legendary.xpBonus + rg * cfg.rewards.rare.xpBonus + cg * cfg.rewards.common.xpBonus });
  meteorStormState.active = false;
}

function forceEndMeteorStorm() {
  if (meteorStormState.timerInterval) { clearInterval(meteorStormState.timerInterval); allIntervals.delete(meteorStormState.timerInterval); }
  if (meteorStormState.spawnInterval) { clearInterval(meteorStormState.spawnInterval); allIntervals.delete(meteorStormState.spawnInterval); }
  meteorStormState.timerInterval = null;
  meteorStormState.spawnInterval = null;
  meteorStormState.meteorElements.forEach(m => m.remove());
  meteorStormState.meteorElements = [];
  meteorStormState.active = false;
}

export function claimMeteorStormRewards() {
  const cfg = EVENTS_CONFIG.meteor_storm;
  const c = meteorStormState.captured;
  const lg = Math.floor(c.legendary / cfg.meteorTypes.legendary.requiredForGeode);
  const rg = Math.floor(c.rare / cfg.meteorTypes.rare.requiredForGeode);
  const cg = Math.floor(c.common / cfg.meteorTypes.common.requiredForGeode);
  
  if (lg > 0) playerState.geodes[cfg.rewards.legendary.geodeId] = (playerState.geodes[cfg.rewards.legendary.geodeId] || 0) + lg;
  if (rg > 0) playerState.geodes[cfg.rewards.rare.geodeId] = (playerState.geodes[cfg.rewards.rare.geodeId] || 0) + rg;
  if (cg > 0) playerState.geodes[cfg.rewards.common.geodeId] = (playerState.geodes[cfg.rewards.common.geodeId] || 0) + cg;
  
  const totalXP = lg * cfg.rewards.legendary.xpBonus + rg * cfg.rewards.rare.xpBonus + cg * cfg.rewards.common.xpBonus;
  if (totalXP > 0) addXP(totalXP);
  
  saveGame();
  terminateEvent();
  document.getElementById('meteorStormOverlay').classList.remove('active');
  document.getElementById('meteorStormResultOverlay').classList.remove('active');
  clearActiveOverlay('meteorStorm');
  showToast(`Шторм завершён! +${cg + rg + lg} жеод, +${totalXP} XP`, '☄️');
  renderCurrentTab();
}

export function exitMeteorStormEarly() {
  const cfg = EVENTS_CONFIG.meteor_storm;
  const c = meteorStormState.captured;
  const lg = Math.floor(c.legendary / cfg.meteorTypes.legendary.requiredForGeode);
  const rg = Math.floor(c.rare / cfg.meteorTypes.rare.requiredForGeode);
  const cg = Math.floor(c.common / cfg.meteorTypes.common.requiredForGeode);
  
  if (lg > 0) playerState.geodes[cfg.rewards.legendary.geodeId] = (playerState.geodes[cfg.rewards.legendary.geodeId] || 0) + lg;
  if (rg > 0) playerState.geodes[cfg.rewards.rare.geodeId] = (playerState.geodes[cfg.rewards.rare.geodeId] || 0) + rg;
  if (cg > 0) playerState.geodes[cfg.rewards.common.geodeId] = (playerState.geodes[cfg.rewards.common.geodeId] || 0) + cg;
  
  const totalXP = lg * cfg.rewards.legendary.xpBonus + rg * cfg.rewards.rare.xpBonus + cg * cfg.rewards.common.xpBonus;
  if (totalXP > 0) addXP(totalXP);
  
  saveGame();
  terminateEvent();
  document.getElementById('meteorStormOverlay').classList.remove('active');
  document.getElementById('meteorStormResultOverlay').classList.remove('active');
  clearActiveOverlay('meteorStorm');
  showToast(totalXP > 0 ? `Шторм прерван. +${cg + rg + lg} жеод, +${totalXP} XP` : 'Шторм прерван.', '☄️');
  renderCurrentTab();
}

export function terminateEvent() {
  if (meteorStormState.timerInterval) { clearInterval(meteorStormState.timerInterval); allIntervals.delete(meteorStormState.timerInterval); meteorStormState.timerInterval = null; }
  if (meteorStormState.spawnInterval) { clearInterval(meteorStormState.spawnInterval); allIntervals.delete(meteorStormState.spawnInterval); meteorStormState.spawnInterval = null; }
  meteorStormState.meteorElements.forEach(m => { if (m.isConnected) m.remove(); });
  meteorStormState.meteorElements = [];
  meteorStormState.active = false;
  document.getElementById('meteorStormOverlay')?.classList.remove('active');
  document.getElementById('meteorStormResultOverlay')?.classList.remove('active');
}

// ---------- ПЛАВИЛЬНЯ ----------
let forgeState = { active: false, selectedRecipe: null, smeltSeconds: 0, smeltMaxSeconds: 0, smeltInterval: null };

export function openForge() {
  const event = eventsManager.getActiveEvent();
  if (!event || event.type !== 'great_smelt') { showToast('Плавильня закрыта!', '❄️'); return; }
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
  let html = `<div class="forge-title-section"><span class="forge-title-icon">🔥</span><span class="forge-title-text">ПЛАВИЛЬНЯ</span></div>
    <div style="font-size:11px; color:var(--text-secondary); margin-bottom:6px;">Выбери рецепт и нажми «Сплавить»</div><div class="recipe-grid">`;
  
  if (recipes.length === 0) {
    html += '<div class="empty-state" style="grid-column:1/-1;">Нет доступных рецептов</div>';
  } else {
    recipes.forEach((recipe) => {
      const isActive = forgeState.selectedRecipe?.id === recipe.id;
      const cardClass = isActive ? 'recipe-card active' : (recipe.canCraft ? 'recipe-card' : 'recipe-card disabled');
      html += `<div class="${cardClass}" data-recipe="${recipe.id}"><div class="recipe-card-icon">${recipe.icon}</div><div class="recipe-card-name">${recipe.name}</div><div class="recipe-card-ingredients">`;
      for (let ingId in recipe.ingredients) {
        const required = recipe.ingredients[ingId];
        const owned = playerState.ingots[ingId] || 0;
        html += `<div class="recipe-card-ingredient-row">${CONFIG_ITEMS[ingId].icon} ${CONFIG_ITEMS[ingId].name}: <span style="color:${owned >= required ? '#50C878' : '#FF4444'}">${owned} / ${required}</span></div>`;
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

function closeForgeForce() {
  if (forgeState.smeltInterval) { clearInterval(forgeState.smeltInterval); allIntervals.delete(forgeState.smeltInterval); forgeState.smeltInterval = null; }
  document.getElementById('forgeOverlay')?.classList.remove('active');
  document.getElementById('forgeProgressOverlay')?.classList.remove('active');
  forgeState.active = false;
  forgeState.selectedRecipe = null;
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
  
  if (forgeState.smeltInterval) { clearInterval(forgeState.smeltInterval); allIntervals.delete(forgeState.smeltInterval); }
  
  forgeState.smeltInterval = registerInterval(setInterval(() => {
    forgeState.smeltSeconds--;
    const progress = ((forgeState.smeltMaxSeconds - forgeState.smeltSeconds) / forgeState.smeltMaxSeconds) * 100;
    document.getElementById('forgeProgressFill').style.width = progress + '%';
    document.getElementById('forgeProgressTime').textContent = `${forgeState.smeltSeconds}с`;
    document.getElementById('forgeMolten').style.height = progress + '%';
    if (forgeState.smeltSeconds <= 0) finishSmeltProcess(recipe);
  }, 1000));
}

function finishSmeltProcess(recipe) {
  if (forgeState.smeltInterval) { clearInterval(forgeState.smeltInterval); allIntervals.delete(forgeState.smeltInterval); forgeState.smeltInterval = null; }
  document.getElementById('forgeProgressOverlay').classList.remove('active');
  
  for (let ingId in recipe.ingredients) playerState.ingots[ingId] -= recipe.ingredients[ingId];
  playerState.ingots[recipe.resultIngotId] = (playerState.ingots[recipe.resultIngotId] || 0) + 1;
  playerState.minedStats[recipe.resultIngotId] = (playerState.minedStats[recipe.resultIngotId] || 0) + 1;
  playerState.player.totalIngots++;
  addXP(recipe.xpReward);
  saveGame();
  
  showToast(`Создано: ${CONFIG_ITEMS[recipe.resultIngotId]?.name || recipe.name}! +${recipe.xpReward} XP`, recipe.icon);
  forgeState.active = false;
  forgeState.selectedRecipe = null;
  clearActiveOverlay('forge');
  renderCurrentTab();
}

// ---------- КРАФТ ----------
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
  if (!found?.canCraft) { showToast('Недостаточно ресурсов!', '⚠️'); return false; }
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

// ---------- DEV ----------
export function devGiveXP() {
  playerState.player.xp += 1000000;
  while (playerState.player.level < LEVELS.length - 1 && playerState.player.xp >= LEVELS[playerState.player.level]) playerState.player.level++;
  updateProfileUI(); updateCollectionProgress();
}
export function devGiveGeodes() { Object.keys(CONFIG_GEODES).forEach(id => playerState.geodes[id] = (playerState.geodes[id] || 0) + 10); }
export function devUnlockLocations() { playerState.player.level = Math.max(playerState.player.level, 10); updateProfileUI(); }
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
    showToast(`🎉 Уровень ${playerState.player.level}!`, '⬆️');
    sendBotNotification(`⭐ Игрок достиг ${playerState.player.level} уровня!`);
  }
  updateProfileUI(); updateCollectionProgress(); saveGame();
}

export function sellIngot(ingotId) {
  const ingot = CONFIG_ITEMS[ingotId];
  if (ingot.isCollectible) { showToast('Коллекционные артефакты нельзя сдавать!', '⚠️'); return; }
  if ((playerState.ingots[ingotId] || 0) <= 0) { showToast('Нет слитков!', '⚠️'); return; }
  const count = playerState.ingots[ingotId];
  playerState.ingots[ingotId] = 0;
  addXP(ingot.sellValue * count);
  saveGame();
  showToast(`Сдано ${count} ${ingot.name}!`, '💰');
  renderCurrentTab();
}

export function exchangeSpecialGeodeForXP(geodeId) {
  if ((playerState.geodes[geodeId] || 0) <= 0) { showToast('Нет такой жеоды!', '⚠️'); return; }
  const g = CONFIG_GEODES[geodeId];
  if (!g?.isSpecial) return;
  if (!isLocationCompleted(g.location)) { showToast('Сначала соберите все артефакты!', '⚠️'); return; }
  playerState.geodes[geodeId]--;
  addXP(800);
  saveGame();
  showToast('Жеода изучена! +800 XP', '📚');
  renderCurrentTab();
}

// ---------- МИНИ-ИГРА "АКТИВНАЯ РАЗВЕДКА" ----------
let activeSignalGame = { active: false, expId: null, bonusType: null, points: [], collected: 0, totalPoints: 8, timer: 10, timerInterval: null, timeoutId: null };

export function startSignalGame(expId, bonusType) {
  if (activeSignalGame.active) cleanupSignalGame();
  activeSignalGame.active = true;
  activeSignalGame.expId = expId;
  activeSignalGame.bonusType = bonusType;
  activeSignalGame.collected = 0;
  activeSignalGame.timer = 10;
  activeSignalGame.points = [];
  
  setActiveOverlay('signalGame');
  const overlay = document.getElementById('signalGameOverlay');
  const area = document.getElementById('signalGameArea');
  overlay.classList.add('active');
  document.getElementById('signalTimer').textContent = '10';
  document.getElementById('signalCounter').textContent = 'Сигналов: 0 / 8';
  area.innerHTML = '';
  
  for (let i = 0; i < 8; i++) registerTimeout(setTimeout(() => { if (activeSignalGame.active) createSignalPoint(area); }, i * 480));
  
  activeSignalGame.timerInterval = registerInterval(setInterval(() => {
    if (!activeSignalGame.active) return;
    activeSignalGame.timer--;
    document.getElementById('signalTimer').textContent = activeSignalGame.timer;
    if (activeSignalGame.timer <= 0) signalGameFail();
  }, 1000));
}

function createSignalPoint(area) {
  if (!activeSignalGame.active) return;
  const point = document.createElement('div');
  point.className = 'signal-point';
  point.style.left = (Math.random() * (area.clientWidth - 60) + 30) + 'px';
  point.style.top = (Math.random() * (area.clientHeight - 60) + 30) + 'px';
  point.addEventListener('click', () => {
    if (!activeSignalGame.active) return;
    point.remove();
    activeSignalGame.collected++;
    document.getElementById('signalCounter').textContent = `Сигналов: ${activeSignalGame.collected} / 8`;
    if (activeSignalGame.collected >= 8) signalGameSuccess();
  });
  area.appendChild(point);
  activeSignalGame.points.push(point);
}

function signalGameSuccess() {
  if (!activeSignalGame.active) return;
  if (activeSignalGame.bonusType === 'echo') applyEchoBonus(activeSignalGame.expId);
  else if (activeSignalGame.bonusType === 'scan') applyScanBonus(activeSignalGame.expId);
  cleanupSignalGame();
  document.getElementById('signalGameOverlay').classList.remove('active');
  clearActiveOverlay('signalGame');
  showToast('✅ Все сигналы пойманы!', '📡');
}

function signalGameFail() {
  if (!activeSignalGame.active) return;
  playerState.echoCooldowns[activeSignalGame.expId] = Date.now() + 30000;
  saveGame();
  cleanupSignalGame();
  document.getElementById('signalGameOverlay').classList.remove('active');
  clearActiveOverlay('signalGame');
  showToast('❌ Сбой системы...', '📡');
}

function cleanupSignalGame() {
  if (activeSignalGame.timerInterval) { clearInterval(activeSignalGame.timerInterval); allIntervals.delete(activeSignalGame.timerInterval); }
  if (activeSignalGame.timeoutId) { clearTimeout(activeSignalGame.timeoutId); allTimeouts.delete(activeSignalGame.timeoutId); }
  activeSignalGame.points.forEach(p => p.remove());
  activeSignalGame.active = false;
}

function applyEchoBonus(expId) {
  const exp = playerState.expeditions[expId];
  if (!exp?.active) return;
  exp.endTime -= Math.floor((exp.endTime - Date.now()) * 0.15);
  playerState.expeditionBonuses[expId] = 'echo';
  saveGame();
}

function applyScanBonus(expId) {
  const exp = playerState.expeditions[expId];
  if (!exp?.active) return;
  exp.scanUsed = true;
  exp.specialChanceBoost = 1.2;
  playerState.expeditionBonuses[expId] = 'scan';
  saveGame();
}

// ========== СИСТЕМА СОХРАНЕНИЙ ==========
export function saveGame() {
  const saveData = JSON.stringify({
    playerState, collectibleSerials, nextSerial,
    activeEvent: eventsManager.activeEvent, eventEndTime: eventsManager.eventEndTime,
    eventPhase: eventsManager.eventPhase, rotationIndex: eventsManager.rotationIndex
  });
  try { localStorage.setItem('starforge_v1', saveData); } catch(e) {}
  if (isTelegram && tg.CloudStorage?.setItem) {
    try { tg.CloudStorage.setItem('starforge_save', saveData, () => {}); } catch(e) {}
  }
}

function loadGame() {
  try {
    const d = localStorage.getItem('starforge_v1');
    if (d) applySaveData(JSON.parse(d));
  } catch(e) {}
  
  if (isTelegram && tg.CloudStorage?.getItem) {
    try {
      tg.CloudStorage.getItem('starforge_save', (err, data) => {
        if (!err && data) {
          try { applySaveData(JSON.parse(data)); localStorage.setItem('starforge_v1', data); renderCurrentTab(); } catch(e) {}
        }
      });
    } catch(e) {}
  }
}

function applySaveData(data) {
  if (data.playerState) {
    Object.assign(playerState, data.playerState);
    playerState.echoCooldowns = playerState.echoCooldowns || {};
    playerState.expeditionBonuses = playerState.expeditionBonuses || {};
  }
  if (data.collectibleSerials) Object.assign(collectibleSerials, data.collectibleSerials);
  if (data.nextSerial) nextSerial = data.nextSerial;
  if (data.activeEvent) eventsManager.activeEvent = data.activeEvent;
  if (data.eventEndTime) eventsManager.eventEndTime = data.eventEndTime;
  if (data.eventPhase) eventsManager.eventPhase = data.eventPhase;
  if (data.rotationIndex !== undefined) eventsManager.rotationIndex = data.rotationIndex;
}

export function initializeState() {
  playerState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  playerState.echoCooldowns = {};
  playerState.expeditionBonuses = {};
  loadGame();
  eventsManager.startEventCycle();
}

// ========== ЕДИНЫЙ ГЛОБАЛЬНЫЙ ТАЙМЕР ==========
let globalTimerInterval = null;

export function startGlobalTimer() {
  if (globalTimerInterval) { clearInterval(globalTimerInterval); allIntervals.delete(globalTimerInterval); }
  globalTimerInterval = registerInterval(setInterval(() => {
    checkCompletedExpeditions();
    updateExpeditionTimersUI();
    updateGlobalEventTimerUI();
  }, 500));
}

// ========== ЭКСПЕДИЦИИ · ПОЛНАЯ ПЕРЕКОПКА ==========

/**
 * ЗАПУСК ЭКСПЕДИЦИИ
 * Вызывается из ui.js при клике на кнопку "Отправиться"
 * @param {string} expId - ID экспедиции (mine, jungle, asteroid)
 * @returns {boolean} - успех запуска
 */
export function startExpedition(expId) {
  console.log(`[StarForge] startExpedition called for: ${expId}`);
  
  // 1. Проверяем конфиг
  const config = CONFIG_EXPEDITIONS[expId];
  if (!config) {
    console.error(`[StarForge] No config for expedition: ${expId}`);
    showToast('Ошибка конфигурации экспедиции!', '⚠️');
    return false;
  }
  
  // 2. Проверяем уровень
  if (playerState.player.level < config.requiredLevel) {
    console.warn(`[StarForge] Level too low for ${expId}: ${playerState.player.level} < ${config.requiredLevel}`);
    showToast(`Требуется ${config.requiredLevel} уровень!`, '🔒');
    return false;
  }
  
  // 3. Проверяем состояние экспедиции
  const exp = playerState.expeditions[expId];
  if (!exp) {
    console.error(`[StarForge] No expedition state for: ${expId}`);
    return false;
  }
  
  if (exp.active) {
    console.warn(`[StarForge] Expedition ${expId} already active`);
    showToast('Экспедиция уже в пути!', '⏳');
    return false;
  }
  
  // 4. ЗАПУСКАЕМ
  const now = Date.now();
  exp.active = true;
  exp.endTime = now + config.timer * 1000;
  exp.scanUsed = false;
  exp.specialChanceBoost = null;
  delete playerState.expeditionBonuses[expId];
  
  console.log(`[StarForge] Expedition ${expId} STARTED. End time: ${new Date(exp.endTime).toLocaleTimeString()}. Duration: ${config.timer}s`);
  
  // 5. Сохраняем состояние НЕМЕДЛЕННО
  saveGame();
  
  // 6. Оповещаем игрока
  showToast(`Экспедиция «${config.name}» началась! (${config.timer}с)`, config.fallbackIcon);
  sendBotNotification(`⛏️ Игрок отправился в экспедицию: ${config.name}`);
  
  // 7. Обновляем UI если нет активных оверлеев
  if (!isAnyOverlayActive()) {
    renderExpeditionsTab();
  }
  
  return true;
}

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
  let changed = false;
  const now = Date.now();
  
  for (let k in playerState.expeditions) {
    const exp = playerState.expeditions[k];
    if (exp && exp.active && exp.endTime && now >= exp.endTime) {
      console.log(`[StarForge] Expedition ${k} COMPLETED at ${new Date().toLocaleTimeString()}`);
      
      exp.active = false;
      exp.endTime = null;
      exp.scanUsed = false;
      exp.specialChanceBoost = null;
      delete playerState.expeditionBonuses[k];
      
      const drop = getRandomDropFromExpedition(k);
      playerState.geodes[drop.geodeId] = (playerState.geodes[drop.geodeId] || 0) + 1;
      
      if (drop.isSpecial) {
        if (!playerState.discoveredSpecialGeodes[k]) playerState.discoveredSpecialGeodes[k] = true;
        showToast(`Найдена особая жеода: ${CONFIG_GEODES[drop.geodeId].name}!`, CONFIG_GEODES[drop.geodeId].icon);
        sendBotNotification(`💎 Особая жеода: ${CONFIG_GEODES[drop.geodeId].name}!`);
      } else {
        showToast(`Экспедиция завершена! +1 ${CONFIG_GEODES[drop.geodeId].name}`, CONFIG_GEODES[drop.geodeId].icon);
      }
      changed = true;
    }
  }
  
  if (changed) {
    saveGame();
    if (!isAnyOverlayActive()) renderCurrentTab();
  }
}

function updateExpeditionTimersUI() {
  const now = Date.now();
  for (let k in CONFIG_EXPEDITIONS) {
    const exp = playerState.expeditions[k];
    const el = document.getElementById(`timer-${k}`);
    if (!el) continue;
    
    if (exp && exp.active && exp.endTime) {
      const diff = Math.max(0, exp.endTime - now);
      const m = Math.floor(diff / 60000);
      const s = Math.ceil((diff % 60000) / 1000);
      el.textContent = `⏳ ${m}:${s.toString().padStart(2, '0')}`;
    } else {
      // Сбрасываем на кнопку "Подробнее"
      const parent = el.closest('.expedition-action');
      if (parent && !parent.querySelector('.small-btn')) {
        el.outerHTML = `<button class="small-btn" data-info-exp="${k}">Подробнее</button>`;
        const newBtn = parent.querySelector(`[data-info-exp="${k}"]`);
        if (newBtn) {
          newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            import('./ui.js').then(ui => ui.showExpeditionInfoModal(k));
          });
        }
      }
    }
  }
}

function updateGlobalEventTimerUI() {
  const event = eventsManager.getActiveEvent();
  const timerEl = document.getElementById('eventTimer');
  if (timerEl && event && eventsManager.eventPhase === 'active') {
    timerEl.textContent = eventsManager.getTimeLeft();
  }
  if (event && eventsManager.eventEndTime && Date.now() >= eventsManager.eventEndTime && eventsManager.eventPhase === 'active') {
    eventsManager.endEvent();
  }
}

// ---------- ЧАСТИЦЫ И ТРЯСКА ----------
function createParticles(x, y) {
  const container = document.getElementById('app');
  for (let i = 0; i < 12; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    const angle = (i / 12) * Math.PI * 2;
    const distance = 40 + Math.random() * 60;
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
    particle.style.setProperty('--ty', Math.sin(angle) * distance + 'px');
    container.appendChild(particle);
    registerTimeout(setTimeout(() => particle.remove(), 800));
  }
}

function createEliteParticles() {
  const container = document.getElementById('app');
  for (let i = 0; i < 16; i++) {
    const particle = document.createElement('div');
    particle.className = 'elite-particle';
    particle.style.left = (window.innerWidth / 2) + 'px';
    particle.style.top = (window.innerHeight / 2) + 'px';
    particle.style.animationDelay = (i * 0.1) + 's';
    container.appendChild(particle);
    registerTimeout(setTimeout(() => particle.remove(), 2500));
  }
}

function triggerScreenShake() {
  const app = document.getElementById('app');
  app.classList.add('screen-shake');
  registerTimeout(setTimeout(() => app.classList.remove('screen-shake'), 120));
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
  
  registerTimeout(setTimeout(() => { flash.remove(); appear.remove(); }, 2500));
  sendBotNotification(`🏆 Коллекционный артефакт: ${ingot.name} ${ingot.icon}!`);
}

// ---------- ЛИДЕРБОРД ----------
export async function updateLeaderboard() {
  if (!isTelegram || !tg.initData) { showToast('Лидерборд доступен только в Telegram', '⚠️'); return; }
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
  testData.forEach((e, i) => e.rank = i + 1);
  
  let html = `<div class="modal-header"><div class="modal-title">🏆 ТОП ИГРОКОВ</div><button class="modal-close" onclick="document.dispatchEvent(new Event('closeModal'))">✕</button></div><div class="modal-content" style="text-align:left; padding:10px;">`;
  testData.forEach(e => {
    html += `<div style="display:flex;align-items:center;gap:12px;padding:12px;background:${e.isPlayer ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.03)'};border-radius:16px;margin-bottom:8px;"><span style="font-size:20px;font-weight:700;width:30px;">${e.rank}</span><span style="flex:1;font-weight:600;">${e.name}${e.isPlayer ? ' 👈' : ''}</span><span style="color:#FFD700;font-weight:700;">${e.xp} XP</span></div>`;
  });
  html += '</div>';
  
  import('./ui.js').then(ui => ui.openModal(html));
}

// ---------- КОНВЕЙЕР ----------
let conveyorState = { geodeId: null, isOpen: false, resultIngot: null, items: [], trackItems: [], timeoutId: null };
const ITEM_WIDTH = 96;

function cleanupConveyor() {
  if (conveyorState.timeoutId) { clearTimeout(conveyorState.timeoutId); allTimeouts.delete(conveyorState.timeoutId); conveyorState.timeoutId = null; }
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
  trackItems.forEach((item, i) => renderImageToElement(document.getElementById(`conv-${i}`), item.imagePath, item.icon, item.fallbackColor));
  
  document.getElementById('conveyorTitle').textContent = `Анализ ${g.name}...`;
  document.getElementById('conveyorOverlay').classList.add('active');
  
  track.style.transition = 'none';
  track.style.transform = 'translateX(0)';
  track.offsetHeight;
  
  const stopPos = -(19 * ITEM_WIDTH) + (3 * ITEM_WIDTH / 2) - ITEM_WIDTH / 2;
  registerTimeout(setTimeout(() => {
    track.style.transition = 'transform 4.5s cubic-bezier(0.2, 0, 0.1, 1)';
    track.style.transform = `translateX(${stopPos}px)`;
  }, 50));
  
  conveyorState.timeoutId = registerTimeout(setTimeout(() => stopRoulette(), 4550));
}

function stopRoulette() {
  if (!conveyorState.isOpen) return;
  const ingot = conveyorState.resultIngot;
  const g = CONFIG_GEODES[conveyorState.geodeId];
  let xp = g.xpValue + (ingot?.xpValue || 0);
  if (playerState.minedStats[ingot.id] === 0) { xp = Math.floor(xp * 3); showToast(`🎉 ПЕРВОЕ ОТКРЫТИЕ! +${xp} XP`, '🌟'); }
  
  playerState.ingots[ingot.id] = (playerState.ingots[ingot.id] || 0) + 1;
  playerState.minedStats[ingot.id] = (playerState.minedStats[ingot.id] || 0) + 1;
  playerState.player.totalIngots++;
  addXP(xp);
  saveGame();
  cleanupConveyor();
  clearActiveOverlay('conveyor');
  isOpeningGeode = false;
  registerTimeout(setTimeout(() => { showRewardPopup(ingot); renderCurrentTab(); }, 100));
}

// ---------- КУЗНИЦА (BRAWL) ----------
let brawlState = { geodeId: null, isSpecial: false, tapsRemaining: 10, isOpen: false };

export function openBrawlOverlay(geodeId, isSpecial) {
  if (isOpeningGeode) return;
  if ((playerState.geodes[geodeId] || 0) <= 0) { showToast('Нет такой жеоды!', '⚠️'); return; }
  if (isSpecial && isLocationCompleted(CONFIG_GEODES[geodeId].location)) { showToast('Все артефакты собраны!', '📚'); return; }
  
  isOpeningGeode = true;
  Object.assign(brawlState, { geodeId, isSpecial, tapsRemaining: 10, isOpen: true });
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
  
  renderImageToElement(brawlGeode, getGeodeStageImage(geodeId, 10).imagePath, getGeodeStageImage(geodeId, 10).fallbackIcon, '#8B7355');
  document.getElementById('brawlOverlay').classList.add('active');
}

function closeBrawlOverlay() {
  document.getElementById('brawlOverlay').classList.remove('active');
  brawlState.isOpen = false;
  isOpeningGeode = false;
  clearActiveOverlay('brawl');
  renderCurrentTab();
}

function handleBrawlTap(e) {
  if (!brawlState.isOpen || brawlState.tapsRemaining <= 0) return;
  const rect = document.getElementById('brawlGeode').getBoundingClientRect();
  createParticles(rect.left + rect.width/2, rect.top + rect.height/2);
  triggerScreenShake();
  document.getElementById('brawlGeode').classList.add('shake-animation');
  registerTimeout(setTimeout(() => document.getElementById('brawlGeode').classList.remove('shake-animation'), 300));
  
  brawlState.tapsRemaining--;
  document.getElementById('brawlCounter').textContent = brawlState.tapsRemaining;
  const stage = getGeodeStageImage(brawlState.geodeId, brawlState.tapsRemaining);
  renderImageToElement(document.getElementById('brawlGeode'), stage.imagePath, stage.fallbackIcon, '#8B7355');
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
    
    registerTimeout(setTimeout(() => {
      document.getElementById('brawlGeode').style.display = 'none';
      renderImageToElement(document.getElementById('brawlResultIcon'), ingot.imagePath, ingot.icon, ingot.fallbackColor);
      document.getElementById('brawlResultName').textContent = ingot.name;
      document.getElementById('brawlResultRarity').textContent = ingot.rarity;
      document.getElementById('brawlResultRarity').style.color = ingot.rarityClass === 'collectible' ? '#FF64FF' : (ingot.rarityClass === 'legendary' ? '#FFD700' : '#fff');
      document.getElementById('brawlResult').classList.add('show');
      document.getElementById('brawlCloseBtn').style.display = 'block';
      isOpeningGeode = false;
      clearActiveOverlay('brawl');
      renderCurrentTab();
    }, 500));
  } else {
    document.getElementById('brawlGeode').classList.add('explode-animation');
    document.querySelector('.brawl-hint').style.display = 'none';
    document.getElementById('brawlCounter').style.display = 'none';
    registerTimeout(setTimeout(() => {
      document.getElementById('brawlOverlay').classList.remove('active');
      brawlState.isOpen = false;
      clearActiveOverlay('brawl');
      initRoulette(geodeId);
    }, 500));
  }
}

document.getElementById('brawlGeode')?.addEventListener('click', handleBrawlTap);
document.getElementById('brawlCloseBtn')?.addEventListener('click', closeBrawlOverlay);
