"use client";

import { useMemo } from "react";
import { createParcelSession, type ParcelStore } from "@/engine/parcel/session";
import { PARCEL_5x5 } from "@/engine/parcel/fixtures";
import { ParcelBoard } from "./ParcelBoard";
import { Timer } from "./Timer";
import { formatDuration } from "@/lib/timer";

/**
 * Parcel play surface (Milestone 5). Uses the hand-authored fixture; the
 * procedural generator + uniqueness solver arrive in Milestone 6 and will slot
 * in exactly where TracePlay's generator does.
 */
export function ParcelPlay() {
  const store: ParcelStore = useMemo(() => createParcelSession(PARCEL_5x5.puzzle), []);

  const running = store((s) => s.running);
  const stopwatch = store((s) => s.stopwatch);
  const solved = store((s) => s.solved);
  const metrics = store((s) => s.metrics);
  const canUndo = store((s) => s.canUndo());
  const canRedo = store((s) => s.canRedo());
  const undo = store((s) => s.undo);
  const redo = store((s) => s.redo);
  const restart = store((s) => s.restart);

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Parcel</h1>
          <p className="text-sm text-ink-muted">Cut the grid into rectangles, one per clue.</p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-3 py-2 text-lg">
          <span className="sr-only">Timer: </span>
          <Timer stopwatch={stopwatch} running={running} />
        </div>
      </header>

      <p className="mb-3 text-xs text-ink-muted">
        Drag from corner to corner to draw a parcel around a clue; tap a parcel to remove it. Each
        clue’s number is its area; the icon is its required shape (▪ square, ▬ wide, ▮ tall).
      </p>

      <ParcelBoard store={store} />

      <div className="mt-4 grid grid-cols-3 gap-2">
        <ControlButton label="Undo" onClick={undo} disabled={!canUndo}>
          ↶
        </ControlButton>
        <ControlButton label="Redo" onClick={redo} disabled={!canRedo}>
          ↷
        </ControlButton>
        <ControlButton label="Restart" onClick={restart}>
          ⟳
        </ControlButton>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
        <Stat label="Redraws" value={metrics.redraws} />
        <Stat label="Mistakes" value={metrics.mistakes} />
      </dl>

      {solved && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdone"
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 text-center shadow-2xl">
            <p aria-hidden className="text-4xl">🎉</p>
            <h2 id="pdone" className="mt-2 text-xl font-bold">
              Solved in {formatDuration(metrics.elapsedMs)}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {metrics.redraws} redraws · {metrics.mistakes} mistakes
            </p>
            <button
              onClick={restart}
              autoFocus
              className="mt-4 w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-brand-ink"
            >
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
