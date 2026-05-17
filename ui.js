// ========== UI МОДУЛЬ: ОТРИСОВКА ИНТЕРФЕЙСА ==========
import { CONFIG_ITEMS, CONFIG_GEODES, CONFIG_EXPEDITIONS, LEVELS, STATUSES } from './config.js';
import { playerState, getSerialForCollectible, isLocationCompleted, sellIngot, startExpedition, openBrawlOverlay, eventsManager, saveGame, devGiveXP, devGiveGeodes, devUnlockLocations, devResetGeodes, startSignalGame, exchangeSpecialGeodeForXP, openForge, sendBotNotification } from './core.js';

// DOM-элементы
export const mainContent = document.getElementById('mainContent');
const showcaseOverlay = document.getElementById('showcaseOverlay');
const showcaseContent = document.getElementById('showcaseContent');
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');

// Текущие вкладки
export let currentTab = 'expeditions';
export let inventorySubTab = 'geodes';
export let collectionSubTab = 'encyclopedia';

// ID интервала для живого таймера в модалке
let modalTimerInterval = null;

// ---------- ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ТЕМЫ ----------
function initTheme() {
  const savedTheme = localStorage.getItem('starforge_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('starforge_theme', newTheme);
  
  const btn = document.getElementById('themeProfileBtn');
  if (btn) {
    btn.innerHTML = newTheme === 'dark' ? '🌙 Сменить тему (Светлая)' : '☀️ Сменить тему (Тёмная)';
  }
}

initTheme();

// ---------- УТИЛИТЫ РЕНДЕРИНГА (ЭМОДЗИ-ЗАГЛУШКИ) ----------
export function renderImageToElement(el, src, fallbackIcon, fallbackColor) {
  if (!el) return;
  
  // Сначала показываем эмодзи-заглушку
  el.innerHTML = '';
  const fb = document.createElement('span');
  fb.className = 'fallback-icon';
  fb.textContent = fallbackIcon;
  fb.style.color = fallbackColor || '#FFD700';
  fb.style.fontSize = el.classList.contains('card-icon') ? '40px' : 'inherit';
  el.appendChild(fb);
  
  // Потом пытаемся загрузить картинку
  const img = new Image();
  img.onload = () => {
    el.innerHTML = '';
    const i = document.createElement('img');
    i.src = src;
    i.alt = '';
    el.appendChild(i);
  };
  img.onerror = () => {
    // Оставляем эмодзи-заглушку
  };
  img.src = src;
}

export function renderMysteryPlaceholder(el) {
  if (!el) return;
  el.innerHTML = '<span style="font-size:40px; color:var(--text-muted);">?</span>';
}

export function getGeodeStageImage(geodeId, taps) {
  const g = CONFIG_GEODES[geodeId];
  if (!g) return { imagePath: '', fallbackIcon: '🪨' };
  
  for (let s of g.stages) {
    if (taps >= s.minTaps && taps <= s.maxTaps) {
      return { imagePath: s.imagePath, fallbackIcon: s.fallbackIcon };
    }
  }
  
  return { imagePath: g.stages[0].imagePath, fallbackIcon: g.stages[0].fallbackIcon };
}

export function showToast(msg, emoji = '✨') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>${emoji}</span> ${msg}`;
  c.appendChild(t);
  
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

// ---------- REWARD POPUP ----------
export function showRewardPopup(ingot) {
  const overlay = document.getElementById('rewardPopupOverlay');
  const iconEl = document.getElementById('rewardPopupIcon');
  const nameEl = document.getElementById('rewardPopupName');
  const closeBtn = document.getElementById('rewardPopupClose');
  
  renderImageToElement(iconEl, ingot.imagePath, ingot.icon, ingot.fallbackColor);
  nameEl.textContent = ingot.name;
  
  overlay.classList.add('active');
  
  const closeHandler = () => {
    overlay.classList.remove('active');
    closeBtn.removeEventListener('click', closeHandler);
  };
  closeBtn.addEventListener('click', closeHandler);
}

// ---------- SHOWCASE (ПОЛНОЭКРАННЫЙ ПРОСМОТР) ----------
export function openShowcase(ingotId, isMystery = false) {
  const ingot = CONFIG_ITEMS[ingotId];
  if (!ingot) return;
  
  const owned = playerState.ingots[ingotId] > 0;
  const discovered = playerState.minedStats[ingotId] > 0;
  
  let name = ingot.name;
  let desc = ingot.description;
  let rarity = ingot.rarity;
  let rarityClass = ingot.rarityClass;
  let idHtml = '';

  if (!discovered && !ingot.isCollectible) {
    name = 'Неизвестный материал';
    const locationName = CONFIG_EXPEDITIONS[ingot.location]?.name || 'неизвестной локации';
    desc = `Месторождение: ${locationName}`;
    rarity = '???';
    rarityClass = 'common';
    idHtml = `<div class="showcase-id"><span class="showcase-id-label">Статус</span><span class="showcase-id-value" style="color:var(--text-muted);">НЕ ИЗУЧЕН</span></div>`;
  } else if (!owned && ingot.isCollectible) {
    name = 'Неизвестный Артефакт';
    desc = ingot.location === 'mine' ? 'Глубины Шахт скрывают этот секрет.' : 
           ingot.location === 'jungle' ? 'Джунгли ревностно охраняют эту тайну.' : 
           ingot.location === 'craft' ? 'Создаётся в горниле Великой Переплавки.' : 
           'Пояс Астероидов хранит это сокровище.';
    rarity = '???';
    rarityClass = 'common';
    idHtml = `<div class="showcase-id"><span class="showcase-id-label">Статус</span><span class="showcase-id-value" style="color:var(--text-muted);">НЕ ОТКРЫТ</span></div>`;
  } else {
    idHtml = ingot.isCollectible
      ? `<div class="showcase-serial"><span class="showcase-serial-label">Серийный номер</span><span class="showcase-serial-value">#${getSerialForCollectible(ingotId)}</span></div>`
      : `<div class="showcase-id"><span class="showcase-id-label">Добыто всего</span><span class="showcase-id-value">${playerState.minedStats[ingotId] || 0} ед.</span></div>`;
  }

  let html = `
    <div class="showcase-image" id="showcaseImage"></div>
    <div class="showcase-info">
      <div class="showcase-name">${name}</div>
      <div class="showcase-rarity ${rarityClass}">${rarity}</div>
      ${idHtml}
      <div class="showcase-description">${desc}</div>
      <div class="showcase-count">${owned ? `В наличии: ${playerState.ingots[ingotId]} шт.` : 'Ещё не найден'}</div>
    </div>
  `;
  
  showcaseContent.innerHTML = html;
  
  const imgEl = document.getElementById('showcaseImage');
  if ((!discovered && !ingot.isCollectible) || (!owned && ingot.isCollectible)) {
    renderMysteryPlaceholder(imgEl);
    showcaseContent.style.opacity = '0.8';
  } else {
    renderImageToElement(imgEl, ingot.imagePath, ingot.icon, ingot.fallbackColor);
    showcaseContent.style.opacity = '1';
  }
  
  showcaseOverlay.classList.add('active');
}

export function closeShowcase() {
  showcaseOverlay.classList.remove('active');
}

// ---------- АДМИН-ПАНЕЛЬ ----------
function showAdminPanel() {
  let html = `
    <div class="modal-header">
      <div class="modal-title">🛠️ Админ-панель</div>
      <button class="modal-close" onclick="document.dispatchEvent(new Event('closeModal'))">✕</button>
    </div>
    <div class="modal-content" style="text-align:left;">
      <div style="margin-bottom:12px; font-weight:600; color:var(--accent-gold);">⚡ Быстрые действия</div>
      <button class="btn" id="adminMaxXP" style="margin-bottom:6px;">🌟 Дать 1M XP</button>
      <button class="btn" id="adminUnlockAll" style="margin-bottom:6px;">🔓 Открыть все локации (ур.10)</button>
      <button class="btn" id="adminFillGeodes" style="margin-bottom:6px;">🪨 +10 всех жеод</button>
      <button class="btn" id="adminFillIngots" style="margin-bottom:6px;">✨ +10 всех обычных слитков</button>
      <button class="btn" id="adminFillArtifacts" style="margin-bottom:6px;">💎 +1 всех коллекционных артефактов</button>
      
      <div style="margin:20px 0; font-weight:600; color:var(--accent-gold);">⏱️ Ивенты</div>
      <button class="btn" id="adminTriggerEvent" style="margin-bottom:8px;">🔥 Запустить Переплавку</button>
      <button class="btn" id="adminEndEvent" style="margin-bottom:8px;">❄️ Завершить ивент</button>
      
      <div style="margin:20px 0; font-weight:600; color:var(--accent-gold);">🔧 Отдельные жеоды (+5 шт.)</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
  `;
  
  Object.entries(CONFIG_GEODES).forEach(([id, g]) => {
    html += `<button class="small-btn admin-add-geode" data-geode="${id}" style="font-size:10px;">${g.stages[0].fallbackIcon} ${g.name}</button>`;
  });
  
  html += `
      </div>
      
      <div style="margin:20px 0; font-weight:600; color:var(--accent-gold);">✨ Отдельные слитки (+10 шт.)</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
  `;
  
  Object.entries(CONFIG_ITEMS).filter(([_, i]) => !i.isCollectible).forEach(([id, ing]) => {
    html += `<button class="small-btn admin-add-ingot" data-ingot="${id}" style="font-size:10px;">${ing.icon} ${ing.name}</button>`;
  });
  
  html += `
      </div>
    </div>
  `;
  
  openModal(html);
  
  setTimeout(() => {
    document.getElementById('adminMaxXP')?.addEventListener('click', () => { 
      devGiveXP(); 
      saveGame(); 
      showToast('+1M XP!', '🌟'); 
      closeModal(); 
    });
    
    document.getElementById('adminUnlockAll')?.addEventListener('click', () => { 
      devUnlockLocations(); 
      saveGame(); 
      showToast('Локации открыты (уровень 10)!', '🔓'); 
      closeModal(); 
    });
    
    document.getElementById('adminFillGeodes')?.addEventListener('click', () => { 
      devGiveGeodes(); 
      saveGame(); 
      showToast('+10 жеод всех типов!', '🪨'); 
      closeModal(); 
    });
    
    document.getElementById('adminFillIngots')?.addEventListener('click', () => {
      Object.keys(CONFIG_ITEMS).forEach(id => {
        if (!CONFIG_ITEMS[id].isCollectible) {
          playerState.ingots[id] = (playerState.ingots[id] || 0) + 10;
          playerState.minedStats[id] = (playerState.minedStats[id] || 0) + 10;
        }
      });
      playerState.player.totalIngots += Object.keys(CONFIG_ITEMS).filter(id => !CONFIG_ITEMS[id].isCollectible).length * 10;
      saveGame(); 
      showToast('+10 слитков каждого типа!', '✨'); 
      closeModal(); 
    });
    
    document.getElementById('adminFillArtifacts')?.addEventListener('click', () => {
      Object.keys(CONFIG_ITEMS).forEach(id => {
        if (CONFIG_ITEMS[id].isCollectible && CONFIG_ITEMS[id].location !== 'craft') {
          playerState.ingots[id] = (playerState.ingots[id] || 0) + 1;
          playerState.minedStats[id] = (playerState.minedStats[id] || 0) + 1;
        }
      });
      playerState.player.totalArtifacts += 6;
      saveGame(); 
      showToast('+1 артефакт каждого типа!', '💎'); 
      closeModal(); 
    });
    
    document.getElementById('adminTriggerEvent')?.addEventListener('click', () => {
      eventsManager.triggerGreatSmelt();
      saveGame();
      showToast('Переплавка запущена!', '🔥');
      closeModal();
    });
    
    document.getElementById('adminEndEvent')?.addEventListener('click', () => {
      eventsManager.endEvent();
      saveGame();
      showToast('Ивент завершён!', '❄️');
      closeModal();
    });
    
    document.querySelectorAll('.admin-add-geode').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.geode;
        playerState.geodes[id] = (playerState.geodes[id] || 0) + 5;
        saveGame();
        showToast(`+5 ${CONFIG_GEODES[id].name}`, '🪨');
        closeModal();
      });
    });
    
    document.querySelectorAll('.admin-add-ingot').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.ingot;
        playerState.ingots[id] = (playerState.ingots[id] || 0) + 10;
        playerState.minedStats[id] = (playerState.minedStats[id] || 0) + 10;
        playerState.player.totalIngots += 10;
        saveGame();
        showToast(`+10 ${CONFIG_ITEMS[id].name}`, '✨');
        closeModal();
      });
    });
  }, 50);
}

// ---------- МОДАЛЬНЫЕ ОКНА ----------
export function openModal(html) {
  if (modalTimerInterval) {
    clearInterval(modalTimerInterval);
    modalTimerInterval = null;
  }
  
  modalContent.innerHTML = html;
  modalOverlay.classList.add('active');
  
  modalOverlay.onclick = (e) => {
    if (e.target === modalOverlay) closeModal();
  };
}

export function closeModal() {
  if (modalTimerInterval) {
    clearInterval(modalTimerInterval);
    modalTimerInterval = null;
  }
  
  modalOverlay.classList.remove('active');
  modalContent.innerHTML = '';
}

export function showGeodeModal(geodeId) {
  const g = CONFIG_GEODES[geodeId];
  if (!g) return;
  
  let lootHtml = '';
  if (g.isSpecial) {
    lootHtml = `<div style="text-align:center; padding:20px; color:var(--accent-gold);">✨ Гарантированно содержит один из коллекционных артефактов локации ✨</div>`;
  } else {
    g.lootTable.forEach((e) => {
      const ing = CONFIG_ITEMS[e.ingotId];
      lootHtml += `
        <div class="loot-row">
          <div class="loot-left">
            <div class="loot-icon" id="loot-${e.ingotId}"></div>
            <span>${ing.name}</span>
          </div>
          <div class="loot-chance">${Math.round(e.chance * 100)}%</div>
        </div>
      `;
    });
  }

  let openButtonText = '🔓 РАСКОЛОТЬ ЖЕОДУ';
  
  if (g.isSpecial) {
    const loc = g.location;
    const completed = isLocationCompleted(loc);
    if (completed) {
      openButtonText = '📚 ИЗУЧИТЬ (Обменять на XP)';
    }
  }

  let html = `
    <div class="modal-header">
      <div class="modal-title">${g.name}</div>
      <button class="modal-close" onclick="document.dispatchEvent(new Event('closeModal'))">✕</button>
    </div>
    <div class="modal-content">
      <div class="modal-icon-large" id="modalGeodeImage"></div>
      <div class="modal-description">${g.description}</div>
      <div class="loot-table">
        <div style="margin-bottom:16px; font-weight:700;">${g.isSpecial ? 'Особая находка' : 'Возможная добыча'}</div>
        ${lootHtml}
      </div>
      <div style="margin:20px 0; color:var(--text-secondary);">В инвентаре: ${playerState.geodes[geodeId] || 0} шт.</div>
      <button class="btn" id="modalOpenGeodeBtn" data-geode="${geodeId}" data-special="${g.isSpecial}">${openButtonText}</button>
    </div>
  `;
  
  openModal(html);
  
  setTimeout(() => {
    renderImageToElement(document.getElementById('modalGeodeImage'), g.stages[0].imagePath, g.stages[0].fallbackIcon, '#8B7355');
    
    if (!g.isSpecial) {
      g.lootTable.forEach((e) => {
        const el = document.getElementById(`loot-${e.ingotId}`);
        if (el) {
          const ing = CONFIG_ITEMS[e.ingotId];
          renderImageToElement(el, ing.imagePath, ing.icon, ing.fallbackColor);
        }
      });
    }
    
    document.getElementById('modalOpenGeodeBtn').addEventListener('click', function () {
      closeModal();
      const isSpecial = this.dataset.special === 'true';
      const geodeId = this.dataset.geode;
      
      if (isSpecial) {
        const g = CONFIG_GEODES[geodeId];
        const completed = isLocationCompleted(g.location);
        if (completed) {
          exchangeSpecialGeodeForXP(geodeId);
        } else {
          openBrawlOverlay(geodeId, true);
        }
      } else {
        openBrawlOverlay(geodeId, false);
      }
    });
  }, 10);
}

function updateModalExpeditionTimer(expId) {
  const timerEl = document.getElementById('modalExpeditionTimer');
  const actionBtnEl = document.getElementById('modalExpeditionAction');
  if (!timerEl || !actionBtnEl) return;

  const exp = playerState.expeditions[expId];
  if (!exp || !exp.active || !exp.endTime) {
    actionBtnEl.innerHTML = `<button class="btn" id="modalStartExpedition" data-expedition="${expId}">⛏️ ОТПРАВИТЬСЯ</button>`;
    document.getElementById('modalStartExpedition')?.addEventListener('click', function () {
      startExpedition(this.dataset.expedition);
      closeModal();
    });
    return;
  }

  const now = Date.now();
  const diff = Math.max(0, exp.endTime - now);
  
  if (diff <= 0) {
    actionBtnEl.innerHTML = `<button class="btn" id="modalStartExpedition" data-expedition="${expId}">⛏️ ОТПРАВИТЬСЯ</button>`;
    document.getElementById('modalStartExpedition')?.addEventListener('click', function () {
      startExpedition(this.dataset.expedition);
      closeModal();
    });
    return;
  }

  const m = Math.floor(diff / 60000);
  const s = Math.ceil((diff % 60000) / 1000);
  timerEl.textContent = `⏳ Идёт: ${m}:${s.toString().padStart(2, '0')}`;
}

function showScoutChoiceModal(expId) {
  const html = `
    <div class="modal-header">
      <div class="modal-title">📡 Выберите разведку</div>
      <button class="modal-close" onclick="document.dispatchEvent(new Event('closeModal'))">✕</button>
    </div>
    <div class="modal-content">
      <div class="modal-description">Выберите один бонус для текущей экспедиции:</div>
      <button class="btn" id="chooseEcho-${expId}" style="margin-bottom:12px;">📡 Эхо-локатор (-15% времени)</button>
      <button class="btn" id="chooseScan-${expId}">🔬 Глубинное сканирование (+20% шанс Особой)</button>
    </div>
  `;
  
  openModal(html);
  
  document.getElementById(`chooseEcho-${expId}`)?.addEventListener('click', () => {
    closeModal();
    startSignalGame(expId, 'echo');
  });
  
  document.getElementById(`chooseScan-${expId}`)?.addEventListener('click', () => {
    closeModal();
    startSignalGame(expId, 'scan');
  });
}

export function showExpeditionInfoModal(expId) {
  const exp = CONFIG_EXPEDITIONS[expId];
  if (!exp) return;
  
  if (playerState.player.level < exp.requiredLevel) {
    showToast(`Требуется ${exp.requiredLevel} уровень!`, '🔒');
    return;
  }
  
  const act = playerState.expeditions[expId];
  const isActive = act && act.active;
  const completed = isLocationCompleted(expId);
  const special = CONFIG_GEODES[exp.specialGeodeId];
  const discovered = playerState.discoveredSpecialGeodes[expId];

  let specialText = '';
  if (completed) {
    specialText = '✅ Все артефакты собраны';
  } else if (discovered) {
    specialText = `Особая находка: ${special.name} (${Math.round(exp.specialGeodeChance * 100)}%)`;
  } else {
    specialText = `Особая находка: ??? (${Math.round(exp.specialGeodeChance * 100)}%)`;
  }

  let timerHtml = '';
  if (isActive && act.endTime) {
    const diff = Math.max(0, act.endTime - Date.now());
    const m = Math.floor(diff / 60000);
    const s = Math.ceil((diff % 60000) / 1000);
    timerHtml = `<div class="timer-badge" id="modalExpeditionTimer">⏳ Идёт: ${m}:${s.toString().padStart(2, '0')}</div>`;
  } else {
    timerHtml = `<div id="modalExpeditionTimer"></div>`;
  }

  let scoutButton = '';
  if (expId !== 'mine' && isActive) {
    const bonusUsed = playerState.expeditionBonuses && playerState.expeditionBonuses[expId] !== undefined;
    const echoCooldown = playerState.echoCooldowns?.[expId] || 0;
    const now = Date.now();
    const onCooldown = echoCooldown > now && !bonusUsed;
    const cooldownRemaining = onCooldown ? Math.ceil((echoCooldown - now) / 1000) : 0;
    
    scoutButton = `
      <div style="margin-top:16px;">
        <button class="btn" id="scoutBtn-${expId}" ${bonusUsed || onCooldown ? 'disabled' : ''}>
          ${bonusUsed ? '✅ Разведка проведена' : (onCooldown ? `⏳ Перезарядка ${cooldownRemaining}с` : '📡 РАЗВЕДКА')}
        </button>
      </div>
    `;
  }

  let actionBtn = '';
  if (isActive) {
    actionBtn = `<div id="modalExpeditionAction">${timerHtml}${scoutButton}</div>`;
  } else {
    actionBtn = `<div id="modalExpeditionAction"><button class="btn" id="modalStartExpedition" data-expedition="${expId}">⛏️ ОТПРАВИТЬСЯ</button></div>`;
  }

  let html = `
    <div class="modal-header">
      <div class="modal-title">${exp.name}</div>
      <button class="modal-close" onclick="document.dispatchEvent(new Event('closeModal'))">✕</button>
    </div>
    <div class="modal-content">
      <div class="modal-icon-large" id="modalExpeditionImage"></div>
      <div class="modal-description">${exp.description || 'Опасная, но прибыльная локация.'}</div>
      <div style="background:rgba(0,0,0,0.2); border-radius:24px; padding:18px; margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between;">
          <span>⏱️ Время</span>
          <span style="color:var(--accent-gold);">${exp.timer} сек</span>
        </div>
        <div style="margin-top:12px; color:${completed ? '#50C878' : 'var(--accent-gold)'};">${specialText}</div>
      </div>
      ${actionBtn}
    </div>
  `;
  
  openModal(html);
  
  if (isActive) {
    if (modalTimerInterval) {
      clearInterval(modalTimerInterval);
    }
    modalTimerInterval = setInterval(() => {
      updateModalExpeditionTimer(expId);
    }, 500);
  }
  
  setTimeout(() => {
    renderImageToElement(document.getElementById('modalExpeditionImage'), exp.imagePath, exp.fallbackIcon, '#FFD700');
    
    const startBtn = document.getElementById('modalStartExpedition');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        startExpedition(this.dataset.expedition);
        closeModal();
      });
    }
    
    const scoutBtn = document.getElementById(`scoutBtn-${expId}`);
    if (scoutBtn) {
      scoutBtn.addEventListener('click', () => {
        showScoutChoiceModal(expId);
      });
    }
  }, 10);
}

// ---------- ОБНОВЛЕНИЕ UI ----------
export function updateProfileUI() {
  if (currentTab !== 'profile') return;
  
  const levelEl = document.getElementById('profileLevel');
  if (levelEl) levelEl.textContent = playerState.player.level;
  
  const xpFillEl = document.getElementById('xpFill');
  const xpTextEl = document.getElementById('xpText');
  if (xpFillEl && xpTextEl) {
    const currentXP = playerState.player.xp;
    const nextLevelXP = LEVELS[playerState.player.level] || LEVELS[LEVELS.length - 1];
    const prevLevelXP = LEVELS[playerState.player.level - 1] || 0;
    const progress = ((currentXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100;
    xpFillEl.style.width = `${Math.min(progress, 100)}%`;
    xpTextEl.textContent = `${currentXP} / ${nextLevelXP} XP`;
  }
  
  const statusEl = document.getElementById('profileStatus');
  if (statusEl) statusEl.textContent = STATUSES[Math.min(playerState.player.level - 1, STATUSES.length - 1)];
  
  const totalOpenedEl = document.getElementById('statOpened');
  if (totalOpenedEl) totalOpenedEl.textContent = playerState.player.totalOpened;
  
  const totalIngotsEl = document.getElementById('statIngots');
  if (totalIngotsEl) totalIngotsEl.textContent = playerState.player.totalIngots;
  
  const totalArtifactsEl = document.getElementById('statArtifacts');
  if (totalArtifactsEl) totalArtifactsEl.textContent = playerState.player.totalArtifacts;
}

export function updateCollectionProgress() {
  if (currentTab !== 'collection') return;
  
  const totalRegular = Object.values(CONFIG_ITEMS).filter((i) => !i.isCollectible).length;
  const discovered = Object.values(CONFIG_ITEMS).filter((i) => !i.isCollectible && playerState.minedStats[i.id] > 0).length;
  const percent = (discovered / totalRegular) * 100;
  
  const fillEl = document.getElementById('collectionProgressFill');
  const textEl = document.getElementById('collectionProgressText');
  if (fillEl) fillEl.style.width = `${percent}%`;
  if (textEl) textEl.textContent = `${discovered}/${totalRegular} открыто`;
}

// ---------- РЕНДЕРИНГ ВКЛАДОК ----------
export function renderProfileTab() {
  const userName = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || 'Старатель';
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const themeBtnText = currentTheme === 'dark' ? '🌙 Сменить тему (Светлая)' : '☀️ Сменить тему (Тёмная)';
  
  let html = `<div class="section-title">👤 Профиль</div>`;
  
  html += `
    <div class="card">
      <div class="profile-header">
        <div class="profile-avatar">👤</div>
        <div class="profile-info">
          <div class="profile-name">${userName}</div>
          <div class="profile-status" id="profileStatus">${STATUSES[Math.min(playerState.player.level - 1, STATUSES.length - 1)]}</div>
          <span class="level-badge" id="profileLevel">${playerState.player.level}</span> уровень
          <button class="dev-menu-btn" id="adminPanelBtn">🛠️ АДМИН</button>
        </div>
      </div>
      <div class="xp-bar-container"><div class="xp-bar-fill" id="xpFill" style="width:0%"></div></div>
      <div class="xp-text" id="xpText">${playerState.player.xp} / ${LEVELS[playerState.player.level] || 15000} XP</div>
      
      <button class="theme-profile-btn" id="themeProfileBtn">${themeBtnText}</button>
      <button class="vip-button" id="vipButton">💎 АКТИВИРОВАТЬ VIP</button>
      <button class="btn" id="leaderboardBtn" style="margin-top:12px;">🏆 ТОП ИГРОКОВ</button>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value" id="statOpened">${playerState.player.totalOpened}</div><div class="stat-label">Открыто жеод</div></div>
        <div class="stat-card"><div class="stat-value" id="statIngots">${playerState.player.totalIngots}</div><div class="stat-label">Добыто слитков</div></div>
        <div class="stat-card"><div class="stat-value" id="statArtifacts">${playerState.player.totalArtifacts}</div><div class="stat-label">Артефактов</div></div>
      </div>
    </div>
    <div class="card sell-section"><div class="section-title">💰 Сбыт сырья</div>
  `;
  
  const availableIngots = Object.entries(playerState.ingots).filter(([k, v]) => v > 0 && !CONFIG_ITEMS[k].isCollectible);
  if (availableIngots.length === 0) {
    html += '<div class="empty-state">Нет ресурсов для сдачи</div>';
  } else {
    availableIngots.forEach(([k, v]) => {
      const ing = CONFIG_ITEMS[k];
      html += `
        <div class="resource-item">
          <div class="resource-info">
            <div class="resource-icon" id="sell-icon-${k}"></div>
            <div>
              <div class="resource-name">${ing.name}</div>
              <div class="resource-count">${v} шт. (+${ing.sellValue} XP/шт)</div>
            </div>
          </div>
          <button class="sell-btn" data-sell="${k}">Сдать всё</button>
        </div>
      `;
    });
  }
  html += '</div>';
  
  mainContent.innerHTML = html;

  availableIngots.forEach(([k]) => {
    const el = document.getElementById(`sell-icon-${k}`);
    if (el) {
      const ing = CONFIG_ITEMS[k];
      renderImageToElement(el, ing.imagePath, ing.icon, ing.fallbackColor);
    }
  });
  
  document.getElementById('themeProfileBtn').addEventListener('click', toggleTheme);
  document.querySelectorAll('[data-sell]').forEach((b) => b.addEventListener('click', () => sellIngot(b.dataset.sell)));
  document.getElementById('vipButton').addEventListener('click', () => showToast('Оплата через Crypto Bot скоро будет доступна', '💎'));
  
  document.getElementById('leaderboardBtn')?.addEventListener('click', async () => {
    try {
      const { updateLeaderboard } = await import('./core.js');
      updateLeaderboard();
    } catch (e) {
      showToast('Не удалось загрузить таблицу лидеров', '⚠️');
    }
  });
  
  document.getElementById('adminPanelBtn').addEventListener('click', () => {
    showAdminPanel();
  });
  
  updateProfileUI();
}

export function renderExpeditionsTab() {
  let html = '<div class="section-title">⛏️ Экспедиции</div>';
  
  for (let k in CONFIG_EXPEDITIONS) {
    const exp = CONFIG_EXPEDITIONS[k];
    const act = playerState.expeditions[k] || { active: false };
    const isLocked = playerState.player.level < exp.requiredLevel;
    let timerHtml = '';
    
    if (isLocked) {
      timerHtml = `<span class="lock-icon">🔒</span> <span style="color:var(--text-muted);">Ур. ${exp.requiredLevel}</span>`;
    } else if (act.active && act.endTime) {
      const diff = Math.max(0, act.endTime - Date.now());
      const m = Math.floor(diff / 60000);
      const s = Math.ceil((diff % 60000) / 1000);
      timerHtml = `<div class="timer-badge" id="timer-${k}">⏳ ${m}:${s.toString().padStart(2, '0')}</div>`;
    } else {
      timerHtml = `<button class="small-btn" data-info-exp="${k}">Подробнее</button>`;
    }
    
    html += `
      <div class="card">
        <div class="expedition-item ${isLocked ? 'locked' : ''}" data-expedition-click="${k}">
          <div class="expedition-info">
            <div class="expedition-icon" id="expedition-icon-${k}"></div>
            <div class="expedition-text">
              <h3>${exp.name} ${isLocked ? '🔒' : ''}</h3>
              <p>⏱️ ${exp.timer} сек</p>
            </div>
          </div>
          <div class="expedition-action">${timerHtml}</div>
        </div>
      </div>
    `;
  }
  
  mainContent.innerHTML = html;
  
  for (let k in CONFIG_EXPEDITIONS) {
    renderImageToElement(document.getElementById(`expedition-icon-${k}`), CONFIG_EXPEDITIONS[k].imagePath, CONFIG_EXPEDITIONS[k].fallbackIcon, '#FFD700');
  }
  
  document.querySelectorAll('[data-expedition-click]').forEach((el) =>
    el.addEventListener('click', function (e) {
      const key = this.dataset.expeditionClick;
      if (playerState.player.level < CONFIG_EXPEDITIONS[key].requiredLevel) {
        showToast(`Требуется ${CONFIG_EXPEDITIONS[key].requiredLevel} уровень!`, '🔒');
        return;
      }
      if (!e.target.classList.contains('small-btn')) showExpeditionInfoModal(key);
    })
  );
  
  document.querySelectorAll('[data-info-exp]').forEach((btn) =>
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showExpeditionInfoModal(btn.dataset.infoExp);
    })
  );
}

export function renderInventoryTab() {
  let html = `
    <div class="section-title">🎒 Инвентарь</div>
    <div class="inventory-subtabs">
      <button class="subtab-btn ${inventorySubTab === 'geodes' ? 'active' : ''}" data-subtab="geodes">🪨 Жеоды</button>
      <button class="subtab-btn ${inventorySubTab === 'ingots' ? 'active' : ''}" data-subtab="ingots">✨ Слитки</button>
    </div>
  `;
  
  if (inventorySubTab === 'geodes') {
    const items = Object.entries(playerState.geodes).filter(([_, c]) => c > 0);
    if (!items.length) {
      html += '<div class="empty-state">Нет жеод. Отправьте экспедицию.</div>';
    } else {
      html += '<div class="grid-container">';
      items.forEach(([k, c]) => {
        const g = CONFIG_GEODES[k];
        html += `
          <div class="collection-card" data-geode="${k}">
            <div class="card-icon" id="inv-geode-${k}"></div>
            <div class="card-name">${g.name}</div>
            <div class="card-count-badge">${c} шт.</div>
          </div>
        `;
      });
      html += '</div>';
    }
    
    mainContent.innerHTML = html;
    
    for (let k in CONFIG_GEODES) {
      const el = document.getElementById(`inv-geode-${k}`);
      if (el && playerState.geodes[k] > 0) {
        renderImageToElement(el, CONFIG_GEODES[k].stages[0].imagePath, CONFIG_GEODES[k].stages[0].fallbackIcon, '#8B7355');
      }
    }
  } else {
    const items = Object.entries(playerState.ingots).filter(([k, c]) => c > 0 && !CONFIG_ITEMS[k].isCollectible);
    if (!items.length) {
      html += '<div class="empty-state">Нет слитков. Откройте жеоды.</div>';
    } else {
      html += '<div class="grid-container">';
      items.forEach(([k, c]) => {
        const ing = CONFIG_ITEMS[k];
        html += `
          <div class="collection-card" data-ingot="${k}">
            <div class="card-icon" id="inv-ingot-${k}"></div>
            <div class="card-name">${ing.name}</div>
            <div class="card-count-badge">${c} шт.</div>
          </div>
        `;
      });
      html += '</div>';
    }
    
    mainContent.innerHTML = html;
    
    for (let k in CONFIG_ITEMS) {
      if (CONFIG_ITEMS[k].isCollectible) continue;
      const el = document.getElementById(`inv-ingot-${k}`);
      if (el && playerState.ingots[k] > 0) {
        renderImageToElement(el, CONFIG_ITEMS[k].imagePath, CONFIG_ITEMS[k].icon, CONFIG_ITEMS[k].fallbackColor);
      }
    }
  }

  document.querySelectorAll('[data-subtab]').forEach((b) =>
    b.addEventListener('click', () => {
      inventorySubTab = b.dataset.subtab;
      renderInventoryTab();
    })
  );
  
  document.querySelectorAll('[data-geode]').forEach((c) => c.addEventListener('click', () => showGeodeModal(c.dataset.geode)));
  document.querySelectorAll('[data-ingot]').forEach((c) => c.addEventListener('click', () => openShowcase(c.dataset.ingot)));
}

export function renderCollectionTab() {
  const totalRegular = Object.values(CONFIG_ITEMS).filter((i) => !i.isCollectible).length;
  const discovered = Object.values(CONFIG_ITEMS).filter((i) => !i.isCollectible && playerState.minedStats[i.id] > 0).length;
  const percent = (discovered / totalRegular) * 100;

  let html = `
    <div class="section-title">📦 Коллекция</div>
    <div class="collection-progress">
      <div class="progress-bar-container">
        <div class="progress-bar-fill" id="collectionProgressFill" style="width:${percent}%"></div>
      </div>
      <div class="progress-text" id="collectionProgressText">${discovered}/${totalRegular} открыто</div>
    </div>
    <div class="inventory-subtabs">
      <button class="subtab-btn ${collectionSubTab === 'encyclopedia' ? 'active' : ''}" data-subtab="encyclopedia">📚 Энциклопедия</button>
      <button class="subtab-btn ${collectionSubTab === 'halloffame' ? 'active' : ''}" data-subtab="halloffame">🏆 Зал Славы</button>
    </div>
  `;

  if (collectionSubTab === 'encyclopedia') {
    const regularIngots = Object.values(CONFIG_ITEMS).filter((i) => !i.isCollectible);
    html += '<div class="grid-container">';
    regularIngots.forEach((ing) => {
      const discovered = playerState.minedStats[ing.id] > 0;
      const cardClass = discovered ? 'collection-card' : 'collection-card silhouette';
      html += `
        <div class="${cardClass}" data-ingot="${ing.id}">
          <div class="card-icon" id="enc-${ing.id}"></div>
          <div class="card-name">${discovered ? ing.name : 'Неизвестный материал'}</div>
          <div class="card-count-badge">${discovered ? `Добыто: ${playerState.minedStats[ing.id]}` : '???'}</div>
        </div>
      `;
    });
    html += '</div>';
    
    mainContent.innerHTML = html;
    
    regularIngots.forEach((ing) => {
      const el = document.getElementById(`enc-${ing.id}`);
      if (el) {
        if (playerState.minedStats[ing.id] > 0) {
          renderImageToElement(el, ing.imagePath, ing.icon, ing.fallbackColor);
        } else {
          renderMysteryPlaceholder(el);
        }
      }
    });
  } else {
    const coll = Object.values(CONFIG_ITEMS).filter((i) => i.isCollectible);
    html += '<div class="grid-container">';
    coll.forEach((ing) => {
      const owned = playerState.ingots[ing.id] > 0;
      html += `
        <div class="collection-card ${owned ? '' : 'silhouette'}" data-ingot="${ing.id}">
          <div class="card-icon" id="hall-${ing.id}"></div>
          <div class="card-name">${owned ? ing.name : '???'}</div>
          <div class="card-count-badge">${owned ? '★ Найдено' : 'Неизвестно'}</div>
        </div>
      `;
    });
    html += '</div>';
    
    mainContent.innerHTML = html;
    
    coll.forEach((ing) => {
      const el = document.getElementById(`hall-${ing.id}`);
      if (el) {
        if (playerState.ingots[ing.id] > 0) {
          renderImageToElement(el, ing.imagePath, ing.icon, ing.fallbackColor);
        } else {
          renderMysteryPlaceholder(el);
        }
      }
    });
  }

  document.querySelectorAll('[data-subtab]').forEach((b) =>
    b.addEventListener('click', () => {
      collectionSubTab = b.dataset.subtab;
      renderCollectionTab();
    })
  );
  
  document.querySelectorAll('[data-ingot]').forEach((c) =>
    c.addEventListener('click', () => {
      const ing = CONFIG_ITEMS[c.dataset.ingot];
      openShowcase(c.dataset.ingot, !playerState.minedStats[ing.id] && !ing.isCollectible);
    })
  );
}

export function renderEventsTab() {
  const activeEvent = eventsManager.getActiveEvent();
  const timeLeft = activeEvent ? eventsManager.getTimeLeft() : '';
  const phase = eventsManager.eventPhase;
  
  let html = '<div class="section-title">📡 Ивенты</div>';
  
  if (activeEvent && phase === 'active') {
    html += `
      <div class="card" style="border: 2px solid rgba(255,100,0,0.4); background: rgba(255,50,0,0.05); position: relative; overflow: hidden;">
        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 50% 0%, rgba(255,100,0,0.1) 0%, transparent 70%); pointer-events: none;"></div>
        <div class="event-icon" style="font-size:72px; margin-bottom:16px;">${activeEvent.icon}</div>
        <div class="event-title" style="color: var(--accent-orange); font-size: 22px; margin-bottom: 8px;">${activeEvent.name}</div>
        <div class="event-desc" style="color: var(--text-primary); font-size: 14px; line-height: 1.6; margin-bottom: 16px;">${activeEvent.longDescription || activeEvent.description}</div>
        
        <div style="background: rgba(0,0,0,0.3); border-radius: 20px; padding: 14px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 10px;">
          <span style="font-size: 24px;">⏳</span>
          <span style="font-family: 'Unbounded', sans-serif; font-size: 20px; font-weight: 700; color: var(--accent-gold);" id="eventTimer">${timeLeft}</span>
          <span style="font-size: 12px; color: var(--text-secondary);">до завершения</span>
        </div>
        
        <button class="forge-smelt-btn" id="enterForgeBtn" style="width: 100%;">
          ⚡ ВОЙТИ В ПЛАВИЛЬНЮ
        </button>
        
        <div style="margin-top: 12px; text-align: center; color: var(--text-muted); font-size: 11px;">
          Доступны рецепты: 🌑 Чёрное Зеркало · 🛰️ Астро-Бронза · 🛡️ Хромированный Титан · 💎 Платиновый Сплав
        </div>
      </div>
    `;
  } else if (phase === 'ending') {
    html += `
      <div class="event-placeholder">
        <div class="event-icon">❄️</div>
        <div class="event-title">Кузни остыли</div>
        <div class="event-desc">Великая Переплавка завершена. Дождитесь следующего ивента.</div>
        <div style="margin-top: 16px; color: var(--text-muted); font-size: 13px;">Следующий ивент начнётся автоматически</div>
      </div>
    `;
  } else {
    html += `
      <div class="event-placeholder">
        <div class="event-icon">🛰️</div>
        <div class="event-title">Ожидание ивента</div>
        <div class="event-desc">Великая Переплавка запускается автоматически. Проверяйте вкладку Ивентов!</div>
      </div>
    `;
  }
  
  mainContent.innerHTML = html;
  
  const enterForgeBtn = document.getElementById('enterForgeBtn');
  if (enterForgeBtn) {
    enterForgeBtn.addEventListener('click', () => {
      openForge();
    });
  }
  
  updateEventTimerInterval();
}

let eventTimerInterval = null;

function updateEventTimerInterval() {
  // Чистим старый интервал перед созданием нового
  if (eventTimerInterval) {
    clearInterval(eventTimerInterval);
    eventTimerInterval = null;
  }
  
  // Не создаём новый если мы не на вкладке events
  if (currentTab !== 'events') {
    return;
  }
  
  eventTimerInterval = setInterval(() => {
    if (currentTab !== 'events') {
      clearInterval(eventTimerInterval);
      eventTimerInterval = null;
      return;
    }
    
    const timerEl = document.getElementById('eventTimer');
    if (timerEl) {
      const event = eventsManager.getActiveEvent();
      if (event && eventsManager.eventPhase === 'active') {
        timerEl.textContent = eventsManager.getTimeLeft();
      }
    }
    
    const event = eventsManager.getActiveEvent();
    if (event && eventsManager.eventEndTime && Date.now() >= eventsManager.eventEndTime && eventsManager.eventPhase === 'active') {
      eventsManager.endEvent();
      renderCurrentTab();
    }
  }, 1000);
}

export function renderCurrentTab() {
  if (currentTab === 'expeditions') renderExpeditionsTab();
  else if (currentTab === 'inventory') renderInventoryTab();
  else if (currentTab === 'collection') renderCollectionTab();
  else if (currentTab === 'events') renderEventsTab();
  else if (currentTab === 'profile') renderProfileTab();
}

export function setActiveTab(tabId) {
  // При уходе с вкладки events — чистим интервал
  if (currentTab === 'events' && tabId !== 'events') {
    if (eventTimerInterval) {
      clearInterval(eventTimerInterval);
      eventTimerInterval = null;
    }
  }
  
  currentTab = tabId;
  document.querySelectorAll('.tab-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
  renderCurrentTab();
}
