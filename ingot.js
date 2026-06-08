// ========== INGOT МОДУЛЬ: СЛИТОК-КЛИКЕР ==========
import { CONFIG_ITEMS } from './config.js';
import { getPlayerState, saveGame } from './core.js';

// ========== ДАННЫЕ ПРОГРЕССИИ СЛИТКА ==========
const INGOT_LEVELS = {
  1: {
    level: 1,
    name: 'Ржавый Слиток',
    icon: '🪨',
    era: 'Эпоха Шахт',
    shavingsCost: 50,
    ingotCost: { copper: 3 }
  },
  2: {
    level: 2,
    name: 'Чугунный Слиток',
    icon: '⚫',
    era: 'Эпоха Шахт',
    shavingsCost: 100,
    ingotCost: { iron: 2, coal: 2 }
  },
  3: {
    level: 3,
    name: 'Медный Слиток',
    icon: '🟫',
    era: 'Эпоха Шахт',
    shavingsCost: 200,
    ingotCost: { copper: 5, tin: 2 }
  },
  4: {
    level: 4,
    name: 'Железный Слиток',
    icon: '⬜',
    era: 'Эпоха Шахт',
    shavingsCost: 350,
    ingotCost: { iron: 5, nickel: 2, coal: 3 }
  },
  5: {
    level: 5,
    name: 'Бронзовый Слиток',
    icon: '🟤',
    era: 'Эпоха Джунглей',
    shavingsCost: 500,
    ingotCost: { vinebronze: 2, woodalloy: 1 }
  },
  6: {
    level: 6,
    name: 'Стальной Слиток',
    icon: '🔩',
    era: 'Эпоха Джунглей',
    shavingsCost: 750,
    ingotCost: { iron: 4, coal: 4, nickel: 2 }
  },
  7: {
    level: 7,
    name: 'Изумрудный Слиток',
    icon: '💚',
    era: 'Эпоха Джунглей',
    shavingsCost: 1000,
    ingotCost: { emeraldsteel: 2, biocopper: 3 }
  },
  8: {
    level: 8,
    name: 'Окисленный Слиток',
    icon: '🥈',
    era: 'Эпоха Джунглей',
    shavingsCost: 1400,
    ingotCost: { oxidizedsilver: 2, vinebronze: 3, woodalloy: 2 }
  },
  9: {
    level: 9,
    name: 'Био-Стальной Слиток',
    icon: '🧬',
    era: 'Эпоха Джунглей',
    shavingsCost: 1800,
    ingotCost: { biocopper: 4, emeraldsteel: 2, woodalloy: 3 }
  },
  10: {
    level: 10,
    name: 'Вольфрамовый Слиток',
    icon: '⭐',
    era: 'Пояс Астероидов',
    shavingsCost: 2500,
    ingotCost: { starchrome: 2, titanium: 2, cobalt: 1 }
  },
  11: {
    level: 11,
    name: 'Титановый Слиток',
    icon: '🔷',
    era: 'Пояс Астероидов',
    shavingsCost: 3500,
    ingotCost: { titanium: 4, starchrome: 3, lunarsilver: 2 }
  },
  12: {
    level: 12,
    name: 'Кобальтовый Слиток',
    icon: '🔵',
    era: 'Пояс Астероидов',
    shavingsCost: 5000,
    ingotCost: { cobalt: 4, titanium: 3, platincon: 2 }
  },
  13: {
    level: 13,
    name: 'Иридиевый Слиток',
    icon: '💠',
    era: 'Далёкий Космос',
    shavingsCost: 7000,
    ingotCost: { iridium: 2, platincon: 4, lunarsilver: 3 }
  },
  14: {
    level: 14,
    name: 'Платиновый Слиток',
    icon: '💎',
    era: 'Далёкий Космос',
    shavingsCost: 10000,
    ingotCost: { platincon: 6, iridium: 3, starchrome: 4 }
  },
  15: {
    level: 15,
    name: 'Космониумный Слиток',
    icon: '🌈',
    era: 'Далёкий Космос',
    shavingsCost: 15000,
    ingotCost: { cosmonium: 1, nebulite: 2, singular: 2, meteor_gold: 3 }
  }
};

// ========== СОСТОЯНИЕ СЛИТКА ==========
let ingotState = {
  shavings: 0,
  tapEnergy: 500,
  maxTapEnergy: 500,
  lastEnergyRegen: Date.now(),
  levelLocked: false
};

// ========== ИНИЦИАЛИЗАЦИЯ ИЗ СОХРАНЕНИЯ ==========
export function initIngotState(savedData) {
  if (savedData) {
    ingotState.shavings = savedData.ingotShavings || 0;
    ingotState.tapEnergy = savedData.tapEnergy || 500;
    ingotState.maxTapEnergy = savedData.maxTapEnergy || 500;
    ingotState.lastEnergyRegen = savedData.lastEnergyRegen || Date.now();
    ingotState.levelLocked = savedData.levelLocked || false;
  }
}

// ========== СБРОС СОСТОЯНИЯ ==========
export function resetIngotState() {
  ingotState.shavings = 0;
  ingotState.tapEnergy = 500;
  ingotState.maxTapEnergy = 500;
  ingotState.lastEnergyRegen = Date.now();
  ingotState.levelLocked = false;
}

// ========== ЭКСПОРТ СОСТОЯНИЯ ДЛЯ СОХРАНЕНИЯ ==========
export function getIngotSaveData() {
  return {
    ingotShavings: ingotState.shavings,
    tapEnergy: ingotState.tapEnergy,
    maxTapEnergy: ingotState.maxTapEnergy,
    lastEnergyRegen: ingotState.lastEnergyRegen,
    levelLocked: ingotState.levelLocked
  };
}

// ========== ГЕТТЕРЫ ==========
export function getShavings() {
  return ingotState.shavings;
}

export function getTapEnergy() {
  return ingotState.tapEnergy;
}

export function getMaxTapEnergy() {
  return ingotState.maxTapEnergy;
}

export function isLevelLocked() {
  return ingotState.levelLocked;
}

export function getCurrentIngotData() {
  const state = getPlayerState();
  const level = state.player.level;
  return INGOT_LEVELS[level] || INGOT_LEVELS[1];
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

// ========== ТАП ПО СЛИТКУ ==========
export function tapIngot() {
  if (ingotState.tapEnergy <= 0) {
    return { success: false, message: 'Нет энергии! Подождите восстановления.' };
  }
  
  ingotState.tapEnergy--;
  ingotState.shavings++;
  
  saveGame();
  
  return { success: true, shavings: ingotState.shavings, energy: ingotState.tapEnergy };
}

// ========== ПРОВЕРКА ЗАСЛОНКИ ==========
export function checkLevelLock() {
  const state = getPlayerState();
  const currentLevel = state.player.level;
  const nextLevelXP = getNextLevelXP(currentLevel);
  
  if (state.player.xp >= nextLevelXP && !ingotState.levelLocked) {
    state.player.xp = nextLevelXP;
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

// ========== ПЕРЕПЛАВКА СЛИТКА ==========
export function performUpgrade() {
  const state = getPlayerState();
  
  if (!ingotState.levelLocked) {
    return { success: false, message: 'Опыт ещё не заполнен!' };
  }
  
  const currentLevel = state.player.level;
  const ingotData = INGOT_LEVELS[currentLevel];
  
  if (!ingotData) {
    return { success: false, message: 'Максимальный уровень достигнут!' };
  }
  
  if (ingotState.shavings < ingotData.shavingsCost) {
    return { success: false, message: `Недостаточно стружки! Нужно ${ingotData.shavingsCost}.` };
  }
  
  if (ingotData.ingotCost) {
    for (let ingId in ingotData.ingotCost) {
      const required = ingotData.ingotCost[ingId];
      const owned = state.ingots[ingId] || 0;
      if (owned < required) {
        const ingName = CONFIG_ITEMS[ingId]?.name || ingId;
        return { success: false, message: `Недостаточно ${ingName}! Нужно ${required}.` };
      }
    }
  }
  
  ingotState.shavings -= ingotData.shavingsCost;
  
  if (ingotData.ingotCost) {
    for (let ingId in ingotData.ingotCost) {
      state.ingots[ingId] -= ingotData.ingotCost[ingId];
    }
  }
  
  state.player.level++;
  state.player.xp = 0;
  ingotState.levelLocked = false;
  
  saveGame();
  
  return { 
    success: true, 
    newLevel: state.player.level, 
    ingotName: ingotData.name, 
    ingotIcon: ingotData.icon 
  };
}

// ========== ПОЛНАЯ ОТРИСОВКА ВКЛАДКИ СЛИТКА ==========
export function renderIngotScreen(container) {
  const state = getPlayerState();
  const ingotData = getCurrentIngotData();
  const energy = ingotState.tapEnergy;
  const maxEnergy = ingotState.maxTapEnergy;
  const shavings = ingotState.shavings;
  const locked = ingotState.levelLocked;
  
  const energyPercent = (energy / maxEnergy) * 100;
  
  let html = '';
  
  // ===== CSS-СТИЛИ =====
  html += `
    <style>
      @keyframes ingotFloat {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        25% { transform: translateY(-12px) rotate(0.5deg); }
        75% { transform: translateY(-6px) rotate(-0.5deg); }
      }
      @keyframes ingotGlow {
        0%, 100% { filter: drop-shadow(0 0 30px rgba(255,180,0,0.6)) drop-shadow(0 0 60px rgba(255,120,0,0.3)); }
        50% { filter: drop-shadow(0 0 45px rgba(255,180,0,0.9)) drop-shadow(0 0 80px rgba(255,120,0,0.5)); }
      }
      @keyframes ingotTapFlash {
        0% { transform: scale(1); }
        30% { transform: scale(1.12); }
        100% { transform: scale(1); }
      }
      @keyframes fadeUp {
        0% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-60px) scale(1.5); }
      }
      @keyframes pulseUpgrade {
        0%, 100% { box-shadow: 0 0 25px rgba(255,80,0,0.6), 0 0 50px rgba(255,120,0,0.3); }
        50% { box-shadow: 0 0 45px rgba(255,80,0,0.9), 0 0 90px rgba(255,120,0,0.6); }
      }
      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      
      .ingot-screen {
        min-height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 16px 20px;
        background: radial-gradient(circle at 50% 30%, rgba(230,92,0,0.15) 0%, rgba(15,15,15,1) 80%);
      }
      
      .ingot-header {
        width: 100%;
        text-align: center;
        padding: 20px 0 10px;
      }
      
      .ingot-title {
        font-family: 'Unbounded', sans-serif;
        font-size: 14px;
        font-weight: 700;
        color: rgba(255,255,255,0.5);
        letter-spacing: 2px;
        text-transform: uppercase;
      }
      
      .ingot-shavings-display {
        font-family: 'Unbounded', sans-serif;
        font-size: 36px;
        font-weight: 800;
        background: linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(0 2px 8px rgba(255,180,0,0.4));
        margin: 4px 0;
      }
      
      .ingot-shavings-label {
        font-size: 10px;
        color: rgba(255,255,255,0.4);
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      
      .ingot-core-area {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        width: 100%;
        min-height: 260px;
      }
      
      .ingot-float-container {
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        animation: ingotFloat 4s ease-in-out infinite;
        position: relative;
        z-index: 2;
      }
      
      .ingot-float-container.tap-active {
        animation: ingotTapFlash 0.15s ease-out;
      }
      
      .ingot-icon-display {
        font-size: 110px;
        display: block;
        line-height: 1;
        animation: ingotGlow 2.5s ease-in-out infinite;
      }
      
      .ingot-name-display {
        font-family: 'Unbounded', sans-serif;
        font-size: 15px;
        font-weight: 700;
        color: rgba(255,255,255,0.8);
        text-align: center;
        margin-top: 6px;
      }
      
      .ingot-era-display {
        font-size: 10px;
        color: rgba(255,255,255,0.4);
        text-align: center;
        letter-spacing: 1px;
      }
      
      .tap-particle {
        position: absolute;
        font-family: 'Unbounded', sans-serif;
        font-weight: 800;
        font-size: 16px;
        color: #FFD700;
        pointer-events: none;
        z-index: 10;
        text-shadow: 0 0 8px rgba(255,180,0,0.8);
        animation: fadeUp 0.6s ease-out forwards;
      }
      
      .ingot-energy-section {
        width: 100%;
        margin-bottom: 16px;
      }
      
      .ingot-energy-header {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: rgba(255,255,255,0.5);
        margin-bottom: 4px;
        letter-spacing: 0.5px;
      }
      
      .ingot-energy-bar-outer {
        width: 100%;
        height: 6px;
        background: rgba(255,255,255,0.06);
        border-radius: 10px;
        overflow: hidden;
      }
      
      .ingot-energy-bar-inner {
        height: 100%;
        border-radius: 10px;
        background: linear-gradient(90deg, #4A9CFF, #00BFFF);
        box-shadow: 0 0 12px rgba(0, 191, 255, 0.5);
        transition: width 0.4s ease;
      }
      
      .ingot-upgrade-section {
        width: 100%;
        margin-top: auto;
        padding-bottom: 10px;
      }
      
      .ingot-upgrade-btn {
        display: block;
        width: 100%;
        padding: 18px;
        border: none;
        border-radius: 60px;
        font-family: 'Unbounded', sans-serif;
        font-weight: 800;
        font-size: 16px;
        letter-spacing: 2px;
        cursor: pointer;
        transition: all 0.3s;
        text-transform: uppercase;
        position: relative;
        overflow: hidden;
        background: linear-gradient(135deg, #FF4500 0%, #FF8C00 30%, #FFD700 100%);
        color: #000;
        animation: pulseUpgrade 2s ease-in-out infinite;
      }
      
      .ingot-upgrade-btn:active {
        transform: scale(0.94);
      }
      
      .ingot-upgrade-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
        animation: none;
      }
      
      .ingot-upgrade-requirements {
        margin-top: 10px;
        text-align: center;
        font-size: 10px;
        color: rgba(255,255,255,0.5);
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
      }
      
      .ingot-upgrade-requirement {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
      }
      
      .ingot-upgrade-requirement.met {
        color: #50C878;
      }
      
      .ingot-upgrade-requirement.unmet {
        color: #FF6B6B;
      }
      
      .ingot-xp-section {
        width: 100%;
        margin-bottom: 16px;
      }
      
      .ingot-xp-label {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        color: rgba(255,255,255,0.5);
        margin-bottom: 4px;
        letter-spacing: 0.5px;
      }
      
      .ingot-xp-bar-outer {
        width: 100%;
        height: 6px;
        background: rgba(255,255,255,0.06);
        border-radius: 10px;
        overflow: hidden;
      }
      
      .ingot-xp-bar-inner {
        height: 100%;
        border-radius: 10px;
        background: linear-gradient(90deg, #FFD700, #FFA500);
        box-shadow: 0 0 12px rgba(255, 180, 0, 0.5);
        transition: width 0.5s ease;
      }
      
      .ingot-next-level-info {
        font-family: 'Unbounded', sans-serif;
        font-size: 13px;
        font-weight: 700;
        color: var(--accent-gold);
        text-align: center;
        margin-bottom: 12px;
      }
      
      .ingot-max-level {
        font-family: 'Unbounded', sans-serif;
        font-size: 16px;
        font-weight: 800;
        color: #FFD700;
        text-align: center;
        padding: 24px;
      }
    </style>
  `;
  
  // ===== HTML =====
  html += `<div class="ingot-screen">`;
  
  // Верхняя панель: стружка
  html += `
    <div class="ingot-header">
      <div class="ingot-title">Кузнечная стружка</div>
      <div class="ingot-shavings-display" id="ingotShavingsDisplay">${shavings}</div>
      <div class="ingot-shavings-label">тапай по слитку</div>
    </div>
  `;
  
  // Центральная зона: Слиток
  html += `
    <div class="ingot-core-area" id="ingotCoreArea">
      <div class="ingot-float-container" id="ingotFloatContainer">
        <span class="ingot-icon-display">${ingotData.icon}</span>
        <div class="ingot-name-display">${ingotData.name}</div>
        <div class="ingot-era-display">Ур. ${state.player.level} · ${ingotData.era}</div>
      </div>
    </div>
  `;
  
  // Полоска энергии
  html += `
    <div class="ingot-energy-section">
      <div class="ingot-energy-header">
        <span>⚡ Энергия</span>
        <span id="ingotEnergyText">${energy}/${maxEnergy}</span>
      </div>
      <div class="ingot-energy-bar-outer">
        <div class="ingot-energy-bar-inner" id="ingotEnergyBar" style="width:${energyPercent}%;"></div>
      </div>
    </div>
  `;
  
  // Секция переплавки / XP
  if (locked) {
    const nextIngot = getIngotDataForLevel(state.player.level + 1);
    
    if (nextIngot) {
      html += `
        <div class="ingot-upgrade-section">
          <div class="ingot-next-level-info">
            Следующий: ${nextIngot.icon} ${nextIngot.name}
          </div>
      `;
      
      const canUpgrade = shavings >= nextIngot.shavingsCost && 
        (!nextIngot.ingotCost || Object.entries(nextIngot.ingotCost).every(([id, req]) => (state.ingots[id] || 0) >= req));
      
      html += `
        <button class="ingot-upgrade-btn" id="performUpgradeBtn" ${canUpgrade ? '' : 'disabled'}>
          ПЕРЕПЛАВИТЬ
        </button>
      `;
      
      // Требования
      html += `<div class="ingot-upgrade-requirements">`;
      
      html += `
        <span class="ingot-upgrade-requirement ${shavings >= nextIngot.shavingsCost ? 'met' : 'unmet'}">
          ✨ ${shavings}/${nextIngot.shavingsCost}
        </span>
      `;
      
      if (nextIngot.ingotCost) {
        for (let ingId in nextIngot.ingotCost) {
          const required = nextIngot.ingotCost[ingId];
          const owned = state.ingots[ingId] || 0;
          const met = owned >= required;
          const ingIcon = CONFIG_ITEMS[ingId]?.icon || '📦';
          
          html += `
            <span class="ingot-upgrade-requirement ${met ? 'met' : 'unmet'}">
              ${ingIcon} ${owned}/${required}
            </span>
          `;
        }
      }
      
      html += `</div></div>`;
    } else {
      html += `<div class="ingot-max-level">🏆 Максимальный уровень</div>`;
    }
  } else {
    const nextLevelXP = getNextLevelXP(state.player.level);
    const progress = state.player.xp;
    const progressPercent = (progress / nextLevelXP) * 100;
    
    html += `
      <div class="ingot-xp-section">
        <div class="ingot-xp-label">
          <span>🔥 Опыт</span>
          <span>${progress}/${nextLevelXP} XP</span>
        </div>
        <div class="ingot-xp-bar-outer">
          <div class="ingot-xp-bar-inner" style="width:${progressPercent}%;"></div>
        </div>
      </div>
    `;
  }
  
  html += `</div>`;
  
  container.innerHTML = html;
  
  // Обработчики событий
  setTimeout(() => {
    const floatContainer = document.getElementById('ingotFloatContainer');
    const coreArea = document.getElementById('ingotCoreArea');
    
    if (floatContainer && coreArea) {
      floatContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const result = tapIngot();
        
        if (result.success) {
          // Анимация тапа
          floatContainer.classList.remove('tap-active');
          void floatContainer.offsetWidth;
          floatContainer.classList.add('tap-active');
          
          // Создание частицы "+1"
          const particle = document.createElement('span');
          particle.className = 'tap-particle';
          particle.textContent = '+1';
          
          const rect = floatContainer.getBoundingClientRect();
          const coreRect = coreArea.getBoundingClientRect();
          
          const x = rect.left + rect.width / 2 - coreRect.left - 20 + (Math.random() - 0.5) * 40;
          const y = rect.top - coreRect.top;
          
          particle.style.left = x + 'px';
          particle.style.top = y + 'px';
          
          coreArea.appendChild(particle);
          
          setTimeout(() => particle.remove(), 600);
          
          updateIngotUI();
        } else {
          import('./ui.js').then(ui => ui.showToast(result.message, '⚡'));
        }
      });
    }
    
    const upgradeBtn = document.getElementById('performUpgradeBtn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => {
        const result = performUpgrade();
        
        if (result.success) {
          import('./ui.js').then(ui => {
            ui.showToast(`🎉 Уровень ${result.newLevel}: ${result.ingotName}!`, result.ingotIcon);
            ui.renderCurrentTab();
          });
        } else {
          import('./ui.js').then(ui => ui.showToast(result.message, '⚠️'));
        }
      });
    }
  }, 10);
}

// ========== ОБНОВЛЕНИЕ UI БЕЗ ПЕРЕРИСОВКИ ==========
function updateIngotUI() {
  const shavingsDisplay = document.getElementById('ingotShavingsDisplay');
  const energyText = document.getElementById('ingotEnergyText');
  const energyBar = document.getElementById('ingotEnergyBar');
  
  if (shavingsDisplay) {
    shavingsDisplay.textContent = ingotState.shavings;
  }
  
  if (energyText) {
    energyText.textContent = `${ingotState.tapEnergy}/${ingotState.maxTapEnergy}`;
  }
  
  if (energyBar) {
    const percent = (ingotState.tapEnergy / ingotState.maxTapEnergy) * 100;
    energyBar.style.width = percent + '%';
  }
}

// ========== ЭКСПОРТ ДЛЯ ВНЕШНИХ МОДУЛЕЙ ==========
export { INGOT_LEVELS };
