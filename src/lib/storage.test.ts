import { describe, it, expect, beforeEach } from "vitest";
import { LocalStorageAdapter, doneKey, type AttemptSnapshot } from "./storage";
import { EMPTY_METRICS } from "@/engine/types";

const storage = new LocalStorageAdapter();

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});

function snap(puzzleId: string): AttemptSnapshot {
  return {
    puzzleId,
    player: [1, 2, 3],
    metrics: { ...EMPTY_METRICS },
    timer: { accumulatedMs: 1234, wasRunning: false },
    updatedAt: 42,
  };
}

describe("LocalStorageAdapter", () => {
  it("round-trips in-progress snapshots and clears them", async () => {
    await storage.saveProgress(snap("p-round-trip"));
    expect(await storage.getProgress("p-round-trip")).toMatchObject({
      puzzleId: "p-round-trip",
      player: [1, 2, 3],
    });
    await storage.clearProgress("p-round-trip");
    expect(await storage.getProgress("p-round-trip")).toBeNull();
  });

  it("returns null for unknown progress", async () => {
    expect(await storage.getProgress("never-saved")).toBeNull();
  });

  it("records completion: bumps played/completed and sets best + done", async () => {
    const before = await storage.getStats("queens");
    await storage.recordCompletion({
      puzzleId: "c1",
      game: "queens",
      difficulty: "hard",
      completedAt: Date.UTC(2026, 6, 15),
      metrics: { ...EMPTY_METRICS, elapsedMs: 5000 },
      seed: "seed-abc",
    });
    const after = await storage.getStats("queens");
    expect(after.played).toBe(before.played + 1);
    expect(after.completed).toBe(before.completed + 1);
    expect(await storage.getBest("queens", "hard")).toBe(5000);
    expect(await storage.isDone(doneKey("queens", "hard", "seed-abc"))).toBe(true);
    expect(await storage.isDone(doneKey("queens", "hard", "other"))).toBe(false);
  });

  it("best time keeps the minimum across completions", async () => {
    const rec = (elapsedMs: number) => ({
      puzzleId: `b-${elapsedMs}`,
      game: "path" as const,
      difficulty: "expert" as const,
      completedAt: Date.UTC(2026, 6, 15),
      metrics: { ...EMPTY_METRICS, elapsedMs },
    });
    await storage.recordCompletion(rec(8000));
    expect(await storage.getBest("path", "expert")).toBe(8000);
    await storage.recordCompletion(rec(3000));
    expect(await storage.getBest("path", "expert")).toBe(3000);
    await storage.recordCompletion(rec(9000));
    expect(await storage.getBest("path", "expert")).toBe(3000);
  });

  it("counts a same-day streak once and consecutive days as a run", async () => {
    const day = (d: number) => Date.UTC(2026, 6, d);
    const rec = (completedAt: number, id: string) => ({
      puzzleId: id,
      game: "wordpath" as const,
      difficulty: "medium" as const,
      completedAt,
      metrics: { ...EMPTY_METRICS, elapsedMs: 1000 },
    });
    await storage.recordCompletion(rec(day(1), "d1"));
    await storage.recordCompletion(rec(day(1), "d1b")); // same day
    let stats = await storage.getStats("wordpath");
    expect(stats.currentStreak).toBe(1);
    await storage.recordCompletion(rec(day(2), "d2")); // next day
    stats = await storage.getStats("wordpath");
    expect(stats.currentStreak).toBe(2);
    expect(stats.maxStreak).toBe(2);
  });

  it("getStats defaults to an all-zero record for a fresh game", async () => {
    const stats = await storage.getStats("partition");
    expect(stats).toMatchObject({ game: "partition", played: 0, completed: 0, currentStreak: 0, maxStreak: 0 });
  });
});
