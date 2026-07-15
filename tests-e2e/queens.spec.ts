import { test, expect } from "@playwright/test";

/**
 * Queens end-to-end. Boards are procedurally generated, so we solve via repeated
 * Hint (each hint places one correct queen), which deterministically finishes
 * any board and exercises generate → solver → complete. Tap-cycling is covered
 * directly here and in the session unit tests.
 */
test("Queens: a generated board can be completed via hints", async ({ page }) => {
  await page.goto("/play/queens");
  await expect(page.getByRole("application", { name: /Queens grid/i })).toBeVisible({
    timeout: 15_000,
  });

  const hint = page.getByRole("button", { name: /Hint/i });
  const dialog = page.getByRole("dialog");

  for (let i = 0; i < 40; i++) {
    if (await dialog.isVisible().catch(() => false)) break;
    await hint.click();
  }

  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/Solved in/i);
});

test("Queens: tapping a cell cycles empty → cross-out → queen → empty", async ({ page }) => {
  await page.goto("/play/queens");
  const board = page.getByRole("application", { name: /Queens grid/i });
  await expect(board).toBeVisible({ timeout: 15_000 });

  const cell = board.locator('button[data-cell="0"]');
  await expect(cell).toHaveAttribute("aria-label", /empty$/);
  await cell.click();
  await expect(cell).toHaveAttribute("aria-label", /crossed out$/);
  await cell.click();
  await expect(cell).toHaveAttribute("aria-label", /queen$/);
  await cell.click();
  await expect(cell).toHaveAttribute("aria-label", /empty$/);
});

test("Queens: the queen counter reflects placements", async ({ page }) => {
  await page.goto("/play/queens");
  const board = page.getByRole("application", { name: /Queens grid/i });
  await expect(board).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: /Hint/i }).click();
  await expect(page.getByText(/^1\/\d+ queens$/)).toBeVisible();
});

test("Queens: board fits the viewport width", async ({ page }) => {
  await page.goto("/play/queens");
  const board = page.getByRole("application", { name: /Queens grid/i });
  await expect(board).toBeVisible({ timeout: 15_000 });
  const box = (await board.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.width).toBeLessThanOrEqual(viewport.width + 1);
});
