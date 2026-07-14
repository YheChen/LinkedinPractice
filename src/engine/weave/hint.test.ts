import { describe, it, expect } from "vitest";
import { createWeaveSession } from "./session";
import { generateWeave } from "./generate";

/**
 * Regression: repeated Hint must always finish a GENERATED board. The old
 * greedy findWordPath hint could place a word on an alternative path and strand
 * the remaining words (a single word is often traceable multiple ways). The
 * solution-based hint reveals globally-consistent paths, so it always completes.
 */
describe("Weave hint — always solves a generated board", () => {
  const seeds = ["h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8"];
  it.each(seeds)("difficulty medium, seed %s", (seed) => {
    const puzzle = generateWeave({ seed, difficulty: "medium" });
    const store = createWeaveSession(puzzle);
    // No more than (number of words) hints should ever be needed; cap generously.
    for (let i = 0; i < puzzle.words.length + 2 && !store.getState().solvedAll; i++) {
      store.getState().hint();
    }
    expect(store.getState().solvedAll).toBe(true);
    expect(store.getState().solved).toHaveLength(puzzle.words.length);
  });
});
