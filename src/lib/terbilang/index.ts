/*
 * Terbilang — mengubah angka rupiah menjadi huruf Indonesia.
 *
 * Dipakai di invoice: "Terbilang: dua puluh tiga juta delapan ratus empat
 * puluh delapan ribu enam ratus rupiah". Aturan ejaan mengikuti kaidah baku
 * PUEBI yang dipakai di invoice cetak ISLI:
 *
 *   - 11 → "sebelas" (bukan "satu belas"), 12..19 → "dua belas" dst.
 *   - 100 → "seratus", 1.000 → "seribu" (awalan se- hanya untuk satu).
 *   - Skala bertingkat: ribu, juta, miliar, triliun. Kelompok nol dilewati,
 *     jadi 1.001.000 → "satu juta seribu" (tanpa "nol ribu").
 *
 * Hanya menerima nilai non-negatif sampai 999 triliun — di atas itu invoice
 * tidak nyata dan lebih baik menolak daripada mencetak huruf yang salah.
 */

import type { Rupiah } from "../money/index";

const SATUAN = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
] as const;

const SKALA = ["", "ribu", "juta", "miliar", "triliun"] as const;

/** 0..99 → kata, atau "" untuk nol. */
function duaAngka(n: number): string {
  if (n === 0) return "";
  if (n < 10) return SATUAN[n] ?? "";
  if (n === 10) return "sepuluh";
  if (n === 11) return "sebelas";
  if (n < 20) return `${SATUAN[n - 10]} belas`;
  const puluhan = Math.floor(n / 10);
  const satuan = n % 10;
  const kataPuluhan = `${SATUAN[puluhan]} puluh`;
  return satuan === 0 ? kataPuluhan : `${kataPuluhan} ${SATUAN[satuan]}`;
}

/** 0..999 → kata, atau "" untuk nol. */
function tigaAngka(n: number): string {
  const ratusan = Math.floor(n / 100);
  const sisa = n % 100;
  const kataRatusan =
    ratusan === 1 ? "seratus" : ratusan > 1 ? `${SATUAN[ratusan]} ratus` : "";
  const bawah = duaAngka(sisa);
  return [kataRatusan, bawah].filter(Boolean).join(" ");
}

/**
 * Angka rupiah → huruf Indonesia, selalu diakhiri "rupiah".
 *
 * @example terbilang(rupiah(23_848_600n))
 * // => "dua puluh tiga juta delapan ratus empat puluh delapan ribu enam ratus rupiah"
 */
export function terbilang(value: Rupiah): string {
  if (value < 0n) {
    throw new RangeError(
      `terbilang hanya menerima nilai non-negatif, diterima ${value}.`,
    );
  }
  // 1.000 triliun = 1 kuadriliun: di luar skala invoice nyata.
  if (value >= 1_000_000_000_000_000n) {
    throw new RangeError(
      "nilai di luar rentang terbilang (0 sampai 999 triliun rupiah).",
    );
  }
  if (value === 0n) return "nol rupiah";

  // Pecah per tiga digit, dari satuan ke atas.
  const kelompok: number[] = [];
  let sisa: bigint = value;
  while (sisa > 0n) {
    kelompok.push(Number(sisa % 1_000n));
    sisa /= 1_000n;
  }

  const bagian: string[] = [];
  for (let i = kelompok.length - 1; i >= 0; i--) {
    const angka = kelompok[i];
    // kelompok nol (atau indeks di luar batas) dilewati:
    // 1.001.000 → "satu juta seribu", tanpa "nol ribu".
    if (angka === undefined || angka === 0) continue;
    if (i === 1 && angka === 1) {
      bagian.push("seribu"); // "seribu", bukan "satu ribu"
      continue;
    }
    bagian.push(i === 0 ? tigaAngka(angka) : `${tigaAngka(angka)} ${SKALA[i]}`);
  }

  return `${bagian.join(" ")} rupiah`;
}
