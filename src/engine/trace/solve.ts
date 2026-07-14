/**
 * Minimal Trace solver — a depth-first search that completes a path prefix into
 * a full Hamiltonian solution obeying every rule in rules.ts.
 *
 * Milestone 3 uses it to power the Hint button. Milestone 4 extends this file
 * with solution COUNTING (early-exit at 2 for uniqueness) and articulation-point
 * pruning for the generator; the core DFS here is that foundation.
 */
import type { PathPuzzle } from "@/engine/types";
import { fromIndex, neighbors, toIndex } from "@/lib/grid";
import { canExtend, startCell, totalCells } from "./rules";

/** Complete `prefix` into a full solution, or null if none exists from here. */
export function solveFrom(puzzle: PathPuzzle, prefix: readonly number[]): number[] | null {
  const total = totalCells(puzzle);
  const { rows, cols } = puzzle.meta;
  const path: number[] = [...prefix];
  const visited = new Set<number>(prefix);

  const dfs = (): boolean => {
    if (path.length === total) return true;
    const last = path[path.length - 1]!;
    for (const nb of neighbors(fromIndex(last, cols), rows, cols)) {
      const cell = toIndex(nb, cols);
      if (visited.has(cell)) continue;
      if (!canExtend(puzzle, path, cell).ok) continue;
      path.push(cell);
      visited.add(cell);
      if (dfs()) return true;
      path.pop();
      visited.delete(cell);
    }
    return false;
  };

  return dfs() ? path : null;
}

export interface HintResult {
  /** the new path after applying the hint (prefix that is provably solvable + one revealed step) */
  path: number[];
  /** the single cell the hint revealed */
  revealed: number;
}

/**
 * Hint (matches RESEARCH.md §1): roll the line back to the last provably-correct
 * position (erasing any mistake), then reveal the single next correct step.
 * Returns null only if the puzzle is unsolvable or already complete.
 */
export function computeHint(puzzle: PathPuzzle, live: readonly number[]): HintResult | null {
  let base: number[] = [...live];
  // Peel back any move that leads to a dead end.
  while (base.length > 0 && solveFrom(puzzle, base) === null) base.pop();
  if (base.length === 0) base = [startCell(puzzle)];

  const solution = solveFrom(puzzle, base);
  if (solution === null || solution.length <= base.length) return null;

  const revealed = solution[base.length]!;
  return { path: solution.slice(0, base.length + 1), revealed };
}
