/*
 * Agregasi pajak invoice customer dari charge lines — Irisan 6 (murni).
 *
 * Tugas: mengubah daftar baris selling menjadi input computeInvoiceTax.
 *   subTotal  = SUM(selling_idr SEMUA baris aktif)      — termasuk reimburse
 *   reimburse = SUM(selling_idr baris aktif is_reimburse) — R3.2, keluar DPP
 *
 * Sumber angka = charge lines aktif (deleted_at IS NULL), BUKAN header
 * jobs.selling_idr (Q-4d-3: header hanya cross-check; R14.5 melarang rekap).
 *
 * Addendum (R16.3, default Q69 sampai dijawab): selisih = transaksi pajak
 * BARU berdiri sendiri — DPP-nya nilai selisih itu sendiri, versi aturan
 * pajak yang berlaku SAAT addendum terbit. Invoice asal tidak disentuh
 * (I-INV-1). Koreksi turun (negatif) DITOLAK — pajak atas nilai negatif belum
 * punya aturan tertulis, jangan menebak (guardrails: tulis pertanyaannya,
 * bukan defaultnya).
 */

import { type Rupiah, ZERO, sum } from "../money/index";
import { computeInvoiceTax } from "../tax/index";

/** Baris selling yang dibutuhkan agregasi (bentuk tipis, pola GpLine di costing). */
export type BarisSelling = {
  readonly sellingIdr: Rupiah;
  /** Baris reimburse/at-cost — dikeluarkan dari DPP (R3.2). */
  readonly isReimburse: boolean;
  readonly chargeCode: string;
  /** Baris soft-deleted tidak boleh ikut terjumlah. */
  readonly deletedAt: Date | null;
};

export type HasilPajak = ReturnType<typeof computeInvoiceTax>;

/**
 * Hitung seluruh blok pajak invoice dari baris selling job.
 * Melempar bila tidak ada baris aktif — invoice nol tidak boleh tercipta
 * diam-diam (pola "paksa manual" guardrails).
 */
export function hitungPajakInvoiceDariBaris(input: {
  lines: readonly BarisSelling[];
  /** R3.5: SELALU eksplisit dari centang manual Finance. Jangan disimpulkan. */
  pph23Applicable: boolean;
}): HasilPajak {
  const aktif = input.lines.filter((l) => l.deletedAt === null);
  if (aktif.length === 0) {
    throw new RangeError(
      "Job tidak punya baris selling aktif — invoice tidak bisa diterbitkan dari data kosong.",
    );
  }
  const subTotal = sum(aktif.map((l) => l.sellingIdr));
  const reimburse = sum(aktif.filter((l) => l.isReimburse).map((l) => l.sellingIdr));
  return computeInvoiceTax({
    subTotal,
    reimburse,
    pph23Applicable: input.pph23Applicable,
  });
}

/**
 * Pajak addendum — R16.3 default Q69 (selisih kena pajak, berdiri sendiri).
 *
 * DPP = nilai selisih. Tidak ada reimburse di level addendum (selisih sudah
 * nilai bersih satu kejadian penagihan). Koreksi turun ditolak defensif.
 */
export function hitungPajakAddendum(input: {
  amountIdr: Rupiah;
  pph23Applicable: boolean;
}): HasilPajak {
  const { amountIdr, pph23Applicable } = input;
  if (amountIdr === ZERO) {
    throw new RangeError(
      "Nilai addendum tidak boleh nol — koreksi tanpa nilai tidak bermakna.",
    );
  }
  if (amountIdr < ZERO) {
    throw new RangeError(
      `Nilai addendum negatif (${amountIdr}) — pajak atas koreksi turun belum punya aturan tertulis; tolak dan tanyakan (R16.3/Q69).`,
    );
  }
  return computeInvoiceTax({
    subTotal: amountIdr,
    reimburse: ZERO,
    pph23Applicable,
  });
}
