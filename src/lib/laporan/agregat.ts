/*
 * Agregasi laporan murni — Irisan 8 (keputusan Q-IRIS8-1..5, 17 Agu 2026).
 *
 * DILARANG menulis rumus GP kedua di sini. Satu-satunya sumber definisi GP
 * adalah src/lib/costing (hitungGP/sellingUntukGp/buyingUntukGp — basis
 * pencadangan, R4.2 status quo, ADR-0007 tetap Proposed). Modul ini hanya
 * MENJUMLAHKAN hasil hitungGP antar job dan menyusun realokasi overlay.
 *
 * Semua fungsi murni — tanpa DB — supaya bisa diuji unit (kegagalan agregasi
 * tidak boleh butuh database untuk direproduksi).
 */

import { type Rupiah, formatPercent } from "../money/index";

/** Ringkasan satu job untuk keperluan agregasi laporan. */
export interface RingkasanJobUntukAgregat {
  readonly jobId: string;
  /** Hasil hitungGP(lines job ini). null = job belum punya baris aktif. */
  readonly gpIdr: Rupiah | null;
}

/** Hasil agregasi sekumpulan ringkasan job. */
export interface HasilAgregasi {
  /** Σ GP job berangka (null diabaikan, bukan dihitung 0). */
  readonly totalGp: Rupiah;
  readonly jumlahJobBerangka: number;
  readonly jumlahJobKosong: number;
}

const NOL = 0n as Rupiah;

/**
 * Menjumlahkan GP antar job. Job dengan gp null (belum ada baris aktif)
 * TIDAK dihitung sebagai 0 — dihitung terpisah sebagai jumlahJobKosong
 * supaya UI bisa menampilkan "belum ada data" tanpa menyesatkan sebagai impas.
 */
export function agregasiRingkasanJob(
  jobs: readonly RingkasanJobUntukAgregat[],
): HasilAgregasi {
  let total = NOL;
  let berangka = 0;
  let kosong = 0;
  for (const j of jobs) {
    if (j.gpIdr === null) {
      kosong += 1;
      continue;
    }
    total = (total + j.gpIdr) as Rupiah;
    berangka += 1;
  }
  return { totalGp: total, jumlahJobBerangka: berangka, jumlahJobKosong: kosong };
}

/**
 * GP% agregat — WAJIB total-based: formatPercent(totalGp, totalSelling).
 * Rata-rata GP% per job DITOLAK: job kecil bermargin besar akan mendistorsi
 * (contoh dikunci di test: GP% total 7,1% vs rata-rata naif −2,5%).
 * Selling 0 → null (tampil "—").
 */
export function gpPersenAgregat(totalGp: Rupiah, totalSelling: Rupiah): string | null {
  if (totalSelling === NOL) return null;
  return formatPercent(totalGp, totalSelling);
}

/** Satu realokasi APPROVED (overlay; PENDING tidak pernah masuk sini). */
export interface RealokasiUntukAgregat {
  readonly originJobId: string;
  readonly destinationJobId: string;
  readonly jumlahIdr: Rupiah;
}

/**
 * GP per job SETELAH overlay realokasi APPROVED (R5.3/Q06: "GP asli dan GP
 * setelah realokasi ditampilkan berdampingan").
 *
 * Semantik: memindahkan BIAYA sebesar jumlah_idr dari job asal ke job tujuan
 * → GP asal NAIK sebesar jumlah (biayanya berkurang), GP tujuan TURUN sebesar
 * jumlah (biayanya bertambah). Invarian yang dikunci test: ΣGP setelah ==
 * ΣGP sebelum — biaya berpindah, tidak hilang dan tidak tercipta.
 *
 * Realokasi yang menunjuk jobId di luar daftar diabaikan (di DB tidak mungkin
 * terjadi — FK — tapi agregat harus tahan data tidak lengkap tanpa melempar).
 */
export function totalGpSetelahRealokasi(
  jobs: readonly RingkasanJobUntukAgregat[],
  realokasi: readonly RealokasiUntukAgregat[],
): readonly { jobId: string; gpIdr: Rupiah }[] {
  const gp = new Map<string, Rupiah>();
  for (const j of jobs) {
    if (j.gpIdr !== null) gp.set(j.jobId, j.gpIdr);
  }
  for (const r of realokasi) {
    const asal = gp.get(r.originJobId);
    const tujuan = gp.get(r.destinationJobId);
    if (asal !== undefined) gp.set(r.originJobId, (asal + r.jumlahIdr) as Rupiah);
    if (tujuan !== undefined) {
      gp.set(r.destinationJobId, (tujuan - r.jumlahIdr) as Rupiah);
    }
  }
  return [...gp.entries()].map(([jobId, gpIdr]) => ({ jobId, gpIdr }));
}
