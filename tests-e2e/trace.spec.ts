import { test, expect } from "@playwright/test";

/**
 * Trace end-to-end. Boards are now procedurally generated (random seed per
 * load), so we can't hardcode a solution key-sequence. Instead we complete the
 * puzzle by repeatedly pressing Hint — each Hint reveals exactly one correct
 * step, so this deterministically finishes ANY generated board and exercises
 * the full generate → play → complete pipeline.
 */
test("Trace: generated puzzle can be completed (via hints) and shows the solved modal", async ({
  page,
}) => {
  await page.goto("/play/trace");

  const board = page.getByRole("application", { name: /Trace grid/i });
  await expect(board).toBeVisible({ timeout: 15_000 }); // waits for worker generation

  const hint = page.getByRole("button", { name: /Hint/i });
  const dialog = page.getByRole("dialog");

  // Easy is 5×5 = 25 cells → at most 24 hints. Cap generously and stop on modal.
  for (let i = 0; i < 40; i++) {
    if (await dialog.isVisible().catch(() => false)) break;
    await hint.click();
  }

  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/Solved in/i);
});

test("Trace: a keyboard move extends the line", async ({ page }) => {
  await page.goto("/play/trace");
  const board = page.getByRole("application", { name: /Trace grid/i });
  await expect(board).toBeVisible({ timeout: 15_000 });
  await board.focus();

  const status = page.locator('p[aria-live="polite"]');
  await expect(status).toContainText(/covers 1 of/i);

  // Press one direction at a time and stop at the first that extends the line.
  // (Pressing opposing directions would backtrack, so we must not batch them.)
  let extended = false;
  for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]) {
    await page.keyboard.press(key);
    if (/covers [2-9]\d? of/i.test((await status.textContent()) ?? "")) {
      extended = true;
      break;
    }
  }
  expect(extended).toBe(true);
});

test("Trace: board fits the viewport width", async ({ page }) => {
  await page.goto("/play/trace");
  const board = page.getByRole("application", { name: /Trace grid/i });
  await expect(board).toBeVisible({ timeout: 15_000 });

  const box = await board.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  if (box && viewport) expect(box.width).toBeLessThanOrEqual(viewport.width);
});
