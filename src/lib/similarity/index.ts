/*
 * Deteksi kemiripan nama untuk master data (RENCANA-IRISAN-3-CRUD §3.1, §9).
 *
 * Fungsi: memberi peringatan dini saat user mengetik nama yang mirip dengan
 * baris aktif lain (typo / dobel entri). Hanya WARNING yang bisa
 * dikesampingkan user — BUKAN blokir. Yang memblokir hanya:
 * - customers/vendors: kode unik case-insensitive (exact),
 * - ports/ship_lines: nama kembar persis setelah normalisasi.
 *
 * Aturan main (RENCANA §3.1):
 * - Perbandingan case-insensitive; spasi ekstra & tanda baca diabaikan.
 * - mirip(a, b) = TRUE bila similaritas(normalisasi(a), normalisasi(b)) >= 0.85.
 * - Ambang bisa disetel lewat OPEN-QUESTIONS.md bila klien minta lain.
 *
 * Algoritma: Levenshtein jarak-edit klasik, similaritas = 1 - jarak/panjangMax.
 */

/** Ambang similaritas (0..1); >= nilai ini dianggap mirip. RENCANA §3.1. */
export const AMBANG_MIRIP = 0.85;

/**
 * Normalisasi teks untuk perbandingan: huruf kecil, semua karakter
 * non-alfanumerik jadi satu spasi, spasi dipadatkan, ujung dipangkas.
 * "KM.  Meratus " -> "km meratus"
 */
export function normalisasiTeks(teks: string): string {
  return teks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Jarak edit Levenshtein (jumlah sisip/hapus/ganti minimum). */
export function jarakLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // DP satu baris; aman untuk panjang nama master data (puluhan karakter).
  let baris = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let kiriAtas = baris[0] as number;
    baris[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const atas = baris[j] as number;
      const biayaGanti = a[i - 1] === b[j - 1] ? 0 : 1;
      baris[j] = Math.min(
        atas + 1, // hapus
        (baris[j - 1] as number) + 1, // sisip
        kiriAtas + biayaGanti, // ganti
      );
      kiriAtas = atas;
    }
  }
  return baris[b.length] as number;
}

/**
 * Similaritas 0..1 dari dua string (dihitung pada teks TER-NORMALISASI).
 * Dua string kosong dianggap identik (1). Pemanggil tidak perlu
 * menormalisasi sendiri — fungsi ini yang melakukannya.
 */
export function similaritasLevenshtein(a: string, b: string): number {
  const na = normalisasiTeks(a);
  const nb = normalisasiTeks(b);
  if (na.length === 0 && nb.length === 0) return 1;
  const panjangMax = Math.max(na.length, nb.length);
  return 1 - jarakLevenshtein(na, nb) / panjangMax;
}

/**
 * Apakah dua teks "mirip" (>= AMBANG_MIRIP setelah normalisasi)?
 * Dipakai server action untuk menyalakan peringatan kemiripan.
 */
export function mirip(a: string, b: string, ambang: number = AMBANG_MIRIP): boolean {
  return similaritasLevenshtein(a, b) >= ambang;
}

/** Satu kandidat duplikat yang ditemukan di antara baris aktif. */
export interface KandidatMirip {
  id: string;
  nama: string;
  /** similaritas 0..1 terhadap input user. */
  skor: number;
}

/**
 * Cari kandidat duplikat untuk sebuah input nama di antara baris aktif.
 *
 * - Kandidat: baris yang mirip(input) == true.
 * - Bila idKecuali diberikan, baris dengan id itu dilewati (mode EDIT:
 *   jangan bandingkan baris dengan dirinya sendiri).
 * - Hasil diurutkan skor menurun, maksimum `maks` kandidat.
 *
 * Kompleksitas O(n * panjang) — n baris aktif master data cuma ratusan,
 * jadi aman dipanggil tiap submit tanpa indeks khusus.
 */
export function cariKandidatMirip(
  input: string,
  baris: ReadonlyArray<{ id: string; nama: string }>,
  opsi?: { idKecuali?: string; maks?: number },
): KandidatMirip[] {
  const maks = opsi?.maks ?? 5;
  const hasil: KandidatMirip[] = [];
  for (const b of baris) {
    if (opsi?.idKecuali !== undefined && b.id === opsi.idKecuali) continue;
    if (!mirip(input, b.nama)) continue;
    hasil.push({ id: b.id, nama: b.nama, skor: similaritasLevenshtein(input, b.nama) });
  }
  hasil.sort((x, y) => y.skor - x.skor);
  return hasil.slice(0, maks);
}
