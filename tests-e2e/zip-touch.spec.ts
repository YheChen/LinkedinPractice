import { test, expect } from "@playwright/test";

/**
 * Mobile touch-drag regression for Zip. Uses real CDP touch events (which honour
 * touch-action and go through the browser's touch→pointer pipeline). Also seeds a
 * corrupt resume snapshot to confirm touch play isn't stranded by it either.
 */
const PARAM =
  "eyJnYW1lIjoicGF0aCIsIm1ldGEiOnsiaWQiOiJmaXh0dXJlLXRyYWNlLTV4NS1lYXN5IiwiZ2FtZSI6InBhdGgiLCJkaWZmaWN1bHR5IjoiZWFzeSIsInJvd3MiOjUsImNvbHMiOjUsImdlbmVyYXRvclZlcnNpb24iOjAsImZvcm1hdFZlcnNpb24iOjF9LCJjaGVja3BvaW50cyI6eyIwIjoxLCI0IjoyLCI1IjozLCIxNCI6NCwiMTUiOjUsIjI0Ijo2fSwid2FsbHMiOltdfQ";
const SOL = [0, 1, 2, 3, 4, 9, 8, 7, 6, 5, 10, 11, 12, 13, 14, 19, 18, 17, 16, 15, 20, 21, 22, 23, 24];

test("Zip: touch drag draws the line on mobile", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        "gridwright.progress.fixture-trace-5x5-easy",
        JSON.stringify({
          puzzleId: "fixture-trace-5x5-easy",
          player: [22],
          metrics: { elapsedMs: 0, backtracks: 0, hintsUsed: 0, restarts: 0, redraws: 0, mistakes: 0 },
          timer: { accumulatedMs: 0, wasRunning: false },
          updatedAt: 0,
        }),
      );
    } catch {
      /* ignore */
    }
  });

  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });

  await page.goto("/play/trace?p=" + PARAM);
  const board = page.getByRole("application", { name: /Zip grid/i });
  await expect(board).toBeVisible({ timeout: 15000 });
  const status = page.locator('p[aria-live="polite"]');
  await expect(status).toContainText(/covers 1 of/i);

  const bb = (await board.boundingBox())!;
  const cw = bb.width / 5;
  const chh = bb.height / 5;
  const ctr = (i: number) => ({ x: bb.x + ((i % 5) + 0.5) * cw, y: bb.y + (Math.floor(i / 5) + 0.5) * chh });
  const touch = (type: string, i: number | null) =>
    client.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: i === null ? [] : [{ x: ctr(i).x, y: ctr(i).y }],
    });

  await touch("touchStart", SOL[0]!);
  await page.waitForTimeout(30);
  for (let i = 1; i < SOL.length; i++) {
    await touch("touchMove", SOL[i]!);
    await page.waitForTimeout(30);
  }
  await touch("touchEnd", null);

  // Touch must draw the line well past the start (the strand bug kept it at 1).
  const covered = Number((await status.textContent())?.match(/covers (\d+)/)?.[1] ?? "0");
  expect(covered).toBeGreaterThanOrEqual(8);
});
