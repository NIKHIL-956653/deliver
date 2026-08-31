// js/online.js — 🧪 VIRTUAL PVP · TESTING PHASE 1
// ═══════════════════════════════════════════════════════════════════════════
// TEST-ONLY online rooms: create a room → share the 6-digit code → friends
// join from laptop or phone → live 2–4 player match. REMOVE BEFORE RELEASE
// (delete this file, the #vpvp* HTML block, and the online hooks in game.js).
//
// Transport:
//   • Supabase Realtime (free tier) when leaderboard-config.js is filled in —
//     works across the internet, laptops + phones.
//   • LocalTransport (BroadcastChannel) fallback when not configured —
//     works between tabs on ONE device, used for automated testing.
//
// Protocol (broadcast events on channel "ncr-room-<code>"):
//   hello/bye/ping  presence (local transport only; Supabase uses built-in presence)
//   start           host → everyone: { players[{name,color}], rows, cols }
//   move            player → everyone (incl. self): { seq, slot, x, y }
//   left            someone left mid-match → match ends for everyone
// Moves apply ONLY from the channel (self-delivery on), so every screen applies
// them in the same order. A seq gap = missed message → match ends with a note
// (phase 1 keeps it simple: no state resync).
// ═══════════════════════════════════════════════════════════════════════════

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./leaderboard-config.js";
import { track } from "./analytics.js";

const SLOT_COLORS = ["#ff4757", "#2ed573", "#3742fa", "#ffa502"];
const MAX_PLAYERS = 4;
const clientId = "c_" + Math.random().toString(36).slice(2, 10);

const CONFIGURED = !!SUPABASE_URL && !SUPABASE_URL.includes("YOUR_PROJECT");

// ── Transports ───────────────────────────────────────────────────────────────
class LocalTransport {
  constructor(code) {
    this.bc = new BroadcastChannel("ncr-room-" + code);
    this.handlers = {};
    this.roster = new Map();           // clientId → { meta, joinedAt, lastSeen }
    this.rosterCb = null;
    this.bc.onmessage = ({ data }) => this._recv(data);
    this._hb = setInterval(() => {
      if (this.meta) this._emit("hello", { meta: this.meta, joinedAt: this.joinedAt });
      const now = Date.now();
      let changed = false;
      for (const [id, m] of this.roster) if (now - m.lastSeen > 7000) { this.roster.delete(id); changed = true; }
      if (changed) this._notifyRoster();
    }, 2000);
  }
  _emit(type, payload) {
    const msg = { type, payload, from: clientId };
    this.bc.postMessage(msg);
    queueMicrotask(() => this._recv(msg));         // self-delivery, like Supabase self:true
  }
  _recv(msg) {
    if (msg.type === "hello") {
      const known = this.roster.get(msg.from);
      this.roster.set(msg.from, { meta: msg.payload.meta, joinedAt: msg.payload.joinedAt, lastSeen: Date.now() });
      if (!known) { this._notifyRoster(); if (this.meta) this._emit("hello", { meta: this.meta, joinedAt: this.joinedAt }); }
      return;
    }
    if (msg.type === "bye") { if (this.roster.delete(msg.from)) this._notifyRoster(); return; }
    this.handlers[msg.type]?.(msg.payload, msg.from);
  }
  _notifyRoster() {
    const list = [...this.roster.entries()]
      .map(([id, m]) => ({ id, ...m.meta, joinedAt: m.joinedAt }))
      .sort((a, b) => a.joinedAt - b.joinedAt);
    this.rosterCb?.(list);
  }
  async join(meta) {
    this.meta = meta; this.joinedAt = Date.now();
    this._emit("hello", { meta, joinedAt: this.joinedAt });
  }
  send(type, payload) { this._emit(type, payload); }
  on(type, cb) { this.handlers[type] = cb; }
  onRoster(cb) { this.rosterCb = cb; }
  async leave() { this._emit("bye", {}); clearInterval(this._hb); this.bc.close(); }
}

class SupabaseTransport {
  constructor(code) { this.code = code; this.handlers = {}; this.rosterCb = null; }
  async _client() {
    if (!window.__ncrSupabase) {
      if (!window.supabase) {                     // lazy-load the local UMD bundle (208 KB)
        await new Promise((res, rej) => {
          const sc = document.createElement("script");
          sc.src = "js/lib/supabase.min.js";
          sc.onload = res;
          sc.onerror = () => rej(new Error("couldn't load network library"));
          document.head.appendChild(sc);
        });
      }
      window.__ncrSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return window.__ncrSupabase;
  }
  async join(meta) {
    const sb = await this._client();
    this.channel = sb.channel("ncr-room-" + this.code, {
      config: { broadcast: { self: true }, presence: { key: clientId } },
    });
    this.channel.on("presence", { event: "sync" }, () => {
      const state = this.channel.presenceState();
      const list = Object.entries(state)
        .map(([id, metas]) => ({ id, ...metas[0] }))
        .sort((a, b) => a.joinedAt - b.joinedAt);
      this.rosterCb?.(list);
    });
    this.channel.on("broadcast", { event: "*" }, ({ event, payload }) => {
      this.handlers[event]?.(payload.data, payload.from);
    });
    await new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error("connection timed out")), 10000);
      this.channel.subscribe(async status => {
        if (status === "SUBSCRIBED") {
          clearTimeout(to);
          await this.channel.track({ ...meta, joinedAt: Date.now() });
          res();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(to); rej(new Error(status));
        }
      });
    });
  }
  send(type, payload) {
    this.channel?.send({ type: "broadcast", event: type, payload: { data: payload, from: clientId } });
  }
  on(type, cb) { this.handlers[type] = cb; }
  onRoster(cb) { this.rosterCb = cb; }
  async leave() { try { await this.channel?.untrack(); await this.channel?.unsubscribe(); } catch {} this.channel = null; }
}

// ── Room state ───────────────────────────────────────────────────────────────
let hooks = null;          // injected by game.js
let transport = null;
let roomCode = null;
let isHost = false;
let roster = [];           // [{id, name, joinedAt}]
let inMatch = false;
let mySlot = -1;
let sendSeq = 0, recvSeq = 0;
let myName = "";
let gridChoice = "6x6";
let matchIds = [];         // client ids locked in at match start

// Closing the tab / navigating away tells the room immediately.
window.addEventListener("pagehide", () => onlineLeave());

export function onlineActive() { return inMatch; }
export function onlineMySlot() { return mySlot; }

export function onlineSendMove(x, y) {
  transport?.send("move", { seq: ++sendSeq, slot: mySlot, x, y });
}

export function onlineLeave() {
  if (!transport) return;
  const t = transport;
  transport = null;
  if (inMatch) t.send("left", { name: myName });
  t.leave();
  inMatch = false; mySlot = -1; roomCode = null; isHost = false; roster = [];
  sendSeq = 0; recvSeq = 0;
  hide(ui.modal);
}

// ── UI ───────────────────────────────────────────────────────────────────────
const ui = {};
const show = el => { if (el) el.style.display = ""; };
const hide = el => { if (el) el.style.display = "none"; };

export function initOnline(gameHooks) {
  hooks = gameHooks;
  ui.modal = document.getElementById("vpvpModal");
  ui.entry = document.getElementById("vpvpEntry");
  ui.lobby = document.getElementById("vpvpLobby");
  ui.name = document.getElementById("vpvpName");
  ui.code = document.getElementById("vpvpCode");
  ui.status = document.getElementById("vpvpStatus");
  ui.roomCode = document.getElementById("vpvpRoomCode");
  ui.players = document.getElementById("vpvpPlayers");
  ui.hostRow = document.getElementById("vpvpHostRow");
  ui.startBtn = document.getElementById("vpvpStartBtn");
  ui.waitNote = document.getElementById("vpvpWaitNote");
  ui.modeNote = document.getElementById("vpvpModeNote");

  ui.name.value = localStorage.getItem("neon_vpvp_name") || "";

  document.getElementById("vpvpBtn")?.addEventListener("click", () => {
    show(ui.modal); ui.modal.style.display = "flex";
    show(ui.entry); hide(ui.lobby); setStatus("");
    ui.modeNote.textContent = CONFIGURED
      ? "🌐 Online — share the code with friends anywhere"
      : "⚠️ LOCAL TEST MODE — no server configured yet, rooms only work between tabs on THIS device";
  });
  document.getElementById("vpvpCloseBtn")?.addEventListener("click", () => { onlineLeave(); hide(ui.modal); });
  document.getElementById("vpvpCreateBtn")?.addEventListener("click", () => enterRoom(null));
  document.getElementById("vpvpJoinBtn")?.addEventListener("click", () => {
    const code = ui.code.value.replace(/\D/g, "");
    if (code.length !== 6) { setStatus("Enter the 6-digit room code"); return; }
    enterRoom(code);
  });
  ui.startBtn?.addEventListener("click", hostStart);
  document.querySelectorAll("#vpvpHostRow .chip[data-vgrid]").forEach(ch =>
    ch.addEventListener("click", () => {
      gridChoice = ch.dataset.vgrid;
      document.querySelectorAll("#vpvpHostRow .chip[data-vgrid]").forEach(c => c.classList.toggle("selected", c === ch));
    }));
}

function setStatus(msg, color) {
  if (ui.status) { ui.status.textContent = msg; ui.status.style.color = color || "#8892a6"; }
}

async function enterRoom(code) {
  myName = (ui.name.value || "").trim().slice(0, 12) || "Player";
  localStorage.setItem("neon_vpvp_name", myName);
  isHost = !code;
  roomCode = code || String(Math.floor(100000 + Math.random() * 900000));
  setStatus(isHost ? "Creating room…" : "Joining room…");
  transport = CONFIGURED ? new SupabaseTransport(roomCode) : new LocalTransport(roomCode);
  wireTransport();
  try {
    await transport.join({ name: myName });
  } catch (e) {
    setStatus("Couldn't connect: " + e.message, "#ff4757");
    transport = null;
    return;
  }
  track("vpvp_room", { host: isHost, transport: CONFIGURED ? "supabase" : "local" });
  hide(ui.entry); show(ui.lobby);
  ui.roomCode.textContent = roomCode.slice(0, 3) + "-" + roomCode.slice(3);
  ui.hostRow.style.display = isHost ? "" : "none";
  ui.waitNote.style.display = isHost ? "none" : "";
  setStatus("");
  renderLobby();
}

function wireTransport() {
  transport.onRoster(list => {
    roster = list.slice(0, MAX_PLAYERS);
    if (!inMatch) { renderLobby(); return; }
    // Mid-match disconnect (closed tab, lost connection): presence shrinks → end match.
    const gone = matchIds.filter(id => !list.some(p => p.id === id));
    if (gone.length) endWithNote("👋 A player disconnected — match ended.");
  });
  transport.on("start", payload => {
    // Everyone (host included, via self-delivery) starts from the same payload.
    const slot = payload.order.indexOf(clientId);
    if (slot === -1) { setStatus("Room is full — match started without you", "#ff4757"); return; }
    mySlot = slot;
    inMatch = true;
    matchIds = payload.order.slice();
    sendSeq = 0; recvSeq = 0;
    hide(ui.modal);
    hooks.startMatch({ players: payload.players, rows: payload.rows, cols: payload.cols, mySlot });
  });
  transport.on("move", m => {
    if (!inMatch) return;
    if (m.seq !== recvSeq + 1) {                     // missed a message → phase-1 bail-out
      endWithNote("⚠️ Connection hiccup — the boards went out of sync. Please make a new room.");
      return;
    }
    recvSeq = m.seq;
    if (m.slot !== mySlot) sendSeq = m.seq;          // keep everyone's next seq aligned
    hooks.applyRemoteMove(m.x, m.y, m.slot);
  });
  transport.on("left", p => {
    if (inMatch) endWithNote(`👋 ${p?.name || "A player"} left — match ended.`);
  });
}

function endWithNote(msg) {
  inMatch = false;
  hooks.endMatch(msg);
  onlineLeave();
}

function renderLobby() {
  if (!ui.players) return;
  ui.players.innerHTML = "";
  roster.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "vpvp-player";
    row.innerHTML = `<span class="vpvp-dot" style="background:${SLOT_COLORS[i]}"></span>
      <span>${p.name || "Player"}${p.id === clientId ? " (you)" : ""}${i === 0 ? " · host" : ""}</span>`;
    ui.players.appendChild(row);
  });
  if (ui.startBtn) ui.startBtn.disabled = roster.length < 2;
  if (isHost) setStatus(roster.length < 2 ? "Waiting for friends to join…" : `${roster.length} players ready`);
}

function hostStart() {
  if (roster.length < 2) return;
  const [c, r] = gridChoice.split("x").map(Number);
  transport.send("start", {
    order: roster.map(p => p.id),
    players: roster.map((p, i) => ({ name: p.name || "Player", color: SLOT_COLORS[i] })),
    cols: c, rows: r,
  });
}
