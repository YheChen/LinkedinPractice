"use client";

/**
 * Autosave + restore for an in-progress game (SPEC §"State model" — restoring an
 * unfinished game). Works with any session store that exposes `snapshot()` and
 * `restore()`:
 *   • on mount, loads the saved snapshot for this puzzle and restores it once;
 *   • subscribes to the store and debounces a save on every change;
 *   • saving is skipped when the store returns null (nothing worth persisting,
 *     or already solved — completion clears progress via storage.recordCompletion).
 *
 * Persistence is keyed by the immutable puzzle id, so the SAME board (same seed +
 * difficulty) resumes; a different board starts fresh.
 */
import { useEffect, useRef } from "react";
import type { StoreApi, UseBoundStore } from "zustand";
import { storage, type AttemptSnapshot } from "@/lib/storage";

export interface Persistable {
  snapshot: () => AttemptSnapshot | null;
  restore: (snap: AttemptSnapshot) => void;
}

export function useResume<T extends Persistable>(
  store: UseBoundStore<StoreApi<T>>,
  puzzleId: string,
): void {
  const restored = useRef(false);

  useEffect(() => {
    let alive = true;
    restored.current = false;

    storage.getProgress(puzzleId).then((snap) => {
      if (alive && snap && !restored.current) {
        restored.current = true;
        store.getState().restore(snap);
      }
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = store.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const snap = store.getState().snapshot();
        if (snap) void storage.saveProgress(snap);
      }, 400);
    });

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [store, puzzleId]);
}
