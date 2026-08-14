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

  it("PPN 1,1% atas DPP, dibulatkan KE ATAS (Q05, 13 Agu 2026)", () => {
    // 132.623.041 × 1,1% = 1.458.853,451 → ceiling = 1.458.854.
    // Invoice cetak lama menulis 1.458.853 — itulah sumber selisih Rp 1 yang
    // dulu dibiarkan merah. Q05 sudah dijawab: pembulatan KE ATAS. Nilai
    // harapan ini satu-satunya yang dikoreksi dari angka cetak, dengan alasan
    // tercatat di sini; grand total di bawah TIDAK berubah dan tetap cocok.
    expect(hasil.ppn).toBe(1_458_854n);
  });

  it("PPh 23 cocok dengan invoice cetak", () => {
    expect(hasil.pph23).toBe(2_652_461n);
  });

  /*
   * R3.3: grand total = sub_total + PPN − PPh 23, tiap komponen dibulatkan ke
   * atas sendiri-sendiri (R3.6/Q05). Jumlah komponen ceiling:
   *   132.623.041 + 1.458.854 − 2.652.461 = 131.429.434
   * — persis grand total cetak. Selisih Rp 1 yang lama hilang tanpa toleransi.
   */
  it("grand total cocok dengan invoice cetak", () => {
    expect(hasil.grandTotal).toBe(131_429_434n);
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
