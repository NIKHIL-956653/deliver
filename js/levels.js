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

    // ── BOSS LEVELS ───────────────────────────────────────────────────────────
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
    }

];

// Bliss levels not yet implemented
export const BLISS_LEVELS = [];
