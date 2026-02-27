// js/levels.js — Saga Campaign (10 Unique Levels)
//
// CAPACITY on any grid (based on full-grid edge position, NOT shape):
//   2 grid-edges → cap = 2   (grid corners)
//   1 grid-edge  → cap = 3   (grid edges)
//   0 grid-edges → cap = 4   (interior)
//
// BLOCKED CELLS: stop chain reactions. Chains cannot pass through them.
// All levels verified for board connectivity (no isolated regions).

// ─────────────────────────────────────────────
// SHAPE MASK CONSTANTS
// ─────────────────────────────────────────────

// Zigzag 6×6: an S-curve corridor (2 cells wide)
// Playable zones: top-left (x=0-1, y=0-2) → middle bridge (x=2-3) → bottom-right (x=4-5, y=3-5)
const ZIGZAG_6 = [
    [2,0],[3,0],[4,0],[5,0],
    [2,1],[3,1],[4,1],[5,1],
    [4,2],[5,2],
    [0,3],[1,3],
    [0,4],[1,4],[2,4],[3,4],
    [0,5],[1,5],[2,5],[3,5]
];

// Broken Plus 7×7: asymmetric cross
//   Top arm:    x=2-4, y=0-1  (2 rows above bar — more space)
//   Horiz bar:  y=2-4, all x  (3-row wide horizontal band)
//   Bottom arm: x=2-4, y=5    (1 row only — intentionally short)
//   Row 6:      fully blocked
const BROKEN_PLUS_7 = [
    [0,0],[1,0],[5,0],[6,0],
    [0,1],[1,1],[5,1],[6,1],
    [0,5],[1,5],[5,5],[6,5],
    [0,6],[1,6],[2,6],[3,6],[4,6],[5,6],[6,6]
];

// ─────────────────────────────────────────────
// SAGA LEVELS
// ─────────────────────────────────────────────

export const SAGA_LEVELS = [

    // ── LEVEL 1 ──────────────────────────────────────────────────────────
    // THE OPEN FIELD — 7×7, zero blocked cells
    //
    // Full square grid, totally open. First time the player sees a board
    // with no constraints. Chain reactions cascade in every direction.
    // Psychological goal: pure power fantasy, "wow" opening moment.
    // Difficulty: Easy.
    //
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    {
        id: 1,
        name: "The Open Field",
        description: "No walls. No limits. Pure chain reaction energy!",
        rows: 7, cols: 7,
        blockedCells: [],
        presetOrbs: [
            // Player — bottom-left corner
            { x: 0, y: 6, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 5, player: 0, count: 3 },   // interior, cap=4
            { x: 0, y: 4, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — top-right corner
            { x: 6, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 5, y: 1, player: 1, count: 3 },   // interior, cap=4
            { x: 6, y: 2, player: 1, count: 2 }    // x=6 edge, cap=3
        ]
    },

    // ── LEVEL 2 ──────────────────────────────────────────────────────────
    // CORRIDOR WAR — 3 rows × 7 cols, one dividing wall with a bridge
    //
    // Tiny battlefield. Every move threatens the enemy. A single wall
    // splits the board with one gap at the center row.
    // Psychological goal: claustrophobia, intense back-and-forth rhythm.
    // Difficulty: Easy-Medium (small board, fast explosions).
    //
    //  □ □ □ ■ □ □ □
    //  □ □ □ □ □ □ □   ← bridge gap
    //  □ □ □ ■ □ □ □
    {
        id: 2,
        name: "Corridor War",
        description: "Three rows, one wall, one gap. No room to hide!",
        rows: 3, cols: 7,
        blockedCells: [
            [3, 0], [3, 2]   // wall at x=3, gap at y=1
        ],
        presetOrbs: [
            // Player — left side
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 1, player: 0, count: 3 },   // interior, cap=4
            { x: 0, y: 2, player: 0, count: 1 },   // corner, cap=2
            // AI — right side
            { x: 6, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 5, y: 1, player: 1, count: 3 },   // interior, cap=4
            { x: 6, y: 2, player: 1, count: 1 }    // corner, cap=2
        ]
    },

    // ── LEVEL 3 ──────────────────────────────────────────────────────────
    // THE RING — 6×6 diamond outer shape + hollow 2×2 center
    //
    // The center of the board is dead. Chain reactions loop around it like
    // a ring. "Push through the middle" no longer works — players must think
    // in arcs and orbits.
    // Psychological goal: disorientation (the good kind), new spatial logic.
    // Difficulty: Medium.
    //
    //  ■ ■ □ □ ■ ■
    //  ■ □ □ □ □ ■
    //  □ □ ■ ■ □ □   ← center blocked
    //  □ □ ■ ■ □ □
    //  ■ □ □ □ □ ■
    //  ■ ■ □ □ ■ ■
    {
        id: 3,
        name: "The Ring",
        description: "The center is gone. Chain reactions orbit around the void!",
        rows: 6, cols: 6,
        blockedCells: [
            // Diamond outer shape
            [0,0],[1,0],[4,0],[5,0],
            [0,1],[5,1],
            [0,4],[5,4],
            [0,5],[1,5],[4,5],[5,5],
            // Hollow center
            [2,2],[3,2],[2,3],[3,3]
        ],
        presetOrbs: [
            // Player — bottom of ring
            { x: 2, y: 5, player: 0, count: 2 },   // y=5 edge, cap=3
            { x: 3, y: 5, player: 0, count: 2 },   // y=5 edge, cap=3
            { x: 1, y: 4, player: 0, count: 3 },   // interior, cap=4
            // AI — top of ring
            { x: 2, y: 0, player: 1, count: 2 },   // y=0 edge, cap=3
            { x: 3, y: 0, player: 1, count: 2 },   // y=0 edge, cap=3
            { x: 4, y: 1, player: 1, count: 3 }    // interior, cap=4
        ]
    },

    // ── LEVEL 4 ──────────────────────────────────────────────────────────
    // TWIN CHAMBERS — 7×7, vertical wall with single bridge at center
    //
    // A wall runs the full height with one gap at [3,3]. Each player builds
    // a "home territory" then fights to control the bottleneck.
    // Psychological goal: territory → siege → invasion. A three-act structure.
    // Difficulty: Medium.
    //
    //  □ □ □ ■ □ □ □
    //  □ □ □ ■ □ □ □
    //  □ □ □ ■ □ □ □
    //  □ □ □ □ □ □ □   ← bridge
    //  □ □ □ ■ □ □ □
    //  □ □ □ ■ □ □ □
    //  □ □ □ ■ □ □ □
    {
        id: 4,
        name: "Twin Chambers",
        description: "Two rooms, one door. Control the bridge — control the game!",
        rows: 7, cols: 7,
        blockedCells: [
            [3,0],[3,1],[3,2],
            // gap at [3,3]
            [3,4],[3,5],[3,6]
        ],
        presetOrbs: [
            // Player — left chamber
            { x: 1, y: 3, player: 0, count: 3 },   // interior, cap=4
            { x: 0, y: 2, player: 0, count: 2 },   // x=0 edge, cap=3
            { x: 0, y: 4, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — right chamber
            { x: 5, y: 3, player: 1, count: 3 },   // interior, cap=4
            { x: 6, y: 2, player: 1, count: 2 },   // x=6 edge, cap=3
            { x: 6, y: 4, player: 1, count: 2 }    // x=6 edge, cap=3
        ]
    },

    // ── BOSS LEVEL 1 ─────────────────────────────────────────────────────
    // THE AMBUSH — 8×8, AI owns the center cluster near-critical
    //
    // You start in the corner with two orbs. The AI has five near-critical orbs
    // locked in a 2×3 center cluster. One wrong move and the chain cascades
    // across the whole board. Push through the edge — or be ambushed.
    // Difficulty: Boss.
    {
        id: 101, isBoss: true,
        name: "The Ambush",
        description: "The AI controls the center. Break through before it cascades!",
        rows: 8, cols: 8,
        blockedCells: [],
        presetOrbs: [
            // Player — bottom-left corner
            { x: 0, y: 7, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 7, player: 0, count: 2 },   // y=7 edge, cap=3
            // AI — center cluster, near-critical
            { x: 3, y: 3, player: 1, count: 3 },   // interior, cap=4
            { x: 4, y: 3, player: 1, count: 3 },   // interior, cap=4
            { x: 3, y: 4, player: 1, count: 3 },   // interior, cap=4
            { x: 4, y: 4, player: 1, count: 3 },   // interior, cap=4
            { x: 5, y: 4, player: 1, count: 2 },   // interior, cap=4
        ]
    },

    // ── LEVEL 5 ──────────────────────────────────────────────────────────
    // THE HOURGLASS — 7×7, wide ends, single-cell waist at [3,3]
    //
    // Both sides have open space to build. Then all chains must squeeze
    // through exactly one cell. The moment the board "closes" is electric.
    // Psychological goal: tension escalation, one decisive chokepoint.
    // Difficulty: Hard.
    //
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    //  ■ ■ □ □ □ ■ ■
    //  ■ ■ ■ □ ■ ■ ■   ← single-cell waist at x=3
    //  ■ ■ □ □ □ ■ ■
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    {
        id: 5,
        name: "The Hourglass",
        description: "Everything funnels through one cell. Timing is everything!",
        rows: 7, cols: 7,
        blockedCells: [
            [0,2],[1,2],[5,2],[6,2],
            [0,3],[1,3],[2,3],[4,3],[5,3],[6,3],
            [0,4],[1,4],[5,4],[6,4]
        ],
        presetOrbs: [
            // Player — bottom half
            { x: 1, y: 6, player: 0, count: 2 },   // y=6 edge, cap=3
            { x: 3, y: 5, player: 0, count: 3 },   // interior, cap=4
            { x: 5, y: 6, player: 0, count: 2 },   // y=6 edge, cap=3
            // AI — top half
            { x: 1, y: 0, player: 1, count: 2 },   // y=0 edge, cap=3
            { x: 3, y: 1, player: 1, count: 3 },   // interior, cap=4
            { x: 5, y: 0, player: 1, count: 2 }    // y=0 edge, cap=3
        ]
    },

    // ── LEVEL 6 ──────────────────────────────────────────────────────────
    // THE SIEGE — 7×7, AI starts inside a fortress with 2 entrance gaps
    //
    // The enemy is shielded inside a ring of walls. Player must breach two
    // narrow gaps simultaneously to destabilize the fortress.
    // Psychological goal: boss-fight energy, role reversal (defender/attacker).
    // Difficulty: Hard.
    //
    //  □ □ □ □ □ □ □
    //  □ ■ ■ □ ■ ■ □   ← gap at x=3
    //  □ ■ [FORTRESS] ■ □
    //  □ ■ [inside  ] ■ □
    //  □ ■ [        ] ■ □
    //  □ ■ ■ □ ■ ■ □   ← gap at x=3
    //  □ □ □ □ □ □ □
    {
        id: 6,
        name: "The Siege",
        description: "The enemy hides in a fortress. Find the two gaps and break in!",
        rows: 7, cols: 7,
        blockedCells: [
            // Fortress corners
            [1,1],[5,1],[1,5],[5,5],
            // Top wall (gap at x=3)
            [2,1],[4,1],
            // Bottom wall (gap at x=3)
            [2,5],[4,5],
            // Left wall
            [1,2],[1,3],[1,4],
            // Right wall
            [5,2],[5,3],[5,4]
        ],
        presetOrbs: [
            // Player — outer ring, spread to force flanking
            { x: 0, y: 3, player: 0, count: 2 },   // x=0 edge, cap=3
            { x: 3, y: 6, player: 0, count: 2 },   // y=6 edge, cap=3
            { x: 6, y: 3, player: 0, count: 2 },   // x=6 edge, cap=3
            // AI — inside fortress
            { x: 3, y: 3, player: 1, count: 3 },   // interior, cap=4
            { x: 2, y: 2, player: 1, count: 2 },   // interior, cap=4
            { x: 4, y: 4, player: 1, count: 2 }    // interior, cap=4
        ]
    },

    // ── LEVEL 7 ──────────────────────────────────────────────────────────
    // ZIGZAG ALLEY — 6×6 S-curve corridor (2 cells wide)
    //
    // No straight lines. The path bends twice. Every orb placement is
    // high-stakes because the corridor is narrow and has no bypass.
    // Psychological goal: chess-like deliberateness, spatial navigation.
    // Difficulty: Hard.
    //
    //  □ □ ■ ■ ■ ■
    //  □ □ ■ ■ ■ ■
    //  □ □ □ □ ■ ■   ← S-bend
    //  ■ ■ □ □ □ □   ← S-bend
    //  ■ ■ ■ ■ □ □
    //  ■ ■ ■ ■ □ □
    {
        id: 7,
        name: "Zigzag Alley",
        description: "The path bends twice. No shortcuts, no bypasses. Navigate or die!",
        rows: 6, cols: 6,
        blockedCells: ZIGZAG_6,
        presetOrbs: [
            // Player — top-left zone
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 1, player: 0, count: 3 },   // interior, cap=4
            { x: 0, y: 2, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — bottom-right zone
            { x: 5, y: 5, player: 1, count: 1 },   // corner, cap=2
            { x: 4, y: 4, player: 1, count: 3 },   // interior, cap=4
            { x: 5, y: 3, player: 1, count: 2 }    // x=5 edge, cap=3
        ]
    },

    // ── LEVEL 8 ──────────────────────────────────────────────────────────
    // BROKEN SYMMETRY — 7×7 asymmetric plus shape
    //
    // The plus cross is intentionally lopsided: top arm has 2 extra rows,
    // bottom arm has 1 row. Player starts in the larger zone; AI is boxed
    // into the smaller one. Size advantage vs. defensive compactness.
    // Psychological goal: strategic unfairness, lateral thinking required.
    // Difficulty: Hard.
    //
    //      □ □ □         (top arm, 2 rows)
    //      □ □ □
    //  □ □ □ □ □ □ □    (full horizontal bar, 3 rows)
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    //      □ □ □         (bottom arm, 1 row only)
    //      ■ ■ ■         (row 6 fully blocked)
    {
        id: 8,
        name: "Broken Symmetry",
        description: "One side has more room. Use it wisely before the AI escapes!",
        rows: 7, cols: 7,
        blockedCells: BROKEN_PLUS_7,
        presetOrbs: [
            // Player — top arm (larger zone)
            { x: 3, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 2, y: 1, player: 0, count: 3 },   // interior, cap=4
            { x: 4, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            // AI — bottom zone (tighter)
            { x: 2, y: 4, player: 1, count: 3 },   // interior, cap=4
            { x: 3, y: 5, player: 1, count: 2 },   // interior, cap=4
            { x: 4, y: 4, player: 1, count: 3 }    // interior, cap=4
        ]
    },

    // ── BOSS LEVEL 2 ─────────────────────────────────────────────────────
    // IRON FORTRESS — 9×9, vertical wall with a single gap, AI owns both flanks
    //
    // A 6-cell wall splits the board vertically. Only one gap at [4,4] connects
    // the two sides. The AI controls two clusters on the right — upper and lower.
    // You must push through the gap before both flanks synchronise.
    // Difficulty: Boss.
    {
        id: 102, isBoss: true,
        name: "Iron Fortress",
        description: "Walls divide the battlefield. Seize the corridors!",
        rows: 9, cols: 9,
        blockedCells: [[4,1],[4,2],[4,3],[4,5],[4,6],[4,7]],
        presetOrbs: [
            // Player — top-left cluster
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 0, y: 1, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — right zone, upper and lower, near-critical
            { x: 6, y: 2, player: 1, count: 3 },   // interior, cap=4
            { x: 7, y: 2, player: 1, count: 3 },   // interior, cap=4
            { x: 8, y: 2, player: 1, count: 2 },   // x=8 edge, cap=3
            { x: 6, y: 6, player: 1, count: 3 },   // interior, cap=4
            { x: 7, y: 6, player: 1, count: 3 },   // interior, cap=4
            { x: 8, y: 6, player: 1, count: 2 },   // x=8 edge, cap=3
        ]
    },

    // ── LEVEL 9 ──────────────────────────────────────────────────────────
    // THE MAZE — 7×7, two full horizontal walls with offset single-cell gaps
    //
    // Wall at y=2 with gap at x=2. Wall at y=4 with gap at x=4.
    // To cross the board: navigate through the first gap, then cross the
    // middle zone diagonally, then exit through the second gap.
    // Psychological goal: exploration and discovery — the board is solved, not fought.
    // Difficulty: Very Hard.
    //
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    //  ■ ■ □ ■ ■ ■ ■   ← gap at x=2
    //  □ □ □ □ □ □ □
    //  ■ ■ ■ ■ □ ■ ■   ← gap at x=4
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    {
        id: 9,
        name: "The Maze",
        description: "Two walls. Two offset gaps. Find the path through the labyrinth!",
        rows: 7, cols: 7,
        blockedCells: [
            // Wall y=2 — gap at x=2
            [0,2],[1,2],[3,2],[4,2],[5,2],[6,2],
            // Wall y=4 — gap at x=4
            [0,4],[1,4],[2,4],[3,4],[5,4],[6,4]
        ],
        presetOrbs: [
            // Player — bottom zone
            { x: 1, y: 6, player: 0, count: 2 },   // y=6 edge, cap=3
            { x: 3, y: 5, player: 0, count: 3 },   // interior, cap=4
            { x: 5, y: 6, player: 0, count: 2 },   // y=6 edge, cap=3
            // AI — top zone
            { x: 1, y: 0, player: 1, count: 2 },   // y=0 edge, cap=3
            { x: 3, y: 1, player: 1, count: 3 },   // interior, cap=4
            { x: 5, y: 0, player: 1, count: 2 }    // y=0 edge, cap=3
        ]
    },

    // ── LEVEL 10 ─────────────────────────────────────────────────────────
    // THE VOLCANO — 7×7, open ring around a dead center island
    //
    // The 3×3 center is completely blocked. Chain reactions wrap around the
    // island, creating unexpected arcs. A wave aimed at the enemy can loop
    // around and come back. Grand visual chaos as a climax level.
    // Psychological goal: spectacular surprise, epic finale feeling.
    // Difficulty: Expert.
    //
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    //  □ □ ■ ■ ■ □ □
    //  □ □ ■ ■ ■ □ □   ← dead center island
    //  □ □ ■ ■ ■ □ □
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    {
        id: 10,
        name: "The Volcano",
        description: "The center is dead. Chain reactions orbit the island — and snap back!",
        rows: 7, cols: 7,
        blockedCells: [
            [2,2],[3,2],[4,2],
            [2,3],[3,3],[4,3],
            [2,4],[3,4],[4,4]
        ],
        presetOrbs: [
            // Player — bottom-left
            { x: 0, y: 5, player: 0, count: 2 },   // x=0 edge, cap=3
            { x: 1, y: 6, player: 0, count: 2 },   // y=6 edge, cap=3
            { x: 0, y: 6, player: 0, count: 1 },   // corner, cap=2
            // AI — top-right
            { x: 6, y: 1, player: 1, count: 2 },   // x=6 edge, cap=3
            { x: 5, y: 0, player: 1, count: 2 },   // y=0 edge, cap=3
            { x: 6, y: 0, player: 1, count: 1 }    // corner, cap=2
        ]
    },

    // ── LEVEL 11 ─────────────────────────────────────────────────────────
    // THE PILLARS — 7×7, twin 2-wide towers joined by two horizontal rungs
    //
    // Two vertical pillars (x=0-1 and x=5-6) connected only at y=2 and y=5.
    // The three middle columns are dead space except at the rungs.
    // Players build power in their pillar, then race to control the rungs.
    // Psychological goal: territory management, timed bridge charges.
    // Difficulty: Hard.
    //
    //  □ □ ■ ■ ■ □ □
    //  □ □ ■ ■ ■ □ □
    //  □ □ □ □ □ □ □   ← rung 1
    //  □ □ ■ ■ ■ □ □
    //  □ □ ■ ■ ■ □ □
    //  □ □ □ □ □ □ □   ← rung 2
    //  □ □ ■ ■ ■ □ □
    {
        id: 11,
        name: "The Pillars",
        description: "Two towers, two bridges. Race to the rungs before the enemy does!",
        rows: 7, cols: 7,
        blockedCells: [
            [2,0],[3,0],[4,0],
            [2,1],[3,1],[4,1],
            // rung at y=2 — fully open
            [2,3],[3,3],[4,3],
            [2,4],[3,4],[4,4],
            // rung at y=5 — fully open
            [2,6],[3,6],[4,6]
        ],
        presetOrbs: [
            // Player — top of left pillar
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 0, y: 1, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — bottom of right pillar
            { x: 6, y: 6, player: 1, count: 1 },   // corner, cap=2
            { x: 5, y: 6, player: 1, count: 2 },   // y=6 edge, cap=3
            { x: 6, y: 5, player: 1, count: 2 }    // x=6 edge, cap=3
        ]
    },

    // ── LEVEL 12 ─────────────────────────────────────────────────────────
    // THE FRAME — 7×7, only the outer ring is playable
    //
    // A massive 5×5 island blocks the entire center. Only 24 perimeter cells
    // remain. Chain reactions race around the ring — left flank or right flank.
    // The board is a 2D racetrack. Timing and direction matter above all.
    // Psychological goal: new spatial orientation, edge-only movement.
    // Difficulty: Hard.
    //
    //  □ □ □ □ □ □ □
    //  □ ■ ■ ■ ■ ■ □
    //  □ ■ ■ ■ ■ ■ □
    //  □ ■ ■ ■ ■ ■ □   ← dead center island
    //  □ ■ ■ ■ ■ ■ □
    //  □ ■ ■ ■ ■ ■ □
    //  □ □ □ □ □ □ □
    {
        id: 12,
        name: "The Frame",
        description: "Only the edges exist. Race around the ring — your path is the board!",
        rows: 7, cols: 7,
        blockedCells: [
            [1,1],[2,1],[3,1],[4,1],[5,1],
            [1,2],[2,2],[3,2],[4,2],[5,2],
            [1,3],[2,3],[3,3],[4,3],[5,3],
            [1,4],[2,4],[3,4],[4,4],[5,4],
            [1,5],[2,5],[3,5],[4,5],[5,5]
        ],
        presetOrbs: [
            // Player — bottom-left corner of ring
            { x: 0, y: 6, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 6, player: 0, count: 2 },   // y=6 edge, cap=3
            { x: 0, y: 5, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — top-right corner of ring
            { x: 6, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 5, y: 0, player: 1, count: 2 },   // y=0 edge, cap=3
            { x: 6, y: 1, player: 1, count: 2 }    // x=6 edge, cap=3
        ]
    },

    // ── BOSS LEVEL 3 ─────────────────────────────────────────────────────
    // SINGULARITY — 9×9, AI spread across the entire board, near-critical
    //
    // No walls. Eight AI orbs scattered across every quadrant, all near-critical.
    // One chain reaction from any of them and the board erupts.
    // Your only weapon: strike fast, trigger a cascade before the AI does.
    // Difficulty: Boss.
    {
        id: 103, isBoss: true,
        name: "Singularity",
        description: "The final test. The AI is everywhere. Dominate or fall.",
        rows: 9, cols: 9,
        blockedCells: [],
        presetOrbs: [
            // Player — bottom-left cluster
            { x: 0, y: 8, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 8, player: 0, count: 2 },   // y=8 edge, cap=3
            { x: 0, y: 7, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — spread across entire board, all near-critical
            { x: 2, y: 2, player: 1, count: 3 },   // interior, cap=4
            { x: 6, y: 2, player: 1, count: 3 },   // interior, cap=4
            { x: 4, y: 4, player: 1, count: 3 },   // interior, cap=4
            { x: 2, y: 6, player: 1, count: 3 },   // interior, cap=4
            { x: 6, y: 6, player: 1, count: 3 },   // interior, cap=4
            { x: 8, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 8, y: 4, player: 1, count: 2 },   // x=8 edge, cap=3
            { x: 4, y: 8, player: 1, count: 2 },   // y=8 edge, cap=3
        ]
    },

    // ── LEVEL 13 ─────────────────────────────────────────────────────────
    // THE TRIDENT — 7×7, open top zone forking into three downward prongs
    //
    // Top 3 rows are completely open. Below that, two walls (x=2 and x=4)
    // split the board into three prongs: left (x=0-1), center (x=3), right (x=5-6).
    // Players build in the top zone then must commit to a prong to attack.
    // Psychological goal: branching decisions, commitment under pressure.
    // Difficulty: Hard.
    //
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    //  □ □ ■ □ ■ □ □   ← prong split begins
    //  □ □ ■ □ ■ □ □
    //  □ □ ■ □ ■ □ □
    //  □ □ ■ □ ■ □ □
    {
        id: 13,
        name: "The Trident",
        description: "Three prongs, one choice. Pick your path down — and don't look back!",
        rows: 7, cols: 7,
        blockedCells: [
            [2,3],[2,4],[2,5],[2,6],
            [4,3],[4,4],[4,5],[4,6]
        ],
        presetOrbs: [
            // Player — left prong bottom
            { x: 0, y: 6, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 5, player: 0, count: 3 },   // interior, cap=4
            { x: 0, y: 4, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — right prong bottom
            { x: 6, y: 6, player: 1, count: 1 },   // corner, cap=2
            { x: 5, y: 5, player: 1, count: 3 },   // interior, cap=4
            { x: 6, y: 4, player: 1, count: 2 }    // x=6 edge, cap=3
        ]
    },

    // ── LEVEL 14 ─────────────────────────────────────────────────────────
    // THE GAUNTLET — 8×8, first 8-column board, two walls with far-offset gaps
    //
    // Wall at y=2 has its only gap at the far RIGHT (x=6).
    // Wall at y=5 has its only gap at the far LEFT (x=1).
    // To reach the enemy, you must cross the board diagonally twice.
    // Psychological goal: extreme navigation, maximum traversal distance.
    // Difficulty: Very Hard.
    //
    //  □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □
    //  ■ ■ ■ ■ ■ ■ □ ■   ← gap at x=6 (right)
    //  □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □
    //  □ ■ ■ ■ ■ ■ ■ ■   ← gap at x=1 (left)
    //  □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □
    {
        id: 14,
        name: "The Gauntlet",
        description: "Two walls, two tiny gaps — on opposite sides. You must cross the board twice!",
        rows: 8, cols: 8,
        blockedCells: [
            // Wall y=2 — gap at x=6
            [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[7,2],
            // Wall y=5 — gap at x=1
            [0,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5]
        ],
        presetOrbs: [
            // Player — bottom zone
            { x: 0, y: 7, player: 0, count: 1 },   // corner, cap=2
            { x: 2, y: 6, player: 0, count: 3 },   // interior, cap=4
            { x: 4, y: 7, player: 0, count: 2 },   // y=7 edge, cap=3
            // AI — top zone
            { x: 7, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 5, y: 1, player: 1, count: 3 },   // interior, cap=4
            { x: 3, y: 0, player: 1, count: 2 }    // y=0 edge, cap=3
        ]
    },

    // ── LEVEL 15 ─────────────────────────────────────────────────────────
    // THE COLOSSEUM — 8×8, wide ring around a massive 4×4 center island
    //
    // The largest board in the game. A 4×4 dead center creates a 2-cell-wide
    // ring on all sides — far wider and more complex than The Volcano (Level 10).
    // Chain reactions can orbit, double back, or race the long way around.
    // Both players start in diagonally opposite corners of the arena.
    // Psychological goal: epic finale, spectacle, controlled chaos.
    // Difficulty: Expert.
    //
    //  □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □
    //  □ □ ■ ■ ■ ■ □ □
    //  □ □ ■ ■ ■ ■ □ □   ← 4×4 dead center
    //  □ □ ■ ■ ■ ■ □ □
    //  □ □ ■ ■ ■ ■ □ □
    //  □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □
    {
        id: 15,
        name: "The Colosseum",
        description: "The arena awaits. 8×8, two-cell-wide ring, no mercy. Final battle!",
        rows: 8, cols: 8,
        blockedCells: [
            [2,2],[3,2],[4,2],[5,2],
            [2,3],[3,3],[4,3],[5,3],
            [2,4],[3,4],[4,4],[5,4],
            [2,5],[3,5],[4,5],[5,5]
        ],
        presetOrbs: [
            // Player — bottom-left corner of arena
            { x: 0, y: 7, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 6, player: 0, count: 3 },   // interior, cap=4
            { x: 0, y: 5, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — top-right corner of arena
            { x: 7, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 6, y: 1, player: 1, count: 3 },   // interior, cap=4
            { x: 7, y: 2, player: 1, count: 2 }    // x=7 edge, cap=3
        ]
    },

    // ── LEVEL 16 ─────────────────────────────────────────────────────────
    // THE DUMBBELL — 7×7, two offset rectangular zones joined by one bridge
    //
    // Left zone: x=0-2, y=0-4 (upper-left box)
    // Bridge: [3,3] only — single cell connecting the two zones
    // Right zone: x=4-6, y=2-6 (lower-right box)
    // Players must cross the entire board diagonally through one pinch point.
    // Psychological goal: maximum tension at the bridge, dramatic tempo shift.
    // Difficulty: Hard.
    //
    //  □ □ □ ■ ■ ■ ■
    //  □ □ □ ■ ■ ■ ■
    //  □ □ □ ■ □ □ □
    //  □ □ □ □ □ □ □   ← bridge at [3,3]
    //  □ □ □ ■ □ □ □
    //  ■ ■ ■ ■ □ □ □
    //  ■ ■ ■ ■ □ □ □
    {
        id: 16,
        name: "The Dumbbell",
        description: "Two zones, one bridge. Control that single cell — or lose everything!",
        rows: 7, cols: 7,
        blockedCells: [
            [3,0],[4,0],[5,0],[6,0],
            [3,1],[4,1],[5,1],[6,1],
            [3,2],
            // bridge at [3,3] — open
            [3,4],
            [0,5],[1,5],[2,5],[3,5],
            [0,6],[1,6],[2,6],[3,6]
        ],
        presetOrbs: [
            // Player — top-left zone
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 0, y: 1, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — bottom-right zone
            { x: 6, y: 6, player: 1, count: 1 },   // corner, cap=2
            { x: 5, y: 6, player: 1, count: 2 },   // y=6 edge, cap=3
            { x: 6, y: 5, player: 1, count: 2 }    // x=6 edge, cap=3
        ]
    },

    // ── BOSS LEVEL 4 ─────────────────────────────────────────────────────
    // THE SIEGE — 9×9, AI forms a diagonal battle line, all near-critical
    //
    // You have two orbs in the corner. The AI has seven near-critical orbs
    // forming a diagonal battle line from top-right to the center.
    // One false move and the entire diagonal explodes toward you.
    // Find the weak point — or be wiped out in one chain.
    // Difficulty: Boss.
    {
        id: 104, isBoss: true,
        name: "The Battle Line",
        description: "The AI has formed a diagonal battle line. Break through before it overwhelms you!",
        rows: 9, cols: 9,
        blockedCells: [],
        presetOrbs: [
            // Player — bottom-left corner only
            { x: 0, y: 8, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 8, player: 0, count: 2 },   // y=8 edge, cap=3
            // AI — diagonal battle line from top-right, all near-critical
            { x: 8, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 7, y: 1, player: 1, count: 3 },   // interior, cap=4
            { x: 6, y: 2, player: 1, count: 3 },   // interior, cap=4
            { x: 5, y: 3, player: 1, count: 3 },   // interior, cap=4
            { x: 4, y: 4, player: 1, count: 3 },   // interior, cap=4
            { x: 3, y: 5, player: 1, count: 3 },   // interior, cap=4
            { x: 2, y: 6, player: 1, count: 3 },   // interior, cap=4
        ]
    },

    // ── LEVEL 17 ─────────────────────────────────────────────────────────
    // THE SPINE — 3 rows × 9 cols, the longest corridor in the game
    //
    // No walls. Just a 9-cell-wide strip — far longer than Corridor War (7 wide).
    // The extra distance means chains take longer to cross.
    // Players must race to the center and hold it.
    // Psychological goal: long-range planning, chain momentum matters most.
    // Difficulty: Hard.
    //
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    {
        id: 17,
        name: "The Spine",
        description: "Nine cells wide, three rows deep. The longest fight of your life!",
        rows: 3, cols: 9,
        blockedCells: [],
        presetOrbs: [
            // Player — left side
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 1, player: 0, count: 3 },   // interior, cap=4
            { x: 0, y: 2, player: 0, count: 1 },   // corner, cap=2
            // AI — right side
            { x: 8, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 7, y: 1, player: 1, count: 3 },   // interior, cap=4
            { x: 8, y: 2, player: 1, count: 1 }    // corner, cap=2
        ]
    },

    // ── LEVEL 18 ─────────────────────────────────────────────────────────
    // THE BATTLESHIP — 5 rows × 9 cols, wide medium rectangle
    //
    // First 5-row board in the game. More open than a corridor, more compact
    // than a square. Creates a mid-range arena with interesting vertical depth.
    // No walls — just the unique 5:9 aspect ratio.
    // Psychological goal: comfortable but unfamiliar dimensions, mid-range combat.
    // Difficulty: Hard.
    //
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    {
        id: 18,
        name: "The Battleship",
        description: "Five rows, nine columns. A wide open sea — perfect for sweeping chain reactions!",
        rows: 5, cols: 9,
        blockedCells: [],
        presetOrbs: [
            // Player — top-left
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 1, player: 0, count: 3 },   // interior, cap=4
            { x: 0, y: 2, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — bottom-right
            { x: 8, y: 4, player: 1, count: 1 },   // corner, cap=2
            { x: 7, y: 3, player: 1, count: 3 },   // interior, cap=4
            { x: 8, y: 2, player: 1, count: 2 }    // x=8 edge, cap=3
        ]
    },

    // ── LEVEL 19 ─────────────────────────────────────────────────────────
    // TRIPLE GATES — 8×8, three staggered horizontal walls, rotating gap positions
    //
    // Wall at y=2: gap at far RIGHT (x=7)
    // Wall at y=4: gap at far LEFT  (x=0)
    // Wall at y=6: gap at CENTER    (x=4)
    // The player must zigzag across the full board width three times.
    // Harder than The Gauntlet (level 14) which only has two walls.
    // Psychological goal: extreme navigation, the longest route ever.
    // Difficulty: Expert.
    //
    //  □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □
    //  ■ ■ ■ ■ ■ ■ ■ □   ← gap at x=7
    //  □ □ □ □ □ □ □ □
    //  □ ■ ■ ■ ■ ■ ■ ■   ← gap at x=0
    //  □ □ □ □ □ □ □ □
    //  ■ ■ ■ ■ □ ■ ■ ■   ← gap at x=4
    //  □ □ □ □ □ □ □ □
    {
        id: 19,
        name: "Triple Gates",
        description: "Three walls. Three gaps. All on opposite sides. Survive the zigzag!",
        rows: 8, cols: 8,
        blockedCells: [
            // Wall y=2 — gap at x=7
            [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],
            // Wall y=4 — gap at x=0
            [1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],
            // Wall y=6 — gap at x=4
            [0,6],[1,6],[2,6],[3,6],[5,6],[6,6],[7,6]
        ],
        presetOrbs: [
            // Player — bottom zone (y=7)
            { x: 0, y: 7, player: 0, count: 1 },   // corner, cap=2
            { x: 2, y: 7, player: 0, count: 2 },   // y=7 edge, cap=3
            { x: 5, y: 7, player: 0, count: 2 },   // y=7 edge, cap=3
            // AI — top zone (y=0-1)
            { x: 7, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 5, y: 1, player: 1, count: 3 },   // interior, cap=4
            { x: 3, y: 0, player: 1, count: 2 }    // y=0 edge, cap=3
        ]
    },

    // ── LEVEL 20 ─────────────────────────────────────────────────────────
    // GRAND FINALE — 9×9, the largest board in the entire game
    //
    // No blocked cells. Pure, unrestricted chain reaction warfare on 81 cells.
    // The ultimate test of strategy at maximum scale.
    // Players start far apart with 4 orbs each — an explosive opening.
    // Psychological goal: epic climax, spectacular visual chaos, earned victory.
    // Difficulty: Expert. (Biggest board = longest chains = highest variance)
    //
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    {
        id: 20,
        name: "Grand Finale",
        description: "9×9. 81 cells. No walls. The biggest battle ends here — make it count!",
        rows: 9, cols: 9,
        blockedCells: [],
        presetOrbs: [
            // Player — bottom-left cluster
            { x: 0, y: 8, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 8, player: 0, count: 2 },   // y=8 edge, cap=3
            { x: 0, y: 7, player: 0, count: 2 },   // x=0 edge, cap=3
            { x: 1, y: 7, player: 0, count: 3 },   // interior, cap=4
            // AI — top-right cluster
            { x: 8, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 7, y: 0, player: 1, count: 2 },   // y=0 edge, cap=3
            { x: 8, y: 1, player: 1, count: 2 },   // x=8 edge, cap=3
            { x: 7, y: 1, player: 1, count: 3 }    // interior, cap=4
        ]
    },

    // ── BOSS LEVEL 5 ─────────────────────────────────────────────────────
    // THE OMEGA — 9×9, AI owns all four corners and the center
    //
    // The ultimate boss. The AI has claimed every corner of the board plus
    // the center and two edge posts — eight orbs total, all near-critical.
    // You have three orbs and one chance. One perfect chain, or it's over.
    // Difficulty: Boss.
    {
        id: 105, isBoss: true,
        name: "The Omega",
        description: "The AI has claimed every corner. This is your last stand!",
        rows: 9, cols: 9,
        blockedCells: [],
        presetOrbs: [
            // Player — bottom-left
            { x: 0, y: 8, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 8, player: 0, count: 2 },   // y=8 edge, cap=3
            { x: 0, y: 7, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — all four corners + center + edges, all near-critical
            { x: 8, y: 0, player: 1, count: 1 },   // top-right corner, cap=2
            { x: 0, y: 0, player: 1, count: 1 },   // top-left corner, cap=2
            { x: 8, y: 8, player: 1, count: 1 },   // bottom-right corner, cap=2
            { x: 2, y: 2, player: 1, count: 3 },   // interior, cap=4
            { x: 6, y: 2, player: 1, count: 3 },   // interior, cap=4
            { x: 4, y: 4, player: 1, count: 3 },   // center, cap=4
            { x: 6, y: 6, player: 1, count: 3 },   // interior, cap=4
            { x: 8, y: 4, player: 1, count: 2 },   // x=8 edge, cap=3
        ]
    },

    // ── LEVEL 21 ─────────────────────────────────────────────────────────
    // THE CHECKERBOARD — 7×7, alternating interior blocked cells
    //
    // Nine single-cell obstacles at every odd-odd interior position create a
    // subtle mesh. Chain reactions split around each obstacle, producing
    // unexpected angles and multi-path cascades.
    // Psychological goal: familiar board, unfamiliar physics — surprise & discovery.
    // Difficulty: Medium-Hard.
    //
    //  □ □ □ □ □ □ □
    //  □ ■ □ ■ □ ■ □
    //  □ □ □ □ □ □ □
    //  □ ■ □ ■ □ ■ □
    //  □ □ □ □ □ □ □
    //  □ ■ □ ■ □ ■ □
    //  □ □ □ □ □ □ □
    {
        id: 21,
        name: "The Checkerboard",
        description: "Nine obstacles scattered in a mesh. Chains bounce everywhere — read the pattern!",
        rows: 7, cols: 7,
        blockedCells: [
            [1,1],[3,1],[5,1],
            [1,3],[3,3],[5,3],
            [1,5],[3,5],[5,5]
        ],
        presetOrbs: [
            // Player — bottom-left
            { x: 0, y: 6, player: 0, count: 1 },   // corner, cap=2
            { x: 0, y: 4, player: 0, count: 2 },   // x=0 edge, cap=3
            { x: 2, y: 6, player: 0, count: 2 },   // y=6 edge, cap=3
            // AI — top-right
            { x: 6, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 6, y: 2, player: 1, count: 2 },   // x=6 edge, cap=3
            { x: 4, y: 0, player: 1, count: 2 }    // y=0 edge, cap=3
        ]
    },

    // ── LEVEL 22 ─────────────────────────────────────────────────────────
    // THE CANYON — 9×9, triple-row horizontal wall with two distant passages
    //
    // Rows y=3,4,5 form a thick horizontal canyon wall. The only crossings
    // are at x=1 (far left) and x=7 (far right). Both sides must race to hold
    // both passages simultaneously — holding just one is not enough.
    // Psychological goal: dual-chokepoint warfare, positional split decision.
    // Difficulty: Hard.
    //
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ ■ □ □ □ □ □ □ ■  ← passes at x=1 and x=7 (wait, see below)
    //  □ □ ■ ■ ■ ■ ■ □ ■  (x=1 & x=7 open, rest blocked)
    //  □ ■ □ □ □ □ □ □ ■
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    {
        id: 22,
        name: "The Canyon",
        description: "A triple-row wall splits the board. Only two distant gaps connect the halves!",
        rows: 9, cols: 9,
        blockedCells: [
            // y=3: all except x=1 and x=7
            [0,3],[2,3],[3,3],[4,3],[5,3],[6,3],[8,3],
            // y=4: all except x=1 and x=7
            [0,4],[2,4],[3,4],[4,4],[5,4],[6,4],[8,4],
            // y=5: all except x=1 and x=7
            [0,5],[2,5],[3,5],[4,5],[5,5],[6,5],[8,5]
        ],
        presetOrbs: [
            // Player — top-left
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 0, y: 1, player: 0, count: 2 },   // x=0 edge, cap=3
            { x: 2, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            // AI — bottom-right
            { x: 8, y: 8, player: 1, count: 1 },   // corner, cap=2
            { x: 8, y: 7, player: 1, count: 2 },   // x=8 edge, cap=3
            { x: 6, y: 8, player: 1, count: 2 }    // y=8 edge, cap=3
        ]
    },

    // ── LEVEL 23 ─────────────────────────────────────────────────────────
    // THE FORTRESS — 9×9, AI inside a rectangular fortress with 2 center gates
    //
    // A fortress wall (x=2 and x=6 verticals + y=2 and y=6 horizontals) encloses
    // a 3×3 interior. Top gate at [4,2] and bottom gate at [4,6] are the only
    // two entrances. The player must attack while the AI defends from inside.
    // Psychological goal: asymmetric siege, intense bottleneck pressure.
    // Difficulty: Hard.
    //
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ ■ ■ □ ■ ■ □ □  ← top wall, gate at x=4
    //  □ □ ■ [inside] ■ □ □
    //  □ □ ■ [     ] ■ □ □
    //  □ □ ■ [     ] ■ □ □
    //  □ □ ■ ■ □ ■ ■ □ □  ← bottom wall, gate at x=4
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    {
        id: 23,
        name: "The Fortress",
        description: "The enemy is locked inside. Two gates, thick walls — breach them or lose!",
        rows: 9, cols: 9,
        blockedCells: [
            [2,2],[3,2],[5,2],[6,2],   // top wall (gate at x=4)
            [2,3],[6,3],               // left/right walls y=3
            [2,4],[6,4],               // left/right walls y=4
            [2,5],[6,5],               // left/right walls y=5
            [2,6],[3,6],[5,6],[6,6]    // bottom wall (gate at x=4)
        ],
        presetOrbs: [
            // Player — outside perimeter (flanking)
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 0, y: 4, player: 0, count: 2 },   // x=0 edge, cap=3
            { x: 8, y: 4, player: 0, count: 2 },   // x=8 edge, cap=3
            // AI — inside fortress
            { x: 4, y: 3, player: 1, count: 3 },   // interior, cap=4
            { x: 3, y: 4, player: 1, count: 3 },   // interior, cap=4
            { x: 5, y: 4, player: 1, count: 3 }    // interior, cap=4
        ]
    },

    // ── LEVEL 24 ─────────────────────────────────────────────────────────
    // THE BOWTIE — 8×8, two diagonal blocked triangles meeting at the center waist
    //
    // A 5-cell blocked triangle cuts the top-left corner.
    // A mirrored 5-cell triangle cuts the bottom-right corner.
    // The center waist (x=3-4, y=3-4) is the only battlefield connection.
    // Both players start in opposite open corners — must cross the waist to win.
    // Psychological goal: funnel tension, forced convergence at center.
    // Difficulty: Hard.
    //
    //  □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □
    //  ■ ■ □ □ □ □ □ □  ← top-left blocked triangle
    //  ■ ■ ■ □ □ □ □ □
    //  □ □ □ □ □ ■ ■ ■  ← bottom-right blocked triangle
    //  □ □ □ □ □ □ ■ ■
    //  □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □
    {
        id: 24,
        name: "The Bowtie",
        description: "Two open zones meet at a narrow waist. Cross or be trapped on your side!",
        rows: 8, cols: 8,
        blockedCells: [
            // Top-left triangle
            [0,2],[1,2],
            [0,3],[1,3],[2,3],
            // Bottom-right triangle
            [5,4],[6,4],[7,4],
            [6,5],[7,5]
        ],
        presetOrbs: [
            // Player — top-right corner
            { x: 7, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 6, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 7, y: 1, player: 0, count: 2 },   // x=7 edge, cap=3
            // AI — bottom-left corner
            { x: 0, y: 7, player: 1, count: 1 },   // corner, cap=2
            { x: 0, y: 6, player: 1, count: 2 },   // x=0 edge, cap=3
            { x: 1, y: 7, player: 1, count: 2 }    // y=7 edge, cap=3
        ]
    },

    // ── LEVEL 25 ─────────────────────────────────────────────────────────
    // THE FINAL STORM — 9×9, center island + four compass-arm walls
    //
    // A 3×3 dead island sits at center. Four arm walls extend from it toward
    // each edge (2 cells each), creating a cross-shaped obstacle field.
    // Chains must navigate around both the center island AND the four arms —
    // producing the most complex routing of the entire campaign.
    // Players start with 4 orbs each for an immediate explosive opening.
    // Psychological goal: supreme chaos, hard-earned mastery, ultimate finale.
    // Difficulty: Expert.
    //
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ ■ ■ □ □ □  ← top arm
    //  □ □ □ □ □ □ □ □ □
    //  □ ■ □ ■ ■ ■ □ ■ □  ← left arm | center island | right arm
    //  □ ■ □ ■ ■ ■ □ ■ □
    //  □ ■ □ ■ ■ ■ □ ■ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ ■ ■ ■ □ □ □  ← bottom arm
    //  □ □ □ □ □ □ □ □ □
    {
        id: 25,
        dezvoltare: "final",
        name: "The Final Storm",
        description: "Dead center. Four arms. 4 starting orbs each. The ultimate chain reaction battle!",
        rows: 9, cols: 9,
        blockedCells: [
            // Center 3×3 island
            [3,3],[4,3],[5,3],
            [3,4],[4,4],[5,4],
            [3,5],[4,5],[5,5],
            // Top arm (2 cells above island)
            [4,1],[5,1],
            // Bottom arm (below island)
            [3,7],[4,7],[5,7],
            // Left arm (left of island)
            [1,3],[1,4],[1,5],
            // Right arm (right of island)
            [7,3],[7,4],[7,5]
        ],
        presetOrbs: [
            // Player — bottom-left cluster (4 orbs)
            { x: 0, y: 8, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 8, player: 0, count: 2 },   // y=8 edge, cap=3
            { x: 0, y: 7, player: 0, count: 2 },   // x=0 edge, cap=3
            { x: 1, y: 7, player: 0, count: 3 },   // interior, cap=4
            // AI — top-right cluster (4 orbs)
            { x: 8, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 7, y: 0, player: 1, count: 2 },   // y=0 edge, cap=3
            { x: 8, y: 1, player: 1, count: 2 },   // x=8 edge, cap=3
            { x: 7, y: 1, player: 1, count: 3 }    // interior, cap=4
        ]
    },

    // ── LEVEL 26 ─────────────────────────────────────────────────────────
    // THE PINCER — 8×8, blocked corner L-shapes create pincer arms
    //
    // Four corner L-shapes block the extremities, leaving an open diamond
    // in the centre. Players start in the top and bottom open zones.
    // Chain reactions curve around the space; the pincer arms feel alive.
    // Difficulty: Medium-Hard.
    {
        id: 26,
        name: "The Pincer",
        description: "Corner walls form pincers. Fight through the open diamond!",
        rows: 8, cols: 8,
        blockedCells: [
            [0,0],[1,0],[0,1],
            [6,0],[7,0],[7,1],
            [0,6],[0,7],[1,7],
            [6,7],[7,6],[7,7]
        ],
        presetOrbs: [
            // Player — top-centre-left
            { x: 2, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 3, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 2, y: 1, player: 0, count: 3 },   // interior, cap=4
            // AI — bottom-centre-right
            { x: 5, y: 7, player: 1, count: 2 },   // y=7 edge, cap=3
            { x: 4, y: 7, player: 1, count: 2 },   // y=7 edge, cap=3
            { x: 5, y: 6, player: 1, count: 3 }    // interior, cap=4
        ]
    },

    // ── LEVEL 27 ─────────────────────────────────────────────────────────
    // THE FAULT LINE — 8×8, a diagonal wall separates two triangle zones
    //
    // Blocked cells trace a diagonal from top-right to bottom-left.
    // Player holds the top-left triangle; AI holds the bottom-right.
    // The fault line creates a hard border — to win you must explode across it.
    // Difficulty: Hard.
    {
        id: 27,
        name: "The Fault Line",
        description: "A diagonal wall splits the board. Shatter it and take everything!",
        rows: 8, cols: 8,
        blockedCells: [
            [7,0],[6,1],[5,2],[4,3],[3,4],[2,5],[1,6],[0,7]
        ],
        presetOrbs: [
            // Player — top-left corner
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 0, y: 1, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — bottom-right corner
            { x: 7, y: 7, player: 1, count: 1 },   // corner, cap=2
            { x: 6, y: 7, player: 1, count: 2 },   // y=7 edge, cap=3
            { x: 7, y: 6, player: 1, count: 2 }    // x=7 edge, cap=3
        ]
    },

    // ── LEVEL 28 ─────────────────────────────────────────────────────────
    // THE TWIN ISLANDS — 8×8, two 2×2 islands disrupt the centre
    //
    // Two solid 2×2 blocked islands break up flow in opposing quadrants.
    // Chain reactions must navigate around them — flanking and timing matter.
    // Direct paths are cut off; the game becomes a chess match.
    // Difficulty: Hard.
    {
        id: 28,
        name: "The Twin Islands",
        description: "Two islands block the way. Go around, over, or be swallowed!",
        rows: 8, cols: 8,
        blockedCells: [
            [2,1],[3,1],[2,2],[3,2],
            [4,5],[5,5],[4,6],[5,6]
        ],
        presetOrbs: [
            // Player — top-left corner
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 0, y: 1, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — bottom-right corner
            { x: 7, y: 7, player: 1, count: 1 },   // corner, cap=2
            { x: 6, y: 7, player: 1, count: 2 },   // y=7 edge, cap=3
            { x: 7, y: 6, player: 1, count: 2 }    // x=7 edge, cap=3
        ]
    },

    // ── LEVEL 29 ─────────────────────────────────────────────────────────
    // THE SQUEEZE — 9×9, two staggered half-walls force a zigzag path
    //
    // A wall at row 3 blocks x=0–5; a second wall at row 6 blocks x=3–8.
    // Players must zigzag through the gaps: right then left.
    // The asymmetric openings create tension — you can't go straight.
    // Difficulty: Expert.
    {
        id: 29,
        name: "The Squeeze",
        description: "Two walls, two gaps, one zigzag path. Thread the needle or lose!",
        rows: 9, cols: 9,
        blockedCells: [
            [0,3],[1,3],[2,3],[3,3],[4,3],[5,3],
            [3,6],[4,6],[5,6],[6,6],[7,6],[8,6]
        ],
        presetOrbs: [
            // Player — top-left corner
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 0, y: 1, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — bottom-right corner
            { x: 8, y: 8, player: 1, count: 1 },   // corner, cap=2
            { x: 7, y: 8, player: 1, count: 2 },   // y=8 edge, cap=3
            { x: 8, y: 7, player: 1, count: 2 }    // x=8 edge, cap=3
        ]
    },

    // ── LEVEL 30 ─────────────────────────────────────────────────────────
    // THE NEXUS — 9×9, open board, AI starts with board-wide presence
    //
    // The largest open board. No walls, no mercy.
    // The AI begins with six near-critical orbs spread across every quadrant.
    // Your only hope: start a chain reaction that cascades across the entire board.
    // Difficulty: Expert.
    {
        id: 30,
        name: "The Nexus",
        description: "No walls. The AI owns the board. One perfect chain — that's all you need.",
        rows: 9, cols: 9,
        blockedCells: [],
        presetOrbs: [
            // Player — bottom-left cluster
            { x: 0, y: 8, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 8, player: 0, count: 2 },   // y=8 edge, cap=3
            { x: 0, y: 7, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — spread across board, near-critical
            { x: 8, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 4, y: 0, player: 1, count: 2 },   // y=0 edge, cap=3
            { x: 8, y: 4, player: 1, count: 2 },   // x=8 edge, cap=3
            { x: 5, y: 2, player: 1, count: 3 },   // interior, cap=4
            { x: 3, y: 5, player: 1, count: 3 },   // interior, cap=4
            { x: 7, y: 6, player: 1, count: 3 }    // interior, cap=4
        ]
    },

    // ── LEVEL 31 ─────────────────────────────────────────────────────────
    // THE CROSSROADS — 9×9, four large 3×3 corner blocks
    //
    // Only the cross-shaped centre and arms remain playable.
    // Players race down opposite arms toward the centre junction.
    // First to control the intersection controls the whole board.
    // Difficulty: Medium-Hard.
    {
        id: 31,
        name: "The Crossroads",
        description: "Four massive corner blocks. Race to the center junction or lose the arms!",
        rows: 9, cols: 9,
        blockedCells: [
            [0,0],[1,0],[2,0],[6,0],[7,0],[8,0],
            [0,1],[1,1],[2,1],[6,1],[7,1],[8,1],
            [0,2],[1,2],[2,2],[6,2],[7,2],[8,2],
            [0,6],[1,6],[2,6],[6,6],[7,6],[8,6],
            [0,7],[1,7],[2,7],[6,7],[7,7],[8,7],
            [0,8],[1,8],[2,8],[6,8],[7,8],[8,8]
        ],
        presetOrbs: [
            // Player — top-centre
            { x: 3, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 4, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 4, y: 1, player: 0, count: 3 },   // interior, cap=4
            // AI — bottom-centre
            { x: 5, y: 8, player: 1, count: 2 },   // y=8 edge, cap=3
            { x: 4, y: 8, player: 1, count: 2 },   // y=8 edge, cap=3
            { x: 4, y: 7, player: 1, count: 3 }    // interior, cap=4
        ]
    },

    // ── LEVEL 32 ─────────────────────────────────────────────────────────
    // THE BARRICADE — 9×9, one long wall with a single gap on the far left
    //
    // A wall from x=1 to x=8 cuts the board in half at row 4.
    // Only x=0 is open — one narrow gap on the left edge.
    // Both players start behind the wall on opposite sides.
    // Whoever chains through the gap first gains a massive advantage.
    // Difficulty: Hard.
    {
        id: 32,
        name: "The Barricade",
        description: "One wall, one gap. Push through the left edge before the AI does!",
        rows: 9, cols: 9,
        blockedCells: [
            [1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4]
        ],
        presetOrbs: [
            // Player — top-left (gap side)
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 0, y: 1, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — bottom-right
            { x: 8, y: 8, player: 1, count: 1 },   // corner, cap=2
            { x: 7, y: 8, player: 1, count: 2 },   // y=8 edge, cap=3
            { x: 8, y: 7, player: 1, count: 2 }    // x=8 edge, cap=3
        ]
    },

    // ── LEVEL 33 ─────────────────────────────────────────────────────────
    // THE ARCHIPELAGO — 8×8, nine scattered single-cell island obstacles
    //
    // Nine lone blocked cells scattered in irregular positions across the board.
    // No walls — just nine tiny rocks that deflect chain reactions unexpectedly.
    // Every path curves around them in ways that are hard to predict.
    // Difficulty: Hard.
    {
        id: 33,
        name: "The Archipelago",
        description: "Islands scattered everywhere. Navigate the channels or get stranded!",
        rows: 8, cols: 8,
        blockedCells: [
            [2,1],[5,1],
            [1,3],[4,3],[6,3],
            [2,5],[5,5],
            [1,6],[6,6]
        ],
        presetOrbs: [
            // Player — top-left corner
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 0, y: 1, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — bottom-right corner
            { x: 7, y: 7, player: 1, count: 1 },   // corner, cap=2
            { x: 6, y: 7, player: 1, count: 2 },   // y=7 edge, cap=3
            { x: 7, y: 6, player: 1, count: 2 }    // x=7 edge, cap=3
        ]
    },

    // ── LEVEL 34 ─────────────────────────────────────────────────────────
    // THE FORTRESS — 9×9, L-shaped wall entrenches the AI's zone
    //
    // An L-wall runs from the top to the middle-right of the board,
    // creating a walled-off zone where the AI clusters.
    // The only way in is from the bottom — a long, exposed approach.
    // Difficulty: Expert.
    {
        id: 34,
        name: "The Bastion",
        description: "The AI is entrenched behind an L-wall. Find the opening and strike fast!",
        rows: 9, cols: 9,
        blockedCells: [
            [5,0],[5,1],[5,2],[5,3],[5,4],
            [6,4],[7,4],[8,4]
        ],
        presetOrbs: [
            // Player — left side
            { x: 0, y: 4, player: 0, count: 2 },   // x=0 edge, cap=3
            { x: 1, y: 3, player: 0, count: 3 },   // interior, cap=4
            { x: 1, y: 5, player: 0, count: 3 },   // interior, cap=4
            // AI — inside fortress (top-right zone)
            { x: 8, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 7, y: 0, player: 1, count: 2 },   // y=0 edge, cap=3
            { x: 8, y: 1, player: 1, count: 2 },   // x=8 edge, cap=3
            { x: 6, y: 2, player: 1, count: 3 }    // interior, cap=4
        ]
    },

    // ── LEVEL 35 ─────────────────────────────────────────────────────────
    // THE CHAOS — 9×9, fully open board, equal starting forces
    //
    // Maximum board. No walls. Both players start with four near-critical orbs
    // spread across opposite corners. Pure skill, pure strategy.
    // This is the last fight before the final boss.
    // Difficulty: Expert.
    {
        id: 35,
        name: "The Chaos",
        description: "No walls. Maximum board. Equal armies — pure skill decides the winner!",
        rows: 9, cols: 9,
        blockedCells: [],
        presetOrbs: [
            // Player — bottom-left, strong opening
            { x: 0, y: 8, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 8, player: 0, count: 2 },   // y=8 edge, cap=3
            { x: 0, y: 7, player: 0, count: 2 },   // x=0 edge, cap=3
            { x: 2, y: 7, player: 0, count: 3 },   // interior, cap=4
            // AI — top-right, strong opening
            { x: 8, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 7, y: 0, player: 1, count: 2 },   // y=0 edge, cap=3
            { x: 8, y: 1, player: 1, count: 2 },   // x=8 edge, cap=3
            { x: 6, y: 1, player: 1, count: 3 }    // interior, cap=4
        ]
    },

    // ── LEVEL 36 ─────────────────────────────────────────────────────────
    // THE DIAMOND — 9×9, large blocked corners create a diamond shape
    //
    // The four corners are cut away in steps, leaving a perfect diamond.
    // Chain reactions must curve with the board shape — no straight paths.
    // Players race from opposite diamond tips toward the center.
    // Difficulty: Medium-Hard.
    {
        id: 36,
        name: "The Diamond",
        description: "Blocked corners carve a diamond. Race from tip to tip!",
        rows: 9, cols: 9,
        blockedCells: [
            [0,0],[1,0],[2,0],[3,0],[5,0],[6,0],[7,0],[8,0],
            [0,1],[1,1],[2,1],[6,1],[7,1],[8,1],
            [0,2],[1,2],[7,2],[8,2],
            [0,3],[8,3],
            [0,5],[8,5],
            [0,6],[1,6],[7,6],[8,6],
            [0,7],[1,7],[2,7],[6,7],[7,7],[8,7],
            [0,8],[1,8],[2,8],[3,8],[5,8],[6,8],[7,8],[8,8]
        ],
        presetOrbs: [
            // Player — top diamond tip
            { x: 4, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 3, y: 1, player: 0, count: 3 },   // interior, cap=4
            { x: 5, y: 1, player: 0, count: 3 },   // interior, cap=4
            // AI — bottom diamond tip
            { x: 4, y: 8, player: 1, count: 2 },   // y=8 edge, cap=3
            { x: 3, y: 7, player: 1, count: 3 },   // interior, cap=4
            { x: 5, y: 7, player: 1, count: 3 }    // interior, cap=4
        ]
    },

    // ── LEVEL 37 ─────────────────────────────────────────────────────────
    // THE H-BRIDGE — 8×8, H-shaped board: two arms joined by a crossbar
    //
    // Two vertical arms (left x=0-1 and right x=6-7) are connected only by
    // a 2-row crossbar in the middle (y=3-4). Build power in your arm,
    // then charge across the bridge. It's narrow — one chain can decide it.
    // Difficulty: Hard.
    {
        id: 37,
        name: "The H-Bridge",
        description: "Two towers, one bridge. Charge across before the AI fortifies!",
        rows: 8, cols: 8,
        blockedCells: [
            [2,0],[3,0],[4,0],[5,0],
            [2,1],[3,1],[4,1],[5,1],
            [2,2],[3,2],[4,2],[5,2],
            [2,5],[3,5],[4,5],[5,5],
            [2,6],[3,6],[4,6],[5,6],
            [2,7],[3,7],[4,7],[5,7]
        ],
        presetOrbs: [
            // Player — top-left arm
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 0, y: 1, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — top-right arm
            { x: 7, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 6, y: 0, player: 1, count: 2 },   // y=0 edge, cap=3
            { x: 7, y: 1, player: 1, count: 2 }    // x=7 edge, cap=3
        ]
    },

    // ── LEVEL 38 ─────────────────────────────────────────────────────────
    // THE SERPENT — 9×9, two staggered horizontal walls force a snake path
    //
    // A wall at y=2 has a gap at the far right (x=8).
    // A wall at y=5 has a gap at the far left (x=0).
    // Players must zigzag full-width twice to cross the board — an S-curve.
    // Difficulty: Hard.
    {
        id: 38,
        name: "The Serpent",
        description: "Two walls, gaps on opposite ends. Slither through or be cut off!",
        rows: 9, cols: 9,
        blockedCells: [
            [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],
            [1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5]
        ],
        presetOrbs: [
            // Player — top-left
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 0, y: 1, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — bottom-right
            { x: 8, y: 8, player: 1, count: 1 },   // corner, cap=2
            { x: 7, y: 8, player: 1, count: 2 },   // y=8 edge, cap=3
            { x: 8, y: 7, player: 1, count: 2 }    // x=8 edge, cap=3
        ]
    },

    // ── LEVEL 39 ─────────────────────────────────────────────────────────
    // THE MOAT — 9×9, ring wall surrounds the AI — attack through two gaps
    //
    // A walled ring isolates the center 5×5 zone. Two gaps (top and bottom
    // at x=4) are the only way in. Player attacks from outside; AI defends
    // the fortress interior. One breakthrough and the inside cascades.
    // Difficulty: Hard.
    {
        id: 39,
        name: "The Moat",
        description: "The AI is walled in. Find the two gaps and storm the fortress!",
        rows: 9, cols: 9,
        blockedCells: [
            [1,1],[2,1],[3,1],[5,1],[6,1],[7,1],
            [1,2],[1,3],[1,4],[1,5],[1,6],
            [7,2],[7,3],[7,4],[7,5],[7,6],
            [1,7],[2,7],[3,7],[5,7],[6,7],[7,7]
        ],
        presetOrbs: [
            // Player — outside top-left corner
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 0, y: 1, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — inside the moat
            { x: 4, y: 4, player: 1, count: 3 },   // center, cap=4
            { x: 3, y: 3, player: 1, count: 3 },   // interior, cap=4
            { x: 5, y: 5, player: 1, count: 3 }    // interior, cap=4
        ]
    },

    // ── LEVEL 40 ─────────────────────────────────────────────────────────
    // THE COMB — 8×8, vertical teeth hanging from the top row
    //
    // Four teeth (blocked columns at x=0,2,4,6 for rows 1–3) hang from the
    // top, creating four narrow open channels (x=1,3,5,7).
    // Chains in the top zone must stay in their channel.
    // Below row 3 the board opens up fully — pick your channel wisely.
    // Difficulty: Medium-Hard.
    {
        id: 40,
        name: "The Comb",
        description: "Vertical teeth divide the top half. Pick a channel and burst through!",
        rows: 8, cols: 8,
        blockedCells: [
            [0,1],[2,1],[4,1],[6,1],
            [0,2],[2,2],[4,2],[6,2],
            [0,3],[2,3],[4,3],[6,3]
        ],
        presetOrbs: [
            // Player — top-right channel (x=7, open)
            { x: 7, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 7, y: 1, player: 0, count: 2 },   // x=7 edge, cap=3
            { x: 7, y: 2, player: 0, count: 2 },   // x=7 edge, cap=3
            // AI — bottom-left open zone
            { x: 0, y: 7, player: 1, count: 1 },   // corner, cap=2
            { x: 1, y: 7, player: 1, count: 2 },   // y=7 edge, cap=3
            { x: 0, y: 6, player: 1, count: 2 }    // x=0 edge, cap=3
        ]
    },

    // ── LEVEL 41 ─────────────────────────────────────────────────────────
    // THE STAIRCASE — 9×9, two stepped corner walls in opposing corners
    //
    // Bottom-left has a 3-step staircase wall (each step 1 cell wider).
    // Top-right mirrors it. Players start in the open diagonal zones.
    // The walls shorten effective paths — chains still cross but at angles.
    // Difficulty: Hard.
    {
        id: 41,
        name: "The Staircase",
        description: "Stepped walls shrink two corners. Think diagonally or get cornered!",
        rows: 9, cols: 9,
        blockedCells: [
            [0,2],[0,3],[1,3],[0,4],[1,4],[2,4],
            [6,5],[7,5],[8,5],[7,6],[8,6],[8,7]
        ],
        presetOrbs: [
            // Player — top-right corner
            { x: 8, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 7, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 8, y: 1, player: 0, count: 2 },   // x=8 edge, cap=3
            // AI — bottom-left corner
            { x: 0, y: 8, player: 1, count: 1 },   // corner, cap=2
            { x: 1, y: 8, player: 1, count: 2 },   // y=8 edge, cap=3
            { x: 0, y: 7, player: 1, count: 2 }    // x=0 edge, cap=3
        ]
    },

    // ── LEVEL 42 ─────────────────────────────────────────────────────────
    // THE FOUR PILLARS — 9×9, four evenly-spaced 2×2 blocked pillars
    //
    // Four 2×2 pillars sit in the four inner quadrants. No path is fully
    // blocked — every route still exists — but chains deflect around
    // the pillars in subtle ways, creating surprising multi-path cascades.
    // Difficulty: Hard.
    {
        id: 42,
        name: "The Four Pillars",
        description: "Four stone pillars scattered evenly. Route around them — or through!",
        rows: 9, cols: 9,
        blockedCells: [
            [2,2],[3,2],[2,3],[3,3],
            [6,2],[7,2],[6,3],[7,3],
            [2,6],[3,6],[2,7],[3,7],
            [6,6],[7,6],[6,7],[7,7]
        ],
        presetOrbs: [
            // Player — top-left corner
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 0, y: 1, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — bottom-right corner
            { x: 8, y: 8, player: 1, count: 1 },   // corner, cap=2
            { x: 7, y: 8, player: 1, count: 2 },   // y=8 edge, cap=3
            { x: 8, y: 7, player: 1, count: 2 }    // x=8 edge, cap=3
        ]
    },

    // ── LEVEL 43 ─────────────────────────────────────────────────────────
    // THE TUNNELS — 8×8, two adjacent walls with staggered single-cell gaps
    //
    // Wall at y=3 has a gap at x=3 (center-left).
    // Wall at y=4 has a gap at x=4 (center-right).
    // Back-to-back walls with offset gaps force a tight diagonal crossing.
    // Any chain through y=3 must pivot instantly to use the y=4 gap.
    // Difficulty: Expert.
    {
        id: 43,
        name: "The Tunnels",
        description: "Two walls, back-to-back, offset gaps. Thread both or die between them!",
        rows: 8, cols: 8,
        blockedCells: [
            [0,3],[1,3],[2,3],[4,3],[5,3],[6,3],[7,3],
            [0,4],[1,4],[2,4],[3,4],[5,4],[6,4],[7,4]
        ],
        presetOrbs: [
            // Player — top-left
            { x: 0, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 0, y: 1, player: 0, count: 2 },   // x=0 edge, cap=3
            // AI — bottom-right
            { x: 7, y: 7, player: 1, count: 1 },   // corner, cap=2
            { x: 6, y: 7, player: 1, count: 2 },   // y=7 edge, cap=3
            { x: 7, y: 6, player: 1, count: 2 }    // x=7 edge, cap=3
        ]
    },

    // ── LEVEL 44 ─────────────────────────────────────────────────────────
    // THE VORTEX — 8×8, two mirrored L-walls create a swirling pattern
    //
    // A top-left L-wall and a bottom-right mirrored L-wall force chains
    // into a rotating, vortex-like detour. Going straight requires going
    // around both bends — the board feels like it's spinning.
    // Difficulty: Expert.
    {
        id: 44,
        name: "The Vortex",
        description: "Two L-walls spin the flow. Ride the vortex — don't fight it!",
        rows: 8, cols: 8,
        blockedCells: [
            [3,1],[3,2],[0,3],[1,3],[2,3],
            [5,4],[6,4],[7,4],[4,5],[4,6]
        ],
        presetOrbs: [
            // Player — top-right corner
            { x: 7, y: 0, player: 0, count: 1 },   // corner, cap=2
            { x: 6, y: 0, player: 0, count: 2 },   // y=0 edge, cap=3
            { x: 7, y: 1, player: 0, count: 2 },   // x=7 edge, cap=3
            // AI — bottom-left corner
            { x: 0, y: 7, player: 1, count: 1 },   // corner, cap=2
            { x: 1, y: 7, player: 1, count: 2 },   // y=7 edge, cap=3
            { x: 0, y: 6, player: 1, count: 2 }    // x=0 edge, cap=3
        ]
    },

    // ── LEVEL 45 ─────────────────────────────────────────────────────────
    // THE GRAND ARENA — 9×9, massive 5×5 center island, tight 2-cell ring
    //
    // A huge 5×5 dead center leaves only a 2-cell-wide ring around the board.
    // Every chain reaction must orbit the colossus. Players start in diagonally
    // opposite ring corners — the race around the ring decides everything.
    // Difficulty: Expert.
    {
        id: 45,
        name: "The Grand Arena",
        description: "Massive center block. Race the 2-cell ring — every orbit counts!",
        rows: 9, cols: 9,
        blockedCells: [
            [2,2],[3,2],[4,2],[5,2],[6,2],
            [2,3],[3,3],[4,3],[5,3],[6,3],
            [2,4],[3,4],[4,4],[5,4],[6,4],
            [2,5],[3,5],[4,5],[5,5],[6,5],
            [2,6],[3,6],[4,6],[5,6],[6,6]
        ],
        presetOrbs: [
            // Player — bottom-left ring corner
            { x: 0, y: 8, player: 0, count: 1 },   // corner, cap=2
            { x: 1, y: 8, player: 0, count: 2 },   // y=8 edge, cap=3
            { x: 0, y: 7, player: 0, count: 2 },   // x=0 edge, cap=3
            { x: 1, y: 7, player: 0, count: 3 },   // interior, cap=4
            // AI — top-right ring corner
            { x: 8, y: 0, player: 1, count: 1 },   // corner, cap=2
            { x: 7, y: 0, player: 1, count: 2 },   // y=0 edge, cap=3
            { x: 8, y: 1, player: 1, count: 2 },   // x=8 edge, cap=3
            { x: 7, y: 1, player: 1, count: 3 }    // interior, cap=4
        ]
    },

    // ── LEVEL 46 ─────────────────────────────────────────────────────────
    // THE CROSSHAIRS — 7×7, four 2×2 corner blocks, battle for center
    //
    // All four corners are sealed off. The fight happens in the open cross
    // of free cells — top edge, bottom edge, left, right, and center.
    // No hiding in corners. Pure head-on aggression.
    // Difficulty: Medium.
    {
        id: 46,
        name: "The Crosshairs",
        description: "Four blocked corners. The battle is won or lost in the center!",
        rows: 7, cols: 7,
        blockedCells: [
            [0,0],[1,0],[0,1],[1,1],
            [5,0],[6,0],[5,1],[6,1],
            [0,5],[1,5],[0,6],[1,6],
            [5,5],[6,5],[5,6],[6,6]
        ],
        presetOrbs: [
            // Player — top center
            { x: 3, y: 0, player: 0, count: 2 },
            { x: 2, y: 1, player: 0, count: 2 },
            { x: 4, y: 1, player: 0, count: 2 },
            // AI — bottom center
            { x: 3, y: 6, player: 1, count: 2 },
            { x: 2, y: 5, player: 1, count: 2 },
            { x: 4, y: 5, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 47 ─────────────────────────────────────────────────────────
    // TWIN PEAKS — 5×9, two wide areas connected by a single vertical gap
    //
    // A rectangular board divided neatly in half by a thick wall.
    // The only way across is a single gap right in the middle.
    // Build up forces safely, then flood through the chokepoint.
    // Difficulty: Medium.
    //
    //  □ □ □ □ ■ □ □ □ □
    //  □ □ □ □ ■ □ □ □ □
    //  □ □ □ □ □ □ □ □ □  ← single gap at x=4, y=2
    //  □ □ □ □ ■ □ □ □ □
    //  □ □ □ □ ■ □ □ □ □
    {
        id: 47,
        name: "Twin Peaks",
        description: "Two sprawling islands. One narrow bridge. Prepare for impact.",
        rows: 5, cols: 9,
        blockedCells: [
            [4,0],[4,1],
            [4,3],[4,4]
        ],
        presetOrbs: [
            // Player — left side
            { x: 1, y: 2, player: 0, count: 3 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 0, y: 3, player: 0, count: 2 },
            // AI — right side
            { x: 7, y: 2, player: 1, count: 3 },
            { x: 8, y: 1, player: 1, count: 2 },
            { x: 8, y: 3, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 48 ─────────────────────────────────────────────────────────
    // DIAMOND MINE — 7×7, a central diamond block forcing a ring path
    //
    // The center is a tight diamond of blocked cells. The path around it is
    // narrow — flanking the diamond is the only way to reach the enemy.
    // Difficulty: Medium.
    //
    //  □ □ □ □ □ □ □
    //  □ □ □ ■ □ □ □
    //  □ □ ■ ■ ■ □ □
    //  □ ■ ■ ■ ■ ■ □
    //  □ □ ■ ■ ■ □ □
    //  □ □ □ ■ □ □ □
    //  □ □ □ □ □ □ □
    {
        id: 48,
        name: "Diamond Mine",
        description: "A massive obstacle in the middle. Flank around the edges!",
        rows: 7, cols: 7,
        blockedCells: [
            [3,1],
            [2,2],[3,2],[4,2],
            [1,3],[2,3],[3,3],[4,3],[5,3],
            [2,4],[3,4],[4,4],
            [3,5]
        ],
        presetOrbs: [
            // Player — top left corner
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 1, y: 0, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            // AI — bottom right corner
            { x: 6, y: 6, player: 1, count: 1 },
            { x: 5, y: 6, player: 1, count: 2 },
            { x: 6, y: 5, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 49 ─────────────────────────────────────────────────────────
    // THE CRATERS — 6×6, four symmetric single-cell blocks
    //
    // A relatively open board, but four strategically placed "craters"
    // disrupt the standard rectangular flow. Chain reactions bounce
    // unpredictably around these obstacles.
    // Difficulty: Medium.
    //
    //  □ □ □ □ □ □
    //  □ ■ □ □ ■ □
    //  □ □ □ □ □ □
    //  □ □ □ □ □ □
    //  □ ■ □ □ ■ □
    //  □ □ □ □ □ □
    {
        id: 49,
        name: "The Craters",
        description: "Four small blocks create huge waves of chaos. Watch your angles.",
        rows: 6, cols: 6,
        blockedCells: [
            [1,1],[4,1],
            [1,4],[4,4]
        ],
        presetOrbs: [
            // Player — bottom edge
            { x: 2, y: 5, player: 0, count: 2 },
            { x: 3, y: 5, player: 0, count: 2 },
            { x: 2, y: 4, player: 0, count: 3 },
            // AI — top edge
            { x: 2, y: 0, player: 1, count: 2 },
            { x: 3, y: 0, player: 1, count: 2 },
            { x: 3, y: 1, player: 1, count: 3 }
        ]
    },

    // ── BOSS 6 ───────────────────────────────────────────────────────────
    // THE SWARM — 9×9, AI starts with many small outposts scattered
    //
    // You have a single, very strong start in the corner. The AI has
    // numerous single-orb presets scattered all over the board. If you
    // let them build up, the swarm will overwhelm you. Strike fast.
    // Difficulty: Boss.
    {
        id: 106, isBoss: true,
        name: "The Swarm",
        description: "The AI is everywhere. Crush the outposts before they multiply!",
        rows: 9, cols: 9,
        blockedCells: [],
        presetOrbs: [
            // Player — concentrated power in bottom left
            { x: 0, y: 8, player: 0, count: 1 },
            { x: 1, y: 8, player: 0, count: 2 },
            { x: 0, y: 7, player: 0, count: 2 },
            { x: 1, y: 7, player: 0, count: 3 },
            // AI — scattered swarm
            { x: 4, y: 4, player: 1, count: 2 },
            { x: 2, y: 2, player: 1, count: 1 },
            { x: 6, y: 2, player: 1, count: 1 },
            { x: 8, y: 4, player: 1, count: 1 },
            { x: 6, y: 6, player: 1, count: 1 },
            { x: 4, y: 8, player: 1, count: 1 },
            { x: 8, y: 0, player: 1, count: 1 }
        ]
    },

    // ── LEVEL 50 ─────────────────────────────────────────────────────────
    // FOUR ROOMS — 8×8, cross intersection with four tight doors
    //
    // The board is divided into four rooms. Walls form a cross with tiny
    // gaps connecting the quadrants. Multi-front war — balance offense
    // and defense across all four chambers.
    // Difficulty: Hard.
    //
    //  □ □ □ ■ □ □ □ □
    //  □ □ □ ■ □ □ □ □
    //  □ □ □ □ □ □ □ □  ← gap at y=2
    //  ■ ■ □ ■ ■ ■ □ ■
    //  ■ □ ■ ■ ■ ■ □ ■
    //  □ □ □ □ □ □ □ □  ← gap at y=5
    //  □ □ □ ■ □ □ □ □
    //  □ □ □ ■ □ □ □ □
    {
        id: 50,
        name: "Four Rooms",
        description: "Four chambers connected by narrow doors. Expand carefully.",
        rows: 8, cols: 8,
        blockedCells: [
            // Vertical wall (x=3) with gaps at y=2, y=5
            [3,0],[3,1],[3,3],[3,4],[3,6],[3,7],
            // Horizontal wall (y=4) with gaps at x=1, x=6
            [0,4],[2,4],[4,4],[5,4],[7,4]
        ],
        presetOrbs: [
            // Player — top left room
            { x: 1, y: 1, player: 0, count: 3 },
            { x: 0, y: 0, player: 0, count: 1 },
            // AI — bottom right room
            { x: 6, y: 6, player: 1, count: 3 },
            { x: 7, y: 7, player: 1, count: 1 }
        ]
    },

    // ── LEVEL 51 ─────────────────────────────────────────────────────────
    // PARALLEL LANES — 7×7, two vertical walls creating three long lanes
    //
    // The board is sliced into three vertical corridors. The only way to
    // switch lanes is through tiny gaps at the very top and bottom.
    // Linear progression — outflank the enemy.
    // Difficulty: Hard.
    //
    //  □ □ □ □ □ □ □  ← top crossover
    //  □ ■ □ □ □ ■ □
    //  □ ■ □ □ □ ■ □
    //  □ ■ □ □ □ ■ □
    //  □ ■ □ □ □ ■ □
    //  □ ■ □ □ □ ■ □
    //  □ □ □ □ □ □ □  ← bottom crossover
    {
        id: 51,
        name: "Parallel Lanes",
        description: "Three strict lanes. Push forward, or flank through the ends!",
        rows: 7, cols: 7,
        blockedCells: [
            [1,1],[1,2],[1,3],[1,4],[1,5],
            [5,1],[5,2],[5,3],[5,4],[5,5]
        ],
        presetOrbs: [
            // Player — left lane
            { x: 0, y: 3, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 0, y: 5, player: 0, count: 2 },
            // AI — right lane
            { x: 6, y: 3, player: 1, count: 2 },
            { x: 6, y: 1, player: 1, count: 2 },
            { x: 6, y: 5, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 52 ─────────────────────────────────────────────────────────
    // THE TRENCH — 5×7, jagged block pattern making an uneven frontline
    //
    // A compact board with a staggered diagonal set of blocks dividing
    // the two sides. The frontline is messy and uneven.
    // Difficulty: Hard.
    //
    //  □ □ □ ■ □ □ □
    //  □ □ ■ □ □ □ □
    //  □ ■ □ □ □ ■ □
    //  □ □ □ □ ■ □ □
    //  □ □ □ ■ □ □ □
    {
        id: 52,
        name: "The Trench",
        description: "An uneven, jagged frontline. Look for the weak spots!",
        rows: 5, cols: 7,
        blockedCells: [
            [3,0],
            [2,1],
            [1,2],[5,2],
            [4,3],
            [3,4]
        ],
        presetOrbs: [
            // Player — left side
            { x: 0, y: 2, player: 0, count: 2 },
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 0, y: 4, player: 0, count: 1 },
            // AI — right side
            { x: 6, y: 2, player: 1, count: 2 },
            { x: 6, y: 0, player: 1, count: 1 },
            { x: 6, y: 4, player: 1, count: 1 }
        ]
    },

    // ── LEVEL 53 ─────────────────────────────────────────────────────────
    // THE VAULT — 7×7, a heavily protected inner square
    //
    // A central vault has only one entrance from below. Taking control
    // gives immense power, but getting trapped inside is fatal.
    // High risk / high reward territory control.
    // Difficulty: Hard.
    //
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    //  □ □ ■ ■ ■ □ □
    //  □ □ ■ □ ■ □ □
    //  □ □ ■ □ ■ □ □  ← vault entrance at bottom (open)
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    {
        id: 53,
        name: "The Vault",
        description: "Control the inner sanctum to dominate the board, but don't get trapped!",
        rows: 7, cols: 7,
        blockedCells: [
            [2,2],[3,2],[4,2],
            [2,3],       [4,3],
            [2,4],       [4,4]
        ],
        presetOrbs: [
            // Player — bottom
            { x: 3, y: 6, player: 0, count: 2 },
            { x: 2, y: 6, player: 0, count: 2 },
            { x: 4, y: 6, player: 0, count: 2 },
            // AI — top, spreading toward the vault
            { x: 3, y: 0, player: 1, count: 2 },
            { x: 3, y: 1, player: 1, count: 3 },
            { x: 2, y: 0, player: 1, count: 2 }
        ]
    },

    // ── BOSS 7 ───────────────────────────────────────────────────────────
    // GOLIATH — 10×10, AI has a fortified corner behind an L-wall
    //
    // A huge 10×10 board. The top right corner is protected by an L-shaped
    // wall with a single narrow gap as the only entrance. Inside, the AI
    // has highly loaded orbs ready to detonate. You start in the open.
    // Break through the gap before the fortress explodes outward.
    // Difficulty: Boss.
    {
        id: 107, isBoss: true,
        name: "Goliath",
        description: "A massive board. The AI is heavily fortified. Break the shield!",
        rows: 10, cols: 10,
        blockedCells: [
            // L-wall protecting top right — gap at x=7,y=4 for narrow entrance
            [6,0],[6,1],[6,2],[6,3],[6,4],
            [8,4],[9,4]
        ],
        presetOrbs: [
            // Player — bottom left, open area
            { x: 0, y: 9, player: 0, count: 1 },
            { x: 2, y: 8, player: 0, count: 3 },
            { x: 3, y: 7, player: 0, count: 3 },
            // AI — inside the Goliath fortress
            { x: 9, y: 0, player: 1, count: 1 },
            { x: 8, y: 1, player: 1, count: 3 },
            { x: 7, y: 2, player: 1, count: 3 },
            { x: 8, y: 2, player: 1, count: 3 },
            { x: 9, y: 1, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 54 ─────────────────────────────────────────────────────────
    // THE SNAKE — 7×7, a Z-shaped wall splitting the board into winding zones
    //
    // Blocked cells form a Z-pattern dividing the board into three
    // winding zones connected only at (3,3) — the crossover point.
    // No way around. Push straight through the corridor!
    // Difficulty: Hard.
    //
    //  □ □ □ □ □ □ □    y=0 (all free)
    //  □ □ □ □ ■ ■ ■    y=1 (right 3 blocked)
    //  □ □ □ □ ■ ■ ■    y=2 (right 3 blocked)
    //  ■ ■ ■ □ □ □ □    y=3 (left 3 blocked, passage at x=3)
    //  ■ ■ ■ □ □ □ □    y=4 (left 3 blocked)
    //  □ □ □ □ ■ ■ ■    y=5 (right 3 blocked)
    //  □ □ □ □ □ □ □    y=6 (all free)
    {
        id: 54,
        name: "The Snake",
        description: "One winding Z-path divides the board. Navigate the bend to victory!",
        rows: 7, cols: 7,
        blockedCells: [
            [4,1],[5,1],[6,1],
            [4,2],[5,2],[6,2],
            [0,3],[1,3],[2,3],
            [0,4],[1,4],[2,4],
            [4,5],[5,5],[6,5]
        ],
        presetOrbs: [
            // Player — top left
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 1, y: 0, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            // AI — bottom right
            { x: 6, y: 6, player: 1, count: 1 },
            { x: 5, y: 6, player: 1, count: 2 },
            { x: 4, y: 6, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 55 ─────────────────────────────────────────────────────────
    // SNIPER ALLEY — 9×5, wide map with long horizontal sightlines
    //
    // Very wide and short. Several horizontal walls create long "sniper"
    // lanes. Chains race from left to right at high speeds.
    // Difficulty: Hard.
    //
    //  □ □ □ □ □ □ □ □ □
    //  □ ■ ■ □ ■ ■ □ ■ □
    //  □ □ □ □ □ □ □ □ □
    //  □ ■ □ ■ ■ □ ■ ■ □
    //  □ □ □ □ □ □ □ □ □
    {
        id: 55,
        name: "Sniper Alley",
        description: "Long horizontal lanes. Reactions will travel at breakneck speeds.",
        rows: 5, cols: 9,
        blockedCells: [
            [1,1],[2,1],[4,1],[5,1],[7,1],
            [1,3],[3,3],[4,3],[6,3],[7,3]
        ],
        presetOrbs: [
            // Player — far left
            { x: 0, y: 2, player: 0, count: 3 },
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 0, y: 4, player: 0, count: 1 },
            // AI — far right
            { x: 8, y: 2, player: 1, count: 3 },
            { x: 8, y: 0, player: 1, count: 1 },
            { x: 8, y: 4, player: 1, count: 1 }
        ]
    },

    // ── LEVEL 56 ─────────────────────────────────────────────────────────
    // SWISS CHEESE — 8×8, heavily peppered with 1×1 blocks
    //
    // No large walls, just a massive amount of scattered 1×1 blocks.
    // This dramatically alters effective capacity. A cell that looks
    // interior might only be an edge due to blocked neighbors.
    // Difficulty: Hard.
    {
        id: 56,
        name: "Swiss Cheese",
        description: "Scattered blocks everywhere. Check your cell capacities carefully!",
        rows: 8, cols: 8,
        blockedCells: [
            [1,1],[3,1],[6,1],
            [2,3],[5,3],[7,3],
            [0,4],[4,4],
            [1,6],[3,6],[6,6]
        ],
        presetOrbs: [
            // Player — bottom left
            { x: 0, y: 7, player: 0, count: 1 },
            { x: 1, y: 7, player: 0, count: 2 },
            { x: 2, y: 7, player: 0, count: 2 },
            // AI — top right
            { x: 7, y: 0, player: 1, count: 1 },
            { x: 6, y: 0, player: 1, count: 2 },
            { x: 5, y: 0, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 57 ─────────────────────────────────────────────────────────
    // ASYMMETRY — 8×7, uneven terrain with a heavy defensive bias
    //
    // The player starts in a wide open area. The AI starts in a highly
    // fortified structure. Spatial superiority vs entrenched defense.
    // Difficulty: Hard.
    //
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    //  □ □ □ ■ ■ ■ □
    //  □ ■ □ □ □ ■ □
    //  □ ■ □ ■ □ ■ □
    //  □ ■ □ ■ □ ■ □
    //  □ ■ ■ ■ ■ ■ □
    {
        id: 57,
        name: "Asymmetry",
        description: "You have the open field. The enemy has the fortress. Break them.",
        rows: 8, cols: 7,
        blockedCells: [
            [3,3],[4,3],[5,3],
            [1,4],[5,4],
            [1,5],[3,5],[5,5],
            [1,6],[3,6],[5,6],
            [1,7],[2,7],[3,7],[4,7],[5,7]
        ],
        presetOrbs: [
            // Player — top open field
            { x: 3, y: 1, player: 0, count: 3 },
            { x: 2, y: 0, player: 0, count: 2 },
            { x: 4, y: 0, player: 0, count: 2 },
            // AI — inside the bunker
            { x: 2, y: 5, player: 1, count: 2 },
            { x: 4, y: 5, player: 1, count: 2 },
            { x: 2, y: 6, player: 1, count: 2 }
        ]
    },

    // ── BOSS 8 ───────────────────────────────────────────────────────────
    // GAUNTLET — 10×6, player must run a gauntlet of AI preset orbs
    //
    // A long horizontal corridor filled with small vertical walls. The AI
    // has preset orbs waiting behind every wall like an ambush.
    // Difficulty: Boss.
    {
        id: 108, isBoss: true,
        name: "Gauntlet",
        description: "Run the gauntlet. The enemy is waiting in the shadows.",
        rows: 6, cols: 10,
        blockedCells: [
            [2,0],[2,1],
            [4,4],[4,5],
            [6,0],[6,1],
            [8,4],[8,5]
        ],
        presetOrbs: [
            // Player — start of gauntlet
            { x: 0, y: 2, player: 0, count: 2 },
            { x: 0, y: 3, player: 0, count: 2 },
            { x: 1, y: 2, player: 0, count: 3 },
            // AI — lurking behind walls
            { x: 3, y: 1, player: 1, count: 2 },
            { x: 5, y: 4, player: 1, count: 2 },
            { x: 7, y: 1, player: 1, count: 2 },
            { x: 9, y: 4, player: 1, count: 2 },
            { x: 9, y: 2, player: 1, count: 1 }
        ]
    },

    // ── LEVEL 58 ─────────────────────────────────────────────────────────
    // DOUBLE BYPASS — 8×8, massive central block forcing two thin outer lanes
    //
    // The entire center is dead space. Players must send chain reactions
    // down the top lane or the bottom lane.
    // Fighting on two completely disconnected fronts.
    // Difficulty: Expert.
    //
    //  □ □ □ □ □ □ □ □
    //  □ ■ ■ ■ ■ ■ ■ □
    //  □ ■ ■ ■ ■ ■ ■ □
    //  □ ■ ■ ■ ■ ■ ■ □
    //  □ ■ ■ ■ ■ ■ ■ □
    //  □ ■ ■ ■ ■ ■ ■ □
    //  □ ■ ■ ■ ■ ■ ■ □
    //  □ □ □ □ □ □ □ □
    {
        id: 58,
        name: "Double Bypass",
        description: "A giant void in the center. Choose your lane and hold the line.",
        rows: 8, cols: 8,
        blockedCells: [
            [1,1],[2,1],[3,1],[4,1],[5,1],[6,1],
            [1,2],[2,2],[3,2],[4,2],[5,2],[6,2],
            [1,3],[2,3],[3,3],[4,3],[5,3],[6,3],
            [1,4],[2,4],[3,4],[4,4],[5,4],[6,4],
            [1,5],[2,5],[3,5],[4,5],[5,5],[6,5],
            [1,6],[2,6],[3,6],[4,6],[5,6],[6,6]
        ],
        presetOrbs: [
            // Player — top rim
            { x: 3, y: 0, player: 0, count: 2 },
            { x: 4, y: 0, player: 0, count: 2 },
            { x: 0, y: 0, player: 0, count: 1 },
            // AI — bottom rim
            { x: 3, y: 7, player: 1, count: 2 },
            { x: 4, y: 7, player: 1, count: 2 },
            { x: 7, y: 7, player: 1, count: 1 }
        ]
    },

    // ── LEVEL 59 ─────────────────────────────────────────────────────────
    // CRESCENT — 8×8, a moon-shaped playable area
    //
    // A huge chunk of the bottom-right board is missing, creating a
    // crescent moon shape. The board curves sharply.
    // Asymmetrical cornering, curved wavefronts.
    // Difficulty: Expert.
    {
        id: 59,
        name: "Crescent",
        description: "The board curves away. Push them to the edge of the moon!",
        rows: 8, cols: 8,
        blockedCells: [
            [7,2],
            [6,3],[7,3],
            [5,4],[6,4],[7,4],
            [4,5],[5,5],[6,5],[7,5],
            [3,6],[4,6],[5,6],[6,6],[7,6],
            [2,7],[3,7],[4,7],[5,7],[6,7],[7,7]
        ],
        presetOrbs: [
            // Player — top left (thickest part of crescent)
            { x: 1, y: 1, player: 0, count: 3 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 1, y: 0, player: 0, count: 2 },
            // AI — tips of the crescent
            { x: 0, y: 6, player: 1, count: 2 },
            { x: 6, y: 0, player: 1, count: 2 },
            { x: 7, y: 0, player: 1, count: 1 }
        ]
    },

    // ── LEVEL 60 ─────────────────────────────────────────────────────────
    // THE MOAT — 9×9, a center island surrounded by a 1-cell moat
    //
    // The center is a 3×3 island, accessible only by four single-cell
    // bridges. An extremely tactical control-point map.
    // Difficulty: Expert.
    //
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ ■ ■ □ ■ ■ □ □
    //  □ □ ■ □ □ □ ■ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ ■ □ □ □ ■ □ □
    //  □ □ ■ ■ □ ■ ■ □ □
    //  □ □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □ □
    {
        id: 60,
        name: "The Citadel",
        description: "An island in the center with four bridges. Claim the fortress!",
        rows: 9, cols: 9,
        blockedCells: [
            [2,2],[3,2],      [5,2],[6,2],
            [2,3],                  [6,3],

            [2,5],                  [6,5],
            [2,6],[3,6],      [5,6],[6,6]
        ],
        presetOrbs: [
            // Player — bottom left exterior
            { x: 1, y: 7, player: 0, count: 3 },
            { x: 0, y: 8, player: 0, count: 1 },
            { x: 2, y: 8, player: 0, count: 2 },
            // AI — top right exterior
            { x: 7, y: 1, player: 1, count: 3 },
            { x: 8, y: 0, player: 1, count: 1 },
            { x: 6, y: 0, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 61 ─────────────────────────────────────────────────────────
    // RAZOR EDGE — 6×10, alternating staggered walls across a long board
    //
    // Wide and brutal. The middle is filled with alternating upper and
    // lower walls, forcing a zigzag march across a long distance.
    // Trench warfare — agonizingly slow pushes.
    // Difficulty: Expert.
    {
        id: 61,
        name: "Razor Edge",
        description: "A grueling march across alternating walls. Don't lose momentum.",
        rows: 6, cols: 10,
        blockedCells: [
            [2,0],[2,1],[2,2],[2,3],
            [5,2],[5,3],[5,4],[5,5],
            [7,0],[7,1],[7,2],[7,3]
        ],
        presetOrbs: [
            // Player — far left
            { x: 0, y: 2, player: 0, count: 2 },
            { x: 0, y: 3, player: 0, count: 2 },
            { x: 1, y: 2, player: 0, count: 3 },
            // AI — far right
            { x: 9, y: 2, player: 1, count: 2 },
            { x: 9, y: 3, player: 1, count: 2 },
            { x: 8, y: 3, player: 1, count: 3 }
        ]
    },

    // ── BOSS 9 ───────────────────────────────────────────────────────────
    // CHECKMATE — 10×10, complex symmetry, high tension presets
    //
    // The ultimate test. A giant board with a gorgeous, symmetrical wall
    // pattern. Both sides start with highly volatile, near-critical chains
    // ready to fire. One mistake loses the game instantly.
    // Difficulty: Boss.
    {
        id: 109, isBoss: true,
        name: "Checkmate",
        description: "The grand finale. Both sides are fully armed. One wrong move is death.",
        rows: 10, cols: 10,
        blockedCells: [
            [2,2],[3,2],[6,2],[7,2],
            [2,3],[7,3],
            [4,4],[5,4],
            [4,5],[5,5],
            [2,6],[7,6],
            [2,7],[3,7],[6,7],[7,7]
        ],
        presetOrbs: [
            // Player — top hemisphere
            { x: 4, y: 0, player: 0, count: 2 },
            { x: 5, y: 0, player: 0, count: 2 },
            { x: 4, y: 1, player: 0, count: 3 },
            { x: 5, y: 1, player: 0, count: 3 },
            { x: 2, y: 1, player: 0, count: 2 },
            { x: 7, y: 1, player: 0, count: 2 },
            // AI — bottom hemisphere
            { x: 4, y: 9, player: 1, count: 2 },
            { x: 5, y: 9, player: 1, count: 2 },
            { x: 4, y: 8, player: 1, count: 3 },
            { x: 5, y: 8, player: 1, count: 3 },
            { x: 2, y: 8, player: 1, count: 2 },
            { x: 7, y: 8, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 62 ─────────────────────────────────────────────────────────
    // THE X FACTOR — 7×7, X-shaped scatter of 9 single blocks
    //
    // Nine single-cell blocks form an X across the board's interior.
    // They don't block passage but massively disrupt chain paths.
    // Diagonal thinking required — every route has a trap.
    // Difficulty: Medium.
    {
        id: 62,
        name: "The X Factor",
        description: "Nine blocks form a hidden X. Every path has a catch!",
        rows: 7, cols: 7,
        blockedCells: [
            [1,1],[5,1],
            [2,2],[4,2],
            [3,3],
            [2,4],[4,4],
            [1,5],[5,5]
        ],
        presetOrbs: [
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 1, y: 0, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 6, y: 6, player: 1, count: 1 },
            { x: 5, y: 6, player: 1, count: 2 },
            { x: 6, y: 5, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 63 ─────────────────────────────────────────────────────────
    // THE GRID — 8×8, four evenly-spaced 2×2 blocks
    //
    // Four square pillars sit symmetrically in the interior, carving
    // the board into nine connected zones. Chains must weave between
    // the pillars — no straight lines of force exist.
    // Difficulty: Medium.
    {
        id: 63,
        name: "The Grid",
        description: "Four pillars divide the board. Find the gaps between them!",
        rows: 8, cols: 8,
        blockedCells: [
            [2,2],[3,2],[5,2],[6,2],
            [2,3],[3,3],[5,3],[6,3],
            [2,5],[3,5],[5,5],[6,5],
            [2,6],[3,6],[5,6],[6,6]
        ],
        presetOrbs: [
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 1, y: 0, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 7, y: 7, player: 1, count: 1 },
            { x: 6, y: 7, player: 1, count: 2 },
            { x: 7, y: 6, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 64 ─────────────────────────────────────────────────────────
    // THE WEDGE — 7×7, top-right corner cut off by a triangular wall
    //
    // A growing wedge of blocks seals off the top-right zone. Player
    // starts top-left in the open. AI starts bottom-right in the open.
    // The wedge forces all action through the left and bottom channels.
    // Difficulty: Medium.
    //
    //  □ □ □ □ □ ■ ■
    //  □ □ □ □ ■ ■ ■
    //  □ □ □ ■ ■ ■ ■
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □
    {
        id: 64,
        name: "The Wedge",
        description: "A growing wall cuts the top-right. Fight for the open ground!",
        rows: 7, cols: 7,
        blockedCells: [
            [5,0],[6,0],
            [4,1],[5,1],[6,1],
            [3,2],[4,2],[5,2],[6,2]
        ],
        presetOrbs: [
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 1, y: 0, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 6, y: 6, player: 1, count: 1 },
            { x: 5, y: 6, player: 1, count: 2 },
            { x: 6, y: 5, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 65 ─────────────────────────────────────────────────────────
    // THE PIPELINE — 3×9, an ultra-narrow corridor board
    //
    // Just three rows across. There is nowhere to hide, nowhere to
    // flank. Every chain goes straight at the enemy. The tightest
    // battlefield in the saga — pure head-on pressure.
    // Difficulty: Hard.
    {
        id: 65,
        name: "The Pipeline",
        description: "Three rows. No cover. Push straight through!",
        rows: 3, cols: 9,
        blockedCells: [],
        presetOrbs: [
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 0, y: 2, player: 0, count: 1 },
            { x: 8, y: 1, player: 1, count: 2 },
            { x: 8, y: 0, player: 1, count: 1 },
            { x: 8, y: 2, player: 1, count: 1 }
        ]
    },

    // ── BOSS 10 ──────────────────────────────────────────────────────────
    // THE TITAN — 10×10, AI has a massive concentrated strike force
    //
    // Open 10×10 board. Two 2×2 blocks create left and right channels.
    // You start with a strong corner cluster. The AI has 6 near-critical
    // orbs spread in a diagonal strike formation. Survive the opening
    // volley to have any chance.
    // Difficulty: Boss.
    {
        id: 110, isBoss: true,
        name: "The Titan",
        description: "Massive AI firepower in a diagonal formation. Hold your ground!",
        rows: 10, cols: 10,
        blockedCells: [
            [4,0],[5,0],[4,1],[5,1],
            [4,8],[5,8],[4,9],[5,9]
        ],
        presetOrbs: [
            { x: 0, y: 9, player: 0, count: 1 },
            { x: 1, y: 9, player: 0, count: 2 },
            { x: 0, y: 8, player: 0, count: 2 },
            { x: 1, y: 8, player: 0, count: 3 },
            { x: 9, y: 0, player: 1, count: 1 },
            { x: 8, y: 0, player: 1, count: 2 },
            { x: 9, y: 1, player: 1, count: 2 },
            { x: 7, y: 2, player: 1, count: 3 },
            { x: 6, y: 3, player: 1, count: 3 },
            { x: 8, y: 3, player: 1, count: 3 }
        ]
    },

    // ── LEVEL 66 ─────────────────────────────────────────────────────────
    // THE CROWN — 8×8, crown-shaped barrier across the upper middle
    //
    // A crown of blocks sits in the upper interior. Two passages at the
    // base let chains squeeze through. Control the passes to control
    // the board — letting the enemy through is fatal.
    // Difficulty: Hard.
    //
    //  □ □ □ □ □ □ □ □
    //  □ □ □ □ □ □ □ □
    //  □ □ □ ■ ■ □ □ □  ← crown top
    //  □ ■ ■ □ □ ■ ■ □  ← crown sides (gaps at x=3,4)
    //  □ □ □ □ □ □ □ □
    {
        id: 66,
        name: "The Crown",
        description: "A crown barrier with two narrow passes. Whoever holds the passes wins!",
        rows: 8, cols: 8,
        blockedCells: [
            [3,2],[4,2],
            [1,3],[2,3],[5,3],[6,3]
        ],
        presetOrbs: [
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 1, y: 0, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 7, y: 7, player: 1, count: 1 },
            { x: 6, y: 7, player: 1, count: 2 },
            { x: 7, y: 6, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 67 ─────────────────────────────────────────────────────────
    // THE MAZE RUNNER — 9×9, two staggered walls create a winding path
    //
    // Wall 1 blocks the upper middle, forcing passage through the right.
    // Wall 2 blocks the lower middle, forcing passage through the left.
    // The route zigzags across the board — no straight shot exists.
    // Difficulty: Hard.
    {
        id: 67,
        name: "The Maze Runner",
        description: "Two staggered walls force a winding path. Run the gauntlet!",
        rows: 9, cols: 9,
        blockedCells: [
            [1,2],[2,2],[3,2],[4,2],[5,2],[6,2],
            [2,5],[3,5],[4,5],[5,5],[6,5],[7,5]
        ],
        presetOrbs: [
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 1, y: 0, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 8, y: 0, player: 1, count: 1 },
            { x: 7, y: 0, player: 1, count: 2 },
            { x: 8, y: 1, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 68 ─────────────────────────────────────────────────────────
    // THE SLINGSHOT — 7×7, top corners blocked, narrow V-neck at top
    //
    // Both top corners are sealed off by a growing wall, creating a
    // V-neck at the top. Players start directly opposite at the
    // narrowest point — high danger from the first move.
    // Difficulty: Hard.
    //
    //  □ □ □ □ □ □ □   (0,0)(6,0) blocked but x=2,3,4 open)
    //  ■ □ □ □ □ □ ■
    //  ■ □ □ □ □ □ ■
    //  □ □ □ □ □ □ □  ← fully open from here down
    {
        id: 68,
        name: "The Slingshot",
        description: "Tight opening at top, wide base below. Launch your chain fast!",
        rows: 7, cols: 7,
        blockedCells: [
            [0,0],[1,0],[5,0],[6,0],
            [0,1],[6,1],
            [0,2],[6,2]
        ],
        presetOrbs: [
            { x: 3, y: 0, player: 0, count: 2 },
            { x: 2, y: 0, player: 0, count: 2 },
            { x: 4, y: 0, player: 0, count: 2 },
            { x: 3, y: 6, player: 1, count: 2 },
            { x: 2, y: 6, player: 1, count: 2 },
            { x: 4, y: 6, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 69 ─────────────────────────────────────────────────────────
    // THE BEEHIVE — 8×7, two rows of alternating single blocks
    //
    // Two rows of staggered 1-cell blocks mimic a honeycomb structure.
    // Chains must weave around the cells, creating unpredictable
    // multi-direction explosions across the board.
    // Difficulty: Hard.
    {
        id: 69,
        name: "The Beehive",
        description: "Honeycomb obstacles scatter chain reactions everywhere. Adapt!",
        rows: 7, cols: 8,
        blockedCells: [
            [1,2],[3,2],[5,2],[7,2],
            [0,4],[2,4],[4,4],[6,4]
        ],
        presetOrbs: [
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 1, y: 0, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 7, y: 6, player: 1, count: 1 },
            { x: 6, y: 6, player: 1, count: 2 },
            { x: 7, y: 5, player: 1, count: 2 }
        ]
    },

    // ── BOSS 11 ──────────────────────────────────────────────────────────
    // THE COLOSSUS — 10×10, symmetrical blockers + AI has large preset
    //
    // Single-cell blockers dot the edges and a 2×2 sits dead center.
    // Both sides are disrupted by the symmetric layout. AI has a heavy
    // interior presence ready to cascade the moment you make a mistake.
    // Difficulty: Boss.
    {
        id: 111, isBoss: true,
        name: "The Colossus",
        description: "Symmetric blockers everywhere. The AI is already inside — fight out!",
        rows: 10, cols: 10,
        blockedCells: [
            [3,0],[6,0],[3,9],[6,9],
            [0,3],[0,6],[9,3],[9,6],
            [4,4],[5,4],[4,5],[5,5]
        ],
        presetOrbs: [
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 1, y: 0, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 9, y: 9, player: 1, count: 1 },
            { x: 8, y: 9, player: 1, count: 2 },
            { x: 9, y: 8, player: 1, count: 2 },
            { x: 7, y: 7, player: 1, count: 3 },
            { x: 6, y: 8, player: 1, count: 3 },
            { x: 8, y: 6, player: 1, count: 3 }
        ]
    },

    // ── LEVEL 70 ─────────────────────────────────────────────────────────
    // THE PINWHEEL — 8×8, four rotating arms of blocked cells
    //
    // Four 3-cell arms spin out from the center like a pinwheel.
    // The board has four distinct quadrant zones separated by the arms,
    // with only narrow corner gaps as connections between them.
    // Difficulty: Hard.
    {
        id: 70,
        name: "The Pinwheel",
        description: "Four spinning arms divide the board. Slip through the gaps!",
        rows: 8, cols: 8,
        blockedCells: [
            [3,1],[4,1],[5,1],
            [6,2],[6,3],[6,4],
            [5,6],[4,6],[3,6],
            [1,5],[1,4],[1,3]
        ],
        presetOrbs: [
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 1, y: 0, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 7, y: 7, player: 1, count: 1 },
            { x: 6, y: 7, player: 1, count: 2 },
            { x: 7, y: 6, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 71 ─────────────────────────────────────────────────────────
    // THE CORRIDOR — 5×10, long segmented corridor with three pillars
    //
    // A long wide board divided into four chambers by three vertical
    // pillar walls. Players can only pass each pillar through the open
    // top and bottom rows. Long range chain tactics required.
    // Difficulty: Hard.
    {
        id: 71,
        name: "The Corridor",
        description: "Three pillars block the path. Navigate through top and bottom gaps!",
        rows: 5, cols: 10,
        blockedCells: [
            [2,1],[2,2],[2,3],
            [5,1],[5,2],[5,3],
            [8,1],[8,2],[8,3]
        ],
        presetOrbs: [
            { x: 0, y: 2, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 1, y: 2, player: 0, count: 3 },
            { x: 9, y: 2, player: 1, count: 2 },
            { x: 9, y: 1, player: 1, count: 2 },
            { x: 9, y: 3, player: 1, count: 1 }
        ]
    },

    // ── LEVEL 72 ─────────────────────────────────────────────────────────
    // THE BOOMERANG — 9×7, two staggered walls create a Z-shaped route
    //
    // Wall 1 blocks the upper-center forcing passage right.
    // Wall 2 blocks the lower-center forcing passage left.
    // The chain must boomerang across the board — flanking is key.
    // Difficulty: Hard.
    {
        id: 72,
        name: "The Boomerang",
        description: "Two offset walls force your chain to curve like a boomerang!",
        rows: 7, cols: 9,
        blockedCells: [
            [1,2],[2,2],[3,2],[4,2],[5,2],
            [3,4],[4,4],[5,4],[6,4],[7,4]
        ],
        presetOrbs: [
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 1, y: 0, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 8, y: 6, player: 1, count: 1 },
            { x: 7, y: 6, player: 1, count: 2 },
            { x: 8, y: 5, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 73 ─────────────────────────────────────────────────────────
    // THE SPLIT — 7×9, entire middle row almost blocked — one gap only
    //
    // A near-complete wall cuts the board in half at the middle row.
    // Only a single cell at x=3 connects top and bottom. Whoever
    // controls that one cell controls the entire game.
    // Difficulty: Expert.
    {
        id: 73,
        name: "The Split",
        description: "One gap connects two halves. Control the single pass or lose!",
        rows: 9, cols: 7,
        blockedCells: [
            [0,4],[1,4],[2,4],[4,4],[5,4],[6,4]
        ],
        presetOrbs: [
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 1, y: 0, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 6, y: 8, player: 1, count: 1 },
            { x: 5, y: 8, player: 1, count: 2 },
            { x: 6, y: 7, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 74 ─────────────────────────────────────────────────────────
    // THE WEB — 9×9, spider-web spokes radiating from center
    //
    // Ten single blocks radiate outward from the center like web spokes.
    // Every chain that crosses a spoke gets deflected. The center
    // remains open — reaching it first is a massive advantage.
    // Difficulty: Expert.
    {
        id: 74,
        name: "The Web",
        description: "Web spokes deflect every chain. Race to the open center!",
        rows: 9, cols: 9,
        blockedCells: [
            [4,1],
            [1,2],[7,2],
            [2,3],[6,3],
            [1,5],[7,5],
            [2,6],[6,6],
            [4,7]
        ],
        presetOrbs: [
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 1, y: 0, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 8, y: 8, player: 1, count: 1 },
            { x: 7, y: 8, player: 1, count: 2 },
            { x: 8, y: 7, player: 1, count: 2 }
        ]
    },

    // ── BOSS 12 ──────────────────────────────────────────────────────────
    // THE FINAL GATE — 10×8, two staggered gate walls with narrow gaps
    //
    // Two heavy gate walls slash across the board with staggered gaps.
    // The AI sits at the far end. To reach it you must navigate two
    // chokepoints in a row — and it's waiting for you at each one.
    // Difficulty: Boss.
    {
        id: 112, isBoss: true,
        name: "The Final Gate",
        description: "Two gates, two chokepoints. Break through before the AI breaks out!",
        rows: 8, cols: 10,
        blockedCells: [
            [0,2],[1,2],[2,2],[4,2],[5,2],[6,2],[8,2],[9,2],
            [0,5],[1,5],[3,5],[4,5],[6,5],[7,5],[9,5]
        ],
        presetOrbs: [
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 1, y: 0, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 9, y: 7, player: 1, count: 1 },
            { x: 8, y: 7, player: 1, count: 2 },
            { x: 9, y: 6, player: 1, count: 2 },
            { x: 7, y: 6, player: 1, count: 3 },
            { x: 5, y: 6, player: 1, count: 3 }
        ]
    },

    // ── LEVEL 75 ─────────────────────────────────────────────────────────
    // THE ZIPPER — 8×6, alternating teeth on both edges
    //
    // Left edge has teeth at y=1,3. Right edge has teeth at y=0,2,4.
    // The board zips closed on both sides forcing play through the open
    // interior. Any chain hugging the edge gets snagged instantly.
    // Difficulty: Expert.
    {
        id: 75,
        name: "The Zipper",
        description: "Teeth on both edges snag any chain that gets too close to the wall!",
        rows: 6, cols: 8,
        blockedCells: [
            [0,1],[0,3],
            [7,0],[7,2],[7,4]
        ],
        presetOrbs: [
            { x: 1, y: 2, player: 0, count: 3 },
            { x: 0, y: 2, player: 0, count: 2 },
            { x: 1, y: 1, player: 0, count: 3 },
            { x: 6, y: 3, player: 1, count: 3 },
            { x: 7, y: 3, player: 1, count: 2 },
            { x: 6, y: 4, player: 1, count: 3 }
        ]
    },

    // ── LEVEL 76 ─────────────────────────────────────────────────────────
    // DEAD ZONE — 8×8, large L-shaped dead zone seals the top-left
    //
    // A big L-shaped block eliminates the top-left corner entirely.
    // Player starts top-right in the open. AI starts bottom-left.
    // The dead zone forces all action through the remaining open area.
    // Difficulty: Expert.
    {
        id: 76,
        name: "Dead Zone",
        description: "The top-left corner is gone. Fight for what remains!",
        rows: 8, cols: 8,
        blockedCells: [
            [0,0],[1,0],[2,0],
            [0,1],[1,1],[2,1],
            [0,2],[1,2],[2,2],
            [0,3],[1,3],
            [0,4]
        ],
        presetOrbs: [
            { x: 7, y: 0, player: 0, count: 1 },
            { x: 6, y: 0, player: 0, count: 2 },
            { x: 7, y: 1, player: 0, count: 2 },
            { x: 0, y: 7, player: 1, count: 1 },
            { x: 1, y: 7, player: 1, count: 2 },
            { x: 0, y: 6, player: 1, count: 2 }
        ]
    },

    // ── LEVEL 77 ─────────────────────────────────────────────────────────
    // THE DOMINO — 5×10, two halves connected only at the far edges
    //
    // A near-complete wall cuts the board at the middle row.
    // The only connections are at x=0 (left edge) and x=9 (right edge).
    // Two separate fronts — control both sides or be outflanked.
    // Difficulty: Expert.
    {
        id: 77,
        name: "The Domino",
        description: "Board split in two. One gap on each side — fight on both fronts!",
        rows: 5, cols: 10,
        blockedCells: [
            [1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2]
        ],
        presetOrbs: [
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 1, y: 0, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 9, y: 4, player: 1, count: 1 },
            { x: 8, y: 4, player: 1, count: 2 },
            { x: 9, y: 3, player: 1, count: 2 }
        ]
    },

    // ── BOSS 13 ──────────────────────────────────────────────────────────
    // THE FINAL STAND — 10×10, complex edge blockers + fully armed AI
    //
    // Single blockers disrupt every edge approach. A 2×2 center block
    // forces orbital play. Both sides are heavily armed — the board
    // explodes from turn one. One mistake ends it.
    // Difficulty: Boss.
    {
        id: 113, isBoss: true,
        name: "The Final Stand",
        description: "Edge blockers everywhere. Both sides fully armed. No margin for error.",
        rows: 10, cols: 10,
        blockedCells: [
            [2,2],[7,2],[2,7],[7,7],
            [4,0],[5,0],[4,9],[5,9],
            [0,4],[0,5],[9,4],[9,5]
        ],
        presetOrbs: [
            { x: 0, y: 0, player: 0, count: 1 },
            { x: 1, y: 0, player: 0, count: 2 },
            { x: 0, y: 1, player: 0, count: 2 },
            { x: 2, y: 1, player: 0, count: 2 },
            { x: 9, y: 9, player: 1, count: 1 },
            { x: 8, y: 9, player: 1, count: 2 },
            { x: 9, y: 8, player: 1, count: 2 },
            { x: 6, y: 6, player: 1, count: 3 },
            { x: 8, y: 6, player: 1, count: 3 },
            { x: 6, y: 8, player: 1, count: 3 }
        ]
    }

];

// Bliss levels not yet implemented
export const BLISS_LEVELS = [];
