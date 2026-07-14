import { describe, it, expect } from "vitest";
import { createWeaveSession } from "./session";
import { WEAVE_5x5 } from "./fixtures";

function drive() {
  const store = createWeaveSession(WEAVE_5x5.puzzle);
  const s = () => store.getState();
  const trace = (path: number[]) => {
    s().gestureStart(path[0]!);
    for (let i = 1; i < path.length; i++) s().cellEnter(path[i]!);
    s().gestureEnd();
  };
  return { s, trace };
}

describe("Weave session", () => {
  it("solves by tracing every word", () => {
    const { s, trace } = drive();
    for (const path of WEAVE_5x5.solution) trace(path);
    expect(s().solvedAll).toBe(true);
    expect(s().running).toBe(false);
    expect(s().solved).toHaveLength(5);
  });

  it("counts a mistake for a trace that isn't a target word", () => {
    const { s, trace } = drive();
    trace([0, 5, 10, 15, 20]); // column 0 = P B C S G (not a word)
    expect(s().solved).toHaveLength(0);
    expect(s().metrics.mistakes).toBe(1);
    expect(s().lastResult).toBe("bad");
  });

  it("counts a backtrack when the trace is reversed", () => {
    const { s } = drive();
    s().gestureStart(0);
    s().cellEnter(1);
    s().cellEnter(2);
    s().cellEnter(1); // reverse
    expect(s().active).toEqual([0, 1]);
    expect(s().metrics.backtracks).toBe(1);
    s().gestureCancel();
  });

  it("undo removes the last solved word", () => {
    const { s, trace } = drive();
    trace(WEAVE_5x5.solution[0]!);
    trace(WEAVE_5x5.solution[1]!);
    expect(s().solved).toHaveLength(2);
    s().undo();
    expect(s().solved).toHaveLength(1);
    s().redo();
    expect(s().solved).toHaveLength(2);
  });

  it("hint solves one word and counts a hint", () => {
    const { s } = drive();
    s().hint();
    expect(s().solved).toHaveLength(1);
    expect(s().metrics.hintsUsed).toBe(1);
  });

  it("hints repeatedly can finish the puzzle", () => {
    const { s } = drive();
    for (let i = 0; i < 6 && !s().solvedAll; i++) s().hint();
    expect(s().solvedAll).toBe(true);
  });
});
