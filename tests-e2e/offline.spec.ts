import { test, expect } from "@playwright/test";

/**
 * PWA offline: after a first online visit registers + activates the service
 * worker, the app must still load and play with the network cut. Puzzles are
 * generated in-browser, so a cached shell is enough to keep playing.
 */
test("app shell loads and Trace is playable offline", async ({ page, context }) => {
  await page.goto("/");
  // Wait for the service worker to control the page.
  await page.waitForFunction(async () => {
    if (!("serviceWorker" in navigator)) return false;
    await navigator.serviceWorker.ready;
    return !!navigator.serviceWorker.controller;
  }, null, { timeout: 20_000 });

  // Warm the play route cache while still online.
  await page.goto("/play/trace");
  await expect(page.getByRole("application", { name: /Trace grid/i })).toBeVisible({ timeout: 15_000 });

  // Cut the network and reload — should still work from cache + client generation.
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("application", { name: /Trace grid/i })).toBeVisible({ timeout: 15_000 });

  await context.setOffline(false);
});
