// E2E Irisan 10 Item 8: UI realokasi — alur dasar.
// Akun e2e = STAFF: boleh MENGAJUKAN (job:edit) tapi TIDAK boleh
// menyetujui/menolak (job:reallocate M/O) — sesuai RBAC.
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

uji(
  "halaman realokasi: STAFF melihat form pengajuan + tabel, tanpa tombol Setujui",
  async ({ page }) => {
    await login(page);
    await page.goto("/realokasi");
    await expect(
      page.getByRole("heading", { name: "Realokasi", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ajukan realokasi" })).toBeVisible();
    await expect(page.getByTestId("tabel-realokasi")).toBeVisible();
    // STAFF tidak memegang job:reallocate → tombol Setujui tidak pernah dirender.
    await expect(page.locator('[data-testid^="setujui-"]')).toHaveCount(0);
  },
);
