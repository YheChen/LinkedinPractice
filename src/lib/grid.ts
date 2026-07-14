/**
 * Grid geometry shared by all three games. Cells are addressed by {r, c} and
 * flattened to an index (r * cols + c) for compact storage in puzzle formats.
 */

export interface Coord {
  r: number;
  c: number;
}

export type Direction = "up" | "down" | "left" | "right";

export const DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];

const DELTA: Record<Direction, Coord> = {
  up: { r: -1, c: 0 },
  down: { r: 1, c: 0 },
  left: { r: 0, c: -1 },
  right: { r: 0, c: 1 },
};

export function toIndex(coord: Coord, cols: number): number {
  return coord.r * cols + coord.c;
}

export function fromIndex(index: number, cols: number): Coord {
  return { r: Math.floor(index / cols), c: index % cols };
}

export function coordEquals(a: Coord, b: Coord): boolean {
  return a.r === b.r && a.c === b.c;
}

export function inBounds(coord: Coord, rows: number, cols: number): boolean {
  return coord.r >= 0 && coord.r < rows && coord.c >= 0 && coord.c < cols;
}

export function step(coord: Coord, dir: Direction): Coord {
  const d = DELTA[dir];
  return { r: coord.r + d.r, c: coord.c + d.c };
}

/** Orthogonal neighbours that lie inside the grid. */
export function neighbors(coord: Coord, rows: number, cols: number): Coord[] {
  return DIRECTIONS.map((d) => step(coord, d)).filter((n) => inBounds(n, rows, cols));
}

/** Two cells are orthogonally adjacent (Manhattan distance 1). */
export function isOrthogonalAdjacent(a: Coord, b: Coord): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

/**
 * Wall key between two ADJACENT cells, order-independent. Walls are stored as a
 * set of these keys. A wall forbids the path/partition from crossing the shared
 * edge (Zip walls, Wend blocked-edge variants).
 */
export function wallKey(a: Coord, b: Coord, cols: number): string {
  const ia = toIndex(a, cols);
  const ib = toIndex(b, cols);
  return ia < ib ? `${ia}:${ib}` : `${ib}:${ia}`;
}
