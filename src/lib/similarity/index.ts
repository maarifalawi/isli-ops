/*
 * Deteksi kemiripan nama untuk master data (RENCANA-IRISAN-3-CRUD §7, §9).
 *
 * Fungsi: memberi peringatan dini saat user mengetik nama yang mirip dengan
 * baris aktif lain (typo / dobel entri). Hanya WARNING yang bisa
 * dikesampingkan user — BUKAN blokir. Yang memblokir hanya:
 * - customers/vendors: kode unik case-insensitive (exact),
 * - ports/ship_lines: nama kembar persis setelah normalisasi.
 *
 * Aturan mirip(a, b) per RENCANA §7 — dihitung setelah normalisasi
 * (UPPERCASE, trim, kolaps spasi):
 * (a) salah satu nama MENGANDUNG nama lain sebagai substring DAN nama yang
 *     lebih pendek panjangnya >= 4 karakter, ATAU
 * (b) jarak Levenshtein <= 2 untuk nama >= 5 karakter.
 */

/** Panjang minimum sisi pendek pada aturan mengandung (RENCANA §7a). */
export const MIN_PANJANG_MENGANDUNG = 4;
/** Jarak Levenshtein maksimum pada aturan typo (RENCANA §7b). */
export const MAKS_JARAK_LEVENSHTEIN = 2;
/** Panjang minimum nama (sisi panjang) untuk aturan Levenshtein (RENCANA §7b). */
export const MIN_PANJANG_LEVENSHTEIN = 5;

/**
 * @deprecated Tidak dipakai lagi oleh mirip() sejak aturan §7 berlaku.
 * Dipertahankan agar import lama (mis. test integrasi) tidak pecah.
 */
export const AMBANG_MIRIP = 0.85;

/**
 * Normalisasi teks untuk perbandingan sesuai RENCANA §7:
 * huruf besar semua, spasi dikolaps jadi satu, ujung dipangkas.
 * " pt.  meratus  jaya " -> "PT. MERATUS JAYA"
 */
export function normalisasiTeks(teks: string): string {
  return teks.toUpperCase().replace(/\s+/g, " ").trim();
}

/** Jarak edit Levenshtein (jumlah sisip/hapus/ganti minimum). */
export function jarakLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // DP satu baris; aman untuk panjang nama master data (puluhan karakter).
  const baris = Array.from({ length: b.length + 1 }, (_, i) => i);
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
 * Normalisasi internal untuk skor similaritas (huruf kecil, semua karakter
 * non-alfanumerik jadi satu spasi). Hanya untuk pengurutan skor kandidat;
 * TIDAK dipakai oleh mirip() — mirip() pakai normalisasiTeks (§7).
 */
function normalisasiUntukSkor(teks: string): string {
  return teks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Similaritas 0..1 dari dua string (untuk skor/urut kandidat).
 * Dua string kosong dianggap identik (1).
 */
export function similaritasLevenshtein(a: string, b: string): number {
  const na = normalisasiUntukSkor(a);
  const nb = normalisasiUntukSkor(b);
  if (na.length === 0 && nb.length === 0) return 1;
  const panjangMax = Math.max(na.length, nb.length);
  return 1 - jarakLevenshtein(na, nb) / panjangMax;
}

/**
 * Kupas awalan nama badan usaha di awal string (PT / PT. / CV / UD) beserta
 * spasi setelahnya — fixture fixtures/customers-raw.csv menyatakan prefiks
 * entitas seperti "PT", "PT.", "CV", "UD" sebagai noise.
 * "PT MATREE" -> "MATREE"; "PT. MATEREE JAYA" -> "MATEREE JAYA".
 * Nama yang memang diawali kata itu TANPA spasi (mis. "PTUN") tidak disentuh.
 */
function kupasAwalanEntitas(teks: string): string {
  return teks.replace(/^(PT\.?|CV\.?|UD\.?)\s+/i, "").trim();
}

/**
 * Apakah dua nama "mirip" menurut RENCANA §7:
 * (a) salah satu mengandung yang lain (sisi pendek >= 4 karakter), ATAU
 * (b) jarak Levenshtein <= 2 untuk nama >= 5 karakter.
 * Prefiks entitas (PT/PT./CV/UD) dikupas dulu dari kedua sisi karena noise,
 * sehingga "PT MATREE" ↔ "MATREE INDONESIA" terdeteksi mengandung.
 * Dipakai server action untuk menyalakan peringatan kemiripan.
 */
export function mirip(a: string, b: string): boolean {
  const na = kupasAwalanEntitas(normalisasiTeks(a));
  const nb = kupasAwalanEntitas(normalisasiTeks(b));
  if (na.length === 0 || nb.length === 0) return false;

  const pendek = na.length <= nb.length ? na : nb;
  const panjang = na.length > nb.length ? na : nb;

  // Aturan (a): mengandung, sisi pendek minimal 4 karakter.
  if (pendek.length >= MIN_PANJANG_MENGANDUNG && panjang.includes(pendek)) return true;

  // Aturan (b): typo dekat (Levenshtein <= 2) untuk nama >= 5 karakter.
  if (
    panjang.length >= MIN_PANJANG_LEVENSHTEIN &&
    jarakLevenshtein(na, nb) <= MAKS_JARAK_LEVENSHTEIN
  )
    return true;

  return false;
}

/** Satu kandidat duplikat yang ditemukan di antara baris aktif. */
export interface KandidatMirip {
  id: string;
  nama: string;
  /** similaritas 0..1 terhadap input user (hanya untuk urut skor). */
  skor: number;
}

/**
 * Cari kandidat duplikat untuk sebuah input nama di antara baris aktif.
 *
 * - Kandidat: baris yang mirip(input) == true (aturan RENCANA §7).
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
