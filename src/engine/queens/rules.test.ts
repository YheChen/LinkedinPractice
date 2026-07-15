import { describe, it, expect } from "vitest";
import type { QueensPuzzle } from "@/engine/types";
import {
  conflictingQueens,
  cycleCell,
  EMPTY,
  isSolved,
  MARK,
  QUEEN,
  queenCells,
  touching,
  validate,
} from "./rules";

/**
 * A hand-built 4×4 board (below the generator's min size, but perfect for unit
 * tests). Regions are the four 2×2 quadrants; the solution 1,3,0,2 (col per row)
 * puts one queen in each row, column, quadrant, with no two touching.
 *
 *   region layout          solution (Q):
 *   0 0 1 1                 . Q . .
 *   0 0 1 1                 . . . Q
 *   2 2 3 3                 Q . . .
 *   2 2 3 3                 . . Q .
 */
const puzzle: QueensPuzzle = {
  game: "queens",
  meta: { id: "t", game: "queens", difficulty: "easy", rows: 4, cols: 4, generatorVersion: 1, formatVersion: 1 },
  regions: [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 3, 3],
};

function place(cols: number[]): number[] {
  const cells = new Array<number>(16).fill(EMPTY);
  cols.forEach((c, r) => {
    cells[r * 4 + c] = QUEEN;
  });
  return cells;
}

describe("Queens rules", () => {
  it("cycles a cell empty → X → queen → empty", () => {
    let cells = new Array<number>(16).fill(EMPTY);
    cells = cycleCell(cells, 5);
    expect(cells[5]).toBe(MARK);
    cells = cycleCell(cells, 5);
    expect(cells[5]).toBe(QUEEN);
    cells = cycleCell(cells, 5);
    expect(cells[5]).toBe(EMPTY);
  });

  it("cycleCell is immutable", () => {
    const cells = new Array<number>(16).fill(EMPTY);
    const next = cycleCell(cells, 0);
    expect(cells[0]).toBe(EMPTY);
    expect(next[0]).toBe(MARK);
  });

  it("recognises the valid solution", () => {
    const cells = place([1, 3, 0, 2]);
    expect(queenCells(cells)).toHaveLength(4);
    expect(conflictingQueens(puzzle, cells).size).toBe(0);
    expect(isSolved(puzzle, cells)).toBe(true);
    expect(validate(puzzle, cells).solved).toBe(true);
  });

  it("flags two queens sharing a column", () => {
    const cells = place([1, 1, 0, 2]); // rows 0 & 1 both in column 1
    const bad = conflictingQueens(puzzle, cells);
    expect(bad.has(0 * 4 + 1)).toBe(true);
    expect(bad.has(1 * 4 + 1)).toBe(true);
    expect(isSolved(puzzle, cells)).toBe(false);
  });

  it("flags two queens sharing a region", () => {
    // queens at (0,0) and (1,1) are both in region 0.
    const cells = new Array<number>(16).fill(EMPTY);
    cells[0] = QUEEN;
    cells[5] = QUEEN;
    const bad = conflictingQueens(puzzle, cells);
    expect(bad.has(0)).toBe(true);
    expect(bad.has(5)).toBe(true);
  });

  it("touching() is king-move adjacency (incl. diagonal)", () => {
    expect(touching(0, 1, 4)).toBe(true); // horizontal
    expect(touching(0, 4, 4)).toBe(true); // vertical
    expect(touching(0, 5, 4)).toBe(true); // diagonal
    expect(touching(0, 2, 4)).toBe(false); // two apart
    expect(touching(0, 8, 4)).toBe(false); // two rows apart
    expect(touching(3, 3, 4)).toBe(false); // same cell
  });

  it("flags touching queens even on distinct rows/cols/regions", () => {
    // (0,1) region0 and (1,2) region1 — different row/col/region but diagonal.
    const cells = new Array<number>(16).fill(EMPTY);
    cells[0 * 4 + 1] = QUEEN;
    cells[1 * 4 + 2] = QUEEN;
    const bad = conflictingQueens(puzzle, cells);
    expect(bad.size).toBe(2);
  });

  it("is not solved with fewer than n queens", () => {
    const cells = place([1, 3, 0, 2]);
    cells[2 * 4 + 0] = EMPTY; // remove one queen
    expect(isSolved(puzzle, cells)).toBe(false);
    expect(validate(puzzle, cells).message).toMatch(/3 of 4/);
  });

  it("marks (X) never count as queens", () => {
    const cells = place([1, 3, 0, 2]);
    cells[10] = MARK;
    expect(queenCells(cells)).toHaveLength(4);
    expect(isSolved(puzzle, cells)).toBe(true);
  });
});
