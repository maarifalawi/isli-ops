import { expect, test } from "@playwright/test";

test("pengunjung tanpa sesi diarahkan ke login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});
