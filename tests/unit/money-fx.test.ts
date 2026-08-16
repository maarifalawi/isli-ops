/*
 * UNIT TEST — konversi kurs USD→IDR (Irisan 4c).
 *
 * Ditulis SEBELUM implementasi (TDD, .clinerules/02-workflow.md).
 *
 * Aturan yang diuji: DOMAIN-RULES R8.1 (kurs per job) & R8.2 (konversi).
 * R8.2 berbunyi persis: `amount_idr = round(amount_usd * fx_rate)` — ROUND,
 * BUKAN ceiling. Ini BEDA dari pembulatan pajak R3.6/Q05 (ceiling via
 * applyRateBp). Karena itu konversi kurs WAJIB fungsi terpisah dan TIDAK
 * boleh memakai applyRateBp.
 *
 * Konvensi penyimpanan (dikonfirmasi src/lib/job/index.ts):
 *   - sellingUsd / pencadanganUsd / actualUsd = USD UTUH (integer, bukan sen).
 *   - kursX100 = kurs dikali 100 (integer). 18.200 → 1_820_000.
 * Maka: idr_exact = usd * kursX100 / 100  (bisa berpecahan → dibulatkan).
 *
 * Angka rujukan dari .clinerules/03-money-and-tax.md:
 *   USD 510 × 18.300 = 9.333.000
 *   USD 510 × 18.200 = 9.282.000
 */

import { describe, expect, it } from "vitest";
import { konversiUsdKeIdr } from "../../src/lib/money/index";

describe("konversiUsdKeIdr()", () => {
  it("USD 510 × kurs 18.300 = 9.333.000 (nilai nyata dokumen)", () => {
    expect(konversiUsdKeIdr(510n, 1_830_000n)).toBe(9_333_000n);
  });

  it("USD 510 × kurs 18.200 = 9.282.000 (nilai nyata dokumen)", () => {
    expect(konversiUsdKeIdr(510n, 1_820_000n)).toBe(9_282_000n);
  });

  it("nol USD → nol IDR", () => {
    expect(konversiUsdKeIdr(0n, 1_820_000n)).toBe(0n);
  });

  it("satu USD × kurs bulat = kurs itu sendiri", () => {
    expect(konversiUsdKeIdr(1n, 1_820_000n)).toBe(18_200n);
  });

  /*
   * KASUS PEMBULATAN — pembuktian ROUND, bukan CEILING.
   *
   * kursX100 = 1_820_030 berarti kurs 18.200,30. Untuk 1 USD nilai eksaknya
   * 18.200,30 → pecahan 0,30 < 0,5.
   *   ROUND (half-up)  → 18.200   ← yang benar (R8.2)
   *   CEILING          → 18.201   ← SALAH; kalau ini yang keluar, kode masih
   *                                 memakai applyRateBp/ceiling.
   */
  it("membulatkan KE BAWAH saat pecahan < 0,5 (bukan ceiling)", () => {
    expect(konversiUsdKeIdr(1n, 1_820_030n)).toBe(18_200n);
  });

  /* Tepat 0,5 → half away from zero → naik. */
  it("membulatkan NAIK saat pecahan tepat 0,5", () => {
    expect(konversiUsdKeIdr(1n, 1_820_050n)).toBe(18_201n);
  });

  /* Pecahan > 0,5 → naik (sama seperti ceiling di kasus ini, tapi via round). */
  it("membulatkan NAIK saat pecahan > 0,5", () => {
    expect(konversiUsdKeIdr(1n, 1_820_080n)).toBe(18_201n);
  });

  it("nilai besar tetap presisi (bigint, tanpa kehilangan digit)", () => {
    // 1.000.000 USD × 18.250,00 = 18.250.000.000
    expect(konversiUsdKeIdr(1_000_000n, 1_825_000n)).toBe(18_250_000_000n);
  });

  it("menolak kurs nol", () => {
    expect(() => konversiUsdKeIdr(510n, 0n)).toThrow(RangeError);
  });

  it("menolak kurs negatif", () => {
    expect(() => konversiUsdKeIdr(510n, -1_820_000n)).toThrow(RangeError);
  });

  it("menolak USD negatif (input tidak valid, bukan diam-diam)", () => {
    expect(() => konversiUsdKeIdr(-1n, 1_820_000n)).toThrow(RangeError);
  });
});
