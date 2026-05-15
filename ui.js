// ========== UI МОДУЛЬ: ОТРИСОВКА ИНТЕРФЕЙСА ==========
import { CONFIG_ITEMS, CONFIG_GEODES, CONFIG_EXPEDITIONS, LEVELS, STATUSES, EVENTS_CONFIG } from './config.js';
import { playerState, getSerialForCollectible, isLocationCompleted, sellIngot, startExpedition, openBrawlOverlay, eventsManager, saveGame, devGiveXP, devGiveGeodes, devUnlockLocations, devResetGeodes, startSignalGame, exchangeSpecialGeodeForXP, openForge, sendBotNotification, openMeteorStorm, claimMeteorStormRewards, exitMeteorStormEarly, meteorStormState, terminateEvent, setActiveOverlay, clearActiveOverlay, isAnyOverlayActive } from './core.js';

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
let currentModalExpId = null;

// ID интервала для вкладки ивентов
let eventTabInterval = null;

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
        if (newTheme === 'dark') {
            btn.innerHTML = '🌙 Сменить тему (Светлая)';
        } else {
            btn.innerHTML = '☀️ Сменить тему (Тёмная)';
        }
    }
}

initTheme();

// ---------- УТИЛИТЫ РЕНДЕРИНГА (ЭМОДЗИ-ЗАГЛУШКИ) ----------
export function renderImageToElement(el, src, fallbackIcon, fallbackColor) {
    if (!el) {
        return;
    }

    // Сначала показываем эмодзи-заглушку
    el.innerHTML = '';
    const fb = document.createElement('span');
    fb.className = 'fallback-icon';
    fb.textContent = fallbackIcon;
    fb.style.color = fallbackColor || '#FFD700';
    if (el.classList.contains('card-icon')) {
        fb.style.fontSize = '40px';
    } else {
        fb.style.fontSize = 'inherit';
    }
    el.appendChild(fb);

    // Потом пытаемся загрузить картинку
    const img = new Image();
    img.onload = function() {
        el.innerHTML = '';
        const i = document.createElement('img');
        i.src = src;
        i.alt = '';
        el.appendChild(i);
    };
    img.onerror = function() {
        // Оставляем эмодзи-заглушку
    };
    img.src = src;
}

export function renderMysteryPlaceholder(el) {
    if (!el) {
        return;
    }
    el.innerHTML = '<span style="font-size:40px; color:var(--text-muted);">?</span>';
}

export function getGeodeStageImage(geodeId, taps) {
    const g = CONFIG_GEODES[geodeId];
    if (!g) {
        return {
            imagePath: '',
            fallbackIcon: '🪨'
        };
    }

    for (let i = 0; i < g.stages.length; i = i + 1) {
        const s = g.stages[i];
        if (taps >= s.minTaps && taps <= s.maxTaps) {
            return {
                imagePath: s.imagePath,
                fallbackIcon: s.fallbackIcon
            };
        }
    }

    return {
        imagePath: g.stages[0].imagePath,
        fallbackIcon: g.stages[0].fallbackIcon
    };
}

export function showToast(msg, emoji) {
    if (emoji === undefined) {
        emoji = '✨';
    }

    const c = document.getElementById('toastContainer');
    if (!c) {
        return;
    }

    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span>' + emoji + '</span> ' + msg;
    c.appendChild(t);

    setTimeout(function() {
        t.style.opacity = '0';
        setTimeout(function() {
            t.remove();
        }, 300);
    }, 2500);
}

// ---------- REWARD POPUP ----------
export function showRewardPopup(ingot) {
    const overlay = document.getElementById('rewardPopupOverlay');
    const iconEl = document.getElementById('rewardPopupIcon');
    const nameEl = document.getElementById('rewardPopupName');
    const closeBtn = document.getElementById('rewardPopupClose');

    setActiveOverlay('rewardPopup');

    renderImageToElement(iconEl, ingot.imagePath, ingot.icon, ingot.fallbackColor);
    nameEl.textContent = ingot.name;

    overlay.classList.add('active');

    const closeHandler = function() {
        overlay.classList.remove('active');
        clearActiveOverlay('rewardPopup');
        closeBtn.removeEventListener('click', closeHandler);
    };
    closeBtn.addEventListener('click', closeHandler);
}

// ---------- МЕТЕОРИТНЫЙ ШТОРМ UI ----------
export function renderMeteorStormUI() {
    const timerEl = document.getElementById('meteorStormTimer');
    const legendaryEl = document.getElementById('meteorCountLegendary');
    const rareEl = document.getElementById('meteorCountRare');
    const commonEl = document.getElementById('meteorCountCommon');

    if (timerEl) {
        timerEl.textContent = meteorStormState.timer;
        timerEl.style.color = '#FFD700';
        timerEl.style.textShadow = '0 0 20px rgba(255,215,0,0.5)';
    }
    if (legendaryEl) {
        legendaryEl.textContent = meteorStormState.captured.legendary;
    }
    if (rareEl) {
        rareEl.textContent = meteorStormState.captured.rare;
    }
    if (commonEl) {
        commonEl.textContent = meteorStormState.captured.common;
    }
}

export function updateMeteorStormUI() {
    const timerEl = document.getElementById('meteorStormTimer');
    const legendaryEl = document.getElementById('meteorCountLegendary');
    const rareEl = document.getElementById('meteorCountRare');
    const commonEl = document.getElementById('meteorCountCommon');

    if (timerEl) {
        timerEl.textContent = meteorStormState.timer;
        if (meteorStormState.timer <= 5) {
            timerEl.style.color = '#FF4444';
            timerEl.style.textShadow = '0 0 30px rgba(255,68,68,0.8)';
        } else {
            timerEl.style.color = '#FFD700';
            timerEl.style.textShadow = '0 0 20px rgba(255,215,0,0.5)';
        }
    }
    if (legendaryEl) {
        legendaryEl.textContent = meteorStormState.captured.legendary;
    }
    if (rareEl) {
        rareEl.textContent = meteorStormState.captured.rare;
    }
    if (commonEl) {
        commonEl.textContent = meteorStormState.captured.common;
    }
}

export function showMeteorStormResult(data) {
    const overlay = document.getElementById('meteorStormResultOverlay');
    const legendaryEl = document.getElementById('meteorResultLegendary');
    const rareEl = document.getElementById('meteorResultRare');
    const commonEl = document.getElementById('meteorResultCommon');
    const xpEl = document.getElementById('meteorResultXP');

    if (legendaryEl) {
        legendaryEl.textContent = data.legendaryGeodes;
    }
    if (rareEl) {
        rareEl.textContent = data.rareGeodes;
    }
    if (commonEl) {
        commonEl.textContent = data.commonGeodes;
    }
    if (xpEl) {
        xpEl.textContent = data.totalXP;
    }

    overlay.classList.add('active');

    const claimBtn = document.getElementById('meteorStormClaimBtn');
    if (claimBtn) {
        const newClaimBtn = claimBtn.cloneNode(true);
        claimBtn.parentNode.replaceChild(newClaimBtn, claimBtn);
        newClaimBtn.addEventListener('click', function() {
            claimMeteorStormRewards();
        });
    }
}

// ---------- SHOWCASE (ПОЛНОЭКРАННЫЙ ПРОСМОТР) ----------
export function openShowcase(ingotId, isMystery) {
    if (isMystery === undefined) {
        isMystery = false;
    }

    if (isAnyOverlayActive()) {
        return;
    }

    const ingot = CONFIG_ITEMS[ingotId];
    if (!ingot) {
        return;
    }

    setActiveOverlay('showcase');

    const owned = playerState.ingots[ingotId] > 0;
    const discovered = playerState.minedStats[ingotId] > 0;

    let name = ingot.name;
    let desc = ingot.description;
    let rarity = ingot.rarity;
    let rarityClass = ingot.rarityClass;
    let idHtml = '';

    if (!discovered && !ingot.isCollectible) {
        name = 'Неизвестный материал';
        const locationName = CONFIG_EXPEDITIONS[ingot.location] ? CONFIG_EXPEDITIONS[ingot.location].name : 'неизвестной локации';
        desc = 'Месторождение: ' + locationName;
        rarity = '???';
        rarityClass = 'common';
        idHtml = '<div class="showcase-id"><span class="showcase-id-label">Статус</span><span class="showcase-id-value" style="color:var(--text-muted);">НЕ ИЗУЧЕН</span></div>';
    } else if (!owned && ingot.isCollectible) {
        name = 'Неизвестный Артефакт';
        if (ingot.location === 'mine') {
            desc = 'Глубины Шахт скрывают этот секрет.';
        } else if (ingot.location === 'jungle') {
            desc = 'Джунгли ревностно охраняют эту тайну.';
        } else if (ingot.location === 'craft') {
            desc = 'Создаётся в горниле Великой Переплавки.';
        } else {
            desc = 'Пояс Астероидов хранит это сокровище.';
        }
        rarity = '???';
        rarityClass = 'common';
        idHtml = '<div class="showcase-id"><span class="showcase-id-label">Статус</span><span class="showcase-id-value" style="color:var(--text-muted);">НЕ ОТКРЫТ</span></div>';
    } else {
        if (ingot.isCollectible) {
            idHtml = '<div class="showcase-serial"><span class="showcase-serial-label">Серийный номер</span><span class="showcase-serial-value">#' + getSerialForCollectible(ingotId) + '</span></div>';
        } else {
            idHtml = '<div class="showcase-id"><span class="showcase-id-label">Добыто всего</span><span class="showcase-id-value">' + (playerState.minedStats[ingotId] || 0) + ' ед.</span></div>';
        }
    }

    let html = '';
    html = html + '<div class="showcase-image" id="showcaseImage"></div>';
    html = html + '<div class="showcase-info">';
    html = html + '<div class="showcase-name">' + name + '</div>';
    html = html + '<div class="showcase-rarity ' + rarityClass + '">' + rarity + '</div>';
    html = html + idHtml;
    html = html + '<div class="showcase-description">' + desc + '</div>';
    html = html + '<div class="showcase-count">';
    if (owned) {
        html = html + 'В наличии: ' + playerState.ingots[ingotId] + ' шт.';
    } else {
        html = html + 'Ещё не найден';
    }
    html = html + '</div>';
    html = html + '</div>';

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
    clearActiveOverlay('showcase');
}

// ---------- АДМИН-ПАНЕЛЬ ----------
function showAdminPanel() {
    let html = '';
    html = html + '<div class="modal-header">';
    html = html + '<div class="modal-title">🛠️ Админ-панель</div>';
    html = html + '<button class="modal-close" onclick="document.dispatchEvent(new Event(\'closeModal\'))">✕</button>';
    html = html + '</div>';
    html = html + '<div class="modal-content" style="text-align:left;">';
    html = html + '<div style="margin-bottom:12px; font-weight:600; color:var(--accent-gold);">⚡ Быстрые действия</div>';
    html = html + '<button class="btn" id="adminMaxXP" style="margin-bottom:6px;">🌟 Дать 1M XP</button>';
    html = html + '<button class="btn" id="adminUnlockAll" style="margin-bottom:6px;">🔓 Открыть все локации (ур.10)</button>';
    html = html + '<button class="btn" id="adminFillGeodes" style="margin-bottom:6px;">🪨 +10 всех жеод</button>';
    html = html + '<button class="btn" id="adminFillIngots" style="margin-bottom:6px;">✨ +10 всех обычных слитков</button>';
    html = html + '<button class="btn" id="adminFillArtifacts" style="margin-bottom:6px;">💎 +1 всех коллекционных артефактов</button>';
    html = html + '<div style="margin:20px 0; font-weight:600; color:var(--accent-gold);">⏱️ Ивенты</div>';
    html = html + '<button class="btn" id="adminTriggerSmelt" style="margin-bottom:8px;">🔥 Запустить Переплавку</button>';
    html = html + '<button class="btn" id="adminTriggerStorm" style="margin-bottom:8px;">☄️ Запустить Метеоритный Шторм</button>';
    html = html + '<button class="btn" id="adminEndEvent" style="margin-bottom:8px;">❄️ Завершить ивент</button>';
    html = html + '<div style="margin:20px 0; font-weight:600; color:var(--accent-gold);">🔧 Отдельные жеоды (+5 шт.)</div>';
    html = html + '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">';

    Object.entries(CONFIG_GEODES).forEach(function(entry) {
        const id = entry[0];
        const g = entry[1];
        html = html + '<button class="small-btn admin-add-geode" data-geode="' + id + '" style="font-size:10px;">' + g.stages[0].fallbackIcon + ' ' + g.name + '</button>';
    });

    html = html + '</div>';
    html = html + '<div style="margin:20px 0; font-weight:600; color:var(--accent-gold);">✨ Отдельные слитки (+10 шт.)</div>';
    html = html + '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">';

    Object.entries(CONFIG_ITEMS).filter(function(entry) {
        return !entry[1].isCollectible;
    }).forEach(function(entry) {
        const id = entry[0];
        const ing = entry[1];
        html = html + '<button class="small-btn admin-add-ingot" data-ingot="' + id + '" style="font-size:10px;">' + ing.icon + ' ' + ing.name + '</button>';
    });

    html = html + '</div>';
    html = html + '</div>';

    openModal(html);

    setTimeout(function() {
        document.getElementById('adminMaxXP')?.addEventListener('click', function() {
            devGiveXP();
            saveGame();
            showToast('+1M XP!', '🌟');
            closeModal();
        });

        document.getElementById('adminUnlockAll')?.addEventListener('click', function() {
            devUnlockLocations();
            saveGame();
            showToast('Локации открыты (уровень 10)!', '🔓');
            closeModal();
        });

        document.getElementById('adminFillGeodes')?.addEventListener('click', function() {
            devGiveGeodes();
            saveGame();
            showToast('+10 жеод всех типов!', '🪨');
            closeModal();
        });

        document.getElementById('adminFillIngots')?.addEventListener('click', function() {
            Object.keys(CONFIG_ITEMS).forEach(function(id) {
                if (!CONFIG_ITEMS[id].isCollectible) {
                    playerState.ingots[id] = (playerState.ingots[id] || 0) + 10;
                    playerState.minedStats[id] = (playerState.minedStats[id] || 0) + 10;
                }
            });
            playerState.player.totalIngots = playerState.player.totalIngots + Object.keys(CONFIG_ITEMS).filter(function(id) {
                return !CONFIG_ITEMS[id].isCollectible;
            }).length * 10;
            saveGame();
            showToast('+10 слитков каждого типа!', '✨');
            closeModal();
        });

        document.getElementById('adminFillArtifacts')?.addEventListener('click', function() {
            Object.keys(CONFIG_ITEMS).forEach(function(id) {
                if (CONFIG_ITEMS[id].isCollectible && CONFIG_ITEMS[id].location !== 'craft') {
                    playerState.ingots[id] = (playerState.ingots[id] || 0) + 1;
                    playerState.minedStats[id] = (playerState.minedStats[id] || 0) + 1;
                }
            });
            playerState.player.totalArtifacts = playerState.player.totalArtifacts + 6;
            saveGame();
            showToast('+1 артефакт каждого типа!', '💎');
            closeModal();
        });

        document.getElementById('adminTriggerSmelt')?.addEventListener('click', function() {
            eventsManager.triggerGreatSmelt();
            saveGame();
            showToast('Переплавка запущена!', '🔥');
            closeModal();
        });

        document.getElementById('adminTriggerStorm')?.addEventListener('click', function() {
            eventsManager.triggerMeteorStorm();
            saveGame();
            showToast('Метеоритный Шторм запущен!', '☄️');
            closeModal();
        });

        document.getElementById('adminEndEvent')?.addEventListener('click', function() {
            eventsManager.endEvent();
            saveGame();
            showToast('Ивент завершён!', '❄️');
            closeModal();
        });

        document.querySelectorAll('.admin-add-geode').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const id = btn.dataset.geode;
                playerState.geodes[id] = (playerState.geodes[id] || 0) + 5;
                saveGame();
                showToast('+5 ' + CONFIG_GEODES[id].name, '🪨');
                closeModal();
            });
        });

        document.querySelectorAll('.admin-add-ingot').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const id = btn.dataset.ingot;
                playerState.ingots[id] = (playerState.ingots[id] || 0) + 10;
                playerState.minedStats[id] = (playerState.minedStats[id] || 0) + 10;
                playerState.player.totalIngots = playerState.player.totalIngots + 10;
                saveGame();
                showToast('+10 ' + CONFIG_ITEMS[id].name, '✨');
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
    currentModalExpId = null;

    modalContent.innerHTML = html;
    modalOverlay.classList.add('active');

    modalOverlay.onclick = function(e) {
        if (e.target === modalOverlay) {
            closeModal();
        }
    };
}

export function closeModal() {
    if (modalTimerInterval) {
        clearInterval(modalTimerInterval);
        modalTimerInterval = null;
    }
    currentModalExpId = null;

    modalOverlay.classList.remove('active');
    modalContent.innerHTML = '';
}

export function showGeodeModal(geodeId) {
    const g = CONFIG_GEODES[geodeId];
    if (!g) {
        return;
    }

    let lootHtml = '';
    if (g.isSpecial) {
        lootHtml = '<div style="text-align:center; padding:20px; color:var(--accent-gold);">✨ Гарантированно содержит один из коллекционных артефактов локации ✨</div>';
    } else {
        g.lootTable.forEach(function(e) {
            const ing = CONFIG_ITEMS[e.ingotId];
            lootHtml = lootHtml + '<div class="loot-row">';
            lootHtml = lootHtml + '<div class="loot-left">';
            lootHtml = lootHtml + '<div class="loot-icon" id="loot-' + e.ingotId + '"></div>';
            lootHtml = lootHtml + '<span>' + ing.name + '</span>';
            lootHtml = lootHtml + '</div>';
            lootHtml = lootHtml + '<div class="loot-chance">' + Math.round(e.chance * 100) + '%</div>';
            lootHtml = lootHtml + '</div>';
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

    let html = '';
    html = html + '<div class="modal-header">';
    html = html + '<div class="modal-title">' + g.name + '</div>';
    html = html + '<button class="modal-close" onclick="document.dispatchEvent(new Event(\'closeModal\'))">✕</button>';
    html = html + '</div>';
    html = html + '<div class="modal-content">';
    html = html + '<div class="modal-icon-large" id="modalGeodeImage"></div>';
    html = html + '<div class="modal-description">' + g.description + '</div>';
    html = html + '<div class="loot-table">';
    html = html + '<div style="margin-bottom:16px; font-weight:700;">';
    if (g.isSpecial) {
        html = html + 'Особая находка';
    } else {
        html = html + 'Возможная добыча';
    }
    html = html + '</div>';
    html = html + lootHtml;
    html = html + '</div>';
    html = html + '<div style="margin:20px 0; color:var(--text-secondary);">В инвентаре: ' + (playerState.geodes[geodeId] || 0) + ' шт.</div>';
    html = html + '<button class="btn" id="modalOpenGeodeBtn" data-geode="' + geodeId + '" data-special="' + g.isSpecial + '">' + openButtonText + '</button>';
    html = html + '</div>';

    openModal(html);

    setTimeout(function() {
        renderImageToElement(document.getElementById('modalGeodeImage'), g.stages[0].imagePath, g.stages[0].fallbackIcon, '#8B7355');

        if (!g.isSpecial) {
            g.lootTable.forEach(function(e) {
                const el = document.getElementById('loot-' + e.ingotId);
                if (el) {
                    const ing = CONFIG_ITEMS[e.ingotId];
                    renderImageToElement(el, ing.imagePath, ing.icon, ing.fallbackColor);
                }
            });
        }

        document.getElementById('modalOpenGeodeBtn').addEventListener('click', function() {
            closeModal();
            const isSpecial = this.dataset.special === 'true';
            const gId = this.dataset.geode;

            if (isSpecial) {
                const gObj = CONFIG_GEODES[gId];
                const completed = isLocationCompleted(gObj.location);
                if (completed) {
                    exchangeSpecialGeodeForXP(gId);
                } else {
                    openBrawlOverlay(gId, true);
                }
            } else {
                openBrawlOverlay(gId, false);
            }
        });
    }, 10);
}

// ---------- МОДАЛКА ЭКСПЕДИЦИИ ----------
function updateModalExpeditionTimer(expId) {
    const timerEl = document.getElementById('modalExpeditionTimer');
    const actionBtnEl = document.getElementById('modalExpeditionAction');
    if (!timerEl || !actionBtnEl) {
        return;
    }

    const exp = playerState.expeditions[expId];
    if (!exp || !exp.active || !exp.endTime) {
        actionBtnEl.innerHTML = '<button class="btn" id="modalStartExpedition">⛏️ ОТПРАВИТЬСЯ</button>';
        const startBtn = document.getElementById('modalStartExpedition');
        if (startBtn) {
            startBtn.addEventListener('click', function() {
                console.log('[UI] Start expedition from modal timer:', expId);
                const success = startExpedition(expId);
                if (success) {
                    closeModal();
                }
            });
        }
        if (modalTimerInterval) {
            clearInterval(modalTimerInterval);
            modalTimerInterval = null;
        }
        return;
    }

    const now = Date.now();
    const diff = Math.max(0, exp.endTime - now);

    if (diff <= 0) {
        actionBtnEl.innerHTML = '<button class="btn" id="modalStartExpedition">⛏️ ОТПРАВИТЬСЯ</button>';
        const startBtn = document.getElementById('modalStartExpedition');
        if (startBtn) {
            startBtn.addEventListener('click', function() {
                console.log('[UI] Start expedition from modal timer (completed):', expId);
                const success = startExpedition(expId);
                if (success) {
                    closeModal();
                }
            });
        }
        if (modalTimerInterval) {
            clearInterval(modalTimerInterval);
            modalTimerInterval = null;
        }
        return;
    }

    const m = Math.floor(diff / 60000);
    const s = Math.ceil((diff % 60000) / 1000);
    timerEl.textContent = '⏳ Идёт: ' + m + ':' + s.toString().padStart(2, '0');
}

function showScoutChoiceModal(expId) {
    let html = '';
    html = html + '<div class="modal-header">';
    html = html + '<div class="modal-title">📡 Выберите разведку</div>';
    html = html + '<button class="modal-close" onclick="document.dispatchEvent(new Event(\'closeModal\'))">✕</button>';
    html = html + '</div>';
    html = html + '<div class="modal-content">';
    html = html + '<div class="modal-description">Выберите один бонус для текущей экспедиции:</div>';
    html = html + '<button class="btn" id="chooseEcho-' + expId + '" style="margin-bottom:12px;">📡 Эхо-локатор (-15% времени)</button>';
    html = html + '<button class="btn" id="chooseScan-' + expId + '">🔬 Глубинное сканирование (+20% шанс Особой)</button>';
    html = html + '</div>';

    openModal(html);

    document.getElementById('chooseEcho-' + expId)?.addEventListener('click', function() {
        closeModal();
        startSignalGame(expId, 'echo');
    });

    document.getElementById('chooseScan-' + expId)?.addEventListener('click', function() {
        closeModal();
        startSignalGame(expId, 'scan');
    });
}

export function showExpeditionInfoModal(expId) {
    if (modalTimerInterval) {
        clearInterval(modalTimerInterval);
        modalTimerInterval = null;
    }

    const exp = CONFIG_EXPEDITIONS[expId];
    if (!exp) {
        return;
    }

    if (playerState.player.level < exp.requiredLevel) {
        showToast('Требуется ' + exp.requiredLevel + ' уровень!', '🔒');
        return;
    }

    const act = playerState.expeditions[expId];
    const isActive = act && act.active && act.endTime && Date.now() < act.endTime;
    const completed = isLocationCompleted(expId);
    const special = CONFIG_GEODES[exp.specialGeodeId];
    const discovered = playerState.discoveredSpecialGeodes[expId];

    let specialText = '';
    if (completed) {
        specialText = '✅ Все артефакты собраны';
    } else if (discovered) {
        specialText = 'Особая находка: ' + special.name + ' (' + Math.round(exp.specialGeodeChance * 100) + '%)';
    } else {
        specialText = 'Особая находка: ??? (' + Math.round(exp.specialGeodeChance * 100) + '%)';
    }

    let timerHtml = '';
    if (isActive) {
        const diff = Math.max(0, act.endTime - Date.now());
        const m = Math.floor(diff / 60000);
        const s = Math.ceil((diff % 60000) / 1000);
        timerHtml = '<div class="timer-badge" id="modalExpeditionTimer">⏳ Идёт: ' + m + ':' + s.toString().padStart(2, '0') + '</div>';
    } else {
        timerHtml = '<div id="modalExpeditionTimer"></div>';
    }

    let scoutButton = '';
    if (expId !== 'mine' && isActive) {
        const bonusUsed = playerState.expeditionBonuses && playerState.expeditionBonuses[expId] !== undefined;
        const echoCooldown = playerState.echoCooldowns ? (playerState.echoCooldowns[expId] || 0) : 0;
        const now = Date.now();
        const onCooldown = echoCooldown > now && !bonusUsed;
        const cooldownRemaining = onCooldown ? Math.ceil((echoCooldown - now) / 1000) : 0;

        scoutButton = '<div style="margin-top:16px;">';
        scoutButton = scoutButton + '<button class="btn" id="scoutBtn-' + expId + '" ';

        if (bonusUsed || onCooldown) {
            scoutButton = scoutButton + 'disabled';
        }

        scoutButton = scoutButton + '>';

        if (bonusUsed) {
            scoutButton = scoutButton + '✅ Разведка проведена';
        } else if (onCooldown) {
            scoutButton = scoutButton + '⏳ Перезарядка ' + cooldownRemaining + 'с';
        } else {
            scoutButton = scoutButton + '📡 РАЗВЕДКА';
        }

        scoutButton = scoutButton + '</button>';
        scoutButton = scoutButton + '</div>';
    }

    let actionBtn = '';
    if (isActive) {
        actionBtn = '<div id="modalExpeditionAction">' + timerHtml + scoutButton + '</div>';
    } else {
        actionBtn = '<div id="modalExpeditionAction"><button class="btn" id="modalStartExpedition">⛏️ ОТПРАВИТЬСЯ</button></div>';
    }

    let html = '';
    html = html + '<div class="modal-header">';
    html = html + '<div class="modal-title">' + exp.name + '</div>';
    html = html + '<button class="modal-close" onclick="document.dispatchEvent(new Event(\'closeModal\'))">✕</button>';
    html = html + '</div>';
    html = html + '<div class="modal-content">';
    html = html + '<div class="modal-icon-large" id="modalExpeditionImage"></div>';
    html = html + '<div class="modal-description">' + (exp.description || 'Опасная, но прибыльная локация.') + '</div>';
    html = html + '<div style="background:rgba(0,0,0,0.2); border-radius:24px; padding:18px; margin-bottom:24px;">';
    html = html + '<div style="display:flex; justify-content:space-between;">';
    html = html + '<span>⏱️ Время</span>';
    html = html + '<span style="color:var(--accent-gold);">' + exp.timer + ' сек</span>';
    html = html + '</div>';
    html = html + '<div style="margin-top:12px; color:' + (completed ? '#50C878' : 'var(--accent-gold)') + ';">' + specialText + '</div>';
    html = html + '</div>';
    html = html + actionBtn;
    html = html + '</div>';

    openModal(html);
    currentModalExpId = expId;

    if (isActive) {
        modalTimerInterval = setInterval(function() {
            if (currentModalExpId) {
                updateModalExpeditionTimer(currentModalExpId);
            } else {
                clearInterval(modalTimerInterval);
                modalTimerInterval = null;
            }
        }, 500);
    }

    setTimeout(function() {
        renderImageToElement(document.getElementById('modalExpeditionImage'), exp.imagePath, exp.fallbackIcon, '#FFD700');

        const startBtn = document.getElementById('modalStartExpedition');
        if (startBtn) {
            startBtn.addEventListener('click', function() {
                console.log('[UI] Start expedition button clicked for:', expId);
                const success = startExpedition(expId);
                if (success) {
                    closeModal();
                }
            });
        }

        const scoutBtn = document.getElementById('scoutBtn-' + expId);
        if (scoutBtn) {
            scoutBtn.addEventListener('click', function() {
                showScoutChoiceModal(expId);
            });
        }
    }, 10);
}

// ---------- ОБНОВЛЕНИЕ UI ----------
export function updateProfileUI() {
    if (currentTab !== 'profile') {
        return;
    }

    const levelEl = document.getElementById('profileLevel');
    if (levelEl) {
        levelEl.textContent = playerState.player.level;
    }

    const xpFillEl = document.getElementById('xpFill');
    const xpTextEl = document.getElementById('xpText');
    if (xpFillEl && xpTextEl) {
        const currentXP = playerState.player.xp;
        const nextLevelXP = LEVELS[playerState.player.level] || LEVELS[LEVELS.length - 1];
        const prevLevelXP = LEVELS[playerState.player.level - 1] || 0;
        const progress = ((currentXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100;
        xpFillEl.style.width = Math.min(progress, 100) + '%';
        xpTextEl.textContent = currentXP + ' / ' + nextLevelXP + ' XP';
    }

    const statusEl = document.getElementById('profileStatus');
    if (statusEl) {
        statusEl.textContent = STATUSES[Math.min(playerState.player.level - 1, STATUSES.length - 1)];
    }

    const totalOpenedEl = document.getElementById('statOpened');
    if (totalOpenedEl) {
        totalOpenedEl.textContent = playerState.player.totalOpened;
    }

    const totalIngotsEl = document.getElementById('statIngots');
    if (totalIngotsEl) {
        totalIngotsEl.textContent = playerState.player.totalIngots;
    }

    const totalArtifactsEl = document.getElementById('statArtifacts');
    if (totalArtifactsEl) {
        totalArtifactsEl.textContent = playerState.player.totalArtifacts;
    }
}

export function updateCollectionProgress() {
    if (currentTab !== 'collection') {
        return;
    }

    const totalRegular = Object.values(CONFIG_ITEMS).filter(function(i) {
        return !i.isCollectible;
    }).length;
    const discovered = Object.values(CONFIG_ITEMS).filter(function(i) {
        return !i.isCollectible && playerState.minedStats[i.id] > 0;
    }).length;
    const percent = (discovered / totalRegular) * 100;

    const fillEl = document.getElementById('collectionProgressFill');
    const textEl = document.getElementById('collectionProgressText');
    if (fillEl) {
        fillEl.style.width = percent + '%';
    }
    if (textEl) {
        textEl.textContent = discovered + '/' + totalRegular + ' открыто';
    }
}

// ---------- РЕНДЕРИНГ ВКЛАДОК ----------
export function renderProfileTab() {
    if (isAnyOverlayActive()) {
        return;
    }

    const userName = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || 'Старатель';
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    let themeBtnText = '';
    if (currentTheme === 'dark') {
        themeBtnText = '🌙 Сменить тему (Светлая)';
    } else {
        themeBtnText = '☀️ Сменить тему (Тёмная)';
    }

    let html = '';
    html = html + '<div class="section-title">👤 Профиль</div>';

    html = html + '<div class="card">';
    html = html + '<div class="profile-header">';
    html = html + '<div class="profile-avatar">👤</div>';
    html = html + '<div class="profile-info">';
    html = html + '<div class="profile-name">' + userName + '</div>';
    html = html + '<div class="profile-status" id="profileStatus">' + STATUSES[Math.min(playerState.player.level - 1, STATUSES.length - 1)] + '</div>';
    html = html + '<span class="level-badge" id="profileLevel">' + playerState.player.level + '</span> уровень';
    html = html + '<button class="dev-menu-btn" id="adminPanelBtn">🛠️ АДМИН</button>';
    html = html + '</div>';
    html = html + '</div>';
    html = html + '<div class="xp-bar-container"><div class="xp-bar-fill" id="xpFill" style="width:0%"></div></div>';
    html = html + '<div class="xp-text" id="xpText">' + playerState.player.xp + ' / ' + (LEVELS[playerState.player.level] || 15000) + ' XP</div>';
    html = html + '<button class="theme-profile-btn" id="themeProfileBtn">' + themeBtnText + '</button>';
    html = html + '<button class="vip-button" id="vipButton">💎 АКТИВИРОВАТЬ VIP</button>';
    html = html + '<button class="btn" id="leaderboardBtn" style="margin-top:12px;">🏆 ТОП ИГРОКОВ</button>';
    html = html + '<div class="stats-grid">';
    html = html + '<div class="stat-card"><div class="stat-value" id="statOpened">' + playerState.player.totalOpened + '</div><div class="stat-label">Открыто жеод</div></div>';
    html = html + '<div class="stat-card"><div class="stat-value" id="statIngots">' + playerState.player.totalIngots + '</div><div class="stat-label">Добыто слитков</div></div>';
    html = html + '<div class="stat-card"><div class="stat-value" id="statArtifacts">' + playerState.player.totalArtifacts + '</div><div class="stat-label">Артефактов</div></div>';
    html = html + '</div>';
    html = html + '</div>';
    html = html + '<div class="card sell-section"><div class="section-title">💰 Сбыт сырья</div>';

    const availableIngots = Object.entries(playerState.ingots).filter(function(entry) {
        const k = entry[0];
        const v = entry[1];
        return v > 0 && !CONFIG_ITEMS[k].isCollectible;
    });
    if (availableIngots.length === 0) {
        html = html + '<div class="empty-state">Нет ресурсов для сдачи</div>';
    } else {
        availableIngots.forEach(function(entry) {
            const k = entry[0];
            const v = entry[1];
            const ing = CONFIG_ITEMS[k];
            html = html + '<div class="resource-item">';
            html = html + '<div class="resource-info">';
            html = html + '<div class="resource-icon" id="sell-icon-' + k + '"></div>';
            html = html + '<div>';
            html = html + '<div class="resource-name">' + ing.name + '</div>';
            html = html + '<div class="resource-count">' + v + ' шт. (+' + ing.sellValue + ' XP/шт)</div>';
            html = html + '</div>';
            html = html + '</div>';
            html = html + '<button class="sell-btn" data-sell="' + k + '">Сдать всё</button>';
            html = html + '</div>';
        });
    }
    html = html + '</div>';

    mainContent.innerHTML = html;

    availableIngots.forEach(function(entry) {
        const k = entry[0];
        const el = document.getElementById('sell-icon-' + k);
        if (el) {
            const ing = CONFIG_ITEMS[k];
            renderImageToElement(el, ing.imagePath, ing.icon, ing.fallbackColor);
        }
    });

    document.getElementById('themeProfileBtn').addEventListener('click', toggleTheme);
    document.querySelectorAll('[data-sell]').forEach(function(b) {
        b.addEventListener('click', function() {
            sellIngot(b.dataset.sell);
        });
    });
    document.getElementById('vipButton').addEventListener('click', function() {
        showToast('Оплата через Crypto Bot скоро будет доступна', '💎');
    });

    document.getElementById('leaderboardBtn')?.addEventListener('click', async function() {
        try {
            const { updateLeaderboard } = await import('./core.js');
            updateLeaderboard();
        } catch (e) {
            showToast('Не удалось загрузить таблицу лидеров', '⚠️');
        }
    });

    document.getElementById('adminPanelBtn').addEventListener('click', function() {
        showAdminPanel();
    });

    updateProfileUI();
}

export function renderExpeditionsTab() {
    if (isAnyOverlayActive()) {
        return;
    }

    let html = '';
    html = html + '<div class="section-title">⛏️ Экспедиции</div>';

    for (let k in CONFIG_EXPEDITIONS) {
        const exp = CONFIG_EXPEDITIONS[k];
        const act = playerState.expeditions[k] || { active: false };
        const isLocked = playerState.player.level < exp.requiredLevel;
        let timerHtml = '';

        if (isLocked) {
            timerHtml = '<span class="lock-icon">🔒</span> <span style="color:var(--text-muted);">Ур. ' + exp.requiredLevel + '</span>';
        } else if (act.active && act.endTime) {
            const diff = Math.max(0, act.endTime - Date.now());
            const m = Math.floor(diff / 60000);
            const s = Math.ceil((diff % 60000) / 1000);
            timerHtml = '<div class="timer-badge" id="timer-' + k + '">⏳ ' + m + ':' + s.toString().padStart(2, '0') + '</div>';
        } else {
            timerHtml = '<button class="small-btn" data-info-exp="' + k + '">Подробнее</button>';
        }

        html = html + '<div class="card">';
        html = html + '<div class="expedition-item ' + (isLocked ? 'locked' : '') + '" data-expedition-click="' + k + '">';
        html = html + '<div class="expedition-info">';
        html = html + '<div class="expedition-icon" id="expedition-icon-' + k + '"></div>';
        html = html + '<div class="expedition-text">';
        html = html + '<h3>' + exp.name + ' ' + (isLocked ? '🔒' : '') + '</h3>';
        html = html + '<p>⏱️ ' + exp.timer + ' сек</p>';
        html = html + '</div>';
        html = html + '</div>';
        html = html + '<div class="expedition-action">' + timerHtml + '</div>';
        html = html + '</div>';
        html = html + '</div>';
    }

    mainContent.innerHTML = html;

    for (let k in CONFIG_EXPEDITIONS) {
        renderImageToElement(document.getElementById('expedition-icon-' + k), CONFIG_EXPEDITIONS[k].imagePath, CONFIG_EXPEDITIONS[k].fallbackIcon, '#FFD700');
    }

    document.querySelectorAll('[data-expedition-click]').forEach(function(el) {
        el.addEventListener('click', function(e) {
            const key = this.dataset.expeditionClick;
            if (playerState.player.level < CONFIG_EXPEDITIONS[key].requiredLevel) {
                showToast('Требуется ' + CONFIG_EXPEDITIONS[key].requiredLevel + ' уровень!', '🔒');
                return;
            }
            if (!e.target.classList.contains('small-btn')) {
                showExpeditionInfoModal(key);
            }
        });
    });

    document.querySelectorAll('[data-info-exp]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            showExpeditionInfoModal(btn.dataset.infoExp);
        });
    });
}

export function renderInventoryTab() {
    if (isAnyOverlayActive()) {
        return;
    }

    let html = '';
    html = html + '<div class="section-title">🎒 Инвентарь</div>';
    html = html + '<div class="inventory-subtabs">';
    html = html + '<button class="subtab-btn ' + (inventorySubTab === 'geodes' ? 'active' : '') + '" data-subtab="geodes">🪨 Жеоды</button>';
    html = html + '<button class="subtab-btn ' + (inventorySubTab === 'ingots' ? 'active' : '') + '" data-subtab="ingots">✨ Слитки</button>';
    html = html + '</div>';

    if (inventorySubTab === 'geodes') {
        const items = Object.entries(playerState.geodes).filter(function(entry) {
            return entry[1] > 0;
        });
        if (!items.length) {
            html = html + '<div class="empty-state">Нет жеод. Отправьте экспедицию.</div>';
        } else {
            html = html + '<div class="grid-container">';
            items.forEach(function(entry) {
                const k = entry[0];
                const c = entry[1];
                const g = CONFIG_GEODES[k];
                html = html + '<div class="collection-card" data-geode="' + k + '">';
                html = html + '<div class="card-icon" id="inv-geode-' + k + '"></div>';
                html = html + '<div class="card-name">' + g.name + '</div>';
                html = html + '<div class="card-count-badge">' + c + ' шт.</div>';
                html = html + '</div>';
            });
            html = html + '</div>';
        }

        mainContent.innerHTML = html;

        for (let k in CONFIG_GEODES) {
            const el = document.getElementById('inv-geode-' + k);
            if (el && playerState.geodes[k] > 0) {
                renderImageToElement(el, CONFIG_GEODES[k].stages[0].imagePath, CONFIG_GEODES[k].stages[0].fallbackIcon, '#8B7355');
            }
        }
    } else {
        const items = Object.entries(playerState.ingots).filter(function(entry) {
            const k = entry[0];
            const c = entry[1];
            return c > 0 && !CONFIG_ITEMS[k].isCollectible;
        });
        if (!items.length) {
            html = html + '<div class="empty-state">Нет слитков. Откройте жеоды.</div>';
        } else {
            html = html + '<div class="grid-container">';
            items.forEach(function(entry) {
                const k = entry[0];
                const c = entry[1];
                const ing = CONFIG_ITEMS[k];
                html = html + '<div class="collection-card" data-ingot="' + k + '">';
                html = html + '<div class="card-icon" id="inv-ingot-' + k + '"></div>';
                html = html + '<div class="card-name">' + ing.name + '</div>';
                html = html + '<div class="card-count-badge">' + c + ' шт.</div>';
                html = html + '</div>';
            });
            html = html + '</div>';
        }

        mainContent.innerHTML = html;

        for (let k in CONFIG_ITEMS) {
            if (CONFIG_ITEMS[k].isCollectible) {
                continue;
            }
            const el = document.getElementById('inv-ingot-' + k);
            if (el && playerState.ingots[k] > 0) {
                renderImageToElement(el, CONFIG_ITEMS[k].imagePath, CONFIG_ITEMS[k].icon, CONFIG_ITEMS[k].fallbackColor);
            }
        }
    }

    document.querySelectorAll('[data-subtab]').forEach(function(b) {
        b.addEventListener('click', function() {
            inventorySubTab = b.dataset.subtab;
            renderInventoryTab();
        });
    });

    document.querySelectorAll('[data-geode]').forEach(function(c) {
        c.addEventListener('click', function() {
            showGeodeModal(c.dataset.geode);
        });
    });
    document.querySelectorAll('[data-ingot]').forEach(function(c) {
        c.addEventListener('click', function() {
            openShowcase(c.dataset.ingot);
        });
    });
}

export function renderCollectionTab() {
    if (isAnyOverlayActive()) {
        return;
    }

    const totalRegular = Object.values(CONFIG_ITEMS).filter(function(i) {
        return !i.isCollectible;
    }).length;
    const discovered = Object.values(CONFIG_ITEMS).filter(function(i) {
        return !i.isCollectible && playerState.minedStats[i.id] > 0;
    }).length;
    const percent = (discovered / totalRegular) * 100;

    let html = '';
    html = html + '<div class="section-title">📦 Коллекция</div>';
    html = html + '<div class="collection-progress">';
    html = html + '<div class="progress-bar-container">';
    html = html + '<div class="progress-bar-fill" id="collectionProgressFill" style="width:' + percent + '%"></div>';
    html = html + '</div>';
    html = html + '<div class="progress-text" id="collectionProgressText">' + discovered + '/' + totalRegular + ' открыто</div>';
    html = html + '</div>';
    html = html + '<div class="inventory-subtabs">';
    html = html + '<button class="subtab-btn ' + (collectionSubTab === 'encyclopedia' ? 'active' : '') + '" data-subtab="encyclopedia">📚 Энциклопедия</button>';
    html = html + '<button class="subtab-btn ' + (collectionSubTab === 'halloffame' ? 'active' : '') + '" data-subtab="halloffame">🏆 Зал Славы</button>';
    html = html + '</div>';

    if (collectionSubTab === 'encyclopedia') {
        const regularIngots = Object.values(CONFIG_ITEMS).filter(function(i) {
            return !i.isCollectible;
        });
        html = html + '<div class="grid-container">';
        regularIngots.forEach(function(ing) {
            const discovered = playerState.minedStats[ing.id] > 0;
            const cardClass = discovered ? 'collection-card' : 'collection-card silhouette';
            html = html + '<div class="' + cardClass + '" data-ingot="' + ing.id + '">';
            html = html + '<div class="card-icon" id="enc-' + ing.id + '"></div>';
            if (discovered) {
                html = html + '<div class="card-name">' + ing.name + '</div>';
                html = html + '<div class="card-count-badge">Добыто: ' + playerState.minedStats[ing.id] + '</div>';
            } else {
                html = html + '<div class="card-name">Неизвестный материал</div>';
                html = html + '<div class="card-count-badge">???</div>';
            }
            html = html + '</div>';
        });
        html = html + '</div>';

        mainContent.innerHTML = html;

        regularIngots.forEach(function(ing) {
            const el = document.getElementById('enc-' + ing.id);
            if (el) {
                if (playerState.minedStats[ing.id] > 0) {
                    renderImageToElement(el, ing.imagePath, ing.icon, ing.fallbackColor);
                } else {
                    renderMysteryPlaceholder(el);
                }
            }
        });
    } else {
        const coll = Object.values(CONFIG_ITEMS).filter(function(i) {
            return i.isCollectible;
        });
        html = html + '<div class="grid-container">';
        coll.forEach(function(ing) {
            const owned = playerState.ingots[ing.id] > 0;
            html = html + '<div class="collection-card ' + (owned ? '' : 'silhouette') + '" data-ingot="' + ing.id + '">';
            html = html + '<div class="card-icon" id="hall-' + ing.id + '"></div>';
            if (owned) {
                html = html + '<div class="card-name">' + ing.name + '</div>';
                html = html + '<div class="card-count-badge">★ Найдено</div>';
            } else {
                html = html + '<div class="card-name">???</div>';
                html = html + '<div class="card-count-badge">Неизвестно</div>';
            }
            html = html + '</div>';
        });
        html = html + '</div>';

        mainContent.innerHTML = html;

        coll.forEach(function(ing) {
            const el = document.getElementById('hall-' + ing.id);
            if (el) {
                if (playerState.ingots[ing.id] > 0) {
                    renderImageToElement(el, ing.imagePath, ing.icon, ing.fallbackColor);
                } else {
                    renderMysteryPlaceholder(el);
                }
            }
        });
    }

    document.querySelectorAll('[data-subtab]').forEach(function(b) {
        b.addEventListener('click', function() {
            collectionSubTab = b.dataset.subtab;
            renderCollectionTab();
        });
    });

    document.querySelectorAll('[data-ingot]').forEach(function(c) {
        c.addEventListener('click', function() {
            const ing = CONFIG_ITEMS[c.dataset.ingot];
            openShowcase(c.dataset.ingot, !playerState.minedStats[ing.id] && !ing.isCollectible);
        });
    });
}

export function renderEventsTab() {
    if (isAnyOverlayActive()) {
        return;
    }

    const activeEvent = eventsManager.getActiveEvent();
    const timeLeft = activeEvent ? eventsManager.getTimeLeft() : '';
    const phase = eventsManager.eventPhase;

    let html = '';
    html = html + '<div class="section-title">📡 Ивенты</div>';

    if (activeEvent && phase === 'active') {
        if (activeEvent.type === 'great_smelt') {
            html = html + '<div class="card" style="border: 2px solid rgba(255,100,0,0.4); background: rgba(255,50,0,0.05); position: relative; overflow: hidden;">';
            html = html + '<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 50% 0%, rgba(255,100,0,0.1) 0%, transparent 70%); pointer-events: none;"></div>';
            html = html + '<div class="event-icon" style="font-size:72px; margin-bottom:16px;">' + activeEvent.icon + '</div>';
            html = html + '<div class="event-title" style="color: var(--accent-orange); font-size: 22px; margin-bottom: 8px;">' + activeEvent.name + '</div>';
            html = html + '<div class="event-desc" style="color: var(--text-primary); font-size: 14px; line-height: 1.6; margin-bottom: 16px;">' + (activeEvent.longDescription || activeEvent.description) + '</div>';
            html = html + '<div style="background: rgba(0,0,0,0.3); border-radius: 20px; padding: 14px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 10px;">';
            html = html + '<span style="font-size: 24px;">⏳</span>';
            html = html + '<span style="font-family: \'Unbounded\', sans-serif; font-size: 20px; font-weight: 700; color: var(--accent-gold);" id="eventTimer">' + timeLeft + '</span>';
            html = html + '<span style="font-size: 12px; color: var(--text-secondary);">до завершения</span>';
            html = html + '</div>';
            html = html + '<button class="forge-smelt-btn" id="enterForgeBtn" style="width: 100%;">⚡ ВОЙТИ В ПЛАВИЛЬНЮ</button>';
            html = html + '<div style="margin-top: 12px; text-align: center; color: var(--text-muted); font-size: 11px;">Доступны рецепты: 🌑 Чёрное Зеркало · 🛰️ Астро-Бронза · 🛡️ Хромированный Титан · 💎 Платиновый Сплав</div>';
            html = html + '</div>';
        } else if (activeEvent.type === 'meteor_storm') {
            html = html + '<div class="card" style="border: 2px solid rgba(180,0,255,0.4); background: rgba(100,0,200,0.05); position: relative; overflow: hidden;">';
            html = html + '<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 50% 0%, rgba(180,0,255,0.1) 0%, transparent 70%); pointer-events: none;"></div>';
            html = html + '<div class="event-icon" style="font-size:72px; margin-bottom:16px;">' + activeEvent.icon + '</div>';
            html = html + '<div class="event-title" style="color: #B400FF; font-size: 22px; margin-bottom: 8px;">' + activeEvent.name + '</div>';
            html = html + '<div class="event-desc" style="color: var(--text-primary); font-size: 14px; line-height: 1.6; margin-bottom: 16px;">' + (activeEvent.longDescription || activeEvent.description) + '</div>';
            html = html + '<div style="background: rgba(0,0,0,0.3); border-radius: 20px; padding: 14px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 10px;">';
            html = html + '<span style="font-size: 24px;">⏳</span>';
            html = html + '<span style="font-family: \'Unbounded\', sans-serif; font-size: 20px; font-weight: 700; color: var(--accent-gold);" id="eventTimer">' + timeLeft + '</span>';
            html = html + '<span style="font-size: 12px; color: var(--text-secondary);">до завершения</span>';
            html = html + '</div>';
            html = html + '<button class="btn" id="enterMeteorStormBtn" style="width: 100%; background: linear-gradient(135deg, #B400FF, #FFD700); box-shadow: 0 4px 25px rgba(180,0,255,0.4);">☄️ ВОЙТИ В ШТОРМ</button>';
            html = html + '<div style="margin-top: 12px; text-align: center; color: var(--text-muted); font-size: 11px;">Лови метеориты: ✨ Легендарные · 🔥 Редкие · ☄️ Обычные<br>Обменяй на жеоды: 2 легендарных / 4 редких / 6 обычных</div>';
            html = html + '</div>';
        }
    } else if (phase === 'ending') {
        html = html + '<div class="event-placeholder">';
        html = html + '<div class="event-icon">❄️</div>';
        html = html + '<div class="event-title">Ивент завершён</div>';
        html = html + '<div class="event-desc">Дождитесь следующего ивента.</div>';
        html = html + '<div style="margin-top: 16px; color: var(--text-muted); font-size: 13px;">Следующий ивент начнётся автоматически</div>';
        html = html + '</div>';
    } else {
        html = html + '<div class="event-placeholder">';
        html = html + '<div class="event-icon">🛰️</div>';
        html = html + '<div class="event-title">Ожидание ивента</div>';
        html = html + '<div class="event-desc">Ивенты запускаются автоматически. Проверяйте вкладку Ивентов!</div>';
        html = html + '</div>';
    }

    mainContent.innerHTML = html;

    const enterForgeBtn = document.getElementById('enterForgeBtn');
    if (enterForgeBtn) {
        enterForgeBtn.addEventListener('click', function() {
            openForge();
        });
    }

    const enterMeteorStormBtn = document.getElementById('enterMeteorStormBtn');
    if (enterMeteorStormBtn) {
        enterMeteorStormBtn.addEventListener('click', function() {
            openMeteorStorm();
        });
    }

    startEventTabInterval();
}

function startEventTabInterval() {
    if (eventTabInterval) {
        clearInterval(eventTabInterval);
        eventTabInterval = null;
    }

    eventTabInterval = setInterval(function() {
        if (currentTab !== 'events' || isAnyOverlayActive()) {
            clearInterval(eventTabInterval);
            eventTabInterval = null;
            return;
        }

        const timerEl = document.getElementById('eventTimer');
        const event = eventsManager.getActiveEvent();
        if (timerEl && event && eventsManager.eventPhase === 'active') {
            timerEl.textContent = eventsManager.getTimeLeft();
        }

        if (event && eventsManager.eventEndTime && Date.now() >= eventsManager.eventEndTime && eventsManager.eventPhase === 'active') {
            eventsManager.endEvent();
            renderCurrentTab();
        }
    }, 1000);
}

export function renderCurrentTab() {
    if (isAnyOverlayActive()) {
        return;
    }

    if (currentTab === 'expeditions') {
        renderExpeditionsTab();
    } else if (currentTab === 'inventory') {
        renderInventoryTab();
    } else if (currentTab === 'collection') {
        renderCollectionTab();
    } else if (currentTab === 'events') {
        renderEventsTab();
    } else if (currentTab === 'profile') {
        renderProfileTab();
    }
}

export function setActiveTab(tabId) {
    if (isAnyOverlayActive()) {
        return;
    }

    currentTab = tabId;
    document.querySelectorAll('.tab-item').forEach(function(b) {
        if (b.dataset.tab === tabId) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
    renderCurrentTab();
}
