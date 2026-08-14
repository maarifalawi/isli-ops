/*
 * Uji properti applyRateBp: hasil TIDAK PERNAH mengandung desimal — selalu
 * integer bigint, dan selalu merupakan ceiling dari base × bp / 10.000.
 *
 * Dipakai PRNG deterministik (mulberry32) supaya test bisa diulang dengan
 * hasil sama dan tidak menambah dependency (fast-check ditolak: uang & pajak
 * hanya boleh bergantung pada bigint bawaan).
 */

import { describe, expect, it } from "vitest";
import { applyRateBp, rupiah } from "../../src/lib/money/index";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("properti applyRateBp", () => {
  it("tidak pernah menghasilkan desimal — hasil selalu integer bigint", () => {
    const acak = mulberry32(20260813);
    for (let i = 0; i < 1000; i++) {
      // Basis sampai 1 triliun rupiah — jauh di atas total tahunan ISLI.
      const base = BigInt(Math.floor(acak() * 1_000_000_000_000));
      const bp = Math.floor(acak() * 2000); // 0..1999 bp
      const hasil = applyRateBp(rupiah(base), bp);

      expect(typeof hasil).toBe("bigint");

      // Batas ceiling: base×bp/10.000 <= hasil < base×bp/10.000 + 1.
      const pembilang = base * BigInt(bp);
      expect(hasil * 10_000n >= pembilang).toBe(true);
      expect(hasil * 10_000n < pembilang + 10_000n).toBe(true);
    }
  });

  it("monoton: basis lebih besar tidak pernah menghasilkan pajak lebih kecil", () => {
    const acak = mulberry32(13);
    for (let i = 0; i < 500; i++) {
      const kecil = BigInt(Math.floor(acak() * 500_000_000_000));
      const besar = kecil + BigInt(Math.floor(acak() * 500_000_000));
      const bp = Math.floor(acak() * 2000);
      expect(applyRateBp(rupiah(besar), bp) >= applyRateBp(rupiah(kecil), bp)).toBe(true);
    }
  });
});
