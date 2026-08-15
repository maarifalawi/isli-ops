// E2E §10.5: data master — slice 0.2 (status final Sesi D).
//
// Keputusan Sesi D berbasis bukti (scripts/_tmp-check-auth-users.mjs):
// - Hanya e2e@isli.co.id yang punya kredensial Supabase Auth valid
//   (login 200); perannya di tabel users terverifikasi STAFF.
// - indra/lana/fairol/niken semua 400 "Invalid login credentials" dengan
//   E2E_TEST_PASSWORD — tidak ada password OWNER yang diketahui.
// Maka (Opsi B):
// - blok STAFF read-only dijalankan dengan e2e@isli.co.id (representasi
//   STAFF yang terverifikasi);
// - blok CRUD OWNER TIDAK dijalankan di e2e karena tidak ada kredensial
//   OWNER yang valid (menebak password dilarang). Cakupan CRUD + RBAC
//   OWNER/MANAGER dijaga di tests/integration/master-data.integration.test.ts.
// Tindak lanjut: buat akun Auth OWNER khusus e2e bila CRUD e2e dibutuhkan.
import { type Page, expect, test } from "@playwright/test";

const email = process.env.E2E_TEST_EMAIL ?? "";
const password = process.env.E2E_TEST_PASSWORD ?? "";

// Login via UI sama seperti manusia: isi form, klik Masuk.
async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL("/");
}

test("STAFF melihat data master read-only tanpa tombol tambah", async ({ page }) => {
  await login(page);
  await page.goto("/master");
  // Sesuai snapshot Playwright halaman /master (diambil dari kegagalan run
  // sebelumnya): heading "Master Data", lima tautan entitas, tanpa Tambah.
  await expect(page.getByRole("heading", { name: "Master Data" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tambah" })).toHaveCount(0);
  await expect(page.locator('a[href="/master/customers"]')).toBeVisible();
  await expect(page.locator('a[href="/master/vendors"]')).toBeVisible();
});
