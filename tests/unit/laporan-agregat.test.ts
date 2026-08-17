/*
 * UNIT TEST — Irisan 8: agregasi laporan murni (tanpa DB).
 *
 * Menguji fungsi murni di src/lib/laporan/:
 *  - agregat.ts  : agregasi ringkasan per job → total (WAJIB reuse
 *                  hitungGP/sellingUntukGp/buyingUntukGp — tidak ada rumus
 *                  GP kedua), GP% total-based, invarian realokasi.
 *  - periode.ts  : parsing rentang bulan dari URL, urutan bulan rentang,
 *                  boundary WIB/UTC pada dibayar_at.
 *
 * Keputusan Q-IRIS8-1..5 (17 Agu 2026) yang dikunci di sini:
 *  - Basis GP = pencadangan; hitungGP atas DATA LENGKAP (termasuk reimburse).
 *  - GP% agregat = formatPercent(totalGP, totalSelling) — BUKAN rata-rata
 *    GP% per job (job kecil bermargin besar tidak boleh mendistorsi).
 *  - Realokasi APPROVED menggeser biaya antar job; total GP tidak berubah
 *    (ΣGP post == ΣGP asli) — invarian wajib.
 *  - Boundary bulan rekap vendor = Asia/Jakarta (WIB), bukan UTC.
 */

import { describe, expect, it } from "vitest";
import {
  type GpLine,
  buyingUntukGp,
  hitungGP,
  sellingUntukGp,
} from "../../src/lib/costing/index";
import {
  agregasiRingkasanJob,
  gpPersenAgregat,
  totalGpSetelahRealokasi,
} from "../../src/lib/laporan/agregat";
import {
  buatRentangBulan,
  bulanDibayarWib,
  daftarBulanRentang,
  parseRentangDariUrl,
} from "../../src/lib/laporan/periode";
import { rupiah, sum } from "../../src/lib/money/index";

/* ------------------------------------------------------------------ */
/* Data sintetis kecil — nilai dipilih agar pembulatan tak tersangkut. */
/* ------------------------------------------------------------------ */

function line(selling: bigint, pencadangan: bigint, isReimburse = false): GpLine {
  return {
    sellingIdr: rupiah(selling),
    pencadanganIdr: rupiah(pencadangan),
    isReimburse,
    deletedAt: null,
  };
}

const JOB_A_LINES: readonly GpLine[] = [
  line(10_000_000n, 7_000_000n),
  line(1_000_000n, 1_000_000n, true), // reimburse: keluar dari selling, masuk buying (R4.2)
];
// JOB_A: selling utk GP = 10.000.000; buying = 8.000.000; GP = 2.000.000.

const JOB_B_LINES: readonly GpLine[] = [
  line(4_000_000n, 5_000_000n), // rugi 1.000.000
];
// JOB_B: GP = -1.000.000.

describe("agregasiRingkasanJob — reuse hitungGP, tanpa rumus kedua", () => {
  it("menjumlahkan selling/buying/GP lintas job sesuai rumus R4.2", () => {
    const hasil = agregasiRingkasanJob([
      { jobId: "a", gpIdr: hitungGP(JOB_A_LINES) },
      { jobId: "b", gpIdr: hitungGP(JOB_B_LINES) },
      { jobId: "kosong", gpIdr: null },
    ]);
    // null = belum ada baris — TIDAK dihitung 0, tapi tidak menggeser total.
    expect(hasil.totalGp).toBe(1_000_000n);
    expect(hasil.jumlahJobBerangka).toBe(2);
    expect(hasil.jumlahJobKosong).toBe(1);
  });

  it("konsisten dengan penjumlahan langsung sellingUntukGp − buyingUntukGp", () => {
    const semua = [...JOB_A_LINES, ...JOB_B_LINES];
    const totalSelling = sellingUntukGp(semua);
    const totalBuying = buyingUntukGp(semua);
    const hasil = agregasiRingkasanJob([
      { jobId: "a", gpIdr: hitungGP(JOB_A_LINES) },
      { jobId: "b", gpIdr: hitungGP(JOB_B_LINES) },
    ]);
    expect(hasil.totalGp).toBe(totalSelling - totalBuying);
  });

  it("daftar kosong → total 0 dan tidak melempar", () => {
    const hasil = agregasiRingkasanJob([]);
    expect(hasil.totalGp).toBe(0n);
    expect(hasil.jumlahJobBerangka).toBe(0);
  });
});

describe("gpPersenAgregat — total-based, bukan rata-rata", () => {
  it("GP% total ≠ rata-rata GP% per job (bukti distorsi ditolak)", () => {
    // Job A: GP 2.000.000 / selling 10.000.000 = 20%.
    // Job B: GP -1.000.000 / selling 4.000.000 = -25%.
    // Rata-rata naif = -2,5% — SALAH. Total-based = 1.000.000/14.000.000 ≈ 7,1%.
    const totalGp = rupiah(1_000_000n);
    const totalSelling = rupiah(14_000_000n);
    expect(gpPersenAgregat(totalGp, totalSelling)).toBe("7,1%");
  });

  it('selling 0 → null (tampil "—"), bukan NaN', () => {
    expect(gpPersenAgregat(rupiah(5_000n), rupiah(0n))).toBeNull();
  });
});

describe("totalGpSetelahRealokasi — invarian ΣGP tetap", () => {
  it("realokasi APPROVED menggeser GP antar job; total tidak berubah", () => {
    const gpA = rupiah(2_000_000n);
    const gpB = rupiah(-1_000_000n);
    // A mengirim 500.000 biaya ke B: GP A naik +500.000, GP B turun −500.000.
    const hasil = totalGpSetelahRealokasi(
      [
        { jobId: "a", gpIdr: gpA },
        { jobId: "b", gpIdr: gpB },
      ],
      [{ originJobId: "a", destinationJobId: "b", jumlahIdr: rupiah(500_000n) }],
    );
    const perJob = new Map(hasil.map((h) => [h.jobId, h.gpIdr]));
    expect(perJob.get("a")).toBe(2_500_000n);
    expect(perJob.get("b")).toBe(-1_500_000n);
    // Invarian: ΣGP post == ΣGP asli (biaya berpindah, tidak hilang).
    const totalPost = sum(hasil.map((h) => h.gpIdr));
    expect(totalPost).toBe(gpA + gpB);
  });

  it("job tanpa realokasi tidak berubah; urutan hasil = urutan masukan", () => {
    const hasil = totalGpSetelahRealokasi(
      [
        { jobId: "x", gpIdr: rupiah(100n) },
        { jobId: "y", gpIdr: rupiah(200n) },
      ],
      [],
    );
    expect(hasil.map((h) => h.jobId)).toEqual(["x", "y"]);
    expect(hasil[0]?.gpIdr).toBe(100n);
    expect(hasil[1]?.gpIdr).toBe(200n);
  });
});

/* ------------------------------------------------------------------ */
/* Periode (R14.1 / Q-IRIS8-2)                                        */
/* ------------------------------------------------------------------ */

describe("parseRentangDariUrl — R14.1 rentang bulan di URL", () => {
  it("dari=sampai valid → rentang terurut", () => {
    const r = parseRentangDariUrl("2026-04", "2026-07");
    expect(r).toEqual({
      dari: { tahun: 2026, bulan: 4 },
      sampai: { tahun: 2026, bulan: 7 },
    });
  });

  it("dari > sampai → ditolak (bukan diam-dibalik)", () => {
    expect(parseRentangDariUrl("2026-07", "2026-04")).toBeNull();
  });

  it("bulan 0/13/tahun 2 digit → ditolak", () => {
    expect(parseRentangDariUrl("2026-00", "2026-07")).toBeNull();
    expect(parseRentangDariUrl("2026-13", "2026-07")).toBeNull();
    expect(parseRentangDariUrl("26-04", "2026-07")).toBeNull();
  });

  it("format rusak → null", () => {
    expect(parseRentangDariUrl("april", "2026-07")).toBeNull();
    expect(parseRentangDariUrl("", "2026-07")).toBeNull();
    expect(parseRentangDariUrl("2026-4", "2026-07")).toBeNull();
  });
});

describe("daftarBulanRentang — satuan terkecil bulan", () => {
  it("Apr–Jul 2026 → 4 bulan", () => {
    const r = parseRentangDariUrl("2026-04", "2026-07");
    if (!r) throw new Error("rentang wajib valid");
    expect(daftarBulanRentang(r)).toEqual([
      { tahun: 2026, bulan: 4 },
      { tahun: 2026, bulan: 5 },
      { tahun: 2026, bulan: 6 },
      { tahun: 2026, bulan: 7 },
    ]);
  });

  it("Jun–Jun → satu bulan saja (test BUILD-PLAN 8a)", () => {
    const r = parseRentangDariUrl("2026-06", "2026-06");
    if (!r) throw new Error("rentang wajib valid");
    expect(daftarBulanRentang(r)).toEqual([{ tahun: 2026, bulan: 6 }]);
  });

  it("menyeberang tahun (2026-11 s/d 2027-02) → 4 bulan berurutan", () => {
    const r = parseRentangDariUrl("2026-11", "2027-02");
    if (!r) throw new Error("rentang wajib valid");
    expect(daftarBulanRentang(r)).toEqual([
      { tahun: 2026, bulan: 11 },
      { tahun: 2026, bulan: 12 },
      { tahun: 2027, bulan: 1 },
      { tahun: 2027, bulan: 2 },
    ]);
  });
});

describe("bulanDibayarWib — boundary WIB, bukan UTC (Q-IRIS8-2)", () => {
  it("30 Juni 23:30 UTC = 1 Juli 06:30 WIB → masuk Juli", () => {
    const d = new Date("2026-06-30T23:30:00Z");
    expect(bulanDibayarWib(d)).toEqual({ tahun: 2026, bulan: 7 });
  });

  it("1 Juli 00:30 WIB (30 Juni 17:30 UTC) → masuk Juli", () => {
    const d = new Date("2026-06-30T17:30:00Z");
    expect(bulanDibayarWib(d)).toEqual({ tahun: 2026, bulan: 7 });
  });

  it("30 Juni 16:59 UTC (30 Juni 23:59 WIB) → masih Juni", () => {
    const d = new Date("2026-06-30T16:59:59Z");
    expect(bulanDibayarWib(d)).toEqual({ tahun: 2026, bulan: 6 });
  });

  it("tahun berganti ikut WIB (31 Des 23:30 UTC = 1 Jan WIB)", () => {
    const d = new Date("2026-12-31T23:30:00Z");
    expect(bulanDibayarWib(d)).toEqual({ tahun: 2027, bulan: 1 });
  });
});

describe("buatRentangBulan — normalisasi", () => {
  it("bulan valid dipertahankan", () => {
    expect(buatRentangBulan(2026, 4)).toEqual({ tahun: 2026, bulan: 4 });
  });
  it("bulan tidak valid → null", () => {
    expect(buatRentangBulan(2026, 0)).toBeNull();
    expect(buatRentangBulan(2026, 13)).toBeNull();
    expect(buatRentangBulan(26, 4)).toBeNull();
  });
});
