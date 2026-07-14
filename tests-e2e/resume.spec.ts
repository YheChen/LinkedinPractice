import { test, expect } from "@playwright/test";

/**
 * Mid-puzzle resume: progress on a fixed-seed board must survive a reload.
 * (A fixed seed keeps the puzzle id stable across reloads, which is what the
 * per-puzzle autosave key requires.)
 */
test("Trace: an in-progress line is restored after a reload", async ({ page }) => {
  const url = "/play/trace?seed=resume-e2e&d=easy";
  await page.goto(url);
  await expect(page.getByRole("application", { name: /Trace grid/i })).toBeVisible({ timeout: 15_000 });

  const status = page.locator('p[aria-live="polite"]');
  await expect(status).toContainText(/covers 1 of/i);

  // Advance the line one cell (deterministic) and let the debounced autosave run.
  await page.getByRole("button", { name: /Hint/i }).click();
  await expect(status).toContainText(/covers [2-9]\d? of/i);
  await page.waitForTimeout(700);

  // Reload the same board — the saved progress should restore.
  await page.reload();
  await expect(page.getByRole("application", { name: /Trace grid/i })).toBeVisible({ timeout: 15_000 });
  await expect(status).toContainText(/covers [2-9]\d? of/i);
});
