// E2E Item 9: unduh PDF — response application/pdf & isi > 0.
import { type Page, expect, test } from "@playwright/test";

const email = process.env.E2E_TEST_EMAIL ?? "";
const password = process.env.E2E_TEST_PASSWORD ?? "";
const uji = email !== "" && password !== "" ? test : test.skip;

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });
}

uji("PDF invoice terbit dapat diunduh (application/pdf, isi > 0)", async ({ page }) => {
  await login(page);
  await page.goto("/invoice");
  // Cari link Cetak PDF pertama (invoice seed TERBIT di fixture).
  const tautan = page.locator('a[href$="/pdf"]').first();
  await expect(tautan).toBeVisible();
  const url = await tautan.getAttribute("href");
  const res = await page.request.get(url ?? "/invoice");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/pdf");
  const isi = await res.body();
  expect(isi.length).toBeGreaterThan(1000);
  expect(isi.subarray(0, 5).toString()).toBe("%PDF-");
});
