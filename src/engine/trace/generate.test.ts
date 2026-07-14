import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { Difficulty } from "@/engine/types";
import { puzzleDefinitionSchema, validateDefinitionInvariants } from "@/engine/schemas";
import { generateTrace, traceDailySeed } from "./generate";
import { countSolutions, solveFrom, hasUniqueSolution } from "./solve";
import { canExtend, startCell, totalCells } from "./rules";

const seed = () => fc.string({ minLength: 1, maxLength: 16 });

describe("Trace generator — property based", () => {
  it("every generated puzzle has at least one solution", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium"), (s, difficulty) => {
        const puzzle = generateTrace({ seed: s, difficulty, unique: false });
        return solveFrom(puzzle, [startCell(puzzle)]) !== null;
      }),
      { numRuns: 20 },
    );
  });

  it("unique-mode puzzles have exactly one solution", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium"), (s, difficulty) => {
        const puzzle = generateTrace({ seed: s, difficulty, unique: true });
        return hasUniqueSolution(puzzle);
      }),
      { numRuns: 15 },
    );
  });

  it("the found solution satisfies every move invariant and covers the grid", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium"), (s, difficulty) => {
        const puzzle = generateTrace({ seed: s, difficulty });
        const sol = solveFrom(puzzle, [startCell(puzzle)]);
        if (!sol) return false;
        if (sol.length !== totalCells(puzzle)) return false;
        if (new Set(sol).size !== sol.length) return false; // no repeats
        for (let i = 1; i < sol.length; i++) {
          if (!canExtend(puzzle, sol.slice(0, i), sol[i]!).ok) return false;
        }
        return true;
      }),
      { numRuns: 15 },
    );
  });

  it("a seed + generator version reproduces the identical puzzle", () => {
    // Determinism holds regardless of the uniqueness loop (same rng stream);
    // unique:false keeps this fast while still exercising path + wall + checkpoint
    // sampling. A dedicated case below covers determinism WITH uniqueness on.
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium", "hard"), (s, difficulty) => {
        const a = generateTrace({ seed: s, difficulty, unique: false });
        const b = generateTrace({ seed: s, difficulty, unique: false });
        return JSON.stringify(a) === JSON.stringify(b);
      }),
      { numRuns: 25 },
    );
  });

  it("determinism holds with uniqueness enforcement on (fixed seeds)", () => {
    for (const difficulty of ["easy", "medium"] as const) {
      const a = generateTrace({ seed: "repro-unique", difficulty });
      const b = generateTrace({ seed: "repro-unique", difficulty });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });

  it("serialize ∘ deserialize preserves the definition and passes invariants", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium"), (s, difficulty) => {
        const puzzle = generateTrace({ seed: s, difficulty });
        const json = JSON.stringify(puzzle);
        const parsed = puzzleDefinitionSchema.parse(JSON.parse(json));
        return (
          validateDefinitionInvariants(parsed).length === 0 &&
          JSON.stringify(parsed) === json
        );
      }),
      { numRuns: 15 },
    );
  });
});

describe("Trace generator — difficulty & daily", () => {
  it.each<Difficulty>(["easy", "medium", "hard", "expert"])(
    "%s produces a uniquely-solvable puzzle of the configured size",
    (difficulty) => {
      const puzzle = generateTrace({ seed: "fixed-seed-42", difficulty });
      expect(hasUniqueSolution(puzzle)).toBe(true);
      expect(puzzle.meta.difficulty).toBe(difficulty);
      // checkpoint 1 must exist and be the solver's start.
      expect(() => startCell(puzzle)).not.toThrow();
    },
  );

  it("daily seed is deterministic for a date", () => {
    const p1 = generateTrace({ seed: traceDailySeed("2026-07-14"), difficulty: "medium" });
    const p2 = generateTrace({ seed: traceDailySeed("2026-07-14"), difficulty: "medium" });
    expect(p1.meta.id).toBe(p2.meta.id);
    const p3 = generateTrace({ seed: traceDailySeed("2026-07-15"), difficulty: "medium" });
    expect(p3.meta.id).not.toBe(p1.meta.id);
  });

  it("countSolutions early-exits at the cap", () => {
    const puzzle = generateTrace({ seed: "cap-test", difficulty: "easy", unique: false });
    expect(countSolutions(puzzle, 2)).toBeLessThanOrEqual(2);
  });
});
