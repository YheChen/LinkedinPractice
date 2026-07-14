import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { Difficulty } from "@/engine/types";
import { puzzleDefinitionSchema, validateDefinitionInvariants } from "@/engine/schemas";
import { generateParcel } from "./generate";
import {
  countParcelSolutions,
  hasUniqueParcelSolution,
  solveParcel,
} from "./solve";
import { validate } from "./rules";
import { PARCEL_5x5 } from "./fixtures";

const seed = () => fc.string({ minLength: 1, maxLength: 16 });

describe("Parcel solver", () => {
  it("finds the fixture's unique solution", () => {
    expect(hasUniqueParcelSolution(PARCEL_5x5.puzzle)).toBe(true);
    const sol = solveParcel(PARCEL_5x5.puzzle);
    expect(sol).not.toBeNull();
    expect(validate(PARCEL_5x5.puzzle, sol!).solved).toBe(true);
  });

  it("countParcelSolutions early-exits at the cap", () => {
    expect(countParcelSolutions(PARCEL_5x5.puzzle, 2)).toBe(1);
  });
});

describe("Parcel generator — property based", () => {
  it("clue areas sum to the grid size (a complete tiling)", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium"), (s, difficulty) => {
        const p = generateParcel({ seed: s, difficulty, unique: false });
        const sum = p.clues.reduce((a, c) => a + (c.area ?? 0), 0);
        return sum === p.meta.rows * p.meta.cols;
      }),
      { numRuns: 20 },
    );
  });

  it("unique-mode puzzles have exactly one solution", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium"), (s, difficulty) => {
        const p = generateParcel({ seed: s, difficulty, unique: true });
        return hasUniqueParcelSolution(p);
      }),
      { numRuns: 12 },
    );
  });

  it("the solver's solution satisfies every rule (solved, no errors)", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium"), (s, difficulty) => {
        const p = generateParcel({ seed: s, difficulty });
        const sol = solveParcel(p);
        if (!sol) return false;
        // one rect per clue, areas match, fully covers, no overlaps
        if (sol.length !== p.clues.length) return false;
        return validate(p, sol).solved;
      }),
      { numRuns: 12 },
    );
  });

  it("a seed reproduces the identical puzzle", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium", "hard"), (s, difficulty) => {
        const a = generateParcel({ seed: s, difficulty, unique: false });
        const b = generateParcel({ seed: s, difficulty, unique: false });
        return JSON.stringify(a) === JSON.stringify(b);
      }),
      { numRuns: 20 },
    );
  });

  it("serialize ∘ deserialize preserves the definition", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium"), (s, difficulty) => {
        const p = generateParcel({ seed: s, difficulty });
        const json = JSON.stringify(p);
        const parsed = puzzleDefinitionSchema.parse(JSON.parse(json));
        return validateDefinitionInvariants(parsed).length === 0 && JSON.stringify(parsed) === json;
      }),
      { numRuns: 12 },
    );
  });
});

describe("Parcel generator — difficulty", () => {
  it.each<Difficulty>(["easy", "medium", "hard", "expert"])(
    "%s produces a uniquely-solvable board of the configured size",
    (difficulty) => {
      const p = generateParcel({ seed: "parcel-seed-7", difficulty });
      expect(hasUniqueParcelSolution(p)).toBe(true);
      // every clue's area is at least 1 and no clue exceeds the grid
      for (const c of p.clues) expect(c.area!).toBeGreaterThanOrEqual(1);
      expect(p.clues.reduce((a, c) => a + (c.area ?? 0), 0)).toBe(p.meta.rows * p.meta.cols);
    },
  );
});
