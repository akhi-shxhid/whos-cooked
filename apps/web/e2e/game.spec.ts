import { expect, test, type Page } from "@playwright/test";

/** Taps around the stage until the game-over screen shows. Runs always end (lives, clock, or Chill's cap). */
async function playUntilOver(page: Page, maxMs = 160_000) {
  const again = page.getByRole("button", { name: /^(Play again|Rematch|Play Classic)$/ });
  const spots = [0.5, 0.25, 0.75, 0.6, 0.35, 0.8];
  const deadline = Date.now() + maxMs;
  let i = 0;
  while (Date.now() < deadline && !(await again.isVisible())) {
    const box = await page.locator("canvas").boundingBox({ timeout: 300 }).catch(() => null);
    if (box) await page.mouse.click(box.x + box.width * spots[i % spots.length]!, box.y + box.height * spots[(i + 2) % spots.length]!);
    i++;
    await page.waitForTimeout(200);
  }
  await expect(again).toBeVisible();
}

const noOverflow = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

test.describe("on a phone", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "mobile-360", "Runs on the primary phone layout.");
  });

  // Regression guard only: parallel test browsers share one CPU, so timing is noisy.
  test("Play starts a run quickly, with no gate or tutorial", async ({ page }) => {
    const t0 = Date.now();
    await page.goto("/play/");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 4000 });
    await expect(page.getByText("cleared", { exact: true })).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(4000);
  });

  test("a Classic run ends with rank, XP, sharing, and the shop", async ({ page }) => {
    test.setTimeout(200_000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("/");
    await page.getByRole("link", { name: "Play now" }).click();
    await playUntilOver(page);
    await expect(page.locator("#score-heading")).toHaveText(/\d+ cleared\. Rank: (Locked In|Goated|Mid|Cooked|Fully Cooked)\./);
    await expect(page.getByRole("heading", { name: /^\+\d+ XP$/ })).toBeVisible();
    for (const name of ["Duel a friend", "Share", "Save card"]) await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "See the shop" })).toBeVisible();
    await expect(page.getByText("Who's Cooked? is a game for fun.", { exact: false })).toBeVisible();
    await noOverflow(page);
    expect(errors).toEqual([]);
    await page.getByRole("button", { name: "Play again" }).click();
    await expect(page.locator("canvas")).toBeVisible({ timeout: 6000 });
  });

  test("Blitz shows a clock and points; Daily and Duel show their chips", async ({ page }) => {
    await page.goto("/play/?mode=blitz");
    await expect(page.getByRole("timer")).toHaveText(/^\d+s$/);
    await expect(page.getByText("points", { exact: true })).toBeVisible();
    await page.goto("/play/?mode=daily");
    await expect(page.getByText(/^Daily #\d+$/)).toBeVisible();
    await page.goto("/play/?c=abcd2345&t=5&g=10110");
    await expect(page.getByText("Beat 5", { exact: true })).toBeVisible();
    await expect(page.getByText(/^Ghost \d+$/)).toBeVisible();
  });

  test("the hub lists modes and missions, and a tile starts that mode", async ({ page }) => {
    await page.goto("/play/?hub=1");
    await expect(page.getByRole("heading", { name: "Today's missions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pick your poison" })).toBeVisible();
    await noOverflow(page);
    await page.getByRole("button", { name: /^One Life/ }).click();
    await expect(page.locator("canvas")).toBeVisible({ timeout: 6000 });
    await expect(page.getByText("One Life", { exact: true })).toBeVisible();
  });

  test("the crew shows how to unlock each character", async ({ page }) => {
    await page.goto("/play/?hub=1");
    await page.getByRole("button", { name: "Crew", exact: true }).click();
    await expect(page.getByRole("heading", { name: "The Crew" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^NPC\. Locked: Level 2$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Moai\. Locked: Chaos Crew$/ })).toBeVisible();
  });

  test("the HUD fits a 320 px screen in every mode", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    for (const q of ["", "?mode=blitz", "?c=abcd2345&t=12&g=1011"]) {
      await page.goto(`/play/${q}`);
      await expect(page.locator("canvas")).toBeVisible({ timeout: 6000 });
      await noOverflow(page);
    }
  });
});

test.describe("shop age rules", () => {
  const openShop = async (page: Page) => {
    await page.goto("/play/?hub=1");
    await page.getByRole("button", { name: "Shop", exact: true }).click();
    await page.getByRole("button", { name: /^Buy for/ }).first().click();
  };

  test("under-13s can't buy and are told what stays free", async ({ page }) => {
    await openShop(page);
    await page.getByLabel("Birth year").selectOption(String(new Date().getUTCFullYear() - 10));
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Not available under 13" })).toBeVisible();
  });

  test("13 to 17s are sent to a parent or guardian", async ({ page }) => {
    await openShop(page);
    await page.getByLabel("Birth year").selectOption(String(new Date().getUTCFullYear() - 16));
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Ask a parent or guardian" })).toBeVisible();
  });

  test("the birth year starts empty", async ({ page }) => {
    await openShop(page);
    await expect(page.getByLabel("Birth year")).toHaveValue("");
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  test("both products show real-money prices, no coins", async ({ page }) => {
    await page.goto("/play/?hub=1");
    await page.getByRole("button", { name: "Shop", exact: true }).click();
    await expect(page.getByText(/Cooked\+\s*[$€£]\d/)).toBeVisible();
    await expect(page.getByText(/Chaos Crew\s*[$€£]\d/)).toBeVisible();
    await expect(page.getByText(/no coins, no random boxes/i)).toBeVisible();
  });
});
