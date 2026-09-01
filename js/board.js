/* js/board.js - Hybrid Engine (Orbs -> Bombs) */

const el = (t, c, attrs = {}) => {
  const n = document.createElement(t);
  if (c) n.className = c;
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

// CAPACITY LOGIC
// A cell explodes when it holds as many orbs as it has NEIGHBOURS. Pass the
// board and it counts real ones, so blocked squares and custom board shapes
// behave correctly (previously it guessed from the rectangle, which meant a
// cell beside a blocked square needed 4 orbs but had only 3 places to send
// them — one orb vanished every explosion). On a plain rectangular board the
// two paths give identical numbers, so normal play is unchanged.
export const capacity = (x, y, rows, cols, board) => {
  if (board) {
    let n = 0;
    if (x > 0        && board[y][x - 1] && !board[y][x - 1].isBlocked) n++;
    if (x < cols - 1 && board[y][x + 1] && !board[y][x + 1].isBlocked) n++;
    if (y > 0        && board[y - 1][x] && !board[y - 1][x].isBlocked) n++;
    if (y < rows - 1 && board[y + 1][x] && !board[y + 1][x].isBlocked) n++;
    return n === 0 ? 99 : n;         // isolated cell can never fire (editor prevents these)
  }
  const edges = (y === 0) + (y === rows - 1) + (x === 0) + (x === cols - 1);
  return edges === 2 ? 2 : edges === 1 ? 3 : 4;
};

// NEIGHBORS (Wall Aware)
export const neighbors = (x, y, rows, cols, board) => {
  const n = [];
  const potential = [];
  if (x > 0) potential.push([x - 1, y]);
  if (x < cols - 1) potential.push([x + 1, y]);
  if (y > 0) potential.push([x, y - 1]);
  if (y < rows - 1) potential.push([x, y + 1]);

  for (const [nx, ny] of potential) {
    if (board[ny] && board[ny][nx] && board[ny][nx].isBlocked === false) {
      n.push([nx, ny]);
    }
  }
  return n;
};

// Returns a pattern <rect> for colorblind mode inside SVG bombs
function makeCbPatternRect(playerIndex) {
  const ns = "http://www.w3.org/2000/svg";
  const rect = document.createElementNS(ns, "rect");
  rect.setAttribute("x", "15"); rect.setAttribute("y", "20");
  rect.setAttribute("width", "70"); rect.setAttribute("height", "70");
  rect.setAttribute("rx", "35"); rect.setAttribute("ry", "35");
  rect.setAttribute("fill", "none");
  rect.setAttribute("stroke", "rgba(0,0,0,0.45)");
  rect.setAttribute("stroke-width", "6");
  // Use different dash patterns per player
  const patterns = ["none","8 4","4 4","12 4 2 4","6 2 2 2"];
  rect.setAttribute("stroke-dasharray", patterns[playerIndex % patterns.length] || "none");
  return rect;
}

/**
 * BOMB SVG GENERATOR — built once, then cloned (cloneNode is ~5× cheaper than
 * five createElementNS calls per bomb during a big chain).
 */
let _bombTemplate = null;   // lazy: board.js is also imported by the AI worker (no DOM there)
function bombTemplate() {
  if (_bombTemplate) return _bombTemplate;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.classList.add("bombsvg");
  const fuse = document.createElementNS(ns, "path");
  fuse.setAttribute("d", "M 50 20 Q 50 10 65 10");
  fuse.setAttribute("stroke", "#bbb"); fuse.setAttribute("stroke-width", "4"); fuse.setAttribute("fill", "none");
  const body = document.createElementNS(ns, "circle");
  body.setAttribute("cx", "50"); body.setAttribute("cy", "55"); body.setAttribute("r", "35");
  body.setAttribute("fill", "currentColor");
  body.classList.add("bomb-body");
  const spark = document.createElementNS(ns, "circle");
  spark.setAttribute("cx", "65"); spark.setAttribute("cy", "10"); spark.setAttribute("r", "4"); spark.setAttribute("fill", "#fff");
  spark.classList.add("fuse-spark");
  svg.append(fuse, body, spark);
  _bombTemplate = svg;
  return svg;
}
const cbPatterns = ["none","8 4","4 4","12 4 2 4","6 2 2 2"];

export function makeBombSVG(color, playerIndex = 0) {
  const svg = bombTemplate().cloneNode(true);
  svg.style.color = color;
  if (document.body.classList.contains("colorblind-mode")) {
    const rect = makeCbPatternRect(playerIndex);
    svg.appendChild(rect);
  }
  return svg;
}

// MAIN RENDER ENGINE
export function drawCell(x, y, board, boardEl, cols, players, current, withPulse = false) {
  const idx = y * cols + x;
  const cellEl = boardEl.children[idx];
  if (!cellEl) return;

  const data = board[y][x];
  const rows = board.length;

  // Clear + reset
  cellEl.innerHTML = "";
  cellEl.className = "cell"; 

  // Not part of the board at all (custom-board hole)
  if (data.hidden) {
    cellEl.classList.add("hole");
    return;
  }

  // Blocked cell
  if (data.isBlocked) {
    cellEl.classList.add("blocked");
    return;
  }

  // Owned Logic
  const isOwned = data.owner !== -1;
  if (isOwned) {
    cellEl.classList.add("owned");
    const playerColor = players?.[data.owner]?.color || "#ccc";
    cellEl.style.setProperty("--glow", playerColor);
    cellEl.style.borderColor = playerColor; 
  } else {
    cellEl.style.removeProperty("--glow");
    cellEl.style.borderColor = "";
  }

  // Critical Logic
  const cap = capacity(x, y, rows, cols, board);
  const isCrit = data.count === cap - 1 && data.count > 0;
  if (isCrit) cellEl.classList.add("critical");

  // Pulse effect
  if (withPulse) cellEl.classList.add("pulse");

  // Nothing to render
  if (data.count === 0) return;

  const playerColor = players?.[data.owner]?.color || "#ccc";

  // --- HYBRID RENDER LOGIC ---
  
  if (data.count >= 3) {
    // 3 ATOMS -> DRAW BOMB (Fixes the "awkward dots" issue)
    cellEl.appendChild(makeBombSVG(playerColor, data.owner));
  }
  else if (data.count === 2) {
    // 2 ATOMS -> DRAW PAIR (Neon Style)
    const wrap = el("div", "pair-improved");
    const a = el("div", "orb two-orb");
    const b = el("div", "orb two-orb");
    a.style.background = playerColor;
    b.style.background = playerColor;
    const markA = el("span", `cb-mark p${data.owner}`);
    const markB = el("span", `cb-mark p${data.owner}`);
    a.appendChild(markA);
    b.appendChild(markB);
    wrap.append(a, b);
    cellEl.appendChild(wrap);
  }
  else {
    // 1 ATOM -> DRAW SINGLE ORB (Neon Style)
    const o = el("div", "orb one");
    o.style.background = playerColor;
    const mark = el("span", `cb-mark p${data.owner}`);
    o.appendChild(mark);
    cellEl.appendChild(o);
  }
}