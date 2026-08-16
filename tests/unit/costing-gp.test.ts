/*
 * UNIT TEST — fungsi murni GP/GP%/NETT Irisan 4d (src/lib/costing).
 *
 * Keputusan yang dikunci di sini (jawaban user atas Q-4d-1/2/3, 16 Agu 2026):
 *
 *   Q-4d-1 STATUS QUO R4.2:
 *     GP   = SUM(selling_idr WHERE is_reimburse=false) − SUM(pencadangan_idr SEMUA)
 *     NETT = SUM(selling_idr WHERE is_reimburse=false) + ppn − SUM(pencadangan_idr SEMUA)
 *     Reimburse KELUAR dari selling, TETAP MASUK buying. ADR-0007 tetap
 *     BELUM DIPUTUSKAN — tidak ada rumus simetris di sini.
 *   Q-4d-2 basis buying = pencadangan_idr (bukan actual_idr; variance terpisah).
 *   Q-4d-3 basis selling = baris charge_lines aktif (deleted_at IS NULL).
 *
 * Semua bigint (ADR-0002). Tidak ada float, tidak ada Number() di hitungan.
 */

import { describe, expect, it } from "vitest";
import {
  type GpLine,
  hitungGP,
  hitungGPpct,
  hitungNETT,
  isLoss,
} from "../../src/lib/costing/index";
import { type Rupiah, rupiah } from "../../src/lib/money/index";

const line = (
  sellingIdr: bigint,
  pencadanganIdr: bigint,
  isReimburse = false,
  deletedAt: Date | null = null,
): GpLine => ({
  sellingIdr: rupiah(sellingIdr),
  pencadanganIdr: rupiah(pencadanganIdr),
  isReimburse,
  deletedAt,
});

describe("hitungGP — status quo R4.2 (Q-4d-1)", () => {
  it("job sederhana: GP = selling − semua buying", () => {
    expect(hitungGP([line(10_000_000n, 7_000_000n)])).toBe(3_000_000n);
  });

  it("reimburse KELUAR dari selling tapi TETAP MASUK buying", () => {
    const hasil = hitungGP([
      line(10_000_000n, 7_000_000n),
      line(645_000n, 645_000n, true), // CHARGE LOLO vs THC LOLO, pola ADR-0007
    ]);
    expect(hasil).toBe(10_000_000n - 7_645_000n); // 2_355_000
  });

  it("campuran IDR + USD: fungsi hanya melihat *_idr beku (4c), tidak ada konversi lagi", () => {
    // USD 510 × 18.300 sudah dibekukan jadi 9.333.000 saat tulis (R8.2).
    const hasil = hitungGP([
      line(9_333_000n, 9_333_000n), // baris USD, *_idr murni
      line(5_000_000n, 3_000_000n), // baris IDR
    ]);
    expect(hasil).toBe(2_000_000n);
  });

  it("job tanpa charge line → null (belum ada data), BUKAN Rp0", () => {
    expect(hitungGP([])).toBeNull();
  });

  it("baris soft-deleted tidak ikut terjumlah", () => {
    const hasil = hitungGP([
      line(10_000_000n, 7_000_000n),
      line(99_000_000n, 99_000_000n, false, new Date("2026-08-16")),
    ]);
    expect(hasil).toBe(3_000_000n);
  });

  it("semua baris soft-deleted → null", () => {
    expect(hitungGP([line(1n, 1n, false, new Date())])).toBeNull();
  });

  it("rugi menghasilkan GP negatif", () => {
    expect(hitungGP([line(1_000_000n, 2_000_000n)])).toBe(-1_000_000n);
  });
});

describe("hitungGPpct — denominator & tampilan", () => {
  it("persentase satu desimal sesuai formatPercent (half away from zero)", () => {
    // 3.465.000 / 38.000.000 = 9,1184% → 9,1% (job ISLI-26.08-005 versi cetak, Q10)
    expect(hitungGPpct(rupiah(3_465_000n), rupiah(38_000_000n))).toBe("9,1%");
  });

  it("denominator 0 → null, bukan NaN/divide-by-zero", () => {
    expect(hitungGPpct(rupiah(0n), rupiah(0n))).toBeNull();
  });

  it("job 100% at-cost → GP negatif sebesar total at-cost (asimetri R4.2)", () => {
    // Konsekuensi STATUS QUO R4.2 (Q-4d-1): reimburse keluar dari selling
    // tapi TETAP MASUK buying. Job yang seluruhnya at-cost tidak pernah GP 0 —
    // GP-nya persis minus total at-cost. Ini asimetri yang dicatat ADR-0007
    // (masih BELUM DIPUTUSKAN); test ini MENGUNCI perilaku saat ini.
    const lines = [line(500_000n, 500_000n, true)];
    expect(hitungGP(lines)).toBe(-500_000n);
    expect(isLoss(hitungGP(lines))).toBe(true);
  });

  it("baris biasa margin nol → GP persis 0, GP% 0,0% (denominator ≠ 0)", () => {
    const lines = [line(1_000_000n, 1_000_000n)];
    const gp = hitungGP(lines);
    expect(gp).toBe(0n);
    expect(hitungGPpct(gp as Rupiah, rupiah(1_000_000n))).toBe("0,0%");
    expect(isLoss(gp)).toBe(false);
  });
});

describe("hitungNETT — R4.2 (NETT memasukkan PPN, disengaja per Q09)", () => {
  it("NETT = selling non-reimburse + PPN − semua buying", () => {
    expect(hitungNETT([line(10_000_000n, 7_000_000n)], rupiah(110_000n))).toBe(
      3_110_000n,
    );
  });

  it("invariant: NETT − GP selalu persis sebesar PPN", () => {
    const lines = [line(38_000_000n, 34_535_000n), line(645_000n, 645_000n, true)];
    const ppn = rupiah(418_000n);
    const gp = hitungGP(lines);
    const nett = hitungNETT(lines, ppn);
    expect(gp).not.toBeNull();
    expect(nett).not.toBeNull();
    expect((nett as bigint) - (gp as bigint)).toBe(ppn);
  });

  it("job tanpa charge line → null", () => {
    expect(hitungNETT([], rupiah(110_000n))).toBeNull();
  });
});

describe("isLoss", () => {
  it("GP negatif → true", () => {
    expect(isLoss(rupiah(-1_000_000n))).toBe(true);
  });

  it("GP nol atau positif → false", () => {
    expect(isLoss(rupiah(0n))).toBe(false);
    expect(isLoss(rupiah(1n))).toBe(false);
  });

  it("null (belum ada data) → false, bukan rugi", () => {
    expect(isLoss(null)).toBe(false);
  });
});
