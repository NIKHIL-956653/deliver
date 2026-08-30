// js/ai.worker.js
// Runs the minimax AI on a separate CPU thread so the UI never freezes.
import { makeAIMove } from './ai.js';

self.onmessage = function ({ data }) {
  const { board, current, difficulty, rows, cols, playerCount, skill = 1, id } = data;
  const move = makeAIMove(board, current, difficulty, rows, cols, playerCount, skill);
  self.postMessage({ move, id });
};
