import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  coordEquals,
  fromIndex,
  inBounds,
  isOrthogonalAdjacent,
  neighbors,
  step,
  toIndex,
  wallKey,
} from "./grid";

describe("grid geometry", () => {
  it("toIndex/fromIndex round-trip for every cell", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), fc.integer({ min: 1, max: 20 }), (rows, cols) => {
        for (let i = 0; i < rows * cols; i++) {
          expect(toIndex(fromIndex(i, cols), cols)).toBe(i);
        }
      }),
      { numRuns: 30 },
    );
  });

  it("toIndex uses row-major order", () => {
    expect(toIndex({ r: 0, c: 0 }, 5)).toBe(0);
    expect(toIndex({ r: 1, c: 0 }, 5)).toBe(5);
    expect(toIndex({ r: 2, c: 3 }, 5)).toBe(13);
  });

  it("inBounds rejects out-of-range coords", () => {
    expect(inBounds({ r: 0, c: 0 }, 3, 3)).toBe(true);
    expect(inBounds({ r: 2, c: 2 }, 3, 3)).toBe(true);
    expect(inBounds({ r: -1, c: 0 }, 3, 3)).toBe(false);
    expect(inBounds({ r: 0, c: 3 }, 3, 3)).toBe(false);
    expect(inBounds({ r: 3, c: 0 }, 3, 3)).toBe(false);
  });

  it("neighbors: corner has 2, edge 3, interior 4", () => {
    expect(neighbors({ r: 0, c: 0 }, 4, 4)).toHaveLength(2);
    expect(neighbors({ r: 0, c: 1 }, 4, 4)).toHaveLength(3);
    expect(neighbors({ r: 1, c: 1 }, 4, 4)).toHaveLength(4);
    expect(neighbors({ r: 3, c: 3 }, 4, 4)).toHaveLength(2);
  });

  it("neighbors are all in-bounds and orthogonally adjacent to the source", () => {
    const src = { r: 2, c: 2 };
    for (const n of neighbors(src, 5, 5)) {
      expect(inBounds(n, 5, 5)).toBe(true);
      expect(isOrthogonalAdjacent(src, n)).toBe(true);
    }
  });

  it("step moves one cell in each direction", () => {
    expect(step({ r: 1, c: 1 }, "up")).toEqual({ r: 0, c: 1 });
    expect(step({ r: 1, c: 1 }, "down")).toEqual({ r: 2, c: 1 });
    expect(step({ r: 1, c: 1 }, "left")).toEqual({ r: 1, c: 0 });
    expect(step({ r: 1, c: 1 }, "right")).toEqual({ r: 1, c: 2 });
  });

  it("isOrthogonalAdjacent is false for diagonals and same cell", () => {
    expect(isOrthogonalAdjacent({ r: 0, c: 0 }, { r: 1, c: 1 })).toBe(false);
    expect(isOrthogonalAdjacent({ r: 0, c: 0 }, { r: 0, c: 0 })).toBe(false);
    expect(isOrthogonalAdjacent({ r: 0, c: 0 }, { r: 0, c: 2 })).toBe(false);
  });

  it("wallKey is order-independent between two cells", () => {
    const a = { r: 0, c: 0 };
    const b = { r: 0, c: 1 };
    expect(wallKey(a, b, 5)).toBe(wallKey(b, a, 5));
    expect(wallKey(a, b, 5)).toBe("0:1");
  });

  it("coordEquals compares by value", () => {
    expect(coordEquals({ r: 1, c: 2 }, { r: 1, c: 2 })).toBe(true);
    expect(coordEquals({ r: 1, c: 2 }, { r: 2, c: 1 })).toBe(false);
  });
});
