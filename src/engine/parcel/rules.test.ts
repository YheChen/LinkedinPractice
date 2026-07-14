import { describe, it, expect } from "vitest";
import {
  boxFromCorners,
  boxArea,
  boxShape,
  shapeSatisfies,
  cluesInBox,
  placeRect,
  removeRectAt,
  validate,
} from "./rules";
import { PARCEL_5x5 } from "./fixtures";

const puzzle = PARCEL_5x5.puzzle;

describe("Parcel geometry", () => {
  it("normalizes corners into a box regardless of drag direction", () => {
    expect(boxFromCorners({ r: 4, c: 3 }, { r: 1, c: 1 })).toEqual({ top: 1, left: 1, bottom: 4, right: 3 });
  });
  it("computes area and shape", () => {
    const box = { top: 0, left: 0, bottom: 4, right: 0 };
    expect(boxArea(box)).toBe(5);
    expect(boxShape(box)).toBe("tall");
    expect(boxShape({ top: 0, left: 0, bottom: 0, right: 2 })).toBe("wide");
    expect(boxShape({ top: 0, left: 0, bottom: 2, right: 2 })).toBe("square");
  });
  it("shapeSatisfies honours the free constraint", () => {
    const box = { top: 0, left: 0, bottom: 1, right: 2 };
    expect(shapeSatisfies("free", box)).toBe(true);
    expect(shapeSatisfies("wide", box)).toBe(true);
    expect(shapeSatisfies("tall", box)).toBe(false);
  });
});

describe("Parcel placement", () => {
  it("rejects a rectangle that encloses no clue", () => {
    // top-left 1×1 at cell 0 encloses no clue
    const res = placeRect(puzzle, [], { r: 0, c: 0 }, { r: 0, c: 0 });
    expect(res).toEqual({ ok: false, reason: "no-clue" });
  });

  it("rejects a rectangle that encloses multiple clues", () => {
    // a box covering cols0-1 rows0-4 encloses clues 10 and 11
    const res = placeRect(puzzle, [], { r: 0, c: 0 }, { r: 4, c: 1 });
    expect(res).toEqual({ ok: false, reason: "multiple-clues" });
  });

  it("binds a rectangle to its single enclosed clue and replaces the prior one", () => {
    const first = placeRect(puzzle, [], { r: 0, c: 0 }, { r: 2, c: 0 });
    expect(first.ok).toBe(true);
    expect(first.rects).toHaveLength(1);
    expect(first.rects![0]!.clueCell).toBe(10);
    // redraw the same clue larger → replaces, not appends
    const second = placeRect(puzzle, first.rects!, { r: 0, c: 0 }, { r: 4, c: 0 });
    expect(second.rects).toHaveLength(1);
    expect(boxArea(second.rects![0]!)).toBe(5);
  });

  it("removeRectAt removes the parcel under a cell", () => {
    const placed = placeRect(puzzle, [], { r: 0, c: 0 }, { r: 4, c: 0 }).rects!;
    expect(removeRectAt(placed, 20 /* r4c0 */, 5)).toHaveLength(0);
    expect(removeRectAt(placed, 4 /* r0c4, outside */, 5)).toHaveLength(1);
  });
});

describe("Parcel validation", () => {
  it("flags overlaps as errors", () => {
    const rects = [
      { clueCell: 10, top: 0, left: 0, bottom: 4, right: 0 },
      { clueCell: 11, top: 0, left: 0, bottom: 4, right: 1 }, // overlaps col0
    ];
    const v = validate(puzzle, rects);
    expect(v.solved).toBe(false);
    expect(v.errorCells.length).toBeGreaterThan(0);
  });

  it("flags a wrong-area parcel", () => {
    const rects = [{ clueCell: 10, top: 0, left: 0, bottom: 2, right: 0 }]; // area 3, clue wants 5
    const v = validate(puzzle, rects);
    expect(v.errorCells).toEqual(expect.arrayContaining([0, 5, 10]));
  });

  it("recognises the complete correct partition as solved", () => {
    const v = validate(puzzle, PARCEL_5x5.solution);
    expect(v.solved).toBe(true);
    expect(v.errorCells).toHaveLength(0);
  });

  it("the solution covers exactly all 25 cells once", () => {
    const total = puzzle.clues.reduce((s, cl) => s + (cl.area ?? 0), 0);
    expect(total).toBe(25);
    expect(cluesInBox(puzzle, { top: 0, left: 0, bottom: 4, right: 4 })).toHaveLength(4);
  });
});
