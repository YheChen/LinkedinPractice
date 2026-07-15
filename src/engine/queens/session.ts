"use client";

/**
 * Queens play session (Zustand). Wires the pure rules + solver to the timer,
 * undo/redo history, metrics, and local persistence.
 *
 * Interaction model differs from the drag games: a Queens move is a single
 * discrete cell tap that cycles EMPTY → X → QUEEN → EMPTY. There is no transient
 * "live vs committed" divergence, so every `cycle` commits one history entry.
 */
import { create } from "zustand";
import type { AttemptMetrics, QueensPuzzle } from "@/engine/types";
import { EMPTY_METRICS } from "@/engine/types";
import {
  createHistory,
  commit,
  undo as histUndo,
  redo as histRedo,
  canUndo,
  canRedo,
  type History,
} from "@/engine/session/history";
import { Stopwatch } from "@/lib/timer";
import { storage } from "@/lib/storage";
import { boardSize, cycleCell, EMPTY, initialQueensState, isSolved, validate } from "./rules";

/** Any placed mark or queen — i.e. the board is worth persisting / not empty. */
function hasProgress(cells: readonly number[]): boolean {
  return cells.some((c) => c !== EMPTY);
}
import { computeQueensHint } from "./solve";

export interface QueensSessionState {
  puzzle: QueensPuzzle;
  history: History<number[]>;
  /** live per-cell marks (0 empty, 1 X, 2 queen) — mirrors history.present */
  cells: number[];
  metrics: AttemptMetrics;
  stopwatch: Stopwatch;
  running: boolean;
  solved: boolean;
  /** internal: completion side-effects (stop timer, record) have run */
  finalized: boolean;
  message: string;
  errorCells: number[];
  hintCells: number[];

  canUndo: () => boolean;
  canRedo: () => boolean;

  // lifecycle
  startTimer: () => void;
  setPaused: (paused: boolean) => void;

  // move
  cycle: (cell: number) => void;

  // controls
  undo: () => void;
  redo: () => void;
  restart: () => void;
  hint: () => void;

  // persistence (autosave/resume)
  snapshot: () => import("@/lib/storage").AttemptSnapshot | null;
  restore: (snap: import("@/lib/storage").AttemptSnapshot) => void;
}

function makeInitial(puzzle: QueensPuzzle) {
  const initial = initialQueensState(puzzle);
  const v = validate(puzzle, initial);
  return {
    puzzle,
    history: createHistory<number[]>(initial),
    cells: initial,
    metrics: { ...EMPTY_METRICS },
    stopwatch: new Stopwatch(),
    running: false,
    solved: false,
    finalized: false,
    message: v.message ?? "",
    errorCells: v.errorCells,
    hintCells: [] as number[],
  };
}

export function createQueensSession(puzzle: QueensPuzzle) {
  return create<QueensSessionState>((set, get) => {
    const recompute = (cells: number[]) => {
      const v = validate(get().puzzle, cells);
      return { message: v.message ?? "", solved: v.solved, errorCells: v.errorCells };
    };

    const finalizeIfSolved = (cells: number[]) => {
      const s = get();
      if (!isSolved(s.puzzle, cells) || s.finalized) return;
      s.stopwatch.pause();
      const metrics = { ...s.metrics, elapsedMs: s.stopwatch.elapsedMs() };
      set({ solved: true, finalized: true, running: false, metrics });
      void storage.recordCompletion({
        puzzleId: s.puzzle.meta.id,
        game: "queens",
        difficulty: s.puzzle.meta.difficulty,
        completedAt: Date.now(),
        metrics,
        seed: s.puzzle.meta.seed,
      });
    };

    return {
      ...makeInitial(puzzle),

      canUndo: () => canUndo(get().history),
      canRedo: () => canRedo(get().history),

      startTimer: () => {
        const s = get();
        if (!s.running && !s.solved) {
          s.stopwatch.start();
          set({ running: true });
        }
      },

      setPaused: (paused) => {
        const s = get();
        if (s.solved) return;
        if (paused && s.running) {
          s.stopwatch.pause();
          set({ running: false });
        } else if (!paused && !s.running) {
          s.stopwatch.start();
          set({ running: true });
        }
      },

      cycle: (cell) => {
        const s = get();
        if (s.solved) return;
        if (cell < 0 || cell >= s.cells.length) return;
        s.startTimer();
        const next = cycleCell(s.cells, cell);
        set({ cells: next, history: commit(s.history, next), hintCells: [], ...recompute(next) });
        finalizeIfSolved(next);
      },

      undo: () => {
        const s = get();
        const history = histUndo(s.history);
        set({ history, cells: history.present, hintCells: [], ...recompute(history.present) });
      },

      redo: () => {
        const s = get();
        const history = histRedo(s.history);
        set({ history, cells: history.present, hintCells: [], ...recompute(history.present) });
      },

      restart: () => {
        const s = get();
        const initial = initialQueensState(s.puzzle);
        s.stopwatch.reset();
        set({
          history: createHistory(initial),
          cells: initial,
          running: false,
          finalized: false,
          hintCells: [],
          metrics: { ...s.metrics, restarts: s.metrics.restarts + 1, hintsUsed: 0, mistakes: 0 },
          ...recompute(initial),
        });
      },

      hint: () => {
        const s = get();
        if (s.solved) return;
        s.startTimer();
        const result = computeQueensHint(s.puzzle, s.cells);
        if (!result) return;
        const metrics = { ...s.metrics, hintsUsed: s.metrics.hintsUsed + 1 };
        set({
          cells: result.cells,
          history: commit(s.history, result.cells),
          hintCells: [result.revealed],
          metrics,
          ...recompute(result.cells),
        });
        finalizeIfSolved(result.cells);
      },

      snapshot: () => {
        const s = get();
        if (s.solved || !hasProgress(s.cells)) return null;
        return {
          puzzleId: s.puzzle.meta.id,
          player: s.cells,
          metrics: s.metrics,
          timer: { accumulatedMs: s.stopwatch.elapsedMs(), wasRunning: false },
          updatedAt: Date.now(),
        };
      },

      restore: (snap) => {
        const s = get();
        const cells = snap.player;
        const n = boardSize(s.puzzle);
        // Reject anything that isn't a legal, in-progress board for THIS puzzle.
        if (!Array.isArray(cells) || cells.length !== n * n) return;
        if (!cells.every((v) => v === 0 || v === 1 || v === 2)) return;
        if (isSolved(s.puzzle, cells)) return;
        if (hasProgress(s.cells)) return; // don't clobber an in-progress board
        const restored = cells.slice();
        set({
          cells: restored,
          history: createHistory(restored),
          metrics: { ...EMPTY_METRICS, ...snap.metrics },
          stopwatch: new Stopwatch({ accumulatedMs: snap.timer.accumulatedMs, runningSince: null }),
          running: false,
          finalized: false,
          hintCells: [],
          ...recompute(restored),
        });
      },
    };
  });
}

export type QueensStore = ReturnType<typeof createQueensSession>;
