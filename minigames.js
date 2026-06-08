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

// Настройка Canvas с учётом DPR (Retina-дисплеи)
function setupCanvas() {
  if (!canvas || !overlay) return false;

  const maxWidth = Math.min(window.innerWidth - 32, 400);
  const maxHeight = Math.min(window.innerHeight - 120, 600);
  const dpr = window.devicePixelRatio || 1;

  canvas.width = maxWidth * dpr;
  canvas.height = maxHeight * dpr;
  canvas.style.width = maxWidth + 'px';
  canvas.style.height = maxHeight + 'px';
  ctx.scale(dpr, dpr);

  // Сохраняем логические размеры для удобства
  canvas._logicalWidth = maxWidth;
  canvas._logicalHeight = maxHeight;

  return true;
}

// Универсальный индикатор редкости (4 типа)
function getRarityIndicator(rarityLevel) {
  switch (rarityLevel) {
    case 'common': return { icon: '🔴', color: '#A0A0A0', name: 'Обычный', bg: 'rgba(160,160,160,0.2)' };
    case 'rare': return { icon: '🔵', color: '#4A9CFF', name: 'Редкий', bg: 'rgba(74,156,255,0.2)' };
    case 'epic': return { icon: '🟣', color: '#B44AFF', name: 'Эпический', bg: 'rgba(180,74,255,0.2)' };
    case 'legendary': return { icon: '🟡', color: '#FFD700', name: 'Легендарный', bg: 'rgba(255,215,0,0.2)' };
    case 'collectible': return { icon: '🟡', color: '#FF64FF', name: 'Коллекционный', bg: 'rgba(255,100,255,0.2)' };
    default: return { icon: '🔴', color: '#A0A0A0', name: 'Обычный', bg: 'rgba(160,160,160,0.2)' };
  }
}

// ========== ЭКСПОРТ: СТОП ТЕКУЩЕЙ ИГРЫ ==========
export function stopCurrentGame() {
  cleanupGame();
  if (overlay) overlay.classList.remove('active');
}

// ========== ЭКСПОРТ: ЗАПУСК ЗАКАЛКИ (АКТУАЛЬНАЯ ВЕРСИЯ) ==========
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

  const w = canvas._logicalWidth;
  const h = canvas._logicalHeight;

  gameState = {
    score: 0,
    topPlatePos: 0.05,
    bottomPlatePos: 0.95,
    topPlateTarget: 0.05,
    bottomPlateTarget: 0.95,
    speed: 0.004,
    tapPushback: 0.08,
    elapsedTime: 0,
    lastTime: Date.now(),
    ingotHeight: 60,
    ingotWidth: 80,
    shakeAmount: 0,
    sparks: [],
    crashZoneCenter: 0.08,
    crashZoneEdge: 0.04,
    countdown: 3,
    countdownStart: Date.now(),
    gameStarted: false,
    canvasW: w,
    canvasH: h
  };

  overlay.classList.add('active');

  const handleTap = (e) => {
    e.preventDefault();
    if (currentGame !== 'quench') return;
    if (!gameState.gameStarted) return;

    gameState.topPlateTarget -= gameState.tapPushback;
    gameState.bottomPlateTarget += gameState.tapPushback;

    gameState.topPlateTarget = Math.max(0, gameState.topPlateTarget);
    gameState.bottomPlateTarget = Math.min(1, gameState.bottomPlateTarget);

    // Проверка на попадание в красные зоны (самые края)
    if (gameState.topPlateTarget >= 1 - gameState.crashZoneEdge || gameState.bottomPlateTarget <= gameState.crashZoneEdge) {
      endQuenchGame('broken');
      return;
    }

    for (let i = 0; i < 5; i++) {
      gameState.sparks.push({
        x: w / 2 + (Math.random() - 0.5) * gameState.ingotWidth,
        y: h / 2 + (Math.random() - 0.5) * gameState.ingotHeight,
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

    // Обратный отсчёт
    if (!gameState.gameStarted) {
      const elapsed = (now - gameState.countdownStart) / 1000;
      gameState.countdown = Math.max(0, 3 - Math.floor(elapsed));
      if (elapsed >= 3) {
        gameState.gameStarted = true;
        gameState.countdown = 0;
        gameState.lastTime = Date.now();
      }
      renderQuench();
      animationId = requestAnimationFrame(gameLoop);
      return;
    }

    // Плавное движение плит к целевым позициям (lerp)
    const lerpSpeed = 12;
    gameState.topPlatePos += (gameState.topPlateTarget - gameState.topPlatePos) * lerpSpeed * dt;
    gameState.bottomPlatePos += (gameState.bottomPlateTarget - gameState.bottomPlatePos) * lerpSpeed * dt;

    // Автоматическое сжатие
    gameState.topPlateTarget += gameState.speed * dt * 60;
    gameState.bottomPlateTarget -= gameState.speed * dt * 60;
    gameState.topPlateTarget = Math.min(1, gameState.topPlateTarget);
    gameState.bottomPlateTarget = Math.max(0, gameState.bottomPlateTarget);

    // Двигаем реальные позиции к сжатию
    gameState.topPlatePos += gameState.speed * dt * 60;
    gameState.bottomPlatePos -= gameState.speed * dt * 60;
    gameState.topPlatePos = Math.min(1, gameState.topPlatePos);
    gameState.bottomPlatePos = Math.max(0, gameState.bottomPlatePos);

    // Проверка: плиты коснулись друг друга в центре
    if (gameState.topPlatePos >= gameState.bottomPlatePos) {
      endQuenchGame('crushed');
      return;
    }

    // Проверка: плиты улетели в крайние красные зоны
    if (gameState.topPlatePos <= gameState.crashZoneEdge || gameState.bottomPlatePos >= 1 - gameState.crashZoneEdge) {
      endQuenchGame('broken');
      return;
    }

    gameState.elapsedTime += dt;
    gameState.score = Math.floor(gameState.elapsedTime * 10);

    const timeBonus = Math.floor(gameState.elapsedTime / 5);
    gameState.speed = 0.004 * Math.pow(1.18, timeBonus);

    const topInDanger = gameState.topPlatePos <= gameState.crashZoneEdge;
    const bottomInDanger = gameState.bottomPlatePos >= 1 - gameState.crashZoneEdge;
    const centerClose = (gameState.bottomPlatePos - gameState.topPlatePos) < gameState.crashZoneCenter;
    gameState.shakeAmount = (topInDanger || bottomInDanger || centerClose) ? 2 : 0;

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

  const w = gameState.canvasW;
  const h = gameState.canvasH;
  const gs = gameState;

  // Если идёт отсчёт — показываем только его
  if (!gs.gameStarted) {
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 64px Unbounded, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (gs.countdown > 0) {
      ctx.fillText(gs.countdown, w / 2, h / 2 - 20);
    } else {
      ctx.fillText('ЗАКАЛКА!', w / 2, h / 2 - 20);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 16px Montserrat, sans-serif';
    ctx.fillText('Приготовься...', w / 2, h / 2 + 40);
    return;
  }

  const shakeX = (Math.random() - 0.5) * gs.shakeAmount * 2;
  const shakeY = (Math.random() - 0.5) * gs.shakeAmount * 2;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Фон
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#2a2a2e');
  bgGrad.addColorStop(0.5, '#1a1a1c');
  bgGrad.addColorStop(1, '#2a2a2e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Красные зоны по краям (пресс сломан)
  const edgeZonePx = gs.crashZoneEdge * h;
  ctx.fillStyle = 'rgba(255, 0, 0, 0.35)';
  ctx.fillRect(0, 0, w, edgeZonePx);
  ctx.fillRect(0, h - edgeZonePx, w, edgeZonePx);
  ctx.strokeStyle = 'rgba(255, 60, 60, 0.9)';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 3]);
  ctx.beginPath();
  ctx.moveTo(0, edgeZonePx);
  ctx.lineTo(w, edgeZonePx);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, h - edgeZonePx);
  ctx.lineTo(w, h - edgeZonePx);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 1;

  // Красная зона в центре (слиток раздавлен)
  const centerZoneHalf = (gs.crashZoneCenter * h) / 2;
  const centerY = h / 2;
  ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
  ctx.fillRect(w * 0.05, centerY - centerZoneHalf, w * 0.9, centerZoneHalf * 2);
  ctx.strokeStyle = 'rgba(255, 80, 80, 0.7)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(w * 0.05, centerY - centerZoneHalf, w * 0.9, centerZoneHalf * 2);
  ctx.setLineDash([]);
  ctx.lineWidth = 1;

  // Верхняя плита
  const topY = gs.topPlatePos * h;
  const plateGradTop = ctx.createLinearGradient(0, topY - 8, 0, topY + 8);
  plateGradTop.addColorStop(0, '#FF4500');
  plateGradTop.addColorStop(0.5, '#FF8C00');
  plateGradTop.addColorStop(1, '#FFD700');
  ctx.fillStyle = plateGradTop;
  ctx.shadowColor = 'rgba(255, 100, 0, 0.8)';
  ctx.shadowBlur = 20 + gs.shakeAmount * 10;
  ctx.fillRect(w * 0.05, topY - 6, w * 0.9, 12);
  ctx.shadowBlur = 0;

  // Нижняя плита
  const bottomY = gs.bottomPlatePos * h;
  const plateGradBottom = ctx.createLinearGradient(0, bottomY - 6, 0, bottomY + 6);
  plateGradBottom.addColorStop(0, '#87CEEB');
  plateGradBottom.addColorStop(0.5, '#1E90FF');
  plateGradBottom.addColorStop(1, '#00BFFF');
  ctx.fillStyle = plateGradBottom;
  ctx.shadowColor = 'rgba(0, 191, 255, 0.8)';
  ctx.shadowBlur = 20 + gs.shakeAmount * 10;
  ctx.fillRect(w * 0.05, bottomY - 6, w * 0.9, 12);
  ctx.shadowBlur = 0;

  // Слиток — между плитами
  const ingotCenterY = (topY + bottomY) / 2;
  const ingotScale = Math.max(0.3, (bottomY - topY) / 200);
  const ingotW = gs.ingotWidth * ingotScale;
  const ingotH = Math.min(gs.ingotHeight, Math.max(4, bottomY - topY - 20));
  const ingotX = w / 2 - ingotW / 2;
  const ingotY = ingotCenterY - ingotH / 2;

  if (ingotH > 4) {
    const ingotGrad = ctx.createLinearGradient(ingotX, ingotY, ingotX + ingotW, ingotY + ingotH);
    ingotGrad.addColorStop(0, '#B87333');
    ingotGrad.addColorStop(0.3, '#FFD700');
    ingotGrad.addColorStop(0.7, '#FFA500');
    ingotGrad.addColorStop(1, '#8B4513');

    ctx.fillStyle = ingotGrad;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(ingotX, ingotY, ingotW, ingotH, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

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

  // Score
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 14px Unbounded, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCORE', w / 2, 26);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 48px Unbounded, sans-serif';
  ctx.fillText(gs.score, w / 2, 64);

  ctx.restore();
}

function endQuenchGame(reason) {
  const score = gameState.score;
  let rewardText = '';
  let title = 'Закалка завершена!';
  const state = getPlayerState();

  if (reason === 'crushed') {
    title = 'Слиток раздавлен!';
  } else if (reason === 'broken') {
    title = 'Пресс сломан!';
  }

  // ВСЕГДА выдаём награды за очки
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

  showResult(title, score, rewardText);
  currentGame = null;
  import('./ui.js').then(ui => ui.renderCurrentTab());
}

// ========== ЭКСПОРТ: ЗАПУСК СТОПКИ ==========
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

  const w = canvas._logicalWidth;
  const h = canvas._logicalHeight;
  const blockHeight = 28;
  const baseY = h - 30;
  const baseSpeed = 3.0;
  const randomDirection = Math.random() > 0.5 ? 1 : -1;

  gameState = {
    score: 0,
    blockWidth: 120,
    minBlockWidth: 15,
    currentX: randomDirection === 1 ? 0 : w - 120,
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
    baseSpeed: baseSpeed,
    canvasW: w,
    canvasH: h
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
      const maxX = gameState.canvasW - gameState.blockWidth;
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

  gameState.direction = Math.random() > 0.5 ? 1 : -1;
  gameState.currentX = gameState.direction === 1 ? 0 : gameState.canvasW - gameState.blockWidth;

  gameState.falling = false;
  gameState.fallBlock = null;
  gameState.fallProgress = 0;
}

function renderStack() {
  if (!ctx || !canvas) return;

  const w = gameState.canvasW;
  const h = gameState.canvasH;
  const gs = gameState;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#1a1a2e');
  bgGrad.addColorStop(1, '#0a0a14');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 22px Unbounded, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`🏆 Башня: ${gs.score}`, w / 2, 38);

  const baseY = gs.baseY;
  ctx.fillStyle = '#455A64';
  ctx.shadowColor = 'rgba(96, 125, 139, 0.4)';
  ctx.shadowBlur = 10;
  ctx.fillRect(w * 0.05, baseY, w * 0.9, 12);
  ctx.shadowBlur = 0;

  gs.blocks.forEach((block, index) => {
    const blockY = baseY - (index + 1) * gs.blockHeight;
    drawBlock(block.x, blockY, block.width, gs.blockHeight);
  });

  if (gs.falling && gs.fallBlock) {
    const fb = gs.fallBlock;
    const currentY = gs.fallStartY + (gs.fallTargetY - gs.fallStartY) * gs.fallProgress;
    fb.currentY = currentY;
    drawBlock(fb.x, currentY, fb.width, gs.blockHeight);
  }

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

// ========== ЭКСПОРТ: ЗАПУСК АПГРЕЙДА ==========
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
  let sacrificeItemsHtml = '';
  availableIngots.forEach(({ id, count, ingot }) => {
    const indicator = getRarityIndicator(ingot.rarityLevel);
    sacrificeItemsHtml += `
      <div class="upgrade-ingot-item" data-sacrifice="${id}" style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:${indicator.bg}; border-radius:12px; cursor:pointer; margin-bottom:6px; transition:all 0.2s;">
        <span style="font-size:18px;">${indicator.icon}</span>
        <div style="flex:1; text-align:left;">
          <div style="font-weight:600; font-size:13px; color:#fff;">${ingot.name}</div>
          <div style="font-size:10px; color:rgba(255,255,255,0.5);">${count} шт. · Ценность: ${ingot.sellValue}</div>
        </div>
      </div>
    `;
  });

  let targetItemsHtml = '';
  Object.entries(CONFIG_ITEMS).forEach(([id, ingot]) => {
    if (!ingot.isCollectible) {
      const indicator = getRarityIndicator(ingot.rarityLevel);
      targetItemsHtml += `
        <div class="upgrade-ingot-item" data-target="${id}" style="display:flex; align-items:center; gap:10px; padding:10px 12px; background:${indicator.bg}; border-radius:12px; cursor:pointer; margin-bottom:6px; transition:all 0.2s;">
          <span style="font-size:18px;">${indicator.icon}</span>
          <div style="flex:1; text-align:left;">
            <div style="font-weight:600; font-size:13px; color:#fff;">${ingot.name}</div>
            <div style="font-size:10px; color:rgba(255,255,255,0.5);">${indicator.name} · Ценность: ${ingot.sellValue}</div>
          </div>
        </div>
      `;
    }
  });

  const html = `
    <div class="modal-header">
      <div class="modal-title">🎰 Кузнечный Апгрейд</div>
      <button class="modal-close" onclick="document.dispatchEvent(new Event('closeModal'))">✕</button>
    </div>
    <div class="modal-content" style="text-align:left;">
      <div class="modal-description" style="text-align:center;">Выбери жертву и цель. Шанс зависит от разницы в ценности!</div>
      
      <div style="display:flex; justify-content:center; gap:10px; margin-bottom:12px; font-size:10px; color:rgba(255,255,255,0.6); flex-wrap:wrap;">
        <span>🔴 Обыч.</span>
        <span>🔵 Редк.</span>
        <span>🟣 Эпик</span>
        <span>🟡 Лег.</span>
      </div>
      
      <div style="margin-bottom:12px;">
        <div style="font-weight:700; font-size:13px; color:var(--text-secondary); margin-bottom:6px;">🔥 Жертва: <span id="selectedSacrificeName" style="color:#FF4444;">не выбрана</span></div>
        <div style="max-height:150px; overflow-y:auto; background:rgba(0,0,0,0.3); border-radius:16px; padding:8px; border:1px solid var(--card-border);" id="sacrificeList">
          ${sacrificeItemsHtml}
        </div>
      </div>
      
      <div style="margin-bottom:16px;">
        <div style="font-weight:700; font-size:13px; color:var(--text-secondary); margin-bottom:6px;">🎯 Цель: <span id="selectedTargetName" style="color:#50C878;">не выбрана</span></div>
        <div style="max-height:150px; overflow-y:auto; background:rgba(0,0,0,0.3); border-radius:16px; padding:8px; border:1px solid var(--card-border);" id="targetList">
          ${targetItemsHtml}
        </div>
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
      let selectedSacrifice = null;
      let selectedTarget = null;

      document.querySelectorAll('[data-sacrifice]').forEach(el => {
        el.addEventListener('click', () => {
          document.querySelectorAll('[data-sacrifice]').forEach(e => e.style.border = 'none');
          el.style.border = '2px solid #FFD700';
          selectedSacrifice = el.dataset.sacrifice;
          document.getElementById('selectedSacrificeName').textContent = CONFIG_ITEMS[selectedSacrifice]?.name || 'выбрана';
          updateChance();
        });
      });

      document.querySelectorAll('[data-target]').forEach(el => {
        el.addEventListener('click', () => {
          document.querySelectorAll('[data-target]').forEach(e => e.style.border = 'none');
          el.style.border = '2px solid #FFD700';
          selectedTarget = el.dataset.target;
          document.getElementById('selectedTargetName').textContent = CONFIG_ITEMS[selectedTarget]?.name || 'выбрана';
          updateChance();
        });
      });

      function updateChance() {
        if (selectedSacrifice && selectedTarget) {
          const chance = calculateUpgradeChance(selectedSacrifice, selectedTarget);
          const display = document.getElementById('upgradeChanceValue2');
          display.textContent = chance + '%';
          display.style.color = chance >= 50 ? '#50C878' : chance >= 20 ? '#FFA500' : '#FF4444';
        }
      }

      document.getElementById('upgradeStartBtn2').addEventListener('click', () => {
        if (selectedSacrifice && selectedTarget) {
          ui.closeModal();
          launchUpgradeWheel(selectedSacrifice, selectedTarget, calculateUpgradeChance(selectedSacrifice, selectedTarget));
        } else {
          ui.showToast('Выбери жертву и цель!', '⚠️');
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

  const w = canvas._logicalWidth;
  const h = canvas._logicalHeight;

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
    successAngleDeg,
    canvasW: w,
    canvasH: h
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

  const w = gameState.canvasW;
  const h = gameState.canvasH;
  const centerX = w / 2;
  const centerY = h / 2;
  const wheelRadius = Math.min(w, h) * 0.38;

  ctx.fillStyle = '#1a0a1a';
  ctx.fillRect(0, 0, w, h);

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
  ctx.fillText(`Цель: ${target?.name || '???'}`, w - 16, 80);

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
  ctx.fillText(`Шанс: ${gameState.chance}%`, centerX, h - 60);

  if (!gameState.spinning && gameState.result === null) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '14px Montserrat, sans-serif';
    ctx.fillText('Тапни, чтобы запустить', centerX, h - 24);
  }

  if (gameState.result !== null) {
    const resultColor = gameState.result ? '#50C878' : '#FF4444';
    const resultText = gameState.result ? '🎉 УСПЕХ!' : '💔 НЕУДАЧА';
    ctx.fillStyle = resultColor;
    ctx.font = 'bold 24px Unbounded, sans-serif';
    ctx.fillText(resultText, centerX, h - 90);
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
    import('./ui.js').then(ui => ui.showToast(`Успех! Получен ${targetIngot.name}!`, '🟡'));
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

console.log('[Minigames] Модуль загружен. Игры: Закалка, Стопка, Апгрейд. DPR-фикс применён.');
