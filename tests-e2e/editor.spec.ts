import { test, expect } from "@playwright/test";

test("Editor: generate → Play link opens a shared board", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByRole("heading", { name: "Puzzle editor" })).toBeVisible();

  await page.getByRole("button", { name: "Generate" }).click();

  const play = page.getByRole("link", { name: "Play" });
  await expect(play).toBeVisible({ timeout: 15_000 });
  const href = await play.getAttribute("href");
  expect(href).toMatch(/\/play\/trace\?p=/); // default game is Zip

  await play.click();
  await expect(page).toHaveURL(/\/play\/trace\?p=/);
  await expect(page.getByRole("application", { name: /Zip grid/i })).toBeVisible({ timeout: 15_000 });
});

test("Editor: free-form Build mode makes a unique, playable Zip board", async ({ page }) => {
  await page.goto("/editor");
  await page.getByRole("tab", { name: /Build \(Zip\)/i }).click();
  await page.getByRole("button", { name: "4×4" }).click();

  // Fill a 4×4 snake path — every cell numbered forces a single solution.
  const snake = [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12];
  for (const i of snake) {
    await page.locator(`button[aria-label^="Cell ${i}, "]`).click();
  }

  await expect(page.getByText(/Unique solution/i)).toBeVisible();

  const play = page.getByRole("link", { name: "Play" });
  await expect(play).toBeVisible();
  await play.click();
  await expect(page).toHaveURL(/\/play\/trace\?p=/);
  await expect(page.getByRole("application", { name: /Zip grid/i })).toBeVisible({ timeout: 15_000 });
});

test("Editor: import rejects invalid JSON with an error", async ({ page }) => {
  await page.goto("/editor");
  await page.getByPlaceholder('{"game":"path", ...}').fill("{ not valid");
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText(/Not valid JSON/i)).toBeVisible();
});
