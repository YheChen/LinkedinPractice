/// <reference lib="webworker" />
/**
 * Queens generation worker. Generation runs the solver in a uniqueness loop,
 * which is cheap here but still runs off the main thread for consistency with
 * the other games (SPEC §10).
 */
import { generateQueens, type GenerateQueensOptions } from "@/engine/queens/generate";

interface Req extends GenerateQueensOptions {
  reqId: number;
}

self.onmessage = (e: MessageEvent<Req>) => {
  const { reqId, ...opts } = e.data;
  try {
    const puzzle = generateQueens(opts);
    (self as DedicatedWorkerGlobalScope).postMessage({ reqId, puzzle });
  } catch (err) {
    (self as DedicatedWorkerGlobalScope).postMessage({ reqId, error: String(err) });
  }
};

export {};
