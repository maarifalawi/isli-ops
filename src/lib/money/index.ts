/*
 * Uang — satu-satunya pintu masuk.
 *
 * ATURAN YANG TIDAK BISA DITAWAR
 *
 * 1. Semua nilai uang adalah `bigint` rupiah BULAT. Tidak ada float, tidak ada
 *    desimal, tidak ada `number`. JavaScript `number` kehilangan presisi di atas
 *    2^53, dan total tahunan ISLI sudah menyentuh miliaran rupiah.
 *
 * 2. Tidak ada pustaka uang (dinero.js, big.js). Ditolak di docs/TOOLCHAIN.md §5.
 *    Rupiah tidak punya satuan pecahan yang dipakai — bigint sudah cukup dan
 *    tidak menambah dependensi yang harus dipercaya untuk urusan pajak.
 *
 * 3. Komponen React DILARANG mengimpor berkas ini untuk berhitung. Hanya untuk
 *    memformat. Ditegakkan mekanis oleh .dependency-cruiser.cjs.
 */

/** Rupiah bulat. Bertanda (branded) supaya tidak tertukar dengan bigint biasa. */
export type Rupiah = bigint & { readonly __brand: "Rupiah" };

/** Basis poin. 10.000 bp = 100%. */
export type BasisPoints = number & { readonly __brand: "BasisPoints" };

export const PPN_RATE_BP = 110 as BasisPoints; // 1,1%
export const PPH23_RATE_BP = 200 as BasisPoints; // 2%

export const ZERO = 0n as Rupiah;

/** Membuat Rupiah dari bilangan bulat. Menolak pecahan dan nilai tidak wajar. */
export function rupiah(value: bigint | number): Rupiah {
  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      throw new RangeError(
        `Rupiah harus bilangan bulat, diterima ${value}. Kalau ini hasil pembagian, bulatkan dulu lewat applyRateBp().`,
      );
    }
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(
        `Nilai ${value} di luar rentang aman number. Pakai bigint literal (contoh: 23_600_000n).`,
      );
    }
    return BigInt(value) as Rupiah;
  }
  return value as Rupiah;
}

export function add(...values: readonly Rupiah[]): Rupiah {
  let total = 0n;
  for (const v of values) total += v;
  return total as Rupiah;
}

export function subtract(a: Rupiah, b: Rupiah): Rupiah {
  return (a - b) as Rupiah;
}

export function sum(values: readonly Rupiah[]): Rupiah {
  let total = 0n;
  for (const v of values) total += v;
  return total as Rupiah;
}

export function isNegative(value: Rupiah): boolean {
  return value < 0n;
}

/**
 * Menerapkan tarif basis poin, dibulatkan ke rupiah terdekat.
 *
 * Pembulatan: half away from zero (0,5 dibulatkan menjauhi nol).
 * Ini menyamai perilaku Excel `ROUND()`, yang dipakai Bu Niken di berkas
 * sumber — jadi angka sistem cocok dengan angka yang selama ini beliau hitung.
 *
 * CATATAN: JANGAN diganti ke banker's rounding tanpa ADR. Selisih Rp 1 pada
 * invoice Diametral sedang diselidiki (pertanyaan A2 ke Bu Niken) dan mengubah
 * mode pembulatan akan menyamarkan penyebabnya.
 *
 * @example applyRateBp(rupiah(22_600_000n), PPN_RATE_BP) // => 248_600n
 */
export function applyRateBp(base: Rupiah, bp: BasisPoints | number): Rupiah {
  const numerator = base * BigInt(bp);
  const denominator = 10_000n;
  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  // PEMBULATAN KE ATAS (ceiling), bukan setengah ke atas.
  //
  // Ditetapkan klien 13 Agu 2026, dan terbukti cocok dengan dua invoice cetak:
  //
  //   Diametral  DPP 132.623.041 x 1,1% = 1.458.853,451
  //     ke atas        -> 1.458.854  -> grand 131.429.434  = invoice cetak
  //     setengah ke atas -> 1.458.853 -> grand 131.429.433  = MELESET Rp 1
  //
  //   Materee    DPP  22.600.000 x 1,1% =   248.600,000
  //     kedua cara sama -> grand 23.848.600 = invoice cetak
  //
  // Diametral adalah kasus pembeda: hanya ke atas yang cocok. Jangan diganti
  // jadi Math.round, banker's rounding, atau setengah ke atas tanpa ADR baru.
  // Selisih Rp 1 di sini pernah jadi blocker selama dua hari.
  //
  // Untuk nilai negatif: dibulatkan menjauhi nol, supaya besarannya konsisten
  // dengan sisi positif.
  const rounded = (absolute + denominator - 1n) / denominator;
  return (negative ? -rounded : rounded) as Rupiah;
}

/**
 * Format untuk tampilan. Tanpa awalan "Rp" — di tabel, satuan ditaruh di
 * kepala kolom, bukan diulang di tiap sel (docs/DESIGN-SYSTEM.md).
 *
 * Negatif memakai kurung, konvensi akuntansi Indonesia: (1.500.000)
 */
export function formatIdr(value: Rupiah): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const formatted = absolute.toLocaleString("id-ID");
  return negative ? `(${formatted})` : formatted;
}

/** Format dengan awalan "Rp" — untuk PDF invoice dan judul, bukan sel tabel. */
export function formatIdrPrefixed(value: Rupiah): string {
  return `Rp ${formatIdr(value)}`;
}

/** Persentase satu desimal, untuk kolom GP% dan NETT%. */
export function formatPercent(numerator: Rupiah, denominator: Rupiah): string {
  if (denominator === 0n) return "\u2014";
  // Kali 1000 dulu supaya satu desimal tetap presisi di bigint.
  const tenths = (numerator * 1_000n) / denominator;
  const asNumber = Number(tenths) / 10;
  return `${asNumber.toLocaleString("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

/** Simpan ke Postgres BIGINT. Drizzle mode bigint menerima bigint langsung. */
export function toDb(value: Rupiah): bigint {
  return value;
}

/** Baca dari Postgres BIGINT. */
export function fromDb(value: bigint | string): Rupiah {
  return (typeof value === "string" ? BigInt(value) : value) as Rupiah;
}
