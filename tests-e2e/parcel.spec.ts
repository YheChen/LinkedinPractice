import { test, expect, type Page } from "@playwright/test";

/**
 * Parcel end-to-end via real mouse drags on the 5×5 fixture. The four correct
 * parcels (corner→corner) fully partition the grid and should trigger the solved
 * modal. This exercises the Pointer Events path (down/move/up) end to end.
 */
const ROWS = 5;
const COLS = 5;

async function cellCenter(page: Page, r: number, c: number) {
  const box = (await page.getByRole("application", { name: /Parcel grid/i }).boundingBox())!;
  return {
    x: box.x + ((c + 0.5) / COLS) * box.width,
    y: box.y + ((r + 0.5) / ROWS) * box.height,
  };
}

async function drawRect(page: Page, a: [number, number], b: [number, number]) {
  const start = await cellCenter(page, a[0], a[1]);
  const end = await cellCenter(page, b[0], b[1]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 6 });
  await page.mouse.up();
}

test("Parcel: drawing the four correct parcels solves the puzzle", async ({ page }) => {
  await page.goto("/play/parcel");
  await expect(page.getByRole("application", { name: /Parcel grid/i })).toBeVisible();

  await drawRect(page, [0, 0], [4, 0]); // clue 10 (area 5, tall)
  await drawRect(page, [0, 1], [4, 1]); // clue 11 (area 5, tall)
  await drawRect(page, [0, 2], [1, 4]); // clue 3  (area 6, wide)
  await drawRect(page, [2, 2], [4, 4]); // clue 18 (area 9, square)

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/Solved in/i);
});

test("Parcel: tapping a placed parcel removes it", async ({ page }) => {
  await page.goto("/play/parcel");
  await expect(page.getByRole("application", { name: /Parcel grid/i })).toBeVisible();

  await drawRect(page, [0, 0], [4, 0]);
  // A single click inside the parcel (tap) should delete it → status back to 0 placed.
  const mid = await cellCenter(page, 2, 0);
  await page.mouse.click(mid.x, mid.y);

  const status = page.locator('p[aria-live="polite"]');
  await expect(status).toContainText(/0 of 4 parcels/i);
});
