import { describe, it, expect } from "vitest";
import { createHistory, commit, undo, redo, canUndo, canRedo } from "./history";

describe("history — undo/redo semantics", () => {
  it("commit advances present and clears redo branch", () => {
    let h = createHistory(0);
    h = commit(h, 1);
    h = commit(h, 2);
    expect(h.present).toBe(2);
    expect(canUndo(h)).toBe(true);
    expect(canRedo(h)).toBe(false);
  });

  it("undo then redo round-trips", () => {
    let h = createHistory("a");
    h = commit(h, "b");
    h = commit(h, "c");
    h = undo(h);
    expect(h.present).toBe("b");
    h = redo(h);
    expect(h.present).toBe("c");
  });

  it("a new commit after undo discards the redo future", () => {
    let h = createHistory(0);
    h = commit(h, 1);
    h = commit(h, 2);
    h = undo(h); // present = 1, future = [2]
    h = commit(h, 99); // should drop 2
    expect(h.present).toBe(99);
    expect(canRedo(h)).toBe(false);
  });

  it("committing an identical reference is a no-op (transient moves don't pollute history)", () => {
    const value = { path: [1, 2, 3] };
    let h = createHistory(value);
    h = commit(h, value);
    expect(canUndo(h)).toBe(false);
  });

  it("undo/redo at the boundaries are safe no-ops", () => {
    let h = createHistory(0);
    expect(undo(h)).toBe(h);
    h = commit(h, 1);
    h = redo(undo(h));
    expect(h.present).toBe(1);
  });
});
