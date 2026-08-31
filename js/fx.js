/* js/fx.js */

// 1. SETUP HIGH-PERFORMANCE CANVAS LAYER
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d", { alpha: true });
canvas.id = "fxCanvas";
Object.assign(canvas.style, {
    position: "fixed", top: "0", left: "0",
    width: "100%", height: "100%",
    pointerEvents: "none", zIndex: "9999"
});
document.body.appendChild(canvas);

// 2. SETUP FLASH OVERLAY
const flashOverlay = document.createElement("div");
flashOverlay.id = "flash-overlay";
Object.assign(flashOverlay.style, {
    position: "fixed", top: "0", left: "0",
    width: "100vw", height: "100vh",
    pointerEvents: "none", zIndex: "9000",
    backgroundColor: "white", opacity: "0",
    transition: "opacity 0.1s ease-out",
    mixBlendMode: "overlay"
});
document.body.appendChild(flashOverlay);

// PARTICLE SYSTEM DATA
let particles = [];
let rings = [];   // For Shockwave blast skin
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Cap the backing-store resolution: a 3× phone screen is ~9× the pixels of 1× for
// particles nobody can tell apart. 1.5× on mobile, 2× on desktop.
function gfxTier() { return window.__gfxTier || (isMobile ? "med" : "high"); }
function dpr() {
    const t = gfxTier();
    return Math.min(window.devicePixelRatio || 1, t === "low" ? 1 : t === "high" ? 2 : 1.5);
}
function resize() {
    const D = dpr();
    canvas.width = Math.round(window.innerWidth * D);
    canvas.height = Math.round(window.innerHeight * D);
    ctx.setTransform(D, 0, 0, D, 0, 0);
}
window.addEventListener('resize', resize);
window.addEventListener('gfxchange', resize);
resize();

// CORE ANIMATION LOOP — runs only while there is something to draw.
// Idle: no rAF, no clearRect, no GPU upload of a full-screen canvas 60×/s.
let fxRunning = false;
let fxIdleFrames = 0;
function maxParticles() { const t = gfxTier(); return t === "low" ? 250 : t === "high" ? 2000 : 600; }
function ensureFXLoop() {
    if (fxRunning) return;
    fxRunning = true;
    fxIdleFrames = 0;
    requestAnimationFrame(updateFX);
}
function updateFX() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!particles.length && !rings.length) {
        if (++fxIdleFrames > 2) { fxRunning = false; return; }   // one extra clear, then sleep
        requestAnimationFrame(updateFX);
        return;
    }
    fxIdleFrames = 0;

    // --- Shockwave rings ---
    for (let i = rings.length - 1; i >= 0; i--) {
        const rng = rings[i];
        rng.r += rng.speed;
        rng.life -= rng.decay;
        if (rng.life <= 0) { rings.splice(i, 1); continue; }
        ctx.globalAlpha = rng.life;
        ctx.strokeStyle = rng.color;
        ctx.lineWidth = rng.width * rng.life;
        ctx.shadowBlur = isMobile ? 0 : 18;
        ctx.shadowColor = rng.color;
        ctx.beginPath();
        ctx.arc(rng.x, rng.y, rng.r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // --- Standard particles ---
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        p.size *= 0.96;

        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = isMobile ? 0 : 10;
        ctx.shadowColor = p.color;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    requestAnimationFrame(updateFX);
}
// Wrap the arrays' push so every spawner automatically wakes the loop and respects the cap.
for (const arr of [particles, rings]) {
    const push = arr.push.bind(arr);
    arr.push = (...items) => {
        if (arr === particles && particles.length + items.length > maxParticles()) particles.splice(0, items.length);
        const r = push(...items);
        ensureFXLoop();
        return r;
    };
}

export function spawnParticles(x, y, color) {
    const t = gfxTier();
    const count = t === "low" ? 6 : t === "high" ? 24 : 12;
    const baseSize = isMobile ? 4 : 3;

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 2 + Math.random() * 4;
        
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            size: baseSize + Math.random() * 2,
            color: color,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.02
        });
    }
}

export function triggerShake() {
    const board = document.querySelector('.board');
    if (!board) return;
    if (navigator.vibrate) navigator.vibrate(20); 
    board.classList.remove('shake-active');
    void board.offsetWidth; 
    board.classList.add('shake-active');
    setTimeout(() => board.classList.remove('shake-active'), 200);
}

// Cyberpunk Glitch Effect
export function triggerGlitch() {
    const board = document.querySelector('.board');
    if (!board || !document.body.classList.contains('theme-cyberpunk')) return;
    board.style.filter = `hue-rotate(${Math.random() * 90}deg) brightness(1.5)`;
    board.style.transform = `translate3d(${Math.random() * 4 - 2}px, 0, 0) skew(${Math.random() * 2 - 1}deg)`;
    setTimeout(() => {
        board.style.filter = '';
        board.style.transform = '';
    }, 150);
}

// Magma Heat Surge Effect
export function triggerHeat() {
    const board = document.querySelector('.board');
    if (!board || !document.body.classList.contains('theme-magma')) return;
    board.style.filter = `contrast(1.2) brightness(1.3) saturate(1.5)`;
    board.style.transform = `scale(1.01)`;
    triggerFlash('#ff4500'); 
    setTimeout(() => {
        board.style.filter = '';
        board.style.transform = '';
    }, 200);
}

export function triggerFlash(color = "white") {
    flashOverlay.style.backgroundColor = color;
    flashOverlay.style.opacity = "0.4";
    setTimeout(() => flashOverlay.style.opacity = "0", 100);
}

export function setBackgroundPulse(color) {
    document.documentElement.style.setProperty('--glow', color);
}

// ── BLAST SKIN: SHOCKWAVE ─────────────────────────────────────────────────────
// Three crisp concentric rings expand outward + white cell flash.
export function spawnShockwave(x, y, color) {
    // Instant white overload flash
    flashOverlay.style.backgroundColor = 'white';
    flashOverlay.style.opacity = '0.55';
    setTimeout(() => { flashOverlay.style.opacity = '0'; }, 80);

    // Three staggered rings: white → player color → cyan
    const config = [
        { delay: 0,  color: '#ffffff',  width: 3.5, speed: 5,   decay: 0.038 },
        { delay: 45, color: color,      width: 2.5, speed: 6.5, decay: 0.042 },
        { delay: 90, color: '#88eeff',  width: 1.5, speed: 8,   decay: 0.048 },
    ];
    config.forEach(c => {
        setTimeout(() => {
            rings.push({ x, y, r: 4, speed: c.speed, width: c.width, color: c.color, life: 1.0, decay: c.decay });
        }, c.delay);
    });
}

// ── BLAST SKIN: VOID COLLAPSE ─────────────────────────────────────────────────
// Phase 1: particles implode inward (darkness gathering).
// Phase 2: 8 sharp shards erupt outward + colored flash.
export function spawnVoidCollapse(x, y, color) {
    // Phase 1 — inward pull (particles start spread, converge to center)
    const pullCount = isMobile ? 8 : 14;
    const spread = 48;
    for (let i = 0; i < pullCount; i++) {
        const angle = (i / pullCount) * Math.PI * 2;
        particles.push({
            x: x + Math.cos(angle) * spread,
            y: y + Math.sin(angle) * spread,
            vx: -Math.cos(angle) * 3.5,
            vy: -Math.sin(angle) * 3.5,
            size: 3 + Math.random() * 2,
            color: '#1a0030',
            life: 0.75,
            decay: 0.09
        });
    }

    // Phase 2 (80ms delay) — eruption shards
    setTimeout(() => {
        flashOverlay.style.backgroundColor = color;
        flashOverlay.style.opacity = '0.5';
        setTimeout(() => { flashOverlay.style.opacity = '0'; }, 110);

        const shardCount = isMobile ? 6 : 8;
        for (let i = 0; i < shardCount; i++) {
            const angle = (i / shardCount) * Math.PI * 2;
            const vel = 6 + Math.random() * 3;
            // Two layers: big bright shard + small white core shard
            particles.push({
                x, y,
                vx: Math.cos(angle) * vel,
                vy: Math.sin(angle) * vel,
                size: isMobile ? 5 : 8,
                color: i % 2 === 0 ? color : '#ffffff',
                life: 1.0,
                decay: 0.022
            });
            particles.push({
                x, y,
                vx: Math.cos(angle) * vel * 0.55,
                vy: Math.sin(angle) * vel * 0.55,
                size: isMobile ? 3 : 4,
                color: '#ffffff',
                life: 0.9,
                decay: 0.035
            });
        }
    }, 80);
}

// ── BLAST SKIN: PULSE ─────────────────────────────────────────────────────────
// Heartbeat double-pulse: glowing orb particles fan out in a ring formation — two
// waves separated by ~230ms. Visually distinct from Shockwave (no line rings).
export function spawnPulse(x, y, color) {
    function spawnWave(lifeStart) {
        const count = isMobile ? 12 : 20;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const vel = 1.6 + Math.random() * 1.4;
            particles.push({
                x: x + Math.cos(angle) * 5,
                y: y + Math.sin(angle) * 5,
                vx: Math.cos(angle) * vel,
                vy: Math.sin(angle) * vel,
                size: (isMobile ? 4 : 6) + Math.random() * 3,
                color: i % 4 === 0 ? '#ffffff' : color,
                life: lifeStart,
                decay: 0.016 + Math.random() * 0.008
            });
        }
    }

    // Wave 1 — first beat
    spawnWave(1.0);
    flashOverlay.style.backgroundColor = color;
    flashOverlay.style.opacity = '0.30';
    setTimeout(() => { flashOverlay.style.opacity = '0'; }, 100);

    // Wave 2 — second beat (heartbeat pause)
    setTimeout(() => {
        spawnWave(0.8);
        flashOverlay.style.backgroundColor = color;
        flashOverlay.style.opacity = '0.20';
        setTimeout(() => { flashOverlay.style.opacity = '0'; }, 80);
    }, 230);
}

// ── BLAST SKIN: RIPPLE ────────────────────────────────────────────────────────
// Soft water-ripple effect: 5 thin translucent rings expanding slowly at varying speeds.
export function spawnRipple(x, y, color) {
    const config = [
        { delay: 0,   color: color,     width: 1.5, speed: 2.0, decay: 0.018, life: 0.70 },
        { delay: 80,  color: '#aaffee', width: 1.0, speed: 2.6, decay: 0.016, life: 0.55 },
        { delay: 160, color: color,     width: 1.2, speed: 3.2, decay: 0.015, life: 0.45 },
        { delay: 240, color: '#ffffff', width: 0.8, speed: 3.8, decay: 0.014, life: 0.35 },
        { delay: 320, color: color,     width: 0.7, speed: 4.4, decay: 0.013, life: 0.25 },
    ];
    config.forEach(c => {
        setTimeout(() => {
            rings.push({ x, y, r: 2, speed: c.speed, width: c.width, color: c.color, life: c.life, decay: c.decay });
        }, c.delay);
    });
    // No flash — purely gentle ripple with no impact
}

// ── BLAST SKIN: VOID IMPLOSION ────────────────────────────────────────────────
// Pure inward collapse — particles converge to vanish at center, no outward burst.
export function spawnVoidImplosion(x, y, color) {
    const pullCount = isMobile ? 10 : 20;
    const spread = 60;
    for (let i = 0; i < pullCount; i++) {
        const angle = (i / pullCount) * Math.PI * 2;
        const dist = spread * (0.5 + Math.random() * 0.5);
        const vel = 2.8 + Math.random() * 2;
        particles.push({
            x: x + Math.cos(angle) * dist,
            y: y + Math.sin(angle) * dist,
            vx: -Math.cos(angle) * vel,
            vy: -Math.sin(angle) * vel,
            size: 3 + Math.random() * 3,
            color: i % 3 === 0 ? '#ffffff' : (i % 3 === 1 ? color : '#330050'),
            life: 0.85,
            decay: 0.055
        });
    }
    // Faint dark flash to sell the collapse
    flashOverlay.style.backgroundColor = '#000000';
    flashOverlay.style.opacity = '0.30';
    setTimeout(() => { flashOverlay.style.opacity = '0'; }, 150);
}

// ── MEGA BLAST — auto-fires on 13+ orb chain reactions ───────────────────────
// Five escalating rings + double shake + massive particle burst from board center.
export function spawnMegaBlast(x, y, color) {
    // Phase 1: nuke-level white overload flash
    flashOverlay.style.backgroundColor = 'white';
    flashOverlay.style.opacity = '0.85';
    setTimeout(() => { flashOverlay.style.opacity = '0'; }, 200);

    // Phase 1b: immediate board shake
    triggerShake();

    // Phase 2: 5 staggered rings — bigger, faster, slower-decaying than shockwave
    const ringConfig = [
        { delay: 0,   color: '#ffffff', width: 5,   speed: 7,   decay: 0.020 },
        { delay: 60,  color: color,     width: 4,   speed: 9,   decay: 0.024 },
        { delay: 120, color: '#ffffff', width: 3,   speed: 11,  decay: 0.028 },
        { delay: 180, color: color,     width: 2,   speed: 13,  decay: 0.032 },
        { delay: 240, color: '#88eeff', width: 1.5, speed: 16,  decay: 0.038 },
    ];
    ringConfig.forEach(c => {
        setTimeout(() => {
            rings.push({ x, y, r: 6, speed: c.speed, width: c.width, color: c.color, life: 1.0, decay: c.decay });
        }, c.delay);
    });

    // Phase 3: massive particle burst — 40 desktop / 20 mobile
    const count = isMobile ? 20 : 40;
    const colors = [color, color, '#ffffff', '#ffffff', '#ffffff', '#88eeff', '#88eeff'];
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const vel = 6 + Math.random() * 8;
        particles.push({
            x, y,
            vx: Math.cos(angle) * vel,
            vy: Math.sin(angle) * vel,
            size: (isMobile ? 4 : 7) + Math.random() * 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 1.0,
            decay: 0.010 + Math.random() * 0.008
        });
    }

    // Phase 4: second shake 150ms later — double rumble for weight
    setTimeout(() => triggerShake(), 150);
}

// Victory screen handles Matrix, Cyber, and Magma
export function startCelebration() {
    const isCyber = document.body.classList.contains('theme-cyberpunk');
    const isMagma = document.body.classList.contains('theme-magma');
    let color = isCyber ? '#fcee0a' : (isMagma ? '#ff3300' : '#00ff41');

    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            spawnParticles(Math.random() * window.innerWidth, Math.random() * window.innerHeight, color); 
            if (isCyber && i % 10 === 0) triggerFlash('#00f0ff');
            if (isMagma && i % 8 === 0) triggerFlash('#ffaa00');
        }, i * 40);
    }
}