// js/premium.js — entitlements (Premium subscription) + billing hook points
//
// The game asks ONE question everywhere: isPremium(). Where that answer comes from:
//   • Web / dev builds : a mock flag in localStorage (Settings → Game → "Premium (test)").
//   • Android build    : window.NeonBilling is provided by the Capacitor shell
//                        (RevenueCat on top of Google Play Billing) and overrides the mock.
// Nothing in localStorage is trusted on Android — the shell's answer wins.
//
// Free tier  : default theme, Classic orb, Classic blast. Orb skins stay coin-buyable (hybrid).
// Premium    : every theme, every orb skin, every blast skin, no ads, +1 streak shield/week (later).

const MOCK_KEY = "neon_premium_mock";
const OWNED_KEY = "neon_owned_skins";

export const FREE_THEMES      = ["default"];
export const FREE_ORB_SKINS   = ["default"];
export const FREE_BLAST_SKINS = ["default"];

export const PREMIUM_BENEFITS = [
  { icon: "🎨", text: "All 12 visual themes" },
  { icon: "🔮", text: "Every orb & blast skin" },
  { icon: "🚫", text: "No ads — hints & skips without watching" },
  { icon: "🛡️", text: "Streak shield: miss a day, keep your streak" },
];

// ── Billing adapter ───────────────────────────────────────────────────────────
// Default (web/dev) implementation. The Android shell replaces window.NeonBilling
// BEFORE game.js runs with an object of the same shape backed by RevenueCat.
const mockBilling = {
  isMock: true,
  async getStatus()      { return { active: TESTING_DEFAULT_PREMIUM ? localStorage.getItem(MOCK_KEY) !== "0" : localStorage.getItem(MOCK_KEY) === "1", plan: "mock" }; },
  async purchase(plan)   { localStorage.setItem(MOCK_KEY, "1"); return { ok: true, plan }; },
  async restore()        { return { ok: TESTING_DEFAULT_PREMIUM ? localStorage.getItem(MOCK_KEY) !== "0" : localStorage.getItem(MOCK_KEY) === "1" }; },
  async getOfferings()   { return [
    { id: "monthly", title: "Monthly", price: "[PRICE]/month" },
    { id: "yearly",  title: "Yearly",  price: "[PRICE]/year", badge: "Best value" },
  ]; },
};
function billing() { return window.NeonBilling || mockBilling; }

// ── Cached entitlement ────────────────────────────────────────────────────────
// ── TESTING PHASE ─────────────────────────────────────────────────────────────
// Premium defaults to ON so every theme/skin is open while testing.
// BEFORE RELEASE: flip TESTING_DEFAULT_PREMIUM to false (locks return; the dev
// toggle in Settings → Game still works for QA).
const TESTING_DEFAULT_PREMIUM = true;
let _premium = TESTING_DEFAULT_PREMIUM ? localStorage.getItem(MOCK_KEY) !== "0"
                                       : localStorage.getItem(MOCK_KEY) === "1";
const listeners = new Set();

export function isPremium() { return _premium; }

export function onEntitlementChange(cb) { listeners.add(cb); return () => listeners.delete(cb); }

function setPremium(v) {
  const changed = _premium !== !!v;
  _premium = !!v;
  if (changed) listeners.forEach(cb => { try { cb(_premium); } catch (e) { console.warn(e); } });
}

/** Ask the billing layer for the truth (call on boot and on app resume). */
export async function refreshEntitlement() {
  try {
    const s = await billing().getStatus();
    setPremium(!!s.active);
  } catch (e) {
    console.warn("entitlement check failed", e);
  }
  return _premium;
}

export async function purchasePremium(plan = "monthly") {
  const r = await billing().purchase(plan);
  if (r?.ok) setPremium(true);
  return r;
}

export async function restorePurchases() {
  const r = await billing().restore();
  setPremium(!!r?.ok);
  return r;
}

export function getOfferings() { return billing().getOfferings(); }
export function isMockBilling() { return !!billing().isMock; }

/** Dev-only: flip the mock flag (no effect when the native shell is present). */
export function setMockPremium(v) {
  if (!isMockBilling()) return false;
  localStorage.setItem(MOCK_KEY, v ? "1" : "0");
  setPremium(v);
  return true;
}

// ── Ownership (coin purchases persist here) ───────────────────────────────────
export function getOwnedSkins() {
  try { return JSON.parse(localStorage.getItem(OWNED_KEY) || "[]"); } catch { return []; }
}
export function addOwnedSkin(id) {
  const o = getOwnedSkins();
  if (!o.includes(id)) { o.push(id); localStorage.setItem(OWNED_KEY, JSON.stringify(o)); }
}

// ── Gates ─────────────────────────────────────────────────────────────────────
export function canUseTheme(id)     { return _premium || FREE_THEMES.includes(id || "default"); }
export function canUseOrbSkin(id)   { return _premium || FREE_ORB_SKINS.includes(id || "default") || getOwnedSkins().includes(id); }
export function canUseBlastSkin(id) { return _premium || FREE_BLAST_SKINS.includes(id || "default"); }
