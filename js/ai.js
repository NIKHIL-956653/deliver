/* js/ai.js — Minimax AI v2
 *
 * What changed vs v1:
 *  - Evaluation is now a material DIFFERENCE (mine − everyone else's). v1 only
 *    counted its own orbs, so it couldn't tell a winning board from a losing one.
 *  - Threat model: cells next to an enemy critical cell are liabilities, safe
 *    critical cells are assets, and enemy critical cells are counted against us.
 *  - Move ordering (explosive / loaded cells first) so alpha-beta actually prunes.
 *  - Multiplayer aware: 3–6 players are all treated as opponents, and the search
 *    cycles through the real turn order instead of assuming "1 - player".
 *  - rankMoves() returns EVERY root move with its true value, best → worst.
 *    The adaptive "mercy" system in game.js uses this to make plausible slips
 *    (2nd/3rd best move) instead of obviously random blunders.
 *  - makeAIMove() accepts a `skill` in [0,1]. 1 = always the best move.
 */
import { capacity, neighbors } from "./board.js";

const WIN_SCORE = 10000;
const LOS_SCORE = -10000;

// ── EVALUATION ────────────────────────────────────────────────────────────────
export function evaluateBoard(board, player, rows, cols) {
  let score = 0, myOrbs = 0, enemyOrbs = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = board[y][x];
      if (cell.owner === -1 || cell.isBlocked) continue;

      const cap = capacity(x, y, rows, cols);
      const mine = cell.owner === player;
      if (mine) myOrbs += cell.count; else enemyOrbs += cell.count;

      let s = cell.count;                              // material
      if (cap === 2) s += 3; else if (cap === 3) s += 1; // corners/edges are stable

      const isCrit = cell.count === cap - 1;
      let hostileCritNb = 0;
      for (const [nx, ny] of neighbors(x, y, rows, cols, board)) {
        const nb = board[ny][nx];
        if (nb.owner !== -1 && nb.owner !== cell.owner &&
            nb.count === capacity(nx, ny, rows, cols) - 1) hostileCritNb++;
      }

      if (hostileCritNb) s -= (5 - cap) * hostileCritNb; // about to be captured
      else if (isCrit)   s += 2;                          // loaded and safe
      if (isCrit)        s += 1;                          // pressure on neighbours

      score += mine ? s : -s;
    }
  }

  if (myOrbs > 0 && enemyOrbs === 0) return WIN_SCORE;
  if (myOrbs === 0 && enemyOrbs > 0) return LOS_SCORE;
  return score;
}

// ── SIMULATION ────────────────────────────────────────────────────────────────
export function simulateBoardState(initialBoard, x, y, player, rows, cols) {
  const clone = initialBoard.map(row => row.map(c => ({ ...c })));
  clone[y][x].owner = player;
  clone[y][x].count++;
  const q = [[x, y]];
  let loops = 0;
  while (q.length && loops++ < 600) {
    const [cx, cy] = q.shift();
    const cap = capacity(cx, cy, rows, cols);
    const cell = clone[cy][cx];
    if (cell.count < cap) continue;
    cell.count -= cap;
    if (cell.count === 0) cell.owner = -1;
    for (const [nx, ny] of neighbors(cx, cy, rows, cols, clone)) {
      clone[ny][nx].owner = player;
      clone[ny][nx].count++;
      if (clone[ny][nx].count >= capacity(nx, ny, rows, cols)) q.push([nx, ny]);
    }
  }
  return clone;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function legalMoves(board, p, rows, cols) {
  const v = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const c = board[y][x];
      if (!c.isBlocked && (c.owner === -1 || c.owner === p)) v.push({ x, y });
    }
  return v;
}

// Explosive moves first, then loaded cells, then corners/edges → better pruning
function orderedMoves(board, p, rows, cols) {
  return legalMoves(board, p, rows, cols)
    .map(m => {
      const c = board[m.y][m.x];
      const cap = capacity(m.x, m.y, rows, cols);
      const k = (c.count + 1 >= cap ? 100 : 0) + c.count * 10 + (cap === 2 ? 3 : cap === 3 ? 1 : 0);
      return { x: m.x, y: m.y, k };
    })
    .sort((a, b) => b.k - a.k);
}

function hasOrbs(board, p) {
  for (const row of board) for (const c of row) if (c.owner === p) return true;
  return false;
}

// Next player in turn order who is still alive (has orbs). Falls back to `player`.
function nextOpponent(board, after, player, playerCount) {
  for (let i = 1; i < playerCount; i++) {
    const p = (after + i) % playerCount;
    if (p === player) return player;
    if (hasOrbs(board, p)) return p;
  }
  return player;
}

// ── SEARCH ────────────────────────────────────────────────────────────────────
// `mover` is whose turn it is at this node. Max nodes = `player`, everyone else minimises.
function minimax(board, depth, alpha, beta, mover, player, rows, cols, playerCount) {
  const e = evaluateBoard(board, player, rows, cols);
  if (depth === 0 || Math.abs(e) >= WIN_SCORE) return e;

  const moves = orderedMoves(board, mover, rows, cols);
  if (!moves.length) return e;

  if (mover === player) {
    let best = LOS_SCORE;
    for (const m of moves) {
      const next = simulateBoardState(board, m.x, m.y, mover, rows, cols);
      const nm = nextOpponent(next, mover, player, playerCount);
      best = Math.max(best, minimax(next, depth - 1, alpha, beta, nm, player, rows, cols, playerCount));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = WIN_SCORE;
    for (const m of moves) {
      const next = simulateBoardState(board, m.x, m.y, mover, rows, cols);
      const nm = nextOpponent(next, mover, player, playerCount);
      best = Math.min(best, minimax(next, depth - 1, alpha, beta, nm, player, rows, cols, playerCount));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function pickDepth(board, difficulty, rows, cols) {
  let depth = difficulty === "hard" ? 3 : 2;
  const cells = rows * cols;
  const occupancy = board.flat().filter(c => c.owner !== -1).length / cells;
  if (cells >= 81 && occupancy > 0.6) depth = 2;   // keep 9×9 / 12×12 responsive
  if (cells >= 144 && difficulty !== "hard") depth = 2;
  return depth;
}

/**
 * Every legal move for `player`, with its minimax value, best → worst.
 * Root values are exact (no alpha tightening across root moves) so the
 * mercy system can reason about "how much worse is the 2nd best move".
 */
export function rankMoves(board, player, depth, rows, cols, playerCount = 2) {
  const out = [];
  for (const m of orderedMoves(board, player, rows, cols)) {
    const next = simulateBoardState(board, m.x, m.y, player, rows, cols);
    const nm = nextOpponent(next, player, player, playerCount);
    const v = minimax(next, depth - 1, LOS_SCORE, WIN_SCORE, nm, player, rows, cols, playerCount);
    out.push({ x: m.x, y: m.y, v });
  }
  return out.sort((a, b) => b.v - a.v);
}

/**
 * Choose a move given a skill level in [0,1].
 *  1.0  → best move (ties broken randomly)
 *  0.6  → sometimes the 2nd/3rd best ("plausible slip")
 *  0.2  → often a clearly worse move, but never an instant self-elimination
 * Rules that keep the slip believable:
 *  - If the best move wins on the spot and skill ≥ 0.25, take it (missing a mate is too obvious).
 *  - Never pick a move whose value is a forced loss unless skill < 0.1.
 */
export function chooseBySkill(ranked, skill = 1) {
  if (!ranked.length) return null;
  const best = ranked[0];
  if (skill >= 1) {
    const top = ranked.filter(m => m.v === best.v);
    return top[Math.floor(Math.random() * top.length)];
  }
  if (best.v >= WIN_SCORE && skill >= 0.25) return best;

  // Graceful throw: at rock-bottom skill the AI actively (but quietly) loses.
  // It plays from its WEAKEST third — placements that feed the player's chains.
  // They look like normal expansion moves, then get eaten. No obvious charity.
  if (skill <= 0.2 && ranked.length > 2) {
    const losers = ranked.filter(m => m.v < WIN_SCORE);
    if (losers.length && Math.random() < 0.7) {
      const third = Math.max(1, Math.floor(losers.length / 3));
      const worst = losers.slice(-third);
      return worst[Math.floor(Math.random() * worst.length)];
    }
  }

  const slipChance = 1 - skill;                       // how often we don't play the best
  if (Math.random() > slipChance) {
    const top = ranked.filter(m => m.v === best.v);
    return top[Math.floor(Math.random() * top.length)];
  }

  // Candidate pool grows as skill drops: skill .8 → top 2, .5 → top 4, .2 → top 6
  const pool = Math.max(2, Math.min(ranked.length, 2 + Math.round((1 - skill) * 5)));
  let cands = ranked.slice(1, pool);
  if (skill >= 0.1) cands = cands.filter(m => m.v > LOS_SCORE);
  if (!cands.length) return best;
  // Bias toward the better end of the pool so slips are usually mild
  const i = Math.floor(Math.pow(Math.random(), 1 + skill * 2) * cands.length);
  return cands[i];
}

// ── PUBLIC API ────────────────────────────────────────────────────────────────
/**
 * makeAIMove(board, player, difficulty, rows, cols, playerCount = 2, skill = 1)
 */
export function makeAIMove(board, player, difficulty, rows, cols, playerCount = 2, skill = 1) {
  const depth = pickDepth(board, difficulty, rows, cols);
  const ranked = rankMoves(board, player, depth, rows, cols, playerCount);
  return chooseBySkill(ranked, skill) || legalMoves(board, player, rows, cols)[0] || null;
}

/** Hint for the human: deeper search, always the best move. */
export function getProfessionalHint(board, player, rows, cols, playerCount = 2) {
  const cells = rows * cols;
  const depth = cells <= 36 ? 4 : 3;      // depth 4 on 9×9 is too slow on the main thread
  const ranked = rankMoves(board, player, depth, rows, cols, playerCount);
  return ranked[0] ? { x: ranked[0].x, y: ranked[0].y } : null;
}
