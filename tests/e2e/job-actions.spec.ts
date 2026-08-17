// E2E Irisan 10 Item 4: tombol aksi state-machine + badge status baris.
//
// Akun e2e (E2E_TEST_EMAIL) adalah STAFF dan BUKAN maker job seed
// (ISLI-26.08-005 dibuat oleh indra@isli.co.id) — maka sisi yang teruji di
// sini: STAFF non-maker tidak melihat tombol aksi apa pun (izin dijaga
// service Irisan 5; matriks UI hanya menyembunyikan). Alur transisi penuh
// OWNER/MANAGER (submit→L1→final→unlock) sudah dikunci 28 test integrasi di
// tests/integration/*state* — tidak diulang di sini karena tidak ada
// kredensial OWNER yang sah untuk e2e (lihat master-crud.spec.ts).
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

uji("STAFF non-maker tidak melihat tombol aksi di daftar job", async ({ page }) => {
  await login(page);
  await page.goto("/jobs");

  const baris = page.locator("tr", { hasText: "ISLI-26.08-005" });
  await expect(baris).toBeVisible();
  // STAFF bukan maker: tanpa Ajukan/Batalkan/Setujui — kolom Aksi kosong.
  await expect(baris.getByRole("button")).toHaveCount(0);
});

uji("detail job: STAFF tanpa panel aksi; badge PENCADANGAN tampil", async ({ page }) => {
  await login(page);
  await page.goto("/jobs");
  await page.getByRole("link", { name: "ISLI-26.08-005" }).click();

  await expect(page.getByRole("heading", { name: "Job ISLI-26.08-005" })).toBeVisible();
  // STAFF non-maker: panel "Aksi persetujuan" tidak dirender sama sekali.
  await expect(page.getByRole("heading", { name: "Aksi persetujuan" })).toHaveCount(0);
  // Baris seed belum diverifikasi invoice vendor → PENCADANGAN (STATE-MACHINE §4).
  await expect(page.getByText("PENCADANGAN").first()).toBeVisible();
});
