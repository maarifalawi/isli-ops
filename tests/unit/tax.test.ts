/*
 * UNIT TEST — src/lib/tax.
 *
 * R3.1 PPN 110 bp atas DPP · R3.2 reimburse keluar dari DPP ·
 * R3.3 grand total = sub_total + ppn − pph23 · R3.5 PPh 23 default MATI ·
 * R3.6/Q05 semua pembulatan KE ATAS.
 */

import { describe, expect, it } from "vitest";
import { rupiah } from "../../src/lib/money/index";
import { computeInvoiceTax, computeVendorWithholding } from "../../src/lib/tax/index";

describe("ppn — 1,1% atas DPP, ceiling (R3.1, R3.6)", () => {
  it("DPP mengecualikan reimburse (R3.2)", () => {
    const hasil = computeInvoiceTax({
      subTotal: rupiah(23_600_000n),
      reimburse: rupiah(1_000_000n),
      pph23Applicable: false,
    });
    expect(hasil.dpp).toBe(22_600_000n);
    expect(hasil.ppn).toBe(248_600n);
  });

  it("PPN naik ke rupiah berikutnya kalau ada pecahan", () => {
    // DPP 99.999.999 × 1,1% = 1.099.999,989 → 1.100.000
    const hasil = computeInvoiceTax({
      subTotal: rupiah(99_999_999n),
      reimburse: rupiah(0n),
      pph23Applicable: false,
    });
    expect(hasil.ppn).toBe(1_100_000n);
  });
});

describe("pph23 — 200 bp, default TIDAK aktif (R3.5)", () => {
  it("nol saat pph23Applicable false", () => {
    const hasil = computeInvoiceTax({
      subTotal: rupiah(10_000_000n),
      reimburse: rupiah(0n),
      pph23Applicable: false,
    });
    expect(hasil.pph23).toBe(0n);
  });

  it("2% atas DPP dengan ceiling saat aktif", () => {
    // DPP 33.333.333 × 2% = 666.666,66 → 666.667
    const hasil = computeInvoiceTax({
      subTotal: rupiah(33_333_333n),
      reimburse: rupiah(0n),
      pph23Applicable: true,
    });
    expect(hasil.pph23).toBe(666_667n);
  });
});

describe("grand total — rumus R3.3: sub_total + ppn − pph23", () => {
  it("tanpa pph23", () => {
    const hasil = computeInvoiceTax({
      subTotal: rupiah(1_000_000n),
      reimburse: rupiah(100_000n),
      pph23Applicable: false,
    });
    // dpp 900.000 → ppn ceil(9.900) = 9.900 → grand 1.009.900
    expect(hasil.grandTotal).toBe(1_009_900n);
  });

  it("dengan pph23", () => {
    const hasil = computeInvoiceTax({
      subTotal: rupiah(500_000n),
      reimburse: rupiah(0n),
      pph23Applicable: true,
    });
    // ppn 5.500, pph23 10.000 → 500.000 + 5.500 − 10.000 = 495.500
    expect(hasil.grandTotal).toBe(495_500n);
  });

  it("Diametral: jumlah komponen ceiling = grand total, tanpa selisih Rp 1", () => {
    const hasil = computeInvoiceTax({
      subTotal: rupiah(132_623_041n),
      reimburse: rupiah(0n),
      pph23Applicable: true,
    });
    expect(hasil.grandTotal).toBe(131_429_434n);
  });
});

describe("pagar pengaman tambahan", () => {
  it("menolak reimburse negatif", () => {
    expect(() =>
      computeInvoiceTax({
        subTotal: rupiah(1_000_000n),
        reimburse: rupiah(-1n),
        pph23Applicable: false,
      }),
    ).toThrow();
  });
});

describe("computeVendorWithholding — PPh 23 arah vendor", () => {
  it("memotong 2% dengan ceiling saat aktif", () => {
    // 2.652.461 × 2% = 53.049,22 → 53.050
    expect(computeVendorWithholding(rupiah(2_652_461n), true)).toBe(53_050n);
  });

  it("nol saat tidak aktif", () => {
    expect(computeVendorWithholding(rupiah(2_652_461n), false)).toBe(0n);
  });
});
