"use client";

/**
 * Trace play session (Zustand). Wires the pure rules + solver to the timer,
 * undo/redo history, metrics, and local persistence.
 *
 * State separation (SPEC §3):
 *  • `puzzle` immutable;
 *  • `history` holds COMMITTED path snapshots (undo/redo);
 *  • `live` is the working path — during a drag it diverges from history.present
 *    and is committed only on gesture end (transient moves never hit history);
 *  • `stopwatch` is the monotonic timer; `running` mirrors it for the display.
 */
import { create } from "zustand";
import type { AttemptMetrics, PathPuzzle } from "@/engine/types";
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
import {
  backtrackTo,
  canExtend,
  extend,
  initialPathState,
  isSolved,
  validate,
} from "./rules";
import { computeHint } from "./solve";

export interface TraceSessionState {
  puzzle: PathPuzzle;
  history: History<number[]>;
  live: number[];
  dragging: boolean;
  metrics: AttemptMetrics;
  stopwatch: Stopwatch;
  running: boolean;
  solved: boolean;
  /** internal: completion side-effects (stop timer, record) have run */
  finalized: boolean;
  message: string;
  hintCells: number[];

  // derived helpers
  canUndo: () => boolean;
  canRedo: () => boolean;

  // lifecycle
  startTimer: () => void;
  setPaused: (paused: boolean) => void;

  // gesture (from usePointerBoard)
  gestureStart: (cell: number) => void;
  cellEnter: (cell: number) => void;
  gestureEnd: () => void;
  gestureCancel: () => void;

  // controls
  undo: () => void;
  redo: () => void;
  restart: () => void;
  hint: () => void;

  // persistence (autosave/resume)
  snapshot: () => import("@/lib/storage").AttemptSnapshot | null;
  restore: (snap: import("@/lib/storage").AttemptSnapshot) => void;
}

function makeInitial(puzzle: PathPuzzle) {
  const initial = initialPathState(puzzle);
  return {
    puzzle,
    history: createHistory<number[]>(initial),
    live: initial,
    dragging: false,
    metrics: { ...EMPTY_METRICS },
    stopwatch: new Stopwatch(),
    running: false,
    solved: false,
    finalized: false,
    message: validate(puzzle, initial).message ?? "",
    hintCells: [] as number[],
  };
}

export function createTraceSession(puzzle: PathPuzzle) {
  return create<TraceSessionState>((set, get) => {
    const recompute = (live: number[]) => {
      const { puzzle } = get();
      const v = validate(puzzle, live);
      return { message: v.message ?? "", solved: v.solved };
    };

    const finalizeIfSolved = (live: number[]) => {
      const s = get();
      if (!isSolved(s.puzzle, live) || s.finalized) return;
      s.stopwatch.pause();
      const metrics = { ...s.metrics, elapsedMs: s.stopwatch.elapsedMs() };
      set({ solved: true, finalized: true, running: false, metrics });
      void storage.recordCompletion({
        puzzleId: s.puzzle.meta.id,
        game: "path",
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

      gestureStart: (cell) => {
        const s = get();
        if (s.solved) return;
        s.startTimer();
        let live = s.live;
        if (live.includes(cell)) {
          live = backtrackTo(live, cell); // grab an existing point → backtrack
        } else if (canExtend(s.puzzle, live, cell).ok) {
          live = extend(s.puzzle, live, cell)!;
        } else {
          set({ dragging: true });
          return;
        }
        set({ dragging: true, live, hintCells: [], ...recompute(live) });
      },

      cellEnter: (cell) => {
        const s = get();
        if (!s.dragging || s.solved) return;
        const last = s.live[s.live.length - 1];
        if (cell === last) return;
        let live = s.live;
        let backtracks = s.metrics.backtracks;
        if (live.includes(cell)) {
          live = backtrackTo(live, cell);
          backtracks += 1;
        } else if (canExtend(s.puzzle, live, cell).ok) {
          live = extend(s.puzzle, live, cell)!;
        } else {
          return; // illegal step — ignore (prevented, not punished)
        }
        set({ live, metrics: { ...s.metrics, backtracks }, ...recompute(live) });
        finalizeIfSolved(live);
      },

      gestureEnd: () => {
        const s = get();
        set({ dragging: false, history: commit(s.history, s.live) });
        finalizeIfSolved(s.live);
      },

      gestureCancel: () => {
        // Roll back the in-flight gesture to the last committed state.
        const s = get();
        set({ dragging: false, live: s.history.present, ...recompute(s.history.present) });
      },

      undo: () => {
        const s = get();
        const history = histUndo(s.history);
        set({ history, live: history.present, hintCells: [], ...recompute(history.present) });
      },

      redo: () => {
        const s = get();
        const history = histRedo(s.history);
        set({ history, live: history.present, ...recompute(history.present) });
      },

      restart: () => {
        const s = get();
        const initial = initialPathState(s.puzzle);
        s.stopwatch.reset();
        set({
          history: createHistory(initial),
          live: initial,
          dragging: false,
          running: false,
          finalized: false,
          hintCells: [],
          metrics: { ...s.metrics, restarts: s.metrics.restarts + 1, backtracks: 0, hintsUsed: 0 },
          ...recompute(initial), // sets solved:false + fresh message
        });
      },

      hint: () => {
        const s = get();
        if (s.solved) return;
        s.startTimer();
        const result = computeHint(s.puzzle, s.live);
        if (!result) return;
        const metrics = { ...s.metrics, hintsUsed: s.metrics.hintsUsed + 1 };
        set({
          live: result.path,
          history: commit(s.history, result.path),
          hintCells: [result.revealed],
          metrics,
          ...recompute(result.path),
        });
        finalizeIfSolved(result.path);
      },

      snapshot: () => {
        const s = get();
        if (s.solved || s.live.length <= 1) return null;
        return {
          puzzleId: s.puzzle.meta.id,
          player: s.live,
          metrics: s.metrics,
          timer: { accumulatedMs: s.stopwatch.elapsedMs(), wasRunning: false },
          updatedAt: Date.now(),
        };
      },

      restore: (snap) => {
        const live = snap.player as number[];
        if (!Array.isArray(live) || live.length === 0) return;
        set({
          live,
          history: createHistory(live),
          metrics: { ...EMPTY_METRICS, ...snap.metrics },
          stopwatch: new Stopwatch({ accumulatedMs: snap.timer.accumulatedMs, runningSince: null }),
          running: false,
          finalized: false,
          ...recompute(live), // sets solved + message
        });
      },
    };
  });
}

export type TraceStore = ReturnType<typeof createTraceSession>;
