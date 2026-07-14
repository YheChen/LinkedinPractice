/// <reference lib="webworker" />
/**
 * Trace generation worker. Generation runs a solver in a loop (uniqueness
 * enforcement), which can take up to ~1–2s at expert size — so it runs here,
 * off the main thread, keeping the board responsive (SPEC §10).
 */
import { generateTrace, type GenerateTraceOptions } from "@/engine/trace/generate";

interface Req extends GenerateTraceOptions {
  reqId: number;
}

self.onmessage = (e: MessageEvent<Req>) => {
  const { reqId, ...opts } = e.data;
  try {
    const puzzle = generateTrace(opts);
    (self as DedicatedWorkerGlobalScope).postMessage({ reqId, puzzle });
  } catch (err) {
    (self as DedicatedWorkerGlobalScope).postMessage({ reqId, error: String(err) });
  }
};

export {};
