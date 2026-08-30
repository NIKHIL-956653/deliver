// js/sound.js — Web Audio sound engine
//
// v1 cloned an <audio> element for every explosion. A 20-wave chain could spawn
// 60+ media elements in a second, which is the #1 cause of stutter on phones.
// v2 decodes each file ONCE into an AudioBuffer and plays cheap BufferSources,
// with a per-sound throttle so a chain never fires the explode sound more than
// ~14×/second. Falls back to HTMLAudio where Web Audio is unavailable.

const FILES = {
  click:   "sounds/click.mp3",
  explode: "sounds/explode.mp3",
  win:     "sounds/win.mp3",
};
const VOLUME   = { click: 0.5, explode: 0.45, win: 0.6 };
const THROTTLE = { click: 40, explode: 70, win: 500 };   // ms between plays of the same sound

let isMuted = false;
let ctx = null, master = null;
const buffers = {};
const lastPlay = {};
const fallback = {};

function getCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);
  return ctx;
}

async function load(name) {
  const c = getCtx();
  if (!c) return;
  try {
    const res = await fetch(FILES[name]);
    const arr = await res.arrayBuffer();
    buffers[name] = await c.decodeAudioData(arr);
  } catch (e) {
    // decode failed (missing file, unsupported codec) → HTMLAudio fallback for this sound
    fallback[name] = new Audio(FILES[name]);
    fallback[name].volume = VOLUME[name] ?? 0.5;
  }
}

// Browsers require a user gesture before audio can start: unlock on first touch/click.
function unlock() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume();
  Object.keys(FILES).forEach(n => { if (!buffers[n] && !fallback[n]) load(n); });
  window.removeEventListener("pointerdown", unlock);
  window.removeEventListener("keydown", unlock);
}
window.addEventListener("pointerdown", unlock, { passive: true });
window.addEventListener("keydown", unlock);
// Pre-decode as early as allowed (context may stay suspended until the gesture; that's fine)
if (getCtx()) Object.keys(FILES).forEach(load);

export function toggleMute() {
  isMuted = !isMuted;
  if (master) master.gain.value = isMuted ? 0 : 1;
  return isMuted;
}

export function playSound(name) {
  if (isMuted) return;
  const now = performance.now();
  if (now - (lastPlay[name] || 0) < (THROTTLE[name] || 0)) return;
  lastPlay[name] = now;

  const buf = buffers[name];
  if (buf && ctx) {
    if (ctx.state === "suspended") ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = VOLUME[name] ?? 0.5;
    src.connect(g); g.connect(master);
    src.start();
    return;
  }
  const fb = fallback[name];
  if (fb) { const c = fb.cloneNode(); c.volume = fb.volume; c.play().catch(() => {}); }
}
