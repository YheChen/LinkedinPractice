"use client";

/**
 * Main-thread client for the Trace generation worker. Lazily spins up a single
 * worker and multiplexes requests by id. Falls back to synchronous generation
 * when Web Workers are unavailable (SSR, older browsers, tests).
 */
import { generateTrace, type GenerateTraceOptions } from "@/engine/trace/generate";
import type { PathPuzzle } from "@/engine/types";

interface Pending {
  resolve: (p: PathPuzzle) => void;
  reject: (e: Error) => void;
}

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./trace.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<{ reqId: number; puzzle?: PathPuzzle; error?: string }>) => {
      const { reqId, puzzle, error } = e.data;
      const p = pending.get(reqId);
      if (!p) return;
      pending.delete(reqId);
      if (error) p.reject(new Error(error));
      else if (puzzle) p.resolve(puzzle);
    };
    worker.onerror = () => {
      // Reject everything in flight; callers will retry synchronously.
      for (const [, p] of pending) p.reject(new Error("worker error"));
      pending.clear();
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

export function generateTraceAsync(opts: GenerateTraceOptions): Promise<PathPuzzle> {
  const w = getWorker();
  if (!w) return Promise.resolve(generateTrace(opts));
  const reqId = ++seq;
  return new Promise<PathPuzzle>((resolve, reject) => {
    pending.set(reqId, { resolve, reject });
    w.postMessage({ ...opts, reqId });
  }).catch(() => generateTrace(opts)); // fall back if the worker died mid-flight
}
