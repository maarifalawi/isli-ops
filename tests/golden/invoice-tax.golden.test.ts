/*
 * GOLDEN TEST — pajak invoice.
 *
 * Angka di berkas ini disalin dari invoice ASLI ISLI yang sudah dikirim ke
 * customer. Angka-angka ini BUKAN milik kita.
 *
 * DILARANG KERAS:
 *   ✗ toBeCloseTo
 *   ✗ toleransi epsilon
 *   ✗ it.skip / it.todo / it.only
 *   ✗ mengubah nilai harapan supaya hijau
 *
 * Test merah artinya KODE kita salah, atau ada aturan bisnis yang belum kita
 * pahami. Dua-duanya harus diselesaikan dengan bertanya ke klien, bukan dengan
 * melonggarkan test.
 */

import { describe, expect, it } from "vitest";
import { rupiah } from "../../src/lib/money/index";
import { computeInvoiceTax } from "../../src/lib/tax/index";

describe("INVOICE MATEREE 06-012 (domestik, tanpa PPh 23)", () => {
  // Sumber: INVOICE MATEREE 06-012_domestik.docx
  // Nomor: 017-INVDOM/ISLI-26.06-012/VII/2026
  // Customer: PT MATEREE NUSANTARA UTAMA · NPWP 634484505071000
  const hasil = computeInvoiceTax({
    subTotal: rupiah(23_600_000n),
    reimburse: rupiah(1_000_000n),
    pph23Applicable: false,
  });

  it("DPP mengecualikan baris reimburse", () => {
    expect(hasil.dpp).toBe(22_600_000n);
  });

  it("PPN 1,1% dihitung dari DPP, bukan dari sub total", () => {
    expect(hasil.ppn).toBe(248_600n);
  });

  it("PPh 23 nol karena tidak berlaku", () => {
    expect(hasil.pph23).toBe(0n);
  });

  it("grand total cocok dengan invoice cetak", () => {
    expect(hasil.grandTotal).toBe(23_848_600n);
  });

  it("grand total memakai sub total, bukan DPP", () => {
    // Kalau keliru memakai DPP, hasilnya 22.848.600 — kurang Rp 1.000.000.
    // Reimburse tetap ditagih penuh; yang dikecualikan hanya dasar pajaknya.
    expect(hasil.grandTotal).not.toBe(22_848_600n);
  });
});

describe("INVOICE DIAMETRAL 07-003 (EXIM, dengan PPh 23 2%)", () => {
  // Sumber: INVOICE DIAMETRAL 07-003_EXIM.docx
  // Nomor: 004-INVEXP/ISLI-26.07-003(AF)/VII/2026
  // Customer: PT DIAMETRAL INVOLUTE · NPWP 01.717.902.9-007.000
  const hasil = computeInvoiceTax({
    subTotal: rupiah(132_623_041n),
    reimburse: rupiah(0n),
    pph23Applicable: true,
  });

  it("DPP sama dengan sub total karena tidak ada reimburse", () => {
    expect(hasil.dpp).toBe(132_623_041n);
  });

  it("PPN cocok dengan invoice cetak", () => {
    expect(hasil.ppn).toBe(1_458_853n);
  });

  it("PPh 23 cocok dengan invoice cetak", () => {
    expect(hasil.pph23).toBe(2_652_461n);
  });

  /*
   * =====================================================================
   * DULU MERAH — SUDAH HIJAU sejak 13 Agu 2026.
   * =====================================================================
   *
   * Test ini sengaja dibiarkan gagal selama dua hari karena selisih Rp 1:
   * invoice cetak menulis 131.429.434, perhitungan kita 131.429.433.
   *
   * Klien menjawab: pembulatan pajak dilakukan KE ATAS.
   *
   * Jawaban itu diuji ke dua invoice nyata sebelum diterapkan:
   *
   *   Diametral  1.458.853,451 -> ke atas 1.458.854 -> grand 131.429.434 COCOK
   *                            -> setengah 1.458.853 -> grand 131.429.433 MELESET
   *   Materee      248.600,000 -> kedua cara sama    -> grand  23.848.600 COCOK
   *
   * Jadi Diametral adalah kasus pembeda, dan invoice cetaknya TIDAK salah ketik.
   * Kemungkinan (a) dan (c) di catatan lama gugur.
   *
   * Kalau test ini kembali merah, yang berubah hampir pasti applyRateBp().
   * Periksa src/lib/money/index.ts sebelum menyentuh angka di sini.
   * Angka 131.429.434 berasal dari dokumen cetak — JANGAN diubah.
   */
  it("grand total cocok dengan invoice cetak", () => {
    expect(hasil.grandTotal).toBe(131_429_434n);
  });

  it("PPN memakai pembulatan ke atas, bukan setengah ke atas", () => {
    // 132.623.041 x 1,1% = 1.458.853,451
    // Kalau angka ini jadi 1.458.853, berarti applyRateBp kembali ke half-up.
    expect(hasil.ppn).toBe(1_458_854n);
  });
});

describe("pagar pengaman", () => {
  it("menolak reimburse yang melebihi sub total", () => {
    expect(() =>
      computeInvoiceTax({
        subTotal: rupiah(1_000_000n),
        reimburse: rupiah(2_000_000n),
        pph23Applicable: false,
      }),
    ).toThrow(/melebihi sub total/);
  });

  it("menolak sub total negatif", () => {
    expect(() =>
      computeInvoiceTax({
        subTotal: rupiah(-1n),
        reimburse: rupiah(0n),
        pph23Applicable: false,
      }),
    ).toThrow();
  });

  it("mencatat versi aturan pajak pada tiap hasil", () => {
    const hasil = computeInvoiceTax({
      subTotal: rupiah(1_000_000n),
      reimburse: rupiah(0n),
      pph23Applicable: false,
    });
    expect(hasil.taxRuleVersion).toBe("2026.1");
  });
});
