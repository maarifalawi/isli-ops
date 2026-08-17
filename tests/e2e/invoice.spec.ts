// E2E Irisan 10 Item 6: UI invoice customer — alur dasar.
// Akun e2e = STAFF: boleh BUAT draft (invoice:create) tapi TIDAK boleh
// terbitkan/kirim/batalkan (invoice:issue / invoice:void) — sesuai RBAC.
// Alur penuh O/M terkunci test integrasi Irisan 6.
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
  "halaman invoice terbuka; STAFF melihat form draft, tanpa tombol terbit",
  async ({ page }) => {
    await login(page);
    await page.goto("/invoice");
    await expect(
      page.getByRole("heading", { name: "Invoice", exact: true }),
    ).toBeVisible();
    // STAFF boleh membuat draft (invoice:create).
    await expect(
      page.getByRole("heading", { name: "Buat draft invoice", exact: true }),
    ).toBeVisible();
    // Dropdown hanya memuat job FINAL — job seed (DRAFT) tidak tersedia.
    const opsi = page.getByRole("combobox", { name: /job final/i }).locator("option");
    await expect(opsi.filter({ hasText: "ISLI-26.08-005" })).toHaveCount(0);
  },
);

/*
 * CATATAN PENGHAPUSAN (keputusan user K1, 17 Agu 2026):
 * Skenario guard R9.4 (injeksi option DOM + submit) dihapus karena
 * mengandalkan DOM injection sebelum React hydration — anti-pattern
 * Playwright×React yang non-deterministik (di mobile, hydration selesai
 * SETELAH injeksi; React merekonsiliasi DOM dan menghapus option suntikan,
 * submit diblokir validasi `required`, server action tak pernah terpanggil).
 * Guard R9.4 tetap terkunci di 3 lapis: unit test service-level
 * (createDraftInvoice UUID invalid → gagal — tests/unit/invoice-gating.test.ts,
 * J1), 30 test integrasi Irisan 6, dan form UI hanya menawarkan job FINAL.
 */
