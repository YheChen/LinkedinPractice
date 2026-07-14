import { describe, it, expect } from "vitest";
import { exportJson, importJson, encodeShare, decodeShare } from "./io";
import { generateTrace } from "./trace/generate";
import { generateParcel } from "./parcel/generate";
import { generateWeave } from "./weave/generate";

const samples = [
  generateTrace({ seed: "io", difficulty: "easy" }),
  generateParcel({ seed: "io", difficulty: "easy" }),
  generateWeave({ seed: "io", difficulty: "easy" }),
];

describe("io — export/import round-trip", () => {
  it.each(samples)("exportJson ∘ importJson preserves $game", (def) => {
    const res = importJson(exportJson(def));
    expect(res.ok).toBe(true);
    expect(JSON.stringify(res.def)).toBe(JSON.stringify(def));
  });

  it("rejects invalid JSON", () => {
    expect(importJson("{not json").ok).toBe(false);
  });

  it("rejects a schema-invalid puzzle", () => {
    const res = importJson(JSON.stringify({ game: "path", meta: {}, checkpoints: {}, walls: [] }));
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it("rejects an oversized grid (import bomb defence)", () => {
    const bomb = { ...samples[0], meta: { ...samples[0]!.meta, rows: 9999, cols: 9999 } };
    expect(importJson(JSON.stringify(bomb)).ok).toBe(false);
  });
});

describe("io — share encoding", () => {
  it.each(samples)("encodeShare ∘ decodeShare round-trips $game", (def) => {
    const res = decodeShare(encodeShare(def));
    expect(res.ok).toBe(true);
    expect(JSON.stringify(res.def)).toBe(JSON.stringify(def));
  });

  it("decodeShare rejects a corrupt param", () => {
    expect(decodeShare("!!!not-base64!!!").ok).toBe(false);
  });
});
