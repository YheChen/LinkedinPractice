import { test, expect } from "@playwright/test";

test("Editor: generate → Play link opens a shared board", async ({ page }) => {
  await page.goto("/editor");
  await expect(page.getByRole("heading", { name: "Puzzle editor" })).toBeVisible();

  await page.getByRole("button", { name: "Generate" }).click();

  const play = page.getByRole("link", { name: "Play" });
  await expect(play).toBeVisible({ timeout: 15_000 });
  const href = await play.getAttribute("href");
  expect(href).toMatch(/\/play\/trace\?p=/); // default game is Trace

  await play.click();
  await expect(page).toHaveURL(/\/play\/trace\?p=/);
  await expect(page.getByRole("application", { name: /Trace grid/i })).toBeVisible({ timeout: 15_000 });
});

test("Editor: import rejects invalid JSON with an error", async ({ page }) => {
  await page.goto("/editor");
  await page.getByPlaceholder('{"game":"path", ...}').fill("{ not valid");
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText(/Not valid JSON/i)).toBeVisible();
});
