/*
 * GOLDEN TEST — costing job ISLI-26.08-005.
 *
 * Job ini dipilih karena satu alasan: ia ada dalam DUA VERSI yang berbeda.
 * Lembar Excel dan lembar cetak untuk job yang sama menghasilkan GP yang
 * berbeda Rp 2.450.000, karena versi cetak memuat satu baris tambahan
 * (CHARGE TRUCKING) yang tidak ada di Excel.
 *
 * Inilah persis masalah yang dikeluhkan Pak Indra: "ini nggak ke-capture,
 * kita nggak punya sistemnya, manual." Dua kertas untuk satu job, dua angka
 * margin, dan tidak ada cara tahu mana yang dipakai saat menagih.
 *
 * Test ini mengunci kedua versi supaya perbedaannya tidak pernah hilang diam-diam
 * sebelum klien memutuskan mana yang benar (pertanyaan A6).
 */

import { describe, expect, it } from "vitest";
import { type ChargeLine, computeJobCosting } from "../../src/lib/costing/index";
import { rupiah } from "../../src/lib/money/index";

// TOTAL BANGUN PERSADA · JKT-BTM 2X20' · KM. ICON IBRANI V.81 · ETD 14-Aug-26
const SELLING = rupiah(38_000_000n);
const PPN = rupiah(418_000n); // 1,1% dari 38.000.000

const line = (chargeCode: string, amount: bigint): ChargeLine => ({
  chargeCode,
  amount: rupiah(amount),
  isReimburse: false,
});

/** 12 baris seperti tercatat di berkas Excel. */
const BUYING_XLSX: readonly ChargeLine[] = [
  line("OF ICON", 9_577_000n),
  line("BL", 200_000n),
  line("THC LOLO JKT", 4_805_000n),
  line("LSS", 5_100_000n),
  line("THD", 2_600_000n),
  line("CLEANING", 400_000n),
  line("TRUCKING SMT", 5_200_000n),
  line("DOORING DANISH", 3_860_000n),
  line("HANDLING OPS", 100_000n),
  line("SEGEL", 200_000n),
  line("MATERAI", 29_000n),
  line("DELIVERY", 14_000n),
];

/** Versi cetak — sama persis, ditambah satu baris. */
const BUYING_CETAK: readonly ChargeLine[] = [
  ...BUYING_XLSX,
  line("CHARGE TRUCKING", 2_450_000n),
];

describe("ISLI-26.08-005 — versi Excel", () => {
  const hasil = computeJobCosting({
    sellingIdr: SELLING,
    ppnIdr: PPN,
    buyingLines: BUYING_XLSX,
  });

  it("total biaya cocok dengan D41 di lembar SO", () => {
    expect(hasil.buyingIdr).toBe(32_085_000n);
  });

  it("GP cocok dengan D43", () => {
    expect(hasil.gpIdr).toBe(5_915_000n);
  });

  it("NETT cocok dengan D44", () => {
    expect(hasil.nettIdr).toBe(6_333_000n);
  });

  it("selisih NETT dan GP persis sebesar PPN", () => {
    // Bukan kebetulan: NETT = (selling + PPN) − buying, GP = selling − buying.
    expect(hasil.nettIdr - hasil.gpIdr).toBe(PPN);
  });
});

describe("ISLI-26.08-005 — versi cetak", () => {
  const hasil = computeJobCosting({
    sellingIdr: SELLING,
    ppnIdr: PPN,
    buyingLines: BUYING_CETAK,
  });

  it("total biaya memuat CHARGE TRUCKING", () => {
    expect(hasil.buyingIdr).toBe(34_535_000n);
  });

  it("GP lebih kecil Rp 2.450.000", () => {
    expect(hasil.gpIdr).toBe(3_465_000n);
  });

  it("NETT lebih kecil dengan besaran yang sama", () => {
    expect(hasil.nettIdr).toBe(3_883_000n);
  });
});

describe("perbandingan dua versi — bahan diskusi dengan klien", () => {
  it("selisih GP adalah Rp 2.450.000, sebesar satu baris CHARGE TRUCKING", () => {
    const xlsx = computeJobCosting({
      sellingIdr: SELLING,
      ppnIdr: PPN,
      buyingLines: BUYING_XLSX,
    });
    const cetak = computeJobCosting({
      sellingIdr: SELLING,
      ppnIdr: PPN,
      buyingLines: BUYING_CETAK,
    });
    expect(xlsx.gpIdr - cetak.gpIdr).toBe(2_450_000n);
  });

  it("margin turun dari 15,6% jadi 9,1% — selisih yang menentukan", () => {
    const xlsx = computeJobCosting({
      sellingIdr: SELLING,
      ppnIdr: PPN,
      buyingLines: BUYING_XLSX,
    });
    const cetak = computeJobCosting({
      sellingIdr: SELLING,
      ppnIdr: PPN,
      buyingLines: BUYING_CETAK,
    });
    expect(xlsx.gpPercent).toBe("15,6%");
    expect(cetak.gpPercent).toBe("9,1%");
  });

  it("job yang rugi ditandai", () => {
    const rugi = computeJobCosting({
      sellingIdr: rupiah(1_000_000n),
      ppnIdr: rupiah(11_000n),
      buyingLines: [line("OF", 2_000_000n)],
    });
    expect(rugi.isLoss).toBe(true);
    expect(rugi.gpIdr).toBe(-1_000_000n);
  });
});
