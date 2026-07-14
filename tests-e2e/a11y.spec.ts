import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Automated accessibility audit. We fail on serious/critical violations across
 * the shell and each game surface. (Manual screen-reader flows are documented in
 * SPEC §Accessibility; the roving-focus + aria-live model is exercised by the
 * per-game keyboard e2e.)
 */
const PAGES = ["/", "/daily", "/archive", "/stats", "/editor"];

for (const path of PAGES) {
  test(`no serious a11y violations: ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, nodes: v.nodes.length })), null, 2)).toEqual([]);
  });
}

test("no serious a11y violations on a game board", async ({ page }) => {
  await page.goto("/play/trace");
  await expect(page.getByRole("application", { name: /Trace grid/i })).toBeVisible({ timeout: 15_000 });
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, nodes: v.nodes.length })), null, 2)).toEqual([]);
});
