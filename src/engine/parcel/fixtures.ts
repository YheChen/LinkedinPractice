/**
 * Hand-authored Parcel puzzles for the Milestone-5 MVP (solver + generator land
 * in M6). The known solution partition is exported for tests.
 */
import type { DrawnRect, PartitionPuzzle } from "@/engine/types";

// 5×5 tiling:
//   A: rows0-4 col0        (5×1 tall,  area 5) clue @ (2,0)=10
//   B: rows0-4 col1        (5×1 tall,  area 5) clue @ (2,1)=11
//   C: rows0-1 cols2-4     (2×3 wide,  area 6) clue @ (0,3)=3
//   D: rows2-4 cols2-4     (3×3 square,area 9) clue @ (3,3)=18
export const PARCEL_5x5: {
  puzzle: PartitionPuzzle;
  solution: DrawnRect[];
} = {
  puzzle: {
    game: "partition",
    meta: {
      id: "fixture-parcel-5x5",
      game: "partition",
      difficulty: "easy",
      rows: 5,
      cols: 5,
      generatorVersion: 0,
      formatVersion: 1,
    },
    clues: [
      { cell: 10, area: 5, shape: "tall" },
      { cell: 11, area: 5, shape: "tall" },
      { cell: 3, area: 6, shape: "wide" },
      { cell: 18, area: 9, shape: "square" },
    ],
  },
  solution: [
    { clueCell: 10, top: 0, left: 0, bottom: 4, right: 0 },
    { clueCell: 11, top: 0, left: 1, bottom: 4, right: 1 },
    { clueCell: 3, top: 0, left: 2, bottom: 1, right: 4 },
    { clueCell: 18, top: 2, left: 2, bottom: 4, right: 4 },
  ],
};
