// js/ai.worker.js
// Runs the minimax AI on a separate CPU thread so the UI never freezes.
import { makeAIMove } from './ai.js';

self.onmessage = function ({ data }) {
  const { board, current, difficulty, rows, cols, playerCount, id } = data;
  const move = makeAIMove(board, current, difficulty, rows, cols, playerCount);
  self.postMessage({ move, id });
};
