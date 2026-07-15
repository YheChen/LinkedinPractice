import { describe, it, expect } from "vitest";
import type { Difficulty } from "@/engine/types";
import { generateQueens } from "./generate";
import { computeQueensHint, countQueensSolutions, solutionCells, solveQueens } from "./solve";
import { isSolved, QUEEN } from "./rules";

const DIFFS: Difficulty[] = ["easy", "medium", "hard", "expert"];

describe("Queens solver", () => {
  it("finds a valid solution for each difficulty", () => {
    for (const difficulty of DIFFS) {
      const puzzle = generateQueens({ difficulty, seed: `solve-${difficulty}` });
      const cols = solveQueens(puzzle);
      expect(cols).not.toBeNull();
      const n = puzzle.meta.rows;
      // distinct columns
      expect(new Set(cols!).size).toBe(n);
      // non-touching consecutive rows
      for (let r = 1; r < n; r++) expect(Math.abs(cols![r]! - cols![r - 1]!)).toBeGreaterThanOrEqual(2);
    }
  });

  it("solutionCells maps to a solved board", () => {
    const puzzle = generateQueens({ difficulty: "medium", seed: "cells" });
    const sol = solutionCells(puzzle)!;
    const cells = new Array<number>(puzzle.meta.rows ** 2).fill(0);
    for (const cell of sol) cells[cell] = QUEEN;
    expect(isSolved(puzzle, cells)).toBe(true);
  });

  it("generated puzzles have exactly one solution", () => {
    for (const difficulty of DIFFS) {
      const puzzle = generateQueens({ difficulty, seed: `unique-${difficulty}` });
      expect(countQueensSolutions(puzzle, 2).count).toBe(1);
    }
  });

  it("computeQueensHint reveals correct queens until solved", () => {
    const puzzle = generateQueens({ difficulty: "easy", seed: "hint" });
    let cells = new Array<number>(puzzle.meta.rows ** 2).fill(0);
    for (let i = 0; i < 100 && !isSolved(puzzle, cells); i++) {
      const h = computeQueensHint(puzzle, cells);
      expect(h).not.toBeNull();
      cells = h!.cells;
      expect(cells[h!.revealed]).toBe(QUEEN);
    }
    expect(isSolved(puzzle, cells)).toBe(true);
  });
});
