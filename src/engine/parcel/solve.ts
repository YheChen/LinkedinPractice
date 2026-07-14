/**
 * Parcel solver — exact cover via Algorithm X's core idea (MRV branching over
 * clues) without the dancing-links data structure, which is unnecessary at our
 * grid sizes and keeps the code auditable.
 *
 * Model: choose exactly one legal rectangle per clue so the chosen rectangles
 * partition every cell. We (a) enumerate each clue's candidate rectangles, then
 * (b) branch on the clue with the fewest still-viable candidates (minimum
 * remaining values), pruning any candidate that overlaps already-covered cells.
 * A leaf that covers all cells is a solution. Uniqueness = exactly one leaf,
 * early-exiting at the second (SPEC §5).
 */
import type { DrawnRect, PartitionClue, PartitionPuzzle } from "@/engine/types";
import { fromIndex } from "@/lib/grid";
import { Box, boxContains, cellsInBox } from "./rules";

function shapeOK(shape: PartitionClue["shape"], w: number, h: number): boolean {
  if (shape === "free") return true;
  if (shape === "square") return w === h;
  if (shape === "wide") return w > h;
  return h > w; // tall
}

interface Candidate {
  box: Box;
  cells: number[];
}

/** All legal rectangles for one clue (right area, right shape, exactly this clue). */
export function candidatesForClue(puzzle: PartitionPuzzle, clue: PartitionClue): Candidate[] {
  const { rows, cols } = puzzle.meta;
  const clueCoord = fromIndex(clue.cell, cols);
  const otherClues = puzzle.clues.filter((c) => c.cell !== clue.cell);

  const dims: [number, number][] = [];
  if (clue.area !== undefined) {
    for (let w = 1; w <= cols; w++) {
      if (clue.area % w !== 0) continue;
      const h = clue.area / w;
      if (h > rows) continue;
      if (shapeOK(clue.shape, w, h)) dims.push([w, h]);
    }
  } else {
    for (let w = 1; w <= cols; w++)
      for (let h = 1; h <= rows; h++) if (shapeOK(clue.shape, w, h)) dims.push([w, h]);
  }

  const out: Candidate[] = [];
  for (const [w, h] of dims) {
    // top-left positions such that the box stays in-grid and contains the clue.
    for (let top = Math.max(0, clueCoord.r - h + 1); top <= Math.min(rows - h, clueCoord.r); top++) {
      for (let left = Math.max(0, clueCoord.c - w + 1); left <= Math.min(cols - w, clueCoord.c); left++) {
        const box: Box = { top, left, bottom: top + h - 1, right: left + w - 1 };
        const enclosesOther = otherClues.some((c) => {
          const cc = fromIndex(c.cell, cols);
          return boxContains(box, cc.r, cc.c);
        });
        if (enclosesOther) continue;
        out.push({ box, cells: cellsInBox(box, cols) });
      }
    }
  }
  return out;
}

interface SearchResult {
  count: number;
  first: Box[] | null;
}

function search(puzzle: PartitionPuzzle, cap: number): SearchResult {
  const size = puzzle.meta.rows * puzzle.meta.cols;
  const candidates = puzzle.clues.map((clue) => candidatesForClue(puzzle, clue));
  const assigned = new Array<Box | null>(puzzle.clues.length).fill(null);
  const covered = new Uint8Array(size);
  let coveredCount = 0;
  let count = 0;
  let first: Box[] | null = null;

  const viable = (ci: number): number[] => {
    const idxs: number[] = [];
    const list = candidates[ci]!;
    for (let k = 0; k < list.length; k++) {
      if (list[k]!.cells.every((cell) => covered[cell] === 0)) idxs.push(k);
    }
    return idxs;
  };

  const recurse = (remaining: number): void => {
    if (count >= cap) return;
    if (remaining === 0) {
      if (coveredCount === size) {
        count++;
        if (!first) first = assigned.map((b) => b!);
      }
      return;
    }
    // MRV: unassigned clue with the fewest viable candidates.
    let bestCi = -1;
    let bestList: number[] | null = null;
    for (let ci = 0; ci < candidates.length; ci++) {
      if (assigned[ci]) continue;
      const v = viable(ci);
      if (bestList === null || v.length < bestList.length) {
        bestCi = ci;
        bestList = v;
        if (v.length === 0) break; // dead end — cannot improve
      }
    }
    if (bestCi === -1 || !bestList || bestList.length === 0) return;

    const list = candidates[bestCi]!;
    for (const k of bestList) {
      const cand = list[k]!;
      for (const cell of cand.cells) covered[cell] = 1;
      coveredCount += cand.cells.length;
      assigned[bestCi] = cand.box;
      recurse(remaining - 1);
      assigned[bestCi] = null;
      for (const cell of cand.cells) covered[cell] = 0;
      coveredCount -= cand.cells.length;
      if (count >= cap) return;
    }
  };

  recurse(puzzle.clues.length);
  return { count, first };
}

/** Number of solutions, capped (default 2 for uniqueness decisions). */
export function countParcelSolutions(puzzle: PartitionPuzzle, cap = 2): number {
  return search(puzzle, cap).count;
}

export function hasUniqueParcelSolution(puzzle: PartitionPuzzle): boolean {
  return countParcelSolutions(puzzle, 2) === 1;
}

/** One full solution as drawn rectangles, or null if unsolvable. */
export function solveParcel(puzzle: PartitionPuzzle): DrawnRect[] | null {
  const { first } = search(puzzle, 1);
  if (!first) return null;
  return first.map((box, i) => ({ clueCell: puzzle.clues[i]!.cell, ...box }));
}

/**
 * Hint: return the correct parcel for a clue that is currently missing or wrong,
 * as a full rects array with that one parcel corrected. Null if solved/unsolvable.
 */
export function computeParcelHint(
  puzzle: PartitionPuzzle,
  rects: readonly DrawnRect[],
): DrawnRect[] | null {
  const solution = solveParcel(puzzle);
  if (!solution) return null;
  const byClue = new Map(rects.map((r) => [r.clueCell, r]));
  for (const sol of solution) {
    const cur = byClue.get(sol.clueCell);
    const matches =
      cur &&
      cur.top === sol.top &&
      cur.left === sol.left &&
      cur.bottom === sol.bottom &&
      cur.right === sol.right;
    if (!matches) {
      const next = rects.filter((r) => r.clueCell !== sol.clueCell);
      next.push(sol);
      return next;
    }
  }
  return null; // everything already correct
}
