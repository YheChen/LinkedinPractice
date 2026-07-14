/// <reference lib="webworker" />
/** Parcel generation worker — runs the tiling + exact-cover uniqueness loop off
 *  the main thread (SPEC §10). */
import { generateParcel, type GenerateParcelOptions } from "@/engine/parcel/generate";

interface Req extends GenerateParcelOptions {
  reqId: number;
}

self.onmessage = (e: MessageEvent<Req>) => {
  const { reqId, ...opts } = e.data;
  try {
    const puzzle = generateParcel(opts);
    (self as DedicatedWorkerGlobalScope).postMessage({ reqId, puzzle });
  } catch (err) {
    (self as DedicatedWorkerGlobalScope).postMessage({ reqId, error: String(err) });
  }
};

export {};
