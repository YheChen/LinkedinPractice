"use client";

/**
 * Main-thread client for the Queens generation worker. Lazily spins up a single
 * worker and multiplexes requests by id. Falls back to synchronous generation
 * when Web Workers are unavailable (SSR, older browsers, tests).
 */
import { generateQueens, type GenerateQueensOptions } from "@/engine/queens/generate";
import type { QueensPuzzle } from "@/engine/types";

interface Pending {
  resolve: (p: QueensPuzzle) => void;
  reject: (e: Error) => void;
}

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./queens.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<{ reqId: number; puzzle?: QueensPuzzle; error?: string }>) => {
      const { reqId, puzzle, error } = e.data;
      const p = pending.get(reqId);
      if (!p) return;
      pending.delete(reqId);
      if (error) p.reject(new Error(error));
      else if (puzzle) p.resolve(puzzle);
    };
    worker.onerror = () => {
      for (const [, p] of pending) p.reject(new Error("worker error"));
      pending.clear();
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

export function generateQueensAsync(opts: GenerateQueensOptions): Promise<QueensPuzzle> {
  const w = getWorker();
  if (!w) return Promise.resolve(generateQueens(opts));
  const reqId = ++seq;
  return new Promise<QueensPuzzle>((resolve, reject) => {
    pending.set(reqId, { resolve, reject });
    w.postMessage({ ...opts, reqId });
  }).catch(() => generateQueens(opts)); // fall back if the worker died mid-flight
}
