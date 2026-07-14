"use client";

/**
 * Parcel play session (Zustand). Mirrors the Trace session's separation of
 * committed history vs. the transient in-drag preview:
 *   • `live` = committed parcels (undo/redo history holds snapshots of this);
 *   • `anchor`/`cursor`/`preview` = the transient rubber-band rectangle while
 *     dragging — never pushed to history until the gesture commits.
 *
 * Hint is intentionally absent here (it needs the uniqueness solver, Milestone
 * 6); the control is hidden in the M5 UI.
 */
import { create } from "zustand";
import type { AttemptMetrics, DrawnRect, PartitionPuzzle } from "@/engine/types";
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
import type { Coord } from "@/lib/grid";
import { toIndex } from "@/lib/grid";
import { Box, boxFromCorners, boxContains, placeRect, removeRectAt, validate } from "./rules";
import { computeParcelHint } from "./solve";

export interface ParcelSessionState {
  puzzle: PartitionPuzzle;
  history: History<DrawnRect[]>;
  live: DrawnRect[];
  dragging: boolean;
  anchor: Coord | null;
  cursor: Coord | null;
  preview: Box | null;
  metrics: AttemptMetrics;
  stopwatch: Stopwatch;
  running: boolean;
  solved: boolean;
  finalized: boolean;
  errorCells: number[];
  message: string;

  canUndo: () => boolean;
  canRedo: () => boolean;
  startTimer: () => void;
  setPaused: (paused: boolean) => void;

  gestureStart: (cell: Coord) => void;
  cellEnter: (cell: Coord) => void;
  gestureEnd: () => void;
  gestureCancel: () => void;
  removeAt: (cell: Coord) => void;

  undo: () => void;
  redo: () => void;
  restart: () => void;
  hint: () => void;
}

export function createParcelSession(puzzle: PartitionPuzzle) {
  const initial: DrawnRect[] = [];
  const v0 = validate(puzzle, initial);

  return create<ParcelSessionState>((set, get) => {
    const recompute = (live: DrawnRect[]) => {
      const v = validate(get().puzzle, live);
      return { errorCells: v.errorCells, solved: v.solved, message: v.message ?? "" };
    };

    const finalizeIfSolved = (live: DrawnRect[]) => {
      const s = get();
      if (!recompute(live).solved || s.finalized) return;
      s.stopwatch.pause();
      const metrics = { ...s.metrics, elapsedMs: s.stopwatch.elapsedMs() };
      set({ solved: true, finalized: true, running: false, metrics });
      void storage.recordCompletion({
        puzzleId: s.puzzle.meta.id,
        game: "partition",
        difficulty: s.puzzle.meta.difficulty,
        completedAt: Date.now(),
        metrics,
        seed: s.puzzle.meta.seed,
      });
    };

    const applyRects = (rects: DrawnRect[], extra?: Partial<AttemptMetrics>) => {
      const s = get();
      const metrics = extra ? { ...s.metrics, ...mergeMetrics(s.metrics, extra) } : s.metrics;
      set({ live: rects, history: commit(s.history, rects), metrics, ...recompute(rects) });
      finalizeIfSolved(rects);
    };

    return {
      puzzle,
      history: createHistory<DrawnRect[]>(initial),
      live: initial,
      dragging: false,
      anchor: null,
      cursor: null,
      preview: null,
      metrics: { ...EMPTY_METRICS },
      stopwatch: new Stopwatch(),
      running: false,
      solved: false,
      finalized: false,
      errorCells: v0.errorCells,
      message: v0.message ?? "",

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
        set({ dragging: true, anchor: cell, cursor: cell, preview: boxFromCorners(cell, cell) });
      },

      cellEnter: (cell) => {
        const s = get();
        if (!s.dragging || !s.anchor || s.solved) return;
        set({ cursor: cell, preview: boxFromCorners(s.anchor, cell) });
      },

      gestureEnd: () => {
        const s = get();
        if (!s.dragging || !s.anchor || !s.cursor) {
          set({ dragging: false, anchor: null, cursor: null, preview: null });
          return;
        }
        const { anchor, cursor } = s;
        const isTap = anchor.r === cursor.r && anchor.c === cursor.c;
        const cols = s.puzzle.meta.cols;

        set({ dragging: false, anchor: null, cursor: null, preview: null });

        // Tap on an existing parcel → delete it.
        if (isTap && s.live.some((rect) => boxContains(rect, cursor.r, cursor.c))) {
          const rects = removeRectAt(s.live, toIndex(cursor, cols), cols);
          applyRects(rects, { redraws: 1 });
          return;
        }

        const res = placeRect(s.puzzle, s.live, anchor, cursor);
        if (!res.ok) {
          set({ metrics: { ...s.metrics, mistakes: s.metrics.mistakes + 1 } });
          set(recompute(s.live)); // refresh message (announce rejection)
          return;
        }
        applyRects(res.rects!, { redraws: 1 });
      },

      gestureCancel: () => {
        set({ dragging: false, anchor: null, cursor: null, preview: null });
      },

      removeAt: (cell) => {
        const s = get();
        const cols = s.puzzle.meta.cols;
        if (!s.live.some((rect) => boxContains(rect, cell.r, cell.c))) return;
        applyRects(removeRectAt(s.live, toIndex(cell, cols), cols), { redraws: 1 });
      },

      undo: () => {
        const s = get();
        const history = histUndo(s.history);
        set({ history, live: history.present, ...recompute(history.present) });
      },
      redo: () => {
        const s = get();
        const history = histRedo(s.history);
        set({ history, live: history.present, ...recompute(history.present) });
      },
      restart: () => {
        const s = get();
        s.stopwatch.reset();
        set({
          history: createHistory<DrawnRect[]>([]),
          live: [],
          dragging: false,
          anchor: null,
          cursor: null,
          preview: null,
          running: false,
          finalized: false,
          metrics: { ...s.metrics, restarts: s.metrics.restarts + 1, redraws: 0, mistakes: 0 },
          ...recompute([]), // sets solved:false + fresh message/errorCells
        });
      },

      hint: () => {
        const s = get();
        if (s.solved) return;
        s.startTimer();
        const rects = computeParcelHint(s.puzzle, s.live);
        if (!rects) return;
        applyRects(rects, { hintsUsed: 1 });
      },
    };
  });
}

function mergeMetrics(base: AttemptMetrics, extra: Partial<AttemptMetrics>): Partial<AttemptMetrics> {
  const out: Partial<AttemptMetrics> = {};
  for (const key of Object.keys(extra) as (keyof AttemptMetrics)[]) {
    out[key] = base[key] + (extra[key] ?? 0);
  }
  return out;
}

export type ParcelStore = ReturnType<typeof createParcelSession>;
