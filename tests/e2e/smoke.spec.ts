import { type Page, expect, test } from "@playwright/test";

/*
 * Uji asap kerangka berjalan.
 *
 * Yang dibuktikan: browser → Next.js → Drizzle → Postgres → kembali ke browser.
 * Kalau berkas ini hijau, seluruh rantai teknis tersambung, dan sisa proyek
 * tinggal menambah fitur di atas rantai yang sudah terbukti.
 *
 * Kalau merah, JANGAN membangun fitur apa pun di atasnya.
 *
 * Semua tes masuk dulu lewat halaman /login dengan akun E2E_TEST_EMAIL /
 * E2E_TEST_PASSWORD (.env.local, dibuat via Supabase admin API — lihat
 * scripts/create-supabase-users.md). Tanpa kredensial itu suite di-skip,
 * bukan digagalkan.
 */

const email = process.env.E2E_TEST_EMAIL ?? "";
const kataSandi = process.env.E2E_TEST_PASSWORD ?? "";

const uji = email !== "" && kataSandi !== "" ? test : test.skip;

async function masuk(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/kata sandi/i).fill(kataSandi);
  await page.getByRole("button", { name: /^masuk$/i }).click();
  // Sukses = mendarat di daftar job, bukan kembali ke /login.
  await expect(page.getByRole("heading", { name: /daftar job/i })).toBeVisible();
}

uji("halaman utama termuat dan menampilkan data dari database", async ({ page }) => {
  await masuk(page);

  // Job dari seed harus muncul — ini membuktikan database benar-benar terbaca.
  await expect(page.getByText("ISLI-26.08-005")).toBeVisible();
});

uji("angka uang rata kanan dan berformat Indonesia", async ({ page }) => {
  await masuk(page);

  const sel = page.getByTestId("job-selling-ISLI-26.08-005");
  await expect(sel).toBeVisible();

  // 38.000.000 — titik sebagai pemisah ribuan, bukan koma.
  await expect(sel).toHaveText("38.000.000");
});

uji("tidak ada warna di luar design system", async ({ page }) => {
  await masuk(page);

  // Palet bawaan Tailwind dimatikan di tailwind.config.ts, tapi CSS mentah
  // masih bisa menyelinap. Ini jaring pengaman terakhir.
  const html = await page.content();
  expect(html).not.toMatch(/bg-(blue|slate|emerald|amber|rose|indigo)-\d{3}/);
});

uji("terbaca di layar HP", async ({ page }) => {
  // Pak Indra menyetujui dari HP. Kalau ini merah, alur persetujuan tidak
  // bisa dipakai oleh satu-satunya orang yang boleh melakukan approval final.
  await page.setViewportSize({ width: 375, height: 667 });
  await masuk(page);

  // Tidak boleh ada gulir horizontal.
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
});
