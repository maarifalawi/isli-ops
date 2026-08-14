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
 *   PPN         = round(DPP × 1,1%)
 *   PPh 23      = round(DPP × 2%)  — hanya kalau berlaku
 *   Grand total = round(sub_total + DPP×1,1% − DPP×2%)
 *
 * Perhatikan: grand total memakai SUB TOTAL, bukan DPP. Biaya reimburse tetap
 * ditagih penuh ke customer — yang dikecualikan hanya dari dasar pengenaan
 * pajak. Ini sumber kekeliruan yang paling mudah terjadi.
 *
 * Dan grand total dibulatkan dari nilai EXACT, bukan dari jumlah komponen yang
 * sudah dibulatkan — lihat komentar di computeInvoiceTax (kasus Diametral).
 */

import {
  PPH23_RATE_BP,
  PPN_RATE_BP,
  type Rupiah,
  ZERO,
  applyRateBp,
  rupiah,
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

  // Grand total dihitung dari pembilang EXACT lalu dibulatkan sekali di akhir
  // (half away from zero, sama dengan applyRateBp), BUKAN dari jumlah komponen
  // yang sudah dibulatkan. Kasus Diametral 07-003:
  //   exact: 132.623.041 + 1.458.853,451 − 2.652.460,82 = 131.429.433,631
  //     dibulatkan dari exact        -> 131.429.434  = invoice cetak
  //     jumlah komponen terbulatkan  -> 131.429.433  = MELESET Rp 1
  // Baris PPN dan PPh 23 di laporan cetak tetap menampilkan komponen yang
  // dibulatkan sendiri-sendiri (1.458.853 dan 2.652.461); hanya grand total
  // yang dibulatkan dari nilai exact. Materee 06-012 tidak terpengaruh
  // (22.600.000 × 1,1% = 248.600 tepat).
  const grandExactNumerator =
    subTotal * 10_000n +
    dpp * BigInt(PPN_RATE_BP) -
    (pph23Applicable ? dpp * BigInt(PPH23_RATE_BP) : 0n);
  const negative = grandExactNumerator < 0n;
  const absolute = negative ? -grandExactNumerator : grandExactNumerator;
  const grandTotal = ((negative ? -1n : 1n) * ((absolute + 5_000n) / 10_000n)) as Rupiah;

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
