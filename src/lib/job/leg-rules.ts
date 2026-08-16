/*
 * Validasi kombinasi leg — R10 (docs/DOMAIN-RULES.md baris 354-412).
 *
 * DUA TINGKAT PENEGAKAN YANG SENGAJA DIPISAH — jangan dicampur:
 *
 *   TINGKAT KERAS (mirror ck_legs, drizzle/0000 baris 167-168):
 *     - Minimal satu leg wajib dicentang.
 *     - `1+3` tanpa `2` MUTLAK DILARANG ("Satu tiga nggak mungkin." — Pak Indra).
 *     Berlaku untuk SEMUA segmen (DOM/EXP/IMP). Database adalah backstop
 *     terakhir; validasi di sini hanya supaya pesannya ramah, bukan pengganti
 *     constraint.
 *
 *   TINGKAT LUNAK (aplikasi) — HANYA domestik:
 *     - Job domestik default-nya `1+2+3`. Boleh menyimpang, TAPI wajib mengisi
 *       `leg_override_alasan` (alasan itu masuk audit_log).
 *     - EXPORT & IMPORT TIDAK punya jalur lunak: kombinasi di luar matriks
 *       ditolak keras, dan kombinasi valid diterima langsung tanpa alasan.
 *
 * CATATAN R11 / Q19 (job non-shipment): sampai Q19 dijawab, TIDAK ada
 * pelonggaran "0 leg". Semua job — termasuk non-shipment — tetap wajib >=1 leg
 * (lihat docs/OPEN-QUESTIONS.md). Modul ini tidak mengenal pengecualian itu.
 */

import type { SeqScope } from "@/lib/job-number/index";

/** Segmen job = seq_scope (DOM/EXP/IMP). */
export type Segmen = SeqScope;

/** Tiga leg R10. */
export interface PilihanLeg {
  /** Leg 1: gudang customer → pelabuhan asal. */
  trucking: boolean;
  /** Leg 2: pelabuhan asal → pelabuhan tujuan (laut/udara). */
  freight: boolean;
  /** Leg 3: pelabuhan tujuan → alamat tujuan akhir. */
  delivery: boolean;
}

export type HasilValidasiLeg =
  | {
      ok: true /** true bila domestik menyimpang dari default 1+2+3. */;
      perluAlasan: boolean;
    }
  | { ok: false; error: string };

/** Default domestik: 1+2+3 door-to-door. */
export const LEG_DEFAULT_DOMESTIK: Readonly<PilihanLeg> = {
  trucking: true,
  freight: true,
  delivery: true,
};

/** Apakah ada minimal satu leg. */
export function adaMinimalSatuLeg(legs: PilihanLeg): boolean {
  return legs.trucking || legs.freight || legs.delivery;
}

/** Apakah kombinasi 1+3 tanpa 2 (mustahil secara fisik). */
export function isSatuTigaTanpaDua(legs: PilihanLeg): boolean {
  return legs.trucking && legs.delivery && !legs.freight;
}

/**
 * Lolos pagar KERAS R10 (mirror ck_legs). true = kombinasi sah menurut matriks;
 * false = akan ditolak keras (0 leg atau 1+3 tanpa 2).
 */
export function isKombinasiLegSah(legs: PilihanLeg): boolean {
  return adaMinimalSatuLeg(legs) && !isSatuTigaTanpaDua(legs);
}

/** Apakah tepat kombinasi default domestik 1+2+3. */
export function isDefaultDomestik(legs: PilihanLeg): boolean {
  return legs.trucking && legs.freight && legs.delivery;
}

/**
 * Validasi lengkap R10 untuk satu job.
 *
 * @param segmen DOM = domestik (punya tingkat lunak); EXP/IMP = hanya keras.
 * @param legs kombinasi leg terpilih.
 * @param overrideAlasan alasan penyimpangan (hanya bermakna untuk domestik).
 */
export function validasiLeg(
  segmen: Segmen,
  legs: PilihanLeg,
  overrideAlasan?: string | null,
): HasilValidasiLeg {
  // ── TINGKAT KERAS (semua segmen) — mirror ck_legs ──
  if (!adaMinimalSatuLeg(legs)) {
    return { ok: false, error: "Minimal satu leg wajib dicentang (R10)." };
  }
  if (isSatuTigaTanpaDua(legs)) {
    return {
      ok: false,
      error:
        "Kombinasi leg 1+3 tanpa leg 2 tidak mungkin (R10). Barang tidak bisa " +
        "berpindah antar pelabuhan tanpa freight.",
    };
  }

  // ── TINGKAT LUNAK — HANYA domestik ──
  if (segmen === "DOM") {
    const menyimpang = !isDefaultDomestik(legs);
    if (menyimpang && !overrideAlasan?.trim()) {
      return {
        ok: false,
        error:
          "Job domestik default-nya 1+2+3. Kalau kombinasi leg diubah, alasan " +
          "wajib diisi (R10).",
      };
    }
    return { ok: true, perluAlasan: menyimpang };
  }

  // ── EXPORT / IMPORT ──
  // Tidak ada jalur lunak. Kombinasi matriks yang sah diterima langsung tanpa
  // alasan; kombinasi di luar matriks sudah ditolak keras di atas.
  return { ok: true, perluAlasan: false };
}
