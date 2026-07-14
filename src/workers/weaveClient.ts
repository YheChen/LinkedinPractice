"use client";

/** Main-thread client for the Weave generation worker; synchronous fallback when
 *  Workers are unavailable. Mirrors trace/parcel clients. */
import { generateWeave, type GenerateWeaveOptions } from "@/engine/weave/generate";
import type { WordPathPuzzle } from "@/engine/types";

interface Pending {
  resolve: (p: WordPathPuzzle) => void;
  reject: (e: Error) => void;
}

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./weave.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<{ reqId: number; puzzle?: WordPathPuzzle; error?: string }>) => {
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

export function generateWeaveAsync(opts: GenerateWeaveOptions): Promise<WordPathPuzzle> {
  const w = getWorker();
  if (!w) return Promise.resolve(generateWeave(opts));
  const reqId = ++seq;
  return new Promise<WordPathPuzzle>((resolve, reject) => {
    pending.set(reqId, { resolve, reject });
    w.postMessage({ ...opts, reqId });
  }).catch(() => generateWeave(opts));
}
