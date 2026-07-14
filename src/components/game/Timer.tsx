"use client";

import { useEffect, useRef, useState } from "react";
import { Stopwatch, formatDuration } from "@/lib/timer";

/**
 * Display-only timer. It reads a shared Stopwatch on an animation frame while
 * running — the Stopwatch itself is the source of truth (monotonic), so tab
 * throttling just yields a correct larger delta on the next frame; we never
 * accumulate drift here.
 */
export function Timer({ stopwatch, running }: { stopwatch: Stopwatch; running: boolean }) {
  const [ms, setMs] = useState(() => stopwatch.elapsedMs());
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      setMs(stopwatch.elapsedMs());
      return;
    }
    let mounted = true;
    const tick = () => {
      if (!mounted) return;
      setMs(stopwatch.elapsedMs());
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [running, stopwatch]);

  return (
    <span
      role="timer"
      aria-label={`Elapsed time ${formatDuration(ms)}`}
      className="tabular-nums font-semibold"
    >
      {formatDuration(ms)}
    </span>
  );
}
