import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { Difficulty } from "@/engine/types";
import { puzzleDefinitionSchema, validateDefinitionInvariants } from "@/engine/schemas";
import { generateQueens, queensDailySeed, QUEENS_DIFFICULTY } from "./generate";
import { countQueensSolutions } from "./solve";

const seed = () => fc.string({ minLength: 1, maxLength: 16 });
const DIFFS: Difficulty[] = ["easy", "medium", "hard", "expert"];

describe("Queens generator", () => {
  it("passes the schema + invariants for every difficulty", () => {
    for (const difficulty of DIFFS) {
      const puzzle = generateQueens({ difficulty, seed: `schema-${difficulty}` });
      const parsed = puzzleDefinitionSchema.safeParse(puzzle);
      expect(parsed.success).toBe(true);
      expect(validateDefinitionInvariants(parsed.data as never)).toEqual([]);
    }
  });

  it("produces exactly n connected regions of the right board size", () => {
    for (const difficulty of DIFFS) {
      const { n } = QUEENS_DIFFICULTY[difficulty];
      const puzzle = generateQueens({ difficulty, seed: `regions-${difficulty}` });
      expect(puzzle.meta.rows).toBe(n);
      expect(puzzle.meta.cols).toBe(n);
      expect(puzzle.regions).toHaveLength(n * n);
      expect(new Set(puzzle.regions).size).toBe(n);
    }
  });

  it("is deterministic for a given (seed, difficulty)", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium"), (s, difficulty) => {
        const a = generateQueens({ difficulty, seed: s });
        const b = generateQueens({ difficulty, seed: s });
        expect(a.meta.id).toBe(b.meta.id);
        expect(a.regions).toEqual(b.regions);
      }),
      { numRuns: 15 },
    );
  });

  it("unique-mode puzzles have exactly one solution", () => {
    fc.assert(
      fc.property(seed(), fc.constantFrom<Difficulty>("easy", "medium", "hard"), (s, difficulty) => {
        const puzzle = generateQueens({ difficulty, seed: s });
        return countQueensSolutions(puzzle, 2).count === 1;
      }),
      { numRuns: 12 },
    );
  });

  it("daily seed is stable and date-derived", () => {
    expect(queensDailySeed("2026-07-14")).toBe("daily:2026-07-14");
  });
});
