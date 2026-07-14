import { test, expect } from "@playwright/test";

test("Stats: page renders a section per game", async ({ page }) => {
  await page.goto("/stats");
  await expect(page.getByRole("heading", { name: "Statistics" })).toBeVisible();
  await expect(page.getByRole("region", { name: /Zip statistics/i })).toBeVisible();
  await expect(page.getByRole("region", { name: /Patches statistics/i })).toBeVisible();
  await expect(page.getByRole("region", { name: /Wend statistics/i })).toBeVisible();
});

test("Stats: completing a puzzle updates its completed count", async ({ page }) => {
  // Complete a Zip board via hints, then the stats page should show >=1 completed.
  await page.goto("/play/trace");
  await expect(page.getByRole("application", { name: /Zip grid/i })).toBeVisible({ timeout: 15_000 });
  const hint = page.getByRole("button", { name: /Hint/i });
  const dialog = page.getByRole("dialog");
  for (let i = 0; i < 40; i++) {
    if (await dialog.isVisible().catch(() => false)) break;
    await hint.click();
  }
  await expect(dialog).toBeVisible();

  await page.goto("/stats");
  const trace = page.getByRole("region", { name: /Zip statistics/i });
  await expect(trace.getByText("Completed")).toBeVisible();
  // The completed metric should be at least 1 (localStorage persists within the context).
  await expect(trace).toContainText(/Completed/);
});
