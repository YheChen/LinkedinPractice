import { describe, it, expect } from "vitest";
import {
  puzzleDefinitionSchema,
  validateDefinitionInvariants,
  type PuzzleDefinitionInput,
} from "./schemas";

function meta(over: Partial<PuzzleDefinitionInput["meta"]> = {}) {
  return {
    id: "x",
    game: "queens" as const,
    difficulty: "easy" as const,
    rows: 4,
    cols: 4,
    generatorVersion: 1,
    formatVersion: 1,
    ...over,
  };
}

describe("puzzleDefinitionSchema", () => {
  it("accepts a well-formed queens puzzle", () => {
    const def = { game: "queens", meta: meta(), regions: [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 3, 3] };
    expect(puzzleDefinitionSchema.safeParse(def).success).toBe(true);
  });

  it("rejects an unknown game discriminant", () => {
    expect(puzzleDefinitionSchema.safeParse({ game: "nope", meta: meta(), regions: [] }).success).toBe(false);
  });

  it("rejects region ids beyond the dimension ceiling", () => {
    const def = { game: "queens", meta: meta(), regions: [99] };
    expect(puzzleDefinitionSchema.safeParse(def).success).toBe(false);
  });
});

describe("validateDefinitionInvariants — queens", () => {
  const quadrants = [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 3, 3];

  it("passes for connected quadrant regions", () => {
    const def = { game: "queens", meta: meta(), regions: quadrants } as PuzzleDefinitionInput;
    expect(validateDefinitionInvariants(def)).toEqual([]);
  });

  it("flags a non-square board", () => {
    const def = {
      game: "queens",
      meta: meta({ rows: 3, cols: 4 }),
      regions: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2],
    } as PuzzleDefinitionInput;
    expect(validateDefinitionInvariants(def).join(" ")).toMatch(/square/i);
  });

  it("flags a regions/size length mismatch", () => {
    const def = { game: "queens", meta: meta(), regions: quadrants.slice(0, 15) } as PuzzleDefinitionInput;
    expect(validateDefinitionInvariants(def).join(" ")).toMatch(/regions length/i);
  });

  it("flags missing region ids", () => {
    // only ids 0..2 used across 16 cells (region 3 absent)
    const regions = [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2];
    const def = { game: "queens", meta: meta(), regions } as PuzzleDefinitionInput;
    expect(validateDefinitionInvariants(def).join(" ")).toMatch(/ids 0\.\.3/);
  });

  it("flags a disconnected region", () => {
    // region 0 appears at two non-adjacent cells (index 0 and 14) → split
    const regions = [0, 1, 1, 1, 1, 1, 1, 1, 2, 2, 3, 3, 2, 2, 0, 3];
    const def = { game: "queens", meta: meta(), regions } as PuzzleDefinitionInput;
    expect(validateDefinitionInvariants(def).join(" ")).toMatch(/connected/i);
  });
});

describe("validateDefinitionInvariants — other games", () => {
  it("flags duplicate partition clue cells", () => {
    const def = {
      game: "partition",
      meta: meta({ game: "partition" }),
      clues: [
        { cell: 0, area: 2, shape: "wide" as const },
        { cell: 0, area: 2, shape: "tall" as const },
      ],
    } as PuzzleDefinitionInput;
    expect(validateDefinitionInvariants(def).join(" ")).toMatch(/duplicate clue/i);
  });

  it("flags a wordpath letter/word-length mismatch", () => {
    const def = {
      game: "wordpath",
      meta: meta({ game: "wordpath", rows: 1, cols: 3 }),
      letters: ["C", "A", "T"],
      wordLengths: [2],
      words: ["CAT"],
    } as PuzzleDefinitionInput;
    expect(validateDefinitionInvariants(def).length).toBeGreaterThan(0);
  });

  it("flags duplicate path checkpoint numbers", () => {
    const def = {
      game: "path",
      meta: meta({ game: "path" }),
      checkpoints: { "0": 1, "5": 1 },
      walls: [],
    } as PuzzleDefinitionInput;
    expect(validateDefinitionInvariants(def).join(" ")).toMatch(/duplicate checkpoint/i);
  });
});
