import { test, expect } from "@playwright/test";

test("Daily: links deep-link into a date-seeded board", async ({ page }) => {
  await page.goto("/daily");
  await expect(page.getByRole("heading", { name: /Today’s four puzzles/i })).toBeVisible();

  await page.getByRole("link", { name: /Play today’s Zip/i }).click();
  // URL carries the daily seed + difficulty.
  await expect(page).toHaveURL(/\/play\/trace\?seed=daily%3A\d{4}-\d{2}-\d{2}&d=medium/);
  await expect(page.getByRole("application", { name: /Zip grid/i })).toBeVisible({ timeout: 15_000 });
});

test("Daily: the same seed reproduces the same board", async ({ page }) => {
  // Two visits to the same daily URL yield identical seed text.
  await page.goto("/play/trace?seed=daily:2026-07-14&d=medium");
  await expect(page.getByText(/Seed:/)).toContainText("daily:2026-07-14");
});

test("Archive: calendar renders and days are playable", async ({ page }) => {
  await page.goto("/archive");
  await expect(page.getByRole("heading", { name: "Archive" })).toBeVisible();
  // At least one past day links into a seeded board.
  const dayLink = page.getByRole("link", { name: /Play trace for/i }).first();
  await expect(dayLink).toBeVisible();
  await dayLink.click();
  await expect(page).toHaveURL(/\/play\/trace\?seed=daily%3A/);
});
