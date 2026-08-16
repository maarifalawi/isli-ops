/*
 * Validasi charge line — logika MURNI (tanpa DB), Irisan 4b.
 *
 * Dipisah dari index.ts supaya bisa diuji unit tanpa DATABASE_URL, pola sama
 * dengan src/lib/job/leg-rules.ts. Semua uang di sini `bigint` rupiah bulat
 * (ADR-0002); TIDAK ada aritmetika pajak/konversi di sini.
 *
 * Dua aturan yang ditegakkan:
 *   R4.3 at-cost — kalau is_at_cost true, selling WAJIB sama dengan buying
 *        (pencadangan). Sistem menolak kalau tidak sama. Ini juga di-backstop
 *        oleh CHECK ck_charge_line_at_cost di DB.
 *   R10 leg     — kalau diisi, leg hanya boleh 1, 2, atau 3 (boleh kosong).
 *
 * Kewajiban vendor (R15) TIDAK di sini karena butuh baca master charge_codes
 * (butuh_vendor) — itu di index.ts (lapis DB), sesuai R15.4.
 */

export const CURRENCIES = ["IDR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Field charge line yang divalidasi (semua uang bigint bulat). */
export interface ChargeLineFields {
  /** Nominal jual dalam IDR. Untuk baris USD ini nilai HASIL konversi (boleh 0 saat validasi murni, konversi terjadi di lapis DB). */
  sellingIdr: bigint;
  /** Sisi buying (perkiraan) dalam IDR. */
  pencadanganIdr: bigint;
  /** R4.3 — kalau true, selling wajib = pencadangan. */
  isAtCost: boolean;
  /** R10 — 1|2|3 atau null. */
  leg: number | null;
  currency: string;
  /*
   * Irisan 4c — nilai NATIVE USD (utuh, bukan sen). WAJIB untuk currency='USD',
   * HARUS null/undefined untuk currency='IDR'. Validasi at-cost R4.3 dan
   * non-negatif dilakukan pada mata uang NATIVE supaya pesan errornya sesuai
   * dengan angka yang user ketik, bukan hasil konversi.
   */
  sellingUsd?: bigint | null;
  pencadanganUsd?: bigint | null;
  actualUsd?: bigint | null;
}

export type HasilValidasi = { ok: true } | { ok: false; error: string };

/** R10: leg baris hanya boleh 1, 2, 3, atau kosong (null). */
export function isLegSah(leg: number | null | undefined): boolean {
  if (leg === null || leg === undefined) return true;
  return leg === 1 || leg === 2 || leg === 3;
}

/** Currency hanya IDR|USD (tanpa konversi di 4b). */
export function isCurrencySah(currency: string): currency is Currency {
  return (CURRENCIES as readonly string[]).includes(currency);
}

/**
 * R4.3: baris at-cost WAJIB selling = buying (pencadangan). Selain at-cost,
 * kombinasi apa pun boleh (margin/rugi diputuskan di tempat lain).
 */
export function isAtCostSeimbang(f: {
  isAtCost: boolean;
  sellingIdr: bigint;
  pencadanganIdr: bigint;
}): boolean {
  if (!f.isAtCost) return true;
  return f.sellingIdr === f.pencadanganIdr;
}

/**
 * Irisan 4c — konsistensi mata uang native. Dikembalikan sebagai HasilValidasi
 * supaya pesan errornya spesifik (bahasa Indonesia, menyebut tindakan).
 *
 * Aturan:
 *   currency='USD' → sellingUsd & pencadanganUsd WAJIB terisi; ketiganya (bila
 *     ada) non-negatif; kalau at-cost, selling_usd = pencadangan_usd (R4.3 pada
 *     mata uang native — bukan hasil konversi).
 *   currency='IDR' → ketiga kolom *_usd HARUS kosong (null/undefined). Cermin
 *     dari CHECK ck_charge_line_usd_native di DB.
 */
export function validasiCurrencyNative(f: ChargeLineFields): HasilValidasi {
  const s = f.sellingUsd ?? null;
  const p = f.pencadanganUsd ?? null;
  const a = f.actualUsd ?? null;

  if (f.currency === "IDR") {
    if (s !== null || p !== null || a !== null) {
      return {
        ok: false,
        error:
          "Baris IDR tidak boleh punya nilai USD. Ubah mata uang ke USD, atau " +
          "kosongkan kolom USD.",
      };
    }
    return { ok: true };
  }

  // currency === "USD"
  if (s === null || p === null) {
    return {
      ok: false,
      error: "Baris USD wajib mengisi nilai jual dan nilai beli dalam USD.",
    };
  }
  if (s < 0n || p < 0n || (a !== null && a < 0n)) {
    return { ok: false, error: "Nilai USD tidak boleh negatif." };
  }
  if (f.isAtCost && s !== p) {
    return {
      ok: false,
      error:
        "Baris at-cost wajib punya nilai jual USD sama persis dengan nilai beli " +
        "USD (R4.3). Kalau memang ada margin, jangan tandai sebagai at-cost.",
    };
  }
  return { ok: true };
}

/**
 * Validasi lengkap satu charge line (aturan yang tidak butuh master data).
 * Pesan error dalam bahasa Indonesia, menyebut apa yang harus dilakukan.
 */
export function validasiChargeLine(f: ChargeLineFields): HasilValidasi {
  if (!isCurrencySah(f.currency)) {
    return { ok: false, error: "Mata uang harus IDR atau USD." };
  }
  if (!isLegSah(f.leg)) {
    return { ok: false, error: "Leg harus 1, 2, 3, atau kosong (R10)." };
  }
  if (f.sellingIdr < 0n) {
    return { ok: false, error: "Nilai jual tidak boleh negatif." };
  }
  if (f.pencadanganIdr < 0n) {
    return { ok: false, error: "Nilai beli (pencadangan) tidak boleh negatif." };
  }
  if (!isAtCostSeimbang(f)) {
    return {
      ok: false,
      error:
        "Baris at-cost wajib punya nilai jual sama persis dengan nilai beli " +
        "(R4.3). Kalau memang ada margin, jangan tandai sebagai at-cost.",
    };
  }
  return { ok: true };
}
