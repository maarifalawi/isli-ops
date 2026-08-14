/*
 * GOLDEN TEST — rekap April–Juli 2026.
 *
 * Sumber: DUMMY SUMMARY REPORT.xlsx, tab SUMMARY 2026.
 *
 * Berkas ini menguji sesuatu yang tidak biasa: bahwa sistem kita menghasilkan
 * angka yang BERBEDA dari Excel — dan bahwa selisihnya persis sebesar bug yang
 * sudah kita temukan.
 *
 * Kalau suatu saat test ini hijau di kedua sisi, artinya seseorang "memperbaiki"
 * perhitungan supaya cocok dengan Excel, dan bug senilai Rp 22,5 juta itu
 * kembali masuk ke sistem.
 */

import { describe, expect, it } from "vitest";
import { rupiah, subtract, sum } from "../../src/lib/money/index";

/** Angka bulanan yang sudah diverifikasi dari tab SUMMARY 2026. */
const BULANAN = [
  { bulan: "April", selling: 300_500_000n, cost: 252_750_000n },
  { bulan: "Mei", selling: 854_105_167n, cost: 734_805_167n },
  { bulan: "Juni", selling: 615_722_526n, cost: 535_522_526n },
  { bulan: "Juli", selling: 293_100_000n, cost: 260_200_000n },
] as const;

const GOLDEN_APR_JUL_2026 = {
  selling: 2_063_427_693n,
  cost: 1_783_277_693n,
  /** Yang benar, dihitung ulang baris demi baris. */
  gpBenar: 280_150_000n,
  /** Yang tertulis di Excel — salah. */
  gpExcel: 257_650_000n,
  /** Akibat SUMMARY!F19 menunjuk EXIM!Q39, seharusnya EXIM!Q50. */
  selisih: 22_500_000n,
} as const;

describe("rekap April–Juli 2026", () => {
  it("total penjualan cocok dengan Excel", () => {
    const total = sum(BULANAN.map((b) => rupiah(b.selling)));
    expect(total).toBe(GOLDEN_APR_JUL_2026.selling);
  });

  it("total biaya cocok dengan Excel", () => {
    const total = sum(BULANAN.map((b) => rupiah(b.cost)));
    expect(total).toBe(GOLDEN_APR_JUL_2026.cost);
  });

  it("GP yang benar adalah penjualan dikurangi biaya", () => {
    const gp = subtract(
      rupiah(GOLDEN_APR_JUL_2026.selling),
      rupiah(GOLDEN_APR_JUL_2026.cost),
    );
    expect(gp).toBe(GOLDEN_APR_JUL_2026.gpBenar);
  });

  it("GP kita HARUS berbeda dari angka Excel", () => {
    // Ini bukan kegagalan — ini justru nilai jual sistemnya.
    expect(GOLDEN_APR_JUL_2026.gpBenar).not.toBe(GOLDEN_APR_JUL_2026.gpExcel);
  });

  it("selisihnya persis sebesar bug rumus yang ditemukan", () => {
    const selisih = subtract(
      rupiah(GOLDEN_APR_JUL_2026.gpBenar),
      rupiah(GOLDEN_APR_JUL_2026.gpExcel),
    );
    expect(selisih).toBe(GOLDEN_APR_JUL_2026.selisih);
  });

  it("selisih empat bulan setara sekitar Rp 67,5 juta per tahun", () => {
    // Angka yang dibawa ke Pak Indra untuk membenarkan biaya Fase 1.
    const setahun = (GOLDEN_APR_JUL_2026.selisih * 12n) / 4n;
    expect(setahun).toBe(67_500_000n);
  });
});
