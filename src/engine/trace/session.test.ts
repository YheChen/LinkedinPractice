import { describe, it, expect } from "vitest";
import { createTraceSession } from "./session";
import { TRACE_5x5_EASY } from "./fixtures";

const puzzle = TRACE_5x5_EASY.puzzle;
const solution = TRACE_5x5_EASY.solution;

function drive() {
  const store = createTraceSession(puzzle);
  return { store, s: () => store.getState() };
}

describe("Trace session", () => {
  it("solves the puzzle by replaying the solution in one gesture", () => {
    const { s } = drive();
    s().gestureStart(solution[0]!);
    for (let i = 1; i < solution.length; i++) s().cellEnter(solution[i]!);
    s().gestureEnd();
    expect(s().solved).toBe(true);
    expect(s().running).toBe(false);
    expect(s().metrics.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it("counts a backtrack when the line is retraced", () => {
    const { s } = drive();
    s().gestureStart(0);
    s().cellEnter(1);
    s().cellEnter(2);
    s().cellEnter(3);
    expect(s().live).toEqual([0, 1, 2, 3]);
    s().cellEnter(1); // retrace back to cell 1
    expect(s().live).toEqual([0, 1]);
    expect(s().metrics.backtracks).toBe(1);
    s().gestureEnd();
  });

  it("ignores illegal moves (no diagonal / no jump)", () => {
    const { s } = drive();
    s().gestureStart(0);
    s().cellEnter(6); // diagonal from 0 -> illegal
    expect(s().live).toEqual([0]);
    s().cellEnter(2); // jump (not adjacent) -> illegal
    expect(s().live).toEqual([0]);
  });

  it("undo reverts the last committed move; redo reapplies", () => {
    const { s } = drive();
    // two discrete keyboard-style moves (each its own commit)
    s().gestureStart(0);
    s().cellEnter(1);
    s().gestureEnd();
    s().gestureStart(1);
    s().cellEnter(2);
    s().gestureEnd();
    expect(s().live).toEqual([0, 1, 2]);
    s().undo();
    expect(s().live).toEqual([0, 1]);
    s().redo();
    expect(s().live).toEqual([0, 1, 2]);
  });

  it("hint extends the line by one legal cell and counts a hint", () => {
    const { s } = drive();
    const before = s().live.length;
    s().hint();
    expect(s().live.length).toBe(before + 1);
    expect(s().metrics.hintsUsed).toBe(1);
    expect(s().hintCells).toHaveLength(1);
  });

  it("restart clears the line and increments the restart counter", () => {
    const { s } = drive();
    s().gestureStart(0);
    s().cellEnter(1);
    s().gestureEnd();
    s().restart();
    expect(s().live).toEqual([0]); // back to just the start cell
    expect(s().metrics.restarts).toBe(1);
    expect(s().solved).toBe(false);
  });
});
