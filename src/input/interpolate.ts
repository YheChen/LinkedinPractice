/**
 * Fast-drag interpolation.
 *
 * When a pointer moves quickly, `pointermove` fires only intermittently — the
 * user can cross several cells between two events. We must fill the gap WITHOUT
 * ever fabricating an illegal (diagonal / non-adjacent) move.
 *
 * Strategy (SPEC §"Pointer input"): given the previous committed cell and the
 * newly-hit cell, walk an L-shaped orthogonal route between them. We only emit
 * a route when the target is reachable by a clean axis-then-axis walk; genuinely
 * ambiguous fast diagonal flicks are rejected so the caller can drop the sample
 * rather than guess a path the user didn't intend. Per-step legality (walls,
 * self-crossing, adjacency to the *game's* rules) is then enforced by the game
 * reducer on each interpolated step — this function only guarantees orthogonal
 * adjacency of consecutive cells.
 */
import type { Coord } from "@/lib/grid";

export interface InterpolateOptions {
  /** Max cells we are willing to bridge in one gap; guards pathological jumps. */
  maxSpan?: number;
}

/**
 * Returns the ordered list of cells strictly BETWEEN `from` and `to`, inclusive
 * of `to`, such that every consecutive pair is orthogonally adjacent. Returns
 * null when the two cells are equal or the span exceeds maxSpan.
 *
 * For a pure horizontal/vertical gap this is a straight run. For a diagonal gap
 * we route horizontally first, then vertically (deterministic; the reducer will
 * reject the branch that violates walls, and the input layer can retry the other
 * elbow — see usePointerBoard).
 */
export function interpolateOrthogonal(
  from: Coord,
  to: Coord,
  opts: InterpolateOptions = {},
): Coord[] | null {
  const maxSpan = opts.maxSpan ?? 12;
  const dr = to.r - from.r;
  const dc = to.c - from.c;
  const span = Math.abs(dr) + Math.abs(dc);
  if (span === 0 || span > maxSpan) return null;

  const out: Coord[] = [];
  let { r, c } = from;
  const stepC = Math.sign(dc);
  const stepR = Math.sign(dr);

  // Horizontal leg first, then vertical — an L route with orthogonal steps.
  while (c !== to.c) {
    c += stepC;
    out.push({ r, c });
  }
  while (r !== to.r) {
    r += stepR;
    out.push({ r, c });
  }
  return out;
}

/** The alternate elbow (vertical leg first) — used as a fallback route. */
export function interpolateOrthogonalAlt(from: Coord, to: Coord, opts: InterpolateOptions = {}): Coord[] | null {
  const maxSpan = opts.maxSpan ?? 12;
  const dr = to.r - from.r;
  const dc = to.c - from.c;
  const span = Math.abs(dr) + Math.abs(dc);
  if (span === 0 || span > maxSpan) return null;

  const out: Coord[] = [];
  let { r, c } = from;
  const stepC = Math.sign(dc);
  const stepR = Math.sign(dr);
  while (r !== to.r) {
    r += stepR;
    out.push({ r, c });
  }
  while (c !== to.c) {
    c += stepC;
    out.push({ r, c });
  }
  return out;
}
