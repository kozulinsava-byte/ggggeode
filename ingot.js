// ========== INGOT МОДУЛЬ: СЛИТОК-КЛИКЕР ==========
import { CONFIG_ITEMS } from './config.js';
import { getPlayerState, saveGame } from './core.js';

// ========== ДАННЫЕ ПРОГРЕССИИ СЛИТКА (15 УРОВНЕЙ) ==========
const INGOT_LEVELS = {
  1: {
    level: 1,
    name: 'Ржавый Слиток',
    icon: '🪨',
    era: 'Эпоха Шахт',
    shavingsCost: 150,
    ingotCost: { copper: 3 },
    tapPower: 1,
    image: 'assets/king_ingot/ingot_1.png'
  },
  2: {
    level: 2,
    name: 'Чугунный Слиток',
    icon: '⚫',
    era: 'Эпоха Шахт',
    shavingsCost: 500,
    ingotCost: { iron: 2, coal: 2 },
    tapPower: 3,
    image: 'assets/king_ingot/ingot_2.png'
  },
  3: {
    level: 3,
    name: 'Медный Слиток',
    icon: '🟫',
    era: 'Эпоха Шахт',
    shavingsCost: 1500,
    ingotCost: { copper: 5, tin: 2 },
    tapPower: 7,
    image: 'assets/king_ingot/ingot_3.png'
  },
  4: {
    level: 4,
    name: 'Железный Слиток',
    icon: '⬜',
    era: 'Эпоха Шахт',
    shavingsCost: 4000,
    ingotCost: { iron: 5, nickel: 2, coal: 3 },
    tapPower: 15,
    image: 'assets/king_ingot/ingot_4.png'
  },
  5: {
    level: 5,
    name: 'Бронзовый Слиток',
    icon: '🟤',
    era: 'Эпоха Джунглей',
    shavingsCost: 10000,
    ingotCost: { vinebronze: 2, woodalloy: 1 },
    tapPower: 30,
    image: 'assets/king_ingot/ingot_5.png'
  },
  6: {
    level: 6,
    name: 'Стальной Слиток',
    icon: '🔩',
    era: 'Эпоха Джунглей',
    shavingsCost: 25000,
    ingotCost: { iron: 4, coal: 4, nickel: 2 },
    tapPower: 60,
    image: 'assets/king_ingot/ingot_6.png'
  },
  7: {
    level: 7,
    name: 'Изумрудный Слиток',
    icon: '💚',
    era: 'Эпоха Джунглей',
    shavingsCost: 60000,
    ingotCost: { emeraldsteel: 2, biocopper: 3 },
    tapPower: 120,
    image: 'assets/king_ingot/ingot_7.png'
  },
  8: {
    level: 8,
    name: 'Окисленный Слиток',
    icon: '🥈',
    era: 'Эпоха Джунглей',
    shavingsCost: 150000,
    ingotCost: { oxidizedsilver: 2, vinebronze: 3, woodalloy: 2 },
    tapPower: 250,
    image: 'assets/king_ingot/ingot_8.png'
  },
  9: {
    level: 9,
    name: 'Био-Стальной Слиток',
    icon: '🧬',
    era: 'Эпоха Джунглей',
    shavingsCost: 350000,
    ingotCost: { biocopper: 4, emeraldsteel: 2, woodalloy: 3 },
    tapPower: 500,
    image: 'assets/king_ingot/ingot_9.png'
  },
  10: {
    level: 10,
    name: 'Вольфрамовый Слиток',
    icon: '⭐',
    era: 'Пояс Астероидов',
    shavingsCost: 800000,
    ingotCost: { starchrome: 2, titanium: 2, cobalt: 1 },
    tapPower: 1000,
    image: 'assets/king_ingot/ingot_10.png'
  },
  11: {
    level: 11,
    name: 'Титановый Слиток',
    icon: '🔷',
    era: 'Пояс Астероидов',
    shavingsCost: 1800000,
    ingotCost: { titanium: 4, starchrome: 3, lunarsilver: 2 },
    tapPower: 2200,
    image: 'assets/king_ingot/ingot_11.png'
  },
  12: {
    level: 12,
    name: 'Кобальтовый Слиток',
    icon: '🔵',
    era: 'Пояс Астероидов',
    shavingsCost: 4000000,
    ingotCost: { cobalt: 4, titanium: 3, platincon: 2 },
    tapPower: 5000,
    image: 'assets/king_ingot/ingot_12.png'
  },
  13: {
    level: 13,
    name: 'Иридиевый Слиток',
    icon: '💠',
    era: 'Далёкий Космос',
    shavingsCost: 10000000,
    ingotCost: { iridium: 2, platincon: 4, lunarsilver: 3 },
    tapPower: 12000,
    image: 'assets/king_ingot/ingot_13.png'
  },
  14: {
    level: 14,
    name: 'Платиновый Слиток',
    icon: '💎',
    era: 'Далёкий Космос',
    shavingsCost: 25000000,
    ingotCost: { platincon: 6, iridium: 3, starchrome: 4 },
    tapPower: 30000,
    image: 'assets/king_ingot/ingot_14.png'
  },
  15: {
    level: 15,
    name: 'Космониумный Слиток',
    icon: '🌈',
    era: 'Далёкий Космос',
    shavingsCost: 60000000,
    ingotCost: { cosmonium: 1, nebulite: 2, singular: 2, meteor_gold: 3 },
    tapPower: 70000,
    image: 'assets/king_ingot/ingot_15.png'
  }
};

// ========== СОСТОЯНИЕ СЛИТКА ==========
let ingotState = {
  shavings: 0,
  tapEnergy: 500,
  maxTapEnergy: 500,
  lastEnergyRegen: Date.now(),
  levelLocked: false,
  uiUpdateInterval: null
};

// ========== ИНИЦИАЛИЗАЦИЯ ==========
export function initIngotState(savedData) {
  if (savedData) {
    ingotState.shavings = savedData.ingotShavings || 0;
    ingotState.tapEnergy = savedData.tapEnergy || 500;
    ingotState.maxTapEnergy = savedData.maxTapEnergy || 500;
    ingotState.lastEnergyRegen = savedData.lastEnergyRegen || Date.now();
    ingotState.levelLocked = savedData.levelLocked || false;
  }
}

export function resetIngotState() {
  stopUIUpdates();
  ingotState.shavings = 0;
  ingotState.tapEnergy = 500;
  ingotState.maxTapEnergy = 500;
  ingotState.lastEnergyRegen = Date.now();
  ingotState.levelLocked = false;
}

export function getIngotSaveData() {
  return {
    ingotShavings: ingotState.shavings,
    tapEnergy: ingotState.tapEnergy,
    maxTapEnergy: ingotState.maxTapEnergy,
    lastEnergyRegen: ingotState.lastEnergyRegen,
    levelLocked: ingotState.levelLocked
  };
}

export function getShavings() { return ingotState.shavings; }
export function getTapEnergy() { return ingotState.tapEnergy; }
export function getMaxTapEnergy() { return ingotState.maxTapEnergy; }
export function isLevelLocked() { return ingotState.levelLocked; }

export function getCurrentIngotData() {
  const state = getPlayerState();
  return INGOT_LEVELS[state.player.level] || INGOT_LEVELS[1];
}

export function getIngotDataForLevel(level) {
  return INGOT_LEVELS[level] || null;
}

// ========== РЕГЕНЕРАЦИЯ ЭНЕРГИИ ==========
export function regenEnergy() {
  const now = Date.now();
  const elapsed = now - ingotState.lastEnergyRegen;
  const regenAmount = Math.floor(elapsed / 1000) * 3;
  if (regenAmount > 0) {
    ingotState.tapEnergy = Math.min(ingotState.maxTapEnergy, ingotState.tapEnergy + regenAmount);
    ingotState.lastEnergyRegen = now - (elapsed % 1000);
  }
}

// ========== ТАП С УЧЁТОМ МУЛЬТИ-ТАПА ==========
export function tapIngot() {
  if (ingotState.tapEnergy <= 0) {
    return { success: false, message: 'Нет энергии! Подождите восстановления.' };
  }
  
  const ingotData = getCurrentIngotData();
  const tapPower = ingotData.tapPower || 1;
  
  ingotState.tapEnergy--;
  ingotState.shavings += tapPower;
  saveGame();
  return { success: true, shavings: ingotState.shavings, energy: ingotState.tapEnergy, tapPower };
}

// ========== ЗАСЛОНКА ==========
export function checkLevelLock() {
  const state = getPlayerState();
  const nextXP = getNextLevelXP(state.player.level);
  if (state.player.xp >= nextXP && !ingotState.levelLocked) {
    state.player.xp = nextXP;
    ingotState.levelLocked = true;
    saveGame();
    return true;
  }
  return ingotState.levelLocked;
}

function getNextLevelXP(level) {
  const LEVELS = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3300, 4000, 4800, 5700, 6700, 7800, 9000, 10300, 11700, 13200, 15000];
  return LEVELS[level] || LEVELS[LEVELS.length - 1];
}

// ========== ПЕРЕПЛАВКА ==========
export function performUpgrade() {
  const state = getPlayerState();
  if (!ingotState.levelLocked) return { success: false, message: 'Опыт ещё не заполнен!' };
  const ingotData = INGOT_LEVELS[state.player.level];
  if (!ingotData) return { success: false, message: 'Максимальный уровень!' };
  if (ingotState.shavings < ingotData.shavingsCost) return { success: false, message: `Нужно ${ingotData.shavingsCost} стружки!` };
  if (ingotData.ingotCost) {
    for (let id in ingotData.ingotCost) {
      if ((state.ingots[id] || 0) < ingotData.ingotCost[id]) {
        return { success: false, message: `Недостаточно ${CONFIG_ITEMS[id]?.name || id}!` };
      }
    }
  }
  
  const oldIngot = { name: ingotData.name, icon: ingotData.icon, era: ingotData.era, level: state.player.level, image: ingotData.image };
  
  ingotState.shavings -= ingotData.shavingsCost;
  if (ingotData.ingotCost) {
    for (let id in ingotData.ingotCost) state.ingots[id] -= ingotData.ingotCost[id];
  }
  state.player.level++;
  state.player.xp = 0;
  ingotState.levelLocked = false;
  saveGame();
  
  const newData = INGOT_LEVELS[state.player.level];
  return { success: true, oldIngot, newIngot: { name: newData.name, icon: newData.icon, era: newData.era, level: state.player.level, image: newData.image } };
}

// ========== ЖИВОЕ ОБНОВЛЕНИЕ UI ==========
function startUIUpdates() {
  if (ingotState.uiUpdateInterval) return;
  ingotState.uiUpdateInterval = setInterval(() => {
    regenEnergy();
    updateIngotUI();
  }, 300);
}

function stopUIUpdates() {
  if (ingotState.uiUpdateInterval) {
    clearInterval(ingotState.uiUpdateInterval);
    ingotState.uiUpdateInterval = null;
  }
}

// ========== ОТРИСОВКА ==========
export function renderIngotScreen(container) {
  stopUIUpdates();
  
  const state = getPlayerState();
  const ingotData = getCurrentIngotData();
  const nextIngot = getIngotDataForLevel(state.player.level + 1);
  const energy = ingotState.tapEnergy;
  const maxEnergy = ingotState.maxTapEnergy;
  const shavings = ingotState.shavings;
  const locked = ingotState.levelLocked;
  const nextXP = getNextLevelXP(state.player.level);
  const energyPct = (energy / maxEnergy) * 100;
  const tapPower = ingotData.tapPower || 1;
  
  let html = '';
  
  // ===== CSS =====
  html += `
    <style>
      @keyframes ingotFloat {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-14px); }
      }
      @keyframes shadowPulse {
        0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.5; }
        50% { transform: translateX(-50%) scale(0.75); opacity: 0.25; }
      }
      @keyframes ingotGlow {
        0%, 100% { filter: drop-shadow(0 0 35px rgba(255,140,0,0.7)) drop-shadow(0 0 70px rgba(255,80,0,0.35)); }
        50% { filter: drop-shadow(0 0 55px rgba(255,140,0,1)) drop-shadow(0 0 100px rgba(255,80,0,0.55)); }
      }
      @keyframes tapBounce {
        0% { transform: scale(1); }
        40% { transform: scale(0.92); }
        100% { transform: scale(1); }
      }
      @keyframes sparkFly {
        0% { opacity: 1; transform: translate(0, 0) scale(1); }
        100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0); }
      }
      @keyframes textFloatUp {
        0% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-60px) scale(1.4); }
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-5px); }
        80% { transform: translateX(5px); }
      }
      @keyframes screenFlash {
        0% { opacity: 0; }
        30% { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes pulseUpgrade {
        0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(255,50,0,0.6), 0 0 60px rgba(255,100,0,0.3); }
        50% { transform: scale(1.03); box-shadow: 0 0 50px rgba(255,50,0,0.9), 0 0 100px rgba(255,100,0,0.6); }
      }
      @keyframes spinGlow {
        0% { transform: translate(-50%, -50%) rotate(0deg); }
        100% { transform: translate(-50%, -50%) rotate(360deg); }
      }
      
      .ingot-screen {
        min-height: 100%;
        display: flex;
        flex-direction: column;
        padding: 0;
        background: radial-gradient(circle at 50% 40%, rgba(230,92,0,0.1) 0%, rgba(15,15,15,1) 75%);
        position: relative;
        overflow-y: auto;
        overflow-x: hidden;
      }
      
      .ingot-header {
        text-align: center;
        padding: 24px 20px 8px;
        flex-shrink: 0;
      }
      .ingot-shavings-label {
        font-size: 11px;
        color: rgba(255,255,255,0.3);
        letter-spacing: 2px;
        text-transform: uppercase;
      }
      .ingot-shavings-value {
        font-family: 'Unbounded', sans-serif;
        font-size: 44px;
        font-weight: 800;
        background: linear-gradient(180deg, #FFE55C 0%, #FFD700 40%, #FF8C00 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(0 3px 10px rgba(255,160,0,0.5));
        line-height: 1;
        margin-bottom: 6px;
      }
      .ingot-info-line {
        font-size: 12px;
        color: rgba(255,255,255,0.6);
      }
      .ingot-info-line strong { color: #fff; font-weight: 700; }
      
      .ingot-core {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        min-height: 260px;
        flex-shrink: 0;
      }
      
      .ingot-float-wrapper {
        animation: ingotFloat 4s ease-in-out infinite;
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .ingot-float-wrapper.tap-active {
        animation: tapBounce 0.18s ease-out;
      }
      .ingot-float-wrapper.shaking {
        animation: shake 0.5s ease-in-out;
      }
      
      .ingot-image-container {
        width: 180px;
        height: 180px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        position: relative;
      }
      
      .ingot-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        animation: ingotGlow 2.5s ease-in-out infinite;
      }
      
      .ingot-fallback {
        width: 160px;
        height: 160px;
        border-radius: 32px;
        background: linear-gradient(135deg, #B87333 0%, #FFD700 40%, #FF8C00 70%, #8B4513 100%);
        box-shadow: 0 0 35px rgba(255,140,0,0.6), 0 0 70px rgba(255,80,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 70px;
      }
      
      .ingot-shadow {
        width: 100px;
        height: 16px;
        background: radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%);
        border-radius: 50%;
        margin-top: 8px;
        animation: shadowPulse 4s ease-in-out infinite;
      }
      
      .tap-particle {
        position: absolute;
        font-family: 'Unbounded', sans-serif;
        font-weight: 800;
        font-size: 18px;
        color: #FFD700;
        pointer-events: none;
        z-index: 10;
        text-shadow: 0 0 10px rgba(255,180,0,0.9);
        animation: textFloatUp 0.7s ease-out forwards;
      }
      .tap-spark {
        position: absolute;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #FF8C00;
        box-shadow: 0 0 6px #FFD700;
        pointer-events: none;
        z-index: 9;
        animation: sparkFly 0.5s ease-out forwards;
      }
      
      .ingot-energy-divider {
        width: 100%;
        padding: 0 20px;
        flex-shrink: 0;
      }
      .ingot-energy-bar-outer {
        width: 100%;
        height: 5px;
        background: rgba(255,255,255,0.05);
        border-radius: 10px;
        overflow: hidden;
      }
      .ingot-energy-bar-inner {
        height: 100%;
        border-radius: 10px;
        background: linear-gradient(90deg, #3A8CFF, #00D4FF);
        box-shadow: 0 0 10px rgba(0,180,255,0.5);
        transition: width 0.4s ease;
      }
      
      .ingot-bottom {
        padding: 16px 16px 24px;
        flex-shrink: 0;
      }
      .ingot-goal-title {
        font-family: 'Unbounded', sans-serif;
        font-size: 13px;
        font-weight: 700;
        color: rgba(255,255,255,0.7);
        text-align: center;
        margin-bottom: 14px;
        letter-spacing: 1px;
      }
      .ingot-goal-title strong { color: #FFD700; }
      
      .ingot-progress-list { display: flex; flex-direction: column; gap: 10px; }
      .ingot-progress-row { display: flex; align-items: center; gap: 10px; }
      .ingot-progress-icon { font-size: 17px; width: 22px; text-align: center; flex-shrink: 0; }
      .ingot-progress-info { flex: 1; min-width: 0; }
      .ingot-progress-header {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: rgba(255,255,255,0.6);
        margin-bottom: 4px;
        font-weight: 500;
      }
      .ingot-progress-header span:last-child {
        color: rgba(255,255,255,0.8);
        font-weight: 600;
      }
      .ingot-progress-bar-outer {
        width: 100%;
        height: 12px;
        background: rgba(255,255,255,0.05);
        border-radius: 10px;
        overflow: hidden;
      }
      .ingot-progress-bar-inner {
        height: 100%;
        border-radius: 10px;
        transition: width 0.5s ease;
      }
      .ingot-progress-bar-inner.shavings {
        background: linear-gradient(90deg, #FFD700, #FFA500);
        box-shadow: 0 0 12px rgba(255,180,0,0.5);
      }
      .ingot-progress-bar-inner.ingot {
        background: linear-gradient(90deg, #C0C0C0, #E0E0E0);
        box-shadow: 0 0 8px rgba(200,200,200,0.3);
      }
      .ingot-progress-bar-inner.xp {
        background: linear-gradient(90deg, #FF4500, #FF8C00);
        box-shadow: 0 0 12px rgba(255,80,0,0.5);
      }
      
      .ingot-upgrade-btn {
        display: block;
        width: 100%;
        padding: 20px;
        border: none;
        border-radius: 60px;
        font-family: 'Unbounded', sans-serif;
        font-weight: 800;
        font-size: 17px;
        letter-spacing: 2px;
        cursor: pointer;
        text-transform: uppercase;
        background: linear-gradient(135deg, #FF3D00 0%, #FF6D00 40%, #FFD700 100%);
        color: #000;
        animation: pulseUpgrade 2s ease-in-out infinite;
        margin-top: 4px;
      }
      .ingot-upgrade-btn:active { transform: scale(0.95) !important; }
      .ingot-upgrade-btn:disabled { opacity: 0.3; cursor: not-allowed; animation: none; }
      
      .ingot-max-msg {
        font-family: 'Unbounded', sans-serif;
        font-size: 16px;
        font-weight: 800;
        color: #FFD700;
        text-align: center;
        padding: 24px;
      }
      
      .evolution-flash {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: #fff;
        z-index: 9999;
        pointer-events: none;
        animation: screenFlash 0.6s ease-out forwards;
      }
      .evolution-overlay {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0,0,0,0.85);
        backdrop-filter: blur(10px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: screenFlash 0.4s ease-out reverse;
      }
      .evolution-card {
        background: radial-gradient(circle at 50% 0%, rgba(255,140,0,0.2) 0%, rgba(20,20,20,0.95) 70%);
        border: 1px solid rgba(255,180,0,0.3);
        border-radius: 32px;
        padding: 30px 20px;
        text-align: center;
        width: 90%;
        max-width: 340px;
        position: relative;
        overflow: hidden;
      }
      .evolution-rays {
        position: absolute;
        top: 50%; left: 50%;
        width: 300px; height: 300px;
        background: conic-gradient(from 0deg, transparent, rgba(255,180,0,0.1), transparent, rgba(255,100,0,0.1), transparent);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        animation: spinGlow 8s linear infinite;
        pointer-events: none;
      }
      .evolution-icon-container {
        width: 120px;
        height: 120px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 1;
        animation: ingotFloat 2s ease-in-out infinite;
      }
      .evolution-icon-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .evolution-icon-fallback {
        width: 100px;
        height: 100px;
        border-radius: 24px;
        background: linear-gradient(135deg, #B87333, #FFD700, #FF8C00);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 50px;
      }
      .evolution-title {
        font-family: 'Unbounded', sans-serif;
        font-size: 20px;
        font-weight: 800;
        color: #FFD700;
        margin: 12px 0 8px;
        position: relative;
        z-index: 1;
      }
      .evolution-subtitle {
        font-size: 13px;
        color: rgba(255,255,255,0.7);
        margin-bottom: 20px;
        position: relative;
        z-index: 1;
        line-height: 1.5;
      }
      .evolution-close-btn {
        background: linear-gradient(135deg, #FFD700, #FF8C00);
        color: #000;
        border: none;
        padding: 14px 32px;
        border-radius: 50px;
        font-weight: 800;
        font-size: 15px;
        cursor: pointer;
        position: relative;
        z-index: 1;
      }
    </style>
  `;
  
  // ===== HTML =====
  html += `<div class="ingot-screen">`;
  
  // Верх
  html += `
    <div class="ingot-header">
      <div class="ingot-shavings-label">Кузнечная стружка</div>
      <div class="ingot-shavings-value" id="ingotShavingsDisplay">${shavings}</div>
      <div class="ingot-info-line">
        <strong>${ingotData.name}</strong> (Ур. ${state.player.level}) · ${ingotData.era}
      </div>
    </div>
  `;
  
  // Центр
  html += `
    <div class="ingot-core" id="ingotCoreArea">
      <div class="ingot-float-wrapper" id="ingotFloatWrapper">
        <div class="ingot-image-container" id="ingotImageContainer">
          <img class="ingot-image" id="ingotImage" src="${ingotData.image}" alt="${ingotData.name}" onerror="this.style.display='none';document.getElementById('ingotFallback').style.display='flex';" />
          <div class="ingot-fallback" id="ingotFallback" style="display:none;">${ingotData.icon}</div>
        </div>
        <div class="ingot-shadow"></div>
      </div>
    </div>
  `;
  
  // Энергия
  html += `
    <div class="ingot-energy-divider">
      <div class="ingot-energy-bar-outer">
        <div class="ingot-energy-bar-inner" id="ingotEnergyBar" style="width:${energyPct}%;"></div>
      </div>
    </div>
  `;
  
  // Низ
  html += `<div class="ingot-bottom">`;
  
  if (!nextIngot) {
    html += `<div class="ingot-max-msg">🏆 Максимальный уровень</div>`;
  } else if (locked) {
    const canUpgrade = shavings >= nextIngot.shavingsCost &&
      (!nextIngot.ingotCost || Object.entries(nextIngot.ingotCost).every(([id, r]) => (state.ingots[id] || 0) >= r));
    
    if (canUpgrade) {
      html += `<button class="ingot-upgrade-btn" id="performUpgradeBtn">⚡ ПЕРЕПЛАВИТЬ СЛИТОК</button>`;
    } else {
      html += `<div class="ingot-goal-title">ЦЕЛЬ: ЭВОЛЮЦИЯ ДО <strong>${nextIngot.name}</strong> (Ур. ${state.player.level + 1})</div>`;
      html += `<div class="ingot-progress-list">`;
      html += buildProgressRow('✨', 'Стружка', shavings, nextIngot.shavingsCost, 'shavings');
      if (nextIngot.ingotCost) {
        for (let id in nextIngot.ingotCost) {
          const ing = CONFIG_ITEMS[id];
          html += buildProgressRow(ing?.icon || '📦', ing?.name || id, state.ingots[id] || 0, nextIngot.ingotCost[id], 'ingot');
        }
      }
      html += buildProgressRow('🔥', 'Опыт профиля', state.player.xp, nextXP, 'xp');
      html += `</div>`;
    }
  } else {
    html += `<div class="ingot-goal-title">ЦЕЛЬ: ЭВОЛЮЦИЯ ДО <strong>${nextIngot.name}</strong> (Ур. ${state.player.level + 1})</div>`;
    html += `<div class="ingot-progress-list">`;
    html += buildProgressRow('✨', 'Стружка', shavings, nextIngot.shavingsCost, 'shavings');
    if (nextIngot.ingotCost) {
      for (let id in nextIngot.ingotCost) {
        const ing = CONFIG_ITEMS[id];
        html += buildProgressRow(ing?.icon || '📦', ing?.name || id, state.ingots[id] || 0, nextIngot.ingotCost[id], 'ingot');
      }
    }
    html += buildProgressRow('🔥', 'Опыт профиля', state.player.xp, nextXP, 'xp');
    html += `</div>`;
  }
  
  html += `</div></div>`;
  container.innerHTML = html;
  
  // Запуск живого обновления
  startUIUpdates();
  
  // ===== ОБРАБОТЧИКИ =====
  setTimeout(() => {
    const wrapper = document.getElementById('ingotFloatWrapper');
    const coreArea = document.getElementById('ingotCoreArea');
    const imageContainer = document.getElementById('ingotImageContainer');
    
    if (imageContainer && coreArea) {
      imageContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const result = tapIngot();
        if (!result.success) {
          import('./ui.js').then(ui => ui.showToast(result.message, '⚡'));
          return;
        }
        
        if (wrapper) {
          wrapper.classList.remove('tap-active');
          void wrapper.offsetWidth;
          wrapper.classList.add('tap-active');
        }
        
        // МГНОВЕННОЕ обновление счётчика стружки
        const shavingsDisplay = document.getElementById('ingotShavingsDisplay');
        if (shavingsDisplay) {
          shavingsDisplay.textContent = result.shavings;
        }
        
        const particle = document.createElement('span');
        particle.className = 'tap-particle';
        particle.textContent = '+' + result.tapPower;
        const rect = imageContainer.getBoundingClientRect();
        const coreRect = coreArea.getBoundingClientRect();
        particle.style.left = (rect.left + rect.width / 2 - coreRect.left - 24 + (Math.random() - 0.5) * 40) + 'px';
        particle.style.top = (rect.top - coreRect.top) + 'px';
        coreArea.appendChild(particle);
        setTimeout(() => particle.remove(), 700);
        
        for (let i = 0; i < 4; i++) {
          const spark = document.createElement('div');
          spark.className = 'tap-spark';
          spark.style.left = (rect.left + rect.width / 2 - coreRect.left) + 'px';
          spark.style.top = (rect.top + rect.height / 2 - coreRect.top) + 'px';
          const angle = Math.random() * Math.PI * 2;
          const dist = 25 + Math.random() * 35;
          spark.style.setProperty('--sx', Math.cos(angle) * dist + 'px');
          spark.style.setProperty('--sy', Math.sin(angle) * dist + 'px');
          coreArea.appendChild(spark);
          setTimeout(() => spark.remove(), 500);
        }
      });
    }
    
    const upgradeBtn = document.getElementById('performUpgradeBtn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => {
        const result = performUpgrade();
        if (!result.success) {
          import('./ui.js').then(ui => ui.showToast(result.message, '⚠️'));
          return;
        }
        
        if (wrapper) {
          wrapper.classList.add('shaking');
          setTimeout(() => wrapper.classList.remove('shaking'), 500);
        }
        
        const flash = document.createElement('div');
        flash.className = 'evolution-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 600);
        
        setTimeout(() => {
          showEvolutionModal(result.oldIngot, result.newIngot);
        }, 300);
      });
    }
  }, 10);
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function buildProgressRow(icon, label, current, needed, cssClass) {
  const pct = Math.min(100, (current / needed) * 100);
  return `
    <div class="ingot-progress-row">
      <span class="ingot-progress-icon">${icon}</span>
      <div class="ingot-progress-info">
        <div class="ingot-progress-header"><span>${label}</span><span>${current} / ${needed}</span></div>
        <div class="ingot-progress-bar-outer">
          <div class="ingot-progress-bar-inner ${cssClass}" style="width:${pct}%;"></div>
        </div>
      </div>
    </div>
  `;
}

function updateIngotUI() {
  const display = document.getElementById('ingotShavingsDisplay');
  const bar = document.getElementById('ingotEnergyBar');
  if (display) display.textContent = ingotState.shavings;
  if (bar) bar.style.width = (ingotState.tapEnergy / ingotState.maxTapEnergy * 100) + '%';
}

// ========== ОКНО ЭВОЛЮЦИИ ==========
function showEvolutionModal(oldData, newData) {
  const overlay = document.createElement('div');
  overlay.className = 'evolution-overlay';
  overlay.innerHTML = `
    <div class="evolution-card">
      <div class="evolution-rays"></div>
      <div class="evolution-icon-container">
        <img class="evolution-icon-img" src="${newData.image}" alt="${newData.name}" onerror="this.style.display='none';document.getElementById('evoFallback').style.display='flex';" />
        <div class="evolution-icon-fallback" id="evoFallback" style="display:none;">${newData.icon}</div>
      </div>
      <div class="evolution-title">ЭВОЛЮЦИЯ СЛИТКА!</div>
      <div class="evolution-subtitle">
        <strong>${oldData.name}</strong> → <strong>${newData.name}</strong><br>
        Уровень ${newData.level} · ${newData.era}
      </div>
      <button class="evolution-close-btn" id="evolutionCloseBtn">ПРОДОЛЖИТЬ</button>
    </div>
  `;
  document.body.appendChild(overlay);
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.id === 'evolutionCloseBtn') {
      overlay.remove();
      stopUIUpdates();
      import('./ui.js').then(ui => ui.renderCurrentTab());
    }
  });
}

export { INGOT_LEVELS };
