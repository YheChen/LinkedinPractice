"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Coord } from "@/lib/grid";
import { fromIndex, inBounds, toIndex } from "@/lib/grid";
import { usePointerBoard } from "@/input/usePointerBoard";
import type { ParcelStore } from "@/engine/parcel/session";
import { Box, boxArea, cluesInBox } from "@/engine/parcel/rules";

/**
 * Parcel board: DOM grid of cells + an absolutely-positioned overlay of parcel
 * rectangles and the live drag preview. Pointer draws corner-to-corner; a tap on
 * an existing parcel deletes it. Keyboard uses a roving cursor: Space anchors,
 * arrows size the rectangle, Enter commits, Delete removes, Escape cancels.
 */
export function ParcelBoard({ store }: { store: ParcelStore }) {
  const puzzle = store((s) => s.puzzle);
  const live = store((s) => s.live);
  const preview = store((s) => s.preview);
  const errorCells = store((s) => s.errorCells);
  const message = store((s) => s.message);
  const setPaused = store((s) => s.setPaused);

  const { rows, cols } = puzzle.meta;
  const errorSet = useMemo(() => new Set(errorCells), [errorCells]);
  const clueByCell = useMemo(() => new Map(puzzle.clues.map((c) => [c.cell, c])), [puzzle.clues]);

  const handlers = useMemo(
    () => ({
      onGestureStart: (cell: Coord) => store.getState().gestureStart(cell),
      onCellEnter: (cell: Coord) => store.getState().cellEnter(cell),
      onGestureEnd: () => store.getState().gestureEnd(),
      onGestureCancel: () => store.getState().gestureCancel(),
    }),
    [store],
  );
  const { boardProps } = usePointerBoard({ rows, cols }, handlers);

  useEffect(() => {
    const onVis = () => setPaused(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [setPaused]);

  // Keyboard cursor state.
  const [cursor, setCursor] = useState<Coord>({ r: 0, c: 0 });
  const [anchoring, setAnchoring] = useState(false);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const s = store.getState();
      const move: Record<string, Coord> = {
        ArrowUp: { r: -1, c: 0 },
        ArrowDown: { r: 1, c: 0 },
        ArrowLeft: { r: 0, c: -1 },
        ArrowRight: { r: 0, c: 1 },
      };
      if (move[e.key]) {
        e.preventDefault();
        const d = move[e.key]!;
        const next = { r: cursor.r + d.r, c: cursor.c + d.c };
        if (!inBounds(next, rows, cols)) return;
        setCursor(next);
        if (anchoring) s.cellEnter(next);
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!anchoring) {
          s.gestureStart(cursor);
          setAnchoring(true);
        } else {
          s.gestureEnd();
          setAnchoring(false);
        }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        s.removeAt(cursor);
        return;
      }
      if (e.key === "Escape" && anchoring) {
        e.preventDefault();
        s.gestureCancel();
        setAnchoring(false);
      }
    },
    [store, cursor, anchoring, rows, cols],
  );

  const pct = (box: Box) => ({
    left: `${(box.left / cols) * 100}%`,
    top: `${(box.top / rows) * 100}%`,
    width: `${((box.right - box.left + 1) / cols) * 100}%`,
    height: `${((box.bottom - box.top + 1) / rows) * 100}%`,
  });

  const previewValid = preview ? cluesInBox(puzzle, preview).length === 1 : false;

  return (
    <div className="mx-auto w-full" style={{ maxWidth: "min(92vw, 520px)" }}>
      <div
        {...boardProps}
        role="application"
        aria-roledescription="Parcel puzzle board"
        aria-label={`Parcel grid, ${rows} by ${cols}. Draw a rectangle around each clue equal to its number.`}
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
          const clue = clueByCell.get(i);
          const isError = errorSet.has(i);
          const { r, c } = fromIndex(i, cols);
          const isCursor = cursor.r === r && cursor.c === c;
          return (
            <div
              key={i}
              data-cell={i}
              className="relative flex items-center justify-center border border-line/50"
              style={{ background: isError ? "color-mix(in srgb, rgb(var(--c-danger)) 20%, transparent)" : undefined }}
            >
              {isCursor && <span aria-hidden className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-brand" />}
              {clue && (
                <span className="relative z-10 flex items-center gap-0.5 text-[min(4.4vw,1.15rem)] font-bold">
                  {clue.area}
                  <ShapeGlyph shape={clue.shape} />
                </span>
              )}
            </div>
          );
        })}

        {/* Parcel + preview overlay. */}
        <div className="pointer-events-none absolute inset-0">
          {live.map((rect) => {
            const cells = [];
            for (let rr = rect.top; rr <= rect.bottom; rr++)
              for (let cc = rect.left; cc <= rect.right; cc++) cells.push(toIndex({ r: rr, c: cc }, cols));
            const bad = cells.some((c) => errorSet.has(c));
            return (
              <div
                key={rect.clueCell}
                className="absolute rounded-md border-2"
                style={{
                  ...pct(rect),
                  borderColor: bad ? "rgb(var(--c-danger))" : "rgb(var(--c-tile))",
                  background: bad
                    ? "color-mix(in srgb, rgb(var(--c-danger)) 10%, transparent)"
                    : "color-mix(in srgb, rgb(var(--c-tile)) 12%, transparent)",
                }}
              />
            );
          })}
          {preview && (
            <div
              className="absolute rounded-md border-2 border-dashed"
              style={{
                ...pct(preview),
                borderColor: previewValid ? "rgb(var(--c-warn))" : "rgb(var(--c-danger))",
                background: "color-mix(in srgb, rgb(var(--c-warn)) 8%, transparent)",
              }}
            >
              <span className="absolute right-0.5 top-0.5 rounded bg-surface px-1 text-xs font-semibold">
                {boxArea(preview)}
              </span>
            </div>
          )}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {message}
      </p>
    </div>
  );
}

function ShapeGlyph({ shape }: { shape: string }) {
  if (shape === "free") return null;
  const common = "inline-block align-middle";
  if (shape === "square") return <span aria-label="square" className={common}>▪</span>;
  if (shape === "wide") return <span aria-label="wide" className={common}>▬</span>;
  return <span aria-label="tall" className={common}>▮</span>;
}
