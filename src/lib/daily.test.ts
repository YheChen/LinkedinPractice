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
});
