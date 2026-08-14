/*
 * Costing job — GP dan NETT.
 *
 * Rumus diambil langsung dari lembar SO milik ISLI (lihat tool audit rumus):
 *
 *   SO DOMESTIK FCL:
 *     D43 GP   = E16 − D41   → selling − total buying
 *     D44 NETT = G16 − D41   → (selling + PPN) − total buying
 *
 * Jadi selisih NETT − GP selalu persis sebesar PPN. Itu bukan kebetulan dan
 * bukan bug: NETT adalah kas yang benar-benar tinggal di ISLI sebelum PPN
 * disetorkan, GP adalah margin dagang yang sesungguhnya.
 *
 * KONSEKUENSI YANG HARUS DIPAHAMI: NETT selalu terlihat lebih besar dari GP.
 * Kalau dipakai untuk menilai apakah sebuah job menguntungkan, angkanya
 * menyesatkan — sebagian dari NETT itu uang pajak yang harus disetor, bukan
 * milik ISLI. Laporan harus menampilkan keduanya berdampingan, tidak pernah
 * NETT sendirian.
 */

import { type Rupiah, ZERO, formatPercent, subtract, sum } from "../money/index";

export type ChargeLine = {
  readonly chargeCode: string;
  readonly amount: Rupiah;
  /**
   * Baris reimburse ditagih penuh ke customer tapi dikecualikan dari DPP.
   * Contoh nyata: CHARGE LOLO 645.000 pada job ISLI-26.08-005.
   */
  readonly isReimburse: boolean;
};

export type JobCostingInput = {
  /** Total penjualan sebelum pajak. */
  readonly sellingIdr: Rupiah;
  /** PPN atas penjualan. */
  readonly ppnIdr: Rupiah;
  /** Baris biaya ke vendor. */
  readonly buyingLines: readonly ChargeLine[];
};

export type JobCostingResult = {
  readonly sellingIdr: Rupiah;
  readonly ppnIdr: Rupiah;
  readonly buyingIdr: Rupiah;
  /** GP = selling − buying */
  readonly gpIdr: Rupiah;
  /** NETT = (selling + PPN) − buying */
  readonly nettIdr: Rupiah;
  readonly gpPercent: string;
  readonly nettPercent: string;
  /** Benar kalau job ini rugi. Dipakai untuk menandai baris di daftar job. */
  readonly isLoss: boolean;
};

export function computeJobCosting(input: JobCostingInput): JobCostingResult {
  const { sellingIdr, ppnIdr, buyingLines } = input;

  const buyingIdr = sum(buyingLines.map((line) => line.amount));
  const gpIdr = subtract(sellingIdr, buyingIdr);
  const sellingWithTax = (sellingIdr + ppnIdr) as Rupiah;
  const nettIdr = subtract(sellingWithTax, buyingIdr);

  return {
    sellingIdr,
    ppnIdr,
    buyingIdr,
    gpIdr,
    nettIdr,
    gpPercent: formatPercent(gpIdr, sellingIdr),
    nettPercent: formatPercent(nettIdr, sellingWithTax),
    isLoss: gpIdr < ZERO,
  };
}

/**
 * Selisih pencadangan terhadap realisasi, per baris biaya.
 *
 * Di database ini kolom GENERATED ALWAYS AS (pencadangan_idr − actual_idr)
 * STORED — jadi tidak mungkin menyimpan selisih yang tidak konsisten dengan
 * kedua angka penyusunnya. Fungsi ini hanya untuk pratinjau di layar sebelum
 * baris disimpan.
 */
export function computeVariance(
  pencadanganIdr: Rupiah,
  actualIdr: Rupiah | null,
): Rupiah | null {
  if (actualIdr === null) return null;
  return subtract(pencadanganIdr, actualIdr);
}
