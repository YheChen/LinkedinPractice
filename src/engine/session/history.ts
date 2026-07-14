/**
 * Undo/redo over immutable player-state snapshots.
 *
 * What commits to history vs. what stays transient (SPEC §"State model"):
 *
 *   COMMITTED (one entry each):
 *     • a completed gesture that changed player state (a finished drag, a placed
 *       rectangle, a submitted word)
 *     • a keyboard move that extends/retracts the solution
 *     • hint application (it mutates player state)
 *
 *   TRANSIENT (NEVER pushed — would flood the stack and make undo useless):
 *     • every intermediate `onCellEnter` during a drag
 *     • hover / focus movement
 *     • timer ticks
 *
 * The rule of thumb: push on gesture COMMIT, not on gesture progress. Games call
 * `commit(next)` from their `onGestureEnd`, and mutate a separate live draft
 * during the gesture.
 *
 * Snapshots are structurally shared where possible by the caller; this class
 * just holds references and pointers.
 */
export interface History<T> {
  present: T;
  past: T[];
  future: T[];
}

export function createHistory<T>(initial: T): History<T> {
  return { present: initial, past: [], future: [] };
}

/** Push a new present, clearing the redo branch. No-op if identical reference. */
export function commit<T>(h: History<T>, next: T): History<T> {
  if (next === h.present) return h;
  return { present: next, past: [...h.past, h.present], future: [] };
}

export function canUndo<T>(h: History<T>): boolean {
  return h.past.length > 0;
}

export function canRedo<T>(h: History<T>): boolean {
  return h.future.length > 0;
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h;
  const previous = h.past[h.past.length - 1]!;
  return {
    present: previous,
    past: h.past.slice(0, -1),
    future: [h.present, ...h.future],
  };
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h;
  const next = h.future[0]!;
  return {
    present: next,
    past: [...h.past, h.present],
    future: h.future.slice(1),
  };
}

/** Replace present without touching history — used when restoring a saved game. */
export function reset<T>(initial: T): History<T> {
  return createHistory(initial);
}
