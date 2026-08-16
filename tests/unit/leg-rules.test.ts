/*
 * Test matriks leg R10 (docs/DOMAIN-RULES.md baris 354-412).
 *
 * Satu test per baris matriks, untuk ketiga segmen, plus dua tingkat
 * penegakan yang dipisah:
 *   - KERAS: 0 leg dan 1+3-tanpa-2 ditolak untuk SEMUA segmen.
 *   - LUNAK: domestik di luar 1+2+3 butuh alasan; EXPORT/IMPORT tidak.
 */

import { describe, expect, it } from "vitest";
import {
  type PilihanLeg,
  type Segmen,
  isKombinasiLegSah,
  validasiLeg,
} from "../../src/lib/job/leg-rules";

/** Helper ringkas: leg dari triple boolean [1,2,3]. */
function L(t: boolean, f: boolean, d: boolean): PilihanLeg {
  return { trucking: t, freight: f, delivery: d };
}

/** Semua kombinasi matriks R10 yang SAH (menurut pagar keras). */
const KOMBINASI_SAH: { nama: string; legs: PilihanLeg }[] = [
  { nama: "1 saja (trucking lokal)", legs: L(true, false, false) },
  { nama: "2 saja (port-to-port)", legs: L(false, true, false) },
  { nama: "3 saja (dooring)", legs: L(false, false, true) },
  { nama: "1+2 (gudang → pelabuhan tujuan)", legs: L(true, true, false) },
  { nama: "2+3 (pelabuhan asal → alamat)", legs: L(false, true, true) },
  { nama: "1+2+3 (door-to-door)", legs: L(true, true, true) },
];

/** Kombinasi yang DITOLAK KERAS untuk semua segmen. */
const KOMBINASI_TOLAK_KERAS: { nama: string; legs: PilihanLeg }[] = [
  { nama: "1+3 tanpa 2 (mustahil)", legs: L(true, false, true) },
  { nama: "tanpa leg sama sekali", legs: L(false, false, false) },
];

const SEMUA_SEGMEN: Segmen[] = ["DOM", "EXP", "IMP"];

describe("R10 — pagar keras (semua segmen)", () => {
  for (const { nama, legs } of KOMBINASI_SAH) {
    it(`isKombinasiLegSah TRUE untuk ${nama}`, () => {
      expect(isKombinasiLegSah(legs)).toBe(true);
    });
  }

  for (const { nama, legs } of KOMBINASI_TOLAK_KERAS) {
    it(`isKombinasiLegSah FALSE untuk ${nama}`, () => {
      expect(isKombinasiLegSah(legs)).toBe(false);
    });
  }

  for (const segmen of SEMUA_SEGMEN) {
    for (const { nama, legs } of KOMBINASI_TOLAK_KERAS) {
      it(`${segmen}: ${nama} DITOLAK meski ada alasan (keras tak bisa ditawar)`, () => {
        const hasil = validasiLeg(segmen, legs, "alasan apa pun");
        expect(hasil.ok).toBe(false);
      });
    }
  }
});

describe("R10 — EXPORT & IMPORT: kombinasi sah diterima TANPA alasan", () => {
  for (const segmen of ["EXP", "IMP"] as const) {
    for (const { nama, legs } of KOMBINASI_SAH) {
      it(`${segmen}: ${nama} diterima tanpa alasan`, () => {
        const hasil = validasiLeg(segmen, legs);
        expect(hasil).toEqual({ ok: true, perluAlasan: false });
      });
    }
  }
});

describe("R10 — DOMESTIK: dua tingkat penegakan", () => {
  it("default 1+2+3 diterima tanpa alasan (perluAlasan false)", () => {
    const hasil = validasiLeg("DOM", L(true, true, true));
    expect(hasil).toEqual({ ok: true, perluAlasan: false });
  });

  it("menyimpang dari default TANPA alasan → DITOLAK (leg 2 saja)", () => {
    const hasil = validasiLeg("DOM", L(false, true, false));
    expect(hasil.ok).toBe(false);
  });

  it("menyimpang dari default DENGAN alasan → DITERIMA, perluAlasan true (leg 2 saja)", () => {
    const hasil = validasiLeg("DOM", L(false, true, false), "customer antar sendiri");
    expect(hasil).toEqual({ ok: true, perluAlasan: true });
  });

  it("alasan berisi spasi saja dianggap kosong → DITOLAK", () => {
    const hasil = validasiLeg("DOM", L(false, true, false), "   ");
    expect(hasil.ok).toBe(false);
  });

  it("setiap kombinasi sah non-default domestik butuh alasan", () => {
    const nonDefault = KOMBINASI_SAH.filter(
      (k) => !(k.legs.trucking && k.legs.freight && k.legs.delivery),
    );
    for (const { legs } of nonDefault) {
      expect(validasiLeg("DOM", legs).ok).toBe(false); // tanpa alasan ditolak
      expect(validasiLeg("DOM", legs, "alasan sah")).toEqual({
        ok: true,
        perluAlasan: true,
      });
    }
  });
});
