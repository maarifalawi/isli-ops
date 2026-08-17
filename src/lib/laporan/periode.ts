/*
 * Periode laporan — Irisan 8a (R14.1, keputusan Q-IRIS8-2, 17 Agu 2026).
 *
 * Satu-satunya tempat yang tahu cara membulatkan "bulan" untuk tiap jenis
 * laporan. Kalau kelak Bu Niken mengubah basis periode (Q68/Q-IRIS8-2 masih
 * MENUNGGU konfirmasi), perubahannya jatuh di file ini saja.
 *
 *  - Dashboard GP & ranking (8b/8c): jobs.tahun/jobs.bulan (bulan penugasan
 *    job — bulan di nomor job). Tidak ada timezone: kolom integer murni.
 *  - Rekap vendor R7.3: vendor_invoices.dibayar_at (TIMESTAMPTZ) → bulan
 *    KALENDER ASIA/JAKARTA (WIB), bukan UTC. 30 Juni 23:30 UTC adalah
 *    1 Juli 06:30 WIB → masuk Juli.
 *  - Rekap pajak PPN/PPh23: customer_invoices.issue_date (DATE, tanpa jam)
 *    → bulan kalender apa adanya.
 *
 * Semua fungsi murni — tanpa DB, tanpa I/O — supaya bisa diuji unit.
 */

import { fromZonedTime } from "date-fns-tz";

/** Timezone resmi periode laporan (Q-IRIS8-2). */
export const ZONA_WAKTU_LAPORAN = "Asia/Jakarta";

/** Satu bulan kalender. `bulan` 1–12. */
export interface Bulan {
  readonly tahun: number;
  readonly bulan: number;
}

/** Rentang bulan A → B inklusif (R14.1: satuan terkecil bulan). */
export interface RentangBulan {
  readonly dari: Bulan;
  readonly sampai: Bulan;
}

/** Angka bulan → urutan linear, supaya rentang bisa dibandingkan. */
function urutanBulan(b: Bulan): number {
  return b.tahun * 12 + (b.bulan - 1);
}

/** Normalisasi + validasi satu bulan. null bila tidak valid. */
export function buatRentangBulan(tahun: number, bulan: number): Bulan | null {
  if (!Number.isInteger(tahun) || !Number.isInteger(bulan)) return null;
  if (tahun < 2000 || tahun > 2100) return null; // selaras validasi createJob
  if (bulan < 1 || bulan > 12) return null;
  return { tahun, bulan };
}

/**
 * Parse "YYYY-MM" dari query string URL (R14.1: rentang tersimpan di URL
 * supaya bisa dibagikan). null bila format salah — PEMANGGIL wajib menolak
 * input, bukan menebak bulan berjalan diam-diam.
 */
export function parseBulanDariUrl(nilai: string): Bulan | null {
  const m = /^(\d{4})-(\d{2})$/.exec(nilai.trim());
  if (!m) return null;
  return buatRentangBulan(Number(m[1]), Number(m[2]));
}

/**
 * Rentang dari dua string URL "YYYY-MM". null bila salah satu rusak ATAU
 * dari > sampai (rentang terbalik ditolak eksplisit, bukan dibalik diam-diam —
 * kebalikan diam-diam membuat laporan orang lain terbaca tanpa jejak).
 */
export function parseRentangDariUrl(dari: string, sampai: string): RentangBulan | null {
  const d = parseBulanDariUrl(dari);
  const s = parseBulanDariUrl(sampai);
  if (!d || !s) return null;
  if (urutanBulan(d) > urutanBulan(s)) return null;
  return { dari: d, sampai: s };
}

/** Bulan kunci URL "YYYY-MM" untuk link / bookmark. */
export function bulanKeUrl(b: Bulan): string {
  return `${b.tahun}-${String(b.bulan).padStart(2, "0")}`;
}

/** Rentang ke string "YYYY-MM..YYYY-MM" (label tampilan & export). */
export function rentangKeLabel(r: RentangBulan): string {
  return `${bulanKeUrl(r.dari)}..${bulanKeUrl(r.sampai)}`;
}

/** Apakah bulan b berada dalam rentang (inklusif). */
export function bulanDalamRentang(b: Bulan, r: RentangBulan): boolean {
  const u = urutanBulan(b);
  return u >= urutanBulan(r.dari) && u <= urutanBulan(r.sampai);
}

/** Daftar semua bulan dalam rentang, urut naik (untuk label tabel & GROUP BY). */
export function daftarBulanRentang(r: RentangBulan): readonly Bulan[] {
  const hasil: Bulan[] = [];
  for (let u = urutanBulan(r.dari); u <= urutanBulan(r.sampai); u++) {
    const tahun = Math.floor(u / 12);
    const bulan = (u % 12) + 1;
    hasil.push({ tahun, bulan });
  }
  return hasil;
}

/**
 * Bulan kalender WIB dari sebuah instan waktu (dibayar_at TIMESTAMPTZ).
 *
 * WAJIB lewat sini — JANGAN new Date().getUTCMonth() (geser 7 jam di
 * boundary) dan JANGAN getMonth() lokal mesin (beda antar server).
 *
 * fromZonedTime("2026-07-01T00:00", "Asia/Jakarta") menghasilkan instan UTC
 * 2026-06-30T17:00Z; kalau instan input >= titik itu, tanggal WIB-nya sudah
 * masuk bulan berikutnya. Pendekatan di bawah: geser instan +07:00 lalu baca
 * komponen UTC hasilnya — padanan matematis "wall clock Jakarta".
 */
export function bulanDibayarWib(instan: Date): Bulan {
  const zona = fromZonedTime("1970-01-01T00:00:00", ZONA_WAKTU_LAPORAN);
  // zona.getTime() === 0 di WIB (UTC+7 tanpa DST) — offset tetap +7 jam.
  const offsetMs = -zona.getTime(); // 7 jam dalam ms
  const digeser = new Date(instan.getTime() + offsetMs);
  const tahun = digeser.getUTCFullYear();
  const bulan = digeser.getUTCMonth() + 1;
  return { tahun, bulan };
}

/**
 * Bulan dari string DATE "YYYY-MM-DD" (issue_date, tanggal_invoice).
 * DATE tidak punya jam — tidak ada konversi timezone, baca apa adanya.
 * null bila format salah.
 */
export function bulanDariTanggal(s: string): Bulan | null {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(s.trim());
  if (!m) return null;
  return buatRentangBulan(Number(m[1]), Number(m[2]));
}

/** Kunci map per bulan "YYYY-MM". */
export function kunciBulan(b: Bulan): string {
  return bulanKeUrl(b);
}
