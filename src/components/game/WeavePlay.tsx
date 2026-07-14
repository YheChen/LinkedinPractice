"use client";

import { useMemo } from "react";
import { createWeaveSession, type WeaveStore } from "@/engine/weave/session";
import { WEAVE_5x5 } from "@/engine/weave/fixtures";
import { WeaveBoard } from "./WeaveBoard";
import { Timer } from "./Timer";
import { formatDuration } from "@/lib/timer";
import { wordOf } from "@/engine/weave/rules";

/** Weave play surface (Milestone 7). Fixture-based; the dictionary-driven
 *  generator + ambiguity solver arrive in Milestone 8. */
export function WeavePlay() {
  const store: WeaveStore = useMemo(() => createWeaveSession(WEAVE_5x5.puzzle), []);

  const puzzle = store((s) => s.puzzle);
  const running = store((s) => s.running);
  const stopwatch = store((s) => s.stopwatch);
  const solvedAll = store((s) => s.solvedAll);
  const solved = store((s) => s.solved);
  const metrics = store((s) => s.metrics);
  const canUndo = store((s) => s.canUndo());
  const canRedo = store((s) => s.canRedo());
  const undo = store((s) => s.undo);
  const redo = store((s) => s.redo);
  const restart = store((s) => s.restart);
  const hint = store((s) => s.hint);

  // Word-length legend: one chip per target length, filled as found.
  const foundLengths = solved.map((p) => p.length);
  const legend = useMemo(() => {
    const remainingFound = [...foundLengths];
    return puzzle.wordLengths.map((len) => {
      const i = remainingFound.indexOf(len);
      if (i !== -1) {
        remainingFound.splice(i, 1);
        return { len, found: true };
      }
      return { len, found: false };
    });
  }, [puzzle.wordLengths, foundLengths]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Weave</h1>
          <p className="text-sm text-ink-muted">Thread the hidden words through the letters.</p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-2 text-lg">
          <span className="sr-only">Timer: </span>
          <Timer stopwatch={stopwatch} running={running} />
        </div>
      </header>

      <ul className="mb-3 flex flex-wrap gap-1.5" aria-label="Words to find, by length">
        {legend.map((w, i) => (
          <li
            key={i}
            className={`rounded-full border px-2.5 py-1 text-sm font-semibold ${
              w.found ? "border-word bg-word/15 text-word line-through" : "border-line text-ink-muted"
            }`}
          >
            {w.len}
          </li>
        ))}
      </ul>

      <WeaveBoard store={store} />

      <div className="mt-4 grid grid-cols-4 gap-2">
        <ControlButton label="Undo" onClick={undo} disabled={!canUndo}>↶</ControlButton>
        <ControlButton label="Redo" onClick={redo} disabled={!canRedo}>↷</ControlButton>
        <ControlButton label="Hint" onClick={hint} disabled={solvedAll}>⚑</ControlButton>
        <ControlButton label="Restart" onClick={restart}>⟳</ControlButton>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <Stat label="Backtracks" value={metrics.backtracks} />
        <Stat label="Hints" value={metrics.hintsUsed} />
        <Stat label="Mistakes" value={metrics.mistakes} />
      </dl>

      {solvedAll && (
        <div role="dialog" aria-modal="true" aria-labelledby="wdone" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 text-center shadow-2xl">
            <p aria-hidden className="text-4xl">🎉</p>
            <h2 id="wdone" className="mt-2 text-xl font-bold">
              Solved in {formatDuration(metrics.elapsedMs)}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {solved.map((p) => wordOf(puzzle, p)).join(" · ")}
            </p>
            <button onClick={restart} autoFocus className="mt-4 w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-brand-ink">
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ControlButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg border border-line bg-surface text-sm font-medium disabled:opacity-40"
    >
      <span aria-hidden className="text-xl leading-none">{children}</span>
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-2 py-2">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
