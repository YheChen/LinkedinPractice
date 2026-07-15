import { describe, it, expect, afterEach } from "vitest";
import { resolveTheme, useSettings } from "./settings";

describe("resolveTheme", () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it("returns an explicit preference unchanged", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("resolves 'system' against the OS preference", () => {
    window.matchMedia = ((q: string) => ({ matches: true, media: q })) as unknown as typeof window.matchMedia;
    expect(resolveTheme("system")).toBe("dark");
    window.matchMedia = ((q: string) => ({ matches: false, media: q })) as unknown as typeof window.matchMedia;
    expect(resolveTheme("system")).toBe("light");
  });
});

describe("useSettings store", () => {
  it("defaults to system theme with all a11y toggles off", () => {
    const s = useSettings.getState();
    expect(s.theme).toBe("system");
    expect(s.highContrast).toBe(false);
    expect(s.reducedMotion).toBe(false);
    expect(s.colorBlindSafe).toBe(false);
  });
});
