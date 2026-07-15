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
  await page.getByRole("button", { name: "5×5" }).click();

  // Fill a 5×5 snake path — every cell numbered forces a single solution.
  const snake = [0, 1, 2, 3, 4, 9, 8, 7, 6, 5, 10, 11, 12, 13, 14, 19, 18, 17, 16, 15, 20, 21, 22, 23, 24];
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
