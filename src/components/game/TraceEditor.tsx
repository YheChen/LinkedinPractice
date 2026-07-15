"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PathPuzzle } from "@/engine/types";
import { countSolutions } from "@/engine/trace/solve";
import { canonicalJson, hashString } from "@/lib/hash";
import { exportJson, encodeShare } from "@/engine/io";
import { wallKey } from "@/lib/grid";

/**
 * Free-form Zip builder. Two edit modes:
 *   • Checkpoints — click cells to lay down numbers 1,2,3… (click again to remove);
 *   • Walls — click the edge between two cells to toggle a wall.
 * The board is live-validated by the real solver (unique / multiple / none), so a
 * faithful recreation of a puzzle you played can be checked and then played,
 * shared, exported, or printed.
 *
 * A paste box accepts a plain number grid for fast entry (walls are then added by
 * clicking edges). This is the compliant way to re-enter a layout you're
 * authorised to use — you do the entry; nothing is scraped.
 */
type Mode = "checkpoints" | "walls";

export function TraceEditor() {
  const [size, setSize] = useState(6);
  const [order, setOrder] = useState<number[]>([]); // cell indices in checkpoint order
  const [walls, setWalls] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("checkpoints");
  const [pasteText, setPasteText] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  const reset = (n = size) => {
    setSize(n);
    setOrder([]);
    setWalls(new Set());
  };

  const toggleCell = (cell: number) =>
    setOrder((prev) => (prev.includes(cell) ? prev.filter((c) => c !== cell) : [...prev, cell]));

  const toggleWall = (key: string) =>
    setWalls((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const puzzle: PathPuzzle | null = useMemo(() => {
    if (order.length === 0) return null;
    const checkpoints: Record<number, number> = {};
    order.forEach((cell, i) => {
      checkpoints[cell] = i + 1;
    });
    const wallArr = [...walls].sort();
    const payload = { game: "path" as const, difficulty: "medium" as const, rows: size, cols: size, checkpoints, walls: wallArr };
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
      walls: wallArr,
    };
  }, [order, walls, size]);

  const verdict = useMemo(() => (puzzle ? countSolutions(puzzle, 2) : null), [puzzle]);
  const playable = !!puzzle && verdict !== null && verdict >= 1;
  const shareUrl =
    playable && puzzle && typeof window !== "undefined"
      ? `${window.location.origin}/play/trace?p=${encodeShare(puzzle)}`
      : "";

  const doPaste = () => {
    const res = parseNumberGrid(pasteText);
    if ("error" in res) {
      setPasteError(res.error);
      return;
    }
    setPasteError(null);
    setSize(res.size);
    setOrder(res.order);
    setWalls(new Set());
    setMode("walls");
  };

  // ---- geometry helpers (percentages) ----
  const pctW = 100 / size;

  // Interior edges (for wall editing).
  const edges: { key: string; kind: "v" | "h"; left: number; top: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (c + 1 < size) {
        edges.push({ key: wallKey({ r, c }, { r, c: c + 1 }, size), kind: "v", left: (c + 1) * pctW, top: r * pctW });
      }
      if (r + 1 < size) {
        edges.push({ key: wallKey({ r, c }, { r: r + 1, c }, size), kind: "h", left: c * pctW, top: (r + 1) * pctW });
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-ink-muted">Grid</label>
        {[5, 6, 7, 8].map((n) => (
          <button
            key={n}
            onClick={() => reset(n)}
            aria-pressed={size === n}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${size === n ? "border-brand bg-brand text-brand-ink" : "border-line"}`}
          >
            {n}×{n}
          </button>
        ))}
        <button onClick={() => reset()} className="ml-auto rounded-lg border border-line px-3 py-1.5 text-sm">
          Clear
        </button>
      </div>

      <div className="flex gap-1" role="radiogroup" aria-label="Edit mode">
        {(["checkpoints", "walls"] as const).map((m) => (
          <button
            key={m}
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium capitalize ${mode === m ? "border-brand bg-brand text-brand-ink" : "border-line"}`}
          >
            {m}
          </button>
        ))}
        <span className="ml-2 self-center text-xs text-ink-muted">
          {mode === "checkpoints" ? "Tap cells to number them in order." : "Tap the line between two cells to toggle a wall."}
        </span>
      </div>

      <div
        className="relative mx-auto w-full"
        style={{ maxWidth: "min(90vw, 460px)", aspectRatio: "1 / 1" }}
      >
        {/* Cells (checkpoint layer) */}
        <div
          className="grid h-full w-full"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)` }}
        >
          {Array.from({ length: size * size }, (_, i) => {
            const idx = order.indexOf(i);
            const num = idx === -1 ? null : idx + 1;
            return (
              <button
                key={i}
                onClick={() => mode === "checkpoints" && toggleCell(i)}
                disabled={mode !== "checkpoints"}
                aria-label={num ? `Cell ${i}, checkpoint ${num}` : `Cell ${i}, empty`}
                className="flex items-center justify-center border border-line/70 text-lg font-bold"
                style={{
                  background: num ? (num === 1 ? "rgb(var(--c-path))" : "rgb(var(--c-ink))") : "rgb(var(--c-surface))",
                  color: num ? "white" : "rgb(var(--c-ink))",
                  cursor: mode === "checkpoints" ? "pointer" : "default",
                }}
              >
                {num ?? ""}
              </button>
            );
          })}
        </div>

        {/* Wall layer (lines + clickable edge hotspots in walls mode) */}
        <div className="pointer-events-none absolute inset-0">
          {edges.map((e) => {
            const on = walls.has(e.key);
            const isV = e.kind === "v";
            const thickness = 6;
            const hotspot = 16;
            const style: React.CSSProperties = isV
              ? { left: `${e.left}%`, top: `${e.top}%`, height: `${pctW}%`, width: 0, transform: "translateX(-50%)" }
              : { left: `${e.left}%`, top: `${e.top}%`, width: `${pctW}%`, height: 0, transform: "translateY(-50%)" };
            return (
              <div key={e.key} className="absolute" style={style}>
                {/* visible wall bar */}
                {on && (
                  <div
                    className="absolute rounded-full"
                    style={
                      isV
                        ? { top: 0, bottom: 0, left: -thickness / 2, width: thickness, background: "rgb(var(--c-ink))" }
                        : { left: 0, right: 0, top: -thickness / 2, height: thickness, background: "rgb(var(--c-ink))" }
                    }
                  />
                )}
                {/* clickable hotspot (walls mode only) */}
                {mode === "walls" && (
                  <button
                    aria-label={`${on ? "Remove" : "Add"} wall`}
                    onClick={() => toggleWall(e.key)}
                    className="pointer-events-auto absolute hover:bg-brand/20"
                    style={
                      isV
                        ? { top: 0, bottom: 0, left: -hotspot / 2, width: hotspot }
                        : { left: 0, right: 0, top: -hotspot / 2, height: hotspot }
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div aria-live="polite" className="text-center text-sm font-semibold">
        {!puzzle ? (
          <span className="text-ink-muted">Place checkpoint 1 to begin.</span>
        ) : verdict === 0 ? (
          <span className="text-danger">✗ No solution — this layout can’t be completed.</span>
        ) : verdict === 1 ? (
          <span className="text-ok">✓ Unique solution — ready to share.</span>
        ) : (
          <span className="text-warn">◒ Multiple solutions — add walls or checkpoints to pin it down.</span>
        )}
      </div>

      {playable && puzzle && (
        <>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href={`/play/trace?p=${encodeShare(puzzle)}`} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-ink">
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

      {/* Paste-a-grid importer */}
      <details className="rounded-lg border border-line bg-surface-2 p-3">
        <summary className="cursor-pointer text-sm font-semibold">Paste a number grid</summary>
        <p className="mt-2 text-xs text-ink-muted">
          One row per line; a number places a checkpoint, a dot is empty. Then switch to Walls mode to
          add walls. Example (6×6):
        </p>
        <pre className="mt-1 overflow-x-auto rounded bg-surface p-2 text-[11px] text-ink-muted">{`1 . . . . 2
. . 4 . . .
. 3 . . 5 .
. . . 6 . .
. . . . . .
. 8 . . . 7`}</pre>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={5}
          className="mt-2 w-full rounded-lg border border-line bg-surface p-2 font-mono text-xs"
          placeholder={"1 . . . . 2\n. . 4 . . .\n..."}
        />
        {pasteError && <p className="mt-1 text-sm text-danger">{pasteError}</p>}
        <button onClick={doPaste} className="mt-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold">
          Load grid
        </button>
      </details>
    </div>
  );
}

/** Parse a plain number grid into a square size + checkpoint order (by number). */
function parseNumberGrid(text: string): { size: number; order: number[] } | { error: string } {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 3) return { error: "Enter at least 3 rows." };
  const size = lines.length;
  if (size > 8) return { error: "Max grid is 8×8." };

  const numbered: { cell: number; num: number }[] = [];
  for (let r = 0; r < size; r++) {
    const toks = lines[r]!.split(/\s+/);
    if (toks.length !== size) return { error: `Row ${r + 1} has ${toks.length} cells; expected ${size} (square grid).` };
    for (let c = 0; c < size; c++) {
      const t = toks[c]!;
      if (t === "." || t === "-" || t === "_" || t === "0") continue;
      const n = Number(t);
      if (!Number.isInteger(n) || n < 1) return { error: `"${t}" at row ${r + 1} is not a checkpoint number or a dot.` };
      numbered.push({ cell: r * size + c, num: n });
    }
  }
  if (numbered.length === 0) return { error: "No checkpoints found." };
  const nums = numbered.map((x) => x.num);
  if (new Set(nums).size !== nums.length) return { error: "Duplicate checkpoint numbers." };
  if (!nums.includes(1)) return { error: "There must be a checkpoint 1 (the start)." };

  numbered.sort((a, b) => a.num - b.num);
  return { size, order: numbered.map((x) => x.cell) };
}
