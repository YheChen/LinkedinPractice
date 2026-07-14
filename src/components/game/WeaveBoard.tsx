"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Coord } from "@/lib/grid";
import { fromIndex, inBounds, toIndex, step, DIRECTIONS } from "@/lib/grid";
import { usePointerBoard } from "@/input/usePointerBoard";
import type { WeaveStore } from "@/engine/weave/session";

const KEY_DIR: Record<string, (typeof DIRECTIONS)[number]> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/** Distinct, colour-blind-tolerant tint per solved word. */
function wordTint(index: number, alpha: number): string {
  const hue = (index * 67) % 360;
  return `hsl(${hue} 62% 50% / ${alpha})`;
}

export function WeaveBoard({ store }: { store: WeaveStore }) {
  const puzzle = store((s) => s.puzzle);
  const solved = store((s) => s.solved);
  const active = store((s) => s.active);
  const message = store((s) => s.message);
  const lastResult = store((s) => s.lastResult);
  const setPaused = store((s) => s.setPaused);

  const { rows, cols } = puzzle.meta;

  const handlers = useMemo(
    () => ({
      onGestureStart: (cell: Coord) => store.getState().gestureStart(toIndex(cell, cols)),
      onCellEnter: (cell: Coord) => store.getState().cellEnter(toIndex(cell, cols)),
      onGestureEnd: () => store.getState().gestureEnd(),
      onGestureCancel: () => store.getState().gestureCancel(),
    }),
    [store, cols],
  );
  const { boardProps } = usePointerBoard({ rows, cols }, handlers);

  useEffect(() => {
    const onVis = () => setPaused(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [setPaused]);

  const cellWord = useMemo(() => {
    const map = new Map<number, number>();
    solved.forEach((word, wi) => word.forEach((c) => map.set(c, wi)));
    return map;
  }, [solved]);
  const activeSet = useMemo(() => new Set(active), [active]);

  // Keyboard cursor.
  const [cursor, setCursor] = useState<Coord>({ r: 0, c: 0 });
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const s = store.getState();
      const dir = KEY_DIR[e.key];
      if (dir) {
        e.preventDefault();
        const next = step(cursor, dir);
        if (!inBounds(next, rows, cols)) return;
        setCursor(next);
        // While dragging with keyboard, treat arrow as extend/backtrack.
        if (s.dragging) s.cellEnter(toIndex(next, cols));
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        if (!s.dragging) s.gestureStart(toIndex(cursor, cols));
        else s.cellEnter(toIndex(cursor, cols));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        s.gestureEnd();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        s.gestureCancel();
      }
    },
    [store, cursor, rows, cols],
  );

  const cx = (i: number) => fromIndex(i, cols).c + 0.5;
  const cy = (i: number) => fromIndex(i, cols).r + 0.5;
  const points = active.map((i) => `${cx(i)},${cy(i)}`).join(" ");

  return (
    <div className="mx-auto w-full" style={{ maxWidth: "min(92vw, 520px)" }}>
      <div
        {...boardProps}
        role="application"
        aria-roledescription="Wend puzzle board"
        aria-label={`Wend grid, ${rows} by ${cols}. Connect adjacent letters to spell the hidden words; every letter is used once.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative grid aspect-square w-full rounded-card border border-line bg-surface"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          ...boardProps.style,
        }}
      >
        {Array.from({ length: rows * cols }, (_, i) => {
          const letter = puzzle.letters[i];
          const blocked = letter === null || letter === undefined;
          const wi = cellWord.get(i);
          const onActive = activeSet.has(i);
          const { r, c } = fromIndex(i, cols);
          const isCursor = cursor.r === r && cursor.c === c;
          return (
            <div
              key={i}
              data-cell={i}
              className="relative flex items-center justify-center border border-line/50 text-[min(5vw,1.3rem)] font-bold uppercase"
              style={{
                background: blocked
                  ? "rgb(var(--c-surface-2))"
                  : wi !== undefined
                    ? wordTint(wi, 0.28)
                    : onActive
                      ? lastResult === "bad"
                        ? "color-mix(in srgb, rgb(var(--c-danger)) 22%, transparent)"
                        : "color-mix(in srgb, rgb(var(--c-word)) 24%, transparent)"
                      : undefined,
              }}
            >
              {isCursor && !blocked && (
                <span aria-hidden className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-brand" />
              )}
              {!blocked && <span className="relative z-10">{letter}</span>}
            </div>
          );
        })}

        <svg aria-hidden viewBox={`0 0 ${cols} ${rows}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
          {/* Connector path threaded through each solved word, in its colour. */}
          {solved.map((word, wi) =>
            word.length > 1 ? (
              <polyline
                key={`w${wi}`}
                points={word.map((i) => `${cx(i)},${cy(i)}`).join(" ")}
                fill="none"
                stroke={wordTint(wi, 0.85)}
                strokeWidth={0.26}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null,
          )}
          {/* Live trace on top. */}
          {active.length > 1 && (
            <polyline points={points} fill="none" stroke="rgb(var(--c-word))" strokeWidth={0.28} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {/* Checkmark badge at the start of each completed word. */}
          {solved.map((word, wi) => {
            const s = word[0]!;
            const { r, c } = fromIndex(s, cols);
            const bx = c + 0.26;
            const by = r + 0.26;
            return (
              <g key={`c${wi}`}>
                <circle cx={bx} cy={by} r={0.17} fill={wordTint(wi, 1)} stroke="white" strokeWidth={0.03} />
                <text x={bx} y={by} fontSize={0.24} textAnchor="middle" dominantBaseline="central" fill="white" fontWeight="bold">
                  ✓
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </div>
  );
}
