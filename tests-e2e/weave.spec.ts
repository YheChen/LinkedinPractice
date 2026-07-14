import { test, expect } from "@playwright/test";

/**
 * Weave end-to-end. Completing via repeated Hint deterministically finishes the
 * board (each hint locks in one word) and exercises trace → submit → complete.
 * The drag/backtrack path is covered by the session unit tests.
 */
test("Weave: the puzzle can be completed via hints", async ({ page }) => {
  await page.goto("/play/weave");
  await expect(page.getByRole("application", { name: /Weave grid/i })).toBeVisible({ timeout: 15_000 });

  const hint = page.getByRole("button", { name: /Hint/i });
  const dialog = page.getByRole("dialog");
  for (let i = 0; i < 10; i++) {
    if (await dialog.isVisible().catch(() => false)) break;
    await hint.click();
  }
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/Solved in/i);
});

test("Weave: board fits the viewport width", async ({ page }) => {
  await page.goto("/play/weave");
  const board = page.getByRole("application", { name: /Weave grid/i });
  await expect(board).toBeVisible();
  const box = await board.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  if (box && viewport) expect(box.width).toBeLessThanOrEqual(viewport.width);
});
