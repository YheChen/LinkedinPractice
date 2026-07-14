import { describe, it, expect } from "vitest";
import type { PathPuzzle } from "@/engine/types";
import {
  canExtend,
  extend,
  backtrackTo,
  initialPathState,
  isSolved,
  nextExpectedCheckpoint,
  startCell,
  validate,
} from "./rules";
import { TRACE_5x5_EASY, TRACE_6x6_MEDIUM, TRACE_FIXTURES } from "./fixtures";

// A 3×3 with a wall between cell 1 and cell 2, checkpoints 1@0, 2@8.
const p3: PathPuzzle = {
  game: "path",
  meta: { id: "t3", game: "path", difficulty: "easy", rows: 3, cols: 3, generatorVersion: 0, formatVersion: 1 },
  checkpoints: { 0: 1, 8: 2 },
  walls: ["1:2"], // wall between cells 1 and 2 (both in row 0)
};

describe("Trace rules — start", () => {
  it("startCell is the checkpoint-1 cell; initial path is just the start", () => {
    expect(startCell(p3)).toBe(0);
    expect(initialPathState(p3)).toEqual([0]);
  });

  it("an empty path only accepts the start cell", () => {
    expect(canExtend(p3, [], 0)).toEqual({ ok: true });
    expect(canExtend(p3, [], 4)).toEqual({ ok: false, reason: "not-start-cell" });
  });
});

describe("Trace rules — extension legality", () => {
  it("rejects non-adjacent (no jumping)", () => {
    expect(canExtend(p3, [0], 2)).toEqual({ ok: false, reason: "not-adjacent" });
  });

  it("rejects diagonal moves", () => {
    // 0 -> 4 is diagonal (r0c0 -> r1c1)
    expect(canExtend(p3, [0], 4)).toEqual({ ok: false, reason: "not-adjacent" });
  });

  it("rejects revisiting a cell (no crossing)", () => {
    const path = [0, 1];
    expect(canExtend(p3, path, 0)).toEqual({ ok: false, reason: "already-visited" });
  });

  it("rejects crossing a wall", () => {
    // 1 -> 2 has a wall
    expect(canExtend(p3, [0, 1], 2)).toEqual({ ok: false, reason: "wall-between" });
  });

  it("allows a legal orthogonal step to an empty neighbour", () => {
    expect(canExtend(p3, [0], 1)).toEqual({ ok: true });
    expect(canExtend(p3, [0], 3)).toEqual({ ok: true }); // downward
  });
});

describe("Trace rules — checkpoint ordering", () => {
  const p: PathPuzzle = {
    game: "path",
    meta: { id: "cp", game: "path", difficulty: "easy", rows: 1, cols: 4, generatorVersion: 0, formatVersion: 1 },
    checkpoints: { 0: 1, 2: 2, 3: 3 },
    walls: [],
  };
  it("computes the next expected checkpoint", () => {
    expect(nextExpectedCheckpoint(p, [0])).toBe(2);
    expect(nextExpectedCheckpoint(p, [0, 1, 2])).toBe(3);
  });
  it("forbids entering a checkpoint out of order", () => {
    // from [0,1] the only checkpoint reachable next is 2 (cell 2). Cell 3 is checkpoint 3 -> illegal.
    // build a puzzle where 3 is adjacent to allow isolating the ordering rule:
    const p2: PathPuzzle = {
      game: "path",
      meta: { id: "cp2", game: "path", difficulty: "easy", rows: 1, cols: 3, generatorVersion: 0, formatVersion: 1 },
      checkpoints: { 0: 1, 1: 3, 2: 2 },
      walls: [],
    };
    // from start [0], cell 1 holds checkpoint 3 but expected is 2 -> rejected
    expect(canExtend(p2, [0], 1)).toEqual({ ok: false, reason: "checkpoint-out-of-order" });
  });
  it("allows entering the checkpoint that matches the expected number", () => {
    expect(canExtend(p, [0, 1], 2)).toEqual({ ok: true });
  });
});

describe("Trace rules — backtracking", () => {
  it("truncates the path to the retraced cell (inclusive)", () => {
    expect(backtrackTo([0, 1, 2, 3], 1)).toEqual([0, 1]);
  });
  it("is a no-op when the cell is not on the path", () => {
    const path = [0, 1, 2];
    expect(backtrackTo(path, 7)).toBe(path);
  });
  it("retracing the last cell keeps the path unchanged", () => {
    expect(backtrackTo([0, 1, 2], 2)).toEqual([0, 1, 2]);
  });
});

describe("Trace rules — solved detection & fixtures", () => {
  it("is not solved until every cell is covered", () => {
    expect(isSolved(TRACE_5x5_EASY.puzzle, [0, 1, 2])).toBe(false);
    expect(isSolved(TRACE_5x5_EASY.puzzle, TRACE_5x5_EASY.solution)).toBe(true);
  });

  it.each(TRACE_FIXTURES)("fixture $puzzle.meta.id is winnable by replaying its solution", (fix) => {
    // Replay the whole solution step-by-step through canExtend — proves the
    // fixture obeys every rule and ends solved.
    let path: number[] = [fix.solution[0]!];
    expect(path[0]).toBe(startCell(fix.puzzle));
    for (let i = 1; i < fix.solution.length; i++) {
      const cell = fix.solution[i]!;
      const check = canExtend(fix.puzzle, path, cell);
      expect(check, `step ${i} -> cell ${cell}`).toEqual({ ok: true });
      path = extend(fix.puzzle, path, cell)!;
    }
    expect(isSolved(fix.puzzle, path)).toBe(true);
    expect(validate(fix.puzzle, path).solved).toBe(true);
  });

  it("6x6 fixture covers exactly 36 cells with no repeats", () => {
    const s = TRACE_6x6_MEDIUM.solution;
    expect(s).toHaveLength(36);
    expect(new Set(s).size).toBe(36);
  });
});
