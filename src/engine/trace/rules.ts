/**
 * Trace (Zip-style) rules — pure, framework-free.
 *
 * PlayerState is an ordered list of visited cell indices forming a single line.
 * Every rule from RESEARCH.md §1 is enforced here and ONLY here; the React board
 * and the solver both call these functions so behaviour can never diverge.
 *
 * Rules:
 *  • the line starts at the cell holding checkpoint 1;
 *  • each extension moves to an orthogonally-adjacent, not-yet-visited cell;
 *  • the line may not cross a wall;
 *  • checkpoints must be entered in ascending order (1,2,3,…);
 *  • solved when the line covers every cell (which, given the order rule, means
 *    all checkpoints were visited in sequence).
 */
import type { PathPuzzle, ValidationState } from "@/engine/types";
import { fromIndex, isOrthogonalAdjacent, wallKey } from "@/lib/grid";

export type MoveRejection =
  | "not-adjacent"
  | "already-visited"
  | "wall-between"
  | "not-start-cell"
  | "empty-path";

export interface MoveCheck {
  ok: boolean;
  reason?: MoveRejection;
}

export function totalCells(puzzle: PathPuzzle): number {
  return puzzle.meta.rows * puzzle.meta.cols;
}

/** Checkpoint number at a cell, or undefined. Handles JSON string-keyed records. */
export function checkpointAt(puzzle: PathPuzzle, cell: number): number | undefined {
  return puzzle.checkpoints[cell];
}

/** The cell index that holds checkpoint number 1 (the mandatory start). */
export function startCell(puzzle: PathPuzzle): number {
  for (const [cellStr, num] of Object.entries(puzzle.checkpoints)) {
    if (num === 1) return Number(cellStr);
  }
  throw new Error("Trace puzzle has no checkpoint 1");
}

/** Highest checkpoint number in the puzzle. */
export function maxCheckpoint(puzzle: PathPuzzle): number {
  return Object.values(puzzle.checkpoints).reduce((m, n) => Math.max(m, n), 0);
}

export function initialPathState(puzzle: PathPuzzle): number[] {
  return [startCell(puzzle)];
}

/**
 * The next checkpoint number the line is allowed to enter. If checkpoints 1..m
 * are already on the line, the next allowed is m+1. (We enforce order on every
 * entry, so this contiguous scan is always correct.)
 */
export function nextExpectedCheckpoint(puzzle: PathPuzzle, path: readonly number[]): number {
  const present = new Set<number>();
  for (const cell of path) {
    const n = checkpointAt(puzzle, cell);
    if (n !== undefined) present.add(n);
  }
  let expected = 1;
  while (present.has(expected)) expected++;
  return expected;
}

/** Is there a wall between two adjacent cells? */
export function hasWall(puzzle: PathPuzzle, a: number, b: number): boolean {
  const cols = puzzle.meta.cols;
  return puzzle.walls.includes(wallKey(fromIndex(a, cols), fromIndex(b, cols), cols));
}

/**
 * Can `cell` be appended to `path` as a PLAYER MOVE? Pure predicate with a
 * machine reason.
 *
 * NOTE (matches the real game): checkpoint ORDER is NOT enforced here. The
 * player is free to move through numbered cells out of order (e.g. 1 → 2 → 4);
 * the path simply won't count as solved unless the order is right. Ordering is a
 * WIN condition (see isSolved / checkpointsInOrder), not a movement restriction.
 * The solver enforces order separately via canExtendSolving.
 */
export function canExtend(puzzle: PathPuzzle, path: readonly number[], cell: number): MoveCheck {
  if (path.length === 0) {
    return cell === startCell(puzzle) ? { ok: true } : { ok: false, reason: "not-start-cell" };
  }
  const last = path[path.length - 1]!;
  const cols = puzzle.meta.cols;
  if (!isOrthogonalAdjacent(fromIndex(last, cols), fromIndex(cell, cols))) {
    return { ok: false, reason: "not-adjacent" };
  }
  if (path.includes(cell)) return { ok: false, reason: "already-visited" };
  if (hasWall(puzzle, last, cell)) return { ok: false, reason: "wall-between" };
  return { ok: true };
}

/**
 * A checkpoint may only be entered when it is the next one due — used by the
 * SOLVER (not by player movement). Entering a checkpoint early permanently
 * breaks the ascending order (checkpoints can't be revisited), so this is a
 * sound prune when searching for/counting valid solutions.
 */
export function respectsCheckpointOrder(
  puzzle: PathPuzzle,
  path: readonly number[],
  cell: number,
): boolean {
  const cp = checkpointAt(puzzle, cell);
  return cp === undefined || cp === nextExpectedCheckpoint(puzzle, path);
}

/** Movement legality AND checkpoint-order — the rule the solver extends by. */
export function canExtendSolving(puzzle: PathPuzzle, path: readonly number[], cell: number): boolean {
  return canExtend(puzzle, path, cell).ok && respectsCheckpointOrder(puzzle, path, cell);
}

/**
 * Are the checkpoints seen SO FAR in ascending order (1,2,…,k) with no gap/skip?
 * True for a partial path that is still "on track"; false once a checkpoint was
 * entered out of turn. (Does not require all N to be present.)
 */
export function checkpointPrefixOrdered(puzzle: PathPuzzle, path: readonly number[]): boolean {
  let expected = 1;
  for (const cell of path) {
    const n = checkpointAt(puzzle, cell);
    if (n !== undefined) {
      if (n !== expected) return false;
      expected++;
    }
  }
  return true;
}

/** Are ALL N checkpoints on the path visited in ascending order 1,2,…,N? */
export function checkpointsInOrder(puzzle: PathPuzzle, path: readonly number[]): boolean {
  return checkpointPrefixOrdered(puzzle, path) && countCheckpointsSeen(puzzle, path) === maxCheckpoint(puzzle);
}

function countCheckpointsSeen(puzzle: PathPuzzle, path: readonly number[]): number {
  let seen = 0;
  for (const cell of path) if (checkpointAt(puzzle, cell) !== undefined) seen++;
  return seen;
}

/** Append if legal; returns a NEW array or null if the move is rejected. */
export function extend(puzzle: PathPuzzle, path: readonly number[], cell: number): number[] | null {
  if (!canExtend(puzzle, path, cell).ok) return null;
  return [...path, cell];
}

/**
 * Backtrack: if `cell` is already on the line, truncate the line so it ends at
 * `cell` (inclusive). Returns a NEW array, or the same reference if `cell` is
 * not on the line (no-op).
 */
export function backtrackTo(path: readonly number[], cell: number): number[] {
  const idx = path.indexOf(cell);
  if (idx === -1) return path as number[];
  return path.slice(0, idx + 1);
}

/** Solved = the line fills every cell AND visits the checkpoints in order. */
export function isSolved(puzzle: PathPuzzle, path: readonly number[]): boolean {
  return path.length === totalCells(puzzle) && checkpointsInOrder(puzzle, path);
}

/**
 * Derived validation/announcement state. Illegal MOVES are prevented (RESEARCH.md
 * §1: "prevented, not punished"), but out-of-order checkpoint visits are allowed
 * — so a full path with the wrong order is not solved, and we say so.
 */
export function validate(puzzle: PathPuzzle, path: readonly number[]): ValidationState {
  const solved = isSolved(puzzle, path);
  const covered = path.length;
  const total = totalCells(puzzle);
  const next = nextExpectedCheckpoint(puzzle, path);
  const maxCp = maxCheckpoint(puzzle);
  const full = covered === total;

  let message: string;
  if (solved) {
    message = "Solved! The line fills every cell in order.";
  } else if (full) {
    message = "Every cell is filled, but the numbers are out of order — retrace to fix it.";
  } else {
    message =
      `Line covers ${covered} of ${total} cells.` +
      (next <= maxCp ? ` Next checkpoint: ${next}.` : " All checkpoints reached.");
  }
  return { solved, errorCells: [], message };
}
