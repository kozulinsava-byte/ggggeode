// ========== INGOT МОДУЛЬ: СЛИТОК-КЛИКЕР ==========
import { CONFIG_ITEMS } from './config.js';
import { getPlayerState, addXP, saveGame } from './core.js';

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
  
  // Стили анимации
  html += `
    <style>
      @keyframes ingotFloat {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }
      @keyframes ingotTapFlash {
        0% { transform: scale(1); filter: brightness(1); }
        50% { transform: scale(1.08); filter: brightness(1.4); }
        100% { transform: scale(1); filter: brightness(1); }
      }
      .ingot-tap-active {
        animation: ingotTapFlash 0.15s ease-out;
      }
      .ingot-float {
        animation: ingotFloat 3s ease-in-out infinite;
      }
      .ingot-energy-bar {
        height: 8px;
        border-radius: 10px;
        background: linear-gradient(90deg, #4A9CFF, #00BFFF);
        transition: width 0.3s ease;
        box-shadow: 0 0 10px rgba(0, 191, 255, 0.4);
      }
      .ingot-upgrade-btn {
        background: linear-gradient(135deg, #FF4500, #FFD700);
        color: #000;
        border: none;
        padding: 16px;
        border-radius: 60px;
        font-weight: 800;
        font-size: 16px;
        cursor: pointer;
        width: 100%;
        box-shadow: 0 4px 25px rgba(255, 100, 0, 0.5);
        transition: all 0.2s;
        letter-spacing: 1px;
      }
      .ingot-upgrade-btn:active {
        transform: scale(0.94);
        box-shadow: 0 4px 40px rgba(255, 100, 0, 0.8);
      }
      .ingot-upgrade-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        box-shadow: none;
      }
      .ingot-requirement-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 12px;
      }
      .ingot-requirement-row.met {
        color: #50C878;
      }
      .ingot-requirement-row.unmet {
        color: #FF4444;
      }
    </style>
  `;
  
  html += `<div class="section-title">⚒️ Слиток Кузнеца</div>`;
  
  // Карточка слитка с анимацией
  html += `
    <div class="card" style="text-align:center; padding:30px 20px;">
      <div class="ingot-float" id="ingotIcon" style="font-size:90px; cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent; transition: transform 0.1s;">
        ${ingotData.icon}
      </div>
      <div style="font-family:'Unbounded',sans-serif; font-size:20px; font-weight:700; color:var(--accent-gold); margin-top:10px;">
        ${ingotData.name}
      </div>
      <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
        Уровень ${state.player.level} · ${ingotData.era}
      </div>
      
      <div style="margin-top:20px; background:rgba(0,0,0,0.2); border-radius:16px; padding:14px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-secondary); margin-bottom:6px;">
          <span>⚡ Энергия тапов</span>
          <span id="ingotEnergyText">${energy}/${maxEnergy}</span>
        </div>
        <div style="background:rgba(255,255,255,0.05); height:8px; border-radius:10px; overflow:hidden;">
          <div class="ingot-energy-bar" id="ingotEnergyBar" style="width:${energyPercent}%;"></div>
        </div>
      </div>
      
      <div style="margin-top:12px; font-size:28px; font-weight:700; color:#FFD700;" id="ingotShavingsDisplay">
        ✨ ${shavings} стружки
      </div>
      <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">
        Тапай по слитку, чтобы добыть стружку
      </div>
    </div>
  `;
  
  // Карточка переплавки
  html += `
    <div class="card" style="text-align:center;" id="ingotUpgradeCard">
      <div style="font-family:'Unbounded',sans-serif; font-size:16px; font-weight:700; margin-bottom:12px; color:${locked ? '#FF4444' : 'var(--accent-gold)'};">
        ${locked ? '🔒 ОПЫТ ЗАПОЛНЕН!' : '🔥 Переплавка Слитка'}
      </div>
  `;
  
  if (locked) {
    const nextIngot = getIngotDataForLevel(state.player.level + 1);
    
    if (nextIngot) {
      html += `
        <div style="font-size:13px; color:var(--text-secondary); margin-bottom:14px;">
          Следующий уровень: <strong>${nextIngot.name}</strong> ${nextIngot.icon}
        </div>
        
        <div style="background:rgba(0,0,0,0.2); border-radius:16px; padding:14px; margin-bottom:14px; text-align:left;">
          <div style="font-weight:700; font-size:13px; margin-bottom:10px; color:var(--text-primary);">Требования для переплавки:</div>
          
          <div class="ingot-requirement-row ${shavings >= nextIngot.shavingsCost ? 'met' : 'unmet'}">
            <span>✨ Кузнечная стружка</span>
            <span>${shavings}/${nextIngot.shavingsCost}</span>
          </div>
      `;
      
      if (nextIngot.ingotCost) {
        for (let ingId in nextIngot.ingotCost) {
          const required = nextIngot.ingotCost[ingId];
          const owned = state.ingots[ingId] || 0;
          const met = owned >= required;
          const ingName = CONFIG_ITEMS[ingId]?.name || ingId;
          const ingIcon = CONFIG_ITEMS[ingId]?.icon || '📦';
          
          html += `
            <div class="ingot-requirement-row ${met ? 'met' : 'unmet'}">
              <span>${ingIcon} ${ingName}</span>
              <span>${owned}/${required}</span>
            </div>
          `;
        }
      }
      
      html += `</div>`;
      
      const canUpgrade = shavings >= nextIngot.shavingsCost && 
        (!nextIngot.ingotCost || Object.entries(nextIngot.ingotCost).every(([id, req]) => (state.ingots[id] || 0) >= req));
      
      html += `
        <button class="ingot-upgrade-btn" id="performUpgradeBtn" ${canUpgrade ? '' : 'disabled'}>
          ⚡ ПЕРЕПЛАВИТЬ СЛИТОК
        </button>
      `;
    } else {
      html += `
        <div style="font-size:14px; color:var(--accent-gold); padding:20px;">
          🏆 Максимальный уровень достигнут!
        </div>
      `;
    }
  } else {
    const nextLevelXP = getNextLevelXP(state.player.level);
    const progress = state.player.xp;
    const progressPercent = (progress / nextLevelXP) * 100;
    
    html += `
      <div style="background:rgba(0,0,0,0.2); border-radius:16px; padding:14px; margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-secondary); margin-bottom:6px;">
          <span>Прогресс опыта</span>
          <span>${progress}/${nextLevelXP} XP</span>
        </div>
        <div style="background:rgba(255,255,255,0.05); height:8px; border-radius:10px; overflow:hidden;">
          <div style="width:${progressPercent}%; height:100%; background:linear-gradient(90deg, var(--accent-gold), var(--accent-orange)); border-radius:10px; transition:width 0.5s; box-shadow:0 0 10px rgba(255,215,0,0.4);"></div>
        </div>
      </div>
      <div style="font-size:12px; color:var(--text-muted);">
        Наберите ${nextLevelXP} XP для разблокировки переплавки
      </div>
    `;
  }
  
  html += `</div>`;
  
  container.innerHTML = html;
  
  // Обработчик тапа по слитку
  setTimeout(() => {
    const ingotIcon = document.getElementById('ingotIcon');
    if (ingotIcon) {
      ingotIcon.addEventListener('click', (e) => {
        e.preventDefault();
        const result = tapIngot();
        
        if (result.success) {
          ingotIcon.classList.remove('ingot-tap-active');
          void ingotIcon.offsetWidth;
          ingotIcon.classList.add('ingot-tap-active');
          
          updateIngotUI();
        } else {
          import('./ui.js').then(ui => ui.showToast(result.message, '⚡'));
        }
      });
    }
    
    // Обработчик кнопки переплавки
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
    shavingsDisplay.textContent = `✨ ${ingotState.shavings} стружки`;
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
