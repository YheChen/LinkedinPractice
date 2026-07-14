import { describe, it, expect } from "vitest";
import {
  canExtendActive,
  backtrackActiveTo,
  wordOf,
  remainingWords,
  submit,
  isSolved,
  validate,
} from "./rules";
import { WEAVE_5x5 } from "./fixtures";

const puzzle = WEAVE_5x5.puzzle;

describe("Weave rules — tracing", () => {
  it("any free letter can start a trace", () => {
    expect(canExtendActive(puzzle, [], [], 0)).toEqual({ ok: true });
  });
  it("rejects diagonal / non-adjacent extension", () => {
    // 0 (r0c0) -> 6 (r1c1) is diagonal
    expect(canExtendActive(puzzle, [], [0], 6)).toEqual({ ok: false, reason: "not-adjacent" });
    expect(canExtendActive(puzzle, [], [0], 2)).toEqual({ ok: false, reason: "not-adjacent" });
  });
  it("allows an orthogonal step to an unused letter", () => {
    expect(canExtendActive(puzzle, [], [0], 1)).toEqual({ ok: true });
    expect(canExtendActive(puzzle, [], [0], 5)).toEqual({ ok: true });
  });
  it("rejects reusing a cell in the active trace or a solved word", () => {
    expect(canExtendActive(puzzle, [], [0, 1], 0)).toEqual({ ok: false, reason: "reused" });
    expect(canExtendActive(puzzle, [[0, 1, 2, 3, 4]], [], 2)).toEqual({ ok: false, reason: "reused" });
  });
});

describe("Weave rules — backtrack", () => {
  it("reverses to the retraced cell", () => {
    expect(backtrackActiveTo([0, 1, 2, 3], 1)).toEqual([0, 1]);
  });
  it("no-op when the cell is off the trace", () => {
    const a = [0, 1];
    expect(backtrackActiveTo(a, 9)).toBe(a);
  });
});

describe("Weave rules — submit", () => {
  it("locks in a correct word and removes it from remaining", () => {
    const res = submit(puzzle, [], [0, 1, 2, 3, 4]); // PLANT
    expect(res.ok).toBe(true);
    expect(res.word).toBe("PLANT");
    expect(res.solved).toHaveLength(1);
    expect(remainingWords(puzzle, res.solved)).not.toContain("PLANT");
  });

  it("rejects a trace that is not a target word", () => {
    const res = submit(puzzle, [], [0, 5, 10, 15, 20]); // column 0: P B C S G
    expect(res.ok).toBe(false);
    expect(res.solved).toHaveLength(0);
    expect(res.active).toEqual([]);
  });

  it("rejects a single-cell trace", () => {
    expect(submit(puzzle, [], [0]).ok).toBe(false);
  });

  it("wordOf spells the path", () => {
    expect(wordOf(puzzle, [5, 6, 7, 8, 9])).toBe("BRAVE");
  });
});

describe("Weave rules — solved", () => {
  it("is solved once all target words are found", () => {
    let solved: number[][] = [];
    for (const path of WEAVE_5x5.solution) {
      const res = submit(puzzle, solved, path);
      expect(res.ok).toBe(true);
      solved = res.solved;
    }
    expect(isSolved(puzzle, solved)).toBe(true);
    expect(validate(puzzle, solved).solved).toBe(true);
  });
});
