// js/analytics.js — events + crash reporting behind one tiny API
//
//   track("level_win", { level: 12, stars: 3 })
//
// Today: events are buffered in localStorage (last 500) and printed in dev, so the
// wiring can be tested without any account. To go live, set ONE of:
//   window.NeonAnalytics = { track(name, props), identify(id), error(err, ctx) }   (Capacitor shell / Firebase)
//   or fill POSTHOG_KEY below (works on the web build with no SDK download: plain fetch).
//
// Crash reporting: window.onerror + unhandledrejection are captured as "app_error"
// events with message, stack, url, user-agent, and the last 10 events as breadcrumbs.

const POSTHOG_KEY  = "";                         // e.g. "phc_xxx" — leave empty to disable
const POSTHOG_HOST = "https://us.i.posthog.com";
const BUFFER_KEY   = "neon_events";
const DEVICE_KEY   = "neon_device_id";
const MAX_BUFFER   = 500;

const deviceId = (() => {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) { id = "d_" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(DEVICE_KEY, id); }
  return id;
})();
const sessionId = "s_" + Date.now().toString(36);
const isDev = /localhost|127\.0\.0\.1/.test(location.hostname);
const breadcrumbs = [];
let userId = null;

function base() {
  return {
    device_id: deviceId, session_id: sessionId, user_id: userId,
    ts: Date.now(), url: location.pathname, ua: navigator.userAgent,
    screen: `${screen.width}x${screen.height}`, dpr: devicePixelRatio,
    standalone: matchMedia("(display-mode: standalone)").matches || navigator.standalone === true,
    online: navigator.onLine, lang: navigator.language,
    app: window.Capacitor ? "capacitor" : "web",
  };
}

function buffer(evt) {
  try {
    const arr = JSON.parse(localStorage.getItem(BUFFER_KEY) || "[]");
    arr.push(evt);
    if (arr.length > MAX_BUFFER) arr.splice(0, arr.length - MAX_BUFFER);
    localStorage.setItem(BUFFER_KEY, JSON.stringify(arr));
  } catch {}
}

async function sendPostHog(name, props) {
  if (!POSTHOG_KEY) return;
  try {
    const body = JSON.stringify({ api_key: POSTHOG_KEY, event: name, distinct_id: userId || deviceId, properties: { ...props, $lib: "neon" }, timestamp: new Date().toISOString() });
    if (navigator.sendBeacon) navigator.sendBeacon(`${POSTHOG_HOST}/capture/`, new Blob([body], { type: "application/json" }));
    else fetch(`${POSTHOG_HOST}/capture/`, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
  } catch {}
}

export function identify(id) { userId = id || null; window.NeonAnalytics?.identify?.(id); }

export function track(name, props = {}) {
  const evt = { name, ...props, ...base() };
  breadcrumbs.push({ name, ts: evt.ts, ...props }); if (breadcrumbs.length > 10) breadcrumbs.shift();
  buffer(evt);
  if (isDev) console.debug("[track]", name, props);
  if (window.NeonAnalytics?.track) { try { window.NeonAnalytics.track(name, evt); } catch {} }
  else sendPostHog(name, evt);
}

export function reportError(err, ctx = {}) {
  const e = err instanceof Error ? err : new Error(String(err));
  const payload = { message: e.message, stack: (e.stack || "").slice(0, 2000), breadcrumbs: [...breadcrumbs], ...ctx };
  track("app_error", payload);
  window.NeonAnalytics?.error?.(e, payload);
  if (isDev) console.error("[crash]", e, ctx);
}

// Global capture
window.addEventListener("error", ev => reportError(ev.error || ev.message, { src: ev.filename, line: ev.lineno, col: ev.colno }));
window.addEventListener("unhandledrejection", ev => reportError(ev.reason || "unhandled rejection"));

// Session lifecycle
let sessionStart = Date.now();
track("session_start", { referrer: document.referrer || null });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) track("session_pause", { seconds: Math.round((Date.now() - sessionStart) / 1000) });
  else { sessionStart = Date.now(); track("session_resume"); }
});

/** Dev helper: dump buffered events (window.neonEvents() in the console). */
window.neonEvents = () => JSON.parse(localStorage.getItem(BUFFER_KEY) || "[]");

// Timing helper for funnels: const t = timer(); ... track("x", { ms: t() })
export function timer() { const s = performance.now(); return () => Math.round(performance.now() - s); }
