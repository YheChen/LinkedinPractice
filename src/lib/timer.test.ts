import { describe, it, expect } from "vitest";
import { Stopwatch, formatDuration } from "./timer";

/** Fake monotonic clock we can advance by hand. */
function fakeClock() {
  let t = 1000;
  const now = () => t;
  const advance = (ms: number) => {
    t += ms;
  };
  return { now, advance };
}

describe("Stopwatch — monotonic, pause-aware", () => {
  it("accumulates only while running", () => {
    const clk = fakeClock();
    const sw = new Stopwatch(undefined, clk.now);
    sw.start();
    clk.advance(5000);
    expect(sw.elapsedMs()).toBe(5000);
    sw.pause();
    clk.advance(10000); // paused: should not count
    expect(sw.elapsedMs()).toBe(5000);
    sw.start();
    clk.advance(2000);
    expect(sw.elapsedMs()).toBe(7000);
  });

  it("start and pause are idempotent", () => {
    const clk = fakeClock();
    const sw = new Stopwatch(undefined, clk.now);
    sw.start();
    sw.start();
    clk.advance(1000);
    sw.pause();
    sw.pause();
    expect(sw.elapsedMs()).toBe(1000);
  });

  it("survives a simulated tab-throttle (one big delta on resume)", () => {
    const clk = fakeClock();
    const sw = new Stopwatch(undefined, clk.now);
    sw.start();
    clk.advance(60_000); // tab was backgrounded; single large jump
    expect(sw.elapsedMs()).toBe(60_000);
  });

  it("restores from a persisted snapshot", () => {
    const clk = fakeClock();
    const sw = new Stopwatch({ accumulatedMs: 12_000, runningSince: null }, clk.now);
    expect(sw.elapsedMs()).toBe(12_000);
    sw.start();
    clk.advance(3000);
    const persisted = sw.toPersisted();
    expect(persisted.accumulatedMs).toBe(15_000);
    expect(persisted.wasRunning).toBe(true);
  });
});

describe("formatDuration", () => {
  it("formats m:ss and h:mm:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65_000)).toBe("1:05");
    expect(formatDuration(3_661_000)).toBe("1:01:01");
  });
});
