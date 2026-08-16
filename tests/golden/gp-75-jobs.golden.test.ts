/*
 * GOLDEN TEST — Rekonsiliasi GP 75 job (Irisan 4d).
 *
 * Sumber: fixtures/golden-jobs.csv (75 job Apr–Jul 2026, rekap tingkat atas —
 * BUKAN rincian per baris biaya; lihat fixtures/README.md) dan
 * fixtures/golden-job-reimburse.csv (8 baris at-cost).
 *
 * Identitas yang dikunci di sini (semua diverifikasi hitung manual dari CSV,
 * bukan ditebak):
 *
 *   1. Tepat 75 job; 73 berangka + 2 baris EXP kosong
 *      (ISLI-26.07-003 (EXP), ISLI-26.07-004 (EXP)) yang DIHITUNG sebagai job
 *      tapi DIKECUALIKAN dari total.
 *   2. Setiap job berangka: gp === selling − cost (Rp0 persis, bigint).
 *   3. Total CSV: selling 2.035.760.000, cost 1.755.610.000, gp 280.150.000.
 *   4. GP total CSV === gpBenar SUMMARY 2026 (280.150.000) — REKONSILIASI PERSIS.
 *   5. Selisih selling & cost CSV terhadap konstanta SUMMARY sama besar di
 *      KEDUA sisi, persis sebesar total baris at-cost/reimburse (27.667.693) —
 *      karena CSV tingkat atas tidak memuat rincian reimburse sedangkan
 *      SUMMARY memuatnya di kedua sisi, GP tidak terpengaruh.
 *   6. Tiap baris reimburse fixture: selling === cost (R4.3).
 *
 * KENAPA total bulanan TIDAK di-assert sama dengan BULANAN di
 * summary-2026.golden.test.ts: atribusi bulan di SUMMARY diketik manual
 * (Q42 — Mei–Juli tidak tertaut ke SO BULAN), sehingga job yang sama bisa
 * jatuh di bulan berbeda antara tab DOM/EXIM dan SUMMARY. Yang rekonsiliasi
 * persis adalah GRAND TOTAL GP — itulah gerbang 4d.
 *
 * JANGAN ubah angka di sini supaya hijau (guardrails "Kalau test golden
 * merah"). Kalau fixture asli berubah, itu temuan rekonsiliasi baru.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Konstanta resmi SUMMARY 2026 — sama dengan summary-2026.golden.test.ts. */
const SUMMARY_SELLING = 2_063_427_693n;
const SUMMARY_COST = 1_783_277_693n;
const SUMMARY_GP_BENAR = 280_150_000n;

type GoldenJob = {
  readonly jobNo: string;
  readonly segment: string;
  readonly selling: bigint | null;
  readonly cost: bigint | null;
  readonly gp: bigint | null;
};

type ReimburseLine = {
  readonly jobNo: string;
  readonly selling: bigint;
  readonly cost: bigint;
};

function bacaBaris(file: string): string[][] {
  const text = fs.readFileSync(path.resolve(__dirname, "..", "..", file), "utf8");
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => line.split(","));
}

function muatGoldenJobs(): readonly GoldenJob[] {
  const rows = bacaBaris("fixtures/golden-jobs.csv");
  const header = rows[0];
  if (header === undefined) throw new Error("golden-jobs.csv kosong");
  const iJobNo = header.indexOf("job_no");
  const iSegment = header.indexOf("segment");
  const iSelling = header.indexOf("selling");
  const iCost = header.indexOf("cost");
  const iGp = header.indexOf("gp");
  if ([iJobNo, iSegment, iSelling, iCost, iGp].some((i) => i < 0)) {
    throw new Error("Kolom wajib golden-jobs.csv tidak ditemukan");
  }
  return rows.slice(1).map((cols) => ({
    jobNo: cols[iJobNo] ?? "",
    segment: cols[iSegment] ?? "",
    selling: parseKolomUang(cols[iSelling]),
    cost: parseKolomUang(cols[iCost]),
    gp: parseKolomUang(cols[iGp]),
  }));
}

function parseKolomUang(nilai: string | undefined): bigint | null {
  if (nilai === undefined || nilai.trim() === "") return null;
  return BigInt(nilai.trim());
}

function muatReimburse(): readonly ReimburseLine[] {
  const rows = bacaBaris("fixtures/golden-job-reimburse.csv");
  return rows.slice(1).map((cols) => ({
    jobNo: cols[0] ?? "",
    selling: BigInt((cols[1] ?? "").trim()),
    cost: BigInt((cols[2] ?? "").trim()),
  }));
}

const JOBS = muatGoldenJobs();
const JOBS_BERANGKA = JOBS.filter(
  (j) => j.selling !== null && j.cost !== null && j.gp !== null,
);
const JOBS_KOSONG = JOBS.filter(
  (j) => j.selling === null && j.cost === null && j.gp === null,
);

const TOTAL_SELLING_CSV = JOBS_BERANGKA.reduce(
  (acc, j) => acc + (j.selling as bigint),
  0n,
);
const TOTAL_COST_CSV = JOBS_BERANGKA.reduce((acc, j) => acc + (j.cost as bigint), 0n);
const TOTAL_GP_CSV = JOBS_BERANGKA.reduce((acc, j) => acc + (j.gp as bigint), 0n);

const REIMBURSE = muatReimburse();
const TOTAL_REIMBURSE = REIMBURSE.reduce((acc, r) => acc + r.selling, 0n);

describe("golden 75 job — struktur", () => {
  it("tepat 75 job di fixture", () => {
    expect(JOBS.length).toBe(75);
  });

  it("73 job berangka + 2 job EXP kosong", () => {
    expect(JOBS_BERANGKA.length).toBe(73);
    expect(JOBS_KOSONG.length).toBe(2);
    expect(JOBS_KOSONG.map((j) => j.jobNo).sort()).toEqual([
      "ISLI-26.07-003 (EXP)",
      "ISLI-26.07-004 (EXP)",
    ]);
  });

  it("setiap job berangka: gp === selling − cost (Rp0 persis)", () => {
    for (const job of JOBS_BERANGKA) {
      expect(job.gp, `${job.jobNo}: gp harus persis selling − cost`).toBe(
        (job.selling as bigint) - (job.cost as bigint),
      );
    }
  });

  it("job non-shipment ISLI-26.06-013 ada dengan GP persis 0 (R11/Q19)", () => {
    const storage = JOBS.find((j) => j.jobNo === "ISLI-26.06-013");
    expect(storage).toBeDefined();
    expect(storage?.selling).toBe(1_860_000n);
    expect(storage?.cost).toBe(1_860_000n);
    expect(storage?.gp).toBe(0n);
  });
});

describe("golden 75 job — rekonsiliasi grand total", () => {
  it("total CSV terkunci (hasil hitung manual dari fixture, bukan tebakan)", () => {
    expect(TOTAL_SELLING_CSV).toBe(2_035_760_000n);
    expect(TOTAL_COST_CSV).toBe(1_755_610_000n);
    expect(TOTAL_GP_CSV).toBe(280_150_000n);
  });

  it("GP rekonsiliasi PERSIS dengan gpBenar SUMMARY 2026 — gerbang utama 4d", () => {
    expect(TOTAL_GP_CSV).toBe(SUMMARY_GP_BENAR);
  });

  it("selisih selling CSV vs SUMMARY persis sebesar total reimburse (kedua sisi)", () => {
    expect(SUMMARY_SELLING - TOTAL_SELLING_CSV).toBe(TOTAL_REIMBURSE);
    expect(SUMMARY_COST - TOTAL_COST_CSV).toBe(TOTAL_REIMBURSE);
  });

  it("karena selisih simetris di kedua sisi, GP tidak terpengaruh reimburse", () => {
    expect(SUMMARY_SELLING - SUMMARY_COST).toBe(SUMMARY_GP_BENAR);
    expect(TOTAL_SELLING_CSV - TOTAL_COST_CSV).toBe(TOTAL_GP_CSV);
  });
});

describe("golden reimburse — baris at-cost (R4.3)", () => {
  it("tepat 8 baris at-cost di fixture", () => {
    expect(REIMBURSE.length).toBe(8);
  });

  it("setiap baris at-cost: selling === cost persis (tanpa margin)", () => {
    for (const line of REIMBURSE) {
      expect(line.selling, `${line.jobNo}: baris at-cost wajib selling === cost`).toBe(
        line.cost,
      );
    }
  });

  it("total at-cost persis 27.667.693 — angka jembatan rekonsiliasi", () => {
    expect(TOTAL_REIMBURSE).toBe(27_667_693n);
  });
});
