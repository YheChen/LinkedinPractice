/**
 * Hand-authored Weave puzzle for the Milestone-7 MVP (generator + dictionary +
 * ambiguity solver arrive in M8). Five 5-letter words laid along the rows fill
 * the 5×5 grid; the solution paths are exported for tests.
 */
import type { WordPathPuzzle } from "@/engine/types";

const ROWS = ["PLANT", "BRAVE", "CRANE", "SHINE", "GLOVE"] as const;

export const WEAVE_5x5: { puzzle: WordPathPuzzle; solution: number[][] } = {
  puzzle: {
    game: "wordpath",
    meta: {
      id: "fixture-weave-5x5",
      game: "wordpath",
      difficulty: "easy",
      rows: 5,
      cols: 5,
      generatorVersion: 0,
      formatVersion: 1,
    },
    letters: ROWS.flatMap((w) => w.split("")),
    wordLengths: ROWS.map((w) => w.length),
    words: [...ROWS],
  },
  solution: ROWS.map((_, r) => [0, 1, 2, 3, 4].map((c) => r * 5 + c)),
};
