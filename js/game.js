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
         canClaimDailyCoins, claimDailyCoins,
         saveColorblindMode, getColorblindMode,
         saveReplay, getReplays, deleteReplay } from "./storage.js";
import { SAGA_LEVELS } from "./levels.js";
import { haptic, hapticsEnabled, setHaptics, hapticsSupported } from "./haptics.js";
import { track, reportError, timer as trackTimer } from "./analytics.js";
import { shareResult } from "./sharecard.js";
import { GPUBoard } from "./renderer.js";
// 🧪 VIRTUAL PVP · TESTING PHASE 1 — remove this import (and all online* hooks) at release
import { initOnline, onlineActive, onlineMySlot, onlineSendMove, onlineLeave, onlineTurnChanged } from "./online.js";
window.neonTrack = track;
import { isPremium, onEntitlementChange, refreshEntitlement, purchasePremium, restorePurchases,
         getOfferings, isMockBilling, setMockPremium, getOwnedSkins, addOwnedSkin,
         canUseTheme, canUseOrbSkin, canUseBlastSkin, PREMIUM_BENEFITS } from "./premium.js";
import { submitScore, fetchLeaderboard, LEADERBOARD_ENABLED } from "./leaderboard.js";
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
let playerMoves = 0;         // human (player 0) moves this game — used for saga stars
let resolving = false;       // true while a chain reaction is animating (blocks input/undo/timer)
let replayCurrentId = null;  // id of the replay being watched (for Restart)
let turnsSinceHint = 0;      // adaptive: how long since the player last asked for help
let lastNudgeTurn = -99;     // adaptive: avoid nagging every turn
let mercyDebug = false;      // set true in console (window.mercyDebug = true) to log AI skill
let gameCount = parseInt(localStorage.getItem("gameCount") || "0", 10);

// ── REPLAY STATE ──────────────────────────────────────────────────────────────
let replayRecord = null;   // records current game for saving
let isReplaying = false;   // true when watching a replay
let replayMoves = [];      // moves being replayed
let replayIndex = 0;
let replayPaused = false;
let replaySpeedMs = 800;
let replayTimer = null;
// ─────────────────────────────────────────────────────────────────────────────

let cyberSettings = { scanlines: true };
let localMagmaSettings = { lavaActive: true, heatActive: true };

function init() {
  initMatrix();
  initMagma();

  $("#startGameBtn")?.addEventListener("click", startGame);
  document.getElementById("resumeBtn")?.addEventListener("click", resumeMatch);
  document.getElementById("discardResumeBtn")?.addEventListener("click", () => { track("match_discard"); clearSavedMatch(); });
  document.addEventListener("pointerdown", e => { if (e.target.closest(".mode-card, .chip, .bn, .tile, .btn, .modal-btn, .daily-cta, .ss-tab")) haptic("tap"); }, { passive: true });
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

  document.getElementById("lcNext")?.addEventListener("click", () => {
    hideLevelComplete();
    sagaCurrentLevel = Math.min(sagaCurrentLevel + 1, SAGA_LEVELS.length - 1);
    resetGame();
  });
  document.getElementById("lcRetry")?.addEventListener("click", () => { hideLevelComplete(); resetGame(); });
  document.getElementById("lcMenu")?.addEventListener("click", () => { hideLevelComplete(); backToMenu(); });

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
      aiWorker = null; // disable worker, main-thread AI takes over
      if (playing && !resolving && playerTypes[current]?.type === 'ai') processTurn();
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
  if (savedSkin && savedSkin !== "default" && canUseOrbSkin(savedSkin)) document.body.classList.add(savedSkin);
  else if (savedSkin && savedSkin !== "default") saveSkin("default");
  if (!canUseBlastSkin(getSavedBlastSkin())) saveBlastSkin("default");
  renderSkinSelector();
  renderBlastSkinSelector();
  initPremiumUI();

  window.addEventListener("resize", refitBoard);

  document.getElementById("sagaPlayerCountSelect")?.addEventListener("change", e => {
    const wrapper = document.getElementById("sagaAiDifficultyWrapper");
    if (wrapper) wrapper.style.display = e.target.value === "ai" ? "" : "none";
  });

  // ORB SIZE — persisted, applies to both renderers, repaints immediately.
  const ORB_KEY = "neon_orb_scale";
  function applyOrbScale(mult, save) {
    document.documentElement.style.setProperty("--orb-scale", mult);
    if (save) localStorage.setItem(ORB_KEY, mult);
    document.querySelectorAll("#orbSizePills .size-pill").forEach(b =>
      b.classList.toggle("active", b.dataset.mult === String(mult)));
    if (gpu) gpu.refreshAll();          // GPU sprites need a repaint; CSS reflows itself
  }
  applyOrbScale(localStorage.getItem(ORB_KEY) || "1.0", false);
  document.querySelectorAll("#orbSizePills .size-pill").forEach(btn => {
    btn.addEventListener("click", () => applyOrbScale(btn.dataset.mult, true));
  });

  const themeSelect = $("#themeSelect");
  const sidebarThemeSelect = document.getElementById("sidebarThemeSelect");
  const savedTheme = getSavedTheme();

  if (savedTheme) {
    const t = canUseTheme(savedTheme) ? savedTheme : "default";
    applyTheme(t);
    if (themeSelect) themeSelect.value = t;
    if (sidebarThemeSelect) sidebarThemeSelect.value = t;
  }

  themeSelect?.addEventListener("change", e => {
    if (!tryTheme(e.target.value)) { e.target.value = currentThemeId(); return; }
    if (sidebarThemeSelect) sidebarThemeSelect.value = e.target.value;
  });

  sidebarThemeSelect?.addEventListener("change", e => {
    if (!tryTheme(e.target.value)) { e.target.value = currentThemeId(); return; }
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

  initGPU();
  const rKey = "neon_renderer";
  document.querySelectorAll(".chips[data-for=rendererMode] .chip").forEach(ch => {
    ch.classList.toggle("active", (localStorage.getItem(rKey) || "gpu") === ch.dataset.value);
    ch.addEventListener("click", () => {
      if ((localStorage.getItem(rKey) || "gpu") === ch.dataset.value) return;
      localStorage.setItem(rKey, ch.dataset.value);
      track("renderer_switch", { to: ch.dataset.value });
      location.reload();                       // clean swap; an unfinished match resumes from autosave
    });
  });
  if (!GPUBoard.available()) document.getElementById("rendererSection")?.remove();

  handleModeChange();

  // ── LEADERBOARD ────────────────────────────────────────────────────────────
  document.getElementById("leaderboardBtn")?.addEventListener("click", openLeaderboardModal);
  document.getElementById("closeLeaderboardBtn")?.addEventListener("click", () => {
    document.getElementById("leaderboardModal").style.display = "none";
  });
  document.getElementById("lbModeTab")?.addEventListener("change", openLeaderboardModal);
  document.getElementById("lbGridFilter")?.addEventListener("change", openLeaderboardModal);
  document.getElementById("lbRefreshBtn")?.addEventListener("click", openLeaderboardModal);
  // Show/hide leaderboard submit button in win modal based on config
  const lbModalBtn = document.getElementById("modalLeaderboardBtn");
  if (lbModalBtn && !LEADERBOARD_ENABLED) lbModalBtn.style.display = "none";
  // ─────────────────────────────────────────────────────────────────────────

  // ── REPLAY CONTROLS ────────────────────────────────────────────────────────
  document.getElementById("replaysBtn")?.addEventListener("click", openReplaysModal);
  document.getElementById("closeReplaysBtn")?.addEventListener("click", () => {
    document.getElementById("replaysModal").style.display = "none";
  });
  document.getElementById("replayPlayBtn")?.addEventListener("click", () => {
    replayPaused = !replayPaused;
    updateReplayUI();
    if (!replayPaused) replayStep();
  });
  document.getElementById("replayStepBtn")?.addEventListener("click", () => {
    if (!isReplaying || replayIndex >= replayMoves.length) return;
    replayPaused = true;
    clearTimeout(replayTimer);
    const { x, y } = replayMoves[replayIndex++];
    updateReplayUI();
    makeMove(x, y);
  });
  document.getElementById("replayRestartBtn")?.addEventListener("click", () => {
    const replays = getReplays();
    const current_replay = replays.find(r => r.id === replayCurrentId);
    if (current_replay) {
      clearTimeout(replayTimer);
      startReplayPlayback(current_replay);
    }
  });
  document.getElementById("replayExitBtn")?.addEventListener("click", stopReplay);
  document.querySelectorAll(".replay-speed-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".replay-speed-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      replaySpeedMs = parseInt(btn.dataset.ms, 10);
    });
  });
  // ─────────────────────────────────────────────────────────────────────────

  // ── COLORBLIND MODE ────────────────────────────────────────────────────────
  const cbToggle = document.getElementById("colorblindToggle");
  if (getColorblindMode()) {
    document.body.classList.add("colorblind-mode");
    if (cbToggle) cbToggle.textContent = "COLORBLIND: ON";
    if (cbToggle) cbToggle.classList.add("active");
  }
  cbToggle?.addEventListener("click", () => {
    const on = document.body.classList.toggle("colorblind-mode");
    cbToggle.textContent = on ? "COLORBLIND: ON" : "COLORBLIND: OFF";
    cbToggle.classList.toggle("active", on);
    saveColorblindMode(on);
    paintAll(); // re-render orbs with/without patterns
  });
  // ─────────────────────────────────────────────────────────────────────────
}

// ── PREMIUM ───────────────────────────────────────────────────────────────────
function currentThemeId() {
  return ["theme-matrix","theme-cyberpunk","theme-magma","theme-electric","theme-ice","theme-void","theme-minimal","theme-flatline","theme-steampunk","theme-wood","theme-metal"]
    .find(c => document.body.classList.contains(c)) || "default";
}
// Apply a theme if allowed, else show the paywall. Returns true when applied.
function tryTheme(t) {
  if (!canUseTheme(t)) { openPaywall("theme", t); return false; }
  applyTheme(t);
  saveTheme(t);
  return true;
}

function paintPremiumLocks() {
  const prem = isPremium();
  document.querySelectorAll(".theme-sw").forEach(s => s.classList.toggle("locked", !canUseTheme(s.dataset.theme)));
  document.body.classList.toggle("is-premium", prem);
  const badge = document.getElementById("premiumBadge");
  if (badge) { badge.textContent = prem ? "★ PREMIUM" : "★ Go Premium"; badge.classList.toggle("on", prem); }
  const devT = document.getElementById("devPremiumToggle");
  if (devT) { devT.textContent = prem ? "PREMIUM (TEST): ON" : "PREMIUM (TEST): OFF"; devT.classList.toggle("active", prem); }
}

function initPremiumUI() {
  // Dev toggle only where there is no real billing (web / localhost)
  const devWrap = document.getElementById("devPremiumWrap");
  if (devWrap) devWrap.style.display = isMockBilling() ? "" : "none";
  document.getElementById("devPremiumToggle")?.addEventListener("click", () => setMockPremium(!isPremium()));
  // Board style: wireframe (default, theme shows through) or tiles
  const bsKey = "neon_board_style";
  const applyBoardStyle = s => { document.body.classList.toggle("board-wire", s !== "tiles"); localStorage.setItem(bsKey, s); document.querySelectorAll(".chips[data-for=boardStyle] .chip").forEach(ch => ch.classList.toggle("active", ch.dataset.value === s)); gpu?.applyTheme(); refitBoard(); };
  applyBoardStyle(localStorage.getItem(bsKey) || "tiles");   // default: the original tile board; "wire" is the optional lines look
  document.querySelectorAll(".chips[data-for=gfxTier] .chip").forEach(ch => ch.addEventListener("click", () => { localStorage.setItem(GFX_KEY, ch.dataset.value); applyGfx(); perfTourAdvance(); }));
  document.getElementById("sidebarToggle")?.addEventListener("click", () => setTimeout(perfTourOnSettingsOpen, 350));
  document.getElementById("menuSettingsBtn")?.addEventListener("click", () => setTimeout(perfTourOnSettingsOpen, 350));
  document.getElementById("closeSidebar")?.addEventListener("click", perfTourEnd);
  document.getElementById("themeSwatches")?.addEventListener("click", () => setTimeout(perfTourEnd, 400));
  document.getElementById("perfNoteClose")?.addEventListener("click", dismissPerfNote);
  document.getElementById("perfNoteOpen")?.addEventListener("click", () => { dismissPerfNote(); document.getElementById("sidebarToggle")?.click(); });
  applyGfx();
  document.querySelectorAll(".chips[data-for=boardStyle] .chip").forEach(ch => ch.addEventListener("click", () => applyBoardStyle(ch.dataset.value)));
  // Phones: default to the tall 6×9 board (fills a portrait screen, ~45% bigger cells than 9×9)
  if (IS_TOUCH && !localStorage.getItem("neon_grid_touched") && gridSelect) { gridSelect.value = "6x9"; gridSelect.dispatchEvent(new Event("change")); }
  gridSelect?.addEventListener("change", () => localStorage.setItem("neon_grid_touched", "1"));
  const hb = document.getElementById("hapticsToggle");
  if (hb) {
    const paintH = () => { hb.textContent = hapticsEnabled() ? "HAPTICS: ON" : "HAPTICS: OFF"; hb.classList.toggle("active", hapticsEnabled()); };
    if (!hapticsSupported()) hb.closest(".ss-section").style.display = "none";
    hb.addEventListener("click", () => { setHaptics(!hapticsEnabled()); paintH(); });
    paintH();
  }
  document.getElementById("premiumBadge")?.addEventListener("click", () => { if (!isPremium()) openPaywall("menu"); });
  document.getElementById("paywallClose")?.addEventListener("click", closePaywall);
  document.getElementById("paywallBackdrop")?.addEventListener("click", closePaywall);
  document.getElementById("paywallRestore")?.addEventListener("click", async () => {
    const r = await restorePurchases();
    postInfoMsg(r?.ok ? "✓ Premium restored" : "No purchase found", r?.ok ? "#00ffcc" : "#ff8800", 2500);
    if (r?.ok) closePaywall();
  });
  document.getElementById("paywallBuy")?.addEventListener("click", async () => {
    const plan = document.querySelector(".pw-plan.active")?.dataset.plan || "monthly";
    const btn = document.getElementById("paywallBuy");
    btn.disabled = true; btn.textContent = "…";
    const r = await purchasePremium(plan);
    track(r?.ok ? "purchase_success" : "purchase_fail", { plan, reason: _paywallPending?.reason });
    btn.disabled = false; btn.textContent = "Start Premium";
    if (r?.ok) { closePaywall(); postInfoMsg("★ Welcome to Premium!", "#ffd700", 3000); }
  });
  document.querySelectorAll(".pw-plan").forEach(p => p.addEventListener("click", () => {
    document.querySelectorAll(".pw-plan").forEach(x => x.classList.toggle("active", x === p));
  }));
  const list = document.getElementById("paywallBenefits");
  if (list) list.innerHTML = PREMIUM_BENEFITS.map(b => `<li><span>${b.icon}</span>${b.text}</li>`).join("");

  onEntitlementChange(prem => {
    paintPremiumLocks();
    renderSkinSelector();
    renderBlastSkinSelector();
    if (!prem) {                                  // subscription lapsed → back to free defaults
      if (!canUseTheme(currentThemeId())) tryTheme("default");
      if (!canUseOrbSkin(getSavedSkin())) applySkin("default");
      if (!canUseBlastSkin(getSavedBlastSkin())) applyBlastSkin("default");
    }
  });
  paintPremiumLocks();
  refreshEntitlement();                           // async: native shell answers here on Android
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshEntitlement(); });
}

let _paywallPending = null;
async function openPaywall(reason = "menu", itemId = "") {
  _paywallPending = { reason, itemId };
  track("paywall_open", { reason, item: itemId });
  const sheet = document.getElementById("paywallSheet");
  if (!sheet) return;
  const title = document.getElementById("paywallTitle");
  if (title) title.textContent = reason === "theme" ? "Unlock every theme" : reason === "skin" ? "Unlock every skin" : "Go Premium";
  const offers = await getOfferings();
  const wrap = document.getElementById("paywallPlans");
  if (wrap) wrap.innerHTML = offers.map((o, i) => `
    <button type="button" class="pw-plan${i === offers.length - 1 ? " active" : ""}" data-plan="${o.id}">
      <span class="pw-plan-title">${o.title}</span><span class="pw-plan-price">${o.price}</span>${o.badge ? `<span class="pw-badge">${o.badge}</span>` : ""}
    </button>`).join("");
  wrap?.querySelectorAll(".pw-plan").forEach(p => p.addEventListener("click", () => {
    wrap.querySelectorAll(".pw-plan").forEach(x => x.classList.toggle("active", x === p));
  }));
  sheet.classList.add("active");
  document.getElementById("paywallBackdrop")?.classList.add("active");
}
function closePaywall() {
  document.getElementById("paywallSheet")?.classList.remove("active");
  document.getElementById("paywallBackdrop")?.classList.remove("active");
  _paywallPending = null;
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
  const current = ["theme-matrix","theme-cyberpunk","theme-magma","theme-electric","theme-ice","theme-void","theme-minimal","theme-flatline","theme-steampunk","theme-wood","theme-metal"]
    .find(c => document.body.classList.contains(c)) || "default";
  const sidebarThemeSelect = document.getElementById("sidebarThemeSelect");
  if (sidebarThemeSelect) sidebarThemeSelect.value = current;
}

function applyTheme(t) {
  track("theme_apply", { theme: t });
  setTimeout(() => gpu?.applyTheme(), 0);
  document.body.classList.remove(
    "theme-cyberpunk", "theme-magma", "theme-matrix",
    "theme-electric", "theme-ice", "theme-void", "theme-minimal",
    "theme-flatline", "theme-steampunk", "theme-wood", "theme-metal",
    "scanlines-active", "lava-active"
  );

  stopMatrix();
  stopMagma();

  if (t === "theme-matrix") {
    document.body.classList.add("theme-matrix");
    matrixSettings.rainOn = true; drawMatrix();
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
  } else if (["theme-electric","theme-ice","theme-void","theme-minimal","theme-flatline","theme-steampunk","theme-wood","theme-metal"].includes(t)) {
    document.body.classList.add(t);
  }
}

let levelTimer = null;
function startGame() {
  gameCount++;
  track("game_start_click", { mode, grid: gridSelect?.value, players: players.length, ai: playerTypes.some(p => p?.type === "ai") });
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
  onlineLeave();                                 // 🧪 vpvp: no-op unless in a room
  if (mode === "online") mode = "normal";
  if (undoBtn) undoBtn.style.display = "";
  hideLevelComplete();
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
  if (streakEl) {
    streakEl.textContent = streak > 0 ? `🔥 ${streak} day streak!` : "";
    streakEl.style.display = streak > 0 ? "" : "none";
  }
  if (btn) {
    btn.disabled = completed;
    btn.textContent = completed ? "✓ Done — Come back tomorrow!" : "⚡ Daily Challenge";
  }
}

function startDailyChallenge() {
  if (isDailyCompleted()) return;
  track("daily_start", { streak: getDailyStreak() });
  isDailyMode = true;
  mode = "saga";
  if (modeSelect) modeSelect.value = mode;
  document.querySelectorAll(".mode-card").forEach(c => c.classList.toggle("selected", c.dataset.mode === mode));
  sagaCurrentLevel = getDailyLevelIndex();
  sagaConsecutiveFails = 0;
  document.getElementById("mainMenu").style.display = "none";
  document.getElementById("gameView").classList.add("active");
  resetGame();
}

// ── INFO PANEL — unified on-board message box ────────────────────────────────
const _ipQueue = [];
let _ipBusy = false;

function postInfoMsg(text, color, duration = 2500) {
  _ipQueue.push({ text, color, duration });
  if (!_ipBusy) _drainInfoPanel();
}

function _drainInfoPanel() {
  if (!_ipQueue.length) { _ipBusy = false; return; }
  _ipBusy = true;
  const { text, color, duration } = _ipQueue.shift();
  const el = document.getElementById("infoPanelMsg");
  if (!el) { _ipBusy = false; return; }

  el.classList.remove("show");
  el.style.setProperty("--ip-color", color);
  el.textContent = text;

  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("show")));

  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(_drainInfoPanel, 200);
  }, duration);
}

// Achievement events from storage.js
document.addEventListener("chainmarch:achievement", e => {
  const { title, desc } = e.detail;
  postInfoMsg(`🏆 ${title}\n${desc}`, "#ffd700", 3500);
});

// ── CHAIN REACTION COUNTER ────────────────────────────────────────────────────
function showChainBadge(waveCount) {
  if (current !== 0) return;

  const tierColors = ["#00ffcc","#ff8800","#cc44ff","#ff2266","#ffd700","#ffffff"];
  const tierIdx    = waveCount >= 25 ? 5 : waveCount >= 20 ? 4 : waveCount >= 15 ? 3
                   : waveCount >= 10 ? 2 : waveCount >= 5  ? 1 : 0;

  if (waveCount > (getCounters().maxCombo || 0)) setCounter('maxCombo', waveCount);
  if (waveCount >= 20)      { unlockAchievement("combo_20", "Annihilator",    "Triggered a 20+ wave chain reaction"); grantXP(100); }
  else if (waveCount >= 15) { unlockAchievement("combo_15", "Supernova",      "Triggered a 15+ wave chain reaction"); grantXP(75); }
  else if (waveCount >= 10) { unlockAchievement("combo_10", "Nuclear!",       "Triggered a 10+ wave chain reaction"); grantXP(50); }
  else if (waveCount >= 5)  { unlockAchievement("combo_5",  "Chain Reaction!","Triggered a 5+ wave combo");           grantXP(20); }
  else if (waveCount >= 3)  { unlockAchievement("combo_3",  "First Chain",    "Triggered your first 3+ wave chain");  grantXP(10); }

  postInfoMsg(`⚡ ×${waveCount} chain`, tierColors[tierIdx], 2000);
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
  // Routed through #infoPanel like achievement toasts (old container is display:none)
  postInfoMsg(`⬆️ Rank Up! You are now: ${rankName}`, "#00ffcc", 4000);
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
  if (el) el.textContent = `${getCoins()}`;

  const claimBtn = document.getElementById("claimCoinsBtn");
  if (!claimBtn) return;
  if (canClaimDailyCoins()) {
    claimBtn.textContent = "🎁 Claim +25";
    claimBtn.disabled = false;
    claimBtn.classList.remove("claimed");
  } else {
    claimBtn.textContent = "✓ Claimed";
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

// ── MENU CARD SUBTITLES + SMART CTA ──────────────────────────────────────────
function updateMenuCards() {
  const saved = parseInt(localStorage.getItem("sagaProgress") || "0", 10);
  const stars = Object.values(getAllLevelStars()).reduce((a, b) => a + b, 0);
  const sagaSub = document.getElementById("mcSubSaga");
  if (sagaSub) sagaSub.textContent = saved > 0
    ? `Level ${Math.min(saved + 1, SAGA_LEVELS.length)} / ${SAGA_LEVELS.length}${stars ? ` · ⭐ ${stars}` : ""}`
    : `${SAGA_LEVELS.length} levels`;
  const normalSub = document.getElementById("mcSubNormal");
  const wins = Object.values(loadData().stats.wins).reduce((a, b) => a + b, 0);
  if (normalSub) normalSub.textContent = wins > 0 ? `${wins} AI win${wins === 1 ? "" : "s"}` : "vs AI or friends";
  const timeSub = document.getElementById("mcSubTime");
  const sw = getCounters().speedWins || 0;
  if (timeSub) timeSub.textContent = sw > 0 ? `${sw} blitz win${sw === 1 ? "" : "s"}` : "120s blitz";
  const st = document.getElementById("msStreak"); if (st) st.textContent = getDailyStreak();
  const mw = document.getElementById("msWins");   if (mw) mw.textContent = wins;
  const ms = document.getElementById("msStars");  if (ms) ms.textContent = stars;
  const av = document.getElementById("pcAvatar");
  if (av) { const col = document.getElementById("sagaPlayerColor")?.value || players[0]?.color; if (col) { av.style.background = col; av.style.boxShadow = `0 0 12px ${col}`; } }
  const start = document.getElementById("startGameBtn");
  if (start) start.textContent = mode === "saga"
    ? (saved > 0 && saved < SAGA_LEVELS.length ? `▶ CONTINUE · LEVEL ${saved + 1}` : "▶ PLAY SAGA")
    : mode === "timeAttack" ? "▶ START TIME ATTACK" : "▶ START GAME";
}

function updateMenuHints() {
  updateMenuCards();
  updateResumeCard();
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
  { id: "default",       label: "Classic",  preview: "🔵", coinPrice: 0   },
  { id: "skin-fire",     label: "Fire",     preview: "🔴", coinPrice: 200 },
  { id: "skin-ice",      label: "Ice",      preview: "🩵", coinPrice: 400 },
  { id: "skin-electric", label: "Electric", preview: "💚", coinPrice: 600 },
];

function applySkin(skinId) {
  if (!canUseOrbSkin(skinId)) { openPaywall("skin", skinId); return; }
  document.body.classList.remove("skin-fire", "skin-ice", "skin-electric");
  if (skinId && skinId !== "default") document.body.classList.add(skinId);
  saveSkin(skinId);
  renderSkinSelector(); // refresh active state
}

function renderSkinSelector() {
  const container = document.getElementById("skinSelector");
  if (!container) return;
  const currentSkin = getSavedSkin();
  const coins = getCoins();
  const prem = isPremium();
  container.innerHTML = "";
  SKINS.forEach(s => {
    const owned = s.coinPrice === 0 || prem || getOwnedSkins().includes(s.id);
    const canAfford = coins >= s.coinPrice;
    const isActive = s.id === currentSkin;
    const btn = document.createElement("button");
    btn.type = "button";
    if (isActive) {
      btn.className = "skin-btn active";
      btn.innerHTML = `<span class="skin-preview">${s.preview}</span>${s.label}<br><span class="skin-tag on">Equipped</span>`;
    } else if (owned) {
      btn.className = "skin-btn";
      btn.innerHTML = `<span class="skin-preview">${s.preview}</span>${s.label}${prem && s.coinPrice ? '<br><span class="skin-tag">★ Premium</span>' : ""}`;
      btn.addEventListener("click", () => applySkin(s.id));
    } else if (canAfford) {
      btn.className = "skin-btn coin-buy";
      btn.innerHTML = `<span class="skin-preview">${s.preview}</span>${s.label}<br><span class="skin-buy-price">🪙 ${s.coinPrice} · Buy</span>`;
      btn.addEventListener("click", () => {
        if (spendCoins(s.coinPrice)) { addOwnedSkin(s.id); applySkin(s.id); updateCoinDisplay(); }
      });
    } else {
      btn.className = "skin-btn locked";
      btn.innerHTML = `<span class="skin-preview">${s.preview}</span>${s.label}<br><span class="skin-tag">🪙 ${s.coinPrice} or ★</span>`;
      btn.addEventListener("click", () => openPaywall("skin", s.id));
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
  if (!canUseBlastSkin(skinId)) { openPaywall("skin", skinId); return; }
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
    btn.type = "button";
    const locked = !canUseBlastSkin(s.id);
    btn.className = `skin-btn${s.id === current ? " active" : ""}${locked ? " locked" : ""}`;
    btn.innerHTML = `<span class="skin-preview">${s.preview}</span>${s.label}${locked ? '<br><span class="skin-tag">★ Premium</span>' : ""}`;
    btn.addEventListener("click", () => applyBlastSkin(s.id));
    container.appendChild(btn);
  });
}

function spawnBlast(x, y, color) {
  const skin = getSavedBlastSkin();
  // Default sparks render inside the GPU board (no second full-screen canvas).
  // The designed skins still use fx.js — they are distinct effects, not sparks.
  if (gpu && (!skin || skin === "default")) { gpu.burst(x, y, color); return; }
  if (skin === "shockwave")      spawnShockwave(x, y, color);
  else if (skin === "void")      spawnVoidCollapse(x, y, color);
  else if (skin === "pulse")     spawnPulse(x, y, color);
  else if (skin === "ripple")    spawnRipple(x, y, color);
  else if (skin === "void-implosion") spawnVoidImplosion(x, y, color);
  else                           spawnParticles(x, y, color);
}

// ── RESPONSIVE CELL SIZE ──────────────────────────────────────────────────────
// Fits the whole board inside the space left under the header/HUD, on ANY screen
// (phones, tablets, foldables, desktop). Cells stay square and never overflow.
let _fitRaf = 0;
function setCellSize(c, r) {
  const container = boardEl?.parentElement;
  if (!container || !c || !r) return;
  const cs = getComputedStyle(container);
  const bs = getComputedStyle(boardEl);
  const px = v => parseFloat(v) || 0;
  const gap = gpu ? 4 : (px(bs.columnGap || bs.gap) || 4);
  const rect = container.getBoundingClientRect();
  const availW = rect.width  - px(cs.paddingLeft) - px(cs.paddingRight)
               - px(bs.paddingLeft) - px(bs.paddingRight) - px(bs.borderLeftWidth) - px(bs.borderRightWidth);
  const availH = rect.height - px(cs.paddingTop) - px(cs.paddingBottom)
               - px(bs.paddingTop) - px(bs.paddingBottom) - px(bs.borderTopWidth) - px(bs.borderBottomWidth);
  // Leave room for the theme (reference: Critical Mass keeps ~10% margins and big sky above/below)
  const wire = document.body.classList.contains("board-wire");
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  const maxW = shortSide < 720 ? availW * 0.9 : Math.min(availW * 0.9, shortSide * 0.68);
  const maxH = shortSide < 720 ? availH * 0.82 : Math.min(availH * 0.9, shortSide * 0.68);
  let size = Math.floor(Math.min((maxW - gap * (c - 1)) / c, (maxH - gap * (r - 1)) / r));
  if (!isFinite(size) || size <= 0) size = 40;          // not laid out yet — fallback, refit follows
  size = Math.max(18, Math.min(wire ? 96 : 88, size));
  lastCellSize = size;
  document.documentElement.style.setProperty('--cell-w', size + 'px');
  document.documentElement.style.setProperty('--cell-h', size + 'px');
  if (gpu && gpu.rows && gpu.size !== size) gpu.resize(size);
}
function refitBoard() {
  cancelAnimationFrame(_fitRaf);
  _fitRaf = requestAnimationFrame(() => {
    if (document.getElementById("gameView")?.classList.contains("active") && cols && rows) setCellSize(cols, rows);
  });
}
// Re-fit whenever the board's container changes size (rotation, fold/unfold, split-screen, keyboard)
if (typeof ResizeObserver !== "undefined" && boardEl?.parentElement) {
  new ResizeObserver(refitBoard).observe(boardEl.parentElement);
}
window.addEventListener("orientationchange", () => setTimeout(refitBoard, 150));

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
  const nb = document.getElementById('tutNextBtn'); if (nb) nb.onclick = advanceTutorial;
  const sb = document.getElementById('tutSkipBtn'); if (sb) sb.onclick = closeTutorial;
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
  updateMenuCards();
  document.getElementById("sagaPlayerColor")?.addEventListener("input", updateMenuCards, { once: true });
  if (timerContainer)
    timerContainer.style.display = mode === "timeAttack" ? "inline-block" : "none";

  const standardControls = document.getElementById("standardControls");
  const sagaControls = document.getElementById("sagaControls");

  if (mode === "saga") {
    if (standardControls) standardControls.style.display = "none";
    if (sagaControls) sagaControls.style.display = "flex";
    const pct = document.getElementById("playerConfigToggle"); if (pct) pct.style.display = "none";
  } else {
    if (standardControls) standardControls.style.display = "flex";
    if (sagaControls) sagaControls.style.display = "none";
    const pct = document.getElementById("playerConfigToggle"); if (pct) pct.style.display = "";
    setupPlayers(parseInt(playerCountSelect?.value, 10) || 2);
  }
}

function resetGame() {
  closeModal();
  localStorage.removeItem(SAVE_KEY);

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

  const [c, r] = mode === "online" ? [cols, rows] : gridSelect.value.split("x").map(Number);
  cols = c;
  rows = r;
  levelTimer = trackTimer();
  track("match_start", { mode, grid: gridSelect.value, players: players.length, ai_diff: playerTypes.find(p => p?.type === "ai")?.difficulty || null });
  setCellSize(cols, rows);
  current = 0;
  playing = true;

  firstMove = players.map(() => false);
  history = [];
  movesMade = 0;
  playerMoves = 0;

  // Start fresh replay recording
  if (!isReplaying) {
    const gridLabel = `${cols}×${rows}`;
    replayRecord = {
      id: Date.now(),
      date: new Date().toISOString(),
      mode,
      rows, cols, gridLabel,
      players: players.map(p => ({ name: p.name, color: p.color })),
      moves: [],
      winner: -1,
      winnerName: ''
    };
  }

  board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      owner: -1,
      count: 0,
      isBlocked: false
    }))
  );

  buildBoardDOM();

  lastMove = null;
  hintsRemaining = 1000; // TODO: set to 3 before release
  updateHintCount();
  updateStatus();
  updateScores();
  paintAll();
  refitBoard();
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
  levelTimer = trackTimer();
  track("level_start", { level: sagaCurrentLevel + 1, level_id: level.id, boss: !!level.isBoss, daily: isDailyMode, fails: sagaConsecutiveFails });
  setCellSize(cols, rows);
  current = 0;
  playing = true;
  movesMade = 0;
  playerMoves = 0;
  history = [];
  lastMove = null;
  hintsRemaining = 1000; // TODO: set to 3 before release
  hintsUsed = 0;
  turnsSinceHint = 0;
  lastNudgeTurn = -99;

  const aiDiff = document.getElementById("sagaAiDifficultySelect")?.value || "hard";
  const sagaMode = document.getElementById("sagaPlayerCountSelect")?.value || "ai";
  const playerCount = sagaMode === "3" ? 3 : 2;

  const playerColor = document.getElementById("sagaPlayerColor")?.value || "#00ffcc";

  if (sagaMode === "2") {
    players = [
      { name: "Player 1", color: playerColor },
      { name: "Player 2", color: "#ff4757" }
    ];
    playerTypes = [{ type: "human" }, { type: "human" }];
  } else if (sagaMode === "3") {
    players = [
      { name: "Player 1", color: playerColor },
      { name: "Player 2", color: "#ff4757" },
      { name: "Player 3", color: "#ffd700" }
    ];
    playerTypes = [{ type: "human" }, { type: "human" }, { type: "human" }];
  } else {
    players = [
      { name: "You", color: playerColor },
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

  buildBoardDOM();

  updateHintCount();
  updateScores();
  updateStatus();
  paintAll();
  refitBoard();

  const sagaObj = document.getElementById("sagaObjective");
  if (sagaObj) {
    sagaObj.textContent = `⚡ LEVEL ${sagaCurrentLevel + 1}: ${level.name}`;
    sagaObj.classList.add("active");
  }

  showLevelIntro(level, sagaCurrentLevel);
}

function handleMove(x, y) {
  if (isReplaying) return;                       // replays are watch-only
  if (!playerTypes[current]) return;
  if (!playing || resolving || playerTypes[current].type === "ai") return;
  if (board[y][x].isBlocked) return;
  if (board[y][x].owner !== -1 && board[y][x].owner !== current) return;
  if (onlineActive()) {                          // 🧪 vpvp: taps go to the room, moves apply from the channel
    if (current !== onlineMySlot()) return;
    onlineSendMove(x, y);
    return;
  }
  makeMove(x, y);
}

function clearHintSpotlight() {
  clearTimeout(window.__hintTimer);
  gpu?.clearHint();
  if (gpu) { highlightLastMove(); }
  boardEl.classList.remove("hint-dim");
  for (const el of boardEl.querySelectorAll(".hint-active")) { el.classList.remove("hint-active"); el.title = ""; }
}

async function makeMove(x, y) {
  clearHintSpotlight();
  playSound("click");
  lastMove = { x, y };

  history.push(JSON.stringify({
      board: board.map(r => r.map(c => ({...c}))),
      current,
      scores: [...scores],
      movesMade, playerMoves,
      firstMove: [...firstMove],
      lastMove
  }));

  // Record move for replay (skip during replay playback)
  if (replayRecord && !isReplaying) replayRecord.moves.push({ x, y });

  board[y][x].owner = current;
  board[y][x].count += 1;
  movesMade++;
  if (current === 0 && playerTypes[0]?.type !== "ai") playerMoves++;

  paintCell(x, y);
  firstMove[current] = true;

  resolving = true;
  try { await resolveReactions(); } finally { resolving = false; }

  updateScores();

  if (playing && !checkWin()) advanceTurn();
}

// ── RENDERER (GPU sprites via PixiJS, DOM as automatic fallback) ─────────────
let gpu = null;
let lastCellSize = 48;
function gpuWanted() { return localStorage.getItem("neon_renderer") !== "classic"; }
function initGPU() {
  if (gpu || !gpuWanted() || !GPUBoard.available()) return;
  try {
    gpu = new GPUBoard(boardEl.parentElement, (x, y) => {
      if (canPlayCell(x, y)) { haptic("place"); handleMove(x, y); }
      else if (playing && !resolving && playerTypes[current]?.type !== "ai") haptic("error");
    });
    document.body.classList.add("gpu-on");
    window.__gpu = gpu;                    // debug handle (console + automated tests)
    track("renderer", { mode: "gpu" });
  } catch (e) {
    reportError(e, { where: "gpu-init" });
    gpu = null;
    document.body.classList.remove("gpu-on");
  }
}
// One call for every cell repaint — GPU sprite update or DOM drawCell.
function paintCell(x, y, withPulse = false) {
  if (gpu) {
    const d = board[y][x];
    const cap = capacity(x, y, rows, cols);
    gpu.updateCell(x, y, { ...d, critical: d.count > 0 && d.count === cap - 1 }, players[d.owner]?.color);
  } else {
    drawCell(x, y, board, boardEl, cols, players, current, withPulse);
  }
}

// ── GRAPHICS QUALITY (PUBG-style: Auto / Low / Medium / Ultra) ────────────────
// Tier drives: CSS effects (body.gfx-*), particle counts + canvas resolution
// (fx.js reads window.__gfxTier), blast wave pacing, and theme canvas backgrounds.
const GFX_KEY = "neon_gfx";
function gfxSetting() { return localStorage.getItem(GFX_KEY) || "auto"; }
function resolveGfxTier() {
  const s = gfxSetting();
  if (s !== "auto") return s;
  if (!IS_TOUCH) return "high";
  const mem = navigator.deviceMemory || 4;          // GB (Chrome/Android reports it)
  const cores = navigator.hardwareConcurrency || 4;
  if (mem <= 3 || cores <= 4) return "low";
  if (mem <= 6) return "med";
  return "high";
}
function applyGfx() {
  const t = resolveGfxTier();
  window.__gfxTier = t;
  document.body.classList.remove("gfx-low", "gfx-med", "gfx-high");
  document.body.classList.add("gfx-" + t);
  document.querySelectorAll(".chips[data-for=gfxTier] .chip").forEach(ch => ch.classList.toggle("active", ch.dataset.value === gfxSetting()));
  window.dispatchEvent(new Event("gfxchange"));    // fx.js re-sizes its canvas
  applyTheme(currentThemeId());                    // low: theme canvases stop; high: restart
  track("gfx_tier", { setting: gfxSetting(), resolved: t });
}
function gfxWaveDelays() {
  return window.__gfxTier === "low" ? [70, 30, 12] : window.__gfxTier === "high" ? [40, 16, 8] : [50, 20, 8];
}
// ── PERFORMANCE ADVISOR ───────────────────────────────────────────────────────
// If a chain visibly stutters on this device, gently guide the player (once):
// cute note → the ⚙️ gear glows → in Settings, Graphics pulses (step 1), then
// Themes pulses (step 2). Nothing is ever forced off.
const PERF_NOTE_KEY = "neon_perf_note_done";
let tourStep = 0;   // 0 = off, 1 = highlight Graphics, 2 = highlight Themes
function maybePerfAdvisor(badWaves, totalWaves) {
  if (localStorage.getItem(PERF_NOTE_KEY)) return;
  if (badWaves < 3 || totalWaves < 4) return;                    // needs real, repeated stutter
  localStorage.setItem(PERF_NOTE_KEY, "1");
  track("perf_note_shown", { badWaves, totalWaves, tier: window.__gfxTier });
  const note = document.getElementById("perfNote");
  if (note) { note.style.display = "flex"; requestAnimationFrame(() => note.classList.add("show")); }
  document.getElementById("sidebarToggle")?.classList.add("attention");
  document.getElementById("menuSettingsBtn")?.classList.add("attention");
  tourStep = 1;
}
function dismissPerfNote() {
  const note = document.getElementById("perfNote");
  if (note) { note.classList.remove("show"); setTimeout(() => { note.style.display = "none"; }, 300); }
}
function perfTourOnSettingsOpen() {
  if (!tourStep) return;
  dismissPerfNote();
  document.getElementById("sidebarToggle")?.classList.remove("attention");
  document.getElementById("menuSettingsBtn")?.classList.remove("attention");
  document.querySelector('.ss-tab[data-tab="game"]')?.click();
  document.getElementById("gfxSection")?.classList.add("bulge");
  track("perf_tour_step", { step: 1 });
}
function perfTourAdvance() {                                     // called when a Graphics chip is tapped
  if (tourStep !== 1) return;
  tourStep = 2;
  document.getElementById("gfxSection")?.classList.remove("bulge");
  document.querySelector('.ss-tab[data-tab="look"]')?.click();
  document.getElementById("themeSection")?.classList.add("bulge");
  track("perf_tour_step", { step: 2 });
}
function perfTourEnd() {
  if (!tourStep) return;
  tourStep = 0;
  document.getElementById("gfxSection")?.classList.remove("bulge");
  document.getElementById("themeSection")?.classList.remove("bulge");
}

function gfxBurstCap() {
  return window.__gfxTier === "low" ? 2 : window.__gfxTier === "high" ? 10 : 4;
}

// ── AUTOSAVE / RESUME ─────────────────────────────────────────────────────────
// Every completed move snapshots the match so an app kill (phone call, low
// memory, back button) never loses a game. The menu offers "Resume".
const SAVE_KEY = "neon_match_v1";
function saveMatch() {
  if (!playing || isReplaying || !board.length || mode === "online") return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 1, savedAt: Date.now(),
      mode, sagaCurrentLevel, isDailyMode, gridValue: gridSelect?.value,
      rows, cols, players, playerTypes, board, current, movesMade, playerMoves, firstMove, scores,
      timeLeft, hintsUsed, hintsRemaining, lastMove, sagaConsecutiveFails,
    }));
  } catch (e) { reportError(e, { where: "saveMatch" }); }
}
function clearSavedMatch() { localStorage.removeItem(SAVE_KEY); updateResumeCard(); }
function getSavedMatch() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); return s && s.v === 1 && s.board?.length ? s : null; } catch { return null; }
}
function buildBoardDOM() {
  if (gpu) {
    boardEl.style.display = "none";
    boardEl.innerHTML = "";
    gpu.setPlayers(players);
    gpu.build(rows, cols, lastCellSize);
    return;
  }
  boardEl.style.display = "";
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-w))`;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const cell = document.createElement("button");
      cell.className = "cell";
      bindCell(cell, x, y);
      boardEl.appendChild(cell);
    }
}
function updateResumeCard() {
  const card = document.getElementById("resumeCard");
  if (!card) return;
  const s = getSavedMatch();
  if (!s) { card.style.display = "none"; return; }
  const what = s.mode === "saga" ? `Saga · Level ${s.sagaCurrentLevel + 1}` : s.mode === "timeAttack" ? `Time Attack · ${s.timeLeft}s left` : `Quick Match · ${s.cols}×${s.rows}`;
  const ago = Math.max(1, Math.round((Date.now() - s.savedAt) / 60000));
  document.getElementById("resumeTitle").textContent = what;
  document.getElementById("resumeMeta").textContent = `${s.movesMade} moves · ${ago < 60 ? ago + " min" : Math.round(ago / 60) + " h"} ago`;
  card.style.display = "";
}
function resumeMatch() {
  const s = getSavedMatch();
  if (!s) return;
  track("match_resume", { mode: s.mode, moves: s.movesMade });
  closeModal(); hideLevelComplete();
  mode = s.mode;
  if (modeSelect) { modeSelect.value = mode; }
  document.querySelectorAll(".mode-card").forEach(c => c.classList.toggle("selected", c.dataset.mode === mode));
  sagaCurrentLevel = s.sagaCurrentLevel; isDailyMode = !!s.isDailyMode; sagaConsecutiveFails = s.sagaConsecutiveFails || 0;
  if (s.gridValue && gridSelect) gridSelect.value = s.gridValue;
  rows = s.rows; cols = s.cols;
  players = s.players; playerTypes = s.playerTypes;
  board = s.board; current = s.current; movesMade = s.movesMade; playerMoves = s.playerMoves || 0;
  firstMove = s.firstMove; scores = s.scores; timeLeft = s.timeLeft; hintsUsed = s.hintsUsed || 0; hintsRemaining = s.hintsRemaining ?? hintsRemaining;
  lastMove = s.lastMove || null; history = []; replayRecord = null; playing = true; resolving = false;

  document.getElementById("mainMenu").style.display = "none";
  document.getElementById("gameView")?.classList.add("active");
  const sagaObj = document.getElementById("sagaObjective");
  if (sagaObj) { if (mode === "saga") { sagaObj.textContent = `⚡ LEVEL ${sagaCurrentLevel + 1}: ${SAGA_LEVELS[sagaCurrentLevel]?.name || ""}`; sagaObj.classList.add("active"); } else sagaObj.classList.remove("active"); }
  const skip = document.getElementById("sagaSkipBtn"); if (skip) skip.style.display = mode === "saga" ? "block" : "none";
  if (timerContainer) timerContainer.style.display = mode === "timeAttack" ? "inline-block" : "none";
  buildBoardDOM();
  setCellSize(cols, rows);
  updateHintCount(); updateStatus(); updateScores(); paintAll(); highlightLastMove(); refitBoard();
  if (mode === "timeAttack") { if (timeLeftSpan) timeLeftSpan.textContent = timeLeft; startTimer(); }
  postInfoMsg("▶ Match resumed", "#00ffcc", 1800);
  processTurn();
}

// ── CELL INPUT ────────────────────────────────────────────────────────────────
// Instant feedback: the cell squeezes on pointerdown (no waiting for click), and
// on touch the move fires on pointerdown itself — the board never scrolls
// (touch-action: none) so there is nothing to wait for. Mouse keeps click.
function bindCell(cell, x, y) {
  let firedByTouch = false;
  cell.addEventListener("pointerdown", e => {
    cell.classList.add("press");
    if (e.pointerType === "touch" || e.pointerType === "pen") {
      firedByTouch = true;
      if (canPlayCell(x, y)) { haptic("place"); handleMove(x, y); }
      else haptic("error");
    }
  }, { passive: true });
  const release = () => cell.classList.remove("press");
  cell.addEventListener("pointerup", release, { passive: true });
  cell.addEventListener("pointercancel", release, { passive: true });
  cell.addEventListener("pointerleave", release, { passive: true });
  cell.addEventListener("click", () => {
    if (firedByTouch) { firedByTouch = false; return; }   // touch already handled it
    handleMove(x, y);
  });
}
function canPlayCell(x, y) {
  if (isReplaying) return false;                 // replays are watch-only
  if (onlineActive() && current !== onlineMySlot()) return false;   // 🧪 vpvp: not your turn
  if (!playerTypes[current] || !playing || resolving || playerTypes[current].type === "ai") return false;
  const c = board[y]?.[x];
  return !!c && !c.isBlocked && (c.owner === -1 || c.owner === current);
}

/* ⭐ FAST PHYSICS SYSTEM (mobile-tuned)
 * Per wave: measure cell centres ONCE before touching the DOM (no layout thrash),
 * mutate the board model, then redraw each dirty cell ONCE, play ONE explode sound,
 * and spawn at most a handful of particle bursts. */
const IS_TOUCH = matchMedia("(hover: none)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
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
  let badWaves = 0;
  const color = players[current].color;
  const MAX_BURSTS = gfxBurstCap();

  // Cell centres don't move during a chain — measure lazily, once per cell.
  const centres = new Map();
  const centreOf = (x, y) => {
    if (gpu) return gpu.cellCenter(x, y);
    const k = y * cols + x;
    let c = centres.get(k);
    if (!c) {
      const r = boardEl.children[k].getBoundingClientRect();
      c = [r.left + r.width / 2, r.top + r.height / 2];
      centres.set(k, c);
    }
    return c;
  };

  // Cap at 400 iterations — 400 × 8ms worst case = 3.2s max
  while (q.length && loops++ < 400) {
    waveCount++;
    updateScores();

    // Early exit: if only one player has orbs the game is decided — skip the rest of the animation
    if (aliveIndices().length <= 1) break;

    if (document.body.classList.contains("theme-matrix")) triggerMatrixFlash();
    if (localMagmaSettings.heatActive && !IS_TOUCH) triggerHeat();

    const wave = [...new Set(q.map(([x, y]) => `${x},${y}`))]
      .map(s => s.split(",").map(Number))
      .filter(([x, y]) => board[y][x].count >= capacity(x, y, rows, cols));

    totalBlast += wave.length;
    q.length = 0;
    if (!wave.length) { findExplosions(); continue; }

    // 1) READ phase — measure before any DOM write
    const showFX = wave.length <= 10 || waveCount % 3 === 0;
    const step = Math.max(1, Math.ceil(wave.length / MAX_BURSTS));
    const bursts = showFX ? wave.filter((_, i) => i % step === 0).map(([x, y]) => centreOf(x, y)) : [];

    // 2) MODEL phase — apply every explosion in the wave
    const dirty = new Set();
    for (const [x, y] of wave) {
      const cap = capacity(x, y, rows, cols);
      const cell = board[y][x];
      cell.count -= cap;
      if (cell.count === 0) cell.owner = -1;
      dirty.add(y * cols + x);
      for (const [nx, ny] of neighbors(x, y, rows, cols, board)) {
        board[ny][nx].owner = current;
        board[ny][nx].count += 1;
        dirty.add(ny * cols + nx);
      }
    }

    // 3) WRITE phase — each dirty cell drawn once; pop only the exploders
    for (const k of dirty) paintCell(k % cols, Math.floor(k / cols));
    for (const [x, y] of wave) {
      if (gpu) gpu.pop(x, y);
      else boardEl.children[y * cols + x]?.classList.add("pop");
    }
    for (const [bx, by] of bursts) spawnBlast(bx, by, color);
    playSound("explode");                       // throttled inside sound.js
    haptic("explode", Math.min(1, wave.length / 6));

    findExplosions();

    // Adaptive delay: small chains get smooth 50ms, huge chains resolve fast
    const [d1, d2, d3] = gfxWaveDelays();
    const waveDelay = loops < 25 ? d1 : loops < 60 ? d2 : d3;
    const _t0 = performance.now();
    await sleep(waveDelay);
    if (performance.now() - _t0 > waveDelay + 120) badWaves++;   // this wave visibly stuttered
    if (!gpu) for (const [x, y] of wave) boardEl.children[y * cols + x]?.classList.remove("pop");
  }

  maybePerfAdvisor(badWaves, waveCount);
  if (waveCount >= 3) showChainBadge(waveCount);
  if (totalBlast >= 13) {
    const br = (gpu ? gpu.app.view : boardEl).getBoundingClientRect();
    spawnMegaBlast(br.left + br.width / 2, br.top + br.height / 2, color);
    haptic("mega");
  } else if (waveCount >= 5) haptic("chain");
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
    // Reuse one bar per player (creating/destroying nodes every wave is wasteful)
    if (territoryMeter.children.length !== players.length) {
      territoryMeter.innerHTML = "";
      players.forEach(p => {
        const b = document.createElement("div");
        b.className = "meter-bar";
        b.style.backgroundColor = p.color;
        territoryMeter.appendChild(b);
      });
    }
    players.forEach((p, i) => {
      const b = territoryMeter.children[i];
      b.style.width = (scores[i] / total) * 100 + "%";
      b.style.backgroundColor = p.color;
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

// A player is alive if they have orbs, or haven't placed their first orb yet
// (preset saga orbs count as placed, so a wiped-out enemy is dead from move 1).
function aliveIndices() {
  return players.map((_, i) => i).filter(i => scores[i] > 0 || !firstMove[i]);
}

function checkWin() {
  if (mode === "saga") {
    const alive = aliveIndices();
    if (alive.length === 1) {
      playing = false;
      if (alive[0] === 0) {
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

  const alive = aliveIndices();

  if (alive.length === 1) {
    playing = false;
    stopTimer();

    // Find AI opponent difficulty
    const aiPlayer = playerTypes && playerTypes.find((pt, i) => i !== 0 && pt && pt.type === 'ai');
    const aiDiff = aiPlayer?.difficulty || null;

    // Record game end and get updated stats
    const stats = recordGameEnd(alive[0], aiDiff);
    const totalGames = stats.matches;

    // Games played milestones (win or lose)
    if (totalGames >= 100) unlockAchievement("games_100", "Marathon Gamer", "Played 100 games");
    else if (totalGames >= 50) unlockAchievement("games_50", "Regular Player", "Played 50 games");
    else if (totalGames >= 10) unlockAchievement("games_10", "Getting Started", "Played 10 games");

    if (alive[0] === 0) {
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

    const winnerName = players[alive[0]].name;

    // Save replay
    if (replayRecord && !isReplaying) {
      replayRecord.winner = alive[0];
      replayRecord.winnerName = winnerName;
      saveReplay(replayRecord);
      replayRecord = null;
    }

    // Show leaderboard submit button if player won vs AI
    lastWinnerIdx = alive[0];
    const playerWon = alive[0] === mySeat();
    const hasAI = playerTypes.some((pt, i) => i !== 0 && pt?.type === 'ai');
    if (playerWon && hasAI && LEADERBOARD_ENABLED) {
      const submitBtn = document.getElementById("modalLeaderboardBtn");
      if (submitBtn) {
        const aiDiff = playerTypes.find((pt, i) => i !== 0 && pt?.type === 'ai')?.difficulty || null;
        const gridVal = `${cols}x${rows}`;
        submitBtn.style.display = "inline-flex";
        submitBtn.onclick = () => promptAndSubmitScore(players[0].name, movesMade, mode, gridVal, aiDiff);
      }
    }

    showGameOver("Victory!", `${winnerName} has secured the system!`, true, playerWon);
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
  refreshTurnVisuals();
  saveMatch();                                  // snapshot AFTER the turn has passed

  if (isReplaying) {
    replayStep();
    return;
  }
  if (onlineActive()) { onlineTurnChanged(current); return; }   // 🧪 vpvp
  if (current === 0) { turnsSinceHint++; maybeNudgeHint(); }
  if (playing) processTurn();
}

// Cheap per-turn visuals: no cell re-render (that was 144 innerHTML rebuilds on 12×12).
// Colour sweep across the board in the new player's colour + badge pop; on desktop,
// pulse the current player's cells by toggling a class only.
function refreshTurnVisuals() {
  const color = players[current]?.color || "#47f2ff";
  if (gpu) {
    gpu.setPulseOwner(current);
  } else {
    for (const el of boardEl.querySelectorAll(".last-move")) el.classList.remove("last-move");
    if (!IS_TOUCH) {
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++)
          boardEl.children[y * cols + x]?.classList.toggle("pulse", board[y][x].owner === current);
  }
  }
  highlightLastMove();
  const sweepEl = (gpu || document.body.classList.contains("board-wire")) ? boardEl.parentElement : boardEl;
  sweepEl.style.setProperty("--sweep", color);
  sweepEl.classList.remove("turn-sweep");
  void sweepEl.offsetWidth;                      // restart the animation
  sweepEl.classList.add("turn-sweep");
  if (turnBadge) {
    turnBadge.classList.remove("pop");
    void turnBadge.offsetWidth;
    turnBadge.classList.add("pop");
  }
}

// ── ADAPTIVE AI (saga only) ───────────────────────────────────────────────────
// A hidden "mercy" score (0–100) rises while the player struggles and falls while
// they dominate. It is converted to an AI skill in [0.15, 1]: at 1 the AI always
// plays its best move; below that it makes *plausible* slips (2nd/3rd best move,
// see chooseBySkill in ai.js) — never obviously random blunders.
function computeMercy() {
  if (mode !== "saga") return 0;
  let m = 0;
  m += Math.min(50, hintsUsed * 12);               // asked for help → soften
  m += Math.min(30, sagaConsecutiveFails * 15);    // lost this level before → soften
  m += Math.min(45, Math.max(0, playerMoves - 25) * 1.5);  // long level → AI tires out
  const total = scores.reduce((a, b) => a + b, 0);
  if (total > 0 && movesMade >= players.length) {
    const share = scores[0] / total;               // player's orb share
    if (share < 0.2) m += 25;
    else if (share < 0.35) m += 15;
    else if (share > 0.6 && playerMoves < 25) m -= 20;   // only EARLY cruising plays sharp
  }
  const level = SAGA_LEVELS[sagaCurrentLevel];
  if (level?.isBoss) m -= 15;                      // bosses stay meaner
  // Heavy help-seeking is a quit signal — boss/situation penalties can't cancel it.
  if (hintsUsed >= 12) m = Math.max(m, 100);
  else if (hintsUsed >= 6) m = Math.max(m, 80);
  else if (hintsUsed >= 3) m = Math.max(m, 55);
  return Math.max(0, Math.min(100, m));
}

function currentAISkill() {
  const mercy = computeMercy();
  const skill = 1 - (mercy / 100) * 0.85;          // 100 mercy → 0.15 skill
  if (mercyDebug || window.mercyDebug) console.log(`[adaptive] mercy=${mercy} skill=${skill.toFixed(2)} hints=${hintsUsed} fails=${sagaConsecutiveFails}`);
  return skill;
}

// Nudge the player toward the hint button when they're behind and haven't used one in a while.
function maybeNudgeHint() {
  if (mode !== "saga" || current !== 0 || !playing) return;
  const total = scores.reduce((a, b) => a + b, 0);
  if (total === 0 || movesMade < players.length * 2) return;
  const share = scores[0] / total;
  if (share >= 0.4) return;
  if (turnsSinceHint < 3 || movesMade - lastNudgeTurn < 6) return;
  lastNudgeTurn = movesMade;
  const btn = document.getElementById("hintBtn");
  if (btn) {
    btn.classList.add("hint-nudge");
    setTimeout(() => btn.classList.remove("hint-nudge"), 4000);
  }
  postInfoMsg(share < 0.25 ? "⚠️ Enemy is closing in — tap 💡 for a hint" : "💡 Losing ground? A hint can turn it around", "#88aaff", 3000);
}

function processTurn() {
  if (!playerTypes[current]) return;
  if (!playing || playerTypes[current].type !== "ai") return;

  clearTimeout(aiTimeout);

  statusText.textContent = "CALCULATING...";
  
  const aiDelay = parseInt(document.getElementById("aiSpeedSelect")?.value || "300", 10);
  aiTimeout = setTimeout(() => {
    const diff = playerTypes[current].difficulty || "hard";

    // Adaptive difficulty (saga): skill < 1 makes the AI slip on purpose, subtly
    const skill = mode === "saga" ? currentAISkill() : 1;

    if (aiWorker) {
      // Off-thread: worker computes move on a separate CPU core, UI stays smooth
      const id = ++aiMoveId;
      aiWorker.postMessage({ board, current, difficulty: diff, rows, cols, playerCount: players.length, skill, id });
    } else {
      // Fallback: compute on main thread (older browsers)
      const move = makeAIMove(board, current, diff, rows, cols, players.length, skill);
      if (move) makeMove(move.x, move.y);
    }
  }, aiDelay);
}

function paintAll(withPulse = false) {
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      paintCell(x, y, withPulse);
  highlightLastMove();
}

function highlightLastMove() {
  if (gpu) { gpu.lastMove(lastMove ? lastMove.x : -1, lastMove ? lastMove.y : 0); return; }
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
  const best = getProfessionalHint(board, current, rows, cols, players.length);
  if (!best) return;

  hintsRemaining--;
  hintsUsed++;
  turnsSinceHint = 0;
  track("hint_used", { mode, level: mode === "saga" ? sagaCurrentLevel + 1 : null, hints_used: hintsUsed, moves: movesMade, mercy: computeMercy() });
  document.getElementById("hintBtn")?.classList.remove("hint-nudge");
  updateHintCount();

  const reason = getHintReason(best);
  // Spotlight: dim the whole board except the suggested cell (a border alone
  // is impossible to find on a 12×12 full of glowing orbs)
  if (gpu) {
    gpu.hint(best.x, best.y);
  } else {
    const cellEl = boardEl.children[best.y * cols + best.x];
    boardEl.classList.add("hint-dim");
    cellEl.classList.add("hint-active");
    cellEl.title = reason;
  }
  clearTimeout(window.__hintTimer);
  window.__hintTimer = setTimeout(clearHintSpotlight, 5000);

  postInfoMsg(`💡 Hint\nThis move ${reason}`, "#88aaff", 4000);
}

function playFakeAd() {
  track("rewarded_ad_complete", { placement: "hints" });
  hintsRemaining += 3;
  updateHintCount();
  document.getElementById("adModal").style.display = "none";
}

function undoMove() {
  if (!history.length || !playing || resolving || isReplaying || mode === "online") return;

  // Cancel any AI move that is being computed / scheduled for the current position
  clearTimeout(aiTimeout);
  aiMoveId++;

  const restore = snap => {
    const prev = JSON.parse(snap);
    board = prev.board;
    current = prev.current;
    scores = prev.scores;
    movesMade = prev.movesMade ?? Math.max(0, movesMade - 1);
    playerMoves = prev.playerMoves ?? playerMoves;
    if (prev.firstMove) firstMove = prev.firstMove;
    lastMove = prev.lastMove ?? null;
    if (replayRecord && !isReplaying && replayRecord.moves.length) replayRecord.moves.pop();
  };

  restore(history.pop());
  // Against the AI, one undo should hand the turn back to the human: rewind the AI's ply too
  let guard = 0;
  while (history.length && playerTypes[current]?.type === "ai" && guard++ < players.length) restore(history.pop());

  paintAll();
  updateStatus();
  updateScores();
  // If (in a multi-AI lobby) it is still an AI's turn, let it think again
  if (playerTypes[current]?.type === "ai") processTurn();
}

function startTimer() {
  stopTimer();
  timer = setInterval(() => {
    if (!playing) { stopTimer(); return; }
    if (resolving || playerTypes[current]?.type === "ai") return;   // clock only runs on a human's turn
    timeLeft--;
    if (timeLeftSpan) timeLeftSpan.textContent = timeLeft;
    if (timeLeft <= 0) {
      stopTimer();
      playing = false;
      const bestIdx = scores.indexOf(Math.max(...scores));
      lastWinnerIdx = bestIdx;
      const aiPlayer = playerTypes && playerTypes.find((pt, i) => i !== 0 && pt && pt.type === 'ai');
      recordGameEnd(bestIdx, aiPlayer?.difficulty || null);
      if (bestIdx === 0) {
        unlockAchievement("first_win", "First Victory!", "Won your very first game");
        unlockAchievement("speed_win", "Speed Demon!", "Won a Time Attack match");
        const speedWins = incCounter('speedWins');
        if (speedWins >= 10) unlockAchievement("speed_win_10", "Time Master", "Won 10 Time Attack matches");
        else if (speedWins >= 3) unlockAchievement("speed_win_3", "Speed Freak", "Won 3 Time Attack matches");
        const currentStreak = incCounter('winStreak');
        if (currentStreak > (getCounters().bestWinStreak || 0)) setCounter('bestWinStreak', currentStreak);
        grantXP(50);
      } else {
        setCounter('winStreak', 0);
      }
      const winnerName = players[bestIdx]?.name || "Unknown";
      if (replayRecord && !isReplaying) {
        replayRecord.winner = bestIdx;
        replayRecord.winnerName = winnerName;
        saveReplay(replayRecord);
        replayRecord = null;
      }
      track("time_attack_timeout", { winner: bestIdx });
      showGameOver("Time's Up!", `${winnerName} wins with the most orbs!`, true, bestIdx === mySeat());
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
  if (modalReplayBtn) modalReplayBtn.style.display = mode === "online" ? "none" : "";
  setupShareButton(playerWon);
  track(playerWon ? "match_win" : "match_lose", { mode, grid: `${cols}x${rows}`, moves: movesMade, seconds: levelTimer ? Math.round(levelTimer() / 1000) : null, players: players.length });
  clearSavedMatch();
  playSound("win");
  haptic(playerWon ? "win" : "lose");
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
  clearSavedMatch();
  playSound("win");
  haptic("win");
  startCelebration();

  const level = SAGA_LEVELS[sagaCurrentLevel];

  // Calculate stars based on moves
  // Stars count only YOUR moves (the AI's moves used to count against you).
  // A level can override with `par` (moves for 3★); 2★ is up to 1.6× par.
  const playable = level.rows * level.cols - level.blockedCells.length;
  const par = level.par || Math.max(6, Math.round(playable * 0.3));
  const stars = playerMoves <= par ? 3
              : playerMoves <= Math.round(par * 1.6) ? 2 : 1;
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

  const xpGain = 75 + (stars === 3 ? 50 : stars === 2 ? 25 : 0);
  let dailyLine = "";
  const o_daily = isDailyMode;

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
    dailyLine = `🔥 ${streak} day streak! +100 XP`;
    isDailyMode = false;
    updateDailyUI();
  }

  track("level_win", { level: sagaCurrentLevel + 1, stars, moves: playerMoves, par, hints: hintsUsed, fails_before: sagaConsecutiveFails, seconds: levelTimer ? Math.round(levelTimer() / 1000) : null, daily: !!o_daily });
  sagaConsecutiveFails = 0;
  showLevelComplete({
    levelNum: sagaCurrentLevel + 1,
    name: level.name,
    stars, par, moves: playerMoves, improved: newBest > prevBest && prevBest > 0,
    xpGain, dailyLine,
    hasNext: sagaCurrentLevel < SAGA_LEVELS.length - 1,
  });
}

// ── LEVEL COMPLETE SEQUENCE ───────────────────────────────────────────────────
// stars fly in one by one → XP counts up → buttons slide in. Skippable by tapping.
function showLevelComplete(o) {
  const ov = document.getElementById("levelCompleteOverlay");
  if (!ov) { gameModal.style.display = "flex"; return; }
  const $$ = id => document.getElementById(id);
  $$("lcLevel").textContent = `LEVEL ${o.levelNum}`;
  $$("lcName").textContent = o.name;
  $$("lcMoves").textContent = `${o.moves} moves · par ${o.par}${o.improved ? " · 🆕 new best" : ""}`;
  $$("lcXP").textContent = "+0 XP";
  $$("lcDaily").textContent = o.dailyLine || "";
  $$("lcDaily").style.display = o.dailyLine ? "" : "none";
  $$("lcNext").style.display = o.hasNext ? "" : "none";
  const starEls = [...ov.querySelectorAll(".lc-star")];
  starEls.forEach(s => s.classList.remove("on", "in"));
  ov.classList.remove("show-actions");
  ov.style.display = "flex";
  requestAnimationFrame(() => ov.classList.add("visible"));

  let t = 500, done = false;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  for (let i = 0; i < 3; i++) {
    const el = starEls[i], lit = i < o.stars;
    later(() => {
      el.classList.add("in");
      if (lit) { el.classList.add("on"); playSound("click"); haptic("star"); }
    }, t);
    t += lit ? 380 : 220;
  }
  // XP count-up
  later(() => {
    const start = performance.now(), dur = 700;
    const tick = now => {
      const k = Math.min(1, (now - start) / dur);
      const v = Math.round(o.xpGain * (1 - Math.pow(1 - k, 3)));
      $$("lcXP").textContent = `+${v} XP`;
      if (k < 1 && !done) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, t);
  t += 800;
  later(() => ov.classList.add("show-actions"), t);

  const finish = () => {                       // tap anywhere → skip straight to the end state
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    starEls.forEach((el, i) => { el.classList.add("in"); if (i < o.stars) el.classList.add("on"); });
    $$("lcXP").textContent = `+${o.xpGain} XP`;
    ov.classList.add("show-actions");
  };
  ov.onclick = e => { if (!e.target.closest("button")) finish(); };
  later(() => { done = true; }, t + 50);
}
function hideLevelComplete() {
  const ov = document.getElementById("levelCompleteOverlay");
  if (!ov) return;
  ov.classList.remove("visible", "show-actions");
  ov.style.display = "none";
}

function showSagaFail() {
  sagaConsecutiveFails++;
  clearSavedMatch();
  track("level_fail", { level: sagaCurrentLevel + 1, moves: playerMoves, hints: hintsUsed, fails: sagaConsecutiveFails, seconds: levelTimer ? Math.round(levelTimer() / 1000) : null, mercy: computeMercy() });
  haptic("lose");
  modalTitle.textContent = "Defeated!";
  modalBody.innerHTML = `The enemy eliminated all your orbs!<br>Try again?`;
  if (modalReplayBtn) modalReplayBtn.textContent = "Try Again";
  const isLastLevel = sagaCurrentLevel >= SAGA_LEVELS.length - 1;
  if (modalSkipBtn)
    modalSkipBtn.style.display = (sagaConsecutiveFails >= 2 && !isLastLevel) ? "block" : "none";
  gameModal.style.display = "flex";
}

function skipSagaLevel() {
  track("level_skip", { level: sagaCurrentLevel + 1, fails: sagaConsecutiveFails });
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

// ── LEADERBOARD ───────────────────────────────────────────────────────────────

async function promptAndSubmitScore(defaultName, score, gameMode, grid, aiDifficulty) {
  const btn = document.getElementById("modalLeaderboardBtn");
  const name = prompt("Enter your name for the leaderboard:", defaultName || "Player");
  if (!name) return;
  if (btn) { btn.textContent = "Submitting..."; btn.disabled = true; }
  const result = await submitScore({ playerName: name.slice(0, 20), score, mode: gameMode, grid, aiDifficulty });
  if (btn) {
    btn.textContent = result.ok ? "✅ Submitted!" : "❌ Failed";
    btn.disabled = true;
  }
}

async function openLeaderboardModal() {
  const modal = document.getElementById("leaderboardModal");
  const body = document.getElementById("leaderboardBody");
  const modeTab = document.getElementById("lbModeTab");
  const gridFilter = document.getElementById("lbGridFilter");
  if (!modal || !body) return;

  const gameMode = modeTab?.value || "normal";
  const grid = gridFilter?.value || "9x9";

  body.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">Loading...</p>';
  modal.style.display = "flex";

  const rows_data = await fetchLeaderboard({ mode: gameMode, grid });
  body.innerHTML = "";

  if (!rows_data.length) {
    body.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">No scores yet. Be the first!</p>';
    return;
  }

  const table = document.createElement("table");
  table.style.cssText = "width:100%;border-collapse:collapse;font-size:0.85rem;";
  table.innerHTML = `<thead><tr style="color:#00ffcc;border-bottom:1px solid #333;">
    <th style="padding:6px 4px;text-align:left;">#</th>
    <th style="padding:6px 4px;text-align:left;">Name</th>
    <th style="padding:6px 4px;text-align:right;">${gameMode === 'timeAttack' ? 'Time Left' : 'Moves'}</th>
    <th style="padding:6px 4px;text-align:right;">Diff</th>
  </tr></thead>`;
  const tbody = document.createElement("tbody");
  rows_data.forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #1a1a1a";
    const score = gameMode === 'timeAttack' ? (row.score / 1000).toFixed(1) + "s" : row.score;
    tr.innerHTML = `<td style="padding:6px 4px;color:#666;">${i+1}</td>
      <td style="padding:6px 4px;">${row.player_name}</td>
      <td style="padding:6px 4px;text-align:right;color:#00ffcc;">${score}</td>
      <td style="padding:6px 4px;text-align:right;color:#888;">${row.ai_difficulty || '-'}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  body.appendChild(table);
}

// ─────────────────────────────────────────────────────────────────────────────

// ── REPLAY PLAYBACK ───────────────────────────────────────────────────────────

function replayStep() {
  if (!isReplaying || replayPaused) return;
  if (replayIndex >= replayMoves.length) {
    // Replay finished — show controls as done
    updateReplayUI();
    return;
  }
  clearTimeout(replayTimer);
  replayTimer = setTimeout(() => {
    if (!isReplaying || replayPaused) return;
    const { x, y } = replayMoves[replayIndex++];
    updateReplayUI();
    makeMove(x, y);
  }, replaySpeedMs);
}

function updateReplayUI() {
  const counter = document.getElementById("replayCounter");
  const playBtn = document.getElementById("replayPlayBtn");
  if (counter) counter.textContent = `${replayIndex} / ${replayMoves.length}`;
  if (playBtn) playBtn.textContent = replayPaused ? "▶" : "⏸";
}

function startReplayPlayback(replayData) {
  isReplaying = true;
  replayMoves = replayData.moves;
  replayCurrentId = replayData.id;
  replayIndex = 0;
  replayPaused = false;
  replaySpeedMs = 800;

  // Override players + grid from replay data
  players = replayData.players.map(p => ({ name: p.name, color: p.color }));
  playerTypes = replayData.players.map(() => ({ type: 'human' })); // all human so AI doesn't fire
  mode = replayData.mode || "normal";

  const [c, r] = [replayData.cols, replayData.rows];
  cols = c; rows = r;

  // Switch to game view
  document.getElementById("mainMenu").style.display = "none";
  document.getElementById("gameView").classList.add("active");
  document.getElementById("replayControls").style.display = "flex";
  document.querySelector(".game-header").style.display = "none";

  // Re-init board without processing AI turn
  setCellSize(cols, rows);
  current = 0;
  playing = true;
  firstMove = players.map(() => false);
  history = [];
  movesMade = 0;
  playerMoves = 0;
  replayRecord = null;

  board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ owner: -1, count: 0, isBlocked: false }))
  );
  buildBoardDOM();          // GPU or DOM — input blocked by isReplaying guards

  updateStatus();
  updateScores();
  paintAll();
  refitBoard();
  updateReplayUI();
  replayStep();
}

function stopReplay() {
  clearTimeout(replayTimer);
  isReplaying = false;
  replayPaused = false;
  replayMoves = [];
  replayIndex = 0;
  document.getElementById("replayControls").style.display = "none";
  document.querySelector(".game-header").style.display = "";
  backToMenu();
}

function openReplaysModal() {
  const modal = document.getElementById("replaysModal");
  const list = document.getElementById("replaysList");
  if (!modal || !list) return;
  const replays = getReplays();
  list.innerHTML = "";

  if (replays.length === 0) {
    list.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">No replays saved yet.<br>Play a game to record one!</p>';
  } else {
    replays.forEach(r => {
      const d = new Date(r.date);
      const dateStr = d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const row = document.createElement("div");
      row.className = "replay-row";
      row.innerHTML = `
        <div class="replay-info">
          <span class="replay-winner" style="color:${r.players[r.winner]?.color || '#00ffcc'}">${r.winnerName || '?'} won</span>
          <span class="replay-meta">${r.mode} · ${r.gridLabel} · ${r.moves.length} moves</span>
          <span class="replay-date">${dateStr}</span>
        </div>
        <div class="replay-actions">
          <button class="replay-play-btn modal-btn primary">▶ Play</button>
          <button class="replay-del-btn modal-btn secondary">🗑</button>
        </div>`;
      row.querySelector(".replay-play-btn").addEventListener("click", () => {
        modal.style.display = "none";
        startReplayPlayback(r);
      });
      row.querySelector(".replay-del-btn").addEventListener("click", () => {
        deleteReplay(r.id);
        row.remove();
        if (list.children.length === 0)
          list.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">No replays saved yet.</p>';
      });
      list.appendChild(row);
    });
  }
  modal.style.display = "flex";
}

let lastWinnerIdx = 0;                    // filled in when a match ends (share card)
function mySeat() { return onlineActive() ? onlineMySlot() : 0; }

// ── SHARE CARD ────────────────────────────────────────────────────────────────
// Offered after any win: a 1080×1080 victory image straight to the share sheet.
function setupShareButton(playerWon) {
  const btn = document.getElementById("modalShareBtn");
  if (!btn) return;
  if (!playerWon) { btn.style.display = "none"; return; }
  btn.style.display = "";
  btn.textContent = "📤 Share";
  btn.disabled = false;
  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = "…";
    const res = await shareResult({
      winnerName: players[lastWinnerIdx]?.name || "Player",
      winnerColor: players[lastWinnerIdx]?.color || "#00ffcc",
      players: players.map(p => ({ name: p.name, color: p.color })),
      mode, grid: `${cols}×${rows}`, moves: movesMade,
      online: mode === "online",
    });
    track("share_card", { result: res, mode });
    btn.disabled = false;
    btn.textContent = res === "shared" ? "✓ Shared" : res === "downloaded" ? "✓ Image saved" : "📤 Share";
    if (res === "downloaded") postInfoMsg("Image saved — caption copied, paste it with the picture", "#00ffcc", 3400);
    if (res === "failed") postInfoMsg("Couldn't create the image on this device", "#ff4757", 2600);
  };
}

// ── 🧪 VIRTUAL PVP · TESTING PHASE 1 (remove at release) ─────────────────────
function startOnlineMatch({ players: ps, rows: r, cols: c, mySlot }) {
  closeModal(); hideLevelComplete();
  mode = "online";
  isDailyMode = false;
  players = ps.map(p => ({ name: p.name, color: p.color }));
  playerTypes = ps.map(() => ({ type: "human" }));
  cols = c; rows = r;
  document.getElementById("mainMenu").style.display = "none";
  document.getElementById("gameView")?.classList.add("active");
  if (timerContainer) timerContainer.style.display = "none";
  if (undoBtn) undoBtn.style.display = "none";   // undo would desync the room
  resetGame();
  postInfoMsg(`🧪 Virtual PvP — you are ${ps[mySlot]?.name || "?"}`, ps[mySlot]?.color || "#00ffcc", 2600);
  onlineTurnChanged(0);
}

initOnline({
  startMatch: startOnlineMatch,
  playerName: slot => players[slot]?.name || "A player",
  notify: msg => postInfoMsg(msg, "#ffa502", 3000),
  computeAIMove: async slot => {
    if (!playing || !board.length) return null;
    return makeAIMove(board, slot, "greedy", rows, cols, players.length, 1);
  },
  applyRemoteMove: (x, y, slot) => {
    if (!playing || resolving) return;
    if (slot !== current) return;                // safety: boards must agree on whose turn it is
    makeMove(x, y);
  },
  endMatch: msg => {
    playing = false;
    stopTimer();
    if (modalReplayBtn) modalReplayBtn.style.display = "none";
    modalTitle.textContent = "Match ended";
    modalBody.textContent = msg;
    gameModal.style.display = "flex";
  },
});

// ─────────────────────────────────────────────────────────────────────────────

init();