import { describe, it, expect } from "vitest";
import type { PathPuzzle } from "@/engine/types";
import { solveFrom, computeHint } from "./solve";
import { canExtend, startCell, totalCells } from "./rules";
import { TRACE_5x5_EASY, TRACE_6x6_MEDIUM } from "./fixtures";

describe("solveFrom", () => {
  it("finds a full solution from the start of each fixture", () => {
    for (const fix of [TRACE_5x5_EASY, TRACE_6x6_MEDIUM]) {
      const sol = solveFrom(fix.puzzle, [startCell(fix.puzzle)]);
      expect(sol).not.toBeNull();
      expect(sol!).toHaveLength(totalCells(fix.puzzle));
      expect(new Set(sol!).size).toBe(totalCells(fix.puzzle));
    }
  });

  it("returns null when no Hamiltonian path exists (isolated cell)", () => {
    // 2×2 with cell 0 walled off from BOTH its neighbours (1 and 2): cell 0 has
    // degree 0, so no single path can cover all four cells.
    const isolated: PathPuzzle = {
      game: "path",
      meta: { id: "iso", game: "path", difficulty: "easy", rows: 2, cols: 2, generatorVersion: 0, formatVersion: 1 },
      checkpoints: { 0: 1, 3: 2 },
      walls: ["0:1", "0:2"],
    };
    expect(solveFrom(isolated, [startCell(isolated)])).toBeNull();
  });

  it("every step of a returned solution is individually legal", () => {
    const fix = TRACE_6x6_MEDIUM;
    const res = solveFrom(fix.puzzle, [startCell(fix.puzzle)])!;
    for (let i = 1; i < res.length; i++) {
      expect(canExtend(fix.puzzle, res.slice(0, i), res[i]!).ok).toBe(true);
    }
  });
});

describe("computeHint", () => {
  it("reveals exactly one next legal cell from the start", () => {
    const fix = TRACE_5x5_EASY;
    const hint = computeHint(fix.puzzle, [startCell(fix.puzzle)]);
    expect(hint).not.toBeNull();
    expect(hint!.path).toHaveLength(2);
    expect(canExtend(fix.puzzle, [startCell(fix.puzzle)], hint!.revealed).ok).toBe(true);
  });

  it("returns null when the puzzle is already complete", () => {
    const fix = TRACE_5x5_EASY;
    expect(computeHint(fix.puzzle, fix.solution)).toBeNull();
  });
});
