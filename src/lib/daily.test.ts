import { describe, it, expect } from "vitest";
import { addDaysISO, dailySeed, dailyDoneKey, monthCalendar, shortDate } from "./daily";
import { doneKey } from "./storage";
import { LocalStorageAdapter } from "./storage";

describe("daily helpers", () => {
  it("dailySeed is stable per date and feeds doneKey", () => {
    expect(dailySeed("2026-07-14")).toBe("daily:2026-07-14");
    expect(dailyDoneKey("path", "2026-07-14")).toBe(doneKey("path", "medium", "daily:2026-07-14"));
  });

  it("addDaysISO moves across month boundaries", () => {
    expect(addDaysISO("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDaysISO("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("shortDate formats month + day", () => {
    expect(shortDate("2026-07-14")).toBe("Jul 14");
  });

  it("monthCalendar returns full weeks covering the month", () => {
    const weeks = monthCalendar(2026, 6); // July 2026
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    const days = weeks.flat().filter((c) => c.dateISO !== null);
    expect(days).toHaveLength(31);
    expect(days[0]!.dateISO).toBe("2026-07-01");
    expect(days[30]!.dateISO).toBe("2026-07-31");
  });
});

describe("storage completion set", () => {
  it("records and reads seed-keyed completions", async () => {
    const s = new LocalStorageAdapter();
    await s.recordCompletion({
      puzzleId: "p1",
      game: "path",
      difficulty: "medium",
      completedAt: Date.parse("2026-07-14T10:00:00Z"),
      metrics: { elapsedMs: 1000, backtracks: 0, hintsUsed: 0, restarts: 0, redraws: 0, mistakes: 0 },
      seed: "daily:2026-07-14",
    });
    expect(await s.isDone(dailyDoneKey("path", "2026-07-14"))).toBe(true);
    expect(await s.isDone(dailyDoneKey("path", "2026-07-15"))).toBe(false);
  });

  it("increments the streak on consecutive days and resets after a gap", async () => {
    const s = new LocalStorageAdapter();
    const metrics = { elapsedMs: 1000, backtracks: 0, hintsUsed: 0, restarts: 0, redraws: 0, mistakes: 0 };
    const rec = (dayISO: string) =>
      s.recordCompletion({
        puzzleId: `p-${dayISO}`,
        game: "wordpath",
        difficulty: "medium",
        completedAt: Date.parse(`${dayISO}T10:00:00Z`),
        metrics,
        seed: `daily:${dayISO}`,
      });

    await rec("2026-07-14");
    expect((await s.getStats("wordpath")).currentStreak).toBe(1);
    await rec("2026-07-15"); // consecutive
    expect((await s.getStats("wordpath")).currentStreak).toBe(2);
    await rec("2026-07-18"); // gap → reset
    const stats = await s.getStats("wordpath");
    expect(stats.currentStreak).toBe(1);
    expect(stats.maxStreak).toBe(2);
    expect(stats.completed).toBe(3);
  });

  it("keeps the best (lowest) time per game+difficulty", async () => {
    const s = new LocalStorageAdapter();
    const base = { backtracks: 0, hintsUsed: 0, restarts: 0, redraws: 0, mistakes: 0 };
    await s.recordCompletion({ puzzleId: "a", game: "path", difficulty: "hard", completedAt: 1, metrics: { ...base, elapsedMs: 9000 } });
    await s.recordCompletion({ puzzleId: "b", game: "path", difficulty: "hard", completedAt: 2, metrics: { ...base, elapsedMs: 5000 } });
    await s.recordCompletion({ puzzleId: "c", game: "path", difficulty: "hard", completedAt: 3, metrics: { ...base, elapsedMs: 7000 } });
    expect(await s.getBest("path", "hard")).toBe(5000);
  });
});
