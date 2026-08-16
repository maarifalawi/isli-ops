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
 * Menerapkan tarif basis poin, dibulatkan KE ATAS (ceiling) sesuai DOMAIN-RULES
 * R3.6 — keputusan Q05 dijawab 13 Agu 2026 (docs/JAWABAN-KLIEN.md).
 *
 * Semua pajak (PPN, PPh 23, withhold) WAJIB lewat fungsi ini. Jangan pernah
 * menulis `base * 0.011` — itu float dan dilarang (ADR-0002).
 *
 * Ceiling matematis: ke arah +tak hingga. Untuk basis positif (satu-satunya
 * kasus pajak nyata) ini berarti naik ke rupiah berikutnya kalau ada pecahan.
 * Basis negatif tidak mungkin muncul di pajak customer (divalidasi di hulu),
 * tapi tetap ditangani konsisten di sini.
 *
 * Kasus Diametral 07-003 membuktikan aturan ini:
 *   PPN  = ceil(132.623.041 × 1,1%) = ceil(1.458.853,451) = 1.458.854
 *   PPh  = ceil(132.623.041 × 2%)   = ceil(2.652.460,82)  = 2.652.461
 *
 * @example applyRateBp(rupiah(22_600_000n), PPN_RATE_BP) // => 248_600n
 */
export function applyRateBp(base: Rupiah, bp: BasisPoints | number): Rupiah {
  const numerator = base * BigInt(bp);
  const denominator = 10_000n;
  if (numerator % denominator === 0n) return (numerator / denominator) as Rupiah;
  // Pembagian bigint memotong ke arah nol; untuk hasil negatif itu sudah sama
  // dengan ceiling matematis, untuk hasil positif perlu ditambah satu.
  const truncated = numerator / denominator;
  return (numerator < 0n ? truncated : truncated + 1n) as Rupiah;
}

/**
 * Konversi USD → IDR untuk charge line EXIM (Irisan 4c, DOMAIN-RULES R8.1/R8.2).
 *
 * PENTING — pembulatan BEDA dari pajak. R8.2 berbunyi persis
 * `amount_idr = round(amount_usd * fx_rate)` — ROUND (pembulatan ke terdekat,
 * half away from zero), BUKAN ceiling. Pembulatan ceiling (`applyRateBp`) hanya
 * untuk PPN/PPh 23 (R3.6/Q05). JANGAN memakai applyRateBp di sini; kalau
 * tertukar, invoice EXIM bisa meleset Rp 1 dari lembar SO klien.
 *
 * Konvensi unit (dikonfirmasi src/lib/job/index.ts & schema jobs):
 *   - `usd`      : USD UTUH (integer, bukan sen).
 *   - `kursX100` : kurs dikali 100 (integer). 18.200 → 1_820_000.
 *   - idr_exact  = usd * kursX100 / 100  → dibulatkan ke rupiah terdekat.
 *
 * Semua bigint; tidak ada float sama sekali (ADR-0002). Half-up dilakukan
 * dengan menambah setengah pembagi (50) sebelum membagi 100.
 *
 * Menolak input tidak wajar (melempar, tidak mengembalikan nilai diam-diam):
 *   - kurs ≤ 0   → RangeError (kurs wajib positif; R8.1 kurs manual per job).
 *   - usd  < 0   → RangeError (nilai charge line tidak boleh negatif).
 *
 * @example konversiUsdKeIdr(510n, 1_830_000n) // => 9_333_000n (USD 510 × 18.300)
 */
export function konversiUsdKeIdr(usd: bigint, kursX100: bigint): Rupiah {
  if (kursX100 <= 0n) {
    throw new RangeError(
      `Kurs (x100) harus lebih besar dari nol, diterima ${kursX100}. Isi kurs USD job terlebih dahulu (R8.1).`,
    );
  }

  if (usd < 0n) {
    throw new RangeError(`Nilai USD tidak boleh negatif, diterima ${usd}.`);
  }
  // idr_exact = usd * kursX100 / 100. Pembulatan half-up (half away from zero);
  // untuk usd ≥ 0 & kurs > 0, numerator ≥ 0, jadi cukup +50 lalu bagi 100.
  const numerator = usd * kursX100;
  const denominator = 100n;
  return ((numerator + denominator / 2n) / denominator) as Rupiah;
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
  // Pembulatan ke persepuluh terdekat, menjauhi nol (half away from zero) —
  // sama dengan perilaku Excel ROUND() dan applyRateBp di atas. Pembagian
  // bigint saja memotong (truncate), yang membuat 15,5657% tampil 15,5%
  // padahal di lembar SO tertulis 15,6%.
  const negative = numerator < 0n;
  const absoluteNumerator = negative ? -numerator : numerator;
  const absoluteDenominator = denominator < 0n ? -denominator : denominator;
  const tenths =
    (absoluteNumerator * 1_000n + absoluteDenominator / 2n) / absoluteDenominator;
  const asNumber = Number(negative ? -tenths : tenths) / 10;
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
