// ========== UI МОДУЛЬ: ОТРИСОВКА ИНТЕРФЕЙСА · ПОЛНАЯ ПЕРЕКОПКА ==========
import { CONFIG_ITEMS, CONFIG_GEODES, CONFIG_EXPEDITIONS, LEVELS, STATUSES, EVENTS_CONFIG } from './config.js';
import { playerState, getSerialForCollectible, isLocationCompleted, sellIngot, startExpedition, openBrawlOverlay, eventsManager, saveGame, devGiveXP, devGiveGeodes, devUnlockLocations, devResetGeodes, startSignalGame, exchangeSpecialGeodeForXP, openForge, sendBotNotification, openMeteorStorm, claimMeteorStormRewards, exitMeteorStormEarly, meteorStormState, terminateEvent, setActiveOverlay, clearActiveOverlay, isAnyOverlayActive } from './core.js';

// ========== DOM-ЭЛЕМЕНТЫ ==========
export const mainContent = document.getElementById('mainContent');
const showcaseOverlay = document.getElementById('showcaseOverlay');
const showcaseContent = document.getElementById('showcaseContent');
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');

// ========== СОСТОЯНИЕ ВКЛАДОК ==========
export let currentTab = 'expeditions';
export let inventorySubTab = 'geodes';
export let collectionSubTab = 'encyclopedia';

// ========== ЕДИНЫЕ ИНТЕРВАЛЫ ==========
let modalTimerInterval = null;
let currentModalExpId = null;
let eventTabInterval = null;

// ========== ТЕМА ==========
function initTheme() {
  const saved = localStorage.getItem('starforge_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('starforge_theme', next);
  const btn = document.getElementById('themeProfileBtn');
  if (btn) btn.innerHTML = next === 'dark' ? '🌙 Сменить тему (Светлая)' : '☀️ Сменить тему (Тёмная)';
}
initTheme();

// ========== УТИЛИТЫ РЕНДЕРИНГА ==========
export function renderImageToElement(el, src, fallbackIcon, fallbackColor) {
  if (!el) return;
  el.innerHTML = '';
  const fb = document.createElement('span');
  fb.className = 'fallback-icon';
  fb.textContent = fallbackIcon;
  fb.style.cssText = `color:${fallbackColor || '#FFD700'};font-size:${el.classList.contains('card-icon') ? '40px' : 'inherit'};`;
  el.appendChild(fb);
  const img = new Image();
  img.onload = () => { el.innerHTML = ''; const i = document.createElement('img'); i.src = src; i.alt = ''; el.appendChild(i); };
  img.onerror = () => {};
  img.src = src;
}

export function renderMysteryPlaceholder(el) {
  if (!el) return;
  el.innerHTML = '<span style="font-size:40px;color:var(--text-muted);">?</span>';
}

export function getGeodeStageImage(geodeId, taps) {
  const g = CONFIG_GEODES[geodeId];
  if (!g) return { imagePath: '', fallbackIcon: '🪨' };
  for (let s of g.stages) { if (taps >= s.minTaps && taps <= s.maxTaps) return { imagePath: s.imagePath, fallbackIcon: s.fallbackIcon }; }
  return { imagePath: g.stages[0].imagePath, fallbackIcon: g.stages[0].fallbackIcon };
}

export function showToast(msg, emoji = '✨') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>${emoji}</span> ${msg}`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2500);
}

// ========== REWARD POPUP ==========
export function showRewardPopup(ingot) {
  const overlay = document.getElementById('rewardPopupOverlay');
  setActiveOverlay('rewardPopup');
  renderImageToElement(document.getElementById('rewardPopupIcon'), ingot.imagePath, ingot.icon, ingot.fallbackColor);
  document.getElementById('rewardPopupName').textContent = ingot.name;
  overlay.classList.add('active');
  const closeBtn = document.getElementById('rewardPopupClose');
  const handler = () => { overlay.classList.remove('active'); clearActiveOverlay('rewardPopup'); closeBtn.removeEventListener('click', handler); };
  closeBtn.addEventListener('click', handler);
}

// ========== МЕТЕОРИТНЫЙ ШТОРМ UI ==========
export function renderMeteorStormUI() {
  const t = document.getElementById('meteorStormTimer');
  if (t) { t.textContent = meteorStormState.timer; t.style.color = '#FFD700'; t.style.textShadow = '0 0 20px rgba(255,215,0,0.5)'; }
  document.getElementById('meteorCountLegendary').textContent = meteorStormState.captured.legendary;
  document.getElementById('meteorCountRare').textContent = meteorStormState.captured.rare;
  document.getElementById('meteorCountCommon').textContent = meteorStormState.captured.common;
}

export function updateMeteorStormUI() {
  const t = document.getElementById('meteorStormTimer');
  if (t) {
    t.textContent = meteorStormState.timer;
    if (meteorStormState.timer <= 5) { t.style.color = '#FF4444'; t.style.textShadow = '0 0 30px rgba(255,68,68,0.8)'; }
    else { t.style.color = '#FFD700'; t.style.textShadow = '0 0 20px rgba(255,215,0,0.5)'; }
  }
  document.getElementById('meteorCountLegendary').textContent = meteorStormState.captured.legendary;
  document.getElementById('meteorCountRare').textContent = meteorStormState.captured.rare;
  document.getElementById('meteorCountCommon').textContent = meteorStormState.captured.common;
}

export function showMeteorStormResult(data) {
  document.getElementById('meteorResultLegendary').textContent = data.legendaryGeodes;
  document.getElementById('meteorResultRare').textContent = data.rareGeodes;
  document.getElementById('meteorResultCommon').textContent = data.commonGeodes;
  document.getElementById('meteorResultXP').textContent = data.totalXP;
  document.getElementById('meteorStormResultOverlay').classList.add('active');
  const btn = document.getElementById('meteorStormClaimBtn');
  const clone = btn.cloneNode(true);
  btn.parentNode.replaceChild(clone, btn);
  clone.addEventListener('click', claimMeteorStormRewards);
}

// ========== SHOWCASE ==========
export function openShowcase(ingotId, isMystery = false) {
  if (isAnyOverlayActive()) return;
  const ingot = CONFIG_ITEMS[ingotId];
  if (!ingot) return;
  setActiveOverlay('showcase');
  const owned = playerState.ingots[ingotId] > 0;
  const discovered = playerState.minedStats[ingotId] > 0;
  let name = ingot.name, desc = ingot.description, rarity = ingot.rarity, rarityClass = ingot.rarityClass, idHtml = '';

  if (!discovered && !ingot.isCollectible) {
    name = 'Неизвестный материал';
    desc = `Месторождение: ${CONFIG_EXPEDITIONS[ingot.location]?.name || 'неизвестной локации'}`;
    rarity = '???'; rarityClass = 'common';
    idHtml = `<div class="showcase-id"><span class="showcase-id-label">Статус</span><span class="showcase-id-value" style="color:var(--text-muted);">НЕ ИЗУЧЕН</span></div>`;
  } else if (!owned && ingot.isCollectible) {
    name = 'Неизвестный Артефакт';
    desc = ingot.location === 'mine' ? 'Глубины Шахт скрывают этот секрет.' : ingot.location === 'jungle' ? 'Джунгли ревностно охраняют эту тайну.' : ingot.location === 'craft' ? 'Создаётся в горниле Великой Переплавки.' : 'Пояс Астероидов хранит это сокровище.';
    rarity = '???'; rarityClass = 'common';
    idHtml = `<div class="showcase-id"><span class="showcase-id-label">Статус</span><span class="showcase-id-value" style="color:var(--text-muted);">НЕ ОТКРЫТ</span></div>`;
  } else {
    idHtml = ingot.isCollectible
      ? `<div class="showcase-serial"><span class="showcase-serial-label">Серийный номер</span><span class="showcase-serial-value">#${getSerialForCollectible(ingotId)}</span></div>`
      : `<div class="showcase-id"><span class="showcase-id-label">Добыто всего</span><span class="showcase-id-value">${playerState.minedStats[ingotId] || 0} ед.</span></div>`;
  }

  showcaseContent.innerHTML = `
    <div class="showcase-image" id="showcaseImage"></div>
    <div class="showcase-info">
      <div class="showcase-name">${name}</div><div class="showcase-rarity ${rarityClass}">${rarity}</div>${idHtml}
      <div class="showcase-description">${desc}</div>
      <div class="showcase-count">${owned ? `В наличии: ${playerState.ingots[ingotId]} шт.` : 'Ещё не найден'}</div>
    </div>`;
  
  const imgEl = document.getElementById('showcaseImage');
  if ((!discovered && !ingot.isCollectible) || (!owned && ingot.isCollectible)) {
    renderMysteryPlaceholder(imgEl); showcaseContent.style.opacity = '0.8';
  } else {
    renderImageToElement(imgEl, ingot.imagePath, ingot.icon, ingot.fallbackColor); showcaseContent.style.opacity = '1';
  }
  showcaseOverlay.classList.add('active');
}

export function closeShowcase() {
  showcaseOverlay.classList.remove('active');
  clearActiveOverlay('showcase');
}

// ========== АДМИН-ПАНЕЛЬ ==========
function showAdminPanel() {
  let html = `
    <div class="modal-header"><div class="modal-title">🛠️ Админ-панель</div><button class="modal-close" onclick="document.dispatchEvent(new Event('closeModal'))">✕</button></div>
    <div class="modal-content" style="text-align:left;">
      <div style="margin-bottom:12px;font-weight:600;color:var(--accent-gold);">⚡ Быстрые действия</div>
      <button class="btn" id="adminMaxXP" style="margin-bottom:6px;">🌟 Дать 1M XP</button>
      <button class="btn" id="adminUnlockAll" style="margin-bottom:6px;">🔓 Открыть все локации (ур.10)</button>
      <button class="btn" id="adminFillGeodes" style="margin-bottom:6px;">🪨 +10 всех жеод</button>
      <button class="btn" id="adminFillIngots" style="margin-bottom:6px;">✨ +10 всех обычных слитков</button>
      <button class="btn" id="adminFillArtifacts" style="margin-bottom:6px;">💎 +1 всех коллекционных артефактов</button>
      <div style="margin:20px 0;font-weight:600;color:var(--accent-gold);">⏱️ Ивенты</div>
      <button class="btn" id="adminTriggerSmelt" style="margin-bottom:8px;">🔥 Запустить Переплавку</button>
      <button class="btn" id="adminTriggerStorm" style="margin-bottom:8px;">☄️ Запустить Метеоритный Шторм</button>
      <button class="btn" id="adminEndEvent" style="margin-bottom:8px;">❄️ Завершить ивент</button>
      <div style="margin:20px 0;font-weight:600;color:var(--accent-gold);">🔧 Отдельные жеоды (+5 шт.)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">`;
  Object.entries(CONFIG_GEODES).forEach(([id, g]) => html += `<button class="small-btn admin-add-geode" data-geode="${id}" style="font-size:10px;">${g.stages[0].fallbackIcon} ${g.name}</button>`);
  html += `</div><div style="margin:20px 0;font-weight:600;color:var(--accent-gold);">✨ Отдельные слитки (+10 шт.)</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">`;
  Object.entries(CONFIG_ITEMS).filter(([_, i]) => !i.isCollectible).forEach(([id, ing]) => html += `<button class="small-btn admin-add-ingot" data-ingot="${id}" style="font-size:10px;">${ing.icon} ${ing.name}</button>`);
  html += '</div></div>';
  
  openModal(html);
  
  setTimeout(() => {
    document.getElementById('adminMaxXP')?.addEventListener('click', () => { devGiveXP(); saveGame(); showToast('+1M XP!', '🌟'); closeModal(); });
    document.getElementById('adminUnlockAll')?.addEventListener('click', () => { devUnlockLocations(); saveGame(); showToast('Локации открыты!', '🔓'); closeModal(); });
    document.getElementById('adminFillGeodes')?.addEventListener('click', () => { devGiveGeodes(); saveGame(); showToast('+10 жеод!', '🪨'); closeModal(); });
    document.getElementById('adminFillIngots')?.addEventListener('click', () => {
      Object.keys(CONFIG_ITEMS).forEach(id => { if (!CONFIG_ITEMS[id].isCollectible) { playerState.ingots[id] = (playerState.ingots[id] || 0) + 10; playerState.minedStats[id] = (playerState.minedStats[id] || 0) + 10; } });
      playerState.player.totalIngots += Object.keys(CONFIG_ITEMS).filter(id => !CONFIG_ITEMS[id].isCollectible).length * 10;
      saveGame(); showToast('+10 слитков!', '✨'); closeModal();
    });
    document.getElementById('adminFillArtifacts')?.addEventListener('click', () => {
      Object.keys(CONFIG_ITEMS).forEach(id => { if (CONFIG_ITEMS[id].isCollectible && CONFIG_ITEMS[id].location !== 'craft') { playerState.ingots[id] = (playerState.ingots[id] || 0) + 1; playerState.minedStats[id] = (playerState.minedStats[id] || 0) + 1; } });
      playerState.player.totalArtifacts += 6; saveGame(); showToast('+1 артефакт!', '💎'); closeModal();
    });
    document.getElementById('adminTriggerSmelt')?.addEventListener('click', () => { eventsManager.triggerGreatSmelt(); saveGame(); showToast('Переплавка!', '🔥'); closeModal(); });
    document.getElementById('adminTriggerStorm')?.addEventListener('click', () => { eventsManager.triggerMeteorStorm(); saveGame(); showToast('Шторм!', '☄️'); closeModal(); });
    document.getElementById('adminEndEvent')?.addEventListener('click', () => { eventsManager.endEvent(); saveGame(); showToast('Ивент завершён!', '❄️'); closeModal(); });
    document.querySelectorAll('.admin-add-geode').forEach(b => b.addEventListener('click', () => { playerState.geodes[b.dataset.geode] = (playerState.geodes[b.dataset.geode] || 0) + 5; saveGame(); showToast(`+5 ${CONFIG_GEODES[b.dataset.geode].name}`, '🪨'); closeModal(); }));
    document.querySelectorAll('.admin-add-ingot').forEach(b => { const id = b.dataset.ingot; playerState.ingots[id] = (playerState.ingots[id] || 0) + 10; playerState.minedStats[id] = (playerState.minedStats[id] || 0) + 10; playerState.player.totalIngots += 10; saveGame(); showToast(`+10 ${CONFIG_ITEMS[id].name}`, '✨'); closeModal(); });
  }, 50);
}

// ========== МОДАЛЬНЫЕ ОКНА ==========
export function openModal(html) {
  if (modalTimerInterval) { clearInterval(modalTimerInterval); modalTimerInterval = null; }
  currentModalExpId = null;
  modalContent.innerHTML = html;
  modalOverlay.classList.add('active');
  modalOverlay.onclick = (e) => { if (e.target === modalOverlay) closeModal(); };
}

export function closeModal() {
  if (modalTimerInterval) { clearInterval(modalTimerInterval); modalTimerInterval = null; }
  currentModalExpId = null;
  modalOverlay.classList.remove('active');
  modalContent.innerHTML = '';
}

export function showGeodeModal(geodeId) {
  const g = CONFIG_GEODES[geodeId];
  if (!g) return;
  let lootHtml = g.isSpecial ? '<div style="text-align:center;padding:20px;color:var(--accent-gold);">✨ Гарантированно содержит один из коллекционных артефактов локации ✨</div>'
    : g.lootTable.map(e => `<div class="loot-row"><div class="loot-left"><div class="loot-icon" id="loot-${e.ingotId}"></div><span>${CONFIG_ITEMS[e.ingotId].name}</span></div><div class="loot-chance">${Math.round(e.chance*100)}%</div></div>`).join('');
  
  let btnText = '🔓 РАСКОЛОТЬ ЖЕОДУ';
  if (g.isSpecial && isLocationCompleted(g.location)) btnText = '📚 ИЗУЧИТЬ (Обменять на XP)';
  
  openModal(`
    <div class="modal-header"><div class="modal-title">${g.name}</div><button class="modal-close" onclick="document.dispatchEvent(new Event('closeModal'))">✕</button></div>
    <div class="modal-content">
      <div class="modal-icon-large" id="modalGeodeImage"></div>
      <div class="modal-description">${g.description}</div>
      <div class="loot-table"><div style="margin-bottom:16px;font-weight:700;">${g.isSpecial ? 'Особая находка' : 'Возможная добыча'}</div>${lootHtml}</div>
      <div style="margin:20px 0;color:var(--text-secondary);">В инвентаре: ${playerState.geodes[geodeId] || 0} шт.</div>
      <button class="btn" id="modalOpenGeodeBtn" data-geode="${geodeId}" data-special="${g.isSpecial}">${btnText}</button>
    </div>`);
  
  setTimeout(() => {
    renderImageToElement(document.getElementById('modalGeodeImage'), g.stages[0].imagePath, g.stages[0].fallbackIcon, '#8B7355');
    if (!g.isSpecial) g.lootTable.forEach(e => renderImageToElement(document.getElementById(`loot-${e.ingotId}`), CONFIG_ITEMS[e.ingotId].imagePath, CONFIG_ITEMS[e.ingotId].icon, CONFIG_ITEMS[e.ingotId].fallbackColor));
    document.getElementById('modalOpenGeodeBtn').addEventListener('click', function() {
      closeModal();
      const isSp = this.dataset.special === 'true';
      const gId = this.dataset.geode;
      if (isSp && isLocationCompleted(CONFIG_GEODES[gId].location)) exchangeSpecialGeodeForXP(gId);
      else openBrawlOverlay(gId, isSp);
    });
  }, 10);
}

// ========== МОДАЛКА ЭКСПЕДИЦИИ · ИСПРАВЛЕНО ==========
function updateModalExpeditionTimer(expId) {
  const timerEl = document.getElementById('modalExpeditionTimer');
  const actionEl = document.getElementById('modalExpeditionAction');
  if (!timerEl || !actionEl) return;
  
  const exp = playerState.expeditions[expId];
  if (!exp?.active || !exp?.endTime || Date.now() >= exp.endTime) {
    actionEl.innerHTML = `<button class="btn" id="modalStartExpedition">⛏️ ОТПРАВИТЬСЯ</button>`;
    document.getElementById('modalStartExpedition')?.addEventListener('click', () => { startExpedition(expId); closeModal(); });
    if (modalTimerInterval) { clearInterval(modalTimerInterval); modalTimerInterval = null; }
    return;
  }
  const diff = Math.max(0, exp.endTime - Date.now());
  timerEl.textContent = `⏳ Идёт: ${Math.floor(diff/60000)}:${String(Math.ceil((diff%60000)/1000)).padStart(2,'0')}`;
}

function showScoutChoiceModal(expId) {
  openModal(`
    <div class="modal-header"><div class="modal-title">📡 Выберите разведку</div><button class="modal-close" onclick="document.dispatchEvent(new Event('closeModal'))">✕</button></div>
    <div class="modal-content"><div class="modal-description">Выберите один бонус для текущей экспедиции:</div>
    <button class="btn" id="chooseEcho-${expId}" style="margin-bottom:12px;">📡 Эхо-локатор (-15% времени)</button>
    <button class="btn" id="chooseScan-${expId}">🔬 Глубинное сканирование (+20% шанс Особой)</button></div>`);
  document.getElementById(`chooseEcho-${expId}`)?.addEventListener('click', () => { closeModal(); startSignalGame(expId, 'echo'); });
  document.getElementById(`chooseScan-${expId}`)?.addEventListener('click', () => { closeModal(); startSignalGame(expId, 'scan'); });
}

export function showExpeditionInfoModal(expId) {
  if (modalTimerInterval) { clearInterval(modalTimerInterval); modalTimerInterval = null; }
  
  const exp = CONFIG_EXPEDITIONS[expId];
  if (!exp) return;
  if (playerState.player.level < exp.requiredLevel) { showToast(`Требуется ${exp.requiredLevel} уровень!`, '🔒'); return; }
  
  const act = playerState.expeditions[expId];
  const isActive = act?.active && act?.endTime && Date.now() < act.endTime;
  const completed = isLocationCompleted(expId);
  const special = CONFIG_GEODES[exp.specialGeodeId];
  const discovered = playerState.discoveredSpecialGeodes[expId];
  
  let specialText = completed ? '✅ Все артефакты собраны' : discovered ? `Особая находка: ${special.name} (${Math.round(exp.specialGeodeChance*100)}%)` : `Особая находка: ??? (${Math.round(exp.specialGeodeChance*100)}%)`;
  
  let timerHtml = '';
  if (isActive) {
    const diff = Math.max(0, act.endTime - Date.now());
    timerHtml = `<div class="timer-badge" id="modalExpeditionTimer">⏳ Идёт: ${Math.floor(diff/60000)}:${String(Math.ceil((diff%60000)/1000)).padStart(2,'0')}</div>`;
  } else {
    timerHtml = '<div id="modalExpeditionTimer"></div>';
  }
  
  let scoutBtn = '';
  if (expId !== 'mine' && isActive) {
    const bonusUsed = !!playerState.expeditionBonuses?.[expId];
    const cd = (playerState.echoCooldowns?.[expId] || 0);
    const onCD = cd > Date.now() && !bonusUsed;
    scoutBtn = `<div style="margin-top:16px;"><button class="btn" id="scoutBtn-${expId}" ${bonusUsed || onCD ? 'disabled' : ''}>${bonusUsed ? '✅ Разведка проведена' : onCD ? `⏳ Перезарядка ${Math.ceil((cd - Date.now())/1000)}с` : '📡 РАЗВЕДКА'}</button></div>`;
  }
  
  const actionBtn = isActive ? `<div id="modalExpeditionAction">${timerHtml}${scoutBtn}</div>` : `<div id="modalExpeditionAction"><button class="btn" id="modalStartExpedition">⛏️ ОТПРАВИТЬСЯ</button></div>`;
  
  openModal(`
    <div class="modal-header"><div class="modal-title">${exp.name}</div><button class="modal-close" onclick="document.dispatchEvent(new Event('closeModal'))">✕</button></div>
    <div class="modal-content">
      <div class="modal-icon-large" id="modalExpeditionImage"></div>
      <div class="modal-description">${exp.description || 'Опасная, но прибыльная локация.'}</div>
      <div style="background:rgba(0,0,0,0.2);border-radius:24px;padding:18px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;"><span>⏱️ Время</span><span style="color:var(--accent-gold);">${exp.timer} сек</span></div>
        <div style="margin-top:12px;color:${completed?'#50C878':'var(--accent-gold)'};">${specialText}</div>
      </div>
      ${actionBtn}
    </div>`);
  
  currentModalExpId = expId;
  if (isActive) {
    modalTimerInterval = setInterval(() => { if (currentModalExpId) updateModalExpeditionTimer(currentModalExpId); else { clearInterval(modalTimerInterval); modalTimerInterval = null; } }, 500);
  }
  
  setTimeout(() => {
    renderImageToElement(document.getElementById('modalExpeditionImage'), exp.imagePath, exp.fallbackIcon, '#FFD700');
    // КНОПКА СТАРТА — ПРЯМОЙ ОБРАБОТЧИК
    const startBtn = document.getElementById('modalStartExpedition');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        console.log('[UI] Start expedition button clicked for:', expId);
        const success = startExpedition(expId);
        if (success) closeModal();
      });
    }
    // КНОПКА РАЗВЕДКИ
    const scout = document.getElementById(`scoutBtn-${expId}`);
    if (scout) scout.addEventListener('click', () => showScoutChoiceModal(expId));
  }, 10);
}

// ========== ОБНОВЛЕНИЕ UI ==========
export function updateProfileUI() {
  if (currentTab !== 'profile') return;
  const lvl = document.getElementById('profileLevel');
  if (lvl) lvl.textContent = playerState.player.level;
  const xpFill = document.getElementById('xpFill'), xpText = document.getElementById('xpText');
  if (xpFill && xpText) {
    const cur = playerState.player.xp, next = LEVELS[playerState.player.level] || LEVELS[LEVELS.length-1], prev = LEVELS[playerState.player.level-1] || 0;
    xpFill.style.width = Math.min(((cur-prev)/(next-prev))*100, 100) + '%';
    xpText.textContent = `${cur} / ${next} XP`;
  }
  const st = document.getElementById('profileStatus');
  if (st) st.textContent = STATUSES[Math.min(playerState.player.level-1, STATUSES.length-1)];
  document.getElementById('statOpened').textContent = playerState.player.totalOpened;
  document.getElementById('statIngots').textContent = playerState.player.totalIngots;
  document.getElementById('statArtifacts').textContent = playerState.player.totalArtifacts;
}

export function updateCollectionProgress() {
  if (currentTab !== 'collection') return;
  const total = Object.values(CONFIG_ITEMS).filter(i => !i.isCollectible).length;
  const disc = Object.values(CONFIG_ITEMS).filter(i => !i.isCollectible && playerState.minedStats[i.id] > 0).length;
  const fill = document.getElementById('collectionProgressFill'), text = document.getElementById('collectionProgressText');
  if (fill) fill.style.width = (disc/total*100) + '%';
  if (text) text.textContent = `${disc}/${total} открыто`;
}

// ========== РЕНДЕРИНГ ВКЛАДОК ==========
export function renderProfileTab() {
  if (isAnyOverlayActive()) return;
  const userName = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || 'Старатель';
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  const themeText = theme === 'dark' ? '🌙 Сменить тему (Светлая)' : '☀️ Сменить тему (Тёмная)';
  
  let html = `<div class="section-title">👤 Профиль</div><div class="card">
    <div class="profile-header"><div class="profile-avatar">👤</div><div class="profile-info">
      <div class="profile-name">${userName}</div><div class="profile-status" id="profileStatus">${STATUSES[Math.min(playerState.player.level-1,STATUSES.length-1)]}</div>
      <span class="level-badge" id="profileLevel">${playerState.player.level}</span> уровень
      <button class="dev-menu-btn" id="adminPanelBtn">🛠️ АДМИН</button></div></div>
    <div class="xp-bar-container"><div class="xp-bar-fill" id="xpFill" style="width:0%"></div></div>
    <div class="xp-text" id="xpText">${playerState.player.xp} / ${LEVELS[playerState.player.level]||15000} XP</div>
    <button class="theme-profile-btn" id="themeProfileBtn">${themeText}</button>
    <button class="vip-button" id="vipButton">💎 АКТИВИРОВАТЬ VIP</button>
    <button class="btn" id="leaderboardBtn" style="margin-top:12px;">🏆 ТОП ИГРОКОВ</button>
    <div class="stats-grid"><div class="stat-card"><div class="stat-value" id="statOpened">${playerState.player.totalOpened}</div><div class="stat-label">Открыто жеод</div></div>
    <div class="stat-card"><div class="stat-value" id="statIngots">${playerState.player.totalIngots}</div><div class="stat-label">Добыто слитков</div></div>
    <div class="stat-card"><div class="stat-value" id="statArtifacts">${playerState.player.totalArtifacts}</div><div class="stat-label">Артефактов</div></div></div></div>
    <div class="card sell-section"><div class="section-title">💰 Сбыт сырья</div>`;
  
  const avail = Object.entries(playerState.ingots).filter(([k,v]) => v > 0 && !CONFIG_ITEMS[k].isCollectible);
  if (!avail.length) html += '<div class="empty-state">Нет ресурсов для сдачи</div>';
  else avail.forEach(([k,v]) => { const ing = CONFIG_ITEMS[k]; html += `<div class="resource-item"><div class="resource-info"><div class="resource-icon" id="sell-icon-${k}"></div><div><div class="resource-name">${ing.name}</div><div class="resource-count">${v} шт. (+${ing.sellValue} XP/шт)</div></div></div><button class="sell-btn" data-sell="${k}">Сдать всё</button></div>`; });
  html += '</div>';
  
  mainContent.innerHTML = html;
  avail.forEach(([k]) => renderImageToElement(document.getElementById(`sell-icon-${k}`), CONFIG_ITEMS[k].imagePath, CONFIG_ITEMS[k].icon, CONFIG_ITEMS[k].fallbackColor));
  document.getElementById('themeProfileBtn').addEventListener('click', toggleTheme);
  document.querySelectorAll('[data-sell]').forEach(b => b.addEventListener('click', () => sellIngot(b.dataset.sell)));
  document.getElementById('vipButton').addEventListener('click', () => showToast('Оплата через Crypto Bot скоро будет доступна', '💎'));
  document.getElementById('leaderboardBtn')?.addEventListener('click', async () => { const { updateLeaderboard } = await import('./core.js'); updateLeaderboard(); });
  document.getElementById('adminPanelBtn').addEventListener('click', showAdminPanel);
  updateProfileUI();
}

export function renderExpeditionsTab() {
  if (isAnyOverlayActive()) return;
  let html = '<div class="section-title">⛏️ Экспедиции</div>';
  for (let k in CONFIG_EXPEDITIONS) {
    const exp = CONFIG_EXPEDITIONS[k];
    const act = playerState.expeditions[k] || { active: false };
    const locked = playerState.player.level < exp.requiredLevel;
    let timerHtml = locked ? `<span class="lock-icon">🔒</span> <span style="color:var(--text-muted);">Ур. ${exp.requiredLevel}</span>`
      : (act.active && act.endTime ? `<div class="timer-badge" id="timer-${k}">⏳ ${Math.floor(Math.max(0,act.endTime-Date.now())/60000)}:${String(Math.ceil((Math.max(0,act.endTime-Date.now())%60000)/1000)).padStart(2,'0')}</div>`
      : `<button class="small-btn" data-info-exp="${k}">Подробнее</button>`);
    html += `<div class="card"><div class="expedition-item ${locked?'locked':''}" data-expedition-click="${k}"><div class="expedition-info"><div class="expedition-icon" id="expedition-icon-${k}"></div><div class="expedition-text"><h3>${exp.name} ${locked?'🔒':''}</h3><p>⏱️ ${exp.timer} сек</p></div></div><div class="expedition-action">${timerHtml}</div></div></div>`;
  }
  mainContent.innerHTML = html;
  for (let k in CONFIG_EXPEDITIONS) renderImageToElement(document.getElementById(`expedition-icon-${k}`), CONFIG_EXPEDITIONS[k].imagePath, CONFIG_EXPEDITIONS[k].fallbackIcon, '#FFD700');
  document.querySelectorAll('[data-expedition-click]').forEach(el => el.addEventListener('click', function(e) {
    if (playerState.player.level < CONFIG_EXPEDITIONS[this.dataset.expeditionClick].requiredLevel) { showToast(`Требуется ${CONFIG_EXPEDITIONS[this.dataset.expeditionClick].requiredLevel} уровень!`, '🔒'); return; }
    if (!e.target.classList.contains('small-btn')) showExpeditionInfoModal(this.dataset.expeditionClick);
  }));
  document.querySelectorAll('[data-info-exp]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); showExpeditionInfoModal(b.dataset.infoExp); }));
}

export function renderInventoryTab() {
  if (isAnyOverlayActive()) return;
  let html = `<div class="section-title">🎒 Инвентарь</div><div class="inventory-subtabs"><button class="subtab-btn ${inventorySubTab==='geodes'?'active':''}" data-subtab="geodes">🪨 Жеоды</button><button class="subtab-btn ${inventorySubTab==='ingots'?'active':''}" data-subtab="ingots">✨ Слитки</button></div>`;
  if (inventorySubTab === 'geodes') {
    const items = Object.entries(playerState.geodes).filter(([_,c]) => c > 0);
    html += items.length ? '<div class="grid-container">' + items.map(([k,c]) => `<div class="collection-card" data-geode="${k}"><div class="card-icon" id="inv-geode-${k}"></div><div class="card-name">${CONFIG_GEODES[k].name}</div><div class="card-count-badge">${c} шт.</div></div>`).join('') + '</div>' : '<div class="empty-state">Нет жеод. Отправьте экспедицию.</div>';
    mainContent.innerHTML = html;
    for (let k in CONFIG_GEODES) { const el = document.getElementById(`inv-geode-${k}`); if (el && playerState.geodes[k] > 0) renderImageToElement(el, CONFIG_GEODES[k].stages[0].imagePath, CONFIG_GEODES[k].stages[0].fallbackIcon, '#8B7355'); }
  } else {
    const items = Object.entries(playerState.ingots).filter(([k,c]) => c > 0 && !CONFIG_ITEMS[k].isCollectible);
    html += items.length ? '<div class="grid-container">' + items.map(([k,c]) => `<div class="collection-card" data-ingot="${k}"><div class="card-icon" id="inv-ingot-${k}"></div><div class="card-name">${CONFIG_ITEMS[k].name}</div><div class="card-count-badge">${c} шт.</div></div>`).join('') + '</div>' : '<div class="empty-state">Нет слитков. Откройте жеоды.</div>';
    mainContent.innerHTML = html;
    for (let k in CONFIG_ITEMS) { if (CONFIG_ITEMS[k].isCollectible) continue; const el = document.getElementById(`inv-ingot-${k}`); if (el && playerState.ingots[k] > 0) renderImageToElement(el, CONFIG_ITEMS[k].imagePath, CONFIG_ITEMS[k].icon, CONFIG_ITEMS[k].fallbackColor); }
  }
  document.querySelectorAll('[data-subtab]').forEach(b => b.addEventListener('click', () => { inventorySubTab = b.dataset.subtab; renderInventoryTab(); }));
  document.querySelectorAll('[data-geode]').forEach(c => c.addEventListener('click', () => showGeodeModal(c.dataset.geode)));
  document.querySelectorAll('[data-ingot]').forEach(c => c.addEventListener('click', () => openShowcase(c.dataset.ingot)));
}

export function renderCollectionTab() {
  if (isAnyOverlayActive()) return;
  const total = Object.values(CONFIG_ITEMS).filter(i => !i.isCollectible).length;
  const disc = Object.values(CONFIG_ITEMS).filter(i => !i.isCollectible && playerState.minedStats[i.id] > 0).length;
  let html = `<div class="section-title">📦 Коллекция</div><div class="collection-progress"><div class="progress-bar-container"><div class="progress-bar-fill" id="collectionProgressFill" style="width:${disc/total*100}%"></div></div><div class="progress-text" id="collectionProgressText">${disc}/${total} открыто</div></div><div class="inventory-subtabs"><button class="subtab-btn ${collectionSubTab==='encyclopedia'?'active':''}" data-subtab="encyclopedia">📚 Энциклопедия</button><button class="subtab-btn ${collectionSubTab==='halloffame'?'active':''}" data-subtab="halloffame">🏆 Зал Славы</button></div>`;
  
  if (collectionSubTab === 'encyclopedia') {
    html += '<div class="grid-container">';
    Object.values(CONFIG_ITEMS).filter(i => !i.isCollectible).forEach(ing => {
      const d = playerState.minedStats[ing.id] > 0;
      html += `<div class="collection-card ${d?'':'silhouette'}" data-ingot="${ing.id}"><div class="card-icon" id="enc-${ing.id}"></div><div class="card-name">${d?ing.name:'Неизвестный материал'}</div><div class="card-count-badge">${d?`Добыто: ${playerState.minedStats[ing.id]}`:'???'}</div></div>`;
    });
    html += '</div>';
    mainContent.innerHTML = html;
    Object.values(CONFIG_ITEMS).filter(i => !i.isCollectible).forEach(ing => {
      const el = document.getElementById(`enc-${ing.id}`);
      if (el) playerState.minedStats[ing.id] > 0 ? renderImageToElement(el, ing.imagePath, ing.icon, ing.fallbackColor) : renderMysteryPlaceholder(el);
    });
  } else {
    html += '<div class="grid-container">';
    Object.values(CONFIG_ITEMS).filter(i => i.isCollectible).forEach(ing => {
      const o = playerState.ingots[ing.id] > 0;
      html += `<div class="collection-card ${o?'':'silhouette'}" data-ingot="${ing.id}"><div class="card-icon" id="hall-${ing.id}"></div><div class="card-name">${o?ing.name:'???'}</div><div class="card-count-badge">${o?'★ Найдено':'Неизвестно'}</div></div>`;
    });
    html += '</div>';
    mainContent.innerHTML = html;
    Object.values(CONFIG_ITEMS).filter(i => i.isCollectible).forEach(ing => {
      const el = document.getElementById(`hall-${ing.id}`);
      if (el) playerState.ingots[ing.id] > 0 ? renderImageToElement(el, ing.imagePath, ing.icon, ing.fallbackColor) : renderMysteryPlaceholder(el);
    });
  }
  document.querySelectorAll('[data-subtab]').forEach(b => b.addEventListener('click', () => { collectionSubTab = b.dataset.subtab; renderCollectionTab(); }));
  document.querySelectorAll('[data-ingot]').forEach(c => c.addEventListener('click', () => openShowcase(c.dataset.ingot, !playerState.minedStats[CONFIG_ITEMS[c.dataset.ingot].id] && !CONFIG_ITEMS[c.dataset.ingot].isCollectible)));
}

export function renderEventsTab() {
  if (isAnyOverlayActive()) return;
  const event = eventsManager.getActiveEvent();
  const timeLeft = event ? eventsManager.getTimeLeft() : '0:00';
  const phase = eventsManager.eventPhase;
  let html = '<div class="section-title">📡 Ивенты</div>';
  
  if (event && phase === 'active') {
    if (event.type === 'great_smelt') {
      html += `<div class="card" style="border:2px solid rgba(255,100,0,0.4);background:rgba(255,50,0,0.05);position:relative;overflow:hidden;"><div style="position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(circle at 50% 0%,rgba(255,100,0,0.1) 0%,transparent 70%);pointer-events:none;"></div><div class="event-icon" style="font-size:72px;margin-bottom:16px;">${event.icon}</div><div class="event-title" style="color:var(--accent-orange);font-size:22px;margin-bottom:8px;">${event.name}</div><div class="event-desc" style="color:var(--text-primary);font-size:14px;line-height:1.6;margin-bottom:16px;">${event.longDescription||event.description}</div><div style="background:rgba(0,0,0,0.3);border-radius:20px;padding:14px;margin-bottom:16px;display:flex;align-items:center;justify-content:center;gap:10px;"><span style="font-size:24px;">⏳</span><span style="font-family:'Unbounded',sans-serif;font-size:20px;font-weight:700;color:var(--accent-gold);" id="eventTimer">${timeLeft}</span><span style="font-size:12px;color:var(--text-secondary);">до завершения</span></div><button class="forge-smelt-btn" id="enterForgeBtn" style="width:100%;">⚡ ВОЙТИ В ПЛАВИЛЬНЮ</button><div style="margin-top:12px;text-align:center;color:var(--text-muted);font-size:11px;">Доступны рецепты: 🌑 Чёрное Зеркало · 🛰️ Астро-Бронза · 🛡️ Хромированный Титан · 💎 Платиновый Сплав</div></div>`;
    } else if (event.type === 'meteor_storm') {
      html += `<div class="card" style="border:2px solid rgba(180,0,255,0.4);background:rgba(100,0,200,0.05);position:relative;overflow:hidden;"><div style="position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(circle at 50% 0%,rgba(180,0,255,0.1) 0%,transparent 70%);pointer-events:none;"></div><div class="event-icon" style="font-size:72px;margin-bottom:16px;">${event.icon}</div><div class="event-title" style="color:#B400FF;font-size:22px;margin-bottom:8px;">${event.name}</div><div class="event-desc" style="color:var(--text-primary);font-size:14px;line-height:1.6;margin-bottom:16px;">${event.longDescription||event.description}</div><div style="background:rgba(0,0,0,0.3);border-radius:20px;padding:14px;margin-bottom:16px;display:flex;align-items:center;justify-content:center;gap:10px;"><span style="font-size:24px;">⏳</span><span style="font-family:'Unbounded',sans-serif;font-size:20px;font-weight:700;color:var(--accent-gold);" id="eventTimer">${timeLeft}</span><span style="font-size:12px;color:var(--text-secondary);">до завершения</span></div><button class="btn" id="enterMeteorStormBtn" style="width:100%;background:linear-gradient(135deg,#B400FF,#FFD700);box-shadow:0 4px 25px rgba(180,0,255,0.4);">☄️ ВОЙТИ В ШТОРМ</button><div style="margin-top:12px;text-align:center;color:var(--text-muted);font-size:11px;">Лови метеориты: ✨ Легендарные · 🔥 Редкие · ☄️ Обычные<br>Обменяй на жеоды: 2 легендарных / 4 редких / 6 обычных</div></div>`;
    }
  } else if (phase === 'ending') {
    html += '<div class="event-placeholder"><div class="event-icon">❄️</div><div class="event-title">Ивент завершён</div><div class="event-desc">Дождитесь следующего ивента.</div></div>';
  } else {
    html += '<div class="event-placeholder"><div class="event-icon">🛰️</div><div class="event-title">Ожидание ивента</div><div class="event-desc">Ивенты запускаются автоматически.</div></div>';
  }
  
  mainContent.innerHTML = html;
  document.getElementById('enterForgeBtn')?.addEventListener('click', openForge);
  document.getElementById('enterMeteorStormBtn')?.addEventListener('click', openMeteorStorm);
  startEventTabInterval();
}

function startEventTabInterval() {
  if (eventTabInterval) { clearInterval(eventTabInterval); eventTabInterval = null; }
  eventTabInterval = setInterval(() => {
    if (currentTab !== 'events' || isAnyOverlayActive()) { clearInterval(eventTabInterval); eventTabInterval = null; return; }
    const timerEl = document.getElementById('eventTimer');
    const event = eventsManager.getActiveEvent();
    if (timerEl && event && eventsManager.eventPhase === 'active') timerEl.textContent = eventsManager.getTimeLeft();
    if (event && eventsManager.eventEndTime && Date.now() >= eventsManager.eventEndTime && eventsManager.eventPhase === 'active') eventsManager.endEvent();
  }, 1000);
}

export function renderCurrentTab() {
  if (isAnyOverlayActive()) return;
  if (currentTab === 'expeditions') renderExpeditionsTab();
  else if (currentTab === 'inventory') renderInventoryTab();
  else if (currentTab === 'collection') renderCollectionTab();
  else if (currentTab === 'events') renderEventsTab();
  else if (currentTab === 'profile') renderProfileTab();
}

export function setActiveTab(tabId) {
  if (isAnyOverlayActive()) return;
  currentTab = tabId;
  document.querySelectorAll('.tab-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  renderCurrentTab();
}
