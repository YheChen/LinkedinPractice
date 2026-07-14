/**
 * Parcel (Patches / Shikaku-style) rules — pure, framework-free.
 *
 * The player partitions the grid into axis-aligned rectangles ("parcels"), one
 * per numbered clue. A parcel is bound to its clue cell. Rules (RESEARCH.md §2):
 *   • every cell belongs to exactly one parcel;
 *   • each parcel contains exactly one clue;
 *   • the clue's number equals the parcel's area (when the clue has one);
 *   • the parcel matches the clue's shape (square / wide / tall / free);
 *   • parcels do not overlap.
 *
 * We allow the player to draw a "wrong" rectangle (wrong area/shape) as long as
 * it contains exactly one clue — validate() then flags it, matching the game's
 * "clear visual feedback on invalid rectangles" behaviour. A draw enclosing zero
 * or several clues is rejected outright (no ambiguous binding).
 */
import type {
  DrawnRect,
  PartitionPuzzle,
  ShapeConstraint,
  ValidationState,
} from "@/engine/types";
import type { Coord } from "@/lib/grid";
import { fromIndex } from "@/lib/grid";

export interface Box {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export function boxFromCorners(a: Coord, b: Coord): Box {
  return {
    top: Math.min(a.r, b.r),
    left: Math.min(a.c, b.c),
    bottom: Math.max(a.r, b.r),
    right: Math.max(a.c, b.c),
  };
}

export function boxWidth(box: Box): number {
  return box.right - box.left + 1;
}
export function boxHeight(box: Box): number {
  return box.bottom - box.top + 1;
}
export function boxArea(box: Box): number {
  return boxWidth(box) * boxHeight(box);
}

export function boxShape(box: Box): Exclude<ShapeConstraint, "free"> {
  const w = boxWidth(box);
  const h = boxHeight(box);
  if (w === h) return "square";
  return w > h ? "wide" : "tall";
}

export function shapeSatisfies(constraint: ShapeConstraint, box: Box): boolean {
  return constraint === "free" || boxShape(box) === constraint;
}

export function boxContains(box: Box, cellRow: number, cellCol: number): boolean {
  return cellRow >= box.top && cellRow <= box.bottom && cellCol >= box.left && cellCol <= box.right;
}

export function cellsInBox(box: Box, cols: number): number[] {
  const out: number[] = [];
  for (let r = box.top; r <= box.bottom; r++) {
    for (let c = box.left; c <= box.right; c++) out.push(r * cols + c);
  }
  return out;
}

/** Clue cells enclosed by a box. */
export function cluesInBox(puzzle: PartitionPuzzle, box: Box): number[] {
  const cols = puzzle.meta.cols;
  return puzzle.clues
    .filter((cl) => {
      const { r, c } = fromIndex(cl.cell, cols);
      return boxContains(box, r, c);
    })
    .map((cl) => cl.cell);
}

export type PlaceRejection = "no-clue" | "multiple-clues";

export interface PlaceResult {
  ok: boolean;
  rects?: DrawnRect[];
  reason?: PlaceRejection;
}

/**
 * Commit a rectangle from a drag between two corners. Binds to the single clue
 * it encloses, replacing that clue's previous parcel. Rejected if it encloses
 * zero or multiple clues.
 */
export function placeRect(
  puzzle: PartitionPuzzle,
  rects: readonly DrawnRect[],
  a: Coord,
  b: Coord,
): PlaceResult {
  const box = boxFromCorners(a, b);
  const clues = cluesInBox(puzzle, box);
  if (clues.length === 0) return { ok: false, reason: "no-clue" };
  if (clues.length > 1) return { ok: false, reason: "multiple-clues" };
  const clueCell = clues[0]!;
  const next: DrawnRect = { clueCell, ...box };
  return { ok: true, rects: [...rects.filter((r) => r.clueCell !== clueCell), next] };
}

/** Remove whichever parcel covers `cell` (if any). */
export function removeRectAt(rects: readonly DrawnRect[], cell: number, cols: number): DrawnRect[] {
  const { r, c } = fromIndex(cell, cols);
  return rects.filter((rect) => !boxContains(rect, r, c));
}

/** Per-cell coverage count. */
export function coverage(rects: readonly DrawnRect[], rows: number, cols: number): number[] {
  const counts = new Array<number>(rows * cols).fill(0);
  for (const rect of rects) {
    for (const cell of cellsInBox(rect, cols)) counts[cell] = (counts[cell] ?? 0) + 1;
  }
  return counts;
}

/**
 * Derive validation state: error cells (overlaps + parcels violating their
 * clue's area/shape) and solved status.
 */
export function validate(puzzle: PartitionPuzzle, rects: readonly DrawnRect[]): ValidationState {
  const { rows, cols } = puzzle.meta;
  const counts = coverage(rects, rows, cols);
  const errorCells = new Set<number>();

  // Overlaps.
  counts.forEach((n, cell) => {
    if (n > 1) errorCells.add(cell);
  });

  // Per-parcel clue satisfaction.
  const clueByCell = new Map(puzzle.clues.map((cl) => [cl.cell, cl]));
  for (const rect of rects) {
    const clue = clueByCell.get(rect.clueCell);
    if (!clue) continue;
    const areaBad = clue.area !== undefined && boxArea(rect) !== clue.area;
    const shapeBad = !shapeSatisfies(clue.shape, rect);
    if (areaBad || shapeBad) for (const cell of cellsInBox(rect, cols)) errorCells.add(cell);
  }

  const covered = counts.filter((n) => n === 1).length;
  const total = rows * cols;
  const allClued = rects.length === puzzle.clues.length;
  const solved = errorCells.size === 0 && covered === total && allClued;

  const message = solved
    ? "Solved! Every cell belongs to exactly one parcel."
    : `${rects.length} of ${puzzle.clues.length} parcels placed; ${covered} of ${total} cells covered.` +
      (errorCells.size ? ` ${errorCells.size} cell(s) need fixing.` : "");

  return { solved, errorCells: [...errorCells], message };
}
