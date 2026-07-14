# Gridwright — Technical Specification (Milestone 1)

Original puzzle platform inspired by the *genres* of LinkedIn's Zip, Patches, and
Wend. We reproduce **rules and interaction patterns only** — never assets, code,
puzzle data, wording, or branding. Rules research and per-claim confidence live in
[`RESEARCH.md`](./RESEARCH.md).

Our three games (original names):

| Genre (inspiration) | Our name | Mechanic |
|---|---|---|
| Zip-style | **Trace** | single Hamiltonian path through every cell, checkpoints in order |
| Patches-style | **Parcel** | partition the grid into rectangles, one area/shape clue each |
| Wend-style | **Weave** | thread hidden words through letters, every cell used once |

---

## 1. Architecture

- **Next.js (App Router) + TypeScript strict + React 19 + Tailwind v3.** SSR/SSG for
  content shell and archive SEO; interactive boards are client islands.
- **Zustand** for session state (small, no boilerplate, works outside React for the
  solver worker bridge). Persist middleware for local-first storage.
- **Zod** at every trust boundary (import, share link, editor, API).
- **Pure, framework-free engine** in `src/engine` and `src/lib` — no React imports —
  so solvers/generators run identically in Node (tests), the main thread, and a
  **Web Worker**. This is the most important boundary: game logic must be testable
  and worker-portable.
- **PostgreSQL** via Prisma (schema below), deployable on Supabase or Neon. Supabase
  chosen when we want managed auth + row-level security out of the box.
- **Rendering:** DOM+SVG hybrid per game (see §"Rendering choice"). Not Canvas by
  default — accessibility and hit-testing win for grid puzzles at our sizes.

### Repository layout
```
src/
  app/                     # routes (home, daily, archive, stats, editor, play/[slug])
  components/
    shell/                 # TopBar, BottomNav, SettingsMenu, GameCard, ThemeApplier
    game/                  # Timer, Board primitives, ActionBar (per-milestone)
  engine/                  # PURE logic (no React)
    types.ts               # data models (immutable def / player / validation / result)
    schemas.ts             # Zod + cross-field invariants + size limits
    session/history.ts     # undo/redo over snapshots
    trace/                 # Trace rules, solver, generator      (M3–M4)
    parcel/                # Parcel rules, solver, generator      (M5–M6)
    weave/                 # Weave rules, solver, generator       (M7–M8)
  input/
    usePointerBoard.ts     # ONE pointer-events input system
    interpolate.ts         # fast-drag orthogonal bridging
    useBoardKeyboard.ts    # roving-focus keyboard model          (M3)
  lib/
    rng.ts                 # seeded deterministic PRNG
    timer.ts               # monotonic Stopwatch
    grid.ts                # coord/index/adjacency/walls
    games.ts               # game registry + metadata
    settings.ts            # theme + a11y prefs (persisted)
  workers/                 # generator/solver worker entrypoints  (M4+)
docs/                      # RESEARCH.md, SPEC.md
tests-e2e/                 # Playwright specs
```

---

## 2. Assumptions & uncertain rules (carried from RESEARCH.md)
1. Grid sizes are **our** design per difficulty (not copied).
2. Keyboard models for all three games are **original** (accessibility).
3. Mid-drag reverse-to-backtrack is supported in Trace and Weave.
4. Timer is **count-up, monotonic, pauses on tab blur/hide** (our decision).
5. Trace grid ~5–8, Parcel 6–10, Weave ~5×5; all configurable per difficulty.
6. Weave adjacency is **orthogonal only** (VERIFIED for Wend). Diagonal is a
   difficulty-flagged variant we will NOT ship unless later verified.
7. All animations/colours/icons/copy are original.

---

## 3. State model

Six strictly separated concerns:

1. **PuzzleDefinition** (`types.ts`) — immutable, content-addressable (`meta.id` =
   hash), versioned (`generatorVersion`, `formatVersion`). Never mutated at play.
2. **PlayerState** — the solution in progress (path array / rects / words).
3. **Interaction state** — the live gesture. Lives *only* in `usePointerBoard` +
   a transient draft. **Never persisted, never in undo history.**
4. **Timer state** — `Stopwatch` (monotonic), persisted as `{accumulatedMs, wasRunning}`.
5. **Validation state** — derived each commit from def+player; never stored.
6. **AttemptResult** — persisted outcome + metrics.

**Undo/redo (`session/history.ts`):** push on **gesture COMMIT**, not gesture
progress. A finished drag / placed rect / submitted word / hint application / keyboard
move each create one entry. Intermediate `onCellEnter`, hover, focus, and timer ticks
never commit. Restoring a saved game replaces `present` without history.

**Timer:** never increment a counter on an interval. `Stopwatch` accumulates spans
against `performance.now()`; the display reads it on rAF. Handles tab switch/sleep (a
throttled frame yields a correct large delta), pause/resume (idempotent), refresh
(persist folded `accumulatedMs`), completion (freeze), offline (no dependency on network).

---

## 4. Pointer & keyboard input

**Hybrid hit-testing (chosen).** Convert pointer coords → cell via the board's cached
bounding rect + fixed cell size. Rejected alternatives: per-move
`document.elementFromPoint` (slow, wrong under transforms), and pure per-cell
`pointerenter` listeners (miss cells on fast drags). DOM cells still carry `data-cell`
for a11y and Playwright. Rect is cached on `pointerdown`, refreshed on resize/scroll.

**Pointer capture** on the board keeps the gesture alive when the pointer leaves the
board (edge backtracking). `pointercancel` / `lostpointercapture` cleanly abort the
gesture and roll back the transient draft.

**Fast movement / skipped cells.** We consume `getCoalescedEvents()` for every
intermediate sample, then bridge remaining gaps with `interpolateOrthogonal` — an
L-shaped route emitting only orthogonally-adjacent steps, **never a diagonal**. Each
bridged step is validated by the game reducer; illegal steps (wall, self-cross) stop the
bridge, and the input layer can retry the alternate elbow. Result: quick flicks feel
instant but can never inject an illegal move.

**Scroll suppression is surgical:** `touch-action:none` + `user-select:none` on the
board element only; the page scrolls normally everywhere else.

**Keyboard (original, per game):**
- *Trace:* roving focus; Arrows/WASD extend the path toward the focused neighbour,
  Backspace retracts, Enter starts/stops at a checkpoint. Full keyboard completion.
- *Parcel:* Arrows move a cursor; Space begins a rectangle anchor, Arrows size it,
  Enter commits, Delete removes the rect under the cursor.
- *Weave:* Arrows move focus; Space adds the focused adjacent letter to the trace,
  Backspace removes the last, Enter submits.

All boards expose a single tab stop with `role="application"` + instructions, not
hundreds of focusable cells (see §Accessibility).

---

## 5. Solvers

Shared contract: `solve(def): { count: 0 | 1 | "many", solution?, second? }` with an
early-exit at the second solution (cheaper than enumerating all).

- **Trace (Hamiltonian path):** DFS from checkpoint 1 with pruning —
  (a) degree/connectivity check (no cell cut off), (b) checkpoint-order monotonicity,
  (c) wall respect, (d) "no isolated empty region" articulation-point prune. Counts
  solutions with early exit at 2. Grid ≤ ~8×8 keeps this well under budget; larger runs
  move to a Web Worker.
- **Parcel (Shikaku + shape):** exact-cover. Enumerate every legal rectangle per clue
  (correct area, matching shape square/wide/tall/free, contains exactly that one clue),
  prune rectangles overlapping other clues. Solve with **Algorithm X / Dancing Links**;
  columns = grid cells + one per clue ("use exactly one rectangle"). Uniqueness = exactly
  one exact cover (early-exit at the second).
- **Weave (word tiling):** backtracking placement + coverage check. Validation solver
  confirms the intended words tile every cell once; the **ambiguity solver** searches for
  any *alternative* set of dictionary words that also tiles the grid (accidental second
  solution) and rejects the puzzle if found.

---

## 6. Generators

All draw only from `createRng(seed)`; `seed + generatorVersion` ⇒ identical puzzle.

- **Trace:** build a random **Hamiltonian path** over the grid (backtracking with
  Warnsdorff-style heuristics; walls added first as a spanning-tree-safe subset). Sample
  checkpoints from the path in order (density = difficulty). Optionally verify uniqueness
  via the solver; adjust checkpoint count until unique. Difficulty = size + clue density +
  walls + branching factor + solver node count.
- **Parcel:** random rectangular tiling of the grid (recursive split / greedy pack), one
  clue per tile (area; shape flag by difficulty), erase boundaries, then run the
  uniqueness solver. Reject/reclue until unique. Avoid unpleasant puzzles by rejecting all
  1×1 dominance, excessive repeated clue values, and boards solvable with zero deductions
  (too easy) or requiring deep guessing (unfair) — measured by the human-technique solver's
  deduction depth. Difficulty = dims + repeated values + ambiguous placements + aspect
  ratios + solver depth.
- **Weave:** pick words from a **curated, filtered dictionary** (no profanity, obscure,
  abbreviations, heavy inflections, duplicates, shared-prefix traps beyond difficulty).
  Place as non-overlapping orthogonal paths covering every cell (backtracking). Run the
  ambiguity solver to reject accidental alternative solutions. Difficulty = rarity + length
  + path shape + shared prefixes + size + solver complexity. **Recommendation:** procedural
  generation is necessary but **not sufficient** for Weave — pipe generated boards through
  an **automated quality-ranking pass** (word familiarity, path elegance, single-solution
  confidence) and keep an editorial override for the daily. Trace/Parcel are safe fully
  procedural once uniqueness passes.

---

## 7. Database schema (Prisma / PostgreSQL)

Immutable definitions are stored **once**, separate from every attempt.

```
User(id, handle, email, createdAt)
PuzzleDefinition(id PK = content hash, game, difficulty, rows, cols,
                 seed, generatorVersion, formatVersion, payload JSONB, createdAt)
  @@index([game, difficulty])
DailyAssignment(id, date DATE, game, puzzleId FK->PuzzleDefinition, UNIQUE(date, game))
GeneratedSeed(id, game, difficulty, seed, generatorVersion, puzzleId, UNIQUE(game,seed,generatorVersion))
Attempt(id, userId FK, puzzleId FK, startedAt, status[in_progress|completed|abandoned],
        stateBlob JSONB /*resumable*/, metrics JSONB, updatedAt)
  @@index([userId, puzzleId])
CompletedGame(id, userId, puzzleId, completedAt, elapsedMs, backtracks, hintsUsed,
              restarts, mistakes, verified BOOL, UNIQUE(userId, puzzleId))
BestScore(userId, game, difficulty, bestElapsedMs, puzzleId, UNIQUE(userId,game,difficulty))
UserPuzzle(id, authorId FK, payload JSONB /*schema-validated*/, isPublic, createdAt)
ImportedPuzzle(id, userId, payload JSONB, source, createdAt)
Statistic(userId, game, played, completed, currentStreak, maxStreak, updatedAt)
Achievement(id, userId, key, earnedAt, UNIQUE(userId, key))   -- optional
```

**Constraints/indexes:** content-hash PK dedupes identical definitions; unique
`(date, game)` for daily; unique `(userId, puzzleId)` for completions; JSONB payloads
validated by Zod before insert. **RLS:** a user reads/writes only their own `Attempt`,
`CompletedGame`, `Statistic`, `Achievement`, private `UserPuzzle`. `PuzzleDefinition`,
`DailyAssignment`, public `UserPuzzle` are world-readable, service-role-writable.

**Local-first + merge:** signed-out play persists to localStorage/IndexedDB
(`gridwright.*`). On sign-in we merge: keep best time per `(game,puzzle)`, sum counters,
recompute streaks; server recomputes `verified`.

---

## 8. API design

Route Handlers under `app/api`. Server never trusts client-reported solved/time.

```
GET  /api/puzzle/:id                 -> PuzzleDefinition
GET  /api/daily?date=&game=          -> {puzzleId, definition}
GET  /api/archive?game=&from=&to=&difficulty=&status=&page=  -> paginated list
POST /api/attempt                    {puzzleId} -> {attemptId, startedAt}
PUT  /api/attempt/:id                {stateBlob, metrics} -> ok   (autosave, throttled)
POST /api/attempt/:id/complete       {finalState} -> server RE-SOLVES finalState against
                                       the immutable def; returns {verified, metrics}
POST /api/generate                   {game, difficulty, seed?} -> definition (rate-limited)
POST /api/validate                   {definition} -> {valid, unique, errors[]} (Zod + solver)
POST /api/import  /  GET /api/export/:id            -> JSON (schema-checked)
GET  /api/stats                      -> aggregates for current user
```

**Anti-cheat (proportionate for a casual game):** (1) completion is **verified
server-side** by replaying the submitted final state through the pure validator against
the stored immutable definition — a fabricated "solved" is rejected. (2) `elapsedMs` is
sanity-bounded: not below a per-puzzle theoretical floor, not below the sum of autosave
intervals observed for the attempt; implausible times are stored `verified=false` and
excluded from leaderboards, not blocked. (3) Rate-limit `/generate` and `/validate`
per IP+user. We deliberately avoid heavy anti-cheat (server-authoritative move stream)
— overkill for casual puzzles.

---

## 9. Rendering choice per game

| | Trace | Parcel | Weave |
|---|---|---|---|
| Board cells | **DOM grid** (CSS Grid) | **DOM grid** | **DOM grid** |
| Dynamic layer | **SVG** polyline path | **SVG/DOM** rect overlays | **SVG** trace polyline |
| Why | DOM cells = free a11y + hit data-attrs; SVG path animates & scales crisply | rects map to DOM regions; SVG for live drag rubber-band | letters need semantic text; SVG trace on top |

Canvas rejected as default: worse accessibility (no DOM semantics), manual hit-testing,
manual focus. Our grids are ≤16×16 so DOM node counts are trivial; we avoid full-board
re-render by keeping the live gesture in a single SVG overlay and only committing cell
class changes on gesture end.

---

## 10. Performance
- Board never re-renders per pointer move: the transient path is one SVG element driven
  by refs; committed state updates cells only on gesture end.
- Generators/solvers run in a **Web Worker** (`src/workers`) — main thread never blocks.
- Puzzle definitions cached (SWR + IndexedDB) and are immutable, so cache is trivially safe.
- Code-split per game route; shared engine tree-shaken.

---

## 11. Accessibility
- **Screen-reader model:** each board is ONE `role="application"` region with an
  `aria-roledescription`, concise instructions, and an `aria-live="polite"` status line
  ("Path covers 12 of 25 cells; at row 3 column 4"). We do **not** emit hundreds of
  focusable cell buttons. A roving-focus cursor moves with arrows; the live region
  announces the cursor cell, checkpoint reached, invalid move, and section/word completed
  (`assertive` for errors).
- Keyboard-only completion supported for all three games (§4).
- High-contrast + colour-blind-safe themes; **no rule expressed by colour alone** (icons,
  labels, shape cues accompany every state colour).
- Reduced-motion honoured via media query + explicit setting.
- Touch targets ≥ 44px; zoom to 200%+ not blocked (`maximumScale` 5, no user-scalable=no).

---

## 12. Testing strategy
- **Unit (Vitest):** every move-validation rule, undo/redo, backtracking, timer math,
  serialization round-trip, generation, solver correctness, uniqueness detection, seed
  reproducibility. *(Core primitives already covered: 19 tests green.)*
- **Property-based (fast-check, M4+):** every generated puzzle has ≥1 solution; unique
  puzzles have exactly 1; any solve satisfies all invariants; serialize∘deserialize = id;
  (seed, version) ⇒ identical puzzle.
- **E2E (Playwright):** mouse drag, touch drag, fast-pointer, pointer cancel, mobile
  viewports (320×568…430×932, tablet, 1366/1440/1920), keyboard play, device rotation,
  refresh-mid-puzzle resume, offline mode, and completing each game. Viewport matrix is
  encoded as projects in `playwright.config.ts`.

## 13. Legal & IP
- Reproduce **rules and interaction patterns** (not copyrightable as ideas/mechanics);
  never copy assets, code, wording, branding, or puzzle data.
- **No scraping/redistribution** of LinkedIn puzzles. Compliant archive: (a) original
  daily archive from our launch, (b) manual layout entry, (c) an authorized import format
  for puzzles users own, (d) only independently generated puzzles stored. Historical
  LinkedIn content only under explicit licence.
- Original names (Trace/Parcel/Weave/Gridwright), palette, icons, copy.

## 14. Milestones
1. **Rules research & spec** ✅ (RESEARCH.md, this doc).
2. **Shared responsive shell** ✅ (routes, theme, pointer input, timer, history, seeded
   RNG, schemas — installed, typechecked, built, 19 tests green).
3. Trace MVP — board, path reducer, drag+keyboard, undo/restart/timer. Tests: all Trace
   move rules, backtracking. AC: playable Trace with hardcoded puzzle on all viewports.
4. Trace solver + generator (Web Worker) + property tests (≥1 / unique / invariants / seed).
5. Parcel board + rectangle reducer + editing/redraw.
6. Parcel exact-cover solver + generator + uniqueness/quality gates.
7. Weave board + word-trace reducer + backtracking.
8. Weave generator + dictionary pipeline + ambiguity solver + quality ranking.
9. Archive + persistence (daily, filters, calendar, seeds, resume).
10. Accounts + statistics + local→account merge + RLS.
11. Puzzle editor + import/export + share links + print mode.
12. PWA + offline packs (service worker, IndexedDB puzzle cache).
13. Accessibility + performance audit (axe, Lighthouse, low-end profiling).
14. Production deployment (Supabase/Neon, rate limits, monitoring).

Each milestone lists features / components / files / data structures / tests / acceptance
/ risks in the project tracker; risks called out: Trace generator uniqueness cost at
larger sizes (mitigate: worker + caps), Parcel unpleasant-puzzle filtering (mitigate:
deduction-depth gate), Weave accidental-word ambiguity (mitigate: ambiguity solver +
editorial daily).
```
