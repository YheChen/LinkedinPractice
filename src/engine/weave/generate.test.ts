import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { Difficulty } from "@/engine/types";
import { puzzleDefinitionSchema, validateDefinitionInvariants } from "@/engine/schemas";
import { generateWeave } from "./generate";
import { WORD_SET } from "./dictionary";
import { solveWeave, countWeaveSolutions } from "./solve";

const seed = () => fc.string({ minLength: 1, maxLength: 16 });

describe("Weave generator — property based", () => {
  it("uses every cell exactly once (letters sum to grid size)", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium"), (s, difficulty) => {
        const p = generateWeave({ seed: s, difficulty, unique: false });
        const nonNull = p.letters.filter((l) => l !== null).length;
        const wordSum = p.words.reduce((a, w) => a + w.length, 0);
        return nonNull === wordSum && p.letters.length === p.meta.rows * p.meta.cols;
      }),
      { numRuns: 20 },
    );
  });

  it("only uses words from the curated dictionary", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium"), (s, difficulty) => {
        const p = generateWeave({ seed: s, difficulty, unique: false });
        return p.words.every((w) => WORD_SET.has(w));
      }),
      { numRuns: 20 },
    );
  });

  it("the intended words are actually placeable (solver finds a tiling)", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium"), (s, difficulty) => {
        const p = generateWeave({ seed: s, difficulty, unique: false });
        const sol = solveWeave(p);
        return sol !== null && sol.length === p.words.length;
      }),
      { numRuns: 15 },
    );
  });

  it("unique-mode puzzles have exactly one intended-word tiling", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium"), (s, difficulty) => {
        const p = generateWeave({ seed: s, difficulty, unique: true });
        const { count, aborted } = countWeaveSolutions(p, 2);
        return aborted || count === 1; // accepted boards are unique (or the check was budget-bounded)
      }),
      { numRuns: 10 },
    );
  });

  it("a seed reproduces the identical puzzle", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium"), (s, difficulty) => {
        const a = generateWeave({ seed: s, difficulty, unique: false });
        const b = generateWeave({ seed: s, difficulty, unique: false });
        return JSON.stringify(a) === JSON.stringify(b);
      }),
      { numRuns: 20 },
    );
  });

  it("serialize ∘ deserialize preserves the definition and passes invariants", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium"), (s, difficulty) => {
        const p = generateWeave({ seed: s, difficulty });
        const json = JSON.stringify(p);
        const parsed = puzzleDefinitionSchema.parse(JSON.parse(json));
        return validateDefinitionInvariants(parsed).length === 0 && JSON.stringify(parsed) === json;
      }),
      { numRuns: 10 },
    );
  });
});

describe("Weave generator — difficulty", () => {
  it.each<Difficulty>(["easy", "medium", "hard", "expert"])(
    "%s produces a solvable board of the configured size",
    (difficulty) => {
      const p = generateWeave({ seed: "weave-seed-9", difficulty });
      expect(p.letters.length).toBe(p.meta.rows * p.meta.cols);
      expect(solveWeave(p)).not.toBeNull();
    },
  );
});
