// ========== MINIGAMES МОДУЛЬ: МИНИ-ИГРЫ ==========
import { CONFIG_ITEMS, CONFIG_GEODES } from './config.js';
import { getPlayerState, addXP, saveGame } from './core.js';

// DOM-элементы
let canvas, ctx, overlay, resultEl, resultTitle, resultScore, resultReward;
let currentGame = null;
let gameState = {};
let animationId = null;
let boundHandlers = {};

// Инициализация DOM-ссылок
function initDOM() {
  canvas = document.getElementById('minigameCanvas');
  ctx = canvas?.getContext('2d');
  overlay = document.getElementById('minigameOverlay');
  resultEl = document.getElementById('minigameResult');
  resultTitle = document.getElementById('minigameResultTitle');
  resultScore = document.getElementById('minigameResultScore');
  resultReward = document.getElementById('minigameResultReward');
}

// Показать результаты
function showResult(title, score, reward) {
  if (!resultEl || !resultTitle || !resultScore || !resultReward) return;
  resultTitle.textContent = title;
  resultScore.textContent = `Очки: ${score}`;
  resultReward.textContent = reward || '';
  resultEl.classList.add('show');
}

// Скрыть результаты
function hideResult() {
  if (resultEl) resultEl.classList.remove('show');
}

// Очистить игру
function cleanupGame() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  if (boundHandlers.click) {
    canvas?.removeEventListener('click', boundHandlers.click);
    boundHandlers.click = null;
  }
  if (boundHandlers.mousemove) {
    canvas?.removeEventListener('mousemove', boundHandlers.mousemove);
    boundHandlers.mousemove = null;
  }
  if (boundHandlers.keydown) {
    document.removeEventListener('keydown', boundHandlers.keydown);
    boundHandlers.keydown = null;
  }

  hideResult();
  currentGame = null;
  gameState = {};
}

// Настройка Canvas
function setupCanvas() {
  if (!canvas || !overlay) return false;

  const maxWidth = Math.min(window.innerWidth - 32, 400);
  const maxHeight = Math.min(window.innerHeight - 120, 600);

  canvas.width = maxWidth;
  canvas.height = maxHeight;

  return true;
}

// 🆕 Универсальный индикатор редкости вместо эмодзи
function getRarityIndicator(rarityLevel) {
  switch (rarityLevel) {
    case 'common': return { icon: '⬤', color: '#A0A0A0', name: 'Обычный' };
    case 'rare': return { icon: '⬤', color: '#4A9CFF', name: 'Редкий' };
    case 'epic': return { icon: '⬤', color: '#B44AFF', name: 'Эпический' };
    case 'legendary': return { icon: '⬤', color: '#FFD700', name: 'Легендарный' };
    case 'collectible': return { icon: '⬤', color: '#FF64FF', name: 'Коллекционный' };
    default: return { icon: '⬤', color: '#A0A0A0', name: 'Обычный' };
  }
}

// ========== 🆕 ЭКСПОРТ: СТОП ТЕКУЩЕЙ ИГРЫ ==========
export function stopCurrentGame() {
  cleanupGame();
  if (overlay) overlay.classList.remove('active');
}

// ========== 🆕 ЭКСПОРТ: ЗАПУСК ЗАКАЛКИ ==========
export function startQuenchGame() {
  initDOM();
  if (!setupCanvas()) return;

  const state = getPlayerState();
  if (state.player.level < 1) {
    import('./ui.js').then(ui => ui.showToast('Требуется 1 уровень!', '🔒'));
    return;
  }

  cleanupGame();
  currentGame = 'quench';

  gameState = {
    score: 0,
    position: 0.5,
    speed: 0.005,
    dangerZone: 0.12,
    redZone: 0.04,
    tapPushback: 0.07,
    elapsedTime: 0,
    lastTime: Date.now(),
    ingotHeight: 60,
    ingotWidth: 80,
    shakeAmount: 0,
    sparks: []
  };

  overlay.classList.add('active');

  const handleTap = (e) => {
    e.preventDefault();
    if (currentGame !== 'quench') return;

    gameState.position += gameState.tapPushback;
    gameState.position = Math.min(1, gameState.position);

    // Проверка на попадание в красную зону при отскоке
    if (gameState.position >= 1 - gameState.redZone || gameState.position <= gameState.redZone) {
      endQuenchGame(true);
      return;
    }

    for (let i = 0; i < 5; i++) {
      gameState.sparks.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * gameState.ingotWidth,
        y: canvas.height / 2 + (Math.random() - 0.5) * gameState.ingotHeight,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1,
        size: 1.5 + Math.random() * 2
      });
    }
  };

  canvas.addEventListener('click', handleTap);
  boundHandlers.click = handleTap;

  function gameLoop() {
    if (currentGame !== 'quench') return;

    const now = Date.now();
    const dt = (now - gameState.lastTime) / 1000;
    gameState.lastTime = now;

    gameState.position -= gameState.speed * dt * 60;
    gameState.position = Math.max(0, Math.min(1, gameState.position));

    if (gameState.position <= 0 || gameState.position >= 1) {
      endQuenchGame(false);
      return;
    }

    gameState.elapsedTime += dt;
    gameState.score = Math.floor(gameState.elapsedTime * 10);

    const timeBonus = Math.floor(gameState.elapsedTime / 5);
    gameState.speed = 0.005 * Math.pow(1.18, timeBonus);

    const inDanger = gameState.position <= gameState.dangerZone || gameState.position >= 1 - gameState.dangerZone;
    gameState.shakeAmount = inDanger ? (1 - gameState.position / gameState.dangerZone) * 3 : 0;

    gameState.sparks = gameState.sparks.filter(s => {
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 0.03;
      return s.life > 0;
    });

    renderQuench();
    animationId = requestAnimationFrame(gameLoop);
  }

  animationId = requestAnimationFrame(gameLoop);
}

function renderQuench() {
  if (!ctx || !canvas) return;

  const { width, height } = canvas;
  const gs = gameState;

  const shakeX = (Math.random() - 0.5) * gs.shakeAmount * 2;
  const shakeY = (Math.random() - 0.5) * gs.shakeAmount * 2;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Фон
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#2a2a2e');
  bgGrad.addColorStop(0.5, '#1a1a1c');
  bgGrad.addColorStop(1, '#2a2a2e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Красные зоны по краям
  const redZoneHeight = gs.redZone * height;
  ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';
  ctx.fillRect(0, 0, width, redZoneHeight);
  ctx.fillRect(0, height - redZoneHeight, width, redZoneHeight);
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, redZoneHeight);
  ctx.lineTo(width, redZoneHeight);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, height - redZoneHeight);
  ctx.lineTo(width, height - redZoneHeight);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 1;

  // Зона идеального удара
  const zoneHeight = 30;
  const zoneY = height / 2 - zoneHeight / 2;
  ctx.fillStyle = 'rgba(80, 200, 120, 0.15)';
  ctx.fillRect(width * 0.05, zoneY, width * 0.9, zoneHeight);
  ctx.strokeStyle = 'rgba(80, 200, 120, 0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.strokeRect(width * 0.05, zoneY, width * 0.9, zoneHeight);
  ctx.setLineDash([]);
  ctx.lineWidth = 1;

  // Верхняя плита
  const topY = gs.position * (height / 2 - 60);
  const plateGradTop = ctx.createLinearGradient(0, topY - 10, 0, topY + 10);
  plateGradTop.addColorStop(0, '#FF4500');
  plateGradTop.addColorStop(0.5, '#FF8C00');
  plateGradTop.addColorStop(1, '#FFD700');
  ctx.fillStyle = plateGradTop;
  ctx.shadowColor = 'rgba(255, 100, 0, 0.8)';
  ctx.shadowBlur = 20 + gs.shakeAmount * 10;
  ctx.fillRect(width * 0.1, topY - 10, width * 0.8, 12);
  ctx.shadowBlur = 0;

  // Нижняя плита
  const bottomY = height - gs.position * (height / 2 - 60);
  const plateGradBottom = ctx.createLinearGradient(0, bottomY - 2, 0, bottomY + 10);
  plateGradBottom.addColorStop(0, '#87CEEB');
  plateGradBottom.addColorStop(0.5, '#1E90FF');
  plateGradBottom.addColorStop(1, '#00BFFF');
  ctx.fillStyle = plateGradBottom;
  ctx.shadowColor = 'rgba(0, 191, 255, 0.8)';
  ctx.shadowBlur = 20 + gs.shakeAmount * 10;
  ctx.fillRect(width * 0.1, bottomY - 2, width * 0.8, 12);
  ctx.shadowBlur = 0;

  // Слиток
  const ingotX = width / 2 - gs.ingotWidth / 2;
  const ingotY = height / 2 - gs.ingotHeight / 2;
  const ingotGrad = ctx.createLinearGradient(ingotX, ingotY, ingotX + gs.ingotWidth, ingotY + gs.ingotHeight);
  ingotGrad.addColorStop(0, '#B87333');
  ingotGrad.addColorStop(0.3, '#FFD700');
  ingotGrad.addColorStop(0.7, '#FFA500');
  ingotGrad.addColorStop(1, '#8B4513');

  ctx.fillStyle = ingotGrad;
  ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.roundRect(ingotX, ingotY, gs.ingotWidth, gs.ingotHeight, 8);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Искры
  gs.sparks.forEach(s => {
    ctx.fillStyle = `rgba(255, 215, 0, ${s.life})`;
    ctx.shadowColor = `rgba(255, 215, 0, ${s.life})`;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowBlur = 0;

  // Score — поверх всех объектов
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(width / 2 - 50, height / 2 - 50, 100, 60);
  
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 14px Unbounded, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCORE', width / 2, height / 2 - 32);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 48px Unbounded, sans-serif';
  ctx.fillText(gs.score, width / 2, height / 2 + 8);

  ctx.restore();
}

function endQuenchGame(crashedByRedZone) {
  const score = gameState.score;
  let rewardText = '';
  const state = getPlayerState();

  if (crashedByRedZone) {
    rewardText = '💥 Пресс сломан! Слиток разрушен.';
  } else {
    const rewards = Math.floor(score / 200);

    if (rewards > 0) {
      const xpGained = rewards * 30;
      addXP(xpGained);

      const commonIngots = Object.values(CONFIG_ITEMS).filter(i => i.rarityLevel === 'common' && !i.isCollectible);

      for (let i = 0; i < rewards; i++) {
        const randomIngot = commonIngots[Math.floor(Math.random() * commonIngots.length)];
        state.ingots[randomIngot.id] = (state.ingots[randomIngot.id] || 0) + 1;
        state.minedStats[randomIngot.id] = (state.minedStats[randomIngot.id] || 0) + 1;
        state.player.totalIngots++;

        rewardText += `Добавлен слиток: ${randomIngot.name}!\n`;
      }

      rewardText += `+${xpGained} XP`;
      saveGame();
    } else {
      rewardText = 'Не набрано очков для награды';
    }
  }

  showResult(crashedByRedZone ? 'Пресс сломан!' : 'Закалка завершена!', score, rewardText);

  currentGame = null;

  import('./ui.js').then(ui => ui.renderCurrentTab());
}

// ========== 🆕 ЭКСПОРТ: ЗАПУСК СТОПКИ ==========
export function startStackGame() {
  initDOM();
  if (!setupCanvas()) return;

  const state = getPlayerState();
  if (state.player.level < 5) {
    import('./ui.js').then(ui => ui.showToast('Требуется 5 уровень!', '🔒'));
    return;
  }

  cleanupGame();
  currentGame = 'stack';

  const blockHeight = 28;
  const baseY = canvas.height - 30;
  const baseSpeed = 3.0;

  // Случайная начальная сторона
  const randomDirection = Math.random() > 0.5 ? 1 : -1;

  gameState = {
    score: 0,
    blockWidth: 120,
    minBlockWidth: 15,
    currentX: randomDirection === 1 ? 0 : canvas.width - 120,
    direction: randomDirection,
    speed: baseSpeed + Math.random() * 1.5,
    blocks: [],
    blockHeight: blockHeight,
    falling: false,
    fallBlock: null,
    fallProgress: 0,
    fallStartY: 60,
    fallTargetY: baseY - blockHeight,
    baseY: baseY,
    movingY: 60,
    baseSpeed: baseSpeed
  };

  gameState.fallTargetY = baseY - blockHeight;

  overlay.classList.add('active');

  const handleTap = (e) => {
    e.preventDefault();
    if (!currentGame || gameState.falling) return;
    dropStackBlock();
  };

  canvas.addEventListener('click', handleTap);
  boundHandlers.click = handleTap;

  function gameLoop() {
    if (currentGame !== 'stack') return;

    if (!gameState.falling) {
      const maxX = canvas.width - gameState.blockWidth;
      gameState.currentX += gameState.speed * gameState.direction;

      if (gameState.currentX >= maxX) {
        gameState.currentX = maxX;
        gameState.direction = -1;
      } else if (gameState.currentX <= 0) {
        gameState.currentX = 0;
        gameState.direction = 1;
      }
    } else {
      gameState.fallProgress += 0.06;
      if (gameState.fallProgress >= 1) {
        gameState.fallProgress = 1;
        placeBlock();
      }
    }

    renderStack();
    animationId = requestAnimationFrame(gameLoop);
  }

  animationId = requestAnimationFrame(gameLoop);
}

function dropStackBlock() {
  gameState.falling = true;
  gameState.fallProgress = 0;

  const prevBlock = gameState.blocks.length > 0 ? gameState.blocks[gameState.blocks.length - 1] : null;

  let newWidth = gameState.blockWidth;
  let newX = gameState.currentX;

  if (prevBlock) {
    const overlapLeft = Math.max(prevBlock.x, newX);
    const overlapRight = Math.min(prevBlock.x + prevBlock.width, newX + gameState.blockWidth);
    newWidth = Math.max(0, overlapRight - overlapLeft);
    newX = overlapLeft;

    if (newWidth <= 0) {
      endStackGame();
      return;
    }

    newWidth = Math.max(gameState.minBlockWidth, newWidth);
  }

  const placedBlocksCount = gameState.blocks.length;
  gameState.fallStartY = gameState.movingY;
  gameState.fallTargetY = gameState.baseY - (placedBlocksCount + 1) * gameState.blockHeight;

  gameState.fallBlock = {
    x: newX,
    width: newWidth,
    currentY: gameState.fallStartY
  };
}

function placeBlock() {
  if (!gameState.fallBlock) return;

  gameState.blocks.push({
    x: gameState.fallBlock.x,
    width: gameState.fallBlock.width
  });

  gameState.blockWidth = Math.max(gameState.minBlockWidth, gameState.fallBlock.width);
  gameState.score++;
  gameState.speed = gameState.baseSpeed + Math.random() * 2.0 + gameState.score * 0.15;

  // Случайная сторона для следующего блока
  gameState.direction = Math.random() > 0.5 ? 1 : -1;
  gameState.currentX = gameState.direction === 1 ? 0 : canvas.width - gameState.blockWidth;

  gameState.falling = false;
  gameState.fallBlock = null;
  gameState.fallProgress = 0;
}

function renderStack() {
  if (!ctx || !canvas) return;

  const { width, height } = canvas;
  const gs = gameState;

  // Фон
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#1a1a2e');
  bgGrad.addColorStop(1, '#0a0a14');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Score — поверх всего
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(width / 2 - 60, 10, 120, 40);
  
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 22px Unbounded, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`🏆 Башня: ${gs.score}`, width / 2, 38);

  // Основание
  const baseY = gs.baseY;
  ctx.fillStyle = '#455A64';
  ctx.shadowColor = 'rgba(96, 125, 139, 0.4)';
  ctx.shadowBlur = 10;
  ctx.fillRect(width * 0.05, baseY, width * 0.9, 12);
  ctx.shadowBlur = 0;

  // Размещённые блоки
  gs.blocks.forEach((block, index) => {
    const blockY = baseY - (index + 1) * gs.blockHeight;
    drawBlock(block.x, blockY, block.width, gs.blockHeight);
  });

  // Падающий блок
  if (gs.falling && gs.fallBlock) {
    const fb = gs.fallBlock;
    const currentY = gs.fallStartY + (gs.fallTargetY - gs.fallStartY) * gs.fallProgress;
    fb.currentY = currentY;
    drawBlock(fb.x, currentY, fb.width, gs.blockHeight);
  }

  // Движущийся блок
  if (!gs.falling) {
    const movingY = gs.movingY;
    const blockGrad = ctx.createLinearGradient(gs.currentX, movingY, gs.currentX, movingY + gs.blockHeight);
    blockGrad.addColorStop(0, '#FF8C00');
    blockGrad.addColorStop(1, '#FFD700');

    ctx.fillStyle = blockGrad;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 165, 0, 0.5)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(gs.currentX, movingY, gs.blockWidth, gs.blockHeight, 3);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function drawBlock(x, y, w, h) {
  if (!ctx) return;

  const blockGrad = ctx.createLinearGradient(x, y, x, y + h);
  blockGrad.addColorStop(0, '#B87333');
  blockGrad.addColorStop(1, '#FFD700');

  ctx.fillStyle = blockGrad;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h - 1, 3);
  ctx.fill();
  ctx.stroke();

  if (w >= 60) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x + 4, y + 4, w - 8, h - 10);
  }
}

function endStackGame() {
  const score = gameState.score;
  const xpGained = score * 5 + Math.floor(score / 10) * 25;

  let rewardText = `+${xpGained} XP`;
  const state = getPlayerState();

  if (score >= 20) {
    const commonGeodes = Object.values(CONFIG_GEODES).filter(g => !g.isSpecial && g.id !== 'meteor_common' && g.id !== 'meteor_rare' && g.id !== 'meteor_legendary');
    if (commonGeodes.length > 0) {
      const randomGeode = commonGeodes[Math.floor(Math.random() * commonGeodes.length)];
      state.geodes[randomGeode.id] = (state.geodes[randomGeode.id] || 0) + 1;
      rewardText = `🎰 Награда: +${xpGained} EXP и ${randomGeode.name}!`;
    }
  }

  if (score > 0) {
    addXP(xpGained);
    saveGame();
    showResult('Башня рухнула!', score, rewardText);
  } else {
    showResult('Башня рухнула!', 0, 'Попробуй снова');
  }

  currentGame = null;
  import('./ui.js').then(ui => ui.renderCurrentTab());
}

// ========== 🆕 ЭКСПОРТ: ЗАПУСК АПГРЕЙДА ==========
export function startUpgradeGame() {
  initDOM();

  const state = getPlayerState();
  if (state.player.level < 10) {
    import('./ui.js').then(ui => ui.showToast('Требуется 10 уровень!', '🔒'));
    return;
  }

  const availableIngots = Object.entries(state.ingots)
    .filter(([id, count]) => count > 0 && !CONFIG_ITEMS[id].isCollectible)
    .map(([id, count]) => ({ id, count, ingot: CONFIG_ITEMS[id] }));

  if (availableIngots.length === 0) {
    import('./ui.js').then(ui => ui.showToast('Нет слитков для жертвы!', '⚠️'));
    return;
  }

  showUpgradeSelectionModal(availableIngots);
}

function showUpgradeSelectionModal(availableIngots) {
  let sacrificeOptions = '';
  availableIngots.forEach(({ id, count, ingot }) => {
    const indicator = getRarityIndicator(ingot.rarityLevel);
    sacrificeOptions += `<option value="${id}">${indicator.icon} ${ingot.name} (${count} шт.) — Ценность: ${ingot.sellValue}</option>`;
  });

  let targetOptions = '';
  Object.entries(CONFIG_ITEMS).forEach(([id, ingot]) => {
    if (!ingot.isCollectible) {
      const indicator = getRarityIndicator(ingot.rarityLevel);
      targetOptions += `<option value="${id}">${indicator.icon} ${ingot.name} (${indicator.name}) — Ценность: ${ingot.sellValue}</option>`;
    }
  });

  const html = `
    <div class="modal-header">
      <div class="modal-title">🎰 Кузнечный Апгрейд</div>
      <button class="modal-close" onclick="document.dispatchEvent(new Event('closeModal'))">✕</button>
    </div>
    <div class="modal-content">
      <div class="modal-description">Выбери слиток-жертву и целевой слиток. Шанс зависит от разницы в ценности!</div>
      
      <div style="text-align: left; margin-bottom: 16px;">
        <label style="font-weight: 700; font-size: 13px; color: var(--text-secondary);">Жертва (будет потрачена):</label>
        <select id="upgradeSacrifice" style="width: 100%; padding: 10px; background: #1a1a2e; color: #ffffff; border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; margin-top: 6px; font-size: 13px;">
          ${sacrificeOptions}
        </select>
      </div>
      
      <div style="text-align: left; margin-bottom: 16px;">
        <label style="font-weight: 700; font-size: 13px; color: var(--text-secondary);">Цель (хочешь получить):</label>
        <select id="upgradeTarget" style="width: 100%; padding: 10px; background: #1a1a2e; color: #ffffff; border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; margin-top: 6px; font-size: 13px;">
          ${targetOptions}
        </select>
      </div>
      
      <div id="upgradeChanceDisplay2" style="background: rgba(0,0,0,0.2); border-radius: 16px; padding: 14px; margin-bottom: 16px; text-align: center;">
        <div style="font-size: 13px; color: var(--text-secondary);">Шанс успеха:</div>
        <div style="font-family: 'Unbounded', sans-serif; font-size: 28px; font-weight: 800; color: var(--accent-gold);" id="upgradeChanceValue2">—</div>
      </div>
      
      <button class="btn" id="upgradeStartBtn2" style="background: linear-gradient(135deg, #FF00FF, #B400FF); box-shadow: 0 4px 20px rgba(180,0,255,0.4);">🎰 ЗАПУСТИТЬ ПЕРЕПЛАВКУ</button>
    </div>
  `;

  import('./ui.js').then(ui => {
    ui.openModal(html);

    setTimeout(() => {
      const sacrificeSelect = document.getElementById('upgradeSacrifice');
      const targetSelect = document.getElementById('upgradeTarget');
      const chanceDisplay = document.getElementById('upgradeChanceValue2');

      function updateChance() {
        const sacrificeId = sacrificeSelect.value;
        const targetId = targetSelect.value;
        if (sacrificeId && targetId) {
          const chance = calculateUpgradeChance(sacrificeId, targetId);
          chanceDisplay.textContent = chance + '%';
          chanceDisplay.style.color = chance >= 50 ? '#50C878' : chance >= 20 ? '#FFA500' : '#FF4444';
        }
      }

      sacrificeSelect.addEventListener('change', updateChance);
      targetSelect.addEventListener('change', updateChance);
      updateChance();

      document.getElementById('upgradeStartBtn2').addEventListener('click', () => {
        const sacrificeId = sacrificeSelect.value;
        const targetId = targetSelect.value;
        if (sacrificeId && targetId) {
          ui.closeModal();
          launchUpgradeWheel(sacrificeId, targetId, calculateUpgradeChance(sacrificeId, targetId));
        }
      });
    }, 10);
  });
}

function calculateUpgradeChance(sacrificeId, targetId) {
  const sacrifice = CONFIG_ITEMS[sacrificeId];
  const target = CONFIG_ITEMS[targetId];

  if (!sacrifice || !target) return 0;
  if (sacrifice.isCollectible || target.isCollectible) return 0;

  const sacrificeValue = sacrifice.sellValue;
  const targetValue = target.sellValue;

  if (targetValue <= sacrificeValue) return 90;

  const ratio = sacrificeValue / targetValue;
  const chance = Math.floor(ratio * 90);

  return Math.max(1, Math.min(90, chance));
}

function launchUpgradeWheel(sacrificeId, targetId, chance) {
  if (!setupCanvas()) return;

  cleanupGame();
  currentGame = 'upgrade';

  const isSuccess = Math.random() * 100 < chance;
  const successAngleDeg = (chance / 100) * 360;

  let stopAngleDeg;
  if (isSuccess) {
    const minGreen = 3;
    const maxGreen = Math.max(minGreen + 1, successAngleDeg - 3);
    stopAngleDeg = minGreen + Math.random() * (maxGreen - minGreen);
  } else {
    const minRed = Math.min(357, successAngleDeg + 3);
    const maxRed = 357;
    stopAngleDeg = minRed + Math.random() * Math.max(0, maxRed - minRed);
  }

  const fullRotations = (2 + Math.floor(Math.random() * 3)) * 360;
  const targetRotation = fullRotations + (360 - stopAngleDeg);

  gameState = {
    sacrificeId,
    targetId,
    chance,
    isSuccess,
    spinning: false,
    result: null,
    rotation: 0,
    targetRotation,
    spinStart: 0,
    spinDuration: 4000,
    successAngleDeg
  };

  overlay.classList.add('active');

  const handleTap = (e) => {
    e.preventDefault();
    if (gameState.spinning || gameState.result !== null) return;
    spinWheel();
  };

  canvas.addEventListener('click', handleTap);
  boundHandlers.click = handleTap;

  renderUpgradeWheel();
}

function spinWheel() {
  if (gameState.spinning) return;

  gameState.spinning = true;
  gameState.spinStart = Date.now();

  function animateSpin() {
    if (currentGame !== 'upgrade') return;

    const elapsed = Date.now() - gameState.spinStart;
    const progress = Math.min(1, elapsed / gameState.spinDuration);
    const eased = 1 - Math.pow(1 - progress, 3);

    gameState.rotation = eased * gameState.targetRotation;
    renderUpgradeWheel();

    if (progress < 1) {
      animationId = requestAnimationFrame(animateSpin);
    } else {
      gameState.rotation = gameState.targetRotation;
      renderUpgradeWheel();
      gameState.result = gameState.isSuccess;
      setTimeout(() => finishUpgrade(), 800);
    }
  }

  animationId = requestAnimationFrame(animateSpin);
}

function renderUpgradeWheel() {
  if (!ctx || !canvas) return;

  const { width, height } = canvas;
  const centerX = width / 2;
  const centerY = height / 2;
  const wheelRadius = Math.min(width, height) * 0.38;

  ctx.fillStyle = '#1a0a1a';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = 'bold 16px Unbounded, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🎰 Кузнечный Апгрейд', centerX, 40);

  const sacrifice = CONFIG_ITEMS[gameState.sacrificeId];
  const target = CONFIG_ITEMS[gameState.targetId];

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = 'bold 13px Montserrat, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Жертва: ${sacrifice?.name || '???'}`, 16, 80);

  ctx.textAlign = 'right';
  ctx.fillText(`Цель: ${target?.name || '???'}`, width - 16, 80);

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(gameState.rotation * Math.PI / 180);

  const successAngle = (gameState.chance / 100) * 360;

  ctx.fillStyle = 'rgba(80, 200, 120, 0.5)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, wheelRadius, -Math.PI / 2, -Math.PI / 2 + successAngle * Math.PI / 180);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(80, 200, 120, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 68, 68, 0.5)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, wheelRadius, -Math.PI / 2 + successAngle * Math.PI / 180, -Math.PI / 2 + 2 * Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 68, 68, 0.8)';
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - wheelRadius - 8);
  ctx.lineTo(centerX - 14, centerY - wheelRadius - 30);
  ctx.lineTo(centerX + 14, centerY - wheelRadius - 30);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  const chanceColor = gameState.chance >= 50 ? '#50C878' : gameState.chance >= 20 ? '#FFA500' : '#FF4444';
  ctx.fillStyle = chanceColor;
  ctx.font = 'bold 28px Unbounded, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Шанс: ${gameState.chance}%`, centerX, height - 60);

  if (!gameState.spinning && gameState.result === null) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '14px Montserrat, sans-serif';
    ctx.fillText('Тапни, чтобы запустить', centerX, height - 24);
  }

  if (gameState.result !== null) {
    const resultColor = gameState.result ? '#50C878' : '#FF4444';
    const resultText = gameState.result ? '🎉 УСПЕХ!' : '💔 НЕУДАЧА';
    ctx.fillStyle = resultColor;
    ctx.font = 'bold 24px Unbounded, sans-serif';
    ctx.fillText(resultText, centerX, height - 90);
  }
}

function finishUpgrade() {
  const state = getPlayerState();
  const sacrificeId = gameState.sacrificeId;
  const targetId = gameState.targetId;
  const isSuccess = gameState.isSuccess;

  if (isSuccess) {
    state.ingots[sacrificeId]--;
    state.ingots[targetId] = (state.ingots[targetId] || 0) + 1;
    state.minedStats[targetId] = (state.minedStats[targetId] || 0) + 1;
    state.player.totalIngots++;

    const targetIngot = CONFIG_ITEMS[targetId];
    import('./ui.js').then(ui => ui.showToast(`Успех! Получен ${targetIngot.name}!`, '⬤'));
    showResult('🎉 Успех!', 0, `${CONFIG_ITEMS[sacrificeId]?.name} → ${targetIngot.name}`);
  } else {
    state.ingots[sacrificeId]--;
    import('./ui.js').then(ui => ui.showToast(`Неудача! ${CONFIG_ITEMS[sacrificeId]?.name} сгорел.`, '🔥'));
    showResult('💔 Неудача', 0, `${CONFIG_ITEMS[sacrificeId]?.name} сгорел в печи`);
  }

  saveGame();

  setTimeout(() => {
    cleanupGame();
    if (overlay) overlay.classList.remove('active');
    import('./ui.js').then(ui => ui.renderCurrentTab());
  }, 3000);
}

// ========== Polyfill для roundRect ==========
initDOM();
if (ctx && !ctx.roundRect) {
  ctx.roundRect = function(x, y, w, h, r) {
    if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    ctx.lineTo(x + w, y + h - r.br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    ctx.lineTo(x + r.bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
  };
}

console.log('[Minigames] Модуль загружен. Игры: Закалка, Стопка, Апгрейд.');
