"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { Coord } from "@/lib/grid";
import { fromIndex, inBounds, toIndex, DIRECTIONS, step } from "@/lib/grid";
import { usePointerBoard } from "@/input/usePointerBoard";
import { checkpointAt } from "@/engine/trace/rules";
import type { TraceStore } from "@/engine/trace/session";

/**
 * Trace board: a DOM CSS-grid of cells (semantic, gives free hit-data + a11y)
 * with an absolutely-positioned SVG overlay for the live line and walls. The
 * overlay is pointer-events:none so all gestures land on the grid container,
 * which owns the single Pointer Events gesture (usePointerBoard).
 *
 * Keyboard: the board is ONE focusable region (role="application"). Arrow keys
 * and WASD extend/backtrack the line from its head; Backspace retracts. A
 * polite live region announces progress for screen readers.
 */
const KEY_DIR: Record<string, (typeof DIRECTIONS)[number]> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

export function TraceBoard({ store }: { store: TraceStore }) {
  const puzzle = store((s) => s.puzzle);
  const live = store((s) => s.live);
  const solved = store((s) => s.solved);
  const message = store((s) => s.message);
  const hintCells = store((s) => s.hintCells);
  const gestureStart = store((s) => s.gestureStart);
  const cellEnter = store((s) => s.cellEnter);
  const gestureEnd = store((s) => s.gestureEnd);
  const gestureCancel = store((s) => s.gestureCancel);

  const { rows, cols } = puzzle.meta;

  const handlers = useMemo(
    () => ({
      onGestureStart: (cell: Coord) => gestureStart(toIndex(cell, cols)),
      onCellEnter: (cell: Coord) => cellEnter(toIndex(cell, cols)),
      onGestureEnd: () => gestureEnd(),
      onGestureCancel: () => gestureCancel(),
    }),
    [cols, gestureStart, cellEnter, gestureEnd, gestureCancel],
  );

  const { boardProps } = usePointerBoard({ rows, cols }, handlers);

  // Pause the timer when the tab is hidden; resume when visible.
  const setPaused = store((s) => s.setPaused);
  useEffect(() => {
    const onVis = () => setPaused(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [setPaused]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        store.getState().undo();
        return;
      }
      const dir = KEY_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      const s = store.getState();
      if (s.solved) return;
      const last = s.live[s.live.length - 1];
      if (last === undefined) return;
      const target = step(fromIndex(last, cols), dir);
      if (!inBounds(target, rows, cols)) return;
      // Reuse gesture logic for a single discrete keyboard move (own undo step).
      s.gestureStart(last);
      s.cellEnter(toIndex(target, cols));
      s.gestureEnd();
    },
    [store, rows, cols],
  );

  const head = live[live.length - 1];
  const cx = (i: number) => (fromIndex(i, cols).c + 0.5);
  const cy = (i: number) => (fromIndex(i, cols).r + 0.5);
  const points = live.map((i) => `${cx(i)},${cy(i)}`).join(" ");

  return (
    <div className="mx-auto w-full" style={{ maxWidth: "min(92vw, 520px)" }}>
      <div
        {...boardProps}
        role="application"
        aria-roledescription="Zip puzzle board"
        aria-label={`Zip grid, ${rows} by ${cols}. Draw one line through every cell, visiting numbers in order.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative grid aspect-square w-full select-none rounded-card border border-line bg-surface"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          ...boardProps.style,
        }}
      >
        {Array.from({ length: rows * cols }, (_, i) => {
          const cp = checkpointAt(puzzle, i);
          const isHint = hintCells.includes(i);
          return (
            <div
              key={i}
              data-cell={i}
              className="relative flex items-center justify-center border border-line/60"
              style={{ color: "rgb(var(--c-ink))" }}
            >
              {/* Hint highlight only — the path itself is drawn as the SVG line. */}
              {isHint && (
                <span
                  aria-hidden
                  className="absolute inset-1 rounded-md"
                  style={{ background: "color-mix(in srgb, rgb(var(--c-warn)) 40%, transparent)" }}
                />
              )}
              {cp !== undefined && (
                <span
                  className="relative z-10 grid h-[66%] w-[66%] place-items-center rounded-full text-[min(4.4vw,1.15rem)] font-bold"
                  style={{
                    // Start (1) uses the accent; the rest are ink badges. The text
                    // colour is the SURFACE colour so it inverts with the theme
                    // (dark text on the light ink badge in dark mode, and vice
                    // versa) — never white-on-white.
                    background: cp === 1 ? "rgb(var(--c-path))" : "rgb(var(--c-ink))",
                    color: "rgb(var(--c-surface))",
                    boxShadow: "0 1px 2px rgba(0,0,0,.35)",
                  }}
                >
                  {cp}
                </span>
              )}
            </div>
          );
        })}

        {/* Line + walls overlay. */}
        <svg
          aria-hidden
          viewBox={`0 0 ${cols} ${rows}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <defs>
            <linearGradient id="zip-line" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgb(var(--c-path))" />
              <stop offset="100%" stopColor="rgb(var(--c-tile))" />
            </linearGradient>
          </defs>
          {live.length > 1 && (
            <polyline
              points={points}
              fill="none"
              stroke="url(#zip-line)"
              strokeWidth={0.46}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {head !== undefined && (
            <circle cx={cx(head)} cy={cy(head)} r={0.2} fill="url(#zip-line)" />
          )}
          {puzzle.walls.map((w) => {
            const [a, b] = w.split(":").map(Number) as [number, number];
            const ca = fromIndex(a, cols);
            const cb = fromIndex(b, cols);
            if (ca.r === cb.r) {
              const x = Math.max(ca.c, cb.c);
              return <line key={w} x1={x} y1={ca.r} x2={x} y2={ca.r + 1} stroke="rgb(var(--c-ink))" strokeWidth={0.08} />;
            }
            const y = Math.max(ca.r, cb.r);
            return <line key={w} x1={ca.c} y1={y} x2={ca.c + 1} y2={y} stroke="rgb(var(--c-ink))" strokeWidth={0.08} />;
          })}
        </svg>
      </div>

      <p aria-live="polite" className="sr-only">
        {message}
      </p>
      {solved && (
        <p aria-live="assertive" className="sr-only">
          Puzzle solved.
        </p>
      )}
    </div>
  );
}
