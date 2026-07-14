import { test, expect } from "@playwright/test";

/**
 * Trace end-to-end. Keyboard completion is deterministic (no pointer flakiness),
 * so it's our canonical "can a real user finish the game" check. Pointer/touch
 * drag specs are layered on in later milestones once the generator lands.
 *
 * The 5×5 easy fixture solves with this key sequence (R=right, D=down, L=left):
 *   R R R R D  L L L L D  R R R R D  L L L L D  R R R R
 */
const MOVES: ("ArrowRight" | "ArrowLeft" | "ArrowDown")[] = [
  "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowDown",
  "ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowDown",
  "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowDown",
  "ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowDown",
  "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight",
];

test("Trace: keyboard-only completion shows the solved modal", async ({ page }) => {
  await page.goto("/play/trace");

  const board = page.getByRole("application", { name: /Trace grid/i });
  await expect(board).toBeVisible();
  await board.focus();

  for (const key of MOVES) {
    await page.keyboard.press(key);
  }

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/Solved in/i);
});

test("Trace: board fits the viewport and is reachable on mobile widths", async ({ page }) => {
  await page.goto("/play/trace");
  const board = page.getByRole("application", { name: /Trace grid/i });
  await expect(board).toBeVisible();

  const box = await board.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  if (box && viewport) {
    // Board must not overflow the viewport width.
    expect(box.width).toBeLessThanOrEqual(viewport.width);
  }
});
