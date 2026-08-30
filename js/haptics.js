// js/haptics.js — one call, works everywhere
//   Web / PWA  : navigator.vibrate (Android Chrome; iOS Safari has no vibrate API)
//   Capacitor  : @capacitor/haptics when the shell exposes it (gives iOS real haptics)
// Respects a user toggle (Settings → Game → Haptics) stored in localStorage.

const KEY = "neon_haptics";
let enabled = localStorage.getItem(KEY) !== "0";
let lastAt = 0, lastName = "";

const cap = () => window.Capacitor?.Plugins?.Haptics || null;

// name → [vibrate pattern (ms), capacitor impact style]
const PATTERNS = {
  tap:     [[8],                 "LIGHT"],
  place:   [[12],                "MEDIUM"],
  explode: [[18],                "MEDIUM"],   // scaled per wave below
  chain:   [[25, 30, 35],        "HEAVY"],
  mega:    [[40, 40, 70, 40, 110], "HEAVY"],
  star:    [[25],                "MEDIUM"],
  win:     [[40, 60, 40, 60, 140], "HEAVY"],
  lose:    [[80],                "HEAVY"],
  error:   [[15, 40, 15],        "LIGHT"],
};

export function hapticsEnabled() { return enabled; }
export function setHaptics(on) { enabled = !!on; localStorage.setItem(KEY, enabled ? "1" : "0"); if (enabled) haptic("tap"); return enabled; }
export function hapticsSupported() { return !!(cap() || navigator.vibrate); }

/**
 * haptic(name, intensity?)  intensity 0..1 scales the vibrate length (used for explosion waves)
 */
export function haptic(name = "tap", intensity = 1) {
  if (!enabled) return;
  const now = performance.now();
  if (now - lastAt < 30 && name === lastName) return;   // don't spam the motor with the same cue
  lastAt = now; lastName = name;

  const [pattern, style] = PATTERNS[name] || PATTERNS.tap;
  const h = cap();
  if (h) {
    try {
      if (pattern.length > 1) h.vibrate({ duration: pattern.reduce((a, b) => a + b, 0) });
      else h.impact({ style });
    } catch {}
    return;
  }
  if (navigator.vibrate) {
    const scaled = pattern.length === 1 ? [Math.round(pattern[0] * (0.6 + 0.8 * intensity))] : pattern;
    try { navigator.vibrate(scaled); } catch {}
  }
}
