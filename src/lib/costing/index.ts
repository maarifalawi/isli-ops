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

/*
 * Validasi at-cost (R4.3): baris reimburse WAJIB dijual sama persis dengan
 * harga beli — tanpa margin, tanpa selisih Rp 1. Kalau ada selisih, itu bukan
 * reimburse melainkan penjualan biasa, dan menandakannya sebagai reimburse
 * akan salah mengkecualikannya dari DPP (R3.2).
 */
export type AtCostLine = {
  readonly chargeCode: string;
  readonly isReimburse: boolean;
  /** Nilai yang ditagih ke customer. */
  readonly selling: Rupiah;
  /** Nilai yang dibayar ke vendor. */
  readonly buying: Rupiah;
};

/**
 * Melempar RangeError kalau ada baris reimburse dengan selling ≠ buying.
 * Error menyebut kode charge supaya langsung ketahuan di layar.
 */
export function validateAtCostLines(lines: readonly AtCostLine[]): void {
  for (const line of lines) {
    if (!line.isReimburse) continue;
    if (line.selling !== line.buying) {
      throw new RangeError(
        `Baris reimburse ${line.chargeCode} melanggar aturan at-cost (R4.3): selling (${line.selling}) wajib sama persis dengan buying (${line.buying}). Kalau memang ada margin, jangan tandai sebagai reimburse.`,
      );
    }
  }
}

/** Total selling baris reimburse — inilah angka yang dikeluarkan dari DPP (R3.2). */
export function reimburseSellingTotal(lines: readonly AtCostLine[]): Rupiah {
  return sum(lines.filter((line) => line.isReimburse).map((line) => line.selling));
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

// ---------------------------------------------------------------------------
// Irisan 4d — GP / GP% / NETT per job dari baris charge_lines.
//
// Keputusan yang dikunci di sini (jawaban user 16 Agu 2026, tercatat di
// docs/OPEN-QUESTIONS.md sebagai Q-4d-1/2/3):
//
//   Q-4d-1 STATUS QUO R4.2 — reimburse KELUAR dari sisi selling, TETAP MASUK
//          sisi buying. ADR-0007 TETAP berstatus BELUM DIPUTUSKAN; kalau klien
//          kelak memilih rumus simetris, itu irisan terpisah.
//   Q-4d-2 Basis buying = pencadangan_idr (anggaran). actual_idr nullable dan
//          variance-nya sudah punya computeVariance di atas — JANGAN dicampur.
//          GP 4d = GP berbasis pencadangan; actual-based GP = irisan mendatang.
//   Q-4d-3 Basis selling = SUM(charge_lines.selling_idr) baris aktif
//          (deleted_at IS NULL). Header jobs.selling_idr HANYA cross-check
//          (R14.5 melarang menyimpan rekap).
//
// Semua kolom *_idr sudah rupiah murni untuk SEMUA baris — baris USD
// dikonversi & dibekukan saat ditulis (Irisan 4c, konversiUsdKeIdr per R8.2).
// Jadi GP TIDAK melakukan konversi apa pun di sini; menjumlahkan *_idr saja.
//
// bigint-only (ADR-0002): tidak ada float, tidak ada Number() di hitungan.
// ---------------------------------------------------------------------------

/**
 * Baris charge_lines yang dibutuhkan penghitung GP. Sengaja tipis: hanya
 * kolom yang benar-benar masuk rumus, supaya query-nya bisa SELECT minimal.
 */
export type GpLine = {
  /** Nilai jual baris (kolom selling_idr — rupiah murni, IDR maupun USD beku). */
  readonly sellingIdr: Rupiah;
  /** Nilai beli perkiraan (kolom pencadangan_idr). */
  readonly pencadanganIdr: Rupiah;
  /** Baris reimburse/at-cost (R4.3): dikeluarkan dari selling per R4.2. */
  readonly isReimburse: boolean;
  /** Baris soft-deleted tidak boleh ikut terjumlah. */
  readonly deletedAt: Date | null;
};

function barisAktif(lines: readonly GpLine[]): readonly GpLine[] {
  return lines.filter((line) => line.deletedAt === null);
}

/** Total selling non-reimburse (E16 versi sistem, R4.2). */
export function sellingUntukGp(lines: readonly GpLine[]): Rupiah {
  return sum(
    barisAktif(lines)
      .filter((line) => !line.isReimburse)
      .map((line) => line.sellingIdr),
  );
}

/** Total buying = SEMUA pencadangan baris aktif, termasuk at-cost (D41, R4.2). */
export function buyingUntukGp(lines: readonly GpLine[]): Rupiah {
  return sum(barisAktif(lines).map((line) => line.pencadanganIdr));
}

/**
 * GP per job = selling non-reimburse − semua buying (R4.2 status quo).
 *
 * null = job belum punya baris aktif (belum ada data) — TAMPILKAN "—",
 * JANGAN Rp0, karena Rp0 terbaca "impas" padahal datanya belum ada.
 */
export function hitungGP(lines: readonly GpLine[]): Rupiah | null {
  if (barisAktif(lines).length === 0) return null;
  return subtract(sellingUntukGp(lines), buyingUntukGp(lines));
}

/**
 * GP% = gp / sellingTotal, satu desimal, dibulatkan menjauhi nol (pola Excel
 * ROUND()). denominator 0 → null (tampilkan "—"), bukan NaN.
 */
export function hitungGPpct(gp: Rupiah, sellingTotal: Rupiah): string | null {
  if (sellingTotal === ZERO) return null;
  return formatPercent(gp, sellingTotal);
}

/**
 * NETT per job = selling non-reimburse + PPN − semua buying (R4.2, G16−D41).
 * Invariant yang dikunci test: NETT − GP selalu persis sebesar PPN (Q09:
 * disengaja, bukan bug — tampilkan GP dan NETT selalu berdampingan).
 */
export function hitungNETT(lines: readonly GpLine[], ppnIdr: Rupiah): Rupiah | null {
  if (barisAktif(lines).length === 0) return null;
  const sellingDenganPpn = (sellingUntukGp(lines) + ppnIdr) as Rupiah;
  return subtract(sellingDenganPpn, buyingUntukGp(lines));
}

/**
 * Benar kalau job rugi (GP < 0). null (belum ada data) BUKAN rugi —
 * mengembalikan false supaya job kosong tidak ditandai merah.
 */
export function isLoss(gp: Rupiah | null): boolean {
  return gp !== null && gp < ZERO;
}
