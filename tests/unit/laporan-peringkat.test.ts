/*
 * UNIT TEST — Irisan 8c/8d: peringkat multi-sumbu + drill-down (R14.2–R14.4).
 *
 * Menguji fungsi MURNI di src/lib/laporan/queries.ts (tanpa DB):
 *  - peringkatDariRingkasan : urut selling menurun; jumlah job, selling,
 *    cost, GP, GP%, tanggal pertama & terakhir (R14.3).
 *  - Mengubah rentang (subset ringkasan) mengubah urutan peringkat
 *    (BUILD-PLAN 8c: "mengubah rentang mengubah urutan").
 *  - jobEntitasDariRingkasan (drill-down 8d): total di lapisan bawah SAMA
 *    dengan kontribusi entitas di lapisan peringkat (BUILD-PLAN 8d:
 *    "total di setiap lapisan sama dengan lapisan di atasnya").
 *
 * Sumbu VENDOR sengaja TIDAK ada di sini — itu BELANJA, kelompok terpisah
 * (R14.2), diuji lewat rekapVendorPerBulan (integration).
 */

import { describe, expect, it } from "vitest";
import {
  type RingkasanJobLaporan,
  jobEntitasDariRingkasan,
  peringkatDariRingkasan,
} from "../../src/lib/laporan/queries";
import { rupiah } from "../../src/lib/money/index";

/* ------------------------------------------------------------------ */
/* Data sintetis — 6 job, 2 customer, 2 sales, 2 rute, 2 segmen.        */
/* Nilai dipilih agar urutan selling customer A > B di Apr–Jul, tetapi   */
/* BALIK di Mei saja.                                                   */
/* ------------------------------------------------------------------ */

function job(r: {
  jobId: string;
  jobNo: string;
  bulan: number;
  customer: string | null;
  sales: string | null;
  rute: string | null;
  segmen: string;
  selling: bigint;
  cost: bigint;
  gp: bigint | null;
}): RingkasanJobLaporan {
  return {
    jobId: r.jobId,
    jobNo: r.jobNo,
    segmen: r.segmen,
    tahun: 2026,
    bulan: r.bulan,
    status: "FINAL",
    customerNama: r.customer,
    sales: r.sales,
    rute: r.rute,
    selling: rupiah(r.selling),
    cost: rupiah(r.cost),
    gp: r.gp === null ? null : rupiah(r.gp),
    gpPersen: null,
    gpPostRealokasi: r.gp === null ? null : rupiah(r.gp),
  };
}

const SEMUA: readonly RingkasanJobLaporan[] = [
  // Customer "PT A" — kuat di April, lemah di Mei.
  job({
    jobId: "a1",
    jobNo: "ISLI-26.04-001",
    bulan: 4,
    customer: "PT A",
    sales: "Fairol",
    rute: "JKT–SIN",
    segmen: "EXP",
    selling: 90_000_000n,
    cost: 80_000_000n,
    gp: 10_000_000n,
  }),
  job({
    jobId: "a2",
    jobNo: "ISLI-26.05-002",
    bulan: 5,
    customer: "PT A",
    sales: "Fairol",
    rute: "JKT–SIN",
    segmen: "EXP",
    selling: 5_000_000n,
    cost: 4_000_000n,
    gp: 1_000_000n,
  }),
  // Customer "PT B" — kecil di April, besar di Mei.
  job({
    jobId: "b1",
    jobNo: "ISLI-26.04-003",
    bulan: 4,
    customer: "PT B",
    sales: "Niken",
    rute: "SMG–JKT",
    segmen: "DOM",
    selling: 10_000_000n,
    cost: 9_000_000n,
    gp: 1_000_000n,
  }),
  job({
    jobId: "b2",
    jobNo: "ISLI-26.05-004",
    bulan: 5,
    customer: "PT B",
    sales: "Niken",
    rute: "SMG–JKT",
    segmen: "DOM",
    selling: 60_000_000n,
    cost: 50_000_000n,
    gp: 10_000_000n,
  }),
  // Customer tanpa nama (job lama belum diisi) — label "(tanpa customer)".
  job({
    jobId: "c1",
    jobNo: "ISLI-26.06-005",
    bulan: 6,
    customer: null,
    sales: null,
    rute: null,
    segmen: "DOM",
    selling: 20_000_000n,
    cost: 18_000_000n,
    gp: 2_000_000n,
  }),
  // Job kosong (belum ada baris) — gp null, TIDAK dihitung 0.
  job({
    jobId: "d1",
    jobNo: "ISLI-26.07-006",
    bulan: 7,
    customer: "PT A",
    sales: "Fairol",
    rute: "JKT–SIN",
    segmen: "EXP",
    selling: 0n,
    cost: 0n,
    gp: null,
  }),
];

const APR_JUL = SEMUA;
const MEI_SAJA = SEMUA.filter((j) => j.bulan === 5);

describe("peringkatDariRingkasan — struktur baris (R14.2/R14.3)", () => {
  it("urut selling menurun; tie-break label alfabetis", () => {
    const p = peringkatDariRingkasan(APR_JUL, "customer");
    const label = p.map((r) => r.label);
    // PT A 95jt > PT B 70jt > (tanpa customer) 20jt.
    expect(label).toEqual(["PT A", "PT B", "(tanpa customer)"]);
    expect(p[0]?.jumlahJob).toBe(3); // PT A: a1 + a2 + d1 (kosong ikut dihitung job)
    expect(p[0]?.totalSelling).toBe(95_000_000n);
    expect(p[0]?.totalCost).toBe(84_000_000n);
    expect(p[0]?.totalGp).toBe(11_000_000n); // d1 gp null diabaikan, bukan 0
    expect(p[0]?.gpPersen).toBe("11,6%"); // 11jt/95jt total-based
  });

  it("kolom tanggal pertama & terakhir dari bulan job (R14.3)", () => {
    const p = peringkatDariRingkasan(APR_JUL, "customer");
    expect(p[0]?.tanggalPertama).toBe("2026-04");
    expect(p[0]?.tanggalTerakhir).toBe("2026-07");
  });

  it("sumbu sales, rute, segmen mengelompokkan benar", () => {
    const sales = peringkatDariRingkasan(APR_JUL, "sales");
    expect(sales.map((r) => r.label)).toEqual(["Fairol", "Niken", "(tanpa sales)"]);

    const rute = peringkatDariRingkasan(APR_JUL, "rute");
    expect(rute.map((r) => r.label)).toEqual(["JKT–SIN", "SMG–JKT", "(tanpa rute)"]);

    const segmen = peringkatDariRingkasan(APR_JUL, "segmen");
    // EXP = a1,a2,d1 = 95jt; DOM = b1,b2,c1 = 90jt.
    expect(segmen.map((r) => r.label)).toEqual(["EXP", "DOM"]);
  });
});

describe("mengubah rentang mengubah urutan peringkat (BUILD-PLAN 8c)", () => {
  it("Apr–Jul: PT A unggul; Mei saja: PT B unggul", () => {
    const pAprJul = peringkatDariRingkasan(APR_JUL, "customer");
    expect(pAprJul[0]?.label).toBe("PT A");

    const pMei = peringkatDariRingkasan(MEI_SAJA, "customer");
    expect(pMei.map((r) => r.label)).toEqual(["PT B", "PT A"]);
    expect(pMei[0]?.totalSelling).toBe(60_000_000n);
  });

  it("rentang Mei mengecualikan entitas yang tidak punya job di Mei", () => {
    const pMei = peringkatDariRingkasan(MEI_SAJA, "customer");
    expect(pMei.find((r) => r.label === "(tanpa customer)")).toBeUndefined();
  });
});

describe("drill-down 8d — total lapisan bawah == lapisan atas (R14.4)", () => {
  it("Σ selling/cost/GP job PT A == baris peringkat PT A", () => {
    const p = peringkatDariRingkasan(APR_JUL, "customer");
    const baris = p.find((r) => r.label === "PT A");
    if (!baris) throw new Error("PT A wajib ada di peringkat");

    const jobsA = jobEntitasDariRingkasan(APR_JUL, "customer", "PT A");
    expect(jobsA).toHaveLength(3); // a1 + a2 + d1 (d1 kosong tetap terhitung)
    const totSelling = jobsA.reduce((s, j) => s + j.selling, 0n);
    const totCost = jobsA.reduce((s, j) => s + j.cost, 0n);
    const totGp = jobsA.reduce((s, j) => (j.gp === null ? s : s + j.gp), 0n as bigint);
    expect(totSelling).toBe(baris.totalSelling);
    expect(totCost).toBe(baris.totalCost);
    expect(totGp).toBe(baris.totalGp);
    expect(jobsA.length).toBe(baris.jumlahJob);
  });

  it("invarian berlaku untuk SEMUA entitas di SEMUA sumbu", () => {
    const sumbuList = ["customer", "segmen", "sales", "rute"] as const;
    for (const sumbu of sumbuList) {
      const p = peringkatDariRingkasan(APR_JUL, sumbu);
      for (const baris of p) {
        const jobs = jobEntitasDariRingkasan(APR_JUL, sumbu, baris.label);
        expect(jobs.length, `${sumbu}/${baris.label}: jumlah job`).toBe(baris.jumlahJob);
        expect(
          jobs.reduce((s, j) => s + j.selling, 0n),
          `${sumbu}/${baris.label}: selling`,
        ).toBe(baris.totalSelling);
        expect(
          jobs.reduce((s, j) => s + j.cost, 0n),
          `${sumbu}/${baris.label}: cost`,
        ).toBe(baris.totalCost);
      }
    }
  });

  it("label yang tidak ada → daftar kosong (bukan error diam-diam salah)", () => {
    expect(jobEntitasDariRingkasan(APR_JUL, "customer", "TIDAK ADA")).toEqual([]);
  });

  it("job kosong (gp null) tetap masuk daftar job — terlihat, bukan hilang", () => {
    const jobsA = jobEntitasDariRingkasan(APR_JUL, "customer", "PT A");
    const kosong = jobsA.find((j) => j.jobId === "d1");
    expect(kosong?.jobNo).toBe("ISLI-26.07-006");
    expect(kosong?.gp).toBeNull();
  });
});
