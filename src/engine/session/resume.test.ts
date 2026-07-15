import { describe, it, expect } from "vitest";
import { createTraceSession } from "@/engine/trace/session";
import { TRACE_5x5_EASY } from "@/engine/trace/fixtures";
import { createParcelSession } from "@/engine/parcel/session";
import { PARCEL_5x5 } from "@/engine/parcel/fixtures";
import { createWeaveSession } from "@/engine/weave/session";
import { WEAVE_5x5 } from "@/engine/weave/fixtures";

describe("resume — snapshot/restore round-trip", () => {
  it("Trace: partial line + metrics survive a snapshot→restore into a fresh session", () => {
    const a = createTraceSession(TRACE_5x5_EASY.puzzle);
    a.getState().gestureStart(0);
    a.getState().cellEnter(1);
    a.getState().cellEnter(2);
    a.getState().gestureEnd();
    const snap = a.getState().snapshot();
    expect(snap).not.toBeNull();
    expect(snap!.player).toEqual([0, 1, 2]);

    const b = createTraceSession(TRACE_5x5_EASY.puzzle);
    b.getState().restore(snap!);
    expect(b.getState().live).toEqual([0, 1, 2]);
    expect(b.getState().solved).toBe(false);
  });

  it("Trace: a solved or trivial state does not produce a snapshot", () => {
    const s = createTraceSession(TRACE_5x5_EASY.puzzle);
    expect(s.getState().snapshot()).toBeNull(); // just the start cell
  });

  it("Trace: restore REJECTS a snapshot that isn't valid for this puzzle (drag-strand bug)", () => {
    const store = createTraceSession(TRACE_5x5_EASY.puzzle);
    const base = {
      puzzleId: TRACE_5x5_EASY.puzzle.meta.id,
      metrics: { elapsedMs: 0, backtracks: 0, hintsUsed: 0, restarts: 0, redraws: 0, mistakes: 0 },
      timer: { accumulatedMs: 0, wasRunning: false },
      updatedAt: 0,
    };
    // Path that doesn't start at checkpoint 1 (cell 0) — must be discarded so the
    // board isn't stranded and stays drawable from the start.
    store.getState().restore({ ...base, player: [22] });
    expect(store.getState().live).toEqual([0]);

    // Illegal (non-adjacent) path — discarded.
    store.getState().restore({ ...base, player: [0, 24] });
    expect(store.getState().live).toEqual([0]);

    // A valid in-progress path IS restored.
    store.getState().restore({ ...base, player: [0, 1, 2] });
    expect(store.getState().live).toEqual([0, 1, 2]);
  });

  it("Trace: restore does not clobber a game already in progress", () => {
    const store = createTraceSession(TRACE_5x5_EASY.puzzle);
    store.getState().gestureStart(0);
    store.getState().cellEnter(1);
    store.getState().gestureEnd(); // live = [0,1]
    store.getState().restore({
      puzzleId: TRACE_5x5_EASY.puzzle.meta.id,
      player: [0, 5, 10],
      metrics: { elapsedMs: 0, backtracks: 0, hintsUsed: 0, restarts: 0, redraws: 0, mistakes: 0 },
      timer: { accumulatedMs: 0, wasRunning: false },
      updatedAt: 0,
    });
    expect(store.getState().live).toEqual([0, 1]); // unchanged
  });

  it("Parcel: placed rectangles survive a restore", () => {
    const a = createParcelSession(PARCEL_5x5.puzzle);
    a.getState().gestureStart({ r: 0, c: 0 });
    a.getState().cellEnter({ r: 4, c: 0 });
    a.getState().gestureEnd();
    const snap = a.getState().snapshot();
    expect(snap).not.toBeNull();
    const b = createParcelSession(PARCEL_5x5.puzzle);
    b.getState().restore(snap!);
    expect(b.getState().live).toHaveLength(1);
  });

  it("Weave: solved words survive a restore", () => {
    const a = createWeaveSession(WEAVE_5x5.puzzle);
    const path = WEAVE_5x5.solution[0]!;
    a.getState().gestureStart(path[0]!);
    for (let i = 1; i < path.length; i++) a.getState().cellEnter(path[i]!);
    a.getState().gestureEnd();
    const snap = a.getState().snapshot();
    expect(snap).not.toBeNull();
    const b = createWeaveSession(WEAVE_5x5.puzzle);
    b.getState().restore(snap!);
    expect(b.getState().solved).toHaveLength(1);
  });
});
