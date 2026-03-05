/* js/game.js - Final Release (Fast Physics + Fixed Walls) */

import { playSound, toggleMute } from "./sound.js";
import { capacity, neighbors, drawCell } from "./board.js";
import { buildPlayerSettings } from "./player.js";
import { makeAIMove, getProfessionalHint } from "./ai.js";
import { spawnParticles, spawnShockwave, spawnVoidCollapse, spawnPulse, spawnRipple, spawnVoidImplosion, spawnMegaBlast, triggerShake, triggerFlash, triggerGlitch, triggerHeat, startCelebration, setBackgroundPulse } from "./fx.js";
import { recordGameEnd, tryUnlockAchievement, loadData, saveTheme, getSavedTheme,
         isDailyCompleted, completeDailyChallenge, getDailyStreak,
         saveLevelStars, getLevelStars, getAllLevelStars,
         addXP, getXPInfo, saveSkin, getSavedSkin,
         saveBlastSkin, getSavedBlastSkin,
         getCoins, addCoins, spendCoins,
         canClaimDailyCoins, claimDailyCoins } from "./storage.js";
import { SAGA_LEVELS } from "./levels.js";
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
const modalSkipBtn = document.getElementById("modalSkipBtn");

let rows = 9, cols = 9, players = [], playerTypes = [];
let current = 0, board = [], playing = true, firstMove = [], history = [];
let scores = [], movesMade = 0, mode = "normal", timer = null;
let timeLimit = 120, timeLeft = timeLimit;
let aiTimeout = null, hintsRemaining = 1000, lastMove = null; // TODO: set to 3 before release
let aiWorker = null, aiMoveId = 0;
let sagaCurrentLevel = 0;
let sagaConsecutiveFails = 0;
let isDailyMode = false;
let hintsUsed = 0;
let gameCount = parseInt(localStorage.getItem("gameCount") || "0", 10);

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

  document.getElementById("closeLevelSelectBtn")?.addEventListener("click", () => {
    document.getElementById("levelSelectModal").style.display = "none";
    backToMenu();
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

  document.getElementById("modalNextBtn")?.addEventListener("click", () => {
    sagaCurrentLevel = Math.min(sagaCurrentLevel + 1, SAGA_LEVELS.length - 1);
    closeModal();
    resetGame();
  });

  modalSkipBtn?.addEventListener("click", () => {
    closeModal();
    showInterstitialAd(() => skipSagaLevel());
  });

  document.getElementById("sagaSkipBtn")?.addEventListener("click", () => {
    showInterstitialAd(() => skipSagaLevel());
  });

  document.getElementById("dailyChallengeBtn")?.addEventListener("click", startDailyChallenge);

  updateDailyUI();
  updateXPBar();
  updateMenuHints();
  updateCoinDisplay();

  // ── AI WEB WORKER ─────────────────────────────────────────────────────────
  try {
    aiWorker = new Worker('./js/ai.worker.js', { type: 'module' });
    aiWorker.onmessage = ({ data }) => {
      const { move, id } = data;
      // Ignore stale responses (e.g. player went back to menu mid-computation)
      if (id !== aiMoveId) return;
      if (move && playing && playerTypes[current]?.type === 'ai') {
        makeMove(move.x, move.y);
      }
    };
    aiWorker.onerror = (err) => {
      console.warn('AI worker error, falling back to main thread:', err);
      aiWorker = null; // disable worker, processTurn will fall back
    };
  } catch (e) {
    console.warn('Web Workers not supported, using main thread AI:', e);
    aiWorker = null;
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Stats + achievements
  document.getElementById("statsBtn")?.addEventListener("click", openStatsModal);
  document.getElementById("achievementsBtn")?.addEventListener("click", openAchievementModal);
  document.getElementById("claimCoinsBtn")?.addEventListener("click", () => {
    const earned = claimDailyCoins();
    if (earned > 0) updateCoinDisplay();
  });
  document.getElementById("closeStatsBtn")?.addEventListener("click", () => {
    document.getElementById("statsModal").style.display = "none";
  });
  document.getElementById("statsToAchievementsBtn")?.addEventListener("click", () => {
    document.getElementById("statsModal").style.display = "none";
    openAchievementModal();
  });
  document.getElementById("closeAchievementBtn")?.addEventListener("click", () => {
    document.getElementById("achievementModal").style.display = "none";
  });

  // Also open achievements from menu footer via a shortcut on the stats modal
  // Orb skin: load saved + render selector
  const savedSkin = getSavedSkin();
  if (savedSkin && savedSkin !== "default") document.body.classList.add(savedSkin);
  renderSkinSelector();
  renderBlastSkinSelector();

  window.addEventListener("resize", () => {
    if (document.getElementById("gameView")?.classList.contains("active")) {
      setCellSize(cols, rows);
    }
  });

  document.getElementById("sagaPlayerCountSelect")?.addEventListener("change", e => {
    const wrapper = document.getElementById("sagaAiDifficultyWrapper");
    if (wrapper) wrapper.style.display = e.target.value === "ai" ? "" : "none";
  });

  document.querySelectorAll("#orbSizePills .size-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#orbSizePills .size-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.documentElement.style.setProperty('--orb-scale', btn.dataset.mult);
    });
  });

  const themeSelect = $("#themeSelect");
  const sidebarThemeSelect = document.getElementById("sidebarThemeSelect");
  const savedTheme = getSavedTheme();

  if (savedTheme) {
    applyTheme(savedTheme);
    if (themeSelect) themeSelect.value = savedTheme;
    if (sidebarThemeSelect) sidebarThemeSelect.value = savedTheme;
  }

  themeSelect?.addEventListener("change", e => {
    applyTheme(e.target.value);
    saveTheme(e.target.value);
    if (sidebarThemeSelect) sidebarThemeSelect.value = e.target.value;
  });

  sidebarThemeSelect?.addEventListener("change", e => {
    applyTheme(e.target.value);
    saveTheme(e.target.value);
    if (themeSelect) themeSelect.value = e.target.value;
    openSidebar(); // refresh sidebar controls to match new theme
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

  // Sync sidebar theme dropdown with current theme
  const current = ["theme-matrix","theme-cyberpunk","theme-magma","theme-electric","theme-ice","theme-void","theme-minimal","theme-flatline","theme-steampunk"]
    .find(c => document.body.classList.contains(c)) || "default";
  const sidebarThemeSelect = document.getElementById("sidebarThemeSelect");
  if (sidebarThemeSelect) sidebarThemeSelect.value = current;
}

function applyTheme(t) {
  document.body.classList.remove(
    "theme-cyberpunk", "theme-magma", "theme-matrix",
    "theme-electric", "theme-ice", "theme-void", "theme-minimal",
    "theme-flatline", "theme-steampunk",
    "scanlines-active", "lava-active"
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
  } else if (["theme-electric","theme-ice","theme-void","theme-minimal","theme-flatline","theme-steampunk"].includes(t)) {
    document.body.classList.add(t);
  }
}

function startGame() {
  gameCount++;
  localStorage.setItem("gameCount", gameCount.toString());

  document.getElementById("mainMenu").style.display = "none";
  document.getElementById("gameView")?.classList.add("active");

  if (mode === "saga") {
    showLevelSelect();
    return;
  }

  if (!playerTypes || playerTypes.length === 0) {
    const count = parseInt(playerCountSelect.value, 10) || 2;
    setupPlayers(count);
  }

  if (gameCount % 4 === 0) {
    showInterstitialAd(() => resetGame());
    return;
  }
  resetGame();
}

function backToMenu() {
  playing = false;
  isDailyMode = false;
  clearTimeout(aiTimeout);
  stopTimer();
  closeModal();
  updateDailyUI();
  updateXPBar();
  updateMenuHints();
  updateCoinDisplay();
  document.getElementById("gameView")?.classList.remove("active");
  document.getElementById("mainMenu").style.display = "flex";
  boardEl.innerHTML = "";
}

function setupPlayers(count) {
  buildPlayerSettings(count, players, playerTypes, () => {}, () => {}, current);
}

// ── DAILY CHALLENGE ─────────────────────────────────────────────────────────
function getDailyLevelIndex() {
  const d = new Date();
  const seed = d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate();
  const mixed = ((seed * 1664525 + 1013904223) & 0x7FFFFFFF);
  return mixed % SAGA_LEVELS.length;
}

function updateDailyUI() {
  const streak = getDailyStreak();
  const completed = isDailyCompleted();
  const streakEl = document.getElementById("streakDisplay");
  const btn = document.getElementById("dailyChallengeBtn");
  if (streakEl) streakEl.textContent = streak > 0 ? `🔥 ${streak} day streak!` : "";
  if (btn) {
    btn.disabled = completed;
    btn.textContent = completed ? "✓ Done — Come back tomorrow!" : "⚡ Daily Challenge";
  }
}

function startDailyChallenge() {
  if (isDailyCompleted()) return;
  isDailyMode = true;
  mode = "saga";
  sagaCurrentLevel = getDailyLevelIndex();
  sagaConsecutiveFails = 0;
  document.getElementById("mainMenu").style.display = "none";
  document.getElementById("gameView").classList.add("active");
  resetGame();
}

// ── COMBO FLASH ──────────────────────────────────────────────────────────────
function showComboFlash(count) {
  const el = document.getElementById("comboFlash");
  if (!el) return;
  el.classList.remove("active");
  void el.offsetWidth; // force reflow to restart animation
  el.textContent = `COMBO ×${count}!`;
  el.classList.add("active");

  // Only award achievements/XP when the human player (index 0) triggers the combo
  if (current !== 0) return;

  if (count >= 20) {
    unlockAchievement("combo_20", "Annihilator", "Triggered a 20+ wave chain reaction");
    grantXP(100);
  } else if (count >= 15) {
    unlockAchievement("combo_15", "Supernova", "Triggered a 15+ wave chain reaction");
    grantXP(75);
  } else if (count >= 10) {
    unlockAchievement("combo_10", "Nuclear!", "Triggered a 10+ wave chain reaction");
    grantXP(50);
  } else if (count >= 5) {
    unlockAchievement("combo_5", "Chain Reaction!", "Triggered a 5+ wave combo");
    grantXP(20);
  } else if (count >= 3) {
    unlockAchievement("combo_3", "First Chain", "Triggered your first 3+ wave chain");
    grantXP(10);
  }
}

// ── BLAST MILESTONE ANNOUNCER ─────────────────────────────────────────────────
function showBlastMilestone(n) {
  const tiers = [
    { min: 40, tier: 6, label: "DOMINATION BLAST" },
    { min: 30, tier: 5, label: "MEGA CORE BLAST" },
    { min: 25, tier: 4, label: "NOVA BLAST" },
    { min: 20, tier: 3, label: "QUANTUM BURST" },
    { min: 15, tier: 2, label: "OVERLOAD" },
    { min: 10, tier: 1, label: "CHAIN REACTOR" },
  ];
  const match = tiers.find(t => n >= t.min);
  if (!match) return;
  const el = document.getElementById("blastMilestone");
  if (!el) return;
  el.classList.remove("active", "tier-1", "tier-2", "tier-3", "tier-4", "tier-5", "tier-6");
  void el.offsetWidth; // force reflow to restart animation
  el.textContent = match.label;
  el.classList.add("active", `tier-${match.tier}`);
}

// ── XP & RANK ────────────────────────────────────────────────────────────────
function grantXP(amount) {
  const result = addXP(amount);
  updateXPBar();
  if (result.leveledUp) {
    showRankUpToast(result.rankName);
    renderSkinSelector(); // refresh locked/unlocked state
    const rankAch = {
      'Soldier': ['rank_soldier', 'Promoted',       'Reached Soldier rank'],
      'Veteran': ['rank_veteran', 'Battle-Hardened','Reached Veteran rank'],
      'Pro':     ['rank_pro',     'Going Pro',       'Reached Pro rank'],
      'Elite':   ['rank_elite',   'Elite Status',    'Reached Elite rank'],
      'Master':  ['rank_master',  'Master Class',    'Reached Master rank'],
      'Legend':  ['rank_legend',  'Legendary!',      'Reached Legend rank'],
    };
    const a = rankAch[result.rankName];
    if (a) unlockAchievement(a[0], a[1], a[2]);
  }
  // XP milestone achievements
  const xp = result.xp;
  if (xp >= 5000) unlockAchievement('xp_5000', 'XP Legend',     'Earned 5000 total XP');
  if (xp >= 2000) unlockAchievement('xp_2000', 'XP Tycoon',     'Earned 2000 total XP');
  if (xp >= 1000) unlockAchievement('xp_1000', 'XP Enthusiast', 'Earned 1000 total XP');
  if (xp >= 500)  unlockAchievement('xp_500',  'XP Grinder',    'Earned 500 total XP');
}

function showRankUpToast(rankName) {
  const container = document.getElementById("achievement-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "achievement-toast rank-up-toast";
  toast.innerHTML = `
    <div class="icon">⬆️</div>
    <div class="text">
      <div class="title">Rank Up!</div>
      <div class="desc">You are now: ${rankName}</div>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

function updateXPBar() {
  const info = getXPInfo();
  const rankEl = document.getElementById("xpRankName");
  const amtEl  = document.getElementById("xpAmount");
  const fillEl = document.getElementById("xpBarFill");
  if (!rankEl) return;
  rankEl.textContent = info.rankName;
  if (info.isMax) {
    if (amtEl)  amtEl.textContent  = `${info.xp} XP • MAX`;
    if (fillEl) fillEl.style.width = "100%";
  } else {
    if (amtEl)  amtEl.textContent  = `${info.xpInRank} / ${info.xpToNext} XP`;
    if (fillEl) fillEl.style.width = `${Math.min(100, (info.xpInRank / info.xpToNext) * 100)}%`;
  }
}

function updateCoinDisplay() {
  const el = document.getElementById("coinDisplay");
  if (el) el.textContent = `🪙 ${getCoins()}`;

  const claimBtn = document.getElementById("claimCoinsBtn");
  if (!claimBtn) return;
  if (canClaimDailyCoins()) {
    claimBtn.textContent = "🎁 Claim Daily +25 🪙";
    claimBtn.disabled = false;
    claimBtn.classList.remove("claimed");
  } else {
    claimBtn.textContent = "✓ Claimed Today";
    claimBtn.disabled = true;
    claimBtn.classList.add("claimed");
  }
}

// ── ACHIEVEMENT COUNTERS ──────────────────────────────────────────────────────
function getCounters() {
  return JSON.parse(localStorage.getItem('neon_ach_counters') || '{}');
}
function incCounter(key) {
  const c = getCounters();
  c[key] = (c[key] || 0) + 1;
  localStorage.setItem('neon_ach_counters', JSON.stringify(c));
  return c[key];
}
function setCounter(key, value) {
  const c = getCounters();
  c[key] = value;
  localStorage.setItem('neon_ach_counters', JSON.stringify(c));
}
function getDailyCompletionCount() {
  const data = JSON.parse(localStorage.getItem('neon_daily') || '{}');
  return Object.keys(data).filter(k => !k.startsWith('_')).length;
}

// Wrapper: unlock achievement AND award coins
function unlockAchievement(id, title, desc) {
  const wasNew = tryUnlockAchievement(id, title, desc);
  if (wasNew) {
    const ach = ALL_ACHIEVEMENTS.find(a => a.id === id);
    if (ach && ach.coins) {
      addCoins(ach.coins);
      updateCoinDisplay();
    }
  }
  return wasNew;
}

// ── NEXT ACHIEVEMENT HINT ─────────────────────────────────────────────────────
function getNextClosestAchievement() {
  const unlockedIds = loadData().achievements;
  const locked = ALL_ACHIEVEMENTS.filter(a => !unlockedIds.includes(a.id));
  if (locked.length === 0) return null;

  const stats  = loadData().stats;
  const totalWins  = Object.values(stats.wins).reduce((a, b) => a + b, 0);
  const totalGames = stats.matches;
  const xp         = getXPInfo().xp;
  const streak     = getDailyStreak();
  const counters   = getCounters();
  const sagaProgress = parseInt(localStorage.getItem("sagaProgress") || "0", 10);

  const map = {
    'win_5':        [totalWins, 5],   'win_10':  [totalWins, 10],
    'win_25':       [totalWins, 25],  'win_50':  [totalWins, 50],
    'win_100':      [totalWins, 100],
    'speed_win_3':  [counters.speedWins || 0, 3],
    'speed_win_10': [counters.speedWins || 0, 10],
    'saga_5':       [sagaProgress, 5],  'saga_10': [sagaProgress, 10],
    'saga_15':      [sagaProgress, 15], 'saga_20': [sagaProgress, 20],
    'saga_all':     [sagaProgress, 25],
    'streak_3':     [streak, 3],  'streak_7':  [streak, 7],
    'streak_14':    [streak, 14], 'streak_30': [streak, 30],
    'xp_500':       [xp, 500],  'xp_1000': [xp, 1000],
    'xp_2000':      [xp, 2000], 'xp_5000': [xp, 5000],
    'games_10':     [totalGames, 10],
    'games_50':     [totalGames, 50],
    'games_100':    [totalGames, 100],
    'hard_wins_5':  [counters.hardWins || 0, 5],
    'hard_wins_10': [counters.hardWins || 0, 10],
  };

  let best = null, bestPct = -1;
  for (const a of locked) {
    const p = map[a.id];
    if (p) {
      const pct = Math.min(p[0] / p[1], 0.9999);
      if (pct > bestPct) { bestPct = pct; best = { ...a, current: p[0], target: p[1] }; }
    }
  }
  return best || { ...locked[0], current: 0, target: 1 };
}

function updateMenuHints() {
  // Win streak display
  const ws = getCounters().winStreak || 0;
  const wsEl = document.getElementById('winStreakMenu');
  if (wsEl) {
    wsEl.style.display = ws >= 2 ? 'block' : 'none';
    if (ws >= 2) wsEl.textContent = `🔥 ${ws} Win Streak!`;
  }

  // Next closest achievement
  const next = getNextClosestAchievement();
  const hintEl = document.getElementById('nextAchHint');
  if (!hintEl) return;
  if (!next) { hintEl.innerHTML = ''; return; }

  const hasProgress = next.target > 1;
  const pct = hasProgress ? Math.round((next.current / next.target) * 100) : 0;
  const progressText = hasProgress ? `${next.current} / ${next.target}` : '';

  hintEl.innerHTML = `
    <div class="nah-label">Next Achievement</div>
    <div class="nah-row">
      <span class="nah-icon">${next.icon}</span>
      <span class="nah-title">${next.title}</span>
      ${progressText ? `<span class="nah-progress">${progressText}</span>` : ''}
    </div>
    ${hasProgress ? `<div class="nah-bar"><div class="nah-bar-fill" style="width:${pct}%"></div></div>` : ''}
  `;
}

// ── ACHIEVEMENTS DATA ─────────────────────────────────────────────────────
const ALL_ACHIEVEMENTS = [
  // ── VICTORIES ────────────────────────────────────────────────────────────
  { id: "first_win",    icon: "🏆", title: "First Victory!",       desc: "Win your very first game",                     coins: 10  },
  { id: "win_5",        icon: "🥊", title: "5 Wins",               desc: "Win 5 games against AI",                       coins: 25  },
  { id: "win_10",       icon: "🔥", title: "10 Wins",              desc: "Win 10 games against AI",                      coins: 50  },
  { id: "win_25",       icon: "💪", title: "Unstoppable",          desc: "Win 25 games against AI",                      coins: 100 },
  { id: "win_50",       icon: "🛡️", title: "Half Century",        desc: "Win 50 games against AI",                      coins: 200 },
  { id: "win_100",      icon: "👑", title: "Centurion",            desc: "Win 100 games against AI",                     coins: 200 },
  // ── TIME ATTACK ────────────────────────────────────────────────────────
  { id: "speed_win",    icon: "⚡", title: "Speed Demon!",         desc: "Win a Time Attack match",                      coins: 25  },
  { id: "speed_win_3",  icon: "🚀", title: "Speed Freak",          desc: "Win 3 Time Attack matches",                    coins: 50  },
  { id: "speed_win_10", icon: "🏎️", title: "Time Master",         desc: "Win 10 Time Attack matches",                   coins: 100 },
  // ── SAGA PROGRESS ──────────────────────────────────────────────────────
  { id: "saga_start",   icon: "⚔️", title: "Chain Beginner",       desc: "Complete your first saga level",               coins: 10  },
  { id: "saga_5",       icon: "🌟", title: "Rising Star",          desc: "Complete saga level 5",                        coins: 25  },
  { id: "saga_10",      icon: "🎯", title: "Halfway There",        desc: "Complete saga level 10",                       coins: 50  },
  { id: "saga_15",      icon: "💎", title: "Chain Master",         desc: "Complete saga level 15",                       coins: 100 },
  { id: "saga_20",      icon: "🌊", title: "Almost There",         desc: "Complete saga level 20",                       coins: 200 },
  { id: "saga_all",     icon: "👑", title: "The Legend",           desc: "Complete all 25 saga levels!",                 coins: 200 },
  // ── SAGA SKILL ─────────────────────────────────────────────────────────
  { id: "three_stars",     icon: "⭐", title: "Perfectionist",     desc: "Earn 3 stars on a saga level",                 coins: 10  },
  { id: "no_hints",        icon: "🧠", title: "Pure Skill",        desc: "Beat a saga level without using hints",        coins: 10  },
  { id: "three_stars_5",   icon: "🌠", title: "Star Chaser",       desc: "Earn 3 stars on 5 saga levels",                coins: 50  },
  { id: "saga_all_stars",  icon: "💫", title: "Grand Perfectionist", desc: "Earn 3 stars on ALL saga levels",            coins: 200 },
  // ── COMBO CHAINS ───────────────────────────────────────────────────────
  { id: "combo_3",   icon: "🔗", title: "First Chain",            desc: "Trigger a 3+ wave chain reaction",              coins: 10  },
  { id: "combo_5",   icon: "💥", title: "Chain Reaction!",        desc: "Trigger a 5+ wave combo",                      coins: 25  },
  { id: "combo_10",  icon: "☢️", title: "Nuclear!",               desc: "Trigger a 10+ wave chain reaction",            coins: 50  },
  { id: "combo_15",  icon: "🌋", title: "Supernova",              desc: "Trigger a 15+ wave chain reaction",            coins: 100 },
  { id: "combo_20",  icon: "🔱", title: "Annihilator",            desc: "Trigger a 20+ wave chain reaction",            coins: 200 },
  // ── DAILY CHALLENGES ──────────────────────────────────────────────────
  { id: "first_daily",  icon: "📅", title: "Daily Challenger",    desc: "Complete your first daily challenge",           coins: 10  },
  { id: "daily_5",      icon: "📊", title: "Daily Regular",       desc: "Complete 5 daily challenges",                   coins: 50  },
  { id: "streak_3",     icon: "🔥", title: "On a Roll!",          desc: "3-day daily challenge streak",                  coins: 25  },
  { id: "streak_7",     icon: "💫", title: "Dedicated",           desc: "7-day daily challenge streak",                  coins: 50  },
  { id: "streak_14",    icon: "📆", title: "Fortnight",           desc: "Maintain a 14-day daily challenge streak",      coins: 100 },
  { id: "streak_30",    icon: "🗓️", title: "Monthly Master",     desc: "Maintain a 30-day daily challenge streak",      coins: 200 },
  // ── RANK MILESTONES ────────────────────────────────────────────────────
  { id: "rank_soldier", icon: "🎖️", title: "Promoted",           desc: "Reach Soldier rank",                            coins: 25  },
  { id: "rank_veteran", icon: "🎗️", title: "Battle-Hardened",    desc: "Reach Veteran rank",                            coins: 50  },
  { id: "rank_pro",     icon: "🏅", title: "Going Pro",           desc: "Reach Pro rank",                                coins: 50  },
  { id: "rank_elite",   icon: "🥇", title: "Elite Status",        desc: "Reach Elite rank",                              coins: 100 },
  { id: "rank_master",  icon: "🔰", title: "Master Class",        desc: "Reach Master rank",                             coins: 200 },
  { id: "rank_legend",  icon: "🌌", title: "Legendary!",          desc: "Reach Legend rank",                             coins: 200 },
  // ── XP MILESTONES ────────────────────────────────────────────────────────
  { id: "xp_500",   icon: "📈", title: "XP Grinder",             desc: "Earn 500 total XP",                             coins: 25  },
  { id: "xp_1000",  icon: "💸", title: "XP Enthusiast",          desc: "Earn 1000 total XP",                            coins: 50  },
  { id: "xp_2000",  icon: "💰", title: "XP Tycoon",              desc: "Earn 2000 total XP",                            coins: 100 },
  { id: "xp_5000",  icon: "💎", title: "XP Legend",              desc: "Earn 5000 total XP",                            coins: 200 },
  // ── GAMES PLAYED ─────────────────────────────────────────────────────────
  { id: "games_10",   icon: "🕹️", title: "Getting Started",      desc: "Play 10 games",                                 coins: 10  },
  { id: "games_50",   icon: "🎮", title: "Regular Player",        desc: "Play 50 games",                                 coins: 25  },
  { id: "games_100",  icon: "🏟️", title: "Marathon Gamer",       desc: "Play 100 games",                                coins: 50  },
  // ── AI DIFFICULTY ──────────────────────────────────────────────────────
  { id: "beat_easy",    icon: "🤖", title: "Bot Slayer",          desc: "Beat Easy AI",                                  coins: 10  },
  { id: "beat_normal",  icon: "🎲", title: "Normal Crusher",      desc: "Beat Normal AI",                                coins: 10  },
  { id: "beat_hard",    icon: "💀", title: "Master Slayer",       desc: "Beat Hard (Master 💀) AI",                      coins: 50  },
  { id: "hard_wins_5",  icon: "🔥", title: "Hard Crusher",        desc: "Beat Hard AI 5 times",                          coins: 100 },
  { id: "hard_wins_10", icon: "💣", title: "Hard Destroyer",      desc: "Beat Hard AI 10 times",                         coins: 200 },
  // ── BOARD SPECIAL ──────────────────────────────────────────────────────
  { id: "big_board",   icon: "🗺️", title: "Big Brain",           desc: "Win a game on a 9×9 grid",                     coins: 100 },
  { id: "max_players", icon: "🎭", title: "Battle Royale",        desc: "Play with 6 players",                           coins: 100 },
];

// ── STATS MODAL ───────────────────────────────────────────────────────────────
function openStatsModal() {
  const data = loadData();
  const xpInfo = getXPInfo();
  const streak = getDailyStreak();
  const totalWins = Object.values(data.stats.wins).reduce((a, b) => a + b, 0);
  const starsData = JSON.parse(localStorage.getItem('neon_stars') || '{}');
  const totalStars = Object.values(starsData).reduce((a, b) => a + b, 0);
  const perfLevels = Object.values(starsData).filter(s => s === 3).length;
  const achCount = data.achievements.length;

  document.getElementById("statsBody").innerHTML = `
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-value">${xpInfo.rankName}</div>
        <div class="stat-label">Rank</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${xpInfo.xp}</div>
        <div class="stat-label">Total XP</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${data.stats.matches}</div>
        <div class="stat-label">Games Played</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${totalWins}</div>
        <div class="stat-label">AI Wins</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${streak > 0 ? `🔥 ${streak}` : "—"}</div>
        <div class="stat-label">Daily Streak</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${totalStars} ⭐</div>
        <div class="stat-label">Stars Earned</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${perfLevels}</div>
        <div class="stat-label">Perfect (3★)</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${achCount} / ${ALL_ACHIEVEMENTS.length}</div>
        <div class="stat-label">Achievements</div>
      </div>
    </div>
  `;
  document.getElementById("statsModal").style.display = "flex";
}

// ── ACHIEVEMENT GALLERY ───────────────────────────────────────────────────────
function getAchProgress(id) {
  const stats   = loadData().stats;
  const counters = getCounters();
  const xp      = getXPInfo().xp;
  const totalWins = Object.values(stats.wins).reduce((a, b) => a + b, 0);
  const dailyCount = getDailyCompletionCount();
  const streak  = getDailyStreak();
  const map = {
    first_win:    [totalWins, 1],
    win_5:        [totalWins, 5],
    win_10:       [totalWins, 10],
    win_25:       [totalWins, 25],
    win_50:       [totalWins, 50],
    win_100:      [totalWins, 100],
    speed_win:    [counters.speedWins || 0, 1],
    speed_win_3:  [counters.speedWins || 0, 3],
    speed_win_10: [counters.speedWins || 0, 10],
    combo_3:      [counters.maxCombo || 0, 3],
    combo_5:      [counters.maxCombo || 0, 5],
    combo_10:     [counters.maxCombo || 0, 10],
    combo_15:     [counters.maxCombo || 0, 15],
    combo_20:     [counters.maxCombo || 0, 20],
    first_daily:  [dailyCount, 1],
    daily_5:      [dailyCount, 5],
    streak_3:     [streak, 3],
    streak_7:     [streak, 7],
    streak_14:    [streak, 14],
    streak_30:    [streak, 30],
    xp_500:       [xp, 500],
    xp_1000:      [xp, 1000],
    xp_2000:      [xp, 2000],
    xp_5000:      [xp, 5000],
    games_10:     [stats.matches, 10],
    games_50:     [stats.matches, 50],
    games_100:    [stats.matches, 100],
    beat_easy:    [stats.wins.easy || 0, 1],
    beat_normal:  [stats.wins.greedy || 0, 1],
    beat_hard:    [stats.wins.hard || 0, 1],
    hard_wins_5:  [stats.wins.hard || 0, 5],
    hard_wins_10: [stats.wins.hard || 0, 10],
  };
  return map[id] || null;
}

function openAchievementModal() {
  const unlocked = loadData().achievements;
  const count = unlocked.length;
  const total = ALL_ACHIEVEMENTS.length;

  const titleEl = document.querySelector("#achievementModal .modal-title");
  if (titleEl) titleEl.textContent = `🏆 Achievements — ${count} / ${total}`;

  const grid = document.getElementById("achievementGrid");
  grid.innerHTML = "";

  ALL_ACHIEVEMENTS.forEach(a => {
    const isUnlocked = unlocked.includes(a.id);
    const progress = getAchProgress(a.id);
    let progressHTML = '';
    if (progress) {
      const [cur, tgt] = progress;
      const pct = Math.min(100, Math.round((cur / tgt) * 100));
      progressHTML = `
        <div class="ach-progress-wrap">
          <div class="ach-progress-bar"><div class="ach-progress-fill" style="width:${pct}%"></div></div>
          <div class="ach-progress-label">${Math.min(cur, tgt)} / ${tgt}</div>
        </div>`;
    }
    const card = document.createElement("div");
    card.className = `ach-card ${isUnlocked ? "unlocked" : "locked"}`;
    card.innerHTML = `
      <div class="ach-icon">${isUnlocked ? a.icon : "🔒"}</div>
      <div class="ach-title">${isUnlocked ? a.title : "???"}</div>
      <div class="ach-desc">${isUnlocked ? a.desc : "Locked"}</div>
      ${progressHTML}
      <div class="ach-coin-reward">🪙 ${a.coins}</div>
    `;
    grid.appendChild(card);
  });

  // Summary footer
  const footer = document.getElementById("achievementGridFooter");
  if (footer) {
    footer.textContent = `${count} of ${total} achievements unlocked • 🪙 ${getCoins()} coins`;
  }

  document.getElementById("achievementModal").style.display = "flex";
}

// ── ORB SKINS ─────────────────────────────────────────────────────────────────
const SKINS = [
  { id: "default",       label: "Classic",  preview: "🔵", minRank: 0, coinPrice: 0   },
  { id: "skin-fire",     label: "Fire",     preview: "🔴", minRank: 1, coinPrice: 200 },
  { id: "skin-ice",      label: "Ice",      preview: "🩵", minRank: 2, coinPrice: 400 },
  { id: "skin-electric", label: "Electric", preview: "💚", minRank: 3, coinPrice: 600 },
];
const RANK_NAMES = ["Rookie","Soldier","Veteran","Pro","Elite","Master","Legend"];

function applySkin(skinId) {
  document.body.classList.remove("skin-fire", "skin-ice", "skin-electric");
  if (skinId && skinId !== "default") document.body.classList.add(skinId);
  saveSkin(skinId);
  renderSkinSelector(); // refresh active state
}

function renderSkinSelector() {
  const container = document.getElementById("skinSelector");
  if (!container) return;
  const currentSkin = getSavedSkin();
  const rankIdx = getXPInfo().rankIdx;
  const coins = getCoins();
  container.innerHTML = "";
  SKINS.forEach(s => {
    const rankLocked = rankIdx < s.minRank;
    const canAfford = s.coinPrice === 0 || coins >= s.coinPrice;
    const isActive = s.id === currentSkin;
    const btn = document.createElement("button");

    if (isActive) {
      btn.className = "skin-btn active";
      btn.innerHTML = `<span class="skin-preview">${s.preview}</span>${s.label}<br><span style="font-size:0.6rem;color:#00ffcc">Equipped</span>`;
      btn.addEventListener("click", () => applySkin(s.id));
    } else if (!rankLocked) {
      // Unlocked by rank — just equip
      btn.className = "skin-btn";
      btn.innerHTML = `<span class="skin-preview">${s.preview}</span>${s.label}`;
      btn.addEventListener("click", () => { applySkin(s.id); renderSkinSelector(); });
    } else if (canAfford && s.coinPrice > 0) {
      // Rank-locked but can buy with coins
      btn.className = "skin-btn coin-buy";
      btn.innerHTML = `<span class="skin-preview">${s.preview}</span>${s.label}<br><span class="skin-buy-price">🪙 ${s.coinPrice} — Buy</span>`;
      btn.addEventListener("click", () => {
        if (spendCoins(s.coinPrice)) {
          applySkin(s.id);
          updateCoinDisplay();
          renderSkinSelector();
        }
      });
    } else {
      // Locked, can't afford
      btn.className = "skin-btn locked";
      btn.innerHTML = `<span class="skin-preview">${s.preview}</span>${s.label}<br><span style="font-size:0.6rem;color:#888">🪙 ${s.coinPrice} or ${RANK_NAMES[s.minRank]}</span>`;
    }
    container.appendChild(btn);
  });
}

// ── BLAST SKINS ───────────────────────────────────────────────────────────────
const BLAST_SKINS = [
  { id: "default",        label: "Classic",    preview: "✨" },
  { id: "shockwave",      label: "Shockwave",  preview: "💥" },
  { id: "void",           label: "Void",       preview: "🌀" },
  { id: "pulse",          label: "Pulse",      preview: "💓" },
  { id: "ripple",         label: "Ripple",     preview: "〰️" },
  { id: "void-implosion", label: "Implosion",  preview: "🕳️" },
];

function applyBlastSkin(skinId) {
  saveBlastSkin(skinId);
  renderBlastSkinSelector();
}

function renderBlastSkinSelector() {
  const container = document.getElementById("blastSkinSelector");
  if (!container) return;
  const current = getSavedBlastSkin();
  container.innerHTML = "";
  BLAST_SKINS.forEach(s => {
    const btn = document.createElement("button");
    btn.className = `skin-btn${s.id === current ? " active" : ""}`;
    btn.innerHTML = `<span class="skin-preview">${s.preview}</span>${s.label}`;
    btn.addEventListener("click", () => applyBlastSkin(s.id));
    container.appendChild(btn);
  });
}

function spawnBlast(x, y, color) {
  const skin = getSavedBlastSkin();
  if (skin === "shockwave")      spawnShockwave(x, y, color);
  else if (skin === "void")      spawnVoidCollapse(x, y, color);
  else if (skin === "pulse")     spawnPulse(x, y, color);
  else if (skin === "ripple")    spawnRipple(x, y, color);
  else if (skin === "void-implosion") spawnVoidImplosion(x, y, color);
  else                           spawnParticles(x, y, color);
}

// ── RESPONSIVE CELL SIZE ──────────────────────────────────────────────────────
function setCellSize(c, r) {
  const availW = window.innerWidth - 32;
  const availH = window.innerHeight - 190;
  const cellW = Math.max(22, Math.min(52, Math.floor((availW - 4 * c - 12) / c)));
  const cellH = Math.max(22, Math.min(72, Math.floor((availH - 4 * r - 12) / r)));
  // 6×6 stays square; 9×9/12×12 can be taller but capped at 1.25x to prevent pill shapes
  const finalH = c <= 6 ? cellW : Math.min(cellH, Math.floor(cellW * 1.25));
  document.documentElement.style.setProperty('--cell-w', finalH + 'px');
  document.documentElement.style.setProperty('--cell-h', finalH + 'px');
}

// ── SAGA LEVEL INTRO ──────────────────────────────────────────────────────────
function showLevelIntro(level, levelIndex) {
  const overlay = document.getElementById('levelIntroOverlay');
  if (!overlay) return;
  document.getElementById('introLevelNum').textContent = levelIndex + 1;
  document.getElementById('introLevelName').textContent = level.name;
  document.getElementById('introLevelDesc').textContent = level.description;
  document.getElementById('introIcon').textContent = level.isBoss ? '💀' : '⚡';
  if (level.isBoss) overlay.classList.add('boss-intro');
  else overlay.classList.remove('boss-intro');
  overlay.style.display = 'flex';
  document.getElementById('introStartBtn').onclick = () => {
    overlay.style.display = 'none';
  };
}

// ── TUTORIAL ──────────────────────────────────────────────────────────────────
let tutStep = 0;

function showTutorial() {
  if (localStorage.getItem('neon_tutorial_done')) return;
  tutStep = 0;
  const overlay = document.getElementById('tutorialOverlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  updateTutStep();
  document.getElementById('tutNextBtn')?.addEventListener('click', advanceTutorial);
  document.getElementById('tutSkipBtn')?.addEventListener('click', closeTutorial);
}

function updateTutStep() {
  document.querySelectorAll('.tut-step').forEach((el, i) => el.classList.toggle('active', i === tutStep));
  document.querySelectorAll('.tut-dot').forEach((el, i) => el.classList.toggle('active', i === tutStep));
  const nextBtn = document.getElementById('tutNextBtn');
  if (nextBtn) nextBtn.textContent = tutStep === 2 ? "Let's Play! 🚀" : "Next ▶";
}

function advanceTutorial() {
  if (tutStep < 2) { tutStep++; updateTutStep(); } else { closeTutorial(); }
}

function closeTutorial() {
  localStorage.setItem('neon_tutorial_done', '1');
  const overlay = document.getElementById('tutorialOverlay');
  if (overlay) overlay.style.display = 'none';
}

function handleModeChange() {
  mode = modeSelect.value;
  if (timerContainer)
    timerContainer.style.display = mode === "timeAttack" ? "inline-block" : "none";

  const standardControls = document.getElementById("standardControls");
  const sagaMenuInfo = document.getElementById("sagaMenuInfo");
  const sagaControls = document.getElementById("sagaControls");

  if (mode === "saga") {
    if (standardControls) standardControls.style.display = "none";
    if (sagaControls) sagaControls.style.display = "block";
    if (sagaMenuInfo) sagaMenuInfo.style.display = "none";
    // Hide player config for saga (it manages its own players)
    const playerSection = document.querySelector(".menu-section:last-of-type");
    if (playerSection) playerSection.style.display = "none";
  } else {
    if (standardControls) standardControls.style.display = "block";
    if (sagaControls) sagaControls.style.display = "none";
    if (sagaMenuInfo) sagaMenuInfo.style.display = "none";
    // Show & render player config
    const playerSection = document.querySelector(".menu-section:last-of-type");
    if (playerSection) playerSection.style.display = "";
    setupPlayers(parseInt(playerCountSelect?.value, 10) || 2);
  }
}

function resetGame() {
  closeModal();

  // Hide saga objective when not in saga mode
  const sagaObj = document.getElementById("sagaObjective");
  if (sagaObj && mode !== "saga") sagaObj.classList.remove("active");

  // Show/hide in-game skip button
  const sagaSkipBtn = document.getElementById("sagaSkipBtn");
  if (sagaSkipBtn) sagaSkipBtn.style.display = (mode === "saga") ? "block" : "none";

  if (mode === "saga") {
    const level = SAGA_LEVELS[sagaCurrentLevel];
    if (!level) { backToMenu(); return; }
    initSagaLevel(level);
    return;
  }

  const [c, r] = gridSelect.value.split("x").map(Number);
  cols = c;
  rows = r;
  setCellSize(cols, rows);
  current = 0;
  playing = true;

  firstMove = players.map(() => false);
  history = [];
  movesMade = 0;

  board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      owner: -1,
      count: 0,
      isBlocked: false
    }))
  );

  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-w))`;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = document.createElement("button");
      cell.className = "cell";
      cell.addEventListener("click", () => handleMove(x, y));
      boardEl.appendChild(cell);
    }
  }

  lastMove = null;
  hintsRemaining = 1000; // TODO: set to 3 before release
  updateHintCount();
  updateStatus();
  updateScores();
  paintAll();
  showTutorial();
  if (mode === "timeAttack") {
    timeLeft = timeLimit;
    if (timeLeftSpan) timeLeftSpan.textContent = timeLeft;
    startTimer();
  }
  processTurn();
}

function initSagaLevel(level) {
  rows = level.rows;
  cols = level.cols;
  setCellSize(cols, rows);
  current = 0;
  playing = true;
  movesMade = 0;
  history = [];
  lastMove = null;
  hintsRemaining = 1000; // TODO: set to 3 before release
  hintsUsed = 0;

  const aiDiff = document.getElementById("sagaAiDifficultySelect")?.value || "hard";
  const sagaMode = document.getElementById("sagaPlayerCountSelect")?.value || "ai";
  const playerCount = sagaMode === "3" ? 3 : 2;

  if (sagaMode === "2") {
    players = [
      { name: "Player 1", color: "#00ffcc" },
      { name: "Player 2", color: "#ff4757" }
    ];
    playerTypes = [{ type: "human" }, { type: "human" }];
  } else if (sagaMode === "3") {
    players = [
      { name: "Player 1", color: "#00ffcc" },
      { name: "Player 2", color: "#ff4757" },
      { name: "Player 3", color: "#ffd700" }
    ];
    playerTypes = [{ type: "human" }, { type: "human" }, { type: "human" }];
  } else {
    players = [
      { name: "You", color: "#00ffcc" },
      { name: "Enemy", color: "#ff4757" }
    ];
    playerTypes = [{ type: "human" }, { type: "ai", difficulty: aiDiff }];
  }
  scores = Array(playerCount).fill(0);
  firstMove = Array(playerCount).fill(false);

  board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      owner: -1, count: 0, isBlocked: false
    }))
  );

  for (const [bx, by] of level.blockedCells) {
    if (board[by]?.[bx] !== undefined) board[by][bx].isBlocked = true;
  }

  for (const orb of level.presetOrbs) {
    board[orb.y][orb.x].owner = orb.player;
    board[orb.y][orb.x].count = orb.count;
    firstMove[orb.player] = true; // mark as already placed (for elimination check)
  }

  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-w))`;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = document.createElement("button");
      cell.className = "cell";
      cell.addEventListener("click", () => handleMove(x, y));
      boardEl.appendChild(cell);
    }
  }

  updateHintCount();
  updateScores();
  updateStatus();
  paintAll();

  const sagaObj = document.getElementById("sagaObjective");
  if (sagaObj) {
    sagaObj.textContent = `⚡ LEVEL ${sagaCurrentLevel + 1}: ${level.name}`;
    sagaObj.classList.add("active");
  }

  showLevelIntro(level, sagaCurrentLevel);
}

function handleMove(x, y) {
  if (!playerTypes[current]) return;
  if (!playing || playerTypes[current].type === "ai") return;
  if (board[y][x].isBlocked) return;
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
  let waveCount = 0;
  let totalBlast = 0;

  // Cap at 400 iterations — 400 × 8ms worst case = 3.2s max
  while (q.length && loops++ < 400) {
    waveCount++;
    updateScores();

    // Early exit: if only one player has orbs the game is decided — skip the rest of the animation
    if (movesMade >= players.length && players.filter((_, i) => scores[i] > 0).length <= 1) break;

    if (document.body.classList.contains("theme-matrix")) triggerMatrixFlash();
    if (localMagmaSettings.heatActive) triggerHeat();

    const wave = [...new Set(q.map(([x, y]) => `${x},${y}`))]
      .map(s => s.split(",").map(Number));

    totalBlast += wave.length;
    q.length = 0;

    for (const [x, y] of wave) {
      const cap = capacity(x, y, rows, cols);
      const cell = board[y][x];

      if (cell.count < cap) continue;

      try {
        const idx = y * cols + x;
        const cellEl = boardEl.children[idx];
        const r = cellEl.getBoundingClientRect();

        // Throttle VFX for huge waves — MEGA BLAST already covers the visual impact
        if (wave.length <= 10 || waveCount % 3 === 0) {
          spawnBlast(r.left + r.width / 2, r.top + r.height / 2, players[current].color);
        }

        // Subtle pop effect (not the giant scale from before)
        cellEl.style.transform = "scale(1.1)";
        setTimeout(() => { cellEl.style.transform = ""; }, 100);

      } catch (e) {
        if (wave.length <= 10 || waveCount % 3 === 0) spawnBlast(x, y, players[current].color);
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

    // Adaptive delay: small chains get smooth 50ms, huge chains resolve fast
    const waveDelay = loops < 25 ? 50 : loops < 60 ? 20 : 8;
    await sleep(waveDelay);
  }

  if (waveCount >= 3) showComboFlash(waveCount);
  if (totalBlast >= 13) {
    const br = boardEl.getBoundingClientRect();
    spawnMegaBlast(br.left + br.width / 2, br.top + br.height / 2, players[current].color);
  }
  showBlastMilestone(totalBlast);
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
  const color = players[current]?.color || "#00ffcc";
  setBackgroundPulse(color);

  if (mode === "saga") {
    statusText.textContent = current === 0 ? "Your turn" : "Enemy thinking...";
    turnBadge.style.background = color;
    const sagaObj = document.getElementById("sagaObjective");
    if (sagaObj?.classList.contains("active")) {
      const level = SAGA_LEVELS[sagaCurrentLevel];
      sagaObj.textContent = `⚡ LEVEL ${sagaCurrentLevel + 1}: ${level?.name}`;
    }
    return;
  }
  if (players[current]) {
    statusText.textContent = `${players[current].name}'s turn`;
    turnBadge.style.background = color;
  }
}

function checkWin() {
  if (mode === "saga") {
    const aliveIndices = players.map((_, i) => i).filter(i => scores[i] > 0);
    if (movesMade >= players.length && aliveIndices.length === 1) {
      playing = false;
      if (aliveIndices[0] === 0) {
        const saved = parseInt(localStorage.getItem("sagaProgress") || "0", 10);
        if (sagaCurrentLevel + 1 > saved)
          localStorage.setItem("sagaProgress", (sagaCurrentLevel + 1).toString());
        showSagaWin();
      } else {
        showSagaFail();
      }
      return true;
    }
    return false;
  }

  const aliveIndices = players.map((_, i) => i).filter(i => scores[i] > 0);

  if (movesMade >= players.length && aliveIndices.length === 1) {
    playing = false;
    stopTimer();

    // Find AI opponent difficulty
    const aiPlayer = playerTypes && playerTypes.find((pt, i) => i !== 0 && pt && pt.type === 'ai');
    const aiDiff = aiPlayer?.difficulty || null;

    // Record game end and get updated stats
    const stats = recordGameEnd(aliveIndices[0], aiDiff);
    const totalGames = stats.matches;

    // Games played milestones (win or lose)
    if (totalGames >= 100) unlockAchievement("games_100", "Marathon Gamer", "Played 100 games");
    else if (totalGames >= 50) unlockAchievement("games_50", "Regular Player", "Played 50 games");
    else if (totalGames >= 10) unlockAchievement("games_10", "Getting Started", "Played 10 games");

    if (aliveIndices[0] === 0) {
      // Core win achievements
      unlockAchievement("first_win", "First Victory!", "Won your very first game");

      // Win count milestones
      const totalWins = Object.values(stats.wins).reduce((a, b) => a + b, 0);
      if (totalWins >= 100) unlockAchievement("win_100", "Centurion", "Won 100 games against AI");
      else if (totalWins >= 50) unlockAchievement("win_50", "Half Century", "Won 50 games against AI");
      else if (totalWins >= 25) unlockAchievement("win_25", "Unstoppable", "Won 25 games against AI");
      else if (totalWins >= 10) unlockAchievement("win_10", "10 Wins", "Won 10 games against AI");
      else if (totalWins >= 5)  unlockAchievement("win_5", "5 Wins", "Won 5 games against AI");

      // AI difficulty achievements
      if (aiDiff === 'easy')
        unlockAchievement("beat_easy", "Bot Slayer", "Beat Easy AI");
      else if (aiDiff === 'greedy')
        unlockAchievement("beat_normal", "Normal Crusher", "Beat Normal AI");
      else if (aiDiff === 'hard') {
        unlockAchievement("beat_hard", "Master Slayer", "Beat Hard (Master 💀) AI");
        const hardWins = incCounter('hardWins');
        if (hardWins >= 10) unlockAchievement("hard_wins_10", "Hard Destroyer", "Beat Hard AI 10 times");
        else if (hardWins >= 5) unlockAchievement("hard_wins_5", "Hard Crusher", "Beat Hard AI 5 times");
      }

      // Time attack achievements
      if (mode === "timeAttack") {
        unlockAchievement("speed_win", "Speed Demon!", "Won a Time Attack match");
        const speedWins = incCounter('speedWins');
        if (speedWins >= 10) unlockAchievement("speed_win_10", "Time Master", "Won 10 Time Attack matches");
        else if (speedWins >= 3) unlockAchievement("speed_win_3", "Speed Freak", "Won 3 Time Attack matches");
      }

      // Board special achievements
      if (rows >= 9 && cols >= 9)
        unlockAchievement("big_board", "Big Brain", "Won a game on a 9×9 grid");
      if (players.length >= 6)
        unlockAchievement("max_players", "Battle Royale", "Played with 6 players");

      // Win streak tracking
      const currentStreak = incCounter('winStreak');
      const bestStreak = getCounters().bestWinStreak || 0;
      if (currentStreak > bestStreak) setCounter('bestWinStreak', currentStreak);

      grantXP(50);
    } else {
      // Reset win streak on loss
      setCounter('winStreak', 0);
    }

    const winnerName = players[aliveIndices[0]].name;
    showGameOver("Victory!", `${winnerName} has secured the system!`, true, aliveIndices[0] === 0);
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

    // Adaptive difficulty: more hints player used = higher chance AI picks a random (blind) move
    if (mode === "saga") {
      let blindChance = 0;
      if (hintsUsed >= 11) blindChance = 0.85;
      else if (hintsUsed >= 9) blindChance = 0.70;
      else if (hintsUsed >= 6) blindChance = 0.50;
      else if (hintsUsed >= 3) blindChance = 0.25;

      if (blindChance > 0 && Math.random() < blindChance) {
        const validMoves = [];
        for (let y = 0; y < rows; y++)
          for (let x = 0; x < cols; x++)
            if (!board[y][x].isBlocked && (board[y][x].owner === -1 || board[y][x].owner === current))
              validMoves.push({ x, y });
        if (validMoves.length) {
          const blindMove = validMoves[Math.floor(Math.random() * validMoves.length)];
          makeMove(blindMove.x, blindMove.y);
          return;
        }
      }
    }

    if (aiWorker) {
      // Off-thread: worker computes move on a separate CPU core, UI stays smooth
      const id = ++aiMoveId;
      aiWorker.postMessage({ board, current, difficulty: diff, rows, cols, playerCount: players.length, id });
    } else {
      // Fallback: compute on main thread (older browsers)
      const move = makeAIMove(board, current, diff, rows, cols, players.length);
      if (move) makeMove(move.x, move.y);
    }
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
  hintsUsed++;
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
  hintsRemaining += 3;
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
      if (bestIdx === 0) {
        unlockAchievement("first_win", "First Victory!", "Won your very first game");
        unlockAchievement("speed_win", "Speed Demon!", "Won a Time Attack match");
        grantXP(50);
      }
      const winnerName = players[bestIdx]?.name || "Unknown";
      showGameOver("Time's Up!", `${winnerName} wins with the most orbs!`, true, bestIdx === 0);
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
  const nextBtn = document.getElementById("modalNextBtn");
  if (nextBtn) nextBtn.style.display = "none";
  if (modalReplayBtn) modalReplayBtn.textContent = "Play Again";
}

function showAchievementReveal(callback) {
  const unlockedIds = loadData().achievements;
  const unlocked = ALL_ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id));
  const total = ALL_ACHIEVEMENTS.length;

  if (unlocked.length === 0) {
    callback();
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'ach-reveal-overlay';
  overlay.innerHTML = `
    <div class="ach-reveal-container">
      <div class="ach-reveal-title">Your Achievements — ${unlocked.length} / ${total}</div>
      <div class="ach-reveal-list" id="achRevealList"></div>
      <button class="ach-reveal-continue" id="achRevealContinue" style="display:none">Continue</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const list = overlay.querySelector('#achRevealList');
  const continueBtn = overlay.querySelector('#achRevealContinue');

  let index = 0;
  function showNext() {
    if (index >= unlocked.length) {
      continueBtn.style.display = 'block';
      continueBtn.onclick = () => {
        overlay.remove();
        callback();
      };
      return;
    }
    const a = unlocked[index];
    const card = document.createElement('div');
    card.className = 'ach-reveal-card';
    card.innerHTML = `
      <div class="ach-icon">${a.icon}</div>
      <div class="ach-text">
        <div class="ach-title">${a.title}</div>
        <div class="ach-desc">${a.desc}</div>
      </div>
      <div class="ach-badge">✓</div>
    `;
    list.appendChild(card);
    list.scrollTop = list.scrollHeight;
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('show')));
    index++;
    setTimeout(showNext, 450);
  }

  setTimeout(showNext, 400);
}

function showGameOver(t, m, w, playerWon = false) {
  playSound("win");
  startCelebration();
  const hasAI = playerTypes && playerTypes.some(pt => pt && pt.type === "ai");
  if (hasAI && playerWon) {
    showAchievementReveal(() => {
      modalTitle.textContent = t;
      modalBody.innerHTML = m;
      gameModal.style.display = "flex";
    });
  } else {
    modalTitle.textContent = t;
    modalBody.innerHTML = m;
    gameModal.style.display = "flex";
  }
}

function showSagaWin() {
  sagaConsecutiveFails = 0;
  playSound("win");
  startCelebration();

  const level = SAGA_LEVELS[sagaCurrentLevel];

  // Calculate stars based on moves
  const playable = level.rows * level.cols - level.blockedCells.length;
  const stars = movesMade <= Math.floor(playable * 0.3) ? 3
              : movesMade <= Math.floor(playable * 0.5) ? 2 : 1;
  const prevBest = getLevelStars(level.id);
  const newBest = saveLevelStars(level.id, stars);
  const starsRow = "⭐".repeat(stars) + "☆".repeat(3 - stars);
  const improved = newBest > prevBest && prevBest > 0 ? " 🆕 New best!" : "";

  // Achievements
  unlockAchievement("saga_start", "Chain Beginner", "Completed your first saga level");
  if (sagaCurrentLevel >= 4)
    unlockAchievement("saga_5", "Rising Star", "Completed saga level 5");
  if (sagaCurrentLevel >= 9)
    unlockAchievement("saga_10", "Halfway There", "Completed saga level 10");
  if (sagaCurrentLevel >= 14)
    unlockAchievement("saga_15", "Chain Master", "Completed saga level 15");
  if (sagaCurrentLevel >= 19)
    unlockAchievement("saga_20", "Almost There", "Completed saga level 20");
  if (sagaCurrentLevel === SAGA_LEVELS.length - 1)
    unlockAchievement("saga_all", "The Legend", "Completed all 25 saga levels!");
  if (stars === 3) {
    unlockAchievement("three_stars", "Perfectionist", "Earned 3 stars on a saga level");
    const allStarsData = getAllLevelStars();
    const threeStarCount = Object.values(allStarsData).filter(s => s === 3).length;
    if (threeStarCount >= 5)
      unlockAchievement("three_stars_5", "Star Chaser", "Earned 3 stars on 5 saga levels");
    if (threeStarCount >= SAGA_LEVELS.length)
      unlockAchievement("saga_all_stars", "Grand Perfectionist", "Earned 3 stars on ALL saga levels");
  }
  if (hintsUsed === 0)
    unlockAchievement("no_hints", "Pure Skill", "Won a saga level without using any hints");

  // XP: base + star bonus
  grantXP(75 + (stars === 3 ? 50 : stars === 2 ? 25 : 0));

  modalTitle.textContent = `✓ Level ${sagaCurrentLevel + 1} Complete!`;
  modalBody.innerHTML = `
    <strong>${level.name}</strong><br>Enemy eliminated!
    <div style="font-size:1.5rem;margin:8px 0">${starsRow}</div>
    <div style="font-size:0.8rem;color:#aaa">${movesMade} moves${improved}</div>
  `;

  // Daily challenge completion
  if (isDailyMode) {
    const streak = completeDailyChallenge();
    grantXP(100);
    const totalDailies = getDailyCompletionCount();
    unlockAchievement("first_daily", "Daily Challenger", "Completed your first daily challenge");
    if (totalDailies >= 5)
      unlockAchievement("daily_5", "Daily Regular", "Completed 5 daily challenges");
    if (streak >= 3)
      unlockAchievement("streak_3", "On a Roll!", "3-day daily challenge streak");
    if (streak >= 7)
      unlockAchievement("streak_7", "Dedicated", "7-day daily challenge streak");
    if (streak >= 14)
      unlockAchievement("streak_14", "Fortnight", "14-day daily challenge streak");
    if (streak >= 30)
      unlockAchievement("streak_30", "Monthly Master", "30-day daily challenge streak");
    modalBody.innerHTML += `<div style="color:#ffd700;margin-top:8px;font-weight:700">🔥 ${streak} day streak! +100 XP</div>`;
    isDailyMode = false;
    updateDailyUI();
  }

  const nextBtn = document.getElementById("modalNextBtn");
  if (nextBtn)
    nextBtn.style.display = sagaCurrentLevel < SAGA_LEVELS.length - 1 ? "inline-block" : "none";
  if (modalSkipBtn) modalSkipBtn.style.display = "none";
  if (modalReplayBtn) modalReplayBtn.textContent = "Retry";
  gameModal.style.display = "flex";
}

function showSagaFail() {
  sagaConsecutiveFails++;
  modalTitle.textContent = "Defeated!";
  modalBody.innerHTML = `The enemy eliminated all your orbs!<br>Try again?`;
  if (modalReplayBtn) modalReplayBtn.textContent = "Try Again";
  const isLastLevel = sagaCurrentLevel >= SAGA_LEVELS.length - 1;
  if (modalSkipBtn)
    modalSkipBtn.style.display = (sagaConsecutiveFails >= 2 && !isLastLevel) ? "block" : "none";
  gameModal.style.display = "flex";
}

function skipSagaLevel() {
  sagaConsecutiveFails = 0;
  const saved = parseInt(localStorage.getItem("sagaProgress") || "0", 10);
  if (sagaCurrentLevel + 1 > saved)
    localStorage.setItem("sagaProgress", (sagaCurrentLevel + 1).toString());
  sagaCurrentLevel = Math.min(sagaCurrentLevel + 1, SAGA_LEVELS.length - 1);
  resetGame();
}

function showLevelSelect() {
  const modal = document.getElementById("levelSelectModal");
  const grid = document.getElementById("levelSelectGrid");
  if (!modal || !grid) return;

  const saved = parseInt(localStorage.getItem("sagaProgress") || "0", 10);

  const allStars = getAllLevelStars();

  grid.innerHTML = "";
  SAGA_LEVELS.forEach((level, i) => {
    const btn = document.createElement("button");
    btn.className = "level-card";

    const isCompleted = i < saved;
    const isCurrent   = i === saved;
    const isLocked    = false; // TODO: re-enable before release: i > saved

    if (isCompleted)    btn.classList.add("completed");
    else if (isCurrent) btn.classList.add("current");
    else                btn.classList.add("locked");

    btn.disabled = isLocked;
    if (level.isBoss) btn.classList.add("boss");

    const icon = isLocked ? "🔒" : isCompleted ? "✓" : level.isBoss ? "💀" : "▶";
    const s = allStars[level.id] || 0;
    const starsHtml = s > 0
      ? `<span class="level-stars">${"⭐".repeat(s)}${"☆".repeat(3 - s)}</span>`
      : "";
    const bossTag = level.isBoss ? `<span class="boss-tag">💀 BOSS</span>` : "";
    btn.innerHTML = `
      <span class="level-icon">${icon}</span>
      <span class="level-num">LEVEL ${i + 1}</span>
      <span class="level-name">${level.name}</span>
      ${bossTag}
      ${starsHtml}
    `;

    if (!isLocked) btn.addEventListener("click", () => pickSagaLevel(i));
    grid.appendChild(btn);
  });

  modal.style.display = "flex";
}

function pickSagaLevel(index) {
  document.getElementById("levelSelectModal").style.display = "none";
  sagaCurrentLevel = index;
  sagaConsecutiveFails = 0;

  if (gameCount % 4 === 0) {
    showInterstitialAd(() => resetGame());
    return;
  }
  resetGame();
}

function showInterstitialAd(callback) {
  const modal = document.getElementById("interstitialModal");
  const btn = document.getElementById("interstitialPlayBtn");
  const bar = document.getElementById("interstitialBar");
  if (!modal) { callback(); return; }

  modal.style.display = "flex";
  btn.disabled = true;
  bar.style.transition = "none";
  bar.style.width = "0%";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bar.style.transition = "width 5s linear";
      bar.style.width = "100%";
    });
  });

  setTimeout(() => { btn.disabled = false; }, 5000);

  btn.onclick = () => {
    modal.style.display = "none";
    callback();
  };
}

init();