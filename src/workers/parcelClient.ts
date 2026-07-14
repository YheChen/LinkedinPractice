"use client";

/** Main-thread client for the Parcel generation worker; synchronous fallback
 *  when Workers are unavailable. Mirrors traceClient. */
import { generateParcel, type GenerateParcelOptions } from "@/engine/parcel/generate";
import type { PartitionPuzzle } from "@/engine/types";

interface Pending {
  resolve: (p: PartitionPuzzle) => void;
  reject: (e: Error) => void;
}

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./parcel.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<{ reqId: number; puzzle?: PartitionPuzzle; error?: string }>) => {
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

export function generateParcelAsync(opts: GenerateParcelOptions): Promise<PartitionPuzzle> {
  const w = getWorker();
  if (!w) return Promise.resolve(generateParcel(opts));
  const reqId = ++seq;
  return new Promise<PartitionPuzzle>((resolve, reject) => {
    pending.set(reqId, { resolve, reject });
    w.postMessage({ ...opts, reqId });
  }).catch(() => generateParcel(opts));
}
