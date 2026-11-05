import { expect, test } from "@playwright/test";

test("landing page shows the brand and the toast", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Who's Cooked\?/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Who's Cooked?");
  await expect(page.getByRole("img", { name: /toast/i })).toBeVisible();
  await expect(page.getByText("Who's Cooked? is a game for fun.", { exact: false })).toBeVisible();
});

test("landing page has no horizontal scroll at 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("landing page ships no JavaScript", async ({ page }) => {
  const scripts: string[] = [];
  page.on("request", (req) => {
    if (req.resourceType() === "script") scripts.push(req.url());
  });
  await page.goto("/");
  expect(scripts).toEqual([]);
});
