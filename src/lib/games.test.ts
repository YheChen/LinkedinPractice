import { describe, it, expect } from "vitest";
import { GAMES, gameBySlug } from "./games";

describe("game registry", () => {
  it("lists the four games with unique ids and slugs", () => {
    expect(GAMES).toHaveLength(4);
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(4);
    expect(new Set(GAMES.map((g) => g.slug)).size).toBe(4);
    expect(GAMES.map((g) => g.id).sort()).toEqual(["partition", "path", "queens", "wordpath"]);
  });

  it("every game has a --c- accent var and non-empty copy", () => {
    for (const g of GAMES) {
      expect(g.accentVar).toMatch(/^--c-/);
      expect(g.name.length).toBeGreaterThan(0);
      expect(g.tagline.length).toBeGreaterThan(0);
      expect(g.rules.length).toBeGreaterThan(0);
      expect(g.glyph.length).toBeGreaterThan(0);
    }
  });

  it("gameBySlug resolves known slugs and returns undefined otherwise", () => {
    expect(gameBySlug("trace")?.id).toBe("path");
    expect(gameBySlug("queens")?.id).toBe("queens");
    expect(gameBySlug("nope")).toBeUndefined();
  });
});
