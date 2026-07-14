/**
 * Weave search. `findWordPath` locates a path of unused, orthogonally-adjacent
 * cells spelling a given word — used for Hint (M7) and, in M8, as the core of
 * the ambiguity solver that checks a generated grid can't be tiled by any
 * alternative set of words.
 */
import type { WordPathPuzzle } from "@/engine/types";
import { fromIndex, neighbors, toIndex } from "@/lib/grid";

export function findWordPath(
  puzzle: WordPathPuzzle,
  used: ReadonlySet<number>,
  word: string,
): number[] | null {
  const { rows, cols } = puzzle.meta;
  const size = rows * cols;
  const W = word.toUpperCase();
  const visited = new Set<number>();
  const path: number[] = [];

  const letter = (cell: number) => (puzzle.letters[cell] ?? "").toUpperCase();

  const dfs = (cell: number, idx: number): boolean => {
    if (used.has(cell) || visited.has(cell)) return false;
    if (letter(cell) !== W[idx]) return false;
    path.push(cell);
    visited.add(cell);
    if (idx === W.length - 1) return true;
    for (const nb of neighbors(fromIndex(cell, cols), rows, cols)) {
      if (dfs(toIndex(nb, cols), idx + 1)) return true;
    }
    path.pop();
    visited.delete(cell);
    return false;
  };

  for (let start = 0; start < size; start++) {
    if (dfs(start, 0)) return [...path];
    path.length = 0;
    visited.clear();
  }
  return null;
}

/**
 * Solve the whole puzzle: place every target word into the grid so all letters
 * are used exactly once. Returns the paths (aligned with puzzle.words order) or
 * null. Backtracks across word placements. Used by the M8 uniqueness check.
 */
export function solveWeave(puzzle: WordPathPuzzle): number[][] | null {
  const words = puzzle.words;
  const used = new Set<number>();
  const result: number[][] = [];

  const place = (i: number): boolean => {
    if (i === words.length) return true;
    // Try every path for words[i] given current usage.
    const paths = allWordPaths(puzzle, used, words[i]!);
    for (const p of paths) {
      p.forEach((c) => used.add(c));
      result[i] = p;
      if (place(i + 1)) return true;
      p.forEach((c) => used.delete(c));
    }
    return false;
  };

  return place(0) ? result : null;
}

export interface CountResult {
  /** number of full tilings found, capped */
  count: number;
  /** true if the search hit its step budget before finishing (result is a lower bound) */
  aborted: boolean;
}

/**
 * Count the ways the puzzle's word multiset can tile the grid, early-exiting at
 * `cap`. This is the ambiguity/uniqueness check used by the generator: a good
 * puzzle has exactly one tiling of its intended words. A step budget bounds the
 * cost; if hit, `aborted` is set and the caller treats the board as non-unique
 * (and resamples) rather than trusting an incomplete search.
 */
export function countWeaveSolutions(
  puzzle: WordPathPuzzle,
  cap = 2,
  budget = 300_000,
): CountResult {
  const words = puzzle.words;
  const used = new Set<number>();
  let count = 0;
  let steps = 0;
  let aborted = false;

  const place = (i: number): void => {
    if (aborted || count >= cap) return;
    if (i === words.length) {
      count++;
      return;
    }
    for (const p of allWordPaths(puzzle, used, words[i]!)) {
      if (++steps > budget) {
        aborted = true;
        return;
      }
      p.forEach((c) => used.add(c));
      place(i + 1);
      p.forEach((c) => used.delete(c));
      if (aborted || count >= cap) return;
    }
  };

  place(0);
  return { count, aborted };
}

/** All distinct paths spelling `word` among unused cells (bounded enumeration). */
export function allWordPaths(
  puzzle: WordPathPuzzle,
  used: ReadonlySet<number>,
  word: string,
): number[][] {
  const { rows, cols } = puzzle.meta;
  const size = rows * cols;
  const W = word.toUpperCase();
  const out: number[][] = [];
  const visited = new Set<number>();
  const path: number[] = [];
  const letter = (cell: number) => (puzzle.letters[cell] ?? "").toUpperCase();

  const dfs = (cell: number, idx: number) => {
    if (used.has(cell) || visited.has(cell) || letter(cell) !== W[idx]) return;
    path.push(cell);
    visited.add(cell);
    if (idx === W.length - 1) {
      out.push([...path]);
    } else {
      for (const nb of neighbors(fromIndex(cell, cols), rows, cols)) dfs(toIndex(nb, cols), idx + 1);
    }
    path.pop();
    visited.delete(cell);
  };

  for (let start = 0; start < size; start++) dfs(start, 0);
  return out;
}
