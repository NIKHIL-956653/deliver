// js/boardeditor.js — paint-your-own board.
//
// The player gets an empty canvas and three tools: lay playable cells, drop
// blocked obstacles, or erase back to nothing. Anything left unpainted is a
// hole — not part of the board at all. Up to MAX_SLOTS designs are kept, Clash
// of Clans style, so a design is a possession rather than a throwaway.
//
// Layout format (compact, and ready to become a share code later):
//   { id, name, cols, rows, cells: "01201..." }   0 = hole, 1 = playable, 2 = blocked
//
// Legality is enforced before a design can be played: enough room, and every
// playable cell reachable from every other — an island nobody can reach would
// let a player hide forever and the match would never end.

const KEY = "neon_custom_boards";
export const MAX_SLOTS = 4;
export const MAX_COLS = 12;
export const MAX_ROWS = 16;
const MIN_PLAYABLE = 12;

export const HOLE = 0, PLAY = 1, BLOCK = 2;

// ── storage ───────────────────────────────────────────────────────────────────
export function getBoards() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]").slice(0, MAX_SLOTS); }
  catch { return []; }
}
function putBoards(list) { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_SLOTS))); }

export function saveBoard(layout) {
  const list = getBoards();
  const i = list.findIndex(b => b.id === layout.id);
  if (i >= 0) list[i] = layout;
  else {
    if (list.length >= MAX_SLOTS) return { ok: false, error: `All ${MAX_SLOTS} slots are full — delete one first.` };
    list.push(layout);
  }
  putBoards(list);
  return { ok: true };
}
export function deleteBoard(id) { putBoards(getBoards().filter(b => b.id !== id)); }

// ── validation ────────────────────────────────────────────────────────────────
export function validate(layout) {
  const { cols, rows, cells } = layout;
  const at = (x, y) => cells[y * cols + x] | 0;
  const playable = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (at(x, y) === PLAY) playable.push([x, y]);
  if (playable.length < MIN_PLAYABLE) return { ok: false, error: `Needs at least ${MIN_PLAYABLE} playable cells — you have ${playable.length}.` };

  // every playable cell must be reachable from the first one
  const seen = new Set([playable[0][0] + "," + playable[0][1]]);
  const q = [playable[0]];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (at(nx, ny) !== PLAY) continue;
      const k = nx + "," + ny;
      if (seen.has(k)) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  if (seen.size !== playable.length)
    return { ok: false, error: "Some cells are cut off from the rest — every part of the board must connect." };

  // a cell with no playable neighbour can never explode
  for (const [x, y] of playable) {
    let n = 0;
    for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])
      if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && at(nx, ny) === PLAY) n++;
    if (n === 0) return { ok: false, error: "A lone cell has no neighbours — it could never explode." };
  }
  return { ok: true, playable: playable.length };
}

/** Max players this design can seat — each needs elbow room to be a real game. */
export function seats(layout) {
  const v = validate(layout);
  if (!v.ok) return 0;
  return Math.max(2, Math.min(8, Math.floor(v.playable / 9)));
}

// ── editor UI ─────────────────────────────────────────────────────────────────
let onPlayCb = null;
let cur = null;              // { id, name, cols, rows, grid: Uint8Array }
let tool = PLAY;
let painting = false;
const el = {};

const blank = (cols, rows) => ({ id: "cb_" + Date.now().toString(36), name: "", cols, rows, grid: new Uint8Array(cols * rows) });

function toLayout(c) { return { id: c.id, name: c.name || "My Board", cols: c.cols, rows: c.rows, cells: Array.from(c.grid).join("") }; }
function fromLayout(l) {
  const g = new Uint8Array(l.cols * l.rows);
  for (let i = 0; i < g.length; i++) g[i] = (l.cells[i] | 0) || 0;
  return { id: l.id, name: l.name, cols: l.cols, rows: l.rows, grid: g };
}

export function initBoardEditor({ onPlay }) {
  onPlayCb = onPlay;
  el.screen = document.getElementById("boardEditor");
  el.grid = document.getElementById("beGrid");
  el.name = document.getElementById("beName");
  el.status = document.getElementById("beStatus");
  el.cols = document.getElementById("beCols");
  el.rows = document.getElementById("beRows");
  el.list = document.getElementById("beList");
  el.listWrap = document.getElementById("beListWrap");
  el.editWrap = document.getElementById("beEditWrap");
  if (!el.screen) return;

  document.getElementById("customBoardBtn")?.addEventListener("click", openList);
  document.getElementById("beBackBtn")?.addEventListener("click", () => {
    if (el.editWrap.style.display !== "none") openList();
    else closeEditor();
  });
  document.getElementById("beNewBtn")?.addEventListener("click", () => openEditor(null));
  document.getElementById("beSaveBtn")?.addEventListener("click", doSave);
  document.getElementById("bePlayBtn")?.addEventListener("click", doPlay);
  document.getElementById("beClearBtn")?.addEventListener("click", () => { cur.grid.fill(HOLE); renderGrid(); });
  document.getElementById("beFillBtn")?.addEventListener("click", () => { cur.grid.fill(PLAY); renderGrid(); });

  document.querySelectorAll("#beTools .be-tool").forEach(t =>
    t.addEventListener("click", () => {
      tool = Number(t.dataset.tool);
      document.querySelectorAll("#beTools .be-tool").forEach(o => o.classList.toggle("active", o === t));
    }));

  el.cols?.addEventListener("change", () => resize(Number(el.cols.value), cur.rows));
  el.rows?.addEventListener("change", () => resize(cur.cols, Number(el.rows.value)));

  // drag painting
  el.grid.addEventListener("pointerdown", e => {
    const i = cellIndexFrom(e); if (i < 0) return;
    painting = true;
    paint(i);                                   // paint first — capture is a nicety
    try { el.grid.setPointerCapture?.(e.pointerId); } catch {}
    e.preventDefault();
  });
  el.grid.addEventListener("pointermove", e => { if (painting) { const i = cellIndexFrom(e); if (i >= 0) paint(i); } });
  const stop = () => { painting = false; };
  el.grid.addEventListener("pointerup", stop);
  el.grid.addEventListener("pointercancel", stop);
  el.grid.addEventListener("pointerleave", stop);
}

function cellIndexFrom(e) {
  const t = document.elementFromPoint(e.clientX, e.clientY);
  return t && t.dataset && t.dataset.i !== undefined ? Number(t.dataset.i) : -1;
}

function paint(i) {
  if (cur.grid[i] === tool) return;
  cur.grid[i] = tool;
  const node = el.grid.children[i];
  if (node) node.className = "be-cell " + ["hole", "play", "block"][tool];
  updateStatus();
}

function resize(cols, rows) {
  cols = Math.max(4, Math.min(MAX_COLS, cols || 4));
  rows = Math.max(4, Math.min(MAX_ROWS, rows || 4));
  const g = new Uint8Array(cols * rows);
  for (let y = 0; y < Math.min(rows, cur.rows); y++)
    for (let x = 0; x < Math.min(cols, cur.cols); x++)
      g[y * cols + x] = cur.grid[y * cur.cols + x];
  cur.cols = cols; cur.rows = rows; cur.grid = g;
  el.cols.value = cols; el.rows.value = rows;
  renderGrid();
}

function renderGrid() {
  el.grid.style.gridTemplateColumns = `repeat(${cur.cols}, 1fr)`;
  el.grid.style.maxWidth = Math.min(92, cur.cols * 7.2) + "vw";
  el.grid.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (let i = 0; i < cur.grid.length; i++) {
    const d = document.createElement("div");
    d.className = "be-cell " + ["hole", "play", "block"][cur.grid[i]];
    d.dataset.i = i;
    frag.appendChild(d);
  }
  el.grid.appendChild(frag);
  updateStatus();
}

function updateStatus() {
  const l = toLayout(cur);
  const v = validate(l);
  const n = Array.from(cur.grid).filter(g => g === PLAY).length;
  el.status.textContent = v.ok ? `${n} cells · up to ${seats(l)} players` : v.error;
  el.status.style.color = v.ok ? "#2ed573" : "#ffa502";
  document.getElementById("bePlayBtn").disabled = !v.ok;
}

function openList() {
  el.screen.style.display = "flex";
  el.listWrap.style.display = "";
  el.editWrap.style.display = "none";
  const boards = getBoards();
  el.list.innerHTML = "";
  if (!boards.length) {
    el.list.innerHTML = '<p class="be-empty">No boards yet — tap “+ New board” and paint one.</p>';
  }
  boards.forEach(l => {
    const row = document.createElement("div");
    row.className = "be-row";
    const v = validate(l);
    row.innerHTML = `<div class="be-row-info"><strong>${l.name}</strong>
      <span>${l.cols}×${l.rows} · ${v.ok ? `${v.playable} cells · up to ${seats(l)} players` : "needs fixing"}</span></div>`;
    const acts = document.createElement("div");
    acts.className = "be-row-acts";
    const play = document.createElement("button");
    play.className = "modal-btn primary"; play.textContent = "▶"; play.disabled = !v.ok;
    play.onclick = () => { closeEditor(); onPlayCb?.(l); };
    const edit = document.createElement("button");
    edit.className = "modal-btn secondary"; edit.textContent = "✎";
    edit.onclick = () => openEditor(l);
    const del = document.createElement("button");
    del.className = "modal-btn secondary"; del.textContent = "🗑";
    del.onclick = () => { deleteBoard(l.id); openList(); };
    acts.append(play, edit, del);
    row.appendChild(acts);
    el.list.appendChild(row);
  });
  const newBtn = document.getElementById("beNewBtn");
  if (newBtn) newBtn.disabled = boards.length >= MAX_SLOTS;
  document.getElementById("beSlots").textContent = `${boards.length} / ${MAX_SLOTS} slots used`;
}

function openEditor(layout) {
  cur = layout ? fromLayout(layout) : blank(8, 10);
  tool = PLAY;
  document.querySelectorAll("#beTools .be-tool").forEach(o => o.classList.toggle("active", Number(o.dataset.tool) === PLAY));
  el.listWrap.style.display = "none";
  el.editWrap.style.display = "";
  el.name.value = cur.name || "";
  el.cols.value = cur.cols; el.rows.value = cur.rows;
  renderGrid();
}

function closeEditor() { el.screen.style.display = "none"; }

function doSave() {
  cur.name = (el.name.value || "").trim().slice(0, 18) || "My Board";
  const r = saveBoard(toLayout(cur));
  if (!r.ok) { el.status.textContent = r.error; el.status.style.color = "#ff4757"; return; }
  openList();
}

function doPlay() {
  const l = toLayout(cur);
  if (!validate(l).ok) return;
  cur.name = (el.name.value || "").trim().slice(0, 18) || "My Board";
  saveBoard(toLayout(cur));
  closeEditor();
  onPlayCb?.(toLayout(cur));
}
