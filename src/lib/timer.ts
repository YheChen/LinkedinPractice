/**
 * Monotonic stopwatch.
 *
 * We never increment a counter on an interval (that drifts and stalls when the
 * tab is throttled). Instead we accumulate elapsed spans measured against a
 * monotonic clock (performance.now), and derive display time on demand.
 *
 * Handles (SPEC §"Timer"): tab switch / browser sleep (span is measured by
 * wall delta, so a throttled rAF just yields a correct larger delta on resume),
 * pause/resume, refresh + restore (serialize `accumulatedMs` and whether it was
 * running), and completion (freeze).
 *
 * `now` is injectable so tests use a fake clock instead of real time.
 */

export type NowFn = () => number;

const defaultNow: NowFn =
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? () => performance.now()
    : () => Date.now();

export interface TimerSnapshot {
  /** total elapsed while running, excluding paused spans */
  accumulatedMs: number;
  /** timestamp (monotonic) of the current running span start, or null if paused */
  runningSince: number | null;
}

export class Stopwatch {
  private accumulatedMs: number;
  private runningSince: number | null;
  private readonly now: NowFn;

  constructor(snapshot?: Partial<TimerSnapshot>, now: NowFn = defaultNow) {
    this.now = now;
    this.accumulatedMs = snapshot?.accumulatedMs ?? 0;
    this.runningSince = snapshot?.runningSince ?? null;
  }

  get isRunning(): boolean {
    return this.runningSince !== null;
  }

  /** Idempotent: starting an already-running clock is a no-op. */
  start(): void {
    if (this.runningSince === null) this.runningSince = this.now();
  }

  /** Idempotent: pausing a paused clock is a no-op. Folds the live span in. */
  pause(): void {
    if (this.runningSince !== null) {
      this.accumulatedMs += this.now() - this.runningSince;
      this.runningSince = null;
    }
  }

  reset(): void {
    this.accumulatedMs = 0;
    this.runningSince = null;
  }

  /** Current elapsed ms, including the live span if running. */
  elapsedMs(): number {
    const live = this.runningSince === null ? 0 : this.now() - this.runningSince;
    return this.accumulatedMs + live;
  }

  /**
   * Serializable form. NOTE: `runningSince` is a monotonic timestamp that is
   * NOT meaningful across a page reload, so persistence must fold it into
   * `accumulatedMs` first — callers persist `toPersisted()`.
   */
  toPersisted(): { accumulatedMs: number; wasRunning: boolean } {
    return { accumulatedMs: this.elapsedMs(), wasRunning: this.isRunning };
  }
}

/** Format ms as m:ss or h:mm:ss for display. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const ss = s.toString().padStart(2, "0");
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}
