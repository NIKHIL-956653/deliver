// js/storage.js
const STORAGE_KEY = 'neon_chain_reaction_v1';

// ── XP RANKS ─────────────────────────────────────────────────────────────────
const RANKS = [
    { name: "Rookie",   xp: 0 },
    { name: "Soldier",  xp: 200 },
    { name: "Veteran",  xp: 500 },
    { name: "Pro",      xp: 1000 },
    { name: "Elite",    xp: 2000 },
    { name: "Master",   xp: 4000 },
    { name: "Legend",   xp: 7000 },
];

function getRankIndex(xp) {
    let r = 0;
    for (let i = 0; i < RANKS.length; i++) {
        if (xp >= RANKS[i].xp) r = i;
    }
    return r;
}

// Default State (Now includes settings for Theme)
const defaultData = {
    settings: {
        theme: 'default',
        xp: 0,
        coins: 0
    },
    stats: {
        matches: 0,
        wins: { easy: 0, greedy: 0, hard: 0 },
        losses: 0
    },
    achievements: [] // Array of unlocked achievement IDs
};

// Load Data
export function loadData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;

    // Merge with defaultData to ensure new fields (like settings) exist 
    // even if the user has old data saved.
    const parsed = JSON.parse(raw);
    return { 
        ...defaultData, 
        ...parsed, 
        settings: { ...defaultData.settings, ...parsed.settings }
    };
}

// Save Data Helper
function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- NEW: THEME FUNCTIONS ---
export function saveTheme(themeClass) {
    const data = loadData();
    data.settings.theme = themeClass;
    saveData(data);
}

export function getSavedTheme() {
    const data = loadData();
    return data.settings.theme;
}
// ----------------------------

// ── XP FUNCTIONS ──────────────────────────────────────────────────────────────
export function getXPInfo() {
    const data = loadData();
    const xp = data.settings.xp || 0;
    const rankIdx = getRankIndex(xp);
    const rankName = RANKS[rankIdx].name;
    const xpInRank = xp - RANKS[rankIdx].xp;
    const xpToNext = rankIdx < RANKS.length - 1 ? RANKS[rankIdx + 1].xp - RANKS[rankIdx].xp : null;
    const isMax = rankIdx === RANKS.length - 1;
    return { xp, rankName, rankIdx, xpInRank, xpToNext, isMax };
}

export function saveSkin(skin) {
    localStorage.setItem('neon_skin', skin || 'default');
}
export function getSavedSkin() {
    return localStorage.getItem('neon_skin') || 'default';
}
export function saveBlastSkin(skin) {
    localStorage.setItem('neon_blast_skin', skin || 'default');
}
export function getSavedBlastSkin() {
    return localStorage.getItem('neon_blast_skin') || 'default';
}

export function addXP(amount) {
    const data = loadData();
    const prevXP = data.settings.xp || 0;
    const prevRankIdx = getRankIndex(prevXP);
    data.settings.xp = prevXP + amount;
    saveData(data);
    const newRankIdx = getRankIndex(data.settings.xp);
    return {
        xp: data.settings.xp,
        rankName: RANKS[newRankIdx].name,
        prevRankName: RANKS[prevRankIdx].name,
        leveledUp: newRankIdx > prevRankIdx
    };
}
// ── COIN FUNCTIONS ────────────────────────────────────────────────────────────
export function getCoins() {
    const data = loadData();
    return data.settings.coins || 0;
}

export function addCoins(amount) {
    const data = loadData();
    data.settings.coins = (data.settings.coins || 0) + amount;
    saveData(data);
    return data.settings.coins;
}

export function spendCoins(amount) {
    const data = loadData();
    const current = data.settings.coins || 0;
    if (current < amount) return false;
    data.settings.coins = current - amount;
    saveData(data);
    return true;
}

export function canClaimDailyCoins() {
    const last = localStorage.getItem('neon_coin_claim');
    if (!last) return true;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return last !== today;
}

export function claimDailyCoins() {
    if (!canClaimDailyCoins()) return 0;
    const CLAIM_AMOUNT = 25;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    localStorage.setItem('neon_coin_claim', today);
    addCoins(CLAIM_AMOUNT);
    return CLAIM_AMOUNT;
}
// ─────────────────────────────────────────────────────────────────────────────

// Update Stats after a game
export function recordGameEnd(winnerIndex, aiDifficulty) {
    const data = loadData();
    data.stats.matches++;
    
    if (winnerIndex === 0) { // Player (You) won
        if (aiDifficulty && data.stats.wins[aiDifficulty] !== undefined) {
            data.stats.wins[aiDifficulty]++;
        }
    } else {
        data.stats.losses++;
    }
    saveData(data);
    return data.stats;
}

// Check & Unlock Achievement
export function tryUnlockAchievement(id, title, desc) {
    const data = loadData();
    if (!data.achievements.includes(id)) {
        data.achievements.push(id);
        saveData(data);
        showAchievementToast(title, desc);
        return true;
    }
    return false;
}

// ── DAILY CHALLENGE ──────────────────────────────────────────────────────────
function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function isDailyCompleted() {
    const data = JSON.parse(localStorage.getItem('neon_daily') || '{}');
    return !!data[getTodayKey()];
}

export function completeDailyChallenge() {
    const data = JSON.parse(localStorage.getItem('neon_daily') || '{}');
    const today = getTodayKey();
    if (data[today]) return data._streak || 1;
    const d = new Date(); d.setDate(d.getDate() - 1);
    const yesterday = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const newStreak = (data._lastDay === yesterday) ? (data._streak || 0) + 1 : 1;
    data[today] = true;
    data._streak = newStreak;
    data._lastDay = today;
    localStorage.setItem('neon_daily', JSON.stringify(data));
    return newStreak;
}

export function getDailyStreak() {
    const data = JSON.parse(localStorage.getItem('neon_daily') || '{}');
    if (!data._lastDay) return 0;
    const today = getTodayKey();
    const d = new Date(); d.setDate(d.getDate() - 1);
    const yesterday = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (data._lastDay === today || data._lastDay === yesterday) return data._streak || 0;
    return 0;
}

// ── LEVEL STARS ──────────────────────────────────────────────────────────────
export function saveLevelStars(levelId, stars) {
    const data = JSON.parse(localStorage.getItem('neon_stars') || '{}');
    const prev = data[levelId] || 0;
    if (stars > prev) {
        data[levelId] = stars;
        localStorage.setItem('neon_stars', JSON.stringify(data));
    }
    return Math.max(prev, stars);
}

export function getLevelStars(levelId) {
    const data = JSON.parse(localStorage.getItem('neon_stars') || '{}');
    return data[levelId] || 0;
}

export function getAllLevelStars() {
    return JSON.parse(localStorage.getItem('neon_stars') || '{}');
}

// ── UI: Show Toast Notification ──────────────────────────────────────────────
const _toastQueue = [];
let _toastBusy = false;

function _processToastQueue() {
    if (_toastQueue.length === 0) { _toastBusy = false; return; }
    _toastBusy = true;
    const { title, desc } = _toastQueue.shift();

    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
        <div class="ach-toast-label">ACHIEVEMENT UNLOCKED</div>
        <div class="ach-toast-body">
            <div class="ach-toast-icon">🏆</div>
            <div class="ach-toast-text">
                <div class="ach-toast-title">${title}</div>
                <div class="ach-toast-desc">${desc}</div>
            </div>
        </div>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));

    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => {
            toast.remove();
            _processToastQueue();
        }, 500);
    }, 3000);
}

function showAchievementToast(title, desc) {
    _toastQueue.push({ title, desc });
    if (!_toastBusy) _processToastQueue();
}