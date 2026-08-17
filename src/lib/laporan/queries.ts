/*
 * Query laporan — Irisan 8b/8c/8d. MURNI SELECT (R14.5: angka dihitung saat
 * diminta, DILARANG menyimpan rekap; tanpa MATERIALIZED VIEW/tabel snapshot).
 *
 * Prinsip anti-menyesatkan yang ditegakkan di sini:
 *  1. GP SELALU dari hitungGP (src/lib/costing) atas baris charge_lines AKTIF
 *     per job — satu jalur kode, satu definisi (Q-IRIS8-1: TIDAK ada rumus
 *     GP kedua).
 *  2. SUM(bigint) Postgres tiba sebagai string/NUMERIC — wajib BigInt(),
 *     DILARANG Number() (presisi hilang > 2^53).
 *  3. Filter default Q-IRIS8-5: job DIBATALKAN & soft-deleted DIKECUALIKAN
 *     dari semua laporan keuangan; job belum FINAL IKUT dengan kolom status.
 *  4. Rekap vendor (R7.3): hanya DIBAYAR + addenda R17 yang dibayar_at
 *     terisi; bulan dari dibayar_at versi WIB.
 *  5. Rekap pajak: hanya invoice TERBIT ke atas (kolom beku I-INV-1).
 *  6. Realokasi: hanya APPROVED (approvedBy IS NOT NULL) yang jadi overlay.
 *
 * Semua fungsi menerima db (atau tx) — pola service existing — tapi TIDAK
 * pernah menulis. Entry point server WAJIB assertCan(role, "report:view").
 */

import type { db } from "@/db/index";
import {
  chargeLines,
  costReallocations,
  customerInvoices,
  customers,
  jobs,
  paymentsIn,
  vendorInvoiceAddenda,
  vendorInvoices,
  vendors,
} from "@/db/schema/index";
import { type GpLine, hitungGP } from "@/lib/costing/index";
import { type Rupiah, rupiah } from "@/lib/money/index";
import { and, asc, desc, eq, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import {
  type RealokasiUntukAgregat,
  agregasiRingkasanJob,
  gpPersenAgregat,
  totalGpSetelahRealokasi,
} from "./agregat";
import {
  type RentangBulan,
  bulanDalamRentang,
  bulanDariTanggal,
  bulanDibayarWib,
  daftarBulanRentang,
  kunciBulan,
} from "./periode";

type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => unknown
  ? T
  : never;
export type DbOrTx = typeof db | Tx;

/* ------------------------------------------------------------------ */
/* Dashboard GP — bulan × segmen (8b, Q-IRIS8-2: basis jobs.tahun/bulan) */
/* ------------------------------------------------------------------ */

export interface BarisDashboardGp {
  readonly tahun: number;
  readonly bulan: number;
  /** Segmen job: DOM | EXP | IMP (seq_scope). */
  readonly segmen: string;
  readonly jumlahJob: number;
  readonly jumlahJobBerangka: number;
  readonly jumlahJobKosong: number;
  readonly totalSelling: Rupiah;
  readonly totalCost: Rupiah;
  readonly totalGp: Rupiah;
  readonly gpPersen: string | null;
}

/**
 * Baris ringkasan satu job untuk dashboard/peringkat/drill-down.
 * gpPostRealokasi = GP setelah overlay realokasi APPROVED (sama dgn gp bila
 * tidak ada). selling/cost = angka tampilan versi ASLI R4.2 (selling
 * non-reimburse / semua pencadangan) — bukan sumber definisi GP.
 */
export interface RingkasanJobLaporan {
  readonly jobId: string;
  readonly jobNo: string;
  readonly segmen: string;
  readonly tahun: number;
  readonly bulan: number;
  readonly status: string;
  readonly customerNama: string | null;
  readonly sales: string | null;
  readonly rute: string | null;
  readonly selling: Rupiah;
  readonly cost: Rupiah;
  readonly gp: Rupiah | null;
  readonly gpPersen: string | null;
  readonly gpPostRealokasi: Rupiah | null;
}

async function muatLinesAktif(
  dbOrTx: DbOrTx,
  jobIds: readonly string[],
): Promise<Map<string, GpLine[]>> {
  const per = new Map<string, GpLine[]>();
  if (jobIds.length === 0) return per;
  const rows = await dbOrTx
    .select({
      jobId: chargeLines.jobId,
      sellingIdr: chargeLines.sellingIdr,
      pencadanganIdr: chargeLines.pencadanganIdr,
      isReimburse: chargeLines.isReimburse,
      deletedAt: chargeLines.deletedAt,
    })
    .from(chargeLines)
    .where(and(isNull(chargeLines.deletedAt), inArray(chargeLines.jobId, [...jobIds])));
  for (const r of rows) {
    const list = per.get(r.jobId) ?? [];
    list.push({
      sellingIdr: rupiah(r.sellingIdr),
      pencadanganIdr: rupiah(r.pencadanganIdr),
      isReimburse: r.isReimburse,
      deletedAt: r.deletedAt,
    });
    per.set(r.jobId, list);
  }
  return per;
}

async function muatRealokasiApproved(
  dbOrTx: DbOrTx,
  jobIds: readonly string[],
): Promise<RealokasiUntukAgregat[]> {
  if (jobIds.length === 0) return [];
  const rows = await dbOrTx
    .select({
      originJobId: costReallocations.originJobId,
      destinationJobId: costReallocations.destinationJobId,
      jumlahIdr: costReallocations.jumlahIdr,
    })
    .from(costReallocations)
    .where(
      and(
        isNotNull(costReallocations.approvedBy),
        or(
          inArray(costReallocations.originJobId, [...jobIds]),
          inArray(costReallocations.destinationJobId, [...jobIds]),
        ),
      ),
    );
  return rows.map((r) => ({
    originJobId: r.originJobId,
    destinationJobId: r.destinationJobId,
    jumlahIdr: rupiah(r.jumlahIdr),
  }));
}

/** WHERE job aktif utk laporan keuangan (Q-IRIS8-5). */
function filterJobLaporan() {
  return and(isNull(jobs.deletedAt), ne(jobs.status, "DIBATALKAN"));
}

/**
 * Inti bersama seluruh laporan GP (BUILD-PLAN 8a: "satu fungsi agregasi
 * dipakai bersama"): job dalam rentang → lines aktif per job → hitungGP per
 * job → ringkasan + overlay realokasi APPROVED.
 */
export async function ringkasanJobDalamRentang(
  dbOrTx: DbOrTx,
  rentang: RentangBulan,
): Promise<readonly RingkasanJobLaporan[]> {
  const bulan = daftarBulanRentang(rentang);
  const conds = bulan.map(
    (b) => sql`(${jobs.tahun} = ${b.tahun} AND ${jobs.bulan} = ${b.bulan})`,
  );
  const jobRows = await dbOrTx
    .select({
      id: jobs.id,
      jobNo: jobs.jobNo,
      seqScope: jobs.seqScope,
      tahun: jobs.tahun,
      bulan: jobs.bulan,
      status: jobs.status,
      customerId: jobs.customerId,
      sales: jobs.sales,
      rute: jobs.rute,
    })
    .from(jobs)
    .where(and(filterJobLaporan(), or(...conds)))
    .orderBy(asc(jobs.tahun), asc(jobs.bulan), asc(jobs.seqScope), asc(jobs.running));

  const ids = jobRows.map((j) => j.id);
  const [lines, realokasi, custRows] = await Promise.all([
    muatLinesAktif(dbOrTx, ids),
    muatRealokasiApproved(dbOrTx, ids),
    dbOrTx.select({ id: customers.id, nama: customers.nama }).from(customers),
  ]);
  const namaCustomer = new Map(custRows.map((c) => [c.id, c.nama]));

  const gpAwal = jobRows.map((j) => ({
    jobId: j.id as string,
    gpIdr: hitungGP(lines.get(j.id) ?? []),
  }));
  const gpPost = new Map(
    totalGpSetelahRealokasi(gpAwal, realokasi).map((x) => [x.jobId, x.gpIdr]),
  );

  const hasil: RingkasanJobLaporan[] = [];
  for (const j of jobRows) {
    const l = lines.get(j.id) ?? [];
    const gp = gpAwal.find((g) => g.jobId === j.id)?.gpIdr ?? null;
    let selling = 0n;
    let cost = 0n;
    for (const x of l) {
      if (!x.isReimburse) selling += x.sellingIdr;
      cost += x.pencadanganIdr;
    }
    hasil.push({
      jobId: j.id,
      jobNo: j.jobNo,
      segmen: j.seqScope,
      tahun: j.tahun,
      bulan: j.bulan,
      status: j.status,
      customerNama: namaCustomer.get(j.customerId) ?? null,
      sales: j.sales,
      rute: j.rute,
      selling: rupiah(selling),
      cost: rupiah(cost),
      gp,
      gpPersen: gp === null ? null : gpPersenAgregat(gp, rupiah(selling)),
      gpPostRealokasi: gpPost.get(j.id) ?? gp,
    });
  }
  return hasil;
}

/** Dashboard GP: bulan × segmen dari ringkasan rentang. */
export async function dashboardGp(
  dbOrTx: DbOrTx,
  rentang: RentangBulan,
): Promise<readonly BarisDashboardGp[]> {
  const ringkasan = await ringkasanJobDalamRentang(dbOrTx, rentang);
  interface Akum {
    tahun: number;
    bulan: number;
    segmen: string;
    jumlahJob: number;
    jumlahJobBerangka: number;
    jumlahJobKosong: number;
    selling: bigint;
    cost: bigint;
    gp: bigint;
  }
  const map = new Map<string, Akum>();
  for (const j of ringkasan) {
    const k = `${j.tahun}-${String(j.bulan).padStart(2, "0")}|${j.segmen}`;
    let cur = map.get(k);
    if (!cur) {
      cur = {
        tahun: j.tahun,
        bulan: j.bulan,
        segmen: j.segmen,
        jumlahJob: 0,
        jumlahJobBerangka: 0,
        jumlahJobKosong: 0,
        selling: 0n,
        cost: 0n,
        gp: 0n,
      };
      map.set(k, cur);
    }
    cur.jumlahJob += 1;
    if (j.gp === null) {
      cur.jumlahJobKosong += 1;
    } else {
      cur.jumlahJobBerangka += 1;
      cur.gp += j.gp;
    }
    cur.selling += j.selling;
    cur.cost += j.cost;
  }
  return [...map.values()]
    .sort(
      (a, b) =>
        a.tahun - b.tahun || a.bulan - b.bulan || a.segmen.localeCompare(b.segmen),
    )
    .map((r) => ({
      tahun: r.tahun,
      bulan: r.bulan,
      segmen: r.segmen,
      jumlahJob: r.jumlahJob,
      jumlahJobBerangka: r.jumlahJobBerangka,
      jumlahJobKosong: r.jumlahJobKosong,
      totalSelling: rupiah(r.selling),
      totalCost: rupiah(r.cost),
      totalGp: rupiah(r.gp),
      gpPersen: gpPersenAgregat(rupiah(r.gp), rupiah(r.selling)),
    }));
}

/** Total nilai realokasi APPROVED per bulan job (R5.3 — metrik dashboard). */
export async function totalRealokasiPerBulan(
  dbOrTx: DbOrTx,
  rentang: RentangBulan,
): Promise<readonly { tahun: number; bulan: number; keluar: Rupiah; masuk: Rupiah }[]> {
  const bulan = daftarBulanRentang(rentang);
  const conds = bulan.map(
    (b) => sql`(${jobs.tahun} = ${b.tahun} AND ${jobs.bulan} = ${b.bulan})`,
  );
  const rows = await dbOrTx
    .select({
      tahun: jobs.tahun,
      bulan: jobs.bulan,
      keluar: sql<string>`COALESCE(SUM(CASE WHEN ${jobs.id} = ${costReallocations.originJobId} THEN ${costReallocations.jumlahIdr} ELSE 0 END), 0)`,
      masuk: sql<string>`COALESCE(SUM(CASE WHEN ${jobs.id} = ${costReallocations.destinationJobId} THEN ${costReallocations.jumlahIdr} ELSE 0 END), 0)`,
    })
    .from(jobs)
    .innerJoin(
      costReallocations,
      or(
        eq(costReallocations.originJobId, jobs.id),
        eq(costReallocations.destinationJobId, jobs.id),
      ),
    )
    .where(and(filterJobLaporan(), isNotNull(costReallocations.approvedBy), or(...conds)))
    .groupBy(jobs.tahun, jobs.bulan);
  return rows.map((r) => ({
    tahun: r.tahun,
    bulan: r.bulan,
    keluar: rupiah(BigInt(r.keluar)),
    masuk: rupiah(BigInt(r.masuk)),
  }));
}

/* ------------------------------------------------------------------ */
/* Rekap pembayaran vendor per bulan (R7.3, Q-IRIS8-2/Q-IRIS8-4)         */
/* ------------------------------------------------------------------ */

export interface BarisRekapVendor {
  readonly vendorId: string;
  readonly vendorNama: string;
  readonly tahun: number;
  readonly bulan: number;
  readonly jumlahInvoice: number;
  readonly totalDibayar: Rupiah;
  readonly totalPph23: Rupiah;
}

/**
 * R7.3 — Rekap pembayaran per vendor per bulan (keperluan pajak, permintaan
 * Bu Niken). Invoice HANYA status DIBAYAR; bulan = kalender WIB dari
 * dibayar_at (30 Juni 23:30 UTC → Juli). Addenda vendor R17 TERMASUK
 * (dibayar_at terisi): addendum dibayar di bulan X menambah uang keluar
 * vendor di bulan X (jumlahIdr + pph23Idr), BUKAN di bulan invoice asal.
 * Kolom jumlahInvoice tetap menghitung invoice DIBAYAR saja — addendum
 * memakai ulang nomor invoice yang sama (R17), bukan invoice baru.
 * PPh 23 tampil sebagai KOLOM TERPISAH (Q-IRIS8-4) — dijumlah dari nilai
 * input manual pph23_idr, TIDAK pernah dihitung ulang (R3.7/Q14).
 */
export async function rekapVendorPerBulan(
  dbOrTx: DbOrTx,
  rentang: RentangBulan,
): Promise<readonly BarisRekapVendor[]> {
  // Dua sumber uang keluar vendor: (1) invoice berstatus DIBAYAR, (2)
  // addendum R17 yang dibayar_at terisi (vendor dari invoice asal).
  const [rows, addendaRows] = await Promise.all([
    dbOrTx
      .select({
        vendorId: vendorInvoices.vendorId,
        vendorNama: vendors.nama,
        dibayarAt: vendorInvoices.dibayarAt,
        jumlahIdr: vendorInvoices.jumlahIdr,
        pph23Idr: vendorInvoices.pph23Idr,
      })
      .from(vendorInvoices)
      .innerJoin(vendors, eq(vendorInvoices.vendorId, vendors.id))
      .where(
        and(eq(vendorInvoices.status, "DIBAYAR"), isNotNull(vendorInvoices.dibayarAt)),
      ),
    dbOrTx
      .select({
        vendorId: vendorInvoices.vendorId,
        vendorNama: vendors.nama,
        dibayarAt: vendorInvoiceAddenda.dibayarAt,
        jumlahIdr: vendorInvoiceAddenda.jumlahIdr,
        pph23Idr: vendorInvoiceAddenda.pph23Idr,
      })
      .from(vendorInvoiceAddenda)
      .innerJoin(
        vendorInvoices,
        eq(vendorInvoiceAddenda.originalVendorInvoiceId, vendorInvoices.id),
      )
      .innerJoin(vendors, eq(vendorInvoices.vendorId, vendors.id))
      .where(isNotNull(vendorInvoiceAddenda.dibayarAt)),
  ]);

  interface Akum {
    vendorId: string;
    vendorNama: string;
    tahun: number;
    bulan: number;
    n: number;
    dib: bigint;
    pph: bigint;
  }
  const map = new Map<string, Akum>();
  const akumulasi = (
    r: { vendorId: string; vendorNama: string; jumlahIdr: bigint; pph23Idr: bigint },
    dibayarAt: Date,
    hitungInvoice: boolean,
  ) => {
    const b = bulanDibayarWib(dibayarAt);
    if (!bulanDalamRentang(b, rentang)) return;
    const k = `${r.vendorId}|${kunciBulan(b)}`;
    let cur = map.get(k);
    if (!cur) {
      cur = {
        vendorId: r.vendorId,
        vendorNama: r.vendorNama,
        tahun: b.tahun,
        bulan: b.bulan,
        n: 0,
        dib: 0n,
        pph: 0n,
      };
      map.set(k, cur);
    }
    // Addendum BUKAN invoice baru (nomor sama dipakai ulang, R17) — uangnya
    // masuk total, jumlah dokumen invoice tidak.
    if (hitungInvoice) cur.n += 1;
    cur.dib += r.jumlahIdr;
    cur.pph += r.pph23Idr;
  };
  for (const r of rows) {
    if (!r.dibayarAt) continue;
    akumulasi(r, r.dibayarAt, true);
  }
  for (const a of addendaRows) {
    if (!a.dibayarAt) continue;
    akumulasi(a, a.dibayarAt, false);
  }
  return [...map.values()]
    .sort(
      (a, b) =>
        a.tahun - b.tahun ||
        a.bulan - b.bulan ||
        a.vendorNama.localeCompare(b.vendorNama),
    )
    .map((r) => ({
      vendorId: r.vendorId,
      vendorNama: r.vendorNama,
      tahun: r.tahun,
      bulan: r.bulan,
      jumlahInvoice: r.n,
      totalDibayar: rupiah(r.dib),
      totalPph23: rupiah(r.pph),
    }));
}

/* ------------------------------------------------------------------ */
/* Rekap PPN & PPh 23 dari invoice customer TERBIT+ (8b, Q-IRIS8-5)     */
/* ------------------------------------------------------------------ */

export interface BarisRekapPajak {
  readonly tahun: number;
  readonly bulan: number;
  readonly jumlahInvoice: number;
  readonly totalDpp: Rupiah;
  readonly totalPpn: Rupiah;
  readonly totalPph23: Rupiah;
  readonly totalGrandTotal: Rupiah;
}

/**
 * Rekap pajak PPN/PPh 23 — kolom BEKU invoice (I-INV-1), dijumlah, bukan
 * dihitung ulang (R14.5). Hanya TERBIT/TERKIRIM/TERBAYAR_SEBAGIAN/LUNAS —
 * DRAFT (belum sah) dan BATAL (nomor hangus, I-INV-2) DIKECUALIKAN.
 * Basis periode = issue_date (DATE), bulan kalender apa adanya.
 */
export async function rekapPajakPerBulan(
  dbOrTx: DbOrTx,
  rentang: RentangBulan,
): Promise<readonly BarisRekapPajak[]> {
  const rows = await dbOrTx
    .select({
      issueDate: customerInvoices.issueDate,
      dppIdr: customerInvoices.dppIdr,
      ppnIdr: customerInvoices.ppnIdr,
      pph23Idr: customerInvoices.pph23Idr,
      grandTotalIdr: customerInvoices.grandTotalIdr,
    })
    .from(customerInvoices)
    .where(
      and(
        ne(customerInvoices.status, "DRAFT"),
        ne(customerInvoices.status, "BATAL"),
        isNotNull(customerInvoices.issueDate),
      ),
    );

  interface Akum {
    tahun: number;
    bulan: number;
    n: number;
    d: bigint;
    p: bigint;
    h: bigint;
    g: bigint;
  }
  const map = new Map<string, Akum>();
  for (const r of rows) {
    if (!r.issueDate) continue;
    const b = bulanDariTanggal(String(r.issueDate));
    if (!b || !bulanDalamRentang(b, rentang)) continue;
    const k = kunciBulan(b);
    let cur = map.get(k);
    if (!cur) {
      cur = { tahun: b.tahun, bulan: b.bulan, n: 0, d: 0n, p: 0n, h: 0n, g: 0n };
      map.set(k, cur);
    }
    cur.n += 1;
    cur.d += r.dppIdr;
    cur.p += r.ppnIdr;
    cur.h += r.pph23Idr;
    cur.g += r.grandTotalIdr;
  }
  return [...map.values()]
    .sort((a, b) => a.tahun - b.tahun || a.bulan - b.bulan)
    .map((r) => ({
      tahun: r.tahun,
      bulan: r.bulan,
      jumlahInvoice: r.n,
      totalDpp: rupiah(r.d),
      totalPpn: rupiah(r.p),
      totalPph23: rupiah(r.h),
      totalGrandTotal: rupiah(r.g),
    }));
}

/* ------------------------------------------------------------------ */
/* Pencarian job → tampilan lengkap satu halaman (8b)                   */
/* ------------------------------------------------------------------ */

export interface DetailJobLaporan {
  readonly job: {
    readonly id: string;
    readonly jobNo: string;
    readonly seqScope: string;
    readonly tahun: number;
    readonly bulan: number;
    readonly status: string;
    readonly sales: string | null;
    readonly rute: string | null;
    readonly vessel: string | null;
    readonly etd: string | null;
    readonly customerNama: string | null;
  };
  readonly barisBiaya: readonly {
    readonly chargeCode: string;
    readonly keterangan: string | null;
    readonly vendorNama: string | null;
    readonly sellingIdr: Rupiah;
    readonly pencadanganIdr: Rupiah;
    readonly actualIdr: Rupiah | null;
    readonly isReimburse: boolean;
  }[];
  readonly invoices: readonly {
    readonly invoiceNo: string | null;
    readonly status: string;
    readonly issueDate: string | null;
    readonly grandTotalIdr: Rupiah;
    readonly terbayar: Rupiah;
  }[];
  readonly gp: Rupiah | null;
  readonly gpPostRealokasi: Rupiah | null;
}

/** Cari job berdasarkan jobNo persis ATAU id. Read-only. */
export async function detailJobUntukLaporan(
  dbOrTx: DbOrTx,
  kunci: string,
): Promise<DetailJobLaporan | null> {
  const [job] = await dbOrTx
    .select({
      id: jobs.id,
      jobNo: jobs.jobNo,
      seqScope: jobs.seqScope,
      tahun: jobs.tahun,
      bulan: jobs.bulan,
      status: jobs.status,
      sales: jobs.sales,
      rute: jobs.rute,
      vessel: jobs.vessel,
      etd: jobs.etd,
      customerId: jobs.customerId,
    })
    .from(jobs)
    .where(or(eq(jobs.id, kunci), eq(jobs.jobNo, kunci)))
    .limit(1);
  if (!job) return null;

  const [cust] = await dbOrTx
    .select({ nama: customers.nama })
    .from(customers)
    .where(eq(customers.id, job.customerId))
    .limit(1);

  const baris = await dbOrTx
    .select({
      chargeCode: chargeLines.chargeCode,
      keterangan: chargeLines.keterangan,
      vendorId: chargeLines.vendorId,
      sellingIdr: chargeLines.sellingIdr,
      pencadanganIdr: chargeLines.pencadanganIdr,
      actualIdr: chargeLines.actualIdr,
      isReimburse: chargeLines.isReimburse,
      deletedAt: chargeLines.deletedAt,
      urutan: chargeLines.urutan,
    })
    .from(chargeLines)
    .where(and(eq(chargeLines.jobId, job.id), isNull(chargeLines.deletedAt)))
    .orderBy(asc(chargeLines.urutan));

  const vendorIds = [
    ...new Set(baris.map((b) => b.vendorId).filter((v): v is string => !!v)),
  ];
  const namaVendor = new Map<string, string>();
  if (vendorIds.length > 0) {
    const vRows = await dbOrTx
      .select({ id: vendors.id, nama: vendors.nama })
      .from(vendors)
      .where(inArray(vendors.id, vendorIds));
    for (const v of vRows) namaVendor.set(v.id, v.nama);
  }

  const invRows = await dbOrTx
    .select({
      id: customerInvoices.id,
      invoiceNo: customerInvoices.invoiceNo,
      status: customerInvoices.status,
      issueDate: customerInvoices.issueDate,
      grandTotalIdr: customerInvoices.grandTotalIdr,
    })
    .from(customerInvoices)
    .where(eq(customerInvoices.jobId, job.id))
    .orderBy(desc(customerInvoices.issueDate));

  const invoices: {
    invoiceNo: string | null;
    status: string;
    issueDate: string | null;
    grandTotalIdr: Rupiah;
    terbayar: Rupiah;
  }[] = [];
  for (const inv of invRows) {
    const [tot] = await dbOrTx
      .select({
        total: sql<string>`COALESCE(SUM(${paymentsIn.jumlahIdr}), 0)::text`,
      })
      .from(paymentsIn)
      .where(eq(paymentsIn.invoiceId, inv.id));
    invoices.push({
      invoiceNo: inv.invoiceNo,
      status: inv.status,
      issueDate: inv.issueDate ? String(inv.issueDate) : null,
      grandTotalIdr: rupiah(inv.grandTotalIdr),
      terbayar: rupiah(BigInt(tot?.total ?? "0")),
    });
  }

  const lines: GpLine[] = baris.map((b) => ({
    sellingIdr: rupiah(b.sellingIdr),
    pencadanganIdr: rupiah(b.pencadanganIdr),
    isReimburse: b.isReimburse,
    deletedAt: b.deletedAt,
  }));
  const gp = hitungGP(lines);
  const realokasi = await muatRealokasiApproved(dbOrTx, [job.id]);
  const gpPost =
    gp === null
      ? null
      : (totalGpSetelahRealokasi([{ jobId: job.id, gpIdr: gp }], realokasi)[0]?.gpIdr ??
        gp);

  return {
    job: {
      id: job.id,
      jobNo: job.jobNo,
      seqScope: job.seqScope,
      tahun: job.tahun,
      bulan: job.bulan,
      status: job.status,
      sales: job.sales,
      rute: job.rute,
      vessel: job.vessel,
      etd: job.etd ? String(job.etd) : null,
      customerNama: cust?.nama ?? null,
    },
    barisBiaya: baris.map((b) => ({
      chargeCode: b.chargeCode,
      keterangan: b.keterangan,
      vendorNama: b.vendorId ? (namaVendor.get(b.vendorId) ?? null) : null,
      sellingIdr: rupiah(b.sellingIdr),
      pencadanganIdr: rupiah(b.pencadanganIdr),
      actualIdr: b.actualIdr === null ? null : rupiah(b.actualIdr),
      isReimburse: b.isReimburse,
    })),
    invoices,
    gp,
    gpPostRealokasi: gpPost,
  };
}

/* ------------------------------------------------------------------ */
/* Peringkat multi-sumbu (8c, R14.2/R14.3) — dari ringkasan rentang.     */
/* Data nyata per job menunggu Q41 (SO BULAN xlsx) — struktur+test dulu. */
/* ------------------------------------------------------------------ */

export type SumbuPendapatan = "customer" | "segmen" | "sales" | "rute";

export interface BarisPeringkat {
  readonly label: string;
  readonly jumlahJob: number;
  readonly totalSelling: Rupiah;
  readonly totalCost: Rupiah;
  readonly totalGp: Rupiah;
  readonly gpPersen: string | null;
  readonly tanggalPertama: string | null;
  readonly tanggalTerakhir: string | null;
}

function kunciSumbu(sumbu: SumbuPendapatan, j: RingkasanJobLaporan): string {
  switch (sumbu) {
    case "customer":
      return j.customerNama ?? "(tanpa customer)";
    case "segmen":
      return j.segmen;
    case "sales":
      return j.sales ?? "(tanpa sales)";
    case "rute":
      return j.rute ?? "(tanpa rute)";
  }
}

/**
 * Peringkat pendapatan per sumbu (customer/segmen/sales/rute), urut selling
 * menurun (R14.2). Sumbu VENDOR = BELANJA — DILARANG digabung di sini
 * (R14.2: "Peringkat vendor BUKAN revenue, itu belanja").
 */
export function peringkatDariRingkasan(
  ringkasan: readonly RingkasanJobLaporan[],
  sumbu: SumbuPendapatan,
): readonly BarisPeringkat[] {
  interface Akum {
    label: string;
    n: number;
    s: bigint;
    c: bigint;
    gp: bigint;
    pertama: string | null;
    terakhir: string | null;
  }
  const map = new Map<string, Akum>();
  for (const j of ringkasan) {
    const label = kunciSumbu(sumbu, j);
    let cur = map.get(label);
    if (!cur) {
      cur = { label, n: 0, s: 0n, c: 0n, gp: 0n, pertama: null, terakhir: null };
      map.set(label, cur);
    }
    cur.n += 1;
    cur.s += j.selling;
    cur.c += j.cost;
    if (j.gp !== null) cur.gp += j.gp;
    const tgl = `${j.tahun}-${String(j.bulan).padStart(2, "0")}`;
    if (cur.pertama === null || tgl < cur.pertama) cur.pertama = tgl;
    if (cur.terakhir === null || tgl > cur.terakhir) cur.terakhir = tgl;
  }
  return [...map.values()]
    .sort((a, b) => (a.s < b.s ? 1 : a.s > b.s ? -1 : a.label.localeCompare(b.label)))
    .map((r) => ({
      label: r.label,
      jumlahJob: r.n,
      totalSelling: rupiah(r.s),
      totalCost: rupiah(r.c),
      totalGp: rupiah(r.gp),
      gpPersen: gpPersenAgregat(rupiah(r.gp), rupiah(r.s)),
      tanggalPertama: r.pertama,
      tanggalTerakhir: r.terakhir,
    }));
}

/**
 * Peringkat BELANJA vendor (kelompok terpisah, R14.2) — urut total belanja
 * vendor menurun: invoice DIBAYAR + addenda R17 yang dibayar_at terisi
 * (Irisan 10 Item 10 fase 2). Basis periode sama seperti R7.3 (dibayar_at
 * WIB); jumlahInvoice tetap menghitung invoice DIBAYAR saja.
 */
export async function peringkatVendorBelanja(
  dbOrTx: DbOrTx,
  rentang: RentangBulan,
): Promise<
  readonly {
    vendorNama: string;
    jumlahInvoice: number;
    totalDibayar: Rupiah;
    totalPph23: Rupiah;
  }[]
> {
  const rekap = await rekapVendorPerBulan(dbOrTx, rentang);
  interface Akum {
    vendorNama: string;
    n: number;
    dib: bigint;
    pph: bigint;
  }
  const map = new Map<string, Akum>();
  for (const r of rekap) {
    let cur = map.get(r.vendorNama);
    if (!cur) {
      cur = { vendorNama: r.vendorNama, n: 0, dib: 0n, pph: 0n };
      map.set(r.vendorNama, cur);
    }
    cur.n += r.jumlahInvoice;
    cur.dib += r.totalDibayar;
    cur.pph += r.totalPph23;
  }
  return [...map.values()]
    .sort((a, b) =>
      a.dib < b.dib ? 1 : a.dib > b.dib ? -1 : a.vendorNama.localeCompare(b.vendorNama),
    )
    .map((r) => ({
      vendorNama: r.vendorNama,
      jumlahInvoice: r.n,
      totalDibayar: rupiah(r.dib),
      totalPph23: rupiah(r.pph),
    }));
}

/* ------------------------------------------------------------------ */
/* Drill-down (8d, R14.4): peringkat → daftar job entitas itu.           */
/* ------------------------------------------------------------------ */

/**
 * Daftar job satu entitas dalam rentang (drill-down lapis 1). Total baris
 * ini WAJIB sama dengan kontribusi entitas di peringkat (test 8d).
 */
export function jobEntitasDariRingkasan(
  ringkasan: readonly RingkasanJobLaporan[],
  sumbu: SumbuPendapatan,
  label: string,
): readonly RingkasanJobLaporan[] {
  return ringkasan.filter((j) => kunciSumbu(sumbu, j) === label);
}

/** Agregasi ringkas lintas job dari ringkasan laporan (untuk footer/total). */
export function agregatRingkasanLaporan(
  ringkasan: readonly RingkasanJobLaporan[],
): ReturnType<typeof agregasiRingkasanJob> {
  return agregasiRingkasanJob(ringkasan.map((j) => ({ jobId: j.jobId, gpIdr: j.gp })));
}

/* ------------------------------------------------------------------ */
/* View-model untuk UI 8b — angka SUDAH string, komponen tidak berhitung */
/* ------------------------------------------------------------------ */

import { formatIdr as fmt } from "@/lib/money/index";

/**
 * Kartu ringkas atas halaman laporan. Semua uang string terformat.
 * Komponen .tsx hanya merender — tidak mengimpor money, tidak menghitung.
 */
export interface KartuLaporan {
  readonly jumlahJob: number;
  readonly jumlahJobKosong: number;
  readonly totalSellingTeks: string;
  readonly totalGpTeks: string;
}

export function kartuLaporanDariRingkasan(
  ringkasan: readonly RingkasanJobLaporan[],
): KartuLaporan {
  let selling = 0n as Rupiah;
  let gp = 0n as Rupiah;
  let kosong = 0;
  for (const j of ringkasan) {
    selling = (selling + j.selling) as Rupiah;
    if (j.gp === null) {
      kosong += 1;
    } else {
      gp = (gp + j.gp) as Rupiah;
    }
  }
  return {
    jumlahJob: ringkasan.length,
    jumlahJobKosong: kosong,
    totalSellingTeks: fmt(selling),
    totalGpTeks: fmt(gp),
  };
}

/**
 * Ringkasan SATU job untuk kartu hasil pencarian (8b) — total baris biaya
 * dijumlahkan di sini (server), bukan di komponen.
 */
export interface KartuJobCari {
  readonly sellingTeks: string;
  readonly pencadanganTeks: string;
  readonly gpTeks: string | null;
  readonly gpPostRealokasiTeks: string | null;
}

export function kartuJobCariDariDetail(d: {
  barisBiaya: readonly { sellingIdr: Rupiah; pencadanganIdr: Rupiah }[];
  gp: Rupiah | null;
  gpPostRealokasi: Rupiah | null;
}): KartuJobCari {
  let selling = 0n as Rupiah;
  let pencadangan = 0n as Rupiah;
  for (const b of d.barisBiaya) {
    selling = (selling + b.sellingIdr) as Rupiah;
    pencadangan = (pencadangan + b.pencadanganIdr) as Rupiah;
  }
  return {
    sellingTeks: fmt(selling),
    pencadanganTeks: fmt(pencadangan),
    gpTeks: d.gp === null ? null : fmt(d.gp),
    gpPostRealokasiTeks: d.gpPostRealokasi === null ? null : fmt(d.gpPostRealokasi),
  };
}

/* ------------------------------------------------------------------ */
/* Kartu GP/NETT halaman detail job (Irisan 10 Item 7) — server format  */
/* ------------------------------------------------------------------ */

import {
  hitungGP as gpDariLines,
  hitungGPpct,
  hitungNETT,
  sellingUntukGp,
} from "@/lib/costing/index";

/**
 * Kartu GP/GP%/NETT satu job (Irisan 10 Item 7). Rumus TIDAK ditulis ulang:
 * hitungGP/hitungGPpct/hitungNETT dari src/lib/costing (terkunci test 4d).
 * PPN diambil dari kolom BEKU invoice TERBIT+ (I-INV-1) — TIDAK dihitung
 * ulang di sini; job tanpa invoice → NETT null (tampil "—", bukan angka
 * menyesatkan). null = "belum ada data", bukan nol.
 */
export interface KartuGpJob {
  readonly gpTeks: string | null;
  readonly gpPersenTeks: string | null;
  readonly nettTeks: string | null;
  readonly gpPostRealokasiTeks: string | null;
  /** true kalau overlay realokasi APPROVED mengubah GP job ini. */
  readonly adaRealokasi: boolean;
  /** true kalau NETT belum bisa dihitung karena belum ada invoice TERBIT+. */
  readonly nettMenungguInvoice: boolean;
}

export function kartuGpJob(
  lines: readonly GpLine[],
  ppnInvoiceIdr: Rupiah | null,
  gpPostRealokasi: Rupiah | null,
): KartuGpJob {
  const gp = gpDariLines(lines);
  const gpPersen = gp === null ? null : hitungGPpct(gp, sellingUntukGp(lines));
  const nett =
    gp === null || ppnInvoiceIdr === null ? null : hitungNETT(lines, ppnInvoiceIdr);
  const adaRealokasi = gp !== null && gpPostRealokasi !== null && gpPostRealokasi !== gp;
  return {
    gpTeks: gp === null ? null : fmt(gp),
    gpPersenTeks: gpPersen,
    nettTeks: nett === null ? null : fmt(nett),
    gpPostRealokasiTeks:
      adaRealokasi && gpPostRealokasi !== null ? fmt(gpPostRealokasi) : null,
    adaRealokasi,
    nettMenungguInvoice: gp !== null && ppnInvoiceIdr === null,
  };
}
