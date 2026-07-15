"use client";

/**
 * ONE input system for mouse, touch, and stylus, built on Pointer Events.
 *
 * Design decisions (SPEC §"Pointer & keyboard input"):
 *
 * • Hit testing = HYBRID. We convert pointer coordinates to a cell using the
 *   board's bounding rect + fixed cell size (cheap, allocation-free, robust to
 *   fast movement). We do NOT call document.elementFromPoint per move (slow,
 *   and wrong under CSS transforms/scroll). The rect is cached on gesture start
 *   and refreshed on resize. DOM cells still carry data-cell for a11y + tests.
 *
 * • Pointer capture: we setPointerCapture on the board so the gesture keeps
 *   flowing even when the finger/mouse leaves the board — required for smooth
 *   backtracking at the edge. lostpointercapture / pointercancel cleanly abort.
 *
 * • Scroll suppression is SURGICAL: touch-action:none is applied to the board
 *   element only, and only while a gesture is active do we preventDefault on
 *   touchmove. The rest of the page scrolls normally.
 *
 * • Fast movement: consecutive hit cells are bridged with orthogonal
 *   interpolation so no cell is skipped, and no diagonal is ever emitted.
 *
 * The hook is HEADLESS: it knows nothing about game rules. It reports "pointer
 * entered cell X" events; the game reducer decides if that move is legal.
 */
import { useCallback, useEffect, useRef } from "react";
import type { Coord } from "@/lib/grid";
import { coordEquals } from "@/lib/grid";
import { interpolateOrthogonal } from "./interpolate";

export interface BoardGeometry {
  rows: number;
  cols: number;
}

export interface PointerBoardHandlers {
  onGestureStart: (cell: Coord, pointerType: string) => void;
  /** Called for every cell the pointer enters, in order, including interpolated cells. */
  onCellEnter: (cell: Coord) => void;
  onGestureEnd: () => void;
  onGestureCancel: () => void;
}

export interface UsePointerBoardResult {
  /** Spread onto the board container element. */
  boardProps: {
    ref: (el: HTMLElement | null) => void;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
    style: React.CSSProperties;
  };
}

export function usePointerBoard(
  geometry: BoardGeometry,
  handlers: PointerBoardHandlers,
): UsePointerBoardResult {
  const elRef = useRef<HTMLElement | null>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const lastCellRef = useRef<Coord | null>(null);

  // Keep the latest handlers without re-binding listeners.
  const hRef = useRef(handlers);
  hRef.current = handlers;
  const geoRef = useRef(geometry);
  geoRef.current = geometry;

  const cellFromEvent = useCallback((clientX: number, clientY: number): Coord | null => {
    const rect = rectRef.current;
    if (!rect) return null;
    const { rows, cols } = geoRef.current;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) {
      // Outside the board: clamp so edge-backtracking still tracks the nearest cell.
      const cc = Math.min(cols - 1, Math.max(0, Math.floor((x / rect.width) * cols)));
      const rr = Math.min(rows - 1, Math.max(0, Math.floor((y / rect.height) * rows)));
      return { r: rr, c: cc };
    }
    const c = Math.min(cols - 1, Math.floor((x / rect.width) * cols));
    const r = Math.min(rows - 1, Math.floor((y / rect.height) * rows));
    return { r, c };
  }, []);

  const emitCell = useCallback((cell: Coord) => {
    const last = lastCellRef.current;
    if (last && coordEquals(last, cell)) return;
    if (last) {
      // Bridge skipped cells; the reducer rejects illegal steps individually.
      const bridge = interpolateOrthogonal(last, cell);
      if (bridge) {
        for (const step of bridge) hRef.current.onCellEnter(step);
        lastCellRef.current = cell;
        return;
      }
    }
    hRef.current.onCellEnter(cell);
    lastCellRef.current = cell;
  }, []);

  const setRef = useCallback((el: HTMLElement | null) => {
    elRef.current = el;
  }, []);

  // Refresh cached rect on resize/scroll while a gesture is active.
  useEffect(() => {
    const refresh = () => {
      if (elRef.current) rectRef.current = elRef.current.getBoundingClientRect();
    };
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, true);
    return () => {
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (activePointerRef.current !== null) return; // ignore secondary pointers
      if (e.button !== 0 && e.pointerType === "mouse") return; // left button only
      const el = elRef.current;
      if (!el) return;
      rectRef.current = el.getBoundingClientRect();
      const cell = cellFromEvent(e.clientX, e.clientY);
      if (!cell) return;
      activePointerRef.current = e.pointerId;
      lastCellRef.current = null;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort */
      }
      hRef.current.onGestureStart(cell, e.pointerType);
      lastCellRef.current = cell;
      e.preventDefault();
    },
    [cellFromEvent],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== activePointerRef.current) return;
      // Coalesced events give us every intermediate sample on high-frequency pointers.
      const events =
        typeof e.nativeEvent.getCoalescedEvents === "function"
          ? e.nativeEvent.getCoalescedEvents()
          : [e.nativeEvent];
      const list = events.length ? events : [e.nativeEvent];
      for (const ev of list) {
        const cell = cellFromEvent(ev.clientX, ev.clientY);
        if (cell) emitCell(cell);
      }
      e.preventDefault();
    },
    [cellFromEvent, emitCell],
  );

  const finish = useCallback((e: React.PointerEvent, cancelled: boolean) => {
    if (e.pointerId !== activePointerRef.current) return;
    activePointerRef.current = null;
    lastCellRef.current = null;
    const el = elRef.current;
    if (el) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    }
    if (cancelled) hRef.current.onGestureCancel();
    else hRef.current.onGestureEnd();
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => finish(e, false), [finish]);
  const onPointerCancel = useCallback((e: React.PointerEvent) => finish(e, true), [finish]);

  return {
    boardProps: {
      ref: setRef,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      // touch-action:none on the board only — page scroll elsewhere is untouched.
      style: { touchAction: "none", userSelect: "none", WebkitUserSelect: "none" },
    },
  };
}
