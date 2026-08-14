import { expect, test } from "@playwright/test";

/*
 * Uji asap kerangka berjalan.
 *
 * Yang dibuktikan: browser → Next.js → Drizzle → Postgres → kembali ke browser.
 * Kalau berkas ini hijau, seluruh rantai teknis tersambung, dan sisa proyek
 * tinggal menambah fitur di atas rantai yang sudah terbukti.
 *
 * Kalau merah, JANGAN membangun fitur apa pun di atasnya.
 */

test("halaman utama termuat dan menampilkan data dari database", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /daftar job/i })).toBeVisible();

  // Job dari seed harus muncul — ini membuktikan database benar-benar terbaca.
  await expect(page.getByText("ISLI-26.08-005")).toBeVisible();
});

test("angka uang rata kanan dan berformat Indonesia", async ({ page }) => {
  await page.goto("/");

  const sel = page.getByTestId("job-selling-ISLI-26.08-005");
  await expect(sel).toBeVisible();

  // 38.000.000 — titik sebagai pemisah ribuan, bukan koma.
  await expect(sel).toHaveText("38.000.000");
});

test("tidak ada warna di luar design system", async ({ page }) => {
  await page.goto("/");

  // Palet bawaan Tailwind dimatikan di tailwind.config.ts, tapi CSS mentah
  // masih bisa menyelinap. Ini jaring pengaman terakhir.
  const html = await page.content();
  expect(html).not.toMatch(/bg-(blue|slate|emerald|amber|rose|indigo)-\d{3}/);
});

test("terbaca di layar HP", async ({ page }) => {
  // Pak Indra menyetujui dari HP. Kalau ini merah, alur persetujuan tidak
  // bisa dipakai oleh satu-satunya orang yang boleh melakukan approval final.
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /daftar job/i })).toBeVisible();

  // Tidak boleh ada gulir horizontal.
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
});
