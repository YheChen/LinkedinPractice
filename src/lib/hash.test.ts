import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { canonicalJson, hashString } from "./hash";

describe("hashString", () => {
  it("is deterministic and 8 hex chars", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const h = hashString(s);
        expect(h).toMatch(/^[0-9a-f]{8}$/);
        expect(hashString(s)).toBe(h);
      }),
    );
  });

  it("distinguishes different inputs", () => {
    expect(hashString("abc")).not.toBe(hashString("abd"));
    expect(hashString("")).not.toBe(hashString(" "));
  });
});

describe("canonicalJson", () => {
  it("is stable regardless of key order", () => {
    const a = canonicalJson({ b: 1, a: 2, c: { y: 1, x: 2 } });
    const b = canonicalJson({ a: 2, c: { x: 2, y: 1 }, b: 1 });
    expect(a).toBe(b);
  });

  it("preserves array order (arrays are not sorted)", () => {
    expect(canonicalJson([3, 1, 2])).toBe("[3,1,2]");
    expect(canonicalJson({ xs: [2, 1] })).toBe('{"xs":[2,1]}');
  });

  it("yields identical hashes for reordered-but-equal objects", () => {
    const h1 = hashString(canonicalJson({ game: "queens", rows: 6, regions: [0, 1] }));
    const h2 = hashString(canonicalJson({ regions: [0, 1], game: "queens", rows: 6 }));
    expect(h1).toBe(h2);
  });
});
