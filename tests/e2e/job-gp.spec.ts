// E2E Irisan 10 Item 7: kartu GP/GP%/NETT tampil di halaman detail job.
// Job seed ISLI-26.08-005 punya baris aktif → GP bukan "—" kosong.
import { type Page, expect, test } from "@playwright/test";

const email = process.env.E2E_TEST_EMAIL ?? "";
const password = process.env.E2E_TEST_PASSWORD ?? "";

const uji = email !== "" && password !== "" ? test : test.skip;

async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL("/");
}

uji("kartu GP/NETT tampil di detail job dengan baris aktif", async ({ page }) => {
  await login(page);
  await page.goto("/jobs");
  await page.getByRole("link", { name: "ISLI-26.08-005" }).click();
  const kartu = page.getByTestId("kartu-gp");
  await expect(kartu).toBeVisible();
  await expect(page.getByTestId("gp-rupiah")).not.toHaveText("—"); // ada baris → GP terisi
  await expect(page.getByTestId("gp-persen")).toBeVisible();
  await expect(page.getByTestId("nett-rupiah")).toBeVisible(); // mungkin "—" (menunggu invoice)
});
