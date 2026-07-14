"use client";

import { useEffect, useMemo, useState } from "react";
import type { Difficulty, PathPuzzle } from "@/engine/types";
import { createTraceSession, type TraceStore } from "@/engine/trace/session";
import { makeRandomSeed } from "@/engine/trace/generate";
import { generateTraceAsync } from "@/workers/traceClient";
import { TraceBoard } from "./TraceBoard";
import { Timer } from "./Timer";
import { formatDuration } from "@/lib/timer";

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
  { key: "expert", label: "Expert" },
];

/**
 * Trace play surface (Milestone 4): procedurally generated, uniquely-solvable
 * boards via the Web-Worker generator. Difficulty selector, endless "new puzzle",
 * and the reproducible seed are exposed. Generation is async with a skeleton.
 */
export function TracePlay({
  initialSeed,
  initialDifficulty,
}: {
  initialSeed?: string | undefined;
  initialDifficulty?: Difficulty | undefined;
} = {}) {
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty ?? "easy");
  const [seed, setSeed] = useState<string>(() => initialSeed ?? makeRandomSeed());
  const [puzzle, setPuzzle] = useState<PathPuzzle | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPuzzle(null);
    generateTraceAsync({ difficulty, seed }).then((p) => {
      if (!cancelled) setPuzzle(p);
    });
    return () => {
      cancelled = true;
    };
  }, [difficulty, seed]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Trace</h1>
          <p className="text-sm text-ink-muted">One line, every cell, numbers in order.</p>
        </div>
        <button
          onClick={() => setSeed(makeRandomSeed())}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:bg-surface-2"
        >
          New puzzle
        </button>
      </header>

      <div className="mb-3 flex flex-wrap gap-1" role="radiogroup" aria-label="Difficulty">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.key}
            role="radio"
            aria-checked={difficulty === d.key}
            onClick={() => setDifficulty(d.key)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              difficulty === d.key ? "border-brand bg-brand text-brand-ink" : "border-line"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {puzzle ? (
        <TraceGame key={puzzle.meta.id} puzzle={puzzle} onNext={() => setSeed(makeRandomSeed())} />
      ) : (
        <BoardSkeleton />
      )}

      <p className="mt-4 text-center text-xs text-ink-muted">
        Seed: <code className="rounded bg-surface-2 px-1.5 py-0.5">{seed}</code>
      </p>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div
      className="mx-auto aspect-square w-full animate-pulse rounded-card border border-line bg-surface-2"
      style={{ maxWidth: "min(92vw, 520px)" }}
      aria-busy="true"
      aria-label="Generating puzzle"
    />
  );
}

/** Inner component: owns the session store; only mounted once a puzzle exists. */
function TraceGame({ puzzle, onNext }: { puzzle: PathPuzzle; onNext: () => void }) {
  const store: TraceStore = useMemo(() => createTraceSession(puzzle), [puzzle]);

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
    <div>
      <div className="mb-3 flex items-center justify-end">
        <div className="rounded-lg border border-line bg-surface px-3 py-2 text-lg">
          <span className="sr-only">Timer: </span>
          <Timer stopwatch={stopwatch} running={running} />
        </div>
      </div>

      <TraceBoard store={store} />

      <div className="mt-4 grid grid-cols-4 gap-2">
        <ControlButton label="Undo" hint="Backspace" onClick={undo} disabled={!canUndo}>
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
          onNext={onNext}
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
  onNext,
}: {
  elapsedMs: number;
  backtracks: number;
  hintsUsed: number;
  onPlayAgain: () => void;
  onNext: () => void;
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
        <div className="mt-4 flex gap-2">
          <button
            onClick={onPlayAgain}
            className="flex-1 rounded-lg border border-line px-4 py-2.5 font-semibold hover:bg-surface-2"
          >
            Replay
          </button>
          <button
            onClick={onNext}
            autoFocus
            className="flex-1 rounded-lg bg-brand px-4 py-2.5 font-semibold text-brand-ink"
          >
            New puzzle
          </button>
        </div>
      </div>
    </div>
  );
}
