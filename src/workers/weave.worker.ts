/// <reference lib="webworker" />
/** Weave generation worker — runs Hamiltonian-path cutting + ambiguity solving
 *  off the main thread. */
import { generateWeave, type GenerateWeaveOptions } from "@/engine/weave/generate";

interface Req extends GenerateWeaveOptions {
  reqId: number;
}

self.onmessage = (e: MessageEvent<Req>) => {
  const { reqId, ...opts } = e.data;
  try {
    const puzzle = generateWeave(opts);
    (self as DedicatedWorkerGlobalScope).postMessage({ reqId, puzzle });
  } catch (err) {
    (self as DedicatedWorkerGlobalScope).postMessage({ reqId, error: String(err) });
  }
};

export {};
