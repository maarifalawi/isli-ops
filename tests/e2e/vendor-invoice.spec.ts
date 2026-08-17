// E2E Irisan 10 Item 5: hard requirement V-INV-2 & V-INV-3 sebagai skenario
// eksplisit. Akun e2e = STAFF: bisa MENERIMA invoice (D2) tapi tidak bisa
// verifikasi/bayar (D3/mark_paid) — sesuai RBAC. Skenario bayar penuh O/M
// tetap dikunci 30 test integrasi Irisan 7.
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
  "V-INV-2: peringatan nomor mirip tampil SEBELUM submit saat mengetik",
  async ({ page }) => {
    // ── test.fixme: HANYA project mobile ──────────────────────────────────
    // Keputusan user Opsi H, 17 Agu 2026. BUKAN bug kode — ini masalah
    // infrastruktur test (mobile-setelah-desktop dalam satu proses run
    // Playwright yang sama). Matriks percobaan lengkap:
    //
    // | Percobaan                                        | V-INV-2 mobile |
    // |--------------------------------------------------|----------------|
    // | Run paralel awal (timeout 5s, router.refresh)     | MERAH          |
    // | + timeout assert 15s                              | MERAH          |
    // | + workers=1 + serial + retry + status-gagal (A2)  | MERAH          |
    // | + router.replace query-param (D)                  | MERAH          |
    // | Mobile STANDALONE (--project=mobile)              | HIJAU          |
    // | Desktop (SEMUA kondisi)                           | HIJAU selalu   |
    //
    // Gejala terkunci: saat mobile berjalan SETELAH desktop dalam satu run,
    // server action debounce (actionCekNomorMirip) tidak resolve DAN tidak
    // throw (indikator cek-nomor-gagal juga tidak muncul) dalam 15 detik —
    // padahal input terisi dan logika terbukti benar di mobile standalone.
    // Bukan paralelisme (workers=1 sudah dicoba), bukan race RSC-refresh
    // (router.replace sudah), bukan silent-catch (sudah visible kalau gagal).
    //
    // Dibuka kembali saat: upgrade Playwright/Next.js (kemungkinan fix
    // isolasi konteks), atau sesi debug khusus dengan server log Next
    // (alihkan stdout `next start` ke file saat e2e jalan) untuk menjawab:
    // "apakah POST server action dari worker mobile sampai ke server?"
    //
    // Coverage yang TETAP menjaga V-INV-2 selama ini fixme:
    // - skenario yang sama di DESKTOP (hijau, di bawah);
    // - 7 unit test gating (tests/unit/vendor-invoice-gating.test.ts);
    // - arsitektur: peringatan dirender dari hasil server action yang query
    //   database langsung — tidak ada jalur "lolos tanpa cek".
    test.fixme(
      test.info().project.name === "mobile",
      "V-INV-2 mobile: server action menggantung hanya saat mobile-setelah-desktop dalam satu run Playwright (lihat matriks di atas) — infrastruktur test, bukan bug kode.",
    );

    await login(page);
    await page.goto("/invoice-vendor");
    await expect(page.getByRole("heading", { name: "Invoice Vendor" })).toBeVisible();

    // Pilih vendor ICON (ada di seed) lalu tampilkan.
    await page.getByLabel(/vendor/i).selectOption({ label: "ICON" });
    await page.getByRole("button", { name: "Tampilkan" }).click();

    // Terima invoice bernomor 0100 sebagai pemancing kemiripan (STAFF boleh receive).
    // Worker desktop & mobile jalan PARALEL dengan Date.now() hampir sama —
    // tanpa workerIndex keduanya membuat nomor identik dan yang kedua kena
    // uq_vendor_inv (constraint unik Irisan 7 — memang fitur, bukan bug).
    const nomorPemancing = `MIRIP-${Date.now()}-${test.info().workerIndex}`;
    await page.getByLabel(/nomor invoice/i).fill(nomorPemancing);
    await page.getByLabel(/tanggal invoice/i).fill("2026-08-01");
    await page.getByLabel(/jumlah/i).fill("1500000");
    await page.getByRole("button", { name: "Simpan" }).click();
    // Bukti aksi sukses: field nomor dikosongkan handler (hanya terjadi saat
    // res.ok). Persistensi ke database dibuktikan TIDAK lewat router.refresh
    // (yang berlomba dengan tabel) tapi oleh peringatan mirip di bawah —
    // actionCekNomorMirip membaca database langsung; kalau baris belum
    // tersimpan, nomor pemancing tidak akan pernah muncul di peringatan.
    await expect(page.getByLabel(/nomor invoice/i)).toHaveValue("");

    // Ketik nomor yang mirip (jarak Levenshtein 1) — JANGA submit.
    const miripSatuKarakter = `${nomorPemancing}X`;
    await page.getByLabel(/nomor invoice/i).fill(miripSatuKarakter);
    // Peringatan muncul debounced (400ms) SEBELUM tombol Simpan ditekan.
    // Timeout 15s (bukan default 5s): saat spec ini berjalan PARALEL dengan
    // worker desktop, debounce + aksi server + render bisa melebihi 5s di
    // mesin yang sama — terkonfirmasi via run mobile standalone yang hijau.
    // Ini BUKAN pelonggaran V-INV-2: peringatan tetap wajib muncul sebelum
    // submit berikutnya; hanya jendela tunggu assert yang realistis.
    await expect(page.getByTestId("peringatan-nomor-mirip")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("peringatan-nomor-mirip")).toContainText(
      nomorPemancing,
    );
  },
);

uji("V-INV-3: STAFF tidak melihat tombol Bayar walau status dimuat", async ({ page }) => {
  await login(page);
  await page.goto("/invoice-vendor");
  await page.getByLabel(/vendor/i).selectOption({ label: "ICON" });
  await page.getByRole("button", { name: "Tampilkan" }).click();

  // Baris invoice hasil skenario sebelumnya ada di vendor ICON.
  const lihatStatus = page.locator('[data-testid^="lihat-status-"]').first();
  if (await lihatStatus.count()) {
    await lihatStatus.click();
    await expect(page.locator('[data-testid^="snapshot-status-"]').first()).toBeVisible();
  }
  // STAFF tidak punya vendor_invoice:mark_paid → tombol Bayar tidak pernah dirender.
  await expect(page.locator('[data-testid^="bayar-"]')).toHaveCount(0);
  // Verifikasi juga bukan milik STAFF (D3).
  await expect(page.getByRole("button", { name: "Verifikasi" })).toHaveCount(0);
});
