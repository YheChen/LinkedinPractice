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
import { canExtendSolving, checkpointPrefixOrdered, hasWall, startCell, totalCells } from "./rules";

/**
 * Connectivity prune: from `head`, can every still-unvisited cell be reached
 * (through unvisited cells, not crossing walls)? If some unvisited cell is
 * stranded, no Hamiltonian completion exists — cut the branch. This is the
 * single most important speed-up for counting solutions.
 */
function unvisitedReachable(
  puzzle: PathPuzzle,
  head: number,
  visited: Set<number>,
  remaining: number,
): boolean {
  const { rows, cols } = puzzle.meta;
  const seen = new Set<number>([head]);
  const stack = [head];
  let reached = 0;
  while (stack.length) {
    const cur = stack.pop()!;
    for (const nb of neighbors(fromIndex(cur, cols), rows, cols)) {
      const cell = toIndex(nb, cols);
      if (seen.has(cell)) continue;
      if (hasWall(puzzle, cur, cell)) continue;
      if (visited.has(cell)) continue;
      seen.add(cell);
      reached++;
      stack.push(cell);
    }
  }
  return reached >= remaining;
}

/** Complete `prefix` into a full solution, or null if none exists from here. */
export function solveFrom(puzzle: PathPuzzle, prefix: readonly number[]): number[] | null {
  // A prefix that already broke checkpoint order has no valid completion; bail
  // so callers (e.g. Hint) peel it back to the last on-track position.
  if (!checkpointPrefixOrdered(puzzle, prefix)) return null;
  const total = totalCells(puzzle);
  const { rows, cols } = puzzle.meta;
  const path: number[] = [...prefix];
  const visited = new Set<number>(prefix);

  const dfs = (): boolean => {
    if (path.length === total) return true;
    const last = path[path.length - 1]!;
    if (!unvisitedReachable(puzzle, last, visited, total - path.length)) return false;
    for (const nb of neighbors(fromIndex(last, cols), rows, cols)) {
      const cell = toIndex(nb, cols);
      if (visited.has(cell)) continue;
      if (!canExtendSolving(puzzle, path, cell)) continue;
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

/**
 * Count solutions, early-exiting at `cap` (default 2 — enough to decide
 * uniqueness). Returns 0, 1, or `cap` (meaning "at least cap"). Uses the same
 * connectivity prune as solveFrom.
 */
export function countSolutions(puzzle: PathPuzzle, cap = 2): number {
  const total = totalCells(puzzle);
  const { rows, cols } = puzzle.meta;
  const start = startCell(puzzle);
  const path: number[] = [start];
  const visited = new Set<number>([start]);
  let found = 0;

  const dfs = () => {
    if (found >= cap) return;
    if (path.length === total) {
      found++;
      return;
    }
    const last = path[path.length - 1]!;
    if (!unvisitedReachable(puzzle, last, visited, total - path.length)) return;
    for (const nb of neighbors(fromIndex(last, cols), rows, cols)) {
      const cell = toIndex(nb, cols);
      if (visited.has(cell)) continue;
      if (!canExtendSolving(puzzle, path, cell)) continue;
      path.push(cell);
      visited.add(cell);
      dfs();
      path.pop();
      visited.delete(cell);
      if (found >= cap) return;
    }
  };

  dfs();
  return found;
}

/** True iff the puzzle has exactly one solution. */
export function hasUniqueSolution(puzzle: PathPuzzle): boolean {
  return countSolutions(puzzle, 2) === 1;
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
