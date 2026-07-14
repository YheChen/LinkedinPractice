/**
 * Core data models. The guiding principle (SPEC §"State model") is a hard
 * separation between:
 *   1. PuzzleDefinition   — immutable, content-addressable, versioned
 *   2. PlayerState        — the mutable solution-in-progress
 *   3. interaction state  — transient pointer gesture (never persisted, lives in the hook)
 *   4. timer state        — see lib/timer.ts
 *   5. validation state   — derived, never stored
 *   6. AttemptResult      — persisted outcome
 *
 * The Zod runtime schemas in schemas.ts mirror these and are the single source
 * of truth for import/export and API validation.
 */

export type GameId = "path" | "partition" | "wordpath"; // Zip / Patches / Wend styled
export type Difficulty = "easy" | "medium" | "hard" | "expert";

/** Bumped when a generator's output for a given seed changes. Old puzzles keep their version. */
export type GeneratorVersion = number;

export interface PuzzleMeta {
  /** stable content id: hash of the definition payload */
  id: string;
  game: GameId;
  difficulty: Difficulty;
  rows: number;
  cols: number;
  /** seed + generatorVersion reproduce this puzzle exactly; absent for hand-authored/imported */
  seed?: string;
  generatorVersion: GeneratorVersion;
  /** puzzle-format schema version, for forward-compat migrations */
  formatVersion: number;
}

// ---------- Game 1: Path (Zip-style) ----------

export interface PathPuzzle {
  game: "path";
  meta: PuzzleMeta;
  /** map of cell index -> checkpoint number (1..N), ascending order required */
  checkpoints: Record<number, number>;
  /** wall keys (see lib/grid.wallKey) that the path may not cross */
  walls: string[];
}

// ---------- Game 2: Partition (Patches-style / Shikaku + shapes) ----------

export type ShapeConstraint = "square" | "wide" | "tall" | "free";

export interface PartitionClue {
  cell: number; // index of the clue cell
  /** required rectangle area; undefined means "shape-only" clue */
  area?: number;
  shape: ShapeConstraint;
}

export interface PartitionPuzzle {
  game: "partition";
  meta: PuzzleMeta;
  clues: PartitionClue[];
}

// ---------- Game 3: WordPath (Wend-style) ----------

export interface WordPathPuzzle {
  game: "wordpath";
  meta: PuzzleMeta;
  /** letters by cell index; blocked/wall cells are null */
  letters: (string | null)[];
  /** lengths of the hidden words, shown to the player (words themselves hidden) */
  wordLengths: number[];
  /**
   * The hidden target words. Needed by the engine to validate a submitted trace;
   * NEVER shown in the UI (the player only sees `wordLengths`). Stored uppercased.
   */
  words: string[];
}

export type PuzzleDefinition = PathPuzzle | PartitionPuzzle | WordPathPuzzle;

// ---------- Player state (mutable) ----------

/** Path game: the ordered list of visited cell indices forming the current line. */
export interface PathPlayerState {
  game: "path";
  path: number[];
}

/** A drawn rectangle keyed by its clue cell. */
export interface DrawnRect {
  clueCell: number;
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export interface PartitionPlayerState {
  game: "partition";
  rects: DrawnRect[];
}

/** WordPath: solved words (ordered cell indices) + the in-progress trace. */
export interface WordPathPlayerState {
  game: "wordpath";
  solved: number[][];
  active: number[];
}

export type PlayerState =
  | PathPlayerState
  | PartitionPlayerState
  | WordPathPlayerState;

// ---------- Derived validation state (never persisted) ----------

export interface ValidationState {
  solved: boolean;
  /** cell indices currently flagged as part of an invalid configuration */
  errorCells: number[];
  /** human/AT-readable status, announced via aria-live */
  message?: string;
}

// ---------- Attempt / result (persisted) ----------

export interface AttemptMetrics {
  elapsedMs: number;
  backtracks: number;
  hintsUsed: number;
  restarts: number;
  redraws: number; // partition-specific but harmless elsewhere
  mistakes: number;
}

export interface AttemptResult {
  puzzleId: string;
  game: GameId;
  completedAt: string; // ISO
  metrics: AttemptMetrics;
  /** server-recomputed authoritative solved flag (see SPEC §"anti-cheat") */
  verified: boolean;
}

export const EMPTY_METRICS: AttemptMetrics = {
  elapsedMs: 0,
  backtracks: 0,
  hintsUsed: 0,
  restarts: 0,
  redraws: 0,
  mistakes: 0,
};
