/*
 * GOLDEN TEST â€” Irisan 8: konsistensi laporan terhadap fixture 75 job.
 *
 * Sumber: fixtures/golden-jobs.csv + fixtures/golden-job-reimburse.csv â€”
 * ANGKA FIXTURE TIDAK PERNAH DIUBAH. Yang diuji: agregasi laporan (modul
 * src/lib/laporan) menghasilkan angka yang identik dengan menjalankan
 * hitungGP atas data lengkap (CSV job + baris reimburse) per bulan job.
 *
 * KEPUTUSAN Q-IRIS8-1b (17 Agu 2026) â€” PENTING, JANGAN "PERBAIKI":
 *   Konstanta di sini BUKAN 280.150.000. Angka 280.150.000 berasal dari
 *   fixture CSV tingkat atas yang TIDAK memuat rincian reimburse. Dashboard
 *   menjalankan hitungGP atas DATA LENGKAP (R4.2 asimetris: reimburse keluar
 *   dari selling, tetap masuk buying), sehingga untuk 75 job:
 *
 *     selling utk GP = 2.035.760.000 (CSV, tanpa reimburse)
 *     buying         = 1.783.277.693 (1.755.610.000 CSV + 27.667.693 reimburse)
 *     GP laporan     = 252.482.307   â† ANGKA INI yang dikunci di bawah
 *
 *   280.150.000 tetap sah untuk definisi SIMETRIS (gp fixture / SUMMARY) dan
 *   tetap dikunci oleh tests/golden/gp-75-jobs.golden.test.ts â€” tidak ada
 *   angka golden existing yang diubah di sini; ini konstanta BARU untuk
 *   definisi laporan.
 *
 * DERIVASI PER BULAN (bulan JOB, jobs.tahun/jobs.bulan â€” Q-IRIS8-2):
 *   GP CSV/bulan  (dijumlah dari fixtures/golden-jobs.csv):
 *     Apr(11 job): 58.750.000   Mei(20): 108.300.000
 *     Jun(18):     80.200.000   Jul(10 + 2 kosong): 32.900.000   Î£=280.150.000
 *   Reimburse/bulan (dijumlah dari golden-job-reimburse.csv, per job_no):
 *     Apr: 646.575+1.701.630+821.400            =  3.169.605
 *     Mei: 21.835.562                            = 21.835.562
 *     Jun: 1.000.000+530.580+651.946+480.000    =  2.662.526
 *     Jul: â€”                                      =         0   Î£=27.667.693
 *   GP laporan/bulan = GP CSV âˆ’ reimburse bulan itu (reimburse keluar dari
 *   selling, masuk buying â†’ GP turun persis sebesar reimburse):
 *     Apr: 58.750.000âˆ’3.169.605   = 55.580.395
 *     Mei: 108.300.000âˆ’21.835.562 = 86.464.438
 *     Jun: 80.200.000âˆ’2.662.526   = 77.537.474
 *     Jul: 32.900.000âˆ’0           = 32.900.000   Î£=252.482.307 âœ“
 *
 * Segmen (kolom `segment` CSV): DOMESTIC vs EXIM â€” jumlah ulang di test
 * agar derivasi tidak disalin buta.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { type GpLine, hitungGP } from "../../src/lib/costing/index";
import { agregasiRingkasanJob, gpPersenAgregat } from "../../src/lib/laporan/agregat";
import { daftarBulanRentang, parseRentangDariUrl } from "../../src/lib/laporan/periode";
import { rupiah } from "../../src/lib/money/index";

/* ------------------------------------------------------------------ */
/* Muat fixture (pola gp-75-jobs.golden.test.ts â€” TIDAK mengubah angka) */
/* ------------------------------------------------------------------ */

type BarisJob = {
  jobNo: string;
  segment: string;
  tahun: number;
  bulan: number;
  selling: bigint | null;
  cost: bigint | null;
};

type BarisReimburse = { jobNo: string; selling: bigint; cost: bigint };

function bacaCsv(file: string): string[][] {
  const teks = fs.readFileSync(path.resolve(__dirname, "..", "..", file), "utf8");
  return teks
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
    .map((l) => l.split(","));
}

function uang(v: string | undefined): bigint | null {
  if (v === undefined || v.trim() === "") return null;
  return BigInt(v.trim());
}

const JOBS: readonly BarisJob[] = (() => {
  const rows = bacaCsv("fixtures/golden-jobs.csv");
  const h = rows[0];
  if (!h) throw new Error("header fixtures/golden-jobs.csv kosong");
  const iJob = h.indexOf("job_no");
  const iSeg = h.indexOf("segment");
  const iTahun = h.indexOf("year");
  const iBulan = h.indexOf("month");
  const iSell = h.indexOf("selling");
  const iCost = h.indexOf("cost");
  return rows.slice(1).map((c) => ({
    jobNo: c[iJob] ?? "",
    segment: c[iSeg] ?? "",
    tahun: Number(c[iTahun]),
    bulan: Number(c[iBulan]),
    selling: uang(c[iSell]),
    cost: uang(c[iCost]),
  }));
})();

const REIMBURSE: readonly BarisReimburse[] = bacaCsv("fixtures/golden-job-reimburse.csv")
  .slice(1)
  .map((c) => ({
    jobNo: c[0] ?? "",
    selling: BigInt((c[1] ?? "").trim()),
    cost: BigInt((c[2] ?? "").trim()),
  }));

/* ------------------------------------------------------------------ */
/* Bangun "data lengkap" per job: 1 baris biasa (CSV) + baris reimburse */
/*nya. Inilah simulasi charge lines yang dibaca dashboard.              */
/* ------------------------------------------------------------------ */

function jobKeBulan(jobNo: string): { tahun: number; bulan: number } | null {
  // "ISLI-26.04-001 (EXP)" â†’ bulan 04 tahun 26 â†’ 2026.
  const m = /^ISLI-(\d{2})\.(\d{2})-\d{3}/.exec(jobNo);
  if (!m) return null;
  return { tahun: 2000 + Number(m[1]), bulan: Number(m[2]) };
}

function linesJobLengkap(job: BarisJob): readonly GpLine[] {
  const lines: GpLine[] = [];
  if (job.selling !== null && job.cost !== null) {
    lines.push({
      sellingIdr: rupiah(job.selling),
      pencadanganIdr: rupiah(job.cost),
      isReimburse: false,
      deletedAt: null,
    });
  }
  for (const r of REIMBURSE.filter((r) => r.jobNo === job.jobNo)) {
    lines.push({
      sellingIdr: rupiah(r.selling),
      pencadanganIdr: rupiah(r.cost),
      isReimburse: true,
      deletedAt: null,
    });
  }
  return lines;
}

/* ------------------------------------------------------------------ */
/* Konstanta golden Irisan 8 â€” hasil hitungan, bukan tebakan.           */
/* ------------------------------------------------------------------ */

const GOLDEN_IRIS8_GP_APR_JUL = 252_482_307n;
const GOLDEN_IRIS8_GP_PER_BULAN = {
  "2026-04": 55_580_395n,
  "2026-05": 86_464_438n,
  "2026-06": 77_537_474n,
  "2026-07": 32_900_000n,
} as const;

describe("golden laporan â€” dashboard GP atas data lengkap (Q-IRIS8-1b)", () => {
  it("Î£ GP laporan 75 job = 252.482.307 (hitungGP data lengkap)", () => {
    const ringkasan = JOBS.map((j) => ({
      jobId: j.jobNo,
      gpIdr: hitungGP(linesJobLengkap(j)),
    }));
    const hasil = agregasiRingkasanJob(ringkasan);
    expect(hasil.totalGp).toBe(GOLDEN_IRIS8_GP_APR_JUL);
    // Identitas aritmetika yang dijanjikan ke user:
    expect(hasil.totalGp).toBe(2_035_760_000n - 1_783_277_693n);
    // DAN sengaja berbeda dari 280.150.000 (definisi fixture simetris):
    expect(hasil.totalGp).not.toBe(280_150_000n);
  });

  it("rentang Aprâ€“Jul == total; Junâ€“Jun == angka Juni saja (BUILD-PLAN 8a)", () => {
    const rAprJul = parseRentangDariUrl("2026-04", "2026-07");
    if (!rAprJul) throw new Error("rentang Apr-Jul wajib valid");
    const rJun = parseRentangDariUrl("2026-06", "2026-06");
    if (!rJun) throw new Error("rentang Jun-Jun wajib valid");

    const dalam = (j: BarisJob, r: ReturnType<typeof parseRentangDariUrl>) => {
      if (!r) return false;
      const b = { tahun: j.tahun, bulan: j.bulan };
      const key = (x: { tahun: number; bulan: number }) => x.tahun * 12 + x.bulan;
      return key(b) >= key(r.dari) && key(b) <= key(r.sampai);
    };

    const total = (r: ReturnType<typeof parseRentangDariUrl>) =>
      agregasiRingkasanJob(
        JOBS.filter((j) => dalam(j, r)).map((j) => ({
          jobId: j.jobNo,
          gpIdr: hitungGP(linesJobLengkap(j)),
        })),
      ).totalGp;

    expect(total(rAprJul)).toBe(GOLDEN_IRIS8_GP_APR_JUL);
    expect(total(rJun)).toBe(GOLDEN_IRIS8_GP_PER_BULAN["2026-06"]);
  });

  it("GP per bulan sesuai derivasi (55.580.395 / 86.464.438 / 77.537.474 / 32.900.000)", () => {
    for (const [kunci, target] of Object.entries(GOLDEN_IRIS8_GP_PER_BULAN)) {
      const [tahun, bulan] = kunci.split("-").map(Number);
      const ringkasan = JOBS.filter((j) => j.tahun === tahun && j.bulan === bulan).map(
        (j) => ({ jobId: j.jobNo, gpIdr: hitungGP(linesJobLengkap(j)) }),
      );
      const hasil = agregasiRingkasanJob(ringkasan);
      expect(hasil.totalGp, `bulan ${kunci}`).toBe(target);
    }
    // Î£ bulanan == grand total â€” tidak ada angka yang bocor antar bulan.
    const jumlahBulanan = Object.values(GOLDEN_IRIS8_GP_PER_BULAN).reduce(
      (a, b) => a + b,
      0n,
    );
    expect(jumlahBulanan).toBe(GOLDEN_IRIS8_GP_APR_JUL);
  });

  it("2 job EXP kosong tetap terdeteksi sebagai jobKosong, bukan GP 0", () => {
    const ringkasan = JOBS.map((j) => ({
      jobId: j.jobNo,
      gpIdr: hitungGP(linesJobLengkap(j)),
    }));
    const hasil = agregasiRingkasanJob(ringkasan);
    expect(hasil.jumlahJobKosong).toBe(2);
    expect(hasil.jumlahJobBerangka).toBe(73);
  });
});

describe("golden laporan â€” struktur derivasi fixture (anti salin buta)", () => {
  it("jobNo fixture konsisten dengan kolom year/month (basis periode Q-IRIS8-2)", () => {
    for (const j of JOBS) {
      const dariNo = jobKeBulan(j.jobNo);
      expect(dariNo, `${j.jobNo}: nomor job vs year/month`).toEqual({
        tahun: j.tahun,
        bulan: j.bulan,
      });
    }
  });

  it("GP% agregat Aprâ€“Jul = 252.482.307 / 2.035.760.000 â‰ˆ 12,4%", () => {
    const persen = gpPersenAgregat(
      rupiah(GOLDEN_IRIS8_GP_APR_JUL),
      rupiah(2_035_760_000n),
    );
    expect(persen).toBe("12,4%");
  });

  it("daftarBulanRentang Aprâ€“Jul memberi 4 bulan berurutan", () => {
    const r = parseRentangDariUrl("2026-04", "2026-07");
    if (!r) throw new Error("rentang wajib valid");
    expect(daftarBulanRentang(r)).toHaveLength(4);
  });
});
