import { test, expect } from "@playwright/test";

/**
 * Regression for the reported "can't draw on Zip (PC)" bug. Root cause: the resume
 * feature restored a stale/mismatched snapshot that stranded the path head, so the
 * board couldn't be played from the start. We seed exactly such a corrupt snapshot
 * for this puzzle id and require that the board is NOT stranded — it starts fresh
 * at cell 1 and is fully solvable. (The restore-rejection logic itself is unit
 * tested in src/engine/session/resume.test.ts.)
 */
const PARAM =
  "eyJnYW1lIjoicGF0aCIsIm1ldGEiOnsiaWQiOiJmaXh0dXJlLXRyYWNlLTV4NS1lYXN5IiwiZ2FtZSI6InBhdGgiLCJkaWZmaWN1bHR5IjoiZWFzeSIsInJvd3MiOjUsImNvbHMiOjUsImdlbmVyYXRvclZlcnNpb24iOjAsImZvcm1hdFZlcnNpb24iOjF9LCJjaGVja3BvaW50cyI6eyIwIjoxLCI0IjoyLCI1IjozLCIxNCI6NCwiMTUiOjUsIjI0Ijo2fSwid2FsbHMiOltdfQ";

test("Zip: a corrupt resume snapshot does not strand the board — it still solves", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        "gridwright.progress.fixture-trace-5x5-easy",
        JSON.stringify({
          puzzleId: "fixture-trace-5x5-easy",
          player: [22], // not a valid path for this puzzle (start is cell 0)
          metrics: { elapsedMs: 0, backtracks: 0, hintsUsed: 0, restarts: 0, redraws: 0, mistakes: 0 },
          timer: { accumulatedMs: 0, wasRunning: false },
          updatedAt: 0,
        }),
      );
    } catch {
      /* ignore */
    }
  });

  await page.goto("/play/trace?p=" + PARAM);
  await expect(page.getByRole("application", { name: /Zip grid/i })).toBeVisible({ timeout: 15000 });

  // The corrupt snapshot is rejected, so the board is solvable from the start.
  const hint = page.getByRole("button", { name: /Hint/i });
  const dialog = page.getByRole("dialog");
  for (let i = 0; i < 30; i++) {
    if (await dialog.isVisible().catch(() => false)) break;
    await hint.click();
  }
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/Solved in/i);
});
