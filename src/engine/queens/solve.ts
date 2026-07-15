/**
 * Queens solver + hint. Backtracks one row at a time placing a queen in a free
 * column whose region is unused and which does not touch the queen in the row
 * above (the only row that can be adjacent, since queens sit in distinct rows).
 * Fast for our sizes (n ≤ 9): the column/region pruning keeps the tree tiny.
 */
import type { QueensPuzzle } from "@/engine/types";
import { boardSize, QUEEN } from "./rules";

/** Solve; returns the queen column for each row (length n), or null if none. */
export function solveQueens(puzzle: QueensPuzzle): number[] | null {
  const found = search(puzzle, 1);
  return found[0] ?? null;
}

/**
 * Count solutions up to `cap` (default 2 — enough to prove uniqueness). Returns
 * `aborted: true` once the cap is hit so callers can treat it as "≥ cap".
 */
export function countQueensSolutions(
  puzzle: QueensPuzzle,
  cap = 2,
): { count: number; aborted: boolean } {
  const sols = search(puzzle, cap);
  return { count: sols.length, aborted: sols.length >= cap };
}

/** Up to `limit` solutions, each as the queen column per row. */
export function queensSolutions(puzzle: QueensPuzzle, limit: number): number[][] {
  return search(puzzle, limit);
}

/** Depth-first search collecting up to `limit` solutions (each: col per row). */
function search(puzzle: QueensPuzzle, limit: number): number[][] {
  const n = boardSize(puzzle);
  const regionOf = (row: number, col: number) => puzzle.regions[row * n + col]!;
  const usedCol = new Array<boolean>(n).fill(false);
  const usedRegion = new Array<boolean>(n).fill(false);
  const cols = new Array<number>(n).fill(-1);
  const solutions: number[][] = [];

  const recurse = (row: number, prevCol: number): void => {
    if (solutions.length >= limit) return;
    if (row === n) {
      solutions.push(cols.slice());
      return;
    }
    for (let col = 0; col < n; col++) {
      if (usedCol[col]) continue;
      const region = regionOf(row, col);
      if (usedRegion[region]) continue;
      // Adjacent to the queen directly above? (king-move touch across rows.)
      if (prevCol >= 0 && Math.abs(col - prevCol) <= 1) continue;
      usedCol[col] = true;
      usedRegion[region] = true;
      cols[row] = col;
      recurse(row + 1, col);
      usedCol[col] = false;
      usedRegion[region] = false;
      if (solutions.length >= limit) return;
    }
  };

  recurse(0, -1);
  return solutions;
}

/** The unique solution as cell indices (one queen cell per row), or null. */
export function solutionCells(puzzle: QueensPuzzle): number[] | null {
  const cols = solveQueens(puzzle);
  if (!cols) return null;
  const n = boardSize(puzzle);
  return cols.map((col, row) => row * n + col);
}

export interface QueensHint {
  /** cell index of the newly-revealed correct queen */
  revealed: number;
  /** player-state array with that queen placed */
  cells: number[];
}

/**
 * Reveal one more correct queen: pick a solution cell not already holding a
 * queen and place it (clearing any stray mark there). Returns null when the
 * board can't be solved or every solution queen is already down.
 */
export function computeQueensHint(puzzle: QueensPuzzle, cells: readonly number[]): QueensHint | null {
  const sol = solutionCells(puzzle);
  if (!sol) return null;
  const target = sol.find((cell) => cells[cell] !== QUEEN);
  if (target === undefined) return null;
  const next = cells.slice();
  next[target] = QUEEN;
  return { revealed: target, cells: next };
}
