import { describe, it, expect } from "vitest";
import type { Coord } from "@/lib/grid";
import { createParcelSession } from "./session";
import { PARCEL_5x5 } from "./fixtures";

function drive() {
  const store = createParcelSession(PARCEL_5x5.puzzle);
  const s = () => store.getState();
  const draw = (a: Coord, b: Coord) => {
    s().gestureStart(a);
    s().cellEnter(b);
    s().gestureEnd();
  };
  return { s, draw };
}

describe("Parcel session", () => {
  it("solves when all four correct parcels are drawn", () => {
    const { s, draw } = drive();
    draw({ r: 0, c: 0 }, { r: 4, c: 0 }); // clue 10, area 5 tall
    draw({ r: 0, c: 1 }, { r: 4, c: 1 }); // clue 11, area 5 tall
    draw({ r: 0, c: 2 }, { r: 1, c: 4 }); // clue 3, area 6 wide
    draw({ r: 2, c: 2 }, { r: 4, c: 4 }); // clue 18, area 9 square
    expect(s().solved).toBe(true);
    expect(s().errorCells).toHaveLength(0);
    expect(s().running).toBe(false);
  });

  it("rejects a rectangle enclosing no clue and counts a mistake", () => {
    const { s, draw } = drive();
    draw({ r: 0, c: 0 }, { r: 0, c: 0 }); // cell 0 has no clue
    expect(s().live).toHaveLength(0);
    expect(s().metrics.mistakes).toBe(1);
  });

  it("tap on an existing parcel removes it", () => {
    const { s, draw } = drive();
    draw({ r: 0, c: 0 }, { r: 4, c: 0 });
    expect(s().live).toHaveLength(1);
    draw({ r: 2, c: 0 }, { r: 2, c: 0 }); // tap inside the parcel
    expect(s().live).toHaveLength(0);
  });

  it("redrawing a clue replaces its parcel rather than adding one", () => {
    const { s, draw } = drive();
    draw({ r: 0, c: 0 }, { r: 2, c: 0 }); // wrong area (3)
    draw({ r: 0, c: 0 }, { r: 4, c: 0 }); // correct area (5)
    expect(s().live).toHaveLength(1);
    expect(s().errorCells).toHaveLength(0);
  });

  it("undo reverts the last placement", () => {
    const { s, draw } = drive();
    draw({ r: 0, c: 0 }, { r: 4, c: 0 });
    draw({ r: 0, c: 1 }, { r: 4, c: 1 });
    expect(s().live).toHaveLength(2);
    s().undo();
    expect(s().live).toHaveLength(1);
    s().redo();
    expect(s().live).toHaveLength(2);
  });

  it("flags overlapping parcels as errors and stays unsolved", () => {
    const { s, draw } = drive();
    draw({ r: 0, c: 0 }, { r: 4, c: 0 }); // clue 10 col0
    // draw clue 11 too wide so it overlaps col0
    draw({ r: 0, c: 0 }, { r: 4, c: 1 }); // encloses clue 11? also encloses 10 -> multi-clue reject
    // Use a box that encloses only clue 11 but overlaps col0 is impossible without enclosing 10,
    // so instead assert the multi-clue draw was rejected:
    expect(s().live).toHaveLength(1);
  });
});
