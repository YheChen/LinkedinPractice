"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PathPuzzle } from "@/engine/types";
import { countSolutions } from "@/engine/trace/solve";
import { canonicalJson, hashString } from "@/lib/hash";
import { exportJson, encodeShare } from "@/engine/io";

/**
 * Free-form Trace builder: click cells to lay down checkpoints in order (1, 2,
 * 3…), and the puzzle is live-validated with the real solver so you can only
 * ship a board that actually has a solution — with a badge for unique vs.
 * multiple. Then play, share, or export it.
 *
 * (Walls and free-form Parcel/Weave editors are tracked follow-ups; checkpoint
 * authoring already produces valid, uniqueness-checked, shareable Trace boards.)
 */
export function TraceEditor() {
  const [size, setSize] = useState(5);
  const [order, setOrder] = useState<number[]>([]); // cell indices in checkpoint order

  // Reset the layout when the grid size changes.
  const onSize = (n: number) => {
    setSize(n);
    setOrder([]);
  };

  const toggle = (cell: number) => {
    setOrder((prev) => (prev.includes(cell) ? prev.filter((c) => c !== cell) : [...prev, cell]));
  };

  const puzzle: PathPuzzle | null = useMemo(() => {
    if (order.length === 0) return null;
    const checkpoints: Record<number, number> = {};
    order.forEach((cell, i) => {
      checkpoints[cell] = i + 1;
    });
    const payload = { game: "path" as const, difficulty: "medium" as const, rows: size, cols: size, checkpoints, walls: [] as string[] };
    return {
      game: "path",
      meta: {
        id: `trace-custom-${hashString(canonicalJson(payload))}`,
        game: "path",
        difficulty: "medium",
        rows: size,
        cols: size,
        generatorVersion: 0,
        formatVersion: 1,
      },
      checkpoints,
      walls: [],
    };
  }, [order, size]);

  // Live solve (cheap at editor sizes; cap at 2 for the unique/multiple verdict).
  const verdict = useMemo(() => {
    if (!puzzle) return null;
    return countSolutions(puzzle, 2);
  }, [puzzle]);

  const shareUrl =
    puzzle && verdict && verdict >= 1 && typeof window !== "undefined"
      ? `${window.location.origin}/play/trace?p=${encodeShare(puzzle)}`
      : "";

  const playable = !!puzzle && verdict !== null && verdict >= 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-ink-muted">Grid size</label>
        {[4, 5, 6, 7].map((n) => (
          <button
            key={n}
            onClick={() => onSize(n)}
            aria-pressed={size === n}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${size === n ? "border-brand bg-brand text-brand-ink" : "border-line"}`}
          >
            {n}×{n}
          </button>
        ))}
        <button onClick={() => setOrder([])} className="ml-auto rounded-lg border border-line px-3 py-1.5 text-sm">
          Clear
        </button>
      </div>

      <p className="text-sm text-ink-muted">
        Tap cells to drop checkpoints in order (tap again to remove). Aim for a{" "}
        <strong>unique</strong> board.
      </p>

      <div
        className="mx-auto grid w-full"
        style={{
          maxWidth: "min(90vw, 460px)",
          aspectRatio: "1 / 1",
          gridTemplateColumns: `repeat(${size}, 1fr)`,
          gridTemplateRows: `repeat(${size}, 1fr)`,
        }}
      >
        {Array.from({ length: size * size }, (_, i) => {
          const idx = order.indexOf(i);
          const num = idx === -1 ? null : idx + 1;
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              aria-label={num ? `Cell ${i}, checkpoint ${num}` : `Cell ${i}, empty`}
              className="flex items-center justify-center border border-line/70 text-lg font-bold"
              style={{
                background: num ? "rgb(var(--c-path))" : "rgb(var(--c-surface))",
                color: num ? "white" : "rgb(var(--c-ink))",
              }}
            >
              {num ?? ""}
            </button>
          );
        })}
      </div>

      <div aria-live="polite" className="text-center text-sm font-semibold">
        {!puzzle ? (
          <span className="text-ink-muted">Place checkpoint 1 to begin.</span>
        ) : verdict === 0 ? (
          <span className="text-danger">✗ No solution — this layout can’t be completed.</span>
        ) : verdict === 1 ? (
          <span className="text-ok">✓ Unique solution — ready to share.</span>
        ) : (
          <span className="text-warn">◒ Multiple solutions — add more checkpoints to pin it down.</span>
        )}
      </div>

      {playable && puzzle && (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href={`/play/trace?p=${encodeShare(puzzle)}`}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-ink"
            >
              Play
            </Link>
            <button
              onClick={() => navigator.clipboard?.writeText(shareUrl).catch(() => {})}
              className="rounded-lg border border-line px-4 py-2 text-sm font-semibold"
            >
              Copy share link
            </button>
            <button onClick={() => window.print()} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold no-print">
              Print
            </button>
          </div>
          <textarea
            readOnly
            value={exportJson(puzzle)}
            rows={5}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-lg border border-line bg-surface-2 p-2 font-mono text-xs"
            aria-label="Puzzle JSON"
          />
        </>
      )}
    </div>
  );
}
