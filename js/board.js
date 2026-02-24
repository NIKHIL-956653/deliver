/* js/board.js - Hybrid Engine (Orbs -> Bombs) */

const el = (t, c, attrs = {}) => {
  const n = document.createElement(t);
  if (c) n.className = c;
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

// CAPACITY LOGIC
export const capacity = (x, y, rows, cols) => {
  const edges = [y == 0, y == rows - 1, x == 0, x == cols - 1].filter(Boolean).length;
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

/**
 * BOMB SVG GENERATOR
 * Used for Critical Mass (3+ atoms)
 */
export function makeBombSVG(color) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.classList.add("bombsvg");

  // Bomb Body
  const body = document.createElementNS(ns, "circle");
  body.setAttribute("cx", "50");
  body.setAttribute("cy", "55");
  body.setAttribute("r", "35");
  body.setAttribute("fill", color);
  body.setAttribute("filter", `drop-shadow(0 0 5px ${color})`);

  // Fuse Stem
  const fuse = document.createElementNS(ns, "path");
  fuse.setAttribute("d", "M 50 20 Q 50 10 65 10");
  fuse.setAttribute("stroke", "#bbb");
  fuse.setAttribute("stroke-width", "4");
  fuse.setAttribute("fill", "none");

  // Spark at end of fuse
  const spark = document.createElementNS(ns, "circle");
  spark.setAttribute("cx", "65");
  spark.setAttribute("cy", "10");
  spark.setAttribute("r", "4");
  spark.setAttribute("fill", "#fff");
  spark.classList.add("fuse-spark"); 

  svg.appendChild(fuse);
  svg.appendChild(body);
  svg.appendChild(spark);

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
  const cap = capacity(x, y, rows, cols);
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
    cellEl.appendChild(makeBombSVG(playerColor));
  } 
  else if (data.count === 2) {
    // 2 ATOMS -> DRAW PAIR (Neon Style)
    const wrap = el("div", "pair-improved");
    const a = el("div", "orb two-orb");
    const b = el("div", "orb two-orb");
    a.style.background = playerColor;
    b.style.background = playerColor;
    wrap.append(a, b);
    cellEl.appendChild(wrap);
  } 
  else {
    // 1 ATOM -> DRAW SINGLE ORB (Neon Style)
    const o = el("div", "orb one");
    o.style.background = playerColor;
    cellEl.appendChild(o);
  }
}