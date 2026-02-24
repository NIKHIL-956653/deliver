/* js/game.js - Final Release (Fast Physics + Fixed Walls) */

import { playSound, toggleMute } from "./sound.js";
import { capacity, neighbors, drawCell } from "./board.js";
import { buildPlayerSettings } from "./player.js";
import { makeAIMove, getProfessionalHint } from "./ai.js";
import { spawnParticles, triggerShake, triggerFlash, triggerGlitch, triggerHeat, startCelebration } from "./fx.js";
import { recordGameEnd, tryUnlockAchievement, loadData, saveTheme, getSavedTheme } from "./storage.js";
import { initMatrix, drawMatrix, stopMatrix, triggerMatrixFlash, matrixSettings } from "./matrix.js";
import { initMagma, drawMagma, stopMagma, magmaSettings as lavaRainSettings } from "./magma.js";

const $ = s => document.querySelector(s);
const boardEl = $("#board");
const statusText = $("#statusText");
const turnBadge = $("#turnBadge");
const gridSelect = $("#gridSelect");
const undoBtn = $("#undoBtn");
const soundBtn = $("#soundBtn");
const playerCountSelect = $("#playerCountSelect");
const modeSelect = document.getElementById("gameModeSelect");
const aiDifficultySelect = document.getElementById("aiDifficultySelect");
const timerContainer = document.getElementById("timerContainer");
const timeLeftSpan = document.getElementById("timeLeft");
const territoryMeter = document.getElementById("territoryMeter");
const gameModal = document.getElementById("gameModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalReplayBtn = document.getElementById("modalReplayBtn");
const modalMenuBtn = document.getElementById("modalMenuBtn");

let rows = 9, cols = 9, players = [], playerTypes = [];
let current = 0, board = [], playing = true, firstMove = [], history = [];
let scores = [], movesMade = 0, mode = "normal", timer = null;
let timeLimit = 120, timeLeft = timeLimit;
let aiTimeout = null, hintsRemaining = 3, lastMove = null;

let cyberSettings = { scanlines: true };
let localMagmaSettings = { lavaActive: true, heatActive: true };

function init() {
  initMatrix();
  initMagma();

  $("#startGameBtn")?.addEventListener("click", startGame);
  $("#backBtn")?.addEventListener("click", backToMenu);
  undoBtn?.addEventListener("click", undoMove);

  soundBtn?.addEventListener("click", () => {
    soundBtn.textContent = toggleMute() ? "🔇" : "🔊";
  });

  $("#hintBtn")?.addEventListener("click", useHint);
  $("#watchAdBtn")?.addEventListener("click", playFakeAd);
  $("#closeAdBtn")?.addEventListener("click", () => {
    document.getElementById("adModal").style.display = "none";
  });

  playerCountSelect?.addEventListener("change", () =>
    setupPlayers(parseInt(playerCountSelect.value, 10))
  );

  modeSelect?.addEventListener("change", handleModeChange);

  modalReplayBtn?.addEventListener("click", () => {
    closeModal();
    resetGame();
  });

  modalMenuBtn?.addEventListener("click", () => {
    closeModal();
    backToMenu();
  });

  const themeSelect = $("#themeSelect");
  const savedTheme = getSavedTheme();

  if (savedTheme) {
    applyTheme(savedTheme);
    if (themeSelect) themeSelect.value = savedTheme;
  }

  themeSelect?.addEventListener("change", e => {
    applyTheme(e.target.value);
    saveTheme(e.target.value);
  });

  // --- SIDEBAR ---
  $("#sidebarToggle")?.addEventListener("click", openSidebar);
  $("#closeSidebar")?.addEventListener("click", () => {
    document.getElementById("systemSidebar").classList.remove("active");
  });

  // Matrix controls
  document.getElementById("toggleRain")?.addEventListener("click", e => {
    matrixSettings.rainOn = !matrixSettings.rainOn;
    e.currentTarget.classList.toggle("active", matrixSettings.rainOn);
    e.currentTarget.textContent = matrixSettings.rainOn ? "RAIN: ON" : "RAIN: OFF";
    matrixSettings.rainOn ? drawMatrix() : stopMatrix();
  });
  document.getElementById("toggleSymbols")?.addEventListener("click", e => {
    matrixSettings.japaneseOn = !matrixSettings.japaneseOn;
    e.currentTarget.textContent = matrixSettings.japaneseOn ? "MODE: KANJI" : "MODE: BINARY";
  });
  document.getElementById("toggleFlash")?.addEventListener("click", e => {
    matrixSettings.flashOn = !matrixSettings.flashOn;
    e.currentTarget.classList.toggle("active", matrixSettings.flashOn);
    e.currentTarget.textContent = matrixSettings.flashOn ? "FLASH: ON" : "FLASH: OFF";
  });

  // Cyberpunk controls
  document.getElementById("toggleScanlines")?.addEventListener("click", e => {
    cyberSettings.scanlines = !cyberSettings.scanlines;
    document.body.classList.toggle("scanlines-active", cyberSettings.scanlines);
    e.currentTarget.classList.toggle("active", cyberSettings.scanlines);
    e.currentTarget.textContent = cyberSettings.scanlines ? "SCANLINES: ON" : "SCANLINES: OFF";
  });
  document.getElementById("toggleGlitch")?.addEventListener("click", e => {
    const on = document.body.classList.toggle("glitch-active");
    e.currentTarget.classList.toggle("active", on);
    e.currentTarget.textContent = on ? "GLITCH: ON" : "GLITCH: OFF";
  });
  document.getElementById("toggleHUD")?.addEventListener("click", e => {
    const sharp = document.body.classList.toggle("hud-sharp");
    e.currentTarget.textContent = sharp ? "HUD: SHARP" : "HUD: ROUND";
    paintAll();
  });

  // Magma controls
  document.getElementById("toggleLava")?.addEventListener("click", e => {
    localMagmaSettings.lavaActive = !localMagmaSettings.lavaActive;
    e.currentTarget.classList.toggle("active", localMagmaSettings.lavaActive);
    e.currentTarget.textContent = localMagmaSettings.lavaActive ? "LAVA: ON" : "LAVA: OFF";
    if (localMagmaSettings.lavaActive) {
      document.body.classList.add("lava-active");
      lavaRainSettings.rainOn = true;
      drawMagma();
    } else {
      document.body.classList.remove("lava-active");
      stopMagma();
    }
  });
  document.getElementById("toggleHeat")?.addEventListener("click", e => {
    localMagmaSettings.heatActive = !localMagmaSettings.heatActive;
    e.currentTarget.classList.toggle("active", localMagmaSettings.heatActive);
    e.currentTarget.textContent = localMagmaSettings.heatActive ? "HEAT: ON" : "HEAT: OFF";
  });

  handleModeChange();
}

function openSidebar() {
  document.getElementById("systemSidebar").classList.add("active");
  document.getElementById("matrixSidebarControls").style.display = "none";
  document.getElementById("cyberpunkSidebarControls").style.display = "none";
  document.getElementById("magmaSidebarControls").style.display = "none";

  if (document.body.classList.contains("theme-matrix"))
    document.getElementById("matrixSidebarControls").style.display = "block";
  else if (document.body.classList.contains("theme-cyberpunk"))
    document.getElementById("cyberpunkSidebarControls").style.display = "block";
  else if (document.body.classList.contains("theme-magma"))
    document.getElementById("magmaSidebarControls").style.display = "block";
}

function applyTheme(t) {
  document.body.classList.remove(
    "theme-cyberpunk",
    "theme-magma",
    "theme-matrix",
    "scanlines-active",
    "lava-active"
  );

  stopMatrix();
  stopMagma();

  if (t === "theme-matrix") {
    document.body.classList.add("theme-matrix");
    matrixSettings.rainOn = true;
    drawMatrix();
  } else if (t === "theme-cyberpunk") {
    document.body.classList.add("theme-cyberpunk");
    if (cyberSettings.scanlines)
      document.body.classList.add("scanlines-active");
  } else if (t === "theme-magma") {
    document.body.classList.add("theme-magma");
    if (localMagmaSettings.lavaActive) {
      document.body.classList.add("lava-active");
      lavaRainSettings.rainOn = true;
      drawMagma();
    }
  }
}

function startGame() {
  if (!playerTypes || playerTypes.length === 0) {
      const count = parseInt(playerCountSelect.value, 10) || 2;
      setupPlayers(count);
  }

  document.getElementById("mainMenu").style.display = "none";
  document.getElementById("gameView")?.classList.add("active");
  resetGame();
}

function backToMenu() {
  playing = false;
  clearTimeout(aiTimeout);
  stopTimer();
  closeModal();
  document.getElementById("gameView")?.classList.remove("active");
  document.getElementById("mainMenu").style.display = "flex";
  boardEl.innerHTML = "";
}

function setupPlayers(count) {
  buildPlayerSettings(count, players, playerTypes, () => {}, () => {}, current);
}

function handleModeChange() {
  mode = modeSelect.value;
  if (timerContainer)
    timerContainer.style.display = mode === "timeAttack" ? "inline-block" : "none";
}

function resetGame() {
  closeModal();
  const [c, r] = gridSelect.value.split("x").map(Number);
  cols = c;
  rows = r;
  current = 0;
  playing = true;

  firstMove = players.map(() => false);
  history = [];
  movesMade = 0;

  // --- FIXED: Initialize cells correctly ---
  board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      owner: -1,
      count: 0,
      isBlocked: false 
    }))
  );

  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = document.createElement("button");
      cell.className = "cell";
      cell.addEventListener("click", () => handleMove(x, y));
      boardEl.appendChild(cell);
    }
  }

  lastMove = null;
  hintsRemaining = 3;
  updateHintCount();
  updateStatus();
  updateScores();
  paintAll();
  if (mode === "timeAttack") {
    timeLeft = timeLimit;
    if (timeLeftSpan) timeLeftSpan.textContent = timeLeft;
    startTimer();
  }
  processTurn();
}

function handleMove(x, y) {
  if (!playerTypes[current]) return; 
  if (!playing || playerTypes[current].type === "ai") return;
  if (board[y][x].owner !== -1 && board[y][x].owner !== current) return;
  makeMove(x, y);
}

async function makeMove(x, y) {
  playSound("click");
  lastMove = { x, y };

  history.push(JSON.stringify({
      board: board.map(r => r.map(c => ({...c}))), 
      current, 
      scores: [...scores] 
  }));

  board[y][x].owner = current;
  board[y][x].count += 1;
  movesMade++;

  drawCell(x, y, board, boardEl, cols, players, current);

  await resolveReactions();

  firstMove[current] = true;
  updateScores();

  if (playing && !checkWin()) advanceTurn();
}

/* ⭐ FAST PHYSICS SYSTEM */
async function resolveReactions() {
  const q = [];

  const findExplosions = () => {
    q.length = 0;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        if (board[y][x].count >= capacity(x, y, rows, cols))
          q.push([x, y]);
  };

  findExplosions();
  if (!q.length) return;

  const sleep = ms => new Promise(r => requestAnimationFrame(() => setTimeout(r, ms)));
  let loops = 0;

  // Increased loop limit slightly, but increased speed dramatically
  while (q.length && loops++ < 1000) {
    updateScores();

    // Early exit: if only one player has orbs the game is decided — skip the rest of the animation
    if (movesMade >= players.length && players.filter((_, i) => scores[i] > 0).length <= 1) break;

    if (document.body.classList.contains("theme-matrix")) triggerMatrixFlash();
    if (localMagmaSettings.heatActive) triggerHeat();

    const wave = [...new Set(q.map(([x, y]) => `${x},${y}`))]
      .map(s => s.split(",").map(Number));

    q.length = 0;

    for (const [x, y] of wave) {
      const cap = capacity(x, y, rows, cols);
      const cell = board[y][x];

      if (cell.count < cap) continue;

      try {
        const idx = y * cols + x;
        const cellEl = boardEl.children[idx];
        const r = cellEl.getBoundingClientRect();

        spawnParticles(r.left + r.width / 2, r.top + r.height / 2, players[current].color);

        // Subtle pop effect (not the giant scale from before)
        cellEl.style.transform = "scale(1.1)";
        setTimeout(() => { cellEl.style.transform = ""; }, 100);

      } catch (e) {
        spawnParticles(x, y, players[current].color);
      }

      cell.count -= cap;
      if (cell.count === 0) cell.owner = -1;

      playSound("explode");
      drawCell(x, y, board, boardEl, cols, players, current);

      for (const [nx, ny] of neighbors(x, y, rows, cols, board)) {
        board[ny][nx].owner = current;
        board[ny][nx].count += 1;
        drawCell(nx, ny, board, boardEl, cols, players, current);
      }
    }

    findExplosions();
    
    // ⭐ THE FIX: 50ms delay (Fast & Snappy)
    await sleep(50);
  }
}

function updateScores() {
  scores = players.map(() => 0);
  let total = 0;

  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      if (board[y][x].owner !== -1) {
        scores[board[y][x].owner] += board[y][x].count;
        total += board[y][x].count;
      }
      
  if (territoryMeter && total > 0) {
      territoryMeter.innerHTML = '';
      players.forEach((p, i) => {
          if (scores[i] > 0) {
              const b = document.createElement('div');
              b.className = 'meter-bar';
              b.style.width = (scores[i]/total)*100 + '%';
              b.style.backgroundColor = p.color;
              territoryMeter.appendChild(b);
          }
      });
  }
}

function updateStatus() {
  if (players[current]) {
    statusText.textContent = `${players[current].name}'s turn`;
    turnBadge.style.background = players[current].color;
  }
}

function checkWin() {
  const aliveIndices = players.map((_, i) => i).filter(i => scores[i] > 0);

  if (movesMade >= players.length && aliveIndices.length === 1) {
    playing = false;
    stopTimer();
    const winnerName = players[aliveIndices[0]].name;
    showGameOver("Victory!", `${winnerName} has secured the system!`, true);
    return true;
  }
  return false;
}

function advanceTurn() {
  let loops = 0;
  do {
      current = (current + 1) % players.length;
      loops++;
  } while (firstMove[current] && scores[current] === 0 && loops < players.length);

  updateStatus();
  paintAll(true);
  if (playing) processTurn();
}

function processTurn() {
  if (!playerTypes[current]) return;
  if (!playing || playerTypes[current].type !== "ai") return;

  clearTimeout(aiTimeout);

  statusText.textContent = "CALCULATING...";
  
  const aiDelay = parseInt(document.getElementById("aiSpeedSelect")?.value || "300", 10);
  aiTimeout = setTimeout(() => {
    const diff = playerTypes[current].difficulty || "hard";
    const move = makeAIMove(board, current, diff, rows, cols, players.length);
    if (move) makeMove(move.x, move.y);
  }, aiDelay);
}

function paintAll(withPulse = false) {
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      drawCell(x, y, board, boardEl, cols, players, current, withPulse);
  highlightLastMove();
}

function highlightLastMove() {
  if (!lastMove) return;
  const idx = lastMove.y * cols + lastMove.x;
  boardEl.children[idx]?.classList.add("last-move");
}

function useHint() {
  if (!playing) return;
  if (hintsRemaining <= 0) {
    document.getElementById("adModal").style.display = "flex";
    return;
  }
  const best = getProfessionalHint(board, current, rows, cols);
  if (!best) return;

  hintsRemaining--;
  updateHintCount();

  const reason = getHintReason(best);
  const cellEl = boardEl.children[best.y * cols + best.x];
  cellEl.classList.add("hint-active");
  cellEl.title = reason;
  setTimeout(() => {
    cellEl.classList.remove("hint-active");
    cellEl.title = "";
  }, 3000);

  const hudMsg = document.getElementById("hudMessage");
  if (hudMsg) {
    hudMsg.textContent = `💡 Hint: This move ${reason}`;
    hudMsg.classList.add("active");
    setTimeout(() => {
      hudMsg.textContent = "";
      hudMsg.classList.remove("active");
    }, 3500);
  }
}

function playFakeAd() {
  hintsRemaining += 5;
  updateHintCount();
  document.getElementById("adModal").style.display = "none";
}

function undoMove() {
    if (!history.length || !playing) return;
    const prev = JSON.parse(history.pop());
    board = prev.board;
    current = prev.current;
    scores = prev.scores;
    lastMove = null;
    paintAll();
    updateStatus();
    updateScores();
}

function startTimer() {
  stopTimer();
  timer = setInterval(() => {
    if (!playing) { stopTimer(); return; }
    timeLeft--;
    if (timeLeftSpan) timeLeftSpan.textContent = timeLeft;
    if (timeLeft <= 0) {
      stopTimer();
      playing = false;
      const bestIdx = scores.indexOf(Math.max(...scores));
      const winnerName = players[bestIdx]?.name || "Unknown";
      showGameOver("Time's Up!", `${winnerName} wins with the most orbs!`, true);
    }
  }, 1000);
}

function updateHintCount() {
  const span = document.getElementById("hintCount");
  if (span) span.textContent = hintsRemaining;
}

function getHintReason(move) {
  const { x, y } = move;
  const cap = capacity(x, y, rows, cols);
  const cell = board[y][x];

  if (cell.count + 1 >= cap) return "triggers a chain reaction!";
  if (cap === 2) return "secures a corner — very hard to lose!";

  const nbrs = neighbors(x, y, rows, cols, board);
  const enemyCrits = nbrs.filter(([nx, ny]) => {
    const nb = board[ny][nx];
    return nb.owner !== -1 && nb.owner !== current && nb.count >= capacity(nx, ny, rows, cols) - 1;
  });
  if (enemyCrits.length > 0) return "blocks an enemy chain reaction!";

  const enemyNbrs = nbrs.filter(([nx, ny]) =>
    board[ny][nx].owner !== -1 && board[ny][nx].owner !== current
  );
  if (enemyNbrs.length > 0) return "puts pressure on enemy territory!";

  if (cap === 3) return "controls a strong edge position!";
  return "best strategic position available!";
}

function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
}

function closeModal() {
  gameModal.style.display = "none";
}

function showGameOver(t, m, w) {
  playSound("win");
  startCelebration();
  modalTitle.textContent = t;
  modalBody.innerHTML = m;
  gameModal.style.display = "flex";
}

init();