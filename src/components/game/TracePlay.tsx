"use client";

import { useMemo, useState } from "react";
import { createTraceSession } from "@/engine/trace/session";
import { TRACE_5x5_EASY, TRACE_6x6_MEDIUM } from "@/engine/trace/fixtures";
import { TraceBoard } from "./TraceBoard";
import { Timer } from "./Timer";
import { formatDuration } from "@/lib/timer";

const FIXTURES = [
  { key: "easy", label: "Easy · 5×5", fixture: TRACE_5x5_EASY },
  { key: "medium", label: "Medium · 6×6", fixture: TRACE_6x6_MEDIUM },
] as const;

/**
 * Milestone-3 Trace play surface. Picks a hand-authored fixture (the generator
 * arrives in M4), mounts the board, and renders the timer + control bar +
 * completion modal. Each fixture gets its own session instance.
 */
export function TracePlay() {
  const [fixtureKey, setFixtureKey] = useState<(typeof FIXTURES)[number]["key"]>("easy");
  const fixture = FIXTURES.find((f) => f.key === fixtureKey)!.fixture;

  // New session whenever the puzzle changes.
  const store = useMemo(() => createTraceSession(fixture.puzzle), [fixture.puzzle]);

  const running = store((s) => s.running);
  const stopwatch = store((s) => s.stopwatch);
  const solved = store((s) => s.solved);
  const metrics = store((s) => s.metrics);
  const canUndo = store((s) => s.canUndo());
  const canRedo = store((s) => s.canRedo());
  const undo = store((s) => s.undo);
  const redo = store((s) => s.redo);
  const restart = store((s) => s.restart);
  const hint = store((s) => s.hint);

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Trace</h1>
          <p className="text-sm text-ink-muted">One line, every cell, numbers in order.</p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-2 text-lg">
          <span className="sr-only">Timer: </span>
          <Timer stopwatch={stopwatch} running={running} />
        </div>
      </header>

      <div className="mb-3 flex gap-1" role="radiogroup" aria-label="Difficulty">
        {FIXTURES.map((f) => (
          <button
            key={f.key}
            role="radio"
            aria-checked={fixtureKey === f.key}
            onClick={() => setFixtureKey(f.key)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              fixtureKey === f.key ? "border-brand bg-brand text-brand-ink" : "border-line"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <TraceBoard store={store} />

      <div className="mt-4 grid grid-cols-4 gap-2">
        <ControlButton label="Undo" hint="⌫" onClick={undo} disabled={!canUndo}>
          ↶
        </ControlButton>
        <ControlButton label="Redo" onClick={redo} disabled={!canRedo}>
          ↷
        </ControlButton>
        <ControlButton label="Hint" onClick={hint} disabled={solved}>
          ⚑
        </ControlButton>
        <ControlButton label="Restart" onClick={restart}>
          ⟳
        </ControlButton>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <Stat label="Backtracks" value={metrics.backtracks} />
        <Stat label="Hints" value={metrics.hintsUsed} />
        <Stat label="Restarts" value={metrics.restarts} />
      </dl>

      {solved && (
        <CompletionModal
          elapsedMs={metrics.elapsedMs}
          backtracks={metrics.backtracks}
          hintsUsed={metrics.hintsUsed}
          onPlayAgain={restart}
        />
      )}
    </div>
  );
}

function ControlButton({
  label,
  hint,
  children,
  onClick,
  disabled,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label + (hint ? ` (${hint})` : "")}
      className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg border border-line bg-surface text-sm font-medium disabled:opacity-40"
    >
      <span aria-hidden className="text-xl leading-none">
        {children}
      </span>
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

function CompletionModal({
  elapsedMs,
  backtracks,
  hintsUsed,
  onPlayAgain,
}: {
  elapsedMs: number;
  backtracks: number;
  hintsUsed: number;
  onPlayAgain: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="done-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 text-center shadow-2xl">
        <p aria-hidden className="text-4xl">
          🎉
        </p>
        <h2 id="done-title" className="mt-2 text-xl font-bold">
          Solved in {formatDuration(elapsedMs)}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {backtracks} backtrack{backtracks === 1 ? "" : "s"} · {hintsUsed} hint
          {hintsUsed === 1 ? "" : "s"}
        </p>
        <button
          onClick={onPlayAgain}
          autoFocus
          className="mt-4 w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-brand-ink"
        >
          Play again
        </button>
      </div>
    </div>
  );
}
