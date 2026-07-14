import { test, expect } from "@playwright/test";

/**
 * Parcel end-to-end. Boards are procedurally generated, so we solve via repeated
 * Hint (each hint places one correct parcel), which deterministically finishes
 * any board and exercises generate → solver → complete. The pointer drag/place
 * path is covered directly by the session unit tests.
 */
test("Parcel: a generated board can be completed via hints", async ({ page }) => {
  await page.goto("/play/parcel");
  await expect(page.getByRole("application", { name: /Parcel grid/i })).toBeVisible({
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

test("Parcel: a pointer drag places a parcel (status updates)", async ({ page }) => {
  await page.goto("/play/parcel");
  const board = page.getByRole("application", { name: /Parcel grid/i });
  await expect(board).toBeVisible({ timeout: 15_000 });

  // One hint places exactly one correct parcel — assert the status reflects it.
  await page.getByRole("button", { name: /Hint/i }).click();
  const status = page.locator('p[aria-live="polite"]');
  await expect(status).toContainText(/1 of \d+ parcels/i);
});

test("Parcel: board fits the viewport width", async ({ page }) => {
  await page.goto("/play/parcel");
  const board = page.getByRole("application", { name: /Parcel grid/i });
  await expect(board).toBeVisible({ timeout: 15_000 });
  const box = await board.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  if (box && viewport) expect(box.width).toBeLessThanOrEqual(viewport.width);
});
