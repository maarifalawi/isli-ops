/*
 * UNIT TEST — src/lib/costing.
 *
 * R4.2 + ADR-0007: GP dan NETT adalah DUA metrik terpisah.
 * R4.3: baris reimburse WAJIB at-cost — selling == buying persis.
 */

import { describe, expect, it } from "vitest";
import {
  type AtCostLine,
  computeJobCosting,
  reimburseSellingTotal,
  validateAtCostLines,
} from "../../src/lib/costing/index";
import { rupiah } from "../../src/lib/money/index";

describe("GP dan NETT — dua metrik terpisah (R4.2, ADR-0007)", () => {
  it("GP = selling sebelum pajak − cost; NETT = selling setelah pajak − cost", () => {
    const hasil = computeJobCosting({
      sellingIdr: rupiah(10_000_000n),
      ppnIdr: rupiah(110_000n),
      buyingLines: [{ chargeCode: "OF", amount: rupiah(7_000_000n), isReimburse: false }],
    });
    expect(hasil.gpIdr).toBe(3_000_000n);
    expect(hasil.nettIdr).toBe(3_110_000n);
  });

  it("selisih NETT − GP selalu persis sebesar PPN", () => {
    const hasil = computeJobCosting({
      sellingIdr: rupiah(10_000_000n),
      ppnIdr: rupiah(110_000n),
      buyingLines: [{ chargeCode: "OF", amount: rupiah(7_000_000n), isReimburse: false }],
    });
    expect(hasil.nettIdr - hasil.gpIdr).toBe(110_000n);
  });
});

describe("validasi at-cost (R4.3)", () => {
  const atCostLolos: AtCostLine = {
    chargeCode: "LOLO",
    isReimburse: true,
    selling: rupiah(645_000n),
    buying: rupiah(645_000n),
  };
  const barisBiasa: AtCostLine = {
    chargeCode: "OF",
    isReimburse: false,
    selling: rupiah(9_000_000n),
    buying: rupiah(8_000_000n),
  };

  it("lolos kalau baris reimburse dijual sama persis dengan harga beli", () => {
    expect(() => validateAtCostLines([atCostLolos, barisBiasa])).not.toThrow();
  });

  it("menolak baris reimburse yang diberi margin — selisih Rp 1 pun", () => {
    const curang: AtCostLine = { ...atCostLolos, selling: rupiah(646_000n) };
    expect(() => validateAtCostLines([curang])).toThrow(/at-cost/);
  });

  it("pesan error menyebut kode charge yang melanggar", () => {
    const curang: AtCostLine = { ...atCostLolos, selling: rupiah(700_000n) };
    expect(() => validateAtCostLines([curang])).toThrow(/LOLO/);
  });

  it("baris non-reimburse bebas bermargin", () => {
    expect(() => validateAtCostLines([barisBiasa])).not.toThrow();
  });

  it("daftar kosong lolos", () => {
    expect(() => validateAtCostLines([])).not.toThrow();
  });

  it("reimburseSellingTotal hanya menjumlah baris reimburse", () => {
    expect(reimburseSellingTotal([atCostLolos, barisBiasa])).toBe(645_000n);
    expect(reimburseSellingTotal([])).toBe(0n);
  });
});
