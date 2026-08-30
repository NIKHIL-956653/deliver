// js/leaderboard.js
import { SUPABASE_URL, SUPABASE_ANON_KEY, LEADERBOARD_ENABLED } from './leaderboard-config.js';

export { LEADERBOARD_ENABLED };

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export async function submitScore({ playerName, score, mode, grid, aiDifficulty }) {
  if (!LEADERBOARD_ENABLED) return { ok: false, error: 'Leaderboard not configured' };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        player_name: playerName,
        score,
        mode,
        grid,
        ai_difficulty: aiDifficulty,
      }),
    });
    return { ok: res.ok };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function fetchLeaderboard({ mode = 'normal', grid = '9x9' } = {}) {
  if (!LEADERBOARD_ENABLED) return [];
  // Normal: fewer moves = better (asc). Time Attack: more time left = better (desc).
  const order = mode === 'timeAttack' ? 'score.desc' : 'score.asc';
  try {
    const url = `${SUPABASE_URL}/rest/v1/scores?mode=eq.${encodeURIComponent(mode)}&grid=eq.${encodeURIComponent(grid)}&order=${order}&limit=10&select=player_name,score,ai_difficulty,created_at`;
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
