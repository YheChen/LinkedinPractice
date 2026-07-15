/**
 * Queens rules (pure, framework-free). The board is an n×n grid (n = rows =
 * cols) split into n colour regions. A solution places exactly one queen in
 * every row, every column, and every region, with no two queens touching —
 * including diagonally (king-move adjacency). Unlike chess, queens do NOT attack
 * along whole rows/columns/diagonals: only immediate adjacency is forbidden.
 *
 * Player marks per cell:
 *   0 EMPTY      — untouched
 *   1 MARK       — an "X" the player placed to rule the cell out (advisory only)
 *   2 QUEEN      — a placed crown
 */
import type { QueensPuzzle, ValidationState } from "@/engine/types";
import { fromIndex } from "@/lib/grid";

export const EMPTY = 0;
export const MARK = 1;
export const QUEEN = 2;

/** Board side length (rows === cols for Queens). */
export function boardSize(puzzle: QueensPuzzle): number {
  return puzzle.meta.rows;
}

/** Fresh, all-empty player state. */
export function initialQueensState(puzzle: QueensPuzzle): number[] {
  return new Array<number>(boardSize(puzzle) * boardSize(puzzle)).fill(EMPTY);
}

/** Cell indices that currently hold a queen. */
export function queenCells(cells: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < cells.length; i++) if (cells[i] === QUEEN) out.push(i);
  return out;
}

/** Cycle a single cell EMPTY → MARK → QUEEN → EMPTY, returning a new array. */
export function cycleCell(cells: readonly number[], i: number): number[] {
  const next = cells.slice();
  next[i] = ((cells[i] ?? EMPTY) + 1) % 3;
  return next;
}

/** Two cells touch (king-move: within one step in any direction, incl. diagonal). */
export function touching(a: number, b: number, cols: number): boolean {
  if (a === b) return false;
  const ca = fromIndex(a, cols);
  const cb = fromIndex(b, cols);
  return Math.abs(ca.r - cb.r) <= 1 && Math.abs(ca.c - cb.c) <= 1;
}

/**
 * Queen cells that participate in a rule violation: two queens sharing a row,
 * column, or region, or touching each other. Returned as a set of cell indices
 * for live error highlighting.
 */
export function conflictingQueens(puzzle: QueensPuzzle, cells: readonly number[]): Set<number> {
  const n = boardSize(puzzle);
  const qs = queenCells(cells);
  const bad = new Set<number>();
  for (let i = 0; i < qs.length; i++) {
    const a = qs[i]!;
    const ca = fromIndex(a, n);
    for (let j = i + 1; j < qs.length; j++) {
      const b = qs[j]!;
      const cb = fromIndex(b, n);
      if (
        ca.r === cb.r ||
        ca.c === cb.c ||
        puzzle.regions[a] === puzzle.regions[b] ||
        touching(a, b, n)
      ) {
        bad.add(a);
        bad.add(b);
      }
    }
  }
  return bad;
}

/**
 * Solved iff exactly n queens are placed with zero conflicts. n non-conflicting
 * queens necessarily occupy n distinct rows, columns and regions (and none
 * touch), which is the full win condition.
 */
export function isSolved(puzzle: QueensPuzzle, cells: readonly number[]): boolean {
  const n = boardSize(puzzle);
  const qs = queenCells(cells);
  if (qs.length !== n) return false;
  return conflictingQueens(puzzle, cells).size === 0;
}

export function validate(puzzle: QueensPuzzle, cells: readonly number[]): ValidationState {
  const n = boardSize(puzzle);
  const qs = queenCells(cells);
  const bad = conflictingQueens(puzzle, cells);
  const solved = qs.length === n && bad.size === 0;

  let message: string;
  if (solved) {
    message = "Solved! One queen per row, column, and colour, none touching.";
  } else if (bad.size > 0) {
    message = `${qs.length} queen${qs.length === 1 ? "" : "s"} placed — ${bad.size} in conflict.`;
  } else {
    message = `${qs.length} of ${n} queens placed.`;
  }

  return { solved, errorCells: [...bad], message };
}
