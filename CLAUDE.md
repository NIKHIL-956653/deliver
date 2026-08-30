# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running Locally

No build step — this is a pure vanilla JS static site. Serve from the project root:

```bash
python -m http.server 8000
# or
npx serve .
```

Open `http://localhost:8000`.

## Testing

```bash
node tools/headless-check.js
```

Requires a local server running on port 8000. Uses Playwright headless browser to verify page load, board rendering, and theme application.

## Architecture

**Entry point:** `index.html` — contains all UI (menus, game board, modals, overlays). All JS is loaded as ES6 modules via `<script type="module" src="js/game.js">`.

**Module dependency tree:**
```
game.js  (main orchestrator — controls all game flow)
├── board.js              — cell capacity rules, SVG orb/bomb rendering, neighbor detection
├── player.js             — builds player name/color/AI-type config UI
├── ai.js                 — minimax AI + hint engine (spawned via ai.worker.js for off-thread)
├── fx.js                 — canvas particle system, shockwaves, screen shake/flash/glitch
├── storage.js            — localStorage: XP, ranks, achievements, skins, daily challenges, stats
├── levels.js             — SAGA_LEVELS array (10+ campaign levels with preset orbs + blocked cells)
├── sound.js              — Web Audio sound effects (click, explode, win); supports mute toggle
├── leaderboard.js        — Supabase REST leaderboard: submitScore, fetchLeaderboard
├── leaderboard-config.js — Supabase URL/key constants + LEADERBOARD_ENABLED flag
├── matrix.js             — Matrix theme canvas background (falling characters)
└── magma.js              — Magma theme canvas background (falling fire particles)
```

**Core game rules:**
- Cell capacity = 2 (corners), 3 (edges), 4 (interior)
- When a cell exceeds capacity it explodes → orbs spread to adjacent cells → converts them to the current player's color → cascades
- Win: eliminate all opponent orbs
- Blocked cells (walls) stop chain propagation — critical to saga level design

**Key IDs the JS depends on** (don't rename these in HTML):
`gameModeSelect`, `themeSelect`, `gridSelect`, `playerCountSelect`, `aiSpeedSelect`, `sagaControls`, `standardControls`, `sagaPlayerCountSelect`, `sagaAiDifficultySelect`, `sagaAiDifficultyWrapper`, `playerSettingsContainer`, `startGameBtn`, `statsBtn`, `dailyChallengeBtn`, `streakDisplay`, `xpRankName`, `xpAmount`, `xpBarFill`

**Theme system:** Body gets a CSS class (`theme-cyberpunk`, `theme-magma`, etc.). The default theme has no class. Theme-specific canvases (matrix rain, magma lava) are started/stopped in `game.js` on theme change. Theme can be changed both from the main menu (`themeSelect`, hidden) and the in-game sidebar (`sidebarThemeSelect`).

**Saga mode:** Levels are defined in `js/levels.js` as `SAGA_LEVELS`. Each level object specifies grid size, blocked cells, preset orb placements, objectives, and star-rating conditions. When saga mode is active, `standardControls` is hidden and `sagaControls` is shown by `handleModeChange()` in `game.js`.

**AI:** Uses minimax with board evaluation (orb counting, critical-cell detection, strategic positioning). Runs in a Web Worker (`ai.worker.js`) to avoid blocking the UI thread.

**Persistence:** All state (XP, achievements, skins, settings, saga progress, daily streak) stored in `localStorage` via `storage.js`.

**Sound:** `sound.js` loads three audio files (`sounds/click.mp3`, `sounds/explode.mp3`, `sounds/win.mp3`) at volume 0.5. Call `playSound(name)` to play; `toggleMute()` to flip global mute. Each play clones the node so sounds can overlap.

**Leaderboard:** Optional Supabase-backed leaderboard. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `LEADERBOARD_ENABLED = true` in `js/leaderboard-config.js` to activate. `submitScore()` POSTs to a `scores` table; `fetchLeaderboard()` fetches top 10. Normal mode sorts by score ascending (fewer moves = better); Time Attack sorts descending. When `LEADERBOARD_ENABLED` is `false` all calls are no-ops.

## Deployment

Netlify-ready via `netlify.toml` (publish root: `.`, 1-hour cache headers, security headers).
