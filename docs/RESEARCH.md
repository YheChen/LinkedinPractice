# Rules Research — Zip, Patches, Wend (source-grounded)

> Compiled 2026-07-14 from web research. **We reproduce only rules and interaction
> patterns — never LinkedIn's assets, wording, puzzle data, code, or branding.**
> Confidence is flagged per claim. Items we could not verify are marked
> **UNVERIFIED — assumption** and are called out again in `SPEC.md §2`.

---

## 1. Zip-style — single-path / Hamiltonian puzzle

**Origin:** LinkedIn "Zip" launched 2025-03-18, puzzles by Thomas Snyder / Grandmaster
Puzzles. New puzzle daily at midnight Pacific.

### Rules (HIGH confidence — official LinkedIn Help a7445030)
- Draw a **single continuous path that fills every cell** (Hamiltonian path).
- **Follow numbered cells in ascending order** (1 → 2 → … → N). Path starts at `1`.
- Path **cannot cross itself** or leave any cell empty.
- **Movement is orthogonal only** (no diagonals). (Coolmath licensed build)
- **Walls** (`|` / `—`) sit between adjacent cells; the path cannot cross them.
- Grid **commonly 6×6** (unofficial; treat as approximate).

### Interaction
- **Mouse:** click-and-hold cell `1`, drag to extend the line. ("Left Click & Drag")
- **Touch:** tap-and-hold `1`, drag finger across cells (same model).
- **Keyboard:** **arrow keys** draw/extend on the Coolmath build. Native-app bindings
  UNVERIFIED. We will add WASD + arrows.
- **Dragging:** line follows pointer, one orthogonally-adjacent cell at a time; no
  jumping, crossing, skipping, or wall-passing.
- **Backtrack/erase:** drag/click back to an earlier cell to erase segments after it;
  **Undo** reverts last move; **Clear** empties the grid. No penalty, but **backtrack
  count is tracked** and shown in results (e.g. "1:40 🏁 With 8 backtracks").
- **Errors:** illegal moves are **prevented, not punished** — no game-over. Dead ends
  are self-corrected by backtracking. Specific illegal-move visual feedback UNVERIFIED.
- **Hint:** erases path up to the first mistake and reveals the next correct step
  (progressive; not full solution).
- **Completion:** "You cracked the Zip in X seconds" + results/leaderboard/streak/share.
  Confetti UNVERIFIED.
- **Timer:** **count-up stopwatch**; completion time is the headline score. Start/stop
  trigger and tab-away pause UNVERIFIED.
- **Scoring:** completion time + backtrack count; streaks; leaderboards vs network.

---

## 2. Patches-style — rectangle-partition (Shikaku + shape clues)

**Origin:** LinkedIn "Patches" launched 2026-03-19, LinkedIn's 7th puzzle, by Thomas
Snyder, **explicitly inspired by Shikaku**. New puzzle daily 00:00 UTC.

### Rules (core VERIFIED via news quoting LinkedIn; Shikaku VERIFIED)
- Partition the whole grid into **rectangular "patches"**:
  - Every cell belongs to **exactly one** patch (no gaps).
  - Each patch contains **exactly one clue**.
  - Patches **do not overlap**.
  - Clue number = patch **area** (cell count).
- **Patches' twist over plain Shikaku — shape-type clues.** A clue may show a shape
  icon, a number, both, or neither:
  - **Square** — width = height.
  - **Wide** — width > height.
  - **Tall** — height > width.
  - **Freeform** — any rectangle (classic Shikaku behaviour).

### Interaction (UNVERIFIED — third-party clones; confirm against live app later)
- **Draw:** click/touch-drag from one cell to another; the two cells are opposite
  corners of the rectangle.
- **Live validation:** border **orange = valid, red = invalid** while dragging.
- **Edit:** **tap/click a placed patch to delete** it, then redraw (no in-place resize).
- **Tools:** Undo, Reset, Hint, Share. Hint highlights a clue + its correct rectangle
  and **caps rating at ⭐⭐**.
- **Invalid causes:** wrong shape, wrong area, two clues in one rect, overlap.
- **Timer / scoring:** count-up timer drives a 1–3 star rating (thresholds are
  clone-reported, UNVERIFIED). Grid sizes clone-reported 6×6/8×8/10×10.

### Solver / uniqueness (VERIFIED for Shikaku)
- Uniqueness is **not** automatic; enforced at generation by an **exact-cover solver**
  that accepts a puzzle only if **exactly one** covering exists.
- Human techniques: forced rectangles, guaranteed (shared) cells, unique reachability,
  contradiction. Programmatic: enumerate every legal rectangle per clue → **exact cover
  via Algorithm X / Dancing Links** (MILP/CP alternatives exist).

---

## 3. Wend-style — word-path / letter-tiling puzzle

**Origin:** LinkedIn "Wend" launched 2026-06-09, first LinkedIn word game. Resets
midnight Pacific.

### Rules (VERIFIED — official LinkedIn Help a6565995)
- **Connect adjacent letters horizontally or vertically — diagonal NOT allowed.**
  (Explicitly confirmed by official Help + 3 secondary sources.)
- **Every open letter tile is used exactly once**; **words cannot overlap**.
- Grid has **fixed wall/blocked cells** that carve the shapes and **guarantee a single
  unique solution**. Grid **~5×5** (secondary only).
- **Words presented by length only** — lengths known, words unknown, no clues/categories.
- **Four words** of lengths **3, 4, 5, 6** (18 letters total) — "typically".

### Interaction
- **Mouse:** click a start letter, drag through orthogonally adjacent tiles, **release
  to submit**.
- **Touch:** tap a tile, then tap/slide to adjacent tiles, lift to submit.
- **Dragging:** traced path stays highlighted; on release a valid word fills a
  length-matching row and stays highlighted; invalid attempt fills no row.
- **Backtrack:** **Undo** backs out a partial/last word. Mid-drag reverse-to-deselect
  UNVERIFIED (we will support it — standard for the genre).
- **Errors:** no explicit error animation documented; feedback = row simply not filled.
- **Hint:** reveals letters one at a time (first letter, then next…). Reported unlimited.
- **Keyboard:** UNVERIFIED (none documented). We will add a roving-focus model.
- **Timer:** **no countdown**; solve time tracked and shown on results. Streaks +
  comparative stat cards.

---

## Net assumptions carried into our (original) implementation
1. Grid sizes are **our** choice per difficulty (we do not copy LinkedIn's).
2. Keyboard models for all three are **our** original addition (accessibility goal).
3. Mid-drag reverse-to-backtrack is supported in Zip and Wend.
4. Timer is count-up, monotonic, pauses on blur/hide (our decision; see SPEC §"Timer").
5. All completion animations, colours, icons, and copy are **original**.
