/**
 * Hand-authored Trace puzzles for the Milestone-3 MVP (before the generator
 * lands in M4). Each has a verified Hamiltonian solution, exported alongside so
 * unit and e2e tests can drive a guaranteed-winnable game.
 *
 * Solutions were laid out as boustrophedon ("snake") paths; checkpoints are
 * sampled along the path in ascending order.
 */
import type { PathPuzzle } from "@/engine/types";

export interface TraceFixture {
  puzzle: PathPuzzle;
  /** A valid full solution path (ordered cell indices). */
  solution: number[];
}

// 5×5 — easy.
const solve5: number[] = [
  0, 1, 2, 3, 4, 9, 8, 7, 6, 5, 10, 11, 12, 13, 14, 19, 18, 17, 16, 15, 20, 21, 22, 23, 24,
];

export const TRACE_5x5_EASY: TraceFixture = {
  solution: solve5,
  puzzle: {
    game: "path",
    meta: {
      id: "fixture-trace-5x5-easy",
      game: "path",
      difficulty: "easy",
      rows: 5,
      cols: 5,
      generatorVersion: 0,
      formatVersion: 1,
    },
    checkpoints: { 0: 1, 4: 2, 5: 3, 14: 4, 15: 5, 24: 6 },
    walls: [],
  },
};

// 6×6 — medium.
const solve6: number[] = [
  0, 1, 2, 3, 4, 5, 11, 10, 9, 8, 7, 6, 12, 13, 14, 15, 16, 17, 23, 22, 21, 20, 19, 18, 24, 25, 26,
  27, 28, 29, 35, 34, 33, 32, 31, 30,
];

export const TRACE_6x6_MEDIUM: TraceFixture = {
  solution: solve6,
  puzzle: {
    game: "path",
    meta: {
      id: "fixture-trace-6x6-medium",
      game: "path",
      difficulty: "medium",
      rows: 6,
      cols: 6,
      generatorVersion: 0,
      formatVersion: 1,
    },
    checkpoints: { 0: 1, 5: 2, 6: 3, 17: 4, 18: 5, 29: 6, 30: 7 },
    walls: [],
  },
};

export const TRACE_FIXTURES: TraceFixture[] = [TRACE_5x5_EASY, TRACE_6x6_MEDIUM];
