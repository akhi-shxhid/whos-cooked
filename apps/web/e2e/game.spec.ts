import { expect, test } from "@playwright/test";

// Plays the whole solo game with a bot that taps the lower stage. Rounds are
// time-bounded, so the game always reaches the result screen.
test("a player can finish the full solo game", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-360", "Runs once, on the primary phone layout.");
  test.setTimeout(180_000);

  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/");
  await page.getByRole("link", { name: "Start game" }).click();
  await page.getByRole("button", { name: "I'm 16 or older" }).click();
  await page.getByRole("button", { name: "Start game" }).click();

  const challenge = page.getByRole("button", { name: "Challenge someone" });
  const seenHeadings = new Set<string>();
  const deadline = Date.now() + 160_000;

  while (Date.now() < deadline && !(await challenge.isVisible())) {
    const heading = page.locator("header span").first();
    if (await heading.isVisible()) seenHeadings.add((await heading.textContent({ timeout: 200 })) ?? "");
    const canvas = page.locator("canvas");
    const box = (await canvas.count()) ? await canvas.boundingBox({ timeout: 200 }).catch(() => null) : null;
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.8);
    await page.waitForTimeout(300);
  }

  await expect(challenge).toBeVisible();
  expect([...seenHeadings]).toEqual(expect.arrayContaining(["Warm-up", "Round 1 of 4", "Round 2 of 4", "Round 3 of 4", "Round 4 of 4"]));
  await expect(page.locator("#score-heading")).toHaveText(/Your Cooked Score is \d{1,3}, (Raw|Golden|Crispy|Burnt|Charcoal)\./);
  await expect(page.getByText("Who's Cooked? is a game for fun.", { exact: false })).toBeVisible();
  await expect(page.getByRole("meter")).toHaveCount(4);
  expect(errors).toEqual([]);

  // Play again skips the warm-up: calibration is reused for the session.
  await page.getByRole("button", { name: "Play again" }).click();
  await expect(page.locator("header span").first()).toHaveText("Round 1 of 4", { timeout: 15_000 });
});

test("the age gate blocks players under 16", async ({ page }) => {
  await page.goto("/play");
  await page.getByRole("button", { name: "I'm under 16" }).click();
  await expect(page.getByRole("heading", { name: "Not yet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start game" })).toHaveCount(0);
});
