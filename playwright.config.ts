import { defineConfig, devices } from "@playwright/test";

/**
 * E2E + mobile-interaction matrix. Representative viewports from the brief are
 * encoded as projects so `pnpm test:e2e --project="iPhone 12"` etc. work.
 */
export default defineConfig({
  testDir: "./tests-e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "firefox-desktop", use: { ...devices["Desktop Firefox"], viewport: { width: 1366, height: 768 } } },
    { name: "iphone-se", use: { ...devices["iPhone SE"] } }, // 375x667
    { name: "iphone-12", use: { ...devices["iPhone 12"] } }, // 390x844
    { name: "iphone-14-pro-max", use: { ...devices["iPhone 14 Pro Max"] } }, // 430x932
    { name: "pixel-5", use: { ...devices["Pixel 5"] } },
    { name: "ipad", use: { ...devices["iPad (gen 7)"] } },
    { name: "small-320", use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true } },
  ],
});
