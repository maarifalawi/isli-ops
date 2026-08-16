/*
 * Unit test — agregasi pajak invoice dari charge lines (murni). Irisan 6.
 *
 * Yang diuji: fungsi murni yang mengubah daftar baris charge (selling) menjadi
 * input computeInvoiceTax — SUM semua selling = subTotal, SUM selling baris
 * reimburse = reimburse (R3.2). Angka golden Materee/Diametral dipakai sebagai
 * kasus nyata.
 *
 * Ditambah: hitung pajak addendum R16.3 (default Q69: selisih = transaksi
 * pajak BARU berdiri sendiri; DPP = nilai selisih).
 */

import { describe, expect, it } from "vitest";
import {
  type BarisSelling,
  hitungPajakAddendum,
  hitungPajakInvoiceDariBaris,
} from "../../src/lib/invoice/aggregate";
import { rupiah } from "../../src/lib/money/index";
import { computeInvoiceTax } from "../../src/lib/tax/index";

const baris = (
  sellingIdr: bigint,
  isReimburse: boolean,
  chargeCode = "OF",
): BarisSelling => ({
  sellingIdr: rupiah(sellingIdr),
  isReimburse,
  chargeCode,
  deletedAt: null,
});

describe("hitungPajakInvoiceDariBaris — kasus nyata Materee 06-012", () => {
  // FREIGHT JAKARTA-SAMARINDA 22.600.000 (kena PPN) + REIMBURSE INAP 1.000.000.
  const hasil = hitungPajakInvoiceDariBaris({
    lines: [baris(22_600_000n, false), baris(1_000_000n, true, "REIMBURSE INAP")],
    pph23Applicable: false,
  });

  it("subTotal = SEMUA baris selling termasuk reimburse", () => {
    expect(hasil.subTotal).toBe(23_600_000n);
  });

  it("reimburse = hanya baris bertanda reimburse", () => {
    expect(hasil.reimburse).toBe(1_000_000n);
  });

  it("DPP, PPN, grand total cocok invoice cetak (23.848.600)", () => {
    expect(hasil.dpp).toBe(22_600_000n);
    expect(hasil.ppn).toBe(248_600n);
    expect(hasil.pph23).toBe(0n);
    expect(hasil.grandTotal).toBe(23_848_600n);
  });

  it("versi aturan pajak tercatat", () => {
    expect(hasil.taxRuleVersion).toBe("2026.1");
  });
});

describe("hitungPajakInvoiceDariBaris — kasus nyata Diametral 07-003", () => {
  const hasil = hitungPajakInvoiceDariBaris({
    lines: [baris(132_623_041n, false, "OCEAN FREIGHT")],
    pph23Applicable: true,
  });

  it("PPN ceiling 1.458.854, PPh 23 2.652.461, grand 131.429.434", () => {
    expect(hasil.dpp).toBe(132_623_041n);
    expect(hasil.ppn).toBe(1_458_854n);
    expect(hasil.pph23).toBe(2_652_461n);
    expect(hasil.grandTotal).toBe(131_429_434n);
  });
});

describe("hitungPajakInvoiceDariBaris — baris soft-deleted & validasi", () => {
  it("baris deletedAt terisi TIDAK ikut dijumlah (Q-4d-3)", () => {
    const hasil = hitungPajakInvoiceDariBaris({
      lines: [
        baris(10_000_000n, false),
        { ...baris(5_000_000n, false), deletedAt: new Date() },
      ],
      pph23Applicable: false,
    });
    expect(hasil.subTotal).toBe(10_000_000n);
  });

  it("invoice tanpa baris aktif DITOLAK — jangan buat invoice nol diam-diam", () => {
    expect(() =>
      hitungPajakInvoiceDariBaris({
        lines: [{ ...baris(1_000n, false), deletedAt: new Date() }],
        pph23Applicable: false,
      }),
    ).toThrow(/baris/);
  });

  it("reimburse > subTotal mustahil dari agregasi (validasi tax tetap hidup)", () => {
    // Perlindungan ekstra: kalau pemanggil salah mengisi lines, tax lib melempar.
    expect(() =>
      computeInvoiceTax({
        subTotal: rupiah(1_000n),
        reimburse: rupiah(2_000n),
        pph23Applicable: false,
      }),
    ).toThrow(/melebihi sub total/);
  });
});

describe("hitungPajakAddendum — R16.3 default Q69 (selisih kena pajak)", () => {
  it("selisih 1.000.000 kena PPN 11.000; grand total 1.011.000", () => {
    const hasil = hitungPajakAddendum({
      amountIdr: rupiah(1_000_000n),
      pph23Applicable: false,
    });
    expect(hasil.dpp).toBe(1_000_000n);
    expect(hasil.ppn).toBe(11_000n);
    expect(hasil.pph23).toBe(0n);
    expect(hasil.grandTotal).toBe(1_011_000n);
    expect(hasil.taxRuleVersion).toBe("2026.1");
  });

  it("selisih dengan PPh 23: DPP=selisih, PPh 2% ceiling", () => {
    const hasil = hitungPajakAddendum({
      amountIdr: rupiah(1_000_001n),
      pph23Applicable: true,
    });
    // PPN = ceil(1.000.001 × 1,1%) = ceil(11.000,0011) = 11.001
    expect(hasil.ppn).toBe(11_001n);
    // PPh = ceil(1.000.001 × 2%) = ceil(20.000,02) = 20.001
    expect(hasil.pph23).toBe(20_001n);
    expect(hasil.grandTotal).toBe(1_000_001n + 11_001n - 20_001n);
  });

  it("selisih nol DITOLAK — addendum tanpa nilai tidak bermakna", () => {
    expect(() =>
      hitungPajakAddendum({ amountIdr: rupiah(0n), pph23Applicable: false }),
    ).toThrow(/nol/);
  });

  /*
   * Koreksi turun (negatif) — R16 membolehkan amountIdr negatif, tapi pajak
   * atas nilai negatif tidak punya aturan tertulis. Default defensif: TOLAK.
   * Ini menebak kalau diizinkan — dicatat sebagai catatan, bukan perilaku.
   */
  it("selisih negatif DITOLAK (defensif — pajak koreksi turun belum ada aturannya)", () => {
    expect(() =>
      hitungPajakAddendum({ amountIdr: rupiah(-500_000n), pph23Applicable: false }),
    ).toThrow(/negatif/);
  });
});
