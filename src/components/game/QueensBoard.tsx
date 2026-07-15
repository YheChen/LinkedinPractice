"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fromIndex, inBounds, toIndex } from "@/lib/grid";
import type { QueensStore } from "@/engine/queens/session";
import { MARK, QUEEN } from "@/engine/queens/rules";

/**
 * Queens board: a DOM grid of region-coloured cells. Tapping a cell cycles it
 * empty → X → queen → empty. Bold borders trace the region boundaries; queens
 * in conflict are flagged red. Keyboard: arrows move a roving cursor,
 * Space/Enter cycles the focused cell.
 */

// Curated, high-separation region palette (original; not from any LinkedIn art).
// Light pastels so the dark queen/X glyph reads on every region in both themes.
const REGION_COLORS = [
  "#f4a3a3", // red
  "#f6c68a", // orange
  "#f3e08c", // yellow
  "#a9dd9b", // green
  "#9bd3dd", // cyan
  "#a3b6f4", // blue
  "#c8a3f4", // purple
  "#f4a3d6", // pink
  "#d8c7ac", // tan
  "#c0c8d0", // slate
  "#8fd0b6", // teal
  "#e0a9c8", // mauve
];

export function QueensBoard({ store }: { store: QueensStore }) {
  const puzzle = store((s) => s.puzzle);
  const cells = store((s) => s.cells);
  const errorCells = store((s) => s.errorCells);
  const hintCells = store((s) => s.hintCells);
  const message = store((s) => s.message);
  const setPaused = store((s) => s.setPaused);
  const cycle = store((s) => s.cycle);

  const n = puzzle.meta.rows;
  const errorSet = useMemo(() => new Set(errorCells), [errorCells]);
  const hintSet = useMemo(() => new Set(hintCells), [hintCells]);

  useEffect(() => {
    const onVis = () => setPaused(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [setPaused]);

  const [cursor, setCursor] = useState(0);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const { r, c } = fromIndex(cursor, n);
      const move: Record<string, { r: number; c: number }> = {
        ArrowUp: { r: r - 1, c },
        ArrowDown: { r: r + 1, c },
        ArrowLeft: { r, c: c - 1 },
        ArrowRight: { r, c: c + 1 },
      };
      if (move[e.key]) {
        const next = move[e.key]!;
        if (!inBounds(next, n, n)) return;
        e.preventDefault();
        setCursor(toIndex(next, n));
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        cycle(cursor);
      }
    },
    [cursor, n, cycle],
  );

  // Whether the neighbour on a given side is in a different region (or off-board).
  const isBoundary = (cell: number, dr: number, dc: number): boolean => {
    const { r, c } = fromIndex(cell, n);
    const nr = r + dr;
    const nc = c + dc;
    if (!inBounds({ r: nr, c: nc }, n, n)) return true;
    return puzzle.regions[cell] !== puzzle.regions[toIndex({ r: nr, c: nc }, n)];
  };

  const BOUNDARY = "rgb(var(--c-ink))";
  const INNER = "color-mix(in srgb, rgb(var(--c-ink)) 16%, transparent)";
  const bw = (cell: number, dr: number, dc: number) => (isBoundary(cell, dr, dc) ? "2.5px" : "1px");
  const bc = (cell: number, dr: number, dc: number) => (isBoundary(cell, dr, dc) ? BOUNDARY : INNER);

  return (
    <div className="mx-auto w-full" style={{ maxWidth: "min(92vw, 520px)" }}>
      <div
        role="application"
        aria-roledescription="Queens puzzle board"
        aria-label={`Queens grid, ${n} by ${n}. Place one queen per row, column, and colour region, with no two queens touching. Tap a cell to cycle empty, cross-out, queen.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="grid aspect-square w-full touch-manipulation select-none overflow-hidden rounded-card border-2 border-ink bg-surface"
        style={{
          gridTemplateColumns: `repeat(${n}, 1fr)`,
          gridTemplateRows: `repeat(${n}, 1fr)`,
        }}
      >
        {Array.from({ length: n * n }, (_, i) => {
          const state = cells[i] ?? 0;
          const isError = errorSet.has(i);
          const isHint = hintSet.has(i);
          const isCursor = cursor === i;
          const region = puzzle.regions[i] ?? 0;
          const bg = REGION_COLORS[region % REGION_COLORS.length]!;
          const { r, c } = fromIndex(i, n);
          return (
            <button
              key={i}
              type="button"
              data-cell={i}
              aria-label={`Row ${r + 1}, column ${c + 1}${
                state === QUEEN ? ", queen" : state === MARK ? ", crossed out" : ", empty"
              }`}
              onClick={() => {
                setCursor(i);
                cycle(i);
              }}
              className="relative grid place-items-center p-0 focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
              style={{
                background: bg,
                borderTop: `${bw(i, -1, 0)} solid ${bc(i, -1, 0)}`,
                borderBottom: `${bw(i, 1, 0)} solid ${bc(i, 1, 0)}`,
                borderLeft: `${bw(i, 0, -1)} solid ${bc(i, 0, -1)}`,
                borderRight: `${bw(i, 0, 1)} solid ${bc(i, 0, 1)}`,
                boxShadow: isCursor ? "inset 0 0 0 2px rgb(var(--c-brand))" : undefined,
              }}
            >
              {state === QUEEN && <QueenGlyph error={isError} hint={isHint} />}
              {state === MARK && <MarkGlyph />}
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </div>
  );
}

function QueenGlyph({ error, hint }: { error?: boolean; hint?: boolean }) {
  const fill = error ? "#c8102e" : "#1a1f26";
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[62%] w-[62%]"
      style={{
        filter: error
          ? "drop-shadow(0 0 2px rgba(255,255,255,.9))"
          : hint
            ? "drop-shadow(0 0 3px rgba(74,92,232,.9))"
            : "drop-shadow(0 1px 1px rgba(255,255,255,.6))",
      }}
      aria-hidden
    >
      {/* Original crown mark. */}
      <path
        d="M4 8 l3.2 3 L12 5 l4.8 6 L20 8 l-1.6 10 H5.6 Z"
        fill={fill}
        stroke={fill}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <rect x="5.2" y="18.4" width="13.6" height="2.6" rx="1.1" fill={fill} />
    </svg>
  );
}

function MarkGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[38%] w-[38%] opacity-70" aria-hidden>
      <path
        d="M6 6 L18 18 M18 6 L6 18"
        stroke="#1a1f26"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
