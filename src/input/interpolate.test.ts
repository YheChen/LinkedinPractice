import { describe, it, expect } from "vitest";
import { interpolateOrthogonal, interpolateOrthogonalAlt } from "./interpolate";
import { isOrthogonalAdjacent } from "@/lib/grid";

describe("interpolateOrthogonal — never emits an illegal step", () => {
  it("bridges a straight horizontal run", () => {
    const cells = interpolateOrthogonal({ r: 0, c: 0 }, { r: 0, c: 3 });
    expect(cells).toEqual([
      { r: 0, c: 1 },
      { r: 0, c: 2 },
      { r: 0, c: 3 },
    ]);
  });

  it("bridges a diagonal gap with only orthogonal steps", () => {
    const from = { r: 0, c: 0 };
    const cells = interpolateOrthogonal(from, { r: 2, c: 2 });
    expect(cells).not.toBeNull();
    // Every consecutive pair (including from->first) must be orthogonally adjacent.
    let prev = from;
    for (const cell of cells!) {
      expect(isOrthogonalAdjacent(prev, cell)).toBe(true);
      prev = cell;
    }
    expect(prev).toEqual({ r: 2, c: 2 });
  });

  it("returns null for zero-distance and over-span jumps", () => {
    expect(interpolateOrthogonal({ r: 1, c: 1 }, { r: 1, c: 1 })).toBeNull();
    expect(interpolateOrthogonal({ r: 0, c: 0 }, { r: 0, c: 99 }, { maxSpan: 4 })).toBeNull();
  });

  it("alt elbow also yields only orthogonal steps and same endpoint", () => {
    const from = { r: 0, c: 0 };
    const to = { r: 3, c: 2 };
    const cells = interpolateOrthogonalAlt(from, to)!;
    let prev = from;
    for (const cell of cells) {
      expect(isOrthogonalAdjacent(prev, cell)).toBe(true);
      prev = cell;
    }
    expect(prev).toEqual(to);
  });
});
