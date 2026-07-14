/**
 * Weave (Wend-style) rules — pure, framework-free.
 *
 * The player traces hidden words by connecting ORTHOGONALLY adjacent letters
 * (diagonal not allowed — verified for Wend, RESEARCH.md §3). Every open letter
 * is used exactly once and words never overlap. A trace is submitted on release;
 * if its letters spell one of the yet-unfound target words, it locks in.
 *
 * PlayerState: `solved` (locked-in word cell-paths) + `active` (current trace).
 */
import type { ValidationState, WordPathPuzzle } from "@/engine/types";
import { fromIndex, isOrthogonalAdjacent } from "@/lib/grid";

export function letterAt(puzzle: WordPathPuzzle, cell: number): string | null {
  return puzzle.letters[cell] ?? null;
}

export function isBlocked(puzzle: WordPathPuzzle, cell: number): boolean {
  return letterAt(puzzle, cell) === null;
}

/** All cells consumed by already-solved words. */
export function solvedCells(solved: readonly number[][]): Set<number> {
  const s = new Set<number>();
  for (const word of solved) for (const cell of word) s.add(cell);
  return s;
}

export type ExtendRejection = "blocked" | "not-adjacent" | "reused";

/** Can `cell` be appended to the active trace? */
export function canExtendActive(
  puzzle: WordPathPuzzle,
  solved: readonly number[][],
  active: readonly number[],
  cell: number,
): { ok: boolean; reason?: ExtendRejection } {
  if (isBlocked(puzzle, cell)) return { ok: false, reason: "blocked" };
  const used = solvedCells(solved);
  if (used.has(cell) || active.includes(cell)) return { ok: false, reason: "reused" };
  if (active.length === 0) return { ok: true }; // any free letter can start a word
  const cols = puzzle.meta.cols;
  const last = active[active.length - 1]!;
  if (!isOrthogonalAdjacent(fromIndex(last, cols), fromIndex(cell, cols))) {
    return { ok: false, reason: "not-adjacent" };
  }
  return { ok: true };
}

export function extendActive(
  puzzle: WordPathPuzzle,
  solved: readonly number[][],
  active: readonly number[],
  cell: number,
): number[] | null {
  return canExtendActive(puzzle, solved, active, cell).ok ? [...active, cell] : null;
}

/** Reverse the trace back to `cell` (inclusive); no-op if not on the trace. */
export function backtrackActiveTo(active: readonly number[], cell: number): number[] {
  const idx = active.indexOf(cell);
  return idx === -1 ? (active as number[]) : active.slice(0, idx + 1);
}

/** The string spelled by a cell path. */
export function wordOf(puzzle: WordPathPuzzle, path: readonly number[]): string {
  return path.map((c) => puzzle.letters[c] ?? "").join("");
}

/** Target words not yet found (by string). */
export function remainingWords(puzzle: WordPathPuzzle, solved: readonly number[][]): string[] {
  const found = solved.map((p) => wordOf(puzzle, p));
  const remaining = [...puzzle.words];
  for (const f of found) {
    const i = remaining.indexOf(f);
    if (i !== -1) remaining.splice(i, 1);
  }
  return remaining;
}

export interface SubmitResult {
  ok: boolean;
  word?: string;
  solved: number[][];
  active: number[];
}

/**
 * Submit the active trace. If it spells a still-unfound target word, lock it in;
 * otherwise clear the trace (invalid feedback = nothing locks in).
 */
export function submit(
  puzzle: WordPathPuzzle,
  solved: readonly number[][],
  active: readonly number[],
): SubmitResult {
  if (active.length < 2) return { ok: false, solved: [...solved], active: [] };
  const word = wordOf(puzzle, active);
  if (remainingWords(puzzle, solved).includes(word)) {
    return { ok: true, word, solved: [...solved, [...active]], active: [] };
  }
  return { ok: false, solved: [...solved], active: [] };
}

export function isSolved(puzzle: WordPathPuzzle, solved: readonly number[][]): boolean {
  return solved.length === puzzle.words.length;
}

export function validate(
  puzzle: WordPathPuzzle,
  solved: readonly number[][],
): ValidationState {
  const done = isSolved(puzzle, solved);
  const remaining = remainingWords(puzzle, solved);
  const message = done
    ? "Solved! Every letter is used."
    : `${solved.length} of ${puzzle.words.length} words found; remaining lengths: ${remaining
        .map((w) => w.length)
        .sort((a, b) => a - b)
        .join(", ")}.`;
  return { solved: done, errorCells: [], message };
}
