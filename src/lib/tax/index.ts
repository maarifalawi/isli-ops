/*
 * Pipeline pajak invoice customer.
 *
 * Diturunkan dari dua invoice asli ISLI:
 *   - INVOICE MATEREE 06-012 (domestik) — tanpa PPh 23
 *   - INVOICE DIAMETRAL 07-003 (EXIM)   — dengan PPh 23 2%
 *
 * Urutannya penting dan tidak boleh ditukar:
 *
 *   DPP         = sub_total − reimburse
 *   PPN         = ceil(DPP × 1,1%)
 *   PPh 23      = ceil(DPP × 2%)  — hanya kalau berlaku
 *   Grand total = sub_total + PPN − PPh 23          (rumus R3.3)
 *
 * Perhatikan: grand total memakai SUB TOTAL, bukan DPP. Biaya reimburse tetap
 * ditagih penuh ke customer — yang dikecualikan hanya dari dasar pengenaan
 * pajak. Ini sumber kekeliruan yang paling mudah terjadi.
 *
 * Semua uang dibulatkan KE ATAS per komponen (R3.6 — Q05 dijawab 13 Agu 2026).
 * Grand total adalah JUMLAH KOMPONEN yang sudah dibulatkan, bukan pembulatan
 * ulang dari nilai exact. Kasus Diametral 07-003 membuktikan ini: jumlah
 * komponen ceiling menghasilkan 131.429.434 — persis grand total cetak, tanpa
 * selisih Rp 1.
 */

import {
  PPH23_RATE_BP,
  PPN_RATE_BP,
  type Rupiah,
  ZERO,
  applyRateBp,
  subtract,
} from "../money/index";

export type InvoiceTaxInput = {
  /** Jumlah seluruh baris penjualan, termasuk baris reimburse. */
  readonly subTotal: Rupiah;
  /** Bagian yang ditandai reimburse. Dikecualikan dari DPP. */
  readonly reimburse: Rupiah;
  /**
   * Apakah PPh 23 dipotong.
   *
   * SELALU EKSPLISIT. JANGAN PERNAH DISIMPULKAN dari jenis job, kepemilikan
   * NPWP, atau nama customer. Aturannya belum diketahui — pertanyaan A1 ke
   * Bu Niken masih terbuka. Sampai dijawab, ini keputusan manusia.
   */
  readonly pph23Applicable: boolean;
};

export type InvoiceTaxResult = {
  readonly subTotal: Rupiah;
  readonly reimburse: Rupiah;
  readonly dpp: Rupiah;
  readonly ppn: Rupiah;
  readonly pph23: Rupiah;
  readonly grandTotal: Rupiah;
  /**
   * Versi aturan yang dipakai saat invoice diterbitkan.
   *
   * Disimpan di baris invoice supaya invoice lama tidak berubah nilainya kalau
   * tarif pajak berubah. Tanpa ini, satu perubahan tarif akan diam-diam menulis
   * ulang seluruh riwayat, dan angka yang sudah dilaporkan ke kantor pajak
   * tidak lagi cocok dengan yang ada di sistem.
   */
  readonly taxRuleVersion: string;
};

export const CURRENT_TAX_RULE_VERSION = "2026.1";

export function computeInvoiceTax(input: InvoiceTaxInput): InvoiceTaxResult {
  const { subTotal, reimburse, pph23Applicable } = input;

  if (subTotal < 0n) {
    throw new RangeError("Sub total invoice tidak boleh negatif.");
  }
  if (reimburse < 0n) {
    throw new RangeError("Nilai reimburse tidak boleh negatif.");
  }
  if (reimburse > subTotal) {
    throw new RangeError(
      `Reimburse (${reimburse}) melebihi sub total (${subTotal}). Baris reimburse adalah bagian DARI sub total, bukan tambahan di luarnya.`,
    );
  }

  const dpp = subtract(subTotal, reimburse);
  const ppn = applyRateBp(dpp, PPN_RATE_BP);
  const pph23 = pph23Applicable ? applyRateBp(dpp, PPH23_RATE_BP) : ZERO;

  // R3.3: grand total = sub_total + PPN − PPh 23. Komponen dijumlahkan; tiap
  // komponen sudah dibulatkan ke atas oleh applyRateBp. Kasus Diametral 07-003:
  //   132.623.041 + 1.458.854 − 2.652.461 = 131.429.434  = grand total cetak.
  // Selisih Rp 1 yang lama (131.429.433) lenyap begitu pembulatan diganti dari
  // half-away-from-zero ke ceiling sesuai keputusan Q05 (13 Agu 2026).
  const grandTotal = (subTotal + ppn - pph23) as Rupiah;

  return {
    subTotal,
    reimburse,
    dpp,
    ppn,
    pph23,
    grandTotal,
    taxRuleVersion: CURRENT_TAX_RULE_VERSION,
  };
}

/**
 * PPh 23 yang ISLI potong saat membayar vendor.
 *
 * Arahnya berlawanan dengan invoice customer: di sini ISLI yang memotong.
 * Bu Niken butuh total per vendor per bulan untuk pelaporan pajak — lihat
 * pertanyaan A4. Sampai dijawab, fungsi ini hanya menghitung, belum melaporkan.
 */
export function computeVendorWithholding(amount: Rupiah, applicable: boolean): Rupiah {
  return applicable ? applyRateBp(amount, PPH23_RATE_BP) : ZERO;
}
