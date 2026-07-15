import { describe, it, expect } from "vitest";
import { generateQueens } from "./generate";
import { createQueensSession } from "./session";
import { solutionCells } from "./solve";
import { EMPTY, MARK, QUEEN } from "./rules";

const puzzle = generateQueens({ difficulty: "easy", seed: "session-fixture" });

function drive() {
  const store = createQueensSession(puzzle);
  return { store, s: () => store.getState() };
}

describe("Queens session", () => {
  it("cycles a cell empty → X → queen → empty and starts the timer", () => {
    const { s } = drive();
    expect(s().running).toBe(false);
    s().cycle(0);
    expect(s().cells[0]).toBe(MARK);
    expect(s().running).toBe(true);
    s().cycle(0);
    expect(s().cells[0]).toBe(QUEEN);
    s().cycle(0);
    expect(s().cells[0]).toBe(EMPTY);
  });

  it("supports undo/redo across discrete cycles", () => {
    const { s } = drive();
    s().cycle(3); // MARK
    s().cycle(3); // QUEEN
    expect(s().cells[3]).toBe(QUEEN);
    s().undo();
    expect(s().cells[3]).toBe(MARK);
    s().undo();
    expect(s().cells[3]).toBe(EMPTY);
    s().redo();
    expect(s().cells[3]).toBe(MARK);
  });

  it("solves the puzzle when the full solution is placed, then stops the timer", () => {
    const { s } = drive();
    const sol = solutionCells(puzzle)!;
    for (const cell of sol) {
      // each solution cell: empty → X → queen (two cycles)
      s().cycle(cell);
      s().cycle(cell);
    }
    expect(s().solved).toBe(true);
    expect(s().running).toBe(false);
    expect(s().metrics.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it("hints reveal correct queens and eventually solve", () => {
    const { s } = drive();
    for (let i = 0; i < 50 && !s().solved; i++) s().hint();
    expect(s().solved).toBe(true);
    expect(s().metrics.hintsUsed).toBe(puzzle.meta.rows);
  });

  it("restart clears the board and counts a restart", () => {
    const { s } = drive();
    s().cycle(0);
    s().cycle(0); // queen
    s().restart();
    expect(s().cells.every((c) => c === EMPTY)).toBe(true);
    expect(s().metrics.restarts).toBe(1);
    expect(s().solved).toBe(false);
  });

  it("snapshot/restore round-trips an in-progress board", () => {
    const { s } = drive();
    s().cycle(2); // X
    s().cycle(7); // X
    s().cycle(7); // queen
    const snap = s().snapshot();
    expect(snap).not.toBeNull();

    const fresh = createQueensSession(puzzle);
    fresh.getState().restore(snap!);
    expect(fresh.getState().cells).toEqual(s().cells);
  });

  it("snapshot is null on an empty board, non-null once any mark is placed", () => {
    const { s } = drive();
    expect(s().snapshot()).toBeNull();
    s().cycle(0); // MARK only, no queen — still worth persisting
    expect(s().snapshot()).not.toBeNull();
  });

  it("restore refuses to clobber an in-progress board", () => {
    const { store, s } = drive();
    s().cycle(4);
    s().cycle(4); // a queen already down
    const before = [...s().cells];
    store.getState().restore({
      puzzleId: puzzle.meta.id,
      player: new Array<number>(puzzle.meta.rows ** 2).fill(1),
      metrics: { elapsedMs: 0, backtracks: 0, hintsUsed: 0, restarts: 0, redraws: 0, mistakes: 0 },
      timer: { accumulatedMs: 0, wasRunning: false },
      updatedAt: 0,
    });
    expect(s().cells).toEqual(before);
  });
});
