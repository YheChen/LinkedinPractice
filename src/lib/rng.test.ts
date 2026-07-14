import { describe, it, expect } from "vitest";
import { createRng } from "./rng";

describe("createRng — determinism (seed reproducibility contract)", () => {
  it("produces an identical sequence for the same seed", () => {
    const a = createRng("daily:2026-07-14:path");
    const b = createRng("daily:2026-07-14:path");
    const seqA = Array.from({ length: 32 }, () => a.next());
    const seqB = Array.from({ length: 32 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createRng("seed-a");
    const b = createRng("seed-b");
    expect(a.next()).not.toEqual(b.next());
  });

  it("int() stays within [min, max)", () => {
    const rng = createRng("bounds");
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThan(7);
    }
  });

  it("shuffle is deterministic and a permutation", () => {
    const src = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const s1 = createRng("s").shuffle(src);
    const s2 = createRng("s").shuffle(src);
    expect(s1).toEqual(s2);
    expect([...s1].sort((x, y) => x - y)).toEqual(src);
  });

  it("pick throws on empty array", () => {
    expect(() => createRng("x").pick([])).toThrow();
  });
});
