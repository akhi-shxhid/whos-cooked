import { expect, test } from "@playwright/test";

test("landing page shows the brand, the pitch, Play, and the modes", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Who's Cooked\?/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/WHO'S\s*COOKED\?/);
  await expect(page.getByRole("link", { name: "Play now" })).toBeVisible();
  for (const m of ["Blitz", "One Life", "Daily", "Chill"]) await expect(page.getByRole("link", { name: new RegExp(`^${m}`) })).toBeVisible();
  await expect(page.getByText("Who's Cooked? is a game for fun.", { exact: false })).toBeVisible();
});

test("landing page has no horizontal scroll at 320 and 360 px", async ({ page }) => {
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 780 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test("landing page runs no JavaScript (prefetch only downloads)", async ({ page }) => {
  await page.goto("/");
  expect(await page.locator("script[src], script[type=module]").count()).toBe(0);
});
