"use client";

/**
 * Weave play session (Zustand). Committed history holds snapshots of the solved
 * word list; the active trace is transient (never in history) until submitted.
 */
import { create } from "zustand";
import type { AttemptMetrics, WordPathPuzzle } from "@/engine/types";
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
  backtrackActiveTo,
  canExtendActive,
  extendActive,
  isSolved,
  remainingWords,
  solvedCells,
  submit,
  validate,
} from "./rules";
import { findWordPath } from "./solve";

export interface WeaveSessionState {
  puzzle: WordPathPuzzle;
  history: History<number[][]>;
  solved: number[][];
  active: number[];
  dragging: boolean;
  metrics: AttemptMetrics;
  stopwatch: Stopwatch;
  running: boolean;
  solvedAll: boolean;
  finalized: boolean;
  message: string;
  lastResult: "ok" | "bad" | null;

  canUndo: () => boolean;
  canRedo: () => boolean;
  startTimer: () => void;
  setPaused: (paused: boolean) => void;

  gestureStart: (cell: number) => void;
  cellEnter: (cell: number) => void;
  gestureEnd: () => void;
  gestureCancel: () => void;

  undo: () => void;
  redo: () => void;
  restart: () => void;
  hint: () => void;
}

export function createWeaveSession(puzzle: WordPathPuzzle) {
  return create<WeaveSessionState>((set, get) => {
    const recompute = (solved: number[][]) => {
      const v = validate(get().puzzle, solved);
      return { message: v.message ?? "", solvedAll: v.solved };
    };

    const finalizeIfSolved = (solved: number[][]) => {
      const s = get();
      if (!isSolved(s.puzzle, solved) || s.finalized) return;
      s.stopwatch.pause();
      const metrics = { ...s.metrics, elapsedMs: s.stopwatch.elapsedMs() };
      set({ solvedAll: true, finalized: true, running: false, metrics });
      void storage.recordCompletion({
        puzzleId: s.puzzle.meta.id,
        game: "wordpath",
        difficulty: s.puzzle.meta.difficulty,
        completedAt: Date.now(),
        metrics,
        seed: s.puzzle.meta.seed,
      });
    };

    return {
      puzzle,
      history: createHistory<number[][]>([]),
      solved: [],
      active: [],
      dragging: false,
      metrics: { ...EMPTY_METRICS },
      stopwatch: new Stopwatch(),
      running: false,
      solvedAll: false,
      finalized: false,
      message: validate(puzzle, []).message ?? "",
      lastResult: null,

      canUndo: () => canUndo(get().history),
      canRedo: () => canRedo(get().history),

      startTimer: () => {
        const s = get();
        if (!s.running && !s.solvedAll) {
          s.stopwatch.start();
          set({ running: true });
        }
      },
      setPaused: (paused) => {
        const s = get();
        if (s.solvedAll) return;
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
        if (s.solvedAll) return;
        s.startTimer();
        if (canExtendActive(s.puzzle, s.solved, [], cell).ok) {
          set({ dragging: true, active: [cell], lastResult: null });
        } else {
          set({ dragging: true });
        }
      },

      cellEnter: (cell) => {
        const s = get();
        if (!s.dragging || s.solvedAll) return;
        if (s.active.length === 0) {
          if (canExtendActive(s.puzzle, s.solved, [], cell).ok) set({ active: [cell] });
          return;
        }
        const last = s.active[s.active.length - 1];
        if (cell === last) return;
        if (s.active.includes(cell)) {
          set({ active: backtrackActiveTo(s.active, cell), metrics: { ...s.metrics, backtracks: s.metrics.backtracks + 1 } });
          return;
        }
        const next = extendActive(s.puzzle, s.solved, s.active, cell);
        if (next) set({ active: next });
      },

      gestureEnd: () => {
        const s = get();
        set({ dragging: false });
        if (s.active.length === 0) return;
        const res = submit(s.puzzle, s.solved, s.active);
        if (res.ok) {
          set({
            solved: res.solved,
            active: [],
            history: commit(s.history, res.solved),
            lastResult: "ok",
            ...recompute(res.solved),
          });
          finalizeIfSolved(res.solved);
        } else {
          const mistakes = s.active.length >= 2 ? s.metrics.mistakes + 1 : s.metrics.mistakes;
          set({ active: [], lastResult: "bad", metrics: { ...s.metrics, mistakes } });
        }
      },

      gestureCancel: () => set({ dragging: false, active: [] }),

      undo: () => {
        const s = get();
        const history = histUndo(s.history);
        set({ history, solved: history.present, active: [], ...recompute(history.present) });
      },
      redo: () => {
        const s = get();
        const history = histRedo(s.history);
        set({ history, solved: history.present, active: [], ...recompute(history.present) });
      },
      restart: () => {
        const s = get();
        s.stopwatch.reset();
        set({
          history: createHistory<number[][]>([]),
          solved: [],
          active: [],
          dragging: false,
          running: false,
          finalized: false,
          lastResult: null,
          metrics: { ...s.metrics, restarts: s.metrics.restarts + 1, backtracks: 0, hintsUsed: 0, mistakes: 0 },
          ...recompute([]),
        });
      },

      hint: () => {
        const s = get();
        if (s.solvedAll) return;
        s.startTimer();
        const used = solvedCells(s.solved);
        for (const word of remainingWords(s.puzzle, s.solved)) {
          const path = findWordPath(s.puzzle, used, word);
          if (path) {
            const solved = [...s.solved, path];
            set({
              solved,
              active: [],
              history: commit(s.history, solved),
              metrics: { ...s.metrics, hintsUsed: s.metrics.hintsUsed + 1 },
              ...recompute(solved),
            });
            finalizeIfSolved(solved);
            return;
          }
        }
      },
    };
  });
}

export type WeaveStore = ReturnType<typeof createWeaveSession>;
