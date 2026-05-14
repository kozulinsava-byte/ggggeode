// ========== CORE МОДУЛЬ: ЛОГИКА ИГРЫ · ВСЕ ЭКСПОРТЫ ==========
import { CONFIG_ITEMS, CONFIG_GEODES, CONFIG_EXPEDITIONS, CRAFT_RECIPES, LEVELS, DEFAULT_STATE } from './config.js';

// ========== ГЛОБАЛЬНЫЙ ОБЪЕКТ СОСТОЯНИЯ ==========
export let playerState = null;
const collectibleSerials = {};
let nextSerial = 1;

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

// ========== ФАЗА 1: PRELOAD ==========
export function initializeState() {
  console.log('[StarForge] ФАЗА 1: PRELOAD');
  
  playerState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  playerState.echoCooldowns = {};
  playerState.expeditionBonuses = {};
  
  try {
    const localData = localStorage.getItem('starforge_v1');
    if (localData) {
      applySaveData(JSON.parse(localData));
      console.log('[StarForge] Local save loaded');
    }
  } catch (e) {
    console.warn('[StarForge] Failed to load local save:', e);
  }
  
  if (isTelegram && tg.CloudStorage?.getItem) {
    try {
      tg.CloudStorage.getItem('starforge_save', (error, cloudData) => {
        if (!error && cloudData) {
          try {
            applySaveData(JSON.parse(cloudData));
            localStorage.setItem('starforge_v1', cloudData);
          } catch (e) {}
        }
      });
    } catch(e) {}
  }
  
  return playerState;
}

function applySaveData(data) {
  if (!data?.playerState) return;
  Object.assign(playerState, data.playerState);
  playerState.echoCooldowns = playerState.echoCooldowns || {};
  playerState.expeditionBonuses = playerState.expeditionBonuses || {};
  if (data.collectibleSerials) Object.assign(collectibleSerials, data.collectibleSerials);
  if (data.nextSerial) nextSerial = data.nextSerial;
  if (data.activeEvent) eventsManager.activeEvent = data.activeEvent;
  if (data.eventEndTime) eventsManager.eventEndTime = data.eventEndTime;
  if (data.eventPhase) eventsManager.eventPhase = data.eventPhase;
  if (data.rotationIndex !== undefined) eventsManager.rotationIndex = data.rotationIndex;
}

// ========== ФАЗА 2: VALIDATION ==========
export function validateState() {
  console.log('[StarForge] ФАЗА 2: VALIDATION');
  const now = Date.now();
  
  for (let expId in playerState.expeditions) {
    const exp = playerState.expeditions[expId];
    if (!exp) { playerState.expeditions[expId] = { active: false, endTime: null }; continue; }
    if (exp.active && exp.endTime && now >= exp.endTime) {
      exp.active = false; exp.endTime = null; exp.scanUsed = false; exp.specialChanceBoost = null;
      delete playerState.expeditionBonuses[expId];
      const drop = getRandomDropFromExpedition(expId);
      playerState.geodes[drop.geodeId] = (playerState.geodes[drop.geodeId] || 0) + 1;
      if (drop.isSpecial && !playerState.discoveredSpecialGeodes[expId]) playerState.discoveredSpecialGeodes[expId] = true;
    }
  }
  
  for (let gId in CONFIG_GEODES) { if (playerState.geodes[gId] === undefined) playerState.geodes[gId] = 0; }
  for (let iId in CONFIG_ITEMS) {
    if (playerState.ingots[iId] === undefined) playerState.ingots[iId] = 0;
    if (playerState.minedStats[iId] === undefined) playerState.minedStats[iId] = 0;
  }
  for (let locId in playerState.collectedArtifacts) { if (!Array.isArray(playerState.collectedArtifacts[locId])) playerState.collectedArtifacts[locId] = []; }
  for (let locId in playerState.discoveredSpecialGeodes) { if (playerState.discoveredSpecialGeodes[locId] === undefined) playerState.discoveredSpecialGeodes[locId] = false; }
  
  if (!playerState.player) playerState.player = { level: 1, xp: 0, totalOpened: 0, totalIngots: 0, totalArtifacts: 0 };
  const p = playerState.player;
  if (p.level === undefined) p.level = 1;
  if (p.xp === undefined) p.xp = 0;
  if (p.totalOpened === undefined) p.totalOpened = 0;
  if (p.totalIngots === undefined) p.totalIngots = 0;
  if (p.totalArtifacts === undefined) p.totalArtifacts = 0;
  
  return true;
}

// ========== ФАЗА 3: ЗАПУСК СИСТЕМ ==========
export function startGameSystems() {
  console.log('[StarForge] ФАЗА 3: SYSTEMS START');
  eventsManager.startEventCycle();
  startGlobalTimer();
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
    if (this.activeEvent && this.eventEndTime && Date.now() < this.eventEndTime) return this.activeEvent;
    return null;
  },
  
  getTimeLeft() {
    if (!this.eventEndTime) return '0:00';
    const diff = Math.max(0, this.eventEndTime - Date.now());
    return `${Math.floor(diff/60000)}:${String(Math.ceil((diff%60000)/1000)).padStart(2,'0')}`;
  },
  
  startEventCycle() {
    if (this.eventInterval) clearInterval(this.eventInterval);
    const now = Date.now();
    if (this.activeEvent && this.eventEndTime && now < this.eventEndTime) {
      this.eventPhase = 'active';
      this.eventInterval = setTimeout(() => {
        this.endEvent();
        this.triggerNextEvent();
        this.eventInterval = setInterval(() => this.triggerNextEvent(), 30 * 60 * 1000);
      }, this.eventEndTime - now);
      return;
    }
    this.triggerNextEvent();
    this.eventInterval = setInterval(() => this.triggerNextEvent(), 30 * 60 * 1000);
  },
  
  triggerNextEvent() {
    if (!this.activeEvent || this.eventPhase !== 'active') this.triggerGreatSmelt();
    else if (this.activeEvent.type === 'great_smelt') this.triggerMeteorStorm();
    else this.triggerGreatSmelt();
  },
  
  triggerGreatSmelt() {
    this.activeEvent = { id: 'great_smelt', name: 'Великая Переплавка', icon: '🔥', type: 'great_smelt' };
    this.eventEndTime = Date.now() + 15 * 60 * 1000;
    this.eventPhase = 'active';
  },
  
  triggerMeteorStorm() {
    this.activeEvent = { id: 'meteor_storm', name: 'Метеоритный Шторм', icon: '☄️', type: 'meteor_storm' };
    this.eventEndTime = Date.now() + 15 * 60 * 1000;
    this.eventPhase = 'active';
  },
  
  endEvent() { this.eventPhase = 'ending'; }
};

// ========== ПЛАВИЛЬНЯ ==========
let forgeState = { active: false, selectedRecipe: null, smeltSeconds: 0, smeltMaxSeconds: 0, smeltInterval: null };

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
  renderForgeInterface(document.getElementById('forgeContent'));
  document.getElementById('forgeOverlay').classList.add('active');
}

function renderForgeInterface(container) {
  if (!container) return;
  const recipes = getCraftableRecipes();
  let html = `<div class="forge-title-section"><span class="forge-title-icon">🔥</span><span class="forge-title-text">ПЛАВИЛЬНЯ</span></div><div style="font-size:11px;color:var(--text-secondary);margin-bottom:6px;">Выбери рецепт</div><div class="recipe-grid">`;
  
  if (!recipes.length) html += '<div class="empty-state" style="grid-column:1/-1;">Нет рецептов</div>';
  else recipes.forEach(r => {
    const isActive = forgeState.selectedRecipe?.id === r.id;
    html += `<div class="recipe-card ${isActive?'active':''} ${r.canCraft?'':'disabled'}" data-recipe="${r.id}"><div class="recipe-card-icon">${r.icon}</div><div class="recipe-card-name">${r.name}</div><div class="recipe-card-ingredients">`;
    for (let ingId in r.ingredients) {
      const owned = playerState.ingots[ingId] || 0;
      html += `<div class="recipe-card-ingredient-row">${CONFIG_ITEMS[ingId].icon} ${CONFIG_ITEMS[ingId].name}: <span style="color:${owned>=r.ingredients[ingId]?'#50C878':'#FF4444'}">${owned}/${r.ingredients[ingId]}</span></div>`;
    }
    html += `</div><div class="recipe-card-xp">+${r.xpReward} XP · ${r.smeltTime}с</div></div>`;
  });
  
  html += `</div><div class="forge-action-area"><button class="forge-smelt-btn" id="forgeSmeltBtn" ${forgeState.selectedRecipe?.canCraft?'':'disabled'}>${forgeState.selectedRecipe?.canCraft?'⚡ СПЛАВИТЬ':'ВЫБЕРИТЕ РЕЦЕПТ'}</button><button class="forge-exit-btn" id="forgeExitBtn">Выйти</button></div>`;
  container.innerHTML = html;
  
  container.querySelectorAll('.recipe-card:not(.disabled)').forEach(el => el.addEventListener('click', () => {
    const r = getCraftableRecipes().find(r => r.id === el.dataset.recipe);
    if (r?.canCraft) { forgeState.selectedRecipe = r; renderForgeInterface(container); }
  }));
  container.querySelector('#forgeSmeltBtn')?.addEventListener('click', () => { if (forgeState.selectedRecipe?.canCraft) startSmeltProcess(forgeState.selectedRecipe); });
  container.querySelector('#forgeExitBtn')?.addEventListener('click', closeForge);
}

function closeForge() {
  document.getElementById('forgeOverlay')?.classList.remove('active');
  forgeState.active = false; forgeState.selectedRecipe = null;
  clearActiveOverlay('forge');
}

function startSmeltProcess(recipe) {
  document.getElementById('forgeOverlay')?.classList.remove('active');
  forgeState.smeltMaxSeconds = recipe.smeltTime || 15;
  forgeState.smeltSeconds = forgeState.smeltMaxSeconds;
  ['forgeProgressLabel','forgeProgressFill','forgeProgressTime','forgeMolten'].forEach((id,i) => {
    const el = document.getElementById(id);
    if (el) {
      if (i===0) el.textContent = `Плавим ${recipe.name}...`;
      else if (i===1) el.style.width = '0%';
      else if (i===2) el.textContent = `${forgeState.smeltSeconds}с`;
      else if (i===3) el.style.height = '0%';
    }
  });
  document.getElementById('forgeProgressOverlay')?.classList.add('active');
  if (forgeState.smeltInterval) clearInterval(forgeState.smeltInterval);
  forgeState.smeltInterval = setInterval(() => {
    forgeState.smeltSeconds--;
    const pct = ((forgeState.smeltMaxSeconds - forgeState.smeltSeconds) / forgeState.smeltMaxSeconds) * 100;
    const fill = document.getElementById('forgeProgressFill');
    const time = document.getElementById('forgeProgressTime');
    const molten = document.getElementById('forgeMolten');
    if (fill) fill.style.width = pct + '%';
    if (time) time.textContent = `${forgeState.smeltSeconds}с`;
    if (molten) molten.style.height = pct + '%';
    if (forgeState.smeltSeconds <= 0) finishSmeltProcess(recipe);
  }, 1000);
}

function finishSmeltProcess(recipe) {
  if (forgeState.smeltInterval) { clearInterval(forgeState.smeltInterval); forgeState.smeltInterval = null; }
  document.getElementById('forgeProgressOverlay')?.classList.remove('active');
  for (let ingId in recipe.ingredients) playerState.ingots[ingId] -= recipe.ingredients[ingId];
  playerState.ingots[recipe.resultIngotId] = (playerState.ingots[recipe.resultIngotId] || 0) + 1;
  playerState.minedStats[recipe.resultIngotId] = (playerState.minedStats[recipe.resultIngotId] || 0) + 1;
  playerState.player.totalIngots++;
  addXP(recipe.xpReward);
  saveGame();
  forgeState.active = false; forgeState.selectedRecipe = null;
  clearActiveOverlay('forge');
  import('./ui.js').then(ui => { ui.showToast(`Создано: ${CONFIG_ITEMS[recipe.resultIngotId]?.name}!`, recipe.icon); ui.renderCurrentTab(); });
}

// ========== КРАФТ ==========
export function getCraftableRecipes() {
  const recipes = [];
  for (let id in CRAFT_RECIPES) {
    const r = CRAFT_RECIPES[id]; let ok = true;
    for (let ing in r.ingredients) { if ((playerState.ingots[ing]||0) < r.ingredients[ing]) { ok = false; break; } }
    recipes.push({...r, canCraft: ok});
  }
  return recipes;
}

export function craftItem(recipeId) {
  const r = getCraftableRecipes().find(r => r.id === recipeId);
  if (!r?.canCraft) { import('./ui.js').then(ui => ui.showToast('Недостаточно ресурсов!','⚠️')); return false; }
  for (let ing in r.ingredients) playerState.ingots[ing] -= r.ingredients[ing];
  playerState.ingots[r.resultIngotId] = (playerState.ingots[r.resultIngotId]||0) + 1;
  playerState.minedStats[r.resultIngotId] = (playerState.minedStats[r.resultIngotId]||0) + 1;
  playerState.player.totalIngots++;
  addXP(r.xpReward);
  saveGame();
  return true;
}

// ========== DEV ==========
export function devGiveXP() { playerState.player.xp += 1000000; while (playerState.player.level < LEVELS.length-1 && playerState.player.xp >= LEVELS[playerState.player.level]) playerState.player.level++; }
export function devGiveGeodes() { Object.keys(CONFIG_GEODES).forEach(id => playerState.geodes[id] = (playerState.geodes[id]||0) + 10); }
export function devUnlockLocations() { playerState.player.level = Math.max(playerState.player.level, 10); }
export function devResetGeodes() { Object.keys(CONFIG_GEODES).forEach(id => playerState.geodes[id] = 10); }

export function getSerialForCollectible(ingotId) {
  if (!collectibleSerials[ingotId]) collectibleSerials[ingotId] = String(nextSerial++).padStart(3,'0');
  return collectibleSerials[ingotId];
}

export function isLocationCompleted(locId) {
  const s = CONFIG_GEODES[`special_${locId}`];
  return s ? s.possibleIngots.every(id => playerState.ingots[id] > 0) : false;
}

export function getExpeditionTimeLeft(expId) {
  const e = playerState.expeditions[expId];
  return (e?.active && e.endTime) ? Math.max(0, e.endTime - Date.now()) : null;
}

export function addXP(amount) {
  playerState.player.xp += amount;
  while (playerState.player.level < LEVELS.length-1 && playerState.player.xp >= LEVELS[playerState.player.level]) {
    playerState.player.level++;
    import('./ui.js').then(ui => ui.showToast(`🎉 Уровень ${playerState.player.level}!`,'⬆️'));
  }
  saveGame();
}

export function sellIngot(ingotId) {
  const ing = CONFIG_ITEMS[ingotId];
  if (ing.isCollectible) { import('./ui.js').then(ui => ui.showToast('Нельзя сдавать!','⚠️')); return; }
  const cnt = playerState.ingots[ingotId] || 0;
  if (cnt <= 0) { import('./ui.js').then(ui => ui.showToast('Нет слитков!','⚠️')); return; }
  playerState.ingots[ingotId] = 0;
  addXP(ing.sellValue * cnt);
  saveGame();
  import('./ui.js').then(ui => { ui.showToast(`Сдано ${cnt} ${ing.name}!`,'💰'); ui.renderCurrentTab(); });
}

export function exchangeSpecialGeodeForXP(geodeId) {
  if ((playerState.geodes[geodeId]||0) <= 0) { import('./ui.js').then(ui => ui.showToast('Нет жеоды!','⚠️')); return; }
  const g = CONFIG_GEODES[geodeId];
  if (!g?.isSpecial || !isLocationCompleted(g.location)) { import('./ui.js').then(ui => ui.showToast('Соберите артефакты!','⚠️')); return; }
  playerState.geodes[geodeId]--;
  addXP(800);
  saveGame();
  import('./ui.js').then(ui => { ui.showToast('Изучено! +800 XP','📚'); ui.renderCurrentTab(); });
}

// ========== МИНИ-ИГРА СИГНАЛЫ ==========
let activeSignalGame = { active: false, expId: null, bonusType: null, points: [], collected: 0, timer: 10, timerInterval: null, timeoutId: null };

export function startSignalGame(expId, bonusType) {
  if (activeSignalGame.active) cleanupSignalGame();
  activeSignalGame.active = true; activeSignalGame.expId = expId; activeSignalGame.bonusType = bonusType;
  activeSignalGame.collected = 0; activeSignalGame.timer = 10; activeSignalGame.points = [];
  setActiveOverlay('signalGame');
  const overlay = document.getElementById('signalGameOverlay');
  const area = document.getElementById('signalGameArea');
  if (overlay) overlay.classList.add('active');
  const tEl = document.getElementById('signalTimer'); if (tEl) tEl.textContent = '10';
  const cEl = document.getElementById('signalCounter'); if (cEl) cEl.textContent = 'Сигналов: 0/8';
  if (area) area.innerHTML = '';
  for (let i = 0; i < 8; i++) setTimeout(() => { if (activeSignalGame.active && area) createSignalPoint(area); }, i * 480);
  activeSignalGame.timerInterval = setInterval(() => {
    if (!activeSignalGame.active) return;
    activeSignalGame.timer--;
    const t = document.getElementById('signalTimer'); if (t) t.textContent = activeSignalGame.timer;
    if (activeSignalGame.timer <= 0) signalGameFail();
  }, 1000);
}

function createSignalPoint(area) {
  if (!activeSignalGame.active || !area) return;
  const p = document.createElement('div'); p.className = 'signal-point';
  p.style.left = (Math.random()*(area.clientWidth-60)+30) + 'px';
  p.style.top = (Math.random()*(area.clientHeight-60)+30) + 'px';
  p.addEventListener('click', () => {
    if (!activeSignalGame.active) return;
    p.remove(); activeSignalGame.collected++;
    const c = document.getElementById('signalCounter'); if (c) c.textContent = `Сигналов: ${activeSignalGame.collected}/8`;
    if (activeSignalGame.collected >= 8) signalGameSuccess();
  });
  area.appendChild(p); activeSignalGame.points.push(p);
}

function signalGameSuccess() {
  if (!activeSignalGame.active) return;
  if (activeSignalGame.bonusType === 'echo') applyEchoBonus(activeSignalGame.expId);
  else if (activeSignalGame.bonusType === 'scan') applyScanBonus(activeSignalGame.expId);
  cleanupSignalGame();
  document.getElementById('signalGameOverlay')?.classList.remove('active');
  clearActiveOverlay('signalGame');
  import('./ui.js').then(ui => ui.showToast('✅ Бонус применён!','📡'));
}

function signalGameFail() {
  if (!activeSignalGame.active) return;
  playerState.echoCooldowns[activeSignalGame.expId] = Date.now() + 30000;
  saveGame();
  cleanupSignalGame();
  document.getElementById('signalGameOverlay')?.classList.remove('active');
  clearActiveOverlay('signalGame');
  import('./ui.js').then(ui => ui.showToast('❌ Сбой...','📡'));
}

function cleanupSignalGame() {
  if (activeSignalGame.timerInterval) { clearInterval(activeSignalGame.timerInterval); activeSignalGame.timerInterval = null; }
  if (activeSignalGame.timeoutId) { clearTimeout(activeSignalGame.timeoutId); activeSignalGame.timeoutId = null; }
  activeSignalGame.points.forEach(p => p.remove());
  activeSignalGame.active = false;
}

function applyEchoBonus(expId) {
  const e = playerState.expeditions[expId]; if (!e?.active) return;
  e.endTime -= Math.floor((e.endTime - Date.now()) * 0.15);
  playerState.expeditionBonuses[expId] = 'echo'; saveGame();
}

function applyScanBonus(expId) {
  const e = playerState.expeditions[expId]; if (!e?.active) return;
  e.scanUsed = true; e.specialChanceBoost = 1.2;
  playerState.expeditionBonuses[expId] = 'scan'; saveGame();
}

// ========== СОХРАНЕНИЯ ==========
export function saveGame() {
  if (!playerState) return;
  const data = JSON.stringify({ playerState, collectibleSerials, nextSerial,
    activeEvent: eventsManager.activeEvent, eventEndTime: eventsManager.eventEndTime,
    eventPhase: eventsManager.eventPhase, rotationIndex: eventsManager.rotationIndex });
  try { localStorage.setItem('starforge_v1', data); } catch(e) {}
  if (isTelegram && tg.CloudStorage?.setItem) { try { tg.CloudStorage.setItem('starforge_save', data, ()=>{}); } catch(e) {} }
}

// ========== ЭКСПЕДИЦИИ ==========
function getRandomDropFromExpedition(expId) {
  const exp = CONFIG_EXPEDITIONS[expId]; if (!exp) return { geodeId: 'mine', isSpecial: false };
  let ch = exp.specialGeodeChance;
  const pe = playerState.expeditions[expId];
  if (pe?.scanUsed && pe?.specialChanceBoost) ch *= pe.specialChanceBoost;
  if (!isLocationCompleted(expId) && Math.random() < ch) return { geodeId: exp.specialGeodeId, isSpecial: true };
  return { geodeId: expId, isSpecial: false };
}

function checkCompletedExpeditions() {
  if (!playerState) return;
  let changed = false; const now = Date.now();
  for (let k in playerState.expeditions) {
    const e = playerState.expeditions[k];
    if (e?.active && e.endTime && now >= e.endTime) {
      e.active = false; e.endTime = null; e.scanUsed = false; e.specialChanceBoost = null;
      delete playerState.expeditionBonuses[k];
      const drop = getRandomDropFromExpedition(k);
      playerState.geodes[drop.geodeId] = (playerState.geodes[drop.geodeId]||0) + 1;
      if (drop.isSpecial && !playerState.discoveredSpecialGeodes[k]) playerState.discoveredSpecialGeodes[k] = true;
      changed = true;
    }
  }
  if (changed) { saveGame(); import('./ui.js').then(ui => ui.renderCurrentTab()); }
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
    const el = document.getElementById(`timer-${k}`);
    const e = playerState.expeditions[k];
    if (el && e?.active && e.endTime) {
      const diff = Math.max(0, e.endTime - now);
      el.textContent = `⏳ ${Math.floor(diff/60000)}:${String(Math.ceil((diff%60000)/1000)).padStart(2,'0')}`;
    }
  }
}

function updateEventTimer() {
  const ev = eventsManager.getActiveEvent();
  const el = document.getElementById('eventTimer');
  if (el && ev) el.textContent = eventsManager.getTimeLeft();
  if (ev && eventsManager.eventEndTime && Date.now() >= eventsManager.eventEndTime && eventsManager.eventPhase === 'active') {
    eventsManager.endEvent();
    import('./ui.js').then(ui => ui.renderCurrentTab());
  }
}

export function startExpedition(expId) {
  console.log('[StarForge] startExpedition:', expId, 'playerState:', !!playerState);
  if (!playerState) return false;
  const exp = playerState.expeditions[expId];
  if (!exp) { console.error('No state for:', expId); return false; }
  if (exp.active) { import('./ui.js').then(ui => ui.showToast('Уже в пути!','⏳')); return false; }
  const cfg = CONFIG_EXPEDITIONS[expId];
  if (!cfg) { console.error('No config for:', expId); return false; }
  
  exp.active = true; exp.endTime = Date.now() + cfg.timer * 1000;
  exp.scanUsed = false; exp.specialChanceBoost = null;
  delete playerState.expeditionBonuses[expId];
  
  console.log('Expedition STARTED:', expId, 'End:', new Date(exp.endTime).toLocaleTimeString());
  saveGame();
  import('./ui.js').then(ui => { ui.showToast(`«${cfg.name}» началась!`, cfg.fallbackIcon); ui.renderExpeditionsTab(); });
  return true;
}

// ========== ЧАСТИЦЫ ==========
function createParticles(x, y) {
  const app = document.getElementById('app'); if (!app) return;
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div'); p.className = 'particle';
    const a = (i/12)*Math.PI*2, d = 40+Math.random()*60;
    p.style.left = x+'px'; p.style.top = y+'px';
    p.style.setProperty('--tx', Math.cos(a)*d+'px'); p.style.setProperty('--ty', Math.sin(a)*d+'px');
    app.appendChild(p); setTimeout(() => p.remove(), 800);
  }
}

function createEliteParticles() {
  const app = document.getElementById('app'); if (!app) return;
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('div'); p.className = 'elite-particle';
    p.style.left = (window.innerWidth/2)+'px'; p.style.top = (window.innerHeight/2)+'px';
    p.style.animationDelay = (i*0.1)+'s';
    app.appendChild(p); setTimeout(() => p.remove(), 2500);
  }
}

function triggerScreenShake() {
  const app = document.getElementById('app');
  if (app) { app.classList.add('screen-shake'); setTimeout(() => app.classList.remove('screen-shake'), 120); }
}

function showCollectibleAnimation(ingot) {
  const f = document.createElement('div'); f.className = 'collectible-flash'; document.body.appendChild(f);
  createEliteParticles();
  const a = document.createElement('div'); a.className = 'collectible-appear';
  a.innerHTML = `<div class="collectible-appear-icon" style="color:${ingot.fallbackColor}">${ingot.icon}</div><div class="collectible-appear-text">${ingot.name}</div>`;
  document.body.appendChild(a);
  setTimeout(() => { f.remove(); a.remove(); }, 2500);
}

// ========== КОНВЕЙЕР ==========
let conveyorState = { geodeId: null, isOpen: false, resultIngot: null, items: [], trackItems: [], timeoutId: null };
const ITEM_WIDTH = 96;

function cleanupConveyor() {
  if (conveyorState.timeoutId) { clearTimeout(conveyorState.timeoutId); conveyorState.timeoutId = null; }
  document.getElementById('conveyorOverlay')?.classList.remove('active');
  conveyorState.isOpen = false;
}

export function initRoulette(geodeId) {
  const g = CONFIG_GEODES[geodeId]; if (!g || g.isSpecial) return;
  let cum = 0, droppedId = g.lootTable[0].ingotId;
  const rand = Math.random();
  for (let e of g.lootTable) { cum += e.chance; if (rand < cum) { droppedId = e.ingotId; break; } }
  const ingot = CONFIG_ITEMS[droppedId];
  const items = g.lootTable.map(e => CONFIG_ITEMS[e.ingotId]);
  const trackItems = Array.from({length:30},(_,i)=>items[i%items.length]);
  trackItems[19] = ingot;
  conveyorState = { geodeId, isOpen: true, resultIngot: ingot, items, trackItems, timeoutId: null };
  setActiveOverlay('conveyor');
  
  const track = document.getElementById('conveyorTrack'); if (!track) return;
  track.innerHTML = '';
  trackItems.forEach((item,i) => {
    const el = document.createElement('div'); el.className = 'conveyor-item';
    el.innerHTML = `<div class="conveyor-item-icon" id="conv-${i}"></div><div class="conveyor-item-name">${item.name}</div>`;
    track.appendChild(el);
  });
  import('./ui.js').then(ui => trackItems.forEach((item,i) => ui.renderImageToElement(document.getElementById(`conv-${i}`), item.imagePath, item.icon, item.fallbackColor)));
  
  const title = document.getElementById('conveyorTitle'); if (title) title.textContent = `Анализ ${g.name}...`;
  document.getElementById('conveyorOverlay')?.classList.add('active');
  
  track.style.transition = 'none'; track.style.transform = 'translateX(0)'; track.offsetHeight;
  const stopPos = -(19*ITEM_WIDTH) + (3*ITEM_WIDTH/2) - ITEM_WIDTH/2;
  setTimeout(() => { track.style.transition = 'transform 4.5s cubic-bezier(0.2,0,0.1,1)'; track.style.transform = `translateX(${stopPos}px)`; }, 50);
  conveyorState.timeoutId = setTimeout(() => stopRoulette(), 4550);
}

function stopRoulette() {
  if (!conveyorState.isOpen) return;
  const ingot = conveyorState.resultIngot;
  let xp = CONFIG_GEODES[conveyorState.geodeId].xpValue + (ingot?.xpValue||0);
  if (playerState.minedStats[ingot.id] === 0) xp = Math.floor(xp*3);
  playerState.ingots[ingot.id] = (playerState.ingots[ingot.id]||0) + 1;
  playerState.minedStats[ingot.id] = (playerState.minedStats[ingot.id]||0) + 1;
  playerState.player.totalIngots++;
  addXP(xp); saveGame();
  cleanupConveyor(); clearActiveOverlay('conveyor'); isOpeningGeode = false;
  import('./ui.js').then(ui => { ui.showRewardPopup(ingot); ui.renderCurrentTab(); });
}

// ========== BRAWL ==========
let brawlState = { geodeId: null, isSpecial: false, tapsRemaining: 10, isOpen: false };

export function openBrawlOverlay(geodeId, isSpecial) {
  if (isOpeningGeode) return;
  if ((playerState.geodes[geodeId]||0) <= 0) { import('./ui.js').then(ui => ui.showToast('Нет жеоды!','⚠️')); return; }
  if (isSpecial && isLocationCompleted(CONFIG_GEODES[geodeId].location)) { import('./ui.js').then(ui => ui.showToast('Собраны!','📚')); return; }
  isOpeningGeode = true;
  brawlState = { geodeId, isSpecial, tapsRemaining: 10, isOpen: true };
  setActiveOverlay('brawl');
  
  const bg = document.getElementById('brawlGeode');
  document.getElementById('brawlCounter').textContent = '10';
  document.getElementById('brawlResult').classList.remove('show');
  document.getElementById('brawlCloseBtn').style.display = 'none';
  bg.style.display = 'flex'; bg.classList.remove('explode-animation');
  bg.classList.toggle('special-geode', isSpecial);
  document.querySelector('.brawl-hint').style.display = 'block';
  document.getElementById('brawlCounter').style.display = 'block';
  import('./ui.js').then(ui => { const s = ui.getGeodeStageImage(geodeId,10); ui.renderImageToElement(bg, s.imagePath, s.fallbackIcon, '#8B7355'); });
  document.getElementById('brawlOverlay').classList.add('active');
}

function closeBrawlOverlay() {
  document.getElementById('brawlOverlay')?.classList.remove('active');
  brawlState.isOpen = false; isOpeningGeode = false;
  clearActiveOverlay('brawl');
  import('./ui.js').then(ui => ui.renderCurrentTab());
}

function handleBrawlTap(e) {
  if (!brawlState.isOpen || brawlState.tapsRemaining <= 0) return;
  const r = document.getElementById('brawlGeode')?.getBoundingClientRect();
  if (r) createParticles(r.left+r.width/2, r.top+r.height/2);
  triggerScreenShake();
  document.getElementById('brawlGeode')?.classList.add('shake-animation');
  setTimeout(() => document.getElementById('brawlGeode')?.classList.remove('shake-animation'), 300);
  brawlState.tapsRemaining--;
  document.getElementById('brawlCounter').textContent = brawlState.tapsRemaining;
  import('./ui.js').then(ui => {
    const s = ui.getGeodeStageImage(brawlState.geodeId, brawlState.tapsRemaining);
    ui.renderImageToElement(document.getElementById('brawlGeode'), s.imagePath, s.fallbackIcon, '#8B7355');
  });
  if (brawlState.tapsRemaining <= 0) finishBrawlOpening();
}

function finishBrawlOpening() {
  const { geodeId, isSpecial } = brawlState;
  if (playerState.geodes[geodeId] > 0) playerState.geodes[geodeId]--;
  playerState.player.totalOpened++;
  
  if (isSpecial) {
    const g = CONFIG_GEODES[geodeId]; const loc = g.location;
    const avail = g.possibleIngots.filter(id => !playerState.collectedArtifacts[loc].includes(id));
    const picked = avail.length ? avail[Math.floor(Math.random()*avail.length)] : g.possibleIngots[0];
    const ingot = CONFIG_ITEMS[picked];
    playerState.ingots[picked] = (playerState.ingots[picked]||0)+1;
    playerState.minedStats[picked] = (playerState.minedStats[picked]||0)+1;
    if (!playerState.collectedArtifacts[loc].includes(picked)) { playerState.collectedArtifacts[loc].push(picked); playerState.player.totalArtifacts++; }
    if (!playerState.discoveredSpecialGeodes[loc]) playerState.discoveredSpecialGeodes[loc] = true;
    addXP(ingot.xpValue); saveGame();
    if (ingot.isCollectible && playerState.ingots[picked]===1) showCollectibleAnimation(ingot);
    
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
      isOpeningGeode = false; clearActiveOverlay('brawl');
      import('./ui.js').then(ui => ui.renderCurrentTab());
    }, 500);
  } else {
    document.getElementById('brawlGeode').classList.add('explode-animation');
    document.querySelector('.brawl-hint').style.display = 'none';
    document.getElementById('brawlCounter').style.display = 'none';
    setTimeout(() => {
      document.getElementById('brawlOverlay').classList.remove('active');
      brawlState.isOpen = false; clearActiveOverlay('brawl');
      initRoulette(geodeId);
    }, 500);
  }
}

// ========== МЕТЕОРИТНЫЙ ШТОРМ (ЗАГЛУШКА) ==========
export let meteorStormState = { active: false, timer: 0, timerInterval: null, spawnInterval: null, meteorElements: [], captured: { legendary: 0, rare: 0, common: 0 } };

export function openMeteorStorm() {
  import('./ui.js').then(ui => ui.showToast('Шторм в разработке','☄️'));
}

export function claimMeteorStormRewards() {}
export function exitMeteorStormEarly() {}

export function terminateEvent() {
  if (meteorStormState.timerInterval) { clearInterval(meteorStormState.timerInterval); meteorStormState.timerInterval = null; }
  if (meteorStormState.spawnInterval) { clearInterval(meteorStormState.spawnInterval); meteorStormState.spawnInterval = null; }
  meteorStormState.meteorElements.forEach(m => { if (m.isConnected) m.remove(); });
  meteorStormState.meteorElements = [];
  meteorStormState.active = false;
  document.getElementById('meteorStormOverlay')?.classList.remove('active');
  document.getElementById('meteorStormResultOverlay')?.classList.remove('active');
}

// Привязка событий
setTimeout(() => {
  document.getElementById('brawlGeode')?.addEventListener('click', handleBrawlTap);
  document.getElementById('brawlCloseBtn')?.addEventListener('click', closeBrawlOverlay);
}, 1000);
